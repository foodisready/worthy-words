import { Component, computed, effect, inject, input, resource, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DisplayBar } from '../../components/display-bar/display-bar';
import { ProverbCard } from '../../components/proverb-card/proverb-card';
import { ContentRepository } from '../../data/content.repository';
import { StudyService } from '../../data/study.service';

/** One lesson, with links to the lessons before and after it. */
@Component({
  selector: 'app-lesson',
  imports: [RouterLink, ProverbCard, DisplayBar],
  template: `
    @if (data.value(); as d) {
      @if (d.lesson) {
        <header class="page-header">
          <p class="kicker">第 {{ d.lesson.id }} 課 · Lesson {{ d.lesson.id }} of {{ d.count }}</p>
          <h2 lang="zh-Hant">{{ titleZh() }}</h2>
          <p class="subtitle">{{ titleEn() }}</p>
          <app-display-bar />
        </header>

        <ol class="stack">
          @for (p of d.proverbs; track p.id) {
            <li [id]="p.id"><app-proverb-card [proverb]="p" /></li>
          }
        </ol>

        <div class="actions finish">
          @if (allLearned()) {
            <p class="learned">✓ 已學 You've learned this lesson.</p>
            <button
              type="button"
              class="text-button"
              [disabled]="busy()"
              (click)="markLearned(false)"
            >
              Mark as not learned
            </button>
          } @else {
            <button
              type="button"
              class="pill primary"
              [disabled]="busy()"
              (click)="markLearned(true)"
            >
              ✓ 標記為已學 Mark lesson as learned
            </button>
          }
        </div>

        <nav class="pager" aria-label="Lessons">
          @if (d.lesson.id > 1) {
            <a class="pill" [routerLink]="['/lessons', d.lesson.id - 1]" rel="prev"
              >← 上一課 Previous</a
            >
          }
          <a class="text-button" routerLink="/lessons">All lessons 全部</a>
          @if (d.lesson.id < d.count) {
            <a class="pill" [routerLink]="['/lessons', d.lesson.id + 1]" rel="next"
              >下一課 Next →</a
            >
          }
        </nav>
      } @else {
        <p class="status">
          There's no lesson {{ id() }}. <a routerLink="/lessons">See all lessons</a>.
        </p>
      }
    } @else if (data.error()) {
      <p class="status error" role="alert">Couldn't load the lesson: {{ data.error()?.message }}</p>
    } @else {
      <p class="status">載入中… Loading…</p>
    }
  `,
  styles: `
    .kicker {
      margin: 0 0 0.25rem;
      font-size: 0.8rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .finish {
      justify-content: center;
      align-items: center;
      margin-top: 1.5rem;
    }
    .learned {
      margin: 0;
      color: var(--accent);
    }
    .pager {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
    }
  `,
})
export class LessonPage {
  private readonly content = inject(ContentRepository);
  private readonly study = inject(StudyService);
  private readonly fragment = toSignal(inject(ActivatedRoute).fragment);

  /** From the route, /lessons/:id. */
  readonly id = input.required<string>();

  protected readonly busy = signal(false);

  protected readonly data = resource({
    params: () => ({ id: Number(this.id()), revision: this.study.revision() }),
    loader: async ({ params }) => {
      const [lesson, proverbs, lessons] = await Promise.all([
        this.content.lesson(params.id),
        this.content.proverbsInLesson(params.id),
        this.content.lessons(),
      ]);
      return { lesson, proverbs, count: lessons.length };
    },
  });

  /** "第一課：開篇" → "開篇": the number is already in the kicker. */
  protected readonly titleZh = computed(() =>
    (this.data.value()?.lesson?.title_zh ?? '').replace(/^第.+?課[：:]\s*/, ''),
  );
  protected readonly titleEn = computed(() =>
    (this.data.value()?.lesson?.title_en ?? '').replace(/^Lesson \d+:\s*/, ''),
  );

  protected readonly allLearned = computed(() => {
    const proverbs = this.data.value()?.proverbs ?? [];
    return proverbs.length > 0 && proverbs.every((p) => p.completed);
  });

  constructor() {
    // Links like /lessons/3#zgxw-012 scroll to the proverb once it's on the page.
    let scrolledFor: string | undefined;
    effect(() => {
      const fragment = this.fragment();
      const loaded = this.data.hasValue();
      if (!fragment || !loaded || scrolledFor === fragment) return;
      scrolledFor = fragment;
      setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ block: 'start' }));
    });
  }

  protected async markLearned(learned: boolean) {
    const ids = (this.data.value()?.proverbs ?? []).map((p) => p.id);
    this.busy.set(true);
    try {
      if (learned) await this.study.complete(ids);
      else await this.study.uncomplete(ids);
    } finally {
      this.busy.set(false);
    }
  }
}
