/**
 * Stop 1 engine: statements about a row of shape cards.
 *
 *  - holds(): does a statement hold for a row where every card is face up?
 *  - truthTable() / judge(): with face-down cards, try every way to fill them (18 kinds of card each).
 *    True in every filling -> 'true', false in every filling -> 'false', otherwise 'cant'.
 *  - rowItem(): a "true, false or can't tell" question. Its explanation comes from the case check:
 *    a visible card that settles it, or the face-down card that could go either way.
 *  - notItem(): "pick the exact opposite". The right choice is checked to equal NOT(statement) on every
 *    test row, and each wrong choice is checked to agree with the statement on some row. The row that
 *    proves each wrong choice is wrong is shown in its feedback.
 *
 * Only the rng passed in is used for variety. The fixed test rows come from their own fixed seed.
 */
import { createRng } from '../rng';
import type { Choice, ChooseItem, Color, Rng, Shape, Size, Thing } from '../types';

export const COLORS: readonly Color[] = ['red', 'blue', 'yellow'];
export const SHAPES: readonly Shape[] = ['circle', 'square', 'triangle'];
export const SIZES: readonly Size[] = ['big', 'small'];

export interface Card {
  shape: Shape;
  color: Color;
  size: Size;
}
/** A card description: every feature given must match. */
export type Desc = Partial<Card>;
export type Feature = keyof Card;

/** All 18 kinds of card. */
export const KINDS: readonly Card[] = COLORS.flatMap((color) =>
  SHAPES.flatMap((shape) => SIZES.map((size) => ({ color, shape, size }))),
);

export type Op = 'eq' | 'ne' | 'ge' | 'gt' | 'lt' | 'le';

export type Stmt =
  | { t: 'some'; d: Desc; style?: 'atLeastOne' } // There is a red card. / At least one card is red.
  | { t: 'someNot'; d: Desc } // At least one card is not red.
  | { t: 'none'; d: Desc } // No card is red.
  | { t: 'every'; d: Desc } // Every card is red.
  | { t: 'everyIs'; a: Desc; b: Desc } // Every big card is red.
  | { t: 'someIsNot'; a: Desc; b: Desc } // At least one big card is not red.
  | { t: 'noneIs'; a: Desc; b: Desc } // No big card is red.
  | { t: 'count'; d: Desc; op: Op; k: number; not?: boolean } // Exactly two cards are (not) red.
  | { t: 'more'; a: Desc; b: Desc } // There are more red cards than blue cards.
  | { t: 'asMany'; a: Desc; b: Desc } // There are at least as many red cards as blue cards.
  | { t: 'pos'; at: 'first' | 'last'; d: Desc; not?: boolean }; // The first card is (not) a circle.

export type Verdict = 'true' | 'false' | 'cant';
export type Frame = 'abstract' | 'everyday' | 'fantasy';
export const FRAMES: readonly Frame[] = ['abstract', 'everyday', 'fantasy'];

/** An item without the fields the stop adds (id, stop, lesson, skill). */
export type ItemCore = Omit<ChooseItem, 'id' | 'stop' | 'lesson' | 'skill'>;
/** A made item plus a short skill tag ('cant-tell' -> skill 's1.cant-tell'). */
export interface Made {
  tag: string;
  item: ItemCore;
  /** Row items: the statement asked about, and the claims its "can't tell" explanation makes. For tests. */
  stmt?: Stmt;
  claims?: Claim[];
  /** NOT-flip items: the statement, the right opposite and each wrong pick (in choice order, skipping the right one). For tests. */
  flip?: { s: Stmt; right: Stmt; wrongs: Stmt[]; noun: Noun };
}

// ---------- truth ----------

export function fits(c: Card, d: Desc): boolean {
  return (
    (d.shape === undefined || c.shape === d.shape) &&
    (d.color === undefined || c.color === d.color) &&
    (d.size === undefined || c.size === d.size)
  );
}

const countOf = (cards: readonly Card[], d: Desc, not = false) =>
  cards.reduce((n, c) => n + (fits(c, d) !== not ? 1 : 0), 0);

function compare(op: Op, n: number, k: number): boolean {
  switch (op) {
    case 'eq': return n === k;
    case 'ne': return n !== k;
    case 'ge': return n >= k;
    case 'gt': return n > k;
    case 'lt': return n < k;
    case 'le': return n <= k;
  }
}

/** Does the statement hold for these cards (all face up)? */
export function holds(s: Stmt, cards: readonly Card[]): boolean {
  switch (s.t) {
    case 'some': return cards.some((c) => fits(c, s.d));
    case 'someNot': return cards.some((c) => !fits(c, s.d));
    case 'none': return !cards.some((c) => fits(c, s.d));
    case 'every': return cards.every((c) => fits(c, s.d));
    case 'everyIs': return cards.every((c) => !fits(c, s.a) || fits(c, s.b));
    case 'someIsNot': return cards.some((c) => fits(c, s.a) && !fits(c, s.b));
    case 'noneIs': return !cards.some((c) => fits(c, s.a) && fits(c, s.b));
    case 'count': return compare(s.op, countOf(cards, s.d, !!s.not), s.k);
    case 'more': return countOf(cards, s.a) > countOf(cards, s.b);
    case 'asMany': return countOf(cards, s.a) >= countOf(cards, s.b);
    case 'pos': {
      const c = s.at === 'first' ? cards[0] : cards[cards.length - 1];
      return c !== undefined && fits(c, s.d) !== !!s.not;
    }
  }
}

export function descsOf(s: Stmt): Desc[] {
  switch (s.t) {
    case 'everyIs': case 'someIsNot': case 'noneIs': case 'more': case 'asMany': return [s.a, s.b];
    default: return [s.d];
  }
}

/** The card features the statements look at. Their truth never depends on any other feature. */
export function featuresOf(...ss: Stmt[]): Set<Feature> {
  const out = new Set<Feature>();
  for (const s of ss) for (const d of descsOf(s)) for (const f of ['color', 'shape', 'size'] as const) if (d[f] !== undefined) out.add(f);
  return out;
}

/** Statements like "Every big card is red" say nothing when no card is big. Rows used as examples avoid that. */
function nonVacuous(ss: Stmt[], cards: readonly Card[]): boolean {
  return ss.every((s) => !(s.t === 'everyIs' || s.t === 'someIsNot' || s.t === 'noneIs') || cards.some((c) => fits(c, s.a)));
}

