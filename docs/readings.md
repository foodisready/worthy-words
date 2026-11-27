# Readings guide: Jyutping, Pinyin and tones

How the app writes Cantonese and Mandarin pronunciation, and the rules we follow when choosing a reading. This is for reviewers and contributors. Learners may find it useful too.

## Jyutping in one minute

Jyutping is the romanisation from the Linguistic Society of Hong Kong. Each syllable is spelled in letters with a **tone number** at the end:

```
近   gan6      gan = the sound, 6 = the tone
阿   aa3
教   gaau1
```

### The six tones

Cantonese uses pitch to tell words apart. The classic example is the syllable **si** with each of the six tones:

| Tone  | Pitch                               | Contour (1 low – 5 high) | Example | Meaning |
| ----- | ----------------------------------- | ------------------------ | ------- | ------- |
| **1** | high level (sometimes high falling) | 55 (53)                  | 詩 si1  | poem    |
| **2** | rising, low to high                 | 35                       | 史 si2  | history |
| **3** | mid level                           | 33                       | 試 si3  | try     |
| **4** | low falling, the lowest             | 21 (11)                  | 時 si4  | time    |
| **5** | low rising                          | 23                       | 市 si5  | market  |
| **6** | low level                           | 22                       | 事 si6  | matter  |

Tones 1, 3 and 6 are level: high, mid and low. Tones 2 and 5 rise. Tone 4 falls.

### Syllables ending in -p, -t, -k

Syllables ending in **-p**, **-t** or **-k** are short and clipped. These are the "entering tones" (入聲). Jyutping doesn't give them extra numbers. It uses the level tone with the same pitch:

| Pitch | Number | Example            |
| ----- | ------ | ------------------ |
| high  | 1      | 一 jat1, 得 dak1   |
| mid   | 3      | 八 baat3, 百 baak3 |
| low   | 6      | 六 luk6, 日 jat6   |

Some older books number these 7, 8 and 9. In Jyutping they are 1, 3 and 6.

### Spellings English speakers might misread

| Jyutping          | Sounds like                             | Example             |
| ----------------- | --------------------------------------- | ------------------- |
| j                 | English **y** in _yes_                  | 日 jat6, 人 jan4    |
| z                 | **dz** / **ts** (no puff of air)        | 知 zi1, 早 zou2     |
| c                 | **ts** with a puff of air               | 錢 cin2, 春 ceon1   |
| ng (at the start) | **ng** as in _sing_, moved to the start | 我 ngo5, 魏 ngai6   |
| aa / a            | long **a** / short **a**                | 行 haang4 / 恨 han6 |
| oe, eo            | rounded vowels like German _ö_          | 香 hoeng1, 春 ceon1 |
| yu                | French _u_, German _ü_                  | 魚 jyu4, 書 syu1    |

## Which Cantonese reading we use: say it the way it's spoken

Many characters have two Cantonese readings:

- **文讀** literary reading: used when reading classical texts aloud
- **白讀** colloquial reading: used in everyday speech

The app follows **everyday Hong Kong speech, word by word**. These proverbs are sayings that people use in conversation, so the readings should sound like conversation. We don't switch every character mechanically in either direction:

| Words                           | Reading | Why                                               |
| ------------------------------- | ------- | ------------------------------------------------- |
| 有錢, 無錢                      | cin2    | "Money" is always cin2 in speech                  |
| 錢財                            | cin4    | 錢財 is said cin4 coi4                            |
| 行 "walk, set out" (早行, 馬行) | haang4  | The spoken reading, not the literary hang4        |
| 成 (成陰, 不成)                 | sing4   | The spoken seng4 would sound odd in these phrases |

Strictly speaking, 有錢 cin2 is a **變音** (changed tone) of cin4, not a 白讀. The rule is the same either way: use what people say.

`npm run content:readings` writes `content/review/readings.md`. That file lists every place where a character has both a colloquial and a literary reading, so a reviewer can check each one.

### When the meaning decides the reading

Some characters change their reading with their meaning (多音字). The reading follows the sense used in the line:

| Character | Sense                                                            | Reading          |
| --------- | ---------------------------------------------------------------- | ---------------- |
| 教        | "let, cause to" (= 使, 令), e.g. 莫教貧                          | jiāo / **gaau1** |
| 教        | "teach", e.g. 教書                                               | jiāo / gaau3     |
| 教        | "teaching, religion", e.g. 教育, 宗教                            | jiào / gaau3     |
| 阿        | prefix and transliterated foreign names, e.g. 阿媽, 阿拉伯, 阿魏 | ā / **aa3**      |
| 阿        | older reading, e.g. 阿彌陀佛, 阿諛, 阿膠                         | ē / o1           |

The full list is the `POLYPHONES` table in `scripts/content/readings.ts`.

## Tones and metre (平仄)

Many lines in 《增廣賢文》 are verse, built on a pattern of **平** (level) and **仄** (oblique) tones. Modern Cantonese keeps this distinction better than Mandarin does:

| Group      | Cantonese tones                             |
| ---------- | ------------------------------------------- |
| 平 level   | **1** and **4**                             |
| 仄 oblique | **2, 3, 5, 6**, and every -p/-t/-k syllable |

The metre can settle a disputed reading. 豈可教人枉度春 follows the pattern 仄仄**平**平仄仄平, so the third character must be 平. That rules out 教 gaau3 (仄) and gives **gaau1** (平), which is also what the 《廣韻》 lists for the sense "let, cause" (古肴切).

Two caveats:

- A changed tone (變音) belongs to the group of its original tone. 錢 cin2 is still 平, because it comes from cin4.
- Mandarin doesn't map cleanly onto 平仄, because the old entering tones were spread across all four Mandarin tones. Check metre with the Cantonese reading, or with a rhyme dictionary.

## Pinyin

Pinyin uses **dictionary tones**, with no tone sandhi written: 一 yī, 不 bù. That way each character always shows the same reading the learner would find in a dictionary. Tone marks: ā (1st, high level), á (2nd, rising), ǎ (3rd, dipping), à (4th, falling), unmarked a (neutral).

## Still open for review

- **近** in 近水知魚性 and 近水樓臺先得月: gan6 (current) or kan5?
- **阿魏**: aa3 ngai6 (current) or o1 ngai6?
