/**
 * Pattern Observatory, Ring 1: First Lights (Track 1, Repetition and structure). Places:
 *
 *  l1 Star Chain   (L1–L2, needs nothing)  the unit is the shortest block that fits every piece; extend; any position
 *  l2 Repair Bench (L2, needs s14.l1)      a chain meant to repeat a stated block: find the break to the very end, fix
 *                                          it; is a chain made by repeating a block at all?
 *  l3 Echo Bells   (L2, needs s14.l1)      the same structure in new pieces: colors, bells, claps, letters, moves
 *
 * Every place runs See (stepped chain pictures) → Explain → Do (a faded item, then the same task with no frame) →
 * Transfer (sounds, a rota, a necklace, a dance, a timetable) → Review. Every answer, truth and picture comes from
 * ../engine/puzzles/observatory/chains.ts.
 */
import {
  BASE_SKINS, ECHO_TRANSFER, L1, L2, L3, LONGER_BLOCK, NEAR_END, PATTERNS, REPAIR_TRANSFER, SAME_PIECES, STAR_TRANSFER, STOP,
  atPosition, blockFits, blocksOf, build, countLine, describeStructure, distinctSet, echoWhyItem, findItem, firstMiss,
  fixItem, lettersOf, madeLine, makeSkin, matchItem, meantLine, modelOf, positionItem, rebuildItem, repairWhyItem, repeatOrNotItem,
  seenLine, shortestBlock, splitPosition, steppedScene, structureOf, tokensOf, unitItem, unitLengthItem, unitOf, unitText,
  unitWhyItem, type Broken, type ChainModel, type Skin,
} from '../engine/puzzles/observatory/chains';
import type { ChainScene } from '../engine/scenes/chain';
import type { DrillMark, DrillStep, IdeaCard, Item, LessonDef, Rng, StopDef } from '../engine/types';

const label = (s: Skin, i: number) => s.pieces[i].token.label;
const a = (s: Skin, i: number) => s.pieces[i].a;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const ids = (items: Item[], prefix: string): Item[] => items.map((it, i) => ({ ...it, id: `${prefix}${i + 1}` }));
const options = (s: Skin, kinds: readonly number[]) => [...new Set(kinds)].sort((x, y) => x - y).map((i) => ({ id: `pc${i}`, label: label(s, i) }));

// ---------- Star Chain (s14.l1): the worked examples ----------

const SHAPES = makeSkin('shapes');
const COLORS = makeSkin('colors');
const LETTERS = makeSkin('letters');
const SOUNDS = makeSkin('sounds');
const BELLS = makeSkin('bells');
const ABC = makeSkin('abc');
const MOVES = makeSkin('moves');

/** Card 1: a chain made by repeating triangle, circle, with its unit boxed. */
const AB_CHAIN = modelOf(SHAPES, PATTERNS.AB, 8);
const AB_SCENE: ChainScene = { kind: 'chain', tokens: tokensOf(AB_CHAIN), stated: madeLine(SHAPES), unit: { start: 0, len: 2 } };

/** Card 2, the worked example: triangle, circle, circle (9 pieces). A block of 6 fits but is long; 2 breaks; 3 is the unit. */
const STAR = modelOf(SHAPES, PATTERNS.ABB, 9);
function starScene(): ChainScene {
  const m = STAR;
  const long = 6;
  const short = 2;
  const k = shortestBlock(m.seq);
  const miss = firstMiss(m.seq, short);
  return steppedScene(tokensOf(m), madeLine(SHAPES), [
    {
      label: `Try a block of ${long}`,
      say: `Try the first ${long} pieces. Repeat them, and ${blockFits(m.seq, long) ? 'every piece fits' : 'a piece breaks'}. But a shorter block might fit too.`,
      frame: { tryUnit: { start: 0, len: long, ok: blockFits(m.seq, long) } },
    },
    {
      label: `Try a block of ${short}`,
      say: `Try ${m.seq.slice(0, short).map((i) => label(SHAPES, i)).join(', ')}. Position ${miss + 1} would be ${a(SHAPES, m.seq[miss % short])}. But it is ${a(SHAPES, m.seq[miss])}, so this block breaks.`,
      frame: { tryUnit: { start: 0, len: short, ok: false }, miss },
    },
    {
      label: `Try a block of ${k}`,
      say: `Try ${unitText(m)}. It fits all ${m.seq.length} pieces. Nothing shorter fits, so this is the unit.`,
      frame: { unit: { start: 0, len: k } },
    },
  ]);
}
const STAR_SCENE = starScene();

/** Card 3: find any position, by counting whole units (take one away, find the remainder, add one). */
const FAR = modelOf(SHAPES, PATTERNS.ABB, 6);
function farScene(): ChainScene {
  const k = FAR.unit.length;
  const say = (p: number) => {
    const { q, r, piece } = splitPosition(k, p);
    return `Take one away: ${p - 1}. That is ${q} whole blocks of ${k}, with ${r} left over. Add one: piece ${piece} of the unit, ${a(SHAPES, atPosition(FAR.unit, p))}.`;
  };
  return steppedScene(tokensOf(FAR), madeLine(SHAPES), [
    { label: 'Find position 7', say: say(7), frame: { unit: { start: 0, len: k } } },
    { label: 'Find position 14', say: say(14), frame: { unit: { start: 0, len: k } } },
  ]);
}
const FAR_SCENE = farScene();

