// A daily reminder as a calendar file (.ics). Web push needs a server and
// browsers can't schedule local notifications, but every calendar app can
// import a repeating event, and the event links back to the app.

export interface ReminderOptions {
  /** Local time, HH:MM. */
  time: string;
  /** The app's address, opened from the event. */
  url: string;
  /** For testing; defaults to now. */
  now?: Date;
  /** For testing; defaults to a random id. */
  uid?: string;
}

export function reminderIcs({ time, url, now = new Date(), uid }: ReminderOptions): string {
  const [hours, minutes] = time.split(':').map(Number);
  // The event starts tomorrow, at the chosen time in the user's own time zone
  // ("floating" time, with no time zone, so it follows them when they travel).
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes);
  const floating =
    `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}` +
    `T${pad(hours)}${pad(minutes)}00`;
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const id = uid ?? crypto.randomUUID();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Worthy Words//Daily reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${id}@worthy-words`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${floating}`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escape('賢文 Worthy Words: 今日金句 Today’s proverb')}`,
    `DESCRIPTION:${escape(`Five minutes with 增廣賢文. Open the app: ${url}`)}`,
    `URL:${url}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape('賢文 Worthy Words')}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Escapes text values (RFC 5545 section 3.3.11). */
function escape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Folds lines longer than 75 bytes (RFC 5545 section 3.1), never inside a character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}
