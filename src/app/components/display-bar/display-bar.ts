import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService, type Settings } from '../../data/settings.service';

/** Quick switches for how proverbs are shown: reading aid and character set. */
@Component({
  selector: 'app-display-bar',
  imports: [RouterLink],
  template: `
    <div class="bar" role="group" aria-label="Display 顯示">
      <div class="segmented" role="radiogroup" aria-label="Reading aid 注音">
        @for (option of readings; track option.value) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="settings().reading === option.value"
            [attr.aria-label]="option.label"
            [title]="option.label"
            (click)="service.set('reading', option.value)"
          >
            {{ option.short }}
          </button>
        }
      </div>
      <div class="segmented" role="radiogroup" aria-label="Characters 字體">
        @for (option of scripts; track option.value) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="settings().script === option.value"
            [attr.aria-label]="option.label"
            [title]="option.label"
            (click)="service.set('script', option.value)"
          >
            {{ option.short }}
          </button>
        }
      </div>
      <div class="segmented" role="radiogroup" aria-label="Explanation 解釋">
        @for (option of explanations; track option.value) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="settings().explanation === option.value"
            [attr.aria-label]="option.label"
            [title]="option.label"
            (click)="service.set('explanation', option.value)"
          >
            {{ option.short }}
          </button>
        }
      </div>
      @if (settings().reading !== 'none') {
        <a
          class="help"
          routerLink="/guide"
          aria-label="How to read the pronunciation 讀音指南"
          title="How to read the pronunciation 讀音指南"
          >?</a
        >
      }
    </div>
  `,
  styleUrl: './display-bar.scss',
})
export class DisplayBar {
  protected readonly service = inject(SettingsService);
  protected readonly settings = this.service.settings;

  protected readonly readings: { value: Settings['reading']; short: string; label: string }[] = [
    { value: 'jyutping', short: '粵拼', label: '粵拼 Jyutping' },
    { value: 'pinyin', short: '拼音', label: '拼音 Pinyin' },
    { value: 'none', short: '無', label: '無注音 No reading aid' },
  ];
  protected readonly scripts: { value: Settings['script']; short: string; label: string }[] = [
    { value: 'trad', short: '繁', label: '繁體 Traditional' },
    { value: 'simp', short: '简', label: '简体 Simplified' },
  ];
  protected readonly explanations: {
    value: Settings['explanation'];
    short: string;
    label: string;
  }[] = [
    { value: 'cantonese', short: '粵', label: '廣東話解釋 Cantonese explanation' },
    { value: 'standard', short: '書', label: '書面語解釋 Written Chinese explanation' },
  ];
}
