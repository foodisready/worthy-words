import { Injectable, effect, inject, signal } from '@angular/core';
import { DbService } from './db.service';

export interface Settings {
  /** Reading aid above each character. */
  reading: 'jyutping' | 'pinyin' | 'none';
  /** Characters for the original text. */
  script: 'trad' | 'simp';
  /** Language of the plain explanation. */
  explanation: 'cantonese' | 'standard';
  /** Show the word-for-word English under the natural translation. */
  showLiteral: boolean;
  textSize: 'normal' | 'large' | 'larger';
  /** Labels under the menu icons on phones (wider screens show both). */
  menuLabels: 'zh' | 'en';
  /** Daily reminder time, HH:MM. */
  reminderTime: string;
  /** The first-visit welcome has been dismissed. */
  welcomed: boolean;
  /** The content reviewer's profile, for the /review page. The id is made on first use. */
  reviewerId: string;
  reviewerName: string;
  /** How to credit them in the app; empty for no credit. */
  reviewerCredit: string;
  reviewerFocus: 'cantonese' | 'mandarin' | 'both';
}

export const DEFAULT_SETTINGS: Settings = {
  reading: 'jyutping',
  script: 'trad',
  explanation: 'cantonese',
  showLiteral: false,
  textSize: 'normal',
  menuLabels: prefersChinese() ? 'zh' : 'en',
  reminderTime: '08:00',
  welcomed: false,
  reviewerId: '',
  reviewerName: '',
  reviewerCredit: '',
  reviewerFocus: 'both',
};

/** True when the browser's preferred languages start with Chinese. */
function prefersChinese(): boolean {
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages;
  return /^(zh|yue)\b/i.test(languages[0] ?? '');
}

const TEXT_SCALE: Record<Settings['textSize'], string> = {
  normal: '1',
  large: '1.15',
  larger: '1.3',
};

/** The user's preferences, kept in user.settings (one row per key, JSON values). */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly db = inject(DbService);
  private readonly state = signal<Settings>(DEFAULT_SETTINGS);

  readonly settings = this.state.asReadonly();
  /** True once saved settings have been read. */
  readonly loaded = signal(false);
  /** Settings changed while saved ones were being read: these keep the newer value. */
  private readonly changedDuringLoad = new Set<keyof Settings>();
  private loading = false;

  constructor() {
    void this.load();
    effect(() => {
      document.documentElement.style.setProperty('--text-scale', TEXT_SCALE[this.state().textSize]);
    });
  }

  /** Reads saved settings again (after importing a backup). */
  async load(): Promise<void> {
    this.loading = true;
    this.changedDuringLoad.clear();
    try {
      const rows = await this.db.query<{ key: string; value: string }>(
        'SELECT key, value FROM user.settings',
      );
      const saved: Partial<Record<string, unknown>> = {};
      for (const { key, value } of rows) {
        if (!(key in DEFAULT_SETTINGS)) continue;
        try {
          const parsed: unknown = JSON.parse(value);
          const fallback = DEFAULT_SETTINGS[key as keyof Settings];
          if (typeof parsed === typeof fallback) saved[key] = parsed;
        } catch {
          // Ignore a damaged value and keep the default.
        }
      }
      this.state.update((current) => {
        const next = { ...DEFAULT_SETTINGS, ...saved } as Settings;
        for (const key of this.changedDuringLoad) {
          (next as unknown as Record<string, unknown>)[key] = current[key];
        }
        return next;
      });
    } catch {
      // The database couldn't open; the app shows why. Keep the defaults.
    } finally {
      this.loading = false;
      this.loaded.set(true);
    }
  }

  async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    if (this.loading) this.changedDuringLoad.add(key);
    this.state.update((s) => ({ ...s, [key]: value }));
    await this.db.exec(
      `INSERT INTO user.settings (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(value)],
    );
  }
}
