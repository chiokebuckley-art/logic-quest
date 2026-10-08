/**
 * Ring 1 of the Pattern Observatory, First Lights (Track 1, repetition and structure): chains made by repeating a block.
 *
 *  Star Chain   the unit is the shortest block that fits every piece; extend a chain; find any position
 *  Repair Bench a chain meant to repeat a stated block: find the break (all the way to the end), fix it; is a chain
 *               made by repeating a block at all?
 *  Echo Bells   the same structure in new pieces (colors, bells, claps, letters, moves, a timetable)
 *
 * Everything is computed from the token list: the unit (the shortest block that fits), the piece at position n
 * (piece ((n − 1) mod k) + 1 of the unit), the break against a stated block, whether any block repeats, and the
 * structure of a block (A for the first kind of piece, B for the next new kind, …). Items are plain data; every wrong
 * choice has its own feedback, every item a hint sequence with a worked twin, its metadata and its error tags.
 */
import { syncWhyWrong } from '../../teach';
import type { ChainFrame, ChainScene } from '../../scenes/chain';
import type { ChainToken } from '../../scenes/common';
import type { Choice, ChoiceFeedback, ChooseItem, ErrorTag, Item, ItemMeta, NumberItem, Phase, Rng, Teach, TeachCase } from '../../types';

export const STOP = 14;
export const L1 = 's14.l1';
export const L2 = 's14.l2';
export const L3 = 's14.l3';

// ---------- the math: computed from the token list ----------

/** A chain of n pieces made by repeating `unit` (indices into a skin's pieces). */
export const build = (unit: readonly number[], n: number): number[] => Array.from({ length: n }, (_, i) => unit[i % unit.length]);

/** The piece the unit puts at position n (1-based): piece ((n − 1) mod k) + 1 of the unit. */
export const atPosition = (unit: readonly number[], n: number): number => unit[(n - 1) % unit.length];

/** Whole blocks before position n and the piece of the unit it lands on (1-based): n − 1 = q·k + r, piece r + 1. */
export const splitPosition = (k: number, n: number) => ({ q: Math.floor((n - 1) / k), r: (n - 1) % k, piece: ((n - 1) % k) + 1 });

/** The first index where repeating the first `len` pieces fails, or -1 when that block fits every piece. */
export function firstMiss(seq: readonly unknown[], len: number): number {
  for (let i = len; i < seq.length; i++) if (seq[i] !== seq[i - len]) return i;
  return -1;
}

/** Repeating the first `len` pieces gives every piece of the chain. */
export const blockFits = (seq: readonly unknown[], len: number): boolean => len >= 1 && len <= seq.length && firstMiss(seq, len) < 0;

/** The unit: the shortest block that fits every piece (the whole chain when nothing shorter fits). */
export function shortestBlock(seq: readonly unknown[]): number {
  for (let p = 1; p <= seq.length; p++) if (blockFits(seq, p)) return p;
  return seq.length;
}

/** Made by repeating a block: some block fits every piece and fits at least twice. */
export const repeatsBlock = (seq: readonly unknown[]): boolean => shortestBlock(seq) * 2 <= seq.length;

/** Against a stated unit: the first index whose piece is not the one the unit puts there, or -1. */
export const breakAgainst = (seq: readonly number[], unit: readonly number[]): number => seq.findIndex((x, i) => x !== unit[i % unit.length]);

/** The structure of a block: the first kind of piece is A, the next new kind B, then C ("clap, tap, tap" is "ABB"). */
export function structureOf(seq: readonly unknown[]): string {
  const names = new Map<unknown, string>();
  return seq.map((x) => {
    if (!names.has(x)) names.set(x, 'ABCDEFG'[names.size]);
    return names.get(x)!;
  }).join('');
}

/** A structure string as unit indices: "ABB" is [0, 1, 1]. */
export const unitOf = (s: string): number[] => [...s].map((c) => c.charCodeAt(0) - 65);

export type Pattern = 'AB' | 'ABB' | 'ABC' | 'AABB';
export const PATTERNS: Record<Pattern, readonly number[]> = { AB: [0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2], AABB: [0, 0, 1, 1] };
export const PATTERN_IDS = Object.keys(PATTERNS) as Pattern[];

/** The block families for matching: same pieces, different structures. Every one is a primitive block. */
export const FAMILIES: readonly (readonly string[])[] = [
  ['ABB', 'AAB', 'ABA'],
  ['AABB', 'ABBA', 'ABBB'],
  ['ABC', 'ABA', 'ABB'],
];
export const familyOf = (s: string): readonly string[] => FAMILIES.find((f) => f[0] === s) ?? FAMILIES.find((f) => f.includes(s))!;

/** The patterns a skin can draw: a two-kind skin (high and low bells) has no ABC. */
export const patternsFor = (kinds: number, from: readonly Pattern[] = PATTERN_IDS): Pattern[] => from.filter((p) => new Set(PATTERNS[p]).size <= kinds);

const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const uniq = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

// ---------- skins: the same structure in different pieces ----------

export type SkinId = 'shapes' | 'colors' | 'letters' | 'abc' | 'sounds' | 'bells' | 'rota' | 'chores' | 'moves' | 'timetable' | 'beads';

/** One kind of piece: its token (drawn and read aloud by its label) and how a sentence names it ("a triangle"). */
export interface Piece {
  token: ChainToken;
  a: string;
}

/** A set of pieces and the words that go with it. pieces[0] is A, pieces[1] is B, pieces[2] is C. */
export interface Skin {
  id: SkinId;
  pieces: Piece[];
  /** The chain's name, as a sentence's subject: "This chain", "This beat", "The fish rota". */
  chain: string;
  /** A spot in the chain: "position", "beat", "day"; and the word before it: "in position 3", "on day 3". */
  pos: string;
  prep: string;
  piece: string;
  pieces_: string;
  /** A story line before a transfer prompt. */
  intro?: string;
  /** meta.representation */
  rep: string;
  /** A new material or context (sounds, a rota, moves, a timetable, a necklace), not just a new color. */
  transfer: boolean;
}

const shapeP = (shape: 'triangle' | 'circle' | 'square', color: 'red' | 'blue' | 'yellow'): Piece => ({ token: { shape, color, label: shape }, a: `a ${shape}` });
const colorP = (color: 'red' | 'blue' | 'yellow'): Piece => ({ token: { shape: 'circle', color, label: color }, a: color });
const wordP = (label: string, a = label): Piece => ({ token: { label }, a });
const LETTER_SETS = [['K', 'M', 'P'], ['S', 'T', 'R'], ['D', 'G', 'N'], ['F', 'H', 'L']] as const;
export const NAMES = ['Ava', 'Ben', 'Cal', 'Dee', 'Kai', 'Lia', 'Max', 'Mia', 'Sam', 'Zoe'] as const;

const SKIN_BASE: Record<SkinId, Omit<Skin, 'id' | 'pieces'> & { make(rng?: Rng): Piece[] }> = {
  shapes: { chain: 'This chain', pos: 'position', prep: 'in', piece: 'piece', pieces_: 'pieces', rep: 'shape cards', transfer: false, make: () => [shapeP('triangle', 'yellow'), shapeP('circle', 'blue'), shapeP('square', 'red')] },
  colors: { chain: 'This chain', pos: 'position', prep: 'in', piece: 'piece', pieces_: 'pieces', rep: 'colors', transfer: false, make: () => [colorP('red'), colorP('blue'), colorP('yellow')] },
  letters: {
    chain: 'This chain', pos: 'position', prep: 'in', piece: 'piece', pieces_: 'pieces', rep: 'letters', transfer: false,
    make: (rng) => [...(rng ? rng.pick(LETTER_SETS) : LETTER_SETS[0])].map((l) => ({ token: { letter: l, label: l }, a: l })),
  },
  abc: { chain: 'This chain', pos: 'position', prep: 'in', piece: 'piece', pieces_: 'pieces', rep: 'letters A, B and C', transfer: false, make: () => ['A', 'B', 'C'].map((l) => ({ token: { letter: l, label: l }, a: l })) },
  sounds: {
    chain: 'This beat', pos: 'beat', prep: 'on', piece: 'sound', pieces_: 'sounds', intro: 'A drummer plays a beat, one sound at a time.', rep: 'sounds with captions', transfer: true,
    make: () => (['clap', 'tap', 'stomp'] as const).map((s) => ({ token: { sound: s, label: s }, a: `a ${s}` })),
  },
  bells: {
    chain: 'This tune', pos: 'note', prep: 'on', piece: 'bell', pieces_: 'bells', intro: 'A tune is played on a high bell and a low bell.', rep: 'high and low bells with captions', transfer: true,
    make: () => (['high', 'low'] as const).map((s) => ({ token: { sound: s, letter: s, label: `${s} bell` }, a: `a ${s} bell` })),
  },
  rota: {
    chain: 'The fish rota', pos: 'day', prep: 'on', piece: 'name', pieces_: 'names', intro: 'Each school day, one kid feeds the class fish.', rep: 'a desk rota of names', transfer: true,
    make: (rng) => (rng ? rng.shuffle(NAMES).slice(0, 3) : NAMES.slice(0, 3)).map((n) => wordP(n)),
  },
  chores: {
    chain: 'The dish chart', pos: 'day', prep: 'on', piece: 'name', pieces_: 'names', intro: 'Each night, one kid in a family dries the dishes.', rep: 'a weekly chore chart of names', transfer: true,
    make: (rng) => (rng ? rng.shuffle(NAMES).slice(0, 3) : NAMES.slice(3, 6)).map((n) => wordP(n)),
  },
  moves: {
    chain: 'This dance', pos: 'step', prep: 'on', piece: 'move', pieces_: 'moves', intro: 'A gym class warms up with a dance.', rep: 'dance moves with captions', transfer: true,
    make: () => ['jump', 'spin', 'hop'].map((m) => wordP(m, `a ${m}`)),
  },
  timetable: {
    chain: 'This timetable', pos: 'day', prep: 'on', piece: 'class', pieces_: 'classes', intro: 'A class has one special class each school day.', rep: 'a class timetable', transfer: true,
    make: () => ['Art', 'Gym', 'Music'].map((c) => wordP(c)),
  },
  beads: {
    chain: 'This necklace', pos: 'spot', prep: 'in', piece: 'bead', pieces_: 'beads', intro: 'A necklace has its beads in a row.', rep: 'a bead necklace', transfer: true,
    make: () => (['red', 'blue', 'yellow'] as const).map((c) => ({ token: { shape: 'circle' as const, color: c, label: `${c} bead` }, a: `a ${c} bead` })),
  },
};

