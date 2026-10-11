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
import { YES_NO as BOX_MARKS } from '../drill';
import { syncWhyWrong } from '../teach';
import type { Choice, ChoiceFeedback, ChooseItem, ConfusedQuestion, ContrastPanel, Distinction, DrillMark, DrillOption, DrillRow, DrillStep, Misconception, MultiItem, Rng, Scene, Teach, TeachCase, Truth } from '../types';

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
  /**
   * The line that says the rule is always true here (lessons 2 and 3): “Always true here: nobody breaks this rule.” It
   * names who could break it in this story, so the frame stays on screen next to the rule.
   */
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
    /** The frame line on the rule card in lesson 5: here a break may be there. “Here a kid may have broken the rule. Find out.” */
    check: string;
    face(l: Lit, sym: Symbols): string;
    /** What a hidden side could be: 'a vowel', '“Dessert”'. */
    back(l: Lit, sym: Symbols): string;
  };
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** The key line on every P and Q rule card: what the letters stand for, and what “P is true” means. */
export const PQ_KEY = 'P is the IF part. Q is the THEN part. “P is true” means the IF part happened.';
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
function wordCards(intro: string, ask: string, faces: Record<Lit, string>, who = 'a kid'): NonNullable<Skin['cards']> {
  return { intro, ask, check: `Here ${who} may have broken the rule. Find out.`, face: (l) => faces[l], back: (l) => `“${faces[l]}”` };
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
    kept: 'Always true here: nobody breaks this rule.',
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
    kept: 'Always true here: nobody breaks this rule.',
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
    kept: 'Always true here: Dad never breaks this rule.',
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
      'Dad',
    ),
  },
  umbrella: {
    id: 'umbrella',
    group: 'everyday',
    names: KIDS,
    setting: 'Here is a rule for walking to school.',
    kept: 'Always true here: nobody breaks this rule.',
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
    kept: 'Always true here: no day breaks this rule.',
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
    kept: 'Always true here: no animal breaks this rule.',
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
    kept: 'Always true here: no dragon breaks this rule.',
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
      'a dragon',
    ),
  },
  wizards: {
    id: 'wizards',
    group: 'fantasy',
    names: WIZARDS,
    setting: 'Wizard school has a rule.',
    kept: 'Always true here: no wizard breaks this rule.',
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
      'a wizard',
    ),
  },
  potions: {
    id: 'potions',
    group: 'fantasy',
    names: WIZARDS,
    setting: 'The magic shop sells green potions.',
    kept: 'Always true here: nobody breaks this rule.',
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
    kept: 'Always true here: no card breaks this rule.',
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
      check: 'Here a card may break the rule. Find out.',
      face: (l, s) => ({ P: s.vowel, notP: s.consonant, Q: s.even, notQ: s.odd })[l],
      back: (l) => ({ P: 'a vowel', notP: 'a letter that is not a vowel', Q: 'an even number', notQ: 'an odd number' })[l],
    },
  },
  pq: {
    id: 'pq',
    group: 'abstract',
    names: [''],
    setting: 'P and Q stand for any two sentences.',
    // The key line: a letter stands for a part, and “P is true” is that part's truth in a case.
    note: PQ_KEY,
    kept: 'Always true here: no case breaks this rule.',
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

/**
 * What a lesson assumes about its rule, said on the rule card so it never has to be held in mind:
 *  - 'free' (lesson 1): kids can break the rule; no frame line (a break is a real kid);
 *  - 'kept' (lessons 2 and 3): the rule is always true here, so the case that would break it can't happen;
 *  - 'compare' (lesson 4): no sentence is taken as true; every case is tested against each sentence;
 *  - 'check' (lesson 5): a break may be there, and the checker finds out.
 */
export type Frame = 'free' | 'kept' | 'compare' | 'check';

/** The lesson 4 frame line. */
export const COMPARE_LINE = 'Here we only compare sentences. Any case can be tested.';

/** The rule card: the setting, the rule, a note, then the lesson's frame line (true means 'kept'). */
export function ruleScene(skin: SkinId, frame: Frame | boolean = false): Scene {
  const f: Frame = frame === true ? 'kept' : frame === false ? 'free' : frame;
  const s = SKINS[skin];
  const lines = [s.setting, ruleText(skin)];
  if (s.note) lines.push(s.note);
  if (f === 'kept') lines.push(s.kept);
  if (f === 'compare') lines.push(COMPARE_LINE);
  if (f === 'check') {
    if (!s.cards) throw new Error(`ruleScene: ${skin} has no rule checker`);
    lines.push(s.cards.check);
  }
  return { kind: 'text', lines };
}

/**
 * Can this case happen in the story? Where kids can break the rule (alwaysTrue false), every case can happen, the break
 * too: it is a real kid. Where the rule is always true, the case that would break it can't happen.
 */
export const canHappen = (r: Row, alwaysTrue: boolean) => !alwaysTrue || ruleHolds(r);

/** All four cases of a rule as a grid: ✓ keeps the rule, ✗ breaks it (lesson 1 worked example). */
export function ruleGrid(skin: SkinId): Scene {
  const f = SKINS[skin].cards;
  if (!f) throw new Error(`ruleGrid: ${skin} has no cards`);
  const face = (l: Lit) => f.face(l, CLASSIC);
  const rows: Choice[] = [{ id: 'P', label: face('P') }, { id: 'notP', label: face('notP') }];
  const cols: Choice[] = [{ id: 'Q', label: face('Q') }, { id: 'notQ', label: face('notQ') }];
  const marks: Record<string, Record<string, 'yes' | 'no'>> = {};
  const labels: Record<string, Record<string, string>> = {};
  const breaks: string[] = [];
  for (const r of rows) {
    marks[r.id] = {};
    for (const c of cols) {
      const row = ROWS.find((x) => litHolds(r.id as Lit, x) && litHolds(c.id as Lit, x))!;
      marks[r.id][c.id] = ruleHolds(row) ? 'yes' : 'no';
      if (!ruleHolds(row)) {
        breaks.push(`“${r.label}” with “${c.label}.”`);
        labels[r.id] = { [c.id]: 'the break' };
      }
    }
  }
  if (breaks.length !== 1) throw new Error('ruleGrid: exactly one box breaks the rule');
  // The one ✗ is labelled "the break" inside its box, and named by its row and column in the caption.
  return { kind: 'grid', rows, cols, marks, labels, caption: `✓ means the rule is kept. The one ✗ is the break: ${breaks[0]}` };
}

/** The column names of the lesson 4 grids: the rule and its three rewrites. */
export const SENTENCE_COLUMNS: readonly [string, string, Cond][] = [
  ['rule', 'The rule', RULE],
  ['contra', 'Flip and NOT', CONTRA],
  ['converse', 'Flip only', CONVERSE],
  ['inverse', 'NOT only', INVERSE],
];

/** The rule and its three rewrites, case by case (lesson 4 worked example). */
export function meaningGrid(skin: SkinId): Scene {
  const s = SKINS[skin];
  const rows: Choice[] = ROWS.map((r) => ({ id: rowKey(r), label: cap(s.kase[rowKey(r)]) }));
  const sentences = SENTENCE_COLUMNS;
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

/** On a P and Q case card the parts carry their letters: “The IF part (P): true”. */
export const IF_WHO_PQ = 'The IF part (P)';
export const THEN_WHO_PQ = 'The THEN part (Q)';

/** Is the IF part true, is the THEN part true, is the rule true (kept) in this case? P and Q cards name the letters too. */
export const partTruths = (r: Row, skin?: SkinId): Truth[] => [
  { who: skin === 'pq' ? IF_WHO_PQ : IF_WHO, value: litHolds('P', r) },
  { who: skin === 'pq' ? THEN_WHO_PQ : THEN_WHO, value: litHolds('Q', r) },
  { who: RULE_WHO, value: ruleHolds(r) },
];

/** A case read back from its IF and THEN lines, or null when it has none. */
export function rowOfCase(c: TeachCase | undefined): Row | null {
  const p = c?.truths?.find((t) => t.who === IF_WHO || t.who === IF_WHO_PQ)?.value;
  const q = c?.truths?.find((t) => t.who === THEN_WHO || t.who === THEN_WHO_PQ)?.value;
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
/** Lessons 2 and 3: a wrong answer that keeps the case that would break the rule hears the always-true line. */
const CANT_HAPPEN_HERE = 'Here the rule is always true, so that case can’t happen.';
const crossedOut = (skin: Skin) => `${cap(skin.kase.TF)} would break the rule. ${CANT_HAPPEN_HERE}`;
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
/** Tags a question carries for a lesson's pass rule (LessonPass.include): 'pq' on a P and Q question. */
const skinTags = (skin: SkinId): string[] => (skin === 'pq' ? ['pq'] : []);
/** A P and Q question in lesson 1 or 4: “I’m confused” about the letters, and its board to think on (never checked). */
const pqHelp = (skin: SkinId, scratch: () => DrillStep, label: string) =>
  skin === 'pq' ? { confused: pqConfused(), scratch: scratch(), scratchLabel: label } : {};
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
      .map((c) => ({ label: sentence(c.says), truths: partTruths(c.row, skinId), note: `${rowNote(c.row)}${c.asked ? ' This is the case in the question.' : ''}` })),
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
      example: { label: sentence(l1.says(c)), truths: partTruths(c.row, opts.skin), note: rowNote(c.row) },
      simpler: rowSteps(skin, l1.says(c), c.row),
    };
  }
  // The hint checks one case that keeps the rule (the first in the list), never the answer.
  const shown = cases.find((c) => ruleHolds(c.row))!;
  const item: ChooseCore = {
    kind: 'choose',
    prompt: l1.ask,
    scene: ruleScene(opts.skin),
    choices,
    answer: rowId(broken[0].row),
    explain: `${sentence(l1.says(broken[0]))} ${IF_ONLY_WAY}`,
    feedback,
    hint: 'Here is one case, checked for you. Check the others the same way.',
    hintCase: { label: sentence(l1.says(shown)), truths: partTruths(shown.row, opts.skin), note: rowNote(shown.row) },
    teach: l1Teach(skin, opts.skin, cases.map((c) => ({ says: l1.says(c), row: c.row }))),
    tags: skinTags(opts.skin),
    ...pqHelp(opts.skin, pqBoxScratch, 'the four boxes'),
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
  const example: TeachCase = { label: sentence(says), truths: partTruths(row, opts.skin), note: rowNote(row) };
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
  // The hint checks another case in the same story: the same IF part, the other THEN part. Never the asked case.
  const near = cases.find((c) => rowKey(c.row) === rowKey(rowAt(row.p, !row.q)))!;
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${sentence(says)} ${l1.did(name)}`,
    scene: ruleScene(opts.skin),
    choices: YES_NO,
    answer: broke ? 'yes' : 'no',
    explain: caseReason(skin, row),
    feedback: { [broke ? 'no' : 'yes']: fb },
    hint: 'Here is a case like this one, checked for you. Check this one the same way.',
    hintCase: { label: sentence(near.says), truths: partTruths(near.row, opts.skin), note: rowNote(near.row) },
    teach: l1Teach(skin, opts.skin, cases),
    tags: skinTags(opts.skin),
    ...pqHelp(opts.skin, pqBoxScratch, 'the four boxes'),
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
    truths: [...partTruths(r, opts.skin), { who: SENTENCE_WHO, value: litHolds(target, r) }],
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
      detail: [factLine, crossedOut(skin), `The rule says the THEN part must happen too. So ${mid(f(got))}.`, target === got ? 'That is just what the sentence says. So it is true for sure.' : `So ${sure}.`],
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
    hint: 'Here is one case that fits the fact, checked for you. Check the other case the same way.',
    // Forward: the case that breaks the rule. Backward: the case where the IF part happened too. Either way, one
    // case that fits the fact, marked; the learner checks the other one.
    hintCase: kase(fact === 'P' ? rowAt(true, false) : rowAt(true, true)),
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
    tags: skinTags(opts.skin),
    confused: keptConfused(opts.skin, opts.skin === 'pq'),
    scratch: factScratch(opts.skin, name, fact, [target]),
    scratchLabel: 'the case board',
  };
  syncWhyWrong(item);
  if (fact === 'Q') item.conflict = true;
  return { tag: fact === 'Q' ? 'backward' : 'forward', item, meta: { skin: opts.skin, name, fact, target } };
}

export const NOTHING = 'nothing';
export const NOTHING_LABEL = 'Nothing follows for sure.';
export const MOVE_TAGS: Record<Move, string> = { mp: 'move-if', mt: 'move-not-then', ac: 'trap-then', da: 'trap-not-if' };
const litId = (l: Lit) => ({ P: 'p', notP: 'np', Q: 'q', notQ: 'nq' })[l];
/**
 * The case a lesson 3 hint shows, marked: one of the two cases that fit the fact, never the one the answer stands
 * on. When something follows, it is the case that breaks the rule; when nothing follows, either case can happen,
 * and the hint shows the one that tempts (the IF part happened too, or the THEN part did not happen either).
 */
const MOVE_HINT_ROW: Record<Move, Row> = { mp: rowAt(true, false), mt: rowAt(true, false), ac: rowAt(true, true), da: rowAt(false, false) };
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
    truths: [...partTruths(r, opts.skin), ...(pick ? [{ who: ANSWER_WHO, value: litHolds(pick, r) }] : [])],
    note: possibleNote(r, why(r)),
  });
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of choices) {
    if (c.id === answer) continue;
    if (c.id === NOTHING) {
      // Something follows: the one other case that fits the fact breaks the rule.
      feedback[NOTHING] =
        fact === 'P'
          ? { headline: '“Nothing follows for sure” misses that the IF part happened.', detail: [factLine, crossedOut(skin), 'When the IF part happens, the THEN part must happen too.', `So ${mid(f(got!))}. That follows for sure.`], example: kase(tf) }
          : { headline: '“Nothing follows for sure” misses that the IF part can’t have happened.', detail: [factLine, `Imagine ${mid(f('P'))}. That would be ${skin.kase.TF}, and that breaks the rule.`, CANT_HAPPEN_HERE, `So ${mid(f(got!))}. That follows for sure.`], example: kase(tf) };
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
    hint: 'Here is one case that fits the fact, checked for you. Check the other case the same way.',
    hintCase: kase(MOVE_HINT_ROW[opts.move]),
    teach: {
      rule: moveRule(fact),
      terms: [...partTerms(opts.skin), NOTHING_TERM],
      meaning: `${ruleMeaning(skin)} ${NEVER_BROKEN}`,
      casesTitle: `What could be true when ${mid(f(fact))}?`,
      cases: ROWS.filter((r) => litHolds(fact, r)).map((r) => kase(r)),
      remember: [MOVE_REMEMBER[opts.move], 'Ask: “Which cases fit the fact and keep the rule?”'],
      simpler,
    },
    tags: skinTags(opts.skin),
    confused: keptConfused(opts.skin, opts.skin === 'pq'),
    scratch: factScratch(opts.skin, name, fact, [pos]),
    scratchLabel: 'the case board',
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
  // The hint checks one wrong choice (the first in the list) in the case that tells it apart from the rule.
  const off = order.find((c) => !sameMeaning(c, RULE))!;
  const offRow = telltaleRow(off)!.row;
  const item: ChooseCore = {
    kind: 'choose',
    prompt: 'Which sentence means the same as the rule? Two sentences mean the same when the same cases break them.',
    scene: ruleScene(opts.skin, 'compare'),
    choices,
    answer: condId(right[0]),
    explain: matches(skin, right[0]).replace(/^It /, 'The right one '),
    feedback,
    hint: `Here is one sentence, checked for you: “${condText(opts.skin, off)}” Check the others the same way.`,
    hintCase: {
      label: sentence(cap(skin.kase[rowKey(offRow)])),
      truths: [{ who: RULE_WHO, value: ruleHolds(offRow) }, { who: THIS_WHO, value: condHolds(off, offRow) }],
      note: `${apartLine(offRow, off, 'this sentence')} So this sentence does not mean the same as the rule.`,
    },
    // The cases show the rule and flip and NOT side by side; the simpler example is the flip-only trap.
    teach: sameTeach(opts.skin, CONTRA, CONTRA_WHO, 'the flip and NOT sentence', 'Which cases break the rule? Which break the flip and NOT sentence?', CONVERSE, true),
    tags: skinTags(opts.skin),
    ...pqHelp(opts.skin, () => pqMeaningScratch(['contra', 'converse', 'inverse']), 'the case grid'),
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
    scene: ruleScene(opts.skin, 'compare'),
    choices: YES_NO,
    answer: isSame ? 'yes' : 'no',
    explain,
    feedback: { [isSame ? 'no' : 'yes']: fb },
    hint: 'Here is one case, checked for you. Check the other three cases the same way.',
    // A case that keeps the rule and every rewrite, so the hint shows how to mark a case without giving the answer.
    hintCase: {
      label: sentence(cap(skin.kase.TT)),
      truths: [{ who: RULE_WHO, value: ruleHolds(rowAt(true, true)) }, { who: THIS_WHO, value: condHolds(c, rowAt(true, true)) }],
      note: 'This case keeps the rule and this sentence. Now check the other three cases.',
    },
    teach: sameTeach(opts.skin, c, THIS_WHO, 'this sentence', 'Which cases break the rule? Which break this sentence?', c),
    tags: skinTags(opts.skin),
    ...pqHelp(opts.skin, () => pqMeaningScratch([key]), 'the case grid'),
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

/** One card for a hint, marked back by back (is the rule kept with each back?), then whether you must turn it over. */
export function cardHintCase(skin: Skin, face: Lit, sym: Symbols): TeachCase {
  const cards = skin.cards!;
  return {
    label: `The card that shows “${cards.face(face, sym)}.”`,
    truths: [
      ...otherPart(face).map((b) => ({ who: `The rule with ${cards.back(b, sym)} on the back`, value: ruleHolds(cardRow(face, b)) })),
      { who: TURN_WHO, value: mustTurn(face) },
    ],
    note: cardNote(skin, face, sym),
  };
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
    scene: ruleScene(opts.skin, 'check'),
    choices,
    answer: turn.map((l) => CARD_IDS[l]),
    explain: `Only the cards that show ${q(a)} and ${q(b)} could hide a broken rule. The card that shows ${q(trap)} is the trap. Even with ${cards.back('P', sym)} on the back, the rule is kept.`,
    pickTips,
    missTips,
    hint: 'Here is one card, checked for you. Check the other cards the same way.',
    // The IF part did not happen on this card: not a card to turn, so the hint never gives the answer away.
    hintCase: cardHintCase(skin, 'notP', sym),
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
    scene: ruleScene(opts.skin, 'check'),
    choices: YES_NO,
    answer: turn ? 'yes' : 'no',
    explain,
    feedback: { [turn ? 'no' : 'yes']: fb },
    hint: 'Here is another card, checked for you. Check this card the same way.',
    // Another card, never the one asked about: the IF card, or the NOT IF card when the IF card is asked.
    hintCase: cardHintCase(skin, face === 'P' ? 'notP' : 'P', sym),
    teach: cardTeach(skin, opts.skin, otherPart(face).map(backCase), `What could be on the back of the card that shows ${shown}?`, cardSteps(skin, face, sym)),
  };
  syncWhyWrong(item);
  if (face === 'Q' || face === 'notQ') item.conflict = true;
  return { tag: 'checker-card', item, meta: { skin: opts.skin, name: '', faces: { one: face }, sym } };
}

// ---------- the Do step: guided boards ----------
//
// Every lesson's Do board is built here, so every mark comes from the truth table and none is written by hand:
//  - lesson 1: a box of the four boxes is ✓ when ruleHolds() keeps its case;
//  - lessons 2 and 3: a case that fits a fact can happen when it keeps the rule, and a sentence is true in it when
//    litHolds() says so; what the board settles comes from statusOf() and follows();
//  - lesson 4: a sentence's box is ✓ when condHolds() keeps that sentence in that case;
//  - lesson 5: a back keeps or breaks the rule by ruleHolds(cardRow()), and a card must be turned (mustTurn) when
//    some back breaks it.
// Every message for a wrong mark names the case (or the card and its back) and what is true there.

/** What a board says (its id, title and instructions), apart from the marks the engine works out. */
export interface BoardText {
  id: string;
  title: string;
  body: string[];
  /** A twin board: what changed from the worked example's board. */
  twin?: string;
}

const TRUE_FALSE: DrillOption[] = [{ id: 'true', label: 'True' }, { id: 'false', label: 'False' }];
const KEPT_BROKEN: DrillOption[] = [{ id: 'holds', label: 'Kept' }, { id: 'crashes', label: 'Broken' }];
/** A grid box (✓ / ✗), or a yes / no mark on a row. */
const yesNo = (): DrillOption[] => BOX_MARKS.map((o) => ({ id: o.id, label: o.label }));
const tfId = (v: boolean) => (v ? 'true' : 'false');
const ynId = (v: boolean) => (v ? 'yes' : 'no');
const twinOf = (t: BoardText) => (t.twin ? { twin: t.twin } : {});

// ----- lesson 1: the four boxes -----

/** The words of one rule's four boxes: its rule card, a name for each fact, and each case as a noun phrase. */
export interface BoxWords {
  /** The rule card: the setting, then the rule. */
  lines: string[];
  /** Row and column names: "Dessert", "Left some veggies". */
  face: Record<Lit, string>;
  kase: Record<RowKey, string>;
  onlyAbout: string;
}

/** A skin's four boxes, named by its card faces (the names on ruleGrid, the worked example). */
export function boxWords(skin: SkinId): BoxWords {
  const s = SKINS[skin];
  const cards = s.cards;
  if (!cards) throw new Error(`boxWords: ${skin} has no cards`);
  const scene = ruleScene(skin);
  return {
    lines: scene.kind === 'text' ? scene.lines : [],
    face: { P: cards.face('P', CLASSIC), notP: cards.face('notP', CLASSIC), Q: cards.face('Q', CLASSIC), notQ: cards.face('notQ', CLASSIC) },
    kase: s.kase,
    onlyAbout: s.onlyAbout,
  };
}

/**
 * The skill-drill handoff's sample rule for the four boxes: a red card and a hat. It is drawn only on a guided board
 * (a twin of the lunchroom boxes), never in a quiz, so it is not one of the skins.
 */
export const HAT_BOXES: BoxWords = {
  lines: ['Each kid in the game holds a red card or a blue card.', 'If a kid is holding a red card, then they are wearing a hat.'],
  face: { P: 'Red card', notP: 'Blue card', Q: 'Hat', notQ: 'No hat' },
  kase: { TT: 'a kid with a red card and a hat', TF: 'a kid with a red card and no hat', FT: 'a kid with a blue card and a hat', FF: 'a kid with a blue card and no hat' },
  onlyAbout: 'The rule only talks about kids holding a red card.',
};

/**
 * The pet rule's four boxes (lesson 2: marked by hand before the rule is turned around). The pet skin has no
 * rule-checker cards, so its row and column names are written here. The rule card, the cases and every box's mark
 * come from the skin and fourBoxDrill, as for the other boards. Lesson 2's rules are always true, so its rule card
 * says so (“Always true here: …”), on this board and on the card it belongs to.
 */
export const PET_BOXES: BoxWords = (() => {
  const scene = ruleScene('pets', 'kept');
  return {
    lines: scene.kind === 'text' ? [...scene.lines] : [],
    face: { P: 'Dog', notP: 'Not a dog', Q: 'Four legs', notQ: 'Not four legs' },
    kase: SKINS.pets.kase,
    onlyAbout: SKINS.pets.onlyAbout,
  };
})();

/** The rule card above a four-box board. */
export const boxScene = (w: BoxWords): Scene => ({ kind: 'text', lines: [...w.lines] });

/** Why one box keeps or breaks the rule: said when the learner marks it the other way. */
function boxWhy(w: BoxWords, r: Row): string {
  const is = `This box is for ${w.kase[rowKey(r)]}.`;
  if (!ruleHolds(r)) return `${is} The IF part happened, but the THEN part did not. That is the break, so this box gets the ✗, not a ✓.`;
  if (r.p) return `${is} The IF part and the THEN part both happened. That keeps the rule, so this box gets a ✓, not a ✗.`;
  return `${is} The IF part did not happen. ${w.onlyAbout} So this box keeps the rule. It gets a ✓, not a ✗.`;
}

/**
 * Lesson 1: the four boxes of one rule, empty. Rows are the IF part and NOT the IF part, columns the THEN part and NOT
 * the THEN part, as on the worked example's grid. The learner marks every box: ✓ keeps the rule, ✗ breaks it.
 */
export function fourBoxDrill(w: BoxWords, t: BoardText): DrillStep {
  const cols: Lit[] = ['Q', 'notQ'];
  const rows: DrillRow[] = (['P', 'notP'] as const).map((rl) => ({
    id: rl,
    label: w.face[rl],
    marks: cols.map((cl): DrillMark => {
      const r = ROWS.find((x) => litHolds(rl, x) && litHolds(cl, x))!;
      const kept = ruleHolds(r);
      return { id: `${rl}-${cl}`, label: w.face[cl], options: yesNo(), answer: ynId(kept), why: { [ynId(!kept)]: boxWhy(w, r) } };
    }),
  }));
  const broken = brokenRows(RULE);
  if (broken.length !== 1) throw new Error('fourBoxDrill: exactly one box breaks the rule');
  const b = broken[0];
  return {
    id: t.id,
    title: t.title,
    body: t.body,
    scene: boxScene(w),
    ...twinOf(t),
    rows,
    columns: cols.map((c) => w.face[c]),
    caption: '✓ keeps the rule. ✗ breaks it.',
    done: `Right. Only one box breaks the rule: “${w.face[litOf('p', b.p)]}” with “${w.face[litOf('q', b.q)]}.” That is the break. The other three boxes keep the rule.`,
  };
}

/**
 * The four boxes with letters for the parts (lesson 1, after “Letters for the parts”): rows “P is true” and “P is false”,
 * columns “Q is true” and “Q is false”. The rule card carries the key line (PQ_KEY).
 */
export const PQ_BOXES: BoxWords = (() => {
  const scene = ruleScene('pq');
  const s = SKINS.pq;
  return {
    lines: scene.kind === 'text' ? [...scene.lines] : [],
    face: { P: s.fact('P', ''), notP: s.fact('notP', ''), Q: s.fact('Q', ''), notQ: s.fact('notQ', '') },
    kase: s.kase,
    onlyAbout: s.onlyAbout,
  };
})();

/** A P and Q item's thinking board: the four boxes with letters, to mark if it helps (never checked). */
export function pqBoxScratch(): DrillStep {
  const board = fourBoxDrill(PQ_BOXES, {
    id: 'scratch',
    title: 'Your four boxes',
    body: [`The rule: “${ruleText('pq')}” ${PQ_KEY}`, 'Mark the boxes if it helps. Nothing here is checked.'],
  });
  return { ...board, done: '', words: { closing: LETTERS_CLOSING } };
}

/** Can this box's case happen, when the rule is always true? Said when the learner marks it the other way. */
function canBoxWhy(w: BoxWords, r: Row): string {
  const is = `This box is for ${w.kase[rowKey(r)]}.`;
  const tail = canHappen(r, true) ? 'It gets a check, not a cross.' : 'It gets a cross, not a check.';
  if (!ruleHolds(r)) return `${is} That case would break the rule. Here the rule is always true, so it can’t happen. ${tail}`;
  if (r.p) return `${is} The IF part and the THEN part both happened. That keeps the rule, so it can happen. ${tail}`;
  return `${is} The IF part did not happen. ${w.onlyAbout} So this case keeps the rule, and it can happen. ${tail}`;
}

/**
 * Lesson 2, right after the contrast card: the same four boxes, now marked can happen (a check) or can’t happen (a
 * cross), with the rule always true here. Only the box that would break the rule can’t happen. Every mark comes from
 * canHappen(), and the board names the distinction it exercises (BROKEN_VS_CANT).
 */
export function canBoxDrill(skin: SkinId, w: BoxWords, t: BoardText): DrillStep {
  const cols: Lit[] = ['Q', 'notQ'];
  const cell = (rl: Lit, cl: Lit) => ROWS.find((x) => litHolds(rl, x) && litHolds(cl, x))!;
  const rows: DrillRow[] = (['P', 'notP'] as const).map((rl) => ({
    id: rl,
    label: w.face[rl],
    marks: cols.map((cl): DrillMark => {
      const r = cell(rl, cl);
      const can = canHappen(r, true);
      return { id: `${rl}-${cl}`, label: w.face[cl], options: yesNo(), answer: ynId(can), why: { [ynId(!can)]: canBoxWhy(w, r) } };
    }),
  }));
  const cant = ROWS.filter((r) => !canHappen(r, true));
  if (cant.length !== 1) throw new Error('canBoxDrill: exactly one case can’t happen');
  const mixes = (['P', 'notP'] as const).flatMap((rl) => cols.map((cl) => {
    const r = cell(rl, cl);
    return canMix(w.onlyAbout, `${rl}-${cl}`, r, `Think of ${w.kase[rowKey(r)]}.`);
  }));
  return {
    id: t.id,
    title: t.title,
    body: t.body,
    scene: boxScene(w),
    ...twinOf(t),
    rows,
    columns: cols.map((c) => w.face[c]),
    caption: 'A check: this case can happen here. A cross: it can’t happen here.',
    done: `Right. Only ${w.kase[rowKey(cant[0])]} can’t happen here. It would break the rule, and here the rule is always true. The other three cases can happen.`,
    distinction: BROKEN_VS_CANT.id,
    misconceptions: breakFirst(mixes),
    confused: keptConfused(skin),
    words: { closing: KEPT_CLOSING },
  };
}

/**
 * Lesson 2's four boxes have the always-true line on their rule card. Two mix-ups that line can bring: the break box
 * marked as kept (“nobody breaks it, so every box keeps it”), and the cat's box marked as a break (the rule read turned
 * around).
 */
export function boxMixes(w: BoxWords): Misconception[] {
  const tf = rowAt(true, false);
  const ft = rowAt(false, true);
  return [
    {
      id: 'break-box-kept',
      when: 'picks',
      picks: { 'P-notQ': ynId(!ruleHolds(tf)) },
      text: `You may be treating “this box would break the rule” and “someone here broke the rule” as the same thing. They are two different things: here that case never happens, but the box still breaks the rule. ${cap(w.kase[rowKey(tf)])} would have the IF part without the THEN part. Mark each box from its two parts.`,
    },
    {
      id: 'turned-around',
      when: 'picks',
      picks: { 'notP-Q': ynId(!ruleHolds(ft)) },
      text: `You may be treating the rule and the rule turned around as the same thing. They are two different things: ${lowerFirst(w.onlyAbout)} Think of ${w.kase[rowKey(ft)]}. It keeps the rule, even though it breaks the rule turned around.`,
    },
  ];
}

// ----- lessons 2 and 3: the cases that fit a fact -----

/** One fact and the cases that fit it, on a lesson 2 or lesson 3 board. */
export interface FactCases {
  /** Who the fact is about: "Rex". */
  name: string;
  fact: Lit;
  /** Sentences about the other part, marked true or false in each case. */
  say: Lit[];
  /** Cases shown already marked (the worked case). Each one fits the fact. */
  shown: Row[];
  /** Cases the learner marks. Each one fits the fact. */
  mark: Row[];
}

/** A way a case without the IF part could happen: "Rex could be a cat with four legs." Empty with the IF part. */
const wayOf = (skin: Skin, name: string, r: Row) => (r.p ? '' : skin.noIf(name)[r.q ? 0 : 1]);

/** Can this case happen, when the rule is always true? Said when the learner marks it the other way. */
function canWhy(skin: Skin, name: string, r: Row): string {
  const says = sentence(skin.says(name, r));
  if (!ruleHolds(r)) return `${says} The IF part happened, but the THEN part did not. That breaks the rule, so this case can’t happen here.`;
  if (r.p) return `${says} The IF part and the THEN part both happened. That keeps the rule, so this case can happen.`;
  const way = `${cap(wayOf(skin, name, r))}.`;
  if (r.q) return `${says} ${way} The THEN part happened without the IF part. That keeps the rule, so this case can happen.`;
  return `${says} ${way} The IF part did not happen, so the rule asks for nothing. This case can happen.`;
}

/** Is a sentence true in this case? Said when the learner marks it the other way. */
function sayWhy(skin: Skin, name: string, t: Lit, r: Row): string {
  const v = litHolds(t, r);
  const there = partOf(t) === 'p' ? litOf('p', r.p) : litOf('q', r.q);
  return `In this case, ${mid(skin.fact(there, name))}. So “${skin.fact(t, name)}” is ${v ? 'true' : 'false'} here, not ${v ? 'false' : 'true'}.`;
}

/** The mark that asks whether a case can happen, in a story where the rule is always true. */
export const CAN_LABEL = 'Can this case happen here?';

/** The need over each case on a lesson 2 or 3 board: the always-true line, and what it means for a case. */
export const keptNeeds = (skin: SkinId) => `${SKINS[skin].kept} So a case that would break it can’t happen.`;

/** One case that fits the fact, as a row: can it happen (does it keep the rule), then each sentence true or false. */
function factCaseRow(skinId: SkinId, f: FactCases, r: Row, given: boolean): DrillRow {
  const skin = SKINS[skinId];
  if (!litHolds(f.fact, r)) throw new Error('factCaseRow: the case must fit the fact');
  const id = `${f.name}-${rowKey(r)}`;
  const g = given ? { given: true } : {};
  const kept = ruleHolds(r);
  const marks: DrillMark[] = [
    { id: `${id}-can`, label: CAN_LABEL, options: yesNo(), answer: ynId(kept), ...g, why: { [ynId(!kept)]: canWhy(skin, f.name, r) } },
    ...f.say.map((t): DrillMark => {
      const v = litHolds(t, r);
      return { id: `${id}-${t}`, label: `“${sentence(skin.fact(t, f.name))}”`, options: TRUE_FALSE, answer: tfId(v), ...g, why: { [tfId(!v)]: sayWhy(skin, f.name, t, r) } };
    }),
  ];
  return { id, label: sentence(skin.says(f.name, r)), marks, note: possibleNote(r, wayOf(skin, f.name, r)), needs: keptNeeds(skinId) };
}

/** What the cases settle: each sentence for sure or not (lesson 2), or what follows for sure (lesson 3). */
function factConclusion(skin: Skin, f: FactCases, how: 'status' | 'follows'): string {
  const n = rowsWith(f.fact).length;
  const got = follows(f.fact);
  if ((n === 1) !== !!got) throw new Error('factConclusion: one case left means something follows');
  if (how === 'follows') {
    return got
      ? `For ${f.name}, only one case can happen, so “${skin.fact(got, f.name)}” follows for sure.`
      : `For ${f.name}, two cases can happen, so nothing follows for sure.`;
  }
  const lines = f.say.map((t) => {
    const s = statusOf(f.fact, t);
    const q = `“${skin.fact(t, f.name)}”`;
    if (s === 'must') return `${q} is true in it, so it is true for sure.`;
    if (s === 'never') return `${q} is false in it, so it is false for sure.`;
    return `${q} is true in one and false in the other, so you can’t tell.`;
  });
  return [n === 1 ? 'Only one case can happen.' : 'Two cases can happen.', ...lines].join(' ');
}

/**
 * Lessons 2 and 3: a rule that is always true, a fact, and the two cases that fit it. Each case is marked: can it
 * happen here, and is each sentence true in it. One case is shown (the worked case); the learner marks the other one.
 * No final answer on the board: the quiz asks it, and the board's last words say what the marks settle. The
 * always-true line sits over each case (DrillRow.needs, on its own), the mix-ups a wrong “can it happen?” mark shows
 * are named (canMix), and “I’m confused” asks the two broken-vs-can't-happen questions.
 */
export function factCasesDrill(skinId: SkinId, t: BoardText, blocks: FactCases[], conclude: 'status' | 'follows', o: { scaffold?: 'full' | 'light' } = {}): DrillStep {
  const skin = SKINS[skinId];
  for (const f of blocks) for (const s of f.say) if (partOf(s) === partOf(f.fact)) throw new Error('factCasesDrill: a sentence must be about the other part');
  const rows = blocks.flatMap((f) => [...f.shown.map((r) => factCaseRow(skinId, f, r, true)), ...f.mark.map((r) => factCaseRow(skinId, f, r, false))]);
  const mixes = breakFirst(blocks.flatMap((f) => f.mark.map((r) => canMix(skin.onlyAbout, `${f.name}-${rowKey(r)}-can`, r, sentence(skin.says(f.name, r))))));
  return {
    id: t.id,
    title: t.title,
    body: t.body,
    scene: ruleScene(skinId, 'kept'),
    ...twinOf(t),
    rows,
    done: `Right. ${blocks.map((f) => factConclusion(skin, f, conclude)).join(' ')}`,
    ...(o.scaffold ? { scaffold: o.scaffold } : {}),
    distinction: BROKEN_VS_CANT.id,
    misconceptions: mixes,
    confused: keptConfused(skinId, skinId === 'pq'),
    words: { needs: '', closing: KEPT_CLOSING },
  };
}

/** The cases that fit a fact, in table order. */
const casesOf = (fact: Lit) => ROWS.filter((r) => litHolds(fact, r));

/**
 * Lessons 2 and 3, the first quiz (Item.workFirst): the question's own two cases, both the learner's, on the board the
 * lesson taught, with the full scaffold. Its last words never give the answer: the question asks it next.
 */
export function factWork(m: CondMade, id: string): DrillStep {
  const { skin, name, fact } = m.meta;
  if (!fact) throw new Error('factWork: a lesson 2 or 3 item');
  const s = SKINS[skin];
  const say = m.meta.target ? [m.meta.target] : [otherPart(fact)[0]];
  const board = factCasesDrill(
    skin,
    { id, title: 'Mark the cases first', body: [`${sentence(s.fact(fact, name))} ${FACT_LINE[fact]} Two cases fit it.`, 'Mark each case. Can it happen here? Is the sentence true in it?'] },
    [{ name, fact, say, shown: [], mark: casesOf(fact) }],
    m.meta.target ? 'status' : 'follows',
    { scaffold: 'full' },
  );
  return { ...board, done: 'Every case is marked. Now answer the question.' };
}

/** A lesson 2 or 3 question's thinking board: its two cases, to mark if it helps (never checked). */
function factScratch(skin: SkinId, name: string, fact: Lit, say: Lit[]): DrillStep {
  const s = SKINS[skin];
  const board = factCasesDrill(
    skin,
    { id: 'scratch', title: 'Your case board', body: [`The rule: “${ruleText(skin)}” ${s.kept}`, ...(skin === 'pq' ? [PQ_KEY] : []), `${sentence(s.fact(fact, name))} Mark the cases that fit it, if it helps. Nothing here is checked.`] },
    [{ name, fact, say, shown: [], mark: casesOf(fact) }],
    'status',
    { scaffold: 'full' },
  );
  return { ...board, done: '' };
}

// ----- lesson 4: the same cases break them -----

/** A rewrite's name on a board. */
export const SENTENCE_NAME: Record<Rewrite, string> = { contra: 'the flip and NOT sentence', converse: 'the flip only sentence', inverse: 'the NOT only sentence' };

/** Is a sentence kept in this case? Said when the learner marks its box the other way. */
function sentenceBoxWhy(skin: Skin, c: Cond, r: Row, name: string): string {
  const k = cap(skin.kase[rowKey(r)]);
  const ifp = `“${skin.parts[c.a].if},”`;
  const thenp = `“${skin.parts[c.b].then ?? skin.parts[c.b].if},”`;
  const a = litHolds(c.a, r);
  const b = litHolds(c.b, r);
  if (a && !b) return `${k}: the IF part, ${ifp} is true. The THEN part, ${thenp} is false. That breaks ${name}, so this box gets a ✗, not a ✓.`;
  if (!a) return `${k}: the IF part, ${ifp} is false. So ${name} asks for nothing here. It is kept, so this box gets a ✓, not a ✗.`;
  return `${k}: the IF part, ${ifp} is true. The THEN part, ${thenp} is true too. That keeps ${name}, so this box gets a ✓, not a ✗.`;
}

/** What the marked boxes show: the same cases break the rule and the sentence, or one case tells them apart. */
function meaningConclusion(skin: Skin, rewrites: Rewrite[]): string {
  const out: string[] = [];
  const rule = brokenRows(RULE);
  for (const w of rewrites.filter((x) => sameMeaning(REWRITES[x], RULE))) {
    const only = brokenRows(REWRITES[w]);
    if (rule.length !== 1 || only.length !== 1 || rowKey(only[0]) !== rowKey(rule[0])) throw new Error('meaningConclusion: one case breaks each');
    out.push(`Only ${skin.kase[rowKey(rule[0])]} breaks the rule. It is also the only case that breaks ${SENTENCE_NAME[w]}. So ${SENTENCE_NAME[w]} means the same as the rule.`);
  }
  // The others, grouped by the case that tells them apart from the rule.
  const groups = new Map<string, Rewrite[]>();
  for (const w of rewrites.filter((x) => !sameMeaning(REWRITES[x], RULE))) {
    const t = telltaleRow(REWRITES[w])!;
    const key = `${rowKey(t.row)} ${t.breaks}`;
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }
  for (const ws of groups.values()) {
    const t = telltaleRow(REWRITES[ws[0]])!;
    const names = ws.map((w) => SENTENCE_NAME[w]).join(' and ');
    const k = cap(skin.kase[rowKey(t.row)]);
    out.push(t.breaks === 'sentence' ? `${k} keeps the rule but breaks ${names}.` : `${k} breaks the rule but keeps ${names}.`);
    out.push(ws.length === 1 ? 'So it does not mean the same as the rule.' : 'So neither one means the same as the rule.');
  }
  return out.join(' ');
}

/**
 * Lesson 4: the four cases of the worked example's grid. The rule's boxes are shown marked (the worked case); the
 * learner marks each rewrite's boxes: ✓ when the case keeps that sentence, ✗ when it breaks it.
 */
export function meaningDrill(skinId: SkinId, t: BoardText, rewrites: Rewrite[]): DrillStep {
  const skin = SKINS[skinId];
  const label = (id: string) => SENTENCE_COLUMNS.find(([k]) => k === id)![1];
  const rows: DrillRow[] = ROWS.map((r) => ({
    id: rowKey(r),
    label: cap(skin.kase[rowKey(r)]),
    marks: [
      { id: `${rowKey(r)}-rule`, label: label('rule'), options: yesNo(), answer: ynId(ruleHolds(r)), given: true, why: {} },
      ...rewrites.map((w): DrillMark => {
        const kept = condHolds(REWRITES[w], r);
        return { id: `${rowKey(r)}-${w}`, label: label(w), options: yesNo(), answer: ynId(kept), why: { [ynId(!kept)]: sentenceBoxWhy(skin, REWRITES[w], r, SENTENCE_NAME[w]) } };
      }),
    ],
  }));
  return {
    id: t.id,
    title: t.title,
    body: t.body,
    scene: ruleScene(skinId, 'compare'),
    ...twinOf(t),
    rows,
    columns: [label('rule'), ...rewrites.map(label)],
    caption: '✓ keeps the sentence. ✗ breaks it.',
    done: `Right. ${meaningConclusion(skin, rewrites)}`,
  };
}

// ----- lesson 5: the rule checker -----

/** Is the rule kept with this back on the card? Said when the learner marks it the other way. */
function backWhy(skin: Skin, face: Lit, back: Lit, sym: Symbols): string {
  const r = cardRow(face, back);
  const it = `With ${skin.cards!.back(back, sym)} on the back, it is ${skin.kase[rowKey(r)]}.`;
  if (!ruleHolds(r)) return `${it} The IF part happened, but the THEN part did not. That breaks the rule.`;
  if (r.p) return `${it} The IF part and the THEN part both happened. That keeps the rule.`;
  if (r.q) return `${it} The THEN part happened without the IF part. That keeps the rule.`;
  return `${it} The IF part did not happen, so the rule asks for nothing. That keeps the rule.`;
}

/** Must you turn this card over? Said when the learner marks it the other way. */
function turnWhy(skin: Skin, face: Lit, sym: Symbols): string {
  const cards = skin.cards!;
  const back = breakingBack(face);
  if (back) return `With ${cards.back(back, sym)} on the back, the rule is broken. That back could be there, so you must turn this card over.`;
  return `With ${backs(cards, face, sym)} on the back, the rule is kept. No back can break it, so you do not need to turn this card over.`;
}

/** "the “Dessert” card and the “Left some veggies” card" */
const cardList = (cards: NonNullable<Skin['cards']>, faces: Lit[], sym: Symbols) => faces.map((l) => `the “${cards.face(l, sym)}” card`).join(' and ');

/**
 * Lesson 5: rule-checker cards, one row each. A row marks what each possible back does to the rule (kept or broken),
 * then whether you must turn the card over. The worked card is shown; the learner marks the others.
 */
export function cardDrill(skinId: SkinId, t: BoardText, shown: Lit[], mark: Lit[], sym: Symbols = CLASSIC): DrillStep {
  const skin = SKINS[skinId];
  const cards = skin.cards;
  if (!cards) throw new Error(`cardDrill: ${skinId} has no cards`);
  const row = (face: Lit, given: boolean): DrillRow => {
    const g = given ? { given: true } : {};
    const marks: DrillMark[] = otherPart(face).map((b): DrillMark => {
      const kept = ruleHolds(cardRow(face, b));
      return { id: `${CARD_IDS[face]}-${CARD_IDS[b]}`, label: `${cap(cards.back(b, sym))} on the back`, options: KEPT_BROKEN, answer: kept ? 'holds' : 'crashes', ...g, why: { [kept ? 'crashes' : 'holds']: backWhy(skin, face, b, sym) } };
    });
    const turn = mustTurn(face);
    marks.push({ id: `${CARD_IDS[face]}-turn`, label: 'Turn it over?', options: yesNo(), answer: ynId(turn), ...g, why: { [ynId(!turn)]: turnWhy(skin, face, sym) } });
    return { id: CARD_IDS[face], label: `The card that shows “${cards.face(face, sym)}.”`, marks, note: cardNote(skin, face, sym) };
  };
  const faces = [...shown, ...mark];
  const turn = faces.filter(mustTurn);
  const skip = faces.filter((l) => !mustTurn(l));
  const done = [`Right. Turn over ${cardList(cards, turn, sym)}.`];
  if (skip.length) done.push(`Skip ${cardList(cards, skip, sym)}. No back on ${skip.length === 1 ? 'it' : 'them'} can break the rule.`);
  if (skip.includes('Q')) done.push(`The “${cards.face('Q', sym)}” card is the trap.`);
  return {
    id: t.id,
    title: t.title,
    body: t.body,
    scene: ruleScene(skinId, 'check'),
    ...twinOf(t),
    rows: [...shown.map((l) => row(l, true)), ...mark.map((l) => row(l, false))],
    done: done.join(' '),
  };
}

// ---------- the distinctions Stop 6 rests on ----------
//
// Lesson 1's rules can be broken: a kid who got dessert and left some veggies is a real case, and broke the rule.
// Lessons 2 and 3 use rules that are always true here: the case that would break the rule can't happen, so it is
// crossed out. Those are two frames for one if–then rule (BROKEN_VS_CANT), and the rule card says which one holds.
// P and Q are letters for the two parts, and “P is true” means the IF part happened (LETTER_VS_TRUTH). Every truth
// below comes from litHolds(), ruleHolds() and canHappen(), never written by hand.

/** A rule kids can break vs a rule that is always true here. Taught in lesson 2 (brokenContrast, canBoxDrill). */
export const BROKEN_VS_CANT: Distinction = {
  id: 'broken-vs-cant-happen',
  a: 'A rule kids can break: a case can break it, and that kid broke the rule (Lesson 1).',
  b: 'A rule that is always true here: the case that would break it can’t happen.',
};

/** A letter that stands for a part vs whether that part is true in a case. Taught in lesson 1 (lettersContrast, PQ_BOXES). */
export const LETTER_VS_TRUTH: Distinction = {
  id: 'letter-vs-truth',
  a: 'A letter that stands for a part of the rule: P is the IF part, Q is the THEN part.',
  b: 'Whether that part is true in a case: “P is true” means the IF part happened.',
};

/** The last line of “I’m confused” on a lesson 2 or 3 board or question. */
export const KEPT_CLOSING = 'Those two ideas are apart now. Read the “Always true here” line. Cross out the case that would break the rule, and use the cases left.';
/** The last line of “I’m confused” on a P and Q board or question. */
export const LETTERS_CLOSING = 'Those two ideas are apart now. P stands for the IF part, and Q stands for the THEN part. “P is true” means the IF part happened.';

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** An option of an “I’m confused” question, marked right only when it is. */
const opt = (label: string, right = false) => (right ? { label, right: true } : { label });

/**
 * The mix-up a wrong “can it happen here?” mark shows, for one case (a 'picks' pattern on that mark). `says` names the
 * case in the board's words. The case that would break the rule marked as able to happen: the lesson 1 frame carried
 * into a rule that is always true. A case without the IF part marked as unable to happen: “no IF part” read as “can't
 * happen”. The case with the IF part and the THEN part marked so: one case taken as the only one.
 */
export function canMix(onlyAbout: string, mark: string, r: Row, says: string): Misconception {
  if (!ruleHolds(r)) {
    return {
      id: `${mark}-break-as-real`,
      when: 'picks',
      picks: { [mark]: ynId(!canHappen(r, true)) },
      text: `You may be treating “this case breaks the rule” and “this case can happen” as the same thing. They are two different things: in Lesson 1 a break was a real case, but here the rule is always true. ${says} That case would break the rule, so it can’t happen: cross it out.`,
    };
  }
  if (!r.p) {
    return {
      id: `${mark}-no-if`,
      when: 'picks',
      picks: { [mark]: ynId(!canHappen(r, true)) },
      text: `You may be treating “the IF part did not happen” and “this case can’t happen” as the same thing. They are two different things: ${lowerFirst(onlyAbout)} ${says} That keeps the rule, so it can happen here.`,
    };
  }
  return {
    id: `${mark}-only-one`,
    when: 'picks',
    picks: { [mark]: ynId(!canHappen(r, true)) },
    text: `You may be treating “one case can happen” and “only that case can happen” as the same thing. They are two different things: every case that keeps the rule can happen here. ${says} The IF part and the THEN part both happened, so it can happen too.`,
  };
}

/** The break taken as a real case is checked first: it is the mix-up these boards exist for. The rest keep board order. */
export const breakFirst = (ms: Misconception[]) => [...ms.filter((m) => m.id.endsWith('-break-as-real')), ...ms.filter((m) => !m.id.endsWith('-break-as-real'))];

/**
 * “I’m confused” on a lesson 2 or 3 board or question: can the case that would break an always-true rule happen (asked
 * in another story, so it never gives this board's mark), and was Ben a real case in lesson 1. With letters, one more
 * question: does “P is true” mean the IF part happened.
 */
export function keptConfused(skin: SkinId, letters = false): ConfusedQuestion[] {
  const other: SkinId = skin === 'dessert' ? 'pets' : 'dessert';
  const tf = rowAt(true, false);
  const here = canHappen(tf, true);
  const there = canHappen(tf, false);
  const qs: ConfusedQuestion[] = [
    {
      q: `Say this rule is always true: “${ruleText(other)}” Can there be ${SKINS[other].kase.TF}?`,
      options: [opt('Yes, that case can happen', here), opt('No, it can’t happen', !here), opt('Not sure')],
      teach: 'No. That case would break the rule. When a rule is always true, no case breaks it. So that case can’t happen: cross it out.',
    },
    {
      q: `In Lesson 1, ${SKINS.dessert.says('Ben', tf)}. Was Ben a real case there?`,
      options: [opt('Yes', there), opt('No', !there), opt('Not sure')],
      teach: 'Yes. Kids could break the lunchroom rule, and Ben broke it. Here the rule card says “Always true here.” Then the case that would break the rule can’t happen.',
    },
  ];
  return letters ? [...qs, pqConfused()[1]] : qs;
}

/** “I’m confused” on a P and Q board or question: which letter is the IF part, and what “P is true” means. */
export function pqConfused(): ConfusedQuestion[] {
  const s = SKINS.pq;
  const ifPart = s.parts.P.if;
  const thenPart = s.parts.Q.then ?? s.parts.Q.if;
  const happened = rowAt(true, true).p;
  return [
    {
      q: `In “${condText('pq', RULE).replace(/\.$/, '')},” which is the IF part?`,
      options: [opt(ifPart, true), opt(thenPart), opt('Not sure')],
      teach: `${ifPart} comes right after “if,” so ${ifPart} is the IF part. ${thenPart} comes right after “then,” so ${thenPart} is the THEN part.`,
    },
    {
      q: `${s.fact('P', '')}. Did the IF part happen?`,
      options: [opt('Yes', happened), opt('No', !happened), opt('Not sure')],
      teach: 'Yes. P stands for a whole sentence: the IF part. “P is true” means that sentence is true here. So the IF part happened.',
    },
  ];
}

const happenedWord = (v: boolean) => (v ? 'happened' : 'did not happen');

/**
 * Letters for the parts (lesson 1): the same case told twice, in the lunchroom's words and with P and Q. In each, the
 * IF part happened and the THEN part did not, so the rule is broken. The truth did not change; only the words did.
 */
export function lettersContrast(): Extract<Scene, { kind: 'contrast' }> {
  const r = rowAt(true, false);
  const d = SKINS.dessert;
  const q = SKINS.pq;
  const p = litHolds('P', r);
  const t = litHolds('Q', r);
  const verdict = ruleHolds(r) ? 'This case keeps the rule.' : 'This case breaks the rule.';
  const panel = (s: Skin, name: string, says: string): ContrastPanel => ({
    world: `${s.says(name, r)}.`,
    who: 'The IF part',
    says,
    truth: p,
    because: `${s.fact(p ? 'P' : 'notP', name)}. So the IF part ${happenedWord(p)}.`,
    then: `${s.fact(t ? 'Q' : 'notQ', name)}, so the THEN part ${happenedWord(t)}. ${verdict}`,
  });
  return {
    kind: 'contrast',
    pairs: [panel(d, 'Ben', `${cap(d.parts.P.if)}.`), panel(q, '', q.parts.P.if)],
    ask: { q: 'Did the truth change?', a: 'No. Only the words did. P is the IF part, and “P is true” means the IF part happened.' },
    words: { worldTag: 'The case', saysWord: 'is:', truth: 'It happened', untruth: 'It did not happen' },
  };
}

/**
 * Broken, or can't happen? (lesson 2): the same case, Ben got dessert and left some veggies, under the lunchroom rule
 * twice. Where kids can break the rule, Ben is a real case and he broke it. Where the rule is always true, that case
 * can't happen. Ben did not change; only the rule's frame did.
 */
export function brokenContrast(): Extract<Scene, { kind: 'contrast' }> {
  const r = rowAt(true, false);
  if (ruleHolds(r)) throw new Error('brokenContrast: the case must break the rule');
  const d = SKINS.dessert;
  const name = 'Ben';
  const panel = (alwaysTrue: boolean): ContrastPanel => {
    const can = canHappen(r, alwaysTrue);
    return {
      world: alwaysTrue ? d.kept : 'Kids can break this rule.',
      who: 'The case',
      says: `${d.says(name, r)}.`,
      truth: can,
      because: `The IF part happened, but the THEN part did not. That ${alwaysTrue ? 'would break' : 'breaks'} the rule.`,
      then: can ? `So ${name} is a real case. ${name} broke the rule.` : 'Nobody breaks the rule here, so this case can’t happen. It crashes: cross it out.',
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(false), panel(true)],
    ask: { q: `Did ${name} change?`, a: 'No, and the rule’s words did not change either. What changed is whether the rule is always true. Here it is, so the case that would break it can’t happen.' },
    words: { worldTag: 'This story', saysWord: 'is:', truth: 'Can happen', untruth: 'Can’t happen' },
  };
}

/** The lesson 4 board with letters, as a P and Q question's thinking board: the rule's boxes shown, the asked sentences to mark. */
export function pqMeaningScratch(rewrites: Rewrite[]): DrillStep {
  const lines = rewrites.map((w) => `${SENTENCE_COLUMNS.find(([k]) => k === w)![1]}: “${condText('pq', REWRITES[w])}”`);
  const board = meaningDrill('pq', { id: 'scratch', title: 'Your case grid', body: [`The rule: “${ruleText('pq')}” ${PQ_KEY}`, ...lines, 'Mark the boxes if it helps. Nothing here is checked.'] }, rewrites);
  return { ...board, done: '', words: { closing: LETTERS_CLOSING } };
}

// ---------- lessons 6 and 7: only if, unless, if and only if, needed and enough ----------
//
// Each new way of saying a rule is said again as if–then rules (FORM_CONDS), so every truth below comes from
// condHolds() over the four cases, never written by hand:
//  - “P only if Q” is “If P, then Q”: the part after “only if” is needed. It is broken only when P happens and Q does not.
//  - “P unless Q” is “If not Q, then P”. It is broken only when neither part happens.
//  - “P if and only if Q” is “If P, then Q” and “If Q, then P”. It is broken when one part happens without the other.
//  - In “If P, then Q”, P is enough for Q (sufficient) and Q is needed for P (necessary): needCond().
// Lesson 7 points back to lesson 5's cards: the card that shows the THEN part need not be turned, because the THEN part
// is needed for the IF part, not enough for it (whyCardItem). The closing why item of the stop check is that item, or
// the one on why “only if” points the other way (whyOnlyIfItem).

export type FormKind = 'only-if' | 'unless' | 'iff';
export const FORMS: readonly FormKind[] = ['only-if', 'unless', 'iff'];

/** Each form, said as if–then rules. A case keeps the form when it keeps every one of them. */
export const FORM_CONDS: Record<FormKind, readonly Cond[]> = {
  'only-if': [{ a: 'P', b: 'Q' }],
  unless: [{ a: 'notQ', b: 'P' }],
  iff: [{ a: 'P', b: 'Q' }, { a: 'Q', b: 'P' }],
};
export const formHolds = (f: FormKind, r: Row) => FORM_CONDS[f].every((c) => condHolds(c, r));
export const formBroken = (f: FormKind) => ROWS.filter((r) => !formHolds(f, r));
/** An if–then sentence means the same as a form when the same cases break them. */
export const sameAsForm = (c: Cond, f: FormKind) => ROWS.every((r) => condHolds(c, r) === formHolds(f, r));
/**
 * The way each form is most often misread: “P only if Q” as “If Q, then P” (the trap of lesson 6), “P unless Q” as
 * “If Q, then not P”, and “P if and only if Q” as one way only. A case where the misreading and the form disagree is a
 * conflict item.
 */
export const MISREAD: Record<FormKind, Cond> = { 'only-if': { a: 'Q', b: 'P' }, unless: { a: 'Q', b: 'notP' }, iff: { a: 'P', b: 'Q' } };
export const misreadMatters = (f: FormKind, r: Row) => condHolds(MISREAD[f], r) !== formHolds(f, r);

/** The tag of lesson 6's trap (“only if” turned around) and lesson 7's (“needed” read as “enough”). */
export const ONLY_IF_TRAP = 'only-if-trap';
export const NEED_TRAP = 'needed-as-enough';
/** The tag every closing why item carries (its choices are reasons). */
export const WHY_TAG = 'why';

/** The words of one story for lessons 6 and 7: its people or days, its two parts and its four cases. */
export interface Story {
  id: StoryId;
  group: Group;
  setting: string;
  /** An extra line under the rule (the vowels, for letter cards). */
  note?: string;
  names: readonly string[];
  /** The parts: `if` as it follows “if” (or starts the sentence), `then` as it follows “then”. */
  parts: Record<Lit, { if: string; then?: string }>;
  /** A fact about one case: capital first letter, no final period. */
  fact(l: Lit, name: string): string;
  /** A whole case about one name, as a sentence without its period. */
  says(name: string, r: Row, sym: Symbols): string;
  /** A case as a choice label, without its period. */
  label(name: string, r: Row, sym: Symbols): string;
  ask: string;
  did(name: string): string;
  /** A case as a noun phrase. */
  kase: Record<RowKey, string>;
  /** Short names for the four boxes. */
  face: Record<Lit, string>;
  /** What the rule talks about, by the IF part of its if–then form (the part before “only if”, NOT the part after “unless”). */
  onlyAbout: string;
}

export type StoryId = SkinId | 'recess' | 'store' | 'cave' | 'broom';

/** A story told on days: the cases are days (or nights), and the facts are about what happened that day. */
function dayStory(o: Omit<Story, 'names' | 'parts' | 'label' | 'says'> & { parts: Record<Lit, string>; says(name: string, r: Row): string }): Story {
  const { parts, says, ...rest } = o;
  return {
    ...rest,
    names: DAYS,
    parts: { P: { if: parts.P }, notP: { if: parts.notP }, Q: { if: parts.Q }, notQ: { if: parts.notQ } },
    says: (n, r) => says(n, r),
    label: (n, r) => says(n, r),
  };
}

/** The “unless” stories: each one names a usual thing (the part before “unless”) and the one thing that can stop it. */
const DAY_STORIES: Record<'recess' | 'store' | 'cave' | 'broom', Story> = {
  recess: dayStory({
    id: 'recess',
    group: 'everyday',
    setting: 'The school has a rule for recess.',
    ask: 'Which day breaks the rule?',
    parts: { P: 'recess is outside', notP: 'recess is inside', Q: 'it rains', notQ: 'it does not rain' },
    fact: (l, n) => ({ P: `Recess was outside on ${n}`, notP: `Recess was inside on ${n}`, Q: `It rained on ${n}`, notQ: `It did not rain on ${n}` })[l],
    says: (n, r) => `On ${n}, it ${r.q ? 'rained' : 'did not rain'} and recess was ${r.p ? 'outside' : 'inside'}`,
    did: (n) => `Did the school break the rule on ${n}?`,
    kase: { TT: 'a day with rain and recess outside', TF: 'a day with no rain and recess outside', FT: 'a day with rain and recess inside', FF: 'a day with no rain and recess inside' },
    face: { P: 'Outside', notP: 'Inside', Q: 'Rain', notQ: 'No rain' },
    onlyAbout: 'The rule only talks about days with no rain.',
  }),
  store: dayStory({
    id: 'store',
    group: 'everyday',
    setting: 'The corner store has a rule.',
    ask: 'Which day breaks the rule?',
    parts: { P: 'the store is open', notP: 'the store is closed', Q: 'it is a holiday', notQ: 'it is not a holiday' },
    fact: (l, n) => ({ P: `The store was open on ${n}`, notP: `The store was closed on ${n}`, Q: `${n} was a holiday`, notQ: `${n} was not a holiday` })[l],
    says: (n, r) => `On ${n}, it was ${r.q ? '' : 'not '}a holiday and the store was ${r.p ? 'open' : 'closed'}`,
    did: (n) => `Did the store break the rule on ${n}?`,
    kase: { TT: 'a holiday with the store open', TF: 'a regular day with the store open', FT: 'a holiday with the store closed', FF: 'a regular day with the store closed' },
    face: { P: 'Open', notP: 'Closed', Q: 'Holiday', notQ: 'Not a holiday' },
    onlyAbout: 'The rule only talks about days that are not holidays.',
  }),
  cave: dayStory({
    id: 'cave',
    group: 'fantasy',
    setting: 'The cave dragon has a rule.',
    ask: 'Which night breaks the rule?',
    parts: { P: 'the dragon sleeps', notP: 'the dragon stays awake', Q: 'the moon is full', notQ: 'the moon is not full' },
    fact: (l, n) => ({ P: `The dragon slept on ${n} night`, notP: `The dragon stayed awake on ${n} night`, Q: `The moon was full on ${n} night`, notQ: `The moon was not full on ${n} night` })[l],
    says: (n, r) => `On ${n} night, the moon was ${r.q ? '' : 'not '}full and the dragon ${r.p ? 'slept' : 'stayed awake'}`,
    did: (n) => `Did the dragon break the rule on ${n} night?`,
    kase: {
      TT: 'a full moon night when the dragon sleeps',
      TF: 'a night with no full moon when the dragon sleeps',
      FT: 'a full moon night when the dragon stays awake',
      FF: 'a night with no full moon when the dragon stays awake',
    },
    face: { P: 'Sleeps', notP: 'Awake', Q: 'Full moon', notQ: 'No full moon' },
    onlyAbout: 'The rule only talks about nights when the moon is not full.',
  }),
  broom: dayStory({
    id: 'broom',
    group: 'fantasy',
    setting: 'Merla the wizard goes to school by broom or on foot. She has a rule.',
    ask: 'Which day breaks the rule?',
    parts: { P: 'Merla rides her broom to school', notP: 'Merla walks to school', Q: 'it snows', notQ: 'it does not snow' },
    fact: (l, n) => ({ P: `Merla rode her broom on ${n}`, notP: `Merla walked on ${n}`, Q: `It snowed on ${n}`, notQ: `It did not snow on ${n}` })[l],
    says: (n, r) => `On ${n}, it ${r.q ? 'snowed' : 'did not snow'} and Merla ${r.p ? 'rode her broom' : 'walked'}`,
    did: (n) => `Did Merla break the rule on ${n}?`,
    kase: { TT: 'a snowy day when Merla rides her broom', TF: 'a day with no snow when Merla rides her broom', FT: 'a snowy day when Merla walks', FF: 'a day with no snow when Merla walks' },
    face: { P: 'Broom', notP: 'Walks', Q: 'Snow', notQ: 'No snow' },
    onlyAbout: 'The rule only talks about days with no snow.',
  }),
};

/** A lesson 1 skin as a story (its kids, its cases, its card faces). P and Q drop the key line: the parts may swap. */
function skinStory(id: SkinId, onlyAbout?: string): Story {
  const s = SKINS[id];
  const l1 = s.l1;
  if (!l1) throw new Error(`skinStory: ${id} has no lesson 1 words`);
  const face: Record<Lit, string> = s.cards
    ? { P: s.cards.face('P', CLASSIC), notP: s.cards.face('notP', CLASSIC), Q: s.cards.face('Q', CLASSIC), notQ: s.cards.face('notQ', CLASSIC) }
    : { P: s.fact('P', ''), notP: s.fact('notP', ''), Q: s.fact('Q', ''), notQ: s.fact('notQ', '') };
  return {
    id,
    group: s.group,
    setting: s.setting,
    ...(s.note && id !== 'pq' ? { note: s.note } : {}),
    names: s.names,
    parts: s.parts,
    fact: s.fact,
    says: (name, row, sym) => l1.says({ name, row, sym }),
    label: (name, row, sym) => l1.label({ name, row, sym }),
    ask: l1.ask,
    did: l1.did,
    kase: s.kase,
    face,
    onlyAbout: onlyAbout ?? s.onlyAbout,
  };
}

/** Stories for each form: “only if” and “if and only if” use lesson 1's rules; “unless” has its own. */
export const ONLY_IF_STORIES: readonly SkinId[] = L1_SKINS;
export const IFF_STORIES: readonly SkinId[] = L1_SKINS;
export const UNLESS_STORIES: readonly StoryId[] = ['recess', 'store', 'cave', 'broom', 'pq'];
export const FORM_STORIES: Record<FormKind, readonly StoryId[]> = { 'only-if': ONLY_IF_STORIES, unless: UNLESS_STORIES, iff: IFF_STORIES };

/** A story's words for one form. */
export function storyOf(id: StoryId, form: FormKind): Story {
  if (id === 'recess' || id === 'store' || id === 'cave' || id === 'broom') return DAY_STORIES[id];
  if (form === 'unless') {
    if (id !== 'pq') throw new Error(`storyOf: ${id} has no “unless” words`);
    return skinStory('pq', 'The rule only talks about the cases where Q is false.');
  }
  return skinStory(id);
}
export const storyGroup = (id: StoryId): Group => (id in DAY_STORIES ? DAY_STORIES[id as keyof typeof DAY_STORIES].group : SKINS[id as SkinId].group);

const thenOf = (w: Story, l: Lit) => w.parts[l].then ?? w.parts[l].if;
/** A fact inside a sentence: "It rained" -> "it rained". Names, P and Q stay as they are. */
const lead = (s: string) => s.replace(/^(It|The|This|Recess|A|An) /, (m) => m.toLowerCase());
/** A sentence in quotes inside a sentence: no final period. */
const bare = (s: string) => s.replace(/\.$/, '');

/** “You take a book home only if you have a library card.” */
export function formText(w: Story, f: FormKind): string {
  const first = cap(w.parts.P.if);
  if (f === 'unless') return `${first} unless ${w.parts.Q.if}.`;
  return `${first} ${f === 'iff' ? 'if and only if' : 'only if'} ${thenOf(w, 'Q')}.`;
}
/** An if–then sentence in the story's words: “If it does not rain, then recess is outside.” */
export const storyIf = (w: Story, c: Cond) => `If ${w.parts[c.a].if}, then ${thenOf(w, c.b)}.`;
/** “You take a book home if you have a library card.”: plain “if” in the middle, the trap reading of “only if”. */
export const plainIfText = (w: Story) => `${cap(w.parts.P.if)} if ${thenOf(w, 'Q')}.`;

/** The rule card of a form: the setting, the rule, and a note (the vowels on letter cards). */
export function formScene(w: Story, f: FormKind): Scene {
  return { kind: 'text', lines: [w.setting, formText(w, f), ...(w.note ? [w.note] : [])] };
}

/** A part as a truth line's name: “You take a book home: true.” */
const partWho = (w: Story, l: 'P' | 'Q') => cap(w.parts[l].if);
/** Is each part true, and is the rule kept, in this case? */
export const formTruths = (w: Story, f: FormKind, r: Row): Truth[] => [
  { who: partWho(w, 'P'), value: r.p },
  { who: partWho(w, 'Q'), value: r.q },
  { who: RULE_WHO, value: formHolds(f, r) },
];

/** Why a case keeps or breaks a form, with no names: the note on a case card. */
export function formNote(f: FormKind, r: Row): string {
  if (!formHolds(f, r)) {
    if (f === 'only-if') return 'The part before “only if” happened without the part after it. This breaks the rule.';
    if (f === 'unless') return 'Neither part happened. This breaks the rule.';
    return 'One part happened without the other. This breaks the rule.';
  }
  if (f === 'only-if') return r.p ? 'The part after “only if” happened too. This keeps the rule.' : 'The part before “only if” did not happen, so the rule asks for nothing. This keeps the rule.';
  if (f === 'unless') return r.q ? 'The part after “unless” happened, so the rule makes no promise. This keeps the rule.' : 'The part before “unless” happened. This keeps the rule.';
  return r.p ? 'The two parts happened together. This keeps the rule.' : 'Neither part happened, so no part happened alone. This keeps the rule.';
}

/** Why one named case keeps or breaks a form, in the story's words, worked out from the form's if–then pieces. */
export function formWhy(w: Story, f: FormKind, name: string, r: Row): string {
  const fact = (l: Lit) => w.fact(l, name);
  const broken = FORM_CONDS[f].find((c) => !condHolds(c, r));
  if (broken) return `${fact(broken.a)}, so the rule needs “${w.parts[broken.b].if}.” But ${lead(fact(neg(broken.b)))}. That breaks the rule.`;
  if (f === 'iff') {
    return r.p
      ? `${fact('P')}, and ${lead(fact('Q'))}. The two parts happened together, so this case keeps the rule.`
      : `${fact('notP')}, and ${lead(fact('notQ'))}. No part happened alone, so this case keeps the rule.`;
  }
  const c = FORM_CONDS[f][0];
  if (!litHolds(c.a, r)) return `${fact(neg(c.a))}. ${w.onlyAbout} So this case keeps the rule.`;
  return `${fact(c.a)}, and ${lead(fact(c.b))}. The rule gets what it needs, so this case keeps it.`;
}

/** Step by step: is each IF part true here, and if it is, is its THEN part true too? */
function formSteps(w: Story, f: FormKind, says: string, r: Row): string[] {
  const out = [sentence(says)];
  for (const c of FORM_CONDS[f]) {
    const on = litHolds(c.a, r);
    out.push(`Is “${w.parts[c.a].if}” true here? ${on ? 'Yes' : 'No'}.`);
    if (on) out.push(`Then “${w.parts[c.b].if}” must be true too. ${litHolds(c.b, r) ? 'It is.' : 'It is not.'}`);
  }
  out.push(formHolds(f, r) ? 'So this case keeps the rule.' : 'So this case breaks the rule.');
  return out;
}

export const FORM_RULE: Record<FormKind, string> = {
  'only-if': 'A rule with “only if” is broken only when the part before “only if” happens and the part after it does not.',
  unless: 'A rule with “unless” is broken only when neither part happens.',
  iff: 'A rule with “if and only if” is broken when one part happens without the other.',
};
const FORM_SAY: Record<FormKind, string> = {
  'only-if': 'Say it with if: “P only if Q” means “If P, then Q.”',
  unless: 'Say it with if: “P unless Q” means “If not Q, then P.”',
  iff: 'Say it with if: “P if and only if Q” means “If P, then Q” and “If Q, then P.”',
};
const FORM_ASK: Record<FormKind, string> = {
  'only-if': 'Ask: which part comes after “only if”? That part is needed.',
  unless: 'Ask: did the part after “unless” happen? If it did not, the part before it must happen.',
  iff: 'Ask: did one part happen without the other?',
};
export const FORM_ONLY_WAY: Record<FormKind, string> = {
  'only-if': 'Only the part before “only if” without the part after it breaks the rule.',
  unless: 'Only a case where neither part happens breaks the rule.',
  iff: 'The rule breaks when one part happens without the other.',
};
const FORM_BREAKS: Record<FormKind, { word: string; meaning: string }> = {
  'only-if': { word: 'Breaks the rule', meaning: 'the part before “only if” happens, but the part after it does not.' },
  unless: { word: 'Breaks the rule', meaning: 'neither part happens: not the part after “unless,” and not the part before it.' },
  iff: { word: 'Breaks the rule', meaning: 'one part happens without the other.' },
};

/** The word a form uses, defined with the story's own rule said as if–then. */
export function formTerm(w: Story, f: FormKind): { word: string; meaning: string } {
  const said = `“${bare(formText(w, f))}”`;
  if (f === 'only-if') return { word: '“Only if”', meaning: `the part after it is needed. ${said} means “${storyIf(w, FORM_CONDS[f][0])}”` };
  if (f === 'unless') return { word: '“Unless”', meaning: `the part after it is the one thing that can stop the part before it. ${said} means “${storyIf(w, FORM_CONDS[f][0])}”` };
  const [a, b] = FORM_CONDS.iff;
  return { word: '“If and only if”', meaning: `two rules at once, one each way. One is “${storyIf(w, a)}” The other is “${storyIf(w, b)}”` };
}

/** What the rule talks about and the cases that break it, in the story's words. */
export function formMeaning(w: Story, f: FormKind): string {
  const broken = formBroken(f).map((r) => w.kase[rowKey(r)]);
  if (f === 'iff') return `It is two rules, one each way. It is broken by ${broken[0]}. It is also broken by ${broken.slice(1).join(' and by ')}.`;
  if (broken.length !== 1) throw new Error('formMeaning: one case breaks the rule');
  return `${w.onlyAbout} It is broken only by ${broken[0]}.`;
}

/** A named case as a card: its sentence, each part true or false, the rule kept or broken, and why. */
const formCase = (w: Story, f: FormKind, says: string, r: Row, extra = ''): TeachCase => ({ label: sentence(says), truths: formTruths(w, f, r), note: `${formNote(f, r)}${extra}` });

/** The teaching of a form's case questions: the four cases in the story's words. */
function formTeach(w: Story, f: FormKind, cases: { says: string; row: Row; asked?: boolean }[]): Teach {
  const sorted = [...cases].sort((a, b) => ROWS.findIndex((r) => rowKey(r) === rowKey(a.row)) - ROWS.findIndex((r) => rowKey(r) === rowKey(b.row)));
  const brk = sorted.find((c) => !formHolds(f, c.row));
  if (!brk) throw new Error('formTeach: a case must break the rule');
  return {
    rule: FORM_RULE[f],
    terms: [formTerm(w, f), FORM_BREAKS[f]],
    meaning: formMeaning(w, f),
    casesTitle: 'When is the rule kept, and when is it broken?',
    cases: sorted.map((c) => formCase(w, f, c.says, c.row, c.asked ? ' This is the case in the question.' : '')),
    remember: [FORM_SAY[f], FORM_ASK[f]],
    simpler: formSteps(w, f, brk.says, brk.row),
  };
}

/** A wrong answer that calls a kept case broken: the gap, by the form and the kind of case. */
function keptHead(f: FormKind, r: Row): string {
  if (f === 'only-if') {
    if (misreadMatters(f, r)) return 'Your answer turns “only if” around. It reads “only if” as plain “if.”';
    return r.p ? 'Your answer says the rule was broken, but the part after “only if” happened too.' : 'Your answer says the rule was broken, but the part before “only if” did not happen.';
  }
  if (f === 'unless') {
    if (misreadMatters(f, r)) return 'Your answer reads more into “unless” than its words say.';
    return r.q ? 'Your answer says the rule was broken, but the part after “unless” happened, so the rule makes no promise.' : 'Your answer says the rule was broken, but the part before “unless” happened.';
  }
  return r.p ? 'Your answer says the rule was broken, but the two parts happened together.' : 'Your answer says the rule was broken, but neither part happened.';
}
/** A wrong answer that calls a broken case kept. */
function missedHead(f: FormKind): string {
  if (f === 'only-if') return 'Your answer misses that the part before “only if” happened without the part after it.';
  if (f === 'unless') return 'Your answer misses that neither part happened.';
  return 'Your answer misses that one part happened without the other.';
}

export interface FormMade {
  tag: string;
  item: CondCore;
  meta: { story: StoryId; form?: FormKind; name?: string; sym?: Symbols; rows?: Record<string, Row>; conds?: Record<string, Cond>; need?: Record<string, NeedId>; reasons?: Record<string, boolean> };
}

/** "Which kid broke the rule?" for “only if” or “unless”: one case per choice, and exactly one breaks the rule. */
export function formWhoItem(rng: Rng, o: { form: 'only-if' | 'unless'; story: StoryId }): FormMade {
  const f = o.form;
  const w = storyOf(o.story, f);
  const names = rng.shuffle(w.names);
  const sym = drawSymbols(rng);
  const cases = rng.shuffle(ROWS).map((row, i) => ({ name: names[i % names.length], row }));
  const says = (c: { name: string; row: Row }) => w.says(c.name, c.row, sym);
  const choices = cases.map((c) => ({ id: rowId(c.row), label: w.label(c.name, c.row, sym) }));
  const broken = cases.filter((c) => !formHolds(f, c.row));
  if (broken.length !== 1) throw new Error('formWhoItem: exactly one case must break the rule');
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of cases) {
    if (!formHolds(f, c.row)) continue;
    feedback[rowId(c.row)] = {
      headline: keptHead(f, c.row),
      detail: [sentence(says(c)), formWhy(w, f, c.name, c.row), FORM_ONLY_WAY[f]],
      example: formCase(w, f, says(c), c.row),
      simpler: formSteps(w, f, says(c), c.row),
    };
  }
  // The hint checks one case that keeps the rule, never the answer, and never the case the misreading gets wrong.
  const shown = cases.find((c) => formHolds(f, c.row) && !misreadMatters(f, c.row))!;
  const item: ChooseCore = {
    kind: 'choose',
    prompt: w.ask,
    scene: formScene(w, f),
    choices,
    answer: rowId(broken[0].row),
    explain: `${sentence(says(broken[0]))} ${formWhy(w, f, broken[0].name, broken[0].row)}`,
    feedback,
    hint: 'Here is one case, checked for you. Check the others the same way.',
    hintCase: formCase(w, f, says(shown), shown.row),
    teach: formTeach(w, f, cases.map((c) => ({ says: says(c), row: c.row }))),
    tags: f === 'only-if' ? [ONLY_IF_TRAP] : [],
  };
  syncWhyWrong(item);
  // The misreading picks a case that keeps the rule: intuition points the wrong way.
  item.conflict = true;
  return { tag: f, item, meta: { story: o.story, form: f, sym, rows: Object.fromEntries(cases.map((c) => [rowId(c.row), c.row])) } };
}

/** "Did Kai break the rule?" for one case of any form. A case the misreading gets wrong is a conflict item. */
export function formDidItem(rng: Rng, o: { form: FormKind; story: StoryId; row?: Row }): FormMade {
  const f = o.form;
  const w = storyOf(o.story, f);
  const row = o.row ?? rng.pick(ROWS);
  const name = rng.pick(w.names);
  const sym = drawSymbols(rng);
  const broke = !formHolds(f, row);
  const says = w.says(name, row, sym);
  const example = formCase(w, f, says, row);
  const fb: ChoiceFeedback = {
    headline: broke ? missedHead(f) : keptHead(f, row),
    detail: [sentence(says), formWhy(w, f, name, row), FORM_ONLY_WAY[f]],
    example,
    simpler: formSteps(w, f, says, row),
  };
  // The other three cases go to other names (or other cards), so each case is told in the story's words.
  const others = w.names.filter((n) => n !== name);
  let k = Math.max(0, w.names.indexOf(name));
  const cases = ROWS.map((r) => {
    if (rowKey(r) === rowKey(row)) return { says, row: r, asked: true };
    const who = others.length ? others[k++ % others.length] : name;
    return { says: w.says(who, r, sym), row: r };
  });
  // The hint checks another case in the same story: the same first part, the other second part. Never the asked case.
  const near = cases.find((c) => rowKey(c.row) === rowKey(rowAt(row.p, !row.q)))!;
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${sentence(says)} ${w.did(name)}`,
    scene: formScene(w, f),
    choices: YES_NO,
    answer: broke ? 'yes' : 'no',
    explain: formWhy(w, f, name, row),
    feedback: { [broke ? 'no' : 'yes']: fb },
    hint: 'Here is a case like this one, checked for you. Check this one the same way.',
    hintCase: formCase(w, f, near.says, near.row),
    teach: formTeach(w, f, cases),
    tags: f === 'only-if' && misreadMatters(f, row) ? [ONLY_IF_TRAP] : [],
  };
  syncWhyWrong(item);
  if (misreadMatters(f, row)) item.conflict = true;
  return { tag: f, item, meta: { story: o.story, form: f, name, sym, rows: { one: row } } };
}

