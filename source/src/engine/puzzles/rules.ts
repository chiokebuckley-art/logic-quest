/**
 * Rule machine engine (stop 2: NOT, AND, OR).
 *
 * Rules are small formulas over the three card features (shape, color, size) built from
 * single features, NOT, AND and OR. This file evaluates them, writes them in plain words with
 * CAPITAL AND / OR / NOT and brackets where needed, reads them back, and models the ways
 * players misread them:
 *   - OR read as "one but not both" (exclusive),
 *   - OR read as AND, and AND read as OR,
 *   - the De Morgan error: NOT (A AND B) read as NOT A AND NOT B, NOT (A OR B) as NOT A OR NOT B,
 *   - a missed NOT, and brackets skipped (so a NOT lands on the wrong part).
 * It also builds card sets and "guess the rule" puzzles. All randomness comes from the Rng passed in.
 */
import type { Color, DrillMark, DrillRow, Rng, Shape, Size, Thing } from '../types';

// ---------- features and cards ----------

export type Feature =
  | { kind: 'shape'; value: Shape }
  | { kind: 'color'; value: Color }
  | { kind: 'size'; value: Size };
export type FeatureKind = Feature['kind'];

/** A card's three features, without an id. */
export type Card = Pick<Thing, 'shape' | 'color' | 'size'>;

export const SHAPES: readonly Shape[] = ['circle', 'square', 'triangle'];
export const COLORS: readonly Color[] = ['red', 'blue', 'yellow'];
export const SIZES: readonly Size[] = ['big', 'small'];
export const KINDS: readonly FeatureKind[] = ['shape', 'color', 'size'];

export function featuresOf(kind: FeatureKind): Feature[] {
  switch (kind) {
    case 'shape': return SHAPES.map((value) => ({ kind, value }));
    case 'color': return COLORS.map((value) => ({ kind, value }));
    case 'size': return SIZES.map((value) => ({ kind, value }));
  }
}

export const ALL_FEATURES: readonly Feature[] = KINDS.flatMap(featuresOf);

/** All 18 cards, in a fixed order. */
export const ALL_CARDS: readonly Card[] = SIZES.flatMap((size) =>
  COLORS.flatMap((color) => SHAPES.map((shape) => ({ shape, color, size }))),
);

export const has = (c: Card, f: Feature): boolean => c[f.kind] === f.value;
export const sameFeature = (f: Feature, g: Feature): boolean => f.kind === g.kind && f.value === g.value;
export const sameCard = (a: Card, b: Card): boolean => a.shape === b.shape && a.color === b.color && a.size === b.size;

/** 'big red circle' */
export const cardName = (c: Card): string => `${c.size} ${c.color} ${c.shape}`;

/**
 * A fixed id for a card, made from its features: 'big-red-circle'. A choice keeps this id however the choices
 * are shuffled, so its feedback, the answer key and the read-aloud always match.
 */
export const cardId = (c: Card): string => `${c.size}-${c.color}-${c.shape}`;

/** Read a card name ('big red circle', any case, optional 'the') back into a card. */
export function parseCard(text: string): Card | null {
  const m = /^(?:the |a )?(big|small) (red|blue|yellow) (circle|square|triangle)$/.exec(text.trim().toLowerCase());
  return m ? { size: m[1] as Size, color: m[2] as Color, shape: m[3] as Shape } : null;
}

// ---------- formulas ----------

export type Formula =
  | { op: 'is'; f: Feature }
  | { op: 'not'; a: Formula }
  | { op: 'and'; a: Formula; b: Formula }
  | { op: 'or'; a: Formula; b: Formula };

export const is = (f: Feature): Formula => ({ op: 'is', f });
export const not = (a: Formula): Formula => ({ op: 'not', a });
export const and = (a: Formula, b: Formula): Formula => ({ op: 'and', a, b });
export const or = (a: Formula, b: Formula): Formula => ({ op: 'or', a, b });
export const shapeIs = (value: Shape): Formula => is({ kind: 'shape', value });
export const colorIs = (value: Color): Formula => is({ kind: 'color', value });
export const sizeIs = (value: Size): Formula => is({ kind: 'size', value });

