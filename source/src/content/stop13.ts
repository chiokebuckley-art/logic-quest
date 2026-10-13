/**
 * Stop 13 · Clues & Chances (id s13; a side-track stop that opens after Spot the Trick).
 * How sure can you be? Counts give a word for a chance; each fair try is new; counts out of 100 say how common
 * something is; a clue tells you a lot only when you would rarely see it if you were wrong; and two things that do not
 * affect each other combine on the same picture: both is one box, either is a row and a column with the overlap once.
 *
 *  l1 Likely, not certain   Ways to Think’s four words from counts; the word comes from the counts, not one draw
 *  l2 Each draw is new       a fair coin has no memory; a draw put back leaves the bag the same (independent), a
 *                            draw kept out changes it
 *  l3 Out of 100             base rates on a count picture: a row, a column, a box; the common group can win
 *  l4 Would I see this clue if I were wrong?   strong and weak clues; false alarms; how often a test is right is
 *                            not how often its yes is right
 *  l5 And, or, with chances  two things that do not affect each other on the count picture: both (and) is one box,
 *                            the first row split into groups; either (or) is a row and a column, the overlap once
 *
 * Every lesson is See -> Do -> Quiz, and every pack holds its trap (the pass rule asks for it): one draw judging the
 * word (one-draw), a streak making something due (due), the rare group picked for a clue (base-rate), a yes from a
 * good test for a rare thing (false-alarm), and adding for both (add-both) or adding for either without taking the
 * overlap away (overlap). Every answer, explanation, hint case and board mark comes from
 * ../engine/puzzles/chances.ts, counts.ts and chanceBoards.ts. The check ends with the why item (pick the reason).
 * The warm-up is a Ways to Think item: a good guess is not a proof.
 */
import {
  BACK_VS_KEPT,
  BOTH_VS_EITHER,
  COUNTS_VS_DRAW,
  JAR,
  RIGHT_VS_FLAG,
  ROW_VS_COLUMN,
  apartCard,
  balloonTwinBoard,
  bothCard,
  bothEitherBoard,
  bothEitherCard,
  commonWinsCard,
  eyesBoard,
  eyesCard,
  farmBoard,
  farmExampleCard,
  farmIntroCard,
  farmTwinBoard,
  flagBoard,
  flagContrastCard,
  flipsBoard,
  flipsCard,
  jarBoard,
  jarContrastCard,
  keptBoard,
  keptContrastCard,
  l1ExampleCard,
  l1WordBoard,
  pairExampleCard,
  rainBoard,
  rainCard,
  rowColumnBoard,
  rowColumnCard,
  trapsCard,
} from '../engine/puzzles/chanceBoards';
import {
  DRAW_FORMS,
  DUE,
  FRAMES,
  NAMES,
  ONE_DRAW,
  bagDueItem,
  bridgeItem,
  coinItem,
  drawItem,
  keptItem,
  pickItem,
  skinsOf,
  wordFor,
  wordItem,
  type ChanceMade,
  type DrawForm,
  type SkinId,
} from '../engine/puzzles/chances';
import {
  ADD_BOTH,
  BASE_RATE,
  CLUE_TOPICS,
  COUNT_SKINS,
  EITHER_FORMS,
  FALSE_ALARM,
  FARM_PIC,
  GROUP_TOPICS,
  OVERLAP,
  PAIR_TOPICS,
  TEST_TOPICS,
  WHY_LESSON,
  alarmItem,
  answerItem,
  bothItem,
  eitherItem,
  fitsItem,
  moreItem,
  ofItem,
  readItem,
  rowTotal,
  strongItem,
  whyItem,
  type CountMade,
  type CountSkin,
  type WhyKind,
} from '../engine/puzzles/counts';
import type { Item, LessonDef, Rng, StopDef } from '../engine/types';

const STOP = 13;

type AnyMade = ChanceMade | CountMade;

/** A made item as a Stop 13 item: its id, lesson and skill (`s13.<tag>`). */
const finish = (m: AnyMade, id: string, lesson: string): Item => ({ id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item }) as Item;

/**
 * Makes the items of one set. No two items in a set look the same: a repeat is thrown away and made again from the
 * same rng, so the same seed still gives the same set.
 */
function distinctItems(): <T extends AnyMade>(make: () => T) => T {
  const seen = new Set<string>();
  const key = (m: AnyMade) => JSON.stringify([m.item.prompt, m.item.scene ?? null, m.item.choices.map((c) => c.label)]);
  return <T extends AnyMade>(make: () => T): T => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}
