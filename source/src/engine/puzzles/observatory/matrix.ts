/**
 * Pattern Observatory, Ring 3 (Deep Sky): the Matrix Gate's model, its option validator and its items.
 *
 * A grid is built from stated rules, one per tile feature: a row rule (each row has its own value of one feature), a
 * column rule (each column has its own value of another), and what every tile shares (the rest). Shape grids use
 * the number of shapes (1–3), the shape (circle, square, triangle) and the color (red, blue, yellow); a timetable uses
 * a room per day (rows) and a time per subject (columns).
 *
 * The validator (`verdictOf`) classifies every option tile as breaking the row rule, the column rule, both, or neither,
 * and the feedback names exactly the rule the chosen tile breaks. Nothing here claims that each wrong tile breaks
 * exactly one rule: an option may break both, and the words say so. `fitsFromCells` is the second method: it fills
 * the gap with a tile and checks the drawn grid itself, row by row and column by column.
 */
import type { MatrixCell } from '../../scenes/common';
import type { MatrixScene } from '../../scenes/matrix';
import type { Choice, ChoiceFeedback, ChooseItem, ErrorTag, Phase, Rng, Teach, TeachCase, Thing } from '../../types';
import { L2, andList, cap, chooseOf, type ItemSpec } from './mirror';

// ---------- the model ----------

export interface Dim { id: string; noun: string; values: readonly string[] }
export const COUNT: Dim = { id: 'count', noun: 'number of shapes', values: ['1', '2', '3'] };
export const SHAPE: Dim = { id: 'shape', noun: 'shape', values: ['circle', 'square', 'triangle'] };
export const COLOR: Dim = { id: 'color', noun: 'color', values: ['red', 'blue', 'yellow'] };
export const SHAPE_DIMS: readonly Dim[] = [COUNT, SHAPE, COLOR];
export const ROOM: Dim = { id: 'room', noun: 'room', values: ['Room 1', 'Room 2', 'Room 3'] };
export const TIME: Dim = { id: 'time', noun: 'time', values: ['9 o’clock', '10 o’clock', '11 o’clock'] };
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const SUBJECTS = ['Math', 'Art', 'Music', 'Science', 'Reading', 'Gym'] as const;

/** A tile: each feature's value, as an index into its Dim's values. */
export type Tile = Record<string, number>;

export interface Grid {
  kind: 'shapes' | 'timetable';
  size: 2 | 3;
  dims: readonly Dim[];
  /** The row rule: the feature, and its value in each row. */
  row?: { dim: string; vals: number[] };
  /** The column rule: the feature, and its value in each column. */
  col?: { dim: string; vals: number[] };
  /** What every tile shares. */
  fixed: Record<string, number>;
  /** The missing tile [row, col]. */
  gap: [number, number];
  /** Day and subject names of a timetable. */
  heads?: { rows: string[]; cols: string[] };
}

export function tileAt(g: Grid, r: number, c: number): Tile {
  const t: Tile = { ...g.fixed };
  if (g.row) t[g.row.dim] = g.row.vals[r];
  if (g.col) t[g.col.dim] = g.col.vals[c];
  return t;
}
export const answerOf = (g: Grid): Tile => tileAt(g, g.gap[0], g.gap[1]);
export const sameTile = (a: Tile, b: Tile) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);

/** Which rules a tile in the gap breaks. */
export interface Breaks { row: boolean; col: boolean; fixed: boolean }
export function breaksOf(g: Grid, t: Tile): Breaks {
  const [r, c] = g.gap;
  return {
    row: !!g.row && t[g.row.dim] !== g.row.vals[r],
    col: !!g.col && t[g.col.dim] !== g.col.vals[c],
    fixed: Object.entries(g.fixed).some(([k, v]) => t[k] !== v),
  };
}
export type Verdict = 'none' | 'row' | 'col' | 'both';
/** The validator: the rule (or rules) a tile breaks. Options never change what every tile shares. */
export function verdictOf(g: Grid, t: Tile): Verdict {
  const b = breaksOf(g, t);
  if (b.fixed) throw new Error('an option changed what every tile shares');
  return b.row && b.col ? 'both' : b.row ? 'row' : b.col ? 'col' : 'none';
}

/** Every tile the grid's features allow. */
export function allTiles(g: Grid): Tile[] {
  let out: Tile[] = [{}];
  for (const d of g.dims) out = out.flatMap((t) => d.values.map((_, i) => ({ ...t, [d.id]: i })));
  return out;
}

/**
 * The second method: put a tile in the gap of the drawn grid and check the grid itself. Along every row, the row
 * feature is one value, and no two rows share it; down every column, the same for the column feature; every tile
 * shares the rest.
 */
