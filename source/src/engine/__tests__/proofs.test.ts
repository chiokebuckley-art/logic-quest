/**
 * Stop 12 · Proof (id s11). Every answer is worked out again here by a second method, from what the learner sees:
 *  - a chain step follows when a path of “before” facts it uses leads from its first name to its second (and, for the
 *    defined word, when it also uses the definition): arrows followed, never lines listed;
 *  - a proof by cases: the options read from given 1, the ones a given rules out, the boxes the proof checks, and the
 *    claim checked against fact tables written here (or the number itself);
 *  - suppose and crash: every way to make each islander a knight or a knave, checked speaker by speaker;
 *  - a counterexample: the claim read from the prompt, each card's color, shape and size checked against it.
 */
import { describe, expect, it } from 'vitest';
import { stop11 } from '../../content/stop11';
import { STOPS } from '../../content/stops';
import { checkDrill, marksToTap } from '../drill';
import { freshCheckSet, looks } from '../fresh';
import { claimTrue } from '../grade';
import * as PB from '../puzzles/proofBoards';
import * as P from '../puzzles/proofs';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, Claim, DrillStep, Item, Scene, Thing } from '../types';

const SEEDS = 160;
const SKINS = P.PROOF_SKINS;
const choose = (m: P.ProofMade) => m.item as ChooseItem;
const labelOf = (it: ChooseItem, id: string) => it.choices.find((c) => c.id === id)!.label;
const textLines = (s?: Scene) => (s?.kind === 'text' ? s.lines : []);

// ---------- chains: parse the proof as shown, then follow arrows ----------

const REL = /^(\w+) (finished before|was born before|hatched before|comes before) (\w+)\.$/;
const DEFD = /^(\w+) (beat|is older than|is ahead of) (\w+)\.$/;
type Fact = { t: 'before' | 'def'; a: string; b: string };
const parseFact = (s: string): Fact => {
  const r = REL.exec(s.trim());
  if (r) return { t: 'before', a: r[1], b: r[3] };
  const d = DEFD.exec(s.trim());
  if (d) return { t: 'def', a: d[1], b: d[3] };
  throw new Error(`not a fact: ${s}`);
};
type Use = { t: 'given' | 'step'; k: number } | { t: 'def' };
const parseUses = (text: string): Use[] => {
  if (/^(Uses )?nothing/i.test(text.trim())) return [];
  return [...text.matchAll(/(given|step) (\d)|the definition/gi)].map((m) => (m[0].toLowerCase() === 'the definition' ? { t: 'def' as const } : { t: m[1].toLowerCase() as 'given' | 'step', k: Number(m[2]) - 1 }));
};
interface Shown {
  givens: Fact[];
  claim: Fact;
  steps: { stmt: Fact; uses: Use[] | null }[];
}
function parseChain(lines: readonly string[]): Shown {
  const givens: Fact[] = [];
  const steps: Shown['steps'] = [];
  let claim: Fact | null = null;
  for (const l of lines) {
    let m = /^Given \d: (.+)$/.exec(l);
    if (m) { givens.push(parseFact(m[1])); continue; }
    m = /^Claim: (.+)$/.exec(l);
    if (m) { claim = parseFact(m[1]); continue; }
    m = /^Step \d: (.+?\.) (Uses .+)$/.exec(l);
    if (m) steps.push({ stmt: parseFact(m[1]), uses: m[2] === 'Uses what?' ? null : parseUses(m[2].replace(/^Uses /, '')) });
  }
  return { givens, claim: claim!, steps };
}
/** Is there a path of before-arrows from a to b? */
function reaches(facts: readonly Fact[], a: string, b: string): boolean {
  const seen = new Set([a]);
  const todo = [a];
  while (todo.length) {
    const x = todo.pop()!;
    for (const f of facts) {
      if (f.t !== 'before' || f.a !== x || seen.has(f.b)) continue;
      if (f.b === b) return true;
      seen.add(f.b);
      todo.push(f.b);
    }
  }
  return false;
}
function forces(sh: Shown, stmt: Fact, uses: readonly Use[]): boolean {
  const facts = uses.flatMap((u) => (u.t === 'given' ? [sh.givens[u.k]] : u.t === 'step' ? [sh.steps[u.k].stmt] : []));
  if (stmt.t === 'before') return reaches(facts, stmt.a, stmt.b);
  return facts.some((f) => f.t === 'def' && f.a === stmt.a && f.b === stmt.b) || (uses.some((u) => u.t === 'def') && reaches(facts, stmt.a, stmt.b));
}
const ORDER_LINE = /in this order: (.+?)\.|The line is (.+?), in that order\./;
const realOrder = (text: string) => {
  const m = ORDER_LINE.exec(text)!;
  return (m[1] ?? m[2]).replace(' and ', ', ').split(', ');
};

// ---------- cases: parse the givens and the boxes ----------

