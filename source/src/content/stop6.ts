/**
 * Stop 6 · If… then.
 * An if–then rule only breaks one way: the IF part happens and the THEN part does not.
 *
 *  l1 When is a rule broken?   who broke the rule / did this case break it
 *  l2 Turning it around        going forward works; going backward can’t tell ("Rex could be a cat.")
 *  l3 The four moves           IF happened, THEN didn’t happen (these follow); THEN happened, IF didn’t (traps)
 *  l4 Flip and NOT             flip and NOT means the same; flip only and NOT only do not (truth table)
 *  l5 Rule checker             which cards must you turn over? The IF card and the NOT-THEN card
 *  l6 Only if, and unless      “P only if Q” is “If P, then Q”; “P unless Q” is “If not Q, then P” (trap: “only if” turned around)
 *  l7 Both ways                “if and only if” breaks in two boxes; the IF part is enough, the THEN part is needed
 *                              (trap: “needed” read as “enough”); lesson 5's cards again, in those words
 *
 * Every answer, explanation and tip comes from ../engine/puzzles/conditionals.ts, which works each one out
 * from the four-row truth table. Skins: everyday, fantasy and abstract (letters and numbers, P and Q).
 * After a wrong answer, each item teaches with the rows of that table in the story's words, and `fresh` gives the
 * same situation in a new story plus its boundary partner (see "new examples after a miss" below).
 *
 * Every lesson is taught See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026). See: a key-idea card marks one case
 * on its board. Do: the learner marks a new case on that same board by taps (the boards below, built by the engine,
 * so every mark is computed). Quiz: twins of the same rule family only. Lesson 1 never turns a rule around. Lesson 2
 * (the converse trap) marks its own rule's four boxes by hand before anything is turned around, since lessons can be
 * opened in any order. "Which sentence means the same?" offers only the three sentences lesson 4 marks (no odd
 * rewrites), in practice, the check, the Arcade and new examples alike.
 *
 * Distinctions taught apart (docs/audit/hidden-distinctions.md, Stop 6):
 *  - letter-vs-truth (lesson 1): P and Q stand for the IF part and the THEN part, and “P is true” means the IF part
 *    happened. Card “Letters for the parts” (the same case in words and with letters), then the four boxes with
 *    letters; the key line on every P and Q rule card; P and Q case cards name the letters; lesson 4 marks the same
 *    test with letters. Lessons 2 to 4 pass only with a P and Q question right on the first try, and each reminds on
 *    a card (taughtIn lesson 1): forward with letters, the four facts with letters, “not P” with letters.
 *  - broken-vs-cant-happen (lesson 2, reminded in lesson 3): lesson 1's rules can be broken (a break is a real kid);
 *    lessons 2 and 3 use rules that are always true here, so the case that would break the rule can't happen. Card
 *    “Broken, or can’t happen?”, then the four boxes marked can happen or can't. Every lesson 2 and 3 rule card and
 *    case says “Always true here: …”; lessons 4 and 5 say their own frame. The first lesson 2 and 3 question is
 *    marked on its own cases first.
 *  - only-if-vs-if (lesson 6): the part after “only if” is needed; after plain “if” it is enough. Contrast card “Only if
 *    is not plain if” (Kai with a card and no book), then the only-if rule against its if–then sentence and plain “if”.
 *  - needed-vs-enough (lesson 7): Dee ate all the veggies and got no dessert, under “needed” and under “enough”, then
 *    the two sentences against the rule.
 *
 * The check ends with a closing why item (tag `why`, reasons as choices): why “only if” points the way it does (lesson
 * 6) or why the THEN card need not be turned (lesson 7). The warm-up on the stop page (`bridge`) is a Stop 5 “suppose it
 * and test it” question.
 */
import {
  BROKEN_VS_CANT,
  CARD_SKINS,
  FORMS,
  FORM_CONDS,
  FORM_STORIES,
  IFF_STORIES,
  MISREAD,
  NEEDED_VS_ENOUGH,
  NEED_CLOSING,
  NEED_IDS,
  NEED_SKINS,
  NEED_TRAP,
  NEED_WORDS,
  ONLY_IF_CLOSING,
  ONLY_IF_STORIES,
  ONLY_IF_TRAP,
  ONLY_IF_VS_IF,
  RULE,
  UNLESS_STORIES,
  WHY_CARD_SKINS,
  WHY_TAG,
  cap,
  condColumn,
  condHolds,
  formBoxDrill,
  formBroken,
  formDidItem,
  formHolds,
  formNote,
  formPickItem,
  formScene,
  formText,
  formWhoItem,
  formWhy,
  iffConfused,
  iffWhoItem,
  misreadMatters,
  needColumn,
  needCond,
  needConfused,
  needContrast,
  needPickItem,
  needYesNoItem,
  onlyIfConfused,
  onlyIfContrast,
  plainIfText,
  rowId,
  sameMeaning,
  sentenceGridDrill,
  storyGroup,
  storyIf,
  storyOf,
  unlessConfused,
  whyCardItem,
  whyOnlyIfItem,
  CONTRA,
  CONVERSE,
  HAT_BOXES,
  INVERSE,
  KEPT_CLOSING,
  L1_SKINS,
  LETTERS_CLOSING,
  LETTER_VS_TRUTH,
  LITS,
  MOVES,
  MOVE_FACT,
  MOVE_TAGS,
  PET_BOXES,
  PQ_BOXES,
  PQ_KEY,
  REWRITES,
  ROWS,
  SENTENCE_WHO,
  SKINS,
  SKIN_IDS,
  boxMixes,
  boxWords,
  brokenContrast,
  canBoxDrill,
  cardDrill,
  cardItem,
  checkerItem,
  condText,
  didBreakItem,
  factCasesDrill,
  factWork,
  follows,
  fourBoxDrill,
  keptConfused,
  lettersContrast,
  litHolds,
  meaningDrill,
  meaningGrid,
  moveItem,
  moveRule,
  pqConfused,
  rowAt,
  rowOfCase,
  ruleGrid,
  ruleHolds,
  ruleScene,
  ruleText,
  sameYesNoItem,
  samePickItem,
  skinsIn,
  turnItem,
  whoBrokeItem,
  type CondMade,
  type FormMade,
  type Group,
  type Lit,
  type NeedId,
  type NeedSkin,
  type Move,
  type Rewrite,
  type Row,
  type SkinId,
  type StoryId,
} from '../engine/puzzles/conditionals';
import { SKIN_IDS as KNIGHT_SKINS, supposeItem } from '../engine/puzzles/knights';
import type { DrillStep, IdeaCard, Item, LessonDef, LessonPass, Rng, Scene, StopDef } from '../engine/types';

const STOP = 6;
const L1 = 's6.l1';
const L2 = 's6.l2';
const L3 = 's6.l3';
const L4 = 's6.l4';
const L5 = 's6.l5';
const L6 = 's6.l6';
const L7 = 's6.l7';

/**
 * A made item, placed in its lesson. Its tags are the generator's skill tag plus any the generator set ('pq' on a P and
 * Q question), so a lesson's pass rule can ask for them (LessonPass.include).
 */
const finish = (m: Pick<CondMade, 'tag' | 'item'>, id: string, lesson: string): Item =>
  ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item, tags: [...new Set([m.tag, ...(m.item.tags ?? [])])] }) as Item;

/** Lessons 2 to 4 pass only with a P and Q question right on the first try: the letters were taught in lesson 1. */
const PQ_PASS: LessonPass = { firstTry: 3, include: [{ tag: 'pq', label: 'a question with P and Q' }] };

/** The first quiz of a new method carries its own board, marked before the answer buttons show. */
const withWork = (it: Item, work?: DrillStep): Item => (work ? { ...it, workFirst: work } : it);

/**
 * Makes the items of one set. No two items in a set share a prompt and scene: a repeat is thrown away
 * and made again from the same rng, so the same seed still gives the same set.
 */
function distinctItems(): <M extends Pick<CondMade, 'item'>>(make: () => M) => M {
  const seen = new Set<string>();
  const key = (m: Pick<CondMade, 'item'>) => JSON.stringify([m.item.prompt, m.item.scene ?? null]);
  return <M extends Pick<CondMade, 'item'>>(make: () => M): M => {
    let m = make();
    for (let tries = 0; tries < 50 && seen.has(key(m)); tries++) m = make();
    seen.add(key(m));
    return m;
  };
}

/** A skin from `from` not used yet in this set (any from `from` once they are all used). */
function skinDeck(rng: Rng): (from: readonly SkinId[]) => SkinId {
  const used = new Set<SkinId>();
  return (from) => {
    const fresh = from.filter((s) => !used.has(s));
    const s = rng.pick(fresh.length ? fresh : from);
    used.add(s);
    return s;
  };
}

/**
 * Skins for a practice set: one everyday, one fantasy, one abstract (when `from` has them), then others, shuffled.
 * `must`: a skin every set has (P and Q in lessons 2 to 4, for the pass rule); it fills its group's place.
 */
function practiceSkins(rng: Rng, count: number, from: readonly SkinId[], must?: SkinId): SkinId[] {
  const next = skinDeck(rng);
  const out: SkinId[] = must ? [next([must])] : [];
  for (const g of ['everyday', 'fantasy', 'abstract'] as const) {
    if (must && SKINS[must].group === g) continue;
    const inGroup = skinsIn(g, from);
    if (inGroup.length && out.length < count) out.push(next(inGroup));
  }
  while (out.length < count) out.push(next(from));
  return rng.shuffle(out);
}

