/**
 * Stop 10 (shown as Stop 11) · Circuit Lab.
 *
 * The model: a circuit is one loop from a battery, through some switches, to a lamp and back. A switch is closed (no
 * gap: power passes it) or open (a gap: power stops). The switches are wired as a Net: one switch, parts in a line (power
 * must pass every part), parts side by side (power needs one path), or a flipper box around a part (an inverter: it lets
 * power through only when its inside would not). The lamp is on when power gets all the way around (passes). A row is
 * one case: a closed or open state for each switch, in the order of Truth Tables (tables.ts rowsFor: switch A closed in
 * the top half, open in the bottom half). A circuit's table is its lamp in every row (lampColumn).
 *
 * Same table, same job: two circuits do the same job when their lamps agree in every row. That is Stop 9's same meaning
 * (a line is AND, side by side is OR, a flipper box is NOT, closed is True, on is True: toSen, checked against tables.ts
 * column) and Stop 2's same card rule (each switch stands for a card word, toFormula, checked with rules.ts sameMeaning
 * over all 18 cards). Every lamp, table, answer, explanation, wrong-choice feedback and hint case here is worked out
 * from the model, never written by hand. The cards' pictures, the contrast cards and the boards are in circuitBoards.ts.
 *
 * The two-way pair (Lesson 5): a hall lamp with a switch at each end. Each two-way switch has a lever that touches its
 * top end (up) or its bottom end (down), and two wires join the ends of switch A to the ends of switch B. The wires cross
 * on the way, so A's top end joins B's bottom end. Power gets through when both levers touch the same wire: when the
 * switches differ, one up and one down (exclusive or, Stop 9's one but not both). In a row, a two-way switch's true is
 * up, the way a plain switch's true is closed. Flip either switch, and the lamp changes.
 *
 * Question kinds (skill tags): series (lamp, column and case questions on switches in a line), parallel (the same, side
 * by side), not (the same, with flipper boxes), match (which circuit has this table, do two circuits do the same
 * job, fill a circuit's table) and xor (the two-way pair: its lamp, its table, one row next to side by side, and which
 * circuit has a table). The closing why items and the warm-up (a Stop 9 fill-the-column item) are here too.
 */
import { colorIs, and as fAnd, not as fNot, or as fOr, sameMeaning, shapeIs, sizeIs, type Formula } from './rules';
import { columnItem as tableColumnItem, column as senColumn, atom, AND as SAND, NOT as SNOT, OR as SOR, rowsFor, sameRow, type Row, type Sen, type Skin as TableSkin, type TableMade } from './tables';
import type { ItemCore, Made } from './statements';
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, CircuitFrame, CircuitPart, CircuitTable, DrillMark, DrillStep, Rng, Scene, Teach, TeachCase, Truth } from '../types';

export type { Made, Row };

// ---------- the model ----------

export type Net = { op: 'sw'; i: number } | { op: 'line'; parts: Net[] } | { op: 'side'; parts: Net[] } | { op: 'flip'; a: Net } | { op: 'twoway'; i: number; j: number };

export const SW = (i: number): Net => ({ op: 'sw', i });
export const A = SW(0);
export const B = SW(1);
export const C = SW(2);
export const LINE = (...parts: Net[]): Net => ({ op: 'line', parts });
export const SIDE = (...parts: Net[]): Net => ({ op: 'side', parts });
export const FLIP = (a: Net): Net => ({ op: 'flip', a });
/** A two-way pair: switch i at one end of the hall, switch j at the other, joined by two wires that cross. */
export const TWOWAY = (i: number, j: number): Net => ({ op: 'twoway', i, j });
/** The hall: switches A and B as a two-way pair (Lesson 5). */
export const TWO = TWOWAY(0, 1);

/**
 * Does power get through a two-way pair in this case? Follow the wires. Switch i's lever sends power along the wire at
 * its top end (up) or its bottom end (down). The wires cross, so the wire from i's top end reaches j's bottom end, and
 * the wire from i's bottom end reaches j's top end. Power gets through when j's lever touches the end that wire reaches.
 */
export function twoWayPasses(upI: boolean, upJ: boolean): boolean {
  const fromI: 'top' | 'bottom' = upI ? 'top' : 'bottom';
  const reachesJ: 'top' | 'bottom' = fromI === 'top' ? 'bottom' : 'top';
  const jTouches: 'top' | 'bottom' = upJ ? 'top' : 'bottom';
  return reachesJ === jTouches;
}

/** Does power get through this part in this case? In a line every part must let it through; side by side one is enough. */
export function passes(n: Net, r: Row): boolean {
  switch (n.op) {
    case 'sw':
      return r[n.i];
    case 'line':
      return n.parts.every((p) => passes(p, r));
    case 'side':
      return n.parts.some((p) => passes(p, r));
    case 'flip':
      return !passes(n.a, r);
    case 'twoway':
      return twoWayPasses(r[n.i], r[n.j]);
  }
}

/** How many switches the circuit has (switches are numbered from 0, A first). */
export const switchCount = (n: Net): number =>
  n.op === 'sw' ? n.i + 1 : n.op === 'twoway' ? Math.max(n.i, n.j) + 1 : n.op === 'flip' ? switchCount(n.a) : Math.max(...n.parts.map(switchCount));

/** The switches of a circuit that are two-way switches (by number): their true is up, not closed. */
export function twoWaySwitches(n: Net): Set<number> {
  if (n.op === 'twoway') return new Set([n.i, n.j]);
  if (n.op === 'sw') return new Set();
  if (n.op === 'flip') return twoWaySwitches(n.a);
  return new Set(n.parts.flatMap((p) => [...twoWaySwitches(p)]));
}

/** The lamp in every row: the circuit's table. */
export const lampColumn = (n: Net, k = switchCount(n)): boolean[] => rowsFor(k).map((r) => passes(n, r));

/** The same circuit as a Truth Tables sentence: a line is AND, side by side is OR, a flipper box is NOT. */
export function toSen(n: Net): Sen {
  switch (n.op) {
    case 'sw':
      return atom(n.i);
    case 'flip':
      return SNOT(toSen(n.a));
    case 'line':
      return n.parts.map(toSen).reduce((x, y) => SAND(x, y));
    case 'side':
      return n.parts.map(toSen).reduce((x, y) => SOR(x, y));
    case 'twoway':
      // One but not both, from AND, OR and NOT: (i AND NOT j) OR (NOT i AND j).
      return SOR(SAND(atom(n.i), SNOT(atom(n.j))), SAND(SNOT(atom(n.i)), atom(n.j)));
  }
}

/** The card word each switch stands for, so a circuit is a Stop 2 card rule: A is red, B is big, C is a circle. */
const CARD_WORDS: readonly Formula[] = [colorIs('red'), sizeIs('big'), shapeIs('circle')];

/** The same circuit as a Stop 2 card rule (rules.ts): a card fits when the lamp is on for its words. */
export function toFormula(n: Net): Formula {
  switch (n.op) {
    case 'sw':
      return CARD_WORDS[n.i];
    case 'flip':
      return fNot(toFormula(n.a));
    case 'line':
      return n.parts.map(toFormula).reduce((x, y) => fAnd(x, y));
    case 'side':
      return n.parts.map(toFormula).reduce((x, y) => fOr(x, y));
    case 'twoway':
      return fOr(fAnd(CARD_WORDS[n.i], fNot(CARD_WORDS[n.j])), fAnd(fNot(CARD_WORDS[n.i]), CARD_WORDS[n.j]));
  }
}

/** The rows where two circuits' lamps differ (0-based). */
export function differRows(n: Net, m: Net): number[] {
  const k = Math.max(switchCount(n), switchCount(m));
  return rowsFor(k).flatMap((r, j) => (passes(n, r) !== passes(m, r) ? [j] : []));
}

/**
 * Do two circuits do the same job: are their lamps the same in every row? Worked out from the table, and checked
 * against Stop 9's columns and Stop 2's card rules (rules.ts sameMeaning over all 18 cards): all three must agree.
 */
export function sameJob(n: Net, m: Net): boolean {
  const k = Math.max(switchCount(n), switchCount(m), 2);
  const byTable = differRows(n, m).length === 0;
  const bySen = JSON.stringify(senColumn(toSen(n), k)) === JSON.stringify(senColumn(toSen(m), k));
  const byCards = sameMeaning(toFormula(n), toFormula(m));
  if (byTable !== bySen || byTable !== byCards) throw new Error('sameJob: the table, the truth table and the cards disagree');
  return byTable;
}

/** A short id for a circuit: "line(a,flip(b))". Two circuits get the same id only when they are drawn the same. */
export function netId(n: Net): string {
  switch (n.op) {
    case 'sw':
      return 'abc'[n.i];
    case 'flip':
      return `flip(${netId(n.a)})`;
    case 'line':
    case 'side':
      return `${n.op}(${n.parts.map(netId).join(',')})`;
    case 'twoway':
      return `twoway(${'abc'[n.i]},${'abc'[n.j]})`;
  }
}

/**
 * Ways to misread a circuit, for the wrong columns of a "fill the lamp" question. A two-way pair has its own: read as
 * side by side (on when any switch is up: the OR trap), read as a line (on only when both are up), or read the other
 * way round (on when the switches match).
 */
export type Misread = 'closed-stops' | 'line-as-side' | 'side-as-line' | 'side-one' | 'drop-flip' | 'flip-all' | 'two-as-side' | 'two-as-line' | 'two-match';
export const MISREADS: readonly Misread[] = ['closed-stops', 'line-as-side', 'side-as-line', 'side-one', 'drop-flip', 'flip-all'];
export const TWO_MISREADS: readonly Misread[] = ['two-as-side', 'two-as-line', 'two-match'];

/**
 * The lamp under a misreading: a closed switch read as a shut door (it stops power), a line read as side by side (or
 * the other way), side by side read as "one but not both", a flipper box left out, or every lamp flipped.
 */
export function passesAs(n: Net, r: Row, m: Misread): boolean {
  if (m === 'flip-all') return !passes(n, r);
  const go = (x: Net): boolean => {
    switch (x.op) {
      case 'sw':
        return m === 'closed-stops' ? !r[x.i] : r[x.i];
      case 'line': {
        const v = x.parts.map(go);
        return m === 'line-as-side' ? v.some(Boolean) : v.every(Boolean);
      }
      case 'side': {
        const v = x.parts.map(go);
        if (m === 'side-as-line') return v.every(Boolean);
        if (m === 'side-one') return v.filter(Boolean).length === 1;
        return v.some(Boolean);
      }
      case 'flip':
        return m === 'drop-flip' ? go(x.a) : !go(x.a);
      case 'twoway': {
        const [u, v] = [r[x.i], r[x.j]];
        if (m === 'two-as-side') return u || v;
        if (m === 'two-as-line') return u && v;
        if (m === 'two-match') return u === v;
        return twoWayPasses(u, v);
      }
    }
  };
  return go(n);
}

const has = (n: Net, op: Net['op']): boolean => n.op === op || (n.op === 'flip' ? has(n.a, op) : n.op !== 'sw' && n.op !== 'twoway' && n.parts.some((p) => has(p, op)));

// ---------- the circuits each lesson uses ----------

export type Fam = 'line' | 'side' | 'flip' | 'mixed' | 'two';

