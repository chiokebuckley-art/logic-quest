/**
 * Pattern Observatory, Ring 3 (Deep Sky): the Mirror Pool's model, its validators and its items, plus the small item
 * helpers the three Deep Sky modules share (matrix.ts and analogy.ts import them from here).
 *
 * A picture is folded along a line (the fold, or mirror line). Each dot of the first half is named by its line (the
 * row, for a fold down the middle; the column, for a fold across, like a pool) and its step from the fold (step 1 is
 * right next to the line). Three moves make a second half:
 *
 *   reflect  the same line, the same step                (a fold: every point keeps its partner across the line)
 *   turn     the same step, the line at the other end    (a half turn about the middle of the fold: top and bottom swap)
 *   slide    the same line, step D + 1 − k               (a copy slid across without flipping)
 *
 * `gridIs` checks a whole drawn picture cell by cell (a second method the tests compare with the moves). Transfer items
 * use two more models: letters drawn as dot bitmaps (b, d, p, q), and arrows and house fronts as points that a mirror
 * flips (x ↦ −x beside it, y ↦ −y below it, both for a turn), checked against each other in the tests.
 */
import { looks } from '../../fresh';
import { syncWhyWrong } from '../../teach';
import type { MirrorCandidate, MirrorScene } from '../../scenes/mirror';
import type { Choice, ChoiceFeedback, ChooseItem, ErrorTag, Item, MultiItem, Phase, Rng, Scene, Teach, TeachCase } from '../../types';

// =====================================================================================================================
// Shared Deep Sky helpers
// =====================================================================================================================

export const STOP = 16;
export const L1 = 's16.l1';
export const L2 = 's16.l2';
export const L3 = 's16.l3';

/** What an item declares about itself (ItemMeta, plus the pieces every Deep Sky item sets). */
export interface ItemSpec {
  lesson: string;
  skill: string;
  phase: Phase;
  level: 1 | 2 | 3;
  twin: string;
  /** "Track 3 · reflection or turn". */
  metaSkill: string;
  /** The generating rule or assumption, stated. */
  rule: string;
  task: string;
  rep: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Explain items: the level the reason needs, and the rubric in words. */
  rubric?: { need: 0 | 1 | 2 | 3; words: string };
  /** Pass-rule tags (the place's trap). */
  tags?: string[];
  conflict?: boolean;
}

/** The words of an item. */
export interface ItemBody {
  prompt: string;
  scene?: Scene;
  explain: string;
  teach: Teach;
  /** The hint sequence; the first is also `hint`. */
  hints: string[];
  /** A marked twin case for the hint (never the answer case). */
  hintCase: TeachCase;
  /** A faded frame with ___ for the one blank. */
  frame?: string;
}

const TRAPS: readonly ErrorTag[] = ['reflection-vs-rotation', 'row-only', 'appearance-match'];

function common(spec: ItemSpec, body: ItemBody, errorTags: Record<string, ErrorTag>, answerType: 'categorical' | 'set') {
  const tags = [...new Set([...Object.values(errorTags), ...(spec.tags ?? []).filter((t): t is ErrorTag => (TRAPS as readonly string[]).includes(t))])];
  return {
    id: 'x',
    stop: STOP,
    lesson: spec.lesson,
    skill: spec.skill,
    prompt: body.prompt,
    ...(body.scene ? { scene: body.scene } : {}),
    explain: body.explain,
    teach: body.teach,
    hint: body.hints[0],
    hints: body.hints,
    hintCase: body.hintCase,
    ...(body.frame ? { frame: body.frame } : {}),
    phase: spec.phase,
    level: spec.level,
    twin: spec.twin,
    errorTags,
    tags: spec.tags ?? [],
    ...(spec.conflict ? { conflict: true } : {}),
    ...(spec.rubric ? { rubric: spec.rubric.need } : {}),
    meta: {
      skill: spec.metaSkill,
      rule: spec.rule,
      task: spec.task,
      representation: spec.rep,
      difficulty: spec.difficulty,
      answerType,
      ...(spec.rubric ? { rubric: spec.rubric.words } : {}),
      tags,
      twin: spec.twin,
      phase: spec.phase,
    },
  };
}

/** A choose item: every wrong choice has its feedback (and so its whyWrong). */
export function chooseOf(spec: ItemSpec, body: ItemBody, choices: Choice[], answer: string, feedback: Record<string, ChoiceFeedback>, errorTags: Record<string, ErrorTag> = {}): ChooseItem {
  for (const c of choices) if (c.id !== answer && !feedback[c.id]) throw new Error(`${spec.skill}: no feedback for ${c.id}`);
  const item: ChooseItem = { ...common(spec, body, errorTags, 'categorical'), kind: 'choose', choices, answer, feedback };
  return syncWhyWrong(item);
}

/** A multi item (pick every card that belongs): a tip for every card. */
export function multiOf(spec: ItemSpec, body: ItemBody, choices: Choice[], answer: string[], missTips: Record<string, string>, pickTips: Record<string, string>, errorTags: Record<string, ErrorTag> = {}): MultiItem {
  return { ...common(spec, body, errorTags, 'set'), kind: 'multi', choices, answer, missTips, pickTips };
}

/** Makes a set of items, none looking like another: a repeat is made again from the same rng. */
export function distinctSet(makers: (() => Item)[]): Item[] {
  const seen = new Set<string>();
  return makers.map((make) => {
    let it = make();
    for (let i = 0; i < 60 && seen.has(looks(it)); i++) it = make();
    seen.add(looks(it));
    return it;
  });
}

