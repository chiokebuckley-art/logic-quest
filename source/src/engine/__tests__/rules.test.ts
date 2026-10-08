/**
 * Rule machine engine (stop 2) and the stop 2 content built on it. The content checks re-read every
 * item from its visible text (the rule in the prompt, the cards, the choice labels) and brute-force
 * the answer over the cards, so the words the player sees must agree with the answer key. The last block
 * checks the teaching after a wrong answer the same way: every truth on every card is recomputed.
 */
import { describe, expect, it } from 'vitest';
import { DRILLS, EXAMPLES, EXAMPLE_RULES, TAUGHT_POOL, TWINS, exampleScene, stop2, untaughtItems } from '../../content/stop2';
import { S2_WORLD } from '../../content/world/s2';
import { explanationFor } from '../../game/explanation';
import { checkDrill, marksToTap } from '../drill';
import { freshCheckSet, looks } from '../fresh';
import { grade } from '../grade';
import { freshItem } from '../notebook';
import { READING, fkGrade, longestSentence } from '../readability';
import { feedbackText, teachStrings } from '../teach';
import {
  ALL_CARDS,
  ALL_FEATURES,
  COLORS,
  KEEP_OR_RULE_OUT,
  LITERALS,
  RULE_POOL,
  SHAPES,
  SIZES,
  and,
  cardId,
  cardName,
  colorIs,
  depth,
  differences,
  drawThings,
  evaluate,
  evaluateAs,
  has,
  is,
  makeRuleGuess,
  meaning,
  not,
  or,
  parse,
  parseCard,
  pickIds,
  reader,
  render,
  ruleId,
  sameMeaning,
  shapeIs,
  sizeIs,
  withoutBrackets,
} from '../puzzles/rules';
import type { Card, Formula, Misreading } from '../puzzles/rules';
import { createRng } from '../rng';
import type { Rng } from '../rng';
import type { ChooseItem, DrillRow, DrillStep, Item, Scene, TapAllItem, TeachCase, Thing } from '../types';

const red = colorIs('red'), blue = colorIs('blue'), yellow = colorIs('yellow');
const big = sizeIs('big'), small = sizeIs('small');
const circle = shapeIs('circle');

/** A random formula of depth <= 2 (for round-trip tests). */
function randomFormula(rng: Rng, d = 2): Formula {
  if (d === 0 || rng.chance(0.25)) return is(rng.pick(ALL_FEATURES));
  const r = rng.int(0, 2);
  if (r === 0) return not(randomFormula(rng, d - 1));
  return r === 1 ? and(randomFormula(rng, d - 1), randomFormula(rng, d - 1)) : or(randomFormula(rng, d - 1), randomFormula(rng, d - 1));
}

describe('cards and features', () => {
  it('has 18 different cards', () => {
    expect(ALL_CARDS.length).toBe(18);
    expect(new Set(ALL_CARDS.map(cardName)).size).toBe(18);
    expect(ALL_FEATURES.length).toBe(8);
  });
  it('reads card names back', () => {
    for (const c of ALL_CARDS) {
      expect(parseCard(cardName(c))).toEqual(c);
      expect(parseCard(`The ${cardName(c)}`)).toEqual(c);
    }
    expect(parseCard('big purple circle')).toBeNull();
  });
});

describe('evaluate', () => {
  it('matches the truth tables of NOT, AND and OR on every card', () => {
    for (const c of ALL_CARDS) {
      for (const f of ALL_FEATURES) {
        expect(evaluate(is(f), c)).toBe(c[f.kind] === f.value);
        expect(evaluate(not(is(f)), c)).toBe(c[f.kind] !== f.value);
        for (const g of ALL_FEATURES) {
          expect(evaluate(and(is(f), is(g)), c)).toBe(has(c, f) && has(c, g));
          expect(evaluate(or(is(f), is(g)), c)).toBe(has(c, f) || has(c, g));
        }
      }
    }
  });
  it('knows NOT big is small, and OR includes both', () => {
    expect(sameMeaning(not(big), small)).toBe(true);
    expect(evaluate(or(circle, blue), { shape: 'circle', color: 'blue', size: 'big' })).toBe(true);
    expect(sameMeaning(not(red), or(blue, yellow))).toBe(true);
  });
  it('obeys De Morgan: NOT (A AND B) = NOT A OR NOT B, and NOT (A OR B) = NOT A AND NOT B', () => {
    for (const f of ALL_FEATURES) {
      for (const g of ALL_FEATURES) {
        const A = is(f), B = is(g);
        expect(sameMeaning(not(and(A, B)), or(not(A), not(B)))).toBe(true);
        expect(sameMeaning(not(or(A, B)), and(not(A), not(B)))).toBe(true);
      }
    }
  });
  it('gives counterexample cards where two rules differ', () => {
    const d = differences(not(or(red, circle)), or(not(red), not(circle)));
    expect(d.length).toBeGreaterThan(0);
    for (const c of d) expect(evaluate(not(or(red, circle)), c)).not.toBe(evaluate(or(not(red), not(circle)), c));
  });
});

describe('misreadings', () => {
  it('OR read as exclusive leaves out exactly the cards that are both', () => {
    for (const c of ALL_CARDS) {
      const both = has(c, { kind: 'shape', value: 'circle' }) && has(c, { kind: 'color', value: 'blue' });
      const right = evaluate(or(circle, blue), c);
      const xor = evaluateAs(or(circle, blue), c, 'orExclusive');
      expect(xor).toBe(right && !both);
    }
  });
  it('OR read as AND, and AND read as OR', () => {
    expect(meaning(or(circle, blue))).not.toBe(meaning(and(circle, blue)));
    for (const c of ALL_CARDS) {
      expect(evaluateAs(or(circle, blue), c, 'orAsAnd')).toBe(evaluate(and(circle, blue), c));
      expect(evaluateAs(and(circle, blue), c, 'andAsOr')).toBe(evaluate(or(circle, blue), c));
    }
  });
  it('the De Morgan error keeps the joining word', () => {
    for (const c of ALL_CARDS) {
      expect(evaluateAs(not(and(red, big)), c, 'deMorgan')).toBe(evaluate(and(not(red), not(big)), c));
      expect(evaluateAs(not(or(red, circle)), c, 'deMorgan')).toBe(evaluate(or(not(red), not(circle)), c));
      // A NOT on a single feature is read correctly.
      expect(evaluateAs(not(red), c, 'deMorgan')).toBe(evaluate(not(red), c));
    }
    expect(sameMeaning(not(and(red, big)), and(not(red), not(big)))).toBe(false);
    expect(sameMeaning(not(or(red, circle)), or(not(red), not(circle)))).toBe(false);
  });
  it('a missed NOT and skipped brackets', () => {
    for (const c of ALL_CARDS) expect(evaluateAs(and(circle, not(red)), c, 'dropNot')).toBe(evaluate(and(circle, red), c));
    expect(render(withoutBrackets(not(and(red, big))))).toBe('NOT red AND big');
    expect(sameMeaning(withoutBrackets(and(or(circle, blue), not(yellow))), or(circle, and(blue, not(yellow))))).toBe(true);
    const things: Thing[] = ALL_CARDS.map((c, i) => ({ id: `k${i}`, ...c }));
    expect(pickIds(not(and(red, big)), things, 'dropBrackets')).toEqual(pickIds(and(not(red), big), things));
    expect(things.filter((t) => reader(or(red, big), 'logic')(t)).length).toBe(12);
  });
  it('the plan example: (circle OR blue) AND NOT yellow on 3 shapes x 3 colors', () => {
    const things: Thing[] = SHAPES.flatMap((shape) => COLORS.map((color) => ({ id: `${color}-${shape}`, shape, color, size: 'big' as const })));
    const rule = and(or(circle, blue), not(yellow));
    expect(pickIds(rule, things).sort()).toEqual(['blue-circle', 'blue-square', 'blue-triangle', 'red-circle']);
    expect(pickIds(rule, things, 'orExclusive').length).toBe(3);
    expect(pickIds(rule, things, 'orAsAnd')).toEqual(['blue-circle']);
  });
});

describe('render and parse', () => {
  it('writes rules in plain words with brackets only where needed', () => {
    expect(render(and(red, circle))).toBe('red AND a circle');
    expect(render(or(circle, blue))).toBe('a circle OR blue');
    expect(render(or(circle, blue), { orBoth: true })).toBe('a circle OR blue (or both)');
    expect(render(not(and(red, big)))).toBe('NOT (red AND big)');
    expect(render(and(not(red), not(big)))).toBe('NOT red AND NOT big');
    expect(render(not(or(red, circle)))).toBe('NOT (red OR a circle)');
    expect(render(and(or(circle, blue), not(yellow)))).toBe('(a circle OR blue) AND NOT yellow');
    expect(render(and(and(red, big), circle))).toBe('red AND big AND a circle');
    expect(render(or(red, and(big, circle)))).toBe('red OR (big AND a circle)');
  });
  it('reads back what it writes, for thousands of rules', () => {
    const rng = createRng(7);
    for (let i = 0; i < 3000; i++) {
      const f = randomFormula(rng);
      expect(depth(f)).toBeLessThanOrEqual(2);
      const g = parse(render(f));
      expect(render(g)).toBe(render(f));
      expect(sameMeaning(f, g)).toBe(true);
      expect(sameMeaning(parse(render(f, { orBoth: true })), f)).toBe(true);
    }
  });
  it('refuses text that is not a rule', () => {
    expect(() => parse('red AND')).toThrow();
    expect(() => parse('purple')).toThrow();
    expect(() => parse('(red OR big')).toThrow();
    expect(() => parse('red big')).toThrow();
  });
});

describe('rule pool', () => {
  it('has no two rules that mean the same, and none deeper than 2', () => {
    expect(new Set(RULE_POOL.map(meaning)).size).toBe(RULE_POOL.length);
    expect(new Set(RULE_POOL.map((f) => render(f))).size).toBe(RULE_POOL.length);
    for (const f of RULE_POOL) {
      expect(depth(f)).toBeLessThanOrEqual(2);
      expect(meaning(f)).toMatch(/1/); // never empty
      expect(meaning(f)).toMatch(/0/); // never everything
    }
    expect(LITERALS.length).toBe(14);
  });
});

describe('drawThings', () => {
  it('draws n different cards with unique ids and every card asked for, the same for the same seed', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = createRng(seed);
      const n = rng.int(6, 12);
      const need = [and(red, circle), and(red, not(circle)), and(not(red), circle), and(not(red), not(circle))];
      const things = drawThings(rng, n, need);
      expect(things.length).toBe(n);
      expect(new Set(things.map((t) => t.id)).size).toBe(n);
      expect(new Set(things.map(cardName)).size).toBe(n);
      for (const f of need) expect(things.some((t) => evaluate(f, t))).toBe(true);
      const again = createRng(seed);
      again.int(6, 12);
      expect(drawThings(again, n, need)).toEqual(things);
    }
  });
  it('throws when a need cannot be met', () => {
    expect(() => drawThings(createRng(1), 6, [and(red, blue)])).toThrow();
  });
});

describe('makeRuleGuess', () => {
  it('builds puzzles where only the target matches every mark, over 600 seeds', () => {
    for (let seed = 1; seed <= 600; seed++) {
      const g = makeRuleGuess(createRng(seed), RULE_POOL, { distractors: 2, minCards: 6, maxCards: 9 });
      const n = g.things.length;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(9);
      const yes = g.things.filter((t) => t.mark === 'yes').length;
      expect(yes).toBeGreaterThanOrEqual(2);
      expect(n - yes).toBeGreaterThanOrEqual(2);
      const matches = (f: Formula) => g.things.filter((t) => evaluate(f, t) === (t.mark === 'yes')).length;
      expect(matches(g.target)).toBe(n);
      g.distractors.forEach((d, k) => {
        expect(matches(d)).toBeLessThan(n);
        expect(matches(d)).toBeGreaterThanOrEqual(n - 2);
        const t = g.things.find((x) => x.id === g.ruledOutBy[k])!;
        expect(evaluate(d, t)).not.toBe(t.mark === 'yes');
      });
      if (g.target.op === 'and' || g.target.op === 'or') {
        expect(matches(g.target.a)).toBeLessThan(n);
        expect(matches(g.target.b)).toBeLessThan(n);
      }
    }
  });
});

// ---------- the stop 2 content ----------

/** The rule ends at '.', '?' or the ',' before a story's "and no other cookies." */
const MARKERS = /(?:that is|the rule|the same as) (.+?)[.?,](?:\s|$)/;
/** The rule shown in a prompt. */
function ruleIn(prompt: string): Formula {
  const m = MARKERS.exec(prompt);
  if (!m) throw new Error(`no rule in "${prompt}"`);
  return parse(m[1]);
}
const sceneThings = (it: Item): Thing[] => (it.scene?.kind === 'things' ? it.scene.things : []);
const key = (xs: readonly string[]) => [...xs].sort().join('|');
const VALUE = /\b(red|blue|yellow|big|small|circle|square|triangle)/g;
/** "A big red circle." / "The big red circle." -> the card. */
const cardOfLabel = (label: string): Card | null => parseCard(label.replace(/\.$/, ''));

/** Every problem found by re-solving one item from what the player sees. */
function soundness(it: Item): string[] {
  const out: string[] = [];
  const fail = (msg: string) => out.push(`${it.id} ${it.skill}: ${msg}`);
  if (it.kind === 'tapall') {
    const rule = ruleIn(it.prompt);
    if (depth(rule) > 2) fail('rule deeper than 2');
    const n = it.things.length;
    if (n < 6 || n > 12) fail(`${n} cards`);
    if (new Set(it.things.map(cardName)).size !== n) fail('two cards are the same');
    if (it.things.some((t) => t.mark)) fail('tapall cards should not be marked');
    const fits = it.things.filter((t) => evaluate(rule, t)).map((t) => t.id);
    if (key(fits) !== key(it.answer)) fail(`answer ${it.answer} but ${fits} fit ${render(rule)}`);
    if (fits.length === 0 || fits.length === n) fail('trivial answer');
    const diag = (it.diagnose ?? []).map((d) => key(d.ids));
    if (new Set(diag).size !== diag.length) fail('two diagnose sets are the same');
    if (diag.includes(key(it.answer))) fail('diagnose equals answer');
    if (it.skill === 's2.or-both') {
      if (rule.op !== 'or') fail('or item without OR');
      else if (!it.things.some((t) => evaluate(and(rule.a, rule.b), t))) fail('no card is both');
      // OR read as "one but not both": named by its gap, the cards that fit both parts ("the card that fits both
      // parts" when there is one), never only by a count.
      const xor = it.diagnose?.find((d) => key(d.ids) === key(pickIds(rule, it.things, 'orExclusive')));
      const nBoth = rule.op === 'or' ? it.things.filter((t) => evaluate(and(rule.a, rule.b), t)).length : 0;
      const want = nBoth === 1 ? /^Your answer leaves out the \w+ that fits both parts\./ : /^Your answer leaves out the \w+s that fit both parts\./;
      if (!xor || !want.test(xor.message)) fail(`missing the exclusive-OR diagnose (${nBoth} cards fit both parts): ${xor?.message}`);
      if (!it.diagnose?.some((d) => key(d.ids) === key(pickIds(rule, it.things, 'orAsAnd')))) fail('missing the OR-as-AND diagnose');
      if (!it.conflict) fail('OR item with a both-card should be a conflict item');
    }
    if (it.skill === 's2.not-both' || it.skill === 's2.not-either') {
      if (!it.diagnose?.some((d) => key(d.ids) === key(pickIds(rule, it.things, 'deMorgan')))) fail('missing the De Morgan diagnose');
      if (!it.conflict) fail('De Morgan trap should be a conflict item');
    }
    if (it.skill === 's2.and' && !it.diagnose?.some((d) => key(d.ids) === key(pickIds(rule, it.things, 'andAsOr')))) fail('missing the AND-as-OR diagnose');
    return out;
  }
  if (it.kind !== 'choose') return [`${it.id}: unexpected kind`];
  const right = it.choices.filter((c) => c.id === it.answer);
  const things = sceneThings(it);
  const byLabel = (pred: (label: string) => boolean) => it.choices.filter((c) => pred(c.label)).map((c) => c.id);
  const one = (ids: string[], what: string) => {
    if (ids.length !== 1) fail(`${ids.length} choices are right (${what})`);
    else if (ids[0] !== it.answer) fail(`answer ${it.answer} but ${ids[0]} is right (${what})`);
  };
  switch (it.skill) {
    case 's2.guess-rule': {
      if (things.length < 6 || things.length > 9) fail(`${things.length} cards`);
      if (things.some((t) => !t.mark)) fail('unmarked card');
      const fitsAll = (f: Formula) => things.every((t) => evaluate(f, t) === (t.mark === 'yes'));
      one(byLabel((l) => fitsAll(parse(l))), 'guess');
      // The explain names a card that rules out each wrong rule: 'The big red circle rules out the rule “yellow.”'
      const ruledOut = new Map<string, Card>();
      for (const s of it.explain.split(/(?<=\.”?)\s+/)) {
        const m = /^The (.+?) rules out the rules? (.+)$/.exec(s);
        if (!m) continue;
        const c = parseCard(m[1]);
        if (!c) fail(`unknown card in "${s}"`);
        else for (const q of m[2].matchAll(/“(.+?)\.?”/g)) ruledOut.set(q[1], c);
      }
      // Matching every mark keeps a rule; the answer comes from the choices: the other two are ruled out.
      const target = /^Of these three rules, only “(.+?)” matches every mark\./.exec(it.explain);
      if (!target || target[1] !== right[0]?.label) fail(`explain does not name the right rule: ${it.explain}`);
      else if (!it.explain.endsWith(` The other two are ruled out, so the rule must be “${target[1]}.”`)) fail(`explain does not end on the choice left: ${it.explain}`);
      if (it.choices.length !== 3) fail(`${it.choices.length} choices, but the explanation says three`);
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        const f = parse(c.label);
        const card = ruledOut.get(c.label);
        const shown = card && things.find((t) => cardName(t) === cardName(card));
        if (!shown) fail(`explain names no shown card for ${c.label}`);
        else if (evaluate(f, shown) === (shown.mark === 'yes')) fail(`${cardName(shown)} does not rule out ${c.label}`);
        const misses = things.filter((t) => evaluate(f, t) !== (t.mark === 'yes')).length;
        if (misses > 2) fail(`${c.label} misses ${misses} marks`);
      }
      break;
    }
    case 's2.same-meaning': {
      const given = ruleIn(it.prompt);
      one(byLabel((l) => sameMeaning(parse(l), given)), 'same meaning');
      // Each wrong choice's example card tells it apart from the rule in the question.
      for (const [cid, fb] of Object.entries(it.feedback ?? {})) {
        const c = fb.example && cardOfLabel(fb.example.label);
        const w = parse(it.choices.find((x) => x.id === cid)!.label);
        if (!c || evaluate(w, c) === evaluate(given, c)) fail(`feedback card does not tell ${render(w)} apart`);
        if (!new RegExp(`Think of a ${c ? cardName(c) : '?'}\\.`).test(fb.detail.join(' '))) fail('feedback detail does not name its card');
      }
      break;
    }
    case 's2.not-count': case 's2.and-count': case 's2.or-count': {
      const rule = ruleIn(it.prompt);
      const count = things.filter((t) => evaluate(rule, t)).length;
      one(byLabel((l) => Number(l) === count), 'count');
      break;
    }
    case 's2.or-yesno': case 's2.bracket-yesno': {
      const rule = ruleIn(it.prompt);
      if (things.length !== 1) fail('yes/no needs one card');
      else if (it.answer !== (evaluate(rule, things[0]) ? 'yes' : 'no')) fail('wrong yes/no');
      break;
    }
    case 's2.and-pick': case 's2.or-pick': {
      const rule = ruleIn(it.prompt);
      const wantFit = !/does not|do they not|does it not|does he not|does she not|leave out/i.test(it.prompt.split(/[.?] /).pop()!);
      if (it.skill === 's2.or-pick' && wantFit) fail('or-pick should ask which card does not fit');
      one(byLabel((l) => {
        const c = parseCard(l);
        return !!c && things.some((t) => cardName(t) === cardName(c)) && evaluate(rule, c) === wantFit;
      }), 'pick');
      break;
    }
    case 's2.not-means': {
      const rule = ruleIn(it.prompt);
      one(byLabel((l) => {
        const vals = new Set(l.toLowerCase().match(VALUE) ?? []);
        return ALL_CARDS.every((c) => evaluate(rule, c) === (vals.has(c.shape) || vals.has(c.color) || vals.has(c.size)));
      }), 'not-means');
      break;
    }
    default:
      fail('no soundness check for this skill');
  }
  if (right.length !== 1) fail('answer is not exactly one choice');
  return out;
}

