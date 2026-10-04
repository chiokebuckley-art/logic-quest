/**
 * Stop 7, Lesson 4 · Fair choices (kid-safe reasoning about what is fair).
 *
 * The model: a short story with facts (whose name is on a tag, what was promised, who broke something, whose turn it
 * is) and choices. Each choice is a small set of features: does it lie, does it hide something, does the owner get
 * what they are owed, does it tease, does it blame someone, does someone lose what is theirs. Three checks come from
 * those features, never from a hand-set answer:
 *
 *   Honest?          no lie and nothing hidden
 *   Fair?            the owner gets what they are owed (their thing back, the promise kept, the truth, their turn)
 *   Hurts no one?    no teasing, no blame, and no one loses what is theirs
 *
 * The fair choice is the one choice that passes all three. A reason is right when it names the story fact that
 * decides it (the name tag, the promise), not a wish, a saying, a fact the story never gives, or “nobody would know”.
 * A wish (a friend wants it, everyone says so) is not a feature of any choice, so it never changes a check: that is
 * the lesson's “can this fail?” question.
 */
import { YES_NO } from '../drill';
import { syncWhyWrong } from '../teach';
import type { ChoiceFeedback, DrillMark, DrillRow, DrillStep, IdeaCard, Rng, Scene, Teach, TeachCase } from '../types';
import type { ItemCore, Made } from './statements';

// ---------- the model ----------

export type FairKind = 'found' | 'promise' | 'truth' | 'change' | 'turn';
export const FAIR_KINDS: readonly FairKind[] = ['found', 'promise', 'truth', 'change', 'turn'];
export type FairSkin = 'everyday' | 'fantasy';
export const FAIR_SKINS: readonly FairSkin[] = ['everyday', 'fantasy'];
export type CheckId = 'honest' | 'fair' | 'kind';
export const CHECKS: readonly CheckId[] = ['honest', 'fair', 'kind'];

/** What a choice does. The three checks are computed from these. */
export interface ActFeatures {
  /** Says something untrue. */
  lies: boolean;
  /** Keeps something secret that the other person should know. */
  hides: boolean;
  /** The owner gets what they are owed: their thing back, the promise kept, the truth and a sorry, their turn. */
  owed: boolean;
  /** Says something unkind to someone. */
  teases: boolean;
  /** Puts the blame on someone who did not do it. */
  blames: boolean;
  /** Someone is left without what is theirs. */
  loss: boolean;
}

export interface FairAct {
  id: string;
  /** The choice as a button: “Give the scarf back to Mia”. */
  label: string;
  /** The row name on a board: “Give it back”. */
  short: string;
  f: ActFeatures;
  /** Why it is a lie, why it is hiding, why it is unkind, who is blamed (each only when that feature is on). */
  lie?: string;
  hide?: string;
  tease?: string;
  blame?: string;
}

/** The checks of one choice, from its features. */
export function checksOf(a: FairAct): Record<CheckId, boolean> {
  return {
    honest: !a.f.lies && !a.f.hides,
    fair: a.f.owed,
    kind: !a.f.teases && !a.f.blames && !a.f.loss,
  };
}

export const passesAll = (a: FairAct) => CHECKS.every((c) => checksOf(a)[c]);

/** The choices that pass all three checks. A good story has exactly one. */
export const fairChoices = (acts: readonly FairAct[]) => acts.filter(passesAll);

export interface FairStory {
  kind: FairKind;
  skin: FairSkin;
  /** Who chooses, and who owns the thing (a name, or “Gran”, “the baker”, “Sir Omar”). */
  actor: string;
  owner: string;
  /** Someone who could get blamed, and a friend who wishes for something. */
  other: string;
  friend: string;
  thing: string;
  /** The story's facts, in order. */
  lines: string[];
  /** A temptation: a true line that makes the wrong choice look fine, but decides nothing. */
  side?: string;
  sides: string[];
  /** The fact that decides what is fair, as a reason: “The name tag says it is Mia’s.” */
  decider: string;
  /** The same fact once a wish has been added: “The name tag still says “Mia.”” */
  still: string;
  /** The middle check: column label, name in a truth, question, failing phrase, and its term. */
  fairLabel: string;
  fairWho: string;
  fairQ: string;
  fairName: string;
  /** “is fair to Mia” / “keeps the promise”, and “is not fair to Mia” / “breaks the promise”. */
  passFair: string;
  failFair: string;
  fairTerm: { word: string; meaning: string };
  owedYes: string;
  owedNo: string;
  lossText: string;
  /** Wrong reasons: a fact this story never gives, a saying, and a wish. */
  otherFact: string;
  saying: string;
  wish: string;
  /** The choice a wish pushes toward, as a verb and as an -ing phrase: “keep the scarf”, “keeping the scarf”. */
  keepVerb: string;
  keepIng: string;
  /** What a friend says to push for it. */
  push: string;
  /** The story's own act that a wish pushes toward (keep it and hide it, say nothing, pretend not to see). */
  keepId: string;
  /** Every choice for this story, and the one that is fair. */
  acts: FairAct[];
  fairId: string;
}

/** The story as a player reads it: its facts, then the temptation when there is one. */
export const storyLines = (s: FairStory): string[] => (s.side ? [...s.lines, s.side] : [...s.lines]);

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const poss = (n: string) => `${n}’s`;
const F = (on: Partial<ActFeatures>): ActFeatures => ({ lies: false, hides: false, owed: false, teases: false, blames: false, loss: false, ...on });

// ---------- stories ----------

interface Cast {
  a: string;
  o: string;
  x: string;
  f: string;
}

/** Kids' names for the stories. Four different ones go into each story. Leo and Mia belong to the worked example only. */
export const NAMES: readonly string[] = ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivy', 'Jay', 'Kai', 'Lia', 'Max', 'Nia', 'Omar', 'Pia', 'Raj', 'Sam', 'Tia', 'Zoe'];

/** The parts every “fair to the owner” check shares: label, truth name, question and term. */
function fairTo(o: string, meaning: string) {
  return {
    fairLabel: `Fair to ${o}?`,
    fairWho: `Fair to ${o}`,
    fairQ: `Is it fair to ${o}?`,
    fairName: `fair to ${o}`,
    passFair: `is fair to ${o}`,
    failFair: `is not fair to ${o}`,
    fairTerm: { word: `Fair to ${o}`, meaning },
  };
}

const blameAct = (id: string, label: string, short: string, x: string, lie: string, f: Partial<ActFeatures>): FairAct => ({
  id,
  label,
  short,
  f: F({ lies: true, blames: true, ...f }),
  lie: `That is not true. ${lie}`,
  blame: `${x} gets blamed for something ${x} did not do.`,
});

