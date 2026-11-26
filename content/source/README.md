# The source text

The lessons are built on the **common edition (通行本)** of 《增廣賢文》, the version most readers know. It opens 昔時賢文，誨汝諄諄 and ends 奉勸君子，各宜守己。只此呈示，萬無一失。 The text is in the public domain.

| File | What it is |
|---|---|
| `common-edition.yaml` | The base text, 351 lines, about 3,840 characters, with variant readings. Every lesson entry names the lines it covers (`source:`), and `npm run content:check` makes sure its text matches. |
| `corrections.yaml` | Fixes to the base text, each with its reason. The only file here to edit by hand. |
| `expanded-additions.yaml` | 93 lines found only in a later, expanded text. Not part of the common edition. |
| `supplement.yaml` | The supplement (補遺), 317 lines, a later continuation. Not part of the common edition. |

All four come from `scripts/source/import-wikisource.ts`, which downloads fixed revisions, so the result can be rebuilt and checked: `node scripts/source/import-wikisource.ts`.

## Where it comes from

Chinese Wikisource, page 《增廣昔時賢文》 (marked `{{PD-old}}`). Two of its revisions are two different transcriptions:

- **Revision 1955020 (2020-06-29): the base.** About 3,800 characters, in modern character forms, first entered in 2004.
- **Revision 2614365 (2025-11-09): the second witness.** It splits the text into 上集 and 下集 and uses old character forms (舊字形). Its 上集 has about 90 more lines than the common edition, many of them famous sayings such as 書到用時方恨少 and 一寸光陰一寸金. Its 下集 is the supplement. It also marks alternative readings (一作). Later revisions are not used: on 2026-03-29 the page header was vandalised.

### Why revision 1955020 is the base

Both revisions were checked against an independent modern annotated copy ([Sohu, 2017](https://www.sohu.com/a/124101427_498038), simplified characters):

- 93% of revision 1955020's clauses appear in it, against 68% of revision 2614365's 上集.
- 98% of its clauses that appear in either revision appear in 1955020.
- It ends where 1955020 ends.

Only 4 of the expanded text's extra lines appear in the modern copy. Three of them are lines 1955020 had dropped, now restored through `corrections.yaml`. The fourth (良藥苦口利於病，忠言逆耳利於行) is the base text's line 284 with its halves in the other order.

The modern copy was used only to compare readings. None of its text or notes is copied here.

## How the text was prepared

1. **Character forms.** Old forms are changed to Hong Kong standard forms by an explicit table in the import script (爲→為, 説→說, 髙→高, 裡→裏, 台→臺, 鑒→鑑…), so every change can be reviewed. Characters that are word choices, not just forms (纔, 喫, 癡), are kept.
2. **Variants.** Where the two revisions read differently, the base reading is kept and the other is listed under `variants`, with its source. Lines that the two revisions only split differently are not variants.
3. **Corrections.** Only clear errors in the base are fixed: mistakes from converting simplified to traditional characters (系馬→繫馬, 千鐘粟→千鍾粟), and typos contradicted by both the second revision and the modern copy (出家從夫→出嫁從夫, 空白茫→空自忙). Each is listed with its reason in `corrections.yaml`.

## Where the edition differs from the popular saying

In several lines the common edition differs from the form people quote today. The lessons keep the edition's text and give the popular form in the entry's notes:

| Line | Common edition | Popular form |
|---|---|---|
| 16 | 路遙知馬力，**事**久見人心 | 路遙知馬力，**日**久見人心 |
| 41 | **大家都**是命，半點不由人 | **萬般皆**是命，半點不由人 |
| 11 | 無心插柳柳成**陰** | 無心插柳柳成**蔭** |
| 284 | **忠言逆耳**利於行，**良藥苦口**利於病 | 良藥苦口利於病，忠言逆耳利於行 |
| 311 | 千里送**毫**毛，禮輕**仁**義重 | 千里送**鵝**毛，禮輕**情**義重 |
