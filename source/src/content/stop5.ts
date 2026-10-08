/**
 * Stop 5 · Knights & Knaves.
 *
 * Five lessons: what a knight's or a knave's words tell you, what nobody can say, suppose-and-crash-test
 * with two islanders, three islanders, and what a knave's "and" / "or" means. Every item comes from
 * ../engine/puzzles/knights.ts, which lists every case (each islander a knight or a knave) and keeps the
 * ones where knights' words are true and knaves' words are false. Skins: everyday (Riddle Island),
 * fantasy (elves, wizards) and abstract (islanders A, B and C).
 *
 * Two distinctions are taught apart (docs/audit/hidden-distinctions.md, Stop 5): the kind we test for a speaker says
 * what the words must be, and whether the words are true comes from the case (kind vs truth, a contrast card and board
 * in lesson 1, reminded in every later lesson); and what is found inside a guess is pretend, while only what comes after
 * the crash is known (guess vs known, a contrast card and a sorting board in lesson 3, reminded in lesson 4).
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
  CASE_WORDS,
  FANTASY,
  GUESS_FLIPS,
  GUESS_VS_KNOWN,
  KNAVE_NOT,
  KIND_VS_TRUTH,
  ME,
  PUZZLE_RULE,
  SAY_WORDS,
  SAY_TARGETS,
  SKINS,
  SKIN_IDS,
  andOrItem,
  andOrPlanOf,
  boardSteps,
  caseRow,
  claimText,
  factRow,
  factScene,
  guessConfused,
  guessContrastScene,
  guessSortDrill,
  kindConfused,
  kindContrastScene,
  kindMisconceptions,
  puzzleItem,
  sayConfused,
  sayPlanOf,
  sayRow,
  speakersScene,
  supposeItem,
  truthConfused,
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
import type { Claim, Distinction, DrillStep, IdeaCard, Item, LessonDef, Rng, Scene, StopDef } from '../engine/types';

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

/** A card's speakers. The banner is the rule as a need: what each kind's words must be. */
const speakers = (list: [string, string][]): Scene => ({
  kind: 'speakers',
  speakers: list.map(([name, says]) => ({ id: name.toLowerCase(), name, says })),
  rule: PUZZLE_RULE,
});

/** Names on the cards: the id with a capital letter ("ava" -> "Ava"). */
const nm: Namer = (id) => id.charAt(0).toUpperCase() + id.slice(1);
/** A case: each id gets the kind in the same place ("ava", "ben" + "knave", "knight"). */
const caseOf = (ids: readonly string[], ...kinds: Kind[]): KindMap => Object.fromEntries(ids.map((id, i) => [id, kinds[i]]));

// ---------- worked examples and their boards (checked in knights.test.ts) ----------
//
// Every board keeps the two ideas the stop rests on apart (docs/CONTENT_GUIDE.md, "Distinctions"): the kind we test for
// a speaker says what the words must be, and whether the words are true comes from the case (KIND_VS_TRUTH); what is
// found inside a guess is pretend, and only what comes after the crash is known (GUESS_VS_KNOWN). Each row's label
// starts "Test:", each words mark carries the two facts to compare ("Says / In this case / So"), each row its need on
// its own line, and each board the mix-ups its wrong marks can show (kindMisconceptions) and "I’m confused".

/** Lesson 1, the handoff's board. The well is full. */
export const WELL: Fact = { say: 'The well is full.', sayNot: 'The well is not full.', ask: 'Is the well full?', yes: 'the well is full', no: 'the well is not full' };

/**
 * Lesson 1: three islanders talk about the well. The well is full: a fact. Each row tests a kind for one islander.
 * Fay's case is the card's (a knight with false words crashes); the learner checks Ada (tested as a knight) and Ben
 * (tested as a knave), as the handoff's sample does.
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
export const L1_WELL_SCENE = factScene(WELL, L1_WELL.speakers, L1_WELL.full ? WELL.say : WELL.sayNot, 'We test a kind for each islander.');

const wellRow = (name: string, given = false) => {
  const sp = L1_WELL.speakers.find((x) => x.name === name)!;
  return factRow({ name, fact: WELL, negative: sp.negative, k: sp.kind, p: L1_WELL.full, given, test: true, known: true });
};

/**
 * Lesson 1's contrast (kind vs truth): Ben is tested as a knave both times and says “The well is full.” Only the well
 * changes. Full: the words are true, so the case crashes. Not full: they are false, so it holds. From factCase.
 */