const practiceOf = (lesson: string, make: (rng: Rng) => AnyMade[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));

const skinIn = (rng: Rng, f: (typeof FRAMES)[number]): SkinId => rng.pick(skinsOf(f));
const anyBagSkin = (rng: Rng): SkinId => skinIn(rng, rng.pick(FRAMES));
const anyCountSkin = (rng: Rng): CountSkin => rng.pick(COUNT_SKINS);

// ---------- Lesson 1: likely, not certain ----------

const l1: LessonDef = {
  id: 's13.l1',
  title: 'Likely, not certain',
  ideas: [
    {
      title: 'Four words for how sure',
      body: [
        'In Ways to Think, you met four words for how sure you can be. They come from counts.',
        'Must: every one fits. Likely: more fit than not, but not every one. Unlikely: some fit, but fewer than the rest. Can’t: none fit.',
        'In this stop, you use counts to judge chances and clues.',
      ],
    },
    {
      title: 'Likely is not certain',
      scene: { kind: 'text', lines: ['In the jar:', `${JAR.lemon} lemon drops`, `${JAR.cherry} cherry drop`] },
      body: [
        `A jar has ${JAR.lemon} lemon drops and ${JAR.cherry} cherry drop. Rosa takes one without looking, then puts it back.`,
        `Lemon is ${wordFor(JAR.lemon, JAR.lemon + JAR.cherry) === 'likely' ? 'likely' : 'not likely'}: ${JAR.lemon} of the ${JAR.lemon + JAR.cherry} are lemon. But lemon is not certain. Certain means it must happen.`,
        'The cherry drop can still come out. Likely things do not always happen, and unlikely things sometimes do.',
      ],
    },
    // The contrast (one draw vs the counts) first, and its board right after it.
    jarContrastCard(),
    // Then See: the worked bag, every shape sentence marked. Its board comes right after it.
    l1ExampleCard(),
    {
      title: 'A lucky draw is not a right word',
      body: [
        'Ned says, “It must be lemon.” Out comes lemon. Was Must the right word?',
        `No. The jar has ${JAR.cherry} cherry drop, so lemon was only likely. Ned got the drop he said, but not the right word.`,
        'So judge a word by the counts, never by one draw. Ask: what does the jar hold?',
      ],
    },
  ],
  drill: [jarBoard(2), l1WordBoard(3)],
  distinctions: [COUNTS_VS_DRAW],
  terms: [
    { term: 'likely', means: 'More fit than not, but not every one. A likely thing can still fail to happen.' },
    { term: 'certain', also: 'must', means: 'It has to happen, because every one fits.' },
  ],
  practice: practiceOf('s13.l1', (rng) => {
    const one = distinctItems();
    const names = rng.shuffle([...NAMES]);
    const frames = [...rng.shuffle(FRAMES), rng.pick(FRAMES)];
    // A gentle word item, then a bag to pick, then the trap twice: a word right against the draw, and a word wrong with it.
    return [
      one(() => wordItem(rng, skinIn(rng, frames[0]), { name: names[0] })),
      one(() => pickItem(rng, skinIn(rng, frames[1]), { name: names[1] })),
      one(() => drawItem(rng, skinIn(rng, frames[2]), { form: rng.pick<DrawForm>(['surprise', 'rare']), name: names[2] })),
      one(() => drawItem(rng, skinIn(rng, frames[3]), { form: rng.pick<DrawForm>(['lucky', 'never']), name: names[3] })),
    ];
  }),
  pass: { firstTry: 3, include: [ONE_DRAW] },
};

// ---------- Lesson 2: each draw is new ----------

