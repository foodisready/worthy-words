import { describe, expect, it } from 'vitest';
import { fingerprint, parseReview, reviewText, type ReviewEntry } from './review';

const entry = {
  text_trad: '觀今宜鑑古，無古不成今。',
  text_simp: '观今宜鉴古，无古不成今。',
  pinyin: 'guān jīn yí jiàn gǔ wú gǔ bù chéng jīn',
  jyutping: 'gun1 gam1 ji4 gaam3 gu2 mou4 gu2 bat1 sing4 gam1',
  explain_cantonese: '想睇清楚今日嘅事',
  explain_standard: '要看清當下',
  en_natural: 'Look to the past.',
  en_literal: null,
  themes: ['diligence-time', 'conduct-patience'],
};

describe('fingerprint', () => {
  it('is stable, ignores theme order, and treats missing and null alike', () => {
    const a = fingerprint(entry);
    expect(a).toMatch(/^[0-9a-f]{14}$/);
    expect(fingerprint({ ...entry, themes: ['conduct-patience', 'diligence-time'] })).toBe(a);
    expect(fingerprint({ ...entry, en_literal: undefined })).toBe(a);
  });

  it('changes when any reviewed field changes', () => {
    const a = fingerprint(entry);
    expect(fingerprint({ ...entry, jyutping: entry.jyutping.replace('gu2', 'gu3') })).not.toBe(a);
    expect(fingerprint({ ...entry, context_note: 'note' })).not.toBe(a);
    expect(fingerprint({ ...entry, themes: ['diligence-time'] })).not.toBe(a);
  });
});

describe('review text', () => {
  const entries: ReviewEntry[] = [
    {
      proverb_id: 'zgxw-012',
      verdict: 'change',
      comment: '近 should be kan5\n解釋：「攞」→「用」',
      fingerprint: '0a1b2c3d4e5f60',
      updated_at: '2026-11-27T10:00:00.000Z',
    },
    {
      proverb_id: 'zgxw-001',
      verdict: 'ok',
      comment: '',
      fingerprint: '00000000000001',
      updated_at: '2026-11-27T10:00:00.000Z',
    },
    {
      proverb_id: 'zgxw-002',
      verdict: 'unsure',
      comment: 'Not sure about 鑑',
      fingerprint: '00000000000002',
      updated_at: '2026-11-27T10:00:00.000Z',
    },
  ];

  it('round-trips through plain text, sorted by id', () => {
    const text = reviewText(entries);
    expect(text).toContain('✎ zgxw-012 [0a1b2c3d4e5f60]\n  近 should be kan5\n  解釋');
    const back = parseReview(text);
    expect(back.map((e) => [e.proverb_id, e.verdict, e.comment, e.fingerprint])).toEqual([
      ['zgxw-001', 'ok', '', '00000000000001'],
      ['zgxw-002', 'unsure', 'Not sure about 鑑', '00000000000002'],
      ['zgxw-012', 'change', '近 should be kan5\n解釋：「攞」→「用」', '0a1b2c3d4e5f60'],
    ]);
  });

  it('survives being pasted with extra text around it', () => {
    const pasted = `Here you go:\n\n${reviewText(entries)}\nThanks!`;
    expect(parseReview(pasted)).toHaveLength(3);
  });

  it('reads the exported JSON file and rejects other files', () => {
    const file = JSON.stringify({
      format: 'worthy-words-review',
      version: 1,
      exported_at: '',
      entries,
    });
    expect(parseReview(file)).toHaveLength(3);
    expect(() => parseReview('{"format":"worthy-words-backup"}')).toThrow(/isn’t a Worthy Words/);
    expect(() => parseReview('hello')).toThrow(/No review entries/);
  });
});
