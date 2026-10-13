/**
 * Stop 12 · Spot the Trick (side track, after All, Some, None). A trick (grown-ups say a fallacy) is a reason that
 * sounds good but does not prove its claim. Its claim may still be true: a trick only fails to prove it.
 *
 * The model: every trick is an argument (givens and a claim, as in Arguments) over a small set of cases. A case is one
 * way things could be: one value for each variable (did it rain? is the grass wet?). A case that breaks a given is
 * crossed out. The claim follows when it is true in every case left. A reason proves its claim when the claim follows,
 * no given is the claim said again (a given that means the same, by `means`), and no either-or given shuts out a case
 * that can really happen (a `door` given: every case is one that can happen). verdictOf() works the verdict out from
 * the cases, never by hand:
 *
 *  - flip family (Lesson 1): an if–then rule and one fact. Stop 6’s four moves: forward (mp) and flip and NOT (mt)
 *    prove the claim; the flip trick (ac, Stop 6’s trap-then) and the NOT trick (da, trap-not-if) do not;
 *  - middle family (Lesson 2): “All A are M. x is M. So x is A.” and “All A are M. All B are M. So all A are B.”;
 *  - swap family (Lesson 2): “Every kid has a favorite game. So one game is every kid’s favorite.”;
 *  - circle family (Lesson 3): a given that is the claim in new words;
 *  - doors family (Lesson 3): “Every kid plays soccer or swims” when some kids ride bikes (a false either-or);
 *  - hasty family (Lesson 4): a few checked, a claim about all;
 *  - popular family (Lesson 4): most people say it, so it is true;
 *  - person, twist and authority families (Lesson 5): a reason about the wrong thing. Attacking the person (the one who
 *    made the claim), the twisted claim (a claim nobody made, knocked down) and the famous name (a famous person on a
 *    subject they do not know). The reason is true in the story and crosses out no case, so it leaves the claim free;
 *  - slope family (Lesson 6): the slippery slope, steps from a first one to a far-off end with no rule for any step;
 *  - after family (Lesson 6): after-therefore-because, one thing came right after another, so it caused it.
 *
 * Each trick is a shape with what its reason leaves out (`Arg.leaves`, and `LEAVES_OUT` by trick): the claim’s own facts,
 * the claim really made, what the famous person knows, a rule for each step, a reason the first thing caused the
 * second. Adding what it leaves out turns the trick into its good twin: a fact about the claim and its rule, the rule
 * for each step (a chain), or a rule that nothing else can cause it.
 *
 * Every family also has good reasons (twins that prove their claim), so no answer can be guessed from the family. Every
 * pack’s trap is a trick whose claim happens to be true (tag `true-trick`): the claim being true is not the reason
 * proving it. Every answer, explanation, wrong-choice feedback, hint case and board mark is worked out here.
 */
import { syncWhyWrong } from '../teach';
import type { ArgumentCase, Choice, ChoiceFeedback, ChooseItem, ConfusedQuestion, DrillOption, DrillRow, DrillStep, Rng, Scene, Teach, TeachCase } from '../types';
import { MOVE_FACT, MOVE_TAGS, type Lit, type Move } from './conditionals';

// ---------- the model ----------

export type Skin = 'everyday' | 'fantasy' | 'abstract';
export const SKINS: readonly Skin[] = ['everyday', 'fantasy', 'abstract'];
export type Family = 'flip' | 'middle' | 'swap' | 'circle' | 'doors' | 'hasty' | 'popular' | 'person' | 'twist' | 'authority' | 'slope' | 'after';
export const FAMILIES: readonly Family[] = ['flip', 'middle', 'swap', 'circle', 'doors', 'hasty', 'popular', 'person', 'twist', 'authority', 'slope', 'after'];
/** The thirteen tricks. flip and not are Stop 6’s trap moves; dilemma is the doors family’s trick. */
export type TrickKind = 'flip' | 'not' | 'middle' | 'swap' | 'circle' | 'dilemma' | 'hasty' | 'popular' | 'person' | 'twist' | 'authority' | 'slope' | 'after';
export const TRICK_KINDS: readonly TrickKind[] = ['flip', 'not', 'middle', 'swap', 'circle', 'dilemma', 'hasty', 'popular', 'person', 'twist', 'authority', 'slope', 'after'];
export type Verdict = 'proves' | TrickKind;
export type Status = 'must' | 'might' | 'cant';

/** The lesson that teaches each family, and its skill tag (s12.<tag>). */
export const FAMILY_LESSON: Record<Family, string> = {
  flip: 's12.l1',
  middle: 's12.l2',
  swap: 's12.l2',
  circle: 's12.l3',
  doors: 's12.l3',
  hasty: 's12.l4',
  popular: 's12.l4',
  person: 's12.l5',
  twist: 's12.l5',
  authority: 's12.l5',
  slope: 's12.l6',
  after: 's12.l6',
};
export const FAMILY_SKILL: Record<Family, string> = {
  flip: 'flip',
  middle: 'middle',
  swap: 'swap',
  circle: 'circle',
  doors: 'dilemma',
  hasty: 'hasty',
  popular: 'popular',
  person: 'person',
  twist: 'twist',
  authority: 'authority',
  slope: 'slope',
  after: 'after',
};
/** The tricks each lesson names (two, or three in Lesson 5). */
export const LESSON_TRICKS: Record<string, readonly TrickKind[]> = {
  's12.l1': ['flip', 'not'],
  's12.l2': ['middle', 'swap'],
  's12.l3': ['circle', 'dilemma'],
  's12.l4': ['hasty', 'popular'],
  's12.l5': ['person', 'twist', 'authority'],
  's12.l6': ['slope', 'after'],
};
export const LESSON_FAMILIES: Record<string, readonly Family[]> = {
  's12.l1': ['flip'],
  's12.l2': ['middle', 'swap'],
  's12.l3': ['circle', 'doors'],
  's12.l4': ['hasty', 'popular'],
  's12.l5': ['person', 'twist', 'authority'],
  's12.l6': ['slope', 'after'],
};
export const KIND_FAMILY: Record<TrickKind, Family> = {
  flip: 'flip',
  not: 'flip',
  middle: 'middle',
  swap: 'swap',
  circle: 'circle',
  dilemma: 'doors',
  hasty: 'hasty',
  popular: 'popular',
  person: 'person',
  twist: 'twist',
  authority: 'authority',
  slope: 'slope',
  after: 'after',
};

/** One value a variable can take, as a sentence: “It rained.” */
export interface Value {
  id: string;
  text: string;
}
/** One thing a case decides, with every value it can take. */
export interface Var {
  id: string;
  values: readonly Value[];
}
/** A case: one value for each variable, by variable id. */
export type Case = Readonly<Record<string, string>>;

/** A given or a claim: its words, and whether it is true in a case. */
export interface Line {
  text: string;
  holds: (c: Case) => boolean;
  /** What it means, when two lines can mean the same thing in new words (a circle: the given means the claim). */
  means?: string;
  /** An either-or given: it says only some cases can happen. False when it crosses out a case that can really happen. */
  door?: true;
}

export type FlipShape = Move;
export type Shape =
  | FlipShape
  | 'one'
  | 'one-good'
  | 'two'
  | 'swap'
  | 'swap-good'
  | 'circle'
  | 'circle-good'
  | 'doors'
  | 'doors-good'
  | 'few'
  | 'all-checked'
  | 'popular'
  | 'vote'
  | 'person'
  | 'person-good'
  | 'twist'
  | 'twist-good'
  | 'authority'
  | 'authority-good'
  | 'slope'
  | 'chain'
  | 'after'
  | 'only';

/** An argument: a topic in a shape, with its cases. */
export interface Arg {
  /** `<topic>:<shape>`. */
  id: string;
  topic: string;
  family: Family;
  shape: Shape;
  skin: Skin;
  /** The question’s first line. Unique to the topic. */
  setting: string;
  /** Who gives the reason: “Kai”, “The knight”. */
  speaker: string;
  vars: readonly Var[];
  givens: readonly Line[];
  claim: Line;
  /** The claim in the middle of a sentence, with no end mark: “the bell rang”. */
  claimMid: string;
  /** A line under a case that can happen in a surprising way (“A sprinkler wet the grass.”), by case. */
  note?: (c: Case) => string | undefined;
  /** A trap can use this topic: undefined for a story (“Later, you find out…”), true for a claim that is really true. */
  truth?: boolean;
  /** Flip family: Stop 6’s move. */
  move?: Move;
  /** A line that pictures the case’s thing (“Each case is about one bee, called Buzz.”). */
  picture?: string;
  /** Everybody says: what would really settle the claim (a fact to check, never a count of people). */
  settle?: string;
  /** The twisted claim: how the speaker retells the claim before answering it. The question says it before the reason. */
  retell?: string;
  /**
   * Lessons 5 and 6: what this trick’s reason leaves out, in a few words (“anything about the pool”, “a reason for each
   * step”). Its good twin adds it, and then the givens force the claim.
   */
  leaves?: string;
}

/** Every case, in order: the first variable changes slowest. */
export function allCases(arg: Pick<Arg, 'vars'>): Case[] {
  let out: Record<string, string>[] = [{}];
  for (const v of arg.vars) out = out.flatMap((c) => v.values.map((x) => ({ ...c, [v.id]: x.id })));
  return out;
}
export const sameCase = (a: Case, b: Case) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);
export const caseIndex = (arg: Arg, c: Case) => allCases(arg).findIndex((x) => sameCase(x, c));
/** The first given a case breaks (its index), or -1 when the case is left. */
export const breaks = (arg: Arg, c: Case) => arg.givens.findIndex((g) => !g.holds(c));
export const casesLeft = (arg: Arg) => allCases(arg).filter((c) => breaks(arg, c) < 0);
export const claimIn = (arg: Arg, c: Case) => arg.claim.holds(c);

/** Must, might or can’t, from the cases left. */
export function statusOf(arg: Arg): Status {
  const left = casesLeft(arg);
  if (!left.length) throw new Error(`statusOf: no case is left (${arg.id})`);
  const t = left.filter((c) => claimIn(arg, c)).length;
  return t === left.length ? 'must' : t === 0 ? 'cant' : 'might';
}
export const followsOf = (arg: Arg) => statusOf(arg) === 'must';
/** A given that is the claim said again (it means the same), or -1. */
export const circularGiven = (arg: Arg) => arg.givens.findIndex((g) => g.means !== undefined && g.means === arg.claim.means);
/** The cases an either-or given crosses out, though they can really happen (every case of the model can). */
export const falseDoors = (arg: Arg) => allCases(arg).filter((c) => arg.givens.some((g) => g.door && !g.holds(c)));
/** The first case left where the claim is false: the case that shows the claim does not follow. */
export const leakCase = (arg: Arg) => casesLeft(arg).find((c) => !claimIn(arg, c));

/** The trick a family plays when its claim does not follow. The flip family’s comes from Stop 6’s move. */
function shapeTrick(arg: Arg): TrickKind {
  switch (arg.family) {
    case 'flip':
      // The THEN part as the fact is Stop 6’s trap-then (the flip trick); NOT the IF part is trap-not-if.
      if (!arg.move) throw new Error(`shapeTrick: ${arg.id} has no move`);
      return MOVE_TAGS[arg.move] === 'trap-then' ? 'flip' : MOVE_TAGS[arg.move] === 'trap-not-if' ? 'not' : (() => { throw new Error(`shapeTrick: ${arg.id} follows`); })();
    case 'doors':
    case 'circle':
      throw new Error(`shapeTrick: a ${arg.family} argument always follows (${arg.id})`);
    default:
      return arg.family;
  }
}

/**
 * Proves, or which trick: the claim must follow (else the family’s shape trick), no given may be the claim said again
 * (else going in circles), and no either-or may shut out a case that can happen (else only two doors).
 */
export function verdictOf(arg: Arg): Verdict {
  const s = statusOf(arg);
  if (s === 'cant') throw new Error(`verdictOf: ${arg.id} has a claim the givens make false`);
  if (s === 'might') return shapeTrick(arg);
  if (circularGiven(arg) >= 0) return 'circle';
  if (falseDoors(arg).length) return 'dilemma';
  return 'proves';
}
export const provesOf = (arg: Arg) => verdictOf(arg) === 'proves';

// ---------- words ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** Words that start a sentence and go lower case in the middle of one. Names keep their capital. */
export const LOWER_STARTS = new Set([
  'The', 'This', 'It', 'A', 'An', 'All', 'Every', 'No', 'Most', 'One', 'Each', 'Both', 'If', 'Smoke', 'Recess', 'Some', 'Seven', 'Bats', 'At', 'Scientists', 'Pizza', 'Lightning',
  'Other', 'School', 'Washing', 'Clouds', 'Dust', 'Sunlight', 'Cold', 'Something',
]);
/** A sentence in the middle of another, with no end mark: “The bell rang.” -> “the bell rang”. */
export function mid(text: string): string {
  const s = text.replace(/[.!?]$/, '');
  const first = s.split(' ')[0];
  return LOWER_STARTS.has(first) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
const quote = (s: string) => `“${s}”`;
const listAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export const valueOf = (v: Var, c: Case) => v.values.find((x) => x.id === c[v.id])!;
/** What is true in a case, one sentence per variable. */
export const caseFacts = (arg: Arg, c: Case) => arg.vars.map((v) => valueOf(v, c).text);
/** The same, inside a sentence: “it did not rain, and the grass is wet”. */
export const caseMid = (arg: Arg, c: Case) => caseFacts(arg, c).map(mid).join(', and ');
export const caseName = (arg: Arg, c: Case) => `Case ${caseIndex(arg, c) + 1}`;

/** Why a given is true or broken in a case. */
export function givenWhy(arg: Arg, i: number, c: Case): string {
  const g = arg.givens[i];
  const n = i + 1;
  return g.holds(c) ? `Given ${n} is true here.` : `${cap(caseMid(arg, c))}. That breaks given ${n}.`;
}

/** One case as a card: its facts, each given and the claim true or false, and what happens to it. */
export function caseCard(arg: Arg, c: Case): TeachCase {
  const gi = breaks(arg, c);
  const t = claimIn(arg, c);
  const extra = arg.note?.(c);
  const door = gi >= 0 && arg.givens[gi].door;
  return {
    label: `${caseName(arg, c)}: ${caseFacts(arg, c).join(' ')}`,
    truths: [...arg.givens.map((g, i) => ({ who: `Given ${i + 1}`, value: g.holds(c) })), { who: 'The claim', value: t }],
    note:
      gi >= 0
        ? door
          ? `It breaks given ${gi + 1}. But this case can really happen, so given ${gi + 1} is false.`
          : `It breaks given ${gi + 1}, so cross it out.`
        : `It breaks no given, so it is left. The claim is ${t ? 'true' : 'false'} here.${extra ? ` ${extra}` : ''}`,
  };
}

/** “Only case 1 is left.” / “Cases 1 and 3 are left.” */
export function leftIntro(arg: Arg): string {
  const nums = casesLeft(arg).map((c) => String(caseIndex(arg, c) + 1));
  return nums.length === 1 ? `Only case ${nums[0]} is left.` : `Cases ${listAnd(nums)} are left.`;
}

/** The reason for must or might, from the cases left. words: say what each case is. */
export function statusReason(arg: Arg, words = true): string {
  const left = casesLeft(arg);
  const yes = left.find((c) => claimIn(arg, c));
  const no = left.find((c) => !claimIn(arg, c));
  const n = (c: Case) => caseIndex(arg, c) + 1;
  const s = statusOf(arg);
  if (s === 'might') {
    return words
      ? `${leftIntro(arg)} In case ${n(yes!)}, ${caseMid(arg, yes!)}, so the claim is true. In case ${n(no!)}, ${caseMid(arg, no!)}, so the claim is false.`
      : `${leftIntro(arg)} The claim is true in case ${n(yes!)}, but false in case ${n(no!)}.`;
  }
  const t = s === 'must' ? 'true' : 'false';
  if (left.length === 1) return words ? `Only case ${n(left[0])} is left: ${caseMid(arg, left[0])}. The claim is ${t} there.` : `${leftIntro(arg)} The claim is ${t} there.`;
  return `${leftIntro(arg)} The claim is ${t} in each one.`;
}

/** An argument as a picture: its givens, its claim, and (cases) every case box, blank or marked. */
export function argScene(arg: Arg, o: { cases?: 'blank' | 'marked'; real?: boolean; caption?: string } = {}): Extract<Scene, { kind: 'argument' }> {
  const scene: Extract<Scene, { kind: 'argument' }> = { kind: 'argument', givens: arg.givens.map((g) => g.text), claim: arg.claim.text };
  if (o.real) {
    scene.real = arg.givens.map((_, i) => realGiven(arg, i));
    scene.realClaim = true;
  }
  if (o.cases) {
    scene.cases = allCases(arg).map((c): ArgumentCase => {
      const box: ArgumentCase = { name: caseName(arg, c), facts: caseFacts(arg, c) };
      if (o.cases === 'marked') {
        const gi = breaks(arg, c);
        if (gi >= 0) box.out = gi + 1;
        else box.claim = claimIn(arg, c);
      }
      return box;
    });
  }
  const caption = [arg.picture, o.caption].filter(Boolean).join(' ');
  if (caption) scene.caption = caption;
  return scene;
}

/**
 * Is a given really true, in a trap (a story where the claim turns out true)? An either-or is false when it shuts out a
 * case that can really happen; every other given is true in the case the story ends on.
 */
export function realGiven(arg: Arg, i: number): boolean {
  const g = arg.givens[i];
  if (g.door) return !falseDoors(arg).length;
  const real = realCase(arg);
  return g.holds(real);
}
/**
 * The case a trap’s story ends on: a case left where the claim is true (for a doors trap, the case its claim names).
 * Never a crossed-out case: the givens the story tells are true there.
 */
export function realCase(arg: Arg): Case {
  const c = casesLeft(arg).find((x) => claimIn(arg, x));
  if (!c) throw new Error(`realCase: ${arg.id} has no case left with the claim true`);
  return c;
}

// ---------- topics ----------

/** A sentence and its NOT: [yes, no]. */
type Pair = readonly [string, string];
const yesNo = (id: string, [yes, no]: Pair): Var => ({ id, values: [{ id: 'yes', text: yes }, { id: 'no', text: no }] });
const line = (text: string, holds: (c: Case) => boolean, extra: Partial<Line> = {}): Line => ({ text, holds, ...extra });
const isYes = (c: Case, v: string) => c[v] === 'yes';

/** Lesson 1: an if–then rule, always true here, and its two parts with their NOTs. */
export interface FlipTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  rule: string;
  p: Pair;
  q: Pair;
  /** How the THEN part can happen with no IF part (the case that shows the flip trick). */
  other: string;
}
const flipT = (id: string, skin: Skin, speaker: string, setting: string, rule: string, p: Pair, q: Pair, other: string): FlipTopic => ({ id, skin, speaker, setting, rule, p, q, other });

