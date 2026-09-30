/**
 * Stop 2 · NOT, AND, OR.
 *
 * Five lessons: NOT, AND, OR (which includes both), brackets (De Morgan), and guessing a rule
 * machine's rule. Every answer, diagnose set and explanation is computed from the rule engine in
 * ../engine/puzzles/rules.ts; nothing is hand-asserted. Items come in three skins: plain cards
 * (abstract), everyday stories and fantasy stories.
 *
 * Story rules are stated both ways ("every cookie that is red, and no other cookies"), because the
 * answer key reads them both ways: a cookie is packed exactly when it fits the rule. In feedback
 * text, a rule named inside a sentence is put in curly quotes so it does not run into the words
 * around it.
 */
import {
  ALL_CARDS,
  KINDS,
  LITERALS,
  RULE_POOL,
  and,
  cardFitting,
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
  pickIds,
  render,
  sameFeature,
  sameMeaning,
  shapeIs,
  sizeIs,
  twoFeatures,
} from '../engine/puzzles/rules';
import type { Card, Feature, FeatureKind, Formula } from '../engine/puzzles/rules';
import type { ChooseItem, IdeaCard, Item, LessonDef, Rng, Scene, StopDef, TapAllItem, Thing } from '../engine/types';

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

const ABSTRACT: Skin = {
  key: 'abstract',
  one: 'card',
  many: 'cards',
  tap: (r) => `Tap every card that is ${r}.`,
  count: (r) => `How many cards fit the rule ${r}?`,
  fit: (r) => `Which card fits the rule ${r}?`,
  notFit: (r) => `Which card does NOT fit the rule ${r}?`,
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
      notFit: 'Which sticker does he NOT want?',
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
      notFit: 'Which tile do they NOT need?',
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
      notFit: 'Which gem does NOT open it?',
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
      notFit: 'Which snack does it NOT eat?',
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
      notFit: 'Which shield does she NOT take?',
      yesNo: 'Will she take this shield?',
      which: 'Which shields does she take?',
      guess: 'The wizard’s gate lets each shield that fits its rule pass (yes). It stops every other shield (no). Which rule is it using?',
    }),
  ],
};

const skinOf = (rng: Rng, key: SkinKey): Skin => rng.pick(SKINS[key]);

