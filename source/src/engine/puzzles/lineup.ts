/**
 * Stop 3 · Line Up. People stand in a line (first -> last) and clues describe their order.
 *
 * Every answer here is found by listing all orders of the people (at most 5! = 120) and keeping
 * the ones where every clue holds (clueHolds from ../grade). Explanations, "not yet" messages and
 * "Can't tell" answers all come from that list; nothing is hand-asserted.
 *
 * Skins give the same structure different words: a race, heights (tallest first), a lunch line,
 * dragons by wing length, a robot parade, a broom race, and letters in a row (left to right).
 */
import { clueHolds } from '../grade';
import type { Choice, ChooseItem, LineClue, OrderItem, Rng } from '../types';

export type ClueType = LineClue['t'];
export type SkinId = 'race' | 'brooms' | 'height' | 'dragons' | 'line' | 'robots' | 'letters';
export type SkinKind = 'everyday' | 'fantasy' | 'abstract';
export type Status = 'must' | 'might' | 'cant';
type Verb = 'finish' | 'be' | 'have';
type Mode = 'is' | 'not' | 'could' | 'must' | 'cant';

const STOP = 3;
export const CANT = 'cant';
const CANT_TELL: Choice = { id: CANT, label: 'Can’t tell' };
export const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'] as const;

// ---------- small text helpers ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** 'Ava, Ben and Cal' */
export const joinNames = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
/** Clause list: 'x, and y' or 'x, y, and z'. */
const joinParts = (xs: readonly string[]) =>
  xs.length <= 2 ? xs.join(', and ') : `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`;
const unstop = (s: string) => s.replace(/[.!?]$/, '');
/** A clue quoted inside a sentence. */
const quote = (s: string) => `“${unstop(s)}”`;
/** A clue quoted at the end of a sentence: the period goes inside the quotes. */
const quoteEnd = (s: string) => `“${unstop(s)}.”`;
/** A clue quoted before a comma: the comma goes inside the quotes. */
const quoteComma = (s: string) => `“${unstop(s)},”`;

const CONJ: Record<Verb, Record<Mode, string>> = {
  finish: { is: 'finished', not: 'did not finish', could: 'could have finished', must: 'must have finished', cant: 'can’t have finished' },
  be: { is: 'is', not: 'is not', could: 'could be', must: 'must be', cant: 'can’t be' },
  have: { is: 'has', not: 'does not have', could: 'could have', must: 'must have', cant: 'can’t have' },
};

// ---------- skins ----------

export interface Skin {
  id: SkinId;
  kind: SkinKind;
  /** Name pool. No two names share a first letter, so any subset is safe. */
  pool: readonly string[];
  /** Question word: 'Who' or 'Which robot'. */
  who: string;
  noun: string;
  verb: Verb;
  /** Clue types this skin can say clearly. */
  types: readonly ClueType[];
  firstLabel: string;
  lastLabel: string;
  /** Added after an order in explanations when the direction is not obvious. */
  orderNote: string;
  /** Opening sentences; '{list}' becomes the names. */
  settings: readonly string[];
  buildAsk: string;
  /** Spot k of n as a phrase. ends: say 'first'/'last' style words for the two ends. */
  spot(k: number, n: number, ends: boolean): string;
  middle: string;
  where(x: string): string;
  before(a: string, b: string): string;
  rightBefore?(a: string, b: string): string;
  nextTo?(a: string, b: string): string;
  notNextTo?(a: string, b: string): string;
  between?(a: string, b: string, c: string): string;
  /** The skin's words for "before" and "right before", and what "before" means (lesson 2). */
  beforeWord?: string;
  rightWord?: string;
  beforeMeans?: string;
  /** Hint: 'Cross out ___.' for the first spot, then for the last spot. */
  crossFirst: string;
  crossLast: string;
}

const ALL_TYPES: readonly ClueType[] = ['before', 'rightBefore', 'nextTo', 'notNextTo', 'between', 'first', 'last', 'notFirst', 'notLast', 'place'];
const RANKED_TYPES: readonly ClueType[] = ['before', 'first', 'last', 'notFirst', 'notLast', 'place'];

const PEOPLE = ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana', 'Jin', 'Kofi', 'Lena', 'Mo', 'Nia', 'Omar', 'Pia', 'Raj', 'Sol', 'Tia', 'Uma', 'Vic', 'Wes', 'Zoe'];

const raceLike = (id: SkinId, kind: SkinKind, pool: readonly string[], who: string, noun: string, setting: string): Skin => ({
  id, kind, pool, who, noun, verb: 'finish', types: ALL_TYPES,
  firstLabel: 'Finished first', lastLabel: 'Finished last', orderNote: '',
  settings: [setting], buildAsk: 'Put them in the order they finished.',
  spot: (k, n, ends) => (ends && k === 1 ? 'first' : ends && k === n ? 'last' : ORDINALS[k - 1]),
  middle: 'in the middle',
  where: (x) => `In what place did ${x} finish?`,
  before: (a, b) => `${a} finished before ${b}`,
  rightBefore: (a, b) => `${a} finished right before ${b}`,
  nextTo: (a, b) => `No one finished between ${a} and ${b}`,
  notNextTo: (a, b) => `At least one ${noun} finished between ${a} and ${b}`,
  between: (a, b, c) => `${a} finished somewhere between ${b} and ${c}`,
  beforeWord: 'before', rightWord: 'right before', beforeMeans: '“Before” means anywhere earlier.',
  crossFirst: 'everyone who finished after someone',
  crossLast: 'everyone who finished before someone',
});

