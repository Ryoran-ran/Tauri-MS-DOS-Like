import { expect, test } from '@playwright/test';

for (const width of [1180, 800, 375]) {
  test(`command names stay separate from descriptions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/');
    if (width <= 720) await page.locator('.sidebar-toggle').click();

    await expect(page.locator('.command-item').first()).toBeVisible();
    const overlaps = await page.locator('.command-item').evaluateAll(items => items.flatMap(item => {
      const code = item.querySelector('code');
      const description = item.querySelector('span');
      if (!code || !description) return [];
      const name = code.textContent ?? '';
      const codeBox = code.getBoundingClientRect();
      const descriptionBox = description.getBoundingClientRect();
      const separated = codeBox.right + 2 <= descriptionBox.left || codeBox.bottom <= descriptionBox.top;
      const codeFits = code.scrollWidth <= code.clientWidth + 1;
      const descriptionFits = description.scrollWidth <= description.clientWidth + 1;
      return separated && codeFits && descriptionFits ? [] : [name];
    }));
    expect(overlaps).toEqual([]);
  });
}
