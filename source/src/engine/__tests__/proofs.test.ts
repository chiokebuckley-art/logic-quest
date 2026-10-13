/**
 * Stop 12 · Proof (id s11). Every answer is worked out again here by a second method, from what the learner sees:
 *  - a chain step follows when a path of “before” facts it uses leads from its first name to its second (and, for the
 *    defined word, when it also uses the definition): arrows followed, never lines listed;
 *  - a proof by cases: the options read from given 1, the ones a given rules out, the boxes the proof checks, and the
 *    claim checked against fact tables written here (or the number itself);
 *  - suppose and crash: every way to make each islander a knight or a knave, checked speaker by speaker;
 *  - a counterexample: the claim read from the prompt, each card's color, shape and size checked against it;
 *  - a named rule (lesson 6): each sentence read back from its words, the step's shape told by comparing its parts
 *    (which given is the IF part, which is NOT the THEN part, and so on), and whether it follows by trying every way to
 *    set its facts, counted in binary;
 *  - a domino proof (lesson 7): the start and the amount added read from the setting, the claim's property read from
 *    its words, every case up to 100 added up here, and the step to the next settled by arithmetic (an even jump keeps
 *    odd and even, any jump keeps “more than”, no jump keeps “fewer than”), never by the engine's search.
 */
import { describe, expect, it } from 'vitest';
import { stop11 } from '../../content/stop11';
import { STOPS } from '../../content/stops';
import { checkDrill, marksToTap } from '../drill';
import { freshCheckSet, looks } from '../fresh';
import { claimTrue } from '../grade';
import * as PB from '../puzzles/proofBoards';
import * as PI from '../puzzles/proofInduction';
import * as PR from '../puzzles/proofRules';
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

// ---------- named rules (lesson 6): read each sentence back, compare its parts, try every way to set its facts ----------

/** Each fact's two forms, from the stories' words (data, not answers): its sentence, and its sentence with NOT. */
const FACT_OF = new Map<string, { key: string; pos: boolean }>();
for (const t of PR.RULE_TOPICS) for (const f of [...t.chain, ...t.or]) {
  FACT_OF.set(f.yes.toLowerCase(), { key: f.yes, pos: true });
  FACT_OF.set(f.no.toLowerCase(), { key: f.yes, pos: false });
}
type Sen = { t: 'lit'; key: string; pos: boolean } | { t: 'if'; a: Sen; b: Sen } | { t: 'or'; a: Sen; b: Sen };
function readSen(text: string): Sen {
  const x = text.trim().replace(/^So /, '').replace(/\.$/, '');
  let m = /^if (.+), then (.+)$/i.exec(x);
  if (m) return { t: 'if', a: readSen(m[1]), b: readSen(m[2]) };
  m = /^either (.+) or (.+)$/i.exec(x);
  if (m) return { t: 'or', a: readSen(m[1]), b: readSen(m[2]) };
  const f = FACT_OF.get(x.toLowerCase());
  if (!f) throw new Error(`not a fact: ${x}`);
  return { t: 'lit', ...f };
}
/** A step's line, split into its givens and its claim (the sentence after “So”). */
function readStep(line: string): { givens: Sen[]; claim: Sen } {
  const parts = line.split(/(?<=\.)\s+/);
  return { givens: parts.slice(0, -1).map(readSen), claim: readSen(parts[parts.length - 1]) };
}
const factKeys = (x: Sen): string[] => (x.t === 'lit' ? [x.key] : [...factKeys(x.a), ...factKeys(x.b)]);
const keysOf = (ss: Sen[]): string[] => [...new Set(ss.flatMap(factKeys))];
function truth(x: Sen, v: Record<string, boolean>): boolean {
  if (x.t === 'lit') return v[x.key] === x.pos;
  if (x.t === 'if') return !truth(x.a, v) || truth(x.b, v);
  return truth(x.a, v) || truth(x.b, v);
}
/** Does the claim follow: every way to set the facts (counted in binary) that makes the givens true makes it true? */
function forced(givens: Sen[], claim: Sen): boolean {
  const ks = keysOf([...givens, claim]);
  for (let m = 0; m < 1 << ks.length; m++) {
    const v = Object.fromEntries(ks.map((k, i) => [k, !!((m >> i) & 1)]));
    if (givens.every((g) => truth(g, v)) && !truth(claim, v)) return false;
  }
  return true;
}
const sameSen = (x: Sen, y: Sen) => JSON.stringify(x) === JSON.stringify(y);
const notSen = (x: Sen): Sen => {
  if (x.t !== 'lit') throw new Error('NOT goes on a fact');
  return { ...x, pos: !x.pos };
};
/** The move a step makes, told by comparing its parts. */
function shapeOf(givens: Sen[], claim: Sen): string | null {
  if (givens.length === 1) {
    const g = givens[0];
    return g.t === 'if' && claim.t === 'if' && sameSen(g.a, notSen(claim.b)) && sameSen(g.b, notSen(claim.a)) ? 'contra' : null;
  }
  const either = givens.find((g) => g.t === 'or');
  if (either?.t === 'or') {
    const fact = givens.find((g) => g !== either)!;
    return (sameSen(fact, notSen(either.a)) && sameSen(claim, either.b)) || (sameSen(fact, notSen(either.b)) && sameSen(claim, either.a)) ? 'ds' : null;
  }
  if (givens.every((g) => g.t === 'if')) {
    const [p, q] = givens as Extract<Sen, { t: 'if' }>[];
    return claim.t === 'if' && sameSen(p.b, q.a) && sameSen(claim.a, p.a) && sameSen(claim.b, q.b) ? 'chain' : null;
  }
  const rule = givens.find((g) => g.t === 'if') as Extract<Sen, { t: 'if' }> | undefined;
  const other = givens.find((g) => g !== rule);
  if (!rule || !other) return null;
  if (sameSen(other, rule.a) && sameSen(claim, rule.b)) return 'mp';
  if (sameSen(other, notSen(rule.b)) && sameSen(claim, notSen(rule.a))) return 'mt';
  if (sameSen(other, rule.b) && sameSen(claim, rule.a)) return 'ac';
  if (sameSen(other, notSen(rule.a)) && sameSen(claim, notSen(rule.b))) return 'da';
  return null;
}
const NAMED = ['mp', 'mt', 'ds', 'chain', 'contra'];

