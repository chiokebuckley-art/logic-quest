/**
 * Stop 3 · Line Up.
 *
 * Five lessons: chains ("taller than" carries along), "before" vs "right before", spot clues (not
 * first, not last, next to, between), building a whole line, and spotting a clue that is not
 * needed. Every item comes from ../engine/puzzles/lineup.ts, which finds each answer by listing
 * every order that fits the clues. Skins: everyday (race, heights, lunch line), fantasy (dragons,
 * robot parade, broom race) and abstract (letters in a row).
 *
 * Every lesson is taught See -> Do -> Quiz (the skill-drill handoff): a key-idea card with one case already marked
 * on its clue board, guided boards the learner marks by taps (LessonDef.drill, built by the engine's board helpers
 * so every mark is computed), then quiz items of only the clue kinds those taught. "Not next to" is taught nowhere,
 * so it is in no lesson, check, Arcade item or new example; clues that name a spot (first, last) come only after
 * lesson 4 teaches them.
 */
import {
  CANT,
  ORDERLY,
  SKIN_IDS,
  TAUGHT_TYPES,
  boardScene,
  lineScene,
  boardTexts,
  buildPuzzle,
  chainPuzzle,
  compareMark,
  coverRow,
  extraCluePuzzle,
  lineRow,
  placeRow,
  spotPuzzle,
  statusPuzzle,
  statusRow,
  trialRow,
  unnamed,
  whereMark,
  whoMark,
  boardName,
  type ClueType,
  type LineBoard,
  type SkinId,
  type SpotFocus,
  type Status,
} from '../engine/puzzles/lineup';
import type { DrillStep, Item, LessonDef, LineClue, Rng, StopDef } from '../engine/types';

const EVERYDAY: readonly SkinId[] = ['race', 'height', 'line'];
const FANTASY: readonly SkinId[] = ['dragons', 'robots', 'brooms'];
const ORDERLY_EVERYDAY: readonly SkinId[] = ['race', 'line'];
const ORDERLY_FANTASY: readonly SkinId[] = ['robots', 'brooms'];

/** Skins for a practice set: everyday, fantasy, abstract, then any, in a shuffled order. */
function practiceSkins(rng: Rng, count: number, orderly: boolean): SkinId[] {
  const every = orderly ? ORDERLY_EVERYDAY : EVERYDAY;
  const fant = orderly ? ORDERLY_FANTASY : FANTASY;
  const any = orderly ? ORDERLY : SKIN_IDS;
  const base: SkinId[] = [rng.pick(every), rng.pick(fant), 'letters'];
  while (base.length < count) base.push(rng.pick(any));
  return rng.shuffle(base.slice(0, count));
}

/** The same skins with one that is not the board's skin first, so try 1 is a new skin. No new draws. */
function newSkinFirst(skins: SkinId[], board: SkinId): SkinId[] {
  const j = skins.findIndex((s) => s !== board);
  if (j <= 0) return skins;
  const out = [...skins];
  [out[0], out[j]] = [out[j], out[0]];
  return out;
}

/**
 * Make items in order, drawing again whenever one has the same prompt and scene as an earlier one,
 * so no set shows the same puzzle twice. Sets with no repeat come out exactly as before.
 */
function distinct(makers: readonly (() => Item)[]): Item[] {
  const seen = new Set<string>();
  return makers.map((make) => {
    let item = make();
    // A repeat is rare and a redraw almost never repeats again; the cap only guards against a loop.
    for (let tries = 0; tries < 100 && seen.has(JSON.stringify([item.prompt, item.scene])); tries++) item = make();
    seen.add(JSON.stringify([item.prompt, item.scene]));
    return item;
  });
}

const L1 = 's3.l1';
const L2 = 's3.l2';
const L3 = 's3.l3';
const L4 = 's3.l4';
const L5 = 's3.l5';

// ---------- the clue kinds each lesson's quiz may use ----------

/** Lesson 2 teaches "before" and "right before" clues; no clue that names a spot. */
export const L2_TYPES: readonly ClueType[] = ['before', 'rightBefore'];
/** Lesson 3: its own clues (not first, not last, next to, between) and the earlier "before" and "right before". */
export const L3_TYPES: readonly ClueType[] = ['notFirst', 'notLast', 'nextTo', 'between', 'before', 'rightBefore'];
/** Lesson 4's first quiz uses the kinds of clue its worked example and boards use: "before" and a named spot. */
export const L4_FIRST_TYPES: readonly ClueType[] = ['before', 'first', 'last', 'place'];

const before = (a: string, b: string): LineClue => ({ t: 'before', a, b });
const rightBefore = (a: string, b: string): LineClue => ({ t: 'rightBefore', a, b });
const ABC = ['ava', 'ben', 'cal'];
/** “Ava is taller than Ben.” “Ben is taller than Cal.” as a quoted run, the way a row label quotes clues. */
const quoted = (b: LineBoard) => boardTexts(b).map((t) => `“${t}”`).join(' ');

