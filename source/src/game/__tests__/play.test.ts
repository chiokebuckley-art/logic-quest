/**
 * Play components, rendered to HTML on the server (node, no DOM): each component on hand-made
 * sample items of every kind and every Scene kind. Also the pure helpers behind the line-up, grid and
 * knights controls, read-aloud, "You said" wording, the Wrong-Answer Notebook screens, and the reading
 * level of the play screens' own words.
 */
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { claimTrue, clueHolds, grade, gridClueHolds, speakerFits } from '../../engine/grade';
import { addDays, journeyDay, type CheckKind } from '../../engine/journey/mastery';
import type { NoteCard, Notebook } from '../../engine/notebook';
import { READING, fkGrade, longestSentence } from '../../engine/readability';
import { createRng } from '../../engine/rng';
import * as saves from '../../engine/save/save';
import type {
  AssignItem, ChooseItem, IdeaCard, Item, LessonDef, MultiItem, OrderItem, Rng, Scene, StopDef, TapAllItem, Thing,
} from '../../engine/types';
import { AssignGrid, AssignToggles, assignReady, assignValues, cellKey, cycleCell, markWord, nextMark, pickValue, solvedMarks, ticksIn, type Marks } from '../components/AssignView';
import { CheckResult } from '../components/CheckResult';
import { CHECK_LABEL, CheckRunner, itemSeconds, timeNote } from '../components/CheckRunner';
import type { AnswerRecord } from '../components/contracts';
import { IdeaCards } from '../components/IdeaCards';
import { ItemView, answerFor, canSubmitFor, clueNames, liveClueStates, placeName, removeAt, removeName, waitNoteFor } from '../components/ItemView';
import { LessonRecap, LessonRunner } from '../components/LessonRunner';
import { MultiView, chosenNote } from '../components/MultiView';
import { NotebookRunner, cleanFix, fixMessage } from '../components/NotebookRunner';
import { PracticeRunner } from '../components/PracticeRunner';
import { SceneView } from '../components/SceneView';
import { ThingCard } from '../components/ThingCard';
import { describeAnswer, describeRight, listWords, rightAnswer } from '../describe';
import { JourneyScreen, RepairCard } from '../screens/JourneyScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NOTEBOOK_INTRO, NotebookList, NotebookScreen, notebookGroups } from '../screens/NotebookScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { canSpeak, itemSpeech, sceneSpeech, speak, speechChunks, thingName, spoken } from '../speech';
import { StoreProvider } from '../store';

// ---------- helpers ----------

const decode = (s: string) =>
  s
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const noComments = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '');

