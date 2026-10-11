import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const commandInput = (page: Page) => page.getByRole('combobox', { name: 'コマンド入力' });
const run = async (page: Page, command: string) => {
  await commandInput(page).fill(command);
  await commandInput(page).press('Enter');
};

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('boot, filesystem, errors, safe text and CLS', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const log = page.getByRole('log');
  await expect(log).toContainText('RetroDOS Version 1.0.0');
  await commandInput(page).evaluate(element => element.blur());
  await page.keyboard.press('Space');
  await expect(commandInput(page)).toBeFocused();
  const cdp = await page.context().newCDPSession(page);
  await commandInput(page).fill('ve');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Process', code: 'KeyR', windowsVirtualKeyCode: 229 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Process', code: 'KeyR', windowsVirtualKeyCode: 229 });
  await expect(commandInput(page)).toHaveValue('ver');
  await commandInput(page).press('Enter');
  await expect(log.locator('.terminal-entry.input').last()).toContainText('ver');
  await run(page, 'HELP');
  await expect(log).toContainText('利用可能なコマンド');
  await run(page, 'DIR');
  await expect(log).toContainText('README.TXT');
  await run(page, 'MKDIR NOTES');
  await expect(log).toContainText('ディレクトリを作成しました: C:\\NOTES');
  await run(page, 'CD NOTES');
  await expect(page.locator('.status-path')).toHaveText('C:\\NOTES');
  await run(page, 'CD ..');
  await run(page, 'CD DOCS');
  await expect(page.locator('.status-path')).toHaveText('C:\\DOCS');
  await run(page, 'TYPE "WELCOME NOTE.TXT"');
  await expect(log).toContainText('ようこそ、RetroDOSへ。');
  await run(page, 'CD MISSING');
  await expect(page.locator('.execution-status')).toHaveText('ERROR');
  await expect(page.locator('.status-path')).toHaveText('C:\\DOCS');
  await run(page, 'CD ..');
  await expect(page.locator('.status-path')).toHaveText('C:\\');
  await run(page, 'NOT_A_COMMAND');
  await expect(log.locator('.error')).toContainText(['コマンドが見つかりません', 'HELP']);
  await run(page, 'ECHO <img src=x onerror=alert(1)>');
  await expect(log).toContainText('<img src=x onerror=alert(1)>');
  await expect(log.locator('img')).toHaveCount(0);
  await commandInput(page).fill('cl');
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Process', code: 'KeyS', windowsVirtualKeyCode: 229 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Process', code: 'KeyS', windowsVirtualKeyCode: 229 });
  await expect(commandInput(page)).toHaveValue('cls');
  await commandInput(page).press('Enter');
  await expect(log).not.toContainText('Welcome to RetroDOS.');
  await expect(log.locator('.terminal-entry')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('search, details and insertion do not execute automatically', async ({ page }) => {
  const search = page.getByRole('textbox', { name: 'コマンドを検索' });
  await search.fill('ディレクトリ');
  await expect(page.locator('.command-item')).toHaveCount(4);
  await search.fill('tYpE');
  await page.locator('.command-item').click();
  const details = page.getByRole('region', { name: 'TYPEの詳細' });
  await expect(details).toContainText('TYPE <ファイルパス>');
  await expect(details).toContainText('TYPE README.TXT');
  await expect(details.getByRole('button', { name: '入力欄に挿入' })).toBeInViewport();
  const initialCount = await page.locator('.terminal-entry').count();
  await details.getByRole('button', { name: '入力欄に挿入' }).click();
  await expect(commandInput(page)).toHaveValue('TYPE ');
  await expect(commandInput(page)).toBeFocused();
  await expect(page.locator('.terminal-entry')).toHaveCount(initialCount);
  await details.getByRole('button', { name: 'コマンド一覧へ' }).click();
  await search.fill('no-results');
  await expect(page.getByText('コマンドが見つかりません', { exact: true })).toBeVisible();
  await search.fill('');
  await expect(page.getByRole('button', { name: /基本操作/ })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /ファイル操作/ })).toHaveAttribute('aria-expanded', 'false');
});

