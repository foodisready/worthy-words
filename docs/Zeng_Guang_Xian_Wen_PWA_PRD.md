# Product Requirements Document: 賢文 · Worthy Words

**Version:** 2.0
**Date:** November 26, 2026
**Tech stack:** Angular (PWA), TypeScript, SQLite in the browser (`@sqlite.org/sqlite-wasm` on OPFS), Angular service worker, GitHub Pages
**Changes from 1.0:** product name; no backend; SQLite replaces LocalStorage/IndexedDB; reminders by calendar file instead of push; AI content created at build time plus optional bring-your-own-key (BYOK) Claude; content pipeline; licensing and funding.

---

## 1. Product overview

### 1.1 Name

**賢文 · Worthy Words**

- **賢文** is what readers already call the book, and the key word of its first line (昔時賢文，誨汝諄諄). Two characters fit under a phone icon.
- **Worthy Words** is a near-literal translation of 賢文 ("words of the worthy"), so English speakers can say it, search for it and share it.

| Where | Shows |
|---|---|
| Home-screen logo | 賢文 large, *Worthy Words* small beneath |
| Manifest `name` | `賢文 Worthy Words` |
| Manifest `short_name` | `賢文` |
| Repository and URL | `worthy-words` → `<owner>.github.io/worthy-words` (custom domain optional, later) |
| Page title | `賢文 Worthy Words: 增廣賢文 for everyday life` |

### 1.2 Vision

A free, open-source, offline-capable Progressive Web App that makes the classical primer 《增廣賢文》 accessible and practical for modern readers, through bite-sized **Daily Doses** and **On-Demand** exploration by lesson, theme and search.

### 1.3 Problem

Classical Chinese texts feel intimidating: archaic phrasing, dense formatting, and few resources that give clear colloquial explanations (Cantonese and standard written Chinese) alongside accurate English. Learners lack a distraction-free mobile experience that works offline and supports a daily habit.

### 1.4 Audience

- **Heritage and language learners:** Cantonese, Mandarin and English speakers learning traditional proverbs and idioms.
- **Lifelong learners and casual readers:** people who want daily wisdom or practical life advice in 2–3 minute sessions.
- **Educators and parents:** introducing classical Chinese moral philosophy and cultural literacy to students or children.

### 1.5 Principles

1. **Free for everyone, always.** No ads, no accounts, no paywalled features. Donations never unlock anything.
2. **No backend.** Served as static files from GitHub Pages. Running cost is $0.
3. **Private by default.** Progress, notes and keys stay on the device. Nothing is sent anywhere unless the user turns on BYOK AI, and then only to Anthropic.
4. **Works offline.** All lesson content is available without a connection after the first visit.
5. **Content is the product.** Accurate, reviewed text, readings and translations matter more than features.

---

## 2. Features

### 2.1 Daily Dose (habit and micro-learning)

