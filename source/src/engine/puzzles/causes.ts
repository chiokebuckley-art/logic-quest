/**
 * Cause or just together? (Stop 7, Lesson 3): causation. A cause makes something happen. Two things that happen
 * together are not enough to show that one causes the other.
 *
 * The model is a small table. Each row is one test (or one day). The columns are some things that might be the cause
 * (candidates) and the thing that happens or not (the effect), each Yes or No.
 *
 * In these puzzles one thing makes the effect happen, so a cause passes two checks:
 *   check 1      when it happens, the effect happens (it works every time), unless the table names something that
 *                stops it: a row with a note, where the candidate happens but the effect does not, is excused
 *   check 2      when it does not happen, the effect does not happen (nothing else makes the effect); no note excuses
 *                a row where the effect comes without it
 *   follows      both checks pass (Yes with Yes, No with No, in every row)
 *   alone        two rows change only this candidate: every other candidate stays the same (a fair test)
 *   the cause    follows, and changed alone at least once
 *   not          a row breaks check 1 or check 2 (breakKind names which)
 *   can’t tell   follows, but never changed alone: another candidate always changed with it
 *
 * Who made the rows matters (sourceOf): tests someone set up (one thing changed on purpose) can show a cause; records
 * someone wrote down can rule a cause out, never in, because things nobody wrote down changed too (causeVerdict).
 *
 * Generated tables are clean: every candidate that follows either changes alone or has a twin (a candidate with the
 * very same column), so “can’t tell yet” always means “two things always changed together”.
 *
 * Four question kinds, each computed from a table:
 *   cause-which      a test table: which thing is the cause? (or: does a claim about one thing hold?)
 *   cause-cant-tell  a test table where two things always change together: can’t tell yet
 *   cause-together   records of days where two things go together: does one cause the other? Not yet (records are
 *                    not a fair test), or No when one day breaks it (conflict: “together means cause”)
 *   cause-third      a common cause: a third thing comes with both, and one day blocks one of them, so one comes
 *                    without the other: No, and the third thing may cause both (can-fail)
 *
 * The lesson teaches two distinctions apart (WORKS_VS_ONLY_CAUSE, TESTS_VS_RECORDS), each with a contrast card and a
 * board, and every board names the beliefs its wrong marks can show (causeMisconceptions: one-way-follow and
 * records-as-test), with “I’m confused” questions (worksConfused, recordsConfused).
 */
import { syncWhyWrong } from '../teach';
import type {
  BoardWords,
  ChoiceFeedback,
  ConfusedQuestion,
  ContrastPanel,
  Distinction,
  DrillMark,
  DrillOption,
  DrillRow,
  DrillStep,
  IdeaCard,
  Misconception,
  Rng,
  Scene,
  Teach,
  TeachCase,
  Truth,
} from '../types';
import type { ItemCore, Made } from './statements';

// ---------- the model ----------

/** One column of a table: a thing that happens or not. */
export interface Factor {
  /** Column label: “Switch flipped”. */
  label: string;
  /** In a sentence: “the switch”. A candidate’s noun is always singular. */
  noun: string;
  /** When it happens: “the switch is flipped”. */
  on: string;
  /** When it does not: “the switch is not flipped”. */
  off: string;
  /** An effect: what a cause makes happen, after “makes”: “the lamp turn on”. */
  make?: string;
  /** The noun is plural (“the sparks”): “the sparks follow”, not “follows”. */
  plural?: boolean;
}

export interface TableRow {
  /** One value per candidate, in order. */
  v: boolean[];
  /** The effect. */
  e: boolean;
  /** Drawn after the row’s name: “Day 4: shop closed”. */
  note?: string;
}

export interface Table {
  /** What one row is: “test”, “day”, “game”, “night”. */
  word: string;
  cands: Factor[];
  effect: Factor;
  rows: TableRow[];
  /** Who made the rows. Default: tests when a row is a “test”, else records (days, games, weeks, nights). */
  made?: Source;
}

/** Who made a table’s rows: tests someone set up (one thing changed on purpose), or records someone wrote down. */
export type Source = 'tests' | 'records';
export const sourceOf = (t: Table): Source => t.made ?? (t.word === 'test' ? 'tests' : 'records');

export type Verdict = 'cause' | 'not' | 'cant';

export const column = (t: Table, c: number) => t.rows.map((r) => r.v[c]);

/**
 * A row where something stops candidate c: the table names a block (the row has a note), c happens, and the effect
 * does not. Check 1 (a cause works every time) has this one exception; check 2 has none.
 */
export const stoppedRow = (r: TableRow, c: number) => !!r.note && r.v[c] && !r.e;

/** The first row where the effect does not match candidate c (and nothing named stopped it), or -1 when it follows. */
export function breakRow(t: Table, c: number): number {
  return t.rows.findIndex((r) => r.v[c] !== r.e && !stoppedRow(r, c));
}

/**
 * The one meaning of “a cause”, used by card 1 and every item’s terms. In these puzzles one thing makes the effect, so
 * a cause passes two checks: it works every time (check 1, which a named stopper can excuse), and nothing else makes
 * the effect (check 2, which nothing excuses).
 */
export const CAUSE_RULE =
  'In these puzzles, one thing makes the effect happen. So a cause passes two checks. When it happens, the effect happens, unless the table names something that stopped it. When it does not happen, the effect does not happen.';
export const CAUSE_TERM = { word: 'A cause', meaning: `something that makes another thing happen. ${CAUSE_RULE}` };

/**
 * The two ways a row can break candidate c:
 *  - 'no-effect' (check 1): c happened and the effect did not. It did not work. A note naming what stopped it excuses it.
 *  - 'without' (check 2): the effect happened without c. Something else made it happen, and no note excuses that.
 */
export type BreakKind = 'no-effect' | 'without';
export const kindAt = (r: TableRow, c: number): BreakKind | null => (r.v[c] === r.e ? null : r.v[c] ? 'no-effect' : 'without');
/** The kind of the first row that breaks c, or null when the effect follows it. */
export function breakKind(t: Table, c: number): BreakKind | null {
  const i = breakRow(t, c);
  return i < 0 ? null : kindAt(t.rows[i], c);
}
/** The kind of every row that breaks c (a row a note excuses does not break it). */
export const breakKinds = (t: Table, c: number): BreakKind[] =>
  t.rows.flatMap((r) => (r.v[c] !== r.e && !stoppedRow(r, c) ? [kindAt(r, c)!] : []));
/** Check 1: in every row where c happens, the effect happens, or the table names what stopped it. */
export const check1 = (t: Table, c: number) => t.rows.every((r) => !r.v[c] || r.e || stoppedRow(r, c));
/** Check 2: in every row where c does not happen, the effect does not happen. */
export const check2 = (t: Table, c: number) => t.rows.every((r) => r.v[c] || !r.e);
/** Could a note that names what stopped c excuse this row? Only a check 1 break can be excused. */
export const noteCanSave = (r: TableRow, c: number) => stoppedRow({ ...r, note: r.note ?? 'a stopper' }, c);

/** “made the lamp turn on”, for an effect. */
const madeIt = (e: Factor) => (e.make ? `made ${e.make}` : 'made it happen');

/**
 * The check that breaks, said on the row that breaks c. Check 1 (c happened, the effect did not) also says that the
 * table names nothing that stopped it there, so the exception does not apply. Check 2 (the effect came without c) says
 * that something else made the effect, which in these puzzles only one thing does.
 */
export function worksEvery(t: Table, c: number): string {
  const i = breakRow(t, c);
  return kindAt(t.rows[i], c) === 'no-effect'
    ? `Check 1 breaks: ${t.cands[c].noun} did not work, and the table names nothing that stopped it ${atRow(t, i)}.`
    : `Check 2 breaks: something else ${madeIt(t.effect)}. In these puzzles, only one thing does that.`;
}

export const followsAll = (t: Table, c: number) => breakRow(t, c) === -1;

/** The first pair of rows (i < j) where candidate c changes and every other candidate stays the same. */
export function alonePair(t: Table, c: number): [number, number] | null {
  for (let i = 0; i < t.rows.length; i++) {
    for (let j = i + 1; j < t.rows.length; j++) {
      const a = t.rows[i].v, b = t.rows[j].v;
      if (a[c] !== b[c] && a.every((x, k) => k === c || x === b[k])) return [i, j];
    }
  }
  return null;
}

/** Another candidate with the very same column as c (they always change together), or -1. */
export function twinOf(t: Table, c: number): number {
  const col = JSON.stringify(column(t, c));
  return t.cands.findIndex((_, k) => k !== c && JSON.stringify(column(t, k)) === col);
}

/** The verdict on c by the tests’ rule: it follows, and a fair test changes only it. */
export function verdict(t: Table, c: number): Verdict {
  if (!followsAll(t, c)) return 'not';
  return alonePair(t, c) ? 'cause' : 'cant';
}

/**
 * The verdict on c from who made the rows. Tests use the tests’ rule. Records can rule a cause out (a row breaks it),
 * but never in: things nobody wrote down changed too, so a thing that follows is “can’t tell yet”, even alone.
 */
export function causeVerdict(t: Table, c: number): Verdict {
  if (!followsAll(t, c)) return 'not';
  return sourceOf(t) === 'records' ? 'cant' : verdict(t, c);
}

/**
 * A fair test that shows changing c did nothing (tests only): two rows where only c changes and the effect stays the
 * same. This reason holds even outside the one-cause rule.
 */
export function nothingPair(t: Table, c: number): [number, number] | null {
  if (sourceOf(t) !== 'tests') return null;
  for (let i = 0; i < t.rows.length; i++) {
    for (let j = i + 1; j < t.rows.length; j++) {
      const a = t.rows[i], b = t.rows[j];
      if (a.v[c] !== b.v[c] && a.v.every((x, k) => k === c || x === b.v[k]) && a.e === b.e) return [i, j];
    }
  }
  return null;
}

/** The candidate that is the cause, 'cant' when none is but some can’t be told, or null (no candidate follows). */
export function tableAnswer(t: Table): number | 'cant' | null {
  const vs = t.cands.map((_, c) => verdict(t, c));
  const causes = vs.flatMap((v, c) => (v === 'cause' ? [c] : []));
  if (causes.length === 1) return causes[0];
  if (causes.length === 0 && vs.includes('cant')) return 'cant';
  return null;
}

/** Every candidate and the effect change somewhere; a candidate that follows changes alone or has a twin. */
export function isClean(t: Table): boolean {
  const varies = (xs: boolean[]) => xs.includes(true) && xs.includes(false);
  if (!varies(t.rows.map((r) => r.e))) return false;
  if (!t.cands.every((_, c) => varies(column(t, c)))) return false;
  return t.cands.every((_, c) => !followsAll(t, c) || !!alonePair(t, c) || twinOf(t, c) >= 0);
}

// ---------- words ----------

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const yn = (v: boolean) => (v ? 'yes' : 'no');
const plural = (word: string) => `${word}s`;
/** “test 3”, “day 2”. */
export const rowName = (t: Table, i: number) => `${t.word} ${i + 1}`;
/** “in test 3”, “on day 2”. */
const inWord = (t: Table) => ['test', 'game', 'week'].includes(t.word);
export const atRow = (t: Table, i: number) => `${inWord(t) ? 'in' : 'on'} ${rowName(t, i)}`;
/** “in every test”, “every day”. */
export const everyRow = (t: Table) => `${inWord(t) ? 'in ' : ''}every ${t.word}`;
/** “Test 3”, “Day 4: shop closed”. */
export const rowLabel = (t: Table, i: number) => `${cap(rowName(t, i))}${t.rows[i].note ? `: ${t.rows[i].note}` : ''}`;
const isOn = (f: Factor, v: boolean) => (v ? f.on : f.off);
/** “the lamp follows”, “the sparks follow”. */
const follow = (e: Factor) => `${e.noun} ${e.plural ? 'follow' : 'follows'}`;
const doesE = (e: Factor) => (e.plural ? 'do' : 'does');

/** “In test 3, the clock does not show 7:00, but the lamp is on.” c must not be followed in every row. */
export function breakWhy(t: Table, c: number): string {
  const i = breakRow(t, c);
  const r = t.rows[i];
  return `${cap(atRow(t, i))}, ${isOn(t.cands[c], r.v[c])}, but ${isOn(t.effect, r.e)}.`;
}