export const FLIP_TOPICS: readonly FlipTopic[] = [
  flipT('bell', 'everyday', 'Kai', 'Kai is at school.', 'If the bell rings, recess is over.', ['The bell rang.', 'The bell did not ring.'], ['Recess is over.', 'Recess is not over.'], 'Rain started, so the teacher ended recess early.'),
  flipT('doorbell', 'everyday', 'Rosa', 'Rosa hears her dog, Rex.', 'If the doorbell rings, Rex barks.', ['The doorbell rang.', 'The doorbell did not ring.'], ['Rex is barking.', 'Rex is not barking.'], 'Rex saw a squirrel and barked at it.'),
  flipT('oven', 'everyday', 'Omar', 'Omar walks into the kitchen.', 'If the oven is on, the kitchen is warm.', ['The oven is on.', 'The oven is off.'], ['The kitchen is warm.', 'The kitchen is cool.'], 'The sun is shining in the window.'),
  flipT('helmet', 'everyday', 'Leo’s sister', 'Leo’s mom has a rule for his bike.', 'If Leo rides his bike, he wears his helmet.', ['Leo rode his bike.', 'Leo did not ride his bike.'], ['Leo is wearing his helmet.', 'Leo is not wearing his helmet.'], 'Leo wore his helmet to ride his scooter.'),
  flipT('smoke', 'fantasy', 'The knight', 'The knight watches Blaze the dragon.', 'If Blaze is angry, smoke comes out of his nose.', ['Blaze is angry.', 'Blaze is not angry.'], ['Smoke is coming out of Blaze’s nose.', 'No smoke is coming out of Blaze’s nose.'], 'Blaze has a cold, and he just sneezed.'),
  flipT('wand', 'fantasy', 'Tia', 'Tia visits Zed the wizard.', 'If Zed waves his wand, the lights turn blue.', ['Zed waved his wand.', 'Zed did not wave his wand.'], ['The lights turned blue.', 'The lights did not turn blue.'], 'A blue spell from the next room hit the lights.'),
  flipT('troll', 'fantasy', 'The goat', 'A goat walks up to the old bridge.', 'If the troll is asleep, the bridge is quiet.', ['The troll is asleep.', 'The troll is awake.'], ['The bridge is quiet.', 'The bridge is noisy.'], 'The troll is awake, but he went out for lunch.'),
  flipT('potion', 'fantasy', 'An elf', 'Nia finds a green potion.', 'If Nia drinks the green potion, she shrinks.', ['Nia drank the green potion.', 'Nia did not drink the green potion.'], ['Nia shrank.', 'Nia did not shrink.'], 'Nia ate a shrinking berry instead.'),
  flipT('cards', 'abstract', 'Max', 'Max sorts a deck of shape cards.', 'If a card is red, it has a star.', ['This card is red.', 'This card is not red.'], ['This card has a star.', 'This card has no star.'], 'Blue cards can have stars too.'),
  flipT('corners', 'abstract', 'Ivy', 'Ivy draws a shape.', 'If a shape is a square, it has four corners.', ['The shape is a square.', 'The shape is not a square.'], ['The shape has four corners.', 'The shape does not have four corners.'], 'A long rectangle has four corners too.'),
  flipT('tiles', 'abstract', 'Gus', 'Gus plays a letter game.', 'If a tile has a vowel, it is gold.', ['This tile has a vowel.', 'This tile has no vowel.'], ['This tile is gold.', 'This tile is not gold.'], 'Some tiles with a K are gold too.'),
];
/** The worked example (cards and boards only, never a quiz): the rain and the grass. */
export const W_RAIN = flipT('w-rain', 'everyday', 'Ben', 'Ben looks out at the park.', 'If it rains, the grass gets wet.', ['It rained.', 'It did not rain.'], ['The grass is wet.', 'The grass is dry.'], 'A sprinkler wet the grass.');

/** Stop 6’s four moves: the fact (MOVE_FACT, from conditionals.ts) and the claim each one makes about the other part. */
export const MOVE_CLAIM: Record<Move, Lit> = { mp: 'Q', mt: 'notP', ac: 'P', da: 'notQ' };
const litLine = (t: FlipTopic, l: Lit): Line => {
  const [v, yes] = l === 'P' ? ['p', true] : l === 'notP' ? ['p', false] : l === 'Q' ? ['q', true] : ['q', false];
  const pair = v === 'p' ? t.p : t.q;
  return line(yes ? pair[0] : pair[1], (c) => isYes(c, v) === yes);
};

export function flipArg(t: FlipTopic, move: Move): Arg {
  const fact = litLine(t, MOVE_FACT[move]);
  const claim = litLine(t, MOVE_CLAIM[move]);
  return {
    id: `${t.id}:${move}`,
    topic: t.id,
    family: 'flip',
    shape: move,
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [yesNo('p', t.p), yesNo('q', t.q)],
    givens: [line(t.rule, (c) => !isYes(c, 'p') || isYes(c, 'q')), fact],
    claim,
    claimMid: mid(claim.text),
    note: (c) => (!isYes(c, 'p') && isYes(c, 'q') ? `How? ${t.other}` : undefined),
    move,
  };
}

/** Lesson 2: “All A are M. x is M. So x is A.” (one) and its good twin “All A are M. x is A. So x is M.” */
export interface MiddleOneTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  all: string;
  /** x is A, or not. */
  a: Pair;
  /** x is in the middle group, or not. */
  m: Pair;
  /** How x can be in the middle group and not be an A. */
  other: string;
  truth?: boolean;
}
const oneT = (id: string, skin: Skin, speaker: string, setting: string, all: string, a: Pair, m: Pair, other: string, truth?: boolean): MiddleOneTopic => ({ id, skin, speaker, setting, all, a, m, other, ...(truth !== undefined ? { truth } : {}) });

export const MIDDLE_ONE: readonly MiddleOneTopic[] = [
  oneT('room5', 'everyday', 'Leo', 'Leo talks about library day.', 'All kids in Room 5 have a library card.', ['Mia is in Room 5.', 'Mia is not in Room 5.'], ['Mia has a library card.', 'Mia does not have a library card.'], 'Mia could be in Room 6. Kids there have cards too.'),
  oneT('hawks', 'everyday', 'Sam', 'Sam watches a soccer game.', 'All players on the Hawks wear green.', ['Jay is on the Hawks.', 'Jay is not on the Hawks.'], ['Jay wears green.', 'Jay does not wear green.'], 'Jay could be a fan in a green shirt.'),
  oneT('apple', 'everyday', 'Ana', 'Ana finds a fruit in the bowl.', 'All apples grow on trees.', ['This fruit is an apple.', 'This fruit is not an apple.'], ['This fruit grows on a tree.', 'This fruit does not grow on a tree.'], 'It could be a pear. Pears grow on trees too.'),
  oneT('fire', 'fantasy', 'The knight', 'The knight meets Zog in the hills.', 'All dragons breathe fire.', ['Zog is a dragon.', 'Zog is not a dragon.'], ['Zog breathes fire.', 'Zog does not breathe fire.'], 'Zog could be a fire lizard.'),
  oneT('lumo', 'fantasy', 'The elf', 'An elf meets Lumo in the woods.', 'All wizards carry a wand.', ['Lumo is a wizard.', 'Lumo is not a wizard.'], ['Lumo carries a wand.', 'Lumo does not carry a wand.'], 'Lumo could be a fairy with a wand.'),
  oneT('zib', 'abstract', 'Pim', 'Pim uses made-up words.', 'All zibs are blue.', ['Mo is a zib.', 'Mo is not a zib.'], ['Mo is blue.', 'Mo is not blue.'], 'Mo could be a blue wug.'),
  oneT('square', 'abstract', 'Ivy', 'Ivy holds up a shape card.', 'All squares have four sides.', ['This shape is a square.', 'This shape is not a square.'], ['This shape has four sides.', 'This shape does not have four sides.'], 'It could be a long rectangle. That has four sides too.'),
];
/** The worked example: the bee and the insects. */
export const W_BEE = oneT('w-bee', 'everyday', 'Kim', 'Kim finds a bug in the garden.', 'All bees are insects.', ['Buzz is a bee.', 'Buzz is not a bee.'], ['Buzz is an insect.', 'Buzz is not an insect.'], 'Buzz could be an ant. An ant is an insect too.');

export function oneArg(t: MiddleOneTopic, good = false): Arg {
  const all = line(t.all, (c) => !isYes(c, 'a') || isYes(c, 'm'));
  const [given, claim] = good ? [line(t.a[0], (c) => isYes(c, 'a')), line(t.m[0], (c) => isYes(c, 'm'))] : [line(t.m[0], (c) => isYes(c, 'm')), line(t.a[0], (c) => isYes(c, 'a'))];
  return {
    id: `${t.id}:${good ? 'one-good' : 'one'}`,
    topic: t.id,
    family: 'middle',
    shape: good ? 'one-good' : 'one',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [yesNo('a', t.a), yesNo('m', t.m)],
    givens: [all, given],
    claim,
    claimMid: mid(claim.text),
    note: (c) => (!isYes(c, 'a') && isYes(c, 'm') ? `How? ${t.other}` : undefined),
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
}

/** Lesson 2: “All A are M. All B are M. So all A are B.”: two groups share a middle group. Each case pictures one A. */
export interface MiddleTwoTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  allA: string;
  allB: string;
  claim: string;
  /** “Each case is about one cat, called Tom.” */
  picture: string;
  /** The one A is in the middle group, or not. */
  m: Pair;
  /** The one A is a B, or not. */
  b: Pair;
  other: string;
  /** The same shape with one word changed, so its claim is false (for a trap whose claim is really true). */
  twin?: string;
  truth?: boolean;
}
const twoT = (o: MiddleTwoTopic): MiddleTwoTopic => o;

export const MIDDLE_TWO: readonly MiddleTwoTopic[] = [
  twoT({ id: 'catpets', skin: 'everyday', speaker: 'Rosa', setting: 'Rosa talks about animals.', allA: 'All cats are animals.', allB: 'All pets are animals.', claim: 'All cats are pets.', picture: 'Each case is about one cat, called Tom.', m: ['Tom is an animal.', 'Tom is not an animal.'], b: ['Tom is a pet.', 'Tom is not a pet.'], other: 'Tom could be a farm cat that is nobody’s pet.', truth: false }),
  twoT({ id: 'clubs', skin: 'everyday', speaker: 'Kai', setting: 'Kai talks about the clubs at his school.', allA: 'All kids in the choir stay after school.', allB: 'All kids in the chess club stay after school.', claim: 'All kids in the choir are in the chess club.', picture: 'Each case is about one kid in the choir, called Sam.', m: ['Sam stays after school.', 'Sam does not stay after school.'], b: ['Sam is in the chess club.', 'Sam is not in the chess club.'], other: 'Sam could stay for art club, not chess club.' }),
  twoT({ id: 'wings', skin: 'fantasy', speaker: 'The knight', setting: 'The knight looks up at the sky.', allA: 'All dragons have wings.', allB: 'All bats have wings.', claim: 'All dragons are bats.', picture: 'Each case is about one dragon, called Zog.', m: ['Zog has wings.', 'Zog does not have wings.'], b: ['Zog is a bat.', 'Zog is not a bat.'], other: 'Zog can have wings and not be a bat.', truth: false }),
  twoT({ id: 'hats', skin: 'fantasy', speaker: 'The elf', setting: 'An elf visits the castle.', allA: 'All wizards wear tall hats.', allB: 'All cooks wear tall hats.', claim: 'All wizards are cooks.', picture: 'Each case is about one wizard, called Lumo.', m: ['Lumo wears a tall hat.', 'Lumo does not wear a tall hat.'], b: ['Lumo is a cook.', 'Lumo is not a cook.'], other: 'Lumo can wear a tall hat and never cook.', truth: false }),
  twoT({ id: 'tobs', skin: 'abstract', speaker: 'Pim', setting: 'Pim tells you about tobs and neps.', allA: 'All tobs are green.', allB: 'All neps are green.', claim: 'All tobs are neps.', picture: 'Each case is about one tob, called Bix.', m: ['Bix is green.', 'Bix is not green.'], b: ['Bix is a nep.', 'Bix is not a nep.'], other: 'Bix can be green and not be a nep.', truth: false }),
  twoT({ id: 'squares', skin: 'abstract', speaker: 'Ivy', setting: 'Ivy talks about shapes.', allA: 'All squares have straight sides.', allB: 'All rectangles have straight sides.', claim: 'All squares are rectangles.', picture: 'Each case is about one square, called Shape A.', m: ['Shape A has straight sides.', 'Shape A does not have straight sides.'], b: ['Shape A is a rectangle.', 'Shape A is not a rectangle.'], other: 'The givens alone allow it.', twin: 'All squares have straight sides. All triangles have straight sides. So all squares are triangles.', truth: true }),
  twoT({ id: 'roses', skin: 'everyday', speaker: 'Ana', setting: 'Ana walks through the garden.', allA: 'All roses are plants.', allB: 'All flowers are plants.', claim: 'All roses are flowers.', picture: 'Each case is about one rose.', m: ['The rose is a plant.', 'The rose is not a plant.'], b: ['The rose is a flower.', 'The rose is not a flower.'], other: 'The givens alone allow it.', twin: 'All roses are plants. All trees are plants. So all roses are trees.', truth: true }),
];
/** The worked two-group example: bees and ants. */
export const W_BEE_ANT = twoT({ id: 'w-bee-ant', skin: 'everyday', speaker: 'Kim', setting: 'Kim talks about bugs.', allA: 'All bees are insects.', allB: 'All ants are insects.', claim: 'All bees are ants.', picture: 'Each case is about one bee, called Buzz.', m: ['Buzz is an insect.', 'Buzz is not an insect.'], b: ['Buzz is an ant.', 'Buzz is not an ant.'], other: 'Buzz is an insect, and Buzz is a bee, not an ant.', truth: false });

export function twoArg(t: MiddleTwoTopic): Arg {
  return {
    id: `${t.id}:two`,
    topic: t.id,
    family: 'middle',
    shape: 'two',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [yesNo('m', t.m), yesNo('b', t.b)],
    // The one A is an A, so “All A are M” says it is in the middle group; “All B are M” says a B in it is in the middle group.
    givens: [line(t.allA, (c) => isYes(c, 'm')), line(t.allB, (c) => !isYes(c, 'b') || isYes(c, 'm'))],
    claim: line(t.claim, (c) => isYes(c, 'b')),
    claimMid: mid(t.claim),
    picture: t.picture,
    note: (c) => (isYes(c, 'm') && !isYes(c, 'b') ? `How? ${t.other}` : undefined),
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
}

/** Lesson 2: “Every kid has a favorite game” is not “One game is every kid’s favorite.” Two kids, two games. */
export interface SwapTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  /** The two who each pick one (kids, doors, boxes). */
  slots: readonly [string, string];
  /** The two things they pick from. */
  picks: readonly [string, string];
  each: string;
  one: string;
  /** “Ava’s favorite game is tag.” */
  pick: (slot: string, item: string) => string;
  /** The good twin’s given: “Tag is every kid’s favorite game.” */
  all: (item: string) => string;
}

export const SWAP_TOPICS: readonly SwapTopic[] = [
  { id: 'club', skin: 'everyday', speaker: 'Ivy', setting: 'Omar and Tess are in a game club.', slots: ['Omar', 'Tess'], picks: ['soccer', 'checkers'], each: 'Every kid in the club has a favorite game.', one: 'One game is the favorite of every kid in the club.', pick: (s, i) => `${s}’s favorite game is ${i}.`, all: (i) => `${cap(i)} is the favorite of every kid in the club.` },
  { id: 'bus', skin: 'everyday', speaker: 'Kai', setting: 'Mia and Leo ride the bus to school.', slots: ['Mia', 'Leo'], picks: ['3', '7'], each: 'Every kid rides a bus to school.', one: 'One bus takes every kid to school.', pick: (s, i) => `${s} rides Bus ${i}.`, all: (i) => `Bus ${i} takes every kid to school.` },
  { id: 'captain', skin: 'everyday', speaker: 'The coach', setting: 'The coach talks about two teams, the Hawks and the Owls.', slots: ['Hawks', 'Owls'], picks: ['Ana', 'Gus'], each: 'Every team has a captain.', one: 'One kid is the captain of every team.', pick: (s, i) => `${i} is the captain of the ${s}.`, all: (i) => `${i} is the captain of every team.` },
  { id: 'keys', skin: 'fantasy', speaker: 'The knight', setting: 'The knight finds two doors in the castle.', slots: ['red door', 'blue door'], picks: ['gold key', 'silver key'], each: 'Every door in the castle opens with a key.', one: 'One key opens every door in the castle.', pick: (s, i) => `The ${s} opens with the ${i}.`, all: (i) => `The ${i} opens every door in the castle.` },
  { id: 'caves', skin: 'fantasy', speaker: 'An elf', setting: 'Two dragons, Zog and Puff, live in the hills.', slots: ['Zog', 'Puff'], picks: ['the north cave', 'the south cave'], each: 'Every dragon sleeps in a cave.', one: 'One cave is where every dragon sleeps.', pick: (s, i) => `${s} sleeps in ${i}.`, all: (i) => `Every dragon sleeps in ${i}.` },
  { id: 'boxes', skin: 'abstract', speaker: 'Max', setting: 'Max looks at Box 1 and Box 2.', slots: ['Box 1', 'Box 2'], picks: ['a red ball', 'a blue ball'], each: 'Every box holds a ball.', one: 'Every box holds the same color ball.', pick: (s, i) => `${s} holds ${i}.`, all: (i) => `Every box holds ${i}.` },
];
/** The worked example (cards and boards): Ava, Ben, tag and chess, in a class. */
export const W_SWAP: SwapTopic = { id: 'w-swap', skin: 'everyday', speaker: 'Ivy', setting: 'Ava and Ben are in Ms. Lee’s class.', slots: ['Ava', 'Ben'], picks: ['tag', 'chess'], each: 'Every kid has a favorite game.', one: 'One game is every kid’s favorite.', pick: (s, i) => `${s}’s favorite game is ${i}.`, all: (i) => `${cap(i)} is every kid’s favorite game.` };