export const L1_CONTRAST_SCENE = kindContrastScene('Ben', WELL, false, 'knave');
export const L1_CONTRAST: IdeaCard = {
  title: 'Two different things',
  distinction: KIND_VS_TRUTH.id,
  scene: L1_CONTRAST_SCENE,
  body: [
    'A case is one full way things could be. In a case, we test a kind: we pretend a speaker is a knight or a knave. The case holds if everyone fits the rule. It crashes if someone breaks it.',
    'Two things are easy to mix up. One: the kind we test. It says what the words must be. Two: whether the words are true. That comes from what they say, checked against the case.',
    'Below, Ben is tested as a knave both times, with the same words. Only the well changes.',
  ],
};
const benCase = (p: boolean) => factRow({ name: 'Ben', fact: WELL, negative: false, k: 'knave', p, test: true });

/** Lesson 1: Cal says “I can swim.” No one knows Cal's kind, or if Cal can swim, so every case is checked. */
export const L1_SWIM = { name: 'Cal', fact: SKINS.island.facts.find((x) => x.say === 'I can swim.')!, negative: false };
export const L1_SWIM_SCENE = factScene(L1_SWIM.fact, [L1_SWIM], undefined, 'We test Cal’s kind, and if Cal can swim.');
const swimRow = (k: Kind, p: boolean, given = false) => factRow({ ...L1_SWIM, k, p, given, test: true });

/** Lesson 1: Dee says “Eli is a knave.” Tested as a knave, Dee leaves Eli a knight. */
export const L1_OTHERS: { ids: string[]; claims: Claims } = { ids: ['dee', 'eli'], claims: { dee: { t: 'is', who: 'eli', kind: 'knave' } } };
export const L1_OTHERS_SCENE = speakersScene(['dee'], L1_OTHERS.claims, nm, { rule: PUZZLE_RULE, test: 'We test Dee’s kind and Eli’s kind.' });
const othersRow = (dee: Kind, eli: Kind, given = false) => caseRow({ ...L1_OTHERS, kinds: caseOf(L1_OTHERS.ids, dee, eli), nm, given, onBoard: ['dee'], test: true });

/** A lesson 1 board: the full scaffold, the stop's words, its mix-ups and "I’m confused" (kind vs truth, fact vs test). */
const l1Board = (st: Omit<DrillStep, 'scaffold' | 'words' | 'steps' | 'misconceptions' | 'confused' | 'distinction'>): DrillStep => ({
  ...st,
  distinction: KIND_VS_TRUTH.id,
  scaffold: 'full',
  words: CASE_WORDS,
  steps: boardSteps(st.rows),
  misconceptions: kindMisconceptions(st.rows),
  confused: kindConfused(),
});

/**
 * The distinction first (Ben's two cases, right after the contrast card), then See, then Do: the card checks Fay; the
 * learner checks Ada (tested as a knight) and Ben (tested as a knave) against the fact; then the four swim cases, and
 * words about others.
 */