// A found thing with a name on it.
interface FoundWords {
  t: string;
  lines: string[];
  /** What shows the owner: “The name tag says “Mia.”” */
  tag: string;
  decider: string;
  still: string;
}
function foundStory(skin: FairSkin, c: Cast, w: FoundWords): FairStory {
  const { a, o, x, f } = c;
  const t = w.t;
  return {
    kind: 'found', skin, actor: a, owner: o, other: x, friend: f, thing: t,
    lines: w.lines,
    sides: [`Nobody saw ${a} pick it up.`, `${cap(o)} has not come to look for it yet.`],
    decider: w.decider,
    still: w.still,
    ...fairTo(o, `${o} gets back what belongs to ${o}.`),
    owedYes: `${cap(o)} gets the ${t} back.`,
    owedNo: `${cap(o)} does not get the ${t} back.`,
    lossText: `${cap(o)} is left without the ${t}.`,
    otherFact: `${a} promised to give the ${t} back on Friday.`,
    saying: 'Finders keepers.',
    wish: `${a} really likes the ${t}.`,
    keepVerb: `keep the ${t}`,
    keepIng: `keeping the ${t}`,
    push: 'Keep it! It’s so cool.',
    keepId: 'hide',
    acts: [
      { id: 'give', label: `Give the ${t} back to ${o}`, short: 'Give it back', f: F({ owed: true }) },
      { id: 'hide', label: `Keep the ${t} and hide it`, short: 'Keep and hide it', f: F({ hides: true, loss: true }), hide: `Hiding the ${t} keeps the truth from ${o}.` },
      { id: 'claim', label: `Say the ${t} is yours`, short: 'Say it is yours', f: F({ lies: true, loss: true }), lie: `That is not true. ${w.tag}` },
      { id: 'tease', label: `Give it back, but laugh at ${o} for losing it`, short: 'Give back, but laugh', f: F({ owed: true, teases: true }), tease: `Laughing at ${o} hurts ${poss(o)} feelings.` },
      blameAct('blame', `Give it back, but say ${x} took it`, `Give back, but blame ${x}`, x, `${x} did not take the ${t}.`, { owed: true }),
    ],
    fairId: 'give',
  };
}
const tagged = (a: string, t: string, place: string, o: string, find = 'finds'): FoundWords => ({
  t,
  lines: [`${a} ${find} a ${t} ${place}.`, `It has a name tag that says “${o}.”`],
  tag: `The name tag says “${o}.”`,
  decider: `The name tag says it is ${poss(o)}.`,
  still: `The name tag still says “${o}.”`,
});

// A borrowed thing and a promise to give it back.
interface PromiseWords {
  t: string;
  lines: string[];
  /** “on Friday”, “at sunset”. */
  when: string;
}
function promiseStory(skin: FairSkin, c: Cast, w: PromiseWords): FairStory {
  const { a, o, x, f } = c;
  const t = w.t;
  return {
    kind: 'promise', skin, actor: a, owner: o, other: x, friend: f, thing: t,
    lines: w.lines,
    sides: [`${o} has not asked for it yet.`, `${o} is busy and may not notice.`],
    decider: `${a} promised to give the ${t} back ${w.when}.`,
    still: `${a} still promised to give it back ${w.when}.`,
    fairLabel: 'Keeps the promise?',
    fairWho: 'Keeps the promise',
    fairQ: 'Does it keep the promise?',
    fairName: 'keeps the promise',
    passFair: 'keeps the promise',
    failFair: 'breaks the promise',
    fairTerm: { word: 'Keeping a promise', meaning: 'doing what you said you would do.' },
    owedYes: `${a} gives the ${t} back ${w.when}, as promised.`,
    owedNo: `${a} does not give the ${t} back ${w.when}, as promised.`,
    lossText: `${o} is left without the ${t}.`,
    otherFact: `${a} found the ${t} by the swings.`,
    saying: 'A promise is only words.',
    wish: `${a} wants the ${t} a bit longer.`,
    keepVerb: `keep the ${t} longer`,
    keepIng: `keeping the ${t} longer`,
    push: 'Keep it one more week!',
    keepId: 'quiet',
    acts: [
      { id: 'return', label: `Give the ${t} back to ${o} now`, short: 'Give it back now', f: F({ owed: true }) },
      { id: 'quiet', label: `Keep the ${t} longer and say nothing`, short: 'Keep it, say nothing', f: F({ hides: true, loss: true }), hide: `Saying nothing hides the broken promise from ${o}.` },
      { id: 'lost', label: `Say the ${t} got lost, and keep it`, short: 'Say it got lost', f: F({ lies: true, loss: true }), lie: `That is not true. The ${t} is not lost.` },
      { id: 'rude', label: `Give it back now, but call it a silly ${t}`, short: 'Give back, but be rude', f: F({ owed: true, teases: true }), tease: `Calling ${poss(o)} ${t} silly hurts ${poss(o)} feelings.` },
      blameAct('blame', `Keep it, and say ${x} has it now`, `Say ${x} has it`, x, `${x} does not have the ${t}.`, { loss: true }),
    ],
    fairId: 'return',
  };
}

// Something broken by accident: tell the truth.
interface TruthWords {
  t: string;
  lines: string[];
}
function truthStory(skin: FairSkin, c: Cast, w: TruthWords): FairStory {
  const { a, o, x, f } = c;
  const t = w.t;
  return {
    kind: 'truth', skin, actor: a, owner: o, other: x, friend: f, thing: t,
    lines: w.lines,
    sides: ['Nobody saw it happen.', `${cap(o)} is away until tonight.`],
    decider: `${a} is the one who broke the ${t}.`,
    still: `${a} still broke the ${t}, and ${o} should hear the truth.`,
    ...fairTo(o, `${o} hears the truth about the ${t} and gets a sorry.`),
    owedYes: `${cap(o)} hears the truth and gets a sorry.`,
    owedNo: `${cap(o)} does not hear the truth about the ${t}.`,
    lossText: `${cap(o)} loses the ${t}.`,
    otherFact: `${cap(o)} gave the ${t} to ${a} as a gift.`,
    saying: 'Accidents happen.',
    wish: `${a} does not want to get in trouble.`,
    keepVerb: 'hide the pieces',
    keepIng: 'hiding the pieces',
    push: 'Just hide the pieces.',
    keepId: 'hide',
    acts: [
      { id: 'tell', label: `Tell ${o}, say sorry, and help clean up`, short: 'Tell and say sorry', f: F({ owed: true }) },
      { id: 'hide', label: 'Hide the pieces and say nothing', short: 'Hide the pieces', f: F({ hides: true }), hide: `Hiding the pieces keeps the truth from ${o}.` },
      { id: 'glue', label: `Glue the ${t} and put it back without telling`, short: 'Glue it, tell no one', f: F({ hides: true }), hide: `Gluing it in secret keeps the truth from ${o}.` },
      blameAct('blame', `Say ${x} broke it`, `Say ${x} broke it`, x, `${x} did not break the ${t}.`, {}),
    ],
    fairId: 'tell',
  };
}

