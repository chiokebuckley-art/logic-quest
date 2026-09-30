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
 *
 * Words come from skins: everyday (lunchroom, library, lunchbox, umbrella, wet grass, dogs), fantasy
 * (dragons, wizards, potions) and abstract (letters and numbers, P and Q). Only the rng passed in is used.
 */
import type { Choice, ChooseItem, MultiItem, Rng, Scene } from '../types';

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
  return {
    fact: (l: Lit, n: string) => `${subj(n)} ${pred[l]}`,
    label: (c: Case) => `${subj(c.name)} ${pred[litOf('p', c.row.p)]} and ${pred[litOf('q', c.row.q)]}`,
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
    onlyAbout: 'The rule only talks about cards with a vowel.',
    mayP: (n) => `${n} could have a vowel`,
    otherWays: [(n) => `${n} could have a K, which is not a vowel`, (n) => `${n} could have a B, which is not a vowel`, (n) => `${n} could have a T, which is not a vowel`],
    noIf: (n) => [`${n} could have an even number anyway`, `${n} could have an odd number`],
    kase: {
      TT: `a card with ${CLASSIC.vowel} and ${CLASSIC.even}`,
      TF: `a card with ${CLASSIC.vowel} and ${CLASSIC.odd}`,
      FT: `a card with ${CLASSIC.consonant} and ${CLASSIC.even}`,
      FF: `a card with ${CLASSIC.consonant} and ${CLASSIC.odd}`,
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
  return { kind: 'grid', rows, cols, marks, caption: '✓ means the case keeps that sentence. ✗ means it breaks it.' };
}

// ---------- items ----------

type Core<T> = T extends ChooseItem | MultiItem ? Omit<T, 'id' | 'stop' | 'lesson' | 'skill'> : never;
export type CondCore = Core<ChooseItem> | Core<MultiItem>;

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
  return `The IF part did not happen. ${skin.onlyAbout} So this does not break the rule.`;
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
  const choices = cases.map((c, i) => ({ id: `c${i + 1}`, label: l1.label(c) }));
  const broken = cases.map((c, i) => (ruleHolds(c.row) ? -1 : i)).filter((i) => i >= 0);
  if (broken.length !== 1) throw new Error('whoBrokeItem: exactly one case must break the rule');
  const whyWrong: Record<string, string> = {};
  cases.forEach((c, i) => {
    if (i !== broken[0]) whyWrong[choices[i].id] = `${sentence(l1.says(c))} ${caseReason(skin, c.row)}`;
  });
  const item: CondCore = {
    kind: 'choose',
    prompt: l1.ask,
    scene: ruleScene(opts.skin),
    choices,
    answer: choices[broken[0]].id,
    explain: `${sentence(l1.says(cases[broken[0]]))} ${IF_ONLY_WAY}`,
    whyWrong,
    hint: 'For each one, ask: did the IF part happen? Then ask: did the THEN part happen?',
  };
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
  const reason = caseReason(skin, row);
  const item: CondCore = {
    kind: 'choose',
    prompt: `${sentence(l1.says(c))} ${l1.did(name)}`,
    scene: ruleScene(opts.skin),
    choices: YES_NO,
    answer: broke ? 'yes' : 'no',
    explain: reason,
    whyWrong: broke
      ? { no: 'The IF part happened, so the THEN part had to happen too. It did not, so the rule was broken.' }
      : { yes: row.p ? `${reason} Breaking it takes the IF part without the THEN part.` : reason },
    hint: 'First ask: did the IF part happen?',
  };
  if (!row.p && !row.q) item.conflict = true;
  return { tag: 'did-break', item, meta: { skin: opts.skin, name, cases: { one: row }, sym } };
}

export const STATUS_CHOICES: Choice[] = [
  { id: 'must', label: 'Must be true' },
  { id: 'maybe', label: 'Can’t tell' },
  { id: 'never', label: 'Can’t be true' },
];

/**
 * Lesson 2: a fact about the IF part (going forward) or the THEN part (going backward), and a sentence
 * about the other part. Must it be true, can't it be true, or can't you tell? Backward items are traps.
 */