/** "a", "a and b", "a, b and c". */
export const andList = (xs: readonly string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Truth words for a case card. */
export const YES_NO = { truth: 'yes', untruth: 'no' } as const;

// =====================================================================================================================
// The fold model
// =====================================================================================================================

export type Fold = 'v' | 'h';
/** A dot of a half: k = steps from the fold (1 = next to it), j = its line (1 = top row, or the left column). */
export interface Dot { k: number; j: number }
/** A half picture: D steps deep, S lines long. */
export interface Half { fold: Fold; D: number; S: number; dots: Dot[] }
export type Move = 'reflect' | 'turn' | 'slide';
export const MOVES: readonly Move[] = ['reflect', 'turn', 'slide'];

export const sortDots = (ds: readonly Dot[]): Dot[] => [...ds].sort((a, b) => a.j - b.j || a.k - b.k);
export const sameDots = (a: readonly Dot[], b: readonly Dot[]) => JSON.stringify(sortDots(a)) === JSON.stringify(sortDots(b));
export const hasDot = (ds: readonly Dot[], d: Dot) => ds.some((x) => x.k === d.k && x.j === d.j);

/** Where a dot of the first half lands on the second side under a move. */
export function moveDot(h: Pick<Half, 'D' | 'S'>, d: Dot, m: Move): Dot {
  if (m === 'reflect') return { k: d.k, j: d.j };
  if (m === 'turn') return { k: d.k, j: h.S + 1 - d.j };
  return { k: h.D + 1 - d.k, j: d.j };
}
export const moved = (h: Half, m: Move): Dot[] => sortDots(h.dots.map((d) => moveDot(h, d, m)));

/** Rows and columns of the whole picture. */
export const sizeOf = (h: Pick<Half, 'fold' | 'D' | 'S'>) => (h.fold === 'v' ? { rows: h.S, cols: 2 * h.D } : { rows: 2 * h.D, cols: h.S });

/** The cell of a dot on side 0 (left or top) or side 1 (right or below). */
export function cellOf(h: Pick<Half, 'fold' | 'D'>, d: Dot, side: 0 | 1): { r: number; c: number } {
  if (h.fold === 'v') return { r: d.j - 1, c: side === 0 ? h.D - d.k : h.D - 1 + d.k };
  return { r: side === 0 ? h.D - d.k : h.D - 1 + d.k, c: d.j - 1 };
}
export const indexOf = (h: Half, d: Dot, side: 0 | 1) => {
  const { r, c } = cellOf(h, d, side);
  return r * sizeOf(h).cols + c;
};

/** Every spot of one side. */
export const allSpots = (h: Pick<Half, 'D' | 'S'>): Dot[] => sortDots(Array.from({ length: h.D * h.S }, (_, i) => ({ k: (i % h.D) + 1, j: Math.floor(i / h.D) + 1 })));

/**
 * The whole picture: the first half's dots, and on the second side the dots shown, the spots to decide ('?') or, with
 * `hidden`, every spot not drawn yet ('-').
 */
export function picture(h: Half, second: { dots?: readonly Dot[]; ask?: readonly Dot[]; hidden?: boolean } = {}): string[] {
  const { rows, cols } = sizeOf(h);
  const g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'));
  const put = (d: Dot, side: 0 | 1, ch: string) => {
    const { r, c } = cellOf(h, d, side);
    g[r][c] = ch;
  };
  if (second.hidden) for (const d of allSpots(h)) put(d, 1, '-');
  for (const d of h.dots) put(d, 0, '#');
  for (const d of second.dots ?? []) put(d, 1, '#');
  for (const d of second.ask ?? []) put(d, 1, '?');
  return g.map((r) => r.join(''));
}

/** The second half alone, as a candidate's cells (step 1 next to the fold first). */
export function halfCells(h: Pick<Half, 'fold' | 'D' | 'S'>, dots: readonly Dot[]): string[] {
  const on = (k: number, j: number) => (hasDot(dots, { k, j }) ? '#' : '.');
  if (h.fold === 'v') return Array.from({ length: h.S }, (_, j) => Array.from({ length: h.D }, (_, k) => on(k + 1, j + 1)).join(''));
  return Array.from({ length: h.D }, (_, k) => Array.from({ length: h.S }, (_, j) => on(k + 1, j + 1)).join(''));
}

/**
 * The second method: is a whole drawn picture (with '#' dots) made by a move? It compares cells directly: a fold down
 * the middle mirrors each row, a fold across mirrors each column, a turn is the same picture spun a half turn, and a
 * slide copies the first half across.
 */
export function gridIs(cells: readonly string[], fold: Fold, m: Move): boolean {
  const H = cells.length;
  const W = cells[0]?.length ?? 0;
  const at = (r: number, c: number) => cells[r][c] === '#';
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const first = fold === 'v' ? c < W / 2 : r < H / 2;
      if (!first) continue;
      let r2: number, c2: number;
      if (m === 'turn') [r2, c2] = [H - 1 - r, W - 1 - c];
      else if (fold === 'v') [r2, c2] = m === 'reflect' ? [r, W - 1 - c] : [r, c + W / 2];
      else [r2, c2] = m === 'reflect' ? [H - 1 - r, c] : [r + H / 2, c];
      if (at(r, c) !== at(r2, c2)) return false;
    }
  }
  return true;
}

/** A half whose reflection, turn and slide are three different pictures (so every move can be told apart). */
export function makeHalf(rng: Rng, fold: Fold, D: number, n: number): Half {
  const S = 3;
  for (;;) {
    const dots = sortDots(rng.shuffle(allSpots({ D, S })).slice(0, n));
    const h: Half = { fold, D, S, dots };
    const [r, t, s] = MOVES.map((m) => moved(h, m));
    if (!sameDots(r, t) && !sameDots(r, s) && !sameDots(t, s)) return h;
  }
}

// ---------- words ----------

const LINES: Record<Fold, readonly string[]> = { v: ['top row', 'middle row', 'bottom row'], h: ['left column', 'middle column', 'right column'] };
export const lineOf = (fold: Fold, j: number) => LINES[fold][j - 1];
/** "the top row at step 2". */
export const spotOf = (fold: Fold, d: Dot) => `the ${lineOf(fold, d.j)} at step ${d.k}`;
/** The two sides: "left half" / "right half", or "top half" / "bottom half". */
export const sideOf = (fold: Fold, side: 0 | 1) => (fold === 'v' ? ['left half', 'right half'] : ['top half', 'bottom half'])[side];
const lineKind = (fold: Fold) => (fold === 'v' ? 'row' : 'column');
const ends = (fold: Fold) => (fold === 'v' ? 'top and bottom' : 'left and right');

/** The dots of one line, in words: "a dot at step 2", "dots at steps 1 and 3", "no dots". */
export function lineDots(dots: readonly Dot[], j: number): string {
  const ks = dots.filter((d) => d.j === j).map((d) => d.k).sort((a, b) => a - b);
  if (!ks.length) return 'no dots';
  return ks.length === 1 ? `a dot at step ${ks[0]}` : `dots at steps ${andList(ks.map(String))}`;
}

