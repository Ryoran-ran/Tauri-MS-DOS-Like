import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const input = (page: Page) => page.getByRole('combobox', { name: 'コマンド入力' });
async function run(page: Page, command: string) {
  await page.getByRole('tab', { name: 'ターミナル', exact: true }).click();
  await input(page).fill(command); await input(page).press('Enter');
}
const apps = [['FILES', 'ファイルマネージャー'], ['TODO', 'ToDoリスト'], ['CALENDAR', 'カレンダー'], ['CALC', '電卓'], ['PAINT', 'ASCIIペイント'], ['MARKDOWN', 'Markdownビューア'], ['SYSINFO', 'システム情報'], ['SETTINGS', '設定']] as const;
test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('all eight programs open from commands and the tab launcher, with keyboard switching and closing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const [command, name] of apps) {
    await run(page, command);
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
  }
  await expect(page.getByRole('tab')).toHaveCount(9);
  for (const [, name] of apps) {
    await page.getByRole('button', { name: 'プログラムを開く', exact: true }).click();
    await page.getByRole('menuitem', { name: new RegExp(name) }).click();
    await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('tab')).toHaveCount(9);
  await page.keyboard.press('Control+Shift+Tab');
  await expect(page.getByRole('region', { name: 'システム情報', exact: true })).toBeVisible();
  await page.keyboard.press('Control+Tab');
  await page.keyboard.press('Escape');
  await expect(input(page)).toBeFocused();
  await expect(page.getByRole('tab')).toHaveCount(8);
  await page.getByRole('button', { name: 'プログラムを開く', exact: true }).click();
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('End'); await expect(page.getByRole('menuitem').last()).toBeFocused();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'ToDoリスト', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('file manager creates, edits, renames, copies, moves, deletes and restores virtual files', async ({ page }) => {
  await run(page, 'FILES');
  const manager = page.getByRole('region', { name: 'ファイルマネージャー', exact: true });
  const actions = manager.locator('.file-actions');
  const operation = async (button: string, value: string, submit: string) => {
    await actions.getByRole('button', { name: button, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox').fill(value);
    await dialog.getByRole('button', { name: submit, exact: true }).click();
    await expect(dialog).toHaveCount(0);
  };
  await operation('新規フォルダー', 'WORK', 'フォルダー作成する');
  await operation('新規ファイル', 'NOTE.TXT', 'ファイル作成する');
  await manager.getByRole('button', { name: 'NOTE.TXT', exact: true }).press('Enter');
  const editor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  await editor.press('i'); await editor.fill('file manager memo'); await editor.press('Escape'); await editor.press('Shift+;');
  await page.getByRole('textbox', { name: 'Vimコマンド' }).fill('wq'); await page.getByRole('textbox', { name: 'Vimコマンド' }).press('Enter');
  await page.getByRole('tab', { name: 'ファイルマネージャー', exact: true }).click();
  await manager.getByRole('button', { name: 'NOTE.TXT', exact: true }).click();
  await operation('名前変更', 'MEMO.TXT', '名前変更する');
  await manager.getByRole('button', { name: 'MEMO.TXT', exact: true }).click();
  await operation('コピー', 'COPY.TXT', 'コピーする');
  await manager.getByRole('button', { name: 'COPY.TXT', exact: true }).click();
  await operation('移動', 'WORK', '移動する');
  await manager.getByRole('button', { name: 'WORK', exact: true }).press('Enter');
  await manager.getByRole('button', { name: 'COPY.TXT', exact: true }).click();
  await actions.getByRole('button', { name: '削除', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '削除する', exact: true }).click();
  await expect(manager.getByRole('button', { name: 'COPY.TXT', exact: true })).toHaveCount(0);
  await actions.getByRole('button', { name: '元に戻す', exact: true }).click();
  await expect(manager.getByRole('button', { name: 'COPY.TXT', exact: true })).toBeVisible();
  await run(page, 'TYPE WORK\\COPY.TXT'); await expect(page.getByRole('log')).toContainText('file manager memo');
  await page.reload(); await run(page, 'FILES WORK'); await expect(manager.getByRole('button', { name: 'COPY.TXT', exact: true })).toBeVisible();
});

test('ToDo deadlines appear in calendar and both programs preserve edits after reload', async ({ page }) => {
  const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  await run(page, 'TODO');
  const todo = page.getByRole('region', { name: 'ToDoリスト', exact: true });
  await todo.getByLabel('タスク名', { exact: true }).fill('資料を書く');
  await todo.getByLabel('タスクの期限').fill(today);
  await todo.getByLabel('タスクの優先度').selectOption('high');
  await todo.getByRole('button', { name: '追加', exact: true }).click();
  await todo.getByRole('button', { name: '資料を書くを編集', exact: true }).click();
  await todo.getByLabel('タスク名', { exact: true }).fill('資料を仕上げる');
  await todo.getByRole('button', { name: '更新', exact: true }).click();
  await run(page, 'CALENDAR');
  const calendar = page.getByRole('region', { name: 'カレンダー', exact: true });
  await expect(calendar.locator('.calendar-todo')).toContainText('資料を仕上げる');
  await calendar.getByLabel('予定名').fill('打ち合わせ');
  await calendar.getByLabel('予定の時刻').fill('10:30');
  await calendar.getByRole('button', { name: '予定を追加', exact: true }).click();
  await expect(calendar.locator('.agenda-list')).toContainText('10:30');
  await calendar.getByRole('button', { name: '打ち合わせを編集', exact: true }).click();
  await calendar.getByLabel('予定名').fill('開発打ち合わせ');
  await calendar.getByRole('button', { name: '予定を更新', exact: true }).click();
  await calendar.getByRole('button', { name: today, exact: true }).focus();
  await page.keyboard.press('ArrowRight'); await expect(calendar.locator('.calendar-day[aria-pressed=true]')).not.toHaveAttribute('aria-label', today);
  await page.reload(); await run(page, 'TODO');
  await expect(todo.locator('.todo-list')).toContainText('資料を仕上げる');
  await todo.getByRole('checkbox', { name: '資料を仕上げるを完了' }).click();
  await todo.getByRole('button', { name: '完了', exact: true }).click();
  await expect(todo.locator('.todo-list .done')).toContainText('資料を仕上げる');
  await run(page, 'CALENDAR');
  await expect(calendar.locator('.agenda-list')).toContainText('開発打ち合わせ');
  await calendar.getByRole('button', { name: '開発打ち合わせを削除', exact: true }).click();
  await expect(calendar.locator('.agenda-list li')).toHaveCount(0);
});

test('calculator handles expression commands, invalid input, memory and history', async ({ page }) => {
  await run(page, 'CALC "(12 + 8) * 3"');
  const calc = page.getByRole('region', { name: '電卓', exact: true });
  await expect(calc.getByLabel('計算結果')).toHaveText('60');
  await expect(calc.locator('.calculator-history button')).toHaveCount(1);
  await calc.getByRole('button', { name: 'M+', exact: true }).click();
  await calc.getByRole('button', { name: 'C', exact: true }).click();
  await calc.getByRole('button', { name: 'MR', exact: true }).click();
  await expect(calc.getByLabel('計算式')).toHaveValue('60');
  await calc.getByLabel('計算式').fill('1 / 0'); await calc.getByLabel('計算式').press('Enter');
  await expect(calc.getByRole('alert')).toContainText('0で割る');
  await calc.getByLabel('計算式').fill('2^3^2'); await calc.getByLabel('計算式').press('Enter');
  await expect(calc.getByLabel('計算結果')).toHaveText('512');
  await expect(calc.locator('.calculator-history')).toContainText('(12 + 8) * 3');
  await page.getByRole('button', { name: 'プログラムを開く', exact: true }).click();
  await page.getByRole('menuitem', { name: /電卓/ }).click();
  await expect(calc.getByLabel('計算式')).toHaveValue('2^3^2');
});

test('paint supports keyboard drawing, undo, drafts and text files; Markdown safely previews Vim documents', async ({ page }) => {
  await run(page, 'PAINT ART.ASC');
  const paint = page.getByRole('region', { name: 'ASCIIペイント', exact: true });
  await expect(paint.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
  const grid = paint.getByRole('grid');
  await grid.press('A'); await grid.press('B'); await grid.press('Control+z');
  await expect(grid.getByRole('gridcell').nth(0)).toHaveText('A');
  await expect(grid.getByRole('gridcell').nth(1)).toHaveText(' ');
  await paint.getByRole('button', { name: 'テキスト編集', exact: true }).click();
  await paint.getByLabel('ASCIIテキスト').fill('+---+\n|DOS|\n+---+');
  await paint.getByLabel('ASCIIテキスト').press('Control+s');
  await expect(paint.getByRole('status')).toContainText('保存しました');
  await paint.getByLabel('ASCIIテキスト').fill('UNSAVED DRAFT');
  await page.keyboard.press('Escape'); await run(page, 'PAINT ART.ASC');
  await expect(paint.getByRole('status')).toContainText('下書きを復元');
  await expect(paint.getByRole('grid')).toContainText('UNSAVED DRAFT');
  await run(page, 'TYPE ART.ASC'); await expect(page.getByRole('log')).toContainText('|DOS|');
  await run(page, 'VIM NOTE.MD');
  const editor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  await editor.press('i'); await editor.fill('# My Note\n\n**bold** and `code`\n\n- item\n\n<img src=x onerror=alert(1)>\n[bad](javascript:alert)');
  await editor.press('Escape'); await editor.press('Shift+;');
  await page.getByRole('textbox', { name: 'Vimコマンド' }).fill('wq'); await page.getByRole('textbox', { name: 'Vimコマンド' }).press('Enter');
  await run(page, 'MARKDOWN NOTE.MD');
  const markdown = page.getByRole('region', { name: 'Markdownビューア', exact: true });
  await expect(markdown.getByRole('heading', { name: 'My Note' })).toBeVisible();
  await expect(markdown.locator('article strong')).toHaveText('bold');
  await expect(markdown.locator('article img')).toHaveCount(0);
  await expect(markdown.locator('article a')).toHaveCount(0);
  await expect(markdown.locator('article')).toContainText('<img src=x onerror=alert(1)>');
  await markdown.getByRole('button', { name: 'ソース', exact: true }).click();
  await expect(markdown.locator('.markdown-source')).toContainText('# My Note');
  await run(page, 'ECHO "# Second document" > SECOND.MD');
  await page.getByRole('tab', { name: 'Markdownビューア', exact: true }).click();
  await markdown.getByLabel('Markdownファイルのパス').fill('SECOND.MD');
  await markdown.getByLabel('Markdownファイルのパス').press('Enter');
  await expect(markdown.locator('.markdown-source')).toContainText('# Second document');
  await page.getByRole('tab', { name: 'ターミナル', exact: true }).click();
  await page.getByRole('tab', { name: 'Markdownビューア', exact: true }).click();
  await expect(markdown.locator('.markdown-source')).toContainText('# Second document');
  await page.reload(); await run(page, 'PAINT ART.ASC'); await expect(paint.getByRole('grid')).toContainText('UNSAVED DRAFT');
});

test('Markdown viewer creates a new document without overwriting an existing file', async ({ page }) => {
  await run(page, 'MARKDOWN');
  const markdown = page.getByRole('region', { name: 'Markdownビューア', exact: true });
  await markdown.getByRole('button', { name: '新規作成', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Markdown文書を新規作成' });
  await expect(dialog.getByLabel('新しいMarkdownファイルの保存先')).toBeFocused();
  await dialog.getByLabel('新しいMarkdownファイルの保存先').fill('DOCS\\NEW-NOTE');
  await dialog.getByRole('button', { name: '作成して編集', exact: true }).click();

  const editor = page.getByRole('textbox', { name: 'Vimエディタ本文' });
  await expect(editor).toBeVisible();
  await editor.press('i'); await editor.fill('# New Note\n\nCreated in Markdown viewer.');
  await editor.press('Control+s');
  await page.getByRole('tab', { name: 'Markdownビューア', exact: true }).click();
  await expect(markdown.getByRole('heading', { name: 'New Note' })).toBeVisible();
  await expect(markdown.getByLabel('Markdownファイルのパス')).toHaveValue('C:\\DOCS\\NEW-NOTE.MD');

  await markdown.getByRole('button', { name: '新規作成', exact: true }).click();
  await page.getByRole('dialog').getByLabel('新しいMarkdownファイルの保存先').fill('C:\\DOCS\\NEW-NOTE.MD');
  await page.getByRole('dialog').getByRole('button', { name: '作成して編集', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('既に存在します');
});

test('paint uses themed confirmations for clearing, resizing and reloading, with safe keyboard cancellation', async ({ page }) => {
  const nativeDialogs: string[] = [];
  page.on('dialog', dialog => { nativeDialogs.push(dialog.message()); void dialog.dismiss(); });
  await run(page, 'PAINT CONFIRM.ASC');
  const paint = page.getByRole('region', { name: 'ASCIIペイント', exact: true });
  await expect(paint.getByRole('button', { name: '保存', exact: true })).toBeEnabled();
  const grid = paint.getByRole('grid');
  await grid.press('A');
  const clear = paint.getByRole('button', { name: '全消去', exact: true });
  const dialog = page.getByRole('dialog');
  await clear.click();
  await expect(dialog).toHaveAccessibleName('キャンバスの全消去');
  await expect(dialog.getByRole('button', { name: 'キャンセル', exact: true })).toBeFocused();
  await page.keyboard.press('Control+Tab');
  await expect(page.locator('.workspace-tab.active')).toContainText('ASCIIペイント');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(clear).toBeFocused();
  await expect(grid.getByRole('gridcell').first()).toHaveText('A');
  await clear.click(); await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0); await expect(grid.getByRole('gridcell').first()).toHaveText('A');
  await clear.click(); await dialog.getByRole('button', { name: '消去する', exact: true }).click();
  await expect(grid.getByRole('gridcell').first()).toHaveText(' ');
  await paint.getByRole('button', { name: '描画を戻す', exact: true }).click();
  await expect(grid.getByRole('gridcell').first()).toHaveText('A');

  const size = paint.getByLabel('キャンバスサイズ');
  await size.selectOption('60x24');
  await expect(dialog).toHaveAccessibleName('キャンバスのサイズ変更');
  await expect(dialog).toContainText('60列 × 24行');
  await dialog.getByRole('button', { name: 'キャンセル', exact: true }).click();
  await expect(size).toHaveValue('40x16');
  await size.selectOption('60x24');
  await dialog.getByRole('button', { name: '変更する', exact: true }).click();
  await expect(size).toHaveValue('60x24');
  await expect(grid.getByRole('gridcell')).toHaveCount(1440);
  await expect(grid.getByRole('gridcell').first()).toHaveText('A');

  await paint.getByRole('button', { name: '保存', exact: true }).click();
  await expect(paint.getByRole('status')).toContainText('保存しました');
  await grid.press('B');
  await paint.getByRole('button', { name: 'ファイルから再読込', exact: true }).click();
  await expect(dialog).toHaveAccessibleName('ファイルから再読込');
  await dialog.getByRole('button', { name: '確認を閉じる' }).click();
  await expect(grid.getByRole('gridcell').first()).toHaveText('B');
  await paint.getByRole('button', { name: 'ファイルから再読込', exact: true }).click();
  await dialog.getByRole('button', { name: '再読込する', exact: true }).click();
  await expect(grid.getByRole('gridcell').first()).toHaveText('A');

  await clear.click();
  await page.screenshot({ path: 'test-results/paint-confirm.png' });
  await page.keyboard.press('Escape');
  await run(page, 'SETTINGS');
  await page.getByLabel('配色', { exact: true }).selectOption('green');
  await page.getByRole('tab', { name: 'ASCIIペイント', exact: true }).click();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('.sidebar-toggle').click();
  await clear.click();
  await expect(dialog).toHaveCSS('background-color', 'rgb(12, 26, 17)');
  await expect(dialog.getByRole('button', { name: '消去する', exact: true })).toBeInViewport();
  await page.screenshot({ path: 'test-results/paint-confirm-mobile.png' });
  await page.keyboard.press('Escape');
  expect(nativeDialogs).toEqual([]);
});

test('settings persist and change colors, font, calendar and scrolling; system info reflects the drive', async ({ page }) => {
  await run(page, 'SETTINGS');
  const settings = page.getByRole('region', { name: '設定', exact: true });
  await settings.getByLabel('配色', { exact: true }).selectOption('amber');
  await settings.getByLabel('文字サイズ', { exact: true }).selectOption('16');
  await settings.getByLabel('カレンダーの週始まり').selectOption('1');
  await settings.getByRole('checkbox').uncheck();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'amber');
  await run(page, 'CALENDAR'); await expect(page.locator('.calendar-weekday').first()).toHaveText('月');
  await page.reload(); await run(page, 'SETTINGS');
  await expect(settings.getByLabel('配色', { exact: true })).toHaveValue('amber');
  await expect(settings.getByRole('checkbox')).not.toBeChecked();
  await run(page, 'HELP');
  await expect(page.getByRole('log')).toHaveCSS('font-size', '16px');
  await expect(page.getByRole('button', { name: '新しい出力', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '新しい出力', exact: true }).click();
  await expect.poll(() => page.getByRole('log').evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight)).toBeLessThan(2);
  await run(page, 'ECHO information-test > INFO.TXT'); await run(page, 'SYSINFO');
  const system = page.getByRole('region', { name: 'システム情報', exact: true });
  await expect(system).toContainText('Version 0.5.0');
  await expect(system.locator('.system-metrics').first()).toContainText('bytes');
  await expect(system).toContainText('46');
  await page.getByRole('tab', { name: '設定', exact: true }).click();
  await settings.getByRole('button', { name: '設定を初期値に戻す' }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'dos');
});

test('app windows and launcher remain usable on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('.sidebar-toggle').click();
  for (const [, name] of apps) {
    await page.getByRole('button', { name: 'プログラムを開く', exact: true }).click();
    await page.getByRole('menuitem', { name: new RegExp(name) }).click();
    const window = page.getByRole('region', { name, exact: true });
    await expect(window).toBeVisible();
    await expect(window.locator('.builtin-titlebar button')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  }
  await page.screenshot({ path: 'test-results/apps-mobile.png' });
});
