/**
 * Stop 2 · NOT, AND, OR.
 *
 * Five lessons: NOT, AND, OR (one part or both parts), brackets (De Morgan), and guessing a rule
 * machine's rule. Every answer, diagnose set and explanation is computed from the rule engine in
 * ../engine/puzzles/rules.ts; nothing is hand-asserted. Items come in three skins: plain cards
 * (abstract), everyday stories and fantasy stories.
 *
 * Each lesson is See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026). See: a key-idea card shows one rule on a
 * row of cards with every card already marked. Do: the same cards stay up, and the learner taps Fits or Not on each
 * card for a new rule of the same family (Guess the rule: tests a rule card by card, then keeps it or rules it out).
 * Quiz: try 1 is a twin rule on the same cards in a new order, pictures up; the other tries stay in the family the
 * lesson taught. A AND NOT B and (A OR B) AND NOT C have no marked example and no board yet, so no quiz, check or
 * Arcade item uses them (untaughtItems keeps them built for the later lesson that teaches them). Every hint shows one
 * card already worked through, never the answer.
 *
 * Story rules are stated both ways ("every cookie that is red, and no other cookies"), because the
 * answer key reads them both ways: a cookie is packed exactly when it fits the rule. In feedback
 * text, a rule named inside a sentence is put in curly quotes so it does not run into the words
 * around it.
 *
 * Wrong answers teach first (docs/CONTENT_GUIDE.md, "Wrong answers: teach first"). Every item carries
 * `teach`: the operator's meaning, the words it needs, and one card for each way a card can go (both parts
 * true, one part, no part), with each truth computed by evaluate(). Every wrong choice of a choose item has
 * its own ChoiceFeedback: a headline naming that answer's gap and a counterexample card. Tap-all items name
 * the exact misreading (OR read as "one but not both", a missed NOT, a NOT on the wrong part, ...) and every
 * one-card slip through `diagnose`. Choice ids come from the card or the rule, never from a position.
 */
import {
  ALL_CARDS,
  ALL_FEATURES,
  FEATURE_PAIRS,
  KINDS,
  LITERALS,
  RULE_POOL,
  and,
  cardFitting,
  cardId,
  cardName,
  cardTestRow,
  colorIs,
  copiedMarkPicks,
  deckRow,
  deckTwins,
  differences,
  drawThings,
  evaluate,
  featureText,
  featuresOf,
  firstMismatch,
  has,
  is,
  makeRuleGuess,
  matchRow,
  matchesMark,
  not,
  or,
  parse,
  pickIds,
  picksLike,
  render,
  rightPicks,
  ruleId,
  ruleTestRow,
  sameCard,
  sameFeature,
  sameMeaning,
  shapeIs,
  showsEveryWay,
  shuffledDeck,
  sizeIs,
  twoFeatures,
  withoutBrackets,
} from '../engine/puzzles/rules';
import type { Card, CardWords, Feature, FeatureKind, Formula, MatchWords, RuleGuess } from '../engine/puzzles/rules';
import { syncWhyWrong } from '../engine/teach';
import type {
  BoardWords,
  ChoiceFeedback,
  ChooseItem,
  ConfusedQuestion,
  ContrastPanel,
  ContrastWords,
  Distinction,
  DrillRow,
  DrillStep,
  IdeaCard,
  Item,
  LessonDef,
  LessonPass,
  Rng,
  Scene,
  StopDef,
  TapAllItem,
  Teach,
  TeachCase,
  Thing,
  Truth,
} from '../engine/types';

const STOP = 2;

// ---------- skins ----------

type SkinKey = 'abstract' | 'everyday' | 'fantasy';

interface Skin {
  key: SkinKey;
  one: string;
  many: string;
  tap(rule: string): string;
  count(rule: string): string;
  fit(rule: string): string;
  notFit(rule: string): string;
  yesNo(rule: string): string;
  /** Plural question: "Which cards fit the rule NOT red?" */
  which(rule: string): string;
  guess: string;
}

interface Story {
  one: string;
  many: string;
  rule(r: string): string;
  tap: string;
  count: string;
  fit: string;
  notFit: string;
  yesNo: string;
  which: string;
  guess: string;
}

const story = (key: SkinKey, s: Story): Skin => ({
  key,
  one: s.one,
  many: s.many,
  tap: (r) => `${s.rule(r)} ${s.tap}`,
  count: (r) => `${s.rule(r)} ${s.count}`,
  fit: (r) => `${s.rule(r)} ${s.fit}`,
  notFit: (r) => `${s.rule(r)} ${s.notFit}`,
  yesNo: (r) => `${s.rule(r)} ${s.yesNo}`,
  which: (r) => `${s.rule(r)} ${s.which}`,
  guess: s.guess,
});

/**
 * "Which card does not fit": a small "not", so it cannot be read as part of the rule (rules write NOT in
 * capitals: "Which card does NOT fit the rule a circle OR blue?" could be read as the rule "NOT a circle").
 */
const ABSTRACT: Skin = {
  key: 'abstract',
  one: 'card',
  many: 'cards',
  tap: (r) => `Tap every card that is ${r}.`,
  count: (r) => `How many cards fit the rule ${r}?`,
  fit: (r) => `Which card fits the rule ${r}?`,
  notFit: (r) => `Which card does not fit the rule ${r}?`,
  yesNo: (r) => `Does this card fit the rule ${r}?`,
  which: (r) => `Which cards fit the rule ${r}?`,
  guess: 'A rule machine lets a card through (yes) if it fits the secret rule. It stops (no) every other card. Which rule is it using?',
};

/**
 * Story rules say both directions ("every cookie that is red, and no other cookies"), so a careful
 * reader knows the red cookies are packed and every other cookie is left out. Guess-the-rule stories
 * say the same thing: each thing that fits gets a yes, and every other thing gets a no.
 */
const SKINS: Record<SkinKey, readonly Skin[]> = {
  abstract: [ABSTRACT],
  everyday: [
    story('everyday', {
      one: 'cookie', many: 'cookies',
      rule: (r) => `Jo packs every cookie that is ${r}, and no other cookies.`,
      tap: 'Tap each cookie she packs.',
      count: 'How many of these cookies does she pack?',
      fit: 'Which of these cookies does she pack?',
      notFit: 'Which cookie does she leave out?',
      yesNo: 'Will she pack this cookie?',
      which: 'Which cookies does she pack?',
      guess: 'A robot at the cookie shop keeps each cookie that fits its rule (yes). It sends back every other cookie (no). Which rule is it using?',
    }),
    story('everyday', {
      one: 'sticker', many: 'stickers',
      rule: (r) => `Sam wants every sticker that is ${r}, and no other stickers.`,
      tap: 'Tap each sticker he wants.',
      count: 'How many of these stickers does he want?',
      fit: 'Which of these stickers does he want?',
      notFit: 'Which sticker does he not want?',
      yesNo: 'Does he want this sticker?',
      which: 'Which stickers does he want?',
      guess: 'A sticker sorter keeps each sticker that fits its rule (yes). It puts back every other sticker (no). Which rule is it using?',
    }),
    story('everyday', {
      one: 'tile', many: 'tiles',
      rule: (r) => `The art class needs every tile that is ${r}, and no other tiles.`,
      tap: 'Tap each tile they need.',
      count: 'How many of these tiles do they need?',
      fit: 'Which of these tiles do they need?',
      notFit: 'Which tile do they not need?',
      yesNo: 'Do they need this tile?',
      which: 'Which tiles do they need?',
      guess: 'A helper picks tiles for the art class. Each tile that fits the helper’s rule gets a yes. Every other tile gets a no. Which rule is the helper using?',
    }),
  ],
  fantasy: [
    story('fantasy', {
      one: 'gem', many: 'gems',
      rule: (r) => `A magic door opens for every gem that is ${r}, and for no other gems.`,
      tap: 'Tap each gem that opens it.',
      count: 'How many of these gems open it?',
      fit: 'Which of these gems opens it?',
      notFit: 'Which gem does not open it?',
      yesNo: 'Does this gem open the door?',
      which: 'Which gems open it?',
      guess: 'A troll guards a bridge. He lets each gem that fits his rule cross (yes). He stops every other gem (no). Which rule is he using?',
    }),
    story('fantasy', {
      one: 'snack', many: 'snacks',
      rule: (r) => `The dragon eats every snack that is ${r}, and no other snacks.`,
      tap: 'Tap each snack it eats.',
      count: 'How many of these snacks does it eat?',
      fit: 'Which of these snacks does it eat?',
      notFit: 'Which snack does it not eat?',
      yesNo: 'Will it eat this snack?',
      which: 'Which snacks does it eat?',
      guess: 'The dragon eats each snack that fits its rule (yes). It pushes every other snack away (no). Which rule is it using?',
    }),
    story('fantasy', {
      one: 'shield', many: 'shields',
      rule: (r) => `The knight takes every shield that is ${r}, and no other shields.`,
      tap: 'Tap each shield she takes.',
      count: 'How many of these shields does she take?',
      fit: 'Which of these shields does she take?',
      notFit: 'Which shield does she not take?',
      yesNo: 'Will she take this shield?',
      which: 'Which shields does she take?',
      guess: 'The wizard’s gate lets each shield that fits its rule pass (yes). It stops every other shield (no). Which rule is it using?',
    }),
  ],
};

const SKIN_KEYS: readonly SkinKey[] = ['abstract', 'everyday', 'fantasy'];
const skinOf = (rng: Rng, key: SkinKey): Skin => rng.pick(SKINS[key]);

/** k skins: the first plain cards, then one everyday and one fantasy (random order), then any. */
function lessonSkins(rng: Rng, k: number): Skin[] {
  const keys: SkinKey[] = ['abstract', ...rng.shuffle<SkinKey>(['everyday', 'fantasy'])];
  while (keys.length < k) keys.push(rng.pick(SKIN_KEYS));
  return keys.slice(0, k).map((key) => skinOf(rng, key));
}

// ---------- words ----------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const ft = featureText;
const R = (f: Formula) => render(f);
/**
 * A rule named inside a feedback sentence, in curly quotes: “red AND a circle”. With end '.' or ','
 * the mark goes inside the closing quote: “red AND a circle.” Prompts show rules without quotes.
 */
const Q = (f: Formula, end = '') => `“${render(f)}${end}”`;
const the = (c: Card) => `the ${cardName(c)}`;
const The = (c: Card) => cap(the(c));
const aName = (c: Card) => `a ${cardName(c)}`;
const tw = (v: boolean) => (v ? 'true' : 'false');
const yn = (v: boolean) => (v ? 'Yes' : 'No');

/** 'the big red circle, the small blue square, and the big yellow triangle' */
function names(cs: readonly Card[]): string {
  const ns = cs.map(the);
  if (ns.length <= 2) return ns.join(' and ');
  return `${ns.slice(0, -1).join(', ')}, and ${ns[ns.length - 1]}`;
}

/** 'red cards', 'circles' (or 'red card', 'circle' when n is 1). */
const group = (f: Feature, s: Skin, n = 2) =>
  f.kind === 'shape' ? plural(n, f.value, `${f.value}s`) : `${f.value} ${plural(n, s.one, s.many)}`;

/** 'blue cards and yellow cards' (never 'blue and yellow cards', which reads as both colors), 'squares and triangles', 'small cards' */
function groups(fs: readonly Feature[], s: Skin): string {
  if (fs[0].kind === 'shape') return fs.map((f) => `${f.value}s`).join(' and ');
  return fs.map((f) => `${f.value} ${s.many}`).join(' and ');
}

/** '2 cards fit' (used after 'In all,' or mid-sentence, never to start a sentence). */
const nFit = (n: number, s: Skin) => `${n} ${plural(n, `${s.one} fits`, `${s.many} fit`)}`;

/** 'cards that fit both parts', or 'card that fits both parts' when there is just one. */
const fitBoth = (n: number, s: Skin) => (n === 1 ? `${s.one} that fits both parts` : `${s.many} that fit both parts`);

/** 'red', 'big', 'circles': a feature said of many cards ("some of them are not circles"). */
const ftPl = (f: Feature) => (f.kind === 'shape' ? `${f.value}s` : f.value);

/** "is red" or "is not red": one feature of one card. */
const fact = (f: Feature, c: Card) => (has(c, f) ? `is ${ft(f)}` : `is not ${ft(f)}`);

// ---------- rule parts ----------

type Join = { op: 'and' | 'or'; a: Formula; b: Formula };
const isJoin = (f: Formula): f is Formula & Join => f.op === 'and' || f.op === 'or';

/** A one-feature part: “red” or “NOT red”. */
const literal = (p: Formula) => p.op === 'is' || (p.op === 'not' && p.a.op === 'is');

/** The feature a one-feature part is about: red, for “red” and for “NOT red”. */
function featOf(p: Formula): Feature {
  if (p.op === 'is') return p.f;
  if (p.op === 'not' && p.a.op === 'is') return p.a.f;
  throw new Error(`${render(p)} is not a one-feature part`);
}

/** "is red" / "is not a circle": what a one-feature part asks of a card. */
const asks = (p: Formula) => (p.op === 'is' ? `is ${ft(p.f)}` : `is not ${ft(featOf(p))}`);

/** "Is it red? Yes." For a NOT part: "Is it a circle? Yes. So “NOT a circle” is false." */
function ask(p: Formula, c: Card): string {
  const f = featOf(p);
  const q = `Is it ${ft(f)}? ${yn(has(c, f))}.`;
  return p.op === 'is' ? q : `${q} So ${Q(p)} is ${tw(evaluate(p, c))}.`;
}

/** The four kinds of card for two parts: both, only A, only B, neither. */
const quads = (A: Formula, B: Formula): Formula[] => [and(A, B), and(A, not(B)), and(not(A), B), and(not(A), not(B))];

// ---------- teaching: cards, truths and reasons, all computed ----------

/** “It is red: true”. For a NOT part or anything bigger: “It fits “NOT a circle”: false”. */
function partTruth(p: Formula, c: Card): Truth {
  if (p.op === 'is') return { who: `It is ${ft(p.f)}`, value: has(c, p.f) };
  return fitsTruth(p, c);
}
const fitsTruth = (f: Formula, c: Card): Truth => ({ who: `It fits ${Q(f)}`, value: evaluate(f, c) });
const yourTruth = (f: Formula, c: Card): Truth => ({ who: `It fits your answer, ${Q(f)}`, value: evaluate(f, c) });
const rightTruth = (f: Formula, c: Card): Truth => ({ who: `It fits the right answer, ${Q(f)}`, value: evaluate(f, c) });

/**
 * A rule machine's case card reads its truth rows as yes and no: "Its mark: no", "It fits “blue”: no". Never "It got a
 * yes: false", a double negative on exactly the card where the mark and the rule agree on no.
 */
const YES_NO_WORDS: BoardWords = { truth: 'yes', untruth: 'no' };

/** One card as a worked case: its name in words (enough without the picture), the card, its truths and a note. */
function cardCase(c: Card, truths: Truth[], note?: string, opts: { the?: boolean; mark?: 'yes' | 'no' } = {}): TeachCase {
  return {
    label: `${opts.the ? The(c) : cap(aName(c))}.`,
    things: [{ id: cardId(c), shape: c.shape, color: c.color, size: c.size, ...(opts.mark ? { mark: opts.mark } : {}) }],
    truths,
    ...(note ? { note } : {}),
    // A card with a machine mark is a rule machine's card: its truth rows say yes and no.
    ...(opts.mark ? { words: YES_NO_WORDS } : {}),
  };
}

/**
 * The first card that fits f: one of the shown cards when one fits, else the first of all 18. No rng, so an
 * item always teaches with the same cards and the item stream stays the same.
 */
function example(f: Formula, shown: readonly Card[] = []): Card {
  const c = shown.find((t) => evaluate(f, t)) ?? ALL_CARDS.find((t) => evaluate(f, t));
  if (!c) throw new Error(`no card fits ${render(f)}`);
  return { shape: c.shape, color: c.color, size: c.size };
}

/**
 * For a rule with two parts: does this card fit, and which part decides it? `said` is a part whose truth the
 * sentence before has just worked out ("So “NOT small” is false."), so it is not named again.
 */
function joinVerdict(f: Join, c: Card, s: Skin, said?: Formula): string {
  const va = evaluate(f.a, c), vb = evaluate(f.b, c);
  if (f.op === 'and') {
    if (va && vb) return `Both parts of ${Q(f)} are true, so it fits.`;
    if (!va && !vb) return `Both parts of ${Q(f)} are false, so it does not fit.`;
    const off = va ? f.b : f.a;
    return `${off === said ? '' : `The part ${Q(off)} is false. `}AND needs both parts, so it does not fit.`;
  }
  if (va && vb) return `Both parts of ${Q(f)} are true. OR takes a ${s.one} that fits both parts, so it fits.`;
  if (va || vb) {
    const on = va ? f.a : f.b;
    return `${on === said ? '' : `The part ${Q(on)} is true. `}One part is enough for OR, so it fits.`;
  }
  return `No part of ${Q(f)} is true, so it does not fit.`;
}

/**
 * (A OR B) AND NOT C: the part in brackets and the last part. With `named`, the sentence before has already
 * said whether each part is true, so only the AND step is left.
 */
function groupVerdict(f: Join, c: Card, named = false): string {
  const vx = evaluate(f.a, c), vy = evaluate(f.b, c);
  if (vx && vy) return 'The part in brackets and the last part are true, so it fits.';
  if (!vx && !vy) return 'The part in brackets and the last part are false, so it does not fit.';
  return `${named ? '' : `The part ${Q(vx ? f.b : f.a)} is false. `}AND needs both parts, so it does not fit.`;
}

/**
 * Why one card fits a rule or not, step by step, from the engine. `who` names the card ("The small red
 * circle", "For example, the small red circle", or "It"):
 *   "The small red circle is red, and it is not big. So the inside, “red AND big,” is false.
 *    NOT flips false to true, so it fits “NOT (red AND big).”"
 */
function whyFits(f: Formula, c: Card, who: string, s: Skin): string {
  const verdict = (g: Formula) => (evaluate(g, c) ? `it fits ${Q(g, '.')}` : `it does not fit ${Q(g, '.')}`);
  if (f.op === 'is') return `${who} ${fact(f.f, c)}, so ${verdict(f)}`;
  if (f.op === 'not' && f.a.op === 'is') {
    return has(c, f.a.f) ? `${who} is ${ft(f.a.f)}, so ${Q(f)} leaves it out.` : `${who} is not ${ft(f.a.f)}, so it fits ${Q(f, '.')}`;
  }
  if (isJoin(f) && literal(f.a) && literal(f.b)) {
    // A NOT part gets its own flip step: "It is small, so “NOT small” is false."
    const neg = [f.a, f.b].find((p) => p.op === 'not');
    const flip = neg ? ` So ${Q(neg)} is ${tw(evaluate(neg, c))}.` : '';
    return `${who} ${fact(featOf(f.a), c)}, and it ${fact(featOf(f.b), c)}.${flip} ${joinVerdict(f, c, s, neg)}`;
  }
  if (f.op === 'not' && isJoin(f.a)) {
    const inner = f.a, v = evaluate(inner, c);
    return `${who} ${fact(featOf(inner.a), c)}, and it ${fact(featOf(inner.b), c)}. So the inside, ${Q(inner, ',')} is ${tw(v)}. NOT flips ${tw(v)} to ${tw(!v)}, so ${verdict(f)}`;
  }
  if (f.op === 'and' && isJoin(f.a) && literal(f.b)) {
    const x = f.a, vx = evaluate(x, c), vy = evaluate(f.b, c);
    return `${who} ${fact(featOf(x.a), c)}, and it ${fact(featOf(x.b), c)}. So the part in brackets, ${Q(x, ',')} is ${tw(vx)}. It ${fact(featOf(f.b), c)}, so ${Q(f.b)} is ${tw(vy)}. ${groupVerdict(f, c, true)}`;
  }
  return `${who} ${evaluate(f, c) ? 'fits' : 'does not fit'} ${Q(f, '.')}`;
}

