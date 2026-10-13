/**
 * Stop 10 · Circuit Lab: the See and Do pieces. The pictures on the key-idea cards, the contrast cards that teach a
 * distinction, and the guided boards the learner marks by taps. Every mark's answer and every word for a wrong mark
 * comes from the model in circuits.ts (passes, explainRow), never from a hand-written table.
 *
 * Distinctions (docs/CONTENT_GUIDE.md, “Distinctions”):
 *  - one-vs-all (Lesson 1): one switch in the line being closed is not the path being closed.
 *  - line-vs-side (Lesson 2): in a line power must pass every switch; side by side one closed path is enough.
 *  - closed-vs-lit (Lesson 3): the switch being closed is not the lamp being on (a flipper box does the opposite).
 *  - looks-vs-works (Lesson 4): two circuits looking alike is not two circuits having the same table.
 *  - up-vs-differ (Lesson 5): one switch of a two-way pair being up is not the lamp being on; the switches must differ.
 */
import { rowsFor, sameRow, type Row } from './tables';
import {
  A,
  B,
  BOARD_WORDS,
  C,
  FLIP,
  LAB,
  LINE,
  PICK_POOL,
  SIDE,
  SIDE_TWIN,
  SW,
  TRUE_CAPTION,
  TRUE_FALSE,
  TWO,
  circuitScene,
  circuitTable,
  differRows,
  explainRow,
  frame,
  partWords,
  passes,
  pos,
  rowClause,
  rowShort,
  sameJob,
  toPart,
  type CircuitScene,
  type Net,
} from './circuits';
import type { BoardWords, ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillOption, DrillRow, DrillStep, IdeaCard, Misconception, Scene } from '../types';