/** Visible and screen-reader text of rendered HTML as one line, tags read as spaces. */
const flatText = (html: string) => decode(noComments(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** The same text, one element's text per line (for sentence counting: a button label is its own line). */
const linesOf = (html: string) =>
  decode(noComments(html).replace(/<[^>]+>/g, '\n'))
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

const render = (el: ReturnType<typeof h>) => {
  const html = renderToString(el);
  return { html, text: flatText(html), lines: linesOf(html) };
};

const noop = () => {};
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

// ---------- sample content ----------

const card = (id: string, size: Thing['size'], color: Thing['color'], shape: Thing['shape'], extra: Partial<Thing> = {}): Thing => ({ id, size, color, shape, ...extra });

const thingsScene: Scene = {
  kind: 'things',
  things: [
    card('a', 'big', 'red', 'circle', { mark: 'yes' }),
    card('b', 'small', 'blue', 'square', { mark: 'no' }),
    card('c', 'big', 'yellow', 'triangle', { hidden: true }),
  ],
};
const boxesScene: Scene = {
  kind: 'boxes',
  rule: 'Exactly one sign is true.',
  boxes: [
    { id: 'g', name: 'Gold box', sign: 'The treasure is in this box.' },
    { id: 's', name: 'Silver box', sign: 'The treasure is not in this box.' },
    { id: 'l', name: 'Lead box', sign: 'The treasure is not in the Gold box.' },
  ],
};
const textScene: Scene = { kind: 'text', lines: ['The sun is a star.'] };

const chooseText: ChooseItem = {
  id: 'c1',
  stop: 9,
  lesson: 's9.l1',
  skill: 's9.statement',
  kind: 'choose',
  prompt: 'Is this sentence a statement?',
  scene: textScene,
  choices: [
    { id: 'yes', label: 'A statement' },
    { id: 'no', label: 'Not a statement' },
  ],
  answer: 'yes',
  whyWrong: { no: 'It can be true or false, so it is a statement.' },
  explain: 'The sentence is either true or false. So it is a statement.',
  hint: 'Can this sentence be true or false?',
};

// Which box has the treasure? Worked out by checking each box (see the test below).
const chooseBoxes: ChooseItem = {
  id: 'c2',
  stop: 9,
  lesson: 's9.l2',
  skill: 's9.signs',
  kind: 'choose',
  prompt: 'Which box has the treasure?',
  scene: boxesScene,
  choices: [
    { id: 'g', label: 'Gold box' },
    { id: 's', label: 'Silver box' },
    { id: 'l', label: 'Lead box' },
  ],
  answer: 's',
  explain: 'If it is in Silver, only sign 3 is true. Every other box makes two signs true.',
};

const chooseThings: ChooseItem = {
  id: 'c3',
  stop: 9,
  lesson: 's9.l1',
  skill: 's9.cards',
  kind: 'choose',
  prompt: 'Is there a red card?',
  scene: thingsScene,
  choices: [
    { id: 't', label: 'True' },
    { id: 'f', label: 'False' },
    { id: 'x', label: "Can't tell" },
  ],
  answer: 't',
  explain: 'The first card is a big red circle.',
  conflict: true,
};

const tapThings = [card('t1', 'big', 'red', 'circle'), card('t2', 'small', 'red', 'square'), card('t3', 'big', 'blue', 'circle'), card('t4', 'small', 'yellow', 'triangle')];
const tapFits = (t: Thing) => t.color === 'red' && t.shape === 'circle';
const tapOrAsAnd = (t: Thing) => t.color === 'red' || t.shape === 'circle';
const tapall: TapAllItem = {
  id: 't1',
  stop: 9,
  lesson: 's9.l2',
  skill: 's9.and',
  kind: 'tapall',
  prompt: 'Tap every card that is red AND a circle.',
  things: tapThings,
  answer: tapThings.filter(tapFits).map((t) => t.id),
  diagnose: [{ ids: tapThings.filter(tapOrAsAnd).map((t) => t.id), message: 'You tapped cards that match only one part. AND needs both parts.' }],
  explain: 'Only the big red circle is red and a circle.',
  hint: 'Look for cards that match both parts.',
};

const orderItem: OrderItem = {
  id: 'o1',
  stop: 9,
  lesson: 's9.l2',
  skill: 's9.lineup',
  kind: 'order',
  prompt: 'Who finished where? Build the whole line.',
  names: [
    { id: 'ava', label: 'Ava' },
    { id: 'ben', label: 'Ben' },
    { id: 'cal', label: 'Cal' },
  ],
  clues: [
    { t: 'first', a: 'ava' },
    { t: 'before', a: 'cal', b: 'ben' },
  ],
  scene: { kind: 'clues', clues: ['Ava finished first.', 'Cal finished before Ben.'] },
  answer: ['ava', 'cal', 'ben'],
  firstLabel: 'Finished first',
  lastLabel: 'Finished last',
  explain: 'Ava is first. Cal is before Ben, so Cal is second and Ben is last.',
};

const ALL_ITEMS: Item[] = [chooseText, chooseBoxes, chooseThings, tapall, orderItem];

const ideas: IdeaCard[] = [
  { title: 'A statement is true or false', body: ['A statement is a sentence that is either true or false.', 'A question is not a statement.'] },
  { title: 'Cards can hide', body: ['A face-down card could be any card.'], scene: thingsScene },
  { title: 'Check every case', body: ['Try each way the hidden card could be.'] },
];

const pickFrom = (items: Item[]) => (rng: Rng) => rng.shuffle(items).slice(0, 3);
const lesson1: LessonDef = { id: 's9.l1', title: 'What is a statement?', ideas, practice: (rng) => pickFrom([chooseText, chooseThings, { ...chooseText, id: 'c1b' }])(rng) };
const lesson2: LessonDef = { id: 's9.l2', title: 'Signs and lines', ideas: ideas.slice(0, 1), practice: () => [chooseBoxes, tapall, orderItem] };
const stop: StopDef = {
  n: 9,
  id: 's9',
  title: 'Sample Stop',
  idea: 'A sample stop for tests.',
  ready: true,
  lessons: [lesson1, lesson2],
  check: () => [chooseText, chooseBoxes, tapall, orderItem],
  practice: (rng) => rng.pick(ALL_ITEMS),
};

const rec = (item: Item, correct: boolean, extra: Partial<AnswerRecord> = {}): AnswerRecord => ({
  itemId: item.id,
  stop: item.stop,
  lesson: item.lesson,
  skill: item.skill,
  correct,
  firstTry: correct,
  ms: 1000,
  ...extra,
});

// ---------- the sample content itself is logically right ----------

describe('sample items', () => {
  it('have exactly one right answer, worked out by cases', () => {
    // Treasure boxes: exactly one box makes exactly one sign true.
    const signTrue = (box: string) => [box === 'g', box !== 's', box !== 'g'];
    const works = ['g', 's', 'l'].filter((b) => signTrue(b).filter(Boolean).length === 1);
    expect(works).toEqual([chooseBoxes.answer]);
    // Line-up: exactly one order fits every clue.
    const fits = permutations(orderItem.names.map((n) => n.id)).filter((p) => orderItem.clues.every((c) => clueHolds(c, p)));
    expect(fits).toEqual([orderItem.answer]);
    // Tap-all: the diagnose set differs from the answer.
    expect(tapall.answer).toEqual(['t1']);
    expect(tapall.diagnose![0].ids.sort()).not.toEqual([...tapall.answer].sort());
  });
});

// ---------- speech and names ----------

describe('speech helpers', () => {
  it('names cards the way people say them', () => {
    expect(thingName(card('x', 'big', 'red', 'circle'))).toBe('big red circle');
    expect(thingName(card('x', 'small', 'blue', 'square', { hidden: true }))).toBe('face-down card');
    expect(thingName(card('x', 'small', 'yellow', 'triangle', { mark: 'yes' }))).toBe('small yellow triangle, marked yes');
    expect(thingName(card('x', 'small', 'yellow', 'triangle', { mark: 'no' }))).toBe('small yellow triangle, marked no');
  });

  it('reads every scene kind', () => {
    expect(sceneSpeech(thingsScene)).toEqual(['Card 1: big red circle, marked yes.', 'Card 2: small blue square, marked no.', 'Card 3: face-down card.']);
    const boxes = sceneSpeech(boxesScene);
    expect(boxes[0]).toBe('Exactly one sign is true.');
    expect(boxes[1]).toBe('Gold box sign: The treasure is in this box.');
    expect(sceneSpeech(orderItem.scene!)).toEqual(['Clue 1: Ava finished first.', 'Clue 2: Cal finished before Ben.']);
    expect(sceneSpeech({ kind: 'text', lines: ['Close the door'] })).toEqual(['Close the door.']);
  });

  it('says rule brackets out loud and lowercases AND, OR and NOT', () => {
    expect(spoken('Tap every card that is NOT (red AND big).')).toBe('Tap every card that is not, open bracket, red and big, close bracket.');
    expect(spoken('Ava is taller (tallest first).')).toBe('Ava is taller (tallest first).');
    expect(spoken('Stop 2 · Lesson 3')).toBe('Stop 2, Lesson 3');
    expect(spoken('A check mark (✓) in a box means yes.')).toBe('A check mark in a box means yes.');
    expect(spoken('Which box gets a ✓? Leo’s row has four ✗s.')).toBe('Which box gets a check mark? Leo’s row has four crosses.');
    expect(spoken('Frost – diamond')).toBe('Frost, diamond');
  });

  it('reads the prompt, then the scene, then the choices', () => {
    const lines = itemSpeech(chooseText);
    expect(lines[0]).toBe('Is this sentence a statement?');
    expect(lines).toContain('The sun is a star.');
    expect(lines.slice(-2)).toEqual(['A statement.', 'Not a statement.']);
    expect(itemSpeech(tapall).join(' ')).toContain('big red circle, small red square');
    expect(itemSpeech(orderItem).join(' ')).toContain('from finished first to finished last: Ava, Ben, Cal.');
  });

  it('splits long text into short pieces on sentence breaks', () => {
    const long = Array.from({ length: 12 }, (_, i) => `This is sentence number ${i + 1} of the list.`);
    const chunks = speechChunks(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(180);
    expect(chunks.join(' ')).toBe(long.join(' '));
  });

  it('is quiet and safe without a browser', () => {
    expect(canSpeak()).toBe(false);
    expect(speak('Hello there.')).toBe(false);
  });
});

// ---------- line-up helpers ----------

describe('line-up helpers', () => {
  it('places names in the next open spot and takes them back out', () => {
    let s = placeName([null, null, null], 'ava');
    expect(s).toEqual(['ava', null, null]);
    s = placeName(s, 'ben');
    s = placeName(s, 'ben'); // already placed: no change
    expect(s).toEqual(['ava', 'ben', null]);
    s = removeAt(s, 0);
    expect(s).toEqual([null, 'ben', null]);
    s = placeName(s, 'cal'); // fills the first gap
    expect(s).toEqual(['cal', 'ben', null]);
    expect(removeName(s, 'ben')).toEqual(['cal', null, null]);
    expect(placeName(['a', 'b'], 'c')).toEqual(['a', 'b']); // line full
  });

  it('judges a clue only once everyone it names is placed', () => {
    expect(clueNames({ t: 'between', a: 'a', b: 'b', c: 'c' })).toEqual(['a', 'b', 'c']);
    expect(liveClueStates(orderItem, [null, null, null])).toEqual([null, null]);
    expect(liveClueStates(orderItem, ['ava', null, null])).toEqual(['ok', null]);
    expect(liveClueStates(orderItem, [null, 'ava', null])).toEqual(['broken', null]);
    expect(liveClueStates(orderItem, ['ava', 'ben', 'cal'])).toEqual(['ok', 'broken']);
    expect(liveClueStates(orderItem, ['ava', 'cal', 'ben'])).toEqual(['ok', 'ok']);
  });

  it('keeps empty spots in place, so "last" and "right before" use real spot numbers', () => {
    const it4: OrderItem = {
      ...orderItem,
      names: [...orderItem.names, { id: 'dee', label: 'Dee' }],
      clues: [
        { t: 'rightBefore', a: 'ava', b: 'ben' },
        { t: 'last', a: 'cal' },
        { t: 'notNextTo', a: 'ava', b: 'dee' },
      ],
    };
    expect(liveClueStates(it4, ['ava', null, 'ben', null])).toEqual(['broken', null, null]);
    expect(liveClueStates(it4, ['ava', 'ben', 'cal', null])).toEqual(['ok', 'broken', null]);
    expect(liveClueStates(it4, [null, null, null, 'cal'])).toEqual([null, 'ok', null]);
    expect(liveClueStates(it4, ['ava', null, 'dee', null])).toEqual([null, null, 'ok']);
  });

  it('agrees with grade() on every complete line', () => {
    const clues: OrderItem['clues'] = [
      { t: 'before', a: 'a', b: 'b' },
      { t: 'rightBefore', a: 'c', b: 'd' },
      { t: 'nextTo', a: 'a', b: 'd' },
      { t: 'notNextTo', a: 'b', b: 'c' },
      { t: 'between', a: 'b', b: 'a', c: 'd' },
      { t: 'first', a: 'c' },
      { t: 'last', a: 'b' },
      { t: 'notFirst', a: 'a' },
      { t: 'notLast', a: 'd' },
      { t: 'place', a: 'd', k: 2 },
    ];
    const ids = ['a', 'b', 'c', 'd'];
    // No answer, so grade() always lists the broken clues instead of stopping at "correct".
    const item: OrderItem = { ...orderItem, names: ids.map((id) => ({ id, label: id.toUpperCase() })), clues, answer: [], scene: { kind: 'clues', clues: clues.map((c) => c.t) } };
    for (const p of permutations(ids)) {
      const live = liveClueStates(item, p);
      const g = grade(item, { kind: 'order', ids: p });
      const brokenLive = live.map((s, i) => (s === 'broken' ? i : -1)).filter((i) => i >= 0);
      expect(live.every((s) => s !== null)).toBe(true);
      expect(brokenLive).toEqual(g.broken);
    }
  });

  it('builds the Answer each kind needs for grade()', () => {
    expect(answerFor(chooseText, null, [], [])).toBeNull();
    expect(grade(chooseText, answerFor(chooseText, 'yes', [], [])).correct).toBe(true);
    expect(grade(tapall, answerFor(tapall, null, ['t1'], [])).correct).toBe(true);
    expect(grade(tapall, answerFor(tapall, null, [], [])).correct).toBe(false);
    expect(grade(orderItem, answerFor(orderItem, null, [], ['ava', 'cal', 'ben'])).correct).toBe(true);
    expect(grade(orderItem, answerFor(orderItem, null, [], ['ava', null, 'ben'])).correct).toBe(false);
  });
});

// ---------- components ----------

describe('ThingCard', () => {
  it('draws a named shape, big twice the size of small', () => {
    const big = render(h(ThingCard, { thing: card('x', 'big', 'red', 'circle') })).html;
    const small = render(h(ThingCard, { thing: card('x', 'small', 'red', 'circle') })).html;
    expect(big).toContain('aria-label="big red circle"');
    expect(big).toContain('role="img"');
    expect(big).toContain('fill="#ff4d6d"');
    expect(big).toContain('r="23"');
    expect(small).toContain('r="11.5"');
    expect(render(h(ThingCard, { thing: card('x', 'big', 'blue', 'square') })).html).toContain('width="42"');
    expect(render(h(ThingCard, { thing: card('x', 'small', 'yellow', 'triangle') })).html).toContain('fill="#facc15"');
  });

  it('draws a face-down card with a ? and a mark badge', () => {
    const back = render(h(ThingCard, { thing: card('x', 'big', 'red', 'circle', { hidden: true }) }));
    expect(back.html).toContain('aria-label="face-down card"');
    expect(back.text).toContain('?');
    expect(back.html).not.toContain('#ef4444'); // the hidden color never leaks into the drawing
    const marked = render(h(ThingCard, { thing: card('x', 'big', 'red', 'circle', { mark: 'no' }) }));
    expect(marked.html).toContain('aria-label="big red circle, marked no"');
    expect(marked.html).toContain('#ff7a1a');
  });

  it('is a real toggle button when selectable', () => {
    const off = render(h(ThingCard, { thing: tapThings[0], onToggle: noop })).html;
    expect(off).toMatch(/^<button/);
    expect(off).toContain('aria-pressed="false"');
    const on = render(h(ThingCard, { thing: tapThings[0], onToggle: noop, pressed: true, fits: true })).html;
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('big red circle, fits');
  });
});

describe('SceneView', () => {
  it('draws a row of cards', () => {
    const { html } = render(h(SceneView, { scene: thingsScene }));
    expect(count(html, '<li')).toBe(3);
    expect(html).toContain('big red circle, marked yes');
    expect(html).toContain('face-down card');
  });

  it('draws three boxes with their signs and the rule', () => {
    const { text } = render(h(SceneView, { scene: boxesScene }));
    for (const s of ['Rule', 'Exactly one sign is true.', 'Gold box', 'Silver box', 'Lead box', 'Sign 1 says:', 'The treasure is not in the Gold box.']) expect(text).toContain(s);
  });

  it('draws numbered clues, with live states when given', () => {
    const plain = render(h(SceneView, { scene: orderItem.scene! }));
    expect(plain.text).toContain('Ava finished first.');
    expect(plain.text).toContain('Clue 1 : Ava finished first.');
    expect(plain.html).not.toContain('play-clue--');
    const live = render(h(SceneView, { scene: orderItem.scene!, clueState: ['ok', 'broken'] }));
    expect(live.html).toContain('play-clue--ok');
    expect(live.html).toContain('play-clue--broken');
    expect(live.text).toContain('(this clue holds)');
    expect(live.text).toContain('(this clue is broken)');
  });

  it('draws a quote card', () => {
    const { html, text } = render(h(SceneView, { scene: { kind: 'text', lines: ['Line one.', 'Line two.'] } }));
    expect(html).toContain('<blockquote');
    expect(text).toContain('Line one. Line two.');
  });
});

describe('ItemView', () => {
  it('choose, learn mode: prompt, scene, radio choices, Hint, Check and Read aloud', () => {
    const { html, text } = render(h(ItemView, { item: chooseText, mode: 'learn', onDone: noop, readAloud: true }));
    expect(text).toContain('Your turn');
    expect(text).toContain('Is this sentence a statement?');
    expect(text).toContain('The sun is a star.');
    expect(html).toContain('role="radiogroup"');
    expect(count(html, 'role="radio"')).toBe(2);
    expect(text).toContain('A statement');
    expect(text).toContain('Not a statement');
    expect(text).toContain('Hint');
    expect(text).toContain('Check');
    expect(html).toContain('aria-label="Read aloud"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('role="progressbar"');
    // Nothing is picked yet, so Check waits.
    expect(text).toContain('Pick an answer to go on.');
  });

  it('check mode: no hint, a Next button, and a calm timer only when asked', () => {
    const timed = render(h(ItemView, { item: chooseText, mode: 'check', onDone: noop, readAloud: false, timeLimit: 90 }));
    expect(timed.text).not.toContain('Hint');
    expect(timed.text).not.toContain(chooseText.hint!);
    expect(timed.text).toContain('Next');
    expect(timed.text).toContain('Question');
    expect(timed.html).toContain('role="progressbar"');
    expect(timed.html).toContain('aria-valuemax="90"');
    expect(timed.html).not.toContain('Read aloud');
    const untimed = render(h(ItemView, { item: chooseText, mode: 'check', onDone: noop, readAloud: false, timeLimit: null }));
    expect(untimed.html).not.toContain('role="progressbar"');
    const finish = render(h(ItemView, { item: chooseText, mode: 'check', onDone: noop, readAloud: false, nextLabel: 'Finish' }));
    expect(finish.text).toContain('Finish');
  });

  it('choose with boxes and with a row of cards', () => {
    const boxes = render(h(ItemView, { item: chooseBoxes, mode: 'learn', onDone: noop, readAloud: false }));
    expect(boxes.text).toContain('Which box has the treasure?');
    expect(boxes.text).toContain('Exactly one sign is true.');
    expect(boxes.html).toContain('play-choices--short');
    expect(boxes.text).not.toContain('Hint'); // no hint on this item
    const things = render(h(ItemView, { item: chooseThings, mode: 'learn', onDone: noop, readAloud: false }));
    expect(things.html).toContain('face-down card');
    expect(things.text).toContain("Can't tell");
  });

  it('tapall: one toggle button per card, and Check works with none chosen', () => {
    const { html, text } = render(h(ItemView, { item: tapall, mode: 'learn', onDone: noop, readAloud: false }));
    expect(text).toContain('Tap every card that is red AND a circle.');
    expect(count(html, 'aria-pressed="false"')).toBe(tapThings.length);
    expect(text).not.toContain('If none fit');
    expect(text).toContain('0 chosen');
    expect(html).toMatch(/<button[^>]*class="play-btn play-btn--primary play-btn--grow"[^>]*>Check</);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Check</);
  });

  it('order: names to place, labelled empty spots, and the clue list', () => {
    const { html, text } = render(h(ItemView, { item: orderItem, mode: 'learn', onDone: noop, readAloud: false }));
    for (const s of ['Ava', 'Ben', 'Cal', 'Finished first', 'Finished last', 'Ava finished first.', 'Cal finished before Ben.']) expect(text).toContain(s);
    expect(count(text, 'Empty')).toBe(3);
    expect(text).toContain('Place everyone to go on.');
    expect(html).toContain('aria-label="Ava. Tap to place."');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Check</);
  });
});

describe('IdeaCards', () => {
  it('shows the first card with dots and Next', () => {
    const { html, text } = render(h(IdeaCards, { cards: ideas, readAloud: true, onDone: noop }));
    expect(text).toContain('Key idea');
    expect(text).toContain('1 of 3');
    expect(text).toContain('A statement is true or false');
    expect(text).toContain('A question is not a statement.');
    expect(text).toContain('Next');
    expect(text).not.toContain('Back');
    expect(html).toContain('aria-label="Card 1 of 3"');
    expect(html).toContain('aria-label="Read aloud"');
  });

  it('a single card says "Try it" and can show a scene', () => {
    const { html, text } = render(h(IdeaCards, { cards: [ideas[1]], readAloud: false, onDone: noop }));
    expect(text).toContain('Try it');
    expect(html).toContain('face-down card');
    expect(html).not.toContain('Read aloud');
  });
});

describe('LessonRunner', () => {
  it('starts with the key ideas under a lesson header', () => {
    const { html, text } = render(h(LessonRunner, { stop, lesson: lesson1, seed: 7, readAloud: false, onAnswer: noop, onComplete: noop, onExit: noop }));
    expect(text).toContain('Stop 9 · Lesson 1 of 2');
    expect(html).toContain('<h1');
    expect(text).toContain('What is a statement?');
    expect(text).toContain('A statement is true or false');
    expect(html).toContain('aria-label="Leave the lesson"');
    expect(html).toContain('aria-label="Key ideas"');
  });

  it('goes straight to the tries when a lesson has no key ideas', () => {
    const bare: LessonDef = { ...lesson2, ideas: [] };
    const { text } = render(h(LessonRunner, { stop, lesson: bare, seed: 1, readAloud: false, onAnswer: noop, onComplete: noop, onExit: noop }));
    expect(text).toContain('Stop 9 · Lesson 2 of 2');
    expect(text).toContain('Try 1 of 3');
    expect(text).toContain(chooseBoxes.prompt);
  });

  it('ends with a short recap', () => {
    const { text } = render(h(LessonRecap, { stop, lesson: lesson1, tries: 3, firstTry: 2, onDone: noop }));
    expect(text).toContain('Lesson done');
    expect(text).toContain('You got 2 of 3 right on the first try.');
    expect(text).toContain('What you learned');
    expect(text).toContain('Check every case');
    expect(text).toContain('Next: Lesson 2 · Signs and lines');
    expect(text).toContain('Done');
    const last = render(h(LessonRecap, { stop, lesson: lesson2, tries: 3, firstTry: 3, onDone: noop })).text;
    expect(last).toContain('That was the last lesson in Stop 9.');
  });
});

describe('CheckRunner', () => {
  const kinds: CheckKind[] = ['pass', 'lockin', 'week'];
  it.each(kinds)('%s: kicker, question count and the first item in check mode', (kind) => {
    const items = stop.check!(createRng(1));
    const { html, text } = render(h(CheckRunner, { stop, kind, items, timeLimit: 90, readAloud: false, onFinish: noop, onExit: noop }));
    expect(text).toContain(CHECK_LABEL[kind]);
    expect(text).toContain(`Question 1 of ${items.length}`);
    expect(text).toContain('90 seconds for this question');
    expect(text).toContain(items[0].prompt);
    expect(text).not.toContain('Hint');
    expect(html).toContain('role="progressbar"');
  });

  it('labels the three kinds', () => {
    expect(CHECK_LABEL).toEqual({ pass: 'Stop check', lockin: 'Lock-in check', week: 'Week check' });
  });

  it('shows no timer when grown-ups turned it off', () => {
    const { html, text } = render(h(CheckRunner, { stop, kind: 'pass', items: [tapall], timeLimit: null, readAloud: true, onFinish: noop, onExit: noop }));
    expect(text).toContain('No timer');
    expect(text).toContain('Finish'); // the only question is the last one
    expect(html).not.toContain('role="progressbar"');
    expect(html).toContain('aria-label="Read aloud"');
  });
});

describe('CheckResult', () => {
  const items = [chooseText, chooseBoxes, tapall, orderItem];

  it.each([
    ['pass', 'Stop 9 is passed'],
    ['lockin', 'Stop 9 is locked in'],
    ['week', 'Stop 9 is mastered'],
  ] as const)('passed %s check says what comes next', (kind, next) => {
    const { text } = render(
      h(CheckResult, { stop, kind, items, records: items.map((it) => rec(it, true)), passed: true, missed: [], onLearnAgain: noop, onDone: noop }),
    );
    expect(text).toContain('Passed');
    expect(text).toContain(`You got all ${items.length} right.`);
    expect(text).toContain(next);
    expect(text).toContain('Back to the stop');
    expect(text).not.toContain('Learn this again');
  });

  it('not yet: lists each missed question by lesson with its answer and a Learn this again button', () => {
    const records = [rec(chooseText, false), rec(chooseBoxes, true), rec(tapall, false, { timedOut: true }), rec(orderItem, false)];
    const { html, text } = render(
      h(CheckResult, { stop, kind: 'pass', items, records, passed: false, missed: ['s9.l1', 's9.l2'], onLearnAgain: noop, onDone: noop }),
    );
    expect(text).toContain('Not yet · 1 of 4');
    expect(text).toContain('A stop passes when every answer is right.');
    // Grouped by lesson, in lesson order.
    const l1 = text.indexOf('Lesson 1 · What is a statement?');
    const l2 = text.indexOf('Lesson 2 · Signs and lines');
    expect(l1).toBeGreaterThanOrEqual(0);
    expect(l2).toBeGreaterThan(l1);
    expect(text.indexOf(chooseText.prompt)).toBeGreaterThan(l1);
    expect(text.indexOf(chooseText.prompt)).toBeLessThan(l2);
    expect(text.indexOf(tapall.prompt)).toBeGreaterThan(l2);
    // The right item was not listed.
    expect(text).not.toContain(chooseBoxes.prompt);
    // Answers and reasons.
    expect(text).toContain(chooseText.explain);
    expect(text).toContain(orderItem.explain);
    expect(text).toContain('Finished first to finished last: Ava, Cal, Ben');
    expect(html).toContain('aria-label="Cards that fit"');
    // A timeout shows under "You said". No answer was kept for the other misses, so they have no "You said".
    expect(text).toContain('You said Time ran out.');
    expect(count(text, 'You said')).toBe(1);
    expect(text).toContain('See the question again');
    expect(text).toContain('Learn it again: Lesson 1');
    expect(text).toContain('Learn it again: Lesson 2');
    expect(text).toContain('new questions');
    expect(text).toContain('How a stop is locked in');
  });
});

describe('PracticeRunner', () => {
  it('draws item 0 from createRng(seed)', () => {
    const first = stop.practice!(createRng(42));
    const { html, text } = render(h(PracticeRunner, { stop, seed: 42, readAloud: false, onAnswer: noop, onExit: noop }));
    expect(text).toContain('Solve as many puzzles as you like.');
    expect(text).toContain(first.prompt);
    expect(text).toContain('Puzzle 1');
    expect(html).toContain('aria-label="Back to the Arcade"');
  });

  it('says so when a stop has no practice yet', () => {
    const { text } = render(h(PracticeRunner, { stop: { ...stop, practice: undefined }, seed: 1, readAloud: false, onAnswer: noop, onExit: noop }));
    expect(text).toContain('Practice for this stop is not ready yet.');
  });
});

// ---------- sample items of the v0.2 kinds: logic grids, knights and knaves, text cards ----------

const kids = [
  { id: 'mia', label: 'Mia' },
  { id: 'leo', label: 'Leo' },
  { id: 'zara', label: 'Zara' },
];
const pets = { id: 'pet', label: 'Pet', oneEach: true, values: [{ id: 'cat', label: 'cat' }, { id: 'dog', label: 'dog' }, { id: 'fish', label: 'fish' }] };
const snacks = { id: 'snack', label: 'Snack', oneEach: true, values: [{ id: 'apple', label: 'apple' }, { id: 'popcorn', label: 'popcorn' }, { id: 'grapes', label: 'grapes' }] };
const petClues = ['Leo does not have the cat.', 'Leo does not have the dog.', 'Mia does not have the dog.'];

const gridItem: AssignItem = {
  id: 'g1',
  stop: 9,
  lesson: 's9.l2',
  skill: 's9.grid',
  kind: 'assign',
  layout: 'grid',
  prompt: 'Who has which pet? Use the clues to fill in the grid.',
  people: kids,
  categories: [pets],
  gridClues: [
    { t: 'isnt', p: 'leo', c: 'pet', v: 'cat' },
    { t: 'isnt', p: 'leo', c: 'pet', v: 'dog' },
    { t: 'isnt', p: 'mia', c: 'pet', v: 'dog' },
  ],
  scene: { kind: 'clues', clues: petClues },
  answer: { mia: { pet: 'cat' }, leo: { pet: 'fish' }, zara: { pet: 'dog' } },
  explain: 'Leo can only have the fish. Mia can’t have the dog, so Mia has the cat. That leaves the dog for Zara.',
  hint: 'Start with Leo’s row.',
};

const grid2: AssignItem = {
  ...gridItem,
  id: 'g2',
  seconds: 180,
  prompt: 'Who has which pet, and who eats which snack?',
  categories: [pets, snacks],
  gridClues: [...gridItem.gridClues!, { t: 'link', c1: 'pet', v1: 'dog', c2: 'snack', v2: 'grapes' }, { t: 'is', p: 'mia', c: 'snack', v: 'apple' }],
  scene: { kind: 'clues', clues: [...petClues, 'The dog owner eats the grapes.', 'Mia eats the apple.'] },
  answer: { mia: { pet: 'cat', snack: 'apple' }, leo: { pet: 'fish', snack: 'popcorn' }, zara: { pet: 'dog', snack: 'grapes' } },
  explain: 'Leo has the fish, Mia the cat and Zara the dog. Zara owns the dog, so Zara eats the grapes. Mia eats the apple, so Leo eats the popcorn.',
};

const kindCat = { id: 'kind', label: 'Knight or knave', oneEach: false, values: [{ id: 'knight', label: 'Knight' }, { id: 'knave', label: 'Knave' }] };
const knights: AssignItem = {
  id: 'k1',
  stop: 9,
  lesson: 's9.l2',
  skill: 's9.knights',
  kind: 'assign',
  layout: 'toggles',
  prompt: 'Who is a knight and who is a knave?',
  people: [
    { id: 'ava', label: 'Ava' },
    { id: 'ben', label: 'Ben' },
  ],
  categories: [kindCat],
  claims: { ava: { t: 'is', who: 'ben', kind: 'knave' }, ben: { t: 'same', a: 'ava', b: 'ben' } },
  scene: {
    kind: 'speakers',
    rule: 'Knights always tell the truth. Knaves always lie.',
    speakers: [
      { id: 'ava', name: 'Ava', says: 'Ben is a knave.' },
      { id: 'ben', name: 'Ben', says: 'Ava and I are the same kind.' },
    ],
  },
  answer: { ava: { kind: 'knight' }, ben: { kind: 'knave' } },
  explain: 'Ava is a knight, so Ben is a knave. Ben’s words must be false, and they are: Ava and Ben are not the same kind.',
  hint: 'Suppose Ava is a knave. What would that make Ben?',
};

const wason: MultiItem = {
  id: 'm1',
  stop: 9,
  lesson: 's9.l1',
  skill: 's9.checker',
  kind: 'multi',
  prompt: 'Which cards must you turn over to check that nobody broke the rule?',
  scene: { kind: 'text', lines: ['If you have dessert, then you finished your veggies.'] },
  choices: [
    { id: 'd', label: 'Dessert' },
    { id: 'nd', label: 'No dessert' },
    { id: 'vf', label: 'Veggies finished' },
    { id: 'vl', label: 'Veggies left' },
  ],
  answer: ['d', 'vl'],
  missTips: { d: 'Dessert could hide veggies left. You have to look.', vl: 'Veggies left could hide a dessert.' },
  pickTips: { nd: 'No dessert can’t break a rule about dessert.', vf: 'Veggies finished is fine with or without dessert.' },
  explain: 'Only Dessert and Veggies left can hide a broken rule.',
};

const letters: MultiItem = {
  ...wason,
  id: 'm2',
  prompt: 'Which cards must you turn over to test the rule?',
  scene: { kind: 'text', lines: ['If a card has a vowel on one side, then it has an even number on the other side.'] },
  choices: [
    { id: 'e', label: 'E' },
    { id: 'k', label: 'K' },
    { id: 'n4', label: '4' },
    { id: 'n7', label: '7' },
  ],
  answer: ['e', 'n7'],
  missTips: undefined,
  pickTips: undefined,
  explain: 'E is the IF card. The 7 shows that the THEN part did not happen.',
};

const gridScene: Scene = {
  kind: 'grid',
  rows: kids,
  cols: pets.values,
  marks: { leo: { cat: 'no', dog: 'no', fish: 'yes' }, mia: { dog: 'no' } },
  caption: 'After clues 1 and 2.',
};

const NEW_ITEMS: Item[] = [gridItem, grid2, knights, wason, letters];

/** Every full assignment that fits an assign item's clues or claims (brute force). */
function fits(item: AssignItem): Record<string, Record<string, string>>[] {
  const people = item.people.map((p) => p.id);
  const perCat = item.categories.map((c) => {
    const ids = c.values.map((v) => v.id);
    if (c.oneEach) return permutations(ids);
    let out: string[][] = [[]];
    for (let i = 0; i < people.length; i++) out = out.flatMap((pre) => ids.map((v) => [...pre, v]));
    return out;
  });
  let combos: string[][][] = [[]];
  for (const opts of perCat) combos = combos.flatMap((pre) => opts.map((o) => [...pre, o]));
  return combos
    .map((combo) => Object.fromEntries(people.map((p, i) => [p, Object.fromEntries(item.categories.map((c, k) => [c.id, combo[k][i]]))])))
    .filter((values) => {
      if (item.gridClues && !item.gridClues.every((cl) => gridClueHolds(cl, values))) return false;
      const kinds = Object.fromEntries(people.map((p) => [p, values[p].kind === 'knight' ? 'knight' : 'knave'])) as Record<string, 'knight' | 'knave'>;
      return !item.claims || people.every((p) => !item.claims![p] || speakerFits(p, item.claims![p], kinds));
    });
}

/** Rule-checker cards: a card must be turned when some hidden side could break "if P then Q". */
function mustTurn(faces: { id: string; side: 'p' | 'q'; holds: boolean }[]): string[] {
  const broken = (p: boolean, q: boolean) => p && !q;
  return faces.filter((f) => [true, false].some((hidden) => (f.side === 'p' ? broken(f.holds, hidden) : broken(hidden, f.holds)))).map((f) => f.id);
}

describe('sample items of the v0.2 kinds', () => {
  it('assign items: exactly one assignment fits, and it is the answer', () => {
    for (const item of [gridItem, grid2, knights]) {
      const all = fits(item);
      expect(all, item.id).toHaveLength(1);
      expect(all[0], item.id).toEqual(item.answer);
      expect(item.scene?.kind === 'clues' ? item.scene.clues.length : item.people.length).toBe(item.gridClues?.length ?? item.people.length);
    }
    // The knight's words are true and the knave's are false.
    expect(claimTrue(knights.claims!.ava, { ava: 'knight', ben: 'knave' })).toBe(true);
    expect(claimTrue(knights.claims!.ben, { ava: 'knight', ben: 'knave' })).toBe(false);
  });

  it('rule-checker items: the answer is every card that could hide a broken rule', () => {
    expect(mustTurn([
      { id: 'd', side: 'p', holds: true },
      { id: 'nd', side: 'p', holds: false },
      { id: 'vf', side: 'q', holds: true },
      { id: 'vl', side: 'q', holds: false },
    ])).toEqual(wason.answer);
    expect(mustTurn([
      { id: 'e', side: 'p', holds: true },
      { id: 'k', side: 'p', holds: false },
      { id: 'n4', side: 'q', holds: true },
      { id: 'n7', side: 'q', holds: false },
    ])).toEqual(letters.answer);
  });
});

// ---------- grid and knights controls ----------

const tick = (m: Marks, p: string, c: string, v: string): Marks => ({ ...m, [cellKey(p, c, v)]: 'yes' });
const cross = (m: Marks, p: string, c: string, v: string): Marks => ({ ...m, [cellKey(p, c, v)]: 'no' });

describe('grid and knights helpers', () => {
  it('a box cycles blank -> cross -> tick -> blank', () => {
    expect(nextMark(undefined)).toBe('no');
    expect(nextMark('no')).toBe('yes');
    expect(nextMark('yes')).toBeUndefined();
    let m: Marks = {};
    m = cycleCell(m, 'mia', 'pet', 'cat');
    expect(m).toEqual({ [cellKey('mia', 'pet', 'cat')]: 'no' });
    m = cycleCell(m, 'mia', 'pet', 'cat');
    expect(m).toEqual({ [cellKey('mia', 'pet', 'cat')]: 'yes' });
    m = cycleCell(m, 'mia', 'pet', 'cat');
    expect(m).toEqual({});
    expect([markWord(undefined), markWord('no'), markWord('yes')]).toEqual(['blank', 'no', 'yes']);
  });

  it('a tick does not fill in any crosses', () => {
    const m = cycleCell(cycleCell({}, 'mia', 'pet', 'cat'), 'mia', 'pet', 'cat');
    expect(Object.keys(m)).toHaveLength(1);
    expect(ticksIn(gridItem, m, 'mia', 'pet')).toEqual(['cat']);
  });

  it('the answer is each person’s one tick in each category; crosses do not count', () => {
    let m: Marks = {};
    m = tick(m, 'mia', 'pet', 'cat');
    m = cross(m, 'mia', 'pet', 'dog');
    m = tick(m, 'leo', 'pet', 'fish');
    expect(assignReady(gridItem, m)).toBe(false); // Zara has no tick yet
    expect(assignValues(gridItem, m)).toEqual({ mia: { pet: 'cat' }, leo: { pet: 'fish' }, zara: {} });
    expect(canSubmitFor(gridItem, null, [], m)).toBe(false);
    expect(waitNoteFor(gridItem, false)).toBe('Give each row exactly one yes to go on.');
    expect(waitNoteFor(grid2, false)).toBe('Give each row exactly one yes in each grid to go on.');
    expect(waitNoteFor(gridItem, true)).toBe('');
    m = tick(m, 'zara', 'pet', 'dog');
    expect(assignReady(gridItem, m)).toBe(true);
    expect(grade(gridItem, answerFor(gridItem, null, [], [], m)).correct).toBe(true);
    // Two ticks in one row: not ready, and that row gives no value.
    const two = tick(m, 'zara', 'pet', 'fish');
    expect(assignReady(gridItem, two)).toBe(false);
    expect(assignValues(gridItem, two).zara).toEqual({});
  });

  it('a wrong grid lists the clues it breaks, for the learn-mode highlight', () => {
    let m: Marks = {};
    m = tick(m, 'mia', 'pet', 'dog');
    m = tick(m, 'leo', 'pet', 'cat');
    m = tick(m, 'zara', 'pet', 'fish');
    const g = grade(gridItem, answerFor(gridItem, null, [], [], m));
    expect(g.correct).toBe(false);
    expect(g.broken).toEqual([0, 2]);
  });

  it('two categories need a tick in each grid', () => {
    let m = solvedMarks(grid2);
    expect(assignReady(grid2, m)).toBe(true);
    expect(grade(grid2, answerFor(grid2, null, [], [], m)).correct).toBe(true);
    m = { ...m };
    delete (m as Record<string, string>)[cellKey('leo', 'snack', 'popcorn')];
    expect(assignReady(grid2, m)).toBe(false);
  });

  it('"Show me" fills a grid with ticks and crosses, and knights with their kinds only', () => {
    const g = Object.values(solvedMarks(gridItem));
    expect(g.filter((x) => x === 'yes')).toHaveLength(3);
    expect(g.filter((x) => x === 'no')).toHaveLength(6);
    expect(solvedMarks(knights)).toEqual({ [cellKey('ava', 'kind', 'knight')]: 'yes', [cellKey('ben', 'kind', 'knave')]: 'yes' });
  });

  it('knights: one choice per person, and the answer grades like any assign item', () => {
    let m: Marks = {};
    m = pickValue(knights, m, 'ava', 'kind', 'knave');
    m = pickValue(knights, m, 'ava', 'kind', 'knight'); // replaces knave
    expect(ticksIn(knights, m, 'ava', 'kind')).toEqual(['knight']);
    expect(canSubmitFor(knights, null, [], m)).toBe(false);
    expect(waitNoteFor(knights, false)).toBe('Choose knight or knave for everyone to go on.');
    m = pickValue(knights, m, 'ben', 'kind', 'knave');
    expect(grade(knights, answerFor(knights, null, [], [], m)).correct).toBe(true);
    const wrong = pickValue(knights, m, 'ben', 'kind', 'knight');
    const g = grade(knights, answerFor(knights, null, [], [], wrong));
    expect(g.correct).toBe(false);
    expect(g.broken).toEqual([0]); // Ava's words do not fit
  });

  it('multi answers keep the cards’ order, and none is a real answer', () => {
    expect(answerFor(wason, null, ['vl', 'd'], [])).toEqual({ kind: 'multi', ids: ['d', 'vl'] });
    expect(grade(wason, answerFor(wason, null, ['vl', 'd'], [])).correct).toBe(true);
    expect(canSubmitFor(wason, null, [])).toBe(true);
    const miss = grade(wason, answerFor(wason, null, ['d', 'vf'], []));
    expect(miss.feedback).toContain('Veggies left could hide a dessert.');
    expect(miss.feedback).toContain('Veggies finished is fine');
  });
});

describe('ItemView: grids, knights and text cards', () => {
  it('grid: one table per category with a button per box, the clues, and Check waits for the ticks', () => {
    const { html, text } = render(h(ItemView, { item: gridItem, mode: 'learn', onDone: noop, readAloud: true }));
    expect(count(html, '<table')).toBe(1);
    expect(count(html, 'class="play-cell"')).toBe(9);
    expect(html).toContain('aria-label="Mia – cat: blank"');
    expect(html).toContain('aria-label="Zara – fish: blank"');
    expect(count(html, 'scope="col"')).toBe(3);
    expect(count(html, 'scope="row"')).toBe(3);
    expect(text).toContain('Pet');
    for (const c of petClues) expect(text).toContain(c);
    expect(text).toContain('Give each row exactly one yes to go on.');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Check</);
    expect(text).toContain('Hint');
    expect(text).not.toContain('Clear the grid'); // nothing to clear yet
    expect(html).not.toContain('role="radio"');
  });

  it('grid with two categories: two small grids', () => {
    const { html, text } = render(h(ItemView, { item: grid2, mode: 'learn', onDone: noop, readAloud: false }));
    expect(count(html, '<table')).toBe(2);
    expect(count(html, 'class="play-cell"')).toBe(18);
    expect(text).toContain('Snack');
    expect(html).toContain('aria-label="Leo – popcorn: blank"');
    expect(text).toContain('Each row gets one yes in each grid.');
  });

  it('grid in a check: its own time, and Next waits for the ticks', () => {
    const { html, text } = render(h(ItemView, { item: grid2, mode: 'check', onDone: noop, readAloud: false, timeLimit: 180 }));
    expect(html).toContain('aria-valuemax="180"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Next</);
    expect(text).not.toContain('Hint');
  });

  it('grid marks: ticks and crosses are named, Clear is offered, and locked boxes do not change', () => {
    let m: Marks = tick({}, 'mia', 'pet', 'cat');
    m = cross(m, 'leo', 'pet', 'cat');
    const open = render(h(AssignGrid, { item: gridItem, marks: m, locked: false, onChange: noop }));
    expect(open.html).toContain('aria-label="Mia – cat: yes"');
    expect(open.html).toContain('aria-label="Leo – cat: no"');
    expect(open.html).toContain('play-cell--yes');
    expect(open.html).toContain('play-cell--no');
    expect(open.text).toContain('Clear the grid');
    const locked = render(h(AssignGrid, { item: gridItem, marks: m, locked: true, onChange: noop }));
    expect(locked.text).not.toContain('Clear the grid');
    expect(count(locked.html, 'aria-disabled="true"')).toBe(9);
  });

  it('knights: each speaker’s words with a Knight / Knave choice under them', () => {
    const { html, text } = render(h(ItemView, { item: knights, mode: 'learn', onDone: noop, readAloud: false }));
    expect(text).toContain('Knights always tell the truth. Knaves always lie.');
    expect(text).toContain('Ava says:');
    expect(text).toContain('“Ben is a knave.”');
    expect(text).toContain('“Ava and I are the same kind.”');
    expect(count(text, 'Ben is a knave.')).toBe(1); // drawn once, not again as a scene
    expect(count(html, 'role="radiogroup"')).toBe(2);
    expect(html).toContain('aria-label="What is Ava?"');
    expect(html).toContain('aria-label="What is Ben?"');
    expect(count(html, 'role="radio"')).toBe(4);
    expect(count(html, 'aria-checked="false"')).toBe(4);
    expect(count(text, 'Knight')).toBeGreaterThanOrEqual(2);
    expect(text).toContain('Choose knight or knave for everyone to go on.');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Check</);
  });

  it('knights: the picked kind is checked, and speakers whose words do not fit are marked', () => {
    let m = pickValue(knights, {}, 'ava', 'kind', 'knight');
    m = pickValue(knights, m, 'ben', 'kind', 'knight');
    const { html, text } = render(h(AssignToggles, { item: knights, marks: m, locked: false, onChange: noop, flagged: [0] }));
    expect(count(html, 'aria-checked="true"')).toBe(2);
    expect(count(html, 'play-speaker--flagged')).toBe(1);
    expect(count(text, 'These words don’t fit your answer.')).toBe(1);
    expect(text.indexOf('These words don’t fit')).toBeLessThan(text.indexOf('Ben says:'));
  });

  it('text cards: toggle buttons in two columns, and Check works with none chosen', () => {
    const { html, text } = render(h(ItemView, { item: wason, mode: 'learn', onDone: noop, readAloud: false }));
    expect(count(html, 'aria-pressed="false"')).toBe(4);
    expect(count(text, 'Tap to choose')).toBe(4);
    expect(text).toContain('Veggies left');
    expect(text).toContain('If you have dessert, then you finished your veggies.');
    expect(html).not.toContain('play-tcards--big');
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Check</);
    expect(render(h(ItemView, { item: letters, mode: 'check', onDone: noop, readAloud: false })).html).toContain('play-tcards--big');
  });

  it('text cards: chosen cards say "Turn over" in a rule checker, and the answer is ringed when shown', () => {
    const { html, text } = render(h(MultiView, { item: wason, chosen: ['d', 'vf'], locked: true, revealed: true, onToggle: noop }));
    expect(count(html, 'aria-pressed="true"')).toBe(2);
    expect(count(text, 'Turn over')).toBe(2);
    expect(count(html, 'play-tcard--fits')).toBe(2);
    expect(count(text, '(part of the right answer)')).toBe(2);
    expect(chosenNote({ ...wason, prompt: 'Which boxes must now get a cross?' })).toBe('Chosen');
  });
});