/** The skins a Do item uses (new colors or shapes are not transfer); the transfer skins of each place. */
export const BASE_SKINS: readonly SkinId[] = ['shapes', 'colors', 'letters'];
export const STAR_TRANSFER: readonly SkinId[] = ['sounds', 'rota'];
export const REPAIR_TRANSFER: readonly SkinId[] = ['beads', 'chores'];
export const ECHO_FROM: readonly SkinId[] = ['colors', 'sounds', 'bells'];
export const ECHO_TRANSFER: readonly SkinId[] = ['moves', 'timetable'];

/** A skin's pieces in a fixed order (cards and boards), or shuffled from the rng (items). */
export function makeSkin(id: SkinId, rng?: Rng): Skin {
  const { make, ...words } = SKIN_BASE[id];
  const pieces = make(rng);
  // Letters A, B, C keep their order: A is always the first kind of piece.
  return { id, ...words, pieces: rng && id !== 'abc' ? rng.shuffle(pieces) : pieces };
}

/** A chain: its skin, the stated (or true) unit, and the pieces shown (indices into the skin). */
export interface ChainModel {
  skin: Skin;
  unit: number[];
  seq: number[];
}

export const modelOf = (skin: Skin, unit: readonly number[], n: number): ChainModel => ({ skin, unit: [...unit], seq: build(unit, n) });
export const tokensOf = (m: Pick<ChainModel, 'skin' | 'seq'>): ChainToken[] => m.seq.map((i) => ({ ...m.skin.pieces[i].token }));

// ---------- words ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lbl = (s: Skin, i: number) => s.pieces[i].token.label;
const an = (s: Skin, i: number) => s.pieces[i].a;
export const listOf = (s: Skin, idx: readonly number[]) => idx.map((i) => lbl(s, i)).join(', ');
export const unitText = (m: ChainModel) => listOf(m.skin, m.unit);
export const blockText = (m: ChainModel, len: number) => listOf(m.skin, m.seq.slice(0, len));
const at = (s: Skin, p: number) => `${s.prep} ${s.pos} ${p}`;
const Pos = (s: Skin, p: number) => `${cap(s.pos)} ${p}`;
const pos = (s: Skin, p: number) => `${s.pos} ${p}`;
const chainL = (s: Skin) => (s.chain.startsWith('This') ? `this ${s.chain.slice(5)}` : `the ${s.chain.slice(4)}`);
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
/** "A, B, B" */
export const lettersOf = (s: string) => [...s].join(', ');
const intro = (s: Skin, phase: Phase) => (phase === 'transfer' && s.intro ? `${s.intro} ` : '');

/** The count in words: "Take one away from 14: 13. That is 4 whole blocks of 3, with 1 left over. Add one: piece 2 of the unit." */
export function countLine(k: number, p: number): string {
  const { q, r, piece } = splitPosition(k, p);
  return `Take one away from ${p}: ${p - 1}. That is ${plural(q, 'whole block', 'whole blocks')} of ${k}, with ${r} left over. Add one: piece ${piece} of the unit.`;
}

/** The stated line of a constructed chain. */
export const madeLine = (s: Skin) => `${s.chain} is made by repeating a block.`;
export const meantLine = (m: ChainModel) => `${m.skin.chain} is meant to repeat the block ${unitText(m)}.`;
export const seenLine = (s: Skin) => `Nobody says how ${chainL(s)} was made.`;

// ---------- item plumbing ----------

interface Spec {
  lesson: string;
  skill: string;
  phase: Phase;
  level: 1 | 2;
  twin: string;
  metaSkill: string;
  rule: string;
  task: string;
  rep: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  rubric?: { level: 0 | 1 | 2 | 3; text: string };
}

interface Parts {
  prompt: string;
  scene: ChainScene;
  explain: string;
  teach: Teach;
  hints: string[];
  hintCase: TeachCase;
  errorTags?: Record<string, ErrorTag>;
  frame?: string;
  tags?: string[];
}

function metaOf(spec: Spec, answerType: ItemMeta['answerType'], errorTags: Record<string, ErrorTag>): ItemMeta {
  return {
    skill: spec.metaSkill,
    rule: spec.rule,
    task: spec.task,
    representation: spec.rep,
    difficulty: spec.difficulty,
    answerType,
    ...(spec.rubric ? { rubric: spec.rubric.text } : {}),
    tags: uniq(Object.values(errorTags)),
    twin: spec.twin,
    phase: spec.phase,
  };
}

function common(spec: Spec, p: Parts, answerType: ItemMeta['answerType']) {
  const errorTags = p.errorTags ?? {};
  return {
    id: '',
    stop: STOP,
    lesson: spec.lesson,
    skill: spec.skill,
    prompt: p.prompt,
    scene: p.scene,
    explain: p.explain,
    teach: p.teach,
    hint: p.hints[0],
    hints: p.hints,
    hintCase: p.hintCase,
    phase: spec.phase,
    level: spec.level,
    twin: spec.twin,
    errorTags,
    meta: metaOf(spec, answerType, errorTags),
    ...(p.frame ? { frame: p.frame } : {}),
    ...(p.tags?.length ? { tags: p.tags } : {}),
    ...(spec.rubric ? { rubric: spec.rubric.level } : {}),
  };
}

function chooseItem(rng: Rng, spec: Spec, p: Parts, choices: Choice[], answer: string, feedback: Record<string, ChoiceFeedback>): ChooseItem {
  const item: ChooseItem = { kind: 'choose', ...common(spec, p, 'categorical'), choices: rng.shuffle(choices), answer, feedback };
  return syncWhyWrong(item);
}

/** Choices with a fixed order (positions, block lengths, letter chains read best in order). */
function chooseOrdered(spec: Spec, p: Parts, choices: Choice[], answer: string, feedback: Record<string, ChoiceFeedback>): ChooseItem {
  const item: ChooseItem = { kind: 'choose', ...common(spec, p, 'categorical'), choices, answer, feedback };
  return syncWhyWrong(item);
}

const pieceChoices = (s: Skin, idx: readonly number[]): Choice[] => uniq(idx).sort((a, b) => a - b).map((i) => ({ id: `pc${i}`, label: lbl(s, i) }));
const pieceOf = (id: string) => Number(id.slice(2));

const FIT_WORDS = { truth: 'fits', untruth: 'breaks' } as const;
const YES_WORDS = { truth: 'yes', untruth: 'no' } as const;

/** A worked case: repeat the first `len` pieces and see where the block breaks. */
function breakCase(m: ChainModel, len: number): TeachCase {
  const s = m.skin;
  const miss = firstMiss(m.seq, len);
  const p = miss + 1;
  return {
    label: `Repeat “${blockText(m, len)}”: ${listOf(s, build(m.seq.slice(0, len), p))}.`,
    truths: [{ who: `${Pos(s, p)} fits`, value: false }],
    words: YES_WORDS,
    note: `${Pos(s, p)} is ${an(s, m.seq[miss])}, not ${an(s, m.seq[miss % len])}.`,
  };
}

/** Which blocks fit, for a teach card: each length with whether it fits every piece and where it breaks. */
function blockCases(m: ChainModel, lengths: readonly number[]): TeachCase[] {
  const s = m.skin;
  const k = shortestBlock(m.seq);
  return lengths.map((L) => {
    const fits = blockFits(m.seq, L);
    const miss = firstMiss(m.seq, L);
    return {
      label: `A block of ${L}: ${blockText(m, L)}.`,
      truths: [{ who: `Fits every ${s.piece}`, value: fits }],
      words: YES_WORDS,
      note: fits ? (L === k ? 'It is the shortest block that fits. It is the unit.' : `It fits, but a block of ${k} fits too and is shorter.`) : `It breaks ${at(s, miss + 1)}.`,
    };
  });
}

const UNIT_TERMS = (s: Skin) => [
  { word: 'A block', meaning: `some ${s.pieces_} in a row, from the start of the chain.` },
  { word: 'The unit', meaning: 'the shortest block that repeats all the way.' },
  { word: cap(s.pos), meaning: `the spot of a ${s.piece}. The first ${s.piece} is ${s.pos} 1.` },
];