const t = LAB;
const YES_NO: DrillOption[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const ON_OFF: DrillOption[] = [{ id: 'on', label: 'On' }, { id: 'off', label: 'Off' }];
const yn = (v: boolean) => (v ? 'yes' : 'no');
const lampId = (v: boolean) => (v ? 'on' : 'off');
const words = (n: Net) => partWords(toPart(n, t.names));
const ROWS2 = rowsFor(2);
/** A letter's switch: “Switch A”. */
const Sw = (i: number) => `Switch ${t.names[i]}`;

const STEPS = ['Look at each switch: closed lets power pass, open stops it.', 'Follow the power along the wiring.', 'Mark the lamp: on if power gets all the way around.'];
const words$ = (closing: string): BoardWords => ({ ...BOARD_WORDS, closing });

// ---------- marks, worked out from the model ----------

/** Can power pass this switch? Yes when it is closed. */
function passMark(id: string, i: number, r: Row): DrillMark {
  const v = r[i];
  return {
    id,
    label: `Can power pass ${t.names[i]}?`,
    options: YES_NO.map((o) => ({ ...o })),
    answer: yn(v),
    why: { [yn(!v)]: v ? `${Sw(i)} is closed. A closed switch has no gap, so power can pass it.` : `${Sw(i)} is open. An open switch has a gap, so power stops there.` },
  };
}

/** Does the flipper box on this switch let power through? Yes when the switch is open. */
function boxMark(id: string, i: number, r: Row): DrillMark {
  const v = !r[i];
  return {
    id,
    label: `Does the box on ${t.names[i]} let power through?`,
    options: YES_NO.map((o) => ({ ...o })),
    answer: yn(v),
    why: {
      [yn(!v)]: r[i]
        ? `${Sw(i)} is closed, so its inside would let power through. The box does the opposite and stops it.`
        : `${Sw(i)} is open, so its inside would stop power. The box does the opposite and lets it through.`,
    },
  };
}

/** The lamp in this case: On or Off, with the reason for a wrong mark. */
function lampMark(id: string, n: Net, r: Row, o: { label?: string; compare?: { says: string; world: string } } = {}): DrillMark {
  const v = passes(n, r);
  return {
    id,
    label: o.label ?? 'Lamp',
    options: ON_OFF.map((x) => ({ ...x })),
    answer: lampId(v),
    why: { [lampId(!v)]: explainRow(n, r, t).join(' ') },
    ...(o.compare ? { compare: o.compare } : {}),
  };
}

/** Which row of the table turns the lamp on (or leaves it off)? Only one does. */
function whichRowMark(id: string, n: Net, want: boolean): DrillMark {
  const k = ROWS2.findIndex((r) => passes(n, r) === want);
  if (ROWS2.filter((r) => passes(n, r) === want).length !== 1) throw new Error('whichRowMark: one row only');
  const why: Record<string, string> = {};
  ROWS2.forEach((r, j) => {
    if (j !== k) why[`r${j + 1}`] = `In row ${j + 1}, ${rowClause(r, t)}. ${explainRow(n, r, t).join(' ')}`;
  });
  return {
    id,
    label: want ? 'Which row lights the lamp?' : 'Which row leaves the lamp off?',
    options: ROWS2.map((_, j) => ({ id: `r${j + 1}`, label: `Row ${j + 1}` })),
    answer: `r${k + 1}`,
    why,
  };
}

const caseLabel = (r: Row) => rowShort(r, t);

/**
 * How many switches must be closed to light the lamp: the fewest closed switches in any row that lights it, worked out
 * from the model. Every row with that many closed (or more) must light it too, so the count is a rule, not a guess.
 */
function fewestClosed(n: Net, k: number): number {
  const rows = rowsFor(k);
  const closed = (r: Row) => r.filter(Boolean).length;
  const fewest = Math.min(...rows.filter((r) => passes(n, r)).map(closed));
  if (rows.some((r) => closed(r) >= fewest && !passes(n, r))) throw new Error('fewestClosed: the lamp is not a count of closed switches');
  return fewest;
}

// ---------- misconceptions and “I’m confused” questions ----------

const ONE_AS_ALL =
  'You may be treating “one switch is closed” and “the path is closed” as the same thing. They are two different things. In a line, power must pass every switch. One open switch leaves a gap, so the lamp is off.';
const CLOSED_AS_SHUT =
  'You may be treating a closed switch like a shut door. They are two different things. A closed switch has no gap, so power can pass it. An open switch has a gap, so power stops.';
const SIDE_AS_LINE = 'You may be treating side by side like a line. They are two different things. Side by side, power needs just one closed path. In a line, it must pass every switch.';
const OR_ONE = 'You may be treating side by side as “one but not both.” With both switches closed, power has two paths. The lamp is still on.';
const LINE_AS_SIDE = 'You may be treating a line like side by side. In a line, power must pass every switch. One open switch stops it, so the lamp is off.';
const SWITCH_AS_LAMP =
  'You may be treating “the switch is closed” and “the lamp is on” as the same thing. They are two different things. A flipper box does the opposite of its inside. A closed switch inside it means the box stops power.';
const OPEN_AS_DARK =
  'You may be treating “the switch is open” and “the lamp is off” as the same thing. They are two different things. A flipper box does the opposite of its inside. An open switch inside it means the box lets power through.';
const FLIP_CHANGES_SWITCH = 'You may be treating the flipper box as a change to the switch. The switch is still closed, and power would pass it. The box then does the opposite.';
const LOOKS_AS_WORKS =
  'You may be treating “they look alike” and “they do the same job” as the same thing. They are two different things. Only the table decides. Look for a row where the lamps differ.';
const NOT_EACH = 'You may be treating “one flipper box around both switches” and “a flipper box on each switch” as the same thing. They are not. Work out each lamp, row by row.';
const LOOKS_DIFF_AS_DIFF =
  'You may be treating “they look different” and “they do different jobs” as the same thing. They are two different things. If the lamps agree in every row, the circuits do the same job.';

export const CLOSED_Q: ConfusedQuestion = {
  q: 'A switch is closed. Can power pass it?',
  options: [{ label: 'Yes. Closed means no gap', right: true }, { label: 'No. Closed means shut, like a door' }, { label: 'Not sure' }],
  teach: 'Yes. A closed switch closes the gap, so power can pass. An open switch has a gap, and power stops there. Think of a drawbridge: when it is closed, cars can cross.',
};
export const LINE_Q: ConfusedQuestion = {
  q: 'In a line, must power pass every switch to reach the lamp?',
  options: [{ label: 'Yes. One gap anywhere stops it', right: true }, { label: 'No. One closed switch is enough' }, { label: 'Not sure' }],
  teach: 'Yes. In a line, power goes through one switch and then the next. An open switch anywhere leaves a gap, so the lamp is off.',
};
export const SIDE_Q: ConfusedQuestion = {
  q: 'Side by side, does power need every switch closed?',
  options: [{ label: 'No. One closed path is enough', right: true }, { label: 'Yes. Every switch must be closed' }, { label: 'Not sure' }],
  teach: 'No. Side by side, each switch has its own path. Power needs just one closed path. Two or more closed paths still light the lamp.',
};
export const FLIP_Q: ConfusedQuestion = {
  q: 'A switch sits inside a flipper box. Does the box do what the switch does?',
  options: [{ label: 'No. The box does the opposite', right: true }, { label: 'Yes. The box just copies the switch' }, { label: 'Not sure' }],
  teach: 'No. A flipper box does the opposite of its inside. If its inside would let power through, the box stops it. If its inside would stop power, the box lets it through.',
};
export const SAME_Q: ConfusedQuestion = {
  q: 'Two circuits look alike. Must they do the same job?',
  options: [{ label: 'No. Only the table decides', right: true }, { label: 'Yes. Alike means the same' }, { label: 'Not sure' }],
  teach: 'No. Two circuits do the same job only when their lamps agree in every row. Circuits that look alike can differ in a row, and circuits that look different can agree in all of them.',
};

// ---------- distinctions ----------

export const ONE_VS_ALL: Distinction = { id: 'one-vs-all', a: 'One switch in the line is closed.', b: 'Every switch in the line is closed, so power gets around.' };
export const LINE_VS_SIDE: Distinction = { id: 'line-vs-side', a: 'Switches in a line: power must pass every one.', b: 'Switches side by side: power needs just one closed path.' };
export const CLOSED_VS_LIT: Distinction = { id: 'closed-vs-lit', a: 'The switch is closed.', b: 'The lamp is on.' };
export const LOOKS_VS_WORKS: Distinction = { id: 'looks-vs-works', a: 'Two circuits look alike.', b: 'Two circuits have the same table: the lamps agree in every row.' };

const LAMP_TAGS = { saysWord: 'says:', truth: 'Lamp on', untruth: 'Lamp off' } as const;
const SAM = 'Sam';

// ---------- Lesson 1: in a line ----------

export const LINE2 = LINE(A, B);
export const LINE3 = LINE(A, B, C);
/** Where Lesson 1's cards sit. Boards open after the contrast and after the worked table. */
export const L1_CARDS = { loop: 0, closedOpen: 1, line: 2, contrast: 3, example: 4 } as const;

export const loopScene = (): CircuitScene => circuitScene([frame(SW(0), t, { row: [true], lamp: true })], { caption: 'Switch A is closed, so power gets all the way around. The lamp is on.' });
export const closedOpenScene = (): CircuitScene =>
  circuitScene([frame(SW(0), t, { name: 'Closed', row: [true], lamp: true }), frame(SW(0), t, { name: 'Open', row: [false], lamp: false })]);
export const lineScene = (): CircuitScene => circuitScene([frame(LINE2, t, { row: [true, true], lamp: true })], { caption: 'Two switches in a line, both closed. The lamp is on.' });
export const lineExampleScene = (): CircuitScene =>
  circuitScene([frame(LINE2, t)], { table: circuitTable([LINE2], t, { blank: (k) => k > 1 }), caption: 'Rows 1 and 2 are worked out. Rows 3 and 4 are blank.' });

/** One closed switch next to a closed path: the same switch A, a different switch B. */
export function oneVsAllContrast(): Extract<Scene, { kind: 'contrast' }> {
  const one: Row = [true, false];
  const both: Row = [true, true];
  if (passes(LINE2, one) || !passes(LINE2, both)) throw new Error('oneVsAllContrast: one closed switch is not enough in a line');
  const panel = (r: Row, because: string, then?: string): ContrastPanel => ({
    world: `${Sw(0)} closed, switch ${t.names[1]} ${r[1] ? 'closed' : 'open'}.`,
    who: SAM,
    says: 'Switch A is closed, so the lamp is on.',
    truth: passes(LINE2, r),
    because,
    ...(then ? { then } : {}),
  });
  return {
    kind: 'contrast',
    pairs: [panel(one, 'Power passes A, but the gap at B stops it.', 'One closed switch is not enough in a line.'), panel(both, 'Power passes A and then B, all the way around.')],
    ask: { q: 'Switch A is closed in both. Why is only one lamp on?', a: 'In a line, power must pass every switch. In the first case, switch B is open.' },
    words: { worldTag: 'In a line', ...LAMP_TAGS },
  };
}

export function oneVsAllCard(): IdeaCard {
  return {
    title: 'One closed switch is not enough',
    distinction: ONE_VS_ALL.id,
    body: ['In a line, one closed switch is not enough.', 'Both cases below have switch A closed. Only one lamp is on.', 'So check every switch in the line, not just one.'],
    scene: oneVsAllContrast(),
  };
}

/** Do, board 1 (right after the contrast): three cases in a line. Can power pass each switch? Then the lamp. */
export function oneVsAllBoard(): DrillStep {
  const cases: Row[] = [[true, false], [false, true], [true, true]];
  const rows: DrillRow[] = cases.map((r, j) => {
    const id = `c${j + 1}`;
    return {
      id,
      label: `Case ${j + 1}: ${caseLabel(r)}`,
      marks: [
        passMark(`${id}-a`, 0, r),
        passMark(`${id}-b`, 1, r),
        lampMark(`${id}-lamp`, LINE2, r, { compare: { says: 'In a line, the lamp is on only if power passes every switch.', world: `${caseLabel(r)}.` } }),
      ],
    };
  });
  const misconceptions: Misconception[] = [
    ...cases.flatMap((r, j) => (passes(LINE2, r) ? [] : [{ id: 'one-as-all', when: 'picks' as const, picks: { [`c${j + 1}-lamp`]: 'on' }, text: ONE_AS_ALL }])),
    ...cases.flatMap((r, j) => r.flatMap((v, i) => (v ? [{ id: 'closed-as-shut', when: 'picks' as const, picks: { [`c${j + 1}-${'ab'[i]}`]: 'no' }, text: CLOSED_AS_SHUT }] : []))),
  ];
  return {
    id: 's10.l1-do1',
    title: 'Check every switch',
    body: ['Here are switches A and B in a line. For each case, ask: can power pass A? Can power pass B?', 'Then mark the lamp. It is on only if power passes every switch.'],
    scene: circuitScene([frame(LINE2, t)]),
    twin: 'The same two switches in a line. No case is set yet.',
    afterCard: L1_CARDS.contrast,
    distinction: ONE_VS_ALL.id,
    scaffold: 'full',
    steps: STEPS,
    rows,
    misconceptions,
    confused: [CLOSED_Q, LINE_Q],
    words: words$('Those two ideas are apart now. Back to the board: check every switch in the line.'),
    done: 'Right. In a line, one closed switch is not enough. The lamp is on only when every switch is closed.',
  };
}

/** Do, board 2 (the worked table): fill rows 3 and 4, then pick the row that lights the lamp. */
export function lineTableBoard(): DrillStep {
  return {
    id: 's10.l1-do2',
    title: 'Fill the line table',
    body: ['Rows 1 and 2 are worked out on the card. Mark the lamp in rows 3 and 4.', 'Then pick the one row that lights the lamp.'],
    scene: lineExampleScene(),
    afterCard: L1_CARDS.example,
    rows: [
      ...[2, 3].map((k) => ({ id: `r${k + 1}`, label: `Row ${k + 1}: ${caseLabel(ROWS2[k])}`, marks: [lampMark(`r${k + 1}-lamp`, LINE2, ROWS2[k])] })),
      { id: 'which', label: 'The whole table', marks: [whichRowMark('which', LINE2, true)] },
    ],
    misconceptions: [{ id: 'one-as-all', when: 'picks', picks: { 'r3-lamp': 'on' }, text: ONE_AS_ALL }],
    confused: [LINE_Q],
    words: words$('Back to the board: in a line, look for a gap.'),
    done: 'Right. Only row 1 lights the lamp: A closed and B closed. That is the AND table.',
  };
}

/** Do, board 3 (a twin): a third switch in the line. Four cases, then how many switches must be closed. */
export function threeLineBoard(): DrillStep {
  const rows3 = rowsFor(3);
  const cases = [rows3[0], rows3[1], rows3[2], rows3[4]];
  const need = { id: 'need', label: 'How many switches must be closed?', options: ['1', '2', '3'].map((x) => ({ id: x, label: x })), answer: String(fewestClosed(LINE3, 3)), why: { '1': 'One closed switch is not enough. In a line, every gap must be closed.', '2': 'Two closed switches still leave one open. Its gap stops the power.' } };
  if (need.answer !== '3') throw new Error('threeLineBoard: the words for a wrong mark expect all three closed');
  return {
    id: 's10.l1-do3',
    title: 'Three in a line',
    body: ['Now switch C joins the line. Mark the lamp in each case.', 'Then say how many switches must be closed to light the lamp.'],
    scene: circuitScene([frame(LINE3, t)], { table: circuitTable([LINE3], t, { rows: cases, blank: () => true, rowWord: 'Case' }) }),
    twin: 'A third switch, C, is added to the line.',
    afterCard: L1_CARDS.example,
    rows: [
      ...cases.map((r, j) => ({ id: `c${j + 1}`, label: `Case ${j + 1}: ${caseLabel(r)}`, marks: [lampMark(`c${j + 1}-lamp`, LINE3, r)] })),
      { id: 'need', label: 'The rule', marks: [need] },
    ],
    misconceptions: cases.flatMap((r, j) => (passes(LINE3, r) ? [] : [{ id: 'one-as-all', when: 'picks' as const, picks: { [`c${j + 1}-lamp`]: 'on' }, text: ONE_AS_ALL }])),
    confused: [LINE_Q],
    words: words$('Back to the board: in a line, look for a gap.'),
    done: 'Right. With three in a line, all three must be closed. One open switch is enough to stop the power.',
  };
}

// ---------- Lesson 2: side by side ----------

export const SIDE2 = SIDE(A, B);
export const SIDE3 = SIDE(A, B, C);
export const L2_CARDS = { side: 0, both: 1, contrast: 2, example: 3 } as const;

export const sideScene = (): CircuitScene => circuitScene([frame(SIDE2, t, { row: [true, false], lamp: true })], { caption: 'Side by side: A closed, B open. Power takes the path through A.' });
export const bothScene = (): CircuitScene => circuitScene([frame(SIDE2, t, { row: [true, true], lamp: true })], { caption: 'Both switches closed: two paths. The lamp is still on.' });
export const sideExampleScene = (): CircuitScene =>
  circuitScene([frame(SIDE2, t)], { table: circuitTable([SIDE2], t, { blank: (k) => k > 1 }), caption: 'Rows 1 and 2 are worked out. Rows 3 and 4 are blank.' });

/** The same switches (A closed, B open), wired in a line and side by side. */
export function lineVsSideContrast(): Extract<Scene, { kind: 'contrast' }> {
  const r: Row = [true, false];
  if (passes(LINE2, r) || !passes(SIDE2, r)) throw new Error('lineVsSideContrast: the wiring decides');
  const panel = (n: Net, how: string, because: string): ContrastPanel => ({
    world: `${how}. ${Sw(0)} closed, switch B open.`,
    who: SAM,
    says: 'Switch A is closed, so the lamp is on.',
    truth: passes(n, r),
    because,
  });
  return {
    kind: 'contrast',
    pairs: [panel(LINE2, 'In a line', 'In a line, power must pass B too. The gap at B stops it.'), panel(SIDE2, 'Side by side', 'Power takes the path through A. One closed path is enough.')],
    ask: { q: 'The switches are the same. What changed?', a: 'Only the wiring. In a line, every switch must be closed. Side by side, one closed path is enough.' },
    words: { worldTag: 'Wiring', ...LAMP_TAGS },
  };
}

export function lineVsSideCard(): IdeaCard {
  return {
    title: 'A line or side by side',
    distinction: LINE_VS_SIDE.id,
    body: ['The wiring matters, not just the switches.', 'Below, the switches are the same in both cases: A closed and B open. Only the wiring changes.'],
    scene: lineVsSideContrast(),
  };
}

/** Do, board 1 (right after the contrast): the same case in a line and side by side, then side by side with both closed and none. */
export function lineVsSideBoard(): DrillStep {
  const LINE_SAYS = 'In a line, power must pass every switch.';
  const SIDE_SAYS = 'Side by side, one closed path is enough.';
  const cases: [Net, string, Row][] = [[LINE2, 'In a line', [true, false]], [SIDE2, 'Side by side', [true, false]], [SIDE2, 'Side by side', [true, true]], [SIDE2, 'Side by side', [false, false]]];
  const rows: DrillRow[] = cases.map(([n, how, r], j) => ({
    id: `c${j + 1}`,
    label: `Case ${j + 1}. ${how}: ${caseLabel(r)}`,
    marks: [lampMark(`c${j + 1}-lamp`, n, r, { compare: { says: n === LINE2 ? LINE_SAYS : SIDE_SAYS, world: `${caseLabel(r)}.` } })],
  }));
  return {
    id: 's10.l2-do1',
    title: 'Same switches, new wiring',
    body: ['Here are the two wirings from the card. Mark the lamp in each case.', 'In a line, power must pass every switch. Side by side, one closed path is enough.'],
    scene: circuitScene([frame(LINE2, t, { name: 'In a line' }), frame(SIDE2, t, { name: 'Side by side' })]),
    twin: 'The two wirings from the card, with no case set.',
    afterCard: L2_CARDS.contrast,
    distinction: LINE_VS_SIDE.id,
    scaffold: 'full',
    steps: STEPS,
    rows,
    misconceptions: [
      { id: 'side-as-line', when: 'picks', picks: { 'c2-lamp': 'off' }, text: SIDE_AS_LINE },
      { id: 'or-one', when: 'picks', picks: { 'c3-lamp': 'off' }, text: OR_ONE },
      { id: 'line-as-side', when: 'picks', picks: { 'c1-lamp': 'on' }, text: LINE_AS_SIDE },
    ],
    confused: [SIDE_Q, LINE_Q],
    words: words$('Those two ideas are apart now. Back to the board: look at the wiring, then the switches.'),
    done: 'Right. The same switches can light the lamp side by side and not in a line. Side by side, the lamp is off only when every switch is open.',
  };
}

/** Do, board 2 (the worked table): fill rows 3 and 4, then pick the row that leaves the lamp off. */
export function sideTableBoard(): DrillStep {
  return {
    id: 's10.l2-do2',
    title: 'Fill the side-by-side table',
    body: ['Rows 1 and 2 are worked out on the card. Mark the lamp in rows 3 and 4.', 'Then pick the one row that leaves the lamp off.'],
    scene: sideExampleScene(),
    afterCard: L2_CARDS.example,
    rows: [
      ...[2, 3].map((k) => ({ id: `r${k + 1}`, label: `Row ${k + 1}: ${caseLabel(ROWS2[k])}`, marks: [lampMark(`r${k + 1}-lamp`, SIDE2, ROWS2[k])] })),
      { id: 'which', label: 'The whole table', marks: [whichRowMark('which', SIDE2, false)] },
    ],
    misconceptions: [{ id: 'side-as-line', when: 'picks', picks: { 'r3-lamp': 'off' }, text: SIDE_AS_LINE }],
    confused: [SIDE_Q],
    words: words$('Back to the board: side by side, look for one closed path.'),
    done: 'Right. Only row 4 leaves the lamp off: both switches open. That is the OR table.',
  };
}

/** Do, board 3 (a twin): a third switch side by side. Four cases, then how many must be closed. */
export function threeSideBoard(): DrillStep {
  const rows3 = rowsFor(3);
  const cases = [rows3[0], rows3[3], rows3[6], rows3[7]];
  const need = {
    id: 'need',
    label: 'How many switches must be closed to light the lamp?',
    options: [{ id: '1', label: 'At least 1' }, { id: '2', label: 'At least 2' }, { id: '3', label: 'All 3' }],
    answer: String(fewestClosed(SIDE3, 3)),
    why: { '2': 'One closed path is enough. With just one switch closed, power takes that path.', '3': 'That is a line. Side by side, power needs just one closed path.' },
  };
  if (need.answer !== '1') throw new Error('threeSideBoard: the words for a wrong mark expect one closed path');
  return {
    id: 's10.l2-do3',
    title: 'Three side by side',
    body: ['Now switch C is a third path. Mark the lamp in each case.', 'Then say how many switches must be closed to light the lamp.'],
    scene: circuitScene([frame(SIDE3, t)], { table: circuitTable([SIDE3], t, { rows: cases, blank: () => true, rowWord: 'Case' }) }),
    twin: 'A third switch, C, is added side by side.',
    afterCard: L2_CARDS.example,
    rows: [
      ...cases.map((r, j) => ({ id: `c${j + 1}`, label: `Case ${j + 1}: ${caseLabel(r)}`, marks: [lampMark(`c${j + 1}-lamp`, SIDE3, r)] })),
      { id: 'need', label: 'The rule', marks: [need] },
    ],
    misconceptions: [{ id: 'or-one', when: 'picks', picks: { 'c1-lamp': 'off' }, text: OR_ONE }],
    confused: [SIDE_Q],
    words: words$('Back to the board: side by side, look for one closed path.'),
    done: 'Right. Side by side, one closed switch is enough, and more closed switches still light the lamp.',
  };
}

// ---------- Lesson 3: the flipper box ----------

export const FLIP1 = FLIP(A);
export const FLIP_LINE = LINE(FLIP(A), B);
export const FLIP_SIDE = SIDE(FLIP(A), B);
export const L3_CARDS = { box: 0, not: 1, contrast: 2, example: 3 } as const;

export const flipScene = (): CircuitScene => circuitScene([frame(FLIP1, t, { row: [false], lamp: true })], { caption: 'Switch A is open, so the flipper box lets power through. The lamp is on.' });
export const flipTableScene = (): CircuitScene => circuitScene([frame(FLIP1, t)], { table: circuitTable([FLIP1], t) });
export const flipExampleScene = (): CircuitScene =>
  circuitScene([frame(FLIP_LINE, t)], { table: circuitTable([FLIP_LINE], t, { blank: (k) => k > 1 }), caption: 'Rows 1 and 2 are worked out. Rows 3 and 4 are blank.' });

/** The same closed switch, alone and inside a flipper box. */
export function closedVsLitContrast(): Extract<Scene, { kind: 'contrast' }> {
  const r: Row = [true];
  if (!passes(SW(0), r) || passes(FLIP1, r)) throw new Error('closedVsLitContrast: the flipper box flips the lamp');
  return {
    kind: 'contrast',
    pairs: [
      { world: 'Switch A alone. A is closed.', who: SAM, says: 'Switch A is closed, so the lamp is on.', truth: passes(SW(0), r), because: 'Power passes the closed switch and reaches the lamp.' },
      {
        world: 'Switch A inside a flipper box. A is closed.',
        who: SAM,
        says: 'Switch A is closed, so the lamp is on.',
        truth: passes(FLIP1, r),
        because: 'Power would pass A, so the flipper box does the opposite and stops it.',
        then: 'The switch is closed, but the lamp is off.',
      },
    ],
    ask: { q: 'Switch A is closed in both. Why is one lamp off?', a: 'The flipper box does the opposite of its inside. A closed switch and a lit lamp are two different things.' },
    words: { worldTag: 'Circuit', ...LAMP_TAGS },
  };
}

export function closedVsLitCard(): IdeaCard {
  return {
    title: 'Closed is not the same as on',
    distinction: CLOSED_VS_LIT.id,
    body: ['A closed switch does not always mean the lamp is on.', 'Both cases below have switch A closed. In the second, A sits inside a flipper box.'],
    scene: closedVsLitContrast(),
  };
}

/** Do, board 1 (right after the contrast): switch A alone, then in a flipper box, closed and open. */
export function closedVsLitBoard(): DrillStep {
  const alone: Row = [true];
  const rows: DrillRow[] = [
    { id: 'c1', label: 'Case 1. Alone: A closed', marks: [passMark('c1-a', 0, alone), lampMark('c1-lamp', SW(0), alone)] },
    ...[[true], [false]].map((r, j): DrillRow => {
      const id = `c${j + 2}`;
      return {
        id,
        label: `Case ${j + 2}. In a flipper box: A ${r[0] ? 'closed' : 'open'}`,
        marks: [
          { ...passMark(`${id}-a`, 0, r), label: 'Would power pass A?' },
          boxMark(`${id}-box`, 0, r),
          lampMark(`${id}-lamp`, FLIP1, r, { compare: { says: 'The flipper box does the opposite of its inside.', world: `A ${r[0] ? 'closed' : 'open'}.` } }),
        ],
      };
    }),
  ];
  return {
    id: 's10.l3-do1',
    title: 'Switch or lamp?',
    body: ['Here is switch A, once alone and once inside a flipper box. For each case, start with the switch.', 'Then the box, if there is one. Last, mark the lamp.'],
    scene: circuitScene([frame(SW(0), t, { name: 'Alone' }), frame(FLIP1, t, { name: 'In a flipper box' })]),
    twin: 'Switch A from the card, alone and in a flipper box, with no case set.',
    afterCard: L3_CARDS.contrast,
    distinction: CLOSED_VS_LIT.id,
    scaffold: 'full',
    steps: ['Look at the switch: closed lets power pass, open stops it.', 'At a flipper box, do the opposite.', 'Mark the lamp: on if power gets all the way around.'],
    rows,
    misconceptions: [
      { id: 'switch-as-lamp', when: 'picks', picks: { 'c2-lamp': 'on' }, text: SWITCH_AS_LAMP },
      { id: 'switch-as-lamp', when: 'picks', picks: { 'c2-box': 'yes' }, text: SWITCH_AS_LAMP },
      { id: 'switch-as-lamp', when: 'picks', picks: { 'c3-lamp': 'off' }, text: OPEN_AS_DARK },
      { id: 'flip-changes-switch', when: 'picks', picks: { 'c2-a': 'no' }, text: FLIP_CHANGES_SWITCH },
    ],
    confused: [FLIP_Q, CLOSED_Q],
    words: words$('Those two ideas are apart now. Back to the board: the switch first, then the box, then the lamp.'),
    done: 'Right. Inside a flipper box, a closed switch turns the lamp off, and an open switch turns it on.',
  };
}

/** Do, board 2 (the worked table): rows 3 and 4 of the flipper box in a line with B: the box, then the lamp. */
export function flipTableBoard(): DrillStep {
  return {
    id: 's10.l3-do2',
    title: 'Fill the flipper table',
    body: ['Rows 1 and 2 are worked out on the card. Now do rows 3 and 4.', 'First the box on A, then the lamp. In a line, power must pass the box and B.'],
    scene: flipExampleScene(),
    afterCard: L3_CARDS.example,
    rows: [2, 3].map((k) => ({ id: `r${k + 1}`, label: `Row ${k + 1}: ${caseLabel(ROWS2[k])}`, marks: [boxMark(`r${k + 1}-box`, 0, ROWS2[k]), lampMark(`r${k + 1}-lamp`, FLIP_LINE, ROWS2[k])] })),
    misconceptions: [{ id: 'switch-as-lamp', when: 'picks', picks: { 'r3-box': 'no' }, text: OPEN_AS_DARK }],
    confused: [FLIP_Q],
    words: words$('Back to the board: the box first, then the line.'),
    done: 'Right. Only row 3 lights the lamp: A open, so its box lets power through, and B closed.',
  };
}

/** Do, board 3 (a twin): the flipper box on A and switch B side by side. Every row, then the row that leaves it off. */
export function flipSideBoard(): DrillStep {
  return {
    id: 's10.l3-do3',
    title: 'A flipper box side by side',
    body: ['Now the box on A and switch B are side by side. Mark the lamp in each row.', 'Then pick the one row that leaves the lamp off.'],
    scene: circuitScene([frame(FLIP_SIDE, t)], { table: circuitTable([FLIP_SIDE], t, { blank: () => true }) }),
    twin: 'The flipper box on A and switch B are now side by side.',
    afterCard: L3_CARDS.example,
    rows: [
      ...ROWS2.map((r, k) => ({ id: `r${k + 1}`, label: `Row ${k + 1}: ${caseLabel(r)}`, marks: [lampMark(`r${k + 1}-lamp`, FLIP_SIDE, r)] })),
      { id: 'which', label: 'The whole table', marks: [whichRowMark('which', FLIP_SIDE, false)] },
    ],
    misconceptions: [{ id: 'switch-as-lamp', when: 'picks', picks: { 'r2-lamp': 'on' }, text: SWITCH_AS_LAMP }],
    confused: [FLIP_Q, SIDE_Q],
    words: words$('Back to the board: the box first, then the paths.'),
    done: 'Right. Only row 2 leaves the lamp off: A closed, so its box stops power, and B open.',
  };
}

// ---------- Lesson 4: from table to circuit ----------

/** The first pair: they look different, and their tables match. The second pair: they look alike, and do not. */
export const SAME_LOOK_DIFF: [Net, Net] = [FLIP(SIDE(A, B)), LINE(FLIP(A), FLIP(B))];
export const DIFF_LOOK_SAME: [Net, Net] = [FLIP(LINE(A, B)), LINE(FLIP(A), FLIP(B))];
export const SAME_BOARD: [Net, Net] = [FLIP(LINE(A, B)), SIDE(FLIP(A), FLIP(B))];
export const ORDER_PAIR: [Net, Net] = [LINE(A, B), LINE(B, A)];
export const L4_CARDS = { table: 0, same: 1, contrast: 2, example: 3, match: 4 } as const;

const named = (pair: readonly [Net, Net]) => [frame(pair[0], t, { name: 'Circuit 1' }), frame(pair[1], t, { name: 'Circuit 2' })];
export const tableScene = (): CircuitScene => circuitScene([frame(SIDE2, t)], { table: circuitTable([SIDE2], t) });
export const orderScene = (): CircuitScene => circuitScene(named(ORDER_PAIR), { table: circuitTable([...ORDER_PAIR], t) });
export const sameExampleScene = (): CircuitScene => circuitScene(named(SAME_LOOK_DIFF), { table: circuitTable([...SAME_LOOK_DIFF], t) });

const rowsWord = (ks: readonly number[]) => (ks.length === 1 ? `row ${ks[0] + 1}` : `rows ${ks.map((k) => k + 1).join(' and ')}`);

/** Two pairs: one looks different with the same table, one looks alike with a different table. */
export function looksVsWorksContrast(): Extract<Scene, { kind: 'contrast' }> {
  const [s1, s2] = SAME_LOOK_DIFF;
  const [d1, d2] = DIFF_LOOK_SAME;
  if (!sameJob(s1, s2) || sameJob(d1, d2)) throw new Error('looksVsWorksContrast: the first pair agrees, the second does not');
  const onRows = ROWS2.flatMap((r, k) => (passes(s1, r) ? [k] : []));
  const k = differRows(d1, d2)[0];
  return {
    kind: 'contrast',
    pairs: [
      {
        world: `Circuit 1: ${words(s1)}. Circuit 2: ${words(s2)}.`,
        who: SAM,
        says: 'These two circuits do the same job.',
        truth: sameJob(s1, s2),
        because: `Both lamps are on only in ${rowsWord(onRows)}, when A and B are both open. They agree in every row.`,
      },
      {
        world: `Circuit 1: ${words(d1)}. Circuit 2: ${words(d2)}.`,
        who: SAM,
        says: 'These two circuits do the same job.',
        truth: sameJob(d1, d2),
        because: `In row ${k + 1}, ${rowClause(ROWS2[k], t)}. Lamp 1 is ${passes(d1, ROWS2[k]) ? 'on' : 'off'}, but lamp 2 is ${passes(d2, ROWS2[k]) ? 'on' : 'off'}.`,
      },
    ],
    ask: { q: 'Which pair looks more alike?', a: 'The second pair: both have A and B in a line. But only the first pair does the same job. Check every row, not the looks.' },
    words: { worldTag: 'Circuits', saysWord: 'says:', truth: 'Same table', untruth: 'Not the same table' },
  };
}

export function looksVsWorksCard(): IdeaCard {
  return {
    title: 'Looks do not decide the job',
    distinction: LOOKS_VS_WORKS.id,
    body: ['How a circuit looks does not tell you its job. Only its table does.', 'Below, the first pair looks different but has the same table. The second pair looks alike but does not.'],
    scene: looksVsWorksContrast(),
  };
}

/** A board for a pair of circuits: both lamps in every row, then the same table or not. */
function pairBoard(o: { id: string; title: string; pair: [Net, Net]; body: string[]; twin: string; afterCard: number; distinction?: string; done: string; misconceptions: Misconception[]; confused: ConfusedQuestion[]; closing: string }): DrillStep {
  const [n1, n2] = o.pair;
  const same = sameJob(n1, n2);
  const diff = differRows(n1, n2);
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    scene: circuitScene(named(o.pair), { table: circuitTable([n1, n2], t, { blank: () => true }) }),
    twin: o.twin,
    afterCard: o.afterCard,
    ...(o.distinction ? { distinction: o.distinction, scaffold: 'full' as const } : {}),
    rows: [
      ...ROWS2.map((r, k) => ({ id: `r${k + 1}`, label: `Row ${k + 1}: ${caseLabel(r)}`, marks: [lampMark(`r${k + 1}-l1`, n1, r, { label: 'Lamp 1' }), lampMark(`r${k + 1}-l2`, n2, r, { label: 'Lamp 2' })] })),
      {
        id: 'same',
        label: 'Both columns',
        marks: [{
          id: 'same',
          label: 'Do they have the same table?',
          options: YES_NO.map((x) => ({ ...x })),
          answer: yn(same),
          why: { [yn(!same)]: same ? 'The two lamps agree in every row. So the circuits do the same job, even though they look different.' : `The lamps differ in ${rowsWord(diff)}. One row that differs is enough.` },
        }],
      },
    ],
    misconceptions: o.misconceptions,
    confused: o.confused,
    words: words$(o.closing),
    done: o.done,
  };
}

