/**
 * Stop 1 · True or False?
 * A statement is true or false. Without enough clues, the honest answer is "can't tell yet".
 *
 *  l1 What is a statement?   sentence bank (true, false, unknown, question, command, opinion, feeling)
 *  l2 True, false or can't tell   rows of shape cards with some face down (engine: statements.ts)
 *  l3 The NOT flip           pick the NOT: true whenever the statement is false (engine: statements.ts, checked row by row)
 *  l4 Treasure signs         three boxes, signs and the rule "exactly one sign is true" (engine: signs.ts)
 *  l5 Every sign is false    the same check, no true sign
 *  l6 Exactly two signs are true
 *  l7 The owner’s sign       the sign on the treasure box is the only true one
 *
 * Every lesson is taught See -> Do -> Quiz (the skill-drill handoff): a key-idea card with a case already marked,
 * a guided board the learner marks by taps (LessonDef.drill), then quiz items of only the rule family those taught.
 */
import { syncWhyWrong } from '../engine/teach';
import type { Choice, ChoiceFeedback, ChooseItem, DrillRow, DrillStep, Item, LessonDef, Rng, Scene, StopDef, TeachCase, Thing, Truth } from '../engine/types';
import {
  FRAMES,
  NOT_COMPARE_KEYS,
  NOT_CONFLICT_KEYS,
  NOT_TAGS,
  notDrillRow,
  notItem,
  rowItem,
  verdictDrillRow,
  type Desc,
  type Frame,
  type ItemCore,
  type Made,
  type NotKey,
  type RowTemplate,
  type Stmt,
  type Verdict,
} from '../engine/puzzles/statements';
import {
  SIGN_RULES,
  SIGN_SKINS,
  signBoxes,
  signCaseNote,
  signConclusion,
  signDrill,
  signItem,
  signTwins,
  signWords,
  trueSigns,
  type Sign,
  type SignPuzzle,
  type SignRule,
  type SignSkin,
} from '../engine/puzzles/signs';

const STOP = 1;

const finish = (m: Made, id: string, lesson: string): ChooseItem => ({
  id,
  stop: STOP,
  lesson,
  skill: `s${STOP}.${m.tag}`,
  ...m.item,
});

/**
 * Makes the items of one set (a check or a lesson practice). No two items in a set share a prompt and
 * scene: a repeat is thrown away and made again from the same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => Made) => Made {
  const seen = new Set<string>();
  return (make) => {
    let m = make();
    for (let tries = 0; tries < 50 && seen.has(itemKey(m)); tries++) m = make();
    seen.add(itemKey(m));
    return m;
  };
}
const itemKey = (m: Made) => JSON.stringify([m.item.prompt, m.item.scene ?? null]);

// ---------- lesson 1: the sentence bank ----------

/** true / false: a statement you can check. unknown: a statement nobody here can check, but it is still true or false. */
export type SentenceKind = 'true' | 'false' | 'unknown' | 'question' | 'command' | 'opinion' | 'feeling';
type Skin = 'everyday' | 'fantasy' | 'abstract';
interface Sentence {
  text: string;
  kind: SentenceKind;
  skin: Skin;
}

const S = (skin: Skin, kind: SentenceKind, ...texts: string[]): Sentence[] => texts.map((text) => ({ text, kind, skin }));

export const SENTENCES: readonly Sentence[] = [
  ...S('everyday', 'true', 'A week has seven days.', 'Fish live in water.', 'Ten is more than seven.', 'Ice is frozen water.', 'Birds have feathers.', 'An hour has sixty minutes.'),
  ...S('everyday', 'false', 'A week has ten days.', 'Cats can fly.', 'Snow is hot.', 'Fish live in trees.', 'Dogs have six legs.', 'The sun is cold.'),
  ...S('everyday', 'unknown', 'My aunt has a red car.', 'Our bus is late today.', 'Jada got a new bike.'),
  ...S('everyday', 'question', 'Is it raining outside?', 'What time is lunch?', 'Do you like soup?', 'Where are my shoes?', 'Can dogs swim?'),
  ...S('everyday', 'command', 'Close the door.', 'Please pass the salt.', 'Put on your shoes.', 'Clean your room.', 'Wash your hands.'),
  ...S('everyday', 'opinion', 'Pizza is the best food.', 'Soccer is more fun than chess.', 'Summer is the best season.', 'Broccoli tastes gross.', 'That song is great.'),
  ...S('everyday', 'feeling', 'Wow!', 'Oh no!', 'Yay!', 'Ouch!'),
  ...S('fantasy', 'false', 'Dragons are real animals.', 'You can buy a real unicorn at the pet store.'),
  ...S('fantasy', 'unknown', 'The wizard has a blue hat.', 'The dragon sleeps in a cave.', 'The castle has four towers.', 'The elf is older than the troll.', 'The wizard has twelve cats.'),
  ...S('fantasy', 'question', 'Where does the dragon sleep?', 'Is the wizard at home?', 'Who took the gold?'),
  ...S('fantasy', 'command', 'Open the magic door.', 'Give the troll a coin.', 'Follow the fairy.'),
  ...S('fantasy', 'opinion', 'Unicorns are the prettiest animals.', 'The wizard’s hat is ugly.', 'Dragons are cooler than elves.'),
  ...S('fantasy', 'feeling', 'Hooray for the brave knight!'),
  ...S('abstract', 'true', 'Two plus two is four.', 'A triangle has three sides.', 'The letter B comes after A.', 'Seven is an odd number.', 'A square has four sides.'),
  ...S('abstract', 'false', 'Five is less than two.', 'A square has three sides.', 'Three plus three is seven.', 'The letter Z comes before A.'),
  ...S('abstract', 'question', 'Is seven an odd number?', 'How many sides does a square have?', 'What comes after the letter C?'),
  ...S('abstract', 'command', 'Draw a circle.', 'Add five and six.', 'Write the letter Q.'),
  ...S('abstract', 'opinion', 'Circles are prettier than squares.', 'Q is the coolest letter.', 'Eight is a lucky number.'),
];

const STATEMENT_KINDS: readonly SentenceKind[] = ['true', 'false', 'unknown'];
const NOT_STATEMENT_KINDS: readonly SentenceKind[] = ['question', 'command', 'opinion', 'feeling'];
export const isStatement = (k: SentenceKind) => STATEMENT_KINDS.includes(k);

/**
 * The sentences already shown in one set of items. Lesson 1 items draw from the bank without
 * replacement, so no sentence shows up twice in a check or a practice set.
 */
type Used = Set<string>;

/** Unused sentences of these kinds, from this skin if it has any left, else from every skin. */
function pool(skin: Skin, kinds: readonly SentenceKind[], used: Used): Sentence[] {
  const fresh = SENTENCES.filter((s) => kinds.includes(s.kind) && !used.has(s.text));
  const mine = fresh.filter((s) => s.skin === skin);
  if (mine.length) return mine;
  if (fresh.length) return fresh;
  throw new Error(`stop 1: no unused ${kinds.join('/')} sentences left`);
}

/** Draw one sentence and mark it used. */
function draw(rng: Rng, skin: Skin, kinds: readonly SentenceKind[], used: Used): Sentence {
  const s = rng.pick(pool(skin, kinds, used));
  used.add(s.text);
  return s;
}

/** Draw n sentences, of different kinds when asked. */
function pickDistinct(rng: Rng, skin: Skin, kinds: readonly SentenceKind[], n: number, differentKinds: boolean, used: Used): Sentence[] {
  const order = rng.shuffle(kinds);
  return Array.from({ length: n }, (_, i) => draw(rng, skin, [differentKinds ? order[i % order.length] : rng.pick(kinds)], used));
}

const q = (s: Sentence) => `“${s.text.replace(/\.$/, '')}”`;

/** Why a sentence is or is not a statement. */
function whatItIs(s: Sentence): string {
  switch (s.kind) {
    case 'true': return `${q(s)} is true. So it is a statement.`;
    case 'false': return `${q(s)} is false. But a false sentence is still a statement.`;
    case 'unknown': return `You can’t check “${s.text}” But it must be true or false, so it is a statement.`;
    case 'question': return `${q(s)} is a question. It asks something, so it is not true or false.`;
    case 'command': return `${q(s)} is a command. It tells someone what to do. It is not true or false.`;
    case 'opinion': return `${q(s)} is an opinion. People can feel different ways about it. So it is not a statement.`;
    case 'feeling': return `${q(s)} shows a feeling. It is not true or false.`;
  }
}