const FACTS: Record<string, Record<string, boolean>> = {
  // Written here, from what is true about each pet, day and potion (the potions' facts are read from given 2).
  'a cat': { fur: true, legs: true }, 'a dog': { fur: true, legs: true }, 'a rabbit': { fur: true, legs: true }, 'a hamster': { fur: true, legs: true },
  'a fish': { fur: false, legs: false }, 'a bird': { fur: false, legs: true }, 'a turtle': { fur: false, legs: true }, 'a snake': { fur: false, legs: false },
};
const WEEKEND = ['Saturday', 'Sunday'];
const listOpts = (s: string) => s.replace(/\.$/, '').split(/, | or /);
/** Given 1's options, as written: “a cat”, “Saturday”, “red”, “5”. */
function optsOf(given1: string): string[] {
  const m = /(?:is on|is) (.+)$/.exec(given1.replace(/^The number on the card is /, 'is '))!;
  return listOpts(m[1]);
}
const optOfCase = (fact: string) => /(?:is on|is) (.+)\.$/.exec(fact)![1];
const ruledOf = (givens: readonly string[]) => givens.flatMap((g) => { const m = /is not (?:on )?(.+)\.$/.exec(g); return m ? [m[1]] : []; });
/** Does the claim hold for this option? From the claim's words, a fact table, the potion given, or the number. */
function claimFor(claim: string, opt: string, givens: readonly string[]): boolean {
  if (/The number is even/.test(claim)) return Number(opt) % 2 === 0;
  if (/The number is odd/.test(claim)) return Number(opt) % 2 === 1;
  if (/more than 3/.test(claim)) return Number(opt) > 3;
  if (/less than 7/.test(claim)) return Number(opt) < 7;
  if (/no school/.test(claim)) return WEEKEND.includes(opt);
  if (/is school/.test(claim)) return !WEEKEND.includes(opt);
  if (/has fur/.test(claim)) return FACTS[opt].fur;
  if (/has legs/.test(claim)) return FACTS[opt].legs;
  const verb = /glows/.test(claim) ? 'glow' : 'fizz';
  const world = givens.find((g) => g.includes('potions'))!;
  const yes = new RegExp(`([A-Za-z, ]+) potions ${verb}\\.`).exec(world);
  return !!yes && yes[1].toLowerCase().replace(' and ', ', ').split(', ').includes(opt);
}
interface CaseShown {
  givens: string[];
  claim: string;
  opts: string[];
  ruled: string[];
  covered: string[];
}
function parseCases(s: Scene | undefined): CaseShown {
  if (s?.kind !== 'argument') throw new Error('not a case picture');
  const opts = optsOf(s.givens[0]);
  const ruled = ruledOf(s.givens.slice(1));
  const covered = (s.cases ?? []).filter((c) => !c.out).map((c) => optOfCase(c.facts[0]));
  return { givens: s.givens, claim: s.claim, opts, ruled, covered };
}
const leftOf = (c: CaseShown) => c.opts.filter((o) => !c.ruled.includes(o));
const missing = (c: CaseShown) => leftOf(c).filter((o) => !c.covered.includes(o));
/** A name in a choice: “the cat” or “The cat” -> “a cat”; “the red potion” -> “red”. */
const optName = (label: string) => label.replace(/^(the|The) (\w+) potion$/, '$2').replace(/^(the|The) /, 'a ').replace(/^a (\d)$/, '$1').replace(/^a (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/, '$1');

// ---------- knights: every way, speaker by speaker ----------

const KINDS = ['knight', 'knave'] as const;
function everyWay(ids: readonly string[]): Record<string, 'knight' | 'knave'>[] {
  let out: Record<string, 'knight' | 'knave'>[] = [{}];
  for (const id of ids) out = out.flatMap((w) => KINDS.map((k) => ({ ...w, [id]: k })));
  return out;
}
const fitsRule = (claims: Record<string, Claim>, w: Record<string, 'knight' | 'knave'>) => Object.entries(claims).every(([id, c]) => (w[id] === 'knight') === claimTrue(c, w));
const wordBreakers = (claims: Record<string, Claim>, w: Record<string, 'knight' | 'knave'>) => Object.keys(claims).filter((id) => (w[id] === 'knight') !== claimTrue(claims[id], w));

// ---------- cards: read the claim, check each card ----------

const CLAIM_RE = /Every (red|blue|yellow|big|small) (sticker|tile|card) in [^.]+ is (a circle|a square|a triangle|red|blue|yellow|big|small)\./;
function roleOfCard(claim: string, t: Thing): 'break' | 'fit' | 'none' {
  const m = CLAIM_RE.exec(claim)!;
  const g = m[1];
  const prop = m[3].replace(/^a /, '');
  const inG = t.color === g || t.size === g;
  const holds = t.shape === prop || t.color === prop || t.size === prop;
  return !inG ? 'none' : holds ? 'fit' : 'break';
}
const nameOf = (t: Thing) => `the ${t.size} ${t.color} ${t.shape}`;

// ---------- sequences (Proof Lantern's families): predicates written here ----------

const SEQ_TESTS: Record<string, { inG: (xs: number[]) => boolean; holds: (xs: number[]) => boolean }> = {
  'Every growing number sequence doubles.': { inG: (xs) => xs.every((x, i) => i === 0 || x > xs[i - 1]), holds: (xs) => xs.every((x, i) => i === 0 || x === 2 * xs[i - 1]) },
  'Every sequence that adds 2 each time has only even numbers.': { inG: (xs) => xs.every((x, i) => i === 0 || x - xs[i - 1] === 2), holds: (xs) => xs.every((x) => x % 2 === 0) },
  'Every growing number sequence adds the same number each time.': { inG: (xs) => xs.every((x, i) => i === 0 || x > xs[i - 1]), holds: (xs) => xs.every((x, i) => i < 2 || x - xs[i - 1] === xs[1] - xs[0]) },
  'Every number sequence that starts with an odd number has only odd numbers.': { inG: (xs) => xs[0] % 2 === 1, holds: (xs) => xs.every((x) => x % 2 === 1) },
};

// =====================================================================================================================

describe('the chain model', () => {
  it('follows (lines listed) agrees with following arrows, for every set of sources of every step, over many chains', () => {
    for (const sid of P.ORDER_SKIN_IDS) for (let seed = 1; seed <= 40; seed++) {
      const p = P.makeChain(createRng(seed), sid);
      const sh = parseChain(P.chainLines(p));
      p.steps.forEach((st, k) => {
        for (const set of P.sourceSets(p, k)) expect(P.follows(p, st.stmt, set), `${sid} ${seed} step ${k + 1}`).toBe(forces(sh, parseFact(P.stmtText(p, st.stmt)), set));
        expect(P.follows(p, st.stmt, []), 'nothing forces a step').toBe(false);
      });
    }
  });

  it('a made chain: every step follows and is true in what really happened; the claim is the defined word about the first and last', () => {
    for (const sid of P.ORDER_SKIN_IDS) for (let seed = 1; seed <= SEEDS; seed++) {
      const p = P.makeChain(createRng(seed), sid);
      const sh = parseChain(P.chainLines(p));
      sh.steps.forEach((s, k) => expect(forces(sh, s.stmt, s.uses!), `${sid} ${seed} step ${k + 1}`).toBe(true));
      for (const f of [...sh.givens, ...sh.steps.map((s) => s.stmt)]) expect(p.line.indexOf(f.a) < p.line.indexOf(f.b)).toBe(true);
      expect(sh.claim).toEqual({ t: 'def', a: p.line[0], b: p.line[p.line.length - 1] });
      expect(sh.steps[sh.steps.length - 1].stmt).toEqual(sh.claim);
    }
  });

  it('a broken chain: exactly the broken step fails (by arrows), and it is still true in the story', () => {
    for (const how of ['nothing', 'wrong', 'def'] as const) for (let seed = 1; seed <= SEEDS; seed++) {
      const rng = createRng(seed);
      const p = P.breakChain(rng, P.makeChain(rng, rng.pick(P.ORDER_SKIN_IDS)), how);
      const sh = parseChain(P.chainLines(p));
      const bad = sh.steps.map((s, k) => (forces(sh, s.stmt, s.uses!) ? -1 : k)).filter((k) => k >= 0);
      expect(bad, `${how} ${seed}`).toEqual([p.broken!.k]);
      const st = sh.steps[p.broken!.k];
      expect(p.line.indexOf(st.stmt.a) < p.line.indexOf(st.stmt.b)).toBe(true);
      if (how === 'nothing') expect(st.uses).toEqual([]);
      if (how === 'def') expect(st.uses!.some((u) => u.t === 'def')).toBe(false);
    }
  });
});

describe('Lesson 2 · every step cites', () => {
  it('what does step k use: only the right set of sources forces the step; “nothing” never does', () => {
    for (const sid of P.ORDER_SKIN_IDS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = P.citeItem(createRng(seed), { skin: sid });
      const it = choose(m);
      const sh = parseChain(textLines(it.scene));
      const k = sh.steps.findIndex((s) => s.uses === null);
      expect(k, 'one step hides what it uses').toBeGreaterThanOrEqual(0);
      expect(it.prompt).toContain(`What does step ${k + 1} use?`);
      for (const c of it.choices) expect(forces(sh, sh.steps[k].stmt, parseUses(c.label)), `${sid} ${seed}: ${c.label}`).toBe(c.id === it.answer);
      expect(it.choices.some((c) => c.label.startsWith('Nothing'))).toBe(true);
    }
  });

  it('which step does not follow: the first step whose sources do not force it, or none', () => {
    for (const how of ['wrong', 'def', 'nothing', 'none'] as const) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.brokenStepItem(createRng(seed), { skin: P.ORDER_SKIN_IDS[seed % 4], how }));
      const sh = parseChain(textLines(it.scene));
      const bad = sh.steps.findIndex((s) => !forces(sh, s.stmt, s.uses!));
      expect(it.answer, `${how} ${seed}`).toBe(bad >= 0 ? `s${bad + 1}` : 'none');
      expect(bad >= 0).toBe(how !== 'none');
    }
  });

  it('the trap (and a conflict item): every step is true and the claim is true, but one step uses nothing', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.chainTrapItem(createRng(seed), { skin: P.ORDER_SKIN_IDS[seed % 4] }));
      const sh = parseChain(textLines(it.scene));
      const order = realOrder(it.prompt);
      for (const f of [...sh.givens, ...sh.steps.map((s) => s.stmt), sh.claim]) expect(order.indexOf(f.a) < order.indexOf(f.b), `${seed}: true in the story`).toBe(true);
      const gaps = sh.steps.map((s, k) => (s.uses!.length === 0 ? k : -1)).filter((k) => k >= 0);
      expect(gaps.length).toBe(1);
      expect(forces(sh, sh.steps[gaps[0]].stmt, [])).toBe(false);
      expect(labelOf(it, it.answer)).toBe(`No. Step ${gaps[0] + 1} uses nothing, so it does not follow.`);
      expect(it.conflict).toBe(true);
      expect(it.tags).toEqual([P.TRAPS.cite.tag]);
      expect(it.feedback!.true.headline).toContain('true is not the same as follows');
    }
  });
});