/** Do, board 1 (right after the contrast): the pair that looks alike, both lamps in every row, then same table or not. */
export function looksVsWorksBoard(): DrillStep {
  const [d1, d2] = DIFF_LOOK_SAME;
  const diff = differRows(d1, d2);
  return pairBoard({
    id: 's10.l4-do1',
    title: 'Alike, but the same job?',
    pair: DIFF_LOOK_SAME,
    body: ['Here is the second pair from the card. Mark both lamps in each row.', 'Then say if the two circuits have the same table.'],
    twin: 'The second pair from the card, drawn, with a blank table.',
    afterCard: L4_CARDS.contrast,
    distinction: LOOKS_VS_WORKS.id,
    misconceptions: [
      { id: 'looks-as-works', when: 'picks', picks: { same: 'yes' }, text: LOOKS_AS_WORKS },
      ...diff.map((k) => ({ id: 'not-each', when: 'picks' as const, picks: { [`r${k + 1}-l2`]: passes(d1, ROWS2[k]) ? 'on' : 'off' }, text: NOT_EACH })),
    ],
    confused: [SAME_Q, FLIP_Q],
    closing: 'Those two ideas are apart now. Back to the board: compare the lamps, row by row.',
    done: `Right. They look alike, but the lamps differ in ${rowsWord(diff)}. So they do not do the same job.`,
  });
}