export function fitsFromCells(g: Grid, t: Tile): boolean {
  const n = g.size;
  const cell = (r: number, c: number) => (r === g.gap[0] && c === g.gap[1] ? t : tileAt(g, r, c));
  const lines = (dim: string, along: 'row' | 'col') => {
    const vals: number[] = [];
    for (let a = 0; a < n; a++) {
      const line = Array.from({ length: n }, (_, b) => (along === 'row' ? cell(a, b) : cell(b, a))[dim]);
      if (new Set(line).size !== 1) return false;
      vals.push(line[0]);
    }
    return new Set(vals).size === n;
  };
  if (g.row && !lines(g.row.dim, 'row')) return false;
  if (g.col && !lines(g.col.dim, 'col')) return false;
  for (const k of Object.keys(g.fixed)) {
    const all = new Set<number>();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) all.add(cell(r, c)[k]);
    if (all.size !== 1) return false;
  }
  return true;
}

// ---------- words ----------

const valueOf = (g: Grid, dim: string, v: number) => g.dims.find((d) => d.id === dim)!.values[v];
const nounOf = (g: Grid, dim: string) => g.dims.find((d) => d.id === dim)!.noun;

/** A tile in words: "2 red circles", "Room 2 at 10 o’clock". */
export function tileWords(g: Grid, t: Tile): string {
  if (g.kind === 'timetable') return `${ROOM.values[t.room]} at ${TIME.values[t.time]}`;
  const n = Number(COUNT.values[t.count]);
  return `${n} ${COLOR.values[t.color]} ${SHAPE.values[t.shape]}${n === 1 ? '' : 's'}`;
}
/** A tile as the subject of a sentence: "the tile with 2 red circles", "the class in Room 2 at 10 o’clock". */
export const tileName = (g: Grid, t: Tile): string => (g.kind === 'timetable' ? `the class in ${tileWords(g, t)}` : `the tile with ${tileWords(g, t)}`);
export const toCell = (t: Tile): MatrixCell => ({ count: Number(COUNT.values[t.count]), shape: SHAPE.values[t.shape] as MatrixCell['shape'], color: COLOR.values[t.color] as MatrixCell['color'] });

/** One feature's value as a tile has it: "yellow", "squares", "2 shapes", "Room 3", "10 o’clock". */
export function featureWords(g: Grid, dim: string, v: number): string {
  const w = valueOf(g, dim, v);
  if (dim === 'shape') return `${w}s`;
  if (dim === 'count') return `${w} shape${w === '1' ? '' : 's'}`;
  return w;
}

/** What one row or column keeps: "Row 3 is all yellow." "Column 2 has squares." "Wednesday is in Room 3." */
export function lineHas(g: Grid, along: 'row' | 'col', i: number): string {
  const rule = along === 'row' ? g.row! : g.col!;
  const v = rule.vals[i];
  if (g.kind === 'timetable') return along === 'row' ? `${g.heads!.rows[i]} is in ${valueOf(g, 'room', v)}.` : `${g.heads!.cols[i]} is at ${valueOf(g, 'time', v)}.`;
  const name = `${along === 'row' ? 'Row' : 'Column'} ${i + 1}`;
  if (rule.dim === 'color') return `${name} is all ${valueOf(g, 'color', v)}.`;
  if (rule.dim === 'shape') return `${name} has ${valueOf(g, 'shape', v)}s.`;
  return `${name} has ${featureWords(g, 'count', v)} in each tile.`;
}


export function ruleLine(g: Grid, along: 'row' | 'col'): string {
  if (g.kind === 'timetable') return along === 'row' ? 'Each day has its own room.' : 'Each subject has its own time.';
  const rule = along === 'row' ? g.row! : g.col!;
  return `Each ${along === 'row' ? 'row' : 'column'} has its own ${nounOf(g, rule.dim)}.`;
}

/** What every tile shares, in words: "Every tile has 2 shapes and is blue." */
export function allLine(g: Grid): string | undefined {
  const parts = Object.entries(g.fixed).map(([k, v]) => {
    if (k === 'count') return `has ${featureWords(g, 'count', v)}`;
    if (k === 'color') return `is ${valueOf(g, 'color', v)}`;
    return `shows ${valueOf(g, 'shape', v)}s`;
  });
  return parts.length ? `Every tile ${andList(parts)}.` : undefined;
}

export function gridScene(g: Grid): MatrixScene {
  const n = g.size;
  const isGap = (r: number, c: number) => r === g.gap[0] && c === g.gap[1];
  const base = {
    kind: 'matrix' as const,
    size: g.size,
    ...(g.row ? { rowRule: ruleLine(g, 'row') } : {}),
    ...(g.col ? { colRule: ruleLine(g, 'col') } : {}),
    ...(allLine(g) ? { allRule: allLine(g) } : {}),
    missing: g.gap,
  };
  if (g.kind === 'timetable') {
    return { ...base, cells: [], tiles: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (isGap(r, c) ? null : tileWords(g, tileAt(g, r, c))))), heads: g.heads };
  }
  return { ...base, cells: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (isGap(r, c) ? null : toCell(tileAt(g, r, c))))) };
}

// ---------- making grids ----------

const pickVals = (rng: Rng, dim: Dim, n: number) => rng.shuffle(dim.values.map((_, i) => i)).slice(0, n);

