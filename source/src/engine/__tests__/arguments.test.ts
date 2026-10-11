/**
 * Stop 2 · Arguments (id s18). Every answer is worked out again here by a second method: each sentence is read back
 * from the words on the screen (the topic’s own words, never the engine’s forms), and an argument is judged over
 * small worlds of two things (the one the argument is about, and one more), not over the engine’s four cases. Then the
 * packs, the check (the why item last), the boards, the contrast cards, the bridge, the words and the reading level.
 * Last, the rule families: every family a pack can draw (given 1’s “All” or “No”, what given 2 says, and the verdict),
 * read back from the items’ own words, is worked on a card and marked on a board in its lesson, the card first.
 */
import { describe, expect, it } from 'vitest';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { stop18 } from '../../content/stop18';
import { stopById } from '../../content/stops';
import { S18_WORLD } from '../../content/world/s18';
import { SOON_WORLD, WORLD } from '../../content/world';
import { SceneView } from '../../game/components/SceneView';
import { sceneSpeech } from '../../game/speech';
import {
  BELIEVABLE,
  CANT_SHAPES,
  CASES,
  EVERYDAY,
  FANTASY,
  FOLLOW_SHAPES,
  GLORP,
  GOLDIE_ROWS,
  L1_CARDS,
  L2_CARDS,
  L3_CARDS,
  L4_CARDS,
  LEAK_SHAPES,
  REAL,
  SHAPES,
  SHAPE_IDS,
  SOLID_ROWS,
  STATUS_CHOICES,
  TF_ROWS,
  WORKED_TOPICS,
  W_GLORP,
  believableItem,
  claimItem,
  flipShape,
  followsItem,
  formItem,
  givensItem,
  solidItem,
  swapShape,
  twinItem,
  whyItem,
  type ArgMade,
  type Prop,
  type SolidWant,
  type Topic,
} from '../puzzles/arguments';
import { VERDICT_CHOICES } from '../puzzles/statements';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, DrillStep, Item, LessonDef, MultiItem, Scene } from '../types';

const SEEDS = 200;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const chooseOf = (m: ArgMade) => m.item as ChooseItem;

// ---------- the second method: read the words back, then judge over small worlds ----------

/** A sentence read back from its words: a fact about the thing, or “All … are …” / “No … is …”. */
type Read = { t: 'fact'; r: 'a' | 'b'; v: boolean } | { t: 'all'; v: boolean };

/** Read a sentence of a topic, with the second fact p (the topic’s b or n). null when the words are not one of its sentences. */
function readWith(t: Topic, p: Prop, text: string): Read | null {
  const [one, many] = t.a.noun!;
  if (text === `All ${many} ${p.are}.`) return { t: 'all', v: true };
  if (text === `No ${one} ${p.is}.`) return { t: 'all', v: false };
  const who = cap(t.who);
  for (const [r, q] of [['a', t.a], ['b', p]] as const) {
    if (text === `${who} ${q.is}.`) return { t: 'fact', r, v: true };
    if (text === `${who} ${q.isNot}.`) return { t: 'fact', r, v: false };
  }
  return null;
}

/** Read every sentence of an argument (the givens, then the claim), trying b, then n, as the second fact. */
function readArg(t: Topic, texts: readonly string[]): Read[] {
  for (const p of [t.b, ...(t.n ? [t.n] : [])]) {
    const out = texts.map((x) => readWith(t, p, x));
    if (out.every(Boolean)) return out as Read[];
  }
  throw new Error(`could not read “${texts.join(' ')}” with ${t.id}`);
}

/** A world: the thing the argument is about (first) and one more thing, each an a or not, and b or not. */
type Thing = { a: boolean; b: boolean };
const KINDS: Thing[] = [{ a: true, b: true }, { a: true, b: false }, { a: false, b: true }, { a: false, b: false }];
const WORLDS: Thing[][] = KINDS.flatMap((x) => KINDS.map((y) => [x, y]));
/** “All a are b” is about every thing in the world; a fact is about the first thing. */
const trueIn = (f: Read, w: Thing[]) => (f.t === 'fact' ? w[0][f.r] === f.v : w.every((x) => !x.a || x.b === f.v));

/** Must, might or can’t: over every world where all the givens are true, is the claim always, sometimes or never true? */
function judge(givens: readonly Read[], claim: Read): 'must' | 'might' | 'cant' {
  const fit = WORLDS.filter((w) => givens.every((g) => trueIn(g, w)));
  expect(fit.length, 'the givens can all be true').toBeGreaterThan(0);
  const t = fit.filter((w) => trueIn(claim, w)).length;
  return t === fit.length ? 'must' : t === 0 ? 'cant' : 'might';
}

/** Is a sentence really true? From the topic’s own list of what is really true. */
function really(t: Topic, f: Read): boolean {
  const r = t.real!;
  if (f.t === 'all') {
    expect(f.v, 'no real “No …” sentence').toBe(true);
    return r.all;
  }
  return (f.r === 'a' ? r.a : r.b) === f.v;
}

/** The topic of an argument scene, found by its words. */
const ALL_TOPICS: Topic[] = [...EVERYDAY, ...FANTASY, ...REAL, ...BELIEVABLE];
function topicOf(m: ArgMade): Topic {
  return m.arg.topic;
}
const argScene = (it: Item) => it.scene as Extract<Scene, { kind: 'argument' }>;
/** Read the scene an item shows. */
function readScene(it: Item, t: Topic) {
  const s = argScene(it);
  const forms = readArg(t, [...s.givens, s.claim]);
  return { givens: forms.slice(0, -1), claim: forms[forms.length - 1] };
}

// ---------- the stories (Lesson 1), read back ----------

const CLAIM_SIGNS = [/^So /, /^That means /, / must /];
/** Read a story line back into a sentence of the topic: drop its signpost words. */
function plainLine(t: Topic, text: string): string {
  let s = text.replace(/^So /, '').replace(/^That means /, '').replace(/^This is because /, '').replace(/^We know this since /, '');
  const must = / must (.+)\.$/.exec(s);
  if (must) {
    const p = [t.a, t.b, ...(t.n ? [t.n] : [])].find((q) => q.be === must[1])!;
    s = `${cap(t.who)} ${p.is}.`;
  }
  return cap(s);
}

describe('the model, read back from its words', () => {
  it('every topic’s sentences read back, and every shape is judged the same way over small worlds', () => {
    for (const t of [...ALL_TOPICS, ...WORKED_TOPICS]) {
      expect(t.a.noun, t.id).toBeDefined();
      for (const p of [t.b, ...(t.n ? [t.n] : [])]) {
        expect(readWith(t, p, `All ${t.a.noun![1]} ${p.are}.`)).toEqual({ t: 'all', v: true });
        expect(readWith(t, p, `${cap(t.who)} ${p.isNot}.`)).toEqual({ t: 'fact', r: 'b', v: false });
      }
    }
  });

  it('real topics: what is said to be really true hangs together (an a that is not b means not every a is b)', () => {
    for (const t of [...REAL, ...WORKED_TOPICS.filter((x) => x.real)]) {
      const r = t.real!;
      if (r.a && !r.b) expect(r.all, t.id).toBe(false);
      for (const w of Object.values(r.why)) expect(w.trim().length, t.id).toBeGreaterThan(5);
    }
  });

  it('“Might be true or false” is Stop 1’s “Can’t tell”, with the same apostrophe', () => {
    const might = STATUS_CHOICES.find((c) => c.id === 'might')!;
    const s1 = VERDICT_CHOICES.find((c) => c.id === 'cant')!;
    expect(might.label.toLowerCase()).toContain(s1.label.toLowerCase());
    expect(STATUS_CHOICES.map((c) => c.id)).toEqual(['must', 'might', 'cant']);
  });
});

