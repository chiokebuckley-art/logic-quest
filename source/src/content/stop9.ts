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
 *  l6 Both ways, and one but     IF AND ONLY IF (true when the parts match, Stop 6's rule each way) and BUT NOT BOTH
 *     not both                   (exactly one part true); the same as OR, and not both; trap: both true marked True
 *  l7 Say it with symbols        ¬ ∧ ∨ → ↔, words to symbols and back, the table beside each; trap: → read as ↔. The
 *                                one lesson where a kid reads symbols (LessonDef.symbols), meant for the oldest readers
 *
 * Every lesson is See -> Do -> Quiz. Every answer, explanation, hint case and board mark comes from the table model in
 * ../engine/puzzles/tables.ts (with Stop 6's ROWS for the IF table and its two rules for IF AND ONLY IF, and Stop 2's
 * rules.ts for card rules); a translation is the words read to a sentence and printed in symbols, or the symbols read
 * back and said in words. The boards and contrast cards are in ../engine/puzzles/tableBoards.ts. The check ends with a
 * why item. The warm-up (bridge) is a Stop 2 card case: does this card fit NOT (A AND B)?
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
  BOTH_TRUE_ROW,
  IFF_SEN,
  IFF_STORY,
  L6_TOPIC,
  ONE_WAY_VS_BOTH,
  OR_NOT_BOTH,
  OR_VS_ONE,
  SYM_WORKED,
  XOR_SEN,
  arrowBoard,
  arrowContrastCard,
  arrowsScene,
  bothWaysBoard,
  falseRowsOf,
  iffScene,
  iffStoryScene,
  orNotBothBoard,
  orNotBothScene,
  symBasicScene,
  symWorkedScene,
  symbolWordBoard,
  translateBoard,
  trueRowsOf,
  xorBoard,
  xorContrastCard,
  xorScene,
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
  AND,
  ARROW_BOTH,
  A as PART_A,
  B as PART_B,
  IF,
  IF_FALSE,
  OP_WORD,
  SYMBOL,
  SYM_OPS,
  XOR_BOTH,
  bothWaysColumnItem,
  bothWaysSameItem,
  holds,
  iffCellItem,
  lookAlikeRowItem,
  rowWords,
  rowsFor,
  say,
  sym,
  symCellItem,
  toSymbols,
  toWords,
  toSymbolsItem,
  toWordsItem,
  xorCellItem,
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

const L6 = 's9.l6', L7 = 's9.l7';
const [bell, leo] = L6_TOPIC.parts;
/** The rows that break the story rule (both ways), and the one of them a plain IF rule would allow. */
const storyBreaks = falseRowsOf(IFF_STORY);
const plainAllows = storyBreaks.filter((k) => holds(IF(PART_A, PART_B), rowsFor(2)[k]));
const storyRow = (k: number) => `Row ${k + 1}: ${rowWords(rowsFor(2)[k], ABC, L6_TOPIC)}.`;

const l6: LessonDef = {
  id: L6,
  title: 'Both ways, and one but not both',
  ideas: [
    {
      title: 'Both ways',
      scene: iffScene(),
      body: [
        'In If… then, you met “if and only if.” It puts two IF rules together, one each way.',
        `A IF AND ONLY IF B is True only where both rules are True: ${rowsWord(trueRowsOf(IFF_SEN))}. There, A and B match.`,
        `It is False where the parts differ: ${rowsWord(falseRowsOf(IFF_SEN))}. Grown-ups call it a biconditional.`,
      ],
    },
    {
      title: 'One but not both',
      scene: xorScene(),
      body: [
        'In NOT, AND, OR, you saw that people often say OR to mean one but not both. Here that idea gets its own words.',
        `A OR B BUT NOT BOTH is true when exactly one part is true. That is ${rowsWord(trueRowsOf(XOR_SEN))}.`,
        'Grown-ups call it exclusive or. Plain OR still includes both.',
      ],
    },
    xorContrastCard(),
    {
      title: 'OR, and not both',
      scene: orNotBothScene(),
      body: [
        `You can say one but not both with words you know: ${quote(OR_NOT_BOTH, ABC, '.')}`,
        'A OR B allows one part or both. NOT (A AND B) takes away the row where both are true.',
        'The two columns match in every row. So the two sentences mean the same.',
      ],
    },
    {
      title: 'Example: a rule both ways',
      scene: iffStoryScene(),
      body: [
        `Here is a rule: ${leo.yes} IF AND ONLY IF ${bell.yes}.`,
        ...storyBreaks.map((k) => `${storyRow(k)} That breaks it.`),
        ...plainAllows.map((k) => `A plain rule, “IF ${bell.yes}, THEN ${leo.yes},” would allow row ${k + 1}. Both ways is stricter.`),
      ],
    },
  ],
  drill: [bothWaysBoard(), xorBoard(), orNotBothBoard()],
  distinctions: [OR_VS_ONE],
  terms: [
    { term: 'biconditional', means: 'A sentence with IF AND ONLY IF. It is true when its two parts match.', also: 'if and only if' },
    { term: 'exclusive or', means: 'A sentence with BUT NOT BOTH. It is true when exactly one part is true.', also: 'one but not both' },
  ],
  // The quiz: the trap (both parts true for one but not both), the IF AND ONLY IF column, one but not both against OR
  // (same meaning, or the one row where they differ), then one more of either.
  practice: practiceOf(L6, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => xorCellItem(rng, { skin: s[0], avoid: used, row: BOTH_TRUE_ROW })),
      one(() => bothWaysColumnItem(rng, { skin: s[1], avoid: used, which: 'iff' })),
      one(() => (rng.chance(0.5) ? bothWaysSameItem(rng, { skin: s[2], avoid: used, which: 'xor' }) : lookAlikeRowItem(rng, { skin: s[2], avoid: used, which: 'xor' }))),
      one(() =>
        rng.pick([
          () => iffCellItem(rng, { skin: s[3], avoid: used }),
          () => bothWaysColumnItem(rng, { skin: s[3], avoid: used, which: 'xor' }),
          () => bothWaysSameItem(rng, { skin: s[3], avoid: used, which: 'iff' }),
          () => lookAlikeRowItem(rng, { skin: s[3], avoid: used, which: 'iff' }),
        ])(),
      ),
    ];
  }),
  pass: { firstTry: 3, include: [XOR_BOTH] },
};