/** Do, board 2 (a twin of the worked pair): a new pair that looks different. Both lamps, then the same table or not. */
export function sameBoard(): DrillStep {
  return pairBoard({
    id: 's10.l4-do2',
    title: 'Different, but the same job?',
    pair: SAME_BOARD,
    body: ['Circuit 1 has one flipper box around A and B in a line. Circuit 2 has a flipper box on each switch, side by side.', 'Mark both lamps in each row. Then say if they have the same table.'],
    twin: 'A new pair: a box around a line, and a box on each switch, side by side.',
    afterCard: L4_CARDS.example,
    misconceptions: [{ id: 'looks-differ-as-differ', when: 'picks', picks: { same: 'no' }, text: LOOKS_DIFF_AS_DIFF }],
    confused: [SAME_Q],
    closing: 'Back to the board: compare the lamps, row by row.',
    done: 'Right. They look different, but the lamps agree in every row. So they do the same job.',
  });
}


// ---------- Lesson 5: the two-way switch ----------

export const L5_CARDS = { hall: 0, wires: 1, contrast: 2, side: 3, example: 4, pick: 5 } as const;
export const UP_VS_DIFFER: Distinction = { id: 'up-vs-differ', a: 'One switch of the two-way pair is up.', b: 'The two switches differ, one up and one down, so the lamp is on.' };
/** A case of the two-way pair in short: “A up, B down”. */
const twoLabel = (r: Row) => rowShort(r, t, TWO);
const BOTH_UP: Row = [true, true];
/** The rows (0-based) where a circuit's lamp is on. */
const onRows = (n: Net) => ROWS2.flatMap((r, k) => (passes(n, r) ? [k] : []));

