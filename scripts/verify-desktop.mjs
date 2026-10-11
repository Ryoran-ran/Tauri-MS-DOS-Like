import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';

if (process.platform !== 'win32') throw new Error('This smoke test uses Windows WebView2.');
const profile = process.argv.includes('--debug') ? 'debug' : 'release';
const executable = process.env.RETRODOS_EXECUTABLE
  ? resolve(process.env.RETRODOS_EXECUTABLE)
  : fileURLToPath(new URL(`../src-tauri/target/${profile}/retrodos.exe`, import.meta.url));
const requestedPort = Number.parseInt(process.env.RETRODOS_CDP_PORT ?? '', 10);
let port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 0;
if (!port) {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  await new Promise(resolve => server.close(resolve));
}
const endpoint = `http://127.0.0.1:${port}`;
const webviewProfile = resolve(tmpdir(), `retrodos-webview2-smoke-${process.pid}-${Date.now()}`);
const nativeFixture = fileURLToPath(new URL(`../test-results/native-dos-${process.pid}-${Date.now()}/`, import.meta.url));
const nativeData = resolve(nativeFixture, 'managed');
const nativeSource = resolve(nativeFixture, '元のゲーム');
await mkdir(nativeSource, { recursive: true });
// A self-authored DOS COM program: create SAVE.DAT, write a marker, close, exit.
const code = [0xb8, 0x00, 0x3c, 0x31, 0xc9, 0xba, 0, 0, 0xcd, 0x21, 0x89, 0xc3, 0xb8, 0x00, 0x40, 0xb9, 0, 0, 0xba, 0, 0, 0xcd, 0x21, 0xb8, 0x00, 0x3e, 0xcd, 0x21, 0xb8, 0x00, 0x4c, 0xcd, 0x21];
const filename = Buffer.from('SAVE.DAT\0'); const marker = Buffer.from('DOSBOX-SAVE-OK');
code[6] = (0x100 + code.length) & 255; code[7] = (0x100 + code.length) >> 8;
code[16] = marker.length; code[19] = (0x100 + code.length + filename.length) & 255; code[20] = (0x100 + code.length + filename.length) >> 8;
await writeFile(resolve(nativeSource, 'TEST.COM'), Buffer.concat([Buffer.from(code), filename, marker]));
await writeFile(resolve(nativeSource, 'SAVE.DAT'), 'original-save');
const app = spawn(executable, [], {
  windowsHide: true,
  stdio: 'ignore',
  env: {
    ...process.env,
    RETRODOS_DATA_DIR: nativeData,
    WEBVIEW2_USER_DATA_FOLDER: webviewProfile,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
  },
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
  await expect(log).toContainText('RetroDOS Version 1.0.0');
  await input.fill('GAMEPROMPT'); await input.press('Enter');
  await expect(log).toContainText('ゲーム作成の相談用プロンプトをクリップボードにコピーしました');
  const consultationPrompt = execFileSync('powershell.exe', ['-NoProfile', '-Command', '[Console]::OutputEncoding = [Text.UTF8Encoding]::new(); Get-Clipboard -Raw'], { encoding: 'utf8', windowsHide: true });
  assert(consultationPrompt.includes('最初からコードやJSONを出力しないでください'));
  assert(consultationPrompt.includes('UIデザイン') && consultationPrompt.includes('v2 Webゲーム'));
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
  await input.fill('DEL C:\\SMOKE-VIM.TXT'); await input.press('Enter');
  await input.fill('VIM C:\\SMOKE-VIM.TXT'); await input.press('Enter');
  const vim = page.getByRole('region', { name: 'VIMメモ帳' });
  const vimEditor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  await expect(vimEditor).toBeFocused();
  await vimEditor.press('i');
  await vimEditor.fill('alpha\nbeta alpha\ngamma');
  await vimEditor.press('Escape');
  await vimEditor.evaluate(element => {
    const editor = element;
    const secondLine = editor.value.indexOf('\n') + 1;
    editor.focus(); editor.setSelectionRange(secondLine, secondLine);
  });
  await vimEditor.press('y'); await vimEditor.press('y'); await vimEditor.press('p');
  await expect(vimEditor).toHaveValue('alpha\nbeta alpha\nbeta alpha\ngamma');
  await expect.poll(() => vimEditor.evaluate(element => element.selectionStart)).toBe(17);
  await vimEditor.press('u'); await expect(vimEditor).toHaveValue('alpha\nbeta alpha\ngamma');
  await vimEditor.press('Control+r'); await expect(vimEditor).toHaveValue('alpha\nbeta alpha\nbeta alpha\ngamma');
  await expect.poll(() => vimEditor.evaluate(element => element.selectionStart)).toBe(17);
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
  await gameSelector.fill('GUESS');
  await gameSelector.press('Enter');
  const guessInput = page.getByRole('spinbutton', { name: '予想する数字' });
  await expect(guessInput).toBeVisible();
  await guessInput.evaluate(element => element.blur());
  await page.keyboard.press('Space');
  await expect(guessInput).toBeFocused();
  await guessInput.press('Control+w');
  await expect(input).toBeFocused();
  for (const [command, label] of [['SNAKE', 'SNAKE盤面'], ['MINES', '地雷原'], ['BLOCKS', '落ちものパズル盤面'], ['ADVENTURE', '磁気カードを取る'], ['ROGUE', 'ASCII地下迷宮']]) {
    await input.fill(command); await input.press('Enter');
    const primary = command === 'ADVENTURE' ? page.getByRole('button', { name: new RegExp(label) }) : page.getByLabel(label);
    await expect(primary).toBeFocused();
    if (command === 'MINES') await page.keyboard.press('Enter');
    if (command === 'BLOCKS') await page.keyboard.press('Space');
    if (command === 'ROGUE') { await page.keyboard.press('ArrowRight'); await expect(page.locator('.rogue-hud')).toContainText('TURN 1'); }
    await page.keyboard.press('Control+w'); await expect(input).toBeFocused();
  }
  await input.fill('GAMEIMPORT C:\\GAMES\\EXAMPLE.RGAME.JSON'); await input.press('Enter');
  await expect(log).toContainText('CAVE — HELLO CAVE');
  await input.fill('RUN CAVE'); await input.press('Enter');
  await expect(page.getByRole('region', { name: 'HELLO CAVE テキストアドベンチャー' })).toBeVisible();
  await page.keyboard.press('Control+w'); await expect(input).toBeFocused();
  await input.fill('GAMEIMPORT C:\\GAMES\\PIXEL.RGAME.JSON'); await input.press('Enter');
  await expect(log).toContainText('PIXEL — PIXEL CATCH');
  await input.fill('RUN PIXEL'); await input.press('Enter');
  const webGame = page.getByRole('region', { name: 'PIXEL CATCH ゲームプラグイン' });
  await expect(webGame).toBeVisible();
  const webFrame = page.locator('iframe[title="PIXEL CATCH ゲーム画面"]');
  await expect(webFrame).toHaveAttribute('sandbox', 'allow-scripts');
  const webBoard = page.frameLocator('iframe[title="PIXEL CATCH ゲーム画面"]').getByLabel('PIXEL CATCH盤面');
  await expect(webBoard).toBeFocused();
  const isolation = await webBoard.evaluate(async () => {
    let parentAccessBlocked = false;
    try { void parent.document; } catch (error) { parentAccessBlocked = error.name === 'SecurityError'; }
    let networkBlocked = false;
    try { await fetch('http://127.0.0.1:9339/retrodos-sandbox-test'); } catch { networkBlocked = true; }
    let storageBlocked = false;
    try { localStorage.getItem('retrodos.games.v1'); } catch (error) { storageBlocked = error.name === 'SecurityError'; }
    return {
      parentAccessBlocked,
      networkBlocked,
      storageBlocked,
      csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
    };
  });
  assert(isolation.parentAccessBlocked && isolation.networkBlocked && isolation.storageBlocked, JSON.stringify(isolation));
  assert(isolation.csp.includes("connect-src 'none'"));
  // WebView2 injects Tauri's helper into frames. Permissions, not helper presence, deny native access.
  const nativePermissionError = await page.evaluate(async () => {
    try { await window.__TAURI_INTERNALS__.invoke('plugin:window|get_all_windows'); return ''; }
    catch (error) { return String(error); }
  });
  assert.match(nativePermissionError, /not allowed|denied|forbidden/i);
  const framePermissionError = await webBoard.evaluate(async source => {
    // Some WebView2 versions drop iframe IPC without delivering a rejection callback.
    const attempt = window.__TAURI_INTERNALS__.invoke('dosbox_request', { request: { action: 'register', source,
      config: { name: 'FRAME TEST', code: 'DOS_FRAME', executable: 'TEST.COM', args: [], cycles: 'auto', memory: 16, sound: false, fullscreen: false, autoBackup: false } } })
      .then(() => 'unexpected native access', error => String(error));
    return Promise.race([attempt, new Promise(resolve => setTimeout(() => resolve('iframe IPC unavailable'), 2000))]);
  }, nativeSource);
  assert.match(framePermissionError, /not allowed|denied|forbidden|IPC unavailable/i, 'Imported game frames must not access native DOS files.');
  const frameSideEffects = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('dosbox_request', { request: { action: 'status' } }));
  assert.equal(frameSideEffects.state.games.length, 0, 'Iframe native requests must have no filesystem effects.');
  await webBoard.press('ArrowRight');
  await webBoard.press('ArrowRight');
  await expect(webGame.getByRole('status')).toContainText('MISSION COMPLETE');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').scores?.['plugin.pixel-catch']?.highScore ?? 0)).toBe(100);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').achievements?.some(item => item.id === 'first-star') ?? false)).toBe(true);
  await mkdir(fileURLToPath(new URL('../test-results/', import.meta.url)), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../test-results/desktop-web-game.png', import.meta.url)) });
  const previousFrameUrl = await webFrame.getAttribute('src');
  await webGame.getByRole('button', { name: 'もう一度', exact: true }).click();
  await expect(webFrame).not.toHaveAttribute('src', previousFrameUrl);
  await expect(webBoard).toBeFocused();
  await expect(page.frameLocator('iframe[title="PIXEL CATCH ゲーム画面"]').getByText('ARROW KEYS: MOVE @ TO *')).toBeVisible();
  await webBoard.press('Control+w');
  await expect(input).toBeFocused();
  await page.reload();
  await expect(input).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').scores?.['plugin.pixel-catch']?.highScore ?? 0)).toBe(100);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').achievements?.some(item => item.id === 'first-star') ?? false)).toBe(true);
  await input.fill('RUN PIXEL'); await input.press('Enter');
  await expect(webBoard).toBeFocused();
  await webBoard.press('Control+w');
  await expect(input).toBeFocused();
  for (const [command, name] of [['FILES', 'ファイルマネージャー'], ['TODO', 'ToDoリスト'], ['CALENDAR', 'カレンダー'], ['CALC "2+3*4"', '電卓'], ['PAINT', 'ASCIIペイント'], ['MARKDOWN', 'Markdownビューア'], ['DOSBOX', 'DOSゲーム管理'], ['SYSINFO', 'システム情報'], ['SETTINGS', '設定']]) {
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
    await page.keyboard.press('Control+w'); await expect(input).toBeFocused();
  }
  await page.getByRole('button', { name: 'プログラムを開く', exact: true }).click();
  await page.getByRole('menuitem', { name: /ToDoリスト/ }).click();
  await expect(page.getByRole('region', { name: 'ToDoリスト', exact: true })).toBeVisible();
  await expect(page.getByLabel('タスク名', { exact: true })).toBeFocused();
  await page.keyboard.press('Control+w');
  await expect(input).toBeFocused();
  await input.fill('PROGRAMS'); await input.press('Enter');
  const programs = page.getByRole('region', { name: 'プログラム一覧画面' });
  await expect(programs.getByRole('article')).toHaveCount(18);
  await programs.getByRole('group', { name: 'プログラムの分類' }).getByRole('button', { name: /^ゲーム/ }).click();
  await expect(programs.getByRole('article')).toHaveCount(8);
  await gameSelector.fill('CALC'); await gameSelector.press('Enter');
  await expect(page.getByRole('region', { name: '電卓', exact: true })).toBeVisible();
  await expect(page.getByLabel('計算式', { exact: true })).toBeFocused();
  await page.keyboard.press('Control+w');
  await input.fill('DOSBOX'); await input.press('Enter');
  const manager = page.getByRole('region', { name: 'DOSゲーム管理', exact: true });
  await expect(manager.getByLabel('DOSBoxの実行ファイル')).toBeFocused();
  await manager.getByLabel('ゲーム専用フォルダー').fill(nativeSource);
  await manager.getByLabel('ゲーム名', { exact: true }).fill('DOS NATIVE TEST');
  await manager.getByLabel('起動コード').fill('DOS_TEST');
  await manager.getByLabel('起動ファイル').fill('TEST.COM');
  await manager.getByRole('button', { name: 'ゲームを登録', exact: true }).click();
  await expect(manager.getByRole('button', { name: 'ゲームを起動', exact: true })).toBeEnabled();
  const nativeStatus = () => page.evaluate(() => window.__TAURI_INTERNALS__.invoke('dosbox_request', { request: { action: 'status' } }));
  let status = await nativeStatus();
  const nativeGame = status.state.games[0]; const managedFolder = resolve(nativeData, nativeGame.id, 'game');
  assert.equal(await readFile(resolve(managedFolder, 'SAVE.DAT'), 'utf8'), 'original-save');
  await manager.getByRole('button', { name: 'バックアップを作成', exact: true }).click();
  await expect(manager.getByRole('heading', { name: 'セーブデータのバックアップ (1/30)' })).toBeVisible();
  await writeFile(resolve(managedFolder, 'SAVE.DAT'), 'changed-save'); await writeFile(resolve(managedFolder, 'NEW.DAT'), 'new-file');
  await manager.getByRole('button', { name: '復元', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'バックアップを復元' }).getByRole('button', { name: 'キャンセル', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); assert.equal(await readFile(resolve(managedFolder, 'SAVE.DAT'), 'utf8'), 'changed-save');
  await manager.getByRole('button', { name: '復元', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '復元する', exact: true }).click();
  await expect(manager.getByRole('heading', { name: 'セーブデータのバックアップ (2/30)' })).toBeVisible();
  assert.equal(await readFile(resolve(managedFolder, 'SAVE.DAT'), 'utf8'), 'original-save');
  await assert.rejects(readFile(resolve(managedFolder, 'NEW.DAT')));
  await manager.getByLabel('CPU速度', { exact: true }).fill('3000');
  await manager.getByRole('checkbox', { name: 'ゲーム音声', exact: true }).uncheck();
  await manager.getByRole('button', { name: '起動設定を保存', exact: true }).click();
  await expect(manager.getByRole('status')).toContainText('保存しました');
  if (process.env.RETRODOS_DOSBOX_EXECUTABLE) {
    await manager.getByLabel('DOSBoxの実行ファイル').fill(process.env.RETRODOS_DOSBOX_EXECUTABLE);
    await manager.getByRole('button', { name: '本体の設定を保存', exact: true }).click();
    await expect(manager.getByRole('status')).toContainText('保存しました');
    await expect(manager.getByRole('button', { name: '本体の設定を保存', exact: true })).toBeFocused();
    await page.keyboard.press('Control+w'); await input.fill('DOSRUN DOS_TEST'); await input.press('Enter');
    await expect(page.locator('[role="log"]')).toContainText('DOSBoxでゲームを起動しました');
    await expect.poll(async () => (await nativeStatus()).state.running, { timeout: 30_000 }).toEqual([]);
    assert.equal(await readFile(resolve(managedFolder, 'SAVE.DAT'), 'utf8'), 'DOSBOX-SAVE-OK');
    assert.equal(await readFile(resolve(nativeSource, 'SAVE.DAT'), 'utf8'), 'original-save');
    console.log('Real DOSBox: COM execution and save output verified in the managed Japanese-path fixture.');
    await input.fill('GAMES'); await input.press('Enter');
    await expect(programs.getByRole('article', { name: /DOS_TEST DOS NATIVE TEST/ })).toBeVisible();
    await gameSelector.fill('DOS_TEST'); await gameSelector.press('Enter');
    await expect(manager).toBeVisible();
    await expect.poll(async () => (await nativeStatus()).state.running, { timeout: 30_000 }).toEqual([]);
    await page.getByRole('button', { name: 'プログラムを開く', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: /^DOS NATIVE TEST / })).toBeVisible();
    await page.getByRole('menuitem', { name: /^DOS NATIVE TEST / }).click();
    await expect.poll(async () => (await nativeStatus()).state.running, { timeout: 30_000 }).toEqual([]);
  }
  await page.reload(); await input.fill('DOSBOX'); await input.press('Enter');
  await manager.getByRole('button', { name: /DOS NATIVE TEST/ }).click();
  await expect(manager.getByLabel('CPU速度', { exact: true })).toHaveValue('3000');
  await page.getByRole('button', { name: '全画面表示', exact: true }).click();
  await expect(page.getByRole('button', { name: '全画面を解除', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '全画面表示', exact: true })).toBeVisible();
  await expect(manager).toBeVisible();
  await page.keyboard.press('F11'); await expect(page.getByRole('button', { name: '全画面を解除', exact: true })).toBeVisible();
  await page.keyboard.press('F11'); await expect(page.getByRole('button', { name: '全画面表示', exact: true })).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL('../test-results/desktop-dos-manager.png', import.meta.url)) });
  await manager.getByRole('button', { name: '登録を削除', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '登録を削除する', exact: true }).click();
  await expect(manager).toContainText('ゲームはまだ登録されていません');
  assert.equal(await readFile(resolve(nativeSource, 'SAVE.DAT'), 'utf8'), 'original-save');
  await page.keyboard.press('Control+w');
  assert.deepEqual(errors, []);
  await mkdir(fileURLToPath(new URL('../docs/screenshots/', import.meta.url)), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL('../docs/screenshots/desktop.png', import.meta.url)) });
  console.log(`Desktop smoke test passed (${profile}): ${page.url()}, clipboard, IME, shell/BAT/Vim, 6 games, plugins/sandbox, scores, 9 apps, native DOS import/settings/backups/restore/remove, fullscreen, library and keyboard.`);
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