const NOUNS = ['card', 'cookie', 'sticker', 'tile', 'gem', 'snack', 'shield'];
const skinOf = (it: Item) => NOUNS.find((n) => new RegExp(`\\b${n}s?\\b`).test(it.prompt)) ?? 'rule';

describe('stop 2 content', () => {
  it('every lesson item is sound, over 200 seeds', () => {
    for (const l of stop2.lessons) {
      for (let seed = 1; seed <= 200; seed++) {
        const items = l.practice(createRng(seed));
        for (const it of items) expect(soundness(it)).toEqual([]);
        const skins = new Set(items.map(skinOf));
        expect(skins.size, `${l.id} seed ${seed} skins`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('every check item is sound, with conflict items and mixed skins, over 400 seeds', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) {
      const items = stop2.check!(createRng(seed));
      for (const it of items) expect(soundness(it)).toEqual([]);
      expect(items.filter((i) => i.conflict).length).toBeGreaterThanOrEqual(2);
      expect(items.some((i) => skinOf(i) === 'card')).toBe(true);
      expect(items.some((i) => ['cookie', 'sticker', 'tile'].includes(skinOf(i)))).toBe(true);
      expect(items.some((i) => ['gem', 'snack', 'shield'].includes(skinOf(i)))).toBe(true);
      seen.add(JSON.stringify(items));
    }
    expect(seen.size).toBe(400);
  });

  it('arcade items are sound and repeatable, over 500 seeds', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const it = stop2.practice!(createRng(seed));
      expect(soundness(it)).toEqual([]);
      expect(stop2.practice!(createRng(seed))).toEqual(it);
    }
  });

  it('every OR, bracket and yes/no item in a lesson is marked as a conflict item where intuition misleads', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const it of stop2.lessons.flatMap((l) => l.practice(createRng(seed)))) {
        if (it.lesson !== 's2.l3' && it.lesson !== 's2.l4') continue;
        // An OR yes/no card that fits neither part is not a trap; one that fits both parts is.
        if (it.skill === 's2.or-yesno') expect(!!it.conflict, it.id).toBe(it.kind === 'choose' && it.answer === 'yes');
        else expect(it.conflict, it.skill).toBe(true);
      }
    }
  });

  it('OR yes/no items are sometimes yes (the card fits both parts) and sometimes no (it fits neither), over 500 seeds', () => {
    const answers = new Set<string>();
    for (let seed = 1; seed <= 500; seed++) {
      const it = stop2.lessons[2].practice(createRng(seed)).find((i) => i.skill === 's2.or-yesno');
      if (!it || it.kind !== 'choose') throw new Error(`seed ${seed}: no OR yes/no item`);
      expect(soundness(it)).toEqual([]);
      const rule = ruleIn(it.prompt);
      const c = sceneThings(it)[0];
      if (rule.op !== 'or') throw new Error('OR yes/no without OR');
      const a = evaluate(rule.a, c), b = evaluate(rule.b, c);
      expect(a === b, `${it.id}: the card fits both parts or neither`).toBe(true);
      expect(it.answer).toBe(a ? 'yes' : 'no');
      // The wrong choice has its own message, and the hint is the same whichever way the answer goes.
      expect(Object.keys(it.whyWrong ?? {})).toEqual([it.answer === 'yes' ? 'no' : 'yes']);
      expect(it.hint).not.toMatch(/both parts fit\?/);
      answers.add(it.answer);
    }
    expect([...answers].sort()).toEqual(['no', 'yes']);
  });

  it('every story rule says both ways which things it takes ("and no other cookies")', () => {
    const STORY = /^(?:Jo packs|Sam wants|The art class needs|A magic door opens for|The dragon eats|The knight takes) every (\w+) that is (.+?), and (?:for )?no other (\w+)\. /;
    let stories = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const items = [
        ...stop2.check!(createRng(seed)),
        ...stop2.lessons.flatMap((l) => l.practice(createRng(seed))),
        stop2.practice!(createRng(seed)),
      ];
      for (const it of items) {
        const noun = skinOf(it);
        if (noun === 'card' || noun === 'rule') continue; // plain cards: "Tap every card that is ..." / "fit the rule ..."
        if (it.skill === 's2.guess-rule') {
          // The machine stories say both ways too: each thing that fits gets a yes, every other one a no.
          expect(it.prompt, it.id).toMatch(/fits (?:its|his|the helper’s) rule/);
          expect(it.prompt, it.id).toMatch(new RegExp(`every other ${noun}`, 'i'));
          continue;
        }
        stories++;
        const m = STORY.exec(it.prompt);
        expect(m, `${it.id}: ${it.prompt}`).not.toBeNull();
        expect(m![1]).toBe(noun);
        expect(m![3]).toBe(`${noun}s`);
        expect(() => parse(m![2])).not.toThrow();
      }
    }
    expect(stories).toBeGreaterThan(500);
  });

  it('player-facing text uses curly quotes and apostrophes, never straight ones', () => {
    const texts = stop2.lessons.flatMap((l) => [l.title, ...l.ideas.flatMap((c) => [c.title, ...c.body])]);
    texts.push(stop2.title, stop2.idea);
    for (let seed = 1; seed <= 100; seed++) {
      for (const it of [...stop2.check!(createRng(seed)), ...stop2.lessons.flatMap((l) => l.practice(createRng(seed)))]) {
        texts.push(it.prompt, it.explain, it.hint ?? '');
        if (it.kind === 'choose') texts.push(...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {}));
        if (it.kind === 'tapall') texts.push(...(it.diagnose ?? []).map((d) => d.message));
      }
    }
    for (const t of texts) {
      expect(t).not.toMatch(/["']/);
      expect(t).not.toMatch(/”\./);
    }
    expect(stop2.title).toBe('NOT, AND, OR');
  });

  it('rule names inside feedback sentences are in curly quotes, with a final period inside the quote', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const it of [...stop2.check!(createRng(seed)), ...stop2.lessons.flatMap((l) => l.practice(createRng(seed)))]) {
        const texts = [
          it.explain,
          it.hint ?? '',
          ...(it.kind === 'choose' ? Object.values(it.whyWrong ?? {}) : []),
          ...(it.kind === 'tapall' ? (it.diagnose ?? []).map((d) => d.message) : []),
        ];
        for (const t of texts) {
          expect(t, it.id).not.toMatch(/["']/);
          expect(t, it.id).not.toMatch(/”\./);
          // Every quoted rule reads back as a rule.
          for (const q of t.matchAll(/“(.+?)[.,]?”/g)) expect(() => parse(q[1]), `${it.id}: ${t}`).not.toThrow();
          // No bare two-part rule ('red AND a circle') runs into a sentence outside quotes.
          expect(t.replace(/“.+?”/g, ''), `${it.id}: ${t}`).not.toMatch(/\b(?:red|blue|yellow|big|small|circle|square|triangle|\)) (?:AND|OR) /);
        }
      }
    }
  });

  it('hints never name the answer', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const it of [...stop2.check!(createRng(seed)), ...stop2.lessons.flatMap((l) => l.practice(createRng(seed)))]) {
        if (it.kind !== 'choose' || !it.hint) continue;
        const label = it.choices.find((c) => c.id === it.answer)!.label;
        if (label.length > 3) expect(it.hint.toLowerCase().includes(label.toLowerCase()), `${it.id}: ${it.hint}`).toBe(false);
      }
    }
  });
});

describe('stop 2 key ideas say only true things', () => {
  const E = EXAMPLE_RULES;
  const card = (size: Card['size'], color: Card['color'], shape: Card['shape']): Card => ({ size, color, shape });
  it('marks every example card with the engine', () => {
    const scene = exampleScene(EXAMPLES.or, E.circleOrBlue);
    expect(scene.kind === 'things' && scene.things.map((t) => t.mark)).toEqual(EXAMPLES.or.map((c) => (evaluate(E.circleOrBlue, c) ? 'yes' : 'no')));
  });
  it('NOT, AND and OR claims', () => {
    for (const c of ALL_CARDS) expect(evaluate(E.notRed, c)).toBe(c.color === 'blue' || c.color === 'yellow');
    expect(evaluate(E.redAndCircle, card('big', 'red', 'square'))).toBe(false);
    expect(evaluate(E.redAndCircle, card('big', 'blue', 'circle'))).toBe(false);
    for (const c of ALL_CARDS) expect(evaluate(E.redAndCircle, c)).toBe(c.color === 'red' && c.shape === 'circle');
    expect(evaluate(E.circleOrBlue, card('small', 'blue', 'circle'))).toBe(true);
    // AND is never bigger, and OR never smaller, than either part.
    for (const f of RULE_POOL) {
      if (f.op !== 'and' && f.op !== 'or') continue;
      const size = (g: Formula) => ALL_CARDS.filter((c) => evaluate(g, c)).length;
      if (f.op === 'and') expect(size(f)).toBeLessThanOrEqual(Math.min(size(f.a), size(f.b)));
      else expect(size(f)).toBeGreaterThanOrEqual(Math.max(size(f.a), size(f.b)));
    }
  });
  it('bracket claims', () => {
    expect(evaluate(E.notRedAndBig, card('small', 'red', 'circle'))).toBe(true);
    expect(evaluate(E.notRedAndBig, card('big', 'blue', 'circle'))).toBe(true);
    expect(evaluate(E.notRedAndNotBig, card('small', 'red', 'circle'))).toBe(false);
    for (const c of ALL_CARDS) expect(evaluate(E.notRedAndNotBig, c)).toBe(c.size === 'small' && c.color !== 'red');
    expect(sameMeaning(E.notRedOrBig, E.notRedAndNotBig)).toBe(true);
    expect(sameMeaning(E.notRedAndBig, E.notRedOrNotBig)).toBe(true);
    expect(SIZES.length).toBe(2);
  });
  it('the worked guess-the-rule example', () => {
    const scene = exampleScene(EXAMPLES.guess, E.guess);
    const things = scene.kind === 'things' ? scene.things : [];
    const brs = things.find((t) => cardName(t) === 'big red square')!;
    expect(brs.mark).toBe('yes');
    expect(evaluate(E.guessWrong, brs)).toBe(false);
    for (const t of things) {
      if (t.mark === 'yes') expect(t.color === 'blue' || t.size === 'big').toBe(true);
      else expect(t.color !== 'blue' && t.size !== 'big').toBe(true);
    }
    expect(things.some((t) => t.mark === 'no')).toBe(true);
  });
});

it('Choose items keep whyWrong keys to wrong choices', () => {
  for (let seed = 1; seed <= 100; seed++) {
    for (const it of stop2.check!(createRng(seed)).filter((i): i is ChooseItem => i.kind === 'choose')) {
      for (const k of Object.keys(it.whyWrong ?? {})) expect(k).not.toBe(it.answer);
    }
  }
});

it('tapall answers never include every card', () => {
  for (let seed = 1; seed <= 100; seed++) {
    for (const it of stop2.check!(createRng(seed)).filter((i): i is TapAllItem => i.kind === 'tapall')) {
      expect(it.answer.length).toBeLessThan(it.things.length);
    }
  }
});

// ---------- wrong answers teach first (handoff v1.0) ----------
//
// Every truth the explanation shows is checked here against a fresh computation from the card itself; every
// wrong choice must have its own feedback with a card that proves the gap; headlines must differ by the kind of
// mistake; tap-all items must name each one-card slip and each named misreading; new examples come in pairs where
// a skill has two edges.

/** Every item a player can meet: lessons, checks, the Arcade, and the new examples after a miss. */
function everyItem(seeds = 40): Item[] {
  const out: Item[] = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const lessonItems = stop2.lessons.flatMap((l) => l.practice(createRng(seed)));
    out.push(...lessonItems, ...stop2.check!(createRng(seed)), stop2.practice!(createRng(seed)));
    if (seed <= 8) for (const it of lessonItems) out.push(...freshCheckSet(stop2, it, seed));
  }
  return out;
}
const ITEMS = everyItem();

/**
 * The families stop 2 does not teach yet (A AND NOT B, and (A OR B) AND NOT C): no lesson, check, Arcade item or new
 * example uses them, but they stay built for the later lesson that teaches them, so they are still checked here.
 */
const LATER = Array.from({ length: 300 }, (_, i) => untaughtItems(createRng(i + 1))).flat();

const FEATURE_WORD = /^(red|blue|yellow|big|small|a circle|a square|a triangle)$/;
const featureOfWord = (w: string) => ALL_FEATURES.find((f) => (f.kind === 'shape' ? `a ${f.value}` : f.value) === w)!;
const rightLabel = (it: ChooseItem) => it.choices.find((c) => c.id === it.answer)!.label;

/**
 * Re-check one worked case from its words: the label names the card that is drawn, and every truth is
 * recomputed from that card. `yours` is the label of the choice whose feedback this case belongs to.
 */
function caseProblems(it: Item, c: TeachCase, where: string, yours?: string): string[] {
  const out: string[] = [];
  const fail = (m: string) => out.push(`${it.id} ${it.skill} ${where}: ${m}`);
  const card = cardOfLabel(c.label);
  if (!card) return [`${it.id} ${where}: label "${c.label}" names no card`];
  if (!/^(?:A|The) (?:big|small) \w+ \w+\.$/.test(c.label)) fail(`label "${c.label}"`);
  if (c.things?.length !== 1 || cardName(c.things[0]) !== cardName(card)) fail('the picture is not the card the label names');
  if (!c.truths?.length) fail('no truths');
  const scene = sceneThings(it);
  for (const t of c.truths ?? []) {
    let want: boolean | undefined;
    const isF = /^It is (.+)$/.exec(t.who);
    const fits = /^It fits (your answer, |the question’s rule, |the right answer, )?“(.+)”$/.exec(t.who);
    if (isF && FEATURE_WORD.test(isF[1])) want = has(card, featureOfWord(isF[1]));
    else if (fits) {
      const rule = parse(fits[2]);
      want = evaluate(rule, card);
      if (fits[1] === 'your answer, ' && fits[2] !== yours) fail(`“your answer” is ${fits[2]}, but the choice is ${yours}`);
      if (fits[1] === 'the question’s rule, ' && render(ruleIn(it.prompt)) !== fits[2]) fail('not the question’s rule');
      if (fits[1] === 'the right answer, ' && it.kind === 'choose' && rightLabel(it) !== fits[2]) fail('not the right answer');
    } else if (t.who === 'Its mark') {
      const shown = scene.find((x) => cardName(x) === cardName(card));
      if (!shown || !shown.mark) fail('a marked card that is not in the scene');
      else {
        want = shown.mark === 'yes';
        if (c.things?.[0].mark !== shown.mark) fail('the case card shows another mark');
        if (it.kind === 'choose' && evaluate(parse(rightLabel(it)), card) !== want) fail('the mark is not the secret rule’s');
        // Its truth rows read yes and no ("Its mark: no"), never "true" and "false" for a mark.
        if (c.words?.truth !== 'yes' || c.words?.untruth !== 'no') fail('a mark row that does not read yes or no');
      }
    } else if (t.who === 'Your answer includes it' && yours) {
      const vals = new Set(yours.toLowerCase().match(VALUE) ?? []);
      want = vals.has(card.shape) || vals.has(card.color) || vals.has(card.size);
    }
    if (want === undefined) fail(`cannot check the truth "${t.who}"`);
    else if (t.value !== want) fail(`"${t.who}" is ${t.value} on ${cardName(card)}, but the engine says ${want}`);
  }
  return out;
}