export const SKINS: Record<SkinId, Skin> = {
  race: raceLike('race', 'everyday', PEOPLE, 'Who', 'runner', '{list} ran a race.'),
  brooms: raceLike('brooms', 'fantasy', ['Bram', 'Dara', 'Elm', 'Fenn', 'Ivo', 'Mira', 'Nell', 'Odo', 'Rook', 'Wren'], 'Which wizard', 'wizard', 'The young wizards {list} raced on brooms.'),
  height: {
    id: 'height', kind: 'everyday', pool: PEOPLE, who: 'Who', noun: 'friend', verb: 'be', types: RANKED_TYPES,
    firstLabel: 'Tallest', lastLabel: 'Shortest', orderNote: 'tallest first',
    settings: ['{list} compared their heights.'], buildAsk: 'Line them up from tallest to shortest.',
    spot: (k, n, ends) => (k === 1 ? 'the tallest' : ends && k === n ? 'the shortest' : `the ${ORDINALS[k - 1]} tallest`),
    middle: 'in the middle',
    where: (x) => `Where is ${x} in height order?`,
    before: (a, b) => `${a} is taller than ${b}`,
    crossFirst: 'everyone who is shorter than someone',
    crossLast: 'everyone who is taller than someone',
  },
  dragons: {
    id: 'dragons', kind: 'fantasy', pool: ['Ash', 'Blaze', 'Cinder', 'Dusk', 'Ember', 'Frost', 'Jade', 'Moss', 'Onyx', 'Storm'],
    who: 'Which dragon', noun: 'dragon', verb: 'have', types: RANKED_TYPES,
    firstLabel: 'Longest wings', lastLabel: 'Shortest wings', orderNote: 'longest wings first',
    settings: ['The dragons {list} compared their wings.'], buildAsk: 'Order the dragons from longest wings to shortest.',
    spot: (k, n, ends) => (k === 1 ? 'the longest wings' : ends && k === n ? 'the shortest wings' : `the ${ORDINALS[k - 1]} longest wings`),
    middle: 'the middle wing length',
    where: (x) => `Where is ${x} in wing order?`,
    before: (a, b) => `${a} has longer wings than ${b}`,
    crossFirst: 'every dragon whose wings are shorter than another dragon’s',
    crossLast: 'every dragon whose wings are longer than another dragon’s',
  },
  line: {
    id: 'line', kind: 'everyday', pool: PEOPLE, who: 'Who', noun: 'kid', verb: 'be', types: ALL_TYPES,
    firstLabel: 'Front of the line', lastLabel: 'Back of the line', orderNote: '',
    settings: ['{list} wait in the lunch line.', '{list} wait in line for the bus.', '{list} wait in line at the snack stand.'],
    buildAsk: 'Put them in line from front to back.',
    spot: (k, n, ends) => (ends && k === 1 ? 'first in line' : ends && k === n ? 'last in line' : `${ORDINALS[k - 1]} in line`),
    middle: 'in the middle of the line',
    where: (x) => `Where is ${x} in line?`,
    before: (a, b) => `${a} is somewhere in front of ${b}`,
    rightBefore: (a, b) => `${a} is right in front of ${b}`,
    nextTo: (a, b) => `${a} and ${b} are next to each other`,
    notNextTo: (a, b) => `${a} and ${b} are not next to each other`,
    between: (a, b, c) => `${a} is somewhere between ${b} and ${c}`,
    beforeWord: 'somewhere in front of', rightWord: 'right in front of', beforeMeans: '“Somewhere in front of” means anywhere ahead.',
    crossFirst: 'everyone who stands behind someone',
    crossLast: 'everyone who stands in front of someone',
  },
  robots: {
    id: 'robots', kind: 'fantasy', pool: ['Bolt', 'Chip', 'Dot', 'Gizmo', 'Kit', 'Nano', 'Rivet', 'Tik', 'Volt', 'Zap'],
    who: 'Which robot', noun: 'robot', verb: 'be', types: ALL_TYPES,
    firstLabel: 'Front of the parade', lastLabel: 'Back of the parade', orderNote: '',
    settings: ['The robots {list} march in a parade, one behind the other.'],
    buildAsk: 'Put the robots in parade order, front to back.',
    spot: (k, n, ends) => (ends && k === 1 ? 'at the front of the parade' : ends && k === n ? 'at the back of the parade' : `${ORDINALS[k - 1]} in the parade`),
    middle: 'in the middle of the parade',
    where: (x) => `Where is ${x} in the parade?`,
    before: (a, b) => `${a} is somewhere in front of ${b}`,
    rightBefore: (a, b) => `${a} is right in front of ${b}`,
    nextTo: (a, b) => `${a} and ${b} are next to each other`,
    notNextTo: (a, b) => `${a} and ${b} are not next to each other`,
    between: (a, b, c) => `${a} is somewhere between ${b} and ${c}`,
    beforeWord: 'somewhere in front of', rightWord: 'right in front of', beforeMeans: '“Somewhere in front of” means anywhere ahead.',
    crossFirst: 'every robot that marches behind another robot',
    crossLast: 'every robot that marches in front of another robot',
  },
  letters: {
    id: 'letters', kind: 'abstract', pool: ['A', 'B', 'C', 'D', 'E', 'F'],
    who: 'Which letter', noun: 'letter', verb: 'be', types: ALL_TYPES,
    firstLabel: 'Left end', lastLabel: 'Right end', orderNote: '',
    settings: ['The letters {list} sit in a row.'],
    buildAsk: 'Put the letters in order from left to right.',
    spot: (k, n, ends) => (ends && k === 1 ? 'at the left end' : ends && k === n ? 'at the right end' : `${ORDINALS[k - 1]} from the left`),
    middle: 'in the middle',
    where: (x) => `Counting from the left, where is ${x}?`,
    before: (a, b) => `${a} is somewhere to the left of ${b}`,
    rightBefore: (a, b) => `${a} is directly to the left of ${b}`,
    nextTo: (a, b) => `${a} and ${b} are next to each other`,
    notNextTo: (a, b) => `${a} and ${b} are not next to each other`,
    between: (a, b, c) => `${a} is somewhere between ${b} and ${c}`,
    beforeWord: 'somewhere to the left of', rightWord: 'directly to the left of', beforeMeans: '“Somewhere to the left of” means anywhere to the left.',
    crossFirst: 'every letter that sits to the right of another letter',
    crossLast: 'every letter that sits to the left of another letter',
  },
};