/**
 * What a twin board changed, worked out from the two boards: “Ben is taller than Cal” is now “Cal is taller than
 * Ava.” It goes in DrillStep.twin, which the board draws (“What changed”) and reads aloud.
 */
function changedClue(card: LineBoard, twin: LineBoard, lead: string): string {
  const was = boardTexts(card);
  const now = boardTexts(twin);
  const gone = was.filter((t) => !now.includes(t));
  const added = now.filter((t) => !was.includes(t));
  if (gone.length !== 1 || added.length !== 1) throw new Error('a twin board changes exactly one clue');
  return `${lead} “${gone[0].slice(0, -1)}” is now “${added[0]}”`;
}

/** A row that adds one clue to a board: its label quotes the new clue. */
const plusClue = (b: LineBoard, c: LineClue): LineBoard => ({ ...b, clues: [...b.clues, c] });
const addedLabel = (b: LineBoard, c: LineClue) => `Now add a clue: “${boardTexts(plusClue(b, c)).slice(-1)[0]}”`;

// ---------- lesson 1: chains ----------

/** See: the chain on “Follow the chain” (Ava, then Ben, then Cal). */
export const L1_CHAIN: LineBoard = { skin: 'height', ids: ABC, clues: [before('ava', 'ben'), before('ben', 'cal')] };
/** See: “When you can’t tell” (no clue compares Ava and Cal). */
export const L1_CANT: LineBoard = { skin: 'height', ids: ABC, clues: [before('ava', 'ben'), before('cal', 'ben')] };
/** Do: the handoff's chain, a twin of the card's with one clue changed: Cal, then Ava, then Ben. */
export const L1_DO: LineBoard = { skin: 'height', ids: ABC, clues: [before('cal', 'ava'), before('ava', 'ben')] };
/** Do: the handoff's non-chain, the same names with clue 2 taken away. Nothing compares Ben with anyone. */
export const L1_NOCHAIN: LineBoard = { ...L1_DO, clues: [L1_DO.clues[0]] };
/** What the twin changed, in words the board shows: one clue of the card's chain. */
const L1_TWIN = changedClue(L1_CHAIN, L1_DO, 'One clue changed.');

/**
 * Do: one board. The card's chain is shown placed. The learner places the new chain, then marks the non-chain:
 * the pair the clue compares, the pair it does not (Can't tell), and who is the tallest (Can't tell).
 */
export const L1_DRILL: DrillStep = {
  id: 's3.l1-do',
  title: 'Place the line',
  body: [
    'The chain from the card is shown in place: Ava, then Ben, then Cal.',
    'Put each friend in a spot for the new clues.',
    'Then one clue is taken away. Mark what you can still tell.',
  ],
  scene: boardScene(L1_DO),
  twin: L1_TWIN,
  rows: [
    placeRow(L1_CHAIN, { id: 'card', label: `On the card: ${quoted(L1_CHAIN)}`, given: true }),
    placeRow(L1_DO, { id: 'chain', label: 'Now use the two clues above. Who goes in each spot?' }),
    {
      id: 'nochain',
      label: `Take away clue 2, ${quoted({ ...L1_DO, clues: [L1_DO.clues[1]] })} Only clue 1 is left: ${quoted(L1_NOCHAIN)}`,
      marks: [compareMark(L1_NOCHAIN, 'cal', 'ava', 'nochain-1'), compareMark(L1_NOCHAIN, 'ava', 'ben', 'nochain-2'), whoMark(L1_NOCHAIN, 1, 'nochain-3')],
      note: `No clue names ${unnamed(L1_NOCHAIN).map(boardName).join(' or ')}. So no clue compares ${unnamed(L1_NOCHAIN).map(boardName).join(' or ')} with anyone.`,
    },
  ],
  done: 'Right. A chain puts everyone in order. When no clue compares two people, you can’t tell.',
};

// ---------- lesson 2: before vs right before ----------

/** See: “One clue, three orders” (a “before” clue: Cal may finish in between). */
export const L2_EXAMPLE: LineBoard = { skin: 'race', ids: ABC, clues: [before('ava', 'ben')] };
/** See: “Right before” (no one finished between). */
export const L2_RIGHT: LineBoard = { skin: 'race', ids: ABC, clues: [rightBefore('ava', 'ben')] };

/**
 * Do: first the “before” board. Ava, Cal, Ben is shown marked; the learner marks “before” and “right before” as two
 * separate taps on the other two orders, then must / might / can't. Then the “right before” board: the clue
 * itself says “right before”, and the learner tests two orders and says what must be true.
 */