const WES_BAG = { red: 5, blue: 2 } as const;
const l2: LessonDef = {
  id: 's13.l2',
  title: 'Each draw is new',
  ideas: [
    {
      title: 'A coin has no memory',
      body: [
        'A fair coin lands heads or tails. Each side has the same chance: 1 in 2.',
        'Say it lands heads 5 times in a row. Is tails due now? “Due” means it has to come soon.',
        'No. The coin does not know what came before. Each flip is new, so tails is still 1 in 2.',
      ],
    },
    {
      title: 'Each draw is new',
      body: [
        'A bag works the same way when each draw goes back. The bag is the same every time.',
        'So past draws do not change the chances. Nothing is ever due.',
        'Grown-ups call tries like this independent. It means each one is new.',
      ],
    },
    // The contrast (put back vs kept out) first, and its board right after it.
    keptContrastCard(),
    // Then See: every way two flips can go. Its twin board (three flips) comes right after it.
    flipsCard(),
    {
      title: 'A streak does not change the bag',
      body: [
        `Wes draws from a bag of ${WES_BAG.red} red and ${WES_BAG.blue} blue marbles. He gets red four times, putting each one back.`,
        `The bag still has ${WES_BAG.red} red and ${WES_BAG.blue} blue. So blue is still ${wordFor(WES_BAG.blue, WES_BAG.red + WES_BAG.blue) === 'unlikely' ? 'unlikely' : 'the same'}, not due.`,
        'A streak tells you what came out. Only a draw kept out changes what is in the bag.',
      ],
    },
  ],
  drill: [keptBoard(2), flipsBoard(3)],
  distinctions: [BACK_VS_KEPT],
  terms: [{ term: 'independent', also: 'each draw is new', means: 'Each try is new: what came before does not change its chances.' }],
  practice: practiceOf('s13.l2', (rng) => {
    const one = distinctItems();
    const names = rng.shuffle([...NAMES]);
    const frames = rng.shuffle(FRAMES);
    // The coin trap first, a bag that changes, Ways to Think’s streak trap, then two kids: put back or kept out.
    return [
      one(() => coinItem(rng)),
      one(() => keptItem(rng, skinIn(rng, frames[0]), { form: 'word', names: [names[0]] })),
      one(() => bagDueItem(rng, skinIn(rng, frames[1]), { name: names[1] })),
      one(() => keptItem(rng, skinIn(rng, frames[2]), { form: 'which', names: [names[2], names[3]] })),
    ];
  }),
  pass: { firstTry: 3, include: [DUE] },
};

// ---------- Lesson 3: out of 100 ----------

const l3: LessonDef = {
  id: 's13.l3',
  title: 'Out of 100',
  ideas: [
    {
      title: 'How common is it?',
      body: [
        `Picture 100 animals on a farm. ${rowTotal(FARM_PIC.cells, 0)} of them are goats, and ${rowTotal(FARM_PIC.cells, 1)} are sheep.`,
        `How common something is in the whole group is its base rate. Here the base rate of goats is ${rowTotal(FARM_PIC.cells, 0)} out of 100.`,
        'So goats are rare on this farm, and sheep are common. Always start with how common each group is.',
      ],
    },
    farmIntroCard(),
    // The contrast (out of a row, or out of a column) first, and its board right after it.
    rowColumnCard(),
    // Then See: the farm picture read. Its board (the same picture) comes right after it.
    farmExampleCard(),
    // The trap, worked: the common group wins. Its twin board (more goats) comes right after it.
    commonWinsCard(),
  ],
  drill: [rowColumnBoard(2), farmBoard(3), farmTwinBoard(4)],
  distinctions: [ROW_VS_COLUMN],
  terms: [{ term: 'base rate', also: 'how common it is', means: 'How common something is in the whole group, as a count such as 10 out of 100.' }],
  practice: practiceOf('s13.l3', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b, c] = rng.shuffle(COUNT_SKINS);
    // Read a part, which group the clue is more common in, the trap, then out of the column.
    return [
      one(() => readItem(rng, { skin: a, avoid: used })),
      one(() => fitsItem(rng, { skin: b, avoid: used })),
      one(() => moreItem(rng, { skin: c, avoid: used, want: 'common' })),
      one(() => ofItem(rng, { skin: anyCountSkin(rng), avoid: used })),
    ];
  }),
  pass: { firstTry: 3, include: [BASE_RATE] },
};

// ---------- Lesson 4: how often would I see this clue if I were wrong? ----------

