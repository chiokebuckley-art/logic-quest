/**
 * Stop 6 engine: "If P, then Q" rules.
 *
 *  - A case is one row of the truth table: did P happen, did Q happen. The rule is broken only in the
 *    row where P happens and Q does not (ruleHolds).
 *  - A fact is one of P, not P, Q, not Q. statusOf() and follows() look at every row where the rule
 *    holds and the fact is true, so the four moves come from the table, not from a list:
 *    P -> Q follows, not Q -> not P follows, Q -> nothing, not P -> nothing.
 *  - A rewrite ("If not Q, then not P") is compared with the rule row by row (sameMeaning).
 *  - A rule-checker card shows one side. mustTurn() asks whether some hidden side could break the rule.
 *  - After a wrong answer (see "teaching after a wrong answer" below), every item teaches with the rows of that
 *    same table, told in the story's words, and every wrong choice names its own gap with the row that proves it.
 *
 * Words come from skins: everyday (lunchroom, library, lunchbox, umbrella, wet grass, dogs), fantasy
 * (dragons, wizards, potions) and abstract (letters and numbers, P and Q). Only the rng passed in is used.
 */
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, ChooseItem, MultiItem, Rng, Scene, Teach, TeachCase, Truth } from '../types';

// ---------- logic ----------

export type Lit = 'P' | 'notP' | 'Q' | 'notQ';
export const LITS: readonly Lit[] = ['P', 'notP', 'Q', 'notQ'];

/** One case: did the IF part (p) happen, did the THEN part (q) happen. */
export interface Row {
  p: boolean;
  q: boolean;
}
export type RowKey = 'TT' | 'TF' | 'FT' | 'FF';
export const ROWS: readonly Row[] = [
  { p: true, q: true },
  { p: true, q: false },
  { p: false, q: true },
  { p: false, q: false },
];
export const rowKey = (r: Row): RowKey => `${r.p ? 'T' : 'F'}${r.q ? 'T' : 'F'}` as RowKey;

export function litHolds(l: Lit, r: Row): boolean {
  switch (l) {
    case 'P': return r.p;
    case 'notP': return !r.p;
    case 'Q': return r.q;
    case 'notQ': return !r.q;
  }
}

export const neg = (l: Lit): Lit => ({ P: 'notP', notP: 'P', Q: 'notQ', notQ: 'Q' } as const)[l];
export const partOf = (l: Lit): 'p' | 'q' => (l === 'P' || l === 'notP' ? 'p' : 'q');
/** The two facts about the other part, the positive one first. */
export const otherPart = (l: Lit): [Lit, Lit] => (partOf(l) === 'p' ? ['Q', 'notQ'] : ['P', 'notP']);

/** "If a, then b." */
export interface Cond {
  a: Lit;
  b: Lit;
}
export const RULE: Cond = { a: 'P', b: 'Q' };
export const condHolds = (c: Cond, r: Row) => !litHolds(c.a, r) || litHolds(c.b, r);
export const ruleHolds = (r: Row) => condHolds(RULE, r);
export const flipped = (c: Cond): Cond => ({ a: c.b, b: c.a });
export const negated = (c: Cond): Cond => ({ a: neg(c.a), b: neg(c.b) });
/** Flip and NOT: "If not Q, then not P." */
export const CONTRA: Cond = negated(flipped(RULE));
/** Flip only: "If Q, then P." */
export const CONVERSE: Cond = flipped(RULE);
/** NOT only: "If not P, then not Q." */
export const INVERSE: Cond = negated(RULE);
/** The other rewrites that join one fact about each part. None of them means the same as the rule. */
export const ODD_REWRITES: readonly Cond[] = [
  { a: 'P', b: 'notQ' },
  { a: 'notP', b: 'Q' },
  { a: 'Q', b: 'notP' },
  { a: 'notQ', b: 'P' },
];
export const sameCond = (x: Cond, y: Cond) => x.a === y.a && x.b === y.b;

/** Two sentences mean the same when they are kept and broken in exactly the same rows. */
export const sameMeaning = (x: Cond, y: Cond) => ROWS.every((r) => condHolds(x, r) === condHolds(y, r));
export const brokenRows = (c: Cond) => ROWS.filter((r) => !condHolds(c, r));

/** Rows where the rule holds and the fact is true. */
export const rowsWith = (fact: Lit) => ROWS.filter((r) => ruleHolds(r) && litHolds(fact, r));

/** must: true in every row that fits; never: in none; maybe: in some but not all. */
export type Status = 'must' | 'maybe' | 'never';
export function statusOf(fact: Lit, target: Lit): Status {
  const rows = rowsWith(fact);
  const n = rows.filter((r) => litHolds(target, r)).length;
  return n === rows.length ? 'must' : n === 0 ? 'never' : 'maybe';
}

/** The fact about the other part that follows for sure, or null when nothing follows. */
export function follows(fact: Lit): Lit | null {
  return otherPart(fact).find((t) => statusOf(fact, t) === 'must') ?? null;
}

/** mp: the IF part happened. mt: the THEN part did not. ac: the THEN part happened. da: the IF part did not. */
export type Move = 'mp' | 'mt' | 'ac' | 'da';
export const MOVES: readonly Move[] = ['mp', 'mt', 'ac', 'da'];
export const MOVE_FACT: Record<Move, Lit> = { mp: 'P', mt: 'notQ', ac: 'Q', da: 'notP' };

/** The hidden side (a fact about the other part) that would break the rule, or null when none can. */
export function breakingBack(face: Lit): Lit | null {
  return otherPart(face).find((back) => ROWS.some((r) => litHolds(face, r) && litHolds(back, r) && !ruleHolds(r))) ?? null;
}
/** A card must be turned over when some hidden side could break the rule. */
export const mustTurn = (face: Lit) => breakingBack(face) !== null;

// ---------- words ----------

export type SkinId = 'dessert' | 'library' | 'lunchbox' | 'umbrella' | 'grass' | 'pets' | 'dragons' | 'wizards' | 'potions' | 'letters' | 'pq';
export type Group = 'everyday' | 'fantasy' | 'abstract';

/** Letters and numbers on the letter cards. */
export interface Symbols {
  vowel: string;
  consonant: string;
  even: string;
  odd: string;
}
export const VOWELS = ['A', 'E', 'I', 'O', 'U'] as const;
export const CONSONANTS = ['K', 'B', 'D', 'M', 'R', 'T'] as const;
export const EVENS = ['2', '4', '6', '8'] as const;
export const ODDS = ['3', '5', '7', '9'] as const;
const CLASSIC: Symbols = { vowel: 'E', consonant: 'K', even: '4', odd: '7' };
const drawSymbols = (rng: Rng): Symbols => ({ vowel: rng.pick(VOWELS), consonant: rng.pick(CONSONANTS), even: rng.pick(EVENS), odd: rng.pick(ODDS) });

/** One case in a "who broke the rule?" question. */
export interface Case {
  name: string;
  row: Row;
  sym: Symbols;
}