describe('SceneView: speakers and grid pictures', () => {
  it('draws speakers with the rule, avatars and speech bubbles', () => {
    const scene: Scene = { ...(knights.scene as Extract<Scene, { kind: 'speakers' }>) };
    const withQuiet: Scene = { kind: 'speakers', speakers: [...(scene.kind === 'speakers' ? scene.speakers : []), { id: 'cal', name: 'Cal', says: '' }] };
    const { html, text } = render(h(SceneView, { scene }));
    expect(text).toContain('Rule');
    expect(text).toContain('Knights always tell the truth.');
    expect(text).toContain('Ava says: “Ben is a knave.”');
    expect(count(html, 'class="play-avatar"')).toBe(2);
    expect(html).not.toContain('role="radio"');
    const quiet = render(h(SceneView, { scene: withQuiet }));
    expect(quiet.text).toContain('Cal says nothing.');
    expect(quiet.text).not.toContain('Rule');
  });

  it('draws a grid picture as a real table with headers, marks and a caption', () => {
    const { html, text } = render(h(SceneView, { scene: gridScene }));
    expect(html).toContain('<table');
    expect(html).toContain('<caption');
    expect(text).toContain('After clues 1 and 2.');
    expect(count(html, 'scope="col"')).toBe(3);
    expect(count(html, 'scope="row"')).toBe(3);
    expect(html).not.toContain('<button');
    const sr = (w: string) => count(html, `<span class="play-sr">${w}</span>`);
    expect([sr('yes'), sr('no'), sr('blank')]).toEqual([1, 3, 5]);
    const bare = render(h(SceneView, { scene: { ...gridScene, caption: undefined } as Scene }));
    expect(bare.html).toContain('<caption class="play-sr">A logic grid</caption>');
  });
});

