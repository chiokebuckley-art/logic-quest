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
 * Every item also carries the teaching shown after a wrong answer (Item.teach and, on choose items, one
 * ChoiceFeedback per wrong choice), built and computed in the engine. A miss gets new examples from fresh() below.
 */
import {
  CANT,
  EVERYDAY,
  FANTASY,
  SKIN_IDS,
  enoughPuzzle,
  gridPuzzle,
  linkPuzzle,
  markPuzzle,
  onlyOnePuzzle,
  proofPuzzle,
  spreadPuzzle,
  type LinkMode,
  type MarkClue,
  type SkinId,
} from '../engine/puzzles/grid';
import type { Choice, Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

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

const KIDS: Choice[] = [{ id: 'mia', label: 'Mia' }, { id: 'leo', label: 'Leo' }, { id: 'ava', label: 'Ava' }];
const PETS: Choice[] = [{ id: 'cat', label: 'cat' }, { id: 'dog', label: 'dog' }, { id: 'fish', label: 'fish' }];
type M = 'yes' | 'no';
const petGrid = (marks: Partial<Record<'mia' | 'leo' | 'ava', Partial<Record<'cat' | 'dog' | 'fish', M>>>>): Scene => ({
  kind: 'grid',
  rows: KIDS,
  cols: PETS,
  marks: marks as Record<string, Record<string, M>>,
});

/** Card scenes, exported so the tests can check each card's claim by brute force. */
export const CARD_GRIDS = {
  empty: petGrid({}),
  marks: petGrid({ mia: { cat: 'yes' }, leo: { dog: 'no' } }),
  rowLeft: petGrid({ leo: { cat: 'no', dog: 'no' } }),
  colLeft: petGrid({ mia: { fish: 'no' }, ava: { fish: 'no' } }),
  notSoFast: petGrid({ leo: { cat: 'no' } }),
  spreadRow: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' } }),
  spreadBoth: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' }, leo: { cat: 'no' }, ava: { cat: 'no' } }),
  spreadAgain: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' }, leo: { cat: 'no', dog: 'no' }, ava: { cat: 'no' } }),
  petsKnown: petGrid({ mia: { cat: 'yes', dog: 'no', fish: 'no' }, leo: { cat: 'no', dog: 'yes', fish: 'no' }, ava: { cat: 'no', dog: 'no', fish: 'yes' } }),
} as const;

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
        title: 'One each',
        body: [
          'Each person has just one pet. So each row gets just one ✓.',
          'Each pet goes to just one person. So each column gets just one ✓ too.',
          'When the grid is done, every row and every column has exactly one ✓.',
        ],
      },
      {
        title: 'Turn clues into marks',
        scene: { kind: 'clues', clues: ['Mia has the cat.', 'Leo does not have the dog.'] },
        body: [
          '“Mia has the cat” puts a ✓ in the box for Mia and the cat.',
          '“Leo does not have the dog” puts a ✗ in the box for Leo and the dog.',
          'The mark goes where that person’s row meets that choice’s column.',
        ],
      },
      {
        title: '“Or” clues',
        scene: { kind: 'clues', clues: ['Ava has the dog or the fish.'] },
        body: [
          '“Ava has the dog or the fish” does not give you a ✓ yet.',
          'But it does tell you that Ava does not have the cat. So the box for Ava and the cat gets a ✗.',
          'Look for the choice an “or” clue leaves out.',
        ],
      },
    ],
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
        title: 'Count the empty boxes',
        body: [
          'Before you put a ✓, count the empty boxes in its row or its column.',
          'Is just one box left? Then it gets the ✓.',
          'Are two or more left? Then you can’t tell from the boxes you counted. Look at the other rows and columns too.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      return distinct([
        () => onlyOnePuzzle(rng, { id: 'l2-1', skin: skins[0], mode: 'col', n: 3 }).item,
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
        scene: { kind: 'clues', clues: ['The kid with the dog eats popcorn.'] },
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
        scene: { kind: 'clues', clues: ['The kid with the dog does not eat popcorn.'] },
        body: [
          '“The kid with the dog does not eat popcorn” is a clue too.',
          'If Leo has the dog, Leo’s popcorn box gets a ✗.',
          'But you still don’t know who eats popcorn. It could be Mia or Ava.',
        ],
      },
      {
        title: 'Links work both ways',
        body: [
          'Say the kid with the dog eats popcorn. You find out that Ava eats popcorn.',
          'Only one kid eats popcorn, so Ava must be the kid with the dog.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const modes: LinkMode[] = rng.shuffle(['link', 'notLink2', 'notLink']);
      return distinct([
        () => linkPuzzle(rng, { id: 'l4-1', skin: skins[0], mode: modes[0] }).item,
        () => linkPuzzle(rng, { id: 'l4-2', skin: skins[1], mode: modes[1] }).item,
        () => linkPuzzle(rng, { id: 'l4-3', skin: skins[2], mode: modes[2] }).item,
        () => gridPuzzle(rng, { id: 'l4-4', skin: skins[3], ncat: 2 }).item,
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
        scene: { kind: 'clues', clues: ['Mia has the dog.'] },
        body: [
          '“Mia has the dog” proves that Leo does not have the dog.',
          'Why? Only one kid can have the dog. So this one clue is enough by itself.',
          'Other facts need two or more clues put together.',
        ],
      },
      {
        title: 'Can you tell yet?',
        scene: { kind: 'clues', clues: ['Mia does not have the fish.'] },
        body: [
          'Say this is the only clue so far. Who has the fish?',
          'Leo could have it. So could Ava. The clue does not decide between them.',
          'So you can’t tell yet. More clues are needed.',
        ],
      },
      {
        title: 'Stuck? Read again',
        body: [
          'If no row or column is down to one empty box, read the clues again.',
          'A linking clue or an “or” clue may give you a new ✗.',
          'Every puzzle here can be solved without guessing.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const tell = rng.shuffle([true, false]);
      return distinct([
        () => proofPuzzle(rng, { id: 'l5-1', skin: skins[0] }).item,
        () => enoughPuzzle(rng, { id: 'l5-2', skin: skins[1], tell: tell[0] }).item,
        () => proofPuzzle(rng, { id: 'l5-3', skin: skins[2], ncat: rng.chance(0.4) ? 2 : 1 }).item,
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
    () => proofPuzzle(rng, { id: 'c8', skin: any() }).item,
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
    case 7: return proofPuzzle(rng, { id, skin }).item;
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
