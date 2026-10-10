import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

if (process.platform !== 'win32') throw new Error('This smoke test uses Windows WebView2.');
const profile = process.argv.includes('--debug') ? 'debug' : 'release';
const executable = process.env.RETRODOS_EXECUTABLE
  ? resolve(process.env.RETRODOS_EXECUTABLE)
  : fileURLToPath(new URL(`../src-tauri/target/${profile}/retrodos.exe`, import.meta.url));
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
const errors = [];
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
  page.on('pageerror', error => errors.push(error.message));
  const input = page.getByRole('combobox', { name: 'コマンド入力' });
  const log = page.getByRole('log');
  await expect(input).toBeVisible({ timeout: 15_000 });
  assert(/^https?:\/\/tauri\.localhost(?:\/|$)/.test(page.url()) || page.url().startsWith('tauri://localhost'), `Expected embedded production assets, got ${page.url()}`);
  await expect(page).toHaveTitle('RetroDOS');
  await expect(page.locator('.environment-label')).toContainText('DESKTOP');
  await expect(log).toContainText('RetroDOS Version 0.4.0');
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
  await input.fill('HELP'); await input.press('Enter');
  await expect.poll(() => log.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2);
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
  await input.fill('VIM C:\\SMOKE-VIM.TXT'); await input.press('Enter');
  const vim = page.getByRole('region', { name: 'VIMメモ帳' });
  const vimEditor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  await expect(vimEditor).toBeFocused();
  await vimEditor.press('i');
  await vimEditor.fill('alpha\nbeta alpha\ngamma');
  await vimEditor.press('Escape');
  await vimEditor.press('Home'); await vimEditor.press('k');
  await vimEditor.press('y'); await vimEditor.press('y'); await vimEditor.press('p');
  await expect(vimEditor).toHaveValue('alpha\nbeta alpha\nbeta alpha\ngamma');
  await vimEditor.press('u'); await expect(vimEditor).toHaveValue('alpha\nbeta alpha\ngamma');
  await vimEditor.press('Control+r'); await expect(vimEditor).toHaveValue('alpha\nbeta alpha\nbeta alpha\ngamma');
  await vimEditor.press('/');
  const vimSearch = page.getByRole('textbox', { name: 'Vim検索' });
  await vimSearch.fill('alpha'); await vimSearch.press('Enter');
  await expect.poll(() => vimEditor.evaluate(element => {
    const editor = element;
    return editor.value.slice(editor.selectionStart, editor.selectionEnd);
  })).toBe('alpha');
  await vimEditor.press('Shift+;');
  const vimCommand = page.getByRole('textbox', { name: 'Vimコマンド' });
  await vimCommand.fill('set nonumber'); await vimCommand.press('Enter');
  await expect(vim.locator('.vim-line-numbers')).toHaveCount(0);
  await vimEditor.press('Shift+;'); await vimCommand.fill('set number'); await vimCommand.press('Enter');
  await vimEditor.press('Shift+;'); await vimCommand.fill('wq'); await vimCommand.press('Enter');
  await expect(input).toBeFocused();
  await input.fill('GAMES'); await input.press('Enter');
  const gameSelector = page.getByRole('textbox', { name: 'プログラムコードまたは番号' });
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
  for (const [command, name] of [['FILES', 'ファイルマネージャー'], ['TODO', 'ToDoリスト'], ['CALENDAR', 'カレンダー'], ['CALC "2+3*4"', '電卓'], ['PAINT', 'ASCIIペイント'], ['MARKDOWN', 'Markdownビューア'], ['SYSINFO', 'システム情報'], ['SETTINGS', '設定']]) {
    await input.fill(command); await input.press('Enter');
    const program = page.getByRole('region', { name, exact: true });
    await expect(program).toBeVisible();
    await expect(program.locator('[data-primary-input="true"]').first()).toBeFocused();
    if (name === '電卓') await expect(program.getByLabel('計算結果')).toHaveText('14');
    if (name === 'ASCIIペイント') {
      await expect(program.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
      await program.getByRole('button', { name: '全消去', exact: true }).click();
      const confirmation = page.getByRole('dialog', { name: 'キャンバスの全消去' });
      await expect(confirmation).toBeVisible();
      await expect(confirmation.getByRole('button', { name: 'キャンセル', exact: true })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(confirmation).toHaveCount(0);
      await expect(program).toBeVisible();
    }
    if (name === 'システム情報') await expect(program.locator('.system-metrics')).toContainText('bytes');
    await page.keyboard.press('Escape'); await expect(input).toBeFocused();
  }
  await page.getByRole('button', { name: 'プログラムを開く', exact: true }).click();
  await page.getByRole('menuitem', { name: /ToDoリスト/ }).click();
  await expect(page.getByRole('region', { name: 'ToDoリスト', exact: true })).toBeVisible();
  await expect(page.getByLabel('タスク名', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(input).toBeFocused();
  await input.fill('PROGRAMS'); await input.press('Enter');
  const programs = page.getByRole('region', { name: 'プログラム一覧画面' });
  await expect(programs.getByRole('article')).toHaveCount(10);
  await programs.getByRole('group', { name: 'プログラムの分類' }).getByRole('button', { name: /^ゲーム/ }).click();
  await expect(programs.getByRole('article')).toHaveCount(1);
  await gameSelector.fill('CALC'); await gameSelector.press('Enter');
  await expect(page.getByRole('region', { name: '電卓', exact: true })).toBeVisible();
  await expect(page.getByLabel('計算式', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  assert.deepEqual(errors, []);
  await mkdir(fileURLToPath(new URL('../docs/screenshots/', import.meta.url)), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../docs/screenshots/desktop.png', import.meta.url)) });
  console.log(`Desktop smoke test passed (${profile}): ${page.url()}, IME VER/CLS, shell, BAT, Vim line/search/options, games, 8 apps, shared program library, categories, RUN, paint confirmation, tab launcher, Escape exit.`);
} catch (error) {
  if (browser) {
    const page = browser.contexts()[0]?.pages().find(candidate => !candidate.url().startsWith('devtools:'));
    if (page) {
      // 初期化の失敗が接続前に起きた場合も、再読込してJavaScriptエラーを収集する。
      if (!await page.locator('#terminal-command').count()) { await page.reload(); await delay(300); }
      console.error('Desktop failure diagnostics:', JSON.stringify({ url: page.url(), errors, body: (await page.locator('body').innerText()).slice(0, 1500) }));
      const outputDirectory = new URL('../test-results/', import.meta.url);
      await mkdir(outputDirectory, { recursive: true });
      await page.screenshot({ path: fileURLToPath(new URL('desktop-failure.png', outputDirectory)) });
    }
  }
  throw error;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (app.exitCode === null && !app.killed) app.kill();
}