describe('Lesson 3 · cover every case', () => {
  it('which cases must be checked: exactly the cases the givens leave', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.mustCoverItem(createRng(seed), { skin }));
      const c = parseCases(it.scene);
      expect(c.ruled.length).toBe(1);
      const left = leftOf(c);
      for (const ch of it.choices) {
        const named = ch.label.replace(/^Only /, '').split(/, | and /).map(optName);
        const exact = named.length === left.length && left.every((o) => named.includes(o));
        expect(exact, `${skin} ${seed}: ${ch.label} vs ${left.join('|')}`).toBe(ch.id === it.answer);
      }
      // The case a given rules out breaks the claim, so ruling it out matters.
      expect(claimFor(c.claim, c.ruled[0], c.givens)).toBe(false);
    }
  });

  it('which case is left out: the case the givens leave that no box checks, or none; every box shows the claim true', () => {
    for (const skin of SKINS) for (const left of ['none', 'holds', 'fails'] as const) for (let seed = 1; seed <= 80; seed++) {
      const it = choose(P.leftOutItem(createRng(seed), { skin, left }));
      const c = parseCases(it.scene);
      const gap = missing(c);
      expect(gap.length).toBe(left === 'none' ? 0 : 1);
      expect(it.answer === 'none' ? null : optName(labelOf(it, it.answer))).toBe(gap[0] ?? null);
      for (const o of c.covered) expect(claimFor(c.claim, o, c.givens), `${skin} ${seed} ${o}`).toBe(true);
      if (gap[0]) expect(claimFor(c.claim, gap[0], c.givens)).toBe(left === 'holds');
      if (gap[0]) expect(it.tags).toEqual([P.TRAPS.cases.tag]);
    }
  });

  it('the trap (and a conflict item): true in every case it checks, but a case is left out', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.casesTrapItem(createRng(seed), { skin }));
      const c = parseCases(it.scene);
      const gap = missing(c);
      expect(gap.length).toBe(1);
      for (const o of c.covered) expect(claimFor(c.claim, o, c.givens)).toBe(true);
      expect(optName(labelOf(it, 'left').replace(/^No\. It leaves out /, '').replace(/\.$/, ''))).toBe(gap[0]);
      expect(it.answer).toBe('left');
      expect(it.conflict).toBe(true);
      expect(it.tags).toEqual([P.TRAPS.cases.tag]);
    }
  });
});

describe('Lesson 4 · suppose and crash', () => {
  it('a crash proves the opposite: no way with the guess fits, a way with its opposite does, and the other choices are false', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = P.crashProvesItem(createRng(seed), { skin });
      const it = choose(m);
      const c = m.crash!;
      const ways = everyWay(c.ids);
      expect(ways.filter((w) => w[c.who] === c.kind && fitsRule(c.claims, w)).length, 'the guess crashes').toBe(0);
      const fits = ways.filter((w) => fitsRule(c.claims, w));
      expect(fits.length, 'one answer').toBe(1);
      expect(fits[0][c.who]).not.toBe(c.kind);
      expect(labelOf(it, it.answer)).toBe(`${c.nm(c.who)} is a ${fits[0][c.who]}.`);
      const y = c.ids.find((id) => id !== c.who)!;
      expect(labelOf(it, 'other')).toBe(`${c.nm(y)} is a ${fits[0][y] === 'knight' ? 'knave' : 'knight'}.`);
      expect(it.prompt).toContain(`Suppose ${c.nm(c.who)} is a ${c.kind}.`);
      // Inside the guess the shown world breaks the rule, and the scene's test banner is the guess.
      expect(wordBreakers(c.claims, c.world).length).toBeGreaterThan(0);
      expect(it.scene?.kind === 'speakers' && it.scene.test).toBe(`${c.nm(c.who)} is a ${c.kind}.`);
    }
  });

  it('whose words break the rule inside the guess: the one speaker who breaks it in the guess’s world', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = P.breakerItem(createRng(seed), { skin });
      const it = choose(m);
      const c = m.crash!;
      expect(c.world[c.who]).toBe(c.kind);
      // The world is what the guess forces: the guessed speaker fits the rule in it, and no other world does that.
      const forced = everyWay(c.ids).filter((w) => w[c.who] === c.kind && (!c.claims[c.who] || (c.kind === 'knight') === claimTrue(c.claims[c.who], w)));
      expect(forced).toEqual([c.world]);
      expect(wordBreakers(c.claims, c.world)).toEqual([it.answer]);
      expect(it.prompt).not.toContain('crashes');
    }
  });

  it('the trap: a guess that holds up proves nothing, because a case with its opposite fits too', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = P.holdsUpItem(createRng(seed), { skin });
      const it = choose(m);
      const c = m.crash!;
      const fits = everyWay(c.ids).filter((w) => fitsRule(c.claims, w));
      expect(fits.some((w) => w[c.who] === c.kind), 'the guess holds up').toBe(true);
      expect(fits.some((w) => w[c.who] !== c.kind), 'and so does its opposite').toBe(true);
      expect(it.answer).toBe('could');
      expect(labelOf(it, 'could')).toContain('It is not a proof.');
      expect(it.tags).toEqual([P.TRAPS.crash.tag]);
      expect(it.conflict).toBe(true);
      // The words the scene shows are the claims the cases were checked against.
      const words = (it.scene as Extract<Scene, { kind: 'speakers' }>).speakers.map((s) => s.says);
      expect(new Set(words).size).toBe(words.length);
    }
  });
});

describe('Lesson 5 · one is enough', () => {
  it('which card breaks the claim: the only card the claim is about that fails it', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.whichBreaksItem(createRng(seed), { skin, seq: false }));
      const claim = /“(.+)”/.exec(it.prompt)![1];
      const things = (it.scene as Extract<Scene, { kind: 'things' }>).things;
      const roles = things.map((t) => roleOfCard(claim, t));
      expect(roles.filter((r) => r === 'break').length).toBe(1);
      expect(roles).toContain('fit');
      expect(roles).toContain('none');
      const brk = things[roles.indexOf('break')];
      expect(labelOf(it, it.answer).toLowerCase()).toBe(nameOf(brk));
    }
  });

  it('which number list breaks the claim (Proof Lantern’s families): in the group, and the claim fails', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.whichBreaksItem(createRng(seed), { skin: 'abstract', seq: true }));
      const claim = /“(.+)”/.exec(it.prompt)![1];
      const t = SEQ_TESTS[claim];
      expect(t, claim).toBeDefined();
      for (const c of it.choices) {
        const xs = c.label.split(', ').map(Number);
        expect(t.inG(xs) && !t.holds(xs), `${seed}: ${c.label}`).toBe(c.id === it.answer);
      }
    }
  });

  it('the trap: cards that fit (and cards it says nothing about) never prove the claim; none of them breaks it', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.examplesTrapItem(createRng(seed), { skin }));
      const claim = /“(.+)”/.exec(it.prompt)![1];
      const roles = (it.scene as Extract<Scene, { kind: 'things' }>).things.map((t) => roleOfCard(claim, t));
      expect(roles).not.toContain('break');
      expect(roles.filter((r) => r === 'fit').length).toBeGreaterThanOrEqual(2);
      expect(it.answer).toBe('no');
      expect(it.tags).toEqual([P.TRAPS.counter.tag]);
      // The unseen card the feedback shows really would break it.
      const ex = it.feedback!.yes.example!;
      expect(roleOfCard(claim, ex.things![0])).toBe('break');
    }
  });

  it('a conflict item: more cards fit, one breaks it, so the claim is false', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(P.oneBreaksItem(createRng(seed), { skin }));
      const claim = /“(.+)”/.exec(it.prompt)![1];
      const roles = (it.scene as Extract<Scene, { kind: 'things' }>).things.map((t) => roleOfCard(claim, t));
      expect(roles.filter((r) => r === 'break').length).toBe(1);
      expect(roles.filter((r) => r === 'fit').length).toBeGreaterThan(1);
      expect(it.answer).toBe('false');
      expect(it.conflict).toBe(true);
    }
  });
});

