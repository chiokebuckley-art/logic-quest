/**
 * Stop 1 statements engine. Every answer and every claim in an explanation is re-checked here with an
 * evaluator written separately from the engine, by brute force over all ways to fill the face-down cards.
 */
import { describe, expect, it } from 'vitest';
import { FRESH_CONTRAST, L1_RULE, L2_EXAMPLES, L3_EXAMPLE, SENTENCES, TEACH_SENTENCES, isStatement, rowSentence, sentenceId, stop1 } from '../../content/stop1';
import { explanationFor } from '../../game/explanation';
import {
  CANT_TELL_TERM,
  CARD,
  FACE_DOWN_TERM,
  FRAMES,
  KINDS,
  NOT_BANK,
  NOT_CONFLICT_KEYS,
  NOT_KEYS,
  NOT_TAGS,
  ROW_RULE,
  ROW_TEMPLATES,
  holds,
  isExactOpposite,
  judge,
  notItem,
  rowItem,
  stmtId,
  rowStatement,
  say,
  truthTable,
  type Card,
  type Claim,
  type Desc,
  type ItemCore,
  type Stmt,
  type Verdict,
} from '../puzzles/statements';
import { freshCheckSet } from '../fresh';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng, type Rng } from '../rng';
import { feedbackText, teachStrings } from '../teach';
import type { ChooseItem, Item, TeachCase, Thing } from '../types';

// ---------- an independent evaluator ----------

const COLORS = ['red', 'blue', 'yellow'] as const;
const SHAPES = ['circle', 'square', 'triangle'] as const;
const SIZES = ['big', 'small'] as const;
const ALL: Card[] = [];
for (const color of COLORS) for (const shape of SHAPES) for (const size of SIZES) ALL.push({ color, shape, size });

const refFits = (c: Card, d: Desc) => (Object.keys(d) as (keyof Card)[]).every((k) => c[k] === d[k]);
const both = (a: Desc, b: Desc) => (c: Card) => refFits(c, a) && refFits(c, b);

function refHolds(s: Stmt, cards: readonly Card[]): boolean {
  const n = (test: (c: Card) => boolean) => cards.filter(test).length;
  switch (s.t) {
    case 'some': return n((c) => refFits(c, s.d)) > 0;
    case 'someNot': return n((c) => !refFits(c, s.d)) > 0;
    case 'none': return n((c) => refFits(c, s.d)) === 0;
    case 'every': return n((c) => refFits(c, s.d)) === cards.length;
    case 'everyIs': return n(both(s.a, s.b)) === n((c) => refFits(c, s.a));
    case 'someIsNot': return n((c) => refFits(c, s.a) && !refFits(c, s.b)) > 0;
    case 'noneIs': return n(both(s.a, s.b)) === 0;
    case 'count': {
      const m = n((c) => refFits(c, s.d) !== !!s.not);
      return { eq: m === s.k, ne: m !== s.k, ge: m >= s.k, gt: m > s.k, lt: m < s.k, le: m <= s.k }[s.op];
    }
    case 'more': return n((c) => refFits(c, s.a)) > n((c) => refFits(c, s.b));
    case 'asMany': return n((c) => refFits(c, s.a)) >= n((c) => refFits(c, s.b));
    case 'pos': {
      const c = s.at === 'first' ? cards[0] : cards[cards.length - 1];
      return !!c && refFits(c, s.d) !== !!s.not;
    }
  }
}

const plain = (t: Card): Card => ({ color: t.color, shape: t.shape, size: t.size });

/** Calls visit(cards) once for each way to fill the face-down cards (18 kinds each). */
function eachFilling(row: readonly Thing[], visit: (cards: Card[]) => void): number {
  const hidden = row.flatMap((t, i) => (t.hidden ? [i] : []));
  const cards = row.map(plain);
  let count = 0;
  const go = (j: number) => {
    if (j === hidden.length) {
      count++;
      visit(cards);
      return;
    }
    for (const k of ALL) {
      cards[hidden[j]] = k;
      go(j + 1);
    }
  };
  go(0);
  return count;
}

function refVerdict(s: Stmt, row: readonly Thing[]): Verdict {
  let t = false, f = false;
  eachFilling(row, (cards) => {
    if (refHolds(s, cards)) t = true;
    else f = true;
  });
  return t && f ? 'cant' : t ? 'true' : 'false';
}

// ---------- random statements and rows ----------

function randDesc(r: Rng): Desc {
  const d: Desc = {};
  if (r.chance(0.5)) d.color = r.pick(COLORS);
  if (r.chance(0.4)) d.shape = r.pick(SHAPES);
  if (r.chance(0.3)) d.size = r.pick(SIZES);
  if (!Object.keys(d).length) d.color = r.pick(COLORS);
  return d;
}

function randStmt(r: Rng): Stmt {
  const ops = ['eq', 'ne', 'ge', 'gt', 'lt', 'le'] as const;
  switch (r.int(0, 10)) {
    case 0: return { t: 'some', d: randDesc(r) };
    case 1: return { t: 'someNot', d: randDesc(r) };
    case 2: return { t: 'none', d: randDesc(r) };
    case 3: return { t: 'every', d: randDesc(r) };
    case 4: return { t: 'everyIs', a: randDesc(r), b: randDesc(r) };
    case 5: return { t: 'someIsNot', a: randDesc(r), b: randDesc(r) };
    case 6: return { t: 'noneIs', a: randDesc(r), b: randDesc(r) };
    case 7: return { t: 'count', d: randDesc(r), op: r.pick(ops), k: r.int(0, 4), not: r.chance(0.3) };
    case 8: return { t: 'more', a: randDesc(r), b: randDesc(r) };
    case 9: return { t: 'asMany', a: randDesc(r), b: randDesc(r) };
    default: return { t: 'pos', at: r.pick(['first', 'last'] as const), d: randDesc(r), not: r.chance(0.5) };
  }
}

const randCards = (r: Rng, lo: number, hi: number): Card[] => Array.from({ length: r.int(lo, hi) }, () => r.pick(ALL));

function randRow(r: Rng): Thing[] {
  const cards = randCards(r, 1, 5);
  const h = r.int(0, Math.min(2, cards.length));
  const hidden = new Set(r.shuffle(cards.map((_, i) => i)).slice(0, h));
  return cards.map((c, i) => ({ id: `c${i + 1}`, ...c, ...(hidden.has(i) ? { hidden: true } : {}) }));
}

/** Every row of 1-3 cards. */
const SMALL_ROWS: Card[][] = [];
for (const a of ALL) {
  SMALL_ROWS.push([a]);
  for (const b of ALL) {
    SMALL_ROWS.push([a, b]);
    for (const c of ALL) SMALL_ROWS.push([a, b, c]);
  }
}

// ---------- reading the engine's words back ----------

const WORD: Record<string, [keyof Card, string]> = {};
for (const c of COLORS) WORD[c] = ['color', c];
for (const s of SHAPES) {
  WORD[s] = ['shape', s];
  WORD[`${s}s`] = ['shape', s];
}
for (const z of SIZES) WORD[z] = ['size', z];
const NUMBER: Record<string, number> = { no: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, a: 1, an: 1, just: 1 };

/** "big red circle" -> { size: 'big', color: 'red', shape: 'circle' }. Nouns like "cards" or "dragons" add nothing. */
function descOf(phrase: string): Desc {
  const d: Desc = {};
  for (const w of phrase.trim().split(/\s+/)) {
    const e = WORD[w];
    if (e) (d as Record<string, string>)[e[0]] = e[1];
  }
  return d;
}


const choose = (it: { kind: string }) => it as ChooseItem;

// ---------- tests ----------