// Too much change from a shop.
interface ChangeWords {
  lines: string[];
  /** “dollar” or “coins”, and how it is said: “it” or “them”, “belongs” or “belong”. */
  unit: string;
  it: 'it' | 'them';
  /** “one dollar”, “two gold coins”; and “one dollar too much”, “two gold coins too many”. */
  amount: string;
  extra: string;
}
function changeStory(skin: FairSkin, c: Cast, w: ChangeWords): FairStory {
  const { a, o, x, f } = c;
  const u = `extra ${w.unit}`;
  const belongs = w.it === 'it' ? 'belongs' : 'belong';
  return {
    kind: 'change', skin, actor: a, owner: o, other: x, friend: f, thing: u,
    lines: w.lines,
    sides: [`${cap(o)} did not notice.`],
    decider: `${cap(o)} gave ${a} ${w.extra} by mistake.`,
    still: `The ${u} still ${belongs} to ${o}.`,
    ...fairTo(o, `${o} gets back the extra money.`),
    owedYes: `${cap(o)} gets the ${u} back.`,
    owedNo: `${cap(o)} does not get the ${u} back.`,
    lossText: `${cap(o)} ends up ${w.amount} short.`,
    otherFact: `${a} promised to pay ${o} back on Friday.`,
    saying: 'Their mistake is my luck.',
    wish: `${a} would like a treat with the ${u}.`,
    keepVerb: `keep the ${u}`,
    keepIng: `keeping the ${u}`,
    push: `Keep ${w.it}! Buy us a treat.`,
    keepId: 'quiet',
    acts: [
      { id: 'return', label: `Give the ${u} back to ${o}`, short: `Give ${w.it} back`, f: F({ owed: true }) },
      { id: 'quiet', label: `Keep the ${u} and say nothing`, short: `Keep ${w.it}, say nothing`, f: F({ hides: true, loss: true }), hide: `Saying nothing hides the mistake from ${o}.` },
      { id: 'spend', label: `Spend the ${u} fast, before anyone sees`, short: `Spend ${w.it} fast`, f: F({ hides: true, loss: true }), hide: `Spending ${w.it} before anyone sees is a way of hiding ${w.it}.` },
      { id: 'rude', label: `Give ${w.it} back, but tell ${o} to learn to count`, short: 'Give back, but be rude', f: F({ owed: true, teases: true }), tease: `Telling ${o} to learn to count hurts ${poss(o)} feelings.` },
    ],
    fairId: 'return',
  };
}

// Taking turns.
interface TurnWords {
  t: string;
  lines: string[];
  /** “stay on the swing”, “staying on the swing”. */
  keep: [string, string];
  /** What a friend says to push for it: “Stay on! Don’t stop yet.” */
  push: string;
}
function turnStory(skin: FairSkin, c: Cast, w: TurnWords): FairStory {
  const { a, o, x, f } = c;
  const t = w.t;
  return {
    kind: 'turn', skin, actor: a, owner: o, other: x, friend: f, thing: t,
    lines: w.lines,
    sides: [`${o} is too shy to ask.`, 'Nobody else is watching.'],
    decider: `${a} has had a full turn, and ${o} is waiting.`,
    still: `${poss(a)} turn is still over, and ${o} is still waiting.`,
    ...fairTo(o, `${o} gets a turn too, as the rule says.`),
    owedYes: `${o} gets a turn.`,
    owedNo: `${o} does not get a turn.`,
    lossText: `${o} is left out and keeps waiting.`,
    otherFact: `The ${t} has ${poss(a)} name on it.`,
    saying: 'Whoever has it gets to keep it.',
    wish: `${a} loves the ${t}.`,
    keepVerb: w.keep[0],
    keepIng: w.keep[1],
    push: w.push,
    keepId: 'ignore',
    acts: [
      { id: 'share', label: `Let ${o} have a turn now`, short: `Give ${o} a turn`, f: F({ owed: true }) },
      { id: 'pretend', label: 'Say you just started, and keep going', short: 'Say you just started', f: F({ lies: true, loss: true }), lie: `That is not true. ${a} did not just start.` },
      { id: 'ignore', label: `Keep going and pretend not to see ${o}`, short: `Pretend not to see ${o}`, f: F({ hides: true, loss: true }), hide: `Pretending not to see ${o} is a way of hiding.` },
      { id: 'rude', label: `Let ${o} have a turn, but make fun of ${o}`, short: 'Give a turn, but tease', f: F({ owed: true, teases: true }), tease: `Making fun of ${o} hurts ${poss(o)} feelings.` },
    ],
    fairId: 'share',
  };
}

interface Variant {
  kind: FairKind;
  skin: FairSkin;
  /** The owner, when it is not one of the kids: “Gran”, “the baker”, “Sir Omar”. */
  owner?: (rng: Rng, name: string) => string;
  build(c: Cast): FairStory;
}

const FOUND_PLACES: readonly [string, string][] = [
  ['water bottle', 'in the gym'],
  ['lunch box', 'in the lunchroom'],
  ['red scarf', 'in the hall'],
  ['soccer ball', 'on the field'],
  ['pencil case', 'under a desk'],
  ['blue hat', 'at the park'],
];
const PROMISE_THINGS: readonly string[] = ['board game', 'puzzle', 'bike helmet', 'jump rope', 'toy truck', 'shark book'];
const PROMISE_DAYS: readonly [string, string][] = [
  ['on Friday', 'Today is Friday.'],
  ['after school', 'School just ended.'],
  ['on Monday', 'Today is Monday.'],
];
const TRUTH_THINGS: readonly string[] = ['cup', 'mug', 'flower pot', 'clay bowl'];
const FAMILY: readonly string[] = ['Gran', 'Grandpa', 'Dad', 'Mom'];

