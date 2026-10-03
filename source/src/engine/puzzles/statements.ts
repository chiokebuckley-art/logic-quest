/**
 * Stop 1 engine: statements about a row of shape cards.
 *
 *  - holds(): does a statement hold for a row where every card is face up?
 *  - truthTable() / judge(): with face-down cards, try every way to fill them (18 kinds of card each).
 *    True in every filling -> 'true', false in every filling -> 'false', otherwise 'cant'.
 *  - rowItem(): a "true, false or can't tell" question. Its explanation comes from the case check:
 *    a visible card that settles it, or the face-down card that could go either way.
 *  - notItem(): "pick the NOT". The right choice is checked to equal NOT(statement) on every test row, and
 *    each wrong choice is checked to agree with the statement on some row. That row becomes the labelled
 *    example in the choice's feedback, and the item teaches with cases that cover every way it can go.
 *  - verdictDrillRow() / notDrillRow(): rows of the guided boards (the Do beat) for lessons 2 and 3. Every mark and
 *    every message for a wrong mark is computed here, from judge(), holds() and isExactOpposite().
 *
 * Only the rng passed in is used for variety. The fixed test rows come from their own fixed seed.
 */
import { createRng } from '../rng';
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, ChooseItem, Color, DrillMark, DrillOption, DrillRow, Rng, Shape, Size, Teach, TeachCase, Thing, Truth } from '../types';

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
  flip?: { s: Stmt; right: Stmt; wrongs: Stmt[]; noun: Noun; examples: Card[][]; cases: Card[][] };
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
  | 'hasColor' | 'hasShape' | 'hasExact' | 'allColor' | 'allShape' | 'allColorShape' | 'noColor'
  | 'exactlyColor' | 'atLeastShape' | 'moreColor' | 'firstShape' | 'allBigColor';

export const ROW_TEMPLATES: readonly RowTemplate[] = [
  'hasColor', 'hasShape', 'hasExact', 'allColor', 'allShape', 'allColorShape', 'noColor',
  'exactlyColor', 'atLeastShape', 'moreColor', 'firstShape', 'allBigColor',
];

