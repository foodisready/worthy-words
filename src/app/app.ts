import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DbService } from './data/db.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly db = inject(DbService);

  constructor() {
    // Errors are shown through db.error().
    this.db.open().catch(() => undefined);
  }
}
