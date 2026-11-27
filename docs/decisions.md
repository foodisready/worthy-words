# Decision log

What was decided, when and why, so the reasoning isn't lost between working sessions. Newest first. The [product plan](Zeng_Guang_Xian_Wen_PWA_PRD.md) has the full design; the git history has the details of each change.

## Open questions

- **近** in 近水知魚性 and 近水樓臺先得月: gan6 (current) or kan5?
- **阿魏** in 黃芩無假，阿魏無真: aa3 (current) or o1?

## 2026-11-27

### Reviewing content

- **Several reviewers, one owner.** Up to five Cantonese and three Mandarin speakers will review, alongside the project owner. Reviewers use the in-app [審稿 Review](https://foodisready.github.io/worthy-words/review) page and send their verdicts (Copy, Share or Download) to the owner.
- **When an entry is approved:** the owner marked it ✓, at least one other reviewer marked it ✓, at least one of those checks Mandarin (Mandarin or both), and nobody has an open ✎ Change. Only then does `npm run content:apply-review` set `reviewed: true`. Nobody marks entries reviewed by hand.
  _Why:_ the owner is the editor and has the final say; a Mandarin reviewer confirms the 書面語 explanation and Pinyin, which a Cantonese reviewer may not check as closely. Disagreements go to the owner rather than a vote, because readings like 文讀 vs 白讀 are judgement calls.
- **Verdicts are tied to what the reviewer saw.** Each verdict carries a fingerprint of the entry; if the entry changes later, the verdict no longer counts and the entry needs fresh ✓s.
- **Credit:** everyone who gave any verdict on an entry (✓, ✎ or ?) is credited in `reviewed_by`, shown on the card and in Settings → About. Each reviewer chooses how: initials suggested, full name, or none.
  _Why:_ the site and its history are public and permanent, so each person decides how visible they are; finding a mistake deserves credit as much as approving the fix.
- **Editing an approved entry sends it back for review** (`reviewed: false`, credits removed), so the approval always matches what readers see.
- **Reviewers' files stay private.** Submissions are kept in `content/review/inbox/`, which is not in git (names and comments).
- **Suggested split:** each lesson gets the owner, two Cantonese reviewers and one Mandarin reviewer, rotating, rather than everyone reviewing everything.

### Readings and text

- **Jyutping follows everyday Hong Kong speech, word by word**, not blanket literary (文讀) or colloquial (白讀) readings: 有錢 cin2, 行 haang4, but 錢財 cin4 and 成陰 sing4. See the [readings guide](readings.md).
- **教 meaning "let, cause" is jiāo / gaau1**, not gaau3: the metre of 豈可教人枉度春 and 風流浪子莫教貧 needs a level tone there, and the 《廣韻》 agrees.
- **紅粉佳人休使老 keeps 使**, not 便: every edition checked has 使, and 休使 pairs with 莫教 ("don't let").
- **Pinyin uses dictionary tones**, with no tone sandhi written (一 yī, 不 bù).

### App

- **The bottom menu stays fixed** on phones rather than hiding on scroll: it's the convention, lessons are short, and a hiding bar jumps and fights the browser's own toolbar.
- **Menu labels in English or Chinese** on phones (Settings → Menu labels), defaulting from the browser's language; the character icons (日 課 題 藏 設) stay.
- **Browser page translation is turned off.** Chrome was replacing the Chinese explanations with machine English, which made them look missing; the app already shows Chinese and English side by side.
- **Search moves to Phase 2.** No pagination for the lesson list: the whole book is small. A "continue" button and grouped sections come once there are more than about 20 lessons.
- **An in-app reading guide** (讀音, `/guide`) explains the Jyutping tone numbers, linked from a "?" beside the display switches.

## 2026-11-26

- **Name:** 賢文 · Worthy Words.
- **No backend:** GitHub Pages, SQLite in the browser (sqlite-wasm with OPFS). _Why:_ no running cost, free for everyone, works offline.
- **AI:** "Deeper insight" content is drafted with Claude at build time and reviewed like everything else; live AI only with the user's own Claude key (Phase 3).
- **Licences:** code AGPL-3.0, written content CC BY-SA 4.0; the original text is public domain.
- **Base text:** the common edition (通行本), with variants noted in each entry's notes.
- **Repository public and live** on GitHub Pages (needed for free Pages hosting), keeping the `foodisready` account so the address and users' saved data stay put. Commit history uses the GitHub no-reply email address.
- **Donations** via GitHub Sponsors and Stripe (Phase 2).