/** k skins: the first plain cards, then one everyday and one fantasy (random order), then any. */
function lessonSkins(rng: Rng, k: number): Skin[] {
  const keys: SkinKey[] = ['abstract', ...rng.shuffle<SkinKey>(['everyday', 'fantasy'])];
  while (keys.length < k) keys.push(rng.pick<SkinKey>(['abstract', 'everyday', 'fantasy']));
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

// ---------- item builders ----------

interface Base {
  id: string;
  lesson: string;
  skill: string;
  conflict?: boolean;
}

const baseOf = (b: Base) => ({ id: b.id, stop: STOP, lesson: b.lesson, skill: b.skill, ...(b.conflict ? { conflict: true } : {}) });
const key = (xs: readonly string[]) => [...xs].sort().join('|');

function tapItem(
  b: Base,
  p: { prompt: string; things: Thing[]; rule: Formula; explain: string; hint: string; diagnose: { ids: string[]; message: string }[] },
): TapAllItem {
  const answer = pickIds(p.rule, p.things);
  if (answer.length === 0 || answer.length === p.things.length) throw new Error(`${b.id}: trivial answer for ${R(p.rule)}`);
  const seen = new Set([key(answer)]);
  const diagnose: { ids: string[]; message: string }[] = [];
  for (const d of p.diagnose) {
    const k = key(d.ids);
    if (!d.ids.length || seen.has(k)) continue;
    seen.add(k);
    diagnose.push(d);
  }
  return {
    kind: 'tapall', ...baseOf(b), prompt: p.prompt, things: p.things, answer,
    explain: p.explain, hint: p.hint, ...(diagnose.length ? { diagnose } : {}),
  };
}

function chooseItem(
  b: Base,
  p: { prompt: string; scene?: Scene; choices: { id: string; label: string }[]; answer: string; explain: string; hint: string; whyWrong: Record<string, string> },
): ChooseItem {
  if (!p.choices.some((c) => c.id === p.answer)) throw new Error(`${b.id}: answer is not a choice`);
  const whyWrong: Record<string, string> = {};
  for (const c of p.choices) if (c.id !== p.answer && p.whyWrong[c.id]) whyWrong[c.id] = p.whyWrong[c.id];
  return {
    kind: 'choose', ...baseOf(b), prompt: p.prompt, ...(p.scene ? { scene: p.scene } : {}),
    choices: p.choices, answer: p.answer, explain: p.explain, hint: p.hint, whyWrong,
  };
}

/** Number choices: the right count plus distractor counts (each with its message), deduped, sorted. */
function countChoices(right: number, cands: [number, string][], max = 3) {
  const used = new Set([right]);
  const whyWrong: Record<string, string> = {};
  const values = [right];
  for (const [v, msg] of cands) {
    if (used.has(v) || values.length > max) continue;
    used.add(v);
    values.push(v);
    whyWrong[`n${v}`] = msg;
  }
  values.sort((x, y) => x - y);
  return { choices: values.map((v) => ({ id: `n${v}`, label: String(v) })), answer: `n${right}`, whyWrong };
}

/** Cards shown as the choices of a "which card" item. */
function choiceThings(rng: Rng, cards: Card[]) {
  const things: Thing[] = rng.shuffle(cards).map((c, i) => ({ id: `c${i + 1}`, shape: c.shape, color: c.color, size: c.size }));
  return { things, choices: things.map((t) => ({ id: t.id, label: cap(cardName(t)) })) };
}

/** The four kinds of card for two parts: both, only A, only B, neither. */
const quads = (A: Formula, B: Formula): Formula[] => [and(A, B), and(A, not(B)), and(not(A), B), and(not(A), not(B))];

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
  return tapItem({ id, lesson: L1, skill: 's2.not' }, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `${Q(rule)} means every ${s.one} that is not ${fx}. The ${groups(others, s)} fit. That makes ${n}.`,
    hint: `Find the ${group(x, s)} first. NOT leaves them out.`,
    diagnose: [
      { ids: pickIds(is(x), things), message: `You tapped the ${group(x, s)}. ${Q(rule)} means every ${s.one} that is not ${fx}.` },
      ...(others.length === 2
        ? others.map((o, i) => ({
          ids: pickIds(is(o), things),
          message: `You tapped only the ${group(o, s)}. ${cap(group(others[1 - i], s))} fit ${Q(rule)} too.`,
        }))
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
  const whyWrong: Record<string, string> = {};
  for (const c of choices) {
    if (c === right[0]) continue;
    const bad = c.fs.find((f) => sameFeature(f, x));
    whyWrong[c.id] = bad
      ? `${cap(groups([x], s))} are the ones the rule ${Q(rule)} leaves out.`
      : `${cap(groups(others.filter((o) => !c.fs.includes(o)), s))} fit ${Q(rule)} too. NOT takes every other ${kind}.`;
  }
  return chooseItem({ id, lesson: L1, skill: 's2.not-means' }, {
    prompt: s.which(R(rule)),
    choices: choices.map(({ id: cid, label: l }) => ({ id: cid, label: l })),
    answer: right[0].id,
    explain: `${Q(rule)} means every ${s.one} that is not ${fx}. So ${groups(others, s)} fit.`,
    hint: `${Q(rule)} takes every ${s.one} that is not ${fx}. Which ${kind}s are left?`,
    whyWrong,
  });
};

const notCount: Gen = (rng, id, s) => {
  const kind = oneKind(rng);
  const x = rng.pick(featuresOf(kind));
  const rule = not(is(x));
  const others = featuresOf(kind).filter((f) => !sameFeature(f, x));
  const things = drawThings(rng, rng.int(6, 10), featuresOf(kind).map(is));
  const count = (f: Formula) => pickIds(f, things).length;
  const right = count(rule), nx = count(is(x));
  const cands: [number, string][] = [
    [nx, `You counted the ${group(x, s)}. ${Q(rule)} counts every other ${s.one}.`],
    ...(others.length === 2
      ? others.map((o, i): [number, string] => [count(is(o)), `You counted only the ${group(o, s)}. ${cap(group(others[1 - i], s))} fit ${Q(rule)} too.`])
      : []),
    [things.length, `You counted every ${s.one}. ${Q(rule)} leaves out the ${group(x, s)}.`],
  ];
  return chooseItem({ id, lesson: L1, skill: 's2.not-count' }, {
    prompt: s.count(R(rule)),
    scene: { kind: 'things', things },
    ...countChoices(right, cands),
    explain: `There ${plural(nx, 'is', 'are')} ${nx} ${group(x, s, nx)}. Every other ${s.one} fits ${Q(rule, ',')} so the answer is ${right}.`,
    hint: `Leave out the ${group(x, s)}. Count the rest.`,
  });
};

// ---------- lesson 2: AND ----------

const andTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, B);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const fit = things.filter((t) => evaluate(rule, t));
  const miss = things.find((t) => has(t, a) && !has(t, b))!;
  const first = fit.length <= 3
    ? `Only ${names(fit)} ${plural(fit.length, 'fits', 'fit')} ${Q(rule, '.')}`
    : `In all, ${fit.length} ${s.many} fit ${Q(rule, '.')}`;
  return tapItem({ id, lesson: L2, skill: 's2.and' }, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `${first} ${The(miss)} is ${ft(a)}, but it is not ${ft(b)}, so it does not fit.`,
    hint: `Check both parts on each ${s.one}. Both must fit.`,
    diagnose: [
      { ids: pickIds(rule, things, 'andAsOr'), message: `You tapped ${s.many} that fit only one part. AND needs both parts.` },
      { ids: pickIds(A, things), message: `You tapped all the ${group(a, s)}. Each one must also be ${ft(b)}.` },
      { ids: pickIds(B, things), message: `You tapped all the ${group(b, s)}. Each one must also be ${ft(a)}.` },
    ],
  });
};

const andNotTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, not(B));
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const n = pickIds(rule, things).length;
  const miss = things.find((t) => has(t, a) && has(t, b))!;
  return tapItem({ id, lesson: L2, skill: 's2.and-not' }, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `A ${s.one} fits if it is ${ft(a)} and it is not ${ft(b)}. In all, ${nFit(n, s)}. ${The(miss)} is ${ft(b)}, so it does not fit.`,
    hint: 'Check both parts. The second part has a NOT.',
    diagnose: [
      { ids: pickIds(rule, things, 'dropNot'), message: `You missed the NOT. Each ${s.one} must be ${ft(a)}, and it must not be ${ft(b)}.` },
      { ids: pickIds(rule, things, 'andAsOr'), message: `You tapped ${s.many} that fit only one part. AND needs both parts.` },
      { ids: pickIds(A, things), message: `You tapped all the ${group(a, s)}. Some of them are ${ft(b)}, so they do not fit.` },
    ],
  });
};

const andPick: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, B);
  const { things, choices } = choiceThings(rng, quads(A, B).map((q) => cardFitting(rng, q)));
  const right = things.filter((t) => evaluate(rule, t));
  if (right.length !== 1) throw new Error(`${id}: ${right.length} cards fit`);
  const whyWrong: Record<string, string> = {};
  for (const t of things) {
    if (t === right[0]) continue;
    whyWrong[t.id] = has(t, a)
      ? `${The(t)} is ${ft(a)}, but it is not ${ft(b)}. AND needs both.`
      : has(t, b)
        ? `${The(t)} is ${ft(b)}, but it is not ${ft(a)}. AND needs both.`
        : `${The(t)} is not ${ft(a)}, and it is not ${ft(b)}.`;
  }
  return chooseItem({ id, lesson: L2, skill: 's2.and-pick' }, {
    prompt: s.fit(R(rule)),
    scene: { kind: 'things', things },
    choices,
    answer: right[0].id,
    explain: `Only ${the(right[0])} is ${ft(a)} and ${ft(b)}. AND needs both parts to fit.`,
    hint: `Check both parts on each ${s.one}.`,
    whyWrong,
  });
};