function teachUnit(m: ChainModel): Teach {
  const k = shortestBlock(m.seq);
  const lengths = uniq([...range(1, Math.min(k, 4)), ...(2 * k <= m.seq.length ? [2 * k] : [])]);
  return {
    rule: `The unit is the shortest block that fits every ${m.skin.piece} of the chain.`,
    terms: UNIT_TERMS(m.skin),
    casesTitle: 'Which blocks fit this chain?',
    cases: blockCases(m, lengths),
    remember: ['The unit is the shortest block that fits every piece.', 'Ask: does my block fit every spot, all the way to the end?'],
    simpler: ['Look at red, blue, red, blue.', 'Try red alone. Position 2 would be red, but it is blue.', 'Try red, blue. It fits all four pieces.', 'So red, blue is the unit.'],
  };
}

/** A worked twin for a hint: a chain in other pieces, with which blocks fit. */
function unitTwin(rng: Rng, avoid: SkinId): { line: string; kase: TeachCase } {
  const skin = makeSkin(rng.pick(BASE_SKINS.filter((x) => x !== avoid)), rng);
  const pattern = rng.pick(['AB', 'ABB', 'AABB'] as const);
  const unit = PATTERNS[pattern];
  const k = unit.length;
  const m = modelOf(skin, unit, Math.max(2 * k, 6));
  const short = k - 1;
  const miss = firstMiss(m.seq, short);
  return {
    line: `A twin: ${listOf(skin, m.seq)}. A block of ${short} breaks at position ${miss + 1}${short > 1 ? ', and shorter blocks break too' : ''}. A block of ${k} fits every piece, so it is the unit.`,
    kase: {
      label: `A twin chain: ${listOf(skin, m.seq)}.`,
      truths: [{ who: `A block of ${short}`, value: false }, { who: `A block of ${k}`, value: true }],
      words: FIT_WORDS,
      note: `The shortest block that fits is the unit: ${unitText(m)}.`,
    },
  };
}

/** A worked twin for a position hint. */
function positionTwin(rng: Rng, avoid: SkinId): { line: string; kase: TeachCase } {
  const skin = makeSkin(rng.pick(BASE_SKINS.filter((x) => x !== avoid)), rng);
  const unit = PATTERNS[rng.pick(['AB', 'ABB'] as const)];
  const k = unit.length;
  const m = modelOf(skin, unit, 2 * k);
  const p = rng.int(2 * k + 2, 12);
  const ans = atPosition(unit, p);
  const other = unit.find((x) => x !== ans)!;
  const { q, r, piece } = splitPosition(k, p);
  return {
    line: `A twin: ${listOf(skin, m.seq)}. Its unit is ${unitText(m)}. For position ${p}, take one away: ${p - 1}. That is ${q} blocks of ${k}, with ${r} left. Add one: piece ${piece}, ${lbl(skin, ans)}.`,
    kase: {
      label: `A twin chain: ${listOf(skin, m.seq)}. Find position ${p}.`,
      truths: [{ who: `Position ${p} is ${lbl(skin, ans)}`, value: true }, { who: `Position ${p} is ${lbl(skin, other)}`, value: false }],
      words: YES_WORDS,
      note: `${p - 1} is ${q} blocks of ${k}, with ${r} left. Add one: piece ${piece}.`,
    },
  };
}

const ruleLine = (pattern: string, m: ChainModel) => `repeat the block ${pattern} (${unitText(m)}); the first ${m.skin.piece} is ${m.skin.pos} 1, and ${m.skin.pos} n holds piece ((n − 1) mod ${m.unit.length}) + 1 of the unit`;
const levelOf = (pattern: string): 1 | 2 => (pattern === 'AB' ? 1 : 2);

// ---------- Star Chain (s14.l1) ----------

export interface StarOpts {
  skin?: SkinId;
  pattern?: Pattern;
  phase?: Phase;
  lesson?: string;
}

/** Explain: why the first one or two pieces are not the unit (the right reason tests the block against a position). */
export function unitWhyItem(rng: Rng, o: StarOpts = {}): ChooseItem {
  const phase = o.phase ?? 'explain';
  const pattern = o.pattern ?? rng.pick(['ABB', 'ABC', 'AABB'] as const);
  const unit = PATTERNS[pattern];
  const k = unit.length;
  const L = k === 2 ? 1 : 2;
  const skin = makeSkin(o.skin ?? rng.pick(BASE_SKINS), rng);
  // The chain ends on a piece the tried block does not end with, so "the chain ends with …" never excuses the block.
  const ns = range(Math.max(2 * k, 6), 9).filter((n) => build(unit, n)[n - 1] !== unit[L - 1]);
  const m = modelOf(skin, unit, rng.pick(ns));
  const s = skin;
  const miss = firstMiss(m.seq, L);
  const p = miss + 1;
  const exp = m.seq[miss % L];
  const act = m.seq[miss];
  const last = m.seq[m.seq.length - 1];
  const block = blockText(m, L);
  const twin = unitTwin(rng, s.id);
  const feedback: Record<string, ChoiceFeedback> = {
    longest: {
      headline: 'The unit is the shortest block that fits, not the longest.',
      detail: [`Longer blocks can fit too. The unit is the shortest one that fits every ${s.piece}.`, `The block “${block}” is short, but it does not fit. It breaks ${at(s, p)}.`],
      example: breakCase(m, L),
    },
    ends: {
      headline: 'Where a chain stops tells you nothing about its unit.',
      detail: ['A chain can stop in the middle of a block.', `Check each spot instead. “${block}” breaks ${at(s, p)}.`],
      example: breakCase(m, L),
    },
  };
  return chooseItem(
    rng,
    {
      lesson: o.lesson ?? L1, skill: 's14.unit-why', phase, level: levelOf(pattern), twin: 's14.l1.unit-why', metaSkill: 'Track 1 · why a block is not the unit',
      rule: ruleLine(pattern, m), task: 'explain why a block is not the unit', rep: s.rep, difficulty: 2,
      rubric: { level: 2, text: '2 = tests the block against a spot and finds where it breaks; 1 = a reason about one spot or the end only; 0 = no rule' },
    },
    {
      prompt: `${intro(s, phase)}${madeLine(s)} Why is “${block}” not its unit?`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(s) },
      explain: `Repeat “${block}” and check every spot. It puts ${an(s, exp)} ${at(s, p)}, but ${pos(s, p)} is ${an(s, act)}. So the block breaks there. The unit is ${unitText(m)}.`,
      teach: teachUnit(m),
      hints: ['Repeat the block under the chain, one piece at a time.', `Does the block fit ${pos(s, p)}?`, twin.line],
      hintCase: twin.kase,
      errorTags: { longest: 'oversized-unit', ends: 'copy-last' },
    },
    [
      { id: 'fits', label: `Repeating that block would put ${an(s, exp)} ${at(s, p)}, but ${pos(s, p)} is ${an(s, act)}.` },
      { id: 'longest', label: 'The unit is always the longest block that repeats.' },
      { id: 'ends', label: `The chain ends with ${an(s, last)}, so the unit must end with ${an(s, last)} too.` },
    ],
    'fits',
    feedback,
  );
}

export interface PositionOpts extends StarOpts {
  /** 'blank': the faded item (the unit boxed, one spot blank, a sentence frame); 'next': the next piece; 'far': a spot past the end. */
  ask: 'blank' | 'next' | 'far';
}