describe('every kind: the answer is the only choice the second method makes right', () => {
  it('tap every given: the statements that back the claim, each one needed; the claim and the other sentences are not', () => {
    for (const skin of ['everyday', 'fantasy'] as const) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = givensItem(createRng(seed), { skin, claimFirst: seed % 3 === 0 });
      const it = m.item as MultiItem;
      const t = topicOf(m);
      const others = new Set(t.others.map((o) => o.text));
      const statements = it.choices.filter((c) => !others.has(c.label));
      const claims = statements.filter((c) => CLAIM_SIGNS.some((r) => r.test(c.label)));
      expect(claims.length, `${skin} ${seed}: one claim`).toBe(1);
      const givens = statements.filter((c) => c !== claims[0]);
      expect([...it.answer].sort()).toEqual(givens.map((c) => c.id).sort());
      // The givens force the claim, and each given is needed.
      const read = readArg(t, [...givens.map((g) => plainLine(t, g.label)), plainLine(t, claims[0].label)]);
      const gs = read.slice(0, -1), claim = read[read.length - 1];
      expect(judge(gs, claim), `${skin} ${seed}`).toBe('must');
      gs.forEach((_, k) => expect(judge(gs.filter((_, j) => j !== k), claim)).not.toBe('must'));
      // Every card that is not a given has a tip, and every given left out has one.
      for (const c of it.choices) expect((it.answer.includes(c.id) ? it.missTips : it.pickTips)?.[c.id]?.trim(), c.id).toBeTruthy();
      expect(it.choices.length).toBeGreaterThanOrEqual(4);
      expect(it.choices.length).toBeLessThanOrEqual(6);
      if (seed % 3 === 0) {
        expect(it.choices[0].id).toBe('claim');
        expect(it.tags).toContain('claim-first');
      }
    }
  });

  it('which is the claim: the statement with the claim’s signpost; the trap puts it first', () => {
    const at = new Set<number>();
    for (const skin of ['everyday', 'fantasy'] as const) for (let seed = 1; seed <= SEEDS; seed++) {
      const first = seed % 2 === 0;
      const m = claimItem(createRng(seed), { skin, claimFirst: first });
      const it = chooseOf(m);
      const lines = (it.scene as Extract<Scene, { kind: 'text' }>).lines;
      const right = it.choices.filter((c) => CLAIM_SIGNS.some((r) => r.test(c.label)));
      expect(right.map((c) => c.id), `${skin} ${seed}`).toEqual([it.answer]);
      at.add(it.choices.findIndex((c) => c.id === it.answer));
      if (first) {
        expect(lines[0]).toBe(right[0].label);
        expect(it.conflict).toBe(true);
        expect(it.tags).toEqual(['claim-first']);
        // The last statement is a given, and picking it is named as the trap.
        const lastStatement = [...lines].reverse().find((l) => it.choices.some((c) => c.label === l))!;
        const id = it.choices.find((c) => c.label === lastStatement)!.id;
        expect(it.feedback![id].headline).toContain('the claim comes first');
      } else expect(it.tags ?? []).toEqual([]);
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id].headline).toBeTruthy();
    }
    expect(at.size, 'the claim is not always in the same place').toBe(3);
  });

  it('must, might or can’t: the second method’s verdict; the trap is a claim true in the story that is not forced', () => {
    const seen = new Set<string>();
    for (const skin of ['everyday', 'fantasy'] as const) for (const target of ['must', 'might', 'cant'] as const) for (let seed = 1; seed <= SEEDS / 2; seed++) {
      const trap = target === 'might' && seed % 2 === 0;
      const m = followsItem(createRng(seed), { skin, target, trap });
      const it = chooseOf(m);
      const { givens, claim } = readScene(it, topicOf(m));
      const v = judge(givens, claim);
      expect(it.answer, `${skin} ${target} ${seed}`).toBe(v);
      expect(v).toBe(target);
      seen.add(`${target}:${it.choices.findIndex((c) => c.id === it.answer)}`);
      if (trap) {
        expect(it.prompt).toContain(`In the story, it is true that ${argScene(it).claim.replace(/^./, (c) => (m.arg.topic.who.charAt(0) === c ? c : c.toLowerCase())).replace(/\.$/, '')}.`);
        expect(it.conflict).toBe(true);
        expect(it.tags).toEqual(['true-not-forced']);
        expect(it.feedback!.must.detail.join(' ')).toContain('true is not the same as following');
      }
      // Each wrong status is named, with a case that shows it.
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id].example, c.id).toBeDefined();
      // The hint’s case is crossed out, so it never gives the answer away.
      expect(it.hintCase!.note).toMatch(/^It breaks given \d, so cross it out\.$/);
    }
    expect(seen.size).toBe(3);
  });

  it('made-up words: it follows exactly when the second method says must; the third choice is the “you need the words” belief', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = formItem(createRng(seed), { follows: seed % 2 === 0 });
      const it = chooseOf(m);
      const { givens, claim } = readScene(it, topicOf(m));
      expect(it.answer, `${seed}`).toBe(judge(givens, claim) === 'must' ? 'follows' : 'not');
      expect(it.answer).toBe(seed % 2 === 0 ? 'follows' : 'not');
      expect(it.choices.map((c) => c.id)).toEqual(['follows', 'not', 'check']);
      expect(it.feedback!.check.headline).toContain('you don’t');
      expect(m.arg.topic.skin).toBe('nonsense');
      expect(JSON.stringify(it)).not.toMatch(/glorp/i);
    }
  });

  it('made-up words come with a plain-word twin of the same shape and the same answer (read back, second method)', () => {
    const plain = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = formItem(createRng(seed));
      const it = chooseOf(m);
      const target = readScene(it, topicOf(m));
      const card = it.teach!.cases!.find((c) => c.label.startsWith('The same shape in plain words: '))!;
      expect(card, `${seed}: the twin card`).toBeDefined();
      const parts = /“(.+)”$/.exec(card.label)![1].replace(/ So (.+)$/, ' $1').split(/(?<=\.) /).map(cap);
      const t = [...EVERYDAY, ...FANTASY].find((x) => readArgSafe(x, parts))!;
      expect(t, card.label).toBeDefined();
      plain.add(t.id);
      const forms = readArg(t, parts);
      expect(JSON.stringify(forms), card.label).toBe(JSON.stringify([...target.givens, target.claim]));
      expect(card.truths![0].value).toBe(judge(forms.slice(0, 2), forms[2]) === 'must');
      expect(card.truths![0].value).toBe(it.answer === 'follows');
    }
    expect(plain.size, 'the twins use many plain topics').toBeGreaterThanOrEqual(8);
  });

  it('it sounds right: plain words that do not follow are the trap; the second method agrees', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const f = seed % 4 === 0;
      const m = believableItem(createRng(seed), { follows: f });
      const it = chooseOf(m);
      const { givens, claim } = readScene(it, topicOf(m));
      expect(it.answer).toBe(judge(givens, claim) === 'must' ? 'follows' : 'not');
      expect(it.answer).toBe(f ? 'follows' : 'not');
      if (!f) {
        expect(it.tags).toEqual(['sounds-right']);
        expect(it.conflict).toBe(true);
      }
      expect(WORKED_TOPICS).not.toContain(m.arg.topic);
    }
  });

  it('same shape: swap the words back and only the answer reads the same, part by part', () => {
    const at = new Set<number>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = twinItem(createRng(seed));
      const it = chooseOf(m);
      const target = readScene(it, topicOf(m));
      const want = JSON.stringify([...target.givens, target.claim]);
      const plain = Object.values(m.twins!)[0].topic;
      for (const c of it.choices) {
        const parts = c.label.replace(/ So (.+)$/, ' $1').split(/(?<=\.) /);
        expect(parts.length, c.label).toBe(3);
        const got = JSON.stringify(readArg(plain, [parts[0], parts[1], cap(parts[2])]));
        expect(got === want, `${seed}: ${c.label}`).toBe(c.id === it.answer);
      }
      at.add(it.choices.findIndex((c) => c.id === it.answer));
      expect(it.seconds).toBe(120);
    }
    expect(at.size).toBe(3);
  });

  it('solid: it follows (second method) and every given is really true; the trap is a false given that still follows', () => {
    const wants: SolidWant[] = ['solid', 'false-given', 'true-claim', 'not'];
    for (const want of wants) for (let seed = 1; seed <= SEEDS / 2; seed++) {
      const m = solidItem(createRng(seed), { want });
      const it = chooseOf(m);
      const t = topicOf(m);
      const { givens, claim } = readScene(it, t);
      const follows = judge(givens, claim) === 'must';
      const allTrue = givens.every((g) => really(t, g));
      expect(it.answer, `${want} ${seed}`).toBe(follows && allTrue ? 'solid' : follows ? 'unsound' : 'not');
      if (want === 'false-given') expect(it.tags).toEqual(['false-given']);
      if (want === 'true-claim') {
        expect(follows).toBe(false);
        expect(allTrue && really(t, claim)).toBe(true);
        expect(it.conflict).toBe(true);
      }
      expect(WORKED_TOPICS).not.toContain(t);
    }
  });

  it('why: the reason is “the givens force it” when it follows, and “a case left breaks it” when it does not', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = whyItem(createRng(seed));
      const it = chooseOf(m);
      const { givens, claim } = readScene(it, topicOf(m));
      const follows = judge(givens, claim) === 'must';
      expect(it.answer).toBe(follows ? 'force' : 'leak');
      expect(it.tags).toEqual(['why']);
      for (const c of it.choices) expect(c.label.length).toBeGreaterThan(12);
      if (!follows) expect(givens.every((g) => really(m.arg.topic, g)) && really(m.arg.topic, claim)).toBe(true);
    }
  });

  it('every item: 2-5 distinct choices, feedback for each wrong one and none for the right one, a hint case and teaching; same seed, same item', () => {
    const makers: ((seed: number) => ArgMade)[] = [
      (s) => givensItem(createRng(s), { skin: 'everyday' }),
      (s) => claimItem(createRng(s), { skin: 'fantasy' }),
      (s) => followsItem(createRng(s), { skin: 'everyday' }),
      (s) => formItem(createRng(s)),
      (s) => believableItem(createRng(s)),
      (s) => twinItem(createRng(s)),
      (s) => solidItem(createRng(s), { want: 'not' }),
      (s) => whyItem(createRng(s)),
    ];
    for (const make of makers) for (let seed = 1; seed <= 60; seed++) {
      const m = make(seed);
      expect(make(seed)).toEqual(m);
      const it = m.item;
      expect(it.hintCase).toBeDefined();
      expect(it.teach?.cases?.length).toBeGreaterThanOrEqual(2);
      expect(new Set(it.choices.map((c) => c.label)).size).toBe(it.choices.length);
      if (it.kind !== 'choose') continue;
      for (const c of it.choices) {
        if (c.id === it.answer) expect(it.feedback?.[c.id]).toBeUndefined();
        else expect(it.whyWrong![c.id]).toContain(it.feedback![c.id].headline);
      }
    }
  });
});