export function swapArg(t: SwapTopic, good = false): Arg {
  const vars: Var[] = t.slots.map((s, k) => ({ id: `s${k}`, values: t.picks.map((p, j) => ({ id: `i${j}`, text: t.pick(s, p) })) }));
  const [first] = t.picks;
  const givens = good ? [line(t.all(first), (c) => c.s0 === 'i0' && c.s1 === 'i0')] : [line(t.each, () => true)];
  const claim = good ? line(t.pick(t.slots[0], first), (c) => c.s0 === 'i0') : line(t.one, (c) => c.s0 === c.s1);
  return {
    id: `${t.id}:${good ? 'swap-good' : 'swap'}`,
    topic: t.id,
    family: 'swap',
    shape: good ? 'swap-good' : 'swap',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars,
    givens,
    claim,
    claimMid: mid(claim.text),
  };
}

/** Lesson 3: a claim, two ways to say it again (a circle), two new reasons, and a good twin (a rule and a fact). */
export interface CircleTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  claim: Pair;
  /** The claim in new words: it means the same thing. */
  again: readonly [string, string];
  /** Reasons that say something new, that you could check on their own. */
  news: readonly [string, string];
  /** The good twin: an if–then rule and a fact that force the claim. */
  rule: string;
  fact: Pair;
  truth?: boolean;
}
export const CIRCLE_TOPICS: readonly CircleTopic[] = [
  { id: 'speller', skin: 'everyday', speaker: 'Ivy', setting: 'Ivy talks about the kids in her class.', claim: ['Kim is the best speller in our class.', 'Kim is not the best speller in our class.'], again: ['No kid in our class spells better than Kim.', 'Kim spells better than every other kid in our class.'], news: ['Kim won the class spelling bee.', 'Kim got every word right on the spelling test.'], rule: 'If a kid wins the class spelling bee, that kid is the best speller.', fact: ['Kim won the class spelling bee.', 'Kim did not win the class spelling bee.'] },
  { id: 'funniest', skin: 'everyday', speaker: 'Leo', setting: 'Leo holds up a book.', claim: ['This is the funniest book in the library.', 'This is not the funniest book in the library.'], again: ['No book in the library is funnier than this one.', 'Every other book in the library is less funny than this one.'], news: ['Kids laugh out loud on every page.', 'It won a prize for funny books.'], rule: 'If a book makes the whole class laugh the most, it is the funniest book.', fact: ['This book made the whole class laugh the most.', 'This book did not make the class laugh the most.'] },
  { id: 'pool', skin: 'everyday', speaker: 'Omar', setting: 'Omar walks to the pool with a towel.', claim: ['The pool is closed today.', 'The pool is open today.'], again: ['The pool is not open today.', 'Today, nobody is let into the pool.'], news: ['The gate is locked, and the lights are off.', 'The lifeguard has the day off.'], rule: 'If the gate is locked, the pool is closed.', fact: ['The gate is locked.', 'The gate is not locked.'] },
  { id: 'oldest', skin: 'fantasy', speaker: 'The elf', setting: 'An elf visits the wizard tower.', claim: ['Zed is the oldest wizard in the tower.', 'Zed is not the oldest wizard in the tower.'], again: ['No wizard in the tower is older than Zed.', 'Every other wizard in the tower is younger than Zed.'], news: ['Zed’s birthday book says he is 300 years old.', 'Zed taught every other wizard in the tower.'], rule: 'If a wizard is 300 years old, he is the oldest in the tower.', fact: ['Zed is 300 years old.', 'Zed is not 300 years old.'] },
  { id: 'heaviest', skin: 'fantasy', speaker: 'The dragon keeper', setting: 'The dragon keeper checks the eggs in the nest.', claim: ['The gold egg is the heaviest egg.', 'The gold egg is not the heaviest egg.'], again: ['No egg is heavier than the gold egg.', 'Every other egg is lighter than the gold egg.'], news: ['The scale shows the gold egg weighs the most.', 'The gold egg is the biggest one.'], rule: 'If the scale shows an egg weighs the most, it is the heaviest.', fact: ['The scale shows the gold egg weighs the most.', 'The scale does not show that.'] },
  { id: 'biggest', skin: 'abstract', speaker: 'Max', setting: 'Max looks at three boxes.', claim: ['Box A is the biggest box.', 'Box A is not the biggest box.'], again: ['No box is bigger than Box A.', 'Every other box is smaller than Box A.'], news: ['Box A holds the most blocks.', 'Max measured every box, and Box A was the biggest.'], rule: 'If a box holds the most blocks, it is the biggest box.', fact: ['Box A holds the most blocks.', 'Box A does not hold the most blocks.'] },
  { id: 'tallest', skin: 'everyday', speaker: 'Gus', setting: 'Gus looks around his class.', claim: ['Tia is the tallest kid in our class.', 'Tia is not the tallest kid in our class.'], again: ['No kid in our class is taller than Tia.', 'Every other kid in our class is shorter than Tia.'], news: ['Tia can reach the top shelf with no stool.', 'The nurse measured every kid, and Tia was the tallest.'], rule: 'If the nurse measures a kid as the tallest, that kid is the tallest.', fact: ['The nurse measured Tia as the tallest.', 'The nurse did not measure Tia as the tallest.'] },
  { id: 'whale', skin: 'everyday', speaker: 'Mia', setting: 'Mia reads about sea animals.', claim: ['The blue whale is the biggest animal on Earth.', 'The blue whale is not the biggest animal on Earth.'], again: ['No animal on Earth is bigger than the blue whale.', 'Every other animal on Earth is smaller than the blue whale.'], news: ['A blue whale is longer than three school buses.', 'Scientists measured animals, and the blue whale was the biggest.'], rule: 'If scientists measure an animal as the biggest, it is the biggest animal.', fact: ['Scientists measured the blue whale as the biggest.', 'Scientists did not measure it as the biggest.'], truth: true },
];
/** The worked example: Max, the fastest kid (in Ms. Lee’s class). */
export const W_FASTEST: CircleTopic = { id: 'w-fastest', skin: 'everyday', speaker: 'Ivy', setting: 'Ivy talks about Ms. Lee’s class.', claim: ['Max is the fastest kid in the class.', 'Max is not the fastest kid in the class.'], again: ['No kid in the class is faster than Max.', 'Max beats every other kid in the class at running.'], news: ['Max won the race on field day.', 'The coach timed every kid, and Max had the best time.'], rule: 'If a kid wins the class race, that kid is the fastest.', fact: ['Max won the class race.', 'Max did not win the class race.'] };

const CLAIM_MEANS = 'claim';
export function circleArg(t: CircleTopic, o: { good?: boolean; again?: 0 | 1 } = {}): Arg {
  const claim = line(t.claim[0], (c) => isYes(c, 'c'), { means: CLAIM_MEANS });
  if (o.good) {
    return {
      id: `${t.id}:circle-good`,
      topic: t.id,
      family: 'circle',
      shape: 'circle-good',
      skin: t.skin,
      setting: t.setting,
      speaker: t.speaker,
      vars: [yesNo('w', t.fact), yesNo('c', t.claim)],
      givens: [line(t.rule, (c) => !isYes(c, 'w') || isYes(c, 'c'), { means: 'rule' }), line(t.fact[0], (c) => isYes(c, 'w'), { means: 'fact' })],
      claim,
      claimMid: mid(t.claim[0]),
      ...(t.truth !== undefined ? { truth: t.truth } : {}),
    };
  }
  return {
    id: `${t.id}:circle${o.again ? '-b' : ''}`,
    topic: t.id,
    family: 'circle',
    shape: 'circle',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [yesNo('c', t.claim)],
    // The claim in new words: true in just the cases the claim is, because it means the same thing.
    givens: [line(t.again[o.again ?? 0], (c) => isYes(c, 'c'), { means: CLAIM_MEANS })],
    claim,
    claimMid: mid(t.claim[0]),
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
}
/** A circle topic’s reasons, each with what it means: the two that say the claim again, and the two new ones. */
export const reasonsOf = (t: CircleTopic): Line[] => [
  ...t.again.map((text) => line(text, () => true, { means: CLAIM_MEANS })),
  ...t.news.map((text, k) => line(text, () => true, { means: `new-${k}` })),
];
export const saysAgain = (l: Line) => l.means === CLAIM_MEANS;

/** Lesson 3: an either-or about a group, a fact, and a claim. The setting names every door there really is. */
export interface DoorTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  /** Every value the one thing can take, as sentences: [A, B] for a true either-or, [A, B, C] when a door is left out. */
  doors: readonly string[];
  /** “Every kid in Sam’s class plays soccer or swims.” */
  either: string;
  /** “Sam does not play soccer.” */
  notA: string;
  truth?: boolean;
}
export const DOOR_TOPICS: readonly DoorTopic[] = [
  { id: 'sports', skin: 'everyday', speaker: 'Rosa', setting: 'In Gus’s class, some kids play baseball, some skate, and some draw.', doors: ['Ana plays baseball.', 'Ana skates.', 'Ana draws.'], either: 'Every kid in Gus’s class plays baseball or skates.', notA: 'Ana does not play baseball.' },
  { id: 'streetpets', skin: 'everyday', speaker: 'Kai', setting: 'On Kai’s street, the pets are cats, dogs and fish.', doors: ['Rosa’s pet is a cat.', 'Rosa’s pet is a dog.', 'Rosa’s pet is a fish.'], either: 'Every pet on Kai’s street is a cat or a dog.', notA: 'Rosa’s pet is not a cat.' },
  { id: 'lunch', skin: 'everyday', speaker: 'Mia', setting: 'At Mia’s school, kids bring lunch, buy lunch or go home for lunch.', doors: ['Leo brings his lunch.', 'Leo buys his lunch.', 'Leo goes home for lunch.'], either: 'Every kid at Mia’s school brings lunch or buys it.', notA: 'Leo does not bring his lunch.' },
  { id: 'breath', skin: 'fantasy', speaker: 'The knight', setting: 'In the valley, some dragons breathe fire, some breathe ice, and some breathe bubbles.', doors: ['Puff breathes fire.', 'Puff breathes ice.', 'Puff breathes bubbles.'], either: 'Every dragon in the valley breathes fire or ice.', notA: 'Puff does not breathe fire.' },
  { id: 'ride', skin: 'fantasy', speaker: 'An elf', setting: 'In the tower, wizards ride brooms, carpets or big owls.', doors: ['Merla rides a broom.', 'Merla rides a carpet.', 'Merla rides an owl.'], either: 'Every wizard in the tower rides a broom or a carpet.', notA: 'Merla does not ride a broom.' },
  { id: 'deck', skin: 'abstract', speaker: 'Max', setting: 'The deck has green cards, purple cards and orange cards.', doors: ['This card is green.', 'This card is purple.', 'This card is orange.'], either: 'Every card in the deck is green or purple.', notA: 'This card is not green.' },
];
/** True either-ors: only two doors are there, so they prove their claims. */
export const TRUE_DOOR_TOPICS: readonly DoorTopic[] = [
  { id: 'spinner', skin: 'everyday', speaker: 'Ben', setting: 'Ben spins a spinner that is half red and half blue.', doors: ['The spinner landed on red.', 'The spinner landed on blue.'], either: 'This spinner lands on red or blue.', notA: 'The spinner did not land on red.' },
  { id: 'switch', skin: 'everyday', speaker: 'Ana', setting: 'Ana looks at the light switch by the door.', doors: ['The switch is up.', 'The switch is down.'], either: 'This switch is always up or down.', notA: 'The switch is not up.' },
  { id: 'gate', skin: 'fantasy', speaker: 'The goat', setting: 'The moon gate opens only at night.', doors: ['The moon gate is open.', 'The moon gate is shut.'], either: 'The moon gate is always open or shut.', notA: 'The moon gate is not open.' },
  { id: 'seven', skin: 'abstract', speaker: 'Max', setting: 'Max picks the whole number seven.', doors: ['Seven is even.', 'Seven is odd.'], either: 'Every whole number is even or odd.', notA: 'Seven is not even.' },
];
/** The worked example: Sam’s sports (in Ms. Lee’s class). */
export const W_SPORTS: DoorTopic = { id: 'w-sports', skin: 'everyday', speaker: 'Ivy', setting: 'In Ms. Lee’s class, some kids play soccer, some swim, and some ride bikes.', doors: ['Sam plays soccer.', 'Sam swims.', 'Sam rides bikes.'], either: 'Every kid in the class plays soccer or swims.', notA: 'Sam does not play soccer.' };
/** The worked true either-or: the coin. */
export const W_COIN: DoorTopic = { id: 'w-coin', skin: 'everyday', speaker: 'Ben', setting: 'Ben flips a coin.', doors: ['The coin landed on heads.', 'The coin landed on tails.'], either: 'A flipped coin lands on heads or tails.', notA: 'The coin did not land on heads.' };

export function doorArg(t: DoorTopic): Arg {
  const values = t.doors.map((text, k) => ({ id: `d${k}`, text }));
  const good = t.doors.length === 2;
  return {
    id: `${t.id}:${good ? 'doors-good' : 'doors'}`,
    topic: t.id,
    family: 'doors',
    shape: good ? 'doors-good' : 'doors',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [{ id: 'x', values }],
    givens: [line(t.either, (c) => c.x === 'd0' || c.x === 'd1', { door: true }), line(t.notA, (c) => c.x !== 'd0')],
    claim: line(t.doors[1], (c) => c.x === 'd1'),
    claimMid: mid(t.doors[1]),
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
}

/** Lesson 4: a few checked, a claim about all. Every case says how the ones checked and the rest turned out. */
export interface HastyTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  /** Who checks, and the verb: “Ava”, “tasted”. */
  who: string;
  verb: string;
  /** The verb after “has”: “tasted”, “seen”. */
  done: string;
  n: number;
  k: number;
  thing: readonly [string, string];
  place: string;
  /** The feature, and its NOT: “sour”, “not sour”. */
  is: readonly [string, string];
}
export const HASTY_TOPICS: readonly HastyTopic[] = [
  { id: 'markers', skin: 'everyday', speaker: 'Leo', setting: 'Leo opens a new box of markers.', who: 'Leo', verb: 'tried', done: 'tried', n: 8, k: 3, thing: ['marker', 'markers'], place: 'in the box', is: ['dried out', 'not dried out'] },
  { id: 'cookies', skin: 'everyday', speaker: 'Kai', setting: 'Kai’s dad baked a tray of cookies.', who: 'Kai', verb: 'tasted', done: 'tasted', n: 12, k: 2, thing: ['cookie', 'cookies'], place: 'on the tray', is: ['burnt', 'not burnt'] },
  { id: 'shells', skin: 'everyday', speaker: 'Mia', setting: 'Mia fills a bucket with shells at the beach.', who: 'Mia', verb: 'looked at', done: 'looked at', n: 9, k: 3, thing: ['shell', 'shells'], place: 'in the bucket', is: ['white', 'not white'] },
  { id: 'dragons', skin: 'fantasy', speaker: 'The knight', setting: 'The knight rides into the dragon valley.', who: 'The knight', verb: 'saw', done: 'seen', n: 9, k: 2, thing: ['dragon', 'dragons'], place: 'in the valley', is: ['green', 'not green'] },
  { id: 'potions', skin: 'fantasy', speaker: 'Zed', setting: 'Zed checks the potion shelf.', who: 'Zed', verb: 'smelled', done: 'smelled', n: 10, k: 3, thing: ['potion', 'potions'], place: 'on the shelf', is: ['minty', 'not minty'] },
  { id: 'stack', skin: 'abstract', speaker: 'Max', setting: 'Max has a stack of face-down cards.', who: 'Max', verb: 'flipped', done: 'flipped', n: 7, k: 2, thing: ['card', 'cards'], place: 'in the stack', is: ['red', 'not red'] },
  { id: 'letters', skin: 'abstract', speaker: 'Gus', setting: 'Gus has a bag of letter tiles.', who: 'Gus', verb: 'pulled out', done: 'pulled out', n: 10, k: 3, thing: ['tile', 'tiles'], place: 'in the bag', is: ['gold', 'not gold'] },
];
/** The worked example: Ava and the apples. */
export const W_APPLES: HastyTopic = { id: 'w-apples', skin: 'everyday', speaker: 'Ava', setting: 'Ava buys a bag of apples.', who: 'Ava', verb: 'tasted', done: 'tasted', n: 6, k: 2, thing: ['apple', 'apples'], place: 'in the bag', is: ['sour', 'not sour'] };

const allOf = (n: number) => (n === 2 ? 'Both' : `All ${n}`);
/** “Ava tasted 2 of the 6 apples in the bag.” */
export const checkedText = (t: HastyTopic, k = t.k) => (k === t.n ? `${t.who} ${t.verb} all ${t.n} ${t.thing[1]} ${t.place}.` : `${t.who} ${t.verb} ${k} of the ${t.n} ${t.thing[1]} ${t.place}.`);
/** “So all 6 apples in the bag are sour.” as a claim: “All 6 apples in the bag are sour.” */
export const allClaimText = (t: HastyTopic) => `All ${t.n} ${t.thing[1]} ${t.place} are ${t.is[0]}.`;