/** The short note under a case card: what decides it. */
function noteFor(f: Formula, c: Card, s: Skin): string {
  if (f.op === 'not' && f.a.op === 'is') return has(c, f.a.f) ? `It is ${ft(f.a.f)}, so NOT leaves it out.` : `It is not ${ft(f.a.f)}, so it fits.`;
  if (isJoin(f) && literal(f.a) && literal(f.b)) return joinVerdict(f, c, s);
  if (f.op === 'not') {
    const v = evaluate(f.a, c);
    return `The inside is ${tw(v)}. NOT flips it to ${tw(!v)}, so it ${v ? 'does not fit' : 'fits'}.`;
  }
  if (isJoin(f) && f.op === 'and') return groupVerdict(f, c);
  return evaluate(f, c) ? 'It fits.' : 'It does not fit.';
}

/** The last step of "Explain more simply", after each part has been asked about: no need to name the parts again. */
function stepVerdict(op: 'and' | 'or', va: boolean, vb: boolean, s: Skin): string {
  if (op === 'and') return va && vb ? 'Both parts are true, so it fits.' : 'AND needs both parts, so it does not fit.';
  if (va && vb) return `Both parts are true. OR takes a ${s.one} like this too, so it fits.`;
  return va || vb ? 'One part is true. That is enough for OR, so it fits.' : 'No part is true, so it does not fit.';
}

/** "Explain more simply" for one card: look, ask about each part, decide. */
function steps(f: Formula, c: Card, s: Skin, look = `Look at ${aName(c)}.`): string[] {
  if (f.op === 'not' && f.a.op === 'is') {
    const v = has(c, f.a.f);
    return [look, `Is it ${ft(f.a.f)}? ${yn(v)}.`, v ? 'NOT flips yes to no. So it does not fit.' : 'NOT flips no to yes. So it fits.'];
  }
  if (isJoin(f) && literal(f.a) && literal(f.b)) return [look, `${ask(f.a, c)} ${ask(f.b, c)}`, stepVerdict(f.op, evaluate(f.a, c), evaluate(f.b, c), s)];
  if (f.op === 'not' && isJoin(f.a)) {
    const v = evaluate(f.a, c);
    return [look, `First the brackets. ${ask(f.a.a, c)} ${ask(f.a.b, c)} So the inside is ${tw(v)}.`, `NOT flips ${tw(v)} to ${tw(!v)}. So it ${v ? 'does not fit' : 'fits'}.`];
  }
  if (f.op === 'and' && isJoin(f.a) && literal(f.b)) {
    const vx = evaluate(f.a, c);
    return [look, `First the brackets. ${ask(f.a.a, c)} ${ask(f.a.b, c)} So the part in brackets is ${tw(vx)}.`, `Now the last part. ${ask(f.b, c)}`, stepVerdict('and', vx, evaluate(f.b, c), s)];
  }
  return [look, evaluate(f, c) ? 'It fits.' : 'It does not fit.'];
}

/** Which of two features a card has: "It is big and red." / "It is big, but it is not red." / … */
function partsNote(a: Feature, b: Feature, c: Card): string {
  if (has(c, a) && has(c, b)) return `It is ${ft(a)} and ${ft(b)}.`;
  if (has(c, a)) return `It is ${ft(a)}, but it is not ${ft(b)}.`;
  if (has(c, b)) return `It is ${ft(b)}, but it is not ${ft(a)}.`;
  return `It is not ${ft(a)}, and it is not ${ft(b)}.`;
}

// ---------- teaching: words defined in place ----------

type Term = { word: string; meaning: string };
const T_NOT: Term = { word: 'NOT', meaning: 'flip the part after it. True becomes false, and false becomes true.' };
const T_AND: Term = { word: 'AND', meaning: 'both parts must be true.' };
const T_OR: Term = { word: 'OR', meaning: 'one part or both parts must be true.' };
const T_BRACKETS: Term = { word: '“Do the brackets first”', meaning: 'work out the part inside ( ) before anything else.' };
const T_SAME: Term = { word: '“Mean the same”', meaning: 'fit exactly the same cards. A card that fits one rule fits the other rule too.' };
const T_JOIN: Term = { word: 'The joining word', meaning: 'the AND or the OR between two parts.' };
const ruleOutTerm = (s: Skin): Term => ({ word: '“Rule out”', meaning: `show that a rule cannot be the secret rule. One ${s.one} that does not match is enough.` });
const fitsTerm = (s: Skin): Term => ({ word: '“Fits”', meaning: `the rule is true for that ${s.one}.` });
const markTerm = (s: Skin): Term => ({ word: 'A mark', meaning: `the yes or the no a ${s.one} got. It never changes.` });
const matchTerm = (s: Skin): Term => ({ word: 'A match', meaning: `the mark and the rule agree. A ${s.one} with a yes fits the rule, or a ${s.one} with a no does not fit it.` });
const partTerm = (rule: Join): Term => ({ word: 'A part', meaning: `one piece of a rule. The rule ${Q(rule)} has two parts: ${Q(rule.a)} and ${Q(rule.b, '.')}` });

// ---------- teaching: one Teach per kind of rule ----------

/** NOT x: one card for each value of x's feature (x itself, then the others). */
function notTeach(rule: Formula, s: Skin, shown: readonly Card[]): Teach {
  const x = featOf(rule), fx = ft(x);
  const others = featuresOf(x.kind).filter((f) => !sameFeature(f, x));
  const xc = example(is(x), shown), oc = example(is(others[others.length - 1]), shown);
  return {
    rule: `NOT means everything else. A ${s.one} fits ${Q(rule)} when it is not ${fx}.`,
    terms: [T_NOT, fitsTerm(s)],
    meaning: `The rule ${Q(rule)} is true for every ${s.one} that is not ${fx}. ${cap(groups(others, s))} fit. ${cap(group(x, s))} do not.`,
    casesTitle: `Which ${s.many} fit ${Q(rule)}?`,
    cases: [x, ...others].map((f) => {
      const c = example(is(f), shown);
      return cardCase(c, [partTruth(is(x), c), fitsTruth(rule, c)], noteFor(rule, c, s));
    }),
    remember: [`${Q(rule)} takes every ${s.one} that is not ${fx}. A ${s.one} that is ${fx} is left out.`, `Ask: “Is this ${s.one} ${fx}?”`],
    simpler: [...steps(rule, xc, s), ...steps(rule, oc, s, `Now look at ${aName(oc)}.`)],
  };
}

/** A AND B, or A AND NOT B: the four kinds of card (both parts, one part, the other part, no part). */
function andTeach(rule: Join, s: Skin, shown: readonly Card[]): Teach {
  const a = featOf(rule.a), b = featOf(rule.b);
  const onePart = example(and(rule.a, not(rule.b)), shown);
  return {
    rule: `AND needs both parts to be true. A ${s.one} fits ${Q(rule)} only when it ${asks(rule.a)} and it ${asks(rule.b)}.`,
    terms: [T_AND, partTerm(rule), ...(rule.b.op === 'not' ? [T_NOT] : [])],
    meaning: `The rule ${Q(rule)} is true for a ${s.one} only when both parts are true for it. If even one part is false, the ${s.one} does not fit.`,
    casesTitle: `When does a ${s.one} fit ${Q(rule)}?`,
    cases: quads(is(a), is(b)).map((q) => {
      const c = example(q, shown);
      return cardCase(c, [partTruth(rule.a, c), partTruth(rule.b, c), fitsTruth(rule, c)], noteFor(rule, c, s));
    }),
    remember: ['AND: both parts must be true.', 'Ask: “Is the first part true? Is the second part true too?”'],
    simpler: steps(rule, onePart, s),
  };
}

/** A OR B: the four kinds of card. The card that fits both parts is the one people leave out. */
function orTeach(rule: Join, s: Skin, shown: readonly Card[]): Teach {
  const a = featOf(rule.a), b = featOf(rule.b);
  const both = example(and(rule.a, rule.b), shown);
  return {
    rule: `OR needs one part or both parts to be true. A ${s.one} fits ${Q(rule)} when it is ${ft(a)}, when it is ${ft(b)}, or when it is ${ft(a)} and ${ft(b)}.`,
    terms: [T_OR, partTerm(rule)],
    meaning: `The rule ${Q(rule)} is false only when no part is true. A ${s.one} that fits both parts fits the rule too.`,
    casesTitle: `When does a ${s.one} fit ${Q(rule)}?`,
    cases: quads(is(a), is(b)).map((q) => {
      const c = example(q, shown);
      return cardCase(c, [partTruth(rule.a, c), partTruth(rule.b, c), fitsTruth(rule, c)], noteFor(rule, c, s));
    }),
    remember: ['OR: one part or both parts must be true.', 'Ask: “Is at least one part true?”'],
    simpler: steps(rule, both, s),
  };
}

/** NOT (A AND B) or NOT (A OR B): the inside first, then the flip, on the four kinds of card. */
function bracketTeach(rule: Formula, s: Skin, shown: readonly Card[]): Teach {
  if (rule.op !== 'not' || !isJoin(rule.a)) throw new Error(`${render(rule)} is not NOT ( … )`);
  const inner = rule.a;
  const a = featOf(inner.a), b = featOf(inner.b);
  const onePart = example(and(inner.a, not(inner.b)), shown);
  const meaning = inner.op === 'and'
    ? `First find the ${s.many} that fit ${Q(inner, '.')} They are ${ftPl(a)} and also ${ftPl(b)}. NOT takes every other ${s.one}. So a ${s.one} fits when at least one part is false.`
    : `First find the ${s.many} that fit ${Q(inner, '.')} NOT takes every other ${s.one}. So a ${s.one} fits only when no part is true: it is not ${ft(a)}, and it is not ${ft(b)}.`;
  return {
    rule: `Do the brackets first. Then NOT flips the result. A ${s.one} fits ${Q(rule)} when ${Q(inner)} is false for it.`,
    terms: [T_BRACKETS, T_NOT, inner.op === 'and' ? T_AND : T_OR],
    meaning,
    casesTitle: 'Do the brackets first, then flip.',
    cases: quads(is(a), is(b)).map((q) => {
      const c = example(q, shown);
      return cardCase(c, [partTruth(inner.a, c), partTruth(inner.b, c), fitsTruth(inner, c), fitsTruth(rule, c)], noteFor(rule, c, s));
    }),
    remember: ['Brackets first. Then NOT flips the result.', `Ask: “Does this ${s.one} fit the inside of the brackets?”`],
    simpler: steps(rule, onePart, s),
  };
}

/** (A OR B) AND NOT C: the bracket, then the last part. */
function groupTeach(rule: Formula, s: Skin, shown: readonly Card[]): Teach {
  if (rule.op !== 'and' || !isJoin(rule.a) || !literal(rule.b)) throw new Error(`${render(rule)} is not ( … ) AND …`);
  const x = rule.a, y = rule.b;
  const A = x.a, B = x.b, C = is(featOf(y));
  const forgot = example(and(A, C), shown);
  return {
    rule: `Do the brackets first. Then AND needs two things: the ${s.one} fits ${Q(x, ',')} and it fits ${Q(y, '.')}`,
    terms: [T_BRACKETS, T_OR, T_AND],
    meaning: `The part in brackets, ${Q(x, ',')} needs one part or both parts to be true. The last part, ${Q(y, ',')} needs a ${s.one} that ${asks(y)}. AND needs the part in brackets and the last part to be true.`,
    casesTitle: `When does a ${s.one} fit ${Q(rule)}?`,
    cases: [and(and(A, B), y), and(and(A, not(B)), y), and(A, C), and(not(A), not(B))].map((q) => {
      const c = example(q, shown);
      return cardCase(c, [fitsTruth(x, c), partTruth(y, c), fitsTruth(rule, c)], `${partsNote(featOf(A), featOf(B), c)} ${noteFor(rule, c, s)}`);
    }),
    remember: ['Brackets first. Then check the part after AND.', 'Ask: “Does it fit the brackets? Does it fit the last part too?”'],
    simpler: steps(rule, forgot, s),
  };
}

/** The teaching for any rule a stop 2 item uses. */
function teachFor(rule: Formula, s: Skin, shown: readonly Card[]): Teach {
  if (rule.op === 'not' && rule.a.op === 'is') return notTeach(rule, s, shown);
  if (isJoin(rule) && literal(rule.a) && literal(rule.b)) return rule.op === 'and' ? andTeach(rule, s, shown) : orTeach(rule, s, shown);
  if (rule.op === 'not') return bracketTeach(rule, s, shown);
  return groupTeach(rule, s, shown);
}

// ---------- item builders ----------

interface Base {
  id: string;
  lesson: string;
  skill: string;
  conflict?: boolean;
}

const baseOf = (b: Base) => ({ id: b.id, stop: STOP, lesson: b.lesson, skill: b.skill, ...(b.conflict ? { conflict: true } : {}) });
const key = (xs: readonly string[]) => [...xs].sort().join('|');

type Diag = { ids: string[]; message: string };

/**
 * A named misreading of a tap-all rule: the cards it takes, a lead that names the gap, and then one card it gets
 * wrong, explained step by step (a card from `prefer` when one is among the wrong ones).
 */
function misread(rule: Formula, things: readonly Thing[], ids: string[], lead: string, s: Skin, prefer?: (t: Card) => boolean): Diag {
  const answer = new Set(pickIds(rule, things));
  const got = new Set(ids);
  const wrong = things.filter((t) => answer.has(t.id) !== got.has(t.id));
  const ex = (prefer && wrong.find(prefer)) ?? wrong[0];
  return { ids, message: ex ? `${lead} ${whyFits(rule, ex, `For example, ${the(ex)}`, s)}` : lead };
}

// ---------- the Hint: one card already worked through ----------

/** The card a worked case is about. */
const caseCard = (c: TeachCase): Card | undefined => c.things?.[0];
const onBoard = (things: readonly Card[]) => (c: Card) => things.some((t) => sameCard(t, c));

/**
 * The Hint's marked case: one worked card from the item's own teaching, with each part and the rule already marked
 * true or false, and a note that says what decides it. The first rule in `prefer` that some case meets picks it.
 * Every generator picks a card that is not the answer: a card that does not fit a tap-all rule (so the hint hands
 * over none of the answer), a wrong choice, or a card other than the one asked about.
 */
function hintCaseOf(teach: Teach, prefer: ((c: Card) => boolean)[], what: string): TeachCase {
  for (const ok of prefer) {
    const hit = (teach.cases ?? []).find((x) => {
      const c = caseCard(x);
      return !!c && ok(c);
    });
    if (hit) return hit;
  }
  throw new Error(`${what}: no worked card for the hint`);
}

/** The hint's last words, under its marked case. */
const checkedOne = (s: Skin) => `Here is one ${s.one}, checked for you.`;
const checkedOther = (s: Skin) => `Here is a different ${s.one}, checked for you.`;

/**
 * A tap-all item. Besides the named misreadings, it names every one-card slip (a card left out, or one card too
 * many), tapping every card, and tapping none, so grade() can say exactly which card is wrong and why. Its hint
 * shows a card that does not fit, worked through.
 */
function tapItem(
  b: Base,
  s: Skin,
  p: { prompt: string; things: Thing[]; rule: Formula; explain: string; hint: string; diagnose: Diag[] },
): TapAllItem {
  const answer = pickIds(p.rule, p.things);
  if (answer.length === 0 || answer.length === p.things.length) throw new Error(`${b.id}: trivial answer for ${R(p.rule)}`);
  const fitting = p.things.filter((t) => evaluate(p.rule, t));
  const notFitting = p.things.filter((t) => !evaluate(p.rule, t));
  const named = p.diagnose.filter((d) => d.ids.length > 0);
  const generic: Diag[] = [
    { ids: p.things.map((t) => t.id), message: `Your answer takes every ${s.one}, but not every ${s.one} fits. ${whyFits(p.rule, notFitting[0], `For example, ${the(notFitting[0])}`, s)}` },
    { ids: [], message: `Your answer has no ${s.many}, but ${nFit(answer.length, s)} ${Q(p.rule, '.')} ${whyFits(p.rule, fitting[0], `For example, ${the(fitting[0])}`, s)}` },
    ...fitting.map((t) => ({ ids: answer.filter((id) => id !== t.id), message: `Your answer leaves out ${the(t)}. ${whyFits(p.rule, t, 'It', s)}` })),
    ...notFitting.map((t) => ({ ids: [...answer, t.id], message: `Your answer takes ${the(t)}, but it does not fit. ${whyFits(p.rule, t, 'It', s)}` })),
  ];
  const seen = new Set([key(answer)]);
  const diagnose: Diag[] = [];
  for (const d of [...named, ...generic]) {
    const k = key(d.ids);
    if (seen.has(k)) continue;
    seen.add(k);
    diagnose.push(d);
  }
  const teach = teachFor(p.rule, s, p.things);
  const out = (c: Card) => !evaluate(p.rule, c);
  return {
    kind: 'tapall', ...baseOf(b), prompt: p.prompt, things: p.things, answer,
    explain: p.explain, hint: `${p.hint} ${checkedOne(s)}`,
    hintCase: hintCaseOf(teach, [(c) => out(c) && onBoard(p.things)(c), out], b.id),
    diagnose, teach,
  };
}

/** A choose item. Every wrong choice must have its ChoiceFeedback; whyWrong is filled from it. */
function chooseItem(
  b: Base,
  p: {
    prompt: string; scene?: Scene; choices: { id: string; label: string }[]; answer: string; explain: string; hint: string;
    hintCase: TeachCase; feedback: Record<string, ChoiceFeedback>; teach: Teach;
  },
): ChooseItem {
  if (!p.choices.some((c) => c.id === p.answer)) throw new Error(`${b.id}: answer is not a choice`);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of p.choices) {
    if (c.id === p.answer) continue;
    if (!p.feedback[c.id]) throw new Error(`${b.id}: wrong choice ${c.id} has no feedback`);
    feedback[c.id] = p.feedback[c.id];
  }
  return syncWhyWrong<ChooseItem>({
    kind: 'choose', ...baseOf(b), prompt: p.prompt, ...(p.scene ? { scene: p.scene } : {}),
    choices: p.choices, answer: p.answer, explain: p.explain, hint: p.hint, hintCase: p.hintCase, feedback, teach: p.teach,
  });
}

/** A wrong count: the number, and its feedback (built only when the number is offered). */
interface CountWrong {
  n: number;
  fb: () => ChoiceFeedback;
}

/** Number choices: the right count plus distractor counts (each with its feedback), deduped, sorted. Ids are the numbers. */
function countChoices(right: number, cands: CountWrong[], max = 3) {
  const used = new Set([right]);
  const feedback: Record<string, ChoiceFeedback> = {};
  const values = [right];
  for (const c of cands) {
    if (used.has(c.n) || values.length > max) continue;
    used.add(c.n);
    values.push(c.n);
    feedback[`n${c.n}`] = c.fb();
  }
  values.sort((x, y) => x - y);
  return { choices: values.map((v) => ({ id: `n${v}`, label: String(v) })), answer: `n${right}`, feedback };
}

/** Cards shown as the choices of a "which card" item. Ids come from the card ('big-red-circle'), not its place. */
function choiceThings(rng: Rng, cards: Card[]) {
  const things: Thing[] = rng.shuffle(cards).map((c) => ({ id: cardId(c), shape: c.shape, color: c.color, size: c.size }));
  return { things, choices: things.map((t) => ({ id: t.id, label: cap(cardName(t)) })) };
}

const YES_NO = [
  { id: 'yes', label: 'Yes, it fits' },
  { id: 'no', label: 'No, it does not fit' },
];

type Gen = (rng: Rng, id: string, s: Skin) => Item;

const L1 = 's2.l1', L2 = 's2.l2', L3 = 's2.l3', L4 = 's2.l4', L5 = 's2.l5';

// ---------- lesson 1: NOT ----------

const oneKind = (rng: Rng): FeatureKind => rng.pick<FeatureKind>(['color', 'color', 'shape', 'shape', 'size']);

