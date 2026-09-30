/**
 * Stop 1 statements engine. Every answer and every claim in an explanation is re-checked here with an
 * evaluator written separately from the engine, by brute force over all ways to fill the face-down cards.
 */
import { describe, expect, it } from 'vitest';
import { L2_EXAMPLES, L3_EXAMPLE, SENTENCES, isStatement, stop1 } from '../../content/stop1';
import {
  CARD,
  FRAMES,
  KINDS,
  NOT_BANK,
  NOT_CONFLICT_KEYS,
  NOT_KEYS,
  NOT_TAGS,
  ROW_TEMPLATES,
  holds,
  isExactOpposite,
  judge,
  notItem,
  rowItem,
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
import { createRng, type Rng } from '../rng';
import type { ChooseItem, Thing } from '../types';

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

/** Rebuilds the example row from "Think of a red gem and two blue gems." or "Think of a row with a circle, then a square." */
function rowFromText(text: string): Card[] {
  const m = text.match(/Think of (?:a row with )?(?:just )?(.*?)\. The sentence/);
  if (!m) throw new Error(`no example row in: ${text}`);
  const cards: Card[] = [];
  for (const part of m[1].split(/, then |, | and /)) {
    const words = part.trim().split(/\s+/);
    const k = NUMBER[words[0]];
    if (k === undefined) throw new Error(`cannot read "${part}"`);
    const d = descOf(words.slice(1).join(' '));
    for (let i = 0; i < k; i++) cards.push({ color: 'red', shape: 'circle', size: 'big', ...d });
  }
  return cards;
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
  return [it.prompt, ...scene, it.explain, it.hint ?? '', ...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {})].join('\n');
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

  it('items: labels, answer and every example in the feedback check out on hundreds of seeds', () => {
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
          expect(rows.find((row) => refHolds(f.right, row) === refHolds(f.s, row))).toBeUndefined();
          const wrongChoices = it.choices.filter((c) => c.id !== it.answer);
          expect(wrongChoices.map((c) => c.label)).toEqual(f.wrongs.map((w) => say(w, f.noun)));
          expect(Object.keys(it.whyWrong ?? {}).sort()).toEqual(wrongChoices.map((c) => c.id).sort());
          wrongChoices.forEach((c, i) => {
            const why = it.whyWrong![c.id];
            const row = rowFromText(why);
            const value = why.includes('both true for that row');
            expect(why).toMatch(/both (true|false) for that row\.$/);
            expect(refHolds(f.s, row), `${say(f.s)} / ${c.label}: ${why}`).toBe(value);
            expect(refHolds(f.wrongs[i], row), `${say(f.s)} / ${c.label}: ${why}`).toBe(value);
            checked++;
          });
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
      const why = m.item.whyWrong![le.id];
      expect(why.startsWith(`That still allows exactly ${['', 'one', 'two', 'three'][k]} ${shape}s.`), why).toBe(true);
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

