/**
 * Stop 2 · NOT, AND, OR.
 *
 * Five lessons: NOT, AND, OR (one part or both parts), brackets (De Morgan), and guessing a rule
 * machine's rule. Every answer, diagnose set and explanation is computed from the rule engine in
 * ../engine/puzzles/rules.ts; nothing is hand-asserted. Items come in three skins: plain cards
 * (abstract), everyday stories and fantasy stories.
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
  KINDS,
  LITERALS,
  RULE_POOL,
  and,
  cardFitting,
  cardId,
  cardName,
  colorIs,
  differences,
  drawThings,
  evaluate,
  featureText,
  featuresOf,
  has,
  is,
  makeRuleGuess,
  not,
  or,
  parse,
  pickIds,
  render,
  ruleId,
  sameFeature,
  sameMeaning,
  shapeIs,
  sizeIs,
  twoFeatures,
  withoutBrackets,
} from '../engine/puzzles/rules';
import type { Card, Feature, FeatureKind, Formula } from '../engine/puzzles/rules';
import { syncWhyWrong } from '../engine/teach';
import type {
  ChoiceFeedback,
  ChooseItem,
  IdeaCard,
  Item,
  LessonDef,
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

/** One card as a worked case: its name in words (enough without the picture), the card, its truths and a note. */
function cardCase(c: Card, truths: Truth[], note?: string, opts: { the?: boolean; mark?: 'yes' | 'no' } = {}): TeachCase {
  return {
    label: `${opts.the ? The(c) : cap(aName(c))}.`,
    things: [{ id: cardId(c), shape: c.shape, color: c.color, size: c.size, ...(opts.mark ? { mark: opts.mark } : {}) }],
    truths,
    ...(note ? { note } : {}),
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
const markTerm = (s: Skin): Term => ({ word: 'A mark', meaning: `the yes (✓) or the no (✗) on a ${s.one}.` });
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

/**
 * A tap-all item. Besides the named misreadings, it names every one-card slip (a card left out, or one card too
 * many), tapping every card, and tapping none, so grade() can say exactly which card is wrong and why.
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
  return {
    kind: 'tapall', ...baseOf(b), prompt: p.prompt, things: p.things, answer,
    explain: p.explain, hint: p.hint, diagnose, teach: teachFor(p.rule, s, p.things),
  };
}

/** A choose item. Every wrong choice must have its ChoiceFeedback; whyWrong is filled from it. */
function chooseItem(
  b: Base,
  p: {
    prompt: string; scene?: Scene; choices: { id: string; label: string }[]; answer: string; explain: string; hint: string;
    feedback: Record<string, ChoiceFeedback>; teach: Teach;
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
    choices: p.choices, answer: p.answer, explain: p.explain, hint: p.hint, feedback, teach: p.teach,
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
  const rule = not(is(x));
  const others = featuresOf(kind).filter((f) => !sameFeature(f, x));
  const things = drawThings(rng, rng.int(6, 9), featuresOf(kind).map(is));
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
};

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
  return chooseItem({ id, lesson: L1, skill: 's2.not-means' }, {
    prompt: s.which(R(rule)),
    choices: choices.map(({ id: cid, label: l }) => ({ id: cid, label: l })),
    answer: right[0].id,
    explain: `${Q(rule)} means every ${s.one} that is not ${fx}. So ${groups(others, s)} fit.`,
    hint: `${Q(rule)} takes every ${s.one} that is not ${fx}. Which ${kind}s are left?`,
    feedback,
    teach: teachFor(rule, s, []),
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
  return chooseItem({ id, lesson: L1, skill: 's2.not-count' }, {
    prompt: s.count(R(rule)),
    scene: { kind: 'things', things },
    ...countChoices(right, cands),
    explain: `There ${plural(nx, 'is', 'are')} ${nx} ${group(x, s, nx)}. Every other ${s.one} fits ${Q(rule, ',')} so the answer is ${right}.`,
    hint: `Leave out the ${group(x, s)}. Count the rest.`,
    teach: teachFor(rule, s, things),
  });
};

// ---------- lesson 2: AND ----------

/** A card that fits exactly one of two parts. */
const onePartOf = (A: Formula, B: Formula) => (t: Card) => evaluate(A, t) !== evaluate(B, t);

const andTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, B);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
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
};

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
  return chooseItem({ id, lesson: L2, skill: 's2.and-pick' }, {
    prompt: s.fit(R(rule)),
    scene: { kind: 'things', things },
    choices,
    answer: right[0].id,
    explain: `Only ${the(right[0])} is ${ft(a)} and ${ft(b)}. AND needs both parts to be true.`,
    hint: `Check both parts on each ${s.one}.`,
    feedback,
    teach: teachFor(rule, s, things),
  });
};

const andCount: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, B);
  const things = drawThings(rng, rng.int(7, 10), quads(A, B));
  const count = (f: Formula) => pickIds(f, things).length;
  const right = count(rule);
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
    hint: `A ${s.one} counts only if both parts are true.`,
    teach: teachFor(rule, s, things),
  });
};

