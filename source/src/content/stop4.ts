/**
 * Stop 4 · Grid Detective.
 *
 * Five lessons: ticks and crosses (what a logic grid is), only one left, spreading a tick along its row and
 * column, linking clues across two categories, and "no guessing" (which clue proves a mark, and whether the
 * clues so far are enough). Every item comes from ../engine/puzzles/grid.ts, which finds each answer by
 * listing every assignment that fits and checks that full grids can be solved without guessing. Skins:
 * everyday (kids, pets and snacks), fantasy (dragons, gems and caves; robots, colors and jobs) and abstract
 * (letters, numbers and colors).
 *
 * Every lesson is taught See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026): a key-idea card shows one case
 * already marked on its grid, a guided board (LessonDef.drill) keeps that grid up and the learner marks a new case
 * by taps, and only then does the quiz open, with twins of the same rule family. The boards are built by the
 * engine (gridBoard, cardBoard), so every mark and every reason for a wrong tap is computed, never written here.
 *
 * Every item also carries the teaching shown after a wrong answer (Item.teach and, on choose items, one
 * ChoiceFeedback per wrong choice), and its Hint shows one marked case (Item.hintCase), built and computed in the
 * engine. A miss gets new examples from fresh() below.
 */
import {
  BACK_FORTH_CONFUSED,
  BOX_VS_KID,
  BOX_VS_KID_CONFUSED,
  CANT,
  EVERYDAY,
  FANTASY,
  LINE_WORDS,
  LINK_WORDS,
  SKIN_IDS,
  cardBoard,
  cardCast,
  cardGrid,
  clueText,
  crossContrast,
  crossMixup,
  enoughPuzzle,
  gridBoard,
  gridPuzzle,
  linkPuzzle,
  markPuzzle,
  marksAsClues,
  onlyOnePuzzle,
  proofPuzzle,
  spreadPuzzle,
  type BoardAsk,
  type LinkMode,
  type MarkClue,
  type SkinId,
} from '../engine/puzzles/grid';
import type { Choice, DrillStep, GridClue, IdeaCard, Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

/** Skins for a practice set: everyday, fantasy, abstract, then any, in a shuffled order. */
function practiceSkins(rng: Rng, count: number): SkinId[] {
  const base: SkinId[] = [rng.pick(EVERYDAY), rng.pick(FANTASY), 'letters'];
  while (base.length < count) base.push(rng.pick(SKIN_IDS));
  return rng.shuffle(base.slice(0, count));
}

/**
 * Make items in order, drawing again whenever one looks the same as an earlier one (same prompt and scene),
 * so no set shows the same puzzle twice.
 */
function distinct(makers: readonly (() => Item)[]): Item[] {
  const seen = new Set<string>();
  const key = (it: Item) => JSON.stringify([it.prompt, it.scene ?? null]);
  return makers.map((make) => {
    let item = make();
    for (let tries = 0; tries < 100 && seen.has(key(item)); tries++) item = make();
    seen.add(key(item));
    return item;
  });
}

// ---------- worked examples on the idea cards (Mia, Leo and Ava; a cat, a dog and a fish) ----------

type GridScene = Extract<Scene, { kind: 'grid' }>;
const KIDS: Choice[] = [{ id: 'mia', label: 'Mia' }, { id: 'leo', label: 'Leo' }, { id: 'ava', label: 'Ava' }];
const PETS: Choice[] = [{ id: 'cat', label: 'cat' }, { id: 'dog', label: 'dog' }, { id: 'fish', label: 'fish' }];
type M = 'yes' | 'no';
const petGrid = (marks: Partial<Record<'mia' | 'leo' | 'ava', Partial<Record<'cat' | 'dog' | 'fish', M>>>>, caption?: string): GridScene => ({
  kind: 'grid',
  rows: KIDS,
  cols: PETS,
  marks: marks as Record<string, Record<string, M>>,
  ...(caption ? { caption } : {}),
});

/** The casts of the cards and boards: the pet grid, the pet and snack grid, and the handoff's two-kid grid. */
const PET_CAST = cardCast(['Mia', 'Leo', 'Ava'], [{ cat: 'pet', values: ['cat', 'dog', 'fish'] }]);
const TWO_CAST = cardCast(['Mia', 'Leo', 'Ava'], [{ cat: 'pet', values: ['cat', 'dog', 'fish'] }, { cat: 'snack', values: ['apples', 'popcorn', 'grapes'] }]);
const PAIR_CAST = cardCast(['Mia', 'Leo'], [{ cat: 'lunch', values: ['apple', 'bread'] }]);
/** Lesson 2's snack grid: Mia’s cross is for apples, not grapes (box-vs-kid). */
const SNACK_CAST = cardCast(['Mia', 'Leo', 'Ava'], [{ cat: 'snack', values: ['apples', 'popcorn', 'grapes'] }]);

/**
 * Lesson 2's contrast, computed by the engine (crossContrast): “Who must eat grapes?” on two grids. Leo has a cross in
 * the grapes column in both; Mia’s cross is under apples in the first (it does not count: Mia and Ava are left) and under
 * grapes in the second (it does: only Ava is left).
 */
export const L2_CROSS = crossContrast(SNACK_CAST, { c: 'snack', v: 'grapes', line: 'leo', other: 'mia', off: 'apples' });

/** Card scenes, exported so the tests can check each card's claim by brute force. */
export const CARD_GRIDS = {
  empty: petGrid({}),
  marks: petGrid({ mia: { cat: 'yes' }, leo: { dog: 'no' } }),
  /** The handoff's See (lesson 1): Mia’s clue already marked with a ✓ and a ✗, and the caption that says why. */
  oneEach: cardGrid(PAIR_CAST, 0, { mia: { apple: 'yes', bread: 'no' } }, 'Mia has the apple. A ✓ in a row crosses out the other boxes in its row.') as GridScene,
  orClue: petGrid({ ava: { cat: 'no' } }, 'Ava has the dog or the fish. So Ava – cat gets a ✗.'),
  rowLeft: petGrid({ leo: { cat: 'no', dog: 'no' } }, 'Two ✗s in Leo’s row. The last box, Leo – fish, gets the ✓.'),
  colLeft: petGrid({ mia: { fish: 'no' }, ava: { fish: 'no' } }, 'Two ✗s in the fish column. The last box, Leo – fish, gets the ✓.'),
  notSoFast: petGrid({ leo: { cat: 'no' } }, 'One ✗ in Leo’s row. Two boxes are still empty, so you can’t tell yet.'),
  /** Lesson 2, “A cross is about one box”: the first grid of the contrast, Leo ✗ grapes and Mia ✗ apples. */
  crossFor: cardGrid(SNACK_CAST, 0, L2_CROSS.marks[0], 'Mia’s cross is for apples, not grapes.') as GridScene,
  spreadRow: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' } }),
  spreadBoth: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' }, leo: { cat: 'no' }, ava: { cat: 'no' } }),
  spreadAgain: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' }, leo: { cat: 'no', dog: 'no' }, ava: { cat: 'no' } }),
  petsKnown: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' }, leo: { cat: 'no', dog: 'yes', fish: 'no' }, ava: { cat: 'no', dog: 'no', fish: 'yes' } }),
  /** Lesson 4, “Links work both ways”: the snack part is known (Ava eats popcorn). */
  snacksKnown: cardGrid(TWO_CAST, 1, {
    mia: { apples: 'no', popcorn: 'no', grapes: 'yes' },
    leo: { apples: 'yes', popcorn: 'no', grapes: 'no' },
    ava: { apples: 'no', popcorn: 'yes', grapes: 'no' },
  }) as GridScene,
} as const;

// Clues on the cards and boards, in the engine's own form (their words come from clueText).
const is = (p: string, c: string, v: string): GridClue => ({ t: 'is', p, c, v });
const isnt = (p: string, c: string, v: string): GridClue => ({ t: 'isnt', p, c, v });
const either = (p: string, c: string, v1: string, v2: string): GridClue => ({ t: 'either', p, c, v1, v2 });
const link = (pet: string, snack: string): GridClue => ({ t: 'link', c1: 'pet', v1: pet, c2: 'snack', v2: snack });
const notLink = (pet: string, snack: string): GridClue => ({ t: 'notLink', c1: 'pet', v1: pet, c2: 'snack', v2: snack });
/** A clue in the cards' words: “Mia has the cat.”, “The kid with the dog eats popcorn.” */
const said = (cl: GridClue) => clueText(cl.t === 'link' || cl.t === 'notLink' ? TWO_CAST : PET_CAST, cl);
const clueScene = (clues: string[]): Scene => ({ kind: 'clues', clues });
/** One box to mark: Yes (✓), No (✗) or Can’t tell yet (it stays empty). */
const box = (p: string, c: string, v: string): BoardAsk => ({ k: 'box', p, c, v });
/** One box a linking clue carries (clue k of the row, 0-based): its reason names the link and the mark it carries. */
const carryBox = (p: string, c: string, v: string, via: number): BoardAsk => ({ k: 'box', p, c, v, via });
/** Every box of one kid's row, to mark. */
const rowBoxes = (p: string, c: string, vs: readonly string[]): BoardAsk[] => vs.map((v) => box(p, c, v));

/** Lesson 5's clue cards. Their words come from the clues, so what a card says is what the engine checks. */
const L5_PROVE_CLUE = is('mia', 'pet', 'dog');
const L5_TELL_CLUE = isnt('mia', 'pet', 'fish');
const L5_LIST_CLUES = [isnt('mia', 'pet', 'fish'), either('leo', 'pet', 'cat', 'dog'), is('mia', 'pet', 'dog')];
/**
 * Lesson 4's “Back and forth” clues: neither part is known. Clue 1 crosses out Mia – fish (an “or” clue), clue 2 carries
 * that worked-out cross to Mia – popcorn, clue 3 leaves Ava as the last kid for popcorn, and clue 2 carries her check
 * mark back to Ava – fish.
 */
const L4_BF_CLUES = [either('mia', 'pet', 'cat', 'dog'), link('fish', 'popcorn'), isnt('leo', 'snack', 'popcorn')];
export const CARD_CLUES = {
  /** Lesson 1, “Turn clues into marks”. */
  marks: clueScene([said(is('mia', 'pet', 'cat')), said(isnt('leo', 'pet', 'dog'))]),
  /** Lesson 4, “A linking clue” and “A ‘not’ link”. */
  link: clueScene([said(link('dog', 'popcorn'))]),
  notLink: clueScene([said(notLink('dog', 'popcorn'))]),
  /** Lesson 4, “Back and forth”. */
  backForth: clueScene(L4_BF_CLUES.map((cl) => clueText(TWO_CAST, cl))),
  /** Lesson 5, “One clue can prove a lot”, “Can you tell yet?” and “Use only the clues you are told”. */
  prove: clueScene([said(L5_PROVE_CLUE)]),
  tell: clueScene([said(L5_TELL_CLUE)]),
  list: clueScene(L5_LIST_CLUES.map(said)),
} as const;
/** The clues on lesson 5's list card, in order. */
export const L5_LIST: readonly GridClue[] = L5_LIST_CLUES;

// ---------- the guided boards (the Do beat) ----------

/**
 * Lesson 1, the handoff's sample. The “One each” grid stays up with Mia’s row shown (clue 1: ✓ apple, ✗ bread).
 * The learner marks Leo’s row: a ✗ on Leo – apple from clue 2, then a ✓ on bread, the last box in Leo’s row.
 */
export const L1_GRID: DrillStep = gridBoard(PAIR_CAST, {
  id: 's4.l1-do',
  title: 'Mark Leo’s row',
  body: [
    'This is the grid from “One each.” Mia’s row is marked for you.',
    `Clue 1: ${clueText(PAIR_CAST, is('mia', 'lunch', 'apple'))}`,
    `Clue 2: ${clueText(PAIR_CAST, isnt('leo', 'lunch', 'apple'))}`,
    'Mark the box clue 2 gives. Then one box is left in Leo’s row. Mark it too.',
  ],
  part: 0,
  basis: { clues: [is('mia', 'lunch', 'apple'), isnt('leo', 'lunch', 'apple')] },
  given: CARD_GRIDS.oneEach.marks,
  caption: 'Snacks',
  notes: {
    mia: 'Clue 1 gives Mia – apple a ✓. Mia has just one snack, so Mia – bread gets a ✗.',
    leo: 'Clue 2 gives Leo – apple a ✗. Bread is the last box in Leo’s row, so it gets the ✓.',
  },
  done: 'Right. Clue 2 gave Leo – apple a ✗. Then bread was the only box left in Leo’s row, so Leo – bread got the ✓.',
});

/** Lesson 1: one clue at a time on the “Or” clues grid. Ava’s “or” clue is shown; the learner marks a “has”, a “not” and an “or” clue. */
export const L1_OR: DrillStep = cardBoard(PET_CAST, {
  id: 's4.l1-do-or',
  title: 'One clue at a time',
  body: [
    'This is the grid from “Or” clues. Ava’s clue is marked for you.',
    'Each row below has one clue by itself. Mark each box Yes (✓), No (✗) or Can’t tell yet. Can’t tell yet means the box stays empty.',
  ],
  scene: CARD_GRIDS.orClue,
  rows: [
    {
      id: 'or-ava',
      label: `Only clue: ${said(either('ava', 'pet', 'dog', 'fish'))}`,
      given: true,
      basis: { clues: [either('ava', 'pet', 'dog', 'fish')] },
      ask: rowBoxes('ava', 'pet', ['cat', 'dog', 'fish']),
      note: 'The clue leaves out the cat, so Ava – cat gets a ✗. Ava could have the dog or the fish, so those boxes stay empty.',
    },
    {
      id: 'is-leo',
      label: `Only clue: ${said(is('leo', 'pet', 'cat'))}`,
      basis: { clues: [is('leo', 'pet', 'cat')] },
      ask: rowBoxes('leo', 'pet', ['cat', 'dog', 'fish']),
      note: 'Leo – cat gets a ✓. Leo has just one pet, so the rest of Leo’s row gets a ✗.',
    },
    {
      id: 'isnt-leo',
      label: `Only clue: ${said(isnt('leo', 'pet', 'dog'))}`,
      basis: { clues: [isnt('leo', 'pet', 'dog')] },
      ask: rowBoxes('leo', 'pet', ['cat', 'dog', 'fish']),
      note: 'Leo – dog gets a ✗. The clue does not decide the other boxes in Leo’s row, so they stay empty.',
    },
    {
      id: 'or-mia',
      label: `Only clue: ${said(either('mia', 'pet', 'cat', 'fish'))}`,
      basis: { clues: [either('mia', 'pet', 'cat', 'fish')] },
      ask: rowBoxes('mia', 'pet', ['cat', 'dog', 'fish']),
      note: 'The clue leaves out the dog, so Mia – dog gets a ✗. The cat and the fish stay empty.',
    },
  ],
  done: 'Right. A “has” clue gives a ✓ and crosses out the rest of its row. A “not” clue gives one ✗. An “or” clue crosses out only the one it leaves out.',
});

const NOT_SO_FAST = marksAsClues('pet', CARD_GRIDS.notSoFast.marks);

/** The two snack grids of “Which cross counts?”, as the facts each board row draws. */
const CROSS_FACTS = L2_CROSS.marks.map((m) => marksAsClues('snack', m));
/** Mia’s cross under apples, the one that does not count for grapes. */
const CROSS_MIXUP = crossMixup(SNACK_CAST, 'snack', { p: 'mia', v: 'apples' }, { v: 'grapes' });

/**
 * Lesson 2's contrast card (box-vs-kid): the same question on two grids, and only where Mia’s cross sits changed. The
 * panels are text (Scene 'contrast'); their truths and last lines come from the engine (crossContrast).
 */
export const L2_CROSS_CARD: IdeaCard = {
  title: 'Which cross counts?',
  distinction: BOX_VS_KID.id,
  scene: L2_CROSS.scene,
  body: [
    'Here are two grids, told in words. Both ask: who must eat grapes? In both, Leo has a cross for grapes.',
    'Only one thing changed: where Mia’s cross is. Only a cross in the grapes column counts for grapes. A cross under another snack is about that snack.',
  ],
};

/**
 * Lesson 2's distinction board (box-vs-kid), right after the contrast card: the two grids of the contrast, the same
 * question each time (who must eat grapes?). The learner counts the grapes column and marks Mia’s and Ava’s boxes. In the
 * first grid Mia’s cross is under apples: two boxes stay empty (Can’t tell yet). In the second it is under grapes: Ava –
 * grapes is the last box. A tap that counts Mia’s apples cross for grapes names the mix-up first.
 */
export const L2_CROSS_DO: DrillStep = {
  ...cardBoard(SNACK_CAST, {
    id: 's4.l2-do-cross',
    title: 'Which cross counts?',
    body: [
      'These are the two grids from the card. The question is the same: who must eat grapes?',
      'Count the empty boxes in the grapes column. Then mark each box Yes (✓), No (✗) or Can’t tell yet.',
    ],
    scene: L2_CROSS.scene,
    rows: (['first', 'second'] as const).map((id, k) => ({
      id,
      label: `${k === 0 ? 'First' : 'Second'} grid: ${CROSS_FACTS[k].map((cl) => clueText(SNACK_CAST, cl)).join(' ')}`,
      basis: { facts: CROSS_FACTS[k] },
      ask: [{ k: 'count', c: 'snack', v: 'grapes' } as BoardAsk, box('mia', 'snack', 'grapes'), box('ava', 'snack', 'grapes')],
      note: k === 0
        ? 'Mia’s cross is under apples, so it does not count for grapes. Mia and Ava could each eat grapes, so you can’t tell yet.'
        : 'Now Mia’s cross is under grapes. Only Ava – grapes is left, so Ava must eat grapes.',
    })),
    done: 'Right. Under apples, Mia’s cross said nothing about grapes. Under grapes, it crossed Mia out for grapes, and only Ava was left.',
  }),
  afterCard: 4,
  distinction: BOX_VS_KID.id,
  scaffold: 'full',
  words: LINE_WORDS,
  // Mia out for grapes, Ava the last box, or a count of 1: each one counts Mia’s apples cross in the grapes column.
  misconceptions: [
    { id: 'cross-elsewhere', when: 'picks', picks: { 'first-mia-grapes': 'no' }, text: CROSS_MIXUP },
    { id: 'kid-crossed-out', when: 'picks', picks: { 'first-ava-grapes': 'yes' }, text: CROSS_MIXUP },
    { id: 'count-elsewhere', when: 'picks', picks: { 'first-count': '1' }, text: CROSS_MIXUP },
  ],
  confused: BOX_VS_KID_CONFUSED,
};

/**
 * Lesson 2: the “Not so fast” grid. Leo’s row is shown (two empty boxes: Can’t tell yet), with its line in words over it.
 * The learner adds a ✗, counts again and taps the last box (Leo – dog ✓), then counts the cat column (two left: both
 * stay empty), then adds a ✗ and taps the last box (Mia – cat ✓). Then two rows with a cross off the line: a ✗ under the
 * dog in Mia’s row does not count for the cat column (still two left), and Leo’s ✗ under the cat does not count for
 * Mia’s row (three left). No “which” or “who” buttons: the learner marks the boxes themselves.
 */
const L2_COUNT_BOARD = cardBoard(PET_CAST, {
  id: 's4.l2-do',
  title: 'Count the empty boxes',
  body: [
    'This is the grid from “Not so fast.” Leo’s row is checked for you.',
    'Now add one ✗ at a time and count the empty boxes. Mark each box Yes (✓), No (✗) or Can’t tell yet (it stays empty). When one box is left, it gets the ✓.',
    'Count only the boxes of the line you look at. A ✗ in another line does not count.',
  ],
  scene: CARD_GRIDS.notSoFast,
  lines: true,
  rows: [
    {
      id: 'leo-card',
      label: 'Leo’s row, as the card shows it.',
      given: true,
      basis: { facts: NOT_SO_FAST },
      ask: [{ k: 'count', c: 'pet', p: 'leo' }, box('leo', 'pet', 'dog'), box('leo', 'pet', 'fish')],
      note: 'Leo – dog and Leo – fish are empty. Leo could have either one, so you can’t tell yet.',
    },
    {
      id: 'leo-fish',
      label: `Add a ✗: ${said(isnt('leo', 'pet', 'fish'))}`,
      basis: { facts: NOT_SO_FAST, clues: [isnt('leo', 'pet', 'fish')] },
      ask: [box('leo', 'pet', 'fish'), { k: 'count', c: 'pet', p: 'leo' }, box('leo', 'pet', 'dog')],
      note: 'Only Leo – dog is empty now. It is the last box in Leo’s row, so it gets the ✓. Leo has the dog.',
    },
    {
      id: 'cat-card',
      label: 'Back to the card’s grid. Look at the cat column.',
      basis: { facts: NOT_SO_FAST },
      ask: [{ k: 'count', c: 'pet', v: 'cat' }, box('mia', 'pet', 'cat'), box('ava', 'pet', 'cat')],
      note: 'Mia – cat and Ava – cat are empty. Mia or Ava could have the cat, so you can’t tell yet.',
    },
    {
      id: 'cat-ava',
      label: `Add a ✗: ${said(isnt('ava', 'pet', 'cat'))}`,
      basis: { facts: NOT_SO_FAST, clues: [isnt('ava', 'pet', 'cat')] },
      ask: [box('ava', 'pet', 'cat'), { k: 'count', c: 'pet', v: 'cat' }, box('mia', 'pet', 'cat')],
      note: 'Only Mia – cat is empty now. It is the last box in the cat column, so it gets the ✓. Mia has the cat.',
    },
    {
      id: 'cat-mia-dog',
      label: `Back to the card’s grid. Add a ✗: ${said(isnt('mia', 'pet', 'dog'))}`,
      basis: { facts: NOT_SO_FAST, clues: [isnt('mia', 'pet', 'dog')] },
      ask: [{ k: 'count', c: 'pet', v: 'cat' }, box('mia', 'pet', 'cat')],
      note: 'Mia’s new ✗ is under the dog, not the cat. The cat column still has two empty boxes.',
    },
    {
      id: 'mia-row',
      label: 'Back to the card’s grid. Look across Mia’s row.',
      basis: { facts: NOT_SO_FAST },
      ask: [{ k: 'count', c: 'pet', p: 'mia' }],
      note: 'Leo’s ✗ is under the cat, but it is in Leo’s row. It says nothing about Mia. All three boxes in Mia’s row are empty.',
    },
  ],
  done: 'Right. One empty box left: it gets the ✓. Two or more: you can’t tell yet. A ✗ in another line does not count.',
});
export const L2_COUNT: DrillStep = {
  ...L2_COUNT_BOARD,
  scaffold: 'full',
  words: LINE_WORDS,
  // A cross off the line counted in it: the cat column after Mia’s ✗ under the dog, and Mia’s row with Leo’s ✗ under the cat.
  misconceptions: [
    { id: 'cross-elsewhere', when: 'picks', picks: { 'cat-mia-dog-count': '1' }, text: crossMixup(PET_CAST, 'pet', { p: 'mia', v: 'dog' }, { v: 'cat' }) },
    { id: 'kid-crossed-out', when: 'picks', picks: { 'cat-mia-dog-mia-cat': 'no' }, text: crossMixup(PET_CAST, 'pet', { p: 'mia', v: 'dog' }, { v: 'cat' }) },
    { id: 'cross-other-row', when: 'picks', picks: { 'mia-row-count': '2' }, text: crossMixup(PET_CAST, 'pet', { p: 'leo', v: 'cat' }, { p: 'mia' }) },
  ],
  confused: BOX_VS_KID_CONFUSED,
};

const SPREAD_ROW = marksAsClues('pet', CARD_GRIDS.spreadRow.marks);

/** Lesson 3: the “A ✓ fills its row” grid. Mia’s row is shown; the learner spreads her ✓ down the cat column, then checks two boxes outside her row and that column. */
export const L3_SPREAD: DrillStep = cardBoard(PET_CAST, {
  id: 's4.l3-do',
  title: 'Spread a ✓',
  body: [
    'This is the grid from “A ✓ fills its row.” Mia’s row is done for you.',
    'Now spread Mia’s ✓ down the cat column. Then check two boxes outside Mia’s row and the cat column. Mark each box Yes (✓), No (✗) or Can’t tell yet.',
  ],
  scene: CARD_GRIDS.spreadRow,
  rows: [
    {
      id: 'mia-row',
      label: 'Mia’s row',
      given: true,
      basis: { facts: SPREAD_ROW },
      ask: rowBoxes('mia', 'pet', ['cat', 'dog', 'fish']),
      note: 'Mia has the cat. Mia has just one pet, so the rest of Mia’s row has a ✗.',
    },
    {
      id: 'cat-col',
      label: 'The cat column',
      basis: { facts: SPREAD_ROW },
      ask: [{ k: 'box', p: 'leo', c: 'pet', v: 'cat' }, { k: 'box', p: 'ava', c: 'pet', v: 'cat' }],
      note: 'Only one kid can have the cat. So the rest of the cat column gets a ✗.',
    },
    {
      id: 'outside',
      label: 'Outside Mia’s row and the cat column',
      basis: { facts: SPREAD_ROW },
      ask: [{ k: 'box', p: 'leo', c: 'pet', v: 'dog' }, { k: 'box', p: 'ava', c: 'pet', v: 'fish' }],
      note: 'Mia’s ✓ does not decide these boxes. They stay empty for now.',
    },
  ],
  done: 'Right. One ✓ gave four ✗s: the rest of its row and the rest of its column. Boxes outside them stay empty.',
});

/** Lesson 3: the “Spread, then look again” grid, finished by the learner: the last box, a spread, the last box. */
export const L3_FINISH: DrillStep = gridBoard(PET_CAST, {
  id: 's4.l3-do-2',
  title: 'Finish the grid',
  body: [
    'This is the grid from “Spread, then look again.”',
    `Clue 1: ${said(is('mia', 'pet', 'cat'))}`,
    `Clue 2: ${said(isnt('leo', 'pet', 'dog'))}`,
    'Their marks are shown, with Mia’s ✓ spread. Finish the grid. Look for a row or column with one empty box, and spread each new ✓.',
  ],
  part: 0,
  basis: { clues: [is('mia', 'pet', 'cat'), isnt('leo', 'pet', 'dog')] },
  given: CARD_GRIDS.spreadAgain.marks,
  caption: 'Pets',
  notes: { mia: 'Mia has the cat. Her ✓ crossed out the rest of Mia’s row and the rest of the cat column.' },
  done: 'Right. Leo has the fish, and Ava has the dog. Every row and every column has one ✓.',
});

const PETS_KNOWN = marksAsClues('pet', CARD_GRIDS.petsKnown.marks);
const SNACKS_KNOWN = marksAsClues('snack', CARD_GRIDS.snacksKnown.marks);

/** Lesson 4: the “Use what you know” pets stay up; the learner fills the snack part from two links (clue 1 shown). */
export const L4_LINK: DrillStep = gridBoard(TWO_CAST, {
  id: 's4.l4-do',
  title: 'Carry a link across',
  body: [
    'The grid above shows each kid’s pet, from “Use what you know.” The grid below is the snack part.',
    `Clue 1: ${said(link('dog', 'popcorn'))}`,
    `Clue 2: ${said(link('fish', 'apples'))}`,
    'Clue 1’s marks are shown in the popcorn column. Use clue 2 the same way. Then finish the snacks.',
  ],
  scene: CARD_GRIDS.petsKnown,
  part: 1,
  basis: { facts: PETS_KNOWN, clues: [link('dog', 'popcorn'), link('fish', 'apples')] },
  given: { mia: { popcorn: 'no' }, leo: { popcorn: 'yes' }, ava: { popcorn: 'no' } },
  caption: 'Snacks',
  done: 'Right. Ava has the fish, so Ava eats apples. Then grapes was the last box in Mia’s row.',
});

/**
 * Lesson 4: “not” links on the same pets. One “not” link is shown (two popcorn boxes stay empty: Can’t tell yet); the
 * learner adds a second (Ava – popcorn is the last box: ✓), then tries a new one (two grapes boxes stay empty).
 */
export const L4_NOT: DrillStep = cardBoard(TWO_CAST, {
  id: 's4.l4-do-not',
  title: 'A “not” link',
  body: [
    'The grid shows each kid’s pet. A “not” link crosses out one kid for one snack. Then look at who is left.',
    'Mark each box Yes (✓), No (✗) or Can’t tell yet (it stays empty). When one box is left, it gets the ✓.',
  ],
  scene: CARD_GRIDS.petsKnown,
  rows: [
    {
      id: 'not-1',
      label: `Clue 1: ${said(notLink('dog', 'popcorn'))}`,
      given: true,
      basis: { facts: PETS_KNOWN, clues: [notLink('dog', 'popcorn')] },
      ask: ['leo', 'mia', 'ava'].map((p) => box(p, 'snack', 'popcorn')),
      note: 'Leo has the dog, so Leo – popcorn gets a ✗. Mia or Ava could eat popcorn, so you can’t tell yet.',
    },
    {
      id: 'not-2',
      label: `Add clue 2: ${said(notLink('cat', 'popcorn'))}`,
      basis: { facts: PETS_KNOWN, clues: [notLink('dog', 'popcorn'), notLink('cat', 'popcorn')] },
      ask: [box('mia', 'snack', 'popcorn'), box('ava', 'snack', 'popcorn')],
      note: 'Clue 2 crosses out Mia for popcorn. Ava – popcorn is the last box, so Ava eats popcorn.',
    },
    {
      id: 'not-3',
      label: `A new clue on its own: ${said(notLink('fish', 'grapes'))}`,
      basis: { facts: PETS_KNOWN, clues: [notLink('fish', 'grapes')] },
      ask: [box('ava', 'snack', 'grapes'), box('mia', 'snack', 'grapes'), box('leo', 'snack', 'grapes')],
      note: 'The clue crosses out Ava for grapes. Mia or Leo could eat grapes, so you can’t tell yet.',
    },
  ],
  done: 'Right. A “not” link crosses out one kid for one snack. With one kid left, you can tell. With two left, you can’t tell yet.',
});

/** Lesson 4: “Links work both ways.” The snacks are known; the learner fills the pet part, reading each link from its snack end. */
export const L4_BACK: DrillStep = gridBoard(TWO_CAST, {
  id: 's4.l4-do-back',
  title: 'Use a link the other way',
  body: [
    'The grid above shows each kid’s snack, as the last card did. The grid below is the pet part.',
    `Clue 1: ${said(link('dog', 'popcorn'))}`,
    `Clue 2: ${said(link('cat', 'grapes'))}`,
    'Ava eats popcorn, so clue 1 gives Ava the dog. Ava’s row is shown. Use clue 2 the same way. Then finish the pets.',
  ],
  scene: CARD_GRIDS.snacksKnown,
  part: 0,
  basis: { facts: SNACKS_KNOWN, clues: [link('dog', 'popcorn'), link('cat', 'grapes')] },
  given: { ava: { cat: 'no', dog: 'yes', fish: 'no' } },
  caption: 'Pets',
  notes: { ava: 'Ava eats popcorn, and clue 1 says the kid with the dog eats popcorn. So Ava has the dog.' },
  done: 'Right. Mia eats grapes, so Mia has the cat. Then the fish was the last box in Leo’s row.',
});

/**
 * Lesson 4: “Back and forth.” Neither part is known. The worked case is shown: clue 1 (an “or” clue) crosses out Mia –
 * fish, and clue 2 carries that worked-out cross to Mia – popcorn. The learner goes on: clue 3’s cross, the last box in
 * the popcorn column (Ava, with Mia’s carried cross counted), then carries Ava’s new check mark back across clue 2. Each
 * carry names its link and the mark it carries (BoardAsk via), computed and checked by the engine.
 */
const [BF_OR, BF_LINK, BF_NOT] = L4_BF_CLUES;
const bf = (cl: GridClue) => clueText(TWO_CAST, cl);
export const L4_BACK_FORTH: DrillStep = {
  ...cardBoard(TWO_CAST, {
    id: 's4.l4-do-back-forth',
    title: 'Back and forth',
    body: [
      'These are the clues from “Back and forth.” Neither part of the grid is filled in yet.',
      'The first two rows are shown. Each row adds one step to the rows before it. Mark the boxes in your rows.',
    ],
    scene: CARD_CLUES.backForth,
    rows: [
      { id: 'bf-1', label: `Clue 1: ${bf(BF_OR)}`, given: true, basis: { clues: [BF_OR] }, ask: [box('mia', 'pet', 'fish')], note: 'Clue 1 leaves out the fish, so Mia – fish gets a ✗.' },
      {
        id: 'bf-2',
        label: `Add clue 2: ${bf(BF_LINK)}`,
        given: true,
        basis: { clues: [BF_OR, BF_LINK] },
        ask: [carryBox('mia', 'snack', 'popcorn', 1)],
        note: 'Mia is not the kid with the fish, so clue 2 carries a ✗ to Mia – popcorn.',
      },
      {
        id: 'bf-3',
        label: `Add clue 3: ${bf(BF_NOT)}`,
        basis: { clues: L4_BF_CLUES },
        ask: [box('leo', 'snack', 'popcorn'), box('ava', 'snack', 'popcorn')],
        note: 'Mia and Leo can’t eat popcorn. Ava – popcorn is the last box, so Ava eats popcorn.',
      },
      {
        id: 'bf-4',
        label: 'Carry back across clue 2.',
        basis: { clues: L4_BF_CLUES },
        ask: [carryBox('ava', 'pet', 'fish', 1)],
        note: 'Ava eats popcorn, so clue 2 carries a ✓ back to Ava – fish. Ava has the fish.',
      },
    ],
    done: 'Right. A cross went across clue 2, and a check mark came back. That is back and forth.',
  }),
  scaffold: 'full',
  words: LINK_WORDS,
  steps: ['Clue marks', 'Only one left', 'Again: carry across links'],
  misconceptions: [
    {
      id: 'carried-not-counted',
      when: 'picks',
      // Clue 3’s cross counted, yet Ava – popcorn left empty: only Mia’s carried cross was not counted.
      picks: { 'bf-3-leo-popcorn': 'no', 'bf-3-ava-popcorn': CANT },
      text: 'You may be treating “the marks the clues say” and “all the marks you know” as the same thing. They are two different things: you also know the marks you worked out, like a carried cross. Count every cross in the popcorn column, carried ones too. Mia – popcorn and Leo – popcorn have one, so Ava – popcorn is the last box.',
    },
    {
      id: 'link-used-up',
      when: 'picks',
      picks: { 'bf-4-ava-fish': CANT },
      text: 'You may be treating “I read clue 2” and “clue 2 is used up” as the same thing. They are two different things: a linking clue is never used up. Ava now eats popcorn, so read clue 2 again and carry that mark back.',
    },
  ],
  confused: BACK_FORTH_CONFUSED,
};

/** One “Only clue” row of lesson 5's first board: could Leo still have the dog, with that clue alone? */
const onlyClue = (id: string, cl: GridClue, given = false, note?: string) => ({
  id,
  label: `Only clue: ${said(cl)}`,
  basis: { clues: [cl] },
  ask: [{ k: 'could', p: 'leo', c: 'pet', v: 'dog' } as BoardAsk],
  ...(given ? { given } : {}),
  ...(note ? { note } : {}),
});

/** Lesson 5: test one clue alone, on the “One clue can prove a lot” clue. That clue is shown; the learner tests six more. */
export const L5_PROOF: DrillStep = cardBoard(PET_CAST, {
  id: 's4.l5-do',
  title: 'Test one clue alone',
  body: [
    'This is the clue from “One clue can prove a lot.” It is checked for you.',
    'Each row below has one clue by itself. With only that clue, could Leo still have the dog? Tap Yes or No.',
  ],
  scene: CARD_CLUES.prove,
  rows: [
    onlyClue('mia-dog', L5_PROVE_CLUE, true, 'Only one kid can have the dog. So this clue alone proves Leo – dog gets a ✗.'),
    onlyClue('leo-fish', is('leo', 'pet', 'fish')),
    onlyClue('leo-not-cat', isnt('leo', 'pet', 'cat')),
    onlyClue('leo-or', either('leo', 'pet', 'cat', 'fish')),
    // The tempting one: it is about Leo and names the dog, but as one of two choices, so it proves nothing.
    onlyClue('leo-or-dog', either('leo', 'pet', 'dog', 'fish')),
    onlyClue('ava-or', either('ava', 'pet', 'dog', 'fish')),
    onlyClue('mia-cat', is('mia', 'pet', 'cat')),
  ],
  done: 'Right. A clue proves Leo – dog gets a ✗ only when, with that clue alone, Leo could never have the dog.',
});

/**
 * Lesson 5: use only clues 1 and 2 of a list of three. The fish is shown (only Ava could: you can tell); the learner
 * checks each kid for the cat and counts who could (two: you can’t tell yet). The board asks for the marks and the
 * count, never the quiz's own “Can you tell yet?”.
 */
export const L5_ENOUGH: DrillStep = cardBoard(PET_CAST, {
  id: 's4.l5-do-2',
  title: 'Use only clues 1 and 2',
  body: [
    'This is the list from “Use only the clues you are told.” The fish is checked for you.',
    'Now check the cat. Use only clues 1 and 2. Leave clue 3 out, even though it is on the list. Then count the kids who could have the cat.',
  ],
  scene: CARD_CLUES.list,
  rows: (['fish', 'cat'] as const).map((v) => ({
    id: v,
    label: `Use only clues 1 and 2. Who could have the ${v}?`,
    basis: { clues: L5_LIST_CLUES.slice(0, 2) },
    ask: [
      ...['mia', 'leo', 'ava'].map((p): BoardAsk => ({ k: 'could', p, c: 'pet', v, later: L5_LIST_CLUES.slice(2) })),
      { k: 'howMany', c: 'pet', v, later: L5_LIST_CLUES.slice(2) } as BoardAsk,
    ],
    ...(v === 'fish'
      ? { given: true, note: 'Clue 1 crosses out Mia for the fish. Clue 2 leaves out the fish for Leo. Only Ava is left, so you can tell: Ava has the fish.' }
      : { note: 'Mia and Leo could each have the cat. So you can’t tell yet, even though clue 3 would tell you.' }),
  })),
  done: 'Right. One kid left: you can tell. Two or more: you can’t tell yet. A clue you were told not to use does not count.',
});

const L1 = 's4.l1';
const L2 = 's4.l2';
const L3 = 's4.l3';
const L4 = 's4.l4';
const L5 = 's4.l5';

const lessons: LessonDef[] = [
  {
    id: L1,
    title: 'Check marks and crosses',
    ideas: [
      {
        title: 'What a logic grid is',
        scene: CARD_GRIDS.empty,
        body: [
          'A logic grid is a table that helps you sort out clues.',
          'Each person gets a row. A row goes across.',
          'Each choice, like a pet, gets a column. A column goes up and down.',
          'A box is where one row meets one column.',
        ],
      },
      {
        title: '✓ means yes, ✗ means no',
        scene: CARD_GRIDS.marks,
        body: [
          'A check mark (✓) in a box means yes. The ✓ in the box for Mia and the cat means Mia has the cat.',
          'A cross (✗) means no. The ✗ in the box for Leo and the dog means Leo does not have the dog.',
          'An empty box means you don’t know yet.',
        ],
      },
      {
        title: 'Turn clues into marks',
        scene: CARD_CLUES.marks,
        body: [
          '“Mia has the cat” puts a ✓ in the box for Mia and the cat.',
          '“Leo does not have the dog” puts a ✗ in the box for Leo and the dog.',
          'The mark goes where that person’s row meets that choice’s column.',
        ],
      },
      {
        title: 'One each',
        scene: CARD_GRIDS.oneEach,
        body: [
          'Each kid has just one snack. So each row gets just one ✓. Each snack goes to just one kid, so each column gets just one ✓ too.',
          'Here a clue says Mia has the apple. So Mia – apple gets a ✓.',
          'Mia has just one snack. So the other box in Mia’s row, Mia – bread, gets a ✗.',
          'When only one box in a row is still empty, it gets the ✓.',
        ],
      },
      {
        title: '“Or” clues',
        scene: CARD_GRIDS.orClue,
        body: [
          '“Ava has the dog or the fish” does not give you a ✓ yet.',
          'But it does tell you that Ava does not have the cat. So the box for Ava and the cat gets a ✗.',
          'Look for the choice an “or” clue leaves out.',
        ],
      },
    ],
    drill: [L1_GRID, L1_OR],
    // Try 1 is always a “has” clue (a ✓): the handoff keeps “isn’t” and “or” out of the opening ask.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const t2 = rng.pick(['isnt', 'either'] as const);
      return distinct([
        () => markPuzzle(rng, { id: 'l1-1', skin: skins[0], t: 'is' }).item,
        () => markPuzzle(rng, { id: 'l1-2', skin: skins[1], t: t2 }).item,
        () => markPuzzle(rng, { id: 'l1-3', skin: skins[2], t: t2 === 'isnt' ? 'either' : 'isnt' }).item,
        () => markPuzzle(rng, { id: 'l1-4', skin: skins[3] }).item,
      ]);
    },
  },
  {
    id: L2,
    title: 'Only one left',
    ideas: [
      {
        title: 'The last box in a row',
        scene: CARD_GRIDS.rowLeft,
        body: [
          'Look at Leo’s row. The cat and the dog both have a ✗.',
          'Leo has to have one pet, and only the fish is left. So Leo must have the fish.',
          'When every box but one in a row has a ✗, the last box gets a ✓.',
        ],
      },
      {
        title: 'The last box in a column',
        scene: CARD_GRIDS.colLeft,
        body: [
          'The same idea works in a column.',
          'Mia and Ava both have a ✗ in the fish column. Someone has the fish, and only Leo is left.',
          'So Leo must have the fish.',
        ],
      },
      {
        title: 'Not so fast',
        scene: CARD_GRIDS.notSoFast,
        body: [
          'Here Leo has a ✗ for the cat. Does Leo have the fish?',
          'Not for sure. Leo could have the dog or the fish. Two boxes are still empty.',
          'So the answer is “Can’t tell yet.” That is a real answer.',
        ],
      },
      {
        title: 'A cross is about one box',
        scene: CARD_GRIDS.crossFor,
        body: [
          'A cross means no for one box: one kid and one thing. It does not cross out the kid for everything.',
          'Who must eat grapes? Look down the grapes column. Leo has a cross there, so Leo does not eat grapes.',
          'Mia has a cross too, but it is under apples. It says Mia does not eat apples. It says nothing about grapes.',
          'So Mia and Ava could each eat grapes. You can’t tell yet.',
        ],
      },
      L2_CROSS_CARD,
      {
        title: 'Count the empty boxes',
        body: [
          'First find the line the question is about. Who has the fish? Look down the fish column. Which pet does Leo have? Look across Leo’s row.',
          'Before you put a ✓, count the empty boxes in that row or column. Only the crosses in that line matter.',
          'Is just one box left? Then it gets the ✓.',
          'Are two or more left? Then you can’t tell from the boxes you counted. Look at the other rows and columns too.',
        ],
      },
    ],
    // The Do for box-vs-kid sits right after its contrast card; the count board comes after the last card.
    drill: [L2_CROSS_DO, L2_COUNT],
    distinctions: [BOX_VS_KID],
    // Three right on the first try, one of them a “Can’t tell yet” grid with a cross off the line (the trap).
    pass: { firstTry: 3, include: [{ tag: 'cant-tell', label: 'a “Can’t tell yet” grid' }] },
    // Try 1 is the first column quiz, marked on its own board first (Item.workFirst): find the line, then count.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      return distinct([
        () => onlyOnePuzzle(rng, { id: 'l2-1', skin: skins[0], mode: 'col', n: 3, work: true }).item,
        () => onlyOnePuzzle(rng, { id: 'l2-2', skin: skins[1], mode: 'row' }).item,
        () => onlyOnePuzzle(rng, { id: 'l2-3', skin: skins[2], mode: 'cant' }).item,
        () => onlyOnePuzzle(rng, { id: 'l2-4', skin: skins[3], mode: rng.pick(['col', 'row', 'cant'] as const), n: 4 }).item,
      ]);
    },
  },
  {
    id: L3,
    title: 'Spread the check mark',
    ideas: [
      {
        title: 'A ✓ fills its row',
        scene: CARD_GRIDS.spreadRow,
        body: [
          'Say you find out that Mia has the cat. Put a ✓ in the box for Mia and the cat.',
          'Mia has just one pet. So every other box in Mia’s row gets a ✗.',
        ],
      },
      {
        title: 'A ✓ fills its column too',
        scene: CARD_GRIDS.spreadBoth,
        body: [
          'Only one kid can have the cat. So every other box in the cat column gets a ✗ too.',
          'One ✓ gave you four ✗s. That is why a ✓ is so useful.',
        ],
      },
      {
        title: 'Don’t forget the column',
        body: [
          'It is easy to fill in the row and forget the column.',
          'Each time you put a ✓, cross out the rest of its row. Then cross out the rest of its column.',
        ],
      },
      {
        title: 'Spread, then look again',
        scene: CARD_GRIDS.spreadAgain,
        body: [
          'Mia has the cat, and a clue says Leo does not have the dog.',
          'Now Leo’s row has only one empty box: the fish. So Leo has the fish.',
          'Spread Leo’s ✓ too. Then the dog is the only pet left for Ava.',
        ],
      },
      {
        title: 'Solve a whole grid',
        body: [
          'Now you know every move you need to solve a whole grid.',
          'First, put in the marks the clues give you. Then look for a row or column with one empty box.',
          'Spread each new ✓ along its row and its column. Keep going until every row has one ✓.',
        ],
      },
    ],
    drill: [L3_SPREAD, L3_FINISH],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      return distinct([
        () => spreadPuzzle(rng, { id: 'l3-1', skin: skins[0], n: 3 }).item,
        () => spreadPuzzle(rng, { id: 'l3-2', skin: skins[1], column: true }).item,
        () => spreadPuzzle(rng, { id: 'l3-3', skin: skins[2], n: 4 }).item,
        () => spreadPuzzle(rng, { id: 'l3-4', skin: skins[3], column: rng.chance(0.5) }).item,
        () => gridPuzzle(rng, { id: 'l3-5', skin: rng.pick(SKIN_IDS), ncat: 1 }).item,
      ]);
    },
  },
  {
    id: L4,
    title: 'Linking clues',
    ideas: [
      {
        title: 'Two parts to the grid',
        body: [
          'Some grids have two parts. Each kid has a pet, and each kid also eats a snack.',
          'The rules stay the same in each part. Each kid gets one pet and one snack.',
          'Each pet and each snack goes to just one kid.',
        ],
      },
      {
        title: 'A linking clue',
        scene: CARD_CLUES.link,
        body: [
          'A linking clue joins two choices. It does not name a kid.',
          '“The kid with the dog eats popcorn” means the dog and the popcorn go to the same kid.',
          'Other clues will tell you who that kid is.',
        ],
      },
      {
        title: 'Use what you know',
        scene: CARD_GRIDS.petsKnown,
        body: [
          'Say the grid shows that Leo has the dog. Then Leo eats popcorn too.',
          'Mia and Ava do not have the dog. So they do not eat popcorn.',
        ],
      },
      {
        title: 'A “not” link',
        scene: CARD_CLUES.notLink,
        // The reminder of box-vs-kid (taught in lesson 2): the ✗ is for one box, not for the whole kid.
        distinction: BOX_VS_KID.id,
        body: [
          '“The kid with the dog does not eat popcorn” is a clue too.',
          'If Leo has the dog, Leo’s popcorn box gets a ✗. That ✗ is for popcorn only: Leo could still eat apples or grapes.',
          'But you still don’t know who eats popcorn. It could be Mia or Ava.',
        ],
      },
      {
        title: 'Links work both ways',
        scene: CARD_GRIDS.snacksKnown,
        body: [
          'Say the kid with the dog eats popcorn. This grid shows the snacks, and Ava eats popcorn.',
          'Only one kid eats popcorn, so Ava must be the kid with the dog.',
          'You can start from either end of a link.',
        ],
      },
      {
        title: 'Back and forth',
        scene: CARD_CLUES.backForth,
        body: [
          'A quiz grid starts with no part filled in. So work in a loop: clue marks, spread, only one left, carry across links. Then do it again.',
          'Each time a kid gets a new check mark or cross, read the linking clues again. A link carries a cross too.',
          'Here clue 1 leaves out the fish, so Mia – fish gets a cross. Mia is not the kid with the fish. So clue 2 gives Mia – popcorn a cross.',
          'Stuck? Read the linking clues again. A linking clue may give you a new cross.',
        ],
      },
    ],
    drill: [L4_LINK, L4_NOT, L4_BACK, L4_BACK_FORTH],
    // “Who must eat popcorn?” counts the crosses in the popcorn column only (box-vs-kid, taught in lesson 2).
    distinctions: [{ ...BOX_VS_KID, taughtIn: L2 }],
    // Three right on the first try, one of them a whole two-part grid.
    pass: { firstTry: 3, include: [{ tag: 'grid-two', label: 'a two-part grid' }] },
    // Try 4 is the first two-part grid, worked step by step on its own board first (Item.workFirst). Try 5 is another
    // two-part grid with no board, so a miss can still be made up on a two-part grid.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const modes: LinkMode[] = rng.shuffle(['link', 'notLink2', 'notLink']);
      return distinct([
        () => linkPuzzle(rng, { id: 'l4-1', skin: skins[0], mode: modes[0] }).item,
        () => linkPuzzle(rng, { id: 'l4-2', skin: skins[1], mode: modes[1] }).item,
        () => linkPuzzle(rng, { id: 'l4-3', skin: skins[2], mode: modes[2] }).item,
        () => gridPuzzle(rng, { id: 'l4-4', skin: skins[3], ncat: 2, work: true }).item,
        () => gridPuzzle(rng, { id: 'l4-5', skin: rng.pick(SKIN_IDS), ncat: 2 }).item,
      ]);
    },
  },
  {
    id: L5,
    title: 'No guessing',
    ideas: [
      {
        title: 'Every mark needs a reason',
        body: [
          'A good detective never guesses.',
          'Before you put a ✓ or a ✗, ask: which clue or rule proves it?',
          'If you can’t name a reason, leave the box empty for now.',
        ],
      },
      {
        title: 'One clue can prove a lot',
        scene: CARD_CLUES.prove,
        body: [
          '“Mia has the dog” proves that Leo does not have the dog.',
          'Why? Only one kid can have the dog. So this one clue is enough by itself.',
          'Other facts need two or more clues put together.',
        ],
      },
      {
        title: 'Can you tell yet?',
        scene: CARD_CLUES.tell,
        body: [
          'Say this is the only clue so far. Who has the fish?',
          'Leo could have it. So could Ava. The clue does not decide between them.',
          'So you can’t tell yet. More clues are needed.',
        ],
      },
      {
        title: 'Use only the clues you are told',
        scene: CARD_CLUES.list,
        // The reminder of box-vs-kid (taught in lesson 2): each clue crosses a kid out for the fish only.
        distinction: BOX_VS_KID.id,
        body: [
          'Some questions say which clues to use. Use only those, even when the list has more.',
          'Use only clues 1 and 2. Who has the fish? Clue 1 crosses out Mia for the fish. Clue 2 says Leo has the cat or the dog, so it crosses out Leo for the fish too.',
          'Only Ava is left. So you can tell: Ava has the fish. Clue 3 was not needed.',
        ],
      },
      {
        title: 'Stuck? Read again',
        body: [
          'If no row or column is down to one empty box, read the clues again.',
          'An “or” clue may give you a new ✗.',
          'Every puzzle here can be solved without guessing.',
        ],
      },
    ],
    drill: [L5_PROOF, L5_ENOUGH],
    // “Can you tell who has the fish yet?” counts the crosses in the fish column only (box-vs-kid, taught in lesson 2).
    distinctions: [{ ...BOX_VS_KID, taughtIn: L2 }],
    // Proofs stay in one-part grids: no board here tests a linking clue or a clue about the other part alone.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const tell = rng.shuffle([true, false]);
      return distinct([
        () => proofPuzzle(rng, { id: 'l5-1', skin: skins[0], ncat: 1 }).item,
        () => enoughPuzzle(rng, { id: 'l5-2', skin: skins[1], tell: tell[0] }).item,
        () => proofPuzzle(rng, { id: 'l5-3', skin: skins[2], ncat: 1 }).item,
        () => enoughPuzzle(rng, { id: 'l5-4', skin: skins[3], tell: tell[1] }).item,
      ]);
    },
  },
];