// ---------- domino proofs (lesson 7): read the setting and the claim, add up the cases, settle the step by arithmetic ----------

/** The count of case 1 and the amount each case adds, read from the setting. */
function readSetting(text: string): { a: number; d: number } {
  let m = /start at (\d+) and add (\d+) each time/.exec(text);
  if (m) return { a: Number(m[1]), d: Number(m[2]) };
  m = /Step 1 has (\d+) tiles/.exec(text);
  if (m) return { a: Number(m[1]), d: /adds one pair/.test(text) ? 2 : Number(/adds one group of (\d+)/.exec(text)![1]) };
  m = /has (\d+) \w+ (?:in|on) \w+ 1\. Each .*?(?:adds|finds|has) (\d+)/.exec(text);
  if (!m) throw new Error(`no setting: ${text}`);
  return { a: Number(m[1]), d: Number(m[2]) };
}
interface Prop7 {
  holds: (x: number) => boolean;
  /** Does adding d keep the claim? By arithmetic: an even jump keeps odd and even; any jump keeps “more than”; none keeps “fewer than”. */
  keeps: (d: number) => boolean;
}
function readClaim(claim: string): Prop7 {
  if (/odd/.test(claim)) return { holds: (x) => x % 2 === 1, keeps: (d) => d % 2 === 0 };
  if (/even/.test(claim)) return { holds: (x) => x % 2 === 0, keeps: (d) => d % 2 === 0 };
  let m = /more than (\d+)/.exec(claim);
  if (m) { const k = Number(m[1]); return { holds: (x) => x > k, keeps: (d) => d >= 0 }; }
  m = /(?:fewer|less) than (\d+)/.exec(claim);
  if (m) { const k = Number(m[1]); return { holds: (x) => x < k, keeps: () => false }; }
  throw new Error(`no claim: ${claim}`);
}
/** The first 100 cases, added up one at a time. */
const casesOf = (a: number, d: number) => { const out = [a]; while (out.length < 100) out.push(out[out.length - 1] + d); return out; };
const claimIn = (it: Item) => /Claim: “(.+?)”/.exec(it.prompt)?.[1] ?? textLines(it.scene).find((l) => l.startsWith('Claim: '))!.replace(/^Claim: /, '');
const partsOf = (lines: readonly string[]) => ({
  first: lines.some((l) => l.startsWith('First case:')),
  step: lines.some((l) => l.startsWith('Step to the next: if')),
  checks: lines.some((l) => /were checked/.test(l)),
});

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