describe('read-aloud for the new kinds', () => {
  it('reads speakers and grid pictures', () => {
    expect(sceneSpeech(knights.scene!)).toEqual([
      'Knights always tell the truth. Knaves always lie.',
      'Ava says: Ben is a knave.',
      'Ben says: Ava and I are the same kind.',
    ]);
    expect(sceneSpeech({ kind: 'speakers', speakers: [{ id: 'c', name: 'Cal', says: '' }] })).toEqual(['Cal says nothing.']);
    expect(sceneSpeech(gridScene)).toEqual([
      'After clues 1 and 2.',
      'Mia: cat: blank; dog: no; fish: blank.',
      'Leo: cat: no; dog: no; fish: yes.',
      'Zara: cat: blank; dog: blank; fish: blank.',
    ]);
  });

  it('reads the clues and choices of a grid, each speaker of a knights puzzle, and the cards', () => {
    const g = itemSpeech(grid2);
    expect(g).toContain('Clue 1: Leo does not have the cat.');
    expect(g).toContain('Pet: cat, dog, fish.');
    expect(g).toContain('Snack: apple, popcorn, grapes.');
    expect(g[g.length - 1]).toBe('Give each row one yes in each grid.');
    const k = itemSpeech(knights);
    expect(k).toContain('Ava says: Ben is a knave.');
    expect(k[k.length - 1]).toBe('Choose knight or knave for each one.');
    expect(itemSpeech(wason).slice(-5)).toEqual(['Your choices are:', 'Dessert.', 'No dessert.', 'Veggies finished.', 'Veggies left.']);
  });
});

