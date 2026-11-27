import { addDays, currentStreak, dayNumber, longestStreak, previousDay } from './dates';

describe('dates', () => {
  it('moves across month, year and leap-day boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('numbers days consecutively', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('2026-11-27') - dayNumber('2026-11-26')).toBe(1);
  });

  it('counts the current streak, still alive if only today is missing', () => {
    const days = ['2026-11-23', '2026-11-24', '2026-11-25'];
    expect(currentStreak(days, '2026-11-25')).toBe(3);
    expect(currentStreak(days, '2026-11-26')).toBe(3);
    expect(currentStreak(days, '2026-11-27')).toBe(0);
    expect(currentStreak([], '2026-11-27')).toBe(0);
  });

  it('finds the longest streak', () => {
    expect(
      longestStreak(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07']),
    ).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});