/** The ways a wrong choice can go wrong, found from what the player sees (several when one number fits several). */
function mistakeKinds(it: ChooseItem, cid: string): string[] {
  const label = it.choices.find((c) => c.id === cid)!.label;
  const things = sceneThings(it);
  const count = (f: Formula) => things.filter((t) => evaluate(f, t)).length;
  const n = Number(label);
  const matching = (cands: [number, string][]) => [...new Set(cands.filter(([v]) => v === n).map(([, k]) => k))];
  switch (it.skill) {
    case 's2.not-means': {
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'not' || rule.a.op !== 'is') return ['?'];
      const vals = new Set(label.toLowerCase().match(VALUE) ?? []);
      if (!vals.has(rule.a.f.value)) return ['missing-other'];
      return [vals.size > 1 ? 'all' : 'the-x'];
    }
    case 's2.not-count': {
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'not' || rule.a.op !== 'is') return ['?'];
      const x = rule.a.f;
      const others = ALL_FEATURES.filter((f) => f.kind === x.kind && f.value !== x.value);
      return matching([[count(is(x)), 'x'], ...others.map((o): [number, string] => [count(is(o)), 'one-other']), [things.length, 'all']]);
    }
    case 's2.and-count': {
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'and') return ['?'];
      return matching([[things.filter((t) => evaluateAs(rule, t, 'andAsOr')).length, 'either'], [count(rule.a), 'part'], [count(rule.b), 'part']]);
    }
    case 's2.or-count': {
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'or') return ['?'];
      return matching([
        [things.filter((t) => evaluateAs(rule, t, 'orExclusive')).length, 'xor'],
        [count(and(rule.a, rule.b)), 'both-only'],
        [count(rule.a), 'part'],
        [count(rule.b), 'part'],
      ]);
    }
    case 's2.and-pick': case 's2.or-pick': case 's2.or-yesno': {
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'and' && rule.op !== 'or') return ['?'];
      const c = it.skill === 's2.or-yesno' ? things[0] : parseCard(label)!;
      return [['no-part', 'one-part', 'both-parts'][Number(evaluate(rule.a, c)) + Number(evaluate(rule.b, c))]];
    }
    case 's2.bracket-yesno': {
      const rule = ruleIn(it.prompt);
      return [rule.op === 'not' ? rule.a.op : '?'];
    }
    case 's2.same-meaning': {
      const given = ruleIn(it.prompt), w = parse(label);
      if (given.op === 'not' && (given.a.op === 'and' || given.a.op === 'or')) {
        if (w.op === 'not' && (w.a.op === 'and' || w.a.op === 'or') && w.a.op !== given.a.op) return ['switches-outside'];
        return [w.op === given.a.op && w.a.op === 'not' && w.b.op === 'not' ? 'keeps-join-inside' : '?'];
      }
      if (given.op === 'and' || given.op === 'or') return [w.op === 'not' ? 'keeps-join-outside' : 'switches-only'];
      return ['?'];
    }
    case 's2.guess-rule': {
      const f = parse(label);
      const misses = things.filter((t) => evaluate(f, t) !== (t.mark === 'yes'));
      return [...new Set(misses.map((t) => (t.mark === 'yes' ? 'says-no-to-a-yes' : 'says-yes-to-a-no')))];
    }
    default:
      return ['?'];
  }
}

/** A headline with its names, numbers, rules and features taken out, so two headlines of one kind match. */
const template = (h: string) => h
  .replace(/“.+?”/g, 'RULE')
  .replace(/\b(?:the |a )?(?:big|small) (?:red|blue|yellow) (?:circle|square|triangle)\b/gi, 'CARD')
  .replace(/\b(?:cards?|cookies?|stickers?|tiles?|gems?|snacks?|shields?)\b/g, 'THING')
  .replace(/\b(?:a )?(?:red|blue|yellow|big|small|circles?|squares?|triangles?)\b/g, 'F')
  .replace(/\d+/g, 'N')
  .replace(/\b(?:AND|OR)\b/g, 'OP');

/** The card each claim in a message is about, and whether the claim says it fits. */
function claims(message: string): { card: Card; fits: boolean }[] {
  const out: { card: Card; fits: boolean }[] = [];
  let last: Card | null = null;
  const re = /\b(?:the|The) ((?:big|small) (?:red|blue|yellow) (?:circle|square|triangle))\b|so it fits\b|so it does not fit\b|leaves it out\b/g;
  for (const m of message.matchAll(re)) {
    if (m[1]) last = parseCard(m[1]);
    else if (last) out.push({ card: last, fits: m[0] === 'so it fits' });
  }
  return out;
}

describe('stop 2 wrong answers teach first', () => {
  it('every item teaches: a rule, 1-3 terms, its meaning, 2-4 worked cards, Remember with a question, and a simpler example', () => {
    for (const it of ITEMS) {
      const t = it.teach;
      expect(t, it.id).toBeDefined();
      if (!t) continue;
      expect(t.rule.trim().length, it.id).toBeGreaterThan(0);
      expect(t.terms?.length ?? 0, `${it.id} terms`).toBeGreaterThanOrEqual(1);
      expect(t.terms?.length ?? 0, `${it.id} terms`).toBeLessThanOrEqual(3);
      expect(t.meaning, it.id).toBeTruthy();
      expect(t.casesTitle, it.id).toBeTruthy();
      expect(t.cases?.length ?? 0, `${it.id} cases`).toBeGreaterThanOrEqual(2);
      expect(t.cases?.length ?? 0, `${it.id} cases`).toBeLessThanOrEqual(4);
      expect(t.remember?.length, it.id).toBe(2);
      expect(t.remember?.[1], it.id).toMatch(/^Ask: “.+\?”$/);
      expect(t.simpler?.length ?? 0, it.id).toBeGreaterThanOrEqual(2);
      // The operator the item is about is defined in place.
      const words = (t.terms ?? []).map((x) => x.word);
      if (/^s2\.(?:not|not-means|not-count)$/.test(it.skill)) expect(words, it.id).toContain('NOT');
      if (/^s2\.and/.test(it.skill)) expect(words, it.id).toContain('AND');
      if (/^s2\.or/.test(it.skill)) expect(words, it.id).toContain('OR');
      if (/^s2\.(?:not-both|not-either|bracket-yesno|brackets-first)$/.test(it.skill)) expect(words, it.id).toContain('“Do the brackets first”');
    }
  });

  it('every truth on every worked card and every example card matches the engine, recomputed from the card', () => {
    let truths = 0;
    for (const it of ITEMS) {
      for (const c of it.teach?.cases ?? []) {
        expect(caseProblems(it, c, 'teach case')).toEqual([]);
        truths += c.truths?.length ?? 0;
      }
      if (it.kind !== 'choose') continue;
      for (const [cid, fb] of Object.entries(it.feedback ?? {})) {
        expect(fb.example, `${it.id} ${cid}`).toBeDefined();
        if (fb.example) expect(caseProblems(it, fb.example, `feedback ${cid}`, it.choices.find((c) => c.id === cid)!.label)).toEqual([]);
      }
    }
    expect(truths).toBeGreaterThan(5000);
  });

  it('the worked cards cover every way the rule can go', () => {
    for (const it of ITEMS) {
      const cards = (it.teach?.cases ?? []).map((c) => cardOfLabel(c.label)!);
      if (it.skill === 's2.guess-rule' && it.kind === 'choose') {
        // A yes card and a no card that match the secret rule, and a card that rules out each wrong rule.
        const target = parse(rightLabel(it));
        const marked = (c: Card) => sceneThings(it).find((t) => cardName(t) === cardName(c))!.mark === 'yes';
        expect(cards.slice(0, 2).map(marked), it.id).toEqual([true, false]);
        for (const c of cards.slice(0, 2)) expect(evaluate(target, c)).toBe(marked(c));
        for (const ch of it.choices.filter((x) => x.id !== it.answer)) {
          expect(cards.some((c) => evaluate(parse(ch.label), c) !== marked(c)), `${it.id} rules out ${ch.label}`).toBe(true);
        }
        continue;
      }
      const rule = ruleIn(it.prompt);
      if (rule.op === 'not' && rule.a.op === 'is') {
        // NOT x: a card with x, and a card with each other value of that feature.
        const x = rule.a.f;
        expect(new Set(cards.map((c) => c[x.kind])).size, it.id).toBe(ALL_FEATURES.filter((f) => f.kind === x.kind).length);
        continue;
      }
      // Two parts (AND, OR, NOT ( … ), the De Morgan pairs, and the bracket of (A OR B) AND NOT C).
      const lit = (g: Formula) => (g.op === 'is' ? g.f : g.op === 'not' && g.a.op === 'is' ? g.a.f : null);
      const ms = rule.op === 'not' ? rule.a : rule;
      let p = null, q = null;
      if (ms.op === 'and' || ms.op === 'or') {
        if (ms.a.op === 'or' || ms.a.op === 'and') [p, q] = [lit(ms.a.a), lit(ms.a.b)];
        else [p, q] = [lit(ms.a), lit(ms.b)];
      }
      expect(p && q, it.id).toBeTruthy();
      if (!p || !q) continue;
      const ways = new Set(cards.map((c) => `${has(c, p!)}${has(c, q!)}`));
      if (it.skill === 's2.brackets-first') {
        // Both bracket parts, one part, the bracket true but the last part false, and the bracket false.
        expect(cards.filter((c) => evaluate(rule, c)).length, it.id).toBe(2);
        expect(ways.has('truetrue') && ways.has('falsefalse'), it.id).toBe(true);
      } else expect(ways.size, it.id).toBe(4);
    }
  });

  it('every wrong choice has its own feedback: a headline naming the gap, the detail, and a card that proves it', () => {
    let n = 0;
    for (const it of ITEMS) {
      if (it.kind !== 'choose') continue;
      const rule = it.skill === 's2.guess-rule' ? null : ruleIn(it.prompt);
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        const fb = it.feedback?.[c.id];
        expect(fb, `${it.id} ${c.id}`).toBeDefined();
        if (!fb) continue;
        n++;
        expect(fb.headline, it.id).toMatch(/^(?:Your|This|\d+ is) /);
        expect(fb.detail.length, it.id).toBeGreaterThanOrEqual(1);
        expect(it.whyWrong?.[c.id], it.id).toBe(feedbackText(fb));
        const card = cardOfLabel(fb.example!.label)!;
        const scene = sceneThings(it);
        // The example card is the counterexample for this choice.
        switch (it.skill) {
          case 's2.and-pick': case 's2.or-pick':
            expect(cardName(card), it.id).toBe(cardName(parseCard(c.label)!));
            expect(evaluate(rule!, card), it.id).toBe(it.skill === 's2.or-pick');
            break;
          case 's2.or-yesno': case 's2.bracket-yesno':
            expect(cardName(card)).toBe(cardName(scene[0]));
            expect(evaluate(rule!, card) ? 'yes' : 'no').toBe(it.answer);
            break;
          case 's2.not-count': case 's2.and-count': case 's2.or-count': {
            // A shown card that the wrong count gets wrong: counted but does not fit, or fits but left out.
            expect(scene.some((t) => cardName(t) === cardName(card)), it.id).toBe(true);
            const sets: Formula[] = [];
            if (rule!.op === 'not' && rule!.a.op === 'is') {
              const x = rule!.a.f;
              sets.push(...ALL_FEATURES.filter((f) => f.kind === x.kind).map(is), or(rule!, rule!.a));
            } else if (rule!.op === 'and' || rule!.op === 'or') {
              sets.push(rule!.a, rule!.b, or(rule!.a, rule!.b), and(rule!.a, rule!.b));
              if (rule!.op === 'or') sets.push(and(or(rule!.a, rule!.b), not(and(rule!.a, rule!.b))));
            }
            const wrongCount = Number(c.label);
            const misreadings = sets.filter((f) => scene.filter((t) => evaluate(f, t)).length === wrongCount);
            expect(misreadings.some((f) => evaluate(f, card) !== evaluate(rule!, card)), `${it.id} ${c.label}: ${cardName(card)}`).toBe(true);
            break;
          }
          case 's2.same-meaning': case 's2.guess-rule': case 's2.not-means': {
            // The first truth (the question’s rule, the mark, or the rule) and the choice disagree on this card.
            const truths = fb.example!.truths!;
            const yours = truths.find((t) => /^It fits your answer|^Your answer includes it$/.test(t.who))!;
            expect(yours, `${it.id} ${c.id}`).toBeDefined();
            const other = it.skill === 's2.not-means' ? truths.find((t) => t.who.startsWith('It fits “'))! : truths[0];
            expect(other.value, `${it.id} ${c.id}`).not.toBe(yours.value);
            break;
          }
          default:
            throw new Error(`no counterexample check for ${it.skill}`);
        }
      }
    }
    expect(n).toBeGreaterThan(1000);
  });

  it('each kind of mistake has its own headline, and one headline never serves two kinds', () => {
    const kindOf = new Map<string, string>();
    const ambiguous: { tpl: string; kinds: string[]; id: string }[] = [];
    const kindsSeen = new Map<string, Set<string>>();
    for (const it of ITEMS) {
      if (it.kind !== 'choose') continue;
      for (const [cid, fb] of Object.entries(it.feedback ?? {})) {
        const kinds = mistakeKinds(it, cid).map((k) => `${it.skill}:${k}`);
        expect(kinds.some((k) => k.endsWith('?')), `${it.id} ${cid}`).toBe(false);
        const tpl = `${it.skill}|${template(fb.headline)}`;
        if (kinds.length !== 1) {
          ambiguous.push({ tpl, kinds, id: `${it.id} ${cid}` });
          continue;
        }
        const was = kindOf.get(tpl);
        expect(was ?? kinds[0], `"${fb.headline}" (${it.id}) serves ${was} and ${kinds[0]}`).toBe(kinds[0]);
        kindOf.set(tpl, kinds[0]);
        if (!kindsSeen.has(it.skill)) kindsSeen.set(it.skill, new Set());
        kindsSeen.get(it.skill)!.add(kinds[0]);
      }
    }
    // A count that two misreadings give is named by one of them.
    for (const a of ambiguous) if (kindOf.has(a.tpl)) expect(a.kinds, a.id).toContain(kindOf.get(a.tpl));
    // Every kind of mistake shows up, each with its own headline.
    const seen = (skill: string) => [...(kindsSeen.get(skill) ?? [])].sort();
    expect(seen('s2.not-means')).toEqual(['s2.not-means:all', 's2.not-means:missing-other', 's2.not-means:the-x']);
    expect(seen('s2.not-count')).toEqual(['s2.not-count:all', 's2.not-count:one-other', 's2.not-count:x']);
    expect(seen('s2.and-pick')).toEqual(['s2.and-pick:no-part', 's2.and-pick:one-part']);
    expect(seen('s2.and-count')).toEqual(['s2.and-count:either', 's2.and-count:part']);
    expect(seen('s2.or-pick')).toEqual(['s2.or-pick:both-parts', 's2.or-pick:one-part']);
    expect(seen('s2.or-count')).toEqual(['s2.or-count:both-only', 's2.or-count:part', 's2.or-count:xor']);
    expect(seen('s2.or-yesno')).toEqual(['s2.or-yesno:both-parts', 's2.or-yesno:no-part', 's2.or-yesno:one-part']);
    expect(seen('s2.bracket-yesno')).toEqual(['s2.bracket-yesno:and', 's2.bracket-yesno:or']);
    expect(seen('s2.same-meaning').length).toBe(4);
    expect(seen('s2.guess-rule')).toEqual(['s2.guess-rule:says-no-to-a-yes', 's2.guess-rule:says-yes-to-a-no']);
    const templates = new Map<string, Set<string>>();
    for (const [tpl, k] of kindOf) {
      if (!templates.has(k)) templates.set(k, new Set());
      templates.get(k)!.add(tpl);
    }
    expect(templates.size).toBe(26);
  });

  it('choice ids come from the choice, never from its place, so a shuffle keeps each explanation with its choice', () => {
    const idOf = new Map<string, string>();
    for (const it of ITEMS) {
      if (it.kind !== 'choose') continue;
      for (const c of it.choices) {
        const k = `${it.skill}|${c.label}`;
        expect(idOf.get(k) ?? c.id, k).toBe(c.id);
        idOf.set(k, c.id);
        expect(c.id).not.toMatch(/^[cr]\d+$/);
        if (it.skill === 's2.and-pick' || it.skill === 's2.or-pick') expect(c.id).toBe(cardId(parseCard(c.label)!));
        if (it.skill === 's2.same-meaning' || it.skill === 's2.guess-rule') expect(c.id).toBe(ruleId(parse(c.label)));
      }
      const reversed: ChooseItem = { ...it, choices: [...it.choices].reverse() };
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        const a = explanationFor(it, { kind: 'choose', id: c.id });
        expect(explanationFor(reversed, { kind: 'choose', id: c.id })).toEqual(a);
        expect(a.title).toBe(it.feedback![c.id].headline);
        expect(a.specific).toBe(true);
      }
    }
  });

  it('tap-all items name each misreading and every one-card slip, and every card claim is true', () => {
    const NAMED: Record<string, Misreading[]> = {
      's2.not': [],
      's2.and': ['andAsOr'],
      's2.and-not': ['dropNot', 'andAsOr'],
      's2.or-both': ['orExclusive', 'orAsAnd'],
      's2.not-both': ['deMorgan', 'dropBrackets'],
      's2.not-either': ['deMorgan', 'dropBrackets'],
      's2.brackets-first': ['orExclusive', 'orAsAnd', 'dropBrackets'],
    };
    for (const it of ITEMS) {
      if (it.kind !== 'tapall') continue;
      const rule = ruleIn(it.prompt);
      const diag = new Map((it.diagnose ?? []).map((d) => [key(d.ids), d.message]));
      const answer = new Set(it.answer);
      // One card left out, one card too many, every card, and none.
      const slips = [...it.things.map((t) => (answer.has(t.id) ? it.answer.filter((x) => x !== t.id) : [...it.answer, t.id])), it.things.map((t) => t.id), []];
      for (const ids of slips) expect(diag.has(key(ids)), `${it.id}: no diagnose for {${ids}}`).toBe(true);
      expect(NAMED[it.skill], it.skill).toBeDefined();
      for (const r of NAMED[it.skill] ?? []) {
        const ids = pickIds(rule, it.things, r);
        if (ids.length && key(ids) !== key(it.answer)) expect(diag.has(key(ids)), `${it.id}: no diagnose for ${r}`).toBe(true);
      }
      for (const d of it.diagnose ?? []) {
        // grade() shows it, and its first sentence becomes the explanation's title.
        const g = grade(it, { kind: 'tapall', ids: d.ids });
        expect(g.correct).toBe(false);
        expect(g.feedback).toBe(d.message);
        const m = explanationFor(it, { kind: 'tapall', ids: d.ids });
        expect(m.title, d.message).toMatch(/^Your answer /);
        expect(m.specific).toBe(true);
        for (const cl of claims(d.message)) expect(evaluate(rule, cl.card), `${it.id}: ${d.message}`).toBe(cl.fits);
        // "Your answer leaves out the X." names a card that fits; "Your answer takes the X, but …" one that does not.
        const one = /^Your answer (leaves out|takes) the ((?:big|small) (?:red|blue|yellow) (?:circle|square|triangle))[.,]/.exec(d.message);
        if (one) {
          const t = it.things.find((x) => cardName(x) === one[2])!;
          expect(t, d.message).toBeDefined();
          expect(evaluate(rule, t), d.message).toBe(one[1] === 'leaves out');
          expect(d.ids.includes(t.id), d.message).toBe(one[1] === 'takes');
        }
      }
      expect(claims((it.diagnose ?? []).map((d) => d.message).join(' ')).length).toBeGreaterThan(it.things.length);
    }
  });

  it('new examples after a miss: the same skill first, and a pair where the skill has two edges', () => {
    const parts = (it: Item) => {
      const rule = ruleIn(it.prompt);
      const c = sceneThings(it)[0];
      return rule.op === 'or' ? Number(evaluate(rule.a, c)) + Number(evaluate(rule.b, c)) : -1;
    };
    const bracketOp = (f: Formula) => (f.op === 'not' ? f.a.op : '?');
    for (let seed = 1; seed <= 25; seed++) {
      for (const l of stop2.lessons) {
        for (const it of l.practice(createRng(seed))) {
          const set = freshCheckSet(stop2, it, seed);
          expect(set.length, it.id).toBeGreaterThanOrEqual(1);
          expect(set[0].skill, it.id).toBe(it.skill);
          expect(new Set([it, ...set].map(looks)).size, it.id).toBe(set.length + 1);
          for (const x of set) {
            expect(x.lesson).toBe(it.lesson);
            expect(soundness(x)).toEqual([]);
          }
          switch (it.skill) {
            case 's2.or-yesno': {
              // A card that fits both parts, and one that fits one part or no part: both edges of OR.
              expect(set.map((x) => x.skill)).toEqual(['s2.or-yesno', 's2.or-yesno']);
              const ways = set.map(parts);
              expect(ways, it.id).toContain(2);
              expect(ways[0], it.id).toBe(parts(it) === 0 ? 0 : 2);
              expect(new Set(ways).size, it.id).toBe(2);
              break;
            }
            case 's2.or-both': case 's2.or-count': case 's2.or-pick':
              expect(set.map((x) => x.skill)).toEqual([it.skill, 's2.or-yesno']);
              expect(parts(set[1])).toBe(2);
              break;
            case 's2.bracket-yesno': {
              expect(set.map((x) => bracketOp(ruleIn(x.prompt))).sort()).toEqual(['and', 'or']);
              expect(set.map((x) => (x.kind === 'choose' ? x.answer : '?')).sort()).toEqual(['no', 'yes']);
              break;
            }
            case 's2.not-both': case 's2.not-either':
              expect(set.map((x) => x.skill)).toEqual(it.skill === 's2.not-both' ? ['s2.not-both', 's2.not-either'] : ['s2.not-either', 's2.not-both']);
              break;
            case 's2.same-meaning': {
              // One NOT (A AND B) pair and one NOT (A OR B) pair, the missed kind first.
              const opOf = (x: Item) => (x.kind === 'choose' ? bracketOp([ruleIn(x.prompt), parse(rightLabel(x))].find((f) => f.op === 'not')!) : '?');
              const ops = set.map(opOf);
              expect(ops[0], `${it.id}: ${it.prompt} -> ${set[0].prompt}`).toBe(opOf(it));
              expect(ops.sort()).toEqual(['and', 'or']);
              break;
            }
            default:
              expect(set.length, it.skill).toBe(1);
          }
        }
      }
    }
  });

  it('every item’s full explanation reads at a 6th-grade level on its own', () => {
    for (const it of ITEMS) {
      const text = [it.prompt, it.explain, it.hint ?? '', ...teachStrings(it), ...(it.kind === 'tapall' ? (it.diagnose ?? []).map((d) => d.message) : [])].join('\n');
      expect(fkGrade(text), it.id).toBeLessThanOrEqual(READING.maxGrade);
      expect(longestSentence(text).words, `${it.id}: ${longestSentence(text).sentence}`).toBeLessThanOrEqual(READING.maxSentenceWords);
    }
  });

  it('teaching text uses curly quotes with the period inside, says what “both” refers to, and never “the opposite”', () => {
    for (const it of ITEMS) {
      const texts = [...teachStrings(it), ...(it.kind === 'tapall' ? (it.diagnose ?? []).map((d) => d.message) : []), it.explain, it.hint ?? ''];
      for (const t of texts) {
        expect(t, it.id).not.toMatch(/["']/);
        expect(t, it.id).not.toMatch(/”\./);
        expect(t, it.id).not.toMatch(/the opposite|that row/i);
        // "both" is always "both parts".
        expect(t, `${it.id}: ${t}`).not.toMatch(/\bboth\b(?! parts)/i);
        expect(t.replace(/“.+?”/g, ''), `${it.id}: ${t}`).not.toMatch(/\b(?:red|blue|yellow|big|small|circle|square|triangle|\)) (?:AND|OR) /);
        for (const q of t.matchAll(/“([^”]+?)[.,]?”/g)) {
          // A quote is a rule, a word being defined, or a question to ask yourself.
          if (/\?$/.test(q[1]) || /^(?:Fits|Do the brackets first|Mean the same|Rule out)$/.test(q[1])) continue;
          expect(() => parse(q[1]), `${it.id}: ${t}`).not.toThrow();
        }
      }
    }
  });
});