const face = (skin: SkinId, l: Lit) => SKINS[skin].cards!.face(l, { vowel: 'E', consonant: 'K', even: '4', odd: '7' });
const part = (skin: SkinId, l: Lit) => SKINS[skin].parts[l].if;

/** The four moves as a summary card, worked out from the truth table (the same words the teaching uses). */
function movesScene(): Scene {
  const order: Move[] = ['mp', 'mt', 'ac', 'da'];
  return { kind: 'text', lines: order.map((m) => moveRule(MOVE_FACT[m])) };
}

// ---------- See and Do: the worked boards, and the boards the learner marks ----------
//
// Each board is built by an engine helper (conditionals.ts, "the Do step"), so every mark is computed from the truth
// table. Each board is the board of a key-idea card (the same scene), or a twin that says what changed.

/** A pet fact in the story's words: pet('Q', 'Rex') is "Rex has four legs". */
const pet = (l: Lit, name: string) => SKINS.pets.fact(l, name);
/** A fact with letters: pqFact('notP') is "P is false". */
const pqFact = (l: Lit) => SKINS.pq.fact(l, '');

/** Lesson 1, See: the lunchroom rule card, and its four boxes with three ✓ and one ✗ (the break, named in the caption). */
export const L1_RULE = ruleScene('dessert');
export const L1_SEE = ruleGrid('dessert');

/**
 * Lesson 1, Do: the same four boxes, empty. The learner marks every box; the only ✗ goes on the break. It opens after
 * card 5 (“THEN without IF is fine”, on the same rule card), before “Letters for the parts” and its board.
 */
export const L1_DRILL: DrillStep = {
  ...fourBoxDrill(boxWords('dessert'), {
    id: 's6.l1-do',
    title: 'Mark the four boxes',
    body: [
      'These are the four boxes from the example, now empty. The rule is the same.',
      'Mark each box. Put a ✓ if a kid in that box keeps the rule. Put a ✗ if the kid breaks it.',
    ],
  }),
  afterCard: 4,
};

/** Lesson 1, Do again: the handoff's sample. The same four boxes, with a new rule: a red card and a hat. */
export const L1_TWIN: DrillStep = {
  ...fourBoxDrill(HAT_BOXES, {
    id: 's6.l1-do-hat',
    title: 'A new rule, the same four boxes',
    body: [`Here is a new rule: “${HAT_BOXES.lines[1]}”`, 'Mark the four boxes again. A ✓ keeps the rule. A ✗ breaks it.'],
    twin: 'The same four boxes, with a new rule: a red card and a hat.',
  }),
  afterCard: 4,
};

/**
 * Lesson 1, the letters (s6-pq-letters-untaught): before any P and Q question, a card tells the same case in the
 * lunchroom's words and with letters (the same truths), and the learner marks the four boxes with letters. The rule
 * card carries the key line (PQ_KEY).
 */
export const L1_LETTERS: IdeaCard = {
  title: 'Letters for the parts',
  distinction: LETTER_VS_TRUTH.id,
  body: [
    `Some rules use letters for the parts: “${ruleText('pq')}” P stands for the IF part. Q stands for the THEN part.`,
    `Each letter stands for a whole sentence, like “${SKINS.dessert.parts.P.if}.” So “P is true” means the IF part happened. “Q is false” means the THEN part did not happen.`,
    'Below is the same case, told two ways.',
  ],
  scene: lettersContrast(),
};

/** The four boxes with letters, before the lesson's own words are added. */
const L1_PQ_BOARD = fourBoxDrill(PQ_BOXES, {
  id: 's6.l1-do-pq',
  title: 'The four boxes, with letters',
  body: [
    'Read each row and column with the key line: “P is true” means the IF part happened. “Q is false” means the THEN part did not.',
    'Mark each box. Put a ✓ if that case keeps the rule. Put a ✗ if it breaks the rule.',
  ],
  twin: 'The same four boxes, with letters for the parts.',
});
/** The box that breaks the rule (P is true, Q is false), and the mark that says it keeps the rule. */
const PQ_BREAK = L1_PQ_BOARD.rows.flatMap((r) => r.marks).find((m) => m.id === 'P-notQ')!;
const PQ_BREAK_KEPT = PQ_BREAK.options.find((o) => o.id !== PQ_BREAK.answer)!.id;
/** Ben's case from “Letters for the parts”, part by part: in words, and with letters (P is true, Q is false). */
const BEN_ROW = rowAt(true, false);
const benPart = (l: 'P' | 'Q') => {
  const lit: Lit = litHolds(l, BEN_ROW) ? l : l === 'P' ? 'notP' : 'notQ';
  return `${SKINS.dessert.fact(lit, 'Ben')}, so ${SKINS.pq.fact(lit, '')}.`;
};

/**
 * Its board, right after it: the four boxes with letters for the parts. The break box marked as kept is read as the
 * letters taken for things: Ben's case is the same case in words.
 */
export const L1_PQ: DrillStep = {
  ...L1_PQ_BOARD,
  afterCard: 5,
  distinction: LETTER_VS_TRUTH.id,
  misconceptions: [
    {
      id: 'letter-as-thing',
      when: 'picks',
      picks: { [PQ_BREAK.id]: PQ_BREAK_KEPT },
      text: `You may be treating the letter P and “P is true” as the same thing. They are two different things: P stands for the IF part, and “P is true” means the IF part happened. ${benPart('P')} ${benPart('Q')} ${ruleHolds(BEN_ROW) ? 'That case keeps the rule.' : 'That case breaks the rule.'}`,
    },
  ],
  confused: pqConfused(),
  words: { closing: LETTERS_CLOSING },
};

/** Lessons 2 and 3, See: the pet rule card, always true in this story (“Always true here: …”). */
export const PETS_KEPT = ruleScene('pets', 'kept');

/** Lesson 2, See: the pet rule card of “One way only”, where a cat with four legs keeps the rule. Always true here too. */
export const L2_RULE = PETS_KEPT;

/**
 * Lesson 2, Do first: the pet rule's four boxes, empty, all the learner's. The handoff puts any rule turned around
 * (the converse trap) only after the four boxes are marked by hand. Lessons can be opened in any order, so this
 * lesson marks them itself before its quiz. The board is the “One way only” card's rule card (the same scene, with
 * the always-true line), right after that card. Its mix-ups: the break box kept (“nobody breaks it here”), and the
 * cat's box broken (the rule read turned around).
 */
export const L2_BOXES: DrillStep = {
  ...fourBoxDrill(PET_BOXES, {
    id: 's6.l2-do-boxes',
    title: 'Mark the four boxes',
    body: [
      'Now mark the four boxes of this rule. Each box is one kind of animal.',
      'Put a ✓ if a case in that box keeps the rule. Put a ✗ if a case in that box would break it.',
    ],
  }),
  afterCard: 0,
  misconceptions: boxMixes(PET_BOXES),
  confused: keptConfused('pets'),
  words: { closing: KEPT_CLOSING },
};

/**
 * Lesson 2, right after “Broken, or can’t happen?”: the same four boxes, marked can happen or can't happen here. The
 * box that breaks the rule is the one that can't happen, since the rule is always true here.
 */
export const L2_CAN: DrillStep = {
  ...canBoxDrill('pets', PET_BOXES, {
    id: 's6.l2-do-can',
    title: 'Can it happen here?',
    body: [
      'The same four boxes. Here the rule is always true: no animal breaks it.',
      'Mark each box. Put a check if that case can happen here. Put a cross if it can’t happen.',
    ],
    twin: 'The same four boxes. Now mark if each case can happen here.',
  }),
  afterCard: 2,
};

/**
 * Lesson 2, before “Could it happen another way?” (s6-l2-breakable-vs-always-kept): the same case under a rule kids
 * can break (lesson 1) and under a rule that is always true here. Ben did not change; only the rule did.
 */
export const L2_BROKEN: IdeaCard = {
  title: 'Broken, or can’t happen?',
  distinction: BROKEN_VS_CANT.id,
  body: [
    `In Lesson 1, kids could break the lunchroom rule: “${ruleText('dessert')}” ${SKINS.dessert.says('Ben', rowAt(true, false))}, so Ben broke it.`,
    'In this lesson, each rule is always true. Nobody breaks it. So a case that would break the rule can’t happen here. We say that case crashes, and we cross it out.',
    'Below is the same case, two ways.',
  ],
  scene: brokenContrast(),
};

/** Lesson 2, Do: going backward. Rex has four legs. Rex as a cat is shown (the card's case); the learner marks Rex as a dog. */
export const L2_BACK: DrillStep = factCasesDrill(
  'pets',
  {
    id: 's6.l2-do-back',
    title: 'Mark a case: going backward',
    body: [`${pet('Q', 'Rex')}. That is the THEN part. Two cases fit it.`, 'The case from the example is marked. Mark the other case. Can it happen here? Is each sentence true in it?'],
  },
  [{ name: 'Rex', fact: 'Q', say: ['P', 'notP'], shown: [rowAt(false, true)], mark: [rowAt(true, true)] }],
  'status',
  { scaffold: 'full' },
);

/** Lesson 2, Do: going forward. Max is a dog. Max with four legs is shown; the learner marks Max without four legs. */
export const L2_FWD: DrillStep = factCasesDrill(
  'pets',
  {
    id: 's6.l2-do-fwd',
    title: 'Mark a case: going forward',
    body: [`${pet('P', 'Max')}. That is the IF part. Two cases fit it.`, 'One case is marked. Mark the other case the same way.'],
  },
  [{ name: 'Max', fact: 'P', say: ['Q', 'notQ'], shown: [rowAt(true, true)], mark: [rowAt(true, false)] }],
  'status',
  { scaffold: 'full' },
);