/** Card 4: a chain only seen, with no stated rule. */
const SEEN = modelOf(LETTERS, PATTERNS.AB, 6);
const SEEN_SCENE: ChainScene = { kind: 'chain', tokens: tokensOf(SEEN), stated: seenLine(LETTERS) };

const STAR_IDEAS: IdeaCard[] = [
  {
    title: 'Made by repeating a block',
    scene: AB_SCENE,
    body: [
      `This chain is made by repeating a block: ${unitText(AB_CHAIN)}.`,
      'The shortest block that repeats is called the unit. The box shows it.',
      'Each piece has a spot, called its position. The first piece is position 1.',
      'We are told how this chain was made. So we can be sure what comes next.',
    ],
  },
  {
    title: 'Try a block, check every piece',
    scene: STAR_SCENE,
    body: ['Which block is the unit? Try a block. Then check it against every piece.', 'Tap the button to see each try.'],
  },
  {
    title: 'Find any position',
    scene: FAR_SCENE,
    body: [
      'You can find a piece far past the end of the chain.',
      'Take one away, find the remainder, add one. The remainder is what is left over after the whole blocks.',
      'That number tells you which piece of the unit it is.',
    ],
  },
  {
    title: 'Told, or only seen?',
    scene: SEEN_SCENE,
    body: [
      'Here nobody says how the chain was made. We only see six pieces.',
      `${unitText(SEEN)} looks like a block that repeats. But a chain we only see could change later.`,
      'So the next piece is a good guess, not a sure thing. When the rule is stated, we can be sure.',
    ],
  },
];

/** A mark for the piece at position p, with the count for every wrong option. */
function positionMark(m: ChainModel, p: number, full: boolean): DrillMark {
  const s = m.skin;
  const k = m.unit.length;
  const ans = atPosition(m.unit, p);
  const { q, r, piece } = splitPosition(k, p);
  const why: Record<string, string> = {};
  for (const o of options(s, m.unit)) if (o.id !== `pc${ans}`) why[o.id] = `Not yet. ${countLine(k, p)} Piece ${piece} is ${a(s, ans)}.`;
  return {
    id: `p${p}`,
    label: `Position ${p}`,
    options: options(s, m.unit),
    answer: `pc${ans}`,
    why,
    ...(full ? { compare: { says: `The unit is ${unitText(m)}.`, world: `${p - 1} is ${q} whole blocks of ${k}, with ${r} left over.` } } : {}),
  };
}

/** A mark for the unit's length: a shorter block breaks, a longer one fits but is not the shortest. */
function lengthMark(m: ChainModel, lengths: number[]): DrillMark {
  const k = shortestBlock(m.seq);
  const s = m.skin;
  const why: Record<string, string> = {};
  for (const L of lengths) {
    if (L === k) continue;
    const miss = firstMiss(m.seq, L);
    why[String(L)] = blockFits(m.seq, L)
      ? `Not yet. A block of ${L} fits, but a block of ${k} fits too and is shorter. The unit is the shortest block.`
      : `Not yet. A block of ${L} breaks at position ${miss + 1}. It would put ${a(s, m.seq[miss % L])} there, but it is ${a(s, m.seq[miss])}.`;
  }
  return { id: 'len', label: 'Unit length', options: lengths.map((L) => ({ id: String(L), label: `${L} pieces` })), answer: String(k), why };
}

const UNIT_WORDS = { says: 'Unit', world: 'Count', so: 'So', ask: 'Which piece lands here?' } as const;

function starBoard(): DrillStep {
  const m = STAR;
  const last = m.seq[m.seq.length - 1];
  const asked = [11, 13, 16];
  return {
    id: `${L1}-do`,
    title: 'Use the unit',
    body: [`This is the chain from the example. Its unit is boxed: ${unitText(m)}.`, 'Mark the unit length. Then mark the piece at each spot past the end.'],
    scene: STAR_SCENE,
    scaffold: 'full',
    steps: ['Find the shortest block that fits.', 'Take one away, find the remainder.', 'Add one, and read that piece of the unit.'],
    words: UNIT_WORDS,
    rows: [
      {
        id: 'worked',
        label: 'Position 10, done for you',
        marks: [{ ...positionMark(m, 10, false), given: true }],
        note: `${countLine(3, 10)} Piece ${splitPosition(3, 10).piece} is ${a(SHAPES, atPosition(m.unit, 10))}.`,
      },
      { id: 'unit', label: 'The unit', marks: [lengthMark(m, [2, 3, 6])] },
      { id: 'past', label: 'Spots past the end', marks: asked.map((p) => positionMark(m, p, true)) },
    ],
    misconceptions: [
      {
        id: 'copy-last',
        when: 'picks',
        picks: Object.fromEntries(asked.map((p) => [`p${p}`, `pc${last}`])),
        text: 'You may be copying the last piece of the chain. The chain goes on with its unit. Count where each spot lands in the unit.',
      },
    ],
    done: `Right. The unit is ${shortestBlock(m.seq)} pieces long. Count whole blocks, then read the piece.`,
  };
}