// ---------- lesson 1: teaching after a wrong answer ----------

/** Worked examples for the explanations. None is in the bank, so an explanation never answers a later question. */
export const TEACH_SENTENCES: Record<SentenceKind, Sentence> = {
  true: { text: 'Two plus three is five.', kind: 'true', skin: 'abstract' },
  false: { text: 'Snow is purple.', kind: 'false', skin: 'everyday' },
  unknown: { text: 'The giant has a pet goat.', kind: 'unknown', skin: 'fantasy' },
  question: { text: 'Is the door open?', kind: 'question', skin: 'everyday' },
  command: { text: 'Sit down.', kind: 'command', skin: 'everyday' },
  opinion: { text: 'Red is the best color.', kind: 'opinion', skin: 'everyday' },
  feeling: { text: 'Hooray!', kind: 'feeling', skin: 'everyday' },
};

/** A short, fixed id made from the sentence's words, so feedback stays tied to its choice however the choices are shuffled. */
export const sentenceId = (text: string) =>
  text.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean).slice(0, 6).join('-');

export const L1_RULE = 'A statement is a sentence that must be true or false. It does not have to be true.';
const L1_ASK = 'Ask: “Could this sentence be true or false?”';
const STATEMENT_TERM = { word: 'A statement', meaning: 'a sentence that is either true or false.' };
const KIND_TERM: Partial<Record<SentenceKind, { word: string; meaning: string }>> = {
  opinion: { word: 'An opinion', meaning: 'what someone thinks or likes. People can disagree about it, and nobody is wrong.' },
  feeling: { word: 'An exclamation', meaning: 'a short cry that shows a strong feeling, like “Wow!”' },
  false: { word: 'False', meaning: 'not true. A false sentence says something about the world, but it is wrong.' },
  command: { word: 'A command', meaning: 'a sentence that tells someone what to do.' },
  question: { word: 'A question', meaning: 'a sentence that asks something.' },
};
/** The harder words first. Statement is always defined; at most two more. */
const TERM_ORDER: readonly SentenceKind[] = ['opinion', 'feeling', 'false', 'command', 'question'];
/**
 * Statement, then the word for the asked sentence's own kind (its headline uses it), then the hardest of the others.
 * At most three words.
 */
const l1Terms = (kinds: readonly SentenceKind[], own?: SentenceKind) => {
  const order = own && KIND_TERM[own] ? [own, ...TERM_ORDER.filter((k) => k !== own)] : TERM_ORDER;
  return [STATEMENT_TERM, ...order.filter((k) => k === own || kinds.includes(k)).slice(0, 2).map((k) => KIND_TERM[k]!)];
};

/**
 * What the sentence does. A statement says something about the world (rightly or wrongly); the other kinds do not.
 * ("Says how things are, but it is wrong" read as a contradiction, so the words are "something about the world".)
 */
function says(s: Sentence): string {
  const Q = q(s);
  switch (s.kind) {
    case 'true': return `${Q} says something about the world, and it is right. So it is true.`;
    case 'false': return `${Q} says something about the world, but it is wrong. So it is false.`;
    case 'unknown': return `${Q} says something about the world. Nobody here can check it, but it is right or wrong.`;
    case 'question': return `${Q} asks something. It does not say how things are.`;
    case 'command': return `${Q} tells someone what to do. It does not say how things are.`;
    case 'opinion': return `${Q} tells what someone thinks or likes. People can disagree, and nobody is wrong.`;
    case 'feeling': return `${Q} shows a feeling. It does not say how things are.`;
  }
}

const KIND_NOTE: Record<SentenceKind, string> = {
  true: 'It is true, so it is a statement.',
  false: 'It is false, but it is still a statement.',
  unknown: 'Nobody here can check it. But it must be true or false.',
  question: 'It asks something. It can’t be true or false.',
  command: 'It tells someone what to do. It can’t be true or false.',
  opinion: 'People can disagree about it, and nobody is wrong. It is not a statement.',
  feeling: 'It shows a feeling. It can’t be true or false.',
};

/**
 * A sentence as a worked case: whether it is true (for a statement you can check) and whether it is a statement.
 * Both come from the sentence's label in the bank, the same label that sets the item's answer.
 */
export function sentenceCase(s: Sentence): TeachCase {
  const truths: Truth[] = [];
  if (s.kind === 'true' || s.kind === 'false') truths.push({ who: 'The sentence', value: s.kind === 'true' });
  truths.push({ who: 'It is a statement', value: isStatement(s.kind) });
  return { label: `“${s.text}”`, truths, note: KIND_NOTE[s.kind] };
}

/** Why the answer's call on this sentence is wrong (the line after says()). */
const WHY_IS: Record<SentenceKind, string> = {
  true: 'A statement is any sentence that is true or false. This one is true, so it is a statement.',
  false: 'A statement does not have to be true. It only has to be true or false. So a false sentence is still a statement.',
  unknown: 'You do not need to know the answer. It must be true or false, so it is a statement.',
  question: 'A question can’t be true or false, so it is not a statement.',
  command: 'Doing it or not doing it does not make the sentence true or false. So it is not a statement.',
  opinion: 'In logic, we do not count an opinion as a statement.',
  feeling: 'An exclamation can’t be true or false, so it is not a statement.',
};

/** "Is this sentence a statement?": the headline for the wrong answer, by the sentence's kind. */
const HEAD_IS: Record<SentenceKind, string> = {
  true: 'Your answer says a true sentence is not a statement.',
  false: 'Your answer says a false sentence is not a statement.',
  unknown: 'Your answer says a sentence nobody can check is not a statement.',
  question: 'Your answer calls a question a statement.',
  command: 'Your answer calls a command a statement.',
  opinion: 'Your answer calls an opinion a statement.',
  feeling: 'Your answer calls an exclamation a statement.',
};

/** "Which of these is (not) a statement?": the headline for picking a sentence of this kind. */
const HEAD_WHICH: Record<SentenceKind, string> = {
  true: 'Your answer is a true sentence, so it is a statement.',
  // Not "Your answer is false": that reads as "you are wrong". The answer is a sentence that is false.
  false: 'Your answer is a false sentence, and a false sentence is still a statement.',
  unknown: 'Your answer is a statement, even though nobody here can check it.',
  question: 'Your answer is a question, not a statement.',
  command: 'Your answer is a command, not a statement.',
  opinion: 'Your answer is an opinion, not a statement.',
  feeling: 'Your answer is an exclamation, not a statement.',
};

const KIND_REMEMBER: Record<SentenceKind, string> = {
  true: 'Any sentence that is true or false is a statement.',
  false: 'A false sentence is still a statement.',
  unknown: 'You do not need to know the answer. It just has to be true or false.',
  // Only words this item defines: its own kind's word is always among its terms.
  question: 'A question asks something. It can’t be true or false, so it is not a statement.',
  command: 'A command tells someone what to do. It can’t be true or false, so it is not a statement.',
  opinion: 'An opinion is not a statement. People can disagree, and nobody is wrong.',
  feeling: 'An exclamation shows a feeling. It can’t be true or false, so it is not a statement.',
};

/** The smallest worked example for each kind, on a sentence from TEACH_SENTENCES. */
const KIND_SIMPLER: Record<SentenceKind, string[]> = {
  true: ['Think of “Two plus three is five.”', 'Can you say “That is true” or “That is false” about it? Yes: it is true.', 'So it is a statement.'],
  false: ['Think of “Snow is purple.”', 'Can you say “That is true” or “That is false” about it? Yes: it is false. Snow is white.', 'False is fine. So it is a statement.'],
  unknown: ['Think of “The giant has a pet goat.”', 'You can’t check it. But the giant has a goat, or the giant does not.', 'So it is true or false, even if you don’t know which. It is a statement.'],
  question: ['Think of “Is the door open?”', 'Can you say “That is true” about it? No. It asks something.', 'So it is not a statement.'],
  command: ['Think of “Sit down.”', 'Can you say “That is true” about it? No. It tells you to do something.', 'So it is not a statement.'],
  opinion: ['Think of “Red is the best color.”', 'Ann says, “That is true.” Ben says, “That is false.”', 'Nobody is wrong. Each one says what they like. So it is an opinion, not a statement.'],
  feeling: ['Think of “Hooray!”', 'Can you say “That is true” about it? No. It only shows a feeling.', 'So it is not a statement.'],
};

