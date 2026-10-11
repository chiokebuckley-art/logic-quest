/**
 * Clues & Chances (id s13): the See cards, the contrast pictures and the Do boards of every lesson. Every mark’s
 * answer and every truth on a picture is worked out from a model here (a bag’s counts, every way the flips can go, a
 * count picture’s boxes), never typed in.
 *
 * In every lesson the contrast card and its board come first, then the worked example and its board (the content
 * guide’s order: the distinction is taught apart before the example uses it).
 *
 *  l1  the jar contrast (one draw vs the counts) and its board: was the word right, whatever came out? Then the worked
 *      bag (shape sentences marked) and its board (the color sentences)
 *  l2  the put-back vs kept-out contrast and its board; then every way two flips can go, and its twin board (three
 *      flips)
 *  l3  the row vs column contrast and its board; then the farm count picture, read on a board; the twin farm with more
 *      goats
 *  l4  the rain clues and their board; the “right for most” vs “a flag is right” contrast and its board; then the eye
 *      check count picture and its twin board (more false alarms)
 */
import type { ConfusedQuestion, Distinction, DrillMark, DrillOption, DrillRow, DrillStep, IdeaCard, Misconception, Scene } from '../types';
import { cap, drawAgrees, wordBecause, type Word } from './chances';
import { EYES_PIC, EYES_TWIN, FARM_PIC, FARM_TWIN, RAIN, RAIN_COUNTS, clueScene, colTotal, groupScene, rightFor, rowTotal, strongerClue, testScene, type CluePic } from './counts';
import { COLOR_SENTENCES, SHAPE_SENTENCES, SKINS, WORD_LABEL, WORD_OPTIONS, bagText, cardNote, groupsScene, judgeCards, sentenceRow, wordFor } from './patterns';