/**
 * Lesson 3, Do: a part happened. Rex is a dog (something follows); Max has four legs (nothing follows). Each pet's
 * shown case can happen; the learner marks the case that decides it: Rex without four legs can’t happen, and Max
 * as a cat with four legs can.
 */
export const L3_HAPPENED: DrillStep = factCasesDrill(
  'pets',
  {
    id: 's6.l3-do-happened',
    title: 'Mark the cases: a part happened',
    body: [`${pet('P', 'Rex')}. ${pet('Q', 'Max')}. One case for each pet is marked, as in the examples.`, 'Mark the other case for each pet. Can it happen here? Is the sentence true in it?'],
  },
  [
    { name: 'Rex', fact: 'P', say: ['Q'], shown: [rowAt(true, true)], mark: [rowAt(true, false)] },
    { name: 'Max', fact: 'Q', say: ['P'], shown: [rowAt(true, true)], mark: [rowAt(false, true)] },
  ],
  'follows',
  { scaffold: 'full' },
);

/**
 * Lesson 3, Do: a part did not happen. Pip does not have four legs (something follows); Coco is not a dog (nothing
 * follows). The learner marks the case that decides it: Pip as a dog can’t happen, and Coco as a cat with four legs can.
 */
export const L3_NOT: DrillStep = factCasesDrill(
  'pets',
  {
    id: 's6.l3-do-not',
    title: 'Mark the cases: a part did not happen',
    body: [`${pet('notQ', 'Pip')}. ${pet('notP', 'Coco')}. One case for each pet is marked, as in the examples.`, 'Mark the other case for each pet the same way.'],
  },
  [
    { name: 'Pip', fact: 'notQ', say: ['P'], shown: [rowAt(false, false)], mark: [rowAt(true, false)] },
    { name: 'Coco', fact: 'notP', say: ['Q'], shown: [rowAt(false, false)], mark: [rowAt(false, true)] },
  ],
  'follows',
);

/** Lesson 4, Do: the example's four cases. The rule's boxes are shown; the learner marks the flip and NOT sentence. */
export const L4_SAME: DrillStep = meaningDrill(
  'pets',
  {
    id: 's6.l4-do-same',
    title: 'Test the flip and NOT sentence',
    body: [
      'These are the four cases from the example. The rule’s boxes are marked.',
      `Flip and NOT: “${condText('pets', CONTRA)}” Mark a ✓ if a case keeps it, a ✗ if a case breaks it.`,
    ],
  },
  ['contra'],
);

/** Lesson 4, Do: the same four cases. The learner marks flip only and NOT only. */
export const L4_TRAPS: DrillStep = meaningDrill(
  'pets',
  {
    id: 's6.l4-do-traps',
    title: 'Test flip only and NOT only',
    body: [
      'The same four cases. The rule’s boxes are marked.',
      `Flip only: “${condText('pets', CONVERSE)}”`,
      `NOT only: “${condText('pets', INVERSE)}”`,
      'Mark a ✓ if a case keeps the sentence, a ✗ if it breaks it.',
    ],
  },
  ['converse', 'inverse'],
);

/**
 * Lesson 4, Do last: the same test with letters for the parts (s6-pq-letters-untaught), before any P and Q question
 * in this lesson. The rule's boxes are shown; the learner marks the three sentences.
 */
export const L4_PQ: DrillStep = {
  ...meaningDrill(
    'pq',
    {
      id: 's6.l4-do-pq',
      title: 'The same test, with letters',
      body: [
        PQ_KEY,
        `Flip and NOT: “${condText('pq', CONTRA)}”`,
        `Flip only: “${condText('pq', CONVERSE)}”`,
        `NOT only: “${condText('pq', INVERSE)}”`,
        'Mark a ✓ if a case keeps the sentence, a ✗ if it breaks it.',
      ],
      twin: 'The same four cases, with letters for the parts.',
    },
    ['contra', 'converse', 'inverse'],
  ),
  confused: pqConfused(),
  words: { closing: LETTERS_CLOSING },
};

/** Lesson 5, Do: the lunchroom cards. The “Dessert” card is shown checked (the card's case); the learner checks the rest. */
export const L5_CARDS: DrillStep = cardDrill(
  'dessert',
  {
    id: 's6.l5-do',
    title: 'Check each card',
    body: [
      `These are the lunchroom cards. The “${face('dessert', 'P')}” card is checked, as in the example.`,
      'For each other card, mark what each back would do to the rule. Then say if you must turn it over.',
    ],
  },
  ['P'],
  ['notQ', 'Q', 'notP'],
);

/** Lesson 5, Do again: the letter cards from the example. E is shown checked; the learner checks 7 and 4. */
export const L5_LETTERS: DrillStep = cardDrill(
  'letters',
  {
    id: 's6.l5-do-letters',
    title: 'Check the letter cards',
    body: [
      `The same job, with letters and numbers. The ${face('letters', 'P')} card is checked.`,
      `Mark the ${face('letters', 'notQ')} card and the ${face('letters', 'Q')} card the same way.`,
    ],
  },
  ['P'],
  ['notQ', 'Q'],
);

// ---------- lessons 6 and 7: only if, unless, if and only if, needed and enough ----------
//
// Every board below is built by an engine helper (conditionals.ts, "lessons 6 and 7"), so every mark comes from the
// rule said as if–then rules. Each board is the board of a key-idea card (the same rule card), right after it.

/** Lesson 6's stories: the library rule with “only if”, and recess with “unless”. Lesson 7: dessert with “if and only if”. */
const ONLY = storyOf('library', 'only-if');
const UNLESS = storyOf('recess', 'unless');
const IFF = storyOf('dessert', 'iff');
const [TT, TF, FT, FF] = [rowAt(true, true), rowAt(true, false), rowAt(false, true), rowAt(false, false)];
const bare = (s: string) => s.replace(/\.$/, '');
const kaseOf = (w: { kase: Record<string, string> }, r: Row) => w.kase[`${r.p ? 'T' : 'F'}${r.q ? 'T' : 'F'}`];

/** Lesson 6, See: the library rule card with “only if”, and the recess rule card with “unless”. */
export const L6_ONLY_RULE = formScene(ONLY, 'only-if');
export const L6_UNLESS_RULE = formScene(UNLESS, 'unless');
/** Lesson 7, See: the dessert rule with “if and only if”, and the plain dessert rule to compare needed and enough. */
export const L7_IFF_RULE = formScene(IFF, 'iff');
export const L7_NEED_RULE = ruleScene('dessert', 'compare');
export const L7_CARDS_RULE = ruleScene('letters', 'check');

const UNLESS_CLOSING = 'Those two ideas are apart now. “Unless” makes one promise only: when the part after it does not happen, the part before it does.';

/** Lesson 6, Do: the four boxes of the only-if rule, right after the card that marks Kai's box in words. */
export const L6_ONLY_BOXES: DrillStep = {
  ...formBoxDrill(ONLY, 'only-if', {
    id: 's6.l6-do-only',
    title: 'Mark the four boxes',
    body: ['These are the four boxes of the only-if rule.', 'Mark each box. Put a ✓ if a kid in that box keeps the rule. Put a ✗ if the kid breaks it.'],
  }),
  afterCard: 0,
  confused: onlyIfConfused(),
  words: { closing: ONLY_IF_CLOSING },
};

/** The plain-if column of lesson 6's grid, marked as if it said “only if”: the misreading the contrast card names. */
const plainCopied = ROWS.filter((r) => condHolds(MISREAD['only-if'], r) !== formHolds('only-if', r));

/**
 * Lesson 6, right after the contrast card: the four cases with the only-if rule marked. The learner marks the rule said
 * with if–then, and the same words with plain “if”. Only the first breaks in the same box.
 */
export const L6_ONLY_VS_IF: DrillStep = {
  ...sentenceGridDrill(ONLY.kase, L6_ONLY_RULE, {
    id: 's6.l6-do-only-vs-if',
    title: 'Only if, or plain if?',
    body: [
      'The only-if rule is marked. Now mark the other two sentences.',
      `If, then: “${storyIf(ONLY, FORM_CONDS['only-if'][0])}”`,
      `Plain if: “${plainIfText(ONLY)}”`,
      'Put a ✓ if a case keeps the sentence. Put a ✗ if it breaks it.',
    ],
  }, [
    { id: 'only', label: 'Only if', name: 'the only-if rule', holds: (r) => formHolds('only-if', r), given: true },
    condColumn(ONLY, 'if-then', 'If, then', 'the if–then sentence', FORM_CONDS['only-if'][0]),
    condColumn(ONLY, 'plain', 'Plain if', 'the plain-if rule', MISREAD['only-if']),
  ]),
  afterCard: 2,
  distinction: ONLY_IF_VS_IF.id,
  misconceptions: [
    {
      id: 'plain-as-only-if',
      when: 'picks',
      picks: Object.fromEntries(plainCopied.map((r) => [`${r.p ? 'T' : 'F'}${r.q ? 'T' : 'F'}-plain`, formHolds('only-if', r) ? 'yes' : 'no'])),
      text: `You may be treating “only if” and plain “if” as the same thing. They are two different things: with “only if,” the card is needed. With plain “if,” the card is enough. ${cap(kaseOf(ONLY, FT))} keeps one and breaks the other.`,
    },
  ],
  confused: onlyIfConfused(),
  words: { closing: ONLY_IF_CLOSING },
};

