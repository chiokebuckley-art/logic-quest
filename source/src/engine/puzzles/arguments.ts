/**
 * Stop 2 · Arguments (id s18). An argument is some givens and a claim. The claim follows (grown-ups say valid) when it
 * must be true whenever every given is true. The argument is solid (sound) when it follows and every given is really
 * true.
 *
 * The model: an argument is about one thing (“Tom”, “this apple”, “a robin”) and two facts about it: a (a kind of
 * thing: “Tom is a cat”) and b (something every a is or has: “Tom has whiskers”, or, in a “No …” argument, something
 * no a is or has: “Tom can fly”). A case is one way the two facts could be, so there are four cases. Each given is
 * true or false in each case; a case that breaks a given is crossed out. The claim must be true (it follows) when it
 * is true in every case left, can’t be true when it is false in every case left, and might be true or false (Can’t
 * tell) otherwise. Every answer, explanation, wrong-choice feedback, hint case and board mark is worked out here from
 * those cases (statusOf), never written by hand. Real topics also say what is really true, with a reason, so “solid”
 * is worked out too (solidOf).
 *
 * Question kinds (skill tags): given (tap every given) and claim (which sentence is the claim) on short stories;
 * follows (must, might or can’t, from the cases); form (made-up words: the shape decides; and which plain argument
 * has the same shape); sound (solid, follows but a given is false, or does not follow); why (the reason an argument
 * follows or does not). The worked examples on the cards and boards use their own topics, never a quiz topic.
 */
import { syncWhyWrong } from '../teach';
import type {
  ArgumentCase,
  BoardWords,
  Choice,
  ChoiceFeedback,
  ChooseItem,
  ConfusedQuestion,
  ContrastPanel,
  Distinction,
  DrillMark,
  DrillOption,
  DrillRow,
  DrillStep,
  Misconception,
  MultiItem,
  Rng,
  Scene,
  Teach,
  TeachCase,
} from '../types';

// ---------- the model ----------

export type ArgSkin = 'everyday' | 'fantasy' | 'nonsense' | 'real';
export type OtherKind = 'question' | 'command' | 'opinion' | 'feeling';
/** If every given is true, the claim must be true, might be true or false (can’t tell), or can’t be true. */
export type Status = 'must' | 'might' | 'cant';

/** One fact about the thing an argument is about, in every form a sentence needs. */
export interface Prop {
  /** After one subject: “is a cat”, “has whiskers”, “can fly”. */
  is: string;
  /** “is not a cat”, “does not have whiskers”, “can’t fly”. */
  isNot: string;
  /** After a plural subject: “are cats”, “have whiskers”, “can fly”. */
  are: string;
  /** After “must”: “be a cat”, “have whiskers”, “be able to fly”. */
  be: string;
  /** A kind of thing: [one, many], so it can start “All cats …” and “No cat …”. */
  noun?: readonly [string, string];
}

/** A sentence in a story that is not a statement, so it is never a given. */
export interface Other {
  text: string;
  kind: OtherKind;
}

/** What is really true about a real topic, each with its reason in plain words. */
export interface RealFacts {
  /** Is the thing an a? */
  a: boolean;
  /** Does the thing have b? */
  b: boolean;
  /** Is every a really b? */
  all: boolean;
  why: { a: string; b: string; all: string };
}

export interface Topic {
  id: string;
  skin: ArgSkin;
  /** What the argument is about, as it reads in the middle of a sentence: “Tom”, “this apple”, “a robin”. */
  who: string;
  /** The first line of a question: “Mia tells you about Tom.” It never says a fact a given uses. */
  setting: string;
  /** A kind of thing (it has a noun). */
  a: Prop;
  /** What every a is or has, in an “All …” argument. */
  b: Prop;
  /** What no a is or has, in a “No …” argument. */
  n?: Prop;
  /** Sentences for a story that are not statements. */
  others: readonly Other[];
  real?: RealFacts;
}

export type Role = 'a' | 'b';
/** A sentence’s form: a fact about the thing (“Tom is a cat”), or “All a are b” (v true) or “No a is n” (v false). */
export type Form = { t: 'fact'; r: Role; v: boolean } | { t: 'all'; v: boolean };

export type ShapeId = 'mp' | 'mt' | 'no' | 'conv' | 'inv' | 'no-conv' | 'mp-cant' | 'mt-cant' | 'no-cant';

const fact = (r: Role, v: boolean): Form => ({ t: 'fact', r, v });
const ALL: Form = { t: 'all', v: true };
const NONE: Form = { t: 'all', v: false };

/**
 * Every shape the stop uses: given 1 is “All …” or “No …”, given 2 is a fact about the thing, and the claim is a
 * fact. mp, mt and no follow; conv, inv and no-conv do not (the claim might be true or false); the -cant shapes have
 * a claim the givens make false. The tests work each status out again.
 */
export const SHAPES: Readonly<Record<ShapeId, { givens: readonly Form[]; claim: Form }>> = {
  mp: { givens: [ALL, fact('a', true)], claim: fact('b', true) },
  mt: { givens: [ALL, fact('b', false)], claim: fact('a', false) },
  no: { givens: [NONE, fact('a', true)], claim: fact('b', false) },
  conv: { givens: [ALL, fact('b', true)], claim: fact('a', true) },
  inv: { givens: [ALL, fact('a', false)], claim: fact('b', false) },
  'no-conv': { givens: [NONE, fact('b', false)], claim: fact('a', true) },
  'mp-cant': { givens: [ALL, fact('a', true)], claim: fact('b', false) },
  'mt-cant': { givens: [ALL, fact('b', false)], claim: fact('a', true) },
  'no-cant': { givens: [NONE, fact('a', true)], claim: fact('b', true) },
};
export const SHAPE_IDS = Object.keys(SHAPES) as ShapeId[];
/** Shapes that follow, and shapes whose claim might be true or false. */
export const FOLLOW_SHAPES: readonly ShapeId[] = ['mp', 'mt', 'no'];
export const LEAK_SHAPES: readonly ShapeId[] = ['conv', 'inv', 'no-conv'];
export const CANT_SHAPES: readonly ShapeId[] = ['mp-cant', 'mt-cant', 'no-cant'];
/** Shapes a real topic can take (it says what is really true of “All a are b”, never of “No …”). */
export const REAL_SHAPES: readonly ShapeId[] = ['mp', 'mt', 'conv', 'inv'];

/** A “No …” shape: its given 1 says no a is n. */
export const isNoShape = (s: ShapeId) => {
  const g = SHAPES[s].givens[0];
  return g.t === 'all' && !g.v;
};

const sameForm = (x: Form, y: Form) => JSON.stringify(x) === JSON.stringify(y);
const shapeWhere = (ok: (t: { givens: readonly Form[]; claim: Form }) => boolean, why: string): ShapeId => {
  const found = SHAPE_IDS.find((t) => ok(SHAPES[t]));
  if (!found) throw new Error(why);
  return found;
};
/** Flip the claim: the shape with the same givens and the opposite claim (“Pip is a bird” for “Pip is not a bird”). */
export function flipShape(s: ShapeId): ShapeId {
  const { givens, claim } = SHAPES[s];
  if (claim.t !== 'fact') throw new Error(`flipShape: ${s}`);
  return shapeWhere((t) => t.givens.every((g, i) => sameForm(g, givens[i])) && sameForm(t.claim, fact(claim.r, !claim.v)), `flipShape: no flip of ${s}`);
}
/** Swap given 2 and the claim: the shape whose given 2 is this claim, and whose claim is this given 2. */
export function swapShape(s: ShapeId): ShapeId {
  const { givens, claim } = SHAPES[s];
  return shapeWhere((t) => sameForm(t.givens[0], givens[0]) && sameForm(t.givens[1], claim) && sameForm(t.claim, givens[1]), `swapShape: no swap of ${s}`);
}

/** An argument: a topic in a shape. */
export interface Arg {
  topic: Topic;
  shape: ShapeId;
}

/** The second fact: b, or n in a “No …” argument. */
export const second = (arg: Arg): Prop => (isNoShape(arg.shape) ? arg.topic.n! : arg.topic.b);
const propOf = (arg: Arg, r: Role): Prop => (r === 'a' ? arg.topic.a : second(arg));

/** A case: whether the thing is an a, and whether it has the second fact. */
export interface Case {
  a: boolean;
  b: boolean;
}
/** The four cases, always in this order: Case 1 to Case 4. */
export const CASES: readonly Case[] = [
  { a: true, b: true },
  { a: true, b: false },
  { a: false, b: true },
  { a: false, b: false },
];

/** Is a sentence of this form true in this case? “All a are b” is broken only by an a that is not b. */
export function holds(f: Form, c: Case): boolean {
  return f.t === 'fact' ? c[f.r] === f.v : !c.a || c.b === f.v;
}

export const givensOf = (arg: Arg): readonly Form[] => SHAPES[arg.shape].givens;
export const claimOf = (arg: Arg): Form => SHAPES[arg.shape].claim;
/** The first given a case breaks (its index), or -1 when the case is left. */
export const breaks = (arg: Arg, c: Case): number => givensOf(arg).findIndex((g) => !holds(g, c));
export const casesLeft = (arg: Arg): Case[] => CASES.filter((c) => breaks(arg, c) < 0);
export const claimIn = (arg: Arg, c: Case): boolean => holds(claimOf(arg), c);

/** Must, might or can’t, from the cases left. */
export function statusOf(arg: Arg): Status {
  const left = casesLeft(arg);
  if (!left.length) throw new Error(`statusOf: no case is left (${arg.topic.id} ${arg.shape})`);
  const t = left.filter((c) => claimIn(arg, c)).length;
  return t === left.length ? 'must' : t === 0 ? 'cant' : 'might';
}
/** The claim follows: it is true in every case left. */
export const followsOf = (arg: Arg) => statusOf(arg) === 'must';

/** Is a sentence of this form really true? Only for real topics, and never for a “No …” sentence. */
export function realTruth(arg: Arg, f: Form): boolean {
  const r = arg.topic.real;
  if (!r) throw new Error(`realTruth: ${arg.topic.id} is not a real topic`);
  if (f.t === 'all') {
    if (!f.v) throw new Error('realTruth: no real “No …” sentence');
    return r.all;
  }
  return (f.r === 'a' ? r.a : r.b) === f.v;
}
/** Why a sentence of this form is really true or false. */
export function realWhy(arg: Arg, f: Form): string {
  const r = arg.topic.real!;
  return f.t === 'all' ? r.why.all : f.r === 'a' ? r.why.a : r.why.b;
}
/** Solid: it follows, and every given is really true. */
export const solidOf = (arg: Arg) => followsOf(arg) && givensOf(arg).every((g) => realTruth(arg, g));

// ---------- words ----------

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nameNum = (k: number) => `Case ${k + 1}`;
const listAnd = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** “Tom is a cat.” (start: the thing’s name or word at the start of a sentence). */
export function factText(arg: Arg, r: Role, v: boolean): string {
  const p = propOf(arg, r);
  return `${cap(arg.topic.who)} ${v ? p.is : p.isNot}.`;
}

/** A sentence’s words, as a sentence: “All cats have whiskers.” “No cat can fly.” “Tom is a cat.” */
export function formText(arg: Arg, f: Form): string {
  if (f.t === 'fact') return factText(arg, f.r, f.v);
  const [one, many] = arg.topic.a.noun!;
  return f.v ? `All ${many} ${arg.topic.b.are}.` : `No ${one} ${arg.topic.n!.is}.`;
}

/** The same words in the middle of a sentence, with no end mark: “all cats have whiskers”, “Tom is a cat”. */
export function formMid(arg: Arg, f: Form): string {
  if (f.t === 'fact') {
    const p = propOf(arg, f.r);
    return `${arg.topic.who} ${f.v ? p.is : p.isNot}`;
  }
  const [one, many] = arg.topic.a.noun!;
  return f.v ? `all ${many} ${arg.topic.b.are}` : `no ${one} ${arg.topic.n!.is}`;
}

export const givenTexts = (arg: Arg) => givensOf(arg).map((g) => formText(arg, g));
export const claimText = (arg: Arg) => formText(arg, claimOf(arg));
/** The claim in the middle of a sentence: “Tom has whiskers”. */
export const claimMid = (arg: Arg) => formMid(arg, claimOf(arg));
/** The whole argument on one line: “All cats have whiskers. Tom is a cat. So Tom has whiskers.” */
export const argText = (arg: Arg) => [...givenTexts(arg), `So ${claimMid(arg)}.`].join(' ');
/** A case in words: “Tom is a cat.” “Tom does not have whiskers.” */
export const caseFacts = (arg: Arg, c: Case) => [factText(arg, 'a', c.a), factText(arg, 'b', c.b)];
/** The same, inside a sentence: “Tom is a cat, and Tom does not have whiskers”. */
const caseMid = (arg: Arg, c: Case) => `${formMid(arg, fact('a', c.a))}, and ${formMid(arg, fact('b', c.b))}`;

/** Why given i is true or broken in case c, in plain words. */
export function givenWhy(arg: Arg, i: number, c: Case): string {
  const g = givensOf(arg)[i];
  const n = i + 1;
  const who = arg.topic.who;
  if (g.t === 'fact') {
    const p = propOf(arg, g.r);
    return `Given ${n} says “${formText(arg, g)}” Here, ${who} ${c[g.r] ? p.is : p.isNot}. ${holds(g, c) ? `So given ${n} is true here.` : `That breaks given ${n}.`}`;
  }
  const A = arg.topic.a;
  const B = second(arg);
  if (!c.a) return `Given ${n} is only about ${A.noun![1]}. Here, ${who} ${A.isNot}. So given ${n} is not broken.`;
  if (holds(g, c)) return `${cap(who)} ${A.is}, and ${who} ${c.b ? B.is : B.isNot}. So given ${n} is true here.`;
  return `${cap(who)} ${A.is}, but ${who} ${c.b ? B.is : B.isNot}. That breaks given ${n}.`;
}

/** Whether the claim is true in case c, in plain words. */
export function claimWhy(arg: Arg, c: Case): string {
  const f = claimOf(arg) as Extract<Form, { t: 'fact' }>;
  const p = propOf(arg, f.r);
  return `The claim says “${claimText(arg)}” Here, ${arg.topic.who} ${c[f.r] ? p.is : p.isNot}. So the claim is ${claimIn(arg, c) ? 'true' : 'false'} here.`;
}

/** One case as a card: its facts, the truth of each given and the claim, and whether it is crossed out. */
export function caseCard(arg: Arg, c: Case): TeachCase {
  const k = CASES.indexOf(c);
  const gi = breaks(arg, c);
  return {
    label: `${nameNum(k)}: ${caseFacts(arg, c).join(' ')}`,
    truths: [...givensOf(arg).map((g, i) => ({ who: `Given ${i + 1}`, value: holds(g, c) })), { who: 'The claim', value: claimIn(arg, c) }],
    note: gi >= 0 ? `It breaks given ${gi + 1}, so cross it out.` : `It breaks no given, so it is left. The claim is ${claimIn(arg, c) ? 'true' : 'false'} here.`,
  };
}

export type ArgScene = Extract<Scene, { kind: 'argument' }>;

/**
 * An argument as a picture: its givens and its claim. cases 'blank': the four case boxes, not marked (a board marks
 * them). cases 'marked': each box crossed out with the given it breaks, or left with the claim’s truth. real: a True
 * or False tag on each given and on the claim.
 */
export function argScene(arg: Arg, o: { cases?: 'blank' | 'marked'; real?: boolean; caption?: string } = {}): ArgScene {
  const scene: ArgScene = { kind: 'argument', givens: givenTexts(arg), claim: claimText(arg) };
  if (o.real) {
    scene.real = givensOf(arg).map((g) => realTruth(arg, g));
    scene.realClaim = realTruth(arg, claimOf(arg));
  }
  if (o.cases) {
    scene.cases = CASES.map((c, k): ArgumentCase => {
      const box: ArgumentCase = { name: nameNum(k), facts: caseFacts(arg, c) };
      if (o.cases === 'marked') {
        const gi = breaks(arg, c);
        if (gi >= 0) box.out = gi + 1;
        else box.claim = claimIn(arg, c);
      }
      return box;
    });
  }
  if (o.caption) scene.caption = o.caption;
  return scene;
}