/** Do: which piece goes at a position. Computed as piece ((p − 1) mod k) + 1 of the unit. */
export function positionItem(rng: Rng, o: PositionOpts): ChooseItem {
  const phase = o.phase ?? 'do';
  const pattern = o.pattern ?? rng.pick(PATTERN_IDS);
  const unit = PATTERNS[pattern];
  const k = unit.length;
  const skin = makeSkin(o.skin ?? rng.pick(BASE_SKINS), rng);
  const s = skin;
  const n = o.ask === 'blank' ? rng.int(Math.max(2 * k + 1, 6), 9) : o.ask === 'next' ? rng.int(Math.max(2 * k, 5), 9) : rng.int(Math.max(2 * k, 5), 8);
  const m = modelOf(skin, unit, n);
  const b = o.ask === 'blank' ? rng.int(k, n - 1) : -1;
  const p = o.ask === 'blank' ? b + 1 : o.ask === 'next' ? n + 1 : n + rng.int(3, 8);
  const ans = atPosition(unit, p);
  const { piece } = splitPosition(k, p);
  const lastShown = m.seq[n - 1];
  const choices = pieceChoices(s, unit);
  const errorTags: Record<string, ErrorTag> = {};
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of choices) {
    const w = pieceOf(c.id);
    if (w === ans) continue;
    const copy = o.ask !== 'blank' && w === lastShown;
    const near = w === atPosition(unit, p - 1) || w === atPosition(unit, p + 1);
    if (copy) errorTags[c.id] = 'copy-last';
    else if (near) errorTags[c.id] = 'off-by-one';
    feedback[c.id] = {
      headline: copy ? `${cap(an(s, w))} copies the last ${s.piece}. The chain goes on with its unit.` : `${cap(an(s, w))} is not what the unit puts ${at(s, p)}.`,
      detail: [
        `The unit is ${unitText(m)}. It is ${k} ${s.pieces_} long.`,
        countLine(k, p),
        `Piece ${piece} of the unit is ${an(s, ans)}.`,
        ...(near && !copy ? [`${cap(an(s, w))} belongs one spot over. ${cap(s.pos)} 1 is the first ${s.piece}.`] : []),
      ],
      example: {
        label: `Count in blocks of ${k}, up to ${pos(s, p)}.`,
        truths: [{ who: `${Pos(s, p)} is ${lbl(s, ans)}`, value: true }, { who: `${Pos(s, p)} is ${lbl(s, w)}`, value: false }],
        words: YES_WORDS,
        note: `${p - 1} is ${plural(splitPosition(k, p).q, 'block', 'blocks')} of ${k}, with ${splitPosition(k, p).r} left. Add one: piece ${piece}.`,
      },
    };
  }
  const twin = positionTwin(rng, s.id);
  const ask =
    o.ask === 'blank' ? `The box shows its unit. Which ${s.piece} goes ${at(s, p)}?` : o.ask === 'next' ? `Which ${s.piece} comes next, ${at(s, p)}?` : `Which ${s.piece} goes ${at(s, p)}?`;
  const scene: ChainScene = { kind: 'chain', tokens: tokensOf(m), stated: madeLine(s), ...(o.ask === 'blank' ? { unit: { start: 0, len: k }, blanks: [b] } : {}) };
  return chooseOrdered(
    {
      lesson: o.lesson ?? L1, skill: 's14.extend', phase, level: levelOf(pattern), twin: 's14.l1.extend',
      metaSkill: o.ask === 'far' ? 'Track 1 · predict a far position' : 'Track 1 · extend a chain',
      rule: ruleLine(pattern, m), task: o.ask === 'blank' ? 'fill a position (faded)' : o.ask === 'next' ? 'extend a chain' : 'predict a far position', rep: s.rep,
      difficulty: o.ask === 'blank' ? 1 : o.ask === 'next' ? 2 : 3,
    },
    {
      prompt: `${intro(s, phase)}${madeLine(s)} ${ask}`,
      scene,
      explain: `The unit is ${unitText(m)}. ${countLine(k, p)} Piece ${piece} is ${an(s, ans)}.`,
      teach: {
        rule: 'In a chain made by repeating a block, the unit decides every spot. Count whole units, then read the piece.',
        terms: [...UNIT_TERMS(s).slice(1), { word: 'Left over', meaning: 'what is still to count after the whole blocks.' }],
        casesTitle: 'Where each piece of the unit lands',
        cases: unit.map((u, j) => ({ label: `Piece ${j + 1}, ${lbl(s, u)}: ${s.pos}s ${j + 1}, ${j + 1 + k}, ${j + 1 + 2 * k} and so on.` })),
        remember: ['Find the unit. Then count whole blocks.', 'Ask: which piece of the unit lands on my spot?'],
        simpler: ['Take red, blue, red, blue.', 'The unit is red, blue. It is 2 pieces long.', 'Odd spots are red. Even spots are blue.', 'So position 7 is red.'],
      },
      hints: [`Find the unit first. How many ${s.pieces_} long is it?`, `Take one away from ${p}. Then count whole blocks of ${k}.`, twin.line],
      hintCase: twin.kase,
      errorTags,
      ...(o.ask === 'blank' ? { frame: `The unit is ${unitText(m)}, so ${pos(s, p)} is ___.` } : {}),
    },
    choices,
    `pc${ans}`,
    feedback,
  );
}

/** The tag every Star Chain pack's trap item carries (LessonDef.pass include). */
export const LONGER_BLOCK = { tag: 'longer-block', label: 'a chain where a longer block also repeats' } as const;

export interface UnitOpts extends StarOpts {
  /** A longer block that also fits is one of the choices (the trap: tag oversized-unit). */
  trap?: boolean;
}

/** Do: box the shortest unit. The choices are blocks from the start; a longer block that also fits is the trap. */
export function unitItem(rng: Rng, o: UnitOpts = {}): ChooseItem {
  const phase = o.phase ?? 'do';
  const trap = o.trap ?? true;
  const pattern = o.pattern ?? rng.pick(['AB', 'ABB', 'ABC', 'AABB'] as const);
  const unit = PATTERNS[pattern];
  const k = unit.length;
  const skin = makeSkin(o.skin ?? rng.pick(BASE_SKINS), rng);
  const s = skin;
  const n = k === 2 ? 8 : k === 3 ? 9 : rng.int(8, 9);
  const m = modelOf(skin, unit, n);
  const breaks = range(1, 5).filter((L) => L !== k && L <= n && !blockFits(m.seq, L)).sort((a, b) => Math.abs(a - k) - Math.abs(b - k) || a - b);
  // A shorter block that breaks is always a choice, so "pick the shortest choice" never stands in for checking every piece.
  const shorter = breaks.filter((L) => L < k);
  const first = shorter.length ? [rng.pick(shorter)] : [];
  const rest = rng.shuffle(breaks.slice(0, 3).filter((L) => !first.includes(L)));
  const wrong = trap ? [2 * k, ...first, ...rest.slice(0, rng.int(0, 1))] : [...first, ...rest.slice(0, rng.int(1, 2))];
  const lengths = uniq([k, ...wrong]).sort((a, b) => a - b);
  const label = (L: number) => (L === 1 ? `The first ${s.piece}` : `The first ${L} ${s.pieces_}`);
  const errorTags: Record<string, ErrorTag> = {};
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const L of lengths) {
    if (L === k) continue;
    const id = `len${L}`;
    if (blockFits(m.seq, L)) {
      errorTags[id] = 'oversized-unit';
      feedback[id] = {
        headline: `The first ${L} ${s.pieces_} fit, but that block is not the shortest.`,
        detail: [`The first ${k} fit every ${s.piece} too, and that block is shorter.`, `The unit is the shortest block that fits: ${unitText(m)}.`],
        example: {
          label: `The first ${L}: ${blockText(m, L)}.`,
          truths: [{ who: `A block of ${L}`, value: true }, { who: `A block of ${k}`, value: true }],
          words: FIT_WORDS,
          note: 'Both fit. The shorter one is the unit.',
        },
      };
    } else {
      const miss = firstMiss(m.seq, L);
      feedback[id] = {
        headline: `${L === 1 ? `The first ${s.piece} breaks` : `The first ${L} ${s.pieces_} break`} the chain ${at(s, miss + 1)}.`,
        detail: [`Repeat ${blockText(m, L)}. ${Pos(s, miss + 1)} would be ${an(s, m.seq[miss % L])}, but it is ${an(s, m.seq[miss])}.`, `The unit is ${unitText(m)}. It fits every ${s.piece}.`],
        example: breakCase(m, L),
      };
    }
  }
  const twin = unitTwin(rng, s.id);
  const p1 = firstMiss(m.seq, 1) + 1;
  return chooseOrdered(
    {
      lesson: o.lesson ?? L1, skill: 's14.unit', phase, level: levelOf(pattern), twin: 's14.l1.unit', metaSkill: 'Track 1 · shortest unit',
      rule: ruleLine(pattern, m), task: 'box the shortest unit', rep: s.rep, difficulty: trap ? 3 : 2,
    },
    {
      prompt: `${intro(s, phase)}${madeLine(s)} Which block is its unit?`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(s) },
      explain: `The first ${k} ${s.pieces_} fit every ${s.piece}: ${unitText(m)}. Shorter blocks break. A longer block can fit too, but the unit is the shortest block that fits.`,
      teach: teachUnit(m),
      hints: [`Compare the first two ${s.pieces_} with the next two.`, `Try a short block first. Does it fit ${pos(s, p1)}?`, twin.line],
      hintCase: twin.kase,
      errorTags,
      tags: trap ? [LONGER_BLOCK.tag] : [],
    },
    lengths.map((L) => ({ id: `len${L}`, label: label(L) })),
    `len${k}`,
    feedback,
  );
}

/** Do or transfer: how many pieces long is the unit (the number pad). Near misses: shorter blocks break, longer ones fit. */
export function unitLengthItem(rng: Rng, o: StarOpts = {}): NumberItem {
  const phase = o.phase ?? 'do';
  const pattern = o.pattern ?? rng.pick(PATTERN_IDS);
  const unit = PATTERNS[pattern];
  const k = unit.length;
  const skin = makeSkin(o.skin ?? rng.pick(BASE_SKINS), rng);
  const s = skin;
  const m = modelOf(skin, unit, rng.int(Math.max(2 * k, 6), 9));
  const n = m.seq.length;
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const L of uniq([...range(1, k + 1), 2 * k, n]).filter((x) => x !== k && x <= n)) {
    if (blockFits(m.seq, L)) {
      errorTags[String(L)] = 'oversized-unit';
      feedback[String(L)] = {
        headline: `A block of ${L} fits, but it is not the shortest.`,
        detail: [`A block of ${k} fits every ${s.piece} too: ${unitText(m)}.`, 'The unit is the shortest block that fits.'],
      };
    } else {
      const miss = firstMiss(m.seq, L);
      feedback[String(L)] = {
        headline: `A block of ${L} breaks ${at(s, miss + 1)}.`,
        detail: [`Repeat ${blockText(m, L)}. ${Pos(s, miss + 1)} would be ${an(s, m.seq[miss % L])}, but it is ${an(s, m.seq[miss])}.`, `The unit is ${unitText(m)}: ${k} ${s.pieces_}.`],
        example: breakCase(m, L),
      };
    }
  }
  const twin = unitTwin(rng, s.id);
  const shorter = range(1, k - 1).map((L) => `A block of ${L} breaks ${at(s, firstMiss(m.seq, L) + 1)}.`);
  const item: NumberItem = {
    kind: 'number',
    ...common(
      {
        lesson: o.lesson ?? L1, skill: 's14.unit', phase, level: levelOf(pattern), twin: 's14.l1.unit', metaSkill: 'Track 1 · shortest unit',
        rule: ruleLine(pattern, m), task: 'find the length of the shortest unit', rep: s.rep, difficulty: 3,
      },
      {
        prompt: `${intro(s, phase)}${madeLine(s)} How many ${s.pieces_} long is its unit?`,
        scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(s) },
        explain: `Try short blocks first. ${shorter.join(' ')} A block of ${k} fits every ${s.piece}: ${unitText(m)}. So the unit is ${k} ${s.pieces_} long.`,
        teach: teachUnit(m),
        hints: [`Compare the first two ${s.pieces_} with the next two.`, `Try a block of ${k - 1}. Does it fit every ${s.piece}?`, twin.line],
        hintCase: twin.kase,
        errorTags,
      },
      'number',
    ),
    answer: k,
    digits: 1,
    unit: s.pieces_,
    feedback,
  };
  return syncWhyWrong(item);
}