describe('card statements', () => {
  it('holds() matches hand-checked rows', () => {
    const row: Card[] = [
      { shape: 'circle', color: 'red', size: 'big' },
      { shape: 'square', color: 'red', size: 'small' },
      { shape: 'triangle', color: 'blue', size: 'big' },
    ];
    expect(holds({ t: 'some', d: { color: 'blue' } }, row)).toBe(true);
    expect(holds({ t: 'every', d: { color: 'red' } }, row)).toBe(false);
    expect(holds({ t: 'none', d: { color: 'red' } }, row)).toBe(false);
    expect(holds({ t: 'someNot', d: { color: 'red' } }, row)).toBe(true);
    expect(holds({ t: 'count', d: { color: 'red' }, op: 'eq', k: 2 }, row)).toBe(true);
    expect(holds({ t: 'count', d: { shape: 'circle' }, op: 'ge', k: 2 }, row)).toBe(false);
    expect(holds({ t: 'more', a: { color: 'red' }, b: { color: 'blue' } }, row)).toBe(true);
    expect(holds({ t: 'everyIs', a: { size: 'big' }, b: { color: 'red' } }, row)).toBe(false);
    expect(holds({ t: 'everyIs', a: { color: 'yellow' }, b: { shape: 'circle' } }, row)).toBe(true); // no yellow card
    expect(holds({ t: 'pos', at: 'first', d: { shape: 'circle' } }, row)).toBe(true);
    expect(holds({ t: 'pos', at: 'last', d: { shape: 'circle' }, not: true }, row)).toBe(true);
  });

  it('holds() agrees with an independent evaluator on 20,000 random statements and rows', () => {
    const r = createRng(101);
    for (let i = 0; i < 20000; i++) {
      const s = randStmt(r);
      const cards = randCards(r, 0, 6);
      expect(holds(s, cards), `${JSON.stringify(s)} on ${JSON.stringify(cards)}`).toBe(refHolds(s, cards));
    }
  });

  it('judge() tries all 18^k fillings and agrees with brute force', () => {
    const r = createRng(202);
    for (let i = 0; i < 1500; i++) {
      const s = randStmt(r);
      const row = randRow(r);
      const h = row.filter((t) => t.hidden).length;
      expect(truthTable(s, row).table.length).toBe(18 ** h);
      expect(judge(s, row), JSON.stringify([s, row])).toBe(refVerdict(s, row));
    }
    expect(KINDS.length).toBe(18);
  });

  it('every row template gives a real statement that the engine judges like brute force', () => {
    const r = createRng(303);
    for (const tpl of ROW_TEMPLATES) {
      let made = 0;
      for (let i = 0; i < 60; i++) {
        const row: Thing[] = randCards(r, 4, 6).map((c, j) => ({ id: `c${j + 1}`, ...c, ...(j === 1 ? { hidden: true } : {}) }));
        const s = rowStatement(r, tpl, row);
        if (!s) continue;
        made++;
        expect(judge(s, row)).toBe(refVerdict(s, row));
      }
      expect(made, tpl).toBeGreaterThan(20);
    }
  });
});

/** "a" before a consonant sound and "an" before a vowel sound. Every word the engine puts after "a"/"an" is a plain one. */
function articleMistakes(text: string): string[] {
  return [...text.matchAll(/\b(a|an) ([a-z]+)/gi)].filter(([, a, w]) => /^[aeiou]/i.test(w) !== (a.toLowerCase() === 'an')).map(([x]) => x);
}

function allText(it: ItemCore): string {
  const scene = it.scene?.kind === 'text' ? it.scene.lines : [];
  return [it.prompt, ...scene, it.explain, it.hint ?? '', ...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}), ...teachStrings(it as unknown as Item)].join('\n');
}

describe('words', () => {
  it('“a” and “an” are right in every generated sentence', () => {
    let elves = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const frame of FRAMES) {
        const row = rowItem(createRng(seed), { frame }).item;
        const flip = notItem(createRng(seed), { frame, key: NOT_KEYS[seed % NOT_KEYS.length] }).item;
        for (const it of [row, flip]) expect(articleMistakes(allText(it)), allText(it)).toEqual([]);
        if (row.prompt.startsWith('An elf used magic')) elves++;
      }
    }
    expect(elves).toBeGreaterThan(0);
    expect(articleMistakes('A elf and an card, but an elf and a card.')).toEqual(['A elf', 'an card']);
  });
});

describe("true, false or can't tell (lesson 2)", () => {
  const targets: (Verdict | undefined)[] = ['true', 'false', 'cant', undefined];

  it('answers are the brute-force verdict, over hundreds of seeds', () => {
    const seen = { true: 0, false: 0, cant: 0 };
    for (let seed = 1; seed <= 150; seed++) {
      for (const frame of FRAMES) {
        for (const target of targets) {
          const m = rowItem(createRng(seed * 7 + frame.length), { frame, target });
          const it = m.item;
          expect(it.scene?.kind).toBe('things');
          const row = it.scene?.kind === 'things' ? it.scene.things : [];
          const h = row.filter((t) => t.hidden).length;
          expect(row.length).toBeGreaterThanOrEqual(4);
          expect(row.length).toBeLessThanOrEqual(6);
          expect(h).toBeGreaterThanOrEqual(1);
          expect(h).toBeLessThanOrEqual(3);
          const v = refVerdict(m.stmt!, row);
          expect(it.answer, `seed ${seed} ${say(m.stmt!)}`).toBe(v);
          if (target) expect(v).toBe(target);
          expect(it.prompt).toContain(say(m.stmt!));
          expect(it.choices.map((c) => c.label)).toEqual(['True', 'False', 'Can’t tell']);
          expect(it.choices.map((c) => c.id)).toEqual(['true', 'false', 'cant']);
          expect(Object.keys(it.whyWrong ?? {}).sort()).toEqual(['cant', 'false', 'true'].filter((x) => x !== v));
          seen[v]++;
        }
      }
    }
    expect(Math.min(seen.true, seen.false, seen.cant)).toBeGreaterThan(200);
  });

  it("every sentence of a can't-tell explanation holds for every filling it talks about", () => {
    let checked = 0;
    for (let seed = 1; seed <= 250; seed++) {
      const m = rowItem(createRng(seed), { frame: 'abstract', target: 'cant' });
      const row = m.item.scene?.kind === 'things' ? m.item.scene.things : [];
      const hidden = row.flatMap((t, i) => (t.hidden ? [i] : []));
      const claims = m.claims as Claim[];
      expect(claims.map((c) => c.value)).toEqual([true, false]);
      for (const c of claims) {
        let met = 0;
        eachFilling(row, (cards) => {
          const fitsP = (x: Card) => refFits(x, c.p.d) !== !!c.p.not;
          const cond = c.card === 'all' ? hidden.every((i) => fitsP(cards[i])) : fitsP(cards[hidden[c.card]]);
          if (!cond) return;
          met++;
          expect(refHolds(m.stmt!, cards), `seed ${seed}: ${m.item.explain}`).toBe(c.value);
        });
        expect(met, `seed ${seed}: the case "${JSON.stringify(c)}" can happen`).toBeGreaterThan(0);
        if (c.card !== 'all') expect(m.item.explain).toContain(`face-down card ${hidden[c.card] + 1}`);
        checked++;
      }
      expect(m.item.explain).toMatch(/So you can’t tell yet\.$/);
      expect(m.item.explain).not.toMatch(/are not /); // "all three are not red" is unclear; the engine says "none of" or "neither"
    }
    expect(checked).toBe(500);
  });

  it('settled explanations only cite cards you can see, and cite them correctly', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const target = seed % 2 ? 'true' : 'false';
      const m = rowItem(createRng(seed), { frame: 'abstract', target });
      const row = m.item.scene?.kind === 'things' ? m.item.scene.things : [];
      const text = m.item.explain;
      expect(text).toContain(`So it is ${target}, no matter what is face down.`);
      let cited = 0;
      for (const [, n, phrase] of text.matchAll(/Card (\d+) is ([^.]+)\./g)) {
        const card = row[Number(n) - 1];
        expect(card.hidden, text).toBeFalsy();
        const [, pos, neg, but] = phrase.match(/^(.*?)(?:, not (.*)|, but it is (.*))?$/)!;
        expect(refFits(card, descOf(pos)), text).toBe(true);
        if (but) expect(refFits(card, descOf(but)), text).toBe(true);
        if (neg) expect(refFits(card, descOf(neg)), text).toBe(false);
        cited++;
      }
      for (const [, n1, p1, n2, p2] of text.matchAll(/You can (?:already )?see (\w+) ([a-z ]+?)(?: and (\w+) ([a-z ]+?))?\./g)) {
        const vis = row.filter((t) => !t.hidden);
        expect(vis.filter((c) => refFits(c, descOf(p1))).length, text).toBe(NUMBER[n1]);
        if (n2) expect(vis.filter((c) => refFits(c, descOf(p2))).length, text).toBe(NUMBER[n2]);
        cited++;
      }
      if (!cited) expect(text).toMatch(/^Even if /);
    }
  });

  it("conflict items are can't-tell rows where the cards you can see point one way", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const m = rowItem(createRng(seed), { frame: 'everyday', conflict: true });
      const row = m.item.scene?.kind === 'things' ? m.item.scene.things : [];
      expect(m.item.conflict).toBe(true);
      expect(m.item.answer).toBe('cant');
      expect(m.stmt!.t).not.toBe('pos');
      // What the visible cards alone say is exactly what a hasty reader answers.
      const looks = refHolds(m.stmt!, row.filter((t) => !t.hidden)) ? 'true' : 'false';
      expect(m.item.whyWrong?.[looks]).toBeTruthy();
    }
  });

  it('the worked examples on the key-idea cards say what the cards show', () => {
    const { look, cant, settled } = L2_EXAMPLES;
    expect(refVerdict({ t: 'some', d: { color: 'blue' } }, look)).toBe('true');
    expect(look[1].color).toBe('blue');
    expect(refVerdict({ t: 'some', d: { color: 'yellow' } }, cant)).toBe('cant');
    expect(cant[2].hidden).toBe(true);
    expect(cant.filter((t) => !t.hidden).some((t) => t.color === 'yellow')).toBe(false);
    expect(refVerdict({ t: 'some', d: { color: 'red' } }, settled)).toBe('true');
    expect(settled[0].color).toBe('red');
    expect(settled[1].hidden).toBe(true);
    expect(refVerdict({ t: 'every', d: { color: 'red' } }, settled)).toBe('false');
    expect(settled[2].color).toBe('blue');
    // "Not every card is red. But “No card is red” is false too."
    expect(refHolds({ t: 'every', d: { color: 'red' } }, L3_EXAMPLE)).toBe(false);
    expect(refHolds({ t: 'none', d: { color: 'red' } }, L3_EXAMPLE)).toBe(false);
  });
});

