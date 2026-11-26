import { Component, computed, inject, resource, signal } from '@angular/core';
import { ContentRepository, type Proverb, withReadings } from '../../data/content.repository';

type Reading = 'jyutping' | 'pinyin' | 'none';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomePage {
  private readonly content = inject(ContentRepository);

  protected readonly reading = signal<Reading>('jyutping');

  protected readonly lesson = resource({
    loader: async () => {
      const [first] = await this.content.lessons();
      if (!first) return undefined;
      return { ...first, proverbs: await this.content.proverbsInLesson(first.id) };
    },
  });

  protected readonly proverbs = computed(() => this.lesson.value()?.proverbs ?? []);

  protected characters(proverb: Proverb) {
    const reading = this.reading();
    return withReadings(
      proverb.text_trad,
      reading === 'pinyin' ? proverb.pinyin : proverb.jyutping,
    );
  }

  protected async toggleBookmark(proverb: Proverb) {
    const bookmarked = !proverb.bookmarked;
    await this.content.setBookmark(proverb.id, bookmarked);
    this.lesson.update(
      (lesson) =>
        lesson && {
          ...lesson,
          proverbs: lesson.proverbs.map((p) =>
            p.id === proverb.id ? { ...p, bookmarked: +bookmarked } : p,
          ),
        },
    );
  }
}