export function hastyArg(t: HastyTopic, allChecked = false): Arg {
  const k = allChecked ? t.n : t.k;
  const rest = t.n - k;
  const seen: Var = {
    id: 'seen',
    values: [
      { id: 'yes', text: k === t.n ? `All ${t.n} ${t.thing[1]} are ${t.is[0]}.` : `${t.who} found ${k === 2 ? 'both' : `all ${k}`} ${t.is[0]}.` },
      { id: 'no', text: k === t.n ? `At least one ${t.thing[0]} is ${t.is[1]}.` : `${t.who} found one that is ${t.is[1]}.` },
    ],
  };
  const vars: Var[] = [seen];
  if (rest > 0) vars.push({ id: 'rest', values: [{ id: 'yes', text: `The other ${rest} are ${t.is[0]}.` }, { id: 'no', text: `At least one of the other ${rest} is ${t.is[1]}.` }] });
  return {
    id: `${t.id}:${allChecked ? 'all-checked' : 'few'}`,
    topic: t.id,
    family: 'hasty',
    shape: allChecked ? 'all-checked' : 'few',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars,
    givens: [line(checkedText(t, k), () => true), line(`${allOf(k)} were ${t.is[0]}.`, (c) => isYes(c, 'seen'))],
    claim: line(allClaimText(t), (c) => isYes(c, 'seen') && (rest === 0 || isYes(c, 'rest'))),
    claimMid: mid(allClaimText(t)),
  };
}

/** Lesson 4: most people say it, so it is true. truth: whether it is really true (undefined: a story). */
export interface PopularTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  /** “Most kids in Kai’s class”. */
  crowd: string;
  /** What they say, and its NOT. */
  x: Pair;
  /** What would really settle it: a fact to check, not a count of people. The teaching’s last step shows it. */
  check: string;
  truth?: boolean;
}
export const POPULAR_TOPICS: readonly PopularTopic[] = [
  { id: 'tomato', skin: 'everyday', speaker: 'Kai', setting: 'Kai’s class talks about food.', crowd: 'Most kids in Kai’s class', x: ['A tomato is a vegetable.', 'A tomato is not a vegetable.'], check: 'A plant book says a tomato is a fruit.', truth: false },
  { id: 'bats', skin: 'everyday', speaker: 'Ana', setting: 'Ana is at summer camp.', crowd: 'Most kids at Ana’s camp', x: ['Bats are blind.', 'Bats are not blind.'], check: 'A science book says bats can see.', truth: false },
  { id: 'snow', skin: 'everyday', speaker: 'Omar', setting: 'Omar waits at the bus stop.', crowd: 'Most kids at the stop', x: ['It will snow today.', 'It will not snow today.'], check: 'A weather report would tell you more.' },
  { id: 'spider', skin: 'everyday', speaker: 'Mia', setting: 'Mia’s club finds a spider.', crowd: 'Most kids in Mia’s club', x: ['A spider is not an insect.', 'A spider is an insect.'], check: 'A science book says a spider has eight legs, and every insect has six.', truth: true },
  { id: 'well', skin: 'fantasy', speaker: 'The elf', setting: 'An elf shows you the old well in the village.', crowd: 'Most elves', x: ['The old well grants wishes.', 'The old well does not grant wishes.'], check: 'You could test it: make a wish and see what happens.' },
  { id: 'moon', skin: 'fantasy', speaker: 'The goat', setting: 'The trolls under the bridge look up at the moon.', crowd: 'Most trolls', x: ['The moon is made of cheese.', 'The moon is not made of cheese.'], check: 'A moon rock shows the moon is made of rock.', truth: false },
  { id: 'heavy', skin: 'abstract', speaker: 'Max', setting: 'Max holds up Box A and Box B.', crowd: 'Most kids in the poll', x: ['Box B is heavier.', 'Box B is not heavier.'], check: 'A scale would show which box is heavier.' },
  { id: 'mammal', skin: 'everyday', speaker: 'Gus', setting: 'Gus’s class visits the sea center.', crowd: 'Most kids in Gus’s class', x: ['A whale is a mammal.', 'A whale is not a mammal.'], check: 'A science book says whales feed their babies milk, like every mammal.', truth: true },
];
/** The worked example: the sun is a star (most kids say so, and it is true). */
export const W_SUN: PopularTopic = { id: 'w-sun', skin: 'everyday', speaker: 'Ivy', setting: 'Ivy’s class talks about space.', crowd: 'Most kids in Ivy’s class', x: ['The sun is a star.', 'The sun is not a star.'], check: 'A space book says the sun is a star.', truth: true };

/** Lesson 4’s good twin: most people voted, and a rule says the vote decides. Votes prove what a group picks. */
export interface VoteTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  voted: Pair;
  rule: string;
  go: Pair;
}
export const VOTE_TOPICS: readonly VoteTopic[] = [
  { id: 'zoo', skin: 'everyday', speaker: 'Kai', setting: 'Kai’s class picks a trip.', voted: ['Most kids in the class voted for the zoo trip.', 'Most kids did not vote for the zoo trip.'], rule: 'The class goes on the trip with the most votes.', go: ['The class goes to the zoo.', 'The class does not go to the zoo.'] },
  { id: 'pizza', skin: 'everyday', speaker: 'Ana', setting: 'Ana’s school votes on Friday lunch.', voted: ['Most kids voted for pizza.', 'Most kids did not vote for pizza.'], rule: 'The lunch with the most votes is served on Friday.', go: ['Pizza is served on Friday.', 'Pizza is not served on Friday.'] },
  { id: 'parade', skin: 'fantasy', speaker: 'An elf', setting: 'The elves pick who leads the parade.', voted: ['Most elves voted for Lumo.', 'Most elves did not vote for Lumo.'], rule: 'The elf with the most votes leads the parade.', go: ['Lumo leads the parade.', 'Lumo does not lead the parade.'] },
  { id: 'poll', skin: 'abstract', speaker: 'Max', setting: 'Max runs a poll about two boxes.', voted: ['Most kids in the poll picked Box B.', 'Most kids in the poll did not pick Box B.'], rule: 'The box with the most picks gets opened first.', go: ['Box B gets opened first.', 'Box B does not get opened first.'] },
];
/** The worked vote: the class trip. */
export const W_VOTE: VoteTopic = { id: 'w-vote', skin: 'everyday', speaker: 'Ivy', setting: 'Ivy’s class votes on a trip.', voted: ['Most kids voted for the farm trip.', 'Most kids did not vote for the farm trip.'], rule: 'The trip with the most votes is the one the class takes.', go: ['The class goes to the farm.', 'The class does not go to the farm.'] };