export interface Skin {
  id: SkinId;
  group: Group;
  names: readonly string[];
  /** First line of the rule card. */
  setting: string;
  /** Extra line under the rule (the vowels, for letter cards). */
  note?: string;
  /** Line that says the rule is always kept (lessons 2 and 3). */
  kept: string;
  /** Rule parts. `if` follows the word "If"; `then` follows the word "then" (defaults to `if`). */
  parts: Record<Lit, { if: string; then?: string }>;
  /** A fact about one case: capital first letter, no final period. */
  fact(l: Lit, name: string): string;
  /** A whole case about one name, in the story's words: "Max is a dog and has four legs" (capital first, no period). */
  says(name: string, row: Row): string;
  /** A full sentence. */
  onlyAbout: string;
  /** The IF part may have happened (no capital unless it starts with a name, no period). */
  mayP(name: string): string;
  /** Another way the THEN part can happen without the IF part (same style as mayP). */
  otherWays: readonly ((name: string) => string)[];
  /** Without the IF part, the THEN part may happen or not (same style as mayP). */
  noIf(name: string): [string, string];
  /** A case as a noun phrase, for "... breaks that sentence." */
  kase: Record<RowKey, string>;
  /** Lesson 1: rules that can be broken. */
  l1?: {
    ask: string;
    did(name: string): string;
    /** Choice label for a case (no period). */
    label(c: Case): string;
    /** The case as a sentence (no period). */
    says(c: Case): string;
  };
  /** Lesson 5: the rule checker. */
  cards?: {
    intro: string;
    ask: string;
    face(l: Lit, sym: Symbols): string;
    /** What a hidden side could be: 'a vowel', '“Dessert”'. */
    back(l: Lit, sym: Symbols): string;
  };
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** A fact inside a sentence: "It rained" -> "it rained". Names stay as they are. */
export const mid = (s: string) => s.replace(/^(It|The|This) /, (m) => m.toLowerCase());

const KIDS = ['Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivy', 'Jay', 'Kai', 'Leo', 'Mia', 'Nia', 'Omar', 'Rosa', 'Sam', 'Tess', 'Zoe'];
const PETS = ['Rex', 'Max', 'Coco', 'Pip', 'Lucky', 'Scout', 'Pepper', 'Biscuit'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DRAGONS = ['Blaze', 'Ember', 'Spark', 'Flint', 'Ash', 'Cinder', 'Smoky', 'Scorch'];
const WIZARDS = ['Merla', 'Zed', 'Orin', 'Tamsin', 'Wren', 'Quill', 'Rook', 'Sable'];

const litOf = (part: 'p' | 'q', yes: boolean): Lit => (part === 'p' ? (yes ? 'P' : 'notP') : yes ? 'Q' : 'notQ');
const same = (s: string) => ({ if: s });

/** Skins where each case is one named someone: "Ben got dessert." */
function someone(subj: (n: string) => string, pred: Record<Lit, string>) {
  const says = (n: string, r: Row) => `${subj(n)} ${pred[litOf('p', r.p)]} and ${pred[litOf('q', r.q)]}`;
  return {
    fact: (l: Lit, n: string) => `${subj(n)} ${pred[l]}`,
    says,
    label: (c: Case) => says(c.name, c.row),
  };
}

/** Rule-checker cards whose faces are words; a hidden side is named by its face in quotes. */
function wordCards(intro: string, ask: string, faces: Record<Lit, string>): NonNullable<Skin['cards']> {
  return { intro, ask, face: (l) => faces[l], back: (l) => `“${faces[l]}”` };
}

const dessert = someone((n) => n, { P: 'got dessert', notP: 'did not get dessert', Q: 'ate all the veggies', notQ: 'left some veggies' });
const library = someone((n) => n, { P: 'took a book home', notP: 'did not take a book home', Q: 'has a library card', notQ: 'does not have a library card' });
const lunchbox = someone((n) => `${n}’s lunchbox`, { P: 'has a cookie', notP: 'has no cookie', Q: 'has a star sticker', notQ: 'has no star sticker' });
const umbrella = someone((n) => n, { P: 'walked in the rain', notP: 'did not walk in the rain', Q: 'carried an umbrella', notQ: 'did not carry an umbrella' });
const dragons = someone((n) => n, { P: 'landed in town', notP: 'did not land in town', Q: 'paid a gold coin', notQ: 'did not pay a gold coin' });
const wizards = someone((n) => n, { P: 'rode a broom', notP: 'did not ride a broom', Q: 'wore a helmet', notQ: 'did not wear a helmet' });
const pets = someone((n) => n, { P: 'is a dog', notP: 'is not a dog', Q: 'has four legs', notQ: 'does not have four legs' });
const potions = someone((n) => n, { P: 'drank a green potion', notP: 'did not drink a green potion', Q: 'shrank', notQ: 'did not shrink' });
const letterFacts: Record<Lit, string> = { P: 'has a vowel', notP: 'does not have a vowel', Q: 'has an even number', notQ: 'has an odd number' };

const kid = (ask: string, fns: ReturnType<typeof someone>): NonNullable<Skin['l1']> => ({
  ask,
  did: (n) => `Did ${n} break the rule?`,
  label: fns.label,
  says: fns.label,
});

export const SKINS: Record<SkinId, Skin> = {
  dessert: {
    id: 'dessert',
    group: 'everyday',
    names: KIDS,
    setting: 'The lunchroom has a rule.',
    kept: 'Every kid follows this rule.',
    parts: {
      P: same('you get dessert'),
      notP: same('you do not get dessert'),
      Q: same('you have eaten all your veggies'),
      notQ: same('you have not eaten all your veggies'),
    },
    fact: dessert.fact,
    says: dessert.says,
    onlyAbout: 'The rule only talks about kids who get dessert.',
    mayP: (n) => `${n} may have gotten dessert`,
    otherWays: [(n) => `${n} may have been too full for dessert`, (n) => `${n} may have skipped dessert to go play`, (n) => `${n} may not like the dessert today`],
    noIf: (n) => [`${n} may have eaten all the veggies anyway`, `${n} may have left some veggies`],
    kase: {
      TT: 'a kid who gets dessert and has eaten all the veggies',
      TF: 'a kid who gets dessert but has not eaten all the veggies',
      FT: 'a kid who has eaten all the veggies but skips dessert',
      FF: 'a kid who skips dessert and has not eaten all the veggies',
    },
    l1: kid('Which kid broke the rule?', dessert),
    cards: wordCards(
      'Each card is one kid. One side shows if the kid got dessert. The other side shows if the kid ate all the veggies.',
      'Which cards must you turn over to check that nobody broke the rule?',
      { P: 'Dessert', notP: 'No dessert', Q: 'Ate all veggies', notQ: 'Left some veggies' },
    ),
  },
  library: {
    id: 'library',
    group: 'everyday',
    names: KIDS,
    setting: 'The school library has a rule.',
    kept: 'Every kid follows this rule.',
    parts: {
      P: same('you take a book home'),
      notP: same('you do not take a book home'),
      Q: same('you have a library card'),
      notQ: same('you do not have a library card'),
    },
    fact: library.fact,
    says: library.says,
    onlyAbout: 'The rule only talks about kids who take a book home.',
    mayP: (n) => `${n} may have taken a book home`,
    otherWays: [(n) => `${n} may have come just to read`, (n) => `${n} may have come to use a computer`, (n) => `${n} may have come to bring a book back`],
    noIf: (n) => [`${n} may have a library card anyway`, `${n} may not have a library card`],
    kase: {
      TT: 'a kid who takes a book home and has a library card',
      TF: 'a kid who takes a book home with no library card',
      FT: 'a kid with a library card who takes no book home',
      FF: 'a kid with no book and no library card',
    },
    l1: kid('Which kid broke the rule?', library),
    cards: wordCards(
      'Each card is one kid. One side shows if the kid took a book home. The other side shows if the kid has a library card.',
      'Which cards must you turn over to check that nobody broke the rule?',
      { P: 'Took a book home', notP: 'No book home', Q: 'Library card', notQ: 'No library card' },
    ),
  },
  lunchbox: {
    id: 'lunchbox',
    group: 'everyday',
    names: KIDS,
    setting: 'Dad has a rule for packing lunches.',
    kept: 'Dad always follows this rule.',
    parts: {
      P: { if: 'a lunchbox has a cookie', then: 'it has a cookie' },
      notP: { if: 'a lunchbox has no cookie', then: 'it has no cookie' },
      Q: { if: 'a lunchbox has a star sticker', then: 'it has a star sticker' },
      notQ: { if: 'a lunchbox has no star sticker', then: 'it has no star sticker' },
    },
    fact: lunchbox.fact,
    says: lunchbox.says,
    onlyAbout: 'The rule only talks about lunchboxes with a cookie.',
    mayP: (n) => `${n}’s lunchbox may have a cookie`,
    otherWays: [(n) => `Dad may have added a star for ${n}’s birthday`, () => 'Dad may have added a star just for fun', (n) => `Dad may have added a star because ${n} had a big game`],
    noIf: () => ['Dad may have added a star anyway', 'Dad may have left the star off'],
    kase: {
      TT: 'a lunchbox with a cookie and a star',
      TF: 'a lunchbox with a cookie but no star',
      FT: 'a lunchbox with a star but no cookie',
      FF: 'a lunchbox with no cookie and no star',
    },
    l1: { ask: 'Which lunchbox breaks the rule?', did: () => 'Does it break the rule?', label: lunchbox.label, says: lunchbox.label },
    cards: wordCards(
      'Each card is one lunchbox. One side shows if it has a cookie inside. The other side shows if the lid has a star sticker.',
      'Which cards must you turn over to check that Dad followed the rule?',
      { P: 'Cookie', notP: 'No cookie', Q: 'Star sticker', notQ: 'No star sticker' },
    ),
  },
  umbrella: {
    id: 'umbrella',
    group: 'everyday',
    names: KIDS,
    setting: 'Here is a rule for walking to school.',
    kept: 'Every kid follows this rule.',
    parts: {
      P: same('you walk in the rain'),
      notP: same('you do not walk in the rain'),
      Q: same('you carry an umbrella'),
      notQ: same('you do not carry an umbrella'),
    },
    fact: umbrella.fact,
    says: umbrella.says,
    onlyAbout: 'The rule only talks about kids who walk in the rain.',
    mayP: (n) => `${n} may have walked in the rain`,
    otherWays: [
      (n) => `${n} may have used the umbrella for shade on a sunny day`,
      (n) => `${n} may have carried the umbrella because the sky looked gray`,
      (n) => `${n} may have carried the umbrella for a friend`,
    ],
    noIf: (n) => [`${n} may have carried an umbrella anyway`, `${n} may have left the umbrella at home`],
    kase: {
      TT: 'a kid who walks in the rain with an umbrella',
      TF: 'a kid who walks in the rain with no umbrella',
      FT: 'a kid who carries an umbrella on a day with no rain',
      FF: 'a kid with no umbrella on a day with no rain',
    },
    l1: kid('Which kid broke the rule?', umbrella),
    cards: wordCards(
      'Each card is one kid. One side shows if it rained on the walk. The other side shows if the kid carried an umbrella.',
      'Which cards must you turn over to check that nobody broke the rule?',
      { P: 'Rain', notP: 'No rain', Q: 'Umbrella', notQ: 'No umbrella' },
    ),
  },
  grass: {
    id: 'grass',
    group: 'everyday',
    names: DAYS,
    setting: 'Here is a rule about the grass at the park.',
    kept: 'This is always true.',
    parts: {
      P: same('it rains'),
      notP: same('it does not rain'),
      Q: same('the grass gets wet'),
      notQ: same('the grass does not get wet'),
    },
    fact: (l, n) => ({ P: `It rained on ${n}`, notP: `It did not rain on ${n}`, Q: `The grass got wet on ${n}`, notQ: `The grass did not get wet on ${n}` })[l],
    says: (n, r) => `On ${n}, it ${r.p ? 'rained' : 'did not rain'} and the grass ${r.q ? 'got wet' : 'did not get wet'}`,
    onlyAbout: 'The rule only talks about days when it rains.',
    mayP: (n) => `it may have rained on ${n}`,
    otherWays: [() => 'a sprinkler may have made the grass wet', () => 'someone may have sprayed the grass with a hose', () => 'kids may have had a water fight on the grass'],
    noIf: () => ['a sprinkler may still have made the grass wet', 'the grass may have stayed dry'],
    kase: {
      TT: 'a day with rain and wet grass',
      TF: 'a day with rain but dry grass',
      FT: 'a day with no rain when a sprinkler wets the grass',
      FF: 'a day with no rain and dry grass',
    },
  },
  pets: {
    id: 'pets',
    group: 'everyday',
    names: PETS,
    setting: 'Here is a rule about animals.',
    kept: 'In this story, the rule is always true.',
    parts: {
      P: same('it is a dog'),
      notP: same('it is not a dog'),
      Q: same('it has four legs'),
      notQ: same('it does not have four legs'),
    },
    fact: pets.fact,
    says: pets.says,
    onlyAbout: 'The rule only talks about dogs.',
    mayP: (n) => `${n} could be a dog`,
    otherWays: [(n) => `${n} could be a cat`, (n) => `${n} could be a horse`, (n) => `${n} could be a goat`, (n) => `${n} could be a pig`],
    noIf: (n) => [`${n} could be a cat with four legs`, `${n} could be a bird with two legs`],
    kase: { TT: 'a dog with four legs', TF: 'a dog without four legs', FT: 'a cat with four legs', FF: 'a bird with two legs' },
  },
  dragons: {
    id: 'dragons',
    group: 'fantasy',
    names: DRAGONS,
    setting: 'Dragon Town has a rule.',
    kept: 'Every dragon follows this rule.',
    parts: {
      P: { if: 'a dragon lands in town', then: 'it lands in town' },
      notP: { if: 'a dragon does not land in town', then: 'it does not land in town' },
      Q: { if: 'a dragon pays a gold coin', then: 'it pays a gold coin' },
      notQ: { if: 'a dragon does not pay a gold coin', then: 'it does not pay a gold coin' },
    },
    fact: dragons.fact,
    says: dragons.says,
    onlyAbout: 'The rule only talks about dragons that land in town.',
    mayP: (n) => `${n} may have landed in town`,
    otherWays: [(n) => `${n} may have paid a gold coin to cross the bridge`, (n) => `${n} may have paid a gold coin for a map`, (n) => `${n} may have paid a gold coin for a snack`],
    noIf: (n) => [`${n} may have paid a gold coin anyway`, `${n} may have kept all its gold`],
    kase: {
      TT: 'a dragon that lands in town and pays',
      TF: 'a dragon that lands in town but does not pay',
      FT: 'a dragon that pays but does not land in town',
      FF: 'a dragon that does not land in town and does not pay',
    },
    l1: kid('Which dragon broke the rule?', dragons),
    cards: wordCards(
      'Each card is one dragon. One side shows if it landed in town. The other side shows if it paid a gold coin.',
      'Which cards must you turn over to check that no dragon broke the rule?',
      { P: 'Landed in town', notP: 'Did not land', Q: 'Paid a coin', notQ: 'Did not pay' },
    ),
  },
  wizards: {
    id: 'wizards',
    group: 'fantasy',
    names: WIZARDS,
    setting: 'Wizard school has a rule.',
    kept: 'Every wizard follows this rule.',
    parts: {
      P: same('you ride a broom'),
      notP: same('you do not ride a broom'),
      Q: same('you wear a helmet'),
      notQ: same('you do not wear a helmet'),
    },
    fact: wizards.fact,
    says: wizards.says,
    onlyAbout: 'The rule only talks about wizards who ride a broom.',
    mayP: (n) => `${n} may have ridden a broom`,
    otherWays: [(n) => `${n} may have worn a helmet to ride a dragon`, (n) => `${n} may have worn a helmet in potion class`, (n) => `${n} may have worn a helmet to play ball`],
    noIf: (n) => [`${n} may have worn a helmet anyway`, `${n} may have gone without a helmet`],
    kase: {
      TT: 'a wizard who rides a broom and wears a helmet',
      TF: 'a wizard who rides a broom with no helmet',
      FT: 'a wizard who wears a helmet but rides no broom',
      FF: 'a wizard with no broom and no helmet',
    },
    l1: kid('Which wizard broke the rule?', wizards),
    cards: wordCards(
      'Each card is one wizard. One side shows if the wizard rode a broom. The other side shows if the wizard wore a helmet.',
      'Which cards must you turn over to check that no wizard broke the rule?',
      { P: 'Rode a broom', notP: 'No broom', Q: 'Helmet', notQ: 'No helmet' },
    ),
  },
  potions: {
    id: 'potions',
    group: 'fantasy',
    names: WIZARDS,
    setting: 'The magic shop sells green potions.',
    kept: 'This is always true.',
    parts: {
      P: same('you drink a green potion'),
      notP: same('you do not drink a green potion'),
      Q: same('you shrink'),
      notQ: same('you do not shrink'),
    },
    fact: potions.fact,
    says: potions.says,
    onlyAbout: 'The rule only talks about green potions.',
    mayP: (n) => `${n} may have had a green potion`,
    otherWays: [(n) => `a shrinking spell may have made ${n} shrink`, (n) => `a magic mushroom may have made ${n} shrink`, (n) => `a pink potion may have made ${n} shrink`],
    noIf: (n) => [`a shrinking spell may still have made ${n} shrink`, `${n} may have stayed the same size`],
    kase: {
      TT: 'a wizard who drinks a green potion and shrinks',
      TF: 'a wizard who drinks a green potion but does not shrink',
      FT: 'a wizard who shrinks from a spell without a green potion',
      FF: 'a wizard with no green potion who does not shrink',
    },
  },
  letters: {
    id: 'letters',
    group: 'abstract',
    names: ['this card'],
    setting: 'Every card has a letter on one side and a number on the other.',
    note: 'The vowels are A, E, I, O and U. An odd number is a number that is not even.',
    kept: 'Every card follows this rule.',
    parts: {
      P: { if: 'a card has a vowel', then: 'it has a vowel' },
      notP: { if: 'a card does not have a vowel', then: 'it does not have a vowel' },
      Q: { if: 'a card has an even number', then: 'it has an even number' },
      notQ: { if: 'a card has an odd number', then: 'it has an odd number' },
    },
    fact: (l, n) => `${cap(n)} ${letterFacts[l]}`,
    says: (n, r) => `${cap(n)} ${letterFacts[litOf('p', r.p)]} and ${letterFacts[litOf('q', r.q)]}`,
    onlyAbout: 'The rule only talks about cards with a vowel.',
    mayP: (n) => `${n} could have a vowel`,
    otherWays: [(n) => `${n} could have a K, which is not a vowel`, (n) => `${n} could have a B, which is not a vowel`, (n) => `${n} could have a T, which is not a vowel`],
    noIf: (n) => [`${n} could have an even number anyway`, `${n} could have an odd number`],
    // In words, not symbols, so a case matches whatever letters and numbers the cards show.
    kase: {
      TT: 'a card with a vowel and an even number',
      TF: 'a card with a vowel and an odd number',
      FT: 'a card with no vowel and an even number',
      FF: 'a card with no vowel and an odd number',
    },
    l1: {
      ask: 'Which card breaks the rule?',
      did: () => 'Does this card break the rule?',
      label: (c) => `${c.row.p ? c.sym.vowel : c.sym.consonant} and ${c.row.q ? c.sym.even : c.sym.odd}`,
      says: (c) =>
        `The card with ${c.row.p ? c.sym.vowel : c.sym.consonant} and ${c.row.q ? c.sym.even : c.sym.odd} has ${c.row.p ? 'a vowel' : 'no vowel'} and ${c.row.q ? 'an even' : 'an odd'} number`,
    },
    cards: {
      intro: 'You can see one side of each card.',
      ask: 'Which cards must you turn over to check that no card breaks the rule?',
      face: (l, s) => ({ P: s.vowel, notP: s.consonant, Q: s.even, notQ: s.odd })[l],
      back: (l) => ({ P: 'a vowel', notP: 'a letter that is not a vowel', Q: 'an even number', notQ: 'an odd number' })[l],
    },
  },
  pq: {
    id: 'pq',
    group: 'abstract',
    names: [''],
    setting: 'P and Q stand for any two sentences.',
    kept: 'The rule is always true.',
    parts: { P: same('P'), notP: same('not P'), Q: same('Q'), notQ: same('not Q') },
    fact: (l) => ({ P: 'P is true', notP: 'P is false', Q: 'Q is true', notQ: 'Q is false' })[l],
    says: (_n, r) => `P is ${r.p ? 'true' : 'false'} and Q is ${r.q ? 'true' : 'false'}`,
    onlyAbout: 'The rule only talks about what happens when P is true.',
    mayP: () => 'P could be true',
    otherWays: [() => 'Q can be true even when P is false'],
    noIf: () => ['Q could be true', 'Q could be false'],
    kase: {
      TT: 'the case where P and Q are both true',
      TF: 'the case where P is true and Q is false',
      FT: 'the case where P is false and Q is true',
      FF: 'the case where P and Q are both false',
    },
    l1: {
      ask: 'Which case breaks the rule?',
      did: () => 'Does this case break the rule?',
      label: (c) => `P is ${c.row.p ? 'true' : 'false'} and Q is ${c.row.q ? 'true' : 'false'}`,
      says: (c) => `P is ${c.row.p ? 'true' : 'false'} and Q is ${c.row.q ? 'true' : 'false'}`,
    },
  },
};

export const SKIN_IDS = Object.keys(SKINS) as SkinId[];
/** Rules that can be broken (lesson 1). */
export const L1_SKINS: readonly SkinId[] = SKIN_IDS.filter((s) => SKINS[s].l1);
/** Rules with rule-checker cards (lesson 5). */
export const CARD_SKINS: readonly SkinId[] = SKIN_IDS.filter((s) => SKINS[s].cards);
export const skinsIn = (group: Group, from: readonly SkinId[] = SKIN_IDS) => from.filter((s) => SKINS[s].group === group);

/** "If you get dessert, then you have eaten all your veggies." */
export function condText(skin: SkinId, c: Cond): string {
  const p = SKINS[skin].parts;
  return `If ${p[c.a].if}, then ${p[c.b].then ?? p[c.b].if}.`;
}
export const ruleText = (skin: SkinId) => condText(skin, RULE);

/** The rule card. kept: add the line that says everyone follows the rule. */
export function ruleScene(skin: SkinId, kept = false): Scene {
  const s = SKINS[skin];
  const lines = [s.setting, ruleText(skin)];
  if (s.note) lines.push(s.note);
  if (kept) lines.push(s.kept);
  return { kind: 'text', lines };
}

/** All four cases of a rule as a grid: ✓ keeps the rule, ✗ breaks it (lesson 1 worked example). */
export function ruleGrid(skin: SkinId): Scene {
  const f = SKINS[skin].cards;
  if (!f) throw new Error(`ruleGrid: ${skin} has no cards`);
  const face = (l: Lit) => f.face(l, CLASSIC);
  const rows: Choice[] = [{ id: 'P', label: face('P') }, { id: 'notP', label: face('notP') }];
  const cols: Choice[] = [{ id: 'Q', label: face('Q') }, { id: 'notQ', label: face('notQ') }];
  const marks: Record<string, Record<string, 'yes' | 'no'>> = {};
  for (const r of rows) {
    marks[r.id] = {};
    for (const c of cols) {
      const row = ROWS.find((x) => litHolds(r.id as Lit, x) && litHolds(c.id as Lit, x))!;
      marks[r.id][c.id] = ruleHolds(row) ? 'yes' : 'no';
    }
  }
  return { kind: 'grid', rows, cols, marks, caption: '✓ means the rule is kept. ✗ means it is broken.' };
}

/** The rule and its three rewrites, case by case (lesson 4 worked example). */
export function meaningGrid(skin: SkinId): Scene {
  const s = SKINS[skin];
  const rows: Choice[] = ROWS.map((r) => ({ id: rowKey(r), label: cap(s.kase[rowKey(r)]) }));
  const sentences: [string, string, Cond][] = [
    ['rule', 'The rule', RULE],
    ['contra', 'Flip and NOT', CONTRA],
    ['converse', 'Flip only', CONVERSE],
    ['inverse', 'NOT only', INVERSE],
  ];
  const cols: Choice[] = sentences.map(([id, label]) => ({ id, label }));
  const marks: Record<string, Record<string, 'yes' | 'no'>> = {};
  for (const r of ROWS) marks[rowKey(r)] = Object.fromEntries(sentences.map(([id, , c]) => [id, condHolds(c, r) ? 'yes' : 'no']));
  return { kind: 'grid', rows, cols, marks, caption: '✓ means the case on the left keeps the sentence at the top. ✗ means the case breaks it.' };
}

const WHEN: Record<Lit, string> = {
  P: 'When the IF part happens',
  notP: 'When the IF part does not happen',
  Q: 'When the THEN part happens',
  notQ: 'When the THEN part does not happen',
};
const SO_MUST: Record<Lit, string> = {
  P: 'the IF part must have happened too',
  notP: 'the IF part can’t have happened',
  Q: 'the THEN part must happen too',
  notQ: 'the THEN part can’t happen',
};
/** One of the four moves as a rule, worked out from the truth table: "When the IF part happens, the THEN part must happen too." */
export function moveRule(fact: Lit): string {
  const got = follows(fact);
  return got ? `${WHEN[fact]}, ${SO_MUST[got]}.` : `${WHEN[fact]}, nothing follows for sure.`;
}

// ---------- teaching after a wrong answer ----------
//
// Every item carries `teach`: the idea in plain words, the words it needs, what the rule says, and the cases that
// cover every way it can go. A case is one row of the truth table told in the story's words ("Max is a dog and has
// four legs."), with each true/false worked out from that row by litHolds() and ruleHolds(), never written by hand.
// Every wrong choice gets its own ChoiceFeedback: a headline naming that answer's gap, the steps where it fails, and
// the case that proves it. The rule checker (a multi item) names each card left out or picked in missTips/pickTips.

/** Names on the true/false lines of a worked case. */
export const IF_WHO = 'The IF part';
export const THEN_WHO = 'The THEN part';
export const RULE_WHO = 'The rule';
export const SENTENCE_WHO = 'The sentence';
export const ANSWER_WHO = 'Your answer';
export const THIS_WHO = 'This sentence';
export const YOURS_WHO = 'Your sentence';
export const CONTRA_WHO = 'The flip and NOT sentence';
export const TURN_WHO = 'You must turn it over';

/** Is the IF part true, is the THEN part true, is the rule true (kept) in this case? */
export const partTruths = (r: Row): Truth[] => [
  { who: IF_WHO, value: litHolds('P', r) },
  { who: THEN_WHO, value: litHolds('Q', r) },
  { who: RULE_WHO, value: ruleHolds(r) },
];

/** A case read back from its IF and THEN lines, or null when it has none. */
export function rowOfCase(c: TeachCase | undefined): Row | null {
  const p = c?.truths?.find((t) => t.who === IF_WHO)?.value;
  const q = c?.truths?.find((t) => t.who === THEN_WHO)?.value;
  return p === undefined || q === undefined ? null : { p, q };
}

export const rowAt = (p: boolean, q: boolean): Row => ROWS.find((r) => r.p === p && r.q === q)!;

export const BREAK_RULE = 'An if–then rule is broken only when the IF part happens and the THEN part does not.';
export const SAME_RULE = 'Two if–then sentences mean the same when the same cases break them.';
export const CHECK_RULE = 'You must turn over a card only when its hidden side could break the rule.';
const BREAKS_TERM = { word: 'Breaks the rule', meaning: 'the IF part happens, but the THEN part does not.' };
const CANT_TELL_TERM = { word: '“Can’t tell”', meaning: 'the rule and the fact do not decide if the sentence is true or false.' };
const NOTHING_TERM = { word: '“Nothing follows for sure”', meaning: 'the rule and the fact do not prove anything new.' };
const FLIP_TERM = { word: 'To flip a sentence', meaning: 'to swap its IF part and its THEN part.' };
const NOT_BOTH_TERM = { word: 'To put NOT in both parts', meaning: 'to add “not” to the IF part and to the THEN part.' };
const BREAKS_SENTENCE_TERM = { word: 'A case breaks a sentence', meaning: 'in that case, the sentence’s IF part happens, but its THEN part does not.' };
const NEVER_BROKEN = 'Here, the rule is never broken.';
const ONLY_WAY = 'Only the IF part without the THEN part breaks the rule.';
const ASK_L1 = 'Ask: “Did the IF part happen? If it did, did the THEN part happen?”';
const ASK_CARD = 'Ask: “What could be on the back? Could it break the rule?”';

/** The IF part and the THEN part of a skin's rule, defined with the rule's own words. */
export function partTerms(skin: SkinId): { word: string; meaning: string }[] {
  const p = SKINS[skin].parts;
  return [
    { word: 'The IF part', meaning: `the words right after “if”: “${p.P.if}.”` },
    { word: 'The THEN part', meaning: `the words right after “then”: “${p.Q.then ?? p.Q.if}.”` },
  ];
}

/** What the rule says and when it is broken, in the story's words. */
export const ruleMeaning = (skin: Skin) => `${skin.onlyAbout} It is broken only by ${skin.kase.TF}.`;

/**
 * Why one case keeps or breaks the rule, worked out from the row. Short, because it sits on a case card under the
 * meaning, which already says what the rule talks about.
 */
export function rowNote(r: Row): string {
  if (!ruleHolds(r)) return 'The IF part happened, but the THEN part did not. This breaks the rule.';
  if (r.p) return 'The IF part and the THEN part both happened. This keeps the rule.';
  if (r.q) return 'The THEN part happened without the IF part. That is allowed, so this keeps the rule.';
  return 'The IF part did not happen, so the rule asks for nothing. This keeps the rule.';
}

/** In a story where the rule is never broken: can this case happen? `why` names a way it could. */
function possibleNote(r: Row, why = ''): string {
  const can = ruleHolds(r) ? 'This case keeps the rule, so it can happen.' : 'This case breaks the rule, so it can’t happen here.';
  return why ? `${cap(why)}. ${can}` : can;
}

/** Step by step: did the IF part happen, did the THEN part happen, so is the rule kept? */
function rowSteps(skin: Skin, says: string, r: Row): string[] {
  const out = [sentence(says), `Did the IF part happen? ${r.p ? 'Yes' : 'No'}.`];
  if (!r.p) return [...out, `${skin.onlyAbout} So this case keeps the rule.`];
  out.push(`Did the THEN part happen? ${r.q ? 'Yes' : 'No'}.`);
  out.push(ruleHolds(r) ? 'The THEN part happened, just as the rule asks. So this case keeps the rule.' : 'The IF part happened without the THEN part. So this case breaks the rule.');
  return out;
}

// ---------- items ----------

type Core<T> = T extends ChooseItem | MultiItem ? Omit<T, 'id' | 'stop' | 'lesson' | 'skill'> : never;
export type CondCore = Core<ChooseItem> | Core<MultiItem>;
type ChooseCore = Core<ChooseItem>;

/** What a made item was built from, so tests can re-solve it. */
export interface CondMeta {
  skin: SkinId;
  name: string;
  /** Lesson 1: the case behind each choice (or the one case asked about). */
  cases?: Record<string, Row>;
  /** Lessons 2 and 3: the fact given, and (lesson 2) the sentence asked about. */
  fact?: Lit;
  target?: Lit;
  move?: Move;
  /** Lesson 4: the sentence behind each choice, or the one sentence asked about. */
  conds?: Record<string, Cond>;
  /** Lesson 5: the fact on the face of each card. */
  faces?: Record<string, Lit>;
  sym?: Symbols;
}

/** A made item plus a short skill tag ('trap-then' -> skill 's6.trap-then'). */
export interface CondMade {
  tag: string;
  item: CondCore;
  meta: CondMeta;
}

const pickName = (rng: Rng, skin: SkinId) => rng.pick(SKINS[skin].names);
const sentence = (s: string) => `${s}.`;

const YES_NO: Choice[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];

const IF_ONLY_WAY = 'The IF part happened, but the THEN part did not. That is the only way to break the rule.';

/** Why one case keeps or breaks the rule (no leading sentence). */
function caseReason(skin: Skin, r: Row): string {
  if (!ruleHolds(r)) return IF_ONLY_WAY;
  if (r.p) return 'The IF part and the THEN part both happened, so the rule is kept.';
  if (r.q) return `The THEN part happened without the IF part. ${skin.onlyAbout} So this does not break the rule.`;
  return `The IF part did not happen. ${skin.onlyAbout} So this does not break the rule.`;
}

/** Choice ids for the four cases: fixed by the case, never by its place in the list. */
const ROW_ID: Record<RowKey, string> = { TT: 'if-and-then', TF: 'if-not-then', FT: 'then-not-if', FF: 'neither' };
export const rowId = (r: Row) => ROW_ID[rowKey(r)];

type KeptKey = Exclude<RowKey, 'TF'>;
/** Lesson 1: what an answer that calls a kept case broken gets wrong, by the kind of case. */
const KEPT_HEAD: Record<'who' | 'did', Record<KeptKey, string>> = {
  who: {
    TT: 'Your answer picks a case where the THEN part happened too, so the rule is kept.',
    FT: 'Your answer picks a case with the THEN part but not the IF part, and that keeps the rule.',
    FF: 'Your answer picks a case where the IF part did not happen, so the rule can’t be broken.',
  },
  did: {
    TT: 'Your answer says the rule was broken, but the THEN part happened too.',
    FT: 'Your answer counts the THEN part without the IF part as breaking the rule.',
    FF: 'Your answer says the rule was broken, but the IF part did not happen.',
  },
};
const KEPT_WHY: Record<KeptKey, (skin: Skin) => string> = {
  TT: () => 'The IF part happened. The THEN part happened too. That is just what the rule asks for.',
  FT: (s) => `The IF part did not happen. ${s.onlyAbout} The THEN part can happen without the IF part.`,
  FF: (s) => `The IF part did not happen. ${s.onlyAbout} So this case can’t break it.`,
};
const MISSED_BREAK_HEAD = 'Your answer misses that the IF part happened without the THEN part.';

/** The lesson 1 teaching: the four cases in the story's words, each with its truths and why. */
function l1Teach(skin: Skin, skinId: SkinId, cases: { says: string; row: Row; asked?: boolean }[]): Teach {
  const tf = cases.find((c) => !ruleHolds(c.row));
  if (!tf) throw new Error('l1Teach: one case must break the rule');
  return {
    rule: BREAK_RULE,
    terms: [...partTerms(skinId), BREAKS_TERM],
    meaning: ruleMeaning(skin),
    casesTitle: 'When is the rule kept, and when is it broken?',
    cases: [...cases]
      .sort((a, b) => ROWS.findIndex((r) => rowKey(r) === rowKey(a.row)) - ROWS.findIndex((r) => rowKey(r) === rowKey(b.row)))
      .map((c) => ({ label: sentence(c.says), truths: partTruths(c.row), note: `${rowNote(c.row)}${c.asked ? ' This is the case in the question.' : ''}` })),
    remember: ['Only IF without THEN breaks the rule.', ASK_L1],
    simpler: rowSteps(skin, tf.says, tf.row),
  };
}

/** Lesson 1: "Which kid broke the rule?" The four cases, one per choice. */
export function whoBrokeItem(rng: Rng, opts: { skin: SkinId }): CondMade {
  const skin = SKINS[opts.skin];
  const l1 = skin.l1;
  if (!l1) throw new Error(`whoBrokeItem: ${opts.skin} has no lesson 1 words`);
  const names = rng.shuffle(skin.names);
  const sym = drawSymbols(rng);
  const rows = rng.shuffle(ROWS);
  const cases: Case[] = rows.map((row, i) => ({ name: names[i % names.length], row, sym }));
  const choices = cases.map((c) => ({ id: rowId(c.row), label: l1.label(c) }));
  const broken = cases.filter((c) => !ruleHolds(c.row));
  if (broken.length !== 1) throw new Error('whoBrokeItem: exactly one case must break the rule');
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of cases) {
    if (!ruleHolds(c.row)) continue;
    const k = rowKey(c.row) as KeptKey;
    feedback[rowId(c.row)] = {
      headline: KEPT_HEAD.who[k],
      detail: [KEPT_WHY[k](skin), ONLY_WAY],
      example: { label: sentence(l1.says(c)), truths: partTruths(c.row), note: rowNote(c.row) },
      simpler: rowSteps(skin, l1.says(c), c.row),
    };
  }
  const item: ChooseCore = {
    kind: 'choose',
    prompt: l1.ask,
    scene: ruleScene(opts.skin),
    choices,
    answer: rowId(broken[0].row),
    explain: `${sentence(l1.says(broken[0]))} ${IF_ONLY_WAY}`,
    feedback,
    hint: 'For each one, ask: did the IF part happen? Then ask: did the THEN part happen?',
    teach: l1Teach(skin, opts.skin, cases.map((c) => ({ says: l1.says(c), row: c.row }))),
  };
  syncWhyWrong(item);
  return { tag: 'who-broke', item, meta: { skin: opts.skin, name: '', cases: Object.fromEntries(cases.map((c, i) => [choices[i].id, c.row])), sym } };
}

/** Lesson 1: "Did Cal break the rule?" Yes or no for one case. No dessert and veggies left is the trap. */
export function didBreakItem(rng: Rng, opts: { skin: SkinId; row?: Row }): CondMade {
  const skin = SKINS[opts.skin];
  const l1 = skin.l1;
  if (!l1) throw new Error(`didBreakItem: ${opts.skin} has no lesson 1 words`);
  const row = opts.row ?? rng.pick(ROWS);
  const name = pickName(rng, opts.skin);
  const sym = drawSymbols(rng);
  const c: Case = { name, row, sym };
  const broke = !ruleHolds(row);
  const says = l1.says(c);
  const example: TeachCase = { label: sentence(says), truths: partTruths(row), note: rowNote(row) };
  const fb: ChoiceFeedback = broke
    ? { headline: MISSED_BREAK_HEAD, detail: [sentence(says), 'The IF part happened, so the rule says the THEN part must happen too. It did not.', 'That is the one way to break the rule.'], example }
    : { headline: KEPT_HEAD.did[rowKey(row) as KeptKey], detail: [sentence(says), KEPT_WHY[rowKey(row) as KeptKey](skin), ONLY_WAY], example };
  fb.simpler = rowSteps(skin, says, row);
  // The other three cases go to other people (or other cards), so each case is told in the story's words.
  const others = skin.names.filter((n) => n !== name);
  const start = Math.max(0, skin.names.indexOf(name));
  let k = start;
  const cases = ROWS.map((r) => {
    if (rowKey(r) === rowKey(row)) return { says, row: r, asked: true };
    const who = others.length ? others[k++ % others.length] : name;
    return { says: l1.says({ name: who, row: r, sym }), row: r };
  });
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${sentence(says)} ${l1.did(name)}`,
    scene: ruleScene(opts.skin),
    choices: YES_NO,
    answer: broke ? 'yes' : 'no',
    explain: caseReason(skin, row),
    feedback: { [broke ? 'no' : 'yes']: fb },
    hint: 'First ask: did the IF part happen?',
    teach: l1Teach(skin, opts.skin, cases),
  };
  syncWhyWrong(item);
  if (!row.p && !row.q) item.conflict = true;
  return { tag: 'did-break', item, meta: { skin: opts.skin, name, cases: { one: row }, sym } };
}

export const STATUS_CHOICES: Choice[] = [
  { id: 'must', label: 'True for sure' },
  { id: 'maybe', label: 'Can’t tell' },
  { id: 'never', label: 'False for sure' },
];

/**
 * Headlines shared by lessons 2 and 3: the same mistake gets the same words. Each one says what the answer does in
 * plain words, so no word needs a lesson of its own: "backward" is spelled out as "from the THEN part to the IF part".
 */
export const BACKWARD_HEAD = 'Your answer goes backward, from the THEN part to the IF part.';
export const RULES_OUT_IF_HEAD = 'Your answer says the IF part did not happen, but it may have.';
export const BREAKS_HEAD = 'Your answer and the fact together break the rule.';
/** Lesson 3: the IF part did not happen, and the answer still says the THEN part happened. */
export const THEN_ANYWAY_HEAD = 'Your answer says the THEN part happened, but without the IF part it may not have.';
const FACT_LINE: Record<Lit, string> = {
  P: 'That is the IF part of the rule.',
  notP: 'So the IF part did not happen.',
  Q: 'That is the THEN part of the rule.',
  notQ: 'So the THEN part did not happen.',
};

/**
 * Lesson 2: a fact about the IF part (going forward) or the THEN part (going backward), and a sentence
 * about the other part. Is it true for sure, false for sure, or can't you tell? Backward items are traps.
 */
export function turnItem(rng: Rng, opts: { skin: SkinId; fact: 'P' | 'Q'; target?: Lit }): CondMade {
  const skin = SKINS[opts.skin];
  const name = pickName(rng, opts.skin);
  const fact = opts.fact;
  const target = opts.target ?? rng.pick(otherPart(fact));
  if (partOf(target) === partOf(fact)) throw new Error('turnItem: the sentence must be about the other part');
  const status = statusOf(fact, target);
  const f = (l: Lit) => skin.fact(l, name);
  const quoted = (l: Lit) => `“${f(l)}”`;
  const other = rng.pick(skin.otherWays)(name);
  const got = follows(fact);
  const factLine = `${sentence(f(fact))} ${FACT_LINE[fact]}`;
  // A case where the fact is true, with the sentence's truth beside the rule's.
  const kase = (r: Row): TeachCase => ({
    label: sentence(skin.says(name, r)),
    truths: [...partTruths(r), { who: SENTENCE_WHO, value: litHolds(target, r) }],
    note: possibleNote(r, fact === 'Q' && !r.p ? other : ''),
  });
  const said = (ch: 'must' | 'never') => `Your answer says ${quoted(target)} is ${ch === 'must' ? 'true' : 'false'} for sure.`;
  const feedback: Record<string, ChoiceFeedback> = {};
  let explain: string;
  if (status === 'maybe') {
    explain = `${cap(skin.mayP(name))}. But ${other}. So you can’t tell.`;
    for (const ch of ['must', 'never'] as const) {
      // What the answer claims about the IF part.
      const claim = ch === 'must' ? target : neg(target);
      const means = claim === target ? '' : ` That would mean ${mid(f(claim))} for sure.`;
      // The case that proves the claim wrong: the fact is true, the rule is kept, and the claim is false.
      const proof = ROWS.find((r) => litHolds(fact, r) && ruleHolds(r) && !litHolds(claim, r))!;
      feedback[ch] =
        claim === 'P'
          ? { headline: BACKWARD_HEAD, detail: [factLine, `${said(ch)}${means}`, `But the THEN part can happen another way. ${cap(other)}.`], example: kase(proof) }
          : { headline: RULES_OUT_IF_HEAD, detail: [factLine, `${said(ch)}${means}`, `But ${skin.mayP(name)}. Nothing in the rule stops that.`], example: kase(proof) };
    }
  } else {
    if (!got) throw new Error('turnItem: a settled sentence needs a fact that follows');
    const tf = rowAt(true, false);
    const sure = `${quoted(target)} is ${status === 'must' ? 'true' : 'false'} for sure`;
    explain = `${factLine.replace(' of the rule.', ',')} so the THEN part must be true too. ${sentence(f(got))}${status === 'never' ? ` So ${sure}.` : ''}`;
    feedback.maybe = {
      headline: '“Can’t tell” misses that the IF part happened.',
      detail: [factLine, `The rule says the THEN part must happen too. So ${mid(f(got))}.`, target === got ? 'That is just what the sentence says. So it is true for sure.' : `So ${sure}.`],
      example: kase(tf),
    };
    const wrong = status === 'must' ? 'never' : 'must';
    feedback[wrong] = { headline: BREAKS_HEAD, detail: [factLine, `${said(wrong)} That would be ${skin.kase.TF}.`, `That breaks the rule. ${NEVER_BROKEN}`], example: kase(tf) };
  }
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${sentence(f(fact))} Is this sentence true for sure, false for sure, or can’t you tell? “${sentence(f(target))}”`,
    scene: ruleScene(opts.skin, true),
    choices: STATUS_CHOICES,
    answer: status,
    explain,
    feedback,
    hint: 'Which part of the rule do you know about: the IF part or the THEN part?',
    teach: {
      rule: fact === 'P' ? 'A rule like this works forward. When the IF part happens, the THEN part must happen too.' : 'A rule like this does not work backward. The THEN part can happen without the IF part.',
      terms: [...partTerms(opts.skin), CANT_TELL_TERM],
      meaning: `${ruleMeaning(skin)} ${NEVER_BROKEN}`,
      casesTitle: `What could be true when ${mid(f(fact))}?`,
      cases: ROWS.filter((r) => litHolds(fact, r)).map(kase),
      remember:
        fact === 'P'
          ? ['Forward works: the IF part happened, so the THEN part did too.', 'Ask: “Do I know about the IF part, or only the THEN part?”']
          : ['Backward does not work: the THEN part can happen another way.', 'Ask: “Could the THEN part happen another way?”'],
      simpler:
        fact === 'P'
          ? [sentence(f('P')), 'That is the IF part. The rule says the THEN part must happen too.', `So ${mid(f('Q'))}.`]
          : [`${sentence(f('Q'))} That is the THEN part.`, `${cap(skin.mayP(name))}.`, `But ${other}.`, 'The rule allows each of these. So you can’t tell.'],
    },
  };
  syncWhyWrong(item);
  if (fact === 'Q') item.conflict = true;
  return { tag: fact === 'Q' ? 'backward' : 'forward', item, meta: { skin: opts.skin, name, fact, target } };
}