/** A whole half in words, line by line: "top row at step 1; bottom row at steps 2 and 3". */
export function halfWords(fold: Fold, dots: readonly Dot[]): string {
  const parts: string[] = [];
  for (let j = 1; j <= 3; j++) {
    const ks = dots.filter((d) => d.j === j).map((d) => d.k).sort((a, b) => a - b);
    if (ks.length) parts.push(`${lineOf(fold, j)} at step${ks.length > 1 ? 's' : ''} ${andList(ks.map(String))}`);
  }
  return parts.join('; ') || 'no dots';
}

/** A whole half as short sentences, for prose: "Top row: step 1. Bottom row: steps 2 and 3." */
export function halfSentences(fold: Fold, dots: readonly Dot[]): string {
  const parts: string[] = [];
  for (let j = 1; j <= 3; j++) {
    const ks = dots.filter((d) => d.j === j).map((d) => d.k).sort((a, b) => a - b);
    if (ks.length) parts.push(`${cap(lineOf(fold, j))}: step${ks.length > 1 ? 's' : ''} ${andList(ks.map(String))}.`);
  }
  return parts.join(' ') || 'No dots.';
}

/** The first line where two halves differ, said both ways. */
export function lineDiff(fold: Fold, want: readonly Dot[], got: readonly Dot[], gotName: string, wantName = 'a fold'): string {
  for (let j = 1; j <= 3; j++) {
    const a = lineDots(want, j);
    const b = lineDots(got, j);
    if (a !== b) return `In the ${lineOf(fold, j)}, ${wantName} puts ${a}. ${cap(gotName)} has ${b}.`;
  }
  return '';
}

/** A first-half dot whose partner spot (same line, same step) is empty in `second`. */
const lonely = (h: Half, second: readonly Dot[]) => h.dots.find((d) => !hasDot(second, d));
/** A first-half dot whose turn spot differs from its partner spot (not in the middle line). */
const offMiddle = (h: Half) => h.dots.find((d) => d.j !== h.S + 1 - d.j) ?? h.dots[0];

// ---------- teaching shared by the fold items ----------

/** The teaching for a fold item whose picture is D steps deep (the slid copy of step 1 lands at step D, the far edge). */
export function foldTeach(fold: Fold, D: number): Teach {
  const [s0, s1] = [sideOf(fold, 0), sideOf(fold, 1)];
  const a: Dot = { k: 1, j: 1 };
  const turn: Dot = moveDot({ D, S: 3 }, a, 'turn');
  const slide: Dot = moveDot({ D, S: 3 }, a, 'slide');
  return {
    rule: `A reflection keeps every dot’s partner in the same ${lineKind(fold)}, at the same step from the fold.`,
    terms: [
      { word: 'A reflection', meaning: 'the picture a fold makes. Each dot lands across the line, at the same step from it.' },
      { word: 'A turn', meaning: `the half spun halfway around the middle of the line. ${cap(ends(fold))} swap.` },
      { word: 'A step', meaning: 'one dot away from the fold line. Step 1 is right next to it.' },
    ],
    casesTitle: `Where can the partner of a dot in ${spotOf(fold, a)} land?`,
    cases: [
      { label: `On the ${s1}: ${spotOf(fold, a)}.`, truths: [{ who: `Same ${lineKind(fold)}`, value: true }, { who: 'Same step', value: true }], note: 'This is a reflection.', words: YES_NO },
      { label: `On the ${s1}: ${spotOf(fold, turn)}.`, truths: [{ who: `Same ${lineKind(fold)}`, value: false }, { who: 'Same step', value: true }], note: `${cap(ends(fold))} swapped. This is a turn.`, words: YES_NO },
      { label: `On the ${s1}: ${spotOf(fold, slide)}.`, truths: [{ who: `Same ${lineKind(fold)}`, value: true }, { who: 'Same step', value: false }], note: 'This is a copy slid across.', words: YES_NO },
    ],
    remember: ['A reflection keeps the line and the step.', 'Ask: “Does every dot have its partner across the fold?”'],
    simpler: [`Put one dot on the ${s0}, right next to the fold, in the ${lineOf(fold, 1)}.`, 'Fold the page along the line.', `The dot lands on the ${s1}, right next to the fold, in the ${lineOf(fold, 1)}.`],
  };
}

/** A marked twin case for a hint: one dot and its partner, in a spot this item's first half leaves empty. */
export function foldHintCase(fold: Fold, avoid: readonly Dot[] = []): TeachCase {
  const d: Dot = allSpots({ D: 2, S: 3 }).find((x) => !hasDot(avoid, x)) ?? { k: 2, j: 1 };
  return {
    label: `A twin: the ${sideOf(fold, 0)} has a dot in ${spotOf(fold, d)}. The ${sideOf(fold, 1)} has one in ${spotOf(fold, d)} too.`,
    truths: [{ who: `Same ${lineKind(fold)}`, value: true }, { who: 'Same step', value: true }],
    note: 'That dot has its partner. Check every dot the same way.',
    words: YES_NO,
  };
}

const FOLD_HINTS = (fold: Fold) => [
  'Pick one dot. Count its steps from the fold line.',
  `Look across the line, in the same ${lineKind(fold)}, at the same step. Is a dot there?`,
  'Check every dot the same way before you decide.',
];

const foldSpec = (o: Partial<ItemSpec> & Pick<ItemSpec, 'skill' | 'phase' | 'task'>): ItemSpec => ({
  lesson: L1,
  level: 1,
  twin: `${L1}.${o.skill.split('.')[1]}`,
  metaSkill: 'Track 3 · reflection or turn',
  rule: 'a fold keeps each dot in the same line at the same step; a half turn swaps the ends of the line',
  rep: 'a dot grid',
  difficulty: 2,
  ...o,
});

/** The picture for an item: the whole picture with a move, numbered steps from the fold. */
export const fullScene = (h: Half, m: Move): MirrorScene => ({ kind: 'mirror', cells: picture(h, { dots: moved(h, m) }), fold: h.fold, ruler: true });

const introOf = (fold: Fold) => (fold === 'v' ? 'The fold line runs down the middle.' : 'The line is the edge of a still pool.');

// =====================================================================================================================
// Items
// =====================================================================================================================

export interface FoldOpts {
  phase?: Phase;
  fold?: Fold;
  move?: Move;
  framed?: boolean;
  level?: 1 | 2 | 3;
}