/** A statement of the given template that fits this row (null when the row cannot carry it). */
export function rowStatement(rng: Rng, tpl: RowTemplate, row: readonly Thing[]): Stmt | null {
  const vis = row.filter((t) => !t.hidden);
  if (!vis.length) return null;
  switch (tpl) {
    case 'hasColor': return { t: 'some', d: { color: rng.pick(COLORS) } };
    case 'hasShape': return { t: 'some', d: { shape: rng.pick(SHAPES) } };
    case 'hasExact': {
      const c = rng.chance(0.5) ? rng.pick(vis) : rng.pick(KINDS);
      return { t: 'some', d: { size: c.size, color: c.color, shape: c.shape } };
    }
    case 'allColor': return { t: 'every', d: { color: rng.chance(0.6) ? rng.pick(vis).color : rng.pick(COLORS) } };
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

/** The prompt, and whose sentence it is ("Maya’s sentence", "the wizard’s sentence" or "the sentence"). */
function rowPrompt(rng: Rng, frame: Frame, text: string): { prompt: string; whose: string } {
  const ask = 'Is that true, false, or can’t you tell yet?';
  switch (frame) {
    case 'abstract':
      return { prompt: `Look at the cards. “${text}” Is this true, false, or can’t you tell yet?`, whose: 'the sentence' };
    case 'everyday': {
      const name = rng.pick(NAMES);
      return { prompt: `${name} set out these cards and turned some face down. ${name} says, “${text}” ${ask}`, whose: `${name}’s sentence` };
    }
    case 'fantasy': {
      const who = rng.pick(CREATURES);
      return { prompt: `${cap(withA(who))} used magic to turn some cards face down. The ${who} says, “${text}” ${ask}`, whose: `the ${who}’s sentence` };
    }
  }
}

// ---------- teaching for "true, false or can't tell" ----------
//
// Every case is a real way to fill the face-down cards, drawn as the row with those cards turned face up. Its truth
// comes from judge() on that row: a card left face down must not matter, so the verdict there is settled.

export const FACE_DOWN_TERM = { word: 'Face down', meaning: 'turned over, so you can’t see it. A face-down card could be any shape, any color and any size.' };
export const CANT_TELL_TERM = { word: '“Can’t tell”', meaning: 'the face-down cards could make the sentence true, and they could also make it false. You need more clues to know which.' };
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
/** "Card 3 means the third card, counting from the left." */
export const cardTerm = (n: number) => ({ word: `Card ${n}`, meaning: `the ${ORDINAL[n - 1] ?? `number ${n}`} card, counting from the left.` });
const CARD_ONE_TERM = cardTerm(1);
export const ROW_RULE = 'Try every way the face-down cards could be. If every way gives the same answer, that is the answer. If some ways give true and some give false, you can’t tell yet.';
const ROW_ASK = 'Ask: “Could the face-down cards make it true? Could they make it false?”';

/** The one word or phrase in a row statement that needs defining, if any. */
function rowTerm(s: Stmt): { word: string; meaning: string } | null {
  switch (s.t) {
    case 'some': return s.style === 'atLeastOne' ? { word: '“At least one”', meaning: 'one or more.' } : null;
    case 'everyIs': return { word: `“Every ${np(s.a, false)}”`, meaning: `each card that is ${adj(s.a)}. The other cards do not matter here.` };
    case 'count':
      if (s.op === 'eq') return { word: `“Exactly ${numWord(s.k)}”`, meaning: `${s.k}, no more and no fewer.` };
      if (s.op === 'ge') return { word: `“At least ${numWord(s.k)}”`, meaning: `${s.k} or more.` };
      return null;
    case 'more': return { word: '“More”', meaning: 'a larger number. If the two numbers are the same, that is a tie, and neither color has more.' };
    case 'pos': return CARD_ONE_TERM;
    default: return null;
  }
}

/** When a row statement is true, in plain words. */
export function rowMeaning(s: Stmt): string {
  const S = `“${bare(s)}”`;
  switch (s.t) {
    case 'some': return `${S} is true when one or more cards are ${adj(s.d, true)}. One is enough.`;
    case 'every': return `${S} is true only when every card is ${adj(s.d)}. One card that is not ${adj(s.d)} makes it false.`;
    case 'none': return `${S} is true only when no card is ${adj(s.d)}. One ${np(s.d, false)} makes it false.`;
    case 'everyIs': return `${S} is only about the ${np(s.a, true)}. It is true when each ${np(s.a, false)} is ${adj(s.b)}.`;
    case 'count':
      if (s.op === 'ge') return `${S} is true when there are ${s.k} or more ${np(s.d, true)}.`;
      return `${S} is true only when the number of ${np(s.d, true)} is exactly ${s.k}.`;
    case 'more': return `${S} is true only when there are more ${np(s.a, true)} than ${np(s.b, true)}. A tie makes it false.`;
    case 'pos': return `${S} is only about card 1, the first card. It is true when card 1 is ${adj(s.d)}.`;
    default: return `${S} is a sentence about the cards.`;
  }
}

/** One feature of the statement to build a tiny example on: its color, else its shape, else its size. */
function keyDesc(s: Stmt): Desc {
  const d = descsOf(s)[0];
  if (d.color) return { color: d.color };
  if (d.shape) return { shape: d.shape };
  return { size: d.size ?? 'big' };
}

/** A card that does not fit d (for the tiny examples). */
const unlike1 = (d: Desc): Desc => (d.color ? { color: COLORS.find((c) => c !== d.color)! } : d.shape ? { shape: SHAPES.find((x) => x !== d.shape)! } : { size: d.size === 'big' ? 'small' : 'big' });

/** "Cards 1 and 2", "Cards 1, 2 and 3". */
const firstCards = (n: number) => (n === 1 ? 'Card 1' : `Cards ${joinList(Array.from({ length: n }, (_, i) => String(i + 1)))}`);

/** A tiny row for a worked example: these cards face up, with one face-down card at index `at`. */
function tinyRow(shown: readonly Card[], at: number): Thing[] {
  const cards: Thing[] = shown.map((c, i) => ({ id: `t${i + 1}`, shape: c.shape, color: c.color, size: c.size }));
  cards.splice(at, 0, { id: 't0', shape: 'circle', color: 'red', size: 'big', hidden: true });
  return cards.map((c, i) => ({ ...c, id: `t${i + 1}` }));
}

/** "Card 1 is red. Card 2 is yellow. Card 3 is face down." Cards that read the same are told together. */
function describeTiny(row: readonly Thing[], feats: Set<Feature>): string {
  const say1 = (t: Thing, many: boolean) => (t.hidden ? 'face down' : adj(onlyFeats(t, feats), many));
  const out: string[] = [];
  for (let i = 0; i < row.length; ) {
    let j = i + 1;
    while (j < row.length && say1(row[j], false) === say1(row[i], false)) j++;
    const n = j - i;
    out.push(`${n === 1 ? `Card ${i + 1} is` : `Cards ${cardNums(Array.from({ length: n }, (_, k) => i + k))} are`} ${say1(row[i], n > 1)}.`);
    i = j;
  }
  return out.join(' ');
}

/**
 * "Explain more simply" for a "can't tell" row: the same sentence on the smallest row where one face-down card
 * decides it. Every truth here comes from holds() on the filled row, and the row is checked to be "can't tell".
 */
function cantSimpler(s: Stmt): string[] {
  const feats = featuresOf(s);
  let shown: Card[] = [];
  let at = -1;
  const [yes, other] = proCon(s);
  let no = other;
  switch (s.t) {
    case 'count':
      shown = Array.from({ length: Math.max(0, s.k - 1) }, () => kindFor(s.d));
      break;
    case 'every':
      shown = [kindFor(s.d)];
      break;
    case 'everyIs':
      shown = [kindFor({ ...s.a, ...s.b })];
      break;
    case 'more': {
      // One of each color, so the face-down card decides it: a second one of the first color, or a tie.
      shown = [kindFor(s.a), kindFor(s.b)];
      no = KINDS.find((c) => !fits(c, s.a) && !fits(c, s.b)) ?? kindFor(s.b);
      break;
    }
    case 'pos':
      // The first card is face down; a card after it that fits shows it does not matter.
      shown = [kindFor(s.d)];
      at = 0;
      break;
  }
  if (at < 0) at = shown.length;
  const row = tinyRow(shown, at);
  if (judge(s, row) !== 'cant') throw new Error(`cantSimpler: “${say(s)}” is not “can’t tell” on the tiny row`);
  const fill = (k: Card) => row.map((t, i) => (i === at ? k : plainCard(t)));
  const vYes = holds(s, fill(yes)), vNo = holds(s, fill(no));
  if (vYes === vNo) throw new Error(`cantSimpler: both fillings of “${say(s)}” agree`);
  const what = (k: Card) => adj(onlyFeats(k, feats));
  const card = `card ${at + 1}`;
  let second = `If ${card} is ${what(no)}, it is ${vNo ? 'true' : 'false'}.`;
  if (s.t === 'more') {
    const na = countOf(fill(no), s.a), nb = countOf(fill(no), s.b);
    if (na === nb) {
      second = `If ${card} is ${what(no)}, there ${na === 1 ? 'is' : 'are'} ${na} ${np(s.a, na !== 1)} and ${nb} ${np(s.b, nb !== 1)}. That is a tie, so it is ${vNo ? 'true' : 'false'}.`;
    }
  }
  return [
    `Imagine ${row.length} card${row.length === 1 ? '' : 's'}. ${describeTiny(row, feats)}`,
    `“${say(s)}” If ${card} is ${what(yes)}, the sentence is ${vYes ? 'true' : 'false'}.`,
    second,
    'It could go either way. So you can’t tell yet.',
  ];
}

/**
 * "Explain more simply": the smallest row that makes the same point, with the same kind of sentence. A "can't tell"
 * row shrinks to one face-down card that decides it; a settled row to the visible cards that settle it plus one
 * face-down card. Each tiny row is judged here, so the answer it gives is computed, not assumed.
 */
function rowSimpler(s: Stmt, verdict: Verdict, row: readonly Thing[]): string[] {
  return verdict === 'cant' ? cantSimpler(s) : settledSimpler(s, verdict, row);
}

/** The settled tiny row: n cards of one kind, then one face-down card. Its verdict must be the item's. */
function settledSimpler(s: Stmt, verdict: Verdict, row: readonly Thing[]): string[] {
  const d = keyDesc(s);
  const end = `So the answer is ${verdict}, not “Can’t tell.”`;
  /** n visible cards of one kind, then one face-down card, checked to give the item's answer. */
  const setUp = (n: number, what: Desc) => {
    const tiny = tinyRow(Array.from({ length: n }, () => kindFor(what)), n);
    if (judge(s, tiny) !== verdict) throw new Error(`rowSimpler: “${say(s)}” is not ${verdict} on the tiny row`);
    return `Imagine ${n + 1} cards. ${firstCards(n)} ${n === 1 ? 'is' : 'are'} ${adj(what, n !== 1)}. Card ${n + 1} is face down.`;
  };
  const last = (n: number) => `card ${n + 1}`;
  switch (s.t) {
    case 'some':
      return [setUp(1, s.d), `Is there ${withA(np(s.d, false))}? Yes: card 1.`, `Card 2 can’t take card 1 away. ${end}`];
    case 'none':
      return [setUp(1, s.d), `Is it true that no card is ${adj(s.d)}? No: card 1 is ${adj(s.d)}.`, `Card 2 can’t change card 1. ${end}`];
    case 'everyIs': {
      const c1 = { ...s.a, ...unlike1(s.b) };
      return [setUp(1, c1), `“${say(s)}” Card 1 is ${adj(s.a)}, but it is not ${adj(s.b)}.`, `Card 2 can’t change card 1. ${end}`];
    }
    case 'count': {
      if (verdict === 'true') {
        const them = s.k === 1 ? 'it' : 'them';
        return [setUp(s.k, s.d), `“${say(s)}” Yes: ${firstCards(s.k).toLowerCase()} ${s.k === 1 ? 'is' : 'are'} ${adj(s.d, s.k !== 1)}.`, `${cap(last(s.k))} can’t take ${them} away. ${end}`];
      }
      // Too many already showing, or too few even if every face-down card fits: the same way the item is settled.
      const showing = row.filter((t) => !t.hidden && fits(t, s.d)).length;
      if (s.op === 'eq' && showing > s.k && s.k + 1 <= 4) {
        const n = s.k + 1;
        return [setUp(n, s.d), `“${say(s)}” You can already see ${n} ${np(s.d, true)}. That is more than ${s.k}.`, `${cap(last(n))} can’t take one away. ${end}`];
      }
      // "At least k" needs k or more, so 1 falls short; "exactly k" needs k, so 1 is not it.
      const short = s.op === 'ge' ? `That is fewer than ${s.k}.` : `That is not ${s.k}.`;
      return [setUp(1, unlike1(d)), `“${say(s)}” Even if card 2 is ${adj(s.d)}, only 1 card is ${adj(s.d)}.`, `${short} ${end}`];
    }
    case 'more': {
      const [win, lose] = verdict === 'true' ? [s.a, s.b] : [s.b, s.a];
      const two = (x: Desc, n: number) => `${n} ${np(x, n !== 1)}`;
      const counts = verdict === 'true' ? `${two(s.a, 2)} and ${two(s.b, 1)}` : `${two(s.a, 1)} and ${two(s.b, 2)}`;
      return [setUp(2, win), `Even if card 3 is ${adj(lose)}, there ${verdict === 'true' ? 'are' : 'is'} ${counts}.`, end];
    }
    case 'pos': {
      const c1 = verdict === 'true' ? s.d : unlike1(d);
      return [setUp(1, c1), `“${say(s)}” It is only about card 1, and card 1 is ${verdict === 'true' ? '' : 'not '}${adj(s.d)}.`, `Card 2 can’t change that. ${end}`];
    }
    default: {
      // "Every card is red": one card you can see that is not red settles it.
      return [setUp(1, unlike1(d)), `Is every card ${adj(d)}? No: card 1 is not.`, `Card 2 can’t change card 1. ${end}`];
    }
  }
}

/** "3", "3 and 5", "1, 3 and 5". */
const cardNums = (idx: readonly number[]) => joinList(idx.map((i) => String(i + 1)));

/** A fact about a row with every card face up, counted by the engine: "Now there are 3 blue cards and 2 yellow cards." */
export function rowTally(s: Stmt, cards: readonly Card[]): string | undefined {
  const cnt = (d: Desc) => cards.filter((c) => fits(c, d)).length;
  switch (s.t) {
    case 'some': case 'none': case 'count': {
      if (s.t === 'count' && s.not) return undefined;
      const n = cnt(s.d);
      return `Now ${n === 0 ? 'no card is' : n === 1 ? '1 card is' : `${n} cards are`} ${adj(s.d, n > 1)}.`;
    }
    case 'every': {
      const n = cnt(s.d);
      if (n === cards.length) return `Now every card is ${adj(s.d)}.`;
      if (n === 0) return `Now no card is ${adj(s.d)}.`;
      return `Now ${n} of the ${cards.length} cards ${n === 1 ? 'is' : 'are'} ${adj(s.d, n !== 1)}.`;
    }
    case 'everyIs': {
      const na = cnt(s.a);
      const nab = cards.filter((c) => fits(c, s.a) && fits(c, s.b)).length;
      if (na === 0) return `Now no card is ${adj(s.a)}.`;
      if (na === 1) return `Now there is 1 ${np(s.a, false)}, and it is ${nab ? '' : 'not '}${adj(s.b)}.`;
      return `Now there are ${na} ${np(s.a, true)}. ${nab === 0 ? 'None' : nab === na ? `All ${nab}` : nab} of them ${nab === 1 ? 'is' : 'are'} ${adj(s.b, nab !== 1)}.`;
    }
    case 'more': {
      const na = cnt(s.a), nb = cnt(s.b);
      const num = (n: number) => (n === 0 ? 'no' : String(n));
      const t = `Now there ${na === 1 ? 'is' : 'are'} ${num(na)} ${np(s.a, na !== 1)} and ${num(nb)} ${np(s.b, nb !== 1)}.`;
      return na === nb ? `${t} That is a tie, so ${np(s.a, true)} do not have more.` : t;
    }
    case 'pos': return cards[0] ? `Now card 1 is ${adj(onlyFeats(cards[0], featuresOf(s)))}.` : undefined;
    default: return undefined;
  }
}

/** One filled-in row: the cards (some may stay face down), what was filled, and the sentence's truth there. */
interface RowFill {
  row: Thing[];
  /** "face-down card 3 is red" (lowercase start, no period). */
  phrase: string;
  /** Face-down cards that were left face down. */
  rest: number[];
  value: boolean;
}

/**
 * Turn the face-down cards at `idx` face up as card `k`. The others stay face down. The sentence must be settled
 * on the new row (the cards left face down can't change it); its truth comes from judge().
 */
function fillRow(s: Stmt, row: readonly Thing[], idx: readonly number[], k: Card): RowFill {
  const out = row.map((t) => ({ ...t }));
  for (const i of idx) out[i] = { id: row[i].id, shape: k.shape, color: k.color, size: k.size };
  const v = judge(s, out);
  if (v === 'cant') throw new Error(`fillRow: “${say(s)}” is not settled when cards ${cardNums(idx)} are filled`);
  const rest = row.flatMap((t, i) => (t.hidden && !idx.includes(i) ? [i] : []));
  const what = onlyFeats(k, featuresOf(s));
  const phrase = idx.length === 1
    ? `face-down card ${idx[0] + 1} is ${adj(what)}`
    : `face-down cards ${cardNums(idx)} are ${idx.length > 2 ? 'all ' : ''}${adj(what, true)}`;
  return { row: out, phrase, rest, value: v === 'true' };
}

function fillCase(s: Stmt, f: RowFill, whose: string): TeachCase {
  let label = `${cap(f.phrase)}.`;
  let note: string | undefined;
  if (f.rest.length) {
    const rest = f.rest.length === 1 ? `card ${f.rest[0] + 1}` : `cards ${cardNums(f.rest)}`;
    label += ` ${cap(rest)} ${f.rest.length === 1 ? 'is' : 'are'} still face down.`;
    note = `Whatever ${rest} ${f.rest.length === 1 ? 'is' : 'are'}, ${whose} is ${f.value ? 'true' : 'false'}.`;
  } else {
    note = rowTally(s, f.row.map(plainCard));
  }
  const c: TeachCase = { label, things: f.row, truths: [{ who: cap(whose), value: f.value }] };
  if (note) c.note = note;
  return c;
}

/** The first kind of card that fits `yes` and not `no`. */
const kindFor = (yes: Desc, no?: Desc): Card => {
  const k = KINDS.find((c) => fits(c, yes) && !(no && fits(c, no)));
  if (!k) throw new Error('kindFor: no such card');
  return k;
};

/**
 * For a settled row: fill every face-down card the way that helps the sentence most (pro), and the way that hurts
 * it most (con). Both come out the same, which shows the face-down cards can't change the answer.
 */
function proCon(s: Stmt): [Card, Card] {
  switch (s.t) {
    case 'some': case 'every': case 'count': case 'pos': return [kindFor(s.d), kindFor({}, s.d)];
    case 'none': return [kindFor({}, s.d), kindFor(s.d)];
    case 'everyIs': return [kindFor({ ...s.a, ...s.b }), kindFor(s.a, s.b)];
    case 'more': case 'asMany': return [kindFor(s.a), kindFor(s.b)];
    default: return [kindFor(descsOf(s)[0]), kindFor({}, descsOf(s)[0])];
  }
}

interface RowTeach {
  teach: Teach;
  feedback: Record<string, ChoiceFeedback>;
}

/** Teaching for a row item, and one explanation for each wrong choice. */
function rowTeach(
  s: Stmt,
  row: readonly Thing[],
  verdict: Verdict,
  whose: string,
  looks: boolean | null,
  cant: { whenTrue: string; whenFalse: string; claims: Claim[] } | null,
  reason: string | null,
): RowTeach {
  const hidden = row.flatMap((t, i) => (t.hidden ? [i] : []));
  const feedback: Record<string, ChoiceFeedback> = {};
  let cases: TeachCase[];
  let casesTitle: string;
  if (verdict === 'cant' && cant) {
    const fills = cant.claims.map((cl) => fillRow(s, row, cl.card === 'all' ? hidden : [hidden[cl.card]], kindFor(cl.p.not ? {} : cl.p.d, cl.p.not ? cl.p.d : undefined)));
    const [yes, no] = fills;
    if (!yes.value || no.value) throw new Error('rowTeach: the cases do not show true and false');
    cases = fills.map((f) => fillCase(s, f, whose));
    casesTitle = 'Can the face-down cards make it true? Can they make it false?';
    const seen = (v: boolean) =>
      looks === v ? [`The cards you can see make it look ${v ? 'true' : 'false'}. But the face-down cards count too.`] : [];
    feedback.true = {
      headline: 'Your answer says true, but the face-down cards could make it false.',
      detail: [
        '“True” would mean the sentence is true for every way to fill the face-down cards.',
        `But if ${no.phrase}, ${whose} is false.`,
        ...seen(true),
        `${cant.whenTrue} So you can’t tell yet.`,
      ],
      example: cases[1],
    };
    feedback.false = {
      headline: 'Your answer says false, but the face-down cards could make it true.',
      detail: [
        '“False” would mean the sentence is false for every way to fill the face-down cards.',
        `But if ${yes.phrase}, ${whose} is true.`,
        ...seen(false),
        `${cant.whenFalse} So you can’t tell yet.`,
      ],
      example: cases[0],
    };
  } else {
    const v = verdict === 'true';
    const [pro, con] = proCon(s).map((k) => fillRow(s, row, hidden, k));
    if (pro.value !== v || con.value !== v) throw new Error('rowTeach: a settled row changed when filled');
    cases = [pro, con].map((f) => fillCase(s, f, whose));
    casesTitle = 'Can the face-down cards change the answer?';
    // The case that tries hardest to flip it: for "exactly k", the filling whose count is nearer k.
    let flip = v ? 1 : 0;
    if (s.t === 'count' && s.op === 'eq') {
      const near = (f: RowFill) => Math.abs(f.row.filter((c) => fits(c, s.d)).length - s.k);
      flip = near(pro) <= near(con) ? 0 : 1;
    }
    const tryIt = [pro, con][flip];
    const why = reason ?? '';
    const evenIf = /Even if/.test(why) ? [] : [`Even if ${tryIt.phrase}, ${whose} is still ${verdict}.`];
    const tv = v ? 'true' : 'false';
    const other = v ? 'false' : 'true';
    feedback[other] = {
      headline: `Your answer says ${other}, but the cards you can see already make it ${tv}.`,
      detail: [`Your answer means the sentence is ${other}.`, `Look at the cards you can see. ${why}`, `So ${whose} is ${tv}, whatever the face-down cards are.`],
      example: cases[flip],
    };
    feedback.cant = {
      headline: `Your answer says “Can’t tell,” but the face-down cards can’t make it ${other}, whatever they are.`,
      detail: ['“Can’t tell” would mean the face-down cards could make it true, and could also make it false.', why, ...evenIf, `So the answer is ${tv}.`],
      example: cases[flip],
    };
  }
  // No hard word in the sentence: define the card number the explanation names first ("Card 4 is yellow.").
  const named = /\b[Cc]ard (\d)/.exec(verdict === 'cant' ? `${cant?.whenTrue ?? ''} ${cant?.whenFalse ?? ''}` : reason ?? '');
  const terms = [FACE_DOWN_TERM, CANT_TELL_TERM, rowTerm(s) ?? cardTerm(named ? Number(named[1]) : hidden[0] + 1)];
  return {
    teach: {
      rule: ROW_RULE,
      terms,
      meaning: rowMeaning(s),
      casesTitle,
      cases,
      remember: ['If some ways make it true and some make it false, you can’t tell yet.', ROW_ASK],
      simpler: rowSimpler(s, verdict, row),
    },
    feedback,
  };
}

export interface RowItemOptions {
  frame: Frame;
  /** The answer this item should have. */
  target?: Verdict;
  /** Ask for a "can't tell" item where the cards you can see make true or false look obvious. */
  conflict?: boolean;
  /** The kinds of sentence to ask about (default: every template). A lesson passes only the kinds it taught. */
  templates?: readonly RowTemplate[];
}

/** The hint for a row item: one way to fill the face-down cards, already checked (its case card shows it). */
export const ROW_HINT = 'Here is one way the face-down cards could be, already checked. Could another way change the answer?';

/** A "true, false or can't tell" item about a row of cards with some face down. */
export function rowItem(rng: Rng, opts: RowItemOptions): Made {
  for (let attempt = 0; attempt < 6000; attempt++) {
    const strict = attempt < 5000;
    const row = randomRow(rng);
    const s = rowStatement(rng, rng.pick(opts.templates ?? ROW_TEMPLATES), row);
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
    let cant: ReturnType<typeof cantTellCases> = null;
    let reason: string | null = null;
    if (verdict === 'cant') {
      cant = cantTellCases(hidden, table, looks === null ? true : !looks);
      if (!cant) continue;
      explain = cant.explain;
      claims = cant.claims;
    } else {
      reason = settledReason(s, row, verdict === 'true');
      if (!reason) continue;
      explain = `${reason} So it is ${verdict}, no matter what is face down.`;
    }
    const { prompt, whose } = rowPrompt(rng, opts.frame, text);
    const { teach, feedback } = rowTeach(s, row, verdict, whose, looks, cant, reason);
    const cases = teach.cases!;
    // The hint draws one filling already checked. Can't tell: the filling that goes against what the visible cards
    // suggest. Settled: the filling that agrees most easily (the explanation keeps the one that tries to flip it).
    const hintCase = verdict === 'cant' ? cases[looks === true ? 1 : 0] : cases.find((c) => c !== feedback[verdict === 'true' ? 'false' : 'true'].example)!;
    const item: ItemCore = {
      kind: 'choose',
      prompt,
      scene: { kind: 'things', things: row },
      choices: VERDICT_CHOICES.map((c) => ({ ...c })),
      answer: verdict,
      explain,
      feedback,
      hint: ROW_HINT,
      hintCase,
      teach,
    };
    syncWhyWrong(item);
    if (conflict) item.conflict = true;
    return { tag: verdict === 'cant' ? 'cant-tell' : 'check-cards', item, stmt: s, ...(claims ? { claims } : {}) };
  }
  throw new Error('rowItem: no item found');
}

// ---------- the NOT flip ----------
//
// NOT means the original statement is false. Its NOT is true whenever the statement is false, and false whenever
// it is true. Every case in the bank says what its statement means, which words need defining, the rows that show
// every way it can go, and what each wrong pick gets wrong. notItem() checks all of it on the test rows and turns
// each wrong pick's counterexample row into a labelled example card.

/** The words a feedback message can use. */
interface Talk {
  /** The statement, no final period. */
  S: string;
  /** The right NOT sentence, no final period. */
  R: string;
  n: Noun;
  /** "the dragon’s statement", "Maya’s statement" or "the statement". */
  whose: string;
}

interface WrongOpposite {
  s: Stmt;
  /** Names the gap in one sentence: "Your answer leaves out one possibility: a tie." */
  head: (t: Talk) => string;
  /** What the pick gets wrong, before the example case. */
  why: (t: Talk) => string;
  /** The example row should make the statement and this pick both true (true) or both false (false). */
  agree?: boolean;
  /** "Explain more simply" for this pick, when the case's own smallest example is about a different mistake. */
  simpler?: (t: Talk) => string[];
}

/** A row that shows one way the statement can go, and what it shows. */
interface CaseRow {
  row: Card[];
  note: string;
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
  /** When the statement is true, in plain words. */
  meaning: (t: Talk) => string;
  /** Words the explanation uses, defined in place. */
  terms: (t: Talk) => { word: string; meaning: string }[];
  /** Rows that cover every way the statement can go. */
  cases: (t: Talk) => CaseRow[];
  /** The rule in a few words. */
  remember: (t: Talk) => string;
  /** The smallest worked example of the classic mistake. */
  simpler: (t: Talk) => string[];
}

export const NOT_RULE = 'NOT means the original statement is false.';
const NOT_ASK = 'Ask: “Have I covered every way the statement could be false?”';
const AT_LEAST_ONE = { word: '“At least one”', meaning: 'one or more.' };

/** n cards of one kind. Only the features the sentence names matter; the others are fixed. */
const kind = (d: Desc): Card => ({ color: d.color ?? 'red', shape: d.shape ?? 'circle', size: d.size ?? 'big' });
const times = (d: Desc, k: number): Card[] => Array.from({ length: k }, () => kind(d));
const sameTime = (t: Talk) => `That can be true at the same time as ${t.whose}.`;
const overlapHead = (t: Talk) => `Your answer can be true at the same time as ${t.whose}.`;

export const NOT_BANK = {
  everyColor(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-every', conflict: true, shapes: false,
      s: { t: 'every', d: { color: c } },
      right: { t: 'someNot', d: { color: c } },
      wrongs: [
        { s: { t: 'none', d: { color: c } }, agree: false, head: () => 'Your answer goes too far.', why: (t) => `One ${t.n.one} that is not ${c} is enough to make “${t.S}” false. Your answer says no ${t.n.one} is ${c} at all.` },
        { s: { t: 'some', d: { color: c }, style: 'atLeastOne' }, agree: true, head: overlapHead, why: (t) => `When every ${t.n.one} is ${c}, at least one ${t.n.one} is ${c} too.` },
        { s: { t: 'every', d: { color: c2 } }, agree: false, head: () => 'Changing the color does not flip it.', why: (t) => `The ${t.n.many} could be a mix of colors.` },
      ],
      explain: (t) => `To make “${t.S}” false, you only need one ${t.n.one} that is not ${c}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true only when every ${t.n.one} is ${c}. Just one ${t.n.one} that is not ${c} makes it false.`,
      terms: () => [AT_LEAST_ONE],
      cases: (t) => [
        { row: times({ color: c }, 3), note: `Every ${t.n.one} is ${c}.` },
        { row: [...times({ color: c }, 2), kind({ color: c2 })], note: `One ${t.n.one} is not ${c}.` },
        { row: times({ color: c2 }, 2), note: `No ${t.n.one} is ${c}.` },
      ],
      remember: () => 'NOT “every” means at least one is not.',
      simpler: (t) => [
        `Imagine 2 ${t.n.many}: 1 ${c} ${t.n.one} and 1 ${c2} ${t.n.one}.`,
        `Is every ${t.n.one} ${c}? No. So the NOT must be true here.`,
        `Is it true that no ${t.n.one} is ${c}? No, one is ${c}. So that sentence is not the NOT.`,
        `“${t.R}” is true here. That is the NOT.`,
      ],
    };
  },
  everyShape(rng: Rng): NotCase {
    const [s, s2, s3] = rng.shuffle(SHAPES);
    return {
      tag: 'not-every', conflict: true, shapes: true,
      s: { t: 'every', d: { shape: s } },
      right: { t: 'someNot', d: { shape: s } },
      wrongs: [
        { s: { t: 'none', d: { shape: s } }, agree: false, head: () => 'Your answer goes too far.', why: (t) => `One card that is not ${withA(s)} is enough to make “${t.S}” false. Your answer says no card is ${withA(s)} at all.` },
        { s: { t: 'every', d: { shape: s2 } }, agree: false, head: () => 'Changing the shape does not flip it.', why: () => 'The cards could be a mix of shapes.' },
        { s: { t: 'some', d: { shape: s }, style: 'atLeastOne' }, agree: true, head: overlapHead, why: () => `When every card is ${withA(s)}, at least one card is ${withA(s)} too.` },
      ],
      explain: (t) => `To make “${t.S}” false, you only need one card that is not ${withA(s)}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true only when every card is ${withA(s)}. Just one card that is not ${withA(s)} makes it false.`,
      terms: () => [AT_LEAST_ONE],
      cases: () => [
        { row: times({ shape: s }, 3), note: `Every card is ${withA(s)}.` },
        { row: [...times({ shape: s }, 2), kind({ shape: s2 })], note: `One card is not ${withA(s)}.` },
        { row: [kind({ shape: s2 }), kind({ shape: s3 })], note: `No card is ${withA(s)}.` },
      ],
      remember: () => 'NOT “every” means at least one is not.',
      simpler: (t) => [
        `Imagine 2 cards: ${withA(s)} and ${withA(s2)}.`,
        `Is every card ${withA(s)}? No. So the NOT must be true here.`,
        `Is it true that no card is ${withA(s)}? No, one card is ${withA(s)}. So that sentence is not the NOT.`,
        `“${t.R}” is true here. That is the NOT.`,
      ],
    };
  },
  someColor(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-some', conflict: false, shapes: false,
      s: { t: 'some', d: { color: c } },
      right: { t: 'none', d: { color: c } },
      wrongs: [
        { s: { t: 'someNot', d: { color: c } }, agree: true, head: () => 'Your answer puts the “not” in the wrong place.', why: sameTime,
          simpler: (t) => [`Imagine 2 ${t.n.many}: 1 ${c} ${t.n.one} and 1 ${c2} ${t.n.one}.`, `There is a ${c} ${t.n.one}. So “${t.S}” is true here.`, `One ${t.n.one} is not ${c}. So your answer is true here too.`, 'A statement and its NOT are never true at the same time. So your answer is not the NOT.'] },
        { s: { t: 'every', d: { color: c } }, agree: true, head: overlapHead, why: (t) => `If every ${t.n.one} is ${c}, there is a ${c} ${t.n.one} too.` },
        { s: { t: 'some', d: { color: c2 } }, agree: true, head: () => `Your answer is about ${c2} things, not ${c} things.`, why: (t) => `It says nothing about ${c} ${t.n.many}. ${sameTime(t)}` },
      ],
      explain: (t) => `“${t.S}” is false only when no ${t.n.one} is ${c}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true when at least one ${t.n.one} is ${c}. It is false only when no ${t.n.one} is ${c}.`,
      terms: () => [AT_LEAST_ONE],
      cases: (t) => [
        { row: [kind({ color: c }), kind({ color: c2 })], note: `One ${t.n.one} is ${c}.` },
        { row: times({ color: c }, 2), note: `Every ${t.n.one} is ${c}.` },
        { row: times({ color: c2 }, 2), note: `No ${t.n.one} is ${c}.` },
      ],
      remember: () => 'NOT “there is one” means there is none.',
      simpler: (t) => [
        `Imagine 2 ${c2} ${t.n.many} and no ${c} ${t.n.many}.`,
        `Is there a ${c} ${t.n.one}? No. So “${t.S}” is false, and the NOT must be true.`,
        `“${t.R}” is true here. That is the NOT.`,
      ],
    };
  },
  noneColor(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-none', conflict: true, shapes: false,
      s: { t: 'none', d: { color: c } },
      right: { t: 'some', d: { color: c }, style: 'atLeastOne' },
      wrongs: [
        { s: { t: 'every', d: { color: c } }, agree: false, head: () => 'Your answer goes too far.', why: (t) => `One ${c} ${t.n.one} is enough to make “${t.S}” false. Your answer says every ${t.n.one} is ${c}.` },
        { s: { t: 'someNot', d: { color: c } }, agree: true, head: overlapHead, why: (t) => `When no ${t.n.one} is ${c}, every ${t.n.one} is not ${c}.` },
        { s: { t: 'none', d: { color: c2 } }, agree: true, head: () => `Your answer is about ${c2} things, not ${c} things.`, why: (t) => `It says nothing about ${c} ${t.n.many}. ${sameTime(t)}` },
      ],
      explain: (t) => `“${t.S}” turns false as soon as one ${t.n.one} is ${c}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true only when no ${t.n.one} is ${c}. Just one ${c} ${t.n.one} makes it false.`,
      terms: () => [AT_LEAST_ONE],
      cases: (t) => [
        { row: times({ color: c2 }, 2), note: `No ${t.n.one} is ${c}.` },
        { row: [kind({ color: c }), kind({ color: c2 })], note: `One ${t.n.one} is ${c}.` },
        { row: times({ color: c }, 2), note: `Every ${t.n.one} is ${c}.` },
      ],
      remember: () => 'NOT “none” means at least one.',
      simpler: (t) => [
        `Imagine 2 ${t.n.many}: 1 ${c} ${t.n.one} and 1 ${c2} ${t.n.one}.`,
        `Is it true that no ${t.n.one} is ${c}? No, one is ${c}. So the NOT must be true here.`,
        `Is every ${t.n.one} ${c}? No. So that sentence is not the NOT.`,
        `“${t.R}” is true here. That is the NOT.`,
      ],
    };
  },
  exactColor(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    const k = rng.int(1, 3);
    const fewer: Stmt = k === 1 ? { t: 'none', d: { color: c } } : { t: 'count', d: { color: c }, op: 'lt', k };
    return {
      tag: 'not-exactly', conflict: false, shapes: false,
      s: { t: 'count', d: { color: c }, op: 'eq', k },
      right: { t: 'count', d: { color: c }, op: 'ne', k },
      wrongs: [
        { s: { t: 'count', d: { color: c }, op: 'eq', k, not: true }, head: () => 'Your answer counts a different group.', why: (t) => `It counts the ${t.n.many} that are not ${c}. That is a different count.` },
        { s: { t: 'count', d: { color: c }, op: 'gt', k }, agree: false, head: () => 'Your answer is only part of it.', why: (t) => `There could also be ${k === 1 ? 'no' : `fewer than ${numWord(k)}`} ${c} ${t.n.many}.` },
        { s: fewer, agree: false, head: () => 'Your answer is only part of it.', why: (t) => `There could also be more than ${numWord(k)} ${c} ${k === 1 ? t.n.one : t.n.many}.` },
      ],
      explain: (t) => `“${t.S}” is false when the number of ${c} ${t.n.many} is anything but ${numWord(k)}. It could be more or fewer. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true only when the number of ${c} ${t.n.many} is exactly ${k}.`,
      terms: () => [{ word: `“Exactly ${numWord(k)}”`, meaning: `${k}, no more and no fewer.` }],
      cases: () => [
        { row: [...times({ color: c }, k), kind({ color: c2 })], note: `Exactly ${k} ${c}.` },
        { row: times({ color: c }, k + 1), note: `More than ${k} ${c}.` },
        { row: [...times({ color: c }, k - 1), kind({ color: c2 }), kind({ color: c2 })], note: `Fewer than ${k} ${c}.` },
      ],
      remember: () => `NOT “exactly ${numWord(k)}” means more than ${numWord(k)} or fewer than ${numWord(k)}.`,
      simpler: (t) => [
        `Imagine ${k + 1} ${c} ${t.n.many}.`,
        `Is that exactly ${k}? No, it is more. So “${t.S}” is false, and the NOT must be true.`,
        `Now imagine ${k - 1} ${c} ${k - 1 === 1 ? t.n.one : t.n.many}. That is not exactly ${k} either.`,
        `“${t.R}” is true both times. That is the NOT.`,
      ],
    };
  },
  atLeastShape(rng: Rng): NotCase {
    const [s, s2] = rng.shuffle(SHAPES);
    const k = rng.int(2, 3);
    return {
      tag: 'not-at-least', conflict: false, shapes: true,
      s: { t: 'count', d: { shape: s }, op: 'ge', k },
      right: { t: 'count', d: { shape: s }, op: 'lt', k },
      wrongs: [
        { s: { t: 'count', d: { shape: s }, op: 'le', k }, agree: true, head: () => `Your answer still allows exactly ${numWord(k)} ${s}s.`, why: () => `“At most ${numWord(k)}” includes exactly ${numWord(k)}. With exactly ${k} ${s}s, the statement is true too.`,
          simpler: (t) => [`Imagine exactly ${k} ${s}s.`, `Are there at least ${k}? Yes. So “${t.S}” is true, and its NOT must be false.`, `Are there at most ${k}? Yes. So your answer is true here too. It is not the NOT.`] },
        { s: { t: 'count', d: { shape: s }, op: 'ge', k, not: true }, head: () => 'Your answer counts a different group.', why: () => `It counts the cards that are not ${s}s. That is a different count.` },
        { s: { t: 'none', d: { shape: s } }, agree: false, head: () => 'Your answer goes too far.', why: () => `One ${s} is still fewer than ${numWord(k)}.` },
      ],
      explain: (t) => `If there are not at least ${numWord(k)} ${s}s, there are fewer than ${numWord(k)}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true when there are ${k} or more ${s}s.`,
      terms: () => [
        { word: `“At least ${numWord(k)}”`, meaning: `${k} or more.` },
        { word: `“At most ${numWord(k)}”`, meaning: `${k} or fewer.` },
        { word: `“Fewer than ${numWord(k)}”`, meaning: `${k - 1} or fewer.` },
      ],
      cases: () => [
        { row: [...times({ shape: s }, k + 1)], note: `More than ${k} ${s}s.` },
        { row: [...times({ shape: s }, k), kind({ shape: s2 })], note: `Exactly ${k} ${s}s. That is at least ${k}.` },
        { row: [...times({ shape: s }, k - 1), kind({ shape: s2 }), kind({ shape: s2 })], note: `Only ${k - 1} ${k - 1 === 1 ? s : `${s}s`}. That is fewer than ${k}.` },
      ],
      remember: () => `NOT “at least ${numWord(k)}” means fewer than ${numWord(k)}.`,
      simpler: (t) => [
        `Count the ${s}s.`,
        `With ${k} or more, “${t.S}” is true. With ${k - 1} or fewer, it is false.`,
        `“${t.R}” is true just when there are ${k - 1} or fewer. That is the NOT.`,
      ],
    };
  },
  firstShape(rng: Rng): NotCase {
    const [s, s2, s3] = rng.shuffle(SHAPES);
    return {
      tag: 'not-first', conflict: false, shapes: true,
      s: { t: 'pos', at: 'first', d: { shape: s } },
      right: { t: 'pos', at: 'first', d: { shape: s }, not: true },
      wrongs: [
        { s: { t: 'pos', at: 'first', d: { shape: s2 } }, agree: false, head: () => 'Your answer picks just one other shape.', why: () => `The first card could also be ${withA(s3)}.` },
        { s: { t: 'none', d: { shape: s } }, head: () => 'Your answer talks about every card.', why: () => 'The statement is only about the first card.' },
        { s: { t: 'pos', at: 'last', d: { shape: s }, not: true }, head: () => 'Your answer talks about the last card.', why: () => 'The statement is only about the first card.' },
      ],
      explain: (t) => `The first card is ${withA(s)}, or it is not. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is only about the first card. It is true when the first card is ${withA(s)}.`,
      terms: () => [{ word: 'The first card', meaning: 'the card at the start of the row.' }],
      cases: () => [
        { row: [kind({ shape: s }), kind({ shape: s2 })], note: `The first card is ${withA(s)}.` },
        { row: [kind({ shape: s2 }), kind({ shape: s })], note: `The first card is ${withA(s2)}.` },
        { row: [kind({ shape: s3 }), kind({ shape: s })], note: `The first card is ${withA(s3)}.` },
      ],
      remember: () => 'NOT is about the same card. Only the “is” changes to “is not.”',
      simpler: (t) => [
        'Look only at the first card.',
        `If it is ${withA(s)}, “${t.S}” is true. If it is any other shape, the statement is false.`,
        `“${t.R}” is true for every other shape. That is the NOT.`,
      ],
    };
  },
  everyBig(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-every', conflict: true, shapes: false,
      s: { t: 'everyIs', a: { size: 'big' }, b: { color: c } },
      right: { t: 'someIsNot', a: { size: 'big' }, b: { color: c } },
      wrongs: [
        { s: { t: 'noneIs', a: { size: 'big' }, b: { color: c } }, agree: false, head: () => 'Your answer goes too far.', why: (t) => `One big ${t.n.one} that is not ${c} is enough to make “${t.S}” false. Your answer says no big ${t.n.one} is ${c} at all.` },
        { s: { t: 'everyIs', a: { size: 'small' }, b: { color: c } }, head: () => 'Your answer talks about the small ones.', why: (t) => `The statement is about the big ${t.n.many}.` },
        { s: { t: 'everyIs', a: { size: 'big' }, b: { color: c2 } }, agree: false, head: () => 'Changing the color does not flip it.', why: (t) => `The big ${t.n.many} could be a mix of colors.` },
      ],
      explain: (t) => `To make “${t.S}” false, you need just one big ${t.n.one} that is not ${c}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is about the big ${t.n.many} only. It is true when every big ${t.n.one} is ${c}.`,
      terms: () => [AT_LEAST_ONE],
      cases: (t) => [
        { row: [...times({ size: 'big', color: c }, 2), kind({ size: 'small', color: c2 })], note: `Every big ${t.n.one} is ${c}.` },
        { row: [kind({ size: 'big', color: c }), kind({ size: 'big', color: c2 })], note: `One big ${t.n.one} is not ${c}.` },
        { row: times({ size: 'big', color: c2 }, 2), note: `No big ${t.n.one} is ${c}.` },
      ],
      remember: () => 'NOT “every” means at least one is not.',
      simpler: (t) => [
        `Imagine 2 big ${t.n.many}: 1 ${c} and 1 ${c2}.`,
        `Is every big ${t.n.one} ${c}? No. So the NOT must be true here.`,
        `Is it true that no big ${t.n.one} is ${c}? No, one is ${c}. So that sentence is not the NOT.`,
        `“${t.R}” is true here. That is the NOT.`,
      ],
    };
  },
  everyColorShape(rng: Rng): NotCase {
    const c = rng.pick(COLORS);
    const [s, s2] = rng.shuffle(SHAPES);
    const c2 = COLORS.find((x) => x !== c)!;
    return {
      tag: 'not-every', conflict: true, shapes: true,
      s: { t: 'everyIs', a: { color: c }, b: { shape: s } },
      right: { t: 'someIsNot', a: { color: c }, b: { shape: s } },
      wrongs: [
        { s: { t: 'noneIs', a: { color: c }, b: { shape: s } }, agree: false, head: () => 'Your answer goes too far.', why: (t) => `One ${c} card that is not ${withA(s)} is enough to make “${t.S}” false. Your answer says no ${c} card is ${withA(s)} at all.` },
        { s: { t: 'everyIs', a: { shape: s }, b: { color: c } }, head: () => 'Your answer turns the sentence around.', why: () => `It is about the ${s}s, not the ${c} cards.` },
        { s: { t: 'every', d: { shape: s } }, agree: true, head: overlapHead, why: () => `It is about every card, not just the ${c} ones. When every card is ${withA(s)}, every ${c} card is too.` },
      ],
      explain: (t) => `To make “${t.S}” false, you need just one ${c} card that is not ${withA(s)}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is about the ${c} cards only. It is true when every ${c} card is ${withA(s)}.`,
      terms: () => [AT_LEAST_ONE],
      cases: () => [
        { row: [kind({ color: c, shape: s }), kind({ color: c, shape: s }), kind({ color: c2, shape: s2 })], note: `Every ${c} card is ${withA(s)}.` },
        { row: [kind({ color: c, shape: s }), kind({ color: c, shape: s2 })], note: `One ${c} card is not ${withA(s)}.` },
        { row: [kind({ color: c, shape: s2 }), kind({ color: c, shape: s2 })], note: `No ${c} card is ${withA(s)}.` },
      ],
      remember: () => 'NOT “every” means at least one is not.',
      simpler: (t) => [
        `Imagine 2 ${c} cards: ${withA(s)} and ${withA(s2)}.`,
        `Is every ${c} card ${withA(s)}? No. So the NOT must be true here.`,
        `Is it true that no ${c} card is ${withA(s)}? No, one is. So that sentence is not the NOT.`,
        `“${t.R}” is true here. That is the NOT.`,
      ],
    };
  },
  moreColor(rng: Rng): NotCase {
    const [c1, c2] = rng.shuffle(COLORS);
    return {
      tag: 'not-more', conflict: false, shapes: false,
      s: { t: 'more', a: { color: c1 }, b: { color: c2 } },
      right: { t: 'asMany', a: { color: c2 }, b: { color: c1 } },
      wrongs: [
        {
          s: { t: 'more', a: { color: c2 }, b: { color: c1 } }, agree: false,
          head: () => 'Your answer leaves out one possibility: a tie.',
          why: (t) => `That works when there are 2 ${c1} ${t.n.many} and 3 ${c2} ${t.n.many}. But in a tie, ${c2} does not have more either.`,
          simpler: (t) => [
            `Imagine 1 ${c1} ${t.n.one} and 1 ${c2} ${t.n.one}.`,
            `Does ${c1} have more? No. Does ${c2} have more? No.`,
            `They are tied. The NOT must be true in a tie.`,
            `“${c2.charAt(0).toUpperCase() + c2.slice(1)} has the same number or more” is true in a tie. That is what “${t.R}” says.`,
          ],
        },
        { s: { t: 'asMany', a: { color: c1 }, b: { color: c2 } }, agree: true, head: () => `Your answer still allows ${c1} to have more.`, why: sameTime },
        { s: { t: 'none', d: { color: c1 } }, agree: false, head: () => 'Your answer goes too far.', why: (t) => `There can be some ${c1} ${t.n.many} and still not more ${c1} ${t.n.many} than ${c2} ${t.n.many}.` },
      ],
      explain: (t) => `“At least as many” means the same number or more. ${cap(c2)} can equal ${c1} or have more than ${c1}. That covers every case where ${c1} does not have more, including a tie. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true only when the number of ${c1} ${t.n.many} is greater than the number of ${c2} ${t.n.many}.`,
      terms: () => [
        { word: '“More”', meaning: 'a larger number.' },
        { word: 'A tie', meaning: 'the two groups have the same number.' },
        { word: '“At least as many”', meaning: 'the same number or more.' },
      ],
      cases: () => [
        { row: [...times({ color: c1 }, 3), ...times({ color: c2 }, 2)], note: `${cap(c1)} has more.` },
        { row: [...times({ color: c1 }, 2), ...times({ color: c2 }, 3)], note: `${cap(c1)} has fewer.` },
        { row: [...times({ color: c1 }, 3), ...times({ color: c2 }, 3)], note: 'The counts are equal. This is a tie.' },
      ],
      remember: () => 'NOT “more than” means the same number or fewer.',
      simpler: (t) => [
        `Imagine 1 ${c1} ${t.n.one} and 1 ${c2} ${t.n.one}.`,
        `Does ${c1} have more? No. Does ${c2} have more? No.`,
        'They are tied. The NOT must be true in a tie.',
        `“${t.R}” is true in a tie. That is the NOT.`,
      ],
    };
  },
  moreCount(rng: Rng): NotCase {
    const [c, c2] = rng.shuffle(COLORS);
    const k = rng.int(2, 3);
    return {
      tag: 'not-more', conflict: false, shapes: false,
      s: { t: 'count', d: { color: c }, op: 'gt', k },
      right: { t: 'count', d: { color: c }, op: 'le', k },
      wrongs: [
        {
          s: { t: 'count', d: { color: c }, op: 'lt', k }, agree: false,
          head: () => `Your answer leaves out one possibility: exactly ${numWord(k)}.`,
          why: (t) => `With exactly ${k} ${c} ${t.n.many}, there are not more than ${k}. So the NOT must include exactly ${k}.`,
          simpler: (t) => [
            `Imagine exactly ${k} ${c} ${t.n.many}.`,
            `Are there more than ${k}? No. So “${t.S}” is false, and the NOT must be true.`,
            `Are there fewer than ${k}? No. So your answer is false here too.`,
            `“${t.R}” is true here. That is the NOT.`,
          ],
        },
        { s: { t: 'count', d: { color: c }, op: 'ge', k }, agree: true, head: overlapHead, why: () => `“At least ${numWord(k)}” includes ${k + 1} and more. More than ${k} is at least ${k} too.` },
        { s: { t: 'count', d: { color: c }, op: 'eq', k }, agree: false, head: () => 'Your answer is only part of it.', why: (t) => `There could also be fewer than ${numWord(k)} ${c} ${t.n.many}.` },
      ],
      explain: (t) => `If there are not more than ${numWord(k)} ${c} ${t.n.many}, there are ${numWord(k)} or fewer. That includes exactly ${numWord(k)}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true only when ${k + 1} or more ${t.n.many} are ${c}.`,
      terms: () => [
        { word: `“More than ${numWord(k)}”`, meaning: `${k + 1} or more.` },
        { word: `“At most ${numWord(k)}”`, meaning: `${k} or fewer.` },
      ],
      cases: () => [
        { row: times({ color: c }, k + 1), note: `More than ${k} ${c}.` },
        { row: [...times({ color: c }, k), kind({ color: c2 })], note: `Exactly ${k} ${c}. That is not more than ${k}.` },
        { row: [...times({ color: c }, k - 1), kind({ color: c2 }), kind({ color: c2 })], note: `Fewer than ${k} ${c}.` },
      ],
      remember: () => `NOT “more than ${numWord(k)}” means ${numWord(k)} or fewer.`,
      simpler: (t) => [
        `Imagine exactly ${k} ${c} ${t.n.many}.`,
        `Are there more than ${k}? No. So “${t.S}” is false, and the NOT must be true.`,
        `“${t.R}” is true here: ${k} is at most ${k}. That is the NOT.`,
      ],
    };
  },
  someExact(rng: Rng): NotCase {
    const k = rng.pick(KINDS);
    const d: Desc = { size: k.size, color: k.color, shape: k.shape };
    const other: Desc = { ...d, size: k.size === 'big' ? 'small' : 'big' };
    const third: Desc = { ...d, color: COLORS.find((c) => c !== k.color)! };
    return {
      tag: 'not-some', conflict: false, shapes: true,
      s: { t: 'some', d },
      right: { t: 'none', d },
      wrongs: [
        { s: { t: 'someNot', d }, agree: true, head: () => 'Your answer puts the “not” in the wrong place.', why: sameTime },
        { s: { t: 'every', d }, agree: true, head: overlapHead, why: () => `If every card is ${withA(np(d, false))}, there is one too.` },
        { s: { t: 'some', d: other }, agree: true, head: () => 'Your answer is about a different card.', why: sameTime },
      ],
      explain: (t) => `“${t.S}” is false only when no card is ${withA(np(d, false))}. So the NOT is “${t.R}.”`,
      meaning: (t) => `“${t.S}” is true when at least one card is ${withA(np(d, false))}. It is false only when there is none.`,
      terms: () => [AT_LEAST_ONE],
      cases: () => [
        { row: [kind(d), kind(other)], note: `One card is ${withA(np(d, false))}.` },
        { row: [kind(other), kind(third)], note: `No card is ${withA(np(d, false))}.` },
      ],
      remember: () => 'NOT “there is one” means there is none.',
      simpler: (t) => [
        `Imagine 2 cards and no ${np(d, false)}.`,
        `Is there ${withA(np(d, false))}? No. So “${t.S}” is false, and the NOT must be true.`,
        `“${t.R}” is true here. That is the NOT.`,
      ],
    };
  },
} as const;