export const VARIANTS: readonly Variant[] = [
  // found
  ...FOUND_PLACES.map(([t, place]): Variant => ({ kind: 'found', skin: 'everyday', build: (c) => foundStory('everyday', c, tagged(c.a, t, place, c.o)) })),
  {
    kind: 'found', skin: 'fantasy',
    owner: (rng, n) => `${rng.pick(['Sir', 'Dame'])} ${n}`,
    build: (c) => foundStory('fantasy', c, {
      t: 'shield',
      lines: [`${c.a} the dragon finds a shield by the river.`, `It has ${poss(c.o)} crest on it. A crest is a picture that shows who owns a thing.`],
      tag: `The crest shows it is ${poss(c.o)}.`,
      decider: `The crest shows the shield is ${poss(c.o)}.`,
      still: `The crest still shows the shield is ${poss(c.o)}.`,
    }),
  },
  {
    kind: 'found', skin: 'fantasy',
    build: (c) => foundStory('fantasy', c, {
      t: 'spell book',
      lines: [`${c.a} the robot finds a spell book in the tower.`, `Inside, it says, “This book belongs to the wizard ${c.o}.”`],
      tag: `The book says it belongs to ${c.o}.`,
      decider: `The book says it belongs to ${c.o}.`,
      still: `The book still says it belongs to ${c.o}.`,
    }),
  },
  { kind: 'found', skin: 'fantasy', build: (c) => foundStory('fantasy', c, tagged(`${c.a} the elf`, 'golden bell', 'in the forest', c.o)) },
  { kind: 'found', skin: 'fantasy', build: (c) => foundStory('fantasy', c, tagged(`${c.a} the unicorn`, 'silver cape', 'by the castle', c.o)) },
  // promise
  ...PROMISE_THINGS.flatMap((t) => PROMISE_DAYS.map(([when, now]): Variant => ({
    kind: 'promise', skin: 'everyday',
    build: (c) => promiseStory('everyday', c, { t, when, lines: [`${c.a} borrowed ${poss(c.o)} ${t}.`, `${c.a} promised to give it back ${when}.`, now] }),
  }))),
  {
    kind: 'promise', skin: 'fantasy',
    build: (c) => promiseStory('fantasy', c, { t: 'wand', when: 'at sunset', lines: [`The wizard ${c.a} borrowed ${poss(c.o)} wand.`, `${c.a} promised to give it back at sunset.`, 'The sun is setting now.'] }),
  },
  {
    kind: 'promise', skin: 'fantasy',
    build: (c) => promiseStory('fantasy', c, { t: 'map', when: 'by the full moon', lines: [`${c.a} the knight borrowed a map from ${c.o} the dragon.`, `${c.a} promised to give it back by the full moon.`, 'Tonight is the full moon.'] }),
  },
  {
    kind: 'promise', skin: 'fantasy',
    build: (c) => promiseStory('fantasy', c, { t: 'flying broom', when: 'before dark', lines: [`${c.a} the elf borrowed ${poss(c.o)} flying broom.`, `${c.a} promised to give it back before dark.`, 'It is getting dark now.'] }),
  },
  // truth
  ...TRUTH_THINGS.map((t): Variant => ({
    kind: 'truth', skin: 'everyday',
    owner: (rng, n) => rng.pick([...FAMILY, n]),
    build: (c) => truthStory('everyday', c, { t, lines: [`${c.a} bumps ${poss(c.o)} ${t} by accident.`, `The ${t} falls and breaks.`] }),
  })),
  {
    kind: 'truth', skin: 'fantasy',
    build: (c) => truthStory('fantasy', c, { t: 'potion jar', lines: [`${c.a} the dragon swishes a tail and bumps the wizard ${poss(c.o)} potion jar.`, 'The potion jar falls and breaks.'] }),
  },
  {
    kind: 'truth', skin: 'fantasy',
    owner: () => 'the queen',
    build: (c) => truthStory('fantasy', c, { t: 'teacup', lines: [`${c.a} the robot drops the queen’s teacup by accident.`, 'The teacup breaks.'] }),
  },
  // change
  ...([['the shopkeeper', 'a snack', 'the corner shop'], ['the baker', 'a muffin', 'the bakery']] as const).map(([owner, buy, place]): Variant => ({
    kind: 'change', skin: 'everyday',
    owner: () => owner,
    build: (c) => changeStory('everyday', c, {
      unit: 'dollar', it: 'it', amount: 'one dollar', extra: 'one dollar too much',
      lines: [`${c.a} buys ${buy} at ${place}.`, `${cap(c.o)} gives ${c.a} one dollar too much in change.`, 'Change is the money you get back when you pay.'],
    }),
  })),
  {
    kind: 'change', skin: 'everyday',
    build: (c) => changeStory('everyday', c, {
      unit: 'dollar', it: 'it', amount: 'one dollar', extra: 'one dollar too much',
      lines: [`${c.a} buys a cup of lemonade at ${poss(c.o)} stand.`, `${c.o} gives ${c.a} one dollar too much in change.`, 'Change is the money you get back when you pay.'],
    }),
  },
  {
    kind: 'change', skin: 'fantasy',
    owner: () => 'the goblin baker',
    build: (c) => changeStory('fantasy', c, {
      unit: 'coins', it: 'them', amount: 'two gold coins', extra: 'two gold coins too many',
      lines: [`${c.a} the elf buys a berry pie from the goblin baker.`, `The goblin baker gives ${c.a} two gold coins too many.`],
    }),
  },
  {
    kind: 'change', skin: 'fantasy',
    owner: () => 'the troll',
    build: (c) => changeStory('fantasy', c, {
      unit: 'coin', it: 'it', amount: 'one gold coin', extra: 'one gold coin too many',
      lines: [`The wizard ${c.a} buys a crystal at the troll’s stall.`, `The troll gives ${c.a} one gold coin too many.`],
    }),
  },
  // turn
  ...([
    ['swing', 'is on the swing', 'five minutes each', 'five minutes', ['stay on the swing', 'staying on the swing'], 'Stay on! Don’t stop yet.'],
    ['class computer', 'is using the class computer', 'ten minutes each', 'ten minutes', ['keep using the class computer', 'using the class computer longer'], 'Keep going! Don’t stop yet.'],
    ['big drum', 'is playing the big drum in music class', 'two songs each', 'two songs', ['keep playing the big drum', 'playing the big drum longer'], 'Keep playing! Don’t stop yet.'],
  ] as const).map(([t, doing, rule, had, keep, push]): Variant => ({
    kind: 'turn', skin: 'everyday',
    build: (c) => turnStory('everyday', c, { t, keep: [...keep], push, lines: [`${c.a} ${doing}.`, `The rule is ${rule}, and ${c.a} has had ${had}.`, `${c.o} is waiting for a turn.`] }),
  })),
  {
    kind: 'turn', skin: 'fantasy',
    build: (c) => turnStory('fantasy', c, { t: 'magic carpet', keep: ['keep riding the magic carpet', 'riding the magic carpet longer'], push: 'Keep riding! Don’t stop yet.', lines: [`${c.a} the elf is riding the magic carpet.`, `The rule is three loops each, and ${c.a} has had three loops.`, `${c.o} the elf is waiting for a turn.`] }),
  },
  {
    kind: 'turn', skin: 'fantasy',
    build: (c) => turnStory('fantasy', c, { t: 'cloud slide', keep: ['stay on the cloud slide', 'staying on the cloud slide'], push: 'Stay on! Don’t stop yet.', lines: [`${c.a} the dragon is on the cloud slide.`, `The rule is five slides each, and ${c.a} has had five slides.`, `${c.o} the dragon is waiting for a turn.`] }),
  },
];