/** The way a reasoning uses, read from its lines (a second method): a guess, cases, steps, or a card. */
function wayOf(lines: readonly string[]): P.Method {
  const all = lines.join(' ');
  if (/Suppose /.test(all)) return 'crash';
  if (/Case 1:/.test(all)) return 'cases';
  if (/Step 1:/.test(all)) return 'chain';
  if (/So the claim is false\./.test(all)) return 'counter';
  if (/So the claim is true\./.test(all)) return 'examples';
  throw new Error(`no way: ${all}`);
}

describe('Lesson 1 · four ways to prove', () => {
  it('the answer is the way the reasoning’s lines use, and each reasoning works by that way', () => {
    for (const method of P.METHODS) for (const skin of SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = P.methodItem(createRng(seed), { method, skin });
      const it = choose(m);
      const lines = textLines(it.scene);
      expect(wayOf(lines), `${method} ${skin} ${seed}`).toBe(it.answer);
      expect(it.answer).toBe(method);
      if (method === 'chain' && m.parity) {
        // Proof Lantern’s reason chain: the claim holds for the first 60 terms of the stated rule, worked out here.
        const { a, d } = m.parity;
        const terms = Array.from({ length: 60 }, (_, n) => a + n * d);
        const claim = lines.find((l) => l.startsWith('Claim: '))!;
        if (/take turns/.test(claim)) expect(terms.every((t, n) => n === 0 || t % 2 !== terms[n - 1] % 2)).toBe(true);
        else expect(terms.every((t) => t % 2 === a % 2)).toBe(true);
        expect(d % 2 === 1).toBe(/take turns/.test(claim));
        expect(lines.some((l) => /^Step 1: Start at \d+, which is (odd|even)\.$/.test(l))).toBe(true);
      } else if (method === 'chain') {
        const sh = parseChain(lines);
        sh.steps.forEach((s) => expect(forces(sh, s.stmt, s.uses!)).toBe(true));
      }
      if (method === 'cases') {
        const c = m.cases!;
        expect(P.leftOut(c)).toEqual([]);
        for (const o of c.covered) expect(lines.join(' ')).toContain(c.prop.yes(o));
      }
      if (method === 'crash') {
        const c = m.crash!;
        expect(everyWay(c.ids).filter((w) => w[c.who] === c.kind && fitsRule(c.claims, w)).length).toBe(0);
      }
      if (method === 'counter' || method === 'examples') {
        const claim = /^Claim: (.+)$/.exec(lines[0])![1];
        const roles = m.counter!.cards.map((t) => roleOfCard(claim, t));
        expect(roles.every((r) => r === (method === 'counter' ? 'break' : 'fit'))).toBe(true);
      }
      expect(it.choices.map((c) => c.id)).toEqual([...P.METHODS]);
      if (method === 'examples') expect(it.tags).toEqual([P.TRAPS.method.tag]);
      else expect(it.tags).toBeUndefined();
    }
  });
});

describe('the closing why item', () => {
  it('each family: the right reason names what makes the proof work, and the proof works (second method)', () => {
    for (const family of P.WAYS) for (let seed = 1; seed <= 80; seed++) {
      const m = P.whyItem(createRng(seed), { family, skin: SKINS[seed % 3] });
      const it = choose(m);
      expect(it.tags).toEqual(['why']);
      expect(m.tag).toBe('why');
      for (const c of it.choices) expect(c.label.length).toBeGreaterThan(12);
      for (const c of it.choices) expect(c.label.startsWith('Because')).toBe(true);
      const right = labelOf(it, it.answer);
      if (family === 'chain') {
        expect(right).toBe('Because every step follows from what it uses.');
        const sh = parseChain(textLines(it.scene));
        sh.steps.forEach((s) => expect(forces(sh, s.stmt, s.uses!)).toBe(true));
      }
      if (family === 'cases') {
        expect(right).toBe('Because the claim is true in every case the givens leave.');
        const s = it.scene as Extract<Scene, { kind: 'argument' }>;
        const opts = optsOf(s.givens[0]);
        const ruled = ruledOf(s.givens.slice(1));
        for (const o of opts.filter((x) => !ruled.includes(x))) expect(claimFor(s.claim, o, s.givens)).toBe(true);
      }
      if (family === 'crash') {
        const c = m.crash!;
        expect(right).toContain(`can’t be a ${c.kind}`);
        expect(everyWay(c.ids).filter((w) => w[c.who] === c.kind && fitsRule(c.claims, w)).length).toBe(0);
      }
      if (family === 'counter') {
        const claim = /“(.+)”/.exec(it.prompt)![1];
        const things = (it.scene as Extract<Scene, { kind: 'things' }>).things;
        const brk = things.filter((t) => roleOfCard(claim, t) === 'break');
        expect(brk.length).toBe(1);
        expect(right).toContain(nameOf(brk[0]));
        expect(things.filter((t) => roleOfCard(claim, t) === 'fit').length).toBe(2);
      }
    }
  });
});