// ---------- lesson 3: OR ----------

const orTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
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
};

const orNotFit: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const { things, choices } = choiceThings(rng, quads(A, B).map((q) => cardFitting(rng, q)));
  const out = things.filter((t) => !evaluate(rule, t));
  if (out.length !== 1) throw new Error(`${id}: ${out.length} cards do not fit`);
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
    hint: `Look for the ${s.one} that fits no part at all.`,
    feedback,
    teach: teachFor(rule, s, things),
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
    hint: `Did you count the ${s.many} that fit both parts?`,
    teach: teachFor(rule, s, things),
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
    hint: `Check each part on this ${s.one}. OR needs at least one part to fit. If both parts fit, that counts too.`,
    feedback: { [answer === 'yes' ? 'no' : 'yes']: fb },
    teach: teachFor(rule, s, [c]),
  });
}

const orYesNo: Gen = (rng, id, s) => orYesNoAs(rng, id, s);

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
  const A = is(a), B = is(b), inner = and(A, B), rule = not(inner);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const n = pickIds(rule, things).length;
  const one = things.find(onePartOf(A, B))!;
  const [p, q] = has(one, a) ? [a, b] : [b, a];
  return tapItem({ id, lesson: L4, skill: 's2.not-both', conflict: true }, s, {
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
  });
};

const notOrTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), inner = or(A, B), rule = not(inner);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const fit = things.filter((t) => evaluate(rule, t));
  const second = fit.length <= 3
    ? `NOT takes the rest, so only ${names(fit)} ${plural(fit.length, 'fits', 'fit')}. ${fit.length === 1 ? `It is not ${ft(a)} and not ${ft(b)}` : `They are not ${ftPl(a)} and not ${ftPl(b)}`}.`
    : `NOT takes the rest, so ${nFit(fit.length, s)}. Each one is not ${ft(a)} and not ${ft(b)}.`;
  return tapItem({ id, lesson: L4, skill: 's2.not-either', conflict: true }, s, {
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
  });
};

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
 * choice names how it differs and a card where it and the question's rule disagree.
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
      { f: join(not(A), B, op), head: 'Your answer puts a NOT on only one part.', why: `To move a NOT inside brackets, put a NOT on each part. Your answer has no NOT on ${Q(B, '.')}` },
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
    hint: 'Test each choice on a card that fits only one part.',
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
  return chooseItem({ id, lesson: L4, skill: 's2.bracket-yesno', conflict: true }, {
    prompt: s.yesNo(R(rule)),
    scene: { kind: 'things', things: [{ id: cardId(c), shape: c.shape, color: c.color, size: c.size }] },
    choices: YES_NO,
    answer,
    explain: fits
      ? `${The(c)} is ${ft(p)}, but it is not ${ft(q)}. So ${Q(inner)} is false, and NOT flips it to true. It fits.`
      : `${The(c)} is ${ft(p)}, so it fits ${Q(inner, '.')} NOT flips that, so it does not fit.`,
    hint: `Do the brackets first. Does this ${s.one} fit ${Q(inner)}?`,
    feedback: { [fits ? 'no' : 'yes']: fb },
    teach: teachFor(rule, s, [c]),
  });
}

const bracketYesNo: Gen = (rng, id, s) => bracketYesNoAs(rng, id, s);

// ---------- lesson 5: guess the rule ----------

type Family = 'simple' | 'and' | 'or' | 'andNot' | 'any';

const TARGETS: Record<Family, readonly Formula[]> = {
  simple: LITERALS,
  and: RULE_POOL.filter((f) => f.op === 'and' && f.a.op === 'is' && f.b.op === 'is'),
  or: RULE_POOL.filter((f) => f.op === 'or' && f.a.op === 'is' && f.b.op === 'is'),
  andNot: RULE_POOL.filter((f) => f.op === 'and' && (f.a.op === 'not' || f.b.op === 'not')),
  any: RULE_POOL,
};

/** What a rule from the pool says yes to, in plain words. */
function ruleSays(d: Formula, s: Skin): string {
  if (d.op === 'is') return `Your rule, ${Q(d, ',')} says yes only to a ${s.one} that is ${ft(d.f)}.`;
  if (d.op === 'not') return `Your rule, ${Q(d, ',')} says yes only to a ${s.one} that is not ${ft(featOf(d))}.`;
  if (d.op === 'and') return `Your rule, ${Q(d, ',')} says yes only when both parts are true.`;
  return `Your rule, ${Q(d, ',')} says yes when one part or both parts are true.`;
}