/** For "Is this a statement?": two sentences on the other side of the line, so the cases show every way it can go. */
const CONTRAST: Record<SentenceKind, [SentenceKind, SentenceKind]> = {
  true: ['false', 'question'],
  false: ['true', 'opinion'],
  unknown: ['false', 'opinion'],
  question: ['false', 'command'],
  command: ['false', 'question'],
  opinion: ['false', 'unknown'],
  feeling: ['false', 'question'],
};

const L1_CASES_TITLE = 'Can each sentence be true or false?';
/** The hint shows one sentence already sorted (its case card), then asks the question to ask of this one. */
const L1_HINT = 'Here is one sentence, already sorted. Ask the same question about yours: could it be true or false?';

/** "Is this sentence a statement?" */
function isThisItem(rng: Rng, skin: Skin, used: Used, kinds?: readonly SentenceKind[]): Made {
  const kind = rng.pick(kinds ?? [...STATEMENT_KINDS, ...NOT_STATEMENT_KINDS]);
  const s = draw(rng, skin, [kind], used);
  const yes = isStatement(s.kind);
  const others = CONTRAST[s.kind];
  const item: ItemCore = {
    kind: 'choose',
    prompt: 'Is this sentence a statement?',
    scene: { kind: 'text', lines: [s.text] },
    choices: [
      { id: 'yes', label: 'A statement' },
      { id: 'no', label: 'Not a statement' },
    ],
    answer: yes ? 'yes' : 'no',
    explain: whatItIs(s),
    feedback: {
      [yes ? 'no' : 'yes']: { headline: HEAD_IS[s.kind], detail: [says(s), WHY_IS[s.kind]], example: sentenceCase(s) },
    },
    hint: L1_HINT,
    // A teaching sentence of the same kind, never one from the bank, so the hint never shows a quiz sentence.
    hintCase: sentenceCase(TEACH_SENTENCES[s.kind]),
    // The pass rule asks for a false sentence and a sentence that is not a statement.
    tags: [s.kind === 'false' ? 'false-statement' : yes ? 'statement' : 'not-statement'],
    teach: {
      rule: L1_RULE,
      terms: l1Terms([s.kind, ...others], s.kind),
      meaning: says(s),
      casesTitle: L1_CASES_TITLE,
      cases: [s, ...others.map((k) => TEACH_SENTENCES[k])].map(sentenceCase),
      remember: [KIND_REMEMBER[s.kind], L1_ASK],
      simpler: KIND_SIMPLER[s.kind],
    },
  };
  syncWhyWrong(item);
  if (s.kind === 'false') item.conflict = true;
  const tag = s.kind === 'false' ? 'false-is-statement' : s.kind === 'opinion' ? 'opinion' : yes ? 'statement' : 'not-statement';
  return { tag, item };
}

/** "Which of these is a statement?" (one statement) or "... is not a statement?" (one non-statement). */
function whichItem(rng: Rng, skin: Skin, used: Used, findStatement: boolean): Made {
  const others = rng.int(2, 3);
  const target = draw(rng, skin, findStatement ? STATEMENT_KINDS : NOT_STATEMENT_KINDS, used);
  const rest = pickDistinct(rng, skin, findStatement ? NOT_STATEMENT_KINDS : STATEMENT_KINDS, others, findStatement, used);
  const all = rng.shuffle([target, ...rest]);
  const choices: Choice[] = all.map((s) => ({ id: sentenceId(s.text), label: s.text }));
  const feedback: Record<string, ChoiceFeedback> = {};
  const which = findStatement ? 'The statement here is' : 'The sentence that is not a statement is';
  for (const s of all) {
    if (s === target) continue;
    feedback[sentenceId(s.text)] = {
      headline: HEAD_WHICH[s.kind],
      detail: [says(s), WHY_IS[s.kind], `${which} “${target.text}” ${KIND_NOTE[target.kind]}`],
      example: sentenceCase(s),
      simpler: KIND_SIMPLER[s.kind],
    };
  }
  const explain = findStatement
    ? `${whatItIs(target)} The other sentences can’t be true or false.`
    : `${whatItIs(target)} The other sentences are all statements.`;
  const item: ItemCore = {
    kind: 'choose',
    prompt: findStatement ? 'Which of these is a statement?' : 'Which of these is not a statement?',
    choices,
    answer: sentenceId(target.text),
    explain,
    feedback,
    hint: `Here is one of these sentences, already sorted. Sort the others the same way. Only one ${findStatement ? 'can' : 'can’t'} be true or false.`,
    // One of the other sentences, already sorted: never the answer.
    hintCase: sentenceCase(all.find((x) => x !== target)!),
    tags: ['which'],
    teach: {
      rule: L1_RULE,
      terms: l1Terms(all.map((s) => s.kind)),
      meaning: findStatement
        ? 'Only one of these sentences can be true or false. That one is the statement.'
        : 'Only one of these sentences can’t be true or false. That one is not a statement.',
      casesTitle: L1_CASES_TITLE,
      cases: all.map(sentenceCase),
      remember: [findStatement ? 'Only a statement can be true or false.' : 'True sentences, false sentences and sentences you can’t check are all statements.', L1_ASK],
      simpler: KIND_SIMPLER[target.kind],
    },
  };
  syncWhyWrong(item);
  if (all.some((s) => s.kind === 'false')) item.conflict = true;
  return { tag: findStatement ? 'which-statement' : 'which-not-statement', item };
}

const SKINS: readonly Skin[] = ['everyday', 'fantasy', 'abstract'];

/** The worked example on the last key-idea card: four sentences from the cards, sorted. */
export const L1_EXAMPLE: readonly Sentence[] = [
  { text: 'A week has seven days.', kind: 'true', skin: 'everyday' },
  { text: 'Cats can fly.', kind: 'false', skin: 'everyday' },
  { text: 'Is it raining?', kind: 'question', skin: 'everyday' },
  { text: 'Pizza is the best food.', kind: 'opinion', skin: 'everyday' },
];

/** The Do: new sentences the learner sorts (the handoff's moon pair, and an opinion). None is in the bank. */
export const L1_DO: readonly Sentence[] = [
  { text: 'The moon is made of cheese.', kind: 'false', skin: 'everyday' },
  { text: 'Is the moon made of cheese?', kind: 'question', skin: 'everyday' },
  { text: 'The moon is the prettiest thing in the sky.', kind: 'opinion', skin: 'everyday' },
];

/**
 * Every sentence the lesson 1 cards and board show (and a near twin of one). Quizzes, the check, the Arcade and
 * new examples never ask about them: the quiz uses new sentences.
 */
export const L1_SHOWN: readonly string[] = [
  ...L1_EXAMPLE.map((s) => s.text),
  'Close the door.', 'Wow!', 'The wizard has twelve cats.', 'Is it raining outside?',
  ...L1_DO.map((s) => s.text),
];
const shownL1 = (): Used => new Set(L1_SHOWN);

/**
 * Sorted sentences as a board: is each one true, and is it a statement? A sentence that can't be true or false has
 * a blank True box. Both marks come from the sentence's label, the same label that sets a quiz item's answer.
 */
export function sortedScene(ss: readonly Sentence[]): Scene {
  const marks: Record<string, Record<string, 'yes' | 'no'>> = {};
  for (const s of ss) {
    const m: Record<string, 'yes' | 'no'> = {};
    if (s.kind === 'true' || s.kind === 'false') m.true = s.kind === 'true' ? 'yes' : 'no';
    m.statement = isStatement(s.kind) ? 'yes' : 'no';
    marks[sentenceId(s.text)] = m;
  }
  return {
    kind: 'grid',
    rows: ss.map((s) => ({ id: sentenceId(s.text), label: `“${s.text}”` })),
    cols: [{ id: 'true', label: 'True' }, { id: 'statement', label: 'A statement' }],
    marks,
    caption: 'A blank True box means the sentence can’t be true or false.',
  };
}