export function turnItem(rng: Rng, opts: { skin: SkinId; fact: 'P' | 'Q'; target?: Lit }): CondMade {
  const skin = SKINS[opts.skin];
  const name = pickName(rng, opts.skin);
  const fact = opts.fact;
  const target = opts.target ?? rng.pick(otherPart(fact));
  if (partOf(target) === partOf(fact)) throw new Error('turnItem: the sentence must be about the other part');
  const status = statusOf(fact, target);
  const f = (l: Lit) => skin.fact(l, name);
  const other = rng.pick(skin.otherWays)(name);
  const q = follows(fact);
  let explain: string;
  const whyWrong: Record<string, string> = {};
  if (status === 'maybe') {
    explain = `${cap(skin.mayP(name))}. But ${other}. So you can’t tell.`;
    const backward = `The rule does not work backward. ${cap(other)}.`;
    const could = `${cap(skin.mayP(name))}. Nothing in the rule stops that.`;
    // "Must be true" about the IF part, or "can't be true" about NOT the IF part, both run the rule backward.
    whyWrong.must = litHolds(target, { p: true, q: true }) ? backward : could;
    whyWrong.never = litHolds(target, { p: true, q: true }) ? could : backward;
  } else {
    if (!q) throw new Error('turnItem: a settled sentence needs a fact that follows');
    const says = `${sentence(f(fact))} That is the IF part, so the THEN part must be true too. ${sentence(f(q))}`;
    explain = status === 'must' ? says : `${says} This sentence says the opposite.`;
    const other2 = status === 'must' ? 'never' : 'must';
    whyWrong[other2] = status === 'must' ? `${sentence(f(fact))} That is the IF part, so the THEN part must be true too.` : `${f(fact)}, so the rule says ${mid(f(q))}. This sentence says the opposite.`;
    whyWrong.maybe = `You can tell. ${f(fact)}, so the rule says ${mid(f(q))}.`;
  }
  const item: CondCore = {
    kind: 'choose',
    prompt: `${sentence(f(fact))} Look at this sentence: “${sentence(f(target))}” Is it true?`,
    scene: ruleScene(opts.skin, true),
    choices: STATUS_CHOICES,
    answer: status,
    explain,
    whyWrong: Object.fromEntries(Object.entries(whyWrong).filter(([k]) => k !== status)),
    hint: 'Which part of the rule do you know about: the IF part or the THEN part?',
  };
  if (fact === 'Q') item.conflict = true;
  return { tag: fact === 'Q' ? 'backward' : 'forward', item, meta: { skin: opts.skin, name, fact, target } };
}

export const NOTHING = 'nothing';
export const NOTHING_LABEL = 'Nothing follows for sure.';
export const MOVE_TAGS: Record<Move, string> = { mp: 'move-if', mt: 'move-not-then', ac: 'trap-then', da: 'trap-not-if' };
const litId = (l: Lit) => ({ P: 'p', notP: 'np', Q: 'q', notQ: 'nq' })[l];

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
  const got = follows(fact);
  const answer = got ? litId(got) : NOTHING;
  const maybe = 'That might be true, but it does not have to be.';
  const whyWrong: Record<string, string> = {};
  let explain: string;
  if (got && fact === 'P') {
    explain = `You know the IF part happened. So the THEN part must happen too. ${sentence(f(got))}`;
    whyWrong[litId(neg(got))] = 'That can’t be true. The IF part happened, so the THEN part must happen too.';
    whyWrong[NOTHING] = 'Something does follow. The IF part happened, so the THEN part must happen too.';
  } else if (got) {
    explain = `The THEN part did not happen. If the IF part had happened, the rule would be broken. So ${mid(f(got))}.`;
    whyWrong[litId(neg(got))] = 'That can’t be true. Then the IF part would happen without the THEN part, and that breaks the rule.';
    whyWrong[NOTHING] = `Something does follow. If the IF part had happened, the THEN part would have happened too. It did not, so ${mid(f(got))}.`;
  } else if (partOf(fact) === 'q') {
    const other = rng.pick(skin.otherWays)(name);
    explain = `${cap(skin.mayP(name))}. But ${other}. So nothing follows for sure.`;
    whyWrong[litId('P')] = `${maybe} ${cap(other)}.`;
    whyWrong[litId('notP')] = `${maybe} ${cap(skin.mayP(name))}.`;
  } else {
    const [yes, no] = skin.noIf(name);
    explain = `${skin.onlyAbout} ${cap(yes)}. Or ${no}. So nothing follows for sure.`;
    whyWrong[litId('Q')] = `${maybe} ${cap(no)}.`;
    whyWrong[litId('notQ')] = `${maybe} ${cap(yes)}.`;
  }
  const item: CondCore = {
    kind: 'choose',
    prompt: `${sentence(f(fact))} What follows for sure?`,
    scene: ruleScene(opts.skin, true),
    choices,
    answer,
    explain,
    whyWrong,
    hint: 'Is the fact about the IF part or the THEN part? Did that part happen?',
  };
  if (!got) item.conflict = true;
  return { tag: MOVE_TAGS[opts.move], item, meta: { skin: opts.skin, name, fact, move: opts.move } };
}