/** “Only case 1 is left.” / “Cases 1 and 3 are left.” */
export function leftIntro(arg: Arg): string {
  const nums = casesLeft(arg).map((c) => String(CASES.indexOf(c) + 1));
  return nums.length === 1 ? `Only case ${nums[0]} is left.` : `Cases ${listAnd(nums)} are left.`;
}

/**
 * The cases left, with the claim in each: the reason for must, might or can’t. words: say what each case left is
 * (where no case boxes are drawn); without it, the case numbers point at the boxes in the picture.
 */
export function statusReason(arg: Arg, words = true): string {
  const left = casesLeft(arg);
  const num = (c: Case) => CASES.indexOf(c) + 1;
  const yes = left.find((c) => claimIn(arg, c));
  const no = left.find((c) => !claimIn(arg, c));
  const status = statusOf(arg);
  if (status === 'might') {
    return words
      ? `${leftIntro(arg)} In case ${num(yes!)}, ${caseMid(arg, yes!)}, so the claim is true. In case ${num(no!)}, ${caseMid(arg, no!)}, so the claim is false.`
      : `${leftIntro(arg)} The claim is true in case ${num(yes!)}, but false in case ${num(no!)}.`;
  }
  const t = status === 'must' ? 'true' : 'false';
  if (left.length === 1) return words ? `Only case ${num(left[0])} is left: ${caseMid(arg, left[0])}. The claim is ${t} there.` : `${leftIntro(arg)} The claim is ${t} there.`;
  return `${leftIntro(arg)} The claim is ${t} in each one.`;
}

/** “Tom is a cat or not. Tom has whiskers or not. That makes four cases.” */
export const fourCases = (arg: Arg) => `${cap(arg.topic.who)} ${arg.topic.a.is} or not. ${cap(arg.topic.who)} ${second(arg).is} or not. That makes four cases.`;

// ---------- the topics ----------

/** A kind of thing: “is a cat” / “are cats”. */
const kind = (one: string, many: string, an = false): Prop => {
  const a = an ? 'an' : 'a';
  return { is: `is ${a} ${one}`, isNot: `is not ${a} ${one}`, are: `are ${many}`, be: `be ${a} ${one}`, noun: [one, many] };
};
/** A group by where it is: “is in Room 5”, as a kind “kid in Room 5”. */
const group = (is: string, isNot: string, are: string, be: string, one: string, many: string): Prop => ({ is, isNot, are, be, noun: [one, many] });
const has = (what: string): Prop => ({ is: `has ${what}`, isNot: `does not have ${what}`, are: `have ${what}`, be: `have ${what}` });
const can = (what: string): Prop => ({ is: `can ${what}`, isNot: `can’t ${what}`, are: `can ${what}`, be: `be able to ${what}` });
const adj = (what: string): Prop => ({ is: `is ${what}`, isNot: `is not ${what}`, are: `are ${what}`, be: `be ${what}` });
/** A verb: “wears a green shirt” / “wear a green shirt”. */
const does = (s: string, base: string): Prop => ({ is: s, isNot: `does not ${base}`, are: base, be: base });

const Q = (text: string): Other => ({ text, kind: 'question' });
const C = (text: string): Other => ({ text, kind: 'command' });
const O = (text: string): Other => ({ text, kind: 'opinion' });
const Fe = (text: string): Other => ({ text, kind: 'feeling' });

const topic = (id: string, skin: ArgSkin, who: string, setting: string, a: Prop, b: Prop, n: Prop | undefined, others: Other[] = []): Topic => ({ id, skin, who, setting, a, b, ...(n ? { n } : {}), others });

/** Everyday stories: a kid’s world. Each has an “All …” fact (b) and a “No …” fact (n). */
export const EVERYDAY: readonly Topic[] = [
  topic('tom', 'everyday', 'Tom', 'Mia tells you about Tom.', kind('cat', 'cats'), has('whiskers'), can('fly'),
    [Q('Can I pet Tom?'), C('Look at that long tail!'), O('Cats are the best pets.'), Fe('Aww!')]),
  topic('mia', 'everyday', 'Mia', 'Your class talks about library day.', group('is in Room 5', 'is not in Room 5', 'are in Room 5', 'be in Room 5', 'kid in Room 5', 'kids in Room 5'), has('a library card'), has('gym today'),
    [Q('Where is the library?'), C('Bring your card, Mia.'), O('Library day is the best day.'), Fe('Yay!')]),
  topic('leo', 'everyday', 'Leo', 'The coach talks about the team shirts.', group('is on the Hawks', 'is not on the Hawks', 'are on the Hawks', 'be on the Hawks', 'player on the Hawks', 'players on the Hawks'), does('wears a green shirt', 'wear a green shirt'), does('wears a red shirt', 'wear a red shirt'),
    [Q('Is the game today?'), C('Pass the ball, Leo!'), O('Green is the coolest color.'), Fe('Go, Hawks!')]),
  topic('apple', 'everyday', 'this apple', 'Sam sorts apples at the farm stand.', group('is from the blue box', 'is not from the blue box', 'are from the blue box', 'be from the blue box', 'apple from the blue box', 'apples from the blue box'), adj('red'), has('a worm'),
    [Q('Do you want a bite?'), C('Put it in the bag.'), O('Red apples taste the best.'), Fe('Yum!')]),
  topic('book', 'everyday', 'this book', 'Ana looks for something to read.', group('is on the top shelf', 'is not on the top shelf', 'are on the top shelf', 'be on the top shelf', 'book on the top shelf', 'books on the top shelf'), adj('about space'), kind('comic book', 'comic books'),
    [Q('Can you reach the top shelf?'), C('Hand me that book, please.'), O('Space books are the most fun.'), Fe('Wow!')]),
  topic('scout', 'everyday', 'Scout', 'Ben tells you about Scout.', kind('dog', 'dogs'), can('bark'), can('climb trees'),
    [Q('Does Scout like walks?'), C('Sit, Scout!'), O('Puppies are the cutest.'), Fe('Oh, wow!')]),
  topic('kai', 'everyday', 'Kai', 'It is the end of the school day.', group('rides Bus 7', 'does not ride Bus 7', 'ride Bus 7', 'ride Bus 7', 'kid who rides Bus 7', 'kids who ride Bus 7'), does('gets home by four', 'get home by four'), does('walks home', 'walk home'),
    [Q('Is the bus late?'), C('Grab your coat, Kai.'), O('Bus 7 is the best bus.'), Fe('Hooray!')]),
  topic('muffin', 'everyday', 'this muffin', 'Dad baked two trays of muffins.', group('is from the top tray', 'is not from the top tray', 'are from the top tray', 'be from the top tray', 'muffin from the top tray', 'muffins from the top tray'), has('blueberries'), has('nuts'),
    [Q('Can I have one now?'), C('Let them cool first.'), O('Blueberry muffins are the best.'), Fe('Mmm!')]),
];

/** Fantasy stories. */
export const FANTASY: readonly Topic[] = [
  topic('zog', 'fantasy', 'Zog', 'The knight tells a story about Zog.', kind('dragon', 'dragons'), can('breathe fire'), adj('afraid of the dark'),
    [Q('Where does Zog sleep?'), C('Hide behind the rock!'), O('Dragons are the coolest.'), Fe('Oh no!')]),
  topic('lumo', 'fantasy', 'Lumo', 'The castle cook talks about Lumo.', kind('wizard', 'wizards'), has('a wand'), can('swim'),
    [Q('Is Lumo at home?'), C('Ask Lumo for a spell.'), O('Wizards have the best hats.'), Fe('Wow!')]),
  topic('fizz', 'fantasy', 'Fizz', 'Two elves talk about Fizz.', kind('fairy', 'fairies'), can('fly'), adj('bigger than a cat'),
    [Q('Where did Fizz go?'), C('Follow that light!'), O('Fairies are the prettiest.'), Fe('Hooray!')]),
  topic('grum', 'fantasy', 'Grum', 'A goat looks at the old bridge.', kind('troll', 'trolls'), adj('afraid of goats'), does('likes the sun', 'like the sun'),
    [Q('Who lives under the bridge?'), C('Cross the bridge fast.'), O('Trolls are the silliest.'), Fe('Eek!')]),
  topic('bo', 'fantasy', 'Bo', 'Nia shows you the moon base.', kind('moon robot', 'moon robots'), does('glows blue at night', 'glow blue at night'), does('needs food', 'need food'),
    [Q('Can Bo talk?'), C('Charge Bo before bed.'), O('Moon robots are the best robots.'), Fe('Whoa!')]),
  topic('nim', 'fantasy', 'Nim', 'You meet someone in the tall forest.', kind('elf', 'elves', true), has('pointy ears'), does('tells lies', 'tell lies'),
    [Q('What is your name?'), C('Stay on the path.'), O('Elves are the nicest folk.'), Fe('Oh my!')]),
];

export const STORY_TOPICS: readonly Topic[] = [...EVERYDAY, ...FANTASY];

const real = (id: string, who: string, a: Prop, b: Prop, r: RealFacts): Topic => ({ id, skin: 'real', who, setting: 'Think about the real world.', a, b, others: [], real: r });
const BIRD = kind('bird', 'birds');
const FISH = kind('fish', 'fish');
const INSECT = kind('insect', 'insects', true);
const FRUIT = kind('fruit', 'fruits');
const ANIMAL = kind('animal', 'animals', true);
const SHAPE = kind('shape', 'shapes');
const LIVES_IN_WATER = does('lives in water', 'live in water');
const GROWS: Prop = { is: 'grows on a plant', isNot: 'does not grow on a plant', are: 'grow on plants', be: 'grow on a plant' };
const NO_FLY_BIRD = 'An ostrich is a bird, and it can’t fly.';
const TWO_LEGS = 'A bird is an animal, and it has two legs.';
const SQUARE_SIDES = 'A square is a shape, and it has four sides.';

/** Real topics: every fact here is true for kids to check, and each has its reason. */
export const REAL: readonly Topic[] = [
  real('robin-feathers', 'a robin', BIRD, has('feathers'), { a: true, b: true, all: true, why: { a: 'A robin is a bird.', b: 'A robin has feathers.', all: 'Every bird has feathers.' } }),
  real('robin-fly', 'a robin', BIRD, can('fly'), { a: true, b: true, all: false, why: { a: 'A robin is a bird.', b: 'A robin can fly.', all: NO_FLY_BIRD } }),
  real('bat-fly', 'a bat', BIRD, can('fly'), { a: false, b: true, all: false, why: { a: 'A bat is not a bird. It has fur, not feathers.', b: 'A bat can fly.', all: NO_FLY_BIRD } }),
  real('bat-feathers', 'a bat', BIRD, has('feathers'), { a: false, b: false, all: true, why: { a: 'A bat is not a bird. It has fur, not feathers.', b: 'A bat has fur, not feathers.', all: 'Every bird has feathers.' } }),
  real('shark-water', 'a shark', FISH, LIVES_IN_WATER, { a: true, b: true, all: true, why: { a: 'A shark is a fish.', b: 'A shark lives in water.', all: 'Every fish lives in water.' } }),
  real('whale-water', 'a whale', FISH, LIVES_IN_WATER, { a: false, b: true, all: true, why: { a: 'A whale is not a fish. It breathes air, like you do.', b: 'A whale lives in water.', all: 'Every fish lives in water.' } }),
  real('ant-legs', 'an ant', INSECT, has('six legs'), { a: true, b: true, all: true, why: { a: 'An ant is an insect.', b: 'An ant has six legs.', all: 'Every insect has six legs.' } }),
  real('lemon-sweet', 'a lemon', FRUIT, adj('sweet'), { a: true, b: false, all: false, why: { a: 'A lemon is a fruit.', b: 'A lemon is sour, not sweet.', all: 'A lemon is a fruit, and it is not sweet.' } }),
  real('dog-legs', 'a dog', ANIMAL, has('four legs'), { a: true, b: true, all: false, why: { a: 'A dog is an animal.', b: 'A dog has four legs.', all: TWO_LEGS } }),
  real('snake-legs', 'a snake', ANIMAL, has('four legs'), { a: true, b: false, all: false, why: { a: 'A snake is an animal.', b: 'A snake has no legs at all.', all: TWO_LEGS } }),
  real('triangle-sides', 'a triangle', SHAPE, has('three sides'), { a: true, b: true, all: false, why: { a: 'A triangle is a shape.', b: 'A triangle has three sides.', all: SQUARE_SIDES } }),
  real('square-sides', 'a square', SHAPE, has('three sides'), { a: true, b: false, all: false, why: { a: 'A square is a shape.', b: 'A square has four sides, not three.', all: SQUARE_SIDES } }),
  real('apple-plant', 'an apple', FRUIT, GROWS, { a: true, b: true, all: true, why: { a: 'An apple is a fruit.', b: 'An apple grows on a plant.', all: 'Every fruit grows on a plant.' } }),
  real('carrot-plant', 'a carrot', FRUIT, GROWS, { a: false, b: true, all: true, why: { a: 'A carrot is not a fruit. It is a vegetable.', b: 'A carrot grows on a plant, under the ground.', all: 'Every fruit grows on a plant.' } }),
];

/** Plain arguments where every sentence sounds right (Lesson 3’s trap): the claim may be true, but does it follow? */
export const BELIEVABLE: readonly Topic[] = [
  topic('sunny-robin', 'everyday', 'Sunny', 'Read this argument.', kind('robin', 'robins'), BIRD, undefined),
  topic('shape-square', 'everyday', 'this shape', 'Read this argument.', kind('square', 'squares'), has('four sides'), undefined),
  topic('snack-apple', 'everyday', 'this snack', 'Read this argument.', kind('apple', 'apples', true), FRUIT, undefined),
  topic('coin-penny', 'everyday', 'this coin', 'Read this argument.', kind('penny', 'pennies'), adj('made of metal'), undefined),
  topic('tree-oak', 'everyday', 'this tree', 'Read this argument.', kind('oak', 'oaks', true), has('leaves'), undefined),
  topic('max-dog', 'everyday', 'Max', 'Read this argument.', kind('dog', 'dogs'), has('four legs'), undefined),
  topic('day-saturday', 'everyday', 'today', 'Read this argument.', { is: 'is Saturday', isNot: 'is not Saturday', are: 'are Saturdays', be: 'be Saturday', noun: ['Saturday', 'Saturdays'] }, kind('weekend day', 'weekend days'), undefined),
];

const NONSENSE_NOUNS = ['zib', 'flarn', 'snoob', 'blick', 'wug', 'plim', 'trom', 'zorp', 'frell', 'mib'];
const NONSENSE_NAMES = ['Mo', 'Pim', 'Kib', 'Lu', 'Tib', 'Vee', 'Rook', 'Jax'];
const NONSENSE_ADJ = ['blue', 'fuzzy', 'round', 'shiny', 'green', 'tiny', 'soft', 'spotted', 'striped', 'purple'];
export const NONSENSE_SETTING = 'This argument uses made-up words.';

/** A made-up topic: “All zibs are fuzzy. Mo is a zib.” Never the glorp words of the worked example. */
export function nonsenseTopic(rng: Rng): Topic {
  const noun = rng.pick(NONSENSE_NOUNS);
  const [b, n] = rng.shuffle(NONSENSE_ADJ);
  const who = rng.pick(NONSENSE_NAMES);
  return topic(`nonsense-${who}-${noun}-${b}-${n}`, 'nonsense', who, NONSENSE_SETTING, kind(noun, `${noun}s`), adj(b), adj(n));
}

/**
 * The quiz topic an item is about: the topic whose givens are the ones its argument picture shows, or the story whose
 * first line starts its prompt. For new examples after a miss, so they can use another topic.
 */
