/**
 * Clues & Chances (id s13), Lessons 1 and 2: chances from counts, and draws that are new every time.
 *
 * Lesson 1 · Likely, not certain. Stop 7’s bag model (./patterns.ts): the counts in a bag give one word for “the next
 * draw is red”: Must (every one is red), Likely (more than half, not all), Unlikely (some, fewer than half) or Can’t
 * (none). A bag never holds exactly half. The new idea: the word comes from the bag, not from one draw. A likely draw
 * can fail to come out and an unlikely one can come out, and neither makes the word wrong; a “must” that came true by
 * luck was still the wrong word. That is the trap (tag one-draw): one draw seems to judge the word.
 *
 * Lesson 2 · Each draw is new. A fair coin (Proof Lantern’s devices, ./observatory/proof.ts) has no memory: every way
 * the tries can go is listed (nextAfterStreak), and after any streak the next try matches as often as not. A bag whose
 * draws go back is the same every time (grown-ups say the draws are independent), so nothing is ever “due” (the trap,
 * tag due). A draw kept out changes the bag, so count again.
 *
 * Every answer, explanation, wrong-choice feedback and hint case below is worked out from these models. The bridge
 * (the stop page’s warm-up) is a Ways to Think item: a good guess is not a proof.
 */
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, CountGroup, Rng, Teach, TeachCase } from '../types';
import { reviseItem, type ExplainSkin } from './explanations';
import { DEVICES, nextAfterStreak } from './observatory/proof';
import {
  FRAMES,
  NAMES,
  SKINS,
  WORDS,
  WORD_LABEL,
  bagScene,
  bagText,
  breakItem,
  chanceItem,
  dueItem,
  nextSays,
  skinsOf,
  sureItem,
  totalOf,
  wordFor,
  wordSentence,
  type Counts,
  type Frame,
  type Kind,
  type Skin,
  type SkinId,
  type Word,
} from './patterns';
import type { ItemCore, Made } from './statements';

export { FRAMES, NAMES, SKINS, skinsOf, wordFor, totalOf, type Counts, type Frame, type Kind, type Skin, type SkinId, type Word };