const UP_AS_ON =
  'You may be treating “a switch is up” and “the lamp is on” as the same thing. They are two different things. The lamp is on only when the switches differ. With both up, they match, so the lamp is off.';
const DOWN_AS_OFF =
  'You may be treating “a switch is down” and “the lamp is off” as the same thing. They are two different things. With one switch down and the other up, they differ, so the lamp is on.';
const MATCH_AS_ON = 'You may be treating “the switches match” and “the lamp is on” as the same thing. It is the other way round. The lamp is on when the switches differ: one up and one down.';
const TWO_AS_SIDE =
  'You may be treating the two-way pair like switches side by side. They are two different things. Side by side, both closed lights the lamp. In a two-way pair, both up leaves it off.';
const LOOKS_LIKE_TABLE = 'You may be treating “it matches row 1” and “it has the table” as the same thing. One row is not enough. A circuit has the table only when it matches every row.';

export const TWO_Q: ConfusedQuestion = {
  q: 'Switch A of a two-way pair is up. Is the lamp on?',
  options: [{ label: 'It depends on switch B', right: true }, { label: 'Yes. Up means on' }, { label: 'Not sure' }],
  teach: 'It depends on switch B. A two-way pair lights the lamp only when its switches differ. If B is down, the lamp is on. If B is up too, it is off.',
};
export const TWO_SIDE_Q: ConfusedQuestion = {
  q: 'Both switches of a two-way pair are up. Is the lamp on, like side by side?',
  options: [{ label: 'No. Both up, they match, so it is off', right: true }, { label: 'Yes. It works like side by side' }, { label: 'Not sure' }],
  teach: 'No. Side by side, two closed paths still light the lamp. A two-way pair lights the lamp only when its switches differ. Both up, they match, so the lamp is off.',
};