const notTap: Gen = (rng, id, s) => {
  const kind = oneKind(rng);
  const x = rng.pick(featuresOf(kind));
  const things = drawThings(rng, rng.int(6, 9), featuresOf(kind).map(is));
  return notTapOn(id, s, x, things);
};

/** "Tap every card that is NOT x" on the given cards. */
function notTapOn(id: string, s: Skin, x: Feature, things: Thing[]): TapAllItem {
  const kind = x.kind;
  const rule = not(is(x));
  const others = featuresOf(kind).filter((f) => !sameFeature(f, x));
  const n = pickIds(rule, things).length;
  const fx = ft(x);
  return tapItem({ id, lesson: L1, skill: 's2.not' }, s, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `${Q(rule)} means every ${s.one} that is not ${fx}. The ${groups(others, s)} fit. That makes ${n}.`,
    hint: `Find the ${group(x, s)} first. NOT leaves them out.`,
    diagnose: [
      misread(rule, things, pickIds(is(x), things), `Your answer takes the ${group(x, s)}, the ${s.many} ${Q(rule)} leaves out. NOT flips the part.`, s, (t) => has(t, x)),
      ...(others.length === 2
        ? others.map((o, i) => {
          const left = others[1 - i];
          return misread(rule, things, pickIds(is(o), things), `Your answer leaves out the ${group(left, s)}. A ${s.one} that is ${ft(left)} is not ${fx} either.`, s, (t) => has(t, left));
        })
        : []),
    ],
  });
}

const notMeans: Gen = (rng, id, s) => {
  const kind = oneKind(rng);
  const x = rng.pick(featuresOf(kind));
  const rule = not(is(x));
  const fx = ft(x);
  const others = featuresOf(kind).filter((f) => !sameFeature(f, x));
  const options: Feature[][] = others.length === 2 ? [others, [others[0]], [others[1]], [x]] : [others, [x], [x, others[0]]];
  const exact = (fs: Feature[]) => ALL_CARDS.every((c) => evaluate(rule, c) === fs.some((f) => has(c, f)));
  const label = (fs: Feature[]) => (fs.length === 1 ? `Only ${groups(fs, s)}` : cap(groups(fs, s)));
  const choices = rng.shuffle(options).map((fs) => ({ id: `v-${fs.map((f) => f.value).join('-')}`, label: label(fs), fs }));
  const right = choices.filter((c) => exact(c.fs));
  if (right.length !== 1) throw new Error(`${id}: ${right.length} right choices`);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const c of choices) {
    if (c === right[0]) continue;
    const includes = (card: Card): Truth => ({ who: 'Your answer includes it', value: c.fs.some((f) => has(card, f)) });
    const caseOf = (card: Card) => cardCase(card, [partTruth(is(x), card), fitsTruth(rule, card), includes(card)], noteFor(rule, card, s));
    if (c.fs.some((f) => sameFeature(f, x))) {
      const xc = example(is(x));
      // "A tile that is a square does not fit", never "A square is a square".
      feedback[c.id] = c.fs.length > 1
        ? {
          headline: `Your answer takes every ${s.one}, even the ${group(x, s)}.`,
          detail: [`Every ${s.one} is ${c.fs.map(ft).join(' or ')}, so your answer takes every ${s.one}.`, `But a ${s.one} that is ${fx} does not fit ${Q(rule, '.')}`],
          example: caseOf(xc),
        }
        : {
          headline: `Your answer is the ${group(x, s)}, the ${s.many} ${Q(rule)} leaves out.`,
          detail: [`NOT flips the part. A ${s.one} that is ${fx} does not fit ${Q(rule, '.')}`, `Every ${s.one} that is not ${fx} fits. That means ${groups(others, s)}.`],
          example: caseOf(xc),
        };
    } else {
      const left = others.find((o) => !c.fs.some((f) => sameFeature(f, o)))!;
      const lc = example(is(left));
      feedback[c.id] = {
        headline: `Your answer leaves out the ${group(left, s)}.`,
        detail: [`Your answer says only ${groups(c.fs, s)} fit ${Q(rule, '.')}`, `But a ${group(left, s, 1)} is not ${fx} either. So it fits too.`],
        example: caseOf(lc),
      };
    }
  }
  const teach = teachFor(rule, s, []);
  return chooseItem({ id, lesson: L1, skill: 's2.not-means' }, {
    prompt: s.which(R(rule)),
    choices: choices.map(({ id: cid, label: l }) => ({ id: cid, label: l })),
    answer: right[0].id,
    explain: `${Q(rule)} means every ${s.one} that is not ${fx}. So ${groups(others, s)} fit.`,
    hint: `${Q(rule)} takes every ${s.one} that is not ${fx}. Which ${kind}s are left? ${checkedOne(s)}`,
    // A card the rule leaves out: it is in none of the right groups.
    hintCase: hintCaseOf(teach, [(c) => !evaluate(rule, c)], id),
    feedback,
    teach,
  });
};

const notCount: Gen = (rng, id, s) => {
  const kind = oneKind(rng);
  const x = rng.pick(featuresOf(kind));
  const rule = not(is(x));
  const fx = ft(x);
  const others = featuresOf(kind).filter((f) => !sameFeature(f, x));
  // When the cards with x are exactly half, counting them (NOT read the wrong way round) gives the right number,
  // and the item cannot tell the mistake from the answer. Draw again until the two counts differ.
  let things = drawThings(rng, rng.int(6, 10), featuresOf(kind).map(is));
  while (2 * pickIds(is(x), things).length === things.length) things = drawThings(rng, rng.int(6, 10), featuresOf(kind).map(is));
  const count = (f: Formula) => pickIds(f, things).length;
  const right = count(rule), nx = count(is(x));
  if (nx === right) throw new Error(`${id}: counting the ${ft(x)} cards gives the right answer`);
  const xc = example(is(x), things);
  const xTruths = (c: Card) => [partTruth(is(x), c), fitsTruth(rule, c)];
  const cands: CountWrong[] = [
    {
      n: nx,
      fb: () => ({
        headline: `${nx} is the number of ${group(x, s)}, the ${s.many} ${Q(rule)} leaves out.`,
        detail: [`NOT flips the part. ${whyFits(rule, xc, The(xc), s)}`, `Count every ${s.one} that is not ${fx} instead.`],
        example: cardCase(xc, xTruths(xc), nx === 1 ? `It is the only ${group(x, s, 1)}. It does not count.` : `It is one of the ${nx} ${group(x, s)}. It does not count.`, { the: true }),
      }),
    },
    ...(others.length === 2
      ? others.map((o, i): CountWrong => {
        const left = others[1 - i], lc = example(is(left), things);
        return {
          n: count(is(o)),
          fb: () => ({
            headline: `Your answer leaves out the ${group(left, s)}.`,
            detail: [`${count(is(o))} is the number of ${group(o, s)}.`, `${whyFits(rule, lc, The(lc), s)} So the ${group(left, s)} count too.`],
            example: cardCase(lc, xTruths(lc), `It is not ${fx}, so it counts.`, { the: true }),
          }),
        };
      })
      : []),
    {
      n: things.length,
      fb: () => ({
        headline: `Your answer, ${things.length}, counts every ${s.one}, even the ${group(x, s)}.`,
        detail: [whyFits(rule, xc, The(xc), s), `Leave out the ${nx} ${group(x, s, nx)}.`],
        example: cardCase(xc, xTruths(xc), `It is ${fx}. It does not count.`, { the: true }),
      }),
    },
  ];
  const teach = teachFor(rule, s, things);
  return chooseItem({ id, lesson: L1, skill: 's2.not-count' }, {
    prompt: s.count(R(rule)),
    scene: { kind: 'things', things },
    ...countChoices(right, cands),
    explain: `There ${plural(nx, 'is', 'are')} ${nx} ${group(x, s, nx)}. Every other ${s.one} fits ${Q(rule, ',')} so the answer is ${right}.`,
    hint: `Leave out the ${group(x, s)}. Count the rest. ${checkedOne(s)}`,
    // A shown card that does not count.
    hintCase: hintCaseOf(teach, [(c) => !evaluate(rule, c) && onBoard(things)(c)], id),
    teach,
  });
};

// ---------- lesson 2: AND ----------

/** A card that fits exactly one of two parts. */
const onePartOf = (A: Formula, B: Formula) => (t: Card) => evaluate(A, t) !== evaluate(B, t);

const andTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const things = drawThings(rng, rng.int(6, 10), quads(is(a), is(b)));
  return andTapOn(id, s, a, b, things);
};

/** "Tap every card that is a AND b" on the given cards (they show every way the two parts can go). */
function andTapOn(id: string, s: Skin, a: Feature, b: Feature, things: Thing[]): TapAllItem {
  const A = is(a), B = is(b), rule = and(A, B);
  const fit = things.filter((t) => evaluate(rule, t));
  const miss = things.find((t) => has(t, a) && !has(t, b))!;
  const first = fit.length <= 3
    ? `Only ${names(fit)} ${plural(fit.length, 'fits', 'fit')} ${Q(rule, '.')}`
    : `In all, ${fit.length} ${s.many} fit ${Q(rule, '.')}`;
  return tapItem({ id, lesson: L2, skill: 's2.and' }, s, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `${first} ${The(miss)} is ${ft(a)}, but it is not ${ft(b)}, so it does not fit.`,
    hint: `Check both parts on each ${s.one}. Both parts must be true.`,
    diagnose: [
      misread(rule, things, pickIds(rule, things, 'andAsOr'), `Your answer takes ${s.many} that fit just one part.`, s, onePartOf(A, B)),
      misread(rule, things, pickIds(A, things), `Your answer takes all the ${group(a, s)}, but some of them are not ${ftPl(b)}.`, s),
      misread(rule, things, pickIds(B, things), `Your answer takes all the ${group(b, s)}, but some of them are not ${ftPl(a)}.`, s),
    ],
  });
}

/** A AND NOT B. Untaught: no key idea marks it and no board drills it, so only untaughtItems() builds it. */
const andNotTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, not(B));
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const n = pickIds(rule, things).length;
  const miss = things.find((t) => has(t, a) && has(t, b))!;
  const bothAB = (t: Card) => has(t, a) && has(t, b);
  return tapItem({ id, lesson: L2, skill: 's2.and-not' }, s, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `A ${s.one} fits if it is ${ft(a)} and it is not ${ft(b)}. In all, ${nFit(n, s)}. ${The(miss)} is ${ft(b)}, so it does not fit.`,
    hint: 'Check both parts. The second part has a NOT.',
    diagnose: [
      misread(rule, things, pickIds(rule, things, 'dropNot'), `Your answer leaves out the NOT in ${Q(not(B), '.')} It takes the ${s.many} that fit ${Q(and(A, B), '.')}`, s, bothAB),
      misread(rule, things, pickIds(rule, things, 'andAsOr'), `Your answer takes ${s.many} that fit just one part.`, s, onePartOf(A, not(B))),
      misread(rule, things, pickIds(A, things), `Your answer takes all the ${group(a, s)}, but some of them are ${ftPl(b)}.`, s, bothAB),
    ],
  });
};

const andPick: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, B);
  const { things, choices } = choiceThings(rng, quads(A, B).map((q) => cardFitting(rng, q)));
  const right = things.filter((t) => evaluate(rule, t));
  if (right.length !== 1) throw new Error(`${id}: ${right.length} cards fit`);
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const t of things) {
    if (t === right[0]) continue;
    const ex = cardCase(t, [partTruth(A, t), partTruth(B, t), fitsTruth(rule, t)], noteFor(rule, t, s), { the: true });
    if (has(t, a) || has(t, b)) {
      const [p, q] = has(t, a) ? [a, b] : [b, a];
      feedback[t.id] = {
        headline: `Your ${s.one} fits only one part: it is ${ft(p)}, but it is not ${ft(q)}.`,
        detail: [`The rule ${Q(rule)} needs both parts to be true.`, `For ${the(t)}, the part ${Q(is(q))} is false. So it does not fit.`],
        example: ex,
      };
    } else {
      feedback[t.id] = {
        headline: `Your ${s.one} fits no part of the rule.`,
        detail: [`${The(t)} is not ${ft(a)}, and it is not ${ft(b)}.`, 'AND needs both parts to be true. Here both parts are false.'],
        example: ex,
        simpler: steps(rule, t, s, `Look at ${the(t)}.`),
      };
    }
  }
  const teach = teachFor(rule, s, things);
  return chooseItem({ id, lesson: L2, skill: 's2.and-pick' }, {
    prompt: s.fit(R(rule)),
    scene: { kind: 'things', things },
    choices,
    answer: right[0].id,
    explain: `Only ${the(right[0])} is ${ft(a)} and ${ft(b)}. AND needs both parts to be true.`,
    hint: `Check both parts on each ${s.one}. ${checkedOne(s)}`,
    // A shown card that fits one part only: a wrong choice, never the answer.
    hintCase: hintCaseOf(teach, [(c) => onePartOf(A, B)(c) && onBoard(things)(c)], id),
    feedback,
    teach,
  });
};

const andCount: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, B);
  const things = drawThings(rng, rng.int(7, 10), quads(A, B));
  const count = (f: Formula) => pickIds(f, things).length;
  const right = count(rule);
  const teach = teachFor(rule, s, things);
  const truths = (c: Card) => [partTruth(A, c), partTruth(B, c), fitsTruth(rule, c)];
  const one = things.find(onePartOf(A, B))!;
  const partOnly = (p: Feature, q: Feature): CountWrong => {
    const c = things.find((t) => has(t, p) && !has(t, q))!;
    const n = count(is(p));
    return {
      n,
      fb: () => ({
        headline: `${n} is the number of ${group(p, s)}, but some of them are not ${ftPl(q)}.`,
        detail: [`A ${group(p, s, 1)} counts only if it is ${ft(q)} too.`, whyFits(rule, c, The(c), s)],
        example: cardCase(c, truths(c), `It is ${ft(p)}, but it is not ${ft(q)}. It does not count.`, { the: true }),
      }),
    };
  };
  const either = pickIds(rule, things, 'andAsOr').length;
  return chooseItem({ id, lesson: L2, skill: 's2.and-count' }, {
    prompt: s.count(R(rule)),
    scene: { kind: 'things', things },
    ...countChoices(right, [
      {
        n: either,
        fb: () => ({
          headline: `${either} is the number of ${s.many} that fit at least one part.`,
          detail: ['AND needs both parts to be true, not just one.', whyFits(rule, one, The(one), s)],
          example: cardCase(one, truths(one), 'It fits one part, so it does not count.', { the: true }),
        }),
      },
      partOnly(a, b),
      partOnly(b, a),
    ]),
    explain: `There ${plural(right, 'is', 'are')} ${right} ${plural(right, s.one, s.many)} that ${plural(right, 'fits', 'fit')} ${Q(rule, '.')} ${plural(right, 'It is', 'Each one is')} ${ft(a)} and also ${ft(b)}.`,
    hint: `A ${s.one} counts only if both parts are true. ${checkedOne(s)}`,
    // A shown card that does not count.
    hintCase: hintCaseOf(teach, [(c) => !evaluate(rule, c) && onBoard(things)(c)], id),
    teach,
  });
};

// ---------- lesson 3: OR ----------

const orTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const things = drawThings(rng, rng.int(6, 10), quads(is(a), is(b)));
  return orTapOn(id, s, a, b, things);
};

/** "Tap every card that is a OR b" on the given cards (they show every way the two parts can go). */
function orTapOn(id: string, s: Skin, a: Feature, b: Feature, things: Thing[]): TapAllItem {
  const A = is(a), B = is(b), rule = or(A, B);
  const n = pickIds(rule, things).length;
  const both = things.find((t) => has(t, a) && has(t, b))!;
  const nBoth = pickIds(and(A, B), things).length;
  return tapItem({ id, lesson: L3, skill: 's2.or-both', conflict: true }, s, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `A ${s.one} fits if it is ${ft(a)}, if it is ${ft(b)}, or if it is ${ft(a)} and ${ft(b)}. ${The(both)} is ${ft(a)} and ${ft(b)}, so it fits too. In all, ${nFit(n, s)}.`,
    hint: `One part is enough. What about a ${s.one} that fits both parts?`,
    diagnose: [
      misread(rule, things, pickIds(rule, things, 'orExclusive'), `Your answer leaves out the ${fitBoth(nBoth, s)}.`, s),
      misread(rule, things, pickIds(rule, things, 'orAsAnd'), `Your answer takes only the ${fitBoth(nBoth, s)}.`, s),
      misread(rule, things, pickIds(A, things), `Your answer takes only the ${group(a, s)}. A ${s.one} that is ${ft(b)} fits too.`, s),
      misread(rule, things, pickIds(B, things), `Your answer takes only the ${group(b, s)}. A ${s.one} that is ${ft(a)} fits too.`, s),
    ],
  });
}

const orNotFit: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const { things, choices } = choiceThings(rng, quads(A, B).map((q) => cardFitting(rng, q)));
  const out = things.filter((t) => !evaluate(rule, t));
  if (out.length !== 1) throw new Error(`${id}: ${out.length} cards do not fit`);
  const teach = teachFor(rule, s, things);
  const feedback: Record<string, ChoiceFeedback> = {};
  const ask = `The question asks for the ${s.one} that does not fit.`;
  for (const t of things) {
    if (t === out[0]) continue;
    const ex = cardCase(t, [partTruth(A, t), partTruth(B, t), fitsTruth(rule, t)], noteFor(rule, t, s), { the: true });
    if (has(t, a) && has(t, b)) {
      feedback[t.id] = {
        headline: `Your ${s.one} fits both parts, so it fits the rule.`,
        detail: [`${The(t)} is ${ft(a)}, and it is ${ft(b)}.`, `OR takes a ${s.one} that fits both parts. So it fits ${Q(rule, '.')}`, ask],
        example: ex,
      };
    } else {
      const p = has(t, a) ? a : b;
      feedback[t.id] = {
        headline: `Your ${s.one} fits one part, and one part is enough for OR.`,
        detail: [`${The(t)} is ${ft(p)}, so the part ${Q(is(p))} is true.`, `OR needs just one part to be true. So it fits ${Q(rule, '.')}`, ask],
        example: ex,
        simpler: steps(rule, t, s, `Look at ${the(t)}.`),
      };
    }
  }
  return chooseItem({ id, lesson: L3, skill: 's2.or-pick', conflict: true }, {
    prompt: s.notFit(R(rule)),
    scene: { kind: 'things', things },
    choices,
    answer: out[0].id,
    explain: `Only ${the(out[0])} is not ${ft(a)} and not ${ft(b)}. No part is true for it, so it is the one that does not fit.`,
    hint: `Look for the ${s.one} that fits no part at all. ${checkedOne(s)}`,
    // A shown card that fits one part: a wrong choice (it fits), never the answer.
    hintCase: hintCaseOf(teach, [(c) => onePartOf(A, B)(c) && onBoard(things)(c)], id),
    feedback,
    teach,
  });
};