// ---------- Repair Bench (s14.l2) ----------

/** The tag every Repair Bench pack's trap item carries: the break is in the last block. */
export const NEAR_END = { tag: 'near-end', label: 'a break near the end of the chain' } as const;

export interface RepairOpts {
  skin?: SkinId;
  pattern?: Pattern;
  phase?: Phase;
  /** The break is in the last block (the trap: a learner who stops checking early misses it). */
  nearEnd?: boolean;
}

/** A chain meant to repeat a stated unit, with one piece changed. `b` is the index of the break. */
export interface Broken extends ChainModel {
  b: number;
  pattern: Pattern;
}

export function brokenChain(rng: Rng, o: RepairOpts = {}): Broken {
  const pattern = o.pattern ?? rng.pick(['ABC', 'AB', 'ABB', 'AABB'] as const);
  const unit = PATTERNS[pattern];
  const k = unit.length;
  const skin = makeSkin(o.skin ?? rng.pick(BASE_SKINS), rng);
  const n = rng.int(Math.max(2 * k + 1, 6), 9);
  const b = o.nearEnd ? rng.int(n - k, n - 1) : rng.int(k, n - k - 1);
  const seq = build(unit, n);
  // The new piece is one of the other kinds the chain uses (a square for a circle), so the break is not a stranger.
  seq[b] = rng.pick(uniq(unit).filter((x) => x !== seq[b]));
  return { skin, unit: [...unit], seq, b, pattern };
}

/** The blocks of a chain against its unit: their spots (1-based) and whether each matches. */
export function blocksOf(m: Broken): { j: number; s: number; e: number; ok: boolean }[] {
  const k = m.unit.length;
  return range(0, Math.ceil(m.seq.length / k) - 1).map((j) => {
    const s = j * k + 1;
    const e = Math.min(m.seq.length, (j + 1) * k);
    return { j: j + 1, s, e, ok: m.b < s - 1 || m.b > e - 1 };
  });
}

const blockOfBreak = (m: Broken) => Math.floor(m.b / m.unit.length) + 1;

function repairCase(m: Broken): TeachCase {
  const s = m.skin;
  const blk = blockOfBreak(m);
  const k = m.unit.length;
  const span = m.seq.slice((blk - 1) * k, blk * k);
  return {
    label: `Block ${blk}, ${s.pos}s ${(blk - 1) * k + 1} to ${(blk - 1) * k + span.length}: ${listOf(s, span)}.`,
    truths: [{ who: 'Matches the unit', value: false }],
    words: YES_WORDS,
    note: `${Pos(s, m.b + 1)} should be ${an(s, m.unit[m.b % k])}, not ${an(s, m.seq[m.b])}.`,
  };
}

function teachRepair(m: Broken): Teach {
  const s = m.skin;
  return {
    rule: 'When a chain is meant to repeat a block, check each piece against the block. Go block by block, all the way to the end.',
    terms: [
      { word: 'The rule', meaning: 'the block we are told the chain should repeat.' },
      { word: 'A break', meaning: 'a piece that is not what the block puts there.' },
    ],
    casesTitle: 'Block by block',
    cases: blocksOf(m).map((x) => ({
      label: `Block ${x.j}, ${s.pos}s ${x.s} to ${x.e}: ${listOf(s, m.seq.slice(x.s - 1, x.e))}.`,
      truths: [{ who: 'Matches the unit', value: x.ok }],
      words: YES_WORDS,
      ...(x.ok ? {} : { note: `${Pos(s, m.b + 1)} should be ${an(s, m.unit[m.b % m.unit.length])}.` }),
    })),
    remember: ['Check every block, even the last one.', 'Ask: does each piece match the block, all the way to the end?'],
    simpler: ['The rule: red, blue, again and again.', 'The chain: red, blue, red, blue, red, red.', 'Block 3 is red, red. Its second piece should be blue.', 'So position 6 breaks the rule.'],
  };
}

/** A worked twin for a repair hint: a short chain in other pieces, broken in its last block. */
function repairTwin(rng: Rng, avoid: SkinId): { line: string; kase: TeachCase } {
  const skin = makeSkin(rng.pick(BASE_SKINS.filter((x) => x !== avoid)), rng);
  const unit = [0, 1];
  const seq = build(unit, 6);
  seq[5] = 0;
  const m: Broken = { skin, unit, seq, b: 5, pattern: 'AB' };
  return {
    line: `A twin, meant to repeat ${unitText(m)}: ${listOf(skin, seq)}. Blocks 1 and 2 match. In block 3, position 6 should be ${lbl(skin, 1)}, so it breaks there.`,
    kase: {
      label: `A twin, meant to repeat ${unitText(m)}: ${listOf(skin, seq)}.`,
      truths: blocksOf(m).map((x) => ({ who: `Block ${x.j}`, value: x.ok })),
      words: { truth: 'matches', untruth: 'breaks' },
      note: `Position 6 should be ${lbl(skin, 1)}. The break is the last piece.`,
    },
  };
}

const repairRule = (m: Broken) => `meant to repeat the block ${m.pattern} (${unitText(m)}); one piece is changed; the first ${m.skin.piece} is ${m.skin.pos} 1`;
const okBlocks = (blk: number) => (blk <= 1 ? '' : blk === 2 ? 'Block 1 matches the unit. ' : blk === 3 ? 'Blocks 1 and 2 match the unit. ' : `Blocks 1 to ${blk - 1} match the unit. `);

/** Explain: is the chain right all the way? The right reason names the spot and what the unit puts there. */
export function repairWhyItem(rng: Rng, o: RepairOpts = {}): ChooseItem {
  const phase = o.phase ?? 'explain';
  const m = brokenChain(rng, { ...o, nearEnd: o.nearEnd ?? true });
  const s = m.skin;
  const k = m.unit.length;
  const exp = m.unit[m.b % k];
  const act = m.seq[m.b];
  const blk = blockOfBreak(m);
  // A spot that matches the unit but differs from the piece before it: the neighbor reason picks it.
  const e = range(1, m.b - 1).filter((i) => m.seq[i] !== m.seq[i - 1] && i !== m.b);
  const ei = e.find((i) => i >= k) ?? e[0];
  const twin = repairTwin(rng, s.id);
  return chooseItem(
    rng,
    {
      lesson: L2, skill: 's14.repair-why', phase, level: 2, twin: 's14.l2.repair-why', metaSkill: 'Track 1 · explain a break',
      rule: repairRule(m), task: 'explain whether a chain keeps its stated rule', rep: s.rep, difficulty: 2,
      rubric: { level: 2, text: '2 = names the spot and what the unit puts there; 1 = checks only the start or a neighbor; 0 = no rule' },
    },
    {
      prompt: `${intro(s, phase)}${meantLine(m)} Is it right all the way? Pick the best reason.`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: meantLine(m) },
      explain: `Check each block against the unit. ${okBlocks(blk)}In block ${blk}, ${pos(s, m.b + 1)} should be ${an(s, exp)}, but it is ${an(s, act)}. So the chain breaks the rule.`,
      teach: teachRepair(m),
      hints: [`Check one block at a time: ${s.pos}s 1 to ${k}, then ${k + 1} to ${2 * k}.`, 'Did you check the last block too?', twin.line],
      hintCase: twin.kase,
      errorTags: { start: 'error-near-end', neighbor: 'local-only' },
    },
    [
      { id: 'unit', label: `No. The unit puts ${an(s, exp)} ${at(s, m.b + 1)}, but it is ${an(s, act)}.` },
      { id: 'start', label: 'Yes. The first block matches the unit, so the rest is right too.' },
      { id: 'neighbor', label: `No. ${Pos(s, ei + 1)} is not the same as the ${s.piece} before it.` },
    ],
    'unit',
    {
      start: {
        headline: 'The first block matching does not make the rest right.',
        detail: ['A break can hide near the end. Check every block.', `In block ${blk}, ${pos(s, m.b + 1)} should be ${an(s, exp)}, but it is ${an(s, act)}.`],
        example: repairCase(m),
      },
      neighbor: {
        headline: `${Pos(s, ei + 1)} fits the rule. Being different from its neighbor is fine.`,
        detail: [`The unit puts ${an(s, m.seq[ei])} ${at(s, ei + 1)}, and that is what is there.`, `Compare each ${s.piece} with the unit, not with the ${s.piece} before it.`, `${Pos(s, m.b + 1)} is the one that breaks the rule.`],
        example: repairCase(m),
      },
    },
  );
}

