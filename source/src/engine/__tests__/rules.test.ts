/**
 * Rule machine engine (stop 2) and the stop 2 content built on it. The content checks re-read every
 * item from its visible text (the rule in the prompt, the cards, the choice labels) and brute-force
 * the answer over the cards, so the words the player sees must agree with the answer key. The last block
 * checks the teaching after a wrong answer the same way: every truth on every card is recomputed.
 */
import { describe, expect, it } from 'vitest';
import { EXAMPLES, EXAMPLE_RULES, exampleScene, stop2 } from '../../content/stop2';
import { explanationFor } from '../../game/explanation';
import { freshCheckSet, looks } from '../fresh';
import { grade } from '../grade';
import { READING, fkGrade, longestSentence } from '../readability';
import { feedbackText, teachStrings } from '../teach';
import {
  ALL_CARDS,
  ALL_FEATURES,
  COLORS,
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
import type { ChooseItem, Item, TapAllItem, TeachCase, Thing } from '../types';

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
      const target = /^Only the rule “(.+?)” fits every (\w+)\./.exec(it.explain);
      if (!target || target[1] !== right[0]?.label) fail(`explain does not name the right rule: ${it.explain}`);
      else if (target[2] !== skinOf(it)) fail(`explain says "${target[2]}" in a ${skinOf(it)} item`);
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
    } else if (t.who === 'It got a yes') {
      const shown = scene.find((x) => cardName(x) === cardName(card));
      if (!shown || !shown.mark) fail('a marked card that is not in the scene');
      else {
        want = shown.mark === 'yes';
        if (c.things?.[0].mark !== shown.mark) fail('the case card shows another mark');
        if (it.kind === 'choose' && evaluate(parse(rightLabel(it)), card) !== want) fail('the mark is not the secret rule’s');
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
        return [w.op === given.a.op && w.a.op === 'not' && w.b.op === 'not' ? 'keeps-join-inside' : 'not-on-one-part'];
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
    let seen = 0;
    for (const it of ITEMS) {
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
    let same = 0;
    const esc = (s: string) => s.replace(/[()]/g, '\\$&');
    for (const it of ITEMS) {
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
});