/** A shape grid: two rules (row and column), or one rule on rows or columns, with the other features shared. */
export function shapeGrid(rng: Rng, o: { size: 2 | 3; rules: 'one' | 'two'; ruleOn?: 'row' | 'col' }): Grid {
  const [d1, d2, d3] = rng.shuffle(SHAPE_DIMS);
  const n = o.size;
  const gap: [number, number] = [rng.int(0, n - 1), rng.int(0, n - 1)];
  if (o.rules === 'two') {
    return { kind: 'shapes', size: n, dims: SHAPE_DIMS, row: { dim: d1.id, vals: pickVals(rng, d1, n) }, col: { dim: d2.id, vals: pickVals(rng, d2, n) }, fixed: { [d3.id]: rng.int(0, 2) }, gap };
  }
  const on = o.ruleOn ?? rng.pick(['row', 'col'] as const);
  const rule = { dim: d1.id, vals: pickVals(rng, d1, n) };
  return { kind: 'shapes', size: n, dims: SHAPE_DIMS, ...(on === 'row' ? { row: rule } : { col: rule }), fixed: { [d2.id]: rng.int(0, 2), [d3.id]: rng.int(0, 2) }, gap };
}

/** A camp timetable: days down the side (each day its own room), subjects across the top (each its own time). */
export function timetableGrid(rng: Rng): Grid {
  const start = rng.int(0, DAYS.length - 3);
  const rows = DAYS.slice(start, start + 3);
  const cols = rng.shuffle(SUBJECTS).slice(0, 3);
  return {
    kind: 'timetable',
    size: 3,
    dims: [ROOM, TIME],
    row: { dim: 'room', vals: pickVals(rng, ROOM, 3) },
    col: { dim: 'time', vals: pickVals(rng, TIME, 3) },
    fixed: {},
    gap: [rng.int(0, 2), rng.int(0, 2)],
    heads: { rows: [...rows], cols: [...cols] },
  };
}

/** An option tile with its verdict, the move that made it, and where it was copied from (in words). */
export interface Option { id: string; tile: Tile; verdict: Verdict; how: 'answer' | 'beside' | 'above' | 'both' | 'third'; from?: string }

/** Where a neighbour sits, seen from the gap: "the tile to its left", "the tile below it". */
function whereFrom(g: Grid, r: number, c: number): string {
  const [gr, gc] = g.gap;
  if (r === gr) return `the tile ${Math.abs(c - gc) > 1 ? 'two places ' : ''}to its ${c < gc ? 'left' : 'right'}`;
  return `the tile ${Math.abs(r - gr) > 1 ? 'two places ' : ''}${r < gr ? 'above' : 'below'} it`;
}

/**
 * The options for a grid's gap, each classified by the validator. Two rules: the answer, the gap's row with the column
 * feature of a tile beside it (fits the row, breaks the column), the gap's column with the row feature of a tile above
 * or below (fits the column, breaks the row), and one that breaks both. One rule: the answer, a copy of the neighbour
 * across the rule (the tile beside it for a column rule, the tile above or below for a row rule), and a third value.
 */
export function optionsOf(g: Grid, rng: Rng): Option[] {
  const n = g.size;
  const [r, c] = g.gap;
  const ans = answerOf(g);
  const otherC = rng.pick(Array.from({ length: n }, (_, i) => i).filter((i) => i !== c));
  const otherR = rng.pick(Array.from({ length: n }, (_, i) => i).filter((i) => i !== r));
  const out: Omit<Option, 'verdict'>[] = [{ id: 'answer', tile: ans, how: 'answer' }];
  if (g.row && g.col) {
    out.push(
      { id: 'beside', tile: { ...ans, [g.col.dim]: g.col.vals[otherC] }, how: 'beside', from: whereFrom(g, r, otherC) },
      { id: 'above', tile: { ...ans, [g.row.dim]: g.row.vals[otherR] }, how: 'above', from: whereFrom(g, otherR, c) },
      { id: 'both', tile: { ...ans, [g.col.dim]: g.col.vals[otherC], [g.row.dim]: g.row.vals[otherR] }, how: 'both' },
    );
  } else {
    const rule = (g.row ?? g.col)!;
    const copy = g.col ? { id: 'beside', tile: tileAt(g, r, otherC), how: 'beside' as const, from: whereFrom(g, r, otherC) } : { id: 'above', tile: tileAt(g, otherR, c), how: 'above' as const, from: whereFrom(g, otherR, c) };
    out.push(copy);
    const used = new Set([ans[rule.dim], copy.tile[rule.dim]]);
    const dim = g.dims.find((d) => d.id === rule.dim)!;
    const third = rng.pick(dim.values.map((_, i) => i).filter((i) => !used.has(i)));
    out.push({ id: 'third', tile: { ...ans, [rule.dim]: third }, how: 'third' });
  }
  return out.map((x) => ({ ...x, verdict: verdictOf(g, x.tile) }));
}

/** What a tile has of one feature, as a sentence start: "This tile has squares." / "This class is in Room 2." */
export function tileHas(g: Grid, t: Tile, dim: string, who = 'This tile'): string {
  if (g.kind === 'timetable') return `${who === 'This tile' ? 'This class' : who} is ${dim === 'room' ? 'in' : 'at'} ${featureWords(g, dim, t[dim])}.`;
  return `${who} has ${featureWords(g, dim, t[dim])}.`;
}