export type NotKey = keyof typeof NOT_BANK;
export const NOT_KEYS = Object.keys(NOT_BANK) as NotKey[];
/** Cases whose classic mistake is every <-> none (conflict items). */
export const NOT_CONFLICT_KEYS: readonly NotKey[] = ['everyColor', 'everyShape', 'noneColor', 'everyBig', 'everyColorShape'];
/** Comparison cases: a count or two counts. Their NOT must get the boundary (a tie, or exactly k) right. */
export const NOT_COMPARE_KEYS: readonly NotKey[] = ['moreColor', 'moreCount', 'atLeastShape', 'exactColor'];
/** The skill tag of each case ('not-every', 'not-some', ...). Cases with the same tag flip the same kind of sentence. */
export const NOT_TAGS = Object.fromEntries(NOT_KEYS.map((k) => [k, NOT_BANK[k](createRng(1)).tag])) as Record<NotKey, string>;

let testRows: Card[][] | null = null;
/** The rows every NOT is checked on: all rows of 1-3 cards, plus 400 random rows of 3-6 cards. */
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
 * proof the pick is not the NOT. Only the features the two sentences use vary.
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

/** Only the features the sentences use, so a row is described the way the sentences see it. */
const onlyFeats = (c: Card, feats: Set<Feature>): Desc => {
  const d: Desc = {};
  if (feats.has('size')) d.size = c.size;
  if (feats.has('color')) d.color = c.color;
  if (feats.has('shape')) d.shape = c.shape;
  return d;
};

