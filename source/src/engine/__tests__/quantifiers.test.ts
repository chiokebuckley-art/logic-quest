/**
 * Stop 9 · All, Some, None (id s8). Every answer is worked out again here by counting cards feature by feature, without
 * calling the statement engine that set it: a card is in a group when its feature has the group's value, and a sentence
 * is true by how many cards sit in each part of the rings. Lesson 5 (two givens, one picture) is worked out again on
 * every set of up to three real cards, not on the engine's placements; lesson 6 (every and some) on the table of who is
 * friends with whom, not on the engine's line checks.
 */
import { describe, expect, it } from 'vitest';
import { stop8 } from '../../content/stop8';
import { stopById } from '../../content/stops';
import { ringsSpeech } from '../../game/speech';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import { KINDS } from '../puzzles/statements';
import {
  BREAK_VS_MAKE,
  CARD_SCENES,
  EMPTY_ALL,
  IN_BOTH,
  IN_VS_ONLY,
  L1_EX,
  L1_LOOSE,
  L1_WORLD,
  L2_TWIN,
  L3_EX,
  L4_TWIN,
  LOOSE_CAP,
  NOT_ALL_NONE,
  NOT_ALL_VS_NONE,
  ONE_RING_CAP,
  RING_CAP,
  S8_SKINS,
  SOME_ALL,
  SOME_VS_NOT_ALL,
  WHY_LESSON,
  bothTapItem,
  bridgeItem,
  countItem,
  counterItem,
  emptyItem,
  enoughItem,
  filledItem,
  isOpposite,
  oppositeItem,
  placeItem,
  ringName,
  ringTapItem,
  say,
  sen,
  truth,
  truthItem,
  whichItem,
  whyItem,
  type Group,
  type Q,
  type S8Made,
  type WhyFamily,
} from '../puzzles/quantifiers';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, DrillStep, Item, RingPart, Scene, TapAllItem, Thing } from '../types';
import {
  HERE_VS_FORCED,
  L5_CARD_SCENES,
  L5_GROUPS,
  L5_MIDDLE,
  L5_SOME_TWIN,
  L5_TWIN,
  NOT_FORCED,
  SYL_SHAPES,
  breakItem,
  drawItem,
  followsItem,
  hereContrast,
  judgeSyl,
  makeSyl,
  partOf3,
  type SylMade,
  type Syllogism,
} from '../puzzles/syllogisms';
import {
  CASTS,
  EACH_NOT_SHARED,
  EACH_VS_SHARED,
  L6_BOARD_PICS,
  L6_CARD_SCENES,
  L6_PAIR,
  L6_TWIN,
  holdsOn,
  orderContrast,
  orderLineItem,
  orderPictureItem,
  orderTruthItem,
  orderWhichItem,
  shapeOfPic,
  type LinkPic,
  type OrderMade,
} from '../puzzles/nested';

const SEEDS = 200;
const rng = (s: number) => createRng(s);

// ---------- the second method: counting ----------

const has = (t: Thing | { shape: string; color: string; size: string }, g: Group) => (t as unknown as Record<string, string>)[g.f] === g.v;
type Part = 'a' | 'both' | 'b' | 'out';
const part = (t: Thing, x: Group, y: Group): Part => (has(t, x) && has(t, y) ? 'both' : has(t, x) ? 'a' : has(t, y) ? 'b' : 'out');

/** A sentence's truth by counting: the cards in the x group, and those of them in the y group. */
function counted(q: Q, x: Group, y: Group, things: readonly Thing[]): boolean {
  const xs = things.filter((t) => has(t, x));
  const fit = xs.filter((t) => has(t, y)).length;
  const miss = xs.length - fit;
  switch (q) {
    case 'all': return miss === 0;
    case 'some': return fit > 0;
    case 'none': return fit === 0;
    case 'someNot':
    case 'notAll': return miss > 0;
  }
}
/** The same, from which parts are filled: a (x not y) and both (x and y). */
function byParts(q: Q, a: boolean, both: boolean): boolean {
  switch (q) {
    case 'all': return !a;
    case 'some': return both;
    case 'none': return !both;
    case 'someNot':
    case 'notAll': return a;
  }
}

const choose = (m: S8Made) => m.item as unknown as ChooseItem;
const tapall = (m: S8Made) => m.item as unknown as TapAllItem;
type Rings = Extract<Scene, { kind: 'rings' }>;

/** Every card of a rings scene sits in the part its features give, no part holds more than the picture has room for. */
function ringsOk(scene: Scene | undefined, x: Group, y: Group): void {
  expect(scene?.kind).toBe('rings');
  const r = scene as Rings;
  for (const p of ['a', 'both', 'b', 'out'] as const) {
    for (const t of r[p]) expect(part(t, x, y), `${JSON.stringify(t)} in ${p}`).toBe(p);
    expect(r[p].length).toBeLessThanOrEqual(RING_CAP[p]);
  }
  expect((r.loose ?? []).length).toBeLessThanOrEqual(LOOSE_CAP);
  const ids = [...r.a, ...r.both, ...r.b, ...r.out, ...(r.loose ?? [])].map((t) => t.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe('the model', () => {
  const pairs: [Group, Group][] = [
    [{ f: 'shape', v: 'circle' }, { f: 'color', v: 'red' }],
    [{ f: 'size', v: 'big' }, { f: 'color', v: 'blue' }],
    [{ f: 'color', v: 'yellow' }, { f: 'shape', v: 'square' }],
  ];
  it('truth() agrees with counting on every set of up to three cards', () => {
    const things = KINDS.map((k, i) => ({ id: `k${i}`, ...k }));
    const sets: Thing[][] = [[]];
    for (let i = 0; i < things.length; i++) {
      sets.push([things[i]]);
      for (let j = i; j < things.length; j++) {
        sets.push([things[i], things[j]]);
        for (let k = j; k < things.length; k += 3) sets.push([things[i], things[j], things[k]]);
      }
    }
    for (const [x, y] of pairs) for (const q of ['all', 'some', 'none', 'someNot', 'notAll'] as Q[]) for (const set of sets) expect(truth(sen(q, x, y), set), `${say(sen(q, x, y))} ${set.length}`).toBe(counted(q, x, y, set));
  });

  it('opposites, by every way the parts can be filled: all and some-are-not, some and no; never all and no', () => {
    const qs: Q[] = ['all', 'some', 'none', 'someNot', 'notAll'];
    const opp = (q1: Q, q2: Q) => [false, true].every((a) => [false, true].every((b) => byParts(q1, a, b) !== byParts(q2, a, b)));
    for (const [x, y] of pairs) for (const q1 of qs) for (const q2 of qs) expect(isOpposite(sen(q1, x, y), sen(q2, x, y)), `${q1} ${q2}`).toBe(opp(q1, q2));
    expect(opp('all', 'someNot')).toBe(true);
    expect(opp('all', 'notAll')).toBe(true);
    expect(opp('some', 'none')).toBe(true);
    expect(opp('all', 'none')).toBe(false);
    // “No” is the trap: with an empty group, “all” and “no” are both true; with a mix, both false.
    expect(byParts('all', false, false) && byParts('none', false, false)).toBe(true);
    expect(!byParts('all', true, true) && !byParts('none', true, true)).toBe(true);
  });

  it('the sentences read as kids say them, with the story’s noun', () => {
    const c: Group = { f: 'shape', v: 'circle' }, r: Group = { f: 'color', v: 'red' }, b: Group = { f: 'size', v: 'big' };
    expect(say(sen('all', c, r))).toBe('All circles are red.');
    expect(say(sen('some', r, c))).toBe('Some red cards are circles.');
    expect(say(sen('none', b, r), { one: 'gem', many: 'gems' })).toBe('No big gems are red.');
    expect(say(sen('someNot', c, b), { one: 'sticker', many: 'stickers' })).toBe('Some circle stickers are not big.');
    expect(say(sen('notAll', c, r))).toBe('Not all circles are red.');
  });
});

describe('lesson 1: which ring a card goes in', () => {
  it('tap a ring: every card with the ring’s feature, the overlap too (the trap); the misreadings are named', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = ringTapItem(rng(s), { skin });
      const it = tapall(m);
      const { x, y } = m.world!;
      const g = m.ring!;
      const other = g === x ? y : x;
      expect(it.answer.sort()).toEqual(it.things.filter((t) => has(t, g)).map((t) => t.id).sort());
      expect(it.things.some((t) => has(t, g) && has(t, other)), 'a card in both rings').toBe(true);
      expect(it.tags).toEqual([IN_BOTH.tag]);
      ringsOk(it.scene, x, y);
      const key = (ids: readonly string[]) => [...ids].sort().join();
      const left = it.things.filter((t) => has(t, g) && !has(t, other)).map((t) => t.id);
      expect(it.diagnose!.map((d) => key(d.ids))).toContain(key(left));
      expect(it.diagnose!.find((d) => key(d.ids) === key(left))!.message).toContain('Your answer leaves out');
      for (const d of it.diagnose!) expect(key(d.ids)).not.toBe(key(it.answer));
      expect(new Set(it.diagnose!.map((d) => key(d.ids))).size).toBe(it.diagnose!.length);
      expect(it.prompt).toContain(`the ${g.f === 'shape' ? `${g.v.charAt(0).toUpperCase()}${g.v.slice(1)}s` : g.v.charAt(0).toUpperCase() + g.v.slice(1)} ring`);
    }
  });

  it('where one card goes: the part its two features give; each wrong part names the ring it gets wrong', () => {
    const seen = new Set<string>();
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = placeItem(rng(s), { skin });
      const it = choose(m);
      const { x, y } = m.world!;
      const c = m.card!;
      expect(it.answer).toBe(part(c, x, y));
      seen.add(it.answer);
      expect((it.scene as Rings).loose).toEqual([c]);
      ringsOk(it.scene, x, y);
      expect(it.prompt).toContain(`${c.size} ${c.color} ${c.shape}`);
      for (const ch of it.choices) if (ch.id !== it.answer) expect(it.feedback![ch.id].headline).toMatch(/^Your answer puts it .*, but it is/);
      if (it.answer === 'both') expect(it.tags).toEqual([IN_BOTH.tag]);
      // The hint shows another card, in another part.
      expect(it.hintCase!.things![0].id).not.toBe(c.id);
      expect(part(it.hintCase!.things![0], x, y)).not.toBe(it.answer);
    }
    expect([...seen].sort()).toEqual(['a', 'b', 'both', 'out']);
  });

  it('how many in a ring: the cards only in it and the overlap; the wrong counts leave out the overlap, or add the other ring', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = countItem(rng(s), { skin });
      const it = choose(m);
      const { x, y, things } = m.world!;
      const g = m.ring!;
      const right = things.filter((t) => has(t, g)).length;
      expect(it.choices.find((c) => c.id === it.answer)!.label).toBe(String(right));
      const nums = it.choices.map((c) => Number(c.label));
      expect(new Set(nums).size).toBe(nums.length);
      expect([...nums].sort((p, q) => p - q)).toEqual(nums);
      const only = it.choices.find((c) => c.id === 'only');
      if (only) expect(Number(only.label)).toBe(things.filter((t) => has(t, g) && !has(t, g === x ? y : x)).length);
      expect(it.tags).toEqual([IN_BOTH.tag]);
      ringsOk(it.scene, x, y);
    }
  });

  it('tap both rings: only the cards with both features', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = bothTapItem(rng(s), { skin });
      const it = tapall(m);
      const { x, y } = m.world!;
      expect(it.answer.sort()).toEqual(it.things.filter((t) => has(t, x) && has(t, y)).map((t) => t.id).sort());
      expect(it.answer.length).toBeGreaterThan(0);
      for (const d of it.diagnose!) expect([...d.ids].sort().join()).not.toBe([...it.answer].sort().join());
    }
  });
});