/** "Which kids broke the rule? Pick every one." for “if and only if”: two cases break it. */
export function iffWhoItem(rng: Rng, o: { story: StoryId }): FormMade {
  const f: FormKind = 'iff';
  const w = storyOf(o.story, f);
  const names = rng.shuffle(w.names);
  const sym = drawSymbols(rng);
  const cases = rng.shuffle(ROWS).map((row, i) => ({ name: names[i % names.length], row }));
  const says = (c: { name: string; row: Row }) => w.says(c.name, c.row, sym);
  const choices = cases.map((c) => ({ id: rowId(c.row), label: w.label(c.name, c.row, sym) }));
  const broken = cases.filter((c) => !formHolds(f, c.row));
  if (broken.length !== 2) throw new Error('iffWhoItem: two cases break the rule');
  const missTips: Record<string, string> = {};
  const pickTips: Record<string, string> = {};
  for (const c of cases) {
    const label = `“${w.label(c.name, c.row, sym)}.”`;
    if (formHolds(f, c.row)) pickTips[rowId(c.row)] = `Your answer picks ${label} ${formWhy(w, f, c.name, c.row)}`;
    else missTips[rowId(c.row)] = `Your answer leaves out ${label} ${formWhy(w, f, c.name, c.row)}`;
  }
  const plural = w.ask.replace(/^Which (\w+) (broke|breaks)/, (_m, n: string, v: string) => `Which ${n.endsWith('x') ? `${n}es` : `${n}s`} ${v === 'broke' ? 'broke' : 'break'}`);
  const shown = cases.find((c) => formHolds(f, c.row))!;
  const item: CondCore = {
    kind: 'multi',
    prompt: `${plural} Pick every one.`,
    scene: formScene(w, f),
    choices,
    answer: broken.map((c) => rowId(c.row)),
    explain: broken.map((c) => `${sentence(says(c))} ${formWhy(w, f, c.name, c.row)}`).join(' '),
    missTips,
    pickTips,
    hint: 'Here is one case, checked for you. Check the others the same way.',
    hintCase: formCase(w, f, says(shown), shown.row),
    teach: formTeach(w, f, cases.map((c) => ({ says: says(c), row: c.row }))),
    // The one-way reading misses the case where the second part happens alone.
    conflict: true,
  };
  return { tag: f, item, meta: { story: o.story, form: f, sym, rows: Object.fromEntries(cases.map((c) => [rowId(c.row), c.row])) } };
}