const YES_NO: DrillOption[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const TRUE_FALSE: DrillOption[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const yn = (v: boolean) => (v ? 'yes' : 'no');
const tf = (v: boolean) => (v ? 'true' : 'false');
const num = (n: number): DrillOption => ({ id: String(n), label: String(n) });

/** Number options for a board mark: the right count and its confusions, each once, in order. */
function numOptions(right: number, others: readonly number[]): DrillOption[] {
  const seen = new Set<number>();
  return [right, ...others].filter((n) => !seen.has(n) && seen.add(n)).sort((a, b) => a - b).map(num);
}

// ======================= Lesson 1 · Likely, not certain =======================

/** The worked bag: 4 red circles, 3 blue circles and 3 blue squares. Each card goes back after a draw. */
export const L1_GROUPS = [
  { n: 4, shape: 'circle' as const, color: 'red' as const },
  { n: 3, shape: 'circle' as const, color: 'blue' as const },
  { n: 3, shape: 'square' as const, color: 'blue' as const },
];
export const L1_SCENE = groupsScene(L1_GROUPS);

/** The worked example card: the bag, and each shape sentence with its count and its word. */
export function l1ExampleCard(): IdeaCard {
  const t = L1_SCENE.things;
  return {
    title: 'Example: mark each sentence',
    scene: L1_SCENE,
    body: [
      `This bag has ${t.length} cards: 4 red circles, 3 blue circles and 3 blue squares. Each card goes back after a draw.`,
      ...SHAPE_SENTENCES.map((st) => `“${st.says}” ${cardNote(t, st)}`),
    ],
  };
}

/** Board 1: the same bag. The shape sentences are shown; the learner marks the color sentences, then one after a draw. */
export function l1WordBoard(afterCard: number): DrillStep {
  const t = L1_SCENE.things;
  const red = COLOR_SENTENCES[0];
  const after = sentenceRow(t, red, false, {
    id: 'after',
    label: 'A red circle came out and went back. Now: “The next card is red.”',
    before: 'The card went back, so the bag is the same. ',
  });
  return {
    id: 's13.l1-do1',
    title: 'Mark the colors',
    body: ['This is the bag from the example. The shape sentences are marked for you.', 'Now mark each color sentence: Must, Likely, Unlikely or Can’t. Count the cards that fit and the ones that do not.'],
    scene: L1_SCENE,
    afterCard,
    rows: [...SHAPE_SENTENCES.map((st) => sentenceRow(t, st, true)), ...COLOR_SENTENCES.map((st) => sentenceRow(t, st, false)), after],
    done: `Right. Red is ${WORD_LABEL[judgeCards(t, red).word].toLowerCase()}, even after a red draw. The counts in the bag give the word.`,
  };
}

/** The jar on the contrast card and its board: 9 lemon drops and 1 cherry drop, each put back after a draw. */
export const JAR = { lemon: 9, cherry: 1 } as const;
const JAR_TOTAL = JAR.lemon + JAR.cherry;
type Flavor = keyof typeof JAR;
const jarShare = (f: Flavor) => `${JAR[f]} of the ${JAR_TOTAL} drops ${JAR[f] === 1 ? 'is' : 'are'} ${f}`;
const jarWord = (f: Flavor): Word => wordFor(JAR[f], JAR_TOTAL);

/** The distinction of Lesson 1: what came out of one draw, and what the counts say. */
export const COUNTS_VS_DRAW: Distinction = {
  id: 'counts-vs-draw',
  a: 'What one draw shows: the thing that came out.',
  b: 'What the counts say: the word for how likely it was.',
};

export const L1_CLOSING = 'Those two are apart now. Back to the board: look at the counts in the jar, not at what came out.';

/** The contrast: the same jar and the same words, two different draws. The word is right both times. */
export function jarContrast(): Extract<Scene, { kind: 'contrast' }> {
  const right = jarWord('lemon') === 'likely';
  return {
    kind: 'contrast',
    pairs: [
      { world: 'Out came a lemon drop.', who: 'Rosa', says: 'Lemon is likely.', truth: right, because: `${cap(jarShare('lemon'))}. More are lemon than not, so the word fits the jar.` },
      {
        world: 'Out came the cherry drop.',
        who: 'Rosa',
        says: 'Lemon is likely.',
        truth: right,
        because: `The jar still has ${JAR.lemon} lemon and ${JAR.cherry} cherry. So the word still fits the jar.`,
        then: 'Likely is not certain. The cherry drop came out this time.',
      },
    ],
    ask: { q: 'Did the cherry drop make Rosa’s word wrong?', a: 'No. Only the draw changed. The word comes from the jar, and the jar is the same.' },
    words: { worldTag: 'What came out', truth: 'Right word', untruth: 'Not the right word' },
  };
}

export function jarContrastCard(): IdeaCard {
  return {
    title: 'The word comes from the counts',
    distinction: COUNTS_VS_DRAW.id,
    scene: jarContrast(),
    body: [
      'Same jar, two draws. Rosa says the same words both times.',
      'Her word is right both times. It comes from the counts in the jar, not from the one drop that came out.',
      'A word can be right when the draw goes the other way. And a word can be wrong when the draw matches it.',
    ],
  };
}

/** The cases on the jar board: a word said, then a draw. Each word is judged by the counts. */
export const JAR_CASES: { id: string; says: string; flavor: Flavor; said: Word; draw: Flavor }[] = [
  { id: 'c1', says: 'Lemon is likely.', flavor: 'lemon', said: 'likely', draw: 'cherry' },
  { id: 'c2', says: 'It must be lemon.', flavor: 'lemon', said: 'must', draw: 'lemon' },
  { id: 'c3', says: 'Cherry is unlikely.', flavor: 'cherry', said: 'unlikely', draw: 'cherry' },
  { id: 'c4', says: 'It can’t be cherry.', flavor: 'cherry', said: 'cant', draw: 'lemon' },
];

const OUTCOME_AS_WORD =
  'You may be treating “what came out” and “what the counts say” as the same thing. They are two different things. The word comes from the counts in the jar, before the draw. One draw does not change the jar. So ask: what do the counts say?';

const JAR_CONFUSED: ConfusedQuestion[] = [
  {
    q: 'The cherry drop came out and went back. Did the jar change?',
    options: [{ label: 'No. It went back, so the jar is the same', right: true }, { label: 'Yes. Now cherry is more likely' }, { label: 'Not sure' }],
    teach: `No. The drop went back, so the jar still has ${JAR.lemon} lemon and ${JAR.cherry} cherry. The counts did not change, so the word did not change.`,
  },
  {
    q: 'A word like Likely is about what?',
    options: [{ label: 'The counts in the jar, before the draw', right: true }, { label: 'The one drop that came out' }, { label: 'Not sure' }],
    teach: 'The counts. Likely means more fit than not. You can say it before anything comes out, and one draw does not change it.',
  },
];

/** Board 2: right after the contrast. For each case, was the word right? The answer comes from the counts, never the draw. */
export function jarBoard(afterCard: number): DrillStep {
  const rows: DrillRow[] = JAR_CASES.map((c) => {
    const truth = jarWord(c.flavor);
    const fits = c.said === truth;
    const drew = `A ${c.draw} drop came out`;
    const why = fits
      ? `${cap(jarShare(c.flavor))}, so ${WORD_LABEL[c.said]} is the right word. ${drew}, but one draw does not change the jar.`
      : `${cap(jarShare(c.flavor))}, so the right word is ${WORD_LABEL[truth]}, not ${WORD_LABEL[c.said]}. ${drew}, but that does not make the word right.`;
    return {
      id: c.id,
      label: `Rosa says, “${c.says}” Then a ${c.draw} drop comes out.`,
      marks: [{ id: `${c.id}-right`, label: 'Was the word right?', options: YES_NO, answer: yn(fits), why: { [yn(!fits)]: why }, compare: { says: c.says, world: `${JAR.lemon} lemon and ${JAR.cherry} cherry.` } }],
    };
  });
  // Judging by the draw: the mark the draw points to, which is never the answer on this board.
  const misconceptions: Misconception[] = JAR_CASES.map((c) => ({
    id: 'outcome-as-word',
    when: 'picks' as const,
    picks: { [`${c.id}-right`]: yn(drawAgrees(c.said, c.draw === c.flavor)) },
    text: OUTCOME_AS_WORD,
  }));
  return {
    id: 's13.l1-do2',
    title: 'Right word, or not?',
    body: [`The jar has ${JAR.lemon} lemon drops and ${JAR.cherry} cherry drop. Each drop goes back after a draw.`, 'For each case, was the word right? Look at the jar, not at what came out.'],
    scene: jarContrast(),
    afterCard,
    distinction: COUNTS_VS_DRAW.id,
    scaffold: 'full',
    rows,
    words: { says: 'Says', world: 'In the jar', so: 'So', ask: 'Does the word fit the counts?', closing: L1_CLOSING },
    misconceptions,
    confused: JAR_CONFUSED,
    done: 'Right. Each word was judged by the counts in the jar. What came out did not change them.',
  };
}

// ======================= Lesson 2 · Each draw is new =======================

/** Every way n flips of a fair coin can go, in order: heads first. */
export function everyWay(n: number, sides: readonly [string, string] = ['heads', 'tails']): string[][] {
  if (n === 0) return [[]];
  return everyWay(n - 1, sides).flatMap((w) => sides.map((s) => [...w, s]));
}

/** The worked example’s picture: every way two flips can go. */
export function twoFlipsScene(): Extract<Scene, { kind: 'text' }> {
  return { kind: 'text', lines: ['Two flips of a fair coin. Every way:', ...everyWay(2).map((w) => w.join(', '))] };
}

/** The twin board’s picture: every way three flips can go. */
export function threeFlipsScene(): Extract<Scene, { kind: 'text' }> {
  return { kind: 'text', lines: ['Three flips of a fair coin. Every way:', ...everyWay(3).map((w) => w.join(', '))] };
}

/** How many of the ways that start with `start` end in each side. */
export function endsAfter(n: number, start: readonly string[]): { ways: string[][]; heads: number; tails: number } {
  const ways = everyWay(n).filter((w) => start.every((s, i) => w[i] === s));
  return { ways, heads: ways.filter((w) => w[n - 1] === 'heads').length, tails: ways.filter((w) => w[n - 1] === 'tails').length };
}

export function flipsCard(): IdeaCard {
  const all = everyWay(2);
  const { ways, heads, tails } = endsAfter(2, ['heads']);
  return {
    title: 'Example: every way two flips can go',
    scene: twoFlipsScene(),
    body: [
      `There are ${all.length} ways two flips can go. Each way is just as likely.`,
      `Look at the ${ways.length} ways that start with heads. ${heads} ends heads, and ${tails} ends tails.`,
      `So after heads, tails is not more likely. It is still 1 in 2.`,
    ],
  };
}

const DUE_TEXT =
  'You may be treating “it has not come up for a while” and “it is more likely now” as the same thing. They are two different things. A fair coin has no memory, so each flip is new.';

/** Board 1, a twin of the example: three flips. After heads, heads, how do the ways end? */
export function flipsBoard(afterCard: number): DrillStep {
  const start = ['heads', 'heads'];
  const { ways, heads, tails } = endsAfter(3, start);
  const next = tails > heads ? 'more' : tails === heads ? 'same' : 'less';
  if (next !== 'same') throw new Error('flipsBoard: a fair coin splits evenly');
  const listed = ways.map((w) => `“${w.join(', ')}”`).join(' and ');
  const nextOptions: DrillOption[] = [{ id: 'more', label: 'More likely' }, { id: 'same', label: 'Just as likely' }, { id: 'less', label: 'Less likely' }];
  const marks: DrillMark[] = [
    { id: 'start', label: 'How many ways start heads, heads?', options: [1, 2, 3, 4].map(num), answer: String(ways.length), why: Object.fromEntries([1, 2, 3, 4].filter((n) => n !== ways.length).map((n) => [String(n), `Look down the list. The ways that start heads, heads are ${listed}. That is ${ways.length}.`])) },
    { id: 'end-h', label: 'Of those, how many end heads?', options: [0, 1, 2].map(num), answer: String(heads), why: Object.fromEntries([0, 1, 2].filter((n) => n !== heads).map((n) => [String(n), `The ways are ${listed}. ${heads} of them ${heads === 1 ? 'ends' : 'end'} heads.`])) },
    { id: 'end-t', label: 'How many end tails?', options: [0, 1, 2].map(num), answer: String(tails), why: Object.fromEntries([0, 1, 2].filter((n) => n !== tails).map((n) => [String(n), `The ways are ${listed}. ${tails} of them ${tails === 1 ? 'ends' : 'end'} tails.`])) },
    {
      id: 'next',
      label: 'So after heads, heads, tails is:',
      options: nextOptions,
      answer: next,
      why: Object.fromEntries(nextOptions.filter((o) => o.id !== next).map((o) => [o.id, `${tails} way ends tails, and ${heads} way ends heads. So tails is just as likely, not ${o.label.toLowerCase()}. It is not due.`])),
    },
  ];
  return {
    id: 's13.l2-do1',
    title: 'Three flips',
    body: ['Here is every way three flips can go.', 'Find the ways that start heads, heads. How do they end? Then say if tails is due.'],
    scene: threeFlipsScene(),
    twin: 'One more flip: three flips, so 8 ways instead of 4.',
    afterCard,
    rows: [{ id: 'hh', label: 'After heads, heads', marks }],
    misconceptions: [{ id: 'due', when: 'picks', picks: { next: 'more' }, text: DUE_TEXT }],
    done: `Right. After heads, heads, ${tails} way ends tails and ${heads} ends heads. Tails is not due.`,
  };
}

/** The bag on the Lesson 2 contrast and its board: 3 red marbles and 2 blue marbles. */
export const L2_BAG = [3, 2, 0] as [number, number, number];
const MARBLES = SKINS.marbles;
const RED = MARBLES.kinds[0];

/** The distinction of Lesson 2: a draw that goes back, and one kept out. */
export const BACK_VS_KEPT: Distinction = {
  id: 'back-vs-kept',
  a: 'A draw put back: the bag stays the same, so each draw is new.',
  b: 'A draw kept out: the bag changes, so the chances change.',
};

export const L2_CLOSING = 'Those two are apart now. Back to the board: for each case, ask if the draws went back.';

/** The bag after some draws: each draw is a kind index and whether it went back. */
export function bagAfter(start: readonly number[], draws: readonly { kind: number; back: boolean }[]): [number, number, number] {
  const c = [...start] as [number, number, number];
  for (const d of draws) if (!d.back) c[d.kind] -= 1;
  return c;
}

const redWord = (c: readonly number[]) => wordFor(c[0], c[0] + c[1] + c[2]);

export function keptContrast(): Extract<Scene, { kind: 'contrast' }> {
  const back = bagAfter(L2_BAG, [{ kind: 0, back: true }, { kind: 0, back: true }]);
  const kept = bagAfter(L2_BAG, [{ kind: 0, back: false }, { kind: 0, back: false }]);
  return {
    kind: 'contrast',
    pairs: [
      { world: 'Two red draws, each put back.', who: 'Kim', says: 'Red is likely next.', truth: redWord(back) === 'likely', because: `Each red went back. The bag still has ${bagText(MARBLES, back)}.` },
      {
        world: 'Two red draws, each kept out.',
        who: 'Lee',
        says: 'Red is likely next.',
        truth: redWord(kept) === 'likely',
        because: `The two reds stayed out. The bag now has ${bagText(MARBLES, kept)}.`,
        then: `Red is ${WORD_LABEL[redWord(kept)].toLowerCase()} now.`,
      },
    ],
    ask: { q: 'What made the difference?', a: 'Only where the draws went. Put back, the bag is the same, so each draw is new. Kept out, the bag changes, so count again.' },
    words: { worldTag: 'The draws', truth: 'Right', untruth: 'Not right' },
  };
}

export function keptContrastCard(): IdeaCard {
  return {
    title: 'Back in, or kept out?',
    distinction: BACK_VS_KEPT.id,
    scene: keptContrast(),
    body: ['Same bag, same two red draws. Only one thing is different: where the draws went.', 'Put back, the bag is the same, so each draw is new. Kept out, the bag changes.', 'So before you call a draw new, ask: did it go back?'],
  };
}

/** The cases on the Lesson 2 board: draws from the bag of 3 red and 2 blue. */
export const KEPT_CASES: { id: string; label: string; draws: { kind: number; back: boolean }[] }[] = [
  { id: 'k1', label: 'One red, put back.', draws: [{ kind: 0, back: true }] },
  { id: 'k2', label: 'One blue, kept out.', draws: [{ kind: 1, back: false }] },
  { id: 'k3', label: 'Two reds, each kept out.', draws: [{ kind: 0, back: false }, { kind: 0, back: false }] },
  { id: 'k4', label: 'Three reds in a row, each put back.', draws: [{ kind: 0, back: true }, { kind: 0, back: true }, { kind: 0, back: true }] },
];

const KEPT_AS_BACK =
  'You may be treating a draw kept out and a draw put back as the same thing. They are two different things. Kept out, the bag has one less of that kind. So count the bag again before you pick a word.';
const STREAK_CHANGES =
  'You may be treating a streak and a change in the bag as the same thing. They are two different things. Draws that go back leave the bag the same, however many come out in a row.';

const KEPT_CONFUSED: ConfusedQuestion[] = [
  {
    q: 'A red marble is taken out and kept out. Is the bag the same as before?',
    options: [{ label: 'No. It has one less red', right: true }, { label: 'Yes. A draw never changes the bag' }, { label: 'Not sure' }],
    teach: 'No. A marble kept out does not go back, so the bag has one less red. Only a draw that goes back leaves the bag the same.',
  },
  {
    q: 'Three reds came out, each put back. Is blue due now?',
    options: [{ label: 'No. The bag is the same, so nothing is due', right: true }, { label: 'Yes. Blue has waited a long time' }, { label: 'Not sure' }],
    teach: 'No. Each red went back, so the bag is the same as at the start. The chances are the same, so nothing is due.',
  },
];

export function keptBoard(afterCard: number): DrillStep {
  const start = bagText(MARBLES, L2_BAG);
  const rows: DrillRow[] = KEPT_CASES.map((c) => {
    const now = bagAfter(L2_BAG, c.draws);
    const same = now.every((n, i) => n === L2_BAG[i]);
    const w = redWord(now);
    const nowText = bagText(MARBLES, now);
    const total = now[0] + now[1] + now[2];
    const sameWhy = same ? `Each one went back, so the bag is the same: ${start}.` : `${c.draws.length === 1 ? 'The marble' : 'The marbles'} stayed out, so the bag changed. Now it has ${nowText}.`;
    return {
      id: c.id,
      label: c.label,
      marks: [
        { id: `${c.id}-same`, label: 'Same bag as at the start?', options: YES_NO, answer: yn(same), why: { [yn(!same)]: sameWhy } },
        {
          id: `${c.id}-word`,
          label: 'The word for “The next marble is red.”',
          options: WORD_OPTIONS.map((o) => ({ ...o })),
          answer: w,
          why: Object.fromEntries(WORD_OPTIONS.filter((o) => o.id !== w).map((o) => [o.id, `The bag now has ${nowText}. ${now[0]} of the ${total} are red. ${wordBecause(RED, w)}`])),
        },
      ],
    };
  });
  const misconceptions: Misconception[] = [
    { id: 'kept-as-back', when: 'picks', picks: { 'k3-same': 'yes' }, text: KEPT_AS_BACK },
    { id: 'kept-as-back', when: 'picks', picks: { 'k3-word': redWord(L2_BAG) }, text: KEPT_AS_BACK },
    { id: 'kept-as-back', when: 'picks', picks: { 'k2-same': 'yes' }, text: KEPT_AS_BACK },
    { id: 'streak-changes', when: 'picks', picks: { 'k4-same': 'no' }, text: STREAK_CHANGES },
  ];
  return {
    id: 's13.l2-do2',
    title: 'Put back, or kept out?',
    body: [`The bag starts with ${start}.`, 'For each case, is the bag the same as at the start? Then pick the word for red.'],
    scene: keptContrast(),
    afterCard,
    distinction: BACK_VS_KEPT.id,
    scaffold: 'full',
    rows,
    words: { closing: L2_CLOSING },
    misconceptions,
    confused: KEPT_CONFUSED,
    done: 'Right. Draws put back leave the bag the same, even in a streak. Draws kept out change it, so you count again.',
  };
}

// ======================= Lesson 3 · Out of 100 =======================

const F = FARM_PIC.cells;
export const FARM_SCENE = groupScene(FARM_PIC);

export function farmIntroCard(): IdeaCard {
  return {
    title: 'The count picture',
    scene: FARM_SCENE,
    body: [
      'A count picture splits the 100 animals two ways: goat or sheep, and brown or not.',
      `Each box is a count. The goat row: ${F[0][0]} brown goats and ${F[0][1]} that are not brown. The sheep row: ${F[1][0]} brown and ${F[1][1]} not.`,
      'Each row adds up to its group. Each column adds up to the brown animals, or the ones that are not brown.',
      'All four boxes add up to 100.',
    ],
  };
}

export function farmExampleCard(): IdeaCard {
  if (!(2 * F[0][0] > rowTotal(F, 0))) throw new Error('farmExampleCard: most goats must be brown');
  return {
    title: 'Example: read the picture',
    scene: FARM_SCENE,
    body: [
      `Goats in all: ${F[0][0]} and ${F[0][1]} make ${rowTotal(F, 0)}. That is the goat row. The base rate of goats is ${rowTotal(F, 0)} of 100.`,
      `Brown animals in all: ${F[0][0]} brown goats and ${F[1][0]} brown sheep make ${colTotal(F, 0)}. That is the brown column.`,
      `Of the ${rowTotal(F, 0)} goats, ${F[0][0]} are brown. So most goats are brown.`,
    ],
  };
}

/** Board 1, the same picture: read three more parts. */
export function farmBoard(afterCard: number): DrillStep {
  const bT = rowTotal(F, 1), no = colTotal(F, 1), yes = colTotal(F, 0);
  const marks: { id: string; label: string; right: number; why: Record<number, string> }[] = [
    {
      id: 'sheep',
      label: 'How many sheep are on the farm?',
      right: bT,
      why: { [F[1][0]]: `That is only the brown sheep: one box. All the sheep make the whole row: ${F[1][0]} and ${F[1][1]} make ${bT}.`, [F[1][1]]: `That is only the sheep that are not brown. All the sheep make the whole row: ${bT}.`, 100: `That is every animal. The sheep are one row: ${bT}.` },
    },
    {
      id: 'not-brown',
      label: 'How many animals are not brown?',
      right: no,
      why: { [F[0][1]]: `That is only the goats that are not brown. The “Not brown” column has ${F[0][1]} goats and ${F[1][1]} sheep: ${no}.`, [F[1][1]]: `That is only the sheep that are not brown. Add the goats too: ${F[0][1]} and ${F[1][1]} make ${no}.`, 100: `That is every animal. Only the “Not brown” column counts: ${no}.` },
    },
    {
      id: 'brown-sheep',
      label: `Of the ${yes} brown animals, how many are sheep?`,
      right: F[1][0],
      why: { [F[0][0]]: `That is the brown goats. The brown sheep are the other box of the brown column: ${F[1][0]}.`, [rowTotal(F, 0)]: `That is all the goats. Look in the brown column, at the sheep row: ${F[1][0]}.`, [yes]: `That is every brown animal. Only the sheep among them count: ${F[1][0]}.` },
    },
  ];
  return {
    id: 's13.l3-do1',
    title: 'Read the picture',
    body: ['This is the farm from the example.', 'Find the row, the column or the box each question names. Then add its boxes.'],
    scene: FARM_SCENE,
    afterCard,
    rows: marks.map((m) => ({
      id: m.id,
      label: m.label,
      marks: [{ id: `${m.id}-n`, label: 'How many?', options: numOptions(m.right, Object.keys(m.why).map(Number)), answer: String(m.right), why: Object.fromEntries(Object.entries(m.why).map(([k, v]) => [k, v])) }],
    })),
    done: `Right. A row counts one group, a column counts one side of the clue, and a box counts both.`,
  };
}

/** The distinction of Lesson 3: out of a row, and out of a column. */
export const ROW_VS_COLUMN: Distinction = {
  id: 'row-vs-column',
  a: 'Out of one group (a row): how many of them have the clue.',
  b: 'Out of all with the clue (a column): how many of them are in that group.',
};

export const L3_CLOSING = 'Those two are apart now. Back to the board: for each sentence, ask first: out of which group?';

export function rowColumnContrast(): Extract<Scene, { kind: 'contrast' }> {
  const aT = rowTotal(F, 0), yes = colTotal(F, 0);
  return {
    kind: 'contrast',
    pairs: [
      { world: `Out of the ${aT} goats: the goat row.`, who: 'The sentence', says: 'Most of them are brown.', truth: 2 * F[0][0] > aT, because: `${F[0][0]} of the ${aT} goats are brown. That is more than half of them.` },
      { world: `Out of the ${yes} brown animals: the brown column.`, who: 'The sentence', says: 'Most of them are goats.', truth: 2 * F[0][0] > yes, because: `Only ${F[0][0]} of the ${yes} brown animals are goats. The other ${F[1][0]} are sheep.` },
    ],
    ask: { q: `Both use the same box: ${F[0][0]} brown goats. Why do they come out different?`, a: 'They count out of different groups: the goat row, or the brown column. Always ask: out of which group?' },
    words: { worldTag: 'Out of', truth: 'True', untruth: 'False' },
  };
}

export function rowColumnCard(): IdeaCard {
  return {
    title: 'Out of which group?',
    distinction: ROW_VS_COLUMN.id,
    scene: rowColumnContrast(),
    body: [`Both sentences use the same ${F[0][0]} brown goats.`, 'One counts out of the goats: the goat row. One counts out of the brown animals: the brown column.', 'So before you say “most,” ask: out of which group?'],
  };
}

/** The sentences on the Lesson 3 board. `of`: the group it counts out of; the truth is worked out from the picture. */
export function rowColumnSentences(): { id: string; says: string; of: 'row' | 'col'; truth: boolean; facts: string }[] {
  const aT = rowTotal(F, 0), yes = colTotal(F, 0);
  return [
    { id: 's1', says: `${F[0][0]} of the ${aT} goats are brown.`, of: 'row', truth: true, facts: `Brown goats: ${F[0][0]}. Goats in all: ${aT}.` },
    { id: 's2', says: 'Most brown animals are goats.', of: 'col', truth: 2 * F[0][0] > yes, facts: `Brown goats: ${F[0][0]}. Brown animals in all: ${yes}.` },
    { id: 's3', says: 'Most goats are brown.', of: 'row', truth: 2 * F[0][0] > aT, facts: `Brown goats: ${F[0][0]}. Goats in all: ${aT}.` },
    { id: 's4', says: `${F[1][0]} of the ${yes} brown animals are sheep.`, of: 'col', truth: true, facts: `Brown sheep: ${F[1][0]}. Brown animals in all: ${yes}.` },
  ];
}

const ROW_AS_COLUMN =
  'You may be treating “most goats are brown” and “most brown animals are goats” as the same thing. They are two different things. The first counts out of the goats. The second counts out of the brown animals. So ask: out of which group?';

const ROW_COLUMN_CONFUSED: ConfusedQuestion[] = [
  {
    q: `${F[0][0]} of the ${rowTotal(F, 0)} goats are brown. Does that mean ${F[0][0]} of the ${rowTotal(F, 0)} brown animals are goats?`,
    options: [{ label: `No. There are ${colTotal(F, 0)} brown animals, a different group`, right: true }, { label: 'Yes. It is the same thing said two ways' }, { label: 'Not sure' }],
    teach: `No. The goats are a row: ${rowTotal(F, 0)} of them. The brown animals are a column: ${colTotal(F, 0)} of them. The same box of ${F[0][0]} is a big part of the row and a small part of the column.`,
  },
  {
    q: 'Before you say “most,” what should you ask?',
    options: [{ label: 'Out of which group?', right: true }, { label: 'Which box is biggest?' }, { label: 'Not sure' }],
    teach: '“Most” always means most of some group. Find that group first: a row or a column. Then compare the part to the rest of that group.',
  },
];

export function rowColumnBoard(afterCard: number): DrillStep {
  const OF: DrillOption[] = [{ id: 'row', label: 'The goats' }, { id: 'col', label: 'The brown animals' }, { id: 'all', label: 'All 100 animals' }];
  const rows: DrillRow[] = rowColumnSentences().map((s) => ({
    id: s.id,
    label: s.says,
    marks: [
      {
        id: `${s.id}-of`,
        label: 'Out of which group?',
        options: OF,
        answer: s.of,
        why: Object.fromEntries(OF.filter((o) => o.id !== s.of).map((o) => [o.id, s.of === 'row' ? 'This sentence counts out of the goats: the goat row.' : 'This sentence counts out of the brown animals: the brown column.'])),
      },
      { id: `${s.id}-truth`, label: 'True or false?', options: TRUE_FALSE, answer: tf(s.truth), why: { [tf(!s.truth)]: `${s.facts} ${s.truth ? 'So the sentence is true.' : 'That is fewer than half, so the sentence is false.'}` }, compare: { says: s.says, world: s.facts } },
    ],
  }));
  const misconceptions: Misconception[] = [
    { id: 'row-as-column', when: 'picks', picks: { 's2-truth': 'true' }, text: ROW_AS_COLUMN },
    { id: 'row-as-column', when: 'picks', picks: { 's2-of': 'row' }, text: ROW_AS_COLUMN },
  ];
  return {
    id: 's13.l3-do2',
    title: 'Out of which group?',
    body: ['Each sentence is about the farm picture.', 'First pick the group it counts out of. Then say if it is true.'],
    scene: FARM_SCENE,
    afterCard,
    distinction: ROW_VS_COLUMN.id,
    scaffold: 'full',
    rows,
    words: { says: 'Says', world: 'The counts', so: 'So', ask: 'Do the counts fit the sentence?', closing: L3_CLOSING },
    misconceptions,
    confused: ROW_COLUMN_CONFUSED,
    done: 'Right. The same box can be most of a row and a small part of a column.',
  };
}

export const FARM_PICK_SCENE = groupScene(FARM_PIC, { pick: { col: 0 }, pickLabel: 'You see a brown animal. It is one of these.' });

export function commonWinsCard(): IdeaCard {
  // The card's words: most goats are brown, few sheep are, yet more brown animals are sheep.
  if (!(2 * F[0][0] > rowTotal(F, 0) && 2 * F[1][0] < rowTotal(F, 1) && F[1][0] > F[0][0])) throw new Error('commonWinsCard: the sheep must win the brown column');
  return {
    title: 'The bigger group can win',
    scene: FARM_PICK_SCENE,
    body: [
      'You see a brown animal far off. Most goats are brown, so you may guess goat.',
      `But count the brown column: ${F[0][0]} goats and ${F[1][0]} sheep. More brown animals are sheep.`,
      'Sheep are so common that they win, even though few sheep are brown. So it is more likely a sheep.',
      'Always start with how common each group is.',
    ],
  };
}

/** Board 2, a twin of the trap card: the same farm with 30 goats and 70 sheep. Now the goats win. */
export function farmTwinBoard(afterCard: number): DrillStep {
  const T = FARM_TWIN.cells;
  const winner = T[0][0] > T[1][0] ? 'a' : 'b';
  return {
    id: 's13.l3-do3',
    title: 'More goats',
    body: [`Now the farm has ${rowTotal(T, 0)} goats and ${rowTotal(T, 1)} sheep.`, 'Count the brown column. Then say which a brown animal is more likely to be.'],
    scene: groupScene(FARM_TWIN),
    twin: `One thing changed: now ${rowTotal(T, 0)} of the 100 animals are goats, and ${rowTotal(T, 1)} are sheep. Most goats are still brown, and few sheep are.`,
    afterCard,
    rows: [
      { id: 'bg', label: 'Brown goats', marks: [{ id: 'bg-n', label: 'How many?', options: numOptions(T[0][0], [T[0][1], rowTotal(T, 0), F[0][0]]), answer: String(T[0][0]), why: Object.fromEntries([T[0][1], rowTotal(T, 0), F[0][0]].filter((n) => n !== T[0][0]).map((n) => [String(n), `Look where the goat row meets the brown column: ${T[0][0]}.`])) }] },
      { id: 'bs', label: 'Brown sheep', marks: [{ id: 'bs-n', label: 'How many?', options: numOptions(T[1][0], [T[1][1], rowTotal(T, 1), F[1][0]]), answer: String(T[1][0]), why: Object.fromEntries([T[1][1], rowTotal(T, 1), F[1][0]].filter((n) => n !== T[1][0]).map((n) => [String(n), `Look where the sheep row meets the brown column: ${T[1][0]}.`])) }] },
      {
        id: 'more',
        label: 'You see a brown animal.',
        marks: [{
          id: 'more-pick',
          label: 'Which is it more likely to be?',
          options: [{ id: 'a', label: 'A goat' }, { id: 'b', label: 'A sheep' }],
          answer: winner,
          why: { [winner === 'a' ? 'b' : 'a']: `The brown column has ${T[0][0]} goats and ${T[1][0]} sheep. So a brown animal is more likely ${winner === 'a' ? 'a goat' : 'a sheep'}.` },
        }],
      },
    ],
    done: `Right. Now there are ${T[0][0]} brown goats and only ${T[1][0]} brown sheep. How common each group is changed the answer.`,
  };
}

// ======================= Lesson 4 · Would I see this clue if I were wrong? =======================

/** The rain clues on card 2 (cards only, never a quiz). */
export const RAIN_PIC: CluePic = { topic: RAIN, counts: [[...RAIN_COUNTS[0]], [...RAIN_COUNTS[1]]], order: [0, 1] };

export function rainCard(): IdeaCard {
  // The wet grass (clue 0) is the weak clue here, and the puddles (clue 1) the strong one.
  const [wR, wW] = RAIN_PIC.counts[0], [sR, sW] = RAIN_PIC.counts[1];
  if (strongerClue(RAIN_PIC) !== 1) throw new Error('rainCard: the puddles must tell more');
  return {
    title: 'Strong clue, weak clue',
    scene: clueScene(RAIN_PIC),
    body: [
      'Did it rain last night? Two clues can help.',
      `The grass is wet on ${wR} of 10 mornings after rain. But it is also wet on ${wW} of 10 mornings with no rain, from dew and sprinklers. It is a weak clue.`,
      `Puddles are on the road on ${sR} of 10 mornings after rain, and on just ${sW} of 10 without. You would rarely see them if you were wrong. They are a strong clue.`,
    ],
  };
}

/** Board 1, right after the rain card: is each clue seen often when you are wrong, and which tells more? */
export function rainBoard(afterCard: number): DrillStep {
  const t = RAIN_PIC.topic;
  const best = strongerClue(RAIN_PIC);
  const OFTEN: DrillOption[] = YES_NO;
  const KIND: DrillOption[] = [{ id: 'strong', label: 'Strong' }, { id: 'weak', label: 'Weak' }];
  const rows: DrillRow[] = ([0, 1] as const).map((i) => {
    const d = t.clues[i];
    const [r, w] = RAIN_PIC.counts[i];
    const often = 2 * w >= 10;
    const kind = best === i ? 'strong' : 'weak';
    return {
      id: d.id,
      label: `${d.name}: ${d.say(r, true)} ${d.say(w, false)}`,
      marks: [
        { id: `${d.id}-often`, label: 'With no rain, do you see it often?', options: OFTEN, answer: yn(often), why: { [yn(!often)]: `${d.say(w, false)} That is ${often ? 'often' : 'rare'}.` } },
        { id: `${d.id}-kind`, label: 'Strong or weak clue?', options: KIND, answer: kind, why: { [kind === 'strong' ? 'weak' : 'strong']: kind === 'strong' ? `You would rarely see it if it did not rain: ${w} of 10. So it is a strong clue.` : `You would see it on ${w} of 10 mornings with no rain. So it is a weak clue.` } },
      ],
    };
  });
  const bi = best === 'same' ? 1 : best, oi = bi === 0 ? 1 : 0;
  const bestDef = t.clues[bi], other = t.clues[oi];
  rows.push({
    id: 'best',
    label: 'Did it rain last night?',
    marks: [{
      id: 'best-pick',
      label: 'Which clue tells you more?',
      options: t.clues.map((d) => ({ id: d.id, label: d.name })),
      answer: bestDef.id,
      why: { [other.id]: `${other.name} shows up on ${RAIN_PIC.counts[oi][1]} of 10 mornings with no rain. ${bestDef.name} on just ${RAIN_PIC.counts[bi][1]}. The clue you would rarely see if you were wrong tells you more.` },
    }],
  });
  return {
    id: 's13.l4-do0',
    title: 'Strong or weak?',
    body: ['These are the rain clues from the card.', 'For each clue, would you see it often with no rain? Then say which clue tells you more.'],
    scene: clueScene(RAIN_PIC),
    afterCard,
    rows,
    done: 'Right. The puddles tell you more, because you would rarely see them if it had not rained.',
  };
}

const E = EYES_PIC.cells;
export const EYES_SCENE = testScene(EYES_PIC);

export function eyesCard(): IdeaCard {
  const H = rowTotal(E, 0), N = rowTotal(E, 1), Y = colTotal(E, 0);
  if (!(E[1][0] > E[0][0])) throw new Error('eyesCard: a flagged kid must more likely see fine');
  return {
    title: 'Example: the eye check',
    scene: EYES_SCENE,
    body: [
      `100 kids get a quick eye check at school. ${H} of them need glasses. The check flags ${E[0][0] === H ? `all ${H}` : `${E[0][0]} of them`}.`,
      `It also flags ${E[1][0]} of the ${N} kids who see fine. A flag on a kid who sees fine is a false alarm.`,
      `So the check is right for ${rightFor(E)} of the 100 kids. But of its ${Y} flags, only ${E[0][0]} are right. A flagged kid more likely sees fine.`,
    ],
  };
}

/** Board 1, a twin of the example: the check flags more kids who see fine. */
export function eyesBoard(afterCard: number): DrillStep {
  const T = EYES_TWIN.cells;
  const Y = colTotal(T, 0), R = rightFor(T);
  const more = T[0][0] > T[1][0] ? 'has' : 'not';
  const row = (id: string, label: string, right: number, others: number[], why: string): DrillRow => ({
    id,
    label,
    marks: [{ id: `${id}-n`, label: 'How many?', options: numOptions(right, others), answer: String(right), why: Object.fromEntries(others.filter((n) => n !== right).map((n) => [String(n), why])) }],
  });
  return {
    id: 's13.l4-do1',
    title: 'More false alarms',
    body: [`Same school, same check. Now it flags ${T[1][0]} of the ${rowTotal(T, 1)} kids who see fine.`, 'Count the flags, the false alarms and the right answers. Then say what a flag most likely means.'],
    scene: testScene(EYES_TWIN),
    twin: `One count changed: the check now flags ${T[1][0]} of the ${rowTotal(T, 1)} kids who see fine, not ${E[1][0]}.`,
    afterCard,
    rows: [
      row('flags', 'Flags in all', Y, [T[0][0], T[1][0], T[1][1]], `The flags are the “Flagged” column: ${T[0][0]} kids who need glasses and ${T[1][0]} who see fine. That makes ${Y}.`),
      row('alarms', 'False alarms', T[1][0], [0, T[0][0], Y], `A false alarm is a flag on a kid who sees fine. That box holds ${T[1][0]}.`),
      row('right', 'Kids the check is right for', R, [T[0][0], T[1][1], rowTotal(T, 1)], `It is right for the ${T[0][0]} flagged kids who need glasses and the ${T[1][1]} kids it does not flag who see fine. That makes ${R}.`),
      {
        id: 'more',
        label: 'A kid is flagged.',
        marks: [{
          id: 'more-pick',
          label: 'Which is more likely?',
          options: [{ id: 'has', label: 'Needs glasses' }, { id: 'not', label: 'Sees fine' }],
          answer: more,
          why: { [more === 'has' ? 'not' : 'has']: `Of the ${Y} flags, ${T[0][0]} are right and ${T[1][0]} are false alarms. So a flagged kid more likely ${more === 'has' ? 'needs glasses' : 'sees fine'}.` },
        }],
      },
    ],
    done: `Right. The check is right for ${R} of the 100 kids, but only ${T[0][0]} of its ${Y} flags are right.`,
  };
}

/** The distinction of Lesson 4: how often the test is right, and how often its yes is right. */
export const RIGHT_VS_FLAG: Distinction = {
  id: 'right-vs-flag',
  a: 'How often the test is right: out of the kids who need glasses, or out of all 100.',
  b: 'How often a flag is right: out of the flagged kids only.',
};

export const L4_CLOSING = 'Those two are apart now. Back to the board: for each sentence, find the group it counts out of.';

export function flagContrast(): Extract<Scene, { kind: 'contrast' }> {
  const H = rowTotal(E, 0), Y = colTotal(E, 0);
  return {
    kind: 'contrast',
    pairs: [
      { world: `Out of the ${H} kids who need glasses.`, who: 'The sentence', says: 'The check flags most of them.', truth: 2 * E[0][0] > H, because: `It flags ${E[0][0] === H ? `all ${H}` : E[0][0]} of the ${H}.` },
      { world: `Out of the ${Y} kids it flags.`, who: 'The sentence', says: 'Most of them need glasses.', truth: 2 * E[0][0] > Y, because: `Only ${E[0][0]} of the ${Y} need glasses. The other ${E[1][0]} are false alarms.` },
    ],
    ask: { q: 'Same check, same 100 kids. How can one be true and one false?', a: 'They count out of different groups. How often the check catches kids who need glasses is not how often a flag is right.' },
    words: { worldTag: 'Out of', truth: 'True', untruth: 'False' },
  };
}

export function flagContrastCard(): IdeaCard {
  const H = rowTotal(E, 0);
  // The card's words: the check catches the kids who need glasses, yet most of its flags are false alarms.
  if (!(2 * E[0][0] > H && E[1][0] > E[0][0])) throw new Error('flagContrastCard: the check must catch most, with more false alarms');
  return {
    title: 'Right for most, or right when it flags?',
    distinction: RIGHT_VS_FLAG.id,
    scene: flagContrast(),
    body: [
      '100 kids get a quick eye check at school. A flag means the check says a kid may need glasses.',
      'A flag on a kid who sees fine is a false alarm.',
      `The check catches ${E[0][0] === H ? 'every kid who needs glasses' : 'most kids who need glasses'}. Yet most of its flags are false alarms. Both are true, because they count out of different groups.`,
      'So when a test says yes, count only its yes answers.',
    ],
  };
}

/** The sentences on the Lesson 4 board, with the group each counts out of and its truth from the picture. */
export function flagSentences(): { id: string; says: string; of: 'has' | 'flag' | 'all'; truth: boolean; facts: string }[] {
  const H = rowTotal(E, 0), Y = colTotal(E, 0), R = rightFor(E);
  return [
    { id: 't1', says: 'The check flags every kid who needs glasses.', of: 'has', truth: E[0][0] === H, facts: `Kids who need glasses: ${H}. Flagged: ${E[0][0]}.` },
    { id: 't2', says: 'The check is right for most of the 100 kids.', of: 'all', truth: 2 * R > 100, facts: `Right for ${R} of the 100.` },
    { id: 't3', says: 'Most flagged kids need glasses.', of: 'flag', truth: 2 * E[0][0] > Y, facts: `Flagged kids: ${Y}. Of them, ${E[0][0]} need glasses.` },
    { id: 't4', says: 'Most flagged kids see fine.', of: 'flag', truth: 2 * E[1][0] > Y, facts: `Flagged kids: ${Y}. Of them, ${E[1][0]} see fine.` },
  ];
}

const RIGHT_AS_FLAG =
  'You may be treating “the check is right for most kids” and “most of its flags are right” as the same thing. They are two different things. The first counts out of all 100 kids. The second counts only the flagged kids.';

const FLAG_CONFUSED: ConfusedQuestion[] = [
  {
    q: 'The check is right for most kids. Does that mean most of its flags are right?',
    options: [{ label: 'No. Count only the flags to find out', right: true }, { label: 'Yes. A good check has good flags' }, { label: 'Not sure' }],
    teach: `No. The check is right for ${rightFor(E)} of the 100 kids. But of its ${colTotal(E, 0)} flags, only ${E[0][0]} are right. Count out of the flags to judge a flag.`,
  },
  {
    q: 'What is a false alarm?',
    options: [{ label: 'A flag on a kid who sees fine', right: true }, { label: 'A kid who needs glasses but is not flagged' }, { label: 'Not sure' }],
    teach: 'A false alarm is a yes from the test when the answer is really no. Here, it is a flag on a kid who sees fine.',
  },
];

export function flagBoard(afterCard: number): DrillStep {
  const OF: DrillOption[] = [{ id: 'has', label: 'Kids who need glasses' }, { id: 'flag', label: 'Flagged kids' }, { id: 'all', label: 'All 100 kids' }];
  const ofWhy: Record<string, string> = { has: 'This sentence counts out of the kids who need glasses: their row.', flag: 'This sentence counts out of the flagged kids: the “Flagged” column.', all: 'This sentence counts out of all 100 kids.' };
  const rows: DrillRow[] = flagSentences().map((s) => ({
    id: s.id,
    label: s.says,
    marks: [
      { id: `${s.id}-of`, label: 'Out of which group?', options: OF, answer: s.of, why: Object.fromEntries(OF.filter((o) => o.id !== s.of).map((o) => [o.id, ofWhy[s.of]])) },
      { id: `${s.id}-truth`, label: 'True or false?', options: TRUE_FALSE, answer: tf(s.truth), why: { [tf(!s.truth)]: `${s.facts} ${s.truth ? 'So the sentence is true.' : 'That is not most, so the sentence is false.'}` }, compare: { says: s.says, world: s.facts } },
    ],
  }));
  const misconceptions: Misconception[] = [
    { id: 'right-as-flag', when: 'picks', picks: { 't3-truth': 'true' }, text: RIGHT_AS_FLAG },
    { id: 'right-as-flag', when: 'picks', picks: { 't3-of': 'all' }, text: RIGHT_AS_FLAG },
    { id: 'right-as-flag', when: 'picks', picks: { 't3-of': 'has' }, text: RIGHT_AS_FLAG },
  ];
  return {
    id: 's13.l4-do2',
    title: 'Which group?',
    body: ['Each sentence is about the eye check picture.', 'First pick the group it counts out of. Then say if it is true.'],
    scene: EYES_SCENE,
    afterCard,
    distinction: RIGHT_VS_FLAG.id,
    scaffold: 'full',
    rows,
    words: { says: 'Says', world: 'The counts', so: 'So', ask: 'Do the counts fit the sentence?', closing: L4_CLOSING },
    misconceptions,
    confused: FLAG_CONFUSED,
    done: 'Right. A check can be right for most kids while most of its flags are false alarms.',
  };
}