const orCount: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const things = drawThings(rng, rng.int(7, 10), quads(A, B));
  const count = (f: Formula) => pickIds(f, things).length;
  const right = count(rule), nBoth = count(and(A, B));
  const truths = (c: Card) => [partTruth(A, c), partTruth(B, c), fitsTruth(rule, c)];
  const bothC = things.find((t) => has(t, a) && has(t, b))!;
  const oneC = things.find(onePartOf(A, B))!;
  const bOnly = things.find((t) => !has(t, a) && has(t, b))!;
  const xor = pickIds(rule, things, 'orExclusive').length;
  const nA = count(A);
  const teach = teachFor(rule, s, things);
  return chooseItem({ id, lesson: L3, skill: 's2.or-count', conflict: true }, {
    prompt: s.count(R(rule)),
    scene: { kind: 'things', things },
    ...countChoices(right, [
      {
        n: xor,
        fb: () => ({
          headline: `Your answer, ${xor}, leaves out the ${fitBoth(nBoth, s)}.`,
          detail: [whyFits(rule, bothC, The(bothC), s), `There ${plural(nBoth, 'is', 'are')} ${nBoth} ${plural(nBoth, s.one, s.many)} like this.`],
          example: cardCase(bothC, truths(bothC), 'It fits both parts, so it counts.', { the: true }),
        }),
      },
      {
        n: nBoth,
        fb: () => ({
          headline: `Your answer, ${nBoth}, counts only the ${fitBoth(nBoth, s)}.`,
          detail: [whyFits(rule, oneC, The(oneC), s)],
          example: cardCase(oneC, truths(oneC), 'It fits one part, so it counts.', { the: true }),
        }),
      },
      {
        n: nA,
        fb: () => ({
          headline: `Your answer, ${nA}, counts only the ${group(a, s)}.`,
          detail: [`A ${s.one} that is ${ft(b)} fits too.`, whyFits(rule, bOnly, The(bOnly), s)],
          example: cardCase(bOnly, truths(bOnly), `It is ${ft(b)}, so it counts.`, { the: true }),
        }),
      },
    ]),
    explain: `In all, ${nFit(right, s)} ${Q(rule, '.')} That includes ${nBoth} ${plural(nBoth, s.one, s.many)} that ${plural(nBoth, 'fits', 'fit')} both parts.`,
    hint: `Did you count the ${s.many} that fit both parts? ${checkedOne(s)}`,
    // A shown card that does not count.
    hintCase: hintCaseOf(teach, [(c) => !evaluate(rule, c) && onBoard(things)(c)], id),
    teach,
  });
};

/** Which card an OR yes/no item shows: one that fits both parts (yes), one part (yes), or no part (no). */
type OrCard = 'both' | 'one' | 'neither';

/**
 * One card: in lessons usually one that fits both parts (the trap: OR includes it, so yes), sometimes one
 * that fits neither part (no). New examples after a miss can also ask about a card that fits one part.
 * The answer is always computed from the rule.
 */
function orYesNoAs(rng: Rng, id: string, s: Skin, want?: OrCard): ChooseItem {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const which: OrCard = want ?? (rng.chance(0.6) ? 'both' : 'neither');
  const c = cardFitting(rng, which === 'both' ? and(A, B) : which === 'one' ? and(A, not(B)) : and(not(A), not(B)));
  const answer = evaluate(rule, c) ? 'yes' : 'no';
  const teach = teachFor(rule, s, [c]);
  const ex = cardCase(c, [partTruth(A, c), partTruth(B, c), fitsTruth(rule, c)], noteFor(rule, c, s), { the: true });
  const fb: ChoiceFeedback = which === 'both'
    ? {
      headline: `Your answer leaves out a ${s.one} that fits both parts.`,
      detail: [`${The(c)} is ${ft(a)}, and it is ${ft(b)}.`, `OR needs one part or both parts to be true. Here both parts are true, so it fits ${Q(rule, '.')}`],
      example: ex,
    }
    : which === 'one'
      ? {
        headline: `This ${s.one} fits one part, and one part is enough for OR.`,
        detail: [`${The(c)} is ${ft(a)}, but it is not ${ft(b)}.`, `OR needs just one part to be true. So it fits ${Q(rule, '.')}`],
        example: ex,
        simpler: steps(rule, c, s, `Look at ${the(c)}.`),
      }
      : {
        headline: `This ${s.one} fits no part of the rule.`,
        detail: [`${The(c)} is not ${ft(a)}, and it is not ${ft(b)}.`, 'OR needs at least one part to be true. Here no part is true, so it does not fit.'],
        example: ex,
        simpler: steps(rule, c, s, `Look at ${the(c)}.`),
      };
  return chooseItem({ id, lesson: L3, skill: 's2.or-yesno', conflict: which === 'both' }, {
    prompt: s.yesNo(R(rule)),
    scene: { kind: 'things', things: [{ id: cardId(c), shape: c.shape, color: c.color, size: c.size }] },
    choices: YES_NO,
    answer,
    explain: which === 'both'
      ? `${The(c)} is ${ft(a)} and ${ft(b)}. OR takes a ${s.one} that fits both parts, so it fits.`
      : which === 'one'
        ? `${The(c)} is ${ft(a)}. One part is enough for OR, so it fits.`
        : `${The(c)} is not ${ft(a)} and not ${ft(b)}. OR needs at least one part, so it does not fit.`,
    hint: `Check each part on this ${s.one}. OR needs at least one part to fit. If both parts fit, that counts too. ${checkedOther(s)}`,
    // Never the card being asked about: one that does not fit if there is one, else any other card.
    hintCase: hintCaseOf(teach, [(x) => !sameCard(x, c) && !evaluate(rule, x), (x) => !sameCard(x, c)], id),
    feedback: { [answer === 'yes' ? 'no' : 'yes']: fb },
    teach,
  });
}

const orYesNo: Gen = (rng, id, s) => orYesNoAs(rng, id, s);

// ---------- distinctions: two ideas lessons 4 and 5 teach apart ----------
//
// docs/CONTENT_GUIDE.md, "Distinctions". Lesson 4: whether a card fits the inside of the brackets is one question,
// whether it fits the whole rule (after the NOT) is another. Lesson 5: a card's machine mark is one fact, whether the
// rule being tested fits that card is another; and a rule no card rules out is kept for now, not proved. Every truth on
// a contrast panel, a board or a case card comes from evaluate() and matchesMark().

/** Lesson 4: the result before the NOT and the result after it. */
export const INSIDE_VS_WHOLE: Distinction = { id: 'inside-vs-whole', a: 'Does the card fit the inside of the brackets?', b: 'Does it fit the whole rule, after the NOT?' };
/** Lesson 5: the evidence (the machine's mark, which never changes) and the tested rule's answer (which changes). */
export const MARK_VS_FITS: Distinction = { id: 'mark-vs-fits', a: 'The machine’s mark on a card. It never changes.', b: 'Whether the rule you test fits that card. It changes with the rule.' };
/** Lesson 5: one card that does not match proves a rule wrong; matching every card only keeps it in the game. */
export const KEPT_VS_PROVED: Distinction = { id: 'kept-vs-proved', a: 'A rule no card rules out. It is still possible.', b: 'The secret rule. Only one rule is.' };

/** The pass rule's tags. Lesson 4: one rule with AND inside the brackets and one with OR. Lesson 5: a wrong rule only a no card rules out. */
const INSIDE_AND = 'inside-and', INSIDE_OR = 'inside-or', NO_CARD_OUT = 'no-card-rules-out';

/** "It is red, and it is not big." One sentence on a card's two features, for a rule with two one-feature parts. */
function twoFacts(f: Formula, c: Card): string {
  if (!isJoin(f) || !literal(f.a) || !literal(f.b)) throw new Error(`${render(f)} is not two one-feature parts`);
  return `It ${fact(featOf(f.a), c)}, and it ${fact(featOf(f.b), c)}.`;
}

/** What a one-feature part asks for, after "is": "blue", "not small", "a circle". */
const trait = (p: Formula) => (p.op === 'is' ? ft(p.f) : `not ${ft(featOf(p))}`);

/** What a two-part rule needs: "“blue AND small” needs a card that is blue and also small." */
function needsOf(f: Formula): string {
  if (!isJoin(f) || !literal(f.a) || !literal(f.b)) throw new Error(`${render(f)} is not two one-feature parts`);
  return f.op === 'and'
    ? `${Q(f)} needs a card that is ${trait(f.a)} and also ${trait(f.b)}.`
    : `${Q(f)} needs a card that is ${trait(f.a)} or ${trait(f.b)}. One part is enough.`;
}

/** Lesson 4's board labels: a rule, a card, and (under a shown inside mark) whether the card fits the inside. */
const insideWords = (closing: string): BoardWords => ({
  says: 'Rule',
  world: 'Card',
  so: 'So',
  fit: 'It fits the inside.',
  unfit: 'It does not fit the inside.',
  ask: 'Does the card fit this row’s rule?',
  needs: '',
  closing,
});

/** The facts for a two-part rule's mark: the rule (its need is over the row), and the card's two features. */
const partsCompare = (rule: Formula, c: Thing) => ({ says: `The rule is ${Q(rule, '.')}`, world: twoFacts(rule, c) });

/** The facts for NOT ( … )'s mark: NOT flips the inside, and whether the card fits the inside. */
const wholeCompare = (rule: Formula, c: Thing) => {
  const inner = innerOf(rule);
  return { says: `${Q(rule)} flips the inside.`, world: `It ${evaluate(inner, c) ? 'fits' : 'does not fit'} the inside, ${Q(inner, '.')}` };
};

/** The need over a NOT ( … ) row: the inside first, then the flip. */
const FLIP_NEEDS = 'Do the inside first, then flip it. NOT takes every card that does not fit the inside.';

/** "I’m confused" on lesson 4: fitting the inside vs fitting the whole rule, and what the NOT covers. Never a board's answer. */
function insideConfused(s: Skin): ConfusedQuestion[] {
  return [
    {
      q: `A ${s.one} fits the inside of the brackets. Does it fit the whole rule, with NOT in front?`,
      options: [{ label: 'Yes, it fits the inside' }, { label: 'No. NOT flips it, so it is left out', right: true }, { label: 'Not sure' }],
      teach: `Fitting the inside and fitting the whole rule are two different things. Work out the inside first. Then NOT flips it. A ${s.one} that fits the inside is left out. A ${s.one} that does not fit the inside fits the whole rule.`,
    },
    {
      q: 'Take the rule NOT (red AND big). What do you check first?',
      options: [{ label: 'Is it red? Then flip that' }, { label: 'The whole inside, red AND big. Then flip it', right: true }, { label: 'Not sure' }],
      teach: 'The NOT covers the whole bracket. First check each part inside, and join them with AND. That gives the inside. Only then does NOT flip it.',
    },
  ];
}

/** A pattern of marks that copies the inside into the whole rule. */
const INSIDE_AS_WHOLE = 'You may be treating “fits the inside” and “fits the whole rule” as the same thing. They are two different things: NOT flips the inside. A card that fits the inside does not fit the whole rule. Mark the inside first, then flip it.';

/** The closing line of "I’m confused" on a lesson 4 question. */
const INSIDE_CLOSING = 'Those ideas are apart now. Back to the question: do the inside first, then let NOT flip it.';

/** A thinking board for a NOT ( … ) question: the inside row, then the whole rule. Never checked. */
function insideScratch(rule: Formula, things: readonly Thing[], s: Skin): DrillStep {
  const inner = innerOf(rule);
  return {
    id: 'scratch',
    title: 'Your inside board',
    body: ['Mark it if it helps. Nothing on it is checked.', `First mark the inside for each ${s.one}. Then flip it for the whole rule.`],
    rows: [
      deckRow(inner, things, cardWords, { id: 'scratch-in', label: `Inside: ${R(inner)}` }),
      deckRow(rule, things, cardWords, { id: 'scratch-all', label: `Rule: ${R(rule)}` }),
    ],
    done: '',
    words: insideWords(INSIDE_CLOSING),
  };
}

/**
 * A lesson 4 question's extras: its tag for the pass rule (AND or OR inside the brackets), the inside board to open if
 * it helps (so the inside row is there again on every question, the new example after a miss included; checks never
 * show it), and "I’m confused".
 */
function withInside<T extends Item>(it: T, rule: Formula, things: readonly Thing[], s: Skin): T {
  return {
    ...it,
    tags: [innerOf(rule).op === 'and' ? INSIDE_AND : INSIDE_OR],
    scratch: insideScratch(rule, things, s),
    scratchLabel: 'the inside board',
    confused: insideConfused(s),
  };
}

/** Lesson 5's board labels: the card's mark, what the rule says, and whether they match. */
const markWords = (closing: string): BoardWords => ({
  says: 'Mark',
  world: 'Rule',
  so: 'So',
  fit: 'A match: the mark and the rule agree.',
  unfit: 'No match: the mark and the rule do not agree.',
  ask: 'Fits or Not? Ask the rule, not the mark.',
  needs: '',
  closing,
});

/** A card's machine mark, in words. */
const markSays = (t: Thing) => (t.mark === 'yes' ? 'Yes. It got through.' : 'No. It was stopped.');

/** The worked comparison under a shown Match mark: the mark, then what the rule says about the card. */
const matchCompare = (rule: Formula, t: Thing) => ({ says: markSays(t), world: whyFits(rule, t, 'It', ABSTRACT) });

/** The facts beside a Fits or Not mark to tap: the mark stays in view, but the rule decides. */
const testCompare = (rule: Formula, t: Thing) => ({ says: markSays(t), world: `Does it fit ${Q(rule)}?` });

/** The need over a rule test. */
const MATCH_NEEDS = 'Every yes card must fit, and every no card must not fit. One card that does not match rules the rule out.';

/** "You may be treating …": Fits or Not copied from the machine's marks. */
const COPIED_MARK = 'You may be treating “it got a yes” and “it fits the rule” as the same thing. They are two different things: the mark is the machine’s answer, and it never changes. Fits or Not comes from the rule you test. Work it out from the rule, then compare it with the mark.';
/** The same mix-up the other way round: a no card read as "does not fit". The rule test's trap card is a no card it fits. */
const COPIED_NO = 'You may be treating “it got a no” and “it does not fit the rule” as the same thing. They are two different things: the mark is the machine’s answer, and it never changes. Fits or Not comes from the rule you test. Work it out from the rule, then compare it with the mark. A no card that fits is no match.';
/** "Not" read as "no match". */
const NOT_AS_NO_MATCH = 'You may be treating “Not” and “no match” as the same thing. They are two different things: Not is what the rule says, and a match compares it with the mark. A no card that does not fit is a match. The machine said no, and the rule says no too.';
/** Two kept rules read as one proved rule. */
const KEPT_AS_PROVED = 'You may be treating “this rule is kept” and “this is the rule” as the same thing. They are two different things: two kept rules can still disagree on a new card. Kept means still possible. Check the new card against each rule on its own.';

/** "I’m confused" on lesson 5's boards: the mark vs Fits or Not, and what a match is. Never a board's answer. */
const MARK_CONFUSED: ConfusedQuestion[] = [
  {
    q: 'The big yellow square got a yes. You test the rule “blue.” Does the big yellow square fit “blue”?',
    options: [{ label: 'Yes, it got a yes' }, { label: 'No, it is not blue', right: true }, { label: 'Not sure' }],
    teach: 'Getting a yes is the machine’s answer. Fits or Not is what the rule you test says. The big yellow square is not blue, so it does not fit “blue,” even with its yes. Its yes and Not do not match.',
  },
  {
    q: 'A card got a no. The rule you test does not fit it. Is that a match?',
    options: [{ label: 'Yes. The mark says no, and the rule says no too', right: true }, { label: 'No. A rule should fit every card' }, { label: 'Not sure' }],
    teach: 'A match means the mark and the rule agree. A no card that does not fit the rule is a match. A no card that fits the rule is no match, and it rules the rule out.',
  },
];

/** "I’m confused" on kept vs proved. */
const keptConfused = (s: Skin): ConfusedQuestion => ({
  q: 'A rule matches every mark you can see. What do you know?',
  options: [{ label: 'It must be the rule, for sure' }, { label: 'It is still possible. Another rule might match every mark too', right: true }, { label: 'Not sure' }],
  teach: `One ${s.one} that does not match rules a rule out for sure. Matching every mark only keeps a rule for now. In these puzzles, the rule it uses is one of the choices. When the other choices are ruled out, the one left must be it.`,
});

/** "I’m confused" on kept vs proved, the other side: one card that does not match is enough, for sure. */
const RULED_OUT_CONFUSED: ConfusedQuestion = {
  q: 'One card does not match a rule. What do you know?',
  options: [{ label: 'That rule is ruled out for sure', right: true }, { label: 'It might still be the rule' }, { label: 'Not sure' }],
  teach: 'One card that does not match proves a rule wrong, for sure. Many matching cards can never prove a rule right. They only keep it for now.',
};

/** "I’m confused" on a guess the rule question: the mark vs Fits or Not, what a match is, and kept vs proved. */
function guessConfused(s: Skin): ConfusedQuestion[] {
  return [
    {
      q: `A ${s.one} got a yes. You test a rule. Does the yes tell you if it fits that rule?`,
      options: [{ label: 'Yes. A yes means it fits' }, { label: 'No. Fits or Not comes from the rule you test', right: true }, { label: 'Not sure' }],
      teach: `The yes is the mark it got. It never changes. Fits or Not is what the rule you test says about the ${s.one}, so it can change with each rule. Work it out from the rule. Then compare it with the mark.`,
    },
    {
      q: `A ${s.one} got a no. The rule you test does not fit it. Is that a match?`,
      options: [{ label: 'Yes. The mark says no, and the rule says no too', right: true }, { label: `No. A rule should fit every ${s.one}` }, { label: 'Not sure' }],
      teach: `A match means the mark and the rule agree. A ${s.one} with a no that does not fit the rule is a match. A ${s.one} with a no that fits the rule is no match. That rules the rule out.`,
    },
    keptConfused(s),
  ];
}

/** A thinking board for a guess the rule question: every choice tested on every card. Never checked. */
function guessScratch(rules: readonly Formula[], things: readonly Thing[], s: Skin): DrillStep {
  return {
    id: 'scratch',
    title: 'Your test board',
    body: ['Mark it if it helps. Nothing on it is checked.', `Test each rule. Tap Fits or Not for each ${s.one}, from the rule, not the mark. Then keep the rule for now, or rule it out.`],
    rows: rules.map((f, k) => ruleTestRow(f, things, guessWords, { id: `scratch-r${k + 1}`, label: `Test the rule ${Q(f, '.')}` })),
    done: '',
    words: markWords(`Those ideas are apart now. Back to the question: test each rule on every ${s.one}, then compare it with the marks.`),
  };
}

/** A wrong choice that only no cards rule out: every card whose mark it gets wrong is a no card it fits. */
const ruledOutByNoOnly = (g: RuleGuess) =>
  g.distractors.some((d) => {
    const miss = g.things.filter((t) => !matchesMark(d, t));
    return miss.length > 0 && miss.every((t) => t.mark === 'no');
  });

// ---------- lesson 4: brackets ----------

/**
 * NOT ( … ) read without its brackets: the NOT lands on the first part only. Names the rule the answer fits:
 * "Your answer puts the NOT on “red” alone. It takes the cards that fit “NOT red AND big.” But …"
 */
function notOnOnePart(rule: Formula, s: Skin): string {
  if (rule.op !== 'not' || !isJoin(rule.a)) throw new Error(`${render(rule)} is not NOT ( … )`);
  return `Your answer puts the NOT on ${Q(rule.a.a)} alone. It takes the ${s.many} that fit ${Q(withoutBrackets(rule), '.')} But the NOT covers the whole bracket, ${Q(rule.a, '.')}`;
}

const notAndTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const things = drawThings(rng, rng.int(6, 10), quads(is(a), is(b)));
  return notAndTapOn(id, s, a, b, things);
};

/** "Tap every card that is NOT (a AND b)" on the given cards (they show every way the two parts can go). */
function notAndTapOn(id: string, s: Skin, a: Feature, b: Feature, things: Thing[]): TapAllItem {
  const A = is(a), B = is(b), inner = and(A, B), rule = not(inner);
  const n = pickIds(rule, things).length;
  const one = things.find(onePartOf(A, B))!;
  const [p, q] = has(one, a) ? [a, b] : [b, a];
  return withInside(tapItem({ id, lesson: L4, skill: 's2.not-both', conflict: true }, s, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `First find the ${s.many} that fit ${Q(inner, '.')} NOT takes every other ${s.one}, so ${n} fit. ${The(one)} fits: it is ${ft(p)}, but it is not ${ft(q)}.`,
    hint: `Do the brackets first. Which ${s.many} fit ${Q(inner)}?`,
    diagnose: [
      misread(rule, things, pickIds(rule, things, 'deMorgan'),
        `Your answer takes only the ${s.many} that are not ${ft(a)} and not ${ft(b)}. But ${Q(rule)} also takes a ${s.one} that fits just one part of ${Q(inner, '.')}`, s, onePartOf(A, B)),
      misread(rule, things, pickIds(rule, things, 'dropBrackets'), notOnOnePart(rule, s), s),
      misread(rule, things, pickIds(inner, things), `Your answer takes the ${s.many} that fit the inside of the brackets, ${Q(inner, '.')} NOT flips that, so those are the only ${s.many} that do not fit.`, s),
    ],
  }), rule, things, s);
}

const notOrTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), inner = or(A, B), rule = not(inner);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const fit = things.filter((t) => evaluate(rule, t));
  const second = fit.length <= 3
    ? `NOT takes the rest, so only ${names(fit)} ${plural(fit.length, 'fits', 'fit')}. ${fit.length === 1 ? `It is not ${ft(a)} and not ${ft(b)}` : `They are not ${ftPl(a)} and not ${ftPl(b)}`}.`
    : `NOT takes the rest, so ${nFit(fit.length, s)}. Each one is not ${ft(a)} and not ${ft(b)}.`;
  return withInside(tapItem({ id, lesson: L4, skill: 's2.not-either', conflict: true }, s, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `First find the ${s.many} that fit ${Q(inner, '.')} ${second}`,
    hint: `Do the brackets first. Which ${s.many} fit ${Q(inner)}?`,
    diagnose: [
      misread(rule, things, pickIds(rule, things, 'deMorgan'),
        `Your answer takes ${s.many} that fit one part of ${Q(inner, '.')} But ${Q(rule)} takes only the ${s.many} that fit no part of it.`, s, onePartOf(A, B)),
      misread(rule, things, pickIds(rule, things, 'dropBrackets'), notOnOnePart(rule, s), s),
      misread(rule, things, pickIds(inner, things), `Your answer takes the ${s.many} that fit the inside of the brackets, ${Q(inner, '.')} NOT flips that, so those are the only ${s.many} that do not fit.`, s),
    ],
  }), rule, things, s);
};

/** (A OR B) AND NOT C. Untaught: no key idea marks it and no board drills it, so only untaughtItems() builds it. */
const groupTap: Gen = (rng, id, s) => {
  const [k1, k2, k3] = rng.shuffle(KINDS);
  const a = rng.pick(featuresOf(k1)), b = rng.pick(featuresOf(k2));
  const sameKind = featuresOf(k2).length === 3 && rng.chance(0.5);
  const c = sameKind ? rng.pick(featuresOf(k2).filter((f) => !sameFeature(f, b))) : rng.pick(featuresOf(k3));
  const A = is(a), B = is(b), C = is(c), inner = or(A, B), rule = and(inner, not(C));
  const things = drawThings(rng, rng.int(7, 10), [
    and(and(A, B), not(C)),
    and(and(A, not(B)), not(C)),
    and(and(not(A), B), not(C)),
    and(A, C),
    and(not(A), not(B)),
  ]);
  const n = pickIds(rule, things).length;
  const xorIds = pickIds(rule, things, 'orExclusive'), andIds = pickIds(rule, things, 'orAsAnd');
  const isC = (t: Card) => has(t, c);
  return tapItem({ id, lesson: L4, skill: 's2.brackets-first', conflict: true }, s, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `First find the ${s.many} that fit ${Q(inner, '.')} Then keep only the ones that fit ${Q(not(C), '.')} That leaves ${n}.`,
    hint: 'Do the brackets first.',
    // The inside alone comes before skipped brackets: when the cards make the two sets the same, the answer is
    // best named by what it is (every card that fits the brackets), not by a guess at how it was read.
    diagnose: [
      misread(rule, things, xorIds, `Your answer leaves out the ${fitBoth(pickIds(and(A, B), things).length, s)} of ${Q(inner, '.')}`, s),
      misread(rule, things, andIds, `Your answer takes only the ${fitBoth(andIds.length, s)} of ${Q(inner, '.')}`, s),
      misread(rule, things, pickIds(inner, things),
        `Your answer leaves out the last part, ${Q(not(C), '.')} It takes every ${s.one} that fits ${Q(inner, ',')} even one that is ${ft(c)}.`, s, isC),
      misread(rule, things, pickIds(rule, things, 'dropBrackets'),
        `Your answer skips the brackets. A ${s.one} must fit ${Q(inner, ',')} and it must also fit ${Q(not(C), '.')}`, s, isC),
    ],
  });
};

/**
 * Which rule means the same as NOT (A op B) (or, the other way round, as its De Morgan twin)? Every wrong
 * choice names how it differs and a card where it and the question's rule disagree. The wrong choices are the two
 * halves of the switch done alone: the NOT moved without switching the joining word, or the joining word switched
 * without moving the NOT. Every choice is a rule lesson 4 marks on its cards (NOT ( … ), or a NOT on each part).
 */
function sameMeaningAs(rng: Rng, id: string, want?: 'and' | 'or'): ChooseItem {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b);
  const op = want ?? rng.pick<'and' | 'or'>(['and', 'or']);
  const join = (x: Formula, y: Formula, o: 'and' | 'or') => (o === 'and' ? and(x, y) : or(x, y));
  const W = (o: 'and' | 'or') => (o === 'and' ? 'AND' : 'OR');
  const flip = op === 'and' ? 'or' : 'and';
  const bracket = not(join(A, B, op)); // NOT (A op B)
  const pushed = join(not(A), not(B), flip); // the De Morgan twin
  const reverse = rng.chance(0.4);
  const given = reverse ? pushed : bracket;
  const right = reverse ? bracket : pushed;
  const wrongs = (reverse
    ? [
      { f: not(join(A, B, flip)), head: `Your answer keeps ${W(flip)} when the NOT moves outside the brackets.`, why: `When the two NOTs become one NOT outside the brackets, ${W(flip)} must switch to ${W(op)}.` },
      { f: join(not(A), not(B), op), head: `Your answer switches ${W(flip)} to ${W(op)}, but it keeps a NOT on each part.`, why: `Switching ${W(flip)} to ${W(op)} works only when the two NOTs become one NOT in front of brackets.` },
    ]
    : [
      { f: join(not(A), not(B), op), head: `Your answer keeps ${W(op)} when the NOT moves inside the brackets.`, why: `When the NOT moves inside, each part gets a NOT, and ${W(op)} must switch to ${W(flip)}.` },
      // The switch without the move. Never a NOT on one part only (“NOT red AND big”): no lesson teaches that rule.
      { f: not(join(A, B, flip)), head: `Your answer switches ${W(op)} to ${W(flip)}, but the NOT stays outside the brackets.`, why: `${W(op)} turns into ${W(flip)} only when the NOT moves inside the brackets and goes on each part.` },
    ]
  ).filter((w) => !sameMeaning(w.f, given));
  if (!sameMeaning(right, given) || wrongs.length < 1) throw new Error(`${id}: same-meaning set is broken`);
  const opts = rng.shuffle([right, ...wrongs.map((w) => w.f)]);
  const choices = opts.map((f) => ({ id: ruleId(f), label: R(f) }));
  const qTruth = (c: Card): Truth => ({ who: `It fits the question’s rule, ${Q(given)}`, value: evaluate(given, c) });
  const rTruth = (c: Card): Truth => ({ who: `It fits the right answer, ${Q(right)}`, value: evaluate(right, c) });
  const feedback: Record<string, ChoiceFeedback> = {};
  for (const w of wrongs) {
    // The card that tells them apart: one that fits just one part when there is one, so the edge shows.
    const ds = differences(w.f, given);
    const d = ds.find(onePartOf(A, B)) ?? ds[0];
    const tell = evaluate(w.f, d)
      ? `Think of ${aName(d)}. It fits your answer, ${Q(w.f, ',')} but it does not fit ${Q(given, '.')}`
      : `Think of ${aName(d)}. It fits ${Q(given, ',')} but it does not fit your answer, ${Q(w.f, '.')}`;
    feedback[ruleId(w.f)] = {
      headline: w.head,
      detail: [w.why, tell, 'Two rules that mean the same must agree on every card.'],
      example: cardCase(d, [qTruth(d), yourTruth(w.f, d), rTruth(d)], 'Your answer and the question’s rule do not agree here.'),
      // Its own smallest example: the one card where this choice and the question's rule part ways.
      simpler: [
        `Try one card: ${aName(d)}. ${partsNote(a, b, d)}`,
        `Does it fit the question’s rule, ${Q(given)}? ${yn(evaluate(given, d))}.`,
        `Does it fit your answer, ${Q(w.f)}? ${yn(evaluate(w.f, d))}.`,
        'Your answer and the question’s rule do not agree on this card. So they do not mean the same.',
      ],
    };
  }
  const onePart = example(and(A, not(B)));
  const explain = op === 'and'
    ? `${Q(bracket)} is false only for a card that is ${ft(a)} and also ${ft(b)}. ${Q(pushed)} is false for just those cards too. So the two rules fit exactly the same cards.`
    : `${Q(bracket)} is true only for a card that is not ${ft(a)} and also not ${ft(b)}. ${Q(pushed)} says the same thing. So the two rules fit exactly the same cards.`;
  return chooseItem({ id, lesson: L4, skill: 's2.same-meaning', conflict: true }, {
    prompt: `Which rule means the same as ${R(given)}? Two rules mean the same when they fit exactly the same cards.`,
    choices,
    answer: ruleId(right),
    explain,
    hint: `Test each choice on a card that fits only one part. ${checkedOne(ABSTRACT)}`,
    // One card that fits only one part, with the question's rule marked on it, but no choice marked: the choices
    // are for the learner to test on it.
    hintCase: cardCase(onePart, [partTruth(A, onePart), partTruth(B, onePart), qTruth(onePart)], 'Now test each choice on this card. A choice that does not agree here cannot mean the same.'),
    feedback,
    teach: {
      rule: 'Two rules mean the same when they fit exactly the same cards. To move a NOT inside brackets, put a NOT on each part and switch the joining word. AND turns into OR, and OR turns into AND.',
      terms: [T_SAME, T_JOIN],
      meaning: op === 'and'
        ? `The rule ${Q(given)} is false only for a card that is ${ft(a)} and also ${ft(b)}. Every other card fits it.`
        : `The rule ${Q(given)} is true only for a card that is not ${ft(a)} and also not ${ft(b)}.`,
      casesTitle: 'Test the question’s rule and the right answer on every kind of card.',
      cases: quads(A, B).map((q) => {
        const c = example(q);
        return cardCase(c, [qTruth(c), rTruth(c)], partsNote(a, b, c));
      }),
      remember: [`${Q(bracket)} means the same as ${Q(pushed, '.')}`, 'Ask: “When the NOT moved, did the joining word switch?”'],
      simpler: [
        `Try one card: ${aName(onePart)}. It is ${ft(a)}, but it is not ${ft(b)}.`,
        `Does it fit ${Q(given)}? ${yn(evaluate(given, onePart))}.`,
        `Does it fit ${Q(right)}? ${yn(evaluate(right, onePart))}.`,
        'The right answer agrees with the question’s rule on every kind of card.',
      ],
    },
  });
}

const sameMeaningPick: Gen = (rng, id) => sameMeaningAs(rng, id);

/**
 * One card that fits the first part only, against NOT (A AND B) (yes: the inside is false) or NOT (A OR B)
 * (no: the inside is true). The answer is computed from the rule.
 */
function bracketYesNoAs(rng: Rng, id: string, s: Skin, want?: 'and' | 'or'): ChooseItem {
  const [p, q] = twoFeatures(rng);
  const A = is(p), B = is(q);
  const op = want ?? rng.pick<'and' | 'or'>(['and', 'or']);
  const inner = op === 'and' ? and(A, B) : or(A, B);
  const rule = not(inner);
  const c = cardFitting(rng, and(A, not(B)));
  const answer = evaluate(rule, c) ? 'yes' : 'no';
  const fits = answer === 'yes';
  const teach = teachFor(rule, s, [c]);
  const ex = cardCase(c, [partTruth(A, c), partTruth(B, c), fitsTruth(inner, c), fitsTruth(rule, c)], noteFor(rule, c, s), { the: true });
  // The headline says what the card does, and why: the inside of the brackets decides it. The detail works the
  // inside out step by step (AND needs both parts; one part is enough for OR), then flips it.
  const fb: ChoiceFeedback = fits
    ? {
      headline: `This ${s.one} fits, because the inside of the brackets is false for it.`,
      detail: [`Do the brackets first. ${The(c)} is ${ft(p)}, but it is not ${ft(q)}. AND needs both parts, so ${Q(inner)} is false.`, `NOT flips false to true. So it fits ${Q(rule, '.')}`],
      example: ex,
    }
    : {
      headline: `This ${s.one} does not fit, because the inside of the brackets is true for it.`,
      detail: [`Do the brackets first. ${The(c)} is ${ft(p)}, so the part ${Q(A)} is true. One part is enough for OR, so ${Q(inner)} is true.`, `NOT flips true to false. So it does not fit ${Q(rule, '.')}`],
      example: ex,
    };
  const shown: Thing[] = [{ id: cardId(c), shape: c.shape, color: c.color, size: c.size }];
  return withInside(chooseItem({ id, lesson: L4, skill: 's2.bracket-yesno', conflict: true }, {
    prompt: s.yesNo(R(rule)),
    scene: { kind: 'things', things: shown },
    choices: YES_NO,
    answer,
    explain: fits
      ? `${The(c)} is ${ft(p)}, but it is not ${ft(q)}. So ${Q(inner)} is false, and NOT flips it to true. It fits.`
      : `${The(c)} is ${ft(p)}, so it fits ${Q(inner, '.')} NOT flips that, so it does not fit.`,
    hint: `Do the brackets first. Does this ${s.one} fit ${Q(inner)}? ${checkedOther(s)}`,
    // Never the card being asked about: one that does not fit if there is one, else any other card.
    hintCase: hintCaseOf(teach, [(x) => !sameCard(x, c) && !evaluate(rule, x), (x) => !sameCard(x, c)], id),
    feedback: { [fits ? 'no' : 'yes']: fb },
    teach,
  }), rule, shown, s);
}

const bracketYesNo: Gen = (rng, id, s) => bracketYesNoAs(rng, id, s);

// ---------- lesson 5: guess the rule ----------

type Family = 'simple' | 'and' | 'or' | 'any';

/** Two features joined by AND or OR, with no NOT inside ('red AND a circle', 'big OR blue'). */
const plainJoin = (f: Formula) => isJoin(f) && f.a.op === 'is' && f.b.op === 'is';

/**
 * The rules lessons 1-3 teach with a marked example and a board: one feature, NOT one feature, and two features
 * joined by AND or OR. A rule machine's secret rule and every wrong choice come from here. RULE_POOL's rules with a
 * NOT inside a two-part rule ('blue AND NOT big', 'red OR NOT a square') are left out: no lesson teaches them.
 */
export const TAUGHT_POOL: readonly Formula[] = RULE_POOL.filter((f) => literal(f) || plainJoin(f));

const TARGETS: Record<Family, readonly Formula[]> = {
  simple: LITERALS,
  and: TAUGHT_POOL.filter((f) => f.op === 'and'),
  or: TAUGHT_POOL.filter((f) => f.op === 'or'),
  any: TAUGHT_POOL,
};

/** What a rule from the pool says yes to, in plain words. */
function ruleSays(d: Formula, s: Skin): string {
  if (d.op === 'is') return `Your rule, ${Q(d, ',')} says yes only to a ${s.one} that is ${ft(d.f)}.`;
  if (d.op === 'not') return `Your rule, ${Q(d, ',')} says yes only to a ${s.one} that is not ${ft(featOf(d))}.`;
  if (d.op === 'and') return `Your rule, ${Q(d, ',')} says yes only when both parts are true.`;
  return `Your rule, ${Q(d, ',')} says yes when one part or both parts are true.`;
}

function guess(rng: Rng, id: string, s: Skin, family: Family): ChooseItem {
  return guessOn(rng, id, s, makeRuleGuess(rng, TARGETS[family], { distractors: 2, minCards: 6, maxCards: 9, pool: TAUGHT_POOL }));
}

/** "Which rule is it using?" on a built rule-machine puzzle. */
function guessOn(rng: Rng, id: string, s: Skin, g: RuleGuess): ChooseItem {
  const opts = rng.shuffle([g.target, ...g.distractors]);
  const choices = opts.map((f) => ({ id: ruleId(f), label: R(f) }));
  const byId = (tid: string) => g.things.find((t) => t.id === tid)!;
  // The machine's mark as its own truth row, read as yes or no (the card's words): "Its mark: no".
  const got = (t: Thing): Truth => ({ who: 'Its mark', value: t.mark === 'yes' });
  const feedback: Record<string, ChoiceFeedback> = {};
  g.distractors.forEach((d, k) => {
    const t = byId(g.ruledOutBy[k]);
    const yes = t.mark === 'yes';
    feedback[ruleId(d)] = {
      headline: yes ? `Your rule says no to ${the(t)}, but it got a yes.` : `Your rule says yes to ${the(t)}, but it got a no.`,
      detail: [ruleSays(d, s), whyFits(d, t, The(t), s), `But it got a ${t.mark}, so your rule is ruled out. One ${s.one} that does not match is enough.`],
      example: cardCase(t, [got(t), yourTruth(d, t), rightTruth(g.target, t)], 'The mark and your rule do not match.', { the: true, mark: t.mark }),
      simpler: [`Look at ${the(t)}. It got a ${t.mark}.`, `Does it fit ${Q(d)}? ${yn(evaluate(d, t))}.`, `The mark and the rule do not match. So ${Q(d)} is ruled out.`],
    };
  });
  // One sentence per card that rules something out: 'The big red circle rules out the rule “yellow.”'
  // or '... rules out the rules “yellow” and “red AND big.”'
  const outs = [...new Set(g.ruledOutBy)].map((tid) => {
    const ruled = g.distractors.filter((_, k) => g.ruledOutBy[k] === tid);
    const last = Q(ruled[ruled.length - 1], '.');
    const list = ruled.length === 1 ? `the rule ${last}` : `the rules ${ruled.slice(0, -1).map((f) => Q(f)).join(', ')} and ${last}`;
    return `${The(byId(tid))} rules out ${list}`;
  });
  const plain = (m: 'yes' | 'no') => g.things.find((t) => t.mark === m && !g.ruledOutBy.includes(t.id)) ?? g.things.find((t) => t.mark === m)!;
  const yesCard = plain('yes'), noCard = plain('no');
  const d0 = g.distractors[0], t0 = byId(g.ruledOutBy[0]);
  const ruledOut = g.distractors.map((d, k) => {
    const t = byId(g.ruledOutBy[k]);
    return cardCase(t, [got(t), fitsTruth(d, t)], `The mark and ${Q(d)} do not match. So ${Q(d)} is ruled out.`, { the: true, mark: t.mark });
  });
  // A rule that matches every mark is only kept for now: another rule might match them too. The answer comes from the
  // choices: the other two are ruled out, so the one left is the rule it uses.
  const many = ['no', 'one', 'two', 'three', 'four'][opts.length];
  const others = ['no', 'one', 'two', 'three', 'four'][opts.length - 1];
  const item = chooseItem({ id, lesson: L5, skill: 's2.guess-rule' }, {
    prompt: s.guess,
    scene: { kind: 'things', things: g.things },
    choices,
    answer: ruleId(g.target),
    explain: `Of these ${many} rules, only ${Q(g.target)} matches every mark. ${outs.join(' ')} The other ${others} are ruled out, so the rule must be ${Q(g.target, '.')}`,
    hint: `Test each rule on every ${s.one}. One ${s.one} that does not match rules it out. ${checkedOne(s)}`,
    // A card that rules out a wrong rule, already tested: it models the test without naming the secret rule.
    hintCase: ruledOut[0],
    feedback,
    teach: {
      rule: `The secret rule matches every mark. Each ${s.one} with a yes fits it. Each ${s.one} with a no does not fit it.`,
      terms: [markTerm(s), matchTerm(s), ruleOutTerm(s)],
      meaning: `Of these ${many} rules, only ${Q(g.target)} matches all ${g.things.length} marks. Each other rule gets at least one mark wrong, so it is ruled out.`,
      casesTitle: `Test each rule on the ${s.many}.`,
      cases: [
        cardCase(yesCard, [got(yesCard), fitsTruth(g.target, yesCard)], `The mark and ${Q(g.target)} match.`, { the: true, mark: 'yes' }),
        cardCase(noCard, [got(noCard), fitsTruth(g.target, noCard)], `The mark and ${Q(g.target)} match.`, { the: true, mark: 'no' }),
        ...ruledOut,
      ],
      remember: ['The right rule matches every mark. One mark that does not match rules a rule out.', `Ask: “Is there a ${s.one} whose mark this rule gets wrong?”`],
      simpler: [`Look at ${the(t0)}. It got a ${t0.mark}.`, `Does it fit ${Q(d0)}? ${yn(evaluate(d0, t0))}.`, `The mark and the rule do not match. So ${Q(d0)} is ruled out.`],
    },
  });
  return {
    ...item,
    // The pass rule asks for one of these: a wrong rule that only a no card rules out (a no card it fits).
    ...(ruledOutByNoOnly(g) ? { tags: [NO_CARD_OUT] } : {}),
    scratch: guessScratch(opts, g.things, s),
    scratchLabel: 'the test board',
    confused: guessConfused(s),
  };
}