/** “in tests 1 and 3”, “on day 2”, “in no test”: the rows listed, for a compare row. */
export function rowsList(t: Table, idx: readonly number[]): string {
  const pre = inWord(t) ? 'In' : 'On';
  if (!idx.length) return `${pre} no ${t.word}.`;
  const ns = idx.map((i) => String(i + 1));
  const list = ns.length === 1 ? ns[0] : `${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
  return `${pre} ${ns.length === 1 ? t.word : plural(t.word)} ${list}.`;
}

/**
 * The two facts to compare for “does the effect follow it both ways?”, with no verdict: the rows where c happened, and
 * the rows where the effect happened. The same rows: both checks pass. A row only in the first: check 1 breaks. A row
 * only in the second: check 2 breaks.
 */
export function followCompare(t: Table, c: number): { says: string; world: string } {
  const where = (p: (r: TableRow) => boolean) => t.rows.flatMap((r, i) => (p(r) ? [i] : []));
  return { says: rowsList(t, where((r) => r.v[c])), world: rowsList(t, where((r) => r.e)) };
}

/** The source line over a table: who made its rows. */
export const TESTS_LINE = 'Tests: someone changed things on purpose.';
export const RECORDS_LINE = 'Records: someone wrote down what happened.';
export const sourceLine = (t: Table) => (sourceOf(t) === 'tests' ? TESTS_LINE : RECORDS_LINE);

/** The tag for the row that breaks c, naming the kind of break: “The clock: the effect came without it.” */
export function breakTag(t: Table, c: number, i: number): string {
  const f = cap(t.cands[c].noun);
  return kindAt(t.rows[i], c) === 'no-effect' ? `${f}: it happened, the effect did not. Check 1 breaks.` : `${f}: the effect came without it. Check 2 breaks.`;
}

/** “From test 1 to test 3, only the clock changes, and the lamp is on both times. So changing the clock did nothing.” */
export function nothingWhy(t: Table, c: number): string {
  const p = nothingPair(t, c);
  if (!p) return '';
  const f = t.cands[c];
  return `From ${rowName(t, p[0])} to ${rowName(t, p[1])}, only ${f.noun} changes, and ${isOn(t.effect, t.rows[p[0]].e)} both times. So changing ${f.noun} did nothing.`;
}

/** “In every test, the lamp is on when the switch is flipped. And the lamp is off when the switch is not flipped.” */
export function followWhy(t: Table, c: number): string {
  const f = t.cands[c], e = t.effect;
  return `${cap(everyRow(t))}, ${e.on} when ${f.on}. And ${e.off} when ${f.off}.`;
}

/** “From test 2 to test 3, only the switch changes.” */
export function aloneWhy(t: Table, c: number): string {
  const [i, j] = alonePair(t, c)!;
  return `From ${rowName(t, i)} to ${rowName(t, j)}, only ${t.cands[c].noun} changes.`;
}

/** Why no fair test changes only c. */
export function notAloneWhy(t: Table, c: number): string {
  const k = twinOf(t, c);
  const f = t.cands[c];
  if (k >= 0) return `${cap(f.noun)} and ${t.cands[k].noun} always change together. So no fair test changes only ${f.noun}.`;
  return `Each time ${f.noun} changes, something else changes too. So no fair test changes only ${f.noun}.`;
}

/** The verdict on one candidate, with its reason (2–5 short sentences). A ruled-out thing in tests also gets its fair test. */
export function verdictNote(t: Table, c: number): string {
  const f = t.cands[c];
  switch (causeVerdict(t, c)) {
    case 'cause': return `${cap(follow(t.effect))} ${f.noun} both ways, and a fair test changes only ${f.noun}. So ${f.noun} is the cause.`;
    case 'not': {
      const nothing = nothingWhy(t, c);
      return `${breakWhy(t, c)} ${worksEvery(t, c)}${nothing ? ` ${nothing}` : ''} So ${f.noun} is not the cause.`;
    }
    case 'cant':
      return sourceOf(t) === 'records'
        ? `${cap(follow(t.effect))} ${f.noun} both ways. But these are records: nobody changed only ${f.noun} on purpose. So you can’t tell yet.`
        : `${cap(follow(t.effect))} ${f.noun} both ways. But ${f.noun} never changes alone. So you can’t tell yet.`;
  }
}

/**
 * The table as a grid picture: rows are tests (or days), columns the candidates and then the effect. The caption
 * starts with who made the rows (tests or records), then says what a row is (or the given caption).
 */
export function tableScene(t: Table, caption?: string): Scene {
  const rows = t.rows.map((_, i) => ({ id: `r${i + 1}`, label: rowLabel(t, i) }));
  const cols = [...t.cands.map((c, k) => ({ id: `c${k + 1}`, label: c.label })), { id: 'e', label: t.effect.label }];
  const marks: Record<string, Record<string, 'yes' | 'no'>> = {};
  t.rows.forEach((r, i) => {
    marks[`r${i + 1}`] = Object.fromEntries([...r.v.map((v, k) => [`c${k + 1}`, yn(v)]), ['e', yn(r.e)]]);
  });
  return { kind: 'grid', rows, cols, marks, caption: `${sourceLine(t)} ${caption ?? `Each row is one ${t.word}. ✓ means yes. ✗ means no.`}` };
}

/** One row as a teaching case: its label, and every column true or false there. */
function rowCase(t: Table, i: number, note?: string): TeachCase {
  const r = t.rows[i];
  const truths: Truth[] = [...t.cands.map((c, k) => ({ who: c.label, value: r.v[k] })), { who: t.effect.label, value: r.e }];
  const said = [...t.cands.map((c, k) => isOn(c, r.v[k])), isOn(t.effect, r.e)].map(cap).join('. ');
  return { label: `${rowLabel(t, i)}. ${said}.`, truths, ...(note ? { note } : {}) };
}

/**
 * The labels of a follows comparison: the rows where it happened, the rows with the effect, and what they give. On a
 * case card the verdict line names the kind of break (it did not work, or the effect came without it).
 */
export function causeWords(t: Table, kinds: readonly BreakKind[] = []): BoardWords {
  const one = kinds.includes('no-effect'), two = kinds.includes('without');
  return {
    says: 'It happened',
    world: 'The effect',
    so: 'So',
    ask: `The same ${plural(t.word)}, both ways?`,
    fit: `The same ${plural(t.word)} both ways: both checks pass.`,
    unfit:
      one && two
        ? 'It happened without the effect, and the effect came without it: both checks break.'
        : one
          ? 'It happened, the effect did not: check 1 breaks.'
          : two
            ? 'The effect came without it: check 2 breaks.'
            : 'Not the same: a check breaks.',
    truth: 'yes',
    untruth: 'no',
    needs: '',
  };
}

/**
 * A candidate checked: does the effect follow it (with its comparison, which names the kind of break), does a fair
 * test change only it, and the verdict.
 */
export function candCase(t: Table, c: number): TeachCase {
  const v = verdict(t, c);
  const cmp = followCompare(t, c);
  return {
    label: `Check ${t.cands[c].noun}.`,
    truths: [
      { who: `${cap(follow(t.effect))} it both ways`, value: followsAll(t, c), because: { ...cmp, match: followsAll(t, c) } },
      { who: 'A fair test changes only it', value: !!alonePair(t, c) },
      { who: 'It is the cause', value: v === 'cause' },
    ],
    note: verdictNote(t, c),
    words: causeWords(t, breakKinds(t, c)),
  };
}

// ---------- the worked example and the boards (See and Do) ----------

const LAMP: Factor = { label: 'Lamp on', noun: 'the lamp', on: 'the lamp is on', off: 'the lamp is off', make: 'the lamp turn on' };
const SWITCH: Factor = { label: 'Switch flipped', noun: 'the switch', on: 'the switch is flipped', off: 'the switch is not flipped' };
const CLOCK: Factor = { label: 'Clock shows 7:00', noun: 'the clock', on: 'the clock shows 7:00', off: 'the clock does not show 7:00' };

/** The worked example: Ava’s lamp. The lamp follows the switch; from test 2 to test 3 only the switch changes. */
export const LAMP_TABLE: Table = {
  word: 'test',
  cands: [SWITCH, CLOCK],
  effect: LAMP,
  rows: [
    { v: [true, true], e: true },
    { v: [false, false], e: false },
    { v: [true, false], e: true },
  ],
};

const HEAT: Factor = { label: 'Hot day', noun: 'the heat', on: 'it is hot', off: 'it is not hot' };
const ICE: Factor = { label: 'Lots of ice cream sold', noun: 'the ice cream', on: 'lots of ice cream is sold', off: 'no ice cream is sold' };
const BURNS: Factor = { label: 'Lots of sunburns', noun: 'the sunburns', plural: true, on: 'lots of kids get sunburns', off: 'few kids get sunburns', make: 'kids get sunburns' };

/** “Together is not enough”: three days where the heat and the ice cream always change together. */
export const SUN_TABLE: Table = {
  word: 'day',
  cands: [HEAT, ICE],
  effect: BURNS,
  rows: [
    { v: [true, true], e: true },
    { v: [false, false], e: false },
    { v: [true, true], e: true },
  ],
};

/** “Look for a third thing”: one more day. It is hot, but the shop is closed. Kids still get sunburns. */
export const SUN_TABLE_4: Table = { ...SUN_TABLE, rows: [...SUN_TABLE.rows, { v: [true, false], e: true, note: 'shop closed' }] };

/**
 * “Cover the heat column”: the same three days with only the ice cream written down. By the tests’ rule the ice cream
 * would now change alone, but these are still records, so they can’t show a cause.
 */
export const SUN_ONE: Table = { ...SUN_TABLE, cands: [ICE], rows: SUN_TABLE.rows.map((r) => ({ v: [r.v[1]], e: r.e })) };

export const LAMP_SCENE = tableScene(LAMP_TABLE, `The lamp follows the switch both ways. ${cap(aloneWhy(LAMP_TABLE, 0))} The switch is the cause.`);
export const SUN_SCENE = tableScene(SUN_TABLE, 'Each row is one day. ✓ means yes. ✗ means no.');
export const SUN4_SCENE = tableScene(SUN_TABLE_4, `${breakWhy(SUN_TABLE_4, 1)} ${breakTag(SUN_TABLE_4, 1, breakRow(SUN_TABLE_4, 1))} So ice cream is not the cause.`);

export const VERDICT_OPTIONS: DrillOption[] = [
  { id: 'cause', label: 'The cause' },
  { id: 'not', label: 'Not the cause' },
  { id: 'cant', label: 'Can’t tell yet' },
];
const YES_NO_OPTS: DrillOption[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];

/** Why a verdict mark is not `pick`, for candidate c (said when the learner marks it that way). */
function verdictWhy(t: Table, c: number, pick: Verdict): string {
  const f = t.cands[c];
  switch (causeVerdict(t, c)) {
    case 'cause':
      return pick === 'not'
        ? `${cap(follow(t.effect))} ${f.noun} both ways, so nothing shows it is not the cause. And ${aloneWhy(t, c).replace(/^F/, 'f')} So it is the cause.`
        : `${aloneWhy(t, c)} That is a fair test, and ${follow(t.effect)} it. So you can tell: it is the cause.`;
    case 'not': {
      const why = `${breakWhy(t, c)} ${worksEvery(t, c)} So ${f.noun} is not the cause.`;
      return pick === 'cant' ? `You can tell already. ${why}` : why;
    }
    case 'cant':
      if (sourceOf(t) === 'records') {
        return pick === 'cause'
          ? `These are records, not a fair test. Nobody changed only ${f.noun} on purpose, and things nobody wrote down changed too. So you can’t tell yet.`
          : `${cap(follow(t.effect))} ${f.noun} both ways, so nothing rules it out. You just can’t tell yet.`;
      }
      return pick === 'cause'
        ? `${notAloneWhy(t, c)} You can’t tell yet.`
        : `${cap(follow(t.effect))} ${f.noun} both ways. Nothing shows it is not the cause. You just can’t tell yet.`;
  }
}

/** Why “did someone change only it, on purpose?” is No for records. */
function purposeWhy(t: Table, c: number): string {
  return `These are records: someone wrote down what happened each ${t.word}. Nobody changed only ${t.cands[c].noun} on purpose.`;
}

/** What the rule needs, over a board row (DrillRow.needs, shown on its own). */
export const TESTS_NEED = 'A cause passes both checks, and a fair test changes only it.';
export const RECORDS_NEED = 'Records can show a thing is not the cause. They can’t show it is the cause.';

/**
 * One candidate as a board row: does the effect follow it both ways (with its comparison: the rows where it happened
 * and the rows with the effect), then a fair test (tests) or “did someone change only it, on purpose?” (records), and
 * the verdict. Every answer comes from the table.
 */
export function candRow(t: Table, c: number, given: boolean): DrillRow {
  const f = t.cands[c];
  const e = t.effect;
  const id = `c${c + 1}`;
  const fol = followsAll(t, c);
  const tests = sourceOf(t) === 'tests';
  const pair = !!alonePair(t, c);
  const v = causeVerdict(t, c);
  const g = given ? { given: true } : {};
  const second: DrillMark = tests
    ? {
        id: `${id}-alone`,
        label: 'Does a fair test change only it?',
        options: YES_NO_OPTS,
        answer: yn(pair),
        ...g,
        why: { [yn(!pair)]: pair ? `${aloneWhy(t, c)} Everything else stays the same.` : notAloneWhy(t, c) },
      }
    : { id: `${id}-purpose`, label: 'Did someone change only it, on purpose?', options: YES_NO_OPTS, answer: 'no', ...g, why: { yes: purposeWhy(t, c) } };
  const marks: DrillMark[] = [
    {
      id: `${id}-follow`,
      label: `${cap(doesE(e))} ${e.noun} follow it both ways?`,
      options: YES_NO_OPTS,
      answer: yn(fol),
      ...g,
      why: { [yn(!fol)]: fol ? followWhy(t, c) : `${breakWhy(t, c)} ${worksEvery(t, c)} So ${e.noun} ${doesE(e)} not follow ${f.noun} both ways.` },
      compare: followCompare(t, c),
    },
    second,
    {
      id: `${id}-verdict`,
      label: 'So it is…',
      options: VERDICT_OPTIONS,
      answer: v,
      ...g,
      why: Object.fromEntries(VERDICT_OPTIONS.filter((o) => o.id !== v).map((o) => [o.id, verdictWhy(t, c, o.id as Verdict)])),
    },
  ];
  return { id, label: cap(f.noun), marks, note: verdictNote(t, c), needs: tests ? TESTS_NEED : RECORDS_NEED };
}

/** The method strip on a full-scaffold board: the two checks, the fair test (or who made the rows), then decide. */
export function causeSteps(t: Table): string[] {
  return [
    `Two checks: ${doesE(t.effect)} ${t.effect.noun} follow it both ways?`,
    sourceOf(t) === 'tests' ? `Fair test: from one ${t.word} to another, does only it change?` : 'Records: did someone change only it, on purpose?',
    'Decide: the cause, not the cause, or can’t tell yet',
  ];
}

// ---------- the two distinctions, their beliefs and their questions ----------

/**
 * In these puzzles one thing makes the effect, so a cause passes two checks, and a row can break it in two ways. The
 * learner who knows only “it works every time” keeps a thing the effect came without.
 */
export const WORKS_VS_ONLY_CAUSE: Distinction = {
  id: 'works-vs-only-cause',
  a: 'It works every time: when it happens, the effect happens.',
  b: 'Nothing else makes the effect: when it does not happen, the effect does not happen.',
};

/** Who made the rows: tests can show a cause; records can rule one out, never in. */
export const TESTS_VS_RECORDS: Distinction = {
  id: 'tests-vs-records',
  a: 'Tests: someone changed one thing on purpose and kept the rest the same.',
  b: 'Records: someone wrote down what happened, and things nobody wrote down changed too.',
};

/** The cards each board sits after (causeIdeas order). */
export const CAUSE_CARDS = { works: 1, lamp: 3, records: 4, sun: 5 } as const;

export const WORKS_CLOSING = 'Those two ideas are apart now. Back to the board: check both ways, then look for a fair test.';
export const RECORDS_CLOSING = 'Those two ideas are apart now. Back to the board: first ask who made the rows.';

/** The one-way-follow belief, in the table’s words. */
function oneWayText(t: Table): string {
  const rows = plural(t.word);
  return `You may be treating “it works every time” and “nothing else makes ${t.effect.make ?? 'it happen'}” as the same thing. They are two different checks. Check 1 looks at ${rows} where it happened. Check 2 looks at ${rows} where it did not: if the effect came anyway, something else did it.`;
}

export const RECORDS_AS_TEST =
  'You may be treating records and a fair test as the same thing. They are two different things. In a test, someone changes one thing on purpose and keeps the rest the same. In records, someone just wrote down what happened, and things nobody wrote down changed too. So first ask who made the rows. Going together in records is a clue to test, not a cause.';

/**
 * The beliefs a cause board’s wrong marks can show, most specific first. one-way-follow: on a thing that is out only
 * because the effect came without it (check 2), it is marked as following, or kept as the cause or “can’t tell yet”.
 * records-as-test: on records, someone is said to have changed it on purpose, or it is called the cause.
 */
export function causeMisconceptions(t: Table, cs: readonly number[]): Misconception[] {
  const out: Misconception[] = [];
  for (const c of cs) {
    const id = `c${c + 1}`;
    const kinds = breakKinds(t, c);
    if (causeVerdict(t, c) === 'not' && kinds.length > 0 && kinds.every((k) => k === 'without')) {
      for (const picks of [{ [`${id}-follow`]: 'yes' }, { [`${id}-verdict`]: 'cant' }, { [`${id}-verdict`]: 'cause' }]) out.push({ id: 'one-way-follow', when: 'picks', picks, text: oneWayText(t) });
    }
    if (sourceOf(t) === 'records' && causeVerdict(t, c) === 'cant') {
      for (const picks of [{ [`${id}-verdict`]: 'cause' }, { [`${id}-purpose`]: 'yes' }]) out.push({ id: 'records-as-test', when: 'picks', picks, text: RECORDS_AS_TEST });
    }
  }
  return out;
}

/** “I’m confused” for the two checks. They never name a board’s thing, so they never give its answer. */
export function worksConfused(): ConfusedQuestion[] {
  return [
    {
      q: 'A row says: the thing did not happen, but the effect did. Can that row show that the thing did not work?',
      options: [{ label: 'No. The thing did not even happen in that row', right: true }, { label: 'Yes. A cause works every time' }, { label: 'Not sure' }],
      teach: 'No. Check 1, “it works every time,” is about rows where the thing happened. In this row it did not happen. The row shows something else: the effect came without it. That breaks check 2, because something else made the effect happen.',
    },
    {
      q: 'In these puzzles, can two different things each make the effect happen?',
      options: [{ label: 'No. One thing makes the effect', right: true }, { label: 'Yes. It could happen another way, like in Stop 6' }, { label: 'Not sure' }],
      teach: 'No. In these puzzles, one thing makes the effect happen. In Stop 6, THEN without IF did not break an if-then rule. Here it does: if the effect comes without a thing, something else did it. So that thing is not the cause.',
    },
  ];
}

/** “I’m confused” for tests and records, about rows of `word` (“day”, “game”). */
export function recordsConfused(word: string): ConfusedQuestion[] {
  return [
    {
      q: 'Who made these rows?',
      options: [{ label: 'Someone who changed one thing on purpose' }, { label: `Someone who wrote down what happened each ${word}`, right: true }, { label: 'Not sure' }],
      teach: 'Someone wrote them down. These rows are records, not tests. Nobody changed one thing on purpose and kept the rest the same. So the table does not show everything that changed.',
    },
    {
      q: `Could something that is not in the table have changed from ${word} to ${word}?`,
      options: [{ label: 'Yes', right: true }, { label: 'No' }, { label: 'Not sure' }],
      teach: `Yes. In records, nobody kept things the same. The weather, the time and lots more changed too, and nobody wrote them down. One of them could be the real cause. So going together in records is a clue to test, not a proof. One ${word} where they do not go together still rules it out.`,
    },
  ];
}

// ---------- the boards ----------

/** Do, board 2: the worked lamp table. The switch is shown checked; the learner checks the clock, with the two checks lit. */
export function lampBoard(): DrillStep {
  const t = LAMP_TABLE;
  const clock = t.cands[1];
  const k = breakKind(t, 1);
  if (k !== 'without' || causeVerdict(t, 1) !== 'not' || !nothingPair(t, 1)) throw new Error('lampBoard: the clock is out by check 2, with a fair test');
  return {
    id: 's7.l3-do-lamp',
    title: 'Check each thing',
    body: [
      'This is Ava’s lamp table from the example. The switch is checked for you.',
      'Now check the clock. Does the lamp follow it both ways? Does a fair test change only the clock? Then decide.',
    ],
    scene: LAMP_SCENE,
    rows: [candRow(t, 0, true), candRow(t, 1, false)],
    afterCard: CAUSE_CARDS.lamp,
    scaffold: 'full',
    steps: causeSteps(t),
    words: { ...causeWords(t), closing: WORKS_CLOSING },
    misconceptions: causeMisconceptions(t, [1]),
    confused: worksConfused(),
    distinction: WORKS_VS_ONLY_CAUSE.id,
    done: `Right. ${breakWhy(t, 1)} The lamp came on without ${clock.noun}, so check 2 breaks. ${nothingWhy(t, 1)} The switch is the cause.`,
  };
}

/** The last row of the sunburn board: the heat column covered, so only the ice cream is written down. */
function coverRow(): DrillRow {
  const t = SUN_ONE;
  const f = t.cands[0];
  const fol = followsAll(t, 0);
  const v = causeVerdict(t, 0);
  // By the tests’ rule the ice cream now changes alone: the trap a records table with one column sets.
  const looksAlone = verdict(t, 0) === 'cause';
  const why: Record<string, string> = {};
  for (const o of VERDICT_OPTIONS) {
    if (o.id === v) continue;
    why[o.id] = o.id === 'cause' && looksAlone
      ? `With the heat covered, only ${f.noun} seems to change. But these are still records: the heat changed too, and nobody changed only ${f.noun} on purpose. So you can’t tell yet.`
      : verdictWhy(t, 0, o.id as Verdict);
  }
  return {
    id: 'one',
    label: `Cover the “${HEAT.label}” column. Now only ${f.noun} and ${t.effect.noun} are written down.`,
    marks: [
      { id: 'one-together', label: 'Do they go together every day?', options: YES_NO_OPTS, answer: yn(fol), why: { [yn(!fol)]: fol ? followWhy(t, 0) : breakWhy(t, 0) } },
      { id: 'one-verdict', label: `So ${f.noun} is…`, options: VERDICT_OPTIONS, answer: v, why },
    ],
    note: 'Even with one column, these are records. Going together is a clue to test, not a cause.',
    needs: RECORDS_NEED,
  };
}

/** Do, board 4: the three sunburn days are records. The heat and the ice cream go together: can’t tell yet, even with one covered. */
export function sunBoard(): DrillStep {
  const t = SUN_TABLE;
  return {
    id: 's7.l3-do-sun',
    title: 'Check two things that go together',
    body: [
      'These are the three days from the card. Check the heat, then the ice cream.',
      'Do the sunburns follow it both ways? Did someone change only it, on purpose? Then decide.',
      'Last, cover the heat column and look again.',
    ],
    scene: SUN_SCENE,
    rows: [candRow(t, 0, false), candRow(t, 1, false), coverRow()],
    afterCard: CAUSE_CARDS.sun,
    words: { ...causeWords(t), closing: RECORDS_CLOSING },
    misconceptions: [
      { id: 'records-as-test', when: 'picks', picks: { 'one-verdict': 'cause' }, text: RECORDS_AS_TEST },
      ...causeMisconceptions(t, [0, 1]),
    ],
    confused: recordsConfused(t.word),
    distinction: TESTS_VS_RECORDS.id,
    done: 'Right. These days are records, and the heat and the ice cream always changed together. Even with the heat covered, you can’t tell yet. Going together is a clue to test.',
  };
}

// ----- works every time vs nothing else makes it: a contrast and its board -----

/** The two tests of the contrast: the clock happens and the lamp stays off; the clock does not happen and the lamp is on. */
const WORKS_ROWS: readonly [TableRow, TableRow] = [{ v: [true], e: false }, { v: [false], e: true }];
const worksTable = (k: 0 | 1): Table => ({ word: 'test', cands: [CLOCK], effect: LAMP, rows: [WORKS_ROWS[k]], made: 'tests' });
const AB = ['A', 'B'] as const;

function worksPanel(k: 0 | 1): ContrastPanel {
  const t = worksTable(k);
  const r = t.rows[0];
  const kind = breakKind(t, 0);
  if (!kind) throw new Error('worksPanel: each test breaks the clock');
  return {
    world: `Does ${CLOCK.noun} make ${LAMP.make}?`,
    who: `Test ${AB[k]}`,
    says: `${cap(isOn(CLOCK, r.v[0]))}, but ${isOn(LAMP, r.e)}.`,
    truth: followsAll(t, 0),
    because:
      kind === 'no-effect'
        ? `It happened, but the effect did not. Check 1 breaks: ${CLOCK.noun} did not work.`
        : `The effect came without it. Check 2 breaks: something else ${madeIt(LAMP)}.`,
    then: noteCanSave(r, 0) ? 'It is out, unless the table names something that stopped it.' : 'It is out. One thing turns the lamp on, and no note can change that.',
  };
}

/** Test A breaks check 1, test B breaks check 2: the same claim, two kinds of break. */
export function worksContrast(): Extract<Scene, { kind: 'contrast' }> {
  const kinds = [0, 1].map((k) => breakKind(worksTable(k as 0 | 1), 0));
  if (kinds[0] !== 'no-effect' || kinds[1] !== 'without') throw new Error('worksContrast: test A breaks check 1, test B check 2');
  return {
    kind: 'contrast',
    pairs: [worksPanel(0), worksPanel(1)],
    ask: { q: 'Are these the same kind of break?', a: `No. In test A, ${CLOCK.noun} did not work. In test B, something else turned the lamp on. A cause must pass both checks.` },
    words: { worldTag: 'Check', saysWord: 'row:', truth: 'Passes', untruth: 'Fails' },
  };
}

export const BREAK_OPTIONS: DrillOption[] = [
  { id: 'one', label: 'Check 1: it did not work' },
  { id: 'two', label: 'Check 2: the effect came without it' },
];

/** Do, board 1: name the break in each test of the contrast, and say whether a note could save the clock. */
export function worksBoard(): DrillStep {
  const scene = worksContrast();
  const row = (k: 0 | 1): DrillRow => {
    const t = worksTable(k);
    const r = t.rows[0];
    const one = breakKind(t, 0) === 'no-effect';
    const save = noteCanSave(r, 0);
    const id = `test${AB[k]}`;
    return {
      id,
      label: `Test ${AB[k]}: ${scene.pairs[k].says}`,
      marks: [
        {
          id: `${id}-check`,
          label: 'Which check breaks?',
          options: BREAK_OPTIONS,
          answer: one ? 'one' : 'two',
          why: one
            ? { two: `In test ${AB[k]}, ${CLOCK.noun} did happen. ${cap(isOn(LAMP, r.e))}, so it did not work. That is check 1.` }
            : { one: `In test ${AB[k]}, ${CLOCK.noun} did not happen, so it never had a chance to work. ${cap(isOn(LAMP, r.e))} anyway: the effect came without it. That is check 2.` },
        },
        {
          id: `${id}-note`,
          label: `Could a note that names what stopped ${CLOCK.noun} save it?`,
          options: YES_NO_OPTS,
          answer: yn(save),
          why: save
            ? { no: `A note can name what stopped ${CLOCK.noun} from working. That can save a check 1 break.` }
            : { yes: `Nothing was stopped in test ${AB[k]}. The lamp came on without ${CLOCK.noun}, so something else did it. No note can save a check 2 break.` },
        },
      ],
    };
  };
  return {
    id: 's7.l3-do-two-checks',
    title: 'Name the break',
    body: ['Look at the two tests above. For each one, which check breaks?', `Then: could a note that names what stopped ${CLOCK.noun} save it?`],
    scene,
    rows: [row(0), row(1)],
    afterCard: CAUSE_CARDS.works,
    words: { closing: WORKS_CLOSING },
    misconceptions: [
      { id: 'one-way-follow', when: 'picks', picks: { 'testB-check': 'one' }, text: oneWayText(worksTable(1)) },
      {
        id: 'note-saves-all',
        when: 'picks',
        picks: { 'testB-note': 'yes' },
        text: `You may be treating “something stopped it” and “something else did it” as the same thing. They are two different things. A note can say what stopped ${CLOCK.noun} from working. But in test B, ${CLOCK.noun} never happened, and the lamp came on anyway. No note can change that.`,
      },
    ],
    confused: worksConfused(),
    distinction: WORKS_VS_ONLY_CAUSE.id,
    done: `Right. Test A breaks check 1: ${CLOCK.noun} happened and did not work, so a note could save it. Test B breaks check 2: the lamp came on without ${CLOCK.noun}. No note can save that.`,
  };
}

// ----- tests vs records: a contrast and its board -----

/** The same three rows, labelled tests and labelled records: the red cap on, the team won; off, lost; on, won. */
const CAP_ROWS: readonly TableRow[] = [{ v: [true], e: true }, { v: [false], e: false }, { v: [true], e: true }];
const CAP_NAME = 'Kai';

/** Kai’s red cap and the win, as tests he set up and as records he wrote down (the cap skin of the together items). */
function capTables(): { tests: Table; records: Table; x: Factor; y: Factor } {
  const skin = PAIR_SKINS.find((s) => s.id === 'cap')!;
  const x = skin.x(CAP_NAME), y = skin.y(CAP_NAME);
  const rows = CAP_ROWS.map((r) => ({ ...r, v: [...r.v] }));
  return { x, y, tests: { word: 'test', cands: [x], effect: y, rows, made: 'tests' }, records: { word: skin.word, cands: [x], effect: y, rows, made: 'records' } };
}

/** The marks of the cap rows in words: “Cap on, won. Cap off, lost. Cap on, won.” */
const capMarks = () => CAP_ROWS.map((r) => `Cap ${r.v[0] ? 'on' : 'off'}, ${r.e ? 'won' : 'lost'}.`).join(' ');

/** The same marks, two answers: tests that change only the cap show a cause; records can’t tell yet. */
export function recordsContrast(): Extract<Scene, { kind: 'contrast' }> {
  const { tests, records } = capTables();
  const vt = causeVerdict(tests, 0), vr = causeVerdict(records, 0);
  // Each panel’s truth: do its rows show the cap is the cause?
  const [shownT, shownR] = [vt === 'cause', vr === 'cause'];
  if (!shownT || vr !== 'cant' || !alonePair(tests, 0)) throw new Error('recordsContrast: the tests show the cause, the records can’t tell yet');
  return {
    kind: 'contrast',
    pairs: [
      {
        world: `Tests. ${CAP_NAME} put the red cap on or off on purpose. He kept everything else the same.`,
        who: `${CAP_NAME}’s`,
        says: capMarks(),
        truth: shownT,
        because: 'Only the cap changed, and the win followed it both ways. That is a fair test.',
        then: 'So the cap is the cause.',
      },
      {
        world: `Records. ${CAP_NAME} wrote down what happened at each game.`,
        who: `${CAP_NAME}’s`,
        says: capMarks(),
        truth: shownR,
        because: 'Lots of things nobody wrote down changed too, like the weather. One of them could cause the win.',
        then: 'Going together is a clue to test.',
      },
    ],
    ask: { q: 'Did the marks change?', a: 'No. Only who made the rows changed. Tests can show a cause. Records can show a thing is not the cause, but they can’t show it is.' },
    words: { worldTag: 'Who made the rows', saysWord: 'rows:', truth: 'The cause', untruth: 'Can’t tell yet' },
  };
}

/** Do, board 3: the cap’s tests and records, marked by the learner: who changed it on purpose, and the verdict. */
export function recordsBoard(): DrillStep {
  const { tests, records } = capTables();
  const scene = recordsContrast();
  const row = (id: 'tests' | 'records', t: Table): DrillRow => {
    const purpose = sourceOf(t) === 'tests' && !!alonePair(t, 0);
    const v = causeVerdict(t, 0);
    const why: Record<string, string> = {};
    for (const o of VERDICT_OPTIONS) {
      if (o.id === v) continue;
      why[o.id] = id === 'tests'
        ? o.id === 'cant'
          ? 'These are tests, not records. Only the cap changed, on purpose, and the win followed it. So you can tell: it is the cause.'
          : 'The win follows the cap both ways, so nothing rules it out. And only the cap changed: a fair test. So it is the cause.'
        : o.id === 'cause'
          ? 'These are records, not a fair test. Lots of things nobody wrote down changed too. So you can’t tell yet.'
          : 'The win follows the cap in every game, so nothing rules it out. You just can’t tell yet.';
    }
    return {
      id,
      label: id === 'tests' ? `${CAP_NAME}’s tests: ${capMarks()}` : `${CAP_NAME}’s records: ${capMarks()}`,
      marks: [
        {
          id: `${id}-purpose`,
          label: 'Did someone change only the cap, on purpose?',
          options: YES_NO_OPTS,
          answer: yn(purpose),
          why: purpose
            ? { no: `These are tests. ${CAP_NAME} put the cap on or off on purpose, and kept everything else the same.` }
            : { yes: `These are records. ${CAP_NAME} just wrote down what happened at each game. Nobody changed only the cap on purpose.` },
        },
        { id: `${id}-verdict`, label: 'So the red cap is…', options: VERDICT_OPTIONS, answer: v, why },
      ],
    };
  };
  const both: ConfusedQuestion = {
    q: `${CAP_NAME}’s two tables have the same marks. What makes their answers different?`,
    options: [{ label: 'Who made the rows: tests or records', right: true }, { label: 'The marks' }, { label: 'Not sure' }],
    teach: 'Who made the rows. In tests, someone changed one thing on purpose and kept the rest the same. In records, someone just wrote down what happened. The same marks can show a cause in tests, and only a clue in records.',
  };
  return {
    id: 's7.l3-do-records',
    title: 'Tests or records?',
    body: [`${CAP_NAME}’s two tables have the same marks. Check each one.`, 'Did someone change only the cap, on purpose? Then decide.'],
    scene,
    rows: [row('tests', tests), row('records', records)],
    afterCard: CAUSE_CARDS.records,
    words: { closing: RECORDS_CLOSING },
    misconceptions: [
      { id: 'records-as-test', when: 'picks', picks: { 'records-verdict': 'cause' }, text: RECORDS_AS_TEST },
      { id: 'records-as-test', when: 'picks', picks: { 'records-purpose': 'yes' }, text: RECORDS_AS_TEST },
      {
        id: 'tests-as-records',
        when: 'picks',
        picks: { 'tests-verdict': 'cant' },
        text: `You may be treating a fair test and records as the same thing. They are two different things. In ${CAP_NAME}’s tests, he changed only the cap, on purpose, and kept the rest the same. The win followed it both ways, so the tests can tell: the cap is the cause.`,
      },
    ],
    confused: [both, recordsConfused(records.word)[1]],
    distinction: TESTS_VS_RECORDS.id,
    done: 'Right. The same marks, two answers. The tests changed only the cap, on purpose, so they show a cause. The records can’t tell yet.',
  };
}

/** See: the key-idea cards. The worked example (card 4) is the lamp table, marked, with its cause named. */
export function causeIdeas(): IdeaCard[] {
  const ice = breakRow(SUN_TABLE_4, 1);
  if (kindAt(SUN_TABLE_4.rows[ice], 1) !== 'without' || !thirdCausesBoth(SUN_TABLE_4)) throw new Error('causeIdeas: on day 4 the sunburns come without ice cream');
  return [
    {
      title: 'What a cause does',
      body: [
        'A cause makes something happen. Flip a switch, and a lamp turns on. The switch is the cause. The lamp turning on is the effect.',
        'In these puzzles, one thing makes the effect happen. So a cause passes two checks.',
        'Check 1: when it happens, the effect happens. It works every time, unless the table names something that stopped it.',
        'Check 2: when it does not happen, the effect does not happen. Nothing else makes the effect.',
        'When both checks pass, we say the lamp follows the switch. In Stop 6, THEN without IF did not break an if-then rule. “Follows” is stronger: it needs both checks.',
      ],
    },
    {
      title: 'Two kinds of break',
      distinction: WORKS_VS_ONLY_CAUSE.id,
      body: [
        'A row can break a cause in two ways.',
        `Below, two tests check one idea: does ${CLOCK.noun} make ${LAMP.make}?`,
        'It happened, but the effect did not: check 1 breaks. It did not work. A note that names what stopped it can save it.',
        'The effect came without it: check 2 breaks. Something else made the effect happen. No note can save that.',
      ],
      scene: worksContrast(),
    },
    {
      title: 'Change one thing at a time',
      body: [
        'Say you flip the switch and set the clock to 7:00 at the same time. The lamp turns on. Which one did it?',
        'You can’t tell yet. Two things changed at once.',
        'A fair test is one you set up. You change just one thing on purpose. Everything else stays the same. If the lamp changes too, that one thing is the cause.',
      ],
    },
    {
      title: 'Example: find the cause',
      body: [
        'Ava tests her lamp. Each row is one test. ✓ means yes. ✗ means no.',
        `${cap(followWhy(LAMP_TABLE, 0))} So the switch passes both checks.`,
        `${aloneWhy(LAMP_TABLE, 0)} That is a fair test. So the switch is the cause.`,
      ],
      scene: LAMP_SCENE,
    },
    {
      title: 'Tests or records?',
      distinction: TESTS_VS_RECORDS.id,
      body: [
        'Before you check a table, ask: who made these rows?',
        'Tests: someone changed things on purpose. They changed one thing and kept the rest the same. Tests can show a cause.',
        'Records: someone wrote down what happened. Lots of things nobody wrote down changed too. Records can show a thing is not the cause. They can’t show it is.',
        'Below, the marks are the same. Only who made the rows is different.',
      ],
      scene: recordsContrast(),
    },
    {
      title: 'Together is not enough',
      body: [
        'On hot days, the shop sells lots of ice cream. On hot days, lots of kids get sunburns too. So ice cream and sunburns go together.',
        'Does ice cream cause sunburns? These days can’t tell you. The heat changed at the same time, every time.',
        'These days are records: someone just wrote them down. Records are not a fair test. Lots of things nobody wrote down change from day to day.',
        'Two things that go together give you a guess to check. They are not a proof.',
      ],
      scene: SUN_SCENE,
    },
    {
      title: 'Look for a third thing',
      body: [
        'Here is one more day. On day 4, it is hot, but the shop is closed. So no ice cream is sold. Kids still get sunburns.',
        'The sunburns came without ice cream, so check 2 breaks. Ice cream is not the cause. The heat is a third thing that comes with both.',
        'On day 4, the table names what stopped ice cream sales: shop closed. The heat may cause both. A fair test could check it.',
        'A third thing can make two things go together.',
        'When two things go together, ask: could a third thing cause both? Then check.',
      ],
      scene: SUN4_SCENE,
    },
  ];
}

/** Scenes the quiz must never repeat (the worked example and the boards). */
export const WORKED_SCENES: readonly string[] = [LAMP_SCENE, SUN_SCENE, SUN4_SCENE].map((s) => JSON.stringify(s));
/** A grid that reuses a card’s story: the same column labels (in any order), whatever the rows say. */
const isWorked = (s: Scene) => {
  if (s.kind !== 'grid') return false;
  const key = (g: Extract<Scene, { kind: 'grid' }>) => JSON.stringify(g.cols.map((c) => c.label).sort());
  return [LAMP_SCENE, SUN_SCENE, SUN4_SCENE].some((w) => w.kind === 'grid' && key(w) === key(s));
};

// ---------- skins ----------

export type Frame = 'everyday' | 'fantasy' | 'abstract';
export const FRAMES: readonly Frame[] = ['everyday', 'fantasy', 'abstract'];

export const NAMES: readonly string[] = ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivy', 'Jay', 'Kai', 'Lia', 'Max', 'Nia', 'Omar', 'Pia', 'Raj', 'Sam', 'Tia', 'Zoe'];

const fac = (label: string, noun: string, on: string, off: string): Factor => ({ label, noun, on, off });

/** A test-table story: what is tested, the effect, and three things that might cause it. */
export interface TestSkin {
  id: string;
  frame: Frame;
  /** “Kai tests a new toy car.” */
  intro: (name: string) => string;
  effect: Factor;
  cands: readonly [Factor, Factor, Factor];
}

export const TEST_SKINS: readonly TestSkin[] = [
  {
    id: 'car', frame: 'everyday', intro: (n) => `${n} tests a new toy car.`,
    effect: { label: 'Lights flash', noun: 'the flashing', on: 'the lights flash', off: 'the lights do not flash', make: 'the lights flash' },
    cands: [
      fac('Red button pressed', 'the red button', 'the red button is pressed', 'the red button is not pressed'),
      fac('Blue button pressed', 'the blue button', 'the blue button is pressed', 'the blue button is not pressed'),
      fac('Lever up', 'the lever', 'the lever is up', 'the lever is down'),
    ],
  },
  {
    id: 'dog', frame: 'everyday', intro: (n) => `${n} wants to know what makes Biscuit the dog bark.`,
    effect: { label: 'Biscuit barks', noun: 'the barking', on: 'Biscuit barks', off: 'Biscuit is quiet', make: 'Biscuit bark' },
    cands: [
      fac('Doorbell rings', 'the doorbell', 'the doorbell rings', 'the doorbell is quiet'),
      fac('TV on', 'the TV', 'the TV is on', 'the TV is off'),
      fac('Cat in the yard', 'the cat', 'the cat is in the yard', 'the cat is not in the yard'),
    ],
  },
  {
    id: 'sneeze', frame: 'everyday', intro: (n) => `${n} wants to know what makes Grandpa sneeze.`,
    effect: { label: 'Grandpa sneezes', noun: 'the sneezing', on: 'Grandpa sneezes', off: 'Grandpa does not sneeze', make: 'Grandpa sneeze' },
    cands: [
      fac('Cat on his lap', 'the cat', 'the cat is on his lap', 'the cat is not on his lap'),
      fac('Window open', 'the window', 'the window is open', 'the window is shut'),
      fac('Vase of roses out', 'the vase of roses', 'the vase of roses is out', 'the vase of roses is put away'),
    ],
  },
  {
    id: 'lantern', frame: 'fantasy', intro: () => 'A wizard tests her magic lantern.',
    effect: { label: 'Lantern glows', noun: 'the glow', on: 'the lantern glows', off: 'the lantern stays dark', make: 'the lantern glow' },
    cands: [
      fac('Crystal on the table', 'the crystal', 'the crystal is on the table', 'the crystal is put away'),
      fac('Spell said', 'the spell', 'the spell is said', 'the spell is not said'),
      fac('Owl in the room', 'the owl', 'the owl is in the room', 'the owl is out'),
    ],
  },
  {
    id: 'dragon', frame: 'fantasy', intro: (n) => `${n} wants to know what makes Puff the dragon sneeze sparks.`,
    effect: { label: 'Sparks fly', noun: 'the sparks', plural: true, on: 'Puff sneezes sparks', off: 'Puff does not sneeze', make: 'Puff sneeze sparks' },
    cands: [
      fac('Pepper in the soup', 'the pepper', 'the soup has pepper', 'the soup has no pepper'),
      fac('Feather near Puff', 'the feather', 'a feather is near Puff', 'no feather is near Puff'),
      fac('Flower near Puff', 'the flower', 'a flower is near Puff', 'no flower is near Puff'),
    ],
  },
  {
    id: 'door', frame: 'fantasy', intro: (n) => `${n} the knight tests a magic castle door.`,
    effect: { label: 'Door opens', noun: 'the door', on: 'the door opens', off: 'the door stays shut', make: 'the door open' },
    cands: [
      fac('Three knocks', 'the knocking', 'someone knocks three times', 'no one knocks'),
      fac('Torch lit', 'the torch', 'the torch is lit', 'the torch is out'),
      fac('Password said', 'the password', 'the password is said', 'the password is not said'),
    ],
  },
  {
    id: 'buttons', frame: 'abstract', intro: () => 'A machine has buttons and a light.',
    effect: { label: 'Light on', noun: 'the light', on: 'the light is on', off: 'the light is off', make: 'the light turn on' },
    cands: (['A', 'B', 'C'] as const).map((x) => fac(`Button ${x} pressed`, `button ${x}`, `button ${x} is pressed`, `button ${x} is not pressed`)) as unknown as [Factor, Factor, Factor],
  },
  {
    id: 'switches', frame: 'abstract', intro: () => 'A machine has switches and a bell.',
    effect: { label: 'Bell rings', noun: 'the bell', on: 'the bell rings', off: 'the bell is quiet', make: 'the bell ring' },
    cands: (['P', 'Q', 'R'] as const).map((x) => fac(`Switch ${x} up`, `switch ${x}`, `switch ${x} is up`, `switch ${x} is down`)) as unknown as [Factor, Factor, Factor],
  },
];

/** A “together” story: two things written down over several days (or games) that go together. */
export interface PairSkin {
  id: string;
  frame: Frame;
  word: string;
  intro: (name: string) => string;
  x: (name: string) => Factor;
  y: (name: string) => Factor;
}

export const PAIR_SKINS: readonly PairSkin[] = [
  {
    id: 'cap', frame: 'everyday', word: 'game', intro: (n) => `${n} wrote down what happened at each soccer game.`,
    x: (n) => fac('Red cap on', 'the red cap', `${n} wore the red cap`, `${n} did not wear the red cap`),
    y: () => ({ label: 'Team won', noun: 'the win', on: 'the team won', off: 'the team lost', make: 'the team win' }),
  },
  {
    id: 'pencil', frame: 'everyday', word: 'week', intro: (n) => `${n} wrote down how each weekly spelling quiz went.`,
    x: (n) => fac('Lucky pencil', 'the lucky pencil', `${n} used the lucky pencil`, `${n} used a plain pencil`),
    y: (n) => ({ label: 'Gold star', noun: 'the gold star', on: `${n} got a gold star`, off: `${n} got no gold star`, make: `${n} get a gold star` }),
  },
  {
    id: 'backpack', frame: 'everyday', word: 'day', intro: (n) => `${n} wrote down what happened at school each day.`,
    x: (n) => fac('Green backpack', 'the green backpack', `${n} carried the green backpack`, `${n} carried a different backpack`),
    y: () => ({ label: 'Surprise quiz', noun: 'the surprise quiz', on: 'the class had a surprise quiz', off: 'the class had no surprise quiz', make: 'a surprise quiz happen' }),
  },
  {
    id: 'bell', frame: 'fantasy', word: 'day', intro: () => 'A castle guard wrote down what the dragon did each day.',
    x: () => fac('Gold scarf on', 'the gold scarf', 'the dragon wore its gold scarf', 'the dragon did not wear its gold scarf'),
    y: () => ({ label: 'Bell rang', noun: 'the bell', on: 'the castle bell rang', off: 'the castle bell was quiet', make: 'the castle bell ring' }),
  },
  {
    id: 'candles', frame: 'fantasy', word: 'night', intro: () => 'A wizard wrote down what her cat did each night.',
    x: () => fac('Cat on the book', 'the cat', 'the cat sat on the spell book', 'the cat did not sit on the book'),
    y: () => ({ label: 'Candles flicker', noun: 'the flicker', on: 'the candles flickered', off: 'the candles stayed still', make: 'the candles flicker' }),
  },
  {
    id: 'troll', frame: 'fantasy', word: 'night', intro: () => 'A fox wrote down what happened at the bridge each night.',
    x: () => fac('Troll sang', 'the troll’s singing', 'the troll sang', 'the troll did not sing'),
    y: () => ({ label: 'Lanterns glow', noun: 'the glow', on: 'the lanterns glowed', off: 'the lanterns stayed dark', make: 'the lanterns glow' }),
  },
  {
    id: 'lights', frame: 'abstract', word: 'day', intro: () => 'A wall has two lights. Each day, someone wrote down which lights were on.',
    x: () => fac('Light A on', 'light A', 'light A was on', 'light A was off'),
    y: () => ({ label: 'Light B on', noun: 'light B', on: 'light B was on', off: 'light B was off', make: 'light B turn on' }),
  },
  {
    id: 'screen', frame: 'abstract', word: 'day', intro: () => 'A screen shows shapes. Each day, someone wrote down what it did.',
    x: () => fac('Star shown', 'the star', 'a star was on the screen', 'no star was on the screen'),
    y: () => ({ label: 'Beep', noun: 'the beep', on: 'the screen beeped', off: 'the screen was quiet', make: 'the screen beep' }),
  },
];

/** One of the two things a third thing causes: its column, a short name, what it is made to do, and a block. */
export interface Linked extends Factor {
  /** “ice cream”, “scarves”, “light A’s glow”. */
  short: string;
  /** After “makes”: “kids wear scarves”. */
  make: string;
  /** A day this one is blocked (it does not happen even though the third thing does): “cocoa stand closed”. */
  block?: string;
  /** The block as a clause: “the cocoa stand was closed”. */
  blockSay?: string;
}

/**
 * A common-cause story: a third thing (t) comes with two things (a and b). The intro reports only the pair and who
 * noticed it; the third thing is left for the learner to find in the table’s first column.
 */
export interface ThirdSkin {
  id: string;
  frame: Frame;
  word: string;
  intro: (name: string) => string;
  t: Factor & { short: string };
  things: readonly [Linked, Linked];
}

/**
 * Each pair is two effects of the third thing that cannot plausibly cause each other. The cards’ story (hot days,
 * ice cream and sunburns) is never a quiz skin.
 */
export const THIRD_SKINS: readonly ThirdSkin[] = [
  {
    id: 'snow', frame: 'everyday', word: 'day', intro: (n) => `${n} noticed that on days with lots of snowmen in the park, the school bus runs late.`,
    t: { label: 'Snowy day', noun: 'the snow', short: 'snowy days', plural: true, on: 'it snowed', off: 'it did not snow' },
    things: [
      { label: 'Lots of snowmen', noun: 'the snowmen', short: 'snowmen', plural: true, make: 'kids build snowmen', on: 'kids built lots of snowmen', off: 'kids built no snowmen', block: 'kids stayed inside', blockSay: 'the kids stayed inside' },
      { label: 'Bus late', noun: 'the late bus', short: 'the late bus', make: 'the bus run late', on: 'the bus was late', off: 'the bus was on time', block: 'the bus left early', blockSay: 'the bus left early' },
    ],
  },
  {
    id: 'rain', frame: 'everyday', word: 'day', intro: (n) => `${n} noticed that on days when lots of people carry umbrellas, lots of kids get muddy boots.`,
    t: { label: 'Rainy day', noun: 'the rain', short: 'rainy days', plural: true, on: 'it rained', off: 'it did not rain' },
    things: [
      { label: 'Lots of umbrellas', noun: 'the umbrellas', short: 'umbrellas', plural: true, make: 'people carry umbrellas', on: 'lots of people carried umbrellas', off: 'few people carried umbrellas', block: 'too windy for umbrellas', blockSay: 'it was too windy for umbrellas' },
      { label: 'Lots of muddy boots', noun: 'the muddy boots', short: 'muddy boots', plural: true, make: 'kids get muddy boots', on: 'lots of kids got muddy boots', off: 'few kids got muddy boots', block: 'kids played inside', blockSay: 'the kids played inside' },
    ],
  },
  {
    id: 'cold', frame: 'everyday', word: 'day', intro: (n) => `${n} noticed that on days when lots of hot cocoa is sold, lots of kids wear scarves.`,
    t: { label: 'Cold day', noun: 'the cold', short: 'cold days', plural: true, on: 'it was cold', off: 'it was not cold' },
    things: [
      { label: 'Lots of cocoa sold', noun: 'the cocoa', short: 'hot cocoa', make: 'people buy hot cocoa', on: 'lots of hot cocoa was sold', off: 'no hot cocoa was sold', block: 'cocoa stand closed', blockSay: 'the cocoa stand was closed' },
      { label: 'Lots of scarves', noun: 'the scarves', short: 'scarves', plural: true, make: 'kids wear scarves', on: 'lots of kids wore scarves', off: 'few kids wore scarves', block: 'scarves left at home', blockSay: 'the kids left their scarves at home' },
    ],
  },
  {
    id: 'moon', frame: 'fantasy', word: 'night', intro: () => 'A wizard noticed that on nights when her lantern glows, her crystal hums.',
    t: { label: 'Full moon', noun: 'the full moon', short: 'the full moon', on: 'the moon was full', off: 'the moon was not full' },
    things: [
      { label: 'Lantern glows', noun: 'the glow', short: 'the lantern’s glow', make: 'the lantern glow', on: 'the lantern glowed', off: 'the lantern stayed dark', block: 'lantern out of oil', blockSay: 'the lantern was out of oil' },
      { label: 'Crystal hums', noun: 'the hum', short: 'the crystal’s hum', make: 'the crystal hum', on: 'the crystal hummed', off: 'the crystal was quiet', block: 'crystal in a thick box', blockSay: 'the crystal was in a thick box' },
    ],
  },
  {
    id: 'market', frame: 'fantasy', word: 'day', intro: (n) => `${n} noticed that on days when flags fly on the castle towers, the bakery sells out of bread.`,
    t: { label: 'Market day', noun: 'the market', short: 'market days', plural: true, on: 'it was market day', off: 'it was not market day' },
    things: [
      { label: 'Flags fly', noun: 'the flags', short: 'the flags', plural: true, make: 'flags fly on the towers', on: 'flags flew on the towers', off: 'no flags flew', block: 'flags torn by wind', blockSay: 'the wind tore the flags' },
      { label: 'Bread sold out', noun: 'the empty shelves', short: 'empty bread shelves', plural: true, make: 'the bread sell out', on: 'the bread sold out', off: 'bread was left over', block: 'the baker made extra', blockSay: 'the baker made extra bread' },
    ],
  },
  {
    id: 'lights', frame: 'abstract', word: 'day', intro: () => 'A wall has two lights. Someone noticed that on days when light A is on, light B is on too.',
    t: { label: 'Button pressed', noun: 'the button', short: 'the button', on: 'the button was pressed', off: 'the button was not pressed' },
    things: [
      { label: 'Light A on', noun: 'light A', short: 'light A', make: 'light A turn on', on: 'light A was on', off: 'light A was off', block: 'light A’s bulb out', blockSay: 'light A’s bulb was out' },
      { label: 'Light B on', noun: 'light B', short: 'light B', make: 'light B turn on', on: 'light B was on', off: 'light B was off', block: 'light B’s bulb out', blockSay: 'light B’s bulb was out' },
    ],
  },
];

export const testSkinsOf = (f: Frame) => TEST_SKINS.filter((s) => s.frame === f);
export const pairSkinsOf = (f: Frame) => PAIR_SKINS.filter((s) => s.frame === f);
export const thirdSkinsOf = (f: Frame) => THIRD_SKINS.filter((s) => s.frame === f);

// ---------- made items ----------

export type CauseKind = 'which' | 'cant' | 'together' | 'third';
export const KIND_TAG: Record<CauseKind, string> = { which: 'cause-which', cant: 'cause-cant-tell', together: 'cause-together', third: 'cause-third' };

/** A made item plus the model behind it (for tests). */
export interface CauseMade extends Made {
  kind: CauseKind;
  frame: Frame;
  skin: string;
  table: Table;
  /** Test tables: the question form, and the candidate a claim is about. */
  form?: 'which' | 'claim';
  claimed?: number;
  /** Common cause: the index of the third thing (0) and the asked cause (1) in table.cands. */
  third?: boolean;
}

const randomBools = (rng: Rng, n: number) => Array.from({ length: n }, () => rng.chance(0.5));

/** Tuples of candidate values are all different (each test is a new test). */
const distinctRows = (t: Table) => new Set(t.rows.map((r) => r.v.join())).size === t.rows.length;

/**
 * A random test table. which: exactly one candidate is the cause, the rest are not. cant: two candidates always
 * change together and the effect follows them; a third candidate is not the cause.
 */
export function makeTestTable(rng: Rng, skin: TestSkin, kind: 'which' | 'cant', nCands?: number): Table {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const n = kind === 'cant' ? 3 : (nCands ?? rng.int(2, 3));
    const nRows = n === 2 ? 3 : rng.int(3, 4);
    const pick = rng.shuffle([0, 1, 2]).slice(0, n).sort();
    const cands = pick.map((k) => skin.cands[k]);
    const cols = Array.from({ length: n }, () => randomBools(rng, nRows));
    let eCol: boolean[];
    if (kind === 'which') {
      eCol = cols[rng.int(0, n - 1)];
    } else {
      const [a, b] = rng.shuffle([0, 1, 2]).slice(0, 2);
      cols[b] = [...cols[a]];
      eCol = cols[a];
    }
    const t: Table = { word: 'test', cands, effect: skin.effect, rows: eCol.map((e, i) => ({ v: cols.map((c) => c[i]), e })) };
    if (!isClean(t) || !distinctRows(t)) continue;
    const ans = tableAnswer(t);
    const vs = cands.map((_, c) => verdict(t, c));
    if (kind === 'which' && (typeof ans !== 'number' || vs.filter((v) => v === 'not').length !== n - 1)) continue;
    if (kind === 'cant' && (ans !== 'cant' || vs.filter((v) => v === 'cant').length !== 2 || !vs.includes('not'))) continue;
    if (isWorked(tableScene(t))) continue;
    return t;
  }
  throw new Error('makeTestTable: no table found');
}

const TEST_TERMS = (t: Table) => [
  CAUSE_TERM,
  { word: 'The effect', meaning: `what a cause makes happen. Here it is the last column, “${t.effect.label}.”` },
  { word: 'Follows', meaning: `${t.effect.on} when the thing happens, and ${t.effect.off} when it does not. It passes both checks.` },
  { word: 'A fair test', meaning: `two ${plural(t.word)} where only one thing changes. Everything else stays the same.` },
  { word: '“Can’t tell yet”', meaning: `the ${plural(t.word)} do not decide it. More ${plural(t.word)} could.` },
];

function testTeach(t: Table): Teach {
  return {
    rule: `A cause makes something happen. Check each thing, one at a time. ${cap(doesE(t.effect))} ${t.effect.noun} follow it both ways? Is there a fair test, where only it changes?`,
    terms: TEST_TERMS(t),
    meaning: `${sourceLine(t)} Each row is one ${t.word}. ✓ means yes. ✗ means no. The last column shows if ${t.effect.on}.`,
    casesTitle: 'Check each thing, one at a time',
    cases: t.cands.map((_, c) => candCase(t, c)),
    remember: [
      'It passes both checks, and a fair test changes only it. Then it is the cause.',
      'In Stop 6, THEN without IF did not break an if-then rule. Here, the effect without the thing rules it out.',
      'Ask: “Did only this one thing change?”',
    ],
    simpler: [
      'Say you flip only the switch. The lamp turns on.',
      'Then you flip the switch back. The lamp turns off.',
      'Nothing else changed. That is a fair test. So the switch is the cause.',
      'If the clock had changed too, you could not tell which one did it.',
    ],
  };
}

/** A candidate other than `skip` that is not the cause (for the hint), with its check marked. */
function notCase(t: Table, skip: number): TeachCase {
  const c = t.cands.findIndex((_, k) => k !== skip && verdict(t, k) === 'not');
  if (c < 0) throw new Error('notCase: no other candidate is ruled out');
  return candCase(t, c);
}

/** The cases a wrong pick of candidate c needs: the row that breaks it, or the row where its twin changed with it. */
function candExample(t: Table, c: number): TeachCase {
  const v = verdict(t, c);
  if (v === 'not') {
    const i = breakRow(t, c);
    return rowCase(t, i, `${cap(t.effect.noun)} ${doesE(t.effect)} not follow ${t.cands[c].noun} here. ${breakTag(t, c, i)}`);
  }
  if (v === 'cant') {
    const k = twinOf(t, c);
    const i = t.rows.findIndex((r) => r.v[c]);
    return rowCase(t, i, `${cap(t.cands[c].noun)} and ${t.cands[k].noun} both happen here. Which one did it?`);
  }
  const [i, j] = alonePair(t, c)!;
  const f = t.cands[c];
  return {
    label: `${cap(aloneWhy(t, c))}`,
    truths: [
      { who: `${f.label}, ${rowName(t, i)}`, value: t.rows[i].v[c] },
      { who: `${f.label}, ${rowName(t, j)}`, value: t.rows[j].v[c] },
      { who: `${t.effect.label}, ${rowName(t, i)}`, value: t.rows[i].e },
      { who: `${t.effect.label}, ${rowName(t, j)}`, value: t.rows[j].e },
    ],
    note: `Only ${f.noun} changed, and ${follow(t.effect)} it. That is a fair test.`,
  };
}

/** “Which one makes the lights flash?” Choices: each candidate, then Can’t tell yet. */
function whichFeedback(t: Table, pick: number | 'cant'): ChoiceFeedback {
  const e = t.effect;
  if (pick === 'cant') {
    const c = tableAnswer(t) as number;
    const f = t.cands[c];
    return {
      headline: `Your answer says you can’t tell yet, but a fair test changes only ${f.noun}.`,
      detail: [
        `${aloneWhy(t, c)} Everything else stays the same, and ${follow(e)} it.`,
        followWhy(t, c),
        `So the ${plural(t.word)} can tell: ${f.noun} is the cause.`,
      ],
      example: candExample(t, c),
    };
  }
  const f = t.cands[pick];
  if (verdict(t, pick) === 'not') {
    return {
      headline: `Your answer picks ${f.noun}, but ${e.noun} ${doesE(e)} not follow it ${atRow(t, breakRow(t, pick))}.`,
      detail: [
        `Your answer means ${f.noun} makes ${e.make}. Then ${e.on} every time ${f.on}. And since one thing makes the effect, ${e.off} when ${f.off}.`,
        `${breakWhy(t, pick)} ${worksEvery(t, pick)} So ${f.noun} is not the cause.`,
      ],
      example: candExample(t, pick),
    };
  }
  const k = twinOf(t, pick);
  return {
    headline: `Your answer picks ${f.noun}, but ${t.cands[k].noun} changed with it ${everyRow(t)}.`,
    detail: [
      `${followWhy(t, pick)} That fits your answer.`,
      `But ${t.cands[k].noun} changed at the same time, every time. So the ${plural(t.word)} can’t tell which one makes ${e.make}.`,
      `A fair test would change only ${f.noun}. These ${plural(t.word)} don’t have one yet.`,
    ],
    example: candExample(t, pick),
  };
}

/** The ids of a claim item’s three choices. */
export type ClaimId = 'right' | 'wrong' | 'cant';
export const CLAIM_OF: Record<Verdict, ClaimId> = { cause: 'right', not: 'wrong', cant: 'cant' };

function claimFeedback(t: Table, c: number, pick: ClaimId): ChoiceFeedback {
  const f = t.cands[c], e = t.effect;
  const v = verdict(t, c);
  const k = twinOf(t, c);
  if (pick === 'right') {
    if (v === 'not') {
      return {
        headline: `Your answer says ${f.noun} is the cause, but ${e.noun} ${doesE(e)} not follow it ${atRow(t, breakRow(t, c))}.`,
        detail: [breakWhy(t, c), `${worksEvery(t, c)} So the ${plural(t.word)} show ${f.noun} is not the cause.`],
        example: candExample(t, c),
      };
    }
    return {
      headline: `Your answer says the ${plural(t.word)} show it, but ${t.cands[k].noun} changed with ${f.noun} every time.`,
      detail: [followWhy(t, c), `But ${t.cands[k].noun} changed at the same time, every time. It could be the cause instead. So you can’t tell yet.`],
      example: candExample(t, c),
    };
  }
  if (pick === 'wrong') {
    if (v === 'cause') {
      return {
        headline: `Your answer says ${f.noun} is not the cause, but ${follow(e)} it ${everyRow(t)}.`,
        detail: [followWhy(t, c), `${aloneWhy(t, c)} That is a fair test. So ${f.noun} is the cause.`],
        example: candExample(t, c),
      };
    }
    return {
      headline: `Your answer says ${f.noun} is not the cause, but no ${t.word} shows that.`,
      detail: [followWhy(t, c), `${cap(t.cands[k].noun)} changed with it every time. Either one could be the cause. So you can’t tell yet.`],
      example: candExample(t, c),
    };
  }
  if (v === 'cause') {
    return {
      headline: `Your answer says you can’t tell yet, but a fair test changes only ${f.noun}.`,
      detail: [`${aloneWhy(t, c)} Everything else stays the same.`, followWhy(t, c), `So the ${plural(t.word)} can tell: ${f.noun} is the cause.`],
      example: candExample(t, c),
    };
  }
  return {
    headline: `Your answer says you can’t tell yet, but ${rowName(t, breakRow(t, c))} already shows ${f.noun} is not the cause.`,
    detail: [breakWhy(t, c), `${worksEvery(t, c)} So ${f.noun} is not the cause.`],
    example: candExample(t, c),
  };
}

export interface TestItemOptions {
  kind: 'which' | 'cant';
  form: 'which' | 'claim';
  frame: Frame;
}

/**
 * A test-table question. form 'which': “What makes the lights flash?” (each candidate, or Can’t tell yet).
 * form 'claim': “Nia says the red button makes the lights flash. What do the tests show?” The tag follows the answer:
 * cause-cant-tell when it is “can’t tell yet”, else cause-which.
 */
export function testItem(rng: Rng, o: TestItemOptions): CauseMade {
  const skin = rng.pick(testSkinsOf(o.frame));
  const [name, name2] = rng.shuffle(NAMES).slice(0, 2);
  // The grid’s caption says what a row is; the prompt does not repeat it.
  const intro = skin.intro(name);
  // A claim needs another candidate that is ruled out, for the hint. A which item always has one.
  let t: Table;
  let claimed = -1;
  for (;;) {
    t = makeTestTable(rng, skin, o.kind, o.form === 'claim' && o.kind === 'which' ? 3 : undefined);
    if (o.form === 'which') break;
    const pool = t.cands.map((_, c) => c).filter((c) => (o.kind === 'cant' ? verdict(t, c) === 'cant' : true));
    const ok = pool.filter((c) => t.cands.some((_, k) => k !== c && verdict(t, k) === 'not'));
    if (ok.length) {
      claimed = rng.pick(ok);
      break;
    }
  }
  const e = t.effect;
  const scene = tableScene(t);
  const hint = 'Check one thing at a time. Here is one checked for you. Check the others the same way.';
  let item: ItemCore;
  if (o.form === 'which') {
    const ans = tableAnswer(t)!;
    const ids = t.cands.map((_, c) => `c${c + 1}`);
    const choices = [...t.cands.map((c, k) => ({ id: ids[k], label: cap(c.noun) })), { id: 'cant', label: 'Can’t tell yet' }];
    const answer = ans === 'cant' ? 'cant' : ids[ans];
    const feedback: Record<string, ChoiceFeedback> = {};
    for (const ch of choices) if (ch.id !== answer) feedback[ch.id] = whichFeedback(t, ch.id === 'cant' ? 'cant' : ids.indexOf(ch.id));
    const pair = t.cands.flatMap((_, c) => (verdict(t, c) === 'cant' ? [c] : []));
    const explain = ans === 'cant'
      ? `${cap(follow(e))} ${t.cands[pair[0]].noun} and ${t.cands[pair[1]].noun} both ways. But those two always change together. So you can’t tell yet which one is the cause.`
      : `${cap(follow(e))} ${t.cands[ans].noun} both ways. ${aloneWhy(t, ans)} So ${t.cands[ans].noun} is the cause.`;
    item = {
      kind: 'choose',
      prompt: `${intro} What makes ${e.make}?`,
      scene,
      choices,
      answer,
      explain,
      feedback,
      hint,
      hintCase: notCase(t, ans === 'cant' ? -1 : ans),
      teach: testTeach(t),
    };
  } else {
    const f = t.cands[claimed];
    const choices: { id: ClaimId; label: string }[] = [
      { id: 'right', label: 'The tests show it is the cause.' },
      { id: 'wrong', label: 'The tests show it is not the cause.' },
      { id: 'cant', label: 'The tests can’t tell yet.' },
    ];
    const answer = CLAIM_OF[verdict(t, claimed)];
    const feedback: Record<string, ChoiceFeedback> = {};
    for (const ch of choices) if (ch.id !== answer) feedback[ch.id] = claimFeedback(t, claimed, ch.id);
    item = {
      kind: 'choose',
      prompt: `${intro} ${name2} says, “${cap(f.noun)} makes ${e.make}.” What do the tests show?`,
      scene,
      choices,
      answer,
      explain: verdictNote(t, claimed),
      feedback,
      hint,
      hintCase: notCase(t, claimed),
      teach: testTeach(t),
    };
  }
  syncWhyWrong(item);
  const kind: CauseKind = item.answer === 'cant' ? 'cant' : 'which';
  return { tag: KIND_TAG[kind], item, kind, frame: o.frame, skin: skin.id, table: t, form: o.form, ...(claimed >= 0 ? { claimed } : {}) };
}

// ----- together: records of days -----

/** The answer to “does x cause y?” from records: No when a day breaks it, else Not yet (records are not a fair test). */
export const togetherAnswer = (t: Table): 'no' | 'notyet' => (followsAll(t, 0) ? 'notyet' : 'no');

/** Records of 3–5 rows where y goes with x every time (notyet), or every time but one (no). */
export function makePairTable(rng: Rng, skin: PairSkin, name: string, answer: 'no' | 'notyet'): Table {
  const x = skin.x(name), y = skin.y(name);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const n = rng.int(3, 5);
    const xs = randomBools(rng, n);
    const es = [...xs];
    if (answer === 'no') {
      const k = rng.int(0, n - 1);
      es[k] = !es[k];
    }
    const t: Table = { word: skin.word, cands: [x], effect: y, rows: xs.map((v, i) => ({ v: [v], e: es[i] })) };
    if (!isClean(t) || togetherAnswer(t) !== answer) continue;
    // Enough of a pattern to look like one: at least two rows with both, and one with neither.
    if (t.rows.filter((r) => r.v[0] && r.e).length < 2 || !t.rows.some((r) => !r.v[0] && !r.e)) continue;
    // “Every time but one” needs most rows to match: at least two that go together on each side of the break.
    if (answer === 'no' && t.rows.filter((r) => r.v[0] === r.e).length < 2) continue;
    return t;
  }
  throw new Error('makePairTable: no table found');
}

/** The umbrella story, for the “Explain more simply” of a together item. */
const UMBRELLA_SIMPLER = [
  'On rainy days, lots of people carry umbrellas.',
  'On rainy days, the ground is wet too.',
  'So umbrellas and wet ground go together.',
  'But umbrellas do not make the ground wet. The rain causes both.',
];

function pairTeach(t: Table): Teach {
  const x = t.cands[0], y = t.effect;
  return {
    rule: 'Two things can go together without one causing the other. Going together is a clue, not a proof. A fair test you set up can check it.',
    terms: [
      CAUSE_TERM,
      { word: 'Go together', meaning: `both happen ${inWord(t) ? 'in' : 'on'} the same ${plural(t.word)}, and both do not happen ${inWord(t) ? 'in' : 'on'} the same ${plural(t.word)}.` },
      { word: 'A fair test', meaning: 'a test you set up. You change just one thing on purpose and keep everything else the same.' },
      { word: 'Records', meaning: `what someone wrote down each ${t.word}. Records are not a fair test. Nobody changed just one thing.` },
    ],
    meaning: `${sourceLine(t)} The table shows each ${t.word}. ✓ means it happened. ✗ means it did not.`,
    casesTitle: 'Every way this question can go',
    cases: [
      {
        label: `${cap(x.noun)} and ${y.noun} go together every ${t.word}.`,
        truths: [{ who: 'They go together', value: true }, { who: 'This shows a cause', value: false }],
        note: 'Not yet. Something else could cause both. Test it.',
      },
      {
        label: `${inWord(t) ? 'In' : 'On'} one ${t.word}, ${x.noun} and ${y.noun} do not go together.`,
        truths: [{ who: 'They go together', value: false }, { who: `${cap(x.noun)} is the cause`, value: false }],
        note: `Then a check breaks: it happened and the effect did not, or the effect came without it. So ${x.noun} is not the cause.`,
      },
      {
        label: `A fair test changes only ${x.noun}, and ${y.noun} changes with it every time.`,
        truths: [{ who: `${cap(x.noun)} is the cause`, value: true }],
        note: 'Now you can tell. Only a fair test shows a cause.',
      },
    ],
    remember: ['Going together is a clue, not a proof.', 'Records are not a fair test. Ask: “Could something else cause both?”'],
    simpler: UMBRELLA_SIMPLER,
  };
}

/**
 * A thinking board for a records item (Item.scratch, “the records board”): who made the rows, then each row in words,
 * marked “do they go together here?”. It shows every column in words, since the table is hidden while it is open.
 * x and y: the two columns that go together (a candidate index, or -1 for the effect).
 */
export function recordsScratch(t: Table, x: number, y: number): DrillStep {
  const val = (r: TableRow, k: number) => (k < 0 ? r.e : r.v[k]);
  const name = (k: number) => (k < 0 ? t.effect.noun : t.cands[k].noun);
  const pair = `Do ${name(x)} and ${name(y)}`;
  return {
    id: 's7.l3-records-scratch',
    title: `Check each ${t.word}`,
    body: [`First: who made these rows? Then check each ${t.word}. Do ${name(x)} and ${name(y)} go together there?`],
    rows: [
      {
        id: 'who',
        label: 'Who made these rows?',
        marks: [{
          id: 'who',
          label: 'They were made by…',
          options: [{ id: 'tests', label: 'Someone who changed one thing on purpose' }, { id: 'records', label: `Someone who wrote down what happened each ${t.word}` }],
          answer: sourceOf(t),
          why: { tests: purposeWhy(t, Math.max(0, x)) },
        }],
      },
      ...t.rows.map((r, i): DrillRow => {
        const together = val(r, x) === val(r, y);
        return {
          id: `row${i + 1}`,
          label: rowCase(t, i).label,
          marks: [{ id: `row${i + 1}-together`, label: `${pair} go together here?`, options: YES_NO_OPTS, answer: yn(together), why: { [yn(!together)]: together ? 'Both happen here, or neither does.' : 'One happens here without the other.' } }],
        };
      }),
    ],
    done: '',
    words: { closing: RECORDS_CLOSING },
  };
}

/** “Does the red cap make the team win?” Yes / Not yet / No. */
export function togetherItem(rng: Rng, o: { frame: Frame; answer?: 'no' | 'notyet' }): CauseMade {
  const skin = rng.pick(pairSkinsOf(o.frame));
  const name = rng.pick(NAMES);
  const answer = o.answer ?? (rng.chance(0.3) ? 'no' : 'notyet');
  const t = makePairTable(rng, skin, name, answer);
  const x = t.cands[0], y = t.effect;
  const w = t.word;
  const choices = [
    { id: 'yes', label: `Yes. They go together, so ${x.noun} makes ${y.make}.` },
    { id: 'notyet', label: 'Not yet. Going together is not enough. Test it.' },
    { id: 'no', label: `No. ${inWord(t) ? 'In' : 'On'} one ${w}, they did not go together.` },
  ];
  const b = breakRow(t, 0);
  const why = b >= 0 ? breakWhy(t, 0) : '';
  const rowEx = (i: number, note: string) => rowCase(t, i, note);
  const feedback: Record<string, ChoiceFeedback> = {};
  if (answer === 'notyet') {
    const i = t.rows.findIndex((r) => r.e);
    feedback.yes = {
      headline: `Your answer treats ${plural(w)} someone wrote down as a fair test, but nobody changed only ${x.noun}.`,
      detail: [
        `Your answer means ${x.noun} makes ${y.make}.`,
        `The table only shows that they went together. Going together is a clue, not a proof.`,
        `Many things nobody wrote down change from ${w} to ${w}. One of them could cause both.`,
        `To know, you need a fair test you set up. Change only ${x.noun} on purpose, and keep everything else the same.`,
      ],
      example: {
        label: 'On rainy days, lots of people carry umbrellas, and the ground is wet.',
        truths: [{ who: 'They go together', value: true }, { who: 'Umbrellas make the ground wet', value: false }],
        note: 'The rain causes both.',
      },
    };
    feedback.no = {
      headline: `Your answer says one ${w} did not go together, but they went together every ${w}.`,
      detail: [
        `Check each ${w}. ${cap(x.noun)} and ${y.noun} match every time.`,
        'Still, going together does not show a cause. So the answer is “Not yet.”',
      ],
      example: rowEx(i, `They go together ${inWord(t) ? 'in' : 'on'} this ${w}, like every other ${w}.`),
    };
  } else {
    const ex = rowEx(b, `They do not go together here. ${breakTag(t, 0, b)}`);
    feedback.yes = {
      headline: `Your answer says they go together, but ${atRow(t, b)} they did not.`,
      detail: [`Your answer means ${x.noun} makes ${y.make}.`, `${why} ${worksEvery(t, 0)} So ${x.noun} is not the cause.`],
      example: ex,
    };
    feedback.notyet = {
      headline: `Your answer says “Not yet,” but ${rowName(t, b)} already shows ${x.noun} is not the cause.`,
      detail: [why, `${worksEvery(t, 0)} So ${x.noun} is not the cause.`],
      example: ex,
    };
  }
  const explain = answer === 'notyet'
    ? `${cap(x.noun)} and ${y.noun} went together every ${w}. But going together is not enough to show a cause. Something else could cause both, so test it.`
    : `${why} ${worksEvery(t, 0)} So ${x.noun} is not the cause.`;
  // The hint: one day that goes together (never the day that breaks it).
  const h = t.rows.findIndex((r) => r.v[0] === r.e);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${skin.intro(name)} Does ${x.noun} make ${y.make}?`,
    scene: tableScene(t, `Each row is one ${w}. ✓ means it happened. ✗ means it did not.`),
    choices,
    answer,
    explain,
    feedback,
    hint: `Here is one ${w}, checked for you. Check each ${w} the same way. Then ask: is going together enough?`,
    hintCase: rowEx(h, `They go together ${inWord(t) ? 'in' : 'on'} this ${w}.`),
    teach: pairTeach(t),
    conflict: true,
    tags: ['records'],
    confused: [...recordsConfused(w), worksConfused()[0]],
    scratch: recordsScratch(t, 0, -1),
    scratchLabel: 'the records board',
  };
  syncWhyWrong(item);
  return { tag: KIND_TAG.together, item, kind: 'together', frame: o.frame, skin: skin.id, table: t };
}