// ---------- review of the stop 2 migration: regressions ----------
//
// A second pass read every explanation as a 6th grader would and recomputed every claim. These tests hold the fixes:
// a part claim is checked on its card, the classic NOT mistake is never the right count, the inside of the brackets
// is named before skipped brackets, misreadings name the rule the answer fits, every defined word is used, and the
// new examples after a same-meaning miss start with the same kind of pair.

const CARD_NAME = /\b(?:the|The|a|A) ((?:big|small) (?:red|blue|yellow) (?:circle|square|triangle))\b/g;
const FEATURE = '(red|blue|yellow|big|small|a circle|a square|a triangle)';
const wordOf = (f: (typeof ALL_FEATURES)[number]) => (f.kind === 'shape' ? `a ${f.value}` : f.value);
const featureNamed = (w: string) => ALL_FEATURES.find((f) => wordOf(f) === w)!;

interface Block { text: string; rule: Formula; card: Card | null; where: string }

/** Every block of explanation text an item can show after a miss, with the rule it reasons about and its first card. */
function explanationBlocks(it: Item): Block[] {
  if (it.skill === 's2.same-meaning') return [];
  const out: Block[] = [];
  const own = it.skill === 's2.guess-rule' && it.kind === 'choose' ? parse(rightLabel(it)) : ruleIn(it.prompt);
  out.push({ text: it.explain, rule: own, card: null, where: 'explain' });
  for (const c of it.teach?.cases ?? []) if (c.note) out.push({ text: c.note, rule: own, card: cardOfLabel(c.label), where: `case ${c.label}` });
  out.push({ text: (it.teach?.simpler ?? []).join(' '), rule: own, card: null, where: 'simpler' });
  if (it.kind === 'tapall') for (const d of it.diagnose ?? []) out.push({ text: d.message, rule: own, card: null, where: `diagnose {${d.ids}}` });
  if (it.kind === 'choose') {
    for (const [cid, fb] of Object.entries(it.feedback ?? {})) {
      const rule = it.skill === 's2.guess-rule' ? parse(it.choices.find((c) => c.id === cid)!.label) : own;
      const card = fb.example ? cardOfLabel(fb.example.label) : null;
      out.push({ text: [fb.headline, ...fb.detail].join(' '), rule, card, where: `feedback ${cid}` });
      if (fb.example?.note) out.push({ text: fb.example.note, rule, card, where: `feedback ${cid} note` });
      if (fb.simpler) out.push({ text: fb.simpler.join(' '), rule, card, where: `feedback ${cid} simpler` });
    }
  }
  return out;
}

/**
 * Every claim about one card in a block, recomputed: its features ("It is small, and it is not red."), a part
 * ("The part “NOT small” is false.", "So “NOT small” is false."), the inside of the brackets, and "both parts" /
 * "no part". The card is the last one named, or the block's own card.
 */
function cardClaimProblems(it: Item, b: Block): { problems: string[]; n: number } {
  const problems: string[] = [];
  let n = 0;
  let card = b.card;
  const check = (ok: boolean, what: string, sentence: string) => {
    n++;
    if (!ok) problems.push(`${it.id} ${it.skill} ${b.where}: ${what} is false for the ${card ? cardName(card) : '?'}: "${sentence}"`);
  };
  const subject = '(?:\\b[Ii]t|(?:the|The|a|A) (?:big|small) (?:red|blue|yellow) (?:circle|square|triangle))';
  const featureClaim = new RegExp(`${subject} is (not )?${FEATURE}(?:, (?:and|but) it is (not )?${FEATURE})?(?=[.,:]| so)`, 'g');
  const inside = b.rule.op === 'not' ? b.rule.a : b.rule.op === 'and' && (b.rule.a.op === 'or' || b.rule.a.op === 'and') ? b.rule.a : null;
  for (const sentence of b.text.split(/(?<=[.?!]”?)\s+(?=[A-Z“])/)) {
    const named = [...sentence.matchAll(CARD_NAME)].map((m) => parseCard(m[1])!);
    if (named.length) card = named[named.length - 1];
    if (!card) continue;
    const c = card;
    for (const m of sentence.matchAll(featureClaim)) {
      const who = /((?:big|small) \w+ \w+) is/.exec(m[0]);
      const x = who ? parseCard(who[1])! : c;
      check(has(x, featureNamed(m[2])) !== !!m[1], `"${m[0]}"`, sentence);
      if (m[4]) check(has(x, featureNamed(m[4])) !== !!m[3], `"${m[0]}"`, sentence);
    }
    for (const m of sentence.matchAll(/(?:[Tt]he part|[Ss]o) “(.+?)[.,]?” is (true|false)/g)) check(evaluate(parse(m[1]), c) === (m[2] === 'true'), `"${m[0]}"`, sentence);
    for (const m of sentence.matchAll(/(?:the inside|the part in brackets), “(.+?)[.,]?” is (true|false)/g)) check(evaluate(parse(m[1]), c) === (m[2] === 'true'), `"${m[0]}"`, sentence);
    for (const m of sentence.matchAll(/(Both|No) parts? of “(.+?)[.,]?” (?:are|is) (true|false)/g)) {
      const f = parse(m[2]);
      if (f.op !== 'and' && f.op !== 'or') throw new Error(`"${m[2]}" has no two parts`);
      const v = m[1] === 'No' ? false : m[3] === 'true';
      check(evaluate(f.a, c) === v && evaluate(f.b, c) === v, `"${m[0]}"`, sentence);
    }
    for (const m of sentence.matchAll(/[Tt]he (?:inside|part in brackets) is (true|false)/g)) check(!!inside && evaluate(inside, c) === (m[1] === 'true'), `"${m[0]}"`, sentence);
  }
  return { problems, n };
}

