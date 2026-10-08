/**
 * Ring 2, place 3 · Clock Tower (s15.l3, Track 1). A cycle is counted two ways, and every item says which:
 *  - item positions: the first item is position 1, and item n sits at place ((n take away 1) mod k) plus 1 of the
 *    block. On screen: "take one away, find the remainder, add one". So position 40 of A, B, C, D is D.
 *  - elapsed steps: the start is step 0, and n steps on sits at (start plus n) mod k. A remainder of 0 means the same
 *    item. So 21 days after Thursday is Thursday.
 *
 * Every answer comes from those two formulas; the tests check each against a walk that steps through the cycle one
 * item at a time, and cover the exact multiples and the edges (n = k, k plus 1, 2k, and a zero remainder).
 */
import type { ChooseItem, DrillMark, DrillStep, ErrorTag, IdeaCard, NumberItem, Phase, Rng, TeachCase, Thing } from '../../types';
import type { ClockScene } from '../../scenes/clock';
import { chooseItem, count, givenMark, numberItem, type Level, type WrongChoice, type WrongNumber } from './growth';

// ======================================================================================================
// Counting
// ======================================================================================================

/** Position counting: the place (1 to k) of item n in its block. Take one away, find the remainder, add one. */
export const placeOf = (n: number, k: number) => ((n - 1) % k) + 1;
/** The item at position n (the first item is position 1). */
export const itemAtPosition = <T,>(cycle: readonly T[], n: number): T => cycle[placeOf(n, cycle.length) - 1];
/** Elapsed counting: the item n steps after the item at index `start` (the start is step 0). */
export const itemAfter = <T,>(cycle: readonly T[], start: number, n: number): T => cycle[(start + n) % cycle.length];

/** The same answers by walking the cycle one item at a time (a second method, for the tests). */
export function walkPosition<T>(cycle: readonly T[], n: number): T {
  let i = 0;
  for (let p = 1; p < n; p++) i = (i + 1) % cycle.length;
  return cycle[i];
}
export function walkElapsed<T>(cycle: readonly T[], start: number, n: number): T {
  let i = start;
  for (let s = 0; s < n; s++) i = (i + 1) % cycle.length;
  return cycle[i];
}

/** How many times the item at index j shows up in positions 1 to N. */
export const countIn = (k: number, j: number, N: number) => (N >= j + 1 ? Math.floor((N - (j + 1)) / k) + 1 : 0);