/** Board 2, a twin: a new chain in colors with a longer unit, and no box. */
const TWIN4 = modelOf(COLORS, PATTERNS.AABB, 8);
function starTwinBoard(): DrillStep {
  const m = TWIN4;
  const asked = [9, 11, 14];
  const p = asked[asked.length - 1];
  return {
    id: `${L1}-do2`,
    title: 'A new chain',
    body: ['Find the unit of this new chain. Then mark the piece at each spot past the end.'],
    scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(COLORS) },
    twin: 'A new chain: the pieces are colors, and the block is new. No box this time.',
    rows: [
      { id: 'unit', label: 'The unit', marks: [lengthMark(m, [2, 4, 8])] },
      { id: 'past', label: 'Spots past the end', marks: asked.map((x) => positionMark(m, x, false)) },
    ],
    done: `Right. The unit is ${unitText(m)}. Position ${p} is piece ${splitPosition(4, p).piece} of the unit: ${label(COLORS, atPosition(m.unit, p))}.`,
  };
}

// ---------- Repair Bench (s14.l2): the worked examples ----------

/** A chain from a unit with one piece changed: the stated rule, the shown pieces and the break. */
function broken(skin: Skin, pattern: keyof typeof PATTERNS, n: number, b: number, to: number): Broken {
  const seq = build(PATTERNS[pattern], n);
  seq[b] = to;
  return { skin, unit: [...PATTERNS[pattern]], seq, b, pattern };
}

const REPAIR = broken(SHAPES, 'ABC', 9, 7, 2);
function repairScene(): ChainScene {
  const m = REPAIR;
  const k = m.unit.length;
  const exp = m.unit[m.b % k];
  return steppedScene(tokensOf(m), meantLine(m), [
    { label: 'Check block 1', say: `Positions 1 to ${k}: ${unitText(m)}. They match the block.`, frame: { unit: { start: 0, len: k }, checked: k } },
    { label: 'Check block 2', say: `Positions ${k + 1} to ${2 * k} match the block too.`, frame: { unit: { start: k, len: k }, checked: 2 * k } },
    {
      label: 'Check block 3',
      say: `Position ${m.b + 1} should be ${a(SHAPES, exp)}. It is ${a(SHAPES, m.seq[m.b])}. So position ${m.b + 1} breaks the rule.`,
      frame: { tryUnit: { start: 2 * k, len: k, ok: false }, checked: m.b, miss: m.b },
    },
  ]);
}
const REPAIR_SCENE = repairScene();

const LATE = broken(COLORS, 'AB', 8, 7, 0);
function lateScene(): ChainScene {
  const m = LATE;
  return steppedScene(tokensOf(m), meantLine(m), [
    { label: 'Check blocks 1 to 3', say: `Positions 1 to ${m.b - 1} match ${unitText(m)} each time.`, frame: { unit: { start: 0, len: 2 }, checked: m.b - 1 } },
    {
      label: 'Check block 4',
      say: `Position ${m.b + 1} should be ${a(COLORS, m.unit[m.b % 2])}. It is ${a(COLORS, m.seq[m.b])}. The break is the very last piece.`,
      frame: { tryUnit: { start: m.b - 1, len: 2, ok: false }, checked: m.b, miss: m.b },
    },
  ]);
}

/** Card 3: a chain only seen, where every block that could fit twice breaks. */
const RANDOM = [0, 1, 0, 0, 1, 1, 0];
function randomScene(): ChainScene {
  const m: ChainModel = { skin: LETTERS, unit: [], seq: RANDOM };
  const tryStep = (L: number) => {
    const miss = firstMiss(m.seq, L);
    return {
      label: `Try a block of ${L}`,
      say: `${cap(m.seq.slice(0, L).map((i) => label(LETTERS, i)).join(', '))} ${L === 1 ? 'alone ' : ''}breaks at position ${miss + 1}.`,
      frame: { tryUnit: { start: 0, len: L, ok: false }, miss },
    };
  };
  const most = Math.floor(m.seq.length / 2);
  return steppedScene(tokensOf(m), seenLine(LETTERS), [
    ...Array.from({ length: most }, (_, i) => tryStep(i + 1)),
    { label: 'Decide', say: `A longer block would not fit twice in ${m.seq.length} pieces. So this chain is not made by repeating a block.`, frame: {} },
  ]);
}

const REPAIR_IDEAS: IdeaCard[] = [
  {
    title: 'Meant to repeat a block',
    scene: REPAIR_SCENE,
    body: ['This time we are told the rule. The chain is meant to repeat a block.', 'Check the chain one block at a time. Stop at a piece that does not match.'],
  },
  {
    title: 'Check all the way to the end',
    scene: lateScene(),
    body: ['A break can hide near the end. If you stop checking early, you miss it.', 'Check every block, all the way to the last piece.'],
  },
  {
    title: 'Is it made by repeating a block?',
    scene: randomScene(),
    body: ['Some chains are not made by repeating a block. Test before you say they are.', 'Try each block that could fit at least twice.'],
  },
];