export const L1_DRILL: DrillStep[] = [
  l1Board({
    id: 's5.l1-do1',
    title: 'Check Ben’s two cases',
    body: [
      'We test Ben as a knave both times. Ben says, “The well is full.” Only the well changes.',
      'Mark Ben’s words true or false in each case: check them against the well. Then tap Holds or Crashes.',
    ],
    scene: L1_CONTRAST_SCENE,
    // Right after the contrast card (card 4): the Do for the distinction sits next to its See.
    afterCard: 3,
    rows: [benCase(true), benCase(false)],
    done: 'Right. Ben is a knave both times, with the same words. When the well is full, the words are true, so the case crashes. When it is not full, they are false, so the case holds.',
  }),
  l1Board({
    id: 's5.l1-do2',
    title: 'Check a fact and a test',
    body: [
      'The well is full: a fact. This is the board from the card “Check a case.” Fay’s case is already checked.',
      'Now we test Ada as a knight and Ben as a knave. Mark each one’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L1_WELL_SCENE,
    // Right after the card “Check a case” (card 5), so the Do sits next to its See.
    afterCard: 4,
    rows: [wellRow('Fay', true), wellRow('Ada'), wellRow('Ben')],
    done: 'Right. Ada’s case holds. Ben’s case crashes, so Ben can’t be a knave: true words come from a knight. Fay’s case crashed too, so Fay is a knave. The well never changed.',
  }),
  l1Board({
    id: 's5.l1-do3',
    title: 'Check every case',
    body: [
      'No one knows Cal’s kind, or if Cal can swim. So there are four cases. The first one is already checked.',
      'Mark Cal’s words true or false in each case. Then tap Holds or Crashes.',
    ],
    scene: L1_SWIM_SCENE,
    afterCard: 5,
    rows: [swimRow('knight', true, true), swimRow('knight', false), swimRow('knave', true), swimRow('knave', false)],
    done: 'Right. Two cases hold. In one, Cal is a knight who can swim. In the other, Cal is a knave who cannot swim. So you can’t tell if Cal can swim, or what kind Cal is.',
  }),
  l1Board({
    id: 's5.l1-do4',
    title: 'Words about others',
    body: [
      'Dee says, “Eli is a knave.” Dee and Eli can each be a knight or a knave, so there are four cases. The first one is already checked.',
      'Mark Dee’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L1_OTHERS_SCENE,
    afterCard: 6,
    // Every case, as on the Can't-tell board: a known kind leaves one case that holds, and an unknown one leaves two.
    rows: [othersRow('knave', 'knave', true), othersRow('knave', 'knight'), othersRow('knight', 'knight'), othersRow('knight', 'knave')],
    done: 'Right. Two cases hold. If Dee is a knave, Eli is a knight. If Dee is a knight, Eli is a knave. So when no one knows Dee’s kind, you can’t tell what Eli is.',
  }),
];

/** Lesson 2: Ben is a knave. Nobody could say "Ben and I are the same kind." */
export const L2_EXAMPLE: { partner: string; partnerKind: Kind; claim: Claim } = { partner: 'ben', partnerKind: 'knave', claim: { t: 'same', a: 'me', b: 'ben' } };
/** Ben's kind is given (a fact); the speaker's kind is only pretend, once as each kind. */
export const L2_SCENE: Scene = {
  kind: 'speakers',
  speakers: [{ id: ME, name: 'Someone', says: claimText(L2_EXAMPLE.claim, ME, (id) => (id === ME ? 'Someone' : nm(id)), 2) }],
  rule: PUZZLE_RULE,
  fact: 'Ben is a knave.',
  test: 'Pretend a knight says it. Then pretend a knave says it.',
};
/** The twin's board: the same words, and Ben is a knight now. */
export const L2_TWIN_SCENE: Scene = { ...L2_SCENE, fact: 'Ben is a knight.' };
const benRow = (benKind: Kind, k: Kind, given = false) => sayRow({ claim: L2_EXAMPLE.claim, partner: 'ben', partnerName: 'Ben', partnerKind: benKind, k, given });

const L2_ROWS = [benRow('knave', 'knight', true), benRow('knave', 'knave')];
const L2_TWIN_ROWS = [benRow('knight', 'knight'), benRow('knight', 'knave')];

/**
 * Test each kind on the card's board, in two steps (what the words would be, then what that kind needs: full
 * scaffold); then the twin where Ben is a knight (light).
 */
export const L2_DRILL: DrillStep[] = [
  {
    id: 's5.l2-do1',
    title: 'Test each kind',
    body: [
      'This is the board from the card “It can depend on others.” Ben is a knave. The knight is already checked.',
      '“I” is the speaker. Here we pretend the speaker is a knave. First mark what the words would be. Then say if a knave could say it.',
    ],
    scene: L2_SCENE,
    rows: L2_ROWS,
    distinction: KIND_VS_TRUTH.id,
    scaffold: 'full',
    words: SAY_WORDS,
    steps: boardSteps(L2_ROWS),
    misconceptions: kindMisconceptions(L2_ROWS),
    confused: sayConfused(),
    done: 'Right. A knight can’t say it, and a knave can’t say it. So no one could say it.',
  },
  {
    id: 's5.l2-do2',
    title: 'Now Ben is a knight',
    body: ['Test each kind again. First mark what the words would be. Then say if that kind could say it.'],
    scene: L2_TWIN_SCENE,
    twin: 'Ben is a knight now. The words are the same.',
    rows: L2_TWIN_ROWS,
    distinction: KIND_VS_TRUTH.id,
    scaffold: 'light',
    words: SAY_WORDS,
    misconceptions: kindMisconceptions(L2_TWIN_ROWS),
    confused: sayConfused(),
    done: 'Right. A knight could say it, and so could a knave. So either kind could say it. Who could say it can depend on others.',
  },
];

/** Lesson 3: two islanders. Only answer: Ava is a knight, Ben is a knave. */
export const L3_EXAMPLE: { ids: string[]; claims: Claims; answer: Record<string, Kind> } = {
  ids: ['ava', 'ben'],
  claims: { ava: { t: 'is', who: 'ben', kind: 'knave' }, ben: { t: 'same', a: 'ava', b: 'ben' } },
  answer: { ava: 'knight', ben: 'knave' },
};
export const L3_SCENE = speakersScene(L3_EXAMPLE.ids, L3_EXAMPLE.claims, nm, { rule: PUZZLE_RULE, test: 'We test a kind for Ava and for Ben.' });
/** The worked example's first card: inside the guess “Ava is a knave”, with the guess as the test-world banner. */
export const L3_GUESS_SCENE = speakersScene(L3_EXAMPLE.ids, L3_EXAMPLE.claims, nm, { rule: PUZZLE_RULE, test: 'Ava is a knave. This is a guess.' });
/** Its second card: Ben's words inside the guess and after the crash (guess vs known), from explainSolve. */
export const L3_CONTRAST_SCENE = guessContrastScene(L3_EXAMPLE.ids, L3_EXAMPLE.claims, L3_EXAMPLE.answer, nm);

/** Lesson 3's twin: Ava says "I am a knight." instead. Suppose Ava is a knight: Ben could be either kind. */
export const L3_TWIN: { ids: string[]; claims: Claims } = {
  ids: ['ava', 'ben'],
  claims: { ava: { t: 'is', who: 'ava', kind: 'knight' }, ben: { t: 'same', a: 'ava', b: 'ben' } },
};
export const L3_TWIN_SCENE = speakersScene(L3_TWIN.ids, L3_TWIN.claims, nm, { rule: PUZZLE_RULE, test: 'Ava is a knight. This is a guess.' });

const l3Row = (ava: Kind, ben: Kind, given = false) => caseRow({ ...L3_EXAMPLE, kinds: caseOf(L3_EXAMPLE.ids, ava, ben), nm, given, test: true });
const l3TwinRow = (ava: Kind, ben: Kind, given = false) => caseRow({ ...L3_TWIN, kinds: caseOf(L3_TWIN.ids, ava, ben), nm, given, test: true });

/** A case board after lesson 1: the stop's words, its mix-ups and "I’m confused". */
const caseBoard = (st: Omit<DrillStep, 'words' | 'misconceptions' | 'distinction'>): DrillStep => ({
  ...st,
  distinction: KIND_VS_TRUTH.id,
  words: CASE_WORDS,
  misconceptions: kindMisconceptions(st.rows),
});

/**
 * Sort the worked guess's lines into inside the guess and known (right after the guess-vs-known card); then every case
 * of the card's board, the card's guess shown; then a twin where a guess leaves two cases that hold.
 */
export const L3_DRILL: DrillStep[] = [
  guessSortDrill(L3_EXAMPLE.ids, L3_EXAMPLE.claims, L3_EXAMPLE.answer, nm, { id: 's5.l3-sort', afterCard: 4, scene: L3_CONTRAST_SCENE }),
  caseBoard({
    id: 's5.l3-do1',
    title: 'Check each case',
    body: [
      'This is the board from the card “Four possible answers.” Each row is one case. The first row is the guess from the worked example, already checked.',
      'Mark each islander’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L3_SCENE,
    afterCard: 5,
    rows: [l3Row('knave', 'knight', true), l3Row('knave', 'knave'), l3Row('knight', 'knight'), l3Row('knight', 'knave')],
    scaffold: 'full',
    confused: guessConfused(),
    done: 'Right. With Ava as a knave, the two cases crash, so that guess crashes. With Ava as a knight, only Ben as a knave holds.',
  }),
  caseBoard({
    id: 's5.l3-do2',
    title: 'When two cases hold',
    body: ['Ben’s words stay the same. Suppose Ava is a knight. Ben as a knight is already checked. Now check Ben as a knave.'],
    scene: L3_TWIN_SCENE,
    twin: 'Ava’s words changed. Now Ava says, “I am a knight.”',
    rows: [l3TwinRow('knight', 'knight', true), l3TwinRow('knight', 'knave')],
    scaffold: 'full',
    confused: guessConfused(),
    done: 'Right. With Ava as a knight, the two cases both hold. This guess holds, but you can’t tell what Ben is.',
  }),
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
export const L4_SCENE = speakersScene(L4_EXAMPLE.ids, L4_EXAMPLE.claims, nm, { rule: PUZZLE_RULE, test: 'We test a kind for each islander.' });
/** The worked example's first card: inside the guess “Ava is a knight”. */
export const L4_GUESS_SCENE = speakersScene(L4_EXAMPLE.ids, L4_EXAMPLE.claims, nm, { rule: PUZZLE_RULE, test: 'Ava is a knight. This is a guess.' });
/** Its second card: Cal's words inside the guess and after the crash, from explainSolve. */
export const L4_CONTRAST_SCENE = guessContrastScene(L4_EXAMPLE.ids, L4_EXAMPLE.claims, L4_EXAMPLE.answer, nm);

/** Lesson 4's strong clue: Ava says "At least one of us is a knave." Ben and Cal say nothing. */
export const L4_STRONG: { ids: string[]; claims: Claims } = {
  ids: ['ava', 'ben', 'cal'],
  claims: { ava: { t: 'count', op: 'atLeast', k: 1, kind: 'knave' } },
};
export const L4_STRONG_SCENE = speakersScene(L4_STRONG.ids, L4_STRONG.claims, nm, { rule: PUZZLE_RULE, test: 'We test a kind for each islander.' });

const strongRow = (ava: Kind, ben: Kind, cal: Kind, given = false) => caseRow({ ...L4_STRONG, kinds: caseOf(L4_STRONG.ids, ava, ben, cal), nm, given, test: true });
const l4Row = (ava: Kind, ben: Kind, cal: Kind, given = false) => caseRow({ ...L4_EXAMPLE, kinds: caseOf(L4_EXAMPLE.ids, ava, ben, cal), nm, given, test: true });

const L4_STRONG_ROWS = [
  strongRow('knave', 'knight', 'knight', true),
  strongRow('knave', 'knave', 'knave'),
  strongRow('knight', 'knight', 'knight'),
  strongRow('knight', 'knave', 'knight'),
];

/** The strong clue on card 2's board (“us” counts the speaker), then the worked example's board. */
export const L4_DRILL: DrillStep[] = [
  caseBoard({
    id: 's5.l4-do1',
    title: 'A strong clue',
    body: [
      'This is the board from the card “Start with a strong clue.” “Us” means Ava, Ben and Cal. Ben and Cal say nothing, so each one fits the rule as either kind.',
      'The first case is already checked. Mark Ava’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L4_STRONG_SCENE,
    rows: L4_STRONG_ROWS,
    scaffold: 'full',
    steps: boardSteps(L4_STRONG_ROWS),
    confused: truthConfused(),
    done: 'Right. Every case with Ava as a knave crashes. So Ava is a knight, and at least one of Ben and Cal is a knave.',
  }),
  caseBoard({
    id: 's5.l4-do2',
    title: 'Check your answer',
    body: [
      'This is the board from the card “Check your answer.” The first row is the guess from the worked example, already checked.',
      'Mark each islander’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L4_SCENE,
    rows: [l4Row('knight', 'knave', 'knight', true), l4Row('knave', 'knight', 'knave'), l4Row('knave', 'knight', 'knight')],
    scaffold: 'full',
    confused: guessConfused(),
    done: 'Right. Ava as a knave, Ben as a knight and Cal as a knave holds. That is the card’s answer. Change Cal, and the case crashes.',
  }),
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
/** Cal's kind is stated, so it is a fact; each case for Ava and Ben is a test. */
export const L5_AND_SCENE = speakersScene(['cal'], L5_AND.claims, nm, { rule: PUZZLE_RULE, fact: 'Cal is a knave.', test: 'We test each case for Ava and Ben.' });
export const L5_OR_SCENE = speakersScene(['cal'], L5_OR.claims, nm, { rule: PUZZLE_RULE, fact: 'Cal is a knave.', test: 'We test each case for Ava and Ben.' });

/** Lesson 5: Raj says "I am a knave and Vic is a knight." Only answer: Raj and Vic are both knaves. */
export const L5_EXAMPLE: { ids: string[]; claims: Claims; answer: Record<string, Kind> } = {
  ids: ['raj', 'vic'],
  claims: { raj: { t: 'and', cs: [{ t: 'is', who: 'raj', kind: 'knave' }, { t: 'is', who: 'vic', kind: 'knight' }] } },
  answer: { raj: 'knave', vic: 'knave' },
};
export const L5_SCENE = speakersScene(L5_EXAMPLE.ids, L5_EXAMPLE.claims, nm, { rule: PUZZLE_RULE, test: 'We test a kind for Raj and for Vic.' });

/** One of the four cases for Ava and Ben, with the knave Cal's words: kept or crossed out. */
const listRow = (ex: typeof L5_AND, ava: Kind, ben: Kind, given = false) =>
  caseRow({ ids: ex.ids, claims: ex.claims, kinds: { ...caseOf(['ava', 'ben'], ava, ben), [ex.speaker]: ex.kind }, nm, given, decide: 'keep', about: ['ava', 'ben'], test: true });
const rajRow = (raj: Kind, vic: Kind, given = false) => caseRow({ ...L5_EXAMPLE, kinds: caseOf(L5_EXAMPLE.ids, raj, vic), nm, given, test: true });

const L5_AND_ROWS = [listRow(L5_AND, 'knave', 'knave', true), listRow(L5_AND, 'knight', 'knight'), listRow(L5_AND, 'knight', 'knave'), listRow(L5_AND, 'knave', 'knight')];
const L5_OR_ROWS = [listRow(L5_OR, 'knight', 'knight', true), listRow(L5_OR, 'knight', 'knave'), listRow(L5_OR, 'knave', 'knight'), listRow(L5_OR, 'knave', 'knave')];
const L5_RAJ_ROWS = [rajRow('knave', 'knave', true), rajRow('knight', 'knight'), rajRow('knight', 'knave'), rajRow('knave', 'knight')];

/** List the cases for a knave's "and", then a knave's "or", each on its card's board; then the "I" card's board. */
export const L5_DRILL: DrillStep[] = [
  caseBoard({
    id: 's5.l5-do1',
    title: 'List the cases for “and”',
    body: [
      'Cal is a knave and says, “Ava and Ben are both knights.” Here are the four cases for Ava and Ben. One is already checked.',
      'Mark Cal’s words true or false. Keep a case only if the words fit a knave.',
    ],
    scene: L5_AND_SCENE,
    rows: L5_AND_ROWS,
    scaffold: 'full',
    steps: boardSteps(L5_AND_ROWS),
    confused: truthConfused(),
    done: 'Right. Three cases are left. So at least one of Ava and Ben is a knave. It could be just one.',
  }),
  caseBoard({
    id: 's5.l5-do2',
    title: 'List the cases for “or”',
    body: [
      'Cal is a knave and says, “Ava is a knight or Ben is a knight.” One case is already checked.',
      'Mark Cal’s words true or false. Keep a case only if the words fit a knave.',
    ],
    scene: L5_OR_SCENE,
    rows: L5_OR_ROWS,
    scaffold: 'full',
    steps: boardSteps(L5_OR_ROWS),
    confused: truthConfused(),
    done: 'Right. One case is left. Ava and Ben are both knaves.',
  }),
  caseBoard({
    id: 's5.l5-do3',
    title: 'When “I” is one part',
    body: [
      'Raj says, “I am a knave and Vic is a knight.” Vic says nothing. Each row is one case. The first one is already checked.',
      'Mark Raj’s words true or false. Then tap Holds or Crashes.',
    ],
    scene: L5_SCENE,
    rows: L5_RAJ_ROWS,
    scaffold: 'full',
    steps: boardSteps(L5_RAJ_ROWS),
    confused: truthConfused(),
    done: 'Right. Only the case where Raj and Vic are both knaves holds. That is the answer.',
  }),
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
    // Card 5's picture. ("I am a knight" and "I am a knave" have no other words, so their quizzes are new skins.)
    'Who could say, “Two plus two is four”?',
  ]),
};

/** A later lesson's reminder: kind vs truth, taught in lesson 1. */
const fromL1 = (d: Distinction): Distinction => ({ ...d, taughtIn: L1 });

// ---------- lessons ----------

const lessons: LessonDef[] = [
  {
    id: L1,
    title: 'Truth-tellers and liars',
    ideas: [
      {
        title: 'Riddle Island',
        body: [
          'On Riddle Island, every person is a knight or a knave. Knight or knave is an islander’s kind.',
          'A knight always tells the truth. So a knight’s words must be true.',
          'A knave always lies. So a knave’s words must be false.',
          'That is the rule. A knight with true words fits the rule. So does a knave with false words.',
          'Some puzzles have elves, wizards or islanders named A, B and C. The rules stay the same.',
        ],
      },
      {
        title: 'A knight’s words',
        scene: speakers([['Ada', 'I have a cat.']]),
        body: [
          'Ada is a knight. Ada says, “I have a cat.”',
          'A knight’s words must be true. So Ada has a cat.',
        ],
      },
      {
        title: 'A knave’s words',
        scene: speakers([['Ben', 'I have a dog.']]),
        body: [
          'Ben is a knave. Ben says, “I have a dog.”',
          'A knave’s words must be false. So Ben does not have a dog.',
          'Watch out for “not.” Say Ben tells you, “I do not have a cat.” Those words must be false too, so Ben has a cat.',
        ],
      },
      // The distinction before any case is checked: a tested kind says what the words must be, the case says what
      // they are. Its board (Ben's two cases) opens right after it.
      L1_CONTRAST,
      {
        title: 'Check a case',
        scene: L1_WELL_SCENE,
        body: [
          'On this board, the well is full. That is a fact, so it stays the same in every case here.',
          'Now we test a kind for each islander. Test: Fay is a knight. Fay says, “The well is not full.” The well is full, so Fay’s words are false.',
          'A knight’s words must be true. False words from a knight break the rule, so this case crashes.',
          'A crash shows the test is wrong, never the fact. So Fay can’t be a knight.',
        ],
      },
      {
        title: 'When you can’t tell',
        scene: L1_SWIM_SCENE,
        body: [
          'Cal says, “I can swim.” No one knows Cal’s kind, or if Cal can swim. Two things are unknown, and each can go two ways. So there are four cases.',
          'Test: Cal is a knight, and Cal can swim. The words say Cal can swim, and Cal can, so they are true. That fits a knight, so this case holds.',
          'Check the other cases the same way: the words first, then the kind.',
          'If two cases hold and give different answers, you can’t tell. That is a real answer. It is not giving up.',
        ],
      },
      {
        title: 'Words about others',
        scene: L1_OTHERS_SCENE,
        body: [
          'Islanders can talk about each other too. Dee says, “Eli is a knave.” Dee and Eli can each be a knight or a knave.',
          'Test: Dee is a knave, and Eli is a knave. The words say Eli is a knave, and Eli is one, so they are true. A knave’s words must be false, so this case crashes.',
          'Test: Dee is a knave, and Eli is a knight. Now the words are false. That fits a knave, so this case holds.',
          'So if Dee is a knave, Eli is a knight. It works the other way too: true words come from a knight, and false words from a knave.',
        ],
      },
    ],
    drill: L1_DRILL,
    distinctions: [KIND_VS_TRUTH],
    // Try 1 is a twin of the well board: a stated kind and words about a fact. Try 2 is a knave's "not". Try 3 is a
    // twin of the swim board (Can't tell). Try 4 is words about others, or the speaker's kind from a known fact.
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
    // Mastery of a fact vs a test: a stated knave's "not" (try 2, in every pack) right on the first try.
    pass: { firstTry: 3, include: [{ tag: KNAVE_NOT, label: 'a knave’s “not” about a fact' }] },
  },
  {
    id: L2,
    title: 'What nobody can say',
    ideas: [
      {
        title: 'Test each kind',
        body: [
          'Could a knight say a sentence? Could a knave? Test each kind in two steps.',
          'Step 1: pretend a knave says it. Work out if the words would be true. “I” now means that knave.',
          'Step 2: a knave’s words must be false. If step 1 gives false, a knave could say it. If it gives true, a knave can’t.',
          'Then do the same for a knight. A knight’s words must be true.',
        ],
      },
      {
        title: 'Remember: two different things',
        distinction: KIND_VS_TRUTH.id,
        body: [
          'What the words would be and what a kind needs are two different things.',
          'The kind only says what the words must be. Whether they would be true comes from what they say. So work out the words first. Then compare.',
        ],
      },
      {
        title: 'Try “I am a knight.”',
        scene: speakers([['Someone', 'I am a knight.']]),
        body: [
          'From a knight, “I am a knight” would be true. A knight’s words must be true, so that works.',
          'From a knave, it would be false, since a knave is not a knight. A knave’s words must be false, so that works too.',
          'So either kind could say it. These words don’t tell you who is who.',
        ],
      },
      {
        title: 'Try “I am a knave.”',
        scene: speakers([['Someone', 'I am a knave.']]),
        body: [
          'From a knight, “I am a knave” would be false. A knight’s words must be true, so a knight can’t say it.',
          'From a knave, it would be true. A knave’s words must be false, so a knave can’t say it either.',
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
          'Now compare. A knight’s words must be true, so a knight can’t say it. A knave’s words must be false, so a knave can’t say it. So no one could say it.',
        ],
      },
    ],
    drill: L2_DRILL,
    distinctions: [fromL1(KIND_VS_TRUTH)],
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
        title: 'Suppose',
        body: [
          'Now you will find out who is a knight and who is a knave. Each islander could be either kind. Their words are your clues.',
          'To suppose means to pretend something is true, just to test it. Pick one islander. Suppose that one is a knight or a knave. That is your guess.',
          'Then follow what it means, one step at a time.',
        ],
      },
      {
        title: 'Remember: two different things',
        distinction: KIND_VS_TRUTH.id,
        body: [
          'In a guess, a kind says what the words must be. It does not make them true or false.',
          'So at each step, check what the words say against the kinds in the guess. Then compare with what the kind needs.',
          'When words must be false, what they say is not so. That is the NOT flip from Stop 1.',
        ],
      },
      {
        title: 'Crash!',
        body: [
          'Your guess crashes if there is no way to make it work. Someone always ends up breaking the rule.',
          'Breaking the rule means a knight’s words come out false, or a knave’s words come out true.',
          'When a guess crashes, throw away everything you found inside it. Keep only this: the islander you picked is the other kind.',
        ],
      },
      {
        title: 'Inside the guess',
        scene: L3_GUESS_SCENE,
        body: [
          'Suppose Ava is a knave. That is a guess, so everything we find now is inside the guess.',
          'Need: Ava’s words must be false. Says: Ben is a knave. So: false means Ben is a knight, inside the guess.',
          'Need: Ben is a knight, so Ben’s words must be true. Says: Ava and Ben are the same kind. But inside the guess they are different kinds, so the words are false. The guess crashes!',
        ],
      },
      {
        title: 'After the crash',
        distinction: GUESS_VS_KNOWN.id,
        scene: L3_CONTRAST_SCENE,
        body: [
          'The guess crashed, so throw it away, and everything inside it. Now we know: Ava is a knight.',
          'Need: Ava’s words must be true. Says: Ben is a knave. So: Ben is a knave. This is known.',
          'Check Ben: Ben’s words must be false. Ava and Ben are different kinds, so the words are false. Everyone fits, so this case holds.',
          'Ben was a knight inside the guess. Now Ben is a knave. That is fine: the first was only pretend.',
        ],
      },
      {
        title: 'Four possible answers',
        scene: L3_SCENE,
        body: [
          'A guess can also hold. Then list the cases: keep the guess, and try the other islander as a knight, then as a knave.',
          'Each of those is a case: one full way things could be. If just one case holds, you know what the other islander must be.',
          'If the two cases both hold, you can’t tell. If they both crash, your guess crashes.',
          'Following a guess is a short way to list the cases. With Ava as a knight, “So Ben is a knave” means the case with Ben as a knight crashes. On the board, each row is one case.',
        ],
      },
    ],
    drill: L3_DRILL,
    distinctions: [fromL1(KIND_VS_TRUTH), GUESS_VS_KNOWN],
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
          '“Us” means every islander in the puzzle, the speaker too. So “Exactly one of us is a knight” counts all three.',
        ],
      },
      {
        title: 'Start with a strong clue',
        scene: L4_STRONG_SCENE,
        body: [
          'Some words tell you a lot right away. Ava says, “At least one of us is a knave.” Ben and Cal say nothing.',
          'Test Ava as a knave. Ava counts too, so the words are true. A knave’s words must be false, so that case crashes.',
          'So Ava must be a knight. And at least one of Ben and Cal is a knave.',
        ],
      },
      {
        title: 'Remember: two different things',
        distinction: KIND_VS_TRUTH.id,
        body: [
          'A kind says what the words must be. Whether the words are true comes from the case.',
          'With three islanders, check each speaker’s words against the whole case. Then compare with that speaker’s kind.',
        ],
      },
      {
        title: 'Inside the guess',
        scene: L4_GUESS_SCENE,
        body: [
          'Suppose Ava is a knight. Everything we find now is inside the guess.',
          'Need: Ava’s words must be true. Says: Ben is a knave. So: Ben is a knave, inside the guess.',
          'Need: Ben’s words must be false. Says: Cal is a knave. So: false means Cal is a knight, inside the guess.',
          'Need: Cal’s words must be true. Says: Ava and Ben are the same kind. But inside the guess they are different kinds. The guess crashes!',
        ],
      },
      {
        title: 'After the crash',
        distinction: GUESS_VS_KNOWN.id,
        scene: L4_CONTRAST_SCENE,
        body: [
          'The guess crashed, so throw it away, and everything inside it. Now we know: Ava is a knave.',
          'Need: Ava’s words must be false. Says: Ben is a knave. So: false means Ben is a knight.',
          'Need: Ben’s words must be true. Says: Cal is a knave. So: Cal is a knave.',
          'Ben and Cal both flip. That is fine: the first ones were only pretend.',
        ],
      },
      {
        title: 'Check your answer',
        scene: L4_SCENE,
        body: [
          'When you think you have it, check each islander.',
          'A knight’s words must be true. A knave’s words must be false. Check what each one’s words say against your answer. If each one fits, you are done.',
        ],
      },
    ],
    drill: L4_DRILL,
    distinctions: [fromL1(KIND_VS_TRUTH), { ...GUESS_VS_KNOWN, taughtIn: L3 }],
    // Three puzzles. The first one's worked guess flips two kinds or more after the crash, like the card's.
    practice: (rng) => {
      const skins = practiceSkins(rng, 3);
      const make = (skin: SkinId, i: number) => () => puzzleItem(rng, { id: `l4-${i + 1}`, skin, n: 3, pool: PUZZLE_POOL[L4], lesson: L4, skill: 's5.three' }).item;
      const flips = (skin: SkinId) => () => {
        let it = make(skin, 0)();
        for (let t = 0; t < 60 && !it.tags?.includes(GUESS_FLIPS); t++) it = make(skin, 0)();
        return it;
      };
      return distinct([flips(skins[0]), ...skins.slice(1).map((skin, i) => make(skin, i + 1))]);
    },
    // Mastery of guess vs known: a puzzle where kinds flip after the crash, right on the first try.
    pass: { firstTry: 3, include: [{ tag: GUESS_FLIPS, label: 'a puzzle where two kinds flip after the crash' }] },
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
          'A knave’s words must be false. But that does not mean Ava and Ben are both knaves.',
          'An “and” sentence is false when at least one part is false. So at least one of Ava and Ben is a knave. It could be just one.',
        ],
      },
      {
        title: 'A knave’s “or”',
        scene: L5_OR_SCENE,
        body: [
          'Cal is a knave. Cal says, “Ava is a knight or Ben is a knight.” So Cal’s words must be false.',
          'An “or” sentence is false only when both parts are false.',
          'So Ava is not a knight, and Ben is not a knight. Ava and Ben are both knaves.',
        ],
      },
      {
        title: 'A knight’s “or”',
        scene: speakers([['Dee', 'Ava is a knight or Ben is a knight.']]),
        body: [
          'Now say Dee is a knight. Dee says, “Ava is a knight or Ben is a knight.”',
          'A knight’s words must be true. So at least one of Ava and Ben is a knight. Maybe Ava and Ben both are.',
          'Remember: in logic, “or” includes the case where both parts are true.',
        ],
      },
      {
        title: 'Remember: two different things',
        distinction: KIND_VS_TRUTH.id,
        body: [
          'Cal’s kind says what the words must be: false. It does not say which case is real.',
          'In each case, check what the words say against that case first. Then keep the case only if the words fit Cal’s kind.',
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
    distinctions: [fromL1(KIND_VS_TRUTH)],
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
