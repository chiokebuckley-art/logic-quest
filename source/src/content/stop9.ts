/**
 * Stop 9 · Truth Tables (id s9, n 9; shown as Stop 10 on the Journey).
 * A truth table lists every case, one row each, and gives each sentence a column of True and False. Two sentences
 * mean the same when their columns match in every row; a sentence is always true when its column is all True.
 *
 *  l1 Every case in rows        one sentence 2 rows, two 4, three 8; trap: the right count with a row twice
 *  l2 Tables for NOT, AND, OR   fill a column by its rule, small parts first; trap: OR in the row where both are true
 *  l3 The IF table              false only when the IF part is true and the THEN part false; trap: P false, Q false
 *  l4 Same meaning              columns match in every row (NOT (A AND B), flip and NOT); trap: NOT A AND NOT B
 *  l5 Always true, never true   all True, all False, or some of each; trap: true in most rows is not always true
 *
 * Every lesson is See -> Do -> Quiz. Every answer, explanation, hint case and board mark comes from the table model in
 * ../engine/puzzles/tables.ts (with Stop 6's ROWS for the IF table and Stop 2's rules.ts for card rules); the boards
 * and contrast cards are in ../engine/puzzles/tableBoards.ts. The check ends with a why item. The warm-up (bridge) is a
 * Stop 2 card case: does this card fit NOT (A AND B)?
 */
import {
  ALWAYS_SEN,
  CONTRA,
  DEMORGAN,
  HELPER_SEN,
  IF_SEN,
  L1_TOPIC,
  L3_TOPIC,
  NEVER_SEN,
  SOME_VS_EVERY,
  COUNT_VS_CASES,
  IF_FALSE_VS_BROKEN,
  WORKED_ALWAYS,
  alwaysBoard,
  alwaysScene,
  andOrBoard,
  andScene,
  contraScene,
  countBoard,
  countContrastCard,
  deMorganScene,
  eightRowsBoard,
  flipBoard,
  fourRowsBoard,
  helperBoard,
  helperScene,
  ifBreakScene,
  ifContrastCard,
  ifFalseBoard,
  ifScene,
  ifStoryBoard,
  ifStoryScene,
  mostBoard,
  mostScene,
  neverScene,
  notScene,
  oneScene,
  orScene,
  someBoard,
  someContrastCard,
  tableScratch,
  threeScene,
  twoScene,
  workedAlwaysScene,
} from '../engine/puzzles/tableBoards';
import {
  ABC,
  IF_FALSE,
  MOST_ROWS,
  NOT_EACH,
  OR_BOTH,
  PQ,
  REPEAT_ROW,
  WHY_LESSON,
  bridgeItem,
  breakRowItem,
  cardsSameItem,
  cellItem,
  colLabel,
  column,
  columnItem,
  countItem,
  diffRowItem,
  ifCellItem,
  ifColumnItem,
  kindItem,
  missingItem,
  orBothItem,
  pickAlwaysItem,
  pickSameItem,
  repeatItem,
  rowsWord,
  sameItem,
  quote,
  whyItem,
  type Made,
  type Skin,
  type WhyKind,
} from '../engine/puzzles/tables';
import type { ChooseItem, Item, LessonDef, Rng, StopDef } from '../engine/types';

const STOP = 9;
const SKINS: readonly Skin[] = ['letters', 'everyday', 'fantasy'];

/**
 * A made item as a Stop 9 item: its id, lesson and skill (`s9.<tag>`). A question with blank boxes in its table also
 * carries the table board, a thinking board to fill them by taps (never checked).
 */
function finish(m: Made, id: string, lesson: string): ChooseItem {
  const board = tableScratch(m);
  return { id, stop: STOP, lesson, skill: `s${STOP}.${m.tag}`, ...m.item, ...(board ? { scratch: board, scratchLabel: 'the table board' } : {}) };
}

/**
 * Makes the items of one set. No two items in a set share a prompt, scene and choices: a repeat is thrown away and made
 * again from the same rng, so the same seed still gives the same set.
 */