// ----- a third thing: the common cause -----

/** The common-cause table: candidates [t, a] for the effect b. One row has t but a is blocked: b comes without a. */
export function makeThirdTable(rng: Rng, skin: ThirdSkin, a: Linked, b: Linked): Table {
  for (let attempt = 0; attempt < 2000; attempt++) {
    const n = rng.int(3, 4);
    const ts = rng.shuffle([true, false, ...randomBools(rng, n - 3), true]);
    // One day with the third thing gets the block; at least one other day with it stays whole.
    const onDays = ts.flatMap((v, i) => (v ? [i] : []));
    const blocked = rng.pick(onDays);
    const rows: TableRow[] = ts.map((v, i) => ({ v: [v, v && i !== blocked], e: v, ...(i === blocked ? { note: a.block } : {}) }));
    const t: Table = { word: skin.word, cands: [skin.t, a], effect: b, rows };
    if (!isClean(t) || isWorked(tableScene(t))) continue;
    if (verdict(t, 0) !== 'cause' || verdict(t, 1) !== 'not' || !thirdCausesBoth(t)) continue;
    return t;
  }
  throw new Error('makeThirdTable: no table found');
}

/** Some day has b without a: so a is not what makes b happen. */
const bWithoutA = (t: Table) => t.rows.some((r) => r.e && !r.v[1]);