export function topicOfItem(it: { prompt: string; scene?: Scene }): Topic | undefined {
  if (it.scene?.kind === 'argument') {
    const givens = JSON.stringify(it.scene.givens);
    for (const t of [...EVERYDAY, ...FANTASY, ...BELIEVABLE, ...REAL]) {
      for (const shape of SHAPE_IDS) {
        if ((isNoShape(shape) && !t.n) || (t.real && !REAL_SHAPES.includes(shape))) continue;
        if (JSON.stringify(givenTexts({ topic: t, shape })) === givens) return t;
      }
    }
  }
  return [...EVERYDAY, ...FANTASY].find((t) => it.prompt.startsWith(t.setting));
}

// ---------- the worked examples (cards and boards only, never a quiz) ----------

/** Lesson 1: Rex in the rain. */
export const W_RAIN = topic('w-rain', 'everyday', 'Rex', 'Ben looks out at the yard.',
  group('was out in the rain', 'was not out in the rain', 'were out in the rain', 'have been out in the rain', 'dog out in the rain', 'dogs out in the rain'),
  { is: 'got wet', isNot: 'did not get wet', are: 'got wet', be: 'have gotten wet' }, undefined);
/** Lesson 2: Pip and the feathers (and, in a “No …” argument, the fur); Pip the robin; Pip who sings. */
export const W_PIP = topic('w-pip', 'everyday', 'Pip', 'Read this argument.', BIRD, has('feathers'), has('fur'));
export const W_PIP_ROBIN = topic('w-pip-robin', 'everyday', 'Pip', 'Read this argument.', kind('robin', 'robins'), BIRD, undefined);
export const W_PIP_SING = topic('w-pip-sing', 'everyday', 'Pip', 'Read this argument.', BIRD, can('sing'), undefined);
/** Lesson 3: the glorps, Dot the ladybug, Goldie, and Rex the animal. */
export const W_GLORP = topic('w-glorp', 'nonsense', 'Zed', NONSENSE_SETTING, kind('glorp', 'glorps'), adj('blue'), adj('fuzzy'));
export const W_DOT = topic('w-dot', 'everyday', 'Dot', 'Read this argument.', kind('ladybug', 'ladybugs'), has('spots'), undefined);
export const W_GOLDIE = topic('w-goldie', 'everyday', 'Goldie', 'Read this argument.', kind('goldfish', 'goldfish'), LIVES_IN_WATER, undefined);
export const W_REX = topic('w-rex', 'everyday', 'Rex', 'Read this argument.', kind('cat', 'cats'), kind('animal', 'animals', true), undefined);
/** Lesson 2’s family boards: Juno the hen (the twins of the Pip cards, in new words). */
export const W_JUNO = topic('w-juno', 'everyday', 'Juno', 'Read this argument.', kind('hen', 'hens'), has('feathers'), has('fur'));
/** Lesson 3’s family boards: Nox and the daxes (the twins of the glorp cards, in new made-up words). */
export const W_DAX = topic('w-dax', 'nonsense', 'Nox', NONSENSE_SETTING, kind('dax', 'daxes'), adj('bumpy'), adj('sticky'));
/** Lesson 4: the penguin, the sun, and a duck, a cow and an owl. */
export const W_PENGUIN_FEATHERS = real('w-penguin-feathers', 'a penguin', BIRD, has('feathers'), { a: true, b: true, all: true, why: { a: 'A penguin is a bird.', b: 'A penguin has feathers.', all: 'Every bird has feathers, penguins too.' } });
export const W_PENGUIN_FLY = real('w-penguin-fly', 'a penguin', BIRD, can('fly'), { a: true, b: false, all: false, why: { a: 'A penguin is a bird.', b: 'A penguin can’t fly.', all: 'A penguin is a bird, and it can’t fly.' } });
export const W_SUN = real('w-sun', 'the sun', kind('star', 'stars'), adj('hot'), { a: true, b: true, all: true, why: { a: 'The sun is a star.', b: 'The sun is hot.', all: 'Every star is very hot.' } });
export const W_DUCK = real('w-duck', 'a duck', BIRD, has('feathers'), { a: true, b: true, all: true, why: { a: 'A duck is a bird.', b: 'A duck has feathers.', all: 'Every bird has feathers.' } });
export const W_COW = real('w-cow', 'a cow', ANIMAL, can('fly'), { a: true, b: false, all: false, why: { a: 'A cow is an animal.', b: 'A cow can’t fly.', all: 'A cow is an animal, and it can’t fly.' } });
export const W_OWL = real('w-owl', 'an owl', BIRD, has('feathers'), { a: true, b: true, all: true, why: { a: 'An owl is a bird.', b: 'An owl has feathers.', all: 'Every bird has feathers.' } });

/** Every worked-example topic: never a quiz, check or Arcade topic. */
export const WORKED_TOPICS: readonly Topic[] = [W_RAIN, W_PIP, W_PIP_ROBIN, W_PIP_SING, W_GLORP, W_DOT, W_GOLDIE, W_REX, W_JUNO, W_DAX, W_PENGUIN_FEATHERS, W_PENGUIN_FLY, W_SUN, W_DUCK, W_COW, W_OWL];

// ---------- items ----------

type Core<T> = T extends unknown ? Omit<T, 'id' | 'stop' | 'lesson' | 'skill'> : never;
export type ChooseCore = Core<ChooseItem>;
export type MultiCore = Core<MultiItem>;
export type ArgCore = ChooseCore | MultiCore;
export type ArgKind = 'givens' | 'claim' | 'follows' | 'form' | 'twin' | 'solid' | 'why';

/** A made item, with its argument (and its story or its twins) for the tests. */
export interface ArgMade {
  /** The skill tag: 'given' gives the skill s18.given. */
  tag: string;
  kind: ArgKind;
  item: ArgCore;
  arg: Arg;
  story?: Story;
  /** A twin question: each choice’s argument, by choice id. */
  twins?: Record<string, Arg>;
}

const SKILL: Record<ArgKind, string> = { givens: 'given', claim: 'claim', follows: 'follows', form: 'form', twin: 'form', solid: 'sound', why: 'why' };

function done(kind: ArgKind, arg: Arg, item: ArgCore, extra: Partial<ArgMade> = {}): ArgMade {
  if (item.kind === 'choose') syncWhyWrong(item);
  return { tag: SKILL[kind], kind, item, arg, ...extra };
}

/** A topic from the pool, not one already used in the set when one is left. */
function pickTopic(rng: Rng, pool: readonly Topic[], avoid?: Set<string>): Topic {
  const fresh = pool.filter((t) => !avoid?.has(t.id));
  const t = rng.pick(fresh.length ? fresh : pool);
  avoid?.add(t.id);
  return t;
}
const storyPool = (skin: 'everyday' | 'fantasy') => (skin === 'everyday' ? EVERYDAY : FANTASY);

/** The pass rule’s tags: the trap of each lesson (LessonDef.pass include). */
export const CLAIM_FIRST = { tag: 'claim-first', label: 'a story where the claim comes first' };
export const TRUE_NOT_FORCED = { tag: 'true-not-forced', label: 'a true claim that the givens do not force' };
export const SOUNDS_RIGHT = { tag: 'sounds-right', label: 'an argument that sounds right but does not follow' };
export const FALSE_GIVEN = { tag: 'false-given', label: 'an argument with a false given that still follows' };
/** The closing why item’s tag. */
export const WHY_TAG = 'why';

/** The first case a given rules out: the hint’s case, which never gives the answer away. */
const firstOut = (arg: Arg): Case => CASES.find((c) => breaks(arg, c) >= 0)!;
const CASE_HINT = 'Here is one case, already checked. Check the other cases the same way.';
/** Words every case question uses. */
function caseTerms(arg: Arg) {
  return [
    { word: 'A case', meaning: `one way things could be. ${fourCases(arg)}` },
    { word: 'A case left', meaning: 'a case that breaks no given.' },
    { word: 'Follows', meaning: 'the givens force the claim. The claim is true in every case left.' },
  ];
}
const meaningOf = (arg: Arg) => `${givenTexts(arg).map((g, i) => `Given ${i + 1} says “${g}”`).join(' ')} The claim says “${claimText(arg)}”`;

// ---------- Lesson 1: givens and the claim (short stories) ----------

export type Sign = 'so' | 'means' | 'must' | 'because' | 'since';
/** One sentence of a story and its job. */
export interface Line {
  id: string;
  text: string;
  role: 'given' | 'claim' | 'other';
  /** A given’s or the claim’s form. */
  form?: Form;
  /** An other sentence’s kind. */
  kind?: OtherKind;
  /** The signpost word it carries. */
  sign?: Sign;
}
export interface Story {
  arg: Arg;
  lines: Line[];
  claimFirst: boolean;
}

/** The claim’s line: “So Tom has whiskers.”, “That means …”, or “Tom must have whiskers.” (a claim that is not a NOT). */
function claimLine(arg: Arg, sign: 'so' | 'means' | 'must'): Omit<Line, 'id'> {
  const f = claimOf(arg) as Extract<Form, { t: 'fact' }>;
  const text = sign === 'must' ? `${cap(arg.topic.who)} must ${propOf(arg, f.r).be}.` : `${sign === 'so' ? 'So' : 'That means'} ${claimMid(arg)}.`;
  return { text, role: 'claim', form: f, sign };
}
/** A given’s line: plain, “This is because …” or “We know this since …” (a given after the claim). */
function givenLine(arg: Arg, f: Form, sign?: 'because' | 'since'): Omit<Line, 'id'> {
  if (sign === 'because') return { text: `This is because ${formMid(arg, f)}.`, role: 'given', form: f, sign };
  if (sign === 'since') return { text: `We know this since ${formMid(arg, f)}.`, role: 'given', form: f, sign };
  return { text: formText(arg, f), role: 'given', form: f };
}
const otherLine = (o: Other): Omit<Line, 'id'> => ({ text: o.text, role: 'other', kind: o.kind });

/** Ids by job, in story order: g1, g2, the claim, o1, o2. */
function withIds(lines: Omit<Line, 'id'>[]): Line[] {
  let g = 0, o = 0;
  return lines.map((l) => ({ ...l, id: l.role === 'claim' ? 'claim' : l.role === 'given' ? `g${++g}` : `o${++o}` }));
}

/**
 * A short story (4 or 5 sentences): two givens, a claim with its signpost word, and one or two sentences that are not
 * statements. The argument always follows, and it needs both givens. claimFirst: the claim comes first, with “must”,
 * and a “This is because …” given after it.
 */
export function makeStory(rng: Rng, t: Topic, o: { claimFirst?: boolean } = {}): Story {
  const shapes: readonly ShapeId[] = o.claimFirst ? ['mp'] : t.n ? FOLLOW_SHAPES : ['mp', 'mt'];
  const arg: Arg = { topic: t, shape: rng.pick(shapes) };
  const [g1, g2] = givensOf(arg);
  const others = rng.shuffle(t.others).slice(0, rng.int(1, 2)).map(otherLine);
  let lines: Omit<Line, 'id'>[];
  if (o.claimFirst) {
    const [first, then] = rng.shuffle([g1, g2]);
    lines = [claimLine(arg, 'must'), givenLine(arg, first, rng.pick(['because', 'since'] as const)), givenLine(arg, then), ...others];
  } else {
    const positive = (claimOf(arg) as Extract<Form, { t: 'fact' }>).v;
    const sign = positive && rng.chance(1 / 3) ? 'must' : rng.pick(['so', 'means'] as const);
    const core = [...rng.shuffle([g1, g2]).map((f) => givenLine(arg, f)), claimLine(arg, sign)];
    if (others.length === 2) lines = [others[0], ...core, others[1]];
    else lines = rng.chance(0.5) ? [others[0], ...core] : [...core, others[0]];
  }
  return { arg, lines: withIds(lines), claimFirst: !!o.claimFirst };
}

/** A fixed story for a card or board: its lines in order, each a given (with its form), the claim or another sentence. */
export function fixedStory(arg: Arg, spec: ({ given: Form; sign?: 'because' | 'since' } | { claim: 'so' | 'means' | 'must' } | { other: Other })[]): Story {
  const lines = spec.map((s) => ('given' in s ? givenLine(arg, s.given, s.sign) : 'claim' in s ? claimLine(arg, s.claim) : otherLine(s.other)));
  return { arg, lines: withIds(lines), claimFirst: 'claim' in spec[0] };
}

export const storyScene = (s: Story): Scene => ({ kind: 'text', lines: s.lines.map((l) => l.text) });

const SIGN_NOTE: Record<'so' | 'means' | 'must', string> = {
  so: '“So” points to the claim.',
  means: '“That means” points to the claim.',
  must: '“Must” shows it is the claim.',
};
const OTHER_A: Record<OtherKind, string> = { question: 'a question', command: 'a command', opinion: 'an opinion', feeling: 'a cry that shows a feeling' };
const OTHER_NOTE: Record<OtherKind, string> = {
  question: 'It is a question. It is not true or false, so it is not a given.',
  command: 'It is a command. It is not true or false, so it is not a given.',
  opinion: 'It is an opinion. It is not a statement, so it is not a given.',
  feeling: 'It shows a feeling. It is not true or false, so it is not a given.',
};
const claimSign = (l: Line) => SIGN_NOTE[l.sign as 'so' | 'means' | 'must'];

/** Why a sentence has its job. */
export function lineNote(l: Line): string {
  if (l.role === 'claim') return `It is the claim. ${claimSign(l)}`;
  if (l.role === 'given') return `It is a given: a reason for the claim.${l.sign === 'because' ? ' “Because” points to a given.' : l.sign === 'since' ? ' “Since” points to a given.' : ''}`;
  return OTHER_NOTE[l.kind!];
}

/** One sentence as a card: is it a given, is it the claim, and why. */
export function roleCard(l: Line): TeachCase {
  return {
    label: `“${l.text}”`,
    truths: [{ who: 'A given', value: l.role === 'given' }, { who: 'The claim', value: l.role === 'claim' }],
    note: lineNote(l),
    words: YES_NO_WORDS,
  };
}

/** A card whose rows answer yes or no (is it a given? does it match?), not true or false. */
const YES_NO_WORDS = { truth: 'yes', untruth: 'no' };

export const STORY_TERMS = [
  { word: 'A given', meaning: 'a statement the argument starts from. It gives a reason for the claim.' },
  { word: 'The claim', meaning: 'the sentence the givens back up.' },
  { word: 'A signpost word', meaning: 'a word like “so,” “must” or “because.” It shows a sentence’s job.' },
];

function storyTeach(s: Story): Teach {
  const claim = s.lines.find((l) => l.role === 'claim')!;
  return {
    rule: 'An argument has givens and a claim. The givens are the reasons. The claim is what they back up.',
    terms: STORY_TERMS,
    meaning: `The claim here is “${claim.text}” The givens are the statements that back it up.`,
    casesTitle: 'The job of each sentence',
    cases: s.lines.map(roleCard),
    remember: ['Find the claim first. Then find the statements that back it up.', 'Ask: “Is this a statement that gives a reason for the claim?”'],
    simpler: [
      'Look for a signpost word. “So,” “that means” and “must” point to the claim.',
      'The statements that give reasons for the claim are the givens.',
      'A question, a command, an opinion or a cry like “Wow!” is never a given.',
    ],
  };
}

const quoted = (l: Line) => `“${l.text}”`;

/** Tap every given: the statements the claim rests on (a multi item of the story’s sentence cards). */
export function givensItem(rng: Rng, o: { skin: 'everyday' | 'fantasy'; avoid?: Set<string>; claimFirst?: boolean }): ArgMade {
  const t = pickTopic(rng, storyPool(o.skin), o.avoid);
  const s = makeStory(rng, t, { claimFirst: o.claimFirst });
  const givens = s.lines.filter((l) => l.role === 'given');
  const claim = s.lines.find((l) => l.role === 'claim')!;
  const missTips: Record<string, string> = {};
  const pickTips: Record<string, string> = {};
  for (const l of s.lines) {
    if (l.role === 'given') missTips[l.id] = `${quoted(l)} is a given. It is a statement, and it gives a reason for the claim.`;
    else if (l.role === 'claim') pickTips[l.id] = `${quoted(l)} is the claim, not a given. ${claimSign(l)}`;
    else pickTips[l.id] = `${quoted(l)} is ${OTHER_A[l.kind!]}. ${l.kind === 'opinion' ? 'It is not a statement' : 'It is not true or false'}, so it can’t be a given.`;
  }
  const item: MultiCore = {
    kind: 'multi',
    prompt: `${t.setting} Tap every given. A given is a statement that gives a reason for the claim.`,
    scene: storyScene(s),
    choices: s.lines.map((l) => ({ id: l.id, label: l.text })),
    answer: givens.map((l) => l.id),
    explain: `The givens are ${listAnd(givens.map(quoted))} They give the reasons for the claim, ${quoted(claim)}`,
    pickTips,
    missTips,
    hint: 'Here is one sentence, already checked. Check the others the same way.',
    hintCase: roleCard(s.lines.find((l) => l.role === 'other')!),
    teach: storyTeach(s),
    ...(s.claimFirst ? { tags: [CLAIM_FIRST.tag], conflict: true } : {}),
  };
  return done('givens', s.arg, item, { story: s });
}

