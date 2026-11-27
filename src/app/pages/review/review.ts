import { Component, computed, inject, input, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository, withReadings, type Proverb } from '../../data/content.repository';
import {
  FOCUS_LABEL,
  REVIEW_FORMAT,
  fingerprint,
  initials,
  reviewText,
  type Focus,
  type ReviewEntry,
  type ReviewFile,
  type Reviewer,
  type Verdict,
} from '../../data/review';
import { ReviewService } from '../../data/review.service';
import { SettingsService } from '../../data/settings.service';

interface Item {
  proverb: Proverb;
  fingerprint: string;
  /** The saved verdict, if it still matches the entry. */
  review?: ReviewEntry;
  /** A verdict was given, but the entry has changed since. */
  stale: boolean;
  columns: { trad: string; simp: string; jyutping?: string; pinyin?: string }[][];
}

const VERDICTS: { value: Verdict; mark: string; zh: string; en: string }[] = [
  { value: 'ok', mark: '✓', zh: '啱', en: 'OK' },
  { value: 'change', mark: '✎', zh: '要改', en: 'Change' },
  { value: 'unsure', mark: '?', zh: '唔肯定', en: 'Unsure' },
];

/** Splits a text into clauses of characters with both scripts and both readings. */
function columns(p: Proverb): Item['columns'] {
  const trad = withReadings(p.text_trad, p.jyutping);
  const simp = Array.from(p.text_simp);
  const pinyin = withReadings(p.text_trad, p.pinyin);
  const clauses: Item['columns'] = [[]];
  trad.forEach((c, i) => {
    clauses[clauses.length - 1].push({
      trad: c.char,
      simp: simp[i] ?? '',
      jyutping: c.reading,
      pinyin: pinyin[i]?.reading,
    });
    if (!c.reading && i < trad.length - 1) clauses.push([]);
  });
  return clauses;
}

/** For the content reviewer: every field of every entry, with a verdict to give on each. */
@Component({
  selector: 'app-review',
  imports: [RouterLink],
  templateUrl: './review.html',
  styleUrl: './review.scss',
})
export class ReviewPage {
  /** Lesson number from the URL; the first lesson with work left when absent. */
  readonly lesson = input<string>();

  private readonly content = inject(ContentRepository);
  private readonly reviews = inject(ReviewService);
  protected readonly settingsService = inject(SettingsService);
  protected readonly settings = this.settingsService.settings;
  protected readonly verdicts = VERDICTS;
  protected readonly focusOptions = Object.entries(FOCUS_LABEL) as [Focus, string][];
  protected readonly focus = computed(() => this.settings().reviewerFocus);
  protected readonly message = signal<{ text: string; error?: boolean } | undefined>(undefined);
  /** Entries whose comment box was opened before a verdict needing one was saved. */
  protected readonly editing = signal<ReadonlySet<string>>(new Set());

  private readonly data = resource({
    params: () => ({ revision: this.reviews.revision() }),
    loader: async () => {
      const [proverbs, lessons, reviews] = await Promise.all([
        this.content.allProverbs(),
        this.content.lessons(),
        this.reviews.all(),
      ]);
      const byId = new Map(reviews.map((r) => [r.proverb_id, r]));
      const items: Item[] = proverbs.map((p) => {
        const fp = fingerprint({ ...p, themes: p.themes?.split(',') ?? [] });
        const saved = byId.get(p.id);
        const current = saved?.fingerprint === fp ? saved : undefined;
        return {
          proverb: p,
          fingerprint: fp,
          review: current,
          stale: !!saved && !current,
          columns: columns(p),
        };
      });
      return { items, lessons, reviews };
    },
  });

  protected readonly error = this.data.error;
  private readonly themeNames = computed(
    () => new Map((this.content.allThemes.value() ?? []).map((t) => [t.id, t])),
  );

