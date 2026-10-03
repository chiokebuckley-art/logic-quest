/**
 * Stop 6 · If… then.
 * An if–then rule only breaks one way: the IF part happens and the THEN part does not.
 *
 *  l1 When is a rule broken?   who broke the rule / did this case break it
 *  l2 Turning it around        going forward works; going backward can’t tell ("Rex could be a cat.")
 *  l3 The four moves           IF happened, THEN didn’t happen (these follow); THEN happened, IF didn’t (traps)
 *  l4 Flip and NOT             flip and NOT means the same; flip only and NOT only do not (truth table)
 *  l5 Rule checker             which cards must you turn over? The IF card and the NOT-THEN card
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
 */
import {
  CARD_SKINS,
  CONTRA,
  CONVERSE,
  HAT_BOXES,
  INVERSE,
  L1_SKINS,
  LITS,
  MOVES,
  MOVE_FACT,
  MOVE_TAGS,
  PET_BOXES,
  REWRITES,
  ROWS,
  SENTENCE_WHO,
  SKINS,
  SKIN_IDS,
  boxWords,
  cardDrill,
  cardItem,
  checkerItem,
  condText,
  didBreakItem,
  factCasesDrill,
  fourBoxDrill,
  litHolds,
  meaningDrill,
  meaningGrid,
  moveItem,
  moveRule,
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
  type Lit,
  type Move,
  type Rewrite,
  type Row,
  type SkinId,
} from '../engine/puzzles/conditionals';
import type { DrillStep, Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

const STOP = 6;
const L1 = 's6.l1';
const L2 = 's6.l2';
const L3 = 's6.l3';
const L4 = 's6.l4';
const L5 = 's6.l5';

const finish = (m: CondMade, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item }) as Item;