/** Nesting depth: a single feature is 0, NOT red is 1, NOT (red AND big) is 2. */
export function depth(f: Formula): number {
  switch (f.op) {
    case 'is': return 0;
    case 'not': return 1 + depth(f.a);
    case 'and': case 'or': return 1 + Math.max(depth(f.a), depth(f.b));
  }
}

/** Every feature the rule mentions, in reading order. */
export function mentions(f: Formula): Feature[] {
  switch (f.op) {
    case 'is': return [f.f];
    case 'not': return mentions(f.a);
    case 'and': case 'or': return [...mentions(f.a), ...mentions(f.b)];
  }
}

// ---------- evaluating, and misreading ----------

/**
 * How a player reads a rule.
 *  logic       - the game's rule (OR includes both).
 *  orExclusive - OR read as "one but not both".
 *  orAsAnd     - OR read as AND.
 *  andAsOr     - AND read as OR ("one part is enough").
 *  deMorgan    - NOT pushed into brackets without switching: NOT (A AND B) as NOT A AND NOT B,
 *                NOT (A OR B) as NOT A OR NOT B.
 *  dropNot     - every NOT ignored.
 */
export type Reading = 'logic' | 'orExclusive' | 'orAsAnd' | 'andAsOr' | 'deMorgan' | 'dropNot';
/** A reading, or 'dropBrackets': the rule read as if its brackets were not there. */
export type Misreading = Reading | 'dropBrackets';

export function evaluateAs(f: Formula, c: Card, r: Reading): boolean {
  switch (f.op) {
    case 'is': return has(c, f.f);
    case 'not': {
      if (r === 'dropNot') return evaluateAs(f.a, c, r);
      if (r === 'deMorgan' && (f.a.op === 'and' || f.a.op === 'or')) {
        const x = !evaluateAs(f.a.a, c, r);
        const y = !evaluateAs(f.a.b, c, r);
        return f.a.op === 'and' ? x && y : x || y;
      }
      return !evaluateAs(f.a, c, r);
    }
    case 'and': {
      const x = evaluateAs(f.a, c, r), y = evaluateAs(f.b, c, r);
      return r === 'andAsOr' ? x || y : x && y;
    }
    case 'or': {
      const x = evaluateAs(f.a, c, r), y = evaluateAs(f.b, c, r);
      if (r === 'orExclusive') return x !== y;
      if (r === 'orAsAnd') return x && y;
      return x || y;
    }
  }
}

/** Does the card fit the rule (the game's reading)? */
export const evaluate = (f: Formula, c: Card): boolean => evaluateAs(f, c, 'logic');

/** The rule a player follows when they skip the brackets: 'NOT (red AND big)' becomes 'NOT red AND big'. */
export const withoutBrackets = (f: Formula): Formula => parse(render(f).replace(/[()]/g, ' '));

/** A fit test for one reading of the rule. */
export function reader(f: Formula, r: Misreading): (c: Card) => boolean {
  if (r === 'dropBrackets') {
    const g = withoutBrackets(f);
    return (c) => evaluate(g, c);
  }
  return (c) => evaluateAs(f, c, r);
}

/** Ids of the things that fit, in the order shown. */
export function pickIds(f: Formula, things: readonly Thing[], r: Misreading = 'logic'): string[] {
  const fits = reader(f, r);
  return things.filter((t) => fits(t)).map((t) => t.id);
}

/** The rule's answer on all 18 cards, as a string of 0s and 1s. Two rules mean the same when these match. */
export const meaning = (f: Formula): string => ALL_CARDS.map((c) => (evaluate(f, c) ? '1' : '0')).join('');
export const sameMeaning = (f: Formula, g: Formula): boolean => meaning(f) === meaning(g);
/** Cards (of all 18) where two rules disagree. */
export const differences = (f: Formula, g: Formula): Card[] => ALL_CARDS.filter((c) => evaluate(f, c) !== evaluate(g, c));

// ---------- words ----------

/** 'red', 'big', 'a circle' */
export const featureText = (f: Feature): string => (f.kind === 'shape' ? `a ${f.value}` : f.value);

