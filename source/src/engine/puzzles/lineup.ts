/**
 * Stop 3 · Line Up. People stand in a line (first -> last) and clues describe their order.
 *
 * Every answer here is found by listing all orders of the people (at most 5! = 120) and keeping
 * the ones where every clue holds (clueHolds from ../grade). Explanations, "not yet" messages and
 * "Can't tell" answers all come from that list; nothing is hand-asserted.
 *
 * Skins give the same structure different words: a race, heights (tallest first), a lunch line,
 * dragons by wing length, a robot parade, a broom race, and letters in a row (left to right).
 *
 * Teaching after a wrong answer (Item.teach, ChooseItem.feedback) follows the NOT-flip reference in
 * statements.ts: the rule, the words it needs, what the clues say, worked lines that cover every way the
 * question can go, a short "remember" and a smallest example. A worked line is a case card: the line in
 * words ("Finish order: Ava, Ben, Cal.") and each clue's truth there, computed with clueHolds. Notes are
 * chosen from those computed truths, and the smallest examples are small puzzles solved the same way.
 */
import { clueHolds } from '../grade';
import { syncWhyWrong } from '../teach';
import type { BoardWords, Choice, ChoiceFeedback, ChooseItem, ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillOption, DrillRow, DrillStep, LineClue, OrderItem, Rng, Scene, Teach, TeachCase, Truth } from '../types';

export type ClueType = LineClue['t'];
export type SkinId = 'race' | 'brooms' | 'height' | 'dragons' | 'line' | 'robots' | 'letters';
export type SkinKind = 'everyday' | 'fantasy' | 'abstract';
export type Status = 'must' | 'might' | 'cant';
type Verb = 'finish' | 'be' | 'have';
type Mode = 'is' | 'not' | 'could' | 'must' | 'cant';
type Term = { word: string; meaning: string };
type TermPair = readonly [string, string];

const STOP = 3;
export const CANT = 'cant';
const CANT_TELL: Choice = { id: CANT, label: 'Can’t tell' };
export const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'] as const;

// ---------- small text helpers ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** 'Ava, Ben and Cal' */
export const joinNames = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
/** 'Ava, Ben or Cal' */
const joinOr = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
const unstop = (s: string) => s.replace(/[.!?]$/, '');
/** A clue quoted inside a sentence. */
const quote = (s: string) => `“${unstop(s)}”`;
/** A clue quoted at the end of a sentence: the period goes inside the quotes. */
const quoteEnd = (s: string) => `“${unstop(s)}.”`;
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
const numWord = (k: number) => NUM[k] ?? String(k);
const isAre = (k: number) => (k === 1 ? 'is' : 'are');