function distinctItems(): (make: () => Made) => Made {
  const seen = new Set<string>();
  const key = (m: Made) => JSON.stringify([m.item.prompt, m.item.scene ?? null, m.item.choices.map((c) => c.label)]);
  return (make) => {
    let m = make();
    for (let i = 0; i < 80 && seen.has(key(m)); i++) m = make();
    seen.add(key(m));
    return m;
  };
}

/** k skins for a pack: the three in a new order, repeated as needed, so a pack always has two or more. */
function packSkins(rng: Rng, k: number): Skin[] {
  const order = rng.shuffle(SKINS);
  return Array.from({ length: k }, (_, i) => order[i % order.length]);
}

const practiceOf = (lesson: string, make: (rng: Rng) => Made[]) => (rng: Rng): Item[] => make(rng).map((m, i) => finish(m, `${lesson}-p${i + 1}`, lesson));

// ---------- the lessons ----------

const L1 = 's9.l1', L2 = 's9.l2', L3 = 's9.l3', L4 = 's9.l4', L5 = 's9.l5';
const [rain, coat] = L1_TOPIC.parts;
const ifCol = colLabel(column(IF_SEN, 2));
const [DM, DM2] = DEMORGAN;
const [IFAB, CONTRA2] = CONTRA;

const l1: LessonDef = {
  id: L1,
  title: 'Every case in rows',
  ideas: [
    {
      title: 'A table of cases',
      body: [
        'A sentence can be true or false. Which one it is depends on the case.',
        'A truth table lists every case. Each row is one case: one way things could be.',
        'Each column is one sentence. Each box says True or False for that sentence in that row.',
      ],
    },
    {
      title: 'One sentence, two rows',
      scene: oneScene(),
      body: [`Say A is the sentence “${rain.yes.charAt(0).toUpperCase()}${rain.yes.slice(1)}.” There are two cases.`, `In row 1, A is true: ${rain.yes}. In row 2, A is false: ${rain.no}.`, 'That is every case for one sentence.'],
    },
    {
      title: 'Two sentences, four rows',
      scene: twoScene(),
      body: [
        `Now add B: “${coat.yes}.”`,
        'For each case of A, B can be true or false. So each row splits in two, and two rows become four.',
        'Row 1: both true. Row 2: only A true. Row 3: only B true. Row 4: both false.',
      ],
    },
    {
      title: 'Three sentences, eight rows',
      scene: threeScene(),
      body: [
        'Each new sentence doubles the rows. One sentence makes 2 rows, two make 4, and three make 8.',
        'Use a pattern so no case is missed. A is True in the top half and False in the bottom half.',
        'B takes turns in pairs: two True, then two False. C takes turns one at a time.',
      ],
    },
    countContrastCard(),
  ],
  drill: [fourRowsBoard(), eightRowsBoard(), countBoard()],
  distinctions: [COUNT_VS_CASES],
  terms: [
    { term: 'truth table', means: 'A list of every case, with one row for each case and one column for each sentence.' },
    { term: 'row', means: 'One case: one way the sentences can be true or false.', also: 'a case' },
  ],
  // The quiz: a count, a missing case, the trap (a table with a row twice), then a missing case of three or a whole table.
  practice: practiceOf(L1, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => countItem(rng, { skin: s[0], avoid: used })),
      one(() => missingItem(rng, { skin: s[1], avoid: used, n: 2 })),
      one(() => repeatItem(rng, { skin: s[2], avoid: used })),
      one(() => (rng.chance(0.5) ? missingItem(rng, { skin: s[3], avoid: used, n: 3 }) : repeatItem(rng, { skin: s[3], avoid: used, complete: true }))),
    ];
  }),
  pass: { firstTry: 3, include: [REPEAT_ROW] },
};