const STATEMENT_CHOICES = [{ id: 'yes', label: 'A statement' }, { id: 'no', label: 'Not a statement' }];

/**
 * One sentence on a guided board: the learner taps A statement or Not a statement (the quiz's own choices). The
 * right mark comes from the sentence's label; a wrong mark gets what the sentence does and why that decides it.
 */
export function sentenceRow(s: Sentence, given = false): DrillRow {
  const yes = isStatement(s.kind);
  const id = sentenceId(s.text);
  return {
    id,
    label: `“${s.text}”`,
    marks: [{
      id: `${id}-sort`,
      label: 'Is it a statement?',
      options: STATEMENT_CHOICES,
      answer: yes ? 'yes' : 'no',
      ...(given ? { given: true } : {}),
      why: { [yes ? 'no' : 'yes']: `${says(s)} ${WHY_IS[s.kind]}` },
    }],
    note: KIND_NOTE[s.kind],
  };
}

const L1_SCENE = sortedScene(L1_EXAMPLE);

/** Do: the sorted example stays up; the learner sorts three new sentences by taps. */
export const L1_DRILL: DrillStep = {
  id: 's1.l1-do',
  title: 'Sort a sentence',
  body: [
    'The four sentences from the example stay sorted above.',
    'Now sort three new ones. For each one, ask: “Could it be true or false?” Then tap “A statement” or “Not a statement.”',
  ],
  scene: L1_SCENE,
  rows: L1_DO.map((s) => sentenceRow(s)),
  done: 'Right. A false sentence is still a statement. A question and an opinion are not statements.',
};

/**
 * Quiz: new sentences only (never one the cards or the board showed). First the sorts, so any three in a row
 * include a false sentence and a sentence that is not a statement: not a statement, false, true or unknown,
 * an opinion or an exclamation. Then one "Which of these" (the same sort, done on each choice).
 */
function lesson1Practice(rng: Rng): Made[] {
  const [a, b, c] = rng.shuffle(SKINS);
  const used = shownL1();
  const one = distinctItems();
  return [
    one(() => isThisItem(rng, a, used, ['question', 'command'])),
    one(() => isThisItem(rng, b, used, ['false'])),
    one(() => isThisItem(rng, c, used, ['true', 'unknown'])),
    one(() => isThisItem(rng, a, used, ['opinion', 'feeling'])),
    one(() => whichItem(rng, b, used, rng.chance(0.5))),
  ];
}

// ---------- lesson 2: true, false or can't tell ----------

const card = (id: string, shape: Thing['shape'], color: Thing['color'], size: Thing['size'], hidden = false): Thing =>
  hidden ? { id, shape, color, size, hidden: true } : { id, shape, color, size };

/** Worked examples on the key-idea cards. The engine test checks every claim made about them. */
export const L2_EXAMPLES = {
  look: [card('c1', 'circle', 'red', 'big'), card('c2', 'square', 'blue', 'small'), card('c3', 'triangle', 'red', 'big')],
  cant: [card('c1', 'circle', 'red', 'big'), card('c2', 'square', 'blue', 'small'), card('c3', 'circle', 'red', 'small', true)],
  settled: [card('c1', 'circle', 'red', 'small'), card('c2', 'triangle', 'yellow', 'big', true), card('c3', 'square', 'blue', 'big')],
};
const L2_SCENES = {
  look: { kind: 'things', things: L2_EXAMPLES.look },
  cant: { kind: 'things', things: L2_EXAMPLES.cant },
  settled: { kind: 'things', things: L2_EXAMPLES.settled },
} satisfies Record<string, Scene>;

/**
 * The sentences lesson 2 teaches: "There is …" and "Every card is …" (the cards and the board mark only these).
 * Quizzes, the check, the Arcade and new examples ask only these. "No card", "exactly", "at least", "more",
 * "the first card" and "every big card" are not taught here, so they are not asked here.
 */
export const L2_TEMPLATES: readonly RowTemplate[] = ['hasColor', 'hasShape', 'hasExact', 'allColor', 'allShape'];

const some = (d: Desc): Stmt => ({ t: 'some', d });
const every = (d: Desc): Stmt => ({ t: 'every', d });

/** The twin board: the cards of “Sometimes you can tell” with card 3 (the blue square) taken away. */
export const L2_TWIN: Thing[] = L2_EXAMPLES.settled.slice(0, 2);

/**
 * Do: first the board of “Can’t tell yet” (the yellow sentence shown), where the learner marks a true, a false and a
 * can't-tell sentence. Then the handoff's two-card board: one red card and one face-down card, “Every card is red.”
 */
export const L2_DRILL: DrillStep[] = [
  {
    id: 's1.l2-do',
    title: 'True, false or can’t tell',
    body: [
      'These are the cards from “Can’t tell yet.” The yellow sentence is already marked.',
      'Now mark three new sentences. Look at the cards you can see. Then ask: could card 3 change the answer?',
    ],
    scene: L2_SCENES.cant,
    rows: [
      verdictDrillRow(some({ color: 'yellow' }), L2_EXAMPLES.cant, { id: 'yellow', given: true }),
      verdictDrillRow(some({ shape: 'square' }), L2_EXAMPLES.cant, { id: 'square' }),
      verdictDrillRow(every({ size: 'big' }), L2_EXAMPLES.cant, { id: 'big' }),
      verdictDrillRow(some({ shape: 'triangle' }), L2_EXAMPLES.cant, { id: 'triangle' }),
    ],
    done: 'Right. When a card you can see settles a sentence, it is true or false. When card 3 could go either way, you can’t tell yet.',
  },
  {
    id: 's1.l2-do2',
    title: 'Take one card away',
    body: [
      'These are the cards from “Sometimes you can tell,” with the blue card taken away. The first sentence is already marked.',
      'Now mark “Every card is red.” Before, the blue card made it false. What about now?',
    ],
    scene: { kind: 'things', things: L2_TWIN },
    twin: 'Card 3, the blue square, is gone. Card 1 and the face-down card are left.',
    rows: [
      verdictDrillRow(some({ color: 'red' }), L2_TWIN, { id: 'red', given: true }),
      verdictDrillRow(every({ color: 'red' }), L2_TWIN, { id: 'all-red' }),
    ],
    done: 'Right. Card 1 is red, but card 2 is face down. It could be red or not, so you can’t tell yet.',
  },
];

/** The pass rule needs a right "Can't tell": tag each row item by its answer. */
const tagRow = (m: Made): Made => {
  m.item.tags = [m.item.answer === 'cant' ? 'cant-tell' : 'settled'];
  return m;
};

/** Quiz: a can't-tell trap first (the cards you can see point one way), then a true, a false and one more. */
function lesson2Practice(rng: Rng): Made[] {
  const frames = rng.shuffle(FRAMES);
  const targets: Verdict[] = ['true', 'false', rng.pick(['true', 'false', 'cant'] as const)];
  const templates = L2_TEMPLATES;
  const one = distinctItems();
  return [
    one(() => rowItem(rng, { frame: frames[0], target: 'cant', conflict: true, templates })),
    one(() => rowItem(rng, { frame: frames[1], target: targets[0], templates })),
    one(() => rowItem(rng, { frame: frames[2], target: targets[1], templates })),
    one(() => rowItem(rng, { frame: rng.pick(FRAMES), target: targets[2], templates })),
  ].map(tagRow);
}

// ---------- lesson 3: the NOT flip ----------

export const L3_EXAMPLE = [card('c1', 'circle', 'red', 'big'), card('c2', 'square', 'red', 'small'), card('c3', 'triangle', 'blue', 'big')];
/** 3 red cards and 3 yellow cards: a tie. */
export const L3_TIE = [
  card('t1', 'circle', 'red', 'big'), card('t2', 'circle', 'red', 'big'), card('t3', 'circle', 'red', 'big'),
  card('t4', 'circle', 'yellow', 'big'), card('t5', 'circle', 'yellow', 'big'), card('t6', 'circle', 'yellow', 'big'),
];

/**
 * The NOT flips lesson 3 teaches: "every" (card 3 and the Do), "there is" (card 2), "more" (cards 4 and 5 and the
 * Do), "exactly" and "at least" (card 5 and the Do). Quizzes, the check, the Arcade and new examples use only these.
 * "No card is …", "more than k", "the first card", "every big card" and "every red card" are not taught here.
 */
