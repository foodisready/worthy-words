import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkContent,
  hanChars,
  tonelessJyutping,
  tonelessPinyin,
  type Content,
  type Proverb,
} from './load.ts';

const proverb = (overrides: Partial<Proverb> = {}): Proverb => ({
  id: 'zgxw-001',
  themes: ['friendship'],
  text_trad: '路遙知馬力，日久見人心。',
  text_simp: '路遥知马力，日久见人心。',
  pinyin: 'lù yáo zhī mǎ lì rì jiǔ jiàn rén xīn',
  jyutping: 'lou6 jiu4 zi1 maa5 lik6 jat6 gau2 gin3 jan4 sam1',
  explain_cantonese: '解釋',
  explain_standard: '解釋',
  en_natural: 'A long road tests a horse; time reveals a heart.',
  reviewed: false,
  ...overrides,
});

const content = (...proverbs: Proverb[]): Content => ({
  themes: [{ id: 'friendship', name_zh: '交友', name_en: 'Friendship' }],
  lessons: [{ file: '001.yaml', lesson: { id: 1, title_zh: '一', title_en: 'One' }, proverbs }],
});

test('hanChars skips punctuation', () => {
  assert.equal(hanChars('知己知彼，將心比心。').length, 8);
});

test('valid content has no problems', () => {
  assert.deepEqual(checkContent(content(proverb())), []);
});

test('finds readings that do not line up with the characters', () => {
  const problems = checkContent(content(proverb({ pinyin: 'lù yáo zhī' })));
  assert.match(problems[0].message, /pinyin has 3 syllables for 10 characters/);
});

test('finds unknown themes and repeated ids', () => {
  const messages = checkContent(content(proverb({ themes: ['nope'] }), proverb())).map(
    (p) => p.message,
  );
  assert.ok(messages.includes('unknown theme "nope"'));
  assert.ok(messages.includes('proverb id used twice'));
});

test('finds badly formed jyutping', () => {
  const problems = checkContent(
    content(proverb({ jyutping: 'lou jiu4 zi1 maa5 lik6 jat6 gau2 gin3 jan4 sam1' })),
  );
  assert.match(problems[0].message, /jyutping "lou"/);
});

test('reviewed entries need readings', () => {
  const problems = checkContent(content(proverb({ reviewed: true, pinyin: undefined })));
  assert.match(problems[0].message, /pinyin is missing on a reviewed entry/);
});

test('toneless readings for search', () => {
  assert.equal(tonelessPinyin('lù yáo nǚ'), 'lu yao nv');
  assert.equal(tonelessJyutping('lou6 jiu4'), 'lou jiu');
});
