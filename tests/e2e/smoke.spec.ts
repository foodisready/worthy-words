import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
  await page
    .getByRole('link', { name: /課文|Lessons/ })
    .first()
    .click();
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

  await page
    .getByRole('link', { name: /收藏|Saved/ })
    .first()
    .click();
  await expect(page).toHaveURL(/saved$/);
  await expect(card(page, 'zgxw-002')).toBeVisible();
});

test('themes list their proverbs', async ({ page }) => {
  await page.goto('./themes');
  await page.locator('[data-theme="diligence-time"]').click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('勸學與惜時');
  await expect(card(page, 'zgxw-039')).toBeVisible();
});

test('the reading guide opens from a lesson and lists the six tones', async ({ page }) => {
  await page.goto('./lessons/1');
  await page.getByRole('link', { name: /How to read the pronunciation/ }).click();
  await expect(page).toHaveURL(/guide$/);
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('讀音');
  await expect(page.locator('tbody tr')).toHaveCount(6);
});

test('menu labels on phones follow the browser language and can be switched', async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Main' });
  // The test browser's language is English.
  await expect(nav.getByText('Today', { exact: true })).toBeVisible();
  await expect(nav.getByText('今日', { exact: true })).toBeHidden();

  await nav.getByRole('link', { name: /Settings/ }).click();
  await page.getByLabel('中文 今日').check();
  await expect(nav.getByText('今日', { exact: true })).toBeVisible();
  await expect(nav.getByText('Today', { exact: true })).toBeHidden();

  test.skip(browserName === 'webkit', NO_OPFS);
  await page.reload();
  await expect(nav.getByText('今日', { exact: true })).toBeVisible();
});

test('review: two reviewers’ verdicts combine, and the owner’s ✓ is required', async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName === 'webkit', NO_OPFS);

  /** Gives verdicts on lesson 1 as a named reviewer and returns the downloaded file. */
  async function review(
    p: Page,
    name: string,
    focus: RegExp,
    verdicts: [string, RegExp, string?][],
  ) {
    await p.goto('./review/1');
    await p.getByLabel('Your name').fill(name);
    await p.getByLabel('Your name').blur();
    await expect(p.getByLabel('Credit me as')).toHaveValue(
      name
        .split(' ')
        .map((w) => w[0] + '.')
        .join(''),
    );
    await p.getByLabel(focus).check();
    for (const [id, verdict, comment] of verdicts) {
      const entry = p.locator(`[data-review="${id}"]`);
      await entry.getByRole('button', { name: verdict }).click();
      await expect(entry.getByRole('button', { name: verdict })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      if (comment) {
        await entry.getByRole('textbox').fill(comment);
        await entry.getByRole('textbox').blur();
      }
    }
    const [download] = await Promise.all([
      p.waitForEvent('download'),
      p.getByRole('button', { name: /Download/ }).click(),
    ]);
    const file = testInfo.outputPath(`${name}.json`);
    await download.saveAs(file);
    return file;
  }
  const newPage = async () => (await browser.newContext()).newPage();

  // The owner: kept after a reload.
  await page.goto('./review/1');
  await page.getByRole('button', { name: /Download/ }).click();
  await expect(page.getByRole('status')).toContainText('Add your name');
  const owner = await review(page, 'Owen Wu', /both/, [
    ['zgxw-001', /OK/],
    ['zgxw-002', /Change/, '鑑 should be gaam3 in the notes too'],
  ]);
  // A comment typed just before switching apps is kept, without leaving the box.
  const box = page.locator('[data-review="zgxw-002"]').getByRole('textbox');
  await box.fill('鑑 should be gaam3 in the notes too, and in 鑑古');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(box).not.toBeFocused();
  // Coming back to /review opens the lesson with work left (lesson 1 here).
  await page.goto('./review');
  await expect(page.locator('[data-review="zgxw-002"]').getByRole('textbox')).toHaveValue(
    '鑑 should be gaam3 in the notes too, and in 鑑古',
  );

  // Other reviewers, each on their own device.
  const ann = await review(await newPage(), 'Ann Lee', /Cantonese/, [
    ['zgxw-001', /OK/],
    ['zgxw-002', /OK/],
    ['zgxw-003', /OK/],
  ]);
  const kit = await review(await newPage(), 'Kit Ho', /Cantonese/, [
    ['zgxw-001', /Unsure/, 'Is 鑑 right here?'],
  ]);
  const mei = await review(await newPage(), 'Mei Chan', /Mandarin/, [['zgxw-001', /OK/]]);

  const ownerId = JSON.parse(readFileSync(owner, 'utf8')).reviewer.id;
  const run = (...files: string[]) =>
    execFileSync(
      'node',
      ['scripts/content/apply-review.ts', '--dry-run', '--owner', ownerId, ...files],
      { encoding: 'utf8', env: { ...process.env, REVIEW_INBOX: testInfo.outputPath('inbox') } },
    );

  // Owner and a Cantonese reviewer aren't enough: a Mandarin ✓ is needed too.
  let output = run(owner, ann);
  expect(output).toContain('Would approve 0');
  expect(output).toMatch(/Waiting for a Mandarin reviewer’s ✓:\n {2}zgxw-001/);
  expect(output).toMatch(/zgxw-002 \(001\.yaml\) \(reviewers disagree/);
  expect(output).toContain('✎ Owen Wu (owner) [both]: 鑑 should be gaam3 in the notes too');
  expect(output).toMatch(/Waiting for the owner’s ✓:\n {2}zgxw-003/);

  // With a Mandarin ✓ it's approved, crediting everyone who reviewed it (Kit was unsure).
  output = run(owner, ann, kit, mei);
  expect(output).toContain('Would approve 1\n  zgxw-001: O.W., A.L., K.H., M.C.');
});

test('no page is wider than a small phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of [
    './',
    './lessons',
    './lessons/5',
    './themes',
    './themes/diligence-time',
    './saved',
    './settings',
    './guide',
    './review/5',
  ]) {
    await page.goto(path);
    await expect(page.locator('main h2').first()).toBeVisible();
    await expect(page.getByText('Loading…')).toHaveCount(0);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, path).toBeLessThanOrEqual(320);
  }
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

  await page
    .getByRole('link', { name: /收藏|Saved/ })
    .first()
    .click();
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
  // The service worker has downloaded content.db and the SQLite wasm (its
  // "content" group). Over a real network this takes a few seconds.
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          for (const name of await caches.keys()) {
            if (name.endsWith(':content:cache'))
              return (await (await caches.open(name)).keys()).length;
          }
          return 0;
        }),
      { timeout: 60_000 },
    )
    .toBe(2);
  await page.waitForTimeout(1000);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('app-proverb-card')).toHaveCount(4);
  // Pages not visited yet are cached too.
  await page
    .getByRole('link', { name: /主題|Themes/ })
    .first()
    .click();
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
