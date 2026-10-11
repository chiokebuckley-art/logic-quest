/**
 * Stop 9 · Truth Tables: the See and Do pieces. The worked tables on the key-idea cards, the contrast cards that teach
 * a distinction, and the guided boards the learner marks by taps. Every mark's answer and every word for a wrong mark
 * comes from the model in tables.ts (rowsFor, holds, reason), never from a hand-written table.
 *
 * Distinctions (docs/CONTENT_GUIDE.md, “Distinctions”):
 *  - count-vs-cases (Lesson 1): the right number of rows is not every case; a row can repeat and a case go missing.
 *  - if-false-vs-broken (Lesson 3): the IF part being false is not the sentence being broken; it is True there.
 *  - some-vs-every (Lesson 4, reminded in Lesson 5): agreeing in some rows is not meaning the same; true in most rows is
 *    not always true.
 */
import { YES_NO } from '../drill';
import type { BoardWords, ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillRow, DrillStep, IdeaCard, Misconception, Scene } from '../types';
import {
  A,
  ABC,
  AND,
  B,
  IF,
  KIND_CHOICES,
  NOT,
  OR,
  PQ,
  TF_CHOICES,
  TOPICS,
  cap,
  quote,
  holds,
  kindOf,
  reason,
  rowShort,
  rowsFor,
  rowsWord,
  sameRow,
  say,
  tableScene,
  tf,
  type Kind,
  type Row,
  type Sen,
  keyLines,
  stepsOf,
  type TableMade,
  type TableScene,
  type Topic,
} from './tables';

const topicById = (id: string): Topic => TOPICS.find((t) => t.id === id)!;
const tfId = (v: boolean) => (v ? 'true' : 'false');
const TF = () => TF_CHOICES.map((o) => ({ ...o }));

/** The labels every table board uses, so no board speaks of signs and test worlds. */
export const TABLE_WORDS: BoardWords = {
  says: 'Sentence',
  world: 'Row',
  so: 'So',
  ask: 'Is the sentence true in this row?',
  fit: 'True in this row.',
  unfit: 'False in this row.',
  worldTag: 'Row',
  truth: 'true',
  untruth: 'false',
  closing: 'Back to the table: look at one row at a time.',
};

/** What a sentence needs, said before the learner marks it (a compare line, with no verdict). */
export function needs(s: Sen, names: readonly string[]): string {
  const w = (x: Sen) => quote(x, names);
  switch (s.op) {
    case 'atom':
      return `${w(s)} is as the row says.`;
    case 'not':
      return `${w(s)} is the opposite of ${quote(s.a, names, '.')}`;
    case 'and':
      return `${w(s)} needs ${w(s.a)} and ${w(s.b)} both true.`;
    case 'or':
      return `${w(s)} needs ${w(s.a)} or ${w(s.b)} true, or both.`;
    case 'if':
      return `${w(s)} is false only if ${w(s.a)} is true and ${w(s.b)} is false.`;
  }
}

/** One table row on a board: a mark per sentence, True or False, each wrong option with its reason. `given`: shown marked. */
function sentenceMarks(rowId: string, r: Row, cols: readonly Sen[], names: readonly string[], o: { given?: (j: number) => boolean; compare?: boolean } = {}): DrillMark[] {
  return cols.map((s, j): DrillMark => {
    const v = holds(s, r);
    return {
      id: `${rowId}-c${j}`,
      label: say(s, names),
      options: TF(),
      answer: tfId(v),
      ...(o.given?.(j) ? { given: true } : {}),
      why: { [tfId(!v)]: reason(s, r, names) },
      ...(o.compare ? { compare: { says: needs(s, names), world: `${rowShort(r, names)}.` } } : {}),
    };
  });
}

const rowLabel = (r: Row, k: number, names: readonly string[]) => `Row ${k + 1}: ${rowShort(r, names)}`;

// ---------- Lesson 1: every case in rows ----------

export const L1_TOPIC = topicById('rain');
export const L1_TWIN = topicById('bell');
/** Where Lesson 1's cards sit: one sentence, two, three, the contrast. Boards open after them. */
export const L1_CARDS = { one: 1, two: 2, three: 3, contrast: 4 } as const;

export const oneScene = (): TableScene => tableScene({ names: ABC, n: 1, topic: L1_TOPIC, caption: 'One sentence: two rows.' });
export const twoScene = (): TableScene => tableScene({ names: ABC, n: 2, topic: L1_TOPIC, caption: 'Two sentences: four rows.' });
export const threeScene = (): TableScene =>
  tableScene({ names: ABC, n: 3, topic: L1_TOPIC, caption: 'Three sentences: eight rows. A is True in the top half and False in the bottom half.' });

/** Why a part has its value in the usual order: the top half and bottom half, or turns of a set size. */
function patternWhy(i: number, k: number, n: number, names: readonly string[]): string {
  const size = 2 ** (n - 1 - i);
  const v = rowsFor(n)[k][i];
  const half = rowsFor(n).length / 2;
  if (i === 0) return `${names[0]} is True in the top half, rows 1 ${half === 2 ? 'and' : 'to'} ${half}, and False in the bottom half. Row ${k + 1} is in the ${v ? 'top' : 'bottom'} half.`;
  if (size === 1) return `${names[i]} takes turns: True, then False, then True again. In row ${k + 1}, it is ${TFw(v)}.`;
  return `${names[i]} takes turns in groups of ${size}: ${size} rows True, then ${size} rows False. In row ${k + 1}, it is ${TFw(v)}.`;
}
const TFw = (v: boolean) => (v ? 'True' : 'False');