/** The table with candidates [t] and a as the effect: does the third thing make a happen too? */
export const thirdVsA = (t: Table): Table => ({ ...t, cands: [t.cands[0]], effect: t.cands[1], rows: t.rows.map((r) => ({ ...r, v: [r.v[0]], e: r.v[1] })) });

/**
 * The third thing passes both checks for both: for b, and for a except on the day the table names a block (a check 1
 * break the note excuses). So “may cause both” is computed with the lesson’s rule for a cause.
 */
export const thirdCausesBoth = (t: Table) => followsAll(t, 0) && followsAll(thirdVsA(t), 0);

export type ThirdId = 'yes' | 'third' | 'none' | 'cant';

/**
 * Which of the four choices the table makes true. Exactly one does. “No” needs a day with b but not a; the third
 * thing goes with b every day (“may cause both”), or nothing else does (“none”). The days are records, so the third
 * thing is a good guess to check, never a proof.
 */
export function thirdTruths(t: Table): Record<ThirdId, boolean> {
  return {
    yes: verdict(t, 1) === 'cause',
    third: bWithoutA(t) && thirdCausesBoth(t),
    none: bWithoutA(t) && !followsAll(t, 0),
    cant: verdict(t, 1) === 'cant',
  };
}

const isVerb = (f: { plural?: boolean }) => (f.plural ? 'are' : 'is');
const doVerb = (f: { plural?: boolean }) => (f.plural ? 'Do' : 'Does');
const makes = (f: { plural?: boolean }) => (f.plural ? 'make' : 'makes');
const goes = (f: { plural?: boolean }) => (f.plural ? 'go' : 'goes');