/**
 * Explain: reflection or turn, and why? The picture is a reflection or a turn; the reasons are the partner rule, the
 * swap rule, and two features that do not separate them (the dot count, "not a copy").
 */
export function foldWhyItem(rng: Rng, o: FoldOpts = {}): ChooseItem {
  const fold = o.fold ?? rng.pick(['v', 'h'] as const);
  const h = makeHalf(rng, fold, rng.pick([2, 3]), rng.int(2, 3));
  const m: Move = o.move ?? rng.pick(['reflect', 'turn'] as const);
  const second = moved(h, m);
  const [s0, s1] = [sideOf(fold, 0), sideOf(fold, 1)];
  const lk = lineKind(fold);
  const choices: Choice[] = rng.shuffle([
    { id: 'partner', label: `A reflection: every dot has a partner in the same ${lk}, at the same step.` },
    { id: 'swap', label: `A turn: each dot’s match is at the same step, but ${ends(fold)} swap.` },
    { id: 'count', label: 'A reflection: both halves have the same number of dots.' },
    { id: 'notcopy', label: `A turn: the ${s1} is not a copy of the ${s0}.` },
  ]);
  const answer = m === 'reflect' ? 'partner' : 'swap';
  const w = m === 'turn' ? lonely(h, second)! : offMiddle(h);
  const t = moveDot(h, w, 'turn');
  const proof = m === 'reflect'
    ? `Each dot has its partner. For one, ${spotOf(fold, w)} on the ${s0} meets ${spotOf(fold, w)} on the ${s1}.`
    : `The dot in ${spotOf(fold, w)} on the ${s0} has no partner there on the ${s1}. Its match is in ${spotOf(fold, t)}.`;
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  const caseOf = (): TeachCase => ({
    label: `${cap(s0)}: ${spotOf(fold, w)}. ${cap(s1)}: ${m === 'reflect' ? spotOf(fold, w) : spotOf(fold, t)}.`,
    truths: [{ who: `Same ${lk}`, value: m === 'reflect' }, { who: 'Same step', value: true }],
    note: m === 'reflect' ? 'Same line, same step: a reflection.' : `${cap(ends(fold))} swapped: a turn.`,
    words: YES_NO,
  });
  if (m === 'reflect') {
    feedback.swap = {
      headline: `${cap(ends(fold))} do not swap here: each dot keeps its ${lk}.`,
      detail: [proof, `A turn would move it to ${spotOf(fold, t)}. That spot is ${hasDot(second, t) ? 'used by another dot’s partner' : 'empty'}. So this picture is a reflection.`],
      example: caseOf(),
    };
    errorTags.swap = 'reflection-vs-rotation';
    feedback.count = {
      headline: 'This is a reflection, but the dot count does not show it.',
      detail: ['A turn keeps the same number of dots too, so the count fits both.', `The reason that proves it is the partner rule. ${proof}`],
      example: caseOf(),
    };
    feedback.notcopy = {
      headline: 'This picture is not a turn, and “not a copy” does not show one.',
      detail: [`A reflection is not a copy either, so that reason fits both. ${proof}`],
      example: caseOf(),
    };
  } else {
    feedback.partner = {
      headline: `Not every dot has a partner in the same ${lk}.`,
      detail: [proof, `${cap(ends(fold))} swapped, so this picture is a turn.`],
      example: caseOf(),
    };
    errorTags.partner = 'reflection-vs-rotation';
    feedback.count = {
      headline: 'This picture is a turn, and the dot count cannot tell.',
      detail: ['A turn and a reflection both keep the same number of dots.', proof],
      example: caseOf(),
    };
    feedback.notcopy = {
      headline: 'This is a turn, but “not a copy” does not show it.',
      detail: ['A reflection is not a copy either, so that reason fits both.', `The partner check proves it. ${proof}`],
      example: caseOf(),
    };
  }
  return chooseOf(
    foldSpec({
      skill: 's16.fold-why', phase: o.phase ?? 'explain', task: 'choose the reason: reflection or turn', difficulty: 3,
      rubric: { need: 2, words: '2 = names the partner rule (same line, same step) and checks every dot; 1 = a feature that fits both, like the dot count; 0 = no rule' },
      tags: m === 'turn' ? ['reflection-vs-rotation'] : [],
      conflict: m === 'turn',
      level: o.level ?? 1,
    }),
    {
      prompt: `${introOf(fold)} Is the ${s1} a reflection of the ${s0}, or a turn? Pick the answer with the reason that proves it.`,
      scene: fullScene(h, m),
      explain: `${proof} ${m === 'reflect' ? 'Every dot keeps its line and its step, so this is a reflection.' : `${cap(ends(fold))} swapped, so this is a turn.`} The dot count fits both, so it proves nothing.`,
      teach: foldTeach(fold, h.D),
      hints: FOLD_HINTS(fold),
      hintCase: foldHintCase(fold, h.dots),
    },
    choices,
    answer,
    feedback,
    errorTags,
  );
}