// ---------- words ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** “a red marble”, “an A tile”, “an egg”, “a unicorn” (a word that starts with a “you” sound takes “a”). */
export const withA = (p: string) => `${/^[aeiou]/i.test(p) && !/^(uni|use|one)/i.test(p) ? 'an' : 'a'} ${p}`;
const countOf = (n: number, k: Kind) => `${n} ${n === 1 ? k.one : k.many}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** “9 of the 10 marbles are red”, “1 of the 4 cards is a circle”, “none of the 5 tiles is an A”, “all 3 gems are red”. */
export function shareLine(s: Skin, k: Kind, n: number, total: number): string {
  if (n === 0) return `none of the ${total} ${s.nouns} is ${k.is}`;
  if (n === total) return total === 1 ? `the 1 ${s.noun} is ${k.is}` : `all ${total} ${s.nouns} are ${k.are}`;
  return `${n} of the ${total} ${s.nouns} ${n === 1 ? `is ${k.is}` : `are ${k.are}`}`;
}

/** Why the counts give the word: “More are red than not, but not all. So the word is Likely.” */
export function wordBecause(k: Kind, w: Word): string {
  switch (w) {
    case 'must': return `Every one is ${k.is}, so the word is Must.`;
    case 'likely': return `More are ${k.are} than not, but not all. So the word is Likely.`;
    case 'unlikely': return `Some are ${k.are}, but fewer than the rest. So the word is Unlikely.`;
    case 'cant': return `None is ${k.is}, so the word is Can’t.`;
  }
}

/** What a word needs from the bag: “more are red than not, but not every one”. */
export function wordNeeds(k: Kind, w: Word): string {
  switch (w) {
    case 'must': return `every one is ${k.is}`;
    case 'likely': return `more are ${k.are} than not, but not every one`;
    case 'unlikely': return `some are ${k.are}, but fewer than the rest`;
    case 'cant': return `none is ${k.is}`;
  }
}

/** Counted dots for a bag (zero groups left out, but at least one group). */
export function bagGroups(s: Skin, c: Counts): CountGroup[] {
  const g = c.flatMap((n, i) => (n > 0 ? [{ label: cap(s.kinds[i].many), n, color: s.kinds[i].color }] : []));
  return g.length ? g : [{ label: cap(s.nouns), n: 0 }];
}

/** The four words and “put back”, defined for every Lesson 1 item. */
export const LIKELY_TERMS = [
  { word: 'Likely', meaning: 'more fit than not, but not every one. A likely thing can still fail to happen.' },
  { word: 'Certain', meaning: 'it must happen, because every one fits. This is the word Must.' },
  { word: 'Unlikely', meaning: 'some fit, but fewer than the rest. An unlikely thing can still happen.' },
  { word: 'Put back', meaning: 'after each draw, the thing goes back. So the bag is the same every time.' },
];

const FOUR_WORDS = 'All fit: Must. More fit than not, but not all: Likely. Fewer fit than not: Unlikely. None fit: Can’t.';

// ---------- made items ----------

/** The model behind each Lesson 1 and 2 item (for tests). */
export type ChanceModel =
  | { t: 'word'; skin: SkinId; counts: Counts; ask: number; form: 'sentence' | 'word' }
  | { t: 'pick'; skin: SkinId; ki: number; target: Word; bags: Record<Word, Counts>; name: string }
  | { t: 'draw'; form: DrawForm; skin: SkinId; counts: Counts; ki: number; said: Word; draw: number; name: string }
  | { t: 'coin'; device: string; k: number; side: string; other: string }
  | { t: 'due'; skin: SkinId; form: 'known' | 'hidden'; counts?: Counts; kind: number; other: number; draws: number }
  | { t: 'kept'; form: KeptForm; skin: SkinId; before: Counts; after: Counts; ki: number; k: number; ask: number; more?: boolean; who?: KeptWho; drew?: [number, number]; names: string[] }
  | { t: 'guess' };

export interface ChanceMade extends Made {
  model: ChanceModel;
}

function done(tag: string, item: ItemCore, model: ChanceModel): ChanceMade {
  syncWhyWrong(item);
  return { tag, item, model };
}

/** The trap tags each lesson’s pass rule asks for (every planned pack holds one). */
export const ONE_DRAW = { tag: 'one-draw', label: 'a question where one draw seems to make the word right or wrong' } as const;
export const DUE = { tag: 'due', label: 'a question where a streak seems to make something due' } as const;

// ---------- Lesson 1: which word fits (Stop 7’s item, kept as it is) ----------

/** Stop 7’s “which word fits” item on a bag you can count, as a Lesson 1 item (skill likely). */
export function wordItem(rng: Rng, skin: SkinId, o: { form?: 'sentence' | 'word'; name?: string } = {}): ChanceMade {
  const m = chanceItem(rng, skin, { form: o.form, name: o.name });
  if (m.model.t !== 'chance') throw new Error('wordItem: not a chance item');
  const { bag, form } = m.model;
  return { tag: 'likely', item: m.item, model: { t: 'word', skin, counts: bag.counts, ask: bag.ask, form } };
}

// ---------- Lesson 1: which bag gives this word ----------

/** A bag for kind `ki` whose word is `w`: 3 to 9 things, never exactly half. */
export function bagWith(rng: Rng, ki: number, w: Word, lo = 3, hi = 9): Counts {
  for (let t = 0; t < 400; t++) {
    const total = rng.int(lo, hi);
    const n = w === 'must' ? total : w === 'cant' ? 0 : w === 'likely' ? rng.int(Math.floor(total / 2) + 1, total - 1) : rng.int(1, Math.ceil(total / 2) - 1);
    if (n < 0 || n > total || 2 * n === total) continue;
    const c: Counts = [0, 0, 0];
    c[ki] = n;
    const others = [0, 1, 2].filter((i) => i !== ki);
    const rest = total - n;
    if (rest > 0) {
      if (rest >= 2 && rng.chance(0.3)) {
        const a = rng.int(1, rest - 1);
        c[others[0]] = a;
        c[others[1]] = rest - a;
      } else c[rng.pick(others)] = rest;
    }
    if (wordFor(c[ki], totalOf(c)) !== w) continue;
    return c;
  }
  throw new Error(`bagWith: no ${w} bag`);
}

const PICK_ASK: Record<Word, (s: Skin, k: Kind) => string> = {
  must: (s, k) => `In which bag must the next ${s.noun} be ${k.is}?`,
  likely: (_s, k) => `In which bag is ${k.is} likely, but not certain?`,
  unlikely: (_s, k) => `In which bag is ${k.is} unlikely, but still possible?`,
  cant: (s, k) => `In which bag can’t the next ${s.noun} be ${k.is}?`,
};

/** One bag counted, as a case: its counts and its word. */
function bagCase(s: Skin, k: Kind, c: Counts, label: string, truths: TeachCase['truths']): TeachCase {
  const n = c[s.kinds.indexOf(k)];
  const total = totalOf(c);
  return { label, groups: bagGroups(s, c), truths, note: `${cap(shareLine(s, k, n, total))}. ${wordBecause(k, wordFor(n, total))}` };
}

/** Which of four bags makes “the next draw is red” fit the asked word? One bag for each word. */
export function pickItem(rng: Rng, skin: SkinId, o: { target?: Word; name?: string } = {}): ChanceMade {
  const s = SKINS[skin];
  const ki = rng.int(0, 2);
  const k = s.kinds[ki];
  const target = o.target ?? rng.pick<Word>(['must', 'likely', 'likely', 'unlikely', 'unlikely', 'cant']);
  const name = o.name ?? rng.pick(NAMES);
  const bags = Object.fromEntries(WORDS.map((w) => [w, bagWith(rng, ki, w)])) as Record<Word, Counts>;
  const label = (w: Word) => bagText(s, bags[w]);
  const choices: Choice[] = rng.shuffle([...WORDS]).map((w) => ({ id: w, label: label(w) }));
  // The answer: the one bag whose counts give the asked word.
  const answer = WORDS.find((w) => wordFor(bags[w][ki], totalOf(bags[w])) === target)!;
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of WORDS) {
    if (w === answer) continue;
    const c = bags[w];
    const got = wordFor(c[ki], totalOf(c));
    feedback[w] = {
      headline: `In your bag, the word for ${k.is} is ${WORD_LABEL[got]}, not ${WORD_LABEL[target]}.`,
      detail: [`Your bag has ${label(w)}. ${cap(shareLine(s, k, c[ki], totalOf(c)))}.`, wordBecause(k, got), `The question needs ${WORD_LABEL[target]}: ${wordNeeds(k, target)}.`],
      example: bagCase(s, k, c, `Your bag: ${label(w)}.`, [{ who: WORD_LABEL[target], value: false }, { who: WORD_LABEL[got], value: true }]),
    };
  }
  // The hint counts one wrong bag whose words do not hold the answer’s words.
  const right = label(answer);
  const hintWord = rng.shuffle(WORDS.filter((w) => w !== answer)).find((w) => !label(w).includes(right)) ?? WORDS.find((w) => w !== answer)!;
  const n = bags[answer][ki];
  const total = totalOf(bags[answer]);
  const teach: Teach = {
    rule: 'Count the things that fit and the things that do not. The counts give the word: Must, Likely, Unlikely or Can’t.',
    terms: LIKELY_TERMS,
    meaning: `The question asks for a bag where the word for ${k.is} is ${WORD_LABEL[target]}. That needs ${wordNeeds(k, target)}.`,
    casesTitle: 'Each bag, counted',
    cases: WORDS.map((w) => bagCase(s, k, bags[w], `${cap(label(w))}.`, [{ who: WORD_LABEL[target], value: w === answer }])),
    remember: [FOUR_WORDS, 'Ask: “How many fit, and how many do not?”'],
    simpler: [`Take the bag with ${right}.`, `${cap(shareLine(s, k, n, total))}.`, wordBecause(k, target)],
  };
  return done(
    'likely',
    {
      kind: 'choose',
      prompt: `${name} will take one ${s.noun} from a bag without looking. Here are four bags of ${s.nouns}. ${PICK_ASK[target](s, k)}`,
      choices,
      answer,
      explain: `The bag with ${right}: ${shareLine(s, k, n, total)}. ${wordBecause(k, target)}`,
      feedback,
      hint: 'Count each bag. Here is one bag, checked for you. Check the others the same way.',
      hintCase: bagCase(s, k, bags[hintWord], `One bag: ${label(hintWord)}.`, [{ who: WORD_LABEL[wordFor(bags[hintWord][ki], totalOf(bags[hintWord]))], value: true }]),
      teach,
    },
    { t: 'pick', skin, ki, target, bags, name },
  );
}

// ---------- Lesson 1: one draw does not judge the word (the trap) ----------

/**
 * The four ways one draw can seem to judge a word. `said`: the word said before the draw; `truth`: the word the bag
 * gives; `isK`: whether the draw is the kind the word is about. In every form the draw points one way and the counts
 * the other, so a learner who judges by the draw gets it wrong.
 *  surprise  “likely red”, and blue came out: still the right word
 *  rare      “unlikely red”, and red came out: still the right word
 *  lucky     “must be red”, and red came out: the wrong word (it was only likely)
 *  never     “can’t be red”, and blue came out: the wrong word (red was unlikely, not can’t)
 */
export type DrawForm = 'surprise' | 'rare' | 'lucky' | 'never';
export const DRAW_FORMS: readonly DrawForm[] = ['surprise', 'rare', 'lucky', 'never'];
export const DRAW_SPEC: Record<DrawForm, { said: Word; truth: Word; isK: boolean }> = {
  surprise: { said: 'likely', truth: 'likely', isK: false },
  rare: { said: 'unlikely', truth: 'unlikely', isK: true },
  lucky: { said: 'must', truth: 'likely', isK: true },
  never: { said: 'cant', truth: 'unlikely', isK: false },
};
/** Does the draw go the way the word points? Must and Likely point to the kind; Unlikely and Can’t point away from it. */
export const drawAgrees = (said: Word, isK: boolean) => (said === 'must' || said === 'likely' ? isK : !isK);

const RULE_LABEL: Record<DrawForm, string> = {
  surprise: 'No. Something likely always happens.',
  rare: 'No. Something unlikely never happens.',
  lucky: 'Yes. Must and Likely mean the same thing.',
  never: 'Yes. Can’t and Unlikely mean the same thing.',
};

/** A small case of the other type, for the hint: a jar of 3 lemon drops and 1 cherry drop. Worked out from the counts. */
function drawHint(form: DrawForm): TeachCase {
  const lemon = 3, cherry = 1;
  const truth = wordFor(lemon, lemon + cherry);
  if (form === 'surprise' || form === 'rare') {
    return {
      label: `A jar has ${lemon} lemon drops and ${cherry} cherry drop. Ned says, “It must be lemon.” Out comes lemon.`,
      truths: [{ who: 'Must was the right word', value: truth === 'must' }],
      note: `${cherry} of the ${lemon + cherry} drops is cherry, so the right word is ${WORD_LABEL[truth]}. Ned just got the draw he said.`,
    };
  }
  return {
    label: `A jar has ${lemon} lemon drops and ${cherry} cherry drop. Ned says, “It is likely to be lemon.” Out comes cherry.`,
    truths: [{ who: 'Likely was the right word', value: truth === 'likely' }],
    note: `${lemon} of the ${lemon + cherry} drops are lemon, so Likely was right. Cherry came out anyway.`,
  };
}

/** One draw judged against the counts: was the word said before it right? (A conflict item: tag one-draw.) */
export function drawItem(rng: Rng, skin: SkinId, o: { form?: DrawForm; name?: string } = {}): ChanceMade {
  const s = SKINS[skin];
  const form = o.form ?? rng.pick(DRAW_FORMS);
  const { said, truth, isK } = DRAW_SPEC[form];
  const name = o.name ?? rng.pick(NAMES);
  const ki = rng.int(0, 2);
  const K = s.kinds[ki];
  const counts = bagWith(rng, ki, truth, 4, 10);
  const total = totalOf(counts);
  const n = counts[ki];
  const present = [0, 1, 2].filter((i) => i !== ki && counts[i] > 0);
  const draw = isK ? ki : rng.pick(present);
  const D = s.kinds[draw];
  const fits = said === wordFor(n, total);
  const agrees = drawAgrees(said, draw === ki);
  if (fits === agrees) throw new Error('drawItem: the draw must point the other way from the counts');
  // A kind that could have come out instead (it is in the bag): the case that shows the draw does not decide.
  const instead = s.kinds[draw === ki ? present[0] : ki];
  const share = cap(shareLine(s, K, n, total));
  const rest = total - n;
  // A word the counts do not give: Must or Can’t next to a right word, or the other side of half for a wrong one.
  const other: Word = fits ? (truth === 'likely' ? 'must' : 'cant') : truth === 'likely' ? 'unlikely' : 'likely';
  if (other === wordFor(n, total) || other === said) throw new Error('drawItem: the other word must not fit');
  const choices: Choice[] = [
    { id: 'word', label: fits ? `Yes. ${share}, so ${WORD_LABEL[said]} was the right word.` : `No. ${share}, so the right word is ${WORD_LABEL[truth]}.` },
    { id: 'outcome', label: agrees ? `Yes. ${cap(withA(D.one))} came out, so the word was right.` : `No. ${cap(withA(D.one))} came out, so the word was wrong.` },
    { id: 'rule', label: RULE_LABEL[form] },
    // A wrong reason with the same Yes or No as the answer, so the answer is never the odd one out: “any word would
    // do” when the word was right, and the wrong new word when it was not.
    {
      id: 'reason',
      label: fits ? 'Yes. Any word would be right, because no one knows what comes out.' : `No. ${cap(K.is)} was ${WORD_LABEL[other].toLowerCase()}, so ${name} should have said ${WORD_LABEL[other]}.`,
    },
  ];
  const sameBag: TeachCase = {
    label: `The same ${s.the.replace(/^the /, '')}. Say ${withA(instead.one)} came out instead.`,
    truths: [{ who: `${WORD_LABEL[said]} was the right word`, value: fits }],
    note: `${cap(s.the)} did not change, so the answer does not change.`,
  };
  const counted = `${cap(s.the)} has ${bagText(s, counts)}. ${share}.`;
  const feedback: Record<string, ChoiceFeedback> = {
    outcome: {
      headline: `Your answer judges the word by one draw, but the word comes from ${s.the}.`,
      detail: agrees
        ? [counted, wordBecause(K, truth), `${name} said ${WORD_LABEL[said]}. That was not the right word, even though ${withA(D.one)} came out.`]
        : [counted, wordBecause(K, truth), `${said === 'likely' ? 'Likely is not certain' : 'Unlikely is not the same as Can’t'}. ${cap(withA(D.one))} came out this time, and the word was still right.`],
      example: sameBag,
    },
    rule: {
      headline:
        form === 'surprise'
          ? 'Your answer says likely things always happen, but likely is not certain.'
          : form === 'rare'
            ? 'Your answer says unlikely things never happen, but Unlikely is not the same as Can’t.'
            : form === 'lucky'
              ? 'Your answer says Must and Likely mean the same, but they do not.'
              : 'Your answer says Can’t and Unlikely mean the same, but they do not.',
      detail:
        form === 'surprise'
          ? ['Likely means more fit than not, but not every one.', `${cap(s.the)} has ${bagText(s, counts)}, so ${withA(D.one)} can come out. This time it did.`]
          : form === 'rare'
            ? ['Unlikely means some fit, but fewer than the rest.', `${cap(s.the)} has ${countOf(n, K)}, so ${withA(K.one)} can come out. This time it did.`]
            : form === 'lucky'
              ? ['Must means every one fits. Likely means more fit than not, but not every one.', `${rest} of the ${total} ${s.nouns} ${rest === 1 ? `is not ${K.is}` : `are not ${K.are}`}. So the right word is Likely.`]
              : ['Can’t means none fit. Unlikely means some fit, but fewer than the rest.', `${cap(s.the)} has ${countOf(n, K)}, so ${withA(K.one)} can come out. The right word is Unlikely.`],
      example: sameBag,
    },
    reason: fits
      ? {
          headline: 'Your answer says any word would do, but the counts give just one word.',
          detail: [`${cap(s.the)} has ${bagText(s, counts)}. ${share}.`, wordBecause(K, truth), `${WORD_LABEL[said]} was right. ${WORD_LABEL[other]} would have been the wrong word, whatever came out.`],
          example: {
            label: `The same ${s.the.replace(/^the /, '')}. Say ${name} had said, “${wordSentence(K, other)}”`,
            truths: [{ who: `${WORD_LABEL[other]} was the right word`, value: other === wordFor(n, total) }],
            note: wordBecause(K, truth),
          },
        }
      : {
          headline: `Your answer says the right word is ${WORD_LABEL[other]}, but ${shareLine(s, K, n, total)}.`,
          detail: [wordBecause(K, truth), `${WORD_LABEL[said]} was not the right word, and ${WORD_LABEL[other]} is not either. The right word is ${WORD_LABEL[truth]}.`],
          example: {
            label: `${cap(s.the)}: ${bagText(s, counts)}.`,
            groups: bagGroups(s, counts),
            truths: [{ who: WORD_LABEL[other], value: other === wordFor(n, total) }, { who: WORD_LABEL[truth], value: truth === wordFor(n, total) }],
            note: `${share}.`,
          },
        },
  };
  const kindsIn = [0, 1, 2].filter((i) => counts[i] > 0);
  const teach: Teach = {
    rule: 'The word comes from the counts in the bag. One draw can’t make it right or wrong.',
    terms: LIKELY_TERMS,
    meaning: `${name} said, “${wordSentence(K, said)}” ${cap(s.the)} has ${bagText(s, counts)}. ${share}.`,
    casesTitle: 'The same bag, whatever comes out',
    cases: [
      ...kindsIn.map((i) => ({
        label: `Out comes ${withA(s.kinds[i].one)}.`,
        truths: [{ who: `${WORD_LABEL[said]} was the right word`, value: fits }],
        note: `${cap(s.the)} is the same. ${wordBecause(K, truth)}`,
      })),
    ],
    remember: ['The word comes from the bag, not from the draw.', 'Ask: “What do the counts say?” Not: “What came out?”'],
    simpler: ['Say a bag has 2 red marbles and 1 blue marble.', `2 of the 3 are red, so red is ${WORD_LABEL[wordFor(2, 3)].toLowerCase()}.`, 'If the blue one comes out, red was still likely. Likely is not certain.'],
  };
  return done(
    'likely',
    {
      kind: 'choose',
      prompt: `${cap(s.the)} has ${bagText(s, counts)}. ${name} will take one ${s.noun} without looking. First, ${name} says, “${wordSentence(K, said)}” Then out comes ${withA(D.one)}. Was ${name}’s word right?`,
      scene: bagScene(s, counts),
      choices: rng.shuffle(choices),
      answer: 'word',
      explain: `${share}. ${wordBecause(K, truth)} ${fits ? `So ${WORD_LABEL[said]} was right, even though ${withA(D.one)} came out.` : `So ${WORD_LABEL[said]} was not the right word, even though ${withA(D.one)} came out.`}`,
      feedback,
      hint: 'Look at the counts, not the draw. Here is a case from another bag, checked for you.',
      hintCase: drawHint(form),
      teach,
      conflict: true,
      tags: [ONE_DRAW.tag],
    },
    { t: 'draw', form, skin, counts, ki, said, draw, name },
  );
}

// ---------- Lesson 2: a fair coin has no memory ----------

export type DeviceId = (typeof DEVICES)[number]['id'];

/** “1 way”, “2 ways”. */
const ways = (n: number) => plural(n, 'way');

/** The next try after a streak on a fair coin, spinner or cube. (A conflict item: tag due.) */
export function coinItem(rng: Rng, o: { device?: DeviceId } = {}): ChanceMade {
  const dev = DEVICES.find((d) => d.id === o.device) ?? rng.pick(DEVICES);
  const k = rng.int(3, 7);
  const sideIx = rng.int(0, 1);
  const side = dev.sides[sideIx];
  const oth = dev.sides[1 - sideIx];
  const [A, B] = dev.sides;
  const { same, other } = nextAfterStreak(k);
  const right = same === other ? 'same' : same > other ? 'streak' : 'due';
  const two = nextAfterStreak(1);
  const counted = `Think of every way ${k + 1} ${dev.verb}s can go. Of the ways that start with ${k} ${side} in a row, ${ways(same)} ${same === 1 ? 'ends' : 'end'} ${side} and ${ways(other)} ${other === 1 ? 'ends' : 'end'} ${oth}.`;
  const after: TeachCase = {
    label: `After ${k} ${side} in a row, ${ways(same)} ${same === 1 ? 'ends' : 'end'} ${side} and ${ways(other)} ${other === 1 ? 'ends' : 'end'} ${oth}.`,
    truths: [{ who: `${cap(oth)} is more likely next`, value: other > same }, { who: `${cap(side)} is more likely next`, value: same > other }],
    note: 'Each side is just as likely, after any streak.',
  };
  const choices: Choice[] = [
    { id: 'same', label: `${cap(A)} and ${B} are still just as likely.` },
    { id: 'due', label: `${cap(oth)} is more likely now, because it is due.` },
    { id: 'streak', label: `${cap(side)} is more likely, because it is on a streak.` },
    { id: 'must', label: `${cap(oth)} must come next.` },
  ];
  const fb: Record<string, ChoiceFeedback> = {
    due: {
      headline: `Your answer says ${oth} is due, but a fair ${dev.noun} has no memory.`,
      detail: ['“Due” means more likely because it has not come up for a while.', counted, `So ${oth} is not more likely. Each ${dev.verb} is new.`],
      example: after,
    },
    streak: {
      headline: `Your answer says ${side} is on a streak, but a fair ${dev.noun} has no memory either way.`,
      detail: ['A streak does not make a side more likely.', counted, `So ${side} is not more likely. Each ${dev.verb} is new.`],
      example: after,
    },
    must: {
      headline: `Your answer says ${oth} must come next, but ${side} can come again.`,
      detail: ['Must means it has to happen.', counted, 'So either side can come next. Neither one is a must.'],
      example: after,
    },
  };
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of choices) if (c.id !== right) feedback[c.id] = fb[c.id];
  if (Object.keys(feedback).length !== choices.length - 1) throw new Error('coinItem: a wrong choice without feedback');
  const smallLabel = `Two ${dev.verb}s. The ways that start with ${side}: ${side}, ${side}; and ${side}, ${oth}.`;
  return done(
    'due',
    {
      kind: 'choose',
      prompt: `${dev.name} ${dev.lands(side)} ${k} times in a row. What is true about the next ${dev.verb}?`,
      scene: { kind: 'text', lines: [`${dev.name}.`, `So far: ${Array.from({ length: k }, () => side).join(', ')}`] },
      choices: rng.shuffle(choices),
      answer: right,
      explain: `A fair ${dev.noun} has no memory. ${counted} So ${A} and ${B} are still just as likely.`,
      feedback,
      hint: `Does the ${dev.noun} know what came before? Here is a smaller case, checked for you.`,
      hintCase: { label: smallLabel, truths: [{ who: `${cap(oth)} is more likely second`, value: two.other > two.same }], note: `${ways(two.same)} ${two.same === 1 ? 'ends' : 'end'} ${side}, and ${ways(two.other)} ${two.other === 1 ? 'ends' : 'end'} ${oth}.` },
      teach: {
        rule: `Each ${dev.verb} of a fair ${dev.noun} is new. What came before does not change the chances. Grown-ups call this independent.`,
        terms: [
          { word: 'Fair', meaning: 'each side has the same chance every time.' },
          { word: 'Due', meaning: 'more likely because it has not come up for a while. A fair try is never due.' },
          { word: 'Independent', meaning: 'each try is new. What came before does not change it.' },
        ],
        meaning: `${dev.name} ${dev.lands(side)} ${k} times. The question is about the next ${dev.verb}.`,
        casesTitle: 'Every way the tries can go',
        cases: [
          { label: smallLabel, truths: [{ who: `${cap(oth)} is more likely second`, value: two.other > two.same }], note: `${ways(two.same)} ${two.same === 1 ? 'ends' : 'end'} ${side}, and ${ways(two.other)} ${two.other === 1 ? 'ends' : 'end'} ${oth}.` },
          after,
        ],
        remember: ['A fair try has no memory.', `Ask: “Did anything change the ${dev.noun}?”`],
        simpler: [
          `${cap(dev.verb)} twice. The 4 ways are: ${A}, ${A}; ${A}, ${B}; ${B}, ${A}; ${B}, ${B}.`,
          `Of the 2 ways that start with ${side}, 1 ends ${side} and 1 ends ${oth}.`,
          `So after ${side}, ${oth} is not more likely.`,
        ],
      },
      conflict: true,
      tags: [DUE.tag],
    },
    { t: 'coin', device: dev.id, k, side, other: oth },
  );
}

// ---------- Lesson 2: the streak trap in a bag (Stop 7’s item) ----------

/** Stop 7’s “is the other kind due?” item, as a Lesson 2 item (skill due, tag due). */
export function bagDueItem(rng: Rng, skin: SkinId, o: { form?: 'known' | 'hidden'; name?: string } = {}): ChanceMade {
  const m = dueItem(rng, skin, { form: o.form, name: o.name });
  if (m.model.t !== 'due') throw new Error('bagDueItem: not a due item');
  const { form, counts, kind, other, draws } = m.model;
  return { tag: 'due', item: { ...m.item, tags: [DUE.tag] }, model: { t: 'due', skin, form, counts, kind, other, draws } };
}

// ---------- Lesson 2: put back, or kept out? ----------

export type KeptForm = 'word' | 'which';
/** Who keeps the draws out in a 'which' story: one kid, or nobody (both put every draw back). */
export type KeptKeep = 'one' | 'none';
/** Which kid keeps the draws out: the first named, the second, or neither. */
export type KeptWho = 'first' | 'second' | 'none';

const KEPT_TERMS = [
  { word: 'Put back', meaning: 'the draw goes back in. The bag is the same as before.' },
  { word: 'Kept out', meaning: 'the draw stays out. The bag has one less of that kind, so the chances change.' },
  { word: 'Independent', meaning: 'each draw is new, because nothing changed the bag.' },
];

/**
 * A bag of two or three kinds for draws kept out: kind ki has at least k things, and some other kind is in it too.
 * `want`: the word the asked kind must have after the draws. Must and Can’t need every thing of kind ki kept out
 * (Must asks about the one kind left, Can’t about kind ki), so for them kind ki has exactly k things; for the other
 * words it has at least k + 1.
 */
function keptBag(rng: Rng, ki: number, k: number, ask: number | null, change: boolean | null, want?: Word): { before: Counts; after: Counts; ask: number } | null {
  const emptied = want === 'must' || want === 'cant';
  const total = rng.int(Math.max(4, k + 2), 10);
  const nK = emptied ? k : rng.int(k + 1, total - 1);
  const before: Counts = [0, 0, 0];
  before[ki] = nK;
  const others = [0, 1, 2].filter((i) => i !== ki);
  const rest = total - nK;
  if (want !== 'must' && rest >= 2 && rng.chance(0.3)) {
    const a = rng.int(1, rest - 1);
    before[others[0]] = a;
    before[others[1]] = rest - a;
  } else before[rng.pick(others)] = rest;
  const after = [...before] as Counts;
  after[ki] -= k;
  const present = others.filter((i) => before[i] > 0);
  const a = ask ?? (want === 'cant' ? ki : want === 'must' ? present[0] : rng.chance(0.6) ? ki : rng.pick(present));
  if (before[a] === 0) return null;
  const t0 = totalOf(before), t1 = totalOf(after);
  if (2 * before[a] === t0 || 2 * after[a] === t1) return null;
  if (want && wordFor(after[a], t1) !== want) return null;
  if (change !== null && (wordFor(before[a], t0) !== wordFor(after[a], t1)) !== change) return null;
  return { before, after, ask: a };
}

const KEPT_RULE = 'A draw that goes back leaves the bag the same. A draw kept out changes the bag, so count again.';
const KEPT_REMEMBER = ['Put back: the same bag, so each draw is new. Kept out: a new bag, so count again.', 'Ask: “Did the draw go back?”'];
const KEPT_SIMPLER = ['Say a bag has 3 red marbles and 1 blue marble.', 'Take out a red one and keep it out. Now the bag has 2 red and 1 blue.', 'The bag changed, so the chances changed. Put back, it would still be 3 red and 1 blue.'];

function keptTeach(s: Skin, A: Kind, before: Counts, after: Counts, keptLine: string): Teach {
  const ai = s.kinds.indexOf(A);
  const w0 = wordFor(before[ai], totalOf(before));
  const w1 = wordFor(after[ai], totalOf(after));
  return {
    rule: KEPT_RULE,
    terms: KEPT_TERMS,
    meaning: `At the start, ${s.the} has ${bagText(s, before)}. ${keptLine}`,
    casesTitle: `The word for ${A.is}, before and after`,
    cases: [
      { label: `At the start: ${bagText(s, before)}.`, groups: bagGroups(s, before), truths: [{ who: WORD_LABEL[w0], value: true }], note: `${cap(shareLine(s, A, before[ai], totalOf(before)))}.` },
      { label: `After the draws kept out: ${bagText(s, after)}.`, groups: bagGroups(s, after), truths: [{ who: WORD_LABEL[w1], value: true }], note: `${cap(shareLine(s, A, after[ai], totalOf(after)))}.` },
    ],
    remember: KEPT_REMEMBER,
    simpler: KEPT_SIMPLER,
  };
}

/** The smaller case on every kept-out hint: 3 of one kind and 1 of another, one kept out. */
function keptHint(s: Skin, K: Kind, O: Kind): TeachCase {
  const ki = s.kinds.indexOf(K), oi = s.kinds.indexOf(O);
  const b: Counts = [0, 0, 0];
  b[ki] = 3;
  b[oi] = 1;
  const a = [...b] as Counts;
  a[ki] -= 1;
  return { label: `A bag with ${bagText(s, b)}. One ${K.one} is kept out.`, truths: [{ who: 'The bag is the same as before', value: false }], note: `Now it has ${bagText(s, a)}.` };
}

/**
 * Draws kept out change the bag. form 'word': some draws of one kind are kept out; which word fits a sentence now?
 * The word after the draws is picked first (Likely or Unlikely most often; Must or Can’t when every thing of that kind
 * is kept out), and the bag is built to give it, so every word can be the answer.
 * form 'which': two kids draw twice each from the same bag. The story says who keeps the draws out: one of the two
 * (`keep: 'one'`, either kid), or nobody (`keep: 'none'`: both put every draw back, after drawing different kinds). For whom is a kind more (or less) likely next? Each kid’s bag is worked out and the shares compared, so the
 * answer can be either kid, or the same for both.
 */
export function keptItem(rng: Rng, skin: SkinId, o: { form?: KeptForm; names?: string[]; keep?: KeptKeep } = {}): ChanceMade {
  const s = SKINS[skin];
  const form = o.form ?? (rng.chance(0.5) ? 'word' : 'which');
  const names = o.names ?? rng.shuffle(NAMES).slice(0, 2);
  const ki = rng.int(0, 2);
  const K = s.kinds[ki];
  if (form === 'word') {
    const k = rng.int(1, 3);
    const want = rng.pick<Word>(['likely', 'likely', 'unlikely', 'unlikely', 'must', 'cant']);
    // Must and Can’t always change the word; Likely and Unlikely sometimes keep the old one.
    const change = want === 'must' || want === 'cant' ? null : rng.chance(0.65);
    let got: ReturnType<typeof keptBag> = null;
    for (let t = 0; t < 400 && !got; t++) got = keptBag(rng, ki, k, null, t < 300 ? change : null, want);
    if (!got) throw new Error('keptItem: no bag');
    const { before, after, ask } = got;
    const A = s.kinds[ask];
    const [name] = names;
    const t1 = totalOf(after);
    const right = wordFor(after[ask], t1);
    const old = wordFor(before[ask], totalOf(before));
    const keptLine = `${name} takes out ${k === 1 ? withA(K.one) : `${k} ${K.many}, one at a time`}, and keeps ${k === 1 ? 'it' : 'them'} out.`;
    const stayed = k === 1 ? `the ${K.one} stayed out` : `the ${k} ${K.many} stayed out`;
    const nowLine = `Now ${s.the} has ${bagText(s, after)}. ${cap(shareLine(s, A, after[ask], t1))}.`;
    const feedback: Record<string, ChoiceFeedback> = {};
    for (const w of WORDS) {
      if (w === right) continue;
      feedback[w] =
        w === old
          ? {
              headline: `Your answer is the word for ${s.the} before the draws, but ${stayed}.`,
              detail: [`Kept out means it does not go back. So ${s.the} changed.`, nowLine, wordBecause(A, right)],
              example: { label: `Now: ${bagText(s, after)}.`, groups: bagGroups(s, after), truths: [{ who: WORD_LABEL[w], value: false }, { who: WORD_LABEL[right], value: true }], note: `${cap(shareLine(s, A, after[ask], t1))}.` },
            }
          : {
              headline: `In ${s.the} now, the word is ${WORD_LABEL[right]}, not ${WORD_LABEL[w]}.`,
              detail: [`${cap(stayed)}, so ${s.the} changed.`, nowLine, wordBecause(A, right)],
              example: { label: `Now: ${bagText(s, after)}.`, groups: bagGroups(s, after), truths: [{ who: WORD_LABEL[w], value: false }, { who: WORD_LABEL[right], value: true }], note: `${cap(shareLine(s, A, after[ask], t1))}.` },
            };
    }
    const other = s.kinds[[0, 1, 2].find((i) => i !== ki && before[i] > 0)!];
    return done(
      'due',
      {
        kind: 'choose',
        prompt: `${cap(s.the)} has ${bagText(s, before)}. ${keptLine} Then ${name} draws again. Read the sentence: “${nextSays(s, A)}” Which word fits it now?`,
        scene: { kind: 'text', lines: [`At the start, in ${s.the}:`, ...before.flatMap((n, i) => (n > 0 ? [countOf(n, s.kinds[i])] : [])), `Kept out: ${Array.from({ length: k }, () => K.word).join(', ')}`] },
        choices: WORDS.map((w) => ({ id: w, label: WORD_LABEL[w] })),
        answer: right,
        explain: `${cap(stayed)}, so ${s.the} changed. ${nowLine} ${wordBecause(A, right)}`,
        feedback,
        hint: 'Count the bag again after the draws that stayed out. Here is a smaller case, checked for you.',
        hintCase: keptHint(s, K, other),
        teach: keptTeach(s, A, before, after, keptLine),
      },
      { t: 'kept', form, skin, before, after, ki, k, ask, names: [name] },
    );
  }
  // 'which': each kid draws 2 things, one at a time. The story says who keeps them out.
  const k = 2;
  const keep: KeptKeep = o.keep ?? (rng.chance(0.7) ? 'one' : 'none');
  let got: ReturnType<typeof keptBag> = null;
  for (let t = 0; t < 400 && !got; t++) got = keptBag(rng, ki, k, null, null);
  if (!got) throw new Error('keptItem: no bag');
  const { before, after, ask } = got;
  const A = s.kinds[ask];
  const who: KeptWho = keep === 'none' ? 'none' : rng.pick<KeptWho>(['first', 'second']);
  // Both kids draw kind ki when one keeps the draws out. When both put them back, they draw different kinds, so one
  // kid’s streak is the asked kind or not: each draw is still new.
  const present = [0, 1, 2].filter((i) => i !== ki && before[i] > 0);
  const drew: [number, number] = who === 'none' ? (rng.chance(0.5) ? [ki, rng.pick(present)] : [rng.pick(present), ki]) : [ki, ki];
  const more = rng.chance(0.5);
  const dir = more ? 'more' : 'less';
  // Each kid’s bag: the bag with the draws kept out for the kid who keeps them, the starting bag for a kid who puts them back.
  const kids = ([0, 1] as const).map((i) => {
    const id = i === 0 ? 'first' : 'second';
    const keeps = who === id;
    const bag = keeps ? after : before;
    return { id, name: names[i], keeps, kind: s.kinds[drew[i]], bag, total: totalOf(bag) };
  });
  const [x, y] = kids;
  // Compare the share of kind A in the two bags by cross-multiplying the counts.
  const cmp = x.bag[ask] * y.total - y.bag[ask] * x.total;
  const answer = cmp === 0 ? 'same' : (cmp > 0) === more ? 'first' : 'second';
  const winner = kids.find((d) => d.id === answer);
  const kept = kids.find((d) => d.keeps);
  const drawLine = (d: (typeof kids)[number]) => `${d.name} takes out 2 ${d.kind.many}, one at a time, and ${d.keeps ? 'keeps each one out' : 'puts each one back'}.`;
  const bags = kids.map((d) => (d.keeps ? `${d.name} kept 2 ${d.kind.many} out, so ${d.name}’s bag now has ${bagText(s, d.bag)}.` : `${d.name} put each one back, so ${d.name}’s bag still has ${bagText(s, d.bag)}.`));
  const shares = `In ${x.name}’s bag, ${shareLine(s, A, x.bag[ask], x.total)}. In ${y.name}’s bag, ${shareLine(s, A, y.bag[ask], y.total)}.`;
  const verdict = winner ? `So ${A.is} is ${dir} likely for ${winner.name}.` : `So ${A.is} is just as likely for both.`;
  const example: TeachCase = kept
    ? { label: `${kept.name}’s bag now: ${bagText(s, kept.bag)}.`, groups: bagGroups(s, kept.bag), truths: [{ who: `${cap(A.is)} is ${dir} likely for ${kept.name}`, value: answer === kept.id }], note: shares }
    : { label: `Each bag now: ${bagText(s, before)}.`, groups: bagGroups(s, before), truths: [{ who: 'The two bags are the same', value: true }], note: shares };
  const choices: Choice[] = [
    { id: 'first', label: `For ${x.name}.` },
    { id: 'second', label: `For ${y.name}.` },
    { id: 'same', label: 'It is the same for both of them.' },
  ];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const d of kids) {
    if (d.id === answer) continue;
    feedback[d.id] = !kept
      ? { headline: `Your answer picks ${d.name}, but every draw went back, so both bags are still the same.`, detail: ['Put back means the bag is the same after each draw.', ...bags, shares, verdict], example }
      : d.keeps
        ? { headline: `Your answer picks ${d.name}, but keeping 2 ${d.kind.many} out makes ${A.is} ${more ? 'less' : 'more'} likely for ${d.name}.`, detail: [...bags, shares, verdict], example }
        : { headline: `Your answer picks ${d.name}, but ${d.name}’s bag is the same as at the start.`, detail: [...bags, shares, verdict], example };
  }
  if (kept && answer !== 'same') feedback.same = { headline: `Your answer says nothing changed, but ${kept.name}’s bag lost 2 ${kept.kind.many}.`, detail: ['Kept out means they do not go back.', ...bags, shares, verdict], example };
  const other = s.kinds[present[0]];
  return done(
    'due',
    {
      kind: 'choose',
      prompt: `${x.name} and ${y.name} each have a bag with ${bagText(s, before)}. ${drawLine(x)} ${drawLine(y)} For whom is ${A.is} ${dir} likely on the next draw?`,
      scene: { kind: 'text', lines: [`Each bag at the start: ${bagText(s, before)}`, ...kids.map((d) => `${d.name}: ${d.kind.word}, ${d.kind.word}. ${d.keeps ? 'Each one kept out.' : 'Each one put back.'}`)] },
      choices: rng.shuffle(choices),
      answer,
      explain: `${bags.join(' ')} ${shares} ${verdict}`,
      feedback,
      hint: 'Ask: whose bag changed? Here is a smaller case, checked for you.',
      hintCase: keptHint(s, K, other),
      teach: {
        rule: KEPT_RULE,
        terms: KEPT_TERMS,
        meaning: `At the start, each bag has ${bagText(s, before)}. ${drawLine(x)} ${drawLine(y)}`,
        casesTitle: 'Each bag after the draws',
        cases: kids.map((d) => ({
          label: `${d.name}’s bag now: ${bagText(s, d.bag)}.`,
          groups: bagGroups(s, d.bag),
          truths: [{ who: 'The same bag as at the start', value: !d.keeps }],
          note: `${cap(shareLine(s, A, d.bag[ask], d.total))}.`,
        })),
        remember: KEPT_REMEMBER,
        simpler: KEPT_SIMPLER,
      },
    },
    { t: 'kept', form, skin, before, after, ki, k, ask, more, who, drew, names: [x.name, y.name] },
  );
}

// ---------- the bridge: a good guess is not a proof (Ways to Think) ----------

/** The stop page’s warm-up: a Ways to Think item on a guess that was not a proof (a streak broken, or a best guess ruled out). */
export function bridgeItem(rng: Rng): ChanceMade {
  const pick = rng.int(0, 2);
  if (pick === 0) {
    const m = breakItem(rng, rng.pick(skinsOf(rng.pick(FRAMES))), { form: 'proof' });
    return { tag: 'guess', item: m.item, model: { t: 'guess' } };
  }
  if (pick === 1) {
    const m = sureItem(rng, rng.pick(skinsOf(rng.pick(FRAMES))), { form: 'know' });
    return { tag: 'guess', item: m.item, model: { t: 'guess' } };
  }
  // Everyday and fantasy only: the abstract revise item names its grid’s check marks and crosses in its words.
  const m = reviseItem(rng, { skin: rng.pick<ExplainSkin>(['everyday', 'fantasy']) });
  return { tag: 'guess', item: m.item, model: { t: 'guess' } };
}