export const sayText = (t: PopularTopic) => `${t.crowd} say ${mid(t.x[0])}.`;
export function popularArg(t: PopularTopic): Arg {
  return {
    id: `${t.id}:popular`,
    topic: t.id,
    family: 'popular',
    shape: 'popular',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [yesNo('x', t.x), yesNo('say', [sayText(t), `${t.crowd} do not say that.`])],
    givens: [line(sayText(t), (c) => isYes(c, 'say'))],
    claim: line(t.x[0], (c) => isYes(c, 'x')),
    claimMid: mid(t.x[0]),
    settle: t.check,
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
}
export function voteArg(t: VoteTopic): Arg {
  return {
    id: `${t.id}:vote`,
    topic: t.id,
    family: 'popular',
    shape: 'vote',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [yesNo('v', t.voted), yesNo('g', t.go)],
    givens: [line(t.voted[0], (c) => isYes(c, 'v')), line(t.rule, (c) => !isYes(c, 'v') || isYes(c, 'g'))],
    claim: line(t.go[0], (c) => isYes(c, 'g')),
    claimMid: mid(t.go[0]),
  };
}

// ---------- Lesson 5: tricks about people ----------

/** The rule a good twin adds: “If <fact>, <claim>.” Built from the two sentences, so its words always match its logic. */
export const ruleOf = (fact: string, claim: string) => `If ${mid(fact)}, ${mid(claim)}.`;

export type PeopleFamily = 'person' | 'twist' | 'authority';
/**
 * Lesson 5: a reason about the wrong thing. Attacking the person (a reason about the one who made the claim), the
 * twisted claim (a reason that knocks down a claim nobody made, after the speaker retells it) and the famous name (a
 * famous person’s word on a subject they do not know). The reason is true in the story and crosses out no case, so the
 * claim can be true or false: the reason leaves out the claim’s own facts. The good twin keeps the story and gives a
 * reason about the claim itself: a fact, and the rule “If <fact>, <claim>.”
 */
export interface PeopleTopic {
  id: string;
  skin: Skin;
  family: PeopleFamily;
  speaker: string;
  /** The first line: who made the claim (attacking the person, the twisted claim), or who the famous person is. */
  setting: string;
  /** The twisted claim: how the speaker retells the claim (“Ben says Ana thinks the bus will never come.”). */
  retell?: string;
  /** The trick’s reason: true in the story, and about something other than the claim. */
  reason: string;
  /** The claim and its NOT. */
  claim: Pair;
  /** How the reason can be true and the claim false (shown under that case). */
  other: string;
  /** What the reason leaves out, in this story: “anything about the pool”. */
  leaves: string;
  /** The good twin’s fact about the claim itself, and its NOT. None when the claim is really false. */
  fact?: Pair;
  truth?: boolean;
}
const ppl = (o: PeopleTopic): PeopleTopic => o;

export const PERSON_TOPICS: readonly PeopleTopic[] = [
  ppl({ id: 'museum', skin: 'everyday', family: 'person', speaker: 'Ben', setting: 'Ava says the science museum is free on Sundays.', reason: 'Ava always forgets her lunch.', claim: ['The science museum is not free on Sundays.', 'The science museum is free on Sundays.'], other: 'Ava can forget her lunch and still know what the museum costs.', leaves: 'anything about what the museum costs', fact: ['The museum sign lists a price for Sundays.', 'The museum sign lists no price for Sundays.'] }),
  ppl({ id: 'gametime', skin: 'everyday', family: 'person', speaker: 'Rosa', setting: 'Omar says the soccer game starts at ten.', reason: 'Omar missed the bus twice this week.', claim: ['The soccer game does not start at ten.', 'The soccer game starts at ten.'], other: 'Missing the bus has nothing to do with when the game starts.', leaves: 'anything about when the game starts', fact: ['The team schedule says the game starts at noon.', 'The team schedule does not say noon.'] }),
  ppl({ id: 'moonair', skin: 'everyday', family: 'person', speaker: 'Kai', setting: 'Gus says the moon has no air.', reason: 'Gus is only eight years old.', claim: ['The moon has air.', 'The moon has no air.'], other: 'A kid who is eight can know a true fact about space.', leaves: 'anything about the moon', truth: false }),
  ppl({ id: 'cave', skin: 'fantasy', family: 'person', speaker: 'The troll', setting: 'Puff the dragon says the cave is empty.', reason: 'Puff has a squeaky voice.', claim: ['The cave is not empty.', 'The cave is empty.'], other: 'A squeaky voice says nothing about what is in the cave.', leaves: 'anything about the cave', fact: ['The troll hears snoring in the cave.', 'The troll hears no snoring in the cave.'] }),
  ppl({ id: 'oldmap', skin: 'fantasy', family: 'person', speaker: 'Zed', setting: 'Tia the elf says the castle is north of the woods.', reason: 'Tia is the smallest elf in the village.', claim: ['The castle is not north of the woods.', 'The castle is north of the woods.'], other: 'Being small has nothing to do with where the castle is.', leaves: 'anything about where the castle is', fact: ['The old map shows the castle south of the woods.', 'The old map does not show the castle south of the woods.'] }),
  ppl({ id: 'redcard', skin: 'abstract', family: 'person', speaker: 'Gus', setting: 'Pim says Card 3 in the row is red.', reason: 'Pim just started playing this game.', claim: ['Card 3 is not red.', 'Card 3 is red.'], other: 'A new player can still see what color a card is.', leaves: 'anything about Card 3', fact: ['Card 3 is blue.', 'Card 3 is not blue.'] }),
];
export const TWIST_TOPICS: readonly PeopleTopic[] = [
  ppl({ id: 'busstop', skin: 'everyday', family: 'twist', speaker: 'Ben', setting: 'Ana says the school bus may be a few minutes late today.', retell: 'Ben says Ana thinks the bus will never come.', reason: 'The bus always comes in the end.', claim: ['The bus is on time today.', 'The bus is a few minutes late today.'], other: 'Ana never said the bus would not come. It can come and still be late.', leaves: 'what Ana really said: a few minutes late', fact: ['The bus stops at the corner at eight.', 'The bus does not stop at the corner at eight.'] }),
  ppl({ id: 'soup', skin: 'everyday', family: 'twist', speaker: 'Mia', setting: 'Leo says the soup is a little too salty.', retell: 'Mia says Leo thinks the soup is pure salt.', reason: 'The soup is not pure salt.', claim: ['The soup is not too salty.', 'The soup is a little too salty.'], other: 'Leo never said the soup was pure salt. Soup can be a little too salty.', leaves: 'what Leo really said: a little too salty', fact: ['The soup has just one pinch of salt.', 'The soup has more than one pinch of salt.'] }),
  ppl({ id: 'fly', skin: 'fantasy', family: 'twist', speaker: 'The knight', setting: 'The elf says Puff can fly a short way.', retell: 'The knight says the elf thinks Puff can fly to the moon.', reason: 'No dragon can fly to the moon.', claim: ['Puff can’t fly at all.', 'Puff can fly a short way.'], other: 'The elf said a short way, not to the moon.', leaves: 'what the elf really said: a short way', fact: ['Puff has no wings.', 'Puff has wings.'] }),
  ppl({ id: 'sleepy', skin: 'fantasy', family: 'twist', speaker: 'Zed', setting: 'Tia says the blue potion may make you a bit sleepy.', retell: 'Zed says Tia thinks it puts you to sleep for a hundred years.', reason: 'The blue potion does not put you to sleep for a hundred years.', claim: ['The blue potion does not make you sleepy.', 'The blue potion makes you a bit sleepy.'], other: 'Tia said a bit sleepy, not a hundred years.', leaves: 'what Tia really said: a bit sleepy', fact: ['The blue potion is only water.', 'The blue potion is not only water.'] }),
  ppl({ id: 'heavybox', skin: 'abstract', family: 'twist', speaker: 'Pim', setting: 'Max says Box A is a little heavier than Box B.', retell: 'Pim says Max thinks Box A weighs a ton.', reason: 'Box A does not weigh a ton.', claim: ['Box A is not heavier than Box B.', 'Box A is a little heavier than Box B.'], other: 'Max said a little heavier, not a ton.', leaves: 'what Max really said: a little heavier', fact: ['The scale shows the two boxes weigh the same.', 'The scale does not show the two boxes weigh the same.'] }),
];
export const AUTHORITY_TOPICS: readonly PeopleTopic[] = [
  ppl({ id: 'teeth', skin: 'everyday', family: 'authority', speaker: 'Ana', setting: 'A famous skater is in a toothpaste ad.', reason: 'The famous skater says this toothpaste keeps teeth the cleanest.', claim: ['This toothpaste keeps teeth the cleanest.', 'This toothpaste does not keep teeth the cleanest.'], other: 'A skater knows about skating, not about teeth.', leaves: 'whether the skater knows about teeth', fact: ['The dentist test puts this toothpaste first.', 'The dentist test does not put this toothpaste first.'] }),
  ppl({ id: 'juice', skin: 'everyday', family: 'authority', speaker: 'Leo', setting: 'A famous singer is in a juice ad.', reason: 'The famous singer says this juice makes you smarter.', claim: ['This juice makes you smarter.', 'This juice does not make you smarter.'], other: 'A singer knows about songs, not about how kids learn.', leaves: 'whether the singer knows about how kids learn', truth: false }),
  ppl({ id: 'snowchef', skin: 'everyday', family: 'authority', speaker: 'Omar', setting: 'A famous chef talks about the weather on the radio.', reason: 'The famous chef says it will snow tomorrow.', claim: ['It snows the next day.', 'It does not snow the next day.'], other: 'A chef knows about cooking, not about weather.', leaves: 'whether the chef knows about weather' }),
  ppl({ id: 'ropebridge', skin: 'fantasy', family: 'authority', speaker: 'The goat', setting: 'A famous dancer visits the old rope bridge.', reason: 'The famous dancer says the rope bridge is safe to cross.', claim: ['The rope bridge is safe to cross.', 'The rope bridge is not safe to cross.'], other: 'A dancer knows about dancing, not about bridges.', leaves: 'whether the dancer knows about bridges', fact: ['The bridge builder finds no worn ropes.', 'The bridge builder finds a worn rope.'] }),
  ppl({ id: 'hiccups', skin: 'fantasy', family: 'authority', speaker: 'An elf', setting: 'A famous knight visits the potion shop.', reason: 'The famous knight says the green potion stops hiccups.', claim: ['The green potion stops hiccups.', 'The green potion does not stop hiccups.'], other: 'A knight knows about horses and castles, not about potions.', leaves: 'whether the knight knows about potions', fact: ['The potion maker’s book says the green potion stops hiccups.', 'The potion maker’s book says nothing about hiccups.'] }),
  ppl({ id: 'puzzle', skin: 'abstract', family: 'authority', speaker: 'Ivy', setting: 'A famous painter looks at Max’s number puzzle.', reason: 'The famous painter says the answer is 12.', claim: ['The answer to Max’s puzzle is 12.', 'The answer to Max’s puzzle is not 12.'], other: 'A painter knows about painting, not about number puzzles.', leaves: 'whether the painter knows about number puzzles', fact: ['The number 12 fits every clue.', 'The number 12 does not fit every clue.'] }),
];
export const PEOPLE_TOPICS: readonly PeopleTopic[] = [...PERSON_TOPICS, ...TWIST_TOPICS, ...AUTHORITY_TOPICS];

/** The worked examples (cards and boards only, never a quiz): Mia and the pool, Leo and the lake, a singer on a cereal box. */
export const W_POOL = ppl({ id: 'w-pool', skin: 'everyday', family: 'person', speaker: 'Leo', setting: 'Mia says the pool opens at noon today.', reason: 'Mia is late for everything.', claim: ['The pool does not open at noon today.', 'The pool opens at noon today.'], other: 'Mia can be late and still be right about the pool.', leaves: 'anything about the pool', fact: ['The pool sign says one o’clock.', 'The pool sign does not say one o’clock.'] });
export const W_LAKE = ppl({ id: 'w-lake', skin: 'everyday', family: 'twist', speaker: 'Mia', setting: 'Leo says the lake is warm enough for a swim.', retell: 'Mia says Leo thinks the lake is as hot as a bath.', reason: 'The lake is not as hot as a bath.', claim: ['The lake is too cold for a swim.', 'The lake is warm enough for a swim.'], other: 'Leo never said the lake was as hot as a bath.', leaves: 'what Leo really said: warm enough for a swim' });
export const W_CEREAL = ppl({ id: 'w-cereal', skin: 'everyday', family: 'authority', speaker: 'Kai', setting: 'A famous singer is on a cereal box.', reason: 'The famous singer says this cereal is the healthiest one.', claim: ['This cereal is the healthiest one.', 'This cereal is not the healthiest one.'], other: 'The singer knows about songs, not about food.', leaves: 'whether the singer knows about food' });

/** A Lesson 5 argument: the trick (a reason about the wrong thing), or with good: true its twin (a fact and its rule). */
export function peopleArg(t: PeopleTopic, good = false): Arg {
  const base = {
    topic: t.id,
    family: t.family,
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    claim: line(t.claim[0], (c: Case) => isYes(c, 'c')),
    claimMid: mid(t.claim[0]),
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
  if (good) {
    if (!t.fact) throw new Error(`peopleArg: ${t.id} has no good twin`);
    return {
      ...base,
      id: `${t.id}:${t.family}-good`,
      shape: `${t.family}-good` as Shape,
      vars: [yesNo('w', t.fact), yesNo('c', t.claim)],
      givens: [line(ruleOf(t.fact[0], t.claim[0]), (c) => !isYes(c, 'w') || isYes(c, 'c')), line(t.fact[0], (c) => isYes(c, 'w'))],
    };
  }
  return {
    ...base,
    id: `${t.id}:${t.family}`,
    shape: t.family,
    vars: [yesNo('c', t.claim)],
    // True in the story, whatever the claim: it is about something else, so it crosses out no case.
    givens: [line(t.reason, () => true)],
    note: (c) => (isYes(c, 'c') ? undefined : `How? ${t.other}`),
    leaves: t.leaves,
    ...(t.retell ? { retell: t.retell } : {}),
  };
}

// ---------- Lesson 6: tricks about time ----------

/**
 * Lesson 6: steps from a first one (it happens in the story) through a next step to an end (the claim). The slippery
 * slope gives no rule for any step, so every case is left and the end can fail: it leaves out a reason for each step. A
 * chain (its good twin) gives the rule for each step, “If <first>, <next>.” and “If <next>, <end>.”, and forces the end.
 */
export interface StepTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  /** The first step: it happens in the story. */
  first: string;
  /** The next step, and its NOT. */
  next: Pair;
  /** The last step (the claim), and its NOT. */
  end: Pair;
  /** The steps in a few words, shown under the picture: “Ana’s fish, then more pets, then a zoo”. */
  steps: string;
  /** A slippery slope: how the last step can fail after the next one happens. */
  other?: string;
  /** A chain: each step comes with its rule, so the reason proves its claim. */
  chain?: true;
  truth?: boolean;
}
const stp = (o: StepTopic): StepTopic => o;
/** The rule for each step: what a slippery slope leaves out, and what a chain gives. */
export const linkRules = (t: StepTopic): [string, string] => [ruleOf(t.first, t.next[0]), ruleOf(t.next[0], t.end[0])];

export const SLOPE_TOPICS: readonly StepTopic[] = [
  stp({ id: 'brothergame', skin: 'everyday', speaker: 'Kai', setting: 'Kai’s little brother asks to play Kai’s game once.', first: 'Kai lets his brother play once.', next: ['Kai’s brother asks to play every day.', 'Kai’s brother does not ask again.'], end: ['Kai never gets a turn again.', 'Kai still gets his turns.'], steps: 'one game, then every day, then no turns for Kai', other: 'Kai and his brother can take turns.', truth: false }),
  stp({ id: 'puppy', skin: 'everyday', speaker: 'Rosa’s dad', setting: 'Rosa’s family has a new puppy.', first: 'Rosa lets the puppy on the couch once.', next: ['The puppy jumps on the couch every day.', 'The puppy stays off the couch.'], end: ['The puppy sleeps on the couch every night.', 'The puppy sleeps in its own bed.'], steps: 'the couch once, then every day, then every night', other: 'Rosa can still teach the puppy to sleep in its own bed.' }),
  stp({ id: 'practice', skin: 'everyday', speaker: 'Sam’s coach', setting: 'Sam wants to skip one swim practice.', first: 'Sam skips one practice.', next: ['Sam skips the next practice too.', 'Sam comes to the next practice.'], end: ['Sam quits the swim team.', 'Sam stays on the swim team.'], steps: 'one missed practice, then another, then quitting', other: 'Sam can miss two days and still love the team.' }),
  stp({ id: 'onecookie', skin: 'fantasy', speaker: 'The baker', setting: 'A dragon asks the village for one cookie.', first: 'The village gives the dragon one cookie.', next: ['The dragon asks for a cookie every day.', 'The dragon never asks again.'], end: ['The dragon eats every cookie in the village.', 'The village keeps most of its cookies.'], steps: 'one cookie, then one a day, then every cookie', other: 'The village can say no to more cookies.' }),
  stp({ id: 'onespell', skin: 'fantasy', speaker: 'Zed’s owl', setting: 'Tia asks Zed to teach her one easy spell.', first: 'Zed teaches Tia one easy spell.', next: ['Tia wants to learn every spell.', 'Tia is happy with one spell.'], end: ['Tia takes over the wizard tower.', 'Tia does not take over the wizard tower.'], steps: 'one spell, then every spell, then the whole tower', other: 'Tia can learn lots of spells and never want the tower.', truth: false }),
  stp({ id: 'goats', skin: 'fantasy', speaker: 'The troll', setting: 'One goat asks to cross the troll’s bridge.', first: 'The troll lets one goat cross.', next: ['Every goat in the hills comes to cross.', 'No other goat comes.'], end: ['The bridge falls down.', 'The bridge stays up.'], steps: 'one goat, then every goat, then a fallen bridge', other: 'The bridge can hold lots of goats, one at a time.', truth: false }),
];
export const CHAIN_TOPICS: readonly StepTopic[] = [
  stp({ id: 'flat', skin: 'everyday', speaker: 'Mia’s dad', setting: 'Mia finds a flat tire on her bike.', first: 'Mia’s bike tire is flat.', next: ['Mia can’t ride her bike.', 'Mia can ride her bike.'], end: ['Mia walks to school.', 'Mia does not walk to school.'], steps: 'a flat tire, then no bike, then a walk', chain: true }),
  stp({ id: 'poweroff', skin: 'everyday', speaker: 'Omar’s mom', setting: 'The power goes out at Omar’s house.', first: 'The power is out.', next: ['The lamps are dark.', 'The lamps are lit.'], end: ['Omar uses a flashlight.', 'Omar does not use a flashlight.'], steps: 'no power, then dark lamps, then a flashlight', chain: true }),
  stp({ id: 'crystal', skin: 'fantasy', speaker: 'An elf', setting: 'A full moon rises over the elf village.', first: 'The moon is full tonight.', next: ['The crystal bridge glows.', 'The crystal bridge does not glow.'], end: ['The elves hold a dance.', 'The elves do not hold a dance.'], steps: 'a full moon, then a glowing bridge, then a dance', chain: true }),
  stp({ id: 'owls', skin: 'fantasy', speaker: 'Tia', setting: 'Zed rings the big bell in the wizard tower.', first: 'Zed rings the big bell.', next: ['The owls wake up.', 'The owls stay asleep.'], end: ['The owls fly to the roof.', 'The owls do not fly to the roof.'], steps: 'the bell, then awake owls, then owls on the roof', chain: true }),
  stp({ id: 'cardsteps', skin: 'abstract', speaker: 'Ivy', setting: 'Max plays a board game with card rules.', first: 'Max draws a red card.', next: ['Max moves two spaces.', 'Max does not move two spaces.'], end: ['Max lands on the star.', 'Max does not land on the star.'], steps: 'a red card, then two spaces, then the star', chain: true }),
];
export const STEP_TOPICS: readonly StepTopic[] = [...SLOPE_TOPICS, ...CHAIN_TOPICS];
/** The worked slope (Ana’s fish) and the worked chain (a snow day). */
export const W_FISH = stp({ id: 'w-fish', skin: 'everyday', speaker: 'Leo', setting: 'Ana asks to bring her fish to class.', first: 'Ms. Lee lets Ana bring her fish.', next: ['Other kids ask to bring pets.', 'No other kid asks to bring a pet.'], end: ['The class turns into a zoo.', 'The class does not turn into a zoo.'], steps: 'Ana’s fish, then more pets, then a zoo', other: 'Ms. Lee can say no to the other pets.' });
export const W_SNOW = stp({ id: 'w-snow', skin: 'everyday', speaker: 'Kai’s mom', setting: 'It snowed all night in Kai’s town.', first: 'It snowed a lot last night.', next: ['School is closed today.', 'School is open today.'], end: ['Kai goes sledding.', 'Kai does not go sledding.'], steps: 'lots of snow, then no school, then sledding', chain: true });

/** A Lesson 6 step argument: a slippery slope, or a chain when every step has its rule. */
export function stepArg(t: StepTopic): Arg {
  const [r1, r2] = linkRules(t);
  // The first step happens in the story. A chain adds the rule for each step.
  const first = line(t.first, () => true);
  const givens = t.chain ? [first, line(r1, (c) => isYes(c, 'n')), line(r2, (c) => !isYes(c, 'n') || isYes(c, 'e'))] : [first];
  return {
    id: `${t.id}:${t.chain ? 'chain' : 'slope'}`,
    topic: t.id,
    family: 'slope',
    shape: t.chain ? 'chain' : 'slope',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [yesNo('n', t.next), yesNo('e', t.end)],
    givens,
    claim: line(t.end[0], (c) => isYes(c, 'e')),
    claimMid: mid(t.end[0]),
    picture: `The steps: ${t.steps}.`,
    ...(t.chain ? {} : { note: (c: Case) => (isYes(c, 'n') && !isYes(c, 'e') ? `How? ${t.other}` : undefined), leaves: 'a reason for each step' }),
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
}

/**
 * Lesson 6: one thing came right after another (true in the story, in every case), so the first caused it. The cases are
 * what caused the second thing: the first thing, or something else. After-therefore-because leaves out a reason the
 * first thing was the cause. Its good twin adds a rule that nothing else can cause it.
 */
export interface AfterTopic {
  id: string;
  skin: Skin;
  speaker: string;
  setting: string;
  /** The given: one thing came right after another. */
  after: string;
  /** The claim: the first thing caused the second. */
  cause: string;
  /** The other case: something else caused it. */
  other: string;
  /** A good reason: a rule that nothing else can cause it. */
  only?: string;
  truth?: boolean;
}
const aft = (o: AfterTopic): AfterTopic => o;
export const POST_TOPICS: readonly AfterTopic[] = [
  aft({ id: 'socks', skin: 'everyday', speaker: 'Gus', setting: 'Gus wears his blue socks to the soccer game.', after: 'Gus’s team won after he put on his blue socks.', cause: 'Gus’s blue socks made his team win.', other: 'The team played well, and the socks did nothing.', truth: false }),
  aft({ id: 'sneeze', skin: 'everyday', speaker: 'Omar’s sister', setting: 'A cat walks into Omar’s room.', after: 'Omar sneezed right after the cat walked in.', cause: 'The cat made Omar sneeze.', other: 'Dust made Omar sneeze, not the cat.' }),
  aft({ id: 'coat', skin: 'everyday', speaker: 'Leo', setting: 'Leo puts on his coat on a cold morning.', after: 'Leo felt warm right after he put on his coat.', cause: 'The coat made Leo feel warm.', other: 'The sun came out and warmed Leo, not the coat.' }),
  aft({ id: 'plant', skin: 'everyday', speaker: 'Ava', setting: 'Ava waters her bean plant every day.', after: 'The bean plant grew tall after Ava watered it.', cause: 'The water helped the bean plant grow.', other: 'Sunlight made the plant grow, not the water.', truth: true }),
  aft({ id: 'roar', skin: 'fantasy', speaker: 'The knight', setting: 'Blaze the dragon roars at dawn.', after: 'The sun came up right after Blaze roared.', cause: 'Blaze’s roar made the sun come up.', other: 'The sun comes up every morning, roar or no roar.', truth: false }),
  aft({ id: 'tapdoor', skin: 'fantasy', speaker: 'Tia', setting: 'Zed taps the old door with his wand.', after: 'The old door swung open right after Zed tapped it.', cause: 'Zed’s tap made the old door open.', other: 'The wind blew the old door open, not the tap.' }),
  aft({ id: 'song', skin: 'fantasy', speaker: 'The goat', setting: 'The troll sings by the river.', after: 'It snowed right after the troll sang.', cause: 'The troll’s song made it snow.', other: 'Cold clouds made it snow, not the song.', truth: false }),
  aft({ id: 'lighta', skin: 'abstract', speaker: 'Max', setting: 'Max presses Button 1 on a panel of lights.', after: 'Light A came on right after Max pressed Button 1.', cause: 'Button 1 turned on Light A.', other: 'A timer turned on Light A, not Button 1.' }),
];
export const ONLY_TOPICS: readonly AfterTopic[] = [
  aft({ id: 'lampflip', skin: 'everyday', speaker: 'Leo’s sister', setting: 'Leo flips the switch by his bed.', after: 'The lamp came on right after Leo flipped the switch.', cause: 'Leo’s flip turned on the lamp.', other: 'Something else turned on the lamp.', only: 'Nothing but this switch can turn on the lamp.' }),
  aft({ id: 'whistle', skin: 'everyday', speaker: 'Ana', setting: 'The swim coach blows her whistle.', after: 'The swimmers stopped right after the coach blew her whistle.', cause: 'The whistle made the swimmers stop.', other: 'Something else made the swimmers stop.', only: 'Here, only the whistle can make the swimmers stop.' }),
  aft({ id: 'gatespell', skin: 'fantasy', speaker: 'An elf', setting: 'Merla says the magic word at the garden gate.', after: 'The garden gate opened right after Merla said the magic word.', cause: 'The magic word opened the garden gate.', other: 'Something else opened the garden gate.', only: 'Nothing but the magic word can open this gate.' }),
  aft({ id: 'buttonb', skin: 'abstract', speaker: 'Ivy', setting: 'Ivy presses Button 2 on a toy panel.', after: 'Light B came on right after Ivy pressed Button 2.', cause: 'Button 2 turned on Light B.', other: 'Something else turned on Light B.', only: 'Light B is wired to Button 2 and nothing else.' }),
];
export const AFTER_TOPICS: readonly AfterTopic[] = [...POST_TOPICS, ...ONLY_TOPICS];
/** The worked trick (rain after a car wash) and the worked good reason (a doorbell only its button rings). */
export const W_CAR = aft({ id: 'w-car', skin: 'everyday', speaker: 'Kai’s sister', setting: 'Kai washes the family car.', after: 'It rained right after Kai washed the car.', cause: 'Washing the car made it rain.', other: 'Clouds made it rain, not the car wash.', truth: false });
export const W_BELL = aft({ id: 'w-bell', skin: 'everyday', speaker: 'Ana', setting: 'Ana presses the button by her front door.', after: 'The doorbell rang right after Ana pressed the button.', cause: 'Ana’s press made the doorbell ring.', other: 'Something else made the doorbell ring.', only: 'Nothing but the button can ring this doorbell.' });

/** A Lesson 6 after argument: after-therefore-because, or with an only-rule its good twin. */
export function afterArg(t: AfterTopic): Arg {
  return {
    id: `${t.id}:${t.only ? 'only' : 'after'}`,
    topic: t.id,
    family: 'after',
    shape: t.only ? 'only' : 'after',
    skin: t.skin,
    setting: t.setting,
    speaker: t.speaker,
    vars: [{ id: 'k', values: [{ id: 'yes', text: t.cause }, { id: 'no', text: t.other }] }],
    // The order is true in the story, whatever caused it. An only-rule crosses out every other cause.
    givens: [line(t.after, () => true), ...(t.only ? [line(t.only, (c) => isYes(c, 'k'))] : [])],
    claim: line(t.cause, (c) => isYes(c, 'k')),
    claimMid: mid(t.cause),
    ...(t.only ? {} : { leaves: 'a reason the first thing caused the second' }),
    ...(t.truth !== undefined ? { truth: t.truth } : {}),
  };
}

// ---------- every argument a family can ask about ----------

const MOVES: readonly Move[] = ['mp', 'mt', 'ac', 'da'];
/** Every quiz argument of a family (never a worked example), in a fixed order. */
export function familyArgs(f: Family): Arg[] {
  switch (f) {
    case 'flip':
      return FLIP_TOPICS.flatMap((t) => MOVES.map((m) => flipArg(t, m)));
    case 'middle':
      return [...MIDDLE_ONE.flatMap((t) => [oneArg(t), oneArg(t, true)]), ...MIDDLE_TWO.map(twoArg)];
    case 'swap':
      return SWAP_TOPICS.flatMap((t) => [swapArg(t), swapArg(t, true)]);
    case 'circle':
      return CIRCLE_TOPICS.flatMap((t) => [circleArg(t), circleArg(t, { again: 1 }), circleArg(t, { good: true })]);
    case 'doors':
      return [...DOOR_TOPICS, ...TRUE_DOOR_TOPICS].map(doorArg);
    case 'hasty':
      return HASTY_TOPICS.flatMap((t) => [hastyArg(t), hastyArg(t, true)]);
    case 'popular':
      return [...POPULAR_TOPICS.map(popularArg), ...VOTE_TOPICS.map(voteArg)];
    case 'person':
    case 'twist':
    case 'authority':
      return PEOPLE_TOPICS.filter((t) => t.family === f).flatMap((t) => [peopleArg(t), ...(t.fact ? [peopleArg(t, true)] : [])]);
    case 'slope':
      return STEP_TOPICS.map(stepArg);
    case 'after':
      return AFTER_TOPICS.map(afterArg);
  }
}
const ARGS: Record<Family, Arg[]> = Object.fromEntries(FAMILIES.map((f) => [f, familyArgs(f)])) as Record<Family, Arg[]>;

/** Can a trap use this argument? A trick whose claim can turn out true in its story (never a claim that is really false). */
export const trapOK = (a: Arg) => !provesOf(a) && a.truth !== false;

export interface PickOpts {
  skin?: Skin;
  /** Topic ids already used in the set: a new topic is picked when one is left. */
  avoid?: Set<string>;
  /** A trick, a good reason, or either. */
  want?: 'trick' | 'good' | 'any';
  /** A trap: a trick whose claim turns out true. */
  trap?: boolean;
  /** Only these shapes. */
  shapes?: readonly Shape[];
}

/** One argument of a family, by the options; the skin is dropped when it has none left. */
export function pickArg(rng: Rng, f: Family, o: PickOpts = {}): Arg {
  const want = o.trap ? 'trick' : o.want ?? 'any';
  const ok = (a: Arg) =>
    (want === 'any' || (want === 'trick') === !provesOf(a)) && (!o.trap || trapOK(a)) && (!o.shapes || o.shapes.includes(a.shape));
  const all = ARGS[f].filter(ok);
  if (!all.length) throw new Error(`pickArg: no ${f} argument for ${JSON.stringify({ ...o, avoid: undefined })}`);
  const a = rng.pick(preferPool(all, o, (x) => x.topic, (x) => x.skin));
  o.avoid?.add(a.topic);
  return a;
}

/**
 * The pool to pick from: a new topic in the skin asked for; else a new topic in any skin (a topic is never repeated in
 * a set while another is left); else the skin; else everything.
 */
export function preferPool<T>(all: readonly T[], o: { skin?: Skin; avoid?: Set<string> }, topic: (t: T) => string, skin: (t: T) => Skin): readonly T[] {
  const fresh = (xs: readonly T[]) => xs.filter((x) => !o.avoid?.has(topic(x)));
  const skinned = o.skin ? all.filter((x) => skin(x) === o.skin) : all;
  for (const pool of [fresh(skinned), fresh(all), skinned, all]) if (pool.length) return pool;
  return all;
}

/** Every topic setting, for finding the topic an item is about (its prompt starts with the setting). */
export const ALL_ARGS: readonly Arg[] = FAMILIES.flatMap((f) => ARGS[f]);
export function argOfItem(it: { prompt: string; scene?: Scene }): Arg | undefined {
  const at = ALL_ARGS.filter((a) => it.prompt.startsWith(a.setting));
  if (it.scene?.kind === 'argument') {
    const g = JSON.stringify((it.scene as Extract<Scene, { kind: 'argument' }>).givens);
    return at.find((a) => JSON.stringify(a.givens.map((x) => x.text)) === g) ?? at[0];
  }
  return at[0];
}

// ---------- the names and the teaching words ----------

/** Each trick’s name in a sentence. */
export const TRICK_NAME: Record<TrickKind, string> = {
  flip: 'the flip trick',
  not: 'the NOT trick',
  middle: 'the middle trick',
  swap: 'the swap trick',
  circle: 'the circle trick',
  dilemma: 'the two-doors trick',
  hasty: 'the too-few trick',
  popular: 'the everybody-says trick',
  person: 'attacking the person',
  twist: 'the twisted-claim trick',
  authority: 'the famous-name trick',
  slope: 'the slippery slope',
  after: 'the after-therefore-because trick',
};
/** What each trick does, in a line. */
export const TRICK_DOES: Record<TrickKind, string> = {
  flip: 'It runs an if–then rule backward.',
  not: 'It says no IF part means no THEN part.',
  middle: 'It says two things match because they share a group.',
  swap: 'It turns “each one has one” into “one for all.”',
  circle: 'Its reason is the claim said again.',
  dilemma: 'Its either-or leaves out a third door.',
  hasty: 'It checks a few, then makes a claim about all.',
  popular: 'It counts how many people say it, not the facts.',
  person: 'It talks about the one who made the claim, not about the claim.',
  twist: 'It knocks down a claim nobody made.',
  authority: 'It trusts a famous name on a subject that person does not know.',
  slope: 'It says each step leads to the next, but gives no reason for any step.',
  after: 'It says one thing caused another just because it came first.',
};
/** What each Lesson 5 and 6 trick’s reason leaves out, in a few words. Its good twin adds it. */
export const LEAVES_OUT: Partial<Record<TrickKind, string>> = {
  person: 'the claim itself',
  twist: 'the claim that was really made',
  authority: 'whether the person knows this subject',
  slope: 'a reason for each step',
  after: 'a reason the first thing caused the second',
};
/** Why a trick’s name does not fit an argument that plays another trick (or none). */
export const NOT_HERE: Record<TrickKind, string> = {
  flip: 'The flip trick starts from the THEN part of a rule. This reason does not.',
  not: 'The NOT trick starts from no IF part. This reason does not.',
  middle: 'The middle trick links two things through a shared group. This reason does not.',
  swap: 'The swap trick turns “each has one” into “one for all.” This reason does not.',
  circle: 'The circle trick needs a given that is the claim again. No given here is.',
  dilemma: 'The two-doors trick needs an either-or that leaves a door out. No given here does that.',
  hasty: 'The too-few trick checks a few things and claims all. This reason does not.',
  popular: 'The everybody-says trick leans on what most people say. This reason does not.',
  person: 'Attacking the person puts down the one who made the claim. This reason does not.',
  twist: 'The twisted-claim trick knocks down a claim nobody made. This reason does not.',
  authority: 'The famous-name trick leans on what a famous person says. This reason does not.',
  slope: 'The slippery slope says one step will lead to a far-off end. This reason does not.',
  after: 'The after-therefore-because trick says a thing caused what came after it. This reason does not.',
};

export const TRICK_TERM = { word: 'A trick', meaning: 'a reason that sounds good but does not prove its claim. Its claim may still be true.' };
export const CASE_TERM = { word: 'A case', meaning: 'one way things could be. A case that breaks a given is crossed out.' };
export const PROVES_TERM = { word: 'Proves', meaning: 'the givens are true, and they force the claim. Then the claim must be true.' };

const FAMILY_TERM: Record<Family, { word: string; meaning: string }> = {
  flip: { word: 'The flip trick', meaning: 'using a rule backward. The THEN part happened, so it says the IF part did.' },
  middle: { word: 'The middle group', meaning: 'a group two things are both in. Being in it does not make them match.' },
  swap: { word: 'The swap trick', meaning: 'turning “each one has one” into “one is shared by all.”' },
  circle: { word: 'The circle trick', meaning: 'giving the claim again, in new words, as its own reason.' },
  doors: { word: 'The two-doors trick', meaning: 'an either-or that leaves out a door that is really there.' },
  hasty: { word: 'The too-few trick', meaning: 'checking a few things, then making a claim about all of them.' },
  popular: { word: 'The everybody-says trick', meaning: 'counting how many people say something, as if that made it true.' },
  person: { word: 'Attacking the person', meaning: 'putting down the one who made a claim, instead of looking at the claim.' },
  twist: { word: 'The twisted-claim trick', meaning: 'answering a bigger claim that nobody made, instead of the real one.' },
  authority: { word: 'The famous-name trick', meaning: 'trusting a famous person about a subject that person does not know.' },
  slope: { word: 'The slippery slope', meaning: 'saying one step will lead to the next and the next, with no reason for each step.' },
  after: { word: 'After-therefore-because', meaning: 'saying one thing caused another just because it came first.' },
};
const FAMILY_RULE: Record<Family, string> = {
  flip: 'An if–then rule works forward, and with flip and NOT. Run backward, or with NOT only, it proves nothing.',
  middle: 'Two things in one middle group do not have to match. Look for a case in the middle group but not the other group.',
  swap: 'Every kid having a favorite does not mean they share one. Each kid can pick a different one.',
  circle: 'A reason that says the claim again proves nothing. A real reason tells you something new.',
  doors: 'An either-or proves a claim only if there are really just two doors. Look for a third door.',
  hasty: 'A few checked can’t prove a claim about all. The ones you did not check could be different.',
  popular: 'Many people saying something does not make it true. A vote only proves what people picked.',
  person: 'A claim is true or false because of the facts, not because of who says it. Look at the claim, not the person.',
  twist: 'To answer a claim, answer the one that was really made. Knocking down a bigger claim proves nothing.',
  authority: 'Being famous does not make someone right about everything. Ask if the person knows this subject.',
  slope: 'Each step needs its own reason. With no reason, the steps can stop anywhere.',
  after: 'Coming first is not the same as causing. Something else could have made it happen.',
};
const FAMILY_REMEMBER: Record<Family, string> = {
  flip: 'Forward works. Flip and NOT works. Backward and NOT only are tricks.',
  middle: 'Sharing a group does not make two things match.',
  swap: '“Each has one” is not “one for all.”',
  circle: 'A reason must say something new.',
  doors: 'Before you trust an either-or, look for a third door.',
  hasty: 'To be sure about all, check all.',
  popular: 'Check the facts, not the crowd.',
  person: 'Look at the claim, not the person.',
  twist: 'Answer the claim that was really made.',
  authority: 'Famous is not the same as knowing.',
  slope: 'Each step needs its own reason.',
  after: 'After is not the same as because.',
};
const REMEMBER_ASK = 'Ask: “Is there a case that fits the givens but breaks the claim?”';

const NOT_SURE = { label: 'Not sure' };
export const TRUE_PROVED_Q: ConfusedQuestion = {
  q: 'A claim turns out to be true. Does that mean its reason proved it?',
  options: [{ label: 'No. A trick can have a true claim', right: true }, { label: 'Yes. A true claim was proved' }, NOT_SURE],
  teach: 'No. A reason proves a claim only when it forces it. A trick can land on a true claim by luck. So check the reason, not just the claim.',
};
export const TRICK_FALSE_Q: ConfusedQuestion = {
  q: 'A reason is a trick. Does that make its claim false?',
  options: [{ label: 'No. The claim might still be true', right: true }, { label: 'Yes. A trick means the claim is false' }, NOT_SURE],
  teach: 'No. A trick only fails to prove its claim. The claim might be true or false. You need a better reason to know.',
};
export const CASES_LEFT_Q: ConfusedQuestion = {
  q: 'A case breaks a given. Does it count when you check the claim?',
  options: [{ label: 'No. Only the cases left count', right: true }, { label: 'Yes. Every case counts' }, NOT_SURE],
  teach: 'No. A case that breaks a given can’t happen if the givens are true. Cross it out. Look at the claim only in the cases left.',
};
export const FAMILY_Q: Record<Family, ConfusedQuestion> = {
  flip: {
    q: 'A rule says, “If it rains, the grass gets wet.” Does wet grass prove it rained?',
    options: [{ label: 'No. Something else could wet the grass', right: true }, { label: 'Yes. The rule says so' }, NOT_SURE],
    teach: 'No. The rule only says what rain does. A sprinkler can wet the grass too. Running a rule backward is the flip trick.',
  },
  middle: {
    q: 'Bees and ants are both insects. Does that make bees ants?',
    options: [{ label: 'No. Two things can share a group and still differ', right: true }, { label: 'Yes. Things in one group match' }, NOT_SURE],
    teach: 'No. Lots of different bugs are insects. Being in the same big group does not put one thing inside the other.',
  },
  swap: {
    q: 'Every kid has a favorite game. Must they all have the same favorite?',
    options: [{ label: 'No. Each kid can pick a different game', right: true }, { label: 'Yes. Every kid means one game' }, NOT_SURE],
    teach: 'No. Ava’s favorite can be tag while Ben’s is chess. Every kid still has a favorite. But no one game is everyone’s favorite.',
  },
  circle: {
    q: 'A reason says the claim again in new words. Does it help prove the claim?',
    options: [{ label: 'No. It is the same claim', right: true }, { label: 'Yes. Any reason helps' }, NOT_SURE],
    teach: 'No. If you doubt the claim, you doubt that reason too, because they mean the same. A real reason tells you something new.',
  },
  doors: {
    q: 'An either-or names two choices. Are those always the only choices?',
    options: [{ label: 'No. Look for a third door', right: true }, { label: 'Yes. Either-or means just two' }, NOT_SURE],
    teach: 'No. A coin has just two sides. But kids can do lots of things. Before you trust an either-or, look for a third door.',
  },
  hasty: {
    q: 'You checked 5 of 6 apples, and all were sour. Is the last one sure to be sour?',
    options: [{ label: 'No. It was not checked', right: true }, { label: 'Yes. Five in a row is enough' }, NOT_SURE],
    teach: 'No. The last apple was never tasted, so it could be sweet. To be sure about all of them, you must check all of them.',
  },
  popular: {
    q: 'Most kids say something is true. Does that make it true?',
    options: [{ label: 'No. You still need to check the facts', right: true }, { label: 'Yes. Most kids can’t be wrong' }, NOT_SURE],
    teach: 'No. Lots of people can believe something false. A vote proves what people picked. It can’t prove what is true.',
  },
  person: {
    q: 'Mia is late a lot. Does that make what she says false?',
    options: [{ label: 'No. Look at the claim, not the person', right: true }, { label: 'Yes. You can’t trust a kid who is late' }, NOT_SURE],
    teach: 'No. Being late is about Mia. Her claim is about something else. Check the facts the claim is about.',
  },
  twist: {
    q: 'Someone knocks down a claim nobody made. Does that answer the real claim?',
    options: [{ label: 'No. The real claim is still not answered', right: true }, { label: 'Yes. A claim was knocked down' }, NOT_SURE],
    teach: 'No. Showing the lake is not as hot as a bath says nothing about a swim. Answer the claim that was really made.',
  },
  authority: {
    q: 'A famous singer says a cereal is the healthiest. Does that make it so?',
    options: [{ label: 'No. A singer may not know about food', right: true }, { label: 'Yes. Famous people know a lot' }, NOT_SURE],
    teach: 'No. A singer knows about songs. Food is a different subject. Being famous does not make someone right about everything.',
  },
  slope: {
    q: 'One step happens. Must every step after it happen too?',
    options: [{ label: 'No. Each step needs its own reason', right: true }, { label: 'Yes. One step always leads to the next' }, NOT_SURE],
    teach: 'No. The steps can stop anywhere. Ms. Lee can let one fish in and say no to more pets. Each step needs its own reason.',
  },
  after: {
    q: 'It rained right after Kai washed the car. Did washing the car make it rain?',
    options: [{ label: 'No. Coming first is not causing', right: true }, { label: 'Yes. The rain came right after' }, NOT_SURE],
    teach: 'No. Clouds make rain. It would have rained anyway. One thing coming first does not show it caused the next.',
  },
};

/** Given 1 says “…” Given 2 says “…” The claim says “…” */
export const meaningOf = (arg: Arg) => `${arg.givens.map((g, i) => `Given ${i + 1} says ${quote(g.text)}`).join(' ')} The claim says ${quote(arg.claim.text)}`;

/** A circle’s case card: the given and the claim are true together and false together, in every case. */
function circleCard(arg: Arg, c: Case): TeachCase {
  const t = claimIn(arg, c);
  return {
    label: `${caseName(arg, c)}: ${caseFacts(arg, c).join(' ')}`,
    truths: [{ who: 'Given 1', value: arg.givens[0].holds(c) }, { who: 'The claim', value: t }],
    note: `Given 1 is ${t ? 'true' : 'false'} here, and so is the claim. They always match, because they mean the same thing.`,
  };
}
export const cardOf = (arg: Arg, c: Case) => (arg.shape === 'circle' ? circleCard(arg, c) : caseCard(arg, c));

/** The case that shows the trick: a case left with the claim false, the circle’s false case, or the shut-out door. */
export function trickCase(arg: Arg): Case {
  const v = verdictOf(arg);
  if (v === 'circle') return allCases(arg).find((c) => !claimIn(arg, c))!;
  if (v === 'dilemma') return falseDoors(arg)[0];
  const leak = leakCase(arg);
  if (!leak) throw new Error(`trickCase: ${arg.id} proves its claim`);
  return leak;
}

/** A case left where the claim is true (every trick here has one): its claim might be true. */
export const trueCase = (arg: Arg) => realCase(arg);

const everyGiven = (arg: Arg) => (arg.givens.length === 1 ? 'Given 1 is true there' : arg.givens.length === 2 ? 'Both givens are true there' : 'Every given is true there');

/** Why a trick does not prove its claim, in short lines, ending with its name. */
export function trickDetail(arg: Arg): string[] {
  const v = verdictOf(arg);
  if (v === 'proves') throw new Error(`trickDetail: ${arg.id} proves its claim`);
  if (v === 'circle') {
    const g = arg.givens[circularGiven(arg)];
    return [`Given 1 says ${quote(g.text)} The claim says ${quote(arg.claim.text)}`, 'Those mean the same thing. The reason is the claim in new words.', 'If you doubt the claim, you doubt the reason too. So it proves nothing.'];
  }
  if (v === 'dilemma') {
    const c = trickCase(arg);
    return [`Given 1 says ${quote(arg.givens[0].text)}`, `But a third door is really there: ${caseMid(arg, c)}. The first line of the story says so.`, 'So given 1 is false. A false given proves nothing.'];
  }
  const c = trickCase(arg);
  const note = arg.note?.(c);
  return [`Picture ${caseName(arg, c).toLowerCase()}: ${caseMid(arg, c)}.${note ? ` ${note}` : ''}`, `${everyGiven(arg)}, and the claim is false. So the givens do not force it.`, `This is ${TRICK_NAME[v]}. ${TRICK_DOES[v]}${leavesLine(arg)}`];
}
/** “ It leaves out anything about the pool.”, for a trick that says what its reason leaves out (else empty). */
export const leavesLine = (arg: Arg) => (arg.leaves ? ` It leaves out ${arg.leaves}.` : '');

/** The right answer’s explanation for a trick. */
export function trickExplain(arg: Arg): string {
  const v = verdictOf(arg);
  if (v === 'circle') return 'Given 1 is the claim in new words. So the reason goes in a circle, and it proves nothing. The claim might be true or false.';
  if (v === 'dilemma') return `Given 1 leaves out a third door: ${caseMid(arg, trickCase(arg))}. So given 1 is false, and the reason proves nothing. The claim might be true or false.`;
  const c = trickCase(arg);
  return `${caseName(arg, c)} fits the givens: ${caseMid(arg, c)}. But the claim is false there. So it is ${TRICK_NAME[v as TrickKind]}.${leavesLine(arg)} The claim might be true or false.`;
}

/** What a good reason has that its trick twin leaves out, said after the cases. */
const GOOD_TAIL: Partial<Record<Shape, string>> = {
  'circle-good': ' And no given is the claim said again.',
  'doors-good': ' And there are really just two doors, so the either-or is true.',
  'person-good': ' The reason is about the claim itself, not about a person.',
  'twist-good': ' The reason answers the claim that was really made.',
  'authority-good': ' The reason checks the claim itself, not a famous name.',
  chain: ' Each step has its own rule.',
  only: ' A rule says nothing else could have caused it.',
};

/** The right answer’s explanation for a good reason. */
export function goodExplain(arg: Arg): string {
  const tail = GOOD_TAIL[arg.shape] ?? '';
  return `${statusReason(arg)} So the givens force the claim. They prove it.${tail}`;
}

/** “Your answer says the reason proves the claim, but …”: the headline for each trick. */
function provesHead(v: TrickKind): string {
  if (v === 'circle') return 'Your answer says the reason proves the claim, but the reason is the claim said again.';
  if (v === 'dilemma') return 'Your answer says the reason proves the claim, but given 1 shuts out a door that is really there.';
  return 'Your answer says the reason proves the claim, but one case fits the givens and breaks the claim.';
}

const SIMPLER: Record<Family, (arg: Arg) => string[]> = {
  flip: (arg) => [`Read the rule: ${quote(arg.givens[0].text)}`, 'It tells you what happens when the IF part happens. Nothing more.', 'Picture each case. Cross out the cases that break a given.', 'Is the claim true in every case left? Then it is proved. If not, it is a trick.'],
  middle: (arg) => [arg.picture ?? 'Picture the one thing the argument is about.', 'Can it be in the middle group without being in the other group?', 'If yes, the claim does not follow. That is the middle trick.'],
  swap: () => ['Picture each kid picking a favorite.', 'Can the kids pick different ones? Then every kid has a favorite, but no one favorite is shared.', 'So “each has one” does not prove “one for all.”'],
  circle: () => ['Read the reason. Then read the claim.', 'Do they say the same thing in new words?', 'If yes, the reason goes in a circle. It proves nothing new.'],
  doors: () => ['Read the either-or given.', 'Look at the story. Is there a third door?', 'If there is, the either-or is false, and it proves nothing.'],
  hasty: () => ['Count how many were checked. Count how many there are.', 'Any not checked could be different.', 'So a few can’t prove all. Only checking all can.'],
  popular: (arg) => ['Ask: is the claim about what people picked, or about the world?', 'Many people can be wrong about the world.', 'So to know if it is true, check the facts.', ...(arg.settle ? [arg.settle] : [])],
  person: () => ['Read the reason. Is it about the claim, or about the person who made it?', 'A reason about the person can’t prove the claim.', 'So check the facts the claim is about.'],
  twist: () => ['Read what was really said. Then read what the reason answers.', 'Are they the same claim?', 'If not, the reason answers a claim nobody made. It proves nothing.'],
  authority: () => ['Ask: what is this person famous for?', 'Is the claim about that subject?', 'If not, their word does not prove it.'],
  slope: (arg) => [...(arg.picture ? [arg.picture] : []), 'For each step, ask: is there a rule that it leads to the next?', 'If a step has no rule, the steps can stop there.'],
  after: () => ['Ask: did the first thing make the second happen, or did it just come first?', 'Look for something else that could have caused it.', 'If something else could have, coming first proves nothing.'],
};

/** The teaching every item about an argument carries: the rule, the words, every case, and what to remember. */
export function argTeach(arg: Arg, extra: TeachCase[] = []): Teach {
  return {
    rule: FAMILY_RULE[arg.family],
    terms: [TRICK_TERM, CASE_TERM, PROVES_TERM, FAMILY_TERM[arg.family]],
    meaning: meaningOf(arg),
    casesTitle: 'Every case',
    cases: [...allCases(arg).map((c) => cardOf(arg, c)), ...extra],
    remember: [FAMILY_REMEMBER[arg.family], 'A true claim is not always a proved claim.', REMEMBER_ASK],
    simpler: SIMPLER[arg.family](arg),
  };
}

/** The hint’s case: a crossed-out case when there is one, else a case left where the claim is true. Never the answer. */
export function hintCaseOf(arg: Arg): TeachCase {
  const out = allCases(arg).find((c) => breaks(arg, c) >= 0 && !(arg.givens[breaks(arg, c)].door));
  const c = out ?? casesLeft(arg).find((x) => claimIn(arg, x))!;
  // A plain case card: a circle’s card would say the given and the claim always match, which is the answer.
  return caseCard(arg, c);
}
export const CASE_HINT = 'Here is one case, already checked. Check the other cases the same way.';

/** The pass rule’s tag: every pack holds a trick whose claim happens to be true. */
export const TRUE_TRICK = { tag: 'true-trick', label: 'a trick whose claim happens to be true' } as const;
export const WHY_TAG = 'why';

// ---------- the case board (a Do board’s rows, and a question’s thinking board) ----------

export const CASE_OPTIONS: DrillOption[] = [{ id: 'out', label: 'Crossed out' }, { id: 'yes', label: 'Left: claim true' }, { id: 'no', label: 'Left: claim false' }];
export const CASE_CLOSING = 'Those ideas are apart now. Back to the board: check one case at a time.';
export const caseRowId = (arg: Arg, c: Case) => `case${caseIndex(arg, c) + 1}`;
/** A case’s mark: crossed out when it breaks a given, else whether the claim is true there. */
export const caseAnswer = (arg: Arg, c: Case) => (breaks(arg, c) >= 0 ? 'out' : claimIn(arg, c) ? 'yes' : 'no');

/** One case as a board row: crossed out, or left with the claim true or false. Every wrong option says why. */
export function caseRow(arg: Arg, c: Case): DrillRow {
  const id = caseRowId(arg, c);
  const answer = caseAnswer(arg, c);
  const gi = breaks(arg, c);
  const t = claimIn(arg, c);
  const why: Record<string, string> = {};
  for (const o of CASE_OPTIONS) {
    if (o.id === answer) continue;
    if (gi >= 0) why[o.id] = `${givenWhy(arg, gi, c)} So cross this case out.`;
    else if (o.id === 'out') why[o.id] = `This case breaks no given. ${arg.givens.map((_, i) => givenWhy(arg, i, c)).join(' ')}`;
    else why[o.id] = `The claim says “${arg.claim.text}” Here, ${caseMid(arg, c)}. So the claim is ${t ? 'true' : 'false'} here.`;
  }
  return { id, label: `${caseName(arg, c)}: ${caseFacts(arg, c).join(' ')}`, marks: [{ id, label: 'Crossed out or left?', options: CASE_OPTIONS, answer, why }] };
}

/** The thinking board on a question about an argument (Item.scratch, “the case board”): each case, crossed out or left. */
export function caseScratch(arg: Arg): DrillStep {
  return {
    id: 's12.case-board',
    title: 'Check each case',
    body: ['Cross out each case that breaks a given.', 'For each case left, is the claim true?'],
    rows: allCases(arg).map((c) => caseRow(arg, c)),
    done: '',
    words: { closing: CASE_CLOSING },
  };
}
const scratchOf = (arg: Arg): Pick<ChooseCore, 'scratch' | 'scratchLabel'> => ({ scratch: caseScratch(arg), scratchLabel: 'the case board' });

// ---------- the items ----------

export type TrickItemKind = 'prove' | 'name' | 'case' | 'true' | 'again' | 'door' | 'enough' | 'why';
export type ChooseCore = Omit<ChooseItem, 'id' | 'stop' | 'lesson' | 'skill'>;
/** A made item: its skill tag, its kind and its argument (for the tests). */
export interface TrickMade {
  tag: string;
  kind: TrickItemKind;
  item: ChooseCore;
  arg: Arg;
}

/** Items read long (an argument and its cases): 120 seconds in a check. */
export const TRICK_SECONDS = 120;

function done(kind: TrickItemKind, arg: Arg, item: ChooseCore, tag = FAMILY_SKILL[arg.family]): TrickMade {
  item.seconds = TRICK_SECONDS;
  syncWhyWrong(item);
  return { tag, kind, item, arg };
}

/** The question’s first lines: the setting, how the speaker retells the claim (the twisted-claim trick), who gives the reason. */
const ask = (arg: Arg) => `${arg.setting}${arg.retell ? ` ${arg.retell}` : ''} ${arg.speaker} gives this reason.`;
const helpFor = (arg: Arg): Pick<ChooseCore, 'confused'> => ({ confused: [TRUE_PROVED_Q, FAMILY_Q[arg.family]] });

export const PROVE_CHOICES: readonly Choice[] = [
  { id: 'proves', label: 'It proves the claim. The claim must be true.' },
  { id: 'trick', label: 'It is a trick. The claim might be true or false.' },
  { id: 'false', label: 'It is a trick, so the claim must be false.' },
];

/** What a wrong “proves” or “trick” says, for an argument (shared by every item that asks it). */
function provesFeedback(arg: Arg): ChoiceFeedback {
  const v = verdictOf(arg) as TrickKind;
  return { headline: provesHead(v), detail: trickDetail(arg), example: cardOf(arg, trickCase(arg)) };
}
function trickFeedback(arg: Arg, picked = 'Your answer calls it a trick'): ChoiceFeedback {
  const left = casesLeft(arg);
  return { headline: `${picked}, but the givens force the claim.`, detail: [statusReason(arg), 'So the claim must be true. The reason proves it.'], example: cardOf(arg, left[0]) };
}
function falseFeedback(arg: Arg): ChoiceFeedback {
  if (provesOf(arg)) return { headline: 'Your answer says the claim must be false, but the givens force it to be true.', detail: [statusReason(arg)], example: cardOf(arg, casesLeft(arg)[0]) };
  const c = trueCase(arg);
  return {
    headline: 'Your answer says the claim must be false, but a trick does not make a claim false.',
    detail: [`In ${caseName(arg, c).toLowerCase()}, ${caseMid(arg, c)}. That fits every given, and the claim is true there.`, 'A trick only fails to prove its claim. The claim might still be true.'],
    example: cardOf(arg, c),
  };
}

/** Does the reason prove the claim? Proves, a trick (might be true or false), or a trick that makes it false. */
export function proveItem(rng: Rng, f: Family, o: PickOpts = {}): TrickMade {
  const arg = pickArg(rng, f, o);
  const proves = provesOf(arg);
  const answer = proves ? 'proves' : 'trick';
  const feedback: Record<string, ChoiceFeedback> = proves ? { trick: trickFeedback(arg), false: falseFeedback(arg) } : { proves: provesFeedback(arg), false: falseFeedback(arg) };
  return done('prove', arg, {
    kind: 'choose',
    prompt: `${ask(arg)} Does the reason prove the claim?`,
    scene: argScene(arg),
    choices: PROVE_CHOICES.map((c) => ({ ...c })),
    answer,
    explain: proves ? goodExplain(arg) : trickExplain(arg),
    feedback,
    hint: CASE_HINT,
    hintCase: hintCaseOf(arg),
    teach: argTeach(arg),
    ...helpFor(arg),
    ...scratchOf(arg),
  });
}

/** “A good reason” and the lesson’s tricks (two, or three in Lesson 5), by name. */
export const NAME_LABEL: Record<Verdict, string> = {
  proves: 'A good reason. It proves the claim.',
  flip: 'The flip trick. It runs the rule backward.',
  not: 'The NOT trick. It says no IF part means no THEN part.',
  middle: 'The middle trick. It says sharing a group makes them match.',
  swap: 'The swap trick. It turns “each has one” into “one for all.”',
  circle: 'The circle trick. The reason is the claim again.',
  dilemma: 'The two-doors trick. It leaves out a third door.',
  hasty: 'The too-few trick. It checks a few and claims all.',
  popular: 'The everybody-says trick. It counts who says it, not the facts.',
  // Lessons 5 and 6: the label names what the trick’s reason leaves out (LEAVES_OUT), the brief’s right answer.
  person: `Attacking the person. It talks about who made the claim. It leaves out ${LEAVES_OUT.person}.`,
  twist: `The twisted-claim trick. It answers a claim nobody made. It leaves out ${LEAVES_OUT.twist}.`,
  authority: `The famous-name trick. It leaves out ${LEAVES_OUT.authority}.`,
  slope: `The slippery slope. It leaves out ${LEAVES_OUT.slope}.`,
  after: `After-therefore-because. It leaves out ${LEAVES_OUT.after}.`,
};

/** Which is it: a good reason, or one of the lesson’s tricks (two, or three in Lesson 5)? */
export function nameItem(rng: Rng, lesson: string, o: PickOpts & { family?: Family } = {}): TrickMade {
  const families = LESSON_FAMILIES[lesson];
  const kinds = LESSON_TRICKS[lesson];
  // A good reason about a third of the time; else a trick from one of the lesson’s families (or the one asked for).
  const want = o.want ?? (rng.chance(0.34) ? 'good' : 'trick');
  const family = o.family && families.includes(o.family) ? o.family : rng.pick(families);
  const arg = pickArg(rng, family, { ...o, want });
  const v = verdictOf(arg);
  const ids: Verdict[] = ['proves', ...kinds];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const id of ids) {
    if (id === v) continue;
    if (id === 'proves') feedback.proves = provesFeedback(arg);
    else if (v === 'proves') feedback[id] = trickFeedback(arg, `Your answer calls it ${TRICK_NAME[id]}`);
    else feedback[id] = { headline: `Your answer names ${TRICK_NAME[id]}, but this is ${TRICK_NAME[v]}.`, detail: [NOT_HERE[id], ...trickDetail(arg)], example: cardOf(arg, trickCase(arg)) };
  }
  return done('name', arg, {
    kind: 'choose',
    prompt: `${ask(arg)} Is it a good reason or a trick? Which one?`,
    scene: argScene(arg),
    choices: ids.map((id) => ({ id, label: NAME_LABEL[id] })),
    answer: v,
    explain: v === 'proves' ? goodExplain(arg) : trickExplain(arg),
    feedback,
    hint: CASE_HINT,
    hintCase: hintCaseOf(arg),
    teach: argTeach(arg),
    ...helpFor(arg),
    ...scratchOf(arg),
  });
}

const caseId = (arg: Arg, c: Case) => `case${caseIndex(arg, c) + 1}`;

/** The claim does not follow: which case shows it? Every case is a choice (one case left with the claim false). */
export function caseItem(rng: Rng, f: Family, o: PickOpts = {}): TrickMade {
  const arg = pickArg(rng, f, { ...o, want: 'trick' });
  const leak = trickCase(arg);
  // Keep one case that shows it: the other leaks are left out, so exactly one choice is right.
  const shown = allCases(arg).filter((c) => sameCase(c, leak) || breaks(arg, c) >= 0 || claimIn(arg, c));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of shown) {
    if (sameCase(c, leak)) continue;
    const gi = breaks(arg, c);
    feedback[caseId(arg, c)] =
      gi >= 0
        ? { headline: `That case breaks given ${gi + 1}, so it can’t happen if the givens are true.`, detail: [givenWhy(arg, gi, c), 'Look for a case that fits every given but makes the claim false.'], example: cardOf(arg, c) }
        : { headline: 'In that case, the claim is true, so it does not show the trick.', detail: [`${cap(caseMid(arg, c))}. That fits every given, and the claim is true.`, 'Look for a case that fits every given but makes the claim false.'], example: cardOf(arg, c) };
  }
  const note = arg.note?.(leak);
  const hint = shown.find((c) => breaks(arg, c) >= 0) ?? shown.find((c) => !sameCase(c, leak))!;
  return done('case', arg, {
    kind: 'choose',
    prompt: `${ask(arg)} The claim does not follow. Which case shows that?`,
    scene: argScene(arg),
    choices: rng.shuffle(shown.map((c) => ({ id: caseId(arg, c), label: caseFacts(arg, c).join(' ') }))),
    answer: caseId(arg, leak),
    explain: `That case fits every given: ${caseMid(arg, leak)}.${note ? ` ${note}` : ''} But the claim is false there. So the givens do not force the claim.`,
    feedback,
    hint: 'Here is one case, already checked. Look for a case that fits every given but makes the claim false.',
    hintCase: cardOf(arg, hint),
    teach: argTeach(arg),
    confused: [CASES_LEFT_Q, FAMILY_Q[arg.family]],
  });
}