/**
 * Nine items: one for lesson 1 and two each for lessons 2 to 5. It always has one full one-category grid
 * (lesson 3, 150 seconds) and one two-category grid (180 seconds). Item c4 ("can’t tell yet") is
 * always a conflict item. Everything uses three people.
 */
function check(rng: Rng): Item[] {
  const any = () => rng.pick(SKIN_IDS);
  return distinct([
    () => gridPuzzle(rng, { id: 'c1', skin: any(), ncat: 1 }).item,
    () => markPuzzle(rng, { id: 'c2', skin: any() }).item,
    () => onlyOnePuzzle(rng, { id: 'c3', skin: any(), mode: rng.pick(['col', 'row'] as const), n: 3 }).item,
    () => onlyOnePuzzle(rng, { id: 'c4', skin: any(), mode: 'cant', n: 3 }).item,
    () => spreadPuzzle(rng, { id: 'c5', skin: any(), column: rng.chance(0.5), n: 3 }).item,
    () => gridPuzzle(rng, { id: 'c6', skin: any(), ncat: 2 }).item,
    () => linkPuzzle(rng, { id: 'c7', skin: any(), mode: rng.pick(['link', 'notLink2', 'notLink'] as const) }).item,
    // Proofs are one-part grids, as lesson 5 teaches them.
    () => proofPuzzle(rng, { id: 'c8', skin: any(), ncat: 1 }).item,
    () => enoughPuzzle(rng, { id: 'c9', skin: any(), tell: rng.chance(0.5) }).item,
  ]);
}