/** The if–then sentences a "say it with if" question offers: the right one and the two it is most often mixed up with. */
export const PICK_CONDS: Record<'only-if' | 'unless', readonly Cond[]> = {
  'only-if': [{ a: 'P', b: 'Q' }, { a: 'Q', b: 'P' }, { a: 'notP', b: 'notQ' }],
  unless: [{ a: 'notQ', b: 'P' }, { a: 'Q', b: 'notP' }, { a: 'Q', b: 'P' }],
};

/** What a wrong if–then sentence does to a form, by what it says. */
function pickHead(f: 'only-if' | 'unless', c: Cond): string {
  if (sameCond(c, MISREAD[f])) return f === 'only-if' ? 'Your answer turns the rule around. It reads “only if” as plain “if.”' : 'Your answer reads more into “unless” than its words say.';
  if (f === 'only-if') return 'Your answer puts NOT in both parts, and that changes the meaning.';
  return 'Your answer leaves out the NOT: the part after “unless” has to be false.';
}

/** A case the form keeps and the sentence breaks (else one the form breaks and the sentence keeps). */
const formTelltale = (c: Cond, f: FormKind) => ROWS.find((r) => formHolds(f, r) && !condHolds(c, r)) ?? ROWS.find((r) => condHolds(c, r) !== formHolds(f, r))!;
const formApart = (f: FormKind, r: Row, name: string) => (formHolds(f, r) ? `This case keeps the rule, but it breaks ${name}.` : `This case breaks the rule, but it keeps ${name}.`);

