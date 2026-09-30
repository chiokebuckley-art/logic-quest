/**
 * Stop 1 · True or False?
 * A statement is true or false. Without enough clues, the honest answer is "can't tell yet".
 *
 *  l1 What is a statement?   sentence bank (true, false, unknown, question, command, opinion, feeling)
 *  l2 True, false or can't tell   rows of shape cards with some face down (engine: statements.ts)
 *  l3 The NOT flip           pick the exact opposite (engine: statements.ts, checked row by row)
 *  l4 Treasure signs         three boxes, signs and a rule (engine: signs.ts)
 */
import type { Choice, ChooseItem, Item, LessonDef, Rng, StopDef, Thing } from '../engine/types';
import {
  FRAMES,
  NOT_CONFLICT_KEYS,
  NOT_KEYS,
  NOT_TAGS,
  notItem,
  rowItem,
  type Frame,
  type ItemCore,
  type Made,
  type NotKey,
  type Verdict,
} from '../engine/puzzles/statements';
import {
  SIGN_RULES,
  SIGN_SKINS,
  signBoxes,
  signConclusion,
  signItem,
  signWords,
  trueSigns,
  type SignPuzzle,
  type SignRule,
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

/** The mistake in calling a statement "not a statement", or the other way round. */
function mistake(s: Sentence): string {
  switch (s.kind) {
    case 'true': return `${q(s)} is true. Anything true or false is a statement.`;
    case 'false': return `A false sentence is still a statement. ${q(s)} is false, so it is a statement.`;
    case 'unknown': return `You don’t need to know the answer. ${q(s)} must be true or false, so it is a statement.`;
    case 'question': return `${q(s)} is a question. A question can’t be true or false.`;
    case 'command': return `${q(s)} is a command. A command can’t be true or false.`;
    case 'opinion': return `${q(s)} is an opinion. People can disagree, and nobody is wrong. So it is not a statement.`;
    case 'feeling': return `${q(s)} shows a feeling. It can’t be true or false.`;
  }
}

const L1_HINT = 'Ask yourself: can this sentence be true or false?';

/** "Is this sentence a statement?" */
function isThisItem(rng: Rng, skin: Skin, used: Used, kinds?: readonly SentenceKind[]): Made {
  const kind = rng.pick(kinds ?? [...STATEMENT_KINDS, ...NOT_STATEMENT_KINDS]);
  const s = draw(rng, skin, [kind], used);
  const yes = isStatement(s.kind);
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
    whyWrong: { [yes ? 'no' : 'yes']: mistake(s) },
    hint: L1_HINT,
  };
  if (s.kind === 'false') item.conflict = true;
  const tag = s.kind === 'false' ? 'false-is-statement' : s.kind === 'opinion' ? 'opinion' : yes ? 'statement' : 'not-statement';
  return { tag, item };
}

const LETTERS = ['a', 'b', 'c', 'd'];

/** "Which of these is a statement?" (one statement) or "... is not a statement?" (one non-statement). */
function whichItem(rng: Rng, skin: Skin, used: Used, findStatement: boolean): Made {
  const others = rng.int(2, 3);
  const target = draw(rng, skin, findStatement ? STATEMENT_KINDS : NOT_STATEMENT_KINDS, used);
  const rest = pickDistinct(rng, skin, findStatement ? NOT_STATEMENT_KINDS : STATEMENT_KINDS, others, findStatement, used);
  const all = rng.shuffle([target, ...rest]);
  const choices: Choice[] = all.map((s, i) => ({ id: LETTERS[i], label: s.text }));
  const answer = choices[all.indexOf(target)].id;
  const whyWrong: Record<string, string> = {};
  all.forEach((s, i) => {
    if (s !== target) whyWrong[LETTERS[i]] = mistake(s);
  });
  const explain = findStatement
    ? `${whatItIs(target)} The others are not true or false.`
    : `${whatItIs(target)} The others are all statements.`;
  const item: ItemCore = {
    kind: 'choose',
    prompt: findStatement ? 'Which of these is a statement?' : 'Which of these is not a statement?',
    choices,
    answer,
    explain,
    whyWrong,
    hint: findStatement ? 'Find the one that must be true or false, even if you can’t check it.' : 'Find the one that can’t be true or false.',
  };
  if (all.some((s) => s.kind === 'false')) item.conflict = true;
  return { tag: findStatement ? 'which-statement' : 'which-not-statement', item };
}

const SKINS: readonly Skin[] = ['everyday', 'fantasy', 'abstract'];

