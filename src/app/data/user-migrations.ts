// Migrations for the user's own database (user.db), attached as "user".
// Each entry runs once, in order, inside a transaction. Never change or remove
// a migration that has shipped: add a new one instead.
export const USER_MIGRATIONS: readonly string[] = [
  // 1: first schema
  `
  CREATE TABLE user.settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT;

  -- One row per proverb the user has finished.
  CREATE TABLE user.progress (
    proverb_id   TEXT PRIMARY KEY,
    completed_at TEXT NOT NULL            -- ISO 8601 timestamp
  ) STRICT;

  -- One row per local calendar day with study, for streaks.
  CREATE TABLE user.study_days (
    day TEXT PRIMARY KEY                  -- YYYY-MM-DD in the user's time zone
  ) STRICT;

  CREATE TABLE user.bookmarks (
    proverb_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE user.notes (
    proverb_id TEXT PRIMARY KEY,
    body       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;

  -- Estimated spend of the user's own Claude key, per month (Phase 3).
  CREATE TABLE user.ai_usage (
    month         TEXT PRIMARY KEY,       -- YYYY-MM
    requests      INTEGER NOT NULL,
    input_tokens  INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL
  ) STRICT;
  `,

  // 2: a reviewer's verdicts on lesson entries (the /review page)
  `
  CREATE TABLE user.reviews (
    proverb_id  TEXT PRIMARY KEY,
    verdict     TEXT NOT NULL CHECK (verdict IN ('ok', 'change', 'unsure')),
    comment     TEXT NOT NULL,
    fingerprint TEXT NOT NULL,            -- the entry as reviewed (src/app/data/review.ts)
    updated_at  TEXT NOT NULL
  ) STRICT;
  `,
];