/** "Which if–then sentence means the same as the rule?" for “only if” or “unless”. Exactly one choice does. */
export function formPickItem(rng: Rng, o: { form: 'only-if' | 'unless'; story: StoryId }): FormMade {
  const f = o.form;
  const w = storyOf(o.story, f);
  const order = rng.shuffle(PICK_CONDS[f]);
  const choices = order.map((c) => ({ id: condId(c), label: storyIf(w, c) }));
  const right = order.filter((c) => sameAsForm(c, f));
  if (right.length !== 1) throw new Error('formPickItem: exactly one sentence must mean the same as the rule');
  const brk = formBroken(f)[0];
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of order) {
    if (sameAsForm(c, f)) continue;
    const t = formTelltale(c, f);
    const apart = formApart(f, t, 'your sentence');
    feedback[condId(c)] = {
      headline: pickHead(f, c),
      detail: [`Think of ${w.kase[rowKey(t)]}. ${apart}`, 'So your sentence does not mean the same as the rule.'],
      example: { label: sentence(cap(w.kase[rowKey(t)])), truths: [{ who: RULE_WHO, value: formHolds(f, t) }, { who: YOURS_WHO, value: condHolds(c, t) }], note: apart },
      simpler: [
        `Only ${w.kase[rowKey(brk)]} breaks the rule.`,
        `Think of ${w.kase[rowKey(t)]}.`,
        `Does it break the rule? ${formHolds(f, t) ? 'No' : 'Yes'}. Does it break “${bare(storyIf(w, c))}”? ${condHolds(c, t) ? 'No' : 'Yes'}.`,
        'One case breaks one sentence but not the other. So they do not mean the same.',
      ],
    };
  }
  // The hint checks one wrong choice (the first in the list) in the case that tells it apart from the rule.
  const off = order.find((c) => !sameAsForm(c, f))!;
  const offRow = formTelltale(off, f);
  const RIGHT_WHO = 'The if–then sentence';
  const item: ChooseCore = {
    kind: 'choose',
    prompt: 'Which if–then sentence means the same as the rule? Two sentences mean the same when the same cases break them.',
    scene: formScene(w, f),
    choices,
    answer: condId(right[0]),
    explain: `Only ${w.kase[rowKey(brk)]} breaks the rule. It is also the only case that breaks “${storyIf(w, right[0])}” So they mean the same.`,
    feedback,
    hint: `Here is one sentence, checked for you: “${storyIf(w, off)}” Check the others the same way.`,
    hintCase: {
      label: sentence(cap(w.kase[rowKey(offRow)])),
      truths: [{ who: RULE_WHO, value: formHolds(f, offRow) }, { who: THIS_WHO, value: condHolds(off, offRow) }],
      note: `${formApart(f, offRow, 'this sentence')} So this sentence does not mean the same as the rule.`,
    },
    teach: {
      rule: SAME_RULE,
      terms: [formTerm(w, f), BREAKS_SENTENCE_TERM],
      meaning: formMeaning(w, f),
      casesTitle: `Which cases break the rule? Which break “${bare(storyIf(w, right[0]))}”?`,
      cases: ROWS.map((r) => {
        const a = formHolds(f, r);
        const b = condHolds(right[0], r);
        return { label: sentence(cap(w.kase[rowKey(r)])), truths: [{ who: RULE_WHO, value: a }, { who: RIGHT_WHO, value: b }], note: a === b ? (a ? 'Neither one is broken.' : 'This case breaks the rule and the if–then sentence.') : formApart(f, r, 'the if–then sentence') };
      }),
      remember: [FORM_SAY[f], 'Ask: “Does any case break one sentence but not the other?”'],
      simpler: feedback[condId(MISREAD[f])]?.simpler ?? [],
    },
    tags: f === 'only-if' ? [ONLY_IF_TRAP] : [],
  };
  syncWhyWrong(item);
  return { tag: f, item, meta: { story: o.story, form: f, conds: Object.fromEntries(order.map((c) => [condId(c), c])) } };
}

