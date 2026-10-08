/**
 * Ring 2, place 1 · Growing Staircase (s15.l1). A growing pattern comes with its construction stated ("Each step keeps
 * the center tile and adds one pair."), so any far step can be worked out from its step number and proved, not
 * guessed. The trap is the local rule: "it adds 2 each time" only gives the next step.
 *
 * Every count here comes from the construction (count = kept tiles plus the tiles per step times the step number) and
 * every term from the constant-addition rule (term n = first term plus n take away 1 jumps). The tests in
 * obs-ring2.test.ts check each one against a second method: building the steps tile by tile, or adding the jump term by
 * term.
 *
 * The first part of this file holds the small item builders the three Ring 2 modules share (machines.ts and cycles.ts
 * import them): every Ring 2 item declares its meta, phase, level, error tags, twin, hint sequence and marked hint case.
 */
import { syncWhyWrong } from '../../teach';
import type {
  ChoiceFeedback, ChooseItem, DrillMark, DrillStep, ErrorTag, IdeaCard, ItemMeta, NumberItem, Phase, Rng, Scene, Teach, TeachCase,
} from '../../types';
import type { StairCell, StaircaseScene } from '../../scenes/staircase';

// ======================================================================================================
// Shared Ring 2 item builders
// ======================================================================================================

export const STOP = 15;
export type Level = 1 | 2 | 3 | 4;

/** What every Ring 2 item carries, before its answer. The id is set by the stop file. */
export interface ItemSpec {
  lesson: string;
  /** The skill tag after "s15.": "stair-far". */
  tag: string;
  prompt: string;
  scene?: Scene;
  explain: string;
  teach: Teach;
  /** The hint sequence; the first is also `hint`. */
  hints: string[];
  /** A marked case the hint shows (never the answer case). */
  hintCase: TeachCase;
  phase: Phase;
  level: Level;
  frame?: string;
  /** Pass-rule tags (LessonPass.include): "far-step", "first-fit", "zero-remainder". */
  tags?: string[];
  conflict?: boolean;
  rubric?: 0 | 1 | 2 | 3;
  meta: Omit<ItemMeta, 'tags' | 'phase' | 'answerType'>;
}

export interface WrongChoice {
  id: string;
  label: string;
  fb: ChoiceFeedback;
  tag?: ErrorTag;
}

const uniq = <T,>(xs: T[]): T[] => [...new Set(xs)];

function base(spec: ItemSpec, answerType: ItemMeta['answerType'], tags: ErrorTag[]) {
  return {
    id: 'x',
    stop: STOP,
    lesson: spec.lesson,
    skill: `s${STOP}.${spec.tag}`,
    prompt: spec.prompt,
    ...(spec.scene ? { scene: spec.scene } : {}),
    explain: spec.explain,
    teach: spec.teach,
    hint: spec.hints[0],
    hints: spec.hints,
    hintCase: spec.hintCase,
    phase: spec.phase,
    level: spec.level,
    ...(spec.frame ? { frame: spec.frame } : {}),
    ...(spec.tags?.length ? { tags: spec.tags } : {}),
    ...(spec.conflict ? { conflict: true } : {}),
    ...(spec.rubric !== undefined ? { rubric: spec.rubric } : {}),
    twin: spec.meta.twin,
    meta: { ...spec.meta, answerType, tags, phase: spec.phase },
  };
}

/**
 * A choose item: the right choice and the wrong ones, each wrong one with its feedback (headline names the violated
 * condition, detail shows the repair) and its error tag. Choice ids stay fixed; the order is shuffled by the rng.
 */
export function chooseItem(spec: ItemSpec, right: { id: string; label: string }, wrong: WrongChoice[], rng?: Rng): ChooseItem {
  const all = [right, ...wrong.map((w) => ({ id: w.id, label: w.label }))];
  const choices = rng ? rng.shuffle(all) : all;
  const errorTags: Record<string, ErrorTag> = {};
  for (const w of wrong) if (w.tag) errorTags[w.id] = w.tag;
  const item: ChooseItem = {
    kind: 'choose',
    ...base(spec, 'categorical', uniq(Object.values(errorTags))),
    choices,
    answer: right.id,
    feedback: Object.fromEntries(wrong.map((w) => [w.id, w.fb])),
    ...(Object.keys(errorTags).length ? { errorTags } : {}),
  };
  return syncWhyWrong(item);
}

export interface WrongNumber {
  value: number;
  fb: ChoiceFeedback;
  tag?: ErrorTag;
}

/**
 * A number item for the pad. Each expected near miss (off by one, the groups without the kept tiles, a step's
 * neighbour) gets its own feedback; a wrong value that is not a whole number, is the answer, or repeats an earlier one
 * is dropped, so a collision never gives a right answer wrong words.
 */
export function numberItem(spec: ItemSpec, answer: number, unit: string, wrong: WrongNumber[]): NumberItem {
  const seen = new Set<number>([answer]);
  const kept: WrongNumber[] = [];
  for (const w of wrong) {
    if (!Number.isInteger(w.value) || w.value < 0 || w.value > 9999 || seen.has(w.value)) continue;
    seen.add(w.value);
    kept.push(w);
  }
  const errorTags: Record<string, ErrorTag> = {};
  for (const w of kept) if (w.tag) errorTags[String(w.value)] = w.tag;
  const digits = Math.min(4, Math.max(2, String(answer).length)) as 2 | 3 | 4;
  const item: NumberItem = {
    kind: 'number',
    ...base(spec, 'number', uniq(Object.values(errorTags))),
    answer,
    digits,
    ...(unit ? { unit } : {}),
    feedback: Object.fromEntries(kept.map((w) => [String(w.value), w.fb])),
    ...(Object.keys(errorTags).length ? { errorTags } : {}),
  };
  return syncWhyWrong(item);
}

/** A copy of an item for a delayed review: the same question, phase 'review'. */
export function asReview<T extends ChooseItem | NumberItem>(item: T): T {
  return { ...item, phase: 'review', meta: { ...item.meta!, phase: 'review' } };
}

