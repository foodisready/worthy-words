import { reminderIcs } from './reminder';

describe('reminderIcs', () => {
  const ics = reminderIcs({
    time: '07:30',
    url: 'https://example.org/worthy-words/',
    now: new Date(2026, 10, 26, 22, 0),
    uid: 'test',
  });
  const unfolded = ics.replace(/\r\n /g, '');

  it('is a daily event starting tomorrow at the chosen local time', () => {
    expect(unfolded).toContain('DTSTART:20261127T073000\r\n');
    expect(unfolded).toContain('RRULE:FREQ=DAILY\r\n');
    expect(unfolded).toContain('URL:https://example.org/worthy-words/\r\n');
    expect(unfolded).toContain('UID:test@worthy-words\r\n');
  });

  it('uses CRLF and keeps every line within 75 bytes', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('starts the next month when today is the last day', () => {
    const late = reminderIcs({ time: '08:00', url: 'x', now: new Date(2026, 11, 31, 9), uid: 'x' });
    expect(late).toContain('DTSTART:20270101T080000');
  });
});