/** Lesson 6, Do: the four boxes of the unless rule, right after the card that marks a dry day in words. */
export const L6_UNLESS_BOXES: DrillStep = {
  ...formBoxDrill(UNLESS, 'unless', {
    id: 's6.l6-do-unless',
    title: 'Mark the four boxes again',
    body: ['These are the four boxes of the unless rule.', 'Mark each box. Put a ✓ if a day in that box keeps the rule. Put a ✗ if the day breaks it.'],
  }),
  afterCard: 3,
  confused: unlessConfused(),
  words: { closing: UNLESS_CLOSING },
};

/** Lesson 6, Do: the unless rule marked; the learner marks it said with if, and its everyday reading. */
export const L6_UNLESS_IF: DrillStep = {
  ...sentenceGridDrill(UNLESS.kase, L6_UNLESS_RULE, {
    id: 's6.l6-do-unless-if',
    title: 'Say “unless” with if',
    body: [
      'The unless rule is marked. Now mark two if–then sentences.',
      `Sentence A: “${storyIf(UNLESS, FORM_CONDS.unless[0])}”`,
      `Sentence B: “${storyIf(UNLESS, MISREAD.unless)}”`,
      'Put a ✓ if a case keeps the sentence. Put a ✗ if it breaks it.',
    ],
  }, [
    { id: 'unless', label: 'Unless', name: 'the unless rule', holds: (r) => formHolds('unless', r), given: true },
    condColumn(UNLESS, 'a', 'Sentence A', 'sentence A', FORM_CONDS.unless[0]),
    condColumn(UNLESS, 'b', 'Sentence B', 'sentence B', MISREAD.unless),
  ]),
  afterCard: 4,
  confused: unlessConfused(),
  words: { closing: UNLESS_CLOSING },
};

/** Lesson 7, Do: the four boxes of the rule with “if and only if”, right after the card that marks Dee's box. */
export const L7_IFF_BOXES: DrillStep = {
  ...formBoxDrill(IFF, 'iff', {
    id: 's6.l7-do-iff',
    title: 'Mark the four boxes',
    body: ['These are the four boxes of the rule with “if and only if.”', 'Mark each box. Put a ✓ if a kid in that box keeps the rule. Put a ✗ if the kid breaks it.'],
  }),
  afterCard: 0,
  confused: iffConfused(),
  words: { closing: 'Those two ideas are apart now. “If and only if” works each way, so a part alone breaks it.' },
};

/**
 * Lesson 7, right after the contrast card: the four cases with the plain dessert rule marked. The learner marks the
 * needed sentence and the enough sentence. The needed one breaks in the same box as the rule; the enough one does not.
 */
export const L7_NEED: DrillStep = {
  ...sentenceGridDrill(SKINS.dessert.kase, L7_NEED_RULE, {
    id: 's6.l7-do-need',
    title: 'Needed, or enough?',
    body: [
      'The rule is marked. Now mark the two sentences.',
      `Needed: “${NEED_WORDS.dessert['needed-Q']}”`,
      `Enough: “${NEED_WORDS.dessert['enough-Q']}”`,
      'Put a ✓ if a case keeps the sentence. Put a ✗ if it breaks it.',
    ],
  }, [
    { id: 'rule', label: 'The rule', name: 'the rule', holds: (r) => condHolds(RULE, r), given: true },
    needColumn('needed-Q', 'Needed', 'the needed sentence'),
    needColumn('enough-Q', 'Enough', 'the enough sentence'),
  ]),
  afterCard: 2,
  distinction: NEEDED_VS_ENOUGH.id,
  misconceptions: [
    {
      id: 'needed-as-enough',
      when: 'picks',
      picks: { [`FT-enough-Q`]: condHolds(needCond('enough-Q'), FT) ? 'no' : 'yes' },
      text: `You may be treating “needed” and “enough” as the same thing. They are two different things: the veggies are needed for dessert, but they do not make dessert happen. ${cap(kaseOf(SKINS.dessert, FT))} breaks the enough sentence.`,
    },
  ],
  confused: needConfused(),
  words: { closing: NEED_CLOSING },
};

/** Lesson 7, Do: lesson 5's letter cards again. E and 7 are shown checked; the learner checks 4 and K. */
const L7_CARDS_BOARD: DrillStep = cardDrill(
  'letters',
  {
    id: 's6.l7-do-cards',
    title: 'The cards again',
    body: [
      `The ${face('letters', 'P')} card and the ${face('letters', 'notQ')} card are checked: turn them over.`,
      `Mark the ${face('letters', 'Q')} card and the ${face('letters', 'notP')} card the same way. Is the rule kept or broken with each back?`,
    ],
  },
  ['P', 'notQ'],
  ['Q', 'notP'],
);
/** The THEN card's “Turn it over?” mark: turning it over reads “needed” as “enough” (lesson 7's trap). */
const L7_THEN_TURN = L7_CARDS_BOARD.rows.flatMap((r) => r.marks).find((m) => m.id === 'q-turn')!;
export const L7_CARDS: DrillStep = {
  ...L7_CARDS_BOARD,
  afterCard: 3,
  misconceptions: [
    {
      id: 'needed-as-enough',
      when: 'picks',
      picks: { [L7_THEN_TURN.id]: L7_THEN_TURN.options.find((o) => o.id !== L7_THEN_TURN.answer)!.id },
      text: `You may be treating “needed” and “enough” as the same thing. They are two different things: an even number is needed for a vowel, but it is not enough for one. The ${face('letters', 'Q')} card can have any letter on its back.`,
    },
  ],
};

// ---------- lessons 6 and 7: the quiz makers ----------

/** Lesson 6's trap (“only if” turned around) and lesson 7's (“needed” read as “enough”): every pack holds one. */
const L6_PASS: LessonPass = { firstTry: 3, include: [{ tag: ONLY_IF_TRAP, label: 'a question where “only if” is easy to turn around' }] };
const L7_PASS: LessonPass = { firstTry: 3, include: [{ tag: NEED_TRAP, label: 'a question where “needed” is easy to read as “enough”' }] };

/** A story from `from` in group `g` when it has one, never one in `not`. */
function storyIn<T extends StoryId>(rng: Rng, from: readonly T[], g?: Group, not: readonly StoryId[] = []): T {
  const left = from.filter((s) => !not.includes(s));
  const inGroup = g ? left.filter((s) => storyGroup(s) === g) : [];
  return rng.pick(inGroup.length ? inGroup : left.length ? left : from);
}

/** A lesson 6 question about “only if” or “unless” on the four boxes: which case breaks it, or did this case. */
const formBoxItem = (rng: Rng, form: 'only-if' | 'unless', story: StoryId): FormMade =>
  rng.chance(0.5) ? formWhoItem(rng, { form, story }) : formDidItem(rng, { form, story, row: rng.pick(form === 'only-if' ? [FT, FT, TF, TT, FF] : [TT, TT, FF, FT, TF]) });

/** A lesson 7 question about “if and only if”: pick every case that breaks it, or did this case. */
const iffItem = (rng: Rng, story: StoryId, who: boolean): FormMade =>
  who ? iffWhoItem(rng, { story }) : formDidItem(rng, { form: 'iff', story, row: rng.pick([FT, FT, TF, TT, FF]) });

/**
 * Lesson 6's quiz: an “only if” question on the four boxes, “say it with if” for “only if” (the trap), the same two
 * for “unless”, in other stories, then why “only if” points the way it does. The first two are in different groups of
 * story, so every pack has two kinds.
 */
function l6Practice(rng: Rng): FormMade[] {
  const [g1, g2, g3] = rng.shuffle<Group>(['everyday', 'fantasy', 'abstract']);
  const a = storyIn(rng, ONLY_IF_STORIES, g1);
  const b = storyIn(rng, ONLY_IF_STORIES, g2, [a]);
  const c = storyIn(rng, UNLESS_STORIES, g3);
  const d = storyIn(rng, UNLESS_STORIES, undefined, [c]);
  const e = storyIn(rng, ONLY_IF_STORIES, undefined, [a, b]);
  const firstFour = rng.shuffle([
    () => formBoxItem(rng, 'only-if', a),
    () => formPickItem(rng, { form: 'only-if', story: b }),
    () => formBoxItem(rng, 'unless', c),
    () => formPickItem(rng, { form: 'unless', story: d }),
  ]);
  return [...firstFour.map((make) => make()), whyOnlyIfItem(rng, { story: e as SkinId })];
}

/**
 * Lesson 7's quiz: “if and only if” on the four boxes (did this case, and pick every case), “needed” or “enough” (the
 * pick holds the trap), and why the THEN card need not be turned. Different groups of story in the first two.
 */
function l7Practice(rng: Rng): FormMade[] {
  const [g1, g2, g3, g4] = rng.shuffle<Group>(['everyday', 'fantasy', 'abstract', 'everyday']);
  const a = storyIn(rng, IFF_STORIES, g1);
  const b = storyIn(rng, IFF_STORIES, g2, [a]);
  const c = storyIn(rng, NEED_SKINS, g3);
  const d = storyIn(rng, NEED_SKINS, g4, [c]);
  const e = storyIn(rng, WHY_CARD_SKINS, undefined, [c, d]);
  const firstFour = rng.shuffle([
    () => iffItem(rng, a, false),
    () => iffItem(rng, b, true),
    () => needPickItem(rng, { skin: c }),
    () => needYesNoItem(rng, { skin: d }),
  ]);
  return [...firstFour.map((make) => make()), whyCardItem(rng, { skin: e })];
}

/** Any lesson 6 question (the check's lesson 6 slot, the Arcade), in any story. */
function anyL6(rng: Rng): FormMade {
  const form = rng.pick(['only-if', 'unless'] as const);
  const story = rng.pick(FORM_STORIES[form]);
  return rng.chance(0.4) ? formPickItem(rng, { form, story }) : formBoxItem(rng, form, story);
}