/** "1 pair" / "3 pairs". */
export const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A drill mark with number options; every wrong option has its words. */
export function numberMark(id: string, label: string, answer: number, wrong: { value: number; why: string }[], rng?: Rng): DrillMark {
  const opts = [answer, ...wrong.map((w) => w.value)];
  const ordered = rng ? rng.shuffle(opts) : [...opts].sort((a, b) => a - b);
  return {
    id,
    label,
    options: ordered.map((v) => ({ id: String(v), label: String(v) })),
    answer: String(answer),
    why: Object.fromEntries(wrong.map((w) => [String(w.value), w.why])),
  };
}

/** A shown mark: the worked case, already set. */
export function givenMark(id: string, label: string, value: string, others: string[]): DrillMark {
  return { id, label, options: [value, ...others].map((v) => ({ id: v, label: v })), answer: value, given: true, why: {} };
}

// ======================================================================================================
// Constructions and counts
// ======================================================================================================

/** A stated construction: tiles kept at every step, plus a group added each step. Step n has fixed plus per times n. */
export interface Construction {
  id: 'pairs' | 'ends' | 'post';
  /** Tiles kept from the start (the center tile, the 2 end tiles, the gold tile). */
  fixed: number;
  /** Tiles each step adds (a pair is 2). */
  per: number;
  /** The construction, stated. */
  says: string;
  /** "1 center tile", "2 end tiles", "1 gold tile". */
  kept: string;
  /** What each step adds, one and many: "pair" / "pairs". */
  group: string;
  groups: string;
}

export const CONSTRUCTIONS: Record<Construction['id'], Construction> = {
  pairs: { id: 'pairs', fixed: 1, per: 2, says: 'Each step keeps the center tile and adds one pair.', kept: '1 center tile', group: 'pair', groups: 'pairs' },
  ends: { id: 'ends', fixed: 2, per: 3, says: 'Each step keeps the 2 end tiles and adds one group of 3.', kept: '2 end tiles', group: 'group of 3', groups: 'groups of 3' },
  post: { id: 'post', fixed: 1, per: 4, says: 'Each step keeps the gold tile and adds one group of 4.', kept: '1 gold tile', group: 'group of 4', groups: 'groups of 4' },
};
export const PAIRS = CONSTRUCTIONS.pairs;

/** The count at step n, from the construction. */
export const stairCount = (c: Construction, n: number) => c.fixed + c.per * n;

/**
 * The tiles of step n, built tile by tile from the construction. The group this step added is marked 'new' when
 * `markNew` is set (a See picture), else 'old'.
 */
export function stairCells(c: Construction, n: number, markNew = true): StairCell[] {
  const added = (k: number): StairCell => (markNew && k === n ? 'new' : 'old');
  if (c.id === 'pairs') {
    // Pair k sits k places out from the center, on both sides; the newest pair is the outermost one.
    const left: StairCell[] = [];
    for (let k = n; k >= 1; k--) left.push(added(k));
    return [...left, 'centre', ...[...left].reverse()];
  }
  if (c.id === 'ends') {
    const mid: StairCell[] = [];
    for (let k = 1; k <= n; k++) for (let j = 0; j < c.per; j++) mid.push(added(k));
    return ['end', ...mid, 'end'];
  }
  const tail: StairCell[] = [];
  for (let k = 1; k <= n; k++) for (let j = 0; j < c.per; j++) tail.push(added(k));
  return ['centre', ...tail];
}

/** A staircase scene for a construction: the drawn steps, then the table (null = the blank to find). */
export function stairScene(c: Construction, rows: number[], table: { step: number; count: number | null }[], extra: Partial<StaircaseScene> = {}): StaircaseScene {
  return {
    kind: 'staircase',
    construction: c.says,
    rows: rows.map((n) => ({ step: n, cells: stairCells(c, n) })),
    table,
    ...extra,
  };
}

/** Term n under a constant-addition rule: the first term plus n take away 1 jumps. */
export const termAt = (first: number, jump: number, n: number) => first + (n - 1) * jump;

type TableCell = { step: number; count: number | null };
/** Steps 1 to 3 with their counts, then step n as the blank to find. */
const askTable = (at: (k: number) => number, n: number): TableCell[] => [...[1, 2, 3].map((k) => ({ step: k, count: at(k) })), { step: n, count: null }];

/** The question scene for a far step: steps 1 to 3 drawn and in the table, and the step asked about as a blank. */
export const farScene = (c: Construction, n: number): StaircaseScene =>
  stairScene(c, [1, 2, 3], askTable((k) => stairCount(c, k), n));

/** A sequence table under a stated rule: terms 1 to 3, then the term asked about as a blank. */
export function sequenceScene(rule: string, first: number, jump: number, sign: 1 | -1, n: number, head: [string, string] = ['Term', 'Value']): StaircaseScene {
  const at = (k: number) => first + sign * (k - 1) * jump;
  return {
    kind: 'staircase',
    construction: rule,
    tag: 'Rule',
    rows: [],
    table: askTable(at, n),
    head,
    jump: sign === 1 ? `add ${jump}` : `take away ${jump}`,
  };
}

// ======================================================================================================
// The items
// ======================================================================================================

const L1 = 's15.l1';

/** The kept tiles by name: "center tile", "2 end tiles", "gold tile". */
const keptName = (c: Construction) => (c.id === 'pairs' ? 'center tile' : c.id === 'post' ? 'gold tile' : '2 end tiles');

const stairTerms = (c: Construction) => [
  { word: 'A construction', meaning: 'a stated rule for how each step is built. It lets you work out any step.' },
  { word: c.id === 'pairs' ? 'A pair' : `A ${c.group}`, meaning: c.id === 'pairs' ? 'two tiles, one on each side of the center.' : `${c.per} tiles that come in together.` },
];