export const L3_KEYS: readonly NotKey[] = ['everyColor', 'everyShape', 'someColor', 'moreColor', 'atLeastShape', 'exactColor'];
const L3_CONFLICT = NOT_CONFLICT_KEYS.filter((k) => L3_KEYS.includes(k));
const L3_COMPARE = NOT_COMPARE_KEYS.filter((k) => L3_KEYS.includes(k));
/** Counting traps, as the handoff names them: every, at least (and more, exactly). The pass rule needs one. */
const COUNTING_TRAPS = ['not-every', 'not-more', 'not-at-least', 'not-exactly'];
const tagNot = (m: Made): Made => {
  m.item.tags = COUNTING_TRAPS.includes(m.tag) ? [m.tag, 'counting-trap'] : [m.tag];
  return m;
};

const L3_SCENES = {
  every: { kind: 'things', things: L3_EXAMPLE },
  tie: { kind: 'things', things: L3_TIE },
} satisfies Record<string, Scene>;

const RED: Desc = { color: 'red' };

/**
 * Do: on the cards of “The every trap,” the red sentence is shown with its NOT; the learner does “Every card is big.”
 * Then on the tie cards, the “more” sentence is shown; the learner does the counting trap “At least three cards are
 * red.” Each wrong NOT agrees with its sentence on the cards, so the board itself shows why it is wrong.
 */
export const L3_DRILL: DrillStep[] = [
  {
    id: 's1.l3-do',
    title: 'Mark the NOT',
    body: [
      'These are the cards from “The every trap.” The red sentence is already marked.',
      'Now do “Every card is big.” Pick its NOT. Then mark each sentence True or False on these cards.',
    ],
    scene: L3_SCENES.every,
    rows: [
      notDrillRow({ id: 'red', s: every(RED), right: { t: 'someNot', d: RED }, wrongs: [{ t: 'none', d: RED }, every({ color: 'blue' })], cards: L3_EXAMPLE, given: true }),
      notDrillRow({ id: 'big', s: every({ size: 'big' }), right: { t: 'someNot', d: { size: 'big' } }, wrongs: [{ t: 'none', d: { size: 'big' } }, every({ size: 'small' })], cards: L3_EXAMPLE }),
    ],
    done: 'Right. Card 2 is small, so “Every card is big” is false here. Its NOT, “At least one card is not big,” is true here.',
  },
  {
    id: 's1.l3-do2',
    title: 'A counting trap',
    body: [
      'These are the tie cards: 3 red cards and 3 yellow cards. The “more” sentence is already marked.',
      'Now do “At least three cards are red.” Pick its NOT. Then mark each sentence True or False on these cards.',
    ],
    scene: L3_SCENES.tie,
    rows: [
      notDrillRow({
        id: 'more',
        s: { t: 'more', a: RED, b: { color: 'yellow' } },
        right: { t: 'asMany', a: { color: 'yellow' }, b: RED },
        wrongs: [{ t: 'more', a: { color: 'yellow' }, b: RED }, { t: 'none', d: RED }],
        cards: L3_TIE,
        given: true,
      }),
      notDrillRow({
        id: 'three',
        s: { t: 'count', d: RED, op: 'ge', k: 3 },
        right: { t: 'count', d: RED, op: 'lt', k: 3 },
        wrongs: [{ t: 'count', d: RED, op: 'le', k: 3 }, { t: 'count', d: RED, op: 'ge', k: 3, not: true }],
        cards: L3_TIE,
      }),
    ],
    done: 'Right. There are exactly 3 red cards here. So “At least three” and “At most three” are true together. That is why “At most three” is not the NOT.',
  },
];

/**
 * Quiz: five NOTs of the kinds the cards and the board taught, with "every" and "at least" in every set (the
 * handoff's twins). An every trap (a twin of the first board), a "there is", a "more", an "at least" (a twin of the
 * second board's counting trap), then another every or an "exactly".
 */
function lesson3Practice(rng: Rng): Made[] {
  const frames = rng.shuffle(FRAMES);
  const one = distinctItems();
  return [
    one(() => notItem(rng, { frame: frames[0], key: 'everyColor' })),
    one(() => notItem(rng, { frame: frames[1], key: 'someColor' })),
    one(() => notItem(rng, { frame: frames[2], key: 'moreColor' })),
    one(() => notItem(rng, { frame: rng.pick(FRAMES), key: 'atLeastShape' })),
    one(() => notItem(rng, { frame: rng.pick(FRAMES), key: rng.pick(['everyShape', 'exactColor'] as const) })),
  ].map(tagNot);
}

// ---------- lesson 4: treasure signs ----------

/** The worked example: Gold "It is here." Silver "It is not here." Bronze "It is not in Gold." Exactly one sign is true. */
export const L4_EXAMPLE: SignPuzzle = { signs: [{ t: 'here' }, { t: 'notHere' }, { t: 'notIn', x: 0 }], rule: 'one', answer: 1 };

function exampleCases(): string[] {
  const w = signWords('chest');
  return [0, 1, 2].map((b) => {
    const ts = trueSigns(L4_EXAMPLE.signs, b);
    const n = ts.length;
    const which = n === 0 ? 'no sign is true' : `${n === 1 ? 'only ' : ''}${w.signList(ts)} ${n === 1 ? 'is' : 'are'} true`;
    return `If the ${w.item} is ${w.prep} ${w.the(b)}, ${which}. That makes ${['zero', 'one', 'two', 'three'][n]} true sign${n === 1 ? '' : 's'}.`;
  });
}

/**
 * Do: the same chest board as the worked example. The Silver case is shown marked (the example already finished
 * it); the learner marks the Gold case by taps: each sign True or False, the count, then Keep or Reject.
 */
export const L4_DRILL = signDrill(L4_EXAMPLE, 'chest', {
  id: 's1.l4-do',
  title: 'Mark a case',
  body: [
    'This is the board from the example. The Silver row is already marked.',
    'Now pretend the treasure is in the Gold chest. Mark each sign True or False. Count the true signs. Then keep or reject Gold.',
  ],
  shown: [1],
  mark: [0],
  done: 'Right. With the treasure in the Gold chest, two signs are true. The rule needs exactly one, so Gold is rejected. You just did a case check.',
});

/**
 * The first quiz, the same every time: a cave board with the rule the lesson taught. Ice: "not in the Moss cave".
 * Fire: "in the Moss cave". Moss: "not in the Ice cave". Only Ice makes exactly one sign true.
 */
export const L4_FIRST_QUIZ: SignPuzzle = { signs: [{ t: 'notIn', x: 2 }, { t: 'in', x: 2 }, { t: 'notIn', x: 0 }], rule: 'one', answer: 0 };

/** Its board, marked before the answer buttons show: every case, by the learner. */
export const L4_FIRST_QUIZ_WORK = signDrill(L4_FIRST_QUIZ, 'cave', {
  id: 's1.l4-p1-work',
  title: 'Check each cave',
  body: ['Before you answer, mark each case. Pretend the egg is in each cave, one at a time.'],
  shown: [],
  mark: [0, 1, 2],
  done: 'Every case is marked. Now answer the question.',
});

/**
 * Quiz: four puzzles, every one with the rule the lesson taught ("Exactly one sign is true"). Try 1 is the frozen
 * cave board, marked case by case before its answer buttons show. Then a door board, a box board and a chest twin
 * (the example's chests with one sign changed), in any order. The other rules (exactly two, every sign false, the
 * owner's sign) are not in this lesson: a new rule is never introduced inside a quiz.
 */
function lesson4Practice(rng: Rng): Made[] {
  const first = signItem(rng, { skin: 'cave', puzzle: L4_FIRST_QUIZ });
  first.item.workFirst = L4_FIRST_QUIZ_WORK;
  // A twin whose answer is not Silver, so remembering the example's answer never passes it.
  const twin = signItem(rng, { skin: 'chest', puzzle: rng.pick(signTwins(L4_EXAMPLE).filter((t) => t.answer !== L4_EXAMPLE.answer)) });
  twin.item.fixed = true;
  const one = distinctItems();
  one(() => first);
  const rest = rng.shuffle<SignSkin | 'twin'>(['door', 'box', 'twin']).map((k) => (k === 'twin' ? one(() => twin) : one(() => newSign(rng, { skin: k, rule: 'one' }))));
  return [first, ...rest];
}