/** Any lesson 7 question but the why item. */
function anyL7(rng: Rng): FormMade {
  const k = rng.pick(['did', 'who', 'pick', 'yesno'] as const);
  if (k === 'did' || k === 'who') return iffItem(rng, rng.pick(IFF_STORIES), k === 'who');
  const skin = rng.pick(NEED_SKINS);
  return k === 'pick' ? needPickItem(rng, { skin }) : needYesNoItem(rng, { skin });
}

/** The closing why item: why “only if” points the way it does (lesson 6), or why the THEN card is skipped (lesson 7). */
const whyItem = (rng: Rng, lesson: typeof L6 | typeof L7): FormMade =>
  lesson === L6 ? whyOnlyIfItem(rng, { story: rng.pick(ONLY_IF_STORIES) }) : whyCardItem(rng, { skin: rng.pick(WHY_CARD_SKINS) });

const L6_LESSON: LessonDef = {
  id: L6,
  title: 'Only if, and unless',
  ideas: [
    {
      // See: Kai's box marked in words on the rule card. The four boxes open right after it.
      title: 'Only if',
      scene: L6_ONLY_RULE,
      body: [
        `Here is a rule with “only if”: “${formText(ONLY, 'only-if')}”`,
        'The part after “only if” is needed. No library card, no book home.',
        `${ONLY.says('Kai', FT, { vowel: 'E', consonant: 'K', even: '4', odd: '7' })}. ${formNote('only-if', FT)}`,
        'A card is needed to take a book. It does not make you take one.',
      ],
    },
    {
      title: 'Say it with if',
      body: [
        'To read “only if,” say the rule with if. The part before “only if” becomes the IF part. The part after it becomes the THEN part.',
        `So the rule means “${storyIf(ONLY, FORM_CONDS['only-if'][0])}”`,
        `The same one case breaks the rule and that sentence: ${kaseOf(ONLY, formBroken('only-if')[0])}.`,
      ],
    },
    {
      // The distinction, taught apart before any quiz: the same case under “only if” and under plain “if”.
      title: '“Only if” is not plain “if”',
      distinction: ONLY_IF_VS_IF.id,
      body: [
        '“Only if” and plain “if” look alike. But they put the need on different parts.',
        'With “only if,” the library card is needed.',
        `Plain “if” is different. In “${bare(plainIfText(ONLY))},” the card would be enough.`,
        'Below is the same case under the two rules.',
      ],
      scene: onlyIfContrast(),
    },
    {
      // See: a dry day with recess inside, marked in words on the rule card. Its four boxes open right after it.
      title: 'Unless',
      scene: L6_UNLESS_RULE,
      body: [
        `Here is a rule with “unless”: “${formText(UNLESS, 'unless')}”`,
        'The part after “unless” names the one thing that can stop the part before it.',
        `${UNLESS.says('Monday', FF, { vowel: 'E', consonant: 'K', even: '4', odd: '7' })}. ${formWhy(UNLESS, 'unless', 'Monday', FF)}`,
      ],
    },
    {
      title: 'Rain makes no promise',
      scene: L6_UNLESS_RULE,
      body: [
        `Say it with if: “${storyIf(UNLESS, FORM_CONDS.unless[0])}” The part after “unless” gets a NOT and becomes the IF part.`,
        `${UNLESS.says('Tuesday', TT, { vowel: 'E', consonant: 'K', even: '4', odd: '7' })}. ${formNote('unless', TT)}`,
        'In everyday talk, people may mean more. But the words make one promise only.',
        `Only ${kaseOf(UNLESS, formBroken('unless')[0])} breaks the rule.`,
      ],
    },
  ],
  // Do: the only-if boxes after the first card; after the contrast, the only-if rule against its if–then sentence and
  // plain “if”; the unless boxes after its card; then the unless rule said with if, and its everyday reading.
  drill: [L6_ONLY_BOXES, L6_ONLY_VS_IF, L6_UNLESS_BOXES, L6_UNLESS_IF],
  distinctions: [ONLY_IF_VS_IF],
  terms: [
    { term: 'only if', means: 'The part after it is needed. So “P only if Q” says the same as “If P, then Q” does.' },
    { term: 'unless', means: 'It names the one thing that can stop the part before it. So “P unless Q” says the same as “If not Q, then P” does.' },
  ],
  practice: (rng) => l6Practice(rng).map((m, i) => finish(m, `s6-l6-${i + 1}`, L6)),
  pass: L6_PASS,
};

const L7_LESSON: LessonDef = {
  id: L7,
  title: 'Both ways: needed and enough',
  ideas: [
    {
      // See: Dee's box marked in words on the rule card. The four boxes open right after it.
      title: 'Each way',
      scene: L7_IFF_RULE,
      body: [
        `Here is a rule: “${formText(IFF, 'iff')}”`,
        '“If and only if” puts two rules together, one each way.',
        `One: “${storyIf(IFF, FORM_CONDS.iff[0])}” Two: “${storyIf(IFF, FORM_CONDS.iff[1])}”`,
        `${SKINS.dessert.says('Dee', FT)}. ${formWhy(IFF, 'iff', 'Dee', FT)}`,
        `So ${formBroken('iff').length === 2 ? 'two boxes break' : 'more boxes break'} this rule, not one.`,
      ],
    },
    {
      title: 'Enough and needed',
      scene: L7_NEED_RULE,
      body: [
        `Now look at a plain if–then rule: “${ruleText('dessert')}”`,
        'The IF part is enough for the THEN part. When a kid gets dessert, you know for sure the veggies are eaten.',
        'The THEN part is needed for the IF part. No kid gets dessert without eating all the veggies.',
        'Grown-ups say “sufficient” for enough. They say “necessary” for needed.',
      ],
    },
    {
      // The distinction, taught apart before any quiz: the same case under “needed” and under “enough”.
      title: 'Needed is not enough',
      distinction: NEEDED_VS_ENOUGH.id,
      body: [
        'Eating all your veggies is needed for dessert. But is it enough?',
        `Think of Dee. ${SKINS.dessert.says('Dee', FT)}. That keeps the rule.`,
        'Below is the same case, with each word.',
      ],
      scene: needContrast(),
    },
    {
      // Lesson 5's cards, in needed and enough words. The cards board opens right after it.
      title: 'Back to the cards',
      scene: L7_CARDS_RULE,
      body: [
        `Remember the cards ${face('letters', 'P')}, ${face('letters', 'notP')}, ${face('letters', 'Q')} and ${face('letters', 'notQ')}? The rule is “${ruleText('letters')}”`,
        `A vowel is enough for an even number. So turn over ${face('letters', 'P')}: its back must be even, or the rule is broken.`,
        `An even number is needed for a vowel. So turn over ${face('letters', 'notQ')}: with a vowel on its back, the rule is broken.`,
        `But an even number is not enough for a vowel. The ${face('letters', 'Q')} can have any letter on its back. Skip it.`,
      ],
    },
    {
      title: 'The trap',
      body: [
        'Every if–then rule can be said with needed and enough.',
        '“If P, then Q” means P is enough for Q. It also means Q is needed for P.',
        'Reading “needed” as “enough” turns the rule around. That is the trap.',
      ],
    },
  ],
  // Do: the four boxes of the rule with “if and only if” after the first card; after the contrast, the needed and enough
  // sentences against the rule; then lesson 5's letter cards again.
  drill: [L7_IFF_BOXES, L7_NEED, L7_CARDS],
  distinctions: [NEEDED_VS_ENOUGH],
  terms: [
    { term: 'if and only if', means: 'Two rules at once, one each way. It says “If P, then Q” and “If Q, then P” at the same time.' },
    { term: 'sufficient', also: 'enough', means: 'When this part happens, the other part happens for sure. In “If P, then Q,” P is sufficient for Q.' },
    { term: 'necessary', also: 'needed', means: 'The other part can’t happen without this part. In “If P, then Q,” Q is necessary for P.' },
  ],
  practice: (rng) => l7Practice(rng).map((m, i) => finish(m, `s6-l7-${i + 1}`, L7)),
  pass: L7_PASS,
};

// ---------- lessons ----------