/** Which sentence is the claim? The choices are the story’s statements. claimFirst: the trap, where it comes first. */
export function claimItem(rng: Rng, o: { skin: 'everyday' | 'fantasy'; avoid?: Set<string>; claimFirst?: boolean }): ArgMade {
  const t = pickTopic(rng, storyPool(o.skin), o.avoid);
  const s = makeStory(rng, t, { claimFirst: o.claimFirst });
  const statements = s.lines.filter((l) => l.role !== 'other');
  const claim = statements.find((l) => l.role === 'claim')!;
  const last = statements[statements.length - 1];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const g of statements) {
    if (g === claim) continue;
    feedback[g.id] = {
      headline: s.claimFirst && g === last ? 'Your answer is the last statement, but the claim comes first in this story.' : 'Your answer is a given. It is a reason, not the claim.',
      detail: [`${quoted(g)} gives a reason. It backs up another sentence.`, `The claim is ${quoted(claim)} ${claimSign(claim)}${s.claimFirst ? ' A claim can come first.' : ''}`],
      example: roleCard(g),
    };
  }
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${t.setting} Which sentence is the claim?`,
    scene: storyScene(s),
    choices: rng.shuffle(statements.map((l) => ({ id: l.id, label: l.text }))),
    answer: claim.id,
    explain: `The claim is ${quoted(claim)} ${claimSign(claim)} The other statements are givens. They give the reasons.`,
    feedback,
    hint: 'Here is one sentence, already checked. Look for the word that points to the claim.',
    hintCase: roleCard(statements.find((l) => l.role === 'given')!),
    teach: storyTeach(s),
    ...(s.claimFirst ? { tags: [CLAIM_FIRST.tag], conflict: true } : {}),
  };
  return done('claim', s.arg, item, { story: s });
}

// ---------- Lesson 2: does it follow? (must, might or can’t) ----------

/** The answers, in this order every time. “Might be true or false” is Stop 1’s “Can’t tell”. */
export const STATUS_CHOICES: readonly Choice[] = [
  { id: 'must', label: 'Must be true' },
  { id: 'might', label: 'Might be true or false: can’t tell' },
  { id: 'cant', label: 'Can’t be true' },
];
const STATUS_WORDS: Record<Status, string> = { must: 'must be true', might: 'might be true or false', cant: 'can’t be true' };
export const ASK_STATUS = 'Say both givens are true. Must the claim be true, might it be true, or can’t it be true?';

/** What each wrong status gets wrong, with the case that shows it. */
function statusFeedback(arg: Arg, trap: boolean): Record<string, ChoiceFeedback> {
  const answer = statusOf(arg);
  const left = casesLeft(arg);
  const yes = left.find((c) => claimIn(arg, c));
  const no = left.find((c) => !claimIn(arg, c));
  const outWith = (v: boolean) => CASES.find((c) => breaks(arg, c) >= 0 && claimIn(arg, c) === v);
  const fb: Record<string, ChoiceFeedback> = {};
  const say = (c: Case) => nameNum(CASES.indexOf(c));
  if (answer === 'might') {
    fb.must = {
      headline: 'Your answer says the claim must be true, but one case left makes it false.',
      detail: [
        `In ${say(no!).toLowerCase()}, ${caseMid(arg, no!)}. That breaks no given.`,
        'But the claim is false there. So the givens do not force it.',
        ...(trap ? ['The claim is true in the story. But being true is not the same as following.'] : []),
      ],
      example: caseCard(arg, no!),
    };
    fb.cant = {
      headline: 'Your answer says the claim can’t be true, but one case left makes it true.',
      detail: [`In ${say(yes!).toLowerCase()}, ${caseMid(arg, yes!)}. That breaks no given, and the claim is true there.`, `${say(no!)} is left too, and the claim is false there. So it might be true or false.`],
      example: caseCard(arg, yes!),
    };
  } else if (answer === 'must') {
    const o = outWith(false)!;
    fb.might = {
      headline: 'Your answer says you can’t tell, but the claim is true in every case left.',
      detail: [statusReason(arg), `In ${say(o).toLowerCase()}, ${caseMid(arg, o)}, so the claim is false. But ${say(o).toLowerCase()} breaks given ${breaks(arg, o) + 1}, so it does not count.`],
      example: caseCard(arg, o),
    };
    fb.cant = {
      headline: 'Your answer says the claim can’t be true, but it is true in every case left.',
      detail: [statusReason(arg), '“Can’t be true” needs the claim to be false in every case left.'],
      example: caseCard(arg, left[0]),
    };
  } else {
    const o = outWith(true)!;
    fb.must = {
      headline: 'Your answer says the claim must be true, but it is false in every case left.',
      detail: [statusReason(arg), 'So if both givens are true, the claim is false.'],
      example: caseCard(arg, left[0]),
    };
    fb.might = {
      headline: 'Your answer says you can’t tell, but the claim is false in every case left.',
      detail: [statusReason(arg), `In ${say(o).toLowerCase()}, ${caseMid(arg, o)}, so the claim is true. But ${say(o).toLowerCase()} breaks given ${breaks(arg, o) + 1}, so it does not count.`],
      example: caseCard(arg, o),
    };
  }
  return fb;
}

function followsTeach(arg: Arg): Teach {
  return {
    rule: 'Picture every case. Cross out each case that breaks a given. Then look at the claim in the cases left.',
    terms: caseTerms(arg),
    meaning: meaningOf(arg),
    casesTitle: 'Every case',
    cases: CASES.map((c) => caseCard(arg, c)),
    remember: ['Must: true in every case left. Might: true in some. Can’t: true in none.', 'Ask: “Is there a case left where the claim is false?”'],
    simpler: [fourCases(arg), 'Cross out each case that breaks a given.', 'Look only at the cases left. Is the claim true in all of them, in some, or in none?'],
  };
}

/** Must, might or can’t. trap: the claim is true in the story, but the givens do not force it (always might). */
export function followsItem(rng: Rng, o: { skin: 'everyday' | 'fantasy'; target?: Status; trap?: boolean; avoid?: Set<string> }): ArgMade {
  const t = pickTopic(rng, storyPool(o.skin), o.avoid);
  const target: Status = o.trap ? 'might' : o.target ?? rng.pick(['must', 'might', 'cant'] as const);
  const shapes = target === 'must' ? FOLLOW_SHAPES : target === 'might' ? LEAK_SHAPES : CANT_SHAPES;
  const arg: Arg = { topic: t, shape: rng.pick(shapes) };
  const answer = statusOf(arg);
  const trapLine = o.trap ? ` In the story, it is true that ${claimMid(arg)}. But look only at the givens.` : '';
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${t.setting}${trapLine} ${ASK_STATUS}`,
    scene: argScene(arg),
    choices: STATUS_CHOICES.map((c) => ({ ...c })),
    answer,
    explain: `${statusReason(arg)} So the claim ${STATUS_WORDS[answer]}.${answer === 'must' ? ' It follows.' : answer === 'might' ? ' You can’t tell.' : ''}`,
    feedback: statusFeedback(arg, !!o.trap),
    hint: CASE_HINT,
    hintCase: caseCard(arg, firstOut(arg)),
    teach: followsTeach(arg),
    scratch: caseScratch(arg),
    scratchLabel: 'the case board',
    confused: [CASES_LEFT_Q, TRUE_FOLLOWS_Q],
    ...(o.trap ? { tags: [TRUE_NOT_FORCED.tag], conflict: true } : {}),
  };
  return done('follows', arg, item);
}

// ---------- Lesson 3: follows, even when silly ----------

/** “Does it follow?” for made-up words: the third choice is the belief that you need to know what the words mean. */
export const formChoices = (arg: Arg): Choice[] => [
  { id: 'follows', label: 'It follows.' },
  { id: 'not', label: 'It does not follow.' },
  ...(arg.topic.skin === 'nonsense' ? [{ id: 'check', label: `Can’t tell if it follows: nobody knows what a ${arg.topic.a.noun![0]} is.` }] : []),
];

/** Why a wrong “follows” or “does not follow” misses, with the case that shows it. */
function followFeedback(arg: Arg): Record<string, ChoiceFeedback> {
  const f = followsOf(arg);
  const left = casesLeft(arg);
  const leak = left.find((c) => !claimIn(arg, c));
  const say = (c: Case) => nameNum(CASES.indexOf(c));
  const realNote = arg.topic.skin === 'real' || BELIEVABLE.includes(arg.topic) ? ['The claim might be true in real life. But the givens do not force it.'] : [];
  const fb: Record<string, ChoiceFeedback> = f
    ? {
        not: {
          headline: 'Your answer says it does not follow, but the claim is true in every case left.',
          detail: [statusReason(arg), 'So the givens force the claim. It follows.'],
          example: caseCard(arg, left[0]),
        },
      }
    : {
        follows: {
          headline: 'Your answer says it follows, but one case left makes the claim false.',
          detail: [`Picture ${say(leak!).toLowerCase()}: ${caseMid(arg, leak!)}.`, ...(realNote.length ? ['Both givens are true there, and the claim is false.', ...realNote] : ['Both givens are true there, and the claim is false. So the givens do not force it.'])],
          example: caseCard(arg, leak!),
        },
      };
  if (arg.topic.skin === 'nonsense') {
    fb.check = {
      headline: `Your answer says you need to know what a ${arg.topic.a.noun![0]} is, but you don’t.`,
      detail: ['Follows is about the shape. Say the givens are true, and picture every case.', `${statusReason(arg)} So it ${f ? 'follows' : 'does not follow'}.`],
      example: caseCard(arg, leak ?? left[0]),
    };
  }
  return fb;
}

/**
 * A made-up argument’s plain-word twin: the same shape, in a story topic’s words. The topic comes from the made-up
 * words themselves (no rng), so adding the twin never changes which items a seed gives.
 */
export function plainTwin(arg: Arg): Arg {
  const k = NONSENSE_NOUNS.indexOf(arg.topic.a.noun![0]) + NONSENSE_NAMES.indexOf(arg.topic.who);
  return { topic: STORY_TOPICS[Math.max(0, k) % STORY_TOPICS.length], shape: arg.shape };
}

/** The plain-word twin as a card: same shape, same answer (the brief’s pairing for every made-up argument). */
export function plainTwinCard(arg: Arg): TeachCase {
  const twin = plainTwin(arg);
  const f = followsOf(twin);
  return {
    label: `The same shape in plain words: “${argText(twin)}”`,
    truths: [{ who: 'It follows', value: f }],
    note: `Same shape, same answer. ${f ? 'Both arguments follow.' : 'Neither argument follows.'}`,
    words: YES_NO_WORDS,
  };
}

function formTeach(arg: Arg): Teach {
  const made = arg.topic.skin === 'nonsense';
  return {
    rule: 'The shape decides if a claim follows. Say the givens are true, and picture every case. The words can even be made up.',
    terms: [...caseTerms(arg), { word: 'The shape', meaning: 'the pattern of an argument. Swap its words, and the shape stays.' }],
    meaning: meaningOf(arg),
    casesTitle: made ? 'Every case, then the same shape in plain words' : 'Every case',
    cases: [...CASES.map((c) => caseCard(arg, c)), ...(made ? [plainTwinCard(arg)] : [])],
    remember: ['Made-up words can still follow. The shape does the work.', 'Ask: “Is there a case left where the claim is false?”'],
    simpler: [fourCases(arg), 'Cross out each case that breaks a given.', 'If the claim is true in every case left, it follows. If not, it does not follow.'],
  };
}

/** Made-up words: does the claim follow? */
export function formItem(rng: Rng, o: { follows?: boolean } = {}): ArgMade {
  const f = o.follows ?? rng.chance(0.5);
  const arg: Arg = { topic: nonsenseTopic(rng), shape: rng.pick(f ? FOLLOW_SHAPES : LEAK_SHAPES) };
  const yes = followsOf(arg);
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${NONSENSE_SETTING} Does the claim follow from the givens?`,
    scene: argScene(arg),
    choices: formChoices(arg),
    answer: yes ? 'follows' : 'not',
    explain: `${statusReason(arg)} So ${yes ? 'it follows. The shape forces the claim, whatever the words mean.' : 'it does not follow.'}`,
    feedback: followFeedback(arg),
    hint: CASE_HINT,
    hintCase: caseCard(arg, firstOut(arg)),
    teach: formTeach(arg),
    confused: [SHAPE_Q, CASES_LEFT_Q],
  };
  return done('form', arg, item);
}

/** Plain words where every sentence sounds right. Not follows: the trap (the claim may be true, but it is not forced). */
export function believableItem(rng: Rng, o: { follows?: boolean; avoid?: Set<string> } = {}): ArgMade {
  const t = pickTopic(rng, BELIEVABLE, o.avoid);
  const f = !!o.follows;
  const arg: Arg = { topic: t, shape: f ? 'mp' : rng.pick(['conv', 'inv'] as const) };
  const yes = followsOf(arg);
  const item: ChooseCore = {
    kind: 'choose',
    prompt: 'Every sentence here sounds right. Does the claim follow from the givens?',
    scene: argScene(arg),
    choices: formChoices(arg),
    answer: yes ? 'follows' : 'not',
    explain: `${statusReason(arg)} So ${yes ? 'it follows.' : 'it does not follow, even though every sentence sounds right.'}`,
    feedback: followFeedback(arg),
    hint: CASE_HINT,
    hintCase: caseCard(arg, firstOut(arg)),
    teach: formTeach(arg),
    confused: [TRUE_FOLLOWS_Q, CASES_LEFT_Q],
    ...(yes ? {} : { tags: [SOUNDS_RIGHT.tag], conflict: true }),
  };
  return done('form', arg, item);
}

/** The shapes a twin question uses: three that follow and three that do not. */
export const TWIN_SHAPES: readonly ShapeId[] = ['mp', 'mt', 'no', 'conv', 'inv', 'no-conv'];
const PARTS = ['given 1', 'given 2', 'the claim'] as const;
const partsOf = (s: ShapeId) => [...SHAPES[s].givens, SHAPES[s].claim].map((f) => JSON.stringify(f));
/** Which parts of shape s sit like the parts of shape t: given 1, given 2, the claim. */
export const partsMatch = (s: ShapeId, t: ShapeId) => partsOf(s).map((p, i) => p === partsOf(t)[i]);

/**
 * The made-up topic a choice is swapped back into: its kind word in place of the plain kind word, and the target’s
 * second fact in place of the choice’s second fact, whether the choice says “All …” or “No …”.
 */
const swapTopic = (target: Arg): Topic => ({ ...target.topic, b: second(target), n: second(target) });
/** A choice’s words swapped back into the made-up words. */
export const swappedBack = (target: Arg, s: ShapeId) => argText({ topic: swapTopic(target), shape: s });

/** One choice of a twin question, with its words swapped back into the made-up words. */
function swapCard(target: Arg, s: ShapeId): TeachCase {
  const m = partsMatch(s, target.shape);
  return {
    label: `Swapped back: “${swappedBack(target, s)}”`,
    truths: m.map((v, i) => ({ who: `${cap(PARTS[i])} matches`, value: v })),
    note: m.every(Boolean) ? 'Every part matches. It has the same shape.' : 'A part does not match. It has a different shape.',
    words: YES_NO_WORDS,
  };
}

/** Which plain-word argument has the same shape as the made-up one? The three choices use the same plain words. */
export function twinItem(rng: Rng, o: { avoid?: Set<string> } = {}): ArgMade {
  const target: Arg = { topic: nonsenseTopic(rng), shape: rng.pick(TWIN_SHAPES) };
  const plain = pickTopic(rng, STORY_TOPICS, o.avoid);
  const others = rng.shuffle(TWIN_SHAPES.filter((s) => s !== target.shape)).slice(0, 2);
  const shapes = [target.shape, ...others];
  const twins: Record<string, Arg> = Object.fromEntries(shapes.map((s) => [s, { topic: plain, shape: s }]));
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const s of others) {
    const m = partsMatch(s, target.shape);
    const off = PARTS.filter((_, i) => !m[i]);
    feedback[s] = {
      headline: `Your answer has a different shape: ${listAnd(off)} ${off.length === 1 ? 'does' : 'do'} not match.`,
      detail: [
        `Swap the words back into the made-up words. Your answer becomes “${swappedBack(target, s)}”`,
        `The argument above is “${argText(target)}”`,
        `Look at ${listAnd(off)}. ${off.length === 1 ? 'It sits' : 'They sit'} in a different way.`,
      ],
      example: swapCard(target, s),
    };
  }
  const B = second(target), PB = second(twins[target.shape]);
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${NONSENSE_SETTING} Which argument below has the same shape?`,
    scene: argScene(target),
    choices: rng.shuffle(shapes.map((s) => ({ id: s, label: argText(twins[s]) }))),
    answer: target.shape,
    explain: `Swap the words back, and it becomes “${argText(target)}” Every part matches, so it has the same shape.`,
    feedback,
    hint: 'Here is one choice, with its words swapped back. Check the others the same way.',
    hintCase: swapCard(target, others[0]),
    teach: {
      rule: 'Two arguments have the same shape when you can swap the words and get the same argument.',
      terms: [
        { word: 'The shape', meaning: 'the pattern of an argument. Swap its words, and the shape stays.' },
        { word: 'Swap the words', meaning: 'put one word in place of another, every time it comes up.' },
      ],
      meaning: `The argument above is “${argText(target)}”`,
      casesTitle: 'Each choice, with its words swapped back',
      cases: shapes.map((s) => swapCard(target, s)),
      remember: ['Same shape, same answer. If one follows, so does the other.', 'Ask: “If I swap the words back, do I get the same argument?”'],
      simpler: [
        `Take a choice. Swap “${plain.who}” for “${target.topic.who},” and “${plain.a.is}” for “${target.topic.a.is}.”`,
        `Swap “${PB.is}” for “${B.is}.” Do the same in every sentence.`,
        'If you get the argument above, word for word, it has the same shape.',
      ],
    },
    seconds: 120,
  };
  return done('twin', target, item, { twins });
}