function lesson1Practice(rng: Rng): Made[] {
  const [a, b, c] = rng.shuffle(SKINS);
  const used: Used = new Set();
  const one = distinctItems();
  return [
    one(() => isThisItem(rng, a, used, rng.chance(0.5) ? ['true', 'unknown'] : ['question', 'command'])),
    one(() => whichItem(rng, b, used, true)),
    one(() => isThisItem(rng, c, used, ['false'])),
    one(() => isThisItem(rng, a, used, ['opinion', 'feeling'])),
    one(() => whichItem(rng, b, used, false)),
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

function lesson2Practice(rng: Rng): Made[] {
  const frames = rng.shuffle(FRAMES);
  const targets: Verdict[] = ['true', 'false', rng.pick(['true', 'false', 'cant'] as const)];
  const one = distinctItems();
  return [
    one(() => rowItem(rng, { frame: frames[0], target: 'cant', conflict: true })),
    one(() => rowItem(rng, { frame: frames[1], target: targets[0] })),
    one(() => rowItem(rng, { frame: frames[2], target: targets[1] })),
    one(() => rowItem(rng, { frame: rng.pick(FRAMES), target: targets[2] })),
  ];
}

// ---------- lesson 3: the NOT flip ----------

export const L3_EXAMPLE = [card('c1', 'circle', 'red', 'big'), card('c2', 'square', 'red', 'small'), card('c3', 'triangle', 'blue', 'big')];

function lesson3Practice(rng: Rng): Made[] {
  const frames = rng.shuffle(FRAMES);
  const one = distinctItems();
  return [
    one(() => notItem(rng, { frame: frames[0], key: 'everyColor' })),
    one(() => notItem(rng, { frame: frames[1], key: rng.pick(['someColor', 'noneColor'] as const) })),
    one(() => notItem(rng, { frame: frames[2], key: rng.pick(['exactColor', 'moreColor', 'atLeastShape'] as const) })),
    one(() => notItem(rng, { frame: rng.pick(FRAMES), key: rng.pick(['everyShape', 'everyBig', 'everyColorShape', 'firstShape', 'someExact'] as const) })),
  ];
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

function lesson4Practice(rng: Rng): Made[] {
  const skins = rng.shuffle(SIGN_SKINS);
  // Start with the rule the key-idea cards teach, then the other three in any order.
  const rules: SignRule[] = ['one', ...rng.shuffle(SIGN_RULES.filter((r) => r !== 'one'))];
  const one = distinctItems();
  return [0, 1, 2, 3].map((i) => one(() => signItem(rng, { skin: skins[i], rule: rules[i] })));
}

// ---------- lessons ----------

const practiceOf = (lesson: string, make: (rng: Rng) => Made[]) => (rng: Rng): Item[] =>
  make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));

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
    ],
    practice: practiceOf('s1.l1', lesson1Practice),
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
        scene: { kind: 'things', things: L2_EXAMPLES.look },
      },
      {
        title: 'Face-down cards',
        body: ['A face-down card is turned over, so you can’t see it.', 'It could be any shape, any color and any size.'],
      },
      {
        title: 'Can’t tell yet',
        body: [
          '“There is a yellow card.” You can’t see a yellow card. But card 3 is face down, and it could be yellow.',
          'So the honest answer is “can’t tell.” That does not mean false. It means you need more clues.',
        ],
        scene: { kind: 'things', things: L2_EXAMPLES.cant },
      },
      {
        title: 'Sometimes you can tell',
        body: [
          '“There is a red card.” Card 1 is red. So it is true, no matter what card 2 is.',
          '“Every card is red.” Card 3 is blue. So it is false, no matter what.',
        ],
        scene: { kind: 'things', things: L2_EXAMPLES.settled },
      },
      {
        title: 'Try every way',
        body: [
          'Ask two questions. Could the face-down cards make it true? Could they make it false?',
          'If they can only make it true, it is true. If they can only make it false, it is false. If they could do both, you can’t tell yet.',
        ],
      },
    ],
    practice: practiceOf('s1.l2', lesson2Practice),
  },
  {
    id: 's1.l3',
    title: 'The NOT flip',
    ideas: [
      {
        title: 'The opposite',
        body: [
          'The opposite of a statement is true when the statement is false. It is false when the statement is true.',
          'They never agree. One is always true, and the other is false.',
          'Another name for the opposite is the negation.',
        ],
      },
      {
        title: 'A quick trick',
        body: [
          'Put “It is not true that” in front of the statement.',
          '“It is not true that there is a red card” means “No card is red.”',
        ],
      },
      {
        title: 'The every trap',
        body: [
          'What is the opposite of “Every card is red”? Many people say “No card is red.” That is a trap.',
          'Look at these cards. Not every card is red. But “No card is red” is false too.',
          'The real opposite is “At least one card is not red.” One card is enough.',
        ],
        scene: { kind: 'things', things: L3_EXAMPLE },
      },
      {
        title: 'Exactly and more',
        body: [
          'The opposite of “Exactly two cards are red” is “The number of red cards is not two.” It could be more, or it could be fewer.',
          'The opposite of “There are more red cards than blue cards” must include a tie. It is “There are at least as many blue cards as red cards.”',
          'The opposite of “At least two cards are red” is “Fewer than two cards are red.” “At most two” is not it: it still allows exactly two.',
        ],
      },
      {
        title: 'Check your flip',
        body: [
          'Think of a few rows of cards. Check the statement and your opposite in each row. One must be true and the other false.',
          'If both can be true at once, or both can be false at once, it is not the opposite.',
        ],
      },
    ],
    practice: practiceOf('s1.l3', lesson3Practice),
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
      {
        title: 'Other rules',
        body: [
          'Some puzzles have a different rule. “Every sign is false” means no sign tells the truth.',
          'Another rule says the sign on the chest with the treasure is true, and the other signs are false. Try each chest the same way.',
        ],
      },
    ],
    practice: practiceOf('s1.l4', lesson4Practice),
  },
];

