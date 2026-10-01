/**
 * Stop 5 · Knights & Knaves.
 *
 * Five lessons: what a knight's or a knave's words tell you, what nobody can say, suppose-and-crash-test
 * with two islanders, three islanders, and what a knave's "and" / "or" means. Every item comes from
 * ../engine/puzzles/knights.ts, which lists every case (each islander a knight or a knave) and keeps the
 * ones where knights' words are true and knaves' words are false. Skins: everyday (Riddle Island),
 * fantasy (elves, wizards) and abstract (islanders A, B and C).
 *
 * The worked examples on the cards are exported so the engine tests can check them case by case.
 */
import {
  FANTASY,
  RULE,
  SAY_TARGETS,
  SKIN_IDS,
  andOrItem,
  andOrPlanOf,
  puzzleItem,
  sayPlanOf,
  supposeItem,
  whoCanSayItem,
  wordsItem,
  wordsPlanOf,
  type Claims,
  type Kind,
  type SayType,
  type SkinId,
  type SupposeAnswer,
  type WordsOpts,
} from '../engine/puzzles/knights';
import type { Claim, Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

const L1 = 's5.l1';
const L2 = 's5.l2';
const L3 = 's5.l3';
const L4 = 's5.l4';
const L5 = 's5.l5';

/** Skill tags and the plain names the Grown-ups screen shows. */
export const SKILL_NAMES: Record<string, string> = {
  's5.words': 'What a knight’s or a knave’s words tell you',
  's5.cant-say': 'Who could say it',
  's5.suppose': 'Make a guess and crash-test it',
  's5.two': 'Two islanders',
  's5.three': 'Three islanders',
  's5.and-or': 'A knave’s “and” and “or”',
};

/** Skins for a practice set: everyday, fantasy, abstract, then any, in a shuffled order. */
function practiceSkins(rng: Rng, count: number): SkinId[] {
  const base: SkinId[] = ['island', rng.pick(FANTASY), 'letters'];
  while (base.length < count) base.push(rng.pick(SKIN_IDS));
  return rng.shuffle(base.slice(0, count));
}

/**
 * Make items in order, drawing again whenever one looks the same as an earlier one (same prompt, same words
 * in the bubbles and same choices), so no set shows the same question twice. Speaker names are left out of
 * the key: "Someone" and "An elf" saying “I am a knave.” is the same question. The same seed still gives the
 * same set.
 */
function distinct(makers: readonly (() => Item)[]): Item[] {
  const seen = new Set<string>();
  const key = (it: Item) =>
    JSON.stringify([
      it.prompt,
      it.scene?.kind === 'speakers' ? it.scene.speakers.map((sp) => sp.says) : it.scene ?? null,
      it.kind === 'choose' ? it.choices.map((c) => c.label) : null,
    ]);
  return makers.map((make) => {
    let item = make();
    for (let tries = 0; tries < 100 && seen.has(key(item)); tries++) item = make();
    seen.add(key(item));
    return item;
  });
}

const speakers = (list: [string, string][]): Scene => ({
  kind: 'speakers',
  speakers: list.map(([name, says]) => ({ id: name.toLowerCase(), name, says })),
  rule: RULE,
});

// ---------- worked examples (checked in knights.test.ts) ----------

/** Lesson 2: Ben is a knave. Nobody could say "Ben and I are the same kind." */
export const L2_EXAMPLE: { partner: string; partnerKind: Kind; claim: Claim } = { partner: 'ben', partnerKind: 'knave', claim: { t: 'same', a: 'me', b: 'ben' } };

/** Lesson 3: two islanders. Only answer: Ava is a knight, Ben is a knave. */
export const L3_EXAMPLE: { ids: string[]; claims: Claims; answer: Record<string, Kind> } = {
  ids: ['ava', 'ben'],
  claims: { ava: { t: 'is', who: 'ben', kind: 'knave' }, ben: { t: 'same', a: 'ava', b: 'ben' } },
  answer: { ava: 'knight', ben: 'knave' },
};

/** Lesson 4: three islanders. Only answer: Ava is a knave, Ben is a knight, Cal is a knave. */
export const L4_EXAMPLE: { ids: string[]; claims: Claims; answer: Record<string, Kind> } = {
  ids: ['ava', 'ben', 'cal'],
  claims: {
    ava: { t: 'is', who: 'ben', kind: 'knave' },
    ben: { t: 'is', who: 'cal', kind: 'knave' },
    cal: { t: 'same', a: 'ava', b: 'ben' },
  },
  answer: { ava: 'knave', ben: 'knight', cal: 'knave' },
};

/** Lesson 5: Raj says "I am a knave and Vic is a knight." Only answer: Raj and Vic are both knaves. */
export const L5_EXAMPLE: { ids: string[]; claims: Claims; answer: Record<string, Kind> } = {
  ids: ['raj', 'vic'],
  claims: { raj: { t: 'and', cs: [{ t: 'is', who: 'raj', kind: 'knave' }, { t: 'is', who: 'vic', kind: 'knight' }] } },
  answer: { raj: 'knave', vic: 'knave' },
};

// ---------- lessons ----------

const lessons: LessonDef[] = [
  {
    id: L1,
    title: 'Truth-tellers and liars',
    ideas: [
      {
        title: 'Riddle Island',
        body: [
          'On Riddle Island, every person is a knight or a knave.',
          'A knight always tells the truth. Every sentence a knight says is true.',
          'A knave always lies. Every sentence a knave says is false.',
          'Knight or knave is an islander’s kind.',
          'That is the rule. A knight with true words fits the rule. So does a knave with false words.',
          'Some puzzles have elves, wizards or islanders named A, B and C. The rules stay the same.',
        ],
      },
      {
        title: 'A knight’s words',
        scene: speakers([['Ava', 'I have a cat.']]),
        body: [
          'Ava is a knight. Ava says, “I have a cat.”',
          'A knight’s words are true. So Ava has a cat.',
        ],
      },
      {
        title: 'A knave’s words',
        scene: speakers([['Ben', 'I have a dog.']]),
        body: [
          'Ben is a knave. Ben says, “I have a dog.”',
          'A knave’s words are false. So Ben does not have a dog.',
          'Watch out for “not.” Say Ben tells you, “I do not have a cat.” That is false too, so Ben has a cat.',
        ],
      },
      {
        title: 'When you can’t tell',
        body: [
          'Cal says, “I can swim.” But no one knows if Cal is a knight or a knave.',
          'If Cal is a knight, Cal can swim. If Cal is a knave, Cal cannot swim. Each of these is a case: one full way things could be.',
          'The two cases both work, but they give different answers. So you can’t tell. That is a real answer. It is not giving up.',
        ],
      },
      {
        title: 'Words about others',
        body: [
          'Islanders can talk about each other too.',
          'Dee is a knave. Dee says, “Eli is a knave.” Those words are false, so Eli is a knight.',
          'It works the other way too. True words come from a knight. False words come from a knave.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const plans: Omit<WordsOpts, 'id' | 'skin'>[] = [
        { type: 'fact', speaker: rng.pick(['knight', 'knave'] as const), negative: false },
        { type: 'fact', speaker: 'knave', negative: true },
        rng.pick([
          { type: 'fact', speaker: 'unknown', negative: rng.chance(0.5) },
          { type: 'other', speaker: 'unknown' },
          { type: 'kindFromFact', truth: 'unknown', negative: rng.chance(0.5) },
        ] as Omit<WordsOpts, 'id' | 'skin'>[]),
        rng.pick([
          { type: 'other', speaker: rng.pick(['knight', 'knave'] as const) },
          { type: 'speakerFromOther' },
          { type: 'kindFromFact', truth: rng.chance(0.5), negative: rng.chance(0.5) },
        ] as Omit<WordsOpts, 'id' | 'skin'>[]),
      ];
      return distinct(plans.map((p, i) => () => wordsItem(rng, { id: `l1-${i + 1}`, skin: skins[i], ...p }).item));
    },
  },
  {
    id: L2,
    title: 'What nobody can say',
    ideas: [
      {
        title: 'Test each kind',
        body: [
          'Could a knight say a sentence? Pretend a knight says it. The words must be true.',
          'Could a knave say it? Pretend a knave says it. The words must be false.',
        ],
      },
      {
        title: 'Try “I am a knight.”',
        scene: speakers([['Someone', 'I am a knight.']]),
        body: [
          'A knight who says, “I am a knight,” tells the truth. That works.',
          'A knave who says it is lying, since a knave is not a knight. That works too.',
          'So either kind could say it. These words don’t tell you who is who.',
        ],
      },
      {
        title: 'Try “I am a knave.”',
        scene: speakers([['Someone', 'I am a knave.']]),
        body: [
          'A knight can’t say, “I am a knave.” The words would be false, and knights never lie.',
          'A knave can’t say it either. The words would be true, and knaves never tell the truth.',
          'So no one on the island can say, “I am a knave.”',
        ],
      },
      {
        title: 'Four answers',
        body: [
          'A sentence that is always true, like “Two plus two is four,” fits only a knight.',
          'A sentence that is always false fits only a knave.',
          '“I am a knight” fits either kind. “I am a knave” fits no one.',
        ],
      },
      {
        title: 'It can depend on others',
        scene: speakers([['Someone', 'Ben and I are the same kind.']]),
        body: [
          'Ben is a knave. Who could say, “Ben and I are the same kind”?',
          'A knight is not the same kind as Ben. So from a knight, the words would be false.',
          'A knave is the same kind as Ben. So from a knave, the words would be true.',
          'A knight can’t say it, and a knave can’t say it. So no one could say it.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const plans: { type: SayType; target?: 'both' | 'neither' }[] = [
        { type: 'self' },
        { type: 'fact' },
        { type: 'partner', target: rng.pick(['both', 'neither'] as const) },
        { type: 'partner' },
      ];
      return distinct(plans.map((p, i) => () => whoCanSayItem(rng, { id: `l2-${i + 1}`, skin: skins[i], ...p }).item));
    },
  },
  {
    id: L3,
    title: 'Suppose it, then crash-test it',
    ideas: [
      {
        title: 'Who is who?',
        body: [
          'Now you will find out who is a knight and who is a knave.',
          'Each islander could be either kind. The words they say are your clues.',
          'When an islander says “us,” it means all the islanders in the puzzle.',
        ],
      },
      {
        title: 'Suppose',
        body: [
          'To suppose means to pretend something is true, just to test it.',
          'Pick one islander. Suppose that one is a knight. That is your guess. Then follow what it means, one step at a time.',
        ],
      },
      {
        title: 'Crash!',
        body: [
          'Your guess crashes if there is no way to make it work. Someone always ends up breaking the rule.',
          'Breaking the rule means a knight says something false, or a knave says something true.',
          'A guess that crashes can’t be right. So the islander you picked must be the other kind.',
        ],
      },
      {
        title: 'A worked example',
        scene: speakers([['Ava', 'Ben is a knave.'], ['Ben', 'Ava and I are the same kind.']]),
        body: [
          'Suppose Ava is a knave. Then Ava’s words are false. So Ben is a knight.',
          'Ben is a knight, so Ben’s words must be true. But Ava and Ben are different kinds, so the words are false. That guess crashes!',
          'So Ava is a knight. Ava’s words are true, so Ben is a knave. Ben’s words are false, and that fits a knave.',
        ],
      },
      {
        title: 'Four possible answers',
        body: [
          'Suppose one islander is a knight. Then try the other islander as a knight, and then as a knave.',
          'Each of those is a case: one full way things could be. If just one case works, you know what the other islander must be.',
          'If the two cases both work, you can’t tell. If the two cases both break the rule, your guess crashes.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const targets: SupposeAnswer[] = rng.shuffle<SupposeAnswer>(['crash', rng.pick(['knight', 'knave', 'cant'] as const)]);
      return distinct([
        () => supposeItem(rng, { id: 'l3-1', skin: skins[0], target: targets[0] }).item,
        () => supposeItem(rng, { id: 'l3-2', skin: skins[1], target: targets[1] }).item,
        () => puzzleItem(rng, { id: 'l3-3', skin: skins[2], n: 2, lesson: L3, skill: 's5.two' }).item,
        () => puzzleItem(rng, { id: 'l3-4', skin: skins[3], n: 2, lesson: L3, skill: 's5.two' }).item,
      ]);
    },
  },
  {
    id: L4,
    title: 'Three islanders',
    ideas: [
      {
        title: 'Same plan, more people',
        body: [
          'With three islanders, there are more cases. The plan stays the same.',
          'Suppose one islander is a knight or a knave. Follow the words to learn about the others.',
        ],
      },
      {
        title: 'Start with a strong clue',
        body: [
          'Some words tell you a lot right away.',
          'Say someone tells you, “At least one of us is a knave.” A knave can’t say that, because it would be true.',
          'So that speaker must be a knight. And at least one of the others is a knave.',
        ],
      },
      {
        title: '“Us” means everyone',
        body: [
          '“Exactly one of us is a knight” counts every islander in the puzzle.',
          'It counts the speaker too.',
        ],
      },
      {
        title: 'A worked example',
        scene: speakers([['Ava', 'Ben is a knave.'], ['Ben', 'Cal is a knave.'], ['Cal', 'Ava and Ben are the same kind.']]),
        body: [
          'Suppose Ava is a knight. Then Ben is a knave. Ben’s words are false, so Cal is a knight.',
          'Then Cal’s words must be true. But Ava and Ben are different kinds. That guess crashes!',
          'So Ava is a knave. Then Ben is a knight, and Cal is a knave.',
        ],
      },
      {
        title: 'Check your answer',
        body: [
          'When you think you have it, check each islander.',
          'A knight’s words must be true. A knave’s words must be false. If each one fits, you are done.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 3);
      return distinct(skins.map((skin, i) => () => puzzleItem(rng, { id: `l4-${i + 1}`, skin, n: 3, lesson: L4, skill: 's5.three' }).item));
    },
  },
  {
    id: L5,
    title: 'When a knave says “and” or “or”',
    ideas: [
      {
        title: 'A knave’s “and”',
        scene: speakers([['Cal', 'Ava and Ben are both knights.']]),
        body: [
          'Cal is a knave. Cal says, “Ava and Ben are both knights.”',
          'The words are false. But that does not mean Ava and Ben are both knaves.',
          'An “and” sentence is false when at least one part is false. So at least one of Ava and Ben is a knave. It could be just one.',
        ],
      },
      {
        title: 'A knave’s “or”',
        scene: speakers([['Cal', 'Ava is a knight or Ben is a knight.']]),
        body: [
          'Cal is a knave. Cal says, “Ava is a knight or Ben is a knight.”',
          'An “or” sentence is false only when both parts are false.',
          'So Ava is not a knight, and Ben is not a knight. Ava and Ben are both knaves.',
        ],
      },
      {
        title: 'A knight’s “or”',
        body: [
          'Now say Dee is a knight. Dee says, “Ava is a knight or Ben is a knight.”',
          'Those words are true. So at least one of Ava and Ben is a knight. Maybe Ava and Ben both are.',
          'Remember: in logic, “or” includes the case where both parts are true.',
        ],
      },
      {
        title: 'List the cases',
        body: [
          'Not sure? List the four cases for Ava and Ben.',
          'Ava and Ben are both knights. Only Ava is a knight. Only Ben is a knight. Ava and Ben are both knaves.',
          'Cross out each case where the speaker’s words don’t fit. Then see what is left.',
        ],
      },
      {
        title: 'When “I” is one part',
        scene: speakers([['Raj', 'I am a knave and Vic is a knight.'], ['Vic', '']]),
        body: [
          'Raj says, “I am a knave and Vic is a knight.”',
          'If Raj were a knight, the first part would be false. Then the words would be false. So Raj is a knave.',
          'Now the words must be false. The first part is true, so the second part is false. Vic is a knave.',
        ],
      },
    ],
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const ops = rng.shuffle(['and', 'or'] as const);
      return distinct([
        () => andOrItem(rng, { id: 'l5-1', skin: skins[0], speaker: 'knave', op: ops[0] }).item,
        () => andOrItem(rng, { id: 'l5-2', skin: skins[1], speaker: 'knave', op: ops[1] }).item,
        () => andOrItem(rng, { id: 'l5-3', skin: skins[2] }).item,
        () => puzzleItem(rng, { id: 'l5-4', skin: skins[3], n: 2, pool: 'andor', lesson: L5, skill: 's5.and-or' }).item,
      ]);
    },
  },
];

// ---------- check and arcade ----------

/** A lesson 1 item of any kind. */
function anyWords(rng: Rng, id: string, skin: SkinId): Item {
  const plans: Omit<WordsOpts, 'id' | 'skin'>[] = [
    { type: 'fact', speaker: rng.pick(['knight', 'knave', 'unknown'] as const), negative: rng.chance(0.5) },
    { type: 'fact', speaker: 'knave', negative: true },
    { type: 'other', speaker: rng.pick(['knight', 'knave', 'unknown'] as const) },
    { type: 'speakerFromOther' },
    { type: 'kindFromFact', truth: rng.pick([true, false, 'unknown'] as const), negative: rng.chance(0.5) },
  ];
  return wordsItem(rng, { id, skin, ...rng.pick(plans) }).item;
}

const anySay = (rng: Rng, id: string, skin: SkinId): Item =>
  whoCanSayItem(rng, { id, skin, type: rng.pick(['self', 'fact', 'partner', 'partner'] as const) }).item;

const anySuppose = (rng: Rng, id: string, skin: SkinId): Item =>
  supposeItem(rng, { id, skin, target: rng.pick(['knight', 'knave', 'cant', 'crash'] as const) }).item;

/**
 * Nine items: two for lesson 1, one or two for lesson 2, a "suppose" question and a two-islander
 * puzzle for lesson 3, a three-islander puzzle (150 seconds) for lesson 4, and two for lesson 5, the
 * first always a knave's "and" or "or" (a conflict item). The ninth is lesson 2 or lesson 3 at random.
 */
function check(rng: Rng): Item[] {
  const skin = () => rng.pick(SKIN_IDS);
  return distinct([
    () => anyWords(rng, 'c1', skin()),
    () => anyWords(rng, 'c2', skin()),
    () => anySay(rng, 'c3', skin()),
    () => anySuppose(rng, 'c4', skin()),
    () => puzzleItem(rng, { id: 'c5', skin: skin(), n: 2, lesson: L3, skill: 's5.two' }).item,
    () => puzzleItem(rng, { id: 'c6', skin: skin(), n: 3, lesson: L4, skill: 's5.three' }).item,
    () => andOrItem(rng, { id: 'c7', skin: skin(), speaker: 'knave' }).item,
    () => (rng.chance(0.5)
      ? andOrItem(rng, { id: 'c8', skin: skin() }).item
      : puzzleItem(rng, { id: 'c8', skin: skin(), n: 2, pool: 'andor', lesson: L5, skill: 's5.and-or' }).item),
    () => (rng.chance(0.5) ? anySay(rng, 'c9', skin()) : anySuppose(rng, 'c9', skin())),
  ]);
}

/** One Arcade item from anywhere in the stop. */
function arcade(rng: Rng): Item {
  const id = 'a1';
  const skin = rng.pick(SKIN_IDS);
  switch (rng.int(1, 7)) {
    case 1: return anyWords(rng, id, skin);
    case 2: return anySay(rng, id, skin);
    case 3: return anySuppose(rng, id, skin);
    case 4: return puzzleItem(rng, { id, skin, n: 2, lesson: L3, skill: 's5.two' }).item;
    case 5: return puzzleItem(rng, { id, skin, n: 3, lesson: L4, skill: 's5.three' }).item;
    case 6: return andOrItem(rng, { id, skin }).item;
    default: return puzzleItem(rng, { id, skin, n: 2, pool: 'andor', lesson: L5, skill: 's5.and-or' }).item;
  }
}

// ---------- new examples after a miss ----------

const KIND_PICK = ['knight', 'knave'] as const;

/** Lesson 1: the other side of the "can you tell?" edge. A known speaker or fact becomes unknown, and back. */
function wordsContrast(plan: Omit<WordsOpts, 'id' | 'skin'>, rng: Rng): Omit<WordsOpts, 'id' | 'skin'> {
  switch (plan.type) {
    case 'fact': return { type: 'fact', speaker: plan.speaker === 'unknown' ? rng.pick(KIND_PICK) : 'unknown', negative: rng.chance(0.5) };
    case 'other': return plan.speaker === 'unknown' ? { type: 'other', speaker: rng.pick(KIND_PICK) } : { type: 'other', speaker: 'unknown' };
    case 'kindFromFact': return { type: 'kindFromFact', truth: plan.truth === 'unknown' ? rng.chance(0.5) : 'unknown', negative: rng.chance(0.5) };
    case 'speakerFromOther': return { type: 'other', speaker: 'unknown' };
  }
}

/** Lesson 3: a different outcome. One case works, two work, or none: each is checked against another. */
function supposeContrast(ans: SupposeAnswer, rng: Rng): SupposeAnswer {
  return ans === 'knight' || ans === 'knave' ? rng.pick(['cant', 'crash'] as const) : rng.pick(KIND_PICK);
}

/**
 * New examples after a miss, on both sides of the idea's edge, like the NOT flip's tie and no tie. Each set has an
 * item like the missed one (the same kind of question and the same kind of answer, with new names and words) and,
 * for the choice questions, one where the answer is of another kind:
 *  - lesson 1: a known speaker (or fact) and an unknown one, so "Can’t tell" is tested both ways
 *  - lesson 2: the same answer from other words, and a different answer
 *  - lesson 3: the same outcome (one case, two cases, or a crash), and a different one
 *  - lesson 5: the same speaker and "and" or "or", and the same speaker with the other word
 *  - puzzles: one more puzzle of the same size and words
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const skin = () => rng.pick(SKIN_IDS);
  const id = 'new';
  if (missed.kind === 'assign') {
    const n = missed.people.length === 3 ? 3 : 2;
    const pool = missed.lesson === L5 ? 'andor' : 'basic';
    return [puzzleItem(rng, { id, skin: skin(), n, pool, lesson: missed.lesson, skill: missed.skill }).item];
  }
  if (missed.kind !== 'choose') return [];
  switch (missed.lesson) {
    case L1: {
      const plan = wordsPlanOf(missed);
      if (!plan) return [];
      return [wordsItem(rng, { id, skin: skin(), ...plan }).item, wordsItem(rng, { id, skin: skin(), ...wordsContrast(plan, rng) }).item];
    }
    case L2: {
      const plan = sayPlanOf(missed);
      if (!plan) return [];
      // The same answer from other words (a "self" sentence has only one other way to give its answer).
      const sameType: SayType = plan.type === 'self' ? 'partner' : plan.type;
      const otherType = rng.pick((['self', 'fact', 'partner'] as const).filter((t) => SAY_TARGETS[t].some((x) => x !== plan.target)));
      const otherTarget = rng.pick(SAY_TARGETS[otherType].filter((x) => x !== plan.target));
      return [
        whoCanSayItem(rng, { id, skin: skin(), type: sameType, target: plan.target }).item,
        whoCanSayItem(rng, { id, skin: skin(), type: otherType, target: otherTarget }).item,
      ];
    }
    case L3: {
      const ans = missed.answer as SupposeAnswer;
      return [supposeItem(rng, { id, skin: skin(), target: ans }).item, supposeItem(rng, { id, skin: skin(), target: supposeContrast(ans, rng) }).item];
    }
    case L5: {
      const plan = andOrPlanOf(missed);
      if (!plan) return [];
      const other = plan.op === 'and' ? 'or' : 'and';
      return [andOrItem(rng, { id, skin: skin(), speaker: plan.speaker, op: plan.op }).item, andOrItem(rng, { id, skin: skin(), speaker: plan.speaker, op: other }).item];
    }
    default: return [];
  }
}

export const stop5: StopDef = {
  n: 5,
  id: 's5',
  title: 'Knights & Knaves',
  idea: 'Suppose an answer, follow it, and see if it breaks a clue.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
};