// ---------- the stop: packs, check, Arcade, new examples, warm-up ----------

const SKINS_OF = (it: Item): string => {
  if (it.prompt.startsWith('This argument uses made-up words')) return 'nonsense';
  if (it.prompt.startsWith('Think about the real world')) return 'real';
  const t = ALL_TOPICS.find((x) => it.prompt.startsWith(x.setting) && x.setting !== 'Read this argument.');
  return t?.skin ?? 'everyday';
};

describe('the packs', () => {
  const tags: Record<string, string> = { 's18.l1': 'claim-first', 's18.l2': 'true-not-forced', 's18.l3': 'sounds-right', 's18.l4': 'false-given' };
  it('each pack: 4 items (5 in Lesson 4: both whys), its trap, two or more skins, no repeats, the same for the same seed; the pass rule asks for the trap', () => {
    for (const l of stop18.lessons) {
      expect(l.pass?.include?.map((g) => g.tag)).toEqual([tags[l.id]]);
      expect(l.pass?.firstTry).toBe(3);
      for (let seed = 1; seed <= SEEDS; seed++) {
        const items = l.practice(createRng(seed));
        expect(items.length).toBe(l.id === 's18.l4' ? 5 : 4);
        expect(items.some((it) => it.tags?.includes(tags[l.id])), `${l.id} ${seed}: the trap`).toBe(true);
        expect(new Set(items.map(looks)).size).toBe(items.length);
        expect(new Set(items.map(SKINS_OF)).size, `${l.id} ${seed}: skins`).toBeGreaterThanOrEqual(2);
        expect(l.practice(createRng(seed))).toEqual(items);
        for (const it of items) expect(it.lesson).toBe(l.id);
      }
    }
  });

  it('the skills: given and claim, follows, form, sound and why, each with a plain name', () => {
    const skills = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) for (const l of stop18.lessons) for (const it of l.practice(createRng(seed))) skills.add(`${l.id} ${it.skill}`);
    expect([...skills].sort()).toEqual(['s18.l1 s18.claim', 's18.l1 s18.given', 's18.l2 s18.follows', 's18.l3 s18.form', 's18.l4 s18.sound', 's18.l4 s18.why']);
    for (const s of ['s18.given', 's18.claim', 's18.follows', 's18.form', 's18.sound', 's18.why']) expect(stop18.skillNames?.[s], s).toBeTruthy();
  });

  it('each skill has many different-looking items, so a new example after a miss looks new', () => {
    const seen: Record<string, Set<string>> = {};
    for (let seed = 1; seed <= SEEDS; seed++) for (const l of stop18.lessons) for (const it of l.practice(createRng(seed))) (seen[it.skill] ??= new Set()).add(looks(it));
    for (const [skill, s] of Object.entries(seen)) expect(s.size, skill).toBeGreaterThanOrEqual(30);
  });
});