const COPIED_ROW =
  'You may be treating a new row as a copy of the row above. They are two different things: each row is a new case. Two rows that match show one case twice, and another case goes missing.';
const ROW_QUESTION: ConfusedQuestion = {
  q: 'Can two rows of a truth table show the same case?',
  options: [{ label: 'No. Each row is a different case', right: true }, { label: 'Yes. Rows can repeat' }, { label: 'Not sure' }],
  teach: 'No. Each row is one case, and each case gets one row. If two rows match, one case is there twice and another is missing.',
};

/** Do, board 1: the four rows for two new sentences. Row 1 is shown; the learner fills rows 2 to 4 by the pattern. */
export function fourRowsBoard(): DrillStep {
  const names = ABC;
  const rows = rowsFor(2);
  const drill: DrillRow[] = rows.map((r, k) => ({
    id: `r${k + 1}`,
    label: `Row ${k + 1}`,
    marks: r.map((v, i): DrillMark => ({
      id: `r${k + 1}-${names[i]}`,
      label: names[i],
      options: TF(),
      answer: tfId(v),
      ...(k === 0 ? { given: true } : {}),
      why: { [tfId(!v)]: patternWhy(i, k, 2, names) },
    })),
    ...(k === 0 ? { note: 'Both true: the first case.' } : {}),
  }));
  // A row marked just like the row above it.
  const misconceptions: Misconception[] = rows.slice(1).map((_, j) => ({
    id: 'copied-row',
    when: 'picks' as const,
    row: `r${j + 2}`,
    picks: Object.fromEntries(rows[j].map((v, i) => [`r${j + 2}-${names[i]}`, tfId(v)])),
    text: COPIED_ROW,
  }));
  return {
    id: 's9.l1-do1',
    title: 'Build the four rows',
    body: ['Here are two new sentences. Row 1 is filled in: both true.', 'Fill rows 2 to 4. A is True in the top half and False in the bottom half. B takes turns: True, then False.'],
    scene: tableScene({ names, n: 2, topic: L1_TWIN, blankPart: (k) => k > 0, caption: 'Row 1 is filled in. Fill rows 2 to 4.' }),
    twin: 'New sentences, and rows 2 to 4 are blank.',
    afterCard: L1_CARDS.two,
    rows: drill,
    misconceptions,
    confused: [ROW_QUESTION],
    words: { ...TABLE_WORDS, closing: 'Back to the board: each row is a new case. Follow the pattern.' },
    done: 'Right. Four rows, four different cases: both true, only A true, only B true, and both false.',
  };
}
/** Do, board 2: the eight rows. Rows 1 to 4 are on the card; the learner fills B and C in rows 5 to 8. */
export function eightRowsBoard(): DrillStep {
  const names = ABC;
  const rows = rowsFor(3);
  const drill: DrillRow[] = rows.slice(4).map((r, j) => {
    const k = j + 4;
    return {
      id: `r${k + 1}`,
      label: `Row ${k + 1}`,
      marks: r.map((v, i): DrillMark => ({
        id: `r${k + 1}-${names[i]}`,
        label: names[i],
        options: TF(),
        answer: tfId(v),
        ...(i === 0 ? { given: true } : {}),
        why: { [tfId(!v)]: i === 0 ? patternWhy(0, k, 3, names) : `The bottom half repeats ${names[1]} and ${names[2]} from the top half. Row ${k + 1} matches row ${k - 3}: ${names[i]} is ${TFw(v)}.` },
      })),
    };
  });
  return {
    id: 's9.l1-do2',
    title: 'Build the bottom half',
    body: ['Rows 1 to 4 are filled in. In rows 5 to 8, A is False.', 'Fill B and C in rows 5 to 8. The bottom half repeats B and C from the top half.'],
    scene: tableScene({ names, n: 3, topic: L1_TOPIC, blankPart: (k, i) => k >= 4 && i > 0, caption: 'Rows 5 to 8: fill B and C.' }),
    twin: 'Rows 5 to 8 have B and C blank.',
    afterCard: L1_CARDS.three,
    rows: drill,
    confused: [ROW_QUESTION],
    words: { ...TABLE_WORDS, closing: 'Back to the board: the bottom half repeats the top half, with A false.' },
    done: 'Right. The bottom half is the top half again, with A false. That makes all 8 cases, each one once.',
  };
}

export const COUNT_VS_CASES: Distinction = {
  id: 'count-vs-cases',
  a: 'The table has the right number of rows.',
  b: 'Every case is in the table, each one once.',
};

/** The two tables of the contrast: every case once, and the same count with a case twice. */
export const CONTRAST_TABLES = (() => {
  const all = rowsFor(2);
  const broken = [all[0], all[1], all[1], all[3]];
  return { complete: all, broken, twice: all[1], missing: all[2] };
})();
const rowsLine = (rows: readonly Row[]) => rows.map((r) => `${cap(rowShort(r, ABC))}.`).join(' ');

/** The contrast: two tables of four rows. One has every case; one has a case twice and a case missing. */
export function countContrast(): Extract<Scene, { kind: 'contrast' }> {
  const { complete, broken, twice, missing } = CONTRAST_TABLES;
  const at = broken.flatMap((r, k) => (sameRow(r, twice) ? [k + 1] : []));
  const panel = (rows: readonly Row[], ok: boolean, because: string): ContrastPanel => ({ world: rowsLine(rows), who: 'This table', says: 'Every case is here.', truth: ok, because });
  return {
    kind: 'contrast',
    pairs: [
      panel(complete, true, 'Four rows, each a different case. None is missing.'),
      panel(broken, false, `Row ${at[1]} is the same case as row ${at[0]}. The case ${rowShort(missing, ABC)} is missing.`),
    ],
    ask: { q: 'Both tables have four rows. Is that enough?', a: 'No. Each row must be a different case. Look for a row that repeats.' },
    words: { worldTag: 'Rows', saysWord: 'says:', truth: 'Every case', untruth: 'Not every case' },
  };
}