// ---------- teaching ----------

const FITS = { truth: 'fits', untruth: 'breaks' } as const;

function gridTeach(g: Grid, opts: Option[]): Teach {
  const two = !!(g.row && g.col);
  const truths = (o: Option) => [
    ...(g.row ? [{ who: 'Row rule', value: !breaksOf(g, o.tile).row }] : []),
    ...(g.col ? [{ who: 'Column rule', value: !breaksOf(g, o.tile).col }] : []),
  ];
  const note = (o: Option) => (o.verdict === 'none' ? 'It passes every rule: this tile fills the gap.' : o.verdict === 'both' ? 'It breaks both rules.' : `It breaks the ${o.verdict === 'row' ? 'row' : 'column'} rule.`);
  return {
    rule: two ? 'The missing tile must fit the row rule and the column rule.' : `The missing tile must fit the ${g.row ? 'row' : 'column'} rule, and share what every tile shares.`,
    terms: [
      { word: 'A row', meaning: 'tiles side by side, going across.' },
      { word: 'A column', meaning: 'tiles stacked from top to bottom.' },
      { word: 'A rule', meaning: 'what every row, or every column, must keep.' },
    ],
    casesTitle: two ? 'Each choice, checked against both rules' : 'Each choice, checked against the rule',
    cases: opts.map((o) => ({ label: `${cap(tileWords(g, o.tile))}.`, truths: truths(o), note: note(o), words: FITS })),
    remember: two ? ['A tile must pass both rules.', 'Ask: “Did I check the row and the column?”'] : ['Find the way the rule runs: along rows, or down columns.', 'Ask: “What does the gap’s line share?”'],
    simpler: [
      ...(g.row ? ['Look along the gap’s row. What do its tiles share?'] : []),
      ...(g.col ? ['Look down the gap’s column. What do its tiles share?'] : []),
      'The missing tile has that too.',
    ],
  };
}

/**
 * A marked twin for the hint: a grid with the item's own rules (one rule or two, the same features), worked in words,
 * with values the item's answer does not have, so it never shows the answer.
 */
function gridHintCase(g: Grid): TeachCase {
  const ans = answerOf(g);
  if (g.kind === 'timetable') {
    const day = DAYS.find((d) => !g.heads!.rows.includes(d))!;
    const subject = SUBJECTS.find((x) => !g.heads!.cols.includes(x))!;
    const room = ROOM.values.find((_, i) => i !== ans.room)!;
    const time = TIME.values.find((_, i) => i !== ans.time)!;
    return { label: `A twin: ${day} is in ${room}, and ${subject} is at ${time}. ${day}’s ${subject} class is in ${room} at ${time}.`, truths: [{ who: 'Row rule', value: true }, { who: 'Column rule', value: true }], words: FITS, note: 'It fits the day and the subject.' };
  }
  // Every feature of the twin's gap differs from this item's answer.
  const other = (dim: string) => (ans[dim] + 1) % 3;
  const twinTile: Tile = { count: other('count'), shape: other('shape'), color: other('color') };
  const tg: Grid = {
    ...g,
    size: 2,
    ...(g.row ? { row: { dim: g.row.dim, vals: [twinTile[g.row.dim]] } } : {}),
    ...(g.col ? { col: { dim: g.col.dim, vals: [twinTile[g.col.dim]] } } : {}),
    fixed: Object.fromEntries(Object.keys(g.fixed).map((k) => [k, twinTile[k]])),
    gap: [0, 0],
  };
  const where = g.row && g.col ? 'row 1 and column 1' : g.row ? 'row 1' : 'column 1';
  const facts = [...(g.row ? [lineHas(tg, 'row', 0)] : []), ...(g.col ? [lineHas(tg, 'col', 0)] : []), allLine(tg) ?? ''].filter(Boolean).join(' ');
  const cell = toCell(twinTile);
  const things: Thing[] = Array.from({ length: cell.count }, (_, i) => ({ id: `h${i + 1}`, shape: cell.shape as Thing['shape'], color: cell.color as Thing['color'], size: 'small' }));
  return {
    label: `A twin: the gap is in ${where}. ${facts} It takes ${tileWords(tg, twinTile)}.`,
    things,
    truths: [...(g.row ? [{ who: 'Row rule', value: true }] : []), ...(g.col ? [{ who: 'Column rule', value: true }] : [])],
    words: FITS,
    note: 'Check each rule, one at a time.',
  };
}