test('command guide uses collapsible categories and runs commands without arguments', async ({ page }) => {
  const fileCategory = page.getByRole('button', { name: /ファイル操作/ });
  await fileCategory.click();
  await expect(fileCategory).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /DIR ファイル一覧/ })).toBeVisible();

  const search = page.getByRole('textbox', { name: 'コマンドを検索' });
  await search.fill('ver');
  await page.getByRole('button', { name: /VER バージョン/ }).click();
  const details = page.getByRole('region', { name: 'VERの詳細' });
  await expect(search).toBeHidden();
  await details.getByRole('button', { name: '実行する' }).click();
  await expect(page.getByRole('log')).toContainText('RetroDOS Version 1.0.0');
  await expect(search).toBeVisible();
});

test('file operations support copy, rename, move and deletion', async ({ page }) => {
  await run(page, 'MKDIR WORK');
  await run(page, 'VIM NOTE.TXT');
  const editor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  await editor.press('i');
  await editor.type('file operation test');
  await editor.press('Escape');
  await editor.press('Shift+;');
  const vimCommand = page.getByRole('textbox', { name: 'Vimコマンド' });
  await vimCommand.fill('wq');
  await vimCommand.press('Enter');

  await run(page, 'COPY NOTE.TXT COPY.TXT');
  await run(page, 'REN COPY.TXT RENAMED.TXT');
  await run(page, 'MOVE RENAMED.TXT WORK');
  await run(page, 'TYPE WORK\\RENAMED.TXT');
  await expect(page.getByRole('log')).toContainText('file operation test');
  await run(page, 'DEL WORK\\RENAMED.TXT');
  await run(page, 'RMDIR WORK');
  await run(page, 'DIR');
  await expect(page.getByRole('log').locator('.terminal-entry.output').filter({ hasText: '<DIR>        WORK' })).toHaveCount(0);
});

test('file commands support discovery, paging, wildcard undo and drive transfer', async ({ page }) => {
  const log = page.getByRole('log');
  await run(page, 'PWD');
  await expect(log).toContainText('C:\\');
  await run(page, 'TREE DOCS');
  await expect(log).toContainText('COMMANDS.TXT');
  await run(page, 'FIND RetroDOS');
  await expect(log).toContainText('検索結果:');
  await run(page, 'STAT README.TXT');
  await expect(log).toContainText('Modified');

  await run(page, 'MORE DOCS\\COMMANDS.TXT');
  const pager = page.getByRole('region', { name: 'MOREページャー' });
  await expect(pager).toBeVisible();
  await expect(pager).toContainText('RetroDOS v1.0 コマンドガイド');
  await page.keyboard.press('End');
  await page.keyboard.press('Control+w');
  await expect(commandInput(page)).toBeFocused();

  await run(page, 'COPY README.TXT TEMP-A.TXT');
  await run(page, 'COPY README.TXT TEMP-B.TXT');
  await run(page, 'DEL TEMP-*.TXT');
  await expect(log).toContainText('2 ファイルを削除しました');
  await run(page, 'UNDO');
  await run(page, 'TYPE TEMP-A.TXT');
  await expect(log).toContainText('Welcome to RetroDOS.');

  const downloadPromise = page.waitForEvent('download');
  await run(page, 'EXPORT TEST-DRIVE.JSON');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('TEST-DRIVE.JSON');

  await run(page, 'IMPORT');
  const importView = page.getByRole('region', { name: '仮想ドライブ取り込み' });
  await expect(importView).toBeVisible();
  const archive = JSON.stringify({
    format: 'retrodos-drive', version: 1, exportedAt: new Date().toISOString(),
    root: { kind: 'directory', name: 'C:', children: [{ kind: 'file', name: 'IMPORTED.TXT', content: 'import succeeded' }] },
  });
  await importView.getByLabel('IMPORT FILE').setInputFiles({ name: 'drive.json', mimeType: 'application/json', buffer: Buffer.from(archive) });
  await importView.getByRole('button', { name: 'インポート実行' }).click();
  await expect(commandInput(page)).toBeFocused();
  await run(page, 'TYPE IMPORTED.TXT');
  await expect(log).toContainText('import succeeded');
  await page.reload();
  await run(page, 'TYPE IMPORTED.TXT');
  await expect(page.getByRole('log')).toContainText('import succeeded');
});