export function countContrastCard(): IdeaCard {
  return {
    title: 'Four rows is not enough',
    distinction: COUNT_VS_CASES.id,
    body: [
      'A table can have the right number of rows and still miss a case.',
      'That happens when a row repeats. Then one case is there twice, and another case has no row.',
      'So count the rows, and then check that no row repeats.',
    ],
    scene: countContrast(),
  };
}

const COUNT_AS_CASES =
  'You may be treating “the right number of rows” and “every case” as the same thing. They are two different things. A table can have four rows and still repeat a case. Check that each row is a new case.';
const COUNT_QUESTION: ConfusedQuestion = {
  q: 'A table for A and B has four rows. Must every case be in it?',
  options: [{ label: 'No. A row could repeat, and a case could be missing', right: true }, { label: 'Yes. Four rows means four cases' }, { label: 'Not sure' }],
  teach: 'No. Four rows is the right count, but a row can repeat. Then one case is there twice and another is missing. Check each row against the rows above it.',
};

/** Do, board 3 (right after the contrast): find the repeat and the missing case, then judge a table in a new order. */
export function countBoard(): DrillStep {
  const all = rowsFor(2);
  // A false, B true twice; A false, B false missing. The rows are not in the usual order.
  const table = [all[2], all[0], all[2], all[1]];
  const missing = all.find((r) => !table.some((x) => sameRow(x, r)))!;
  const firstAt = (r: Row) => table.findIndex((x) => sameRow(x, r));
  // The repeat, worked out from the table: the row that shows a case an earlier row already shows.
  const rep = table.findIndex((r, k) => firstAt(r) < k);
  const repeats = `Row ${rep + 1} repeats row ${firstAt(table[rep]) + 1}`;
  const rows: DrillRow[] = table.map((r, k) => {
    const repeat = firstAt(r) < k;
    return {
      id: `t${k + 1}`,
      label: rowLabel(r, k, ABC),
      marks: [{
        id: `t${k + 1}-new`,
        label: 'A new case, or a repeat?',
        options: [{ id: 'new', label: 'New case' }, { id: 'repeat', label: 'Repeat' }],
        answer: repeat ? 'repeat' : 'new',
        why: repeat
          ? ({ new: `Row ${firstAt(r) + 1} shows ${rowShort(r, ABC)} too. So row ${k + 1} is a repeat.` } as Record<string, string>)
          : { repeat: `No row above shows ${rowShort(r, ABC)}. So row ${k + 1} is a new case.` },
      }],
    };
  });
  const cases = all.map((r) => ({ id: `m-${r.map((v) => (v ? 'T' : 'F')).join('')}`, label: rowShort(r, ABC), r }));
  const missWhy: Record<string, string> = {};
  for (const c of cases) if (!sameRow(c.r, missing)) missWhy[c.id] = `${cap(c.label)} is in row ${firstAt(c.r) + 1}. Find the case no row shows.`;
  missWhy.none = `${repeats}. So four rows hold just three cases, and one case is missing.`;
  rows.push({
    id: 'missing',
    label: 'Now the whole table',
    marks: [{ id: 'missing', label: 'Which case is missing?', options: [...cases.map(({ id, label }) => ({ id, label: cap(label) })), { id: 'none', label: 'None' }], answer: `m-${missing.map((v) => (v ? 'T' : 'F')).join('')}`, why: missWhy }],
  });
  const second = [all[3], all[1], all[2], all[0]];
  rows.push({
    id: 'second',
    label: `A second table: ${rowsLine(second)}`,
    marks: [{ id: 'second', label: 'Does it list every case once?', options: YES_NO.map((o) => ({ ...o })), answer: 'yes', why: { no: 'Each of its four rows is a different case. The order is new, but every case is there once.' } }],
  });
  return {
    id: 's9.l1-do3',
    title: 'Find the repeat',
    body: ['Here is a table with four rows. Mark each row: a new case, or a repeat of a row above it?', 'Then name the missing case. Last, look at a second table.'],
    scene: tableScene({ names: ABC, n: 2, rows: table, caption: 'Four rows, in no special order.' }),
    twin: 'A new table of four rows, in no special order.',
    afterCard: L1_CARDS.contrast,
    distinction: COUNT_VS_CASES.id,
    scaffold: 'full',
    rows,
    misconceptions: [
      { id: 'count-as-cases', when: 'picks', picks: { 't3-new': 'new' }, text: COUNT_AS_CASES },
      { id: 'count-as-cases', when: 'picks', picks: { missing: 'none' }, text: COUNT_AS_CASES },
    ],
    confused: [COUNT_QUESTION, ROW_QUESTION],
    words: { ...TABLE_WORDS, closing: 'Those two ideas are apart now. Back to the board: check each row against the rows above it.' },
    done: `Right. ${repeats}, so ${rowShort(missing, ABC)} was missing. The second table has every case, in a new order.`,
  };
}

// ---------- Lesson 2: tables for NOT, AND, OR ----------

export const L2_CARDS = { not: 0, and: 1, or: 2, helper: 3 } as const;
export const L2_TOPIC = topicById('soup');

