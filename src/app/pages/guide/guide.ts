import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Tone {
  n: number;
  name: string;
  contour: string;
  /** Pitch at the start and end on a 1–5 scale, for the little pitch drawing. */
  from: number;
  to: number;
  char: string;
  meaning: string;
}

const TONES: Tone[] = [
  { n: 1, name: 'high level', contour: '55', from: 5, to: 5, char: '詩', meaning: 'poem' },
  { n: 2, name: 'rising', contour: '35', from: 3, to: 5, char: '史', meaning: 'history' },
  { n: 3, name: 'mid level', contour: '33', from: 3, to: 3, char: '試', meaning: 'try' },
  { n: 4, name: 'low falling', contour: '21', from: 2, to: 1, char: '時', meaning: 'time' },
  { n: 5, name: 'low rising', contour: '23', from: 2, to: 3, char: '市', meaning: 'market' },
  { n: 6, name: 'low level', contour: '22', from: 2, to: 2, char: '事', meaning: 'matter' },
];

/** A short guide to reading Jyutping and Pinyin, and how the app chooses readings. */
@Component({
  selector: 'app-guide',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <h2 lang="zh-Hant">讀音</h2>
      <p class="subtitle">How to read the pronunciation</p>
    </header>

    <section class="panel" aria-labelledby="tones-title">
      <h3 id="tones-title">粵拼的聲調 Jyutping tones</h3>
      <p>
        Each syllable ends in a number from 1 to 6. That's the <strong>tone</strong>, the pitch of
        the voice. In Cantonese the tone changes the meaning: <span lang="zh-Hant">詩</span> si1 is
        “poem” but <span lang="zh-Hant">事</span> si6 is “matter”.
      </p>
      <table>
        <caption class="visually-hidden">
          The six Cantonese tones, using the syllable si
        </caption>
        <thead>
          <tr>
            <th scope="col">Tone</th>
            <th scope="col">Pitch</th>
            <th scope="col">Example</th>
          </tr>
        </thead>
        <tbody>
          @for (t of tones; track t.n) {
            <tr>
              <th scope="row" class="num">{{ t.n }}</th>
              <td>
                <div class="pitch-cell" [title]="'Pitch ' + t.contour">
                  <svg class="pitch" viewBox="0 0 40 24" aria-hidden="true">
                    <line class="guide" x1="0" y1="2" x2="40" y2="2" />
                    <line class="guide" x1="0" y1="22" x2="40" y2="22" />
                    <line
                      class="contour"
                      x1="6"
                      [attr.y1]="y(t.from)"
                      x2="34"
                      [attr.y2]="y(t.to)"
                    />
                  </svg>
                  <span>{{ t.name }}</span>
                </div>
              </td>
              <td>
                <span class="nowrap"
                  ><span lang="zh-Hant" class="zh">{{ t.char }}</span> si{{ t.n }}</span
                >
                <span class="meaning">{{ t.meaning }}</span>
              </td>
            </tr>
          }
        </tbody>
      </table>
      <p class="small">
        The red line shows how the voice moves, from the bottom (lowest) to the top (highest) of
        your speaking range.
      </p>
      <p>
        Syllables ending in <strong>-p, -t, -k</strong> are short and clipped. They use 1, 3 or 6
        for high, mid or low pitch: <span lang="zh-Hant">一</span> jat1,
        <span lang="zh-Hant">八</span> baat3, <span lang="zh-Hant">六</span> luk6.
      </p>
    </section>

    <section class="panel" aria-labelledby="letters-title">
      <h3 id="letters-title">Letters that surprise English speakers</h3>
      <dl class="letters">
        <dt>j</dt>
        <dd>like <em>y</em> in “yes”: <span lang="zh-Hant">人</span> jan4</dd>
        <dt>z</dt>
        <dd>like <em>dz</em>: <span lang="zh-Hant">早</span> zou2</dd>
        <dt>c</dt>
        <dd>like <em>ts</em>, with a puff of air: <span lang="zh-Hant">錢</span> cin2</dd>
        <dt>ng</dt>
        <dd>the <em>ng</em> of “sing”, even at the start: <span lang="zh-Hant">我</span> ngo5</dd>
        <dt>aa / a</dt>
        <dd>long and short <em>a</em>: <span lang="zh-Hant">行</span> haang4</dd>
        <dt>oe, eo</dt>
        <dd>rounded, like German <em>ö</em>: <span lang="zh-Hant">春</span> ceon1</dd>
        <dt>yu</dt>
        <dd>like French <em>u</em>: <span lang="zh-Hant">魚</span> jyu4</dd>
      </dl>
    </section>

    <section class="panel" aria-labelledby="spoken-title">
      <h3 id="spoken-title">說話的讀法 Read as it's spoken</h3>
      <p>
        Some characters have a literary reading (<span lang="zh-Hant">文讀</span>) and an everyday
        one (<span lang="zh-Hant">白讀</span>). These proverbs are things people say, so the app
        gives each word the reading you'd hear in Hong Kong conversation:
        <span lang="zh-Hant">有錢</span> jau5 cin2 and <span lang="zh-Hant">早行</span> zou2 haang4,
        but <span lang="zh-Hant">錢財</span> cin4 coi4, because that's how people say those words.
      </p>
      <p>
        In verse, tones 1 and 4 count as level (<span lang="zh-Hant">平</span>) and the rest as
        oblique (<span lang="zh-Hant">仄</span>). That's why <span lang="zh-Hant">莫教貧</span> has
        <span lang="zh-Hant">教</span> gaau1 (“let”), not gaau3 (“teach”).
      </p>
    </section>

    <section class="panel" aria-labelledby="pinyin-title">
      <h3 id="pinyin-title">拼音 Pinyin</h3>
      <p>
        Mandarin has four tones, shown as marks over the vowel: ā high level, á rising, ǎ dipping, à
        falling. The app shows each character's dictionary tone, so
        <span lang="zh-Hant">一</span> is always yī and <span lang="zh-Hant">不</span> always bù.
      </p>
    </section>

    <p class="actions">
      <a class="pill" routerLink="/settings">設定 Settings</a>
      <a class="pill" href="https://github.com/foodisready/worthy-words/blob/main/docs/readings.md"
        >Full readings guide</a
      >
    </p>
  `,
  styles: `
    :host {
      display: grid;
      gap: 1rem;
    }
    .page-header {
      margin-bottom: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.5rem 0;
    }
    th,
    td {
      text-align: left;
      padding: 0.45rem 0.4rem;
      border-bottom: 1px solid var(--line);
      vertical-align: middle;
    }
    thead th {
      font-size: 0.8rem;
      font-weight: normal;
      color: var(--muted);
    }
    .num {
      font-size: 1.2rem;
      width: 2.5rem;
    }
    .pitch-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    p span[lang],
    dd span[lang],
    .nowrap {
      white-space: nowrap;
    }
    .meaning {
      display: block;
      color: var(--muted);
      font-size: 0.85rem;
    }
    .pitch {
      flex: none;
      width: 2.5rem;
      height: 1.5rem;
    }
    .guide {
      stroke: var(--line);
      stroke-width: 1;
    }
    .contour {
      stroke: var(--accent);
      stroke-width: 3;
      stroke-linecap: round;
    }
    .zh {
      font-family: var(--font-serif-zh);
      font-size: 1.15rem;
    }
    .muted {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .small {
      font-size: 0.85rem;
      color: var(--muted);
    }
    .letters {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 0.4rem 1rem;
      margin: 0;
    }
    .letters dt {
      font-weight: 600;
    }
    .letters dd {
      margin: 0;
    }
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class GuidePage {
  protected readonly tones = TONES;

  /** Maps pitch 1–5 to a y coordinate (5 at the top). */
  protected y(pitch: number): number {
    return 22 - (pitch - 1) * 5;
  }
}