// ----- lesson 7: needed and enough -----

/** “x is needed”: the other part can’t happen without x. “x is enough”: when x happens, the other part happens too. */
export type NeedId = 'needed-P' | 'needed-Q' | 'enough-P' | 'enough-Q';
export const NEED_IDS: readonly NeedId[] = ['needed-Q', 'enough-P', 'enough-Q', 'needed-P'];
/** A needed or enough sentence, said as an if–then rule: needed x is “If other, then x”, enough x is “If x, then other”. */
export function needCond(id: NeedId): Cond {
  const [word, x] = id.split('-') as ['needed' | 'enough', 'P' | 'Q'];
  const other: Lit = x === 'P' ? 'Q' : 'P';
  return word === 'needed' ? { a: other, b: x } : { a: x, b: other };
}
export type NeedSkin = 'dessert' | 'library' | 'dragons' | 'wizards' | 'letters' | 'pq';
export const NEED_SKINS: readonly NeedSkin[] = ['dessert', 'library', 'dragons', 'wizards', 'letters', 'pq'];
/** Each rule's needed and enough sentences, about each part. Their truth comes from needCond(), never from the words. */
export const NEED_WORDS: Record<NeedSkin, Record<NeedId, string>> = {
  dessert: {
    'needed-Q': 'Eating all your veggies is needed to get dessert.',
    'enough-Q': 'Eating all your veggies is enough to get dessert.',
    'needed-P': 'Getting dessert is needed to eat all your veggies.',
    'enough-P': 'Getting dessert is enough to know you ate all your veggies.',
  },
  library: {
    'needed-Q': 'Having a library card is needed to take a book home.',
    'enough-Q': 'Having a library card is enough to take a book home.',
    'needed-P': 'Taking a book home is needed to have a library card.',
    'enough-P': 'Taking a book home is enough to know you have a library card.',
  },
  dragons: {
    'needed-Q': 'Paying a gold coin is needed for a dragon to land in town.',
    'enough-Q': 'Paying a gold coin is enough for a dragon to land in town.',
    'needed-P': 'Landing in town is needed for a dragon to pay a gold coin.',
    'enough-P': 'Landing in town is enough to know a dragon paid a gold coin.',
  },
  wizards: {
    'needed-Q': 'Wearing a helmet is needed to ride a broom.',
    'enough-Q': 'Wearing a helmet is enough to ride a broom.',
    'needed-P': 'Riding a broom is needed to wear a helmet.',
    'enough-P': 'Riding a broom is enough to know you wear a helmet.',
  },
  letters: {
    'needed-Q': 'An even number is needed for a card to have a vowel.',
    'enough-Q': 'An even number is enough for a card to have a vowel.',
    'needed-P': 'A vowel is needed for a card to have an even number.',
    'enough-P': 'A vowel is enough to know a card has an even number.',
  },
  pq: { 'needed-Q': 'Q is needed for P.', 'enough-Q': 'Q is enough for P.', 'needed-P': 'P is needed for Q.', 'enough-P': 'P is enough for Q.' },
};
/** What a needed or enough sentence says about the rule's parts. */
const NEED_SAYS: Record<NeedId, string> = {
  'needed-Q': 'It says the THEN part is needed for the IF part.',
  'enough-P': 'It says the IF part is enough for the THEN part.',
  'enough-Q': 'It says the THEN part is enough for the IF part.',
  'needed-P': 'It says the IF part is needed for the THEN part.',
};
/** A wrong needed or enough sentence: the gap, by what it says. */
const NEED_HEAD: Record<'enough-Q' | 'needed-P', string> = {
  'enough-Q': 'Your answer reads “needed” as “enough.”',
  'needed-P': 'Your answer turns the rule around. It calls the IF part needed.',
};
export const NEEDED_TERM = { word: 'Needed', meaning: 'the other part can’t happen without this part.' };
export const ENOUGH_TERM = { word: 'Enough', meaning: 'when this part happens, the other part happens for sure.' };
export const NEED_RULE = 'In an if–then rule, the IF part is enough for the THEN part. The THEN part is needed for the IF part.';
const NEED_REMEMBER = ['The IF part is enough. The THEN part is needed.', 'Ask: “Can the THEN part happen without the IF part?” If it can, the THEN part is needed, not enough.'];