/**
 * The rule in plain words: 'red AND a circle', 'a circle OR blue', 'NOT (red AND big)',
 * '(a circle OR blue) AND NOT yellow'. With orBoth, a top-level OR gets ' (or both)'.
 */
export function render(f: Formula, opts: { orBoth?: boolean } = {}): string {
  const text = words(f);
  return opts.orBoth && f.op === 'or' ? `${text} (or both)` : text;
}

function words(f: Formula): string {
  switch (f.op) {
    case 'is': return featureText(f.f);
    case 'not': return f.a.op === 'is' ? `NOT ${featureText(f.a.f)}` : `NOT (${words(f.a)})`;
    case 'and': case 'or': {
      const part = (g: Formula) => ((g.op === 'and' || g.op === 'or') && g.op !== f.op ? `(${words(g)})` : words(g));
      return `${part(f.a)} ${f.op === 'and' ? 'AND' : 'OR'} ${part(f.b)}`;
    }
  }
}

/**
 * A fixed id for a rule, made from its words: 'NOT (red AND big)' -> 'not-[red-and-big]', 'a circle OR blue' ->
 * 'circle-or-blue'. Two rules get the same id only when render() writes them the same way. Like cardId, it never
 * depends on where the choice sits after shuffling.
 */
export const ruleId = (f: Formula): string =>
  render(f).toLowerCase().replace(/\ba (?=circle|square|triangle)/g, '').replace(/\(/g, '[').replace(/\)/g, ']').replace(/\s+/g, '-');

const TOKEN = /\s*(\(|\)|NOT\b|AND\b|OR\b|a circle\b|a square\b|a triangle\b|red\b|blue\b|yellow\b|big\b|small\b)/y;

/**
 * Read a rule written by render() back into a formula. NOT binds tightest, then AND, then OR.
 * A trailing ' (or both)' is allowed. Throws on anything else.
 */
export function parse(text: string): Formula {
  const src = text.replace(/\s*\(or both\)\s*$/, '').trim();
  const toks: string[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    const at = TOKEN.lastIndex;
    const m = TOKEN.exec(src);
    if (!m) {
      if (/^\s*$/.test(src.slice(at))) break;
      throw new Error(`cannot read rule "${text}" at "${src.slice(at)}"`);
    }
    toks.push(m[1]);
  }
  let i = 0;
  const peek = () => toks[i];
  const expr = (): Formula => {
    let f = term();
    while (peek() === 'OR') { i++; f = or(f, term()); }
    return f;
  };
  const term = (): Formula => {
    let f = factor();
    while (peek() === 'AND') { i++; f = and(f, factor()); }
    return f;
  };
  const factor = (): Formula => {
    const t = toks[i++];
    if (t === undefined) throw new Error(`rule "${text}" ends too soon`);
    if (t === 'NOT') return not(factor());
    if (t === '(') {
      const f = expr();
      if (toks[i++] !== ')') throw new Error(`missing ) in "${text}"`);
      return f;
    }
    if (t.startsWith('a ')) return shapeIs(t.slice(2) as Shape);
    if ((COLORS as readonly string[]).includes(t)) return colorIs(t as Color);
    if ((SIZES as readonly string[]).includes(t)) return sizeIs(t as Size);
    throw new Error(`unexpected "${t}" in "${text}"`);
  };
  const f = expr();
  if (i !== toks.length) throw new Error(`extra words in "${text}"`);
  return f;
}

// ---------- building puzzles ----------

/**
 * Draw n different face-up cards (ids c1..cn, shuffled). For each rule in `need`, one card that fits
 * it is included first (a different card per rule), so a set can be made to contain, say, a card that
 * is both red and a circle. Throws if a need cannot be met.
 */