export const notScene = (): TableScene => tableScene({ names: ABC, n: 1, cols: [NOT(A)], caption: 'NOT flips each row.' });
export const andScene = (): TableScene => tableScene({ names: ABC, n: 2, cols: [AND(A, B)], caption: 'True in one row only: both parts true.' });
export const orScene = (): TableScene => tableScene({ names: ABC, n: 2, cols: [OR(A, B)], caption: 'False in one row only: both parts false.' });
export const HELPER_SEN = AND(A, NOT(B));
export const helperScene = (): TableScene =>
  tableScene({ names: ABC, n: 2, cols: [NOT(B), HELPER_SEN], topic: L2_TOPIC, marked: [1], markLabel: 'True here', caption: 'Fill NOT B first. Then A AND NOT B.' });

const OR_ONE =
  'You may be treating OR as “one but not both.” They are two different things. In logic, OR includes both: when A and B are both true, A OR B is true.';
const AND_AS_OR = 'You may be treating AND like OR. AND needs both parts true. If one part is false, the AND sentence is false.';
const OR_QUESTION: ConfusedQuestion = {
  q: 'A is true and B is true. Is A OR B true?',
  options: [{ label: 'Yes. OR includes both', right: true }, { label: 'No. OR means just one' }, { label: 'Not sure' }],
  teach: 'Yes. OR needs one part or both parts true. When both are true, A OR B is true. Only when both are false is it false.',
};
const AND_QUESTION: ConfusedQuestion = {
  q: 'A is true and B is false. Is A AND B true?',
  options: [{ label: 'No. AND needs both parts', right: true }, { label: 'Yes. One part is enough' }, { label: 'Not sure' }],
  teach: 'No. AND needs both parts true. One false part is enough to make the AND sentence false.',
};

/** A board of sentence columns over every row. `given`: sentence columns shown already marked. */
function columnsBoard(o: {
  id: string;
  title: string;
  body: string[];
  names: readonly string[];
  n: number;
  cols: readonly Sen[];
  given?: (j: number) => boolean;
  scene: Scene;
  twin?: string;
  afterCard: number;
  done: string;
  scaffold?: 'full' | 'light';
  misconceptions?: Misconception[];
  confused?: ConfusedQuestion[];
  distinction?: string;
  words?: BoardWords;
  extra?: DrillRow[];
}): DrillStep {
  const rows = rowsFor(o.n);
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    scene: o.scene,
    ...(o.twin ? { twin: o.twin } : {}),
    afterCard: o.afterCard,
    rows: [
      ...rows.map((r, k) => ({ id: `r${k + 1}`, label: rowLabel(r, k, o.names), marks: sentenceMarks(`r${k + 1}`, r, o.cols, o.names, { given: o.given, compare: true }) })),
      ...(o.extra ?? []),
    ],
    ...(o.scaffold ? { scaffold: o.scaffold } : {}),
    ...(o.misconceptions ? { misconceptions: o.misconceptions } : {}),
    ...(o.confused ? { confused: o.confused } : {}),
    ...(o.distinction ? { distinction: o.distinction } : {}),
    words: o.words ?? TABLE_WORDS,
    done: o.done,
  };
}

/** Do, board 1 (after the OR card): fill A AND B and A OR B in every row. */
export function andOrBoard(): DrillStep {
  const cols = [AND(A, B), OR(A, B)];
  const rows = rowsFor(2);
  return columnsBoard({
    id: 's9.l2-do1',
    title: 'Fill AND and OR',
    body: ['Both sentence columns are blank. Fill them one row at a time.', 'AND needs both parts true. OR needs one part or both.'],
    names: ABC,
    n: 2,
    cols,
    scene: tableScene({ names: ABC, n: 2, cols, blank: () => true, caption: 'Fill A AND B, then A OR B, in each row.' }),
    twin: 'Both columns, A AND B and A OR B, with every box blank.',
    afterCard: L2_CARDS.or,
    scaffold: 'full',
    misconceptions: [
      { id: 'or-one', when: 'picks', picks: { 'r1-c1': 'false' }, text: OR_ONE },
      ...rows.flatMap((r, k) => (r[0] !== r[1] ? [{ id: 'and-as-or', when: 'picks' as const, picks: { [`r${k + 1}-c0`]: 'true' }, text: AND_AS_OR }] : [])),
    ],
    confused: [OR_QUESTION, AND_QUESTION],
    done: 'Right. A AND B is True only in row 1. A OR B is False only in row 4.',
  });
}

/** Do, board 2 (after the worked helper column): NOT A first, then NOT A OR B. */
export function helperBoard(): DrillStep {
  const cols = [NOT(A), OR(NOT(A), B)];
  const c = rowsFor(2).map((r) => holds(cols[1], r));
  const no = c.flatMap((v, k) => (v ? [] : [k]));
  return columnsBoard({
    id: 's9.l2-do2',
    title: 'Fill a helper column first',
    body: ['Here is a new sentence: NOT A OR B. Its helper column, NOT A, comes first.', 'Fill NOT A in each row. Then use it to fill NOT A OR B.'],
    names: ABC,
    n: 2,
    cols,
    scene: tableScene({ names: ABC, n: 2, cols, blank: () => true, caption: 'Fill NOT A first. Then NOT A OR B.' }),
    twin: 'A new sentence, NOT A OR B, with its helper column NOT A. Every box is blank.',
    afterCard: L2_CARDS.helper,
    misconceptions: [{ id: 'or-one', when: 'picks', picks: { 'r3-c1': 'false' }, text: OR_ONE }],
    confused: [OR_QUESTION],
    done: `Right. NOT A OR B is False only in ${rowsWord(no)}, where NOT A is false and B is false.`,
  });
}