const MATCH = [{ id: 'matches', label: 'Matches' }, { id: 'breaks', label: 'Breaks' }];
const REPAIR_WORDS = { says: 'Rule', world: 'Chain', so: 'So', ask: 'Does the block match?' } as const;

/** A repair board: each block matches or breaks, then the spot that breaks and the piece that belongs there. */
function repairRows(m: Broken, givenFirst: boolean, full: boolean): DrillStep['rows'] {
  const s = m.skin;
  const k = m.unit.length;
  const exp = m.unit[m.b % k];
  const blocks = blocksOf(m);
  const last = blocks[blocks.length - 1];
  const rows: DrillStep['rows'] = blocks.map((x, i) => {
    const shown = m.seq.slice(x.s - 1, x.e).map((p) => label(s, p)).join(', ');
    const mark: DrillMark = {
      id: `b${x.j}`,
      label: `Block ${x.j}`,
      options: MATCH,
      answer: x.ok ? 'matches' : 'breaks',
      why: x.ok
        ? { breaks: `Not yet. Positions ${x.s} to ${x.e} are ${shown}. That is the block, so it matches.` }
        : { matches: `Not yet. Position ${m.b + 1} is ${a(s, m.seq[m.b])}. The block puts ${a(s, exp)} there.` },
      ...(full ? { compare: { says: `The block: ${unitText(m)}.`, world: `Positions ${x.s} to ${x.e}: ${shown}.` } } : {}),
      ...(givenFirst && i === 0 ? { given: true } : {}),
    };
    return { id: `block${x.j}`, label: `Block ${x.j}, positions ${x.s} to ${x.e}`, marks: [mark] };
  });
  const spots = Array.from({ length: last.e - last.s + 1 }, (_, i) => last.s + i);
  const where: DrillMark = {
    id: 'where',
    label: 'Position that breaks',
    options: spots.map((p) => ({ id: String(p), label: String(p) })),
    answer: String(m.b + 1),
    why: Object.fromEntries(spots.filter((p) => p !== m.b + 1).map((p) => [String(p), `Not yet. Position ${p} is ${a(s, m.seq[p - 1])}, and the block puts ${a(s, m.unit[(p - 1) % k])} there. It matches.`])),
  };
  const kinds = options(s, m.unit);
  const what: DrillMark = {
    id: 'what',
    label: 'Piece that belongs there',
    options: kinds,
    answer: `pc${exp}`,
    why: Object.fromEntries(kinds.filter((o) => o.id !== `pc${exp}`).map((o) => [o.id, `Not yet. Position ${m.b + 1} is piece ${splitPosition(k, m.b + 1).piece} of its block. The unit puts ${a(s, exp)} there.`])),
  };
  return [...rows, { id: 'fix', label: 'The fix', marks: [where, what] }];
}

function repairBoard(): DrillStep {
  const m = REPAIR;
  return {
    id: `${L2}-do`,
    title: 'Walk the blocks',
    body: ['This is the chain from the example. Mark each block: does it match the rule?', 'Then mark the spot that breaks, and the piece that belongs there.'],
    scene: REPAIR_SCENE,
    scaffold: 'full',
    steps: ['Check block 1 against the rule.', 'Check each next block, to the end.', 'Name the spot that breaks, and its fix.'],
    words: REPAIR_WORDS,
    rows: repairRows(m, true, true),
    done: `Right. Position ${m.b + 1} breaks the rule. ${cap(a(SHAPES, m.unit[m.b % 3]))} belongs there.`,
  };
}

const REPAIR_TWIN = broken(LETTERS, 'ABB', 9, 8, 0);
function repairTwinBoard(): DrillStep {
  const m = REPAIR_TWIN;
  return {
    id: `${L2}-do2`,
    title: 'Find the break',
    body: ['Check this new chain the same way, block by block, to the end.'],
    scene: { kind: 'chain', tokens: tokensOf(m), stated: meantLine(m) },
    twin: `A new chain, meant to repeat ${unitText(m)}. No flag this time.`,
    rows: repairRows(m, false, false),
    done: `Right. The break is the last piece, position ${m.b + 1}. It should be ${label(LETTERS, m.unit[m.b % 3])}.`,
  };
}

// ---------- Echo Bells (s14.l3): the worked examples ----------

const ECHO = modelOf(COLORS, unitOf('ABB'), 6);
/** The same chain in other pieces: a structure keeps its letters in every skin (A is pieces[0], B is pieces[1]). */
const inSkin = (m: ChainModel, s: Skin) => m.seq.map((i) => ({ ...s.pieces[i].token }));