function guess(rng: Rng, id: string, s: Skin, family: Family): ChooseItem {
  const g = makeRuleGuess(rng, TARGETS[family], { distractors: 2, minCards: 6, maxCards: 9 });
  const opts = rng.shuffle([g.target, ...g.distractors]);
  const choices = opts.map((f) => ({ id: ruleId(f), label: R(f) }));
  const byId = (tid: string) => g.things.find((t) => t.id === tid)!;
  const got = (t: Thing): Truth => ({ who: 'It got a yes', value: t.mark === 'yes' });
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
  return chooseItem({ id, lesson: L5, skill: 's2.guess-rule' }, {
    prompt: s.guess,
    scene: { kind: 'things', things: g.things },
    choices,
    answer: ruleId(g.target),
    explain: `Only the rule ${Q(g.target)} fits every ${s.one}. ${outs.join(' ')}`,
    hint: `Test each rule on every ${s.one}. One ${s.one} that does not match rules it out.`,
    feedback,
    teach: {
      rule: `The secret rule matches every mark. Each ${s.one} with a yes fits it. Each ${s.one} with a no does not fit it.`,
      terms: [markTerm(s), ruleOutTerm(s)],
      meaning: `Only ${Q(g.target)} matches all ${g.things.length} marks. Each other rule gets at least one mark wrong.`,
      casesTitle: `Test each rule on the ${s.many}.`,
      cases: [
        cardCase(yesCard, [got(yesCard), fitsTruth(g.target, yesCard)], `The mark and ${Q(g.target)} match.`, { the: true, mark: 'yes' }),
        cardCase(noCard, [got(noCard), fitsTruth(g.target, noCard)], `The mark and ${Q(g.target)} match.`, { the: true, mark: 'no' }),
        ...g.distractors.map((d, k) => {
          const t = byId(g.ruledOutBy[k]);
          return cardCase(t, [got(t), fitsTruth(d, t)], `The mark and ${Q(d)} do not match. So ${Q(d)} is ruled out.`, { the: true, mark: t.mark });
        }),
      ],
      remember: ['The right rule matches every mark.', `Ask: “Is there a ${s.one} whose mark this rule gets wrong?”`],
      simpler: [`Look at ${the(t0)}. It got a ${t0.mark}.`, `Does it fit ${Q(d0)}? ${yn(evaluate(d0, t0))}.`, `The mark and the rule do not match. So ${Q(d0)} is ruled out.`],
    },
  });
}

const guessEasy: Gen = (rng, id, s) => guess(rng, id, s, rng.pick<Family>(['simple', 'and']));
const guessOr: Gen = (rng, id, s) => guess(rng, id, s, 'or');
const guessHard: Gen = (rng, id, s) => guess(rng, id, s, rng.pick<Family>(['andNot', 'any']));

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

const red = colorIs('red'), blue = colorIs('blue'), big = sizeIs('big'), circle = shapeIs('circle');

export const EXAMPLES = {
  sample: [card('big', 'red', 'circle'), card('small', 'blue', 'square'), card('big', 'yellow', 'triangle'),
    card('small', 'red', 'triangle'), card('big', 'blue', 'circle'), card('small', 'yellow', 'square')],
  and: [card('big', 'red', 'circle'), card('small', 'red', 'square'), card('small', 'blue', 'circle'),
    card('big', 'yellow', 'triangle'), card('small', 'red', 'circle'), card('big', 'red', 'triangle')],
  or: [card('small', 'blue', 'circle'), card('big', 'red', 'circle'), card('big', 'blue', 'square'),
    card('small', 'yellow', 'triangle'), card('big', 'yellow', 'circle'), card('small', 'red', 'square')],
  brackets: [card('big', 'red', 'circle'), card('small', 'red', 'square'), card('big', 'blue', 'triangle'),
    card('small', 'yellow', 'circle'), card('big', 'yellow', 'square'), card('small', 'blue', 'triangle')],
  guess: [card('big', 'red', 'square'), card('small', 'blue', 'circle'), card('big', 'blue', 'triangle'),
    card('small', 'yellow', 'circle'), card('small', 'red', 'triangle'), card('big', 'yellow', 'square')],
} as const;