/** “Later, you find out the claim is true: the bell rang.” */
export const laterLine = (arg: Arg) => (arg.truth === true ? `The claim is really true: ${arg.claimMid}.` : `Later, you find out the claim is true: ${arg.claimMid}.`);

export const TRUE_CHOICES: readonly Choice[] = [
  { id: 'forces', label: 'Yes. The givens force the claim, so they prove it.' },
  { id: 'true', label: 'Yes. The claim turned out true, so the reason proved it.' },
  { id: 'trick', label: 'No. It is a trick. The claim just happens to be true.' },
];

/**
 * The trap: the claim turns out true. Did the reason prove it? A trick (the pack’s trap, tagged true-trick), or with
 * good: true, a good reason whose claim is true (its twin, for new examples after a miss).
 */
export function trueItem(rng: Rng, f: Family, o: PickOpts & { good?: boolean } = {}): TrickMade {
  const arg = pickArg(rng, f, o.good ? { ...o, want: 'good' } : { ...o, trap: true });
  const proves = provesOf(arg);
  const twin = MIDDLE_TWO.find((t) => t.id === arg.topic && arg.shape === 'two')?.twin;
  const feedback: Record<string, ChoiceFeedback> = {
    true: proves
      ? { headline: 'Your answer says a true claim was proved because it is true. That is not why.', detail: ['The reason does prove this claim. But not because the claim is true.', statusReason(arg), 'It is proved because the givens force it.'], example: cardOf(arg, casesLeft(arg)[0]) }
      : {
          headline: 'Your answer says a true claim was proved, but true is not the same as proved.',
          detail: ['The claim did turn out true. But the reason did not force it.', ...trickDetail(arg), ...(twin ? [`Same shape, new words: ${quote(twin)} That claim is false.`] : [])],
          example: cardOf(arg, trickCase(arg)),
        },
    ...(proves ? { trick: trickFeedback(arg) } : { forces: provesFeedback(arg) }),
  };
  return done('true', arg, {
    kind: 'choose',
    prompt: `${ask(arg)} ${laterLine(arg)} Did the reason prove the claim?`,
    scene: argScene(arg, { real: true }),
    choices: rng.shuffle(TRUE_CHOICES.map((c) => ({ ...c }))),
    answer: proves ? 'forces' : 'trick',
    explain: proves ? `${goodExplain(arg)} It is true, and it was proved.` : `The claim is true, but the reason did not prove it. ${trickExplain(arg).replace(/ The claim might be true or false\.$/, '')}`,
    feedback,
    hint: CASE_HINT,
    hintCase: hintCaseOf(arg),
    teach: argTeach(arg),
    ...(proves ? {} : { tags: [TRUE_TRICK.tag] }),
    conflict: true,
    ...helpFor(arg),
    ...scratchOf(arg),
  });
}