const plainCard = (t: Card): Card => ({ shape: t.shape, color: t.color, size: t.size });

/**
 * Truth of the statement for every way to fill the face-down cards. Filling f gives hidden card i
 * the kind KINDS[digit i of f in base 18].
 */
export function truthTable(s: Stmt, row: readonly Thing[]): { hidden: number[]; table: Uint8Array } {
  const hidden = row.flatMap((t, i) => (t.hidden ? [i] : []));
  const cards = row.map(plainCard);
  const total = KINDS.length ** hidden.length;
  const table = new Uint8Array(total);
  for (let f = 0; f < total; f++) {
    let x = f;
    for (const i of hidden) {
      cards[i] = KINDS[x % KINDS.length];
      x = Math.floor(x / KINDS.length);
    }
    table[f] = holds(s, cards) ? 1 : 0;
  }
  return { hidden, table };
}

export function verdictOf(table: Uint8Array): Verdict {
  let t = false, f = false;
  for (const v of table) {
    if (v) t = true;
    else f = true;
  }
  return t && f ? 'cant' : t ? 'true' : 'false';
}

/** True, false or can't tell, by checking every way to fill the face-down cards. */
export function judge(s: Stmt, row: readonly Thing[]): Verdict {
  return verdictOf(truthTable(s, row).table);
}

// ---------- words ----------

export interface Noun {
  one: string;
  many: string;
}
export const CARD: Noun = { one: 'card', many: 'cards' };
export const EVERYDAY_NOUNS: readonly Noun[] = [
  { one: 'balloon', many: 'balloons' },
  { one: 'shirt', many: 'shirts' },
  { one: 'car', many: 'cars' },
];
export const FANTASY_NOUNS: readonly Noun[] = [
  { one: 'dragon', many: 'dragons' },
  { one: 'potion', many: 'potions' },
  { one: 'gem', many: 'gems' },
];

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
export const numWord = (n: number) => NUM[n] ?? String(n);

/** The phrase with "a" or "an" in front: "a red card", "an elf". Every generated word starting with a vowel letter has a vowel sound. */
export const withA = (phrase: string) => `${/^[aeiou]/i.test(phrase) ? 'an' : 'a'} ${phrase}`;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** "red card", "big red circles", "circle". */
export function np(d: Desc, many: boolean, n: Noun = CARD): string {
  const head = d.shape ? (many ? `${d.shape}s` : d.shape) : many ? n.many : n.one;
  return [d.size, d.color, head].filter((w): w is string => !!w).join(' ');
}

/** What goes after "is"/"are": "red", "big and red", "a circle", "circles". */
export function adj(d: Desc, many = false, n: Noun = CARD): string {
  if (d.shape) return many ? np(d, true, n) : withA(np(d, false, n));
  return [d.size, d.color].filter((w) => !!w).join(' and ');
}

function countText(s: Extract<Stmt, { t: 'count' }>, n: Noun): string {
  const many = s.k !== 1;
  const subject = `${numWord(s.k)} ${many ? n.many : n.one} ${many ? 'are' : 'is'}`;
  const pred = `${s.not ? 'not ' : ''}${adj(s.d, many, n)}`;
  switch (s.op) {
    case 'eq': return `Exactly ${subject} ${pred}.`;
    case 'ge': return `At least ${subject} ${pred}.`;
    case 'le': return `At most ${subject} ${pred}.`;
    case 'gt': return `More than ${subject} ${pred}.`;
    case 'lt': return `Fewer than ${subject} ${pred}.`;
    case 'ne': return `The number of ${np(s.d, true, n)} is not ${numWord(s.k)}.`;
  }
}

/** The statement as a sentence, ending in a period. */
export function say(s: Stmt, n: Noun = CARD): string {
  switch (s.t) {
    case 'some':
      return s.style === 'atLeastOne' ? `At least one ${n.one} is ${adj(s.d, false, n)}.` : `There is ${withA(np(s.d, false, n))}.`;
    case 'someNot': return `At least one ${n.one} is not ${adj(s.d, false, n)}.`;
    case 'none': return `No ${n.one} is ${adj(s.d, false, n)}.`;
    case 'every': return `Every ${n.one} is ${adj(s.d, false, n)}.`;
    case 'everyIs': return `Every ${np(s.a, false, n)} is ${adj(s.b, false, n)}.`;
    case 'someIsNot': return `At least one ${np(s.a, false, n)} is not ${adj(s.b, false, n)}.`;
    case 'noneIs': return `No ${np(s.a, false, n)} is ${adj(s.b, false, n)}.`;
    case 'count': return countText(s, n);
    case 'more': return `There are more ${np(s.a, true, n)} than ${np(s.b, true, n)}.`;
    case 'asMany': return `There are at least as many ${np(s.a, true, n)} as ${np(s.b, true, n)}.`;
    case 'pos': return `The ${s.at} ${n.one} is ${s.not ? 'not ' : ''}${adj(s.d, false, n)}.`;
  }
}

/** The sentence without its final period, for quoting inside another sentence. */
export const bare = (s: Stmt, n: Noun = CARD) => say(s, n).replace(/\.$/, '');

// ---------- rows of cards ----------

/** A row of 4-6 cards with 1-3 face down. Some rows share a color or shape, which makes "every" and "no" interesting. */
export function randomRow(rng: Rng): Thing[] {
  const n = rng.int(4, 6);
  const h = Math.min(n - 2, rng.pick([1, 1, 1, 2, 2, 3]));
  const cards = Array.from({ length: n }, () => ({ ...rng.pick(KINDS) }));
  const mode = rng.int(0, 2);
  if (mode === 1) {
    const c = rng.pick(COLORS);
    for (const x of cards) x.color = c;
    if (rng.chance(0.4)) cards[rng.int(0, n - 1)].color = rng.pick(COLORS);
  } else if (mode === 2) {
    const s = rng.pick(SHAPES);
    for (const x of cards) x.shape = s;
    if (rng.chance(0.4)) cards[rng.int(0, n - 1)].shape = rng.pick(SHAPES);
  }
  const hidden = new Set(rng.shuffle(cards.map((_, i) => i)).slice(0, h));
  return cards.map((c, i) => {
    const t: Thing = { id: `c${i + 1}`, shape: c.shape, color: c.color, size: c.size };
    if (hidden.has(i)) t.hidden = true;
    return t;
  });
}