/** Do the two switches of the pair match (both up or both down)? */
function matchMark(id: string, r: Row): DrillMark {
  const same = r[0] === r[1];
  const said = `${Sw(0)} is ${pos(r[0])} and switch ${t.names[1]} is ${pos(r[1])}.`;
  return {
    id,
    label: `Do ${t.names[0]} and ${t.names[1]} match?`,
    options: YES_NO.map((o) => ({ ...o })),
    answer: yn(same),
    why: { [yn(!same)]: same ? `${said} Both are ${pos(r[0])}, so they match.` : `${said} One is up and one is down, so they differ.` },
  };
}

/** The rule a table shows: the lamp is on when the switches match, or when they differ. Worked out from every row. */
function ruleMark(id: string, n: Net): DrillMark {
  const differ = ROWS2.every((r) => passes(n, r) === (r[0] !== r[1]));
  const match = ROWS2.every((r) => passes(n, r) === (r[0] === r[1]));
  if (differ === match) throw new Error('ruleMark: the lamp is not a match-or-differ rule');
  const answer = differ ? 'differ' : 'match';
  const k = ROWS2.findIndex((r) => (r[0] === r[1]) === differ);
  return {
    id,
    label: 'The lamp is on when the switches…',
    options: [{ id: 'match', label: 'Match' }, { id: 'differ', label: 'Differ' }],
    answer,
    why: { [differ ? 'match' : 'differ']: `Look at row ${k + 1}: ${explainRow(n, ROWS2[k], t).join(' ')}` },
  };
}

/** In which row do two circuits' lamps differ? Only one row does. */
function differRowMark(id: string, n1: Net, n2: Net): DrillMark {
  const diff = differRows(n1, n2);
  if (diff.length !== 1) throw new Error('differRowMark: one row only');
  const why: Record<string, string> = {};
  ROWS2.forEach((r, j) => {
    if (j !== diff[0]) why[`r${j + 1}`] = `In row ${j + 1}, both lamps are ${lampId(passes(n1, r))}. Look for the row where one is on and the other is off.`;
  });
  return { id, label: 'In which row do the lamps differ?', options: ROWS2.map((_, j) => ({ id: `r${j + 1}`, label: `Row ${j + 1}` })), answer: `r${diff[0] + 1}`, why };
}