/** A random story of one kind and skin. side: add a temptation line (a conflict item). */
export function makeStory(rng: Rng, kind: FairKind, skin: FairSkin, side = false): FairStory {
  const v = rng.pick(VARIANTS.filter((x) => x.kind === kind && x.skin === skin));
  const [a, o, x, f] = rng.shuffle(NAMES).slice(0, 4);
  const s = v.build({ a, o: v.owner ? v.owner(rng, o) : o, x, f });
  if (side) s.side = rng.pick(s.sides);
  return s;
}

// ---------- the worked example and the board's story ----------

/** See: Leo finds a teddy bear with Mia's name tag. Never used in a quiz (no quiz story has a teddy bear). */
export const WORKED: FairStory = foundStory('everyday', { a: 'Leo', o: 'Mia', x: 'Sam', f: 'Jay' }, tagged('Leo', 'teddy bear', 'by the swings', 'Mia'));
export const WORKED_ACTS: readonly string[] = ['give', 'hide', 'tease'];

/** Do: the worked story again, with the two choices the card did not show, and the fair one. */
export const BOARD_ACTS: readonly string[] = ['claim', 'give', 'blame'];

const actsBy = (s: FairStory, ids: readonly string[]) => ids.map((id) => s.acts.find((a) => a.id === id)!);

// ---------- words for the checks ----------

export const CHECK_LABEL = (s: FairStory): Record<CheckId, string> => ({ honest: 'Honest?', fair: s.fairLabel, kind: 'Hurts no one?' });
const CHECK_WHO = (s: FairStory): Record<CheckId, string> => ({ honest: 'Honest', fair: s.fairWho, kind: 'Hurts no one' });
const CHECK_Q = (s: FairStory): Record<Exclude<CheckId, 'kind'>, string> => ({ honest: 'Is it honest?', fair: s.fairQ });
const failPhrase = (s: FairStory, c: CheckId) => (c === 'honest' ? 'is not honest' : c === 'fair' ? s.failFair : 'hurts someone');

/** Why a choice passes or fails one check, in one or two short sentences, from its features. */
export function checkWhy(s: FairStory, a: FairAct, c: CheckId): string {
  if (c === 'honest') return a.f.lies ? a.lie! : a.f.hides ? a.hide! : 'Nothing is hidden, and nothing untrue is said.';
  if (c === 'fair') return a.f.owed ? s.owedYes : s.owedNo;
  if (a.f.teases) return a.tease!;
  if (a.f.blames) return a.blame!;
  if (a.f.loss) return s.lossText;
  return 'It does not tease anyone, blame anyone, or take away what is theirs.';
}