// ---------- lessons ----------

const practiceOf = (lesson: string, make: (rng: Rng) => Made[]) => (rng: Rng): Item[] =>
  make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));

// ---------- lessons 5-7: the other sign rules, each its own See -> Do -> Quiz ----------
//
// The handoff took "every sign is false", "exactly two" and the owner's sign out of Treasure signs: each needs its own
// lesson with the same See -> Do -> Quiz shape. Each lesson has a worked example on the chests (See), a board where
// the kept case is shown and the learner marks a rejected one (Do), and a quiz of only its own rule (Quiz).

/** Every sign is false. Only the Bronze chest makes no sign true. Its own sign, "not in this chest", is the trap. */
export const L5_EXAMPLE: SignPuzzle = { signs: [{ t: 'here' }, { t: 'in', x: 0 }, { t: 'notHere' }], rule: 'none', answer: 2 };
/** Exactly two signs are true. Only the Gold chest makes two signs true. */
export const L6_EXAMPLE: SignPuzzle = { signs: [{ t: 'notIn', x: 1 }, { t: 'here' }, { t: 'in', x: 0 }], rule: 'two', answer: 0 };
/** The owner's sign: only the Silver chest has its own sign true and the other two false. */
export const L7_EXAMPLE: SignPuzzle = { signs: [{ t: 'in', x: 2 }, { t: 'here' }, { t: 'notIn', x: 1 }], rule: 'owner', answer: 1 };

/** Sign sets the quizzes, the check, the Arcade and new examples never repeat: the worked examples and the frozen cave. */
const SHOWN_SIGNS = new Set([L4_EXAMPLE, L4_FIRST_QUIZ, L5_EXAMPLE, L6_EXAMPLE, L7_EXAMPLE].map((p) => JSON.stringify(p.signs)));

/** A random sign puzzle that is never a worked example or the frozen cave (in any skin). */
function newSign(rng: Rng, opts: { skin: SignSkin; rule: SignRule }) {
  let m = signItem(rng, opts);
  for (let i = 0; i < 60 && SHOWN_SIGNS.has(JSON.stringify(m.puzzle.signs)); i++) m = signItem(rng, opts);
  return m;
}

/** A worked example's three cases as sentences: which signs are true, then what the rule says about that. */
function caseLines(p: SignPuzzle, skin: SignSkin): string[] {
  const w = signWords(skin);
  return [0, 1, 2].map((b) => {
    const ts = trueSigns(p.signs, b);
    const which = ts.length === 0 ? 'no sign is true' : `${ts.length === 1 ? 'only ' : ''}${w.signList(ts)} ${ts.length === 1 ? 'is' : 'are'} true`;
    return `If the ${w.item} is ${w.prep} ${w.the(b)}, ${which}. ${signCaseNote(p, skin, b)}`;
  });
}

interface SignLessonSpec {
  id: string;
  title: string;
  example: SignPuzzle;
  /** The cards before the worked example: the new rule, and how to check it. */
  intro: { title: string; body: string[] }[];
}

/** One sign-rule lesson: the intro cards, the worked example (See), Mark a case (Do), and a quiz of only its rule. */
function signLesson(o: SignLessonSpec): LessonDef {
  const w = signWords('chest');
  const p = o.example;
  const reject = [0, 1, 2].find((b) => b !== p.answer)!;
  const drill = signDrill(p, 'chest', {
    id: `${o.id}-do`,
    title: 'Mark a case',
    body: [
      `This is the board from the example. The ${w.short[p.answer]} row is already marked.`,
      `Now pretend the treasure is in the ${w.name(reject)}. Mark each sign True or False. Count the true signs. Then keep or reject ${w.short[reject]}.`,
    ],
    shown: [p.answer],
    mark: [reject],
    done: `Right. ${signCaseNote(p, 'chest', reject)} So ${w.the(reject)} is rejected. You just did a case check.`,
  });
  return {
    id: o.id,
    title: o.title,
    ideas: [
      ...o.intro,
      {
        title: 'An example',
        body: [...caseLines(p, 'chest'), signConclusion(p, 'chest')],
        scene: { kind: 'boxes', boxes: signBoxes(p, 'chest'), rule: w.ruleText(p.rule) },
      },
    ],
    drill: [drill],
    // Quiz: try 1 is a twin of the example (one sign changed, a different answer), then a door, a cave and a box
    // board in any order. Every one uses this lesson's rule and nothing else.
    practice: practiceOf(o.id, (rng) => {
      const twin = signItem(rng, { skin: 'chest', puzzle: rng.pick(signTwins(p).filter((t) => t.answer !== p.answer)) });
      twin.item.fixed = true;
      const one = distinctItems();
      one(() => twin);
      return [twin, ...rng.shuffle<SignSkin>(['door', 'cave', 'box']).map((k) => one(() => newSign(rng, { skin: k, rule: p.rule })))];
    }),
  };
}

const L5 = signLesson({
  id: 's1.l5',
  title: 'Every sign is false',
  example: L5_EXAMPLE,
  intro: [
    {
      title: 'A new rule',
      body: [
        'Here is a new rule: “Every sign is false.”',
        'It means no sign tells the truth. The number of true signs is 0.',
        'The rule is always right, just like before.',
      ],
    },
    {
      title: 'The same check',
      body: [
        'Check each chest the same way. Pretend the treasure is in it. Mark each sign true or false.',
        'Count the true signs. Keep the chest where no sign is true. Reject the others.',
      ],
    },
  ],
});

const L6 = signLesson({
  id: 's1.l6',
  title: 'Exactly two signs are true',
  example: L6_EXAMPLE,
  intro: [
    {
      title: 'A new rule',
      body: [
        'Here is a new rule: “Exactly two signs are true.”',
        'It means two signs tell the truth, and one does not. The number of true signs is 2.',
        '“Exactly two” means 2, no more and no fewer. Three true signs do not fit.',
      ],
    },
    {
      title: 'The same check',
      body: [
        'Check each chest the same way. Pretend the treasure is in it. Mark each sign true or false.',
        'Count the true signs. Keep the chest that makes exactly two signs true. Reject the others.',
      ],
    },
  ],
});

const L7 = signLesson({
  id: 's1.l7',
  title: 'The owner’s sign',
  example: L7_EXAMPLE,
  intro: [
    {
      title: 'A new rule',
      body: [
        'Here is a new rule: “The sign on the chest with the treasure is true. The other signs are false.”',
        'Counting is not enough here. The one true sign has to be on the chest with the treasure.',
      ],
    },
    {
      title: 'Check two things',
      body: [
        'Pretend the treasure is in a chest. First, is that chest’s own sign true?',
        'Then look at the other two signs. Both must be false. If either part fails, reject the chest.',
      ],
    },
  ],
});