// ---------- check and arcade ----------

type Maker = (rng: Rng) => Made;

/** One item from a lesson, in a random skin. */
const ANY: Record<string, Maker> = {
  's1.l1': (rng) => (rng.chance(0.5) ? isThisItem(rng, rng.pick(SKINS), new Set()) : whichItem(rng, rng.pick(SKINS), new Set(), rng.chance(0.5))),
  's1.l2': (rng) => rowItem(rng, { frame: rng.pick(FRAMES), target: rng.pick(['true', 'false', 'cant'] as const) }),
  's1.l3': (rng) => notItem(rng, { frame: rng.pick(FRAMES) }),
  's1.l4': (rng) => signItem(rng, { skin: rng.pick(SIGN_SKINS) }),
};

/** Opposite cases whose sentence is a different kind from every case already used (a different skill tag). */
const unlike = (keys: readonly NotKey[], used: NotKey[]) => keys.filter((k) => !used.some((u) => NOT_TAGS[u] === NOT_TAGS[k]));

/**
 * 9-10 items: 2 on statements, 3 on cards (one a "can't tell" trap), 2 opposites, 2 sign puzzles.
 * No sentence from the bank shows twice, the opposites flip different kinds of sentence, and no two
 * items share a prompt and scene.
 */
function check(rng: Rng): Item[] {
  const frames = (): Frame => rng.pick(FRAMES);
  const one = distinctItems();
  const used: Used = new Set();
  const [s1, s2] = rng.shuffle(SKINS);
  const [r1, r2] = rng.shuffle(SIGN_RULES);
  const [k1, k2] = rng.shuffle(SIGN_SKINS);
  const settled = rng.pick(['true', 'false'] as const);
  const findStatement = rng.chance(0.5);
  // First an every/none trap, then an opposite that is not a trap.
  const nots: NotKey[] = [rng.pick(NOT_CONFLICT_KEYS)];
  nots.push(rng.pick(unlike(NOT_KEYS.filter((k) => !NOT_CONFLICT_KEYS.includes(k)), nots)));
  const planned: [string, Made][] = [
    ['s1.l1', one(() => isThisItem(rng, s1, used))],
    ['s1.l1', one(() => whichItem(rng, s2, used, findStatement))],
    ['s1.l2', one(() => rowItem(rng, { frame: frames(), target: 'cant', conflict: true }))],
    ['s1.l2', one(() => rowItem(rng, { frame: frames(), target: settled }))],
    ['s1.l2', one(() => rowItem(rng, { frame: frames(), target: rng.pick(['true', 'false', 'cant'] as const) }))],
    ['s1.l3', one(() => notItem(rng, { frame: frames(), key: nots[0] }))],
    ['s1.l3', one(() => notItem(rng, { frame: frames(), key: nots[1] }))],
    ['s1.l4', one(() => signItem(rng, { skin: k1, rule: r1 }))],
    ['s1.l4', one(() => signItem(rng, { skin: k2, rule: r2 }))],
  ];
  if (rng.chance(0.5)) {
    const extra = rng.pick(['s1.l1', 's1.l3'] as const);
    // A second "Which of these" item asks the other way round, so its prompt differs.
    const m =
      extra === 's1.l1'
        ? one(() => (rng.chance(0.5) ? isThisItem(rng, rng.pick(SKINS), used) : whichItem(rng, rng.pick(SKINS), used, !findStatement)))
        : one(() => notItem(rng, { frame: frames(), key: rng.pick(unlike(NOT_KEYS, nots)) }));
    planned.splice(extra === 's1.l1' ? 2 : 7, 0, [extra, m]);
  }
  return planned.map(([lesson, m], i) => finish(m, `s1-c${i + 1}`, lesson));
}

function arcade(rng: Rng): Item {
  const lesson = rng.pick(lessons).id;
  return finish(ANY[lesson](rng), 's1-arcade', lesson);
}

export const stop1: StopDef = {
  n: STOP,
  id: 's1',
  title: 'True or False?',
  idea: 'A statement is true or false. Without enough clues, the honest answer is “can’t tell yet.”',
  ready: true,
  lessons,
  check,
  practice: arcade,
};

