import { Component, inject, input, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DisplayBar } from '../../components/display-bar/display-bar';
import { ProverbCard } from '../../components/proverb-card/proverb-card';
import { ContentRepository } from '../../data/content.repository';

/** Every proverb on one theme, in book order. */
@Component({
  selector: 'app-theme',
  imports: [RouterLink, ProverbCard, DisplayBar],
  template: `
    @if (data.value(); as d) {
      @if (d.theme) {
        <header class="page-header">
          <p class="crumbs"><a routerLink="/themes">主題 Themes</a></p>
          <h2 lang="zh-Hant">{{ d.theme.name_zh }}</h2>
          <p class="subtitle">{{ d.theme.name_en }} · {{ d.theme.total }} proverbs</p>
          <app-display-bar />
        </header>
        <ol class="stack">
          @for (p of d.proverbs; track p.id) {
            <li><app-proverb-card [proverb]="p" [showLesson]="true" /></li>
          }
        </ol>
      } @else {
        <p class="status">There's no such theme. <a routerLink="/themes">See all themes</a>.</p>
      }
    } @else if (data.error()) {
      <p class="status error" role="alert">Couldn't load the theme: {{ data.error()?.message }}</p>
    } @else {
      <p class="status">載入中… Loading…</p>
    }
  `,
  styles: `
    .crumbs {
      margin: 0 0 0.25rem;
      font-size: 0.85rem;
    }
  `,
})
export class ThemePage {
  private readonly content = inject(ContentRepository);

  /** From the route, /themes/:id. */
  readonly id = input.required<string>();

  protected readonly data = resource({
    params: () => ({ id: this.id() }),
    loader: async ({ params }) => ({
      theme: await this.content.theme(params.id),
      proverbs: await this.content.proverbsInTheme(params.id),
    }),
  });
}