export type RowTemplate =
  | 'hasColor' | 'hasExact' | 'allShape' | 'allColorShape' | 'noColor'
  | 'exactlyColor' | 'atLeastShape' | 'moreColor' | 'firstShape' | 'allBigColor';

export const ROW_TEMPLATES: readonly RowTemplate[] = [
  'hasColor', 'hasExact', 'allShape', 'allColorShape', 'noColor',
  'exactlyColor', 'atLeastShape', 'moreColor', 'firstShape', 'allBigColor',
];

/** A statement of the given template that fits this row (null when the row cannot carry it). */
export function rowStatement(rng: Rng, tpl: RowTemplate, row: readonly Thing[]): Stmt | null {
  const vis = row.filter((t) => !t.hidden);
  if (!vis.length) return null;
  switch (tpl) {
    case 'hasColor': return { t: 'some', d: { color: rng.pick(COLORS) } };
    case 'hasExact': {
      const c = rng.chance(0.5) ? rng.pick(vis) : rng.pick(KINDS);
      return { t: 'some', d: { size: c.size, color: c.color, shape: c.shape } };
    }
    case 'allShape': return { t: 'every', d: { shape: rng.chance(0.6) ? rng.pick(vis).shape : rng.pick(SHAPES) } };
    case 'allColorShape': {
      // The color comes from a card you can see, so "every red card" is never about zero cards.
      const a = rng.pick(vis);
      return { t: 'everyIs', a: { color: a.color }, b: { shape: rng.chance(0.6) ? a.shape : rng.pick(SHAPES) } };
    }
    case 'noColor': return { t: 'none', d: { color: rng.pick(COLORS) } };
    case 'exactlyColor': return { t: 'count', d: { color: rng.pick(COLORS) }, op: 'eq', k: rng.int(1, 3) };
    case 'atLeastShape': return { t: 'count', d: { shape: rng.pick(SHAPES) }, op: 'ge', k: rng.int(1, 3) };
    case 'moreColor': {
      const [c1, c2] = rng.shuffle(COLORS);
      return { t: 'more', a: { color: c1 }, b: { color: c2 } };
    }
    case 'firstShape': return { t: 'pos', at: 'first', d: { shape: rng.pick(SHAPES) } };
    case 'allBigColor': {
      const big = vis.filter((t) => t.size === 'big');
      if (!big.length) return null;
      return { t: 'everyIs', a: { size: 'big' }, b: { color: rng.chance(0.6) ? rng.pick(big).color : rng.pick(COLORS) } };
    }
  }
}

const restrict = (c: Card, d: Desc): Desc => ({
  ...(d.size !== undefined ? { size: c.size } : {}),
  ...(d.color !== undefined ? { color: c.color } : {}),
  ...(d.shape !== undefined ? { shape: c.shape } : {}),
});

/**
 * Why a settled row statement is settled: a sentence about cards you can see. Returns null when no
 * such reason applies. Every reason returned is a proof on its own (it holds for every filling).
 */
export function settledReason(s: Stmt, row: readonly Thing[], value: boolean): string | null {
  const vis = row.map((t, i) => ({ t, i })).filter((x) => !x.t.hidden);
  const h = row.length - vis.length;
  if (h === 0) return null;
  const ef = h === 1 ? 'the face-down card' : h === 2 ? 'both face-down cards' : `all ${numWord(h)} face-down cards`;
  const card = (i: number) => `Card ${i + 1}`;
  switch (s.t) {
    case 'some': {
      const w = vis.find((x) => fits(x.t, s.d));
      return value && w ? `${card(w.i)} is ${adj(s.d)}.` : null;
    }
    case 'none': {
      const w = vis.find((x) => fits(x.t, s.d));
      return !value && w ? `${card(w.i)} is ${adj(s.d)}.` : null;
    }
    case 'every': {
      const w = vis.find((x) => !fits(x.t, s.d));
      return !value && w ? `${card(w.i)} is ${adj(restrict(w.t, s.d))}, not ${adj(s.d)}.` : null;
    }
    case 'everyIs': {
      const w = vis.find((x) => fits(x.t, s.a) && !fits(x.t, s.b));
      return !value && w ? `${card(w.i)} is ${adj(s.a)}, but it is ${adj(restrict(w.t, s.b))}.` : null;
    }
    case 'count': {
      if (s.not) return null;
      const n = vis.filter((x) => fits(x.t, s.d)).length;
      if (s.op === 'eq' && !value) {
        if (n > s.k) return `You can already see ${numWord(n)} ${np(s.d, true)}. That is more than ${numWord(s.k)}.`;
        if (n + h < s.k) {
          const m = n + h;
          return `Even if ${ef} were ${adj(s.d, h > 1)}, only ${numWord(m)} ${m === 1 ? 'card' : 'cards'} would be ${adj(s.d, m !== 1)}.`;
        }
      }
      if (s.op === 'ge') {
        if (value && n >= s.k) return `You can already see ${numWord(n)} ${np(s.d, n !== 1)}.`;
        if (!value && n + h < s.k) return `Even if ${ef} were ${adj(s.d, h > 1)}, there would be only ${numWord(n + h)} ${np(s.d, n + h !== 1)}.`;
      }
      return null;
    }
    case 'more': {
      const a = vis.filter((x) => fits(x.t, s.a)).length;
      const b = vis.filter((x) => fits(x.t, s.b)).length;
      const see = `You can see ${numWord(a)} ${np(s.a, a !== 1)} and ${numWord(b)} ${np(s.b, b !== 1)}.`;
      if (value && a > b + h) return `${see} Even if ${ef} were ${adj(s.b, h > 1)}, there would still be more ${np(s.a, true)}.`;
      if (!value && a + h <= b) return `${see} Even if ${ef} were ${adj(s.a, h > 1)}, there would not be more ${np(s.a, true)}.`;
      return null;
    }
    case 'pos': {
      if (s.at !== 'first' || s.not) return null;
      const c = row[0];
      if (!c || c.hidden || fits(c, s.d) !== value) return null;
      return value ? `Card 1 is ${adj(s.d)}.` : `Card 1 is ${adj(restrict(c, s.d))}, not ${adj(s.d)}.`;
    }
    default:
      return null;
  }
}