// ---------- Lesson 3: the IF table ----------

export const L3_CARDS = { table: 0, one: 1, contrast: 2, example: 3 } as const;
export const IF_SEN = IF(A, B);
export const L3_TOPIC = topicById('rain');
export const L3_TWIN = topicById('bell');

export const ifScene = (): TableScene => tableScene({ names: PQ, n: 2, cols: [IF_SEN], caption: 'P is the IF part. Q is the THEN part.' });
export const ifBreakScene = (): TableScene => tableScene({ names: PQ, n: 2, cols: [IF_SEN], marked: [1], markLabel: 'Breaks it', caption: 'False in row 2 only.' });
export const ifStoryScene = (): TableScene =>
  tableScene({ names: PQ, n: 2, cols: [IF_SEN], topic: L3_TOPIC, marked: [1], markLabel: 'Breaks it', caption: `The rule: IF ${L3_TOPIC.parts[0].yes}, THEN ${L3_TOPIC.parts[1].yes}.` });

export const IF_FALSE_VS_BROKEN: Distinction = {
  id: 'if-false-vs-broken',
  a: 'The IF part is false: the sentence asks for nothing.',
  b: 'The IF part is true and the THEN part is false: the sentence is broken.',
};

/** The contrast: Q is false in both rows; only the row with P true breaks the sentence. */
export function ifContrast(): Extract<Scene, { kind: 'contrast' }> {
  const rows = rowsFor(2);
  const ff = rows[3], tff = rows[1];
  const panel = (r: Row, because: string): ContrastPanel => ({ world: `${cap(rowShort(r, PQ))}.`, who: 'The sentence', says: say(IF_SEN, PQ), truth: holds(IF_SEN, r), because });
  return {
    kind: 'contrast',
    pairs: [
      panel(ff, 'The IF part did not happen. The sentence asks for nothing, so nothing breaks it.'),
      panel(tff, 'The IF part happened, but the THEN part did not. That breaks it.'),
    ],
    ask: { q: 'Q is false in both rows. Why is only one False?', a: 'Only the second row has the IF part true. When P is false, nothing breaks the sentence, so it is True.' },
    words: { worldTag: 'Row', saysWord: 'is', truth: 'True', untruth: 'False' },
  };
}

export function ifContrastCard(): IdeaCard {
  return {
    title: 'When the IF part is false',
    distinction: IF_FALSE_VS_BROKEN.id,
    body: [
      'In rows 3 and 4, P is false. The IF part did not happen.',
      'Then the sentence asks for nothing, so nothing can break it. It counts as True.',
      'You saw this in If… then: a kid who got no dessert can’t break the dessert rule.',
    ],
    scene: ifContrast(),
  };
}

const IF_FALSE_AS_BROKEN =
  'You may be treating “the IF part did not happen” and “the sentence is broken” as the same thing. They are two different things. When P is false, the sentence asks for nothing, so it is True. Only row 2 breaks it.';
const IF_QUESTION: ConfusedQuestion = {
  q: 'P is false. Can that row break IF P, THEN Q?',
  options: [{ label: 'No. It asks for nothing when P is false', right: true }, { label: 'Yes, if Q is false too' }, { label: 'Not sure' }],
  teach: 'No. IF P, THEN Q only talks about rows where P is true. When P is false, nothing can break it, so it is True, whatever Q is.',
};

/** Do, board 1 (right after the contrast): did the IF part happen? Then the sentence, in every row. */
export function ifFalseBoard(): DrillStep {
  const rows = rowsFor(2);
  const drill: DrillRow[] = rows.map((r, k) => {
    const id = `r${k + 1}`;
    const p = r[0];
    const v = holds(IF_SEN, r);
    return {
      id,
      label: rowLabel(r, k, PQ),
      marks: [
        {
          id: `${id}-if`,
          label: 'Did the IF part happen?',
          options: YES_NO.map((o) => ({ ...o })),
          answer: p ? 'yes' : 'no',
          why: p ? ({ no: 'P is true in this row, so the IF part happened.' } as Record<string, string>) : { yes: 'P is false in this row, so the IF part did not happen.' },
        },
        {
          id: `${id}-val`,
          label: say(IF_SEN, PQ),
          options: TF(),
          answer: tfId(v),
          why: { [tfId(!v)]: reason(IF_SEN, r, PQ) },
          compare: { says: needs(IF_SEN, PQ), world: `${rowShort(r, PQ)}.` },
        },
      ],
    };
  });
  return {
    id: 's9.l3-do1',
    title: 'Asks for nothing, or broken?',
    body: ['For each row, first ask: did the IF part happen? That is, is P true?', 'Then mark IF P, THEN Q as True or False in that row.'],
    scene: ifContrast(),
    afterCard: L3_CARDS.contrast,
    distinction: IF_FALSE_VS_BROKEN.id,
    scaffold: 'full',
    steps: ['Is P true? If not, the sentence is True.', 'If P is true, look at Q.', 'Q true: True. Q false: False.'],
    rows: drill,
    misconceptions: rows.flatMap((r, k) => (r[0] ? [] : [{ id: 'if-false-as-broken', when: 'picks' as const, picks: { [`r${k + 1}-val`]: 'false' }, text: IF_FALSE_AS_BROKEN }])),
    confused: [IF_QUESTION],
    words: { ...TABLE_WORDS, closing: 'Those two ideas are apart now. Back to the board: first ask if the IF part happened.' },
    done: 'Right. When the IF part did not happen, the sentence is True. Only row 2, P true and Q false, breaks it.',
  };
}