/** A worked case of a step, drawn as counted groups when it is small enough. */
function stepCase(c: Construction, n: number, prefix = ''): TeachCase {
  const inGroups = c.per * n;
  return {
    label: `${prefix}Step ${n}: ${c.kept} and ${count(n, c.group, c.groups)}.`,
    ...(inGroups <= 12 ? { groups: [{ label: c.fixed === 1 ? 'Kept tile' : 'Kept tiles', n: c.fixed, color: 'yellow' as const }, { label: `Tiles in ${c.groups}`, n: inGroups, color: 'blue' as const }] } : {}),
    note: `${c.fixed} plus ${inGroups} is ${stairCount(c, n)} tiles.`,
  };
}

function stairTeach(c: Construction, n: number): Teach {
  return {
    rule: `${c.says} So step ${n} has ${c.kept} and ${count(n, c.group, c.groups)}.`,
    terms: stairTerms(c),
    casesTitle: 'Count each step from the construction',
    cases: [stepCase(c, 1), stepCase(c, 2), stepCase(c, 3)],
    remember: ['A far step comes from its step number, not from the step before.', `Ask: how many ${c.groups} does this step have?`],
    simpler: [
      `Step 1: ${c.kept} and ${count(1, c.group, c.groups)}. That is ${c.fixed} plus ${c.per}, or ${stairCount(c, 1)} tiles.`,
      `Step 2: ${c.kept} and ${count(2, c.group, c.groups)}. That is ${c.fixed} plus ${2 * c.per}, or ${stairCount(c, 2)} tiles.`,
      `Step ${n}: ${c.kept} and ${count(n, c.group, c.groups)}. That is ${c.fixed} plus ${n * c.per}, or ${stairCount(c, n)} tiles.`,
    ],
  };
}

/** The wrong numbers a far step invites, each with the condition it breaks and the repair. */
function farWrongs(c: Construction, n: number, unit = 'tiles'): WrongNumber[] {
  const ans = stairCount(c, n);
  const inGroups = c.per * n;
  return [
    {
      value: inGroups,
      tag: c.fixed === 1 ? 'off-by-one' : undefined,
      fb: { headline: `${inGroups} counts the ${c.groups} but leaves out the kept ${c.fixed === 1 ? 'tile' : 'tiles'}.`, detail: [`Step ${n} has ${count(n, c.group, c.groups)}: ${inGroups} ${unit}.`, `The construction keeps ${c.kept} at every step. ${inGroups} plus ${c.fixed} is ${ans}.`] },
    },
    {
      value: stairCount(c, n - 1),
      tag: 'off-by-one',
      fb: { headline: `${stairCount(c, n - 1)} is step ${n - 1}, one step short.`, detail: [`Step ${n - 1} has ${count(n - 1, c.group, c.groups)}. Step ${n} has one more ${c.group}.`, `So step ${n} has ${ans} ${unit}.`] },
    },
    {
      value: stairCount(c, n + 1),
      tag: 'off-by-one',
      fb: { headline: `${stairCount(c, n + 1)} is step ${n + 1}, one step too far.`, detail: [`Step ${n} has ${count(n, c.group, c.groups)}, one for each step.`, `${inGroups} plus ${c.fixed} is ${ans}.`] },
    },
    {
      value: stairCount(c, 1) * n,
      tag: 'add-vs-multiply',
      fb: { headline: `${stairCount(c, 1) * n} is ${n} times ${stairCount(c, 1)}, as if every step grew by all of step 1.`, detail: [`Step 1 has ${stairCount(c, 1)} ${unit}, but step 2 has ${stairCount(c, 2)}, not ${2 * stairCount(c, 1)}.`, `Only the ${c.groups} grow. The kept ${c.fixed === 1 ? 'tile is' : 'tiles are'} counted once: ${ans}.`] },
    },
    {
      value: stairCount(c, 4),
      tag: 'local-only',
      fb: { headline: `${stairCount(c, 4)} is step 4, the next step after the table.`, detail: [`Adding one ${c.group} to step 3 gives step 4. It does not reach step ${n}.`, `Work step ${n} from its number: ${c.kept} and ${count(n, c.group, c.groups)} is ${ans}.`] },
    },
  ];
}

/**
 * A far step from a stated construction (the Do item). `framed`: the faded example, one blank in a sentence frame.
 * The unframed one carries the trap tag (a far step, not the next one).
 */
export function farItem(c: Construction, n: number, o: { framed?: boolean; phase?: Phase; level?: Level } = {}): NumberItem {
  const ans = stairCount(c, n);
  const prompt = o.framed ? `${c.says} Fill in the blank to find the tiles at step ${n}.` : `${c.says} How many tiles at step ${n}?`;
  return numberItem(
    {
      lesson: L1,
      tag: 'stair-far',
      prompt,
      scene: farScene(c, n),
      frame: o.framed ? `Step ${n} has ${c.kept} and ${count(n, c.group, c.groups)}, so it has ___ tiles.` : undefined,
      explain: `Step ${n} has ${c.kept} and ${count(n, c.group, c.groups)}. ${count(n, c.group, c.groups)} is ${c.per * n} tiles. ${c.per * n} plus ${c.fixed} is ${ans}.`,
      teach: stairTeach(c, n),
      hints: [`How many ${c.groups} does step ${n} have?`, `Each ${c.group} is ${c.per} tiles. How many tiles are in the ${c.groups}?`, `Now add the ${keptName(c)}, which ${c.fixed === 1 ? 'stays' : 'stay'} at every step.`],
      hintCase: stepCase(c, 4, 'A worked twin. '),
      phase: o.phase ?? 'do',
      level: o.level ?? (n <= 12 ? 1 : 2),
      tags: o.framed ? undefined : ['far-step'],
      meta: {
        skill: 'Track 2 · a far step from a construction',
        rule: `${c.says} Step n has ${c.fixed} plus ${c.per} times n tiles.`,
        task: o.framed ? 'fill a faded frame for a far step' : 'predict a far step',
        representation: 'tiles in a staircase',
        difficulty: n <= 12 ? 2 : 3,
        twin: `stair-far-${c.id}`,
      },
    },
    ans,
    'tiles',
    farWrongs(c, n),
  );
}