/** A description of a face-down card ("red", "not a circle", "a big red circle"). */
export interface Pred {
  d: Desc;
  not?: boolean;
}
export const predFits = (c: Card, p: Pred) => fits(c, p.d) !== !!p.not;

/**
 * One sentence of a "can't tell" explanation, as data: "if face-down card `card` (an index into the
 * hidden list), or every face-down card when `card` is 'all', fits `p`, the statement is `value`."
 * Each claim holds for every filling that meets its condition.
 */
export interface Claim {
  card: number | 'all';
  p: Pred;
  value: boolean;
}
const predText = (p: Pred, many: boolean) => `${p.not ? 'not ' : ''}${adj(p.d, many)}`;

const one = (f: Feature, vals: readonly string[]): Pred[] => vals.map((v) => ({ d: { [f]: v } as Desc }));
const oneNot = (f: Feature, vals: readonly string[]): Pred[] => vals.map((v) => ({ d: { [f]: v } as Desc, not: true }));
const combos: Pred[] = [
  ...SIZES.flatMap((size) => COLORS.map((color) => ({ d: { size, color } }))),
  ...COLORS.flatMap((color) => SHAPES.map((shape) => ({ d: { color, shape } }))),
  ...SIZES.flatMap((size) => SHAPES.map((shape) => ({ d: { size, shape } }))),
  ...KINDS.map((k) => ({ d: { size: k.size, color: k.color, shape: k.shape } })),
];
const SINGLE_PREDS: Pred[] = [
  ...one('color', COLORS), ...one('shape', SHAPES), ...one('size', SIZES),
  ...oneNot('color', COLORS), ...oneNot('shape', SHAPES), ...combos,
];
const UNIFORM_PREDS: Pred[] = [
  ...oneNot('color', COLORS), ...oneNot('shape', SHAPES),
  ...one('color', COLORS), ...one('shape', SHAPES), ...one('size', SIZES), ...combos,
];
/** Pairs that split every card in two: (red, not red), (circle, not a circle), (big, small). */
const SPLITS: [Pred, Pred][] = [
  ...COLORS.map((color): [Pred, Pred] => [{ d: { color } }, { d: { color }, not: true }]),
  ...SHAPES.map((shape): [Pred, Pred] => [{ d: { shape } }, { d: { shape }, not: true }]),
  [{ d: { size: 'big' } }, { d: { size: 'small' } }],
];

/**
 * For a "can't tell" row: sentences that show a way to make it true and a way to make it false,
 * each naming the face-down card(s) that decide it. Every sentence is checked against the full table.
 * `firstValue` is the side told first (the one the visible cards hide).
 */
export function cantTellCases(
  hidden: number[],
  table: Uint8Array,
  firstValue: boolean,
): { explain: string; whenTrue: string; whenFalse: string; claims: Claim[] } | null {
  const h = hidden.length;
  const K = KINDS.length;
  const N = table.length;
  if (h === 0) return null;
  const digits = new Uint8Array(N * h);
  for (let f = 0; f < N; f++) {
    let x = f;
    for (let j = 0; j < h; j++) {
      digits[f * h + j] = x % K;
      x = Math.floor(x / K);
    }
  }
  // allT[j*K+k]: every filling with hidden card j = kind k is true (allF: false).
  const allT = new Array<boolean>(h * K).fill(true);
  const allF = new Array<boolean>(h * K).fill(true);
  for (let f = 0; f < N; f++) {
    for (let j = 0; j < h; j++) {
      const idx = j * K + digits[f * h + j];
      if (table[f]) allF[idx] = false;
      else allT[idx] = false;
    }
  }
  const onCard = (j: number, p: Pred): boolean | null => {
    const ks = KINDS.map((c, k) => (predFits(c, p) ? k : -1)).filter((k) => k >= 0);
    if (!ks.length) return null;
    if (ks.every((k) => allT[j * K + k])) return true;
    if (ks.every((k) => allF[j * K + k])) return false;
    return null;
  };
  const uniform = (p: Pred): boolean | null => {
    let t = false, fl = false, any = false;
    for (let f = 0; f < N; f++) {
      let ok = true;
      for (let j = 0; j < h && ok; j++) ok = predFits(KINDS[digits[f * h + j]], p);
      if (!ok) continue;
      any = true;
      if (table[f]) t = true;
      else fl = true;
    }
    return !any || (t && fl) ? null : t;
  };

  const tv = (v: boolean) => (v ? 'true' : 'false');
  const cardName = (j: number) => `face-down card ${hidden[j] + 1}`;
  /** "both face-down cards are red"; with NOT, "neither face-down card is red" (never the unclear "all ... are not"). */
  const allAre = (p: Pred) => {
    if (!p.not) return `${h === 2 ? 'both face-down cards' : `all ${numWord(h)} face-down cards`} are ${adj(p.d, true)}`;
    return h === 2 ? `neither face-down card is ${adj(p.d)}` : `none of the ${numWord(h)} face-down cards are ${adj(p.d, true)}`;
  };
  interface Side {
    lead: (v: boolean) => string;
    then: (v: boolean) => string;
    claim: (v: boolean) => Claim;
  }
  const single = (j: number, p: Pred): Side => ({
    lead: (v) => `If ${cardName(j)} is ${predText(p, false)}, the sentence is ${tv(v)}.`,
    then: (v) => `If ${cardName(j)} is ${predText(p, false)}, it is ${tv(v)}.`,
    claim: (value) => ({ card: j, p, value }),
  });
  const all = (p: Pred): Side => ({
    lead: (v) => `If ${allAre(p)}, the sentence is ${tv(v)}.`,
    then: (v) => `If ${allAre(p)}, it is ${tv(v)}.`,
    claim: (value) => ({ card: 'all', p, value }),
  });
  const done = (st: Side, sf: Side, sameCard?: { j: number; p: Pred; q: Pred }) => {
    let explain: string;
    if (sameCard) {
      const first = firstValue ? sameCard.p : sameCard.q;
      const second = firstValue ? sameCard.q : sameCard.p;
      explain = `If ${cardName(sameCard.j)} is ${predText(first, false)}, the sentence is ${tv(firstValue)}. If it is ${predText(second, false)}, it is ${tv(!firstValue)}. So you can’t tell yet.`;
    } else {
      const a = firstValue ? st : sf;
      const b = firstValue ? sf : st;
      explain = `${a.lead(firstValue)} ${b.then(!firstValue)} So you can’t tell yet.`;
    }
    return { explain, whenTrue: st.lead(true), whenFalse: sf.lead(false), claims: [st.claim(true), sf.claim(false)] };
  };

  // 1. One face-down card that splits cleanly: red makes it one way, not red the other.
  for (let j = 0; j < h; j++) {
    for (const [p, q] of SPLITS) {
      const vp = onCard(j, p), vq = onCard(j, q);
      if (vp !== null && vq !== null && vp !== vq) {
        const pt = vp ? p : q, pf = vp ? q : p;
        return done(single(j, pt), single(j, pf), { j, p: pt, q: pf });
      }
    }
  }
  // 2. One face-down card that can go either way.
  for (let j = 0; j < h; j++) {
    const pt = SINGLE_PREDS.find((p) => onCard(j, p) === true);
    const pf = SINGLE_PREDS.find((p) => onCard(j, p) === false);
    if (pt && pf) return done(single(j, pt), single(j, pf), { j, p: pt, q: pf });
  }
  // 3. Each side on its own: one card, or all the face-down cards alike.
  const find = (v: boolean): Side | null => {
    for (let j = 0; j < h; j++) {
      const p = SINGLE_PREDS.find((x) => onCard(j, x) === v);
      if (p) return single(j, p);
    }
    if (h > 1) {
      const p = UNIFORM_PREDS.find((x) => uniform(x) === v);
      if (p) return all(p);
    }
    return null;
  };
  const st = find(true), sf = find(false);
  if (!st || !sf) return null;
  return done(st, sf);
}