// ---------- "You said" and the right answer in plain words ----------

describe('describe.ts', () => {
  it('joins lists the way people say them', () => {
    expect(listWords([])).toBe('');
    expect(listWords(['E'])).toBe('E');
    expect(listWords(['E', '7'])).toBe('E and 7');
    expect(listWords(['a', 'b', 'c'])).toBe('a, b and c');
  });

  it('describes every kind of answer', () => {
    expect(describeAnswer(chooseText, { kind: 'choose', id: 'no' })).toBe('Not a statement');
    expect(describeAnswer(tapall, { kind: 'tapall', ids: ['t2', 't1'] })).toBe('Big red circle and small red square');
    expect(describeAnswer(tapall, { kind: 'tapall', ids: [] })).toBe('No cards');
    expect(describeAnswer(orderItem, { kind: 'order', ids: ['ben', 'ava', 'cal'] })).toBe('Finished first to finished last: Ben, Ava, Cal');
    expect(describeAnswer(gridItem, { kind: 'assign', values: { mia: { pet: 'dog' }, leo: { pet: 'cat' }, zara: { pet: 'fish' } } })).toBe('Mia: dog. Leo: cat. Zara: fish.');
    expect(describeAnswer(gridItem, { kind: 'assign', values: { mia: { pet: 'dog' } } })).toBe('Mia: dog. Leo: no answer. Zara: no answer.');
    expect(describeAnswer(knights, { kind: 'assign', values: { ava: { kind: 'knave' }, ben: { kind: 'knight' } } })).toBe('Ava: knave. Ben: knight.');
    expect(describeAnswer(wason, { kind: 'multi', ids: ['vl', 'nd'] })).toBe('No dessert and Veggies left');
    expect(describeAnswer(wason, { kind: 'multi', ids: [] })).toBe('None chosen');
  });

  it('says "No answer" for a missing or mismatched answer', () => {
    expect(describeAnswer(chooseText, null)).toBe('No answer');
    expect(describeAnswer(chooseText, undefined)).toBe('No answer');
    expect(describeAnswer(chooseText, { kind: 'tapall', ids: [] })).toBe('No answer');
  });

  it('describes the right answer of every kind, and that answer grades as right', () => {
    expect(describeRight(chooseText)).toBe('A statement');
    expect(describeRight(tapall)).toBe('Big red circle');
    expect(describeRight(orderItem)).toBe('Finished first to finished last: Ava, Cal, Ben');
    expect(describeRight(gridItem)).toBe('Mia: cat. Leo: fish. Zara: dog.');
    expect(describeRight(grid2)).toBe('Mia: cat and apple. Leo: fish and popcorn. Zara: dog and grapes.');
    expect(describeRight(knights)).toBe('Ava: knight. Ben: knave.');
    expect(describeRight(wason)).toBe('Dessert and Veggies left');
    expect(describeRight(letters)).toBe('E and 7');
    for (const it of [...ALL_ITEMS, ...NEW_ITEMS]) expect(grade(it, rightAnswer(it)).correct, it.id).toBe(true);
  });
});