const lessons: LessonDef[] = [
  {
    id: L1,
    title: 'When is a rule broken?',
    ideas: [
      {
        title: 'Two parts',
        scene: L1_RULE,
        body: [
          `Some rules have two parts. Here is one: “${ruleText('dessert')}”`,
          `The IF part comes right after the word “if.” Here it is “${part('dessert', 'P')}.”`,
          `The THEN part comes right after the word “then.” Here it is “${part('dessert', 'Q')}.”`,
        ],
      },
      {
        // See: the four boxes of one rule, already marked. Three ✓, and one ✗ on the break.
        title: 'Four kinds of kids',
        scene: L1_SEE,
        body: [
          'Every kid at lunch fits in one of four boxes.',
          'Some kids got dessert and some did not. Some ate all the veggies and some left a few.',
          'Three boxes have a ✓. The one ✗ is the break: a kid who got dessert but left some veggies.',
        ],
      },
      {
        title: 'The one way to break it',
        body: [
          'A rule like this is broken only when the IF part happens and the THEN part does not.',
          'Ben got dessert but left some veggies. The IF part happened. The THEN part did not. So Ben broke the rule.',
        ],
      },
      {
        title: 'When the IF part does not happen',
        body: [
          'Cal did not get dessert. The rule only talks about kids who get dessert.',
          'So Cal can’t break it. That is true if Cal ate all the veggies. It is also true if Cal left some.',
        ],
      },
      {
        // The rule card again: the four-box boards open right after this card.
        title: 'THEN without IF is fine',
        scene: L1_RULE,
        body: [
          'Dee ate all the veggies but did not get dessert. Maybe Dee was too full.',
          'Dee did not break the rule. The rule never says that eating your veggies gets you dessert.',
        ],
      },
      // The letters, taught apart before any P and Q question: the same case in words and with P and Q.
      L1_LETTERS,
    ],
    // Do: the same four boxes, empty; then the handoff's red card and hat rule on the same four boxes; then, after
    // “Letters for the parts”, the four boxes with letters.
    drill: [L1_DRILL, L1_TWIN, L1_PQ],
    distinctions: [LETTER_VS_TRUTH],
    // Quiz: only the four boxes, in other stories. "Who broke it?" twice, the box with no IF part and no THEN part
    // (the conflict: nobody broke the rule), and one box at random. No rule is turned around in this lesson.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, L1_SKINS);
      const plan = rng.shuffle(['who', 'who', 'neither', 'did'] as const);
      const one = distinctItems();
      return plan.map((p, i) => {
        const skin = skins[i];
        const m = one(() =>
          p === 'who' ? whoBrokeItem(rng, { skin }) : didBreakItem(rng, { skin, row: p === 'neither' ? rowAt(false, false) : rng.pick(ROWS) }),
        );
        return finish(m, `s6-l1-${i + 1}`, L1);
      });
    },
  },
  {
    id: L2,
    title: 'Turning it around',
    ideas: [
      {
        // See: one case marked on this rule card. A cat with four legs keeps the rule but breaks it turned around.
        title: 'One way only',
        scene: L2_RULE,
        body: [
          `Here is a rule that is always true in this story: “${ruleText('pets')}”`,
          `Now turn it around. Swap the IF part and the THEN part. You get “${condText('pets', CONVERSE)}”`,
          `That one is not true. A cat has four legs, but a cat is not a dog. The cat keeps the rule. ${SKINS.pets.onlyAbout}`,
          'But the cat breaks the turned-around sentence.',
        ],
      },
      {
        title: 'A new sentence',
        body: [
          'When you turn a rule around, you get a new sentence. It does not mean the same thing.',
          'The rule can be true while the turned-around sentence is false.',
        ],
      },
      L2_BROKEN,
      {
        // See: one case marked on the board. Rex as a cat keeps the rule, so it can happen, and "Rex is a dog" is false.
        title: 'Could it happen another way?',
        scene: PETS_KEPT,
        body: [
          `${pet('Q', 'Rex')}. Is Rex a dog? Maybe. But ${SKINS.pets.noIf('Rex')[0]}.`,
          `That case keeps the rule, so it can happen. In it, “${pet('P', 'Rex')}” is false.`,
          'When you know only the THEN part, ask: could it happen another way? If it could, then you can’t tell if the IF part happened.',
        ],
      },
      {
        title: 'Wet grass',
        scene: ruleScene('grass', 'kept'),
        body: [
          'The grass is wet. Did it rain?',
          'It might have. But a sprinkler could have made the grass wet. So could a hose.',
          'So you can’t tell if it rained.',
        ],
      },
      {
        // The reminder of lesson 1's letters: “P is true” is the IF part happening, so forward works with letters too.
        title: 'Going forward works',
        distinction: LETTER_VS_TRUTH.id,
        body: [
          'Going forward is safe. When you know the IF part happened, the THEN part must be true.',
          'Max is a dog, so “Max has four legs” is true for sure. “Max does not have four legs” is false for sure.',
          `With letters it works the same way. “${pqFact('P')}” means the IF part happened, so “${pqFact(follows('P')!)}” is true for sure.`,
          '“Can’t tell” is a real answer. Use it when the facts do not decide.',
        ],
      },
      {
        // The grown-up word for a rule turned around (the glossary's “converse”).
        title: 'A grown-up word',
        body: [
          'Grown-ups have a name for a rule turned around. They call it the converse. Lesson 4 calls it Flip only.',
          `The converse of “${bare(ruleText('pets'))}” is “${condText('pets', CONVERSE)}”`,
          'A rule can be true while its converse is false.',
        ],
      },
    ],
    // Do: the pet rule's four boxes, all marked by hand (the converse trap comes only after them), right after the
    // first card; the same boxes marked can happen or can't happen, right after the contrast card; then the two cases
    // that fit "Rex has four legs" (backward), then the two that fit "Max is a dog" (forward).
    drill: [L2_BOXES, L2_CAN, L2_BACK, L2_FWD],
    distinctions: [BROKEN_VS_CANT, { ...LETTER_VS_TRUTH, taughtIn: L1 }],
    terms: [{ term: 'converse', also: 'Flip only', means: 'A rule turned around: its IF part and its THEN part swap places. A rule can be true while its converse is false.' }],
    // Quiz: the same two methods in other stories. Each sentence the quiz can ask (the IF part or NOT the IF part,
    // the THEN part or NOT the THEN part) is one the boards mark. The first question is marked on its own cases first.
    // Every pack has one P and Q question, and the pass rule asks for it.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS, 'pq');
      const plan = rng.shuffle([{ fact: 'Q' }, { fact: 'Q' }, { fact: 'P', target: 'Q' }, { fact: 'P' }] as const);
      const one = distinctItems();
      const made = plan.map((p, i) => one(() => turnItem(rng, { skin: skins[i], ...p })));
      return made.map((m, i) => withWork(finish(m, `s6-l2-${i + 1}`, L2), i === 0 ? factWork(m, 's6-l2-p1-work') : undefined));
    },
    pass: PQ_PASS,
  },
  {
    id: L3,
    title: 'The four moves',
    ideas: [
      {
        // The reminder of lesson 1's letters: the four facts with P and Q.
        title: 'Four kinds of facts',
        distinction: LETTER_VS_TRUTH.id,
        body: [
          'Say you know a rule and one more fact. What follows for sure?',
          'The fact can be about the IF part or the THEN part. It can say that part happened, or that it did not. That makes four moves.',
          `With letters, the four facts are “${pqFact('P')},” “${pqFact('notP')},” “${pqFact('Q')}” and “${pqFact('notQ')}.” “${pqFact('P')}” means the IF part happened.`,
        ],
      },
      {
        // See: the cases marked on the board. Rex as a dog with four legs can happen; without four legs, it can’t.
        // The reminder of lesson 2's distinction: here the case that would break the rule can't happen.
        title: 'The IF part happened',
        scene: PETS_KEPT,
        distinction: BROKEN_VS_CANT.id,
        body: [
          `${pet('P', 'Rex')}. A dog with four legs keeps the rule, so that case can happen.`,
          'Could Rex be a dog without four legs? That case breaks the rule. Here the rule is always true, so it can’t happen. It crashes: cross it out.',
          `So ${pet('Q', 'Rex')}. When the IF part happens, the THEN part must happen too.`,
          'This is not like Lesson 1, where kids could break the rule. Look for the “Always true here” line.',
        ],
      },
      {
        title: 'The THEN part did not happen',
        body: [
          'Pip does not have four legs. Could Pip be a dog?',
          'If Pip were a dog, Pip would have four legs. But Pip does not. So Pip is not a dog.',
          'When the THEN part did not happen, the IF part did not happen either.',
        ],
      },
      {
        title: 'Two traps',
        body: [
          'Max has four legs. Max could be a dog or a cat. Nothing follows for sure.',
          'Coco is not a dog. Coco could be a cat with four legs or a bird with two. Nothing follows for sure.',
        ],
      },
      {
        title: 'Nothing follows for sure',
        scene: movesScene(),
        body: [
          '“Nothing follows for sure” means the rule and the fact do not prove anything new.',
          'It is a real answer. Pick it when more than one thing could be true.',
        ],
      },
    ],
    // Do: the four moves on the pet board, two per board: a part happened (Rex, Max), a part did not (Pip, Coco).
    drill: [L3_HAPPENED, L3_NOT],
    distinctions: [{ ...BROKEN_VS_CANT, taughtIn: L2 }, { ...LETTER_VS_TRUTH, taughtIn: L1 }],
    // Quiz: one of each move, each in another story. The first is marked on its own cases first; one is P and Q.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS, 'pq');
      const moves = rng.shuffle(MOVES);
      const one = distinctItems();
      const made = moves.map((move, i) => one(() => moveItem(rng, { skin: skins[i], move })));
      return made.map((m, i) => withWork(finish(m, `s6-l3-${i + 1}`, L3), i === 0 ? factWork(m, 's6-l3-p1-work') : undefined));
    },
    pass: PQ_PASS,
  },
  {
    id: L4,
    title: 'Flip and NOT',
    ideas: [
      {
        title: 'Flip and NOT',
        scene: ruleScene('pets', 'compare'),
        body: [
          `Start with a rule: “${ruleText('pets')}”`,
          'To flip a rule, swap the IF part and the THEN part. That is the same as turning it around.',
          `Now flip it and put NOT in both parts. You get “${condText('pets', CONTRA)}” It means the same as the rule.`,
        ],
      },
      {
        title: 'Why they match',
        scene: meaningGrid('pets'),
        body: [
          'Two sentences mean the same when the same cases break them.',
          'A dog without four legs breaks the rule. It breaks the flip and NOT sentence too. No other case breaks either one.',
        ],
      },
      {
        title: 'Flip alone does not work',
        body: [
          `“${condText('pets', CONVERSE)}” only flips the rule.`,
          'A cat with four legs breaks it. But a cat does not break the rule. So they do not mean the same.',
        ],
      },
      {
        title: 'NOT alone does not work',
        body: [
          `“${condText('pets', INVERSE)}” only puts NOT in both parts.`,
          'A cat with four legs breaks this one too. So it does not mean the same as the rule.',
        ],
      },
      {
        // The reminder of lesson 1's letters, and when a NOT part with a letter is true.
        title: 'How to test',
        distinction: LETTER_VS_TRUTH.id,
        body: [
          'Try all four cases. IF and THEN both happen. IF happens but THEN does not. THEN happens but IF does not. Neither one happens.',
          'If a case breaks one sentence but not the other, they do not mean the same.',
          `With letters, “${pqFact('P')}” means the IF part happened. And “not P” is true when ${pqFact('notP')}.`,
        ],
      },
      {
        // The grown-up names for the three sentences (the glossary's “inverse” and “contrapositive”).
        title: 'Grown-up names',
        body: [
          'Grown-ups have names for these sentences.',
          'Flip only is the converse. You met it in Lesson 2, as the rule turned around.',
          'NOT only is the inverse.',
          'Flip and NOT is the contrapositive. It always means the same as the rule.',
        ],
      },
    ],
    // Do: the example's four cases. Mark the flip and NOT sentence, then flip only and NOT only; then the same test with
    // letters, before any P and Q question.
    drill: [L4_SAME, L4_TRAPS, L4_PQ],
    distinctions: [{ ...LETTER_VS_TRUTH, taughtIn: L1 }],
    terms: [
      { term: 'inverse', also: 'NOT only', means: 'A rule with NOT put in its IF part and in its THEN part. It does not mean the same as the rule.' },
      { term: 'contrapositive', also: 'Flip and NOT', means: 'A rule flipped, with NOT put in each part. It always means the same as the rule.' },
    ],
    // Quiz: the same test in other stories, on the three sentences the boards mark. No odd rewrite (NOT in one part
    // only) is offered: no card or board marks one. Every pack has one P and Q question, and the pass rule asks for it.
    pass: PQ_PASS,
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS, 'pq');
      const plan = rng.shuffle(['pick', 'pick', 'trap', 'same'] as const);
      const one = distinctItems();
      return plan.map((p, i) => {
        const skin = skins[i];
        const m = one(() =>
          p === 'pick'
            ? samePickItem(rng, { skin, extra: false })
            : sameYesNoItem(rng, { skin, rewrite: p === 'same' ? 'contra' : rng.pick(['converse', 'inverse'] as const) }),
        );
        return finish(m, `s6-l4-${i + 1}`, L4);
      });
    },
  },
  {
    id: L5,
    title: 'Rule checker',
    ideas: [
      {
        title: 'Checking a rule',
        scene: ruleScene('dessert', 'check'),
        body: [
          SKINS.dessert.cards!.intro,
          'You can see only one side of each card. Your job is to check that nobody broke the rule.',
          'Turn over only the cards you need. Skip a card if it can’t hide a broken rule.',
        ],
      },
      {
        // See: one card marked on the board, back by back, then the turn.
        title: 'The IF card',
        scene: ruleScene('dessert', 'check'),
        body: [
          `The “${face('dessert', 'P')}” card could have “${face('dessert', 'Q')}” or “${face('dessert', 'notQ')}” on the back.`,
          `With “${face('dessert', 'Q')},” the rule is kept. With “${face('dessert', 'notQ')},” that kid broke the rule.`,
          'One back could break the rule. So you must turn this card over.',
        ],
      },
      {
        title: 'The NOT THEN card',
        body: [
          `The “${face('dessert', 'notQ')}” card could have “${face('dessert', 'P')}” on the back. That kid broke the rule too.`,
          'So you must turn it over. This is the card most people miss.',
        ],
      },
      {
        title: 'The trap',
        body: [
          `The “${face('dessert', 'Q')}” card looks important. But its back does not matter. With or without dessert, that kid kept the rule.`,
          `The “${face('dessert', 'notP')}” card can’t break the rule either. ${SKINS.dessert.onlyAbout}`,
        ],
      },
      {
        title: 'Letters and numbers',
        scene: ruleScene('letters', 'check'),
        body: [
          'Here are four cards: E, K, 4 and 7. Which must you turn over?',
          'Turn over E and 7. E could have an odd number on the back. 7 could have a vowel.',
          'Skip K. K is not a vowel, so the rule asks nothing of it.',
          'Many grown-ups pick E and 4. The 4 is the trap.',
        ],
      },
    ],
    // Do: the lunchroom cards (the “Dessert” card shown), then the letter cards (E shown; mark 7 and 4).
    drill: [L5_CARDS, L5_LETTERS],
    // Quiz: concrete stories first, then letters and numbers.
    practice: (rng) => {
      const next = skinDeck(rng);
      const concrete = CARD_SKINS.filter((s) => SKINS[s].group !== 'abstract');
      const one = distinctItems();
      const makers: (() => CondMade)[] = [
        () => checkerItem(rng, { skin: next(skinsIn('everyday', CARD_SKINS)) }),
        () => cardItem(rng, { skin: next(concrete), face: rng.pick(['Q', 'notQ', 'Q', 'notQ', 'P', 'notP'] as const) }),
        () => checkerItem(rng, { skin: next(skinsIn('fantasy', CARD_SKINS)) }),
        () => checkerItem(rng, { skin: 'letters' }),
      ];
      return makers.map((make, i) => finish(one(make), `s6-l5-${i + 1}`, L5));
    },
  },
  L6_LESSON,
  L7_LESSON,
];

