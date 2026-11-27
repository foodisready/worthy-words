# 賢文 · Worthy Words

A free, open-source app for learning 《增廣賢文》 (*Zeng Guang Xian Wen*), the classical Chinese book of proverbs, and using its wisdom in everyday life.

- Short daily lessons, or explore by lesson, theme and search
- Every proverb with Jyutping or Pinyin, a plain explanation in Cantonese or standard written Chinese, and English
- Works offline once installed, on phones and computers
- No account and no ads. Your progress stays on your device

**Try it: <https://foodisready.github.io/worthy-words/>**

> Work in progress: lesson content is still being reviewed, and entries marked 草稿 Draft haven't been checked yet. See the [product plan](docs/Zeng_Guang_Xian_Wen_PWA_PRD.md).

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
2. `npm run content:fill` adds simplified text, Pinyin and Jyutping to new entries.
3. `npm run content:readings` lists every reading to check: characters whose reading depends on meaning, characters with both a colloquial (白讀) and a literary (文讀) Cantonese reading, and hand corrections. Pinyin uses dictionary tones (一 yī, 不 bù, no tone changes). Jyutping follows everyday Hong Kong speech, word by word: 有錢 cin2 and 行 haang4, but 錢財 cin4 and 成陰 sing4.
4. `npm run content:check` reports any problems, including text that doesn't match the source lines an entry names (`content/source/`).
5. Set `reviewed: true` only once a person has checked the whole entry.

## License

- Code: [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only)
- Translations, explanations and other written content: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- The original text of 《增廣賢文》 is in the public domain
