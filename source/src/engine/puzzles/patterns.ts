/**
 * Pattern guesses (Stop 7, Lesson 1): induction. Several same examples suggest a pattern: a good guess, not a proof.
 *
 * Model A, a bag you can see (each draw goes back): the counts decide one word for “the next draw fits”.
 *   Must      every thing in the bag fits
 *   Likely    more fit than do not, but not every one (more than half, less than all)
 *   Unlikely  some fit, but fewer than do not
 *   Can’t     none fit
 * A bag never has exactly half fitting, so the word is always one of the four (wordFor).
 *
 * Model B, a bag you can’t see: k draws (each put back) all came out the same. What you know for sure is only those
 * draws. “The bag has only these” and “the next must be one” are guesses; “the other kind is due” is wrong, because
 * a draw that goes back never changes the bag. The good guess: “probably the same, but a new draw could break it.”
 *
 * Every answer, explanation, hint and board mark below is computed from these two models.
 */
import { syncWhyWrong } from '../teach';
import type { ChoiceFeedback, Color, DrillMark, DrillRow, DrillStep, IdeaCard, Rng, Scene, Shape, Teach, TeachCase, Thing } from '../types';
import type { ItemCore, Made } from './statements';

// ---------- model A: the four words ----------

export type Word = 'must' | 'likely' | 'unlikely' | 'cant';
export const WORDS: readonly Word[] = ['must', 'likely', 'unlikely', 'cant'];
export const WORD_LABEL: Record<Word, string> = { must: 'Must', likely: 'Likely', unlikely: 'Unlikely', cant: 'Can’t' };
/** The four words as board options. */
export const WORD_OPTIONS = WORDS.map((w) => ({ id: w, label: WORD_LABEL[w] }));

/** The word for “the next draw fits”, when n of the total things in the bag fit. Draws go back. Never exactly half. */
export function wordFor(n: number, total: number): Word {
  if (!Number.isInteger(n) || !Number.isInteger(total) || total < 1 || n < 0 || n > total) throw new Error(`wordFor: bad counts ${n} of ${total}`);
  if (2 * n === total) throw new Error('wordFor: exactly half is never used');
  if (n === total) return 'must';
  if (n === 0) return 'cant';
  return 2 * n > total ? 'likely' : 'unlikely';
}

// ---------- skins ----------

export type Frame = 'everyday' | 'fantasy' | 'abstract';
export const FRAMES: readonly Frame[] = ['everyday', 'fantasy', 'abstract'];

/** One kind of thing in a bag: “red marble”, “circle”, “fire card”. */
export interface Kind {
  id: string;
  /** “red marble”, “circle” */
  one: string;
  /** “red marbles”, “circles” */
  many: string;
  /** After “is”: “red”, “a circle”, “a fire card”, “an A”. */
  is: string;
  /** After “were”: “red”, “circles”, “fire cards”, “A tiles”. */
  are: string;
  /** A short word for a list of draws: “red”, “circle”, “fire”. */
  word: string;
  /** Dot colour in a picture (the label always names the group too). */
  color: Color;
  /** Shape cards only: drawn as this shape. */
  shape?: Shape;
}

export type SkinId = 'marbles' | 'socks' | 'beads' | 'eggs' | 'spells' | 'gems' | 'shapes' | 'letters';

export interface Skin {
  id: SkinId;
  frame: Frame;
  /** “marble”, “sock”, “card” */
  noun: string;
  nouns: string;
  /** “the bag”, “the dragon’s nest” */
  the: string;
  kinds: readonly [Kind, Kind, Kind];
}

const colorKinds = (noun: string, nouns: string, words: [string, string, string] = ['red', 'blue', 'yellow']): [Kind, Kind, Kind] => {
  const colors: Color[] = ['red', 'blue', 'yellow'];
  return words.map((w, i) => ({ id: w, one: `${w} ${noun}`, many: `${w} ${nouns}`, is: w, are: w, word: w, color: colors[i] })) as [Kind, Kind, Kind];
};

export const SKINS: Record<SkinId, Skin> = {
  marbles: { id: 'marbles', frame: 'everyday', noun: 'marble', nouns: 'marbles', the: 'the bag', kinds: colorKinds('marble', 'marbles') },
  socks: { id: 'socks', frame: 'everyday', noun: 'sock', nouns: 'socks', the: 'the sock drawer', kinds: colorKinds('sock', 'socks') },
  beads: { id: 'beads', frame: 'everyday', noun: 'bead', nouns: 'beads', the: 'the bead box', kinds: colorKinds('bead', 'beads', ['pink', 'blue', 'yellow']) },
  eggs: { id: 'eggs', frame: 'fantasy', noun: 'egg', nouns: 'eggs', the: 'the dragon’s nest', kinds: colorKinds('egg', 'eggs', ['red', 'blue', 'gold']) },
  spells: {
    id: 'spells', frame: 'fantasy', noun: 'card', nouns: 'cards', the: 'the wizard’s hat',
    kinds: [
      { id: 'fire', one: 'fire card', many: 'fire cards', is: 'a fire card', are: 'fire cards', word: 'fire', color: 'red' },
      { id: 'ice', one: 'ice card', many: 'ice cards', is: 'an ice card', are: 'ice cards', word: 'ice', color: 'blue' },
      { id: 'star', one: 'star card', many: 'star cards', is: 'a star card', are: 'star cards', word: 'star', color: 'yellow' },
    ],
  },
  gems: { id: 'gems', frame: 'fantasy', noun: 'gem', nouns: 'gems', the: 'the magic pouch', kinds: colorKinds('gem', 'gems', ['red', 'blue', 'gold']) },
  shapes: {
    id: 'shapes', frame: 'abstract', noun: 'card', nouns: 'cards', the: 'the bag',
    kinds: [
      { id: 'circle', one: 'circle', many: 'circles', is: 'a circle', are: 'circles', word: 'circle', color: 'red', shape: 'circle' },
      { id: 'square', one: 'square', many: 'squares', is: 'a square', are: 'squares', word: 'square', color: 'blue', shape: 'square' },
      { id: 'triangle', one: 'triangle', many: 'triangles', is: 'a triangle', are: 'triangles', word: 'triangle', color: 'yellow', shape: 'triangle' },
    ],
  },
  letters: {
    id: 'letters', frame: 'abstract', noun: 'tile', nouns: 'tiles', the: 'the tile bag',
    kinds: [
      { id: 'A', one: 'A tile', many: 'A tiles', is: 'an A', are: 'A tiles', word: 'A', color: 'red' },
      { id: 'B', one: 'B tile', many: 'B tiles', is: 'a B', are: 'B tiles', word: 'B', color: 'blue' },
      { id: 'C', one: 'C tile', many: 'C tiles', is: 'a C', are: 'C tiles', word: 'C', color: 'yellow' },
    ],
  },
};
export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
export const skinsOf = (f: Frame): SkinId[] => SKIN_IDS.filter((s) => SKINS[s].frame === f);

/** Names for quiz stories. The cards use Eli, Hana, Uma and Ivy, so no quiz story repeats a card’s story. */
export const NAMES = ['Ava', 'Ben', 'Cal', 'Dee', 'Fay', 'Gus', 'Jay', 'Kai', 'Lia', 'Max', 'Nia', 'Omar', 'Pia', 'Raj', 'Sam', 'Tia', 'Zoe', 'Leo', 'Mia', 'Ana'] as const;