/** Two switches in a line, and three. */
export const LINE_POOL: readonly Net[] = [LINE(A, B), LINE(A, B, C)];
/** Two switches side by side, and three. */
export const SIDE_POOL: readonly Net[] = [SIDE(A, B), SIDE(A, B, C)];
/** A flipper box on one switch, alone or with a second switch in a line or side by side. */
export const FLIP_POOL: readonly Net[] = [FLIP(A), LINE(FLIP(A), B), LINE(A, FLIP(B)), SIDE(FLIP(A), B), SIDE(A, FLIP(B))];
/** Every two-switch circuit of Lesson 4: the ones above, a flipper box around a pair, and a flipper box on each switch. */
export const MATCH_POOL: readonly Net[] = [
  LINE(A, B),
  SIDE(A, B),
  LINE(FLIP(A), B),
  LINE(A, FLIP(B)),
  SIDE(FLIP(A), B),
  SIDE(A, FLIP(B)),
  FLIP(LINE(A, B)),
  FLIP(SIDE(A, B)),
  LINE(FLIP(A), FLIP(B)),
  SIDE(FLIP(A), FLIP(B)),
];
/** The two-way pair of Lesson 5. */
export const TWO_POOL: readonly Net[] = [TWO];
/** The circuits a Lesson 5 table is matched against: the two-way pair, and the same two switch names side by side and in a line. */
export const PICK_POOL: readonly Net[] = [TWO, SIDE(A, B), LINE(A, B)];
export const POOLS: Record<Fam, readonly Net[]> = { line: LINE_POOL, side: SIDE_POOL, flip: FLIP_POOL, mixed: MATCH_POOL, two: TWO_POOL };
/** The skill tag of each family. */
export const FAM_TAG: Record<Fam, string> = { line: 'series', side: 'parallel', flip: 'not', mixed: 'match', two: 'xor' };

/** Two circuits that look different and have the same table (the trap of Lesson 4). */
export const SAME_PAIRS: readonly [Net, Net][] = [
  [FLIP(SIDE(A, B)), LINE(FLIP(A), FLIP(B))],
  [FLIP(LINE(A, B)), SIDE(FLIP(A), FLIP(B))],
  [LINE(A, B), LINE(B, A)],
  [SIDE(A, B), SIDE(B, A)],
  [LINE(FLIP(A), B), LINE(B, FLIP(A))],
  [SIDE(A, FLIP(B)), SIDE(FLIP(B), A)],
];
/** Two circuits that look alike and have different tables. The first two are Stop 9's NOT on each part. */
export const DIFF_PAIRS: readonly [Net, Net][] = [
  [FLIP(LINE(A, B)), LINE(FLIP(A), FLIP(B))],
  [FLIP(SIDE(A, B)), SIDE(FLIP(A), FLIP(B))],
  [LINE(A, B), SIDE(A, B)],
  [LINE(FLIP(A), B), LINE(A, FLIP(B))],
  [SIDE(FLIP(A), B), SIDE(A, FLIP(B))],
  [FLIP(LINE(A, B)), LINE(FLIP(A), B)],
  [FLIP(SIDE(A, B)), SIDE(FLIP(A), B)],
];

// ---------- topics (skins) ----------

export type Skin = 'lab' | 'everyday' | 'fantasy';
export const SKINS: readonly Skin[] = ['lab', 'everyday', 'fantasy'];

export interface Topic {
  id: string;
  skin: Skin;
  /** The story's first line. */
  setting: string;
  /** The switch names, A first: a letter in the lab, a short word in a story. */
  names: readonly string[];
  /** "the porch lamp". */
  lamp: string;
}

export const TOPICS: readonly Topic[] = [
  { id: 'house', skin: 'everyday', setting: 'Mia wires a lamp for her model house.', names: ['Front', 'Back', 'Side'], lamp: 'the porch lamp' },
  { id: 'robot', skin: 'everyday', setting: 'Leo builds a toy robot with a lamp for an eye.', names: ['Arm', 'Head', 'Foot'], lamp: 'the eye lamp' },
  { id: 'fort', skin: 'everyday', setting: 'Zoe puts a reading lamp in her blanket fort.', names: ['Door', 'Roof', 'Wall'], lamp: 'the fort lamp' },
  { id: 'kite', skin: 'everyday', setting: 'Sam wires a lamp for a night kite show.', names: ['Red', 'Blue', 'Gold'], lamp: 'the kite lamp' },
  { id: 'tower', skin: 'fantasy', setting: 'A wizard lights her tower with a magic lamp.', names: ['Moon', 'Star', 'Sun'], lamp: 'the tower lamp' },
  { id: 'cave', skin: 'fantasy', setting: 'A dragon wires a glow lamp in its cave.', names: ['Claw', 'Wing', 'Tail'], lamp: 'the cave lamp' },
  { id: 'ship', skin: 'fantasy', setting: 'Elves light their sky ship with a lamp.', names: ['Sail', 'Mast', 'Rope'], lamp: 'the ship lamp' },
];
/** The lab: switches A, B and C. The cards and the boards use it. */
export const LAB: Topic = { id: 'lab', skin: 'lab', setting: 'In the lab, a battery, switches and a lamp make one loop.', names: ['A', 'B', 'C'], lamp: 'the lamp' };

/** Lesson 5's stories: a long place with a switch at each end, and the lab's own two-way loop. */
export const TWO_LAB: Topic = { id: 'lab', skin: 'lab', setting: 'In the lab, one lamp has a two-way switch at each end of its loop.', names: ['A', 'B', 'C'], lamp: 'the lamp' };
export const TWO_TOPICS: readonly Topic[] = [
  TWO_LAB,
  { id: 'hall', skin: 'everyday', setting: 'Mia’s model house has a long hall with a switch at each end.', names: ['Front', 'Back'], lamp: 'the hall lamp' },
  { id: 'ladder', skin: 'everyday', setting: 'Leo’s tree house has a ladder with a switch at the top and the bottom.', names: ['Top', 'Bottom'], lamp: 'the ladder lamp' },
  { id: 'tunnel', skin: 'everyday', setting: 'Zoe’s blanket fort has a long tunnel with a switch at each end.', names: ['Door', 'Nook'], lamp: 'the tunnel lamp' },
  { id: 'stair', skin: 'fantasy', setting: 'A wizard’s tower has a long stair with a switch at the top and the bottom.', names: ['Moon', 'Star'], lamp: 'the stair lamp' },
  { id: 'bridge', skin: 'fantasy', setting: 'A troll lights its long bridge with a switch at each end.', names: ['East', 'West'], lamp: 'the bridge lamp' },
  { id: 'deck', skin: 'fantasy', setting: 'Elves light the long deck of their sky ship from a switch at each end.', names: ['Bow', 'Stern'], lamp: 'the deck lamp' },
];

/** A topic of this skin, not one already used in the set when one is left. `from`: the stories to pick from (Lesson 5 has its own). */
export function pickTopic(rng: Rng, skin: Skin, avoid?: Set<string>, from: readonly Topic[] = TOPICS): Topic {
  if (skin === 'lab') return from.find((t) => t.skin === 'lab') ?? LAB;
  const pool = from.filter((t) => t.skin === skin);
  const fresh = pool.filter((t) => !avoid?.has(t.id));
  const t = rng.pick(fresh.length ? fresh : pool);
  avoid?.add(t.id);
  return t;
}

// ---------- words ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const listAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const NUM = ['zero', 'one', 'two', 'three', 'four'];

/** A switch in a sentence: "switch A" in the lab, "the Moon switch" in a story. */
export const swName = (name: string) => (name.length === 1 ? `switch ${name}` : `the ${name} switch`);
/** Several switches together: "switches A and B", "the Moon and Star switches". */
const swNames = (names: readonly string[]) => (names.every((n) => n.length === 1) ? `switches ${listAnd(names)}` : `the ${listAnd(names)} switches`);

/** A circuit as drawn (the scene's data): its switches by name. */
export function toPart(n: Net, names: readonly string[]): CircuitPart {
  switch (n.op) {
    case 'sw':
      return { t: 'switch', name: names[n.i] };
    case 'flip':
      return { t: 'flip', part: toPart(n.a, names) };
    case 'line':
    case 'side':
      return { t: n.op, parts: n.parts.map((p) => toPart(p, names)) };
    case 'twoway':
      return { t: 'twoway', names: [names[n.i], names[n.j]] };
  }
}

/**
 * How a circuit is wired, in words: "switches A and B in a line", "a flipper box on switch A, in a line with switch B",
 * "switches A and B side by side, inside one flipper box". The read-aloud uses the same words (circuitSpeech).
 */
export function partWords(p: CircuitPart): string {
  switch (p.t) {
    case 'switch':
      return swName(p.name);
    case 'flip':
      return p.part.t === 'switch' ? `a flipper box on ${swName(p.part.name)}` : `${partWords(p.part)}, inside one flipper box`;
    case 'twoway':
      return `${swNames(p.names)} as a two-way pair`;
    case 'line':
    case 'side': {
      const how = p.t === 'line' ? 'in a line' : 'side by side';
      if (p.parts.every((x) => x.t === 'switch')) return `${swNames(p.parts.map((x) => (x as { name: string }).name))} ${how}`;
      if (p.parts.length === 2) return `${partWords(p.parts[0])}, ${how} with ${partWords(p.parts[1])}`;
      return `${listAnd(p.parts.map(partWords))}, all ${how}`;
    }
  }
}

/** The circuit's wiring in words, for a topic. */
export const words = (n: Net, t: Topic) => partWords(toPart(n, t.names));

const swOf = (i: number, t: Topic) => swName(t.names[i]);
const SwOf = (i: number, t: Topic) => cap(swOf(i, t));
const state = (v: boolean) => (v ? 'closed' : 'open');
/** A two-way switch's lever: up or down. */
export const pos = (v: boolean) => (v ? 'up' : 'down');
const lampWord = (v: boolean) => (v ? 'on' : 'off');
const LampWord = (v: boolean) => (v ? 'On' : 'Off');
/** Switch i's state in this circuit: up or down for a two-way switch, closed or open for a plain one. */
const stateIn = (n: Net | undefined) => {
  const two = n ? twoWaySwitches(n) : new Set<number>();
  return (v: boolean, i: number) => (two.has(i) ? pos(v) : state(v));
};

/** A case in short: "A closed, B open", "Moon closed, Star open"; for a two-way pair (`n`), "A up, B down". */
export const rowShort = (r: Row, t: Topic, n?: Net) => r.map((v, i) => `${t.names[i]} ${stateIn(n)(v, i)}`).join(', ');
/** A case as sentences: "Switch A is closed. Switch B is open." (or up and down, for a two-way pair). */
export const rowSentences = (r: Row, t: Topic, n?: Net) => r.map((v, i) => `${SwOf(i, t)} is ${stateIn(n)(v, i)}.`).join(' ');
/** A case inside a sentence: "switch A is closed and switch B is open" (or up and down, for a two-way pair). */
export const rowClause = (r: Row, t: Topic, n?: Net) => listAnd(r.map((v, i) => `${swOf(i, t)} is ${stateIn(n)(v, i)}`));
/** A fixed id for a case: "r-cc" for both closed, "r-co" for A closed and B open. */
export const rowId = (r: Row) => `r-${r.map((v) => (v ? 'c' : 'o')).join('')}`;
/** "On, Off, Off, Off": a lamp column from row 1 down. */
export const colLabel = (c: readonly boolean[]) => c.map(LampWord).join(', ');
export const colId = (c: readonly boolean[]) => `col-${c.map((v) => (v ? '1' : '0')).join('')}`;

// ---------- reasons, worked out from the model ----------