export const L2_DRILL: DrillStep[] = [
  {
    id: 's3.l2-do',
    title: 'Before or right before?',
    body: [
      'These are the three orders from the card. The order Ava, Cal, Ben is already marked.',
      'Mark each sentence True or False for the other two orders. Then say if each sentence must, might or can’t be true.',
    ],
    scene: boardScene(L2_EXAMPLE),
    rows: [
      lineRow(L2_EXAMPLE, ['ava', 'cal', 'ben'], { id: 'acb', given: true, clues: false, sentences: [before('ava', 'ben'), rightBefore('ava', 'ben')] }),
      lineRow(L2_EXAMPLE, ['ava', 'ben', 'cal'], { id: 'abc', clues: false, sentences: [before('ava', 'ben'), rightBefore('ava', 'ben')] }),
      lineRow(L2_EXAMPLE, ['cal', 'ava', 'ben'], { id: 'cab', clues: false, sentences: [before('ava', 'ben'), rightBefore('ava', 'ben')] }),
      statusRow(L2_EXAMPLE, [rightBefore('ava', 'ben'), before('ava', 'ben'), before('ben', 'ava')], { id: 'status' }),
    ],
    done: 'Right. “Before” lets someone finish in between. “Right before” does not. They are two different taps.',
  },
  {
    id: 's3.l2-do2',
    title: 'A “right before” clue',
    body: [
      'These are the clue and runners from the “Right before” card. The order Ava, Ben, Cal is already marked.',
      'Test two more orders against the clue. Then say what must be true.',
    ],
    scene: boardScene(L2_RIGHT),
    rows: [
      lineRow(L2_RIGHT, ['ava', 'ben', 'cal'], { id: 'abc', given: true, decide: 'order' }),
      lineRow(L2_RIGHT, ['ava', 'cal', 'ben'], { id: 'acb', decide: 'order' }),
      lineRow(L2_RIGHT, ['cal', 'ava', 'ben'], { id: 'cab', decide: 'order' }),
      statusRow(L2_RIGHT, [before('ava', 'ben'), before('cal', 'ben')], { id: 'status' }),
    ],
    done: 'Right. When the clue says “right before,” no one is in between. So “before” must be true too.',
  },
];

// ---------- lesson 3: not first, not last, next to, between ----------

/** See: “Try each spot” (Eli, Fay and Gus; Eli is not first and not last). */
export const L3_EXAMPLE: LineBoard = { skin: 'race', ids: ['eli', 'fay', 'gus'], clues: [{ t: 'notFirst', a: 'eli' }, { t: 'notLast', a: 'eli' }] };
/** Do: the same two clues with a fourth runner, Hana. The clue words do not change. */
export const L3_FOUR: LineBoard = { ...L3_EXAMPLE, ids: ['eli', 'fay', 'gus', 'hana'] };
/** See: “Next to” (Ava and Ben, either order). */
export const L3_NEXT: LineBoard = { skin: 'race', ids: ABC, clues: [{ t: 'nextTo', a: 'ava', b: 'ben' }] };
/** See: “Between” (Cal is in the middle; who is first is open). */
export const L3_BETWEEN: LineBoard = { skin: 'race', ids: ABC, clues: [{ t: 'between', a: 'cal', b: 'ava', c: 'ben' }] };
/** Do: the clue added to the “Next to” board. With it, Cal can only be first. */
export const L3_NEXT_ADD = before('cal', 'ben');
/** Do: the clue added to the “Between” board. With it, Ben can only be last. */
export const L3_BETWEEN_ADD = before('ava', 'ben');

/**
 * Do: one board per kind of clue the quiz uses, each the board of its own card. Try each spot (Eli second shown;
 * Eli first and last to mark; then four runners, where Eli is Can't tell). Next to (Cal second shown; Cal first
 * and last, then where Cal finished: Can't tell; with one more clue, first). Between (Ava first shown; Cal first
 * and Ben first, then who finished first: Can't tell; with one more clue, who finished last: Ben). No board asks
 * what its card already said, and each of the last two decides one question, so tapping Can't tell on every
 * question never passes.
 */