const [EX1, EX2] = SYM_WORKED;
const IF_AB = IF(PART_A, PART_B);
const l7: LessonDef = {
  id: L7,
  title: 'Say it with symbols',
  symbols: true,
  ideas: [
    {
      title: 'Five words, five symbols',
      body: [
        'Books for older students often write logic words as symbols. A symbol is a short sign that stands for a word.',
        ...[SYM_OPS.slice(0, 3), SYM_OPS.slice(3)].map((ops) => ops.map((op) => `${SYMBOL[op]} means ${OP_WORD[op]}.`).join(' ')),
        'A sentence means the same in words or in symbols. Only the way it looks changes.',
      ],
    },
    {
      title: 'NOT, AND, OR',
      scene: symBasicScene(),
      body: [
        `“${sym({ op: 'not', a: PART_A }, ABC)}” says ${toWords(sym({ op: 'not', a: PART_A }, ABC), ABC)}. It flips A in each row.`,
        `“${sym(AND(PART_A, PART_B), ABC)}” says ${toWords(sym(AND(PART_A, PART_B), ABC), ABC)}. “${sym({ op: 'or', a: PART_A, b: PART_B }, ABC)}” says ${toWords(sym({ op: 'or', a: PART_A, b: PART_B }, ABC), ABC)}.`,
        'These are the columns you filled before. Only the headings changed.',
      ],
    },
    {
      title: 'The two arrows',
      scene: arrowsScene(),
      body: [
        `“${sym(IF_AB, ABC)}” says ${toWords(sym(IF_AB, ABC), ABC)}. The arrow points from the IF part to the THEN part.`,
        `“${sym(IFF_SEN, ABC)}” says ${toWords(sym(IFF_SEN, ABC), ABC)}. It points both ways, so it works both ways.`,
      ],
    },
    arrowContrastCard(),
    {
      title: 'Example: words to symbols',
      scene: symWorkedScene(),
      body: [
        `Take ${quote(EX1, ABC, '.')} Do the bracket first: A AND B is “${sym(AND(PART_A, PART_B), ABC)}.”`,
        `Then put ¬ in front of the bracket: “${toSymbols(say(EX1, ABC), ABC)}.” The brackets stay where they are.`,
        `Now take ${quote(EX2, ABC, '.')} With each NOT as ¬ and the arrow, it is “${toSymbols(say(EX2, ABC), ABC)}.”`,
        'The table does not change. In words or in symbols, the column is the same.',
      ],
    },
  ],
  drill: [symbolWordBoard(), arrowBoard(), translateBoard()],
  distinctions: [ONE_WAY_VS_BOTH],
  terms: [
    { term: 'symbol', means: 'A short sign that stands for a word.', also: 'sign' },
    ...SYM_OPS.map((op) => ({ term: SYMBOL[op], means: `The symbol for ${OP_WORD[op]}.`, also: OP_WORD[op] })),
  ],
  // The quiz: words to symbols with an IF sentence (the trap: ↔ for →), symbols to words, one box read in symbols, then
  // one more translation either way.
  practice: practiceOf(L7, (rng) => {
    const one = distinctItems();
    const used = new Set<string>();
    const s = packSkins(rng, 4);
    return [
      one(() => toSymbolsItem(rng, { skin: s[0], avoid: used, trap: true })),
      one(() => toWordsItem(rng, { skin: s[1], avoid: used })),
      one(() => symCellItem(rng, { skin: s[2], avoid: used })),
      one(() => (rng.chance(0.5) ? toWordsItem(rng, { skin: s[3], avoid: used, trap: true }) : toSymbolsItem(rng, { skin: s[3], avoid: used }))),
    ];
  }),
  pass: { firstTry: 3, include: [ARROW_BOTH] },
};