describe('Lesson 6 · rules with names', () => {
  it('the number story: every case the givens leave can happen for a real number, so a look-alike’s breaking case is real', () => {
    const t = PR.ruleTopic('number');
    // What each fact says of a number (data, written here). A fact with no test, like “circled”, can go either way.
    const test: Record<string, (n: number) => boolean> = {
      'the number is 8': (n) => n === 8,
      'the number is even': (n) => n % 2 === 0,
      'the number is more than 5': (n) => n > 5,
      'the number splits into two equal groups': (n) => n % 2 === 0,
    };
    const free = new Set(['the number is circled']);
    for (const f of [...t.chain, ...t.or]) expect(f.yes in test || free.has(f.yes), f.yes).toBe(true);
    for (const move of PR.MOVES) for (const link of [0, 1] as const) for (const deny of [0, 1] as const) {
      const st = PR.makeStep(t, move, { link, deny });
      for (const w of PR.worldsOf(st).filter((x) => PR.givensHold(st, x))) {
        const can = Array.from({ length: 20 }, (_, i) => i + 1).some((n) => st.words.every((f, i) => !test[f.yes] || test[f.yes](n) === w[i]));
        expect(can, `${move} ${link} ${deny}: ${PR.worldText(st, w)}`).toBe(true);
      }
    }
  });

  it('every move in every story: its shape (told by comparing parts) is the move, and only the five named rules follow (every way listed)', () => {
    for (const t of PR.RULE_TOPICS) for (const move of PR.MOVES) for (const link of [0, 1] as const) for (const deny of [0, 1] as const) {
      const st = PR.makeStep(t, move, { link, deny });
      const { givens, claim } = readStep(PR.stepLine(st));
      expect(shapeOf(givens, claim), `${t.id} ${move}`).toBe(move);
      expect(forced(givens, claim), `${t.id} ${move}`).toBe(NAMED.includes(move));
    }
  });

  it('which rule: the shape the step makes, or no rule when a case breaks it; a look-alike is tagged and offers the rule it looks like', () => {
    for (const skin of SKINS) for (const move of PR.MOVES) for (let seed = 1; seed <= 40; seed++) {
      const it = choose(PR.ruleNameItem(createRng(seed), { skin, move }));
      const sc = it.scene as Extract<Scene, { kind: 'argument' }>;
      const givens = sc.givens.map(readSen);
      const claim = readSen(sc.claim);
      const shape = shapeOf(givens, claim)!;
      const ok = forced(givens, claim);
      expect(it.answer, `${skin} ${move} ${seed}`).toBe(ok ? shape : 'none');
      expect(ok).toBe(NAMED.includes(shape));
      expect(labelOf(it, it.answer)).toBe(ok ? PR.MOVE_LABEL[shape as PR.MoveId] : PR.NO_RULE_LABEL);
      if (!ok) {
        expect(it.tags).toEqual([P.TRAPS.rules.tag]);
        expect(it.conflict).toBe(true);
        expect(it.choices.map((c) => c.id)).toContain(shape === 'ac' ? 'mp' : 'mt');
      } else expect(it.tags).toBeUndefined();
    }
  });

  it('what may you claim: the one choice every way forces, or nothing for sure when the givens allow both; nothing is a look-alike’s givens', () => {
    for (const skin of SKINS) for (const move of PR.MOVES) for (let seed = 1; seed <= 40; seed++) {
      const it = choose(PR.ruleConcludeItem(createRng(seed), { skin, move }));
      const givens = textLines(it.scene).map((l) => readSen(l.replace(/^Given \d: /, '')));
      const claims = it.choices.filter((c) => c.label !== PR.NOTHING_LABEL);
      const ok = claims.filter((c) => forced(givens, readSen(c.label)));
      expect(ok.length, `${skin} ${move} ${seed}`).toBeLessThanOrEqual(1);
      expect(it.answer).toBe(ok[0]?.id ?? 'nothing');
      expect(it.answer === 'nothing').toBe(!NAMED.includes(move));
      if (it.answer === 'nothing') {
        // A look-alike is what claiming one of the offered choices would be.
        expect(claims.some((c) => ['ac', 'da'].includes(shapeOf(givens, readSen(c.label)) ?? ''))).toBe(true);
        expect(it.tags).toEqual([P.TRAPS.rules.tag]);
      } else expect(NAMED).toContain(shapeOf(givens, readSen(labelOf(it, it.answer))));
    }
  });

  it('the trap (and a conflict item): of four steps, exactly one is broken by a case, and it is a look-alike; the other three are named rules', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(PR.ruleTrapItem(createRng(seed), { skin }));
      const steps = textLines(it.scene).map((l) => readStep(l.replace(/^Step \d: /, '')));
      expect(steps.length).toBe(4);
      const bad = steps.map((x, k) => (forced(x.givens, x.claim) ? -1 : k)).filter((k) => k >= 0);
      expect(bad.length, `${skin} ${seed}`).toBe(1);
      expect(it.answer).toBe(`s${bad[0] + 1}`);
      steps.forEach((x, k) => expect(k === bad[0] ? ['ac', 'da'] : NAMED).toContain(shapeOf(x.givens, x.claim)));
      expect(new Set(steps.map((x) => shapeOf(x.givens, x.claim))).size).toBe(4);
      expect(it.tags).toEqual([P.TRAPS.rules.tag]);
      expect(it.conflict).toBe(true);
    }
  });

  it('why a proof may use a rule: the step follows, the prompt names its rule, and the right reason is every case', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= 80; seed++) {
      const it = choose(PR.ruleWhyItem(createRng(seed), { skin }));
      const sc = it.scene as Extract<Scene, { kind: 'argument' }>;
      const givens = sc.givens.map(readSen);
      const claim = readSen(sc.claim);
      expect(forced(givens, claim)).toBe(true);
      expect(it.prompt).toContain(`“${PR.MOVE_LABEL[shapeOf(givens, claim) as PR.MoveId]}.”`);
      expect(labelOf(it, it.answer)).toBe('Because in every case where the givens are true, the claim is true too.');
      expect(it.tags).toEqual(['why']);
    }
  });
});