export const L3_DRILL: DrillStep[] = [
  {
    id: 's3.l3-do',
    title: 'Try each spot',
    body: [
      'These are the clues from the card. The try with Eli second is already marked.',
      'Now try Eli first and Eli last. Mark each clue True or False. Then keep the try or cross it out.',
    ],
    scene: boardScene(L3_EXAMPLE),
    rows: [
      trialRow(L3_EXAMPLE, 'eli', 2, { id: 'eli2', given: true }),
      trialRow(L3_EXAMPLE, 'eli', 1, { id: 'eli1' }),
      trialRow(L3_EXAMPLE, 'eli', 3, { id: 'eli3' }),
      { id: 'four', label: 'Now Hana runs too. That makes four runners, with the same two clues.', marks: [whereMark(L3_FOUR, 'eli', 'four-where')] },
    ],
    done: 'Right. With three runners, only the middle spot is left. With four runners, two spots are left, so you can’t tell.',
  },
  {
    id: 's3.l3-do2',
    title: 'Next to',
    body: [
      'These are the clue and runners from the “Next to” card. The try with Cal second is already marked.',
      'Now try Cal first and Cal last. Then say where Cal finished. “Can’t tell” is a real answer. Then one clue is added.',
    ],
    scene: boardScene(L3_NEXT),
    rows: [
      trialRow(L3_NEXT, 'cal', 2, { id: 'cal2', given: true }),
      trialRow(L3_NEXT, 'cal', 1, { id: 'cal1' }),
      trialRow(L3_NEXT, 'cal', 3, { id: 'cal3' }),
      { id: 'ask', label: 'Now use your marks.', marks: [whereMark(L3_NEXT, 'cal', 'ask-where')] },
      { id: 'add', label: addedLabel(L3_NEXT, L3_NEXT_ADD), marks: [whereMark(plusClue(L3_NEXT, L3_NEXT_ADD), 'cal', 'add-where')] },
    ],
    done: 'Right. “Next to” does not say who is ahead. So Cal could be first or last. One more clue can decide it.',
  },
  {
    id: 's3.l3-do3',
    title: 'Between',
    body: [
      'These are the clue and runners from the “Between” card. The try with Ava first is already marked.',
      'Now try Cal first and Ben first. Then say who finished first. Then one clue is added.',
    ],
    scene: boardScene(L3_BETWEEN),
    rows: [
      trialRow(L3_BETWEEN, 'ava', 1, { id: 'ava1', given: true }),
      trialRow(L3_BETWEEN, 'cal', 1, { id: 'cal1' }),
      trialRow(L3_BETWEEN, 'ben', 1, { id: 'ben1' }),
      { id: 'ask', label: 'Now use your marks.', marks: [whoMark(L3_BETWEEN, 1, 'ask-who')] },
      { id: 'add', label: addedLabel(L3_BETWEEN, L3_BETWEEN_ADD), marks: [whoMark(plusClue(L3_BETWEEN, L3_BETWEEN_ADD), 3, 'add-who')] },
    ],
    done: 'Right. “Between” puts Cal in the middle. It does not say who finished first. One more clue can decide it.',
  },
];

// ---------- lesson 4: build the whole line ----------

/** See: “A worked example” (Cal last, then Ava before Ben: Ava, Ben, Cal). */
export const L4_EXAMPLE: LineBoard = { skin: 'race', ids: ABC, clues: [{ t: 'last', a: 'cal' }, before('ava', 'ben')] };
/** Do: a twin with clue 1 changed: Cal finished first. Only Cal, Ava, Ben fits. */
export const L4_TWIN: LineBoard = { ...L4_EXAMPLE, clues: [{ t: 'first', a: 'cal' }, L4_EXAMPLE.clues[1]] };
/** What the twin changed, in words the board shows. */
const L4_CHANGE = changedClue(L4_EXAMPLE, L4_TWIN, 'Clue 1 changed.');

/** Do: test lines on the card's board (Ava, Ben, Cal shown), then build the line of a twin board. */
export const L4_DRILL: DrillStep[] = [
  {
    id: 's3.l4-do',
    title: 'Test a line',
    body: [
      'These are the clues from the card. The line Ava, Ben, Cal is already tested.',
      'Test two more lines. Mark each clue True or False. Then say if the line fits.',
    ],
    scene: boardScene(L4_EXAMPLE),
    rows: [
      lineRow(L4_EXAMPLE, ['ava', 'ben', 'cal'], { id: 'abc', given: true, decide: 'line' }),
      lineRow(L4_EXAMPLE, ['ben', 'ava', 'cal'], { id: 'bac', decide: 'line' }),
      lineRow(L4_EXAMPLE, ['ava', 'cal', 'ben'], { id: 'acb', decide: 'line' }),
    ],
    done: 'Right. A line fits only when every clue is true. One false clue is enough to break it.',
  },
  {
    id: 's3.l4-do2',
    title: 'Build a line',
    body: ['Start with the clue that names a spot. Then put each runner in a spot.'],
    scene: boardScene(L4_TWIN),
    twin: L4_CHANGE,
    rows: [placeRow(L4_TWIN, { id: 'build', label: 'Who goes in each spot?' })],
    done: 'Right. Cal goes first. Then “Ava finished before Ben” puts Ava second and Ben last.',
  },
];

// ---------- lesson 5: which clue wasn't needed? ----------

/** See: “An example” (clues 1 and 2 make a chain, so clue 3 is not needed). */
export const L5_EXAMPLE: LineBoard = { skin: 'height', ids: ABC, clues: [before('ava', 'ben'), before('ben', 'cal'), before('ava', 'cal')] };

