// Reading conventions for the classical text, shared by the fill and review scripts.
//
// Pinyin: dictionary tones, as Hanyu Pinyin orthography writes them. 一 is
// yī and 不 is bù even where speech changes the tone (變調), and there are no
// neutral tones, because the text is classical.
//
// Jyutping: literary readings (文讀), as classical text is recited in
// Cantonese. 行 is hang4, not haang4; 生 is sang1, not saang1.
import * as OpenCC from 'opencc-js';
import { pinyin } from 'pinyin-pro';
import ToJyutping from 'to-jyutping';
import { hanChars } from './load.ts';

/** Colloquial (白讀) → literary (文讀) Jyutping, used when reciting classical text. */
// prettier-ignore
export const LITERARY: Record<string, Record<string, string>> = {
  行: { haang4: 'hang4' }, 生: { saang1: 'sang1' }, 命: { meng6: 'ming6' },
  名: { meng2: 'ming4', meng4: 'ming4' }, 聽: { teng1: 'ting1', teng3: 'ting3' },
  成: { seng4: 'sing4' }, 城: { seng4: 'sing4' }, 聲: { seng1: 'sing1' },
  正: { zeng3: 'zing3' }, 姓: { seng3: 'sing3' }, 星: { seng1: 'sing1' },
  輕: { heng1: 'hing1' }, 請: { ceng2: 'cing2' }, 青: { ceng1: 'cing1' },
  精: { zeng1: 'zing1' }, 井: { zeng2: 'zing2' }, 病: { beng6: 'bing6' },
  平: { peng4: 'ping4' }, 鏡: { geng3: 'ging3' }, 驚: { geng1: 'ging1' },
  領: { leng5: 'ling5' }, 嶺: { leng5: 'ling5' }, 頂: { deng2: 'ding2' },
  醒: { seng2: 'sing2' }, 石: { sek6: 'sik6' }, 尺: { cek3: 'cik3' },
  隻: { zek3: 'zik3' }, 壁: { bek3: 'bik1' }, 錫: { sek3: 'sik3' },
  爭: { zaang1: 'zang1' }, 更: { gaang1: 'gang1' }, 耕: { gaang1: 'gang1' },
  硬: { ngaang6: 'ngang6' }, 橫: { waang4: 'wang4' }, 冷: { laang5: 'lang5' },
  掙: { zaang6: 'zang6' }, 坐: { co5: 'zo6' },
  淡: { taam5: 'daam6' }, 近: { kan5: 'gan6' }, 重: { cung5: 'zung6' },
  錢: { cin2: 'cin4' },
};

const toSimplified = OpenCC.Converter({ from: 'hk', to: 'cn' });

export function generateReadings(trad: string) {
  const simp = toSimplified(trad);
  // Pinyin is read from the simplified text, which pinyin-pro knows better
  // (for example 幾 alone is jī, but 几 in 幾人 is jǐ).
  const py = pinyin(simp, { type: 'array', nonZh: 'removed', toneSandhi: false }).join(' ');
  const jp = ToJyutping.getJyutpingList(trad)
    .filter(([char]) => hanChars(char).length > 0)
    .map(([char, reading]) => {
      const first = reading?.split(' ')[0];
      if (!first) return `?${char}`;
      return LITERARY[char]?.[first] ?? first;
    })
    .join(' ');
  return { text_simp: simp, pinyin: py, jyutping: jp };
}

export interface Sense {
  pinyin: string;
  jyutping: string;
  meaning: string;
}

/**
 * Characters whose reading depends on meaning. The review report lists every
 * one of them, so a person can check that the reading fits the line.
 */