/** Do (the trap when nearEnd): which spot breaks the stated rule. "None" is a choice; missing a late break is tagged. */
export function findItem(rng: Rng, o: RepairOpts = {}): ChooseItem {
  const phase = o.phase ?? 'do';
  const nearEnd = o.nearEnd ?? true;
  const m = brokenChain(rng, { ...o, nearEnd });
  const s = m.skin;
  const k = m.unit.length;
  const exp = m.unit[m.b % k];
  const act = m.seq[m.b];
  const blk = blockOfBreak(m);
  const before = m.b; // the spot just before the break (1-based)
  const looks = range(1, m.b - 2).filter((i) => m.seq[i] !== m.seq[i - 1]);
  const local = looks.length ? rng.pick(looks) : -1;
  const spots = uniq([m.b + 1, before, ...(local >= 0 ? [local + 1] : [])]).sort((a, b) => a - b);
  const choices: Choice[] = [...spots.map((p) => ({ id: `pos${p}`, label: Pos(s, p) })), { id: 'none', label: 'None: it repeats all the way' }];
  const errorTags: Record<string, ErrorTag> = { [`pos${before}`]: 'off-by-one', ...(local >= 0 ? { [`pos${local + 1}`]: 'local-only' as const } : {}), ...(nearEnd ? { none: 'error-near-end' as const } : {}) };
  const feedback: Record<string, ChoiceFeedback> = {
    none: {
      headline: nearEnd ? `A ${s.piece} near the end breaks the rule.` : `One ${s.piece} breaks the rule.`,
      detail: [`Check every block, all the way to the last ${s.piece}.`, `In block ${blk}, ${pos(s, m.b + 1)} should be ${an(s, exp)}, but it is ${an(s, act)}.`],
      example: repairCase(m),
    },
    [`pos${before}`]: {
      headline: `${Pos(s, before)} fits the rule.`,
      detail: [`The unit puts ${an(s, m.seq[before - 1])} there, and that is what is there.`, `The break is one spot later, ${at(s, m.b + 1)}.`],
      example: repairCase(m),
    },
  };
  if (local >= 0) {
    feedback[`pos${local + 1}`] = {
      headline: `${Pos(s, local + 1)} fits the rule.`,
      detail: [`It is not the same as the ${s.piece} before it. That is fine: the unit says so.`, `Check each ${s.piece} against the unit, not against its neighbor.`, `${Pos(s, m.b + 1)} is the one that breaks it.`],
    };
  }
  const twin = repairTwin(rng, s.id);
  return chooseOrdered(
    {
      lesson: L2, skill: 's14.repair-find', phase, level: 2, twin: 's14.l2.repair-find', metaSkill: 'Track 1 · find a break',
      rule: repairRule(m), task: 'find the break', rep: s.rep, difficulty: nearEnd ? 3 : 2,
    },
    {
      prompt: `${intro(s, phase)}${meantLine(m)} Check every block. Which ${s.pos} breaks the rule?`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: meantLine(m) },
      explain: `Check block by block. ${okBlocks(blk)}In block ${blk}, ${pos(s, m.b + 1)} should be ${an(s, exp)}, but it is ${an(s, act)}.`,
      teach: teachRepair(m),
      hints: [`Check one block at a time: ${s.pos}s 1 to ${k}, then ${k + 1} to ${2 * k}.`, 'Did you check the last block too?', twin.line],
      hintCase: twin.kase,
      errorTags,
      tags: nearEnd ? [NEAR_END.tag] : [],
    },
    choices,
    `pos${m.b + 1}`,
    feedback,
  );
}

/** Do: which piece belongs where the break is. Framed (the faded item): the break is flagged and the sentence has a blank. */
export function fixItem(rng: Rng, o: RepairOpts & { framed?: boolean } = {}): ChooseItem {
  const phase = o.phase ?? 'do';
  const m = brokenChain(rng, o);
  const s = m.skin;
  const k = m.unit.length;
  const exp = m.unit[m.b % k];
  const act = m.seq[m.b];
  const { piece } = splitPosition(k, m.b + 1);
  const choices = pieceChoices(s, uniq([...m.unit, act]));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of choices) {
    const w = pieceOf(c.id);
    if (w === exp) continue;
    feedback[c.id] = {
      headline: w === act ? `${cap(an(s, w))} is the ${s.piece} there now. It is the one that breaks the rule.` : `${cap(an(s, w))} does not fit ${pos(s, m.b + 1)} either.`,
      detail: [`${Pos(s, m.b + 1)} is piece ${piece} of its block.`, `Piece ${piece} of the unit is ${an(s, exp)}. So ${an(s, exp)} belongs there.`],
      example: repairCase(m),
    };
  }
  const twin = repairTwin(rng, s.id);
  const prompt = o.framed
    ? `${meantLine(m)} ${Pos(s, m.b + 1)} breaks the rule. Which ${s.piece} belongs there?`
    : `${meantLine(m)} One ${s.piece} breaks the rule. Which ${s.piece} belongs in its place?`;
  return chooseOrdered(
    {
      lesson: L2, skill: 's14.repair-fix', phase, level: 2, twin: 's14.l2.repair-fix', metaSkill: 'Track 1 · fix a break',
      rule: repairRule(m), task: o.framed ? 'fix a break (faded)' : 'fix a break', rep: s.rep, difficulty: o.framed ? 1 : 2,
    },
    {
      prompt: `${intro(s, phase)}${prompt}`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: meantLine(m), ...(o.framed ? { broken: m.b } : {}) },
      explain: `${o.framed ? '' : `The break is ${at(s, m.b + 1)}. `}${Pos(s, m.b + 1)} is piece ${piece} of its block. Piece ${piece} of the unit is ${an(s, exp)}, so ${an(s, exp)} belongs there.`,
      teach: teachRepair(m),
      hints: [o.framed ? `Which piece of its block is ${pos(s, m.b + 1)}?` : `Find the break first. Check one block at a time.`, `Take one away from ${m.b + 1}. Then count whole blocks of ${k}.`, twin.line],
      hintCase: twin.kase,
      ...(o.framed ? { frame: `The unit puts ___ ${at(s, m.b + 1)}.` } : {}),
    },
    choices,
    `pc${exp}`,
    feedback,
  );
}

/** A chain that starts like a repeat and then no block of up to half its length fits (it is not made by repeating). */
export function notRepeating(rng: Rng, skin: Skin): number[] {
  for (let tries = 0; tries < 400; tries++) {
    const kinds = skin.pieces.length >= 3 && rng.chance(0.4) ? 3 : 2;
    const k = rng.pick([2, 3]);
    const unit = k === 2 ? [0, 1] : kinds === 3 ? [0, 1, 2] : rng.pick([[0, 1, 1], [0, 0, 1]]);
    const n = rng.int(7, 8);
    const seq = build(unit, 2 * k);
    while (seq.length < n) seq.push(rng.int(0, kinds - 1));
    const counts = range(0, kinds - 1).map((x) => seq.filter((y) => y === x).length);
    if (!repeatsBlock(seq) && counts.every((c) => c >= 2)) return seq;
  }
  return [0, 1, 0, 1, 1, 0, 0, 1];
}

