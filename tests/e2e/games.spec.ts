import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const commandInput = (page: Page) => page.getByRole('combobox', { name: 'コマンド入力' });
async function run(page: Page, command: string) {
  await page.getByRole('tab', { name: 'ターミナル', exact: true }).click();
  await commandInput(page).fill(command); await commandInput(page).press('Enter');
}
test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('game creation consultation prompt copies from the library and command', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await run(page, 'GAMES');
  const library = page.getByRole('region', { name: 'プログラム一覧画面' });
  await library.getByRole('button', { name: 'ゲーム作成を相談' }).click();
  await expect(library.getByRole('status')).toContainText('ゲーム作成の相談用プロンプトをコピーしました');
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain('"format": 必ず "retrodos.game"');
  expect(prompt).toContain('最初からコードやJSONを出力しないでください');
  expect(prompt).toContain('v2 Webゲーム');
  expect(prompt).toContain('UIデザイン');

  await run(page, 'GAMEPROMPT');
  await expect(page.getByRole('log')).toContainText('ゲーム作成の相談用プロンプトをクリップボードにコピーしました');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(prompt);
});

test('five v0.5 games launch from commands and support keyboard play', async ({ page }) => {
  await run(page, 'SNAKE');
  const snake = page.getByRole('region', { name: 'SNAKEゲーム' });
  await expect(snake).toBeVisible(); await expect(page.getByLabel('SNAKE盤面')).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(snake.locator('.snake-head')).toHaveCount(1);
  await page.getByLabel('SNAKE盤面').press('Escape');

  await run(page, 'MINES');
  const mines = page.getByRole('region', { name: 'MINESゲーム' });
  await expect(page.getByRole('grid', { name: '地雷原' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(mines.locator('.mine-board .revealed').first()).toBeVisible();
  await mines.locator('.mine-board button:not(.revealed)').first().focus(); await page.keyboard.press('f');
  await expect(mines.getByRole('gridcell', { name: /旗/ })).toHaveCount(1);
  await page.getByRole('grid', { name: '地雷原' }).press('Escape');

  await run(page, 'TETRIS');
  const blocks = page.getByRole('region', { name: 'BLOCKSゲーム' });
  await expect(page.getByLabel('落ちものパズル盤面')).toBeFocused();
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Space');
  await expect(blocks.locator('.blocks-board .block').first()).toBeVisible();
  await page.getByLabel('落ちものパズル盤面').press('Escape');

  await run(page, 'ADV');
  const adventure = page.getByRole('region', { name: 'LOST TERMINAL テキストアドベンチャー' });
  await expect(adventure.getByRole('button', { name: /磁気カードを取る/ })).toBeFocused();
  await page.keyboard.press('1'); await expect(adventure).toContainText('ACCESS CARD');
  await page.keyboard.press('1'); await expect(adventure).toContainText('MISSION COMPLETE');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').scores?.adventure?.wins ?? 0)).toBe(1);
  await page.keyboard.press('Escape');

  await run(page, 'DUNGEON');
  const rogue = page.getByRole('region', { name: 'ROGUEゲーム' });
  await expect(page.getByLabel('ASCII地下迷宮')).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(rogue.locator('.rogue-hud')).toContainText('TURN 1');
  await page.getByLabel('ASCII地下迷宮').press('Escape');

  await run(page, 'GAMES');
  const library = page.getByRole('region', { name: 'プログラム一覧画面' });
  await expect(library.getByRole('article')).toHaveCount(6);
  await library.getByText('スコア・実績', { exact: false }).first().click();
  await expect(library.locator('.game-profile-summary')).toContainText('ADVENTURE');
  await expect(library.locator('.game-profile-summary')).toContainText('LOST NO MORE');
});

test('declarative game plugin imports, launches, persists and can be removed', async ({ page }) => {
  await run(page, 'GAMEIMPORT C:\\GAMES\\EXAMPLE.RGAME.JSON');
  await expect(page.getByRole('log')).toContainText('CAVE — HELLO CAVE');
  await run(page, 'GAMES');
  let library = page.getByRole('region', { name: 'プログラム一覧画面' });
  await expect(library.getByRole('article')).toHaveCount(7);
  await expect(library.getByRole('article', { name: /CAVE/ })).toContainText('ゲームプラグイン');

  await run(page, 'RUN CAVE');
  const game = page.getByRole('region', { name: 'HELLO CAVE テキストアドベンチャー' });
  await expect(game).toBeVisible(); await page.keyboard.press('1');
  await expect(game).toContainText('MISSION COMPLETE');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').scores?.['plugin.hello-cave']?.highScore ?? 0)).toBe(100);
  await page.reload(); await run(page, 'GAMES');
  library = page.getByRole('region', { name: 'プログラム一覧画面' });
  await expect(library.getByRole('article', { name: /CAVE/ })).toBeVisible();
  await expect(library.getByRole('article', { name: /CAVE/ }).locator('.program-score')).toContainText('HI 100');
  await library.getByRole('button', { name: 'HELLO CAVEを削除' }).click();
  await expect(library.getByRole('article')).toHaveCount(6);
  await run(page, 'RUN CAVE'); await expect(page.getByRole('log')).toContainText('プログラムが見つかりません');
});

test('web game plugin imports into a sandbox and reports score and achievements', async ({ page }) => {
  await run(page, 'GAMEIMPORT C:\\GAMES\\PIXEL.RGAME.JSON');
  await expect(page.getByRole('log')).toContainText('PIXEL — PIXEL CATCH');
  await run(page, 'RUN PIXEL');
  const game = page.getByRole('region', { name: 'PIXEL CATCH ゲームプラグイン' });
  await expect(game).toBeVisible();
  const frame = page.frameLocator('iframe[title="PIXEL CATCH ゲーム画面"]');
  const board = frame.getByLabel('PIXEL CATCH盤面');
  await expect(board).toBeFocused();
  await board.press('ArrowRight');
  await board.press('ArrowRight');
  await expect(frame.getByText('MISSION COMPLETE')).toBeVisible();
  await expect(game.getByRole('status')).toContainText('MISSION COMPLETE');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').scores?.['plugin.pixel-catch']?.highScore ?? 0)).toBe(100);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('retrodos.games.v1') ?? '{}').achievements?.some((item: { id?: string }) => item.id === 'first-star') ?? false)).toBe(true);
  const oldFrameUrl = await page.locator('iframe[title="PIXEL CATCH ゲーム画面"]').getAttribute('src');
  await game.getByRole('button', { name: 'もう一度' }).click();
  await expect(page.locator('iframe[title="PIXEL CATCH ゲーム画面"]')).not.toHaveAttribute('src', oldFrameUrl!);
  await expect(frame.getByText('ARROW KEYS: MOVE @ TO *')).toBeVisible();
  await board.press('Escape');
  await expect(page.getByRole('region', { name: 'ターミナル' })).toBeVisible();
});
