import { expect, test, type Page } from '@playwright/test';

const card = (page: Page, id: string) => page.locator(`app-proverb-card[data-proverb="${id}"]`);
const dailyDose = (page: Page) => page.locator('ol[aria-labelledby="daily-dose"]');

// Playwright's WebKit build has no OPFS (even navigator.storage.getDirectory()
// fails), so saving can't be tested there. Real Safari 17+ has it: check saving
// on a real iPhone or Mac.
const NO_OPFS = 'Playwright WebKit has no OPFS';

test('a lesson shows content from content.db, with reading and script switches', async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  // Start at the root: opening /lessons/1 directly is served by GitHub Pages'
  // 404.html fallback, which logs a 404 (tested separately below).
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('賢文');
  await page.getByRole('link', { name: /課文/ }).first().click();
  await page.locator('[data-lesson="1"]').click();
  const first = card(page, 'zgxw-001');
  await expect(first).toContainText('昔');
  await expect(first.locator('rt').first()).toHaveText('sik1');

  await page.getByRole('radio', { name: '拼音 Pinyin' }).click();
  await expect(first.locator('rt').first()).toHaveText('xī');
  await page.getByRole('radio', { name: '简体 Simplified' }).click();
  await expect(first.locator('.original')).toContainText('时');
  await page.getByRole('radio', { name: '書面語解釋 Written Chinese explanation' }).click();
  await expect(first.locator('.explain')).toContainText('古代賢人留下的格言');

  await expect(page.locator('app-proverb-card')).toHaveCount(4);
  await page.getByRole('link', { name: /下一課 Next/ }).click();
  await expect(page).toHaveURL(/lessons\/2$/);
  await expect(card(page, 'zgxw-005')).toBeVisible();

  if (browserName === 'webkit') {
    // No OPFS here: the app still works and says it can't save.
    await expect(page.locator('app-root > .notice')).toContainText("can't save");
  } else {
    await expect(page.locator('app-root > .notice')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('Daily Dose: complete today’s lesson, keep the streak after reloading', async ({
  page,
  browserName,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  await page.getByRole('button', { name: /Start/ }).click();
  await expect(page.getByRole('heading', { name: /Welcome/ })).toHaveCount(0);

  await expect(dailyDose(page).locator('app-proverb-card')).toHaveCount(4);
  await expect(card(dailyDose(page), 'zgxw-001')).toBeVisible();
  await expect(page.locator('[data-stat="streak"]')).toHaveText('0');

  await page.getByRole('button', { name: /Complete today's lesson/ }).click();
  await expect(page.getByText('Done for today')).toBeVisible();
  await expect(page.locator('[data-stat="streak"]')).toHaveText('1');
  await expect(page.locator('[data-stat="completed"]')).toContainText('4');

  await page.getByRole('button', { name: /Continue to the next lesson/ }).click();
  await expect(card(dailyDose(page), 'zgxw-005')).toBeVisible();

  test.skip(browserName === 'webkit', NO_OPFS);
  await page.reload();
  await expect(page.getByText('Done for today')).toBeVisible();
  await expect(page.locator('[data-stat="streak"]')).toHaveText('1');
  await page.goto('./lessons');
  await expect(page.locator('[data-lesson="1"] .count')).toHaveText('✓');
});

test('bookmarks and notes are kept, and listed under Saved', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', NO_OPFS);
  await page.goto('./lessons/1');
  const second = card(page, 'zgxw-002');
  const bookmark = second.getByRole('button', { name: /Save/ });
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await bookmark.click();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');

  await second.getByRole('button', { name: /Note/ }).click();
  await second.getByLabel('My note').fill('以史為鏡');
  await second.getByRole('button', { name: /Save note/ }).click();
  await expect(second.locator('.note')).toContainText('以史為鏡');

  await page.reload();
  await expect(card(page, 'zgxw-002').getByRole('button', { name: /Saved/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(card(page, 'zgxw-002').locator('.note')).toContainText('以史為鏡');

  await page.getByRole('link', { name: /收藏/ }).first().click();
  await expect(page).toHaveURL(/saved$/);
  await expect(card(page, 'zgxw-002')).toBeVisible();
});

test('themes list their proverbs', async ({ page }) => {
  await page.goto('./themes');
  await page.locator('[data-theme="diligence-time"]').click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('勸學與惜時');
  await expect(card(page, 'zgxw-039')).toBeVisible();
});

test('export, import and the calendar reminder download files', async ({ page }) => {
  await page.goto('./settings');

  const [reminder] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Add to my calendar/ }).click(),
  ]);
  expect(reminder.suggestedFilename()).toBe('worthy-words-reminder.ics');
  const ics = await (await reminder.createReadStream()).toArray();
  expect(Buffer.concat(ics).toString()).toContain('RRULE:FREQ=DAILY');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'worthy-words-backup',
        version: 1,
        exported_at: '2026-11-25T00:00:00.000Z',
        settings: [{ key: 'welcomed', value: 'true' }],
        progress: [{ proverb_id: 'zgxw-003', completed_at: '2026-11-25T00:00:00.000Z' }],
        study_days: [{ day: '2026-11-25' }],
        bookmarks: [{ proverb_id: 'zgxw-010', created_at: '2026-11-25T00:00:00.000Z' }],
        notes: [],
      }),
    ),
  });
  await expect(page.getByRole('status').last()).toContainText('Imported 1 learned proverbs');

  const [backup] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export/ }).click(),
  ]);
  const json = JSON.parse(
    Buffer.concat(await (await backup.createReadStream()).toArray()).toString(),
  );
  expect(json.format).toBe('worthy-words-backup');
  expect(json.bookmarks.map((b: { proverb_id: string }) => b.proverb_id)).toContain('zgxw-010');

  await page.getByRole('link', { name: /收藏/ }).first().click();
  await expect(card(page, 'zgxw-010')).toBeVisible();
});

test('links into the app work (404.html fallback)', async ({ page }) => {
  await page.goto('./lessons/3');
  await expect(card(page, 'zgxw-009')).toBeVisible();
  await page.goto('./some/deep/link');
  await expect(page.getByRole('heading', { name: /Today's lesson/ })).toBeVisible();
});

test('works offline once loaded', async ({ page, context }) => {
  await page.goto('./lessons/1');
  await expect(card(page, 'zgxw-001')).toContainText('昔');
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
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('app-proverb-card')).toHaveCount(4);
  // Pages not visited yet are cached too.
  await page.getByRole('link', { name: /主題/ }).first().click();
  await expect(page.locator('[data-theme]')).toHaveCount(4);
});

test('a second tab still works, and says it will not save', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName === 'webkit', NO_OPFS);
  await page.goto('./lessons/1');
  await expect(card(page, 'zgxw-001')).toContainText('昔');

  const second = await context.newPage();
  await second.goto('./lessons/1');
  await expect(card(second, 'zgxw-001')).toContainText('昔');
  await expect(second.locator('app-root > .notice')).toContainText('open in another tab');
});