test('v0.3 shell supports chains, redirects, pipes, variables, aliases, definitions and BAT files', async ({ page }) => {
  const log = page.getByRole('log');
  await run(page, 'SET NAME=RETRODOS');
  await run(page, 'ECHO hello > C:\\NOTE.TXT');
  await run(page, 'TYPE C:\\NOTE.TXT');
  await expect(log).toContainText('hello');

  await run(page, 'CD DOCS && DIR | FIND ".TXT"');
  await expect(page.locator('.status-path')).toHaveText('C:\\DOCS');
  await expect(log).toContainText('COMMANDS.TXT');

  await run(page, 'ALIAS LL=DIR');
  await run(page, 'LL C:\\SCRIPTS');
  await expect(log).toContainText('DEMO.BAT');
  await run(page, 'DEF GREET=ECHO Hello %1');
  await commandInput(page).fill('GR');
  await commandInput(page).press('Tab');
  await expect(commandInput(page)).toHaveValue('GREET ');
  await run(page, 'GREET user');
  await expect(log).toContainText('Hello user');

  await page.reload();
  await run(page, 'ECHO %NAME%');
  await expect(page.getByRole('log')).toContainText('RETRODOS');
  await run(page, 'GREET persisted');
  await expect(page.getByRole('log')).toContainText('Hello persisted');
  await run(page, 'LL C:\\SCRIPTS');
  await expect(page.getByRole('log')).toContainText('DEMO.BAT');

  await run(page, 'CALL C:\\SCRIPTS\\DEMO.BAT');
  await expect(page.getByRole('log')).toContainText('RETRODOS shell is ready');
  await run(page, 'TYPE C:\\SHELL-DEMO.TXT');
  await expect(page.getByRole('log')).toContainText('RETRODOS shell is ready');
});

test('Vim editor supports modal keyboard editing, saving and quitting', async ({ page }) => {
  await run(page, 'VIM NOTES.TXT');
  const vim = page.getByRole('region', { name: 'VIMメモ帳' });
  const editor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  await expect(vim).toBeVisible();
  await expect(editor).toBeFocused();
  await expect(vim).toContainText('-- NORMAL --');

  await editor.press('i');
  await expect(vim).toContainText('-- INSERT --');
  await editor.type('RetroDOS Vim memo');
  await editor.press('Enter');
  await editor.type('second line');
  await editor.press('Escape');
  await expect(vim).toContainText('-- NORMAL --');

  await editor.press('Shift+;');
  const vimCommand = page.getByRole('textbox', { name: 'Vimコマンド' });
  await expect(vimCommand).toBeFocused();
  await vimCommand.fill('q');
  await vimCommand.press('Enter');
  await expect(page.getByRole('alert')).toContainText('保存されていません');
  await expect(vim).toBeVisible();

  await editor.press('Shift+;');
  await vimCommand.fill('w');
  await vimCommand.press('Enter');
  await expect(vim).toContainText('書き込み済み');

  await editor.press('Shift+;');
  await vimCommand.fill('q');
  await vimCommand.press('Enter');
  await expect(commandInput(page)).toBeFocused();
  await run(page, 'TYPE NOTES.TXT');
  await expect(page.getByRole('log')).toContainText('RetroDOS Vim memo\nsecond line');
  await page.reload();
  await run(page, 'TYPE NOTES.TXT');
  await expect(page.getByRole('log')).toContainText('RetroDOS Vim memo\nsecond line');
});