/** One Arcade item from anywhere in the stop. */
function arcade(rng: Rng): Item {
  const id = 'a1';
  const skin = rng.pick(SKIN_IDS);
  switch (rng.int(1, 9)) {
    case 1: return markPuzzle(rng, { id, skin }).item;
    case 2: return gridPuzzle(rng, { id, skin, ncat: 1 }).item;
    case 3: return onlyOnePuzzle(rng, { id, skin, mode: rng.pick(['col', 'row', 'cant'] as const) }).item;
    case 4: return spreadPuzzle(rng, { id, skin, column: rng.chance(0.4) }).item;
    case 5: return linkPuzzle(rng, { id, skin, mode: rng.pick(['link', 'notLink2', 'notLink'] as const) }).item;
    case 6: return gridPuzzle(rng, { id, skin, ncat: 2 }).item;
    case 7: return proofPuzzle(rng, { id, skin, ncat: 1 }).item;
    case 8: return enoughPuzzle(rng, { id, skin, tell: rng.chance(0.5) }).item;
    default: return gridPuzzle(rng, { id, skin, ncat: rng.chance(0.5) ? 1 : 2 }).item;
  }
}

/** The kind of clue a lesson 1 item turns into a mark: “has” asks for a ✓; an “or” clue names two things. */
function markClueOf(item: Item): MarkClue {
  if (/gets a ✓ from this clue\?$/.test(item.prompt)) return 'is';
  const clue = /“([^”]*)”/.exec(item.prompt)?.[1] ?? '';
  return / or /.test(clue) ? 'either' : 'isnt';
}