const allSw = (ps: readonly Net[]) => ps.every((p) => p.op === 'sw');
const swIndex = (p: Net) => (p as { i: number }).i;

/** One part (a switch, or a flipper box on a switch) in this case, as one sentence. */
function partLine(p: Net, r: Row, t: Topic): string {
  if (p.op === 'sw') return r[p.i] ? `${SwOf(p.i, t)} is closed, so power passes it.` : `${SwOf(p.i, t)} is open. Its gap stops power.`;
  if (p.op === 'flip' && p.a.op === 'sw') {
    const i = p.a.i;
    return r[i] ? `${SwOf(i, t)} is closed, so its flipper box stops power.` : `${SwOf(i, t)} is open, so its flipper box lets power through.`;
  }
  return passes(p, r) ? `Power gets through ${words(p, t)}.` : `Power stops at ${words(p, t)}.`;
}

/** "Switches A and B are both closed." / "All three switches are open." */
function together(ps: readonly Net[], v: boolean, t: Topic): string {
  if (ps.length === 2) return `${cap(swNames(ps.map((p) => t.names[swIndex(p)])))} are both ${state(v)}.`;
  return `All ${NUM[ps.length]} switches are ${state(v)}.`;
}

/** What happens inside a flipper box that holds a line or side-by-side pair of switches. */
function insideLine(n: Net, r: Row, t: Topic): string {
  if (n.op !== 'line' && n.op !== 'side') return partLine(n, r, t);
  const ps = n.parts;
  const go = passes(n, r);
  if (n.op === 'line') {
    if (go) return `Inside the box, ${together(ps, true, t).charAt(0).toLowerCase()}${together(ps, true, t).slice(1, -1)}, so power gets through.`;
    const stop = ps.find((p) => !passes(p, r))!;
    return `Inside the box, ${swOf(swIndex(stop), t)} is open, so power stops there.`;
  }
  if (!go) return `Inside the box, ${together(ps, false, t).charAt(0).toLowerCase()}${together(ps, false, t).slice(1, -1)}, so power stops.`;
  const p = ps.find((x) => passes(x, r))!;
  return `Inside the box, ${swOf(swIndex(p), t)} is closed, so power gets through.`;
}

/** A two-way pair in this case: "Switch A is up and switch B is down." / "Switches A and B are both up." */
function twoWayLine(i: number, j: number, r: Row, t: Topic): string {
  return r[i] === r[j] ? `${cap(swNames([t.names[i], t.names[j]]))} are both ${pos(r[i])}.` : `${SwOf(i, t)} is ${pos(r[i])} and ${swOf(j, t)} is ${pos(r[j])}.`;
}

/** Why a two-way pair lets power through or not, from the wires: both levers on one wire, or on different wires. */
export const twoWayWhy = (through: boolean) => (through ? 'They differ, so both levers touch the same wire. Power gets through.' : 'They match, so the two levers touch different wires. Power has no path.');

/** Why the lamp is on or off in this case: one to three short sentences, the last one "So the lamp is on." */
export function explainRow(n: Net, r: Row, t: Topic): string[] {
  const on = passes(n, r);
  const out: string[] = [];
  switch (n.op) {
    case 'twoway':
      out.push(twoWayLine(n.i, n.j, r, t), twoWayWhy(on));
      break;
    case 'sw':
    case 'flip':
      if (n.op === 'flip' && n.a.op !== 'sw') out.push(insideLine(n.a, r, t), passes(n.a, r) ? 'The flipper box does the opposite, so it stops power.' : 'The flipper box does the opposite, so it lets power through.');
      else out.push(partLine(n, r, t));
      break;
    case 'line': {
      const stop = n.parts.find((p) => !passes(p, r));
      if (!stop) {
        if (allSw(n.parts)) out.push(together(n.parts, true, t), 'Power passes every switch in the line.');
        else out.push(...n.parts.map((p) => partLine(p, r, t)), 'Power passes every part of the line.');
      } else out.push(partLine(stop, r, t), 'In a line, one stop is enough.');
      break;
    }
    case 'side': {
      const go = n.parts.filter((p) => passes(p, r));
      if (!go.length) {
        if (allSw(n.parts)) out.push(together(n.parts, false, t), 'No path lets power through.');
        else out.push(...n.parts.map((p) => partLine(p, r, t)), 'No path lets power through.');
      } else if (go.length === n.parts.length && go.length > 1 && allSw(go)) {
        out.push(together(go, true, t), `One closed path is enough, so ${NUM[go.length]} are enough too.`);
      } else out.push(partLine(go[0], r, t), 'Side by side, one path is enough.');
      break;
    }
  }
  out.push(`So ${t.lamp} is ${lampWord(on)}.`);
  return out;
}

/** The part of a reason that decides the lamp, to follow "but": "switch B is open, and in a line its gap stops the power". */
export function decider(n: Net, r: Row, t: Topic): string {
  const on = passes(n, r);
  switch (n.op) {
    case 'twoway':
      return r[n.i] === r[n.j]
        ? `both switches are ${pos(r[n.i])}, so they match, and the lamp is on only when they differ`
        : `${swOf(n.i, t)} is ${pos(r[n.i])} and ${swOf(n.j, t)} is ${pos(r[n.j])}, so they differ`;
    case 'sw':
      return `${swOf(n.i, t)} is ${state(r[n.i])}`;
    case 'flip':
      if (n.a.op === 'sw') return `${swOf(n.a.i, t)} is ${state(r[n.a.i])} inside a flipper box, and the box does the opposite`;
      return passes(n.a, r) ? 'power gets through inside the flipper box, so the box stops it' : 'power stops inside the flipper box, so the box lets it through';
    case 'line': {
      if (on) return allSw(n.parts) ? 'every switch in the line is closed' : 'power passes every part of the line';
      const stop = n.parts.find((p) => !passes(p, r))!;
      if (stop.op === 'sw') return `${swOf(stop.i, t)} is open, and in a line its gap stops the power`;
      return `${swOf(swIndex((stop as { a: Net }).a), t)} is closed inside a flipper box, so that box stops the power`;
    }
    case 'side': {
      if (!on) return 'no path lets power through';
      const go = n.parts.filter((p) => passes(p, r));
      if (go.length === n.parts.length && go.length > 1 && allSw(go)) return 'side by side, one closed path is enough, and here every path is closed';
      const p = go[0];
      if (p.op === 'sw') return `${swOf(p.i, t)} is closed, and side by side one path is enough`;
      return `${swOf(swIndex((p as { a: Net }).a), t)} is open, so its flipper box lets power through`;
    }
  }
}

/** When the lamp is on, in one sentence: "The porch lamp is on only when the Front switch is closed and the Back switch is closed." */
export function lampRule(n: Net, t: Topic): string {
  const k = switchCount(n);
  const rows = rowsFor(k);
  const on = rows.filter((r) => passes(n, r));
  const off = rows.filter((r) => !passes(n, r));
  const L = cap(t.lamp);
  if (n.op === 'twoway') return `${L} is on only when the switches differ: one up and one down.`;
  if (!on.length) return `${L} is never on.`;
  if (!off.length) return `${L} is always on.`;
  if (on.length === 1) return `${L} is on only when ${rowClause(on[0], t)}.`;
  if (off.length === 1) return `${L} is off only when ${rowClause(off[0], t)}.`;
  return `${L} is on in ${NUM[on.length] ?? on.length} cases of ${rows.length}.`;
}

// ---------- teaching ----------

type Term = { word: string; meaning: string };
export const T_CIRCUIT: Term = { word: 'A circuit', meaning: 'a loop of wire from the battery, through the switches and the lamp, and back.' };
export const T_CLOSED: Term = { word: 'A closed switch', meaning: 'a switch with no gap. Power can pass it.' };
export const T_OPEN: Term = { word: 'An open switch', meaning: 'a switch with a gap. Power stops there.' };
export const T_LINE: Term = { word: 'In a line', meaning: 'one part after the other. Power must pass every part.' };
export const T_SIDE: Term = { word: 'Side by side', meaning: 'two or more paths next to each other. Power can take any path that is not stopped.' };
export const T_FLIP: Term = { word: 'A flipper box', meaning: 'a box that does the opposite of its inside. Grown-ups call it an inverter.' };
export const T_TABLE: Term = { word: 'A circuit’s table', meaning: 'every case of the switches, one row each, with the lamp on or off.' };
export const T_SAME: Term = { word: 'The same job', meaning: 'the lamps agree in every row of the table. Looks do not decide it.' };
export const T_TWO: Term = { word: 'A two-way switch', meaning: 'a switch whose lever is up or down. It sends power along one of two wires.' };
export const T_PAIR: Term = { word: 'A two-way pair', meaning: 'a switch at each end of a hall, joined by two wires that cross. The lamp is on when the switches differ.' };
export const T_MATCH: Term = { word: 'Match', meaning: 'both switches are up, or both are down. Differ means one is up and one is down.' };

export const BASE_RULE = 'A closed switch lets power pass. An open switch leaves a gap.';
export const LINE_RULE = 'In a line, power must pass every part. One gap stops it.';
export const SIDE_RULE = 'Side by side, power needs just one path. Two closed paths still light the lamp.';
export const FLIP_RULE = 'A flipper box does the opposite of its inside. It lets power through only when its inside would stop it.';
export const TWO_RULE = 'A two-way pair lights the lamp when its switches differ: one up and one down. Flip either switch, and the lamp changes.';

/** The rule for a circuit: the switch rule, then each way it is wired. */
export function ruleFor(n: Net): string {
  return [...(has(n, 'sw') ? [BASE_RULE] : []), ...(has(n, 'line') ? [LINE_RULE] : []), ...(has(n, 'side') ? [SIDE_RULE] : []), ...(has(n, 'flip') ? [FLIP_RULE] : []), ...(has(n, 'twoway') ? [TWO_RULE] : [])].join(' ');
}

/** The words the explanation of these circuits needs. */
export function termsFor(nets: Net | readonly Net[], extra: Term[] = []): Term[] {
  const ns = Array.isArray(nets) ? nets : [nets as Net];
  const any = (op: Net['op']) => ns.some((n) => has(n, op));
  return [T_CIRCUIT, ...(any('sw') ? [T_CLOSED, T_OPEN] : []), ...(any('line') ? [T_LINE] : []), ...(any('side') ? [T_SIDE] : []), ...(any('flip') ? [T_FLIP] : []), ...(any('twoway') ? [T_TWO, T_PAIR, T_MATCH] : []), ...extra];
}

const LAMP_WORDS = { truth: 'on', untruth: 'off' } as const;

/** One case of a circuit, worked out: its switches, the lamp, and why. */
export function rowCase(n: Net, r: Row, k: number, t: Topic, label = `Row ${k + 1}: ${rowShort(r, t, n)}.`): TeachCase {
  const lines = explainRow(n, r, t);
  return { label, truths: [{ who: cap(t.lamp), value: passes(n, r) }], note: lines.slice(0, -1).join(' '), words: { ...LAMP_WORDS } };
}

/** The cases a teaching shows: every row for two switches; four for three (all closed, the asked row, one open, all open). */
function teachRows(n: Net, asked?: Row): { r: Row; k: number }[] {
  const rows = rowsFor(Math.max(switchCount(n), 1));
  const all = rows.map((r, k) => ({ r, k }));
  if (rows.length <= 4) return all;
  const pick = [0, ...(asked ? [rows.findIndex((x) => sameRow(x, asked))] : []), 1, rows.length - 1];
  return [...new Set(pick)].sort((x, y) => x - y).slice(0, 4).map((k) => all[k]);
}

