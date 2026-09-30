/**
 * Rule machine engine (stop 2) and the stop 2 content built on it. The content checks re-read every
 * item from its visible text (the rule in the prompt, the cards, the choice labels) and brute-force
 * the answer over the cards, so the words the player sees must agree with the answer key.
 */
import { describe, expect, it } from 'vitest';
import { EXAMPLES, EXAMPLE_RULES, exampleScene, stop2 } from '../../content/stop2';
import {
  ALL_CARDS,
  ALL_FEATURES,
  COLORS,
  LITERALS,
  RULE_POOL,
  SHAPES,
  SIZES,
  and,
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
  sameMeaning,
  shapeIs,
  sizeIs,
  withoutBrackets,
} from '../puzzles/rules';
import type { Card, Formula } from '../puzzles/rules';
import { createRng } from '../rng';
import type { Rng } from '../rng';
import type { ChooseItem, Item, TapAllItem, Thing } from '../types';

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
      const xor = it.diagnose?.find((d) => key(d.ids) === key(pickIds(rule, it.things, 'orExclusive')));
      if (!xor || !xor.message.includes('In logic, OR includes both.')) fail('missing the exclusive-OR diagnose');
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
      for (const [cid, msg] of Object.entries(it.whyWrong ?? {})) {
        const m = /^Think of a (.+?)\./.exec(msg);
        const c = m && parseCard(m[1]);
        const w = parse(it.choices.find((x) => x.id === cid)!.label);
        if (!c || evaluate(w, c) === evaluate(given, c)) fail(`whyWrong card does not tell ${render(w)} apart`);
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
      const wantFit = !/does NOT|do they NOT|does it NOT|does he NOT|does she NOT|leave out/.test(it.prompt.split(/[.?] /).pop()!);
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