export function drawThings(rng: Rng, n: number, need: readonly Formula[] = []): Thing[] {
  if (n < need.length || n < 1 || n > ALL_CARDS.length) throw new Error(`cannot draw ${n} cards`);
  const pool = rng.shuffle(ALL_CARDS);
  const chosen: Card[] = [];
  for (const f of need) {
    const c = pool.find((p) => !chosen.includes(p) && evaluate(f, p));
    if (!c) throw new Error(`no card left that fits ${render(f)}`);
    chosen.push(c);
  }
  for (const c of pool) {
    if (chosen.length >= n) break;
    if (!chosen.includes(c)) chosen.push(c);
  }
  return rng.shuffle(chosen).map((c, i) => ({ id: `c${i + 1}`, shape: c.shape, color: c.color, size: c.size }));
}

/** One random card (of all 18) that fits the rule. */
export function cardFitting(rng: Rng, f: Formula): Card {
  const fits = ALL_CARDS.filter((c) => evaluate(f, c));
  if (!fits.length) throw new Error(`no card fits ${render(f)}`);
  return rng.pick(fits);
}

/** Two features of different kinds, in random order. */
export function twoFeatures(rng: Rng): [Feature, Feature] {
  const [k1, k2] = rng.shuffle(KINDS);
  return [rng.pick(featuresOf(k1)), rng.pick(featuresOf(k2))];
}

/** Single features plus NOT of a shape or color (NOT big is left out: it means the same as small). */
export const LITERALS: readonly Formula[] = [
  ...ALL_FEATURES.map(is),
  ...ALL_FEATURES.filter((f) => f.kind !== 'size').map((f) => not(is(f))),
];

const kindOf = (lit: Formula): FeatureKind => mentions(lit)[0].kind;
const isPositive = (lit: Formula): boolean => lit.op === 'is';

/**
 * Rules a "guess the rule" machine may use or be confused with: one literal, or two literals of
 * different kinds joined by AND or OR, with at most one NOT. No two mean the same thing.
 */
export const RULE_POOL: readonly Formula[] = (() => {
  const order: readonly FeatureKind[] = ['color', 'shape', 'size']; // reads as 'red AND a circle', 'a circle AND big'
  const out: Formula[] = [...LITERALS];
  for (const x of LITERALS) {
    for (const y of LITERALS) {
      if (order.indexOf(kindOf(x)) >= order.indexOf(kindOf(y))) continue;
      if (!isPositive(x) && !isPositive(y)) continue;
      const [p, q] = isPositive(x) ? [x, y] : [y, x]; // the NOT part goes last: 'yellow AND NOT a square'
      out.push(and(p, q), or(p, q));
    }
  }
  const seen = new Set<string>();
  return out.filter((f) => {
    const m = meaning(f);
    if (seen.has(m)) return false;
    seen.add(m);
    return true;
  });
})();

export interface RuleGuess {
  target: Formula;
  /** Rules that match most marks but not all. */
  distractors: Formula[];
  /** Shown cards, each marked 'yes' (let through) or 'no' (stopped) by the target rule. */
  things: Thing[];
  /** For each distractor, the id of a shown card whose mark it gets wrong. */
  ruledOutBy: string[];
}

export interface RuleGuessOptions {
  /** How many wrong rules to offer. */
  distractors: number;
  minCards: number;
  maxCards: number;
  /** Most marks a distractor may get wrong (at least 1). */
  maxMisses?: number;
  /** Where the wrong rules come from (default RULE_POOL). A lesson passes only the rules it has taught. */
  pool?: readonly Formula[];
  /** A fixed deck, dealt in a new order (ids c1..cn), instead of drawing new cards. minCards and maxCards are then unused. */
  deck?: readonly Card[];
}

/** The cards of a deck in a new order, face up, with ids c1..cn. */
export function shuffledDeck(rng: Rng, deck: readonly Card[]): Thing[] {
  return rng.shuffle(deck).map((c, i) => ({ id: `c${i + 1}`, shape: c.shape, color: c.color, size: c.size }));
}

/**
 * A rule machine let some cards through and stopped others. Picks a target rule and a card set where
 * the target has at least two yes and two no marks, then picks distractors from the pool (RULE_POOL unless
 * given) that get 1..maxMisses marks wrong (rules that share a feature with the target first). For a two-part
 * target, the cards also show that each part matters (neither part alone fits every mark).
 */
