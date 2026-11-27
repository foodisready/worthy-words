import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DbService } from './db.service';
import { SettingsService } from './settings.service';

/** A database whose reads finish only when the test says so. */
function slowDb() {
  let finish: (rows: { key: string; value: string }[]) => void = () => undefined;
  const fake = {
    query: () => new Promise((resolve) => (finish = resolve)),
    exec: () => Promise.resolve(),
  };
  return { fake, finish: (rows: { key: string; value: string }[]) => finish(rows) };
}

describe('SettingsService', () => {
  it('keeps a change made while saved settings are still loading', async () => {
    const db = slowDb();
    TestBed.configureTestingModule({ providers: [{ provide: DbService, useValue: db.fake }] });
    const service = TestBed.inject(SettingsService);

    await service.set('menuLabels', 'zh');
    db.finish([
      { key: 'menuLabels', value: '"en"' },
      { key: 'script', value: '"simp"' },
    ]);
    await new Promise((resolve) => setTimeout(resolve));

    expect(service.loaded()).toBe(true);
    expect(service.settings().menuLabels).toBe('zh');
    // Saved settings that weren't changed still load.
    expect(service.settings().script).toBe('simp');
  });
});