export const hallScene = (): CircuitScene => {
  const r: Row = [true, false];
  return circuitScene([frame(TWO, t, { row: r, lamp: passes(TWO, r) })], { caption: `Switch A is up and switch B is down. The lamp is ${lampId(passes(TWO, r))}.` });
};
export const wiresScene = (): CircuitScene =>
  circuitScene([frame(TWO, t, { row: BOTH_UP, lamp: passes(TWO, BOTH_UP) })], { caption: `Both switches are up. ${twoWayWhyShort(passes(TWO, BOTH_UP))} The lamp is ${lampId(passes(TWO, BOTH_UP))}.` });
function twoWayWhyShort(through: boolean): string {
  return through ? 'Both levers touch the same wire.' : 'Their levers touch different wires.';
}
export const sideVsTwoScene = (): CircuitScene =>
  circuitScene([frame(SIDE_TWIN, t, { name: 'Side by side', row: BOTH_UP, lamp: passes(SIDE_TWIN, BOTH_UP) }), frame(TWO, t, { name: 'Two-way pair', row: BOTH_UP, lamp: passes(TWO, BOTH_UP) })], {
    caption: `Side by side, both closed: the lamp is ${lampId(passes(SIDE_TWIN, BOTH_UP))}. Two-way pair, both up: the lamp is ${lampId(passes(TWO, BOTH_UP))}.`,
  });
export const twoExampleScene = (): CircuitScene =>
  circuitScene([frame(TWO, t)], { table: circuitTable([TWO], t, { blank: (k) => k > 1 }), caption: 'Rows 1 and 2 are worked out. Rows 3 and 4 are blank.' });
/** Lesson 5's three circuits, in a fixed order: plain switches side by side, the two-way pair, plain switches in a line. */
const PICK_SHOWN: readonly Net[] = [PICK_POOL[1], PICK_POOL[0], PICK_POOL[2]];
const pickFrames = () => PICK_SHOWN.map((n, j) => frame(n, t, { name: `Circuit ${j + 1}` }));
export const pickExampleScene = (): CircuitScene => circuitScene(pickFrames(), { table: circuitTable([TWO], t, { inputWords: TRUE_FALSE }), caption: TRUE_CAPTION });

/** Card 1: a switch at each end. */
export function hallCard(): IdeaCard {
  return {
    title: 'A switch at each end',
    scene: hallScene(),
    body: [
      'A long hall has one lamp and a switch at each end. You can work the lamp from either end.',
      'Each one is a two-way switch. Its lever is up or down, and it sends power along one of two wires.',
      `Here switch A is up and switch B is down, and the lamp is ${lampId(passes(TWO, [true, false]))}.`,
    ],
  };
}

/** Card 2: follow the wires. Both up: the levers touch different wires. */
export function wiresCard(): IdeaCard {
  if (passes(TWO, BOTH_UP) || !passes(TWO, [true, false])) throw new Error('wiresCard: the switches must differ to light the lamp');
  return {
    title: 'Follow the wires',
    scene: wiresScene(),
    body: [
      'The two wires cross on the way. So the wire from the top of A ends at the bottom of B.',
      'Power gets through only when both levers touch the same wire. That happens when the switches differ: one up and one down.',
      'Here both switches are up, so their levers touch different wires. The lamp is off. Flip either switch, and it comes on.',
    ],
  };
}

/** One switch up, then both up: the same claim, and only one lamp on. */
export function upVsDifferContrast(): Extract<Scene, { kind: 'contrast' }> {
  const differ: Row = [true, false];
  if (!passes(TWO, differ) || passes(TWO, BOTH_UP)) throw new Error('upVsDifferContrast: one up is on, both up is off');
  const panel = (r: Row, because: string, then?: string): ContrastPanel => ({
    world: `${Sw(0)} up, switch ${t.names[1]} ${pos(r[1])}.`,
    who: SAM,
    says: 'Switch A is up, so the lamp is on.',
    truth: passes(TWO, r),
    because,
    ...(then ? { then } : {}),
  });
  return {
    kind: 'contrast',
    pairs: [panel(differ, 'A is up and B is down. They differ, so both levers touch the same wire.'), panel(BOTH_UP, 'B is up too. They match, so the levers touch different wires.', 'Switch A is up, but the lamp is off.')],
    ask: { q: 'Switch A is up in both. Why is only one lamp on?', a: 'A two-way pair lights the lamp only when its switches differ. In the second case, switch B is up too.' },
    words: { worldTag: 'Two-way pair', ...LAMP_TAGS },
  };
}

export function upVsDifferCard(): IdeaCard {
  return {
    title: 'Up is not the same as on',
    distinction: UP_VS_DIFFER.id,
    body: ['One switch being up does not tell you the lamp. Look at both switches.', 'Both cases below have switch A up. Only one lamp is on.'],
    scene: upVsDifferContrast(),
  };
}

/** Card 4: not like side by side. The two tables differ in one row only: both true. */
export function sideVsTwoCard(): IdeaCard {
  const diff = differRows(SIDE_TWIN, TWO);
  if (diff.length !== 1 || diff[0] !== 0) throw new Error('sideVsTwoCard: side by side and the two-way pair differ in row 1 only');
  return {
    title: 'Not like side by side',
    scene: sideVsTwoScene(),
    body: [
      'Side by side is OR, from NOT, AND, OR. One closed switch or both lights the lamp.',
      'A two-way pair is one but not both, from Truth Tables. Grown-ups call it exclusive or, so a two-way switch is exclusive or in wires.',
      'In a table, up is like True, just as closed is. So the two tables differ in one row only: row 1, with both switches True.',
    ],
  };
}

/** Card 5: the worked table, rows 1 and 2. */
export function twoExampleCard(): IdeaCard {
  return {
    title: 'Example: the two-way table',
    scene: twoExampleScene(),
    body: [
      'A table lists every case, one row each. Up is like True, so row 1 has both switches up.',
      `Row 1: ${explainRow(TWO, ROWS2[0], t).join(' ')}`,
      `Row 2: ${explainRow(TWO, ROWS2[1], t).join(' ')}`,
      'Now you fill rows 3 and 4.',
    ],
  };
}

/** Card 6: from a table to a circuit. Row 1 crosses out side by side and the line. */
export function pickCard(): IdeaCard {
  const [c1, c2, c3] = PICK_SHOWN;
  if (!passes(c1, BOTH_UP) || passes(c2, BOTH_UP) || !passes(c3, BOTH_UP) || !sameJob(c2, TWO) || sameJob(c1, TWO) || sameJob(c3, TWO)) throw new Error('pickCard: row 1 rules out circuits 1 and 3');
  return {
    title: 'From a table to a circuit',
    scene: pickExampleScene(),
    body: [
      'Which circuit has this table? True means up for a two-way switch, and closed for a plain one.',
      'Row 1 has every switch True. Circuits 1 and 3 light the lamp there, but the table says off. Cross them out.',
      'Circuit 2, the two-way pair, matches every row. It has this table.',
    ],
  };
}