// ---------- words ----------

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const withA = (p: string) => `${/^[aeiou]/i.test(p) ? 'an' : 'a'} ${p}`;
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** “1 red marble”, “5 red marbles”. */
const countOf = (n: number, k: Kind) => `${n} ${n === 1 ? k.one : k.many}`;
/** “5 red marbles and 2 blue marbles”, “4 red, 2 blue and 1 yellow”. */
function listText(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** A bag: how many of each of the skin’s three kinds. */
export type Counts = [number, number, number];
export const totalOf = (c: readonly number[]) => c.reduce((a, b) => a + b, 0);

export const bagText = (s: Skin, c: Counts) => listText(c.flatMap((n, i) => (n > 0 ? [countOf(n, s.kinds[i])] : [])));

/** “The next marble is red.” */
export const nextSays = (s: Skin, k: Kind) => `The next ${s.noun} is ${k.is}.`;

/** A sentence that uses a word: “It is likely to be red.” */
export function wordSentence(k: Kind, w: Word): string {
  switch (w) {
    case 'must': return `It must be ${k.is}.`;
    case 'likely': return `It is likely to be ${k.is}.`;
    case 'unlikely': return `It is unlikely to be ${k.is}.`;
    case 'cant': return `It can’t be ${k.is}.`;
  }
}

/** What a word claims about the bag: “every marble in the bag is red”. */
function wordMeans(s: Skin, k: Kind, w: Word): string {
  switch (w) {
    case 'must': return `every ${s.noun} in ${s.the} is ${k.is}`;
    case 'likely': return `more of the ${s.nouns} are ${k.are} than not, but not every one is`;
    case 'unlikely': return `some ${s.nouns} are ${k.are}, but fewer than the rest`;
    case 'cant': return `no ${s.noun} in ${s.the} is ${k.is}`;
  }
}

/** “5 marbles fit and 2 do not.” “1 card fits and 6 do not.” “No card fits.” “All 7 cards fit.” */
export function fitLine(n: number, total: number, noun: string, nouns: string): string {
  if (n === 0) return `No ${noun} fits.`;
  if (n === total) return `All ${total} ${nouns} fit.`;
  const rest = total - n;
  return `${n} ${n === 1 ? `${noun} fits` : `${nouns} fit`} and ${rest} ${rest === 1 ? 'does' : 'do'} not.`;
}

/** Why the counts give this word: “More fit than not, so: Likely.” */
export function wordReason(w: Word): string {
  switch (w) {
    case 'must': return 'Every one fits, so: Must.';
    case 'likely': return 'More fit than not, so: Likely.';
    case 'unlikely': return 'Fewer fit than not, so: Unlikely.';
    case 'cant': return 'None fit, so: Can’t.';
  }
}

/** The count and its word in one go: “5 cards fit and 2 do not. More fit than not, so: Likely.” “No card fits, so: Can’t.” */
export function countWord(n: number, total: number, noun: string, nouns: string): string {
  const w = wordFor(n, total);
  if (w === 'must') return `All ${total} ${nouns} fit, so: Must.`;
  if (w === 'cant') return `No ${noun} fits, so: Can’t.`;
  return `${fitLine(n, total, noun, nouns)} ${wordReason(w)}`;
}

/** “4 of the 5 gems are red, so red is likely.” */
function kindWord(s: Skin, k: Kind, n: number, total: number): string {
  return `${n} of the ${total} ${s.nouns} ${n === 1 ? `is ${k.is}` : `are ${k.are}`}, so ${k.is} is ${WORD_LABEL[wordFor(n, total)].toLowerCase()}.`;
}

/**
 * Why a picked word is not the right one, from the counts alone. One or two short sentences naming the mismatch.
 * n of total fit; `right` is wordFor(n, total).
 */
export function wordWhy(n: number, total: number, picked: Word, noun: string, nouns: string): string {
  const right = wordFor(n, total);
  const rest = total - n;
  const some = (x: number) => `${x} ${x === 1 ? noun : nouns}`;
  if (picked === right) throw new Error('wordWhy: the pick is right');
  switch (picked) {
    case 'must':
      return n === 0 ? `No ${noun} fits, so it can’t happen at all. Must means every one fits.` : `${cap(some(rest))} ${rest === 1 ? 'does' : 'do'} not fit. So it is not a must: ${rest === 1 ? 'that one' : 'one of those'} could come out.`;
    case 'likely':
      if (right === 'must') return `All ${total} ${nouns} fit. Likely means some do not fit. When every one fits, the word is Must.`;
      if (right === 'cant') return `No ${noun} fits, so it can’t happen at all.`;
      return `Only ${some(n)} ${n === 1 ? 'fits' : 'fit'}, and ${rest} ${rest === 1 ? 'does' : 'do'} not. Fewer fit than not, so it is unlikely.`;
    case 'unlikely':
      if (right === 'must') return `All ${total} ${nouns} fit. So it must happen.`;
      if (right === 'cant') return `No ${noun} fits, so it can’t happen at all. Unlikely means some fit.`;
      return `${cap(some(n))} ${n === 1 ? 'fits' : 'fit'}, and only ${rest} ${rest === 1 ? 'does' : 'do'} not. More fit than not, so it is likely.`;
    case 'cant':
      return `${cap(some(n))} ${n === 1 ? 'fits' : 'fit'}. So it can happen. Can’t means none fit.`;
  }
}

// ---------- pictures ----------

/** The bag as a picture: shape cards for the shapes skin, else a list of counts. */
export function bagScene(s: Skin, c: Counts): Scene {
  if (s.id === 'shapes') {
    const things: Thing[] = [];
    c.forEach((n, i) => {
      for (let j = 0; j < n; j++) things.push({ id: `t${things.length + 1}`, shape: s.kinds[i].shape!, color: s.kinds[i].color, size: 'big' });
    });
    return { kind: 'things', things };
  }
  return { kind: 'text', lines: [`In ${s.the}:`, ...c.flatMap((n, i) => (n > 0 ? [countOf(n, s.kinds[i])] : []))] };
}

/** A list of draws: “Kai’s draws:” “red, red, red, red”. A break adds the new one at the end. */
export function drawsScene(name: string, k: Kind, n: number, then?: Kind): Scene {
  const list = Array.from({ length: n }, () => k.word);
  return { kind: 'text', lines: [`${name}’s draws, in order:`, `${list.join(', ')}${then ? `, then ${then.word}!` : ''}`] };
}

/** Counted dots for a bag (zero groups left out, but at least one group). */
function bagGroups(s: Skin, c: Counts) {
  const g = c.flatMap((n, i) => (n > 0 ? [{ label: cap(s.kinds[i].many), n, color: s.kinds[i].color }] : []));
  return g.length ? g : [{ label: cap(s.nouns), n: 0 }];
}

// ---------- model A items: which word fits the next draw ----------

export interface ChanceModel {
  skin: SkinId;
  counts: Counts;
  /** The kind the question asks about (by index). */
  ask: number;
}

/** A made item plus its model, for tests. */
export interface PatternMade extends Made {
  model:
    | { t: 'chance'; form: 'sentence' | 'word'; bag: ChanceModel; name: string; picks: Record<string, { kind: number; word: Word }> }
    | { t: 'sure'; form: 'know' | 'best'; skin: SkinId; name: string; kind: number; other: number; draws: number }
    | { t: 'due'; form: 'known' | 'hidden'; skin: SkinId; name: string; kind: number; other: number; draws: number; counts?: Counts }
    | { t: 'break'; form: 'proof' | 'show'; skin: SkinId; name: string; kind: number; other: number; draws: number };
}

/** Bags a card already shows (skin + counts). A quiz never makes one of these. */
const CARD_BAGS = new Set<string>(['marbles:6,1,0', 'shapes:5,0,0', 'shapes:5,2,0']);
const bagKey = (s: SkinId, c: Counts) => `${s}:${c.join(',')}`;

/** Splits `rest` things among the other kinds: one kind, or two when there is room. */
function spread(rng: Rng, rest: number, others: number[], counts: Counts) {
  if (rest <= 0) return;
  if (rest >= 2 && rng.chance(0.4)) {
    const a = rng.int(1, rest - 1);
    counts[others[0]] = a;
    counts[others[1]] = rest - a;
  } else counts[rng.pick(others)] = rest;
}

/** A bag for a question about kind `ask` whose word is `want`. 3–12 things, and no kind is exactly half. */
export function makeBag(rng: Rng, skin: SkinId, want: Word): ChanceModel {
  for (let tries = 0; tries < 500; tries++) {
    const ask = rng.int(0, 2);
    const others = [0, 1, 2].filter((i) => i !== ask);
    const counts: Counts = [0, 0, 0];
    if (want === 'must') counts[ask] = rng.int(3, 9);
    else if (want === 'cant') spread(rng, rng.int(3, 9), others, counts);
    else {
      const total = rng.int(3, 12);
      const n = want === 'likely' ? rng.int(Math.floor(total / 2) + 1, total - 1) : rng.int(1, Math.ceil(total / 2) - 1);
      counts[ask] = n;
      spread(rng, total - n, others, counts);
    }
    const total = totalOf(counts);
    if (counts.some((n) => 2 * n === total)) continue;
    if (CARD_BAGS.has(bagKey(skin, counts))) continue;
    if (wordFor(counts[ask], total) !== want) continue;
    return { skin, counts, ask };
  }
  throw new Error('makeBag: no bag found');
}

/** One teach case: kind k in a bag of `total` with n of kind k. Truths: which of the four words fits. */
function wordCase(s: Skin, k: Kind, n: number, total: number, label?: string): TeachCase {
  const w = wordFor(n, total);
  const rest = total - n;
  return {
    label: label ?? (n === 0 ? `A bag of ${total} where no ${s.noun} is ${k.is}.` : n === total ? `A bag where all ${total} ${s.nouns} are ${k.are}.` : `A bag where ${n} of ${total} ${s.nouns} ${n === 1 ? `is ${k.is}` : `are ${k.are}`}.`),
    groups: [{ label: cap(k.many), n, color: k.color }, { label: `Other ${s.nouns}`, n: rest }],
    truths: WORDS.map((x) => ({ who: WORD_LABEL[x], value: x === w })),
    note: countWord(n, total, s.noun, s.nouns),
  };
}

/** Teaching for a model A question: the four words, and one case for each word on the asked kind. */
export function chanceTeach(m: ChanceModel): Teach {
  const s = SKINS[m.skin];
  const k = s.kinds[m.ask];
  const total = totalOf(m.counts);
  const n = m.counts[m.ask];
  const right = wordFor(n, total);
  const cases = WORDS.map((w) => {
    if (w === right) return wordCase(s, k, n, total, `The bag in the question: ${bagText(s, m.counts)}.`);
    const x = w === 'must' ? total : w === 'cant' ? 0 : w === 'likely' ? Math.floor(total / 2) + 1 : Math.ceil(total / 2) - 1;
    return wordCase(s, k, x, total);
  });
  const small: Counts = [0, 0, 0];
  const other = m.ask === 0 ? 1 : 0;
  small[m.ask] = 2;
  small[other] = 1;
  return {
    rule: 'Count the things that fit the sentence and the things that do not. The counts give the word: Must, Likely, Unlikely or Can’t.',
    terms: [
      { word: 'Must', meaning: 'everything in the bag fits, so it has to happen.' },
      { word: 'Likely', meaning: 'more things fit than do not, but not every one.' },
      { word: 'Unlikely', meaning: 'some things fit, but fewer fit than do not.' },
      { word: 'Can’t', meaning: 'nothing in the bag fits, so it can’t happen.' },
      { word: 'Put back', meaning: 'after each draw, the thing goes back in the bag. So the bag is the same every time.' },
    ],
    meaning: `The sentence is “${nextSays(s, k)}” It fits a draw that is ${k.is}. ${cap(s.the)} has ${bagText(s, m.counts)}.`,
    casesTitle: `How many ${s.nouns} are ${k.are}? Each count gives one word.`,
    cases,
    remember: ['All fit: Must. More fit than not, but not all: Likely. Fewer fit than not: Unlikely. None fit: Can’t.', '“Likely” is not “must.” Ask: “How many fit, and how many do not?”'],
    simpler: [
      `Say ${s.the} has ${bagText(s, small)}. Look at “${nextSays(s, k)}”`,
      countWord(2, 3, s.noun, s.nouns),
      `It is not a must. The ${s.kinds[other].one} can still come out.`,
    ],
  };
}

/** The headline for a wrong word about kind ki: what the pick says, and the count that breaks it. */
function chanceHeadline(s: Skin, c: Counts, ki: number, picked: Word): string {
  const k = s.kinds[ki];
  const total = totalOf(c);
  const n = c[ki];
  const right = wordFor(n, total);
  const says = `Your answer says the next ${s.noun} ${picked === 'must' ? 'must be' : picked === 'cant' ? 'can’t be' : picked === 'likely' ? 'is likely to be' : 'is unlikely to be'} ${k.is}`;
  if (right === 'must') return `${says}, but all ${total} ${s.nouns} are ${k.are}.`;
  if (right === 'cant') return `${says}, but ${s.the} has no ${k.many}.`;
  if (picked === 'must') return `${says}, but ${total - n} of the ${total} ${s.nouns} ${total - n === 1 ? `is not ${k.is}` : `are not ${k.are}`}.`;
  if (picked === 'cant') return `${says}, but ${s.the} has ${countOf(n, k)}.`;
  if (right === 'likely') return `${says}, but ${n} of the ${total} ${s.nouns} are ${k.are}. That is more than the rest.`;
  return `${says}, but only ${n} of the ${total} ${s.nouns} ${n === 1 ? `is ${k.is}` : `are ${k.are}`}. That is fewer than the rest.`;
}

function chanceFeedback(s: Skin, c: Counts, ki: number, picked: Word, label: string): ChoiceFeedback {
  const k = s.kinds[ki];
  const total = totalOf(c);
  const n = c[ki];
  const right = wordFor(n, total);
  return {
    headline: chanceHeadline(s, c, ki, picked),
    detail: [
      `Your answer means ${wordMeans(s, k, picked)}.`,
      `Look at “${nextSays(s, k)}” ${countWord(n, total, s.noun, s.nouns)}`,
      `The word for this sentence is ${WORD_LABEL[right]}, not ${WORD_LABEL[picked]}.`,
    ],
    example: {
      label: `${cap(s.the)} has ${bagText(s, c)}.`,
      groups: bagGroups(s, c),
      truths: [{ who: `Your answer: “${label}”`, value: false }, { who: `“${wordSentence(k, right)}”`, value: true }],
    },
  };
}

/** A marked case for the hint: a different kind from the one asked, with its word. Never the answer. */
function chanceHint(m: ChanceModel): TeachCase {
  const s = SKINS[m.skin];
  const total = totalOf(m.counts);
  // Prefer a kind that is in the bag, so the hint shows real counting.
  const others = [0, 1, 2].filter((i) => i !== m.ask);
  const ki = others.find((i) => m.counts[i] > 0) ?? others[0];
  const k = s.kinds[ki];
  const n = m.counts[ki];
  const w = wordFor(n, total);
  return {
    label: `A different sentence: “${nextSays(s, k)}”`,
    groups: [{ label: cap(k.many), n, color: k.color }, { label: `Other ${s.nouns}`, n: total - n }],
    truths: [{ who: WORD_LABEL[w], value: true }],
    note: countWord(n, total, s.noun, s.nouns),
  };
}

const drawLine = (s: Skin, name: string) => `${name} takes one ${s.noun} without looking, then puts it back.`;

/**
 * Model A question. form 'sentence': which sentence about the next draw is right (one right sentence, three that the
 * counts make wrong). form 'word': which of the four words fits one sentence.
 */
export function chanceItem(rng: Rng, skin: SkinId, o: { want?: Word; form?: 'sentence' | 'word'; name?: string } = {}): PatternMade {
  const want = o.want ?? rng.pick<Word>(['must', 'likely', 'likely', 'unlikely', 'unlikely', 'cant']);
  const form = o.form ?? (rng.chance(0.5) ? 'sentence' : 'word');
  const name = o.name ?? rng.pick(NAMES);
  const bag = makeBag(rng, skin, want);
  const s = SKINS[skin];
  const total = totalOf(bag.counts);
  const k = s.kinds[bag.ask];
  const right = wordFor(bag.counts[bag.ask], total);
  const picks: Record<string, { kind: number; word: Word }> = {};
  let choices: { id: string; label: string }[];
  let answer: string;
  let prompt: string;
  if (form === 'word') {
    choices = WORD_OPTIONS.map((x) => ({ ...x }));
    WORDS.forEach((w) => { picks[w] = { kind: bag.ask, word: w }; });
    answer = right;
    prompt = `${cap(s.the)} has ${bagText(s, bag.counts)}. ${drawLine(s, name)} Read the sentence: “${nextSays(s, k)}” Which word fits it?`;
  } else {
    // Wrong sentences: the asked kind with another word (not the next-door word that a reader could call “also true”),
    // and another kind with a word its count does not give.
    const near: Partial<Record<Word, Word>> = { must: 'likely', cant: 'unlikely' };
    const same = WORDS.filter((w) => w !== right && w !== near[right]).map((w) => ({ kind: bag.ask, word: w }));
    const otherKinds = [0, 1, 2].filter((i) => i !== bag.ask);
    const diff = otherKinds.flatMap((ki) => {
      const t = wordFor(bag.counts[ki], total);
      const nearT = near[t];
      return WORDS.filter((w) => w !== t && w !== nearT).map((w) => ({ kind: ki, word: w }));
    });
    const pickedSame = rng.shuffle(same).slice(0, rng.int(1, 2));
    const pickedDiff = rng.shuffle(diff).slice(0, 3 - pickedSame.length);
    const all = [{ kind: bag.ask, word: right }, ...pickedSame, ...pickedDiff];
    for (const p of all) picks[`${s.kinds[p.kind].id}-${p.word}`] = p;
    choices = rng.shuffle(all).map((p) => ({ id: `${s.kinds[p.kind].id}-${p.word}`, label: wordSentence(s.kinds[p.kind], p.word) }));
    answer = `${k.id}-${right}`;
    prompt = `${cap(s.the)} has ${bagText(s, bag.counts)}. ${drawLine(s, name)} Which sentence about the next ${s.noun} is right?`;
  }
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const ch of choices) if (ch.id !== answer) feedback[ch.id] = chanceFeedback(s, bag.counts, picks[ch.id].kind, picks[ch.id].word, ch.label);
  const n = bag.counts[bag.ask];
  const item: ItemCore = {
    kind: 'choose',
    prompt,
    scene: bagScene(s, bag.counts),
    choices,
    answer,
    explain: form === 'sentence'
      ? `Each ${s.noun} goes back, so count the ${k.many} in ${s.the}. ${countWord(n, total, s.noun, s.nouns)} So “${wordSentence(k, right)}” is right.`
      : `Each ${s.noun} goes back, so count what is in ${s.the}. ${countWord(n, total, s.noun, s.nouns)}`,
    hint: `Count the ${s.nouns} that fit and the ones that do not. Here is another sentence about this bag, checked for you.`,
    hintCase: chanceHint(bag),
    teach: chanceTeach(bag),
    feedback,
  };
  syncWhyWrong(item);
  return { tag: 'pattern-chance', item, model: { t: 'chance', form, bag, name, picks } };
}

