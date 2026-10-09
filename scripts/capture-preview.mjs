import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const outputDirectory = new URL('../docs/screenshots/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1180, height: 780 } });
  await page.goto('http://127.0.0.1:1420');
  await page.getByRole('combobox', { name: 'コマンド入力' }).waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('terminal.png', outputDirectory)), fullPage: true });
  await page.locator('.command-item').filter({ hasText: 'TYPE' }).click();
  await page.screenshot({ path: fileURLToPath(new URL('command-guide.png', outputDirectory)), fullPage: true });
  await page.getByRole('navigation', { name: 'ワークスペース' }).getByRole('button', { name: 'ゲームライブラリ' }).click();
  await page.screenshot({ path: fileURLToPath(new URL('game-library.png', outputDirectory)), fullPage: true });
  await page.getByRole('button', { name: '起動', exact: true }).click();
  await page.getByRole('spinbutton').waitFor();
  await page.screenshot({ path: fileURLToPath(new URL('guess.png', outputDirectory)), fullPage: true });
  await page.getByRole('button', { name: 'ターミナルへ戻る' }).click();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('.sidebar-toggle').click();
  await page.screenshot({ path: fileURLToPath(new URL('mobile.png', outputDirectory)), fullPage: true });
  console.log('Saved 5 screenshots to docs/screenshots.');
} finally { await browser.close(); }