/** Do, board 2 (after the worked rule): a new rule, its IF column blank, then the row that breaks it. */
export function ifStoryBoard(): DrillStep {
  const rows = rowsFor(2);
  const t = L3_TWIN;
  const k = rows.findIndex((r) => !holds(IF_SEN, r));
  const breakWhy: Record<string, string> = {};
  rows.forEach((r, j) => {
    if (j !== k) breakWhy[`row${j + 1}`] = reason(IF_SEN, r, PQ);
  });
  return columnsBoard({
    id: 's9.l3-do2',
    title: 'Fill the IF column',
    body: [`A new rule: IF ${t.parts[0].yes}, THEN ${t.parts[1].yes}. P is the IF part. Q is the THEN part.`, 'Fill the IF column in each row. Then pick the row that breaks the rule.'],
    names: PQ,
    n: 2,
    cols: [IF_SEN],
    scene: tableScene({ names: PQ, n: 2, cols: [IF_SEN], topic: t, blank: () => true, caption: `The rule: IF ${t.parts[0].yes}, THEN ${t.parts[1].yes}.` }),
    twin: 'A new rule, and the IF column is blank.',
    afterCard: L3_CARDS.example,
    misconceptions: rows.flatMap((r, j) => (r[0] ? [] : [{ id: 'if-false-as-broken', when: 'picks' as const, picks: { [`r${j + 1}-c0`]: 'false' }, text: IF_FALSE_AS_BROKEN }])),
    confused: [IF_QUESTION],
    extra: [{
      id: 'break',
      label: 'The whole rule',
      marks: [{ id: 'break', label: 'Which row breaks the rule?', options: rows.map((_, j) => ({ id: `row${j + 1}`, label: `Row ${j + 1}` })), answer: `row${k + 1}`, why: breakWhy }],
    }],
    done: `Right. Only row ${k + 1} breaks it: ${t.parts[0].yes}, but ${t.parts[1].no}.`,
  });
}

// ---------- Lesson 4: same meaning ----------

export const L4_CARDS = { same: 0, worked: 1, contrast: 2, flip: 3 } as const;
export const DEMORGAN: [Sen, Sen] = [NOT(AND(A, B)), OR(NOT(A), NOT(B))];
export const NOT_EACH_SEN = AND(NOT(A), NOT(B));
export const CONTRA: [Sen, Sen] = [IF(A, B), IF(NOT(B), NOT(A))];
export const FLIP_ONLY = IF(B, A);

export const deMorganScene = (): TableScene => tableScene({ names: ABC, n: 2, cols: DEMORGAN, caption: 'The two columns match in every row.' });
export const contraScene = (): TableScene => tableScene({ names: ABC, n: 2, cols: CONTRA, caption: 'Flip and NOT: the columns match in every row.' });

export const SOME_VS_EVERY: Distinction = {
  id: 'some-vs-every',
  a: 'Two sentences agree in some rows.',
  b: 'Two sentences agree in every row: they mean the same.',
};

/** The contrast: NOT (A AND B) and NOT A AND NOT B agree in row 4 and differ in row 2. */
export function someContrast(): Extract<Scene, { kind: 'contrast' }> {
  const rows = rowsFor(2);
  const [s] = DEMORGAN;
  const u = NOT_EACH_SEN;
  const agree = rows.findIndex((r, k) => k > 0 && holds(s, r) === holds(u, r));
  const differ = rows.findIndex((r) => holds(s, r) !== holds(u, r));
  const panel = (k: number): ContrastPanel => {
    const r = rows[k];
    const same = holds(s, r) === holds(u, r);
    return {
      world: `Row ${k + 1}: ${rowShort(r, ABC)}.`,
      who: 'The question',
      says: 'Do the two sentences agree here?',
      truth: same,
      because: `${quote(s, ABC)} is ${tf(holds(s, r))}. ${quote(u, ABC)} is ${tf(holds(u, r))}. ${same ? 'They agree here.' : 'They differ here.'}`,
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(agree), panel(differ)],
    ask: { q: 'Do they mean the same?', a: 'No. They agree in some rows, but not in every row. One row that differs is enough to say no.' },
    words: { worldTag: 'Row', saysWord: 'is:', truth: 'Agree', untruth: 'Differ' },
  };
}

export function someContrastCard(): IdeaCard {
  const rows = rowsFor(2);
  const d = rows.flatMap((r, k) => (holds(DEMORGAN[0], r) !== holds(NOT_EACH_SEN, r) ? [k] : []));
  const a = rows.flatMap((r, k) => (holds(DEMORGAN[0], r) === holds(NOT_EACH_SEN, r) ? [k] : []));
  return {
    title: 'Some rows are not enough',
    distinction: SOME_VS_EVERY.id,
    body: [
      `NOT A AND NOT B looks close to NOT (A AND B). But it is true only when A and B are both false.`,
      `The two agree in ${rowsWord(a)}. They differ in ${rowsWord(d)}.`,
      'Agreeing in some rows is not enough. One row that differs means they do not mean the same.',
    ],
    scene: someContrast(),
  };
}

const SOME_AS_EVERY =
  'You may be treating “agree in some rows” and “agree in every row” as the same thing. They are two different things. Two sentences mean the same only when they agree in every row. One row that differs is enough to say no.';
const SAME_QUESTION: ConfusedQuestion = {
  q: 'Two sentences agree in three rows and differ in one. Do they mean the same?',
  options: [{ label: 'No. They must agree in every row', right: true }, { label: 'Yes. Most rows agree' }, { label: 'Not sure' }],
  teach: 'No. Same meaning means the same value in every row. One row where one is true and the other is false is enough to say they differ.',
};
const AGREE = [{ id: 'yes', label: 'Agree' }, { id: 'no', label: 'Differ' }];

