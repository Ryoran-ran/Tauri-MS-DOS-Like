import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

if (process.platform !== 'win32') throw new Error('This smoke test uses Windows WebView2.');
const profile = process.argv.includes('--debug') ? 'debug' : 'release';
const executable = fileURLToPath(new URL(`../src-tauri/target/${profile}/retrodos.exe`, import.meta.url));
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const endpoint = `http://127.0.0.1:${port}`;
const app = spawn(executable, [], {
  windowsHide: true,
  stdio: 'ignore',
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1` },
});
let spawnError;
app.on('error', error => { spawnError = error; });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (spawnError) throw spawnError;
    if (app.exitCode !== null) throw new Error(`RetroDOS exited early: ${app.exitCode}`);
    try { ready = (await fetch(`${endpoint}/json/version`)).ok; } catch { /* WebView2 is starting. */ }
    if (ready) break;
    await delay(250);
  }
  assert(ready, 'WebView2 did not become available within 30 seconds.');
  browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  let page;
  for (let attempt = 0; attempt < 40; attempt++) {
    page = context?.pages().find(candidate => !candidate.url().startsWith('devtools:'));
    if (page) break;
    await delay(250);
  }
  assert(page, 'The native application has no WebView page.');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const input = page.getByRole('combobox', { name: 'コマンド入力' });
  const log = page.getByRole('log');
  await expect(input).toBeVisible();
  assert(/^https?:\/\/tauri\.localhost(?:\/|$)/.test(page.url()) || page.url().startsWith('tauri://localhost'), `Expected embedded production assets, got ${page.url()}`);
  await expect(page).toHaveTitle('RetroDOS');
  await expect(page.locator('.environment-label')).toContainText('DESKTOP');
  await expect(log).toContainText('RetroDOS Version 0.3.0');
  const cdp = await context.newCDPSession(page);
  await input.fill('ve');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Process', code: 'KeyR', windowsVirtualKeyCode: 229 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Process', code: 'KeyR', windowsVirtualKeyCode: 229 });
  await expect(input).toHaveValue('ver');
  await input.press('Enter');
  await input.fill('cl');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Process', code: 'KeyS', windowsVirtualKeyCode: 229 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Process', code: 'KeyS', windowsVirtualKeyCode: 229 });
  await expect(input).toHaveValue('cls');
  await input.press('Enter');
  await input.fill('DIR'); await input.press('Enter');
  await expect(log).toContainText('README.TXT');
  await input.fill('CD DOCS'); await input.press('Enter');
  await expect(page.locator('.status-path')).toHaveText('C:\\DOCS');
  await input.fill('TYPE "WELCOME NOTE.TXT"'); await input.press('Enter');
  await expect(log).toContainText('ようこそ、RetroDOSへ。');
  await input.fill('SET SMOKE=OK && ECHO %SMOKE% > C:\\SMOKE.TXT'); await input.press('Enter');
  await input.fill('TYPE C:\\SMOKE.TXT'); await input.press('Enter');
  await expect(log).toContainText('OK');
  await input.fill('DIR C:\\ | FIND "SMOKE.TXT"'); await input.press('Enter');
  await expect(log).toContainText('SMOKE.TXT');
  await input.fill('ECHO ECHO BAT-OK > C:\\SMOKE.BAT'); await input.press('Enter');
  await input.fill('C:\\SMOKE.BAT'); await input.press('Enter');
  await expect(log).toContainText('BAT-OK');
  await input.fill('GAMES'); await input.press('Enter');
  const gameSelector = page.getByRole('textbox', { name: 'ゲームコードまたは番号' });
  await expect(gameSelector).toBeFocused();
  await gameSelector.evaluate(element => element.blur());
  await page.keyboard.press('Space');
  await expect(gameSelector).toBeFocused();
  await gameSelector.press('ArrowDown');
  await gameSelector.press('Enter');
  const guessInput = page.getByRole('spinbutton', { name: '予想する数字' });
  await expect(guessInput).toBeVisible();
  await guessInput.evaluate(element => element.blur());
  await page.keyboard.press('Space');
  await expect(guessInput).toBeFocused();
  await guessInput.press('Escape');
  await expect(input).toBeFocused();
  assert.deepEqual(errors, []);
  await mkdir(fileURLToPath(new URL('../docs/screenshots/', import.meta.url)), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../docs/screenshots/desktop.png', import.meta.url)) });
  console.log(`Desktop smoke test passed (${profile}): ${page.url()}, native WebView2 IME VER/CLS input, shell chain, redirect, pipe, BAT, keyboard game selection, Escape exit.`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (app.exitCode === null && !app.killed) app.kill();
}