/** Do: can this chain be made by repeating a block? No for a chain where every block breaks (tag not-repeating). */
export function repeatOrNotItem(rng: Rng, o: { skin?: SkinId; phase?: Phase; answer?: 'yes' | 'no' } = {}): ChooseItem {
  const phase = o.phase ?? 'do';
  const answer = o.answer ?? (rng.chance(0.6) ? 'no' : 'yes');
  const skin = makeSkin(o.skin ?? rng.pick(BASE_SKINS), rng);
  const s = skin;
  let m: ChainModel;
  let pattern = '';
  if (answer === 'no') m = { skin, unit: [], seq: notRepeating(rng, skin) };
  else {
    const pt = rng.pick(PATTERN_IDS);
    pattern = pt;
    m = modelOf(skin, PATTERNS[pt], rng.int(Math.max(2 * PATTERNS[pt].length, 6), 9));
  }
  const n = m.seq.length;
  const k = shortestBlock(m.seq);
  const tries = range(1, Math.floor(n / 2));
  const lines = tries.filter((L) => !blockFits(m.seq, L)).map((L) => `A block of ${L} breaks ${at(s, firstMiss(m.seq, L) + 1)}.`);
  const twinSkin = makeSkin(rng.pick(BASE_SKINS.filter((x) => x !== s.id)), rng);
  const twinSeq = [0, 1, 1, 0, 0];
  const twinLine = `A twin: ${listOf(twinSkin, twinSeq)}. A block of 1 breaks at position 2. A block of 2 breaks at position 3. No block fits, so it does not repeat.`;
  const feedback: Record<string, ChoiceFeedback> =
    answer === 'no'
      ? {
          yes: {
            headline: 'No block repeats all the way in this chain.',
            detail: [`The start may look like a repeat. Check every ${s.pos}.`, ...lines],
            example: { label: `${cap(listOf(s, m.seq))}.`, truths: tries.map((L) => ({ who: `A block of ${L}`, value: blockFits(m.seq, L) })), words: FIT_WORDS, note: 'Every block breaks somewhere.' },
          },
        }
      : {
          no: {
            headline: `A block of ${k} repeats all the way.`,
            detail: [`Repeat ${blockText(m, k)}. It fits every ${s.pos}, from 1 to ${n}.`, 'So this chain can be made by repeating that block.'],
            example: { label: `${cap(listOf(s, m.seq))}.`, truths: [{ who: `A block of ${k}`, value: true }], words: FIT_WORDS, note: `${cap(blockText(m, k))}, again and again.` },
          },
        };
  return chooseOrdered(
    {
      lesson: L2, skill: 's14.is-repeat', phase, level: 2, twin: 's14.l2.is-repeat', metaSkill: 'Track 1 · repeating or not',
      rule: answer === 'no' ? 'a chain seen with no stated rule; no block of up to half its length fits every piece' : `a chain seen with no stated rule; the block ${pattern} (${blockText(m, k)}) fits every piece`,
      task: 'decide whether a chain is made by repeating a block', rep: s.rep, difficulty: answer === 'no' ? 3 : 2,
    },
    {
      prompt: `${intro(s, phase)}${seenLine(s)} Look at every ${s.piece}. Can it be made by repeating a block?`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: seenLine(s) },
      explain:
        answer === 'no'
          ? `Try every block short enough to fit twice. ${lines.join(' ')} No block fits every ${s.piece}, so this chain is not made by repeating a block.`
          : `The block ${blockText(m, k)} fits every ${s.piece}, from ${pos(s, 1)} to ${pos(s, n)}. So a block repeats all the way.`,
      teach: {
        rule: 'A chain is made by repeating a block when one block fits every piece. The block must fit at least twice.',
        terms: UNIT_TERMS(s).slice(0, 1),
        casesTitle: 'Try each block',
        cases: blockCases(m, tries),
        remember: ['A good start is not enough. Check to the last piece.', 'Ask: is there a block that fits every piece?'],
        simpler: [
          'Look at red, blue, red, blue, red. The block red, blue fits every piece. So it repeats.',
          'Look at red, blue, blue, red, red. Red alone breaks at position 2. Red, blue breaks at position 3.',
          'Nothing longer fits twice. So it does not repeat.',
        ],
      },
      hints: ['Try a block of 1, then 2, then 3.', `For each block, check every ${s.pos} to the end.`, twinLine],
      hintCase: {
        label: `A twin chain: ${listOf(twinSkin, twinSeq)}.`,
        truths: [{ who: 'A block of 1', value: blockFits(twinSeq, 1) }, { who: 'A block of 2', value: blockFits(twinSeq, 2) }],
        words: FIT_WORDS,
        note: 'No block fits, so this chain does not repeat.',
      },
      errorTags: answer === 'no' ? { yes: 'not-repeating' } : {},
    },
    [
      { id: 'yes', label: 'Yes. A block repeats all the way.' },
      { id: 'no', label: 'No. Every block breaks somewhere.' },
    ],
    answer,
    feedback,
  );
}

// ---------- Echo Bells (s14.l3) ----------

/** The tag every Echo Bells pack's trap item carries: the same pieces in a different structure. */
export const SAME_PIECES = { tag: 'same-pieces', label: 'the same pieces in a different structure' } as const;

/** "Positions 2 and 3 match, and position 1 is different." Computed from the structure. */
export function describeStructure(st: string): string {
  const groups = new Map<string, number[]>();
  [...st].forEach((c, i) => groups.set(c, [...(groups.get(c) ?? []), i + 1]));
  const many = [...groups.values()].filter((g) => g.length > 1);
  const ones = [...groups.values()].filter((g) => g.length === 1).map((g) => g[0]);
  const join = (xs: number[]) => (xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  if (!many.length) return `All ${NUM[st.length]} positions are different.`;
  const parts = many.map((g) => `positions ${join(g)} match`);
  if (ones.length === 1) parts.push(`position ${ones[0]} is different`);
  else if (ones.length > 1) parts.push(`positions ${join(ones)} are different`);
  // Two groups that each match ("A, A, B, B") also differ from each other; say so, or "A, A, A, A" would fit the words.
  else if (many.length > 1) parts.push(many.every((g) => g.length === 2) ? `the two pairs are different` : 'the groups are different');
  const text = parts.length <= 2 ? parts.join(', and ') : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  return `${cap(text)}.`;
}
const describeLower = (st: string) => describeStructure(st).replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, '');