const guessEasy: Gen = (rng, id, s) => guess(rng, id, s, rng.pick<Family>(['simple', 'and']));

/**
 * A rule machine where one wrong choice is ruled out only by a no card it fits (tagged for the pass rule), drawn again
 * from the same rng until it is one. Every lesson 5 pack holds one, so the pass rule can ask for it.
 */
const noCardOut = (gen: Gen): Gen => (rng, id, s) => {
  for (let i = 0; i < 80; i++) {
    const it = gen(rng, id, s);
    if (it.tags?.includes(NO_CARD_OUT)) return it;
  }
  throw new Error(`${id}: no rule machine where only a no card rules out a wrong rule`);
};
const guessOr: Gen = (rng, id, s) => guess(rng, id, s, 'or');
const guessHard: Gen = (rng, id, s) => guess(rng, id, s, 'any');

// ---------- try 1: a twin rule on the worked example's deck ----------
//
// The handoff's first quiz: "a twin rule on a shuffled twin of the same deck, pictures still up". The cards are the
// worked example's six cards in a new order (ids c1..c6); the rule is a new rule of the same family that marks the
// deck differently from the worked example and from the boards, so copying marks already shown never answers it.
// Plain cards, so nothing but the rule changes.

/** Try 1 is the same six cards every time: it stays in the planned quiz, never an extra item or a repair. */
const fixedGen = (gen: Gen): Gen => (rng, id, skin) => ({ ...gen(rng, id, skin), fixed: true });

const twinOf = (rng: Rng, pool: readonly Formula[], what: string) => {
  if (!pool.length) throw new Error(`no twin rules for ${what}`);
  return rng.pick(pool);
};

const notTwin: Gen = (rng, id) => notTapOn(id, ABSTRACT, featOf(twinOf(rng, TWINS.not, 'NOT')), shuffledDeck(rng, EXAMPLES.sample));

const andTwin: Gen = (rng, id) => {
  const r = twinOf(rng, TWINS.and, 'AND');
  if (!isJoin(r)) throw new Error('not a two-part rule');
  return andTapOn(id, ABSTRACT, featOf(r.a), featOf(r.b), shuffledDeck(rng, EXAMPLES.and));
};

const orTwin: Gen = (rng, id) => {
  const r = twinOf(rng, TWINS.or, 'OR');
  if (!isJoin(r)) throw new Error('not a two-part rule');
  return orTapOn(id, ABSTRACT, featOf(r.a), featOf(r.b), shuffledDeck(rng, EXAMPLES.or));
};

const notAndTwin: Gen = (rng, id) => {
  const r = twinOf(rng, TWINS.notAnd, 'NOT ( … AND … )');
  if (r.op !== 'not' || !isJoin(r.a)) throw new Error('not NOT ( … )');
  return notAndTapOn(id, ABSTRACT, featOf(r.a.a), featOf(r.a.b), shuffledDeck(rng, EXAMPLES.brackets));
};

const guessTwin: Gen = (rng, id) =>
  guessOn(rng, id, ABSTRACT, makeRuleGuess(rng, TWINS.guess, { distractors: 2, minCards: 6, maxCards: 6, pool: TAUGHT_POOL, deck: EXAMPLES.guess }));

// ---------- key ideas ----------

const card = (size: Card['size'], color: Card['color'], shape: Card['shape']): Card => ({ size, color, shape });
const mark = (yes: boolean): 'yes' | 'no' => (yes ? 'yes' : 'no');

/** A worked-example scene. With a rule, each card is marked yes (fits) or no, computed by the engine. */
export function exampleScene(cards: readonly Card[], rule?: Formula): Scene {
  return {
    kind: 'things',
    things: cards.map((c, i) => ({ id: `e${i + 1}`, ...c, ...(rule ? { mark: mark(evaluate(rule, c)) } : {}) })),
  };
}

const red = colorIs('red'), blue = colorIs('blue'), big = sizeIs('big'), small = sizeIs('small');
const circle = shapeIs('circle'), square = shapeIs('square');

/**
 * The worked examples' decks. The OR deck holds the handoff's four sample cards (the big red circle, the small red
 * square, the big blue circle and the small yellow triangle), so its board can drill the handoff's "big OR red".
 */
export const EXAMPLES = {
  sample: [card('big', 'red', 'circle'), card('small', 'blue', 'square'), card('big', 'yellow', 'triangle'),
    card('small', 'red', 'triangle'), card('big', 'blue', 'circle'), card('small', 'yellow', 'square')],
  and: [card('big', 'red', 'circle'), card('small', 'red', 'square'), card('small', 'blue', 'circle'),
    card('big', 'yellow', 'triangle'), card('small', 'red', 'circle'), card('big', 'red', 'triangle')],
  or: [card('small', 'blue', 'circle'), card('big', 'red', 'circle'), card('big', 'blue', 'square'),
    card('small', 'yellow', 'triangle'), card('big', 'blue', 'circle'), card('small', 'red', 'square')],
  brackets: [card('big', 'red', 'circle'), card('small', 'red', 'square'), card('big', 'blue', 'triangle'),
    card('small', 'yellow', 'circle'), card('big', 'yellow', 'square'), card('small', 'blue', 'triangle')],
  guess: [card('big', 'red', 'square'), card('small', 'blue', 'circle'), card('big', 'blue', 'triangle'),
    card('small', 'yellow', 'circle'), card('small', 'red', 'triangle'), card('big', 'yellow', 'square')],
} as const;

/** Rules the key-idea cards and the guided boards show, so tests can check every claim they make. */
export const EXAMPLE_RULES = {
  red,
  notRed: not(red),
  notCircle: not(circle),
  redAndCircle: and(red, circle),
  circleOrBlue: or(circle, blue),
  notRedAndBig: not(and(red, big)),
  notRedAndNotBig: and(not(red), not(big)),
  notRedOrBig: not(or(red, big)),
  notRedOrNotBig: or(not(red), not(big)),
  guess: or(blue, big),
  guessWrong: blue,
  /** The contrast card's second rule: the small blue circle got a yes, but it does not fit “big.” */
  guessBig: big,
  /** Kept vs proved: a second rule that matches all six marks too. The big red circle tells it apart from blue OR big. */
  guessKept: or(blue, square),
  // The guided boards: a new rule of the same family on the same cards.
  notBlue: not(blue),
  notSquare: not(square),
  redAndBig: and(red, big),
  bigOrRed: or(big, red),
  notBlueAndSmall: not(and(blue, small)),
  notBlueAndNotSmall: and(not(blue), not(small)),
  notBlueOrSmall: not(or(blue, small)),
  notBlueOrNotSmall: or(not(blue), not(small)),
  /** The rule the learner tests on Guess the rule's board: only the small yellow circle, a no card it fits, rules it out. */
  guessTest: or(circle, big),
};
const E = EXAMPLE_RULES;

/** Lesson 4's contrast card: the small red square fits NOT (red AND big), but not its inside. */
const SMALL_RED_SQUARE: Card = card('small', 'red', 'square');
/** Lesson 5's contrast card: the small blue circle got a yes. */
const SMALL_BLUE_CIRCLE: Card = card('small', 'blue', 'circle');
/** Kept vs proved: a card not on the deck that the two kept rules disagree on. */
const BIG_RED_CIRCLE: Card = card('big', 'red', 'circle');

/** A card of a key idea's deck, with its machine mark when the deck has marks. */
function deckCard(scene: Scene, c: Card): Thing {
  const t = scene.kind === 'things' ? scene.things.find((x) => sameCard(x, c)) : undefined;
  if (!t) throw new Error(`${cardName(c)} is not on the deck`);
  return t;
}

/** The labels of a contrast on cards: the card or the marks over each panel, then the rule and Fits or Not. */
const cardContrastWords = (worldTag: string, saysWord: string, truth = 'Fits', untruth = 'Not'): ContrastWords => ({ worldTag, saysWord, truth, untruth });

/** Whether a card fits the inside, after its two facts: "AND needs both parts, so it does not fit the inside." */
function insideVerdict(inner: Formula, c: Card): string {
  if (!isJoin(inner)) throw new Error(`${render(inner)} has no two parts`);
  const va = evaluate(inner.a, c), vb = evaluate(inner.b, c);
  if (inner.op === 'and') return va && vb ? 'Both parts are true, so it fits the inside.' : 'AND needs both parts, so it does not fit the inside.';
  if (va && vb) return 'Both parts are true. OR takes that too, so it fits the inside.';
  return va || vb ? 'One part is true. That is enough for OR, so it fits the inside.' : 'No part is true, so it does not fit the inside.';
}

/**
 * Lesson 4's contrast: one card, two questions. The inside of the brackets, then the whole rule. NOT flips the
 * answer, so a card that does not fit the inside fits the whole rule. Both truths from evaluate().
 */
function insideContrast(rule: Formula, c: Card): Extract<Scene, { kind: 'contrast' }> {
  const inner = innerOf(rule);
  const vIn = evaluate(inner, c), vAll = evaluate(rule, c);
  const thing: Thing = { id: cardId(c), shape: c.shape, color: c.color, size: c.size };
  const world = `${The(c)}.`;
  const fitsWord = (v: boolean) => (v ? 'fits' : 'does not fit');
  const panel = (who: string, says: Formula, truth: boolean, because: string): ContrastPanel => ({ world, who, says: R(says), truth, because, things: [thing] });
  return {
    kind: 'contrast',
    pairs: [
      panel('Inside', inner, vIn, `${twoFacts(inner, c)} ${insideVerdict(inner, c)}`),
      panel('Whole', rule, vAll, `It ${fitsWord(vIn)} the inside. NOT flips that, so it ${fitsWord(vAll)} the whole rule.`),
    ],
    ask: { q: 'Did the card change?', a: `No. Only the question changed. ${The(c)} ${fitsWord(vIn)} the inside, but it ${fitsWord(vAll)} the whole rule.` },
    words: cardContrastWords('The card', 'rule:'),
  };
}

/**
 * Lesson 5's contrast: the same card with the same mark, two rules to test. Fits or Not changes with the rule; the
 * mark never does. Each panel ends with the match: the mark and the rule agree, or they do not.
 */
function markContrast(c: Thing, rules: [Formula, Formula]): Extract<Scene, { kind: 'contrast' }> {
  const panel = (rule: Formula): ContrastPanel => {
    const fits = evaluate(rule, c), ok = matchesMark(rule, c);
    return {
      world: `${The(c)}. Its mark: ${c.mark}.`,
      who: 'The rule',
      says: R(rule),
      truth: fits,
      because: whyFits(rule, c, 'It', ABSTRACT),
      things: [c],
      then: ok
        ? `Its mark is ${c.mark}, and the rule says ${fits ? 'Fits' : 'Not'}. A match, so this card does not rule it out.`
        : `Its mark is ${c.mark}, but the rule says ${fits ? 'Fits' : 'Not'}. No match, so this card rules out ${Q(rule, '.')}`,
    };
  };
  return {
    kind: 'contrast',
    pairs: [panel(rules[0]), panel(rules[1])],
    ask: { q: 'Did the mark change?', a: `No. It got a ${c.mark} both times. Only the rule changed, so Fits or Not changed. The mark and Fits or Not are two different things.` },
    words: cardContrastWords('The card', 'you test:'),
  };
}

/**
 * Kept vs proved: the same six marks, two rules that each match every one. Each is kept for now; a new card the two
 * disagree on (the big red circle) shows that neither is proved.
 */
function keptContrast(deck: readonly Thing[], rules: [Formula, Formula], fresh: Card): Extract<Scene, { kind: 'contrast' }> {
  const panel = (rule: Formula): ContrastPanel => {
    if (!isJoin(rule) || rule.op !== 'or' || !literal(rule.a) || !literal(rule.b)) throw new Error(`${render(rule)} is not one OR another`);
    const [a, b] = [featOf(rule.a), featOf(rule.b)];
    const kept = deck.every((t) => matchesMark(rule, t));
    // Every yes card is a or b, and every no card is neither: the same thing as matching every mark, for an OR rule.
    if (deck.some((t) => (t.mark === 'yes') !== (has(t, a) || has(t, b)))) throw new Error(`${render(rule)}: the panel's words are not true of the deck`);
    return {
      world: 'The six cards from the example, with their marks.',
      who: 'The rule',
      says: R(rule),
      truth: kept,
      because: `Every yes card is ${ft(a)} or ${ft(b)}. Every no card is not ${ft(a)} and not ${ft(b)}. No card rules it out.`,
      things: [...deck],
      then: `A new card, ${the(fresh)}, ${evaluate(rule, fresh) ? 'fits' : 'does not fit'} this rule.`,
    };
  };
  if (evaluate(rules[0], fresh) === evaluate(rules[1], fresh)) throw new Error('the new card must tell the two kept rules apart');
  return {
    kind: 'contrast',
    pairs: [panel(rules[0]), panel(rules[1])],
    ask: { q: 'Did the marks change?', a: `No. The two rules each match every mark, so each one is kept for now. Not one of them is proved. A new card, like ${the(fresh)}, could still rule one out.` },
    words: cardContrastWords('The marks', 'you test:', 'Kept for now', 'Ruled out'),
  };
}

/** The worked guess-the-rule deck: the six cards with the machine's marks for “blue OR big.” */
const GUESS_SCENE = exampleScene(EXAMPLES.guess, E.guess);
const GUESS_DECK = GUESS_SCENE.kind === 'things' ? GUESS_SCENE.things : [];

/** The contrast pictures. Each is the very scene its board shows (afterCard), so the Do sits next to its See. */
const L4_CONTRAST_SCENE = insideContrast(E.notRedAndBig, SMALL_RED_SQUARE);
const L5_MARK_SCENE = markContrast(deckCard(GUESS_SCENE, SMALL_BLUE_CIRCLE), [E.guess, E.guessBig]);
const L5_KEPT_SCENE = keptContrast(GUESS_DECK, [E.guess, E.guessKept], BIG_RED_CIRCLE);

const IDEAS: Record<string, IdeaCard[]> = {
  [L1]: [
    {
      title: 'Every card has three features',
      body: [
        'Each card has a shape, a color, and a size.',
        'A feature is one thing you can see about a card, like its color.',
        'The shapes are circle, square, and triangle. The colors are red, blue, and yellow. The sizes are big and small.',
      ],
      scene: exampleScene(EXAMPLES.sample),
    },
    {
      title: 'Sort by one feature',
      body: [
        'Pick one color, like red.',
        'Now each card is in the red group, or it is out. A check mark (✓) shows a card that is in the group. A cross (✗) shows a card that is out.',
      ],
      scene: exampleScene(EXAMPLES.sample, E.red),
    },
    {
      title: 'NOT means everything else',
      body: [
        'NOT red means every card that is not red.',
        'Blue cards fit. Yellow cards fit too. Only the red cards are left out.',
        'So NOT red is not “the blue ones.” NOT red is not one other color. It takes every color but red.',
      ],
      scene: exampleScene(EXAMPLES.sample, E.notRed),
    },
    {
      title: 'NOT on a shape or a size',
      body: [
        'NOT works the same way on a shape. NOT a circle means every card that is not a circle.',
        'Squares fit. Triangles fit too. Only the circles are left out.',
        'NOT big takes every card that is not big. That is the small cards.',
      ],
      scene: exampleScene(EXAMPLES.sample, E.notCircle),
    },
    {
      title: 'Check one card at a time',
      body: [
        'Look at one card. Does it have the feature?',
        'If it does, NOT leaves it out. If it does not, NOT takes it.',
      ],
    },
  ],
  [L2]: [
    {
      title: 'AND joins two parts',
      body: [
        'A rule can have two parts joined by AND.',
        'Red AND a circle means two things. The card must be red. It must also be a circle.',
      ],
    },
    {
      title: 'Both parts must fit',
      body: [
        'A red square is red, but it is not a circle. So it does not fit.',
        'A blue circle does not fit either. Only red circles fit.',
      ],
      scene: exampleScene(EXAMPLES.and, E.redAndCircle),
    },
    {
      title: 'AND makes a smaller group',
      body: [
        'Each part of an AND rule leaves some cards out.',
        'So the AND group is never bigger than either part on its own.',
      ],
    },
    {
      title: 'Check each part',
      body: [
        'Look at one card. Check the first part. Then check the second part.',
        'The card fits only if both checks say yes.',
      ],
    },
  ],
  [L3]: [
    {
      title: 'OR joins two parts',
      body: [
        'The rule a circle OR blue means a card fits if it is a circle.',
        'It also fits if it is blue.',
      ],
    },
    {
      title: 'Both parts true counts too',
      body: [
        'What about a blue circle? It is a circle, and it is blue. Both parts are true.',
        'It fits. In logic, OR includes a card that fits both parts.',
      ],
      scene: exampleScene(EXAMPLES.or, E.circleOrBlue),
    },
    {
      title: 'Everyday OR can be different',
      body: [
        'At home, “juice or milk?” often means you pick one.',
        'In logic, OR always includes a card that fits both parts.',
        `So the rule ${render(E.circleOrBlue)} takes circles, it takes blue cards, and it takes blue circles too.`,
      ],
    },
    {
      title: 'OR makes a bigger group',
      body: [
        'Each part of an OR rule adds more cards.',
        'So the OR group is never smaller than either part on its own.',
      ],
    },
    {
      title: 'Check each part',
      body: [
        'Look at one card. Does the first part fit? Does the second part fit?',
        'If at least one says yes, the card fits.',
      ],
    },
  ],
  [L4]: [
    {
      title: 'Brackets group parts',
      body: [
        'Brackets, also called parentheses, look like this: ( ). They hold parts of a rule together.',
        'The part inside the brackets is the inside. Always work out the inside first.',
      ],
    },
    {
      title: 'The inside: red AND big',
      body: [
        'Take the rule NOT (red AND big). Its inside is red AND big. Start there.',
        'Only the big red circle is red AND big. The marks show the cards that fit the inside.',
      ],
      scene: exampleScene(EXAMPLES.brackets, innerOf(E.notRedAndBig)),
    },
    {
      title: 'Inside or whole?',
      distinction: INSIDE_VS_WHOLE.id,
      body: [
        'You can ask two questions about one card. Does it fit the inside? Does it fit the whole rule?',
        'They are two different questions, because NOT flips the answer. Look at the small red square below.',
      ],
      scene: L4_CONTRAST_SCENE,
    },
    {
      title: 'NOT (red AND big)',
      body: [
        'Now NOT flips the inside. It takes every card that does not fit the inside.',
        'For one card: if it fits the inside, NOT leaves it out. If it does not fit the inside, NOT takes it.',
        'So a small red card fits. A big blue card fits too. Only the big red circle is left out.',
      ],
      scene: exampleScene(EXAMPLES.brackets, E.notRedAndBig),
    },
    {
      title: 'NOT red AND NOT big',
      body: [
        'This rule has no brackets. A card must be NOT red. It must also be NOT big.',
        'So a small red card does not fit. Only small cards that are blue or yellow fit.',
      ],
      scene: exampleScene(EXAMPLES.brackets, E.notRedAndNotBig),
    },
    {
      title: 'NOT (red OR big)',
      body: [
        'First find the cards that fit the inside, red OR big. NOT takes the rest.',
        'So a card fits only when it is not red, and it is not big.',
        'That is the same as NOT red AND NOT big. The same two cards fit: the small yellow circle and the small blue triangle.',
      ],
      scene: exampleScene(EXAMPLES.brackets, E.notRedOrBig),
    },
    {
      title: 'Watch the switch',
      body: [
        'To move a NOT inside the brackets, put a NOT on each part. Then AND turns into OR, and OR turns into AND.',
        'So NOT (red AND big) means the same as NOT red OR NOT big.',
        'The same cards fit as for NOT (red AND big). Only the big red circle is left out.',
      ],
      scene: exampleScene(EXAMPLES.brackets, E.notRedOrNotBig),
    },
  ],
  [L5]: [
    {
      title: 'The rule machine',
      body: [
        'A rule machine has a secret rule. It lets through every card that fits the rule. It stops every card that does not.',
        'Each card gets a mark. A check mark means yes: the card got through. A cross means no: it was stopped.',
        'The mark is the machine’s answer. It never changes.',
      ],
    },
    {
      title: 'Test a rule',
      body: [
        'To test a rule, check it against every card you can see. First ask the rule: does this card fit, or not?',
        'Then compare that with the card’s mark. A yes card that fits is a match. A no card that does not fit is a match too.',
        'A yes card that does not fit is no match. So is a no card that fits.',
      ],
    },
    {
      title: 'One card can rule it out',
      body: [
        'If even one card does not match, the rule is wrong.',
        'To rule out a rule means to show it cannot be the one. One card is enough to do that.',
      ],
    },
    {
      title: 'Two different things',
      distinction: MARK_VS_FITS.id,
      body: [
        'Each card has a mark. Each rule you test gives it Fits or Not. These are two different things.',
        'The mark is the machine’s answer, and it never changes. Fits or Not comes from the rule you test, so it changes with the rule.',
        'Look at the small blue circle below. Same card, same mark, two rules.',
      ],
      scene: L5_MARK_SCENE,
    },
    {
      title: 'A worked example',
      body: [
        'Could the rule be blue? The big red square got a yes, but it is not blue. No match, so the rule can’t be blue.',
        'Now try blue OR big. Every yes card is blue or big. Every no card is not blue and not big. It matches every mark, so keep it for now.',
      ],
      scene: GUESS_SCENE,
    },
    {
      title: 'Kept is not proved',
      distinction: KEPT_VS_PROVED.id,
      body: [
        'A rule that matches every mark is kept for now. It is still possible, but it is not proved. Stop 7 has more on guesses like this.',
        'Look below. Two rules match all six marks. A new card could tell them apart. It is like “Can’t tell yet” in Stop 1: the marks do not decide it.',
        'In a puzzle, the rule the machine uses is one of the choices. When the other choices are ruled out, the one left must be it.',
      ],
      scene: L5_KEPT_SCENE,
    },
  ],
};