describe('the NOT flip (lesson 3)', () => {
  it('every bank entry: the right answer is the exact opposite, and no wrong pick is', () => {
    const fresh = createRng(404);
    const rows = [...SMALL_ROWS, ...Array.from({ length: 1000 }, () => randCards(fresh, 3, 6))];
    for (const key of NOT_KEYS) {
      for (let seed = 1; seed <= 12; seed++) {
        const c = NOT_BANK[key](createRng(seed));
        const bad = rows.find((row) => refHolds(c.right, row) === refHolds(c.s, row));
        expect(bad, `${key}: “${say(c.right)}” is not the opposite on this row`).toBeUndefined();
        for (const w of c.wrongs) {
          expect(rows.some((row) => refHolds(w.s, row) === refHolds(c.s, row)), `${key}: ${say(w.s)} is a real opposite`).toBe(true);
          expect(isExactOpposite(c.s, w.s)).toBe(false);
        }
        expect(NOT_CONFLICT_KEYS.includes(key)).toBe(c.conflict);
      }
    }
  });

  it('items: labels, answer, and every example and case in the teaching check out on hundreds of seeds', () => {
    const fresh = createRng(505);
    const rows = [...SMALL_ROWS.filter((r) => r.length <= 2), ...Array.from({ length: 400 }, () => randCards(fresh, 3, 6))];
    let checked = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const frame of FRAMES) {
        for (const key of NOT_KEYS) {
          const m = notItem(createRng(seed * 31 + key.length), { frame, key });
          const it = m.item;
          const f = m.flip!;
          expect(it.choices.length).toBeGreaterThanOrEqual(3);
          expect(it.choices.length).toBeLessThanOrEqual(4);
          const right = it.choices.find((c) => c.id === it.answer)!;
          expect(right.label).toBe(say(f.right, f.noun));
          expect(right.id).toBe(stmtId(f.right));
          expect(rows.find((row) => refHolds(f.right, row) === refHolds(f.s, row))).toBeUndefined();
          const wrongChoices = it.choices.filter((c) => c.id !== it.answer);
          expect(wrongChoices.map((c) => c.label)).toEqual(f.wrongs.map((w) => say(w, f.noun)));
          expect(Object.keys(it.feedback ?? {}).sort()).toEqual(wrongChoices.map((c) => c.id).sort());
          expect(Object.keys(it.whyWrong ?? {}).sort()).toEqual(wrongChoices.map((c) => c.id).sort());
          wrongChoices.forEach((c, i) => {
            // Each choice keeps its own feedback however the choices are shuffled: the id names the sentence.
            expect(c.id).toBe(stmtId(f.wrongs[i]));
            const fb = it.feedback![c.id];
            const row = f.examples[i];
            const [whose, yours, not] = fb.example!.truths!;
            expect(whose.value, `${say(f.s)} / ${c.label}`).toBe(refHolds(f.s, row));
            expect(yours).toEqual({ who: 'Your answer', value: refHolds(f.wrongs[i], row) });
            expect(not).toEqual({ who: 'The NOT answer', value: refHolds(f.right, row) });
            // The case proves the pick wrong: the statement and the pick agree there; the NOT does not.
            expect(whose.value).toBe(yours.value);
            expect(not.value).toBe(!whose.value);
            // The picture shows exactly the cards of the row.
            const drawn = fb.example!.things?.length ?? fb.example!.groups!.reduce((n, g) => n + g.n, 0);
            expect(drawn).toBe(row.length);
            expect(it.whyWrong![c.id]).toBe([fb.headline, ...fb.detail].join(' '));
            checked++;
          });
          // The item's cases: the statement and its NOT always disagree, and both truth values appear.
          const cases = it.teach!.cases!;
          expect(cases.length).toBeGreaterThanOrEqual(2);
          cases.forEach((cs, k) => {
            const [whose, not] = cs.truths!;
            expect(whose.value).toBe(refHolds(f.s, f.cases[k]));
            expect(not.value).toBe(!whose.value);
          });
          expect(new Set(cases.map((cs) => cs.truths![0].value)).size).toBe(2);
          expect(it.teach!.rule).toBe('NOT means the original statement is false.');
          // The classic every <-> none mistake is always offered on conflict items.
          if (it.conflict) {
            const classic = f.s.t === 'every' || f.s.t === 'everyIs' ? 'none' : 'every';
            expect(f.wrongs.some((w) => w.t === classic || (classic === 'none' && w.t === 'noneIs'))).toBe(true);
          }
          if (f.noun !== CARD) expect(JSON.stringify([f.s, f.wrongs])).not.toContain('shape');
        }
      }
    }
    expect(checked).toBeGreaterThan(1500);
  });

  it('teaches NOT, never only “the exact opposite”, and never says “that row” or an unexplained “both”', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const key of NOT_KEYS) {
        const it = notItem(createRng(seed), { frame: FRAMES[seed % 3], key }).item;
        const text = allText(it);
        expect(text).not.toMatch(/exact opposite/i);
        expect(text).not.toMatch(/that row|both (are )?(true|false)/i);
        expect(it.prompt).toMatch(/NOT/);
        expect(it.prompt).toMatch(/true whenever .* is false, and false whenever it is true/);
      }
    }
  });
});