export const VERDICT_CHOICES: readonly Choice[] = [
  { id: 'true', label: 'True' },
  { id: 'false', label: 'False' },
  { id: 'cant', label: 'Can’t tell' },
];

const NAMES = ['Maya', 'Leo', 'Sam', 'Ana', 'Ben', 'Zoe', 'Omar', 'Lily', 'Kai', 'Nora'];
const CREATURES = ['wizard', 'troll', 'dragon', 'elf', 'fairy', 'giant'];

function rowPrompt(rng: Rng, frame: Frame, text: string): string {
  const ask = 'Is that true, false, or can’t you tell yet?';
  switch (frame) {
    case 'abstract':
      return `Look at the cards. “${text}” Is this true, false, or can’t you tell yet?`;
    case 'everyday': {
      const name = rng.pick(NAMES);
      return `${name} set out these cards and turned some face down. ${name} says, “${text}” ${ask}`;
    }
    case 'fantasy': {
      const who = rng.pick(CREATURES);
      return `${cap(withA(who))} used magic to turn some cards face down. The ${who} says, “${text}” ${ask}`;
    }
  }
}

export interface RowItemOptions {
  frame: Frame;
  /** The answer this item should have. */
  target?: Verdict;
  /** Ask for a "can't tell" item where the cards you can see make true or false look obvious. */
  conflict?: boolean;
}

/** A "true, false or can't tell" item about a row of cards with some face down. */
export function rowItem(rng: Rng, opts: RowItemOptions): Made {
  for (let attempt = 0; attempt < 6000; attempt++) {
    const strict = attempt < 5000;
    const row = randomRow(rng);
    const s = rowStatement(rng, rng.pick(ROW_TEMPLATES), row);
    if (!s) continue;
    const { hidden, table } = truthTable(s, row);
    const verdict = verdictOf(table);
    // What the cards you can see say on their own. For "the first card", a face-down first card gives no such hint.
    const looks = s.t === 'pos' ? null : holds(s, row.filter((t) => !t.hidden));
    const conflict = verdict === 'cant' && looks !== null;
    if (strict && opts.target && verdict !== opts.target) continue;
    if (opts.conflict && !conflict) continue;
    const text = say(s);
    let explain: string;
    let claims: Claim[] | undefined;
    const whyWrong: Record<string, string> = {};
    if (verdict === 'cant') {
      const cases = cantTellCases(hidden, table, looks === null ? true : !looks);
      if (!cases) continue;
      explain = cases.explain;
      claims = cases.claims;
      whyWrong.true = `It could still be false. ${cases.whenFalse}`;
      whyWrong.false = `It could still be true. ${cases.whenTrue}`;
    } else {
      const v = verdict === 'true';
      const reason = settledReason(s, row, v);
      if (!reason) continue;
      explain = `${reason} So it is ${verdict}, no matter what is face down.`;
      whyWrong[v ? 'false' : 'true'] = `${reason} So the sentence is ${verdict}.`;
      whyWrong.cant = `The face-down cards can’t change this. ${reason}`;
    }
    const item: ItemCore = {
      kind: 'choose',
      prompt: rowPrompt(rng, opts.frame, text),
      scene: { kind: 'things', things: row },
      choices: VERDICT_CHOICES.map((c) => ({ ...c })),
      answer: verdict,
      explain,
      whyWrong,
      hint: 'Think about each face-down card. Could it change the answer?',
    };
    if (conflict) item.conflict = true;
    return { tag: verdict === 'cant' ? 'cant-tell' : 'check-cards', item, stmt: s, ...(claims ? { claims } : {}) };
  }
  throw new Error('rowItem: no item found');
}

// ---------- the NOT flip ----------

/** The words a feedback message can use. */
interface Talk {
  /** The statement, no final period. */
  S: string;
  /** The right opposite, no final period. */
  R: string;
  n: Noun;
}

interface WrongOpposite {
  s: Stmt;
  /** Names the mistake. */
  why: (t: Talk) => string;
  /** The example row should make the statement and this pick both true (true) or both false (false). */
  agree?: boolean;
}

export interface NotCase {
  tag: string;
  /** The first wrong choice is the every <-> none mistake. */
  conflict: boolean;
  /** Talks about shapes, so the things must be cards. */
  shapes: boolean;
  s: Stmt;
  right: Stmt;
  /** wrongs[0] is the classic mistake and is always offered. */
  wrongs: WrongOpposite[];
  explain: (t: Talk) => string;
}

const sameTime = (t: Talk) => `That can be true at the same time as “${t.S}.”`;