export function makeRuleGuess(rng: Rng, targets: readonly Formula[], opts: RuleGuessOptions): RuleGuess {
  const maxMisses = opts.maxMisses ?? 2;
  const pool = opts.pool ?? RULE_POOL;
  for (let tries = 0; tries < 400; tries++) {
    const target = rng.pick(targets);
    const n = opts.deck ? opts.deck.length : rng.int(opts.minCards, opts.maxCards);
    const things = opts.deck ? shuffledDeck(rng, opts.deck) : drawThings(rng, n);
    const yes = things.filter((t) => evaluate(target, t)).length;
    if (yes < 2 || n - yes < 2) continue;
    // Each part of a two-part rule must matter: neither part alone may explain every mark.
    const parts = target.op === 'and' || target.op === 'or' ? [target.a, target.b] : [];
    if (parts.some((p) => things.every((t) => evaluate(p, t) === evaluate(target, t)))) continue;
    const own = mentions(target);
    const scored = rng
      .shuffle(pool)
      .filter((g) => render(g) !== render(target))
      .map((g) => ({
        g,
        misses: things.filter((t) => evaluate(g, t) !== evaluate(target, t)).length,
        related: mentions(g).some((m) => own.some((o) => sameFeature(m, o))),
      }))
      .filter((s) => s.misses >= 1 && s.misses <= maxMisses)
      .sort((x, y) => Number(y.related) - Number(x.related));
    const picked: Formula[] = [];
    for (const s of scored) {
      if (picked.length === opts.distractors) break;
      if (picked.some((p) => sameMeaning(p, s.g))) continue;
      picked.push(s.g);
    }
    if (picked.length < opts.distractors) continue;
    const marked: Thing[] = things.map((t) => ({ ...t, mark: evaluate(target, t) ? 'yes' : 'no' }));
    // Name a different card for each distractor when the cards allow it.
    const ruledOutBy: string[] = [];
    for (const g of picked) {
      const misses = marked.filter((t) => evaluate(g, t) !== evaluate(target, t));
      ruledOutBy.push((misses.find((t) => !ruledOutBy.includes(t.id)) ?? misses[0]).id);
    }
    return { target, distractors: picked, things: marked, ruledOutBy };
  }
  throw new Error('could not build a rule guess');
}

// ---------- twins: the same deck, a new rule of the same family ----------

/** Every pair of features of different kinds, in reading order: a color, then a shape, then a size ('red AND big'). */
export const FEATURE_PAIRS: readonly [Feature, Feature][] = (() => {
  const order: readonly FeatureKind[] = ['color', 'shape', 'size'];
  const out: [Feature, Feature][] = [];
  order.forEach((k1, i) => order.slice(i + 1).forEach((k2) => featuresOf(k1).forEach((a) => featuresOf(k2).forEach((b) => out.push([a, b])))));
  return out;
})();

/** The four kinds of card for two parts: both parts, the first only, the second only, no part. */
export const fourWays = (A: Formula, B: Formula): Formula[] => [and(A, B), and(A, not(B)), and(not(A), B), and(not(A), not(B))];

/** Does the deck show every way two parts can go (a card for each of the four kinds)? */
export const showsEveryWay = (A: Formula, B: Formula, deck: readonly Card[]): boolean =>
  fourWays(A, B).every((q) => deck.some((c) => evaluate(q, c)));

/** Which cards of a deck fit, as a key ('101101'). Two rules with the same key mark the deck the same way. */
export const fitKey = (f: Formula, deck: readonly Card[]): string => deck.map((c) => (evaluate(f, c) ? '1' : '0')).join('');

/**
 * Twin rules for a first quiz on a worked example's deck: the candidates that fit at least `minFit` cards and
 * leave out at least `minOut`, and that mark the deck differently from every rule in `avoid` (the worked example
 * and the guided boards), so a twin is never answered by copying marks already shown.
 */
export function deckTwins(deck: readonly Card[], candidates: readonly Formula[], avoid: readonly Formula[], o: { minFit?: number; minOut?: number } = {}): Formula[] {
  const seen = new Set(avoid.map((f) => fitKey(f, deck)));
  return candidates.filter((f) => {
    const n = deck.filter((c) => evaluate(f, c)).length;
    return n >= (o.minFit ?? 1) && deck.length - n >= (o.minOut ?? 1) && !seen.has(fitKey(f, deck)) && !avoid.some((g) => sameMeaning(f, g));
  });
}