describe('every item', () => {
  const MAKERS: [string, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.ProofMade][] = [
    ...P.METHODS.map((method) => [`method-${method}`, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.methodItem(rng, { method, skin })] as [string, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.ProofMade]),
    ['cite', (rng, skin) => P.citeItem(rng, { skin: rng.pick(P.ORDER_BY_SKIN[skin]) })],
    ['broken', (rng, skin) => P.brokenStepItem(rng, { skin: rng.pick(P.ORDER_BY_SKIN[skin]) })],
    ['chain-trap', (rng, skin) => P.chainTrapItem(rng, { skin: rng.pick(P.ORDER_BY_SKIN[skin]) })],
    ['must', (rng, skin) => P.mustCoverItem(rng, { skin })],
    ['left', (rng, skin) => P.leftOutItem(rng, { skin })],
    ['cases-trap', (rng, skin) => P.casesTrapItem(rng, { skin })],
    ['proves', (rng, skin) => P.crashProvesItem(rng, { skin })],
    ['breaker', (rng, skin) => P.breakerItem(rng, { skin })],
    ['holds', (rng, skin) => P.holdsUpItem(rng, { skin })],
    ['which', (rng, skin) => P.whichBreaksItem(rng, { skin })],
    ['examples', (rng, skin) => P.examplesTrapItem(rng, { skin })],
    ['one', (rng, skin) => P.oneBreaksItem(rng, { skin })],
    ...P.WAYS.map((family) => [`why-${family}`, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.whyItem(rng, { family, skin })] as [string, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.ProofMade]),
  ];

  it('2-5 distinct choices, feedback for every wrong choice (in step with whyWrong) and none for the right one, a hint with its case, and teaching', () => {
    for (const [name, make] of MAKERS) for (const skin of SKINS) for (let seed = 1; seed <= 30; seed++) {
      const it = choose(make(createRng(seed), skin));
      const where = `${name} ${skin} ${seed}`;
      expect(it.choices.length, where).toBeGreaterThanOrEqual(2);
      expect(it.choices.length, where).toBeLessThanOrEqual(5);
      expect(new Set(it.choices.map((c) => c.label)).size, where).toBe(it.choices.length);
      expect(new Set(it.choices.map((c) => c.id)).size, where).toBe(it.choices.length);
      for (const c of it.choices) {
        if (c.id === it.answer) expect(it.feedback?.[c.id], where).toBeUndefined();
        else {
          expect(it.feedback?.[c.id]?.headline.trim(), `${where} ${c.id}`).toBeTruthy();
          expect(it.whyWrong?.[c.id], `${where} ${c.id}`).toBe([it.feedback![c.id].headline, ...it.feedback![c.id].detail].join(' '));
        }
      }
      expect(it.hint?.trim(), where).toBeTruthy();
      expect(it.hintCase, where).toBeDefined();
      expect(it.teach?.rule.trim(), where).toBeTruthy();
      expect(it.teach?.cases?.length ?? 0, where).toBeGreaterThanOrEqual(2);
      expect(it.explain.trim(), where).toBeTruthy();
    }
  });

  it('the same seed gives the same item', () => {
    for (const [name, make] of MAKERS) for (const skin of SKINS) for (let seed = 1; seed <= 10; seed++) expect(make(createRng(seed), skin).item, `${name} ${skin}`).toEqual(make(createRng(seed), skin).item);
  });

  it('every string an item shows is whole: no empty slot, no stand-in letters, and a left-out case where the claim fails is never called “not false”', () => {
    type Make = (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.ProofMade;
    const extra: [string, Make][] = [
      // Step 1 uses nothing: its teaching must not read “It uses .”
      ['broken-nothing', (rng, skin) => P.brokenStepItem(rng, { skin: rng.pick(P.ORDER_BY_SKIN[skin]), how: 'nothing' })],
      ['chain-trap-letters', (rng) => P.chainTrapItem(rng, { skin: 'letters' })],
      ['cases-trap-fails', (rng, skin) => P.casesTrapItem(rng, { skin, left: 'fails' })],
    ];
    for (const [name, make] of [...MAKERS, ...extra]) for (const skin of SKINS) for (let seed = 1; seed <= 30; seed++) {
      const it = choose(make(createRng(seed), skin));
      const where = `${name} ${skin} ${seed}`;
      for (const t of [it.prompt, it.explain, ...it.choices.map((c) => c.label), ...teachStrings(it), ...textLines(it.scene)]) {
        expect(t, where).not.toMatch(/\s[.,!?]|undefined|NaN|\[object/);
        expect(t, `${where}: no X or Y standing in for a name`).not.toMatch(/\b[XY]\b/);
      }
      if (name === 'cases-trap-fails') expect(it.feedback?.claim?.headline, where).not.toMatch(/not false/);
    }
    // The examples trap where every card fits: no “rest” to speak of.
    let allFit = 0;
    for (const skin of SKINS) for (let seed = 1; seed <= 200; seed++) {
      const m = P.examplesTrapItem(createRng(seed), { skin });
      const quiet = m.counter!.cards.filter((t) => P.cardRole(m.counter!.claim, t) === 'none').length;
      const said = choose(m).feedback!.false.detail.join(' ');
      if (quiet === 0) allFit++;
      expect(/The rest/.test(said), `examples ${skin} ${seed}: “the rest” only when some card is outside the group`).toBe(quiet > 0);
    }
    expect(allFit, 'some packs show only cards that fit').toBeGreaterThan(0);
  });

  it('the answer is not always in the same place (for the items whose choices are shuffled)', () => {
    for (const [name, make] of MAKERS.filter(([n]) => !n.startsWith('method-') && !['broken', 'left', 'which'].includes(n))) {
      const at = new Set<number>();
      for (let seed = 1; seed <= 80; seed++) {
        const it = choose(make(createRng(seed), SKINS[seed % 3]));
        at.add(it.choices.findIndex((c) => c.id === it.answer));
      }
      const n = choose(make(createRng(1), 'everyday')).choices.length;
      expect(at.size, name).toBeGreaterThanOrEqual(Math.min(3, n - 1));
    }
  });

  it('a hint case never shows the answer’s own case', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const rng = () => createRng(seed);
      const broken = choose(P.brokenStepItem(rng(), { skin: 'race' }));
      if (broken.answer !== 'none') expect(broken.hintCase!.label.startsWith(`Step ${broken.answer.slice(1)}:`)).toBe(false);
      const cite = choose(P.citeItem(rng(), { skin: 'hatch' }));
      expect(cite.hintCase!.label).not.toContain('Uses what?');
      const proves = P.crashProvesItem(rng(), { skin: 'everyday' });
      const c = proves.crash!;
      expect(choose(proves).hintCase!.label).toContain(`${c.nm(c.who)} is a ${c.kind}`);
      const which = choose(P.whichBreaksItem(rng(), { skin: 'fantasy', seq: false }));
      expect(which.hintCase!.label.toLowerCase()).not.toBe(`${labelOf(which, 'break').toLowerCase()}.`);
      const left = P.leftOutItem(rng(), { skin: 'everyday', left: 'holds' });
      const out = P.leftOut(left.cases!)[0];
      expect(choose(left).hintCase!.label).not.toBe(left.cases!.topic.is(left.cases!.who, out));
    }
  });
});

// ---------- the lessons ----------

const L = stop11.lessons;
const lessonById = (id: string) => L.find((l) => l.id === id)!;
/** The skin an item is told in, from its words. */
function skinOf(it: Item): P.ProofSkin {
  const text = [it.prompt, ...textLines(it.scene), JSON.stringify(it.scene ?? '')].join(' ');
  if (/baby dragons|potion|elves|The wizards|tile/.test(text)) return 'fantasy';
  if (/stand in a line|number on the card|are islanders\.|in the deck|number list|Claim: “Every (growing|sequence|number)/.test(text)) return 'abstract';
  return 'everyday';
}

