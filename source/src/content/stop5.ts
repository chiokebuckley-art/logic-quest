/**
 * Stop 5 · Knights & Knaves.
 *
 * Five lessons: what a knight's or a knave's words tell you, what nobody can say, suppose-and-crash-test
 * with two islanders, three islanders, and what a knave's "and" / "or" means. Every item comes from
 * ../engine/puzzles/knights.ts, which lists every case (each islander a knight or a knave) and keeps the
 * ones where knights' words are true and knaves' words are false. Skins: everyday (Riddle Island),
 * fantasy (elves, wizards) and abstract (islanders A, B and C).
 *
 * Every lesson is taught See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026). See: a key-idea card with one
 * case already checked on its board. Do: guided boards (LessonDef.drill) on that same board, or a twin that changes
 * one piece; the learner marks each speaker's words true or false, then Holds or Crashes (or Keep or Cross out), by
 * taps. Every mark comes from the engine's board helpers (factRow, sayRow, caseRow). Quiz: twins of what the boards
 * taught, never a new kind of words: lesson 2 has no "and", lessons 3 and 5 have no "us" counting words (lesson 4
 * teaches those, on its strong-clue board), and lesson 5's "and" / "or" questions come from a knave, as its boards do.
 *
 * The worked examples on the cards are exported so the engine tests can check them case by case.
 */