describe('stop 2 review: the fixes stay fixed', () => {
  it('every claim about a card, a part or the inside of the brackets is true for that card', () => {
    let n = 0;
    const problems: string[] = [];
    for (const it of ITEMS) {
      for (const b of explanationBlocks(it)) {
        const r = cardClaimProblems(it, b);
        n += r.n;
        problems.push(...r.problems);
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
    expect(n).toBeGreaterThan(20000);
  });

  it('a NOT part in a two-part rule is flipped in words before it is used: “It is small. So “NOT small” is false.”', () => {
    // A AND NOT B is untaught in stop 2 today (no marked example, no board), so it is checked on the built-for-later items.
    let seen = 0;
    for (const it of LATER) {
      if (it.kind !== 'tapall' || it.skill !== 's2.and-not') continue;
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'and' || rule.b.op !== 'not') throw new Error(`${it.id}: not A AND NOT B`);
      const negated = render(rule.b);
      for (const d of it.diagnose ?? []) {
        if (!/For example|^Your answer (?:leaves out|takes) the (?:big|small)/.test(d.message)) continue;
        seen++;
        expect(d.message, it.id).toMatch(new RegExp(`So “${negated}” is (?:true|false)\\.`));
        // ... and the verdict does not name that part a second time.
        expect(d.message, it.id).not.toContain(`The part “${negated}” is`);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });

  it('NOT x count: counting the x cards (the NOT read the wrong way round) is never the right count, and it is offered with its own feedback', () => {
    let n = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const items = [...stop2.lessons[0].practice(createRng(seed)), ...stop2.check!(createRng(seed)), stop2.practice!(createRng(seed))];
      for (const it of items) {
        if (it.skill !== 's2.not-count' || it.kind !== 'choose') continue;
        n++;
        const rule = ruleIn(it.prompt);
        if (rule.op !== 'not') throw new Error(`${it.id}: not a NOT rule`);
        const things = sceneThings(it);
        const nx = things.filter((t) => evaluate(rule.a, t)).length;
        const right = things.filter((t) => evaluate(rule, t)).length;
        expect(nx, `${it.id} seed ${seed}: ${it.prompt}`).not.toBe(right);
        const pick = it.choices.find((c) => Number(c.label) === nx);
        expect(pick, `${it.id} seed ${seed}: the count of the x cards is a choice`).toBeDefined();
        expect(it.feedback?.[pick!.id]?.headline, it.id).toMatch(/leaves out\.$/);
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  it('brackets first: an answer that is exactly the inside of the brackets is named by the last part it leaves out', () => {
    // (A OR B) AND NOT C is untaught in stop 2 today (no marked example, no board), so it is checked on the built-for-later items.
    let same = 0;
    const esc = (s: string) => s.replace(/[()]/g, '\\$&');
    for (const it of LATER) {
      if (it.kind !== 'tapall' || it.skill !== 's2.brackets-first') continue;
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'and') throw new Error(`${it.id}: not ( … ) AND NOT …`);
      const inside = pickIds(rule.a, it.things);
      const d = it.diagnose!.find((x) => key(x.ids) === key(inside))!;
      expect(d.message, it.id).toMatch(new RegExp(`^Your answer leaves out the last part, “${esc(render(rule.b))}\\.” It takes every \\w+ that fits “${esc(render(rule.a))},” even one that is `));
      if (key(pickIds(rule, it.things, 'dropBrackets')) === key(inside)) same++;
      // Its example is a card the last part leaves out.
      const ex = parseCard([...d.message.matchAll(CARD_NAME)][0][1])!;
      expect(evaluate(rule.a, ex) && !evaluate(rule.b, ex), d.message).toBe(true);
    }
    expect(same).toBeGreaterThan(10);
  });

  it('NOT ( … ) with the brackets skipped names the rule the answer fits, and that rule takes exactly the tapped cards', () => {
    let n = 0;
    for (const it of ITEMS) {
      if (it.kind !== 'tapall' || (it.skill !== 's2.not-both' && it.skill !== 's2.not-either')) continue;
      const read = withoutBrackets(ruleIn(it.prompt));
      const d = it.diagnose!.find((x) => key(x.ids) === key(pickIds(read, it.things)));
      expect(d, it.id).toBeDefined();
      expect(d!.message, it.id).toContain(`fit “${render(read)}.”`);
      n++;
    }
    expect(n).toBeGreaterThan(50);
  });

  it('an empty answer is named with its gap in one sentence: how many cards fit', () => {
    for (const it of ITEMS) {
      if (it.kind !== 'tapall') continue;
      const d = it.diagnose!.find((x) => x.ids.length === 0)!;
      const m = explanationFor(it, { kind: 'tapall', ids: [] });
      const t = /^Your answer has no \w+, but (\d+) \w+ fits? “(.+)\.”$/.exec(m.title);
      expect(t, `${it.id}: ${m.title}`).not.toBeNull();
      expect(Number(t![1])).toBe(it.answer.length);
      expect(d.message.startsWith(m.title)).toBe(true);
    }
  });

  it('bracket yes/no: the headline says what the card does and why, and the detail works the inside out step by step', () => {
    let n = 0;
    for (const it of ITEMS) {
      if (it.kind !== 'choose' || it.skill !== 's2.bracket-yesno') continue;
      const rule = ruleIn(it.prompt);
      if (rule.op !== 'not' || (rule.a.op !== 'and' && rule.a.op !== 'or')) throw new Error(`${it.id}: not NOT ( … )`);
      const fb = it.feedback![it.answer === 'yes' ? 'no' : 'yes'];
      const fits = it.answer === 'yes';
      expect(fb.headline).toBe(`This ${skinOf(it)} ${fits ? 'fits' : 'does not fit'}, because the inside of the brackets is ${fits ? 'false' : 'true'} for it.`);
      expect(evaluate(rule.a, sceneThings(it)[0])).toBe(!fits);
      expect(fb.detail.join(' '), it.id).toContain(rule.a.op === 'and' ? 'AND needs both parts, so' : 'One part is enough for OR, so');
      n++;
    }
    expect(n).toBeGreaterThan(20);
  });

  it('every word the explanation defines is used in it, and no sentence says “A square is a square”', () => {
    for (const it of ITEMS) {
      const t = it.teach!;
      const rest = [
        it.prompt, t.rule, t.meaning ?? '', t.casesTitle ?? '', ...(t.remember ?? []), ...(t.simpler ?? []),
        ...(t.cases ?? []).flatMap((c) => [c.label, ...(c.truths ?? []).map((x) => x.who), c.note ?? '']),
        ...(it.kind === 'choose' ? Object.values(it.feedback ?? {}).flatMap((fb) => [fb.headline, ...fb.detail, ...(fb.simpler ?? [])]) : []),
        ...(it.kind === 'tapall' ? (it.diagnose ?? []).map((d) => d.message) : []),
      ].join(' ');
      for (const term of t.terms ?? []) {
        const word = term.word.replace(/[“”]/g, '').replace(/^(?:A|The) /, '');
        const caps = word === word.toUpperCase();
        const stems = word.split(' ').map((w) => (caps ? w : w.replace(/s$/, '')));
        const re = new RegExp(`\\b${stems.map((w) => `${w}(?:s|d|ed)?`).join(' ')}\\b`, caps ? '' : 'i');
        expect(re.test(rest), `${it.id}: “${term.word}” is defined but never used`).toBe(true);
      }
      for (const s of [...teachStrings(it), it.explain]) expect(s, it.id).not.toMatch(/\b[Aa] (\w+) is (?:a )?\1\b/);
    }
  });

  it('guess the rule: the example card names which rule is the right answer', () => {
    for (const it of ITEMS) {
      if (it.kind !== 'choose' || it.skill !== 's2.guess-rule') continue;
      for (const fb of Object.values(it.feedback ?? {})) expect(fb.example!.truths!.map((t) => t.who)).toContain(`It fits the right answer, “${rightLabel(it)}”`);
    }
  });

  it('same meaning: each wrong choice has its own smallest example on the card that tells it apart', () => {
    for (const it of ITEMS) {
      if (it.kind !== 'choose' || it.skill !== 's2.same-meaning') continue;
      const given = ruleIn(it.prompt);
      expect(it.teach!.casesTitle).toBe('Test the question’s rule and the right answer on every kind of card.');
      for (const c of it.choices) {
        if (c.id === it.answer) continue;
        const fb = it.feedback![c.id];
        const card = cardOfLabel(fb.example!.label)!;
        const s = fb.simpler!;
        expect(s[0], it.id).toContain(`Try one card: a ${cardName(card)}.`);
        expect(s[1]).toBe(`Does it fit the question’s rule, “${render(given)}”? ${evaluate(given, card) ? 'Yes' : 'No'}.`);
        expect(s[2]).toBe(`Does it fit your answer, “${c.label}”? ${evaluate(parse(c.label), card) ? 'Yes' : 'No'}.`);
        expect(evaluate(given, card)).not.toBe(evaluate(parse(c.label), card));
      }
    }
  });

  it('key ideas say what “neither” and “both” refer to', () => {
    for (const l of stop2.lessons) {
      for (const card of l.ideas) {
        for (const text of [card.title, ...card.body]) {
          expect(text, `${l.id} ${card.title}`).not.toMatch(/\bneither\b/i);
          expect(text, `${l.id} ${card.title}`).not.toMatch(/\bboth\b(?! parts| checks)/i);
        }
      }
    }
  });

  it('the untaught families stay built and sound for a later lesson', () => {
    expect(new Set(LATER.map((it) => it.skill))).toEqual(new Set(['s2.and-not', 's2.brackets-first']));
    for (const it of LATER) expect(soundness(it), it.id).toEqual([]);
  });
});

// ---------- See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026) ----------
//
// See: a key idea shows one rule on a row of cards, every card already marked. Do: the same cards stay up and the
// learner taps Fits or Not on each card for a new rule of the same family (Guess the rule: tests a rule, then keeps
// it or rules it out). Quiz: try 1 is a twin rule on the same cards in a new order; nothing in a quiz, the check, the
// Arcade, a new example or the notebook uses a rule family its lesson did not teach. Every hint shows a marked card.

/**
 * Read a rule's words without the rule engine and say whether a card fits: NOT binds tightest, then AND, then OR,
 * and brackets group. Used to re-solve every mark on the boards from the words the learner sees.
 */
function fitsByWords(words: string, c: Card): boolean {
  const toks = words.replace(/\ba (circle|square|triangle)\b/g, '$1').replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/);
  const FEATURES = ['circle', 'square', 'triangle', 'red', 'blue', 'yellow', 'big', 'small'];
  let i = 0;
  const atom = (): boolean => {
    const t = toks[i++];
    if (t === 'NOT') return !atom();
    if (t === '(') {
      const v = anyOf();
      if (toks[i++] !== ')') throw new Error(`no ) in "${words}"`);
      return v;
    }
    if (!FEATURES.includes(t)) throw new Error(`cannot read "${t}" in "${words}"`);
    return c.shape === t || c.color === t || c.size === t;
  };
  const allOf = (): boolean => {
    let v = atom();
    while (toks[i] === 'AND') {
      i++;
      const w = atom();
      v = v && w;
    }
    return v;
  };
  const anyOf = (): boolean => {
    let v = allOf();
    while (toks[i] === 'OR') {
      i++;
      const w = allOf();
      v = v || w;
    }
    return v;
  };
  const v = anyOf();
  if (i !== toks.length) throw new Error(`extra words in "${words}"`);
  return v;
}

/** A rule and every part inside it, in words: “NOT (blue AND small)”, “blue AND small”, “blue”, “small”. */
function partsOf(f: Formula): string[] {
  const kids = f.op === 'is' ? [] : f.op === 'not' ? [f.a] : [f.a, f.b];
  return [render(f), ...kids.flatMap(partsOf)];
}

/**
 * The rule a board row is about, read from its label: "Rule: NOT blue", "Inside: blue AND small", or a label that ends
 * "Test the rule “big.”" ("The small blue circle got a yes. Test the rule “big.”").
 */
function rowRule(label: string): string {
  const m = /^(?:Rule|Inside): (.+)$/.exec(label) ?? /Test the rule “(.+?)\.”$/.exec(label);
  if (!m) throw new Error(`no rule in the row label "${label}"`);
  return m[1];
}

/** Every player-facing string of a board: its words, each row's need and note, and each mark's words and facts. */
const boardText = (st: DrillStep): string[] => [
  st.title, ...st.body, st.done, st.twin ?? '',
  ...st.rows.flatMap((r) => [r.label, r.note ?? '', r.needs ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
].filter(Boolean);

/** The rule families a stop 2 rule belongs to. */
type Family = 'one' | 'not-x' | 'and' | 'or' | 'not-and' | 'not-or' | 'not-and-not' | 'not-or-not' | 'not-one-part' | 'other';
function familyOf(f: Formula): Family {
  const lit = (g: Formula) => g.op === 'is';
  const neg = (g: Formula) => g.op === 'not' && g.a.op === 'is';
  if (lit(f)) return 'one';
  if (neg(f)) return 'not-x';
  if ((f.op === 'and' || f.op === 'or') && lit(f.a) && lit(f.b)) return f.op;
  if (f.op === 'not' && (f.a.op === 'and' || f.a.op === 'or') && lit(f.a.a) && lit(f.a.b)) return f.a.op === 'and' ? 'not-and' : 'not-or';
  if ((f.op === 'and' || f.op === 'or') && neg(f.a) && neg(f.b)) return f.op === 'and' ? 'not-and-not' : 'not-or-not';
  if ((f.op === 'and' || f.op === 'or') && neg(f.a) && lit(f.b)) return 'not-one-part';
  return 'other';
}

/** What each lesson teaches with a marked key idea and a board. */
const TAUGHT: Record<string, Family[]> = {
  's2.l1': ['not-x'],
  's2.l2': ['and'],
  's2.l3': ['or'],
  's2.l4': ['not-and', 'not-or', 'not-and-not', 'not-or-not'],
  's2.l5': ['one', 'not-x', 'and', 'or'],
};

/**
 * Every rule an item asks the learner to use: the rule in its prompt, or for guess the rule every choice (the secret
 * rule and the rules to rule out), or for same meaning the question's rule and the right answer.
 */
function rulesUsed(it: Item): Formula[] {
  if (it.kind === 'choose' && it.skill === 's2.guess-rule') return it.choices.map((c) => parse(c.label));
  if (it.kind === 'choose' && it.skill === 's2.same-meaning') return [ruleIn(it.prompt), parse(rightLabel(it))];
  return [ruleIn(it.prompt)];
}

function familyProblems(it: Item, where: string): string[] {
  const out: string[] = [];
  if (it.skill === 's2.and-not' || it.skill === 's2.brackets-first') out.push(`${where} ${it.id}: untaught skill ${it.skill}`);
  for (const f of rulesUsed(it)) if (!TAUGHT[it.lesson].includes(familyOf(f))) out.push(`${where} ${it.id}: “${render(f)}” (${familyOf(f)}) is not taught in ${it.lesson}`);
  // Same meaning: every choice, wrong ones too, is a form lesson 4 marks on its cards. A NOT on one part only (“NOT a
  // circle AND yellow”) is A AND NOT B again, a family no lesson teaches, so it is never offered.
  if (it.kind === 'choose' && it.skill === 's2.same-meaning') {
    for (const c of it.choices) {
      const fam = familyOf(parse(c.label));
      if (!TAUGHT['s2.l4'].includes(fam)) out.push(`${where} ${it.id}: choice “${c.label}” (${fam})`);
    }
  }
  return out;
}

describe('stop 2: See -> Do -> Quiz (skill-drill handoff)', () => {
  const E = EXAMPLE_RULES;
  const deckOfScene = (st: DrillStep) => (st.scene?.kind === 'things' ? st.scene.things : []);

  it('See: every lesson has a key idea with one rule on a row of cards, every card already marked by the engine', () => {
    for (const l of stop2.lessons) {
      const marked = l.ideas.filter((c) => c.scene?.kind === 'things' && c.scene.things.length >= 4 && c.scene.things.every((t) => t.mark));
      expect(marked.length, l.id).toBeGreaterThan(0);
      expect(l.ideas.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.ideas.length, l.id).toBeLessThanOrEqual(7);
    }
    // The handoff's See: NOT red, with a blue circle and a yellow square marked in, a red circle out, and the note.
    const see = stop2.lessons[0].ideas[2];
    const things = see.scene?.kind === 'things' ? see.scene.things : [];
    const markOf = (name: string) => things.find((t) => cardName(t) === name)?.mark;
    expect([markOf('big blue circle'), markOf('small yellow square'), markOf('big red circle')]).toEqual(['yes', 'yes', 'no']);
    expect(see.body.join(' ')).toContain('NOT red is not “the blue ones.”');
    for (const t of things) expect(t.mark).toBe(fitsByWords('NOT red', t) ? 'yes' : 'no');
  });

  it('the key ideas’ new claims are true: NOT on a shape and a size, NOT (red OR big), and the switch', () => {
    const l1 = stop2.lessons[0], l4 = stop2.lessons[3];
    expect(l1.ideas[3].scene).toEqual(exampleScene(EXAMPLES.sample, E.notCircle));
    for (const c of ALL_CARDS) {
      expect(evaluate(E.notCircle, c)).toBe(c.shape === 'square' || c.shape === 'triangle');
      expect(evaluate(not(big), c)).toBe(c.size === 'small');
    }
    expect(l4.ideas[5].scene).toEqual(exampleScene(EXAMPLES.brackets, E.notRedOrBig));
    expect(EXAMPLES.brackets.filter((c) => evaluate(E.notRedOrBig, c)).map(cardName)).toEqual(['small yellow circle', 'small blue triangle']);
    expect(l4.ideas[5].body.join(' ')).toContain('The same two cards fit: the small yellow circle and the small blue triangle.');
    expect(EXAMPLES.brackets.map((c) => evaluate(E.notRedOrBig, c))).toEqual(EXAMPLES.brackets.map((c) => evaluate(E.notRedAndNotBig, c)));
    // The inside first: red AND big takes only the big red circle, and the card's marks are the inside's.
    expect(l4.ideas[1].scene).toEqual(exampleScene(EXAMPLES.brackets, and(red, big)));
    expect(EXAMPLES.brackets.filter((c) => evaluate(and(red, big), c)).map(cardName)).toEqual(['big red circle']);
    expect(l4.ideas[1].body.join(' ')).toContain('Only the big red circle is red AND big.');
    // NOT (red AND big): the bridge sentence, and only the big red circle is left out.
    expect(l4.ideas[3].scene).toEqual(exampleScene(EXAMPLES.brackets, E.notRedAndBig));
    expect(l4.ideas[3].body.join(' ')).toContain('if it fits the inside, NOT leaves it out');
    expect(EXAMPLES.brackets.filter((c) => !evaluate(E.notRedAndBig, c)).map(cardName)).toEqual(['big red circle']);
    // The switch: NOT red OR NOT big marks the cards as NOT (red AND big) does, and only the big red circle is out.
    expect(l4.ideas[6].scene).toEqual(l4.ideas[3].scene);
    expect(EXAMPLES.brackets.filter((c) => !evaluate(E.notRedOrNotBig, c)).map(cardName)).toEqual(['big red circle']);
    // The OR deck holds the handoff's four sample cards.
    for (const name of ['big red circle', 'small red square', 'big blue circle', 'small yellow triangle']) expect(EXAMPLES.or.map(cardName)).toContain(name);
  });

  it('Do: every lesson has boards on a key idea’s own picture, with only Fits / Not, Match / No match and Keep / Rule out to tap', () => {
    for (const l of stop2.lessons) {
      expect(l.drill, l.id).toBe(DRILLS[l.id]);
      expect(l.drill!.length, l.id).toBeGreaterThan(0);
      for (const st of l.drill!) {
        // The same board: the very picture a key idea shows (its marks are the case already shown).
        expect(l.ideas.some((c) => c.scene === st.scene), `${st.id} uses a key idea’s picture`).toBe(true);
        expect(st.twin).toBeUndefined();
        if (st.scene?.kind === 'contrast') {
          // A distinction board on a contrast picture: each card it marks is on a panel, or named where it is marked.
          const onPanels = st.scene.pairs.flatMap((p) => p.things ?? []).map(cardName);
          for (const r of st.rows) {
            for (const m of r.marks.filter((x) => x.thing)) {
              expect(cardName(m.thing!), m.id).toBe(m.label.toLowerCase());
              const named = [r.label, ...st.body].join(' ').toLowerCase().includes(cardName(m.thing!));
              expect(onPanels.includes(cardName(m.thing!)) || named, `${m.id}: the card is on the picture or named`).toBe(true);
            }
          }
        } else {
          const deck = deckOfScene(st);
          expect(deck.length, st.id).toBe(6);
          for (const r of st.rows) {
            const cards = r.marks.filter((m) => m.thing);
            // One mark per card of the picture, in the same order, each drawn beside its name.
            expect(cards.map((m) => m.label.toLowerCase()), r.id).toEqual(deck.map(cardName));
            for (const m of cards) expect(cardName(m.thing!), m.id).toBe(m.label.toLowerCase());
          }
        }
        for (const m of st.rows.flatMap((r) => r.marks)) expect(m.options.map((o) => o.id).join(), m.id).toMatch(/^(?:fit,not|keep,reject|yes,no)$/);
        // No final-answer question on a board, and tapping nothing (only Next) never passes it.
        expect(boardText(st).join(' ')).not.toMatch(/\bWhich\b|\bHow many\b/);
        expect(checkDrill(st, {}).done).toBe(false);
        expect(marksToTap(st).length, st.id).toBeLessThanOrEqual(12);
        const right = Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
        expect(checkDrill(st, right).done, st.id).toBe(true);
      }
    }
  });

  it('Do: every mark is re-solved from the words on the board, and every machine mark from the picture', () => {
    let fits = 0, matches = 0, verdicts = 0;
    for (const l of stop2.lessons) {
      for (const st of l.drill!) {
        const deck = deckOfScene(st);
        for (const r of st.rows) {
          const words = rowRule(r.label);
          const rowCard = r.marks.find((m) => m.thing)?.thing;
          for (const m of r.marks) {
            const kind = m.options.map((o) => o.id).join();
            if (kind === 'fit,not') {
              const card = parseCard(m.label)!;
              expect(m.answer, `${m.id} ${words}`).toBe(fitsByWords(words, card) ? 'fit' : 'not');
              fits++;
            } else if (kind === 'yes,no') {
              // Match: the rule's Fits or Not agrees with the card's machine mark (from the picture when the card is on it).
              const t = m.thing ?? rowCard!;
              const machine = deck.find((x) => cardName(x) === cardName(t))?.mark ?? t.mark;
              expect(machine, m.id).toBeDefined();
              expect(m.answer, `${m.id} ${words}`).toBe(fitsByWords(words, t) === (machine === 'yes') ? 'yes' : 'no');
              matches++;
            } else {
              // Keep for now or rule out: keep only when every card's Fits / Not matches the machine's mark in the picture.
              const all = deck.every((t) => fitsByWords(words, t) === (t.mark === 'yes'));
              expect(m.answer, m.id).toBe(all ? 'keep' : 'reject');
              verdicts++;
            }
          }
        }
      }
    }
    // Fits or Not: NOT 12, AND 6, OR 6, brackets 44 (2 on the two questions, then 2 rows on each of three boards and the
    // switch), guess the rule 11 (3 on the mark board, 6 for the learner's rule, 2 for the new card).
    expect(fits).toBe(79);
    // Match: 3 on the mark board, and the two shown tests of 6 cards.
    expect(matches).toBe(15);
    expect(verdicts).toBe(3);
  });

  it('Do: the boards drill the handoff’s cases (NOT is more than one color, OR keeps a card that fits both parts, brackets change who fits)', () => {
    const [l1, l2, l3, l4, l5] = stop2.lessons;
    const answers = (st: DrillStep, k: number) => Object.fromEntries(st.rows[k].marks.filter((m) => m.thing).map((m) => [m.label.toLowerCase(), m.answer]));
    // NOT: the See card's NOT red stays up; the learner marks NOT blue. More than one other color fits.
    const notBlue = l1.drill![0];
    expect(notBlue.scene).toBe(l1.ideas[2].scene);
    expect(rowRule(notBlue.rows[0].label)).toBe('NOT blue');
    const fitColors = new Set(notBlue.rows[0].marks.filter((m) => m.answer === 'fit').map((m) => m.thing!.color));
    expect([...fitColors].sort()).toEqual(['red', 'yellow']);
    expect(rowRule(l1.drill![1].rows[0].label)).toBe('NOT a square');
    // AND: red AND big on the red AND a circle cards.
    expect(rowRule(l2.drill![0].rows[0].label)).toBe('red AND big');
    expect(Object.entries(answers(l2.drill![0], 0)).filter(([, v]) => v === 'fit').map(([k]) => k)).toEqual(['big red circle', 'big red triangle']);
    // OR: the handoff's sample taps. Big OR red: Fit on the big red circle, the small red square and the big blue
    // circle; Not on the small yellow triangle. The big red circle fits even though it is big and red.
    const or = answers(l3.drill![0], 0);
    expect(rowRule(l3.drill![0].rows[0].label)).toBe('big OR red');
    expect([or['big red circle'], or['small red square'], or['big blue circle'], or['small yellow triangle']]).toEqual(['fit', 'fit', 'fit', 'not']);
    expect(l3.drill![0].done).toContain('The big red circle fits even though it is big and red.');
    // Brackets: the bracket rule is shown, the rule without brackets is marked, and who fits changes.
    const pair = l4.drill![2];
    expect(pair.rows[0].marks.every((m) => m.given)).toBe(true);
    const [withB, withoutB] = [answers(pair, 0), answers(pair, 1)];
    const changed = Object.keys(withB).filter((k) => withB[k] !== withoutB[k]);
    expect(changed).toEqual(['small red square', 'big blue triangle', 'small yellow circle']);
    expect(pair.done).toContain('The small red square, the big blue triangle, and the small yellow circle fit “NOT (blue AND small).”');
    // The inside first: the shown inside row of NOT (blue AND small), then the whole rule, which flips every card.
    const first = l4.drill![1];
    expect(rowRule(first.rows[0].label)).toBe('blue AND small');
    expect(answers(first, 1)).toEqual(withB);
    for (const k of Object.keys(withB)) expect(answers(first, 0)[k] === 'fit', k).toBe(withB[k] === 'not');
    // NOT (blue OR small) marks the cards as NOT blue AND NOT small does, and the two rules mean the same.
    expect(answers(l4.drill![3], 1)).toEqual(withoutB);
    expect(sameMeaning(E.notBlueOrSmall, E.notBlueAndNotSmall)).toBe(true);
    // The switch: NOT blue OR NOT small, on the switch card's picture, marks the cards as NOT (blue AND small) does.
    const sw = l4.drill![4];
    expect(sw.scene).toBe(l4.ideas[6].scene);
    expect(rowRule(sw.rows[0].label)).toBe('NOT blue OR NOT small');
    expect(answers(sw, 0)).toEqual(withB);
    expect(sw.done).toBe('Right. Only the small blue triangle is left out. “NOT blue OR NOT small” fits the same cards as “NOT (blue AND small).”');
    // Guess the rule: “blue OR big” is shown kept and “blue” ruled out; the learner tests “a circle OR big,” and only a
    // no card it fits, the small yellow circle, rules it out.
    const [kept, out, mine] = l5.drill![1].rows;
    expect(kept.marks.every((m) => m.given) && out.marks.every((m) => m.given)).toBe(true);
    expect([kept.marks.at(-1)!.answer, out.marks.at(-1)!.answer]).toEqual(['keep', 'reject']);
    expect(mine.marks.some((m) => m.given)).toBe(false);
    expect(mine.marks.at(-1)!.answer).toBe('reject');
    expect(mine.marks.at(-1)!.why.keep).toBe('The small yellow circle got a no, but it fits “a circle OR big.” One card that does not match is enough to rule it out.');
    for (const m of mine.marks) if (m.thing) expect(m.thing.mark, m.id).toBeDefined();
    for (const m of l1.drill![0].rows[0].marks) expect(m.thing!.mark, m.id).toBeUndefined();
  });

  it('Do: every wrong option names that card and that rule, and every claim in it is true', () => {
    let n = 0;
    for (const l of stop2.lessons) {
      for (const st of l.drill!) {
        for (const r of st.rows) {
          const words = rowRule(r.label);
          const rule = parse(words);
          for (const m of r.marks) {
            if (m.given) continue;
            for (const o of m.options) {
              if (o.id === m.answer) continue;
              const why = m.why[o.id];
              expect(why, `${m.id} ${o.id}`).toBeTruthy();
              // It names the rule, or the part of it that decides this card.
              const quoted = [...why.matchAll(/“([^”]+?)[.,]?”/g)].map((q) => render(parse(q[1])));
              expect(quoted.length, why).toBeGreaterThan(0);
              for (const q of quoted) expect(partsOf(rule), why).toContain(q);
              if (m.thing) {
                expect(why.startsWith(`The ${m.label.toLowerCase()} `), why).toBe(true);
                for (const cl of claims(why)) expect(fitsByWords(words, cl.card), why).toBe(cl.fits);
                expect(cardClaimProblems({ id: m.id, skill: 's2.drill' } as Item, { text: why, rule, card: parseCard(m.label), where: m.id }).problems).toEqual([]);
              } else if (m.options.some((x) => x.id === 'yes')) {
                // Match or No match: the card, its mark, and whether the rule fits it, each true.
                const mm = /^The ((?:big|small) \w+ \w+) got a (yes|no), (and|but) it (fits|does not fit) “(.+?)\.”/.exec(why);
                expect(mm, why).toBeTruthy();
                const card = parseCard(mm![1])!;
                expect(fitsByWords(words, card), why).toBe(mm![4] === 'fits');
                expect(mm![3], why).toBe((mm![4] === 'fits') === (mm![2] === 'yes') ? 'and' : 'but');
              } else expect(why).toMatch(/^The (?:big|small) \w+ \w+ got a (?:yes|no), but it/);
              n++;
            }
          }
        }
      }
    }
    // Every mark to tap: NOT 12, AND 6, OR 6, brackets 32, guess the rule 15 (6 on the mark board, 7 on the rule test,
    // 2 for the new card).
    expect(n).toBe(71);
    // The message for one wrong tap, as the board shows it: the first mismatch in plain words.
    const st = stop2.lessons[2].drill![0];
    const right = Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
    const both = marksToTap(st).find((m) => m.label === 'Big red circle')!;
    expect(checkDrill(st, { ...right, [both.id]: 'not' }).message).toBe('The big red circle is big, and it is red. Both parts of “big OR red” are true. OR takes a card that fits both parts, so it fits.');
  });

  it('Do: board text reads at a 6th-grade level, with curly quotes, rules that read back, and “both” always “both parts”', () => {
    for (const l of stop2.lessons) {
      const text = l.drill!.flatMap(boardText);
      expect(fkGrade(text.join('\n')), l.id).toBeLessThanOrEqual(READING.maxGrade);
      for (const t of text) {
        expect(longestSentence(t).words, t).toBeLessThanOrEqual(READING.maxSentenceWords);
        expect(t).not.toMatch(/["']/);
        expect(t).not.toMatch(/”\./);
        expect(t).not.toMatch(/the opposite|that row/i);
        expect(t, t).not.toMatch(/\bboth\b(?! parts)/i);
        for (const q of t.matchAll(/“([^”]+?)[.,]?”/g)) expect(() => parse(q[1]), t).not.toThrow();
        // A two-part rule inside a sentence is in quotes (a row label "Rule: …" or "Inside: …" is not a sentence).
        if (!/^(?:Rule|Inside): /.test(t)) expect(t.replace(/“.+?”/g, ''), t).not.toMatch(/\b(?:red|blue|yellow|big|small|circle|square|triangle|\)) (?:AND|OR) /);
      }
    }
  });

  it('Quiz try 1: a twin rule of the lesson’s family on the worked example’s six cards, in a new order, in plain cards', () => {
    const decks = [EXAMPLES.sample, EXAMPLES.and, EXAMPLES.or, EXAMPLES.brackets, EXAMPLES.guess];
    const shownRules = (l: (typeof stop2.lessons)[number]) => [
      ...l.ideas.flatMap((c) => (c.scene?.kind === 'things' && c.scene.things.every((t) => t.mark) ? [c.scene.things.map((t) => t.mark === 'yes')] : [])),
    ];
    stop2.lessons.forEach((l, k) => {
      const orders = new Set<string>();
      const rules = new Set<string>();
      for (let seed = 1; seed <= 60; seed++) {
        const first = l.practice(createRng(seed))[0];
        const cards = first.kind === 'tapall' ? first.things : sceneThings(first);
        expect(cards.map(cardName).sort(), `${l.id} seed ${seed}`).toEqual(decks[k].map(cardName).sort());
        expect(cards.map((t) => t.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
        expect(skinOf(first), first.id).toBe('card');
        expect(first.workFirst).toBeUndefined();
        orders.add(cards.map(cardName).join());
        const rule = first.kind === 'choose' && first.skill === 's2.guess-rule' ? parse(rightLabel(first)) : ruleIn(first.prompt);
        rules.add(render(rule));
        expect(TAUGHT[l.id], `${first.id}: ${render(rule)}`).toContain(familyOf(rule));
        // Its marks on the deck differ from every rule the key ideas and the boards already marked there.
        const marks = decks[k].map((c) => evaluate(rule, c));
        for (const shown of shownRules(l)) expect(marks, `${l.id} ${render(rule)}`).not.toEqual(shown);
        for (const st of l.drill!) for (const r of st.rows) expect(render(rule)).not.toBe(rowRule(r.label));
      }
      expect(orders.size, l.id).toBeGreaterThan(10);
      expect(rules.size, l.id).toBeGreaterThan(1);
    });
    expect(TWINS.not.map((f) => render(f)).sort()).toEqual(['NOT a triangle', 'NOT yellow']);
    for (const pool of Object.values(TWINS)) expect(pool.length).toBeGreaterThanOrEqual(2);
  });

  it('Quiz: practice, the check, the Arcade, new examples and the notebook use only the families each lesson taught', () => {
    const problems: string[] = [];
    let n = 0;
    const look = (it: Item, where: string) => {
      problems.push(...familyProblems(it, where));
      n++;
    };
    for (let seed = 1; seed <= 200; seed++) {
      for (const l of stop2.lessons) {
        const items = l.practice(createRng(seed));
        items.forEach((it) => look(it, `practice seed ${seed}`));
        if (seed <= 25) for (const it of items) freshCheckSet(stop2, it, seed).forEach((x) => look(x, `fresh after ${it.id} seed ${seed}`));
      }
      stop2.check!(createRng(seed)).forEach((it) => look(it, `check seed ${seed}`));
      look(stop2.practice!(createRng(seed)), `arcade seed ${seed}`);
      look(stop2.practice!(createRng(seed + 1000)), `arcade seed ${seed + 1000}`);
    }
    const skills = new Map(stop2.lessons.flatMap((l) => l.practice(createRng(1)).concat(l.practice(createRng(2))).map((it) => [it.skill, it.lesson] as const)));
    for (const [skill, lesson] of skills) {
      for (let seed = 1; seed <= 20; seed++) {
        const it = freshItem(stop2, { skill, stop: 2, lesson, missed: '2026-10-01', fixes: 0, due: '2026-10-01' }, seed);
        expect(it?.skill, skill).toBe(skill);
        if (it) look(it, `notebook ${skill} seed ${seed}`);
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
    expect(n).toBeGreaterThan(5000);
    // Guess the rule draws its secret rule and every wrong rule from the taught pool: no NOT inside a two-part rule.
    expect(TAUGHT_POOL.every((f) => ['one', 'not-x', 'and', 'or'].includes(familyOf(f)))).toBe(true);
    expect(TAUGHT_POOL.length).toBe(RULE_POOL.filter((f) => ['one', 'not-x', 'and', 'or'].includes(familyOf(f))).length);
    expect(RULE_POOL.some((f) => familyOf(f) === 'not-one-part' || (f.op === 'and' && f.b.op === 'not'))).toBe(true);
    // The words-only items come last in their packs, after the pictures.
    for (let seed = 1; seed <= 20; seed++) {
      expect(stop2.lessons[0].practice(createRng(seed)).at(-1)!.skill).toBe('s2.not-means');
      expect(stop2.lessons[3].practice(createRng(seed)).at(-1)!.skill).toBe('s2.same-meaning');
    }
  });

  it('makeRuleGuess takes its wrong rules from the pool it is given, and a fixed deck in a new order', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const g = makeRuleGuess(createRng(seed), TAUGHT_POOL, { distractors: 2, minCards: 6, maxCards: 9, pool: TAUGHT_POOL });
      for (const d of g.distractors) expect(TAUGHT_POOL.some((f) => render(f) === render(d))).toBe(true);
      const fixed = makeRuleGuess(createRng(seed), TWINS.guess, { distractors: 2, minCards: 6, maxCards: 6, pool: TAUGHT_POOL, deck: EXAMPLES.guess });
      expect(fixed.things.map(cardName).sort()).toEqual(EXAMPLES.guess.map(cardName).sort());
      expect(fixed.things.every((t) => t.mark === (evaluate(fixed.target, t) ? 'yes' : 'no'))).toBe(true);
    }
  });

  it('every hint shows one card already worked through, re-checked from its words, and it is never the answer', () => {
    let n = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const items = [...stop2.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop2.check!(createRng(seed)), stop2.practice!(createRng(seed))];
      for (const it of items) {
        expect(it.hint, it.id).toBeTruthy();
        const hc = it.hintCase!;
        expect(hc, `${it.id}: the hint shows a marked case`).toBeDefined();
        expect(hc.truths!.length, it.id).toBeGreaterThanOrEqual(2);
        expect(hc.note, it.id).toBeTruthy();
        expect(caseProblems(it, hc, 'hint')).toEqual([]);
        expect(it.hint, it.id).toMatch(/Here is (?:one|a different) \w+, checked for you\.$/);
        for (const t of [hc.label, hc.note ?? '', ...hc.truths!.map((x) => x.who)]) {
          expect(t).not.toMatch(/["']/);
          expect(t).not.toMatch(/”\./);
        }
        const card = cardOfLabel(hc.label)!;
        const scene = it.kind === 'tapall' ? it.things : sceneThings(it);
        switch (it.skill) {
          case 's2.guess-rule': {
            // A card that rules out a wrong choice: its mark and that rule disagree.
            if (it.kind !== 'choose') throw new Error('guess is a choose item');
            const fits = /^It fits “(.+)”$/.exec(hc.truths![1].who)![1];
            expect(fits).not.toBe(rightLabel(it));
            expect(it.choices.map((c) => c.label)).toContain(fits);
            expect(hc.truths![0].value).not.toBe(hc.truths![1].value);
            break;
          }
          case 's2.same-meaning':
            // The question's rule is marked; no choice is.
            expect(hc.truths!.some((t) => /your answer|right answer/.test(t.who)), it.id).toBe(false);
            break;
          case 's2.or-yesno': case 's2.bracket-yesno':
            expect(cardName(card), it.id).not.toBe(cardName(scene[0]));
            break;
          case 's2.and-pick': case 's2.or-pick':
            if (it.kind !== 'choose') throw new Error('pick is a choose item');
            expect(cardName(card), it.id).not.toBe(rightLabel(it).toLowerCase());
            expect(scene.some((t) => cardName(t) === cardName(card)), it.id).toBe(true);
            break;
          default: {
            // Tap-all, count and NOT-groups items: a card the rule leaves out, so the hint hands over none of the answer.
            const rule = ruleIn(it.prompt);
            expect(evaluate(rule, card), `${it.id} ${hc.label}`).toBe(false);
            if (scene.length) expect(scene.some((t) => cardName(t) === cardName(card)), it.id).toBe(true);
          }
        }
        n++;
      }
    }
    expect(n).toBeGreaterThan(1000);
  });

  it('a new example after a miss is never try 1’s twin again: a new deck or a new rule machine of the same family', () => {
    const decks = new Set(Object.values(EXAMPLES).map((d) => d.map(cardName).sort().join()));
    const onSeeDeck = (it: Item) => {
      const cards = it.kind === 'tapall' ? it.things : sceneThings(it);
      return cards.length === 6 && decks.has(cards.map(cardName).sort().join());
    };
    let n = 0, twins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const l of stop2.lessons) {
        l.practice(createRng(seed)).forEach((it, i) => {
          if (onSeeDeck(it)) twins++;
          // The seed the lesson gives a new example: the lesson's seed, the try, and the round (LessonRunner, LearnItem).
          const set = freshCheckSet(stop2, it, seed + (i + 1) * 7 + 15485863, [], 1);
          expect(set[0].skill, it.id).toBe(it.skill);
          for (const x of set) expect(onSeeDeck(x), `${it.id} -> ${x.prompt}`).toBe(false);
          n += set.length;
        });
      }
    }
    expect(twins).toBe(40 * 5);
    expect(n).toBeGreaterThan(800);
  });

  it('same meaning: the wrong choices are the switch without the move, and the move without the switch', () => {
    let n = 0;
    for (const it of ITEMS) {
      if (it.kind !== 'choose' || it.skill !== 's2.same-meaning') continue;
      const given = ruleIn(it.prompt);
      const wrong = it.choices.filter((c) => c.id !== it.answer).map((c) => parse(c.label));
      expect(wrong.length, it.id).toBe(2);
      // One NOT ( … ) with the other joining word inside, and one rule with a NOT on each part.
      expect(wrong.filter((f) => f.op === 'not').length, it.id).toBe(1);
      expect(wrong.filter((f) => familyOf(f) === 'not-and-not' || familyOf(f) === 'not-or-not').length, it.id).toBe(1);
      for (const f of wrong) expect(sameMeaning(f, given), `${it.id} ${render(f)}`).toBe(false);
      n++;
    }
    expect(n).toBeGreaterThan(50);
  });

  it('pass: the boards first (marked by taps), then 3 right on the first try with no hint, with the trap where a lesson has one', () => {
    for (const l of stop2.lessons) {
      expect(l.drill!.length, l.id).toBeGreaterThan(0);
      if (l.id === 's2.l4' || l.id === 's2.l5') continue;
      expect(l.pass, l.id).toBeUndefined();
      for (const it of l.practice(createRng(1))) expect(it.tags, it.id).toBeUndefined();
    }
    // Lesson 4: a rule with AND inside the brackets and one with OR, both right on the first try.
    expect(stop2.lessons[3].pass).toEqual({ firstTry: 3, include: [{ tag: 'inside-and', label: 'a rule with AND inside the brackets' }, { tag: 'inside-or', label: 'a rule with OR inside the brackets' }] });
    // Lesson 5: a puzzle where only a no card rules out a wrong rule.
    expect(stop2.lessons[4].pass).toEqual({ firstTry: 3, include: [{ tag: 'no-card-rules-out', label: 'a puzzle where only a no card rules out a rule' }] });
  });
});

// ---------- distinctions taught apart (docs/CONTENT_GUIDE.md, "Distinctions") ----------
//
// Lesson 4: whether a card fits the inside of the brackets vs whether it fits the whole rule. Lesson 5: the machine's
// mark vs whether the tested rule fits the card (and what a match is), and a kept rule vs a proved one. Every truth on a
// contrast panel and every mark on a board is re-solved here from the words the learner sees (fitsByWords), never
// from the rule engine.

describe('stop 2: distinctions taught apart', () => {
  const [, , , l4, l5] = stop2.lessons;
  const board = (l: (typeof stop2.lessons)[number], id: string) => l.drill!.find((st) => st.id === id)!;
  const contrastOf = (sc: Scene | undefined) => {
    if (sc?.kind !== 'contrast') throw new Error('not a contrast picture');
    return sc;
  };
  const right = (st: DrillStep) => Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
  /** A row's card marks set to what another row says on the same cards. */
  const like = (row: DrillRow, model: DrillRow) =>
    Object.fromEntries(row.marks.filter((m) => m.thing).map((m) => [m.id, model.marks.find((x) => x.thing && cardName(x.thing) === cardName(m.thing!))!.answer]));
  const flip = (v: string) => (v === 'fit' ? 'not' : v === 'not' ? 'fit' : v === 'yes' ? 'no' : v === 'no' ? 'yes' : v === 'keep' ? 'reject' : 'keep');
  const SYMBOLS = /[=≠✓✗→&]/;
  /** Every new player-facing text: reading level, curly quotes, no symbols. */
  const wordsOk = (texts: string[], what: string) => {
    const all = texts.filter(Boolean);
    expect(all.length, what).toBeGreaterThan(0);
    expect(fkGrade(all.join('\n')), `${what} grade`).toBeLessThanOrEqual(READING.maxGrade);
    for (const t of all) {
      expect(longestSentence(t).words, t).toBeLessThanOrEqual(READING.maxSentenceWords);
      expect(t, t).not.toMatch(/["']/);
      expect(t, t).not.toMatch(SYMBOLS);
      expect(t, t).not.toMatch(/\bWrong\b/);
    }
  };

  it('lesson 4 declares inside vs whole and teaches it with a contrast card on one card, then a board right after it', () => {
    expect(l4.distinctions).toEqual([{ id: 'inside-vs-whole', a: 'Does the card fit the inside of the brackets?', b: 'Does it fit the whole rule, after the NOT?' }]);
    const k = l4.ideas.findIndex((c) => c.distinction === 'inside-vs-whole');
    expect(k).toBe(2);
    const sc = contrastOf(l4.ideas[k].scene);
    const [inside, whole] = sc.pairs;
    // The same card in both panels; the inside panel's rule is the whole rule's brackets.
    expect(inside.things!.map(cardName)).toEqual(whole.things!.map(cardName));
    const c = inside.things![0];
    expect(cardName(c)).toBe('small red square');
    expect(`NOT (${inside.says})`).toBe(whole.says);
    for (const p of sc.pairs) {
      expect(p.truth, p.says).toBe(fitsByWords(p.says, c));
      expect(cardClaimProblems({ id: 'contrast', skill: 's2.l4' } as Item, { text: p.because, rule: parse(p.says), card: c, where: p.who }).problems).toEqual([]);
      expect(p.because).toContain(p.truth ? 'so it fits' : 'so it does not fit');
    }
    expect(inside.truth).toBe(!whole.truth);
    expect(sc.words).toEqual({ worldTag: 'The card', saysWord: 'rule:', truth: 'Fits', untruth: 'Not' });
    expect(sc.ask!.q).toBe('Did the card change?');
    expect(sc.ask!.a).toBe('No. Only the question changed. The small red square does not fit the inside, but it fits the whole rule.');
    // The board right after it marks the two questions on that card.
    const st = board(l4, 's2.l4-two-questions');
    expect(st.afterCard).toBe(k);
    expect(st.scene).toBe(l4.ideas[k].scene);
    expect(st.distinction).toBe('inside-vs-whole');
    expect(st.rows.map((r) => rowRule(r.label))).toEqual([inside.says, whole.says]);
    expect(st.rows.map((r) => r.marks[0].answer)).toEqual(sc.pairs.map((p) => (p.truth ? 'fit' : 'not')));
    // The inside comes first as its own picture: the card before the contrast marks the inside group.
    expect(l4.ideas[1].scene).toEqual(exampleScene(EXAMPLES.brackets, parse(inside.says)));
  });

  it('lesson 4 keeps the inside on screen: shown on the full board, marked on the OR board, gone on the switch', () => {
    // Each board sits right after its card, on that card's picture.
    expect(l4.drill!.map((st) => [st.id, st.afterCard])).toEqual([
      ['s2.l4-two-questions', 2], ['s2.l4-do', 3], ['s2.l4-do-pair', 4], ['s2.l4-do-or', 5], ['s2.l4-do-switch', undefined],
    ]);
    for (const st of l4.drill!) if (st.afterCard !== undefined) expect(st.scene, st.id).toBe(l4.ideas[st.afterCard].scene);
    const full = board(l4, 's2.l4-do');
    expect(full.scaffold).toBe('full');
    const [inRow, allRow] = full.rows;
    expect(inRow.label).toBe('Inside: blue AND small');
    expect(inRow.marks.every((m) => m.given)).toBe(true);
    expect(allRow.marks.some((m) => m.given)).toBe(false);
    expect(allRow.needs).toBe('Do the inside first, then flip it. NOT takes every card that does not fit the inside.');
    expect(inRow.needs).toBe('“blue AND small” needs a card that is blue and also small.');
    // The facts under each card are true of that card: its two features, and whether it fits the inside.
    for (const m of inRow.marks) {
      expect(m.compare!.says).toBe('The rule is “blue AND small.”');
      expect(cardClaimProblems({ id: m.id, skill: 's2.drill' } as Item, { text: m.compare!.world, rule: parse('blue AND small'), card: parseCard(m.label), where: m.id }).problems).toEqual([]);
    }
    for (const m of allRow.marks) {
      const fitsIn = fitsByWords('blue AND small', parseCard(m.label)!);
      expect(m.compare!.world).toBe(`It ${fitsIn ? 'fits' : 'does not fit'} the inside, “blue AND small.”`);
      expect(m.answer).toBe(fitsIn ? 'not' : 'fit');
    }
    // A shown inside mark reads its comparison as "It fits the inside." / "It does not fit the inside."
    expect([full.words!.fit, full.words!.unfit]).toEqual(['It fits the inside.', 'It does not fit the inside.']);
    // The OR board: the learner marks the inside row too. The switch: light, and no inside row.
    const or = board(l4, 's2.l4-do-or');
    expect(or.rows.map((r) => r.label)).toEqual(['Inside: blue OR small', 'Rule: NOT (blue OR small)']);
    expect(or.rows.every((r) => r.marks.every((m) => !m.given))).toBe(true);
    expect(or.scaffold).toBeUndefined();
    const sw = board(l4, 's2.l4-do-switch');
    expect(sw.scaffold).toBeUndefined();
    expect(sw.rows.some((r) => r.label.startsWith('Inside'))).toBe(false);
  });

  it('lesson 4 mix-ups: the whole rule marked like its inside is named, and right marks or a one-card slip are not', () => {
    const text = 'You may be treating “fits the inside” and “fits the whole rule” as the same thing.';
    // The two questions: the whole rule copied from the inside, and the inside copied from the whole rule.
    const two = board(l4, 's2.l4-two-questions');
    const [mIn, mAll] = two.rows.map((r) => r.marks[0]);
    for (const picks of [{ [mIn.id]: mIn.answer, [mAll.id]: mIn.answer }, { [mIn.id]: mAll.answer, [mAll.id]: mAll.answer }]) {
      const r = checkDrill(two, picks);
      expect(r.diagnosis).toMatch(/inside-as-whole|whole-as-inside/);
      expect(r.message.startsWith(text)).toBe(true);
    }
    // The full board: every card of the whole rule marked as the shown inside row.
    const full = board(l4, 's2.l4-do');
    const copy = like(full.rows[1], full.rows[0]);
    const got = checkDrill(full, copy);
    expect(got.diagnosis).toBe('inside-as-whole');
    expect(got.message.startsWith(text)).toBe(true);
    // Then the first wrong card's own words: the inside, then the flip.
    expect(got.message).toContain('So the inside, “blue AND small,” is false. NOT flips false to true, so it fits “NOT (blue AND small).”');
    // The OR board: the inside marked right, then copied into the whole rule.
    const or = board(l4, 's2.l4-do-or');
    expect(checkDrill(or, { ...right(or), ...like(or.rows[1], or.rows[0]) }).diagnosis).toBe('inside-as-whole');
    // Without brackets, marked like the bracket rule: named as the brackets mix-up.
    const pair = board(l4, 's2.l4-do-pair');
    const dropped = checkDrill(pair, { ...right(pair), ...like(pair.rows[1], pair.rows[0]) });
    expect(dropped.diagnosis).toBe('brackets-dropped');
    expect(dropped.message.startsWith('You may be treating “NOT (blue AND small)” and “NOT blue AND NOT small” as the same rule.')).toBe(true);
    // Right marks pass with no mix-up; one wrong card is a slip, named by its own words only.
    for (const st of [full, or, pair]) {
      expect(checkDrill(st, right(st))).toMatchObject({ done: true });
      const m = marksToTap(st).at(-1)!;
      const slip = checkDrill(st, { ...right(st), [m.id]: flip(m.answer) });
      expect(slip.diagnosis, st.id).toBeUndefined();
      expect(slip.message, st.id).toBe(m.why[flip(m.answer)]);
    }
  });

  it('lesson 5 declares mark vs Fits or Not and kept vs proved, each taught with a contrast card and a board right after it', () => {
    expect(l5.distinctions!.map((d) => d.id)).toEqual(['mark-vs-fits', 'kept-vs-proved']);
    expect(l5.distinctions!.every((d) => !d.taughtIn)).toBe(true);
    const deck = l5.ideas[4].scene!.kind === 'things' ? l5.ideas[4].scene!.things : [];
    expect(deck.length).toBe(6);
    // Mark vs Fits or Not: the same card with the same mark, under two rules. Fits or Not changes; the mark does not.
    const k = l5.ideas.findIndex((c) => c.distinction === 'mark-vs-fits');
    // After "One card can rule it out", so "rules out" on its picture is a word already taught; right before the worked example.
    expect(k).toBe(3);
    expect(l5.ideas.findIndex((c) => c.title === 'One card can rule it out')).toBeLessThan(k);
    const sc = contrastOf(l5.ideas[k].scene);
    const cards = sc.pairs.map((p) => p.things![0]);
    expect(cards.map((t) => `${cardName(t)} ${t.mark}`)).toEqual(['small blue circle yes', 'small blue circle yes']);
    expect(deck.find((t) => cardName(t) === 'small blue circle')!.mark).toBe('yes');
    expect(sc.pairs.map((p) => p.says)).toEqual(['blue OR big', 'big']);
    for (const p of sc.pairs) {
      const t = p.things![0];
      const fits = fitsByWords(p.says, t);
      expect(p.truth, p.says).toBe(fits);
      const match = fits === (t.mark === 'yes');
      expect(p.then, p.says).toBe(match
        ? `Its mark is ${t.mark}, and the rule says ${fits ? 'Fits' : 'Not'}. A match, so this card does not rule it out.`
        : `Its mark is ${t.mark}, but the rule says ${fits ? 'Fits' : 'Not'}. No match, so this card rules out “${p.says}.”`);
      expect(cardClaimProblems({ id: 'contrast', skill: 's2.l5' } as Item, { text: p.because, rule: parse(p.says), card: t, where: p.says }).problems).toEqual([]);
    }
    expect(sc.pairs[0].truth).not.toBe(sc.pairs[1].truth);
    expect(sc.ask!.q).toBe('Did the mark change?');
    expect(sc.words).toEqual({ worldTag: 'The card', saysWord: 'you test:', truth: 'Fits', untruth: 'Not' });
    const markBoard = board(l5, 's2.l5-two-things');
    expect([markBoard.afterCard, markBoard.distinction]).toEqual([k, 'mark-vs-fits']);
    expect(markBoard.scene).toBe(l5.ideas[k].scene);
    // Kept vs proved: two rules that each match all six marks, and a new card that tells them apart.
    const kk = l5.ideas.findIndex((c) => c.distinction === 'kept-vs-proved');
    expect(kk).toBe(5);
    const kept = contrastOf(l5.ideas[kk].scene);
    expect(kept.words).toEqual({ worldTag: 'The marks', saysWord: 'you test:', truth: 'Kept for now', untruth: 'Ruled out' });
    const matchAll = (w: string) => deck.every((t) => fitsByWords(w, t) === (t.mark === 'yes'));
    for (const p of kept.pairs) {
      expect(p.things!.map((t) => `${cardName(t)} ${t.mark}`)).toEqual(deck.map((t) => `${cardName(t)} ${t.mark}`));
      expect(p.truth, p.says).toBe(matchAll(p.says));
      expect(p.truth).toBe(true);
      const brc = parseCard('big red circle')!;
      expect(p.then).toBe(`A new card, the big red circle, ${fitsByWords(p.says, brc) ? 'fits' : 'does not fit'} this rule.`);
    }
    expect(fitsByWords(kept.pairs[0].says, parseCard('big red circle')!)).not.toBe(fitsByWords(kept.pairs[1].says, parseCard('big red circle')!));
    // "Two rules match all six marks": of the rules the lessons teach, exactly these two do.
    expect(TAUGHT_POOL.filter((f) => matchAll(render(f))).map((f) => render(f)).sort()).toEqual(kept.pairs.map((p) => p.says).sort());
    expect(l5.ideas[kk].body.join(' ')).toContain('Two rules match all six marks.');
    const keptBoard = board(l5, 's2.l5-kept');
    expect([keptBoard.afterCard, keptBoard.distinction]).toEqual([kk, 'kept-vs-proved']);
    expect(keptBoard.scene).toBe(l5.ideas[kk].scene);
    expect(keptBoard.rows.map((r) => [rowRule(r.label), r.marks[0].answer])).toEqual(kept.pairs.map((p) => [p.says, fitsByWords(p.says, parseCard('big red circle')!) ? 'fit' : 'not']));
  });

  it('lesson 5’s rule test shows the mark, what the rule says and the match, card by card, then the learner tests a rule only a no card rules out', () => {
    const st = board(l5, 's2.l5-do');
    expect([st.afterCard, st.scaffold, st.distinction]).toEqual([4, 'full', 'mark-vs-fits']);
    expect(st.scene).toBe(l5.ideas[4].scene);
    const deck = st.scene!.kind === 'things' ? st.scene!.things : [];
    const [kept, out, mine] = st.rows;
    expect([kept, out, mine].map((r) => rowRule(r.label))).toEqual(['blue OR big', 'blue', 'a circle OR big']);
    // The shown tests: a Match or No match per card, re-solved from the rule's words and the picture's marks.
    for (const r of [kept, out]) {
      for (const m of r.marks.filter((x) => x.thing)) {
        const t = deck.find((x) => cardName(x) === cardName(m.thing!))!;
        expect(m.thing!.mark).toBe(t.mark);
        expect(m.answer, m.id).toBe(fitsByWords(rowRule(r.label), t) === (t.mark === 'yes') ? 'yes' : 'no');
      }
    }
    // The ruled-out test shows its comparison in words under each card: the mark, then what the rule says.
    for (const m of out.marks.filter((x) => x.thing)) {
      expect(m.compare!.says).toBe(m.thing!.mark === 'yes' ? 'Yes. It got through.' : 'No. It was stopped.');
      const fits = fitsByWords('blue', m.thing!);
      expect(m.compare!.world).toBe(`It is ${fits ? '' : 'not '}blue, so it ${fits ? 'fits' : 'does not fit'} “blue.”`);
    }
    expect([st.words!.says, st.words!.world, st.words!.so]).toEqual(['Mark', 'Rule', 'So']);
    expect([st.words!.fit, st.words!.unfit]).toEqual(['A match: the mark and the rule agree.', 'No match: the mark and the rule do not agree.']);
    // The learner's test: the mark stays in view, but the rule decides Fits or Not.
    for (const m of mine.marks.filter((x) => x.thing)) {
      expect(m.compare).toEqual({ says: m.thing!.mark === 'yes' ? 'Yes. It got through.' : 'No. It was stopped.', world: 'Does it fit “a circle OR big”?' });
      expect(m.answer).toBe(fitsByWords('a circle OR big', m.thing!) ? 'fit' : 'not');
    }
    expect(st.words!.ask).toBe('Fits or Not? Ask the rule, not the mark.');
    expect(mine.needs).toBe('Every yes card must fit, and every no card must not fit. One card that does not match rules the rule out.');
    // Only no cards rule it out, so copying the marks into Fits and Not would keep it.
    const misses = deck.filter((t) => fitsByWords('a circle OR big', t) !== (t.mark === 'yes'));
    expect(misses.map((t) => `${cardName(t)} ${t.mark}`)).toEqual(['small yellow circle no']);
    // Keep for now, never just Keep: a rule no card rules out is still possible, not proved.
    expect(KEEP_OR_RULE_OUT.map((o) => o.label)).toEqual(['Keep for now', 'Rule out']);
    for (const r of st.rows) expect(r.marks.at(-1)!.options.map((o) => o.label)).toEqual(['Keep for now', 'Rule out']);
  });

  it('lesson 5 mix-ups fire on the audit’s sample wrong marks, and not on right marks', () => {
    const copied = 'You may be treating “it got a yes” and “it fits the rule” as the same thing.';
    // The rule test's copy goes wrong only on a no card the rule fits, so its words name a no card.
    const copiedNo = 'You may be treating “it got a no” and “it does not fit the rule” as the same thing.';
    // The rule test: every Fits or Not copied from the card's mark, then Keep (every row then looks like a match).
    const st = board(l5, 's2.l5-do');
    const mine = st.rows[2];
    const badges = Object.fromEntries(mine.marks.filter((m) => m.thing).map((m) => [m.id, m.thing!.mark === 'yes' ? 'fit' : 'not']));
    const decide = mine.marks.at(-1)!;
    for (const verdict of ['keep', 'reject', undefined]) {
      const r = checkDrill(st, { ...badges, ...(verdict ? { [decide.id]: verdict } : {}) });
      expect(r.diagnosis, verdict).toBe('copied-mark');
      expect(r.message.startsWith(copiedNo)).toBe(true);
      // Then the card that breaks the copy, in its own words.
      expect(r.message).toContain('The small yellow circle is a circle, and it is not big.');
    }
    // Every Fits or Not right, but kept: the marks were not compared with the rule's answers.
    const verdictOnly = checkDrill(st, { ...right(st), [decide.id]: 'keep' });
    expect(verdictOnly.diagnosis).toBe('verdict-only');
    expect(verdictOnly.message.startsWith('Your Fits and Not marks are right. Now compare each one with the card’s mark.')).toBe(true);
    expect(checkDrill(st, right(st))).toMatchObject({ done: true });
    expect(checkDrill(st, right(st)).diagnosis).toBeUndefined();
    // A one-card slip that is not a copy of the marks (the big red square marked Not) is not named as one.
    const brs = mine.marks.find((m) => m.label === 'Big red square')!;
    expect(checkDrill(st, { ...right(st), [brs.id]: 'not' }).diagnosis).toBeUndefined();
    // The mark board: the yes copied onto a card the rule does not fit; Not read as no match; a right Fits or Not with
    // the wrong match.
    const mb = board(l5, 's2.l5-two-things');
    const [r1, r2, r3] = mb.rows;
    const copiedYes = checkDrill(mb, { ...right(mb), [r2.marks[0].id]: 'fit' });
    expect(copiedYes.diagnosis).toBe('copied-mark');
    // Here the copy goes wrong on a yes card the rule does not fit, so its words name a yes card.
    expect(copiedYes.message.startsWith(copied)).toBe(true);
    const notNoMatch = checkDrill(mb, { ...right(mb), [r3.marks[1].id]: 'no' });
    expect(notNoMatch.diagnosis).toBe('not-as-no-match');
    expect(notNoMatch.message.startsWith('You may be treating “Not” and “no match” as the same thing.')).toBe(true);
    expect(notNoMatch.message).toContain('The small yellow circle got a no, and it does not fit “big.” The mark and the rule agree, so it is a match.');
    expect(checkDrill(mb, { ...right(mb), [r1.marks[1].id]: 'no' }).diagnosis).toBe('verdict-only');
    expect(checkDrill(mb, right(mb))).toMatchObject({ done: true });
    // Kept vs proved: the new card marked the same under the two kept rules.
    const kb = board(l5, 's2.l5-kept');
    const [k1, k2] = kb.rows.map((r) => r.marks[0]);
    for (const v of ['fit', 'not']) {
      const r = checkDrill(kb, { [k1.id]: v, [k2.id]: v });
      expect(r.diagnosis).toMatch(/^kept-as-proved/);
      expect(r.message.startsWith('You may be treating “this rule is kept” and “this is the rule” as the same thing.')).toBe(true);
    }
    expect(checkDrill(kb, right(kb))).toMatchObject({ done: true });
  });

  it('“I’m confused”: one to three questions on every lesson 4 and 5 board and question, each with one right option and a Not sure, and a closing in the lesson’s words', () => {
    const lessonBoards = [...l4.drill!, ...l5.drill!].filter((st) => st.confused);
    expect(lessonBoards.map((st) => st.id)).toEqual(['s2.l4-two-questions', 's2.l4-do', 's2.l4-do-pair', 's2.l4-do-or', 's2.l5-two-things', 's2.l5-do', 's2.l5-kept']);
    // Every question with cards to mark has them; the words-only same-meaning question has no cards and no inside.
    const all = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) => [...l4.practice(createRng(seed)), ...l5.practice(createRng(seed))]);
    for (const it of all) expect(!!it.confused, it.id).toBe(it.skill !== 's2.same-meaning');
    const items = all.filter((it) => it.confused);
    const holders = [...lessonBoards.map((st) => ({ id: st.id, qs: st.confused!, closing: st.words?.closing })), ...items.map((it) => ({ id: it.id, qs: it.confused!, closing: it.scratch?.words?.closing }))];
    for (const h of holders) {
      expect(h.qs.length, h.id).toBeGreaterThanOrEqual(1);
      expect(h.qs.length, h.id).toBeLessThanOrEqual(3);
      for (const q of h.qs) {
        expect(q.options.filter((o) => o.right).length, `${h.id}: ${q.q}`).toBe(1);
        expect(q.options.map((o) => o.label), `${h.id}: ${q.q}`).toContain('Not sure');
        expect(new Set(q.options.map((o) => o.label)).size).toBe(q.options.length);
      }
      // The panel's last line speaks of this lesson, never of signs and tests.
      expect(h.closing, h.id).toBeTruthy();
      expect(h.closing!, h.id).not.toMatch(/\bsign|\btest world/i);
      wordsOk(h.qs.flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]).concat(h.closing!), h.id);
    }
    // A question's own answer is never in its questions: no guess item names a rule, so none names its secret rule.
    for (const it of items.filter((x): x is ChooseItem => x.kind === 'choose' && x.skill === 's2.guess-rule')) {
      const texts = it.confused!.flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]).join(' ');
      expect(texts, it.id).not.toMatch(/“/);
      expect(it.confused!.map((q) => q.q)).toEqual([
        `A ${skinOf(it)} got a yes. You test a rule. Does the yes tell you if it fits that rule?`,
        `A ${skinOf(it)} got a no. The rule you test does not fit it. Is that a match?`,
        'A rule matches every mark you can see. What do you know?',
      ]);
    }
    // A lesson 4 question's confused panel names no card, so it never decides one of its cards.
    for (const it of items.filter((x) => x.lesson === 's2.l4')) {
      expect(it.confused!.flatMap((q) => [q.q, q.teach]).join(' '), it.id).not.toMatch(/(?:big|small) (?:red|blue|yellow) (?:circle|square|triangle)/);
    }
  });

  it('thinking boards: lesson 4 questions offer the inside board, lesson 5 the test board, every mark computed', () => {
    let n = 0;
    for (let seed = 1; seed <= 20; seed++) {
      for (const it of [...l4.practice(createRng(seed)), ...l5.practice(createRng(seed))]) {
        // The words-only same-meaning question has no cards, so no board.
        if (it.skill === 's2.same-meaning') {
          expect(it.scratch, it.id).toBeUndefined();
          continue;
        }
        const sc = it.scratch!;
        expect(sc, it.id).toBeDefined();
        expect(it.workFirst, it.id).toBeUndefined();
        const cards = it.kind === 'tapall' ? it.things : sceneThings(it);
        if (it.lesson === 's2.l4') {
          expect(it.scratchLabel).toBe('the inside board');
          const rule = ruleIn(it.prompt);
          if (rule.op !== 'not') throw new Error('a lesson 4 bracket question has NOT ( … )');
          expect(sc.rows.map((r) => rowRule(r.label))).toEqual([render(rule.a), render(rule)]);
        } else {
          expect(it.scratchLabel).toBe('the test board');
          if (it.kind !== 'choose') throw new Error('guess is a choose item');
          expect(sc.rows.map((r) => rowRule(r.label))).toEqual(it.choices.map((c) => c.label));
        }
        for (const r of sc.rows) {
          const words = rowRule(r.label);
          const marks = r.marks.filter((m) => m.thing);
          expect(marks.map((m) => cardName(m.thing!))).toEqual(cards.map(cardName));
          for (const m of marks) expect(m.answer).toBe(fitsByWords(words, m.thing!) ? 'fit' : 'not');
          const verdict = r.marks.find((m) => !m.thing);
          if (verdict) expect(verdict.answer).toBe(cards.every((t) => fitsByWords(words, t) === (t.mark === 'yes')) ? 'keep' : 'reject');
          n++;
        }
        wordsOk([sc.title, ...sc.body], `${it.id} thinking board`);
      }
    }
    expect(n).toBeGreaterThan(300);
  });

  it('the reworded texts are in place: matches every mark, the other two ruled out, Its mark yes or no, Keep for now, and the why line', () => {
    expect(l5.ideas[4].body.join(' ')).toContain('It matches every mark, so keep it for now.');
    for (const c of l5.ideas) expect(c.body.join(' '), c.title).not.toMatch(/fits every card|✓|✗/);
    let n = 0;
    for (const it of ITEMS) {
      if (it.kind !== 'choose' || it.skill !== 's2.guess-rule') continue;
      const target = rightLabel(it);
      expect(it.explain.startsWith(`Of these three rules, only “${target}” matches every mark.`), it.explain).toBe(true);
      expect(it.explain.endsWith(`The other two are ruled out, so the rule must be “${target}.”`), it.explain).toBe(true);
      // Every case card with a machine mark reads its rows as yes or no: "Its mark: no", never "It got a yes: false".
      const cases = [...(it.teach!.cases ?? []), ...Object.values(it.feedback ?? {}).map((fb) => fb.example!), it.hintCase!];
      for (const c of cases) {
        expect(c.truths![0].who).toBe('Its mark');
        expect(c.words).toEqual({ truth: 'yes', untruth: 'no' });
        expect(c.truths!.some((t) => /got a yes/.test(t.who))).toBe(false);
      }
      expect(it.teach!.terms!.map((t) => t.word)).toEqual(['A mark', 'A match', '“Rule out”']);
      for (const t of it.teach!.terms!) expect(t.meaning).not.toMatch(SYMBOLS);
      n++;
    }
    expect(n).toBeGreaterThan(100);
    expect(S2_WORLD.lessons['s2.l5'].why).toBe('One example that does not match rules a guess out for sure. A guess that matches every example is still possible, but it is not proved.');
  });

  it('mastery: every lesson 4 pack has a rule with AND inside and one with OR; every lesson 5 pack has a puzzle only a no card rules out, and each tag is true', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const four = l4.practice(createRng(seed));
      for (const tag of ['inside-and', 'inside-or']) expect(four.some((it) => it.tags?.includes(tag)), `seed ${seed} ${tag}`).toBe(true);
      for (const it of four) {
        // A tap or yes/no question on NOT ( … ) is tagged by what is inside its brackets; same meaning is not tagged.
        const rule = ruleIn(it.prompt);
        if (it.skill === 's2.same-meaning') expect(it.tags, it.id).toBeUndefined();
        else if (rule.op === 'not' && (rule.a.op === 'and' || rule.a.op === 'or')) expect(it.tags, it.id).toEqual([rule.a.op === 'and' ? 'inside-and' : 'inside-or']);
        else throw new Error(`${it.id}: a lesson 4 question without NOT ( … )`);
      }
      const five = l5.practice(createRng(seed));
      expect(five.some((it) => it.tags?.includes('no-card-rules-out')), `seed ${seed}`).toBe(true);
    }
    // The tag is set exactly when a wrong choice's every mismatch is a no card it fits, re-solved from the words.
    let tagged = 0;
    for (const it of ITEMS) {
      if (it.kind !== 'choose' || it.skill !== 's2.guess-rule') continue;
      const things = sceneThings(it);
      const onlyNo = it.choices.filter((c) => c.id !== it.answer).some((c) => {
        const miss = things.filter((t) => fitsByWords(c.label, t) !== (t.mark === 'yes'));
        return miss.length > 0 && miss.every((t) => t.mark === 'no' && fitsByWords(c.label, t));
      });
      expect(!!it.tags?.includes('no-card-rules-out'), it.id).toBe(onlyNo);
      if (onlyNo) tagged++;
    }
    expect(tagged).toBeGreaterThan(50);
  });

  it('every new text reads at a 6th-grade level, with curly quotes and no symbols', () => {
    for (const l of [l4, l5]) {
      const pictures = l.ideas.flatMap((c) => (c.scene?.kind === 'contrast' ? [...c.scene.pairs.flatMap((p) => [p.world, p.says, p.because, p.then ?? '']), c.scene.ask?.q ?? '', c.scene.ask?.a ?? ''] : []));
      wordsOk([...l.ideas.flatMap((c) => c.body.filter((b) => !b.includes('( )'))), ...pictures], `${l.id} cards and pictures`);
      wordsOk(l.drill!.flatMap((st) => [...(st.misconceptions ?? []).map((m) => m.text), st.words?.closing ?? '', st.words?.ask ?? '', st.words?.fit ?? '', st.words?.unfit ?? '']), `${l.id} mix-ups and board words`);
      for (const d of l.distinctions ?? []) wordsOk([d.a, d.b], `${l.id} ${d.id}`);
    }
  });
});