/** The smallest worked example for one needed or enough sentence against the rule. */
function needSteps(skin: NeedSkin, id: NeedId): string[] {
  const s = SKINS[skin];
  const c = needCond(id);
  const t = telltaleRow(c);
  const said = `“${bare(NEED_WORDS[skin][id])}”`;
  if (!t) {
    const only = brokenRows(RULE)[0];
    return [`Only ${s.kase[rowKey(only)]} breaks the rule.`, `It is also the only case that breaks ${said}.`.replace(/”\.$/, '.”'), 'No other case breaks the rule or this sentence. So they mean the same.'];
  }
  return [
    `Think of ${s.kase[rowKey(t.row)]}.`,
    `Does it break the rule? ${ruleHolds(t.row) ? 'No' : 'Yes'}.`,
    `Does it break ${said}? ${condHolds(c, t.row) ? 'No' : 'Yes'}.`,
    'One case breaks one sentence but not the other. So they do not mean the same.',
  ];
}

/** The teaching of a needed or enough question: the four cases with the rule and one sentence, each kept or broken. */
function needTeach(skin: NeedSkin, id: NeedId, who: string, name: string, trap: NeedId): Teach {
  const s = SKINS[skin];
  return {
    rule: NEED_RULE,
    terms: [ENOUGH_TERM, NEEDED_TERM],
    meaning: `${ruleMeaning(s)} ${cap(name)} is “${NEED_WORDS[skin][id]}”`,
    casesTitle: `Which cases break the rule? Which break ${name}?`,
    cases: sameCases(s, needCond(id), who, name),
    remember: NEED_REMEMBER,
    simpler: needSteps(skin, trap),
  };
}

