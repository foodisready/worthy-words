import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository, type Proverb, withReadings } from '../../data/content.repository';
import { SettingsService } from '../../data/settings.service';

/** One proverb: the original with its reading, explanation, English, and the user's actions. */
@Component({
  selector: 'app-proverb-card',
  imports: [RouterLink],
  templateUrl: './proverb-card.html',
  styleUrl: './proverb-card.scss',
  host: { '[attr.data-proverb]': 'proverb().id' },
})
export class ProverbCard {
  private readonly content = inject(ContentRepository);
  protected readonly settings = inject(SettingsService).settings;

  readonly proverb = input.required<Proverb>();
  /** Show which lesson the proverb is from (outside the lesson reader). */
  readonly showLesson = input(false);

  protected readonly bookmarked = linkedSignal(() => !!this.proverb().bookmarked);
  protected readonly note = linkedSignal(() => this.proverb().note ?? '');
  protected readonly editingNote = signal(false);
  protected readonly noteError = signal<string | undefined>(undefined);

  protected readonly characters = computed(() => {
    const p = this.proverb();
    const { reading, script } = this.settings();
    const text = script === 'simp' ? p.text_simp : p.text_trad;
    // Group by clause, each ending with its punctuation, so lines break only
    // between clauses.
    const clauses: { char: string; reading?: string }[][] = [[]];
    for (const c of withReadings(text, reading === 'pinyin' ? p.pinyin : p.jyutping)) {
      clauses[clauses.length - 1].push(c);
      if (!c.reading) clauses.push([]);
    }
    return clauses.filter((clause) => clause.length);
  });

  protected readonly explanation = computed(() =>
    this.settings().explanation === 'cantonese'
      ? { text: this.proverb().explain_cantonese, lang: 'yue-Hant', label: '廣東話' }
      : { text: this.proverb().explain_standard, lang: 'zh-Hant', label: '書面語' },
  );

  protected readonly otherExplanation = computed(() =>
    this.settings().explanation === 'cantonese'
      ? { text: this.proverb().explain_standard, lang: 'zh-Hant', label: '書面語 Written Chinese' }
      : { text: this.proverb().explain_cantonese, lang: 'yue-Hant', label: '廣東話 Cantonese' },
  );

  protected readonly themes = computed(() => {
    const ids = (this.proverb().themes ?? '').split(',').filter(Boolean);
    const all = this.content.allThemes.value() ?? [];
    return ids.map((id) => all.find((t) => t.id === id) ?? { id, name_zh: id, name_en: '' });
  });

  protected async toggleBookmark() {
    const next = !this.bookmarked();
    this.bookmarked.set(next);
    try {
      await this.content.setBookmark(this.proverb().id, next);
    } catch {
      this.bookmarked.set(!next);
    }
  }

  protected async saveNote(body: string) {
    this.noteError.set(undefined);
    try {
      await this.content.setNote(this.proverb().id, body);
      this.note.set(body.trim() ? body : '');
      this.editingNote.set(false);
    } catch (error) {
      this.noteError.set(error instanceof Error ? error.message : String(error));
    }
  }
}