/** “Does hot cocoa make kids wear scarves?” The can-fail question: going together can fool you. */
export function thirdItem(rng: Rng, o: { frame: Frame }): CauseMade {
  const skin = rng.pick(thirdSkinsOf(o.frame));
  const name = rng.pick(NAMES);
  const order = rng.shuffle([0, 1]).filter((k) => !!skin.things[k].block);
  const ai = order[0];
  const a = skin.things[ai], b = skin.things[1 - ai];
  const t = makeThirdTable(rng, skin, a, b);
  const T = skin.t;
  const w = t.word;
  const k = t.rows.findIndex((r) => !!r.note);
  const maybe = `${cap(T.short)} may cause both.`;
  const choices: { id: ThirdId; label: string }[] = rng.shuffle([
    { id: 'yes' as const, label: `Yes. They go together, so ${a.short} ${makes(a)} ${b.make}.` },
    { id: 'third' as const, label: `No. ${maybe}` },
    { id: 'none' as const, label: `No. Nothing else in the table goes with ${b.short}.` },
    { id: 'cant' as const, label: `Can’t tell from these ${plural(w)}.` },
  ]);
  const truths = thirdTruths(t);
  const right = (Object.keys(truths) as ThirdId[]).filter((id) => truths[id]);
  if (right.length !== 1 || right[0] !== 'third') throw new Error('thirdItem: the third thing must be the one answer');
  const day = cap(atRow(t, k));
  // “On day 3, the cocoa stand was closed, so no hot cocoa was sold, but lots of kids wore scarves.”
  const blockLine = `${day}, ${a.blockSay}, so ${a.off}, but ${b.on}.`;
  if (kindAt(t.rows[k], 1) !== 'without') throw new Error('thirdItem: on the blocked day, b comes without a');
  // The effect came without a: check 2 breaks, which no note can excuse.
  const notIt = `${cap(b.short)} came without ${a.short}. That breaks check 2, so ${a.short} ${isVerb(a)} not what makes ${b.make}.`;
  const ex = rowCase(t, k, `${cap(a.off)}, but ${b.on}. ${breakTag(t, 1, k)}`);
  const tFollows = `${cap(everyRow(t))}, ${b.on} when ${T.on}. And ${b.off} when ${T.off}.`;
  const feedback: Record<string, ChoiceFeedback> = {
    yes: {
      headline: `Your answer says going together shows a cause, but ${rowName(t, k)} breaks it.`,
      detail: [`Your answer means ${a.short} ${makes(a)} ${b.make}. In these puzzles, one thing makes the effect. So ${b.on} only when ${a.on}.`, blockLine, `${notIt} ${maybe}`],
      example: ex,
    },
    none: {
      headline: `Your answer says nothing else goes with ${b.short}, but ${T.short} ${goes(T)} with ${b.short} every ${w}.`,
      detail: [
        `Your answer is right that ${a.short} ${isVerb(a)} not the cause. ${blockLine}`,
        `But look at the first column. ${tFollows}`,
        `So ${T.short} could be a third thing that causes both. That is a good guess to check.`,
      ],
      example: rowCase(t, k, `${cap(T.on)}, and ${b.on}, even without ${a.short}.`),
    },
    cant: {
      headline: `Your answer says you can’t tell, but ${rowName(t, k)} decides it.`,
      detail: [blockLine, notIt],
      example: ex,
    },
  };
  const h = t.rows.findIndex((r) => r.v[0] && !r.note);
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${skin.intro(name)} ${doVerb(a)} ${a.short} make ${b.make}?`,
    scene: tableScene(t, `Each row is one ${w}. ✓ means it happened. ✗ means it did not.`),
    choices,
    answer: 'third',
    explain: `${blockLine} ${notIt} ${maybe}`,
    feedback,
    hint: `Here is one ${w}, checked for you. Now look for a ${w} where they do not all go together.`,
    hintCase: rowCase(t, h, `All three go together on this ${w}.`),
    teach: thirdTeach(t, skin, a, b),
    conflict: true,
    tags: ['can-fail'],
    confused: [...worksConfused(), recordsConfused(w)[0]],
    scratch: recordsScratch(t, 1, -1),
    scratchLabel: 'the records board',
  };
  syncWhyWrong(item);
  return { tag: KIND_TAG.third, item, kind: 'third', frame: o.frame, skin: skin.id, table: t, third: true };
}

function thirdTeach(t: Table, skin: ThirdSkin, a: Linked, b: Linked): Teach {
  const T = skin.t;
  const k = t.rows.findIndex((r) => !!r.note);
  const note = (i: number) => {
    const r = t.rows[i];
    if (r.note) return `${cap(T.on)}, but ${a.blockSay}, so ${a.off}. The note tells you why. And ${b.on}, so ${a.short} ${isVerb(a)} not what makes ${b.make}.`;
    return r.v[0] ? 'All three go together.' : 'None of the three happen.';
  };
  const simpler = skin.id === 'rain'
    ? ['On hot days, lots of ice cream is sold.', 'On hot days, lots of kids get sunburns too.', 'So ice cream and sunburns go together.', 'But ice cream does not cause sunburns. Hot days cause both.']
    : UMBRELLA_SIMPLER;
  return {
    rule: `When two things go together, a third thing may cause both. Look for a ${t.word} when one of them happens without the other.`,
    terms: [
      CAUSE_TERM,
      { word: 'Something that stops it', meaning: `here, ${a.blockSay} ${atRow(t, k)}. That stopped ${T.short} from making ${a.make}.` },
      { word: 'Go together', meaning: 'both happen at the same times, and both do not happen at the same times.' },
      { word: 'A third thing', meaning: `something else that comes with both, and may cause both. Here it is ${T.short}.` },
      { word: 'Records', meaning: `what someone wrote down each ${t.word}. They give a good guess to check, not a proof.` },
    ],
    meaning: `${sourceLine(t)} Each row is one ${t.word}. ✓ means it happened. ${cap(atRow(t, k))}, ${a.blockSay}.`,
    casesTitle: `What each ${t.word} shows`,
    cases: t.rows.map((_, i) => rowCase(t, i, note(i))),
    remember: ['Going together can fool you. A third thing may cause both.', 'Ask: “Is there a third thing that changes too?”'],
    simpler,
  };
}

// ---------- any item of a kind ----------

export function causeItem(rng: Rng, kind: CauseKind, frame: Frame): CauseMade {
  switch (kind) {
    case 'which': return testItem(rng, { kind: 'which', form: rng.chance(0.7) ? 'which' : 'claim', frame });
    case 'cant': return testItem(rng, { kind: 'cant', form: rng.chance(0.6) ? 'which' : 'claim', frame });
    case 'together': return togetherItem(rng, { frame });
    case 'third': return thirdItem(rng, { frame });
  }
}