/** Do: the card's board. Clue 3 is shown covered; the learner covers clue 1, then clue 2. */
export const L5_DRILL: DrillStep = {
  id: 's3.l5-do',
  title: 'Cover a clue',
  body: [
    'These are the clues from the card. Clue 3 is already covered and checked.',
    'Now cover clue 1, then clue 2. Find the other order that fits, if there is one. Orders go from tallest to shortest.',
  ],
  scene: boardScene(L5_EXAMPLE),
  rows: [coverRow(L5_EXAMPLE, 2, { id: 'cover3', given: true }), coverRow(L5_EXAMPLE, 0, { id: 'cover1' }), coverRow(L5_EXAMPLE, 1, { id: 'cover2' })],
  done: 'Right. Only clue 3 can be covered and still leave one order. So clue 3 is the clue that is not needed.',
};

// ---------- lessons ----------

/** Lesson 3's quiz plan entries. */
type SpotPlan = { conflict?: 'ends' | 'between'; cantTell?: boolean; q?: 'where' | 'who'; n?: number; focus?: SpotFocus; types?: readonly ClueType[] };

/** Lesson 3's first quiz: the clue kinds of its first board only. */
export const L3_FIRST_TYPES: readonly ClueType[] = ['notFirst', 'notLast'];

const lessons: LessonDef[] = [
  {
    id: L1,
    title: 'Chains',
    ideas: [
      {
        title: 'Clues about order',
        body: [
          'Some puzzles ask you to put people in order.',
          'Each clue compares two people. For example: “Ava is taller than Ben.”',
          'Your job is to find what the clues prove. You also need to see what they do not prove.',
        ],
      },
      {
        title: 'Follow the chain',
        // See: Ava, Ben and Cal already standing in line, tallest first, with both clues marked as holding.
        scene: lineScene(L1_CHAIN, ['ava', 'ben', 'cal']),
        body: [
          'Ava is taller than Ben. Ben is taller than Cal.',
          'So Ava must be taller than Cal too. No clue says it, but the two clues prove it.',
          'Clues that link up like this make a chain. Follow it from one end to the other. Tallest first, the line is Ava, Ben, Cal.',
        ],
      },
      {
        title: 'Who is first or last?',
        body: [
          'To find the tallest, cross out anyone who is shorter than someone. If just one person is left, that person is the tallest.',
          'To find the shortest, cross out anyone who is taller than someone.',
          'In a race, cross out anyone who finished after someone. The one left finished first.',
        ],
      },
      {
        title: 'When you can’t tell',
        scene: boardScene(L1_CANT),
        body: [
          'Ava is taller than Ben. Cal is taller than Ben. Who is the tallest?',
          'Ava might be. Cal might be. No clue compares Ava and Cal.',
          'So the right answer is “Can’t tell.” That is a real answer. It is not giving up.',
        ],
      },
      {
        title: 'Trust only the clues',
        body: [
          'The name you read first is not always first in line.',
          'Before you answer, ask: do the clues prove it?',
          'If a different order also fits the clues, you can’t tell.',
        ],
      },
    ],
    drill: [L1_DRILL],
    /**
     * Quiz: chains and can't-tell only. Try 1 is a new chain in a new skin (three people, who is first). Try 2 is a
     * twin of the board's non-chain (Can't tell). Then one of each kind, in any order, either end, three or four people.
     */
    practice: (rng) => {
      const skins = newSkinFirst(practiceSkins(rng, 4, false), L1_DO.skin);
      const rest = rng.shuffle([false, true]);
      const plan: { cantTell: boolean; ask?: 'first' | 'last'; n?: number }[] = [
        { cantTell: false, ask: 'first', n: 3 },
        { cantTell: true, ask: 'first', n: 3 },
        { cantTell: rest[0] },
        { cantTell: rest[1] },
      ];
      return distinct(skins.map((skin, i) => () => chainPuzzle(rng, { id: `l1-${i + 1}`, skin, ...plan[i] }).item));
    },
    pass: { firstTry: 3, include: [{ tag: 'cant-tell', label: 'a can’t-tell puzzle' }] },
  },
  {
    id: L2,
    title: 'Before vs right before',
    ideas: [
      {
        title: 'Before',
        // See: before, with someone between. Cal finished between Ava and Ben, and the clue still holds.
        scene: lineScene(L2_EXAMPLE, ['ava', 'cal', 'ben']),
        body: [
          '“Ava finished before Ben” means Ava crossed the line sooner.',
          'Other runners may have finished between them. “Before” means anywhere earlier.',
          'Here Cal finished between Ava and Ben. The clue still holds.',
        ],
      },
      {
        title: 'Right before',
        scene: boardScene(L2_RIGHT),
        body: [
          '“Ava finished right before Ben” means no one finished between them.',
          'Ava is just one place ahead of Ben. “Right before” means directly before.',
          'The order Ava, Ben, Cal fits this clue. No one finished between Ava and Ben there.',
        ],
      },
      {
        title: 'One clue, three orders',
        scene: boardScene(L2_EXAMPLE),
        body: [
          'Ava, Ben and Cal ran a race. The clue says Ava finished before Ben.',
          'The order Ava, Ben, Cal fits. So do Ava, Cal, Ben and Cal, Ava, Ben.',
          'In the second one, Cal is between them. So Ava may not be right before Ben.',
        ],
      },
      {
        title: 'Must, might, can’t',
        body: [
          'A sentence must be true if it is true in every order that fits the clues.',
          'It might be true if it is true in some of those orders, but not all.',
          'It can’t be true if it is true in none of them.',
        ],
      },
      {
        title: 'Other words, same idea',
        body: [
          'Lines and rows use other words for the same idea.',
          '“Somewhere in front of” and “somewhere to the left of” work like “before.”',
          '“Right in front of” and “directly to the left of” work like “right before.”',
        ],
      },
    ],
    drill: L2_DRILL,
    /**
     * Quiz: must / might / can't with "before" and "right before" clues only. Try 1 is the twin of the first board
     * (a "before" clue and a "right before" sentence) in a new skin. Then a must, a can't and one more, in any order.
     */
    practice: (rng) => {
      const skins = newSkinFirst(practiceSkins(rng, 4, true), L2_EXAMPLE.skin);
      const rest: { target: Status }[] = rng.shuffle([
        { target: 'must' as Status },
        { target: 'cant' as Status },
        { target: rng.pick(['must', 'might', 'cant'] as const) },
      ]);
      const plan: { conflict?: boolean; target?: Status; n?: number }[] = [{ conflict: true, n: 3 }, ...rest];
      return distinct(skins.map((skin, i) => () => statusPuzzle(rng, { id: `l2-${i + 1}`, skin, types: L2_TYPES, ...plan[i] }).item));
    },
    pass: { firstTry: 3, include: [{ tag: 'before-trap', label: 'a “before” clue with a “right before” sentence' }] },
  },
  {
    id: L3,
    title: 'Not first, not last, next to, between',
    ideas: [
      {
        title: 'Not first, not last',
        body: [
          '“Eli is not first” rules out just one spot. Eli could be in any other spot.',
          'With three people, “not first” and “not last” leave only the middle.',
          'With four people, they leave two spots. Then you can’t tell which one.',
        ],
      },
      {
        title: 'Next to',
        scene: boardScene(L3_NEXT),
        body: [
          '“Ava and Ben are next to each other” means no one stands between them. In a race, the clue says: “No one finished between Ava and Ben.”',
          'It does not say who is ahead. The order Ava, Ben, Cal fits. So does Ben, Ava, Cal.',
          'The order Ava, Cal, Ben does not fit. Cal finished between Ava and Ben, so the clue is false there.',
        ],
      },
      {
        title: 'Between',
        scene: boardScene(L3_BETWEEN),
        body: [
          '“Cal finished somewhere between Ava and Ben” means one of them finished ahead of Cal. The other one finished behind Cal.',
          'It does not say which one is ahead. The order Ava, Cal, Ben fits. So does Ben, Cal, Ava.',
          'So Cal is not at either end. With three runners, Cal must be in the middle.',
        ],
      },
      {
        title: 'Try each spot',
        scene: boardScene(L3_EXAMPLE),
        body: [
          'Eli, Fay and Gus ran a race. Where did Eli finish?',
          'Try Eli first. That makes the first clue false. We say it breaks the clue. Try Eli last. That breaks the second clue.',
          'Only the middle spot is left. If more than one spot were left, you could not tell.',
        ],
      },
    ],
    drill: L3_DRILL,
    /**
     * Quiz: only the clue kinds the boards marked (not first, not last, next to, between, with the earlier "before"
     * and "right before"). Try 1 is a twin of the first board: where is someone, three people, only "not first" and
     * "not last" clues, decided. Then a can't-tell trap (four people with not first and not last, or a "between"),
     * a next-to puzzle, and a decided "who" question, in any order. Every set has next to and between.
     */
    practice: (rng) => {
      const skins = newSkinFirst(practiceSkins(rng, 4, true), L3_EXAMPLE.skin);
      const trap = rng.pick(['ends', 'between'] as const);
      const rest: SpotPlan[] = rng.shuffle<SpotPlan>([
        { conflict: trap },
        { focus: 'nextTo', cantTell: rng.chance(0.5) },
        { q: 'who', cantTell: false, focus: trap === 'ends' ? 'between' : rng.pick(['ends', 'between'] as const) },
      ]);
      const plan: SpotPlan[] = [{ q: 'where', cantTell: false, n: 3, focus: 'ends', types: L3_FIRST_TYPES }, ...rest];
      return distinct(skins.map((skin, i) => () => spotPuzzle(rng, { id: `l3-${i + 1}`, skin, types: L3_TYPES, ...plan[i] }).item));
    },
    pass: { firstTry: 3, include: [{ tag: 'cant-tell', label: 'a can’t-tell puzzle' }] },
  },
  {
    id: L4,
    title: 'Build the whole line',
    ideas: [
      {
        title: 'The whole line',
        body: [
          'Now you will put everyone in order. Place each person in a spot.',
          'When you are done, every clue must be true.',
        ],
      },
      {
        title: 'Start with sure things',
        body: [
          'Look for a clue that names a spot, like first or last. Start by putting that person in that spot.',
          'Then use the other clues to fill in the gaps.',
        ],
      },
      {
        title: 'A worked example',
        scene: boardScene(L4_EXAMPLE),
        body: [
          'Ava, Ben and Cal ran a race.',
          'Cal finished last, so Cal goes in the last spot.',
          'Ava finished before Ben, so Ava is first and Ben is second.',
          'Check the line Ava, Ben, Cal. “Cal finished last” is true, and “Ava finished before Ben” is true.',
        ],
      },
      {
        title: 'Test and fix',
        body: [
          'Check your line against each clue, one at a time.',
          'A clue breaks when it is false for your line. Then move someone and check again.',
          'Good clues leave just one order that works.',
        ],
      },
    ],
    drill: L4_DRILL,
    /**
     * Quiz: build the whole line. Try 1 has three people and the clue kinds of the board (before, and a clue that
     * names a spot) in a new skin. Tries 2 and 3 have four and five people and any clue a lesson taught.
     */
    practice: (rng) => {
      const skins = newSkinFirst(practiceSkins(rng, 3, false), L4_EXAMPLE.skin);
      return distinct(skins.map((skin, i) => () => buildPuzzle(rng, { id: `l4-${i + 1}`, skin, n: i + 3, types: i === 0 ? L4_FIRST_TYPES : TAUGHT_TYPES }).item));
    },
  },
  {
    id: L5,
    title: 'Which clue wasn’t needed?',
    ideas: [
      {
        title: 'Extra clues',
        body: [
          'Sometimes a clue tells you nothing new. The other clues already prove it.',
          'We say that clue is not needed.',
        ],
      },
      {
        title: 'An example',
        scene: boardScene(L5_EXAMPLE),
        body: [
          'The first two clues make a chain: Ava, then Ben, then Cal.',
          'That chain already proves Ava is taller than Cal. So the third clue is not needed.',
          'Cover up clue 3. Clues 1 and 2 still give just one order: Ava, Ben, Cal.',
        ],
      },
      {
        title: 'How to test a clue',
        body: [
          'Cover up one clue. Do the other clues still give just one order?',
          'If they do, the clue you covered was not needed.',
          'If more than one order fits now, that clue was needed.',
        ],
      },
      {
        title: 'Why it matters',
        body: [
          'Good thinkers ask what each fact adds.',
          'A fact that repeats the others does not help you. Spotting it shows you how the clues fit together.',
        ],
      },
    ],
    drill: [L5_DRILL],
    /**
     * Quiz: which clue is not needed. Try 1 is a twin of the card in a new skin: three people, "before" clues only,
     * so the spare clue is the end of a chain. Tries 2 and 3 use any clue a lesson taught.
     */
    practice: (rng) => {
      const skins = newSkinFirst(practiceSkins(rng, 3, false), L5_EXAMPLE.skin);
      return distinct(skins.map((skin, i) => () => extraCluePuzzle(rng, { id: `l5-${i + 1}`, skin, ...(i === 0 ? { n: 3, types: ['before'] } : { types: TAUGHT_TYPES }) }).item));
    },
  },
];

