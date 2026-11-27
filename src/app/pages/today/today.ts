import { Component, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DisplayBar } from '../../components/display-bar/display-bar';
import { ProverbCard } from '../../components/proverb-card/proverb-card';
import { ContentRepository } from '../../data/content.repository';
import { dayNumber, localDay } from '../../data/dates';
import { SettingsService } from '../../data/settings.service';
import { StudyService } from '../../data/study.service';

/** Home: today's proverb, the Daily Dose (the next lesson), streak and progress. */
@Component({
  selector: 'app-today',
  imports: [RouterLink, ProverbCard, DisplayBar],
  templateUrl: './today.html',
  styleUrl: './today.scss',
})
export class TodayPage {
  private readonly content = inject(ContentRepository);
  private readonly study = inject(StudyService);
  protected readonly settingsService = inject(SettingsService);
  protected readonly settings = this.settingsService.settings;

  protected readonly today = localDay();

  protected readonly summary = resource({
    params: () => ({ revision: this.study.revision() }),
    loader: () => this.study.summary(this.today),
  });

  /** The same proverb all day, a different one each day. */
  protected readonly todaysProverb = resource({
    loader: () => this.content.proverbAt(dayNumber(this.today)),
  });

  /** After finishing today's lesson, the user chose to carry on. */
  protected readonly continuing = signal(false);
  protected readonly completing = signal(false);

  /** Done for today: show the finished state instead of another lesson. */
  protected readonly restingToday = computed(
    () => !!this.summary.value()?.studiedToday && !this.continuing(),
  );

  protected readonly lesson = resource({
    params: () => {
      const summary = this.summary.value();
      if (!summary || summary.nextLessonId === undefined || this.restingToday()) return undefined;
      return { id: summary.nextLessonId, revision: this.study.revision() };
    },
    loader: async ({ params }) => ({
      lesson: await this.content.lesson(params.id),
      proverbs: await this.content.proverbsInLesson(params.id),
    }),
  });

  protected readonly percent = computed(() => {
    const s = this.summary.value();
    return s && s.total ? Math.round((s.completed / s.total) * 100) : 0;
  });

  protected async completeLesson() {
    const proverbs = this.lesson.value()?.proverbs ?? [];
    this.completing.set(true);
    try {
      await this.study.complete(proverbs.map((p) => p.id));
      this.continuing.set(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      this.completing.set(false);
    }
  }
}