const REMEMBER = ['Follow the power from the battery to the lamp.', 'Ask: “Can power get all the way around the loop?”'];
const FLIP_REMEMBER = 'At a flipper box, ask what its inside would do. Then do the opposite.';
const TWO_REMEMBER = 'At a two-way pair, ask: “Do the switches match or differ?”';

/** The teaching for one circuit: its rule, its words, what it does, its cases and the smallest worked example. */
export function circuitTeach(n: Net, t: Topic, asked?: Row, extra: Partial<Teach> = {}): Teach {
  const r = asked ?? rowsFor(Math.max(switchCount(n), 1))[0];
  return {
    rule: ruleFor(n),
    terms: termsFor(n),
    meaning: `${cap(words(n, t))}. ${lampRule(n, t)}`,
    casesTitle: 'The cases for this circuit',
    cases: teachRows(n, asked).map(({ r: x, k }) => rowCase(n, x, k, t)),
    remember: [...REMEMBER, ...(has(n, 'flip') ? [FLIP_REMEMBER] : []), ...(has(n, 'twoway') ? [TWO_REMEMBER] : [])],
    simpler: [`Start at the battery and follow the wire. ${rowSentences(r, t, n)}`, ...explainRow(n, r, t)],
    ...extra,
  };
}

// ---------- scenes ----------

/**
 * One circuit as a still frame: its wiring, and (for one case) each switch's state and the lamp. A plain switch's state
 * goes in `closed`; a two-way switch's lever goes in `up`.
 */
export function frame(n: Net, t: Topic, o: { name?: string; row?: Row; lamp?: boolean | null } = {}): CircuitFrame {
  const f: CircuitFrame = { ...(o.name ? { name: o.name } : {}), part: toPart(n, t.names) };
  if (o.row) {
    const two = twoWaySwitches(n);
    const plain = o.row.flatMap((v, i) => (two.has(i) ? [] : [[t.names[i], v] as const]));
    const levers = o.row.flatMap((v, i) => (two.has(i) ? [[t.names[i], v] as const] : []));
    if (plain.length) f.closed = Object.fromEntries(plain);
    if (levers.length) f.up = Object.fromEntries(levers);
  }
  if (o.lamp !== undefined) f.lamp = o.lamp;
  return f;
}

/** A table's switch words: Up and Down when every switch is two-way, True and False when two-way and plain switches share it. */
export const UP_DOWN: [string, string] = ['Up', 'Down'];
export const TRUE_FALSE: [string, string] = ['True', 'False'];
function tableWords(nets: readonly Net[]): [string, string] | undefined {
  const two = nets.map((n) => twoWaySwitches(n).size);
  if (nets.every((n, j) => two[j] > 0 && two[j] === switchCount(n))) return UP_DOWN;
  return two.some((x) => x > 0) ? TRUE_FALSE : undefined;
}

/**
 * A circuit's table: the switches as Closed or Open, then a lamp column for each circuit. `blank`: lamp boxes left blank
 * (row index, lamp index). `rows`: which rows to show (default every row).
 */
export function circuitTable(
  nets: readonly Net[],
  t: Topic,
  o: { blank?: (k: number, j: number) => boolean; rows?: readonly Row[]; lampHeads?: string[]; rowWord?: string; marked?: number[]; markLabel?: string; inputWords?: [string, string] } = {},
): CircuitTable {
  const k = Math.max(...nets.map(switchCount), 1);
  const rows = o.rows ?? rowsFor(k);
  const heads = [...t.names.slice(0, k), ...(o.lampHeads ?? (nets.length === 1 ? ['Lamp'] : nets.map((_, j) => `Lamp ${j + 1}`)))];
  const inputWords = o.inputWords ?? tableWords(nets);
  return {
    heads,
    inputs: k,
    cells: rows.map((r, i) => [...r, ...nets.map((n, j) => (o.blank?.(i, j) ? null : passes(n, r)))]),
    ...(o.rowWord ? { rowWord: o.rowWord } : {}),
    ...(o.marked ? { marked: o.marked, markLabel: o.markLabel } : {}),
    ...(inputWords ? { inputWords } : {}),
  };
}

export type CircuitScene = Extract<Scene, { kind: 'circuit' }>;
export const circuitScene = (circuits: CircuitFrame[], o: { table?: CircuitTable; caption?: string } = {}): CircuitScene => ({
  kind: 'circuit',
  circuits,
  ...(o.table ? { table: o.table } : {}),
  ...(o.caption ? { caption: o.caption } : {}),
});

// ---------- the items ----------

/** A made item, plus what it was made from (for tests). */
export interface CircuitMade extends Made {
  nets: Net[];
  topic: Topic;
  /** The case asked about (lamp items and why items). */
  row?: Row;
  /** Which kind of question it is. */
  kind: 'lamp' | 'column' | 'case' | 'match' | 'same' | 'why' | 'compare' | 'pick';
}

export interface CircuitOptions {
  skin: Skin;
  /** Topic ids already used in this set: a new one is picked when one is left. */
  avoid?: Set<string>;
}

const SECONDS = 120;
function done(tag: string, kind: CircuitMade['kind'], item: ItemCore, nets: Net[], topic: Topic, row?: Row): CircuitMade {
  syncWhyWrong(item);
  return { tag, item, kind, nets, topic, ...(row ? { row } : {}) };
}

/** The pass tags: one trap per lesson, in every planned pack. */
export const ONE_CLOSED = { tag: 'one-closed', label: 'a line with a closed switch and an open one' } as const;
export const BOTH_CLOSED = { tag: 'both-closed', label: 'side by side with every switch closed' } as const;
export const FLIP_CLOSED = { tag: 'flip-closed', label: 'a closed switch inside a flipper box' } as const;
export const LOOKS_DIFFER = { tag: 'looks-differ', label: 'two circuits that look different but have the same table' } as const;
export const BOTH_UP = { tag: 'both-up', label: 'a two-way pair with both switches up' } as const;
export type Trap = 'one-closed' | 'both-closed' | 'flip-closed' | 'both-up';

export const LAMP_CHOICES: Choice[] = [{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }];

/** The flipped switches of a circuit: switches that sit alone inside a flipper box. */
function flippedSwitches(n: Net): number[] {
  if (n.op === 'flip') return n.a.op === 'sw' ? [n.a.i] : flippedSwitches(n.a);
  if (n.op === 'sw' || n.op === 'twoway') return [];
  return n.parts.flatMap(flippedSwitches);
}

/** Is this case the lesson's trap for this circuit? */
export function isTrap(trap: Trap, n: Net, r: Row): boolean {
  const on = passes(n, r);
  switch (trap) {
    case 'one-closed':
      return n.op === 'line' && r.some(Boolean) && !r.every(Boolean);
    case 'both-closed':
      return n.op === 'side' && r.every(Boolean);
    case 'flip-closed':
      return !on && flippedSwitches(n).some((i) => r[i]);
    case 'both-up':
      return n.op === 'twoway' && r[n.i] && r[n.j];
  }
}

/** The trap of each family's lesson. */
export const FAM_TRAP: Partial<Record<Fam, Trap>> = { line: 'one-closed', side: 'both-closed', flip: 'flip-closed', two: 'both-up' };
const TRAP_TAG: Record<Trap, string> = { 'one-closed': ONE_CLOSED.tag, 'both-closed': BOTH_CLOSED.tag, 'flip-closed': FLIP_CLOSED.tag, 'both-up': BOTH_UP.tag };
/** The stories a family's items pick from: Lesson 5 has its own (a long place with a switch at each end). */
const topicsOf = (fam: Fam): readonly Topic[] => (fam === 'two' ? TWO_TOPICS : TOPICS);