const lessons = [l1, l2, l3, l4, l5, l6, l7];

// ---------- check, Arcade, new examples, warm-up ----------

/**
 * 10 items: one from each lesson (the trap of Lessons 1 to 4 among them), one more from Lesson 6 (both of its words are
 * asked), one more from a lesson in 1 to 5, in lesson order, then the why item last. The conflict items: the table with
 * a row twice, OR when both parts are true, a row where the IF part is false, and the NOT on each part.
 */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const used = new Set<string>();
  const skin = () => rng.pick(SKINS);
  const why = rng.pick<WhyKind>(['same', 'differ', 'if-row', 'always', 'xor-row']);
  const plan: [string, () => Made][] = [
    [L1, () => repeatItem(rng, { skin: skin(), avoid: used })],
    [L2, () => orBothItem(rng, { skin: skin(), avoid: used })],
    [L3, () => ifCellItem(rng, { skin: skin(), avoid: used, row: rng.pick([2, 3]) })],
    [L4, () => (rng.chance(0.7) ? sameItem(rng, { skin: skin(), avoid: used, trap: true }) : cardsSameItem(rng, { trap: true }))],
    [L5, () => kindItem(rng, { skin: skin(), avoid: used })],
    [L6, () => rng.pick(IFF_MAKERS)(rng, { skin: skin(), avoid: used })],
    [L6, () => (rng.chance(0.5) ? xorCellItem(rng, { skin: skin(), avoid: used, row: BOTH_TRUE_ROW }) : rng.pick(XOR_MAKERS)(rng, { skin: skin(), avoid: used }))],
    [L7, () => rng.pick(SYM_MAKERS)(rng, { skin: skin(), avoid: used })],
  ];
  // One more item from Lessons 1 to 5, a kind the plan above does not ask, placed after its lesson.
  const spare = rng.pick<[string, () => Made]>([
    [L1, () => (rng.chance(0.5) ? countItem(rng, { skin: skin(), avoid: used }) : missingItem(rng, { skin: skin(), avoid: used }))],
    [L2, () => columnItem(rng, { skin: skin(), avoid: used })],
    [L3, () => (rng.chance(0.5) ? ifColumnItem(rng, { skin: skin(), avoid: used }) : breakRowItem(rng, { skin: skin(), avoid: used }))],
    [L4, () => rng.pick([pickSameItem, diffRowItem])(rng, { skin: skin(), avoid: used })],
    [L5, () => pickAlwaysItem(rng, { skin: skin(), avoid: used })],
  ]);
  plan.splice(plan.findIndex(([l]) => l === spare[0]) + 1, 0, spare);
  plan.push([WHY_LESSON[why], () => whyItem(rng, { kind: why })]);
  return plan.map(([lesson, make], i) => finish(one(make), `s${STOP}-c${i + 1}`, lesson));
}