// prettier-ignore
export const POLYPHONES: Record<string, Sense[]> = {
  行: [{ pinyin: 'xíng', jyutping: 'hang4', meaning: 'go, walk, do' }, { pinyin: 'háng', jyutping: 'hong4', meaning: 'row, trade' }, { pinyin: 'xìng', jyutping: 'hang6', meaning: 'conduct (德行, 品行)' }],
  長: [{ pinyin: 'cháng', jyutping: 'coeng4', meaning: 'long' }, { pinyin: 'zhǎng', jyutping: 'zoeng2', meaning: 'grow, elder, head' }],
  重: [{ pinyin: 'zhòng', jyutping: 'zung6', meaning: 'heavy, important' }, { pinyin: 'chóng', jyutping: 'cung4', meaning: 'again, layered' }],
  為: [{ pinyin: 'wéi', jyutping: 'wai4', meaning: 'be, act as, do' }, { pinyin: 'wèi', jyutping: 'wai6', meaning: 'for, because of' }],
  樂: [{ pinyin: 'lè', jyutping: 'lok6', meaning: 'happy' }, { pinyin: 'yuè', jyutping: 'ngok6', meaning: 'music' }],
  好: [{ pinyin: 'hǎo', jyutping: 'hou2', meaning: 'good' }, { pinyin: 'hào', jyutping: 'hou3', meaning: 'like, be fond of' }],
  惡: [{ pinyin: 'è', jyutping: 'ok3', meaning: 'evil' }, { pinyin: 'wù', jyutping: 'wu3', meaning: 'hate' }],
  少: [{ pinyin: 'shǎo', jyutping: 'siu2', meaning: 'few, lack' }, { pinyin: 'shào', jyutping: 'siu3', meaning: 'young' }],
  識: [{ pinyin: 'shí', jyutping: 'sik1', meaning: 'know' }, { pinyin: 'zhì', jyutping: 'zi3', meaning: 'remember, mark' }],
  說: [{ pinyin: 'shuō', jyutping: 'syut3', meaning: 'speak' }, { pinyin: 'shuì', jyutping: 'seoi3', meaning: 'persuade' }, { pinyin: 'yuè', jyutping: 'jyut6', meaning: '= 悅, pleased' }],
  更: [{ pinyin: 'gèng', jyutping: 'gang3', meaning: 'even more' }, { pinyin: 'gēng', jyutping: 'gang1', meaning: 'change; night watch' }],
  便: [{ pinyin: 'biàn', jyutping: 'bin6', meaning: 'then; convenient' }, { pinyin: 'pián', jyutping: 'pin4', meaning: 'cheap' }],
  相: [{ pinyin: 'xiāng', jyutping: 'soeng1', meaning: 'each other' }, { pinyin: 'xiàng', jyutping: 'soeng3', meaning: 'appearance; minister' }],
  中: [{ pinyin: 'zhōng', jyutping: 'zung1', meaning: 'middle, in' }, { pinyin: 'zhòng', jyutping: 'zung3', meaning: 'hit (a target)' }],
  間: [{ pinyin: 'jiān', jyutping: 'gaan1', meaning: 'between, among' }, { pinyin: 'jiàn', jyutping: 'gaan3', meaning: 'gap; separate' }],
  傳: [{ pinyin: 'chuán', jyutping: 'cyun4', meaning: 'pass on, spread' }, { pinyin: 'zhuàn', jyutping: 'zyun6', meaning: 'biography, commentary' }],
  數: [{ pinyin: 'shù', jyutping: 'sou3', meaning: 'number' }, { pinyin: 'shǔ', jyutping: 'sou2', meaning: 'count' }, { pinyin: 'shuò', jyutping: 'sok3', meaning: 'often' }],
  處: [{ pinyin: 'chù', jyutping: 'cyu3', meaning: 'place' }, { pinyin: 'chǔ', jyutping: 'cyu5', meaning: 'dwell; deal with' }],
  教: [{ pinyin: 'jiào', jyutping: 'gaau3', meaning: 'teaching; cause, let' }, { pinyin: 'jiāo', jyutping: 'gaau3', meaning: 'teach' }],
  將: [{ pinyin: 'jiāng', jyutping: 'zoeng1', meaning: 'take; will' }, { pinyin: 'jiàng', jyutping: 'zoeng3', meaning: 'general' }],
  應: [{ pinyin: 'yīng', jyutping: 'jing1', meaning: 'should' }, { pinyin: 'yìng', jyutping: 'jing3', meaning: 'respond' }],
  當: [{ pinyin: 'dāng', jyutping: 'dong1', meaning: 'serve as; at (the time)' }, { pinyin: 'dàng', jyutping: 'dong3', meaning: 'proper; treat as' }],
  和: [{ pinyin: 'hé', jyutping: 'wo4', meaning: 'harmony; and' }, { pinyin: 'hè', jyutping: 'wo6', meaning: 'join in (a song)' }],
  還: [{ pinyin: 'huán', jyutping: 'waan4', meaning: 'return' }, { pinyin: 'hái', jyutping: 'waan4', meaning: 'still' }],
  種: [{ pinyin: 'zhǒng', jyutping: 'zung2', meaning: 'kind; seed' }, { pinyin: 'zhòng', jyutping: 'zung3', meaning: 'plant' }],
  著: [{ pinyin: 'zhù', jyutping: 'zyu3', meaning: 'write; notable' }, { pinyin: 'zhuó', jyutping: 'zoek3', meaning: 'wear; apply' }, { pinyin: 'zháo', jyutping: 'zoek6', meaning: 'touch; succeed' }],
  觀: [{ pinyin: 'guān', jyutping: 'gun1', meaning: 'look at' }, { pinyin: 'guàn', jyutping: 'gun3', meaning: 'Daoist temple' }],
  朝: [{ pinyin: 'zhāo', jyutping: 'ziu1', meaning: 'morning' }, { pinyin: 'cháo', jyutping: 'ciu4', meaning: 'court; dynasty; towards' }],
  難: [{ pinyin: 'nán', jyutping: 'naan4', meaning: 'hard' }, { pinyin: 'nàn', jyutping: 'naan6', meaning: 'disaster' }],
  分: [{ pinyin: 'fēn', jyutping: 'fan1', meaning: 'divide; part' }, { pinyin: 'fèn', jyutping: 'fan6', meaning: 'portion, one’s place' }],
  散: [{ pinyin: 'sàn', jyutping: 'saan3', meaning: 'scatter' }, { pinyin: 'sǎn', jyutping: 'saan2', meaning: 'loose' }],
  空: [{ pinyin: 'kōng', jyutping: 'hung1', meaning: 'empty; in vain' }, { pinyin: 'kòng', jyutping: 'hung3', meaning: 'free time; vacant' }],
  興: [{ pinyin: 'xīng', jyutping: 'hing1', meaning: 'rise, prosper' }, { pinyin: 'xìng', jyutping: 'hing3', meaning: 'interest, mood' }],
  與: [{ pinyin: 'yǔ', jyutping: 'jyu5', meaning: 'give; with' }, { pinyin: 'yù', jyutping: 'jyu6', meaning: 'take part in' }],
  度: [{ pinyin: 'dù', jyutping: 'dou6', meaning: 'pass (time); degree' }, { pinyin: 'duó', jyutping: 'dok6', meaning: 'estimate' }],
  背: [{ pinyin: 'bèi', jyutping: 'bui3', meaning: 'back; behind' }, { pinyin: 'bēi', jyutping: 'bui1', meaning: 'carry on the back' }],
  看: [{ pinyin: 'kàn', jyutping: 'hon3', meaning: 'look' }, { pinyin: 'kān', jyutping: 'hon1', meaning: 'watch over' }],
  幾: [{ pinyin: 'jǐ', jyutping: 'gei2', meaning: 'how many' }, { pinyin: 'jī', jyutping: 'gei1', meaning: 'almost; sign' }],
  只: [{ pinyin: 'zhǐ', jyutping: 'zi2', meaning: 'only' }, { pinyin: 'zhī', jyutping: 'zek3', meaning: 'single (measure word)' }],
  曾: [{ pinyin: 'céng', jyutping: 'cang4', meaning: 'once, ever' }, { pinyin: 'zēng', jyutping: 'zang1', meaning: 'great-grand-; surname' }],
  易: [{ pinyin: 'yì', jyutping: 'ji6', meaning: 'easy' }, { pinyin: 'yì', jyutping: 'jik6', meaning: 'change, exchange' }],
  飲: [{ pinyin: 'yǐn', jyutping: 'jam2', meaning: 'drink' }, { pinyin: 'yìn', jyutping: 'jam3', meaning: 'give to drink' }],
  要: [{ pinyin: 'yào', jyutping: 'jiu3', meaning: 'want; must' }, { pinyin: 'yāo', jyutping: 'jiu1', meaning: 'demand; invite' }],
  量: [{ pinyin: 'liàng', jyutping: 'loeng6', meaning: 'capacity' }, { pinyin: 'liáng', jyutping: 'loeng4', meaning: 'measure' }],
  思: [{ pinyin: 'sī', jyutping: 'si1', meaning: 'think' }, { pinyin: 'sì', jyutping: 'si3', meaning: 'thought (classical)' }],
  舍: [{ pinyin: 'shè', jyutping: 'se3', meaning: 'house' }, { pinyin: 'shě', jyutping: 'se2', meaning: 'give up' }],
  強: [{ pinyin: 'qiáng', jyutping: 'koeng4', meaning: 'strong' }, { pinyin: 'qiǎng', jyutping: 'koeng5', meaning: 'force' }],
  正: [{ pinyin: 'zhèng', jyutping: 'zing3', meaning: 'upright; exactly' }, { pinyin: 'zhēng', jyutping: 'zing1', meaning: 'first month' }],
  省: [{ pinyin: 'xǐng', jyutping: 'sing2', meaning: 'reflect' }, { pinyin: 'shěng', jyutping: 'saang2', meaning: 'save; province' }],
  覺: [{ pinyin: 'jué', jyutping: 'gok3', meaning: 'feel, realise' }, { pinyin: 'jiào', jyutping: 'gaau3', meaning: 'sleep' }],
  得: [{ pinyin: 'dé', jyutping: 'dak1', meaning: 'obtain, can' }, { pinyin: 'děi', jyutping: 'dak1', meaning: 'must (modern)' }],
  發: [{ pinyin: 'fā', jyutping: 'faat3', meaning: 'send out; bloom' }],
  會: [{ pinyin: 'huì', jyutping: 'wui5', meaning: 'can, know how; understand' }, { pinyin: 'huì', jyutping: 'wui6', meaning: 'meet, gather' }, { pinyin: 'kuài', jyutping: 'kui2', meaning: 'accounting' }],
  似: [{ pinyin: 'sì', jyutping: 'ci5', meaning: 'resemble' }, { pinyin: 'shì', jyutping: 'ci5', meaning: '似的 (modern)' }],
  誰: [{ pinyin: 'shuí', jyutping: 'seoi4', meaning: 'who (formal)' }, { pinyin: 'shéi', jyutping: 'seoi4', meaning: 'who (spoken)' }],
  勝: [{ pinyin: 'shèng', jyutping: 'sing3', meaning: 'win, surpass' }, { pinyin: 'shēng', jyutping: 'sing1', meaning: 'bear, be equal to' }],
  任: [{ pinyin: 'rèn', jyutping: 'jam6', meaning: 'duty; let' }, { pinyin: 'rén', jyutping: 'jam4', meaning: 'surname' }],
  王: [{ pinyin: 'wáng', jyutping: 'wong4', meaning: 'king' }, { pinyin: 'wàng', jyutping: 'wong6', meaning: 'rule as king' }],
  乘: [{ pinyin: 'chéng', jyutping: 'sing4', meaning: 'ride; take advantage' }, { pinyin: 'shèng', jyutping: 'sing6', meaning: 'chariot' }],
  參: [{ pinyin: 'cān', jyutping: 'caam1', meaning: 'take part' }, { pinyin: 'shēn', jyutping: 'sam1', meaning: 'ginseng' }],
  藏: [{ pinyin: 'cáng', jyutping: 'cong4', meaning: 'hide' }, { pinyin: 'zàng', jyutping: 'zong6', meaning: 'storehouse' }],
  載: [{ pinyin: 'zài', jyutping: 'zoi3', meaning: 'carry' }, { pinyin: 'zǎi', jyutping: 'zoi2', meaning: 'year; record' }],
  冠: [{ pinyin: 'guān', jyutping: 'gun1', meaning: 'hat' }, { pinyin: 'guàn', jyutping: 'gun3', meaning: 'first; crown' }],
  喪: [{ pinyin: 'sāng', jyutping: 'song1', meaning: 'mourning' }, { pinyin: 'sàng', jyutping: 'song3', meaning: 'lose' }],
  差: [{ pinyin: 'chā', jyutping: 'caa1', meaning: 'difference' }, { pinyin: 'chāi', jyutping: 'caai1', meaning: 'send; errand' }, { pinyin: 'cī', jyutping: 'ci1', meaning: '參差, uneven' }],
  調: [{ pinyin: 'tiáo', jyutping: 'tiu4', meaning: 'adjust' }, { pinyin: 'diào', jyutping: 'diu6', meaning: 'tune; transfer' }],
  降: [{ pinyin: 'jiàng', jyutping: 'gong3', meaning: 'descend' }, { pinyin: 'xiáng', jyutping: 'hong4', meaning: 'surrender' }],
  假: [{ pinyin: 'jiǎ', jyutping: 'gaa2', meaning: 'false' }, { pinyin: 'jià', jyutping: 'gaa3', meaning: 'holiday' }],
  親: [{ pinyin: 'qīn', jyutping: 'can1', meaning: 'kin; close; oneself' }, { pinyin: 'qìng', jyutping: 'can3', meaning: '親家, in-laws' }],
};