/** Feedback for a wrong option, from the validator's verdict. */
function optionFeedback(g: Grid, o: Option, ans: Tile): ChoiceFeedback {
  const w = tileWords(g, o.tile);
  const who = cap(tileName(g, o.tile));
  const right = tileWords(g, ans);
  const b = breaksOf(g, o.tile);
  const [r, c] = g.gap;
  const rowFact = g.row ? lineHas(g, 'row', r) : '';
  const colFact = g.col ? lineHas(g, 'col', c) : '';
  const lines: string[] = [];
  if (g.row) lines.push(b.row ? `${rowFact} ${tileHas(g, o.tile, g.row.dim)} So it breaks the row rule.` : `${rowFact} ${tileHas(g, o.tile, g.row.dim)} That fits.`);
  if (g.col) lines.push(b.col ? `${colFact} ${tileHas(g, o.tile, g.col.dim)} So it breaks the column rule.` : `${colFact} ${tileHas(g, o.tile, g.col.dim)} That fits.`);
  lines.push(`The tile that passes ${g.row && g.col ? 'both rules' : 'the rule'} is ${right}.`);
  let headline: string;
  if (o.verdict === 'both') headline = `${who} breaks both rules.`;
  else if (g.row && g.col) headline = `${who} fits the ${o.verdict === 'row' ? 'column' : 'row'} rule but breaks the ${o.verdict === 'row' ? 'row' : 'column'} rule.`;
  else if (o.how === 'beside') headline = `${who} copies ${o.from}, but it breaks the column rule. This rule runs down the columns.`;
  else if (o.how === 'above') headline = `${who} copies ${o.from}, but it breaks the row rule. This rule runs along the rows.`;
  else headline = `${who} breaks the ${g.row ? 'row' : 'column'} rule.`;
  return {
    headline,
    detail: lines,
    example: {
      label: `${cap(w)} in the gap.`,
      truths: [...(g.row ? [{ who: 'Row rule', value: !b.row }] : []), ...(g.col ? [{ who: 'Column rule', value: !b.col }] : [])],
      words: FITS,
      note: `${cap(tileName(g, ans))} fits instead.`,
    },
  };
}

const gridSpec = (o: Partial<ItemSpec> & Pick<ItemSpec, 'skill' | 'phase' | 'task'>): ItemSpec => ({
  lesson: L2,
  level: 2,
  twin: `${L2}.${o.skill.split('.')[1]}`,
  metaSkill: 'Track 3 · row and column rules',
  rule: 'a stated row rule and column rule; every other feature is the same in every tile',
  rep: 'a grid of shape tiles, with each color written',
  difficulty: 3,
  ...o,
});

const optionChoices = (g: Grid, opts: Option[], rng: Rng): Choice[] => rng.shuffle(opts.map((o) => ({ id: o.id, label: cap(tileWords(g, o.tile)) })));

// ---------- items ----------

/** Do (L2): a one-rule grid. The trap, for a column rule: copying the tile beside the gap. */
export function gridOneItem(rng: Rng, o: { size?: 2 | 3; framed?: boolean; phase?: Phase; ruleOn?: 'row' | 'col'; level?: 1 | 2 | 3 } = {}): ChooseItem {
  const size = o.size ?? 2;
  const g = shapeGrid(rng, { size, rules: 'one', ruleOn: o.ruleOn ?? rng.pick(['col', 'col', 'row'] as const) });
  const opts = optionsOf(g, rng);
  const ans = answerOf(g);
  const along = g.row ? 'row' : 'col';
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const x of opts) {
    if (x.id === 'answer') continue;
    feedback[x.id] = optionFeedback(g, x, ans);
    if (x.how === 'beside') errorTags[x.id] = 'row-only';
  }
  const trap = !!g.col;
  return chooseOf(
    gridSpec({
      skill: 's16.grid-one', phase: o.phase ?? 'do', task: 'complete a one-rule grid', difficulty: o.framed ? 1 : 2, level: o.level ?? 2,
      rule: `a stated ${along === 'row' ? 'row' : 'column'} rule; every other feature is the same in every tile`,
      tags: trap ? ['row-only'] : [], conflict: trap,
    }),
    {
      prompt: `This ${size} by ${size} grid was built with the rule shown. One tile is missing. Which tile fills the gap?`,
      scene: gridScene(g),
      explain: `${lineHas(g, along, along === 'row' ? g.gap[0] : g.gap[1])} ${allLine(g)} So the gap takes ${tileWords(g, ans)}.`,
      teach: gridTeach(g, opts),
      hints: [`Which way does the rule run: along rows, or down columns?`, `Look ${along === 'row' ? 'along the gap’s row' : 'down the gap’s column'}. What do its tiles share?`, 'Keep what every tile shares, too.'],
      hintCase: gridHintCase(g),
      ...(o.framed ? { frame: `Look ${along === 'row' ? 'along the gap’s row' : 'down the gap’s column'}, and keep what every tile shares. The gap takes ___.` } : {}),
    },
    optionChoices(g, opts, rng),
    'answer',
    feedback,
    errorTags,
  );
}

