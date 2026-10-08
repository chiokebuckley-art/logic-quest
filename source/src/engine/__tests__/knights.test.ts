/**
 * Stop 5 knights and knaves. Every item is re-solved here from the words on the page: the speech bubbles
 * are read back with a parser and an evaluator written separately from the engine, and every case
 * (each islander a knight or a knave) is tried by brute force. Explanations are replayed sentence by
 * sentence, and each step is checked against the cases that are still open at that point.
 *
 * The teaching after a wrong answer (wrong-answer handoff v1.0) is checked the same way: every case card and every
 * wrong choice's example is read back from its words and re-computed from the bubbles, each wrong choice is sorted
 * into a kind of mistake from the cases alone, and each kind has its own headline.
 */
import { describe, expect, it } from 'vitest';
import {
  CARD_QUESTIONS,
  L1_CONTRAST,
  L1_CONTRAST_SCENE,
  L1_DRILL,
  L1_WELL_SCENE,
  L2_DRILL,
  L2_EXAMPLE,
  L2_SCENE,
  L2_TWIN_SCENE,
  L3_CONTRAST_SCENE,
  L3_DRILL,
  L3_EXAMPLE,
  L3_GUESS_SCENE,
  L3_SCENE,
  L4_CONTRAST_SCENE,
  L4_DRILL,
  L4_EXAMPLE,
  L4_GUESS_SCENE,
  L4_SCENE,
  L4_STRONG_SCENE,
  L5_AND_SCENE,
  L5_DRILL,
  L5_EXAMPLE,
  L5_OR_SCENE,
  L5_SCENE,
  SKILL_NAMES,
  stop5,
} from '../../content/stop5';
import { NEUTRAL_TITLE, explanationFor } from '../../game/explanation';
import { checkDrill, marksToTap, passState } from '../drill';
import { freshCheckSet, looks } from '../fresh';
import {
  CASE_WORDS,
  GUESS_VS_KNOWN,
  KIND_VS_TRUTH,
  KNOWN_FACTS,
  ME,
  PUZZLE_RULE,
  SAY_WORDS,
  SKINS,
  SKIN_IDS,
  andOrItem,
  andOrPlanOf,
  claimText,
  explainSolve,
  puzzleItem,
  sayPlanOf,
  solutions,
  supposeItem,
  whoCanSayItem,
  wordsItem,
  wordsPlanOf,
  type Kind,
  type SkinId,
  type SupposeAnswer,
  type WordsType,
} from '../puzzles/knights';
import { READING, fkGrade, sentences, words } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { AssignItem, ChooseItem, Claim, DrillRow, DrillStep, Item, Scene, Speaker, TeachCase } from '../types';

type K = Record<string, Kind>;
type Meaning = (k: K) => boolean;
const KINDS: Kind[] = ['knight', 'knave'];
const other = (k: Kind): Kind => (k === 'knight' ? 'knave' : 'knight');
const SEEDS = 300;

/** Every way to make these people knights or knaves, with some fixed. */
function cases(ids: string[], fixed: Partial<K> = {}): K[] {
  let out: K[] = [{}];
  for (const id of ids) out = out.flatMap((pre) => (fixed[id] ? [{ ...pre, [id]: fixed[id]! }] : KINDS.map((v) => ({ ...pre, [id]: v }))));
  return out;
}

// ---------- reading the words back ----------

const COUNT: Record<string, number> = { one: 1, two: 2, three: 3 };

/**
 * What a speech bubble means, read from its words alone. `idOf` turns a name into an id; `us` is
 * everyone "us" counts. Throws on any sentence it cannot read, so an unclear sentence fails the test.
 */
function readWords(text: string, speaker: string, idOf: (name: string) => string, us: string[]): Meaning {
  const t = text.replace(/\.$/, '');
  const who = (w: string) => (w === 'I' ? speaker : idOf(w));
  const simple = (s: string): Meaning | null => {
    let m = s.match(/^I am a (knight|knave)$/);
    if (m) { const v = m[1] as Kind; return (k) => k[speaker] === v; }
    m = s.match(/^(\w+) is a (knight|knave)$/);
    if (m) { const id = idOf(m[1]); const v = m[2] as Kind; return (k) => k[id] === v; }
    return null;
  };
  let m = t.match(/^(\w+) and (\w+) are the same kind$/);
  if (m) { const x = who(m[1]), y = who(m[2]); return (k) => k[x] === k[y]; }
  m = t.match(/^(\w+) and (\w+) are different kinds$/);
  if (m) { const x = who(m[1]), y = who(m[2]); return (k) => k[x] !== k[y]; }
  m = t.match(/^(\w+) and (\w+) are both (knight|knave)s$/);
  if (m) { const x = who(m[1]), y = who(m[2]); const v = m[3] as Kind; return (k) => k[x] === v && k[y] === v; }
  m = t.match(/^We are (both|all) (knight|knave)s$/);
  if (m) {
    expect(m[1] === 'both' ? 2 : 3, text).toBe(us.length);
    const v = m[2] as Kind;
    return (k) => us.every((id) => k[id] === v);
  }
  m = t.match(/^(At least|Exactly) (one|two) of us (?:is a|are) (knight|knave)s?$/);
  if (m) {
    const n = COUNT[m[2]], v = m[3] as Kind, least = m[1] === 'At least';
    return (k) => { const c = us.filter((id) => k[id] === v).length; return least ? c >= n : c === n; };
  }
  const s = simple(t);
  if (s) return s;
  for (const [sep, join] of [[' or ', (a: boolean, b: boolean) => a || b], [' and ', (a: boolean, b: boolean) => a && b]] as const) {
    const parts = t.split(sep);
    if (parts.length === 2) {
      const [p, q] = parts.map(simple);
      if (p && q) return (k) => join(p(k), q(k));
    }
  }
  throw new Error(`cannot read: ${text}`);
}

const NUMBER: Record<string, number> = { zero: 0, one: 1, two: 2, three: 3 };

/**
 * A sentence about who is what, with names only (never "I"), read back as a test on a case: the forms whenTrue and
 * whenFalse write ("Ava and Ben are the same kind", "the number of knights among A, B and C is zero, two or three",
 * "Ava is a knave, or Ben is a knave"). `us` is everyone in the puzzle. Throws on anything it cannot read.
 */
function readNamed(text: string, idOf: (n: string) => string, us: string[]): Meaning {
  const t = text.replace(/\.$/, '');
  const names = (s: string) => s.split(/, | and /).map(idOf);
  for (const [sep, join] of [[', or ', (x: boolean, y: boolean) => x || y], [', and ', (x: boolean, y: boolean) => x && y]] as const) {
    const parts = t.split(sep);
    if (parts.length === 2) {
      const [p, q] = parts.map((x) => readNamed(x, idOf, us));
      return (k) => join(p(k), q(k));
    }
  }
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^it is not true that (.+)$/))) { const p = readNamed(m[1], idOf, us); return (k) => !p(k); }
  if ((m = t.match(/^(\w+) is a (knight|knave)$/i))) { const id = idOf(m[1]); const v = m[2] as Kind; return (k) => k[id] === v; }
  if ((m = t.match(/^(\w+) and (\w+) are the same kind$/i))) { const x = idOf(m[1]), y = idOf(m[2]); return (k) => k[x] === k[y]; }
  if ((m = t.match(/^(\w+) and (\w+) are different kinds$/i))) { const x = idOf(m[1]), y = idOf(m[2]); return (k) => k[x] !== k[y]; }
  if ((m = t.match(/^(.+) are (both|all) (knight|knave)s$/i))) {
    const ids = names(m[1]);
    expect(ids.length, text).toBe(m[2] === 'both' ? 2 : 3);
    const v = m[3] as Kind;
    return (k) => ids.every((id) => k[id] === v);
  }
  const count = (list: string, v: Kind, ok: (c: number) => boolean): Meaning => {
    expect(names(list).sort(), `${text}: “us” is everyone`).toEqual([...us].sort());
    return (k) => ok(us.filter((id) => k[id] === v).length);
  };
  if ((m = t.match(/^(at least|at most|exactly) (one|two|three) of (.+?) (?:is a|are) (knight|knave)s?$/i))) {
    const n = NUMBER[m[2]], op = m[1].toLowerCase();
    return count(m[3], m[4] as Kind, (c) => (op === 'at least' ? c >= n : op === 'at most' ? c <= n : c === n));
  }
  if ((m = t.match(/^none of (.+) is a (knight|knave)$/i))) return count(m[1], m[2] as Kind, (c) => c === 0);
  if ((m = t.match(/^the number of (knight|knave)s among (.+) is (.+)$/i))) {
    const ns = m[3].split(/, | or /).map((w) => NUMBER[w]);
    return count(m[2], m[1] as Kind, (c) => ns.includes(c));
  }
  throw new Error(`cannot read: ${text}`);
}

/** Truth rows without their reasons, for comparing with rows re-computed from the bubbles. */
const bare = (ts: readonly { who: string; value: boolean }[] | undefined) => (ts ?? []).map(({ who, value }) => ({ who, value }));

/**
 * A truth's reason (Truth.because) re-checked from its own words: it is there, its verdict is the truth's value, and
 * what it says (read with readNamed), checked in the world it names (read as kinds), gives that value. The speaker's
 * kind never appears in it.
 */
function checkBecause(t: { who: string; value: boolean; because?: { says: string; world: string; match: boolean } }, idOf: (n: string) => string, us: string[]) {
  expect(t.because, `${t.who} has its reason`).toBeDefined();
  const b = t.because!;
  expect(b.match, `${t.who}: the reason’s verdict`).toBe(t.value);
  const says = readNamed(b.says, idOf, us);
  const world = readFacts(b.world.replace(/\.$/, '').replace(/^(.+) are (both|all) (knight|knave)s$/, (_, l: string, _w, v: string) => l.split(/, | and /).map((n) => `${n} is a ${v}`).join(' and ')), idOf);
  // Every case that agrees with the named world gives the same verdict, so the comparison alone decides it.
  for (const k of cases(us, world)) expect(says(k), `${b.says} / ${b.world}`).toBe(t.value);
}

/** A speakers scene read back: people in order, and what each one's words mean. */
function readScene(item: Item) {
  return readSpeakers(item.scene);
}

function readSpeakers(scene: Scene | undefined): { ids: string[]; names: Map<string, string>; meaning: Record<string, Meaning> } {
  if (scene?.kind !== 'speakers') throw new Error('no speakers scene');
  const sp: Speaker[] = scene.speakers;
  const ids = sp.map((s) => s.id);
  const byName = new Map(sp.map((s) => [s.name, s.id]));
  const idOf = (n: string) => {
    const id = byName.get(n);
    if (!id) throw new Error(`unknown name ${n}`);
    return id;
  };
  const meaning: Record<string, Meaning> = {};
  for (const s of sp) if (s.says) meaning[s.id] = readWords(s.says, s.id, idOf, ids);
  return { ids, names: new Map(sp.map((s) => [s.id, s.name])), meaning };
}

/** Does this speaker fit the rule in this case? No words always fit. */
const fits = (meaning: Record<string, Meaning>, id: string, k: K) => !meaning[id] || (k[id] === 'knight') === meaning[id](k);
const allFit = (ids: string[], meaning: Record<string, Meaning>, k: K) => ids.every((id) => fits(meaning, id, k));

// ---------- writing checks ----------

function allText(item: Item): string[] {
  const out = [item.prompt, item.explain, item.hint ?? ''];
  if (item.kind === 'choose') out.push(...Object.values(item.whyWrong ?? {}), ...item.choices.map((c) => c.label));
  if (item.scene?.kind === 'speakers') out.push(...item.scene.speakers.flatMap((s) => [s.name, s.says]), item.scene.rule ?? '');
  return out.filter(Boolean);
}

function cleanText(item: Item) {
  const all = allText(item).join(' ');
  expect(all, item.prompt).not.toMatch(/undefined|NaN|\{n\}|\{list\}|\s\s|\.\.|\?\./);
  expect(all, 'curly apostrophes and quotes only').not.toMatch(/['"]/);
  expect(all, 'no he/she: names repeat').not.toMatch(/\b(he|she|him|her|his|hers|himself|herself)\b/i);
  if (item.kind === 'choose') for (const msg of Object.values(item.whyWrong ?? {})) {
    expect(msg).not.toMatch(/^Not yet/);
    expect(msg.trim().length).toBeGreaterThan(0);
  }
  for (const s of sentences([item.prompt, item.explain, ...(item.kind === 'choose' ? Object.values(item.whyWrong ?? {}) : [])].join('\n'))) {
    expect(words(s).length, s).toBeLessThanOrEqual(25);
  }
  // Every question and explanation ends a sentence.
  expect(item.explain).toMatch(/[.!?]$/);
}

const wrongChoicesCovered = (item: ChooseItem) =>
  expect(Object.keys(item.whyWrong ?? {}).sort()).toEqual(item.choices.map((c) => c.id).filter((id) => id !== item.answer).sort());

// ---------- replaying a puzzle explanation ----------

/** "Ava is a knight and Ben is a knave" / "A is a knight, B is a knave and C is a knave" -> facts. */
function readFacts(text: string, idOf: (n: string) => string): K {
  const out: K = {};
  for (const part of text.split(/, | and /)) {
    const m = part.match(/^(\w+) is a (knight|knave)$/);
    if (!m) throw new Error(`cannot read fact: ${part}`);
    out[idOf(m[1])] = m[2] as Kind;
  }
  return out;
}

/**
 * Walk a puzzle explanation. Each step is checked against the cases still open: what "so" says must
 * hold in every case where the speaker fits; a crash must hold in every case; a supposition must be the
 * wrong kind and must end in a crash. Outside a supposition every fact must match the answer.
 *
 * Every need says "must be" (never "are"): "Then Tia’s words must be false." A need that settles kinds is followed by
 * what the words say ("They say …", with names, re-read and checked to mean exactly the bubble's words), then, for
 * false words, what false means ("False means …", checked to hold exactly when the words are false), then "So …".
 * What is found inside a supposition says "So, inside the guess, …", and nothing outside one does.
 */
function replay(item: AssignItem) {
  const { ids, names, meaning } = readScene(item);
  const idOf = (n: string) => [...names].find(([, v]) => v === n)?.[0] ?? (() => { throw new Error(`name ${n}`); })();
  const answer: K = Object.fromEntries(ids.map((id) => [id, item.answer[id].kind as Kind]));
  const ss = sentences(item.explain);
  let known: Partial<K> = {};
  let base: Partial<K> = {};
  let sup: { id: string; kind: Kind } | null = null;
  let crashed = false;
  let i = 0;
  const open = () => cases(ids, known);
  const addFacts = (f: K) => {
    for (const [id, v] of Object.entries(f)) {
      expect(known[id], `${id} already known in: ${item.explain}`).toBeUndefined();
      if (!sup) expect(v, `fact outside a supposition matches the answer: ${item.explain}`).toBe(answer[id]);
      known[id] = v;
    }
  };
  while (i < ss.length) {
    const s = ss[i];
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^Suppose (\w+) is a (knight|knave)\.$/))) {
      expect(sup, 'no supposition inside another').toBe(null);
      const id = idOf(m[1]);
      expect(known[id]).toBeUndefined();
      expect(m[2], 'the supposition is the wrong kind').toBe(other(answer[id]));
      base = { ...known };
      sup = { id, kind: m[2] as Kind };
      known = { ...known, [id]: sup.kind };
      crashed = false;
      i++;
    } else if ((m = s.match(/^That guess crashes, so (\w+) is a (knight|knave)\.$/))) {
      expect(sup).not.toBe(null);
      expect(crashed, `a crash came first: ${item.explain}`).toBe(true);
      const id = idOf(m[1]);
      expect(id).toBe(sup!.id);
      expect(m[2]).toBe(other(sup!.kind));
      expect(m[2]).toBe(answer[id]);
      known = { ...base, [id]: m[2] as Kind };
      sup = null;
      i++;
    } else if ((m = s.match(/^(?:(\w+) is a (knight|knave), so \1’s words|Then (\w+)’s words) (are|must be) (true|false)\.$/))) {
      const id = idOf(m[1] ?? m[3]);
      const kind = known[id];
      expect(kind, `${id} is known: ${s}`).toBeDefined();
      if (m[2]) expect(m[2]).toBe(kind);
      else expect(sup?.id, `“Then” follows the supposition: ${item.explain}`).toBe(id);
      expect(m[4], `a need says “must be”: ${s}`).toBe('must be');
      const need = m[5] === 'true';
      expect(need).toBe(kind === 'knight');
      const next = ss[i + 1] ?? '';
      const b = next.match(/^But with (.+), they are (true|false)\.$/);
      if (b) {
        expect(b[2] === 'true').toBe(!need);
        const w = b[1].split(/, | and /).map((p) => p.match(/^(\w+) a (knight|knave)$/)!);
        for (const x of w) expect(known[idOf(x[1])], s).toBe(x[2]);
        for (const k of open()) expect(meaning[id](k), `crash holds in every open case: ${item.explain}`).toBe(!need);
        crashed = true;
        i += 2;
      } else {
        // What the words say, with names: exactly the bubble's meaning, in every case.
        const say = next.match(/^They say (.+)\.$/);
        expect(say, `what the words say follows: ${item.explain}`).not.toBe(null);
        const said = readNamed(say![1], idOf, ids);
        for (const k of cases(ids)) expect(said(k), `${next} means the words: ${item.explain}`).toBe(meaning[id](k));
        let j = i + 2;
        if (!need) {
          // False words: what false means, true exactly when the words are false.
          const f = (ss[j] ?? '').match(/^False means (.+)\.$/);
          expect(f, `what false means follows: ${item.explain}`).not.toBe(null);
          const means = readNamed(f![1], idOf, ids);
          for (const k of cases(ids)) expect(means(k), `${ss[j]}: ${item.explain}`).toBe(!meaning[id](k));
          j++;
        }
        const so = (ss[j] ?? '').match(/^So(, inside the guess,)? (.+)\.$/);
        expect(so, `a “So” follows: ${item.explain}`).not.toBe(null);
        expect(!!so![1], `“inside the guess” exactly inside a supposition: ${ss[j]}`).toBe(!!sup);
        const facts = readFacts(so![2], idOf);
        const good = open().filter((k) => meaning[id](k) === need);
        expect(good.length).toBeGreaterThan(0);
        for (const [f, v] of Object.entries(facts)) for (const k of good) expect(k[f], `${so![0]} in every case where ${id} fits`).toBe(v);
        addFacts(facts);
        i = j + 1;
      }
    } else if ((m = s.match(/^If (\w+) were a (knight|knave), \1 would be a \2 saying something (true|false)\.$/))) {
      const id = idOf(m[1]);
      expect(known[id]).toBeUndefined();
      const as = m[2] as Kind;
      expect(m[3] === 'true').toBe(as === 'knave');
      for (const k of open().filter((c) => c[id] === as)) expect(meaning[id](k), `${s} in every open case`).toBe(m[3] === 'true');
      const next = ss[i + 1] ?? '';
      const self = next.match(/^So(, inside the guess,)? (\w+) is a (knight|knave)\.$/);
      if (self) {
        expect(!!self[1], `“inside the guess” exactly inside a supposition: ${next}`).toBe(!!sup);
        expect(idOf(self[2])).toBe(id);
        expect(self[3]).toBe(other(as));
        addFacts({ [id]: other(as) });
        i += 2;
      } else {
        // Both kinds break: the other half must follow, then the case crashes.
        const again = next.match(/^If (\w+) were a (knight|knave), \1 would be a \2 saying something (true|false)\.$/);
        expect(again, `double bind: ${item.explain}`).not.toBe(null);
        expect(idOf(again![1])).toBe(id);
        expect(again![2]).toBe(other(as));
        for (const k of open().filter((c) => c[id] === other(as))) expect(meaning[id](k)).toBe(again![3] === 'true');
        expect(sup).not.toBe(null);
        crashed = true;
        i += 2;
      }
    } else if ((m = s.match(/^That leaves one answer: (.+)\.$/))) {
      expect(i).toBe(ss.length - 1);
      expect(readFacts(m[1], idOf)).toEqual(answer);
      expect(known, `every islander was worked out: ${item.explain}`).toEqual(answer);
      i++;
    } else {
      throw new Error(`cannot read explanation sentence: ${s}\n${item.explain}`);
    }
  }
  expect(sup, 'every supposition ends').toBe(null);
  expect(ss[ss.length - 1]).toMatch(/^That leaves one answer/);
}