describe('lessons 2-4: true or false, by counting', () => {
  const tfCheck = (m: S8Made) => {
    const it = choose(m);
    const s = m.sentence!;
    const w = m.world!;
    const v = counted(s.q, s.x, s.y, w.things);
    expect(it.answer).toBe(v ? 'true' : 'false');
    expect(it.choices.map((c) => c.id)).toEqual(['true', 'false']);
    expect(it.feedback![v ? 'false' : 'true'].headline).toMatch(/^Your answer says (true|false), but /);
    expect(it.prompt).toContain(say(s, m.frame.noun));
    ringsOk(it.scene, s.x, s.y);
    // The hint card is outside the group the sentence talks about, so it never decides the answer.
    expect(has(it.hintCase!.things![0], s.x)).toBe(false);
    return { it, v, s, w };
  };

  it('all, some and no sentences: the answer is the counted truth; both answers come up', () => {
    for (const q of ['all', 'some', 'none'] as const) {
      const seen = new Set<string>();
      for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
        const { it, w, s: S } = tfCheck(truthItem(rng(s), { skin, q }));
        seen.add(it.answer);
        expect(w.things.some((t) => has(t, S.x)), 'the group is never empty in lesson 2').toBe(true);
      }
      expect([...seen].sort(), q).toEqual(['false', 'true']);
    }
  });

  it('the trap: every one fits, so “some” is true; it is a conflict item and says why in logic “some” can mean all', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const { it, v, s: S, w } = tfCheck(truthItem(rng(s), { skin, q: 'some', trap: true }));
      const xs = w.things.filter((t) => has(t, S.x));
      expect(xs.length).toBeGreaterThanOrEqual(2);
      expect(xs.every((t) => has(t, S.y))).toBe(true);
      expect(v).toBe(true);
      expect(it.conflict).toBe(true);
      expect(it.tags).toEqual([SOME_ALL.tag]);
      expect(it.feedback!.false.detail.join(' ')).toContain('In logic, “some” means at least one.');
    }
  });

  it('which sentence is true (or false): exactly one of the three, by counting', () => {
    for (const skin of S8_SKINS) for (const form of ['true', 'false'] as const) for (let s = 1; s <= SEEDS; s++) {
      const m = whichItem(rng(s), { skin, form });
      const it = choose(m);
      const { x, y, things } = m.world!;
      const hits = (['all', 'some', 'none'] as const).filter((q) => counted(q, x, y, things) === (form === 'true'));
      expect(hits).toEqual([it.answer]);
      for (const c of it.choices) expect(c.label).toBe(say(sen(c.id as Q, x, y), m.frame.noun));
      if (form === 'false') {
        expect(it.answer).toBe('none');
        expect(it.tags).toEqual([SOME_ALL.tag]);
      }
    }
  });

  it('one is enough: most of the group fits, one does not, so “all” is false (a conflict item)', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const { it, v, s: S, w } = tfCheck(enoughItem(rng(s), { skin }));
      const xs = w.things.filter((t) => has(t, S.x));
      expect(xs.filter((t) => !has(t, S.y)).length).toBe(1);
      expect(xs.filter((t) => has(t, S.y)).length).toBeGreaterThan(1);
      expect(S.q).toBe('all');
      expect(v).toBe(false);
      expect(it.conflict).toBe(true);
    }
  });

  it('an empty ring: “all” and “no” are true, “some” and “some are not” are false; the “all” item is the trap', () => {
    const want: Record<string, boolean> = { all: true, some: false, none: true, someNot: false };
    for (const q of ['all', 'some', 'none', 'someNot'] as const) for (const skin of S8_SKINS) for (let s = 1; s <= 80; s++) {
      const { it, v, s: S, w } = tfCheck(emptyItem(rng(s), { skin, q }));
      expect(w.things.some((t) => has(t, S.x))).toBe(false);
      expect(v).toBe(want[q]);
      expect(it.prompt).toContain('at all.');
      if (q === 'all') {
        expect(it.tags).toEqual([EMPTY_ALL.tag]);
        expect(it.conflict).toBe(true);
      } else expect(it.tags).toBeUndefined();
    }
  });

  it('a ring with cards in it (lesson 4): the group is not empty, and “all” there is false', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= 80; s++) {
      const m = filledItem(rng(s), { skin, q: 'all' });
      const { v, s: S, w } = tfCheck(m);
      expect(w.things.some((t) => has(t, S.x))).toBe(true);
      expect(v).toBe(false);
    }
  });
});

describe('lesson 3: opposites and the card that breaks it', () => {
  it('the opposite: the one choice whose truth differs in every way the parts can be filled; each wrong one has a case where they agree', () => {
    for (const of of ['all', 'some', 'none', 'someNot'] as const) for (const skin of S8_SKINS) for (let s = 1; s <= 80; s++) {
      const m = oppositeItem(rng(s), { skin, of });
      const it = choose(m);
      const S = m.sentence!;
      const opp = (q: Q) => [false, true].every((a) => [false, true].every((b) => byParts(S.q, a, b) !== byParts(q, a, b)));
      const rights = it.choices.filter((c) => opp(c.id as Q));
      expect(rights.map((c) => c.id)).toEqual([it.answer]);
      for (const c of it.choices) {
        expect(c.label).toBe(say(sen(c.id as Q, S.x, S.y), m.frame.noun));
        if (c.id === it.answer) continue;
        const ex = it.feedback![c.id].example!;
        expect(ex.truths![0].value, `${of} ${c.id}`).toBe(ex.truths![1].value);
      }
      if (of === 'all') {
        expect(it.answer).toBe('someNot');
        expect(it.choices.map((c) => c.id)).toContain('none');
        expect(it.tags).toEqual([NOT_ALL_NONE.tag]);
        expect(it.feedback!.none.detail.join(' ')).toContain('just one is enough');
      }
    }
  });

  it('the card that breaks it: in the group and not fitting (“all”), or fitting (“no”); exactly one choice does', () => {
    for (const q of ['all', 'none'] as const) for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = counterItem(rng(s), { skin, q });
      const it = choose(m);
      const { x, y, things } = m.world!;
      const breaksIt = (t: Thing) => has(t, x) && (q === 'all' ? !has(t, y) : has(t, y));
      const shown = it.choices.map((c) => things.find((t) => t.id === c.id)!);
      expect(shown.filter(breaksIt).map((t) => t.id)).toEqual([it.answer]);
      // One card from each part, so every kind of wrong pick is offered.
      expect(new Set(shown.map((t) => part(t, x, y))).size).toBe(4);
      expect(things.filter(breaksIt).length).toBe(1);
      ringsOk(it.scene, x, y);
    }
  });
});