// ---------- model B items: a bag you can’t see ----------

/** Streaks a card already shows (skin, kind, draws). A quiz never makes one of these. */
const CARD_STREAKS = new Set<string>(['marbles:red:4', 'shapes:circle:6']);

interface Streak {
  s: Skin;
  name: string;
  ki: number;
  oi: number;
  k: Kind;
  o: Kind;
  draws: number;
}

function makeStreak(rng: Rng, skin: SkinId, lo: number, hi: number, name?: string): Streak {
  const s = SKINS[skin];
  for (let tries = 0; tries < 200; tries++) {
    const ki = rng.int(0, 2);
    const oi = rng.pick([0, 1, 2].filter((i) => i !== ki));
    const draws = rng.int(lo, hi);
    if (CARD_STREAKS.has(`${skin}:${s.kinds[ki].id}:${draws}`)) continue;
    return { s, name: name ?? rng.pick(NAMES), ki, oi, k: s.kinds[ki], o: s.kinds[oi], draws };
  }
  throw new Error('makeStreak: no streak found');
}

const hiddenLine = (st: Streak) =>
  `${st.name} can’t see inside ${st.s.the}. ${st.name} takes out one ${st.s.noun}, looks, and puts it back. ${st.name} does this ${NUM[st.draws]} times.`;