const l4: LessonDef = {
  id: 's13.l4',
  title: 'Would I see this clue if I were wrong?',
  ideas: [
    {
      title: 'A clue you would see anyway',
      body: [
        'Otto thinks his friend Bea is home, because her bike is out front.',
        'Ask: how often is the bike out front when Bea is not home? Bea walks to school most days and leaves the bike there.',
        'Then the bike tells Otto little. He would see it often even if he were wrong.',
      ],
    },
    // See: a weak clue and a strong one, counted. Its board comes right after it.
    rainCard(),
    // The contrast (right for most, or right when it flags) first, and its board right after it.
    flagContrastCard(),
    // Then See: the eye check, every box counted. Its twin board (more false alarms) comes right after it.
    eyesCard(),
    {
      title: 'Rare things and false alarms',
      body: [
        'When something is rare, even a good test gives many false alarms.',
        'Most kids see fine. A few mistakes on all of them add up to more flags than the few kids who need glasses.',
        'So when a test says yes, ask: how often would it say yes if the answer were no?',
      ],
    },
  ],
  drill: [rainBoard(1), flagBoard(2), eyesBoard(3)],
  distinctions: [RIGHT_VS_FLAG],
  terms: [
    { term: 'false alarm', means: 'A yes from a test or a clue when the answer is really no.' },
    { term: 'strong clue', means: 'A clue you would rarely see if you were wrong. Seeing it tells you a lot.' },
  ],
  practice: practiceOf('s13.l4', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b, c] = rng.shuffle(COUNT_SKINS);
    // Which clue tells more, out of the yes column, the trap, then why (a weak clue, or a false alarm).
    return [
      one(() => strongItem(rng, { skin: a, avoid: used })),
      one(() => answerItem(rng, { skin: b, avoid: used })),
      one(() => alarmItem(rng, { skin: c, avoid: used, want: 'rare' })),
      one(() => whyItem(rng, { kind: rng.pick<WhyKind>(['weak', 'alarm']), skin: anyCountSkin(rng), avoid: used })),
    ];
  }),
  pass: { firstTry: 3, include: [FALSE_ALARM] },
};

// ---------- Lesson 5: and, or, with chances ----------

const l5: LessonDef = {
  id: 's13.l5',
  title: 'And, or, with chances',
  ideas: [
    // See: both at once, on the balloon picture. Then why both comes from one row when the two things do not affect each other.
    bothCard(),
    apartCard(),
    // The contrast (both, or either) first, and its board right after it.
    bothEitherCard(),
    // Then See: both, then either, worked step by step. Its twin board (more red balloons, the boxes blank) comes right after it.
    pairExampleCard(),
    trapsCard(),
  ],
  drill: [bothEitherBoard(2), balloonTwinBoard(3)],
  distinctions: [BOTH_VS_EITHER],
  terms: [
    { term: 'both', also: 'and', means: 'Two things at once, like red and big. On a count picture, it is one box.' },
    { term: 'either', also: 'or', means: 'One thing, the other, or both. On a count picture, it is a row and a column, with their shared box counted once.' },
    { term: 'overlap', means: 'The ones in a row and in a column at once: the box where they meet. Count it only once.' },
  ],
  practice: practiceOf('s13.l5', (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const [a, b, c] = rng.shuffle(COUNT_SKINS);
    // Both, then either on a whole picture, then both again, then either from the rows (both first, then either).
    return [
      one(() => bothItem(rng, { skin: a, avoid: used })),
      one(() => eitherItem(rng, { skin: b, avoid: used, form: 'picture' })),
      one(() => bothItem(rng, { skin: c, avoid: used })),
      one(() => eitherItem(rng, { skin: anyCountSkin(rng), avoid: used, form: 'rows' })),
    ];
  }),
  pass: { firstTry: 3, include: [ADD_BOTH, OVERLAP] },
};

const lessons = [l1, l2, l3, l4, l5];

// ---------- check, Arcade, new examples, warm-up ----------