const lessons: LessonDef[] = [
  {
    id: 's1.l1',
    title: 'What is a statement?',
    ideas: [
      {
        title: 'A statement',
        body: ['A statement is a sentence that is either true or false.', '“A week has seven days” is a statement. It is true.'],
        scene: { kind: 'text', lines: ['A week has seven days.'] },
      },
      {
        title: 'False still counts',
        body: ['“Cats can fly” is a statement too. It is false.', 'A statement does not have to be true. It just has to be true or false.'],
        scene: { kind: 'text', lines: ['Cats can fly.'] },
      },
      {
        title: 'Not statements',
        body: [
          'Some sentences are not true or false.',
          'A question asks something: “Is it raining?”',
          'A command tells you to do something: “Close the door.”',
          'An exclamation shows a strong feeling: “Wow!”',
          'None of these can be true or false. So none of them is a statement.',
        ],
      },
      {
        title: 'Opinions',
        body: [
          'An opinion tells what someone thinks or likes: “Pizza is the best food.”',
          'People can disagree about an opinion, and nobody is wrong. In logic, we do not count an opinion as a statement.',
        ],
      },
      {
        title: 'You don’t need the answer',
        body: [
          '“The wizard has twelve cats.” You can’t check this. But it must be true or false.',
          'So it is a statement. You do not need to know the answer to spot a statement.',
        ],
      },
      {
        title: 'An example',
        body: [
          'Here are four sentences from these cards, sorted for you. For each one, ask: “Could it be true or false?”',
          '“A week has seven days” is true. “Cats can fly” is false. Each one can be true or false, so each one is a statement.',
          '“Is it raining?” asks something. “Pizza is the best food” is an opinion. Neither one can be true or false, so neither is a statement.',
        ],
        scene: L1_SCENE,
      },
    ],
    drill: [L1_DRILL],
    practice: practiceOf('s1.l1', lesson1Practice),
    // Three right in a row on new sentences, with a false one and one that is not a statement.
    pass: {
      firstTry: 3,
      inARow: true,
      include: [
        { tag: 'false-statement', label: 'a false sentence (it is still a statement)' },
        { tag: 'not-statement', label: 'a sentence that is not a statement' },
      ],
    },
  },
  {
    id: 's1.l2',
    title: 'True, false or can’t tell',
    ideas: [
      {
        title: 'Check the picture',
        body: [
          'Some statements talk about a picture. Look at the cards to check them.',
          'We count cards from the left. Card 1 is the first card.',
          '“There is a blue card.” Card 2 is blue, so this is true.',
        ],
        scene: L2_SCENES.look,
      },
      {
        title: 'Face-down cards',
        body: ['A face-down card is turned over, so you can’t see it.', 'It could be any shape, any color and any size.'],
      },
      {
        title: 'Can’t tell yet',
        body: [
          '“There is a yellow card.” You can’t see a yellow card. But card 3 is face down, and it could be yellow.',
          'So the honest answer is “Can’t tell.” That does not mean false. It means you need more clues.',
        ],
        scene: L2_SCENES.cant,
      },
      {
        title: 'Sometimes you can tell',
        body: [
          '“There is a red card.” Card 1 is red. So it is true, no matter what card 2 is.',
          '“Every card is red.” Card 3 is blue. So it is false, no matter what.',
        ],
        scene: L2_SCENES.settled,
      },
      {
        title: 'Try every way',
        body: [
          'Ask two questions. Could the face-down cards make it true? Could they make it false?',
          'If they can only make it true, it is true. If they can only make it false, it is false. If they could make it true and could also make it false, you can’t tell yet.',
        ],
      },
    ],
    drill: L2_DRILL,
    practice: practiceOf('s1.l2', lesson2Practice),
    // Three right on the first try, one of them a right “Can’t tell.”
    pass: { firstTry: 3, include: [{ tag: 'cant-tell', label: 'a right “Can’t tell”' }] },
  },
  {
    id: 's1.l3',
    title: 'The NOT flip',
    ideas: [
      {
        title: 'What NOT means',
        body: [
          'NOT means the original statement is false.',
          'The NOT of a statement is true whenever the statement is false. It is false whenever the statement is true.',
          'A statement and its NOT never agree. When one is true, the other is false.',
          'People sometimes call it the opposite. But the NOT must cover every way the statement can be false.',
        ],
      },
      {
        title: 'A quick trick',
        body: [
          'Put “It is not true that” in front of the statement.',
          '“It is not true that there is a red card” means “No card is red.”',
          // The handoff: no shortcut that skips the check. The trick ends on the check, done on both kinds of row.
          'Then check it. If a card is red, “There is a red card” is true, and “No card is red” is false.',
          'If no card is red, “There is a red card” is false, and “No card is red” is true. They never agree.',
        ],
      },
      {
        title: 'The every trap',
        body: [
          'What is the opposite of “Every card is red”? Many people say “No card is red.” That is a trap.',
          'Look at these cards. Not every card is red. But “No card is red” is false too.',
          'The real opposite is “At least one card is not red.” One card is enough.',
        ],
        scene: L3_SCENES.every,
      },
      {
        title: 'More, a tie, and at least as many',
        body: [
          '“More” means a larger number. With 3 red cards and 2 yellow cards, red has more.',
          'A tie means the two groups have the same number. Here there are 3 red cards and 3 yellow cards. That is a tie. Neither color has more.',
          '“At least as many” means the same number or more. In this tie, yellow has at least as many as red.',
        ],
        scene: L3_SCENES.tie,
      },
      {
        title: 'NOT and counting',
        body: [
          'The NOT of “There are more red cards than yellow cards” must include a tie. It is “There are at least as many yellow cards as red cards.”',
          'The NOT of “Exactly two cards are red” is “The number of red cards is not two.” It could be more, or it could be fewer.',
          'The NOT of “At least two cards are red” is “Fewer than two cards are red.” “At most two” is not it: it still allows exactly two.',
        ],
      },
      {
        title: 'Check your NOT',
        body: [
          'Think of a few rows of cards. Check the statement and your NOT in each row. One must be true and the other false.',
          'Try the edge cases too, like a tie or exactly two.',
          'If the statement and your NOT can be true at once, or false at once, it is not the NOT.',
        ],
      },
    ],
    drill: L3_DRILL,
    practice: practiceOf('s1.l3', lesson3Practice),
    // Three right on the first try, one of them a counting trap.
    pass: { firstTry: 3, include: [{ tag: 'counting-trap', label: 'a counting trap (every, more, exactly or at least)' }] },
  },
  {
    id: 's1.l4',
    title: 'Treasure signs',
    ideas: [
      {
        title: 'Three chests',
        body: [
          'There are three chests. The treasure is in just one of them.',
          'Each chest has a sign. A sign might tell the truth, or it might not.',
          'A sign that says “this chest” means the chest it is on.',
        ],
      },
      {
        title: 'The rule',
        body: [
          'A rule tells you about the signs. For example: “Exactly one sign is true.”',
          'The rule is always right. Use it to find the treasure.',
        ],
      },
      {
        title: 'Try each chest',
        body: [
          'Pretend the treasure is in the first chest. Check each sign. Is it true or false?',
          'Count the true signs. Does that fit the rule? If not, try the next chest.',
        ],
      },
      {
        title: 'An example',
        body: [...exampleCases(), signConclusion(L4_EXAMPLE, 'chest')],
        scene: { kind: 'boxes', boxes: signBoxes(L4_EXAMPLE, 'chest'), rule: signWords('chest').ruleText('one') },
      },
    ],
    drill: [L4_DRILL],
    practice: practiceOf('s1.l4', lesson4Practice),
  },
  L5,
  L6,
  L7,
];

// ---------- check and arcade ----------

type Maker = (rng: Rng) => Made;

/** One item from a lesson, in a random skin. */
const ANY: Record<string, Maker> = {
  's1.l1': (rng) => (rng.chance(0.5) ? isThisItem(rng, rng.pick(SKINS), shownL1()) : whichItem(rng, rng.pick(SKINS), shownL1(), rng.chance(0.5))),
  's1.l2': (rng) => rowItem(rng, { frame: rng.pick(FRAMES), target: rng.pick(['true', 'false', 'cant'] as const), templates: L2_TEMPLATES }),
  's1.l3': (rng) => notItem(rng, { frame: rng.pick(FRAMES), key: rng.pick(L3_KEYS) }),
  // Each sign lesson teaches one rule, and its Arcade items use only that rule.
  's1.l4': (rng) => newSign(rng, { skin: rng.pick(SIGN_SKINS), rule: 'one' }),
  's1.l5': (rng) => newSign(rng, { skin: rng.pick(SIGN_SKINS), rule: 'none' }),
  's1.l6': (rng) => newSign(rng, { skin: rng.pick(SIGN_SKINS), rule: 'two' }),
  's1.l7': (rng) => newSign(rng, { skin: rng.pick(SIGN_SKINS), rule: 'owner' }),
};

/** Opposite cases whose sentence is a different kind from every case already used (a different skill tag). */
const unlike = (keys: readonly NotKey[], used: NotKey[]) => keys.filter((k) => !used.some((u) => NOT_TAGS[u] === NOT_TAGS[k]));

/**
 * 9-10 items: 2 on statements, 3 on cards (one a "can't tell" trap), 2 NOT flips, 2 sign puzzles. Every item is of a
 * kind its lesson taught. No sentence from the bank shows twice (nor one the lesson 1 cards showed), the NOT flips
 * flip different kinds of sentence, and no two items share a prompt and scene.
 */