/** Explain: why step n of the center-and-pairs staircase has 1 plus 2 times n tiles, not "it adds 2, so 2 times n". */
export function stairWhyItem(n: number, rng?: Rng): ChooseItem {
  const c = PAIRS;
  const ans = stairCount(c, n);
  return chooseItem(
    {
      lesson: L1,
      tag: 'stair-why',
      prompt: `${c.says} How many tiles does step ${n} have, and why?`,
      scene: farScene(c, n),
      explain: `Step ${n} has 1 center tile and ${n} pairs. ${n} pairs is ${2 * n} tiles, and the center tile makes ${ans}. It fits every step: step 3 has 1 plus 6, which is 7.`,
      teach: stairTeach(c, n),
      hints: ['Look at step 1 in the picture. What stays, and what was added?', `Step ${n} has one pair for each step. How many pairs is that?`, 'A good reason works for every step in the table, not just the next one.'],
      hintCase: stepCase(c, 3, 'A worked twin. '),
      phase: 'explain',
      level: 1,
      rubric: 2,
      meta: {
        skill: 'Track 2 · explain a far step',
        rule: `${c.says} Step n has 1 plus 2 times n tiles.`,
        task: 'choose the reason that fits every step',
        representation: 'tiles in a staircase',
        difficulty: 2,
        alternatives: ['1 center tile plus 2 tiles for each step number', 'step 1 has 3, and each later step adds a jump of 2: 3 plus 2 times (n take away 1)'],
        rubric: '2 = names the kept center tile and one pair per step, and the count fits every step shown',
        twin: 'stair-why',
      },
    },
    { id: 'pairs', label: `${ans}: 1 center tile and ${n} pairs, so 1 plus ${2 * n}.` },
    [
      {
        id: 'adds',
        label: `${2 * n}: it adds 2 each time, so it is ${n} times 2.`,
        tag: 'local-only',
        fb: { headline: 'Adding 2 each time is true, but it only tells you the next step.', detail: [`${n} times 2 counts the pairs and leaves out the center tile. Step 1 already has 3 tiles, not 2.`, `Count from the construction: 1 center tile and ${n} pairs is ${ans}.`] },
      },
      {
        id: 'nocenter',
        label: `${2 * n}: ${n} pairs is ${2 * n} tiles.`,
        tag: 'off-by-one',
        fb: { headline: `${n} pairs is ${2 * n} tiles, but the center tile stays too.`, detail: ['The construction keeps the center tile at every step.', `${2 * n} plus 1 is ${ans}.`] },
      },
      {
        id: 'times',
        label: `${3 * n}: step 1 has 3, so step ${n} has ${n} times 3.`,
        tag: 'add-vs-multiply',
        fb: { headline: 'Step 1 has 3 tiles, but step 2 has 5, not 6.', detail: ['Only the pairs grow. The center tile is counted once, not at every step.', `So step ${n} is 1 center tile and ${n} pairs: ${ans}.`] },
      },
    ],
    rng,
  );
}

/** Contrast: a constant-addition sequence, from term 1 to term n is n take away 1 jumps. */
export function jumpItem(first: number, jump: number, n: number, o: { phase?: Phase; level?: Level } = {}): NumberItem {
  const ans = termAt(first, jump, n);
  const rule = `Use a constant-addition rule: start at ${first}, then add ${jump} each time.`;
  return numberItem(
    {
      lesson: L1,
      tag: 'constant-jump',
      prompt: `Under a constant-addition rule, the first term is ${first} and the jump is ${jump}. What is term ${n}?`,
      scene: sequenceScene(rule, first, jump, 1, n),
      explain: `From term 1 to term ${n} there are ${n - 1} jumps. ${n - 1} jumps of ${jump} is ${(n - 1) * jump}. ${first} plus ${(n - 1) * jump} is ${ans}.`,
      teach: {
        rule: `Under a constant-addition rule, each term adds the same jump. Term ${n} is the first term plus ${n - 1} jumps.`,
        terms: [
          { word: 'A constant-addition rule', meaning: 'a rule that adds the same number each time.' },
          { word: 'The jump', meaning: 'the number added each time.' },
          { word: 'A term', meaning: 'one number in the list. Term 1 is the first one.' },
        ],
        casesTitle: 'Count the jumps',
        cases: [
          { label: `Term 1: ${first}.`, note: 'No jumps yet.' },
          { label: `Term 2: ${first} plus ${jump}.`, note: `1 jump: ${first + jump}.` },
          { label: `Term 3: ${first} plus ${jump} plus ${jump}.`, note: `2 jumps: ${first + 2 * jump}.` },
        ],
        remember: [`Count jumps, not terms: term ${n} has ${n - 1} jumps.`, 'Ask: how many jumps from term 1 to here?'],
        simpler: [`Term 1 is ${first}. No jumps yet.`, `Term 2 is ${first} plus ${jump}, which is ${first + jump}. That is 1 jump.`, `Term 3 is ${first + jump} plus ${jump}, which is ${first + 2 * jump}. That is 2 jumps.`, `So term ${n} has ${n - 1} jumps.`],
      },
      hints: [`How many jumps from term 1 to term ${n}?`, `Term 2 is 1 jump, and term 3 is 2 jumps. So term ${n} is ${n - 1} jumps.`, `Add ${n - 1} jumps of ${jump} to the first term.`],
      hintCase: { label: 'A worked twin: term 4 has 3 jumps.', note: `${first} plus 3 jumps of ${jump} is ${first} plus ${3 * jump}, or ${termAt(first, jump, 4)}.` },
      phase: o.phase ?? 'do',
      level: o.level ?? 2,
      tags: ['far-step'],
      meta: {
        skill: 'Track 2 · a far term under a constant-addition rule',
        rule: `constant-addition rule: start at ${first}, add ${jump} each time`,
        task: 'find a far term',
        representation: 'a list of numbers',
        difficulty: 3,
        twin: 'constant-jump',
      },
    },
    ans,
    '',
    [
      { value: first + n * jump, tag: 'off-by-one', fb: { headline: `${first + n * jump} uses ${n} jumps, one too many.`, detail: [`Term 1 is ${first} with no jump yet. Term 2 is 1 jump, so term ${n} is ${n - 1} jumps.`, `${first} plus ${n - 1} jumps of ${jump} is ${ans}.`] } },
      { value: termAt(first, jump, n - 1), tag: 'off-by-one', fb: { headline: `${termAt(first, jump, n - 1)} is term ${n - 1}, one jump short.`, detail: [`Term ${n} needs ${n - 1} jumps from the first term.`, `${first} plus ${(n - 1) * jump} is ${ans}.`] } },
      { value: n * jump, tag: 'add-vs-multiply', fb: { headline: `${n * jump} is ${n} times ${jump}: it leaves out the first term.`, detail: [`The rule starts at ${first}, not at 0.`, `Start at ${first} and add ${n - 1} jumps of ${jump}: ${ans}.`] } },
      { value: first + jump, tag: 'local-only', fb: { headline: `${first + jump} is only the next term, term 2.`, detail: [`Adding ${jump} once gives term 2. Term ${n} needs ${n - 1} jumps.`, `${first} plus ${(n - 1) * jump} is ${ans}.`] } },
    ],
  );
}