/** A check's result as a plain sentence: “It is not honest.”, “It keeps the promise.”, “It hurts someone.” */
export function checkSays(s: FairStory, c: CheckId, v: boolean): string {
  if (c === 'honest') return v ? 'It is honest.' : 'It is not honest.';
  if (c === 'fair') return `It ${v ? s.passFair : s.failFair}.`;
  return v ? 'It hurts no one.' : 'It hurts someone.';
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(', ')}, and ${xs[xs.length - 1]}`);

/** One choice as a worked case: its three checks, and what they add up to. */
export function actCase(s: FairStory, a: FairAct): TeachCase {
  const ch = checksOf(a);
  const fails = CHECKS.filter((c) => !ch[c]);
  const note = fails.length
    ? `${checkWhy(s, a, fails[0])} So it is not the fair choice.`
    : 'It passes all three checks. This is the fair choice.';
  return { label: `${a.label}.`, truths: CHECKS.map((c) => ({ who: CHECK_WHO(s)[c], value: ch[c] })), note };
}

/** The three terms every check question needs. */
const checkTerms = (s: FairStory) => [
  { word: 'Honest', meaning: 'nothing is hidden, and nothing untrue is said.' },
  s.fairTerm,
  { word: 'Hurts no one', meaning: 'the choice does not tease anyone, blame anyone, or take away what is theirs.' },
];

// ---------- quiz: which choice is fair? (fair-choice) ----------

export interface FairMade extends Made {
  story: FairStory;
  /** fair-choice: the choices, in the order shown. */
  acts?: FairAct[];
  /** fair-reason: the reasons, in the order shown. */
  reasons?: Reason[];
  /** fair-pressure: the answers, in the order shown, and the wish. */
  answers?: PressureChoice[];
  wish?: Wish;
}

/** What a temptation line is worth: it is true, but no choice's checks depend on it. */
const sideSays = (s: FairStory) => (s.side ? `“${s.side}” is true, but it changes no check.` : '');

function choiceFeedback(s: FairStory, a: FairAct, fair: FairAct): ChoiceFeedback {
  const ch = checksOf(a);
  const fails = CHECKS.filter((c) => !ch[c]);
  return {
    headline: `This choice ${list(fails.map((c) => failPhrase(s, c)))}.`,
    detail: [
      ...CHECKS.map((c) => `${checkSays(s, c, ch[c])} ${checkWhy(s, a, c)}`),
      ...(s.side ? [sideSays(s)] : []),
      `The fair choice must pass all three checks. Only “${fair.label}” does.`,
    ],
    example: actCase(s, a),
  };
}

function choiceTeach(s: FairStory, acts: FairAct[]): Teach {
  const wrong = acts.find((a) => !passesAll(a))!;
  const ch = checksOf(wrong);
  const first = CHECKS.find((c) => !ch[c])!;
  return {
    rule: `Check each choice three ways. ${CHECK_Q(s).honest} ${CHECK_Q(s).fair} Does it hurt anyone? The fair choice is honest, ${s.fairName}, and hurts no one.`,
    terms: checkTerms(s),
    meaning: s.side ? `The fact that decides it: ${s.decider} ${sideSays(s)}` : `The fact that decides it: ${s.decider}`,
    casesTitle: 'Each choice, checked three ways',
    cases: acts.map((a) => actCase(s, a)),
    remember: ['The fair choice is honest, fair, and hurts no one.', 'Ask: “What do the facts of the story say?”'],
    simpler: [
      `Look at one choice: “${wrong.label}.”`,
      `${checkSays(s, first, false)} ${checkWhy(s, wrong, first)}`,
      'It fails a check, so it is not the fair choice.',
      'Check each choice this way. Keep the one that passes all three.',
    ],
  };
}

export interface FairItemOptions {
  kind: FairKind;
  skin: FairSkin;
  /** Add a temptation line to the story (a conflict item). */
  side?: boolean;
  /** A fixed story instead of a random one (tests). */
  story?: FairStory;
}

/** “Which choice is fair?” Three choices; exactly one passes all three checks. */
export function choiceItem(rng: Rng, o: FairItemOptions): FairMade {
  const s = o.story ?? makeStory(rng, o.kind, o.skin, o.side);
  const fair = s.acts.find((a) => a.id === s.fairId)!;
  const wrongs = rng.shuffle(s.acts.filter((a) => !passesAll(a)));
  // With a temptation line, at least one wrong choice shown keeps the owner from what they are owed, so the
  // temptation points at a choice on screen.
  const tempting = wrongs.find((a) => !a.f.owed)!;
  const two = s.side ? [tempting, wrongs.find((a) => a !== tempting)!] : wrongs.slice(0, 2);
  const acts = rng.shuffle([fair, ...two]);
  const right = fairChoices(acts);
  if (right.length !== 1) throw new Error('choiceItem: exactly one choice must pass all three checks');
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const a of acts) if (a !== right[0]) feedback[a.id] = choiceFeedback(s, a, right[0]);
  const hintAct = acts.find((a) => a !== right[0])!;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `Which choice should ${s.actor} make? Check each one: honest, ${s.fairName}, and hurts no one.`,
    scene: { kind: 'text', lines: storyLines(s) },
    choices: acts.map((a) => ({ id: a.id, label: a.label })),
    answer: right[0].id,
    explain: [`“${right[0].label}” is honest, ${s.fairName}, and hurts no one.`, 'Every other choice fails at least one check.', sideSays(s)].filter(Boolean).join(' '),
    feedback,
    hint: 'Here is one choice, checked for you. Check the other choices the same way.',
    hintCase: actCase(s, hintAct),
    teach: choiceTeach(s, acts),
  };
  syncWhyWrong(item);
  if (s.side) item.conflict = true;
  return { tag: 'fair-choice', item, story: s, acts };
}

// ---------- quiz: which reason should decide it? (fair-reason) ----------

/**
 * Where a reason comes from. decider: the story fact that decides it. side: a true story line (the temptation) that
 * decides nothing. other: a fact this story never gives. saying, wish, secret: not facts at all.
 */
export type ReasonBasis = 'decider' | 'side' | 'other' | 'saying' | 'wish' | 'secret';

export interface Reason {
  id: ReasonBasis;
  label: string;
}

/** Is a reason in the story, and does it decide what is fair? Only the deciding fact is both. */
export const reasonInStory = (r: Reason) => r.id === 'decider' || r.id === 'side';
export const reasonDecides = (r: Reason) => r.id === 'decider';

export function reasonText(s: FairStory, b: ReasonBasis): string {
  switch (b) {
    case 'decider': return s.decider;
    case 'side': return s.side ?? '';
    case 'other': return s.otherFact;
    case 'saying': return s.saying;
    case 'wish': return s.wish;
    case 'secret': return 'Nobody would know.';
  }
}

function reasonNote(r: Reason): string {
  switch (r.id) {
    case 'decider': return 'This is the fact that decides it.';
    case 'side': return 'This is true, but it does not change what is fair.';
    case 'other': return 'The story never says this.';
    case 'saying': return 'A saying is not a fact from the story.';
    case 'wish': return 'A wish does not decide what is fair.';
    case 'secret': return 'This is about getting caught, not about what is fair.';
  }
}

export function reasonCase(r: Reason): TeachCase {
  return { label: r.label, truths: [{ who: 'In the story', value: reasonInStory(r) }, { who: 'Decides what is fair', value: reasonDecides(r) }], note: reasonNote(r) };
}

function reasonFeedback(s: FairStory, r: Reason): ChoiceFeedback {
  const fact = `Here is the fact that decides it. ${s.decider}`;
  const by: Record<Exclude<ReasonBasis, 'decider'>, [string, string]> = {
    side: ['This is true in the story, but it does not decide what is fair.', `It does not change the key fact, so it can’t be the reason.`],
    other: ['The story never says this, so it can’t be the reason.', 'A good reason must come from the facts of this story.'],
    saying: ['This is a saying, not a fact from the story.', 'A saying is a short rule people repeat. It tells you nothing about this story.'],
    wish: ['This is a wish, not a fact from the story.', `It tells what ${s.actor} wants. Wanting something does not change the facts.`],
    secret: ['This is about not getting caught, not about what is fair.', 'A choice is not fair just because nobody would know.'],
  };
  const [headline, why] = by[r.id as Exclude<ReasonBasis, 'decider'>];
  return { headline, detail: [why, fact], example: reasonCase(r) };
}

/** “Which reason should decide it?” One deciding fact, and three reasons that are not. */
export function reasonItem(rng: Rng, o: FairItemOptions): FairMade {
  const s = o.story ?? makeStory(rng, o.kind, o.skin, o.side);
  const pool: ReasonBasis[] = s.side ? ['other', 'saying', 'wish'] : ['other', 'saying', 'wish', 'secret'];
  const wrong: ReasonBasis[] = s.side ? ['side', ...rng.shuffle(pool).slice(0, 2)] : rng.shuffle(pool).slice(0, 3);
  const reasons: Reason[] = rng.shuffle(['decider' as ReasonBasis, ...wrong]).map((b) => ({ id: b, label: reasonText(s, b) }));
  const right = reasons.filter((r) => reasonInStory(r) && reasonDecides(r));
  if (right.length !== 1) throw new Error('reasonItem: exactly one reason must be a deciding story fact');
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const r of reasons) if (r !== right[0]) feedback[r.id] = reasonFeedback(s, r);
  const hintReason = reasons.find((r) => r !== right[0])!;
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${s.actor} wants to make a fair choice. Which reason should decide it?`,
    scene: { kind: 'text', lines: storyLines(s) },
    choices: reasons.map((r) => ({ id: r.id, label: r.label })),
    answer: right[0].id,
    explain: `${s.decider} That fact decides it. The other reasons are not in the story, or do not decide it.`,
    feedback,
    hint: 'Ask two things about each reason. Is it in the story? Does it decide what is fair?',
    hintCase: reasonCase(hintReason),
    teach: {
      rule: 'A good reason names a fact from the story that decides what is fair.',
      terms: [
        { word: 'A fact', meaning: 'something the story says is true.' },
        { word: 'A wish', meaning: 'something someone wants. A wish does not change the facts.' },
        { word: 'A saying', meaning: 'a short rule people repeat, like “Finders keepers.” It is not a fact from the story.' },
      ],
      meaning: `The fact that decides it: ${s.decider}`,
      casesTitle: 'Each reason: is it in the story, and does it decide what is fair?',
      cases: reasons.map(reasonCase),
      remember: ['A good reason is a fact from the story that decides it.', 'Ask: “Does the story say this? Does it change what is fair?”'],
      simpler: [
        `Take one reason: “${hintReason.label}”`,
        `${reasonNote(hintReason)}`,
        `Now take this one: “${s.decider}”`,
        'The story says it, and it decides what is fair. That is a good reason.',
      ],
    },
  };
  syncWhyWrong(item);
  if (s.side) item.conflict = true;
  return { tag: 'fair-reason', item, story: s, reasons };
}