describe('the lessons', () => {
  const pack = (id: string, seed: number) => lessonById(id).practice(createRng(seed)) as ChooseItem[];

  it('Lesson 1: three ways and the examples trap, in at least two skins', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const items = pack(P.LESSONS.method, seed);
      expect(items.length).toBe(4);
      expect(items.every((i) => i.skill === 's11.method')).toBe(true);
      expect(items.filter((i) => i.answer === 'examples').length).toBe(1);
      expect(new Set(items.map((i) => i.answer)).size).toBe(4);
      expect(new Set(items.map(skinOf)).size).toBeGreaterThanOrEqual(2);
      expect(pack(P.LESSONS.method, seed)).toEqual(items);
    }
  });

  it('Lessons 2-5: the planned kinds, the trap in every pack, the why item last, at least two skins', () => {
    const plans: Record<string, RegExp[]> = {
      [P.LESSONS.cite]: [/What does step \d use\?/, /Which step does not follow/, /Every step is true\. Is it a proof\?/, /What does step|Which step does not follow/, /Why is it a proof\?/],
      [P.LESSONS.cases]: [/which cases must the proof check/, /Which case does the proof leave out/, /Is it a proof\?/, /Which case does the proof leave out/, /Why is it a proof\?/],
      [P.LESSONS.crash]: [/What does the crash prove\?/, /whose words break the rule\?/, /nothing crashes\. What does that show\?/, /What does the crash prove\?/, /Why does the crash prove/],
      [P.LESSONS.counter]: [/breaks the claim\?/, /Is the claim proved\?/, /What do they show about the claim\?/, /breaks the claim\?/, /Why does one of them show/],
    };
    const traps: Record<string, string> = { [P.LESSONS.cite]: P.TRAPS.cite.tag, [P.LESSONS.cases]: P.TRAPS.cases.tag, [P.LESSONS.crash]: P.TRAPS.crash.tag, [P.LESSONS.counter]: P.TRAPS.counter.tag };
    for (const [id, plan] of Object.entries(plans)) for (let seed = 1; seed <= SEEDS; seed++) {
      const items = pack(id, seed);
      expect(items.length).toBe(5);
      items.forEach((it, k) => expect(it.prompt, `${id} ${seed} item ${k + 1}`).toMatch(plan[k]));
      expect(items.some((it) => it.tags?.includes(traps[id])), `${id} ${seed} trap`).toBe(true);
      expect(items[4].skill).toBe('s11.why');
      expect(items.slice(0, 4).every((it) => it.skill !== 's11.why')).toBe(true);
      expect(new Set(items.map(skinOf)).size).toBeGreaterThanOrEqual(2);
      expect(pack(id, seed)).toEqual(items);
    }
  });

  it('every pass rule asks for its lesson’s trap', () => {
    const want = [P.TRAPS.method, P.TRAPS.cite, P.TRAPS.cases, P.TRAPS.crash, P.TRAPS.counter];
    L.forEach((l, k) => expect(l.pass).toEqual({ firstTry: 3, include: [want[k]] }));
  });

  it('the glossary: each grown-up word on the lesson whose card names it', () => {
    const want: Record<string, string[]> = {
      [P.LESSONS.method]: ['proof', 'direct proof'],
      [P.LESSONS.cite]: ['axiom', 'definition'],
      [P.LESSONS.cases]: ['proof by cases'],
      [P.LESSONS.crash]: ['contradiction'],
      [P.LESSONS.counter]: ['counterexample'],
    };
    for (const l of L) {
      expect((l.terms ?? []).map((t) => t.term)).toEqual(want[l.id]);
      const cards = l.ideas.flatMap((c) => c.body).join(' ').toLowerCase();
      for (const t of l.terms ?? []) {
        expect(cards, `${l.id}: a card names “${t.term}”`).toContain(t.term);
        expect(t.means.trim().length).toBeGreaterThan(10);
      }
    }
    expect(lessonById(P.LESSONS.crash).terms![0].also).toBe('suppose and crash');
    expect(lessonById(P.LESSONS.method).terms![1].also).toBe('a chain');
  });

  it('the distinctions: taught with a contrast where first named; the contrasts’ truths come from the models', () => {
    expect(lessonById(P.LESSONS.cite).distinctions).toEqual([PB.STEP_TRUE_VS_FOLLOWS]);
    expect(lessonById(P.LESSONS.cases).distinctions).toEqual([PB.RULED_VS_LEFT, { ...PB.STEP_TRUE_VS_FOLLOWS, taughtIn: P.LESSONS.cite }]);
    expect(lessonById(P.LESSONS.crash).distinctions).toEqual([PB.CRASH_VS_HOLDS]);
    expect(lessonById(P.LESSONS.counter).distinctions).toEqual([PB.FITS_VS_BREAKS]);
    // True vs follows: the same true step; once it uses what forces it, once nothing.
    const tf = PB.citeContrast();
    const sh = parseChain(PB.chainWorkedScene().kind === 'text' ? (PB.chainWorkedScene() as { lines: string[] }).lines : []);
    tf.pairs.forEach((p) => expect(p.truth).toBe(forces(sh, parseFact(p.says), parseUses(p.world))));
    expect(tf.pairs.map((p) => p.truth)).toEqual([true, false]);
    // Ruled out vs left out: the same proof; only the first givens rule out the fish.
    const rl = PB.casesContrast();
    expect(rl.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(rl.pairs[0].says).toBe(rl.pairs[1].says);
    // Crash vs holds: the first guess crashes, the second fits.
    const k = PB.WORKED_KNIGHTS;
    const cr = PB.crashContrast();
    expect(cr.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(everyWay(k.ids).filter((w) => w[k.who] === k.kind && fitsRule(k.claims, w)).length).toBe(0);
    expect(everyWay(k.ids).some((w) => w[k.who] !== k.kind && fitsRule(k.claims, w))).toBe(true);
    // Fits vs breaks: the same claim, a card that fits and a card that breaks it.
    const fb = PB.counterContrast();
    fb.pairs.forEach((p) => expect(p.truth).toBe(roleOfCard(p.says, p.things![0]) === 'break'));
    expect(fb.pairs.map((p) => p.truth)).toEqual([false, true]);
  });

  it('every board: each mark worked out again, the right marks pass, and at most 12 taps', () => {
    const boards = L.flatMap((l) => l.drill ?? []);
    expect(boards.map((b) => b.id)).toEqual(['s11.l1-do', 's11.l2-do-true', 's11.l2-do-check', 's11.l2-do-uses', 's11.l3-do-left', 's11.l3-do-twin', 's11.l4-do-guess', 's11.l4-do-follow', 's11.l5-do-role', 's11.l5-do-twin']);
    for (const b of boards) {
      expect(marksToTap(b).length, b.id).toBeLessThanOrEqual(12);
      expect(checkDrill(b, Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer]))).done, b.id).toBe(true);
    }
    const byId = (id: string) => boards.find((b) => b.id === id)!;
    // l1: the way of each short reasoning, read from its words.
    for (const r of byId('s11.l1-do').rows) {
      const way = /Suppose /.test(r.label) ? 'crash' : /Case 1:/.test(r.label) ? 'cases' : /claim is false/.test(r.label) ? 'counter' : /claim is true/.test(r.label) ? 'examples' : 'chain';
      expect(r.marks[0].answer, r.label).toBe(way);
    }
    expect(byId('s11.l1-do').rows.map((r) => r.marks[0].answer).sort()).toEqual([...P.METHODS].sort());
    // l2 board 1: true in the race (the order), and follows (arrows from the uses).
    const w = PB.WORKED_CHAIN;
    const wsh = parseChain(P.chainLines(w));
    for (const r of byId('s11.l2-do-true').rows) {
      const [, stmt, uses] = /^(.+?\.) Uses (.+)$/.exec(r.label)!;
      const f = parseFact(stmt);
      expect(r.marks[0].answer).toBe(w.line.indexOf(f.a) < w.line.indexOf(f.b) ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(forces(wsh, f, parseUses(uses)) ? 'follows' : 'not');
    }
    expect(byId('s11.l2-do-true').rows.map((r) => r.marks.map((m) => m.answer).join('/'))).toEqual(['yes/follows', 'yes/not', 'yes/not', 'no/not']);
    // l2 board 2: the twin's steps, by arrows; the whole proof breaks.
    const twin = parseChain((byId('s11.l2-do-check').scene as { lines: string[] }).lines);
    byId('s11.l2-do-check').rows.slice(0, 3).forEach((r, k) => expect(r.marks[0].answer).toBe(forces(twin, twin.steps[k].stmt, twin.steps[k].uses!) ? 'follows' : 'not'));
    expect(byId('s11.l2-do-check').rows[3].marks[0].answer).toBe(twin.steps.every((s) => forces(twin, s.stmt, s.uses!)) ? 'yes' : 'no');
    // l2 board 3: only the right uses force each step, and the right one is not always the first button.
    const ub = byId('s11.l2-do-uses');
    ub.rows.forEach((r, k) => {
      for (const o of r.marks[0].options) expect(forces(wsh, wsh.steps[k].stmt, parseUses(o.label))).toBe(o.id === r.marks[0].answer);
    });
    expect(new Set(ub.rows.map((r) => r.marks[0].options.findIndex((o) => o.id === 'right'))).size).toBeGreaterThan(1);
    // l3 board 1: left by the givens, checked by the proof, from the picture.
    const lb = byId('s11.l3-do-left');
    const lc = parseCases(lb.scene);
    for (const r of lb.rows.filter((x) => x.id !== 'all')) {
      const o = optOfCase(r.label);
      expect(r.marks[0].answer).toBe(leftOf(lc).includes(o) ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(lc.covered.includes(o) ? 'yes' : 'no');
    }
    expect(lb.rows.find((r) => r.id === 'all')!.marks[0].answer).toBe(missing(lc).length ? 'no' : 'yes');
    expect(missing(lc).length).toBe(1);
    // l3 board 2: can it happen, the claim there, proved?
    const tb = byId('s11.l3-do-twin');
    const ts = tb.scene as Extract<Scene, { kind: 'argument' }>;
    const topts = optsOf(ts.givens[0]);
    const truled = ruledOf(ts.givens.slice(1));
    for (const r of tb.rows.filter((x) => x.id !== 'proved')) {
      const o = optOfCase(r.label);
      expect(r.marks[0].answer).toBe(truled.includes(o) ? 'no' : 'yes');
      if (r.marks[1]) expect(r.marks[1].answer).toBe(claimFor(ts.claim, o, ts.givens) ? 'yes' : 'no');
    }
    expect(tb.rows.find((r) => r.id === 'proved')!.marks[0].answer).toBe(topts.filter((o) => !truled.includes(o)).every((o) => claimFor(ts.claim, o, ts.givens)) ? 'yes' : 'no');
    // l4 board 1: each guess crashes when no way with it fits; a crash proves the opposite.
    const k = PB.WORKED_KNIGHTS;
    for (const r of byId('s11.l4-do-guess').rows) {
      const [, name, kind] = /^Guess: (\w+) is a (knight|knave)\.$/.exec(r.label)!;
      const id = name.toLowerCase();
      const crash = everyWay(k.ids).filter((x) => x[id] === kind && fitsRule(k.claims, x)).length === 0;
      expect(r.marks[0].answer).toBe(crash ? 'yes' : 'no');
      expect(r.marks[1].answer).toBe(crash ? 'opp' : 'nothing');
    }
    // l4 board 2: follow the guess about the other islander.
    const fbd = byId('s11.l4-do-follow');
    const who = k.ids.find((id) => id !== k.who)!;
    const fit = everyWay(k.ids).find((x) => fitsRule(k.claims, x))!;
    const guess = fit[who] === 'knight' ? 'knave' : 'knight';
    const inside = everyWay(k.ids).filter((x) => x[who] === guess && (guess === 'knight') === claimTrue(k.claims[who], x));
    expect(inside.length).toBe(1);
    expect(fbd.rows.map((r) => r.marks[0].answer)).toEqual([guess === 'knight' ? 'true' : 'false', inside[0][k.who], wordBreakers(k.claims, inside[0])[0], fit[who]]);
    // l5 boards: each card's role from the claim, then proved or false.
    for (const id of ['s11.l5-do-role', 's11.l5-do-twin']) {
      const b = byId(id);
      const claim = /“(.+)”/.exec(b.body[0])![1];
      const cardRows = b.rows.filter((r) => r.marks[0].thing);
      for (const r of cardRows) expect(r.marks[0].answer).toBe(roleOfCard(claim, r.marks[0].thing!));
      const roles = cardRows.map((r) => roleOfCard(claim, r.marks[0].thing!));
      const last = b.rows[b.rows.length - 1].marks[0];
      if (id === 's11.l5-do-role') {
        expect(roles).not.toContain('break');
        expect(last.answer).toBe('no');
      } else {
        expect(last.answer).toBe(roles.includes('break') ? 'yes' : 'no');
        expect(roles).toContain('break');
      }
    }
  });

  it('the distinction boards name the mix-ups their wrong marks show', () => {
    const board = (id: string) => L.flatMap((l) => l.drill ?? []).find((b) => b.id === id)!;
    const diag = (b: DrillStep, wrong: Record<string, string>) => checkDrill(b, { ...Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer])), ...wrong }).diagnosis;
    expect(diag(board('s11.l2-do-true'), { 'r2-follows': 'follows' })).toBe('true-as-follows');
    expect(diag(board('s11.l2-do-true'), { 'r1-follows': 'not' })).toBeUndefined();
    const lb = board('s11.l3-do-left');
    expect(diag(lb, { 'n5-left': 'yes' })).toBe('ruled-as-left');
    expect(diag(lb, { all: 'yes' })).toBe('left-as-done');
    const gb = board('s11.l4-do-guess');
    const holds = gb.rows.find((r) => r.marks[1].answer === 'nothing')!;
    const crash = gb.rows.find((r) => r.marks[1].answer === 'opp')!;
    expect(diag(gb, { [`${holds.id}-proves`]: 'itself' })).toBe('holds-as-proof');
    expect(diag(gb, { [`${crash.id}-proves`]: 'itself' })).toBe('crash-as-guess');
    const rb = board('s11.l5-do-role');
    expect(diag(rb, { proved: 'yes' })).toBe('examples-as-proof');
    const none = rb.rows.find((r) => r.marks[0].answer === 'none')!;
    expect(diag(rb, { [none.marks[0].id]: 'break' })).toBe('none-as-break');
    for (const b of [board('s11.l2-do-true'), lb, gb, rb]) {
      expect(b.confused?.length).toBe(1);
      for (const q of b.confused!) expect(q.options.filter((o) => o.right).length).toBe(1);
      for (const m of b.misconceptions!) expect(m.text.startsWith('You may be treating')).toBe(true);
    }
  });

  it('no quiz, check or Arcade item repeats a worked example’s picture', () => {
    const cards = new Set(L.flatMap((l) => l.ideas.flatMap((c) => (c.scene ? [JSON.stringify(c.scene)] : []))));
    for (let seed = 1; seed <= 80; seed++) {
      const items = [...L.flatMap((l) => l.practice(createRng(seed))), ...stop11.check!(createRng(seed)), stop11.practice!(createRng(seed))];
      for (const it of items) expect(cards.has(JSON.stringify(it.scene)), `${it.id} ${seed}`).toBe(false);
    }
  });
});