/** Lesson 3: which reason just says the claim again? One reason says it again; two say something new. */
export function againItem(rng: Rng, o: PickOpts = {}): TrickMade {
  const t = rng.pick(preferPool(CIRCLE_TOPICS, o, (x) => x.id, (x) => x.skin));
  o.avoid?.add(t.id);
  const k = rng.int(0, 1) as 0 | 1;
  const arg = circleArg(t, { again: k });
  const reasons = reasonsOf(t);
  const shown = [reasons[k], reasons[2], reasons[3]];
  const ids = ['again', 'new1', 'new2'];
  const right = shown.findIndex(saysAgain);
  const again = shown[right].text;
  const both: TeachCase = {
    label: `Say this is false: ${quote(t.claim[0])}`,
    truths: [{ who: 'The claim', value: false }, { who: 'The reason that says it again', value: false }],
    note: 'The claim and that reason are false together, every time. They mean the same thing.',
  };
  const feedback: Record<string, ChoiceFeedback> = {};
  shown.forEach((r, i) => {
    if (i === right) return;
    feedback[ids[i]] = {
      headline: 'Your answer gives a new reason, not the claim again.',
      detail: [`${quote(r.text)} tells you something new. You could check it on its own.`, `${quote(again)} is the claim in new words. It means the same thing.`],
      example: both,
    };
  });
  const other = shown.find((_, i) => i !== right)!;
  return done('again', arg, {
    kind: 'choose',
    prompt: `${t.setting} ${t.speaker} says, ${quote(t.claim[0])} Which reason just says the claim again?`,
    scene: { kind: 'text', lines: [`The claim: ${t.claim[0]}`] },
    choices: rng.shuffle(shown.map((r, i) => ({ id: ids[i], label: r.text }))),
    answer: ids[right],
    explain: `${quote(again)} means the same as the claim. It just says the claim again, so it goes in a circle. The other two reasons say something new.`,
    feedback,
    hint: 'Here is one reason, already checked. Check the others the same way.',
    hintCase: { label: quote(other.text), note: 'This tells you something new. You could check it without knowing if the claim is true.' },
    teach: {
      rule: FAMILY_RULE.circle,
      terms: [TRICK_TERM, FAMILY_TERM.circle],
      meaning: `The claim says ${quote(t.claim[0])} A reason that means the same thing is no help.`,
      casesTitle: 'Each reason',
      cases: shown.map((r) => ({ label: quote(r.text), note: saysAgain(r) ? 'It means the same as the claim. It goes in a circle.' : 'It says something new. You could check it on its own.' })),
      remember: [FAMILY_REMEMBER.circle, 'Ask: “If I doubt the claim, do I doubt this reason too?”'],
      simpler: SIMPLER.circle(arg),
    },
    confused: [FAMILY_Q.circle, TRUE_PROVED_Q],
  });
}