const andCount: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = and(A, B);
  const things = drawThings(rng, rng.int(7, 10), quads(A, B));
  const count = (f: Formula) => pickIds(f, things).length;
  const right = count(rule);
  return chooseItem({ id, lesson: L2, skill: 's2.and-count' }, {
    prompt: s.count(R(rule)),
    scene: { kind: 'things', things },
    ...countChoices(right, [
      [pickIds(rule, things, 'andAsOr').length, `You counted ${s.many} that fit either part. AND needs both.`],
      [count(A), `You counted all the ${group(a, s)}. Some of them are not ${ft(b)}.`],
      [count(B), `You counted all the ${group(b, s)}. Some of them are not ${ft(a)}.`],
    ]),
    explain: `There ${plural(right, 'is', 'are')} ${right} ${plural(right, s.one, s.many)} that ${plural(right, 'fits', 'fit')} ${Q(rule, '.')} ${plural(right, 'It is', 'Each one is')} ${ft(a)} and also ${ft(b)}.`,
    hint: `A ${s.one} counts only if both parts fit.`,
  });
};

// ---------- lesson 3: OR ----------

const orTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const n = pickIds(rule, things).length;
  const both = things.find((t) => has(t, a) && has(t, b))!;
  return tapItem({ id, lesson: L3, skill: 's2.or-both', conflict: true }, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `A ${s.one} fits if it is ${ft(a)}, if it is ${ft(b)}, or if it is both. ${The(both)} is both, so it fits too. In all, ${nFit(n, s)}.`,
    hint: `One part is enough. What about a ${s.one} that fits both parts?`,
    diagnose: [
      { ids: pickIds(rule, things, 'orExclusive'), message: `You left out ${s.many} that are both. In logic, OR includes both.` },
      { ids: pickIds(rule, things, 'orAsAnd'), message: `You tapped only ${s.many} that are both. With OR, one part is enough.` },
      { ids: pickIds(A, things), message: `You tapped only the ${group(a, s)}. ${cap(group(b, s))} fit too.` },
      { ids: pickIds(B, things), message: `You tapped only the ${group(b, s)}. ${cap(group(a, s))} fit too.` },
    ],
  });
};

const orNotFit: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const { things, choices } = choiceThings(rng, quads(A, B).map((q) => cardFitting(rng, q)));
  const out = things.filter((t) => !evaluate(rule, t));
  if (out.length !== 1) throw new Error(`${id}: ${out.length} cards do not fit`);
  const whyWrong: Record<string, string> = {};
  for (const t of things) {
    if (t === out[0]) continue;
    whyWrong[t.id] = has(t, a) && has(t, b)
      ? `${The(t)} is ${ft(a)} and ${ft(b)}. OR includes both, so it fits.`
      : `${The(t)} is ${ft(has(t, a) ? a : b)}. One part is enough, so it fits.`;
  }
  return chooseItem({ id, lesson: L3, skill: 's2.or-pick', conflict: true }, {
    prompt: s.notFit(R(rule)),
    scene: { kind: 'things', things },
    choices,
    answer: out[0].id,
    explain: `Only ${the(out[0])} is not ${ft(a)} and not ${ft(b)}. So it is the one that does not fit.`,
    hint: `Look for the ${s.one} that fits no part at all.`,
    whyWrong,
  });
};

const orCount: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const things = drawThings(rng, rng.int(7, 10), quads(A, B));
  const count = (f: Formula) => pickIds(f, things).length;
  const right = count(rule), nBoth = count(and(A, B));
  return chooseItem({ id, lesson: L3, skill: 's2.or-count', conflict: true }, {
    prompt: s.count(R(rule)),
    scene: { kind: 'things', things },
    ...countChoices(right, [
      [pickIds(rule, things, 'orExclusive').length, `You left out the ${s.many} that are both. In logic, OR includes both.`],
      [pickIds(rule, things, 'orAsAnd').length, `You counted only ${s.many} that are both. With OR, one part is enough.`],
      [count(A), `You counted only the ${group(a, s)}. ${cap(group(b, s))} fit too.`],
    ]),
    explain: `In all, ${nFit(right, s)} ${Q(rule, '.')} That includes ${nBoth} ${plural(nBoth, s.one, s.many)} that ${plural(nBoth, 'is', 'are')} both.`,
    hint: `Did you count the ${s.many} that fit both parts?`,
  });
};

/**
 * One card: usually one that fits both parts (the trap: OR includes both, so yes), sometimes one
 * that fits neither part (no). The answer is always computed from the rule.
 */