describe('the closing why item', () => {
  const FAMILIES: WhyFamily[] = ['some-all', 'counter', 'empty'];
  it('the right reason is true here and explains the truth; every wrong reason is false here, or true but no reason', () => {
    for (const family of FAMILIES) for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = whyItem(rng(s), { skin, family });
      const it = choose(m);
      const S = m.sentence!;
      const { x, y, things } = m.world!;
      const xs = things.filter((t) => has(t, x));
      const fit = xs.filter((t) => has(t, y)).length;
      const v = counted(S.q, x, y, things);
      expect(it.prompt).toContain(`That is ${v ? 'true' : 'false'}. Why?`);
      expect(it.tags).toEqual(['why']);
      for (const c of it.choices) expect(c.label.length).toBeGreaterThan(12);
      // Each reason's fact, counted here.
      const facts: Record<string, boolean> = {
        least: fit > 0,
        'not-all': xs.length > fit,
        'every-card': things.every((t) => has(t, y)),
        none: fit === 0,
        one: xs.length - fit === 1,
        most: xs.length - fit > fit,
        some: fit > 0,
        nothing: xs.length === 0,
        'one-is': fit > 0,
        'empty-all': counted('some', x, y, things),
      };
      for (const r of m.reasons!) expect(r.fact, `${family} ${r.id}`).toBe(facts[r.id]);
      const right = m.reasons!.find((r) => r.right)!;
      expect(it.answer).toBe(right.id);
      expect(right.fact).toBe(true);
      if (family === 'some-all') expect(v && xs.length === fit).toBe(true);
      if (family === 'counter') expect(!v && xs.length - fit === 1).toBe(true);
      if (family === 'empty') expect(v && xs.length === 0).toBe(true);
      // A wrong reason with a true fact (“Some squares are small” for a false “all”) is told it does not explain.
      for (const r of m.reasons!) if (!r.right && r.fact) expect(it.feedback![r.id].headline).toContain('does not break');
      for (const r of m.reasons!) if (!r.right && !r.fact) expect(it.feedback![r.id].headline).toMatch(/^Your reason (is false|says|is not right)/);
    }
  });
});

describe('the warm-up (bridge): a Stop 7 “every” sentence broken by one draw', () => {
  it('the answer comes from the draws: one that does not fit breaks “every”; it is a Stop 7 item that never counts here', () => {
    const seen = new Set<string>();
    for (let s = 1; s <= SEEDS; s++) {
      const m = bridgeItem(rng(s));
      const it = choose(m as unknown as S8Made);
      const fitsAll = m.draws.every((d) => d === m.every);
      expect(fitsAll).toBe(false);
      expect(it.answer).toBe('broken');
      expect(it.choices.find((c) => c.id === 'broken')!.label.startsWith('No.')).toBe(true);
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id].headline.trim()).toBeTruthy();
      const lines = (it.scene as Extract<Scene, { kind: 'text' }>).lines;
      expect(lines[1].endsWith('!')).toBe(true);
      const b = stop8.bridge!(rng(s));
      expect([b.stop, b.lesson, b.skill]).toEqual([7, 's7.l1', 's7.pattern-break']);
      expect(stopById('s7')!.lessons.some((l) => l.id === b.lesson)).toBe(true);
      expect(stop8.bridge!(rng(s))).toEqual(b);
      seen.add(looks(b));
    }
    expect(seen.size).toBeGreaterThan(150);
  });
});

