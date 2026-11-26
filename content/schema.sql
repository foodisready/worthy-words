-- Schema of content.db, the read-only lesson content built from content/*.yaml.
-- The app opens it as the main database and attaches the user's own database
-- as "user" (see src/app/data/user-migrations.ts).

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;

CREATE TABLE lessons (
  id       INTEGER PRIMARY KEY,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL
) STRICT;

CREATE TABLE themes (
  id       TEXT PRIMARY KEY,
  position INTEGER NOT NULL,
  name_zh  TEXT NOT NULL,
  name_en  TEXT NOT NULL
) STRICT;

CREATE TABLE proverbs (
  id                TEXT PRIMARY KEY,
  lesson_id         INTEGER NOT NULL REFERENCES lessons(id),
  position          INTEGER NOT NULL UNIQUE, -- order within the whole book
  text_trad         TEXT NOT NULL,
  text_simp         TEXT NOT NULL,
  pinyin            TEXT NOT NULL,           -- one syllable per Han character, tone marks
  jyutping          TEXT NOT NULL,           -- one syllable per Han character, tone numbers
  explain_cantonese TEXT NOT NULL,
  explain_standard  TEXT NOT NULL,
  en_natural        TEXT NOT NULL,
  en_literal        TEXT,
  en_equivalent     TEXT,
  context_note      TEXT,
  insight           TEXT,                    -- JSON, created at build time (Phase 2)
  reviewed          INTEGER NOT NULL,        -- 1 once a person has checked the entry
  search_text       TEXT NOT NULL            -- lower-case text for LIKE search
) STRICT;

CREATE INDEX proverbs_lesson ON proverbs (lesson_id, position);

CREATE TABLE proverb_themes (
  proverb_id TEXT NOT NULL REFERENCES proverbs(id),
  theme_id   TEXT NOT NULL REFERENCES themes(id),
  PRIMARY KEY (proverb_id, theme_id)
) STRICT, WITHOUT ROWID;

CREATE INDEX proverb_themes_theme ON proverb_themes (theme_id);