  protected readonly lessons = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    return d.lessons.map((l) => {
      const items = d.items.filter((i) => i.proverb.lesson_id === l.id);
      return {
        ...l,
        total: items.length,
        done: items.filter((i) => i.review || i.proverb.reviewed).length,
      };
    });
  });

  protected readonly currentLesson = computed(() => {
    const list = this.lessons();
    const wanted = Number(this.lesson());
    return list.find((l) => l.id === wanted) ?? list.find((l) => l.done < l.total) ?? list[0];
  });

  protected readonly items = computed(() => {
    const id = this.currentLesson()?.id;
    return (this.data.value()?.items ?? []).filter((i) => i.proverb.lesson_id === id);
  });

  protected readonly nextLesson = computed(() => {
    const list = this.lessons();
    const at = list.findIndex((l) => l.id === this.currentLesson()?.id);
    return list[at + 1];
  });

  protected readonly counts = computed(() => {
    const items = this.data.value()?.items ?? [];
    const count = (v: Verdict) => items.filter((i) => i.review?.verdict === v).length;
    return {
      total: items.length,
      ok: count('ok'),
      change: count('change'),
      unsure: count('unsure'),
      approved: items.filter((i) => i.proverb.reviewed).length,
      todo: items.filter((i) => !i.review && !i.proverb.reviewed).length,
    };
  });

  protected themeLabel(id: string): string {
    const t = this.themeNames().get(id);
    return t ? `${t.name_zh} ${t.name_en}` : id;
  }

  protected themesOf(p: Proverb): string[] {
    return p.themes?.split(',') ?? [];
  }

  protected showComment(item: Item): boolean {
    return (
      this.editing().has(item.proverb.id) ||
      (!!item.review && (item.review.verdict !== 'ok' || !!item.review.comment))
    );
  }

  protected async choose(item: Item, verdict: Verdict, comment: string) {
    if (item.review?.verdict === verdict) {
      // Tapping the chosen verdict again takes it back.
      await this.reviews.clear(item.proverb.id);
      return;
    }
    await this.reviews.save(item.proverb.id, verdict, comment.trim(), item.fingerprint);
    if (verdict !== 'ok') this.editing.update((s) => new Set(s).add(item.proverb.id));
  }

  protected async saveComment(item: Item, comment: string) {
    if (!item.review) return;
    if (comment.trim() === item.review.comment) return;
    await this.reviews.save(item.proverb.id, item.review.verdict, comment.trim(), item.fingerprint);
  }

  protected openComment(item: Item) {
    this.editing.update((s) => new Set(s).add(item.proverb.id));
  }

  /** Verdicts that still match their entries. */
  private current(): ReviewEntry[] {
    return (this.data.value()?.items ?? []).flatMap((i) => (i.review ? [i.review] : []));
  }

  /** The reviewer's profile, making their id on first use. */
  private async reviewer(): Promise<Reviewer> {
    let s = this.settings();
    if (!s.reviewerId) {
      await this.settingsService.set('reviewerId', crypto.randomUUID().slice(0, 8));
      s = this.settings();
    }
    return {
      id: s.reviewerId,
      name: s.reviewerName,
      credit: s.reviewerCredit,
      focus: s.reviewerFocus,
    };
  }

  /** False (with a message) when the reviewer hasn't said who they are. */
  private named(): boolean {
    if (this.settings().reviewerName.trim()) return true;
    this.message.set({
      text: 'Add your name above first, so we know whose verdicts these are.',
      error: true,
    });
    document.getElementById('reviewer-name')?.focus();
    return false;
  }

  private async exportedText(): Promise<string> {
    return reviewText({ reviewer: await this.reviewer(), entries: this.current() });
  }

  protected async setName(name: string) {
    const s = this.settings();
    const suggested = initials(s.reviewerName);
    if (!s.reviewerId)
      await this.settingsService.set('reviewerId', crypto.randomUUID().slice(0, 8));
    await this.settingsService.set('reviewerName', name.trim());
    // Keep the credit in step with the name until the reviewer edits it.
    if (!s.reviewerCredit || s.reviewerCredit === suggested) {
      await this.settingsService.set('reviewerCredit', initials(name));
    }
  }

  protected async copy() {
    if (!this.named()) return;
    const text = await this.exportedText();
    try {
      await navigator.clipboard.writeText(text);
      this.message.set({ text: 'Copied. Paste it into your chat with Claude.' });
    } catch {
      this.message.set({ text: 'Couldn’t copy. Use Download instead.', error: true });
    }
  }

  protected readonly canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  protected async share() {
    if (!this.named()) return;
    try {
      await navigator.share({ title: 'Worthy Words review', text: await this.exportedText() });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        this.message.set({ text: 'Couldn’t share. Use Copy instead.', error: true });
      }
    }
  }

  protected async download() {
    if (!this.named()) return;
    const file: ReviewFile = {
      format: REVIEW_FORMAT,
      version: 1,
      exported_at: new Date().toISOString(),
      reviewer: await this.reviewer(),
      entries: this.current(),
    };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `worthy-words-review-${file.exported_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.message.set({ text: 'Downloaded.' });
  }
}
