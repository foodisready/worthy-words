import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { DbService } from './data/db.service';
import { withReadings } from './data/content.repository';

class FakeDb {
  info = () => undefined;
  error = () => undefined;
  open = () => new Promise(() => undefined);
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: DbService, useClass: FakeDb }],
    }).compileComponents();
  });

  it('shows both names', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent ?? '';
    expect(h1).toContain('賢文');
    expect(h1).toContain('Worthy Words');
  });
});

describe('withReadings', () => {
  it('gives each Han character its syllable and skips punctuation', () => {
    expect(withReadings('知己，知彼。', 'zi1 gei2 zi1 bei2')).toEqual([
      { char: '知', reading: 'zi1' },
      { char: '己', reading: 'gei2' },
      { char: '，' },
      { char: '知', reading: 'zi1' },
      { char: '彼', reading: 'bei2' },
      { char: '。' },
    ]);
  });
});