function check(rng: Rng): Item[] {
  const frames = (): Frame => rng.pick(FRAMES);
  const one = distinctItems();
  const used = shownL1();
  const templates = L2_TEMPLATES;
  const [s1, s2] = rng.shuffle(SKINS);
  const settled = rng.pick(['true', 'false'] as const);
  const findStatement = rng.chance(0.5);
  // First an every trap, then a comparison (a tie or an exact count decides it).
  const nots: NotKey[] = [rng.pick(L3_CONFLICT)];
  nots.push(rng.pick(unlike(L3_COMPARE, nots)));
  const [k1, k2, k3, k4] = rng.shuffle(SIGN_SKINS);
  // Ten items, every lesson: 2 statements, 2 card rows (one a can't-tell trap), 2 NOT flips, then one sign puzzle per
  // sign lesson, each with that lesson's rule and a different kind of box.
  const planned: [string, Made][] = [
    ['s1.l1', one(() => isThisItem(rng, s1, used))],
    ['s1.l1', one(() => whichItem(rng, s2, used, findStatement))],
    ['s1.l2', one(() => rowItem(rng, { frame: frames(), target: 'cant', conflict: true, templates }))],
    ['s1.l2', one(() => rowItem(rng, { frame: frames(), target: settled, templates }))],
    ['s1.l3', one(() => notItem(rng, { frame: frames(), key: nots[0] }))],
    ['s1.l3', one(() => notItem(rng, { frame: frames(), key: nots[1] }))],
    ['s1.l4', one(() => newSign(rng, { skin: k1, rule: 'one' }))],
    ['s1.l5', one(() => newSign(rng, { skin: k2, rule: 'none' }))],
    ['s1.l6', one(() => newSign(rng, { skin: k3, rule: 'two' }))],
    ['s1.l7', one(() => newSign(rng, { skin: k4, rule: 'owner' }))],
  ];
  return planned.map(([lesson, m], i) => finish(m, `s1-c${i + 1}`, lesson));
}

function arcade(rng: Rng): Item {
  const lesson = rng.pick(lessons).id;
  return finish(ANY[lesson](rng), 's1-arcade', lesson);
}

/**
 * For "Is this a statement?": after a miss, a new sentence of the same kind, then one from the other side of the
 * line, so saying "A statement" (or "Not a statement") every time can't pass both.
 */
export const FRESH_CONTRAST: Record<SentenceKind, readonly SentenceKind[]> = {
  true: ['question', 'command'],
  false: ['opinion'],
  unknown: ['opinion'],
  question: ['false', 'unknown'],
  command: ['false', 'unknown'],
  opinion: ['false'],
  feeling: ['true', 'false'],
};

/** Lesson 1: the same kind of sentence again, plus a contrast; or a new "Which of these" asked the same way. */
function freshL1(missed: Item, rng: Rng): Item[] {
  if (missed.kind !== 'choose') return [];
  const make = (m: Made) => finish(m, 'new', 's1.l1');
  if (missed.scene?.kind === 'text') {
    const text = missed.scene.lines[0];
    const s = SENTENCES.find((x) => x.text === text);
    if (!s) return [];
    const used: Used = new Set([text, ...L1_SHOWN]);
    return [make(isThisItem(rng, rng.pick(SKINS), used, [s.kind])), make(isThisItem(rng, rng.pick(SKINS), used, FRESH_CONTRAST[s.kind]))];
  }
  const used: Used = new Set([...missed.choices.map((c) => c.label), ...L1_SHOWN]);
  return [make(whichItem(rng, rng.pick(SKINS), used, missed.prompt === 'Which of these is a statement?'))];
}

/** The sentence a row item asks about (the words inside its quotes). */
export const rowSentence = (it: { prompt: string }) => /“(.+?)”/.exec(it.prompt)?.[1] ?? '';
const rowCards = (it: { scene?: Item['scene'] }) => JSON.stringify(it.scene?.kind === 'things' ? it.scene.things : null);

/**
 * Lesson 2: a "can't tell" row and a settled row, so both edges are checked. The first is like the missed item:
 * a can't-tell row after a missed can't-tell row, or a row with the same settled answer. A new example never repeats
 * the missed sentence or the missed cards, so the answer just shown can't be copied.
 */
function freshL2(missed: Item, rng: Rng): Item[] {
  const [f1, f2] = rng.shuffle(FRAMES);
  const make = (o: Parameters<typeof rowItem>[1]) => {
    const opts = { ...o, templates: L2_TEMPLATES };
    let m = rowItem(rng, opts);
    for (let i = 0; i < 40 && (rowSentence(m.item) === rowSentence(missed) || rowCards(m.item) === rowCards(missed)); i++) m = rowItem(rng, opts);
    return finish(m, 'new', 's1.l2');
  };
  if (missed.skill === 's1.cant-tell') {
    return [make({ frame: f1, target: 'cant', conflict: !!missed.conflict }), make({ frame: f2, target: rng.pick(['true', 'false'] as const) })];
  }
  const v: Verdict = missed.kind === 'choose' && missed.answer === 'false' ? 'false' : 'true';
  return [make({ frame: f1, target: v }), make({ frame: f2, target: 'cant', conflict: true })];
}

/** Every sign a box can carry, so a sign's words can be read back into the sign (for the new examples). */
const SIGN_FORMS = (box: number): Sign[] => [
  { t: 'here' },
  { t: 'notHere' },
  ...[0, 1, 2].filter((x) => x !== box).flatMap((x): Sign[] => [{ t: 'in', x }, { t: 'notIn', x }]),
];

/** The signs of a sign puzzle on the page, read back from their words. */
export function signsOnPage(boxes: readonly { name: string; sign: string }[]): Sign[] | null {
  const skin = SIGN_SKINS.find((k) => signWords(k).name(0) === boxes[0]?.name);
  if (!skin) return null;
  const w = signWords(skin);
  const signs = boxes.map((b, i) => SIGN_FORMS(i).find((s) => w.signText(s) === b.sign));
  return signs.every((s): s is Sign => !!s) ? signs : null;
}

/**
 * Lesson 4: a new puzzle with the same rule, on a different kind of box. Its signs differ from the missed puzzle's,
 * so the new example is not the same puzzle with new names (where the same position would win again).
 */
function freshL4(missed: Item, rng: Rng): Item[] {
  if (missed.scene?.kind !== 'boxes') return [];
  const { rule: ruleText, boxes } = missed.scene;
  const rule = SIGN_RULES.find((r) => SIGN_SKINS.some((k) => signWords(k).ruleText(r) === ruleText));
  if (!rule) return [];
  const skin = rng.pick(SIGN_SKINS.filter((k) => signWords(k).name(0) !== boxes[0].name));
  const old = JSON.stringify(signsOnPage(boxes));
  let m = newSign(rng, { skin, rule });
  for (let i = 0; i < 40 && JSON.stringify(m.puzzle.signs) === old; i++) m = newSign(rng, { skin, rule });
  return [finish(m, 'new', missed.lesson)];
}

/**
 * New examples after a missed NOT flip, of the kinds lesson 3 taught. A comparison gets two: one whose NOT keeps the
 * boundary (a tie, or exactly k) and one whose NOT does not, so both kinds of edge are checked. Other items use the
 * default.
 */
const COMPARE_TAGS = ['not-more', 'not-at-least', 'not-exactly'];
function fresh(missed: Item, rng: Rng): Item[] {
  if (missed.lesson === 's1.l1') return freshL1(missed, rng);
  if (missed.lesson === 's1.l2') return freshL2(missed, rng);
  if (['s1.l4', 's1.l5', 's1.l6', 's1.l7'].includes(missed.lesson)) return freshL4(missed, rng);
  if (missed.lesson !== 's1.l3') return [];
  const tag = missed.skill.replace(/^s1\./, '');
  const make = (t: string) => finish(notItem(rng, { frame: rng.pick(FRAMES), key: rng.pick(L3_KEYS.filter((k) => NOT_TAGS[k] === t)) }), 'new', 's1.l3');
  if (!COMPARE_TAGS.includes(tag)) return L3_KEYS.some((k) => NOT_TAGS[k] === tag) ? [make(tag)] : [];
  return [make(tag), make(tag === 'not-more' ? 'not-at-least' : 'not-more')];
}

export const stop1: StopDef = {
  n: STOP,
  id: 's1',
  title: 'True or False?',
  idea: 'A statement is true or false. Without enough clues, the honest answer is “Can’t tell yet.”',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
};