/** One wrong needed or enough sentence's feedback, from the case that tells it apart from the rule. */
function needFeedback(skin: NeedSkin, id: 'enough-Q' | 'needed-P', yours: string): ChoiceFeedback {
  const s = SKINS[skin];
  const c = needCond(id);
  const t = telltaleRow(c);
  if (!t) throw new Error('needFeedback: this sentence means the same as the rule');
  const apart = apartLine(t.row, c, yours);
  return {
    headline: NEED_HEAD[id],
    detail: [`${cap(yours)} is “${NEED_WORDS[skin][id]}” ${NEED_SAYS[id]}`, `Think of ${s.kase[rowKey(t.row)]}. ${apart}`, `So ${yours} does not mean the same as the rule.`],
    example: { label: sentence(cap(s.kase[rowKey(t.row)])), truths: [{ who: RULE_WHO, value: ruleHolds(t.row) }, { who: yours === 'your sentence' ? YOURS_WHO : THIS_WHO, value: condHolds(c, t.row) }], note: apart },
    simpler: needSteps(skin, id),
  };
}

/** "Which sentence means the same as the rule?" One right needed or enough sentence, “needed” read as “enough”, and the rule turned around. */
export function needPickItem(rng: Rng, o: { skin: NeedSkin }): FormMade {
  const s = SKINS[o.skin];
  const right = rng.pick<NeedId>(['needed-Q', 'enough-P']);
  const order = rng.shuffle<NeedId>([right, 'enough-Q', 'needed-P']);
  const choices = order.map((id) => ({ id, label: NEED_WORDS[o.skin][id] }));
  const same = order.filter((id) => sameMeaning(needCond(id), RULE));
  if (same.length !== 1) throw new Error('needPickItem: exactly one sentence must mean the same as the rule');
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const id of order) if (id !== same[0]) feedback[id] = needFeedback(o.skin, id as 'enough-Q' | 'needed-P', 'your sentence');
  const off = order.find((id) => id !== same[0])!;
  const offRow = telltaleRow(needCond(off))!.row;
  const only = brokenRows(RULE)[0];
  const item: ChooseCore = {
    kind: 'choose',
    prompt: 'Which sentence means the same as the rule? Look at the words “needed” and “enough.”',
    scene: ruleScene(o.skin, 'compare'),
    choices,
    answer: same[0],
    explain: `“${bare(NEED_WORDS[o.skin][same[0]])}” ${NEED_SAYS[same[0]].replace(/^It says/, 'says')} Only ${s.kase[rowKey(only)]} breaks it, just like the rule.`,
    feedback,
    hint: `Here is one sentence, checked for you: “${NEED_WORDS[o.skin][off]}” Check the others the same way.`,
    hintCase: {
      label: sentence(cap(s.kase[rowKey(offRow)])),
      truths: [{ who: RULE_WHO, value: ruleHolds(offRow) }, { who: THIS_WHO, value: condHolds(needCond(off), offRow) }],
      note: `${apartLine(offRow, needCond(off), 'this sentence')} So this sentence does not mean the same as the rule.`,
    },
    teach: needTeach(o.skin, same[0], 'The right sentence', 'the right sentence', 'enough-Q'),
    tags: [NEED_TRAP],
  };
  syncWhyWrong(item);
  return { tag: 'need-enough', item, meta: { story: o.skin, need: Object.fromEntries(order.map((id) => [id, id])) } };
}

/** "Does this sentence mean the same as the rule?" for one needed or enough sentence. “Needed” read as “enough” is the trap. */
export function needYesNoItem(rng: Rng, o: { skin: NeedSkin; which?: NeedId }): FormMade {
  const s = SKINS[o.skin];
  const which = o.which ?? rng.pick(NEED_IDS);
  const c = needCond(which);
  const isSame = sameMeaning(c, RULE);
  const only = brokenRows(RULE)[0];
  let fb: ChoiceFeedback;
  if (isSame) {
    const k = s.kase[rowKey(only)];
    fb = {
      headline: 'Your answer misses that the same case breaks the rule and this sentence.',
      detail: [`This sentence is “${NEED_WORDS[o.skin][which]}” ${NEED_SAYS[which]}`, `Only ${k} breaks the rule. Only ${k} breaks this sentence too.`, 'So they mean the same.'],
      example: { label: sentence(cap(k)), truths: [{ who: RULE_WHO, value: ruleHolds(only) }, { who: THIS_WHO, value: condHolds(c, only) }], note: 'This is the only case that breaks the rule. It is also the only case that breaks this sentence.' },
      simpler: needSteps(o.skin, which),
    };
  } else {
    fb = needFeedback(o.skin, which as 'enough-Q' | 'needed-P', 'this sentence');
    fb.headline = which === 'enough-Q' ? NEED_HEAD['enough-Q'] : 'Your answer misses that this sentence turns the rule around.';
  }
  const tt = rowAt(true, true);
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `Does this sentence with “needed” or “enough” mean the same as the rule? “${NEED_WORDS[o.skin][which]}”`,
    scene: ruleScene(o.skin, 'compare'),
    choices: YES_NO,
    answer: isSame ? 'yes' : 'no',
    explain: isSame
      ? `${NEED_SAYS[which]} Only ${s.kase[rowKey(only)]} breaks it, just like the rule. So they mean the same.`
      : `${NEED_SAYS[which]} Think of ${s.kase[rowKey(telltaleRow(c)!.row)]}. ${apartLine(telltaleRow(c)!.row, c, 'this sentence')} So they do not mean the same.`,
    feedback: { [isSame ? 'no' : 'yes']: fb },
    hint: 'Here is one case, checked for you. Check the other three cases the same way.',
    // A case that keeps the rule and every needed or enough sentence, so the hint never gives the answer.
    hintCase: {
      label: sentence(cap(s.kase.TT)),
      truths: [{ who: RULE_WHO, value: ruleHolds(tt) }, { who: THIS_WHO, value: condHolds(c, tt) }],
      note: 'This case keeps the rule and this sentence. Now check the other three cases.',
    },
    teach: needTeach(o.skin, which, THIS_WHO, 'this sentence', isSame ? 'enough-Q' : which),
    tags: which === 'enough-Q' ? [NEED_TRAP] : [],
  };
  syncWhyWrong(item);
  if (which === 'enough-Q') item.conflict = true;
  return { tag: 'need-enough', item, meta: { story: o.skin, need: { one: which } } };
}

// ----- the closing why items: reasons as choices -----

/** One reason a why item offers: its words, and whether its claim is true (worked out from the table, never asserted). */
interface Reason {
  id: string;
  label: string;
  holds: boolean;
}

/** The rule-checker skins with needed and enough words: lesson 5's cards, looked at again in lesson 7. */
export const WHY_CARD_SKINS: readonly NeedSkin[] = NEED_SKINS.filter((s) => SKINS[s].cards);

/**
 * Lesson 7, the closing why item: why don't you need to turn over the card that shows the THEN part (the “4”)? The
 * right reason: the THEN part is needed for the IF part, not enough for it, so every back keeps the rule. The trap
 * reads “needed” as “enough” (its back must show the IF part).
 */
export function whyCardItem(rng: Rng, o: { skin: NeedSkin }): FormMade {
  const s = SKINS[o.skin];
  const cards = s.cards;
  if (!cards) throw new Error(`whyCardItem: ${o.skin} has no cards`);
  const sym = drawSymbols(rng);
  const face: Lit = 'Q';
  const shown = `“${cards.face(face, sym)}”`;
  const reasons: Reason[] = [
    { id: 'needed-not-enough', label: 'It shows the THEN part. That part is needed, not enough, so any back keeps the rule.', holds: partOf(face) === 'q' && !mustTurn(face) && statusOf(face, 'P') === 'maybe' },
    { id: 'back-must', label: `Its back must show ${ending(cards.back('P', sym), ',')} so the rule is kept.`, holds: statusOf(face, 'P') === 'must' },
    { id: 'only-if-card', label: 'Only the card that shows the IF part can break the rule.', holds: LITS.filter(mustTurn).every((l) => l === 'P') },
    { id: 'shows-if', label: 'It shows the IF part, and that part already happened.', holds: partOf(face) === 'p' },
  ];
  const right = reasons.filter((x) => x.holds);
  if (right.length !== 1) throw new Error('whyCardItem: exactly one reason must be true');
  const order = rng.shuffle(reasons);
  const backCase = (f: Lit, b: Lit): TeachCase => ({
    label: `A card with “${cards.face(f, sym)}” on the front and ${cards.back(b, sym)} on the back.`,
    truths: partTruths(cardRow(f, b)),
    note: rowNote(cardRow(f, b)),
  });
  const notQ = `“${cards.face('notQ', sym)}”`;
  const feedback: Record<string, ChoiceFeedback> = {
    'back-must': {
      headline: 'Your reason reads “needed” as “enough.”',
      detail: [`The card shows ${ending(shown, '.')} That is the THEN part.`, 'The THEN part is needed for the IF part. It is not enough to be sure the IF part happened.', `So its back could show ${ending(cards.back('notP', sym), '.')} The rule is still kept.`],
      example: backCase(face, 'notP'),
    },
    'only-if-card': {
      headline: 'Your reason leaves out the card that shows the THEN part did not happen.',
      detail: [`The card that shows ${notQ} can break the rule too.`, `With ${cards.back('P', sym)} on the back, the IF part happened, but the THEN part did not.`, 'So that card must be turned over.'],
      example: backCase('notQ', 'P'),
    },
    'shows-if': {
      headline: 'Your reason mixes up the parts. This card shows the THEN part, not the IF part.',
      detail: [`The IF part is “${s.parts.P.if}.” The THEN part is “${s.parts.Q.then ?? s.parts.Q.if}.”`, `The card shows ${ending(shown, '.')} So it shows the THEN part.`, 'The THEN part alone can’t break the rule.'],
      example: backCase(face, 'P'),
    },
  };
  for (const r of order) if (r.holds) delete feedback[r.id];
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `${cards.intro} The card that shows ${shown} does not need to be turned over. Why not?`,
    scene: ruleScene(o.skin, 'check'),
    choices: order.map((r) => ({ id: r.id, label: r.label })),
    answer: right[0].id,
    explain: `The card shows the THEN part. The THEN part is needed for the IF part, not enough for it. With ${backs(cards, face, sym)} on the back, the rule is kept.`,
    feedback,
    hint: 'Here is another card, checked for you. Check this card the same way.',
    hintCase: cardHintCase(s, 'P', sym),
    teach: {
      rule: CHECK_RULE,
      terms: [NEEDED_TERM, ENOUGH_TERM],
      meaning: ruleMeaning(s),
      casesTitle: `What could be on the back of the card that shows ${shown}?`,
      cases: otherPart(face).map((b) => backCase(face, b)),
      remember: ['The THEN part is needed, not enough. A card that shows it can’t break the rule.', ASK_CARD],
      simpler: cardSteps(s, face, sym),
    },
    tags: [WHY_TAG, NEED_TRAP],
  };
  syncWhyWrong(item);
  item.conflict = true;
  return { tag: 'need-enough', item, meta: { story: o.skin, sym, reasons: Object.fromEntries(reasons.map((r) => [r.id, r.holds])) } };
}

/**
 * Lesson 6, the closing why item: why does the rule with “only if” mean “If P, then Q” and not “If Q, then P”? The
 * right reason: the same one case breaks the rule and “If P, then Q”. The trap reads “only if” as plain “if”.
 */
export function whyOnlyIfItem(rng: Rng, o: { story: SkinId }): FormMade {
  const f: FormKind = 'only-if';
  const w = storyOf(o.story, f);
  const forward = FORM_CONDS[f][0];
  const turned = MISREAD[f];
  const brk = formBroken(f);
  if (brk.length !== 1 || !sameAsForm(forward, f) || sameAsForm(turned, f)) throw new Error('whyOnlyIfItem: the rule means its if–then form, not the turned one');
  const ft = rowAt(false, true);
  const ff = rowAt(false, false);
  const reasons: Reason[] = [
    { id: 'same-break', label: `The same one case breaks the rule and the first sentence: ${w.kase[rowKey(brk[0])]}.`, holds: sameAsForm(forward, f) },
    { id: 'only-if-is-if', label: '“Only if” works just like “if,” so the part after it is the IF part.', holds: sameAsForm(turned, f) },
    { id: 'then-alone', label: `${cap(w.kase[rowKey(ft)])} breaks the rule.`, holds: !formHolds(f, ft) },
    { id: 'neither', label: `${cap(w.kase[rowKey(ff)])} breaks the rule.`, holds: !formHolds(f, ff) },
  ];
  const right = reasons.filter((x) => x.holds);
  if (right.length !== 1) throw new Error('whyOnlyIfItem: exactly one reason must be true');
  const order = rng.shuffle(reasons);
  const FIRST = 'The first sentence';
  const SECOND = 'The second sentence';
  const kaseCase = (r: Row, note: string): TeachCase => ({
    label: sentence(cap(w.kase[rowKey(r)])),
    truths: [{ who: RULE_WHO, value: formHolds(f, r) }, { who: FIRST, value: condHolds(forward, r) }, { who: SECOND, value: condHolds(turned, r) }],
    note,
  });
  const feedback: Record<string, ChoiceFeedback> = {
    'only-if-is-if': {
      headline: 'Your reason reads “only if” as plain “if.”',
      detail: [`If it did, the rule would mean “${storyIf(w, turned)}”`, `Then ${w.kase[rowKey(ft)]} would break it. But that case keeps the rule.`, 'The part after “only if” is needed. It is the THEN part.'],
      example: kaseCase(ft, formApart(f, ft, 'the second sentence')),
    },
    'then-alone': {
      headline: `Your reason says ${w.kase[rowKey(ft)]} breaks the rule, but that case keeps it.`,
      detail: [`${cap(w.kase[rowKey(ft)])}: the part before “only if” did not happen.`, w.onlyAbout, 'So that case keeps the rule.'],
      example: kaseCase(ft, formNote(f, ft)),
    },
    neither: {
      headline: `Your reason says ${w.kase[rowKey(ff)]} breaks the rule, but that case keeps it.`,
      detail: [`${cap(w.kase[rowKey(ff)])}: the part before “only if” did not happen.`, w.onlyAbout, 'So that case keeps the rule.'],
      example: kaseCase(ff, formNote(f, ff)),
    },
  };
  const k = w.kase[rowKey(brk[0])];
  const item: ChooseCore = {
    kind: 'choose',
    prompt: `The rule means “${storyIf(w, forward)}” It does not mean “${storyIf(w, turned)}” Why?`,
    scene: formScene(w, f),
    choices: order.map((r) => ({ id: r.id, label: r.label })),
    answer: right[0].id,
    explain: `Only ${k} breaks the rule. It is also the only case that breaks the first sentence. So they mean the same.`,
    feedback,
    hint: 'Here is one case, checked for you. Check the other cases the same way.',
    hintCase: kaseCase(rowAt(true, true), 'This case keeps the rule and the two sentences. Now check the other three cases.'),
    teach: {
      rule: SAME_RULE,
      terms: [formTerm(w, f), BREAKS_SENTENCE_TERM],
      meaning: formMeaning(w, f),
      casesTitle: 'Which cases break the rule? Which break each sentence?',
      cases: ROWS.map((r) => kaseCase(r, formNote(f, r))),
      remember: [FORM_SAY[f], FORM_ASK[f]],
      simpler: [`Only ${k} breaks the rule.`, `Only ${k} breaks the first sentence too.`, `${cap(w.kase[rowKey(ft)])} breaks the second sentence, but it keeps the rule.`, 'So the rule means the first sentence.'],
    },
    tags: [WHY_TAG, ONLY_IF_TRAP],
  };
  syncWhyWrong(item);
  item.conflict = true;
  return { tag: f, item, meta: { story: o.story, form: f, reasons: Object.fromEntries(reasons.map((r) => [r.id, r.holds])) } };
}