// ---------- Lesson 4: solid (sound), and why it follows ----------

export const REAL_SETTING = 'Think about the real world.';
export const SOLID_CHOICES: readonly Choice[] = [
  { id: 'solid', label: 'Solid: it follows, and every given is true' },
  { id: 'unsound', label: 'It follows, but a given is false' },
  { id: 'not', label: 'It does not follow' },
];
export type SolidWant = 'solid' | 'false-given' | 'true-claim' | 'not';
export const solidAnswer = (arg: Arg) => (solidOf(arg) ? 'solid' : followsOf(arg) ? 'unsound' : 'not');
/** Every given and the claim really true, and still it does not follow: the conflict item. */
export const trueButBroken = (arg: Arg) => !followsOf(arg) && givensOf(arg).every((g) => realTruth(arg, g)) && realTruth(arg, claimOf(arg));

/** Every real argument of this kind. */
export function realArgs(want: SolidWant, pool: readonly Topic[] = REAL): Arg[] {
  const all = pool.flatMap((topic) => REAL_SHAPES.map((shape): Arg => ({ topic, shape })));
  switch (want) {
    case 'solid': return all.filter(solidOf);
    case 'false-given': return all.filter((a) => followsOf(a) && !solidOf(a));
    case 'true-claim': return all.filter(trueButBroken);
    case 'not': return all.filter((a) => !followsOf(a));
  }
}

/** Each given, really true or false, with its reason. */
export function truthCard(arg: Arg): TeachCase {
  return {
    label: 'Each given, in the real world.',
    truths: givensOf(arg).map((g, i) => ({ who: `Given ${i + 1}`, value: realTruth(arg, g) })),
    note: givensOf(arg).map((g) => realWhy(arg, g)).join(' '),
  };
}

const REAL_CASE = 'This case is not how things really are. But the givens alone do not rule it out.';

function solidFeedback(arg: Arg): Record<string, ChoiceFeedback> {
  const answer = solidAnswer(arg);
  const left = casesLeft(arg);
  const leak = left.find((c) => !claimIn(arg, c));
  const k = givensOf(arg).findIndex((g) => !realTruth(arg, g));
  const say = (c: Case) => nameNum(CASES.indexOf(c));
  const reasons = givensOf(arg).map((g) => realWhy(arg, g)).join(' ');
  if (answer === 'solid') {
    return {
      unsound: { headline: 'Your answer says a given is false, but every given here is really true.', detail: [reasons, 'It follows too. So it is solid.'], example: truthCard(arg) },
      not: { headline: 'Your answer says it does not follow, but the claim is true in every case left.', detail: [statusReason(arg), 'So it follows. Every given is true too, so it is solid.'], example: caseCard(arg, left[0]) },
    };
  }
  if (answer === 'unsound') {
    const g = givensOf(arg)[k];
    return {
      solid: {
        headline: `Your answer says every given is true, but given ${k + 1} is false.`,
        detail: [`Given ${k + 1} says “${formText(arg, g)}” ${realWhy(arg, g)}`, 'The argument still follows. But a false given means it is not solid.'],
        example: truthCard(arg),
      },
      not: {
        headline: 'Your answer says it does not follow, but a false given does not stop an argument from following.',
        detail: [`Say both givens were true. ${statusReason(arg)} So the claim would have to be true.`, `Given ${k + 1} is false. ${realWhy(arg, g)}`, 'So it follows, but it is not solid.'],
        example: caseCard(arg, left[0]),
      },
    };
  }
  const allTrue = givensOf(arg).every((g) => realTruth(arg, g)) && realTruth(arg, claimOf(arg));
  return {
    solid: {
      headline: 'Your answer says it is solid, but one case left makes the claim false.',
      detail: [
        ...(allTrue ? ['Every given is really true, and the claim is true too.'] : []),
        `But ${say(leak!).toLowerCase()} breaks no given, and the claim is false there. ${REAL_CASE}`,
        'So the givens do not force the claim. An argument that does not follow is never solid.',
      ],
      example: caseCard(arg, leak!),
    },
    unsound: {
      headline: 'Your answer says it follows, but one case left makes the claim false.',
      detail: [`${say(leak!)} breaks no given, and the claim is false there. ${REAL_CASE}`, 'So it does not follow.'],
      example: caseCard(arg, leak!),
    },
  };
}

/** Solid, follows but a given is false, or does not follow: a real argument. */
export function solidItem(rng: Rng, o: { want: SolidWant; avoid?: Set<string> }): ArgMade {
  const pool = realArgs(o.want);
  const fresh = pool.filter((a) => !o.avoid?.has(a.topic.id));
  const arg = rng.pick(fresh.length ? fresh : pool);
  o.avoid?.add(arg.topic.id);
  const answer = solidAnswer(arg);
  const k = givensOf(arg).findIndex((g) => !realTruth(arg, g));
  const explain =
    answer === 'solid'
      ? `${statusReason(arg)} So it follows. Every given is really true too. So it is solid.`
      : answer === 'unsound'
        ? `${statusReason(arg)} So it follows. But given ${k + 1} is false. ${realWhy(arg, givensOf(arg)[k])} So it is not solid.`
        : `${statusReason(arg)} So it does not follow. An argument that does not follow is never solid.`;
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${REAL_SETTING} Is this argument solid? Solid means it follows, and every given is really true.`,
    scene: argScene(arg),
    choices: SOLID_CHOICES.map((c) => ({ ...c })),
    answer,
    explain,
    feedback: solidFeedback(arg),
    hint: 'Here is one case, already checked. Check the other cases. Then check each given.',
    hintCase: caseCard(arg, firstOut(arg)),
    teach: {
      rule: 'An argument is solid when it follows and every given is really true. Check both.',
      terms: [...caseTerms(arg), { word: 'Solid', meaning: 'it follows, and every given is really true.' }],
      meaning: meaningOf(arg),
      casesTitle: 'Every case, then each given in the real world',
      cases: [...CASES.map((c) => caseCard(arg, c)), truthCard(arg)],
      remember: ['Solid needs two things: it follows, and every given is true.', 'Ask: “Does it follow? Is every given really true?”'],
      simpler: ['First, picture every case. Does the claim follow?', 'Next, think about the real world. Is each given true?', 'It is solid only if both answers are yes.'],
    },
    confused: [GIVEN_TRUE_Q, TRUE_FOLLOWS_Q],
    ...(answer === 'unsound' ? { tags: [FALSE_GIVEN.tag] } : {}),
    ...(trueButBroken(arg) ? { conflict: true } : {}),
  };
  return done('solid', arg, item);
}

/** The reasons for “Why does it follow?” and “Why does it not follow?”. One is right each time. */
export const WHY_FOLLOWS: readonly Choice[] = [
  { id: 'force', label: 'The givens force the claim: it is true in every case left.' },
  { id: 'true', label: 'The claim is true, so the argument follows.' },
  { id: 'given', label: 'Every given is true, so the argument follows.' },
  { id: 'sounds', label: 'The claim sounds right, so the argument follows.' },
];
export const WHY_NOT: readonly Choice[] = [
  { id: 'leak', label: 'A case left makes the claim false, so the givens do not force it.' },
  { id: 'claim', label: 'The claim is false, so the argument can’t follow.' },
  { id: 'given', label: 'A given is false, so the argument can’t follow.' },
  { id: 'few', label: 'Two givens are too few for any claim to follow.' },
];
/** The broken twin of a shape that follows: the same words, a case left where the claim is false. */
const BROKEN: Partial<Record<ShapeId, ShapeId>> = { mp: 'conv', mt: 'inv', no: 'no-conv' };

/**
 * The closing why item: the reason an argument follows (made-up or story words, where being true can’t be the reason),
 * or the reason a real argument whose every sentence is true does not follow.
 */
export function whyItem(rng: Rng, o: { follows?: boolean; avoid?: Set<string> } = {}): ArgMade {
  const f = o.follows ?? rng.chance(0.5);
  const tags = [WHY_TAG];
  const teach = (arg: Arg, extra: TeachCase[] = []): Teach => ({
    rule: 'An argument follows when the givens force the claim. That depends on its shape, not on what is true.',
    terms: [...caseTerms(arg), { word: 'The shape', meaning: 'the pattern of an argument. Swap its words, and the shape stays.' }],
    meaning: meaningOf(arg),
    casesTitle: 'Every case',
    cases: [...CASES.map((c) => caseCard(arg, c)), ...extra],
    remember: ['Follows is about the shape, not about what is true.', 'Ask: “Is there a case left where the claim is false?”'],
    simpler: [fourCases(arg), 'Cross out each case that breaks a given.', 'If the claim is true in every case left, the givens force it. That is why it follows.'],
  });
  if (f) {
    const made = rng.chance(0.5);
    const t = made ? nonsenseTopic(rng) : pickTopic(rng, STORY_TOPICS, o.avoid);
    const arg: Arg = { topic: t, shape: rng.pick(FOLLOW_SHAPES) };
    const broken: Arg = { topic: t, shape: BROKEN[arg.shape]! };
    const leak = casesLeft(broken).find((c) => !claimIn(broken, c))!;
    const many = t.a.noun![1];
    const item: ChooseCore = {
      kind: 'choose',
      prompt: made ? 'This argument uses made-up words, and it follows. Why does it follow?' : `${t.setting} This argument follows. Why does it follow?`,
      scene: argScene(arg),
      choices: rng.shuffle(WHY_FOLLOWS.map((c) => ({ ...c }))),
      answer: 'force',
      explain: `${statusReason(arg)} So the givens force the claim. That is why it follows, not because the claim is true.`,
      feedback: {
        true: {
          headline: 'Your answer says a true claim makes an argument follow, but follows is about the givens.',
          detail: made
            ? [`Nobody knows if ${claimMid(arg)}. ${cap(many)} are not real!`, 'It follows anyway. If both givens were true, the claim would have to be true.']
            : ['A claim can be true and still not follow.', `Look at this one: “${argText(broken)}” Its claim could be true. But the givens do not force it.`, 'Here, the givens do force the claim. That is why it follows.'],
          example: caseCard(arg, casesLeft(arg)[0]),
        },
        given: {
          headline: 'Your answer says true givens make an argument follow, but follows is about the shape.',
          detail: made
            ? [`Nobody knows if ${formMid(arg, givensOf(arg)[0])}. ${cap(many)} are not real!`, 'It follows anyway. Follows asks what would happen if the givens were true.']
            : ['Givens can all be true while the claim is false, when the shape is broken.', `Look at “${argText(broken)}” Both givens could be true, and the claim false.`],
          example: made ? caseCard(arg, casesLeft(arg)[0]) : caseCard(broken, leak),
        },
        sounds: {
          headline: 'Your answer says the claim sounds right, but sounding right never makes an argument follow.',
          detail: ['Check the cases instead.', `${statusReason(arg)} That is why it follows.`],
          example: caseCard(arg, casesLeft(arg)[0]),
        },
      },
      hint: CASE_HINT,
      hintCase: caseCard(arg, firstOut(arg)),
      teach: teach(arg),
      tags,
    };
    return done('why', arg, item);
  }
  const pool = realArgs('true-claim');
  const fresh = pool.filter((a) => !o.avoid?.has(a.topic.id));
  const arg = rng.pick(fresh.length ? fresh : pool);
  o.avoid?.add(arg.topic.id);
  const leak = casesLeft(arg).find((c) => !claimIn(arg, c))!;
  const say = nameNum(CASES.indexOf(leak));
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${REAL_SETTING} Every sentence in this argument is really true. But the argument does not follow. Why not?`,
    scene: argScene(arg),
    choices: rng.shuffle(WHY_NOT.map((c) => ({ ...c }))),
    answer: 'leak',
    explain: `${say} breaks no given, and the claim is false there. So the givens do not force the claim, even though it is true.`,
    feedback: {
      claim: {
        headline: 'Your answer says the claim is false, but it is really true.',
        detail: [realWhy(arg, claimOf(arg)), `The argument still does not follow. ${say} breaks no given, and the claim is false there.`],
        example: caseCard(arg, leak),
      },
      given: {
        headline: 'Your answer says a given is false, but every given here is really true.',
        detail: [givensOf(arg).map((g) => realWhy(arg, g)).join(' '), 'It does not follow because of its shape.'],
        example: truthCard(arg),
      },
      few: {
        headline: 'Your answer says two givens are too few, but two givens can be enough.',
        detail: [`Look at “${argText({ topic: arg.topic, shape: 'mp' })}” It has two givens, and it follows.`, 'This argument does not follow because of its shape.'],
        example: caseCard(arg, leak),
      },
    },
    hint: CASE_HINT,
    hintCase: caseCard(arg, firstOut(arg)),
    teach: teach(arg, [truthCard(arg)]),
    tags,
    conflict: true,
  };
  return done('why', arg, item);
}

// ---------- distinctions: two ideas a learner can merge into one ----------

/** Lesson 1: the claim is the sentence the givens back up, wherever it sits. */
export const PLACE_VS_JOB: Distinction = { id: 'place-vs-job', a: 'Where a sentence sits in the story.', b: 'What job it does: a given or the claim.' };
/** Lesson 2 (and reminded in 3 and 4): a true claim need not follow. */
export const TRUE_VS_FOLLOWS: Distinction = { id: 'true-vs-follows', a: 'The claim is true.', b: 'The claim follows: the givens force it.' };
/** Lesson 4: being given does not make a sentence true. */
export const GIVEN_VS_TRUE: Distinction = { id: 'given-vs-true', a: 'A sentence is a given.', b: 'A sentence is really true.' };

