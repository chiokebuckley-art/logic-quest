/**
 * Stop 5 knights and knaves. Every item is re-solved here from the words on the page: the speech bubbles
 * are read back with a parser and an evaluator written separately from the engine, and every case
 * (each islander a knight or a knave) is tried by brute force. Explanations are replayed sentence by
 * sentence, and each step is checked against the cases that are still open at that point.
 */
import { describe, expect, it } from 'vitest';
import { L2_EXAMPLE, L3_EXAMPLE, L4_EXAMPLE, L5_EXAMPLE, SKILL_NAMES, stop5 } from '../../content/stop5';
import {
  KNOWN_FACTS,
  ME,
  SKINS,
  SKIN_IDS,
  andOrItem,
  claimText,
  explainSolve,
  puzzleItem,
  solutions,
  supposeItem,
  whoCanSayItem,
  wordsItem,
  type Kind,
  type SkinId,
  type SupposeAnswer,
  type WordsType,
} from '../puzzles/knights';
import { sentences, words } from '../readability';
import { createRng } from '../rng';
import type { AssignItem, ChooseItem, Claim, Item, Scene, Speaker } from '../types';

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
      const need = m[5] === 'true';
      expect(need).toBe(kind === 'knight');
      const next = ss[i + 1] ?? '';
      if (m[4] === 'must be') {
        const b = next.match(/^But with (.+), they are (true|false)\.$/);
        expect(b, `crash reason follows: ${item.explain}`).not.toBe(null);
        expect(b![2] === 'true').toBe(!need);
        const w = b![1].split(/, | and /).map((p) => p.match(/^(\w+) a (knight|knave)$/)!);
        for (const x of w) expect(known[idOf(x[1])], s).toBe(x[2]);
        for (const k of open()) expect(meaning[id](k), `crash holds in every open case: ${item.explain}`).toBe(!need);
        crashed = true;
      } else {
        const so = next.match(/^So (.+)\.$/);
        expect(so, `a “So” follows: ${item.explain}`).not.toBe(null);
        const facts = readFacts(so![1], idOf);
        const good = open().filter((k) => meaning[id](k) === need);
        expect(good.length).toBeGreaterThan(0);
        for (const [f, v] of Object.entries(facts)) for (const k of good) expect(k[f], `${so![0]} in every case where ${id} fits`).toBe(v);
        addFacts(facts);
      }
      i += 2;
    } else if ((m = s.match(/^If (\w+) were a (knight|knave), \1 would be a \2 saying something (true|false)\.$/))) {
      const id = idOf(m[1]);
      expect(known[id]).toBeUndefined();
      const as = m[2] as Kind;
      expect(m[3] === 'true').toBe(as === 'knave');
      for (const k of open().filter((c) => c[id] === as)) expect(meaning[id](k), `${s} in every open case`).toBe(m[3] === 'true');
      const next = ss[i + 1] ?? '';
      const self = next.match(/^So (\w+) is a (knight|knave)\.$/);
      if (self) {
        expect(idOf(self[1])).toBe(id);
        expect(self[2]).toBe(other(as));
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
      const m = item.prompt.match(/ Suppose (\w+) is a (knight|knave)\. What must (\w+) be\?$/)!;
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
      if (ans === 'crash') expect(item.whyWrong!.cant).not.toContain('Only one case works');
      else if (ans !== 'cant') expect(item.whyWrong!.cant).toContain('Only one case works');
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
    expect(claimText(L2_EXAMPLE.claim, ME, (id) => (id === ME ? 'Someone' : 'Ben'), 2)).toBe('Ben and I are the same kind.');
  });
});