describe('the check', () => {
  it('9 items, two per lesson in order, conflict items, the why item last; a new check on every seed', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop18.check!(createRng(seed));
      expect(items.map((i) => i.lesson)).toEqual(['s18.l1', 's18.l1', 's18.l2', 's18.l2', 's18.l3', 's18.l3', 's18.l4', 's18.l4', 's18.l4']);
      expect(items[3].conflict && items[6].conflict).toBe(true);
      const last = items[8] as ChooseItem;
      expect(last.tags).toEqual(['why']);
      expect(last.skill).toBe('s18.why');
      expect(items.slice(0, 8).every((i) => !i.tags?.includes('why'))).toBe(true);
      expect(new Set(items.map(looks)).size).toBe(9);
      expect(stop18.check!(createRng(seed))).toEqual(items);
      seen.add(JSON.stringify(items.map((i) => [i.prompt, i.scene])));
    }
    expect(seen.size).toBeGreaterThanOrEqual(295);
  });

  it('no quiz, check or Arcade item uses a worked example’s topic or a card’s picture', () => {
    const pictures = new Set(stop18.lessons.flatMap((l) => l.ideas.flatMap((c) => (c.scene ? [JSON.stringify(c.scene)] : []))));
    for (let seed = 1; seed <= 80; seed++) {
      const all = [...stop18.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop18.check!(createRng(seed)), stop18.practice!(createRng(seed))];
      for (const it of all) {
        expect(pictures.has(JSON.stringify(it.scene))).toBe(false);
        const words = JSON.stringify(it.scene);
        // The worked examples’ own words: the glorps, Dot, Goldie, Pip, Zed, Rex, Juno the hen, Nox and the daxes, and the
        // penguin, sun, duck, cow and owl.
        expect(words).not.toMatch(/glorp|ladybug|goldfish|penguin|\bthe sun is\b|\ba duck\b|\ba cow\b|\ban owl\b|dogs out in the rain|\bhens?\b|\bdax(es)?\b|\b(Pip|Dot|Goldie|Zed|Rex|Juno|Nox)\b/i);
        for (const t of WORKED_TOPICS) expect(ALL_TOPICS.some((x) => x.id === t.id || (x.who === t.who && x.a.noun![0] === t.a.noun![0])), `${t.id} is also a quiz topic`).toBe(false);
      }
    }
  });
});

describe('new examples, the Arcade and the warm-up', () => {
  it('a missed claim, status, follows or solid answer gets one example like it and one with another answer', () => {
    for (let seed = 1; seed <= 60; seed++) for (const l of stop18.lessons) for (const missed of l.practice(createRng(seed))) {
      const out = stop18.fresh!(missed, createRng(seed + 1000));
      expect(out.length, missed.skill).toBeGreaterThan(0);
      for (const x of out) {
        expect(x.lesson).toBe(missed.lesson);
        expect(looks(x)).not.toBe(looks(missed));
      }
      if (out.length === 2 && missed.kind === 'choose') {
        const a = out.map((x) => (x as ChooseItem).answer);
        if (['s18.claim'].includes(missed.skill)) expect(out[0].tags).toContain('claim-first');
        else expect(a[0], `${missed.skill} ${seed}`).not.toBe(a[1]);
        expect(out.some((x) => x.skill === missed.skill)).toBe(true);
      }
    }
  });

  it('Arcade items come from every lesson', () => {
    const lessons = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) lessons.add(stop18.practice!(createRng(seed)).lesson);
    expect([...lessons].sort()).toEqual(['s18.l1', 's18.l2', 's18.l3', 's18.l4']);
  });

  it('the warm-up is a Stop 1 card question about one sentence of a story: true, false or can’t tell; never this stop’s', () => {
    const answers = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const it = stop18.bridge!(createRng(seed)) as ChooseItem;
      expect(it.stop).toBe(1);
      expect(it.lesson).toBe('s1.l2');
      expect(it.choices.map((c) => c.id)).toEqual(['true', 'false', 'cant']);
      expect(it.skill).toBe(it.answer === 'cant' ? 's1.cant-tell' : 's1.check-cards');
      expect(it.prompt).toMatch(/ says, “.+” Is that true, false, or can’t you tell yet\?$/);
      expect(stopById('s1')!.lessons.some((l) => l.id === it.lesson)).toBe(true);
      answers.add(it.answer);
      expect(stop18.bridge!(createRng(seed))).toEqual(it);
    }
    expect(answers.size).toBe(3);
  });
});

// ---------- See and Do: the cards and the boards ----------

/** Read a case row (“Case 2: Pip is a bird. Pip does not have feathers.”) back into the thing’s two facts. */
function readCase(t: Topic, label: string): { k: number; thing: Thing } {
  const m = /^Case (\d): (.+)$/.exec(label)!;
  const [fa, fb] = m[2].split(/(?<=\.) /);
  const reads = [t.b, ...(t.n ? [t.n] : [])].map((p) => [readWith(t, p, fa), readWith(t, p, fb)]).find(([x, y]) => x && y)!;
  return { k: Number(m[1]) - 1, thing: { a: (reads[0] as { v: boolean }).v, b: (reads[1] as { v: boolean }).v } };
}

/** A case board’s marks, worked out again: a case is left if some world with that thing first makes every given true. */
function caseBoardRight(d: DrillStep, t: Topic) {
  const s = d.scene as Extract<Scene, { kind: 'argument' }>;
  const forms = readArg(t, [...s.givens, s.claim]);
  const givens = forms.slice(0, -1), claim = forms[forms.length - 1];
  for (const r of d.rows.filter((x) => x.id.startsWith('case'))) {
    const { k, thing } = readCase(t, r.label);
    expect(CASES[k]).toEqual(thing);
    const left = KINDS.some((other) => givens.every((g) => trueIn(g, [thing, other])));
    expect(r.marks[0].answer, `${d.id} ${r.id}`).toBe(left ? (trueIn(claim, [thing, thing]) ? 'yes' : 'no') : 'out');
  }
  return judge(givens, claim);
}

const boardText = (d: DrillStep) => [
  d.title,
  ...d.body,
  d.done,
  d.twin ?? '',
  ...d.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
  ...(d.misconceptions ?? []).map((m) => m.text),
  ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
  ...Object.values(d.words ?? {}),
  ...(d.steps ?? []),
];

