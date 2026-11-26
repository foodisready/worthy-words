# 賢文 · Worthy Words

A free, open-source app for learning 《增廣賢文》 (*Zeng Guang Xian Wen*), the classical Chinese book of proverbs, and using its wisdom in everyday life.

- Short daily lessons, or explore by lesson, theme and search
- Every proverb with Jyutping or Pinyin, a plain explanation in Cantonese or standard written Chinese, and English
- Works offline once installed, on phones and computers
- No account and no ads. Your progress stays on your device

> Work in progress. See the [product plan](docs/Zeng_Guang_Xian_Wen_PWA_PRD.md).

## Development

Needs Node.js 24.

```bash
npm install
npm start                # build the content, then run the app at http://localhost:4200
npm test                 # unit tests
npm run build:pages      # production build for GitHub Pages, in dist/
npx playwright test      # browser tests against the Pages build (run build:pages first)
```

How it fits together:

- `content/` holds the lessons as YAML, one file per lesson, and `schema.sql` for the database they become.
- `npm run content:build` turns them into `public/data/content.db`, a read-only SQLite database the app downloads and keeps for offline use.
- The app runs SQLite in a Web Worker (`src/app/data/db.worker.ts`). Each person's progress, bookmarks and notes go in a second database kept in their browser.
- `.github/workflows/ci.yml` checks the content, runs the tests and builds the site on every push.

## Adding or improving content

1. Edit or add a file in `content/lessons/`.
2. `npm run content:fill` adds simplified text, Pinyin and Jyutping to new entries. Check them by hand: tools often get characters with more than one reading wrong.
3. `npm run content:check` reports any problems.
4. Set `reviewed: true` only once a person has checked the whole entry.

## License

- Code: [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only)
- Translations, explanations and other written content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- The original text of 《增廣賢文》 is in the public domain