const l2: LessonDef = {
  id: L2,
  title: 'Tables for NOT, AND, OR',
  ideas: [
    {
      title: 'NOT flips each row',
      scene: notScene(),
      body: ['NOT A is true when A is false. It is false when A is true.', 'So the NOT A column is the A column flipped. True becomes False, and False becomes True.'],
    },
    {
      title: 'AND needs both',
      scene: andScene(),
      body: ['A AND B is true only when A is true and B is true.', 'That happens in just one row: row 1. In every other row, at least one part is false.'],
    },
    {
      title: 'OR needs one or both',
      scene: orScene(),
      body: ['A OR B is true when A is true, when B is true, or when both are true.', 'It is false in just one row: row 4, where both parts are false.', 'Remember from NOT, AND, OR: OR includes both. So row 1 is True.'],
    },
    {
      title: 'Example: a helper column',
      scene: helperScene(),
      body: [
        'A longer sentence is made of small parts. Fill each small part in its own column first.',
        `For ${quote(HELPER_SEN, ABC, ',')} fill NOT B first. It flips B in each row.`,
        `Then look across each row. AND needs A and NOT B both true. That happens only in ${rowsWord(column(HELPER_SEN, 2).flatMap((v, k) => (v ? [k] : [])))}.`,
      ],
    },
  ],
  drill: [andOrBoard(), helperBoard()],
  // The quiz: a column for AND or OR, the trap (OR when both parts are true), a column with a helper, and one more box.
  practice: practiceOf(L2, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => columnItem(rng, { skin: s[0], avoid: used, family: 'single' })),
      one(() => orBothItem(rng, { skin: s[1], avoid: used })),
      one(() => columnItem(rng, { skin: s[2], avoid: used, family: 'helper' })),
      one(() => cellItem(rng, { skin: s[3], avoid: used, tag: 'fill', row: rng.int(1, 3) })),
    ];
  }),
  pass: { firstTry: 3, include: [OR_BOTH] },
};

const l3: LessonDef = {
  id: L3,
  title: 'The IF table',
  ideas: [
    {
      title: 'The IF table',
      scene: ifScene(),
      body: [
        `${quote(IF_SEN, PQ)} has two parts. P is the IF part. Q is the THEN part.`,
        `Its table has four rows, like any two sentences. The IF column reads ${ifCol}.`,
        'In If… then, you met four boxes. Each box is one row here.',
      ],
    },
    {
      title: 'False in one row only',
      scene: ifBreakScene(),
      body: [`${quote(IF_SEN, PQ)} is false only when P is true and Q is false. That is row 2.`, 'The IF part happened, but the THEN part did not. That breaks it.'],
    },
    ifContrastCard(),
    {
      title: 'Example: the coat rule',
      scene: ifStoryScene(),
      body: [
        `Here is a rule: IF ${L3_TOPIC.parts[0].yes}, THEN ${L3_TOPIC.parts[1].yes}.`,
        `Row 2: ${L3_TOPIC.parts[0].yes}, but ${L3_TOPIC.parts[1].no}. That breaks the rule, so its box is False.`,
        `Rows 3 and 4: ${L3_TOPIC.parts[0].no}. The rule asks for nothing, so both boxes are True.`,
      ],
    },
  ],
  drill: [ifFalseBoard(), ifStoryBoard()],
  distinctions: [IF_FALSE_VS_BROKEN],
  // The quiz: the IF column, the trap (a row where P is false), the row that breaks a story rule, and a row where P is true.
  practice: practiceOf(L3, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => ifColumnItem(rng, { skin: s[0], avoid: used })),
      one(() => ifCellItem(rng, { skin: s[1], avoid: used, row: rng.pick([2, 3, 3]) })),
      one(() => breakRowItem(rng, { skin: s[2], avoid: used })),
      one(() => ifCellItem(rng, { skin: s[3], avoid: used, row: rng.pick([0, 1]) })),
    ];
  }),
  pass: { firstTry: 3, include: [IF_FALSE] },
};