/** Skins that can say every clue type (right before, next to, between). */
export const ORDERLY: readonly SkinId[] = ['race', 'line', 'robots', 'brooms', 'letters'];
export const SKIN_IDS = Object.keys(SKINS) as SkinId[];

/** "{name} finished first" / "{name} is the tallest" / "{name} has the longest wings". */
const say = (skin: Skin, mode: Mode, name: string, spot: string) => `${name} ${CONJ[skin.verb][mode]} ${spot}`;

/** One clue in the skin's words, with a full stop. n is the number of people in the line. */
export function clueText(skin: Skin, clue: LineClue, n: number, nm: (id: string) => string): string {
  const need = <F>(f: F | undefined): F => {
    if (!f) throw new Error(`skin ${skin.id} cannot say a ${clue.t} clue`);
    return f;
  };
  let s: string;
  switch (clue.t) {
    case 'before': s = skin.before(nm(clue.a), nm(clue.b)); break;
    case 'rightBefore': s = need(skin.rightBefore)(nm(clue.a), nm(clue.b)); break;
    case 'nextTo': s = need(skin.nextTo)(nm(clue.a), nm(clue.b)); break;
    case 'notNextTo': s = need(skin.notNextTo)(nm(clue.a), nm(clue.b)); break;
    case 'between': s = need(skin.between)(nm(clue.a), nm(clue.b), nm(clue.c)); break;
    case 'first': s = say(skin, 'is', nm(clue.a), skin.spot(1, n, true)); break;
    case 'last': s = say(skin, 'is', nm(clue.a), skin.spot(n, n, true)); break;
    case 'notFirst': s = say(skin, 'not', nm(clue.a), skin.spot(1, n, true)); break;
    case 'notLast': s = say(skin, 'not', nm(clue.a), skin.spot(n, n, true)); break;
    case 'place': s = say(skin, 'is', nm(clue.a), skin.spot(clue.k, n, false)); break;
  }
  return `${cap(s)}.`;
}

// ---------- orders and clues ----------

export function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

const orderCache = new Map<string, string[][]>();
/** Every order of the people, in a fixed (sorted) sequence. */
export function allOrders(ids: readonly string[]): string[][] {
  const sorted = [...ids].sort();
  const key = sorted.join('|');
  let v = orderCache.get(key);
  if (!v) {
    v = permutations(sorted);
    orderCache.set(key, v);
  }
  return v;
}

/** Every order of the people where all the clues hold. */
export function fits(ids: readonly string[], clues: readonly LineClue[]): string[][] {
  return allOrders(ids).filter((p) => clues.every((c) => clueHolds(c, p)));
}

/** Same meaning -> same key (next to and between do not care about the order of their names). */
export function clueKey(c: LineClue): string {
  switch (c.t) {
    case 'nextTo':
    case 'notNextTo': return `${c.t}:${[c.a, c.b].sort().join(',')}`;
    case 'between': return `between:${c.a}:${[c.b, c.c].sort().join(',')}`;
    case 'place': return `place:${c.a}:${c.k}`;
    case 'before':
    case 'rightBefore': return `${c.t}:${c.a},${c.b}`;
    default: return `${c.t}:${c.a}`;
  }
}

export const mentions = (c: LineClue, id: string) =>
  c.a === id || ('b' in c && c.b === id) || ('c' in c && c.c === id);

/** Every clue of the given types that is true for this order. Place clues skip the two ends (first/last say those). */
export function trueClues(order: readonly string[], types: readonly ClueType[]): LineClue[] {
  const n = order.length;
  const has = (t: ClueType) => types.includes(t);
  const out: LineClue[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = order[i], b = order[j];
      if (has('before')) out.push({ t: 'before', a, b });
      if (j === i + 1) {
        if (has('rightBefore')) out.push({ t: 'rightBefore', a, b });
        if (has('nextTo')) out.push({ t: 'nextTo', a, b });
      } else if (has('notNextTo')) out.push({ t: 'notNextTo', a, b });
    }
  }
  if (has('between')) {
    for (let p = 1; p < n - 1; p++) for (let i = 0; i < p; i++) for (let j = p + 1; j < n; j++) out.push({ t: 'between', a: order[p], b: order[i], c: order[j] });
  }
  if (has('first')) out.push({ t: 'first', a: order[0] });
  if (has('last')) out.push({ t: 'last', a: order[n - 1] });
  if (has('notFirst')) for (let i = 1; i < n; i++) out.push({ t: 'notFirst', a: order[i] });
  if (has('notLast')) for (let i = 0; i < n - 1; i++) out.push({ t: 'notLast', a: order[i] });
  if (has('place')) for (let i = 1; i < n - 1; i++) out.push({ t: 'place', a: order[i], k: i + 1 });
  return out;
}

/** Randomly swap the names in clues where their order does not matter, so the wording never hints at the line. */
function jitter(rng: Rng, c: LineClue): LineClue {
  if ((c.t === 'nextTo' || c.t === 'notNextTo') && rng.chance(0.5)) return { t: c.t, a: c.b, b: c.a };
  if (c.t === 'between' && rng.chance(0.5)) return { t: 'between', a: c.a, b: c.c, c: c.b };
  return c;
}