describe('Lesson 7 · dominoes', () => {
  it('two parts: the right pair is the first case and the step to the next, and the claim holds for every case up to 100', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const it = choose(PI.twoPartsItem(createRng(seed), { skin }));
      const { a, d } = readSetting(it.prompt);
      const pr = readClaim(claimIn(it));
      const cases = casesOf(a, d);
      expect(cases.every(pr.holds), `${skin} ${seed}`).toBe(true);
      expect(pr.keeps(d)).toBe(true);
      const lines = textLines(it.scene).map((l) => l.replace(/^Line \d: /, ''));
      const stepAt = lines.findIndex((l) => l.startsWith('If '));
      const checksAt = lines.findIndex((l) => /were checked/.test(l));
      const numbered = lines.map((l, i) => (i === stepAt || i === checksAt ? null : /(?:step|term|week|day|floor) (\d+)/i.exec(l)));
      const firstAt = numbered.findIndex((m) => m && m[1] === '1');
      const farAt = numbered.findIndex((m, i) => m && i !== firstAt);
      expect([stepAt, checksAt, firstAt, farAt].sort()).toEqual([0, 1, 2, 3]);
      // Each case line shows the count the cases added up here give.
      const far = Number(numbered[farAt]![1]);
      expect(lines[firstAt]).toContain(` ${cases[0]} `);
      expect(lines[farAt]).toContain(` ${cases[far - 1]} `);
      const [i, j] = [firstAt + 1, stepAt + 1].sort((x, y) => x - y);
      expect(labelOf(it, it.answer)).toBe(`Lines ${i} and ${j}`);
    }
  });

  it('which part is missing: the part the lines never show; the part shown is true', () => {
    for (const skin of SKINS) for (const shape of ['nofirst', 'nostep'] as const) for (let seed = 1; seed <= 80; seed++) {
      const it = choose(PI.missingPartItem(createRng(seed), { skin, shape }));
      const { a, d } = readSetting(it.prompt);
      const pr = readClaim(claimIn(it));
      const parts = partsOf(textLines(it.scene));
      expect(parts.first !== parts.step, `${skin} ${shape} ${seed}`).toBe(true);
      expect(parts.checks).toBe(false);
      expect(it.answer).toBe(parts.first ? 'step' : 'first');
      if (parts.first) expect(pr.holds(a)).toBe(true);
      else expect(pr.keeps(d)).toBe(true);
    }
  });

  it('does it prove every case: only with both parts; checked cases are never the step, and sometimes the claim breaks soon after them', () => {
    let breaksLater = 0;
    let holdsAll = 0;
    for (const skin of SKINS) for (const shape of ['both', 'nofirst', 'nostep', 'checks'] as const) for (let seed = 1; seed <= 80; seed++) {
      const it = choose(PI.provesEveryItem(createRng(seed), { skin, shape }));
      const { a, d } = readSetting(it.prompt);
      const pr = readClaim(claimIn(it));
      const cases = casesOf(a, d);
      const parts = partsOf(textLines(it.scene));
      expect(it.answer, `${skin} ${shape} ${seed}`).toBe(parts.first && parts.step ? 'yes' : !parts.first ? 'nofirst' : 'nostep');
      if (it.answer === 'yes') expect(cases.every(pr.holds) && pr.keeps(d)).toBe(true);
      if (parts.first) expect(pr.holds(a)).toBe(true);
      if (parts.step) expect(pr.keeps(d)).toBe(true);
      expect(parts.checks).toBe(shape === 'checks');
      if (shape === 'checks') {
        expect(cases.slice(0, 5).every(pr.holds)).toBe(true);
        if (cases.every(pr.holds)) holdsAll++;
        else breaksLater++;
        expect(it.tags).toEqual([P.TRAPS.induction.tag]);
        expect(it.conflict).toBe(true);
        expect(labelOf(it, 'checked')).toBe('Yes. Every case it checked fits the claim.');
      } else expect(it.tags).toBeUndefined();
    }
    expect(breaksLater, 'some checked claims break after the checking stops').toBeGreaterThan(0);
    expect(holdsAll, 'and some hold, but are still not proved').toBeGreaterThan(0);
  });

  it('why the two parts prove every case: the claim really holds for every case, and the right reason names both parts', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= 80; seed++) {
      const it = choose(PI.inductionWhyItem(createRng(seed), { skin }));
      const { a, d } = readSetting(it.prompt);
      const pr = readClaim(claimIn(it));
      expect(casesOf(a, d).every(pr.holds) && pr.keeps(d)).toBe(true);
      expect(partsOf(textLines(it.scene))).toEqual({ first: true, step: true, checks: false });
      expect(labelOf(it, it.answer)).toBe('Because the first case holds, and each case passes the claim to the next.');
      expect(it.tags).toEqual(['why']);
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
    ...PR.MOVES.map((move) => [`rule-name-${move}`, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => PR.ruleNameItem(rng, { skin, move })] as [string, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.ProofMade]),
    ...PR.MOVES.map((move) => [`rule-conclude-${move}`, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => PR.ruleConcludeItem(rng, { skin, move })] as [string, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.ProofMade]),
    ['rule-trap', (rng, skin) => PR.ruleTrapItem(rng, { skin })],
    ['why-rules', (rng, skin) => PR.ruleWhyItem(rng, { skin })],
    ['two-parts', (rng, skin) => PI.twoPartsItem(rng, { skin })],
    ['missing', (rng, skin) => PI.missingPartItem(rng, { skin })],
    ...(['both', 'nofirst', 'nostep', 'checks'] as const).map((shape) => [`proves-${shape}`, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => PI.provesEveryItem(rng, { skin, shape })] as [string, (rng: ReturnType<typeof createRng>, skin: P.ProofSkin) => P.ProofMade]),
    ['why-induction', (rng, skin) => PI.inductionWhyItem(rng, { skin })],
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
    // Choices in a fixed order (the ways, the rules, the parts) keep their places: their answers move with the model.
    for (const [name, make] of MAKERS.filter(([n]) => !n.startsWith('method-') && !n.startsWith('rule-name-') && !n.startsWith('proves-') && !['broken', 'left', 'which'].includes(n))) {
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
      // Lesson 6: the hint is another rule's example, never the answer's; a trap's hint is a step that follows.
      const named = choose(PR.ruleNameItem(rng(), { skin: 'fantasy' }));
      if (named.answer !== 'none') expect(named.hintCase!.label).not.toBe(PR.RULE_CASES[named.answer as PR.MoveId].label);
      const trap = choose(PR.ruleTrapItem(rng(), { skin: 'abstract' }));
      const hinted = readStep(trap.hintCase!.label);
      expect(forced(hinted.givens, hinted.claim)).toBe(true);
      // Lesson 7: the hint is one case, checked; never the parts themselves.
      const parts = choose(PI.twoPartsItem(rng(), { skin: 'everyday' }));
      expect(parts.hintCase!.label).not.toMatch(/First case|Step to the next/);
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

/** The skin of a lesson 6 or 7 item: the story its sentences come from, or its setting. */
function newSkinOf(it: Item): P.ProofSkin {
  const text = [it.prompt, ...textLines(it.scene), JSON.stringify(it.scene ?? '')].join(' ').toLowerCase();
  if (/coin jar|block tower/.test(text)) return 'everyday';
  if (/a dragon has|wizard’s tower/.test(text)) return 'fantasy';
  if (/staircase of tiles|number list/.test(text)) return 'abstract';
  const topic = PR.RULE_TOPICS.find((t) => [...t.chain, ...t.or].some((f) => text.includes(f.yes.toLowerCase()) || text.includes(f.no.toLowerCase())));
  if (!topic) throw new Error(`no skin: ${text}`);
  return topic.skin;
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

  it('Lessons 6 and 7: the planned kinds, the trap in every pack, the why item last, at least two skins', () => {
    const plans: Record<string, RegExp[]> = {
      [P.LESSONS.rules]: [/Which rule does it use\?/, /What may you claim for sure\?/, /Which step uses no rule\?/, /Which rule does it use\?|What may you claim for sure\?/, /Why may a proof use it\?/],
      [P.LESSONS.induction]: [/Which two prove the claim/, /Which part is missing\?/, /Does this argument prove the claim/, /Does this argument prove the claim/, /Why does it prove the claim/],
    };
    const traps: Record<string, string> = { [P.LESSONS.rules]: P.TRAPS.rules.tag, [P.LESSONS.induction]: P.TRAPS.induction.tag };
    for (const [id, plan] of Object.entries(plans)) for (let seed = 1; seed <= SEEDS; seed++) {
      const items = pack(id, seed);
      expect(items.length).toBe(5);
      items.forEach((it, k) => expect(it.prompt, `${id} ${seed} item ${k + 1}`).toMatch(plan[k]));
      expect(items[2].tags, `${id} ${seed} trap`).toEqual([traps[id]]);
      expect(items[4].skill).toBe('s11.why');
      expect(items.slice(0, 4).every((it) => it.skill === (id === P.LESSONS.rules ? 's11.rules' : 's11.induction'))).toBe(true);
      expect(new Set(items.map(newSkinOf)).size).toBeGreaterThanOrEqual(2);
      expect(pack(id, seed)).toEqual(items);
    }
  });

  it('Lesson 4: the liar card crashes both ways and is no statement; it is a card only, with no quiz item', () => {
    const l4 = lessonById(P.LESSONS.crash);
    const card = l4.ideas.find((c) => c.body.join(' ').includes('“This sentence is false.”'))!;
    expect(card).toBeDefined();
    expect(l4.ideas[l4.ideas.length - 1]).toBe(card);
    const text = card.body.join(' ');
    for (const s of ['Suppose it is true.', 'Suppose it is false.', 'Both guesses crash.', 'it is not a statement']) expect(text).toContain(s);
    expect(card.scene).toBeUndefined();
    for (let seed = 1; seed <= 40; seed++) for (const it of l4.practice(createRng(seed))) expect(it.prompt).not.toContain('This sentence is false');
    // The two guesses, worked out here: the sentence says it is false, so a guess holds up only if its truth equals
    // the opposite of itself. Neither true nor false does, so both crash.
    const holdsUp = (guess: boolean) => guess === !guess;
    expect([true, false].filter(holdsUp)).toEqual([]);
  });

  it('Lesson 7, card 5: the number lists that show each missing part, added up here', () => {
    const card = lessonById(P.LESSONS.induction).ideas.find((c) => c.title === 'Both parts are needed')!;
    const [noFirst, noStep] = card.body.filter((b) => /Start at/.test(b)).map((b) => /Start at (\d+) and add (\d+)/.exec(b)!.slice(1).map(Number));
    const odd = readClaim('odd');
    expect(casesOf(noFirst[0], noFirst[1]).some(odd.holds), 'no first case: no term is odd').toBe(false);
    expect(odd.keeps(noFirst[1])).toBe(true);
    const cs = casesOf(noStep[0], noStep[1]);
    expect(odd.holds(cs[0]) && !odd.holds(cs[1])).toBe(true);
    expect(card.body.join(' ')).toContain(`term 2 is ${cs[1]}`);
  });

  it('every pass rule asks for its lesson’s trap', () => {
    const want = [P.TRAPS.method, P.TRAPS.cite, P.TRAPS.cases, P.TRAPS.crash, P.TRAPS.counter, P.TRAPS.rules, P.TRAPS.induction];
    L.forEach((l, k) => expect(l.pass).toEqual({ firstTry: 3, include: [want[k]] }));
  });

  it('the glossary: each grown-up word on the lesson whose card names it', () => {
    const want: Record<string, string[]> = {
      [P.LESSONS.method]: ['proof', 'direct proof'],
      [P.LESSONS.cite]: ['axiom', 'definition'],
      [P.LESSONS.cases]: ['proof by cases'],
      [P.LESSONS.crash]: ['contradiction'],
      [P.LESSONS.counter]: ['counterexample'],
      [P.LESSONS.rules]: ['modus ponens', 'modus tollens', 'disjunctive syllogism', 'chain rule', 'proof by contrapositive'],
      [P.LESSONS.induction]: ['induction', 'base case', 'step'],
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
    expect(lessonById(P.LESSONS.rules).terms!.map((t) => t.also)).toEqual(['the IF part happened', 'the THEN part did not happen', 'one or the other', 'hypothetical syllogism', 'proof by Flip and NOT']);
    expect(lessonById(P.LESSONS.induction).terms!.map((t) => t.also)).toEqual(['the domino proof', 'the first domino', 'the step to the next']);
  });

  it('the distinctions: taught with a contrast where first named; the contrasts’ truths come from the models', () => {
    expect(lessonById(P.LESSONS.cite).distinctions).toEqual([PB.STEP_TRUE_VS_FOLLOWS]);
    expect(lessonById(P.LESSONS.cases).distinctions).toEqual([PB.RULED_VS_LEFT, { ...PB.STEP_TRUE_VS_FOLLOWS, taughtIn: P.LESSONS.cite }]);
    expect(lessonById(P.LESSONS.crash).distinctions).toEqual([PB.CRASH_VS_HOLDS]);
    expect(lessonById(P.LESSONS.counter).distinctions).toEqual([PB.FITS_VS_BREAKS]);
    expect(lessonById(P.LESSONS.rules).distinctions).toEqual([PR.RULE_VS_LOOKALIKE]);
    expect(lessonById(P.LESSONS.induction).distinctions).toEqual([PI.CHECKS_VS_STEP]);
    // A rule vs a look-alike: the same rule; the first step follows (every way listed), the second does not.
    const rl2 = PR.rulesContrast();
    rl2.pairs.forEach((p) => expect(p.truth).toBe(forced(readStep(`${p.world} ${p.says}`).givens, readStep(`${p.world} ${p.says}`).claim)));
    expect(rl2.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(rl2.pairs[0].world.split('. ')[0]).toBe(rl2.pairs[1].world.split('. ')[0]);
    // Checked cases vs the step: the same first case; only the step to the next proves every step.
    const cs = PI.inductionContrast();
    cs.pairs.forEach((p) => expect(p.truth).toBe(p.says.startsWith('Step to the next: if')));
    expect(cs.pairs.map((p) => p.truth)).toEqual([true, false]);
    expect(cs.pairs[0].world).toBe(cs.pairs[1].world);
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
    expect(boards.map((b) => b.id)).toEqual([
      's11.l1-do', 's11.l2-do-true', 's11.l2-do-check', 's11.l2-do-uses', 's11.l3-do-left', 's11.l3-do-twin', 's11.l4-do-guess', 's11.l4-do-follow', 's11.l5-do-role', 's11.l5-do-twin',
      's11.l6-do-look', 's11.l6-do-cases', 's11.l6-do-name', 's11.l7-do-parts', 's11.l7-do-twin',
    ]);
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
    // l6 board 1: a case that breaks each step (every way listed), and so a rule or not.
    for (const r of byId('s11.l6-do-look').rows) {
      const st = readStep(r.label);
      const ok = forced(st.givens, st.claim);
      expect(r.marks.map((m) => m.answer)).toEqual([ok ? 'no' : 'yes', ok ? 'rule' : 'none']);
    }
    expect(byId('s11.l6-do-look').rows.map((r) => r.marks[1].answer)).toEqual(['rule', 'none', 'rule', 'none']);
    // l6 board 2: each case from its facts in the picture; ruled out, the claim there, follows, and the move.
    const cb = byId('s11.l6-do-cases');
    const csc = cb.scene as Extract<Scene, { kind: 'argument' }>;
    const cg = csc.givens.map(readSen);
    const cc = readSen(csc.claim);
    csc.cases!.forEach((box, k) => {
      const v = Object.fromEntries(box.facts.map((f) => readSen(f)).map((x) => [(x as { key: string }).key, (x as { pos: boolean }).pos]));
      const out = !cg.every((g) => truth(g, v));
      const r = cb.rows[k];
      expect(r.marks[0].answer).toBe(out ? 'yes' : 'no');
      if (!out) expect(r.marks[1].answer).toBe(truth(cc, v) ? 'yes' : 'no');
      else expect(r.marks.length).toBe(1);
    });
    expect(cb.rows.find((r) => r.id === 'follows')!.marks[0].answer).toBe(forced(cg, cc) ? 'yes' : 'no');
    expect(cb.rows.find((r) => r.id === 'name')!.marks[0].answer).toBe(shapeOf(cg, cc));
    // l6 board 3: the rule each step's parts make.
    for (const r of byId('s11.l6-do-name').rows) {
      const st = readStep(r.label.replace(/^Step \d: /, ''));
      expect(r.marks[0].answer).toBe(shapeOf(st.givens, st.claim));
      expect(forced(st.givens, st.claim)).toBe(true);
    }
    expect(byId('s11.l6-do-name').rows.map((r) => r.marks[0].answer).sort()).toEqual([...NAMED].sort());
    // l7 board 1: the parts each try shows; it proves every week only with both.
    for (const r of byId('s11.l7-do-parts').rows) {
      const lines = r.label.replace(/^Try \d: /, '').split(/(?<=\.) (?=First case:|Step to the next:|So )/);
      const parts = partsOf(lines);
      expect(r.marks.map((m) => m.answer)).toEqual([parts.first ? 'yes' : 'no', parts.step ? 'yes' : 'no', parts.first && parts.step ? 'yes' : 'no']);
    }
    // l7 board 2: the first case counted from the drawn tiles; the step settled by arithmetic.
    const tw = byId('s11.l7-do-twin');
    const tsc = tw.scene as Extract<Scene, { kind: 'staircase' }>;
    const tiles = tsc.rows[0].cells.length;
    const jump = tsc.rows[1].cells.length - tiles;
    expect(tsc.rows[2].cells.length - tsc.rows[1].cells.length).toBe(jump);
    expect(tw.rows.map((r) => r.marks[0].answer)).toEqual([String(tiles), tiles % 2 === 1 ? 'yes' : 'no', jump % 2 === 0 ? 'odd' : 'even', tiles % 2 === 1 && jump % 2 === 0 ? 'yes' : 'no']);
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
    const look = board('s11.l6-do-look');
    const lookalike = look.rows.find((r) => r.marks[1].answer === 'none')!;
    expect(diag(look, { [`${lookalike.id}-rule`]: 'rule' })).toBe('sounds-as-rule');
    const pb = board('s11.l7-do-parts');
    expect(diag(pb, { 't1-step': 'yes' })).toBe('checks-as-step');
    expect(diag(pb, { 't2-proves': 'yes' })).toBe('step-as-proof');
    for (const b of [board('s11.l2-do-true'), lb, gb, rb, look, pb]) {
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
    expect(Object.keys(stop11.skillNames!).sort()).toEqual(['s11.cases', 's11.cite', 's11.counter', 's11.crash', 's11.induction', 's11.method', 's11.rules', 's11.why']);
    const skills = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      for (const it of [...L.flatMap((l) => l.practice(createRng(seed))), ...stop11.check!(createRng(seed)), stop11.practice!(createRng(seed)), stop11.bridge!(createRng(seed))]) skills.add(it.skill);
    }
    for (const s of skills) expect(stop11.skillNames![s], s).toBeTruthy();
  });

  it('the check: one item from each of Lessons 1-5, two from Lesson 6, two from Lesson 7, the why item last; the three traps always there', () => {
    const slots = Array.from({ length: 10 }, () => new Set<string>());
    const families = new Set<string>();
    const familyOf = (it: ChooseItem) =>
      it.prompt.includes('crash') ? 'crash'
      : it.prompt.includes('proof by cases') ? 'cases'
      : it.prompt.includes('Why may a proof use it') ? 'rules'
      : it.prompt.includes('domino proof') ? 'induction'
      : it.scene?.kind === 'things' ? 'counter'
      : 'chain';
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop11.check!(createRng(seed)) as ChooseItem[];
      expect(items.length).toBe(10);
      expect(items.slice(0, 9).map((i) => i.lesson)).toEqual(['s11.l1', 's11.l2', 's11.l3', 's11.l4', 's11.l5', 's11.l6', 's11.l6', 's11.l7', 's11.l7']);
      const last = items[9];
      expect(last.tags).toEqual(['why']);
      expect(last.skill).toBe('s11.why');
      const family = familyOf(last) as P.WhyAny;
      families.add(family);
      expect(last.lesson).toBe(P.WHY_LESSON[family]);
      expect(items.filter((i) => i.conflict).length).toBeGreaterThanOrEqual(3);
      // The traps of Lessons 2, 6 and 7 are always there, each a conflict item.
      for (const [k, tag] of [[1, P.TRAPS.cite.tag], [6, P.TRAPS.rules.tag], [8, P.TRAPS.induction.tag]] as const) {
        expect(items[k].tags).toEqual([tag]);
        expect(items[k].conflict).toBe(true);
      }
      expect(items[5].skill).toBe('s11.rules');
      expect(items[7].skill).toBe('s11.induction');
      items.forEach((it, k) => slots[k].add(JSON.stringify([it.prompt, it.scene])));
      expect(stop11.check!(createRng(seed))).toEqual(items);
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(30);
    expect([...families].sort()).toEqual([...P.WHY_FAMILIES].sort());
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

  it('new examples after a miss in Lessons 6 and 7: two questions with two different answers, so one answer never passes the set', () => {
    for (let seed = 1; seed <= 60; seed++) for (const id of [P.LESSONS.rules, P.LESSONS.induction]) {
      for (const missed of (lessonById(id).practice(createRng(seed)) as ChooseItem[]).filter((it) => it.skill !== 's11.why')) {
        const raw = stop11.fresh!(missed, createRng(seed + 700)) as ChooseItem[];
        expect(raw.length, `${missed.skill} ${seed}`).toBe(2);
        expect(raw[0].answer === raw[1].answer, `${missed.skill} ${seed}: ${missed.prompt}`).toBe(false);
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