/** Three bags that all fit the draws: only this kind, mostly this kind, and fewer of this kind. */
function hiddenBags(st: Streak): { counts: Counts; label: string; note: string }[] {
  const only: Counts = [0, 0, 0];
  only[st.ki] = 8;
  const most: Counts = [0, 0, 0];
  most[st.ki] = 9;
  most[st.oi] = 1;
  const few: Counts = [0, 0, 0];
  few[st.ki] = 3;
  few[st.oi] = 4;
  const { s, k, draws } = st;
  return [
    { counts: only, label: `A bag with only ${k.many}: ${bagText(s, only)}.`, note: `${cap(NUM[draws])} ${k.word} draws in a row fit this bag.` },
    { counts: most, label: `A bag with ${bagText(s, most)}.`, note: `${cap(NUM[draws])} ${k.word} draws in a row can happen here too.` },
    { counts: few, label: `A bag with ${bagText(s, few)}.`, note: `${cap(NUM[draws])} ${k.word} draws in a row can still happen here. It is just less likely.` },
  ];
}

const proofTerms = (k: Kind) => [
  { word: 'For sure', meaning: 'no other way is possible.' },
  { word: 'A good guess', meaning: `what is most likely from what you saw. It can still be wrong.` },
  { word: 'A streak', meaning: `the same result many times in a row, like ${k.word}, ${k.word}, ${k.word}.` },
  { word: 'A proof', meaning: 'something that shows it must be true, with no other way.' },
];

/** Teaching for “what do you know for sure?” and “what is the best thing to say?”. */
function sureTeach(st: Streak): Teach {
  const { s, k, o, draws, name } = st;
  return {
    rule: 'A streak gives you a good guess. But you know for sure only what you saw.',
    terms: proofTerms(k),
    meaning: `${name} saw ${draws} ${s.nouns}, and all were ${k.are}. That part is sure. The rest of ${s.the} is hidden.`,
    casesTitle: `Which bags fit ${NUM[draws]} ${k.word} draws in a row?`,
    cases: hiddenBags(st).map((b) => ({
      label: b.label,
      groups: bagGroups(s, b.counts),
      truths: [{ who: `Fits the ${draws} draws`, value: true }, { who: `Has ${o.many}`, value: b.counts[st.oi] > 0 }],
      note: b.note,
    })),
    remember: ['You know for sure only what you saw. The rest is a guess.', '“Probably” is a good guess. “Must” needs a proof.', 'Ask: “Could the bag still hide something else?”'],
    simpler: [
      `Say ${name} saw 3 ${k.many}.`,
      `Is ${withA(o.one)} hiding in ${s.the}? Maybe. ${name} has not seen every ${s.noun}.`,
      `So ${name} can say, “Probably ${k.is} next.” ${name} can’t say, “It must be ${k.is}.”`,
    ],
  };
}