/**
 * Makes the items of one set. No two items in a set share a prompt and scene: a repeat is thrown away
 * and made again from the same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => CondMade) => CondMade {
  const seen = new Set<string>();
  const key = (m: CondMade) => JSON.stringify([m.item.prompt, m.item.scene ?? null]);
  return (make) => {
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

/** Skins for a practice set: one everyday, one fantasy, one abstract (when `from` has them), then others, shuffled. */
function practiceSkins(rng: Rng, count: number, from: readonly SkinId[]): SkinId[] {
  const next = skinDeck(rng);
  const out: SkinId[] = [];
  for (const g of ['everyday', 'fantasy', 'abstract'] as const) {
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

/** Lesson 1, See: the lunchroom rule card, and its four boxes with three ✓ and one ✗ (the break, named in the caption). */
export const L1_RULE = ruleScene('dessert');
export const L1_SEE = ruleGrid('dessert');

/** Lesson 1, Do: the same four boxes, empty. The learner marks every box; the only ✗ goes on the break. */
export const L1_DRILL: DrillStep = fourBoxDrill(boxWords('dessert'), {
  id: 's6.l1-do',
  title: 'Mark the four boxes',
  body: [
    'These are the four boxes from the example, now empty. The rule is the same.',
    'Mark each box. Put a ✓ if a kid in that box keeps the rule. Put a ✗ if the kid breaks it.',
  ],
});

/** Lesson 1, Do again: the handoff's sample. The same four boxes, with a new rule: a red card and a hat. */
export const L1_TWIN: DrillStep = fourBoxDrill(HAT_BOXES, {
  id: 's6.l1-do-hat',
  title: 'A new rule, the same four boxes',
  body: [`Here is a new rule: “${HAT_BOXES.lines[1]}”`, 'Mark the four boxes again. A ✓ keeps the rule. A ✗ breaks it.'],
  twin: 'The same four boxes, with a new rule: a red card and a hat.',
});

/** Lessons 2 and 3, See: the pet rule card, always true in this story. */
export const PETS_KEPT = ruleScene('pets', true);

/** Lesson 2, See: the pet rule card of “One way only”, where a cat with four legs keeps the rule. */
export const L2_RULE = ruleScene('pets');

/**
 * Lesson 2, Do first: the pet rule's four boxes, empty, all the learner's. The handoff puts any rule turned around
 * (the converse trap) only after the four boxes are marked by hand. Lessons can be opened in any order, so this
 * lesson marks them itself before its quiz. The board is the “One way only” card's rule card (the same scene).
 */
export const L2_BOXES: DrillStep = fourBoxDrill(PET_BOXES, {
  id: 's6.l2-do-boxes',
  title: 'Mark the four boxes',
  body: [
    'Before you turn this rule around, mark its four boxes.',
    'Put a ✓ if an animal in that box keeps the rule. Put a ✗ if it breaks the rule.',
  ],
});

/** Lesson 2, Do: going backward. Rex has four legs. Rex as a cat is shown (the card's case); the learner marks Rex as a dog. */
export const L2_BACK: DrillStep = factCasesDrill(
  'pets',
  {
    id: 's6.l2-do-back',
    title: 'Mark a case: going backward',
    body: [`${pet('Q', 'Rex')}. That is the THEN part. Two cases fit it.`, 'The case from the example is marked. Mark the other case. Can it happen? Is each sentence true in it?'],
  },
  [{ name: 'Rex', fact: 'Q', say: ['P', 'notP'], shown: [rowAt(false, true)], mark: [rowAt(true, true)] }],
  'status',
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
    body: [`${pet('P', 'Rex')}. ${pet('Q', 'Max')}. One case for each pet is marked, as in the examples.`, 'Mark the other case for each pet. Can it happen? Is the sentence true in it?'],
  },
  [
    { name: 'Rex', fact: 'P', say: ['Q'], shown: [rowAt(true, true)], mark: [rowAt(true, false)] },
    { name: 'Max', fact: 'Q', say: ['P'], shown: [rowAt(true, true)], mark: [rowAt(false, true)] },
  ],
  'follows',
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
        title: 'THEN without IF is fine',
        body: [
          'Dee ate all the veggies but did not get dessert. Maybe Dee was too full.',
          'Dee did not break the rule. The rule never says that eating your veggies gets you dessert.',
        ],
      },
    ],
    // Do: the same four boxes, empty; then the handoff's red card and hat rule on the same four boxes.
    drill: [L1_DRILL, L1_TWIN],
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
          `Here is a true rule: “${ruleText('pets')}”`,
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
        scene: ruleScene('grass'),
        body: [
          'The grass is wet. Did it rain?',
          'It might have. But a sprinkler could have made the grass wet. So could a hose.',
          'So you can’t tell if it rained.',
        ],
      },
      {
        title: 'Going forward works',
        body: [
          'Going forward is safe. When you know the IF part happened, the THEN part must be true.',
          'Max is a dog, so “Max has four legs” is true for sure. “Max does not have four legs” is false for sure.',
          '“Can’t tell” is a real answer. Use it when the facts do not decide.',
        ],
      },
    ],
    // Do: the pet rule's four boxes, all marked by hand (the converse trap comes only after them), then the two cases
    // that fit "Rex has four legs" (backward), then the two that fit "Max is a dog" (forward).
    drill: [L2_BOXES, L2_BACK, L2_FWD],
    // Quiz: the same two methods in other stories. Each sentence the quiz can ask (the IF part or NOT the IF part,
    // the THEN part or NOT the THEN part) is one the boards mark.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS);
      const plan = rng.shuffle([{ fact: 'Q' }, { fact: 'Q' }, { fact: 'P', target: 'Q' }, { fact: 'P' }] as const);
      const one = distinctItems();
      return plan.map((p, i) => finish(one(() => turnItem(rng, { skin: skins[i], ...p })), `s6-l2-${i + 1}`, L2));
    },
  },
  {
    id: L3,
    title: 'The four moves',
    ideas: [
      {
        title: 'Four kinds of facts',
        body: [
          'Say you know a rule and one more fact. What follows for sure?',
          'The fact can be about the IF part or the THEN part. It can say that part happened, or that it did not. That makes four moves.',
        ],
      },
      {
        // See: the cases marked on the board. Rex as a dog with four legs can happen; without four legs, it can’t.
        title: 'The IF part happened',
        scene: PETS_KEPT,
        body: [
          `${pet('P', 'Rex')}. A dog with four legs keeps the rule, so that case can happen.`,
          'Could Rex be a dog without four legs? That case breaks the rule. Here the rule is always true, so it can’t happen.',
          `So ${pet('Q', 'Rex')}. When the IF part happens, the THEN part must happen too.`,
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
    // Quiz: one of each move, each in another story.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS);
      const moves = rng.shuffle(MOVES);
      const one = distinctItems();
      return moves.map((move, i) => finish(one(() => moveItem(rng, { skin: skins[i], move })), `s6-l3-${i + 1}`, L3));
    },
  },
  {
    id: L4,
    title: 'Flip and NOT',
    ideas: [
      {
        title: 'Flip and NOT',
        scene: ruleScene('pets'),
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
        title: 'How to test',
        body: [
          'Try all four cases. IF and THEN both happen. IF happens but THEN does not. THEN happens but IF does not. Neither one happens.',
          'If a case breaks one sentence but not the other, they do not mean the same.',
        ],
      },
    ],
    // Do: the example's four cases. Mark the flip and NOT sentence, then flip only and NOT only.
    drill: [L4_SAME, L4_TRAPS],
    // Quiz: the same test in other stories, on the three sentences the boards mark. No odd rewrite (NOT in one part
    // only) is offered: no card or board marks one.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4, SKIN_IDS);
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
        scene: ruleScene('dessert'),
        body: [
          SKINS.dessert.cards!.intro,
          'You can see only one side of each card. Your job is to check that nobody broke the rule.',
          'Turn over only the cards you need. Skip a card if it can’t hide a broken rule.',
        ],
      },
      {
        // See: one card marked on the board, back by back, then the turn.
        title: 'The IF card',
        scene: ruleScene('dessert'),
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
        scene: ruleScene('letters'),
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
];

// ---------- check and arcade ----------

/**
 * 9-10 items: one on who breaks a rule, one on turning a rule around, all four moves, one on flip and NOT,
 * one rule checker with four cards, plus one or two more from lessons 1, 4 and 5 (the other lesson 1 or
 * lesson 4 question, or a one-card rule check). Skins do not repeat until every skin a slot allows is used.
 */
function check(rng: Rng): Item[] {
  const next = skinDeck(rng);
  const one = distinctItems();
  const whoFirst = rng.chance(0.5);
  const pickFirst = rng.chance(0.5);
  const who = () => whoBrokeItem(rng, { skin: next(L1_SKINS) });
  const did = () => didBreakItem(rng, { skin: next(L1_SKINS) });
  // Only the three sentences lesson 4 marks: no odd rewrite.
  const pick = () => samePickItem(rng, { skin: next(SKIN_IDS), extra: false });
  const yesNo = () => sameYesNoItem(rng, { skin: next(SKIN_IDS) });
  const extras = rng.shuffle(['l1', 'l4', 'card'] as const).slice(0, rng.chance(0.5) ? 2 : 1);
  const plan: [string, () => CondMade][] = [[L1, whoFirst ? who : did]];
  if (extras.includes('l1')) plan.push([L1, whoFirst ? did : who]);
  plan.push([L2, () => turnItem(rng, { skin: next(SKIN_IDS), fact: rng.chance(0.65) ? 'Q' : 'P' })]);
  for (const move of rng.shuffle(MOVES)) plan.push([L3, () => moveItem(rng, { skin: next(SKIN_IDS), move })]);
  plan.push([L4, pickFirst ? pick : yesNo]);
  if (extras.includes('l4')) plan.push([L4, pickFirst ? yesNo : pick]);
  plan.push([L5, () => checkerItem(rng, { skin: next(CARD_SKINS) })]);
  if (extras.includes('card')) plan.push([L5, () => cardItem(rng, { skin: next(CARD_SKINS) })]);
  return plan.map(([lesson, make], i) => finish(one(make), `s6-c${i + 1}`, lesson));
}

const ARCADE: Record<string, (rng: Rng) => CondMade> = {
  [L1]: (rng) => (rng.chance(0.5) ? whoBrokeItem(rng, { skin: rng.pick(L1_SKINS) }) : didBreakItem(rng, { skin: rng.pick(L1_SKINS) })),
  [L2]: (rng) => turnItem(rng, { skin: rng.pick(SKIN_IDS), fact: rng.chance(0.5) ? 'Q' : 'P' }),
  [L3]: (rng) => moveItem(rng, { skin: rng.pick(SKIN_IDS), move: rng.pick(MOVES) }),
  [L4]: (rng) => (rng.chance(0.5) ? samePickItem(rng, { skin: rng.pick(SKIN_IDS), extra: false }) : sameYesNoItem(rng, { skin: rng.pick(SKIN_IDS) })),
  [L5]: (rng) => (rng.chance(0.6) ? checkerItem(rng, { skin: rng.pick(CARD_SKINS) }) : cardItem(rng, { skin: rng.pick(CARD_SKINS) })),
};

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
  const make = (m: CondMade) => finish(m, 'new', missed.lesson);
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
};