export const NOT_BANK = {
  everyColor(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-every', conflict: true, shapes: false,
      s: { t: 'every', d: { color: c } },
      right: { t: 'someNot', d: { color: c } },
      wrongs: [
        { s: { t: 'none', d: { color: c } }, agree: false, why: (t) => `That goes too far. One ${t.n.one} that is not ${c} is enough to make “${t.S}” false.` },
        { s: { t: 'some', d: { color: c }, style: 'atLeastOne' }, agree: true, why: sameTime },
        { s: { t: 'every', d: { color: c2 } }, agree: false, why: (t) => `Changing the color does not flip it. The ${t.n.many} could be a mix of colors, and then both are false.` },
      ],
      explain: (t) => `To make “${t.S}” false, you only need one ${t.n.one} that is not ${c}. So the opposite is “${t.R}.”`,
    };
  },
  everyShape(rng: Rng): NotCase {
    const [s, s2] = rng.shuffle(SHAPES);
    return {
      tag: 'not-every', conflict: true, shapes: true,
      s: { t: 'every', d: { shape: s } },
      right: { t: 'someNot', d: { shape: s } },
      wrongs: [
        { s: { t: 'none', d: { shape: s } }, agree: false, why: (t) => `That goes too far. One card that is not ${withA(s)} is enough to make “${t.S}” false.` },
        { s: { t: 'every', d: { shape: s2 } }, agree: false, why: () => 'Changing the shape does not flip it. The cards could be a mix of shapes, and then both are false.' },
        { s: { t: 'some', d: { shape: s }, style: 'atLeastOne' }, agree: true, why: sameTime },
      ],
      explain: (t) => `To make “${t.S}” false, you only need one card that is not ${withA(s)}. So the opposite is “${t.R}.”`,
    };
  },
  someColor(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-some', conflict: false, shapes: false,
      s: { t: 'some', d: { color: c } },
      right: { t: 'none', d: { color: c } },
      wrongs: [
        { s: { t: 'someNot', d: { color: c } }, agree: true, why: (t) => `That puts the “not” in the wrong place. It can be true at the same time as “${t.S}.”` },
        { s: { t: 'every', d: { color: c } }, agree: true, why: sameTime },
        { s: { t: 'some', d: { color: c2 } }, agree: true, why: (t) => `That is about ${c2} ${t.n.many}. It can be true at the same time as “${t.S}.”` },
      ],
      explain: (t) => `“${t.S}” is false only when no ${t.n.one} is ${c}. So the opposite is “${t.R}.”`,
    };
  },
  noneColor(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-none', conflict: true, shapes: false,
      s: { t: 'none', d: { color: c } },
      right: { t: 'some', d: { color: c }, style: 'atLeastOne' },
      wrongs: [
        { s: { t: 'every', d: { color: c } }, agree: false, why: (t) => `That goes too far. One ${c} ${t.n.one} is enough to make “${t.S}” false.` },
        { s: { t: 'someNot', d: { color: c } }, agree: true, why: sameTime },
        { s: { t: 'none', d: { color: c2 } }, agree: true, why: sameTime },
      ],
      explain: (t) => `“${t.S}” turns false as soon as one ${t.n.one} is ${c}. So the opposite is “${t.R}.”`,
    };
  },
  exactColor(rng: Rng): NotCase {
    const c = rng.pick(COLORS);
    const k = rng.int(1, 3);
    const fewer: Stmt = k === 1 ? { t: 'none', d: { color: c } } : { t: 'count', d: { color: c }, op: 'lt', k };
    return {
      tag: 'not-exactly', conflict: false, shapes: false,
      s: { t: 'count', d: { color: c }, op: 'eq', k },
      right: { t: 'count', d: { color: c }, op: 'ne', k },
      wrongs: [
        { s: { t: 'count', d: { color: c }, op: 'eq', k, not: true }, why: (t) => `That counts the ${t.n.many} that are not ${c}. That is a different count.` },
        { s: { t: 'count', d: { color: c }, op: 'gt', k }, agree: false, why: (t) => `That is only part of it. There could also be ${k === 1 ? 'no' : `fewer than ${numWord(k)}`} ${c} ${t.n.many}.` },
        { s: fewer, agree: false, why: (t) => `That is only part of it. There could also be more than ${numWord(k)} ${c} ${k === 1 ? t.n.one : t.n.many}.` },
      ],
      explain: (t) => `“${t.S}” is false when the number of ${c} ${t.n.many} is anything but ${numWord(k)}. It could be more or fewer. So the opposite is “${t.R}.”`,
    };
  },
  atLeastShape(rng: Rng): NotCase {
    const s = rng.pick(SHAPES);
    const k = rng.int(2, 3);
    return {
      tag: 'not-at-least', conflict: false, shapes: true,
      s: { t: 'count', d: { shape: s }, op: 'ge', k },
      right: { t: 'count', d: { shape: s }, op: 'lt', k },
      wrongs: [
        { s: { t: 'count', d: { shape: s }, op: 'le', k }, agree: true, why: () => `That still allows exactly ${numWord(k)} ${s}s.` },
        { s: { t: 'count', d: { shape: s }, op: 'ge', k, not: true }, why: () => `That counts the cards that are not ${s}s. That is a different count.` },
        { s: { t: 'none', d: { shape: s } }, agree: false, why: () => `That goes too far. One ${s} is still fewer than ${numWord(k)}.` },
      ],
      explain: (t) => `If there are not at least ${numWord(k)} ${s}s, there are fewer than ${numWord(k)}. So the opposite is “${t.R}.”`,
    };
  },
  firstShape(rng: Rng): NotCase {
    const [s, s2, s3] = rng.shuffle(SHAPES);
    return {
      tag: 'not-first', conflict: false, shapes: true,
      s: { t: 'pos', at: 'first', d: { shape: s } },
      right: { t: 'pos', at: 'first', d: { shape: s }, not: true },
      wrongs: [
        { s: { t: 'pos', at: 'first', d: { shape: s2 } }, agree: false, why: () => `That picks just one other shape. The first card could be ${withA(s3)}, and then both are false.` },
        { s: { t: 'none', d: { shape: s } }, why: () => 'That talks about every card. The sentence is only about the first card.' },
        { s: { t: 'pos', at: 'last', d: { shape: s }, not: true }, why: () => 'That talks about the last card, not the first card.' },
      ],
      explain: (t) => `The first card is ${withA(s)}, or it is not. So the opposite is “${t.R}.”`,
    };
  },
  everyBig(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-every', conflict: true, shapes: false,
      s: { t: 'everyIs', a: { size: 'big' }, b: { color: c } },
      right: { t: 'someIsNot', a: { size: 'big' }, b: { color: c } },
      wrongs: [
        { s: { t: 'noneIs', a: { size: 'big' }, b: { color: c } }, agree: false, why: (t) => `That goes too far. One big ${t.n.one} that is not ${c} is enough to make “${t.S}” false.` },
        { s: { t: 'everyIs', a: { size: 'small' }, b: { color: c } }, why: (t) => `That talks about the small ${t.n.many}. The sentence is about the big ones.` },
        { s: { t: 'everyIs', a: { size: 'big' }, b: { color: c2 } }, agree: false, why: (t) => `Changing the color does not flip it. The big ${t.n.many} could be a mix of colors, and then both are false.` },
      ],
      explain: (t) => `To make “${t.S}” false, you need just one big ${t.n.one} that is not ${c}. So the opposite is “${t.R}.”`,
    };
  },
  everyColorShape(rng: Rng): NotCase {
    const c = rng.pick(COLORS);
    const s = rng.pick(SHAPES);
    return {
      tag: 'not-every', conflict: true, shapes: true,
      s: { t: 'everyIs', a: { color: c }, b: { shape: s } },
      right: { t: 'someIsNot', a: { color: c }, b: { shape: s } },
      wrongs: [
        { s: { t: 'noneIs', a: { color: c }, b: { shape: s } }, agree: false, why: (t) => `That goes too far. One ${c} card that is not ${withA(s)} is enough to make “${t.S}” false.` },
        { s: { t: 'everyIs', a: { shape: s }, b: { color: c } }, why: () => `That turns the sentence around. It is about the ${s}s, not the ${c} cards.` },
        { s: { t: 'every', d: { shape: s } }, agree: true, why: (t) => `That is about every card, not just the ${c} ones. It can be true at the same time as “${t.S}.”` },
      ],
      explain: (t) => `To make “${t.S}” false, you need just one ${c} card that is not ${withA(s)}. So the opposite is “${t.R}.”`,
    };
  },
  moreColor(rng: Rng): NotCase {
    const [c1, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-more', conflict: false, shapes: false,
      s: { t: 'more', a: { color: c1 }, b: { color: c2 } },
      right: { t: 'asMany', a: { color: c2 }, b: { color: c1 } },
      wrongs: [
        { s: { t: 'more', a: { color: c2 }, b: { color: c1 } }, agree: false, why: () => 'That leaves out a tie. When the counts are the same, both are false.' },
        { s: { t: 'asMany', a: { color: c1 }, b: { color: c2 } }, agree: true, why: sameTime },
        { s: { t: 'none', d: { color: c1 } }, agree: false, why: (t) => `That goes too far. There can be some ${c1} ${t.n.many} and still not more ${c1} ${t.n.many} than ${c2} ${t.n.many}.` },
      ],
      explain: (t) => `If there are not more ${c1} ${t.n.many}, then there are as many or more ${c2} ${t.n.many}. That includes a tie. So the opposite is “${t.R}.”`,
    };
  },
  someExact(rng: Rng): NotCase {
    const k = rng.pick(KINDS);
    const d: Desc = { size: k.size, color: k.color, shape: k.shape };
    const other: Desc = { ...d, size: k.size === 'big' ? 'small' : 'big' };
    return {
      tag: 'not-some', conflict: false, shapes: true,
      s: { t: 'some', d },
      right: { t: 'none', d },
      wrongs: [
        { s: { t: 'someNot', d }, agree: true, why: (t) => `That puts the “not” in the wrong place. It can be true at the same time as “${t.S}.”` },
        { s: { t: 'every', d }, agree: true, why: sameTime },
        { s: { t: 'some', d: other }, agree: true, why: (t) => `That is about a different card. It can be true at the same time as “${t.S}.”` },
      ],
      explain: (t) => `“${t.S}” is false only when no card is ${withA(np(d, false))}. So the opposite is “${t.R}.”`,
    };
  },
} as const;