/** A bag that fits the draws but holds another kind: the case that breaks “for sure”. */
function hidingCase(st: Streak, who: string): TeachCase {
  const b = hiddenBags(st)[1];
  return {
    label: b.label,
    groups: bagGroups(st.s, b.counts),
    truths: [{ who: `Fits the ${st.draws} draws`, value: true }, { who, value: false }],
    note: b.note,
  };
}

/**
 * Model B: “What does Kai know for sure?” (form 'know') or “What is the best thing to say about the next draw?”
 * (form 'best'). Kai saw only the draws, so only they are sure; the good guess is “probably”.
 */
export function sureItem(rng: Rng, skin: SkinId, o: { form?: 'know' | 'best'; name?: string } = {}): PatternMade {
  const form = o.form ?? (rng.chance(0.5) ? 'know' : 'best');
  const st = makeStreak(rng, skin, 3, 6, o.name);
  const { s, k, o: other, draws, name } = st;
  const notSure = (what: string): ChoiceFeedback['detail'] => [
    `Your answer means ${what}.`,
    `${name} did not see every ${s.noun}. ${cap(withA(other.one))} could be hiding in ${s.the}. It just has not come out yet.`,
    `So this is a good guess, not something ${name} knows for sure.`,
  ];
  const pool: Record<string, { label: string; fb?: ChoiceFeedback }> =
    form === 'know'
      ? {
          saw: { label: `The ${draws} ${s.nouns} ${name} saw were ${k.are}.` },
          all: {
            label: `Every ${s.noun} in ${s.the} is ${k.is}.`,
            fb: { headline: `Your answer is about everything in ${s.the}, but ${name} saw only ${draws} ${s.nouns}.`, detail: notSure(`no other kind of ${s.noun} is in ${s.the}`), example: hidingCase(st, 'Your answer') },
          },
          must: {
            label: `The next ${s.noun} must be ${k.is}.`,
            fb: { headline: `Your answer says the next ${s.noun} must be ${k.is}, but a streak does not make it a must.`, detail: notSure(`no other ${s.noun} can come out next`), example: hidingCase(st, 'Your answer') },
          },
          none: {
            label: `${cap(s.the)} has no ${other.many}.`,
            fb: { headline: `Your answer says there are no ${other.many}, but ${name} has not seen everything in ${s.the}.`, detail: notSure(`${s.the} holds no ${other.many} at all`), example: hidingCase(st, 'Your answer') },
          },
        }
      : {
          probably: { label: `Probably ${k.is}, but a new draw could break the pattern.` },
          must: {
            label: `It must be ${k.is}.`,
            fb: { headline: `Your answer says the next ${s.noun} must be ${k.is}, but a streak is not a proof.`, detail: notSure(`no other ${s.noun} can come out next`), example: hidingCase(st, 'Your answer') },
          },
          due: {
            label: `It will be ${other.is}, because ${other.is} is due.`,
            fb: {
              headline: `Your answer says ${other.is} is due, but past draws do not change what is in ${s.the}.`,
              detail: [
                `“Due” means it has to come soon. When each draw goes back, nothing in the bag is ever due.`,
                `Each ${s.noun} went back, so ${s.the} is the same as before. Maybe it has no ${other.many} at all.`,
                `After ${draws} ${k.many} in a row, the good guess is still ${k.is}.`,
              ],
              example: {
                label: `A bag with only ${k.many}: ${bagText(s, [0, 1, 2].map((i) => (i === st.ki ? 8 : 0)) as Counts)}.`,
                truths: [{ who: `Fits the ${draws} draws`, value: true }, { who: 'Your answer', value: false }],
                note: `This bag fits the draws, and ${withA(other.one)} can never come out of it.`,
              },
            },
          },
          noguess: {
            label: 'No guess is any good here.',
            fb: {
              headline: `Your answer throws away the pattern, but ${draws} ${k.word} draws in a row are a good reason to guess ${k.is}.`,
              detail: [
                'Your answer means the draws tell you nothing.',
                `${name} saw ${draws} ${k.many} in a row. That makes ${k.is} a good guess for the next one.`,
                'A good guess is useful. Just remember it is a guess, and check it before you are sure.',
              ],
            },
          },
        };
  const right = form === 'know' ? 'saw' : 'probably';
  const wrongIds = rng.shuffle(Object.keys(pool).filter((id) => id !== right)).slice(0, rng.int(2, 3));
  const ids = rng.shuffle([right, ...wrongIds]);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const id of wrongIds) feedback[id] = pool[id].fb!;
  const ask = form === 'know' ? `All ${draws} were ${k.are}. What does ${name} know for sure?` : `All ${draws} were ${k.are}. What is the best thing to say about the next ${s.noun}?`;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${hiddenLine(st)} ${ask}`,
    scene: drawsScene(name, k, draws),
    choices: ids.map((id) => ({ id, label: pool[id].label })),
    answer: right,
    explain:
      form === 'know'
        ? `${name} saw only ${draws} ${s.nouns}, and all were ${k.are}. That is sure. Anything about the rest of ${s.the} is a guess.`
        : `After ${draws} ${k.many} in a row, ${k.is} is a good guess. But ${s.the} could still hide something else. So say “probably,” not “must.”`,
    hint: `Ask: did ${name} see every ${s.noun} in ${s.the}? Here is a bag that fits the draws, checked for you.`,
    hintCase: hidingCase(st, `Has only ${k.many}`),
    teach: sureTeach(st),
    feedback,
  };
  syncWhyWrong(item);
  return { tag: 'pattern-sure', item, model: { t: 'sure', form, skin, name, kind: st.ki, other: st.oi, draws } };
}

// ---------- the streak trap: “the other kind is due” ----------

function dueTeach(st: Streak, counts?: Counts): Teach {
  const { s, k, o, draws } = st;
  const cases: TeachCase[] = counts
    ? [
        {
          label: `Before the streak: ${bagText(s, counts)}.`,
          groups: bagGroups(s, counts),
          truths: [{ who: `${cap(k.is)} is ${WORD_LABEL[wordFor(counts[st.ki], totalOf(counts))].toLowerCase()}`, value: true }],
          note: kindWord(s, k, counts[st.ki], totalOf(counts)),
        },
        {
          label: `After ${draws} ${k.many} in a row, each put back: still ${bagText(s, counts)}.`,
          groups: bagGroups(s, counts),
          truths: [{ who: `${cap(k.is)} is ${WORD_LABEL[wordFor(counts[st.ki], totalOf(counts))].toLowerCase()}`, value: true }, { who: `${cap(o.is)} is due`, value: false }],
          note: 'Nothing left the bag. So the words did not change.',
        },
      ]
    : [
        {
          label: `A bag with only ${k.many}.`,
          truths: [{ who: `Fits the ${draws} draws`, value: true }, { who: `${cap(o.is)} can come out`, value: false }],
          note: `${cap(withA(o.one))} is never due here. It can’t come out at all.`,
        },
        {
          label: `A bag with ${bagText(s, [0, 1, 2].map((i) => (i === st.ki ? 9 : i === st.oi ? 1 : 0)) as Counts)}.`,
          truths: [{ who: `Fits the ${draws} draws`, value: true }, { who: `${cap(o.is)} can come out`, value: true }, { who: `${cap(o.is)} is due`, value: false }],
          note: `${cap(withA(o.one))} can come out, but its chance is the same on every draw.`,
        },
      ];
  return {
    rule: `Each ${s.noun} goes back, so ${s.the} is the same for every draw. A streak does not make anything “due.”`,
    terms: [
      { word: 'Due', meaning: 'has to come soon. When each draw goes back, nothing in the bag is ever due.' },
      { word: 'Put back', meaning: 'after each draw, the thing goes back in the bag. So the bag is the same every time.' },
      { word: 'A streak', meaning: `the same result many times in a row.` },
    ],
    meaning: `The streak tells you what came out. It does not change what is in ${s.the}.`,
    casesTitle: 'Does the streak change the bag?',
    cases,
    remember: ['Past draws do not change the bag.', 'Ask: “Did anything leave the bag for good?”'],
    simpler: [
      'Think of a bag with 3 red marbles and 1 blue marble.',
      'You draw red and put it back. The bag still has 3 red and 1 blue.',
      'Do it again and again. The bag is still the same. So blue is never “due.”',
    ],
  };
}

/** The 2-kind bag for a known-bag streak: the streak kind is the one that fits more. 3–12 things, never half. */
function dueBag(rng: Rng, st: Streak): Counts {
  for (let tries = 0; tries < 200; tries++) {
    const total = rng.int(4, 12);
    const n = rng.int(Math.floor(total / 2) + 1, total - 1);
    const c: Counts = [0, 0, 0];
    c[st.ki] = n;
    c[st.oi] = total - n;
    if (CARD_BAGS.has(bagKey(st.s.id, c))) continue;
    return c;
  }
  throw new Error('dueBag: no bag found');
}

/**
 * The streak trap (a conflict item). form 'known': the bag is open, the streak kind fits more; after a streak the
 * words are the same. form 'hidden': the bag is hidden; the streak does not make the other kind due.
 */
export function dueItem(rng: Rng, skin: SkinId, o: { form?: 'known' | 'hidden'; name?: string } = {}): PatternMade {
  const form = o.form ?? (rng.chance(0.5) ? 'known' : 'hidden');
  const st = makeStreak(rng, skin, 3, 6, o.name);
  const { s, k, o: other, draws, name } = st;
  const claim = `“${cap(other.is)} is due next!”`;
  let pool: Record<string, { label: string; fb?: ChoiceFeedback }>;
  let right: string;
  let counts: Counts | undefined;
  let prompt: string;
  let scene: Scene;
  let explain: string;
  const sameBag = (c?: Counts) =>
    c ? `Each ${s.noun} went back, so ${s.the} still has ${bagText(s, c)}.` : `Each ${s.noun} went back, so ${s.the} is the same as before.`;
  if (form === 'known') {
    counts = dueBag(rng, st);
    const total = totalOf(counts);
    const wk = wordFor(counts[st.ki], total);
    const wo = wordFor(counts[st.oi], total);
    const ex: TeachCase = { label: `After the streak, ${s.the} still has ${bagText(s, counts)}.`, groups: bagGroups(s, counts), truths: [{ who: 'Your answer', value: false }], note: kindWord(s, k, counts[st.ki], total) };
    right = 'still';
    pool = {
      still: { label: `${cap(k.is)} is still ${WORD_LABEL[wk].toLowerCase()}. ${cap(s.the)} did not change.` },
      due: {
        label: `${cap(other.is)} is likely now, because it is due.`,
        fb: {
          headline: `Your answer says ${other.is} is due, but the streak did not change ${s.the}.`,
          detail: ['“Due” means it has to come soon. When each draw goes back, nothing in the bag is ever due.', sameBag(counts), `So ${other.is} is still ${WORD_LABEL[wo].toLowerCase()}, just like before the streak.`],
          example: ex,
        },
      },
      must: {
        label: `${cap(k.is)} must come next, because of the streak.`,
        fb: {
          headline: `Your answer says ${k.is} must come next, but ${s.the} still has ${countOf(counts[st.oi], other)}.`,
          detail: [`Your answer means no other ${s.noun} can come out.`, sameBag(counts), `${cap(withA(other.one))} can still come out. So ${k.is} is ${WORD_LABEL[wk].toLowerCase()}, not a must.`],
          example: ex,
        },
      },
      cant: {
        label: `${cap(other.is)} can’t come out now.`,
        fb: {
          headline: `Your answer says ${other.is} can’t come out, but ${s.the} still has ${countOf(counts[st.oi], other)}.`,
          detail: [`Your answer means ${s.the} has no ${other.many} left.`, sameBag(counts), `So ${other.is} can still come out. It is ${WORD_LABEL[wo].toLowerCase()}.`],
          example: ex,
        },
      },
    };
    prompt = `${cap(s.the)} has ${bagText(s, counts)}. ${name} takes one ${s.noun} without looking and puts it back each time. The last ${draws} were all ${k.are}. ${name} says, ${claim} Which is right?`;
    scene = bagScene(s, counts);
    explain = `${sameBag(counts)} So ${k.is} is still ${WORD_LABEL[wk].toLowerCase()}, and nothing is due.`;
  } else {
    right = 'same';
    const onlyBag: TeachCase = {
      label: `A bag with only ${k.many}.`,
      truths: [{ who: `Fits the ${draws} draws`, value: true }, { who: 'Your answer', value: false }],
      note: `This bag fits the draws, and ${withA(other.one)} can never come out of it.`,
    };
    pool = {
      same: { label: `No. Past draws do not change what is in ${s.the}.` },
      must: {
        label: `Yes. After ${draws} ${k.many}, ${other.is} must come next.`,
        fb: {
          headline: `Your answer says ${other.is} must come next, but a streak does not change ${s.the}.`,
          detail: ['Your answer means the streak forces a change.', sameBag(), `${cap(s.the)} might have no ${other.many} at all. Then ${other.is} could never come out.`],
          example: onlyBag,
        },
      },
      more: {
        label: `Yes. ${cap(other.is)} gets more likely after each ${k.word} draw.`,
        fb: {
          headline: `Your answer says the chance of ${other.is} grows, but ${s.the} stays the same.`,
          detail: ['Your answer means each draw changes the bag.', sameBag(), `The same bag gives the same chance every time. So ${other.is} is not getting more likely.`],
          example: onlyBag,
        },
      },
      none: {
        label: `No. ${name} knows ${s.the} has no ${other.many}.`,
        fb: {
          headline: `Your answer is sure there are no ${other.many}, but ${name} has not seen everything in ${s.the}.`,
          detail: [`Your answer means ${name} knows what is hidden.`, `${name} saw only ${draws} ${s.nouns}. ${cap(withA(other.one))} could still be hiding.`, `The real reason ${name} is not right: past draws do not change ${s.the}.`],
          example: hidingCase(st, 'Your answer'),
        },
      },
    };
    prompt = `${name} can’t see inside ${s.the}. ${name} took out ${draws} ${k.many} in a row, putting each one back. ${name} says, ${claim} Is ${name} right?`;
    scene = drawsScene(name, k, draws);
    explain = `${sameBag()} A streak does not change what is in ${s.the}, so nothing is ever due.`;
  }
  const wrongIds = rng.shuffle(Object.keys(pool).filter((id) => id !== right)).slice(0, rng.int(2, 3));
  const ids = rng.shuffle([right, ...wrongIds]);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const id of wrongIds) feedback[id] = pool[id].fb!;
  const hintBag: Counts = [0, 0, 0];
  hintBag[st.ki] = 3;
  hintBag[st.oi] = 1;
  const item: ItemCore = {
    kind: 'choose',
    prompt,
    scene,
    choices: ids.map((id) => ({ id, label: pool[id].label })),
    answer: right,
    explain,
    hint: 'Ask: does a draw that goes back change the bag? Here is a smaller bag, checked for you.',
    hintCase: {
      label: `A bag with ${bagText(s, hintBag)}. One ${k.word} draw comes out and goes back.`,
      groups: bagGroups(s, hintBag),
      truths: [{ who: 'The bag changed', value: false }],
      note: `It still has ${bagText(s, hintBag)}.`,
    },
    teach: dueTeach(st, counts),
    feedback,
    conflict: true,
  };
  syncWhyWrong(item);
  return { tag: 'pattern-due', item, model: { t: 'due', form, skin, name, kind: st.ki, other: st.oi, draws, ...(counts ? { counts } : {}) } };
}

// ---------- can it fail? A new case breaks the streak ----------

function breakTeach(st: Streak): Teach {
  const { s, k, o, draws } = st;
  return {
    rule: 'Many same examples make a good guess. But one new case can break the pattern. So a streak is never a proof.',
    terms: [...proofTerms(k), { word: 'A pattern', meaning: 'the same thing again and again.' }],
    meaning: `${cap(NUM[draws])} ${k.many} in a row made ${k.is} a good guess. Then ${withA(o.one)} came out of ${s.the}. That new case broke the pattern.`,
    casesTitle: `After ${NUM[draws]} ${k.many}, what can the next draw be?`,
    cases: [
      {
        label: `${cap(NUM[draws])} ${k.many}, then ${withA(o.one)}.`,
        truths: [{ who: 'The streak was a good guess', value: true }, { who: 'The streak was a proof', value: false }],
        note: 'The new case broke the pattern.',
      },
      {
        label: `${cap(NUM[draws])} ${k.many}, then one more ${k.one}.`,
        truths: [{ who: 'The streak was a good guess', value: true }, { who: 'The streak was a proof', value: false }],
        note: 'The guess worked this time. It still was not a proof: the next draw could have been different.',
      },
    ],
    remember: ['A pattern is a good guess, not a proof.', 'Ask: “Could the next case be different?” If yes, check before you are sure.'],
    simpler: [
      'You see 3 white swans. You guess, “All swans are white.”',
      'That is a good guess from what you saw.',
      'But black swans are real. One black swan breaks the guess. Many examples never make a proof.',
    ],
  };
}

/**
 * The can-fail question: after many of one kind, another kind came out. form 'proof': did the streak prove the next
 * draw? form 'show': what does the new one show?
 */
export function breakItem(rng: Rng, skin: SkinId, o: { form?: 'proof' | 'show'; name?: string } = {}): PatternMade {
  const form = o.form ?? (rng.chance(0.5) ? 'proof' : 'show');
  const st = makeStreak(rng, skin, 4, 8, o.name);
  const { s, k, o: other, draws, name } = st;
  const newOne = withA(other.one);
  const broke: TeachCase = {
    label: `${cap(NUM[draws])} ${k.many} in a row, then ${newOne}.`,
    truths: [{ who: `The next draw was ${k.is}`, value: false }, { who: 'Your answer', value: false }],
    note: 'One new case broke the pattern.',
  };
  const right = form === 'proof' ? 'guess' : 'break';
  const pool: Record<string, { label: string; fb?: ChoiceFeedback }> =
    form === 'proof'
      ? {
          guess: { label: 'No. A streak is a good guess, not a proof.' },
          proof: {
            label: `Yes. ${cap(NUM[draws])} in a row is a proof.`,
            fb: {
              headline: `Your answer calls the streak a proof, but the next draw broke it.`,
              detail: ['A proof shows something must be true, with no other way.', `After ${draws} ${k.many}, ${newOne} still came out. So the streak did not prove the next draw.`, 'The streak was a good guess. A new case can still break it.'],
              example: broke,
            },
          },
          trick: {
            label: `Yes. The ${other.one} must be a mistake, so it does not count.`,
            fb: {
              headline: `Your answer throws out the ${other.one}, but it really came out of ${s.the}.`,
              detail: [`Your answer means a case that breaks the pattern does not count.`, `The ${other.one} is a real draw. It shows ${s.the} has more than ${k.many}.`, 'When a new case breaks a pattern, change the guess. Do not throw out the case.'],
              example: broke,
            },
          },
          never: {
            label: 'No. Patterns are always wrong.',
            fb: {
              headline: 'Your answer says patterns are always wrong, but a pattern is often a good guess.',
              detail: ['Your answer means a pattern never helps.', `${cap(NUM[draws])} ${k.many} in a row made ${k.is} a good guess. Many guesses like that turn out right.`, 'The only trouble is being sure. A pattern is a guess, not a proof.'],
            },
          },
        }
      : {
          break: { label: 'A new case can break a pattern.' },
          only: {
            label: `${cap(s.the)} has only ${k.many}.`,
            fb: {
              headline: `Your answer says ${s.the} has only ${k.many}, but ${newOne} just came out of it.`,
              detail: [`Your answer keeps the old guess.`, `The ${other.one} came out of ${s.the}. So ${s.the} has more than ${k.many}.`, 'When a new case breaks a pattern, change the guess.'],
              example: broke,
            },
          },
          next: {
            label: `The next draw must be ${other.is}.`,
            fb: {
              headline: `Your answer makes a new “must” from one draw, but one draw is not a proof either.`,
              detail: [`Your answer means ${other.is} has to come next.`, `${cap(s.the)} gave ${draws} ${k.many} before the ${other.one}. ${cap(k.is)} can still come out next.`, 'A new case breaks the old guess. It does not make a new proof.'],
              example: {
                label: `${cap(NUM[draws])} ${k.many}, then ${newOne}, then ${withA(k.one)}.`,
                truths: [{ who: `The next draw was ${other.is}`, value: false }, { who: 'Your answer', value: false }],
                note: `This can happen. So the next draw did not have to be ${other.is}.`,
              },
            },
          },
          useless: {
            label: 'Patterns never help you guess.',
            fb: {
              headline: 'Your answer says patterns never help, but the streak was still a good guess.',
              detail: ['Your answer means a pattern tells you nothing.', `${cap(NUM[draws])} ${k.many} in a row made ${k.is} a good guess. Guessing ${k.is} again after each draw was right ${draws - 1} times before the ${other.one} came out.`, 'A pattern helps you guess. It just does not prove.'],
            },
          },
        };
  const wrongIds = rng.shuffle(Object.keys(pool).filter((id) => id !== right)).slice(0, rng.int(2, 3));
  const ids = rng.shuffle([right, ...wrongIds]);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const id of wrongIds) feedback[id] = pool[id].fb!;
  const ask = form === 'proof' ? `Did the ${draws} ${k.many} prove what the next draw would be?` : `What does the ${other.one} show?`;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${name} can’t see inside ${s.the}. ${name} took out ${draws} ${k.many} in a row, putting each one back. Then ${newOne} came out! ${ask}`,
    scene: drawsScene(name, k, draws, other),
    choices: ids.map((id) => ({ id, label: pool[id].label })),
    answer: right,
    explain: `${cap(NUM[draws])} ${k.many} made ${k.is} a good guess, but the next draw broke it. A pattern from examples is a good guess, not a proof.`,
    hint: 'Ask: can one more draw come out different? Here is a smaller case, checked for you.',
    hintCase: {
      label: `Someone saw 3 ${k.many} in a row. The fourth was ${newOne}.`,
      truths: [{ who: `The fourth was ${k.is}`, value: false }],
    },
    teach: breakTeach(st),
    feedback,
    tags: ['can-fail'],
  };
  syncWhyWrong(item);
  return { tag: 'pattern-break', item, model: { t: 'break', form, skin, name, kind: st.ki, other: st.oi, draws } };
}