type Rewrite = 'contra' | 'converse' | 'inverse';
export const REWRITES: Record<Rewrite, Cond> = { contra: CONTRA, converse: CONVERSE, inverse: INVERSE };

/** "It only flips the rule." for the flip-only and NOT-only rewrites, else ''. */
function mistakeName(c: Cond): string {
  if (sameCond(c, CONVERSE)) return 'It only flips the rule.';
  if (sameCond(c, INVERSE)) return 'It only puts NOT in both parts.';
  return '';
}

/** A case that one sentence keeps and the other breaks, and which one it breaks. */
export function telltaleRow(c: Cond): { row: Row; breaks: 'sentence' | 'rule' } | null {
  const a = ROWS.find((r) => !condHolds(c, r) && ruleHolds(r));
  if (a) return { row: a, breaks: 'sentence' };
  const b = ROWS.find((r) => condHolds(c, r) && !ruleHolds(r));
  return b ? { row: b, breaks: 'rule' } : null;
}

/** Why a rewrite does not mean the same as the rule, from the case where they differ. */
function differs(skin: Skin, c: Cond): string {
  const t = telltaleRow(c);
  if (!t) throw new Error('differs: this sentence means the same as the rule');
  const k = cap(skin.kase[rowKey(t.row)]);
  const body = t.breaks === 'sentence' ? `${k} breaks that sentence. It does not break the rule.` : `${k} breaks the rule. It does not break that sentence.`;
  return `${mistakeName(c)} ${body} So they do not mean the same.`.trim();
}

/** Why flip and NOT means the same as the rule: the same one case breaks both. */
function matches(skin: Skin, c: Cond): string {
  const broken = brokenRows(c);
  if (!sameMeaning(c, RULE) || broken.length !== 1) throw new Error('matches: this sentence does not mean the same as the rule');
  return `It flips the rule and puts NOT in both parts. Only ${skin.kase[rowKey(broken[0])]} breaks it, just like the rule. So they mean the same.`;
}

/** Lesson 4: "Which sentence means the same as the rule?" Exactly one choice matches the rule in all four cases. */
export function samePickItem(rng: Rng, opts: { skin: SkinId; extra?: boolean }): CondMade {
  const skin = SKINS[opts.skin];
  const conds: Cond[] = [CONTRA, CONVERSE, INVERSE];
  if (opts.extra ?? rng.chance(0.5)) conds.push(rng.pick(ODD_REWRITES));
  const order = rng.shuffle(conds);
  const choices = order.map((c, i) => ({ id: `s${i + 1}`, label: condText(opts.skin, c) }));
  const right = order.map((c, i) => (sameMeaning(c, RULE) ? i : -1)).filter((i) => i >= 0);
  if (right.length !== 1) throw new Error('samePickItem: exactly one choice must mean the same as the rule');
  const whyWrong: Record<string, string> = {};
  order.forEach((c, i) => {
    if (i !== right[0]) whyWrong[choices[i].id] = differs(skin, c);
  });
  const item: CondCore = {
    kind: 'choose',
    prompt: 'Which sentence means the same as the rule?',
    scene: ruleScene(opts.skin),
    choices,
    answer: choices[right[0]].id,
    explain: matches(skin, order[right[0]]).replace(/^It /, 'The right one '),
    whyWrong,
    hint: 'Think of a case that breaks one sentence. Does it break the rule too?',
  };
  return { tag: 'same-pick', item, meta: { skin: opts.skin, name: '', conds: Object.fromEntries(order.map((c, i) => [choices[i].id, c])) } };
}