// ---------- quiz: a wish pushes the other way (fair-pressure, can-fail) ----------

/** Who wishes for the unfair choice: a friend, the one choosing, or the whole group. */
export type Wish = 'friend' | 'self' | 'group';
export const WISHES: readonly Wish[] = ['friend', 'self', 'group'];

/** An answer to “Does that make it fair?”: its verdict and what it rests on. */
export interface PressureChoice {
  id: 'no-fact' | 'yes-want' | 'yes-secret' | 'no-trouble' | 'depends';
  label: string;
  verdict: 'yes' | 'no' | 'depends';
  basis: 'fact' | 'wish' | 'secret' | 'trouble';
}

/** The choice a wish pushes toward: one of the story's own acts (keep it and hide it, say nothing, pretend not to see). */
export const keepAct = (s: FairStory): FairAct => {
  const a = s.acts.find((x) => x.id === s.keepId);
  if (!a) throw new Error(`keepAct: no act ${s.keepId} in a ${s.kind} story`);
  return a;
};

function wishWords(s: FairStory, w: Wish) {
  switch (w) {
    case 'friend': return { line: `${s.friend}, a friend of ${s.actor}, says, “${s.push}”`, ask: `${s.friend} wants ${s.actor} to ${s.keepVerb}.`, who: s.friend, much: `how much ${s.friend} wants it` };
    case 'self': return { line: `${s.actor} really, really wants to ${s.keepVerb}.`, ask: `${s.actor} really wants to ${s.keepVerb}.`, who: s.actor, much: `how much ${s.actor} wants it` };
    case 'group': return { line: `Everyone in ${poss(s.actor)} group says, “${s.push}”`, ask: `The whole group wants ${s.actor} to ${s.keepVerb}.`, who: 'everyone', much: 'how many friends want it' };
  }
}

/** “Does that make it fair?” The wish changes no feature of any choice, so the fair check is the same as before. */
export function pressureItem(rng: Rng, o: FairItemOptions & { wish?: Wish }): FairMade {
  const s = o.story ?? makeStory(rng, o.kind, o.skin, false);
  const wish = o.wish ?? rng.pick(WISHES);
  const ww = wishWords(s, wish);
  const keep = keepAct(s);
  const fair = s.acts.find((a) => a.id === s.fairId)!;
  const all: PressureChoice[] = [
    { id: 'no-fact', label: `No. ${s.still}`, verdict: 'no', basis: 'fact' },
    { id: 'yes-want', label: `Yes. If ${ww.who} wants it, it is fair.`, verdict: 'yes', basis: 'wish' },
    { id: 'yes-secret', label: 'Yes, as long as nobody finds out.', verdict: 'yes', basis: 'secret' },
    { id: 'no-trouble', label: `No, because ${s.actor} might get in trouble.`, verdict: 'no', basis: 'trouble' },
    { id: 'depends', label: `It depends on ${ww.much}.`, verdict: 'depends', basis: 'wish' },
  ];
  // The right answer: the verdict the fair check gives (the wish is not a feature, so it changes nothing), for the
  // reason that decides it (a story fact).
  const verdict = checksOf(keep).fair ? 'yes' : 'no';
  if (verdict !== 'no') throw new Error('pressureItem: the wished-for act must fail the fair check before the wish');
  const others = all.filter((c) => c.id !== 'no-fact');
  const answers = rng.shuffle([all[0], ...rng.shuffle(others).slice(0, 3)]);
  const right = answers.filter((c) => c.verdict === verdict && c.basis === 'fact');
  if (right.length !== 1) throw new Error('pressureItem: exactly one answer must give the fair check’s verdict for a story fact');
  const still = `So ${s.keepIng} is still not fair.`;
  const keepCase = (withWish: boolean): TeachCase => ({
    label: `${cap(s.keepIng)}, ${withWish ? 'with the wish' : 'without the wish'}.`,
    truths: [{ who: s.fairWho, value: checksOf(keep).fair }],
    note: withWish ? `The wish changed nothing. ${s.still}` : `${s.owedNo}`,
  });
  const by: Record<Exclude<PressureChoice['id'], 'no-fact'>, [string, string]> = {
    'yes-want': ['A wish does not change the facts.', `This answer says that ${ww.who} wanting it makes it fair. But no fact changed.`],
    'yes-secret': ['Nobody finding out does not make a choice fair.', 'Fair is about the facts, not about getting caught.'],
    'no-trouble': ['“No” is right, but this reason is about getting in trouble, not the facts.', 'Getting caught is not what makes it unfair. The facts do.'],
    depends: [`${cap(ww.much)} does not change the facts.`, 'A big wish is still just a wish. It does not change the facts.'],
  };
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of answers) {
    if (c === right[0]) continue;
    const [headline, why] = by[c.id as Exclude<PressureChoice['id'], 'no-fact'>];
    feedback[c.id] = { headline, detail: [why, `The facts are the same as before. ${s.still}`, still], example: keepCase(true) };
  }
  const item: ItemCore = {
    kind: 'choose',
    prompt: `${ww.ask} Does that make ${s.keepIng} fair? Pick the answer with the right reason.`,
    scene: { kind: 'text', lines: [...storyLines(s), ww.line] },
    choices: answers.map((c) => ({ id: c.id, label: c.label })),
    answer: right[0].id,
    explain: `A wish does not change the facts. ${s.still} ${still}`,
    feedback,
    hint: `Check ${s.keepIng} twice: once without the wish, and once with it. Did any fact change?`,
    hintCase: keepCase(false),
    teach: {
      rule: 'A wish does not change the facts. The facts decide what is fair.',
      terms: [
        { word: 'A wish', meaning: 'something someone wants. A wish does not change the facts.' },
        { word: 'A fact', meaning: 'something the story says is true.' },
        s.fairTerm,
      ],
      meaning: `The fact that decides it: ${s.decider} The wish is new, but no fact changed.`,
      casesTitle: `Is ${s.keepIng} fair? Check without the wish, then with it.`,
      cases: [
        keepCase(false),
        keepCase(true),
        { label: `${fair.label}, with the wish.`, truths: [{ who: s.fairWho, value: checksOf(fair).fair }], note: `${s.owedYes} This is still the fair choice.` },
      ],
      remember: ['A wish, a friend, or a strong feeling does not change the facts.', 'Ask: “Did any fact change?”'],
      simpler: [
        `Start with the facts. ${s.decider}`,
        `Now add a wish. ${ww.ask}`,
        'Ask: did any fact change? No.',
        'So the fair choice is the same as before.',
      ],
    },
    conflict: true,
    tags: ['can-fail'],
  };
  syncWhyWrong(item);
  return { tag: 'fair-pressure', item, story: s, answers, wish };
}

