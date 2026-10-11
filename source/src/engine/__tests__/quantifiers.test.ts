/**
 * Stop 9 · All, Some, None (id s8). Every answer is worked out again here by counting cards feature by feature, without
 * calling the statement engine that set it: a card is in a group when its feature has the group's value, and a sentence
 * is true by how many cards sit in each part of the rings.
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
import type { ChooseItem, DrillStep, Item, Scene, TapAllItem, Thing } from '../types';

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
    };
    const trap: Record<string, string> = { 's8.l1': IN_BOTH.tag, 's8.l2': SOME_ALL.tag, 's8.l3': NOT_ALL_NONE.tag, 's8.l4': EMPTY_ALL.tag };
    const skinOf = (it: Item) => (/^These cards|^Here is a sentence/.test(it.prompt) ? 'abstract' : /magic|^The (wizard|dragon|troll|fairy|giant|elf)/.test(it.prompt) ? 'fantasy' : 'everyday');
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
    expect(terms).toEqual({ 's8.l1': ['set', 'overlap'], 's8.l2': ['all', 'some', 'none'], 's8.l3': ['opposite', 'not all', 'counterexample'], 's8.l4': ['empty set'] });
    for (const l of stop8.lessons) {
      const said = l.ideas.flatMap((c) => c.body).join(' ').toLowerCase();
      for (const t of l.terms ?? []) {
        expect(t.means).toMatch(/^[A-Z].*[.!?]$/);
        expect(said, `${l.id} names ${t.term}`).toContain(t.term.split(' ')[0]);
      }
    }
  });

  it('skill names: one for every skill the stop asks about', () => {
    expect(Object.keys(stop8.skillNames ?? {}).sort()).toEqual(['s8.empty', 's8.member', 's8.negate', 's8.quantify', 's8.why']);
  });
});

describe('the check', () => {
  it('9 items: two per lesson in order, then the why item last, from the lesson its reason teaches', () => {
    const fams = new Set<string>();
    for (let s = 1; s <= 300; s++) {
      const items = stop8.check!(rng(s));
      expect(items.length).toBe(9);
      expect(items.slice(0, 8).map((i) => i.lesson)).toEqual(['s8.l1', 's8.l1', 's8.l2', 's8.l2', 's8.l3', 's8.l3', 's8.l4', 's8.l4']);
      const last = items[8];
      expect(last.tags).toEqual(['why']);
      expect(last.skill).toBe('s8.why');
      const fam = (Object.keys(WHY_LESSON) as WhyFamily[]).find((f) => WHY_LESSON[f] === last.lesson)!;
      fams.add(fam);
      expect(items[3].conflict && items[3].tags?.includes(SOME_ALL.tag)).toBe(true);
      expect(items[4].tags).toEqual([NOT_ALL_NONE.tag]);
      expect(items[6].conflict && items[6].tags?.includes(EMPTY_ALL.tag)).toBe(true);
      expect(items.slice(0, 8).some((i) => i.tags?.includes('why'))).toBe(false);
      expect(stop8.check!(rng(s))).toEqual(items);
    }
    expect([...fams].sort()).toEqual(['counter', 'empty', 'some-all']);
  });

  it('Arcade items are valid and come from every lesson; new examples after a miss are new, with both answers for true-or-false', () => {
    const lessons = new Set<string>();
    for (let s = 1; s <= 200; s++) {
      const it = stop8.practice!(rng(s));
      lessons.add(it.lesson);
      if (it.kind === 'choose') expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
    }
    expect([...lessons].sort()).toEqual(['s8.l1', 's8.l2', 's8.l3', 's8.l4']);
    for (let s = 1; s <= 60; s++) {
      for (const missed of [...stop8.lessons.flatMap((l) => l.practice(rng(s))), stop8.check!(rng(s))[8]]) {
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
    const want = [IN_VS_ONLY, SOME_VS_NOT_ALL, NOT_ALL_VS_NONE, BREAK_VS_MAKE];
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
      // The panels' truths, counted on their cards.
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
      expect(r.a.length + r.both.length + r.b.length + r.out.length).toBeGreaterThan(0);
      if (r.rings.length === 1) {
        expect(r.a.length).toBeLessThanOrEqual(ONE_RING_CAP.in);
        expect(r.out.length).toBeLessThanOrEqual(ONE_RING_CAP.out);
      }
    }
    const cards = new Set(CARD_SCENES().map((s) => JSON.stringify(s)));
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
    ];
    for (const make of makers) for (let s = 1; s <= 20; s++) expect(make(rng(s)).item).toEqual(make(rng(s)).item);
  });
});