describe('NOT flip feedback names a real case the wrong pick misses', () => {
  const colorOf = (s: Stmt) => (s.t === 'count' ? s.d.color : undefined);
  it('“Exactly k”: “More than k” leaves out the smaller counts (no cards at all when k is one)', () => {
    const ks = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const m = notItem(createRng(seed), { frame: FRAMES[seed % 3], key: 'exactColor' });
      const f = m.flip!;
      if (f.s.t !== 'count') throw new Error('not a count');
      const k = f.s.k;
      const c = colorOf(f.s)!;
      ks.add(k);
      const gt = m.item.choices.find((ch) => ch.label === say({ t: 'count', d: { color: c }, op: 'gt', k }, f.noun));
      if (!gt) continue;
      const why = m.item.whyWrong![gt.id];
      expect(why).not.toContain('fewer than one');
      const missed = k === 1 ? `There could also be no ${c} ${f.noun.many}.` : `There could also be fewer than ${['', 'one', 'two', 'three'][k]} ${c} ${f.noun.many}.`;
      expect(why).toContain(missed);
      // The case it names: the statement is false, the right opposite is true, and the pick is false.
      const row: Card[] = Array.from({ length: k - 1 }, () => ({ color: c, shape: 'circle', size: 'big' }));
      row.push({ color: c === 'red' ? 'blue' : 'red', shape: 'square', size: 'small' });
      expect(refHolds(f.s, row)).toBe(false);
      expect(refHolds(f.right, row)).toBe(true);
      expect(refHolds({ t: 'count', d: { color: c }, op: 'gt', k }, row)).toBe(false);
    }
    expect(ks.has(1) && ks.has(2)).toBe(true);
  });

  it('“More red than blue”: “No card is red” goes too far, named with both colors', () => {
    let seen = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const m = notItem(createRng(seed), { frame: FRAMES[seed % 3], key: 'moreColor' });
      const f = m.flip!;
      if (f.s.t !== 'more') throw new Error('not more');
      const [c1, c2] = [f.s.a.color!, f.s.b.color!];
      const none = m.item.choices.find((ch) => ch.label === say({ t: 'none', d: { color: c1 } }, f.noun));
      if (!none) continue;
      seen++;
      const n = f.noun.many;
      expect(m.item.whyWrong![none.id]).toContain(`There can be some ${c1} ${n} and still not more ${c1} ${n} than ${c2} ${n}.`);
      // One card of each color: some c1, not more c1 than c2, and "No card is c1" is false.
      const row: Card[] = [{ color: c1, shape: 'circle', size: 'big' }, { color: c2, shape: 'circle', size: 'big' }];
      expect(refHolds(f.s, row)).toBe(false);
      expect(refHolds(f.right, row)).toBe(true);
      expect(refHolds({ t: 'none', d: { color: c1 } }, row)).toBe(false);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it('“At least k”: “At most k” still allows exactly k', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const m = notItem(createRng(seed), { frame: 'abstract', key: 'atLeastShape' });
      const s = m.flip!.s;
      if (s.t !== 'count' || !s.d.shape) throw new Error('not a shape count');
      const { k, d } = s;
      const shape = s.d.shape;
      const le = m.item.choices.find((ch) => ch.label === say({ t: 'count', d, op: 'le', k }));
      if (!le) continue;
      const fb = m.item.feedback![le.id];
      expect(fb.headline).toBe(`Your answer still allows exactly ${['', 'one', 'two', 'three'][k]} ${shape}s.`);
      expect(fb.simpler!.join(' ')).toContain(`Imagine exactly ${k} ${shape}s.`);
      const row: Card[] = Array.from({ length: k }, () => ({ color: 'red', shape, size: 'big' }));
      expect(refHolds(s, row)).toBe(true);
      expect(refHolds({ t: 'count', d, op: 'le', k }, row)).toBe(true);
    }
  });

  it('feedback quotes end with the period inside the closing quote', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const key of NOT_KEYS) {
        const it = notItem(createRng(seed), { frame: FRAMES[seed % 3], key }).item;
        for (const text of [it.explain, ...Object.values(it.whyWrong ?? {})]) expect(text, text).not.toMatch(/”\./);
      }
    }
  });
});

describe('stop 1 sets', () => {
  /** The sentence-bank sentences a lesson 1 item shows (its scene sentence, or its choices). */
  const bankSentences = (it: ChooseItem) => (it.scene?.kind === 'text' ? it.scene.lines : it.choices.map((c) => c.label));
  const key = (it: ChooseItem) => JSON.stringify([it.prompt, it.scene ?? null]);
  /** "Every card is red." -> "Every X is X." */
  const pattern = (line: string) =>
    (line.match(/“(.*)”/)?.[1] ?? line).replace(
      /\b(red|blue|yellow|circles?|squares?|triangles?|big|small|no|one|two|three|cards?|balloons?|shirts?|cars?|dragons?|potions?|gems?)\b/g,
      'X',
    );

  it('a check never repeats an item, a bank sentence or a kind of opposite (500 seeds)', () => {
    let extraNots = 0;
    for (let seed = 1; seed <= 500; seed++) {
      const items = stop1.check!(createRng(seed)).map(choose);
      expect(new Set(items.map(key)).size, `seed ${seed}`).toBe(items.length);
      const shown = items.filter((i) => i.lesson === 's1.l1').flatMap(bankSentences);
      expect(new Set(shown).size, `seed ${seed}: ${shown.join(' | ')}`).toBe(shown.length);
      const nots = items.filter((i) => i.lesson === 's1.l3');
      expect(new Set(nots.map((i) => i.skill)).size, `seed ${seed}: ${nots.map((i) => i.skill)}`).toBe(nots.length);
      const lines = nots.map((i) => (i.scene?.kind === 'text' ? pattern(i.scene.lines[0]) : ''));
      expect(new Set(lines).size, `seed ${seed}: ${lines.join(' | ')}`).toBe(nots.length);
      expect(nots[0].conflict).toBe(true);
      if (nots.length === 3) extraNots++;
    }
    expect(extraNots).toBeGreaterThan(50);
    expect(new Set(Object.values(NOT_TAGS)).size).toBeGreaterThanOrEqual(5);
  });

  it('a lesson practice set never repeats an item or a bank sentence', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (const l of stop1.lessons) {
        const items = l.practice(createRng(seed)).map(choose);
        expect(new Set(items.map(key)).size, `${l.id} seed ${seed}`).toBe(items.length);
        if (l.id === 's1.l1') {
          const shown = items.flatMap(bankSentences);
          expect(new Set(shown).size, `seed ${seed}: ${shown.join(' | ')}`).toBe(shown.length);
        }
      }
    }
  });
});

describe('the sentence bank (lesson 1)', () => {
  it('has 40+ labelled sentences of every kind, all different', () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(SENTENCES.map((s) => s.text)).size).toBe(SENTENCES.length);
    for (const kind of ['true', 'false', 'unknown', 'question', 'command', 'opinion', 'feeling'] as const) {
      expect(SENTENCES.filter((s) => s.kind === kind).length, kind).toBeGreaterThanOrEqual(3);
    }
    for (const s of SENTENCES) {
      if (s.kind === 'question') expect(s.text).toMatch(/\?$/);
      else if (s.kind === 'feeling') expect(s.text).toMatch(/!$/);
      else expect(s.text).toMatch(/\.$/);
      expect(s.text.split(/\s+/).length).toBeLessThanOrEqual(12);
    }
  });

  it('lesson 1 items: the one right answer follows the labels', () => {
    const byText = new Map(SENTENCES.map((s) => [s.text, s]));
    for (let seed = 1; seed <= 300; seed++) {
      for (const it of stop1.lessons[0].practice(createRng(seed)).map(choose)) {
        if (it.scene?.kind === 'text') {
          const s = byText.get(it.scene.lines[0])!;
          expect(it.answer).toBe(isStatement(s.kind) ? 'yes' : 'no');
          expect(!!it.conflict).toBe(s.kind === 'false');
        } else {
          const findStatement = it.prompt === 'Which of these is a statement?';
          const hits = it.choices.filter((c) => isStatement(byText.get(c.label)!.kind) === findStatement);
          expect(hits.map((c) => c.id)).toEqual([it.answer]);
        }
      }
    }
  });
});