const l4: LessonDef = {
  id: L4,
  title: 'Same meaning',
  ideas: [
    {
      title: 'Same meaning',
      body: [
        'Two sentences mean the same when their columns match in every row.',
        'Then in every case, one is true just when the other is true.',
        'Grown-ups call two such sentences equivalent.',
      ],
    },
    {
      title: 'NOT (A AND B)',
      scene: deMorganScene(),
      body: [
        `Do the brackets first. A AND B is true only in row 1. NOT flips that: ${colLabel(column(DM, 2))}.`,
        `Now ${quote(DM2, ABC, '.')} It is true when A is false or B is false. That is ${rowsWord(column(DM2, 2).flatMap((v, k) => (v ? [k] : [])))}.`,
        'The columns match in every row. So the two sentences mean the same.',
      ],
    },
    someContrastCard(),
    {
      title: 'Flip and NOT',
      scene: contraScene(),
      body: [
        'In If… then, you learned that flip and NOT keeps the meaning. A table shows why.',
        `${quote(IFAB, ABC)} is false only in row 2. ${quote(CONTRA2, ABC)} is false only in row 2 too.`,
        'Every other row is True for both. The columns match, so they mean the same.',
      ],
    },
    {
      title: 'Back to the cards',
      body: [
        'In NOT, AND, OR, two card rules meant the same when they fit the same cards.',
        'A table checks the same thing. Each row is one kind of card, such as red and big.',
        'If the columns match in every row, every card fits both rules or neither.',
      ],
    },
  ],
  drill: [someBoard(), flipBoard()],
  distinctions: [SOME_VS_EVERY],
  terms: [{ term: 'equivalent', means: 'Two sentences are equivalent when their columns match in every row.', also: 'same meaning' }],
  // The quiz: a pair that means the same, the trap (the NOT on each part), which one means the same, and a pair that
  // differs in one row (or two card rules).
  practice: practiceOf(L4, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => sameItem(rng, { skin: s[0], avoid: used, want: true })),
      one(() => sameItem(rng, { skin: s[1], avoid: used, trap: true })),
      one(() => pickSameItem(rng, { skin: s[2], avoid: used })),
      one(() => (rng.chance(0.5) ? diffRowItem(rng, { skin: s[3], avoid: used }) : cardsSameItem(rng))),
    ];
  }),
  pass: { firstTry: 3, include: [NOT_EACH] },
};

const l5: LessonDef = {
  id: L5,
  title: 'Always true, never true',
  ideas: [
    {
      title: 'Always true',
      scene: alwaysScene(),
      body: [`${quote(ALWAYS_SEN, ABC)} is True in every row. When A is false, NOT A is true.`, 'A sentence that is True in every row is always true. Grown-ups call it a tautology.'],
    },
    {
      title: 'Never true',
      scene: neverScene(),
      body: [`${quote(NEVER_SEN, ABC)} asks A to be true and false at once. No row can do that.`, 'A sentence that is False in every row is never true. Grown-ups call it a contradiction.'],
    },
    {
      title: 'Most rows is not every row',
      scene: mostScene(),
      distinction: SOME_VS_EVERY.id,
      body: [
        'A OR B is True in three rows of four. That is a lot, but it is not every row.',
        'One False row is enough to say it is not always true. A OR B is sometimes true.',
        'It is the same idea as in Lesson 4: every row, not most rows.',
      ],
    },
    {
      title: 'Example: always true',
      scene: workedAlwaysScene(),
      body: [
        `Take ${quote(WORKED_ALWAYS, ABC, '.')} Its IF part is A AND B.`,
        'In row 1, the IF part is true, and A is true too. So that row is True.',
        'In rows 2, 3 and 4, the IF part is false, so nothing breaks it. It is True in every row: always true.',
      ],
    },
  ],
  drill: [alwaysBoard(), mostBoard()],
  distinctions: [{ ...SOME_VS_EVERY, taughtIn: L4 }],
  terms: [
    { term: 'tautology', means: 'A sentence that is true in every row of its table.', also: 'always true' },
    { term: 'contradiction', means: 'A sentence that is false in every row of its table.', also: 'never true' },
  ],
  // The quiz: an always-true sentence, the trap (true in most rows), which one is always true, and one never true.
  practice: practiceOf(L5, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => kindItem(rng, { skin: s[0], avoid: used, want: 'always' })),
      one(() => kindItem(rng, { skin: s[1], avoid: used, want: 'most' })),
      one(() => pickAlwaysItem(rng, { skin: s[2], avoid: used })),
      one(() => kindItem(rng, { skin: s[3], avoid: used, want: rng.pick(['never', 'sometimes'] as const) })),
    ];
  }),
  pass: { firstTry: 3, include: [MOST_ROWS] },
};