test('Vim supports line yank and paste, redo, search, options and editing another file', async ({ page }) => {
  await run(page, 'VIM SOURCE.TXT');
  const vim = page.getByRole('region', { name: 'VIMメモ帳' });
  const editor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  const ex = async (value: string) => {
    await editor.press('Shift+;');
    const command = page.getByRole('textbox', { name: 'Vimコマンド' });
    await command.fill(value); await command.press('Enter');
  };

  await editor.press('i');
  await editor.fill('alpha\nbeta alpha\ngamma');
  await editor.press('Escape');
  await editor.press('Home'); await editor.press('k');
  await editor.press('y'); await editor.press('y');
  await expect(vim).toContainText('1行ヤンクしました');
  await editor.press('p');
  await expect(editor).toHaveValue('alpha\nbeta alpha\nbeta alpha\ngamma');
  await editor.press('u');
  await expect(editor).toHaveValue('alpha\nbeta alpha\ngamma');
  await editor.press('Control+r');
  await expect(editor).toHaveValue('alpha\nbeta alpha\nbeta alpha\ngamma');
  await expect.poll(() => editor.evaluate(element => (element as HTMLTextAreaElement).selectionStart)).toBe(17);
  await editor.press('d'); await editor.press('d');
  await expect(editor).toHaveValue('alpha\nbeta alpha\ngamma');
  await editor.press('p');
  await expect(editor).toHaveValue('alpha\nbeta alpha\ngamma\nbeta alpha');

  await editor.press('/');
  const search = page.getByRole('textbox', { name: 'Vim検索' });
  await expect(search).toBeFocused();
  await search.fill('alpha'); await search.press('Enter');
  await expect.poll(() => editor.evaluate(element => {
    const input = element as HTMLTextAreaElement;
    return input.value.slice(input.selectionStart, input.selectionEnd);
  })).toBe('alpha');
  await editor.press('n'); await expect(vim).toContainText('/alpha');
  await editor.press('Shift+n'); await expect(vim).toContainText('?alpha');

  await ex('set nonumber');
  await expect(vim.locator('.vim-line-numbers')).toHaveCount(0);
  await ex('set number');
  await expect(vim.locator('.vim-line-numbers')).toBeVisible();
  await ex('w');

  await ex('e OTHER.TXT');
  await expect(page.getByRole('tab', { name: 'OTHER.TXT', exact: true })).toBeVisible();
  await expect(editor).toHaveValue('');
  await editor.press('i'); await editor.fill('unsaved other file'); await editor.press('Escape');
  await ex('e SOURCE.TXT');
  await expect(page.getByRole('alert')).toContainText('保存されていません');
  await expect(page.getByRole('tab', { name: 'OTHER.TXT', exact: true })).toBeVisible();
  await ex('e! SOURCE.TXT');
  await expect(page.getByRole('tab', { name: 'SOURCE.TXT', exact: true })).toBeVisible();
  await expect(editor).toHaveValue('alpha\nbeta alpha\ngamma\nbeta alpha');
  await ex('q');
  await expect(commandInput(page)).toBeFocused();
});

test('task tabs show only open apps and keep background tasks available', async ({ page }) => {
  const tabs = page.locator('.workspace-tabs');
  await expect(tabs.locator('.workspace-tab')).toHaveCount(1);
  await expect(tabs.locator('.workspace-tab-main')).toHaveText(['ターミナル']);

  await run(page, 'VIM TASK.TXT');
  await expect(tabs.locator('.workspace-tab')).toHaveCount(2);
  await expect(tabs.locator('.workspace-tab').nth(1)).toContainText('TASK.TXT');
  const editor = page.locator('.vim-editor');
  await editor.press('i');
  await editor.type('unsaved task');
  await editor.press('Escape');
  await tabs.locator('.workspace-tab').nth(1).locator('.workspace-tab-close').click();
  await expect(page.getByRole('alert')).toContainText('E37');
  await expect(tabs.locator('.workspace-tab')).toHaveCount(2);
  await editor.press('Shift+;');
  await page.locator('.vim-command-line input').fill('q!');
  await page.locator('.vim-command-line input').press('Enter');
  await expect(tabs.locator('.workspace-tab')).toHaveCount(1);

  await run(page, 'GAMES');
  await expect(tabs.locator('.workspace-tab')).toHaveCount(2);
  await page.locator('.game-card .button.primary').first().click();
  await expect(tabs.locator('.workspace-tab')).toHaveCount(3);
  await expect(tabs.locator('.workspace-tab').nth(2)).toContainText('GUESS');
  const gameInput = page.locator('.guess-form input');
  await gameInput.fill('101');
  await gameInput.press('Enter');
  await expect(page.locator('.game-view .form-error')).toBeVisible();

  await page.keyboard.press('Control+Shift+Tab');
  await expect(page.locator('.library-view')).toBeVisible();
  await page.keyboard.press('Control+Tab');
  await expect(page.locator('.game-view')).toBeVisible();

  const gameTab = tabs.locator('.workspace-tab').nth(2).locator('.workspace-tab-main');
  await gameTab.focus();
  await gameTab.press('Home');
  const terminalTab = tabs.locator('.workspace-tab-main').first();
  await expect(terminalTab).toHaveAttribute('aria-selected', 'true');
  await expect(terminalTab).toBeFocused();
  await terminalTab.press('End');
  await expect(page.locator('.game-view')).toBeVisible();
  await expect(gameTab).toBeFocused();

  await tabs.locator('.workspace-tab-main').first().click();
  await expect(commandInput(page)).toBeFocused();
  await expect(tabs.locator('.workspace-tab')).toHaveCount(3);
  await tabs.locator('.workspace-tab').nth(2).locator('.workspace-tab-main').click();
  await expect(gameInput).toHaveValue('101');
  await expect(page.locator('.game-view .form-error')).toBeVisible();
  await tabs.locator('.workspace-tab').nth(2).locator('.workspace-tab-close').click();
  await expect(tabs.locator('.workspace-tab')).toHaveCount(2);
  await expect(commandInput(page)).toBeFocused();
  await tabs.locator('.workspace-tab').nth(1).locator('.workspace-tab-close').click();
  await expect(tabs.locator('.workspace-tab')).toHaveCount(1);
});