// ---------- the Do step: mark a deck ----------
//
// A guided board on a row of cards (the worked example's deck): the learner marks each card Fits or Not for a new
// rule of the same family, and for a rule machine also keeps the rule or rules it out. Every right mark comes from
// evaluate() and the machine's marks; the words for a wrong mark come from the caller and say what the card is and
// what the rule needs.

export const FITS_OR_NOT: readonly { id: 'fit' | 'not'; label: string }[] = [{ id: 'fit', label: 'Fits' }, { id: 'not', label: 'Not' }];
export const KEEP_OR_RULE_OUT: readonly { id: 'keep' | 'reject'; label: string }[] = [{ id: 'keep', label: 'Keep' }, { id: 'reject', label: 'Rule out' }];

/** Why one card fits a rule, or why it does not, in plain words. */
export type CardWords = (rule: Formula, card: Card) => string;

export interface DeckRowOptions {
  /** Row id; each mark's id is `<row id>-<card id>`. */
  id: string;
  /** "Rule: NOT blue" */
  label: string;
  /** Shown already marked (the worked case). */
  given?: boolean;
  /** Shown under the row once it is marked right. */
  note?: string;
  /** Draw each card with its machine mark (✓ or ✗), for a rule machine's deck. Default: the bare card. */
  withMarks?: boolean;
}

const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One rule on a deck, as a row of marks: each card Fits or Not, computed by evaluate(). */
export function deckRow(rule: Formula, things: readonly Thing[], words: CardWords, o: DeckRowOptions): DrillRow {
  const marks: DrillMark[] = things.map((t) => {
    const fits = evaluate(rule, t);
    const thing: Thing = { id: t.id, shape: t.shape, color: t.color, size: t.size, ...(o.withMarks && t.mark ? { mark: t.mark } : {}) };
    return {
      id: `${o.id}-${t.id}`,
      label: capFirst(cardName(t)),
      options: FITS_OR_NOT.map((x) => ({ ...x })),
      answer: fits ? 'fit' : 'not',
      ...(o.given ? { given: true } : {}),
      thing,
      why: { [fits ? 'not' : 'fit']: words(rule, t) },
    };
  });
  return { id: o.id, label: o.label, marks, ...(o.note ? { note: o.note } : {}) };
}

/** The first card whose machine mark the rule gets wrong (a yes card it does not fit, or a no card it fits), or null. */
export function firstMismatch(rule: Formula, things: readonly Thing[]): Thing | null {
  if (things.some((t) => !t.mark)) throw new Error('every card needs its machine mark');
  return things.find((t) => evaluate(rule, t) !== (t.mark === 'yes')) ?? null;
}

export interface RuleTestWords {
  card: CardWords;
  /** Every mark matches: why ruling the rule out is wrong. */
  keep(rule: Formula): string;
  /** A mark does not match: why keeping the rule is wrong, naming that card. */
  ruleOut(rule: Formula, card: Thing): string;
}

/**
 * Test one rule against a rule machine's marks: each card Fits or Not (the card drawn with its mark), then Keep
 * (every mark matches) or Rule out (at least one card's mark does not), computed from the marks.
 */
export function ruleTestRow(rule: Formula, things: readonly Thing[], words: RuleTestWords, o: Omit<DeckRowOptions, 'withMarks'>): DrillRow {
  const row = deckRow(rule, things, words.card, { ...o, withMarks: true });
  const miss = firstMismatch(rule, things);
  row.marks.push({
    id: `${o.id}-decide`,
    label: 'Keep or rule out?',
    options: KEEP_OR_RULE_OUT.map((x) => ({ ...x })),
    answer: miss ? 'reject' : 'keep',
    ...(o.given ? { given: true } : {}),
    why: miss ? { keep: words.ruleOut(rule, miss) } : { reject: words.keep(rule) },
  });
  return row;
}