describe('CheckRunner: time per question', () => {
  it('uses item.seconds when the timer is on', () => {
    expect(itemSeconds(grid2, 90)).toBe(180);
    expect(itemSeconds(gridItem, 90)).toBe(90);
    expect(itemSeconds(grid2, null)).toBeNull();
    expect(timeNote(180, 90)).toBe('180 seconds for this question');
    expect(timeNote(90, 90)).toBe('90 seconds for this question');
    expect(timeNote(null, null)).toBe('No timer');
  });

  it('shows the longer time on a big grid', () => {
    const { html, text } = render(h(CheckRunner, { stop, kind: 'pass', items: [grid2, chooseText], timeLimit: 90, readAloud: false, onFinish: noop, onExit: noop }));
    expect(text).toContain('180 seconds for this question');
    expect(html).toContain('aria-valuemax="180"');
    const off = render(h(CheckRunner, { stop, kind: 'pass', items: [grid2], timeLimit: null, readAloud: false, onFinish: noop, onExit: noop }));
    expect(off.text).toContain('No timer');
    expect(off.html).not.toContain('role="progressbar"');
  });
});

describe('CheckResult: "You said" above the right answer', () => {
  it('shows what the player answered for every kind, then the right answer', () => {
    const items: Item[] = [chooseText, tapall, grid2, knights, wason, orderItem];
    const records = [
      rec(chooseText, false, { answer: { kind: 'choose', id: 'no' } }),
      rec(tapall, false, { answer: { kind: 'tapall', ids: ['t1', 't3'] } }),
      rec(grid2, false, { answer: { kind: 'assign', values: { mia: { pet: 'cat', snack: 'grapes' }, leo: { pet: 'fish', snack: 'popcorn' }, zara: { pet: 'dog', snack: 'apple' } } } }),
      rec(knights, false, { answer: { kind: 'assign', values: { ava: { kind: 'knave' }, ben: { kind: 'knight' } } } }),
      rec(wason, false, { answer: { kind: 'multi', ids: ['d', 'vf'] } }),
      rec(orderItem, false, { timedOut: true }),
    ];
    const { html, text } = render(
      h(CheckResult, { stop, kind: 'pass', items, records, passed: false, missed: ['s9.l1', 's9.l2'], onLearnAgain: noop, onDone: noop }),
    );
    expect(count(text, 'You said')).toBe(6);
    expect(text).toContain('You said Not a statement Right answer A statement');
    expect(html).toContain('aria-label="Cards you chose"');
    expect(text).toContain('You said Mia: cat and grapes. Leo: fish and popcorn. Zara: dog and apple. Right answer Mia: cat and apple.');
    expect(text).toContain('You said Ava: knave. Ben: knight. Right answer Ava: knight. Ben: knave.');
    expect(text).toContain('You said Dessert and Veggies finished Right answer Dessert and Veggies left');
    expect(text).toContain('You said Time ran out. Right answer Finished first to finished last: Ava, Cal, Ben');
    // The question can be seen again: the knights' words and the grid's clues.
    expect(text).toContain('“Ava and I are the same kind.”');
    expect(text).toContain('The dog owner eats the grapes.');
  });
});