// ---------- “I’m confused” questions: each finds one merged idea, and never gives a board’s answer ----------

const NOT_SURE = { label: 'Not sure' };
export const PLACE_Q: ConfusedQuestion = {
  q: 'Is the claim always the last sentence?',
  options: [{ label: 'No. A signpost word shows the claim', right: true }, { label: 'Yes. The claim always comes last' }, NOT_SURE],
  teach: 'No. A claim can come first. Look for “so,” “that means” or “must.” They point to the claim, wherever it sits.',
};
export const STATEMENT_Q: ConfusedQuestion = {
  q: 'Can a question be a given?',
  options: [{ label: 'No. A given must be true or false', right: true }, { label: 'Yes. Any sentence can be a given' }, NOT_SURE],
  teach: 'No. A given is a reason you take as true for now. A question is not true or false, so it can’t be a given. Neither can a command or an opinion.',
};
export const CASES_LEFT_Q: ConfusedQuestion = {
  q: 'A case breaks a given. Does the claim matter in that case?',
  options: [{ label: 'No. Only the cases left count', right: true }, { label: 'Yes. Every case counts' }, NOT_SURE],
  teach: 'No. A case that breaks a given can’t happen if every given is true. So cross it out. Only the cases left show if the claim must be true.',
};
export const TRUE_FOLLOWS_Q: ConfusedQuestion = {
  q: 'A claim is true. Does that mean it follows from the givens?',
  options: [{ label: 'No. It follows only if the givens force it', right: true }, { label: 'Yes. A true claim always follows' }, NOT_SURE],
  teach: 'No. A claim can be true and still not follow. It follows only when it is true in every case the givens leave.',
};
export const SHAPE_Q: ConfusedQuestion = {
  q: 'Do you need to know what the words mean to check if it follows?',
  options: [{ label: 'No. The shape decides it', right: true }, { label: 'Yes. You must know what the words mean' }, NOT_SURE],
  teach: 'No. Say the givens are true, and picture every case. The words can even be made up. The shape decides if the claim is forced.',
};
export const GIVEN_TRUE_Q: ConfusedQuestion = {
  q: 'A given is false. Can the argument still follow?',
  options: [{ label: 'Yes. Follows asks what happens if the givens are true', right: true }, { label: 'No. A false given means it does not follow' }, NOT_SURE],
  teach: 'Yes. Follows asks: if every given were true, would the claim have to be true? A false given does not change that. It only stops the argument from being solid.',
};
export const ALL_WAY_Q: ConfusedQuestion = {
  q: 'Does “All birds have feathers” say that everything with feathers is a bird?',
  options: [{ label: 'No. It only talks about birds', right: true }, { label: 'Yes. They mean the same' }, NOT_SURE],
  teach: 'No. A feather hat has feathers, and it is not a bird. “All birds have feathers” only talks about birds. It says nothing about things that are not birds.',
};

export const NO_WAY_Q: ConfusedQuestion = {
  q: 'Does “No bird has fur” say anything about a thing that is not a bird?',
  options: [{ label: 'No. It only talks about birds', right: true }, { label: 'Yes. It says that thing has fur' }, NOT_SURE],
  teach: 'No. Only a bird with fur breaks “No bird has fur.” A cat has fur, and it is not a bird. The given says nothing about things that are not birds.',
};
export const FLIP_Q: ConfusedQuestion = {
  q: 'You flip a claim to its opposite. Does that change which cases are left?',
  options: [{ label: 'No. Only the claim changed', right: true }, { label: 'Yes. Other cases are left now' }, NOT_SURE],
  teach: 'No. The givens are the same, so the same cases are crossed out. Only the claim changed. Look at the new claim in each case left.',
};

// ---------- misconceptions: a pattern of wrong marks that points to a belief ----------

export const PLACE_AS_JOB =
  'You may be treating where a sentence sits and what job it does as the same thing. They are two different things. A claim can come first. Look for the signpost word: “so,” “that means” or “must” points to the claim.';
export const OTHER_AS_GIVEN =
  'You may be treating every sentence in a story and a given as the same thing. They are two different things. A given must be a statement: true or false. A question, a command or an opinion is never a given.';
export const TRUE_AS_FOLLOWS =
  'You may be treating “the claim is true” and “the claim follows” as the same thing. They are two different things. A claim follows only when the givens force it. Look for a case left where the claim is false.';
export const OUT_STILL_COUNTS =
  'You may be treating every case and the cases left as the same thing. They are two different things. A case that breaks a given is crossed out. It can’t happen if the givens are true, so it does not count.';
export const SOME_AS_EVERY =
  'You may be treating “true in one case left” and “true in every case left” as the same thing. They are two different things. The claim must be true only if it is true in every case left. Look at each case left again.';
export const WORDS_AS_SHAPE =
  'You may be treating “the same words” and “the same shape” as the same thing. They are two different things. Swap the words back. If the parts do not sit in the same places, the shape is different.';
export const FALSE_AS_NOT =
  'You may be treating “a given is false” and “it does not follow” as the same thing. They are two different things. Follows asks: if every given were true, must the claim be true? A false given only stops it from being solid.';
export const FLIP_AS_SAME =
  'You may be treating a claim and its flipped claim as the same thing. They are two different things. The same cases are left, but the flipped claim says the opposite. Look at it in each case left.';
export const TRUE_GIVENS_AS_SOLID =
  'You may be treating “every given is true” and “solid” as the same thing. They are two different things. Solid needs two things. It must follow, and every given must be true.';

/** “All birds have feathers” read as “All things that have feathers are birds”. */
export function allBackwards(arg: Arg): string {
  const [g1] = givenTexts(arg);
  const many = arg.topic.a.noun![1];
  return `You may be treating “${g1}” and “All things that ${second(arg).are} are ${many}.” as the same thing. They are two different things. Given 1 only talks about ${many}. When ${arg.topic.who} ${arg.topic.a.isNot}, given 1 says nothing about ${arg.topic.who}.`;
}

/** “No bird has fur” read as “Everything that does not have fur is a bird”. */
export function noOnly(arg: Arg): string {
  const [g1] = givenTexts(arg);
  const A = arg.topic.a;
  return `You may be treating “${g1}” and “Everything that ${second(arg).isNot} ${A.is}.” as the same thing. They are two different things. Given 1 only talks about ${A.noun![1]}. When ${arg.topic.who} ${A.isNot}, given 1 says nothing about ${arg.topic.who}.`;
}

// ---------- board pieces ----------

export const YES_NO: DrillOption[] = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
export const ROLE_OPTIONS: DrillOption[] = [{ id: 'given', label: 'Given' }, { id: 'claim', label: 'Claim' }, { id: 'other', label: 'Neither' }];
export const CASE_OPTIONS: DrillOption[] = [{ id: 'out', label: 'Crossed out' }, { id: 'yes', label: 'Left: claim true' }, { id: 'no', label: 'Left: claim false' }];
export const STATUS_OPTIONS: DrillOption[] = [{ id: 'must', label: 'Must be true' }, { id: 'might', label: 'Might be true or false' }, { id: 'cant', label: 'Can’t be true' }];
export const FOLLOW_OPTIONS: DrillOption[] = [{ id: 'follows', label: 'Follows' }, { id: 'not', label: 'Does not follow' }];
export const SOLID_OPTIONS: DrillOption[] = [{ id: 'solid', label: 'Solid' }, { id: 'not', label: 'Not solid' }];
const yn = (v: boolean) => (v ? 'yes' : 'no');

/** The mark a case gets: crossed out, or left with the claim true or false. */
export const caseAnswer = (arg: Arg, c: Case) => (breaks(arg, c) >= 0 ? 'out' : claimIn(arg, c) ? 'yes' : 'no');
const caseId = (c: Case) => `case${CASES.indexOf(c) + 1}`;

function caseMarkWhy(arg: Arg, c: Case, wrong: string): string {
  const gi = breaks(arg, c);
  if (gi >= 0) return `${givenWhy(arg, gi, c)} So cross this case out.`;
  if (wrong === 'out') return `This case breaks no given. ${givensOf(arg).map((_, i) => givenWhy(arg, i, c)).join(' ')}`;
  return claimWhy(arg, c);
}

/** The ids of argument k’s marks on a board of two arguments (“a1-case2”, “a1-verdict”); with one argument, “case2”. */
const markPre = (k?: number) => (k === undefined ? '' : `a${k + 1}-`);
const caseLabel = (arg: Arg, c: Case) => `${nameNum(CASES.indexOf(c))}: ${caseFacts(arg, c).join(' ')}`;

/** One case’s mark for one argument: crossed out, left with the claim true, or left with the claim false. */
function caseMark(arg: Arg, c: Case, label: string, k?: number): DrillMark {
  const answer = caseAnswer(arg, c);
  const why: Record<string, string> = {};
  for (const o of CASE_OPTIONS) if (o.id !== answer) why[o.id] = caseMarkWhy(arg, c, o.id);
  return { id: `${markPre(k)}${caseId(c)}`, label, options: CASE_OPTIONS, answer, why };
}

/** One case as a board row: crossed out, left with the claim true, or left with the claim false. */
export function caseRow(arg: Arg, c: Case): DrillRow {
  return { id: caseId(c), label: caseLabel(arg, c), marks: [caseMark(arg, c, 'Crossed out or left?')] };
}

/** Why a wrong must, might, can’t, follows or does-not-follow mark misses. */
export function statusMarkWhy(arg: Arg, wrong: string): string {
  const left = casesLeft(arg);
  const yes = left.find((c) => claimIn(arg, c));
  const no = left.find((c) => !claimIn(arg, c));
  if (wrong === 'must' || wrong === 'follows') return `${nameNum(CASES.indexOf(no!))} is left: ${caseMid(arg, no!)}. The claim is false there, so it does not have to be true.`;
  if (wrong === 'cant') return `${nameNum(CASES.indexOf(yes!))} is left: ${caseMid(arg, yes!)}. The claim is true there, so it can be true.`;
  if (wrong === 'might') return statusOf(arg) === 'must' ? 'The claim is true in every case left. So it must be true.' : 'The claim is false in every case left. So it can’t be true.';
  return 'The claim is true in every case left. So the givens force it: it follows.';
}

/** The answer of a must, might or can’t mark (or a follows or not mark). */
const verdictAnswer = (arg: Arg, kind: 'status' | 'follows') => (kind === 'status' ? statusOf(arg) : followsOf(arg) ? 'follows' : 'not');
const VERDICT_LABEL = { status: 'Must, might or can’t?', follows: 'Follows or not?' } as const;

/** One argument’s verdict mark: must, might or can’t (or follows or not), with words for each wrong one. */
function verdictMark(arg: Arg, kind: 'status' | 'follows', id: string, label: string = VERDICT_LABEL[kind]): DrillMark {
  const options = kind === 'status' ? STATUS_OPTIONS : FOLLOW_OPTIONS;
  const answer = verdictAnswer(arg, kind);
  const why: Record<string, string> = {};
  for (const o of options) if (o.id !== answer) why[o.id] = statusMarkWhy(arg, o.id);
  return { id, label, options, answer, why };
}

/** The last row of a case board: must, might or can’t (or follows or not). */
export function verdictRow(arg: Arg, kind: 'status' | 'follows'): DrillRow {
  return {
    id: 'verdict',
    label: kind === 'status' ? 'Say both givens are true. Then the claim…' : 'So, does the claim follow?',
    marks: [verdictMark(arg, kind, 'verdict')],
  };
}

/** The patterns of wrong marks a case board can catch, most specific first. k: the argument’s place on a two-argument board. */
export function caseMisconceptions(arg: Arg, verdict: 'status' | 'follows', k?: number): Misconception[] {
  const p = markPre(k);
  const out: Misconception[] = [];
  // Read backwards (“All b are a”), given 1 would cross out a case left that is b but not an a.
  if (!isNoShape(arg.shape)) for (const c of casesLeft(arg)) if (!c.a && c.b) out.push({ id: 'all-backwards', when: 'picks', picks: { [`${p}${caseId(c)}`]: 'out' }, text: allBackwards(arg) });
  // Read as “Everything that is not n is an a”, a “No …” given would cross out a case left that is neither.
  if (isNoShape(arg.shape)) for (const c of casesLeft(arg)) if (!c.a && !c.b) out.push({ id: 'no-only', when: 'picks', picks: { [`${p}${caseId(c)}`]: 'out' }, text: noOnly(arg) });
  for (const c of CASES) if (breaks(arg, c) >= 0) out.push({ id: 'out-counts', when: 'picks', picks: { [`${p}${caseId(c)}`]: claimIn(arg, c) ? 'yes' : 'no' }, text: OUT_STILL_COUNTS });
  if (statusOf(arg) === 'might') out.push({ id: 'some-as-every', when: 'picks', picks: { [`${p}verdict`]: verdict === 'status' ? 'must' : 'follows' }, text: SOME_AS_EVERY });
  return out;
}

const CASE_CLOSING = 'Those ideas are apart now. Back to the board: check one case at a time.';
export const CASE_STEPS = ['Picture every case.', 'Cross out each case that breaks a given.', 'Look at the claim in each case left.', 'Must, might or can’t?'];
const CASE_WORDS: BoardWords = { closing: CASE_CLOSING };

/** The thinking board on a follows item (Item.scratch, “the case board”): each case, crossed out or left. */
export function caseScratch(arg: Arg): DrillStep {
  return {
    id: 's18.case-board',
    title: 'Check each case',
    body: ['Cross out each case that breaks a given.', 'For each case left, is the claim true?'],
    rows: CASES.map((c) => caseRow(arg, c)),
    done: '',
    words: CASE_WORDS,
  };
}

// ---------- the worked arguments ----------

export const RAIN: Arg = { topic: W_RAIN, shape: 'mp' };
const RAIN_FACT = fact('a', true);
/** The story on the example card: the claim last, with “so”. */
export const RAIN_STORY = fixedStory(RAIN, [{ given: RAIN_FACT }, { given: ALL }, { claim: 'so' }, { other: C('Get him a towel!') }]);
/** The same argument with the claim first (the contrast card and its board). */
export const RAIN_FIRST = fixedStory(RAIN, [{ claim: 'must' }, { given: ALL, sign: 'because' }, { given: RAIN_FACT }, { other: C('Get him a towel!') }]);
/** The board’s twin: the same argument in a new order, with two new sentences. */
export const RAIN_TWIN = fixedStory(RAIN, [{ other: O('Rainy days are the worst.') }, { given: ALL }, { given: RAIN_FACT }, { claim: 'means' }, { other: Q('Is he muddy too?') }]);

export const PIP: Arg = { topic: W_PIP, shape: 'mp' };
export const PIP_TWIN: Arg = { topic: W_PIP, shape: 'conv' };
export const PIP_ROBIN: Arg = { topic: W_PIP_ROBIN, shape: 'mp' };
export const PIP_SING: Arg = { topic: W_PIP_SING, shape: 'conv' };
export const GLORP: Arg = { topic: W_GLORP, shape: 'mp' };
export const GLORP_TWIN: Arg = { topic: W_GLORP, shape: 'conv' };
export const DOT: Arg = { topic: W_DOT, shape: 'mp' };
export const REX_ANIMAL: Arg = { topic: W_REX, shape: 'conv' };
/** The shape board’s rows: one with the glorp shape, two without. */
export const GOLDIE_ROWS: readonly Arg[] = [{ topic: W_GOLDIE, shape: 'conv' }, { topic: W_GOLDIE, shape: 'mp' }, { topic: W_GOLDIE, shape: 'inv' }];
export const PENGUIN_FEATHERS: Arg = { topic: W_PENGUIN_FEATHERS, shape: 'mp' };
export const PENGUIN_FLY: Arg = { topic: W_PENGUIN_FLY, shape: 'mp' };
export const SUN_BROKEN: Arg = { topic: W_SUN, shape: 'conv' };
export const SUN: Arg = { topic: W_SUN, shape: 'mp' };
export const SOLID_ROWS: readonly Arg[] = [{ topic: W_DUCK, shape: 'mp' }, { topic: W_COW, shape: 'mp' }, { topic: W_OWL, shape: 'conv' }];

