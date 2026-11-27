import { BACKUP_FORMAT, importStatements, parseBackup } from './backup';

const valid = {
  format: BACKUP_FORMAT,
  version: 1,
  exported_at: '2026-11-26T00:00:00.000Z',
  settings: [
    { key: 'reading', value: '"pinyin"' },
    { key: 'anthropic_api_key', value: '"sk-secret"' },
  ],
  progress: [{ proverb_id: 'zgxw-001', completed_at: '2026-11-25T08:00:00.000Z' }],
  study_days: [{ day: '2026-11-25' }],
  bookmarks: [],
  notes: [{ proverb_id: 'zgxw-002', body: 'hi', updated_at: '2026-11-25T08:00:00.000Z' }],
};

describe('backup', () => {
  it('reads a valid backup', () => {
    expect(parseBackup(JSON.stringify(valid)).progress).toHaveLength(1);
  });

  it('treats missing tables as empty', () => {
    const { bookmarks, ...rest } = valid;
    expect(parseBackup(JSON.stringify(rest)).bookmarks).toEqual([]);
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(/isn’t JSON/);
    expect(() => parseBackup('{"format":"other"}')).toThrow(/isn’t a Worthy Words backup/);
    expect(() => parseBackup(JSON.stringify({ ...valid, version: 99 }))).toThrow(/newer version/);
    expect(() => parseBackup(JSON.stringify({ ...valid, notes: [{ proverb_id: 1 }] }))).toThrow(
      /damaged “notes”/,
    );
  });

  it('never imports the API key', () => {
    const statements = importStatements(parseBackup(JSON.stringify(valid)));
    const binds = statements.flatMap((s) => s.bind ?? []);
    expect(binds).not.toContain('anthropic_api_key');
    expect(binds).toContain('reading');
    expect(statements).toHaveLength(4);
  });
});