/** Do or review: reflection, turn or a copy slid across? The picture is made by one of the three moves. */
export function foldOrTurnItem(rng: Rng, o: FoldOpts = {}): ChooseItem {
  const fold = o.fold ?? rng.pick(['v', 'h'] as const);
  const h = makeHalf(rng, fold, rng.pick([2, 3]), rng.int(2, 4));
  const m: Move = o.move ?? rng.pick(['reflect', 'reflect', 'turn', 'turn', 'slide'] as const);
  const second = moved(h, m);
  const [s0, s1] = [sideOf(fold, 0), sideOf(fold, 1)];
  const choices: Choice[] = [
    { id: 'reflect', label: 'A reflection' },
    { id: 'turn', label: 'A turn' },
    { id: 'slide', label: 'A copy slid across' },
  ];
  const named: Record<Move, string> = { reflect: 'a reflection', turn: 'a turn', slide: 'a copy slid across' };
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const x of MOVES) {
    if (x === m) continue;
    const want = moved(h, x);
    feedback[x] = {
      headline: `The ${s1} is not ${named[x]}.`,
      detail: [lineDiff(fold, want, second, `the ${s1}`, named[x]), `Check every dot: the ${s1} is ${named[m]}.`],
      example: { label: `${cap(named[x])} would give these dots. ${halfSentences(fold, want)}`, note: `The ${s1} does not match, so it is not ${named[x]}.` },
    };
    if ((x === 'turn' && m === 'reflect') || (x === 'reflect' && m === 'turn')) errorTags[x] = 'reflection-vs-rotation';
  }
  // Follow a dot whose landing spot tells this move from the others (a middle row dot looks the same folded or turned).
  const others = MOVES.filter((x) => x !== m);
  const lands = (d: Dot, x: Move) => moveDot(h, d, x);
  const apart = (d: Dot, x: Move) => !hasDot([lands(d, m)], lands(d, x));
  const w = h.dots.find((d) => others.every((x) => apart(d, x))) ?? h.dots.find((d) => apart(d, m === 'reflect' ? 'turn' : 'reflect')) ?? h.dots[0];
  return chooseOf(
    foldSpec({ skill: 's16.fold-or-turn', phase: o.phase ?? 'do', task: 'name the move: reflection, turn or slide', tags: m === 'turn' ? ['reflection-vs-rotation'] : [], conflict: m === 'turn', level: o.level ?? 1 }),
    {
      prompt: `${introOf(fold)} The ${s1} was made from the ${s0} by one move. Was it a reflection, a turn, or a copy slid across?`,
      scene: fullScene(h, m),
      explain: `The dot in ${spotOf(fold, w)} lands in ${spotOf(fold, moveDot(h, w, m))}. Every other dot moves the same way. So the ${s1} is ${named[m]}.`,
      teach: foldTeach(fold, h.D),
      hints: FOLD_HINTS(fold),
      hintCase: foldHintCase(fold, h.dots),
    },
    choices,
    m,
    feedback,
    errorTags,
  );
}

/**
 * Do: which half does the fold make? The first half is drawn, the second is hidden, and three candidate halves are
 * drawn small and lettered: the reflection, the turn (the trap) and a copy slid across.
 */
export function matchHalfItem(rng: Rng, o: FoldOpts & { trapTag?: boolean } = {}): ChooseItem {
  const fold = o.fold ?? rng.pick(['v', 'v', 'h'] as const);
  const h = makeHalf(rng, fold, rng.pick([2, 3]), rng.int(2, 3));
  const order = rng.shuffle(MOVES);
  const names = ['A', 'B', 'C'];
  const nameOf = (m: Move) => names[order.indexOf(m)];
  const candidates: MirrorCandidate[] = order.map((m) => ({ name: nameOf(m), cells: halfCells(h, moved(h, m)) }));
  const choices: Choice[] = order.map((m) => ({ id: m, label: `Half ${nameOf(m)}: ${halfWords(fold, moved(h, m))}` }));
  const [s0, s1] = [sideOf(fold, 0), sideOf(fold, 1)];
  const want = moved(h, 'reflect');
  const w = offMiddle(h);
  const feedback: Record<string, ChoiceFeedback> = {
    turn: {
      headline: `Half ${nameOf('turn')} is a turn: ${ends(fold)} swapped.`,
      detail: [
        `The ${s0} has a dot in ${spotOf(fold, w)}. A fold puts its partner in ${spotOf(fold, w)} too.`,
        `${lineDiff(fold, want, moved(h, 'turn'), `half ${nameOf('turn')}`)} The fold makes half ${nameOf('reflect')}.`,
      ],
      example: { label: `Dot: ${spotOf(fold, w)}. Fold: ${spotOf(fold, w)}. Turn: ${spotOf(fold, moveDot(h, w, 'turn'))}.`, note: 'A fold keeps the line. A turn moves it to the other end.' },
    },
    slide: {
      headline: `Half ${nameOf('slide')} is a copy slid across, not folded.`,
      detail: [
        'A fold keeps every dot at the same step from the line. A slid copy puts the near dots far away.',
        `${lineDiff(fold, want, moved(h, 'slide'), `half ${nameOf('slide')}`)} The fold makes half ${nameOf('reflect')}.`,
      ],
      example: { label: `Dot at step 1. Fold: step 1. Slide: step ${h.D}.`, note: 'A fold keeps the step. A slide does not.' },
    },
  };
  const framed = !!o.framed;
  return chooseOf(
    foldSpec({
      skill: 's16.fold-match', phase: o.phase ?? 'do', task: 'choose the half a fold makes', difficulty: framed ? 1 : 2,
      tags: framed ? [] : ['reflection-vs-rotation'], conflict: !framed, level: o.level ?? 1,
    }),
    {
      prompt: `${introOf(fold)} The ${s1} will be made by folding the ${s0} over the line. Which half will the fold make?`,
      scene: { kind: 'mirror', cells: picture(h, { hidden: true }), fold, ruler: true, candidates },
      explain: `A fold keeps each dot’s line and step. The ${s0} has these dots. ${halfSentences(fold, h.dots)} So the fold makes the same spots: half ${nameOf('reflect')}.`,
      teach: foldTeach(fold, h.D),
      hints: FOLD_HINTS(fold),
      hintCase: foldHintCase(fold, h.dots),
      ...(framed ? { frame: `Each dot keeps its ${lineKind(fold)} and its step. So the fold makes ___.` } : {}),
    },
    choices,
    'reflect',
    feedback,
    { turn: 'reflection-vs-rotation' },
  );
}

/** The spots to decide on the second side, lettered a, b, c… in reading order (as the picture draws them). */
export function askLetters(h: Half, ask: readonly Dot[]): { dot: Dot; letter: string }[] {
  const ordered = [...ask].sort((a, b) => indexOf(h, a, 1) - indexOf(h, b, 1));
  return ordered.map((dot, i) => ({ dot, letter: 'abcdef'[i] }));
}

/**
 * Do (L2): finish the half. The picture is made by a fold; some partner dots are drawn. Pick every spot that still
 * needs a dot. The spots offered include where a turn and a slide would put dots.
 */