/**
 * New examples after a miss (see engine/fresh.ts). Where “Can’t tell yet” is a choice, a miss gets two: one the
 * marks or clues decide and one they do not, so each side of the boundary is checked, starting with the missed
 * skill. A missed lesson 1 mark gets the same kind of clue again. Other skills use the default (one new item on the
 * same skill from the same lesson).
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const id = 'new';
  const skin = () => rng.pick(SKIN_IDS);
  const decided = () => onlyOnePuzzle(rng, { id, skin: skin(), mode: rng.pick(['col', 'row'] as const) }).item;
  const open = () => onlyOnePuzzle(rng, { id, skin: skin(), mode: 'cant' }).item;
  const link = (mode: LinkMode) => linkPuzzle(rng, { id, skin: skin(), mode }).item;
  const enough = (tell: boolean) => enoughPuzzle(rng, { id, skin: skin(), tell }).item;
  const answer = missed.kind === 'choose' ? missed.answer : '';
  switch (missed.skill) {
    case 's4.grid-marks': return [markPuzzle(rng, { id, skin: skin(), t: markClueOf(missed) }).item];
    case 's4.only-one-left': return [decided(), open()];
    case 's4.not-decided': return [open(), decided()];
    case 's4.link': return [link('link'), link('notLink')];
    case 's4.not-link': return answer === CANT ? [link('notLink'), link('notLink2')] : [link('notLink2'), link('notLink')];
    case 's4.enough-clues': return [enough(answer === 'yes'), enough(answer !== 'yes')];
    default: return [];
  }
}

export const stop4: StopDef = {
  n: 4,
  id: 's4',
  title: 'Grid Detective',
  idea: 'When everything else is crossed out, the one left must be true.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
};