// ---------- try 1's twin rules ----------

/** Two-part rules of one kind (from `join`) whose two parts the deck shows every way: both, one, the other, no part. */
const pairRules = (deck: readonly Card[], join: (A: Formula, B: Formula) => Formula): Formula[] =>
  FEATURE_PAIRS.filter(([a, b]) => showsEveryWay(is(a), is(b), deck)).map(([a, b]) => join(is(a), is(b)));

/** Can a rule machine on this deck use the rule: does each part matter, and are there two near-miss taught rules? */
const guessable = (deck: readonly Card[]) => (t: Formula): boolean => {
  if (!isJoin(t)) return false;
  const marks = deck.map((c) => evaluate(t, c));
  const misses = (g: Formula) => deck.filter((c, i) => evaluate(g, c) !== marks[i]).length;
  if (misses(t.a) === 0 || misses(t.b) === 0) return false;
  return TAUGHT_POOL.filter((g) => !sameMeaning(g, t) && misses(g) >= 1 && misses(g) <= 2).length >= 2;
};

/**
 * Try 1's twin rules, one list per lesson (see deckTwins): the worked example's family on its deck, marking the
 * deck differently from the key ideas and the boards. NOT twins use a color or a shape, so "everything else" is
 * always more than one value.
 */
export const TWINS = {
  not: deckTwins(EXAMPLES.sample, ALL_FEATURES.filter((f) => featuresOf(f.kind).length === 3).map((f) => not(is(f))), [E.notRed, E.notCircle, E.notBlue, E.notSquare], { minFit: 2, minOut: 2 }),
  and: deckTwins(EXAMPLES.and, pairRules(EXAMPLES.and, and), [E.redAndCircle, E.redAndBig], { minFit: 2, minOut: 2 }),
  or: deckTwins(EXAMPLES.or, pairRules(EXAMPLES.or, or), [E.circleOrBlue, E.bigOrRed], { minFit: 2, minOut: 2 }),
  notAnd: deckTwins(
    EXAMPLES.brackets,
    pairRules(EXAMPLES.brackets, (A, B) => not(and(A, B))),
    [E.notRedAndBig, E.notRedAndNotBig, E.notRedOrBig, E.notRedOrNotBig, E.notBlueAndSmall, E.notBlueAndNotSmall, E.notBlueOrSmall, E.notBlueOrNotSmall],
    { minFit: 2, minOut: 1 },
  ),
  guess: deckTwins(EXAMPLES.guess, pairRules(EXAMPLES.guess, or), [E.guess, E.guessWrong, E.guessBig, E.guessKept, E.guessTest], { minFit: 2, minOut: 2 }).filter(guessable(EXAMPLES.guess)),
};

// ---------- Do: the guided boards ----------
//
// Each board keeps a key idea's picture up: the same six cards, with that rule's marks (the case already shown).
// The learner marks the same cards, one row per new rule of the same family, by tapping Fits or Not under each card.
// Every right mark comes from deckRow() / ruleTestRow() in the rule engine (evaluate() and the machine's marks), and
// every wrong mark gets whyFits(): what the card is, and what the rule needs. No board asks for a final answer.

/** The words for a wrong mark: "The big red circle is not blue, so it fits “NOT blue.”" */
const cardWords: CardWords = (rule, c) => whyFits(rule, c, The(c), ABSTRACT);

/** The cards a key idea shows. */
function deckOf(see: IdeaCard): Thing[] {
  if (see.scene?.kind !== 'things') throw new Error(`${see.title}: no cards to mark`);
  return see.scene.things;
}

/** A board on a key idea's picture: one row of Fits / Not marks for each new rule. */
function deckBoard(see: IdeaCard, o: { id: string; title: string; body: string[]; rows: { rule: Formula; note?: string }[]; done: string }): DrillStep {
  const deck = deckOf(see);
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    scene: see.scene,
    rows: o.rows.map((r, k) => deckRow(r.rule, deck, cardWords, { id: `${o.id}-r${k + 1}`, label: `Rule: ${R(r.rule)}`, ...(r.note ? { note: r.note } : {}) })),
    done: o.done,
  };
}

/** The values a NOT x rule takes: every other value of x's feature. */
const othersOf = (rule: Formula) => {
  const x = featOf(rule);
  return featuresOf(x.kind).filter((f) => !sameFeature(f, x));
};

/** "Red cards and yellow cards fit. Only the blue cards are left out." */
const notNote = (rule: Formula) => `${cap(groups(othersOf(rule), ABSTRACT))} fit. Only the ${group(featOf(rule), ABSTRACT)} are left out.`;

/** The cards of a deck that fit a rule. */
const fitting = (rule: Formula, deck: readonly Card[]) => deck.filter((c) => evaluate(rule, c));

/** The inside of NOT ( … ): “blue OR small” for “NOT (blue OR small).” */
function innerOf(rule: Formula): Formula {
  if (rule.op !== 'not' || !isJoin(rule.a)) throw new Error(`${render(rule)} is not NOT ( … )`);
  return rule.a;
}

/** "Only the big red circle and the big red triangle fit. AND needs both parts." */
function andNote(rule: Formula, deck: readonly Card[]): string {
  const fit = fitting(rule, deck);
  return `Only ${names(fit)} ${plural(fit.length, 'fits', 'fit')}. AND needs both parts.`;
}

/** The first card of a deck that fits both parts of a two-part rule. */
function bothCard(rule: Formula, deck: readonly Card[]): Card {
  if (!isJoin(rule)) throw new Error(`${render(rule)} has no two parts`);
  const c = deck.find((x) => evaluate(rule.a, x) && evaluate(rule.b, x));
  if (!c) throw new Error(`no card fits both parts of ${render(rule)}`);
  return c;
}

/** "Right. The big red circle fits even though it is big and red. …" */
function orDone(rule: Formula, deck: readonly Card[]): string {
  if (!isJoin(rule)) throw new Error(`${render(rule)} has no two parts`);
  const c = bothCard(rule, deck);
  return `Right. ${The(c)} fits even though it is ${ft(featOf(rule.a))} and ${ft(featOf(rule.b))}. A card that fits both parts still fits OR.`;
}

/** Brackets change who fits: the cards that fit `withBrackets` but not `without`, named. */
function bracketDone(withBrackets: Formula, without: Formula, deck: readonly Card[]): string {
  const changed = deck.filter((c) => evaluate(withBrackets, c) !== evaluate(without, c));
  if (!changed.length || changed.some((c) => !evaluate(withBrackets, c))) throw new Error('the bracket board needs cards that fit only the bracket rule');
  return `Right. The brackets changed who fits. ${cap(names(changed))} ${plural(changed.length, 'fits', 'fit')} ${Q(withBrackets, '.')} ${plural(changed.length, 'It does', 'They do')} not fit ${Q(without, '.')}`;
}

/** Two rules that mean the same: the cards that fit (or the fewer cards left out), and the sameness, named. */
function sameDone(rule: Formula, twin: Formula, deck: readonly Card[]): string {
  if (!sameMeaning(rule, twin)) throw new Error(`${render(rule)} and ${render(twin)} do not mean the same`);
  const fit = fitting(rule, deck), out = deck.filter((c) => !evaluate(rule, c));
  const who = out.length < fit.length
    ? `Only ${names(out)} ${plural(out.length, 'is', 'are')} left out.`
    : `Only ${names(fit)} ${plural(fit.length, 'fits', 'fit')}.`;
  return `Right. ${who} ${Q(rule)} fits the same cards as ${Q(twin, '.')}`;
}

/** A rule machine board's words for a wrong mark, Keep for now, Rule out, and Match. */
const guessWords: MatchWords = {
  card: cardWords,
  keep: (r) => `Each yes card fits ${Q(r, ',')} and each no card does not. No card rules it out, so keep it for now.`,
  ruleOut: (r, t) => `${The(t)} got a ${t.mark}, but it ${evaluate(r, t) ? 'fits' : 'does not fit'} ${Q(r, '.')} One card that does not match is enough to rule it out.`,
  match: (r, t) => {
    const fits = evaluate(r, t);
    return matchesMark(r, t)
      ? `${The(t)} got a ${t.mark}, and it ${fits ? 'fits' : 'does not fit'} ${Q(r, '.')} The mark and the rule agree, so it is a match.`
      : `${The(t)} got a ${t.mark}, but it ${fits ? 'fits' : 'does not fit'} ${Q(r, '.')} The mark and the rule do not agree, so it is no match.`;
  },
};

/** "Right. Only the small blue triangle fits the inside, so NOT leaves it out. Every other card fits “NOT (blue AND small).”" */
function insideDone(rule: Formula, deck: readonly Card[]): string {
  const inside = fitting(innerOf(rule), deck);
  if (!inside.length || inside.length === deck.length) throw new Error('the inside must take some cards and leave some out');
  const n = inside.length;
  return `Right. Only ${names(inside)} ${plural(n, 'fits', 'fit')} the inside, so NOT leaves ${plural(n, 'it', 'them')} out. Every other card fits ${Q(rule, '.')}`;
}

// ---------- lesson 4's boards: the inside, then the whole rule ----------

/** The card the inside contrast is about, and the two questions about it. */
function insideQuestionsBoard(): DrillStep {
  const rule = E.notRedAndBig, inner = innerOf(rule);
  const thing = L4_CONTRAST_SCENE.pairs[0].things![0];
  const inRow = deckRow(inner, [thing], cardWords, { id: 's2.l4-two-in', label: `Inside: ${R(inner)}` });
  const allRow = deckRow(rule, [thing], cardWords, { id: 's2.l4-two-all', label: `Rule: ${R(rule)}` });
  const [mIn, mAll] = [inRow.marks[0], allRow.marks[0]];
  if (mIn.answer === mAll.answer) throw new Error('NOT must flip the inside');
  return {
    id: 's2.l4-two-questions',
    title: 'Mark the two questions',
    body: [`The same card, two questions. First: does it fit the inside, ${Q(inner)}? Then: does it fit the whole rule?`],
    scene: L4_CONTRAST_SCENE,
    rows: [inRow, allRow],
    afterCard: 2,
    distinction: INSIDE_VS_WHOLE.id,
    // The whole rule marked like the inside, or the inside marked like the whole rule: the two questions merged.
    misconceptions: [
      { id: 'inside-as-whole', when: 'picks', picks: { [mIn.id]: mIn.answer, [mAll.id]: mIn.answer }, text: INSIDE_AS_WHOLE },
      { id: 'whole-as-inside', when: 'picks', picks: { [mIn.id]: mAll.answer, [mAll.id]: mAll.answer }, text: INSIDE_AS_WHOLE },
    ],
    confused: insideConfused(ABSTRACT),
    words: insideWords(INSIDE_BOARD_CLOSING),
    done: `Right. ${The(thing)} ${evaluate(inner, thing) ? 'fits' : 'does not fit'} the inside, so it ${evaluate(rule, thing) ? 'fits' : 'does not fit'} the whole rule. The inside and the whole rule are two different questions.`,
  };
}

/** The closing line of "I’m confused" on a lesson 4 board. */
const INSIDE_BOARD_CLOSING = 'Those ideas are apart now. Back to the board: mark the inside first, then let NOT flip it.';

/** The board after NOT (red AND big): the inside row is shown (with its facts); the learner flips it for the whole rule. */
function insideFirstBoard(): DrillStep {
  const see = IDEAS[L4][3], deck = deckOf(see);
  const rule = E.notBlueAndSmall, inner = innerOf(rule);
  const inRow = deckRow(inner, deck, cardWords, { id: 's2.l4-do-in', label: `Inside: ${R(inner)}`, given: true, compare: partsCompare, needs: needsOf(inner) });
  const allRow = deckRow(rule, deck, cardWords, { id: 's2.l4-do-all', label: `Rule: ${R(rule)}`, compare: wholeCompare, needs: FLIP_NEEDS });
  return {
    id: 's2.l4-do',
    title: 'Mark the cards',
    body: [
      `These are the six cards from the key idea. The marks show ${Q(E.notRedAndBig, '.')}`,
      `Now the rule is ${Q(rule, '.')} The inside row is shown. Do the inside first, then flip it for each card.`,
    ],
    scene: see.scene,
    rows: [inRow, allRow],
    afterCard: 3,
    scaffold: 'full',
    distinction: INSIDE_VS_WHOLE.id,
    misconceptions: [{ id: 'inside-as-whole', when: 'picks', picks: picksLike(allRow, inRow), text: INSIDE_AS_WHOLE }],
    confused: insideConfused(ABSTRACT),
    words: insideWords(INSIDE_BOARD_CLOSING),
    done: insideDone(rule, EXAMPLES.brackets),
  };
}

/** The board after NOT red AND NOT big: the bracket rule is shown, the learner marks the rule without brackets. */
function bracketsBoard(): DrillStep {
  const see = IDEAS[L4][4], deck = deckOf(see);
  const shown = deckRow(E.notBlueAndSmall, deck, cardWords, { id: 's2.l4-do-pair-shown', label: `Rule: ${R(E.notBlueAndSmall)}`, given: true });
  const mine = deckRow(E.notBlueAndNotSmall, deck, cardWords, { id: 's2.l4-do-pair', label: `Rule: ${R(E.notBlueAndNotSmall)}`, compare: partsCompare, needs: `No brackets: each NOT flips only the word after it. ${needsOf(E.notBlueAndNotSmall)}` });
  return {
    id: 's2.l4-do-pair',
    title: 'Now take the brackets away',
    body: [
      `The marks show ${Q(E.notRedAndNotBig, '.')} The shown row is the rule from the last board, ${Q(E.notBlueAndSmall, '.')}`,
      `Now mark ${Q(E.notBlueAndNotSmall, '.')} It has no brackets. Tap Fits or Not for each card.`,
    ],
    scene: see.scene,
    rows: [shown, mine],
    afterCard: 4,
    misconceptions: [
      {
        id: 'brackets-dropped',
        when: 'picks',
        picks: picksLike(mine, shown),
        text: `You may be treating ${Q(E.notBlueAndSmall)} and ${Q(E.notBlueAndNotSmall)} as the same rule. They are two different rules. With brackets, NOT flips the whole inside. Without brackets, each NOT flips only the word after it.`,
      },
    ],
    confused: insideConfused(ABSTRACT),
    words: insideWords('Those ideas are apart now. Back to the board: this rule has no brackets, so each NOT flips only the word after it.'),
    done: bracketDone(E.notBlueAndSmall, E.notBlueAndNotSmall, EXAMPLES.brackets),
  };
}

/** The board after NOT (red OR big): the learner marks the inside row, then the whole rule. */
function insideOrBoard(): DrillStep {
  const see = IDEAS[L4][5], deck = deckOf(see);
  const rule = E.notBlueOrSmall, inner = innerOf(rule);
  const inRow = deckRow(inner, deck, cardWords, { id: 's2.l4-do-or-in', label: `Inside: ${R(inner)}`, compare: partsCompare, needs: needsOf(inner) });
  const allRow = deckRow(rule, deck, cardWords, { id: 's2.l4-do-or-all', label: `Rule: ${R(rule)}`, needs: FLIP_NEEDS });
  return {
    id: 's2.l4-do-or',
    title: 'Now OR inside the brackets',
    body: [
      `The marks show ${Q(E.notRedOrBig, '.')}`,
      `Now the rule is ${Q(rule, '.')} First mark the inside row: does each card fit ${Q(inner)}? Then flip it for the whole rule.`,
    ],
    scene: see.scene,
    rows: [inRow, allRow],
    afterCard: 5,
    distinction: INSIDE_VS_WHOLE.id,
    // The inside marked right, then copied into the whole rule without the flip.
    misconceptions: [{ id: 'inside-as-whole', when: 'picks', picks: { ...rightPicks(inRow), ...picksLike(allRow, inRow) }, text: INSIDE_AS_WHOLE }],
    confused: insideConfused(ABSTRACT),
    words: insideWords(INSIDE_BOARD_CLOSING),
    done: sameDone(rule, E.notBlueAndNotSmall, EXAMPLES.brackets),
  };
}

// ---------- lesson 5's boards: the mark, Fits or Not, and a match ----------

/** The closing line of "I’m confused" on a lesson 5 board. */
const MARK_BOARD_CLOSING = 'Those ideas are apart now. Back to the board: work out Fits or Not from the rule. Then compare it with the mark.';

/**
 * The board right after the mark-vs-fits contrast: the small blue circle (a yes card) under the contrast's two rules,
 * then a no card that a rule does not fit. Each row: Fits or Not from the rule, then whether that matches the mark.
 */