describe('the boards: every mark worked out again, words for every wrong mark, the mix-ups they catch', () => {
  const [l1, l2, l3, l4] = stop18.lessons;

  it('each board sits right after its card; contrast cards sit before their lesson’s example', () => {
    expect(l1.ideas[L1_CARDS.contrast].distinction).toBe('place-vs-job');
    expect(l2.ideas[L2_CARDS.contrast].distinction).toBe('true-vs-follows');
    expect(l4.ideas[L4_CARDS.contrast].distinction).toBe('given-vs-true');
    expect(l1.drill!.map((d) => d.afterCard)).toEqual([L1_CARDS.contrast, L1_CARDS.example]);
    expect(l2.drill!.map((d) => d.afterCard)).toEqual([L2_CARDS.contrast, L2_CARDS.example, L2_CARDS.not, L2_CARDS.not, L2_CARDS.no]);
    expect(l3.drill!.map((d) => d.afterCard)).toEqual([L3_CARDS.example, L3_CARDS.shape, L3_CARDS.not, L3_CARDS.no]);
    expect(l4.drill!.map((d) => d.afterCard)).toEqual([L4_CARDS.contrast, L4_CARDS.example]);
    for (const l of stop18.lessons) for (const d of l.drill!) {
      expect(checkDrill(d, Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer]))).done, d.id).toBe(true);
      expect(marksToTap(d).length, `${d.id}: phone-sized`).toBeLessThanOrEqual(12);
      for (const m of marksToTap(d)) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.trim(), `${d.id} ${m.id} ${o.id}`).toBeTruthy();
    }
  });

  it('Lesson 1: each sentence’s job, read from its signpost; the claim-first board catches “the last sentence is the claim”', () => {
    for (const d of l1.drill!) {
      for (const r of d.rows) {
        const text = r.label.replace(/^Sentence \d: /, '');
        const other = /[?!]$/.test(text) || text === 'Rainy days are the worst.';
        const claim = CLAIM_SIGNS.some((x) => x.test(text));
        expect(r.marks[0].answer, text).toBe(other ? 'other' : claim ? 'claim' : 'given');
      }
    }
    const place = l1.drill![0];
    const right = Object.fromEntries(marksToTap(place).map((m) => [m.id, m.answer]));
    const lastGiven = [...place.rows].reverse().find((r) => r.marks[0].answer === 'given')!;
    expect(checkDrill(place, { ...right, [lastGiven.id]: 'claim' }).diagnosis).toBe('place-as-job');
    const other = place.rows.find((r) => r.marks[0].answer === 'other')!;
    expect(checkDrill(place, { ...right, [other.id]: 'given' }).diagnosis).toBe('other-as-given');
    expect(checkDrill(place, right).diagnosis).toBeUndefined();
    // The contrast: the last sentence is the claim in one story and a given in the other.
    const c = l1.ideas[L1_CARDS.contrast].scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(c.pairs.map((p) => CLAIM_SIGNS.some((x) => x.test(p.says)))).toEqual([true, false]);
  });

  it('Lesson 2: true in the story and forced are marked apart; the case board’s marks and verdict, worked out again', () => {
    const [tf, cases] = l2.drill!;
    TF_ROWS.forEach(({ arg }, k) => {
      const r = tf.rows[k];
      const [, story] = r.label.split(' In the story: ');
      const thing = readCase(arg.topic, `Case 1: ${story}`).thing;
      const forms = readArg(arg.topic, [...r.label.split(' In the story: ')[0].replace(/ So (.+)$/, ' $1').split(/(?<=\.) /).map(cap)]);
      expect(r.marks[0].answer).toBe(trueIn(forms[2], [thing, thing]) ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(judge(forms.slice(0, 2), forms[2]) === 'must' ? 'follows' : 'not');
    });
    // Two rows have a true claim; only one follows. That pair is the mix-up the board names.
    expect(tf.rows.filter((r) => r.marks[0].answer === 'yes').map((r) => r.marks[1].answer).sort()).toEqual(['follows', 'not']);
    const right = Object.fromEntries(marksToTap(tf).map((m) => [m.id, m.answer]));
    const trap = tf.rows.find((r) => r.marks[0].answer === 'yes' && r.marks[1].answer === 'not')!;
    expect(checkDrill(tf, { ...right, [`${trap.id}-follows`]: 'follows' }).diagnosis).toBe('true-as-follows');
    const v = caseBoardRight(cases, TF_ROWS[1].arg.topic);
    expect(cases.rows.find((r) => r.id === 'verdict')!.marks[0].answer).toBe(v);
    const cr = Object.fromEntries(marksToTap(cases).map((m) => [m.id, m.answer]));
    const backwards = cases.rows.find((r) => r.marks[0].answer === 'no')!;
    expect(checkDrill(cases, { ...cr, [backwards.id]: 'out' }).diagnosis).toBe('all-backwards');
    expect(checkDrill(cases, { ...cr, verdict: 'must' }).diagnosis).toBe('some-as-every');
    const out = cases.rows.find((r) => r.marks[0].answer === 'out')!;
    expect(checkDrill(cases, { ...cr, [out.id]: 'no' }).diagnosis ?? checkDrill(cases, { ...cr, [out.id]: 'yes' }).diagnosis).toBe('out-counts');
  });

  it('Lesson 3: the made-up board, worked out again; the shape board by reading each argument back', () => {
    const [glorp, shape] = l3.drill!;
    const v = caseBoardRight(glorp, W_GLORP);
    expect(glorp.rows.find((r) => r.id === 'verdict')!.marks[0].answer).toBe(v === 'must' ? 'follows' : 'not');
    const want = JSON.stringify(readArg(W_GLORP, [...argScene({ scene: shape.scene } as Item).givens, argScene({ scene: shape.scene } as Item).claim]));
    expect(JSON.stringify(shape.scene)).toBe(JSON.stringify(l3.ideas[L3_CARDS.shape].scene));
    shape.rows.forEach((r, k) => {
      const t = GOLDIE_ROWS[k].topic;
      const forms = readArg(t, r.label.replace(/ So (.+)$/, ' $1').split(/(?<=\.) /).map(cap));
      expect(r.marks[0].answer).toBe(JSON.stringify(forms) === want ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(judge(forms.slice(0, 2), forms[2]) === 'must' ? 'follows' : 'not');
    });
    expect(shape.rows.filter((r) => r.marks[0].answer === 'yes').length).toBe(1);
    const right = Object.fromEntries(marksToTap(shape).map((m) => [m.id, m.answer]));
    const notSame = shape.rows.find((r) => r.marks[0].answer === 'no')!;
    expect(checkDrill(shape, { ...right, [`${notSame.id}-same`]: 'yes' }).diagnosis).toBe('words-as-shape');
    expect(GLORP.topic).toBe(W_GLORP);
  });

  it('Lesson 4: follows, every given really true, solid; a false given that still follows is the mix-up', () => {
    const [given, sun] = l4.drill!;
    SOLID_ROWS.forEach((arg, k) => {
      const r = given.rows[k];
      const forms = readArg(arg.topic, r.label.replace(/ So (.+)$/, ' $1').split(/(?<=\.) /).map(cap));
      const follows = judge(forms.slice(0, 2), forms[2]) === 'must';
      const allTrue = forms.slice(0, 2).every((f) => really(arg.topic, f));
      expect(r.marks.map((m) => m.answer)).toEqual([follows ? 'follows' : 'not', allTrue ? 'yes' : 'no', follows && allTrue ? 'solid' : 'not']);
    });
    // The rows cover every way: solid; follows with a false given; true givens that do not follow.
    expect(given.rows.map((r) => r.marks.map((m) => m.answer).join('/')).sort()).toEqual(['follows/no/not', 'follows/yes/solid', 'not/yes/not']);
    const right = Object.fromEntries(marksToTap(given).map((m) => [m.id, m.answer]));
    const unsound = given.rows.find((r) => r.marks[0].answer === 'follows' && r.marks[2].answer === 'not')!;
    expect(checkDrill(given, { ...right, [`${unsound.id}-follows`]: 'not' }).diagnosis).toBe('false-as-not');
    const broken = given.rows.find((r) => r.marks[0].answer === 'not')!;
    expect(checkDrill(given, { ...right, [`${broken.id}-solid`]: 'solid' }).diagnosis).toBe('true-givens-as-solid');
    const sunTopic = WORKED_TOPICS.find((t) => t.id === 'w-sun')!;
    expect(caseBoardRight(sun, sunTopic)).toBe('must');
    // The worked example card: every sentence really true, and still it does not follow.
    const ex = l4.ideas[L4_CARDS.example].scene as Extract<Scene, { kind: 'argument' }>;
    expect(ex.real).toEqual([true, true]);
    expect(ex.realClaim).toBe(true);
    const forms = readArg(sunTopic, [...ex.givens, ex.claim]);
    expect(judge(forms.slice(0, 2), forms[2])).toBe('might');
    // The contrast: the same shape twice, both follow; given 1 true in one and false in the other.
    const c = l4.ideas[L4_CARDS.contrast].scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c.pairs.map((p) => p.truth)).toEqual([true, false]);
  });

  it('the Lesson 2 contrast: the same true claim, forced in one and not in the other', () => {
    const c = l2.ideas[L2_CARDS.contrast].scene as Extract<Scene, { kind: 'contrast' }>;
    expect(c.pairs[0].says).toBe(c.pairs[1].says);
    const [a, b] = [TF_ROWS[0].arg, TF_ROWS[1].arg];
    for (const [p, arg] of [[c.pairs[0], a], [c.pairs[1], b]] as const) {
      const forms = readArg(arg.topic, [...p.world.split(/(?<=\.) /), p.says]);
      expect(p.truth).toBe(judge(forms.slice(0, 2), forms[2]) === 'must');
    }
    expect(c.words).toMatchObject({ truth: 'Follows', untruth: 'Does not follow' });
  });

  it('every marked case picture agrees with the second method', () => {
    for (const l of stop18.lessons) for (const card of l.ideas) {
      const s = card.scene;
      if (s?.kind !== 'argument' || !s.cases) continue;
      const t = WORKED_TOPICS.find((x) => readArgSafe(x, [...s.givens, s.claim]))!;
      const forms = readArg(t, [...s.givens, s.claim]);
      for (const box of s.cases!) {
        const { thing } = readCase(t, `${box.name}: ${box.facts.join(' ')}`);
        const left = KINDS.some((o) => forms.slice(0, -1).every((g) => trueIn(g, [thing, o])));
        if (box.out) expect(left, `${l.id} ${card.title} ${box.name}`).toBe(false);
        if (box.claim !== undefined) {
          expect(left).toBe(true);
          expect(box.claim).toBe(trueIn(forms[forms.length - 1], [thing, thing]));
        }
      }
    }
  });
});