/** A block in a skin, from a structure ("ABB" in claps is "clap, tap, tap"). */
export const blockIn = (s: Skin, st: string) => listOf(s, unitOf(st));
/** The letter name of each piece kind: "Clap is A and tap is B." */
function letterNames(s: Skin, st: string): string {
  const kinds = uniq(unitOf(st));
  const parts = kinds.map((i) => `${lbl(s, i)} is ${'ABC'[i]}`);
  return `${cap(parts.length === 2 ? parts.join(' and ') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`)}.`;
}

function pickStructure(rng: Rng, s: Skin, allow4 = true): string {
  const opts = s.pieces.length >= 3 ? ['ABB', 'AAB', 'ABA', 'ABC', ...(allow4 ? ['AABB', 'ABBA'] : [])] : ['ABB', 'AAB', 'ABA', ...(allow4 ? ['AABB', 'ABBA'] : [])];
  return rng.pick(opts);
}

function teachEcho(s: Skin, st: string): Teach {
  return {
    rule: 'Two blocks have the same structure when the same positions match and the same positions differ. The pieces can change.',
    terms: [
      { word: 'Structure', meaning: 'which positions match and which are different.' },
      { word: 'Rebuild in letters', meaning: 'call the first kind of piece A, the next new kind B, then C.' },
    ],
    casesTitle: `Which blocks are ${lettersOf(st)}?`,
    cases: familyOf(st).map((f) => ({ label: `${cap(blockIn(s, f))} is ${lettersOf(f)}.`, truths: [{ who: `Same structure as ${lettersOf(st)}`, value: f === st }], words: YES_WORDS })),
    remember: ['Same pieces do not mean same structure.', 'Ask: which positions match, and which are different?'],
    simpler: ['Red, blue, blue: red is new, so A. Blue is new, so B. Blue again, so B.', 'So red, blue, blue is A, B, B.', 'Clap, tap, tap is A, B, B too. Same structure.'],
  };
}

function echoTwin(rng: Rng, avoid: SkinId): { line: string; kase: TeachCase } {
  const skin = makeSkin(rng.pick(['colors', 'shapes', 'sounds'].filter((x) => x !== avoid) as SkinId[]), rng);
  const st = rng.pick(['AAB', 'ABA', 'ABB']);
  const other = rng.pick(familyOf(st).filter((x) => x !== st));
  return {
    line: `A twin: ${blockIn(skin, st)} is ${lettersOf(st)}. ${describeStructure(st)} ${cap(blockIn(skin, other))} is ${lettersOf(other)}, so it does not match.`,
    kase: {
      label: `A twin block: ${blockIn(skin, st)}.`,
      truths: [{ who: lettersOf(st), value: true }, { who: lettersOf(other), value: false }],
      words: { truth: 'matches', untruth: 'does not match' },
      note: describeStructure(st),
    },
  };
}

const echoChain = (s: Skin, st: string): ChainModel => modelOf(s, unitOf(st), 2 * st.length);
const echoRule = (st: string, s: Skin) => `the block ${st} (${blockIn(s, st)}), repeated; the first kind of piece is A, the next new kind B, then C`;

/** Explain: why a sound block matches a letter block (the same positions match and differ). */
export function echoWhyItem(rng: Rng, o: { phase?: Phase; skin?: SkinId } = {}): ChooseItem {
  const phase = o.phase ?? 'explain';
  const s = makeSkin(o.skin ?? rng.pick(['sounds', 'colors', 'bells'] as const), rng);
  const st = rng.pick(['ABB', 'AAB', 'ABA', 'AABB']);
  const other = rng.pick(familyOf(st).filter((x) => x !== st));
  const k = st.length;
  const block = blockIn(s, st);
  const twin = echoTwin(rng, s.id);
  return chooseItem(
    rng,
    {
      lesson: L3, skill: 's14.echo-why', phase, level: 2, twin: 's14.l3.echo-why', metaSkill: 'Track 1 · explain a match',
      rule: echoRule(st, s), task: 'explain why two blocks have the same structure', rep: s.rep, difficulty: 2,
      rubric: { level: 2, text: '2 = names which positions match and which differ in both; 1 = one feature only (the count or the first piece); 0 = no rule' },
    },
    {
      prompt: `${madeLine(s)} Why does the block “${block}” match the letter block “${lettersOf(st)}”?`,
      scene: { kind: 'chain', tokens: tokensOf(echoChain(s, st)), stated: madeLine(s) },
      explain: `${letterNames(s, st)} So “${block}” is “${lettersOf(st)}”. ${describeStructure(st)}`,
      teach: teachEcho(s, st),
      hints: ['Name each new kind of piece with the next letter: A, then B.', 'Which positions match each other?', twin.line],
      hintCase: twin.kase,
      errorTags: { count: 'appearance-match', first: 'local-only' },
    },
    [
      { id: 'same', label: `In both, ${describeLower(st)}.` },
      { id: 'count', label: `Both blocks have ${NUM[k]} pieces.` },
      { id: 'first', label: 'Both blocks start with a new piece.' },
    ],
    'same',
    {
      count: {
        headline: `Having ${NUM[k]} pieces is not enough.`,
        detail: [`The block “${blockIn(s, other)}” has ${NUM[k]} pieces too, but it is ${lettersOf(other)}.`, 'What must match is the structure: which positions match and which differ.'],
        example: { label: `${cap(blockIn(s, other))} is ${lettersOf(other)}.`, truths: [{ who: `Same structure as ${lettersOf(st)}`, value: false }], words: YES_WORDS },
      },
      first: {
        headline: 'Every block starts with a new piece.',
        detail: ['So the first piece cannot tell two blocks apart.', `Check the other positions too. ${describeStructure(st)}`],
        example: { label: `${cap(blockIn(s, other))} is ${lettersOf(other)}.`, truths: [{ who: `Same structure as ${lettersOf(st)}`, value: false }], words: YES_WORDS, note: 'It starts with a new piece too.' },
      },
    },
  );
}

/** Do: rebuild a chain in letters. Framed (faded): fill one letter of the block; unframed: pick the letter chain. */
export function rebuildItem(rng: Rng, o: { framed?: boolean; skin?: SkinId; phase?: Phase } = {}): ChooseItem {
  const phase = o.phase ?? 'do';
  const s = makeSkin(o.skin ?? rng.pick(ECHO_FROM), rng);
  const st = pickStructure(rng, s, !o.framed);
  const m = echoChain(s, st);
  const k = st.length;
  const twin = echoTwin(rng, s.id);
  const base = {
    lesson: L3, skill: 's14.translate', phase, level: 2 as const, twin: 's14.l3.translate', metaSkill: 'Track 1 · same structure, new pieces',
    rule: echoRule(st, s), rep: s.rep,
  };
  const prompt = `${madeLine(s)} Rebuild it in letters: the first kind of ${s.piece} is A, the next new kind is B, then C.`;
  if (o.framed) {
    const blank = k - 1;
    const right = st[blank];
    const feedback: Record<string, ChoiceFeedback> = {};
    const errorTags: Record<string, ErrorTag> = {};
    for (const L of ['A', 'B', 'C']) {
      if (L === right) continue;
      const kind = st.indexOf(L) >= 0 && st.indexOf(L) < blank ? unitOf(st)[st.indexOf(L)] : -1;
      const piece = unitOf(st)[blank];
      errorTags[L] = 'same-objects-different-structure';
      feedback[L] = {
        headline: kind >= 0 ? `${L} is the letter for ${lbl(s, kind)}.` : st.indexOf(right) === blank ? `${L} skips a letter. The next new letter is ${right}.` : `${L} would mean a new kind of ${s.piece}.`,
        detail: [
          `${Pos(s, k)} is ${an(s, piece)}.`,
          st.indexOf(right) < blank ? `${cap(lbl(s, piece))} came before, as ${right}. So it gets ${right} again.` : `${cap(lbl(s, piece))} is a new kind here, so it gets the next letter, ${right}.`,
        ],
      };
    }
    return chooseOrdered(
      { ...base, task: 'rebuild a block in letters (faded)', difficulty: 1 },
      {
        prompt: `${prompt} Which letter fills the blank?`,
        scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(s) },
        explain: `${letterNames(s, st)} So “${blockIn(s, st)}” becomes “${lettersOf(st)}”.`,
        teach: teachEcho(s, st),
        hints: [`What letter did ${lbl(s, unitOf(st)[blank])} get before, if it came before?`, 'A new kind of piece gets the next new letter.', twin.line],
        hintCase: twin.kase,
        errorTags,
        frame: `${cap(blockIn(s, st))} becomes ${[...st.slice(0, blank)].join(', ')}, ___.`,
      },
      ['A', 'B', 'C'].map((L) => ({ id: L, label: L })),
      right,
      feedback,
    );
  }
  const fam = familyOf(st);
  const chainOf = (f: string) => lettersOf(f + f);
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const f of fam) {
    if (f === st) continue;
    errorTags[f] = 'same-objects-different-structure';
    feedback[f] = {
      headline: `${chainOf(f)} has a different structure.`,
      detail: [`In its block, ${describeLower(f)}.`, `In ${chainL(s)}, ${describeLower(st)}.`],
      example: { label: `${cap(blockIn(s, st))} is ${lettersOf(st)}.`, truths: [{ who: `Same structure as ${lettersOf(f)}`, value: false }], words: YES_WORDS },
    };
  }
  return chooseOrdered(
    { ...base, task: 'rebuild a chain in letters', difficulty: 2 },
    {
      prompt: `${prompt} Which letter chain has the same structure?`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(s) },
      explain: `${letterNames(s, st)} So the block is ${lettersOf(st)}, and the chain is ${chainOf(st)}.`,
      teach: teachEcho(s, st),
      hints: ['Name each new kind of piece with the next letter: A, then B.', 'Which positions in the block match each other?', twin.line],
      hintCase: twin.kase,
      errorTags,
    },
    fam.map((f) => ({ id: f, label: chainOf(f) })),
    st,
    feedback,
  );
}

/**
 * Do or transfer: which block in other pieces has the same structure. Every choice uses the same pieces, so only the
 * structure tells them apart (the trap: tag same-objects-different-structure).
 */
export function matchItem(rng: Rng, o: { from: SkinId; to: SkinId; trap?: boolean; phase?: Phase }): ChooseItem {
  const phase = o.phase ?? 'do';
  const from = makeSkin(o.from, rng);
  const to = makeSkin(o.to, rng);
  const two = from.pieces.length < 3 || to.pieces.length < 3;
  const st = rng.pick(two ? ['ABB', 'AAB', 'ABA', 'AABB', 'ABBA'] : ['ABB', 'AAB', 'ABA', 'AABB', 'ABBA', 'ABC']);
  const m = echoChain(from, st);
  const fromBlock = from.id === 'abc' ? lettersOf(st) : blockIn(from, st);
  const fam = familyOf(st);
  const twin = echoTwin(rng, to.id);
  const feedback: Record<string, ChoiceFeedback> = {};
  const errorTags: Record<string, ErrorTag> = {};
  for (const f of fam) {
    if (f === st) continue;
    errorTags[f] = 'same-objects-different-structure';
    feedback[f] = {
      headline: `The block “${blockIn(to, f)}” uses ${new Set(f).size === new Set(st).size ? `the same ${to.pieces_}` : `${to.pieces_} from the same set`}, but its structure is ${lettersOf(f)}.`,
      detail: [describeStructure(f), from.id === 'abc' ? `In ${fromBlock}, ${describeLower(st)}.` : `The block ${fromBlock} is ${lettersOf(st)}. ${describeStructure(st)}`],
      example: { label: `${cap(blockIn(to, f))} is ${lettersOf(f)}.`, truths: [{ who: `Same structure as ${fromBlock}`, value: false }], words: YES_WORDS },
    };
  }
  const noun = to.id === 'colors' ? 'color' : to.piece;
  const ask = from.id === 'abc'
    ? `Which ${noun} block has the same structure as “${fromBlock}”?`
    : `${from.chain} repeats the block ${fromBlock}. Which ${noun} block has the same structure?`;
  return chooseItem(
    rng,
    {
      lesson: L3, skill: 's14.translate', phase, level: 2, twin: 's14.l3.translate', metaSkill: 'Track 1 · same structure, new pieces',
      rule: echoRule(st, from), task: `match a structure in ${to.rep}`, rep: `${from.rep} to ${to.rep}`, difficulty: o.trap ? 3 : 2,
    },
    {
      prompt: `${intro(from, phase)}${ask}`,
      scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(from) },
      explain: `${fromBlock === lettersOf(st) ? '' : `${cap(fromBlock)} is ${lettersOf(st)}. `}${describeStructure(st)} ${cap(blockIn(to, st))} is ${lettersOf(st)} too.`,
      teach: teachEcho(to, st),
      hints: ['Rebuild each block in letters: A, then B.', `Which positions match in ${fromBlock}?`, twin.line],
      hintCase: twin.kase,
      errorTags,
      tags: o.trap ? [SAME_PIECES.tag] : [],
    },
    fam.map((f) => ({ id: f, label: blockIn(to, f) })),
    st,
    feedback,
  );
}

// ---------- worked examples for the cards and boards (fixed pieces, computed answers) ----------

/** A chain scene that walks a worked example step by step (each step with its own frame). */
export function steppedScene(tokens: ChainToken[], stated: string, steps: { label: string; say: string; frame: ChainFrame }[]): ChainScene {
  return { kind: 'chain', tokens, stated, steps: steps.map(({ label, say }) => ({ label, say })), frames: steps.map((s) => s.frame) };
}

/** Every item of a set, for tests and the stop: a set where no two items look the same. */
export function distinctSet(make: (() => Item)[]): Item[] {
  const seen = new Set<string>();
  const key = (it: Item) => JSON.stringify([it.prompt, it.scene ?? null, it.kind === 'choose' ? it.choices.map((c) => c.label) : null, it.frame ?? null]);
  return make.map((f) => {
    let it = f();
    for (let i = 0; i < 60 && seen.has(key(it)); i++) it = f();
    seen.add(key(it));
    return it;
  });
}