function echoScene(): ChainScene {
  const m = ECHO;
  const say = (from: Skin, to: Skin) => `${[0, 1].map((i) => `${cap(label(from, i))} becomes ${a(to, i)}`).join('. ')}. ${cap(m.seq.slice(0, 3).map((i) => label(to, i)).join(', '))}.`;
  return steppedScene(tokensOf(m), madeLine(COLORS), [
    { label: 'Play it on bells', say: say(COLORS, BELLS), frame: { tokens: inSkin(m, BELLS), unit: { start: 0, len: 3 } } },
    { label: 'Now in claps', say: say(BELLS, SOUNDS), frame: { tokens: inSkin(m, SOUNDS), unit: { start: 0, len: 3 } } },
    { label: 'Now in letters', say: `The first kind of piece is A. The next new kind is B. ${lettersOf(structureOf(m.seq.slice(0, 3)))}.`, frame: { tokens: inSkin(m, ABC), unit: { start: 0, len: 3 } } },
    {
      label: 'Back to colors',
      say: `${cap(m.seq.slice(0, 3).map((i) => label(COLORS, i)).join(', '))} is ${lettersOf(structureOf(m.seq.slice(0, 3)))}, just like ${m.seq.slice(0, 3).map((i) => label(SOUNDS, i)).join(', ')}. The pieces changed. The structure did not.`,
      frame: { unit: { start: 0, len: 3 } },
    },
  ]);
}
const ECHO_SCENE = echoScene();

const READ = modelOf(SOUNDS, unitOf('ABB'), 6);
function readScene(): ChainScene {
  const m = READ;
  const st = structureOf(m.seq.slice(0, 3));
  const line = (i: number) => {
    const first = m.seq.indexOf(m.seq[i]);
    return first === i
      ? `Beat ${i + 1} is ${a(SOUNDS, m.seq[i])}. It is ${i === 0 ? 'the first kind' : 'new'}, so call it ${st[i]}.`
      : `Beat ${i + 1} is ${a(SOUNDS, m.seq[i])} again. It matches beat ${first + 1}, so it is ${st[i]} too.`;
  };
  return steppedScene(tokensOf(m), madeLine(SOUNDS), [0, 1, 2].map((i) => ({ label: `Beat ${i + 1}`, say: line(i), frame: { checked: i + 1, ...(i === 2 ? { unit: { start: 0, len: 3 } } : {}) } })));
}

const OTHER = modelOf(SOUNDS, unitOf('ABA'), 6);
function otherScene(): ChainScene {
  const m = OTHER;
  const block = m.seq.slice(0, 3).map((i) => label(SOUNDS, i)).join(', ');
  return steppedScene(tokensOf(m), madeLine(SOUNDS), [
    { label: 'Name the block', say: `The block is ${block}.`, frame: { unit: { start: 0, len: 3 } } },
    { label: 'Compare', say: `${describeStructure('ABA')} That is ${lettersOf('ABA')}, not ${lettersOf('ABB')}.`, frame: { unit: { start: 0, len: 3 } } },
  ]);
}

const ECHO_IDEAS: IdeaCard[] = [
  {
    title: 'Same structure, new pieces',
    scene: ECHO_SCENE,
    body: ['The pieces can change, and the chain still keeps its shape.', 'That shape is its structure: which positions match and which differ. Tap to play the chain in new pieces.'],
  },
  {
    title: 'Reading a structure',
    scene: readScene(),
    body: ['To find a structure, name each new kind of piece with the next letter.', 'Clap, tap, tap is A, B, B. So is red, blue, blue.'],
  },
  {
    title: 'Same pieces, new structure',
    scene: otherScene(),
    body: ['Clap, tap, clap uses the same sounds as clap, tap, tap. But its structure is not the same.', 'Check which positions match, not which pieces are used.'],
  },
];

const LETTER_OPTIONS = ['A', 'B', 'C'].map((l) => ({ id: l, label: l }));
const YES_NO = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];

/** A mark for the letter of a block's piece, computed from its structure. */
function letterMark(id: string, labelText: string, st: string, i: number, s: Skin): DrillMark {
  const right = st[i];
  const piece = unitOf(st)[i];
  const seen = st.indexOf(right) < i;
  const why: Record<string, string> = {};
  for (const o of LETTER_OPTIONS) {
    if (o.id === right) continue;
    why[o.id] = seen
      ? `Not yet. ${cap(label(s, piece))} came before as ${right}, so it gets ${right} again.`
      : `Not yet. ${cap(label(s, piece))} is a new kind here, so it gets the next letter, ${right}.`;
  }
  return { id, label: labelText, options: LETTER_OPTIONS, answer: right, why };
}

/** Same structure or not, computed from the two blocks. */
function sameMark(id: string, labelText: string, a1: string, a2: string, words1: string, words2: string): DrillMark {
  const same = a1 === a2;
  return {
    id,
    label: labelText,
    options: YES_NO,
    answer: same ? 'yes' : 'no',
    why: same
      ? { no: `Not yet. ${cap(words1)} is ${lettersOf(a1)}, and ${words2} is ${lettersOf(a2)}. The same positions match.` }
      : { yes: `Not yet. ${cap(words1)} is ${lettersOf(a1)}, but ${words2} is ${lettersOf(a2)}. Different positions match.` },
  };
}