// ---------- the Wrong-Answer Notebook ----------

const today = '2026-09-30';
const note = (skill: string, stopN: number, lesson: string, due: string, fixes = 0): NoteCard => ({ skill, stop: stopN, lesson, missed: today, fixes, due });
const sampleNotebook: Notebook = {
  's9.and': note('s9.and', 9, 's9.l2', today),
  's9.cards': note('s9.cards', 9, 's9.l1', addDays(today, 3), 1),
  's2.or-both': note('s2.or-both', 2, 's2.l3', addDays(today, 1)),
};

describe('Wrong-Answer Notebook', () => {
  it('says what happens after each fix try', () => {
    expect(fixMessage({ fixes: 2 }, true, true)).toBe('Fixed! This one is cleared.');
    expect(fixMessage({ fixes: 0 }, true, false)).toBe('Nice. It comes back in 3 days.');
    expect(fixMessage({ fixes: 1 }, true, false)).toBe('Nice. It comes back in 7 days.');
    expect(fixMessage({ fixes: 1 }, false, false)).toBe('It comes back tomorrow.');
    expect(cleanFix({ correct: true, firstTry: true })).toBe(true);
    expect(cleanFix({ correct: true, firstTry: false })).toBe(false);
    expect(cleanFix({ correct: false, firstTry: false })).toBe(false);
  });

  it('groups open cards by stop, soonest first', () => {
    const groups = notebookGroups(sampleNotebook);
    expect(groups.map((g) => g.stop)).toEqual([2, 9]);
    expect(groups[1].cards.map((c) => c.skill)).toEqual(['s9.and', 's9.cards']);
  });

  it('lists the cards with their skill and the day they are ready, and offers to fix the ready ones', () => {
    const { html, text } = render(h(NotebookList, { notebook: sampleNotebook, today, stops: [stop], onFix: noop }));
    expect(text).toContain(NOTEBOOK_INTRO[0]);
    expect(text).toContain('Repair quests: 1 ready');
    expect(html).toContain('aria-label="Fix the ready ones"');
    expect(text).toContain('STOP 2');
    expect(text).toContain('STOP 9 · SAMPLE STOP');
    expect(text.indexOf('STOP 2')).toBeLessThan(text.indexOf('STOP 9'));
    expect(text).toContain('OR includes both');
    expect(text).toContain('Lesson 2 · Signs and lines');
    expect(text).toContain('Ready now');
    // The stop 2 card has no stop in this list (like a card from a newer version): it can't be fixed here.
    expect(text).toContain('In a later version');
    expect(text).toContain('Ready in 3 days');
    expect(text).toContain('Fixes done: 1 of 3');
    expect(count(html, 'class="sl-nb-card')).toBe(3);
  });

  it('an empty notebook says so, and nothing ready offers no fixing', () => {
    const empty = render(h(NotebookList, { notebook: {}, today, stops: [stop], onFix: noop })).text;
    expect(empty).toContain('Your notebook is empty');
    expect(empty).not.toContain('FIX');
    const later = render(h(NotebookList, { notebook: { 's9.cards': sampleNotebook['s9.cards'] }, today, stops: [stop], onFix: noop })).text;
    expect(later).toContain('Nothing is ready right now');
    expect(later).not.toContain('FIX');
  });

  it('fixing asks a fresh question on the card’s skill, in learn mode', () => {
    const cards = [sampleNotebook['s9.and'], sampleNotebook['s9.cards']];
    const { html, text } = render(h(NotebookRunner, { cards, stops: [stop], seed: 5, readAloud: false, onFix: () => false, onExit: noop }));
    expect(text).toContain('Repair quests');
    expect(text).toContain('Repair 1 of 2');
    expect(text).toContain(tapall.prompt); // the only s9.and item
    expect(text).toContain('Check');
    expect(html).toContain('aria-label="Back to the notebook"');
    const none = render(h(NotebookRunner, { cards: [], stops: [stop], seed: 5, readAloud: false, onFix: () => false, onExit: noop })).text;
    expect(none).toContain('Nothing to fix right now');
    expect(none).toContain('Back to the notebook');
  });

  it('the Journey card shows how many are ready', () => {
    const { html, text } = render(h(RepairCard, { ready: 2, onOpen: noop }));
    expect(html).toMatch(/^<button/);
    expect(text).toContain('Repair quests: 2 ready');
  });
});