/** Do, board 1 (right after the contrast): fill NOT A AND NOT B, compare it with NOT (A AND B) row by row, then decide. */
export function someBoard(): DrillStep {
  const rows = rowsFor(2);
  const [s] = DEMORGAN;
  const u = NOT_EACH_SEN;
  const drill: DrillRow[] = rows.map((r, k) => {
    const id = `r${k + 1}`;
    const same = holds(s, r) === holds(u, r);
    const [given, mine] = sentenceMarks(id, r, [s, u], ABC, { given: (j) => j === 0, compare: true });
    return {
      id,
      label: rowLabel(r, k, ABC),
      marks: [
        given,
        mine,
        {
          id: `${id}-agree`,
          label: 'Agree in this row?',
          options: AGREE.map((o) => ({ ...o })),
          answer: same ? 'yes' : 'no',
          why: { [same ? 'no' : 'yes']: `${quote(s, ABC)} is ${tf(holds(s, r))} and ${quote(u, ABC)} is ${tf(holds(u, r))}. So they ${same ? 'agree' : 'differ'} here.` },
        },
      ],
    };
  });
  const differ = rows.flatMap((r, k) => (holds(s, r) !== holds(u, r) ? [k] : []));
  drill.push({
    id: 'verdict',
    label: 'All four rows together',
    marks: [{ id: 'verdict', label: 'Do they mean the same?', options: YES_NO.map((o) => ({ ...o })), answer: 'no', why: { yes: `They differ in ${rowsWord(differ)}. Same meaning needs every row to agree.` } }],
  });
  return {
    id: 's9.l4-do1',
    title: 'Agree in every row?',
    body: [`${quote(s, ABC)} is filled in. Fill ${quote(u, ABC)} in each row.`, 'Then mark if the two agree in that row. Last, decide: do they mean the same?'],
    scene: someContrast(),
    afterCard: L4_CARDS.contrast,
    distinction: SOME_VS_EVERY.id,
    scaffold: 'full',
    rows: drill,
    misconceptions: [{ id: 'some-as-every', when: 'picks', picks: { verdict: 'yes' }, text: SOME_AS_EVERY }],
    confused: [SAME_QUESTION],
    words: { ...TABLE_WORDS, closing: 'Those two ideas are apart now. Back to the board: compare the two columns in every row.' },
    done: `Right. They agree in some rows, but they differ in ${rowsWord(differ)}. So they do not mean the same.`,
  };
}

/** Do, board 2 (after flip and NOT): flip only, IF B, THEN A, against IF A, THEN B. */
export function flipBoard(): DrillStep {
  const rows = rowsFor(2);
  const [rule] = CONTRA;
  const cols = [rule, FLIP_ONLY];
  const differ = rows.flatMap((r, k) => (holds(rule, r) !== holds(FLIP_ONLY, r) ? [k] : []));
  return columnsBoard({
    id: 's9.l4-do2',
    title: 'Test flip only',
    body: [`${quote(rule, ABC)} is filled in. Now flip it: ${quote(FLIP_ONLY, ABC, '.')}`, 'Fill its column. Then decide if it means the same as the first sentence.'],
    names: ABC,
    n: 2,
    cols,
    given: (j) => j === 0,
    scene: tableScene({ names: ABC, n: 2, cols, blank: (_k, j) => j === 1, caption: 'Fill the flipped sentence. Then compare.' }),
    twin: `The flip and NOT column is gone. In its place is flip only, ${quote(FLIP_ONLY, ABC, ',')} with its boxes blank.`,
    afterCard: L4_CARDS.flip,
    misconceptions: [{ id: 'some-as-every', when: 'picks', picks: { verdict: 'yes' }, text: SOME_AS_EVERY }],
    confused: [SAME_QUESTION],
    extra: [{
      id: 'verdict',
      label: 'All four rows together',
      marks: [{ id: 'verdict', label: `Same meaning as ${quote(rule, ABC)}?`, options: YES_NO.map((o) => ({ ...o })), answer: 'no', why: { yes: `They differ in ${rowsWord(differ)}. Flip only does not keep the meaning.` } }],
    }],
    done: `Right. Flip only differs in ${rowsWord(differ)}. Flip and NOT matched in every row, so only flip and NOT keeps the meaning.`,
  });
}

// ---------- Lesson 5: always true, never true ----------

export const L5_CARDS = { always: 0, never: 1, most: 2, worked: 3 } as const;
export const ALWAYS_SEN = OR(A, NOT(A));
export const NEVER_SEN = AND(A, NOT(A));
export const WORKED_ALWAYS = IF(AND(A, B), A);

export const alwaysScene = (): TableScene => tableScene({ names: ABC, n: 1, cols: [NOT(A), ALWAYS_SEN], caption: 'True in every row: always true.' });
export const neverScene = (): TableScene => tableScene({ names: ABC, n: 1, cols: [NOT(A), NEVER_SEN], caption: 'False in every row: never true.' });
export const mostScene = (): TableScene => tableScene({ names: ABC, n: 2, cols: [OR(A, B)], marked: [3], markLabel: 'The False row', caption: 'True in three rows of four: sometimes true.' });
export const workedAlwaysScene = (): TableScene => tableScene({ names: ABC, n: 2, cols: [AND(A, B), WORKED_ALWAYS], caption: 'The last column is True in every row: always true.' });