/**
 * 10 items: two from each of Lessons 1 to 4 in order (a trap first in each pair: every trap is a conflict item), one
 * from Lesson 5 (both or either, each a trap), then the why item last.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const used = new Set<string>();
  const plan: [string, AnyMade][] = [
    ['s13.l1', one(() => drawItem(rng, anyBagSkin(rng), { form: rng.pick(DRAW_FORMS) }))],
    ['s13.l1', one(() => (rng.chance(0.5) ? wordItem(rng, anyBagSkin(rng)) : pickItem(rng, anyBagSkin(rng))))],
    ['s13.l2', one(() => (rng.chance(0.5) ? coinItem(rng) : bagDueItem(rng, anyBagSkin(rng))))],
    ['s13.l2', one(() => keptItem(rng, anyBagSkin(rng)))],
    ['s13.l3', one(() => moreItem(rng, { skin: anyCountSkin(rng), avoid: used, want: 'common' }))],
    ['s13.l3', one(() => rng.pick([readItem, fitsItem, ofItem])(rng, { skin: anyCountSkin(rng), avoid: used }))],
    ['s13.l4', one(() => alarmItem(rng, { skin: anyCountSkin(rng), avoid: used, want: 'rare' }))],
    ['s13.l4', one(() => (rng.chance(0.5) ? strongItem(rng, { skin: anyCountSkin(rng), avoid: used }) : answerItem(rng, { skin: anyCountSkin(rng), avoid: used })))],
    ['s13.l5', one(() => (rng.chance(0.5) ? bothItem(rng, { skin: anyCountSkin(rng), avoid: used }) : eitherItem(rng, { skin: anyCountSkin(rng), avoid: used, form: rng.pick(EITHER_FORMS) })))],
  ];
  const why = one(() => whyItem(rng, { avoid: used }));
  const kind = why.model.t === 'why' ? why.model.kind : 'alarm';
  plan.push([WHY_LESSON[kind], why]);
  return plan.map(([lesson, m], i) => finish(m, `s${STOP}-c${i + 1}`, lesson));
}

/** One Arcade item from any lesson. */
const ARCADE: [string, (rng: Rng) => AnyMade][] = [
  ['s13.l1', (rng) => wordItem(rng, anyBagSkin(rng))],
  ['s13.l1', (rng) => pickItem(rng, anyBagSkin(rng))],
  ['s13.l1', (rng) => drawItem(rng, anyBagSkin(rng))],
  ['s13.l2', (rng) => coinItem(rng)],
  ['s13.l2', (rng) => bagDueItem(rng, anyBagSkin(rng))],
  ['s13.l2', (rng) => keptItem(rng, anyBagSkin(rng))],
  ['s13.l3', (rng) => readItem(rng, { skin: anyCountSkin(rng) })],
  ['s13.l3', (rng) => fitsItem(rng, { skin: anyCountSkin(rng) })],
  ['s13.l3', (rng) => moreItem(rng, { skin: anyCountSkin(rng), want: 'any' })],
  ['s13.l3', (rng) => ofItem(rng, { skin: anyCountSkin(rng) })],
  ['s13.l4', (rng) => strongItem(rng, { skin: anyCountSkin(rng) })],
  ['s13.l4', (rng) => answerItem(rng, { skin: anyCountSkin(rng) })],
  ['s13.l4', (rng) => alarmItem(rng, { skin: anyCountSkin(rng), want: rng.pick(['rare', 'common'] as const) })],
  ['s13.l4', (rng) => whyItem(rng)],
  ['s13.l5', (rng) => bothItem(rng, { skin: anyCountSkin(rng) })],
  ['s13.l5', (rng) => eitherItem(rng, { skin: anyCountSkin(rng) })],
];
function arcade(rng: Rng): Item {
  const [lesson, make] = rng.pick(ARCADE);
  const m = make(rng);
  return finish(m, `s${STOP}-arcade`, m.tag === 'why' && m.model.t === 'why' ? WHY_LESSON[m.model.kind] : lesson);
}

/**
 * The topic a count item was about, so a new example is about another one in the same skin. Its opening line and its
 * picture’s first column together name it: a group topic and a test topic can share an opening line (“A deck has 100
 * cards.”), but never a column. A Lesson 5 topic has an opening line of its own.
 */
function topicOf(it: Item): { id: string; skin: CountSkin } | undefined {
  const col = it.scene?.kind === 'counts' ? it.scene.cols[0] : undefined;
  return (
    GROUP_TOPICS.find((t) => it.prompt.startsWith(t.setting) && col === t.clue.yes) ??
    TEST_TOPICS.find((t) => it.prompt.startsWith(t.setting) && col === t.test.yesCol) ??
    CLUE_TOPICS.find((t) => it.prompt.startsWith(t.question)) ??
    PAIR_TOPICS.find((t) => it.prompt.startsWith(t.setting))
  );
}

/** Which why item an item is, by its right choice. */
const WHY_BY_ANSWER: Record<string, WhyKind> = { new: 'due', count: 'common', alarms: 'alarm', often: 'weak' };