function echoBoard(): DrillStep {
  const m = ECHO;
  const st = structureOf(m.seq.slice(0, 3));
  const block = (s: Skin, x: string) => unitOf(x).map((i) => label(s, i)).join(', ');
  const claps = (i: number): DrillMark => {
    const right = m.seq[i];
    const opts = options(SOUNDS, [0, 1]);
    return {
      id: `k${i + 1}`,
      label: `Position ${i + 1}`,
      options: opts,
      answer: `pc${right}`,
      why: Object.fromEntries(opts.filter((o) => o.id !== `pc${right}`).map((o) => [o.id, `Not yet. Position ${i + 1} is ${label(COLORS, right)}, which is ${st[i]}. ${st[i]} is ${a(SOUNDS, right)}.`])),
    };
  };
  return {
    id: `${L3}-do`,
    title: 'Rebuild it',
    body: [`This is the chain from the example: ${block(COLORS, st)}, repeated.`, 'Mark the letter for each color. Then rebuild the block in claps, and compare.'],
    scene: ECHO_SCENE,
    scaffold: 'full',
    steps: ['Name the first kind of piece A.', 'Give each new kind the next letter.', 'Compare which positions match.'],
    rows: [
      { id: 'red', label: cap(label(COLORS, 0)), marks: [{ ...letterMark('red', `Letter for ${label(COLORS, 0)}`, st, 0, COLORS), given: true }], note: `${cap(label(COLORS, 0))} is the first kind of piece, so it is A.` },
      { id: 'blue', label: cap(label(COLORS, 1)), marks: [letterMark('blue', `Letter for ${label(COLORS, 1)}`, st, 1, COLORS)] },
      { id: 'claps', label: 'The block in claps', marks: [0, 1, 2].map(claps) },
      { id: 'other', label: block(SOUNDS, 'ABA'), marks: [sameMark('same', `Same structure as ${block(COLORS, st)}?`, 'ABA', st, block(SOUNDS, 'ABA'), block(COLORS, st))] },
    ],
    done: `Right. ${cap(block(COLORS, st))} is ${lettersOf(st)}, and so is ${block(SOUNDS, st)}.`,
  };
}

const DANCE = modelOf(MOVES, unitOf('AAB'), 6);
function echoTwinBoard(): DrillStep {
  const m = DANCE;
  const st = structureOf(m.seq.slice(0, 3));
  const block = (s: Skin, x: string) => unitOf(x).map((i) => label(s, i)).join(', ');
  return {
    id: `${L3}-do2`,
    title: 'A dance in letters',
    body: ['Rebuild the dance block in letters. Then compare it with two color blocks.'],
    scene: { kind: 'chain', tokens: tokensOf(m), stated: madeLine(MOVES) },
    twin: 'New pieces and a new block: a dance of moves.',
    rows: [
      { id: 'letters', label: 'The dance block in letters', marks: [0, 1, 2].map((i) => letterMark(`m${i + 1}`, `Step ${i + 1}`, st, i, MOVES)) },
      { id: 'abb', label: block(COLORS, 'ABB'), marks: [sameMark('same1', 'Same structure as the dance?', 'ABB', st, block(COLORS, 'ABB'), 'the dance')] },
      { id: 'aab', label: block(COLORS, 'AAB'), marks: [sameMark('same2', 'Same structure as the dance?', 'AAB', st, block(COLORS, 'AAB'), 'the dance')] },
    ],
    done: `Right. The dance is ${lettersOf(st)}, and so is ${block(COLORS, st)}. The pieces changed; the structure did not.`,
  };
}

// ---------- the packs ----------

/** Star Chain: explain, a faded position, the same task with no frame, box the unit (the trap), then a transfer. */
function starPack(rng: Rng): Item[] {
  return ids(
    distinctSet([
      () => unitWhyItem(rng),
      () => positionItem(rng, { ask: 'blank' }),
      () => positionItem(rng, { ask: rng.pick(['next', 'far'] as const) }),
      () => unitItem(rng, { trap: true }),
      () => (rng.chance(0.5) ? positionItem(rng, { ask: rng.pick(['next', 'far'] as const), skin: rng.pick(STAR_TRANSFER), phase: 'transfer' }) : unitLengthItem(rng, { skin: rng.pick(STAR_TRANSFER), phase: 'transfer' })),
    ]),
    `${L1}-p`,
  );
}

/** The L1 pack: the same plan on chains made by repeating two pieces (AB). */
function starPackL1(rng: Rng): Item[] {
  return ids(
    distinctSet([
      () => unitWhyItem(rng, { pattern: 'AB' }),
      () => positionItem(rng, { ask: 'blank', pattern: 'AB' }),
      () => positionItem(rng, { ask: rng.pick(['next', 'far'] as const), pattern: 'AB' }),
      () => unitItem(rng, { trap: true, pattern: 'AB' }),
      () => positionItem(rng, { ask: 'next', pattern: 'AB', skin: rng.pick(STAR_TRANSFER), phase: 'transfer' }),
    ]),
    `${L1}-p`,
  );
}