/** A shrinking staircase (L3): step 1 has s tiles and each step takes away one pair. */
export function shrinkItem(s: number, n: number, o: { phase?: Phase } = {}): NumberItem {
  const at = (k: number) => s - 2 * (k - 1);
  const ans = at(n);
  const rule = `Step 1 has ${s} tiles. Each step takes away one pair, which is 2 tiles.`;
  return numberItem(
    {
      lesson: L1,
      tag: 'stair-shrink',
      prompt: `A staircase shrinks. ${rule} How many tiles are left at step ${n}?`,
      scene: sequenceScene(rule, s, 2, -1, n, ['Step', 'Tiles']),
      explain: `From step 1 to step ${n} there are ${n - 1} take-aways. ${n - 1} pairs is ${2 * (n - 1)} tiles. ${s} take away ${2 * (n - 1)} is ${ans}.`,
      teach: {
        rule: `The staircase loses one pair at each step after step 1. So step ${n} has lost ${n - 1} pairs.`,
        terms: [{ word: 'A pair', meaning: '2 tiles.' }, { word: 'A shrinking rule', meaning: 'a rule that takes away the same amount each time.' }],
        casesTitle: 'Count the take-aways',
        cases: [
          { label: `Step 1: ${s} tiles.`, note: 'Nothing taken yet.' },
          { label: `Step 2: ${s} take away 2.`, note: `1 pair gone: ${at(2)}.` },
          { label: `Step 3: ${s} take away 4.`, note: `2 pairs gone: ${at(3)}.` },
        ],
        remember: [`Step ${n} has lost ${n - 1} pairs, not ${n}.`, 'Ask: how many take-aways from step 1 to here?'],
        simpler: [`Step 1 is ${s}.`, `Step 2 is ${s} take away 2, which is ${at(2)}.`, `Step 3 is ${at(2)} take away 2, which is ${at(3)}.`, `So step ${n} has lost ${n - 1} pairs: ${2 * (n - 1)} tiles.`],
      },
      hints: [`How many take-aways from step 1 to step ${n}?`, 'Each take-away is one pair: 2 tiles.', `Take ${2 * (n - 1)} tiles away from ${s}.`],
      hintCase: { label: 'A worked twin: step 4 has lost 3 pairs.', note: `${s} take away 6 is ${at(4)}.` },
      phase: o.phase ?? 'do',
      level: 3,
      tags: ['far-step'],
      meta: {
        skill: 'Track 2 · a far step of a shrinking rule',
        rule: `constant take-away rule: start at ${s}, take away 2 each step`,
        task: 'find a far step of a shrinking staircase',
        representation: 'a table of steps and tiles',
        difficulty: 4,
        twin: 'stair-shrink',
      },
    },
    ans,
    'tiles',
    [
      { value: s - 2 * n, tag: 'off-by-one', fb: { headline: `${s - 2 * n} takes away ${n} pairs, one too many.`, detail: [`Step 1 has lost nothing yet. Step ${n} has lost ${n - 1} pairs.`, `${s} take away ${2 * (n - 1)} is ${ans}.`] } },
      { value: at(n - 1), tag: 'off-by-one', fb: { headline: `${at(n - 1)} is step ${n - 1}, one step short.`, detail: [`Step ${n} loses one more pair than step ${n - 1}.`, `So step ${n} has ${ans}.`] } },
      { value: s - (n - 1), fb: { headline: `${s - (n - 1)} takes away 1 tile per step, but a pair is 2 tiles.`, detail: [`${n - 1} pairs is ${2 * (n - 1)} tiles.`, `${s} take away ${2 * (n - 1)} is ${ans}.`] } },
      { value: at(2), tag: 'local-only', fb: { headline: `${at(2)} is only the next step, step 2.`, detail: [`One take-away gives step 2. Step ${n} needs ${n - 1} take-aways.`, `${s} take away ${2 * (n - 1)} is ${ans}.`] } },
    ],
  );
}

/** Transfer contexts with the same structure: kept pieces plus a group per step. */
export type GrowContext = 'necklace' | 'chairs';

/** The count for a transfer context: a necklace (1 clasp, 2 beads per link) or joined tables (4 seats, 2 per table added). */
export const growCount = (ctx: GrowContext, n: number) => (ctx === 'necklace' ? 1 + 2 * n : 4 + 2 * (n - 1));