export type NotKey = keyof typeof NOT_BANK;
export const NOT_KEYS = Object.keys(NOT_BANK) as NotKey[];
/** Cases whose classic mistake is every <-> none (conflict items). */
export const NOT_CONFLICT_KEYS: readonly NotKey[] = ['everyColor', 'everyShape', 'noneColor', 'everyBig', 'everyColorShape'];
/** The skill tag of each case ('not-every', 'not-some', ...). Cases with the same tag flip the same kind of sentence. */
export const NOT_TAGS = Object.fromEntries(NOT_KEYS.map((k) => [k, NOT_BANK[k](createRng(1)).tag])) as Record<NotKey, string>;

let testRows: Card[][] | null = null;
/** The rows every opposite is checked on: all rows of 1-3 cards, plus 400 random rows of 3-6 cards. */
export function oppositeTestRows(): Card[][] {
  if (testRows) return testRows;
  const rows: Card[][] = [];
  for (const a of KINDS) {
    rows.push([a]);
    for (const b of KINDS) {
      rows.push([a, b]);
      for (const c of KINDS) rows.push([a, b, c]);
    }
  }
  const r = createRng(0x51a7e);
  for (let i = 0; i < 400; i++) rows.push(Array.from({ length: r.int(3, 6) }, () => r.pick(KINDS)));
  testRows = rows;
  return rows;
}

const exactCache = new Map<string, boolean>();
/** Is `b` true exactly when `a` is false, on every test row? */
export function isExactOpposite(a: Stmt, b: Stmt): boolean {
  const key = JSON.stringify([a, b]);
  let ok = exactCache.get(key);
  if (ok === undefined) {
    ok = oppositeTestRows().every((row) => holds(b, row) === !holds(a, row));
    exactCache.set(key, ok);
  }
  return ok;
}

/**
 * The smallest row where the statement and a wrong pick agree (both true or both false). That row is
 * proof the pick is not the opposite. Only the features the two sentences use vary.
 */