const MOST_AS_ALWAYS =
  'You may be treating “true in most rows” and “always true” as the same thing. They are two different things. Always true means True in every row. One False row is enough to say no.';
const KIND_QUESTION: ConfusedQuestion = {
  q: 'A sentence is True in three rows and False in one. Is it always true?',
  options: [{ label: 'No. It is sometimes true', right: true }, { label: 'Yes. Most rows is enough' }, { label: 'Not sure' }],
  teach: 'No. Always true means True in every row. One False row makes it sometimes true.',
};
const KIND_WORD: Record<Kind, string> = { always: 'always true', sometimes: 'sometimes true', never: 'never true' };

/** A row of verdicts: always, sometimes or never true, one mark per sentence. */
function kindRow(cols: readonly Sen[], names: readonly string[], n: number): DrillRow {
  return {
    id: 'kind',
    label: 'Now look at every row',
    marks: cols.map((s, j): DrillMark => {
      const kind = kindOf(s, n);
      const why: Record<string, string> = {};
      for (const o of KIND_CHOICES) if (o.id !== kind) why[o.id] = `${quote(s, names)} is ${kind === 'always' ? 'True in every row' : kind === 'never' ? 'False in every row' : 'True in some rows and False in others'}. So it is ${KIND_WORD[kind]}.`;
      return { id: `kind-${j}`, label: `${say(s, names)} is…`, options: KIND_CHOICES.map((o) => ({ ...o })), answer: kind, why };
    }),
  };
}

/** Do, board 1 (after the never card): the same two sentences with B, every box blank, then their kinds. */
export function alwaysBoard(): DrillStep {
  const names = ['B'];
  const cols = [NOT(A), OR(A, NOT(A)), AND(A, NOT(A))];
  return columnsBoard({
    id: 's9.l5-do1',
    title: 'Always or never?',
    body: ['Here are the same two sentences, made with B. Fill each box.', 'Then decide: is each sentence always true, sometimes true, or never true?'],
    names,
    n: 1,
    cols,
    scene: tableScene({ names, n: 1, cols, blank: () => true, caption: 'Fill NOT B first. Then the two sentences.' }),
    twin: 'The letter is B, and both sentences sit in one table. Every box is blank.',
    afterCard: L5_CARDS.never,
    confused: [KIND_QUESTION],
    extra: [kindRow(cols.slice(1), names, 1)],
    done: `Right. ${quote(cols[1], names)} is True in both rows: always true. ${quote(cols[2], names)} is False in both: never true.`,
  });
}

/** Do, board 2 (after the worked example): A OR B (true in most rows) and IF B, THEN A OR B (always true). */
export function mostBoard(): DrillStep {
  const cols = [OR(A, B), IF(B, OR(A, B))];
  const step = columnsBoard({
    id: 's9.l5-do2',
    title: 'Most rows, or every row?',
    body: ['Fill both columns, row by row.', 'Then decide what kind each sentence is. Look at every row before you say always.'],
    names: ABC,
    n: 2,
    cols,
    scene: tableScene({ names: ABC, n: 2, cols, blank: () => true, caption: 'Fill both columns. Then check every row.' }),
    twin: `Two new sentences: ${quote(cols[0], ABC)} and ${quote(cols[1], ABC, '.')} Every box is blank.`,
    afterCard: L5_CARDS.worked,
    misconceptions: [{ id: 'most-as-always', when: 'picks', picks: { 'kind-0': 'always' }, text: MOST_AS_ALWAYS }],
    confused: [KIND_QUESTION],
    extra: [kindRow(cols, ABC, 2)],
    done: `Right. ${quote(cols[0], ABC)} is False in row 4, so it is only sometimes true. ${quote(cols[1], ABC)} is True in every row: always true.`,
  });
  return step;
}

// ---------- the thinking board on a quiz item ----------

/**
 * The thinking board on a table question (Item.scratch, “the table board”): every blank sentence column of the
 * question's table, with its small parts first, to mark True or False row by row. It is never checked and never
 * counts; it lets a learner fill the table by taps instead of in their head. The question's picture is hidden while
 * it is open, so each row says its case and a story's letters are listed in the instructions. None for a question
 * with no blank column.
 */
export function tableScratch(m: TableMade): DrillStep | undefined {
  const scene = m.item.scene;
  if (scene?.kind !== 'table' || !m.sens?.length || !m.names || !m.n) return undefined;
  const names = m.names;
  const blank = scene.heads.slice(scene.inputs).filter((_, j) => scene.cells.some((r) => r[scene.inputs + j] === null));
  const cols: Sen[] = [];
  for (const head of blank) {
    const s = m.sens.find((x) => say(x, names) === head);
    if (!s) continue;
    for (const x of stepsOf(s)) if (!cols.some((c) => say(c, names) === say(x, names))) cols.push(x);
  }
  if (!cols.length) return undefined;
  const key = m.topic ? keyLines(m.topic, names, m.n) : [];
  return {
    id: 's9-table-board',
    title: 'Fill the table',
    body: [
      ...(key.length ? [key.join(' ')] : []),
      cols.length > blank.length ? 'Fill the small parts first. Then fill each sentence, one row at a time.' : 'Fill each sentence, one row at a time.',
      'This board is only for thinking. Nothing on it is checked.',
    ],
    rows: rowsFor(m.n).map((r, k) => ({ id: `r${k + 1}`, label: rowLabel(r, k, names), marks: sentenceMarks(`r${k + 1}`, r, cols, names) })),
    words: { ...TABLE_WORDS, closing: 'Back to the question: look at one row at a time.' },
    done: '',
  };
}