/** Cards of one kind together, in first-seen order: [{ d: { color: 'red' }, k: 3 }, …]. */
function groupRow(row: readonly Card[], feats: Set<Feature>, n: Noun): { d: Desc; k: number }[] {
  const groups: { d: Desc; key: string; k: number }[] = [];
  for (const c of row) {
    const d = onlyFeats(c, feats);
    const key = np(d, false, n);
    const g = groups.find((x) => x.key === key);
    if (g) g.k++;
    else groups.push({ d, key, k: 1 });
  }
  return groups;
}

/** A row in words, with numerals: "3 red dragons and 2 yellow dragons", or "A row: a circle, then a square". */
export function rowLabel(row: readonly Card[], feats: Set<Feature>, n: Noun, ordered: boolean): string {
  if (ordered) return `A row: ${row.map((c) => withA(np(onlyFeats(c, feats), false, n))).join(', then ')}`;
  return cap(joinList(groupRow(row, feats, n).map((g) => `${g.k} ${np(g.d, g.k !== 1, n)}`)));
}

/** A row as a picture card: counted groups for things that are not shape cards, else the cards themselves. */
function rowCase(row: readonly Card[], feats: Set<Feature>, n: Noun, ordered: boolean, truths: Truth[], note?: string): TeachCase {
  const c: TeachCase = { label: `${rowLabel(row, feats, n, ordered)}.`, truths };
  if (ordered || feats.has('shape')) c.things = row.map((k, i) => ({ id: `k${i + 1}`, shape: k.shape, color: k.color, size: k.size }));
  else c.groups = groupRow(row, feats, n).map((g) => ({ label: cap(np(g.d, true, n)), n: g.k, ...(g.d.color ? { color: g.d.color } : {}) }));
  if (note) c.note = note;
  return c;
}