// ---------- the stop ----------

describe('the stop', () => {
  it('is ready, opens after Circuit Lab and Proof Lantern, and names every skill it asks about', () => {
    expect(stop11).toMatchObject({ n: 11, id: 's11', title: 'Proof', ready: true, requires: ['s10', 's17'] });
    expect(STOPS.find((s) => s.id === 's11')).toBe(stop11);
    expect(Object.keys(stop11.skillNames!).sort()).toEqual(['s11.cases', 's11.cite', 's11.counter', 's11.crash', 's11.method', 's11.why']);
    const skills = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of [...L.flatMap((l) => l.practice(createRng(seed))), ...stop11.check!(createRng(seed)), stop11.practice!(createRng(seed)), stop11.bridge!(createRng(seed))]) skills.add(it.skill);
    }
    for (const s of skills) expect(stop11.skillNames![s], s).toBeTruthy();
  });

  it('the check: one item from Lesson 1, two from each other lesson in order, the why item last; conflict items in it', () => {
    const slots = Array.from({ length: 10 }, () => new Set<string>());
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop11.check!(createRng(seed)) as ChooseItem[];
      expect(items.length).toBe(10);
      expect(items.slice(0, 9).map((i) => i.lesson)).toEqual(['s11.l1', 's11.l2', 's11.l2', 's11.l3', 's11.l3', 's11.l4', 's11.l4', 's11.l5', 's11.l5']);
      const last = items[9];
      expect(last.tags).toEqual(['why']);
      expect(last.skill).toBe('s11.why');
      expect(last.lesson).toBe(P.WHY_LESSON[last.prompt.includes('crash') ? 'crash' : last.prompt.includes('proof by cases') ? 'cases' : last.scene?.kind === 'things' ? 'counter' : 'chain']);
      expect(items.filter((i) => i.conflict).length).toBeGreaterThanOrEqual(3);
      // The trap of Lesson 2 (a true claim with a broken chain) is always there.
      expect(items[2].tags).toEqual([P.TRAPS.cite.tag]);
      expect(items[2].conflict).toBe(true);
      items.forEach((it, k) => slots[k].add(JSON.stringify([it.prompt, it.scene])));
      expect(stop11.check!(createRng(seed))).toEqual(items);
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(30);
  });

  it('Arcade: a valid item from any lesson, the why item now and then', () => {
    const lessons = new Set<string>();
    let whys = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const it = stop11.practice!(createRng(seed)) as ChooseItem;
      lessons.add(it.lesson);
      if (it.skill === 's11.why') whys++;
      expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
    }
    expect([...lessons].sort()).toEqual(L.map((l) => l.id));
    expect(whys).toBeGreaterThan(0);
  });

  it('new examples after a miss: the same skill, never the missed question; a missed trap gets a trap and a question with another answer', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of L) for (const missed of l.practice(createRng(seed)) as ChooseItem[]) {
        const raw = stop11.fresh!(missed, createRng(seed + 500)) as ChooseItem[];
        expect(raw.every((it) => it.skill === missed.skill), `${missed.skill} ${seed}: the stop's own set`).toBe(true);
        const out = freshCheckSet(stop11, missed, seed + 500) as ChooseItem[];
        expect(out.length, `${missed.skill} ${seed}`).toBeGreaterThanOrEqual(1);
        for (const it of out) {
          expect(it.skill).toBe(missed.skill);
          expect(looks(it)).not.toBe(looks(missed));
        }
        if (missed.tags?.some((t) => Object.values(P.TRAPS).some((x) => x.tag === t))) {
          expect(out.length).toBe(2);
          expect(out[0].tags).toEqual(missed.tags);
          expect(out[1].answer === out[0].answer && JSON.stringify(out[1].tags) === JSON.stringify(out[0].tags)).toBe(false);
        }
      }
    }
  });

  it('the warm-up: Proof Lantern’s “proved, a good guess, or false?”, as a plain item of this stop, its verdict worked out again', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const it = stop11.bridge!(createRng(seed)) as ChooseItem;
      expect(it).toMatchObject({ stop: 11, lesson: 's11.l5', skill: 's11.counter', id: 's11-warm' });
      for (const k of ['phase', 'level', 'meta', 'errorTags', 'twin', 'hints', 'frame']) expect(k in it, k).toBe(false);
      const s = it.scene as Extract<Scene, { kind: 'lantern' }>;
      const xs = s.rows![0].cells.map(Number);
      const claim = s.claim!;
      const holds = (x: number) => (/odd/.test(claim) ? x % 2 === 1 : /even/.test(claim) ? x % 2 === 0 : x > Number(/more than (\d+)/.exec(claim)![1]));
      let verdict: string;
      if (!xs.every(holds)) verdict = 'false';
      else if (s.pattern === 'observed') verdict = 'tentative';
      else {
        const [, a, d] = /Start at (\d+) and add (\d+) each time\./.exec(s.stated!)!.map(Number);
        const proved = /more than/.test(claim) ? holds(a) && d >= 0 : d % 2 === 0 && holds(a);
        expect(proved, `${seed}: a stated rule with no break is proved`).toBe(true);
        verdict = 'proved';
      }
      expect(it.answer, `${seed}`).toBe(verdict);
      expect(it.teach).toBeDefined();
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id]).toBeDefined();
      seen.add(JSON.stringify([it.prompt, it.answer]));
      expect(stop11.bridge!(createRng(seed))).toEqual(it);
    }
    expect(seen.size).toBeGreaterThan(150);
  });
});

