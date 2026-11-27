import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DisplayBar } from '../../components/display-bar/display-bar';
import { ProverbCard } from '../../components/proverb-card/proverb-card';
import { ContentRepository } from '../../data/content.repository';

/** Bookmarked proverbs and proverbs the user has written a note on. */
@Component({
  selector: 'app-saved',
  imports: [RouterLink, ProverbCard, DisplayBar],
  template: `
    <header class="page-header">
      <h2 lang="zh-Hant">收藏</h2>
      <p class="subtitle">Saved: your bookmarks and notes</p>
      @if (saved.value()?.length) {
        <app-display-bar />
      }
    </header>

    @if (saved.value(); as list) {
      @if (list.length) {
        <ol class="stack">
          @for (p of list; track p.id) {
            <li><app-proverb-card [proverb]="p" [showLesson]="true" /></li>
          }
        </ol>
      } @else {
        <section class="panel">
          <p>
            Nothing saved yet. Tap <strong>☆ 收藏 Save</strong> or <strong>✎ 筆記 Note</strong> on
            any proverb and it will appear here.
          </p>
          <div class="actions">
            <a class="pill" routerLink="/">今日 Today</a>
            <a class="pill" routerLink="/lessons">課文 Lessons</a>
          </div>
        </section>
      }
    } @else if (saved.error()) {
      <p class="status error" role="alert">
        Couldn't load your saved proverbs: {{ saved.error()?.message }}
      </p>
    } @else {
      <p class="status">載入中… Loading…</p>
    }
  `,
})
export class SavedPage {
  private readonly content = inject(ContentRepository);
  protected readonly saved = resource({ loader: () => this.content.savedProverbs() });
}