function growScene(ctx: GrowContext, n: number): StaircaseScene {
  if (ctx === 'necklace') {
    return {
      kind: 'staircase',
      construction: 'Each link keeps the 1 clasp and adds 2 beads.',
      rows: [1, 2, 3].map((k) => ({ step: k, cells: stairCells(PAIRS, k) })),
      table: askTable((k) => growCount(ctx, k), n),
      head: ['Links', 'Pieces'],
      rowName: ['link', 'links'],
      skin: 'beads',
    };
  }
  const seats = (k: number): StairCell[] => {
    const side: StairCell[] = [];
    for (let j = 1; j <= k; j++) side.push(j === k ? 'new' : 'old', j === k ? 'new' : 'old');
    return ['end', ...side, 'end'];
  };
  return {
    kind: 'staircase',
    construction: 'One table seats 4. Each table you add brings 2 more seats.',
    rows: [1, 2, 3].map((k) => ({ step: k, cells: seats(k) })),
    table: askTable((k) => growCount(ctx, k), n),
    head: ['Tables', 'Seats'],
    rowName: ['table', 'tables'],
    skin: 'seats',
  };
}

/** Transfer: the same structure in new materials, a bead necklace or seats at joined tables. */
export function growTransferItem(ctx: GrowContext, n: number, o: { phase?: Phase; level?: Level } = {}): NumberItem {
  const ans = growCount(ctx, n);
  const neck = ctx === 'necklace';
  const unit = neck ? 'pieces' : 'seats';
  const wrong: WrongNumber[] = neck
    ? [
        { value: 2 * n, tag: 'off-by-one', fb: { headline: `${2 * n} counts the beads but not the clasp.`, detail: [`${n} links bring ${2 * n} beads.`, `The 1 clasp stays too: ${2 * n} plus 1 is ${ans}.`] } },
        { value: 3 * n, tag: 'add-vs-multiply', fb: { headline: `${3 * n} gives every link 3 pieces, but only 2 beads come with each link.`, detail: ['The clasp is counted once, not once per link.', `${2 * n} beads plus 1 clasp is ${ans}.`] } },
        { value: growCount(ctx, n - 1), tag: 'off-by-one', fb: { headline: `${growCount(ctx, n - 1)} is ${n - 1} links, one link short.`, detail: [`${n} links bring ${n} pairs of beads.`, `${2 * n} plus 1 is ${ans}.`] } },
      ]
    : [
        { value: 4 * n, tag: 'add-vs-multiply', fb: { headline: `${4 * n} gives every table 4 seats, but joined tables share their ends.`, detail: ['Only the first table brings 4 seats. Each table after it brings 2.', `4 plus ${n - 1} tables of 2 is ${ans}.`] } },
        { value: growCount(ctx, n - 1), tag: 'off-by-one', fb: { headline: `${growCount(ctx, n - 1)} is ${n - 1} tables, one table short.`, detail: [`After the first table, ${n - 1} more tables bring 2 seats each.`, `4 plus ${2 * (n - 1)} is ${ans}.`] } },
        { value: 4 + 2 * n, tag: 'off-by-one', fb: { headline: `${4 + 2 * n} adds 2 seats for all ${n} tables, one table too many.`, detail: ['The first table already has its 4 seats.', `Only ${n - 1} tables add 2 seats: ${ans}.`] } },
      ];
  return numberItem(
    {
      lesson: L1,
      tag: 'grow-transfer',
      prompt: neck
        ? `A necklace has 1 clasp, and each link adds 2 beads. The clasp stays. How many pieces, beads and clasp, does a necklace with ${n} links have?`
        : `Square tables are pushed together in a row. One table seats 4, and each table you add brings 2 more seats. How many seats around ${n} tables?`,
      scene: growScene(ctx, n),
      explain: neck
        ? `${n} links bring ${n} pairs of beads: ${2 * n} beads. Add the 1 clasp: ${ans} pieces.`
        : `The first table has 4 seats. ${n - 1} more tables bring 2 seats each: ${2 * (n - 1)}. 4 plus ${2 * (n - 1)} is ${ans} seats.`,
      teach: {
        rule: neck ? 'The clasp stays, and each link adds 2 beads. It is the staircase rule with new things.' : 'The first table brings 4 seats, and each table after it brings 2. The end seats are shared.',
        terms: neck ? [{ word: 'A clasp', meaning: 'the hook that closes the necklace. There is only one.' }] : [{ word: 'Joined tables', meaning: 'tables pushed together in a row, so no one sits between them.' }],
        casesTitle: neck ? 'Count clasp and beads' : 'Count the seats',
        cases: [1, 2, 3].map((k) => ({ label: neck ? `${count(k, 'link', 'links')}: 1 clasp and ${2 * k} beads.` : `${count(k, 'table', 'tables')}: ${growCount(ctx, k)} seats.`, note: neck ? `${growCount(ctx, k)} pieces.` : k === 1 ? 'One table seats 4.' : `4 plus ${2 * (k - 1)} is ${growCount(ctx, k)}.` })),
        remember: [neck ? 'Count the kept piece once, then the groups.' : 'The first table is 4. Each table after it adds 2.', 'Ask: what stays, and what grows each time?'],
        simpler: neck
          ? ['1 link: 1 clasp and 2 beads, 3 pieces.', '2 links: 1 clasp and 4 beads, 5 pieces.', `${n} links: 1 clasp and ${2 * n} beads, ${ans} pieces.`]
          : ['1 table: 4 seats.', '2 tables: 4 plus 2, which is 6 seats.', `${n} tables: 4 plus ${n - 1} times 2, which is ${ans} seats.`],
      },
      hints: neck
        ? ['What stays the same, and what grows with each link?', `${n} links bring how many beads?`, 'Add the 1 clasp.']
        : ['How many seats does one table have?', `How many tables come after the first one? Each brings 2 seats.`, `Add those seats to 4.`],
      hintCase: neck ? { label: 'A worked twin: 4 links.', note: '1 clasp and 8 beads is 9 pieces.' } : { label: 'A worked twin: 4 tables.', note: '4 plus 3 tables of 2 is 10 seats.' },
      phase: o.phase ?? 'transfer',
      level: o.level ?? 2,
      meta: {
        skill: 'Track 2 · the same growth rule in a new setting',
        rule: neck ? 'each link keeps the 1 clasp and adds 2 beads: 1 plus 2 times n' : 'one table seats 4, each table added brings 2: 4 plus 2 times (n take away 1)',
        task: 'predict a far step in a new setting',
        representation: neck ? 'a bead necklace' : 'seats at joined tables',
        difficulty: 3,
        twin: `grow-${ctx}`,
      },
    },
    ans,
    unit,
    wrong,
  );
}