/** A fixed, readable id for a sentence, so feedback stays tied to its choice however the choices are shuffled. */
export function stmtId(s: Stmt): string {
  const parts: string[] = [s.t];
  if (s.t === 'count') parts.push(s.op, String(s.k));
  if (s.t === 'pos') parts.push(s.at);
  if ('not' in s && s.not) parts.push('not');
  for (const d of descsOf(s)) parts.push(...(['size', 'color', 'shape'] as const).flatMap((f) => (d[f] ? [d[f] as string] : [])));
  return parts.join('-');
}

const PAIRS: readonly [string, string][] = [
  ['troll', 'elf'], ['wizard', 'knight'], ['dragon', 'fairy'], ['giant', 'wizard'], ['elf', 'dragon'],
];

export interface NotItemOptions {
  frame: Frame;
  key?: NotKey;
  /** Pick a case whose classic mistake is every <-> none. */
  conflict?: boolean;
}

/**
 * "Which sentence is the NOT of this statement?" with 3-4 choices, all checked against the test rows. Every
 * wrong choice gets its own feedback: the gap it leaves, and a labelled case where the statement and the
 * pick are both true or both false, with the NOT's truth beside them.
 */
export function notItem(rng: Rng, opts: NotItemOptions): Made {
  const key = opts.key ?? rng.pick(opts.conflict ? NOT_CONFLICT_KEYS : NOT_KEYS);
  const c = NOT_BANK[key](rng);
  const n = c.shapes || opts.frame === 'abstract' ? CARD : rng.pick(opts.frame === 'everyday' ? EVERYDAY_NOUNS : FANTASY_NOUNS);
  if (!isExactOpposite(c.s, c.right)) throw new Error(`notItem ${key}: the right choice is not the NOT`);
  const said = say(c.s, n);
  let line: string, prompt: string, whose: string;
  if (opts.frame === 'abstract') {
    line = `“${said}”`;
    whose = 'the statement';
    prompt = 'Which sentence is the NOT of this statement? It must be true whenever the statement is false, and false whenever it is true.';
  } else if (opts.frame === 'everyday') {
    const [a, b] = rng.shuffle(NAMES);
    line = `${a} says, “${said}”`;
    whose = `${a}’s statement`;
    prompt = `${b} says NOT to ${a}’s statement. Which sentence is true whenever ${a}’s statement is false, and false whenever it is true?`;
  } else {
    const [a, b] = rng.pick(PAIRS);
    line = `The ${a} says, “${said}”`;
    whose = `the ${a}’s statement`;
    prompt = `The ${b} says NOT to the ${a}’s statement. Which sentence is true whenever the ${a}’s statement is false, and false whenever it is true?`;
  }
  const t: Talk = { S: bare(c.s, n), R: bare(c.right, n), n, whose };
  const Whose = cap(whose);
  const ordered = c.s.t === 'pos';
  const caseRows = c.cases(t);
  const extra = rng.shuffle(c.wrongs.slice(1)).slice(0, rng.int(1, 2));

  const feedback: Record<string, ChoiceFeedback> = {};
  const examples: Card[][] = [];
  const kept: WrongOpposite[] = [];
  for (const w of [c.wrongs[0], ...extra]) {
    // A wrong choice must disagree with the true NOT on at least one test row.
    if (isExactOpposite(c.s, w.s)) continue;
    const feats = featuresOf(c.s, w.s, c.right);
    // The example: one of the item's own cases when one shows the gap, else the smallest row that does.
    const shown = caseRows.find((cr) => holds(c.s, cr.row) === holds(w.s, cr.row) && (w.agree === undefined || holds(c.s, cr.row) === w.agree));
    const row = shown?.row ?? agreeingRow(c.s, w.s, w.agree);
    if (!row) continue;
    const both = holds(c.s, row);
    const where = `Think of ${rowLabel(row, feats, n, ordered).replace(/^A /, 'a ').replace(/^(\d)/, '$1')}.`;
    const gap = both
      ? `${Whose} is true there. Your answer is true there too. But the NOT must be false whenever ${whose} is true.`
      : `${Whose} is false there, so the NOT must be true. But your answer is false there too.`;
    const close = both
      ? 'A statement and its NOT never agree. When one is true, the other is false. So your answer is not the NOT.'
      : 'A statement and its NOT never agree. Your answer misses this case, so it is not the complete NOT.';
    const fb: ChoiceFeedback = {
      headline: w.head(t),
      detail: [w.why(t), `${where} ${gap}`, close],
      example: rowCase(row, feats, n, ordered, [
        { who: Whose, value: both },
        { who: 'Your answer', value: holds(w.s, row) },
        { who: 'The NOT answer', value: holds(c.right, row) },
      ], shown?.note),
    };
    if (w.simpler) fb.simpler = w.simpler(t);
    feedback[stmtId(w.s)] = fb;
    examples.push(row);
    kept.push(w);
  }

  const options = rng.shuffle([c.right, ...kept.map((w) => w.s)]);
  const ids = options.map(stmtId);
  if (new Set(ids).size !== ids.length) throw new Error(`notItem ${key}: two choices share an id`);
  const choices = options.map((s) => ({ id: stmtId(s), label: say(s, n) }));
  const caseFeats = featuresOf(c.s, c.right);
  const cases = caseRows.map((cr) =>
    rowCase(cr.row, caseFeats, n, ordered, [
      { who: Whose, value: holds(c.s, cr.row) },
      { who: 'The NOT answer', value: holds(c.right, cr.row) },
    ], cr.note),
  );
  // The hint draws one row already checked: the row where the classic mistake agrees with the statement.
  const hintAt = caseRows.findIndex((cr) => holds(c.s, cr.row) === holds(c.wrongs[0].s, cr.row));
  const item: ItemCore = {
    kind: 'choose',
    prompt,
    scene: { kind: 'text', lines: [line] },
    choices,
    answer: stmtId(c.right),
    explain: c.explain(t),
    feedback,
    hint: `Here is one row, already checked. The NOT must be true every time “${t.S}” is false, and false every time it is true.`,
    hintCase: cases[hintAt >= 0 ? hintAt : 0],
    teach: {
      rule: NOT_RULE,
      terms: c.terms(t),
      meaning: c.meaning(t),
      casesTitle: `When is ${whose} true, and when is it false?`,
      cases,
      remember: [c.remember(t), NOT_ASK],
      simpler: c.simpler(t),
    },
  };
  syncWhyWrong(item);
  if (c.conflict) item.conflict = true;
  const wrongs = options.filter((s) => stmtId(s) !== item.answer);
  return { tag: c.tag, item, flip: { s: c.s, right: c.right, wrongs, noun: n, examples: wrongs.map((s) => examples[kept.findIndex((w) => w.s === s)]), cases: caseRows.map((cr) => cr.row) } };
}

