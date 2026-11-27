import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '../../data/content.repository';
import { StudyService } from '../../data/study.service';

/** Every lesson, with how much of each the user has learned. */
@Component({
  selector: 'app-lessons',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <h2 lang="zh-Hant">課文</h2>
      <p class="subtitle">Lessons: the book in order, four proverbs at a time</p>
    </header>

    @if (lessons.value(); as list) {
      <ol class="stack lessons">
        @for (l of list; track l.id) {
          <li>
            <a class="panel lesson" [routerLink]="['/lessons', l.id]" [attr.data-lesson]="l.id">
              <span class="number">{{ l.id }}</span>
              <span class="body">
                <span class="title" lang="zh-Hant">{{ l.title_zh }}</span>
                <span class="title-en">{{ l.title_en }}</span>
                <span class="preview" lang="zh-Hant">{{ l.first_text }}</span>
              </span>
              <span class="count" [class.complete]="l.completed === l.total">
                {{ l.completed === l.total ? '✓' : l.completed + '/' + l.total }}
              </span>
            </a>
          </li>
        }
      </ol>
    } @else if (lessons.error()) {
      <p class="status error" role="alert">
        Couldn't load the lessons: {{ lessons.error()?.message }}
      </p>
    } @else {
      <p class="status">載入中… Loading…</p>
    }
  `,
  styles: `
    .lesson {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-decoration: none;
      color: inherit;
      padding: 0.9rem 1rem;
    }
    .number {
      flex: none;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      border: 1px solid var(--accent);
      color: var(--accent);
      font-weight: 600;
    }
    .body {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .title {
      font-family: var(--font-serif-zh);
      font-size: 1.1rem;
    }
    .title-en {
      font-size: 0.85rem;
      color: var(--muted);
    }
    .preview {
      margin-top: 0.3rem;
      font-size: 0.9rem;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .count {
      flex: none;
      font-size: 0.85rem;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
      &.complete {
        color: var(--accent);
        font-weight: 700;
      }
    }
  `,
})
export class LessonsPage {
  private readonly content = inject(ContentRepository);
  private readonly study = inject(StudyService);

  protected readonly lessons = resource({
    params: () => ({ revision: this.study.revision() }),
    loader: () => this.content.lessons(),
  });
}