/** Do, board 1 (right after the contrast): four cases of the pair. Do A and B match? Then the lamp. */
export function upVsDifferBoard(): DrillStep {
  const cases: Row[] = [[true, false], [true, true], [false, false], [false, true]];
  const rows: DrillRow[] = cases.map((r, j) => {
    const id = `c${j + 1}`;
    return {
      id,
      label: `Case ${j + 1}: ${twoLabel(r)}`,
      marks: [matchMark(`${id}-match`, r), lampMark(`${id}-lamp`, TWO, r, { compare: { says: 'A two-way pair lights the lamp only when its switches differ.', world: `${twoLabel(r)}.` } })],
    };
  });
  const misconceptions: Misconception[] = [
    ...cases.flatMap((r, j) => (!passes(TWO, r) && r[0] && r[1] ? [{ id: 'up-as-on', when: 'picks' as const, picks: { [`c${j + 1}-lamp`]: 'on' }, text: UP_AS_ON }] : [])),
    ...cases.flatMap((r, j) => (passes(TWO, r) && !r[0] ? [{ id: 'down-as-off', when: 'picks' as const, picks: { [`c${j + 1}-lamp`]: 'off' }, text: DOWN_AS_OFF }] : [])),
  ];
  return {
    id: 's10.l5-do1',
    title: 'Match or differ?',
    body: ['Here is the two-way pair from the card. For each case, ask: do A and B match?', 'Then mark the lamp. It is on only when the switches differ.'],
    scene: circuitScene([frame(TWO, t)]),
    twin: 'The two-way pair from the card. No case is set yet.',
    afterCard: L5_CARDS.contrast,
    distinction: UP_VS_DIFFER.id,
    scaffold: 'full',
    steps: ['Look at each switch: up or down.', 'Ask: do the two switches match or differ?', 'Mark the lamp: on if they differ, off if they match.'],
    rows,
    misconceptions,
    confused: [TWO_Q, TWO_SIDE_Q],
    words: words$('Those two ideas are apart now. Back to the board: look at both switches.'),
    done: 'Right. One switch up is not enough to know. The lamp is on only when the switches differ: one up and one down.',
  };
}

/** Do, board 2 (after the side-by-side card): both lamps in rows 1 and 4, then the one row where they differ. */
export function sideVsTwoBoard(): DrillStep {
  const ks = [0, 3];
  const diff = differRows(SIDE_TWIN, TWO);
  return {
    id: 's10.l5-do2',
    title: 'Two-way or side by side?',
    body: ['Here are side by side and the two-way pair. Rows 2 and 3 are filled in.', 'Mark both lamps in rows 1 and 4. Then pick the row where the lamps differ.'],
    scene: circuitScene([frame(SIDE_TWIN, t, { name: 'Side by side' }), frame(TWO, t, { name: 'Two-way pair' })], {
      table: circuitTable([SIDE_TWIN, TWO], t, { blank: (k) => ks.includes(k), lampHeads: ['Side by side', 'Two-way'], inputWords: TRUE_FALSE }),
      caption: 'True means closed for side by side, and up for the two-way pair.',
    }),
    twin: 'The two circuits from the card, with no case set, and their table.',
    afterCard: L5_CARDS.side,
    rows: [
      ...ks.flatMap((k): DrillRow[] => [
        { id: `r${k + 1}-side`, label: `Row ${k + 1}. Side by side: ${rowShort(ROWS2[k], t, SIDE_TWIN)}`, marks: [lampMark(`r${k + 1}-side`, SIDE_TWIN, ROWS2[k])] },
        { id: `r${k + 1}-two`, label: `Row ${k + 1}. Two-way pair: ${twoLabel(ROWS2[k])}`, marks: [lampMark(`r${k + 1}-two`, TWO, ROWS2[k])] },
      ]),
      { id: 'which', label: 'The whole table', marks: [differRowMark('which', SIDE_TWIN, TWO)] },
    ],
    misconceptions: [{ id: 'two-as-side', when: 'picks', picks: { 'r1-two': 'on' }, text: TWO_AS_SIDE }],
    confused: [TWO_SIDE_Q, SIDE_Q],
    words: words$('Back to the board: work out each lamp on its own.'),
    done: `Right. The lamps differ only in ${rowsWord(diff)}. Side by side, both closed is on. In the two-way pair, both up is off.`,
  };
}

/** Do, board 3 (the worked table): rows 3 and 4, then the rule. */
export function twoTableBoard(): DrillStep {
  return {
    id: 's10.l5-do3',
    title: 'Fill the two-way table',
    body: ['Rows 1 and 2 are worked out on the card. Mark the lamp in rows 3 and 4.', 'Then finish the rule: is the lamp on when the switches match, or when they differ?'],
    scene: twoExampleScene(),
    afterCard: L5_CARDS.example,
    rows: [
      ...[2, 3].map((k) => ({ id: `r${k + 1}`, label: `Row ${k + 1}: ${twoLabel(ROWS2[k])}`, marks: [lampMark(`r${k + 1}-lamp`, TWO, ROWS2[k])] })),
      { id: 'rule', label: 'The whole table', marks: [ruleMark('rule', TWO)] },
    ],
    misconceptions: [
      ...[2, 3].flatMap((k) => (passes(TWO, ROWS2[k]) && !ROWS2[k][0] ? [{ id: 'down-as-off', when: 'picks' as const, picks: { [`r${k + 1}-lamp`]: 'off' }, text: DOWN_AS_OFF }] : [])),
      { id: 'match-as-on', when: 'picks', picks: { rule: 'match' }, text: MATCH_AS_ON },
    ],
    confused: [TWO_Q],
    words: words$('Back to the board: do the switches match or differ?'),
    done: `Right. The lamp is on in ${rowsWord(onRows(TWO))}, where the switches differ. That is one but not both.`,
  };
}

/** Do, board 4 (a twin of the worked pick): the same three circuits and a new table, side by side’s. */
export function pickBoard(): DrillStep {
  const target = SIDE_TWIN;
  const cases: [number, number][] = [[0, 0], [1, 0], [2, 0], [2, 1]];
  const right = PICK_SHOWN.findIndex((n) => sameJob(n, target));
  if (PICK_SHOWN.filter((n) => sameJob(n, target)).length !== 1) throw new Error('pickBoard: one circuit has the table');
  const col = ROWS2.map((r) => passes(target, r));
  const pickWhy: Record<string, string> = {};
  PICK_SHOWN.forEach((n, j) => {
    if (j === right) return;
    const k = differRows(n, target)[0];
    pickWhy[`c${j + 1}`] = `In row ${k + 1}, circuit ${j + 1}’s lamp is ${lampId(passes(n, ROWS2[k]))}, but the table says ${lampId(col[k])}. One row that does not match rules a circuit out.`;
  });
  return {
    id: 's10.l5-do4',
    title: 'Which circuit has this table?',
    body: ['Here are the same three circuits with a new table. Mark the lamps the board asks for.', 'Compare each lamp with the table. Then pick the circuit that has this table.'],
    scene: circuitScene(pickFrames(), { table: circuitTable([target], t, { inputWords: TRUE_FALSE }), caption: TRUE_CAPTION }),
    twin: 'The same three circuits. The table is new: it is side by side’s.',
    afterCard: L5_CARDS.pick,
    rows: [
      ...cases.map(([j, k]): DrillRow => ({ id: `r${k + 1}-c${j + 1}`, label: `Row ${k + 1}. Circuit ${j + 1}: ${rowShort(ROWS2[k], t, PICK_SHOWN[j])}`, marks: [lampMark(`r${k + 1}-c${j + 1}`, PICK_SHOWN[j], ROWS2[k])] })),
      {
        id: 'pick',
        label: 'The whole table',
        marks: [{ id: 'pick', label: 'Which circuit has this table?', options: PICK_SHOWN.map((_, j) => ({ id: `c${j + 1}`, label: `Circuit ${j + 1}` })), answer: `c${right + 1}`, why: pickWhy }],
      },
    ],
    misconceptions: [{ id: 'one-row-enough', when: 'picks', picks: { pick: 'c3' }, text: LOOKS_LIKE_TABLE }],
    confused: [SAME_Q],
    words: words$('Back to the board: check each circuit row by row.'),
    done: `Right. Circuit ${right + 1} matches the table in every row. One row that does not match rules a circuit out.`,
  };
}

/** For tests: the cases a board uses, by row id, when they are rows of the two-switch table. */
export const rowOf = (k: number): Row => ROWS2[k];
export const isRow = (r: Row, k: number) => sameRow(r, ROWS2[k]);