test('history restores drafts, completion supports keyboard and Escape', async ({ page }) => {
  const input = commandInput(page);
  await run(page, 'ECHO first');
  await run(page, 'VER');
  await expect(page.locator('.terminal-entry.input')).toHaveCount(2);
  await input.fill('draft');
  await input.press('ArrowUp'); await expect(input).toHaveValue('VER');
  await input.press('ArrowUp'); await expect(input).toHaveValue('ECHO first');
  await input.press('ArrowDown'); await expect(input).toHaveValue('VER');
  await input.press('ArrowDown'); await expect(input).toHaveValue('draft');
  await input.fill('he'); await input.press('Tab'); await expect(input).toHaveValue('HELP ');
  await input.fill('C'); await input.press('Tab');
  await expect(page.getByRole('listbox', { name: '補完候補' })).toBeVisible();
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(input).toHaveValue('CLEAR ');
  await expect(page.locator('.terminal-entry.input')).toHaveCount(2);
  await input.fill('C'); await input.press('Tab'); await input.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.press('Control+k');
  await expect(page.getByRole('textbox', { name: 'コマンドを検索' })).toBeFocused();
});

test('library, GUESS validation, win, replay and exit', async ({ page }) => {
  await run(page, 'GAMES');
  await expect(page.getByRole('region', { name: 'プログラム一覧画面' })).toBeVisible();
  await expect(page.getByRole('article').first()).toContainText('標準プログラム');
  await page.getByRole('button', { name: '起動', exact: true }).first().click();
  const game = page.getByRole('region', { name: 'GUESS 数当てゲーム' });
  const number = page.getByRole('spinbutton', { name: '予想する数字' });
  await expect(number).toBeFocused();
  await number.evaluate(element => element.blur());
  await page.keyboard.press('Space');
  await expect(number).toBeFocused();
  await expect(page.locator('.execution-status')).toHaveText('RUNNING');
  await number.fill('101'); await number.press('Enter');
  await expect(page.getByRole('alert')).toContainText('1〜100');
  let won = false;
  for (let turn = 0; turn < 7; turn++) {
    const range = await game.locator('.guess-info strong').first().innerText();
    const digits = range.match(/\d+/g)!.map(Number);
    await number.fill(String(Math.floor((digits[0]! + digits[1]!) / 2)));
    await number.press('Enter');
    await expect(game.locator('.attempts > span')).toHaveCount(turn + 1);
    if ((await game.locator('.guess-message').innerText()).includes('正解')) { won = true; break; }
  }
  expect(won).toBe(true);
  await game.getByRole('button', { name: 'もう一度遊ぶ' }).click();
  await expect(number).toBeVisible();
  await expect(game.locator('.attempts')).toHaveCount(0);
  await expect(game.locator('.game-footer-note kbd').filter({ hasText: 'Ctrl+W' })).toHaveText('Ctrl+W');
  await number.press('Control+w');
  await expect(commandInput(page)).toBeFocused();
  await expect(page.locator('.execution-status')).toHaveText('READY');
  await run(page, 'RUN GUESS');
  await expect(game).toBeVisible();
  await page.locator('.workspace-tab').filter({ hasText: 'GUESS' }).locator('.workspace-tab-close').click();
  await expect(commandInput(page)).toBeFocused();
});