function weightedShuffle<T>(rng: Rng, xs: readonly T[], w: (x: T) => number): T[] {
  const rest = [...xs];
  const out: T[] = [];
  while (rest.length) {
    const total = rest.reduce((s, x) => s + w(x), 0);
    let r = rng.next() * total;
    let i = 0;
    for (; i < rest.length - 1; i++) {
      r -= w(rest[i]);
      if (r < 0) break;
    }
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

const WEIGHT: Record<ClueType, number> = {
  before: 5, rightBefore: 3, nextTo: 2, notNextTo: 1, between: 2, first: 1.5, last: 1.5, notFirst: 1, notLast: 1, place: 0.5,
};
const RELATIONAL = new Set<ClueType>(['before', 'rightBefore', 'nextTo', 'notNextTo', 'between']);

/** True when every clue matters: dropping any one of them lets more orders fit. */
export function nonRedundant(ids: readonly string[], clues: readonly LineClue[]): boolean {
  const base = fits(ids, clues).length;
  return clues.every((_, i) => fits(ids, clues.filter((_, j) => j !== i)).length > base);
}

/**
 * Draw true clues for a hidden order until exactly one order fits, then drop every clue that is not
 * needed. The result forces the order, and every clue in it is needed.
 */
export function forceClues(rng: Rng, order: readonly string[], types: readonly ClueType[]): LineClue[] {
  const cands = weightedShuffle(rng, trueClues(order, types), (c) => WEIGHT[c.t]);
  let clues: LineClue[] = [];
  let count = fits(order, clues).length;
  for (const c of cands) {
    if (count === 1) break;
    const next = fits(order, [...clues, c]).length;
    if (next < count) {
      clues = [...clues, c];
      count = next;
    }
  }
  if (count !== 1) throw new Error('forceClues: these clue types cannot force one order');
  for (const c of rng.shuffle(clues)) {
    const rest = clues.filter((x) => x !== c);
    if (fits(order, rest).length === 1) clues = rest;
  }
  return rng.shuffle(clues).map((c) => jitter(rng, c));
}

const uniq = (xs: readonly string[]) => [...new Set(xs)].sort();
/** Who can stand in spot k (1-based) across these orders. */
export const whoCanBeAt = (fit: readonly string[][], k: number) => uniq(fit.map((p) => p[k - 1]));
/** Which spots (1-based) x can stand in across these orders. */
export const spotsOf = (fit: readonly string[][], x: string) => [...new Set(fit.map((p) => p.indexOf(x) + 1))].sort((a, b) => a - b);

export function statusOf(fit: readonly string[][], stmt: LineClue): Status {
  const t = fit.filter((p) => clueHolds(stmt, p)).length;
  return t === fit.length ? 'must' : t === 0 ? 'cant' : 'might';
}

// ---------- the cast of one puzzle ----------

export interface Cast {
  ids: string[];
  nm(id: string): string;
  setting: string;
}

function makeCast(rng: Rng, skin: Skin, n: number): Cast {
  const picked = skin.id === 'letters' ? skin.pool.slice(0, n) : rng.shuffle(skin.pool).slice(0, n);
  const labels = [...picked].sort();
  const ids = labels.map((l) => l.toLowerCase());
  const names: Record<string, string> = Object.fromEntries(ids.map((id, i) => [id, labels[i]]));
  const setting = rng.pick(skin.settings).replace('{list}', joinNames(labels));
  return { ids, nm: (id) => names[id], setting };
}

const orderText = (skin: Skin, cast: Cast, order: readonly string[]) =>
  order.map(cast.nm).join(', ') + (skin.orderNote ? ` (${skin.orderNote})` : '');

const nameChoices = (cast: Cast): Choice[] => [...cast.ids.map((id) => ({ id, label: cast.nm(id) })), CANT_TELL];

/**
 * Why no order passing `test` fits: the one clue that rules them all out, or else two clues where
 * every such order breaks at least one. Returns clue indexes (empty if it takes more than two).
 */
function killers(ids: readonly string[], clues: readonly LineClue[], test: (p: string[]) => boolean): number[] {
  const orders = allOrders(ids).filter(test);
  const one = clues.findIndex((c) => orders.every((p) => !clueHolds(c, p)));
  if (one >= 0) return [one];
  for (let i = 0; i < clues.length; i++) {
    for (let j = i + 1; j < clues.length; j++) {
      if (orders.every((p) => !clueHolds(clues[i], p) || !clueHolds(clues[j], p))) return [i, j];
    }
  }
  return [];
}

function breaksText(ks: readonly number[], texts: readonly string[]): string {
  if (ks.length === 1) return `That would break the clue ${quoteEnd(texts[ks[0]])}`;
  if (ks.length === 2) return `Every order like that breaks ${quote(texts[ks[0]])} or ${quoteEnd(texts[ks[1]])}`;
  return 'Every order like that breaks at least one clue.';
}

/** Puzzle data kept next to the item so tests can re-check it by brute force. */
export interface Built<I> {
  item: I;
  ids: string[];
  order: string[];
  clues: LineClue[];
}

// ---------- lesson 1: chains ----------

export interface ChainOpts {
  id: string;
  skin: SkinId;
  /** true: the clues must leave the answer open (a conflict item). */
  cantTell: boolean;
  ask?: 'first' | 'last';
  n?: number;
}

/** "Who is the tallest?" from 2-3 "taller than" clues. The answer is a name only if that person is first in every order that fits. */
export function chainPuzzle(rng: Rng, o: ChainOpts): Built<ChooseItem> & { ask: 'first' | 'last' } {
  const skin = SKINS[o.skin];
  const ask = o.ask ?? (rng.chance(0.65) ? 'first' : 'last');
  for (let tries = 0; tries < 2000; tries++) {
    const n = o.n ?? rng.pick([3, 3, 4]);
    const cast = makeCast(rng, skin, n);
    const order = rng.shuffle(cast.ids);
    const k = n === 3 ? 2 : rng.pick([2, 3, 3]);
    const clues = rng.shuffle(trueClues(order, ['before'])).slice(0, k);
    if (!cast.ids.every((id) => clues.some((c) => mentions(c, id)))) continue;
    if (!nonRedundant(cast.ids, clues)) continue;
    const fit = fits(cast.ids, clues);
    const spotK = ask === 'first' ? 1 : n;
    const ends = whoCanBeAt(fit, spotK);
    if ((ends.length > 1) !== o.cantTell) continue;

    const nm = cast.nm;
    const spotObj = skin.spot(spotK, n, true);
    const texts = clues.map((c) => clueText(skin, c, n, nm));
    // The clues as one chain: grouped by who is ahead, in line order.
    const heads = uniq(clues.map((c) => c.a)).sort((x, y) => order.indexOf(x) - order.indexOf(y));
    const parts = heads.map((a) => {
      const bs = clues.filter((c) => c.a === a).map((c) => (c.t === 'before' ? c.b : '')).sort((x, y) => order.indexOf(x) - order.indexOf(y));
      return skin.before(nm(a), joinNames(bs.map(nm)));
    });
    const chain = `${cap(joinParts(parts))}.`;
    const answer = ends.length === 1 ? ends[0] : CANT;
    const whyWrong: Record<string, string> = {};
    for (const id of cast.ids) {
      if (id === answer) continue;
      if (ends.includes(id)) {
        // Name every other person who could be at that end (there can be two or more).
        const others = ends.filter((e) => e !== id).map(nm);
        whyWrong[id] = `${say(skin, 'could', nm(id), spotObj)}, but so could ${joinNames(others)}. No clue decides between them.`;
      } else {
        const i = clues.findIndex((c) => c.t === 'before' && (ask === 'first' ? c.b === id : c.a === id));
        whyWrong[id] = `${unstop(texts[i])}. So ${say(skin, 'cant', nm(id), spotObj)}.`;
      }
    }
    let explain: string;
    if (answer === CANT) {
      const could = CONJ[skin.verb].could.replace(/^could/, ends.length === 2 ? 'could both' : 'could each');
      explain = `${joinNames(ends.map(nm))} ${could} ${spotObj}. No clue decides between them, even through a chain. So you can’t tell.`;
    } else {
      explain = `${chain} So ${say(skin, 'must', nm(answer), spotObj)}.`;
      whyWrong[CANT] = `You can tell by following the chain. ${chain}`;
    }
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's3.l1',
      skill: answer === CANT ? 's3.chain-cant-tell' : 's3.chain',
      prompt: `${cast.setting} ${skin.who} ${CONJ[skin.verb].is} ${spotObj}?`,
      scene: { kind: 'clues', clues: texts },
      choices: nameChoices(cast),
      answer,
      whyWrong,
      explain,
      hint: `Cross out ${ask === 'first' ? skin.crossFirst : skin.crossLast}. How many are left?`,
      ...(answer === CANT ? { conflict: true } : {}),
    };
    return { item, ids: cast.ids, order, clues, ask };
  }
  throw new Error('chainPuzzle: no puzzle found');
}

// ---------- shared reasoning: chains of "before" through the clues ----------

interface Edge { from: string; to: string; clue: number }

/** Directed "is ahead of" steps each clue gives on its own. */
function edgesOf(ids: readonly string[], clues: readonly LineClue[]): Edge[] {
  const out: Edge[] = [];
  clues.forEach((c, i) => {
    if (c.t === 'before' || c.t === 'rightBefore') out.push({ from: c.a, to: c.b, clue: i });
    if (c.t === 'first') for (const x of ids) if (x !== c.a) out.push({ from: c.a, to: x, clue: i });
    if (c.t === 'last') for (const x of ids) if (x !== c.a) out.push({ from: x, to: c.a, clue: i });
  });
  return out;
}

/** Shortest chain of clue steps from `from` to `to`, using at least minLen steps. Null if none. */
function chainPath(ids: readonly string[], clues: readonly LineClue[], from: string, to: string, minLen = 1): Edge[] | null {
  const edges = edgesOf(ids, clues);
  const bfs = (start: string): Edge[] | null => {
    if (start === to) return [];
    const prev = new Map<string, Edge>();
    const queue = [start];
    const seen = new Set([start]);
    while (queue.length) {
      const x = queue.shift()!;
      for (const e of edges.filter((e) => e.from === x)) {
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        prev.set(e.to, e);
        if (e.to === to) {
          const path: Edge[] = [];
          for (let cur = to; cur !== start; cur = prev.get(cur)!.from) path.unshift(prev.get(cur)!);
          return path;
        }
        queue.push(e.to);
      }
    }
    return null;
  };
  if (minLen <= 1) return bfs(from);
  let best: Edge[] | null = null;
  for (const e of edges.filter((e) => e.from === from && e.to !== to)) {
    const rest = bfs(e.to);
    if (rest && (!best || rest.length + 1 < best.length)) best = [e, ...rest];
  }
  return best;
}

const pathText = (path: readonly Edge[], texts: readonly string[]) =>
  cap(joinParts([...new Set(path.map((e) => e.clue))].map((i) => unstop(texts[i]))));

// ---------- lesson 2: before vs right before ----------

export interface StatusOpts {
  id: string;
  skin: SkinId;
  /** The status the sentence should have. Ignored when conflict is set (then it is 'might'). */
  target?: Status;
  /** "Before" in a clue, "right before" in the sentence: only might be true. */
  conflict?: boolean;
  n?: number;
}

/** The sentence judged in lesson 2. */
export type Stmt = Extract<LineClue, { t: 'before' | 'rightBefore' }>;

export const STATUS_CHOICES: Choice[] = [
  { id: 'must', label: 'Must be true' },
  { id: 'might', label: 'Might be true' },
  { id: 'cant', label: 'Can’t be true' },
];

/** Given the clues, must / might / can't a sentence about "before" or "right before" be true? */
export function statusPuzzle(rng: Rng, o: StatusOpts): Built<ChooseItem> & { stmt: Stmt; status: Status } {
  const skin = SKINS[o.skin];
  const target: Status = o.conflict ? 'might' : (o.target ?? rng.pick(['must', 'might', 'cant'] as const));
  for (let tries = 0; tries < 3000; tries++) {
    const n = o.n ?? rng.pick([3, 4]);
    const cast = makeCast(rng, skin, n);
    const order = rng.shuffle(cast.ids);
    let clues: LineClue[];
    let stmt: Stmt;
    if (o.conflict) {
      const i = rng.int(0, n - 2);
      const j = rng.int(i + 1, n - 1);
      const [a, b] = [order[i], order[j]];
      clues = [{ t: 'before', a, b }];
      if (n === 4 || rng.chance(0.4)) {
        const extra = rng.pick(trueClues(order, ['before', 'first', 'last']).filter((c) => clueKey(c) !== `before:${a},${b}`));
        clues = rng.shuffle([...clues, extra]);
      }
      stmt = { t: 'rightBefore', a, b };
    } else {
      const k = n === 3 ? rng.int(1, 2) : rng.int(2, 3);
      clues = weightedShuffle(rng, trueClues(order, ['before', 'rightBefore', 'first', 'last']), (c) => (c.t === 'first' || c.t === 'last' ? 1 : 3)).slice(0, k);
      const keys = new Set(clues.map(clueKey));
      const stmts: Stmt[] = [];
      for (const a of cast.ids) for (const b of cast.ids) if (a !== b) stmts.push({ t: 'before', a, b }, { t: 'rightBefore', a, b });
      stmt = rng.pick(stmts.filter((s) => !keys.has(clueKey(s))));
    }
    if (!nonRedundant(cast.ids, clues)) continue;
    const fit = fits(cast.ids, clues);
    const status = statusOf(fit, stmt);
    if (status !== target) continue;

    const nm = cast.nm;
    const texts = clues.map((c) => clueText(skin, c, n, nm));
    const stmtText = clueText(skin, stmt, n, nm);
    const misread = stmt.t === 'rightBefore' && clues.some((c) => c.t === 'before' && c.a === stmt.a && c.b === stmt.b);
    const yes = fit.filter((p) => clueHolds(stmt, p));
    const no = fit.filter((p) => !clueHolds(stmt, p));
    const ot = (p: readonly string[]) => `the order ${orderText(skin, cast, p)}`;
    const stmtA = stmt.a;
    const stmtB = stmt.b;

    // A reason the clues give, as a chain of clue steps (when there is one).
    let reason: string | null = null;
    if (status === 'must') {
      const p = stmt.t === 'before' ? chainPath(cast.ids, clues, stmtA, stmtB) : null;
      if (p) reason = `${pathText(p, texts)}. So the sentence must be true.`;
    } else if (status === 'cant') {
      const back = chainPath(cast.ids, clues, stmtB, stmtA);
      const gap = stmt.t === 'rightBefore' ? chainPath(cast.ids, clues, stmtA, stmtB, 2) : null;
      const other = stmt.t === 'rightBefore'
        ? clues.findIndex((c) => c.t === 'rightBefore' && ((c.a === stmtA && c.b !== stmtB) || (c.b === stmtB && c.a !== stmtA)))
        : -1;
      if (back) reason = `${pathText(back, texts)}. So the sentence can’t be true.`;
      else if (gap && skin.between) reason = `${pathText(gap, texts)}. So ${skin.between(nm(gap[0].to), nm(stmtA), nm(stmtB))}. The sentence can’t be true.`;
      else if (other >= 0) reason = `${unstop(texts[other])}. So the sentence can’t be true.`;
    }
    const counted = (word: 'true' | 'false') =>
      fit.length === 1
        ? `Only one order fits the clues: ${orderText(skin, cast, fit[0])}. The sentence is ${word} there.`
        : fit.length === 2
          ? `Two orders fit the clues: ${orderText(skin, cast, fit[0])}. Or ${orderText(skin, cast, fit[1])}. The sentence is ${word} in both.`
          : `Try each order that fits the clues. The sentence is ${word} in every one.`;
    const beforeMeans = skin.beforeMeans ?? '“Before” means anywhere earlier.';
    const misreadMsg = `You read “${skin.beforeWord ?? 'before'}” as “${skin.rightWord ?? 'right before'}.” `;

    let explain: string;
    const whyWrong: Record<string, string> = {};
    if (status === 'must') {
      explain = reason ?? `${counted('true')} So it must be true.`;
      whyWrong.might = `No order that fits the clues makes it false. So it is more than “might.”`;
      whyWrong.cant = `${cap(ot(rng.pick(yes)))} fits the clues, and the sentence is true there.`;
    } else if (status === 'cant') {
      explain = reason ?? `${counted('false')} So it can’t be true.`;
      whyWrong.must = `No order that fits the clues makes it true.${reason ? ` ${reason}` : ''}`;
      whyWrong.might = `“Might” needs at least one order that fits and makes it true. There is none here.`;
    } else {
      const t = rng.pick(yes), f = rng.pick(no);
      explain = `${misread ? `${beforeMeans} ` : ''}The sentence is true for ${ot(t)}. It is false for ${ot(f)}. Both fit the clues, so it might be true.`;
      whyWrong.must = `${misread ? misreadMsg : ''}${cap(ot(f))} fits the clues, but the sentence is false there.`;
      whyWrong.cant = `${cap(ot(t))} fits the clues, and the sentence is true there.`;
    }
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's3.l2',
      skill: stmt.t === 'rightBefore' ? 's3.right-before' : 's3.before',
      prompt: `${cast.setting} Look at this sentence: “${stmtText}” Must it be true, might it be true, or can’t it be true?`,
      scene: { kind: 'clues', clues: texts },
      choices: STATUS_CHOICES,
      answer: status,
      whyWrong,
      explain,
      hint: 'Try to build one order that fits the clues and makes the sentence false. Then try one that makes it true.',
      ...(misread && status === 'might' ? { conflict: true } : {}),
    };
    return { item, ids: cast.ids, order, clues, stmt, status };
  }
  throw new Error('statusPuzzle: no puzzle found');
}