/** Is the lamp on or off in this case? `trap`: the lesson's trap case. `want`: the lamp. */
export function lampItem(rng: Rng, o: CircuitOptions & { fam: Fam; net?: Net; trap?: boolean; want?: boolean }): CircuitMade {
  const t = pickTopic(rng, o.skin, o.avoid, topicsOf(o.fam));
  const trap = o.trap ? FAM_TRAP[o.fam] : undefined;
  const famTrap = FAM_TRAP[o.fam];
  // A trap item asks the trap case; any other item asks a case that is not the lesson's trap, so a pack holds one trap.
  const fits = (n: Net, r: Row) => (trap ? isTrap(trap, n, r) : !famTrap || !isTrap(famTrap, n, r)) && (o.want === undefined || passes(n, r) === o.want);
  const pairs = (o.net ? [o.net] : POOLS[o.fam]).flatMap((n) => rowsFor(switchCount(n)).filter((r) => fits(n, r)).map((r) => [n, r] as const));
  if (!pairs.length) throw new Error(`lampItem: no case for ${o.fam}`);
  const n = rng.pick([...new Set(pairs.map(([x]) => x))]);
  const r = rng.pick(pairs.filter(([x]) => x === n).map(([, x]) => x));
  const rows = rowsFor(switchCount(n));
  const k = rows.findIndex((x) => sameRow(x, r));
  const on = passes(n, r);
  const wrong = on ? 'off' : 'on';
  const others = rows.filter((x) => !sameRow(x, r));
  const h = rng.pick(others);
  const hk = rows.findIndex((x) => sameRow(x, h));
  const L = t.lamp;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${t.setting} This circuit has ${words(n, t)}. ${rowSentences(r, t, n)} Is ${L} on or off?`,
    scene: circuitScene([frame(n, t, { row: r, lamp: null })]),
    choices: LAMP_CHOICES.map((c) => ({ ...c })),
    answer: lampWord(on),
    explain: explainRow(n, r, t).join(' '),
    feedback: {
      [wrong]: {
        headline: `Your answer says ${wrong}, but ${decider(n, r, t)}.`,
        detail: explainRow(n, r, t),
        example: rowCase(n, r, k, t, `This case: ${rowShort(r, t, n)}.`),
      },
    },
    hint: 'Here is another case of this circuit, worked out. Follow the power the same way in your case.',
    hintCase: rowCase(n, h, hk, t, `Another case: ${rowShort(h, t, n)}.`),
    teach: circuitTeach(n, t, r),
    ...(trap ? { conflict: true, tags: [TRAP_TAG[trap]] } : {}),
  };
  return done(FAM_TAG[o.fam], 'lamp', item, [n], t, r);
}

const MISREAD_HEAD: Record<Misread, string> = {
  'closed-stops': 'Your column treats a closed switch like a shut door. A closed switch has no gap, so power passes it.',
  'line-as-side': 'Your column treats the line like side by side. In a line, one open switch is enough to stop the power.',
  'side-as-line': 'Your column treats side by side like a line. Side by side, one closed path is enough.',
  'side-one': 'Your column reads side by side as “one but not both.” When both paths let power through, the lamp is still on.',
  'drop-flip': 'Your column leaves out the flipper box. The box does the opposite of its inside.',
  'flip-all': 'Your column is the right one flipped: on and off are swapped in every row.',
  'two-as-side': 'Your column treats the two-way pair like switches side by side. With both switches up, they match, so the lamp is off.',
  'two-as-line': 'Your column treats the two-way pair like a line. The lamp is on when the switches differ, not when both are up.',
  'two-match': 'Your column lights the lamp when the switches match. It is the other way round: the lamp is on when they differ.',
};

/** Up to three wrong columns: the misreadings first (each a different column), then others to fill. */
function wrongColumns(rng: Rng, n: Net): { col: boolean[]; m?: Misread }[] {
  const k = switchCount(n);
  const rows = rowsFor(k);
  const right = lampColumn(n, k);
  const out: { col: boolean[]; m?: Misread }[] = [];
  const seen = new Set([colId(right)]);
  for (const m of rng.shuffle(has(n, 'twoway') ? TWO_MISREADS : MISREADS)) {
    const col = rows.map((r) => passesAs(n, r, m));
    if (seen.has(colId(col))) continue;
    seen.add(colId(col));
    out.push({ col, m });
  }
  const fill = [rows.map(() => true), rows.map(() => false), ...MATCH_POOL.map((x) => lampColumn(x, Math.max(k, 2)).slice(0, rows.length))];
  for (const col of fill) {
    if (out.length >= 3) break;
    if (seen.has(colId(col))) continue;
    seen.add(colId(col));
    out.push({ col });
  }
  return rng.shuffle(out).slice(0, 3);
}

/** Why one wrong column fails: its misreading, then the first row where it differs, worked out. */
function columnFeedback(n: Net, t: Topic, w: { col: boolean[]; m?: Misread }, who = 'Your column'): ChoiceFeedback {
  const rows = rowsFor(switchCount(n));
  const k = rows.findIndex((r, j) => passes(n, r) !== w.col[j]);
  const r = rows[k];
  return {
    headline: w.m ? MISREAD_HEAD[w.m].replace('Your column', who) : `${who} does not match row ${k + 1}.`,
    detail: [`Look at row ${k + 1}: ${rowShort(r, t, n)}.`, ...explainRow(n, r, t), `${who} says ${lampWord(w.col[k])} there.`],
    example: rowCase(n, r, k, t),
  };
}

/** A row where the right column agrees with most wrong ones, so a worked hint does not give the answer away. */
function quietRow(right: readonly boolean[], wrongs: readonly (readonly boolean[])[]): number {
  let best = 0;
  let score = -1;
  right.forEach((v, k) => {
    const s = wrongs.filter((w) => w[k] === v).length;
    if (s > score) [best, score] = [k, s];
  });
  return best;
}

/** A thinking board: each lamp in each row, On or Off. Never checked. */
export function lampScratch(nets: readonly Net[], t: Topic, id: string): DrillStep {
  const k = Math.max(...nets.map(switchCount), 1);
  const lamps = nets.length === 1 ? ['Lamp'] : nets.map((_, j) => `Lamp ${j + 1}`);
  return {
    id,
    title: 'Fill the table',
    body: [nets.length === 1 ? 'Mark the lamp in each row.' : 'Mark each lamp in each row. Then compare them, row by row.', 'This board is only for thinking. Nothing on it is checked.'],
    rows: rowsFor(k).map((r, i) => ({
      id: `r${i + 1}`,
      label: `Row ${i + 1}: ${rowShort(r, t, nets.length === 1 ? nets[0] : undefined)}`,
      marks: nets.map((n, j): DrillMark => {
        const on = passes(n, r);
        return { id: `r${i + 1}-l${j + 1}`, label: lamps[j], options: LAMP_CHOICES.map((c) => ({ ...c })), answer: lampWord(on), why: { [lampWord(!on)]: explainRow(n, r, t).join(' ') } };
      }),
    })),
    words: { ...BOARD_WORDS, closing: 'Back to the question: follow the power in one row at a time.' },
    done: '',
  };
}

/** Which lamp column is right for this circuit, from row 1 down? (Two switches, or one.) */
export function columnItem(rng: Rng, o: CircuitOptions & { fam: Fam; net?: Net }): CircuitMade {
  const t = pickTopic(rng, o.skin, o.avoid, topicsOf(o.fam));
  const n = o.net ?? rng.pick(POOLS[o.fam].filter((x) => switchCount(x) <= 2));
  const k = switchCount(n);
  const rows = rowsFor(k);
  const right = lampColumn(n, k);
  const wrongs = wrongColumns(rng, n);
  const choices = rng.shuffle([right, ...wrongs.map((w) => w.col)]).map((c) => ({ id: colId(c), label: colLabel(c) }));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) feedback[colId(w.col)] = columnFeedback(n, t, w);
  const hk = quietRow(right, wrongs.map((w) => w.col));
  return done(FAM_TAG[o.fam], 'column', {
    kind: 'choose',
    prompt: `${t.setting} This circuit has ${words(n, t)}. Fill the lamp column of its table. Which column is right, from row 1 down?`,
    scene: circuitScene([frame(n, t)], { table: circuitTable([n], t, { blank: () => true }), caption: 'The lamp column is blank. Fill it one row at a time.' }),
    choices,
    answer: colId(right),
    explain: `${lampRule(n, t)} So the column is ${colLabel(right)}.`,
    feedback,
    hint: 'Here is one row, worked out. Do each other row the same way.',
    hintCase: rowCase(n, rows[hk], hk, t),
    teach: circuitTeach(n, t, undefined, { cases: rows.map((r, j) => rowCase(n, r, j, t)) }),
    scratch: lampScratch([n], t, 's10-table-board'),
    scratchLabel: 'the table board',
    seconds: SECONDS,
  }, [n], t);
}

/** Which case turns the lamp on (or leaves it off)? Only circuits where exactly one case does. */
export function caseItem(rng: Rng, o: CircuitOptions & { fam: Fam; want?: boolean }): CircuitMade {
  const t = pickTopic(rng, o.skin, o.avoid);
  const fits = (x: Net, w: boolean) => switchCount(x) <= 2 && lampColumn(x).filter((v) => v === w).length === 1;
  const options = POOLS[o.fam].flatMap((x) => [true, false].filter((w) => (o.want === undefined || w === o.want) && fits(x, w)).map((w) => [x, w] as const));
  const [n, want] = rng.pick(options);
  const rows = rowsFor(switchCount(n));
  const k = rows.findIndex((r) => passes(n, r) === want);
  const r = rows[k];
  const feedback: Record<string, ChoiceFeedback> = {};
  rows.forEach((x, j) => {
    if (j === k) return;
    feedback[rowId(x)] = {
      headline: `In your case, ${t.lamp} is ${lampWord(!want)}. ${cap(decider(n, x, t))}.`,
      detail: [...explainRow(n, x, t), `Only one case leaves ${t.lamp} ${lampWord(want)}: ${rowShort(r, t)}.`],
      example: rowCase(n, x, j, t),
    };
  });
  const quiet = rows.map((_, j) => j).filter((j) => j !== k);
  const hk = rng.pick(quiet);
  return done(FAM_TAG[o.fam], 'case', {
    kind: 'choose',
    prompt: `${t.setting} This circuit has ${words(n, t)}. Which case ${want ? `turns ${t.lamp} on` : `leaves ${t.lamp} off`}?`,
    scene: circuitScene([frame(n, t)]),
    choices: rows.map((x) => ({ id: rowId(x), label: rowShort(x, t) })),
    answer: rowId(r),
    explain: explainRow(n, r, t).join(' '),
    feedback,
    hint: 'Here is one case, worked out. Check each other case the same way.',
    hintCase: rowCase(n, rows[hk], hk, t, `One case: ${rowShort(rows[hk], t)}.`),
    teach: circuitTeach(n, t, r, { cases: rows.map((x, j) => rowCase(n, x, j, t)) }),
  }, [n], t, r);
}

/** A case for two circuits side by side: both lamps, and whether they agree. */
function pairCase(n1: Net, n2: Net, r: Row, k: number, t: Topic, names = ['Circuit 1', 'Circuit 2']): TeachCase {
  const v1 = passes(n1, r);
  const v2 = passes(n2, r);
  return {
    label: `Row ${k + 1}: ${rowShort(r, t)}.`,
    truths: [{ who: `${names[0]}’s lamp`, value: v1 }, { who: `${names[1]}’s lamp`, value: v2 }],
    note: v1 === v2 ? 'The lamps agree in this row.' : 'The lamps differ in this row.',
    words: { ...LAMP_WORDS },
  };
}

const SAME_CHOICES: Choice[] = [{ id: 'yes', label: 'Yes. Their lamps agree in every row.' }, { id: 'no', label: 'No. Their lamps differ in at least one row.' }];

/** Each row in short, for both lamps: "Row 1: both off. Row 2: both off." */
const bothLine = (n1: Net, n2: Net) =>
  rowsFor(2).map((r, j) => {
    const v1 = passes(n1, r);
    const v2 = passes(n2, r);
    return v1 === v2 ? `Row ${j + 1}: both ${lampWord(v1)}.` : `Row ${j + 1}: lamp 1 ${lampWord(v1)}, lamp 2 ${lampWord(v2)}.`;
  }).join(' ');

/** Do these two circuits do the same job? `same`: a pair that looks different with the same table (the trap). */
export function sameItem(rng: Rng, o: CircuitOptions & { same: boolean; pair?: [Net, Net] }): CircuitMade {
  const t = pickTopic(rng, o.skin, o.avoid);
  const [n1, n2] = rng.shuffle(o.pair ?? rng.pick(o.same ? SAME_PAIRS : DIFF_PAIRS));
  const same = sameJob(n1, n2);
  const rows = rowsFor(2);
  const diff = differRows(n1, n2);
  const feedback: Record<string, ChoiceFeedback> = {};
  if (same) {
    const k = rows.findIndex((r) => passes(n1, r));
    feedback.no = {
      headline: 'Your answer says they differ, but their lamps agree in all four rows.',
      detail: ['They look different, but they do the same job.', bothLine(n1, n2)],
      example: pairCase(n1, n2, rows[k], k, t),
    };
  } else {
    const k = diff[0];
    const r = rows[k];
    feedback.yes = {
      headline: `Your answer says they do the same job, but their lamps differ in row ${k + 1}.`,
      detail: [`In row ${k + 1}, ${rowClause(r, t)}.`, `Circuit 1: ${explainRow(n1, r, t).join(' ')}`, `Circuit 2: ${explainRow(n2, r, t).join(' ')}`],
      example: pairCase(n1, n2, r, k, t),
    };
  }
  const agree = rows.map((_, j) => j).filter((j) => !diff.includes(j));
  const hk = rng.pick(agree);
  const trapTag = same && netId(n1) !== netId(n2);
  // Intuition points the wrong way for a pair that looks different with the same table, and for Stop 9's NOT on each part.
  const lookAlike = DIFF_PAIRS.slice(0, 2).some(([x, y]) => [netId(x), netId(y)].sort().join() === [netId(n1), netId(n2)].sort().join());
  return done('match', 'same', {
    kind: 'choose',
    prompt: `${t.setting} Here are two circuits. Do they do the same job, with ${t.lamp} the same in every row?`,
    scene: circuitScene([frame(n1, t, { name: 'Circuit 1' }), frame(n2, t, { name: 'Circuit 2' })]),
    choices: SAME_CHOICES.map((c) => ({ ...c })),
    answer: same ? 'yes' : 'no',
    explain: same ? `Their lamps agree in every row. ${bothLine(n1, n2)} They look different, but they do the same job.` : `Their lamps differ in ${diff.length === 1 ? `row ${diff[0] + 1}` : `rows ${listAnd(diff.map((j) => String(j + 1)))}`}. So they do not do the same job, even if they look alike.`,
    feedback,
    hint: 'Here is one row, worked out for both circuits. Check every other row the same way.',
    hintCase: pairCase(n1, n2, rows[hk], hk, t),
    teach: {
      rule: 'Two circuits do the same job only when their lamps agree in every row. How they look does not decide it.',
      terms: termsFor([n1, n2], [T_TABLE, T_SAME]),
      meaning: `Circuit 1 has ${words(n1, t)}. Circuit 2 has ${words(n2, t)}.`,
      casesTitle: 'Both lamps in every row',
      cases: rows.map((r, j) => pairCase(n1, n2, r, j, t)),
      remember: ['Same job means the same lamp in every row.', 'Ask: “Is there a row where one lamp is on and the other is off?”'],
      simpler: [`Take row 1: ${rowShort(rows[0], t)}.`, `Circuit 1: ${explainRow(n1, rows[0], t).join(' ')}`, `Circuit 2: ${explainRow(n2, rows[0], t).join(' ')}`, 'Do the same for every row. One row that differs is enough to say no.'],
    },
    scratch: lampScratch([n1, n2], t, 's10-pair-board'),
    scratchLabel: 'the table board',
    ...(same || lookAlike ? { conflict: true } : {}),
    ...(trapTag ? { tags: [LOOKS_DIFFER.tag] } : {}),
    seconds: SECONDS,
  }, [n1, n2], t);
}

/** Which circuit has this table? Three circuits, one right. The right one may look different from the obvious one. */
export function matchItem(rng: Rng, o: CircuitOptions): CircuitMade {
  const t = pickTopic(rng, o.skin, o.avoid);
  const target = rng.pick(MATCH_POOL);
  const col = lampColumn(target, 2);
  // The right circuit: the target, or (half the time) a circuit that looks different with the same table.
  const twins = MATCH_POOL.filter((x) => netId(x) !== netId(target) && sameJob(x, target));
  const right = twins.length && rng.chance(0.5) ? rng.pick(twins) : target;
  const others = rng.shuffle(MATCH_POOL.filter((x) => !sameJob(x, target)));
  // Two wrong circuits with different tables, the nearest first (fewest rows that differ).
  others.sort((x, y) => differRows(x, target).length - differRows(y, target).length);
  const wrongs: Net[] = [];
  for (const x of others) {
    if (wrongs.length === 2) break;
    if (wrongs.some((w) => sameJob(w, x))) continue;
    wrongs.push(x);
  }
  const shown = rng.shuffle([right, ...wrongs]);
  const nameOf = (x: Net) => `Circuit ${shown.indexOf(x) + 1}`;
  const rows = rowsFor(2);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) {
    const k = differRows(w, target)[0];
    const r = rows[k];
    feedback[netId(w)] = {
      headline: `${nameOf(w)} does not match the table in row ${k + 1}.`,
      detail: [`In row ${k + 1}, ${rowClause(r, t)}.`, ...explainRow(w, r, t), `The table says ${t.lamp} is ${lampWord(col[k])} there. One row that does not match rules a circuit out.`],
      example: { label: `${nameOf(w)}, row ${k + 1}: ${rowShort(r, t)}.`, truths: [{ who: `${nameOf(w)}’s lamp`, value: passes(w, r) }, { who: 'The table', value: col[k] }], note: 'They differ in this row.', words: { ...LAMP_WORDS } },
    };
  }
  // The hint: a wrong circuit, in a row where it matches the table, so one row is shown not to be enough.
  const hw = wrongs.find((w) => differRows(w, target).length < rows.length) ?? wrongs[0];
  const hk = Math.max(0, rows.findIndex((r, j) => passes(hw, r) === col[j]));
  const columnCase = (x: Net): TeachCase => ({
    label: `${nameOf(x)}: ${words(x, t)}.`,
    truths: rows.map((r, j): Truth => ({ who: `Row ${j + 1}`, value: passes(x, r) })),
    note: sameJob(x, target) ? 'It matches the table in every row.' : `It does not match row ${differRows(x, target)[0] + 1}.`,
    words: { ...LAMP_WORDS },
  });
  return done('match', 'match', {
    kind: 'choose',
    prompt: `${t.setting} Here is a table for ${t.lamp}. Which circuit has this table?`,
    scene: circuitScene(shown.map((x) => frame(x, t, { name: nameOf(x) })), { table: circuitTable([target], t) }),
    choices: shown.map((x) => ({ id: netId(x), label: nameOf(x) })),
    answer: netId(right),
    explain: `${nameOf(right)} matches the table in every row. ${lampRule(right, t)}`,
    feedback,
    hint: 'Here is one circuit checked in one row. One row is not enough, so check every row.',
    hintCase: {
      label: `${nameOf(hw)}, row ${hk + 1}: ${rowShort(rows[hk], t)}.`,
      truths: [{ who: `${nameOf(hw)}’s lamp`, value: passes(hw, rows[hk]) }, { who: 'The table', value: col[hk] }],
      note: 'They match in this row. Check the other rows too.',
      words: { ...LAMP_WORDS },
    },
    teach: {
      rule: 'A circuit has a table when its lamp agrees with the table in every row. One row that does not match rules it out.',
      terms: termsFor(shown, [T_TABLE, T_SAME]),
      meaning: `The table says: ${lampRule(target, t)}`,
      casesTitle: 'Each circuit’s lamp in every row',
      cases: shown.map(columnCase),
      remember: ['Check every row. One row that differs rules a circuit out.', 'Ask: “Does this lamp match the table in every row?”'],
      simpler: [`Take one circuit and row 1: ${rowShort(rows[0], t)}.`, 'Follow the power. Is the lamp on or off? Compare it with the table.', 'If it differs, cross that circuit out. If it matches, go on to the next row.'],
    },
    seconds: SECONDS,
  }, [right, ...wrongs], t);
}

// ---------- Lesson 5: the two-way pair next to side by side, and which circuit has a table ----------

/** The hall's twin from Lesson 2: plain switches with the same names, side by side. */
export const SIDE_TWIN: Net = SIDE(A, B);
/** "True" in a table that two-way and plain switches share. */
export const T_TRUE: Term = { word: 'True in a table', meaning: 'up for a two-way switch, and closed for a plain switch. False is down or open.' };
export const TRUE_CAPTION = 'True means up for a two-way switch, and closed for a plain switch.';

export const COMPARE_CHOICES: Choice[] = [
  { id: 'only-side', label: 'Only the side-by-side lamp' },
  { id: 'only-two', label: 'Only the two-way lamp' },
  { id: 'both', label: 'Both lamps' },
  { id: 'neither', label: 'Neither lamp' },
];
/** A compare choice from the two lamps, and the two lamps a choice says. */
const compareId = (two: boolean, side: boolean) => (two && side ? 'both' : side ? 'only-side' : two ? 'only-two' : 'neither');
const compareSays = (id: string): [boolean, boolean] => [id === 'both' || id === 'only-two', id === 'both' || id === 'only-side'];

/** One row on both circuits: each switch, and both lamps. */
function compareCase(r: Row, k: number, t: Topic, label = `Row ${k + 1}. Two-way pair: ${rowShort(r, t, TWO)}. Side by side: ${rowShort(r, t, SIDE_TWIN)}.`): TeachCase {
  const two = passes(TWO, r);
  const side = passes(SIDE_TWIN, r);
  return {
    label,
    truths: [{ who: 'The two-way lamp', value: two }, { who: 'The side-by-side lamp', value: side }],
    note: two === side ? 'The lamps agree in this row.' : 'The lamps differ in this row.',
    words: { ...LAMP_WORDS },
  };
}

/**
 * One row on two circuits: the two-way pair, and plain switches with the same names side by side. Which lamps are on?
 * `trap`: row 1, both up next to both closed, where side by side is on and the two-way pair is off (the trap of
 * Lesson 5). Otherwise another row (`row` picks it), where the two lamps agree.
 */
export function compareItem(rng: Rng, o: CircuitOptions & { trap?: boolean; row?: number }): CircuitMade {
  const t = pickTopic(rng, o.skin, o.avoid, TWO_TOPICS);
  const rows = rowsFor(2);
  const k = o.row ?? (o.trap ? 0 : rng.pick([1, 2, 3]));
  const r = rows[k];
  const tTwo: Topic = { ...t, lamp: 'the two-way lamp' };
  const tSide: Topic = { ...t, lamp: 'the side-by-side lamp' };
  const two = passes(TWO, r);
  const side = passes(SIDE_TWIN, r);
  const answer = compareId(two, side);
  const trap = isTrap('both-up', TWO, r);
  const both = [`Two-way pair: ${explainRow(TWO, r, tTwo).join(' ')}`, `Side by side: ${explainRow(SIDE_TWIN, r, tSide).join(' ')}`];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of COMPARE_CHOICES) {
    if (c.id === answer) continue;
    const [sTwo, sSide] = compareSays(c.id);
    feedback[c.id] = {
      headline: sTwo !== two ? `Your answer has the two-way lamp ${lampWord(sTwo)}, but ${decider(TWO, r, t)}.` : `Your answer has the side-by-side lamp ${lampWord(sSide)}, but ${decider(SIDE_TWIN, r, t)}.`,
      detail: both,
      example: compareCase(r, k, t, `This row. Two-way pair: ${rowShort(r, t, TWO)}. Side by side: ${rowShort(r, t, SIDE_TWIN)}.`),
    };
  }
  const h = rng.pick(rows.map((_, j) => j).filter((j) => j !== k));
  return done('xor', 'compare', {
    kind: 'choose',
    prompt: `${t.setting} Beside it, a second lamp has plain switches with the same names, side by side. In the two-way pair, ${rowClause(r, t, TWO)}. Side by side, ${rowClause(r, t, SIDE_TWIN)}. Which lamps are on?`,
    scene: circuitScene([frame(TWO, t, { name: 'Two-way pair', row: r, lamp: null }), frame(SIDE_TWIN, t, { name: 'Side by side', row: r, lamp: null })]),
    choices: rng.shuffle(COMPARE_CHOICES).map((c) => ({ ...c })),
    answer,
    explain: `${both.join(' ')}${trap ? ' Side by side is OR, so both closed is on. A two-way pair is one but not both, so both up is off.' : ''}`,
    feedback,
    hint: 'Here is another row, worked out for both circuits. Work out each lamp in your row the same way.',
    hintCase: compareCase(rows[h], h, t, `Another row. Two-way pair: ${rowShort(rows[h], t, TWO)}. Side by side: ${rowShort(rows[h], t, SIDE_TWIN)}.`),
    teach: {
      rule: `${TWO_RULE} ${SIDE_RULE}`,
      terms: termsFor([TWO, SIDE_TWIN]),
      meaning: 'Side by side is OR: one closed path or both lights the lamp. A two-way pair is one but not both: its lamp is on only when the switches differ.',
      casesTitle: 'Both lamps in every row',
      cases: rows.map((x, j) => compareCase(x, j, t)),
      remember: ['Work out each lamp on its own.', 'Ask: “Do the two-way switches match or differ?”'],
      simpler: [`In the two-way pair, ${rowClause(r, t, TWO)}.`, ...explainRow(TWO, r, tTwo), `Side by side: ${explainRow(SIDE_TWIN, r, tSide).join(' ')}`],
    },
    ...(trap ? { conflict: true, tags: [BOTH_UP.tag] } : {}),
    seconds: SECONDS,
  }, [TWO, SIDE_TWIN], t, r);
}

/**
 * Which circuit has this table? The two-way pair, plain switches side by side, and plain switches in a line, all with
 * the same switch names. The table is one of their three tables (the two-way pair's half the time), in True and False:
 * up or closed is True. Exactly one circuit matches every row; the two-way pair and side by side differ only in row 1.
 */
export function pickItem(rng: Rng, o: CircuitOptions & { target?: Net }): CircuitMade {
  const t = pickTopic(rng, o.skin, o.avoid, TWO_TOPICS);
  const target = o.target ?? rng.pick([TWO, TWO, PICK_POOL[1], PICK_POOL[2]]);
  const col = lampColumn(target, 2);
  const shown = rng.shuffle([...PICK_POOL]);
  const matching = shown.filter((x) => sameJob(x, target));
  if (matching.length !== 1) throw new Error('pickItem: exactly one circuit must have the table');
  const right = matching[0];
  const wrongs = shown.filter((x) => x !== right);
  const nameOf = (x: Net) => `Circuit ${shown.indexOf(x) + 1}`;
  const rows = rowsFor(2);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) {
    const k = differRows(w, target)[0];
    const r = rows[k];
    feedback[netId(w)] = {
      headline: `${nameOf(w)} does not match the table in row ${k + 1}.`,
      detail: [`In row ${k + 1}, ${rowClause(r, t, w)}.`, ...explainRow(w, r, t), `The table says ${t.lamp} is ${lampWord(col[k])} there. One row that does not match rules a circuit out.`],
      example: { label: `${nameOf(w)}, row ${k + 1}: ${rowShort(r, t, w)}.`, truths: [{ who: `${nameOf(w)}’s lamp`, value: passes(w, r) }, { who: 'The table', value: col[k] }], note: 'They differ in this row.', words: { ...LAMP_WORDS } },
    };
  }
  // The hint: a wrong circuit in a row where it matches the table, so one row is shown not to be enough.
  const hw = rng.pick(wrongs);
  const hk = rng.pick(rows.map((_, j) => j).filter((j) => passes(hw, rows[j]) === col[j]));
  const columnCase = (x: Net): TeachCase => ({
    label: `${nameOf(x)}: ${words(x, t)}.`,
    truths: rows.map((r, j): Truth => ({ who: `Row ${j + 1}`, value: passes(x, r) })),
    note: sameJob(x, target) ? 'It matches the table in every row.' : `It does not match row ${differRows(x, target)[0] + 1}.`,
    words: { ...LAMP_WORDS },
  });
  return done('xor', 'pick', {
    kind: 'choose',
    prompt: `${t.setting} Three circuits could work ${t.lamp}. Here is the table ${t.lamp} must have. Which circuit has this table?`,
    scene: circuitScene(shown.map((x) => frame(x, t, { name: nameOf(x) })), { table: circuitTable([target], t, { inputWords: TRUE_FALSE }), caption: TRUE_CAPTION }),
    choices: shown.map((x) => ({ id: netId(x), label: nameOf(x) })),
    answer: netId(right),
    explain: `${nameOf(right)} matches the table in every row. ${lampRule(right, t)}`,
    feedback,
    hint: 'Here is one circuit checked in one row. One row is not enough, so check every row.',
    hintCase: {
      label: `${nameOf(hw)}, row ${hk + 1}: ${rowShort(rows[hk], t, hw)}.`,
      truths: [{ who: `${nameOf(hw)}’s lamp`, value: passes(hw, rows[hk]) }, { who: 'The table', value: col[hk] }],
      note: 'They match in this row. Check the other rows too.',
      words: { ...LAMP_WORDS },
    },
    teach: {
      rule: `A circuit has a table when its lamp agrees with the table in every row. One row that does not match rules it out. ${TRUE_CAPTION}`,
      terms: termsFor(shown, [T_TABLE, T_TRUE]),
      meaning: `The table says: ${lampRule(target, t)}`,
      casesTitle: 'Each circuit’s lamp in every row',
      cases: shown.map(columnCase),
      remember: ['Check every row. One row that differs rules a circuit out.', 'Ask: “Does this lamp match the table in every row?”'],
      simpler: ['Start with row 1, where every switch is True: up for the two-way pair, and closed for the others.', 'Work out each lamp. Cross a circuit out as soon as one row does not match.'],
    },
    seconds: SECONDS,
  }, [right, ...wrongs], t);
}

// ---------- the closing why items ----------

export type WhyKind = 'line-off' | 'side-both' | 'flip-closed' | 'same' | 'differ' | 'two-match';
export const WHY_KINDS: readonly WhyKind[] = ['line-off', 'side-both', 'flip-closed', 'same', 'differ', 'two-match'];
export const WHY_LESSON: Record<WhyKind, string> = { 'line-off': 's10.l1', 'side-both': 's10.l2', 'flip-closed': 's10.l3', same: 's10.l4', differ: 's10.l4', 'two-match': 's10.l5' };
const WHY_TAG: Record<WhyKind, string> = { 'line-off': 'series', 'side-both': 'parallel', 'flip-closed': 'not', same: 'match', differ: 'match', 'two-match': 'xor' };

/** The lamp a why item's story states, worked out from the model: the story must match it. */
function lampFor(n: Net, r: Row, story: boolean): boolean {
  const on = passes(n, r);
  if (on !== story) throw new Error('whyItem: the story’s lamp does not match the circuit');
  return on;
}

/** Why is the lamp on or off, or why do two circuits do the same job (or not)? The choices are reasons; one is right. */
export function whyItem(rng: Rng, o: { kind?: WhyKind; skin?: Skin } = {}): CircuitMade & { why: WhyKind } {
  const kind = o.kind ?? rng.pick(WHY_KINDS);
  const t = pickTopic(rng, o.skin ?? rng.pick(SKINS), undefined, kind === 'two-match' ? TWO_TOPICS : TOPICS);
  const rows = rowsFor(2);
  const make = (item: Omit<ItemCore, 'kind' | 'tags' | 'seconds'>, nets: Net[], row?: Row) => ({
    ...done(WHY_TAG[kind], 'why', { kind: 'choose', ...item, choices: rng.shuffle(item.choices), tags: ['why'], seconds: SECONDS }, nets, t, row),
    why: kind,
  });
  if (kind === 'two-match') {
    // Both up or both down: the switches match, so the lamp is off.
    const n = TWO;
    const r = rng.pick([rows[0], rows[3]]);
    const up = r[0];
    const differ = rng.pick([rows[1], rows[2]]);
    const kd = rows.indexOf(differ);
    const other = up ? rows[3] : rows[0];
    const ko = rows.indexOf(other);
    return make({
      prompt: `${t.setting} This circuit has ${words(n, t)}. Both switches are ${pos(up)}, and ${t.lamp} is off. Why is it off?`,
      scene: circuitScene([frame(n, t, { row: r, lamp: lampFor(n, r, false) })]),
      choices: [
        { id: 'match', label: 'The switches match, so their levers touch different wires. The lamp is on only when they differ.' },
        { id: 'gap', label: `A two-way switch that is ${pos(up)} leaves a gap, like an open switch.` },
        { id: 'turns', label: 'Only one switch of a two-way pair can work at a time.' },
        { id: 'needs', label: `The lamp needs both switches ${pos(!up)} before it turns on.` },
      ],
      answer: 'match',
      explain: `Both switches are ${pos(up)}, so they match. Their levers touch different wires, so power has no path, and ${t.lamp} is off.`,
      feedback: {
        gap: {
          headline: 'Your reason gives a two-way switch a gap, but its lever always touches one of its two wires.',
          detail: [`Up or down, a two-way switch sends power along one wire.`, `Here ${t.lamp} is off because the two levers touch different wires.`],
          example: rowCase(n, differ, kd, t, `One up and one down: ${rowShort(differ, t, n)}.`),
        },
        turns: {
          headline: 'Your reason makes up a rule: both switches of a two-way pair work at once.',
          detail: [`Flip either switch, and ${t.lamp} changes.`, `Here it is off because both switches are ${pos(up)}, so they match.`],
          example: rowCase(n, differ, kd, t, `One up and one down: ${rowShort(differ, t, n)}.`),
        },
        needs: {
          headline: `Your reason says the lamp needs both switches ${pos(!up)}, but then they match too, and the lamp is off.`,
          detail: [`Both up or both down, the switches match, so ${t.lamp} is off.`, 'The lamp is on only when one switch is up and the other is down.'],
          example: rowCase(n, other, ko, t, `Both ${pos(!up)}: ${rowShort(other, t, n)}.`),
        },
      },
      hint: 'Here is another case of this circuit, worked out. Compare it with your case.',
      hintCase: rowCase(n, differ, kd, t, `Another case: ${rowShort(differ, t, n)}.`),
      teach: circuitTeach(n, t, r),
    }, [n], r);
  }
  if (kind === 'line-off') {
    const n = LINE(A, B);
    const r = rng.pick(rows.filter((x) => x[0] !== x[1]));
    const c = r[0] ? 0 : 1;
    const op = 1 - c;
    const both = rows[0];
    return make({
      prompt: `${t.setting} This circuit has ${words(n, t)}. ${SwOf(c, t)} is closed, but ${t.lamp} is off. Why is it off?`,
      scene: circuitScene([frame(n, t, { row: r, lamp: lampFor(n, r, false) })]),
      choices: [
        { id: 'gap', label: `In a line, power must pass every switch, and ${swOf(op, t)} is open.` },
        { id: 'door', label: `A closed switch is like a shut door, so ${swOf(c, t)} stops the power.` },
        { id: 'turns', label: 'Only one switch in a line can be closed at a time.' },
        { id: 'all-open', label: 'The lamp needs every switch open before it turns on.' },
      ],
      answer: 'gap',
      explain: `${SwOf(c, t)} lets power pass, but ${swOf(op, t)} is open. In a line, power must pass every switch, so one gap keeps ${t.lamp} off.`,
      feedback: {
        door: {
          headline: 'Your reason treats a closed switch like a shut door, but a closed switch lets power pass.',
          detail: [`A closed switch has no gap, so power passes ${swOf(c, t)}.`, `Power stops at ${swOf(op, t)}, which is open. In a line, that one gap is enough.`],
          example: rowCase(n, both, 0, t, `Both closed: ${rowShort(both, t)}.`),
        },
        turns: {
          headline: 'Your reason makes up a rule: two switches in a line can both be closed.',
          detail: [`When both switches are closed, power passes both, and ${t.lamp} is on.`, `Here ${t.lamp} is off because ${swOf(op, t)} is open.`],
          example: rowCase(n, both, 0, t, `Both closed: ${rowShort(both, t)}.`),
        },
        'all-open': {
          headline: 'Your reason says the lamp needs every switch open, but with every switch open, power stops at the first gap.',
          detail: [`An open switch leaves a gap. With both switches open, ${t.lamp} is off.`, `Here the gap is at ${swOf(op, t)}. That is why ${t.lamp} is off.`],
          example: rowCase(n, rows[3], 3, t, `Both open: ${rowShort(rows[3], t)}.`),
        },
      },
      hint: 'Here is another case of this circuit, worked out. Find the gap in your case.',
      hintCase: rowCase(n, both, 0, t, `Another case: ${rowShort(both, t)}.`),
      teach: circuitTeach(n, t, r),
    }, [n], r);
  }
  if (kind === 'side-both') {
    const n = SIDE(A, B);
    const r = rows[0];
    const one = rng.pick([rows[1], rows[2]]);
    const k1 = rows.indexOf(one);
    return make({
      prompt: `${t.setting} This circuit has ${words(n, t)}. Both switches are closed, and ${t.lamp} is on. Why is it on?`,
      scene: circuitScene([frame(n, t, { row: r, lamp: lampFor(n, r, true) })]),
      choices: [
        { id: 'one-path', label: 'Side by side, one closed path is enough, so two closed paths are enough too.' },
        { id: 'needs-both', label: 'Side by side, the lamp needs every switch closed.' },
        { id: 'just-one', label: 'Side by side means just one switch, so the second one is not used.' },
        { id: 'stronger', label: 'Two closed switches make the battery stronger.' },
      ],
      answer: 'one-path',
      explain: `Side by side, power can take either path. One closed path is enough to light ${t.lamp}, and here both are closed.`,
      feedback: {
        'needs-both': {
          headline: 'Your reason would turn the lamp off when just one switch is closed, but one closed path is enough.',
          detail: [`Take ${rowShort(one, t)}.`, ...explainRow(n, one, t)],
          example: rowCase(n, one, k1, t),
        },
        'just-one': {
          headline: 'Your reason leaves a switch out, but power can take either path.',
          detail: [`Each switch has its own path. Close only ${swOf(one[0] ? 0 : 1, t)}, and ${t.lamp} is still on.`, 'Close both, and power has two paths. The lamp stays on.'],
          example: rowCase(n, one, k1, t),
        },
        stronger: {
          headline: 'Your reason is about the battery, but the switches only open or close paths.',
          detail: ['The battery is the same in every case.', `With just one switch closed, ${t.lamp} is on too. So the second switch is not what lights it.`],
          example: rowCase(n, one, k1, t),
        },
      },
      hint: 'Here is another case of this circuit, worked out. Compare it with your case.',
      hintCase: rowCase(n, one, k1, t, `Another case: ${rowShort(one, t)}.`),
      teach: circuitTeach(n, t, r),
    }, [n], r);
  }
  if (kind === 'flip-closed') {
    const n = rng.pick([FLIP(A), LINE(FLIP(A), B)]);
    const k = switchCount(n);
    const r = k === 1 ? [true] : rows[0];
    const openRow = k === 1 ? [false] : rows[2];
    const ko = k === 1 ? 1 : 2;
    const alone = SW(0);
    const lastId = k === 1 ? 'never' : 'gap-b';
    return make({
      prompt: `${t.setting} This circuit has ${words(n, t)}. ${SwOf(0, t)} is closed, but ${t.lamp} is off. Why is it off?`,
      scene: circuitScene([frame(n, t, { row: r, lamp: lampFor(n, r, false) })]),
      choices: [
        { id: 'flip', label: `${SwOf(0, t)} sits inside a flipper box, and the box does the opposite of its inside.` },
        { id: 'door', label: 'A closed switch always stops power, like a shut door.' },
        { id: 'always', label: 'A flipper box stops power in every case.' },
        k === 1 ? { id: 'never', label: 'A lamp can never be on while a switch is closed.' } : { id: 'gap-b', label: `${SwOf(1, t)} is open, so its gap stops the power.` },
      ],
      answer: 'flip',
      explain: `${SwOf(0, t)} is closed, so its inside would let power through. The flipper box does the opposite and stops power, so ${t.lamp} is off.`,
      feedback: {
        door: {
          headline: 'Your reason treats a closed switch like a shut door, but a closed switch lets power pass.',
          detail: [`On its own, ${swOf(0, t)} would light ${t.lamp} when it is closed.`, 'Here it sits inside a flipper box. The box does the opposite, and that stops the power.'],
          example: rowCase(alone, [true], 0, t, `${cap(swOf(0, t))} alone, closed.`),
        },
        always: {
          headline: 'Your reason says the box always stops power, but it lets power through when its switch is open.',
          detail: [`Open ${swOf(0, t)}, and its inside would stop power. Then the box does the opposite and lets power through.`, ...explainRow(n, openRow, t)],
          example: rowCase(n, openRow, ko, t),
        },
        [lastId]: k === 1
          ? {
            headline: 'Your reason says a closed switch always means off, but without a flipper box, a closed switch lights the lamp.',
            detail: [`The lamp is off here because of the flipper box, not because ${swOf(0, t)} is closed.`, `On its own, a closed switch lets power pass, and ${t.lamp} is on.`],
            example: rowCase(alone, [true], 0, t, `${cap(swOf(0, t))} alone, closed.`),
          }
          : {
            headline: `Your reason says ${swOf(1, t)} is open, but it is closed.`,
            detail: [`${SwOf(1, t)} is closed, so power passes it.`, `The stop is at ${swOf(0, t)}: it is closed inside a flipper box, so the box stops the power.`],
            example: rowCase(n, r, 0, t, `This case: ${rowShort(r, t)}.`),
          },
      },
      hint: 'Here is another case of this circuit, worked out. Compare it with your case.',
      hintCase: rowCase(n, openRow, ko, t, `Another case: ${rowShort(openRow, t)}.`),
      teach: circuitTeach(n, t, r),
    }, [n], r);
  }
  // Two circuits: the same job though they look different, or a different job though they look alike.
  const same = kind === 'same';
  const [n1, n2] = rng.shuffle(rng.pick((same ? SAME_PAIRS : DIFF_PAIRS).slice(0, 2)));
  const diff = differRows(n1, n2);
  if (sameJob(n1, n2) !== same) throw new Error('whyItem: the pair does not have the job the kind says');
  const agree = rows.map((_, j) => j).filter((j) => !diff.includes(j));
  const scene = circuitScene([frame(n1, t, { name: 'Circuit 1' }), frame(n2, t, { name: 'Circuit 2' })], { table: circuitTable([n1, n2], t) });
  const cases = rows.map((r, j) => pairCase(n1, n2, r, j, t));
  const teach: Teach = {
    rule: 'Two circuits do the same job only when their lamps agree in every row. How they look does not decide it.',
    terms: termsFor([n1, n2], [T_TABLE, T_SAME]),
    meaning: `Circuit 1 has ${words(n1, t)}. Circuit 2 has ${words(n2, t)}.`,
    casesTitle: 'Both lamps in every row',
    cases,
    remember: ['Same job means the same lamp in every row.', 'Ask: “Is there a row where one lamp is on and the other is off?”'],
    simpler: [bothLine(n1, n2), same ? 'No row differs, so they do the same job.' : `Row ${diff[0] + 1} differs, so they do not do the same job.`],
  };
  // A pair with the other answer, for the counterexample a looks-based reason needs: the same two switches in a line and
  // side by side (they differ), or a flipper box around a pair and a flipper box on each switch (they agree).
  const [o1, o2] = same ? DIFF_PAIRS[2] : SAME_PAIRS[0];
  const od = differRows(o1, o2);
  const ok = same ? od[0] : 3;
  const otherCase: TeachCase = {
    ...pairCase(o1, o2, rows[ok], ok, t, ['The first circuit', 'The second circuit']),
    label: same
      ? `Two other circuits: the same two switches in a line, then side by side. Row ${ok + 1}: ${rowShort(rows[ok], t)}.`
      : `Two other circuits: a flipper box around a pair, and a flipper box on each switch. Row ${ok + 1}: ${rowShort(rows[ok], t)}.`,
  };
  if (same) {
    const k = agree[agree.length - 1];
    return make({
      prompt: `${t.setting} These two circuits look different. Why do they do the same job?`,
      scene,
      choices: [
        { id: 'rows', label: 'Their lamps agree in every row of the table.' },
        { id: 'switches', label: 'They use the same two switches.' },
        { id: 'one-row', label: `Their lamps agree in row ${k + 1}.` },
        { id: 'flippers', label: 'They both have flipper boxes in them.' },
      ],
      answer: 'rows',
      explain: `${bothLine(n1, n2)} The lamps agree in every row, so the two circuits do the same job.`,
      feedback: {
        switches: {
          headline: 'Your reason is true, but using the same switches is not enough.',
          detail: [`Two switches in a line and the same two side by side use the same switches. Their lamps differ in row ${od[0] + 1}.`, 'Only a match in every row shows the same job.'],
          example: otherCase,
        },
        'one-row': {
          headline: 'Your reason checks one row, but the same job needs every row to agree.',
          detail: ['Two circuits can agree in one row and differ in another.', `Here they agree in all four rows: ${bothLine(n1, n2)}`],
          example: otherCase,
        },
        flippers: {
          headline: 'Your reason is about how they look, but looks do not decide the job.',
          detail: ['Two circuits with flipper boxes can still do different jobs.', `What decides it is the table. ${bothLine(n1, n2)}`],
          example: cases[k],
        },
      },
      hint: 'Here is one row, worked out for both circuits. Look at the other rows too.',
      hintCase: cases[agree[0]],
      teach,
    }, [n1, n2]);
  }
  const k = diff[0];
  const j = agree[0];
  return make({
    prompt: `${t.setting} These two circuits look alike. Why do they not do the same job?`,
    scene,
    choices: [
      { id: 'row', label: `In row ${k + 1}, one lamp is on and the other is off.` },
      { id: 'looks', label: 'Their flipper boxes are in different places.' },
      { id: 'switches', label: 'They do not use the same switches.' },
      { id: 'some', label: `Their lamps agree in row ${j + 1}.` },
    ],
    answer: 'row',
    explain: `In row ${k + 1}, ${rowClause(rows[k], t)}. Lamp 1 is ${lampWord(passes(n1, rows[k]))}, but lamp 2 is ${lampWord(passes(n2, rows[k]))}. One row that differs is enough.`,
    feedback: {
      looks: {
        headline: 'Your reason is about looks, but circuits that look different can still do the same job.',
        detail: ['A flipper box around a pair and a flipper box on each switch can do the same job.', `What decides it is the table. Here row ${k + 1} differs.`],
        example: otherCase,
      },
      switches: {
        headline: `Your reason is not true here: both circuits use ${swNames(t.names.slice(0, 2))}.`,
        detail: ['The switches are the same. What differs is how they are wired.', `You can see it in row ${k + 1}: one lamp is on and the other is off.`],
        example: cases[k],
      },
      some: {
        headline: `Your reason points to row ${j + 1}, where they agree, so it can’t show a difference.`,
        detail: ['A row where the lamps agree tells you nothing new.', `Look for a row where they differ. Row ${k + 1} is one.`],
        example: cases[k],
      },
    },
    hint: 'Here is one row, worked out for both circuits. Look at the other rows too.',
    hintCase: cases[j],
    teach,
  }, [n1, n2]);
}

// ---------- the warm-up: a Stop 9 fill-the-column item ----------

/**
 * Back to Truth Tables: which column is right for an AND, OR or NOT sentence? It is Stop 9's own item (tables.ts
 * columnItem), so its answer, feedback and hint come from the truth table there. A line works like AND and side by side
 * like OR, so this is the idea Circuit Lab builds on.
 */
export function bridgeItem(rng: Rng): TableMade {
  const skin = rng.pick<TableSkin>(['letters', 'everyday', 'fantasy']);
  const m = tableColumnItem(rng, { skin, family: rng.pick(['single', 'helper'] as const) });
  return { ...m, item: { ...m.item, prompt: `Back to Truth Tables. ${m.item.prompt}` } };
}

/** The labels every circuit board uses, so no board speaks of signs and test worlds. */
export const BOARD_WORDS = {
  says: 'Rule',
  world: 'Switches',
  so: 'So',
  ask: 'Can power get all the way around?',
  fit: 'Power gets through: the lamp is on.',
  unfit: 'Power stops: the lamp is off.',
  worldTag: 'Switches',
  truth: 'on',
  untruth: 'off',
  needs: '',
  closing: 'Back to the board: follow the power from the battery to the lamp.',
};