// ---------- wrong answers teach first: lessons 1 and 2 (handoff v1.0) ----------
//
// Test key (named in docs/audit/stop1.md):
//   T-teach  every item has a rule, its words defined, 2-4 cases, Remember with a question, and a simpler example
//   T-truth  every truth on every case and example card is recomputed here, apart from the engine
//   T-cover  the cases cover every way the item can go (both sides of the line; true and false fillings)
//   T-proof  every wrong choice has feedback, in step with whyWrong, and its example card proves the gap
//   T-kind   one headline per kind of mistake, and no headline serves two kinds
//   T-ids    choice ids come from the words, so a shuffle never changes which explanation shows
//   T-fresh  the new examples after a miss keep the skill and check the other side of the edge
//   T-read   each item's full text reads at grade 7 or lower, sentences of 25 words or fewer, curly quotes

type Sentence = (typeof SENTENCES)[number];
const KIND_IS_STATEMENT: Record<string, boolean> = { true: true, false: true, unknown: true, question: false, command: false, opinion: false, feeling: false };

/** Every item of a lesson a player can meet: practice, the check, the Arcade, and the new examples after a miss. */
function lessonItems(lesson: string, seeds: number): ChooseItem[] {
  const l = stop1.lessons.find((x) => x.id === lesson)!;
  const out: ChooseItem[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const practice = l.practice(createRng(seed)).map(choose);
    out.push(...practice, ...stop1.check!(createRng(seed)).filter((i) => i.lesson === lesson).map(choose));
    const arcade = stop1.practice!(createRng(seed));
    if (arcade.lesson === lesson) out.push(choose(arcade));
    for (const it of practice) out.push(...freshCheckSet(stop1, it, seed, [], 1).map(choose));
  }
  return out;
}

/** The whole text of an item, as the player can see or hear it. */
const itemText = (it: ChooseItem) => [it.prompt, it.explain, it.hint ?? '', ...teachStrings(it), ...Object.values(it.whyWrong ?? {})].join('\n');