describe('lesson 5: a knave’s “and” and “or”', () => {
  /** What each choice says is still possible: [both knights, only X a knight, only Y a knight, both knaves]. */
  const choiceCases = (label: string, X: string, Y: string): boolean[] => {
    if (label === `${X} and ${Y} are both knights.`) return [true, false, false, false];
    if (label === `${X} and ${Y} are both knaves.`) return [false, false, false, true];
    if (label === 'At least one of them is a knave, but maybe not both.') return [false, true, true, true];
    if (label === 'At least one of them is a knight, but maybe not both.') return [true, true, true, false];
    throw new Error(`cannot read choice: ${label}`);
  };

  it('the right choice allows exactly the cases where the speaker’s words fit; every other choice does not', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { item } = andOrItem(createRng(seed), { id: 'x', skin: SKIN_IDS[seed % 4] });
      const m = item.prompt.match(/^(?:.+?) is a (knight|knave)\. (\w+) says, “(.+)\.” What do you know about (\w+) and (\w+)\?$/)!;
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
      // Each wrong-choice message names a case and says the right thing about it.
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const msg = item.whyWrong![c.id];
        const allowed = choiceCases(c.label, X, Y);
        const caseOf = (t: string) => {
          const both = t.match(/^(\w+) and (\w+) are both (knight|knave)s$/);
          const one = t.match(/^(\w+) is a (knight|knave) and (\w+) is a (knight|knave)$/);
          const k = both ? [both[3], both[3]] : [one![2], one![4]];
          return all.findIndex((a) => a[X.toLowerCase()] === k[0] && a[Y.toLowerCase()] === k[1]);
        };
        let mm = msg.match(/^Suppose (.+)\. Then \w+’s words would be (true|false)\./);
        if (mm) {
          const i = caseOf(mm[1]);
          expect(allowed[i] && !keep[i], msg).toBe(true);
          expect(mean(all[i])).toBe(mm[2] === 'true');
        } else {
          mm = msg.match(/^It could also be that (.+)\. \w+’s words are still (true|false) then\.$/)!;
          expect(mm, msg).not.toBe(null);
          const i = caseOf(mm[1]);
          expect(!allowed[i] && keep[i], msg).toBe(true);
          expect(mean(all[i])).toBe(mm[2] === 'true');
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
  it('the lesson 3 example has one answer, and the engine explains it the way the card does', () => {
    const { ids, claims, answer } = L3_EXAMPLE;
    expect(solutions(ids, claims)).toEqual([answer]);
    const nm = (id: string) => (id === 'ava' ? 'Ava' : 'Ben');
    const solve = explainSolve(ids, claims, answer, nm)!;
    expect(solve.supposed).toEqual(['ava']);
    expect(solve.lines.slice(0, 3)).toEqual(['Suppose Ava is a knave.', 'Then Ava’s words are false. So Ben is a knight.', 'Ben is a knight, so Ben’s words must be true. But with Ava a knave and Ben a knight, they are false.']);
    const card = stop5.lessons[2].ideas.find((c) => c.title === 'A worked example')!;
    if (card.scene?.kind !== 'speakers') throw new Error('no scene');
    expect(card.scene.speakers.map((s) => s.says)).toEqual(ids.map((id) => claimText(claims[id], id, nm, 2)));
    expect(card.body[0]).toBe('Suppose Ava is a knave. Then Ava’s words are false. So Ben is a knight.');
    expect(card.body[2]).toContain('So Ava is a knight.');
    expect(card.body[2]).toContain('Ben is a knave');
  });

  it('the lesson 4 example has one answer, and supposing Ava is a knight crashes', () => {
    const { ids, claims, answer } = L4_EXAMPLE;
    expect(solutions(ids, claims)).toEqual([answer]);
    expect(solutions(ids, claims, { ava: 'knight' })).toEqual([]);
    const nm = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
    const card = stop5.lessons[3].ideas.find((c) => c.title === 'A worked example')!;
    if (card.scene?.kind !== 'speakers') throw new Error('no scene');
    expect(card.scene.speakers.map((s) => s.says)).toEqual(ids.map((id) => claimText(claims[id], id, nm, 3)));
    // Each step on the card holds in every case that is left when it is said.
    const mean = readSpeakers(card.scene).meaning;
    expect(cases(ids, { ava: 'knight' }).filter((k) => fits(mean, 'ava', k)).every((k) => k.ben === 'knave')).toBe(true);
    expect(cases(ids, { ava: 'knight', ben: 'knave' }).filter((k) => fits(mean, 'ben', k)).every((k) => k.cal === 'knight')).toBe(true);
    expect(cases(ids, { ava: 'knight', ben: 'knave', cal: 'knight' }).some((k) => fits(mean, 'cal', k))).toBe(false);
    expect(card.body[2]).toBe('So Ava is a knave. Then Ben is a knight, and Cal is a knave.');
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
    expect(andCard.body.join(' ')).toContain('at least one of them is a knave, but maybe not both');
    expect(all.filter((k) => !either(k))).toEqual([{ ava: 'knave', ben: 'knave' }]);
    expect(orCard.body.join(' ')).toContain('Both are knaves.');
    expect(all.filter((k) => either(k)).length).toBe(3);
    expect(knightOr.body.join(' ')).toContain('Maybe both are.');
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