/** A browser-free store: one player whose save has two notebook cards, one ready today. */
function storeWithNotebook() {
  const mem = new Map<string, string>();
  const kv: saves.KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); }, removeItem: (k) => { mem.delete(k); } };
  const day = journeyDay(Date.now());
  const { reg, player } = saves.addPlayer({ players: [] }, 'Sam', saves.COLORS[0], 1, 0.5);
  const data = saves.newSave();
  data.notebook = {
    's1.cant-tell': { skill: 's1.cant-tell', stop: 1, lesson: 's1.l2', missed: day, fixes: 0, due: day },
    's2.or-both': { skill: 's2.or-both', stop: 2, lesson: 's2.l3', missed: day, fixes: 1, due: addDays(day, 3) },
  };
  data.fixedCount = 4;
  saves.saveRegistry(kv, reg);
  saves.writeSave(kv, player.id, data);
  return kv;
}

describe('notebook screens with the store', () => {
  it('the notebook screen lists the saved cards', () => {
    const { text } = render(h(StoreProvider, { kv: storeWithNotebook(), children: h(NotebookScreen, { route: { name: 'notebook' } }) }));
    expect(text).toContain('Repair quests');
    expect(text).toContain('Fixed 4');
    expect(text).toContain('Repair quests: 1 ready');
    expect(text).toContain('STOP 1 ·');
    expect(text).toContain('Can’t tell yet');
    expect(text).toContain('Ready in 3 days');
  });

  it('fixing starts a repair run on the ready card', () => {
    const { html, text } = render(h(StoreProvider, { kv: storeWithNotebook(), children: h(NotebookScreen, { route: { name: 'notebook', fix: true } }) }));
    expect(text).toContain('Repair 1 of 1');
    expect(html).toContain('aria-label="Back to the notebook"');
  });

  it('the Journey shows the repair card and Progress counts open cards', () => {
    const home = render(h(StoreProvider, { kv: storeWithNotebook(), children: h(HomeScreen) })).text;
    expect(home).toContain('Repair quests: 1 ready');
    expect(home.indexOf('Repair quests')).toBeLessThan(home.indexOf('Today’s plan'));
    expect(home).toContain('Fix 1 repair quest');
    const journey = render(h(StoreProvider, { kv: storeWithNotebook(), children: h(JourneyScreen) })).text;
    expect(journey).toContain('1. True or False?');
    expect(journey).not.toContain('Repair quests');
    const progress = render(h(StoreProvider, { kv: storeWithNotebook(), children: h(ProgressScreen) }));
    expect(progress.text).toContain('2 repair quests . Open the notebook.');
    expect(progress.html).toContain('class="tile tile-btn"');
  });

  it('no repair card when nothing is ready', () => {
    const mem = new Map<string, string>();
    const kv: saves.KV = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => { mem.set(k, v); }, removeItem: (k) => { mem.delete(k); } };
    const { reg, player } = saves.addPlayer({ players: [] }, 'Sam', saves.COLORS[0], 1, 0.5);
    saves.saveRegistry(kv, reg);
    saves.writeSave(kv, player.id, saves.newSave());
    expect(render(h(StoreProvider, { kv, children: h(HomeScreen) })).text).not.toContain('Repair quests');
  });
});

// ---------- the play screens' own words read at a 6th-grade level ----------

describe('reading level of the play screens', () => {
  it(`stays at Flesch-Kincaid <= ${READING.maxGrade} with sentences <= ${READING.maxSentenceWords} words`, () => {
    const screens = [
      h(CheckResult, { stop, kind: 'pass', items: [chooseText, tapall], records: [rec(chooseText, false), rec(tapall, true)], passed: false, missed: ['s9.l1'], onLearnAgain: noop, onDone: noop }),
      ...(['pass', 'lockin', 'week'] as const).map((kind) =>
        h(CheckResult, { stop, kind, items: [tapall], records: [rec(tapall, true)], passed: true, missed: [], onLearnAgain: noop, onDone: noop }),
      ),
      h(LessonRecap, { stop, lesson: lesson2, tries: 3, firstTry: 1, onDone: noop }),
      h(CheckRunner, { stop, kind: 'pass', items: [tapall, orderItem], timeLimit: 90, readAloud: true, onFinish: noop, onExit: noop }),
      h(ItemView, { item: orderItem, mode: 'learn', onDone: noop, readAloud: true }),
      h(PracticeRunner, { stop, seed: 3, readAloud: false, onAnswer: noop, onExit: noop }),
      h(ItemView, { item: grid2, mode: 'learn', onDone: noop, readAloud: true }),
      h(ItemView, { item: knights, mode: 'learn', onDone: noop, readAloud: true }),
      h(ItemView, { item: wason, mode: 'learn', onDone: noop, readAloud: true }),
      h(CheckRunner, { stop, kind: 'pass', items: [grid2], timeLimit: 90, readAloud: false, onFinish: noop, onExit: noop }),
      h(CheckResult, {
        stop, kind: 'pass', items: [knights, tapall], passed: false, missed: ['s9.l2'], onLearnAgain: noop, onDone: noop,
        records: [rec(knights, false, { answer: { kind: 'assign', values: { ava: { kind: 'knave' }, ben: { kind: 'knight' } } } }), rec(tapall, false, { timedOut: true })],
      }),
      h(NotebookList, { notebook: sampleNotebook, today, stops: [stop], onFix: noop }),
      h(NotebookList, { notebook: {}, today, stops: [stop], onFix: noop }),
      h(NotebookRunner, { cards: [], stops: [stop], seed: 1, readAloud: false, onFix: () => false, onExit: noop }),
      h(RepairCard, { ready: 3, onOpen: noop }),
    ];
    const text = screens.map((el) => render(el).lines).join('\n');
    expect(fkGrade(text)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(text);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
  });
});