/** The last digit of base times itself n times (base, base times base, …): walked one multiplication at a time. */
export function lastDigit(base: number, n: number): number {
  let d = 1;
  for (let i = 0; i < n; i++) d = (d * base) % 10;
  return d;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const SEASONS = ['spring', 'summer', 'fall', 'winter'] as const;

/** The chains a position item can repeat. Every item in a chain is different, so each answer is one card. */
export const CHAINS = [
  { id: 'abc', items: ['A', 'B', 'C'], what: 'letters' },
  { id: 'abcd', items: ['A', 'B', 'C', 'D'], what: 'letters' },
  { id: 'shapes', items: ['circle', 'square', 'triangle'], what: 'shapes' },
  { id: 'colors', items: ['red', 'blue', 'yellow', 'green'], what: 'colors' },
] as const;
export type Chain = (typeof CHAINS)[number];

/** Desk rotas for the transfer item (names repeat inside a block, as in A, B, B). */
export const ROTAS = [['Ava', 'Ben', 'Ben'], ['Kim', 'Kim', 'Leo'], ['Max', 'Ana', 'Max', 'Sam']] as const;

const list = (xs: readonly string[]) => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const idOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
/** "the circle" / "A" / "red": how a chain item reads in a sentence. */
const named = (s: string, what: string) => (what === 'shapes' ? `the ${s}` : s);

/** Take one away, find the remainder, add one, as a sentence with the numbers. */
export function positionWords(n: number, k: number, answer: string): string {
  return `Take one away: ${n - 1}. Blocks of ${k} leave ${(n - 1) % k} over. Add one: place ${placeOf(n, k)}, which is ${answer}.`;
}

/** The positions an item sits at, as words: "1, 5, 9 and so on". */
const positionsOf = (place: number, k: number) => `${place}, ${place + k}, ${place + 2 * k} and so on`;

// ======================================================================================================
// Items
// ======================================================================================================

const L3 = 's15.l3';
const POSITION_TERMS = (k: number, items: readonly string[]) => [
  { word: 'A position', meaning: 'where an item sits in the chain. The first item is position 1.' },
  { word: 'A block', meaning: `one run of the repeating items: ${list([...items])}. It has ${k} items.` },
  { word: 'A remainder', meaning: 'what is left over after you make as many whole groups as you can.' },
];

/** Feedback for a wrong item at a position, naming the exact slip: a zero remainder, steps for positions, one off. */
function positionWrongs(items: readonly string[], n: number, what: string, labelOf: (s: string) => string = (s) => s): WrongChoice[] {
  const k = items.length;
  const ans = itemAtPosition(items, n);
  const first = items[0];
  const elapsedReading = items[n % k];
  const out: WrongChoice[] = [];
  const unique = [...new Set(items)];
  for (const w of unique) {
    if (w === ans) continue;
    const W = cap(named(w, what));
    const places = items.map((x, i) => (x === w ? i + 1 : 0)).filter(Boolean);
    let tag: ErrorTag | undefined;
    let fb;
    if (n % k === 0 && w === first) {
      tag = 'zero-remainder';
      fb = { headline: `${W} starts a block, but position ${n} ends one.`, detail: [`The first item is position 1. Blocks of ${k} end at positions ${k}, ${2 * k}, ${3 * k} and so on.`, `${n} is ${n / k} times ${k}, so position ${n} is the last item of block ${n / k}: ${named(ans, what)}.`] };
    } else if (w === elapsedReading) {
      tag = 'elapsed-vs-position';
      fb = { headline: `${W} is ${n} steps after ${named(first, what)}, not position ${n}.`, detail: [`Positions start at 1, not 0. Position 1 is ${named(first, what)}, so position ${n} is ${n - 1} steps after it.`, positionWords(n, k, named(ans, what))] };
    } else if (w === itemAtPosition(items, n - 1) || w === itemAtPosition(items, n + 1)) {
      const before = w === itemAtPosition(items, n - 1);
      tag = 'off-by-one';
      fb = { headline: `${W} is at position ${before ? n - 1 : n + 1}, one ${before ? 'short' : 'too far'}.`, detail: [positionWords(n, k, named(ans, what))] };
    } else {
      fb = { headline: `${W} sits at positions ${places.map((p) => positionsOf(p, k)).join(', and ')}, not at ${n}.`, detail: [positionWords(n, k, named(ans, what))] };
    }
    out.push({ id: idOf(w), label: labelOf(w), fb, tag });
  }
  return out;
}

/** The edge cases of a block, worked: n = k ends block 1, k plus 1 starts block 2, 2k ends block 2. */
function edgeCases(items: readonly string[], what: string): TeachCase[] {
  const k = items.length;
  return [k, k + 1, 2 * k].map((n) => ({
    label: `Position ${n}: take one away, ${n - 1}. Blocks of ${k} leave ${(n - 1) % k} over. Add one: place ${placeOf(n, k)}.`,
    note: `${cap(named(itemAtPosition(items, n), what))}. ${n % k === 0 ? `Position ${n} ends block ${n / k}.` : `Position ${n} starts block ${Math.ceil(n / k)}.`}`,
  }));
}

/**
 * Do: the item at position n of a chain. `framed`: the faded example ("99 is 33 times 3, so position 100 starts a
 * new cycle: the item is ___."), which needs n take away 1 to be a whole number of blocks. A position on an exact
 * multiple of the block carries the trap tag (a zero remainder is the last item, not the first).
 */
export function positionItem(chain: Chain, n: number, rng: Rng | undefined, o: { framed?: boolean; phase?: Phase; level?: Level; conflict?: boolean } = {}): ChooseItem {
  const items = chain.items as readonly string[];
  const k = items.length;
  if (o.framed && (n - 1) % k !== 0) throw new Error('positionItem: a framed item needs n take away 1 to fill whole blocks');
  const ans = itemAtPosition(items, n);
  const zero = n % k === 0;
  const twinN = n === 2 * k + 1 ? 2 * k + 2 : 2 * k + 1;
  return chooseItem(
    {
      lesson: L3,
      tag: 'cycle-position',
      prompt: `A chain repeats ${list([...items])}, over and over. Count item positions: the first item is position 1. ${o.framed ? `Fill in the blank for position ${n}.` : `Which item is at position ${n}?`}`,
      scene: { kind: 'clock', cycle: [...items], counting: 'position', n },
      frame: o.framed ? `${n - 1} is ${(n - 1) / k} times ${k}, so position ${n} starts a new cycle: the item is ___.` : undefined,
      explain: zero
        ? `${n} is ${n / k} times ${k}, so position ${n} ends block ${n / k}. It is the last item: ${named(ans, chain.what)}. ${positionWords(n, k, named(ans, chain.what))}`
        : positionWords(n, k, named(ans, chain.what)),
      teach: {
        rule: `The chain is made by repeating ${list([...items])}. For a position, take one away, find the remainder after blocks of ${k}, then add one. That gives the place in the block.`,
        terms: POSITION_TERMS(k, items),
        casesTitle: 'Check the edges of a block',
        cases: edgeCases(items, chain.what),
        remember: ['Take one away, find the remainder, add one.', 'Ask: am I counting positions from 1, or steps from 0?'],
        simpler: [`Positions 1 to ${k} are ${list([...items])}.`, `Position ${k + 1} starts again with ${named(items[0], chain.what)}.`, `So the block starts over every ${k} positions. ${positionWords(n, k, named(ans, chain.what))}`],
      },
      hints: [`How long is the repeating block?`, `Take one away from ${n}. How many are left over after whole blocks of ${k}?`, 'Add one to the left-over number. That is the place in the block.'],
      hintCase: { label: `A worked twin: position ${twinN}.`, note: positionWords(twinN, k, named(itemAtPosition(items, twinN), chain.what)) },
      phase: o.phase ?? 'do',
      level: o.level ?? 3,
      tags: zero && !o.framed ? ['zero-remainder'] : undefined,
      conflict: o.conflict ?? (zero && !o.framed),
      meta: {
        skill: 'Track 1 · a far position in a cycle',
        rule: `repeat ${items.join(', ')}; the first item is position 1`,
        task: o.framed ? 'fill a faded frame for a far position' : 'predict an item by its position',
        representation: chain.what,
        difficulty: zero ? 4 : 3,
        twin: `cycle-position-${chain.id}`,
      },
    },
    { id: idOf(ans), label: ans },
    positionWrongs(items, n, chain.what),
    rng,
  );
}

/** Elapsed contexts: the week (days) and the seasons. */
export type ElapsedKind = 'days' | 'seasons';
const CYCLE_OF = { days: WEEKDAYS, seasons: SEASONS } as const;
const STEP_WORD = { days: ['day', 'days'], seasons: ['season', 'seasons'] } as const;
const BLOCK_WORD = { days: 'weeks of 7', seasons: 'years of 4 seasons' } as const;

/** The choices an elapsed item offers: the answer, the position reading, one day on, the start, then others, at most 5. */
function elapsedChoices(cycle: readonly string[], start: number, n: number): string[] {
  const k = cycle.length;
  const want = [itemAfter(cycle, start, n), itemAfter(cycle, start, n - 1), itemAfter(cycle, start, n + 1), cycle[start], itemAfter(cycle, start, n + 2), itemAfter(cycle, start, n - 2)];
  return [...new Set(want)].slice(0, Math.min(5, k));
}

/**
 * Do: n days (or seasons) after a start. The start is step 0, so a whole number of weeks lands on the start again (a
 * zero remainder, the trap tag). The day before the answer counts the start as day 1 (elapsed-vs-position).
 */
export function elapsedItem(kind: ElapsedKind, start: number, n: number, rng: Rng | undefined, o: { phase?: Phase; level?: Level } = {}): ChooseItem {
  const cycle = CYCLE_OF[kind] as readonly string[];
  const k = cycle.length;
  const [one, many] = STEP_WORD[kind];
  const s = cycle[start];
  const ans = itemAfter(cycle, start, n);
  const r = n % k, q = Math.floor(n / k);
  const moveWords = r === 0 ? `${n} is ${q} times ${k}: ${count(q, kind === 'days' ? 'full week' : 'full year', kind === 'days' ? 'full weeks' : 'full years')}. That lands on ${s} again.` : `${n} ${many} is ${q > 0 ? `${count(q, kind === 'days' ? 'week' : 'year', kind === 'days' ? 'weeks' : 'years')} and ` : ''}${count(r, one, many)}. Move ${r} on from ${s}: ${ans}.`;
  const prompt = kind === 'days'
    ? `Count elapsed days: today, ${s}, is day 0. What day is it ${n} days from today?`
    : `It is ${s} now. Count elapsed seasons: now is step 0. Which season is it ${n} seasons from now?`;
  const wrong: WrongChoice[] = elapsedChoices(cycle, start, n).filter((w) => w !== ans).map((w) => {
    const d = (cycle.indexOf(w) - start + k) % k;
    const W = cap(w);
    if (w === itemAfter(cycle, start, n - 1)) {
      const headline = w === s ? `${W} would fit if ${s} were ${one} 1, but ${s} is ${one} 0.` : `${W} counts ${s} as ${one} 1, but ${s} is ${one} 0.`;
      return { id: idOf(w), label: W, tag: 'elapsed-vs-position' as const, fb: { headline, detail: [`Elapsed ${many} start at 0: ${s} is ${one} 0, and the next ${one} is ${one} 1.`, moveWords] } };
    }
    if (w === itemAfter(cycle, start, n + 1)) {
      return { id: idOf(w), label: W, tag: 'off-by-one' as const, fb: { headline: `${W} is ${n + 1} ${many} from ${s}, one ${one} too far.`, detail: [moveWords] } };
    }
    if (w === s) {
      return { id: idOf(w), label: W, fb: { headline: `${W} is where you started, but ${n} is not a whole number of ${BLOCK_WORD[kind]}.`, detail: [moveWords] } };
    }
    return { id: idOf(w), label: W, fb: { headline: `${W} is ${count(d, one, many)} on from ${s}, or that plus whole ${kind === 'days' ? 'weeks' : 'years'}. ${n} is not.`, detail: [moveWords] } };
  });
  return chooseItem(
    {
      lesson: L3,
      tag: 'cycle-elapsed',
      prompt,
      scene: { kind: 'clock', cycle: [...cycle].map(cap), counting: 'elapsed', start: cap(s), n, unit: many },
      explain: `${cap(s)} is ${one} 0. ${moveWords}`,
      teach: {
        rule: `For elapsed ${many}, the start is ${one} 0. Find the remainder after ${BLOCK_WORD[kind]}, then move that many on. A remainder of 0 means the same ${one}.`,
        terms: [
          { word: `Elapsed ${many}`, meaning: `the ${many} that pass. The start is ${one} 0.` },
          { word: 'A remainder', meaning: 'what is left over after you make as many whole groups as you can.' },
        ],
        casesTitle: 'Check the edges',
        cases: [k, k + 1, 2 * k].map((m) => ({ label: `${m} ${many} after ${s}.`, note: `${cap(itemAfter(cycle, start, m))}. ${m % k === 0 ? `That is ${m / k} full ${kind === 'days' ? (m / k === 1 ? 'week' : 'weeks') : m / k === 1 ? 'year' : 'years'}, so it is the start again.` : `One past a full ${kind === 'days' ? 'week' : 'year'}.`}` })),
        remember: ['Elapsed: the start is 0. Positions: the first is 1.', `Ask: is the start ${one} 0 or ${one} 1?`],
        simpler: [`${cap(s)} is ${one} 0.`, `${k} ${many} later it is ${s} again.`, moveWords],
      },
      hints: [`Is ${s} ${one} 0 or ${one} 1 here?`, `How many whole ${BLOCK_WORD[kind]} fit in ${n}? What is left over?`, `Move the left-over number of ${many} on from ${s}.`],
      hintCase: { label: `A worked twin: ${k + 2} ${many} after ${s}.`, note: `1 full ${kind === 'days' ? 'week' : 'year'} and 2 more: ${itemAfter(cycle, start, k + 2)}.` },
      phase: o.phase ?? 'do',
      level: o.level ?? 3,
      tags: r === 0 ? ['zero-remainder'] : undefined,
      conflict: r === 0,
      meta: {
        skill: 'Track 1 · elapsed steps in a cycle',
        rule: `${kind === 'days' ? 'the week repeats Monday to Sunday' : 'the seasons repeat spring, summer, fall, winter'}; ${s} is step 0`,
        task: 'find the item after n elapsed steps',
        representation: kind === 'days' ? 'weekdays' : 'seasons',
        difficulty: r === 0 ? 4 : 3,
        twin: `cycle-elapsed-${kind}`,
      },
    },
    { id: idOf(ans), label: cap(ans) },
    wrong,
    rng,
  );
}

/** Do (counts on the pad): how many times the item at index j shows up in the first N positions. */
export function countItem(chain: Chain, j: number, N: number, o: { phase?: Phase; level?: Level } = {}): NumberItem {
  const items = chain.items as readonly string[];
  const k = items.length;
  const t = items[j];
  const ans = countIn(k, j, N);
  const last = j + 1 + (ans - 1) * k;
  const T = named(t, chain.what);
  // The hint's worked twin is never the asked count.
  const tw = N === 2 * k ? 3 * k : 2 * k;
  const wrong: WrongNumber[] = [
    { value: ans + 1, tag: 'off-by-one', fb: { headline: `${ans + 1} counts one ${t} too many.`, detail: [`${cap(T)} sits at positions ${positionsOf(j + 1, k)}: every ${k}.`, `The last one up to ${N} is at position ${last}. The next is at ${last + k}, past ${N}. So there are ${ans}.`] } },
    { value: ans - 1, tag: 'off-by-one', fb: { headline: `${ans - 1} misses one ${t}.`, detail: [`The first ${t} is at position ${j + 1}, and then every ${k} positions.`, `Positions ${j + 1} to ${last}, in steps of ${k}, make ${ans}.`] } },
  ];
  return numberItem(
    {
      lesson: L3,
      tag: 'cycle-count',
      prompt: `A chain repeats ${list([...items])}, over and over. Count item positions: the first item is position 1. How many times does ${T} show up in the first ${N} items?`,
      scene: { kind: 'clock', cycle: [...items], counting: 'position', n: N },
      explain: `${cap(T)} is at positions ${positionsOf(j + 1, k)}. The last one up to ${N} is at ${last}. That makes ${ans}.`,
      teach: {
        rule: `${cap(T)} shows up once in every block of ${k}, at place ${j + 1}. Count the blocks that reach place ${j + 1} by position ${N}.`,
        terms: POSITION_TERMS(k, items),
        casesTitle: 'Count in small chains first',
        cases: [k, k + j + 1, 2 * k].map((m) => ({ label: `The first ${m} items.`, note: `${cap(T)} shows up ${countIn(k, j, m) === 1 ? 'once' : `${countIn(k, j, m)} times`}.` })),
        remember: ['Count whole blocks, then check the part block at the end.', `Ask: does the last part block reach ${T}?`],
        simpler: [`Blocks of ${k}: ${list([...items])}.`, `${cap(T)} is at place ${j + 1} of each block.`, `Positions ${j + 1}, ${j + 1 + k} and so on, up to ${last}: ${ans} in all.`],
      },
      hints: [`Where is the first ${t}?`, `After that, ${T} comes every ${k} positions.`, `Find the last one at or before position ${N}.`],
      hintCase: { label: `A worked twin: the first ${tw} items.`, note: `${cap(T)} shows up ${countIn(k, j, tw) === 1 ? 'once' : `${countIn(k, j, tw)} times`}.` },
      phase: o.phase ?? 'do',
      level: o.level ?? 3,
      meta: { skill: 'Track 1 · counting in a cycle', rule: `repeat ${items.join(', ')}; the first item is position 1`, task: 'count an item in the first N positions', representation: chain.what, difficulty: 4, twin: `cycle-count-${chain.id}` },
    },
    ans,
    'times',
    wrong,
  );
}

/** Explain: why item mk of a k-block is the last item, but 7w days after a day is that day. */
export function cycleWhyItem(chain: Chain, m: number, day: number, w: number, rng?: Rng): ChooseItem {
  const items = chain.items as readonly string[];
  const k = items.length;
  const n = m * k;
  const ans = itemAtPosition(items, n);
  const d = WEEKDAYS[day];
  const before = itemAfter(WEEKDAYS, day, 7 * w - 1);
  return chooseItem(
    {
      lesson: L3,
      tag: 'cycle-why',
      prompt: `Item ${n} of ${list([...items])} repeating is ${named(ans, chain.what)}: the first item is position 1. But ${7 * w} days after ${d} is ${d}: ${d} is day 0. Why does one land on the last item and the other on the start?`,
      scene: { kind: 'clock', cycle: [...items], counting: 'position', n, pair: { cycle: [...WEEKDAYS], counting: 'elapsed', start: d, n: 7 * w, unit: 'days' } },
      explain: `Positions start at 1, so position ${n} is the end of block ${m}: ${named(ans, chain.what)}. Elapsed days start at 0, so ${7 * w} days is ${count(w, 'full week', 'full weeks')}, back to ${d}.`,
      teach: {
        rule: 'Positions start at 1, so a whole number of blocks ends on the last item. Elapsed steps start at 0, so a whole number of blocks lands on the start.',
        terms: [
          { word: 'A position', meaning: 'where an item sits. The first item is position 1.' },
          { word: 'Elapsed days', meaning: 'the days that pass. The start is day 0.' },
        ],
        casesTitle: 'One block, counted both ways',
        cases: [
          { label: `Position ${k} of ${list([...items])}.`, note: `${cap(named(items[k - 1], chain.what))}: the end of block 1.` },
          { label: `7 days after ${d}.`, note: `${d} again: one full week from day 0.` },
        ],
        remember: ['Positions: the first is 1. Elapsed: the start is 0.', 'Ask: which way is this question counting?'],
        simpler: [`Positions 1 to ${k} are ${list([...items])}. So position ${k} is the last item.`, `Day 0 is ${d}. Day 7 is ${d} again.`, 'The counts start in different places, so whole blocks land in different places.'],
      },
      hints: ['Where does each count start: at 1 or at 0?', `Position ${k} is which item? What is 7 days after ${d}?`, 'Whole blocks end on the last item when you start at 1, and on the start when you start at 0.'],
      hintCase: { label: `A worked twin: position ${k} and 7 days.`, note: `Position ${k} is ${named(items[k - 1], chain.what)}. 7 days after ${d} is ${d}.` },
      phase: 'explain',
      level: 3,
      rubric: 3,
      meta: {
        skill: 'Track 1 · explain position against elapsed counting',
        rule: `repeat ${items.join(', ')} with the first item at position 1; the week with ${d} as day 0`,
        task: 'choose why two whole-block counts land in different places',
        representation: `${chain.what} and weekdays`,
        difficulty: 4,
        rubric: '3 = compares the two ways of counting and says where each starts',
        twin: 'cycle-why',
      },
    },
    { id: 'kinds', label: `Positions start at 1, so ${n} ends a block on ${named(ans, chain.what)}. Days start at 0, so ${count(w, 'full week', 'full weeks')} land back on ${d}.` },
    [
      { id: 'zero', label: `Both leave 0 over, so both should be the first item. Item ${n} is ${named(items[0], chain.what)}.`, tag: 'zero-remainder', fb: { headline: 'With 0 left over, positions land on the last item. Days land on the start.', detail: [`Positions start at 1: position ${k} is ${named(items[k - 1], chain.what)}, so position ${n} is ${named(ans, chain.what)} too.`, `Elapsed days start at 0: ${7 * w} days after ${d} is ${d}.`] } },
      { id: 'from1', label: `Both count from 1, so ${7 * w} days after ${d} is ${before}.`, tag: 'elapsed-vs-position', fb: { headline: `${d} is day 0, not day 1.`, detail: ['Elapsed days start at 0. The day after the start is day 1.', `So ${7 * w} days is ${count(w, 'full week', 'full weeks')}: ${d} again, not ${before}.`] } },
      { id: 'luck', label: 'There is no reason: far items in a cycle can’t be worked out.', tag: 'unwarranted-certainty', fb: { headline: 'A cycle is made by repeating a block, so far items can be worked out.', detail: ['The block decides every item. Only the start of the count changes.', `Positions start at 1, days at 0. That is why the two land in different places.`] } },
    ],
    rng,
  );
}

/** Transfer: a desk rota (A, B, B repeating); the slot at a position. */
export function deskItem(rota: readonly string[], n: number, rng?: Rng): ChooseItem {
  const k = rota.length;
  const ans = itemAtPosition(rota, n);
  return chooseItem(
    {
      lesson: L3,
      tag: 'cycle-transfer',
      prompt: `The reading desk has a rota: ${list([...rota])}, then it repeats. Count slots as positions: the first slot is position 1. Whose turn is slot ${n}?`,
      scene: { kind: 'clock', cycle: [...rota], counting: 'position', n, unit: 'slots' },
      explain: `${positionWords(n, k, ans)}${n % k === 0 ? ` Slot ${n} ends block ${n / k}.` : ''}`,
      teach: {
        rule: `The rota is a block of ${k} slots that repeats. For a slot, take one away, find the remainder after blocks of ${k}, then add one.`,
        terms: POSITION_TERMS(k, rota),
        casesTitle: 'Check the edges of a block',
        cases: edgeCases(rota, 'names'),
        remember: ['Take one away, find the remainder, add one.', 'Ask: is slot 1 the first slot?'],
        simpler: [`Slots 1 to ${k}: ${list([...rota])}.`, `Slot ${k + 1} starts again with ${rota[0]}.`, positionWords(n, k, ans)],
      },
      hints: ['How many slots are in one block of the rota?', `Take one away from ${n}. What is left over after whole blocks?`, 'Add one: that is the slot in the block.'],
      hintCase: { label: `A worked twin: slot ${k + 1}.`, note: positionWords(k + 1, k, rota[0]) },
      phase: 'transfer',
      level: 3,
      tags: n % k === 0 ? ['zero-remainder'] : undefined,
      meta: { skill: 'Track 1 · a cycle in a new setting', rule: `repeat ${rota.join(', ')}; the first slot is position 1`, task: 'find whose turn a far slot is', representation: 'a desk rota', difficulty: 3, twin: 'cycle-desk' },
    },
    { id: idOf(ans), label: ans },
    positionWrongs(rota, n, 'names'),
    rng,
  );
}

/** Transfer (L3): the last digits of base, base times base, … repeat in a block of 4. */
export function digitsItem(base: 2 | 3 | 7, n: number, rng?: Rng): ChooseItem {
  const cycle = [1, 2, 3, 4].map((i) => String(lastDigit(base, i)));
  const ans = itemAtPosition(cycle, n);
  if (ans !== String(lastDigit(base, n))) throw new Error('digitsItem: the cycle does not match the walk');
  const shown = [1, 2, 3].map((i) => base ** i);
  return chooseItem(
    {
      lesson: L3,
      tag: 'cycle-transfer',
      prompt: `Start at ${base} and keep multiplying by ${base}: ${shown.join(', ')} and so on. The last digits go ${list(cycle)}, then repeat. Count positions: the first number is position 1. What is the last digit of number ${n}?`,
      scene: { kind: 'clock', cycle, counting: 'position', n },
      explain: `The last digits repeat in a block of 4. ${positionWords(n, 4, ans)}`,
      teach: {
        rule: 'Only the last digit decides the next last digit, so the last digits repeat in a block. Then count positions in that block.',
        terms: [{ word: 'The last digit', meaning: 'the ones digit, at the right end of a number.' }, ...POSITION_TERMS(4, cycle).slice(1)],
        casesTitle: 'Check the edges of a block',
        cases: edgeCases(cycle, 'digits'),
        remember: ['Find the block, then take one away, find the remainder, add one.', 'Ask: is the first number position 1?'],
        simpler: [`Numbers 1 to 4 end in ${list(cycle)}.`, `Number 5 ends in ${cycle[0]} again.`, positionWords(n, 4, ans)],
      },
      hints: ['How long is the block of last digits?', `Take one away from ${n}. What is left over after blocks of 4?`, 'Add one: that is the place in the block.'],
      hintCase: { label: 'A worked twin: number 5.', note: positionWords(5, 4, cycle[0]) },
      phase: 'transfer',
      level: 3,
      meta: { skill: 'Track 1 · a cycle in a new setting', rule: `last digits of ${base} multiplied again and again repeat ${cycle.join(', ')}; the first number is position 1`, task: 'find a far last digit', representation: 'last digits of numbers', difficulty: 5, twin: 'cycle-digits' },
    },
    { id: `d${ans}`, label: ans },
    positionWrongs(cycle, n, 'digits').map((w) => ({ ...w, id: `d${w.label}` })),
    rng,
  );
}

// ---------- the grouping primer ----------

/** Primer: whole groups of k in N, or the left-over. */
export function groupsItem(N: number, k: number, ask: 'groups' | 'left'): NumberItem {
  const q = Math.floor(N / k), r = N % k;
  const things: Thing[] = Array.from({ length: N }, (_, i) => ({ id: `c${i + 1}`, shape: 'circle', color: 'yellow', size: 'small' }));
  const ans = ask === 'groups' ? q : r;
  const left = `${r} ${r === 1 ? 'is' : 'are'} left`;
  const wrong: WrongNumber[] = ask === 'groups'
    ? [
        r === 0
          ? { value: q + 1, tag: 'off-by-one', fb: { headline: `${q + 1} is one group too many: ${N} fills exactly ${q} groups.`, detail: [`${q} groups of ${k} use all ${N} counters, with 0 left over.`, `So there are ${q} whole groups.`] } }
          : { value: q + 1, tag: 'off-by-one', fb: { headline: `${q + 1} counts the part group too, but it is not whole.`, detail: [`${q} groups of ${k} use ${q * k} counters. ${cap(left)}, fewer than ${k}.`, `So there are ${q} whole groups.`] } },
        { value: r, fb: { headline: `${r} is the left-over, not the number of groups.`, detail: [`${q} groups of ${k} make ${q * k}, and ${left} over.`] } },
      ]
    : [
        { value: q, fb: { headline: `${q} is the number of whole groups, not the left-over.`, detail: [`${q} groups of ${k} use ${q * k} counters.`, `${N} take away ${q * k} leaves ${r}.`] } },
        r === 0
          ? { value: k, fb: { headline: `${k} is the size of one group, not the left-over.`, detail: [`${N} fills exactly ${q} groups of ${k}.`, `${N} take away ${q * k} leaves 0.`] } }
          : { value: k - r, fb: { headline: `${k - r} is how many more would fill one more group.`, detail: [`The left-over is what is already there: ${N} take away ${q * k} is ${r}.`] } },
      ];
  // The hint's worked twin is never the item itself.
  const tw = N === 2 * k + 1 ? 2 * k + 2 : 2 * k + 1;
  return numberItem(
    {
      lesson: L3,
      tag: 'groups',
      prompt: `Put ${N} counters into groups of ${k}. ${ask === 'groups' ? 'How many whole groups can you make?' : 'How many counters are left over?'}`,
      scene: { kind: 'things', things },
      explain: `${q} groups of ${k} use ${q * k} counters, and ${N} take away ${q * k} leaves ${r}. So ${ask === 'groups' ? `there are ${q} whole groups` : `${r} ${r === 1 ? 'is' : 'are'} left over`}.`,
      teach: {
        rule: 'Make as many whole groups as you can. What is left, fewer than one group, is the left-over.',
        terms: [{ word: 'A whole group', meaning: `a group with all ${k} in it.` }, { word: 'The left-over', meaning: 'what is left when no more whole groups fit. It is also called the remainder.' }],
        cases: [{ label: `${k} counters in groups of ${k}.`, note: '1 whole group, 0 left over.' }, { label: `${k + 1} counters in groups of ${k}.`, note: '1 whole group, 1 left over.' }],
        remember: ['Whole groups first, then count what is left.'],
        simpler: [`Count up in ${k}s: ${Array.from({ length: q }, (_, i) => (i + 1) * k).join(', ') || '0'}.`, `${q * k} is the last one at or under ${N}. That is ${count(q, 'group', 'groups')}.`, `${N} take away ${q * k} is ${r}.`],
      },
      hints: [`Count up in ${k}s until the next one would pass ${N}.`, ask === 'groups' ? 'How many jumps of that size did you make?' : `What is ${N} take away the last count?`],
      hintCase: { label: `A worked twin: ${tw} counters in groups of ${k}.`, note: `2 whole groups, ${tw - 2 * k} left over.` },
      phase: 'do',
      level: 1,
      meta: { skill: 'Track 1 · grouping by k', rule: `${N} in groups of ${k}`, task: ask === 'groups' ? 'count whole groups' : 'find the left-over', representation: 'counters', difficulty: 1, twin: `groups-${ask}` },
    },
    ans,
    ask === 'groups' ? 'groups' : 'left over',
    wrong,
  );
}

// ======================================================================================================
// See (key-idea cards) and Do (guided boards)
// ======================================================================================================

const ABCD = ['A', 'B', 'C', 'D'];

/** Card 1: positions in A, B, C, D, then item 40. */
export const CLOCK_POSITION: ClockScene = {
  kind: 'clock',
  cycle: ABCD,
  counting: 'position',
  n: 40,
  highlight: 3,
  captions: ABCD.map((x, i) => `${x}: positions ${positionsOf(i + 1, 4)}`),
  steps: [
    { label: 'Number the items', say: 'The first item is position 1. A is 1, B is 2, C is 3 and D is 4.' },
    { label: 'Find the block ends', say: 'Every block of 4 ends on D: positions 4, 8, 12 and so on.' },
    { label: 'Jump to 40', say: '40 is 10 times 4, so position 40 ends block 10.' },
    { label: 'Read it', say: 'So item 40 is D. Check: take one away, 39. Blocks of 4 leave 3 over. Add one: place 4, D.' },
  ],
};

/** Card 2: elapsed days from Thursday, then 21 days on. */
export const CLOCK_DAYS: ClockScene = {
  kind: 'clock',
  cycle: [...WEEKDAYS],
  counting: 'elapsed',
  start: 'Thursday',
  n: 21,
  highlight: 3,
  unit: 'days',
  steps: [
    { label: 'Start the count', say: 'Today is Thursday. Today is day 0, not day 1.' },
    { label: 'One week', say: '7 days after Thursday is Thursday again.' },
    { label: 'Three weeks', say: '21 is 3 times 7: three full weeks.' },
    { label: 'Read it', say: 'So 21 days after Thursday is Thursday. A remainder of 0 means the same day.' },
  ],
};

/** Card 3: the two ways side by side. */
export const CLOCK_PAIR: ClockScene = {
  kind: 'clock',
  cycle: ABCD,
  counting: 'position',
  n: 40,
  highlight: 3,
  pair: { cycle: [...WEEKDAYS], counting: 'elapsed', start: 'Thursday', n: 21, highlight: 3, unit: 'days' },
  steps: [
    { label: 'Positions', say: 'Positions start at 1, so a whole number of blocks ends on the last item: D.' },
    { label: 'Elapsed days', say: 'Elapsed days start at 0, so a whole number of weeks lands on the start: Thursday.' },
  ],
};

/** Card 4: the rule in words on A, B, C, item 10. */
export const CLOCK_RULE: ClockScene = {
  kind: 'clock',
  cycle: ['A', 'B', 'C'],
  counting: 'position',
  n: 10,
  highlight: 0,
  steps: [
    { label: 'Take one away', say: '10 take away 1 is 9.' },
    { label: 'Find the remainder', say: '9 makes 3 whole blocks of 3, with 0 left over.' },
    { label: 'Add one', say: '0 plus 1 is 1: place 1, which is A. So item 10 is A.' },
  ],
};

/** Card 5: the edges of a block of shapes: positions 3, 4 and 6. */
export const CLOCK_EDGES: ClockScene = {
  kind: 'clock',
  cycle: ['circle', 'square', 'triangle'],
  counting: 'position',
  steps: [
    { label: 'Position 3', say: 'Take one away: 2. Blocks of 3 leave 2 over. Add one: place 3, the triangle. Position 3 ends block 1.' },
    { label: 'Position 4', say: 'Take one away: 3. Blocks of 3 leave 0 over. Add one: place 1, the circle. A new block starts.' },
    { label: 'Position 6', say: 'Take one away: 5. Blocks of 3 leave 2 over. Add one: place 3, the triangle. Position 6 ends block 2.' },
  ],
};

export function clockIdeas(): IdeaCard[] {
  return [
    {
      title: 'Count item positions',
      scene: CLOCK_POSITION,
      body: [
        'This chain is made by repeating a block: A, B, C, D. Each question says how it counts.',
        'Here we count item positions. The first item is position 1.',
      ],
    },
    {
      title: 'Count elapsed days',
      scene: CLOCK_DAYS,
      body: ['The week repeats too. Here we count elapsed days: the days that pass. Today is day 0.'],
    },
    {
      title: 'Side by side',
      scene: CLOCK_PAIR,
      body: [
        'Item 40 of A, B, C, D is D. But 21 days after Thursday is Thursday. Both are whole blocks, yet they land in different places.',
        'The count starts in a different place. Always check: positions from 1, or steps from 0?',
      ],
    },
    {
      title: 'The rule in words',
      scene: CLOCK_RULE,
      body: [
        'For item positions: take one away, find the remainder, add one. The answer is the place in the block.',
        'The remainder is what is left over after you make as many whole blocks as you can.',
        'For elapsed steps: find the remainder, then move that many on from the start. A remainder of 0 means the start.',
      ],
    },
    {
      title: 'Check the edges',
      scene: CLOCK_EDGES,
      body: ['The edges of a block are where slips happen. Check the end of a block, the item after it, and the end of the next block.'],
    },
  ];
}

/** A mark on a cycle board: pick the item; every wrong pick gets its exact words. */
function cycleMark(id: string, label: string, options: string[], answer: string, why: (w: string) => string): DrillMark {
  return { id, label, options: options.map((o) => ({ id: idOf(o), label: o })), answer: idOf(answer), why: Object.fromEntries(options.filter((o) => o !== answer).map((o) => [idOf(o), why(o)])) };
}

/** Board 1 (full scaffold): card 1's chain. Position 1 is shown; mark positions 4, 5, 8 and 42. */
export function positionBoard(id: string): DrillStep {
  const mark = (n: number) => {
    const ans = itemAtPosition(ABCD, n);
    return cycleMark(`${id}-p${n}`, 'Item', ABCD, ans, (w) => `${w} is at positions ${positionsOf(ABCD.indexOf(w) + 1, 4)}. ${positionWords(n, 4, ans)}`);
  };
  return {
    id,
    title: 'Mark the positions',
    body: ['This is the chain from the example. Position 1 is marked for you.', 'For each position: take one away, find the remainder after blocks of 4, then add one.'],
    scene: CLOCK_POSITION,
    afterCard: 0,
    scaffold: 'full',
    steps: ['Take one away.', 'Find the remainder after blocks of 4.', 'Add one: that is the place in the block.'],
    stepsLabel: 'Take one away, find the remainder, add one',
    rows: [
      { id: 'p1', label: 'Position 1', marks: [{ ...givenMark(`${id}-p1`, 'Item', 'a', ['b', 'c', 'd']), options: ABCD.map((x) => ({ id: idOf(x), label: x })) }], note: 'The first item is position 1: A.' },
      { id: 'p4', label: 'Position 4', marks: [mark(4)] },
      { id: 'p5', label: 'Position 5', marks: [mark(5)] },
      { id: 'p8', label: 'Position 8', marks: [mark(8)] },
      { id: 'p42', label: 'Position 42', marks: [mark(42)] },
    ],
    done: 'Right. Positions 4 and 8 end a block, so they are D. Position 5 starts a new block: A. Position 42 is place 2: B.',
  };
}

/** Board 2 (light): card 2's week. 7 days on is shown; mark 1, 14, 15 and 20 days after Thursday. */
export function daysBoard(id: string): DrillStep {
  const start = 3;
  const mark = (n: number) => {
    const ans = itemAfter(WEEKDAYS, start, n);
    const opts = [...new Set([ans, itemAfter(WEEKDAYS, start, n - 1), itemAfter(WEEKDAYS, start, n + 1), 'Thursday'])].slice(0, 4);
    return cycleMark(`${id}-d${n}`, 'Day', [...WEEKDAYS].filter((d) => opts.includes(d)), ans, (w) => {
      const r = n % 7;
      const where = r === 0
        ? `${n} days is ${n / 7} full ${n / 7 === 1 ? 'week' : 'weeks'}: Thursday again.`
        : n < 7 ? `${count(n, 'day', 'days')} on from Thursday is ${ans}.` : `${n} days is ${count(Math.floor(n / 7), 'week', 'weeks')} and ${count(r, 'day', 'days')}: ${ans}.`;
      if (w === 'Thursday') return `Thursday is today, day 0. ${where}`;
      if (w === itemAfter(WEEKDAYS, start, n - 1)) return `${w} counts Thursday as day 1, but Thursday is day 0. ${where}`;
      if (w === itemAfter(WEEKDAYS, start, n + 1)) return `${w} is one day too far. ${where}`;
      return `${w} is not ${n} days on from Thursday. ${where}`;
    });
  };
  return {
    id,
    title: 'Mark the days',
    body: ['This is the week from the example. Today, Thursday, is day 0. Seven days on is marked for you.', 'Find the remainder after weeks of 7, then move that many days on.'],
    scene: CLOCK_DAYS,
    afterCard: 1,
    rows: [
      { id: 'd7', label: '7 days after Thursday', marks: [{ ...givenMark(`${id}-d7`, 'Day', 'thursday', ['friday']), options: [{ id: 'wednesday', label: 'Wednesday' }, { id: 'thursday', label: 'Thursday' }, { id: 'friday', label: 'Friday' }] }], note: 'One full week: Thursday again.' },
      { id: 'd1', label: '1 day after Thursday', marks: [mark(1)] },
      { id: 'd14', label: '14 days after Thursday', marks: [mark(14)] },
      { id: 'd15', label: '15 days after Thursday', marks: [mark(15)] },
      { id: 'd20', label: '20 days after Thursday', marks: [mark(20)] },
    ],
    done: 'Right. Whole weeks land on Thursday. 15 days is 2 weeks and 1 day: Friday. 20 days is 2 weeks and 6 days: Wednesday.',
  };
}
