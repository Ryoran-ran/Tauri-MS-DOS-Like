import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
async function run(page: Page, command: string) {
  await page.getByRole('tab', { name: 'ターミナル', exact: true }).click();
  const input = page.getByRole('combobox', { name: 'コマンド入力' });
  await input.fill(command); await input.press('Enter');
}
test('DOS manager explains the desktop requirement and commands fail clearly in a browser', async ({ page }) => {
  await page.goto('/'); await run(page, 'DOSBOX');
  const manager = page.getByRole('region', { name: 'DOSゲーム管理', exact: true });
  await expect(manager).toContainText('Windowsデスクトップ版で利用できます');
  await page.keyboard.press('Control+w'); await run(page, 'DOSRUN DOS_TEST');
  await expect(page.getByRole('log')).toContainText('DOSBox連携はWindowsデスクトップ版で利用できます');
});
test('Escape exits fullscreen and Ctrl+W closes the active app independently', async ({ page }) => {
  await page.goto('/'); await run(page, 'SETTINGS');
  const settings = page.getByRole('region', { name: '設定', exact: true });
  await page.getByRole('button', { name: '全画面表示', exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await expect(settings).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settings).toBeVisible();
  await page.keyboard.press('F11');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('Control+w');
  await expect(settings).toBeHidden();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await page.keyboard.press('Control+w');
  await expect(page.getByRole('region', { name: 'ターミナル' })).toBeVisible();
  await run(page, 'FULLSCREEN ON');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await run(page, 'FS OFF');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
});
test('startup sound settings persist, preview plays, and reset restores the quiet default', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await run(page, 'SETTINGS');
  const settings = page.getByRole('region', { name: '設定', exact: true });
  await settings.getByRole('checkbox', { name: '起動音を鳴らす' }).check();
  await settings.getByRole('slider', { name: '起動音の音量' }).fill('40');
  await settings.getByRole('button', { name: '起動音を試聴' }).click();
  await expect(settings.getByRole('button', { name: '起動音を試聴' })).toBeEnabled();
  await expect(settings.getByRole('alert')).toHaveCount(0);
  await page.reload(); await run(page, 'SETTINGS');
  await expect(settings.getByRole('checkbox', { name: '起動音を鳴らす' })).toBeChecked();
  await expect(settings.getByRole('slider', { name: '起動音の音量' })).toHaveValue('40');
  await settings.getByRole('button', { name: '設定を初期値に戻す' }).click();
  await expect(settings.getByRole('checkbox', { name: '起動音を鳴らす' })).not.toBeChecked();
  await expect(settings.getByRole('slider', { name: '起動音の音量' })).toHaveValue('25'); expect(errors).toEqual([]);
});