function markBoard(): DrillStep {
  const blueCircle = deckCard(GUESS_SCENE, SMALL_BLUE_CIRCLE);
  const yellowCircle = deckCard(GUESS_SCENE, card('small', 'yellow', 'circle'));
  const label = (t: Thing, r: Formula) => `${The(t)} got a ${t.mark}. Test the rule ${Q(r, '.')}`;
  const rows: DrillRow[] = [
    cardTestRow(E.guess, blueCircle, guessWords, { id: 's2.l5-two-r1', label: label(blueCircle, E.guess) }),
    cardTestRow(E.guessBig, blueCircle, guessWords, { id: 's2.l5-two-r2', label: label(blueCircle, E.guessBig) }),
    cardTestRow(E.guessBig, yellowCircle, guessWords, { id: 's2.l5-two-r3', label: label(yellowCircle, E.guessBig) }),
  ];
  const [fits, match] = [(k: number) => rows[k].marks[0], (k: number) => rows[k].marks[1]];
  // The rows the board needs: a yes card that fits (a match), the same yes card that does not (no match), and a no
  // card that does not fit (a match too).
  if (JSON.stringify(rows.map((r) => r.marks.map((m) => m.answer))) !== JSON.stringify([['fit', 'yes'], ['not', 'no'], ['not', 'yes']])) throw new Error('the mark board’s cases are not the ones it teaches');
  const copied: Record<string, string> = Object.fromEntries(rows.map((_, k) => [fits(k).id, fits(k).thing!.mark === 'yes' ? 'fit' : 'not']));
  return {
    id: 's2.l5-two-things',
    title: 'The mark, then the rule',
    body: [
      'For each row, ask the rule first: Fits or Not? Do not look at the mark for that.',
      'Then compare: does Fits or Not match the card’s mark?',
    ],
    scene: L5_MARK_SCENE,
    rows,
    afterCard: IDEAS[L5].findIndex((c) => c.scene === L5_MARK_SCENE),
    distinction: MARK_VS_FITS.id,
    misconceptions: [
      { id: 'copied-mark', when: 'picks', picks: copied, text: COPIED_MARK },
      { id: 'copied-yes', when: 'picks', picks: { [fits(1).id]: 'fit' }, text: COPIED_MARK },
      { id: 'not-as-no-match', when: 'picks', picks: { [fits(2).id]: 'not', [match(2).id]: 'no' }, text: NOT_AS_NO_MATCH },
      { id: 'verdict-only', when: 'verdict-only', text: 'Your Fits or Not is right. Now compare it with the card’s mark. Yes with Fits is a match, and no with Not is a match. Any other pair is no match.' },
    ],
    confused: MARK_CONFUSED,
    words: markWords(MARK_BOARD_CLOSING),
    done: `Right. The small blue circle kept its ${blueCircle.mark} the whole time. Only the rule changed. And ${the(yellowCircle)} got a ${yellowCircle.mark}, and it does not fit ${Q(E.guessBig, '.')} That is a match too.`,
  };
}

/**
 * Guess the rule's board: the machine's marks stay up. Two tests are shown card by card (the mark, what the rule says,
 * and the match): “blue OR big” is kept for now and “blue” is ruled out. The learner tests “a circle OR big” on every
 * card from the rule, then keeps it or rules it out. Only a no card it fits rules it out, so copying the marks into
 * Fits and Not keeps a rule that is wrong.
 */
function guessBoard(): DrillStep {
  const deck = GUESS_DECK;
  const kept = E.guess, wrong = E.guessWrong, test = E.guessTest;
  if (firstMismatch(kept, deck)) throw new Error('the worked example’s rule must match every mark');
  const miss = firstMismatch(test, deck);
  const wrongMisses = deck.filter((t) => !matchesMark(wrong, t));
  if (!miss || !wrongMisses.length) throw new Error('the board’s rule and the key idea’s wrong rule must each miss a mark');
  // Copying the marks into Fits and Not must go wrong on this rule: some card's Fits or Not is not its mark.
  if (deck.every((t) => matchesMark(test, t))) throw new Error('copying the marks must not pass the board');
  const mine = ruleTestRow(test, deck, guessWords, {
    id: 's2.l5-do-test',
    label: `Test the rule ${Q(test, '.')}`,
    compare: testCompare,
    needs: MATCH_NEEDS,
    note: `${The(miss)} got a ${miss.mark}, but it ${evaluate(test, miss) ? 'fits' : 'does not fit'} ${Q(test, '.')} No match, so rule out ${Q(test, '.')}`,
  });
  const many = wrongMisses.length;
  return {
    id: 's2.l5-do',
    title: 'Test a rule',
    body: [
      'The machine’s marks stay on the cards. The shown rows check each card: does its mark match the rule?',
      `${cap(Q(kept))} matches every mark, so it is kept for now. ${cap(Q(wrong))} does not, so it is ruled out.`,
      `Now test ${Q(test, '.')} Tap Fits or Not for each card, from the rule. Then keep it for now, or rule it out.`,
    ],
    scene: GUESS_SCENE,
    rows: [
      matchRow(kept, deck, guessWords, { id: 's2.l5-do-kept', label: `Test the rule ${Q(kept, '.')}`, given: true, note: `Every card matches its mark. Keep ${Q(kept)} for now.` }),
      matchRow(wrong, deck, guessWords, {
        id: 's2.l5-do-out',
        label: `Test the rule ${Q(wrong, '.')}`,
        given: true,
        compare: matchCompare,
        note: `${cap(names(wrongMisses))} got a yes, but ${plural(many, 'it does', 'they do')} not fit ${Q(wrong, '.')} No match, so rule out ${Q(wrong, '.')}`,
      }),
      mine,
    ],
    afterCard: 4,
    scaffold: 'full',
    distinction: MARK_VS_FITS.id,
    misconceptions: [
      // Copying the marks goes wrong only on a no card the rule fits, so the words name a no card.
      { id: 'copied-mark', when: 'picks', picks: copiedMarkPicks(mine), text: COPIED_NO },
      { id: 'verdict-only', when: 'verdict-only', text: 'Your Fits and Not marks are right. Now compare each one with the card’s mark. A yes card that is Not, or a no card that Fits, is no match. One card with no match rules the rule out.' },
    ],
    confused: MARK_CONFUSED,
    words: markWords(MARK_BOARD_CLOSING),
    done: `Right. ${The(miss)} rules out ${Q(test, ',')} just as ${the(wrongMisses[0])} ruled out ${Q(wrong, '.')} A ${miss.mark} card that ${evaluate(test, miss) ? 'fits' : 'does not fit'} the rule is no match.`,
  };
}

/** The board right after kept vs proved: a new card, tested on the two kept rules. */
function keptBoard(): DrillStep {
  const [r1, r2] = [E.guess, E.guessKept];
  const fresh: Thing = { id: cardId(BIG_RED_CIRCLE), ...BIG_RED_CIRCLE };
  const rows = [r1, r2].map((r, k) => deckRow(r, [fresh], cardWords, { id: `s2.l5-kept-r${k + 1}`, label: `Test the rule ${Q(r, '.')}` }));
  const [a1, a2] = rows.map((r) => r.marks[0]);
  if (a1.answer === a2.answer) throw new Error('the new card must tell the two kept rules apart');
  const fitsWord = (r: Formula) => (evaluate(r, fresh) ? 'fits' : 'does not fit');
  return {
    id: 's2.l5-kept',
    title: 'A new card',
    body: [`The two rules each match all six marks. Now a new card comes: ${the(fresh)}. Tap Fits or Not for it under each rule.`],
    scene: L5_KEPT_SCENE,
    rows,
    afterCard: 5,
    distinction: KEPT_VS_PROVED.id,
    // The two kept rules marked alike, as if kept meant "the same rule".
    misconceptions: [
      { id: 'kept-as-proved', when: 'picks', picks: { [a1.id]: a1.answer, [a2.id]: a1.answer }, text: KEPT_AS_PROVED },
      { id: 'kept-as-proved-2', when: 'picks', picks: { [a1.id]: a2.answer, [a2.id]: a2.answer }, text: KEPT_AS_PROVED },
    ],
    confused: [keptConfused(ABSTRACT), RULED_OUT_CONFUSED],
    words: markWords('Those ideas are apart now. Back to the board: test the new card on each rule, one at a time.'),
    done: `Right. ${The(fresh)} ${fitsWord(r1)} ${Q(r1, ',')} but it ${fitsWord(r2)} ${Q(r2, '.')} The two kept rules are not the same rule. Kept means still possible, not proved.`,
  };
}

/** Each lesson's guided boards, in order. Every board's picture is a key idea's picture. */
export const DRILLS: Record<string, DrillStep[]> = {
  [L1]: [
    deckBoard(IDEAS[L1][2], {
      id: 's2.l1-do',
      title: 'Mark the cards',
      body: [`These are the six cards from the key idea. The ✓ and ✗ marks show ${Q(E.notRed, '.')}`, `Now the rule is ${Q(E.notBlue, '.')} Tap Fits or Not for each card.`],
      rows: [{ rule: E.notBlue, note: notNote(E.notBlue) }],
      done: `Right. ${Q(E.notBlue)} takes the ${groups(othersOf(E.notBlue), ABSTRACT)}. NOT is everything else, not one other color.`,
    }),
    deckBoard(IDEAS[L1][3], {
      id: 's2.l1-do-shape',
      title: 'Now a shape',
      body: [`The same six cards. The marks show ${Q(E.notCircle, '.')}`, `Now the rule is ${Q(E.notSquare, '.')} Tap Fits or Not for each card.`],
      rows: [{ rule: E.notSquare, note: notNote(E.notSquare) }],
      done: `Right. ${Q(E.notSquare)} takes the ${groups(othersOf(E.notSquare), ABSTRACT)}.`,
    }),
  ],
  [L2]: [
    deckBoard(IDEAS[L2][1], {
      id: 's2.l2-do',
      title: 'Mark the cards',
      body: [`These are the six cards from the key idea. The marks show ${Q(E.redAndCircle, '.')}`, `Now the rule is ${Q(E.redAndBig, '.')} Tap Fits or Not for each card.`],
      rows: [{ rule: E.redAndBig, note: andNote(E.redAndBig, EXAMPLES.and) }],
      done: `Right. A card fits ${Q(E.redAndBig)} only when it is red and also big.`,
    }),
  ],
  [L3]: [
    deckBoard(IDEAS[L3][1], {
      id: 's2.l3-do',
      title: 'Mark the cards',
      body: [`These are the six cards from the key idea. The marks show ${Q(E.circleOrBlue, '.')}`, `Now the rule is ${Q(E.bigOrRed, '.')} Tap Fits or Not for each card.`],
      rows: [{ rule: E.bigOrRed, note: `In all, ${nFit(fitting(E.bigOrRed, EXAMPLES.or).length, ABSTRACT)}. One part is enough for OR.` }],
      done: orDone(E.bigOrRed, EXAMPLES.or),
    }),
  ],
  // Each board sits right after its card (afterCard): the two questions after the contrast, the inside shown after
  // NOT (red AND big), the rule without brackets after NOT red AND NOT big, both rows after NOT (red OR big), and the
  // switch (light, no inside row) last.
  [L4]: [
    insideQuestionsBoard(),
    insideFirstBoard(),
    bracketsBoard(),
    insideOrBoard(),
    deckBoard(IDEAS[L4][6], {
      id: 's2.l4-do-switch',
      title: 'Now the switch',
      body: [`The marks show ${Q(E.notRedOrNotBig, '.')} It fits the same cards as ${Q(E.notRedAndBig, '.')}`, `Now the rule is ${Q(E.notBlueOrNotSmall, '.')} Tap Fits or Not for each card.`],
      rows: [{ rule: E.notBlueOrNotSmall }],
      done: sameDone(E.notBlueOrNotSmall, E.notBlueAndSmall, EXAMPLES.brackets),
    }),
  ],
  // The two distinctions each get a board right after their contrast card; the rule test sits after the worked example.
  [L5]: [markBoard(), guessBoard(), keptBoard()],
};

// ---------- lessons, check, arcade ----------

/**
 * Each lesson's quiz, in teaching order: try 1 is the twin on the worked example's cards (plain cards, pictures up),
 * then the same family in stories, with pictures. A words-only item (which groups NOT x takes, which rule means the
 * same) comes last, after the deck has been marked. No quiz uses a rule family its lesson did not teach.
 */
const LESSON_GENS: Record<string, readonly Gen[]> = {
  [L1]: [fixedGen(notTwin), notTap, notCount, notMeans],
  [L2]: [fixedGen(andTwin), andPick, andTap, andCount],
  [L3]: [fixedGen(orTwin), orYesNo, orNotFit, orTap, orCount],
  [L4]: [fixedGen(notAndTwin), notOrTap, bracketYesNo, notAndTap, sameMeaningPick],
  [L5]: [fixedGen(guessTwin), noCardOut(guessEasy), guessOr, guessHard],
};

/** The Arcade's generators: each lesson's taught families, never the twin (it is the same six cards every time). */
const ARCADE_GENS: Record<string, readonly Gen[]> = {
  [L1]: [notTap, notMeans, notTap, notCount],
  [L2]: [andTap, andPick, andCount],
  [L3]: [orTap, orYesNo, orNotFit, orTap, orCount],
  [L4]: [notAndTap, bracketYesNo, notOrTap, sameMeaningPick],
  [L5]: [guessEasy, guessOr, guessHard],
};

const TITLES: Record<string, string> = {
  [L1]: 'NOT: everything else',
  [L2]: 'AND needs both parts',
  [L3]: 'OR: one part or both parts',
  [L4]: 'Brackets matter',
  [L5]: 'Guess the rule',
};

/** The distinctions each lesson teaches apart (docs/CONTENT_GUIDE.md, "Distinctions"). */
const DISTINCTIONS: Record<string, Distinction[]> = {
  [L4]: [INSIDE_VS_WHOLE],
  [L5]: [MARK_VS_FITS, KEPT_VS_PROVED],
};

/**
 * Mastery: 3 right on the first try with no hint, including the trap the lesson exists for. Lesson 4: one rule with
 * AND inside the brackets and one with OR (every pack holds both). Lesson 5: a puzzle where only a no card rules out a
 * wrong rule (every pack holds one).
 */
const PASS: Record<string, LessonPass> = {
  [L4]: { firstTry: 3, include: [{ tag: INSIDE_AND, label: 'a rule with AND inside the brackets' }, { tag: INSIDE_OR, label: 'a rule with OR inside the brackets' }] },
  [L5]: { firstTry: 3, include: [{ tag: NO_CARD_OUT, label: 'a puzzle where only a no card rules out a rule' }] },
};

const lessons: LessonDef[] = [L1, L2, L3, L4, L5].map((lid) => ({
  id: lid,
  title: TITLES[lid],
  ideas: IDEAS[lid],
  drill: DRILLS[lid],
  ...(DISTINCTIONS[lid] ? { distinctions: DISTINCTIONS[lid] } : {}),
  ...(PASS[lid] ? { pass: PASS[lid] } : {}),
  practice(rng: Rng): Item[] {
    const gens = LESSON_GENS[lid];
    const skins = lessonSkins(rng, gens.length);
    return gens.map((gen, i) => gen(rng, `${lid}-p${i + 1}`, skins[i]));
  },
}));

/** The stop check: 9 items, every lesson covered, several conflict items, skins mixed three each. Taught families only. */
function check(rng: Rng): Item[] {
  const gens: Gen[] = [
    rng.pick([notTap, notTap, notCount, notMeans]),
    andTap,
    rng.pick([andPick, andCount]),
    orTap,
    rng.pick([orYesNo, orNotFit, orCount]),
    rng.pick([notAndTap, notOrTap]),
    rng.pick([sameMeaningPick, bracketYesNo]),
    guessEasy,
    rng.pick([guessOr, guessHard]),
  ];
  const keys = rng.shuffle<SkinKey>(['abstract', 'abstract', 'abstract', 'everyday', 'everyday', 'everyday', 'fantasy', 'fantasy', 'fantasy']);
  return gens.map((gen, i) => gen(rng, `s2-c${i + 1}`, skinOf(rng, keys[i])));
}

/** One Arcade item from anywhere in the stop. */
function practice(rng: Rng): Item {
  const gens = ARCADE_GENS[rng.pick([L1, L2, L3, L4, L5])];
  const gen = rng.pick(gens);
  return gen(rng, 's2-a1', skinOf(rng, rng.pick<SkinKey>(['abstract', 'everyday', 'fantasy'])));
}

/**
 * Rule families stop 2 does not teach yet: A AND NOT B ('blue AND NOT small') and (A OR B) AND NOT C ('(big OR a
 * circle) AND NOT blue'). No key idea marks a case of them and no board drills them, so no lesson quiz, check, Arcade
 * item or new example uses them (the handoff: never introduce a new rule family inside the quiz set). They stay built
 * and tested here for the later lesson that teaches them with its own See, Do and Quiz.
 */
export function untaughtItems(rng: Rng): Item[] {
  const skin = () => skinOf(rng, rng.pick(SKIN_KEYS));
  return [andNotTap(rng, 'later-and-not', skin()), groupTap(rng, 'later-brackets-first', skin())];
}

/**
 * New examples after a miss (engine/fresh.ts). Where a skill has two edges, the set checks both:
 *   - OR: a card that fits both parts (OR read as "one but not both" says no) and a card that fits one part
 *     (OR read as AND says no). A missed OR item of another kind gets one of its own kind, then the both-parts card.
 *   - NOT ( … ): the same kind of card against NOT (A AND B) and against NOT (A OR B), so one is yes and one is no.
 *   - Same meaning: one NOT (A AND B) pair and one NOT (A OR B) pair.
 *   - NOT x, A AND B, and guess the rule: a new random item, never try 1's twin on the worked example's cards.
 * Every other skill uses the default: one new item with the same skill from the same lesson.
 */
function fresh(missed: Item, rng: Rng): Item[] {
  const skin = () => skinOf(rng, rng.pick(SKIN_KEYS));
  const make = (gen: Gen) => gen(rng, 'new', skin());
  const yesNo = (which: OrCard) => orYesNoAs(rng, 'new', skin(), which);
  switch (missed.skill) {
    case 's2.or-yesno': {
      if (missed.kind === 'choose' && missed.answer === 'no') return [yesNo('neither'), yesNo('both')];
      return missed.conflict ? [yesNo('both'), yesNo('one')] : [yesNo('one'), yesNo('both')];
    }
    case 's2.or-both': return [make(orTap), yesNo('both')];
    case 's2.or-count': return [make(orCount), yesNo('both')];
    case 's2.or-pick': return [make(orNotFit), yesNo('both')];
    case 's2.bracket-yesno': {
      const first = missed.kind === 'choose' && missed.answer === 'no' ? 'or' : 'and';
      return [bracketYesNoAs(rng, 'new', skin(), first), bracketYesNoAs(rng, 'new', skin(), first === 'and' ? 'or' : 'and')];
    }
    // Try 1 of these lessons is the twin on the worked example's six cards, and it comes first in every pack. The
    // default would find it first every time: the same six cards again, often with the rule just missed. A new
    // example is a new deck (or a new rule machine) of the same family instead.
    case 's2.not': return [make(notTap)];
    case 's2.and': return [make(andTap)];
    case 's2.guess-rule': return [make(rng.pick([guessEasy, guessOr, guessHard]))];
    case 's2.not-both': return [make(notAndTap), make(notOrTap)];
    case 's2.not-either': return [make(notOrTap), make(notAndTap)];
    case 's2.same-meaning': {
      // The same kind of pair as the missed one first, then the other kind.
      const first = sameMeaningOp(missed);
      return [sameMeaningAs(rng, 'new', first), sameMeaningAs(rng, 'new', first === 'and' ? 'or' : 'and')];
    }
    default: return [];
  }
}

/**
 * Which NOT ( … ) a same-meaning item is about, read from its question: NOT (A AND B) and its twin NOT A OR NOT B
 * are 'and'; NOT (A OR B) and NOT A AND NOT B are 'or'.
 */
function sameMeaningOp(it: Item): 'and' | 'or' {
  const m = /the same as (.+?)\? /.exec(it.prompt);
  const g = m ? parse(m[1]) : null;
  if (g?.op === 'not' && isJoin(g.a)) return g.a.op;
  if (g && isJoin(g)) return g.op === 'and' ? 'or' : 'and';
  return 'and';
}

export const stop2: StopDef = {
  n: STOP,
  id: 's2',
  title: 'NOT, AND, OR',
  idea: 'AND needs both parts. OR needs one part or both parts. NOT means everything else.',
  ready: true,
  lessons,
  check,
  practice,
  fresh,
};