/**
 * Nine items: two per lesson for lessons 1-4 and one for lesson 5. The first two are conflict items.
 * The "which clue wasn't needed?" item uses three people so it fits the check's timer. Each item uses only the
 * clue kinds its lesson's quiz uses, so the check never tests a clue no lesson taught.
 */
function check(rng: Rng): Item[] {
  const any = () => rng.pick(SKIN_IDS);
  const orderly = () => rng.pick(ORDERLY);
  return distinct([
    () => chainPuzzle(rng, { id: 'c1', skin: any(), cantTell: true }).item,
    () => chainPuzzle(rng, { id: 'c2', skin: any(), cantTell: false }).item,
    // Bare "before" (race skins) is where the misreading bites hardest.
    () => statusPuzzle(rng, { id: 'c3', skin: rng.pick(['race', 'brooms'] as const), conflict: true, types: L2_TYPES }).item,
    () => statusPuzzle(rng, { id: 'c4', skin: orderly(), target: rng.pick(['must', 'cant'] as const), types: L2_TYPES }).item,
    () => spotPuzzle(rng, { id: 'c5', skin: orderly(), types: L3_TYPES, ...(rng.chance(0.5) ? { conflict: rng.pick(['ends', 'between'] as const) } : { cantTell: false }) }).item,
    () => spotPuzzle(rng, { id: 'c6', skin: orderly(), types: L3_TYPES, cantTell: rng.chance(0.4) }).item,
    () => buildPuzzle(rng, { id: 'c7', skin: any(), n: 4, types: TAUGHT_TYPES }).item,
    () => buildPuzzle(rng, { id: 'c8', skin: any(), n: 4, types: TAUGHT_TYPES }).item,
    () => extraCluePuzzle(rng, { id: 'c9', skin: any(), n: 3, types: TAUGHT_TYPES }).item,
  ]);
}