export function finishHalfItem(rng: Rng, o: FoldOpts = {}): MultiItem {
  const fold = o.fold ?? rng.pick(['v', 'h'] as const);
  for (;;) {
    const h = makeHalf(rng, fold, 3, rng.int(3, 4));
    const want = moved(h, 'reflect');
    const given = rng.shuffle(want).slice(0, rng.int(1, 2));
    const need = want.filter((d) => !hasDot(given, d));
    const turnSpots = moved(h, 'turn').filter((d) => !hasDot(want, d));
    const slideSpots = moved(h, 'slide').filter((d) => !hasDot(want, d) && !hasDot(turnSpots, d));
    const others = allSpots(h).filter((d) => !hasDot(want, d) && !hasDot(turnSpots, d) && !hasDot(slideSpots, d));
    const ask = [...need, ...rng.shuffle(turnSpots).slice(0, 2), ...rng.shuffle(slideSpots).slice(0, 1)];
    for (const d of rng.shuffle(others)) if (ask.length < 5) ask.push(d);
    if (ask.length < 4 || ask.length > 6 || !turnSpots.some((d) => hasDot(ask, d))) continue;
    const lettered = askLetters(h, ask);
    const [s0, s1] = [sideOf(fold, 0), sideOf(fold, 1)];
    const choices: Choice[] = lettered.map(({ dot, letter }) => ({ id: `spot-${letter}`, label: `Spot ${letter}: ${spotOf(fold, dot).replace(/^the /, '')}` }));
    const answer = lettered.filter(({ dot }) => hasDot(need, dot)).map(({ letter }) => `spot-${letter}`);
    const missTips: Record<string, string> = {};
    const pickTips: Record<string, string> = {};
    const errorTags: Record<string, ErrorTag> = {};
    for (const { dot, letter } of lettered) {
      const id = `spot-${letter}`;
      if (hasDot(need, dot)) missTips[id] = `Spot ${letter} needs a dot. The ${s0} has a dot in ${spotOf(fold, dot)}, so its partner goes there on the ${s1}.`;
      else if (hasDot(turnSpots, dot)) {
        pickTips[id] = `Spot ${letter} is where a turn puts a dot, not a fold. The ${s0} has no dot in ${spotOf(fold, dot)}, so spot ${letter} stays empty.`;
        errorTags[id] = 'reflection-vs-rotation';
      } else pickTips[id] = `Spot ${letter} stays empty. The ${s0} has no dot in ${spotOf(fold, dot)}, so there is no partner for it.`;
    }
    const needWords = andList(lettered.filter(({ dot }) => hasDot(need, dot)).map(({ letter }) => letter));
    return multiOf(
      foldSpec({ skill: 's16.fold-finish', phase: o.phase ?? 'do', task: 'finish the half a fold makes', difficulty: 3, level: o.level ?? 2, tags: ['reflection-vs-rotation'], rule: 'a fold keeps each dot in the same line at the same step' }),
      {
        prompt: `${introOf(fold)} This picture is made by a fold: the ${s1} is the reflection of the ${s0}. Some dots are drawn. Which spots still need a dot? Pick every one.`,
        scene: { kind: 'mirror', cells: picture(h, { dots: given, ask }), fold, ruler: true },
        explain: `The ${s0} has these dots. ${halfSentences(fold, h.dots)} Each partner sits in the same ${lineKind(fold)} at the same step. So spot${answer.length > 1 ? 's' : ''} ${needWords} need${answer.length > 1 ? '' : 's'} a dot.`,
        teach: foldTeach(fold, h.D),
        hints: [`Take one spot. Find the spot at the same ${lineKind(fold)} and step on the ${s0}.`, 'Is there a dot there? Then this spot needs one.', 'Check every spot, and leave the rest empty.'],
        hintCase: foldHintCase(fold, h.dots),
      },
      choices,
      answer,
      missTips,
      pickTips,
      errorTags,
    );
  }
}

// =====================================================================================================================
// Transfer: letters, arrows and house fronts
// =====================================================================================================================

/** Letters drawn as dot bitmaps, 5 rows by 3 columns. */
export const LETTERS: Record<'b' | 'd' | 'p' | 'q', string[]> = {
  b: ['#..', '#..', '###', '#.#', '###'],
  d: ['..#', '..#', '###', '#.#', '###'],
  p: ['###', '#.#', '###', '#..', '#..'],
  q: ['###', '#.#', '###', '..#', '..#'],
};
export type Letter = keyof typeof LETTERS;
export const LETTER_IDS = Object.keys(LETTERS) as Letter[];

/** A bitmap flipped by a mirror: beside it (left to right), below it (top to bottom), or a half turn (both). */
export function flipBitmap(bits: readonly string[], how: 'beside' | 'below' | 'turn'): string[] {
  const lr = (rows: readonly string[]) => rows.map((r) => [...r].reverse().join(''));
  const tb = (rows: readonly string[]) => [...rows].reverse();
  return how === 'beside' ? lr(bits) : how === 'below' ? tb(bits) : tb(lr(bits));
}
export const letterOf = (bits: readonly string[]): Letter | undefined => LETTER_IDS.find((l) => LETTERS[l].join('/') === bits.join('/'));

/** A letter's look in words: where its stick is and which way it points (the second method for the bitmaps). */
export const LETTER_LOOK: Record<Letter, { x: -1 | 1; y: -1 | 1 }> = { b: { x: -1, y: 1 }, d: { x: 1, y: 1 }, p: { x: -1, y: -1 }, q: { x: 1, y: -1 } };
const stickWords = (l: Letter) => `the stick on the ${LETTER_LOOK[l].x < 0 ? 'left' : 'right'}, pointing ${LETTER_LOOK[l].y > 0 ? 'up' : 'down'}`;

/** A point flipped by a mirror beside (x), a pool below (y), a half turn (both), or a plain copy. */
export type Flip = 'beside' | 'below' | 'turn' | 'copy';
export const flipPoint = (p: { x: number; y: number }, how: Flip) => ({ x: how === 'beside' || how === 'turn' ? -p.x : p.x, y: how === 'below' || how === 'turn' ? -p.y : p.y });

const PLACE = {
  beside: { where: 'A mirror stands on its right side.', line: 'a mirror beside it', pos: 'beside it', flips: 'left and right' },
  below: { where: 'It sits at the edge of a still pool. You see it in the water below.', line: 'a pool below it', pos: 'below it', flips: 'top and bottom' },
} as const;

const transferSpec = (o: { task: string; rep: string; phase?: Phase; level?: 1 | 2 | 3; difficulty?: 1 | 2 | 3 | 4 | 5 }): ItemSpec =>
  foldSpec({ skill: 's16.fold-transfer', phase: o.phase ?? 'transfer', task: o.task, rep: o.rep, level: o.level ?? 2, difficulty: o.difficulty ?? 3, tags: ['reflection-vs-rotation'], conflict: true, rule: 'a mirror beside flips left and right; a pool below flips top and bottom; a half turn flips both' });