test('game library supports code, number and arrow-only keyboard selection', async ({ page }) => {
  const selector = page.getByRole('textbox', { name: 'プログラムコードまたは番号' });
  const game = page.getByRole('region', { name: 'GUESS 数当てゲーム' });

  await run(page, 'GAMES');
  await expect(selector).toBeFocused();
  await selector.evaluate(element => element.blur());
  await page.keyboard.press('Space');
  await expect(selector).toBeFocused();
  await selector.fill('UNKNOWN');
  await selector.press('Enter');
  await expect(page.getByRole('alert')).toContainText('プログラムが見つかりません');

  await selector.fill('guess');
  await selector.press('Enter');
  await expect(game).toBeVisible();
  await page.getByRole('spinbutton', { name: '予想する数字' }).press('Control+w');

  await run(page, 'GAMES');
  await selector.fill('1');
  await selector.press('Enter');
  await expect(game).toBeVisible();
  await page.getByRole('spinbutton', { name: '予想する数字' }).press('Control+w');

  await run(page, 'GAMES');
  await selector.press('ArrowDown');
  await expect(page.locator('.game-card.selected')).toContainText('SNAKE');
  await selector.press('Enter');
  await expect(page.getByRole('region', { name: 'SNAKEゲーム' })).toBeVisible();
  await page.getByLabel('SNAKE盤面').press('Control+w');

  await run(page, 'GAMES');
  await selector.press('Control+w');
  await expect(commandInput(page)).toBeFocused();
});

test('new output keeps older logs in place until explicitly following', async ({ page }) => {
  const log = page.getByRole('log');
  await run(page, 'ECHO ' + Array.from({ length: 90 }, (_, index) => `line-${index}`).join('\n'));
  await expect(log).toContainText('line-89');
  // The parser treats newlines as whitespace. A long help log also exercises scrolling.
  for (let index = 0; index < 5; index++) { await run(page, 'HELP'); }
  await expect(page.locator('.terminal-entry.input')).toHaveCount(6);
  await expect.poll(() => log.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2);
  await log.evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')); });
  await run(page, 'ECHO latest-output');
  await expect(page.getByRole('button', { name: '新しい出力' })).toBeVisible();
  expect(await log.evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole('button', { name: '新しい出力' }).click();
  await expect(page.getByRole('button', { name: '新しい出力' })).toHaveCount(0);
  expect(await log.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(48);
});

test('resizing and sidebar toggles keep input and status visible', async ({ page }) => {
  for (const size of [{ width: 1180, height: 780 }, { width: 800, height: 600 }, { width: 520, height: 480 }, { width: 375, height: 667 }]) {
    await page.setViewportSize(size);
    if (size.width <= 720 && await page.locator('.sidebar').count()) await page.locator('.sidebar-toggle').click();
    await expect(commandInput(page)).toBeVisible();
    await expect(page.locator('.statusbar')).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBe(dimensions.width);
    const box = await commandInput(page).boundingBox();
    expect(box!.y + box!.height).toBeLessThan(size.height - 25);
  }
  await page.locator('.sidebar-toggle').click();
  await expect(page.getByRole('textbox', { name: 'コマンドを検索' })).toBeVisible();
  await page.getByRole('textbox', { name: 'コマンドを検索' }).fill('run');
  await page.getByRole('button', { name: 'RUN プログラムを起動', exact: true }).click();
  await page.getByRole('button', { name: '入力欄に挿入' }).click();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(commandInput(page)).toHaveValue('RUN GUESS');
  await expect(commandInput(page)).toBeFocused();
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