/** "clue 2", "clues 1 and 3", "clues 1, 3 and 4" (indexes are 0-based). */
function clueNums(ks: readonly number[]): string {
  const ns = ks.map((i) => String(i + 1));
  return ns.length === 1 ? `clue ${ns[0]}` : `clues ${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
}

/** "clue 2", "clue 1 or clue 3", or "a clue" when it takes more than two. */
function clueOr(ks: readonly number[]): string {
  if (ks.length === 1) return `clue ${ks[0] + 1}`;
  if (ks.length === 2) return `clue ${ks[0] + 1} or clue ${ks[1] + 1}`;
  return 'a clue';
}

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
  /** Heading of a line in a worked case: 'Finish order', 'Tallest to shortest', 'Front to back'. */
  lineLabel: string;
  /** 'ahead of', 'in front of', 'to the left of'. Skins that can say "right before" have it. */
  aheadOf?: string;
  /** The two end spots in words, for "not first" and "not last". */
  ends: readonly [string, string];
  /** The clue words this skin uses, defined in place for the explanation: clue type -> [word, meaning]. */
  terms: Partial<Record<ClueType, TermPair>>;
}

const ALL_TYPES: readonly ClueType[] = ['before', 'rightBefore', 'nextTo', 'notNextTo', 'between', 'first', 'last', 'notFirst', 'notLast', 'place'];
const RANKED_TYPES: readonly ClueType[] = ['before', 'first', 'last', 'notFirst', 'notLast', 'place'];

/**
 * The clue types the Stop 3 lessons teach, each on a key-idea card and a guided board: chains of "before" (lesson
 * 1), "right before" (lesson 2), not first / not last, next to and between (lesson 3), and the clues that name a
 * spot (first, last, a place: lesson 4). "Not next to" is taught nowhere, so no lesson, check or Arcade item uses it.
 */
export const TAUGHT_TYPES: readonly ClueType[] = ALL_TYPES.filter((t) => t !== 'notNextTo');

/** Keep only the clue types allowed (all of them when `only` is not given). */
const allowed = (types: readonly ClueType[], only?: readonly ClueType[]): readonly ClueType[] => (only ? types.filter((t) => only.includes(t)) : types);

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
  lineLabel: 'Finish order', aheadOf: 'ahead of', ends: ['first place', 'last place'],
  terms: {
    before: ['“Before”', `anywhere earlier. Other ${noun}s may finish in between.`],
    rightBefore: ['“Right before”', 'just one place earlier, with no one in between.'],
    nextTo: ['“No one finished between”', `two ${noun}s finished one right after the other. Either one may be ahead.`],
    notNextTo: [`“At least one ${noun} finished between”`, `two ${noun}s did not finish one right after the other.`],
    between: ['“Somewhere between”', 'one of the other two finished earlier, and one finished later. It does not say which one was earlier.'],
    notFirst: ['“Did not finish first”', 'any place but first. It rules out just one place.'],
    notLast: ['“Did not finish last”', 'any place but last. It rules out just one place.'],
  },
});

/** Lines and parades: front to back. */
const frontBack = (noun: string, verb: string, verbs: string): Partial<Record<ClueType, TermPair>> => ({
  before: ['“Somewhere in front of”', `anywhere ahead. Other ${noun}s may ${verb} in between.`],
  rightBefore: ['“Right in front of”', 'just one spot ahead, with no one in between.'],
  nextTo: ['“Next to each other”', 'side by side, with no one in between. Either one may be in front.'],
  notNextTo: ['“Not next to each other”', `at least one ${noun} ${verbs} between them.`],
  between: ['“Somewhere between”', 'one of the other two is in front, and one is behind. It does not say which one is in front.'],
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
    lineLabel: 'Tallest to shortest', ends: ['the tallest spot', 'the shortest spot'],
    terms: {
      before: ['“Taller than”', 'taller by any amount. Someone else may be in between.'],
      notFirst: ['“Not the tallest”', 'someone else is taller. It rules out just one spot.'],
      notLast: ['“Not the shortest”', 'someone else is shorter. It rules out just one spot.'],
    },
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
    lineLabel: 'Longest wings to shortest', ends: ['the longest wings', 'the shortest wings'],
    terms: {
      before: ['“Longer wings than”', 'longer by any amount. Another dragon may be in between.'],
      notFirst: ['“Does not have the longest wings”', 'another dragon has longer wings. It rules out just one spot.'],
      notLast: ['“Does not have the shortest wings”', 'another dragon has shorter wings. It rules out just one spot.'],
    },
  },
  line: {
    id: 'line', kind: 'everyday', pool: PEOPLE, who: 'Who', noun: 'kid', verb: 'be', types: ALL_TYPES,
    firstLabel: 'Front of the line', lastLabel: 'Back of the line', orderNote: '',
    settings: ['{list} wait in the lunch line.', '{list} wait in line for the bus.', '{list} wait in line at the snack stand.'],
    buildAsk: 'Put them in line from front to back.',
    spot: (k, n, ends) => (ends && k === 1 ? 'first in line' : ends && k === n ? 'last in line' : `${ORDINALS[k - 1]} in line`),
    middle: 'in the middle of the line',
    // "First" could be read from either end, so the question says where counting starts.
    where: (x) => `Counting from the front, where is ${x} in line?`,
    before: (a, b) => `${a} is somewhere in front of ${b}`,
    rightBefore: (a, b) => `${a} is right in front of ${b}`,
    nextTo: (a, b) => `${a} and ${b} are next to each other`,
    notNextTo: (a, b) => `${a} and ${b} are not next to each other`,
    between: (a, b, c) => `${a} is somewhere between ${b} and ${c}`,
    beforeWord: 'somewhere in front of', rightWord: 'right in front of', beforeMeans: '“Somewhere in front of” means anywhere ahead.',
    crossFirst: 'everyone who stands behind someone',
    crossLast: 'everyone who stands in front of someone',
    lineLabel: 'Front to back', aheadOf: 'in front of', ends: ['the front', 'the back'],
    terms: {
      ...frontBack('kid', 'stand', 'stands'),
      notFirst: ['“Not first in line”', 'any spot but the front. It rules out just one spot.'],
      notLast: ['“Not last in line”', 'any spot but the back. It rules out just one spot.'],
    },
  },
  robots: {
    id: 'robots', kind: 'fantasy', pool: ['Bolt', 'Chip', 'Dot', 'Gizmo', 'Kit', 'Nano', 'Rivet', 'Tik', 'Volt', 'Zap'],
    who: 'Which robot', noun: 'robot', verb: 'be', types: ALL_TYPES,
    firstLabel: 'Front of the parade', lastLabel: 'Back of the parade', orderNote: '',
    settings: ['The robots {list} march in a parade, one behind the other.'],
    buildAsk: 'Put the robots in parade order, front to back.',
    spot: (k, n, ends) => (ends && k === 1 ? 'at the front of the parade' : ends && k === n ? 'at the back of the parade' : `${ORDINALS[k - 1]} in the parade`),
    middle: 'in the middle of the parade',
    where: (x) => `Counting from the front, where is ${x} in the parade?`,
    before: (a, b) => `${a} is somewhere in front of ${b}`,
    rightBefore: (a, b) => `${a} is right in front of ${b}`,
    nextTo: (a, b) => `${a} and ${b} are next to each other`,
    notNextTo: (a, b) => `${a} and ${b} are not next to each other`,
    between: (a, b, c) => `${a} is somewhere between ${b} and ${c}`,
    beforeWord: 'somewhere in front of', rightWord: 'right in front of', beforeMeans: '“Somewhere in front of” means anywhere ahead.',
    crossFirst: 'every robot that marches behind another robot',
    crossLast: 'every robot that marches in front of another robot',
    lineLabel: 'Front to back', aheadOf: 'in front of', ends: ['the front', 'the back'],
    terms: {
      ...frontBack('robot', 'march', 'marches'),
      notFirst: ['“Not at the front of the parade”', 'any spot but the front. It rules out just one spot.'],
      notLast: ['“Not at the back of the parade”', 'any spot but the back. It rules out just one spot.'],
    },
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
    lineLabel: 'Left to right', aheadOf: 'to the left of', ends: ['the left end', 'the right end'],
    terms: {
      before: ['“Somewhere to the left of”', 'anywhere to the left. Other letters may sit in between.'],
      rightBefore: ['“Directly to the left of”', 'just one spot to the left, with no letter in between.'],
      nextTo: ['“Next to each other”', 'side by side, with no letter in between. Either one may be on the left.'],
      notNextTo: ['“Not next to each other”', 'at least one letter sits between them.'],
      between: ['“Somewhere between”', 'one of the other two is to the left, and one is to the right. It does not say which one is on the left.'],
      notFirst: ['“Not at the left end”', 'any spot but the left end. It rules out just one spot.'],
      notLast: ['“Not at the right end”', 'any spot but the right end. It rules out just one spot.'],
    },
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

/** A short choice id for a clue, fixed by what it says (never by where it is in the list): 'before-ava-ben'. */
export const clueId = (c: LineClue) => clueKey(c).replace(/[:,]/g, '-');

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

/** Indexes (0-based) of the clues this order breaks. */
export const brokenBy = (clues: readonly LineClue[], order: readonly string[]) => clues.flatMap((c, i) => (clueHolds(c, order) ? [] : [i]));

const distance = (a: readonly string[], b: readonly string[]) => a.reduce((n, x, i) => n + (x === b[i] ? 0 : 1), 0);

/**
 * The order passing `test` that breaks the fewest clues, nearest to `near` on a tie: the best try at a
 * placement. If even this order breaks a clue, every order like it breaks one.
 */
export function closest(ids: readonly string[], clues: readonly LineClue[], test: (p: string[]) => boolean, near: readonly string[]): string[] {
  let best: string[] | null = null;
  let score = Infinity;
  for (const p of allOrders(ids)) {
    if (!test(p)) continue;
    const s = brokenBy(clues, p).length * 100 + distance(p, near);
    if (s < score) {
      best = p;
      score = s;
    }
  }
  if (!best) throw new Error('closest: no order passes the test');
  return best;
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

/** "Ava, Ben, Cal" or "Ava, Ben, Cal (tallest first)". */
const orderWords = (skin: Skin, nm: (id: string) => string, order: readonly string[]) =>
  order.map(nm).join(', ') + (skin.orderNote ? ` (${skin.orderNote})` : '');
const orderText = (skin: Skin, cast: Cast, order: readonly string[]) => orderWords(skin, cast.nm, order);

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

/** Puzzle data kept next to the item so tests can re-check it by brute force. */
export interface Built<I> {
  item: I;
  ids: string[];
  order: string[];
  clues: LineClue[];
}

// ---------- teaching after a wrong answer ----------

const CANT_TERM: Term = { word: '“Can’t tell”', meaning: 'more than one answer fits the clues.' };
const BREAK_TERM: Term = { word: 'To break a clue', meaning: 'to make that clue false.' };
const FITS_TERM: Term = { word: 'An order that fits', meaning: 'an order where every clue is true.' };
const NOT_NEEDED_TERM: Term = { word: '“Not needed”', meaning: 'taking the clue away changes nothing. The other clues still give the same one order.' };

/** The clue types that most need defining, hardest first. */
const TERM_ORDER: readonly ClueType[] = ['between', 'nextTo', 'notNextTo', 'rightBefore', 'notFirst', 'notLast', 'before'];

/** The skin's definitions for the clue types present, hardest first. */
function clueTerms(skin: Skin, clues: readonly LineClue[]): Term[] {
  const present = new Set(clues.map((c) => c.t));
  return TERM_ORDER.filter((t) => present.has(t) && skin.terms[t]).map((t) => ({ word: skin.terms[t]![0], meaning: skin.terms[t]![1] }));
}

/** The hardest clue in a list (the one whose words most need explaining), or -1. */
function hardest(clues: readonly LineClue[]): number {
  for (const t of TERM_ORDER) {
    const i = clues.findIndex((c) => c.t === t);
    if (i >= 0) return i;
  }
  return -1;
}

/** What one clue says, and when it is true, in the skin's words. */
function clueMeaning(skin: Skin, c: LineClue, text: string, nm: (id: string) => string): string {
  const q = quote(text);
  switch (c.t) {
    case 'before':
      // Heights and wings have no "ahead of": say where the two stand in the ordered line.
      return skin.aheadOf
        ? `${q} is true when ${nm(c.a)} is anywhere ${skin.aheadOf} ${nm(c.b)}. Others may be in between.`
        : `${q} is true when ${nm(c.a)} comes anywhere before ${nm(c.b)} in the order ${skin.lineLabel.toLowerCase()}. Others may be in between.`;
    case 'rightBefore': return `${q} is true only when ${nm(c.a)} is just one spot ${skin.aheadOf ?? 'ahead of'} ${nm(c.b)}. No one is in between.`;
    case 'nextTo': {
      const rb = skin.rightBefore ?? ((a: string, b: string) => `${a} is right before ${b}`);
      return `${q} is true in two ways. One way: ${rb(nm(c.a), nm(c.b))}. The other way: ${rb(nm(c.b), nm(c.a))}.`;
    }
    case 'notNextTo': return `${q} is true in any order with someone between ${nm(c.a)} and ${nm(c.b)}. It does not say which of the two is ahead.`;
    case 'between':
      return `${q} is true in two ways. One way: ${skin.before(nm(c.b), nm(c.a))}, and ${skin.before(nm(c.a), nm(c.c))}. `
        + `The other way: ${skin.before(nm(c.c), nm(c.a))}, and ${skin.before(nm(c.a), nm(c.b))}.`;
    case 'notFirst': return `${q} rules out just one spot for ${nm(c.a)}: ${skin.ends[0]}.`;
    case 'notLast': return `${q} rules out just one spot for ${nm(c.a)}: ${skin.ends[1]}.`;
    default: return `${q} names an exact spot for ${nm(c.a)}.`;
  }
}

/** The words a feedback message needs about one puzzle. */
interface Talk {
  skin: Skin;
  nm(id: string): string;
  clues: readonly LineClue[];
  /** The clue texts, in the order the scene shows them. */
  texts: readonly string[];
}

/**
 * A line as a worked case: "Finish order: Ava, Ben, Cal." and clue truths there (clueHolds), then any other
 * sentence's truth. A line that fits lists every clue (all true). A line that does not fit lists only the
 * clues it breaks, so the card stays short and points at the failure. `only` picks the clues instead.
 */
function lineCase(t: Talk, order: readonly string[], more: readonly Truth[] = [], note?: string, only?: readonly number[]): TeachCase {
  const br = brokenBy(t.clues, order);
  const idx = only ?? (br.length ? br : t.clues.map((_, i) => i));
  return {
    label: `${t.skin.lineLabel}: ${order.map(t.nm).join(', ')}.`,
    truths: [...idx.map((i) => ({ who: `Clue ${i + 1}, ${quote(t.texts[i])}`, value: clueHolds(t.clues[i], order) })), ...more],
    ...(note ? { note } : {}),
  };
}

/**
 * A line in the item's worked cases (Teach.cases): only the clues it breaks are listed, so a line that fits
 * lists none, and its note says "Every clue is true here." The cases try many lines, and listing every clue
 * on each one made the panel too long to read. The example under a chosen answer (lineCase) lists them all.
 */
const surveyCase = (t: Talk, order: readonly string[], more: readonly Truth[] = [], note?: string): TeachCase =>
  lineCase(t, order, more, note, brokenBy(t.clues, order));

/** "Every clue is true here." or "Clue 2 is false here.", from the clue truths. */
function cluesNote(t: Talk, order: readonly string[]): string {
  const br = brokenBy(t.clues, order);
  return br.length ? `${cap(clueNums(br))} ${isAre(br.length)} false here.` : 'Every clue is true here.';
}

/** "Ben finished first here, but clue 1 is false." or "Every clue is true here. So Ben could have finished first." */
function tryNote(t: Talk, order: readonly string[], placed: string, could: string): string {
  const br = brokenBy(t.clues, order);
  return br.length ? `${cap(placed)} here, but ${clueNums(br)} ${isAre(br.length)} false.` : `Every clue is true here. So ${could}.`;
}

/**
 * A try is one person pinned in one spot, with the others free to move; one line is only one way to place them. The
 * line a case shows for a try is the best one (closest: the fewest broken clues), so when it breaks a clue, every
 * line with that person there does. The note says so, and the label says it is the best try, never "the" try.
 */
const NO_WAY = 'No way of placing the others keeps every clue true.';

/** tryNote for a best try (a closest() line): a broken clue also says that moving the others cannot fix it. */
function bestTryNote(t: Talk, order: readonly string[], placed: string, could: string): string {
  const br = brokenBy(t.clues, order);
  return br.length ? `${tryNote(t, order, placed, could)} ${NO_WAY}` : tryNote(t, order, placed, could);
}

/**
 * The worked cases of a try-each-spot question: one best try per answer. The first card that breaks a clue says that
 * no way of placing the others works; the rest keep the short note, so the panel stays short.
 */
function bestTryCases(t: Talk, tries: readonly { order: readonly string[]; placed: string; could: string }[]): TeachCase[] {
  let said = false;
  return tries.map((x) => {
    const broken = brokenBy(t.clues, x.order).length > 0;
    const note = broken && !said ? bestTryNote(t, x.order, x.placed, x.could) : tryNote(t, x.order, x.placed, x.could);
    said ||= broken;
    return bestTryCase(t, x.order, note, brokenBy(t.clues, x.order));
  });
}

/** "Kofi second in line", "Ava first", "Ava as the tallest", "Ash having the longest wings": a person pinned in a spot. */
export function pinned(skin: Skin, name: string, spot: string): string {
  if (skin.verb === 'have') return `${name} having ${spot}`;
  return skin.verb === 'be' && spot.startsWith('the ') ? `${name} as ${spot}` : `${name} ${spot}`;
}

/** A best try as a case card: "Best try: Fay, Kofi, Tia, Vic." Its note says who is pinned where. */
function bestTryCase(t: Talk, order: readonly string[], note: string, only?: readonly number[]): TeachCase {
  return { ...lineCase(t, order, [], note, only), label: `Best try: ${order.map(t.nm).join(', ')}.` };
}

/** A small made-up puzzle for "Explain more simply": its people, its clues and the worked example. */
export interface Mini {
  ids: string[];
  clues: LineClue[];
  text: string[];
}

/** Names for a made-up example: from the skin's pool but not in this puzzle when there are enough. Sorted. */
function exampleCast(skin: Skin, used: readonly string[], k: number) {
  const free = skin.pool.filter((p) => !used.includes(p.toLowerCase()));
  const labels = [...(free.length >= k ? free.slice(0, k) : skin.pool.slice(0, k))].sort();
  const ids = labels.map((l) => l.toLowerCase());
  return { ids, nm: (id: string) => labels[ids.indexOf(id)] };
}

/** "Imagine three runners: Ava, Ben and Cal. The clues are “…” and “….”" */
function imagine(skin: Skin, ids: readonly string[], nm: (id: string) => string, texts: readonly string[]): string {
  const said = texts.length === 1
    ? `The only clue is ${quoteEnd(texts[0])}`
    : texts.length === 2
      ? `The clues are ${quote(texts[0])} and ${quoteEnd(texts[1])}`
      : texts.map((x, i) => `Clue ${i + 1} is ${quoteEnd(x)}`).join(' ');
  return `Imagine ${numWord(ids.length)} ${skin.noun}s: ${joinNames(ids.map(nm))}. ${said}`;
}

const before = (a: string, b: string): LineClue => ({ t: 'before', a, b });
const rightBefore = (a: string, b: string): LineClue => ({ t: 'rightBefore', a, b });

/** Lesson 1's smallest example: two clues, three names, crossing out. `cant`: two are left. */
export function chainSimpler(skin: Skin, used: readonly string[], ask: 'first' | 'last', cant: boolean): Mini {
  const { ids, nm } = exampleCast(skin, used, 3);
  const [x, y, z] = ids;
  const clues = !cant ? [before(x, y), before(y, z)] : ask === 'first' ? [before(x, z), before(y, z)] : [before(x, y), before(x, z)];
  const texts = clues.map((c) => clueText(skin, c, 3, nm));
  const spotK = ask === 'first' ? 1 : 3;
  const spotObj = skin.spot(spotK, 3, true);
  const out = (c: LineClue) => (c.t === 'before' ? (ask === 'first' ? c.b : c.a) : c.a);
  const left = whoCanBeAt(fits(ids, clues), spotK);
  const text = [imagine(skin, ids, nm, texts)];
  clues.forEach((c, i) => {
    text.push(`${quote(texts[i])} ${i > 0 && out(c) === out(clues[i - 1]) ? 'also tells you' : 'tells you'} ${say(skin, 'not', nm(out(c)), spotObj)}.`);
  });
  text.push(left.length === 1
    ? `Only ${nm(left[0])} is left. So ${say(skin, 'must', nm(left[0]), spotObj)}.`
    : `${joinNames(left.map(nm))} are left. No clue, and no chain of clues, links them. So you can’t tell.`);
  return { ids, clues, text };
}

/** Lesson 2's smallest example: one or two clues, three names, every order that fits checked. */
export function statusSimpler(skin: Skin, used: readonly string[], status: Status, t: 'before' | 'rightBefore'): Mini & { stmt: LineClue } {
  const { ids, nm } = exampleCast(skin, used, 3);
  const [x, y, z] = ids;
  let clues: LineClue[];
  let stmt: LineClue;
  if (status === 'might') {
    clues = t === 'rightBefore' ? [before(x, y)] : [before(x, z)];
    stmt = t === 'rightBefore' ? rightBefore(x, y) : before(y, x);
  } else if (status === 'must') {
    // Only "before" and "right before" clues: lesson 2 teaches no clue that names a spot.
    clues = t === 'before' ? [rightBefore(x, y)] : [before(x, y), before(y, z)];
    stmt = t === 'before' ? before(x, y) : rightBefore(x, y);
  } else {
    clues = t === 'before' ? [before(y, x)] : [rightBefore(x, z)];
    stmt = t === 'before' ? before(x, y) : rightBefore(x, y);
  }
  const texts = clues.map((c) => clueText(skin, c, 3, nm));
  const fit = fits(ids, clues);
  const text = [
    imagine(skin, ids, nm, texts),
    `Is ${quote(clueText(skin, stmt, 3, nm))} true?`,
    fit.length === 1 ? `Only one order fits the ${clues.length === 1 ? 'clue' : 'clues'}.` : `${cap(numWord(fit.length))} orders fit.`,
    ...fit.map((p) => `In the order ${orderWords(skin, nm, p)}, it is ${clueHolds(stmt, p) ? 'true' : 'false'}.`),
  ];
  const got = statusOf(fit, stmt);
  text.push(got === 'must'
    ? 'It is true in every order that fits. So it must be true.'
    : got === 'might'
      ? 'It is true in some orders that fit and false in others. So it might be true.'
      : 'It is false in every order that fits. So it can’t be true.');
  return { ids, clues, text, stmt };
}

/** What lesson 3 item is about: its hardest kind of clue. */
export type SpotFocus = 'ends' | 'nextTo' | 'notNextTo' | 'between';

/** Lesson 3's smallest example: try each spot (or each name) and cross out the ones that break a clue. */
export function spotSimpler(skin: Skin, used: readonly string[], focus: SpotFocus, forced: boolean): Mini & { q: { where: string } | { who: number } } {
  const { ids, nm } = exampleCast(skin, used, focus === 'ends' && !forced ? 4 : 3);
  const [a, b, c] = ids;
  let clues: LineClue[];
  let q: { where: string } | { who: number };
  switch (focus) {
    case 'ends': clues = [{ t: 'notFirst', a: b }, { t: 'notLast', a: b }]; q = { where: b }; break;
    // Decided: the pair next to each other leaves an end for c, and "not first" picks the last one. Lesson 3 teaches
    // no clue that names a spot (first, last), so the example uses none.
    case 'nextTo': clues = forced ? [{ t: 'nextTo', a, b }, { t: 'notFirst', a: c }] : [{ t: 'nextTo', a, b }]; q = { where: forced ? c : a }; break;
    case 'notNextTo': clues = [{ t: 'notNextTo', a, b: c }]; q = forced ? { where: b } : { who: 1 }; break;
    case 'between': clues = [{ t: 'between', a: b, b: a, c }]; q = forced ? { where: b } : { who: 1 }; break;
  }
  const n = ids.length;
  const texts = clues.map((cl) => clueText(skin, cl, n, nm));
  const fit = fits(ids, clues);
  const ow = (p: readonly string[]) => orderWords(skin, nm, p);
  const text = [imagine(skin, ids, nm, texts)];
  if ('where' in q) {
    const x = q.where;
    const good = spotsOf(fit, x);
    const bad = Array.from({ length: n }, (_, i) => i + 1).filter((j) => !good.includes(j));
    text.push(`Try ${nm(x)} in each spot. The others can move.`);
    // A spot is out only when every way of placing the others breaks a clue (bad: no order that fits puts x there).
    if (bad.length) text.push(`With ${nm(x)} in the ${joinOr(bad.map((j) => ORDINALS[j - 1]))} spot, ${NO_WAY.charAt(0).toLowerCase()}${NO_WAY.slice(1)}`);
    for (const j of good) text.push(`The ${ORDINALS[j - 1]} spot works, as in the order ${ow(fit.find((p) => p.indexOf(x) === j - 1)!)}.`);
    text.push(good.length === 1 ? `Only one spot works. So ${say(skin, 'must', nm(x), skin.spot(good[0], n, false))}.` : 'More than one spot works. So you can’t tell.');
  } else {
    const k = q.who;
    const spotObj = skin.spot(k, n, true);
    const good = whoCanBeAt(fit, k);
    const bad = ids.filter((id) => !good.includes(id));
    text.push(`Who ${CONJ[skin.verb].could} ${spotObj}?`);
    if (bad.length) text.push(`With ${joinOr(bad.map(nm))} ${spotObj}, ${NO_WAY.charAt(0).toLowerCase()}${NO_WAY.slice(1)}`);
    for (const g of good) text.push(`${nm(g)} works, as in the order ${ow(fit.find((p) => p[k - 1] === g)!)}.`);
    text.push(good.length === 1 ? `Only one works. So ${say(skin, 'must', nm(good[0]), spotObj)}.` : 'More than one works. So you can’t tell.');
  }
  return { ids, clues, text, q };
}

/**
 * The first sure step of a build: a clue that names a spot, an end found by crossing out, someone next to two people,
 * two clues that put three people in order (a chain, or a "between" that a "before" turns the right way), a pair.
 */
export interface FirstStep {
  kind: 'spot' | 'end' | 'between' | 'order3' | 'pair' | 'try';
  /** The step in words, checked against every order that fits the clues it uses. */
  text: string;
  /** For 'end': the spot (1 or n) it fills. */
  k?: number;
}

/**
 * Where to start building a line. A clue that names a spot comes first. With none, a sure thing the clues prove
 * together: crossing out (lesson 1) leaves one person for an end; or someone is next to two different people, so stands
 * between them; or two clues put three people in order; or a pair must stand together. Every claim is checked
 * against the orders that fit the clues it uses.
 */
export function firstStep(skin: Skin, ids: readonly string[], clues: readonly LineClue[], texts: readonly string[], nm: (id: string) => string): FirstStep {
  const n = ids.length;
  const fit = fits(ids, clues);
  const anchor = clues.findIndex((c) => c.t === 'first' || c.t === 'last' || c.t === 'place');
  if (anchor >= 0) return { kind: 'spot', text: `Start with the clue that names a spot: ${quoteEnd(texts[anchor])}` };
  const edges = edgesOf(ids, clues);
  const ends: [number, string[]][] = [[1, ids.filter((x) => !edges.some((e) => e.to === x))], [n, ids.filter((x) => !edges.some((e) => e.from === x))]];
  for (const [k, left] of ends) {
    if (left.length !== 1 || !fit.every((p) => p[k - 1] === left[0])) continue;
    return { kind: 'end', k, text: `Cross out ${k === 1 ? skin.crossFirst : skin.crossLast}. Only ${nm(left[0])} is left, so ${say(skin, 'must', nm(left[0]), skin.spot(k, n, true))}.` };
  }
  const adj = clues.flatMap((c, i) => (c.t === 'nextTo' || c.t === 'rightBefore' ? [{ i, a: c.a, b: c.b }] : []));
  for (const p of ids) {
    const mine = adj.filter((e) => e.a === p || e.b === p);
    for (let u = 0; u < mine.length; u++) {
      for (let v = u + 1; v < mine.length; v++) {
        const [a, c] = [mine[u], mine[v]].map((e) => (e.a === p ? e.b : e.a));
        if (a === c) continue;
        // Next to two different people: in every line where those two clues hold, p stands right between them.
        const two = [clues[mine[u].i], clues[mine[v].i]];
        if (!fits(ids, two).every((o) => clueHolds({ t: 'between', a: p, b: a, c }, o) && Math.abs(o.indexOf(a) - o.indexOf(c)) === 2)) continue;
        return {
          kind: 'between',
          text: `Look at ${quote(texts[mine[u].i])} and ${quoteEnd(texts[mine[v].i])} ${nm(p)} is next to ${nm(a)} and next to ${nm(c)}. So ${say(skin, 'must', nm(p), `between ${nm(a)} and ${nm(c)}`)}.`,
        };
      }
    }
  }
  // Two clues that fix the order of three people: a chain of two "before" clues, or a "between" a "before" turns.
  const named = (c: LineClue) => [c.a, ...('b' in c ? [c.b] : []), ...('c' in c ? [c.c] : [])];
  for (let i = 0; i < clues.length; i++) {
    for (let j = i + 1; j < clues.length; j++) {
      const three = [...new Set([...named(clues[i]), ...named(clues[j])])];
      if (three.length !== 3) continue;
      const orders = new Set(fits(ids, [clues[i], clues[j]]).map((p) => [...three].sort((u, v) => p.indexOf(u) - p.indexOf(v)).join()));
      if (orders.size !== 1) continue;
      const line = [...orders][0].split(',').map(nm);
      return { kind: 'order3', text: `Look at ${quote(texts[i])} and ${quoteEnd(texts[j])} Together they put three in order. ${skin.lineLabel}: ${line.join(', then ')}.` };
    }
  }
  if (adj.length) return { kind: 'pair', text: `Start with ${quoteEnd(texts[adj[0].i])} ${nm(adj[0].a)} and ${nm(adj[0].b)} stand together as a pair.` };
  return { kind: 'try', text: 'No clue names a spot, and no pair has to stand together. Try a line, check every clue, and fix it.' };
}

/**
 * Lesson 4's smallest example: start with the clue that names a spot. With `anchor` false, a line no clue names a spot
 * in: someone next to two people stands between them (skins that can say "next to"), or crossing out finds the first.
 */
export function buildSimpler(skin: Skin, used: readonly string[], anchor = true): Mini {
  const { ids, nm } = exampleCast(skin, used, 3);
  const [x, y, z] = ids;
  if (!anchor) {
    const adjacent = skin.types.includes('nextTo');
    const clues: LineClue[] = adjacent ? [{ t: 'nextTo', a: y, b: x }, { t: 'nextTo', a: y, b: z }, before(x, z)] : [before(x, y), before(y, z)];
    const texts = clues.map((c) => clueText(skin, c, 3, nm));
    const fit = fits(ids, clues);
    if (fit.length !== 1) throw new Error('buildSimpler: the example must have one answer');
    const last = clues.length - 1;
    const pair = last === 2 ? [x, z] : [y, z];
    return {
      ids,
      clues,
      text: [
        imagine(skin, ids, nm, texts),
        `No clue names a spot. ${firstStep(skin, ids, clues, texts, nm).text}`,
        `${quote(texts[last])} decides the order of ${nm(pair[0])} and ${nm(pair[1])}.`,
        `The only line that fits is ${orderWords(skin, nm, fit[0])}. ${brokenBy(clues, fit[0]).length ? '' : 'Every clue is true there.'}`.trim(),
      ],
    };
  }
  const clues: LineClue[] = [{ t: 'last', a: z }, before(x, y)];
  const texts = clues.map((c) => clueText(skin, c, 3, nm));
  const fit = fits(ids, clues);
  if (fit.length !== 1) throw new Error('buildSimpler: the example must have one answer');
  const text = [
    imagine(skin, ids, nm, texts),
    `Start with the clue that names a spot. ${quote(texts[0])} puts ${nm(z)} in the last spot.`,
    `${nm(x)} and ${nm(y)} fill the other two spots. ${quote(texts[1])} decides their order.`,
    `The only line that fits is ${orderWords(skin, nm, fit[0])}. ${brokenBy(clues, fit[0]).length ? '' : 'Every clue is true there.'}`.trim(),
  ];
  return { ids, clues, text };
}

/** Lesson 5's smallest example: a chain makes a third clue not needed. */
export function extraSimpler(skin: Skin, used: readonly string[]): Mini {
  const { ids, nm } = exampleCast(skin, used, 3);
  const [x, y, z] = ids;
  const clues = [before(x, y), before(y, z), before(x, z)];
  const texts = clues.map((c) => clueText(skin, c, 3, nm));
  const without3 = fits(ids, clues.slice(0, 2));
  const without1 = fits(ids, clues.slice(1));
  const alt = without1.find((p) => p.join() !== without3[0].join());
  if (without3.length !== 1 || !alt) throw new Error('extraSimpler: the example must show a needed and a not-needed clue');
  const text = [
    imagine(skin, ids, nm, texts),
    `Cover up clue 3. Clues 1 and 2 still give just one order: ${orderWords(skin, nm, without3[0])}.`,
    'So clue 3 is not needed.',
    `Now cover up clue 1 instead. Then the order ${orderWords(skin, nm, alt)} fits too.`,
    'So clue 1 is needed.',
  ];
  return { ids, clues, text };
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
    // One short sentence per step: three steps in one sentence ran to 25 words with letters.
    const chain = `${parts.map(cap).join('. ')}.`;
    const answer = ends.length === 1 ? ends[0] : CANT;

    const t: Talk = { skin, nm, clues, texts };
    const ow = (p: readonly string[]) => orderText(skin, cast, p);
    const at = (id: string) => say(skin, 'is', nm(id), spotObj);
    const yours = (id: string, p: readonly string[]): Truth => ({ who: `Your answer, ${quote(at(id))}`, value: clueHolds({ t: 'place', a: id, k: spotK }, p) });
    /** The best try at putting id at the end the question asks about. */
    const tryAt = (id: string) => closest(cast.ids, clues, (p) => p[spotK - 1] === id, order);
    /** Who a "before" clue rules out for this end. */
    const outOf = (c: LineClue) => (c.t === 'before' ? (ask === 'first' ? c.b : c.a) : c.a);
    const cross = ask === 'first' ? skin.crossFirst : skin.crossLast;
    const told = clues.map((c, i) => `${quote(texts[i])} tells you ${say(skin, 'not', nm(outOf(c)), spotObj)}.`);
    /**
     * The mix-up a name picked on a can't-tell item shows: two people who are each ahead of the same person (a fork)
     * read as a chain. Said first, from the clues: the shared person, when one clue puts each of them past it.
     */
    const forkLine = (x: string, y: string): string => {
      const ahead = (a: string, b: string) => clues.some((c) => c.t === 'before' && c.a === a && c.b === b);
      const z = cast.ids.find((w) => (ask === 'first' ? ahead(x, w) && ahead(y, w) : ahead(w, x) && ahead(w, y)));
      if (!z) return `No clue, and no chain of clues, links ${nm(x)} and ${nm(y)}.`;
      const [one, two] = ask === 'first' ? [skin.before(nm(x), nm(z)), skin.before(nm(y), nm(z))] : [skin.before(nm(z), nm(x)), skin.before(nm(z), nm(y))];
      return `${cap(one)}, and ${two}. No chain links ${nm(x)} and ${nm(y)}.`;
    };

    const feedback: Record<string, ChoiceFeedback> = {};
    for (const id of cast.ids) {
      if (id === answer) continue;
      if (ends.includes(id)) {
        // The answer is Can't tell: this one could be at that end, and so could someone else.
        const others = ends.filter((e) => e !== id);
        const mine = tryAt(id);
        const alt = tryAt(others[0]);
        feedback[id] = {
          headline: `${cap(say(skin, 'could', nm(id), spotObj))}, but so could ${joinNames(others.map(nm))}.`,
          detail: [
            forkLine(id, others[0]),
            `Your answer says ${say(skin, 'must', nm(id), spotObj)}. That needs every order that fits the clues to agree.`,
            `The order ${ow(mine)} fits every clue, and ${at(id)} there. The order ${ow(alt)} fits every clue too, and ${at(others[0])} there.`,
            'They give different answers, so you can’t tell.',
          ],
          example: lineCase(t, alt, [yours(id, alt)], `${cluesNote(t, alt)} ${cap(at(alt[spotK - 1]))}, not ${nm(id)}.`),
        };
      } else {
        // A clue puts someone on the far side of this one, so it can't be at that end. The headline says
        // "false" in plain words: lesson 1 does not use (or define) "break a clue".
        const i = clues.findIndex((c) => outOf(c) === id);
        const p = tryAt(id);
        const br = brokenBy(clues, p);
        feedback[id] = {
          headline: `Your answer makes the clue ${quote(texts[i])} false.`,
          detail: [
            `${told[i]} So ${nm(id)} is crossed out.`,
            `Think of the order ${ow(p)}. ${cap(at(id))} there, but ${clueNums(br)} ${isAre(br.length)} false.`,
          ],
          example: lineCase(t, p, [yours(id, p)], tryNote(t, p, at(id), say(skin, 'could', nm(id), spotObj))),
        };
      }
    }
    if (answer !== CANT) {
      // Can't tell picked, but the chain decides it. Each rival is ruled out by its own clue (a forced end
      // means every rival is on the far side of some clue); show the closest rival breaking a clue.
      const rival = cast.ids.filter((id) => id !== answer).map((id) => ({ id, p: tryAt(id) }))
        .sort((a, b) => brokenBy(clues, a.p).length - brokenBy(clues, b.p).length)[0];
      const br = brokenBy(clues, rival.p);
      feedback[CANT] = {
        headline: `The clues rule out everyone but ${nm(answer)}.`,
        detail: [
          '“Can’t tell” is right only when two or more answers fit the clues.',
          `Every ${skin.noun} but ${nm(answer)} is ruled out by at least one clue. For example, think of the order ${ow(rival.p)}. ${cap(at(rival.id))} there, but ${clueNums(br)} ${isAre(br.length)} false.`,
          `Only ${nm(answer)} is left. So ${say(skin, 'must', nm(answer), spotObj)}.`,
        ],
        example: lineCase(t, rival.p, [], tryNote(t, rival.p, at(rival.id), say(skin, 'could', nm(rival.id), spotObj))),
      };
    }

    // No clue links two of the people left at that end, not even through a chain: one that did would rule one out.
    const explain = answer === CANT
      ? `${joinNames(ends.map(nm))} ${CONJ[skin.verb].could.replace(/^could/, 'could each')} ${spotObj}. No clue, and no chain of clues, links them. So you can’t tell.`
      : `${chain} So ${say(skin, 'must', nm(answer), spotObj)}.`;
    const teach: Teach = {
      rule: `Cross out ${cross}. If just one is left, that one ${CONJ[skin.verb].is} ${spotObj}. If more are left, you can’t tell.`,
      terms: [CANT_TERM, ...clueTerms(skin, clues)].slice(0, 3),
      meaning: [
        ...clues.map((c, i) => (clues.slice(0, i).some((d) => outOf(d) === outOf(c)) ? told[i].replace(' tells you ', ' also tells you ') : told[i])),
        `No clue rules out ${joinOr(ends.map(nm))}.`,
      ].join(' '),
      casesTitle: `Who ${CONJ[skin.verb].could} ${spotObj}?`,
      cases: cast.ids.map((id) => {
        const p = tryAt(id);
        return surveyCase(t, p, [], tryNote(t, p, at(id), say(skin, 'could', nm(id), spotObj)));
      }),
      remember: ['Cross out anyone a clue rules out. Then count who is left.', 'Ask: “Could a different order that fits the clues put someone else there?”'],
      simpler: chainSimpler(skin, cast.ids, ask, answer === CANT).text,
    };
    // The hint shows one try already checked: someone a clue crosses out (never a person who could be the
    // answer), with every clue marked true or false.
    const outId = cast.ids.filter((id) => !ends.includes(id))
      .sort((a, b) => brokenBy(clues, tryAt(a)).length - brokenBy(clues, tryAt(b)).length)[0];
    const outLine = tryAt(outId);
    // The clue that crosses this one out on its own: moving the others never helps, because it is about this one.
    const outClue = clues.findIndex((c) => outOf(c) === outId);
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
      feedback,
      explain,
      hint: `Here is one try, checked for you. Cross out ${cross}. How many are left?`,
      hintCase: bestTryCase(t, outLine, `${tryNote(t, outLine, at(outId), say(skin, 'could', nm(outId), spotObj))} Moving the others does not help: ${told[outClue]} So cross out ${nm(outId)}.`, clues.map((_, i) => i)),
      teach,
      tags: [answer === CANT ? 'cant-tell' : 'decided', `ask-${ask}`],
      ...(answer === CANT ? { conflict: true } : {}),
    };
    syncWhyWrong(item);
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
  [...new Set(path.map((e) => e.clue))].map((i) => unstop(texts[i])).join('. ');

// ---------- lesson 2: before vs right before ----------

export interface StatusOpts {
  id: string;
  skin: SkinId;
  /** The status the sentence should have. Ignored when conflict is set (then it is 'might'). */
  target?: Status;
  /** "Before" in a clue, "right before" in the sentence: only might be true. */
  conflict?: boolean;
  n?: number;
  /** Only clues of these types (lesson 2 teaches "before" and "right before"). Default: also first and last. */
  types?: readonly ClueType[];
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
        const extra = rng.pick(trueClues(order, allowed(['before', 'first', 'last'], o.types)).filter((c) => clueKey(c) !== `before:${a},${b}`));
        clues = rng.shuffle([...clues, extra]);
      }
      stmt = { t: 'rightBefore', a, b };
    } else {
      const k = n === 3 ? rng.int(1, 2) : rng.int(2, 3);
      clues = weightedShuffle(rng, trueClues(order, allowed(['before', 'rightBefore', 'first', 'last'], o.types)), (c) => (c.t === 'first' || c.t === 'last' ? 1 : 3)).slice(0, k);
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
          ? `Two orders fit the clues: ${orderText(skin, cast, fit[0])}. Or ${orderText(skin, cast, fit[1])}. The sentence is ${word} in each one.`
          : `Try each order that fits the clues. The sentence is ${word} in every one.`;
    const beforeMeans = skin.beforeMeans ?? '“Before” means anywhere earlier.';

    const t: Talk = { skin, nm, clues, texts };
    const said = (p: readonly string[]): Truth => ({ who: `The sentence, ${quote(stmtText)}`, value: clueHolds(stmt, p) });
    /** Who stands between the sentence's two names in this order. */
    const inBetween = (p: readonly string[]) => {
      const [i, j] = [p.indexOf(stmtA), p.indexOf(stmtB)].sort((x, y) => x - y);
      return p.slice(i + 1, j);
    };
    /** A note on a line from its computed truths. */
    const caseNote = (p: readonly string[]) => {
      const br = brokenBy(clues, p);
      const tv = clueHolds(stmt, p) ? 'true' : 'false';
      if (br.length) return `The sentence is ${tv} here. But ${clueNums(br)} ${isAre(br.length)} false, so this order does not fit.`;
      const mid = stmt.t === 'rightBefore' && clueHolds({ t: 'before', a: stmtA, b: stmtB }, p) ? inBetween(p) : [];
      return `This order fits every clue. The sentence is ${tv} here.${mid.length ? ` ${joinNames(mid.map(nm))} ${isAre(mid.length)} between ${nm(stmtA)} and ${nm(stmtB)}.` : ''}`;
    };
    const lineOf = (p: readonly string[]) => lineCase(t, p, [said(p)], caseNote(p));
    /** The best try at making the sentence true (or false) when no order that fits does. */
    const tryFor = (want: boolean) => closest(cast.ids, clues, (p) => clueHolds(stmt, p) === want, order);
    const tryLine = (p: readonly string[], tv: 'true' | 'false') => {
      const br = brokenBy(clues, p);
      return `Think of ${ot(p)}. The sentence is ${tv} there. But ${clueNums(br)} ${isAre(br.length)} false, so that order does not fit.`;
    };

    let explain: string;
    const feedback: Record<string, ChoiceFeedback> = {};
    let cases: string[][];
    if (status === 'must') {
      explain = reason ?? `${counted('true')} So it must be true.`;
      const x = tryFor(false);
      feedback.might = {
        headline: 'Your answer allows the sentence to be false, but no order that fits the clues makes it false.',
        detail: [
          '“Might be true” means some orders that fit the clues make the sentence true, and others make it false.',
          tryLine(x, 'false'),
          // The chain reason, when there is one, is in the right answer's explanation just below.
          'Every order that makes the sentence false makes a clue false too. So the sentence must be true.',
        ],
        example: lineOf(x),
      };
      const w = rng.pick(yes);
      feedback.cant = {
        headline: 'Your answer says the sentence is never true, but every order that fits the clues makes it true.',
        detail: [
          '“Can’t be true” means no order that fits the clues makes the sentence true.',
          `Think of ${ot(w)}. Every clue is true there, and so is the sentence.`,
          'In fact, the sentence is true in every order that fits. So it must be true.',
        ],
        example: lineOf(w),
      };
      cases = [...yes.slice(0, 2), x];
    } else if (status === 'cant') {
      explain = reason ?? `${counted('false')} So it can’t be true.`;
      const x = tryFor(true);
      const close = 'Every order that makes the sentence true makes a clue false too. So the sentence can’t be true.';
      feedback.must = {
        headline: 'Your answer says the sentence is always true, but no order that fits the clues makes it true.',
        detail: ['“Must be true” means the sentence is true in every order that fits the clues.', tryLine(x, 'true'), close],
        example: lineOf(x),
      };
      feedback.might = {
        headline: 'Your answer allows the sentence to be true, but no order that fits the clues makes it true.',
        detail: ['“Might be true” needs at least one order that fits the clues and makes the sentence true.', tryLine(x, 'true'), close],
        example: lineOf(x),
      };
      cases = [...no.slice(0, 2), x];
    } else {
      const tw = rng.pick(yes), fw = rng.pick(no);
      explain = `${misread ? `${beforeMeans} ` : ''}The sentence is true for ${ot(tw)}. It is false for ${ot(fw)}. Each of these orders fits the clues, so the sentence might be true.`;
      const mid = inBetween(fw);
      feedback.must = misread
        ? {
          headline: `Your answer treats “${skin.beforeWord ?? 'before'}” as “${skin.rightWord ?? 'right before'}.”`,
          detail: [
            `The clue says ${quoteEnd(texts[clues.findIndex((c) => c.t === 'before' && c.a === stmtA && c.b === stmtB)])} That allows other ${skin.noun}s in between.`,
            `Think of ${ot(fw)}. Every clue is true there. But ${joinNames(mid.map(nm))} ${isAre(mid.length)} between ${nm(stmtA)} and ${nm(stmtB)}, so the sentence is false.`,
            '“Must be true” needs the sentence to be true in every order that fits. So the sentence might be true, but it does not have to be.',
          ],
          example: lineOf(fw),
        }
        : {
          headline: 'Your answer says the sentence is always true, but one order that fits the clues makes it false.',
          detail: [
            '“Must be true” means the sentence is true in every order that fits the clues.',
            `Think of ${ot(fw)}. Every clue is true there, but the sentence is false.`,
            'So the sentence does not have to be true. It is true in other orders that fit, so it might be true.',
          ],
          example: lineOf(fw),
        };
      feedback.cant = {
        headline: 'Your answer says the sentence is never true, but one order that fits the clues makes it true.',
        detail: [
          '“Can’t be true” means no order that fits the clues makes the sentence true.',
          `Think of ${ot(tw)}. Every clue is true there, and so is the sentence.`,
          'So the sentence can be true. It is false in other orders that fit, so it might be true.',
        ],
        example: lineOf(tw),
      };
      cases = [tw, fw];
    }
    const teach: Teach = {
      // "Some" alone would include "all", so might is "some but not all", as on the lesson card.
      rule: 'Check the sentence in every order that fits the clues. True in all of them: it must be true. True in some but not all: it might be true. True in none: it can’t be true.',
      terms: [skin.terms.before, skin.terms.rightBefore].flatMap((w) => (w ? [{ word: w[0], meaning: w[1] }] : [])).concat(FITS_TERM).slice(0, 3),
      meaning: `The sentence ${clueMeaning(skin, stmt, stmtText, nm)}`,
      casesTitle: 'Which orders fit the clues, and is the sentence true there?',
      cases: cases.map((p) => surveyCase(t, p, [said(p)], caseNote(p))),
      remember: [
        'Must: true in every order that fits. Might: true in some, but not all. Can’t: true in none.',
        'Ask: “Is there an order that fits the clues and makes the sentence true? Is there one that makes it false?”',
      ],
      simpler: statusSimpler(skin, cast.ids, status, stmt.t).text,
    };
    const trap = misread && status === 'might';
    // The hint shows one order already checked, every clue and the sentence marked, and never the answer's case
    // (often only one order fits, and showing it would give the answer away). Must: the nearest order that makes
    // the sentence false, which breaks a clue. Can't: the nearest that makes it true, which breaks a clue. Might:
    // an order that fits; for the "before" trap, the one with someone in between, as on the lesson's board.
    const hintLine = status === 'must' ? tryFor(false) : status === 'cant' ? tryFor(true) : trap ? no[0] : yes[0];
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's3.l2',
      skill: stmt.t === 'rightBefore' ? 's3.right-before' : 's3.before',
      // "Must it be true?" alone does not say true when, so the question names every order that fits the clues.
      prompt: `${cast.setting} Look at this sentence: “${stmtText}” Think about every order that fits the clues. Must the sentence be true, might it be true, or can’t it be true?`,
      scene: { kind: 'clues', clues: texts },
      choices: STATUS_CHOICES,
      answer: status,
      feedback,
      explain,
      // It never says how many orders fit: often just one does.
      hint: 'Here is one order, checked for you. Check other orders the same way. Is the sentence true in every order that fits, in some, or in none?',
      hintCase: lineCase(t, hintLine, [said(hintLine)], caseNote(hintLine), clues.map((_, i) => i)),
      teach,
      tags: [status, ...(trap ? ['before-trap'] : [])],
      ...(trap ? { conflict: true } : {}),
    };
    syncWhyWrong(item);
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
  /** Only clues of these types (default: every spot type, "not next to", first and last included). */
  types?: readonly ClueType[];
  /** The item must be about this kind of clue (its hardest focus clue): a twin of one guided board. */
  focus?: SpotFocus;
  /**
   * true: some answer the clues keep has a first line that breaks a clue (the others in the order the setting names
   * them), so a one-line check would cross it out; moving the others is what keeps it. false: none does.
   */
  moveOthers?: boolean;
}

const FOCUS = new Set<ClueType>(['notFirst', 'notLast', 'nextTo', 'notNextTo', 'between']);
const SPOT_TYPES: readonly ClueType[] = ['notFirst', 'notLast', 'nextTo', 'notNextTo', 'between', 'before', 'rightBefore', 'first', 'last'];

const SPOT_REMEMBER: Record<SpotFocus, string> = {
  ends: 'A “not first” or “not last” clue rules out just one spot. Count the spots that are left.',
  nextTo: 'Two names next to each other can be in either order.',
  notNextTo: 'Two names that are not next to each other need someone in between.',
  between: '“Somewhere between” does not say which of the other two comes first.',
};

/** "Where is Eli in line?" or "Who finished second?", with Can't tell when the clues do not decide it. */
export function spotPuzzle(rng: Rng, o: SpotOpts): Built<ChooseItem> & { q: 'where' | 'who'; target: string; k: number; focus: SpotFocus } {
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
    const types = allowed(SPOT_TYPES, o.types).filter((t) => skin.types.includes(t));
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
    const where = q === 'where';
    const place = (j: number) => skin.spot(j, n, false);
    const spotObj = n === 3 && k === 2 ? skin.middle : skin.spot(k, n, true);
    // One question, two shapes: "where is x?" (values are spot numbers) or "who is in spot k?" (values are ids).
    const valueOf = (p: readonly string[]) => (where ? String(p.indexOf(x) + 1) : p[k - 1]);
    const cands = where ? Array.from({ length: n }, (_, i) => String(i + 1)) : cast.ids;
    const idOf = (v: string) => (where ? `p${v}` : v);
    const sayAt = (mode: Mode, v: string) => (where ? say(skin, mode, nm(x), place(Number(v))) : say(skin, mode, nm(v), spotObj));
    const tryAt = (v: string) => closest(cast.ids, clues, (p) => valueOf(p) === v, order);
    /** Who is pinned, and where, for a value: "Kofi", "second in line". */
    const pinOf = (v: string): [string, string] => (where ? [x, place(Number(v))] : [v, spotObj]);
    /** The first line a learner writes for a value: the one pinned, the others in the order the setting names them. */
    const natural = (v: string): string[] => {
      const [pin, at] = where ? [x, Number(v)] : [v, k];
      const rest = cast.ids.filter((id) => id !== pin);
      return [...rest.slice(0, at - 1), pin, ...rest.slice(at - 1)];
    };
    const moveOthers = options.some((v) => brokenBy(clues, natural(v)).length > 0);
    if (o.moveOthers !== undefined && moveOthers !== o.moveOthers) continue;

    let choices: Choice[];
    let answer: string;
    let prompt: string;
    let explain: string;
    let hint: string;
    if (where) {
      choices = [...Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, label: cap(ORDINALS[i]) })), CANT_TELL];
      answer = forced ? `p${options[0]}` : CANT;
      prompt = `${cast.setting} ${skin.where(nm(x))}`;
      hint = `Try ${nm(x)} in each spot. Cross out a spot only when no way of placing the others keeps every clue true.`;
      if (forced) {
        const j = Number(options[0]);
        explain = `Try ${nm(x)} in each spot. Only the ${ORDINALS[j - 1]} spot keeps every clue true. So ${say(skin, 'must', nm(x), place(j))}.`;
      } else {
        const o1 = fit.find((p) => p.indexOf(x) + 1 === Number(options[0]))!;
        const o2 = fit.find((p) => p.indexOf(x) + 1 === Number(options[1]))!;
        explain = `${twoFits} ${ot(o1)}. Or ${ot(o2)}. ${nm(x)} is in a different spot in each, so you can’t tell.`;
      }
    } else {
      choices = nameChoices(cast);
      answer = forced ? options[0] : CANT;
      prompt = `${cast.setting} ${skin.who} ${CONJ[skin.verb].is} ${spotObj}?`;
      // Never "that spot": every sentence names the spot the question asks about. A person never breaks a clue: a
      // line does, and a try is crossed out only when no line with that person there keeps every clue true.
      hint = `Ask: “${skin.who} ${CONJ[skin.verb].could} ${spotObj}?” Try each ${skin.noun} there. Cross out a ${skin.noun} only when no way of placing the others keeps every clue true.`;
      if (forced) {
        explain = `No line with any other ${skin.noun} ${spotObj} keeps every clue true. So ${say(skin, 'must', nm(answer), spotObj)}.`;
      } else {
        const o1 = fit.find((p) => p[k - 1] === options[0])!;
        const o2 = fit.find((p) => p[k - 1] === options[1])!;
        explain = `${twoFits} ${ot(o1)}. Or ${ot(o2)}. One puts ${nm(options[0])} ${spotObj}, and the other puts ${nm(options[1])} there. So you can’t tell.`;
      }
    }

    // The clue the lesson is about: the conflict's own clue, else the hardest focus clue.
    const pick = (ts: readonly ClueType[]) => clues.findIndex((c) => ts.includes(c.t));
    const fi = o.conflict === 'ends' ? pick(['notFirst']) : o.conflict === 'between' ? pick(['between'])
      : [pick(['between']), pick(['nextTo', 'notNextTo']), pick(['notFirst', 'notLast'])].find((i) => i >= 0)!;
    const fc = clues[fi];
    const focus: SpotFocus = fc.t === 'between' ? 'between' : fc.t === 'nextTo' ? 'nextTo' : fc.t === 'notNextTo' ? 'notNextTo' : 'ends';
    if (o.focus && focus !== o.focus) continue;
    const skill = focus === 'between' ? 's3.between' : focus === 'ends' ? 's3.not-first-last' : 's3.next-to';

    const t: Talk = { skin, nm, clues, texts };
    /** Your answer as a placement, checked like a clue. */
    const claim = (v: string): LineClue => (where ? { t: 'place', a: x, k: Number(v) } : { t: 'place', a: v, k });
    const yours = (v: string, p: readonly string[]): Truth => ({ who: `Your answer, ${quote(sayAt('is', v))}`, value: clueHolds(claim(v), p) });
    const feedback: Record<string, ChoiceFeedback> = {};
    for (const v of cands) {
      const id = idOf(v);
      if (id === answer) continue;
      if (options.includes(v)) {
        // The answer is Can't tell: this value fits some orders, and another value fits others.
        const other = options.find((w) => w !== v)!;
        const mine = tryAt(v);
        const alt = tryAt(other);
        feedback[id] = {
          headline: `${cap(sayAt('could', v))}, but not for sure.`,
          detail: [
            `Your answer says ${sayAt('must', v)}. That needs every order that fits the clues to agree.`,
            `The order ${ot(mine)} fits every clue, and ${sayAt('is', v)} there. The order ${ot(alt)} fits every clue too, and ${sayAt('is', other)} there.`,
            'They give different answers, so you can’t tell.',
          ],
          example: lineCase(t, alt, [yours(v, alt)], `${cluesNote(t, alt)} ${cap(sayAt('is', valueOf(alt)))}, so your answer is false here.`),
        };
      } else {
        // No order with this value fits: name the clue (or two) that rule it out.
        const ks = killers(cast.ids, clues, (p) => valueOf(p) === v);
        const p = tryAt(v);
        const br = brokenBy(clues, p);
        const says = ks.length === 1
          ? [`Clue ${ks[0] + 1} says ${quoteEnd(texts[ks[0]])}`]
          : ks.length === 2 ? [`Clue ${ks[0] + 1} says ${quoteEnd(texts[ks[0]])} Clue ${ks[1] + 1} says ${quoteEnd(texts[ks[1]])}`] : [];
        // One clue on its own: every such order breaks it. Two or more together: fix a clue the first try
        // breaks, and another clue breaks instead.
        let rest: string[];
        if (ks.length === 1) {
          rest = [`Every order where ${sayAt('is', v)} breaks clue ${ks[0] + 1}.`];
        } else {
          const a = ks.length === 2 ? (br.includes(ks[0]) ? ks[0] : ks[1]) : br[0];
          const q2 = closest(cast.ids, clues, (o) => valueOf(o) === v && clueHolds(clues[a], o), order);
          const br2 = brokenBy(clues, q2);
          rest = [
            `Now think of the order ${ot(q2)}. Clue ${a + 1} is true there, but ${clueNums(br2)} ${isAre(br2.length)} false.`,
            ks.length === 2
              ? `No order where ${sayAt('is', v)} keeps clue ${ks[0] + 1} and clue ${ks[1] + 1} true together.`
              : `Every order where ${sayAt('is', v)} breaks at least one clue.`,
          ];
        }
        feedback[id] = {
          headline: `${cap(sayAt('cant', v))} without breaking ${clueOr(ks)}.`,
          detail: [
            ...says,
            `Think of the order ${ot(p)}. ${cap(sayAt('is', v))} there, but ${clueNums(br)} ${isAre(br.length)} false.`,
            ...rest,
          ],
          example: lineCase(t, p, [yours(v, p)], tryNote(t, p, sayAt('is', v), sayAt('could', v))),
        };
      }
    }
    if (forced) {
      // Can't tell picked, but only one value keeps every clue true. Show the closest rival breaking a clue.
      const right = options[0];
      const rival = cands.filter((v) => v !== right).map((v) => ({ v, p: tryAt(v) }))
        .sort((a, b) => brokenBy(clues, a.p).length - brokenBy(clues, b.p).length)[0];
      const br = brokenBy(clues, rival.p);
      feedback[CANT] = {
        headline: where
          ? `Only the ${ORDINALS[Number(right) - 1]} spot keeps every clue true for ${nm(x)}.`
          : `Only ${say(skin, 'could', nm(right), spotObj)} without breaking a clue.`,
        detail: [
          '“Can’t tell” is right only when two or more answers fit the clues.',
          `Think of the order ${ot(rival.p)}. ${cap(sayAt('is', rival.v))} there, but ${clueNums(br)} ${isAre(br.length)} false.`,
          `No other answer has a line that keeps every clue true. Only ${where ? `the ${ORDINALS[Number(right) - 1]} spot` : nm(right)} works. So ${sayAt('must', right)}.`,
        ],
        example: lineCase(t, rival.p, [], tryNote(t, rival.p, sayAt('is', rival.v), sayAt('could', rival.v))),
      };
    }

    const nf = clues.findIndex((c) => c.t === 'notFirst' && c.a === fc.a);
    const nl = clues.findIndex((c) => c.t === 'notLast' && c.a === fc.a);
    const meaning = focus === 'ends' && nf >= 0 && nl >= 0
      ? `${quote(texts[nf])} rules out ${skin.ends[0]}. ${quote(texts[nl])} rules out ${skin.ends[1]}.`
        + (where && fc.a === x ? ` With ${numWord(n)} spots, these two clues leave ${numWord(n - 2)}.` : '')
      : clueMeaning(skin, fc, texts[fi], nm);
    const focusTerms = clueTerms(skin, focus === 'ends' ? clues.filter((c) => c.t === 'notFirst' || c.t === 'notLast') : [fc]);
    const teach: Teach = {
      rule: where
        ? `Try ${nm(x)} in each spot. Cross out a spot only when no way of placing the others keeps every clue true. If one spot is left, that is the answer. If more are left, you can’t tell.`
        : `Try each ${skin.noun} in the spot the question asks about. Cross out a ${skin.noun} only when no way of placing the others keeps every clue true. If one is left, that is the answer. If more are left, you can’t tell.`,
      terms: [...focusTerms, CANT_TERM, BREAK_TERM],
      meaning,
      casesTitle: where ? `Try ${nm(x)} in each spot` : `Who ${CONJ[skin.verb].could} ${spotObj}?`,
      cases: bestTryCases(t, cands.map((v) => ({ order: tryAt(v), placed: sayAt('is', v), could: sayAt('could', v) }))),
      remember: [SPOT_REMEMBER[focus], where ? 'Ask: “Is more than one spot still left?”' : `Ask: “${cap(CONJ[skin.verb].could.replace(/^could/, 'could anyone else'))} ${spotObj}?”`],
      simpler: spotSimpler(skin, cast.ids, focus, forced).text,
    };
    // The hint shows one try already checked, with every clue marked: a spot (or a name) the clues cross out, so
    // never the answer. When every value still fits, one that could be the answer.
    const out = cands.find((v) => !options.includes(v)) ?? cands[0];
    const outLine = tryAt(out);
    const outNote = brokenBy(clues, outLine).length
      ? `${bestTryNote(t, outLine, sayAt('is', out), sayAt('could', out))} So ${sayAt('cant', out)}.`
      : tryNote(t, outLine, sayAt('is', out), sayAt('could', out));
    // The test board, to mark if it helps (never checked): each answer pinned in turn, with the others free to move.
    const scratch: DrillStep = {
      id: 'scratch',
      title: 'Your test board',
      body: [
        texts.map((s, i) => `Clue ${i + 1}: ${quoteEnd(s)}`).join(' '),
        'Pin one at a time. Move the others. Keep the try if any line keeps every clue true.',
      ],
      scene: { kind: 'clues', clues: texts },
      rows: cands.map((v): DrillRow => {
        const [who, at] = pinOf(v);
        const kept = options.includes(v);
        const ks = kept ? [] : killers(cast.ids, clues, (p) => valueOf(p) === v);
        const none = ks.length === 1 ? `Every line with ${pinned(skin, nm(who), at)} breaks clue ${ks[0] + 1}.` : `No line with ${pinned(skin, nm(who), at)} keeps every clue true.`;
        return {
          id: `try-${v}`,
          label: `Try ${pinned(skin, nm(who), at)}.`,
          needs: `Testing: ${sayAt('is', v)}. The others can move.`,
          marks: [{
            id: `try-${v}-keep`,
            label: 'Keep or cross out?',
            options: KEEP_CROSS,
            answer: kept ? 'keep' : 'reject',
            why: kept ? { reject: `${ot(tryAt(v))} keeps every clue true. So keep this try.` } as Record<string, string> : { keep: `${none} So cross out this try.` },
          }],
        };
      }),
      done: '',
      scaffold: 'full',
      words: lineWords('Those ideas are apart now. Back to the question: pin one, move the others, then keep or cross out.'),
    };
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
      feedback,
      explain,
      hint,
      hintCase: bestTryCase(t, outLine, outNote, clues.map((_, i) => i)),
      teach,
      scratch,
      scratchLabel: 'the test board',
      confused: tryConfused(skin),
      tags: [forced ? 'decided' : 'cant-tell', focus, q, ...(moveOthers ? ['move-others'] : [])],
      ...(o.conflict ? { conflict: true } : {}),
    };
    syncWhyWrong(item);
    return { item, ids: cast.ids, order, clues, q, target: x, k, focus };
  }
  throw new Error('spotPuzzle: no puzzle found');
}

// ---------- lesson 4: build the whole line ----------

export interface BuildOpts {
  id: string;
  skin: SkinId;
  n: number;
  /** Only clues of these types (default: every type the skin can say). */
  types?: readonly ClueType[];
  /** true: a clue names a spot (first, last or a place). false: no clue does, so the start is a sure thing the clues prove together. */
  anchor?: boolean;
}

/** The clues that name a spot. */
const SPOT_CLUES: readonly ClueType[] = ['first', 'last', 'place'];

/**
 * Lines one swap away from the answer that break exactly one clue, each a different clue (at most two).
 * They show how a clue rules out a line that looks almost right.
 */
function nearMisses(order: readonly string[], clues: readonly LineClue[]): { p: string[]; swap: [string, string]; br: number[] }[] {
  const out: { p: string[]; swap: [string, string]; br: number[] }[] = [];
  const seen = new Set<number>();
  const swaps: [number, number][] = [];
  for (let i = 0; i + 1 < order.length; i++) swaps.push([i, i + 1]);
  for (let i = 0; i < order.length; i++) for (let j = i + 2; j < order.length; j++) swaps.push([i, j]);
  for (const one of [true, false]) {
    for (const [i, j] of swaps) {
      if (out.length >= 2) return out;
      const p = [...order];
      [p[i], p[j]] = [p[j], p[i]];
      const br = brokenBy(clues, p);
      if (!br.length || (one && br.length !== 1) || seen.has(br[0]) || out.some((m) => m.p.join() === p.join())) continue;
      seen.add(br[0]);
      out.push({ p, swap: [order[i], order[j]], br });
    }
  }
  return out;
}

/** Place everyone. The clues force exactly one order, and every clue is needed. */
export function buildPuzzle(rng: Rng, o: BuildOpts): Built<OrderItem> {
  const skin = SKINS[o.skin];
  const n = o.n;
  for (let tries = 0; tries < 2000; tries++) {
    const cast = makeCast(rng, skin, n);
    const order = rng.shuffle(cast.ids);
    const types = allowed(skin.types, o.types).filter((t) => o.anchor !== false || !SPOT_CLUES.includes(t));
    const clues = forceClues(rng, order, types);
    if (clues.length < 2 || clues.length > n + 1) continue;
    if (!clues.some((c) => RELATIONAL.has(c.t))) continue;
    if (clues.filter((c) => c.t === 'place' || c.t === 'first' || c.t === 'last').length > 2) continue;
    const anchor = clues.findIndex((c) => SPOT_CLUES.includes(c.t));
    if (o.anchor === true && anchor < 0) continue;

    const nm = cast.nm;
    const texts = clues.map((c) => clueText(skin, c, n, nm));
    let names = rng.shuffle(cast.ids);
    if (names.join() === order.join()) names = [...names.slice(1), names[0]];
    // Where to start: a clue that names a spot, or a sure thing the clues prove together (never a guess from the pool).
    const step = firstStep(skin, cast.ids, clues, texts, nm);

    const t: Talk = { skin, nm, clues, texts };
    const hi = hardest(clues);
    const near = nearMisses(order, clues);
    const teach: Teach = {
      rule: 'A line is right only when every clue is true. Check each clue, one at a time.',
      terms: [...clueTerms(skin, clues).slice(0, 2), BREAK_TERM],
      meaning: hi >= 0 ? clueMeaning(skin, clues[hi], texts[hi], nm) : `${quote(texts[anchor])} names an exact spot.`,
      casesTitle: 'Check each clue against a line',
      cases: [
        // The right line lists every clue: this lesson is about checking each clue, one at a time.
        lineCase(t, order, [], fits(cast.ids, clues).length === 1 && !brokenBy(clues, order).length ? 'Every clue is true here. This is the only line that fits.' : cluesNote(t, order)),
        // Only the broken clues are listed; every clue not listed is true there (m.br is every clue it breaks).
        // Say what was swapped from: the right line on the card above.
        ...near.map((m) => lineCase(t, m.p, [], `This is the right line with ${nm(m.swap[0])} and ${nm(m.swap[1])} swapped. That breaks ${clueNums(m.br)}. The other clues are still true.`, m.br)),
      ],
      remember: [
        step.kind === 'spot'
          ? 'Start with the clue that names a spot. Then check every clue, one at a time.'
          : step.kind === 'end'
            ? `Start with who ${CONJ[skin.verb].must} ${skin.spot(step.k!, n, true)}. Then check every clue, one at a time.`
            : 'No clue names a spot? Start with what two clues prove together, or with a pair. Then check every clue, one at a time.',
        'Ask: “Which clue does my line break?”',
      ],
      simpler: buildSimpler(skin, cast.ids, anchor >= 0).text,
    };
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
      explain: `${anchor >= 0 ? `Start with ${quoteEnd(texts[anchor])}` : step.text} Only one order keeps every clue true: ${orderText(skin, cast, order)}.`,
      // The hint names the first real step (a spot clue, or a sure thing two clues prove), never a guess.
      hint: `Here is one line, checked clue by clue. ${anchor >= 0
        ? 'Start with the clue that names an exact spot. Then place the rest one by one.'
        : `${step.text}${step.kind === 'try' ? '' : ' Then place the rest one by one.'}`}`,
      tags: [anchor >= 0 ? 'spot-clue' : 'no-spot-clue'],
      // The names in the order the pool shows them (never the answer), tested clue by clue.
      hintCase: lineCase(t, names, [], `${cap(clueNums(brokenBy(clues, names)))} ${isAre(brokenBy(clues, names).length)} false here. So this line does not fit.`, clues.map((_, i) => i)),
      teach,
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
  /** Only clues of these types, the spare one too (default: every type the skin can say). */
  types?: readonly ClueType[];
}

/**
 * 3-5 clues that force one order, where exactly one clue can be dropped and the order is still
 * forced. The choices are the clue texts, with ids made from what each clue says.
 */
export function extraCluePuzzle(rng: Rng, o: ExtraOpts): Built<ChooseItem> & { extra: number } {
  const skin = SKINS[o.skin];
  for (let tries = 0; tries < 2000; tries++) {
    const n = o.n ?? rng.pick([3, 4, 4]);
    const cast = makeCast(rng, skin, n);
    const order = rng.shuffle(cast.ids);
    const types = allowed(skin.types, o.types);
    const core = forceClues(rng, order, types);
    if (core.length < 2 || core.length > 4) continue;
    const keys = new Set(core.map(clueKey));
    const extras = weightedShuffle(rng, trueClues(order, types).filter((c) => !keys.has(clueKey(c))), (c) => (c.t === 'before' ? 4 : 1));
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
    const ow = (p: readonly string[]) => orderText(skin, cast, p);
    const t: Talk = { skin, nm, clues, texts };
    /** An order that fits every clue but clue i (and is not the answer). */
    const altFor = (i: number) => fits(cast.ids, clues.filter((_, j) => j !== i)).find((p) => p.join() !== order.join())!;

    const feedback: Record<string, ChoiceFeedback> = {};
    clues.forEach((c, i) => {
      if (i === idx) return;
      const alt = altFor(i);
      const br = brokenBy(clues, alt);
      feedback[clueId(c)] = {
        headline: 'Without your clue, a second order fits the other clues.',
        detail: [
          'A clue is not needed only when the other clues already give just one order.',
          `Cover up ${quoteEnd(texts[i])} Then the order ${ow(alt)} fits every other clue.`,
          `Your clue is false for that order. So your clue is what rules it out, and it is needed.`,
        ],
        example: lineCase(t, alt, [], br.length === 1 && br[0] === i ? 'Every clue but yours is true here.' : cluesNote(t, alt)),
      };
    });
    const sideCases = clues.map((_, i) => i).filter((i) => i !== idx).slice(0, 3).map((i) => {
      const alt = altFor(i);
      return surveyCase(t, alt, [], `With clue ${i + 1} covered, this order fits too. ${cap(cluesNote(t, alt))} So clue ${i + 1} is needed.`);
    });
    const teach: Teach = {
      rule: 'A clue is not needed when the other clues already prove what it says.',
      terms: [NOT_NEEDED_TERM, ...clueTerms(skin, clues).slice(0, 1), FITS_TERM].slice(0, 3),
      meaning: `Together, the clues give one order: ${ow(order)}. Cover up one clue at a time. If that order is still the only one that fits, the covered clue is not needed.`,
      casesTitle: 'Cover up each clue',
      cases: [
        surveyCase(t, order, [], fits(cast.ids, clues.filter((_, j) => j !== idx)).length === 1
          ? `Every clue is true here. With clue ${idx + 1} covered, this is still the only order that fits. So clue ${idx + 1} is not needed.`
          : cluesNote(t, order)),
        ...sideCases,
      ],
      remember: ['A clue is needed if covering it lets a second order fit.', 'Ask: “Without this clue, could a different order fit?”'],
      simpler: extraSimpler(skin, cast.ids).text,
    };
    const item: ChooseItem = {
      kind: 'choose',
      id: o.id,
      stop: STOP,
      lesson: 's3.l5',
      skill: 's3.not-needed',
      // "Not needed" is spelled out: the other clues give the same order without it.
      prompt: `${cast.setting} These clues give just one order. One clue could be covered up, and the other clues would still give that same order. Which clue is not needed?`,
      scene: { kind: 'clues', clues: texts },
      choices: clues.map((c, i) => ({ id: clueId(c), label: texts[i] })),
      answer: clueId(spare),
      feedback,
      explain: `Cover up ${quoteEnd(texts[idx])} The other clues still give just one order: ${ow(order)}. So that clue tells you nothing new.`,
      hint: 'Here is one clue, covered for you. Cover up each other clue the same way. Do the rest still give just one order?',
      // A needed clue covered (never the answer): the second order that fits, with every clue marked.
      hintCase: (() => {
        const i = clues.findIndex((_, j) => j !== idx);
        const alt = altFor(i);
        return lineCase(t, alt, [], `With clue ${i + 1} covered, this order fits too. So clue ${i + 1} is needed.`, clues.map((_, j) => j));
      })(),
      teach,
    };
    syncWhyWrong(item);
    return { item, ids: cast.ids, order, clues, extra: idx };
  }
  throw new Error('extraCluePuzzle: no puzzle found');
}

// ---------- the Do step: guided boards ----------
//
// A board is a small line-up with fixed names: the clues on a key-idea card (the See), or a twin of them with one
// piece changed. The learner marks it by taps: who goes in each spot, whether each clue is true for a line, keep or
// cross out a try, must / might / can't, which other order fits when a clue is covered. Every right mark is worked
// out here from every order that fits (fits, clueHolds, killers), and every message for a wrong mark says what the
// clue or sentence says and where the people stand in that line.

/** A small fixed line-up for a key-idea card and its guided board. Ids are lower-case names: 'ava'. */
export interface LineBoard {
  skin: SkinId;
  ids: readonly string[];
  clues: readonly LineClue[];
}

/** A board name from its id: 'ava' -> 'Ava'. */
export const boardName = (id: string) => cap(id);

/** The board's clues in its skin's words, in order. */
export const boardTexts = (b: LineBoard): string[] => b.clues.map((c) => clueText(SKINS[b.skin], c, b.ids.length, boardName));

/** The board as a scene: its numbered clue list. A key-idea card and its guided board share it. */
export const boardScene = (b: LineBoard): Scene => ({ kind: 'clues', clues: boardTexts(b) });

/** A worked example: the board's clues, one line of its people (first to last), and each clue marked for that line. */
export const lineScene = (b: LineBoard, order: readonly string[]): Scene => ({
  kind: 'clues',
  clues: boardTexts(b),
  marks: b.clues.map((c) => (clueHolds(c, order) ? 'ok' : 'broken')),
  line: { names: order.map(boardName), first: SKINS[b.skin].firstLabel, last: SKINS[b.skin].lastLabel },
});

/** Every order of the board's people where all its clues hold. */
export const boardFits = (b: LineBoard): string[][] => fits(b.ids, b.clues);

/** "Ava, Ben, Cal", or "Ava, Ben, Cal (tallest first)". */
export const boardLine = (b: LineBoard, order: readonly string[]) => orderWords(SKINS[b.skin], boardName, order);

/** The people no clue names. */
export const unnamed = (b: LineBoard) => b.ids.filter((id) => !b.clues.some((c) => mentions(c, id)));

const TRUE_FALSE: DrillOption[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const KEEP_CROSS: DrillOption[] = [{ id: 'keep', label: 'Keep' }, { id: 'reject', label: 'Cross out' }];
const FITS_NOT: DrillOption[] = [{ id: 'fit', label: 'Fits' }, { id: 'not', label: 'Does not fit' }];
const NEEDED: DrillOption[] = [{ id: 'yes', label: 'Needed' }, { id: 'no', label: 'Not needed' }];
const tf = (v: boolean) => (v ? 'true' : 'false');

/**
 * The labels a line-up board uses for its compare and because rows (BoardWords): a clue checked against one line, never
 * a sign against a test. The need line (DrillRow.needs) stands on its own: "Testing: Eli finished first. The others can move."
 */
export const LINE_WORDS: BoardWords = {
  says: 'Clue',
  world: 'This line',
  so: 'So',
  ask: 'Does the clue hold in this line?',
  fit: 'The clue holds here: True.',
  unfit: 'The clue breaks here: False.',
  needs: '',
};
/** LINE_WORDS with the closing line of "I’m confused" for this board or question. */
export const lineWords = (closing: string): BoardWords => ({ ...LINE_WORDS, closing });

/** Quoted clues as a list that ends a sentence: “A” and “B.” */
const quoteList = (texts: readonly string[]) => joinNames(texts.map((x, i) => (i === texts.length - 1 ? quoteEnd(x) : quote(x))));

/** "Cal finished between Ava and Ben." or "No one finished between Ava and Ben." */
function betweenFact(skin: Skin, p: readonly string[], a: string, b: string): string {
  const [i, j] = [p.indexOf(a), p.indexOf(b)].sort((x, y) => x - y);
  const mid = p.slice(i + 1, j).map(boardName);
  const where = `between ${boardName(a)} and ${boardName(b)}`;
  if (!mid.length) return `No one ${skin.verb === 'finish' ? 'finished' : 'is'} ${where}.`;
  return `${joinNames(mid)} ${skin.verb === 'finish' ? 'finished' : isAre(mid.length)} ${where}.`;
}

/** Where the people a clue names stand in a line, in the skin's words: "Eli finished first." */
function clueFacts(b: LineBoard, c: LineClue, p: readonly string[]): string {
  const skin = SKINS[b.skin];
  const named = [c.a, ...('b' in c ? [c.b] : []), ...('c' in c ? [c.c] : [])].sort((x, y) => p.indexOf(x) - p.indexOf(y));
  const at = named.map((id) => say(skin, 'is', boardName(id), skin.spot(p.indexOf(id) + 1, p.length, true)));
  const s = `${cap(joinNames(at))}.`;
  return c.t === 'rightBefore' || c.t === 'nextTo' || c.t === 'notNextTo' ? `${s} ${betweenFact(skin, p, c.a, c.b)}` : s;
}

/**
 * A clue or sentence marked true or false for a line. Its message for the wrong mark: what it says, and where the people
 * stand. With `compare`, the two facts to compare go with it (DrillMark.compare): the clue's words, and the line with
 * where the people it names stand. No verdict: on a shown mark the board adds it from the answer.
 */
function truthMark(b: LineBoard, id: string, label: string, ref: string, text: string, c: LineClue, p: readonly string[], given: boolean, compare = false): DrillMark {
  const v = clueHolds(c, p);
  return {
    id,
    label,
    options: TRUE_FALSE,
    answer: tf(v),
    ...(given ? { given: true } : {}),
    why: { [tf(!v)]: `In ${boardLine(b, p)}, ${ref} is ${tf(v)}. It says, ${quoteEnd(text)} ${clueFacts(b, c, p)}` },
    ...(compare ? { compare: { says: text, world: `${boardLine(b, p)}. ${clueFacts(b, c, p)}` } } : {}),
  };
}

/** The test-world line over a try: "Testing: Eli finished first. The others can move." */
export function testingLine(b: LineBoard, x: string, k: number): string {
  const skin = SKINS[b.skin];
  return `Testing: ${say(skin, 'is', boardName(x), skin.spot(k, b.ids.length, true))}. The others can move.`;
}

/**
 * Why no line passing `test` keeps every clue true, in the killers() wording: "Every line with Eli first makes clue 1
 * false." Only for a try no line keeps: with a line that fits, there is no such clue.
 */
function noLineWith(b: LineBoard, test: (p: string[]) => boolean, withX: string): string {
  if (allOrders(b.ids).some((p) => test(p) && !brokenBy(b.clues, p).length)) throw new Error('noLineWith: a line with this try fits');
  const ks = killers(b.ids, b.clues, test);
  if (ks.length === 1) return `Every line with ${withX} makes clue ${ks[0] + 1} false.`;
  if (ks.length === 2) return `No line with ${withX} keeps clue ${ks[0] + 1} and clue ${ks[1] + 1} true together.`;
  return `No line with ${withX} keeps every clue true.`;
}

/** Why no line passing `test` fits: the one clue each such line makes false, else that none keeps every clue true. */
function ruledOut(b: LineBoard, test: (p: string[]) => boolean, placed: string, cant: string): string {
  const ks = killers(b.ids, b.clues, test);
  return ks.length === 1
    ? `The clue ${quote(boardTexts(b)[ks[0]])} is false whenever ${placed}. So ${cant}.`
    : `No order where ${placed} keeps every clue true. So ${cant}.`;
}

export interface BoardRowOpts {
  id: string;
  /** Shown already marked: the worked case. */
  given?: boolean;
}

/**
 * One line on a board: each clue true or false for it (clues, default on), each extra sentence true or false
 * (sentences), and whether it fits (decide: the word for it, 'line' or 'order').
 */
export function lineRow(
  b: LineBoard,
  order: readonly string[],
  o: BoardRowOpts & { label?: string; clues?: boolean; sentences?: readonly LineClue[]; decide?: 'line' | 'order'; compare?: boolean },
): DrillRow {
  const skin = SKINS[b.skin];
  const texts = boardTexts(b);
  const given = !!o.given;
  const marks: DrillMark[] = [];
  if (o.clues ?? true) {
    b.clues.forEach((c, i) => marks.push(truthMark(b, `${o.id}-c${i + 1}`, `Clue ${i + 1}: ${quoteEnd(texts[i])}`, `clue ${i + 1}`, texts[i], c, order, given, !!o.compare)));
  }
  const said = (o.sentences ?? []).map((s) => ({ s, text: clueText(skin, s, b.ids.length, boardName) }));
  said.forEach(({ s, text }, i) => marks.push(truthMark(b, `${o.id}-s${i + 1}`, quoteEnd(text), 'the sentence', text, s, order, given)));
  const notes = said.map(({ s, text }) => `${quote(text)} is ${tf(clueHolds(s, order))} here.`);
  // "Right before" is false while "before" is true: someone stands between the two names. Say who.
  const gap = said.find(({ s }) => s.t === 'rightBefore' && !clueHolds(s, order) && clueHolds({ t: 'before', a: s.a, b: s.b }, order));
  if (gap && gap.s.t === 'rightBefore') notes.unshift(betweenFact(skin, order, gap.s.a, gap.s.b));
  if (o.decide) {
    const what = o.decide;
    const br = brokenBy(b.clues, order);
    marks.push({
      id: `${o.id}-fit`,
      label: `Does this ${what} fit?`,
      options: FITS_NOT,
      answer: br.length ? 'not' : 'fit',
      ...(given ? { given: true } : {}),
      why: br.length
        ? { fit: `In ${boardLine(b, order)}, ${clueNums(br)} ${isAre(br.length)} false. ${what === 'order' ? 'An' : 'A'} ${what} fits only when every clue is true.` }
        : { not: `In ${boardLine(b, order)}, ${clueNums(b.clues.map((_, i) => i))} ${isAre(b.clues.length)} true. So this ${what} fits.` },
    });
    notes.push(br.length ? `${cap(clueNums(br))} ${isAre(br.length)} false. This ${what} does not fit.` : `Every clue is true. This ${what} fits.`);
  }
  return { id: o.id, label: o.label ?? `${skin.lineLabel}: ${boardLine(b, order)}.`, marks, note: notes.join(' ') };
}

/** "Try Eli first" in a race; "Try Ava in spot 1" otherwise. */
function tryWords(b: LineBoard, x: string, k: number): string {
  const skin = SKINS[b.skin];
  return skin.verb === 'finish' ? `Try ${boardName(x)} ${skin.spot(k, b.ids.length, true)}` : `Try ${boardName(x)} in spot ${k}`;
}

/**
 * Try one name in one spot, the method of "Try each spot": a line with x in spot k, each clue true or false there,
 * then keep the try or cross it out. The line is one that fits when there is one. Otherwise it is the nearest try,
 * and it makes a clue false, as every line with x in spot k does: its note and its words say so in the killers()
 * wording ("Every line with Eli first makes clue 1 false"), never "this line breaks, so cross it out". The test-world
 * line over the row (needs) keeps the try in view: x is pinned, the others can move.
 */
export function trialRow(b: LineBoard, x: string, k: number, o: BoardRowOpts): DrillRow {
  const skin = SKINS[b.skin];
  const texts = boardTexts(b);
  const given = !!o.given;
  const X = boardName(x);
  const spot = skin.spot(k, b.ids.length, true);
  const withX = pinned(skin, X, spot);
  const test = (p: string[]) => p[k - 1] === x;
  const line = closest(b.ids, b.clues, test, b.ids);
  const br = brokenBy(b.clues, line);
  const marks = b.clues.map((c, i) => truthMark(b, `${o.id}-c${i + 1}`, `Clue ${i + 1}: ${quoteEnd(texts[i])}`, `clue ${i + 1}`, texts[i], c, line, given, true));
  const none = br.length ? noLineWith(b, test, withX) : '';
  marks.push({
    id: `${o.id}-keep`,
    label: 'Keep or cross out?',
    options: KEEP_CROSS,
    answer: br.length ? 'reject' : 'keep',
    ...(given ? { given: true } : {}),
    why: br.length
      ? { keep: `${none} So cross out this try.` }
      : { reject: `Every clue is true here. So ${say(skin, 'could', X, spot)}. Keep this try.` },
  });
  const note = br.length ? `${none} So ${say(skin, 'cant', X, spot)}.` : `Every clue is true here. So ${say(skin, 'could', X, spot)}.`;
  return { id: o.id, label: `${tryWords(b, x, k)}, as in ${boardLine(b, line)}.`, needs: testingLine(b, x, k), marks, note };
}

/** The line a learner writes first for a try: x in spot k, the others in the order the board lists them. */
export function firstLine(b: LineBoard, x: string, k: number): string[] {
  const rest = b.ids.filter((id) => id !== x);
  return [...rest.slice(0, k - 1), x, ...rest.slice(k - 1)];
}

/**
 * A try in two steps, for a board where the line matters (the try-vs-line distinction): the first line written with x
 * in spot k breaks a clue. Before keeping or crossing out, the learner moves the others (never x) and picks the line
 * that keeps every clue true, or says no line works. Then Keep or Cross out. Every mark comes from the orders with x
 * in spot k; the move mark lists every other one (a three-person board has one).
 */
export function tryRow(b: LineBoard, x: string, k: number, o: BoardRowOpts): DrillRow {
  const skin = SKINS[b.skin];
  const texts = boardTexts(b);
  const given = !!o.given;
  const X = boardName(x);
  const spot = skin.spot(k, b.ids.length, true);
  const withX = pinned(skin, X, spot);
  const test = (p: string[]) => p[k - 1] === x;
  const first = firstLine(b, x, k);
  if (!brokenBy(b.clues, first).length) throw new Error('tryRow: the first line already keeps every clue true (use trialRow)');
  const rest = allOrders(b.ids).filter((p) => test(p) && p.join() !== first.join());
  if (rest.length > 3) throw new Error('tryRow: too many other lines to list');
  const good = rest.filter((p) => !brokenBy(b.clues, p).length);
  if (good.length > 1) throw new Error('tryRow: more than one other line fits');
  const fit = good[0];
  const marks = b.clues.map((c, i) => truthMark(b, `${o.id}-c${i + 1}`, `Clue ${i + 1}: ${quoteEnd(texts[i])}`, `clue ${i + 1}`, texts[i], c, first, given, true));
  const moveWhy: Record<string, string> = {};
  for (const p of rest) {
    if (p === fit) continue;
    const i = brokenBy(b.clues, p)[0];
    moveWhy[orderId(p)] = `In ${boardLine(b, p)}, clue ${i + 1} is false. It says, ${quoteEnd(texts[i])} ${clueFacts(b, b.clues[i], p)}`;
  }
  if (fit) moveWhy.none = `${cap(boardLine(b, fit))} keeps ${withX}, and every clue is true there. So a line works.`;
  marks.push({
    id: `${o.id}-move`,
    label: `Move the others, not ${X}. Which line keeps ${withX} and every clue true?`,
    options: [...rest.map((p) => ({ id: orderId(p), label: p.map(boardName).join(', ') })), { id: 'none', label: 'No line works' }],
    answer: fit ? orderId(fit) : 'none',
    ...(given ? { given: true } : {}),
    why: moveWhy,
  });
  const none = fit ? '' : noLineWith(b, test, withX);
  marks.push({
    id: `${o.id}-keep`,
    label: 'Keep or cross out?',
    options: KEEP_CROSS,
    answer: fit ? 'keep' : 'reject',
    ...(given ? { given: true } : {}),
    why: fit
      ? { reject: `${cap(boardLine(b, fit))} keeps every clue true with ${withX}. One broken line is not enough to cross out a try. Keep it.` }
      : { keep: `${none} So cross out this try.` },
  });
  return {
    id: o.id,
    label: `${tryWords(b, x, k)}, as in ${boardLine(b, first)}.`,
    needs: testingLine(b, x, k),
    marks,
    note: fit ? `${cap(boardLine(b, fit))} keeps every clue true. So ${say(skin, 'could', X, spot)}.` : `${none} So ${say(skin, 'cant', X, spot)}.`,
  };
}

// ---------- distinctions: contrast pictures and "I’m confused" for line-ups ----------

/** Lesson 1: two people a chain links (the end is decided) vs two people each ahead of the same person (can't tell). */
export const CHAIN_VS_FORK: Distinction = {
  id: 'chain-vs-fork',
  a: 'A chain: the middle person is shorter in one clue and taller in the other, so it links the two ends.',
  b: 'A fork: two people are each taller (or each shorter) than the same person, so nothing links them.',
};

/** Lesson 3: a try pins one person in one spot and leaves the others free; one line is only one way to place them. */
export const TRY_VS_LINE: Distinction = {
  id: 'try-vs-line',
  a: 'Trying a spot: one person is pinned there, and the others can still move.',
  b: 'One line you wrote with that person there.',
};

/** Lesson 4: a spot one clue names vs a spot the clues prove together (no clue names it). */
export const NAMED_VS_PROVED: Distinction = {
  id: 'named-vs-proved',
  a: 'A sure spot one clue names, like “Cal finished last.”',
  b: 'A sure spot two clues prove together, like someone next to two people standing between them.',
};

/**
 * Where someone two adjacency clues name stands (clues i and j: "next to" or "right before" x): at one end of the line,
 * or between the two others. Worked out from every line where those two clues hold.
 */
export function middleMark(b: LineBoard, x: string, i: number, j: number, id: string): DrillMark {
  const other = (c: LineClue) => (c.a === x ? ('b' in c ? c.b : '') : c.a);
  const [a, c] = [other(b.clues[i]), other(b.clues[j])];
  if (!a || !c || a === c || !mentions(b.clues[i], x) || !mentions(b.clues[j], x)) throw new Error('middleMark: two clues that put x next to two different people');
  const mid = fits(b.ids, [b.clues[i], b.clues[j]]).every((p) => clueHolds({ t: 'between', a: x, b: a, c }, p));
  const [X, A, C] = [x, a, c].map(boardName);
  return {
    id,
    label: `Where does ${X} stand?`,
    options: [{ id: 'end', label: 'At one end of the line' }, { id: 'mid', label: `Between ${A} and ${C}` }],
    answer: mid ? 'mid' : 'end',
    why: mid
      ? { end: `${X} is next to ${A} and also next to ${C}. Someone at an end has a person on one side only. So ${X} stands between ${A} and ${C}.` }
      : { mid: `Clues ${i + 1} and ${j + 1} leave ${X} at an end in some lines. So ${X} does not have to stand between ${A} and ${C}.` },
  };
}

/**
 * Which way a block of three goes (trio, first to last, as one option; turned around as the other), on a board whose
 * clues give one line. `block`: the clues that make the block. The wrong way breaks another clue in every line where
 * the block holds; its words name that clue.
 */
export function blockMark(b: LineBoard, trio: readonly [string, string, string], block: readonly number[], id: string): DrillMark {
  const fit = boardFits(b);
  if (fit.length !== 1) throw new Error('blockMark: the clues must leave exactly one order');
  const rel = (p: readonly string[]) => [...trio].sort((u, v) => p.indexOf(u) - p.indexOf(v)).join();
  const ways = [[...trio], [...trio].reverse()];
  const answer = ways.find((w) => w.join() === rel(fit[0]));
  if (!answer) throw new Error('blockMark: the line does not keep the three in either order');
  const why: Record<string, string> = {};
  for (const w of ways) {
    if (w === answer) continue;
    const test = (p: string[]) => rel(p) === w.join() && block.every((k) => clueHolds(b.clues[k], p));
    const ks = killers(b.ids, b.clues, test);
    if (ks.length !== 1) throw new Error('blockMark: one clue rules out the wrong way');
    why[orderId(w)] = `With the block ${w.map(boardName).join(', ')}, clue ${ks[0] + 1} is false in every line. It says, ${quoteEnd(boardTexts(b)[ks[0]])}`;
  }
  return {
    id,
    label: 'Which way does the block go?',
    options: ways.map((w) => ({ id: orderId(w), label: w.map(boardName).join(', ') })),
    answer: orderId(answer),
    why,
  };
}

/** One contrast panel for a try: x pinned in spot k, one line, and clue i checked in it. */
function tryPanel(b: LineBoard, x: string, k: number, i: number, p: readonly string[]): ContrastPanel {
  const skin = SKINS[b.skin];
  const c = b.clues[i];
  const v = clueHolds(c, p);
  return {
    world: `${pinned(skin, boardName(x), skin.spot(k, b.ids.length, true))}: ${boardLine(b, p)}.`,
    who: `Clue ${i + 1}`,
    says: boardTexts(b)[i],
    truth: v,
    because: `${clueFacts(b, c, p)} So the clue ${v ? 'holds' : 'breaks'}.`,
  };
}

/**
 * Trying a spot vs one line (the try-vs-line distinction): x pinned in spot k twice. The first line written (the others
 * in board order) breaks a clue; moving only the others gives a line that keeps every clue true. x never moved, so
 * the try is kept. Both truths come from clueHolds on the two lines.
 */
export function tryContrast(b: LineBoard, x: string, k: number): Extract<Scene, { kind: 'contrast' }> {
  const skin = SKINS[b.skin];
  const X = boardName(x);
  const spot = skin.spot(k, b.ids.length, true);
  const first = firstLine(b, x, k);
  const fit = allOrders(b.ids).find((p) => p[k - 1] === x && !brokenBy(b.clues, p).length);
  const i = brokenBy(b.clues, first)[0];
  if (i === undefined || !fit) throw new Error('tryContrast: the first line must break a clue, and another line with x there must fit');
  return {
    kind: 'contrast',
    pairs: [
      { ...tryPanel(b, x, k, i, first), then: `${X} stays ${spot}. Move the others and check again.` },
      { ...tryPanel(b, x, k, i, fit), then: `Every clue is true here. So ${say(skin, 'could', X, spot)}.` },
    ],
    ask: { q: `Did ${X} move?`, a: `No. Only the others moved. So one broken line does not cross out ${pinned(skin, X, spot)}.` },
    words: { worldTag: 'Testing', truth: 'Holds', untruth: 'Breaks' },
  };
}

/**
 * A chain vs a fork (the chain-vs-fork distinction): the same three people, one clue turned around. In the chain the
 * middle person is behind one and ahead of the other, so the end is decided; in the fork two people are each ahead of
 * the same person, nothing links them, and you can't tell. k: the spot asked about (1 or 3). Every line listed is
 * one that fits, and each panel's truth is whether one person can be in spot k.
 */
export function chainContrast(chain: LineBoard, fork: LineBoard, k: 1 | 3): Extract<Scene, { kind: 'contrast' }> {
  const skin = SKINS[chain.skin];
  if (chain.ids.length !== 3 || fork.skin !== chain.skin || fork.ids.join() !== chain.ids.join()) throw new Error('chainContrast: two boards of the same three people');
  const changed = chain.clues.flatMap((c, i) => (clueKey(c) === clueKey(fork.clues[i]) ? [] : [i]));
  if (changed.length !== 1) throw new Error('chainContrast: the fork turns one clue around');
  const spot = skin.spot(k, 3, true);
  const lines = (fit: readonly string[][]) =>
    `${skin.lineLabel}, ${fit.length === 1 ? 'one line fits' : `${numWord(fit.length)} lines fit`}: ${joinOr(fit.map((p) => p.map(boardName).join(', ')))}.`;
  // The chain: one person decided, through a middle person the two clues share.
  const cFit = boardFits(chain);
  const top = cFit[0][0];
  const bottom = cFit[0][2];
  const path = chainPath(chain.ids, chain.clues, top, bottom);
  if (cFit.length !== 1 || !path || path.length !== 2) throw new Error('chainContrast: the chain must decide the line through a middle person');
  const [T, M, B] = [top, path[0].to, bottom].map(boardName);
  // The fork: two people each ahead of (or behind) the same person, and no chain between them.
  const fFit = boardFits(fork);
  const ends = whoCanBeAt(fFit, k);
  const z = fork.ids.find((w) => !ends.includes(w))!;
  if (ends.length !== 2 || chainPath(fork.ids, fork.clues, ends[0], ends[1]) || chainPath(fork.ids, fork.clues, ends[1], ends[0])) throw new Error('chainContrast: the fork must leave two people that no chain links');
  const [E1, E2, Z] = [ends[0], ends[1], z].map(boardName);
  const [one, two] = k === 1 ? [skin.before(E1, Z), skin.before(E2, Z)] : [skin.before(Z, E1), skin.before(Z, E2)];
  const ask = `${skin.who} ${CONJ[skin.verb].is} ${spot}?`;
  return {
    kind: 'contrast',
    pairs: [
      {
        world: boardTexts(chain).join(' '),
        who: 'The question',
        says: ask,
        truth: whoCanBeAt(cFit, k).length === 1,
        because: `${M} links ${T} and ${B}: ${skin.before(T, M)}, and ${skin.before(M, B)}. So ${say(skin, 'must', boardName(cFit[0][k - 1]), spot)}.`,
        then: lines(cFit),
      },
      {
        world: boardTexts(fork).join(' '),
        who: 'The question',
        says: ask,
        truth: false,
        because: `${cap(one)}, and ${two}. No clue, and no chain of clues, links ${E1} and ${E2}.`,
        then: lines(fFit),
      },
    ],
    ask: { q: 'Did the people change?', a: `No. Only clue ${changed[0] + 1} turned around. Now ${Z} is not in the middle, so ${Z} does not link ${E1} and ${E2}.` },
    words: { worldTag: 'The clues', saysWord: 'asks:', truth: 'You can tell', untruth: 'You can’t tell' },
  };
}

/**
 * A spot one clue names vs a spot two clues prove together (the named-vs-proved distinction): the same people and the
 * same question, where is x? On one board a clue names x's spot. On the other no clue names a spot, but x is next to
 * the two others, so x stands between them. Each truth is whether every line that fits puts x in one spot.
 */
export function spotContrast(named: LineBoard, proved: LineBoard, x: string): Extract<Scene, { kind: 'contrast' }> {
  const skin = SKINS[named.skin];
  const n = named.ids.length;
  const X = boardName(x);
  const nameClue = named.clues.findIndex((c) => SPOT_CLUES.includes(c.t) && c.a === x);
  if (nameClue < 0 || proved.clues.some((c) => SPOT_CLUES.includes(c.t))) throw new Error('spotContrast: a clue names the spot on one board only');
  const step = firstStep(skin, proved.ids, proved.clues, boardTexts(proved), boardName);
  const mates = proved.ids.filter((id) => id !== x);
  if (step.kind !== 'between' || !proved.clues.every((c) => c.t === 'nextTo' && mentions(c, x))) throw new Error('spotContrast: two next-to clues put x between the others');
  const panel = (b: LineBoard, because: string): ContrastPanel => {
    const spots = spotsOf(boardFits(b), x);
    return {
      world: boardTexts(b).join(' '),
      who: 'The question',
      says: skin.where(X),
      truth: spots.length === 1,
      because,
      then: spots.length === 1 ? `${cap(say(skin, 'is', X, skin.spot(spots[0], n, true)))} in every line that fits.` : `${X} can be in more than one spot.`,
    };
  };
  const [A, C] = mates.map(boardName);
  // The answer under the panels names the spot, so both boards must put x in the same one spot.
  const [s1, s2] = [named, proved].map((b) => spotsOf(boardFits(b), x));
  if (s1.length !== 1 || s2.length !== 1 || s1[0] !== s2[0]) throw new Error('spotContrast: both boards put x in the same one spot');
  const same = say(skin, 'is', X, skin.spot(s1[0], n, true));
  return {
    kind: 'contrast',
    pairs: [
      panel(named, `One clue names ${X}’s spot. Put ${X} there first.`),
      panel(proved, `No clue names a spot. But ${X} is next to ${A} and next to ${C}. So ${say(skin, 'must', X, `between ${A} and ${C}`)}.`),
    ],
    ask: { q: `Did ${X}’s spot change?`, a: `No. ${cap(same)} both times. Only the way we know it changed: one clue names it, or two clues prove it together.` },
    words: { worldTag: 'The clues', saysWord: 'asks:', truth: 'Sure', untruth: 'Not sure' },
  };
}

/**
 * "I’m confused" on trying a spot (the try-vs-line distinction): one broken line is not every line, and pinning one
 * person leaves the others free. Never a board's or a question's answer.
 */
export function tryConfused(skin: Skin): ConfusedQuestion[] {
  const one = `one ${skin.noun}`;
  return [
    {
      q: `You try ${one} in a spot. Your first line breaks a clue. Can you cross out the spot now?`,
      options: [{ label: 'Yes, one broken line is enough' }, { label: 'Not yet. First try moving the others', right: true }, { label: 'Not sure' }],
      teach: `Not yet. A try pins ${one} in one spot, and the others can still move. Cross out the spot only when no way of placing them keeps every clue true. If the broken clue is about that ${skin.noun}’s own spot, like “not first,” no move can fix it.`,
    },
    {
      q: 'Ava is first in the line Ava, Ben, Cal. She is first in Ava, Cal, Ben too. Did Ava move?',
      options: [{ label: 'Yes' }, { label: 'No. Only the others moved', right: true }, { label: 'Not sure' }],
      teach: 'No. Ava is first in each line. Only Ben and Cal swapped places. So one try, Ava first, goes with more than one line. Check them before you cross it out.',
    },
  ];
}

/** "In what place did Eli finish?": one spot when the clues decide it, else Can't tell. */
export function whereMark(b: LineBoard, x: string, id: string): DrillMark {
  const skin = SKINS[b.skin];
  const n = b.ids.length;
  const fit = boardFits(b);
  const X = boardName(x);
  const good = spotsOf(fit, x);
  const answer = good.length === 1 ? `p${good[0]}` : CANT;
  const spot = (j: number) => skin.spot(j, n, true);
  const lineAt = (j: number) => fit.find((p) => p.indexOf(x) === j - 1)!;
  const why: Record<string, string> = {};
  for (let j = 1; j <= n; j++) {
    if (`p${j}` === answer) continue;
    if (good.includes(j)) {
      const other = good.find((g) => g !== j)!;
      why[`p${j}`] = `${cap(say(skin, 'could', X, spot(j)))}, as in ${boardLine(b, lineAt(j))}. But ${say(skin, 'could', X, spot(other))} too, as in ${boardLine(b, lineAt(other))}. So you can’t tell.`;
    } else {
      why[`p${j}`] = ruledOut(b, (p) => p.indexOf(x) === j - 1, say(skin, 'is', X, spot(j)), say(skin, 'cant', X, spot(j)));
    }
  }
  if (answer !== CANT) why[CANT] = `You can tell. ${X} in any other spot makes a clue false. So ${say(skin, 'must', X, spot(good[0]))}.`;
  const options = [...ORDINALS.slice(0, n).map((w, i) => ({ id: `p${i + 1}`, label: cap(w) })), CANT_TELL];
  return { id, label: skin.where(X), options, answer, why };
}

/** "Who finished second?" or "Who is the tallest?": one name when the clues decide it, else Can't tell. */
export function whoMark(b: LineBoard, k: number, id: string): DrillMark {
  const skin = SKINS[b.skin];
  const fit = boardFits(b);
  const spot = skin.spot(k, b.ids.length, true);
  const good = whoCanBeAt(fit, k);
  const answer = good.length === 1 ? good[0] : CANT;
  const lineWith = (x: string) => fit.find((p) => p[k - 1] === x)!;
  const why: Record<string, string> = {};
  for (const x of b.ids) {
    if (x === answer) continue;
    const X = boardName(x);
    if (good.includes(x)) {
      const y = good.find((g) => g !== x)!;
      why[x] = `${cap(say(skin, 'could', X, spot))}, as in ${boardLine(b, lineWith(x))}. But ${say(skin, 'could', boardName(y), spot)} too, as in ${boardLine(b, lineWith(y))}. So you can’t tell.`;
    } else {
      why[x] = ruledOut(b, (p) => p[k - 1] === x, say(skin, 'is', X, spot), say(skin, 'cant', X, spot));
    }
  }
  if (answer !== CANT) why[CANT] = `You can tell. The clues rule out everyone but ${boardName(answer)}. So ${say(skin, 'must', boardName(answer), spot)}.`;
  return { id, label: `${skin.who} ${CONJ[skin.verb].is} ${spot}?`, options: [...b.ids.map((x) => ({ id: x, label: boardName(x) })), CANT_TELL], answer, why };
}

/** The skin's question about two names. */
const PAIR_ASK: Record<SkinId, (a: string, b: string) => string> = {
  race: (a, b) => `Who finished sooner, ${a} or ${b}?`,
  brooms: (a, b) => `Which wizard finished sooner, ${a} or ${b}?`,
  height: (a, b) => `Who is taller, ${a} or ${b}?`,
  dragons: (a, b) => `Which dragon has longer wings, ${a} or ${b}?`,
  line: (a, b) => `Who is closer to the front, ${a} or ${b}?`,
  robots: (a, b) => `Which robot is closer to the front, ${a} or ${b}?`,
  letters: (a, b) => `Which letter is further left, ${a} or ${b}?`,
};

/** "Who is taller, Cal or Ava?": a name when every order that fits agrees, else Can't tell. */
export function compareMark(b: LineBoard, x: string, y: string, id: string): DrillMark {
  const skin = SKINS[b.skin];
  const fit = boardFits(b);
  const texts = boardTexts(b);
  const [X, Y] = [boardName(x), boardName(y)];
  const xFirst = fit.filter((p) => p.indexOf(x) < p.indexOf(y));
  const yFirst = fit.filter((p) => p.indexOf(y) < p.indexOf(x));
  const answer = !yFirst.length ? x : !xFirst.length ? y : CANT;
  const why: Record<string, string> = {};
  if (answer === CANT) {
    // Can't tell means no chain of clues runs between the two either way: one that did would decide it.
    const close = b.clues.some((c) => mentions(c, x) && mentions(c, y)) ? 'So you can’t tell.' : `No clue, and no chain of clues, links ${X} and ${Y}.`;
    why[x] = `In ${boardLine(b, xFirst[0])}, ${skin.before(X, Y)}. But in ${boardLine(b, yFirst[0])}, ${skin.before(Y, X)}. ${close}`;
    why[y] = `In ${boardLine(b, yFirst[0])}, ${skin.before(Y, X)}. But in ${boardLine(b, xFirst[0])}, ${skin.before(X, Y)}. ${close}`;
  } else {
    const [w, l] = answer === x ? [x, y] : [y, x];
    const path = chainPath(b.ids, b.clues, w, l);
    const used = path ? [...new Set(path.map((e) => e.clue))] : [];
    const reason = !path
      ? `In every order that fits, ${skin.before(boardName(w), boardName(l))}.`
      : used.length === 1
        ? `The clue says ${quoteEnd(texts[used[0]])}`
        : `The clues say ${quoteList(used.map((i) => texts[i]))} So ${skin.before(boardName(w), boardName(l))}.`;
    why[l] = reason;
    why[CANT] = `You can tell. ${reason}`;
  }
  return { id, label: PAIR_ASK[b.skin](X, Y), options: [{ id: x, label: X }, { id: y, label: Y }, CANT_TELL], answer, why };
}

/** "Ava, then Ben, then Cal. So Ava is taller than Cal too." */
function placeNote(b: LineBoard, order: readonly string[]): string {
  const skin = SKINS[b.skin];
  const line = `${order.map(boardName).join(', then ')}.`;
  const [f, l] = [order[0], order[order.length - 1]];
  const chain = b.clues.every((c) => c.t === 'before') && !b.clues.some((c) => clueKey(c) === `before:${f},${l}`);
  return chain ? `${line} So ${skin.before(boardName(f), boardName(l))} too.` : `${line} Every clue is true for this line.`;
}

/** Place everyone: one mark per spot, with a name in each. The board's clues must leave exactly one order. */
export function placeRow(b: LineBoard, o: BoardRowOpts & { label: string }): DrillRow {
  const skin = SKINS[b.skin];
  const n = b.ids.length;
  const fit = boardFits(b);
  if (fit.length !== 1) throw new Error('placeRow: the clues must leave exactly one order');
  const order = fit[0];
  const texts = boardTexts(b);
  const marks: DrillMark[] = order.map((who, i) => {
    const spot = skin.spot(i + 1, n, true);
    const why: Record<string, string> = {};
    for (const x of b.ids) {
      if (x === who) continue;
      const X = boardName(x);
      const test = (p: string[]) => p[i] === x;
      why[x] = killers(b.ids, b.clues, test).length === 1
        ? ruledOut(b, test, say(skin, 'is', X, spot), say(skin, 'cant', X, spot))
        : `${cap(say(skin, 'is', X, skin.spot(order.indexOf(x) + 1, n, true)))}, not ${spot}. The clues say ${quoteList(texts)}`;
    }
    return { id: `${o.id}-${i + 1}`, label: cap(spot), options: b.ids.map((x) => ({ id: x, label: boardName(x) })), answer: who, ...(o.given ? { given: true } : {}), why };
  });
  return { id: o.id, label: o.label, marks, note: placeNote(b, order) };
}

/** Must, might or can't a sentence be true, over every order that fits the board's clues. */
export function statusMark(b: LineBoard, stmt: LineClue, id: string): DrillMark {
  const skin = SKINS[b.skin];
  const fit = boardFits(b);
  const text = clueText(skin, stmt, b.ids.length, boardName);
  const status = statusOf(fit, stmt);
  const yes = fit.filter((p) => clueHolds(stmt, p));
  const no = fit.filter((p) => !clueHolds(stmt, p));
  const every = fit.length === 1 ? 'the only order that fits' : fit.length === 2 ? 'each of the two orders that fit' : `all ${numWord(fit.length)} orders that fit`;
  const q = quote(text);
  const why: Record<string, string> = {};
  if (status === 'must') {
    why.might = `${q} is true in ${every}. It is never false, so it must be true.`;
    why.cant = `${q} is true in ${every}. So it must be true.`;
  } else if (status === 'cant') {
    why.must = `${q} is false in ${every}. So it can’t be true.`;
    why.might = `${q} is false in ${every}. It is never true, so it can’t be true.`;
  } else {
    const gap = stmt.t === 'rightBefore' && clueHolds({ t: 'before', a: stmt.a, b: stmt.b }, no[0]) ? ` ${betweenFact(skin, no[0], stmt.a, stmt.b)}` : '';
    // A board with one clue says "the clue", not "every clue".
    const allTrue = b.clues.length === 1 ? 'the clue is true' : 'every clue is true';
    why.must = `In ${boardLine(b, no[0])}, ${allTrue}, but ${q} is false.${gap} So it does not have to be true.`;
    why.cant = `In ${boardLine(b, yes[0])}, ${allTrue}, and ${q} is true too. So it can be true.`;
  }
  return { id, label: quoteEnd(text), options: STATUS_CHOICES, answer: status, why };
}

/** Sentences to judge over every order that fits: must, might or can't. */
export function statusRow(b: LineBoard, stmts: readonly LineClue[], o: { id: string }): DrillRow {
  const n = boardFits(b).length;
  return {
    id: o.id,
    label: `${cap(numWord(n))} ${n === 1 ? 'order fits' : 'orders fit'} the ${b.clues.length === 1 ? 'clue' : 'clues'}. Is each sentence true in all of them, in some, or in none?`,
    marks: stmts.map((s, i) => statusMark(b, s, `${o.id}-${i + 1}`)),
  };
}

const orderId = (p: readonly string[]) => `o-${p.join('-')}`;

/** For each clue: the other order that fits once it is covered, or null when none does. */
function coverAlts(b: LineBoard): (string[] | null)[] {
  const fit = boardFits(b);
  if (fit.length !== 1) throw new Error('coverRow: the clues must leave exactly one order');
  return b.clues.map((_, i) => {
    const alts = fits(b.ids, b.clues.filter((_, j) => j !== i)).filter((p) => p.join() !== fit[0].join());
    if (alts.length > 1) throw new Error('coverRow: more than one other order fits');
    return alts[0] ?? null;
  });
}

/** Cover up one clue: which other order fits the rest (if any), and is the clue needed? */
export function coverRow(b: LineBoard, i: number, o: BoardRowOpts): DrillRow {
  const texts = boardTexts(b);
  const only = boardFits(b)[0];
  const alts = coverAlts(b);
  const alt = alts[i];
  const k = i + 1;
  const g = o.given ? { given: true } : {};
  const listed = alts.filter((p): p is string[] => !!p).filter((p, j, all) => all.findIndex((q) => q.join() === p.join()) === j);
  const options: DrillOption[] = [...listed.map((p) => ({ id: orderId(p), label: p.map(boardName).join(', ') })), { id: 'none', label: 'No other order' }];
  const answer = alt ? orderId(alt) : 'none';
  const why: Record<string, string> = {};
  for (const opt of options) {
    if (opt.id === answer) continue;
    if (opt.id === 'none') {
      why.none = `With clue ${k} covered, ${boardLine(b, alt!)} fits too. Every other clue is true there.`;
    } else {
      const p = listed.find((q) => orderId(q) === opt.id)!;
      const br = b.clues.flatMap((c, j) => (j !== i && !clueHolds(c, p) ? [j] : []));
      why[opt.id] = `With clue ${k} covered, ${boardLine(b, p)} still makes ${clueNums(br)} false.`;
    }
  }
  return {
    id: o.id,
    label: `Cover up clue ${k}: ${quoteEnd(texts[i])}`,
    marks: [
      { id: `${o.id}-other`, label: 'Which other order fits the other clues?', options, answer, ...g, why },
      {
        id: `${o.id}-need`,
        label: `Is clue ${k} needed?`,
        options: NEEDED,
        answer: alt ? 'yes' : 'no',
        ...g,
        why: alt
          ? { no: `Without clue ${k}, ${boardLine(b, alt)} fits too. So clue ${k} is needed.` }
          : { yes: `Without clue ${k}, only ${boardLine(b, only)} still fits. So clue ${k} is not needed.` },
      },
    ],
    note: alt ? `With clue ${k} covered, ${boardLine(b, alt)} fits too. So clue ${k} is needed.` : `With clue ${k} covered, only ${boardLine(b, only)} still fits. So clue ${k} is not needed.`,
  };
}