// ---------- check and arcade ----------

/**
 * 10 items: one on who breaks a rule, one on turning a rule around, all four moves, one on flip and NOT, one rule
 * checker with four cards, one question from lesson 6 or 7, and last the closing why item from the other of the two
 * (tag `why`, reasons as choices): why “only if” points the way it does, or why the THEN card need not be turned.
 * Skins do not repeat until every skin a slot allows is used.
 */
function check(rng: Rng): Item[] {
  const next = skinDeck(rng);
  const one = distinctItems();
  const who = () => whoBrokeItem(rng, { skin: next(L1_SKINS) });
  const did = () => didBreakItem(rng, { skin: next(L1_SKINS) });
  // Only the three sentences lesson 4 marks: no odd rewrite.
  const pick = () => samePickItem(rng, { skin: next(SKIN_IDS), extra: false });
  const yesNo = () => sameYesNoItem(rng, { skin: next(SKIN_IDS) });
  const plan: [string, () => Pick<CondMade, 'tag' | 'item'>][] = [[L1, rng.chance(0.5) ? who : did]];
  plan.push([L2, () => turnItem(rng, { skin: next(SKIN_IDS), fact: rng.chance(0.65) ? 'Q' : 'P' })]);
  for (const move of rng.shuffle(MOVES)) plan.push([L3, () => moveItem(rng, { skin: next(SKIN_IDS), move })]);
  plan.push([L4, rng.chance(0.5) ? pick : yesNo]);
  plan.push([L5, () => checkerItem(rng, { skin: next(CARD_SKINS) })]);
  // Lessons 6 and 7 share the last two places: a question from one, then the closing why item from the other.
  const [inner, last] = rng.chance(0.5) ? ([L6, L7] as const) : ([L7, L6] as const);
  plan.push([inner, () => (inner === L6 ? anyL6(rng) : anyL7(rng))]);
  plan.push([last, () => whyItem(rng, last)]);
  return plan.map(([lesson, make], i) => finish(one(make), `s6-c${i + 1}`, lesson));
}

const ARCADE: Record<string, (rng: Rng) => Pick<CondMade, 'tag' | 'item'>> = {
  [L1]: (rng) => (rng.chance(0.5) ? whoBrokeItem(rng, { skin: rng.pick(L1_SKINS) }) : didBreakItem(rng, { skin: rng.pick(L1_SKINS) })),
  [L2]: (rng) => turnItem(rng, { skin: rng.pick(SKIN_IDS), fact: rng.chance(0.5) ? 'Q' : 'P' }),
  [L3]: (rng) => moveItem(rng, { skin: rng.pick(SKIN_IDS), move: rng.pick(MOVES) }),
  [L4]: (rng) => (rng.chance(0.5) ? samePickItem(rng, { skin: rng.pick(SKIN_IDS), extra: false }) : sameYesNoItem(rng, { skin: rng.pick(SKIN_IDS) })),
  [L5]: (rng) => (rng.chance(0.6) ? checkerItem(rng, { skin: rng.pick(CARD_SKINS) }) : cardItem(rng, { skin: rng.pick(CARD_SKINS) })),
  [L6]: (rng) => (rng.chance(0.2) ? whyItem(rng, L6) : anyL6(rng)),
  [L7]: (rng) => (rng.chance(0.2) ? whyItem(rng, L7) : anyL7(rng)),
};

/**
 * The warm-up on the stop page, from Stop 5 (Knights & Knaves): suppose one islander's kind, then test it. What must
 * the other islander be, or does the guess crash? Lesson 3 uses the same move: suppose the IF part happened, and the
 * case crashes.
 */
function bridge(rng: Rng): Item {
  return supposeItem(rng, { id: 's6-bridge', skin: rng.pick(KNIGHT_SKINS), target: rng.pick(['crash', 'crash', 'knight', 'knave'] as const), pool: 'plain' }).item;
}

function arcade(rng: Rng): Item {
  const lesson = rng.pick(lessons).id;
  return finish(ARCADE[lesson](rng), 's6-arcade', lesson);
}

// ---------- new examples after a miss ----------

/** The skin of an item, from the rule on its card. */
function skinOf(item: Item): SkinId | undefined {
  const scene = item.scene;
  return scene?.kind === 'text' ? SKIN_IDS.find((s) => scene.lines[1] === ruleText(s)) : undefined;
}