// ----- lessons 6 and 7: the boards -----

/** Why one box keeps or breaks a form: said when the learner marks it the other way. */
function formBoxWhy(w: Story, f: FormKind, r: Row): string {
  const is = `This box is for ${w.kase[rowKey(r)]}.`;
  if (!formHolds(f, r)) {
    const line = f === 'only-if' ? 'The part before “only if” happened without the part after it.' : f === 'unless' ? 'Neither part happened.' : 'One part happened without the other.';
    return `${is} ${line} That breaks the rule, so this box gets a ✗, not a ✓.`;
  }
  let line: string;
  if (f === 'only-if') line = r.p ? 'The part after “only if” happened too.' : `The part before “only if” did not happen. ${w.onlyAbout}`;
  else if (f === 'unless') line = r.q ? `The part after “unless” happened. ${w.onlyAbout}` : 'The part before “unless” happened.';
  else line = r.p ? 'The two parts happened together.' : 'Neither part happened, so no part happened alone.';
  return `${is} ${line} That keeps the rule, so this box gets a ✓, not a ✗.`;
}

/** The mix-up each form's four boxes can show: the misreading marks the box it gets wrong. */
function formBoxMix(w: Story, f: FormKind): Misconception {
  const r = ROWS.find((x) => misreadMatters(f, x) && formHolds(f, x) === (f !== 'iff'))!;
  const mark = `${litOf('p', r.p)}-${litOf('q', r.q)}`;
  const k = cap(w.kase[rowKey(r)]);
  const text: Record<FormKind, string> = {
    'only-if': `You may be treating “only if” and plain “if” as the same thing. They are two different things: the part after “only if” is needed, not enough. ${k} keeps this rule.`,
    unless: `You may be treating “${bare(formText(w, f))}” and “${bare(storyIf(w, MISREAD[f]))}” as the same thing. They are two different things: when the part after “unless” happens, the rule makes no promise. ${k} keeps it.`,
    iff: `You may be treating “if and only if” and plain “if” as the same thing. They are two different things: “if and only if” works each way. ${k} breaks it.`,
  };
  return { id: `${f}-misread`, when: 'picks', picks: { [mark]: ynId(!formHolds(f, r)) }, text: text[f] };
}

/**
 * Lessons 6 and 7: the four boxes of a rule with “only if”, “unless” or “if and only if”, empty. Rows are the part
 * before the word and its NOT; columns the part after it and its NOT. ✓ keeps the rule, ✗ breaks it.
 */
export function formBoxDrill(w: Story, f: FormKind, t: BoardText): DrillStep {
  const cols: Lit[] = ['Q', 'notQ'];
  const rows: DrillRow[] = (['P', 'notP'] as const).map((rl) => ({
    id: rl,
    label: w.face[rl],
    marks: cols.map((cl): DrillMark => {
      const r = ROWS.find((x) => litHolds(rl, x) && litHolds(cl, x))!;
      const kept = formHolds(f, r);
      return { id: `${rl}-${cl}`, label: w.face[cl], options: yesNo(), answer: ynId(kept), why: { [ynId(!kept)]: formBoxWhy(w, f, r) } };
    }),
  }));
  const broken = formBroken(f).map((b) => `“${w.face[litOf('p', b.p)]}” with “${w.face[litOf('q', b.q)]}`);
  const done =
    broken.length === 1
      ? `Right. Only one box breaks the rule: ${broken[0]}.” The other three boxes keep the rule.`
      : `Right. Two boxes break the rule: ${broken[0]},” and ${broken[1]}.” In each one, one part happened without the other.`;
  return {
    id: t.id,
    title: t.title,
    body: t.body,
    scene: formScene(w, f),
    ...twinOf(t),
    rows,
    columns: cols.map((c) => w.face[c]),
    caption: '✓ keeps the rule. ✗ breaks it.',
    done,
    misconceptions: [formBoxMix(w, f)],
  };
}

/** One column of a sentence grid: its short name, the sentence's name in words, and when a case keeps it. */
export interface GridColumn {
  id: string;
  label: string;
  /** "the plain-if rule" */
  name: string;
  holds(r: Row): boolean;
  /** The column is shown marked (the worked case), not tapped. */
  given?: boolean;
  /** Why a box of this column keeps or breaks its sentence (starts with the case's label). */
  why?(r: Row, label: string): string;
}

/** An if–then column: its marks and the words for a wrong tap come from condHolds() on its IF part and THEN part. */
export function condColumn(w: Story, id: string, label: string, name: string, c: Cond): GridColumn {
  return {
    id,
    label,
    name,
    holds: (r) => condHolds(c, r),
    why: (r, k) => {
      const ifp = `“${w.parts[c.a].if},”`;
      const thenp = `“${thenOf(w, c.b)},”`;
      const a = litHolds(c.a, r);
      const b = litHolds(c.b, r);
      if (a && !b) return `${k}: the IF part, ${ifp} is true. The THEN part, ${thenp} is false. That breaks ${name}, so this box gets a ✗, not a ✓.`;
      if (!a) return `${k}: the IF part, ${ifp} is false. So ${name} asks for nothing here. It is kept, so this box gets a ✓, not a ✗.`;
      return `${k}: the IF part, ${ifp} is true. The THEN part, ${thenp} is true too. That keeps ${name}, so this box gets a ✓, not a ✗.`;
    },
  };
}

/** A needed or enough column (lesson 7), with words about the rule's IF part and THEN part. */
export function needColumn(id: NeedId, label: string, name: string): GridColumn {
  const c = needCond(id);
  return {
    id,
    label,
    name,
    holds: (r) => condHolds(c, r),
    why: (r, k) => {
      const needed = id.startsWith('needed');
      const [part, other] = partOf(id.endsWith('P') ? 'P' : 'Q') === 'p' ? ['IF', 'THEN'] : ['THEN', 'IF'];
      const a = litHolds(c.a, r);
      const b = litHolds(c.b, r);
      if (needed) {
        if (a && !b) return `${k}: the ${other} part happened without the ${part} part. The needed part is missing, so this box gets a ✗, not a ✓.`;
        if (!a) return `${k}: the ${other} part did not happen, so nothing was needed. That keeps ${name}, so this box gets a ✓, not a ✗.`;
        return `${k}: the ${other} part happened, and the needed ${part} part is there. That keeps ${name}, so this box gets a ✓, not a ✗.`;
      }
      if (a && !b) return `${k}: the ${part} part happened, but the ${other} part did not. So it was not enough, and this box gets a ✗, not a ✓.`;
      if (!a) return `${k}: the ${part} part did not happen, so ${name} promises nothing. That keeps it, so this box gets a ✓, not a ✗.`;
      return `${k}: the ${part} part happened, and the ${other} part did too. That keeps ${name}, so this box gets a ✓, not a ✗.`;
    },
  };
}

/**
 * A sentence grid (lessons 6 and 7): the four cases as rows, one column per sentence. The given column is the worked
 * case; the learner marks the others: ✓ when the case keeps that sentence, ✗ when it breaks it. The last words say which
 * column breaks in the same box as the given one, worked out from the marks' answers.
 */
export function sentenceGridDrill(kase: Record<RowKey, string>, scene: Scene, t: BoardText, cols: GridColumn[]): DrillStep {
  const given = cols.find((c) => c.given);
  if (!given) throw new Error('sentenceGridDrill: one column is the worked case');
  const rows: DrillRow[] = ROWS.map((r) => {
    const label = cap(kase[rowKey(r)]);
    return {
      id: rowKey(r),
      label,
      marks: cols.map((col): DrillMark => {
        const kept = col.holds(r);
        const base = { id: `${rowKey(r)}-${col.id}`, label: col.label, options: yesNo(), answer: ynId(kept) };
        return col.given ? { ...base, given: true, why: {} } : { ...base, why: { [ynId(!kept)]: col.why!(r, label) } };
      }),
    };
  });
  const brokenBy = (col: GridColumn) => ROWS.filter((r) => !col.holds(r));
  const list = (rs: Row[]) => rs.map((r) => kase[rowKey(r)]).join(' and ');
  const out = [`Right. ${cap(given.name)} breaks only for ${list(brokenBy(given))}.`];
  for (const col of cols.filter((c) => !c.given)) {
    const same = JSON.stringify(brokenBy(col)) === JSON.stringify(brokenBy(given));
    out.push(same ? `${cap(col.name)} breaks in the same box, so it means the same.` : `${cap(col.name)} breaks for ${list(brokenBy(col))} instead, so it does not mean the same.`);
  }
  return { id: t.id, title: t.title, body: t.body, scene, ...twinOf(t), rows, columns: cols.map((c) => c.label), caption: '✓ keeps the sentence. ✗ breaks it.', done: out.join(' ') };
}

// ----- lessons 6 and 7: the distinctions -----

/** “Only if” vs plain “if” (lesson 6): the part after “only if” is needed; the part after plain “if” is enough. */
export const ONLY_IF_VS_IF: Distinction = {
  id: 'only-if-vs-if',
  a: '“P only if Q”: the part after “only if” is needed. It means “If P, then Q.”',
  b: '“P if Q”: the part after plain “if” is enough. It means “If Q, then P.”',
};

/** Needed vs enough (lesson 7). */
export const NEEDED_VS_ENOUGH: Distinction = {
  id: 'needed-vs-enough',
  a: 'Needed: the other part can’t happen without this part.',
  b: 'Enough: when this part happens, the other part happens for sure.',
};

/** The last line of “I’m confused” on a lesson 6 or 7 board. */
export const ONLY_IF_CLOSING = 'Those two ideas are apart now. The part after “only if” is needed. The part after plain “if” is enough.';
export const NEED_CLOSING = 'Those two ideas are apart now. The IF part is enough. The THEN part is needed, not enough.';

/**
 * “Only if” vs plain “if” (lesson 6): the same case, a kid with a library card who took no book home, under the rule
 * with “only if” and under the same words with plain “if”. The case did not change; only the words did.
 */
export function onlyIfContrast(): Extract<Scene, { kind: 'contrast' }> {
  const w = storyOf('library', 'only-if');
  const r = rowAt(false, true);
  const name = 'Kai';
  const world = `${w.says(name, r, CLASSIC)}.`;
  const onlyIf: ContrastPanel = {
    world,
    who: 'The only-if rule',
    says: formText(w, 'only-if'),
    truth: formHolds('only-if', r),
    because: `${w.fact('notP', name)}. The part before “only if” did not happen, so the rule asks for nothing.`,
    then: 'This case keeps the only-if rule.',
  };
  const plain: ContrastPanel = {
    world,
    who: 'The plain-if rule',
    says: plainIfText(w),
    truth: condHolds(MISREAD['only-if'], r),
    because: `${w.fact('Q', name)}, so this rule needs “${w.parts.P.if}.” But ${lead(w.fact('notP', name))}.`,
    then: 'This case breaks the plain-if rule.',
  };
  if (onlyIf.truth === plain.truth) throw new Error('onlyIfContrast: the two rules must come out apart');
  return {
    kind: 'contrast',
    pairs: [onlyIf, plain],
    ask: { q: `Did ${name} change?`, a: 'No. Only the words changed. With “only if,” the library card is needed. With plain “if,” the card would be enough.' },
    words: { worldTag: 'The case', saysWord: 'says:', truth: 'Kept', untruth: 'Broken' },
  };
}

/**
 * Needed vs enough (lesson 7): the same case, Dee ate all the veggies and got no dessert, under “needed” and under
 * “enough”. Dee did not change; only one word did.
 */
export function needContrast(): Extract<Scene, { kind: 'contrast' }> {
  const s = SKINS.dessert;
  const r = rowAt(false, true);
  const name = 'Dee';
  const world = `${s.says(name, r)}.`;
  const needed: ContrastPanel = {
    world,
    who: 'The needed sentence',
    says: NEED_WORDS.dessert['needed-Q'],
    truth: condHolds(needCond('needed-Q'), r),
    because: `${s.fact('notP', name)}, so nothing was needed.`,
    then: 'This case keeps the needed sentence.',
  };
  const enough: ContrastPanel = {
    world,
    who: 'The enough sentence',
    says: NEED_WORDS.dessert['enough-Q'],
    truth: condHolds(needCond('enough-Q'), r),
    because: `${s.fact('Q', name)}, but ${lead(s.fact('notP', name))}. So the veggies were not enough.`,
    then: 'This case breaks the enough sentence.',
  };
  if (needed.truth === enough.truth) throw new Error('needContrast: the two sentences must come out apart');
  return {
    kind: 'contrast',
    pairs: [needed, enough],
    ask: { q: `Did ${name} change?`, a: 'No. Only one word changed. Needed is not the same as enough.' },
    words: { worldTag: 'The case', saysWord: 'says:', truth: 'Kept', untruth: 'Broken' },
  };
}

/** “I’m confused” on the lesson 6 boards, asked in another story so it never gives a board's own mark. */
export function onlyIfConfused(): ConfusedQuestion[] {
  const w = storyOf('dessert', 'only-if');
  const needed = FORM_CONDS['only-if'][0].b;
  return [
    {
      q: `In “${bare(formText(w, 'only-if'))},” which part is needed?`,
      options: [opt(cap(w.parts[needed].if), true), opt(cap(w.parts[FORM_CONDS['only-if'][0].a].if)), opt('Not sure')],
      teach: `The part after “only if” is needed: “${w.parts.Q.if}.” So the rule means “${storyIf(w, FORM_CONDS['only-if'][0])}” It does not mean “${storyIf(w, MISREAD['only-if'])}”`,
    },
  ];
}

/** “I’m confused” on the “unless” boards: what the rule promises when the part after “unless” happens (another story). */
export function unlessConfused(): ConfusedQuestion[] {
  const w = storyOf('store', 'unless');
  const tt = rowAt(true, true);
  const kept = formHolds('unless', tt);
  return [
    {
      q: `Say the rule is “${bare(formText(w, 'unless'))}.” On a holiday, can the store still be open?`,
      options: [opt('Yes. On a holiday, the rule makes no promise', kept), opt('No. That breaks the rule', !kept), opt('Not sure')],
      teach: `${kept ? 'Yes' : 'No'}. The rule means “${storyIf(w, FORM_CONDS.unless[0])}” ${w.onlyAbout} On a holiday, an open store keeps it, and a closed store keeps it too.`,
    },
  ];
}

/** “I’m confused” on the “if and only if” boards and the needed and enough board (another story than the board's). */
export function iffConfused(): ConfusedQuestion[] {
  const w = storyOf('library', 'iff');
  const ft = rowAt(false, true);
  const kept = formHolds('iff', ft);
  return [
    {
      q: `Say the rule is “${bare(formText(w, 'iff'))}.” Can a kid with a library card take no book home?`,
      options: [opt('Yes. That keeps the rule', kept), opt('No. That breaks the rule', !kept), opt('Not sure')],
      teach: `${kept ? 'Yes' : 'No'}. “If and only if” works each way. It also means “${storyIf(w, FORM_CONDS.iff[1])}” So a kid with a card must take a book home.`,
    },
  ];
}

export function needConfused(): ConfusedQuestion[] {
  const s = 'library';
  const enough = sameMeaning(needCond('enough-Q'), RULE);
  return [
    {
      q: `The rule is “${bare(ruleText(s))}.” Is having a library card enough to take a book home?`,
      options: [opt('No. It is needed, not enough', !enough), opt('Yes. It is enough', enough), opt('Not sure')],
      teach: `${enough ? 'Yes' : 'No'}. ${cap(SKINS[s].kase.FT)} keeps the rule. So a card is needed for a book, but it is not enough to get one.`,
    },
  ];
}