describe('the lessons', () => {
  it('every pack: its kinds in order, two or more skins, the trap in every pack, the same for the same seed', () => {
    const plan: Record<string, string[]> = {
      's8.l1': ['s8.member', 's8.member', 's8.member', 's8.member'],
      's8.l2': ['s8.quantify', 's8.quantify', 's8.quantify', 's8.quantify'],
      's8.l3': ['s8.negate', 's8.negate', 's8.negate', 's8.negate'],
      's8.l4': ['s8.empty', 's8.empty', 's8.empty', 's8.why'],
      's8.l5': ['s8.syllogism', 's8.syllogism', 's8.syllogism', 's8.syllogism'],
      's8.l6': ['s8.order', 's8.order', 's8.order', 's8.order'],
    };
    const trap: Record<string, string> = { 's8.l1': IN_BOTH.tag, 's8.l2': SOME_ALL.tag, 's8.l3': NOT_ALL_NONE.tag, 's8.l4': EMPTY_ALL.tag, 's8.l5': NOT_FORCED.tag, 's8.l6': EACH_NOT_SHARED.tag };
    const skinOf = (it: Item) =>
      /^These cards|^Here is a sentence|^Dots are/.test(it.prompt) ? 'abstract' : /magic|^The (wizard|dragon|troll|fairy|giant|elf)|^Elves are/.test(it.prompt) ? 'fantasy' : 'everyday';
    for (const l of stop8.lessons) {
      expect(l.pass).toEqual({ firstTry: 3, include: [{ tag: trap[l.id], label: expect.any(String) }] });
      for (let s = 1; s <= SEEDS; s++) {
        const items = l.practice(rng(s));
        expect(items.map((i) => i.skill)).toEqual(plan[l.id]);
        expect(items.some((i) => i.tags?.includes(trap[l.id])), `${l.id} ${s}`).toBe(true);
        expect(new Set(items.map(skinOf)).size, `${l.id} ${s}: skins`).toBeGreaterThanOrEqual(2);
        expect(new Set(items.map(looks)).size).toBe(items.length);
        expect(l.practice(rng(s))).toEqual(items);
      }
    }
    // The conflict items sit where the plan says: the “some” trap in lesson 2, one is enough in lesson 3, the empty “all”.
    const p2 = stop8.lessons[1].practice(rng(1));
    expect(p2[2].conflict).toBe(true);
    expect(stop8.lessons[2].practice(rng(1))[3].conflict).toBe(true);
    expect(stop8.lessons[3].practice(rng(1))[0].conflict).toBe(true);
    // The new traps: a claim true in the picture but not forced (lesson 5), a different friend for each kid (lesson 6).
    for (let s = 1; s <= 40; s++) {
      expect(stop8.lessons[4].practice(rng(s))[2].conflict).toBe(true);
      expect(stop8.lessons[5].practice(rng(s))[1].conflict).toBe(true);
    }
  });

  it('each skill has many different-looking items, so a new example after a miss looks new', () => {
    const seen: Record<string, Set<string>> = {};
    for (let s = 1; s <= SEEDS; s++) for (const l of stop8.lessons) for (const it of l.practice(rng(s))) (seen[it.skill] ??= new Set()).add(looks(it));
    for (const [skill, set] of Object.entries(seen)) expect(set.size, skill).toBeGreaterThanOrEqual(100);
  });

  it('the answer is not always in the same place (a trap’s answer is fixed by design, so its pack mates vary)', () => {
    for (const l of stop8.lessons) for (let k = 0; k < 4; k++) {
      const at = new Set<string>();
      if (l.practice(rng(1))[k].conflict) continue;
      for (let s = 1; s <= SEEDS; s++) {
        const it = l.practice(rng(s))[k];
        if (it.kind === 'choose') at.add(String(it.choices.findIndex((c) => c.id === it.answer)));
        else if (it.kind === 'tapall') at.add(it.answer.sort().join());
      }
      expect(at.size, `${l.id} item ${k + 1}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('terms: each word is named on the lesson that introduces it, in plain words', () => {
    const terms = Object.fromEntries(stop8.lessons.map((l) => [l.id, (l.terms ?? []).map((t) => t.term)]));
    expect(terms).toEqual({ 's8.l1': ['set', 'overlap'], 's8.l2': ['all', 'some', 'none'], 's8.l3': ['opposite', 'not all', 'counterexample'], 's8.l4': ['empty set'], 's8.l5': ['syllogism'], 's8.l6': [] });
    for (const l of stop8.lessons) {
      const said = l.ideas.flatMap((c) => c.body).join(' ').toLowerCase();
      for (const t of l.terms ?? []) {
        expect(t.means).toMatch(/^[A-Z].*[.!?]$/);
        expect(said, `${l.id} names ${t.term}`).toContain(t.term.split(' ')[0]);
      }
    }
  });

  it('skill names: one for every skill the stop asks about', () => {
    expect(Object.keys(stop8.skillNames ?? {}).sort()).toEqual(['s8.empty', 's8.member', 's8.negate', 's8.order', 's8.quantify', 's8.syllogism', 's8.why']);
  });
});

describe('the check', () => {
  it('10 items: one or two per lesson in order, then the why item last, from the lesson its reason teaches', () => {
    const fams = new Set<string>();
    const l5 = new Set<string>(), l6 = new Set<string>();
    for (let s = 1; s <= 300; s++) {
      const items = stop8.check!(rng(s));
      expect(items.length).toBe(10);
      expect(items.slice(0, 9).map((i) => i.lesson)).toEqual(['s8.l1', 's8.l2', 's8.l2', 's8.l3', 's8.l4', 's8.l5', 's8.l5', 's8.l6', 's8.l6']);
      const last = items[9];
      expect(last.tags).toEqual(['why']);
      expect(last.skill).toBe('s8.why');
      const fam = (Object.keys(WHY_LESSON) as WhyFamily[]).find((f) => WHY_LESSON[f] === last.lesson)!;
      fams.add(fam);
      expect(items[2].conflict && items[2].tags?.includes(SOME_ALL.tag)).toBe(true);
      expect(items[3].tags).toEqual([NOT_ALL_NONE.tag]);
      expect(items[4].conflict && items[4].tags?.includes(EMPTY_ALL.tag)).toBe(true);
      expect(items[6].conflict && items[6].tags?.includes(NOT_FORCED.tag)).toBe(true);
      expect(items[7].conflict && items[7].tags?.includes(EACH_NOT_SHARED.tag)).toBe(true);
      expect(items.slice(5, 7).every((i) => i.skill === 's8.syllogism')).toBe(true);
      expect(items.slice(7, 9).every((i) => i.skill === 's8.order')).toBe(true);
      l5.add(items[5].kind === 'tapall' ? 'draw' : items[5].prompt.includes('Which') ? 'break' : 'follows');
      l6.add(items[8].prompt.includes('new line') ? 'line' : items[8].prompt.includes('In which picture') ? 'picture' : 'which');
      expect(items.slice(0, 9).some((i) => i.tags?.includes('why'))).toBe(false);
      expect(stop8.check!(rng(s))).toEqual(items);
    }
    expect([...fams].sort()).toEqual(['counter', 'empty', 'some-all']);
    expect([...l5].sort()).toEqual(['break', 'draw', 'follows']);
    expect([...l6].sort()).toEqual(['line', 'picture', 'which']);
  });

  it('Arcade items are valid and come from every lesson; new examples after a miss are new, with both answers for true-or-false', () => {
    const lessons = new Set<string>();
    for (let s = 1; s <= 200; s++) {
      const it = stop8.practice!(rng(s));
      lessons.add(it.lesson);
      if (it.kind === 'choose') expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
    }
    expect([...lessons].sort()).toEqual(['s8.l1', 's8.l2', 's8.l3', 's8.l4', 's8.l5', 's8.l6']);
    for (let s = 1; s <= 60; s++) {
      // The check's last l6 item (which sentences, which picture or which new line) and the why item, both at the end.
      for (const missed of [...stop8.lessons.flatMap((l) => l.practice(rng(s))), ...stop8.check!(rng(s)).slice(8)]) {
        const out = stop8.fresh!(missed, rng(s + 500));
        expect(out.length, missed.skill).toBeGreaterThan(0);
        for (const f of out) expect(looks(f)).not.toBe(looks(missed));
        expect(out.some((f) => f.skill === missed.skill), missed.skill).toBe(true);
        const tf = out.filter((f) => f.kind === 'choose' && f.choices.length === 2 && f.choices[0].id === 'true');
        if (missed.kind === 'choose' && missed.choices[0]?.id === 'true' && missed.skill !== 's8.negate') {
          expect(new Set(tf.map((f) => (f as ChooseItem).answer)).size, `${missed.skill} ${s}`).toBe(2);
        }
      }
    }
  });
});

describe('See and Do: the cards and the boards', () => {
  const lesson = (k: number) => stop8.lessons[k];
  const rightPicks = (b: DrillStep) => Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer]));

  it('every board: marks worked out by counting, words for every wrong mark, the right marks pass, 12 taps or fewer', () => {
    for (const l of stop8.lessons) {
      for (const b of l.drill!) {
        expect(marksToTap(b).length, b.id).toBeLessThanOrEqual(12);
        expect(checkDrill(b, rightPicks(b)).done, b.id).toBe(true);
        for (const m of marksToTap(b)) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.trim(), `${b.id} ${m.id} ${o.id}`).toBeTruthy();
        expect(b.afterCard).toBeDefined();
        expect(b.afterCard!).toBeLessThan(l.ideas.length);
      }
    }
    // Lesson 1, board 1: in the Red ring, and only in it.
    const b1 = lesson(0).drill![0];
    const { x, y } = L1_WORLD;
    for (const r of b1.rows) {
      const t = r.things![0];
      expect(r.marks[0].answer).toBe(has(t, y) ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(has(t, y) && !has(t, x) ? 'yes' : 'no');
    }
    // Lesson 1, board 2: each new card's part.
    const b2 = lesson(0).drill![1];
    for (const t of L1_LOOSE) expect(b2.rows.find((r) => r.id === t.id)!.marks[0].answer).toBe(part(t, L1_EX.x, L1_EX.y));
    expect(new Set(L1_LOOSE.map((t) => part(t, L1_EX.x, L1_EX.y))).size).toBe(4);
    // The sentence boards (lessons 2-4, board 1): each row's cards, counted.
    for (const k of [1, 2, 3]) {
      const b = lesson(k).drill![0];
      for (const r of b.rows) for (const m of r.marks) {
        const q = (['all', 'some', 'none', 'notAll'] as Q[]).find((qq) => m.label.startsWith(qq === 'notAll' ? 'Not all' : qq === 'none' ? 'No ' : qq === 'all' ? 'All' : 'Some'))!;
        const words = m.label.replace(/\.$/, '').split(' ');
        const sub = words[q === 'notAll' ? 2 : 1].replace(/s$/, '');
        const xg: Group = { f: 'shape', v: sub };
        const yg: Group = { f: 'color', v: words[words.length - 1] };
        expect(m.answer, `${b.id} ${m.id}`).toBe(counted(q, xg, yg, r.things!) ? 'true' : 'false');
      }
      // Rows cover every way: all fit, some do, none fit (or none at all).
      expect(new Set(b.rows.map((r) => r.marks.map((m) => m.answer).join())).size).toBe(b.rows.length);
    }
    // The twin boards (lessons 2 and 4, board 2): all, some and no on the twin's cards.
    for (const [k, w] of [[1, L2_TWIN], [3, L4_TWIN]] as const) {
      const b = lesson(k).drill![1];
      for (const r of b.rows) expect(r.marks[0].answer, `${b.id} ${r.id}`).toBe(counted(r.id as Q, w.x, w.y, w.things) ? 'true' : 'false');
      expect(b.twin?.trim()).toBeTruthy();
    }
    // Lesson 3, board 2: the one card that breaks “All squares are yellow”, and its opposite.
    const b3 = lesson(2).drill![1];
    for (const t of L3_EX.things) expect(b3.rows.find((r) => r.id === t.id)!.marks[0].answer).toBe(has(t, L3_EX.x) && !has(t, L3_EX.y) ? 'yes' : 'no');
    expect(b3.rows.find((r) => r.id === 'opp')!.marks[0].answer).toBe('someNot');
  });

  it('each lesson declares its distinction, teaches it with a contrast card (truths counted) and exercises it on the board right after', () => {
    const want = [IN_VS_ONLY, SOME_VS_NOT_ALL, NOT_ALL_VS_NONE, BREAK_VS_MAKE, HERE_VS_FORCED, EACH_VS_SHARED];
    stop8.lessons.forEach((l, k) => {
      expect(l.distinctions).toEqual([want[k]]);
      const at = l.ideas.findIndex((c) => c.distinction === want[k].id);
      expect(at).toBeGreaterThan(0);
      const card = l.ideas[at];
      expect(card.scene?.kind).toBe('contrast');
      const sc = card.scene as Extract<Scene, { kind: 'contrast' }>;
      const board = l.drill!.find((b) => b.distinction === want[k].id)!;
      expect(board.afterCard).toBe(at);
      expect(board.scaffold).toBe('full');
      expect(board.misconceptions!.length).toBeGreaterThan(0);
      expect(board.confused!.length).toBeGreaterThan(0);
      // The worked example comes after the contrast.
      expect(l.drill!.some((b) => b.afterCard! > at) || at === l.ideas.length - 1).toBe(true);
      // The panels' truths, counted on their cards (lessons 5 and 6 have their own test below).
      if (k > 3) return;
      if (k > 0) {
        for (const p of sc.pairs) {
          const said = p.says.replace(/\.$/, '');
          const q: Q = said.startsWith('Not all') ? 'notAll' : said.startsWith('No ') ? 'none' : said.startsWith('All') ? 'all' : 'some';
          const words = said.split(' ');
          const xg: Group = { f: 'shape', v: words[q === 'notAll' ? 2 : 1].replace(/s$/, '') };
          const yg: Group = { f: 'color', v: words[words.length - 1] };
          expect(p.truth, p.says).toBe(counted(q, xg, yg, p.things!));
        }
      } else {
        const t = sc.pairs[0].things![0];
        expect(sc.pairs[0].truth).toBe(has(t, L1_WORLD.y));
        expect(sc.pairs[1].truth).toBe(has(t, L1_WORLD.y) && !has(t, L1_WORLD.x));
      }
    });
    // The contrasts differ in one thing: the same cards with other words, or the same words on other cards.
    const [, c2, c3, c4] = stop8.lessons.map((l) => l.ideas.find((c) => c.distinction)!.scene as Extract<Scene, { kind: 'contrast' }>);
    expect(c2.pairs[0].says).toBe(c2.pairs[1].says);
    expect(c3.pairs[0].things).toEqual(c3.pairs[1].things);
    expect(c4.pairs[0].things).toEqual(c4.pairs[1].things);
  });

  it('the mix-ups: each board names the belief behind its pattern of wrong marks, and only for that pattern', () => {
    const cases: [number, number, Record<string, string>, string][] = [
      [0, 0, { 'c1-in': 'no' }, 'in-vs-only'],
      [0, 0, { 'c1-only': 'yes' }, 'in-vs-only'],
      [1, 0, { 'r1-some': 'false' }, 'some-vs-not-all'],
      [1, 1, { some: 'false' }, 'some-vs-not-all'],
      [2, 0, { 'r1-none': 'true' }, 'not-all-vs-none'],
      [2, 1, { opp: 'none' }, 'not-all-vs-none'],
      [3, 0, { 'r1-all': 'false' }, 'break-vs-make'],
      [3, 0, { 'r1-some': 'true' }, 'break-vs-make'],
      [3, 1, { all: 'false' }, 'break-vs-make'],
      [4, 0, { verdict: 'follows' }, 'here-vs-forced'],
      [4, 1, { claim: 'follows' }, 'here-vs-forced'],
      [4, 2, { claim: 'follows' }, 'here-vs-forced'],
      [5, 0, { 'r1-each': 'false' }, 'each-vs-shared'],
      [5, 0, { 'r1-shared': 'true' }, 'each-vs-shared'],
      [5, 1, { shared: 'false' }, 'each-vs-shared'],
    ];
    for (const [k, j, wrong, id] of cases) {
      const b = lesson(k).drill![j];
      const res = checkDrill(b, { ...rightPicks(b), ...wrong });
      expect(res.diagnosis, `${b.id} ${JSON.stringify(wrong)}`).toBe(id);
      expect(res.message.startsWith('You may be treating')).toBe(true);
      expect(checkDrill(b, rightPicks(b)).diagnosis).toBeUndefined();
    }
  });

  it('every rings picture: each card in its part; no quiz, check or Arcade item repeats a card’s picture', () => {
    for (const l of stop8.lessons) for (const c of l.ideas) if (c.scene?.kind === 'rings') {
      const r = c.scene as Rings;
      const cards = r.a.length + r.both.length + r.b.length + r.out.length + [r.c, r.ac, r.bc, r.abc].reduce((n, xs) => n + (xs?.length ?? 0), 0);
      expect(cards + (r.crossed?.length ?? 0) + (r.links?.length ?? 0)).toBeGreaterThan(0);
      if (r.rings.length === 1) {
        expect(r.a.length).toBeLessThanOrEqual(ONE_RING_CAP.in);
        expect(r.out.length).toBeLessThanOrEqual(ONE_RING_CAP.out);
      }
    }
    const cards = new Set([...CARD_SCENES(), ...L5_CARD_SCENES(), ...L6_CARD_SCENES()].map((s) => JSON.stringify(s)));
    for (let s = 1; s <= 60; s++) {
      const all = [...stop8.lessons.flatMap((l) => l.practice(rng(s))), ...stop8.check!(rng(s)), stop8.practice!(rng(s))];
      for (const it of all) expect(cards.has(JSON.stringify(it.scene))).toBe(false);
    }
  });

  it('a rings picture is read aloud: the rings, every card in its part, the circled card and the cards to place', () => {
    const sc = CARD_SCENES()[1] as Rings;
    const lines = ringsSpeech(sc);
    expect(lines[0]).toBe('Two rings that overlap: Circles and Red.');
    for (const t of [...sc.a, ...sc.both, ...sc.b, ...sc.out]) expect(lines.join(' ')).toContain(`${t.size} ${t.color} ${t.shape}`);
    expect(lines).toContain('In both rings: big red circle.');
    const one = ringsSpeech(CARD_SCENES()[0] as Rings);
    expect(one[0]).toBe('One ring: Red.');
    const marked = ringsSpeech(CARD_SCENES()[8] as Rings);
    expect(marked.some((l) => l.startsWith('Circled: small blue square'))).toBe(true);
    const loose = ringsSpeech(lesson(0).drill![1].scene as Rings);
    expect(loose.some((l) => l.startsWith('Not placed yet: big blue circle'))).toBe(true);
    // Empty rings (a tap question): named only.
    expect(ringsSpeech({ kind: 'rings', rings: ['Circles', 'Red'], a: [], both: [], b: [], out: [] })).toEqual(['Two rings that overlap: Circles and Red.']);
  });
});

describe('reading level, quotes and symbols', () => {
  /** Every string a kid reads in an item. */
  const itemText = (it: Item): string[] => [
    it.prompt,
    it.explain,
    ...teachStrings(it),
    ...(it.kind === 'choose' ? [...it.choices.map((c) => c.label), ...Object.values(it.whyWrong ?? {})] : []),
    ...(it.kind === 'tapall' ? (it.diagnose ?? []).map((d) => d.message) : []),
  ];
  const boardText = (d: DrillStep): string[] => [
    d.title,
    ...d.body,
    d.done,
    d.twin ?? '',
    ...d.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
    ...(d.misconceptions ?? []).map((m) => m.text),
    ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
    ...Object.values(d.words ?? {}),
  ];
  const cardText = (): string[] =>
    stop8.lessons.flatMap((l) => [
      l.title,
      ...l.ideas.flatMap((c) => [c.title, ...c.body, ...(c.scene?.kind === 'contrast' ? [...c.scene.pairs.flatMap((p) => [p.world, p.says, p.because, p.then ?? '']), c.scene.ask!.q, c.scene.ask!.a] : []), ...(c.scene?.kind === 'rings' ? [c.scene.caption ?? ''] : [])]),
      ...(l.terms ?? []).flatMap((t) => [t.term, t.means, t.also ?? '']),
      ...l.drill!.flatMap(boardText),
    ]);

  it('every generated string reads at grade 7 or lower, with no sentence over 25 words', () => {
    const text: string[] = [...cardText()];
    for (let s = 1; s <= 60; s++) {
      text.push(...stop8.lessons.flatMap((l) => l.practice(rng(s))).flatMap(itemText));
      text.push(...stop8.check!(rng(s)).flatMap(itemText), ...itemText(stop8.bridge!(rng(s))));
    }
    const all = text.filter(Boolean).join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
  });

  it('curly quotes and apostrophes only, no symbols, “Not yet” never “Wrong”, US spelling', () => {
    const text: string[] = [...cardText(), ...Object.values(stop8.skillNames ?? {})];
    for (let s = 1; s <= 40; s++) {
      text.push(...stop8.lessons.flatMap((l) => l.practice(rng(s))).flatMap(itemText));
      text.push(...stop8.check!(rng(s)).flatMap(itemText), ...itemText(stop8.bridge!(rng(s))));
      const it = stop8.practice!(rng(s));
      if (it.scene?.kind === 'rings') text.push(...ringsSpeech(it.scene));
    }
    const all = text.join('\n');
    expect(all).not.toMatch(/['"]/);
    expect(all).not.toMatch(/[=+×→←✓✗<>&*#@^~|\\]/);
    expect(all).not.toMatch(/\bWrong\b/);
    expect(all).not.toMatch(/\b(colour|favour|centre|grey)\b/i);
    expect(all).not.toMatch(/\b0 are\b/);
  });

  it('a hint never gives the answer away; every hinted item has a marked case', () => {
    for (let s = 1; s <= SEEDS; s++) for (const l of stop8.lessons) for (const it of l.practice(rng(s))) {
      expect(it.hint && it.hintCase, it.id).toBeTruthy();
      if (it.kind !== 'choose') continue;
      const ans = it.choices.find((c) => c.id === it.answer)!.label.toLowerCase();
      const hc = [it.hintCase!.label, it.hintCase!.note ?? ''].join(' ').toLowerCase();
      if (ans.length > 6) expect(hc, `${it.id}: ${ans}`).not.toContain(ans.replace(/\.$/, ''));
    }
  });

  it('every item has teaching and feedback for every wrong choice, kept in step with whyWrong', () => {
    for (let s = 1; s <= 60; s++) for (const it of [...stop8.lessons.flatMap((l) => l.practice(rng(s))), ...stop8.check!(rng(s))]) {
      expect(it.teach?.rule.trim(), it.id).toBeTruthy();
      expect(it.teach?.cases?.length ?? 0, it.id).toBeGreaterThanOrEqual(2);
      if (it.kind !== 'choose') continue;
      for (const c of it.choices) {
        if (c.id === it.answer) expect(it.feedback?.[c.id]).toBeUndefined();
        else {
          expect(it.feedback?.[c.id]?.headline.startsWith('Your '), `${it.id} ${c.id}`).toBe(true);
          expect(it.whyWrong?.[c.id]).toContain(it.feedback![c.id].headline);
        }
      }
    }
  });

  it('the same seed gives the same item, for every kind', () => {
    const makers: ((r: ReturnType<typeof rng>) => S8Made)[] = [
      (r) => ringTapItem(r, { skin: 'everyday' }),
      (r) => placeItem(r, { skin: 'fantasy' }),
      (r) => countItem(r, { skin: 'abstract' }),
      (r) => bothTapItem(r, { skin: 'everyday' }),
      (r) => truthItem(r, { skin: 'fantasy', q: 'some', trap: true }),
      (r) => whichItem(r, { skin: 'abstract' }),
      (r) => oppositeItem(r, { skin: 'everyday', of: 'all' }),
      (r) => counterItem(r, { skin: 'fantasy' }),
      (r) => enoughItem(r, { skin: 'abstract' }),
      (r) => emptyItem(r, { skin: 'everyday', q: 'all' }),
      (r) => whyItem(r, { skin: 'fantasy', family: 'counter' }),
      (r) => drawItem(r, { skin: 'everyday' }) as unknown as S8Made,
      (r) => followsItem(r, { skin: 'abstract', trap: true }) as unknown as S8Made,
      (r) => breakItem(r, { skin: 'fantasy' }) as unknown as S8Made,
      (r) => orderTruthItem(r, { skin: 'everyday', q: 'each', trap: true }) as unknown as S8Made,
      (r) => orderWhichItem(r, { skin: 'fantasy' }) as unknown as S8Made,
      (r) => orderPictureItem(r, { skin: 'abstract' }) as unknown as S8Made,
      (r) => orderLineItem(r, { skin: 'everyday' }) as unknown as S8Made,
    ];
    for (const make of makers) for (let s = 1; s <= 20; s++) expect(make(rng(s)).item).toEqual(make(rng(s)).item);
  });
});

// ---------- lesson 5: the second method, every small set of real cards ----------

/** Every set of up to three real cards (the 18 kinds), for checking an argument without the engine's placements. */
const SMALL_SETS: Thing[][] = (() => {
  const ks = KINDS.map((k, i) => ({ id: `k${i}`, ...k })) as Thing[];
  const out: Thing[][] = [[]];
  for (let i = 0; i < ks.length; i++) {
    out.push([ks[i]]);
    for (let j = i; j < ks.length; j++) {
      out.push([ks[i], ks[j]]);
      for (let k = j; k < ks.length; k++) out.push([ks[i], ks[j], ks[k]]);
    }
  }
  return out;
})();
type Sen = Syllogism['claim'];
const holdsC = (s: Sen, ts: readonly Thing[]) => counted(s.q, s.x, s.y, ts);
/** One card breaks an “all” or a “no” given. */
const breaksGiven = (g: Sen, t: Thing) => (g.q === 'all' || g.q === 'none') && !holdsC(g, [t]);
/** The sets of real cards where every given is true. */
const allowedSets = (sy: Syllogism) => SMALL_SETS.filter((set) => sy.givens.every((g) => holdsC(g, set)));
/** Follows: no set of real cards fits every given and breaks the claim. */
const followsByCards = (sy: Syllogism) => !allowedSets(sy).some((set) => !holdsC(sy.claim, set));
/** A card's place in the rings, as in or out of each ring: “110” is in rings 1 and 2, not 3. */
const flagsOf = (t: Thing, groups: readonly Group[]) => groups.map((g) => (has(t, g) ? '1' : '0')).join('');
const FLAGS: Record<RingPart, string> = { a: '100', both: '110', b: '010', ac: '101', abc: '111', bc: '011', c: '001', out: '000' };
const flagsOfPart = (p: RingPart, n: number) => FLAGS[p].slice(0, n);
/** The brief's table: which shapes follow. */
const FOLLOWS: Record<string, boolean> = { chain: true, 'some-chain': true, 'no-chain': true, 'no-some': true, middle: false, turn: false };

/** Every card of a two- or three-ring picture sits in the part its features give. */
function rings3Ok(scene: Scene | undefined, groups: readonly Group[]): Thing[] {
  expect(scene?.kind).toBe('rings');
  const r = scene as Rings;
  expect(r.rings.length).toBe(groups.length);
  const parts: [RingPart, Thing[] | undefined][] = [['a', r.a], ['both', r.both], ['b', r.b], ['out', r.out], ['c', r.c], ['ac', r.ac], ['bc', r.bc], ['abc', r.abc]];
  const all: Thing[] = [];
  for (const [p, ts] of parts) for (const t of ts ?? []) {
    expect(flagsOf(t, groups), `${JSON.stringify(t)} in ${p}`).toBe(flagsOfPart(p, groups.length));
    all.push(t);
  }
  if (groups.length === 3) for (const [p, ts] of parts) if (p !== 'out') expect((ts ?? []).length, p).toBeLessThanOrEqual(p === 'a' || p === 'b' || p === 'c' ? 2 : 1);
  return all;
}

describe('lesson 5: two givens, one picture, worked out again on real cards', () => {
  /** Groups on three different features: every order of the features, with values from a seed. */
  const triples = (): Group[][] => {
    const out: Group[][] = [];
    const orders: ('shape' | 'color' | 'size')[][] = [['shape', 'color', 'size'], ['shape', 'size', 'color'], ['color', 'shape', 'size'], ['color', 'size', 'shape'], ['size', 'shape', 'color'], ['size', 'color', 'shape']];
    const vals = { shape: ['circle', 'square', 'triangle'], color: ['red', 'blue', 'yellow'], size: ['big', 'small'] };
    orders.forEach((o, i) => { for (let k = 0; k < 3; k++) out.push(o.map((f, j) => ({ f, v: vals[f][(i + j + k) % vals[f].length] }))); });
    return out;
  };

  it('the six shapes: follows or not on every placement, and again on every set of up to three real cards, as the brief says', () => {
    for (const groups of triples()) for (const shape of SYL_SHAPES) {
      const sy = makeSyl(shape, groups);
      const j = judgeSyl(sy);
      expect(j.follows, `${shape} ${say(sy.claim)}`).toBe(followsByCards(sy));
      expect(j.follows, shape).toBe(FOLLOWS[shape]);
      if (!j.follows) {
        // The case that breaks it: cards the givens allow, where the claim is false; as small as the smallest real set.
        const cards = j.breaks!.map((p) => SMALL_SETS.find((set) => set.length === 1 && flagsOf(set[0], sy.groups) === flagsOfPart(p, sy.groups.length))![0]);
        expect(sy.givens.every((g) => holdsC(g, cards))).toBe(true);
        expect(holdsC(sy.claim, cards)).toBe(false);
        const smallest = Math.min(...allowedSets(sy).filter((set) => !holdsC(sy.claim, set)).map((set) => set.length));
        expect(j.breaks!.length).toBe(smallest);
      }
    }
  });

  it('crossed-out parts: no real card the givens allow sits there; a star: every set the givens allow has a card there', () => {
    for (const groups of triples().slice(0, 9)) for (const shape of SYL_SHAPES) {
      const sy = makeSyl(shape, groups);
      const j = judgeSyl(sy);
      const n = sy.groups.length;
      const allowed = allowedSets(sy);
      const parts: RingPart[] = n === 3 ? ['a', 'both', 'b', 'ac', 'abc', 'bc', 'c', 'out'] : ['a', 'both', 'b', 'out'];
      const filled = (p: RingPart, set: Thing[]) => set.some((t) => flagsOf(t, sy.groups) === flagsOfPart(p, n));
      expect(j.crossed.sort(), shape).toEqual(parts.filter((p) => !allowed.some((set) => filled(p, set))).sort());
      expect(j.starred.sort(), shape).toEqual(parts.filter((p) => allowed.every((set) => filled(p, set))).sort());
      // A part is crossed out just when one card there breaks an “all” or a “no” given.
      for (const p of parts) {
        const card = KINDS.map((k, i) => ({ id: `k${i}`, ...k }) as Thing).find((t) => flagsOf(t, sy.groups) === flagsOfPart(p, n))!;
        expect(j.crossed.includes(p), `${shape} ${p}`).toBe(sy.givens.some((g) => breaksGiven(g, card)));
      }
    }
    // The “some” shapes put exactly one star, inside the part the claim needs.
    expect(judgeSyl(makeSyl('some-chain', L5_GROUPS)).starred).toEqual(['abc']);
    expect(judgeSyl(makeSyl('no-some', L5_GROUPS)).starred).toEqual(['both']);
  });

  it('does the claim follow? The answer is worked out on real cards; the picture fits the givens and shows the claim true; the trap does not follow', () => {
    const seen = new Set<string>();
    for (const skin of S8_SKINS) for (const trap of [false, true]) for (let s = 1; s <= SEEDS; s++) {
      const m = followsItem(rng(s), { skin, trap });
      const it = m.item as unknown as ChooseItem;
      const sy = m.syl;
      const f = followsByCards(sy);
      expect(it.answer).toBe(f ? 'follows' : 'not');
      seen.add(`${trap}-${sy.shape}`);
      const shown = rings3Ok(it.scene, sy.groups);
      expect(shown.length).toBe(m.cards.length);
      expect(sy.givens.every((g) => holdsC(g, m.cards)), 'the picture fits the givens').toBe(true);
      expect(holdsC(sy.claim, m.cards), 'the claim is true in the picture').toBe(true);
      expect(m.cards.some((t) => has(t, sy.claim.x)), 'the picture shows the claim’s group').toBe(true);
      for (const g of [...sy.givens, sy.claim]) expect(it.prompt).toContain(say(g, m.frame.noun));
      expect(it.choices.map((c) => c.id).sort()).toEqual(['follows', 'not']);
      const wrong = f ? 'not' : 'follows';
      expect(it.feedback![wrong].headline).toMatch(/^Your answer says/);
      if (!f) {
        // The case that breaks it, drawn in the explanation: it fits every given and breaks the claim.
        const ex = it.feedback!.follows.example!.things![0];
        expect(sy.givens.every((g) => holdsC(g, [ex]))).toBe(true);
        expect(holdsC(sy.claim, [ex])).toBe(false);
      }
      if (trap) {
        expect(f).toBe(false);
        expect(it.tags).toEqual([NOT_FORCED.tag]);
        expect(it.conflict).toBe(true);
        expect(it.feedback!.follows.detail.join(' ')).toContain('true in this picture');
      } else {
        expect(f).toBe(true);
        expect(it.tags).toBeUndefined();
      }
      // The hint card is crossed out: it breaks a given.
      expect(sy.givens.some((g) => breaksGiven(g, it.hintCase!.things![0]))).toBe(true);
    }
    expect([...seen].sort()).toEqual(['false-chain', 'false-no-chain', 'false-no-some', 'false-some-chain', 'true-middle', 'true-turn']);
  });

  it('which card breaks it: exactly one offered card fits every given and breaks the claim; each other card is crossed out, fits the claim, or is outside it', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = breakItem(rng(s), { skin });
      const it = m.item as unknown as ChooseItem;
      const sy = m.syl;
      expect(followsByCards(sy)).toBe(false);
      const breaks = (t: Thing) => !sy.givens.some((g) => breaksGiven(g, t)) && !holdsC(sy.claim, [t]);
      expect(m.cards.filter(breaks).map((t) => t.id)).toEqual([it.answer]);
      expect((it.scene as Rings).loose).toEqual(m.cards);
      rings3Ok(it.scene, sy.groups);
      for (const t of m.cards) {
        if (t.id === it.answer) continue;
        const h = it.feedback![t.id].headline;
        if (sy.givens.some((g) => breaksGiven(g, t))) expect(h).toMatch(/breaks (given \d|the given), so it can’t be in the picture/);
        else if (!has(t, sy.claim.x)) expect(h).toContain('says nothing about it');
        else expect(h).toContain('fits the claim');
      }
    }
  });

  it('draw the givens: the cards to tap break no “all” or “no” given; each misreading is named, and none is the answer', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = drawItem(rng(s), { skin });
      const it = m.item as unknown as TapAllItem;
      const sy = m.syl;
      const key = (ids: readonly string[]) => [...ids].sort().join();
      expect(key(it.answer)).toBe(key(it.things.filter((t) => !sy.givens.some((g) => breaksGiven(g, t))).map((t) => t.id)));
      expect(it.things.length).toBe(sy.groups.length === 3 ? 8 : 4);
      expect(new Set(it.things.map((t) => flagsOf(t, sy.groups))).size, 'one card in each part').toBe(it.things.length);
      for (const d of it.diagnose ?? []) expect(key(d.ids)).not.toBe(key(it.answer));
      expect(new Set((it.diagnose ?? []).map((d) => key(d.ids))).size).toBe((it.diagnose ?? []).length);
      for (const t of it.things) expect(partOf3(t, sy.groups)).toBeTruthy();
    }
  });

  it('the boards: every mark worked out on real cards', () => {
    const l5 = stop8.lessons[4];
    const [here, twin, star] = l5.drill!;
    // True here, or follows: the givens and the claim on each picture, then the verdict.
    for (const r of here.rows.filter((x) => x.things)) {
      expect(r.marks[0].answer).toBe(L5_MIDDLE.givens.every((g) => holdsC(g, r.things!)) ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(holdsC(L5_MIDDLE.claim, r.things!) ? 'true' : 'false');
    }
    expect(here.rows.find((r) => r.id === 'verdict')!.marks[0].answer).toBe(followsByCards(L5_MIDDLE) ? 'follows' : 'not');
    expect(here.rows.filter((r) => r.things).some((r) => r.marks[1].answer === 'false')).toBe(true);
    expect(here.rows.filter((r) => r.things).some((r) => r.marks[1].answer === 'true')).toBe(true);
    // Draw the givens: each card, then the claim, then the card that breaks it (or where the star goes).
    for (const [b, sy] of [[twin, L5_TWIN], [star, L5_SOME_TWIN]] as const) {
      expect(b.twin?.trim()).toBeTruthy();
      const cardRows = b.rows.filter((r) => r.things);
      expect(cardRows.length).toBe(8);
      for (const r of cardRows) expect(r.marks[0].answer).toBe(sy.givens.some((g) => breaksGiven(g, r.things![0])) ? 'no' : 'yes');
      expect(b.rows.find((r) => r.id === 'claim')!.marks[0].answer).toBe(followsByCards(sy) ? 'follows' : 'not');
      const cardOf = (id: string) => cardRows.find((r) => r.things![0].id === id)!.things![0];
      const br = b.rows.find((r) => r.id === 'break');
      if (br) {
        const t = cardOf(br.marks[0].answer);
        expect(sy.givens.every((g) => holdsC(g, [t])) && !holdsC(sy.claim, [t])).toBe(true);
        for (const o of br.marks[0].options) if (o.id !== br.marks[0].answer) expect(!sy.givens.some((g) => breaksGiven(g, cardOf(o.id))) && !holdsC(sy.claim, [cardOf(o.id)])).toBe(false);
      }
      const sr = b.rows.find((r) => r.id === 'star');
      if (sr) {
        const some = sy.givens.find((g) => g.q === 'some')!;
        const fits = sr.marks[0].options.filter((o) => holdsC(some, [cardOf(o.id)]) && !sy.givens.some((g) => breaksGiven(g, cardOf(o.id))));
        expect(fits.map((o) => o.id)).toEqual([sr.marks[0].answer]);
      }
    }
    // Which ring sits inside which: worked out on real cards. Ring x sits inside ring y when no real card that breaks
    // no given is in x and not in y. The twin's “all” given is given 1.
    const real = KINDS.map((k, i) => ({ id: `k${i}`, ...k }) as Thing);
    const insideByCards = (sy: Syllogism, x: Group, y: Group) => !real.some((t) => !sy.givens.some((g) => breaksGiven(g, t)) && has(t, x) && !has(t, y));
    const ir = twin.rows.find((r) => r.id === 'inside1')!;
    const g1 = L5_TWIN.givens[0];
    expect(ir.marks[0].options.map((o) => o.label)).toEqual([`${ringName(g1.x)} sits inside ${ringName(g1.y)}`, `${ringName(g1.y)} sits inside ${ringName(g1.x)}`]);
    expect(ir.marks[0].answer).toBe(insideByCards(L5_TWIN, g1.x, g1.y) && !insideByCards(L5_TWIN, g1.y, g1.x) ? 'xy' : 'yx');
    expect(ir.marks[0].answer).toBe('xy');
    expect(twin.rows.filter((r) => r.id.startsWith('inside')).length).toBe(L5_TWIN.givens.filter((g) => g.q === 'all').length);
    expect(star.rows.some((r) => r.id.startsWith('inside'))).toBe(false);
    expect(twin.rows.some((r) => r.id === 'break')).toBe(true);
    expect(star.rows.some((r) => r.id === 'star')).toBe(true);
    expect(followsByCards(L5_TWIN)).toBe(false);
    expect(followsByCards(L5_SOME_TWIN)).toBe(false);
  });

  it('the contrast: two pictures that both fit the givens; the claim is true in one and false in the other', () => {
    const sc = hereContrast();
    for (const p of sc.pairs) {
      expect(L5_MIDDLE.givens.every((g) => holdsC(g, p.things!))).toBe(true);
      expect(p.truth).toBe(holdsC(L5_MIDDLE.claim, p.things!));
    }
    expect(sc.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(sc.pairs[0].says).toBe(sc.pairs[1].says);
    const l5 = stop8.lessons[4];
    expect(l5.ideas.flatMap((c) => c.body).join(' ')).toContain('syllogism');
  });
});

// ---------- lesson 6: the second method, the table of who is friends ----------

/** The picture as a table: row = kid, column = friend, true where a line joins them. */
const table = (p: LinkPic) => p.left.map((_, l) => p.right.map((_, r) => p.lines.some(([a, b]) => a === l && b === r)));
const eachT = (t: boolean[][]) => t.every((row) => row.some(Boolean));
const sharedT = (t: boolean[][]) => t[0].some((_, c) => t.every((row) => row[c]));
const truthT = (q: 'each' | 'shared', p: LinkPic) => (q === 'each' ? eachT(table(p)) : sharedT(table(p)));

describe('lesson 6: every and some, worked out again on the table of who is friends', () => {
  it('on every picture of 2-3 kids and 2-3 friends: both sentences match the table, and one friend for all always gives each kid one', () => {
    for (const n of [2, 3]) for (const m of [2, 3]) {
      const left = ['A', 'B', 'C'].slice(0, n), right = ['X', 'Y', 'Z'].slice(0, m);
      const cells: [number, number][] = left.flatMap((_, l) => right.map((_, r) => [l, r] as [number, number]));
      for (let mask = 0; mask < 1 << cells.length; mask++) {
        const p: LinkPic = { left, right, lines: cells.filter((_, i) => mask & (1 << i)) };
        expect(holdsOn('each', p)).toBe(truthT('each', p));
        expect(holdsOn('shared', p)).toBe(truthT('shared', p));
        if (truthT('shared', p)) expect(truthT('each', p)).toBe(true);
        expect(shapeOfPic(p)).toBe(truthT('shared', p) ? 'shared' : truthT('each', p) ? 'each' : 'gap');
      }
    }
  });

  const picOf = (it: Item, k = 0): LinkPic => {
    const f = (it.scene as Rings).links![k];
    return { left: f.left, right: f.right, lines: f.lines };
  };

  it('is the sentence true? The answer is the table’s; the trap is “every kid has a friend” with a different friend for each kid (true)', () => {
    const seen = new Set<string>();
    for (const skin of S8_SKINS) for (const q of ['each', 'shared'] as const) for (let s = 1; s <= SEEDS; s++) {
      const m = orderTruthItem(rng(s), { skin, q });
      const it = m.item as unknown as ChooseItem;
      const p = picOf(it);
      expect(p).toEqual(m.pic);
      expect(it.answer).toBe(truthT(q, p) ? 'true' : 'false');
      seen.add(`${q}-${it.answer}`);
      expect(it.prompt).toContain(q === 'each' ? CASTS[skin].each : CASTS[skin].shared);
      expect((it.scene as Rings).rings).toEqual(CASTS[skin].rings);
      expect(it.feedback![it.answer === 'true' ? 'false' : 'true'].headline).toMatch(/^Your answer says (true|false), but /);
    }
    expect([...seen].sort()).toEqual(['each-false', 'each-true', 'shared-false', 'shared-true']);
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const it = orderTruthItem(rng(s), { skin, q: 'each', trap: true }).item as unknown as ChooseItem;
      const t = table(picOf(it));
      expect(eachT(t)).toBe(true);
      expect(sharedT(t)).toBe(false);
      expect(it.answer).toBe('true');
      expect(it.conflict).toBe(true);
      expect(it.tags).toEqual([EACH_NOT_SHARED.tag]);
      expect(it.feedback!.false.detail.join(' ')).toContain('does not need one');
    }
  });

  it('which sentences are true: worked out on the table; “only one friend of every kid” never is', () => {
    const seen = new Set<string>();
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const it = orderWhichItem(rng(s), { skin }).item as unknown as ChooseItem;
      const t = table(picOf(it));
      const want = eachT(t) ? (sharedT(t) ? 'both' : 'each') : 'neither';
      expect(it.answer).toBe(want);
      seen.add(want);
      expect(it.choices.map((c) => c.id)).toEqual(['both', 'each', 'shared', 'neither']);
      expect(it.feedback!.shared.detail.join(' ')).toContain('can’t happen');
    }
    expect([...seen].sort()).toEqual(['both', 'each', 'neither']);
  });

  it('which picture: exactly one of three pictures (the same names, other lines) makes the sentence true', () => {
    for (const skin of S8_SKINS) for (const q of ['each', 'shared'] as const) for (let s = 1; s <= SEEDS; s++) {
      const m = orderPictureItem(rng(s), { skin, q }) as OrderMade;
      const it = m.item as unknown as ChooseItem;
      const frames = (it.scene as Rings).links!;
      expect(frames.map((f) => f.name)).toEqual(['Picture 1', 'Picture 2', 'Picture 3']);
      expect(it.choices.map((c) => c.label)).toEqual(['Picture 1', 'Picture 2', 'Picture 3']);
      const fits = frames.map((_, k) => truthT(q, picOf(it, k)));
      expect(fits.filter(Boolean).length).toBe(1);
      expect(it.choices[fits.indexOf(true)].id).toBe(it.answer);
      for (const f of frames) expect([f.left, f.right]).toEqual([frames[0].left, frames[0].right]);
      expect(new Set(frames.map((f) => JSON.stringify(f.lines))).size).toBe(3);
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id].headline).toMatch(/^Your picture breaks it/);
    }
  });

  it('which new line: exactly one offered line makes “one friend of every kid” true on the table', () => {
    for (const skin of S8_SKINS) for (let s = 1; s <= SEEDS; s++) {
      const m = orderLineItem(rng(s), { skin });
      const it = m.item as unknown as ChooseItem;
      const p = picOf(it);
      expect(sharedT(table(p))).toBe(false);
      const fix = it.choices.filter((c) => {
        const [, l, r] = c.id.match(/^l(\d+)r(\d+)$/)!.map(Number);
        expect(table(p)[l][r], 'a new line').toBe(false);
        expect(c.label).toBe(`A line from ${p.left[l]} to ${p.right[r]}`);
        return sharedT(table({ ...p, lines: [...p.lines, [l, r]] }));
      });
      expect(fix.map((c) => c.id)).toEqual([it.answer]);
      expect(it.choices.length).toBe(3);
    }
  });

  it('the boards and the contrast: every mark from the table', () => {
    const l6 = stop8.lessons[5];
    const [board, twin] = l6.drill!;
    board.rows.forEach((r, k) => {
      expect(r.marks[0].answer).toBe(truthT('each', L6_BOARD_PICS[k]) ? 'true' : 'false');
      expect(r.marks[1].answer).toBe(truthT('shared', L6_BOARD_PICS[k]) ? 'true' : 'false');
    });
    expect(new Set(board.rows.map((r) => r.marks.map((m) => m.answer).join())).size).toBe(3);
    const t = table(L6_TWIN);
    for (const r of twin.rows) {
      const m = r.marks[0];
      if (r.id.startsWith('k')) expect(m.answer).toBe(t[Number(r.id.slice(1)) - 1].some(Boolean) ? 'yes' : 'no');
      else if (r.id.startsWith('f')) expect(m.answer).toBe(t.every((row) => row[Number(r.id.slice(1)) - 1]) ? 'yes' : 'no');
      else expect(m.answer).toBe(truthT(r.id as 'each' | 'shared', L6_TWIN) ? 'true' : 'false');
    }
    const sc = orderContrast();
    expect(sc.pairs[0].world).toBe(sc.pairs[1].world);
    expect(sc.pairs.map((p) => p.truth)).toEqual([truthT('each', L6_PAIR), truthT('shared', L6_PAIR)]);
    expect(sc.pairs.map((p) => p.truth)).toEqual([true, false]);
  });
});

describe('the new pictures, read aloud', () => {
  it('three rings: the rings, each part that holds a card, the circled card and the crossed parts; links: the groups, each line, anyone alone', () => {
    const l5 = stop8.lessons[4];
    const br = ringsSpeech(l5.ideas[4].scene as Rings);
    expect(br[0]).toBe('Three rings that overlap: Circles, Red and Big.');
    expect(br).toContain('In the Circles and Red rings only: small red circle.');
    expect(br).toContain('Circled: small red circle.');
    expect(br.some((l) => l.startsWith('Gray, so no card can be here: only in the Circles ring'))).toBe(true);
    const star = ringsSpeech(l5.ideas[6].scene as Rings);
    expect(star).toContain('A star, so a card must be here: in all three rings.');
    const l6 = stop8.lessons[5];
    const kids = ringsSpeech(l6.ideas[0].scene as Rings);
    expect(kids).toEqual(['Two rings side by side: Kids and Friends. A line joins two names.', 'Kids: Ava, Ben and Cal. Friends: Kim and Lia.', 'Ava: a line to Kim.', 'Ben: a line to Lia.', 'Cal: a line to Kim.']);
    // Every part of a long gray list is its own sentence.
    expect(br.filter((l) => l.startsWith('Also gray: ')).length).toBe((l5.ideas[4].scene as Rings).crossed!.length - 1);
    const gap = ringsSpeech({ kind: 'rings', rings: ['Kids', 'Friends'], a: [], both: [], b: [], out: [], links: [{ name: 'Picture 3', left: ['Ava', 'Ben'], right: ['Kim'], lines: [[0, 0]] }] });
    expect(gap).toContain('Ben has no line.');
    expect(gap[1].startsWith('Picture 3. Kids: Ava and Ben.')).toBe(true);
  });

  it('every new item kind keeps its model: the same seed gives the same item', () => {
    const makers: ((r: ReturnType<typeof rng>) => SylMade | OrderMade)[] = [
      (r) => drawItem(r, { skin: 'abstract' }),
      (r) => followsItem(r, { skin: 'everyday' }),
      (r) => breakItem(r, { skin: 'everyday' }),
      (r) => orderTruthItem(r, { skin: 'fantasy', q: 'shared' }),
      (r) => orderPictureItem(r, { skin: 'everyday', q: 'each' }),
      (r) => orderLineItem(r, { skin: 'abstract' }),
    ];
    for (const make of makers) for (let s = 1; s <= 20; s++) expect(make(rng(s))).toEqual(make(rng(s)));
  });
});