import {
  FANTASY,
  ME,
  RULE,
  SAY_TARGETS,
  SKINS,
  SKIN_IDS,
  andOrItem,
  andOrPlanOf,
  caseRow,
  claimText,
  factRow,
  factScene,
  puzzleItem,
  sayPlanOf,
  sayRow,
  speakersScene,
  supposeItem,
  whoCanSayItem,
  wordsItem,
  wordsPlanOf,
  type ClaimPool,
  type Claims,
  type Fact,
  type Kind,
  type KindMap,
  type Namer,
  type SayType,
  type SkinId,
  type SupposeAnswer,
  type WordsOpts,
} from '../engine/puzzles/knights';
import type { Claim, DrillStep, Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

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

/**
 * The words each lesson's puzzles may use: lesson 3 only the plain words its boards check ("Ben is a knave.", "the
 * same kind", "I am a knight."), lesson 4 adds the "us" counting words its strong-clue board checks, and lesson 5
 * adds "and" / "or" to the plain words (not the counting words, which it does not teach).
 */
export const PUZZLE_POOL: Record<string, ClaimPool> = { [L3]: 'plain', [L4]: 'basic', [L5]: 'andor' };

/** Skins for a practice set: everyday, fantasy, abstract, then any, in a shuffled order. */
function practiceSkins(rng: Rng, count: number): SkinId[] {
  const base: SkinId[] = ['island', rng.pick(FANTASY), 'letters'];
  while (base.length < count) base.push(rng.pick(SKIN_IDS));
  return rng.shuffle(base.slice(0, count));
}

/**
 * Make items in order, drawing again whenever one looks the same as an earlier one (same prompt, same words
 * in the bubbles and same choices), so no set shows the same question twice. Speaker names are left out of
 * the key: "Someone" and "An elf" saying “I am a knave.” is the same question. A question in `avoid` (a card's own
 * worked example) is drawn again too, so a quiz is a twin of the card, never the card itself. The same seed still
 * gives the same set.
 */
function distinct(makers: readonly (() => Item)[], avoid: ReadonlySet<string> = new Set()): Item[] {
  const seen = new Set<string>();
  const key = (it: Item) =>
    JSON.stringify([
      it.prompt,
      it.scene?.kind === 'speakers' ? it.scene.speakers.map((sp) => sp.says) : it.scene ?? null,
      it.kind === 'choose' ? it.choices.map((c) => c.label) : null,
    ]);
  return makers.map((make) => {
    let item = make();
    for (let tries = 0; tries < 100 && (seen.has(key(item)) || avoid.has(item.prompt)); tries++) item = make();
    seen.add(key(item));
    return item;
  });
}

const speakers = (list: [string, string][]): Scene => ({
  kind: 'speakers',
  speakers: list.map(([name, says]) => ({ id: name.toLowerCase(), name, says })),
  rule: RULE,
});

/** Names on the cards: the id with a capital letter ("ava" -> "Ava"). */
const nm: Namer = (id) => id.charAt(0).toUpperCase() + id.slice(1);
/** A case: each id gets the kind in the same place ("ava", "ben" + "knave", "knight"). */
const caseOf = (ids: readonly string[], ...kinds: Kind[]): KindMap => Object.fromEntries(ids.map((id, i) => [id, kinds[i]]));

// ---------- worked examples and their boards (checked in knights.test.ts) ----------

/** Lesson 1, the handoff's board. The well is full. */
export const WELL: Fact = { say: 'The well is full.', sayNot: 'The well is not full.', ask: 'Is the well full?', yes: 'the well is full', no: 'the well is not full' };

/**
 * Lesson 1: three islanders, each given a kind, talk about the well. Fay's case is the card's (a knight with false
 * words crashes); the learner checks Ada (a given knight) and Ben (a given knave), as the handoff's sample does.
 */
export const L1_WELL: { fact: Fact; full: boolean; speakers: { name: string; kind: Kind; negative: boolean }[] } = {
  fact: WELL,
  full: true,
  speakers: [
    { name: 'Ada', kind: 'knight', negative: false },
    { name: 'Ben', kind: 'knave', negative: false },
    { name: 'Fay', kind: 'knight', negative: true },
  ],
};
export const L1_WELL_SCENE = factScene(WELL, L1_WELL.speakers, L1_WELL.full ? WELL.say : WELL.sayNot);

const wellRow = (name: string, given = false) => {
  const sp = L1_WELL.speakers.find((x) => x.name === name)!;
  return factRow({ name, fact: WELL, negative: sp.negative, k: sp.kind, p: L1_WELL.full, given });
};

/** Lesson 1: Cal says “I can swim.” No one knows Cal's kind, so every case is checked. */
export const L1_SWIM = { name: 'Cal', fact: SKINS.island.facts.find((x) => x.say === 'I can swim.')!, negative: false };
export const L1_SWIM_SCENE = factScene(L1_SWIM.fact, [L1_SWIM]);
const swimRow = (k: Kind, p: boolean, given = false) => factRow({ ...L1_SWIM, k, p, given });

/** Lesson 1: Dee says “Eli is a knave.” Dee is a knave, so Eli is a knight. */
export const L1_OTHERS: { ids: string[]; claims: Claims } = { ids: ['dee', 'eli'], claims: { dee: { t: 'is', who: 'eli', kind: 'knave' } } };
export const L1_OTHERS_SCENE = speakersScene(['dee'], L1_OTHERS.claims, nm);
const othersRow = (dee: Kind, eli: Kind, given = false) => caseRow({ ...L1_OTHERS, kinds: caseOf(L1_OTHERS.ids, dee, eli), nm, given, onBoard: ['dee'] });

/** See, then Do: one given knight checked on the card; the learner checks a given knight and a given knave. */
export const L1_DRILL: DrillStep[] = [
  {
    id: 's5.l1-do1',
    title: 'Check two given cases',
    body: [
      'The well is full. This is the board from the card “Check a case.” Fay’s case is already checked.',
      'Ada is given as a knight, and Ben is given as a knave. Mark each one’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L1_WELL_SCENE,
    // Right after the card “Check a case” (card 4), so the Do sits next to its See.
    afterCard: 3,
    rows: [wellRow('Fay', true), wellRow('Ada'), wellRow('Ben')],
    done: 'Right. A knight with true words holds. A knave with true words crashes. You checked a given knight and a given knave.',
  },
  {
    id: 's5.l1-do2',
    title: 'Check every case',
    body: [
      'No one knows if Cal is a knight or a knave. So there are four cases. The first one is already checked.',
      'Mark Cal’s words true or false in each case. Then tap Holds or Crashes.',
    ],
    scene: L1_SWIM_SCENE,
    afterCard: 4,
    rows: [swimRow('knight', true, true), swimRow('knight', false), swimRow('knave', true), swimRow('knave', false)],
    done: 'Right. Two cases hold. In one, Cal is a knight who can swim. In the other, Cal is a knave who cannot swim. So you can’t tell if Cal can swim, or what kind Cal is.',
  },
  {
    id: 's5.l1-do3',
    title: 'Words about others',
    body: [
      'Dee says, “Eli is a knave.” Dee and Eli can each be a knight or a knave, so there are four cases. The first one is already checked.',
      'Mark Dee’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L1_OTHERS_SCENE,
    afterCard: 5,
    // Every case, as on the Can't-tell board: a known kind leaves one case that holds, and an unknown one leaves two.
    rows: [othersRow('knave', 'knave', true), othersRow('knave', 'knight'), othersRow('knight', 'knight'), othersRow('knight', 'knave')],
    done: 'Right. Two cases hold. If Dee is a knave, Eli is a knight. If Dee is a knight, Eli is a knave. So when no one knows Dee’s kind, you can’t tell what Eli is.',
  },
];

/** Lesson 2: Ben is a knave. Nobody could say "Ben and I are the same kind." */
export const L2_EXAMPLE: { partner: string; partnerKind: Kind; claim: Claim } = { partner: 'ben', partnerKind: 'knave', claim: { t: 'same', a: 'me', b: 'ben' } };
export const L2_SCENE: Scene = {
  kind: 'speakers',
  speakers: [{ id: ME, name: 'Someone', says: claimText(L2_EXAMPLE.claim, ME, (id) => (id === ME ? 'Someone' : nm(id)), 2) }],
  rule: RULE,
};
const benRow = (benKind: Kind, k: Kind, given = false) => sayRow({ claim: L2_EXAMPLE.claim, partner: 'ben', partnerName: 'Ben', partnerKind: benKind, k, given });

/** Test each kind on the card's board; then the twin where Ben is a knight. */
export const L2_DRILL: DrillStep[] = [
  {
    id: 's5.l2-do1',
    title: 'Test each kind',
    body: [
      'This is the board from the card “It can depend on others.” Ben is a knave. The knight is already checked.',
      'Now pretend a knave says it. Mark the words true or false. Then say if a knave could say it.',
    ],
    scene: L2_SCENE,
    rows: [benRow('knave', 'knight', true), benRow('knave', 'knave')],
    done: 'Right. A knight can’t say it, and a knave can’t say it. So no one could say it.',
  },
  {
    id: 's5.l2-do2',
    title: 'Now Ben is a knight',
    body: ['Test each kind again. Mark the words true or false. Then say if that kind could say it.'],
    scene: L2_SCENE,
    twin: 'Ben is a knight now. The words are the same.',
    rows: [benRow('knight', 'knight'), benRow('knight', 'knave')],
    done: 'Right. A knight could say it, and so could a knave. So either kind could say it. Who could say it can depend on others.',
  },
];

/** Lesson 3: two islanders. Only answer: Ava is a knight, Ben is a knave. */
export const L3_EXAMPLE: { ids: string[]; claims: Claims; answer: Record<string, Kind> } = {
  ids: ['ava', 'ben'],
  claims: { ava: { t: 'is', who: 'ben', kind: 'knave' }, ben: { t: 'same', a: 'ava', b: 'ben' } },
  answer: { ava: 'knight', ben: 'knave' },
};
export const L3_SCENE = speakersScene(L3_EXAMPLE.ids, L3_EXAMPLE.claims, nm);

/** Lesson 3's twin: Ava says "I am a knight." instead. Suppose Ava is a knight: Ben could be either kind. */
export const L3_TWIN: { ids: string[]; claims: Claims } = {
  ids: ['ava', 'ben'],
  claims: { ava: { t: 'is', who: 'ava', kind: 'knight' }, ben: { t: 'same', a: 'ava', b: 'ben' } },
};
export const L3_TWIN_SCENE = speakersScene(L3_TWIN.ids, L3_TWIN.claims, nm);

const l3Row = (ava: Kind, ben: Kind, given = false) => caseRow({ ...L3_EXAMPLE, kinds: caseOf(L3_EXAMPLE.ids, ava, ben), nm, given });
const l3TwinRow = (ava: Kind, ben: Kind, given = false) => caseRow({ ...L3_TWIN, kinds: caseOf(L3_TWIN.ids, ava, ben), nm, given });

/** Every case of the card's board, the card's guess shown; then a twin where a guess leaves two cases that hold. */
export const L3_DRILL: DrillStep[] = [
  {
    id: 's5.l3-do1',
    title: 'Check each case',
    body: [
      'This is the board from the example. Each row is one case. The first row is the guess on the card, already checked.',
      'Mark each islander’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L3_SCENE,
    rows: [l3Row('knave', 'knight', true), l3Row('knave', 'knave'), l3Row('knight', 'knight'), l3Row('knight', 'knave')],
    done: 'Right. With Ava as a knave, the two cases crash, so that guess crashes. With Ava as a knight, only Ben as a knave holds.',
  },
  {
    id: 's5.l3-do2',
    title: 'When two cases hold',
    body: ['Ben’s words stay the same. Suppose Ava is a knight. Ben as a knight is already checked. Now check Ben as a knave.'],
    scene: L3_TWIN_SCENE,
    twin: 'Ava’s words changed. Now Ava says, “I am a knight.”',
    rows: [l3TwinRow('knight', 'knight', true), l3TwinRow('knight', 'knave')],
    done: 'Right. With Ava as a knight, the two cases both hold. So you can’t tell what Ben is.',
  },
];

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
export const L4_SCENE = speakersScene(L4_EXAMPLE.ids, L4_EXAMPLE.claims, nm);

/** Lesson 4's strong clue: Ava says "At least one of us is a knave." Ben and Cal say nothing. */
export const L4_STRONG: { ids: string[]; claims: Claims } = {
  ids: ['ava', 'ben', 'cal'],
  claims: { ava: { t: 'count', op: 'atLeast', k: 1, kind: 'knave' } },
};
export const L4_STRONG_SCENE = speakersScene(L4_STRONG.ids, L4_STRONG.claims, nm);

const strongRow = (ava: Kind, ben: Kind, cal: Kind, given = false) => caseRow({ ...L4_STRONG, kinds: caseOf(L4_STRONG.ids, ava, ben, cal), nm, given });
const l4Row = (ava: Kind, ben: Kind, cal: Kind, given = false) => caseRow({ ...L4_EXAMPLE, kinds: caseOf(L4_EXAMPLE.ids, ava, ben, cal), nm, given });

/** The strong clue on card 2's board (“us” counts the speaker), then the worked example's board. */
export const L4_DRILL: DrillStep[] = [
  {
    id: 's5.l4-do1',
    title: 'A strong clue',
    body: [
      'This is the board from the card “Start with a strong clue.” “Us” means Ava, Ben and Cal. Ben and Cal say nothing, so each one fits the rule as either kind.',
      'The first case is already checked. Mark Ava’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L4_STRONG_SCENE,
    rows: [
      strongRow('knave', 'knight', 'knight', true),
      strongRow('knave', 'knave', 'knave'),
      strongRow('knight', 'knight', 'knight'),
      strongRow('knight', 'knave', 'knight'),
    ],
    done: 'Right. Every case with Ava as a knave crashes. So Ava is a knight, and at least one of Ben and Cal is a knave.',
  },
  {
    id: 's5.l4-do2',
    title: 'Check your answer',
    body: [
      'This is the board from the example. The first row is the guess on the card, already checked.',
      'Mark each islander’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L4_SCENE,
    rows: [l4Row('knight', 'knave', 'knight', true), l4Row('knave', 'knight', 'knave'), l4Row('knave', 'knight', 'knight')],
    done: 'Right. Ava as a knave, Ben as a knight and Cal as a knave holds. That is the card’s answer. Change Cal, and the case crashes.',
  },
];

/** Lesson 5: Cal is a knave and says "Ava and Ben are both knights." */
export const L5_AND: { ids: string[]; speaker: string; kind: Kind; claims: Claims } = {
  ids: ['ava', 'ben', 'cal'],
  speaker: 'cal',
  kind: 'knave',
  claims: { cal: { t: 'and', cs: [{ t: 'is', who: 'ava', kind: 'knight' }, { t: 'is', who: 'ben', kind: 'knight' }] } },
};
/** Lesson 5: Cal is a knave and says "Ava is a knight or Ben is a knight." */
export const L5_OR: { ids: string[]; speaker: string; kind: Kind; claims: Claims } = {
  ids: ['ava', 'ben', 'cal'],
  speaker: 'cal',
  kind: 'knave',
  claims: { cal: { t: 'or', cs: [{ t: 'is', who: 'ava', kind: 'knight' }, { t: 'is', who: 'ben', kind: 'knight' }] } },
};
export const L5_AND_SCENE = speakersScene(['cal'], L5_AND.claims, nm);
export const L5_OR_SCENE = speakersScene(['cal'], L5_OR.claims, nm);

/** Lesson 5: Raj says "I am a knave and Vic is a knight." Only answer: Raj and Vic are both knaves. */
export const L5_EXAMPLE: { ids: string[]; claims: Claims; answer: Record<string, Kind> } = {
  ids: ['raj', 'vic'],
  claims: { raj: { t: 'and', cs: [{ t: 'is', who: 'raj', kind: 'knave' }, { t: 'is', who: 'vic', kind: 'knight' }] } },
  answer: { raj: 'knave', vic: 'knave' },
};
export const L5_SCENE = speakersScene(L5_EXAMPLE.ids, L5_EXAMPLE.claims, nm);

/** One of the four cases for Ava and Ben, with the knave Cal's words: kept or crossed out. */
const listRow = (ex: typeof L5_AND, ava: Kind, ben: Kind, given = false) =>
  caseRow({ ids: ex.ids, claims: ex.claims, kinds: { ...caseOf(['ava', 'ben'], ava, ben), [ex.speaker]: ex.kind }, nm, given, decide: 'keep', about: ['ava', 'ben'] });
const rajRow = (raj: Kind, vic: Kind, given = false) => caseRow({ ...L5_EXAMPLE, kinds: caseOf(L5_EXAMPLE.ids, raj, vic), nm, given });

/** List the cases for a knave's "and", then a knave's "or", each on its card's board; then the "I" card's board. */
export const L5_DRILL: DrillStep[] = [
  {
    id: 's5.l5-do1',
    title: 'List the cases for “and”',
    body: [
      'Cal is a knave and says, “Ava and Ben are both knights.” Here are the four cases for Ava and Ben. One is already checked.',
      'Mark Cal’s words true or false. Keep a case only if the words fit a knave.',
    ],
    scene: L5_AND_SCENE,
    rows: [listRow(L5_AND, 'knave', 'knave', true), listRow(L5_AND, 'knight', 'knight'), listRow(L5_AND, 'knight', 'knave'), listRow(L5_AND, 'knave', 'knight')],
    done: 'Right. Three cases are left. So at least one of Ava and Ben is a knave. It could be just one.',
  },
  {
    id: 's5.l5-do2',
    title: 'List the cases for “or”',
    body: [
      'Cal is a knave and says, “Ava is a knight or Ben is a knight.” One case is already checked.',
      'Mark Cal’s words true or false. Keep a case only if the words fit a knave.',
    ],
    scene: L5_OR_SCENE,
    rows: [listRow(L5_OR, 'knight', 'knight', true), listRow(L5_OR, 'knight', 'knave'), listRow(L5_OR, 'knave', 'knight'), listRow(L5_OR, 'knave', 'knave')],
    done: 'Right. One case is left. Ava and Ben are both knaves.',
  },
  {
    id: 's5.l5-do3',
    title: 'When “I” is one part',
    body: [
      'Raj says, “I am a knave and Vic is a knight.” Vic says nothing. Each row is one case. The first one is already checked.',
      'Mark Raj’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L5_SCENE,
    rows: [rajRow('knave', 'knave', true), rajRow('knight', 'knight'), rajRow('knight', 'knave'), rajRow('knave', 'knight')],
    done: 'Right. Only the case where Raj and Vic are both knaves holds. That is the answer.',
  },
];

/**
 * Questions that a card or its board already works out (lesson 1's third board checks every case of Dee and Eli).
 * A quiz is a twin of the card, never the card itself, so these are drawn again (see distinct).
 */
export const CARD_QUESTIONS: Record<string, ReadonlySet<string>> = {
  [L1]: new Set([
    'No one knows if Cal is a knight or a knave. Cal says, “I can swim.” Can Cal swim?',
    'Dee is a knave. Dee says, “Eli is a knave.” Is Eli a knight or a knave?',
    'Dee is a knight. Dee says, “Eli is a knave.” Is Eli a knight or a knave?',
    'No one knows if Dee is a knight or a knave. Dee says, “Eli is a knave.” Is Eli a knight or a knave?',
    'Eli is a knight. Dee says, “Eli is a knave.” Is Dee a knight or a knave?',
    'Eli is a knave. Dee says, “Eli is a knave.” Is Dee a knight or a knave?',
  ]),
  [L2]: new Set([
    'Ben is a knave. Who could say, “Ben and I are the same kind”?',
    'Ben is a knight. Who could say, “Ben and I are the same kind”?',
    // Card 4's picture. ("I am a knight" and "I am a knave" have no other words, so their quizzes are new skins.)
    'Who could say, “Two plus two is four”?',
  ]),
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
        scene: speakers([['Ada', 'I have a cat.']]),
        body: [
          'Ada is a knight. Ada says, “I have a cat.”',
          'A knight’s words are true. So Ada has a cat.',
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
        title: 'Check a case',
        scene: L1_WELL_SCENE,
        body: [
          'The well is full. Each islander here is given a kind: knight or knave.',
          'A case is one full way things could be. A case holds when the speaker fits the rule. It crashes when a knight says something false, or a knave says something true.',
          'Fay is given as a knight. Fay says, “The well is not full.” The well is full, so Fay’s words are false.',
          'A knight said something false. That breaks the rule, so this case crashes.',
        ],
      },
      {
        title: 'When you can’t tell',
        scene: L1_SWIM_SCENE,
        body: [
          'Cal says, “I can swim.” But no one knows if Cal is a knight or a knave. So check each case.',
          'Say Cal is a knight. Then the words are true, so Cal can swim. This case holds.',
          'Say Cal is a knave. Then the words are false, so Cal cannot swim. This case holds too.',
          'Two cases hold, and they give different answers. So you can’t tell. That is a real answer. It is not giving up.',
        ],
      },
      {
        title: 'Words about others',
        scene: L1_OTHERS_SCENE,
        body: [
          'Islanders can talk about each other too. Dee is a knave. Dee says, “Eli is a knave.”',
          'Try Eli as a knave. Then Dee’s words are true. A knave never says true words, so this case crashes.',
          'So Eli is a knight. Then Dee’s words are false, and that fits a knave.',
          'It works the other way too. True words come from a knight. False words come from a knave.',
        ],
      },
    ],
    drill: L1_DRILL,
    // Try 1 is a twin of the first board: a given kind and words about a fact. Try 2 is a knave's "not". Try 3 is a
    // twin of the second board (Can't tell). Try 4 is words about others, or the speaker's kind from a known fact.
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
      return distinct(plans.map((p, i) => () => wordsItem(rng, { id: `l1-${i + 1}`, skin: skins[i], ...p }).item), CARD_QUESTIONS[L1]);
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
        scene: speakers([['Someone', 'Two plus two is four.']]),
        body: [
          'A sentence that is always true, like “Two plus two is four,” fits only a knight.',
          'A sentence that is always false fits only a knave.',
          '“I am a knight” fits either kind. “I am a knave” fits no one.',
        ],
      },
      {
        title: 'It can depend on others',
        scene: L2_SCENE,
        body: [
          'Ben is a knave. Who could say, “Ben and I are the same kind”?',
          'A knight is not the same kind as Ben. So from a knight, the words would be false.',
          'A knave is the same kind as Ben. So from a knave, the words would be true.',
          'A knight can’t say it, and a knave can’t say it. So no one could say it.',
        ],
      },
    ],
    drill: L2_DRILL,
    // Try 1 is a twin of the boards: words about a partner whose kind is given (either kind, or no one). Then the
    // card sentences' kinds: "I am a knight / knave", a sentence that is always true or false, and one more partner.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const plans: { type: SayType; target?: 'both' | 'neither' }[] = [
        { type: 'partner', target: rng.pick(['both', 'neither'] as const) },
        { type: 'self' },
        { type: 'fact' },
        { type: 'partner' },
      ];
      return distinct(plans.map((p, i) => () => whoCanSayItem(rng, { id: `l2-${i + 1}`, skin: skins[i], ...p }).item), CARD_QUESTIONS[L2]);
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
        scene: L3_SCENE,
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
    drill: L3_DRILL,
    // Two guesses to crash-test (one always crashes) and two puzzles, all with the words the boards check. No "us"
    // counting words and no silent islander: lesson 4 teaches those.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const targets: SupposeAnswer[] = rng.shuffle<SupposeAnswer>(['crash', rng.pick(['knight', 'knave', 'cant'] as const)]);
      return distinct([
        () => supposeItem(rng, { id: 'l3-1', skin: skins[0], target: targets[0], pool: PUZZLE_POOL[L3] }).item,
        () => supposeItem(rng, { id: 'l3-2', skin: skins[1], target: targets[1], pool: PUZZLE_POOL[L3] }).item,
        () => puzzleItem(rng, { id: 'l3-3', skin: skins[2], n: 2, pool: PUZZLE_POOL[L3], lesson: L3, skill: 's5.two' }).item,
        () => puzzleItem(rng, { id: 'l3-4', skin: skins[3], n: 2, pool: PUZZLE_POOL[L3], lesson: L3, skill: 's5.two' }).item,
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
        scene: L4_STRONG_SCENE,
        body: [
          'Some words tell you a lot right away. Ava says, “At least one of us is a knave.” Ben and Cal say nothing.',
          'Try Ava as a knave. Ava counts too, so the words are true. A knave never says true words, so that case crashes.',
          'So Ava must be a knight. And at least one of Ben and Cal is a knave.',
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
        scene: L4_SCENE,
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
    drill: L4_DRILL,
    practice: (rng) => {
      const skins = practiceSkins(rng, 3);
      return distinct(skins.map((skin, i) => () => puzzleItem(rng, { id: `l4-${i + 1}`, skin, n: 3, pool: PUZZLE_POOL[L4], lesson: L4, skill: 's5.three' }).item));
    },
  },
  {
    id: L5,
    title: 'When a knave says “and” or “or”',
    ideas: [
      {
        title: 'A knave’s “and”',
        scene: L5_AND_SCENE,
        body: [
          'Cal is a knave. Cal says, “Ava and Ben are both knights.”',
          'The words are false. But that does not mean Ava and Ben are both knaves.',
          'An “and” sentence is false when at least one part is false. So at least one of Ava and Ben is a knave. It could be just one.',
        ],
      },
      {
        title: 'A knave’s “or”',
        scene: L5_OR_SCENE,
        body: [
          'Cal is a knave. Cal says, “Ava is a knight or Ben is a knight.”',
          'An “or” sentence is false only when both parts are false.',
          'So Ava is not a knight, and Ben is not a knight. Ava and Ben are both knaves.',
        ],
      },
      {
        title: 'A knight’s “or”',
        scene: speakers([['Dee', 'Ava is a knight or Ben is a knight.']]),
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
        scene: L5_SCENE,
        body: [
          'Raj says, “I am a knave and Vic is a knight.”',
          'If Raj were a knight, the first part would be false. Then the words would be false. So Raj is a knave.',
          'Now the words must be false. The first part is true, so the second part is false. Vic is a knave.',
        ],
      },
    ],
    drill: L5_DRILL,
    // A knave's "and" and a knave's "or" (each a twin of its board, new names), then one with the kinds in the
    // words changed ("both knaves"), then a two-islander "and" / "or" puzzle like the "I" card's.
    practice: (rng) => {
      const skins = practiceSkins(rng, 4);
      const ops = rng.shuffle(['and', 'or'] as const);
      return distinct([
        () => andOrItem(rng, { id: 'l5-1', skin: skins[0], speaker: 'knave', op: ops[0], part: 'knight' }).item,
        () => andOrItem(rng, { id: 'l5-2', skin: skins[1], speaker: 'knave', op: ops[1], part: 'knight' }).item,
        () => andOrItem(rng, { id: 'l5-3', skin: skins[2], speaker: 'knave', part: 'knave' }).item,
        () => puzzleItem(rng, { id: 'l5-4', skin: skins[3], n: 2, pool: PUZZLE_POOL[L5], lesson: L5, skill: 's5.and-or' }).item,
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
  supposeItem(rng, { id, skin, target: rng.pick(['knight', 'knave', 'cant', 'crash'] as const), pool: PUZZLE_POOL[L3] }).item;

/** A lesson 5 "and" / "or" question: always from a knave, as the lesson's boards are. */
const anyAndOr = (rng: Rng, id: string, skin: SkinId): Item => andOrItem(rng, { id, skin, speaker: 'knave' }).item;

const puzzle = (rng: Rng, id: string, skin: SkinId, lesson: typeof L3 | typeof L4 | typeof L5): Item =>
  puzzleItem(rng, { id, skin, n: lesson === L4 ? 3 : 2, pool: PUZZLE_POOL[lesson], lesson, skill: lesson === L3 ? 's5.two' : lesson === L4 ? 's5.three' : 's5.and-or' }).item;

/**
 * Nine items: two for lesson 1, one or two for lesson 2, a "suppose" question and a two-islander
 * puzzle for lesson 3, a three-islander puzzle (150 seconds) for lesson 4, and two for lesson 5, the
 * first always a knave's "and" or "or" (a conflict item). The ninth is lesson 2 or lesson 3 at random.
 * Each item uses only the words its lesson teaches (PUZZLE_POOL).
 */
function check(rng: Rng): Item[] {
  const skin = () => rng.pick(SKIN_IDS);
  return distinct([
    () => anyWords(rng, 'c1', skin()),
    () => anyWords(rng, 'c2', skin()),
    () => anySay(rng, 'c3', skin()),
    () => anySuppose(rng, 'c4', skin()),
    () => puzzle(rng, 'c5', skin(), L3),
    () => puzzle(rng, 'c6', skin(), L4),
    () => anyAndOr(rng, 'c7', skin()),
    () => (rng.chance(0.5) ? anyAndOr(rng, 'c8', skin()) : puzzle(rng, 'c8', skin(), L5)),
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
    case 4: return puzzle(rng, id, skin, L3);
    case 5: return puzzle(rng, id, skin, L4);
    case 6: return anyAndOr(rng, id, skin);
    default: return puzzle(rng, id, skin, L5);
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
 *  - puzzles: one more puzzle of the same size, with the words its lesson teaches
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const skin = () => rng.pick(SKIN_IDS);
  const id = 'new';
  if (missed.kind === 'assign') {
    const n = missed.people.length === 3 ? 3 : 2;
    const pool = PUZZLE_POOL[missed.lesson] ?? 'basic';
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
      return [
        supposeItem(rng, { id, skin: skin(), target: ans, pool: PUZZLE_POOL[L3] }).item,
        supposeItem(rng, { id, skin: skin(), target: supposeContrast(ans, rng), pool: PUZZLE_POOL[L3] }).item,
      ];
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