function flipTeach(where: 'beside' | 'below', thing: string): Teach {
  return {
    rule: `A mirror beside a thing flips its left and right. A pool below flips its top and bottom. A turn flips both.`,
    terms: [
      { word: 'A reflection', meaning: 'what a mirror or still water shows. Each point stays the same distance from the mirror line, on the other side.' },
      { word: 'A turn', meaning: 'the thing spun halfway around. Left and right swap, and top and bottom swap too.' },
    ],
    casesTitle: `What can happen to ${thing}?`,
    cases: [
      { label: 'In a mirror beside it.', truths: [{ who: 'Left and right swap', value: true }, { who: 'Top and bottom swap', value: false }], words: YES_NO },
      { label: 'In a pool below it.', truths: [{ who: 'Left and right swap', value: false }, { who: 'Top and bottom swap', value: true }], words: YES_NO },
      { label: 'Turned halfway around.', truths: [{ who: 'Left and right swap', value: true }, { who: 'Top and bottom swap', value: true }], note: 'Both swap: that is a turn, not a reflection.', words: YES_NO },
    ],
    remember: [`Here the mirror is ${PLACE[where].pos}. Only ${PLACE[where].flips} swap.`, 'Ask: “Where is the mirror line?”'],
    simpler: ['Hold up your right hand to a mirror.', 'The hand in the mirror is on your right side too, but it looks like a left hand.', 'Left and right swapped. Top and bottom did not.'],
  };
}

const flipHintCase = (where: 'beside' | 'below'): TeachCase => ({
  label: where === 'beside' ? 'A twin: a cup with its handle on the left, by a mirror on its right side. In the mirror, the handle is on the right.' : 'A twin: a tree by a pool. In the water, its top points down, and its trunk is near the edge.',
  truths: [{ who: where === 'beside' ? 'Left and right swap' : 'Top and bottom swap', value: true }, { who: where === 'beside' ? 'Top and bottom swap' : 'Left and right swap', value: false }],
  note: 'Only one direction swaps in a reflection.',
  words: YES_NO,
});

const FLIP_HINTS = (where: 'beside' | 'below') => [
  `Find the mirror. Here it is ${PLACE[where].pos}.`,
  `A reflection swaps only ${PLACE[where].flips}.`,
  'A turn swaps both directions. Check that your answer swaps only one.',
];

/** Transfer: which letter does the mirror show? b, d, p and q are one shape flipped four ways. */
export function letterItem(rng: Rng, o: { phase?: Phase } = {}): ChooseItem {
  const l = rng.pick(LETTER_IDS);
  const where = rng.pick(['beside', 'below'] as const);
  const other = where === 'beside' ? 'below' : 'beside';
  const answer = letterOf(flipBitmap(LETTERS[l], where))!;
  const turned = letterOf(flipBitmap(LETTERS[l], 'turn'))!;
  const otherLine = letterOf(flipBitmap(LETTERS[l], other))!;
  const choices: Choice[] = rng.shuffle(LETTER_IDS).map((x) => ({ id: x, label: `The letter ${x}` }));
  const feedback: Record<string, ChoiceFeedback> = {
    [turned]: {
      headline: `The letter ${turned} is ${l} turned halfway around, not reflected.`,
      detail: [`${cap(PLACE[where].line)} swaps only ${PLACE[where].flips}. So ${l}, with ${stickWords(l)}, becomes ${answer}, with ${stickWords(answer)}.`, `In ${turned}, both directions swapped. That is a turn.`],
      example: { label: `${l}: ${stickWords(l)}. ${answer}: ${stickWords(answer)}. ${turned}: ${stickWords(turned)}.`, note: `Only ${answer} swaps just ${PLACE[where].flips}.` },
    },
    [otherLine]: {
      headline: `The letter ${otherLine} is what ${PLACE[other].line} would show.`,
      detail: [`Here the mirror is ${PLACE[where].pos}, so ${PLACE[where].flips} swap, not ${PLACE[other].flips}.`, `That turns ${l} into ${answer}.`],
      example: { label: `${l} in ${PLACE[where].line}: ${answer}. ${l} in ${PLACE[other].line}: ${otherLine}.`, note: 'The mirror line decides what swaps.' },
    },
    [l]: {
      headline: `The letter ${l} is the same letter, not its reflection.`,
      detail: [`A reflection swaps ${PLACE[where].flips}. The stick of ${l} must move, so the letter changes to ${answer}.`],
      example: { label: `${l}: ${stickWords(l)}. ${answer}: ${stickWords(answer)}.`, note: 'One direction swapped: a reflection.' },
    },
  };
  return chooseOf(
    transferSpec({ task: 'name a letter’s reflection', rep: 'letters drawn in dots', level: 1, phase: o.phase }),
    {
      prompt: `The letter ${l} is drawn in dots. ${PLACE[where].where} Which letter does the reflection look like?`,
      scene: { kind: 'mirror', cells: lettersPicture(l, where), fold: where === 'beside' ? 'v' : 'h', caption: `The letter ${l}, with ${stickWords(l)}.` },
      explain: `${cap(PLACE[where].line)} swaps only ${PLACE[where].flips}. The letter ${l} has ${stickWords(l)}. Its reflection has ${stickWords(answer)}: the letter ${answer}.`,
      teach: flipTeach(where, `the letter ${l}`),
      hints: FLIP_HINTS(where),
      hintCase: flipHintCase(where),
    },
    choices,
    answer,
    feedback,
    { [turned]: 'reflection-vs-rotation' },
  );
}

/** The letter on the first side of the picture, the second side not drawn yet. */
export function lettersPicture(l: Letter, where: 'beside' | 'below'): string[] {
  const bits = LETTERS[l];
  if (where === 'beside') return bits.map((r) => `${r}---`);
  return [...bits, ...bits.map(() => '---')];
}

const DIRS = [{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }] as const;
const dirWords = (p: { x: number; y: number }) => `${p.y > 0 ? 'up' : 'down'} and to the ${p.x > 0 ? 'right' : 'left'}`;