const orYesNo: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), rule = or(A, B);
  const both = rng.chance(0.6);
  const c = cardFitting(rng, both ? and(A, B) : and(not(A), not(B)));
  const answer = evaluate(rule, c) ? 'yes' : 'no';
  return chooseItem({ id, lesson: L3, skill: 's2.or-yesno', conflict: both }, {
    prompt: s.yesNo(R(rule)),
    scene: { kind: 'things', things: [{ id: 'c1', shape: c.shape, color: c.color, size: c.size }] },
    choices: YES_NO,
    answer,
    explain: answer === 'yes'
      ? `${The(c)} is ${ft(a)} and ${ft(b)}. OR includes both, so it fits.`
      : `${The(c)} is not ${ft(a)} and not ${ft(b)}. OR needs at least one part, so it does not fit.`,
    hint: `Check each part on this ${s.one}. OR needs at least one part to fit. If both fit, that counts too.`,
    whyWrong: answer === 'yes'
      ? { no: `It is ${ft(a)}, and it is ${ft(b)}. In logic, OR includes both, so it fits.` }
      : { yes: `It is not ${ft(a)}, and it is not ${ft(b)}. OR needs at least one part, so it does not fit.` },
  });
};

// ---------- lesson 4: brackets ----------

const notAndTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), inner = and(A, B), rule = not(inner);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const n = pickIds(rule, things).length;
  const one = things.find((t) => has(t, a) !== has(t, b))!;
  return tapItem({ id, lesson: L4, skill: 's2.not-both', conflict: true }, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `First find the ${s.many} that fit ${Q(inner, '.')} NOT takes every other ${s.one}, so ${n} fit. ${The(one)} fits, because it is not both.`,
    hint: `Do the brackets first. Which ${s.many} fit ${Q(inner)}?`,
    diagnose: [
      {
        ids: pickIds(rule, things, 'deMorgan'),
        message: `You tapped only ${s.many} that fit ${Q(and(not(A), not(B)), '.')} But ${Q(rule)} keeps every ${s.one} that is not both.`,
      },
      { ids: pickIds(rule, things, 'dropBrackets'), message: `The NOT covers the whole bracket, not just ${ft(a)}.` },
      { ids: pickIds(inner, things), message: `You tapped the ${s.many} that fit ${Q(inner, '.')} NOT takes every other ${s.one}.` },
    ],
  });
};