/** Repair Bench: explain, a faded fix, find the break near the end (the trap), repeating or not, then a transfer. */
function repairPack(rng: Rng): Item[] {
  return ids(
    distinctSet([
      () => repairWhyItem(rng),
      () => fixItem(rng, { framed: true }),
      () => findItem(rng, { nearEnd: true }),
      () => repeatOrNotItem(rng),
      () => (rng.chance(0.5) ? findItem(rng, { skin: rng.pick(REPAIR_TRANSFER), nearEnd: rng.chance(0.5), phase: 'transfer' }) : fixItem(rng, { skin: rng.pick(REPAIR_TRANSFER), phase: 'transfer' })),
    ]),
    `${L2}-p`,
  );
}

/** Echo Bells: explain, a faded rebuild, the same task with no frame, same pieces in another structure (the trap), a transfer. */
function echoPack(rng: Rng): Item[] {
  return ids(
    distinctSet([
      () => echoWhyItem(rng),
      () => rebuildItem(rng, { framed: true }),
      () => rebuildItem(rng, {}),
      () => matchItem(rng, { from: 'abc', to: 'sounds', trap: true }),
      () => matchItem(rng, { from: rng.pick(ECHO_TRANSFER), to: rng.pick(['colors', 'bells', 'sounds'] as const), phase: 'transfer' }),
    ]),
    `${L3}-p`,
  );
}

/** Mark a set's items as a delayed review (the routine strip lights all six moves). */
const asReview = (items: Item[]): Item[] => items.map((it) => ({ ...it, phase: 'review', ...(it.meta ? { meta: { ...it.meta, phase: 'review' as const } } : {}) }));

/** The 3-item primer for a place that needs Star Chain: box the unit, its length, a far position. */
function unitPrimer(lesson: string) {
  return (rng: Rng): Item[] =>
    ids(
      distinctSet([
        () => unitItem(rng, { trap: true }),
        () => unitLengthItem(rng, {}),
        () => positionItem(rng, { ask: 'far' }),
      ]),
      `${lesson}-primer-`,
    );
}

const star: LessonDef = {
  id: L1,
  title: 'Star Chain',
  routine: true,
  track: 1,
  levels: [1, 2],
  plain: 'Repeating units',
  requires: [],
  ideas: STAR_IDEAS,
  drill: [starBoard(), starTwinBoard()],
  practice: starPack,
  practiceAt: (rng, level) => (level <= 1 ? starPackL1(rng) : starPack(rng)),
  review: (rng) =>
    ids(asReview(distinctSet([
      () => positionItem(rng, { ask: 'far' }),
      () => unitItem(rng, { trap: true }),
      () => unitWhyItem(rng),
      () => unitLengthItem(rng, { skin: rng.pick(STAR_TRANSFER) }),
    ])), `${L1}-review-`),
  independent: (rng) =>
    ids(distinctSet([
      () => unitWhyItem(rng),
      () => positionItem(rng, { ask: 'next' }),
      () => positionItem(rng, { ask: 'far' }),
      () => unitItem(rng, { trap: true }),
      () => unitLengthItem(rng, {}),
      () => positionItem(rng, { ask: 'far', skin: rng.pick(STAR_TRANSFER), phase: 'transfer' }),
    ]), `${L1}-independent-`),
  pass: { firstTry: 3, include: [LONGER_BLOCK] },
};

const repair: LessonDef = {
  id: L2,
  title: 'Repair Bench',
  routine: true,
  track: 1,
  levels: [2, 2],
  plain: 'Repeating units: repair',
  requires: [L1],
  primer: unitPrimer(L2),
  ideas: REPAIR_IDEAS,
  drill: [repairBoard(), repairTwinBoard()],
  practice: repairPack,
  review: (rng) =>
    ids(asReview(distinctSet([
      () => findItem(rng, { nearEnd: true }),
      () => fixItem(rng, {}),
      () => repeatOrNotItem(rng),
      () => repairWhyItem(rng),
    ])), `${L2}-review-`),
  independent: (rng) =>
    ids(distinctSet([
      () => repairWhyItem(rng),
      () => fixItem(rng, {}),
      () => findItem(rng, { nearEnd: true }),
      () => findItem(rng, { nearEnd: false }),
      () => repeatOrNotItem(rng, { answer: 'no' }),
      () => findItem(rng, { skin: rng.pick(REPAIR_TRANSFER), nearEnd: true, phase: 'transfer' }),
    ]), `${L2}-independent-`),
  pass: { firstTry: 3, include: [NEAR_END] },
};

const echo: LessonDef = {
  id: L3,
  title: 'Echo Bells',
  routine: true,
  track: 1,
  levels: [2, 2],
  plain: 'Repeating units: same structure',
  requires: [L1],
  primer: unitPrimer(L3),
  ideas: ECHO_IDEAS,
  drill: [echoBoard(), echoTwinBoard()],
  practice: echoPack,
  review: (rng) =>
    ids(asReview(distinctSet([
      () => echoWhyItem(rng),
      () => rebuildItem(rng, {}),
      () => matchItem(rng, { from: 'abc', to: 'sounds', trap: true }),
      () => matchItem(rng, { from: rng.pick(ECHO_TRANSFER), to: rng.pick(['colors', 'bells'] as const) }),
    ])), `${L3}-review-`),
  independent: (rng) =>
    ids(distinctSet([
      () => echoWhyItem(rng),
      () => rebuildItem(rng, {}),
      () => rebuildItem(rng, {}),
      () => matchItem(rng, { from: 'abc', to: 'sounds', trap: true }),
      () => matchItem(rng, { from: 'colors', to: 'bells' }),
      () => matchItem(rng, { from: rng.pick(ECHO_TRANSFER), to: rng.pick(['colors', 'sounds'] as const), phase: 'transfer' }),
    ]), `${L3}-independent-`),
  pass: { firstTry: 3, include: [SAME_PIECES] },
};