export const NOTHING = 'nothing';
export const NOTHING_LABEL = 'Nothing follows for sure.';
export const MOVE_TAGS: Record<Move, string> = { mp: 'move-if', mt: 'move-not-then', ac: 'trap-then', da: 'trap-not-if' };
const litId = (l: Lit) => ({ P: 'p', notP: 'np', Q: 'q', notQ: 'nq' })[l];
const MOVE_REMEMBER: Record<Move, string> = {
  mp: 'The IF part happened, so the THEN part did too.',
  mt: 'The THEN part did not happen, so the IF part did not either.',
  ac: 'The THEN part alone proves nothing about the IF part.',
  da: 'Without the IF part, the rule says nothing about the THEN part.',
};

/** Lesson 3: a rule and one fact. What follows for sure? */
export function moveItem(rng: Rng, opts: { skin: SkinId; move: Move }): CondMade {
  const skin = SKINS[opts.skin];
  const name = pickName(rng, opts.skin);
  const fact = MOVE_FACT[opts.move];
  const f = (l: Lit) => skin.fact(l, name);
  const [pos, negl] = otherPart(fact);
  const choices: Choice[] = [
    { id: litId(pos), label: sentence(f(pos)) },
    { id: litId(negl), label: sentence(f(negl)) },
    { id: NOTHING, label: NOTHING_LABEL },
  ];
  const lits: Record<string, Lit> = { [litId(pos)]: pos, [litId(negl)]: negl };
  const got = follows(fact);
  const answer = got ? litId(got) : NOTHING;
  const factLine = `${sentence(f(fact))} ${FACT_LINE[fact]}`;
  const tf = rowAt(true, false);
  let explain: string;
  let simpler: string[];
  // A way each case could happen, for the cases that keep the rule ("Rex could be a cat.").
  let why: (r: Row) => string = () => '';
  if (got && fact === 'P') {
    explain = `You know the IF part happened. So the THEN part must happen too. ${sentence(f(got))}`;
    simpler = [sentence(f('P')), 'That is the IF part. The rule says the THEN part must happen too.', `So ${mid(f(got))}.`];
  } else if (got) {
    explain = `The THEN part did not happen. If the IF part had happened, the rule would be broken. So ${mid(f(got))}.`;
    simpler = [factLine, `Imagine ${mid(f('P'))}. That would be ${skin.kase.TF}. That breaks the rule.`, `So ${mid(f(got))}.`];
  } else if (partOf(fact) === 'q') {
    const other = rng.pick(skin.otherWays)(name);
    explain = `${cap(skin.mayP(name))}. But ${other}. So nothing follows for sure.`;
    why = (r) => (r.p ? '' : other);
    simpler = [`${sentence(f(fact))} That is the THEN part.`, `${cap(skin.mayP(name))}.`, `But ${other}.`, 'The rule allows each of these. So nothing follows for sure.'];
  } else {
    const [yes, no] = skin.noIf(name);
    explain = `${skin.onlyAbout} ${cap(yes)}. Or ${no}. So nothing follows for sure.`;
    why = (r) => (r.q ? yes : no);
    simpler = [factLine, skin.onlyAbout, `${cap(yes)}. Or ${no}.`, 'So nothing follows for sure.'];
  }
  const kase = (r: Row, pick?: Lit): TeachCase => ({
    label: sentence(skin.says(name, r)),
    truths: [...partTruths(r), ...(pick ? [{ who: ANSWER_WHO, value: litHolds(pick, r) }] : [])],
    note: possibleNote(r, why(r)),
  });
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of choices) {
    if (c.id === answer) continue;
    if (c.id === NOTHING) {
      // Something follows: the one other case that fits the fact breaks the rule.
      feedback[NOTHING] =
        fact === 'P'
          ? { headline: '“Nothing follows for sure” misses that the IF part happened.', detail: [factLine, 'When the IF part happens, the THEN part must happen too.', `So ${mid(f(got!))}. That follows for sure.`], example: kase(tf) }
          : { headline: '“Nothing follows for sure” misses that the IF part can’t have happened.', detail: [factLine, `Imagine ${mid(f('P'))}. That would be ${skin.kase.TF}, and that breaks the rule.`, `So ${mid(f(got!))}. That follows for sure.`], example: kase(tf) };
      continue;
    }
    const lit = lits[c.id];
    const says = `Your answer says ${mid(f(lit))}.`;
    if (got) {
      // The answer goes against what follows: with the fact, it makes the one case that breaks the rule.
      feedback[c.id] = { headline: BREAKS_HEAD, detail: [factLine, `${says} That would be ${skin.kase.TF}.`, `That breaks the rule. ${NEVER_BROKEN}`], example: kase(tf, lit) };
      continue;
    }
    // Nothing follows: a case that fits the fact and keeps the rule, where the answer is false.
    const proof = ROWS.find((r) => litHolds(fact, r) && ruleHolds(r) && !litHolds(lit, r))!;
    const maybe = `${says} That might be true, but it does not have to be.`;
    const example = kase(proof, lit);
    switch (lit) {
      case 'P': // the THEN part happened, so the answer runs the rule backward
        feedback[c.id] = { headline: BACKWARD_HEAD, detail: [factLine, maybe, `The THEN part can happen another way. ${cap(why(proof))}.`], example };
        break;
      case 'notP': // the THEN part happened, and the answer rules out the IF part
        feedback[c.id] = { headline: RULES_OUT_IF_HEAD, detail: [factLine, maybe, `${cap(skin.mayP(name))}. Nothing in the rule stops that.`], example };
        break;
      case 'Q': // the IF part did not happen, and the answer still says the THEN part happened
        feedback[c.id] = { headline: THEN_ANYWAY_HEAD, detail: [factLine, `${skin.onlyAbout} Without the IF part, it says nothing about the THEN part.`, `${maybe} ${cap(why(proof))}.`], example };
        break;
      case 'notQ': // the IF part did not happen, and the answer takes away the THEN part too
        feedback[c.id] = { headline: 'Your answer says no IF part means no THEN part.', detail: [factLine, `${skin.onlyAbout} The THEN part can still happen without the IF part.`, `${maybe} ${cap(why(proof))}.`], example };
        break;
    }
  }
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${sentence(f(fact))} What follows for sure?`,
    scene: ruleScene(opts.skin, true),
    choices,
    answer,
    explain,
    feedback,
    hint: 'Is the fact about the IF part or the THEN part? Did that part happen?',
    teach: {
      rule: moveRule(fact),
      terms: [...partTerms(opts.skin), NOTHING_TERM],
      meaning: `${ruleMeaning(skin)} ${NEVER_BROKEN}`,
      casesTitle: `What could be true when ${mid(f(fact))}?`,
      cases: ROWS.filter((r) => litHolds(fact, r)).map((r) => kase(r)),
      remember: [MOVE_REMEMBER[opts.move], 'Ask: “Which cases fit the fact and keep the rule?”'],
      simpler,
    },
  };
  syncWhyWrong(item);
  if (!got) item.conflict = true;
  return { tag: MOVE_TAGS[opts.move], item, meta: { skin: opts.skin, name, fact, move: opts.move } };
}

export type Rewrite = 'contra' | 'converse' | 'inverse';
export const REWRITES: Record<Rewrite, Cond> = { contra: CONTRA, converse: CONVERSE, inverse: INVERSE };

const isNot = (l: Lit) => l === 'notP' || l === 'notQ';

/** A fixed id for a sentence, from what it does to the rule, never from its place in the list. */
export function condId(c: Cond): string {
  if (sameCond(c, CONTRA)) return 'flip-and-not';
  if (sameCond(c, CONVERSE)) return 'flip-only';
  if (sameCond(c, INVERSE)) return 'not-only';
  return `if-${litId(c.a)}-then-${litId(c.b)}`;
}

/** What a rewrite does to the rule, worked out from its parts: is it flipped, and which parts have NOT? */
function rewriteKind(c: Cond): { head: string; does: (who: string) => string } {
  const flip = partOf(c.a) === 'q';
  const nIf = isNot(c.a), nThen = isNot(c.b);
  if (flip && !nIf && !nThen) return { head: 'only flips the rule', does: (w) => `${w} swaps the IF part and the THEN part. It does not add NOT.` };
  if (!flip && nIf && nThen) return { head: 'only puts NOT in both parts', does: (w) => `${w} adds NOT to the IF part and to the THEN part. It does not swap them.` };
  if (!flip && nThen) return { head: 'puts NOT in the THEN part only', does: (w) => `${w} keeps the parts in place and adds NOT to the THEN part only.` };
  if (!flip && nIf) return { head: 'puts NOT in the IF part only', does: (w) => `${w} keeps the parts in place and adds NOT to the IF part only.` };
  if (flip && nIf !== nThen) return { head: `flips the rule but puts NOT in its new ${nIf ? 'IF' : 'THEN'} part only`, does: (w) => `${w} swaps the parts, then adds NOT to its new ${nIf ? 'IF' : 'THEN'} part only.` };
  if (flip) return { head: 'flips the rule and puts NOT in both parts', does: (w) => `${w} swaps the IF part and the THEN part, and adds NOT to each one.` };
  return { head: 'is the rule itself', does: (w) => `${w} is the rule itself.` };
}

/** A case that one sentence keeps and the other breaks, and which one it breaks. */
export function telltaleRow(c: Cond): { row: Row; breaks: 'sentence' | 'rule' } | null {
  const a = ROWS.find((r) => !condHolds(c, r) && ruleHolds(r));
  if (a) return { row: a, breaks: 'sentence' };
  const b = ROWS.find((r) => condHolds(c, r) && !ruleHolds(r));
  return b ? { row: b, breaks: 'rule' } : null;
}

/** "This case breaks your sentence, but it keeps the rule." from the truths. */
function apartLine(row: Row, c: Cond, name: string): string {
  return condHolds(c, row) ? `This case breaks the rule, but it keeps ${name}.` : `This case breaks ${name}, but it keeps the rule.`;
}

/** Why a rewrite does not mean the same as the rule, from the case where they differ. */
function differs(skin: Skin, c: Cond, who: string, name: string): string {
  const t = telltaleRow(c);
  if (!t) throw new Error('differs: this sentence means the same as the rule');
  return `${rewriteKind(c).does(who)} Think of ${skin.kase[rowKey(t.row)]}. ${apartLine(t.row, c, name)} So they do not mean the same.`;
}

/** Why flip and NOT means the same as the rule: the same one case breaks each of them. */
function matches(skin: Skin, c: Cond): string {
  const broken = brokenRows(c);
  if (!sameMeaning(c, RULE) || broken.length !== 1) throw new Error('matches: this sentence does not mean the same as the rule');
  return `It flips the rule and puts NOT in both parts. Only ${skin.kase[rowKey(broken[0])]} breaks it, just like the rule. So they mean the same.`;
}

/** The sentence in quotes inside a sentence: no final period. */
const quoteCond = (skin: SkinId, c: Cond) => `“${condText(skin, c).replace(/\.$/, '')}”`;

/** The smallest worked example for one sentence against the rule. */
function sameSteps(skin: SkinId, c: Cond): string[] {
  const s = SKINS[skin];
  const t = telltaleRow(c);
  if (!t) {
    const only = brokenRows(RULE)[0];
    return [`Only ${s.kase[rowKey(only)]} breaks the rule.`, `Only ${s.kase[rowKey(only)]} breaks this sentence too.`, 'No other case breaks the rule or this sentence. So they mean the same.'];
  }
  const yn = (v: boolean) => (v ? 'No' : 'Yes');
  return [
    `Think of ${s.kase[rowKey(t.row)]}.`,
    `Does this case break the rule? ${yn(ruleHolds(t.row))}.`,
    `Does it break ${quoteCond(skin, c)}? ${yn(condHolds(c, t.row))}.`,
    'One case breaks one sentence but not the other. So they do not mean the same.',
  ];
}

/** The four cases with the rule and one other sentence, each kept or broken. */
function sameCases(skin: Skin, c: Cond, who: string, name: string): TeachCase[] {
  return ROWS.map((r) => {
    const a = ruleHolds(r), b = condHolds(c, r);
    const note = a === b
      ? a ? 'Neither sentence is broken.' : `This case breaks the rule and ${name}.`
      : `${apartLine(r, c, name)} It tells the two sentences apart.`;
    return { label: sentence(cap(skin.kase[rowKey(r)])), truths: [{ who: RULE_WHO, value: a }, { who, value: b }], note };
  });
}

/**
 * Lesson 4 teaching: the four cases against `shown` (the flip and NOT sentence, or the sentence asked about). When
 * `shown` is not quoted in the prompt, the meaning quotes it, so the cases always say which sentence they test.
 */
function sameTeach(skinId: SkinId, shown: Cond, who: string, name: string, title: string, simplest: Cond, quote = false): Teach {
  const skin = SKINS[skinId];
  return {
    rule: SAME_RULE,
    terms: [FLIP_TERM, NOT_BOTH_TERM, BREAKS_SENTENCE_TERM],
    meaning: quote ? `${ruleMeaning(skin)} ${cap(name)} is ${quoteCond(skinId, shown).replace(/”$/, '.”')}` : ruleMeaning(skin),
    casesTitle: title,
    cases: sameCases(skin, shown, who, name),
    remember: ['Flip and NOT means the same as the rule. Flip only, or NOT only, does not.', 'Ask: “Does any case break one sentence but not the other?”'],
    simpler: sameSteps(skinId, simplest),
  };
}

/** Lesson 4: "Which sentence means the same as the rule?" Exactly one choice matches the rule in all four cases. */
export function samePickItem(rng: Rng, opts: { skin: SkinId; extra?: boolean }): CondMade {
  const skin = SKINS[opts.skin];
  const conds: Cond[] = [CONTRA, CONVERSE, INVERSE];
  if (opts.extra ?? rng.chance(0.5)) conds.push(rng.pick(ODD_REWRITES));
  const order = rng.shuffle(conds);
  const choices = order.map((c) => ({ id: condId(c), label: condText(opts.skin, c) }));
  const right = order.filter((c) => sameMeaning(c, RULE));
  if (right.length !== 1) throw new Error('samePickItem: exactly one choice must mean the same as the rule');
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of order) {
    if (sameMeaning(c, RULE)) continue;
    const t = telltaleRow(c)!;
    const apart = apartLine(t.row, c, 'your sentence');
    feedback[condId(c)] = {
      headline: `Your answer ${rewriteKind(c).head}.`,
      detail: [
        rewriteKind(c).does('Your sentence'),
        `Think of ${skin.kase[rowKey(t.row)]}. ${apart}`,
        'So your sentence does not mean the same as the rule.',
      ],
      example: {
        label: sentence(cap(skin.kase[rowKey(t.row)])),
        truths: [{ who: RULE_WHO, value: ruleHolds(t.row) }, { who: YOURS_WHO, value: condHolds(c, t.row) }, { who: CONTRA_WHO, value: condHolds(CONTRA, t.row) }],
        note: apart,
      },
      simpler: sameSteps(opts.skin, c),
    };
  }
  const item: ChooseCore = {
    kind: 'choose',
    prompt: 'Which sentence means the same as the rule? Two sentences mean the same when the same cases break them.',
    scene: ruleScene(opts.skin),
    choices,
    answer: condId(right[0]),
    explain: matches(skin, right[0]).replace(/^It /, 'The right one '),
    feedback,
    hint: 'Think of a case that breaks one sentence. Does it break the rule too?',
    // The cases show the rule and flip and NOT side by side; the simpler example is the flip-only trap.
    teach: sameTeach(opts.skin, CONTRA, CONTRA_WHO, 'the flip and NOT sentence', 'Which cases break the rule? Which break the flip and NOT sentence?', CONVERSE, true),
  };
  syncWhyWrong(item);
  return { tag: 'same-pick', item, meta: { skin: opts.skin, name: '', conds: Object.fromEntries(order.map((c) => [condId(c), c])) } };
}

/** Lesson 4: "Does this sentence mean the same as the rule?" Flip only and NOT only are traps. */
export function sameYesNoItem(rng: Rng, opts: { skin: SkinId; rewrite?: Rewrite }): CondMade {
  const skin = SKINS[opts.skin];
  const key = opts.rewrite ?? rng.pick(['contra', 'converse', 'inverse'] as const);
  const c = REWRITES[key];
  const isSame = sameMeaning(c, RULE);
  const explain = isSame ? matches(skin, c) : differs(skin, c, 'This sentence', 'this sentence');
  let fb: ChoiceFeedback;
  if (isSame) {
    const only = brokenRows(RULE);
    if (only.length !== 1 || brokenRows(c).length !== 1 || rowKey(brokenRows(c)[0]) !== rowKey(only[0])) throw new Error('sameYesNoItem: flip and NOT must break in the rule’s one case');
    const k = skin.kase[rowKey(only[0])];
    fb = {
      headline: 'Your answer says the two sentences do not mean the same, but the same cases break them.',
      detail: [rewriteKind(c).does('This sentence'), `Try all four cases. Only ${k} breaks the rule. Only ${k} breaks this sentence too.`, 'The same cases break the rule and this sentence. So they mean the same.'],
      example: {
        label: sentence(cap(k)),
        truths: [{ who: RULE_WHO, value: ruleHolds(only[0]) }, { who: THIS_WHO, value: condHolds(c, only[0]) }],
        note: 'This is the only case that breaks the rule. It is also the only case that breaks this sentence.',
      },
    };
  } else {
    const t = telltaleRow(c)!;
    const apart = apartLine(t.row, c, 'this sentence');
    fb = {
      headline: `Your answer misses that this sentence ${rewriteKind(c).head}.`,
      detail: [rewriteKind(c).does('This sentence'), `Think of ${skin.kase[rowKey(t.row)]}. ${apart}`, 'So this sentence does not mean the same as the rule.'],
      example: {
        label: sentence(cap(skin.kase[rowKey(t.row)])),
        truths: [{ who: RULE_WHO, value: ruleHolds(t.row) }, { who: THIS_WHO, value: condHolds(c, t.row) }],
        note: apart,
      },
    };
  }
  fb.simpler = sameSteps(opts.skin, c);
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `Two sentences mean the same when the same cases break them. Does this sentence mean the same as the rule? “${condText(opts.skin, c)}”`,
    scene: ruleScene(opts.skin),
    choices: YES_NO,
    answer: isSame ? 'yes' : 'no',
    explain,
    feedback: { [isSame ? 'no' : 'yes']: fb },
    hint: 'Try a case that breaks the rule. Does it break this sentence too? Then try the other cases.',
    teach: sameTeach(opts.skin, c, THIS_WHO, 'this sentence', 'Which cases break the rule? Which break this sentence?', c),
  };
  syncWhyWrong(item);
  if (!isSame) item.conflict = true;
  return { tag: 'same-yesno', item, meta: { skin: opts.skin, name: '', conds: { one: c } } };
}

/** The card ids of a rule checker. */
export const CARD_IDS: Record<Lit, string> = { P: 'p', notP: 'np', Q: 'q', notQ: 'nq' };

/** The case with `face` on one side and `back` on the other. */
export const cardRow = (face: Lit, back: Lit): Row => ROWS.find((r) => litHolds(face, r) && litHolds(back, r))!;

/** Ends a phrase with a period or comma, inside a closing quote when it ends with one: “Dessert.” */
const ending = (s: string, mark: '.' | ',') => (s.endsWith('”') ? `${s.slice(0, -1)}${mark}”` : `${s}${mark}`);

/** "“Dessert” or “No dessert”": the two backs a card could have. */
function backs(cards: NonNullable<Skin['cards']>, face: Lit, sym: Symbols): string {
  const [a, b] = otherPart(face);
  return `${cards.back(a, sym)} or ${cards.back(b, sym)}`;
}

/** Why a card must be turned over, or why it can't break the rule, worked out from its two possible backs. */
function cardNote(skin: Skin, face: Lit, sym: Symbols): string {
  const cards = skin.cards!;
  const back = breakingBack(face);
  if (back) return `With ${cards.back(back, sym)} on the back, the IF part happened, but the THEN part did not. That breaks the rule.`;
  return `With ${backs(cards, face, sym)} on the back, the rule is kept.`;
}

/** What one fact says about its part: "the IF part happened", "the THEN part did not happen". */
const partSays = (l: Lit) => `the ${partOf(l) === 'p' ? 'IF' : 'THEN'} part ${isNot(l) ? 'did not happen' : 'happened'}`;

/**
 * The gap in turning a card over or not, worked out from its face: a card to turn could hide the back that breaks
 * the rule ("its back could show the THEN part did not happen"); a card to skip shows a part that already settles it.
 */
function cardGap(face: Lit): string {
  const back = breakingBack(face);
  if (back) return `its back could show ${partSays(back)}`;
  return `${partSays(face).replace(/ happened$/, partOf(face) === 'q' ? ' already happened' : ' happened')} there`;
}

/**
 * A missed or extra card in the rule checker. grade() joins one tip per wrong card into one paragraph, so each tip is
 * short: the card and its gap (the first tip becomes the title), then the backs that break or keep the rule.
 */
function cardTip(skin: Skin, face: Lit, sym: Symbols): string {
  const cards = skin.cards!;
  const shows = `the card that shows “${cards.face(face, sym)}`;
  const back = breakingBack(face);
  if (back) {
    const miss = face === 'notQ' ? ' Many people miss this card.' : '';
    return `Your answer leaves out ${shows},” but ${cardGap(face)}. With ${cards.back(back, sym)} on the back, the rule is broken.${miss}`;
  }
  const trap = face === 'Q' ? ' This card is the trap.' : '';
  return `Your answer turns over ${shows},” but ${cardGap(face)}. ${cardNote(skin, face, sym)}${trap}`;
}

/** The rule checker's teaching, with its cases (all four cards, or the two backs of one card). */
function cardTeach(skin: Skin, skinId: SkinId, cases: TeachCase[], title: string, simpler: string[]): Teach {
  return {
    rule: CHECK_RULE,
    terms: [...partTerms(skinId), BREAKS_TERM],
    meaning: ruleMeaning(skin),
    casesTitle: title,
    cases,
    remember: ['Turn over the card that shows the IF part, and the card that shows the THEN part did not happen.', ASK_CARD],
    simpler,
  };
}

/** The smallest example of one card: each back, and whether it breaks the rule. */
function cardSteps(skin: Skin, face: Lit, sym: Symbols): string[] {
  const cards = skin.cards!;
  const out = [`Look at the card that shows “${cards.face(face, sym)}.”`];
  for (const b of otherPart(face)) out.push(`If its back shows ${ending(cards.back(b, sym), ',')} the rule is ${ruleHolds(cardRow(face, b)) ? 'kept' : 'broken'}.`);
  out.push(mustTurn(face) ? 'One back breaks the rule. So you must turn this card over.' : 'No back breaks the rule. So you do not need to turn this card over.');
  return out;
}

/** Lesson 5: four cards, one side showing. Which must you turn over? The IF card and the NOT-THEN card. */
export function checkerItem(rng: Rng, opts: { skin: SkinId }): CondMade {
  const skin = SKINS[opts.skin];
  const cards = skin.cards;
  if (!cards) throw new Error(`checkerItem: ${opts.skin} has no cards`);
  const sym = drawSymbols(rng);
  const order = rng.shuffle(LITS);
  const choices = order.map((l) => ({ id: CARD_IDS[l], label: cards.face(l, sym) }));
  const turn = order.filter(mustTurn);
  const pickTips: Record<string, string> = {};
  const missTips: Record<string, string> = {};
  for (const l of order) (mustTurn(l) ? missTips : pickTips)[CARD_IDS[l]] = cardTip(skin, l, sym);
  const q = (l: Lit) => `“${cards.face(l, sym)}”`;
  const [a, b] = LITS.filter(mustTurn);
  const trap = LITS.find((l) => !mustTurn(l) && partOf(l) === 'q')!;
  const cases: TeachCase[] = LITS.map((l) => ({
    label: `The card that shows “${cards.face(l, sym)}.”`,
    truths: [{ who: TURN_WHO, value: mustTurn(l) }],
    note: cardNote(skin, l, sym),
  }));
  const item: CondCore = {
    kind: 'multi',
    prompt: `${cards.intro} ${cards.ask} Choose only the cards you need.`,
    scene: ruleScene(opts.skin),
    choices,
    answer: turn.map((l) => CARD_IDS[l]),
    explain: `Only the cards that show ${q(a)} and ${q(b)} could hide a broken rule. The card that shows ${q(trap)} is the trap. Even with ${cards.back('P', sym)} on the back, the rule is kept.`,
    pickTips,
    missTips,
    hint: 'For each card, ask what could be on the back. Could that break the rule?',
    conflict: true,
    // The two cards people get wrong most: the NOT THEN card (turn it) and the THEN card (the trap: skip it).
    teach: cardTeach(skin, opts.skin, cases, 'Which cards could hide a broken rule?', [
      ...cardSteps(skin, 'notQ', sym),
      ...cardSteps(skin, 'Q', sym).map((s, i) => (i === 0 ? `Now ${s.charAt(0).toLowerCase()}${s.slice(1)}` : s)),
    ]),
  };
  return { tag: 'checker', item, meta: { skin: opts.skin, name: '', faces: Object.fromEntries(order.map((l) => [CARD_IDS[l], l])), sym } };
}

/** Lesson 5: one card. Must you turn it over? */
export function cardItem(rng: Rng, opts: { skin: SkinId; face?: Lit }): CondMade {
  const skin = SKINS[opts.skin];
  const cards = skin.cards;
  if (!cards) throw new Error(`cardItem: ${opts.skin} has no cards`);
  const sym = drawSymbols(rng);
  const face = opts.face ?? rng.pick(LITS);
  const turn = mustTurn(face);
  const shown = `“${cards.face(face, sym)}”`;
  /** A quote that ends a sentence keeps the period inside: “Dessert.” */
  const endQuote = (q: string) => q.replace(/”$/, '.”');
  const backCase = (b: Lit): TeachCase => ({
    label: `A card with ${shown} on the front and ${cards.back(b, sym)} on the back.`,
    truths: partTruths(cardRow(face, b)),
    note: rowNote(cardRow(face, b)),
  });
  const back = breakingBack(face);
  let fb: ChoiceFeedback;
  let explain: string;
  if (back) {
    explain = `The card could have ${cards.back(back, sym)} on the back. Then the IF part happened, but the THEN part did not. So you must turn it over.`;
    fb = {
      // Named by the part the card shows and the back that breaks the rule: the IF card hides a missing THEN part,
      // the NOT THEN card hides the IF part.
      headline: `Your answer skips a card where ${partSays(face)}, but ${cardGap(face)}.`,
      detail: [`The card shows ${endQuote(shown)} Its back could show ${ending(cards.back(back, sym), '.')}`, 'Then the IF part happened, but the THEN part did not. That breaks the rule.', `So you must turn it over to check.${face === 'notQ' ? ' Many people miss this card.' : ''}`],
      example: backCase(back),
    };
  } else {
    explain = `With ${backs(cards, face, sym)} on the back, the rule is kept. So you do not need to turn it over.`;
    const worst = otherPart(face)[0];
    fb =
      face === 'Q'
        ? { headline: 'Your answer turns over a card where the THEN part already happened.', detail: [`The card shows ${endQuote(shown)} So the THEN part happened.`, `With ${backs(cards, face, sym)} on the back, the rule is kept.`, 'No back can break the rule. So you do not need to turn it over. This card is the trap.'], example: backCase(worst) }
        : { headline: 'Your answer turns over a card where the IF part did not happen.', detail: [`The card shows ${endQuote(shown)} So the IF part did not happen.`, skin.onlyAbout, `With ${backs(cards, face, sym)} on the back, the rule is kept. So you do not need to turn it over.`], example: backCase(otherPart(face)[1]) };
  }
  fb.simpler = cardSteps(skin, face, sym);
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${cards.intro} One card shows ${endQuote(shown)} Must you turn it over to check the rule?`,
    scene: ruleScene(opts.skin),
    choices: YES_NO,
    answer: turn ? 'yes' : 'no',
    explain,
    feedback: { [turn ? 'no' : 'yes']: fb },
    hint: 'What could be on the back of this card? Could any of those break the rule?',
    teach: cardTeach(skin, opts.skin, otherPart(face).map(backCase), `What could be on the back of the card that shows ${shown}?`, cardSteps(skin, face, sym)),
  };
  syncWhyWrong(item);
  if (face === 'Q' || face === 'notQ') item.conflict = true;
  return { tag: 'checker-card', item, meta: { skin: opts.skin, name: '', faces: { one: face }, sym } };
}