// ---------- See and Do: the worked bag, its cards and boards ----------

/** A sentence about one draw from a bag of shape cards: its words and which cards fit it. */
export interface CardSentence {
  id: string;
  says: string;
  fits(t: Thing): boolean;
}

const shapeIs = (sh: Shape): CardSentence => ({ id: sh, says: `The next card is ${withA(sh)}.`, fits: (t) => t.shape === sh });
const colorIs = (c: Color): CardSentence => ({ id: c, says: `The next card is ${c}.`, fits: (t) => t.color === c });

/** The worked example’s bag: 4 red circles, 1 blue circle and 2 red squares. Each card goes back after a draw. */
export const EXAMPLE_GROUPS: { n: number; shape: Shape; color: Color }[] = [
  { n: 4, shape: 'circle', color: 'red' },
  { n: 1, shape: 'circle', color: 'blue' },
  { n: 2, shape: 'square', color: 'red' },
];
/** The twin: one count changed (the 2 red squares are gone). */
export const TWIN_GROUPS = EXAMPLE_GROUPS.map((g) => (g.shape === 'square' ? { ...g, n: 0 } : g));

export function groupsScene(groups: typeof EXAMPLE_GROUPS): Extract<Scene, { kind: 'things' }> {
  const things: Thing[] = [];
  for (const g of groups) for (let j = 0; j < g.n; j++) things.push({ id: `t${things.length + 1}`, shape: g.shape, color: g.color, size: 'big' });
  return { kind: 'things', things };
}
export const EXAMPLE_SCENE = groupsScene(EXAMPLE_GROUPS);
export const TWIN_SCENE = groupsScene(TWIN_GROUPS);