// ---------- the Ring Check, the Arcade, new examples, the diagnostic ----------

/** The Ring Check: 9 fresh items, three per place; each place's trap is a conflict item. */
function check(rng: Rng): Item[] {
  const made = distinctSet([
    () => ({ ...unitItem(rng, { trap: true }), conflict: true }),
    () => positionItem(rng, { ask: 'far' }),
    () => unitLengthItem(rng, { skin: rng.pick([...BASE_SKINS, ...STAR_TRANSFER]) }),
    () => ({ ...findItem(rng, { nearEnd: true }), conflict: true }),
    () => fixItem(rng, {}),
    () => repeatOrNotItem(rng),
    () => ({ ...matchItem(rng, { from: 'abc', to: 'sounds', trap: true }), conflict: true }),
    () => rebuildItem(rng, {}),
    () => matchItem(rng, { from: rng.pick(ECHO_TRANSFER), to: rng.pick(['colors', 'bells'] as const) }),
  ]);
  return ids(made, `s${STOP}-c`);
}

/** One Arcade item from any place (never a faded one). */
function arcade(rng: Rng): Item {
  const makers: (() => Item)[] = [
    () => positionItem(rng, { ask: rng.pick(['next', 'far'] as const) }),
    () => unitItem(rng, { trap: rng.chance(0.7) }),
    () => unitLengthItem(rng, {}),
    () => findItem(rng, { nearEnd: rng.chance(0.6) }),
    () => fixItem(rng, {}),
    () => repeatOrNotItem(rng),
    () => rebuildItem(rng, {}),
    () => matchItem(rng, { from: 'abc', to: 'sounds', trap: true }),
  ];
  return { ...rng.pick(makers)(), id: `s${STOP}-arcade` };
}

/**
 * New examples after a miss. A missed unit gets a chain where a longer block also fits and one where it does not; a
 * missed break gets one near the end and one in the middle; a missed "repeating or not" gets one of each answer.
 * Everything else: [] (the default: one item with the same skill).
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const set = (xs: (() => Item)[]) => ids(distinctSet(xs), 'new-');
  switch (missed.skill) {
    case 's14.unit':
      return set([() => unitItem(rng, { trap: true }), () => unitItem(rng, { trap: false })]);
    case 's14.repair-find':
      return set([() => findItem(rng, { nearEnd: true }), () => findItem(rng, { nearEnd: false })]);
    case 's14.is-repeat':
      return set([() => repeatOrNotItem(rng, { answer: 'no' }), () => repeatOrNotItem(rng, { answer: 'yes' })]);
    default:
      return [];
  }
}

/** Track 1 diagnostic items: L1 extend a chain made by repeating two pieces; L2 box the unit of an ABB chain. */
function diagnostic(rng: Rng, track: 1 | 2 | 3 | 4, level: 1 | 2 | 3 | 4): Item | null {
  if (track !== 1) return null;
  if (level === 1) return { ...positionItem(rng, { ask: 'next', pattern: 'AB' }), id: `s${STOP}-diag-1` };
  if (level === 2) return { ...unitItem(rng, { trap: true, pattern: 'ABB' }), id: `s${STOP}-diag-2` };
  return null;
}

export const SKILL_NAMES_S14: Record<string, string> = {
  's14.unit-why': 'Why a block is not the unit',
  's14.extend': 'Extend a repeating chain',
  's14.unit': 'Shortest repeating unit',
  's14.repair-why': 'Why a piece breaks the rule',
  's14.repair-find': 'Find the broken position',
  's14.repair-fix': 'Fix a broken position',
  's14.is-repeat': 'Repeating or not',
  's14.echo-why': 'Why two blocks match',
  's14.translate': 'Same structure, new pieces',
};

/** The fixed worked examples, for the tests: their chains must say what the cards say. */
export const S14_EXAMPLES = { STAR, FAR, SEEN, REPAIR, LATE, RANDOM, REPAIR_TWIN, TWIN4, ECHO, READ, OTHER, DANCE } as const;

export const stop14: StopDef = {
  n: STOP,
  id: 's14',
  title: 'First Lights',
  idea: 'A repeating chain follows a block. Find the shortest block that repeats all the way.',
  ready: true,
  lessons: [star, repair, echo],
  check,
  practice: arcade,
  fresh,
  requires: [],
  lessonOrder: 'free',
  skillNames: SKILL_NAMES_S14,
  observatory: { ring: 1, track: 1, plain: 'Repeating units', diagnostic },
};