function expectReadable(it: ChooseItem) {
  const text = itemText(it);
  expect(fkGrade(text), `${it.id}: ${text}`).toBeLessThanOrEqual(READING.maxGrade);
  const long = longestSentence(text);
  expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
  expect(text, 'curly quotes only').not.toMatch(/"/);
  expect(text, 'the period goes inside the closing quote').not.toMatch(/”\./);
  expect(text).not.toMatch(/that row|the opposite|exact opposite/i);
  // "both" only with what it refers to.
  expect(text.match(/\bboth\b(?! face-down cards)/gi) ?? [], text).toEqual([]);
  expect(text).not.toMatch(/can’t tell”|“can’t tell/);
}

describe('lesson 1 wrong answers teach first', () => {
  const items = lessonItems('s1.l1', 40);
  const ALL_SENTENCES: Sentence[] = [...SENTENCES, ...Object.values(TEACH_SENTENCES)];
  const byText = new Map(ALL_SENTENCES.map((s) => [s.text, s]));
  /** A case card's sentence, read back from its label. */
  const sentenceOf = (c: TeachCase): Sentence => {
    const m = c.label.match(/^“(.+)”$/);
    const s = m ? byText.get(m[1]) : undefined;
    if (!s) throw new Error(`no sentence for case ${c.label}`);
    return s;
  };
  /** T-truth: the truths come from the sentence's label, through the map written above. */
  function checkCase(c: TeachCase): Sentence {
    const s = sentenceOf(c);
    const truths = Object.fromEntries(c.truths!.map((t) => [t.who, t.value]));
    expect(truths['It is a statement'], c.label).toBe(KIND_IS_STATEMENT[s.kind]);
    if (s.kind === 'true' || s.kind === 'false') expect(truths['The sentence'], c.label).toBe(s.kind === 'true');
    else expect('The sentence' in truths, c.label).toBe(false);
    expect(c.truths!.length).toBe(s.kind === 'true' || s.kind === 'false' ? 2 : 1);
    expect(c.note, c.label).toBeTruthy();
    return s;
  }
  /** The sentences an item asks about: its scene sentence, or its choices. */
  const asked = (it: ChooseItem): Sentence[] =>
    (it.scene?.kind === 'text' ? it.scene.lines : it.choices.map((c) => c.label)).map((t) => byText.get(t)!);

  it('teaching sentences are not in the bank, are labelled right, and every sentence has its own id', () => {
    for (const [kind, s] of Object.entries(TEACH_SENTENCES)) {
      expect(s.kind).toBe(kind);
      expect(SENTENCES.some((x) => x.text === s.text), s.text).toBe(false);
    }
    expect(new Set(ALL_SENTENCES.map((s) => sentenceId(s.text))).size).toBe(ALL_SENTENCES.length);
    for (const s of ALL_SENTENCES) expect(sentenceId(s.text)).toMatch(/^[a-z0-9]+(-[a-z0-9]+){0,5}$/);
  });

  it('T-teach and T-cover: the rule, the words it needs, cases on both sides of the line, Remember and a simpler example', () => {
    expect(items.length).toBeGreaterThan(300);
    for (const it of items) {
      const t = it.teach!;
      expect(t.rule).toBe(L1_RULE);
      const words = t.terms!.map((x) => x.word);
      expect(words[0]).toBe('A statement');
      expect(words.length).toBeGreaterThanOrEqual(1);
      expect(words.length).toBeLessThanOrEqual(3);
      // Every hard word the explanation uses is defined.
      const all = itemText(it);
      if (/an opinion/i.test(all) && t.cases!.some((c) => sentenceOf(c).kind === 'opinion')) expect(words).toContain('An opinion');
      expect(t.meaning).toBeTruthy();
      expect(t.casesTitle).toBe('Can each sentence be true or false?');
      expect(t.cases!.length).toBeGreaterThanOrEqual(2);
      expect(t.cases!.length).toBeLessThanOrEqual(4);
      const kinds = t.cases!.map(checkCase);
      // Both sides of the line: at least one statement and one sentence that is not a statement.
      expect(new Set(kinds.map((s) => KIND_IS_STATEMENT[s.kind])).size).toBe(2);
      // The sentences asked about are among the cases, the first one first.
      const shown = asked(it);
      if (it.scene?.kind === 'text') expect(kinds[0]).toBe(shown[0]);
      else expect(kinds).toEqual(shown);
      expect(t.remember!.length).toBe(2);
      expect(t.remember![1]).toMatch(/^Ask: “.+\?”$/);
      expect(t.simpler!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('T-proof: every wrong choice has its own explanation, and its card shows the picked sentence is on the other side', () => {
    for (const it of items) {
      const wrong = it.choices.filter((c) => c.id !== it.answer);
      expect(Object.keys(it.feedback ?? {}).sort()).toEqual(wrong.map((c) => c.id).sort());
      for (const c of wrong) {
        const fb = it.feedback![c.id];
        expect(it.whyWrong![c.id]).toBe(feedbackText(fb));
        const s = checkCase(fb.example!);
        const isSt = KIND_IS_STATEMENT[s.kind];
        if (it.scene?.kind === 'text') {
          // "Is this a statement?": the card is the sentence itself, and it is on the other side of the pick.
          expect(s.text).toBe(it.scene.lines[0]);
          expect(isSt).toBe(c.id === 'no');
        } else {
          // "Which of these": the card is the picked sentence, on the wrong side of the question.
          expect(s.text).toBe(c.label);
          expect(isSt).toBe(it.prompt === 'Which of these is not a statement?');
          // The detail names the right sentence too.
          const right = it.choices.find((x) => x.id === it.answer)!.label;
          expect(fb.detail.join(' ')).toContain(`“${right}”`);
          expect(fb.simpler!.length).toBeGreaterThanOrEqual(3);
        }
        expect(fb.detail.join(' ')).toContain(s.text.replace(/\.$/, ''));
      }
    }
  });

  it('T-kind: one headline for each kind of mistake, and no headline for two kinds', () => {
    const heads = new Map<string, Set<string>>();
    for (const it of items) {
      for (const [id, fb] of Object.entries(it.feedback!)) {
        const picked = it.scene?.kind === 'text' ? byText.get(it.scene.lines[0])! : byText.get(it.choices.find((c) => c.id === id)!.label)!;
        const key = `${it.scene?.kind === 'text' ? 'is-this' : it.prompt}|${picked.kind}`;
        if (!heads.has(key)) heads.set(key, new Set());
        heads.get(key)!.add(fb.headline);
      }
    }
    // 7 kinds for "Is this a statement?", 4 for "Which ... is a statement?", 3 for "Which ... is not a statement?"
    expect(heads.size).toBe(14);
    for (const [key, hs] of heads) expect(hs.size, key).toBe(1);
    const all = [...heads.values()].map((h) => [...h][0]);
    expect(new Set(all).size).toBe(all.length);
    for (const h of all) expect(h).toMatch(/^Your answer /);
  });

  it('T-ids: a choice id comes from its words, so reversing the choices keeps every explanation', () => {
    for (const it of items) {
      if (it.scene?.kind === 'text') {
        expect(it.choices.map((c) => c.id)).toEqual(['yes', 'no']);
        continue;
      }
      for (const c of it.choices) expect(c.id).toBe(sentenceId(c.label));
      const reversed: ChooseItem = { ...it, choices: [...it.choices].reverse() };
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        const a = explanationFor(it, { kind: 'choose', id: c.id });
        expect(explanationFor(reversed, { kind: 'choose', id: c.id })).toEqual(a);
        expect(a.title).toBe(it.feedback![c.id].headline);
        expect(a.said).toBe(c.label);
      }
    }
  });

  it('T-fresh: after a miss, a new sentence of the same kind, then one from the other side of the line', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of stop1.lessons[0].practice(createRng(seed)).map(choose)) {
        const set = freshCheckSet(stop1, it, seed * 3, [], 1).map(choose);
        if (it.scene?.kind === 'text') {
          const kind = byText.get(it.scene.lines[0])!.kind;
          expect(set.length).toBe(2);
          const [a, b] = set.map((x) => byText.get((x.scene as { lines: string[] }).lines[0])!);
          expect(a.kind).toBe(kind);
          expect(set[0].skill).toBe(it.skill);
          expect(FRESH_CONTRAST[kind]).toContain(b.kind);
          expect(isStatement(b.kind)).toBe(!isStatement(kind));
          expect(new Set([it.scene.lines[0], a.text, b.text]).size).toBe(3);
        } else {
          expect(set.length).toBe(1);
          expect(set[0].prompt).toBe(it.prompt);
          expect(set[0].skill).toBe(it.skill);
          expect(set[0].choices.some((c) => it.choices.some((x) => x.label === c.label))).toBe(false);
        }
      }
    }
  });

  it('T-read: each item reads at grade 7 or lower, with curly quotes and no unexplained “both”', () => {
    for (const it of items) expectReadable(it);
  });

  // Review fixes (wa-stop1-v). Each guards a gap found by reading the explanations as a 6th grader would.
  const KIND_WORD: Record<string, string> = { question: 'A question', command: 'A command', opinion: 'An opinion', feeling: 'An exclamation', false: 'False' };

  it('T-words: an “Is this a statement?” item defines its own kind’s word, and Remember uses only defined words', () => {
    let own = 0;
    for (const it of items) {
      const words = it.teach!.terms!.map((x) => x.word);
      if (it.scene?.kind === 'text') {
        // "Is the door open?" item: the headline says "a question", so "A question" is among its words.
        const kind = byText.get(it.scene.lines[0])!.kind;
        if (KIND_WORD[kind]) {
          expect(words, `${it.scene.lines[0]}: ${words.join(' / ')}`).toContain(KIND_WORD[kind]);
          own++;
        }
      }
      const remember = it.teach!.remember!.join(' ');
      for (const [re, word] of [[/questions?\b/i, 'A question'], [/commands?\b/i, 'A command'], [/exclamations?\b/i, 'An exclamation'], [/opinions?\b/i, 'An opinion']] as const) {
        if (re.test(remember)) expect(words, `${remember} / ${words.join(' / ')}`).toContain(word);
      }
    }
    expect(own).toBeGreaterThan(100);
  });

  it('T-words: a statement “says something about the world”; a false pick is “a false sentence”, never “Your answer is false”', () => {
    for (const it of items) {
      const text = itemText(it);
      // "Says how things are, but it is wrong" contradicts itself: saying how things are is being right.
      expect(text, it.id).not.toMatch(/says how things are, (and|but) it is/);
      for (const fb of Object.values(it.feedback!)) expect(fb.headline, it.id).not.toMatch(/^Your answer is (true|false)\b/);
    }
    const which = items.filter((it) => it.prompt === 'Which of these is not a statement?');
    const falsePick = which.flatMap((it) => it.choices.filter((c) => byText.get(c.label)!.kind === 'false').map((c) => it.feedback![c.id].headline));
    expect(falsePick.length).toBeGreaterThan(10);
    for (const h of falsePick) expect(h).toBe('Your answer is a false sentence, and a false sentence is still a statement.');
  });
});

describe('lesson 2 wrong answers teach first', () => {
  const targets: (Verdict | undefined)[] = ['true', 'false', 'cant', undefined];
  const made = [] as ReturnType<typeof rowItem>[];
  for (let seed = 1; seed <= 120; seed++) {
    for (const frame of FRAMES) for (const target of targets) made.push(rowItem(createRng(seed * 5 + frame.length), { frame, target }));
    made.push(rowItem(createRng(seed), { frame: FRAMES[seed % 3], conflict: true }));
  }
  const rowOf = (it: ItemCore | ChooseItem) => (it.scene?.kind === 'things' ? it.scene.things : []);
  /** Whose sentence it is, read from the prompt. */
  const whoseOf = (prompt: string) => {
    const name = prompt.match(/^(\w+) set out these cards/);
    if (name) return `${name[1]}’s sentence`;
    const who = prompt.match(/ The (\w+) says, /);
    return who ? `The ${who[1]}’s sentence` : 'The sentence';
  };
  const nums = (x: string) => x.split(/, | and /).map(Number);

  /** T-truth for a "Now …" note: every count is recounted from the drawn cards. */
  function checkTally(note: string, cards: readonly Card[]) {
    const count = (phrase: string) => cards.filter((c) => refFits(c, descOf(phrase))).length;
    const num = (x: string) => (x === 'no' || x === 'None' ? 0 : Number(x));
    let m: RegExpMatchArray | null;
    if ((m = note.match(/^Now (no card is|1 card is|(\d+) cards are) (.+?)\.$/))) {
      expect(count(m[3]), note).toBe(m[1] === 'no card is' ? 0 : m[1] === '1 card is' ? 1 : Number(m[2]));
    } else if ((m = note.match(/^Now there is 1 (.+?), and it is (not )?(.+)\.$/))) {
      const a = cards.filter((c) => refFits(c, descOf(m![1])));
      expect(a.length, note).toBe(1);
      expect(refFits(a[0], descOf(m[3])), note).toBe(!m[2]);
    } else if ((m = note.match(/^Now there (?:is|are) (no|\d+) (.+?) and (no|\d+) (.+?)\.(?: That is a tie, so .+ do not have more\.)?$/))) {
      expect(count(m[2]), note).toBe(num(m[1]));
      expect(count(m[4]), note).toBe(num(m[3]));
      expect(/tie/.test(note), note).toBe(num(m[1]) === num(m[3]));
    } else if ((m = note.match(/^Now every card is (.+)\.$/))) {
      expect(count(m[1]), note).toBe(cards.length);
    } else if ((m = note.match(/^Now (\d+) of the (\d+) cards (?:is|are) (.+)\.$/))) {
      expect(Number(m[2]), note).toBe(cards.length);
      expect(count(m[3]), note).toBe(Number(m[1]));
    } else if ((m = note.match(/^Now there are (\d+) (.+?)\. (None|All \d+|\d+) of them (?:is|are) (.+)\.$/))) {
      const a = descOf(m[2]), b = descOf(m[4]);
      expect(cards.filter((c) => refFits(c, a)).length, note).toBe(Number(m[1]));
      const nab = cards.filter((c) => refFits(c, a) && refFits(c, b)).length;
      // "All 4 of them" exactly when every one of them fits; a bare number never means all of them.
      if (m[3].startsWith('All ')) expect([nab, nab], note).toEqual([Number(m[1]), Number(m[3].slice(4))]);
      else expect(nab === Number(m[1]) && nab > 0, note).toBe(false);
      if (!m[3].startsWith('All ')) expect(nab, note).toBe(num(m[3]));
    } else if ((m = note.match(/^Now card 1 is (.+)\.$/))) {
      expect(refFits(cards[0], descOf(m[1])), note).toBe(true);
    } else {
      throw new Error(`unknown note: ${note}`);
    }
  }

  /**
   * T-truth for one case card: it is the item's row with some face-down cards turned up; the label names exactly
   * those cards and what they are; the truth is the brute-force verdict on the drawn row, which must be settled.
   */
  function checkRowCase(c: TeachCase, row: readonly Thing[], s: Stmt, whose: string): boolean {
    const cards = c.things!;
    expect(cards.length).toBe(row.length);
    const filled: number[] = [];
    const still: number[] = [];
    cards.forEach((t, i) => {
      if (!row[i].hidden) {
        expect(plain(t)).toEqual(plain(row[i]));
        expect(t.hidden).toBeFalsy();
      } else if (t.hidden) still.push(i);
      else filled.push(i);
    });
    expect(filled.length, c.label).toBeGreaterThan(0);
    const v = refVerdict(s, cards);
    expect(v, `${say(s)} / ${c.label}`).not.toBe('cant');
    expect(c.truths).toEqual([{ who: whose, value: v === 'true' }]);
    const m = c.label.match(/^Face-down cards? ([\d, and]+?) (?:is|are) (?:all )?(.+?)\.(?: Cards? ([\d, and]+) (?:is|are) still face down\.)?$/);
    if (!m) throw new Error(`label: ${c.label}`);
    expect(nums(m[1])).toEqual(filled.map((i) => i + 1));
    const d = descOf(m[2]);
    expect(Object.keys(d).length, c.label).toBeGreaterThan(0);
    for (const i of filled) expect(refFits(cards[i], d), c.label).toBe(true);
    if (still.length) {
      expect(nums(m[3])).toEqual(still.map((i) => i + 1));
      const rest = still.length === 1 ? `card ${still[0] + 1} is` : `cards ${m[3]} are`;
      expect(c.note).toBe(`Whatever ${rest}, ${whose.replace(/^The /, 'the ')} is ${v}.`);
    } else {
      expect(m[3]).toBeUndefined();
      checkTally(c.note!, cards);
    }
    return v === 'true';
  }

  it('T-teach: the rule, “Face down” and “Can’t tell” defined, the sentence’s meaning, Remember and a simpler example', () => {
    for (const { item: it, stmt } of made) {
      const t = it.teach!;
      expect(t.rule).toBe(ROW_RULE);
      expect(t.terms!.slice(0, 2)).toEqual([FACE_DOWN_TERM, CANT_TELL_TERM]);
      expect(t.terms!.length).toBe(3);
      // The third term is the statement's hard word when it has one ("Exactly two", "More", ...).
      if (stmt!.t === 'count') expect(t.terms![2].word).toMatch(/^“(Exactly|At least) /);
      if (stmt!.t === 'more') expect(t.terms![2].word).toBe('“More”');
      expect(t.meaning).toContain(`“${say(stmt!).replace(/\.$/, '')}”`);
      if (stmt!.t === 'more') expect(t.meaning).toContain('A tie makes it false.');
      expect(t.remember![1]).toBe('Ask: “Could the face-down cards make it true? Could they make it false?”');
      expect(t.simpler!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('T-truth and T-cover: every case is a real filling of the face-down cards, and the cases show every way it can go', () => {
    let partial = 0;
    for (const { item: it, stmt } of made) {
      const row = rowOf(it);
      const whose = whoseOf(it.prompt);
      const values = it.teach!.cases!.map((c) => checkRowCase(c, row, stmt!, whose));
      if (it.answer === 'cant') {
        // A filling that makes it true, and one that makes it false.
        expect(values).toEqual([true, false]);
        expect(it.teach!.casesTitle).toBe('Can the face-down cards make it true? Can they make it false?');
      } else {
        // Settled: every face-down card filled the way that helps most, then the way that hurts most. Same answer.
        expect(values).toEqual([it.answer === 'true', it.answer === 'true']);
        for (const c of it.teach!.cases!) expect(c.things!.some((x) => x.hidden)).toBe(false);
        expect(it.teach!.casesTitle).toBe('Can the face-down cards change the answer?');
      }
      partial += it.teach!.cases!.filter((c) => c.things!.some((x) => x.hidden)).length;
    }
    // Some cases leave cards face down: one card alone decides it.
    expect(partial).toBeGreaterThan(50);
  });

  it('T-proof: each wrong choice’s example card shows the gap', () => {
    for (const { item: it, stmt } of made) {
      const row = rowOf(it);
      const wrong = ['true', 'false', 'cant'].filter((x) => x !== it.answer);
      expect(Object.keys(it.feedback!).sort()).toEqual(wrong.sort());
      for (const id of wrong) {
        const fb = it.feedback![id];
        expect(it.whyWrong![id]).toBe(feedbackText(fb));
        expect(it.teach!.cases).toContainEqual(fb.example);
        const v = checkRowCase(fb.example!, row, stmt!, whoseOf(it.prompt));
        // Can't tell: the card makes it the other way from the pick. Settled: even this filling keeps the answer.
        expect(v).toBe(it.answer === 'cant' ? id === 'false' : it.answer === 'true');
        expect(fb.detail[0]).toMatch(/^(“(True|False|Can’t tell)” would mean|Your answer means)/);
      }
    }
  });

  it('T-proof: a can’t-tell trap names the cards you can see', () => {
    let traps = 0;
    for (const { item: it, stmt } of made) {
      if (!it.conflict) continue;
      const looks = refHolds(stmt!, rowOf(it).filter((t) => !t.hidden)) ? 'true' : 'false';
      expect(it.feedback![looks].detail).toContain(`The cards you can see make it look ${looks}. But the face-down cards count too.`);
      traps++;
    }
    expect(traps).toBeGreaterThan(100);
  });

  it('T-kind: one headline for each pair of right answer and pick, six in all', () => {
    const heads = new Map<string, Set<string>>();
    for (const { item: it } of made) {
      for (const [id, fb] of Object.entries(it.feedback!)) {
        const key = `${it.answer}|${id}`;
        if (!heads.has(key)) heads.set(key, new Set());
        heads.get(key)!.add(fb.headline);
      }
    }
    expect(heads.size).toBe(6);
    for (const [key, hs] of heads) expect(hs.size, key).toBe(1);
    const all = [...heads.values()].map((h) => [...h][0]);
    expect(new Set(all).size).toBe(6);
  });

  /** "Card 1 is red. Cards 2 and 3 are squares. Card 4 is face down." -> the tiny row, read from the words. */
  function tinyRowOf(text: string): Thing[] {
    const row: Thing[] = [];
    for (const [, which, what] of text.matchAll(/Cards? ([\d, and]+?) (?:is|are) (.+?)\./g)) {
      for (const k of nums(which)) {
        const shown = what === 'face down' ? null : ALL.find((c) => refFits(c, descOf(what)));
        if (what !== 'face down') expect(shown, what).toBeTruthy();
        row[k - 1] = shown ? { id: `c${k}`, ...shown } : { id: `c${k}`, ...ALL[0], hidden: true };
      }
    }
    expect(row.every(Boolean), text).toBe(true);
    return row;
  }

  it('the simpler example is a real row with the same answer, and a can’t-tell one uses the item’s own sentence', () => {
    let tie = 0;
    for (const { item: it, stmt } of made) {
      const lines = it.teach!.simpler!;
      if (it.answer === 'cant') {
        // The same sentence on a tiny row where one face-down card decides it. Each "If card N is …" is recomputed.
        const head = lines[0].match(/^Imagine (\d+) cards?\. (.+)$/);
        if (!head) throw new Error(`simpler: ${lines[0]}`);
        const tiny = tinyRowOf(head[2]);
        expect(tiny.length).toBe(Number(head[1]));
        expect(tiny.filter((t) => t.hidden).length).toBe(1);
        expect(refVerdict(stmt!, tiny), `${say(stmt!)} / ${lines.join(' ')}`).toBe('cant');
        const first = lines[1].match(/^“(.+)” If card (\d) is (.+?), the sentence is (true|false)\.$/);
        if (!first) throw new Error(`simpler: ${lines[1]}`);
        expect(first[1]).toBe(say(stmt!));
        const second = lines[2].match(/^If card (\d) is (.+?), (?:it is (true|false)|there (?:is|are) (\d+) (.+?) and (\d+) (.+?)\. That is a tie, so it is (false))\.$/);
        if (!second) throw new Error(`simpler: ${lines[2]}`);
        const values: boolean[] = [];
        for (const [line, k, what, said] of [[1, first[2], first[3], first[4]], [2, second[1], second[2], second[3] ?? second[8]]] as const) {
          const at = Number(k) - 1;
          expect(tiny[at].hidden, lines.join(' ')).toBe(true);
          const filled = tiny.map((t, i) => (i === at ? ALL.find((c) => refFits(c, descOf(what)))! : plain(t)));
          expect(refHolds(stmt!, filled), `${say(stmt!)} / ${what}`).toBe(said === 'true');
          values.push(said === 'true');
          if (second[4] && line === 2) {
            // The tie is counted from the filled tiny row.
            expect(filled.filter((c) => refFits(c, descOf(second[5]))).length).toBe(Number(second[4]));
            expect(filled.filter((c) => refFits(c, descOf(second[7]))).length).toBe(Number(second[6]));
            expect(second[4]).toBe(second[6]);
            tie++;
          }
        }
        expect(values).toEqual([true, false]);
        expect(lines[lines.length - 1]).toBe('It could go either way. So you can’t tell yet.');
        continue;
      }
      const m = lines[0].match(/^Imagine (\d+) cards\. (?:Card 1 is|Cards [\d, and]+ are) (.+?)\. Card (\d+) is face down\.$/);
      if (!m) throw new Error(`simpler: ${lines[0]}`);
      const n = Number(m[1]);
      expect(Number(m[3])).toBe(n);
      const d = descOf(m[2]);
      const shown = ALL.find((c) => refFits(c, d))!;
      const tiny: Thing[] = [...Array.from({ length: n - 1 }, (_, i) => ({ id: `c${i + 1}`, ...shown })), { id: `c${n}`, ...ALL[0], hidden: true }];
      expect(refVerdict(stmt!, tiny), `${say(stmt!)} / ${lines.join(' ')}`).toBe(it.answer);
      expect(lines[lines.length - 1]).toContain(`So the answer is ${it.answer}, not “Can’t tell.”`);
      // "At least k" falls short with fewer than k; "That is not k" would let "at least" read as "exactly".
      if (stmt!.t === 'count' && stmt!.op === 'ge') expect(lines.join(' ')).not.toMatch(/That is not \d/);
    }
    // A can't-tell "more" sentence shows the tie in its smallest example.
    expect(tie).toBeGreaterThan(10);
  });

  it('T-fresh: a can’t-tell row and a settled row after any miss, the missed kind first', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of stop1.lessons[1].practice(createRng(seed)).map(choose)) {
        const set = freshCheckSet(stop1, it, seed * 7, [], 1).map(choose);
        expect(set.length).toBe(2);
        expect(set[0].skill).toBe(it.skill);
        expect(set.map((x) => x.answer === 'cant')).toEqual(it.answer === 'cant' ? [true, false] : [false, true]);
        if (it.answer !== 'cant') expect(set[0].answer).toBe(it.answer);
        if (it.conflict && it.answer === 'cant') expect(set[0].conflict).toBe(true);
      }
    }
  });

  it('T-fresh: a new example never repeats the missed sentence or the missed cards (any seed, the app’s too)', () => {
    let n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const it of stop1.lessons[1].practice(createRng(seed)).map(choose)) {
        // The same seed as the practice set once gave the missed row back with a new speaker; the app adds 15485863.
        for (const s of [seed, seed * 7, seed + 15485863, seed + 2 * 15485863]) {
          for (const x of freshCheckSet(stop1, it, s, [], 1).map(choose)) {
            expect(rowSentence(x), `${it.prompt} -> ${x.prompt}`).not.toBe(rowSentence(it));
            expect(JSON.stringify(x.scene), x.prompt).not.toBe(JSON.stringify(it.scene));
            n++;
          }
        }
      }
    }
    expect(n).toBeGreaterThan(1500);
  });

  it('T-words: the card-number word names a card the explanation uses, and “There is” is told without “at least”', () => {
    let named = 0;
    for (const { item: it, stmt } of made) {
      const term = it.teach!.terms![2];
      const m = term.word.match(/^Card (\d)$/);
      if (m) {
        const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][Number(m[1]) - 1];
        expect(term.meaning).toBe(`the ${ord} card, counting from the left.`);
        // The explanation talks about this card: in a reason, a case label or a detail.
        const text = [it.explain, ...teachStrings(it as unknown as Item)].join(' ');
        expect(text, term.word).toMatch(new RegExp(`\\b[Cc]ards? (?:[\\d, ]+and )?${m[1]}\\b|[Cc]ards? ${m[1]}\\b`));
        named++;
      }
      // A quantity word is defined before it is used: "at least" only where “At least …” is a term.
      if (/\bat least\b/i.test(it.teach!.meaning!)) expect(it.teach!.terms!.some((x) => /^“At least/.test(x.word)), it.teach!.meaning).toBe(true);
      if (stmt!.t === 'some') expect(it.teach!.meaning).toMatch(/is true when one or more cards are .+\. One is enough\.$/);
    }
    expect(named).toBeGreaterThan(300);
  });

  it('T-read: each item reads at grade 7 or lower, with curly quotes and “Can’t tell” spelled one way', () => {
    for (const it of lessonItems('s1.l2', 30)) expectReadable(it);
  });
});
