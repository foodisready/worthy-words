import { expect, test, type Page } from '@playwright/test';

const firstCard = (page: Page) => page.locator('[data-proverb="zgxw-001"]');

// Playwright's WebKit build has no OPFS (even navigator.storage.getDirectory()
// fails), so saving can't be tested there. Real Safari 17+ has it: check saving
// on a real iPhone or Mac.
const NO_OPFS = 'Playwright WebKit has no OPFS';

test('shows lesson content from content.db', async ({ page, browserName }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('賢文');
  await expect(firstCard(page)).toContainText('昔');
  await expect(firstCard(page).locator('rt').first()).toHaveText('sik1');

  await page.getByLabel('拼音 Pinyin').check();
  await expect(firstCard(page).locator('rt').first()).toHaveText('xī');

  if (browserName === 'webkit') {
    // No OPFS here: the app still works and says it can't save.
    await expect(page.getByRole('status')).toContainText("can't save");
  } else {
    // Saving works: no "won't be saved" notice.
    await expect(page.getByRole('status')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('a bookmark is still there after reloading', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', NO_OPFS);
  await page.goto('./');
  const button = firstCard(page).getByRole('button');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(firstCard(page).getByRole('button')).toHaveAttribute('aria-pressed', 'true');
});

test('links into the app work (404.html fallback)', async ({ page }) => {
  await page.goto('./some/deep/link');
  await expect(firstCard(page)).toContainText('昔');
});

test('works offline once loaded', async ({ page, context }) => {
  await page.goto('./');
  await expect(firstCard(page)).toContainText('昔');
  // Wait until the service worker controls the page and has cached everything.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve),
      );
    }
  });
  await expect
    .poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 30_000 })
    .toBeGreaterThan(0);
  await page.waitForTimeout(1000);

  await context.setOffline(true);
  await page.reload();
  await expect(firstCard(page)).toContainText('昔');
  await expect(page.locator('[data-proverb]')).toHaveCount(5);
});

test('a second tab still works, and says it will not save', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName === 'webkit', NO_OPFS);
  await page.goto('./');
  await expect(firstCard(page)).toContainText('昔');

  const second = await context.newPage();
  await second.goto('./');
  await expect(firstCard(second)).toContainText('昔');
  await expect(second.getByRole('status')).toContainText('open in another tab');
});