- **Daily lesson:** a batch of thematically grouped proverbs (default 4), following the user's own sequential progress through the book.
- **Today's Proverb (今日金句)** on the home screen.
- **Streaks and progress:** consecutive days studied (in the user's local time zone) and percentage of the book completed.
- **Next lesson:** users who finish early can carry on to the next batch.
- **Daily reminder:** web push needs a server, and browsers have no reliable way to schedule local notifications. Instead, an **"Add a daily reminder to my calendar"** button downloads a repeating `.ics` event at the user's chosen time, linking back to the app. Works on every platform with no backend.

### 2.2 On-Demand exploration

- **Lesson reader:** the whole text in logical lessons (e.g. *Lesson 1: Opening & Time*, *Lesson 2: Friendship & Judging Character*).
- **Themes** (a proverb can belong to several):
  1. **處世與忍讓 (Conduct & Patience):** e.g. 「忍得一時之氣，免得百日之憂」
  2. **識人與交友 (Judging Character & Friendship):** e.g. 「路遙知馬力，日久見人心」
  3. **勸學與惜時 (Diligence & Cherishing Time):** e.g. 「一年之計在於春，一日之計在於晨」
  4. **修身與言語 (Self-Cultivation & Speech):** e.g. 「良藥苦口利於病，忠言逆耳利於行」
- **Search:** instant, on-device, across Traditional and Simplified Chinese, English, and pinyin/Jyutping typed without tones.

### 2.3 Proverb card

- **Original text (原文):** Traditional Chinese with optional Jyutping or Pinyin ruby annotations, plus a Simplified toggle.
- **Colloquial explanation (白話解釋):** Cantonese or standard written Chinese, covering the literal meaning and modern application.
- **English:** natural translation (primary), literal translation (toggle), and an equivalent English idiom where one exists.
- **Deeper insight** (created at build time, see 3.1): modern scenarios, common misreadings, related sayings, and discussion questions for parents and teachers.
- **Book context:** notes on origins and variants, and theme tags.
- **Actions:** bookmark, personal note, listen (text-to-speech), share as image.

### 2.4 Favourites and notes

Bookmark proverbs and attach personal reflections, stored on the device.

### 2.5 Data ownership

- **Export my data:** downloads the user's database file (progress, bookmarks, notes, settings; the API key is left out).
- **Import:** restores it on another device or browser. This is how people move devices without accounts.

---

## 3. AI features

### 3.1 Created at build time, for everyone (no key needed)

Claude drafts the **Deeper insight** content for every couplet during content production, using the Message Batches API. Every entry is reviewed by a person before it ships, and it is stored as ordinary static content.

- Everyone gets it, offline, with no key and no cost to them.
- Estimated one-time cost: about $10–20 for the whole book with the Batch API discount.
- Prompts and generation scripts live in the repository, so contributors can regenerate or improve entries.

### 3.2 Live AI with your own key (BYOK, optional)

For interactive features that can't be prepared ahead of time:

- **Ask about this proverb:** free-form questions and follow-ups on a card.
- **Situation matcher:** describe a real situation (e.g. "a coworker takes credit for my work") and get relevant proverbs with practical takeaways, grounded in the app's own content.

How it works:

- **Model:** Claude Haiku 5.5 (`claude-haiku-5-5`), $0.10 / $0.50 per million input/output tokens. A typical answer costs about $0.0005.
- **Direct from the browser:** the official Anthropic TypeScript SDK with `dangerouslyAllowBrowser: true`. The key belongs to the user and never leaves their device except to `api.anthropic.com`.
- **Setup:** Settings → AI → paste key. The app checks it with Anthropic before saving and never shows it again. **Check key** and **Remove** buttons.
- **Spending:** link to console.anthropic.com to set a monthly limit there; the app also shows an estimate of this month's spend and lets the user set its own cap.
- **What's sent:** only the question, the proverb(s) involved, and the few messages before it in the same conversation. Stated plainly in Settings.
- **Without a key:** the situation matcher falls back to matching themes and keywords against the content.

### 3.3 Security requirements (because a stolen key costs the user money)

- No third-party scripts, analytics or CDNs: everything is bundled.
- Strict Content Security Policy set by `<meta>` tag (GitHub Pages can't send headers), allowing network calls only to the app's own origin and `api.anthropic.com`.
- The key is stored in the user database, never in URLs or logs, and is excluded from data export.

---

## 4. Technical architecture

### 4.1 Frontend and PWA

- **Angular** (latest stable, standalone components, signals).
- **`@angular/pwa`:** `ngsw-config.json` pre-caches the app shell and `content.db`, so the app works 100% offline after the first visit.
- **Manifest:** names as in 1.1, icons, theme colours; installable on iOS, Android and desktop.
- **UI:** mobile-first, light/dark modes, adjustable font size, classic Chinese editorial look.
- **Text-to-speech:** Web Speech API with `zh-HK` and `zh-CN` voices where the device has them. Treated as an extra; the button is hidden when no voice is available.
- **Share image:** drawn in the browser with Canvas (classical text + English), no server.

### 4.2 Hosting and deployment

- **GitHub Pages**, deployed by GitHub Actions on every push to `main`.
- Built with `--base-href /worthy-words/`; `index.html` is copied to `404.html` so deep links work.
- The Actions workflow also validates content and builds `content.db` (see 5.2).

### 4.3 Storage: SQLite in the browser

- **`@sqlite.org/sqlite-wasm`** running in a Web Worker, using the **`opfs-sahpool`** storage option. GitHub Pages can't set the COOP/COEP headers that the default `opfs` option needs; `opfs-sahpool` doesn't need them and works in current Chrome, Edge, Firefox and Safari.
- **Two databases:**
  - **`content.db`** (read-only): built in CI from the content source files. Cached by the service worker and replaced when its version changes.
  - **`user.db`** (persistent, in OPFS): progress, streaks, bookmarks, notes, settings, the BYOK key and AI usage estimate. Versioned migrations.
  - `content.db` is attached to `user.db` so queries can join them.
- Call `navigator.storage.persist()` on first run. Safari may clear storage for sites not visited in 7 days; installed PWAs are exempt, so the app encourages installing.
- **Search:** SQLite's full-text search doesn't split Chinese into words, and its trigram option can't match queries under 3 characters. With about 400 couplets, `LIKE` over prepared columns (traditional, simplified, toneless pinyin, toneless Jyutping, English) is instant.

### 4.4 Data model (`content.db`)

```sql
CREATE TABLE lessons (
  id         INTEGER PRIMARY KEY,
  title_zh   TEXT NOT NULL,     -- 第一課：開篇與時間
  title_en   TEXT NOT NULL      -- Lesson 1: Opening & Time
);

CREATE TABLE themes (
  id         TEXT PRIMARY KEY,  -- 'diligence-time'
  name_zh    TEXT NOT NULL,     -- 勸學與惜時
  name_en    TEXT NOT NULL      -- Diligence & Cherishing Time
);

CREATE TABLE proverbs (
  id                TEXT PRIMARY KEY,   -- 'zgxw-001'
  lesson_id         INTEGER NOT NULL REFERENCES lessons(id),
  position          INTEGER NOT NULL,   -- order within the book
  text_trad         TEXT NOT NULL,
  text_simp         TEXT NOT NULL,
  pinyin            TEXT NOT NULL,      -- per character, tone marks, reviewed
  jyutping          TEXT NOT NULL,      -- per character, tone numbers, reviewed
  explain_cantonese TEXT NOT NULL,
  explain_standard  TEXT NOT NULL,
  en_natural        TEXT NOT NULL,
  en_literal        TEXT,
  en_equivalent     TEXT,               -- equivalent English idiom, if any
  context_note      TEXT,               -- origins, variants
  insight           TEXT,               -- JSON: scenarios, misreadings, related, questions
  search_text       TEXT NOT NULL       -- prepared at build time for LIKE search
);

CREATE TABLE proverb_themes (
  proverb_id TEXT REFERENCES proverbs(id),
  theme_id   TEXT REFERENCES themes(id),
  PRIMARY KEY (proverb_id, theme_id)
);
```

`user.db` holds `progress`, `streak_days`, `bookmarks`, `notes`, `settings`, and `ai_usage`, with a `schema_version` for migrations.

---

## 5. Content

### 5.1 Source and edition

《增廣賢文》 is in the public domain, but editions differ in order and wording. Pick one base edition, name it in the README, and record notable variants in `context_note`.

### 5.2 Pipeline

- **Source of truth:** one YAML file per lesson in `content/`, readable and editable by non-programmers through pull requests.
- **Validation:** CI checks every file against a schema (required fields, each pinyin/Jyutping syllable lines up with a character, valid theme IDs).
- **Build:** a script turns the YAML into `content.db` and a JSON copy.
- **Readings:** generated with `pinyin-pro` and `to-jyutping`, then reviewed by hand, especially characters with more than one reading.
- **Simplified text:** generated with OpenCC, then reviewed.
- **English:** written for this project, never adapted from published translations that may be copyrighted.
- **Review:** each entry has a `reviewed: true` flag; only reviewed entries ship in releases.

Example entry:

```yaml
- id: zgxw-001
  themes: [diligence-time]
  text_trad: 昔時賢文，誨汝諄諄。集韻增廣，多見多聞。
  explain_cantonese: 古代賢人寫下嘅智慧文章，誠懇咁教導大家。前人將呢啲押韻嘅格言收集起嚟並加以補充，希望後人可以藉此增廣見聞。
  explain_standard: 古代賢人寫下的智慧文章，誠懇地教導大家。前人將這些押韻的格言收集並加以補充，希望後人藉此增廣見聞。
  en_natural: Writings of ancient sages earnestly instruct you; collected, rhymed, and expanded to broaden what you see and hear.
  en_literal: Ancient worthy texts instruct you earnestly; collected rhymes expanded to see more and hear more.
  reviewed: false
```

---

## 6. User flows

### 6.1 First visit

1. Short introduction to 《增廣賢文》 with a sample proverb.
2. Choose explanation language (**廣東話白話** or **書面語白話**), reading aid (Jyutping, Pinyin or none) and English display.
3. Choose **Start Daily Dose (Lesson 1)** or **Browse by Theme**.
4. Offer to install the app and to add a calendar reminder (both skippable).

### 6.2 Daily loop

1. User opens the app (or taps the calendar reminder).
2. Home shows today's lesson, card by card or as a list.
3. User reads, optionally listens, bookmarks, adds a note or (with a key) asks a question.
4. **Complete Today's Lesson**, or **Continue to Next Lesson**.

---

## 7. Open source, licensing and funding

- **Code:** AGPL-3.0-only, so anyone can use and change it, and nobody can host a closed copy without sharing their changes.
- **Content** (translations, explanations, insights): CC BY-SA 4.0. The original text is public domain.
- **Donations:** a Stripe Payment Link (works on a static site) and GitHub Sponsors, shown in the README and the app's About page. Never a pop-up during a lesson. Voluntary; they buy nothing and unlock nothing.
- **Other income, later:** a printed 365-day proverb desk calendar or poster set (print-on-demand), lesson packs for schools and heritage-language programs, and workshops. Business plans are kept in a separate private repository, not this one.
- **Possible later:** a paid "no key needed" live AI plan would need a small server (relay holding a key, accounts, payments, usage limits). Only if users ask for it.

---

## 8. Success measures

The app has no analytics by design. Signals come from public sources:

- GitHub stars, forks, issues and content pull requests.
- Number of reviewed entries (goal: the whole book).
- Donations and sponsors.
- Offline reliability: 100% of lesson content available without a connection (tested in CI with Playwright).

---

## 9. Roadmap

- **Phase 0, foundations:** repository, Angular app with `@angular/pwa`, GitHub Actions deploy to Pages, content schema and pipeline producing `content.db`, SQLite worker with `opfs-sahpool`, `user.db` migrations.
- **Phase 1, MVP:** proverb card (ruby, language toggles), lesson reader, theme browser, Daily Dose, streaks and progress, bookmarks and notes, export/import, calendar reminder. **Lessons 1–10 fully reviewed.**
- **Phase 2, content and polish:** whole book reviewed, build-time Deeper insight for every entry, search, text-to-speech, donation links.
- **Phase 3, interactive:** BYOK Claude (Ask about this proverb, situation matcher), share images.

---

## 10. Open questions

1. Which base edition of the text?
2. Who reviews Cantonese explanations and Jyutping? (Ideally a native speaker other than the author.)
3. Custom domain, and is `worthy-words` free on GitHub?
4. Daily Dose size: fixed 4, or user-chosen (2/4/6)?
