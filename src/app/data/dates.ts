// Dates as the user sees them: calendar days in their own time zone.

/** YYYY-MM-DD of a moment, in the browser's time zone. */
export function localDay(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The day before a YYYY-MM-DD day. */
export function previousDay(day: string): string {
  return addDays(day, -1);
}

/** A YYYY-MM-DD day moved by a number of days. */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + days));
}

/** Whole days from 1970-01-01 to a YYYY-MM-DD day (for picking by date). */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Consecutive days studied, counting back from today. A streak isn't broken
 * until a whole day is missed: if today has no study yet, it counts from
 * yesterday.
 */
export function currentStreak(studyDays: Iterable<string>, today = localDay()): number {
  const days = new Set(studyDays);
  let day = days.has(today) ? today : previousDay(today);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = previousDay(day);
  }
  return streak;
}

/** The longest run of consecutive days ever studied. */
export function longestStreak(studyDays: Iterable<string>): number {
  const days = new Set(studyDays);
  let longest = 0;
  for (const day of days) {
    if (days.has(previousDay(day))) continue; // not the start of a run
    let length = 0;
    let next = day;
    while (days.has(next)) {
      length += 1;
      next = addDays(next, 1);
    }
    longest = Math.max(longest, length);
  }
  return longest;
}