// ---------- the Do step: marks on a picture ----------
//
// Guided boards for lessons 2 and 3. Every right mark is computed here (judge() for a row with face-down cards,
// holds() for face-up cards, isExactOpposite() for a NOT), and every message for a wrong mark names what the
// sentence says and what the cards show.

const TF: DrillOption[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const tv = (v: boolean) => (v ? 'true' : 'false');
const lc = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);

/**
 * A fact about face-up cards that shows whether the statement is true there, naming a card or a count:
 * "Card 2 is small, not big." / "There are 3 red cards."
 */
export function cardFact(s: Stmt, cards: readonly Card[]): string {
  const v = holds(s, cards);
  const at = (test: (c: Card) => boolean) => cards.findIndex(test);
  const notIt = (d: Desc) => {
    const i = at((c) => !fits(c, d));
    return `Card ${i + 1} is ${adj(restrict(cards[i], d))}, not ${adj(d)}.`;
  };
  const num = (n: number) => (n === 0 ? 'no' : String(n));
  switch (s.t) {
    case 'every': return v ? `Every card is ${adj(s.d)}.` : notIt(s.d);
    case 'someNot': return v ? notIt(s.d) : `Every card is ${adj(s.d)}.`;
    case 'some': case 'none': {
      const i = at((c) => fits(c, s.d));
      return i >= 0 ? `Card ${i + 1} is ${adj(s.d)}.` : `No card is ${adj(s.d)}.`;
    }
    case 'count': {
      const n = countOf(cards, s.d, !!s.not);
      if (s.not) return `There ${n === 1 ? 'is 1 card that is' : `are ${num(n)} cards that are`} not ${adj(s.d, n !== 1)}.`;
      return `There ${n === 1 ? 'is' : 'are'} ${num(n)} ${np(s.d, n !== 1)}.`;
    }
    case 'more': case 'asMany': {
      const na = countOf(cards, s.a), nb = countOf(cards, s.b);
      const t = `There ${na === 1 ? 'is' : 'are'} ${num(na)} ${np(s.a, na !== 1)} and ${num(nb)} ${np(s.b, nb !== 1)}.`;
      return na === nb ? `${t} That is a tie.` : t;
    }
    default: throw new Error(`cardFact: no fact for “${say(s)}”`);
  }
}