/** Transfer: which way does an arrow's reflection point? Diagonal arrows only, so a reflection and a turn differ. */
export function arrowItem(rng: Rng, o: { phase?: Phase } = {}): ChooseItem {
  const p = rng.pick(DIRS);
  const where = rng.pick(['beside', 'below'] as const);
  const other = where === 'beside' ? 'below' : 'beside';
  const ways: Record<Flip, { x: number; y: number }> = { beside: flipPoint(p, 'beside'), below: flipPoint(p, 'below'), turn: flipPoint(p, 'turn'), copy: flipPoint(p, 'copy') };
  const id = (f: Flip) => (f === where ? 'mirror' : f === other ? 'other' : f);
  const choices: Choice[] = rng.shuffle((['beside', 'below', 'turn', 'copy'] as Flip[]).map((f) => ({ id: id(f), label: `It points ${dirWords(ways[f])}` })));
  const ans = ways[where];
  const feedback: Record<string, ChoiceFeedback> = {
    turn: {
      headline: 'That arrow is turned halfway around, not reflected.',
      detail: [`${cap(PLACE[where].line)} swaps only ${PLACE[where].flips}. So the arrow points ${dirWords(ans)}.`, `Pointing ${dirWords(ways.turn)} swaps both directions. That is a turn.`],
      example: { label: `Arrow: ${dirWords(p)}. Reflection: ${dirWords(ans)}. Turn: ${dirWords(ways.turn)}.`, note: 'A reflection swaps one direction. A turn swaps both.' },
    },
    other: {
      headline: `That is what ${PLACE[other].line} would show.`,
      detail: [`Here the mirror is ${PLACE[where].pos}, so ${PLACE[where].flips} swap.`, `The arrow points ${dirWords(ans)}.`],
      example: { label: `${cap(PLACE[where].line)}: ${dirWords(ans)}. ${cap(PLACE[other].line)}: ${dirWords(ways[other])}.`, note: 'The mirror line decides what swaps.' },
    },
    copy: {
      headline: 'That arrow is a copy: nothing swapped.',
      detail: [`A reflection swaps ${PLACE[where].flips}. So the arrow points ${dirWords(ans)}.`],
      example: { label: `Arrow: ${dirWords(p)}. Reflection: ${dirWords(ans)}.`, note: 'One direction swapped: a reflection.' },
    },
  };
  return chooseOf(
    transferSpec({ task: 'name an arrow’s reflection', rep: 'an arrow, in words', phase: o.phase }),
    {
      prompt: `An arrow on a card points ${dirWords(p)}. ${PLACE[where].where} Which way does the arrow in the reflection point?`,
      explain: `${cap(PLACE[where].line)} swaps only ${PLACE[where].flips}. So the arrow that points ${dirWords(p)} shows pointing ${dirWords(ans)}.`,
      teach: flipTeach(where, 'the arrow'),
      hints: FLIP_HINTS(where),
      hintCase: flipHintCase(where),
    },
    choices,
    'mirror',
    feedback,
    { turn: 'reflection-vs-rotation' },
  );
}

/** Transfer: a house front reflected in a pool or a glass wall. The roof (top) and the door (a side) are two points. */
export function houseItem(rng: Rng, o: { phase?: Phase } = {}): ChooseItem {
  const doorX = rng.pick([-1, 1] as const);
  const where = rng.pick(['beside', 'below'] as const);
  const other = where === 'beside' ? 'below' : 'beside';
  const roof = { x: 0, y: 1 };
  const door = { x: doorX, y: -1 };
  const look = (f: Flip) => {
    const r = flipPoint(roof, f);
    const d = flipPoint(door, f);
    return `${r.y > 0 ? 'Right way up' : 'Upside down'}, with the door on the ${d.x < 0 ? 'left' : 'right'}`;
  };
  const id = (f: Flip) => (f === where ? 'mirror' : f === other ? 'other' : f);
  const choices: Choice[] = rng.shuffle((['beside', 'below', 'turn', 'copy'] as Flip[]).map((f) => ({ id: id(f), label: look(f) })));
  const side = doorX < 0 ? 'left' : 'right';
  const placeWords = where === 'beside' ? 'A tall glass wall stands on its right side, like a mirror.' : 'It stands at the edge of a still lake. You see it in the water.';
  const feedback: Record<string, ChoiceFeedback> = {
    turn: {
      headline: 'That house is turned halfway around, not reflected.',
      detail: [`${cap(PLACE[where].line)} swaps only ${PLACE[where].flips}. So the reflection is: ${look(where).toLowerCase()}.`, 'Both the roof and the door swapped in your answer. That is a turn.'],
      example: { label: `Reflection: ${look(where).toLowerCase()}. Turn: ${look('turn').toLowerCase()}.`, note: 'A reflection swaps one direction. A turn swaps both.' },
    },
    other: {
      headline: `That is what ${PLACE[other].line} would show.`,
      detail: [`Here the mirror line is ${where === 'beside' ? 'the glass wall beside the house' : 'the water’s edge below the house'}. It swaps ${PLACE[where].flips}.`, `So the reflection is: ${look(where).toLowerCase()}.`],
      example: { label: `${cap(PLACE[where].line)}: ${look(where).toLowerCase()}.`, note: 'The mirror line decides what swaps.' },
    },
    copy: {
      headline: 'That is the house as it stands, not its reflection.',
      detail: [`A reflection swaps ${PLACE[where].flips}. So it shows: ${look(where).toLowerCase()}.`],
      example: { label: `House: ${look('copy').toLowerCase()}. Reflection: ${look(where).toLowerCase()}.`, note: 'One direction swapped: a reflection.' },
    },
  };
  return chooseOf(
    transferSpec({ task: 'describe a house front’s reflection', rep: 'a house front, in words', level: 1, phase: o.phase }),
    {
      prompt: `A house front has its roof on top and its door on the ${side}. ${placeWords} How does the house look in the reflection?`,
      explain: `${cap(PLACE[where].line)} swaps only ${PLACE[where].flips}. So the reflection is ${look(where).toLowerCase()}.`,
      teach: flipTeach(where, 'the house'),
      hints: FLIP_HINTS(where),
      hintCase: flipHintCase(where),
    },
    choices,
    'mirror',
    feedback,
    { turn: 'reflection-vs-rotation' },
  );
}

/** One transfer item: a letter, an arrow or a house front. */
export function foldTransferItem(rng: Rng, o: { phase?: Phase } = {}): ChooseItem {
  return rng.pick([letterItem, arrowItem, houseItem])(rng, o);
}
