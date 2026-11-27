# Working on 賢文 Worthy Words

## Keep the record current

- When the owner decides something (content, readings, review rules, app behaviour, scope), add it to `docs/decisions.md` in the same piece of work: the date, what was decided and why. Move answered items out of "Open questions" and add new questions there.
- Before finishing a piece of work, check whether it changed a decision, the phase status in the README, or the [product plan](docs/Zeng_Guang_Xian_Wen_PWA_PRD.md), and update them.

## Content rules

- Never set `reviewed: true` or `reviewed_by` by hand. They come only from `npm run content:apply-review`: the owner's ✓, at least one other ✓, at least one ✓ from a reviewer checking Mandarin, and no open ✎.
- Changing a reviewed entry's text, readings, explanations, English, notes or themes needs a new review: set `reviewed: false` and remove `reviewed_by`.
- Jyutping follows everyday Hong Kong speech, word by word (see `docs/readings.md`). Pinyin uses dictionary tones. List doubtful readings as open questions for the owner rather than deciding them.
- Reviewers' names, comments and verdict files stay in `content/review/inbox/` (not in git). Never commit them or quote them in public files, issues or commit messages.

## Checks before committing

- `npm run content:check` after content changes.
- `npm test`, `npm run test:scripts`, `npm run typecheck:scripts`, and `npm run build:pages && npx playwright test --project chromium`.
- `npx prettier --check src scripts tests`.