// ---------- reading level, quotes and symbols ----------

const SYMBOLS = /[=+→←✓✗&<>]|\s[x×]\s/;
const sceneWords = (s?: Scene): string[] => {
  if (!s) return [];
  if (s.kind === 'text') return s.lines;
  if (s.kind === 'argument') return [...s.givens, s.claim, ...(s.cases ?? []).flatMap((c) => [c.name, ...c.facts]), s.caption ?? ''];
  if (s.kind === 'contrast') return [...s.pairs.flatMap((p) => [p.world, p.who, p.says, p.because, p.then ?? '']), s.ask?.q ?? '', s.ask?.a ?? ''];
  if (s.kind === 'speakers') return [...s.speakers.map((x) => x.says), s.rule ?? '', s.test ?? ''];
  return [];
};
const itemWords = (it: Item) => [it.prompt, it.explain, ...teachStrings(it), ...(it.kind === 'choose' ? it.choices.map((c) => c.label) : []), ...sceneWords(it.scene)];
const boardWords = (d: DrillStep) => [
  d.title, ...d.body, d.done, d.twin ?? '',
  ...d.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...m.options.map((o) => o.label), ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
  ...(d.misconceptions ?? []).map((m) => m.text),
  ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
  ...sceneWords(d.scene),
];
const asText = (xs: readonly string[]) => xs.filter(Boolean).map((x) => (/[.!?”]$/.test(x.trim()) ? x : `${x}.`)).join('\n');
function readable(xs: readonly string[], where: string) {
  const text = asText(xs);
  expect(fkGrade(text), `${where} grade`).toBeLessThanOrEqual(READING.maxGrade);
  const long = longestSentence(text);
  expect(long.words, `${where}: “${long.sentence}”`).toBeLessThanOrEqual(READING.maxSentenceWords);
  expect(text, `${where}: curly quotes only`).not.toMatch(/['"]/);
  expect(text, `${where}: no symbols`).not.toMatch(SYMBOLS);
  expect(text, `${where}: “Not yet”, never “Wrong”`).not.toMatch(/\bWrong\b/);
}

describe('reading', () => {
  it('every lesson’s cards, boards and quiz read at grade 7 or lower, with curly quotes and no symbols', () => {
    for (const l of L) {
      readable(l.ideas.flatMap((c) => [c.title, ...c.body, ...sceneWords(c.scene)]), `${l.id} cards`);
      readable((l.drill ?? []).flatMap(boardWords), `${l.id} boards`);
      readable(Array.from({ length: 40 }, (_, s) => l.practice(createRng(s + 1))).flat().flatMap(itemWords), `${l.id} quiz`);
      readable((l.terms ?? []).flatMap((t) => [t.term, t.means, t.also ?? '']), `${l.id} terms`);
    }
  });

  it('the check, the Arcade, new examples and the warm-up read at grade 7 or lower too', () => {
    readable(Array.from({ length: 40 }, (_, s) => stop11.check!(createRng(s + 1))).flat().flatMap(itemWords), 'check');
    readable(Array.from({ length: 80 }, (_, s) => stop11.practice!(createRng(s + 1))).flatMap(itemWords), 'arcade');
    readable(Array.from({ length: 40 }, (_, s) => stop11.bridge!(createRng(s + 1))).flatMap(itemWords), 'warm-up');
    readable(Object.values(stop11.skillNames!), 'skill names');
  });
});