/** Lesson 4: "Does this sentence mean the same as the rule?" Flip only and NOT only are traps. */
export function sameYesNoItem(rng: Rng, opts: { skin: SkinId; rewrite?: Rewrite }): CondMade {
  const skin = SKINS[opts.skin];
  const key = opts.rewrite ?? rng.pick(['contra', 'converse', 'inverse'] as const);
  const c = REWRITES[key];
  const isSame = sameMeaning(c, RULE);
  const explain = isSame ? matches(skin, c) : differs(skin, c);
  const item: CondCore = {
    kind: 'choose',
    prompt: `Does this sentence mean the same as the rule? “${condText(opts.skin, c)}”`,
    scene: ruleScene(opts.skin),
    choices: YES_NO,
    answer: isSame ? 'yes' : 'no',
    explain,
    whyWrong: isSame ? { no: explain } : { yes: explain },
    hint: 'Try a case that breaks the rule. Does it break this sentence too? Then try the other cases.',
  };
  if (!isSame) item.conflict = true;
  return { tag: 'same-yesno', item, meta: { skin: opts.skin, name: '', conds: { one: c } } };
}

/** The card ids of a rule checker. */
export const CARD_IDS: Record<Lit, string> = { P: 'p', notP: 'np', Q: 'q', notQ: 'nq' };

/** Tips for the rule checker: why a card must be turned, or why it can't break the rule. */
function cardTip(skin: Skin, face: Lit, sym: Symbols): string {
  const cards = skin.cards!;
  const name = `The card that shows “${cards.face(face, sym)}”`;
  const back = breakingBack(face);
  if (back) {
    const too = face === 'notQ' ? '. Many people miss this card.' : '.';
    return `${name} could have ${cards.back(back, sym)} on the back. That would break the rule${too}`;
  }
  if (face === 'Q') return `${name} is the trap. Even with ${cards.back('P', sym)} on the back, the rule is kept.`;
  return `${name} can’t break the rule. ${skin.onlyAbout}`;
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
  const item: CondCore = {
    kind: 'multi',
    prompt: `${cards.intro} ${cards.ask}`,
    scene: ruleScene(opts.skin),
    choices,
    answer: turn.map((l) => CARD_IDS[l]),
    explain: `Only the cards that show ${q(a)} and ${q(b)} could hide a broken rule. The card that shows ${q(trap)} is the trap. Even with ${cards.back('P', sym)} on the back, the rule is kept.`,
    pickTips,
    missTips,
    hint: 'For each card, ask what could be on the back. Could that break the rule?',
    conflict: true,
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
  const tip = cardTip(skin, face, sym);
  const item: CondCore = {
    kind: 'choose',
    prompt: `${cards.intro} One card shows “${cards.face(face, sym)}.” Must you turn it over to check the rule?`,
    scene: ruleScene(opts.skin),
    choices: YES_NO,
    answer: turn ? 'yes' : 'no',
    explain: tip,
    whyWrong: turn ? { no: tip } : { yes: tip },
    hint: 'What could be on the back of this card? Could any of those break the rule?',
  };
  if (face === 'Q' || face === 'notQ') item.conflict = true;
  return { tag: 'checker-card', item, meta: { skin: opts.skin, name: '', faces: { one: face }, sym } };
}