function readArgSafe(t: Topic, texts: string[]): boolean {
  try {
    readArg(t, texts);
    return true;
  } catch {
    return false;
  }
}

// ---------- rule families: every family a quiz can ask is seen on a card and done on a board first ----------

/**
 * A rule family, read back from an argument’s words: given 1’s first word (All or No), what given 2 says (yes or no to
 * the IF part, the kind; or yes or no to the THEN part: what every a is, or, after “No”, what no a is), and the verdict
 * over small worlds.
 */
function familyOfRead(givens: readonly Read[], claim: Read): string {
  const [g1, g2] = givens;
  if (givens.length !== 2 || g1.t !== 'all' || g2.t !== 'fact' || claim.t !== 'fact') throw new Error(`not an argument of this stop: ${JSON.stringify([...givens, claim])}`);
  // The THEN part of “All a are b” is b; of “No a is b”, it is “not b”.
  const move = g2.r === 'a' ? (g2.v ? 'IF yes' : 'IF no') : g2.v === g1.v ? 'THEN yes' : 'THEN no';
  return `${g1.v ? 'All' : 'No'}, ${move}, ${judge(givens, claim)}`;
}

/** A whole argument on one line (“All … . … . So … .”), as its three sentences; null when it is not one. */
function splitArg(text: string): string[] | null {
  const m = /^(.+?\.) (.+?\.) So (.+\.)$/.exec(text);
  return m ? [m[1], m[2], cap(m[3])] : null;
}

/** Made-up words, read from the argument itself: “All zibs are fuzzy.” or “No zib is fuzzy.”, then “Mo is …”. */
function madeUpTopic(texts: readonly string[]): Topic {
  const head = /^All (\w+)s are (\w+)\.$/.exec(texts[0]) ?? /^No (\w+) is (\w+)\.$/.exec(texts[0]);
  const who = /^(\w+) is /.exec(texts[1])?.[1];
  if (!head || !who) throw new Error(`could not read “${texts.join(' ')}”`);
  const [, one, word] = head;
  const p: Prop = { is: `is ${word}`, isNot: `is not ${word}`, are: `are ${word}`, be: `be ${word}` };
  const a: Prop = { is: `is a ${one}`, isNot: `is not a ${one}`, are: `are ${one}s`, be: `be a ${one}`, noun: [one, `${one}s`] };
  return { id: `made-up-${one}`, skin: 'nonsense', who, setting: '', a, b: p, n: p, others: [] };
}

/** The topic whose words these are: a quiz or worked topic, or else made-up words read from the argument. */
const topicOfTexts = (texts: readonly string[]): Topic => [...ALL_TOPICS, ...WORKED_TOPICS].find((t) => readArgSafe(t, [...texts])) ?? madeUpTopic(texts);
/** An argument’s family, from its sentences (the givens, then the claim). */
function familyOfTexts(texts: readonly string[]): { family: string; verdict: 'must' | 'might' | 'cant' } {
  const f = readArg(topicOfTexts(texts), texts);
  return { family: familyOfRead(f.slice(0, -1), f[f.length - 1]), verdict: judge(f.slice(0, -1), f[f.length - 1]) };
}
/** A quiz item’s family, from the argument its picture shows; null for an item with no argument (Lesson 1’s stories). */
const itemFamily = (it: Item): string | null => (it.scene?.kind === 'argument' ? familyOfTexts([...it.scene.givens, it.scene.claim]).family : null);

/** The verdict a card’s paragraph ends on: the last of “must be true” (“it follows”), “might be true or false” (“does not follow”) and “can’t be true”. */
function verdictSaid(text: string): string | undefined {
  const said: [string, RegExp][] = [['must', /must be true|\bit follows\b/gi], ['might', /might be true or false|does not follow/gi], ['cant', /can’t be true/gi]];
  let last: [number, string] | undefined;
  for (const [v, re] of said) for (const m of text.matchAll(re)) if (!last || m.index! > last[0]) last = [m.index!, v];
  return last?.[1];
}

/**
 * The families a lesson’s cards work through, each with the first card that does (by place): a picture marked case by
 * case; a contrast panel’s argument; and each argument a card’s words carry to its verdict, either a whole argument in
 * quotes or the picture’s claim flipped (one quoted sentence of the picture’s words that is not one of its sentences).
 */
function cardFamilies(l: LessonDef): Map<string, number> {
  const out = new Map<string, number>();
  const add = (family: string, k: number) => out.has(family) || out.set(family, k);
  l.ideas.forEach((card, k) => {
    const s = card.scene;
    let picture: { t: Topic; texts: string[] } | undefined;
    if (s?.kind === 'argument' && s.cases?.length && s.cases.every((b) => b.out !== undefined || b.claim !== undefined)) {
      const texts = [...s.givens, s.claim];
      picture = { t: topicOfTexts(texts), texts };
      add(familyOfTexts(texts).family, k);
    }
    if (s?.kind === 'contrast') {
      for (const p of s.pairs) {
        const texts = [...p.world.split(/(?<=\.) /), p.says];
        if (texts.length !== 3 || !/^(All|No) /.test(texts[0])) continue;
        const f = familyOfTexts(texts);
        expect(p.truth, `${l.id} ${card.title}: the panel says if it follows`).toBe(f.verdict === 'must');
        add(f.family, k);
      }
    }
    for (const para of card.body) {
      const said = verdictSaid(para);
      if (!said) continue;
      for (const [, q] of para.matchAll(/“([^”]+)”/g)) {
        const whole = splitArg(q);
        const flipped = !whole && picture && !picture.texts.includes(q) && readArgSafe(picture.t, [...picture.texts.slice(0, -1), q]) ? [...picture.texts.slice(0, -1), q] : null;
        const texts = whole ?? flipped;
        if (!texts) continue;
        const f = familyOfTexts(texts);
        expect(said, `${l.id} ${card.title}: “${q}”`).toBe(f.verdict);
        add(f.family, k);
      }
    }
  });
  return out;
}

const VERDICT_MARKS = new Set(['must,might,cant', 'follows,not']);

/**
 * The families a lesson’s boards have the learner mark, each with the card the first such board opens after. Every
 * verdict mark (must, might or can’t; follows or not) and every case mark is worked out again from the argument it is
 * about: a whole argument in its row’s words, the board’s argument picture (“verdict”, “case2”), or the line of its text
 * picture the mark is named by (“Argument 1”: “a1-verdict”, “a1-case2”).
 */
