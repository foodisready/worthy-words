import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContentRepository } from '../../data/content.repository';

const BLURBS: Record<string, string> = {
  'conduct-patience':
    'Getting along in the world: patience, restraint, and knowing when to let go.',
  'character-friendship':
    'Reading people, choosing friends, and how wealth changes who calls on you.',
  'diligence-time': 'Learning, hard work, and making the most of time before it’s gone.',
  'cultivation-speech': 'Shaping your own character, and taking care with what you say.',
};

/** The four themes. */
@Component({
  selector: 'app-themes',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <h2 lang="zh-Hant">主題</h2>
      <p class="subtitle">Themes: proverbs grouped by what they're about</p>
    </header>

    @if (themes.value(); as list) {
      <ul class="stack themes">
        @for (t of list; track t.id; let i = $index) {
          <li>
            <a class="panel theme" [routerLink]="['/themes', t.id]" [attr.data-theme]="t.id">
              <span class="glyph" lang="zh-Hant" aria-hidden="true">{{ t.name_zh.charAt(0) }}</span>
              <span class="body">
                <span class="name" lang="zh-Hant">{{ t.name_zh }}</span>
                <span class="name-en">{{ t.name_en }}</span>
                <span class="blurb">{{ blurbs[t.id] }}</span>
              </span>
              <span class="count">{{ t.total }}</span>
            </a>
          </li>
        }
      </ul>
    } @else if (themes.error()) {
      <p class="status error" role="alert">
        Couldn't load the themes: {{ themes.error()?.message }}
      </p>
    } @else {
      <p class="status">載入中… Loading…</p>
    }
  `,
  styles: `
    .theme {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-decoration: none;
      color: inherit;
    }
    .glyph {
      flex: none;
      width: 3rem;
      height: 3rem;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--accent);
      color: var(--on-accent);
      font-family: var(--font-serif-zh);
      font-size: 1.6rem;
    }
    .body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .name {
      font-family: var(--font-serif-zh);
      font-size: 1.15rem;
    }
    .name-en {
      font-size: 0.85rem;
      color: var(--muted);
    }
    .blurb {
      margin-top: 0.3rem;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .count {
      font-size: 0.85rem;
      color: var(--muted);
    }
  `,
})
export class ThemesPage {
  protected readonly themes = inject(ContentRepository).allThemes;
  protected readonly blurbs = BLURBS;
}
