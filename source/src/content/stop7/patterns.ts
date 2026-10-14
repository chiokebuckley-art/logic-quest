/**
 * Stop 7, Lesson 1 · Pattern guesses (induction).
 * Several same examples suggest a pattern: a good guess. A new case can still break it, so a pattern is not a proof.
 *
 * See: a pattern guess, likely is not must, a new case can break it, nothing is ever due, and a worked bag with four
 * shape sentences marked Must / Likely / Unlikely / Can’t. Do: the same bag, the color sentences and a streak to mark;
 * then a twin bag (the squares are gone) to mark again. Quiz: which word fits a bag you can count (pattern-chance),
 * what you know for sure after a streak (pattern-sure), the “due” trap (pattern-due, a conflict item), and the
 * can-fail question: a new case breaks a streak (pattern-break, tag can-fail).
 *
 * Kid layer (Grade 2, PATTERNS_KID): a picture and one line per card, the boards one row at a time with their bag as
 * the picture, and every item's kid words: its bag or its draws as pictures with no words (a bag you can see into
 * and each thing in it, or a bag nobody can see into and each draw), and an item whose answers are sentences asked as
 * its kid-only form on the same case, with the four word tiles (Must, Likely, Unlikely, Can’t) or a yes and a no tile.
 *
 * Every answer comes from ../../engine/puzzles/patterns.ts.
 */
import {
  FRAMES,
  NAMES,
  breakItem,
  chanceItem,
  colorBoard,
  dueItem,
  patternIdeas,
  skinsOf,
  sureItem,
  twinBoard,
  type Frame,
  type PatternMade,
  type SkinId,
} from '../../engine/puzzles/patterns';
import type { Item, KidLesson, KidRow, Rng } from '../../engine/types';
import { CAN_FAIL, distinctItems, practiceOf, type LessonModule, type Made } from './common';

const ID = 's7.l1';

const skinIn = (rng: Rng, f: Frame): SkinId => rng.pick(skinsOf(f));
const anySkin = (rng: Rng): SkinId => skinIn(rng, rng.pick(FRAMES));

type Maker = (rng: Rng, skin: SkinId, name?: string) => PatternMade;
const MAKERS: Record<'chance' | 'sure' | 'due' | 'break', Maker> = {
  chance: (rng, skin, name) => chanceItem(rng, skin, { name }),
  sure: (rng, skin, name) => sureItem(rng, skin, { name }),
  due: (rng, skin, name) => dueItem(rng, skin, { name }),
  break: (rng, skin, name) => breakItem(rng, skin, { name }),
};

/**
 * The quiz: 4 items. First a gentle bag you can count (pattern-chance); then, in any order, what you know for sure
 * after a streak, the “due” trap and the can-fail question. The four use at least two skins (every frame once, then
 * one more), so no pack is all marbles or all shapes.
 */
function pack(rng: Rng): Made[] {
  const one = distinctItems();
  const frames = [...rng.shuffle(FRAMES), rng.pick(FRAMES)];
  const kinds = ['chance', ...rng.shuffle(['sure', 'due', 'break'] as const)] as const;
  // A different child in each story of the pack.
  const names = rng.shuffle(NAMES);
  return kinds.map((k, i) => one(() => MAKERS[k](rng, skinIn(rng, frames[i]), names[i])));
}

// ---------- the kid layer (Grade 2, docs/KID-JOURNEY.md) ----------
//
// Beside the classic text, never instead of it. Grade 2's budget: at most 20 words on a screen, buttons and the header
// ("Round k of n", 4 words) included, so 16 words of content (14 on a card, beside "Back" and "Next"); 2 sentences, 10
// words in a sentence. The one new word is "likely", named on the second card; no kid line says "due" (they say "has
// to come soon"). The items' kid words come from the generators in ../../engine/puzzles/patterns.ts.

/** A board row marked under the board's line, with the board's bag as its picture (a kid board does not draw the scene). */
const row = (label: string, art: KidRow['art']): KidRow => ({ label, art });

/** The round's kid layer: one line and a picture per card, each board's line and rows, and the star line. */
export const PATTERNS_KID: KidLesson = {
  cards: [
    { line: 'Four reds in a row. A good guess: red again, but not for sure.', art: 'guess-reds' },
    { line: 'Likely: most of them, not all. Red is likely, not a must.', art: 'guess-bag-six-one' },
    { line: 'Six circles, then a square! One new one broke the guess.', art: 'guess-break' },
    { line: 'Each one goes back, so the bag stays the same. Blue is still unlikely.', art: 'guess-goes-back' },
    { line: 'Count what fits, then pick: must, likely, unlikely or can’t.', art: 'guess-bag-example' },
  ],
  board: [
    {
      // The four shape rows are the worked case (given); the four color rows and the streak are marked one at a time.
      line: 'Which word fits the next card?',
      rows: [
        {}, {}, {}, {},
        row('Red?', 'guess-bag-example'),
        row('Blue?', 'guess-bag-example'),
        row('Yellow?', 'guess-bag-example'),
        row('Red or blue?', 'guess-bag-example'),
        row('After three reds: blue?', 'guess-bag-example'),
      ],
    },
    {
      line: 'The squares are gone: which word fits?',
      rows: [row('A circle?', 'guess-bag-twin'), row('A square?', 'guess-bag-twin'), row('Red?', 'guess-bag-twin'), row('Blue?', 'guess-bag-twin')],
    },
  ],
  star: 'Likely is not must, and you know it!',
};

export const lesson: LessonModule['lesson'] = {
  id: ID,
  title: 'Pattern guesses',
  ideas: patternIdeas(),
  drill: [colorBoard(`${ID}-do`), twinBoard(`${ID}-do2`)],
  practice: practiceOf(ID, pack),
  pass: { firstTry: 3, include: [CAN_FAIL] },
  kid: PATTERNS_KID,
  terms: [
    { term: 'good guess', means: 'What is most likely from what you saw. It can still be wrong, so check it before you are sure.' },
    { term: 'proof', means: 'A proof shows something must be true, with no other way. Many same examples are never a proof.' },
  ],
};

/** Two items for the stop check: the “due” trap (a conflict item) and one other kind, in different skins. */
export function checkItems(rng: Rng): Made[] {
  const one = distinctItems();
  const [f1, f2] = rng.shuffle(FRAMES);
  const [n1, n2] = rng.shuffle(NAMES);
  const due = one(() => dueItem(rng, skinIn(rng, f1), { name: n1 }));
  const other = rng.pick(['chance', 'sure', 'break'] as const);
  return [due, one(() => MAKERS[other](rng, skinIn(rng, f2), n2))];
}

/** One Arcade item of any kind. */
export function arcadeItem(rng: Rng): Made {
  const k = rng.pick(['chance', 'sure', 'due', 'break'] as const);
  return MAKERS[k](rng, anySkin(rng));
}

/** The default new examples (another item with the same skill from the practice) fit every kind here. */
export function freshItems(_missed: Item, _rng: Rng): Made[] {
  return [];
}