// ---------- tests ----------

describe('reading the words back', () => {
  it('claimText says every kind of claim in words that mean exactly that claim', () => {
    const nm = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
    const idOf = (n: string) => n.toLowerCase();
    for (const ids of [['ava', 'ben'], ['ava', 'ben', 'cal']]) {
      const [s, o, p] = ids;
      const claims: Claim[] = [
        { t: 'is', who: s, kind: 'knight' }, { t: 'is', who: o, kind: 'knave' },
        { t: 'same', a: s, b: o }, { t: 'diff', a: o, b: s },
        { t: 'count', op: 'atLeast', k: 1, kind: 'knave' }, { t: 'count', op: 'exactly', k: 1, kind: 'knight' },
        { t: 'count', op: 'exactly', k: ids.length, kind: 'knave' },
        { t: 'and', cs: [{ t: 'is', who: s, kind: 'knave' }, { t: 'is', who: o, kind: 'knave' }] },
        { t: 'and', cs: [{ t: 'is', who: s, kind: 'knave' }, { t: 'is', who: o, kind: 'knight' }] },
        { t: 'or', cs: [{ t: 'is', who: s, kind: 'knave' }, { t: 'is', who: o, kind: 'knight' }] },
        ...(p ? [{ t: 'same', a: o, b: p }, { t: 'count', op: 'exactly', k: 2, kind: 'knight' }, { t: 'and', cs: [{ t: 'is', who: o, kind: 'knight' }, { t: 'is', who: p, kind: 'knight' }] }] as Claim[] : []),
      ];
      for (const c of claims) {
        const text = claimText(c, s, nm, ids.length);
        const mean = readWords(text, s, idOf, ids);
        for (const k of cases(ids)) {
          const engine = solutions(ids, { [s]: c }, k).length === 1; // the speaker fits exactly when...
          expect(engine, `${text} ${JSON.stringify(k)}`).toBe((k[s] === 'knight') === mean(k));
        }
      }
    }
  });

  it('the rendered examples from the brief read as intended', () => {
    const nm = (id: string) => ({ ava: 'Ava', ben: 'Ben', cal: 'Cal' })[id] ?? id;
    expect(claimText({ t: 'is', who: 'ben', kind: 'knave' }, 'ava', nm, 2)).toBe('Ben is a knave.');
    expect(claimText({ t: 'same', a: 'ben', b: 'ava' }, 'ben', nm, 2)).toBe('Ava and I are the same kind.');
    expect(claimText({ t: 'count', op: 'exactly', k: 1, kind: 'knight' }, 'ava', nm, 3)).toBe('Exactly one of us is a knight.');
    expect(claimText({ t: 'count', op: 'atLeast', k: 1, kind: 'knave' }, 'ava', nm, 3)).toBe('At least one of us is a knave.');
    expect(claimText({ t: 'and', cs: [{ t: 'is', who: 'cal', kind: 'knight' }, { t: 'is', who: 'ben', kind: 'knight' }] }, 'ava', nm, 3)).toBe('Cal and Ben are both knights.');
    expect(claimText({ t: 'or', cs: [{ t: 'is', who: 'ava', kind: 'knight' }, { t: 'is', who: 'ben', kind: 'knight' }] }, 'cal', nm, 3)).toBe('Ava is a knight or Ben is a knight.');
    expect(claimText({ t: 'if', a: { t: 'is', who: 'ava', kind: 'knight' }, b: { t: 'is', who: 'cal', kind: 'knave' } }, 'ava', nm, 3)).toBe('If I am a knight, then Cal is a knave.');
  });

  it('name pools never repeat a first letter', () => {
    for (const id of SKIN_IDS) {
      const pool = SKINS[id].pool;
      expect(new Set(pool.map((n) => n[0])).size, id).toBe(pool.length);
      expect(pool, 'the letter I would read as a word').not.toContain('I');
    }
  });
});

describe('puzzles (mark each islander)', () => {
  const kinds = [
    { n: 2 as const, pool: 'basic' as const, lesson: 's5.l3', skill: 's5.two' },
    { n: 3 as const, pool: 'basic' as const, lesson: 's5.l4', skill: 's5.three' },
    { n: 2 as const, pool: 'andor' as const, lesson: 's5.l5', skill: 's5.and-or' },
  ];
  for (const o of kinds) {
    it(`${o.n} islanders, ${o.pool} words: exactly one way fits, read from the bubbles, and every explanation step holds`, () => {
      const answers = new Set<string>();
      let silent = 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const skin: SkinId = SKIN_IDS[seed % SKIN_IDS.length];
        const { item } = puzzleItem(createRng(seed), { id: 'x', skin, n: o.n, pool: o.pool, lesson: o.lesson, skill: o.skill });
        const { ids, names, meaning } = readScene(item);
        expect(item.people.map((p) => p.id)).toEqual(ids);
        expect(item.people.map((p) => p.label)).toEqual(ids.map((id) => names.get(id)));
        expect(new Set([...names.values()].map((n) => n[0])).size, 'different first letters').toBe(ids.length);
        expect(item.layout).toBe('toggles');
        expect(item.categories).toEqual([{ id: 'kind', label: 'Knight or knave', values: [{ id: 'knight', label: 'Knight' }, { id: 'knave', label: 'Knave' }], oneEach: false }]);
        expect(item.seconds).toBe(o.n === 3 ? 150 : undefined);
        // Brute force from the words alone.
        const fitting = cases(ids).filter((k) => allFit(ids, meaning, k));
        expect(fitting.length, item.prompt).toBe(1);
        expect(Object.fromEntries(ids.map((id) => [id, { kind: fitting[0][id] }]))).toEqual(item.answer);
        // The engine's claims say the same as the words.
        for (const id of ids) {
          expect(!!item.claims?.[id]).toBe(!!meaning[id]);
          if (meaning[id]) expect(claimText(item.claims![id], id, (x) => names.get(x)!, ids.length)).toBe((item.scene as { speakers: Speaker[] }).speakers.find((s) => s.id === id)!.says);
        }
        // Everyone who speaks could say their words in some case; nobody says "I am a knave."
        for (const id of ids) if (meaning[id]) expect(cases(ids).some((k) => fits(meaning, id, k))).toBe(true);
        const says = (item.scene as { speakers: Speaker[] }).speakers.map((s) => s.says).filter(Boolean);
        expect(new Set(says).size).toBe(says.length);
        if (o.pool === 'andor') expect(says.some((s) => / and | or /.test(s) && !/same kind|different kinds/.test(s))).toBe(true);
        const quiet = ids.filter((id) => !meaning[id]);
        silent += quiet.length ? 1 : 0;
        for (const id of quiet) expect(item.prompt).toContain(`${names.get(id)} says nothing.`);
        replay(item);
        cleanText(item);
        answers.add(ids.map((id) => fitting[0][id]).join());
      }
      expect(answers.size, 'answers vary').toBe(2 ** o.n);
      expect(silent, 'someone says nothing now and then').toBeGreaterThan(0);
    });
  }

  it('each explanation uses at most one supposition, and the supposition is the wrong kind', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { puzzle } = puzzleItem(createRng(seed), { id: 'x', skin: 'island', n: 3, lesson: 's5.l4', skill: 's5.three' });
      expect(puzzle.solve.supposes).toBeLessThanOrEqual(1);
      expect(solutions(puzzle.ids, puzzle.claims)).toEqual([puzzle.answer]);
    }
  });
});

describe('lesson 3: suppose it', () => {
  it('the answer is worked out from the bubbles: one kind fits, both fit (can’t tell), or neither (crash)', () => {
    const seen = new Set<SupposeAnswer>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const target = (['knight', 'knave', 'cant', 'crash', undefined] as const)[seed % 5];
      const { item } = supposeItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4], target });
      const { ids, names, meaning } = readScene(item);
      expect(ids.length).toBe(2);
      expect(Object.keys(meaning).length, 'both islanders speak').toBe(2);
      expect(cases(ids).some((k) => allFit(ids, meaning, k)), 'the islanders’ words fit at least one way').toBe(true);
      const m = item.prompt.match(/ Suppose (\w+) is a (knight|knave)\. What must (\w+) be\? Or does that guess crash\?$/)!;
      expect(m).not.toBe(null);
      const idOf = (n: string) => [...names].find(([, v]) => v === n)![0];
      const x = idOf(m[1]), y = idOf(m[3]), kx = m[2] as Kind;
      expect(x).not.toBe(y);
      const ok = KINDS.filter((v) => allFit(ids, meaning, { [x]: kx, [y]: v }));
      const ans = ok.length === 2 ? 'cant' : ok.length === 0 ? 'crash' : ok[0];
      expect(item.answer).toBe(ans);
      if (target) expect(ans).toBe(target);
      seen.add(ans);
      expect(item.choices.map((c) => c.label)).toEqual(['Knight', 'Knave', 'Can’t tell', 'That guess crashes']);
      wrongChoicesCovered(item);
      // "Can't tell" is wrong for a different reason when every case crashes.
      if (ans === 'crash') expect(item.whyWrong!.cant).not.toContain('only one case works');
      else if (ans !== 'cant') expect(item.whyWrong!.cant).toContain('only one case works');
      // Each case line in the explanation is right about that case.
      expect(item.explain.startsWith(`Suppose ${m[1]} is a ${kx}. `)).toBe(true);
      for (const v of KINDS) {
        const k = { [x]: kx, [y]: v };
        const line = item.explain.match(new RegExp(`If ${m[3]} is a ${v}, ([^.]+)\\.`))![1];
        if (line === 'everyone fits the rule') expect(allFit(ids, meaning, k)).toBe(true);
        else {
          const b = line.match(/^(\w+) would be a (knight|knave) saying something (true|false)$/)!;
          const who = idOf(b[1]);
          expect(k[who]).toBe(b[2]);
          expect(meaning[who](k)).toBe(b[3] === 'true');
          expect(fits(meaning, who, k)).toBe(false);
        }
      }
      cleanText(item);
    }
    expect(seen.size).toBe(4);
  });
});

describe('lesson 1: what the words tell you', () => {
  const FACTS = SKIN_IDS.flatMap((s) => SKINS[s].facts.map((f) => ({ f, skin: s })));
  const types: WordsType[] = ['fact', 'kindFromFact', 'other', 'speakerFromOther'];

  it('every answer is worked out from the question alone by listing the cases', () => {
    const answers = new Map<WordsType, Set<string>>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const type = types[seed % 4];
      const skin = SKIN_IDS[(seed >> 2) % 4];
      const speaker = (['knight', 'knave', 'unknown'] as const)[seed % 3];
      const truth = ([true, false, 'unknown'] as const)[(seed >> 1) % 3];
      const { item } = wordsItem(createRng(seed), { id: 'x', skin, type, speaker, negative: seed % 7 < 3, truth });
      const sc = item.scene;
      if (sc?.kind !== 'speakers') throw new Error('no scene');
      expect(sc.speakers.length).toBe(1);
      const S = sc.speakers[0].name;
      const said = sc.speakers[0].says;
      const intro = SKINS[skin].intro;
      const [before, after] = item.prompt.split(/ ?(?:\w+ the \w+|Islander \w|\w+) says, “[^”]+”/);
      expect(item.prompt).toContain(`says, “${said}”`);
      // What the words mean: a fact (p) or the other islander's kind.
      const fact = FACTS.find(({ f }) => f.say === said || f.sayNot === said);
      const otherName = said.match(/^(\w+) is a (knight|knave)\.$/);
      type W = { p: boolean; s: Kind; o: Kind };
      let worlds: W[] = [true, false].flatMap((p) => KINDS.flatMap((s) => KINDS.map((o) => ({ p, s, o }))));
      const wordsTrue = (w: W) => (fact ? (fact.f.say === said ? w.p : !w.p) : w.o === otherName![2]);
      worlds = worlds.filter((w) => (w.s === 'knight') === wordsTrue(w));
      // What the question tells you before the words.
      for (const sent of before.split(/(?<=\.) /).filter(Boolean)) {
        if (sent === `${intro(S)} is a knight.` || sent === `${intro(S)} is a knave.`) worlds = worlds.filter((w) => sent.endsWith(`${w.s}.`));
        else if (sent === `No one knows if ${intro(S)} is a knight or a knave.`) { /* nothing known */ }
        else if (otherName && (sent === `${intro(otherName[1])} is a knight.` || sent === `${intro(otherName[1])} is a knave.`)) worlds = worlds.filter((w) => sent.endsWith(`${w.o}.`));
        else if (fact) {
          const say = (t: string) => { const x = t.replace('{n}', intro(S)); return `${x.charAt(0).toUpperCase()}${x.slice(1)}.`; };
          if (sent === say(fact.f.yes)) worlds = worlds.filter((w) => w.p);
          else if (sent === say(fact.f.no)) worlds = worlds.filter((w) => !w.p);
          else throw new Error(`cannot read: ${sent}`);
        } else throw new Error(`cannot read: ${sent}`);
      }
      // The question.
      const q = after.trim();
      let vals: string[];
      if (fact && q === fact.f.ask.replace('{n}', S)) vals = [...new Set(worlds.map((w) => (w.p ? 'yes' : 'no')))];
      else if (q === `Is ${S} a knight or a knave?`) vals = [...new Set(worlds.map((w) => w.s))];
      else if (otherName && q === `Is ${otherName[1]} a knight or a knave?`) vals = [...new Set(worlds.map((w) => w.o))];
      else throw new Error(`cannot read question: ${q}`);
      expect(vals.length).toBeGreaterThan(0);
      const ans = vals.length === 1 ? vals[0] : 'cant';
      expect(item.answer, item.prompt).toBe(ans);
      if (!answers.has(type)) answers.set(type, new Set());
      answers.get(type)!.add(ans);
      wrongChoicesCovered(item);
      // A knave who says "not", or a knave talking about someone: the words point the wrong way.
      const trap = item.prompt.startsWith(`${intro(S)} is a knave.`) && ((type === 'fact' && fact!.f.sayNot === said) || type === 'other');
      expect(!!item.conflict, item.prompt).toBe(trap);
      cleanText(item);
    }
    expect([...answers.get('fact')!].sort()).toEqual(['cant', 'no', 'yes']);
    expect([...answers.get('kindFromFact')!].sort()).toEqual(['cant', 'knave', 'knight']);
    expect([...answers.get('other')!].sort()).toEqual(['cant', 'knave', 'knight']);
    expect([...answers.get('speakerFromOther')!].sort()).toEqual(['knave', 'knight']);
  });

  it('the speaker is introduced ("Mira the elf") the first time the name is used', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const skin: SkinId = (['elves', 'wizards', 'letters'] as const)[seed % 3];
      const { item } = wordsItem(createRng(seed), { id: 'x', skin, type: (['fact', 'kindFromFact', 'other', 'speakerFromOther'] as const)[seed % 4], truth: seed % 3 ? true : false });
      if (item.scene?.kind !== 'speakers') throw new Error('no scene');
      const name = item.scene.speakers[0].name;
      const intro = SKINS[skin].intro(name);
      const first = item.prompt.search(new RegExp(`\\b${name}\\b`));
      expect(item.prompt.slice(skin === 'letters' ? first - 'Islander '.length : first).startsWith(intro), item.prompt).toBe(true);
    }
  });
});

describe('lesson 2: who could say it?', () => {
  it('the answer comes from testing the words as a knight’s and as a knave’s', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const type = (['self', 'fact', 'partner', 'partner'] as const)[seed % 4];
      const skin = SKIN_IDS[(seed >> 2) % 4];
      const { item } = whoCanSayItem(createRng(seed), { id: 'x', skin, type });
      if (item.scene?.kind !== 'speakers') throw new Error('no scene');
      const said = item.scene.speakers[0].says;
      expect(item.scene.speakers[0].name).toBe(SKINS[skin].someone);
      expect(item.prompt.endsWith(`Who could say, “${said.replace(/\.$/, '')}”?`), item.prompt).toBe(true);
      const known = item.prompt.match(/^(?:(?:Islander )?(\w+)(?: the \w+)?) is a (knight|knave)\. /);
      let asKnight: boolean, asKnave: boolean;
      const fact = KNOWN_FACTS.find((f) => f.text === said);
      if (fact) {
        asKnight = asKnave = fact.truth;
      } else {
        const partner = known?.[1];
        const ids = partner ? [ME, partner.toLowerCase()] : [ME];
        expect(said, 'no “us” words: the question never says who “us” is').not.toMatch(/\bus\b|\bWe\b/);
        const mean = readWords(said, ME, (n) => { expect(n).toBe(partner); return n.toLowerCase(); }, ids);
        const fixed: Partial<K> = partner ? { [partner.toLowerCase()]: known![2] as Kind } : {};
        asKnight = mean({ ...fixed, [ME]: 'knight' } as K);
        asKnave = mean({ ...fixed, [ME]: 'knave' } as K);
      }
      const canKnight = asKnight, canKnave = !asKnave;
      const ans = canKnight && canKnave ? 'both' : canKnight ? 'knight' : canKnave ? 'knave' : 'neither';
      expect(item.answer, item.prompt).toBe(ans);
      seen.add(`${type}:${ans}`);
      wrongChoicesCovered(item);
      expect(item.explain).toContain(`If a knight said it, the words would be ${asKnight}.`);
      expect(item.explain).toContain(`If a knave said it, the words would be ${asKnave}.`);
      if (said === 'I am a knave.') expect(ans).toBe('neither');
      if (said === 'I am a knight.') expect(ans).toBe('both');
      cleanText(item);
    }
    for (const want of ['self:both', 'self:neither', 'fact:knight', 'fact:knave', 'partner:both', 'partner:neither', 'partner:knight', 'partner:knave']) expect(seen, want).toContain(want);
  });

  it('the card example: nobody could say “Ben and I are the same kind” about a knave', () => {
    const mean = readWords('Ben and I are the same kind.', ME, (n) => n.toLowerCase(), [ME, 'ben']);
    const k = (v: Kind) => ({ [ME]: v, ben: L2_EXAMPLE.partnerKind });
    expect(mean(k('knight')), 'from a knight: false').toBe(false);
    expect(mean(k('knave')), 'from a knave: true').toBe(true);
    const card = stop5.lessons[1].ideas.find((c) => c.title === 'It can depend on others')!;
    expect(card.body.join(' ')).toContain('no one could say it');
    // Would be, then must be: the words are worked out first, then compared with what each kind needs.
    expect(card.body.at(-1)).toBe('Now compare. A knight’s words must be true, so a knight can’t say it. A knave’s words must be false, so a knave can’t say it. So no one could say it.');
    expect(claimText(L2_EXAMPLE.claim, ME, (id) => (id === ME ? 'Someone' : 'Ben'), 2)).toBe('Ben and I are the same kind.');
  });
});