// ---------- lesson 3: not first, not last, next to, between ----------

export interface SpotOpts {
  id: string;
  skin: SkinId;
  /** true: the clues must not decide the answer. Ignored for conflict items (always Can't tell). */
  cantTell?: boolean;
  /** 'ends': not first + not last with four people. 'between': "between" looks like it names the ends. */
  conflict?: 'ends' | 'between';
  q?: 'where' | 'who';
  n?: number;
}

const FOCUS = new Set<ClueType>(['notFirst', 'notLast', 'nextTo', 'notNextTo', 'between']);
const SPOT_TYPES: readonly ClueType[] = ['notFirst', 'notLast', 'nextTo', 'notNextTo', 'between', 'before', 'rightBefore', 'first', 'last'];

/** "Where is Eli in line?" or "Who finished second?", with Can't tell when the clues do not decide it. */
export function spotPuzzle(rng: Rng, o: SpotOpts): Built<ChooseItem> & { q: 'where' | 'who'; target: string; k: number } {
  const skin = SKINS[o.skin];
  const wantCant = o.conflict ? true : (o.cantTell ?? rng.chance(0.4));
  for (let tries = 0; tries < 3000; tries++) {
    const n = o.conflict === 'ends' ? 4 : (o.n ?? rng.pick([3, 4, 4]));
    const cast = makeCast(rng, skin, n);
    const order = rng.shuffle(cast.ids);
    let clues: LineClue[];
    let q: 'where' | 'who';
    let x = '';
    let k = 0;
    const types = SPOT_TYPES.filter((t) => skin.types.includes(t));
    if (o.conflict === 'ends') {
      x = order[rng.int(1, 2)];
      clues = [{ t: 'notFirst', a: x }, { t: 'notLast', a: x }];
      if (rng.chance(0.5)) clues.push(rng.pick(trueClues(order, types).filter((c) => !mentions(c, x) && c.t !== 'notFirst' && c.t !== 'notLast')));
      clues = rng.shuffle(clues);
      q = 'where';
    } else if (o.conflict === 'between') {
      const p = rng.int(1, n - 2);
      clues = [jitter(rng, { t: 'between', a: order[p], b: order[rng.int(0, p - 1)], c: order[rng.int(p + 1, n - 1)] })];
      if (n === 4) clues = rng.shuffle([...clues, rng.pick(trueClues(order, types).filter((c) => c.t !== 'between'))].map((c) => jitter(rng, c)));
      q = 'who';
      k = rng.chance(0.6) ? 1 : n;
    } else {
      const count = n === 3 ? 2 : rng.int(2, 3);
      clues = weightedShuffle(rng, trueClues(order, types), (c) => (FOCUS.has(c.t) ? 3 : 1)).slice(0, count).map((c) => jitter(rng, c));
      if (!clues.some((c) => FOCUS.has(c.t))) continue;
      q = o.q ?? (rng.chance(0.5) ? 'where' : 'who');
      if (q === 'where') x = rng.pick(cast.ids.filter((id) => clues.some((c) => mentions(c, id))));
      else k = rng.int(1, n);
    }
    if (!nonRedundant(cast.ids, clues)) continue;
    const fit = fits(cast.ids, clues);
    const options = q === 'where' ? spotsOf(fit, x).map(String) : whoCanBeAt(fit, k);
    const forced = options.length === 1;
    if (forced === wantCant) continue;
    // A forced answer should take more than one clue to see.
    if (forced && clues.some((c) => {
      const alone = fits(cast.ids, [c]);
      return q === 'where' ? spotsOf(alone, x).length === 1 : whoCanBeAt(alone, k).length === 1;
    })) continue;

    const nm = cast.nm;
    const texts = clues.map((c) => clueText(skin, c, n, nm));
    const ot = (p: readonly string[]) => orderText(skin, cast, p);
    // Often more than two orders fit, so only say "two" when that is the true count.
    const twoFits = fit.length === 2 ? 'Two orders fit the clues:' : 'More than two orders fit the clues. Here are two of them:';
    const whyWrong: Record<string, string> = {};
    let choices: Choice[];
    let answer: string;
    let prompt: string;
    let explain: string;
    let hint: string;
    if (q === 'where') {
      const place = (j: number) => skin.spot(j, n, false);
      choices = [...Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, label: cap(ORDINALS[i]) })), CANT_TELL];
      answer = forced ? `p${options[0]}` : CANT;
      prompt = `${cast.setting} ${skin.where(nm(x))}`;
      hint = `Try ${nm(x)} in each spot. Cross out any spot that breaks a clue.`;
      if (forced) {
        const j = Number(options[0]);
        explain = `Try ${nm(x)} in each spot. Only the ${ORDINALS[j - 1]} spot keeps every clue true. So ${say(skin, 'must', nm(x), place(j))}.`;
        whyWrong[CANT] = `You can tell. Only the ${ORDINALS[j - 1]} spot keeps every clue true for ${nm(x)}.`;
      } else {
        const o1 = fit.find((p) => p.indexOf(x) + 1 === Number(options[0]))!;
        const o2 = fit.find((p) => p.indexOf(x) + 1 === Number(options[1]))!;
        explain = `${twoFits} ${ot(o1)}. Or ${ot(o2)}. ${nm(x)} is in a different spot in each, so you can’t tell.`;
      }
      for (let j = 1; j <= n; j++) {
        const id = `p${j}`;
        if (id === answer) continue;
        if (options.includes(String(j))) {
          const alt = fit.find((p) => p.indexOf(x) + 1 !== j)!;
          whyWrong[id] = `${say(skin, 'could', nm(x), place(j))}, but not for sure. The order ${ot(alt)} also fits the clues.`;
        } else {
          const ks = killers(cast.ids, clues, (p) => p.indexOf(x) + 1 === j);
          whyWrong[id] = `${say(skin, 'cant', nm(x), place(j))}. ${breaksText(ks, texts)}`;
        }
      }
    } else {
      const spotObj = n === 3 && k === 2 ? skin.middle : skin.spot(k, n, true);
      choices = nameChoices(cast);
      answer = forced ? options[0] : CANT;
      prompt = `${cast.setting} ${skin.who} ${CONJ[skin.verb].is} ${spotObj}?`;
      hint = `Try each ${skin.noun} in that spot. Cross out anyone who breaks a clue.`;
      if (forced) {
        explain = `Try each ${skin.noun} in that spot. Only ${nm(answer)} keeps every clue true. So ${say(skin, 'must', nm(answer), spotObj)}.`;
        whyWrong[CANT] = `You can tell. Only ${nm(answer)} can be in that spot without breaking a clue.`;
      } else {
        const o1 = fit.find((p) => p[k - 1] === options[0])!;
        const o2 = fit.find((p) => p[k - 1] === options[1])!;
        explain = `${twoFits} ${ot(o1)}. Or ${ot(o2)}. They put a different ${skin.noun} in that spot, so you can’t tell.`;
      }
      for (const id of cast.ids) {
        if (id === answer) continue;
        if (options.includes(id)) {
          const alt = fit.find((p) => p[k - 1] !== id)!;
          whyWrong[id] = `${say(skin, 'could', nm(id), spotObj)}, but not for sure. The order ${ot(alt)} also fits the clues.`;
        } else {
          const ks = killers(cast.ids, clues, (p) => p[k - 1] === id);
          whyWrong[id] = `${say(skin, 'cant', nm(id), spotObj)}. ${breaksText(ks, texts)}`;
        }
      }
    }
    const main = clues.find((c) => FOCUS.has(c.t))?.t;
    const skill = main === 'between' ? 's3.between' : main === 'nextTo' || main === 'notNextTo' ? 's3.next-to' : 's3.not-first-last';
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's3.l3',
      skill,
      prompt,
      scene: { kind: 'clues', clues: texts },
      choices,
      answer,
      whyWrong,
      explain,
      hint,
      ...(o.conflict ? { conflict: true } : {}),
    };
    return { item, ids: cast.ids, order, clues, q, target: x, k };
  }
  throw new Error('spotPuzzle: no puzzle found');
}