/** One Arcade item from anywhere in the stop, with the clue kinds of its lesson. */
function arcade(rng: Rng): Item {
  const id = 'a1';
  switch (rng.int(1, 5)) {
    case 1: return chainPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), cantTell: rng.chance(0.4) }).item;
    case 2: return statusPuzzle(rng, { id, skin: rng.pick(ORDERLY), types: L2_TYPES, ...(rng.chance(0.3) ? { conflict: true } : {}) }).item;
    case 3: return spotPuzzle(rng, { id, skin: rng.pick(ORDERLY), types: L3_TYPES }).item;
    case 4: return buildPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), n: rng.pick([3, 4, 5]), types: TAUGHT_TYPES }).item;
    default: return extraCluePuzzle(rng, { id, skin: rng.pick(SKIN_IDS), types: TAUGHT_TYPES }).item;
  }
}

/**
 * New examples after a miss (engine/fresh.ts). Lessons 1 to 3 give a pair, in random order: one built the same
 * way as the missed item (same skill, same kind of answer), and its partner with the other kind of answer. A
 * missed “Can’t tell” is paired with a chain or spot that does decide, and a missed “must” or “can’t” with a
 * “might”, so repeating one answer never passes. Lessons 4 and 5 give one item of the same shape. Every new
 * example uses only the clue kinds of its lesson's quiz.
 * Returns [] when no match turns up, and the default (same skill from the lesson's practice) takes over.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const id = 'new';
  /** Draw until the skill matches the missed item's skill. */
  const same = (make: () => Item): Item | null => {
    for (let i = 0; i < 30; i++) {
      const item = make();
      if (item.skill === missed.skill) return item;
    }
    return null;
  };
  const pair = (a: Item | null, b: Item): Item[] => (a ? rng.shuffle([a, b]) : []);
  switch (missed.lesson) {
    case L1: {
      if (missed.kind !== 'choose') return [];
      const cant = missed.answer === CANT;
      return pair(
        same(() => chainPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), cantTell: cant }).item),
        chainPuzzle(rng, { id: `${id}b`, skin: rng.pick(SKIN_IDS), cantTell: !cant }).item,
      );
    }
    case L2: {
      if (missed.kind !== 'choose') return [];
      const was = missed.answer as Status;
      const opts: { conflict?: boolean; target?: Status } = missed.conflict ? { conflict: true } : { target: was };
      // The partner: a “might” for a missed “must” or “can’t”, and a “must” or “can’t” for a missed “might”.
      const other: Status = was === 'might' ? rng.pick(['must', 'cant'] as const) : 'might';
      return pair(
        same(() => statusPuzzle(rng, { id, skin: rng.pick(ORDERLY), types: L2_TYPES, ...opts }).item),
        statusPuzzle(rng, { id: `${id}b`, skin: rng.pick(ORDERLY), types: L2_TYPES, target: other }).item,
      );
    }
    case L3: {
      if (missed.kind !== 'choose') return [];
      const q: 'where' | 'who' = missed.choices.some((c) => c.id === 'p1') ? 'where' : 'who';
      const cant = missed.answer === CANT;
      const opts: SpotPlan = missed.conflict
        ? { conflict: missed.skill === 's3.between' ? 'between' : 'ends' }
        : { cantTell: cant, q };
      return pair(
        same(() => spotPuzzle(rng, { id, skin: rng.pick(ORDERLY), types: L3_TYPES, ...opts }).item),
        spotPuzzle(rng, { id: `${id}b`, skin: rng.pick(ORDERLY), types: L3_TYPES, cantTell: !cant, q }).item,
      );
    }
    case L4:
      return missed.kind === 'order' ? [buildPuzzle(rng, { id, skin: rng.pick(SKIN_IDS), n: missed.names.length, types: TAUGHT_TYPES }).item] : [];
    case L5:
      return [extraCluePuzzle(rng, { id, skin: rng.pick(SKIN_IDS), types: TAUGHT_TYPES }).item];
    default:
      return [];
  }
}

export const stop3: StopDef = {
  n: 3,
  id: 's3',
  title: 'Line Up',
  idea: 'If Ava is taller than Ben, and Ben is taller than Cal, then Ava is taller than Cal.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
};