/** Lesson 3: which case does the either-or shut out, though it can really happen? */
export function doorItem(rng: Rng, o: PickOpts = {}): TrickMade {
  const arg = pickArg(rng, 'doors', { ...o, want: 'trick' });
  const third = falseDoors(arg)[0];
  const cases = allCases(arg);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of cases) {
    if (sameCase(c, third)) continue;
    const gi = breaks(arg, c);
    feedback[caseId(arg, c)] =
      gi === 1
        ? { headline: 'Given 1 lets that case in. Given 2 is what crosses it out.', detail: [`Given 1 says ${quote(arg.givens[0].text)} That case fits it.`, 'Look for a case that given 1 shuts out.'], example: cardOf(arg, c) }
        : { headline: 'That case fits both givens. It is the claim, not a door that was shut out.', detail: [`Given 1 lets it in, and so does given 2.`, 'Look for a case that given 1 shuts out.'], example: cardOf(arg, c) };
  }
  return done('door', arg, {
    kind: 'choose',
    prompt: `${ask(arg)} Which case does given 1 shut out, even though it can really happen?`,
    scene: argScene(arg),
    choices: rng.shuffle(cases.map((c) => ({ id: caseId(arg, c), label: caseFacts(arg, c).join(' ') }))),
    answer: caseId(arg, third),
    explain: `Given 1 shuts out a case that can really happen: ${caseMid(arg, third)}. The first line of the story says so. So given 1 is false.`,
    feedback,
    hint: 'Here is one case, already checked. Check the others against given 1.',
    hintCase: cardOf(arg, cases.find((c) => breaks(arg, c) === 1)!),
    teach: argTeach(arg),
    confused: [FAMILY_Q.doors, TRICK_FALSE_Q],
  });
}

/**
 * Lesson 4: which reason proves the claim? Each choice says how many were checked and how they came out. The answer is
 * worked out thing by thing (every way the things could be): a reason proves the claim when no way that fits it breaks it.
 */
export type EnoughClaim = 'all' | 'some';
export interface Checked {
  /** How many were checked. */
  m: number;
  /** Each one checked had the feature (else one of them did not). */
  fits: boolean;
}
/** Every way n things could be (true: has the feature). */
const ways = (n: number): boolean[][] => Array.from({ length: 2 ** n }, (_, b) => Array.from({ length: n }, (_, i) => ((b >> i) & 1) === 1));
/** Does this reason force the claim, over every way the n things could be? */
export function enoughProves(n: number, r: Checked, claim: EnoughClaim): boolean {
  const fit = ways(n).filter((w) => (r.fits ? w.slice(0, r.m).every(Boolean) : r.m > 0 && !w.slice(0, r.m).every(Boolean)));
  return fit.length > 0 && fit.every((w) => (claim === 'all' ? w.every(Boolean) : w.some(Boolean)));
}
const checkedLabel = (t: HastyTopic, r: Checked): string => {
  if (r.m === 0) return `${t.who} has not ${t.done} any ${t.thing[1]} yet.`;
  if (r.m === t.n) return `${t.who} ${t.verb} all ${t.n}, and all ${t.n} were ${t.is[0]}.`;
  if (r.m === 1) return `${t.who} ${t.verb} 1 ${t.thing[0]}, and it was ${r.fits ? t.is[0] : t.is[1]}.`;
  if (r.m === 2) return `${t.who} ${t.verb} 2, and both were ${t.is[0]}.`;
  return `${t.who} ${t.verb} ${r.m}, and all ${r.m} were ${t.is[0]}.`;
};
export const ENOUGH_CHOICES: Record<EnoughClaim, (t: HastyTopic) => Checked[]> = {
  all: (t) => [{ m: t.k, fits: true }, { m: t.n - 1, fits: true }, { m: t.n, fits: true }],
  some: () => [{ m: 1, fits: true }, { m: 1, fits: false }, { m: 0, fits: true }],
};

/** The hint’s reason, marked: how many it left unchecked (or what it found), and whether it proves the claim. */
function hintNote(t: HastyTopic, r: Checked, claim: EnoughClaim, proves: boolean): string {
  const verdict = proves ? 'So this proves the claim.' : 'So this does not prove the claim.';
  if (claim === 'all') {
    const left = t.n - r.m;
    return `${left === 0 ? 'None' : String(left)} left not checked. ${verdict}`;
  }
  return `${r.m === 0 ? 'Nothing checked yet.' : `This one was ${r.fits ? t.is[0] : t.is[1]}.`} ${verdict}`;
}

export function enoughItem(rng: Rng, o: PickOpts & { claim?: EnoughClaim } = {}): TrickMade {
  const t = rng.pick(preferPool(HASTY_TOPICS, o, (x) => x.id, (x) => x.skin));
  o.avoid?.add(t.id);
  const claim = o.claim ?? (rng.chance(0.6) ? 'all' : 'some');
  const arg = hastyArg(t);
  const rs = ENOUGH_CHOICES[claim](t);
  const ok = rs.map((r) => enoughProves(t.n, r, claim));
  if (ok.filter(Boolean).length !== 1) throw new Error(`enoughItem: ${t.id} ${claim} needs one reason that proves it`);
  const right = ok.indexOf(true);
  const claimText = claim === 'all' ? `all ${t.n} ${t.thing[1]} ${t.place} are ${t.is[0]}` : `at least one of the ${t.n} ${t.thing[1]} ${t.place} is ${t.is[0]}`;
  const ids = rs.map((_, i) => `r${i}`);
  const feedback: Record<string, ChoiceFeedback> = {};
  rs.forEach((r, i) => {
    if (i === right) return;
    const left = t.n - r.m;
    feedback[ids[i]] =
      claim === 'all'
        ? { headline: `Your answer leaves ${left === 1 ? `1 ${t.thing[0]}` : `${left} ${t.thing[1]}`} not checked, so it can’t prove all ${t.n}.`, detail: [`${checkedLabel(t, r)}`, `The other ${left === 1 ? 'one was' : `${left} were`} never ${t.done}. One could be ${t.is[1]}.`, `To be sure about all ${t.n}, ${t.who} must check all ${t.n}.`], example: { label: `${t.who} ${t.verb} ${r.m}, and all were ${t.is[0]}. ${left} not checked.`, truths: [{ who: `Every ${t.thing[0]} checked is ${t.is[0]}`, value: true }, { who: `All ${t.n} are ${t.is[0]}`, value: false }], note: `Say the last ${t.thing[0]} is ${t.is[1]}. That fits the reason, but the claim is false.` } }
        : r.m === 0
          ? { headline: `Your answer checks nothing, so it shows nothing.`, detail: [`${checkedLabel(t, r)}`, `To show that at least one is ${t.is[0]}, find one that is.`], example: { label: `None checked yet.`, note: `Every ${t.thing[0]} could still be ${t.is[1]}.` } }
          : { headline: `Your answer found a ${t.thing[0]} that is ${t.is[1]}. That does not show one is ${t.is[0]}.`, detail: [`${checkedLabel(t, r)}`, `To show that at least one is ${t.is[0]}, find one that is.`], example: { label: `${t.who} ${t.verb} 1, and it was ${t.is[1]}.`, note: `Every other ${t.thing[0]} could be ${t.is[1]} too.` } };
  });
  const hintR = rs.findIndex((_, i) => i !== right);
  return done('enough', arg, {
    kind: 'choose',
    prompt: `${t.setting} Which reason proves that ${claimText}?`,
    choices: rng.shuffle(rs.map((r, i) => ({ id: ids[i], label: checkedLabel(t, r) }))),
    answer: ids[right],
    explain:
      claim === 'all'
        ? `Only checking all ${t.n} leaves none unchecked. Any ${t.thing[0]} not checked could be ${t.is[1]}.`
        : `One ${t.thing[0]} that is ${t.is[0]} is enough to show that at least one is. You don’t have to check them all.`,
    feedback,
    hint: 'Here is one reason, already checked. Check the others the same way.',
    hintCase: { label: checkedLabel(t, rs[hintR]), note: hintNote(t, rs[hintR], claim, ok[hintR]) },
    teach: {
      rule: claim === 'all' ? FAMILY_RULE.hasty : 'To show that at least one is true, one example is enough. To show all, you must check all.',
      terms: [TRICK_TERM, FAMILY_TERM.hasty, { word: 'At least one', meaning: 'one or more. It is the same as “some.”' }],
      meaning: `The claim is that ${claimText}.`,
      casesTitle: 'Each reason',
      cases: rs.map((r, i) => ({ label: checkedLabel(t, r), note: ok[i] ? 'This proves the claim.' : 'This does not prove the claim.' })),
      remember: [claim === 'all' ? FAMILY_REMEMBER.hasty : 'For “some,” one example is enough.', 'Ask: “Could one I did not check be different?”'],
      simpler: SIMPLER.hasty(arg),
    },
    confused: [FAMILY_Q.hasty, TRICK_FALSE_Q],
  });
}

/** The reasons a why item can offer: why each trick is a trick, and the wrong reason that the claim is false. */
export const WHY_LABEL: Record<TrickKind | 'false', string> = {
  flip: 'It runs the rule backward. The THEN part can happen without the IF part.',
  not: 'It says no IF part means no THEN part. The rule never says that.',
  middle: 'Two things share a middle group. That does not make them match.',
  swap: 'Each one having its own is not the same as one for all.',
  circle: 'Its reason is just the claim said again in new words.',
  dilemma: 'Its either-or shuts out a third door that is really there.',
  hasty: 'It checks only a few, then makes a claim about all of them.',
  popular: 'Lots of people saying something does not make it true.',
  person: 'It talks about the one who made the claim. It leaves out the claim itself.',
  twist: 'It knocks down a claim nobody made. It leaves out the real claim.',
  authority: 'It trusts a famous name. It leaves out whether that person knows this subject.',
  slope: 'It says one step leads to the next. It leaves out a reason for each step.',
  after: 'It says the first thing caused the second because it came first. It leaves out a real reason.',
  false: 'Its claim is false, and a false claim can’t be proved.',
};
/**
 * Tricks that are too close to tell apart in a why item (an “All” middle trick is a flip trick in other words; a crowd and
 * a famous name both lean on who says it; “not as hot as a bath, so too cold” leaves out a door in between).
 */
const CLOSE: Partial<Record<TrickKind, readonly TrickKind[]>> = {
  flip: ['not', 'middle'],
  not: ['flip', 'middle'],
  middle: ['flip', 'not', 'swap'],
  swap: ['middle'],
  popular: ['person', 'authority'],
  person: ['popular'],
  authority: ['popular'],
  twist: ['dilemma'],
  dilemma: ['twist'],
};

/**
 * The closing why item: a trick whose claim is true. Why is it a trick? Its own reason, two reasons from other tricks,
 * and “its claim is false” (it is not: true is not the same as proved).
 */
export function whyItem(rng: Rng, o: PickOpts & { kind?: TrickKind } = {}): TrickMade {
  const kind = o.kind ?? rng.pick(TRICK_KINDS);
  const f = KIND_FAMILY[kind];
  const shapes: readonly Shape[] | undefined = kind === 'flip' ? ['ac'] : kind === 'not' ? ['da'] : undefined;
  const arg = pickArg(rng, f, { ...o, trap: true, ...(shapes ? { shapes } : {}) });
  const v = verdictOf(arg) as TrickKind;
  if (v !== kind) throw new Error(`whyItem: ${arg.id} is ${v}, not ${kind}`);
  const others = TRICK_KINDS.filter((k) => k !== v && !CLOSE[v]?.includes(k) && FAMILY_LESSON[KIND_FAMILY[k]] !== FAMILY_LESSON[f]);
  const [d1, d2] = rng.shuffle(others);
  const ids: (TrickKind | 'false')[] = [v, d1, d2, 'false'];
  const feedback: Record<string, ChoiceFeedback> = {
    false: {
      headline: 'Your answer says the claim is false, but it is true here.',
      detail: [laterLine(arg), 'A trick can have a true claim. It is a trick because of its reason.', `This is ${TRICK_NAME[v]}. ${TRICK_DOES[v]}`],
      example: cardOf(arg, trickCase(arg)),
    },
  };
  for (const d of [d1, d2]) feedback[d] = { headline: `Your answer names ${TRICK_NAME[d]}, but this is ${TRICK_NAME[v]}.`, detail: [NOT_HERE[d], ...trickDetail(arg)], example: cardOf(arg, trickCase(arg)) };
  return done(
    'why',
    arg,
    {
      kind: 'choose',
      prompt: `${ask(arg)} ${laterLine(arg)} But the reason is a trick. Why is it a trick?`,
      scene: argScene(arg, { real: true }),
      choices: rng.shuffle(ids.map((id) => ({ id, label: WHY_LABEL[id] }))),
      answer: v,
      explain: `The claim is true, but the reason does not prove it. ${trickExplain(arg).replace(/ The claim might be true or false\.$/, '')}`,
      feedback,
      hint: CASE_HINT,
      hintCase: hintCaseOf(arg),
      teach: argTeach(arg),
      tags: [WHY_TAG],
      conflict: true,
      ...helpFor(arg),
    },
    'why',
  );
}