/** A skin from `from` other than the missed item's, so the new example has other people and objects. */
function otherSkin(rng: Rng, from: readonly SkinId[], missed: Item): SkinId {
  const not = skinOf(missed);
  const rest = from.filter((s) => s !== not);
  return rng.pick(rest.length ? rest : from);
}

/** The case a yes/no lesson 1 item asked about, read from its wrong choice's example card (engine-computed truths). */
function askedRow(missed: Item): Row | null {
  return missed.kind === 'choose' ? rowOfCase(Object.values(missed.feedback ?? {})[0]?.example) : null;
}

/** The face of a one-card item: the fact that holds on both of its possible backs (its teach cases). */
function shownFace(missed: Item): Lit | null {
  const rows = (missed.teach?.cases ?? []).map(rowOfCase).filter((r): r is Row => !!r);
  return rows.length === 2 ? LITS.find((l) => rows.every((r) => litHolds(l, r))) ?? null : null;
}

/** The sentence a lesson 2 item asked about: the one fact that is true in exactly the cases its teaching marks true. */
function askedTarget(missed: Item): Lit | null {
  const cases = missed.teach?.cases ?? [];
  const marks = cases.map((c) => ({ row: rowOfCase(c), said: c.truths?.find((t) => t.who === SENTENCE_WHO)?.value }));
  if (!marks.length || marks.some((m) => !m.row || m.said === undefined)) return null;
  const hits = LITS.filter((l) => marks.every((m) => litHolds(l, m.row!) === m.said));
  return hits.length === 1 ? hits[0] : null;
}

/** The rewrite a lesson 4 yes/no item asked about, read from the sentence in its prompt. */
function askedRewrite(missed: Item): Rewrite | null {
  const skin = skinOf(missed);
  if (!skin) return null;
  return (Object.keys(REWRITES) as Rewrite[]).find((k) => missed.prompt.endsWith(`“${condText(skin, REWRITES[k])}”`)) ?? null;
}

const MOVE_OF_TAG = Object.fromEntries(MOVES.map((m) => [MOVE_TAGS[m], m])) as Record<string, Move>;
/** A settled move and the trap that looks like it: IF happened / THEN happened; THEN did not / IF did not. */
const MOVE_PAIR: Record<Move, Move> = { mp: 'ac', ac: 'mp', mt: 'da', da: 'mt' };
/** A card to turn and a card to skip, on the same part of the rule. */
const FACE_PAIR: Record<Lit, Lit> = { P: 'notP', notP: 'P', notQ: 'Q', Q: 'notQ' };

/**
 * New examples after a miss: the same situation in another story, then its boundary partner, so the player shows
 * the edge both ways. A missed kept case gets the one case that breaks the rule; a missed break gets the trap (no
 * IF part, no THEN part). Forward pairs with backward, each move with the move it is mistaken for, flip and NOT
 * with flip only or NOT only, and a card to turn with a card to skip. The same sentence is asked again (the THEN
 * part or NOT the THEN part, flip only or NOT only). "Who broke the rule?", "Which sentence means the same?" and the
 * four-card rule checker get one new item in another story: in the same story, the same four labels would come back
 * in a new order (P and Q cases, card faces), and that is not a new example.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const tag = missed.skill.replace(/^s6\./, '');
  const make = (m: Pick<CondMade, 'tag' | 'item'>) => finish(m, 'new', missed.lesson);
  const more = freshL67(missed, rng);
  if (more) return more.map(make);
  if (tag === 'who-broke') return [make(whoBrokeItem(rng, { skin: otherSkin(rng, L1_SKINS, missed) }))];
  if (tag === 'same-pick') return [make(samePickItem(rng, { skin: otherSkin(rng, SKIN_IDS, missed), extra: false }))];
  if (tag === 'checker') return [make(checkerItem(rng, { skin: otherSkin(rng, CARD_SKINS, missed) }))];
  if (tag === 'did-break') {
    const row = askedRow(missed);
    if (!row) return [];
    const partner = ruleHolds(row) ? rowAt(true, false) : rowAt(false, false);
    return [make(didBreakItem(rng, { skin: otherSkin(rng, L1_SKINS, missed), row })), make(didBreakItem(rng, { skin: otherSkin(rng, L1_SKINS, missed), row: partner }))];
  }
  if (tag === 'forward' || tag === 'backward') {
    const fact = tag === 'forward' ? 'P' : 'Q';
    const target = askedTarget(missed) ?? undefined;
    return [make(turnItem(rng, { skin: otherSkin(rng, SKIN_IDS, missed), fact, target })), make(turnItem(rng, { skin: otherSkin(rng, SKIN_IDS, missed), fact: fact === 'P' ? 'Q' : 'P' }))];
  }
  if (MOVE_OF_TAG[tag]) {
    const move = MOVE_OF_TAG[tag];
    return [make(moveItem(rng, { skin: otherSkin(rng, SKIN_IDS, missed), move })), make(moveItem(rng, { skin: otherSkin(rng, SKIN_IDS, missed), move: MOVE_PAIR[move] }))];
  }
  if (tag === 'same-yesno') {
    const asked = askedRewrite(missed);
    if (!asked) return [];
    const partner: Rewrite = asked === 'contra' ? rng.pick(['converse', 'inverse'] as const) : 'contra';
    return [make(sameYesNoItem(rng, { skin: otherSkin(rng, SKIN_IDS, missed), rewrite: asked })), make(sameYesNoItem(rng, { skin: otherSkin(rng, SKIN_IDS, missed), rewrite: partner }))];
  }
  if (tag === 'checker-card') {
    const face = shownFace(missed);
    if (!face) return [];
    return [make(cardItem(rng, { skin: otherSkin(rng, CARD_SKINS, missed), face })), make(cardItem(rng, { skin: otherSkin(rng, CARD_SKINS, missed), face: FACE_PAIR[face] }))];
  }
  return [];
}

/** The story a lesson 6 or 7 question is told in, read from its rule card. */
function storyOfItem(missed: Item): StoryId | undefined {
  const line = missed.scene?.kind === 'text' ? missed.scene.lines[1] : undefined;
  if (!line) return undefined;
  for (const f of FORMS) for (const id of FORM_STORIES[f]) if (formText(storyOf(id, f), f) === line) return id;
  return NEED_SKINS.find((s) => ruleText(s) === line);
}

/** A story from `from` other than `not`. */
function otherStory<T extends StoryId>(rng: Rng, from: readonly T[], not?: StoryId): T {
  const rest = from.filter((s) => s !== not);
  return rng.pick(rest.length ? rest : from);
}

const ROW_IDS = ROWS.map(rowId);

/**
 * New examples after a miss in lesson 6 or 7 (null for the other lessons): the same kind of question in another story.
 * A missed “did this case break it?” gets the same case, then its boundary partner (a kept case gets the case that
 * breaks the rule; a break gets the case the misreading gets wrong). A missed needed or enough sentence gets the same
 * sentence, then one with the other answer. A missed why item gets another why item.
 */
function freshL67(missed: Item, rng: Rng): FormMade[] | null {
  if (missed.lesson !== L6 && missed.lesson !== L7) return null;
  const story = storyOfItem(missed);
  const tag = missed.skill.replace(/^s6\./, '');
  if (missed.tags?.includes(WHY_TAG)) {
    return [missed.lesson === L6 ? whyOnlyIfItem(rng, { story: otherStory(rng, ONLY_IF_STORIES, story) }) : whyCardItem(rng, { skin: otherStory(rng, WHY_CARD_SKINS, story) })];
  }
  if (tag === 'need-enough') {
    if (missed.kind !== 'choose') return [];
    const skin = otherStory(rng, NEED_SKINS, story);
    if (missed.choices.length > 2) return [needPickItem(rng, { skin })];
    const which = story ? NEED_IDS.find((id) => missed.prompt.endsWith(`“${NEED_WORDS[story as NeedSkin][id]}”`)) : undefined;
    if (!which) return [];
    const partner: NeedId = sameMeaning(needCond(which), RULE) ? 'enough-Q' : 'needed-Q';
    return [needYesNoItem(rng, { skin, which }), needYesNoItem(rng, { skin: otherStory(rng, NEED_SKINS, story), which: partner })];
  }
  const form = FORMS.find((f) => f === tag);
  if (!form) return [];
  const next = otherStory(rng, FORM_STORIES[form], story);
  if (missed.kind === 'multi') return [iffWhoItem(rng, { story: next })];
  if (missed.kind !== 'choose' || form === 'iff' && missed.choices.length !== 2) return [];
  if (form !== 'iff' && missed.choices.every((c) => ROW_IDS.includes(c.id))) return [formWhoItem(rng, { form, story: next })];
  if (missed.choices.length === 2) {
    const ex = Object.values(missed.feedback ?? {})[0]?.example;
    const row = ex?.truths && ex.truths.length >= 2 ? rowAt(ex.truths[0].value, ex.truths[1].value) : null;
    if (!row) return [];
    const partner = formHolds(form, row) ? formBroken(form)[0] : ROWS.find((r) => formHolds(form, r) && misreadMatters(form, r)) ?? rowAt(false, false);
    return [formDidItem(rng, { form, story: next, row }), formDidItem(rng, { form, story: otherStory(rng, FORM_STORIES[form], story), row: partner })];
  }
  return form === 'iff' ? [] : [formPickItem(rng, { form, story: next })];
}

export const stop6: StopDef = {
  n: STOP,
  id: 's6',
  title: 'If… then',
  idea: 'An if–then rule only breaks one way.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  skillNames: {
    's6.only-if': 'Rules with only if',
    's6.unless': 'Rules with unless',
    's6.iff': 'Rules with if and only if',
    's6.need-enough': 'Needed and enough',
  },
};