/** Do (L3): a 3×3 two-rule grid. The trap: a tile that fits the row but breaks the column. */
export function gridTwoItem(rng: Rng, o: { phase?: Phase; level?: 1 | 2 | 3; framed?: boolean } = {}): ChooseItem {
  const g = shapeGrid(rng, { size: 3, rules: 'two' });
  const opts = optionsOf(g, rng);
  const ans = answerOf(g);
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const x of opts) {
    if (x.id === 'answer') continue;
    feedback[x.id] = optionFeedback(g, x, ans);
    // One direction checked: the row only (a tile that breaks the column), or the column only.
    if (x.verdict === 'col' || x.verdict === 'row') errorTags[x.id] = 'row-only';
  }
  return chooseOf(
    gridSpec({ skill: 's16.grid-two', phase: o.phase ?? 'do', task: 'complete a two-rule grid', level: o.level ?? 3, difficulty: 3, tags: ['row-only'], conflict: true }),
    {
      prompt: 'This 3 by 3 grid was built with the rules shown. One tile is missing. Which tile fills the gap?',
      scene: gridScene(g),
      explain: `${lineHas(g, 'row', g.gap[0])} ${lineHas(g, 'col', g.gap[1])} ${allLine(g)} Only ${tileName(g, ans)} passes both rules.`,
      teach: gridTeach(g, opts),
      hints: ['Read the row rule. What does the gap’s row share?', 'Read the column rule. What does the gap’s column share?', 'Pick the tile that passes both rules.'],
      hintCase: gridHintCase(g),
      ...(o.framed ? { frame: 'It must fit the gap’s row and the gap’s column. The gap takes ___.' } : {}),
    },
    optionChoices(g, opts, rng),
    'answer',
    feedback,
    errorTags,
  );
}

const RULE_CHOICES: Choice[] = [
  { id: 'row', label: 'Only the row rule' },
  { id: 'col', label: 'Only the column rule' },
  { id: 'both', label: 'Both rules' },
  { id: 'none', label: 'Neither: it fits' },
];

/** Explain: which rule does this wrong tile break? The answer is the validator's verdict. */
export function gridWhyItem(rng: Rng, o: { phase?: Phase; timetable?: boolean } = {}): ChooseItem {
  const g = o.timetable ? timetableGrid(rng) : shapeGrid(rng, { size: 3, rules: 'two' });
  const opts = optionsOf(g, rng);
  const wrong = rng.pick(opts.filter((x) => x.id !== 'answer'));
  const v = wrong.verdict;
  const w = tileWords(g, wrong.tile);
  const who = cap(tileName(g, wrong.tile));
  const b = breaksOf(g, wrong.tile);
  const [r, c] = g.gap;
  const rowWord = `${lineHas(g, 'row', r)} ${tileHas(g, wrong.tile, g.row!.dim)}`;
  const colWord = `${lineHas(g, 'col', c)} ${tileHas(g, wrong.tile, g.col!.dim)}`;
  const says = { row: `${rowWord} ${b.row ? 'It breaks the row rule.' : 'It fits the row rule.'}`, col: `${colWord} ${b.col ? 'It breaks the column rule.' : 'It fits the column rule.'}` };
  const truthCase: TeachCase = { label: `${cap(w)} in the gap.`, truths: [{ who: 'Row rule', value: !b.row }, { who: 'Column rule', value: !b.col }], words: FITS };
  const named: Record<Verdict, string> = { row: 'breaks only the row rule', col: 'breaks only the column rule', both: 'breaks both rules', none: 'fits both rules' };
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const ch of RULE_CHOICES) {
    if (ch.id === v) continue;
    const head: Record<string, string> = {
      row: b.row ? `It does break the row rule, but that is not all: it ${named[v]}.` : `${who} keeps the row rule.`,
      col: b.col ? `It does break the column rule, but that is not all: it ${named[v]}.` : `${who} keeps the column rule.`,
      both: `${who} breaks only one rule, not both.`,
      none: `${who} does not fit: it ${named[v]}.`,
    };
    feedback[ch.id] = { headline: head[ch.id], detail: [says.row, says.col], example: truthCase };
    if (ch.id === 'none' && v !== 'both') errorTags.none = 'row-only';
    if ((ch.id === 'row' && v === 'col') || (ch.id === 'col' && v === 'row')) errorTags[ch.id] = 'row-only';
  }
  const tt = g.kind === 'timetable';
  return chooseOf(
    gridSpec({
      skill: 's16.grid-why', phase: o.phase ?? 'explain', task: 'name the rule a wrong tile breaks', level: 3, difficulty: 3,
      rep: tt ? 'a timetable grid in words' : 'a grid of shape tiles, with each color written',
      rubric: { need: 2, words: '2 = checks the tile against both rules and names each one it breaks; 1 = checks one rule only; 0 = no rule' },
      tags: v === 'col' ? ['row-only'] : [], conflict: v === 'col',
    }),
    {
      prompt: `${tt ? 'This timetable was made with the two rules shown.' : 'This grid was built with the two rules shown.'} Someone put ${w} in the gap. Which rule does that tile break?`,
      scene: gridScene(g),
      explain: `${says.row} ${says.col} So it ${named[v]}.`,
      teach: gridTeach(g, opts),
      hints: ['Check the row rule first. Does the tile fit the gap’s row?', 'Now check the column rule. Does it fit the gap’s column?', 'Say each rule it breaks. It can break one rule or both.'],
      hintCase: gridHintCase(g),
    },
    RULE_CHOICES,
    v,
    feedback,
    errorTags,
  );
}

