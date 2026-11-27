import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DbService } from './data/db.service';
import { SettingsService } from './data/settings.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly db = inject(DbService);
  protected readonly settings = inject(SettingsService).settings;

  protected readonly nav = [
    { path: '/', zh: '今日', en: 'Today', icon: '日', exact: true },
    { path: '/lessons', zh: '課文', en: 'Lessons', icon: '課', exact: false },
    { path: '/themes', zh: '主題', en: 'Themes', icon: '題', exact: false },
    { path: '/saved', zh: '收藏', en: 'Saved', icon: '藏', exact: false },
    { path: '/settings', zh: '設定', en: 'Settings', icon: '設', exact: false },
  ];

  constructor() {
    // Errors are shown through db.error().
    this.db.open().catch(() => undefined);
  }
}