/**
 * Lessons 2 and 3’s family cards: every rule family a quiz can ask is seen on a card first. Given 2 can say “not” (the
 * card’s picture), and the card’s words flip its claim (must turns into can’t) and swap its given 2 and claim (might
 * be true or false); given 1 can say “No”, flipped and swapped the same way. Lesson 2 also flips the first Pip claim.
 * Every flip and swap is worked out from the model’s shapes (flipShape, swapShape), never written by hand.
 */
export const PIP_NOT: Arg = { topic: W_PIP, shape: 'mt' };
export const PIP_NOT_FLIP: Arg = { topic: W_PIP, shape: flipShape(PIP_NOT.shape) };
export const PIP_NOT_SWAP: Arg = { topic: W_PIP, shape: swapShape(PIP_NOT.shape) };
export const PIP_FLIP: Arg = { topic: W_PIP, shape: flipShape(PIP.shape) };
export const PIP_NO: Arg = { topic: W_PIP, shape: 'no' };
export const PIP_NO_FLIP: Arg = { topic: W_PIP, shape: flipShape(PIP_NO.shape) };
export const PIP_NO_SWAP: Arg = { topic: W_PIP, shape: swapShape(PIP_NO.shape) };
export const GLORP_NOT: Arg = { topic: W_GLORP, shape: 'mt' };
export const GLORP_NOT_SWAP: Arg = { topic: W_GLORP, shape: swapShape(GLORP_NOT.shape) };
export const GLORP_NO: Arg = { topic: W_GLORP, shape: 'no' };
export const GLORP_NO_SWAP: Arg = { topic: W_GLORP, shape: swapShape(GLORP_NO.shape) };

/** Where each lesson’s cards sit: its contrast card, its worked example and its family cards. Boards open right after them. */
export const L1_CARDS = { contrast: 2, example: 3 } as const;
export const L2_CARDS = { contrast: 3, example: 4, not: 5, no: 6 } as const;
export const L3_CARDS = { example: 1, shape: 4, not: 5, no: 6 } as const;
export const L4_CARDS = { contrast: 1, example: 2 } as const;

// ---------- Lesson 1: the claim can come first ----------

const L1_CLOSING = 'Those two ideas are apart now. Back to the board: find the signpost word, then mark each sentence.';
const lastStatement = (s: Story) => s.lines.filter((l) => l.role !== 'other').slice(-1)[0];

/** Two stories with the same givens and claim in a different order: the last sentence is the claim in one, a given in the other. */
export function placeContrast(): Extract<Scene, { kind: 'contrast' }> {
  const panel = (s: Story): ContrastPanel => {
    const last = lastStatement(s);
    const claim = s.lines.find((l) => l.role === 'claim')!;
    return {
      world: s.lines.filter((l) => l.role !== 'other').map((l) => l.text).join(' '),
      who: 'The last sentence',
      says: last.text,
      truth: last.role === 'claim',
      because: last.role === 'claim' ? `${claimSign(last)} Here the claim comes last.` : `It gives a reason, so it is a given. ${claimSign(claim)} The claim comes first.`,
      ...(last.role === 'claim' ? {} : { then: `The claim is ${quoted(claim)}` }),
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(RAIN_STORY), panel(RAIN_FIRST)],
    ask: { q: 'Is the claim always the last sentence?', a: 'No. Both stories have the same givens and the same claim. Only the order changed. The signpost word shows the claim.' },
    words: { worldTag: 'Story', saysWord: 'is:', truth: 'The claim', untruth: 'Not the claim' },
  };
}

/** One sentence as a board row: given, claim or neither. */
function roleRow(s: Story, l: Line, k: number): DrillRow {
  const claim = s.lines.find((x) => x.role === 'claim')!;
  const id = `s${k + 1}`;
  const why: Record<string, string> = {};
  for (const o of ROLE_OPTIONS) {
    if (o.id === l.role) continue;
    why[o.id] =
      l.role === 'given'
        ? o.id === 'claim'
          ? `It gives a reason for another sentence. The claim is ${quoted(claim)}`
          : 'It is a statement, and it gives a reason for the claim. So it is a given.'
        : l.role === 'claim'
          ? `${claimSign(l)} The givens back it up.`
          : `${OTHER_NOTE[l.kind!]}${o.id === 'claim' ? ' It is not the claim either.' : ''}`;
  }
  return { id, label: `Sentence ${k + 1}: ${l.text}`, marks: [{ id, label: 'Its job', options: ROLE_OPTIONS, answer: l.role, why }] };
}

const otherMisconceptions = (s: Story): Misconception[] =>
  s.lines.flatMap((l, k) => (l.role === 'other' ? [{ id: 'other-as-given', when: 'picks' as const, picks: { [`s${k + 1}`]: 'given' }, text: OTHER_AS_GIVEN }] : []));

/** Do, right after the contrast card: mark the job of each sentence when the claim comes first. */
export function placeBoard(): DrillStep {
  const s = RAIN_FIRST;
  const last = s.lines.indexOf(lastStatement(s));
  return {
    id: 's18.l1-do-place',
    title: 'The claim comes first',
    body: ['Here is the second story again, with one more sentence.', 'Mark the job of each sentence: a given, the claim, or neither.'],
    scene: placeContrast(),
    afterCard: L1_CARDS.contrast,
    rows: s.lines.map((l, k) => roleRow(s, l, k)),
    scaffold: 'full',
    misconceptions: [{ id: 'place-as-job', when: 'picks', picks: { [`s${last + 1}`]: 'claim' }, text: PLACE_AS_JOB }, ...otherMisconceptions(s)],
    confused: [PLACE_Q, STATEMENT_Q],
    distinction: PLACE_VS_JOB.id,
    words: { closing: L1_CLOSING },
    done: 'Right. “Must” points to the claim, even though it comes first.',
  };
}

/** Do, right after the example: a twin story to mark. */
export function rolesBoard(): DrillStep {
  const s = RAIN_TWIN;
  return {
    id: 's18.l1-do',
    title: 'Mark each sentence',
    body: ['Here is a new story about Rex.', 'Mark the job of each sentence: a given, the claim, or neither.'],
    scene: storyScene(s),
    twin: 'The same argument in a new order, with two new sentences.',
    afterCard: L1_CARDS.example,
    rows: s.lines.map((l, k) => roleRow(s, l, k)),
    misconceptions: otherMisconceptions(s),
    confused: [STATEMENT_Q, PLACE_Q],
    words: { closing: L1_CLOSING },
    done: 'Right. Two givens, one claim, and two sentences that are not givens.',
  };
}

// ---------- Lesson 2: true is not the same as follows ----------

const TF_CLOSING = 'Those two ideas are apart now. Back to the board: a true claim still has to be forced.';
/** The trueFollows rows: an argument and what is true in its story (a case). */
export const TF_ROWS: readonly { arg: Arg; story: Case }[] = [
  { arg: PIP_ROBIN, story: { a: true, b: true } },
  { arg: PIP_TWIN, story: { a: true, b: true } },
  { arg: PIP_SING, story: { a: false, b: true } },
];

/** The same true claim, “Pip is a bird”: forced by the first givens, not by the second. */
export function trueFollowsContrast(): Extract<Scene, { kind: 'contrast' }> {
  const [a, b] = [PIP_ROBIN, PIP_TWIN];
  const leak = casesLeft(b).find((c) => !claimIn(b, c))!;
  return {
    kind: 'contrast',
    pairs: [
      { world: givenTexts(a).join(' '), who: 'The claim', says: claimText(a), truth: followsOf(a), because: `Say both givens are true. Then ${caseMid(a, casesLeft(a)[0])}. The givens force the claim.` },
      {
        world: givenTexts(b).join(' '),
        who: 'The claim',
        says: claimText(b),
        truth: followsOf(b),
        because: `Picture this case: ${caseMid(b, leak)}. Say Pip is a toy with feathers. Both givens are true, and the claim is false.`,
        then: 'Pip really is a bird. But these givens do not force it.',
      },
    ],
    ask: { q: 'Pip really is a bird. Does the claim follow in both?', a: 'No. Only the first givens force it. A claim can be true and still not follow.' },
    words: { worldTag: 'Givens', saysWord: 'says:', truth: 'Follows', untruth: 'Does not follow' },
  };
}

/** Do, right after the contrast: for each argument, is the claim true in the story, and do the givens force it? */
export function trueFollowsBoard(): DrillStep {
  const rows: DrillRow[] = TF_ROWS.map(({ arg, story }, k): DrillRow => {
    const id = `r${k + 1}`;
    const f = claimOf(arg) as Extract<Form, { t: 'fact' }>;
    const t = claimIn(arg, story);
    const fol = followsOf(arg);
    const leak = casesLeft(arg).find((c) => !claimIn(arg, c));
    return {
      id,
      label: `${argText(arg)} In the story: ${caseFacts(arg, story).join(' ')}`,
      marks: [
        {
          id: `${id}-true`,
          label: 'Is the claim true in the story?',
          options: YES_NO,
          answer: yn(t),
          why: { [yn(!t)]: `The claim says “${claimText(arg)}” In the story, ${formMid(arg, fact(f.r, story[f.r]))}. So the claim is ${t ? 'true' : 'false'} in the story.` },
        },
        {
          id: `${id}-follows`,
          label: 'Do the givens force the claim?',
          options: FOLLOW_OPTIONS,
          answer: fol ? 'follows' : 'not',
          why: fol
            ? { not: `${statusReason(arg)} So the givens force the claim.` }
            : { follows: `Picture ${nameNum(CASES.indexOf(leak!)).toLowerCase()}: ${caseMid(arg, leak!)}. Both givens are true there, and the claim is false. So the givens do not force it.` },
          compare: { says: claimText(arg), world: givenTexts(arg).join(' ') },
        },
      ],
    };
  });
  const misconceptions: Misconception[] = TF_ROWS.flatMap(({ arg, story }, k) =>
    claimIn(arg, story) && !followsOf(arg) ? [{ id: 'true-as-follows', when: 'picks' as const, picks: { [`r${k + 1}-true`]: 'yes', [`r${k + 1}-follows`]: 'follows' }, text: TRUE_AS_FOLLOWS }] : [],
  );
  return {
    id: 's18.l2-do-true',
    title: 'True or follows?',
    body: ['For each argument, first say if the claim is true in the story.', 'Then say if the givens force the claim. Picture the cases to check.'],
    scene: trueFollowsContrast(),
    afterCard: L2_CARDS.contrast,
    rows,
    scaffold: 'full',
    words: { says: 'Claim', world: 'Givens', so: 'So', ask: 'Do the givens force the claim?', closing: TF_CLOSING },
    misconceptions,
    confused: [TRUE_FOLLOWS_Q, CASES_LEFT_Q],
    distinction: TRUE_VS_FOLLOWS.id,
    done: 'Right. A true claim does not always follow. It follows only when the givens force it.',
  };
}

/** Card 2: every case of the worked argument, not marked yet. */
export const casesScene = () => argScene(PIP, { cases: 'blank' });
/** The worked example: every case of “All birds have feathers. Pip is a bird. So Pip has feathers.”, marked. */
export const followsWorkedScene = () => argScene(PIP, { cases: 'marked', caption: `${statusReason(PIP, false)} So the claim must be true. It follows.` });

/** Do, right after the example: the twin (given 2 and the claim swapped), every case, then must, might or can’t. */
export function followsBoard(): DrillStep {
  const arg = PIP_TWIN;
  return {
    id: 's18.l2-do',
    title: 'Check each case',
    body: ['The same givens, but given 2 and the claim swapped places.', 'Cross out each case that breaks a given. For each case left, is the claim true?', 'Then pick: must, might or can’t?'],
    scene: argScene(arg, { cases: 'blank' }),
    twin: 'Given 2 and the claim swapped places.',
    afterCard: L2_CARDS.example,
    rows: [...CASES.map((c) => caseRow(arg, c)), verdictRow(arg, 'status')],
    scaffold: 'full',
    steps: CASE_STEPS,
    misconceptions: caseMisconceptions(arg, 'status'),
    confused: [CASES_LEFT_Q, ALL_WAY_Q, TRUE_FOLLOWS_Q],
    words: CASE_WORDS,
    done: `Right. ${statusReason(arg, false)} So the claim might be true or false. It does not follow.`,
  };
}

// ---------- Lesson 3: the shape decides ----------

export const glorpScene = () => argScene(GLORP);
export const glorpWorkedScene = () => argScene(GLORP, { cases: 'marked', caption: `${statusReason(GLORP, false)} So it follows, whatever a glorp is.` });
export const rexScene = () => argScene(REX_ANIMAL, { cases: 'marked', caption: `${statusReason(REX_ANIMAL, false)} So it does not follow, even though every sentence sounds right.` });

/** Do, right after the glorp example: the broken twin, every case, then follows or not. */
export function glorpBoard(): DrillStep {
  const arg = GLORP_TWIN;
  return {
    id: 's18.l3-do',
    title: 'Check the made-up words',
    body: ['The same made-up words, but given 2 and the claim swapped places.', 'Cross out each case that breaks a given. For each case left, is the claim true?', 'Then say if it follows.'],
    scene: argScene(arg, { cases: 'blank' }),
    twin: 'Given 2 and the claim swapped places.',
    afterCard: L3_CARDS.example,
    rows: [...CASES.map((c) => caseRow(arg, c)), verdictRow(arg, 'follows')],
    scaffold: 'full',
    steps: [...CASE_STEPS.slice(0, 3), 'Does it follow?'],
    misconceptions: caseMisconceptions(arg, 'follows'),
    confused: [SHAPE_Q, CASES_LEFT_Q],
    words: CASE_WORDS,
    done: `Right. ${statusReason(arg, false)} So it does not follow, glorps or not.`,
  };
}

/** Do, right after the swap card: three plain arguments about Goldie. Same shape as the glorps? Does it follow? */
export function shapeBoard(): DrillStep {
  const rows: DrillRow[] = GOLDIE_ROWS.map((arg): DrillRow => {
    const id = arg.shape;
    const same = arg.shape === GLORP.shape;
    const back = argText({ topic: W_GLORP, shape: arg.shape });
    const fol = followsOf(arg);
    return {
      id,
      label: argText(arg),
      marks: [
        {
          id: `${id}-same`,
          label: 'Same shape as the glorp argument?',
          options: YES_NO,
          answer: yn(same),
          why: same ? { no: `Swap the words back: “${back}” That is the glorp argument, word for word.` } : { yes: `Swap the words back: “${back}” That is not the glorp argument.` },
        },
        { id: `${id}-follows`, label: 'Does it follow?', options: FOLLOW_OPTIONS, answer: fol ? 'follows' : 'not', why: { [fol ? 'not' : 'follows']: statusMarkWhy(arg, fol ? 'not' : 'follows') } },
      ],
    };
  });
  return {
    id: 's18.l3-do-shape',
    title: 'Same shape?',
    body: ['Here is the glorp argument again. Below are three plain arguments about Goldie.', 'For each one, swap the words back. Is it the same shape? Does it follow?'],
    scene: glorpScene(),
    afterCard: L3_CARDS.shape,
    rows,
    misconceptions: GOLDIE_ROWS.filter((a) => a.shape !== GLORP.shape).map((a) => ({ id: 'words-as-shape', when: 'picks' as const, picks: { [`${a.shape}-same`]: 'yes' }, text: WORDS_AS_SHAPE })),
    confused: [SHAPE_Q],
    words: { closing: 'Those two ideas are apart now. Back to the board: swap the words back, then compare.' },
    done: 'Right. The argument with the same shape follows, just like the glorp one. The other two do not follow.',
  };
}

// ---------- Lessons 2 and 3: every rule family a quiz can ask, seen and done first ----------