// ---------- lesson 4: build the whole line ----------

export interface BuildOpts {
  id: string;
  skin: SkinId;
  n: number;
}

/** Place everyone. The clues force exactly one order, and every clue is needed. */
export function buildPuzzle(rng: Rng, o: BuildOpts): Built<OrderItem> {
  const skin = SKINS[o.skin];
  const n = o.n;
  for (let tries = 0; tries < 2000; tries++) {
    const cast = makeCast(rng, skin, n);
    const order = rng.shuffle(cast.ids);
    const clues = forceClues(rng, order, skin.types);
    if (clues.length < 2 || clues.length > n + 1) continue;
    if (!clues.some((c) => RELATIONAL.has(c.t))) continue;
    if (clues.filter((c) => c.t === 'place' || c.t === 'first' || c.t === 'last').length > 2) continue;

    const nm = cast.nm;
    const texts = clues.map((c) => clueText(skin, c, n, nm));
    let names = rng.shuffle(cast.ids);
    if (names.join() === order.join()) names = [...names.slice(1), names[0]];
    const anchor = clues.findIndex((c) => c.t === 'first' || c.t === 'last' || c.t === 'place');
    const item: OrderItem = {
      kind: 'order',
      id: o.id,
      stop: STOP,
      lesson: 's3.l4',
      skill: 's3.build',
      prompt: `${cast.setting} ${skin.buildAsk}`,
      scene: { kind: 'clues', clues: texts },
      names: names.map((id) => ({ id, label: nm(id) })),
      clues,
      answer: order,
      firstLabel: skin.firstLabel,
      lastLabel: skin.lastLabel,
      explain: `${anchor >= 0 ? `Start with ${quoteEnd(texts[anchor])} ` : ''}Only one order keeps every clue true: ${orderText(skin, cast, order)}.`,
      hint: anchor >= 0
        ? 'Start with the clue that names an exact spot. Then place the rest one by one.'
        : `Find who ${CONJ[skin.verb].must} ${skin.spot(1, n, true)}. Then place the rest one by one.`,
    };
    return { item, ids: cast.ids, order, clues };
  }
  throw new Error('buildPuzzle: no puzzle found');
}