/** The sentences marked on the worked example (shapes) and on the first board (colors). */
export const SHAPE_SENTENCES: CardSentence[] = [
  shapeIs('circle'),
  shapeIs('square'),
  shapeIs('triangle'),
  { id: 'circle-or-square', says: 'The next card is a circle or a square.', fits: (t) => t.shape === 'circle' || t.shape === 'square' },
];
export const COLOR_SENTENCES: CardSentence[] = [
  colorIs('red'),
  colorIs('blue'),
  colorIs('yellow'),
  { id: 'red-or-blue', says: 'The next card is red or blue.', fits: (t) => t.color === 'red' || t.color === 'blue' },
];

/** How many cards of a bag fit a sentence, and its word. */
export function judgeCards(things: readonly Thing[], st: CardSentence): { n: number; total: number; word: Word } {
  const n = things.filter((t) => st.fits(t)).length;
  return { n, total: things.length, word: wordFor(n, things.length) };
}

/** “4 cards fit and 3 do not. More fit than not, so: Likely.” */
export function cardNote(things: readonly Thing[], st: CardSentence): string {
  const j = judgeCards(things, st);
  return countWord(j.n, j.total, 'card', 'cards');
}

/** One board row: a sentence and its word. The answer is counted from the bag; every wrong word has its why. */
export function sentenceRow(things: readonly Thing[], st: CardSentence, given: boolean, o: { id?: string; label?: string; before?: string } = {}): DrillRow {
  const j = judgeCards(things, st);
  const why: Record<string, string> = {};
  if (!given) for (const w of WORDS) if (w !== j.word) why[w] = `${o.before ?? ''}${wordWhy(j.n, j.total, w, 'card', 'cards')}`;
  const mark: DrillMark = { id: `${o.id ?? st.id}-word`, label: 'Which word fits?', options: WORD_OPTIONS.map((x) => ({ ...x })), answer: j.word, ...(given ? { given: true } : {}), why };
  return { id: o.id ?? st.id, label: o.label ?? `“${st.says}”`, marks: [mark], note: cardNote(things, st) };
}