/** "Sol and Mo are both knights." / "Sol is a knight and Mo is a knave." -> index in [KK, KV, VK, VV]. */
function caseIndex(label: string, X: string, Y: string): number {
  const t = label.replace(/\.$/, '');
  const both = t.match(/^(\w+) and (\w+) are both (knight|knave)s$/);
  const one = t.match(/^(\w+) is a (knight|knave) and (\w+) is a (knight|knave)$/);
  if (both) expect([both[1], both[2]]).toEqual([X, Y]);
  else if (one) expect([one[1], one[3]]).toEqual([X, Y]);
  else throw new Error(`cannot read case: ${label}`);
  const k = both ? [both[3], both[3]] : [one![2], one![4]];
  return ['knight,knight', 'knight,knave', 'knave,knight', 'knave,knave'].indexOf(k.join());
}

/** What each and/or choice says is still possible: [both knights, only X a knight, only Y a knight, both knaves]. */
function choiceCases(label: string, X: string, Y: string): boolean[] {
  if (label === `${X} and ${Y} are both knights.`) return [true, false, false, false];
  if (label === `${X} and ${Y} are both knaves.`) return [false, false, false, true];
  if (label === `At least one of ${X} and ${Y} is a knave. It could be just one.`) return [false, true, true, true];
  if (label === `At least one of ${X} and ${Y} is a knight. It could be just one.`) return [true, true, true, false];
  throw new Error(`cannot read choice: ${label}`);
}

describe('lesson 5: a knave’s “and” and “or”', () => {
  it('the right choice allows exactly the cases where the speaker’s words fit; every other choice does not', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { item } = andOrItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4] });
      const m = item.prompt.match(/^(?:.+?) is a (knight|knave)\. (\w+) says, “(.+)\.” Which choice says exactly what you know about (\w+) and (\w+)\?$/)!;
      expect(m, item.prompt).not.toBe(null);
      const [, sk, S, said, X, Y] = m;
      const mean = readWords(said, S.toLowerCase(), (n) => n.toLowerCase(), [S, X, Y].map((n) => n.toLowerCase()));
      const all: K[] = [['knight', 'knight'], ['knight', 'knave'], ['knave', 'knight'], ['knave', 'knave']].map(([a, b]) => ({ [X.toLowerCase()]: a as Kind, [Y.toLowerCase()]: b as Kind }));
      const keep = all.map((k) => mean(k) === (sk === 'knight'));
      const right = item.choices.filter((c) => choiceCases(c.label, X, Y).join() === keep.join());
      expect(right.map((c) => c.id), item.prompt).toEqual([item.answer]);
      expect(item.choices.length).toBe(4);
      expect(!!item.conflict).toBe(sk === 'knave');
      wrongChoicesCovered(item);
      // Each wrong choice's example is a case it gets wrong: one it allows that can't happen, or one it leaves
      // out that can. The words' truth there is re-computed from the bubble.
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const fb = item.feedback![c.id];
        const allowed = choiceCases(c.label, X, Y);
        const i = caseIndex(fb.example!.label, X, Y);
        expect(allowed[i] !== keep[i], `${c.id}: ${fb.example!.label}`).toBe(true);
        expect(bare(fb.example!.truths)).toEqual([{ who: `${S}’s words`, value: mean(all[i]) }, { who: 'Your answer', value: allowed[i] }, { who: 'The right answer', value: keep[i] }]);
        checkBecause(fb.example!.truths![0], lower, [X, Y].map(lower));
        for (const line of [...fb.detail, ...(fb.simpler ?? [])]) {
          const named = line.match(/the case where (.+?)\. There, \w+’s words are (true|false)/);
          if (named) expect(mean(all[caseIndex(named[1], X, Y)]), line).toBe(named[2] === 'true');
        }
      }
      seen.add(`${sk}:${said.includes(' or ') ? 'or' : 'and'}:${item.answer}`);
      cleanText(item);
    }
    // A knave's "both knights" leaves at least one knave (maybe not both); a knave's "or" leaves both knaves.
    expect(seen).toContain('knave:and:oneKnave');
    expect(seen).toContain('knave:or:bothKnave');
    expect(seen).toContain('knight:or:oneKnight');
    expect(seen).toContain('knight:and:bothKnight');
  });
});