/** Which cases each given crosses out: “Case 2 breaks given 1. Cases 1 and 3 break given 2.” */
export function breakLines(arg: Arg): string {
  return givensOf(arg)
    .map((_, i) => {
      const nums = CASES.filter((c) => breaks(arg, c) === i).map((c) => String(CASES.indexOf(c) + 1));
      return !nums.length ? '' : nums.length === 1 ? `Case ${nums[0]} breaks given ${i + 1}.` : `Cases ${listAnd(nums)} break given ${i + 1}.`;
    })
    .filter(Boolean)
    .join(' ');
}
/** The verdict from the cases left, in Lesson 2’s words: “So the claim must be true. It follows.” */
export function statusSay(arg: Arg): string {
  const st = statusOf(arg);
  return `So the claim ${STATUS_WORDS[st]}.${st === 'must' ? ' It follows.' : ''}`;
}
/** The same, in Lesson 3’s words: “So it follows.” or “So it does not follow.” */
export const followSay = (arg: Arg) => `So it ${followsOf(arg) ? 'follows' : 'does not follow'}.`;
/** How a “No …” given is broken: ““No bird has fur” is broken only by a bird that has fur.” */
export function noBroken(arg: Arg): string {
  if (!isNoShape(arg.shape)) throw new Error(`noBroken: ${arg.shape} is not a “No …” shape`);
  return `“${givenTexts(arg)[0].replace(/\.$/, '')}” is broken only by ${arg.topic.a.is.replace(/^is /, '')} that ${second(arg).is}.`;
}

/** A family card’s picture: every case of its argument, marked, and the verdict under it. */
const familyScene = (arg: Arg, kind: 'status' | 'follows') =>
  argScene(arg, { cases: 'marked', caption: `${statusReason(arg, false)} ${kind === 'status' ? statusSay(arg) : followSay(arg)}` });
export const pipNotScene = () => familyScene(PIP_NOT, 'status');
export const pipNoScene = () => familyScene(PIP_NO, 'status');
export const glorpNotScene = () => familyScene(GLORP_NOT, 'follows');
export const glorpNoScene = () => familyScene(GLORP_NO, 'follows');

const argName = (k: number) => `Argument ${k + 1}`;
/** One argument of a two-argument board, as a line of its picture. */
export const argLine = (arg: Arg, k: number) => `${argName(k)}: ${argText(arg)}`;

/** A family board: the Do right after a family card. */
export interface FamilyBoardSpec {
  id: string;
  title: string;
  body: string[];
  /** What changed from the card: the words (always new), and which of the card’s arguments each one twins. */
  twin: string;
  afterCard: number;
  /** One argument, or two about the same thing with the same four cases: each is marked in every case, then gets a verdict. */
  args: readonly Arg[];
  /** An argument of the board with its claim flipped: the same cases are left, so only its verdict is marked. */
  flips?: readonly Arg[];
  verdict: 'status' | 'follows';
  confused: ConfusedQuestion[];
}

/**
 * A family board: the card’s arguments again, in new words. Each case is marked for each argument (crossed out, or left
 * with its claim true or false), then each verdict; then each flipped claim’s verdict, from the same cases. Every mark,
 * every word for a wrong mark and every mix-up it catches comes from the cases. About 12 taps at most.
 */
export function familyBoard(o: FamilyBoardSpec): DrillStep {
  const [first] = o.args;
  if (!first || o.args.length > 2) throw new Error(`familyBoard ${o.id}: one or two arguments`);
  for (const a of o.args) if (a.topic !== first.topic || second(a) !== second(first)) throw new Error(`familyBoard ${o.id}: the arguments do not share their four cases`);
  const two = o.args.length === 2;
  const k = (i: number) => (two ? i : undefined);
  const flips = o.flips ?? [];
  const source = flips.map((f) => {
    const i = o.args.findIndex((a) => givensOf(a).every((g, j) => sameForm(g, givensOf(f)[j])) && !sameForm(claimOf(a), claimOf(f)));
    if (i < 0) throw new Error(`familyBoard ${o.id}: ${f.shape} is not a flip of an argument on the board`);
    return i;
  });
  const say = (a: Arg) => (o.verdict === 'status' ? `the claim ${STATUS_WORDS[statusOf(a)]}` : followsOf(a) ? 'it follows' : 'it does not follow');
  const rows: DrillRow[] = [
    ...CASES.map((c): DrillRow => ({ id: caseId(c), label: caseLabel(first, c), marks: o.args.map((a, i) => caseMark(a, c, two ? argName(i) : 'Crossed out or left?', k(i))) })),
    {
      id: 'verdict',
      label: o.verdict === 'status' ? `Say both givens are true. Then ${two ? 'each' : 'the'} claim…` : `So, does ${two ? 'each one' : 'the claim'} follow?`,
      marks: o.args.map((a, i) => verdictMark(a, o.verdict, `${markPre(k(i))}verdict`, two ? argName(i) : VERDICT_LABEL[o.verdict])),
    },
    ...flips.map((f, j): DrillRow => ({
      id: `flip${j + 1}`,
      label: `Flip the claim${two ? ` of argument ${source[j] + 1}` : ''}: “${argText(f)}”`,
      marks: [verdictMark(f, o.verdict, `flip${j + 1}`)],
    })),
  ];
  const misconceptions: Misconception[] = [
    ...flips.flatMap((f, j) => {
      const was = verdictAnswer(o.args[source[j]], o.verdict);
      return was === verdictAnswer(f, o.verdict) ? [] : [{ id: 'flip-same', when: 'picks' as const, picks: { [`flip${j + 1}`]: was }, text: FLIP_AS_SAME }];
    }),
    ...o.args.flatMap((a, i) => caseMisconceptions(a, o.verdict, k(i))),
  ];
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    scene: two ? { kind: 'text', lines: o.args.map(argLine) } : argScene(first, { cases: 'blank' }),
    twin: o.twin,
    afterCard: o.afterCard,
    rows,
    scaffold: 'full',
    steps: o.verdict === 'status' ? CASE_STEPS : [...CASE_STEPS.slice(0, 3), 'Does it follow?'],
    misconceptions,
    confused: o.confused,
    words: CASE_WORDS,
    done: ['Right.', ...o.args.map((a, i) => (two ? `${argName(i)}: ${say(a)}.` : `${cap(say(a))}.`)), ...flips.map((f) => `Flipped, ${say(f)}.`)].join(' '),
  };
}

const juno = (a: Arg): Arg => ({ topic: W_JUNO, shape: a.shape });
const dax = (a: Arg): Arg => ({ topic: W_DAX, shape: a.shape });
const TWO_BODY = 'In each case, mark each argument: crossed out, or left with its claim true or false.';
const TWIN_NOTE = 'Argument 1 has the shape of the card’s picture. Argument 2 swaps its given 2 and its claim.';

/** Lesson 2, Do after the “not” card: Juno the hen, given 2 says “not”, its swap, then its claim flipped. */
export function notBoard(): DrillStep {
  return familyBoard({
    id: 's18.l2-do-not',
    title: 'Given 2 says “not”',
    body: ['Here are two arguments about Juno the hen. They have the same four cases.', TWO_BODY, 'Then pick must, might or can’t for each claim. Last, flip a claim.'],
    twin: `New words: Juno the hen. ${TWIN_NOTE}`,
    afterCard: L2_CARDS.not,
    args: [juno(PIP_NOT), juno(PIP_NOT_SWAP)],
    flips: [juno(PIP_NOT_FLIP)],
    verdict: 'status',
    confused: [CASES_LEFT_Q, ALL_WAY_Q, FLIP_Q],
  });
}

/** Lesson 2, Do after the “not” card: the first Pip example with its claim flipped, in Juno’s words, then flipped back. */
export function flipBoard(): DrillStep {
  return familyBoard({
    id: 's18.l2-do-flip',
    title: 'Flip the claim',
    body: ['This is the first Pip example with its claim flipped, now about Juno the hen.', 'Cross out each case that breaks a given. For each case left, is the claim true?', 'Then pick must, might or can’t. Last, flip the claim back.'],
    twin: 'New words: Juno the hen. It has the shape of the flipped Pip claim.',
    afterCard: L2_CARDS.not,
    args: [juno(PIP_FLIP)],
    flips: [juno(PIP)],
    verdict: 'status',
    confused: [CASES_LEFT_Q, FLIP_Q],
  });
}

/** Lesson 2, Do after the “No” card: Juno and the fur, its swap, then its claim flipped. */
export function noBoard(): DrillStep {
  return familyBoard({
    id: 's18.l2-do-no',
    title: 'Given 1 says “No”',
    body: ['Here are two arguments about Juno that start with “No.” They have the same four cases.', TWO_BODY, 'Then pick must, might or can’t for each claim. Last, flip a claim.'],
    twin: `New words: Juno the hen. ${TWIN_NOTE}`,
    afterCard: L2_CARDS.no,
    args: [juno(PIP_NO), juno(PIP_NO_SWAP)],
    flips: [juno(PIP_NO_FLIP)],
    verdict: 'status',
    confused: [CASES_LEFT_Q, NO_WAY_Q, FLIP_Q],
  });
}

/** Lesson 3, Do after the glorps with “not”: the daxes with “not”, and its swap. */
export function daxNotBoard(): DrillStep {
  return familyBoard({
    id: 's18.l3-do-not',
    title: 'Daxes with “not”',
    body: ['Here are two arguments with new made-up words. They have the same four cases.', TWO_BODY, 'Then say if each one follows.'],
    twin: `New made-up words: Nox and the daxes. ${TWIN_NOTE}`,
    afterCard: L3_CARDS.not,
    args: [dax(GLORP_NOT), dax(GLORP_NOT_SWAP)],
    verdict: 'follows',
    confused: [SHAPE_Q, CASES_LEFT_Q, ALL_WAY_Q],
  });
}

/** Lesson 3, Do after the glorps with “No”: the daxes with “No”, and its swap. */
export function daxNoBoard(): DrillStep {
  return familyBoard({
    id: 's18.l3-do-no',
    title: 'Daxes with “No”',
    body: ['Here are two arguments with new made-up words. Both start with “No.”', TWO_BODY, 'Then say if each one follows.'],
    twin: `New made-up words: Nox and the daxes. ${TWIN_NOTE}`,
    afterCard: L3_CARDS.no,
    args: [dax(GLORP_NO), dax(GLORP_NO_SWAP)],
    verdict: 'follows',
    confused: [SHAPE_Q, CASES_LEFT_Q, NO_WAY_Q],
  });
}

// ---------- Lesson 4: a given is not always true ----------

const L4_CLOSING = 'Those two ideas are apart now. Back to the board: first check if it follows, then check each given.';

/** The same shape twice. Given 2 is the same; given 1 is true in one and false in the other. */
export function givenTrueContrast(): Extract<Scene, { kind: 'contrast' }> {
  const panel = (arg: Arg): ContrastPanel => {
    const g1 = givensOf(arg)[0];
    const solid = solidOf(arg);
    return {
      world: givenTexts(arg)[1],
      who: 'Given 1',
      says: givenTexts(arg)[0],
      truth: realTruth(arg, g1),
      because: realWhy(arg, g1),
      then: `Claim: ${claimMid(arg)}. ${solid ? 'It follows, and every given is true. It is solid.' : 'It still follows. But given 1 is false, so it is not solid.'}`,
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(PENGUIN_FEATHERS), panel(PENGUIN_FLY)],
    ask: {
      q: 'Did the false given stop the second argument from following?',
      a: 'No. Both have the same shape, and both follow. Being given does not make a sentence true. A false given only stops it from being solid.',
    },
    words: { worldTag: 'Given 2', saysWord: 'says:', truth: 'True', untruth: 'False' },
  };
}

/** Does it follow, is every given really true, is it solid: the three marks of one real argument. */
function solidMarks(arg: Arg, id: string): DrillMark[] {
  const fol = followsOf(arg);
  const k = givensOf(arg).findIndex((g) => !realTruth(arg, g));
  const allTrue = k < 0;
  const solid = solidOf(arg);
  const g = givensOf(arg)[k];
  return [
    { id: `${id}-follows`, label: 'Does it follow?', options: FOLLOW_OPTIONS, answer: fol ? 'follows' : 'not', why: { [fol ? 'not' : 'follows']: statusMarkWhy(arg, fol ? 'not' : 'follows') } },
    {
      id: `${id}-givens`,
      label: 'Is every given really true?',
      options: YES_NO,
      answer: yn(allTrue),
      why: allTrue ? { no: `${givensOf(arg).map((x) => realWhy(arg, x)).join(' ')} So every given is true.` } : { yes: `Given ${k + 1} says “${formText(arg, g)}” ${realWhy(arg, g)}` },
    },
    {
      id: `${id}-solid`,
      label: 'Solid?',
      options: SOLID_OPTIONS,
      answer: solid ? 'solid' : 'not',
      why: solid ? { not: 'It follows, and every given is really true. So it is solid.' } : { solid: fol ? `Given ${k + 1} is false, so it is not solid.` : 'It does not follow, so it can’t be solid.' },
    },
  ];
}

/** Do, right after the contrast: three real arguments, each checked three ways. */
export function givenTrueBoard(): DrillStep {
  const ids = SOLID_ROWS.map((a) => a.topic.id.replace(/^w-/, ''));
  const misconceptions: Misconception[] = SOLID_ROWS.flatMap((a, k) => {
    const id = ids[k];
    if (followsOf(a) && !solidOf(a)) return [{ id: 'false-as-not', when: 'picks' as const, picks: { [`${id}-follows`]: 'not' }, text: FALSE_AS_NOT }];
    if (!followsOf(a) && givensOf(a).every((g) => realTruth(a, g))) return [{ id: 'true-givens-as-solid', when: 'picks' as const, picks: { [`${id}-givens`]: 'yes', [`${id}-solid`]: 'solid' }, text: TRUE_GIVENS_AS_SOLID }];
    return [];
  });
  return {
    id: 's18.l4-do-given',
    title: 'Follows, true, solid',
    body: ['For each argument, check three things.', 'Does it follow? Is every given really true? Is it solid?'],
    scene: givenTrueContrast(),
    afterCard: L4_CARDS.contrast,
    rows: SOLID_ROWS.map((a, k) => ({ id: ids[k], label: argText(a), marks: solidMarks(a, ids[k]) })),
    scaffold: 'full',
    misconceptions,
    confused: [GIVEN_TRUE_Q, TRUE_FOLLOWS_Q],
    distinction: GIVEN_VS_TRUE.id,
    words: { closing: L4_CLOSING },
    done: 'Right. Solid needs both: it follows, and every given is really true.',
  };
}

/** The worked example: every sentence is true, but a case left makes the claim false. */
export function sunWorkedScene(): ArgScene {
  const leak = casesLeft(SUN_BROKEN).find((c) => !claimIn(SUN_BROKEN, c))!;
  return argScene(SUN_BROKEN, {
    cases: 'marked',
    real: true,
    caption: `Every sentence is true. But case ${CASES.indexOf(leak) + 1} is left, and the claim is false there. So it does not follow, and it is not solid.`,
  });
}

/** Do, right after the example: the twin (given 2 and the claim swapped), every case, then the three checks. */
export function sunBoard(): DrillStep {
  const arg = SUN;
  const [fol, givens, solid] = solidMarks(arg, 'sun');
  return {
    id: 's18.l4-do',
    title: 'Three checks',
    body: ['The same sentences, but given 2 and the claim swapped places.', 'Check each case. Then say if it follows, if every given is really true, and if it is solid.'],
    scene: argScene(arg, { cases: 'blank' }),
    twin: 'Given 2 and the claim swapped places.',
    afterCard: L4_CARDS.example,
    rows: [
      ...CASES.map((c) => caseRow(arg, c)),
      { id: 'sun-follows', label: 'So, does the claim follow?', marks: [fol] },
      { id: 'sun-givens', label: 'Think about the real world.', marks: [givens] },
      { id: 'sun-solid', label: 'Both checks together.', marks: [solid] },
    ],
    misconceptions: caseMisconceptions(arg, 'follows'),
    confused: [GIVEN_TRUE_Q, CASES_LEFT_Q],
    words: { closing: L4_CLOSING },
    done: 'Right. It follows, and every given is really true. So it is solid.',
  };
}