/**
 * New examples after a miss. A missed trap gets a pair whose answers differ (a word right against the draw and a word
 * wrong with it; a coin and a bag that does change; the common group winning and the rare one; mostly false alarms
 * and mostly right; both and either about another topic, so adding never passes the set), so repeating one answer
 * never passes the set. Other kinds get one new item of the same kind about another topic.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  if (missed.kind !== 'choose') return [];
  const make = (m: AnyMade) => finish(m, 'new', m.tag === 'why' && m.model.t === 'why' ? WHY_LESSON[m.model.kind] : missed.lesson);
  const ids = missed.choices.map((c) => c.id);
  const was = topicOf(missed);
  const skin: CountSkin = was?.skin ?? anyCountSkin(rng);
  const avoid = new Set(was ? [was.id] : []);
  switch (missed.skill) {
    case `s${STOP}.likely`:
      if (ids.includes('outcome')) {
        return [make(drawItem(rng, anyBagSkin(rng), { form: rng.pick<DrawForm>(['surprise', 'rare']) })), make(drawItem(rng, anyBagSkin(rng), { form: rng.pick<DrawForm>(['lucky', 'never']) }))];
      }
      if (missed.prompt.includes('Here are four bags')) return [make(pickItem(rng, anyBagSkin(rng)))];
      return [make(wordItem(rng, anyBagSkin(rng)))];
    case `s${STOP}.due`:
      if (ids.includes('streak')) return [make(coinItem(rng)), make(keptItem(rng, anyBagSkin(rng), { form: 'which', keep: 'one' }))];
      if (ids.includes('first') || missed.prompt.includes('keep')) return [make(keptItem(rng, anyBagSkin(rng), { form: 'word' })), make(keptItem(rng, anyBagSkin(rng), { form: 'which' }))];
      return [make(bagDueItem(rng, anyBagSkin(rng))), make(keptItem(rng, anyBagSkin(rng), { form: 'word' }))];
    case `s${STOP}.hundred`:
      if (ids.includes('sure')) return [make(moreItem(rng, { skin, avoid, want: 'common' })), make(moreItem(rng, { skin, avoid, want: 'rare' }))];
      if (ids.includes('other')) return [make(ofItem(rng, { skin, avoid }))];
      if (ids.includes('same')) return [make(fitsItem(rng, { skin, avoid }))];
      return [make(readItem(rng, { skin, avoid }))];
    case `s${STOP}.clue`:
      if (ids.includes('has')) return [make(alarmItem(rng, { skin, avoid, want: 'rare' })), make(alarmItem(rng, { skin, avoid, want: 'common' }))];
      if (ids.includes('none')) return [make(strongItem(rng, { skin, avoid }))];
      return [make(answerItem(rng, { skin, avoid }))];
    case `s${STOP}.both`:
      return [make(bothItem(rng, { skin, avoid })), make(eitherItem(rng, { skin, avoid, form: rng.pick(EITHER_FORMS) }))];
    case `s${STOP}.either`:
      return [make(eitherItem(rng, { skin, avoid, form: rng.pick(EITHER_FORMS) })), make(bothItem(rng, { skin, avoid }))];
    case `s${STOP}.why`: {
      const kind = WHY_BY_ANSWER[missed.answer] ?? 'alarm';
      const other = rng.pick((['due', 'common', 'alarm', 'weak'] as WhyKind[]).filter((k) => k !== kind));
      return [make(whyItem(rng, { kind, skin, avoid })), make(whyItem(rng, { kind: other, skin, avoid }))];
    }
    default:
      return [];
  }
}

/**
 * The warm-up: a Ways to Think item on a good guess that is not a proof (a streak broken, what you know for sure, or a
 * best guess ruled out). It is finished as a Stop 13 item, because a side-track stop’s warm-up belongs to it or to the
 * stop it opens after.
 */
function bridge(rng: Rng): Item {
  return finish(bridgeItem(rng), `s${STOP}-warm`, 's13.l1');
}

export const stop13: StopDef = {
  n: STOP,
  id: 's13',
  title: 'Clues & Chances',
  idea: 'Ask how often you would see a clue if you were wrong.',
  ready: true,
  sideTrack: true,
  requires: ['s12'],
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  bridgeFrom: 's7',
  skillNames: {
    's13.likely': 'Clues & Chances: likely is not certain, and the word comes from the counts',
    's13.due': 'Clues & Chances: each draw is new, so nothing is due',
    's13.hundred': 'Clues & Chances: counts out of 100 and how common each group is',
    's13.clue': 'Clues & Chances: how often you would see a clue if you were wrong',
    's13.why': 'Clues & Chances: why a chance or a clue comes out as it does',
    's13.both': 'Clues & Chances: both at once, for two things that do not affect each other (one box)',
    's13.either': 'Clues & Chances: either, a row and a column with the overlap counted once',
    's13.guess': 'Clues & Chances warm-up: a good guess is not a proof (from Ways to Think)',
  },
};