/** The worked example as a key-idea card: the bag, and each shape sentence with its word and its count. */
export function exampleCard(): IdeaCard {
  const t = EXAMPLE_SCENE.things;
  return {
    title: 'Example: mark each sentence',
    scene: EXAMPLE_SCENE,
    body: [
      `This bag has ${t.length} cards: 4 red circles, 1 blue circle and 2 red squares. Each card goes back after a draw.`,
      ...SHAPE_SENTENCES.map((st) => `“${st.says}” ${cardNote(t, st)}`),
    ],
  };
}

/** Board 1: the example’s bag. The shape sentences are shown; the learner marks the color sentences and a streak. */
export function colorBoard(id: string): DrillStep {
  const t = EXAMPLE_SCENE.things;
  const blue = COLOR_SENTENCES[1];
  const streak = sentenceRow(t, blue, false, {
    id: 'streak',
    label: 'Ivy drew red 3 times in a row, putting each card back. Now: “The next card is blue.”',
    before: 'The streak did not change the bag. ',
  });
  return {
    id,
    title: 'Mark the colors',
    body: [
      'This is the bag from the example. The shape sentences are marked for you.',
      'Now mark each color sentence: Must, Likely, Unlikely or Can’t. Count the cards that fit and the ones that do not.',
    ],
    scene: EXAMPLE_SCENE,
    rows: [...SHAPE_SENTENCES.map((st) => sentenceRow(t, st, true)), ...COLOR_SENTENCES.map((st) => sentenceRow(t, st, false)), streak],
    done: `Right. Blue is ${WORD_LABEL[judgeCards(t, blue).word].toLowerCase()}, even after a streak of reds. The counts in the bag decide the word.`,
  };
}

/** Board 2, a twin: the same bag with one count changed (no squares). The learner marks four sentences again. */
export function twinBoard(id: string): DrillStep {
  const t = TWIN_SCENE.things;
  const sts = [SHAPE_SENTENCES[0], SHAPE_SENTENCES[1], COLOR_SENTENCES[0], COLOR_SENTENCES[1]];
  const changed = sts.filter((st) => judgeCards(EXAMPLE_SCENE.things, st).word !== judgeCards(t, st).word);
  return {
    id,
    title: 'One count changed',
    body: ['Same bag, one change: the 2 red squares are gone. Now it has 4 red circles and 1 blue circle.', 'Count again, and mark each sentence.'],
    scene: TWIN_SCENE,
    twin: `One count changed: the bag now has 0 squares, not 2. It has ${t.length} cards.`,
    rows: sts.map((st) => sentenceRow(t, st, false)),
    done: `Right. Taking out the squares changed ${NUM[changed.length]} words: ${changed.map((st) => `“${st.says.replace(/^The next card is /, '').replace(/\.$/, '')}” is now ${WORD_LABEL[judgeCards(t, st).word]}`).join(', and ')}. Change the counts, and the words change.`,
  };
}

/** The key-idea cards: a pattern guess, likely is not must, a new case can break it, nothing is due, the example. */
export function patternIdeas(): IdeaCard[] {
  return [
    {
      title: 'Seeing a pattern',
      scene: { kind: 'text', lines: ['Eli’s draws, in order:', 'red, red, red, red'] },
      body: [
        'Eli takes a marble from a bag he can’t see. He looks at it, then puts it back. He does this four times.',
        'Red, red, red, red. Eli sees a pattern. He guesses, “The next one will be red too.”',
        'A guess from many same examples is a pattern guess. It is often a good guess. But it is a guess, not a proof.',
        'What does Eli know for sure? Only the four marbles he saw. The rest of the bag is hidden.',
      ],
    },
    {
      title: 'Likely is not must',
      scene: { kind: 'text', lines: ['In the bag:', '6 red marbles', '1 blue marble'] },
      body: [
        'Now the bag is open, so you can count. It has 6 red marbles and 1 blue marble. Each marble goes back after a draw.',
        'Red is likely: more marbles are red than not. But red is not a must. The blue one can still come out.',
        'Four words tell how sure you can be. Must: every one fits. Likely: more fit than not, but not every one. Unlikely: some fit, but fewer fit than not. Can’t: none fit.',
      ],
    },
    {
      title: 'A new case can break it',
      scene: { kind: 'text', lines: ['Hana’s draws, in order:', 'circle, circle, circle, circle, circle, circle, then square!'] },
      body: [
        'Hana draws cards from a bag she can’t see. Circle, circle, circle, circle, circle, circle. She guesses, “This bag has only circles.”',
        'Then a square comes out! One new case broke the pattern.',
        'Six circles in a row made her guess a good one. But it was never a proof. A good guess is not a proof, so check it before you are sure.',
      ],
    },
    {
      title: 'A streak does not make it due',
      body: [
        'Uma’s bag has 6 red marbles and 1 blue marble. She gets red four times in a row, putting each one back. Is blue “due” now?',
        '“Due” means it has to come soon. But each marble went back. So the bag is the same as before: 6 red and 1 blue.',
        'Red is still likely. Blue is still unlikely. Past draws do not change the bag, so nothing is ever due.',
      ],
    },
    exampleCard(),
  ];
}