// ---------- lesson 5: which clue wasn't needed? ----------

export interface ExtraOpts {
  id: string;
  skin: SkinId;
  n?: number;
}

/**
 * 3-5 clues that force one order, where exactly one clue can be dropped and the order is still
 * forced. The choices are the clue texts.
 */
export function extraCluePuzzle(rng: Rng, o: ExtraOpts): Built<ChooseItem> & { extra: number } {
  const skin = SKINS[o.skin];
  for (let tries = 0; tries < 2000; tries++) {
    const n = o.n ?? rng.pick([3, 4, 4]);
    const cast = makeCast(rng, skin, n);
    const order = rng.shuffle(cast.ids);
    const core = forceClues(rng, order, skin.types);
    if (core.length < 2 || core.length > 4) continue;
    const keys = new Set(core.map(clueKey));
    const extras = weightedShuffle(rng, trueClues(order, skin.types).filter((c) => !keys.has(clueKey(c))), (c) => (c.t === 'before' ? 4 : 1));
    const extra = extras.find((r) => {
      const all = [...core, r];
      return core.every((m) => fits(cast.ids, all.filter((x) => x !== m)).length > 1);
    });
    if (!extra) continue;
    const spare = jitter(rng, extra);
    const clues = rng.shuffle([...core, spare]);
    const idx = clues.indexOf(spare);

    const nm = cast.nm;
    const texts = clues.map((c) => clueText(skin, c, n, nm));
    const whyWrong: Record<string, string> = {};
    clues.forEach((_, i) => {
      if (i === idx) return;
      const alt = fits(cast.ids, clues.filter((_, j) => j !== i)).find((p) => p.join() !== order.join())!;
      whyWrong[`k${i + 1}`] = `Without ${quoteComma(texts[i])} the order ${orderText(skin, cast, alt)} also fits. So that clue is needed.`;
    });
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's3.l5',
      skill: 's3.not-needed',
      prompt: `${cast.setting} These clues give just one order. But one clue is not needed. Which one?`,
      scene: { kind: 'clues', clues: texts },
      choices: texts.map((t, i) => ({ id: `k${i + 1}`, label: t })),
      answer: `k${idx + 1}`,
      whyWrong,
      explain: `The other clues already give one order: ${orderText(skin, cast, order)}. So ${quote(texts[idx])} tells you nothing new.`,
      hint: 'Cover up one clue at a time. Do the rest still give just one order?',
    };
    return { item, ids: cast.ids, order, clues, extra: idx };
  }
  throw new Error('extraCluePuzzle: no puzzle found');
}