describe('stop 5 content', () => {
  it('the lesson 3 example has one answer, and the engine explains it the way the cards do: inside the guess, then after the crash', () => {
    const { ids, claims, answer } = L3_EXAMPLE;
    expect(solutions(ids, claims)).toEqual([answer]);
    const nm = (id: string) => (id === 'ava' ? 'Ava' : 'Ben');
    const solve = explainSolve(ids, claims, answer, nm)!;
    expect(solve.supposed).toEqual(['ava']);
    expect(solve.lines.slice(0, 4)).toEqual([
      'Suppose Ava is a knave.',
      'Then Ava’s words must be false. They say Ben is a knave. False means Ben is a knight. So, inside the guess, Ben is a knight.',
      'Ben is a knight, so Ben’s words must be true. But with Ava a knave and Ben a knight, they are false.',
      'That guess crashes, so Ava is a knight.',
    ]);
    expect(solve.guesses).toEqual([{ who: 'ava', kind: 'knave', inside: { ava: 'knave', ben: 'knight' }, world: { ava: 'knave', ben: 'knight' }, breaker: 'ben' }]);
    const l3 = stop5.lessons[2];
    const inside = l3.ideas.find((c) => c.title === 'Inside the guess')!;
    const after = l3.ideas.find((c) => c.title === 'After the crash')!;
    expect(inside.scene).toBe(L3_GUESS_SCENE);
    if (inside.scene?.kind !== 'speakers') throw new Error('no scene');
    expect(inside.scene.speakers.map((s) => s.says)).toEqual(ids.map((id) => claimText(claims[id], id, nm, 2)));
    // The guess is the test-world banner, never a fact.
    expect(inside.scene.test).toBe('Ava is a knave. This is a guess.');
    expect(inside.scene.fact).toBeUndefined();
    // Each step on the cards holds in every case left when it is said: Need, Says, So.
    const mean = readSpeakers(inside.scene).meaning;
    expect(cases(ids, { ava: 'knave' }).filter((k) => fits(mean, 'ava', k)).every((k) => k.ben === 'knight')).toBe(true);
    expect(cases(ids, { ava: 'knave', ben: 'knight' }).some((k) => fits(mean, 'ben', k))).toBe(false);
    expect(cases(ids, { ava: 'knight' }).filter((k) => fits(mean, 'ava', k)).every((k) => k.ben === 'knave')).toBe(true);
    expect(allFit(ids, mean, answer)).toBe(true);
    expect(inside.body[0]).toBe('Suppose Ava is a knave. That is a guess, so everything we find now is inside the guess.');
    expect(inside.body[1]).toBe('Need: Ava’s words must be false. Says: Ben is a knave. So: false means Ben is a knight, inside the guess.');
    expect(inside.body[2]).toMatch(/The guess crashes!$/);
    expect(after.body[0]).toBe('The guess crashed, so throw it away, and everything inside it. Now we know: Ava is a knight.');
    expect(after.body.join(' ')).toContain('So: Ben is a knave. This is known.');
    expect(after.body.at(-1)).toBe('Ben was a knight inside the guess. Now Ben is a knave. That is fine: the first was only pretend.');
  });

  it('the lesson 4 example has one answer, and supposing Ava is a knight crashes; Ben and Cal both flip after the crash', () => {
    const { ids, claims, answer } = L4_EXAMPLE;
    expect(solutions(ids, claims)).toEqual([answer]);
    expect(solutions(ids, claims, { ava: 'knight' })).toEqual([]);
    const nm = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
    const l4 = stop5.lessons[3];
    const inside = l4.ideas.find((c) => c.title === 'Inside the guess')!;
    const after = l4.ideas.find((c) => c.title === 'After the crash')!;
    expect(inside.scene).toBe(L4_GUESS_SCENE);
    if (inside.scene?.kind !== 'speakers') throw new Error('no scene');
    expect(inside.scene.speakers.map((s) => s.says)).toEqual(ids.map((id) => claimText(claims[id], id, nm, 3)));
    expect(inside.scene.test).toBe('Ava is a knight. This is a guess.');
    // Each step on the cards holds in every case that is left when it is said.
    const mean = readSpeakers(inside.scene).meaning;
    expect(cases(ids, { ava: 'knight' }).filter((k) => fits(mean, 'ava', k)).every((k) => k.ben === 'knave')).toBe(true);
    expect(cases(ids, { ava: 'knight', ben: 'knave' }).filter((k) => fits(mean, 'ben', k)).every((k) => k.cal === 'knight')).toBe(true);
    expect(cases(ids, { ava: 'knight', ben: 'knave', cal: 'knight' }).some((k) => fits(mean, 'cal', k))).toBe(false);
    expect(cases(ids, { ava: 'knave' }).filter((k) => fits(mean, 'ava', k)).every((k) => k.ben === 'knight')).toBe(true);
    expect(cases(ids, { ava: 'knave', ben: 'knight' }).filter((k) => fits(mean, 'ben', k)).every((k) => k.cal === 'knave')).toBe(true);
    expect(inside.body.join(' ')).toContain('So: false means Cal is a knight, inside the guess.');
    expect(after.body[0]).toBe('The guess crashed, so throw it away, and everything inside it. Now we know: Ava is a knave.');
    expect(after.body.join(' ')).toContain('Says: Ben is a knave. So: false means Ben is a knight.');
    expect(after.body.join(' ')).toContain('Says: Cal is a knave. So: Cal is a knave.');
    // Ben and Cal flip from inside the guess to known, as the card says.
    const g = explainSolve(ids, claims, answer, nm)!.guesses[0];
    expect(['ben', 'cal'].every((id) => g.inside[id] !== answer[id])).toBe(true);
    expect(after.body.at(-1)).toBe('Ben and Cal both flip. That is fine: the first ones were only pretend.');
  });

  it('the lesson 5 example: Raj and Vic are both knaves', () => {
    const { ids, claims, answer } = L5_EXAMPLE;
    expect(solutions(ids, claims)).toEqual([answer]);
    const card = stop5.lessons[4].ideas.find((c) => c.title === 'When “I” is one part')!;
    if (card.scene?.kind !== 'speakers') throw new Error('no scene');
    const nm = (id: string) => (id === 'raj' ? 'Raj' : 'Vic');
    expect(card.scene.speakers[0].says).toBe(claimText(claims.raj, 'raj', nm, 2));
    expect(card.body.join(' ')).toContain('So Raj is a knave.');
    expect(card.body.join(' ')).toContain('Vic is a knave.');
  });

  it('the “and” / “or” cards say what the case lists say', () => {
    const [andCard, orCard, knightOr] = stop5.lessons[4].ideas;
    const all: K[] = cases(['ava', 'ben']);
    const bothKnights = readWords('Ava and Ben are both knights.', 'cal', (n) => n.toLowerCase(), ['ava', 'ben', 'cal']);
    const either = readWords('Ava is a knight or Ben is a knight.', 'cal', (n) => n.toLowerCase(), ['ava', 'ben', 'cal']);
    const leftAnd = all.filter((k) => !bothKnights(k));
    expect(leftAnd.length).toBe(3);
    expect(leftAnd.every((k) => k.ava === 'knave' || k.ben === 'knave')).toBe(true);
    expect(leftAnd.some((k) => k.ava !== k.ben), 'maybe not both').toBe(true);
    expect(andCard.body.join(' ')).toContain('at least one of Ava and Ben is a knave. It could be just one.');
    expect(all.filter((k) => !either(k))).toEqual([{ ava: 'knave', ben: 'knave' }]);
    expect(orCard.body.join(' ')).toContain('Ava and Ben are both knaves.');
    expect(all.filter((k) => either(k)).length).toBe(3);
    expect(knightOr.body.join(' ')).toContain('Maybe Ava and Ben both are.');
  });

  it('every skill tag used has a plain name, and every lesson teaches its own skills', () => {
    const used = new Map<string, Set<string>>();
    for (let seed = 1; seed <= 30; seed++) {
      for (const l of stop5.lessons) for (const it of l.practice(createRng(seed))) (used.get(it.skill) ?? used.set(it.skill, new Set()).get(it.skill)!).add(it.lesson);
      for (const it of stop5.check!(createRng(seed))) {
        expect(SKILL_NAMES[it.skill], it.skill).toBeDefined();
        // A check item's skill is practised in the lesson it points to, so the Notebook can find a fresh one.
        expect(used.get(it.skill)?.has(it.lesson), `${it.skill} in ${it.lesson}`).toBe(true);
      }
    }
    expect([...used.keys()].sort()).toEqual(Object.keys(SKILL_NAMES).sort());
  });

  it('every check has a two-islander and a three-islander puzzle, and a knave’s “and” / “or”', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const items = stop5.check!(createRng(seed));
      const assigns = items.filter((i): i is AssignItem => i.kind === 'assign');
      expect(assigns.some((i) => i.people.length === 2)).toBe(true);
      expect(assigns.some((i) => i.people.length === 3 && i.seconds === 150)).toBe(true);
      expect(items.some((i) => i.skill === 's5.and-or' && i.conflict)).toBe(true);
      for (const it of items) cleanText(it);
    }
  });

  it('practice sets mix skins: at least two of everyday, fantasy and letters', () => {
    const skinOf = (it: Item) => {
      const names = it.scene?.kind === 'speakers' ? it.scene.speakers.map((s) => s.name) : [];
      if (names.includes('An islander')) return 'abstract';
      if (names.includes('An elf') || names.includes('A wizard')) return 'fantasy';
      if (names.some((n) => /^[A-E]$/.test(n)) || /Islander [A-E]/.test(it.prompt)) return 'abstract';
      if (FANTASY_NAMES.some((n) => names.includes(n) || it.prompt.includes(n))) return 'fantasy';
      return 'everyday';
    };
    const FANTASY_NAMES = [...SKINS.elves.pool, ...SKINS.wizards.pool];
    for (let seed = 1; seed <= 40; seed++) {
      for (const l of stop5.lessons) {
        const kinds = new Set(l.practice(createRng(seed)).map(skinOf));
        expect(kinds.size, `${l.id} seed ${seed}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('the same seed gives the same items; arcade items are all valid', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(stop5.check!(createRng(seed))).toEqual(stop5.check!(createRng(seed)));
      expect(stop5.practice!(createRng(seed))).toEqual(stop5.practice!(createRng(seed)));
      cleanText(stop5.practice!(createRng(seed)));
    }
  });
});

// ---------- wrong answers teach first (handoff v1.0) ----------

/** A sentence's verdict in a case card: { who, value }. */
type TruthRow = { who: string; value: boolean };

/** The shape the handoff asks for, and clean words in every teaching string. */
function teachShape(item: Item) {
  const t = item.teach;
  expect(t, `${item.skill}: ${item.prompt}`).toBeDefined();
  if (!t) return;
  expect(t.rule.trim().length).toBeGreaterThan(0);
  expect(t.terms!.length).toBeGreaterThanOrEqual(1);
  expect(t.terms!.length).toBeLessThanOrEqual(4);
  expect(t.meaning!.trim().length).toBeGreaterThan(0);
  expect(t.casesTitle!.trim().length).toBeGreaterThan(0);
  expect(t.cases!.length).toBeGreaterThanOrEqual(2);
  expect(t.cases!.length).toBeLessThanOrEqual(4);
  expect(t.remember!.length).toBe(2);
  expect(t.remember![1]).toMatch(/^Ask: “.+”$/);
  expect(t.simpler!.length).toBeGreaterThanOrEqual(2);
  const strings = teachStrings(item);
  const all = strings.join('\n');
  // Words the teaching leans on are defined in place.
  const words_ = t.terms!.map((x) => x.word);
  if (/\bcases?\b/.test(all)) expect(words_, item.prompt).toContain('A case');
  // Every special word in the bubbles is defined: each counting phrase with "us" or "we", "or", the joining
  // "and", "the same kind" and "different kinds".
  for (const said of item.scene?.kind === 'speakers' ? item.scene.speakers.map((sp) => sp.says) : []) {
    for (const want of specialWords(said)) expect(words_, `“${said}” needs ${want} defined`).toContain(want);
  }
  // "Fits the rule" and "breaks the rule" lean on a rule the teaching states: what a knight's words must be.
  if (/\b(fits?|breaks?) the rule\b/.test(all)) expect(t.rule, 'the rule says what a knight’s words must be').toMatch(/knight[^.]*\b(true|truth)\b/i);
  // Plain, calm words: curly quotes with the period inside, no he/she, nothing left for the player to work out.
  expect(all, 'curly quotes only').not.toMatch(/['"]/);
  expect(all).not.toMatch(/undefined|NaN|\{n\}|\{list\}|\s\s|\.\.|,,|”[.,]/);
  expect(all).not.toMatch(/\b(he|she|him|her|his|hers|himself|herself)\b/i);
  expect(all).not.toMatch(/that row|the opposite|\bWrong\b|Try again/i);
  // "The rule" here is the knight / knave rule, so no other "rule" phrase ("rule out") muddles it.
  expect(all).not.toMatch(/\brules? out\b/i);
  for (const m of all.matchAll(/\b[Bb]oth\b(?: (\S+))?/g)) expect(m[1], `“both” says what it refers to: ${m.input?.slice(Math.max(0, m.index! - 40), m.index! + 30)}`).toMatch(/^(knights|knaves|parts|work|break|of)\b/);
  for (const s of strings) for (const sent of sentences(s)) expect(words(sent).length, sent).toBeLessThanOrEqual(READING.maxSentenceWords);
  // Each block the panel shows (a term, a case line, a detail paragraph) reads at grade 7 or lower on its own.
  for (const s of strings) expect(fkGrade(s), s).toBeLessThanOrEqual(READING.maxGrade);
  if (item.kind === 'choose') {
    for (const c of item.choices) if (c.id !== item.answer) {
      const fb = item.feedback?.[c.id];
      expect(fb, `${c.id} has feedback`).toBeDefined();
      expect(fb!.headline).toMatch(/^[A-Z].*\.$/);
      expect(fb!.detail.length).toBeGreaterThan(0);
      expect(fb!.example, `${c.id} shows a case`).toBeDefined();
    }
    expect(Object.keys(item.feedback ?? {}).sort()).toEqual(item.choices.map((c) => c.id).filter((id) => id !== item.answer).sort());
  }
}

/** The terms an islander's words need, read from the words alone. */
function specialWords(said: string): string[] {
  const out: string[] = [];
  const count = said.match(/^(At least|At most|Exactly) (\w+) of us\b/);
  if (count) out.push(`“${count[1]} ${count[2]} of us”`);
  if (/^We are\b/.test(said)) out.push('“We”');
  if (/^None of us\b/.test(said)) out.push('“None of us”');
  if (/ or /.test(said)) out.push('“Or”');
  // "and" joining two sentences ("I am a knave and Vic is a knight"), not a list of names ("Ava and Ben are …").
  if (/(am|is) a (knight|knave) and /.test(said)) out.push('“And”');
  if (/the same kind/.test(said)) out.push('“The same kind”');
  if (/different kinds/.test(said)) out.push('“Different kinds”');
  return out;
}

/** Each headline matches exactly one kind's pattern, and it is the kind worked out from the cases. */
function expectKind(patterns: Record<string, RegExp>, kind: string, headline: string) {
  const hits = Object.entries(patterns).filter(([, re]) => re.test(headline)).map(([k]) => k);
  expect(hits, headline).toEqual([kind]);
}

/** "Ava is a knight and Ben is a knave." / "A is a knight, B is a knave and C is a knave." -> kinds by id. */
function readCase(label: string, idOf: (n: string) => string): K {
  return readFacts(label.replace(/\.$/, ''), idOf);
}

/** A case card's truths re-computed from the bubbles: each speaker's words, in scene order. */
function speakerTruths(item: Item, k: K): TruthRow[] {
  const { ids, names, meaning } = readScene(item);
  return ids.filter((id) => meaning[id]).map((id) => ({ who: `${names.get(id)}’s words`, value: meaning[id](k) }));
}

const works = (c: TeachCase) => /This case works\.$/.test(c.note ?? '');

// ---------- lesson 1, read back from the question alone ----------

const FACT_BANK = SKIN_IDS.flatMap((s) => SKINS[s].facts.map((f) => ({ f, skin: s })));
type W = { p: boolean; s: Kind; o: Kind };

function readL1(item: ChooseItem) {
  if (item.scene?.kind !== 'speakers') throw new Error('no scene');
  const S = item.scene.speakers[0].name;
  const said = item.scene.speakers[0].says;
  const skin = SKIN_IDS.filter((s) => SKINS[s].pool.includes(S));
  expect(skin.length, 'names belong to one skin').toBe(1);
  const intro = SKINS[skin[0]].intro;
  const [before, after] = item.prompt.split(/ ?(?:\w+ the \w+|Islander \w|\w+) says, “[^”]+”/);
  const fact = FACT_BANK.find(({ f }) => f.say === said || f.sayNot === said);
  const otherName = said.match(/^(\w+) is a (knight|knave)\.$/);
  const wordsTrue = (w: W) => (fact ? (fact.f.say === said ? w.p : !w.p) : w.o === otherName![2]);
  const fits = (w: W) => (w.s === 'knight') === wordsTrue(w);
  let known: W[] = [true, false].flatMap((p) => KINDS.flatMap((s) => KINDS.map((o) => ({ p, s, o }))));
  let speakerKind: Kind | undefined;
  for (const sent of before.split(/(?<=\.) /).filter(Boolean)) {
    if (sent === `${intro(S)} is a knight.` || sent === `${intro(S)} is a knave.`) {
      speakerKind = sent.endsWith('knight.') ? 'knight' : 'knave';
      known = known.filter((w) => w.s === speakerKind);
    } else if (sent === `No one knows if ${intro(S)} is a knight or a knave.`) { /* nothing known */ }
    else if (otherName && (sent === `${intro(otherName[1])} is a knight.` || sent === `${intro(otherName[1])} is a knave.`)) known = known.filter((w) => sent.endsWith(`${w.o}.`));
    else if (fact) {
      const say = (t: string) => { const x = t.replace('{n}', intro(S)); return `${x.charAt(0).toUpperCase()}${x.slice(1)}.`; };
      if (sent === say(fact.f.yes)) known = known.filter((w) => w.p);
      else if (sent === say(fact.f.no)) known = known.filter((w) => !w.p);
      else throw new Error(`cannot read: ${sent}`);
    } else throw new Error(`cannot read: ${sent}`);
  }
  const q = after.trim();
  const asks: 'fact' | 'other' | 'speaker' = fact && q === fact.f.ask.replace('{n}', S) ? 'fact' : q === `Is ${S} a knight or a knave?` ? 'speaker' : 'other';
  if (asks === 'other') expect(q).toBe(`Is ${otherName![1]} a knight or a knave?`);
  const qOf = (w: W) => (asks === 'fact' ? (w.p ? 'yes' : 'no') : asks === 'other' ? w.o : w.s);
  // Only the parts the words use matter: the fact, or the other islander's kind.
  const key = (w: W) => (fact ? `${w.s}|${w.p}` : `${w.s}|${w.o}`);
  const unique = [...new Map(known.map((w) => [key(w), w])).values()];
  const fill = (t: string) => t.replace('{n}', S);
  const readLabel = (label: string): W => {
    const m = label.match(/^(\S+) is a (knight|knave), and (.+)\.$/);
    if (!m) throw new Error(`cannot read case: ${label}`);
    expect(m[1]).toBe(S);
    if (fact) {
      const p = m[3] === fill(fact.f.yes) ? true : m[3] === fill(fact.f.no) ? false : null;
      if (p === null) throw new Error(`cannot read fact: ${m[3]}`);
      return { s: m[2] as Kind, p, o: 'knight' };
    }
    const mo = m[3].match(/^(\S+) is a (knight|knave)$/)!;
    expect(mo[1]).toBe(otherName![1]);
    return { s: m[2] as Kind, p: true, o: mo[2] as Kind };
  };
  const cap1 = (x: string) => `${x.charAt(0).toUpperCase()}${x.slice(1)}.`;
  /** The reason behind the words' truth in a case: what they say (the speaker named), what is so there, and the match. */
  const because = (w: W) =>
    fact
      ? { says: cap1(fill(fact.f.say === said ? fact.f.yes : fact.f.no)), world: cap1(fill(w.p ? fact.f.yes : fact.f.no)), match: wordsTrue(w) }
      : { says: `${otherName![1]} is a ${otherName![2]}.`, world: `${otherName![1]} is a ${w.o}.`, match: wordsTrue(w) };
  return { S, said, fact, otherName, known: unique, wordsTrue, fits, asks, qOf, key, speakerKind, readLabel, fill, because };
}

const L1_KINDS: Record<string, RegExp> = {
  cantKnown: /^You can tell, because you know .+\.$/,
  leavesOut: /^Your answer leaves out a case that works: .+\.$/,
  knightFalse: /^Your answer gives a knight false words\.$/,
  knaveTrue: /^Your answer gives a knave true words\.$/,
  knaveBelieved: /^Your answer takes a knave’s words as true\.$/,
  knightDoubted: /^Your answer makes a knight’s words false\.$/,
};
const L2_KINDS: Record<string, RegExp> = {
  extraKnight: /^Your answer lets a knight say something false\.$/,
  extraKnave: /^Your answer lets a knave say something true\.$/,
  missKnight: /^Your answer leaves out knights, but a knight could say it\.$/,
  missKnave: /^Your answer leaves out knaves, but a knave could say it\.$/,
  swap: /^Your answer swaps knights and knaves\.$/,
  bothExtra: /^Your answer lets a knight say something false and a knave say something true\.$/,
  bothMissing: /^Your answer leaves out knights and knaves, but each kind could say it\.$/,
};
const L3_KINDS: Record<string, RegExp> = {
  breaks: /^With \w+ as a (knight|knave), \w+ breaks the rule\.$/,
  leavesOut: /^Your answer leaves out a case: \w+ could also be a (knight|knave)\.$/,
  cantOne: /^You can tell, because only one case works\.$/,
  cantNone: /^Your answer needs two cases that work, but no case works\.$/,
  crashOne: /^The guess does not crash, because one case works\.$/,
  crashTwo: /^The guess does not crash, because two cases work\.$/,
};
const L5_KINDS: Record<string, RegExp> = {
  reverseKnave: /^Your answer takes a knave’s words as true\.$/,
  reverseKnight: /^Your answer takes a knight’s words as false\.$/,
  swap: /^Your answer mixes up knights and knaves\.$/,
  extra: /^Your answer allows a case that can’t happen\.$/,
  missing: /^Your answer leaves out a case that can still happen\.$/,
};

describe('wrong answers teach first (handoff v1.0)', () => {
  it('lesson 1: the cases are every way things could be, each computed; each wrong choice shows a case that proves its gap', () => {
    const seen = new Set<string>();
    const types: WordsType[] = ['fact', 'kindFromFact', 'other', 'speakerFromOther'];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const type = types[seed % 4];
      const speaker = (['knight', 'knave', 'unknown'] as const)[seed % 3];
      const truth = ([true, false, 'unknown'] as const)[(seed >> 1) % 3];
      const { item } = wordsItem(createRng(seed), { id: 'x', skin: SKIN_IDS[(seed >> 2) % 4], type, speaker, negative: seed % 7 < 3, truth });
      teachShape(item);
      const r = readL1(item);
      const cases = item.teach!.cases!;
      // Every way things could be, given what the question tells you, and nothing else.
      expect(cases.map((c) => r.key(r.readLabel(c.label))).sort(), item.prompt).toEqual(r.known.map(r.key).sort());
      for (const c of cases) {
        const w = r.readLabel(c.label);
        expect(bare(c.truths)).toEqual([{ who: `${r.S}’s words`, value: r.wordsTrue(w) }]);
        // Each truth comes with its reason: what the words say and what is so, never the speaker's kind.
        expect(c.truths![0].because, c.label).toEqual(r.because(w));
        expect(c.words?.world).toBe('In this case');
        expect(works(c), c.label).toBe(r.fits(w));
      }
      // What the question states is the fact banner over the bubble.
      if (item.scene?.kind === 'speakers' && r.speakerKind) expect(item.scene.fact).toBe(`${r.S} is a ${r.speakerKind}.`);
      if (item.scene?.kind === 'speakers' && /^No one knows/.test(item.prompt)) expect(item.scene.fact).toBeUndefined();
      // The meaning says when the words are true, and the right answer is what the working cases agree on.
      expect(item.teach!.meaning).toContain(`${r.S}’s words, “${r.said.replace(/\.$/, '')},” are true only when`);
      const answers = [...new Set(r.known.filter(r.fits).map(r.qOf))];
      expect(item.answer).toBe(answers.length === 1 ? answers[0] : 'cant');
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const fb = item.feedback![c.id];
        const ex = r.readLabel(fb.example!.label);
        expect(r.known.map(r.key), 'the example is a case the question allows').toContain(r.key(ex));
        expect(bare([fb.example!.truths![0]])[0]).toEqual({ who: `${r.S}’s words`, value: r.wordsTrue(ex) });
        expect(fb.example!.truths![0].because).toEqual(r.because(ex));
        const yours = fb.example!.truths!.find((t) => t.who === 'Your answer');
        if (yours) expect(yours.value, 'your answer’s truth in the example').toBe(r.qOf(ex) === c.id);
        let kind: string;
        if (c.id === 'cant') {
          kind = 'cantKnown';
          // The only other case breaks the rule.
          expect(r.fits(ex)).toBe(false);
          expect(r.known.filter(r.fits).length).toBe(1);
        } else if (item.answer === 'cant') {
          kind = 'leavesOut';
          // A case that works, where the pick is false.
          expect(r.fits(ex)).toBe(true);
          expect(r.qOf(ex)).not.toBe(c.id);
          // The headline names the whole case, as the card does: half of it ("Vic is a knight") would also cover a
          // case that does not work.
          expect(fb.headline).toBe(`Your answer leaves out a case that works: ${fb.example!.label}`);
          const half = r.known.filter((w) => (r.asks === 'speaker' && r.fact ? w.p === ex.p : w.s === ex.s));
          expect(half.some((w) => !r.fits(w)), 'half a case also covers one that does not work').toBe(true);
        } else {
          // The pick needs a case where the speaker breaks the rule.
          expect(r.fits(ex)).toBe(false);
          expect(r.qOf(ex)).toBe(c.id);
          kind = r.asks === 'speaker' ? (ex.s === 'knight' ? 'knightFalse' : 'knaveTrue') : r.speakerKind === 'knave' ? 'knaveBelieved' : 'knightDoubted';
          if (kind === 'knaveBelieved') expect(r.wordsTrue(ex)).toBe(true);
          if (kind === 'knightDoubted') expect(r.wordsTrue(ex)).toBe(false);
        }
        expectKind(L1_KINDS, kind, fb.headline);
        seen.add(kind);
      }
      // The smaller example ends on the right answer.
      const last = item.teach!.simpler!.at(-1)!;
      if (item.answer === 'cant') expect(last).toMatch(/you can’t tell\.$/);
      else expect(last).toMatch(r.asks === 'speaker' ? new RegExp(`(^|\\. )So ${r.S} is a ${item.answer}\\.$`) : /(^|\. )So [^.]+\.$/);
      // The right answer's reason says what is not known, never a bare "You don’t know which".
      if (item.answer === 'cant') {
        expect(item.explain).not.toMatch(/\bwhich\b/);
        const unknown = r.asks === 'speaker' && r.fact ? `You don’t know if ${r.fill(r.fact.f.yes)}` : `No one knows if ${r.S} is a knight or a knave`;
        expect(item.explain.endsWith(`${unknown}, so you can’t tell.`), item.explain).toBe(true);
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(L1_KINDS).sort());
  });

  it('lesson 2: each kind of speaker is a case, computed; each wrong choice names the kind it gets wrong', () => {
    const seen = new Set<string>();
    const PICKS: Record<string, [boolean, boolean]> = { 'Only a knight': [true, false], 'Only a knave': [false, true], 'Either kind': [true, true], 'No one': [false, false] };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const type = (['self', 'fact', 'partner', 'partner'] as const)[seed % 4];
      const { item } = whoCanSayItem(createRng(seed), { id: 'x', skin: SKIN_IDS[(seed >> 2) % 4], type });
      teachShape(item);
      if (item.scene?.kind !== 'speakers') throw new Error('no scene');
      const said = item.scene.speakers[0].says;
      const known = item.prompt.match(/^(?:(?:Islander )?(\w+)(?: the \w+)?) is a (knight|knave)\. /);
      const fact = KNOWN_FACTS.find((f) => f.text === said);
      const as: Record<Kind, boolean> = { knight: false, knave: false };
      for (const k of KINDS) {
        if (fact) as[k] = fact.truth;
        else {
          const partner = known?.[1];
          const mean = readWords(said, ME, (n) => n.toLowerCase(), partner ? [ME, partner.toLowerCase()] : [ME]);
          as[k] = mean({ [ME]: k, ...(partner ? { [partner.toLowerCase()]: known![2] as Kind } : {}) });
        }
      }
      const can: Record<Kind, boolean> = { knight: as.knight, knave: !as.knave };
      const cases = item.teach!.cases!;
      expect(cases.length).toBe(2);
      cases.forEach((c, i) => {
        const m = c.label.match(/^The speaker is a (knight|knave)(?:, and (\w+) is a (knight|knave))?\.$/)!;
        expect(m, c.label).not.toBe(null);
        const k = m[1] as Kind;
        expect(k).toBe(KINDS[i]);
        if (known) expect([m[2], m[3]]).toEqual([known[1], known[2]]);
        expect(bare(c.truths)).toEqual([{ who: 'The words', value: as[k] }]);
        // The reason: what the words say ("I" read as the pretend speaker), in this case's world, and the verdict.
        const bc = c.truths![0].because!;
        expect(bc.match).toBe(as[k]);
        if (!fact) {
          const said2 = readNamed(bc.says.replace(/\b[Tt]he speaker\b/g, 'Speaker'), (n) => (n === 'Speaker' ? ME : n.toLowerCase()), known ? [ME, known[1].toLowerCase()] : [ME]);
          expect(said2({ [ME]: k, ...(known ? { [known[1].toLowerCase()]: known[2] as Kind } : {}) }), bc.says).toBe(as[k]);
          expect(bc.world).toBe(c.label);
        }
        expect(c.words?.world).toBe('Pretend');
        expect(c.note!.endsWith(`could say it.`), c.note).toBe(can[k]);
      });
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const fb = item.feedback![c.id];
        const [pk, pv] = PICKS[c.label];
        const offK = pk !== can.knight, offV = pv !== can.knave;
        expect(offK || offV).toBe(true);
        const kind = offK && offV ? (pk && pv ? 'bothExtra' : !pk && !pv ? 'bothMissing' : 'swap')
          : offK ? (pk ? 'extraKnight' : 'missKnight') : (pv ? 'extraKnave' : 'missKnave');
        expectKind(L2_KINDS, kind, fb.headline);
        seen.add(kind);
        // The example is a kind of speaker the pick is wrong about.
        const ek = (fb.example!.label.match(/^The speaker is a (knight|knave)/)![1]) as Kind;
        expect(ek === 'knight' ? offK : offV, fb.example!.label).toBe(true);
        expect(bare(fb.example!.truths)).toEqual([{ who: 'The words', value: as[ek] }]);
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(L2_KINDS).sort());
  });

  it('lesson 3: the two cases for the other islander are computed; each wrong choice shows the case that proves its gap', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const target = (['knight', 'knave', 'cant', 'crash', undefined] as const)[seed % 5];
      const { item } = supposeItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4], target });
      teachShape(item);
      const { ids, names, meaning } = readScene(item);
      const idOf = (n: string) => [...names].find(([, v]) => v === n)![0];
      const m = item.prompt.match(/ Suppose (\w+) is a (knight|knave)\. What must (\w+) be\? Or does that guess crash\?$/)!;
      const x = idOf(m[1]), y = idOf(m[3]), kx = m[2] as Kind;
      const caseOf = (v: Kind): K => ({ [x]: kx, [y]: v } as K);
      const ok = KINDS.filter((v) => allFit(ids, meaning, caseOf(v)));
      // "Case" is defined first, then the guess, which says when a guess crashes (a choice the player can pick).
      const terms = item.teach!.terms!;
      expect(terms.map((t) => t.word).slice(0, 2)).toEqual(['A case', 'A guess']);
      expect(terms[1].meaning).toContain(`Here it is “${m[1]} is a ${kx}.” If every case with the guess breaks the rule, the guess crashes.`);
      const cases = item.teach!.cases!;
      expect(cases.map((c) => readCase(c.label, idOf))).toEqual([caseOf('knight'), caseOf('knave')]);
      for (const c of cases) {
        const k = readCase(c.label, idOf);
        expect(bare(c.truths)).toEqual(speakerTruths(item, k));
        for (const t of c.truths!) checkBecause(t, idOf, ids);
        expect(works(c)).toBe(allFit(ids, meaning, k));
      }
      // The guess is drawn as the test-world banner, never as a fact.
      if (item.scene?.kind === 'speakers') expect(item.scene.test).toBe(`${m[1]} is a ${kx}. This is a guess.`);
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const fb = item.feedback![c.id];
        const ex = readCase(fb.example!.label, idOf);
        expect(ex[x], 'the example keeps the guess').toBe(kx);
        expect(bare(fb.example!.truths)).toEqual(speakerTruths(item, ex));
        const exWorks = allFit(ids, meaning, ex);
        let kind: string;
        if (c.id === 'knight' || c.id === 'knave') {
          if (ok.includes(c.id)) {
            kind = 'leavesOut';
            expect(ex[y]).toBe(other(c.id));
            expect(exWorks).toBe(true);
          } else {
            kind = 'breaks';
            expect(ex[y]).toBe(c.id);
            expect(exWorks).toBe(false);
            const who = fb.headline.match(/, (\w+) breaks the rule\.$/)![1];
            expect(fits(meaning, idOf(who), ex), `${who} really breaks the rule`).toBe(false);
          }
        } else if (c.id === 'cant') {
          kind = ok.length === 0 ? 'cantNone' : 'cantOne';
          expect(exWorks).toBe(false);
        } else {
          kind = ok.length === 1 ? 'crashOne' : 'crashTwo';
          expect(exWorks).toBe(true);
        }
        expectKind(L3_KINDS, kind, fb.headline);
        seen.add(kind);
      }
      // The smaller example: only the guessed islander speaks; each try is re-computed from its words.
      const [first, ...tries] = item.teach!.simpler!;
      const tiny = first.match(/^Here is a smaller one\. Only (\w+) speaks: “(.+)\.” Suppose (\w+) is a (knight|knave)\.$/)!;
      expect(tiny, first).not.toBe(null);
      expect([tiny[1], tiny[3], tiny[4]]).toEqual([m[1], m[1], kx]);
      const mean = readWords(`${tiny[2]}.`, x, idOf, ids);
      let good = 0;
      for (const v of KINDS) {
        const line = tries.find((l) => l.startsWith(`Try ${m[3]} as a ${v}.`))!;
        const k = caseOf(v);
        const fit = (k[x] === 'knight') === mean(k);
        good += fit ? 1 : 0;
        expect(line).toBe(`Try ${m[3]} as a ${v}. ${m[1]}’s words are ${mean(k)}. ${fit ? 'That case works.' : `${m[1]} breaks the rule.`}`);
      }
      const outcome = item.answer === 'cant' ? 2 : item.answer === 'crash' ? 0 : 1;
      expect(good, 'the smaller example has the same outcome').toBe(outcome);
    }
    expect([...seen].sort()).toEqual(Object.keys(L3_KINDS).sort());
  });

  it('lesson 5: the four cases are computed; each wrong choice is sorted by the cases it gets wrong', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { item } = andOrItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4] });
      teachShape(item);
      const m = item.prompt.match(/^(?:.+?) is a (knight|knave)\. (\w+) says, “(.+)\.” Which choice says exactly what you know about (\w+) and (\w+)\?$/)!;
      const [, sk, S, said, X, Y] = m;
      const mean = readWords(said, S.toLowerCase(), (n) => n.toLowerCase(), [S, X, Y].map((n) => n.toLowerCase()));
      const all: K[] = [['knight', 'knight'], ['knight', 'knave'], ['knave', 'knight'], ['knave', 'knave']].map(([p, q]) => ({ [X.toLowerCase()]: p as Kind, [Y.toLowerCase()]: q as Kind }));
      const need = sk === 'knight';
      const keep = all.map((k) => mean(k) === need);
      const cases = item.teach!.cases!;
      expect(cases.map((c) => caseIndex(c.label, X, Y))).toEqual([0, 1, 2, 3]);
      // Remember gives the rule for the words this speaker says: true ones from a knight, false ones from a knave.
      expect(item.teach!.remember![0]).toMatch(need ? /^A true “and” needs every part to be true\./ : /^A false “and” needs just one false part\./);
      cases.forEach((c, i) => {
        expect(bare(c.truths)).toEqual([{ who: `${S}’s words`, value: mean(all[i]) }]);
        checkBecause(c.truths![0], lower, [X, Y].map(lower));
        expect(works(c)).toBe(keep[i]);
      });
      // The speaker's stated kind is the fact banner; the four cases are what you test.
      if (item.scene?.kind === 'speakers') expect([item.scene.fact, item.scene.test]).toEqual([`${S} is a ${sk}.`, `Try the four cases for ${X} and ${Y}.`]);
      // "Keep it" / "Cross it out", case by case.
      for (const line of item.teach!.simpler!.slice(1, 5)) {
        const lm = line.match(/^(.+): the words are (true|false)\. (Keep it|Cross it out)\.$/)!;
        const i = caseIndex(lm[1], X, Y);
        expect(lm[2] === 'true').toBe(mean(all[i]));
        expect(lm[3] === 'Keep it').toBe(keep[i]);
      }
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const fb = item.feedback![c.id];
        const allowed = choiceCases(c.label, X, Y);
        const extra = allowed.some((v, i) => v && !keep[i]);
        const missing = allowed.some((v, i) => !v && keep[i]);
        const kind = allowed.every((v, i) => v === !keep[i]) ? (need ? 'reverseKnight' : 'reverseKnave') : extra && missing ? 'swap' : extra ? 'extra' : 'missing';
        expectKind(L5_KINDS, kind, fb.headline);
        seen.add(kind);
        const i = caseIndex(fb.example!.label, X, Y);
        if (kind === 'missing') expect(!allowed[i] && keep[i]).toBe(true);
        else expect(allowed[i] && !keep[i]).toBe(true);
        // Like the NOT flip's example row: the speaker's words, your answer and the right answer, each in that case.
        // Your answer and the right answer disagree there, which is what the example proves.
        const right = choiceCases(item.choices.find((x) => x.id === item.answer)!.label, X, Y);
        expect(bare(fb.example!.truths)).toEqual([
          { who: `${S}’s words`, value: mean(all[i]) },
          { who: 'Your answer', value: allowed[i] },
          { who: 'The right answer', value: right[i] },
        ]);
        expect(right[i]).toBe(keep[i]);
        expect(allowed[i]).not.toBe(right[i]);
        // The smaller example walks the parts of the sentence in that case.
        const [take, parts] = fb.simpler!;
        expect(caseIndex(take.replace(/^Take the case where /, ''), X, Y)).toBe(i);
        const pm = parts.match(/^The parts of \w+’s words: “(.+?)” is (true|false), and “(.+?)” is (true|false)\. So \w+’s words are (true|false)\.$/)!;
        const part = (t: string) => readWords(`${t}.`, S.toLowerCase(), (n) => n.toLowerCase(), [S, X, Y].map((n) => n.toLowerCase()))(all[i]);
        expect([pm[2], pm[4], pm[5]]).toEqual([part(pm[1]), part(pm[3]), mean(all[i])].map(String));
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(L5_KINDS).sort());
  });

  it('puzzles: every case card is computed, and any wrong answer is named by a speaker who really breaks the rule', () => {
    for (const o of [
      { n: 2 as const, pool: 'basic' as const, lesson: 's5.l3', skill: 's5.two' },
      { n: 3 as const, pool: 'basic' as const, lesson: 's5.l4', skill: 's5.three' },
      { n: 2 as const, pool: 'andor' as const, lesson: 's5.l5', skill: 's5.and-or' },
    ]) {
      for (let seed = 1; seed <= 120; seed++) {
        const { item } = puzzleItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4], ...o });
        teachShape(item);
        const { ids, names, meaning } = readScene(item);
        const idOf = (n: string) => [...names].find(([, v]) => v === n)![0];
        const answer = Object.fromEntries(ids.map((id) => [id, item.answer[id].kind as Kind])) as K;
        const shown = item.teach!.cases!.map((c) => readCase(c.label, idOf));
        if (o.n === 2) expect(shown).toEqual(cases(ids));
        else {
          // The answer, then each case with one islander changed.
          expect(shown[0]).toEqual(answer);
          expect(shown.slice(1)).toEqual(ids.map((id) => ({ ...answer, [id]: other(answer[id]) })));
        }
        item.teach!.cases!.forEach((c, i) => {
          expect(bare(c.truths)).toEqual(speakerTruths(item, shown[i]));
          for (const t of c.truths!) checkBecause(t, idOf, ids);
          expect(works(c)).toBe(allFit(ids, meaning, shown[i]));
          for (const b of (c.note ?? '').matchAll(/(\w+) is a (knight|knave) with (true|false) words\./g)) {
            expect(fits(meaning, idOf(b[1]), shown[i]), c.note).toBe(false);
            expect(meaning[idOf(b[1])](shown[i])).toBe(b[3] === 'true');
          }
        });
        // Every wrong answer: the title names a speaker whose words do not fit that answer.
        for (const k of cases(ids)) {
          if (ids.every((id) => k[id] === answer[id])) continue;
          const m = explanationFor(item, { kind: 'assign', values: Object.fromEntries(ids.map((id) => [id, { kind: k[id] }])) });
          expect(m.specific).toBe(true);
          expect(m.title).not.toBe(NEUTRAL_TITLE);
          // The title names who breaks the rule; then one line per speaker, quoting the words that do not fit.
          const t = m.title.match(/^With your answer, (.+) breaks? the rule\.$/)!;
          expect(t, m.title).not.toBe(null);
          const who = t[1].split(/, | and /);
          expect(who.length).toBeGreaterThan(0);
          for (const n of who) expect(fits(meaning, idOf(n), k), m.title).toBe(false);
          for (const id of ids) if (!fits(meaning, id, k)) expect(who).toContain(names.get(id));
          const lines = m.detail.join('\n');
          // The example card is the player's own answer: each speaker's words, true or false.
          expect(m.example?.truths?.length).toBe(Object.keys((item as AssignItem).claims ?? {}).length);
          for (const n of who) expect(m.example!.note).toContain(`${n} is a ${k[idOf(n)]} with ${k[idOf(n)] === 'knight' ? 'false' : 'true'} words.`);
          for (const n of who) {
            const l = lines.match(new RegExp(`If ${n} is a (knight|knave), ${n}’s words, “.+,” must be (true|false)\\.`));
            expect(l, lines).not.toBe(null);
            expect(k[idOf(n)]).toBe(l![1]);
          }
        }
      }
    }
  });

  it('choice ids come from what each choice says, so shuffled choices keep their explanation', () => {
    const items: ChooseItem[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      for (const l of stop5.lessons) for (const it of l.practice(createRng(seed))) if (it.kind === 'choose') items.push(it);
    }
    const IDS: Record<string, string[]> = {
      's5.words': ['yes', 'no', 'cant', 'knight', 'knave'],
      's5.cant-say': ['knight', 'knave', 'both', 'neither'],
      's5.suppose': ['knight', 'knave', 'cant', 'crash'],
      's5.and-or': ['bothKnave', 'oneKnave', 'bothKnight', 'oneKnight'],
    };
    for (const item of items) {
      for (const c of item.choices) expect(IDS[item.skill]).toContain(c.id);
      if (item.skill === 's5.and-or') {
        const ab = item.prompt.match(/about (\w+) and (\w+)\?$/)!;
        for (const c of item.choices) expect(choiceCases(c.label, ab[1], ab[2]).join()).toBe({ bothKnight: 'true,false,false,false', bothKnave: 'false,false,false,true', oneKnave: 'false,true,true,true', oneKnight: 'true,true,true,false' }[c.id]);
      }
      const shuffled: ChooseItem = { ...item, choices: [...item.choices].reverse() };
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const a = explanationFor(item, { kind: 'choose', id: c.id });
        expect(explanationFor(shuffled, { kind: 'choose', id: c.id })).toEqual(a);
        expect(a.title).toBe(item.feedback![c.id].headline);
        expect(a.said).toBe(c.label);
      }
    }
  });

  it('plans read back from an item match the plan it was made from', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const skin = SKIN_IDS[seed % 4];
      const speaker = (['knight', 'knave', 'unknown'] as const)[seed % 3];
      const negative = seed % 5 < 2;
      const truth = ([true, false, 'unknown'] as const)[(seed >> 2) % 3];
      const want = {
        fact: { type: 'fact', speaker, negative },
        other: { type: 'other', speaker },
        kindFromFact: { type: 'kindFromFact', negative, truth },
        speakerFromOther: { type: 'speakerFromOther' },
      } as const;
      for (const type of ['fact', 'other', 'kindFromFact', 'speakerFromOther'] as const) {
        const { item } = wordsItem(createRng(seed), { id: 'x', skin, type, speaker, negative, truth });
        expect(wordsPlanOf(item), item.prompt).toEqual(want[type]);
      }
      for (const type of ['self', 'fact', 'partner'] as const) {
        const { item, claim } = whoCanSayItem(createRng(seed), { id: 'x', skin, type });
        const plan = sayPlanOf(item)!;
        expect(plan.type).toBe(type);
        expect(plan.target).toBe(item.answer);
        if (type === 'self') expect(plan.selfKind).toBe(claim && claim.t === 'is' ? claim.kind : null);
      }
      const op = seed % 2 ? 'and' : 'or';
      const sk = KINDS[(seed >> 1) % 2];
      const part = KINDS[(seed >> 2) % 2];
      expect(andOrPlanOf(andOrItem(createRng(seed), { id: 'x', skin, speaker: sk, op, part }).item)).toEqual({ speaker: sk, op, part });
    }
  });

  it('new examples after a miss: the same lesson and skill, never the same question, and both sides of the edge', () => {
    const outcome = (a: string) => (a === 'knight' || a === 'knave' ? 'one' : a);
    for (let seed = 1; seed <= 40; seed++) {
      const missed = [...stop5.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop5.check!(createRng(seed))];
      for (const item of missed) {
        const set = freshCheckSet(stop5, item, seed * 31, [], 1);
        expect(set.length, `${item.skill} ${item.prompt}`).toBe(item.kind === 'assign' ? 1 : 2);
        expect(new Set([item, ...set].map(looks)).size, 'every new example looks different').toBe(set.length + 1);
        for (const x of set) {
          expect([x.lesson, x.skill, x.kind]).toEqual([item.lesson, item.skill, item.kind]);
          teachShape(x);
          expect(x.id.startsWith(`${item.id}-new1-`)).toBe(true);
        }
        if (item.kind === 'assign') {
          expect((set[0] as AssignItem).people.length).toBe(item.people.length);
          continue;
        }
        if (item.kind !== 'choose') continue;
        const [same, edge] = set as ChooseItem[];
        switch (item.lesson) {
          case 's5.l1':
            expect(wordsPlanOf(same)).toEqual(wordsPlanOf(item));
            expect(edge.answer === 'cant', 'one new example where you can tell, one where you can’t').not.toBe(item.answer === 'cant');
            break;
          case 's5.l2':
            expect(same.answer).toBe(item.answer);
            expect(edge.answer).not.toBe(item.answer);
            break;
          case 's5.l3':
            expect(same.answer).toBe(item.answer);
            expect(outcome(edge.answer)).not.toBe(outcome(item.answer));
            break;
          case 's5.l5': {
            const p = andOrPlanOf(item)!;
            expect(andOrPlanOf(same)).toMatchObject({ speaker: p.speaker, op: p.op });
            expect(andOrPlanOf(edge)).toMatchObject({ speaker: p.speaker, op: p.op === 'and' ? 'or' : 'and' });
            break;
          }
          default: throw new Error(`unexpected lesson ${item.lesson}`);
        }
      }
    }
  });

  it('every practice, check and arcade item carries the teaching, at a 6th-grade reading level', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const items = [...stop5.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop5.check!(createRng(seed)), stop5.practice!(createRng(seed))];
      for (const it of items) teachShape(it);
    }
  });
});

// ---------- See -> Do -> Quiz (skill-drill handoff, 2 Oct 2026) ----------
//
// Every guided board is re-solved here from the words on it, with the readers above: each row's label says who is
// what (and, on lesson 1's boards, what is true), each bubble is read back, and every mark is worked out again.

/** "Ava and Ben are both knights." / "Ava, Ben and Cal are all knaves." / "Ava is a knight and Ben is a knave." -> kinds. */
function readKinds(label: string, idOf: (n: string) => string): K {
  const t = label.replace(/^Test: /, '').replace(/\.$/, '');
  const m = t.match(/^(.+) are (both|all) (knight|knave)s$/);
  if (m) {
    const names = m[1].split(/, | and /);
    expect(names.length, label).toBe(m[2] === 'both' ? 2 : 3);
    return Object.fromEntries(names.map((n) => [idOf(n), m[3] as Kind]));
  }
  return readFacts(t, idOf);
}

const lower = (n: string) => n.toLowerCase();
const tfWord = (v: boolean) => (v ? 'true' : 'false');
const marksOf = (r: DrillRow) => Object.fromEntries(r.marks.map((m) => [m.label, m.answer]));
const boardSpeakers = (step: DrillStep): Speaker[] => {
  if (step.scene?.kind !== 'speakers') throw new Error(`${step.id}: no speakers scene`);
  return step.scene.speakers;
};

/**
 * Every mark of a case board, worked out from the words alone: the label says who is what, each bubble is read back,
 * each speaker's words are true or false in that case, and the case holds only when every islander on the board
 * fits the rule (someone who says nothing always fits). On a keep board the speaker's kind comes from the board's
 * words ("Cal is a knave and says ..."), and a case is kept when the words fit that kind.
 */
function caseMarks(step: DrillStep, row: DrillRow): { marks: Record<string, string>; kinds: K; fits: boolean } {
  const kinds = readKinds(row.label, lower);
  const keep = step.body[0].match(/^(\w+) is a (knight|knave) and says/);
  if (keep) kinds[lower(keep[1])] = keep[2] as Kind;
  const us = Object.keys(kinds);
  const marks: Record<string, string> = {};
  let fits = true;
  for (const sp of boardSpeakers(step)) {
    if (!sp.says) continue;
    const v = readWords(sp.says, sp.id, lower, us)(kinds);
    marks[`${sp.name}’s words`] = tfWord(v);
    if ((kinds[sp.id] === 'knight') !== v) fits = false;
  }
  if (keep) marks['Keep or cross out?'] = fits ? 'keep' : 'reject';
  else marks['This case'] = fits ? 'holds' : 'crashes';
  return { marks, kinds, fits };
}

/** Lesson 1's fact boards: "The well is (not) full." / "I can swim." against the row's "the well is full" / "Cal cannot swim". */
function factWordsTrue(says: string, fact: string): boolean {
  const w = says.match(/^The well is (not )?full\.$/);
  if (w) {
    const f = fact.match(/^the well is (not )?full$/);
    if (!f) throw new Error(`cannot read fact: ${fact}`);
    return !w[1] === !f[1];
  }
  const s = says.match(/^I (can|cannot) swim\.$/);
  if (s) {
    const f = fact.match(/^\w+ (can|cannot) swim$/);
    if (!f) throw new Error(`cannot read fact: ${fact}`);
    return s[1] === f[1];
  }
  throw new Error(`cannot read: ${says}`);
}

/**
 * A lesson 1 fact row: "Test: Ben is a knave. Fact: the well is full." (the fact known on the board) or "Test: Cal is a
 * knight, and Cal can swim." (both tried) -> each mark, from the speaker's bubble. A contrast board has no bubbles: its
 * words are the panels' (`says`).
 */
function factMarks(step: DrillStep, row: DrillRow, says?: string): { name: string; kind: Kind; fact: string; known: boolean; words: boolean; fits: boolean; marks: Record<string, string> } {
  const m = row.label.match(/^Test: (\w+) is a (knight|knave)(?:, and (.+)|\. Fact: (.+))\.$/);
  if (!m) throw new Error(`cannot read row: ${row.label}`);
  const [, name, kind] = m;
  const fact = m[3] ?? m[4];
  const known = m[4] !== undefined;
  if (says !== undefined) {
    const words = factWordsTrue(says, fact);
    const fits = (kind === 'knight') === words;
    return { name, kind: kind as Kind, fact, known, words, fits, marks: { [`${name}’s words`]: tfWord(words), 'This case': fits ? 'holds' : 'crashes' } };
  }
  const sp = boardSpeakers(step).find((x) => x.name === name)!;
  expect(sp, `${name} is on the board`).toBeDefined();
  const words = factWordsTrue(sp.says, fact);
  const fits = (kind === 'knight') === words;
  return { name, kind: kind as Kind, fact, known, words, fits, marks: { [`${name}’s words`]: tfWord(words), 'This case': fits ? 'holds' : 'crashes' } };
}

/** A lesson 2 row: "The speaker is a knave, and Ben is a knight." -> the words' truth from that kind, and could it say them. */
function sayMarks(step: DrillStep, row: DrillRow): { k: Kind; can: boolean; marks: Record<string, string> } {
  const m = row.label.match(/^The speaker is a (knight|knave), and (\w+) is a (knight|knave)\.$/);
  if (!m) throw new Error(`cannot read row: ${row.label}`);
  const k = m[1] as Kind;
  const [said] = boardSpeakers(step).map((x) => x.says);
  const v = readWords(said, ME, lower, [ME, lower(m[2])])({ [ME]: k, [lower(m[2])]: m[3] as Kind });
  const can = (k === 'knight') === v;
  return { k, can, marks: { 'The words would be': tfWord(v), [`Could a ${k} say it?`]: can ? 'yes' : 'no' } };
}

const shownRows = (step: DrillStep) => step.rows.filter((r) => r.marks.every((m) => m.given));
const tapRows = (step: DrillStep) => step.rows.filter((r) => r.marks.every((m) => !m.given));
const ALL_DRILLS = (): [string, DrillStep[]][] => stop5.lessons.map((l) => [l.id, l.drill ?? []]);

describe('See -> Do -> Quiz (skill-drill handoff)', () => {
  it('every lesson has guided boards; a learner who only taps Next has marked nothing and has not passed', () => {
    expect(ALL_DRILLS().map(([id]) => id)).toEqual(['s5.l1', 's5.l2', 's5.l3', 's5.l4', 's5.l5']);
    expect(stop5.lessons.map((l) => l.drill)).toEqual([L1_DRILL, L2_DRILL, L3_DRILL, L4_DRILL, L5_DRILL]);
    for (const [id, drill] of ALL_DRILLS()) {
      expect(drill.length, id).toBeGreaterThan(0);
      for (const st of drill) {
        expect(checkDrill(st, {}).done, `${st.id}: no marks`).toBe(false);
        // Phone-sized: at most 12 taps per board, and every mark to tap is in a row of its own case.
        expect(marksToTap(st).length, st.id).toBeLessThanOrEqual(12);
        expect(tapRows(st).length + shownRows(st).length, `${st.id}: a row is all shown or all the learner's`).toBe(st.rows.length);
        // No final-answer buttons: every mark is about one case.
        for (const m of st.rows.flatMap((r) => r.marks)) expect(m.label).toMatch(/’s words$|^This case$|^Keep or cross out\?$|^The words would be$|^Could a (knight|knave) say it\?$|^Inside the guess, or known\?$/);
      }
    }
    for (const l of stop5.lessons) expect(passState(l.pass, []).met, l.id).toBe(false);
  });

  it('See: each first case board is the very board of a key-idea card, with that card’s case shown already checked; a twin says what changed', () => {
    for (const l of stop5.lessons) {
      const scenes = l.ideas.map((c) => c.scene).filter(Boolean);
      for (const st of l.drill!) {
        if (st.twin) continue;
        expect(scenes.includes(st.scene), `${st.id} uses a card's own board`).toBe(true);
      }
      // A distinction's own board (on its contrast picture) comes first where it is taught; then the case boards.
      const first = l.drill!.find((st) => st.scene?.kind === 'speakers')!;
      expect(scenes.includes(first.scene), `${l.id}: the first case board is a card's board`).toBe(true);
      expect(shownRows(first).length, `${l.id}: one case already checked`).toBe(1);
      // A board that names its card names the card whose picture it shows (a lesson can have several such cards).
      for (const st of l.drill!) {
        const named = st.body.join(' ').match(/the board from the card “(.+?)\.?”/);
        if (named) expect(l.ideas.find((c) => c.title === named[1])?.scene, `${st.id} names “${named[1]}”`).toBe(st.scene);
        if (/the board from the card[^ “]/.test(st.body.join(' '))) throw new Error(`${st.id}: “the card” without its name`);
      }
    }
    // The twins: lesson 2 keeps the board and gives Ben the other kind (its fact banner says so); lesson 3 changes Ava's
    // words, nothing else.
    const [, benKnight] = L2_DRILL;
    expect(benKnight.scene).toBe(L2_TWIN_SCENE);
    expect(L2_TWIN_SCENE).toEqual({ ...L2_SCENE, fact: 'Ben is a knight.' });
    expect(L2_SCENE.kind === 'speakers' && L2_SCENE.fact).toBe('Ben is a knave.');
    expect(benKnight.twin).toBe('Ben is a knight now. The words are the same.');
    expect(benKnight.rows.every((r) => r.label.endsWith('and Ben is a knight.'))).toBe(true);
    const [, l3first, twoHold] = L3_DRILL;
    const before = boardSpeakers(l3first).map((x) => x.says), after = boardSpeakers(twoHold).map((x) => x.says);
    expect(after.filter((x, i) => x !== before[i])).toEqual(['I am a knight.']);
    expect(twoHold.twin).toBe('Ava’s words changed. Now Ava says, “I am a knight.”');
    // Each worked example's board is the card's board, drawn from the same data the boards use.
    const cardScene = (i: number, title: string) => stop5.lessons[i].ideas.find((c) => c.title === title)!.scene;
    expect(cardScene(0, 'Check a case')).toBe(L1_WELL_SCENE);
    expect(cardScene(0, 'Two different things')).toBe(L1_CONTRAST_SCENE);
    expect(cardScene(1, 'It can depend on others')).toBe(L2_SCENE);
    expect(cardScene(2, 'Inside the guess')).toBe(L3_GUESS_SCENE);
    expect(cardScene(2, 'After the crash')).toBe(L3_CONTRAST_SCENE);
    expect(cardScene(2, 'Four possible answers')).toBe(L3_SCENE);
    expect(cardScene(3, 'Start with a strong clue')).toBe(L4_STRONG_SCENE);
    expect(cardScene(3, 'Inside the guess')).toBe(L4_GUESS_SCENE);
    expect(cardScene(3, 'After the crash')).toBe(L4_CONTRAST_SCENE);
    expect(cardScene(3, 'Check your answer')).toBe(L4_SCENE);
    expect(cardScene(4, 'A knave’s “and”')).toBe(L5_AND_SCENE);
    expect(cardScene(4, 'A knave’s “or”')).toBe(L5_OR_SCENE);
    expect(cardScene(4, 'When “I” is one part')).toBe(L5_SCENE);
  });

  it('lesson 1, the handoff’s board: the well is a fact; the card tests Fay as a knight; the learner tests Ada (a knight) and Ben (a knave)', () => {
    const l1 = stop5.lessons[0];
    const see = l1.ideas.find((c) => c.title === 'Check a case')!;
    expect(l1.ideas.length).toBe(7);
    expect(l1.ideas.map((c) => c.title)).toEqual(['Riddle Island', 'A knight’s words', 'A knave’s words', 'Two different things', 'Check a case', 'When you can’t tell', 'Words about others']);
    // The fact and the test are told apart: "given" is gone, the well is "a fact", and Fay's kind is a test.
    expect(see.body[0]).toBe('On this board, the well is full. That is a fact, so it stays the same in every case here.');
    expect(see.body.join(' ')).toContain('Test: Fay is a knight. Fay says, “The well is not full.” The well is full, so Fay’s words are false.');
    expect(see.body.join(' ')).toContain('A knight’s words must be true. False words from a knight break the rule, so this case crashes.');
    expect(see.body.at(-1)).toBe('A crash shows the test is wrong, never the fact. So Fay can’t be a knight.');
    expect(JSON.stringify(l1.ideas)).not.toMatch(/\bgiven\b/);
    const board = L1_DRILL[1];
    expect(board.id).toBe('s5.l1-do2');
    expect(board.scene).toBe(see.scene);
    expect(boardSpeakers(board).map((x) => `${x.name}: ${x.says}`)).toEqual(['Ada: The well is full.', 'Ben: The well is full.', 'Fay: The well is not full.']);
    // The fact is the "What is true" banner, the kinds are the "Test world" banner, and the rule is a need.
    if (board.scene?.kind !== 'speakers') throw new Error('no scene');
    expect([board.scene.fact, board.scene.test, board.scene.rule]).toEqual(['The well is full.', 'We test a kind for each islander.', PUZZLE_RULE]);
    expect(board.body[0]).toMatch(/^The well is full: a fact\. This is the board from the card “Check a case\.”/);
    expect([board.title, ...board.body, board.done, ...board.rows.flatMap((r) => [r.label, r.note ?? ''])].join(' ')).not.toMatch(/\bgiven\b/);
    // Every row names its test apart from the fact.
    for (const r of board.rows) expect(r.label).toMatch(/^Test: \w+ is a (knight|knave)\. Fact: the well is full\.$/);
    const read = board.rows.map((r) => factMarks(board, r));
    board.rows.forEach((r, i) => expect(marksOf(r), r.label).toEqual(read[i].marks));
    // Shown: the card's case. The learner's: the handoff's sample taps.
    const [fay, ada, ben] = board.rows;
    expect(shownRows(board)).toEqual([fay]);
    expect([fay.label, fay.marks.map((m) => m.answer)]).toEqual(['Test: Fay is a knight. Fact: the well is full.', ['false', 'crashes']]);
    expect([ada.label, ada.marks.map((m) => m.answer)]).toEqual(['Test: Ada is a knight. Fact: the well is full.', ['true', 'holds']]);
    expect([ben.label, ben.marks.map((m) => m.answer)]).toEqual(['Test: Ben is a knave. Fact: the well is full.', ['true', 'crashes']]);
    // The need sits on its own line over each row.
    expect(board.rows.map((r) => r.needs)).toEqual(['Fay is a knight: Fay’s words must be true.', 'Ada is a knight: Ada’s words must be true.', 'Ben is a knave: Ben’s words must be false.']);
    // A wrong tap stays wrong and names the mismatch, from the sentence: a knave's sentence came out true. Right words
    // with a wrong verdict first name the belief (the verdict was not compared with the kind).
    const right = Object.fromEntries(marksToTap(board).map((m) => [m.id, m.answer]));
    expect(checkDrill(board, right).done).toBe(true);
    const verdict = checkDrill(board, { ...right, 'ben-knave-yes-case': 'holds' });
    expect(verdict.diagnosis).toBe('verdict-only');
    expect(verdict.message.endsWith('Ben is a knave, and Ben’s words came out true. A knave never says true words, so this case crashes.')).toBe(true);
    expect(checkDrill(board, { ...right, 'ada-knight-yes-words': 'false' }).message).toBe('In this case, the well is full. Ada says, “The well is full.” So Ada’s words are true.');
    // The done line says what the crashes mean: Ben can't be a knave, and the fact never moved.
    expect(board.done).toBe('Right. Ada’s case holds. Ben’s case crashes, so Ben can’t be a knave: true words come from a knight. Fay’s case crashed too, so Fay is a knave. The well never changed.');
    expect(JSON.stringify(board)).not.toMatch(/Is the well full|Who is|Which/);
  });

  it('lesson 1, Can’t tell and words about others: every case re-solved from the bubble, and the boards’ last words hold', () => {
    const [, , swim, others] = L1_DRILL;
    const rows = swim.rows.map((r) => factMarks(swim, r));
    swim.rows.forEach((r, i) => expect(marksOf(r), r.label).toEqual(rows[i].marks));
    expect(new Set(rows.map((x) => `${x.kind}|${x.fact}`)).size, 'four different cases').toBe(4);
    // Both unknowns are tried in each row: the kind and whether Cal can swim.
    expect(rows.every((x) => !x.known)).toBe(true);
    const hold = rows.filter((x) => x.fits);
    expect(hold.length).toBe(2);
    expect(new Set(hold.map((x) => /cannot/.test(x.fact))).size, 'the two cases that hold disagree').toBe(2);
    expect(swim.done).toContain('you can’t tell');
    expect(swim.body[0]).toBe('No one knows Cal’s kind, or if Cal can swim. So there are four cases. The first one is already checked.');
    // Dee says "Eli is a knave."
    const cases = others.rows.map((r) => caseMarks(others, r));
    others.rows.forEach((r, i) => expect(marksOf(r), r.label).toEqual(cases[i].marks));
    // Every case of Dee and Eli is on the board, so it teaches both sides of the edge: a known kind leaves one case
    // that holds, and an unknown speaker leaves two that disagree about Eli (Can't tell, as the quiz asks).
    expect(new Set(cases.map((c) => `${c.kinds.dee},${c.kinds.eli}`)).size, 'four different cases').toBe(4);
    const holding = cases.filter((c) => c.fits).map((c) => c.kinds);
    for (const c of cases.filter((x) => x.kinds.dee === 'knave')) expect(c.fits).toBe(c.kinds.eli === 'knight');
    for (const c of cases.filter((x) => x.kinds.dee === 'knight')) expect(c.fits).toBe(c.kinds.eli === 'knave');
    for (const c of cases.filter((x) => x.kinds.eli === 'knight')) expect(c.fits).toBe(c.kinds.dee === 'knave');
    expect(holding).toEqual([{ dee: 'knave', eli: 'knight' }, { dee: 'knight', eli: 'knave' }]);
    expect(others.done).toBe('Right. Two cases hold. If Dee is a knave, Eli is a knight. If Dee is a knight, Eli is a knave. So when no one knows Dee’s kind, you can’t tell what Eli is.');
    // The card's own case is the one shown; the learner marks the three new ones.
    expect(shownRows(others).map((r) => r.label)).toEqual(['Test: Dee and Eli are both knaves.']);
    expect(swim.done).toContain('or what kind Cal is');
    // The swim card works the four cases from two unknowns, and its shown case is the board's.
    const card = stop5.lessons[0].ideas.find((c) => c.title === 'When you can’t tell')!;
    expect(card.body[0]).toBe('Cal says, “I can swim.” No one knows Cal’s kind, or if Cal can swim. Two things are unknown, and each can go two ways. So there are four cases.');
    expect(card.body[1]).toContain(`${shownRows(swim)[0].label}`);
    expect(rows[0].fits, 'the card’s case holds').toBe(true);
  });

  it('lesson 2: test each kind on the card’s board (no one), then its twin with Ben a knight (either kind)', () => {
    const [knave, knight] = L2_DRILL;
    expect(boardSpeakers(knave).map((x) => x.says)).toEqual([claimText(L2_EXAMPLE.claim, ME, (id) => (id === ME ? 'Someone' : 'Ben'), 2)]);
    for (const st of L2_DRILL) st.rows.forEach((r) => expect(marksOf(r), r.label).toEqual(sayMarks(st, r).marks));
    const can = (st: DrillStep) => st.rows.map((r) => sayMarks(st, r)).map((x) => `${x.k}:${x.can}`);
    expect(can(knave)).toEqual(['knight:false', 'knave:false']);
    expect(knave.done).toContain('So no one could say it.');
    expect(can(knight)).toEqual(['knight:true', 'knave:true']);
    expect(knight.done).toContain('So either kind could say it.');
    // The card says what the shown knight row shows: from a knight, the words would be false.
    expect(stop5.lessons[1].ideas.find((c) => c.title === 'It can depend on others')!.body[1]).toBe('A knight is not the same kind as Ben. So from a knight, the words would be false.');
    expect(shownRows(knave)[0].marks.map((m) => m.answer)).toEqual(['false', 'no']);
    // Two steps, never one: what the words would be, then what that kind needs, on its own line.
    expect(knave.rows.map((r) => r.needs)).toEqual(['A knight’s words must be true.', 'A knave’s words must be false.']);
    expect(knave.body[1]).toBe('“I” is the speaker. Here we pretend the speaker is a knave. First mark what the words would be. Then say if a knave could say it.');
    expect([knave.scaffold, knight.scaffold]).toEqual(['full', 'light']);
  });

  it('lessons 3-5: every case row re-solved from the bubbles, and each board’s last words are what its rows show', () => {
    for (const st of [...L3_DRILL, ...L4_DRILL, ...L5_DRILL].filter((x) => x.scene?.kind === 'speakers')) {
      const cases = st.rows.map((r) => caseMarks(st, r));
      st.rows.forEach((r, i) => expect(marksOf(r), `${st.id} ${r.label}`).toEqual(cases[i].marks));
      expect(new Set(cases.map((c) => JSON.stringify(c.kinds))).size, `${st.id}: no case twice`).toBe(cases.length);
    }
    const fitting = (st: DrillStep) => st.rows.map((r) => caseMarks(st, r)).filter((c) => c.fits).map((c) => c.kinds);
    const all = (st: DrillStep) => st.rows.map((r) => caseMarks(st, r));
    // Lesson 3: all four cases of the card's board. Ava as a knave crashes both ways; the one case that holds is the answer.
    const [, l3, twin] = L3_DRILL;
    expect(all(l3).length).toBe(4);
    expect(all(l3).filter((c) => c.kinds.ava === 'knave').every((c) => !c.fits)).toBe(true);
    expect(fitting(l3)).toEqual([L3_EXAMPLE.answer]);
    expect(shownRows(l3)[0].label).toBe('Test: Ava is a knave and Ben is a knight.');
    // The twin: with Ava a knight, both cases hold, so you can't tell what Ben is.
    expect(all(twin).every((c) => c.kinds.ava === 'knight' && c.fits)).toBe(true);
    expect(new Set(all(twin).map((c) => c.kinds.ben)).size).toBe(2);
    expect(twin.done).toContain('you can’t tell what Ben is');
    // Lesson 4: the strong clue crashes every case with Ava a knave; the worked example's answer holds.
    const [strong, l4] = L4_DRILL;
    expect(boardSpeakers(strong).map((x) => x.says)).toEqual(['At least one of us is a knave.', '', '']);
    for (const c of all(strong)) expect(c.fits, JSON.stringify(c.kinds)).toBe(c.kinds.ava === 'knight' && (c.kinds.ben === 'knave' || c.kinds.cal === 'knave'));
    expect(all(strong).some((c) => c.kinds.ava === 'knave' && c.kinds.ben === 'knave' && c.kinds.cal === 'knave'), 'a knave Ava crashes even among knaves').toBe(true);
    expect(fitting(l4)).toEqual([L4_EXAMPLE.answer]);
    expect(shownRows(l4)[0].label).toBe('Test: Ava is a knight, Ben is a knave and Cal is a knight.');
    // Lesson 5: a knave's "and" keeps every case with a knave; a knave's "or" keeps only both knaves; Raj and Vic.
    const [and, or, raj] = L5_DRILL;
    const pairs = (st: DrillStep) => all(st).map((c) => `${c.kinds.ava},${c.kinds.ben}`).sort();
    expect(pairs(and)).toEqual(pairs(or));
    expect(pairs(and).length).toBe(4);
    expect(fitting(and).map((k) => `${k.ava},${k.ben}`).sort()).toEqual(['knave,knave', 'knave,knight', 'knight,knave']);
    expect(and.done).toContain('Three cases are left.');
    expect(fitting(or).map((k) => `${k.ava},${k.ben}`)).toEqual(['knave,knave']);
    expect(or.done).toContain('One case is left. Ava and Ben are both knaves.');
    expect(all(raj).length).toBe(4);
    expect(fitting(raj)).toEqual([L5_EXAMPLE.answer]);
    // On the "or" board, the learner keeps one case and crosses out two, so tapping one answer every time fails.
    for (const st of [and, or]) expect(new Set(tapRows(st).map((r) => r.marks.at(-1)!.answer)).size, st.id).toBe(2);
  });

  it('every wrong tap names its own mismatch: the words and who is what in that case, in short plain sentences', () => {
    for (const [, drill] of ALL_DRILLS()) {
      for (const st of drill) {
        const right = Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
        for (const r of tapRows(st)) {
          for (const m of r.marks) {
            for (const o of m.options) {
              if (o.id === m.answer) continue;
              const why = m.why[o.id];
              expect(why, `${st.id} ${m.id} ${o.id}`).toBeTruthy();
              // A mix-up the wrong mark shows is named first; the mark's own words follow as the concrete case.
              const got = checkDrill(st, { ...right, [m.id]: o.id });
              const named = st.misconceptions?.find((x) => x.id === got.diagnosis);
              expect(got.message).toBe(named ? `${named.text} ${why}` : why);
              if (/words$/.test(m.label)) expect(why, why).toMatch(/“.+”/);
              else if (m.label === 'Inside the guess, or known?') expect(why, why).toMatch(/^“.+” (is the guess itself|came from pretending|comes after the crash)/);
              else expect(why, why).toMatch(/words|would be/);
              expect(why).not.toMatch(/['"]|\bWrong\b|that row|the opposite|undefined/);
              for (const b of why.matchAll(/\b[Bb]oth\b(?: (\S+))?/g)) expect(b[1], why).toMatch(/^(knights|knaves|parts|hold|cases)\b/);
              for (const sent of sentences(why)) expect(words(sent).length, sent).toBeLessThanOrEqual(READING.maxSentenceWords);
            }
          }
          // Once the row's marks are right, its note says what the case does (a sorting line has no case).
          if (st.id !== SORT_ID) expect(r.note, r.label).toMatch(/holds|crashes|keep this case|cross this case out|could say it|can’t say it/);
        }
      }
    }
  });

  it('Quiz: the first tries are twins of the boards, and no card’s own example comes back as a quiz', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const [l1, l2, , , l5] = stop5.lessons.map((l) => l.practice(createRng(seed)));
      // Lesson 1, try 1: a given knight or knave and words about a fact, like Ada and Ben.
      const p1 = wordsPlanOf(l1[0] as ChooseItem)!;
      expect(p1.type).toBe('fact');
      expect(['knight', 'knave']).toContain(p1.speaker);
      // Lesson 2, try 1: a partner whose kind is given, and the answer either kind or no one, like the two boards.
      const p2 = sayPlanOf(l2[0] as ChooseItem)!;
      expect(p2.type).toBe('partner');
      expect(['both', 'neither']).toContain(p2.target);
      // Lesson 5, tries 1-2: a knave's "and" and a knave's "or" about two knights, as on the boards.
      const ops = l5.slice(0, 2).map((it) => andOrPlanOf(it as ChooseItem)!);
      expect(ops.map((x) => x.op).sort()).toEqual(['and', 'or']);
      for (const x of ops) expect([x.speaker, x.part]).toEqual(['knave', 'knight']);
      for (const [lesson, set] of [['s5.l1', l1], ['s5.l2', l2]] as const) for (const it of set) expect(CARD_QUESTIONS[lesson].has(it.prompt), it.prompt).toBe(false);
    }
  });

  it('Quiz, check, Arcade and new examples use only what each lesson teaches: no “and” in lesson 2, no “us” in lessons 3 and 5, knaves’ “and” / “or”', () => {
    const US = /\bus\b|^We /;
    const AND_WORDS = /(am|is) a (knight|knave) and |are both (knights|knaves)/;
    const problems = (it: Item): string[] => {
      const says = it.scene?.kind === 'speakers' ? it.scene.speakers.map((x) => x.says) : [];
      const out: string[] = [];
      if (it.lesson === 's5.l2' && says.some((x) => AND_WORDS.test(x))) out.push('an “and” sentence in lesson 2');
      if ((it.lesson === 's5.l3' || it.lesson === 's5.l5') && says.some((x) => US.test(x))) out.push('“us” words outside lesson 4');
      if (it.lesson === 's5.l3' && says.some((x) => !x)) out.push('a silent islander in lesson 3');
      if (it.lesson === 's5.l5' && it.kind === 'choose' && !/^.+? is a knave\. /.test(it.prompt)) out.push('an “and” / “or” question from a knight');
      return out;
    };
    let fresh = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const items = [...stop5.lessons.flatMap((l) => l.practice(createRng(seed))), ...stop5.check!(createRng(seed)), stop5.practice!(createRng(seed))];
      for (const it of items) {
        expect(problems(it), `${it.id}: ${it.prompt} ${JSON.stringify(it.scene)}`).toEqual([]);
        if (seed <= 20) for (const x of freshCheckSet(stop5, it, seed * 31, [], 1)) { expect(problems(x), x.prompt).toEqual([]); fresh++; }
      }
    }
    expect(fresh).toBeGreaterThan(100);
    // Lesson 4 still has its counting words, which its strong-clue board teaches.
    const l4 = Array.from({ length: 40 }, (_, i) => stop5.lessons[3].practice(createRng(i + 1))).flat();
    expect(l4.some((it) => it.scene?.kind === 'speakers' && it.scene.speakers.some((x) => US.test(x.says)))).toBe(true);
  });

  it('every hint shows one case already checked, re-computed from the bubbles, and never the answer’s case', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of stop5.lessons.flatMap((l) => l.practice(createRng(seed)))) {
        const hc = it.hintCase!;
        expect(hc, it.id).toBeDefined();
        expect(it.hint).toMatch(/^Here is one .+, checked for you\./);
        expect(hc.truths!.length).toBeGreaterThan(0);
        expect(hc.note).toBeTruthy();
        if (it.kind === 'assign') {
          const { ids, names } = readScene(it);
          const idOf = (n: string) => [...names].find(([, v]) => v === n)![0];
          const k = readKinds(hc.label, idOf);
          expect(ids.every((id) => k[id] === it.answer[id].kind), 'not the answer').toBe(false);
          expect(bare(hc.truths)).toEqual(speakerTruths(it, k));
          expect(hc.note, 'the board’s own words').toMatch(/(That breaks|Each one breaks) the rule, so this case crashes\.$/);
          seen.add('puzzle');
        } else if (it.kind === 'choose' && it.skill === 's5.suppose') {
          const { ids, names, meaning } = readScene(it);
          const idOf = (n: string) => [...names].find(([, v]) => v === n)![0];
          const m = it.prompt.match(/ Suppose (\w+) is a (knight|knave)\. What must (\w+) be\?/)!;
          const k = readKinds(hc.label, idOf);
          expect(k[idOf(m[1])], 'the hint keeps the guess').toBe(m[2]);
          expect(bare(hc.truths)).toEqual(speakerTruths(it, k));
          const ok = KINDS.filter((v) => allFit(ids, meaning, { [idOf(m[1])]: m[2] as Kind, [idOf(m[3])]: v }));
          if (ok.length < 2) expect(allFit(ids, meaning, k), 'a case that breaks the rule').toBe(false);
          expect(hc.note).toMatch(allFit(ids, meaning, k) ? /This case holds\.$/ : /so this case crashes\.$/);
          expect(it.hint).toContain(`check ${m[3]} as a ${other(k[idOf(m[3])])} the same way`);
          seen.add('suppose');
        } else if (it.kind === 'choose' && it.skill === 's5.words') {
          const r = readL1(it);
          const w = r.readLabel(hc.label);
          expect(r.known.map(r.key), 'a case the question allows').toContain(r.key(w));
          expect(r.fits(w), 'a case that breaks the rule').toBe(false);
          expect(bare(hc.truths)).toEqual([{ who: `${r.S}’s words`, value: r.wordsTrue(w) }]);
          expect(hc.note).toMatch(/so this case crashes\.$/);
          seen.add('words');
        } else if (it.kind === 'choose' && it.skill === 's5.cant-say') {
          if (it.scene?.kind !== 'speakers') throw new Error('no scene');
          const said = it.scene.speakers[0].says;
          const known = it.prompt.match(/^(?:(?:Islander )?(\w+)(?: the \w+)?) is a (knight|knave)\. /);
          const k = hc.label.match(/^The speaker is a (knight|knave)/)![1] as Kind;
          const fact = KNOWN_FACTS.find((x) => x.text === said);
          const as = (kind: Kind) => (fact ? fact.truth : readWords(said, ME, lower, known ? [ME, lower(known[1])] : [ME])({ [ME]: kind, ...(known ? { [lower(known[1])]: known[2] as Kind } : {}) }));
          expect(bare(hc.truths)).toEqual([{ who: 'The words', value: as(k) }]);
          const can = (kind: Kind) => (kind === 'knight') === as(kind);
          if (KINDS.some((x) => !can(x))) expect(can(k), 'a kind that can’t say it').toBe(false);
          seen.add('say');
        } else if (it.kind === 'choose' && it.skill === 's5.and-or') {
          const m = it.prompt.match(/^(?:.+?) is a (knight|knave)\. (\w+) says, “(.+)\.” Which choice says exactly what you know about (\w+) and (\w+)\?$/)!;
          const [, sk, S, said, X, Y] = m;
          const mean = readWords(said, lower(S), lower, [S, X, Y].map(lower));
          const all: K[] = [['knight', 'knight'], ['knight', 'knave'], ['knave', 'knight'], ['knave', 'knave']].map(([p, q]) => ({ [lower(X)]: p as Kind, [lower(Y)]: q as Kind }));
          const i = caseIndex(hc.label, X, Y);
          expect(mean(all[i]) === (sk === 'knight'), 'a case that is crossed out').toBe(false);
          expect(bare(hc.truths)).toEqual([{ who: `${S}’s words`, value: mean(all[i]) }]);
          expect(hc.note).toMatch(/so cross this case out\.$/);
          seen.add('andor');
        } else throw new Error(`unexpected item ${it.skill}`);
      }
    }
    expect([...seen].sort()).toEqual(['andor', 'puzzle', 'say', 'suppose', 'words']);
  });

  it('pass: the boards marked right, then 3 right on the first try with no hint; lesson 1 needs a stated knave’s “not”, lesson 4 a puzzle whose kinds flip after the crash', () => {
    const want: Record<string, string[]> = { 's5.l1': ['stated-knave-not'], 's5.l2': [], 's5.l3': [], 's5.l4': ['guess-flips'], 's5.l5': [] };
    for (const l of stop5.lessons) {
      expect((l.pass?.include ?? []).map((g) => g.tag), l.id).toEqual(want[l.id]);
      expect(l.pass?.firstTry ?? 3, l.id).toBe(3);
      const clean = (tags: string[] = []) => ({ clean: true, tags });
      const tag = want[l.id];
      expect(passState(l.pass, [clean(tag), clean()]).met).toBe(false);
      expect(passState(l.pass, [clean(), { clean: false, tags: [] }, clean(), clean()]).met).toBe(tag.length === 0);
      expect(passState(l.pass, [clean(), { clean: false, tags: tag }, clean(tag), clean()]).met).toBe(true);
    }
  });
});