/** Diagnostic, Track 2 L1: the next term under a stated constant-addition rule. */
export function nextTermItem(first: number, jump: number): NumberItem {
  const terms = [0, 1, 2, 3].map((k) => first + k * jump);
  const ans = first + 4 * jump;
  const rule = `Use a constant-addition rule: start at ${first}, then add ${jump} each time.`;
  return numberItem(
    {
      lesson: L1,
      tag: 'constant-jump',
      prompt: `Use a constant-addition rule. The terms go ${terms.join(', ')}. What is the next term?`,
      scene: { kind: 'staircase', construction: rule, tag: 'Rule', rows: [], table: [...terms.map((t, k) => ({ step: k + 1, count: t })), { step: 5, count: null }], head: ['Term', 'Value'], jump: `add ${jump}` },
      explain: `Each term adds ${jump}. ${terms[3]} plus ${jump} is ${ans}.`,
      teach: {
        rule: 'A constant-addition rule adds the same jump each time.',
        terms: [{ word: 'The jump', meaning: 'the number added each time.' }],
        cases: [{ label: `${terms[0]} plus ${jump} is ${terms[1]}.`, note: 'The jump fits.' }],
        remember: ['Find the jump, then add it to the last term.'],
        simpler: [`${terms[2]} plus ${jump} is ${terms[3]}.`, `So the next term is ${terms[3]} plus ${jump}, or ${ans}.`],
      },
      hints: ['What is added each time?', `Add ${jump} to the last term.`],
      hintCase: { label: `A worked twin: ${terms[1]} plus ${jump} is ${terms[2]}.`, note: 'That is the jump.' },
      phase: 'do',
      level: 1,
      meta: { skill: 'Track 2 · the next term', rule: `constant-addition rule: start at ${first}, add ${jump} each time`, task: 'find the next term', representation: 'a list of numbers', difficulty: 1, twin: 'next-term' },
    },
    ans,
    '',
    [
      { value: terms[3] + 1, tag: 'local-only', fb: { headline: `${terms[3] + 1} adds 1, but the jump is ${jump}.`, detail: [`${terms[0]} to ${terms[1]} is a jump of ${jump}.`, `${terms[3]} plus ${jump} is ${ans}.`] } },
      { value: ans + jump, tag: 'off-by-one', fb: { headline: `${ans + jump} is two terms on, not the next one.`, detail: [`The next term is one jump after ${terms[3]}: ${ans}.`] } },
    ],
  );
}

// ======================================================================================================
// See (key-idea cards) and Do (guided boards)
// ======================================================================================================

const PAIR_TABLE = (upTo: number) => [1, 2, 3, 4].slice(0, upTo).map((k) => ({ step: k, count: stairCount(PAIRS, k) }));

/** Card 1's picture: steps 1 to 4 built one at a time, the new pair glowing, the table filling in, then every step checked. */
export const STAIR_BUILD: StaircaseScene = {
  ...stairScene(PAIRS, [1, 2, 3, 4], PAIR_TABLE(4), { reveal: [{ rows: 1, table: 1 }, { rows: 2, table: 2 }, { rows: 3, table: 3 }, { rows: 4, table: 4 }, { rows: 4, table: 4 }] }),
  steps: [
    { label: 'Build step 2', say: 'Step 2 keeps the center tile and the first pair. One new pair glows: 5 tiles.' },
    { label: 'Build step 3', say: 'Step 3 keeps all 5 tiles and adds one new pair: 7 tiles.' },
    { label: 'Build step 4', say: 'Step 4 adds one more pair: 9 tiles. Each step adds 2 tiles.' },
    { label: 'Check every step', say: 'Check each row: 1 center tile and one pair per step. 3, 5, 7 and 9 all fit.' },
  ],
};

/** Card 2's picture: jump straight to step 10 from its step number. */
export const STAIR_TEN: StaircaseScene = {
  ...stairScene(PAIRS, [1, 2, 3], [...PAIR_TABLE(3), { step: 10, count: 21 }], { reveal: [{ rows: 3, table: 3 }, { rows: 3, table: 3 }, { rows: 3, table: 3 }, { rows: 3, table: 4 }, { rows: 3, table: 4 }] }),
  steps: [
    { label: 'Count the pairs', say: 'Step 10 has 10 pairs: one pair for each step.' },
    { label: 'Count their tiles', say: '10 pairs is 20 tiles.' },
    { label: 'Add the center', say: 'Add the 1 center tile: step 10 has 21 tiles.' },
    { label: 'Check a small step', say: 'Check step 3: 3 pairs is 6 tiles, plus 1 is 7. The table says 7.' },
  ],
};

/** Card 3's picture: the jumps way to step 10 agrees with the pairs way. */
export const STAIR_JUMPS: StaircaseScene = {
  kind: 'staircase',
  construction: PAIRS.says,
  rows: [],
  table: [...PAIR_TABLE(4), { step: 10, count: 21 }],
  jump: 'add 2',
  reveal: [{ rows: 0, table: 4 }, { rows: 0, table: 4 }, { rows: 0, table: 4 }, { rows: 0, table: 5 }],
  steps: [
    { label: 'Count the jumps', say: 'From step 1 to step 10 there are 9 jumps, not 10.' },
    { label: 'Add them up', say: '9 jumps of 2 is 18 tiles.' },
    { label: 'Start at step 1', say: 'Step 1 has 3 tiles. 3 plus 18 is 21. The pairs way said 21 too.' },
  ],
};