function boardFamilies(l: LessonDef): Map<string, number> {
  const out = new Map<string, number>();
  for (const d of l.drill ?? []) {
    const at = d.afterCard ?? l.ideas.length - 1;
    const s = d.scene;
    const args: Record<string, string[]> = {};
    if (s?.kind === 'argument') args[''] = [...s.givens, s.claim];
    if (s?.kind === 'text') {
      for (const line of s.lines) {
        const m = /^Argument (\d): (.+)$/.exec(line);
        if (m) args[`a${m[1]}-`] = splitArg(m[2])!;
      }
    }
    for (const r of d.rows) {
      for (const m of r.marks) {
        if (m.given) continue;
        const caseOf = /^(a\d-)?case\d$/.exec(m.id);
        if (caseOf) {
          const texts = args[caseOf[1] ?? ''];
          const t = topicOfTexts(texts);
          const forms = readArg(t, texts);
          const { thing } = readCase(t, r.label);
          const left = KINDS.some((other) => forms.slice(0, -1).every((g) => trueIn(g, [thing, other])));
          expect(m.answer, `${d.id} ${m.id}`).toBe(left ? (trueIn(forms[forms.length - 1], [thing, thing]) ? 'yes' : 'no') : 'out');
          continue;
        }
        const options = m.options.map((o) => o.id).join(',');
        if (!VERDICT_MARKS.has(options)) continue;
        const named = /^(a\d-)?verdict$/.exec(m.id);
        const texts = splitArg(/“([^”]+)”/.exec(r.label)?.[1] ?? r.label.split(' In the story: ')[0]) ?? (named ? args[named[1] ?? ''] : undefined);
        expect(texts, `${d.id} ${m.id}: the argument it is about`).toBeDefined();
        const f = familyOfTexts(texts!);
        expect(m.answer, `${d.id} ${m.id}`).toBe(options === 'follows,not' ? (f.verdict === 'must' ? 'follows' : 'not') : f.verdict);
        if (!out.has(f.family)) out.set(f.family, at);
      }
    }
  }
  return out;
}

describe('rule families: every family a quiz can ask is seen on a card and done on a board first', () => {
  const [, l2, l3, l4] = stop18.lessons;
  /** The model’s families, one per shape, read from the shape table’s own sentences. */
  const familyOfShape = (s: (typeof SHAPE_IDS)[number]) => familyOfRead(SHAPES[s].givens as Read[], SHAPES[s].claim as Read);
  const drawn = (l: LessonDef, seeds = SEEDS) => {
    const out = new Set<string>();
    for (let seed = 1; seed <= seeds; seed++) for (const it of l.practice(createRng(seed))) out.add(itemFamily(it) ?? '');
    out.delete('');
    return out;
  };
  const sorted = (xs: Iterable<string>) => [...xs].sort();

  it('the model: nine families, one per shape; a flip keeps the givens and turns must into can’t; a swap turns must into might', () => {
    expect(new Set(SHAPE_IDS.map(familyOfShape)).size).toBe(SHAPE_IDS.length);
    for (const s of FOLLOW_SHAPES) {
      const [flip, swap] = [flipShape(s), swapShape(s)];
      expect(CANT_SHAPES, s).toContain(flip);
      expect(LEAK_SHAPES, s).toContain(swap);
      expect(SHAPES[flip].givens).toEqual(SHAPES[s].givens);
      expect([SHAPES[swap].givens[1], SHAPES[swap].claim]).toEqual([SHAPES[s].claim, SHAPES[s].givens[1]]);
      expect([familyOfShape(s), familyOfShape(flip), familyOfShape(swap)].map((f) => f.split(', ')[2])).toEqual(['must', 'cant', 'might']);
    }
  });

  it('Lessons 2 and 3: every family the pack can draw has a card and a board in that lesson, and the card comes first', () => {
    const want: Record<string, string[]> = {
      // Lesson 2 asks must, might or can’t of every shape; Lesson 3 asks follows or not of the shapes that do and do not.
      's18.l2': sorted(SHAPE_IDS.map(familyOfShape)),
      's18.l3': sorted([...FOLLOW_SHAPES, ...LEAK_SHAPES].map(familyOfShape)),
    };
    const seenBefore = new Set<string>();
    for (const l of [l2, l3]) {
      const families = drawn(l);
      expect(sorted(families), `${l.id}: the families its pack draws`).toEqual(want[l.id]);
      const cards = cardFamilies(l);
      const boards = boardFamilies(l);
      for (const f of families) {
        expect(cards.has(f), `${l.id}: a card works “${f}”`).toBe(true);
        expect(boards.has(f), `${l.id}: a board marks “${f}”`).toBe(true);
      }
      // See, then Do: each family a board marks was seen on a card at or before the board’s place, or in an earlier lesson.
      for (const [f, at] of boards) if (!seenBefore.has(f)) expect(cards.get(f), `${l.id}: “${f}” is seen before its board`).toBeLessThanOrEqual(at);
      for (const f of cards.keys()) if (boards.has(f)) seenBefore.add(f);
    }
  });

  it('Lesson 4, the check and the Arcade ask only families already seen and done in Lesson 2 or 3', () => {
    const taught = new Set<string>();
    for (const l of [l2, l3]) {
      const boards = boardFamilies(l);
      for (const f of cardFamilies(l).keys()) if (boards.has(f)) taught.add(f);
    }
    for (const f of drawn(l4)) expect(taught.has(f), `Lesson 4 draws “${f}”`).toBe(true);
    for (let seed = 1; seed <= 100; seed++) {
      for (const it of [...stop18.check!(createRng(seed)), stop18.practice!(createRng(seed))]) {
        const f = itemFamily(it);
        if (f) expect(taught.has(f), `${it.id} (${it.lesson}) draws “${f}”`).toBe(true);
      }
    }
  });

  it('the family boards: twins of the cards in new words, the steps on screen, and the mix-ups they catch', () => {
    const boards = [...l2.drill!.slice(2), ...l3.drill!.slice(2)];
    expect(boards.map((d) => d.id)).toEqual(['s18.l2-do-not', 's18.l2-do-flip', 's18.l2-do-no', 's18.l3-do-not', 's18.l3-do-no']);
    for (const d of boards) {
      expect(d.twin, d.id).toMatch(/^New (made-up )?words/);
      expect(d.scaffold).toBe('full');
      expect(d.steps?.length).toBe(4);
      expect(marksToTap(d).length, `${d.id}: phone-sized`).toBeLessThanOrEqual(12);
      // New words: no family board is about a card’s own topic.
      expect(JSON.stringify(d.scene)).not.toMatch(/\b(Pip|Zed)\b|glorp/);
      const right = Object.fromEntries(marksToTap(d).map((m) => [m.id, m.answer]));
      expect(checkDrill(d, right).diagnosis, d.id).toBeUndefined();
      // A crossed-out case marked with its claim: the case still counts.
      const out = marksToTap(d).find((m) => /case\d$/.test(m.id) && m.answer === 'out')!;
      expect(checkDrill(d, { ...right, [out.id]: 'yes' }).diagnosis ?? checkDrill(d, { ...right, [out.id]: 'no' }).diagnosis, d.id).toBe('out-counts');
      // A claim that is true in some case left and false in another, marked must (or follows): one case read as every case.
      const might = marksToTap(d).find((m) => /verdict$/.test(m.id) && ['might', 'not'].includes(m.answer) && !m.id.startsWith('flip'));
      if (might) expect(checkDrill(d, { ...right, [might.id]: might.options[0].id }).diagnosis, d.id).toBe('some-as-every');
      // The board’s arguments, by the id of their verdict mark: the lines of a text picture, or an argument picture.
      const sc = d.scene!;
      const args: [string, string[]][] =
        sc.kind === 'text' ? sc.lines.map((line, i): [string, string[]] => [`a${i + 1}-verdict`, splitArg(line.replace(/^Argument \d: /, ''))!]) : sc.kind === 'argument' ? [['verdict', [...sc.givens, sc.claim]]] : [];
      expect(args.length, d.id).toBeGreaterThan(0);
      // A flipped claim given the verdict of the claim it flips: the claim and its flip read as the same.
      for (const r of d.rows.filter((x) => x.id.startsWith('flip'))) {
        const flip = splitArg(/“([^”]+)”/.exec(r.label)![1])!;
        const [from] = args.find(([, a]) => a[0] === flip[0] && a[1] === flip[1] && a[2] !== flip[2])!;
        expect(checkDrill(d, { ...right, [r.marks[0].id]: right[from] }).diagnosis, `${d.id} ${r.id}`).toBe('flip-same');
      }
      // Given 1 read wrong crosses out a case left: “All a are b” read backwards crosses out a b that is not an a;
      // “No a is b” read as “everything that is not b is an a” crosses out a thing that is neither.
      const no = args[0][1][0].startsWith('No ');
      const t = topicOfTexts(args[0][1]);
      for (const r of d.rows.filter((x) => x.id.startsWith('case'))) {
        const { thing } = readCase(t, r.label);
        if (thing.a || thing.b === no) continue;
        for (const m of r.marks.filter((x) => x.answer !== 'out')) expect(checkDrill(d, { ...right, [m.id]: 'out' }).diagnosis, `${d.id} ${m.id}`).toBe(no ? 'no-only' : 'all-backwards');
      }
    }
  });
});