// ---------- distinctions taught apart (docs/audit/hidden-distinctions.md, Stop 5) ----------
//
// The two ideas the stop rests on are taught apart and kept apart on every board: the kind we test for a speaker (what
// the words must be) vs whether the words are true in the case (kind vs truth, lesson 1), and what is found inside a
// guess vs what is known (guess vs known, lesson 3). Every truth below is re-computed from the words on the page.

/** Every row board of the stop, with its lesson. */
const ROW_BOARDS = (): [string, DrillStep][] => stop5.lessons.flatMap((l) => (l.drill ?? []).map((st) => [l.id, st] as [string, DrillStep]));
const SORT_ID = 's5.l3-sort';
/** A board whose rows are cases (kinds, and on lesson 1 a fact): every board but lesson 2's and the sorting board. */
const isCaseBoard = (st: DrillStep) => st.id !== SORT_ID && !st.id.startsWith('s5.l2');
/** "Test: Ben is a knave, and the well is full." / "Test: Ben is a knave. Fact: the well is full." */
const isFactRow = (r: DrillRow) => /^Test: \w+ is a (knight|knave)(, and |\. Fact: )/.test(r.label) && !/ is a (knight|knave)\.?$/.test(r.label.replace(/^Test: \w+ is a (knight|knave)/, ''));
/** A case row's speakers' kinds and the words each one must say. */
function rowNeeds(st: DrillStep, r: DrillRow): { marks: Record<string, string>; need: Record<string, string>; breaks: boolean } {
  if (st.scene?.kind === 'contrast') {
    const f = factMarks(st, r, st.scene.pairs[0].says);
    return { marks: f.marks, need: { [`${f.name}’s words`]: tfWord(f.kind === 'knight') }, breaks: !f.fits };
  }
  if (isFactRow(r)) {
    const f = factMarks(st, r);
    return { marks: f.marks, need: { [`${f.name}’s words`]: tfWord(f.kind === 'knight') }, breaks: !f.fits };
  }
  const c = caseMarks(st, r);
  const need: Record<string, string> = {};
  for (const sp of boardSpeakers(st)) if (sp.says) need[`${sp.name}’s words`] = tfWord(c.kinds[sp.id] === 'knight');
  return { marks: c.marks, need, breaks: !c.fits };
}