/** Card 4's picture: a constant-addition list, start 5 and add 3; term 10 is nine jumps on. */
export const JUMP_CARD: StaircaseScene = {
  ...sequenceScene('Use a constant-addition rule: start at 5, then add 3 each time.', 5, 3, 1, 10),
  table: [{ step: 1, count: 5 }, { step: 2, count: 8 }, { step: 3, count: 11 }, { step: 10, count: termAt(5, 3, 10) }],
  reveal: [{ rows: 0, table: 3 }, { rows: 0, table: 3 }, { rows: 0, table: 3 }, { rows: 0, table: 4 }, { rows: 0, table: 4 }],
  steps: [
    { label: 'Read the rule', say: 'Term 1 is 5. Every term adds a jump of 3.' },
    { label: 'Count the jumps', say: 'From term 1 to term 10 there are 9 jumps, not 10.' },
    { label: 'Add the jumps', say: '9 jumps of 3 is 27. 5 plus 27 is 32, so term 10 is 32.' },
    { label: 'Check term 3', say: 'Term 3 is 2 jumps: 5 plus 6 is 11. The table says 11. It fits.' },
  ],
};

export function growthIdeas(): IdeaCard[] {
  return [
    {
      title: 'A stated construction',
      scene: STAIR_BUILD,
      body: [
        'This pattern is constructed: its rule is stated. “Each step keeps the center tile and adds one pair.”',
        'Watch it grow. The new pair glows, and the table fills in.',
        'Because the rule is stated, you can work out any step. You are not guessing.',
      ],
    },
    {
      title: 'Jump to step 10',
      scene: STAIR_TEN,
      body: [
        'You do not need steps 4 to 9 to find step 10.',
        'Count its pairs, find their tiles, then add the center tile. In words: the tiles equal 1 plus 2 times the step number.',
      ],
    },
    {
      title: 'Next is not far',
      scene: STAIR_JUMPS,
      body: [
        '“It adds 2 each time” is true. But it only gives the next step.',
        'To reach step 10 from step 1, count the jumps. There is one jump fewer than the step number.',
        'Saying “it adds 2, so step 10 is 20” forgets that step 1 starts at 3.',
      ],
    },
    {
      title: 'A constant-addition rule',
      scene: JUMP_CARD,
      body: [
        'A constant-addition rule adds the same jump each time. A term is one number in the list.',
        'Term 10 is the first term plus 9 jumps. Count the jumps, not the terms.',
      ],
    },
    {
      title: 'Proved, not guessed',
      body: [
        'Every pattern here comes with its rule stated. So a far step is proved: the rule says so.',
        'If you only saw 3, 5, 7 with no rule, 9 would be a good guess to test. It would not be sure.',
        'Before you predict, ask: is the rule stated, or am I guessing from a few steps?',
      ],
    },
  ];
}

/** Board 1 (full scaffold): card 1's staircase. Step 4 is shown; mark steps 5, 8 and 12 from the construction. */
export function stairBoard(id: string): DrillStep {
  const c = PAIRS;
  const mark = (n: number) =>
    numberMark(`${id}-s${n}`, 'Tiles', stairCount(c, n), [
      { value: 2 * n, why: `${2 * n} is the ${n} pairs alone. Add the center tile: ${stairCount(c, n)}.` },
      { value: stairCount(c, n + 1), why: `${stairCount(c, n + 1)} is step ${n + 1}. Step ${n} has ${n} pairs: ${2 * n} tiles, plus the center tile, is ${stairCount(c, n)}.` },
    ]);
  return {
    id,
    title: 'Fill the table',
    body: ['This is the staircase from the example. Step 4 is filled in for you.', 'Use the construction for each step: count the pairs, double, then add the center tile.'],
    scene: STAIR_BUILD,
    afterCard: 0,
    scaffold: 'full',
    steps: ['Count the pairs: one for each step.', 'Each pair is 2 tiles.', 'Add the 1 center tile.'],
    stepsLabel: 'The construction, step by step',
    rows: [
      { id: 'r4', label: 'Step 4', marks: [givenMark(`${id}-s4`, 'Tiles', '9', ['8', '11'])], note: '4 pairs is 8 tiles, plus the center tile: 9.' },
      { id: 'r5', label: 'Step 5', marks: [mark(5)] },
      { id: 'r8', label: 'Step 8', marks: [mark(8)] },
      {
        id: 'r12',
        label: 'Step 12',
        marks: [
          numberMark(`${id}-p12`, 'Pairs', 12, [{ value: 11, why: '11 pairs is step 11. The construction adds one pair per step, so step 12 has 12 pairs.' }]),
          mark(12),
        ],
      },
    ],
    done: 'Right. Each step has 1 center tile and one pair per step. Step 12 has 12 pairs, so 25 tiles.',
  };
}

/** Board 2 (light): a twin of card 4 with a new start and jump. Count the jumps, then find term 8. */
export function jumpBoard(id: string): DrillStep {
  const first = 4, jump = 5, n = 8;
  const ans = termAt(first, jump, n);
  return {
    id,
    title: 'Count the jumps',
    body: ['A new list under a constant-addition rule: start at 4, then add 5 each time.', 'Mark the jumps from term 1 to term 8, then term 8 itself.'],
    scene: sequenceScene('Use a constant-addition rule: start at 4, then add 5 each time.', first, jump, 1, n),
    twin: 'A twin of the example: the list starts at 4 and the jump is 5.',
    rows: [
      { id: 'g3', label: 'Term 3', marks: [givenMark(`${id}-j3`, 'Jumps from term 1', '2', ['3'])], note: '2 jumps: 4 plus 10 is 14.' },
      {
        id: 'g8',
        label: 'Term 8',
        marks: [
          numberMark(`${id}-j8`, 'Jumps from term 1', 7, [{ value: 8, why: 'Term 1 has no jump yet. Term 2 is 1 jump, so term 8 is 7 jumps.' }]),
          numberMark(`${id}-t8`, 'Value', ans, [
            { value: first + n * jump, why: `${first + n * jump} uses 8 jumps. Term 8 is 7 jumps: 4 plus 35 is ${ans}.` },
            { value: n * jump, why: `${n * jump} is 8 times 5, and it leaves out the start. Start at 4 and add 7 jumps of 5: ${ans}.` },
          ]),
        ],
      },
    ],
    done: `Right. Term 8 is 7 jumps from term 1: 4 plus 35 is ${ans}.`,
  };
}