const notOrTap: Gen = (rng, id, s) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b), inner = or(A, B), rule = not(inner);
  const things = drawThings(rng, rng.int(6, 10), quads(A, B));
  const fit = things.filter((t) => evaluate(rule, t));
  const second = fit.length <= 3
    ? `NOT takes the rest, so only ${names(fit)} ${plural(fit.length, 'fits', 'fit')}. ${plural(fit.length, 'It is', 'They are')} not ${ft(a)} and not ${ft(b)}.`
    : `NOT takes the rest, so ${nFit(fit.length, s)}. Each one is not ${ft(a)} and not ${ft(b)}.`;
  return tapItem({ id, lesson: L4, skill: 's2.not-either', conflict: true }, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `First find the ${s.many} that fit ${Q(inner, '.')} ${second}`,
    hint: `Do the brackets first. Which ${s.many} fit ${Q(inner)}?`,
    diagnose: [
      {
        ids: pickIds(rule, things, 'deMorgan'),
        message: `You tapped ${s.many} that fit ${Q(or(not(A), not(B)), '.')} But ${Q(rule)} means the ${s.one} is neither one.`,
      },
      { ids: pickIds(rule, things, 'dropBrackets'), message: `The NOT covers the whole bracket, not just ${ft(a)}.` },
      { ids: pickIds(inner, things), message: `You tapped the ${s.many} that fit ${Q(inner, '.')} NOT takes every other ${s.one}.` },
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
  return tapItem({ id, lesson: L4, skill: 's2.brackets-first', conflict: true }, {
    prompt: s.tap(R(rule)),
    things,
    rule,
    explain: `First find the ${s.many} that fit ${Q(inner, '.')} Then keep only the ones that fit ${Q(not(C), '.')} That leaves ${n}.`,
    hint: 'Do the brackets first.',
    diagnose: [
      { ids: pickIds(rule, things, 'orExclusive'), message: `You left out ${s.many} that are both ${ft(a)} and ${ft(b)}. In logic, OR includes both.` },
      { ids: pickIds(rule, things, 'orAsAnd'), message: `You tapped only ${s.many} that are both ${ft(a)} and ${ft(b)}. With OR, one part is enough.` },
      {
        ids: pickIds(rule, things, 'dropBrackets'),
        message: `Do the brackets first. Find the ${s.many} that fit ${Q(inner, '.')} Then keep only the ones that fit ${Q(not(C), '.')}`,
      },
      { ids: pickIds(inner, things), message: `You forgot the last part. Each ${s.one} must also fit ${Q(not(C), '.')}` },
    ],
  });
};

const sameMeaningPick: Gen = (rng, id) => {
  const [a, b] = twoFeatures(rng);
  const A = is(a), B = is(b);
  const op = rng.pick<'and' | 'or'>(['and', 'or']);
  const join = (x: Formula, y: Formula, o: 'and' | 'or') => (o === 'and' ? and(x, y) : or(x, y));
  const flip = op === 'and' ? 'or' : 'and';
  const bracket = not(join(A, B, op)); // NOT (A op B)
  const pushed = join(not(A), not(B), flip); // the De Morgan twin
  const reverse = rng.chance(0.4);
  const given = reverse ? pushed : bracket;
  const right = reverse ? bracket : pushed;
  const wrongs = (reverse
    ? [not(join(A, B, flip)), join(not(A), not(B), op)]
    : [join(not(A), not(B), op), join(not(A), B, op)]
  ).filter((w) => !sameMeaning(w, given));
  if (!sameMeaning(right, given) || wrongs.length < 1) throw new Error(`${id}: same-meaning set is broken`);
  const opts = rng.shuffle([right, ...wrongs]);
  const choices = opts.map((f, i) => ({ id: `r${i + 1}`, label: R(f) }));
  const whyWrong: Record<string, string> = {};
  opts.forEach((w, i) => {
    if (w === right) return;
    const d = rng.pick(differences(w, given));
    whyWrong[`r${i + 1}`] = evaluate(w, d)
      ? `Think of a ${cardName(d)}. It fits ${Q(w, ',')} but it does not fit ${Q(given, '.')}`
      : `Think of a ${cardName(d)}. It fits ${Q(given, ',')} but it does not fit ${Q(w, '.')}`;
  });
  const explain = op === 'and'
    ? `${Q(bracket)} means not both. So a card is NOT ${ft(a)}, or NOT ${ft(b)}, or both. The two rules agree on every kind of card.`
    : `${Q(bracket)} means neither one. So a card must fit ${Q(and(not(A), not(B)), '.')} The two rules agree on every kind of card.`;
  return chooseItem({ id, lesson: L4, skill: 's2.same-meaning', conflict: true }, {
    prompt: `Which rule means the same as ${R(given)}?`,
    choices,
    answer: choices[opts.indexOf(right)].id,
    explain,
    hint: 'Test each choice on a card that fits only one part.',
    whyWrong,
  });
};

const bracketYesNo: Gen = (rng, id, s) => {
  const [p, q] = twoFeatures(rng);
  const A = is(p), B = is(q);
  const op = rng.pick<'and' | 'or'>(['and', 'or']);
  const inner = op === 'and' ? and(A, B) : or(A, B);
  const rule = not(inner);
  const c = cardFitting(rng, and(A, not(B)));
  const answer = evaluate(rule, c) ? 'yes' : 'no';
  const fits = answer === 'yes';
  return chooseItem({ id, lesson: L4, skill: 's2.bracket-yesno', conflict: true }, {
    prompt: s.yesNo(R(rule)),
    scene: { kind: 'things', things: [{ id: 'c1', shape: c.shape, color: c.color, size: c.size }] },
    choices: YES_NO,
    answer,
    explain: fits
      ? `${The(c)} is ${ft(p)}, but it is not ${ft(q)}. It is not both, so it fits.`
      : `${The(c)} is ${ft(p)}, so it fits ${Q(inner, '.')} NOT flips that, so it does not fit.`,
    hint: `Do the brackets first. Does this ${s.one} fit ${Q(inner)}?`,
    whyWrong: fits
      ? { no: `It is ${ft(p)}, but it is not ${ft(q)}. So it is not both, and ${Q(rule)} takes it.` }
      : { yes: `It is ${ft(p)}. ${Q(rule)} leaves out every ${s.one} that is ${ft(p)}.` },
  });
};

// ---------- lesson 5: guess the rule ----------

type Family = 'simple' | 'and' | 'or' | 'andNot' | 'any';

const TARGETS: Record<Family, readonly Formula[]> = {
  simple: LITERALS,
  and: RULE_POOL.filter((f) => f.op === 'and' && f.a.op === 'is' && f.b.op === 'is'),
  or: RULE_POOL.filter((f) => f.op === 'or' && f.a.op === 'is' && f.b.op === 'is'),
  andNot: RULE_POOL.filter((f) => f.op === 'and' && (f.a.op === 'not' || f.b.op === 'not')),
  any: RULE_POOL,
};

function guess(rng: Rng, id: string, s: Skin, family: Family): ChooseItem {
  const g = makeRuleGuess(rng, TARGETS[family], { distractors: 2, minCards: 6, maxCards: 9 });
  const opts = rng.shuffle([g.target, ...g.distractors]);
  const choices = opts.map((f, i) => ({ id: `r${i + 1}`, label: R(f) }));
  const byId = (tid: string) => g.things.find((t) => t.id === tid)!;
  const whyWrong: Record<string, string> = {};
  g.distractors.forEach((d, k) => {
    const t = byId(g.ruledOutBy[k]);
    whyWrong[choices[opts.indexOf(d)].id] = t.mark === 'yes'
      ? `${The(t)} got a yes, but it does not fit ${Q(d, '.')}`
      : `${The(t)} got a no, but it fits ${Q(d, '.')}`;
  });
  // One sentence per card that rules something out: 'The big red circle rules out the rule “yellow.”'
  // or '... rules out the rules “yellow” and “red AND big.”'
  const outs = [...new Set(g.ruledOutBy)].map((tid) => {
    const ruled = g.distractors.filter((_, k) => g.ruledOutBy[k] === tid);
    const last = Q(ruled[ruled.length - 1], '.');
    const list = ruled.length === 1 ? `the rule ${last}` : `the rules ${ruled.slice(0, -1).map((f) => Q(f)).join(', ')} and ${last}`;
    return `${The(byId(tid))} rules out ${list}`;
  });
  return chooseItem({ id, lesson: L5, skill: 's2.guess-rule' }, {
    prompt: s.guess,
    scene: { kind: 'things', things: g.things },
    choices,
    answer: choices[opts.indexOf(g.target)].id,
    explain: `Only the rule ${Q(g.target)} fits every ${s.one}. ${outs.join(' ')}`,
    hint: `Test each rule on every ${s.one}. One ${s.one} that does not match rules it out.`,
    whyWrong,
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
      title: 'NOT is not the opposite color',
      body: [
        'Some people think NOT red means blue. It does not.',
        'NOT red takes every other color, so blue and yellow both fit.',
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
      title: 'Both counts too',
      body: [
        'What about a blue circle? It is a circle, and it is blue.',
        'It fits. In logic, OR includes both.',
      ],
      scene: exampleScene(EXAMPLES.or, E.circleOrBlue),
    },
    {
      title: 'Everyday OR can be different',
      body: [
        'At home, “juice or milk?” often means you pick one.',
        `In logic, OR always includes both. So the rule ${render(E.circleOrBlue)} means ${render(E.circleOrBlue, { orBoth: true })}.`,
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
        'So the card is neither one. Neither means not one and not the other.',
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
        'Now try blue OR big. Every yes card is blue or big. Every no card is neither. It fits every card.',
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
  [L2]: 'AND needs both',
  [L3]: 'OR: either one, or both',
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

export const stop2: StopDef = {
  n: STOP,
  id: 's2',
  title: 'NOT, AND, OR',
  idea: 'AND needs both. OR is happy with either, or both. NOT means everything else.',
  ready: true,
  lessons,
  check,
  practice,
};