// ---------- words: terms, grown-up words once, reading level, quotes and symbols ----------

describe('the words', () => {
  it('kid words first; each grown-up word is named on one card, the card of the lesson whose terms list it', () => {
    const terms = stop18.lessons.map((l) => (l.terms ?? []).map((t) => t.term));
    expect(terms).toEqual([['argument', 'premise', 'conclusion'], ['valid', 'case'], ['shape'], ['sound']]);
    expect(stop18.lessons.flatMap((l) => l.terms ?? []).filter((t) => t.also).map((t) => [t.term, t.also])).toEqual([
      ['premise', 'a given'],
      ['conclusion', 'the claim'],
      ['valid', 'follows'],
      ['shape', 'form'],
      ['sound', 'solid'],
    ]);
    for (const [word, lesson] of [['premise', 0], ['conclusion', 0], ['valid', 1], ['form', 2], ['sound', 3]] as const) {
      const cards = stop18.lessons.flatMap((l, k) => l.ideas.filter((c) => new RegExp(`\\b${word}\\b`).test(c.body.join(' '))).map((c) => [k, c.title]));
      expect(cards.length, word).toBe(1);
      expect(cards[0][0], word).toBe(lesson);
      // Named with its kid word, as “Grown-ups call …”.
      const card = stop18.lessons[lesson].ideas.find((c) => c.title === cards[0][1])!;
      expect(card.body.join(' ')).toMatch(new RegExp(`Grown-ups call [^.]*\\b${word}\\b`));
    }
    // The kid words come first: “given” and “claim” on the first card, “follows” before “valid”, “solid” before “sound”.
    expect(stop18.lessons[0].ideas[0].body.join(' ')).toMatch(/givens[\s\S]*claim/);
    const l2 = stop18.lessons[1].ideas[0].body.join(' ');
    expect(l2.indexOf('follows')).toBeLessThan(l2.indexOf('valid'));
    const l4 = stop18.lessons[3].ideas[0].body.join(' ');
    expect(l4.indexOf('solid')).toBeLessThan(l4.indexOf('sound'));
    for (const t of stop18.lessons.flatMap((l) => l.terms ?? [])) expect(t.means).toMatch(/^[A-Z].*[.!?]$/);
  });

  it('the stop’s real-life pack is registered, and its coming-soon line is gone', () => {
    expect(WORLD.s18).toBe(S18_WORLD);
    expect(SOON_WORLD.s18).toBeUndefined();
    expect(Object.keys(S18_WORLD.lessons)).toEqual(stop18.lessons.map((l) => l.id));
  });

  it('every generated string reads at grade 7 or lower, sentences of 25 words or fewer, curly quotes only, no symbols, US spelling, never “Wrong”', () => {
    const text: string[] = [];
    const items: Item[] = [];
    for (let seed = 1; seed <= 25; seed++) {
      for (const l of stop18.lessons) items.push(...l.practice(createRng(seed)));
      items.push(...stop18.check!(createRng(seed)), stop18.practice!(createRng(seed)));
    }
    for (const it of items) {
      text.push(it.prompt, it.explain, ...teachStrings(it));
      if (it.kind === 'choose' || it.kind === 'multi') text.push(...it.choices.map((c) => c.label));
      if (it.kind === 'multi') text.push(...Object.values(it.pickTips ?? {}), ...Object.values(it.missTips ?? {}));
      if (it.scene) text.push(...sceneSpeech(it.scene));
      if (it.scratch) text.push(...boardText(it.scratch));
      for (const q of it.confused ?? []) text.push(q.q, q.teach, ...q.options.map((o) => o.label));
    }
    for (const l of stop18.lessons) {
      for (const c of l.ideas) text.push(c.title, ...c.body, ...(c.scene ? sceneSpeech(c.scene) : []));
      for (const d of l.drill ?? []) text.push(...boardText(d), ...(d.scene ? sceneSpeech(d.scene) : []));
      for (const t of l.terms ?? []) text.push(t.means);
    }
    const all = text.filter(Boolean).join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(all).not.toMatch(/['"]/);
    expect(all).not.toMatch(/[=+<>&✓✗→←↔]/);
    expect(all).not.toMatch(/\b\d+ x \d+\b/);
    expect(all).not.toMatch(/\bWrong\b/);
    expect(all).not.toMatch(/\b(colour|favourite|centre|realise|organise|grey|behaviour|neighbour|practise)\b/i);
  });
});

describe('the argument picture (Scene “argument”)', () => {
  const text = (scene: Scene) => renderToString(h(SceneView, { scene })).replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/\s+/g, ' ');

  it('draws the givens, the claim and every case box: crossed out with its given, or left with the claim’s truth', () => {
    const [, , , , example] = stop18.lessons[1].ideas;
    const s = example.scene as Extract<Scene, { kind: 'argument' }>;
    const t = text(s);
    for (const g of s.givens) expect(t).toContain(g);
    expect(t).toContain('Given 1');
    expect(t).toContain('Claim');
    for (const box of s.cases!) {
      expect(t).toContain(box.name);
      for (const f of box.facts) expect(t).toContain(f);
    }
    expect(t).toContain('Crossed out: breaks given 1');
    expect(t).toContain('Left: the claim is true');
    // Read aloud: the same boxes, in words.
    const said = sceneSpeech(s).join(' ');
    expect(said).toContain('Case 2: Pip is a bird. Pip does not have feathers. Crossed out: it breaks given 1.');
    expect(said).toContain('Left: the claim is true here.');
  });

  it('a real argument shows True or False beside each sentence; a board’s blank boxes show no verdict', () => {
    const ex = stop18.lessons[3].ideas[L4_CARDS.example].scene!;
    expect(text(ex)).toMatch(/Given 1 All stars are hot\. True/);
    const blank = stop18.lessons[1].drill![1].scene!;
    const t = text(blank);
    expect(t).not.toContain('Crossed out');
    expect(t).not.toContain('Left:');
  });
});