/** Transfer: a camp timetable, days by subjects, built with a room rule and a time rule. */
export function timetableItem(rng: Rng, o: { phase?: Phase } = {}): ChooseItem {
  const g = timetableGrid(rng);
  const opts = optionsOf(g, rng);
  const ans = answerOf(g);
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const x of opts) {
    if (x.id === 'answer') continue;
    feedback[x.id] = optionFeedback(g, x, ans);
    if (x.verdict === 'col' || x.verdict === 'row') errorTags[x.id] = 'row-only';
  }
  const [r, c] = g.gap;
  return chooseOf(
    gridSpec({ skill: 's16.grid-transfer', phase: o.phase ?? 'transfer', task: 'complete a two-rule timetable', level: 3, rep: 'a timetable grid in words', tags: ['row-only'], conflict: true, rule: 'each day has its own room (rows); each subject has its own time (columns)' }),
    {
      prompt: `A camp timetable has days down the side and subjects across the top. It was made with the two rules shown. Where and when is ${g.heads!.rows[r]}’s ${g.heads!.cols[c]} class?`,
      scene: gridScene(g),
      explain: `${lineHas(g, 'row', r)} ${lineHas(g, 'col', c)} So the gap is ${tileWords(g, ans)}.`,
      teach: gridTeach(g, opts),
      hints: [`Find ${g.heads!.rows[r]}’s row. Which room does that day use?`, `Find the ${g.heads!.cols[c]} column. What time is it at?`, 'Pick the class that fits both.'],
      hintCase: gridHintCase(g),
    },
    optionChoices(g, opts, rng),
    'answer',
    feedback,
    errorTags,
  );
}

// =====================================================================================================================
// The primer: sort by one feature (instead of Stop 2, Lesson 1)
// =====================================================================================================================

type Card = Pick<Thing, 'shape' | 'color' | 'size'>;
const FEATURES = ['color', 'shape', 'size'] as const;
type Feature = (typeof FEATURES)[number];
const FEATURE_VALUES: Record<Feature, readonly string[]> = { color: COLOR.values, shape: SHAPE.values, size: ['big', 'small'] };
const cardWords = (t: Card) => `the ${t.size} ${t.color} ${t.shape}`;
/** A feature's value after "is": "a circle", "red", "big". */
const isWord = (f: Feature, v: string) => (f === 'shape' ? `a ${v}` : v);
/** A group's value: "circles", "red", "big". */
const allWord = (f: Feature, v: string) => (f === 'shape' ? `${v}s` : v);
const randomCard = (rng: Rng): Card => ({ shape: rng.pick(SHAPE.values) as Card['shape'], color: rng.pick(COLOR.values) as Card['color'], size: rng.pick(['big', 'small'] as const) });

const primerSpec = (task: string): ItemSpec =>
  gridSpec({ skill: 's16.sort', phase: 'do', task, level: 1, difficulty: 1, metaSkill: 'Track 3 · sort by one feature', rule: 'a group shares one feature', rep: 'shape cards' });

const sortTeach = (f: Feature): Teach => ({
  rule: `To sort by ${f}, look only at the ${f} of each card.`,
  terms: [{ word: 'A feature', meaning: 'one thing about a card: its color, its shape or its size.' }, { word: 'To sort', meaning: 'to put things in groups by one feature.' }],
  remember: [`Sort by ${f}: the other features do not matter.`, 'Ask: “Which feature am I sorting by?”'],
  simpler: [`Point to a card. Say its ${f} out loud.`, `Cards with the same ${f} go in the same group.`],
});
/** A marked twin for the hint: a sort by a different feature from this item's, so it never names the answer. */
const sortHint = (f: Feature): TeachCase =>
  f === 'color'
    ? { label: 'A twin: sorting by shape, a big red circle and a small blue circle go together, because both are circles.', note: 'Look at the one feature you sort by.' }
    : { label: 'A twin: sorting by color, a big red circle and a small red square go together, because both are red.', note: 'Look at the one feature you sort by.' };

/** Primer: which feature do these three cards share? Exactly one feature is the same on all three. */
export function sharedFeatureItem(rng: Rng): ChooseItem {
  const f = rng.pick(FEATURES);
  for (;;) {
    const cards = [randomCard(rng), randomCard(rng), randomCard(rng)].map((t, _i, all) => ({ ...t, [f]: all[0][f] }));
    const shared = FEATURES.filter((x) => new Set(cards.map((t) => t[x])).size === 1);
    if (shared.length !== 1) continue;
    const things: Thing[] = cards.map((t, i) => ({ id: `k${i + 1}`, ...t }));
    const feedback: Record<string, ChoiceFeedback> = {};
    for (const x of FEATURES) {
      if (x === f) continue;
      feedback[x] = { headline: `These cards do not all share a ${x}.`, detail: [`Their ${x}s are ${andList(cards.map((t) => t[x]))}.`, `They all share their ${f}: all ${allWord(f, cards[0][f])}.`] };
    }
    return chooseOf(
      primerSpec('name the shared feature'),
      {
        prompt: `These three cards were put in one group by one feature. Which feature do they share? The cards: ${andList(cards.map(cardWords))}.`,
        scene: { kind: 'things', things },
        explain: `All three are ${allWord(f, cards[0][f])}. Their other features differ.`,
        teach: sortTeach(f),
        hints: ['Look at the colors. Are they all the same?', 'Now the shapes, then the sizes.'],
        hintCase: sortHint(f),
      },
      rng.shuffle(FEATURES.map((x) => ({ id: x, label: cap(x) }))),
      f,
      feedback,
    );
  }
}