type Maker = (rng: Rng, o: { skin: Skin; avoid?: Set<string> }) => Made;
/** Lesson 6's IF AND ONLY IF questions, and its one-but-not-both questions after the trap box. */
const IFF_MAKERS: Maker[] = [
  (rng, o) => bothWaysColumnItem(rng, { ...o, which: 'iff' }),
  (rng, o) => iffCellItem(rng, o),
  (rng, o) => bothWaysSameItem(rng, { ...o, which: 'iff' }),
  (rng, o) => lookAlikeRowItem(rng, { ...o, which: 'iff' }),
];
const XOR_MAKERS: Maker[] = [
  (rng, o) => bothWaysColumnItem(rng, { ...o, which: 'xor' }),
  (rng, o) => xorCellItem(rng, o),
  (rng, o) => bothWaysSameItem(rng, { ...o, which: 'xor' }),
  (rng, o) => lookAlikeRowItem(rng, { ...o, which: 'xor' }),
];
/** Lesson 7's questions: words to symbols, symbols to words, one box read in symbols. */
const SYM_MAKERS: Maker[] = [
  (rng, o) => toSymbolsItem(rng, { ...o, trap: rng.chance(0.5) }),
  (rng, o) => toWordsItem(rng, { ...o, trap: rng.chance(0.5) }),
  (rng, o) => symCellItem(rng, o),
];

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
  ...IFF_MAKERS.map((make): [string, (rng: Rng) => Made] => [L6, (rng) => make(rng, { skin: rng.pick(SKINS) })]),
  ...XOR_MAKERS.map((make): [string, (rng: Rng) => Made] => [L6, (rng) => make(rng, { skin: rng.pick(SKINS) })]),
  ...SYM_MAKERS.map((make): [string, (rng: Rng) => Made] => [L7, (rng) => make(rng, { skin: rng.pick(SKINS) })]),
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
    case 's9.iff':
    case 's9.xor': {
      const which = missed.skill === 's9.iff' ? 'iff' : 'xor';
      if (why) return [make(whyItem(rng, { kind: 'xor-row' })), make(xorCellItem(rng, { skin: skin(), row: BOTH_TRUE_ROW }))];
      const was = answerOf(missed);
      const cell = (want: boolean) => (which === 'iff' ? iffCellItem(rng, { skin: skin(), want }) : xorCellItem(rng, { skin: skin(), want }));
      if (isCell(missed)) {
        // The missed answer first. A missed trap box (both parts true) gets the trap again.
        const w = was === 'true';
        const same = missed.tags?.includes(XOR_BOTH.tag) ? xorCellItem(rng, { skin: skin(), row: BOTH_TRUE_ROW }) : cell(w);
        return [make(same), make(cell(!w))];
      }
      if (was === 'yes' || was === 'no') {
        const yes = make(bothWaysSameItem(rng, { skin: skin(), which, want: true }));
        const no = make(bothWaysSameItem(rng, { skin: skin(), which, want: false }));
        return was === 'yes' ? [yes, no] : [no, yes];
      }
      // A missed column or row: the look-alike row, then one box.
      return [make(lookAlikeRowItem(rng, { skin: skin(), which })), make(which === 'xor' ? xorCellItem(rng, { skin: skin(), row: BOTH_TRUE_ROW }) : cell(false))];
    }
    case 's9.symbols': {
      if (isCell(missed)) {
        // A box read in symbols: the missed answer first, then the other. The trap (→ read as ↔) is always True.
        const w = answerOf(missed) === 'true';
        const same = missed.tags?.includes(ARROW_BOTH.tag) ? symCellItem(rng, { skin: skin(), trap: true }) : symCellItem(rng, { skin: skin(), want: w });
        return [make(same), make(symCellItem(rng, { skin: skin(), want: !w }))];
      }
      // A missed translation: one each way, the first with the trap.
      const toSym = missed.prompt.includes('with symbols?');
      const first = toSym ? toSymbolsItem(rng, { skin: skin(), trap: true }) : toWordsItem(rng, { skin: skin(), trap: true });
      const second = toSym ? toWordsItem(rng, { skin: skin() }) : toSymbolsItem(rng, { skin: skin() });
      return [make(first), make(second)];
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
    's9.iff': 'Truth tables: if and only if, true when the two parts match',
    's9.xor': 'Truth tables: one but not both',
    's9.symbols': 'Truth tables: logic words written as symbols, and back',
  },
};