// ---------- See: the key-idea cards ----------

const COLS = (s: FairStory) => CHECKS.map((c) => ({ id: c, label: CHECK_LABEL(s)[c] }));

/** A story's choices on a grid picture: one row per choice, ✓ or ✗ for each check, and a caption naming the fair one. */
export function checkGrid(s: FairStory, acts: readonly FairAct[]): Extract<Scene, { kind: 'grid' }> {
  const fair = fairChoices(acts);
  if (fair.length !== 1) throw new Error('checkGrid: exactly one choice must pass all three checks');
  return {
    kind: 'grid',
    rows: acts.map((a) => ({ id: a.id, label: a.short })),
    cols: COLS(s),
    marks: Object.fromEntries(acts.map((a) => [a.id, Object.fromEntries(CHECKS.map((c) => [c, checksOf(a)[c] ? 'yes' : 'no']))])),
    caption: `Only “${fair[0].short}” passes all three checks. It is the fair choice.`,
  };
}

/** One line per choice of a worked example: how many checks it passes, and why a near miss is still not fair. */
function rowSays(s: FairStory, a: FairAct): string {
  const ch = checksOf(a);
  const n = CHECKS.filter((c) => ch[c]).length;
  if (n === 3) return `“${a.short}” passes all three checks.`;
  if (n === 0) return `“${a.short}” fails all three checks.`;
  const fail = CHECKS.find((c) => !ch[c])!;
  return `“${a.short}” passes ${n === 2 ? 'two checks' : 'one check'}. ${checkWhy(s, a, fail)} So it is not the fair choice.`;
}

export const WORKED_SCENE: Scene = checkGrid(WORKED, actsBy(WORKED, WORKED_ACTS));
export const WORKED_STORY_SCENE: Scene = { kind: 'text', lines: storyLines(WORKED) };

export function fairIdeas(): IdeaCard[] {
  const s = WORKED;
  return [
    {
      title: 'Fair choices in a story',
      body: [
        'Sometimes you have to choose what to do. Some choices are fair, and some are not.',
        'You can tell which is which from the facts. A fact is something the story says is true.',
        'In this story, the key fact is the name tag. It tells who owns the bear.',
      ],
      scene: WORKED_STORY_SCENE,
    },
    {
      title: 'Three checks',
      body: [
        'Check each choice three ways.',
        'Honest? Nothing is hidden, and nothing untrue is said.',
        'Fair? The other person gets what they are owed: their thing back, a promise kept, their turn, or the truth and a sorry.',
        'In each story, this check names the person, like “Fair to Mia?” Or it asks, “Keeps the promise?”',
        'Hurts no one? The choice does not tease anyone, blame anyone, or take away what is theirs.',
        'The fair choice passes all three checks. Two out of three is not enough.',
      ],
    },
    {
      title: `Example: three choices for ${s.actor}`,
      body: [
        `${s.lines.join(' ')} Here, each choice is checked. ✓ means it passes. ✗ means it fails.`,
        ...actsBy(s, WORKED_ACTS).map((a) => rowSays(s, a)),
      ],
      scene: WORKED_SCENE,
    },
    {
      title: 'Wanting it does not change the facts',
      body: [
        `Say ${poss(s.actor)} friend ${s.friend} wants ${s.actor} to keep the bear. Is keeping it fair now?`,
        `No. ${s.still} A wish does not change the facts.`,
        'This is where fair thinking can go wrong. A strong wish can push the facts out of your head. So check the facts again before you are sure.',
      ],
    },
    {
      title: 'Give a reason from the story',
      body: [
        `A reason tells why. A good reason names the fact that decides it: “${s.decider}”`,
        '“Finders keepers” is a saying, not a fact. “Nobody would know” is about getting caught, not about what is fair.',
      ],
    },
  ];
}

// ---------- Do: the guided board ----------

/** One box of the board: does this choice pass this check? Every wrong mark is answered with the reason. */
function checkMark(s: FairStory, a: FairAct, c: CheckId): DrillMark {
  const v = checksOf(a)[c];
  const why = checkWhy(s, a, c);
  return {
    id: `${a.id}-${c}`,
    label: CHECK_LABEL(s)[c],
    options: YES_NO.map((o) => ({ ...o })),
    answer: v ? 'yes' : 'no',
    why: { [v ? 'no' : 'yes']: `${why} This box gets a ${v ? '✓, not a ✗' : '✗, not a ✓'}.` },
  };
}

/**
 * Do: Leo's story again (card 1's scene), with the two choices the worked grid did not show and the fair one. The
 * learner marks every box: ✓ when the choice passes the check, ✗ when it fails. Nine taps.
 */
export function fairBoard(): DrillStep {
  const s = WORKED;
  const acts = actsBy(s, BOARD_ACTS);
  const fair = fairChoices(acts);
  if (fair.length !== 1) throw new Error('fairBoard: exactly one choice must pass all three checks');
  const rows: DrillRow[] = acts.map((a) => ({ id: a.id, label: a.short, marks: CHECKS.map((c) => checkMark(s, a, c)), note: actCase(s, a).note }));
  return {
    id: 's7.l4-do',
    title: 'Check three choices',
    body: [
      `Here is ${poss(s.actor)} story again, with two new choices to check.`,
      'Mark each box. Put a ✓ if the choice passes that check. Put a ✗ if it fails.',
    ],
    scene: WORKED_STORY_SCENE,
    twin: 'The same story as card 1. What changed: two new choices to check.',
    rows,
    columns: CHECKS.map((c) => CHECK_LABEL(s)[c]),
    caption: '✓ passes the check. ✗ fails it.',
    afterCard: 2,
    done: `Right. Only “${fair[0].short}” passes all three checks. It is the fair choice.`,
  };
}