/** Primer: sort by one feature; which card goes in the same group as this one? One look-alike shares another feature. */
export function sortGroupItem(rng: Rng): ChooseItem {
  const f = rng.pick(['color', 'shape'] as const);
  const g = f === 'color' ? 'shape' : 'color';
  const key = randomCard(rng);
  const [o1, o2] = rng.shuffle(FEATURE_VALUES[f].filter((v) => v !== key[f]));
  const gOther = rng.shuffle(FEATURE_VALUES[g].filter((v) => v !== key[g]));
  const withF = (t: Card, fv: string, gv: string): Card => (f === 'color' ? { ...t, color: fv as Card['color'], shape: gv as Card['shape'] } : { ...t, shape: fv as Card['shape'], color: gv as Card['color'] });
  // The right card shares the sorted feature only; the look-alike shares everything else; the third shares nothing.
  const right = withF(randomCard(rng), key[f], gOther[0]);
  const look = withF(key, o1, key[g]);
  const third = withF(randomCard(rng), o2, gOther[1]);
  const cards = [{ id: 'right', t: right }, { id: 'look', t: look }, { id: 'third', t: third }];
  const feedback: Record<string, ChoiceFeedback> = {
    look: { headline: `${cap(cardWords(look))} looks like ${cardWords(key)}, but its ${f} is different.`, detail: [`Sorting by ${f}, only the ${f} counts. It is ${isWord(f, look[f])}, not ${isWord(f, key[f])}.`, `${cap(cardWords(right))} is ${isWord(f, key[f])}, so it goes with it.`] },
    third: { headline: `${cap(cardWords(third))} has a different ${f}.`, detail: [`It is ${isWord(f, third[f])}, not ${isWord(f, key[f])}.`, `${cap(cardWords(right))} is ${isWord(f, key[f])}, so it goes with it.`] },
  };
  return chooseOf(
    primerSpec('sort by one feature'),
    {
      prompt: `Sort by ${f}. Which card goes in the same group as ${cardWords(key)}?`,
      scene: { kind: 'things', things: [{ id: 'key', ...key }] },
      explain: `${cap(cardWords(key))} is ${isWord(f, key[f])}. Only ${cardWords(right)} is ${isWord(f, key[f])} too.`,
      teach: sortTeach(f),
      hints: [`What is the ${f} of ${cardWords(key)}?`, `Find the card with that ${f}. Ignore the rest.`],
      hintCase: sortHint(f),
    },
    rng.shuffle(cards.map((x) => ({ id: x.id, label: cap(cardWords(x.t)) }))),
    'right',
    feedback,
  );
}

/** Primer: the cards were sorted by shape (or color); which one does not belong? */
export function oddOneItem(rng: Rng): ChooseItem {
  const f = rng.pick(['color', 'shape'] as const);
  const v = rng.pick(FEATURE_VALUES[f]);
  const odd = rng.pick(FEATURE_VALUES[f].filter((x) => x !== v));
  const g = f === 'color' ? 'shape' : 'color';
  const gs = rng.shuffle(FEATURE_VALUES[g]);
  const cards: Card[] = [
    { [f]: v, [g]: gs[0], size: 'big' } as Card,
    { [f]: v, [g]: gs[1], size: 'small' } as Card,
    { [f]: v, [g]: gs[2], size: rng.pick(['big', 'small'] as const) } as Card,
    { [f]: odd, [g]: gs[0], size: rng.pick(['big', 'small'] as const) } as Card,
  ];
  const ids = ['c1', 'c2', 'c3', 'odd'];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (let i = 0; i < 3; i++) feedback[ids[i]] = { headline: `${cap(cardWords(cards[i]))} belongs: it is ${isWord(f, v)}.`, detail: [`The group was sorted by ${f}, so only the ${f} counts.`, `${cap(cardWords(cards[3]))} is ${isWord(f, odd)}, so it does not belong.`] };
  return chooseOf(
    primerSpec('find the card that breaks a sort'),
    {
      prompt: `These cards were sorted into one group by ${f}. Which card does not belong?`,
      scene: { kind: 'things', things: cards.map((t, i) => ({ id: ids[i], ...t })) },
      explain: `The group is all ${allWord(f, v)}. ${cap(cardWords(cards[3]))} is ${isWord(f, odd)}, so it does not belong.`,
      teach: sortTeach(f),
      hints: [`Look at the ${f} of every card.`, 'Which one is different?'],
      hintCase: sortHint(f),
    },
    rng.shuffle(cards.map((t, i) => ({ id: ids[i], label: cap(cardWords(t)) }))),
    'odd',
    feedback,
  );
}