const lessons = [l1, l2, l3, l4, l5];

// ---------- check, Arcade, new examples, warm-up ----------

/**
 * 10 items: two from each of Lessons 1 to 4 and one from Lesson 5, then the why item last. The conflict items: the
 * table with a row twice, OR when both parts are true, a row where the IF part is false, and the NOT on each part.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const used = new Set<string>();
  const skin = () => rng.pick(SKINS);
  const why = rng.pick<WhyKind>(['same', 'differ', 'if-row', 'always']);
  const plan: [string, () => Made][] = [
    [L1, () => (rng.chance(0.5) ? countItem(rng, { skin: skin(), avoid: used }) : missingItem(rng, { skin: skin(), avoid: used }))],
    [L1, () => repeatItem(rng, { skin: skin(), avoid: used })],
    [L2, () => columnItem(rng, { skin: skin(), avoid: used })],
    [L2, () => orBothItem(rng, { skin: skin(), avoid: used })],
    [L3, () => ifCellItem(rng, { skin: skin(), avoid: used, row: rng.pick([2, 3]) })],
    [L3, () => (rng.chance(0.5) ? ifColumnItem(rng, { skin: skin(), avoid: used }) : breakRowItem(rng, { skin: skin(), avoid: used }))],
    [L4, () => (rng.chance(0.7) ? sameItem(rng, { skin: skin(), avoid: used, trap: true }) : cardsSameItem(rng, { trap: true }))],
    [L4, () => rng.pick([pickSameItem, diffRowItem])(rng, { skin: skin(), avoid: used })],
    [L5, () => kindItem(rng, { skin: skin(), avoid: used })],
    [WHY_LESSON[why], () => whyItem(rng, { kind: why })],
  ];
  return plan.map(([lesson, make], i) => finish(one(make), `s${STOP}-c${i + 1}`, lesson));
}

/** One Arcade item from any lesson. */
const ARCADE: [string, (rng: Rng) => Made][] = [
  [L1, (rng) => countItem(rng, { skin: rng.pick(SKINS) })],
  [L1, (rng) => missingItem(rng, { skin: rng.pick(SKINS) })],
  [L1, (rng) => repeatItem(rng, { skin: rng.pick(SKINS), complete: rng.chance(0.4) })],
  [L2, (rng) => columnItem(rng, { skin: rng.pick(SKINS) })],
  [L2, (rng) => cellItem(rng, { skin: rng.pick(SKINS), tag: 'fill' })],
  [L3, (rng) => ifCellItem(rng, { skin: rng.pick(SKINS) })],
  [L3, (rng) => ifColumnItem(rng, { skin: rng.pick(SKINS) })],
  [L3, (rng) => breakRowItem(rng, { skin: rng.pick(SKINS) })],
  [L4, (rng) => sameItem(rng, { skin: rng.pick(SKINS) })],
  [L4, (rng) => pickSameItem(rng, { skin: rng.pick(SKINS) })],
  [L4, (rng) => diffRowItem(rng, { skin: rng.pick(SKINS) })],
  [L4, (rng) => cardsSameItem(rng)],
  [L5, (rng) => kindItem(rng, { skin: rng.pick(SKINS) })],
  [L5, (rng) => pickAlwaysItem(rng, { skin: rng.pick(SKINS) })],
];
function arcade(rng: Rng): Item {
  const [lesson, make] = rng.pick(ARCADE);
  return finish(make(rng), `s${STOP}-arcade`, lesson);
}