export function agreeingRow(s: Stmt, w: Stmt, agree?: boolean): Card[] | null {
  const feats = featuresOf(s, w);
  const colors: readonly Color[] = feats.has('color') ? COLORS : ['red'];
  const shapes: readonly Shape[] = feats.has('shape') ? SHAPES : ['circle'];
  const sizes: readonly Size[] = feats.has('size') ? SIZES : ['big'];
  const kinds: Card[] = colors.flatMap((color) => shapes.flatMap((shape) => sizes.map((size) => ({ color, shape, size }))));
  const maxLen = kinds.length <= 9 ? 4 : 3;
  const ordered = s.t === 'pos' || w.t === 'pos';
  const mentioned = [s, w].flatMap(descsOf).flatMap((d) => (Object.keys(d) as Feature[]).map((f) => [f, d[f]] as const));
  const agrees = (row: Card[], want?: boolean) => {
    const a = holds(s, row);
    return a === holds(w, row) && (want === undefined || a === want) && nonVacuous([s, w], row);
  };
  const passes: ((row: Card[]) => boolean)[] = [];
  // First choice: a row that shows every color, shape or size the sentences name.
  if (!ordered) passes.push((row) => agrees(row, agree) && mentioned.every(([f, v]) => row.some((c) => c[f] === v)));
  passes.push((row) => agrees(row, agree));
  passes.push((row) => agrees(row));
  for (const ok of passes) {
    for (let len = 1; len <= maxLen; len++) {
      const total = kinds.length ** len;
      for (let f = 0; f < total; f++) {
        const row: Card[] = [];
        let x = f;
        for (let i = 0; i < len; i++) {
          row.push(kinds[x % kinds.length]);
          x = Math.floor(x / kinds.length);
        }
        if (ok(row)) return row;
      }
    }
  }
  return null;
}

function joinList(xs: string[]): string {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
}

/** "Think of a red card and a blue card." Only the features the sentences use are named. */
export function describeRow(row: readonly Card[], feats: Set<Feature>, n: Noun, ordered: boolean): string {
  const only = (c: Card): Desc => {
    const d: Desc = {};
    if (feats.has('size')) d.size = c.size;
    if (feats.has('color')) d.color = c.color;
    if (feats.has('shape')) d.shape = c.shape;
    return d;
  };
  if (ordered) {
    if (row.length === 1) return `Think of a row with just ${withA(np(only(row[0]), false, n))}.`;
    return `Think of a row with ${row.map((c) => withA(np(only(c), false, n))).join(', then ')}.`;
  }
  if (row.length === 1) return `Think of just ${withA(np(only(row[0]), false, n))}.`;
  const groups: { d: Desc; key: string; k: number }[] = [];
  for (const c of row) {
    const d = only(c);
    const key = np(d, false, n);
    const g = groups.find((x) => x.key === key);
    if (g) g.k++;
    else groups.push({ d, key, k: 1 });
  }
  return `Think of ${joinList(groups.map((g) => (g.k === 1 ? withA(g.key) : `${numWord(g.k)} ${np(g.d, true, n)}`)))}.`;
}

const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const PAIRS: readonly [string, string][] = [
  ['troll', 'elf'], ['wizard', 'knight'], ['dragon', 'fairy'], ['giant', 'wizard'], ['elf', 'dragon'],
];

export interface NotItemOptions {
  frame: Frame;
  key?: NotKey;
  /** Pick a case whose classic mistake is every <-> none. */
  conflict?: boolean;
}

/** "Which sentence is the exact opposite?" with 3-4 choices, all checked against the test rows. */
export function notItem(rng: Rng, opts: NotItemOptions): Made {
  const key = opts.key ?? rng.pick(opts.conflict ? NOT_CONFLICT_KEYS : NOT_KEYS);
  const c = NOT_BANK[key](rng);
  const n = c.shapes || opts.frame === 'abstract' ? CARD : rng.pick(opts.frame === 'everyday' ? EVERYDAY_NOUNS : FANTASY_NOUNS);
  if (!isExactOpposite(c.s, c.right)) throw new Error(`notItem ${key}: the right choice is not the exact opposite`);
  const talk: Talk = { S: bare(c.s, n), R: bare(c.right, n), n };
  const ordered = c.s.t === 'pos';
  const extra = rng.shuffle(c.wrongs.slice(1)).slice(0, rng.int(1, 2));
  const wrongs = [c.wrongs[0], ...extra].flatMap((w) => {
    // A wrong choice must disagree with the true opposite on at least one test row.
    if (isExactOpposite(c.s, w.s)) return [];
    const row = agreeingRow(c.s, w.s, w.agree);
    if (!row) return [];
    const both = holds(c.s, row) ? 'true' : 'false';
    const example = `${describeRow(row, featuresOf(c.s, w.s), n, ordered)} The sentence and your pick are both ${both} for that row.`;
    return [{ label: say(w.s, n), why: `${w.why(talk)} ${example}`, s: w.s }];
  });
  const options = rng.shuffle([{ label: say(c.right, n), why: '', s: c.right }, ...wrongs]);
  const choices = options.map((o, i) => ({ id: LETTERS[i], label: o.label }));
  const answer = choices[options.findIndex((o) => o.why === '')].id;
  const whyWrong: Record<string, string> = {};
  options.forEach((o, i) => {
    if (o.why) whyWrong[LETTERS[i]] = o.why;
  });
  const said = say(c.s, n);
  let line: string, prompt: string;
  if (opts.frame === 'abstract') {
    line = `“${said}”`;
    prompt = 'Which sentence is the exact opposite of this one?';
  } else if (opts.frame === 'everyday') {
    const [a, b] = rng.shuffle(NAMES);
    line = `${a} says, “${said}”`;
    prompt = `${b} says the exact opposite. What does ${b} say?`;
  } else {
    const [a, b] = rng.pick(PAIRS);
    line = `The ${a} says, “${said}”`;
    prompt = `The ${b} says the exact opposite. What does the ${b} say?`;
  }
  const item: ItemCore = {
    kind: 'choose',
    prompt,
    scene: { kind: 'text', lines: [line] },
    choices,
    answer,
    explain: c.explain(talk),
    whyWrong,
    hint: `The opposite must be true every time “${talk.S}” is false.`,
  };
  if (c.conflict) item.conflict = true;
  return { tag: c.tag, item, flip: { s: c.s, right: c.right, wrongs: options.filter((o) => o.why).map((o) => o.s), noun: n } };
}