describe('distinctions taught apart (hidden-distinction audit)', () => {
  it('each lesson declares its distinctions: kind vs truth taught in lesson 1, guess vs known in lesson 3; later lessons remind, with at most 7 cards', () => {
    const [l1, l2, l3, l4, l5] = stop5.lessons;
    expect(l1.distinctions).toEqual([KIND_VS_TRUTH]);
    for (const l of [l2, l5]) expect(l.distinctions).toEqual([{ ...KIND_VS_TRUTH, taughtIn: 's5.l1' }]);
    expect(l3.distinctions).toEqual([{ ...KIND_VS_TRUTH, taughtIn: 's5.l1' }, GUESS_VS_KNOWN]);
    expect(l4.distinctions).toEqual([{ ...KIND_VS_TRUTH, taughtIn: 's5.l1' }, { ...GUESS_VS_KNOWN, taughtIn: 's5.l3' }]);
    for (const l of stop5.lessons) {
      expect(l.ideas.length, l.id).toBeLessThanOrEqual(7);
      for (const d of l.distinctions ?? []) expect(l.ideas.some((c) => c.distinction === d.id), `${l.id} has a card for ${d.id}`).toBe(true);
    }
    // Later lessons remind of kind vs truth on a card of their own.
    for (const l of [l2, l3, l4, l5]) {
      const card = l.ideas.find((c) => c.distinction === KIND_VS_TRUTH.id)!;
      expect(card.title, l.id).toBe('Remember: two different things');
      expect(card.body.join(' '), l.id).toMatch(/must be/);
    }
    // Where guess vs known is first taught, its card shows a contrast picture and a board right after it exercises it.
    const after = l3.ideas.find((c) => c.distinction === GUESS_VS_KNOWN.id)!;
    expect(after.title).toBe('After the crash');
    expect(after.scene?.kind).toBe('contrast');
    expect(l4.ideas.find((c) => c.distinction === GUESS_VS_KNOWN.id)!.title).toBe('After the crash');
  });

  it('the contrast card (lesson 1, card 4): Ben tested as a knave, the same words, the well full and not full; every truth from the words', () => {
    const l1 = stop5.lessons[0];
    expect(l1.ideas[3]).toBe(L1_CONTRAST);
    expect(L1_CONTRAST.distinction).toBe(KIND_VS_TRUTH.id);
    expect(L1_CONTRAST.scene).toBe(L1_CONTRAST_SCENE);
    if (L1_CONTRAST_SCENE.kind !== 'contrast') throw new Error('no contrast');
    const [p, q] = L1_CONTRAST_SCENE.pairs;
    // The same speaker, the same words, the same tested kind: only the well differs.
    expect([p.who, q.who]).toEqual(['Ben', 'Ben']);
    expect([p.says, q.says]).toEqual(['The well is full.', 'The well is full.']);
    const read = (w: string) => w.match(/^Test: Ben is a (knight|knave), and (the well is (?:not )?full)\.$/)!;
    const [rp, rq] = [read(p.world), read(q.world)];
    expect([rp[1], rq[1]]).toEqual(['knave', 'knave']);
    expect(rp[2]).not.toBe(rq[2]);
    for (const [panel, r] of [[p, rp], [q, rq]] as const) {
      // The truth comes from the words against the well, never from the kind.
      const v = factWordsTrue(panel.says, r[2]);
      expect(panel.truth, panel.world).toBe(v);
      expect(panel.because).toBe(`It says the well is full. In this case, ${r[2]}. ${v ? 'They match, so the words are true.' : 'They do not match, so the words are false.'}`);
      // Then the kind: a knave with true words crashes; with false words, the case holds.
      const fitsKnave = !v;
      expect(panel.then).toBe(`A knave with ${tfWord(v)} words ${fitsKnave ? 'fits the rule. This case holds.' : 'breaks the rule. This case crashes.'}`);
    }
    expect(p.truth).not.toBe(q.truth);
    expect(L1_CONTRAST_SCENE.ask!.q).toBe('Did Ben change?');
    expect(L1_CONTRAST_SCENE.ask!.a).toContain('Ben’s kind says what the words must be, not what they are.');
    expect(L1_CONTRAST.body.join(' ')).toContain('One: the kind we test. It says what the words must be.');
    expect(L1_CONTRAST.body.join(' ')).toContain('That comes from what they say, checked against the case.');
  });

  it('its board (s5.l1-do1) opens right after it: Ben’s two cases on the same picture, re-solved from the panels', () => {
    const [board] = L1_DRILL;
    expect([board.id, board.afterCard, board.distinction, board.scaffold]).toEqual(['s5.l1-do1', 3, KIND_VS_TRUTH.id, 'full']);
    expect(board.scene).toBe(L1_CONTRAST_SCENE);
    expect(shownRows(board).length, 'the learner does both cases').toBe(0);
    if (board.scene?.kind !== 'contrast') throw new Error('no contrast');
    const read = board.rows.map((r) => factMarks(board, r, 'The well is full.'));
    board.rows.forEach((r, i) => expect(marksOf(r), r.label).toEqual(read[i].marks));
    expect(board.rows.map((r) => r.label)).toEqual(board.scene.pairs.map((x) => x.world));
    expect(board.rows.map((r) => r.marks.map((m) => m.answer))).toEqual([['true', 'crashes'], ['false', 'holds']]);
    expect(board.rows.map((r) => r.needs)).toEqual(['Ben is a knave: Ben’s words must be false.', 'Ben is a knave: Ben’s words must be false.']);
    // The audit's sample: a knave's words marked False because a knave's words are false, then Holds.
    const right = Object.fromEntries(marksToTap(board).map((m) => [m.id, m.answer]));
    expect(checkDrill(board, right).done).toBe(true);
    const merged = checkDrill(board, { ...right, 'ben-knave-yes-words': 'false', 'ben-knave-yes-case': 'holds' });
    expect(merged.diagnosis).toBe('words-from-kind');
    expect(merged.message).toMatch(/^You may be treating the speaker’s kind and the truth of the words as the same thing\. They are two different things\./);
    expect(merged.message.endsWith('In this case, the well is full. Ben says, “The well is full.” So Ben’s words are true.')).toBe(true);
  });

  it('every row board keeps the comparison in view: the facts to compare under every words mark (names, never “I”), the need on its own line, the full scaffold where a case is shown', () => {
    for (const [lesson, st] of ROW_BOARDS()) {
      if (st.id === SORT_ID) continue;
      const say = lesson === 's5.l2';
      expect(st.words, st.id).toEqual(say ? SAY_WORDS : CASE_WORDS);
      expect(st.words!.needs, `${st.id}: the need stands on its own line`).toBe('');
      expect(st.words!.closing, st.id).not.toMatch(/sign/);
      // A board that shows a case keeps the full scaffold, so its comparison is drawn under the shown marks.
      if (shownRows(st).length) expect(st.scaffold, st.id).toBe('full');
      // The method strip: one step per mark to tap, in board order, no two alike (the strip lights the mark you are on).
      if (st.steps) {
        expect(st.steps.length, st.id).toBe(marksToTap(st).length);
        expect(new Set(st.steps).size, st.id).toBe(st.steps.length);
        marksToTap(st).forEach((m, i) => expect(st.steps![i], st.id).toMatch(m.options[0].id === 'true' ? /^Case \d: (check .+ against the case|work out what the words would be)$/ : /^Case \d: compare with /));
      }
      if (st.scene?.kind === 'speakers') {
        expect(st.scene.rule, st.id).toBe(PUZZLE_RULE);
        expect(st.scene.test, `${st.id}: what is tried is the test-world banner`).toBeTruthy();
      }
      for (const r of st.rows) {
        expect(r.needs, `${st.id} ${r.label}`).toBeTruthy();
        for (const m of r.marks.filter((x) => x.options.length === 2 && x.options[0].id === 'true')) {
          const c = m.compare!;
          expect(c, `${st.id} ${m.id} has the facts to compare`).toBeDefined();
          expect(c.says, 'names, never “I”').not.toMatch(/\bI\b|\bme\b/);
          const v = m.answer === 'true';
          if (say) {
            // "The speaker and Ben are the same kind." in "The speaker is a knave, and Ben is a knave."
            const tok = (x: string) => x.replace(/\b[Tt]he speaker\b/g, 'Speaker');
            const w = tok(c.world).match(/^Speaker is a (knight|knave), and (\w+) is a (knight|knave)\.$/)!;
            const k = { [ME]: w[1] as Kind, [lower(w[2])]: w[3] as Kind };
            expect(readNamed(tok(c.says), (n) => (n === 'Speaker' ? ME : lower(n)), [ME, lower(w[2])])(k), `${c.says} / ${c.world}`).toBe(v);
            expect(r.needs).toBe(`A ${w[1]}’s words must be ${tfWord(w[1] === 'knight')}.`);
          } else if (st.scene?.kind === 'contrast' || isFactRow(r)) {
            // Two sentences about one fact: they match exactly when the words are true.
            expect(c.says === c.world, `${c.says} / ${c.world}`).toBe(v);
          } else {
            const kinds = readKinds(r.label, lower);
            const keep = st.body[0].match(/^(\w+) is a (knight|knave) and says/);
            if (keep) kinds[lower(keep[1])] = keep[2] as Kind;
            checkBecause({ who: m.label, value: v, because: { ...c, match: v } }, lower, Object.keys(kinds));
          }
        }
      }
      // The need of each case row names each speaker and what that speaker's words must be.
      if (isCaseBoard(st)) {
        for (const r of st.rows) {
          const n = rowNeeds(st, r).need;
          expect(r.needs, r.label).toBe(Object.entries(n).map(([who, v]) => `${who.replace(/’s words$/, '')} is a ${v === 'true' ? 'knight' : 'knave'}: ${who} must be ${v}.`).join(' '));
        }
      }
    }
  });

  it('misconceptions: the kind taken for the truth (words-from-kind) and right words with a wrong verdict (verdict-only), on every case board, never on right marks', () => {
    let fired = 0;
    for (const [, st] of ROW_BOARDS()) {
      if (!isCaseBoard(st)) continue;
      expect(st.misconceptions?.map((m) => m.id).at(-1), st.id).toBe('verdict-only');
      const right = Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
      const ok = checkDrill(st, right);
      expect([ok.done, ok.diagnosis], st.id).toEqual([true, undefined]);
      for (const r of tapRows(st)) {
        const { need, breaks } = rowNeeds(st, r);
        const words = r.marks.filter((m) => need[m.label] !== undefined);
        const verdict = r.marks.at(-1)!;
        // Every words mark set to what the kind demands, on a row that breaks the rule: the belief is named first.
        const fromKind = { ...right, ...Object.fromEntries(words.map((m) => [m.id, need[m.label]])) };
        if (breaks) {
          const got = checkDrill(st, { ...fromKind, [verdict.id]: verdict.options.find((o) => o.id !== verdict.answer)!.id });
          expect(got.diagnosis, `${st.id} ${r.label}`).toBe('words-from-kind');
          expect(got.row).toBe(r.id);
          fired++;
        } else {
          // On a row that fits, the kind's demand is the right answer: nothing to diagnose.
          expect(checkDrill(st, fromKind).done, `${st.id} ${r.label}`).toBe(true);
        }
        // Right words, wrong verdict: the result was not compared with the kinds.
        const vo = checkDrill(st, { ...right, [verdict.id]: verdict.options.find((o) => o.id !== verdict.answer)!.id });
        expect(vo.diagnosis, `${st.id} ${r.label}`).toBe('verdict-only');
        // A words mark against the kind's demand on a row that fits is a plain slip, named by the mark alone.
        if (!breaks) for (const m of words) expect(checkDrill(st, { ...right, [m.id]: m.answer === 'true' ? 'false' : 'true' }).diagnosis, `${st.id} ${m.id}`).toBeUndefined();
      }
    }
    expect(fired).toBeGreaterThan(10);
    // The audit's sample on the swim board: "Cal is a knight, and Cal cannot swim" marked True and Holds.
    const swim = L1_DRILL[2];
    const right = Object.fromEntries(marksToTap(swim).map((m) => [m.id, m.answer]));
    expect(checkDrill(swim, { ...right, 'cal-knight-no-words': 'true', 'cal-knight-no-case': 'holds' }).diagnosis).toBe('words-from-kind');
  });

  it('lesson 2, would be vs must be: the need taken for the words (need-as-truth), Could set from the words on a knave row (could-is-true), and verdict-only', () => {
    const [knave, knight] = L2_DRILL;
    const right = (st: DrillStep) => Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
    // The board's knave row: Ben is a knave, the speaker a knave, so the words would be true; a knave needs false.
    expect(sayMarks(knave, knave.rows[1]).marks).toEqual({ 'The words would be': 'true', 'Could a knave say it?': 'no' });
    expect(checkDrill(knave, right(knave)).done).toBe(true);
    expect(checkDrill(knave, { 'say-knave-words': 'false', 'say-knave-could': 'yes' }).diagnosis).toBe('need-as-truth');
    expect(checkDrill(knave, { 'say-knave-words': 'false', 'say-knave-could': 'no' }).diagnosis).toBe('need-as-truth');
    expect(checkDrill(knave, { 'say-knave-words': 'true', 'say-knave-could': 'yes' }).diagnosis).toBe('could-is-true');
    // The twin: Ben is a knight. From a knave the words would be false, and a knave could say them.
    expect(sayMarks(knight, knight.rows[1]).marks).toEqual({ 'The words would be': 'false', 'Could a knave say it?': 'yes' });
    expect(checkDrill(knight, { ...right(knight), 'say-knave-could': 'no' }).diagnosis).toBe('could-is-true');
    // For a knight, "Could" follows the words, so that pattern is right there: a wrong Could is verdict-only.
    expect(checkDrill(knight, { ...right(knight), 'say-knight-could': 'no' }).diagnosis).toBe('verdict-only');
    // On a row that kind can say, the words against the need are a plain slip.
    expect(checkDrill(knight, { ...right(knight), 'say-knight-words': 'false' }).diagnosis).toBeUndefined();
    for (const st of L2_DRILL) expect(st.misconceptions!.find((m) => m.id === 'need-as-truth')?.text ?? st.misconceptions!.find((m) => m.id === 'could-is-true')!.text).toMatch(/^You may be treating /);
  });

  it('lesson 3’s sorting board: the worked guess’s lines, inside the guess or known, worked out from the explanation; each mix-up named', () => {
    const [sort] = L3_DRILL;
    const l3 = stop5.lessons[2];
    expect([sort.id, sort.afterCard, sort.distinction]).toEqual([SORT_ID, 4, GUESS_VS_KNOWN.id]);
    expect(l3.ideas[4].title).toBe('After the crash');
    expect(sort.scene).toBe(l3.ideas[4].scene);
    const { ids, claims, answer } = L3_EXAMPLE;
    const nm = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
    const solve = explainSolve(ids, claims, answer, nm)!;
    // Inside the guess: everything the explanation found between "Suppose" and "That guess crashes".
    const lines = solve.lines;
    const from = lines.findIndex((x) => x.startsWith('Suppose ')), to = lines.findIndex((x) => x.startsWith('That guess crashes'));
    const g = lines[from].match(/^Suppose (\w+) is a (knight|knave)\.$/)!;
    const inside: K = { [lower(g[1])]: g[2] as Kind };
    for (const l of lines.slice(from + 1, to)) for (const m of l.matchAll(/So, inside the guess, (.+?)\./g)) Object.assign(inside, readFacts(m[1], lower));
    const right = Object.fromEntries(marksToTap(sort).map((m) => [m.id, m.answer]));
    expect(checkDrill(sort, right).done).toBe(true);
    for (const r of sort.rows) {
      const text = r.label.replace(/^Line \d+: /, '');
      const kind = text.match(/^(\w+) is a (knight|knave)\.$/);
      const must = text.match(/^(\w+)’s words must be (true|false)\.$/);
      let where: string;
      if (kind) where = inside[lower(kind[1])] === kind[2] && answer[lower(kind[1])] !== kind[2] ? 'guess' : 'known';
      else where = (must![2] === 'true') === (inside[lower(must![1])] === 'knight') ? 'guess' : 'known';
      if (kind && where === 'known') expect(answer[lower(kind[1])], text).toBe(kind[2]);
      expect(r.marks[0].answer, text).toBe(where);
      const wrong = checkDrill(sort, { ...right, [r.marks[0].id]: where === 'guess' ? 'known' : 'guess' });
      expect(wrong.diagnosis, text).toBe(where === 'guess' ? 'guess-as-known' : 'known-as-guess');
    }
    expect(new Set(sort.rows.map((r) => r.marks[0].answer))).toEqual(new Set(['guess', 'known']));
    // The contrast it sits under: Ben's words with the kinds inside the guess, then known; truths from the words.
    if (L3_CONTRAST_SCENE.kind !== 'contrast') throw new Error('no contrast');
    const mean = readWords('Ava and I are the same kind.', 'ben', lower, ids);
    for (const [panel, tag] of [[L3_CONTRAST_SCENE.pairs[0], 'Inside the guess'], [L3_CONTRAST_SCENE.pairs[1], 'Known']] as const) {
      expect(panel.world.startsWith(`${tag}: `)).toBe(true);
      const k = readFacts(panel.world.replace(/^[^:]+: /, '').replace(/\.$/, ''), lower);
      expect(panel.truth).toBe(mean(k));
      expect(/crashes/.test(panel.then!)).toBe(!fits({ ben: mean }, 'ben', k));
    }
    expect(readFacts(L3_CONTRAST_SCENE.pairs[0].world.replace(/^[^:]+: /, '').replace(/\.$/, ''), lower)).toEqual(inside);
    expect(readFacts(L3_CONTRAST_SCENE.pairs[1].world.replace(/^[^:]+: /, '').replace(/\.$/, ''), lower)).toEqual(answer);
  });

  it('“I’m confused”: one to three questions on every board, each with exactly one right option and a “Not sure”, never naming anyone on the board; a Stop 5 closing line', () => {
    const qs = (st: DrillStep) => st.confused ?? [];
    for (const [lesson, st] of ROW_BOARDS()) {
      expect(qs(st).length, st.id).toBeGreaterThanOrEqual(1);
      expect(qs(st).length, st.id).toBeLessThanOrEqual(3);
      const names = st.scene?.kind === 'speakers' ? st.scene.speakers.map((x) => x.name).filter((n) => n !== 'Someone') : st.scene?.kind === 'contrast' ? st.scene.pairs.map((x) => x.who) : [];
      for (const q of qs(st)) {
        expect(q.options.filter((o) => o.right).length, q.q).toBe(1);
        expect(q.options.map((o) => o.label)).toContain('Not sure');
        for (const n of [...names, 'Ava', 'Ben', 'Cal', 'Dee', 'Eli', 'Fay', 'Ada', 'Raj', 'Vic']) expect([q.q, q.teach, ...q.options.map((o) => o.label)].join(' '), `${st.id}: ${n}`).not.toMatch(new RegExp(`\\b${n}\\b`));
        expect(q.teach.trim().length).toBeGreaterThan(20);
      }
      expect(st.words?.closing, st.id).toBeTruthy();
      // Lesson 1: kind vs truth both ways, then a fact vs a test. Lesson 2: would be vs must be.
      if (lesson === 's5.l1') expect(qs(st).map((q) => q.options.find((o) => o.right)!.label)).toEqual(['No: what they say, checked against the case, decides', 'This case crashes: a knave never says true words', 'Max can’t be a knave']);
      if (lesson === 's5.l2') expect(qs(st).map((q) => q.q)).toEqual(['Pretend a knave says, “I am a knave.” Would the words be true or false?', 'A knave’s words must be false. Pretend a knave says some words, and they would be true. Could a knave say them?']);
    }
  });

  it('the reworded texts: “must be” for every need on the cards, two named steps in lesson 2, “a knight or a knave” in lesson 3, and no “given”', () => {
    const [l1, l2, l3] = stop5.lessons;
    const text = (l: (typeof stop5.lessons)[number], title: string) => l.ideas.find((c) => c.title === title)!.body.join(' ');
    expect(text(l1, 'Riddle Island')).toContain('So a knight’s words must be true.');
    expect(text(l1, 'Riddle Island')).toContain('So a knave’s words must be false.');
    expect(text(l1, 'A knight’s words')).toContain('A knight’s words must be true. So Ada has a cat.');
    expect(text(l1, 'A knave’s words')).toContain('A knave’s words must be false. So Ben does not have a dog.');
    for (const c of l1.ideas) expect(c.body.join(' ')).not.toMatch(/\bgiven\b|A knight’s words are true|A knave’s words are false/);
    // Card 5 names both unknowns behind the four cases, and its worked case checks the words before the kind.
    expect(text(l1, 'When you can’t tell')).toContain('Two things are unknown, and each can go two ways. So there are four cases.');
    expect(text(l2, 'Test each kind')).toContain('Step 1: pretend a knave says it. Work out if the words would be true. “I” now means that knave.');
    expect(text(l2, 'Test each kind')).toContain('Step 2: a knave’s words must be false.');
    expect(text(l3, 'Suppose')).toContain('Suppose that one is a knight or a knave.');
    expect(text(l3, 'Crash!')).toContain('When a guess crashes, throw away everything you found inside it.');
    expect(text(l3, 'Four possible answers')).toContain('A guess can also hold.');
    expect(text(l3, 'Four possible answers')).toContain('Following a guess is a short way to list the cases.');
    // Each follow step on the worked cards is Need, Says, So.
    for (const l of [stop5.lessons[2], stop5.lessons[3]]) {
      for (const title of ['Inside the guess', 'After the crash']) {
        const steps = l.ideas.find((c) => c.title === title)!.body.filter((p) => p.startsWith('Need: '));
        expect(steps.length, `${l.id} ${title}`).toBeGreaterThan(0);
        for (const p of steps) expect(p, p).toMatch(/^Need: .*must be (true|false)\. Says: .+\. (So: |But )/);
      }
    }
  });

  it('quizzes: a stated kind is the fact banner, a guess the test-world banner; the lesson 1 Teach says “must be”; every hint and Teach case carries its reason', () => {
    let facts = 0, tests = 0;
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of stop5.lessons.flatMap((l) => l.practice(createRng(seed)))) {
        if (it.scene?.kind === 'speakers') {
          if (it.scene.fact) facts++;
          if (it.scene.test) tests++;
          if (it.skill === 's5.suppose') expect(it.scene.test, it.prompt).toMatch(/^\w+ is a (knight|knave)\. This is a guess\.$/);
          if (it.skill === 's5.cant-say') expect(it.scene.test).toBe('Pretend a knight says it. Then pretend a knave says it.');
          // Where a kind is only pretend (a guess, or each kind in turn), the rule is a need, never a fact about the case.
          if (it.skill === 's5.suppose' || it.skill === 's5.cant-say') expect(it.scene.rule, it.prompt).toBe(PUZZLE_RULE);
        }
        if (it.kind === 'choose' && it.skill === 's5.words' && /^\S+(?: the \w+| \w)? is a (knight|knave)\. \S+ says/.test(it.prompt) && /says, “I/.test(it.prompt)) {
          expect(it.teach!.remember![0]).toBe('A knight’s words must be true. A knave’s words must be false.');
          expect(it.explain).toMatch(/ must be (true|false)\. So /);
        }
        // Every truth on a hint or a Teach case card comes with its comparison, in the stop's words.
        for (const c of [it.hintCase!, ...(it.teach?.cases ?? [])]) {
          const t = c.truths!.find((x) => x.who.endsWith('words'))!;
          expect(t.because, `${it.id} ${c.label}`).toBeDefined();
          expect(t.because!.match).toBe(t.value);
          expect(c.words?.world, c.label).toMatch(/^(In this case|Pretend)$/);
        }
      }
    }
    expect(facts).toBeGreaterThan(40);
    expect(tests).toBeGreaterThan(40);
  });

  it('lesson 1 Teach: a tried kind says what the words must be; a tried fact says what they are (Can’t tell items)', () => {
    let fromKind = 0, fromFact = 0;
    for (let seed = 1; seed <= 120; seed++) {
      const type = (['fact', 'kindFromFact', 'other'] as const)[seed % 3];
      const { item } = wordsItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4], type, speaker: 'unknown', truth: 'unknown', negative: seed % 2 === 0 });
      if (item.answer !== 'cant') continue;
      const ifs = [...item.teach!.simpler!, ...Object.values(item.feedback!).flatMap((f) => f.detail)].filter((l) => /^(But .+\. )?If /.test(l) && /’s words /.test(l));
      expect(ifs.length, item.prompt).toBeGreaterThan(0);
      for (const l of ifs) {
        // "If Uma is a knight, Uma’s words must be true." / "If the dragon is asleep, Kip’s words are true."
        const kind = /If \S+(?: the \w+)? is a (knight|knave), \S+’s words /.test(l);
        expect(l, l).toMatch(kind ? /’s words must be (true|false)/ : /’s words are (true|false)/);
        if (kind) fromKind++;
        else fromFact++;
      }
    }
    expect(fromKind).toBeGreaterThan(10);
    expect(fromFact).toBeGreaterThan(5);
    // The card that links following a guess to listing the cases: with Ava a knight, Ben as a knight crashes on the board.
    const four = stop5.lessons[2].ideas.find((c) => c.title === 'Four possible answers')!.body.join(' ');
    expect(four).toContain('With Ava as a knight, “So Ben is a knave” means the case with Ben as a knight crashes.');
    const row = L3_DRILL.find((st) => st.id === 's5.l3-do1')!.rows.find((r) => r.label === 'Test: Ava and Ben are both knights.')!;
    expect(row.marks.at(-1)!.answer).toBe('crashes');
  });

  it('puzzles carry the guess board (Guess and Known rows, never checked) and “I’m confused”; the mastery tag marks a guess that flips two kinds', () => {
    let tagged = 0;
    for (let seed = 1; seed <= 120; seed++) {
      for (const o of [{ n: 2 as const, lesson: 's5.l3', skill: 's5.two', pool: 'plain' as const }, { n: 3 as const, lesson: 's5.l4', skill: 's5.three', pool: 'basic' as const }]) {
        const { item } = puzzleItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4], ...o });
        const { ids, names } = readScene(item);
        const sc = item.scratch!;
        expect(item.scratchLabel).toBe('the guess board');
        expect(sc.rows.map((r) => [r.id, r.label])).toEqual([['guess', 'Guess (pretend)'], ['known', 'Known (for sure)']]);
        for (const r of sc.rows) expect(r.marks.map((m) => m.label)).toEqual(ids.map((id) => names.get(id)));
        expect(sc.rows[1].marks.map((m) => m.answer)).toEqual(ids.map((id) => item.answer[id].kind));
        expect(sc.words?.closing).toMatch(/inside a guess/);
        expect(item.confused!.map((q) => q.options.filter((x) => x.right).length)).toEqual([1, 1, 1]);
        // Re-read the explanation's guess: what was supposed and found inside it, against the answer.
        const sup = item.explain.match(/Suppose (\w+) is a (knight|knave)\./);
        const idOf = (n: string) => [...names].find(([, v]) => v === n)![0];
        const inside: K = sup ? { [idOf(sup[1])]: sup[2] as Kind } : {};
        for (const m of item.explain.matchAll(/So, inside the guess, (.+?)\./g)) Object.assign(inside, readFacts(m[1], idOf));
        expect(Object.fromEntries(sc.rows[0].marks.map((m) => [m.id.replace(/^guess-/, ''), m.answer]))).toEqual(Object.fromEntries(ids.map((id) => [id, inside[id] ?? 'open'])));
        const flips = Object.entries(inside).filter(([id, k]) => item.answer[id].kind !== k).length;
        expect(!!item.tags?.includes('guess-flips'), item.explain).toBe(flips >= 2);
        if (flips >= 2) tagged++;
      }
    }
    expect(tagged).toBeGreaterThan(20);
  });
});