/**
 * Lesson 2's Do: one sentence about a row of cards (some face down), marked True, False or Can't tell. The right
 * mark is judge() over every way to fill the face-down cards. A wrong mark is answered with the card that settles
 * it, or with the face-down card that could make it go the other way.
 */
export function verdictDrillRow(s: Stmt, row: readonly Thing[], o: { id: string; given?: boolean }): DrillRow {
  const { hidden, table } = truthTable(s, row);
  const verdict = verdictOf(table);
  const S = `“${bare(s)}”`;
  let why: Record<string, string>;
  let note: string;
  if (verdict === 'cant') {
    const looks = holds(s, row.filter((t) => !t.hidden));
    const cant = cantTellCases(hidden, table, !looks);
    if (!cant) throw new Error(`verdictDrillRow: no reason why “${say(s)}” can’t be told`);
    why = {
      true: `${cant.whenFalse} So ${S} might be false. You can’t tell yet.`,
      false: `${cant.whenTrue} So ${S} might be true. You can’t tell yet.`,
    };
    note = cant.explain;
  } else {
    const v = verdict === 'true';
    const reason = settledReason(s, row, v);
    if (!reason) throw new Error(`verdictDrillRow: no card you can see settles “${say(s)}”`);
    const down = hidden.length === 1 ? 'The face-down card' : 'The face-down cards';
    why = {
      [tv(!v)]: `${reason} So ${S} is ${verdict}.`,
      cant: `${reason} ${down} can’t change that. So ${S} is ${verdict}, not “Can’t tell.”`,
    };
    note = `${reason} So it is ${verdict}, no matter what is face down.`;
  }
  const mark: DrillMark = { id: `${o.id}-v`, label: 'True, false or can’t tell?', options: VERDICT_CHOICES.map((c) => ({ ...c })), answer: verdict, why };
  if (o.given) mark.given = true;
  return { id: o.id, label: `“${say(s)}”`, marks: [mark], note };
}