/** Rules the key-idea cards show, so tests can check every claim the cards make. */
export const EXAMPLE_RULES = {
  red,
  notRed: not(red),
  redAndCircle: and(red, circle),
  circleOrBlue: or(circle, blue),
  notRedAndBig: not(and(red, big)),
  notRedAndNotBig: and(not(red), not(big)),
  notRedOrBig: not(or(red, big)),
  notRedOrNotBig: or(not(red), not(big)),
  guess: or(blue, big),
  guessWrong: blue,
};
const E = EXAMPLE_RULES;

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
      ],
      scene: exampleScene(EXAMPLES.sample, E.notRed),
    },
    {
      title: 'NOT red is not one other color',
      body: [
        'Some people think NOT red means blue. It does not.',
        'NOT red takes every color that is not red. So blue cards fit, and yellow cards fit too.',
        'NOT a circle takes squares and triangles. NOT big takes the small cards.',
      ],
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
        'Always work out the part inside the brackets first.',
      ],
    },
    {
      title: 'NOT (red AND big)',
      body: [
        'First find the cards that are red AND big.',
        'NOT then takes every other card. A small red card fits. A big blue card fits too.',
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
        'First find the cards that are red OR big. NOT takes the rest.',
        'So a card fits only when it is not red, and it is not big.',
        'That is the same as NOT red AND NOT big.',
      ],
    },
    {
      title: 'Watch the switch',
      body: [
        'To move a NOT inside the brackets, put a NOT on each part. Then AND turns into OR, and OR turns into AND.',
        'So NOT (red AND big) means the same as NOT red OR NOT big.',
      ],
    },
  ],
  [L5]: [
    {
      title: 'The rule machine',
      body: [
        'A rule machine has a secret rule.',
        'It lets through every card that fits the rule. It stops every card that does not.',
        'A check mark (✓) means yes, the card got through. A cross (✗) means no, it was stopped.',
      ],
    },
    {
      title: 'Test a rule',
      body: [
        'To test a rule, check it against every card you can see.',
        'Every yes card must fit it. Every no card must not fit it.',
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
      title: 'A worked example',
      body: [
        'Could the rule be blue? The big red square got a yes, but it is not blue. So the rule can’t be blue.',
        'Now try blue OR big. Every yes card is blue or big. Every no card is not blue and not big. It fits every card.',
      ],
      scene: exampleScene(EXAMPLES.guess, E.guess),
    },
  ],
};

// ---------- lessons, check, arcade ----------

/** Each lesson's practice run, in teaching order. Skins: plain cards first, then one everyday and one fantasy. */
const LESSON_GENS: Record<string, readonly Gen[]> = {
  [L1]: [notTap, notMeans, notTap, notCount],
  [L2]: [andTap, andPick, andNotTap, andCount],
  [L3]: [orTap, orYesNo, orNotFit, orTap, orCount],
  [L4]: [notAndTap, bracketYesNo, notOrTap, sameMeaningPick, groupTap],
  [L5]: [guessEasy, guessOr, guessHard],
};

const TITLES: Record<string, string> = {
  [L1]: 'NOT: everything else',
  [L2]: 'AND needs both parts',
  [L3]: 'OR: one part or both parts',
  [L4]: 'Brackets matter',
  [L5]: 'Guess the rule',
};

const lessons: LessonDef[] = [L1, L2, L3, L4, L5].map((lid) => ({
  id: lid,
  title: TITLES[lid],
  ideas: IDEAS[lid],
  practice(rng: Rng): Item[] {
    const gens = LESSON_GENS[lid];
    const skins = lessonSkins(rng, gens.length);
    return gens.map((gen, i) => gen(rng, `${lid}-p${i + 1}`, skins[i]));
  },
}));

/** The stop check: 9 items, every lesson covered, several conflict items, skins mixed three each. */
function check(rng: Rng): Item[] {
  const gens: Gen[] = [
    rng.pick([notTap, notTap, notCount, notMeans]),
    rng.pick([andTap, andNotTap]),
    rng.pick([andPick, andCount]),
    orTap,
    rng.pick([orYesNo, orNotFit, orCount]),
    rng.pick([notAndTap, notOrTap, groupTap]),
    rng.pick([sameMeaningPick, bracketYesNo]),
    guessEasy,
    rng.pick([guessOr, guessHard]),
  ];
  const keys = rng.shuffle<SkinKey>(['abstract', 'abstract', 'abstract', 'everyday', 'everyday', 'everyday', 'fantasy', 'fantasy', 'fantasy']);
  return gens.map((gen, i) => gen(rng, `s2-c${i + 1}`, skinOf(rng, keys[i])));
}

/** One Arcade item from anywhere in the stop. */
function practice(rng: Rng): Item {
  const gens = LESSON_GENS[rng.pick([L1, L2, L3, L4, L5])];
  const gen = rng.pick(gens);
  return gen(rng, 's2-a1', skinOf(rng, rng.pick<SkinKey>(['abstract', 'everyday', 'fantasy'])));
}

/**
 * New examples after a miss (engine/fresh.ts). Where a skill has two edges, the set checks both:
 *   - OR: a card that fits both parts (OR read as "one but not both" says no) and a card that fits one part
 *     (OR read as AND says no). A missed OR item of another kind gets one of its own kind, then the both-parts card.
 *   - NOT ( … ): the same kind of card against NOT (A AND B) and against NOT (A OR B), so one is yes and one is no.
 *   - Same meaning: one NOT (A AND B) pair and one NOT (A OR B) pair.
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