/** A True or False question about one box (a cell item), not a column or a pick. */
const isCell = (it: Item) => it.kind === 'choose' && it.choices.length === 2 && it.choices.every((c) => c.id === 'true' || c.id === 'false');
const answerOf = (it: Item) => (it.kind === 'choose' ? it.answer : '');

/**
 * New examples after a miss. A missed box, same-meaning or kind question gets a pair: one with the same answer and
 * one with another, so repeating one answer never passes the set. A missed table check gets the trap and a whole
 * table. A missed why gets two why items. Everything else uses the default (one item with the same skill).
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const make = (m: Made, lesson = missed.lesson) => finish(m, 'new', lesson);
  const skin = () => rng.pick(SKINS);
  const why = missed.tags?.includes('why');
  switch (missed.skill) {
    case 's9.rows':
      if (missed.prompt.includes('each one once')) {
        const trapFirst = answerOf(missed) === 'twice';
        const trap = make(repeatItem(rng, { skin: skin() }));
        const whole = make(repeatItem(rng, { skin: skin(), complete: true }));
        return trapFirst ? [trap, whole] : [whole, trap];
      }
      return [];
    case 's9.fill': {
      if (!isCell(missed)) return [];
      const was = answerOf(missed) === 'true';
      const same = missed.tags?.includes(OR_BOTH.tag) ? orBothItem(rng, { skin: skin() }) : cellItem(rng, { skin: skin(), tag: 'fill', want: was });
      return [make(same, L2), make(cellItem(rng, { skin: skin(), tag: 'fill', want: !was }), L2)];
    }
    case 's9.if-table': {
      if (why) return [make(whyItem(rng, { kind: 'if-row' })), make(ifCellItem(rng, { skin: skin(), row: 1 }))];
      if (!isCell(missed)) return [];
      // A row with the IF part false (True) and the row that breaks it (False), the missed kind first.
      const kept = make(ifCellItem(rng, { skin: skin(), row: rng.pick([2, 3]) }));
      const broken = make(ifCellItem(rng, { skin: skin(), row: 1 }));
      return answerOf(missed) === 'false' ? [broken, kept] : [kept, broken];
    }
    case 's9.same': {
      if (why) return [make(whyItem(rng, { kind: 'same' })), make(whyItem(rng, { kind: 'differ' }))];
      const was = answerOf(missed);
      if (was !== 'yes' && was !== 'no') return [];
      const yes = make(sameItem(rng, { skin: skin(), want: true }));
      const no = make(sameItem(rng, { skin: skin(), trap: true }));
      return was === 'yes' ? [yes, no] : [no, yes];
    }
    case 's9.always': {
      if (why) return [make(whyItem(rng, { kind: 'always' })), make(kindItem(rng, { skin: skin(), want: 'most' }))];
      const was = answerOf(missed);
      if (was !== 'always' && was !== 'sometimes' && was !== 'never') return [];
      const most = make(kindItem(rng, { skin: skin(), want: 'most' }));
      const always = make(kindItem(rng, { skin: skin(), want: 'always' }));
      return was === 'always' ? [always, most] : [most, always];
    }
  }
  return [];
}

/** The warm-up: a Stop 2 card and NOT (A AND B). One card is one row of a table. It never counts for this stop. */
function bridge(rng: Rng): Item {
  return finish(bridgeItem(rng), `s${STOP}-warm`, L2);
}

export const stop9: StopDef = {
  n: STOP,
  id: 's9',
  title: 'Truth Tables',
  idea: 'Two sentences mean the same when they agree in every case.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
  bridge,
  bridgeFrom: 's2',
  skillNames: {
    's9.rows': 'Truth tables: list every case, each one once',
    's9.fill': 'Truth tables: fill a column for NOT, AND, OR',
    's9.if-table': 'Truth tables: the IF table, false in one row only',
    's9.same': 'Truth tables: same meaning means every row matches',
    's9.always': 'Truth tables: always true, sometimes true, never true',
  },
};