export interface NotDrillOptions {
  id: string;
  /** The statement. */
  s: Stmt;
  /** Its NOT: checked to be true exactly when the statement is false, on every test row. */
  right: Stmt;
  /** Wrong NOTs. On these cards each one agrees with the statement, so the board itself shows it is wrong. */
  wrongs: Stmt[];
  /** The face-up cards on the board. */
  cards: readonly Card[];
  given?: boolean;
}

/**
 * Lesson 3's Do: a statement on a picture. Pick its NOT, then mark the statement and its NOT true or false on these
 * cards. A statement and its NOT never agree; each wrong NOT agrees with the statement here, and its message shows it.
 */
export function notDrillRow(o: NotDrillOptions): DrillRow {
  if (!isExactOpposite(o.s, o.right)) throw new Error(`notDrillRow: “${say(o.right)}” is not the NOT of “${say(o.s)}”`);
  const v = holds(o.s, o.cards);
  for (const w of o.wrongs) {
    if (isExactOpposite(o.s, w) || holds(w, o.cards) !== v) throw new Error(`notDrillRow: these cards do not show that “${say(w)}” is not the NOT`);
  }
  const S = `“${bare(o.s)}”`;
  const fact = cardFact(o.s, o.cards);
  // In word order, so where the right NOT sits does not give it away.
  const options = [o.right, ...o.wrongs].map((x) => ({ id: stmtId(x), label: say(x) })).sort((a, b) => a.label.localeCompare(b.label));
  const given = o.given ? { given: true } : {};
  const marks: DrillMark[] = [
    {
      id: `${o.id}-not`,
      label: 'Its NOT',
      options,
      answer: stmtId(o.right),
      ...given,
      why: Object.fromEntries(o.wrongs.map((w) => [
        stmtId(w),
        `${S} is ${tv(v)} here: ${lc(fact)} “${bare(w)}” is ${tv(v)} here too: ${lc(cardFact(w, o.cards))} A statement and its NOT never agree.`,
      ])),
    },
    { id: `${o.id}-s`, label: 'This sentence, on these cards', options: TF, answer: tv(v), ...given, why: { [tv(!v)]: `${fact} So ${S} is ${tv(v)} on these cards.` } },
    { id: `${o.id}-n`, label: 'Its NOT, on these cards', options: TF, answer: tv(!v), ...given, why: { [tv(v)]: `${S} is ${tv(v)} here, so its NOT must be ${tv(!v)}. ${cardFact(o.right, o.cards)}` } },
  ];
  const traps = o.wrongs.map((w) => `“${bare(w)}” is ${tv(v)} here too, so it is not the NOT.`);
  return { id: o.id, label: `“${say(o.s)}”`, marks, note: [fact, `So ${S} is ${tv(v)} here, and its NOT is ${tv(!v)}.`, ...traps].join(' ') };
}
