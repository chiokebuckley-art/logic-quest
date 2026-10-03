/**
 * Stop 6 if–then engine and the stop 6 content. The logic is checked against a separate brute force over
 * the four cases (p, q), and every item is re-solved from the words the player sees: the facts in the prompt,
 * the choice labels and the card faces are read back into cases, and the answer is worked out again here.
 *
 * The block "wrong answers teach first" checks the teaching after a miss the same way: every worked case and every
 * counterexample is read back from its label, and each true/false on it is worked out again by the brute force.
 */
import { describe, expect, it } from 'vitest';
import {
  L1_DRILL,
  L1_SEE,
  L1_TWIN,
  L2_BACK,
  L2_BOXES,
  L2_FWD,
  L3_HAPPENED,
  L3_NOT,
  L4_SAME,
  L4_TRAPS,
  L5_CARDS,
  L5_LETTERS,
  PETS_KEPT,
  stop6,
} from '../../content/stop6';
import { checkDrill, marksToTap } from '../drill';
import {
  CARD_SKINS,
  CONTRA,
  CONVERSE,
  INVERSE,
  L1_SKINS,
  LITS,
  MOVES,
  MOVE_FACT,
  NOTHING,
  ODD_REWRITES,
  ROWS,
  RULE,
  SKINS,
  SKIN_IDS,
  breakingBack,
  cardItem,
  checkerItem,
  condHolds,
  condText,
  didBreakItem,
  follows,
  meaningGrid,
  moveItem,
  mustTurn,
  rowKey,
  ruleGrid,
  ruleScene,
  ruleText,
  sameMeaning,
  sameYesNoItem,
  samePickItem,
  statusOf,
  telltaleRow,
  turnItem,
  whoBrokeItem,
  type Cond,
  type CondMade,
  type Lit,
  type Row,
  type Skin,
  type SkinId,
} from '../puzzles/conditionals';
import { explanationFor, firstSentence } from '../../game/explanation';
import { freshCheckSet, looks } from '../fresh';
import { grade } from '../grade';
import { READING, fkGrade, longestSentence, sentences, words } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, DrillStep, Item, MultiItem, Scene, TeachCase } from '../types';

// ---------- a separate brute force ----------

const BOOLS = [true, false];
const CASES = BOOLS.flatMap((p) => BOOLS.map((q) => ({ p, q })));
/** "If P, then Q" is false only when P is true and Q is false. */
const ruleOk = (p: boolean, q: boolean) => !(p && !q);
const value = (l: Lit, p: boolean, q: boolean) => (l === 'P' ? p : l === 'notP' ? !p : l === 'Q' ? q : !q);
const aboutP = (l: Lit) => l === 'P' || l === 'notP';
/** Cases where the rule is kept and the fact is true. */
const fits = (fact: Lit) => CASES.filter((c) => ruleOk(c.p, c.q) && value(fact, c.p, c.q));
function bruteStatus(fact: Lit, target: Lit): 'must' | 'maybe' | 'never' {
  const vals = fits(fact).map((c) => value(target, c.p, c.q));
  return vals.every(Boolean) ? 'must' : vals.some(Boolean) ? 'maybe' : 'never';
}
const condOk = (c: Cond, p: boolean, q: boolean) => !value(c.a, p, q) || value(c.b, p, q);
const bruteSame = (x: Cond, y: Cond) => CASES.every((c) => condOk(x, c.p, c.q) === condOk(y, c.p, c.q));
/** A card showing `face` must be turned when some value of its hidden side breaks the rule. */
const bruteTurn = (face: Lit) => CASES.some((c) => value(face, c.p, c.q) && !ruleOk(c.p, c.q));
const ALL_CONDS: Cond[] = LITS.flatMap((a) => LITS.map((b) => ({ a, b })));

// ---------- reading the page ----------

const strip = (s: string) => s.replace(/\.$/, '');

/** Which fact about which name a sentence states, from the skin's words. */
function readFact(skin: Skin, text: string): { lit: Lit; name: string } {
  for (const name of skin.names) for (const lit of LITS) if (skin.fact(lit, name) === strip(text)) return { lit, name };
  throw new Error(`cannot read fact: ${text}`);
}

/** Which rewrite a sentence is. */
function readCond(skin: SkinId, text: string): Cond {
  const hits = ALL_CONDS.filter((c) => condText(skin, c) === text);
  if (hits.length !== 1) throw new Error(`cannot read sentence: ${text}`);
  return hits[0];
}

/** Letter cards: read a face by what kind of symbol it is. Word cards: by the skin's face words. */
function readFace(skin: SkinId, label: string): Lit {
  if (skin === 'letters') {
    if (/^[AEIOU]$/.test(label)) return 'P';
    if (/^[A-Z]$/.test(label)) return 'notP';
    if (/^\d$/.test(label)) return Number(label) % 2 === 0 ? 'Q' : 'notQ';
    throw new Error(`cannot read card: ${label}`);
  }
  const f = SKINS[skin].cards!;
  const hit = LITS.find((l) => f.face(l, { vowel: 'E', consonant: 'K', even: '4', odd: '7' }) === label);
  if (!hit) throw new Error(`cannot read card: ${label}`);
  return hit;
}

/** Lesson 1: the case a label or sentence describes. */
function readCase(skin: Skin, text: string, sym: { vowel: string; consonant: string; even: string; odd: string }, says: boolean): Row {
  const l1 = skin.l1!;
  const hits = skin.names.flatMap((name) => ROWS.filter((row) => (says ? l1.says : l1.label)({ name, row, sym }) === strip(text)));
  if (hits.length !== 1) throw new Error(`cannot read case: ${text}`);
  return hits[0];
}

/** Which skin a rule card belongs to. */
function skinOfScene(it: Item): SkinId {
  if (it.scene?.kind !== 'text') throw new Error('expected a rule card');
  const rule = it.scene.lines[1];
  const hit = SKIN_IDS.find((s) => ruleText(s) === rule);
  if (!hit) throw new Error(`unknown rule: ${rule}`);
  return hit;
}

const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

// ---------- text rules for every item ----------

function texts(it: Item | CondMade['item']): string[] {
  const out = [it.prompt, it.explain, it.hint ?? '', ...teachStrings(it as Item)];
  if (it.kind === 'choose') out.push(...Object.values(it.whyWrong ?? {}), ...it.choices.map((c) => c.label));
  if (it.kind === 'multi') out.push(...Object.values(it.pickTips ?? {}), ...Object.values(it.missTips ?? {}), ...it.choices.map((c) => c.label));
  if (it.scene?.kind === 'text') out.push(...it.scene.lines);
  return out.filter(Boolean);
}

/** Text rules, collected and checked at once (one expect per line is slow over thousands of items). */
function checkLines(lines: string[]) {
  const bad: string[] = [];
  for (const t of lines) {
    if (/['"]/.test(t)) bad.push(`straight quotes or apostrophes: ${t}`);
    if (/”[.,]/.test(t)) bad.push(`punctuation after a closing quote: ${t}`);
    if (/ {2}/.test(t)) bad.push(`doubled space: ${t}`);
    if (/undefined|\$\{|\bnull\b/.test(t)) bad.push(`unfilled text: ${t}`);
    if ((t.match(/“/g) ?? []).length !== (t.match(/”/g) ?? []).length) bad.push(`unbalanced quotes: ${t}`);
    for (const s of sentences(t)) if (words(s).length > 25) bad.push(`over 25 words: ${s}`);
  }
  expect(bad).toEqual([]);
}

function checkText(it: Item | CondMade['item']) {
  checkLines(texts(it));
  const tips = it.kind === 'choose' ? Object.values(it.whyWrong ?? {}) : it.kind === 'multi' ? [...Object.values(it.pickTips ?? {}), ...Object.values(it.missTips ?? {})] : [];
  for (const t of tips) expect(t, 'the UI already says Not yet').not.toMatch(/^Not yet/i);
  // Hints nudge; they never name the right choice.
  if (it.hint && it.kind === 'choose') {
    const right = it.choices.find((c) => c.id === it.answer)!.label;
    if (right.length > 3) expect(it.hint).not.toContain(strip(right));
  }
}

// ---------- the logic ----------

describe('the truth table', () => {
  it('has four different cases, and the rule is broken only when P happens and Q does not', () => {
    expect(new Set(ROWS.map(rowKey)).size).toBe(4);
    for (const r of ROWS) expect(condHolds(RULE, r)).toBe(ruleOk(r.p, r.q));
    expect(ROWS.filter((r) => !condHolds(RULE, r)).map(rowKey)).toEqual(['TF']);
  });

  it('the four moves: P gives Q, not Q gives not P, Q and not P give nothing', () => {
    expect(follows('P')).toBe('Q');
    expect(follows('notQ')).toBe('notP');
    expect(follows('Q')).toBeNull();
    expect(follows('notP')).toBeNull();
    expect(MOVE_FACT).toEqual({ mp: 'P', mt: 'notQ', ac: 'Q', da: 'notP' });
    for (const fact of LITS) {
      const sure = LITS.filter((t) => aboutP(t) !== aboutP(fact) && bruteStatus(fact, t) === 'must');
      expect(follows(fact)).toBe(sure[0] ?? null);
      expect(sure.length).toBeLessThanOrEqual(1);
    }
  });

  it('must / maybe / never agree with the brute force for every fact and sentence', () => {
    for (const fact of LITS) for (const target of LITS) expect(statusOf(fact, target), `${fact} -> ${target}`).toBe(bruteStatus(fact, target));
  });

  it('only the P card and the not-Q card must be turned over', () => {
    for (const face of LITS) expect(mustTurn(face), face).toBe(bruteTurn(face));
    expect(LITS.filter(mustTurn)).toEqual(['P', 'notQ']);
    expect(breakingBack('P')).toBe('notQ');
    expect(breakingBack('notQ')).toBe('P');
  });

  it('of every "If a, then b", only the rule and flip-and-NOT mean the same as the rule', () => {
    const same = ALL_CONDS.filter((c) => aboutP(c.a) !== aboutP(c.b) && bruteSame(c, RULE));
    expect(same).toEqual(expect.arrayContaining([RULE, CONTRA]));
    expect(same.length).toBe(2);
    for (const c of ALL_CONDS) expect(sameMeaning(c, RULE)).toBe(bruteSame(c, RULE));
    expect(bruteSame(CONVERSE, RULE)).toBe(false);
    expect(bruteSame(INVERSE, RULE)).toBe(false);
    // Flip only and NOT only are each other's flip and NOT, so they match each other.
    expect(bruteSame(CONVERSE, INVERSE)).toBe(true);
    for (const c of [CONVERSE, INVERSE, ...ODD_REWRITES]) {
      const t = telltaleRow(c)!;
      expect(condOk(c, t.row.p, t.row.q)).not.toBe(ruleOk(t.row.p, t.row.q));
      expect(t.breaks).toBe(condOk(c, t.row.p, t.row.q) ? 'rule' : 'sentence');
    }
    expect(telltaleRow(CONTRA)).toBeNull();
  });
});

describe('skins', () => {
  it('every skin has four different facts, a rule built from its parts, and the right lessons', () => {
    for (const id of SKIN_IDS) {
      const s = SKINS[id];
      for (const n of s.names) expect(new Set(LITS.map((l) => s.fact(l, n))).size, id).toBe(4);
      expect(ruleText(id)).toMatch(/^If .+, then .+\.$/);
      expect(new Set(Object.values(s.kase)).size).toBe(4);
      expect(s.otherWays.length).toBeGreaterThan(0);
    }
    expect([...L1_SKINS].sort()).toEqual(['dessert', 'dragons', 'letters', 'library', 'lunchbox', 'pq', 'umbrella', 'wizards'].sort());
    expect([...CARD_SKINS].sort()).toEqual(['dessert', 'dragons', 'letters', 'library', 'lunchbox', 'umbrella', 'wizards'].sort());
    expect(new Set(SKIN_IDS.map((s) => SKINS[s].group))).toEqual(new Set(['everyday', 'fantasy', 'abstract']));
  });

  it('the lesson 1 grid marks only IF-without-THEN as broken', () => {
    for (const id of CARD_SKINS) {
      const g = ruleGrid(id);
      if (g.kind !== 'grid') throw new Error('grid');
      expect(g.marks).toEqual({ P: { Q: 'yes', notQ: 'no' }, notP: { Q: 'yes', notQ: 'yes' } });
    }
  });

  it('the lesson 4 grid shows the rule and flip-and-NOT agree in every case, and the others do not', () => {
    const g = meaningGrid('pets');
    if (g.kind !== 'grid') throw new Error('grid');
    const col = (id: string) => g.rows.map((r) => g.marks[r.id][id]);
    expect(col('contra')).toEqual(col('rule'));
    expect(col('converse')).not.toEqual(col('rule'));
    expect(col('inverse')).not.toEqual(col('rule'));
    expect(col('rule')).toEqual(CASES.map((c) => (ruleOk(c.p, c.q) ? 'yes' : 'no')));
  });
});

// ---------- items, re-solved from the page ----------

describe('lesson 1: who broke the rule', () => {
  it('exactly one choice breaks the rule, read back from the labels', () => {
    for (const skin of L1_SKINS) for (const seed of SEEDS) {
      const m = whoBrokeItem(createRng(seed), { skin });
      const it = m.item as ChooseItem;
      const rows = it.choices.map((c) => readCase(SKINS[skin], c.label, m.meta.sym!, false));
      expect(new Set(rows.map(rowKey)).size).toBe(4);
      const broke = it.choices.filter((_, i) => !ruleOk(rows[i].p, rows[i].q));
      expect(broke.map((c) => c.id)).toEqual([it.answer]);
      expect(Object.keys(it.whyWrong!).sort()).toEqual(it.choices.filter((c) => c.id !== it.answer).map((c) => c.id).sort());
      checkText(it);
    }
  });

  it('did this case break the rule: yes only for IF without THEN; no dessert and veggies left is a trap', () => {
    for (const skin of L1_SKINS) for (const seed of SEEDS.slice(0, 40)) for (const row of ROWS) {
      const m = didBreakItem(createRng(seed), { skin, row });
      const it = m.item as ChooseItem;
      const read = readCase(SKINS[skin], it.prompt.split(/(?<=\.) /)[0], m.meta.sym!, true);
      expect(read).toEqual(row);
      expect(it.answer).toBe(ruleOk(read.p, read.q) ? 'no' : 'yes');
      expect(!!it.conflict).toBe(!row.p && !row.q);
      checkText(it);
    }
  });
});

describe('lesson 2: turning it around', () => {
  it('forward facts settle the sentence; backward facts are "can’t tell" with another reason named', () => {
    for (const skin of SKIN_IDS) for (const seed of SEEDS.slice(0, 60)) for (const fact of ['P', 'Q'] as const) {
      const m = turnItem(createRng(seed), { skin, fact });
      const it = m.item as ChooseItem;
      const s = SKINS[skin];
      const [, f, t] = it.prompt.match(/^(.+?\.) Is this sentence true for sure, false for sure, or can’t you tell\? “(.+)”$/)!;
      const given = readFact(s, f), asked = readFact(s, t);
      expect(asked.name).toBe(given.name);
      expect(aboutP(asked.lit)).not.toBe(aboutP(given.lit));
      expect(it.answer).toBe(bruteStatus(given.lit, asked.lit));
      if (given.lit === 'Q') {
        expect(it.answer).toBe('maybe');
        expect(it.conflict).toBe(true);
        expect(s.otherWays.some((w) => it.explain.includes(w(given.name)))).toBe(true);
        expect(it.explain).toContain(s.mayP(given.name).slice(1));
      } else {
        expect(it.explain).toContain(s.fact('Q', given.name));
      }
      checkText(it);
    }
  });
});

describe('lesson 3: the four moves', () => {
  it('what follows is worked out again from the fact and the choices', () => {
    for (const skin of SKIN_IDS) for (const seed of SEEDS.slice(0, 60)) for (const move of MOVES) {
      const m = moveItem(createRng(seed), { skin, move });
      const it = m.item as ChooseItem;
      const s = SKINS[skin];
      const given = readFact(s, it.prompt.replace(/ What follows for sure\?$/, ''));
      expect(given.lit).toBe(MOVE_FACT[move]);
      const lits = it.choices.filter((c) => c.id !== NOTHING).map((c) => readFact(s, c.label).lit);
      expect(lits.every((l) => aboutP(l) !== aboutP(given.lit))).toBe(true);
      const sure = it.choices.filter((c) => c.id !== NOTHING && bruteStatus(given.lit, readFact(s, c.label).lit) === 'must');
      expect(sure.length).toBeLessThanOrEqual(1);
      expect(it.answer).toBe(sure[0]?.id ?? NOTHING);
      expect(!!it.conflict).toBe(move === 'ac' || move === 'da');
      if (move === 'ac') expect(s.otherWays.some((w) => it.explain.includes(w(given.name)))).toBe(true);
      if (move === 'da') for (const x of s.noIf(given.name)) expect(it.explain.toLowerCase()).toContain(x.toLowerCase());
      checkText(it);
    }
  });
});

describe('lesson 4: flip and NOT', () => {
  it('exactly one choice means the same, and each wrong pick names a case that tells them apart', () => {
    for (const skin of SKIN_IDS) for (const seed of SEEDS.slice(0, 60)) {
      const m = samePickItem(createRng(seed), { skin });
      const it = m.item as ChooseItem;
      const s = SKINS[skin];
      const conds = it.choices.map((c) => readCond(skin, c.label));
      const same = it.choices.filter((_, i) => bruteSame(conds[i], RULE));
      expect(same.map((c) => c.id)).toEqual([it.answer]);
      it.choices.forEach((c, i) => {
        if (c.id === it.answer) return;
        const named = (Object.keys(s.kase) as (keyof typeof s.kase)[]).filter((k) => it.whyWrong![c.id].toLowerCase().includes(s.kase[k].toLowerCase()));
        expect(named.length, it.whyWrong![c.id]).toBe(1);
        const row = CASES.find((x) => rowKey(x) === named[0])!;
        expect(condOk(conds[i], row.p, row.q)).not.toBe(ruleOk(row.p, row.q));
      });
      expect(it.explain).toContain(s.kase.TF);
      checkText(it);
    }
  });

  it('does this sentence mean the same: yes only for flip and NOT', () => {
    for (const skin of SKIN_IDS) for (const seed of SEEDS.slice(0, 30)) for (const rewrite of ['contra', 'converse', 'inverse'] as const) {
      const it = sameYesNoItem(createRng(seed), { skin, rewrite }).item as ChooseItem;
      const c = readCond(skin, it.prompt.match(/“(.+)”$/)![1]);
      expect(it.answer).toBe(bruteSame(c, RULE) ? 'yes' : 'no');
      expect(!!it.conflict).toBe(rewrite !== 'contra');
      checkText(it);
    }
  });
});

describe('lesson 5: the rule checker', () => {
  it('the cards to turn are the ones that could hide a broken rule; the THEN card is named as the trap', () => {
    for (const skin of CARD_SKINS) for (const seed of SEEDS) {
      const it = checkerItem(createRng(seed), { skin }).item as MultiItem;
      const faces = it.choices.map((c) => readFace(skin, c.label));
      expect([...faces].sort()).toEqual([...LITS].sort());
      const turn = it.choices.filter((_, i) => bruteTurn(faces[i])).map((c) => c.id);
      expect([...it.answer].sort()).toEqual(turn.sort());
      const idOf = (l: Lit) => it.choices[faces.indexOf(l)].id;
      expect(Object.keys(it.missTips!).sort()).toEqual([idOf('P'), idOf('notQ')].sort());
      expect(Object.keys(it.pickTips!).sort()).toEqual([idOf('Q'), idOf('notP')].sort());
      expect(it.pickTips![idOf('Q')]).toContain('trap');
      expect(it.missTips![idOf('notQ')]).toContain('miss');
      expect(it.conflict).toBe(true);
      checkText(it);
    }
  });

  it('one card: turn it over only when its back could break the rule', () => {
    for (const skin of CARD_SKINS) for (const seed of SEEDS.slice(0, 30)) for (const face of LITS) {
      const it = cardItem(createRng(seed), { skin, face }).item as ChooseItem;
      const shown = readFace(skin, it.prompt.match(/One card shows “(.+)\.”/)![1]);
      expect(shown).toBe(face);
      expect(it.answer).toBe(bruteTurn(shown) ? 'yes' : 'no');
      checkText(it);
    }
  });
});

// ---------- the stop ----------

describe('stop 6 content', () => {
  const skinGroup = (it: Item) => SKINS[skinOfScene(it)].group;

  it('the same seed gives the same items', () => {
    for (const seed of [1, 2, 3]) {
      for (const l of stop6.lessons) expect(l.practice(createRng(seed))).toEqual(l.practice(createRng(seed)));
      expect(stop6.check!(createRng(seed))).toEqual(stop6.check!(createRng(seed)));
    }
  });

  it('every check has 9-10 items, all four moves, a four-card rule checker and a trap', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const items = stop6.check!(createRng(seed));
      expect(items.length).toBeGreaterThanOrEqual(9);
      expect(items.length).toBeLessThanOrEqual(10);
      for (const tag of ['move-if', 'move-not-then', 'trap-then', 'trap-not-if']) expect(items.some((i) => i.skill === `s6.${tag}`), `seed ${seed} ${tag}`).toBe(true);
      expect(items.some((i) => i.kind === 'multi' && i.skill === 's6.checker')).toBe(true);
      expect(items.some((i) => i.conflict)).toBe(true);
      // Lessons come in order.
      const order = items.map((i) => Number(i.lesson.slice(-1)));
      expect([...order].sort((a, b) => a - b)).toEqual(order);
      items.forEach(checkText);
    }
  });

  it('practice sets mix skins, and lesson 5 puts letters and numbers last', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of stop6.lessons) {
        const items = l.practice(createRng(seed));
        expect(new Set(items.map(skinGroup)).size, `${l.id} seed ${seed}`).toBeGreaterThanOrEqual(2);
        items.forEach(checkText);
      }
      const l5 = stop6.lessons[4].practice(createRng(seed));
      expect(l5.map(skinGroup)).toEqual([...l5.slice(0, -1).map(() => expect.stringMatching(/everyday|fantasy/)), 'abstract']);
      expect(l5[l5.length - 1].kind).toBe('multi');
    }
  });

  it('every skill in a check also shows up in lesson practice (so the notebook can find a fresh one)', () => {
    const practiced = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) for (const l of stop6.lessons) for (const it of l.practice(createRng(seed))) practiced.add(it.skill);
    for (let seed = 1; seed <= 100; seed++) for (const it of stop6.check!(createRng(seed))) expect(practiced.has(it.skill), it.skill).toBe(true);
    for (let seed = 1; seed <= 100; seed++) expect(practiced.has(stop6.practice!(createRng(seed)).skill)).toBe(true);
  });

  it('idea cards quote the rules the engine uses', () => {
    const all = stop6.lessons.flatMap((l) => l.ideas.flatMap((c) => c.body)).join('\n');
    for (const s of ['dessert', 'pets'] as const) expect(all).toContain(ruleText(s));
    expect(all).toContain(condText('pets', CONTRA));
    expect(all).toContain(condText('pets', CONVERSE));
    expect(all).toContain(condText('pets', INVERSE));
    for (const l of stop6.lessons) for (const c of l.ideas) checkLines([c.title, ...c.body, ...(c.scene?.kind === 'text' ? c.scene.lines : [])]);
  });
});

// ---------- wrong answers teach first ----------
//
// Test key (named in docs/audit/stop6.md):
//  T-teach  every item has a rule, 1-3 terms (the IF part and THEN part in the rule's own words), a meaning, 2-4
//           worked cases with a title, Remember with an “Ask: …?” question, and a simpler example.
//  T-truth  every true/false on every worked case and counterexample is worked out again from the case's label.
//  T-cover  the cases cover every way the question can go (the four rows, the rows that fit the fact, every card,
//           or both backs of one card).
//  T-proof  every wrong choice has feedback, and its example card proves the gap.
//  T-kind   each mistake kind, found from what the player sees, has its own headline, and no headline serves two.
//  T-ids    a choice id is fixed by what the choice says, never its place; shuffling keeps each explanation.
//  T-tips   every wrong set of rule-checker cards gets a title that names a card, and each tip's claim is true.
//  T-fresh  new examples after a miss: the same skill first in a new story, then its boundary partner.
//  T-read   each item's full text reads at grade 7 or lower, no sentence over 25 words, quotes and words as the
//           content guide asks.

type Gen = 'who' | 'did' | 'turn' | 'move' | 'pick' | 'yesno' | 'checker' | 'card';
interface Made {
  m: CondMade;
  skin: SkinId;
  gen: Gen;
  seed: number;
}

const TEACH_SEEDS = SEEDS.slice(0, 20);
let madeCache: Made[] | null = null;
/** Every generator, every skin it takes, every variant it has. */
function allMade(): Made[] {
  if (madeCache) return madeCache;
  const out: Made[] = [];
  for (const seed of TEACH_SEEDS) {
    for (const skin of L1_SKINS) {
      out.push({ m: whoBrokeItem(createRng(seed), { skin }), skin, gen: 'who', seed });
      for (const row of ROWS) out.push({ m: didBreakItem(createRng(seed), { skin, row }), skin, gen: 'did', seed });
    }
    for (const skin of SKIN_IDS) {
      for (const [fact, target] of [['P', 'Q'], ['P', 'notQ'], ['Q', 'P'], ['Q', 'notP']] as const) out.push({ m: turnItem(createRng(seed), { skin, fact, target }), skin, gen: 'turn', seed });
      for (const move of MOVES) out.push({ m: moveItem(createRng(seed), { skin, move }), skin, gen: 'move', seed });
      out.push({ m: samePickItem(createRng(seed), { skin }), skin, gen: 'pick', seed });
      for (const rewrite of ['contra', 'converse', 'inverse'] as const) out.push({ m: sameYesNoItem(createRng(seed), { skin, rewrite }), skin, gen: 'yesno', seed });
    }
    for (const skin of CARD_SKINS) {
      out.push({ m: checkerItem(createRng(seed), { skin }), skin, gen: 'checker', seed });
      for (const face of LITS) out.push({ m: cardItem(createRng(seed), { skin, face }), skin, gen: 'card', seed });
    }
  }
  madeCache = out;
  return out;
}

const negLit = (l: Lit): Lit => (l === 'P' ? 'notP' : l === 'notP' ? 'P' : l === 'Q' ? 'notQ' : 'Q');
const isNeg = (l: Lit) => l === 'notP' || l === 'notQ';
/** Flip and NOT, written out here: "If not Q, then not P." */
const FLIP_AND_NOT: Cond = { a: 'notQ', b: 'notP' };
const keyOf = (p: boolean, q: boolean) => `${p ? 'T' : 'F'}${q ? 'T' : 'F'}`;
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A case in the story's words, about any name in the skin. */
function readSays(skin: Skin, text: string): Row {
  const hits = skin.names.flatMap((n) => ROWS.filter((r) => skin.says(n, r) === strip(text)));
  if (hits.length !== 1) throw new Error(`cannot read case: ${text}`);
  return hits[0];
}
/** A case named the way lesson 4 names it: "A cat with four legs." */
function readKase(skin: Skin, text: string): Row {
  const hits = ROWS.filter((r) => `${capFirst(skin.kase[rowKey(r)])}.` === text);
  if (hits.length !== 1) throw new Error(`cannot read case: ${text}`);
  return hits[0];
}
/** The hidden side of a rule-checker card, as the teaching names it. */
function readBack(skin: SkinId, text: string): Lit {
  if (skin === 'letters') {
    const map: Record<string, Lit> = { 'a vowel': 'P', 'a letter that is not a vowel': 'notP', 'an even number': 'Q', 'an odd number': 'notQ' };
    if (!map[text]) throw new Error(`cannot read back: ${text}`);
    return map[text];
  }
  return readFace(skin, text.replace(/^“|”$/g, ''));
}
/** The case with a card's face on one side and its back on the other (brute force). */
const cardCase = (face: Lit, back: Lit) => CASES.find((c) => value(face, c.p, c.q) && value(back, c.p, c.q))!;

/** What a case's label says, read back: a row (p, q), or for a rule-checker card only its face. */
function readLabel(x: Made, c: TeachCase): { p: boolean; q: boolean } | { face: Lit } {
  const s = SKINS[x.skin];
  switch (x.gen) {
    case 'who':
    case 'did':
      return readCase(s, c.label, x.m.meta.sym!, true);
    case 'turn':
    case 'move':
      return readSays(s, c.label);
    case 'pick':
    case 'yesno':
      return readKase(s, c.label);
    case 'checker': {
      const m = c.label.match(/^The card that shows “(.+)\.”$/);
      if (!m) throw new Error(`cannot read card: ${c.label}`);
      return { face: readFace(x.skin, m[1]) };
    }
    case 'card': {
      const m = c.label.match(/^A card with “(.+)” on the front and (.+) on the back\.$/);
      if (!m) throw new Error(`cannot read card: ${c.label}`);
      const face = readFace(x.skin, m[1]);
      const back = readBack(x.skin, m[2]);
      expect(aboutP(back), c.label).not.toBe(aboutP(face));
      return cardCase(face, back);
    }
  }
}

/** The sentences an item's truths can name, worked out here from what the player sees. */
function context(x: Made, pick?: string) {
  const it = x.m.item;
  const s = SKINS[x.skin];
  const ctx: { target?: Lit; answerLit?: Lit; yours?: Cond; asked?: Cond; fact?: Lit } = {};
  if (x.gen === 'turn') {
    const [, f, t] = it.prompt.match(/^(.+?\.) Is this sentence true for sure, false for sure, or can’t you tell\? “(.+)”$/)!;
    ctx.fact = readFact(s, f).lit;
    ctx.target = readFact(s, t).lit;
  }
  if (x.gen === 'move') {
    ctx.fact = readFact(s, it.prompt.replace(/ What follows for sure\?$/, '')).lit;
    if (pick && pick !== NOTHING && it.kind === 'choose') ctx.answerLit = readFact(s, it.choices.find((c) => c.id === pick)!.label).lit;
  }
  if (x.gen === 'pick' && pick && it.kind === 'choose') ctx.yours = readCond(x.skin, it.choices.find((c) => c.id === pick)!.label);
  if (x.gen === 'yesno') ctx.asked = readCond(x.skin, it.prompt.match(/“(.+)”$/)![1]);
  return ctx;
}

/** Each true/false on a case, worked out again from its label. */
function checkTruths(x: Made, c: TeachCase, pick?: string) {
  const read = readLabel(x, c);
  const ctx = context(x, pick);
  expect(c.truths?.length, c.label).toBeGreaterThan(0);
  for (const t of c.truths ?? []) {
    let want: boolean;
    if ('face' in read) {
      expect(t.who).toBe('You must turn it over');
      want = bruteTurn(read.face);
    } else {
      const { p, q } = read;
      const map: Record<string, () => boolean> = {
        'The IF part': () => p,
        'The THEN part': () => q,
        'The rule': () => ruleOk(p, q),
        'The sentence': () => value(ctx.target!, p, q),
        'Your answer': () => value(ctx.answerLit!, p, q),
        'Your sentence': () => condOk(ctx.yours!, p, q),
        'This sentence': () => condOk(ctx.asked!, p, q),
        'The flip and NOT sentence': () => condOk(FLIP_AND_NOT, p, q),
      };
      expect(map[t.who], `unknown truth “${t.who}”`).toBeDefined();
      want = map[t.who]();
    }
    expect(t.value, `${x.gen} ${x.skin}: ${c.label} ${t.who}`).toBe(want);
  }
  return read;
}

/** The mistake a wrong choice makes, found from what the player sees (never from the engine's words). */
function claimKind(fact: Lit, claim: Lit): string {
  // The answer, with the fact, leaves only cases that break the rule.
  if (CASES.filter((c) => value(fact, c.p, c.q) && value(claim, c.p, c.q)).every((c) => !ruleOk(c.p, c.q))) return 'breaks the rule';
  return `${fact} -> ${claim}`;
}
function mistakeKind(x: Made, pick: string): string {
  const it = x.m.item as ChooseItem;
  const ctx = context(x, pick);
  switch (x.gen) {
    case 'who': {
      const r = readCase(SKINS[x.skin], it.choices.find((c) => c.id === pick)!.label, x.m.meta.sym!, false);
      return `who: ${keyOf(r.p, r.q)}`;
    }
    case 'did': {
      const r = readCase(SKINS[x.skin], it.prompt.split(/(?<=\.) /)[0], x.m.meta.sym!, true);
      return `did: ${keyOf(r.p, r.q)}`;
    }
    case 'turn':
      if (pick === 'maybe') return 'can’t tell, but it is settled';
      return claimKind(ctx.fact!, pick === 'must' ? ctx.target! : negLit(ctx.target!));
    case 'move':
      return pick === NOTHING ? `nothing follows from ${ctx.fact}` : claimKind(ctx.fact!, ctx.answerLit!);
    case 'pick': {
      const c = ctx.yours!;
      return `rewrite: flip ${aboutP(c.a) ? 'no' : 'yes'}, NOT in IF ${isNeg(c.a)}, NOT in THEN ${isNeg(c.b)}`;
    }
    case 'yesno': {
      const c = ctx.asked!;
      return bruteSame(c, RULE) ? 'yes/no: says they differ' : `yes/no: flip ${aboutP(c.a) ? 'no' : 'yes'}, NOT in IF ${isNeg(c.a)}, NOT in THEN ${isNeg(c.b)}`;
    }
    case 'card': {
      const face = readFace(x.skin, it.prompt.match(/One card shows “(.+)\.”/)![1]);
      return bruteTurn(face) ? `card: skips ${face}` : `card: turns ${face}`;
    }
    default:
      throw new Error(x.gen);
  }
}

describe('stop 6 wrong answers teach first', () => {
  it('T-teach: every item has the rule, the words it needs, its meaning, 2-4 cases, Remember and a simpler example', () => {
    for (const x of allMade()) {
      const t = x.m.item.teach!;
      const where = `${x.gen} ${x.skin}`;
      expect(t, where).toBeDefined();
      expect(t.rule.trim(), where).not.toBe('');
      expect(t.terms!.length, where).toBeGreaterThanOrEqual(1);
      expect(t.terms!.length, where).toBeLessThanOrEqual(3);
      expect(t.meaning!.trim(), where).not.toBe('');
      expect(t.casesTitle!.trim(), where).not.toBe('');
      expect(t.cases!.length, where).toBeGreaterThanOrEqual(2);
      expect(t.cases!.length, where).toBeLessThanOrEqual(4);
      expect(t.remember!.length, where).toBe(2);
      expect(t.remember![1], where).toMatch(/^Ask: “.+\?”$/);
      expect(t.simpler!.length, where).toBeGreaterThanOrEqual(2);
      const termWords = t.terms!.map((w) => w.word);
      const parts = SKINS[x.skin].parts;
      if (x.gen === 'pick' || x.gen === 'yesno') {
        expect(termWords).toEqual(['To flip a sentence', 'To put NOT in both parts', 'A case breaks a sentence']);
      } else {
        // The IF part and the THEN part are defined with this rule's own words.
        expect(termWords.slice(0, 2)).toEqual(['The IF part', 'The THEN part']);
        expect(t.terms![0].meaning).toContain(`“${parts.P.if}.”`);
        expect(t.terms![1].meaning).toContain(`“${parts.Q.then ?? parts.Q.if}.”`);
        const third = { who: 'Breaks the rule', did: 'Breaks the rule', turn: '“Can’t tell”', move: '“Nothing follows for sure”', checker: 'Breaks the rule', card: 'Breaks the rule' }[x.gen];
        expect(termWords[2]).toBe(third);
      }
      // The meaning names the one case that breaks the rule, in the story's words.
      expect(t.meaning, where).toContain(SKINS[x.skin].kase.TF);
    }
  });

  it('T-truth and T-cover: every worked case is read back from its label, and its truths are worked out again', () => {
    for (const x of allMade()) {
      const reads = x.m.item.teach!.cases!.map((c) => checkTruths(x, c));
      const where = `${x.gen} ${x.skin}`;
      if (x.gen === 'checker') {
        expect(reads.map((r) => ('face' in r ? r.face : '')).sort(), where).toEqual([...LITS].sort());
        continue;
      }
      const keys = reads.map((r) => ('face' in r ? '' : keyOf(r.p, r.q))).sort();
      if (x.gen === 'who' || x.gen === 'did' || x.gen === 'pick' || x.gen === 'yesno') expect(keys, where).toEqual(['FF', 'FT', 'TF', 'TT']);
      if (x.gen === 'turn' || x.gen === 'move') {
        // Exactly the cases where the fact is true: the ones that keep the rule and the one that breaks it, if any.
        const fact = context(x).fact!;
        expect(keys, where).toEqual(CASES.filter((c) => value(fact, c.p, c.q)).map((c) => keyOf(c.p, c.q)).sort());
      }
      if (x.gen === 'card') {
        const face = readFace(x.skin, x.m.item.prompt.match(/One card shows “(.+)\.”/)![1]);
        expect(keys, where).toEqual(CASES.filter((c) => value(face, c.p, c.q)).map((c) => keyOf(c.p, c.q)).sort());
      }
      // "Did this break the rule?" marks the case the question asks about.
      if (x.gen === 'did') {
        const asked = readCase(SKINS[x.skin], x.m.item.prompt.split(/(?<=\.) /)[0], x.m.meta.sym!, true);
        const marked = x.m.item.teach!.cases!.filter((c) => c.note?.endsWith('This is the case in the question.'));
        expect(marked.length).toBe(1);
        expect(readCase(SKINS[x.skin], marked[0].label, x.m.meta.sym!, true)).toEqual(asked);
      }
    }
  });

  it('T-proof: every wrong choice has its own feedback, and its example case proves the gap', () => {
    for (const x of allMade()) {
      const it = x.m.item;
      if (it.kind !== 'choose') continue;
      const where = `${x.gen} ${x.skin}`;
      const wrong = it.choices.filter((c) => c.id !== it.answer).map((c) => c.id);
      expect(Object.keys(it.feedback ?? {}).sort(), where).toEqual([...wrong].sort());
      for (const id of wrong) {
        const fb = it.feedback![id];
        expect(fb.headline, where).toMatch(/^(Your answer|“Can’t tell”|“Nothing follows for sure”) /);
        expect(fb.detail.length, where).toBeGreaterThanOrEqual(2);
        // "Explain more simply": the choice's own example, or the item's (the panel falls back to it).
        expect((fb.simpler ?? it.teach!.simpler!).length, `${where} simpler`).toBeGreaterThan(0);
        if (x.gen === 'who' || x.gen === 'did' || x.gen === 'pick' || x.gen === 'yesno' || x.gen === 'card') expect(fb.simpler?.length, `${where} own simpler`).toBeGreaterThan(0);
        expect(it.whyWrong![id]).toBe([fb.headline, ...fb.detail].join(' '));
        const r = checkTruths(x, fb.example!, id);
        if ('face' in r) throw new Error('a card example is a whole case');
        const { p, q } = r;
        const ctx = context(x, id);
        switch (x.gen) {
          case 'who': // the picked case, and it keeps the rule
            expect(r).toEqual(readCase(SKINS[x.skin], it.choices.find((c) => c.id === id)!.label, x.m.meta.sym!, false));
            expect(ruleOk(p, q)).toBe(true);
            break;
          case 'did': // the case asked about; "Yes" is wrong when it keeps the rule, "No" when it breaks it
            expect(r).toEqual(readCase(SKINS[x.skin], it.prompt.split(/(?<=\.) /)[0], x.m.meta.sym!, true));
            expect(ruleOk(p, q)).toBe(id === 'yes');
            break;
          case 'turn': {
            expect(value(ctx.fact!, p, q), where).toBe(true);
            const said = value(ctx.target!, p, q);
            if (ruleOk(p, q)) {
              // A case that can happen, where the sentence goes the other way from the pick.
              expect(id).not.toBe('maybe');
              expect(said).toBe(id === 'never');
            } else if (id === 'maybe') {
              // The only case where the sentence would go the other way breaks the rule.
              expect(said).toBe(it.answer !== 'must');
            } else {
              // The pick's claim holds here, and so the rule breaks.
              expect(said).toBe(id === 'must');
            }
            break;
          }
          case 'move': {
            expect(value(ctx.fact!, p, q), where).toBe(true);
            if (id === NOTHING) {
              // Something follows: the only other case that fits the fact breaks the rule.
              expect(ruleOk(p, q)).toBe(false);
              expect(CASES.filter((c) => value(ctx.fact!, c.p, c.q) && ruleOk(c.p, c.q)).length).toBe(1);
            } else if (ruleOk(p, q)) {
              expect(value(ctx.answerLit!, p, q)).toBe(false);
            } else {
              expect(value(ctx.answerLit!, p, q)).toBe(true);
              expect(CASES.filter((c) => value(ctx.fact!, c.p, c.q) && value(ctx.answerLit!, c.p, c.q)).every((c) => !ruleOk(c.p, c.q))).toBe(true);
            }
            break;
          }
          case 'pick':
            expect(condOk(ctx.yours!, p, q)).not.toBe(ruleOk(p, q));
            break;
          case 'yesno':
            if (bruteSame(ctx.asked!, RULE)) {
              expect(ruleOk(p, q)).toBe(false);
              expect(condOk(ctx.asked!, p, q)).toBe(false);
              expect(CASES.filter((c) => !ruleOk(c.p, c.q)).length).toBe(1);
            } else {
              expect(condOk(ctx.asked!, p, q)).not.toBe(ruleOk(p, q));
            }
            break;
          case 'card': {
            const face = readFace(x.skin, it.prompt.match(/One card shows “(.+)\.”/)![1]);
            expect(value(face, p, q)).toBe(true);
            // "No" for a card to turn: this back breaks the rule. "Yes" for a card to skip: every back keeps it.
            expect(ruleOk(p, q)).toBe(id === 'yes');
            if (id === 'yes') expect(CASES.filter((c) => value(face, c.p, c.q)).every((c) => ruleOk(c.p, c.q))).toBe(true);
            break;
          }
        }
      }
    }
  });

  it('T-kind: each kind of mistake has its own headline, and no headline serves two kinds', () => {
    const headsOf = new Map<string, Set<string>>();
    const kindsOf = new Map<string, Set<string>>();
    const add = (kind: string, head: string) => {
      if (!headsOf.has(kind)) headsOf.set(kind, new Set());
      if (!kindsOf.has(head)) kindsOf.set(head, new Set());
      headsOf.get(kind)!.add(head);
      kindsOf.get(head)!.add(kind);
    };
    for (const x of allMade()) {
      const it = x.m.item;
      if (it.kind === 'choose') {
        for (const id of Object.keys(it.feedback ?? {})) add(mistakeKind(x, id), it.feedback![id].headline);
      } else {
        // Rule checker: one card left out, or one card too many. The card's name is masked, so the kind is its role.
        const faces = it.choices.map((c) => readFace(x.skin, c.label));
        it.choices.forEach((c, i) => {
          const ids = it.answer.includes(c.id) ? it.answer.filter((a) => a !== c.id) : [...it.answer, c.id];
          const title = firstSentence(grade(it as Item, { kind: 'multi', ids }).feedback)[0].replace(`“${c.label}`, '“#');
          add(it.answer.includes(c.id) ? `checker: leaves out ${faces[i]}` : `checker: turns ${faces[i]}`, title);
        });
      }
    }
    for (const [kind, heads] of headsOf) expect([...heads], kind).toHaveLength(1);
    for (const [head, kinds] of kindsOf) expect([...kinds], head).toHaveLength(1);
    // Every kind turns up: who 3, did 4, can't-tell 1, claims 5 (breaks, backward, rules out IF, two without IF),
    // nothing 2, rewrites 6, yes/no 3, one card 4, rule checker 4. Skipping the IF card and skipping the NOT THEN card
    // are two kinds: the hidden side that could break the rule is a different part.
    expect(headsOf.size).toBe(3 + 4 + 1 + 5 + 2 + 6 + 3 + 4 + 4);
  });

  it('T-ids: a choice id comes from what the choice says, and reversing the choices keeps every explanation', () => {
    const idOf = new Map<string, string>();
    for (const x of allMade()) {
      const it = x.m.item;
      if (it.kind !== 'choose') continue;
      for (const c of it.choices) {
        expect(c.id).not.toMatch(/^[cs]\d$/);
        // The same words in the same story always get the same id. (Lesson 1 labels differ by name, so use the case.)
        const key = x.gen === 'who' ? `who ${x.skin} ${rowKey(x.m.meta.cases![c.id])}` : `${x.gen} ${x.skin} ${c.label}`;
        if (idOf.has(key)) expect(c.id, key).toBe(idOf.get(key));
        else idOf.set(key, c.id);
      }
      const item = { ...it, id: 'x', stop: 6, lesson: 's6.l1', skill: `s6.${x.m.tag}` } as ChooseItem;
      const reversed: ChooseItem = { ...item, choices: [...item.choices].reverse() };
      for (const c of item.choices) {
        if (c.id === item.answer) continue;
        const a = explanationFor(item, { kind: 'choose', id: c.id });
        expect(explanationFor(reversed, { kind: 'choose', id: c.id })).toEqual(a);
        expect(a.title).toBe(item.feedback![c.id].headline);
        expect(a.specific).toBe(true);
        expect(a.example).toEqual(item.feedback![c.id].example);
      }
    }
    // Lesson 1: the case that breaks the rule is always the answer, whatever its place.
    for (const x of allMade().filter((y) => y.gen === 'who')) expect(rowKey(x.m.meta.cases![(x.m.item as ChooseItem).answer])).toBe('TF');
  });

  it('T-tips: every wrong set of cards gets a title that names a card, and each tip’s claim is true', () => {
    for (const x of allMade().filter((y) => y.gen === 'checker')) {
      const it = x.m.item as MultiItem;
      const faces = Object.fromEntries(it.choices.map((c) => [c.id, readFace(x.skin, c.label)]));
      const ids = it.choices.map((c) => c.id);
      for (let mask = 0; mask < 16; mask++) {
        const pick = ids.filter((_, i) => mask & (1 << i));
        const g = grade(it as Item, { kind: 'multi', ids: pick });
        if (g.correct) {
          expect([...pick].sort()).toEqual([...it.answer].sort());
          continue;
        }
        const model = explanationFor({ ...it, id: 'x', stop: 6, lesson: 's6.l5', skill: 's6.checker' } as Item, { kind: 'multi', ids: pick });
        expect(model.specific).toBe(true);
        expect(model.title).toMatch(/^Your answer (leaves out|turns over) the card that shows “.+,” (and|but) /);
        const named = it.choices.find((c) => model.title.includes(`“${c.label},”`));
        expect(named, model.title).toBeDefined();
        // The named card is a real slip: left out and needed, or picked and not needed.
        expect(it.answer.includes(named!.id)).toBe(!pick.includes(named!.id));
      }
      // Each tip names the backs: a card to turn has a back that breaks the rule, a card to skip has backs that keep it.
      for (const [id, tip] of [...Object.entries(it.missTips!), ...Object.entries(it.pickTips!)]) {
        const m = tip.match(/With (.+?)(?: or (.+?))? on the back, the rule is (broken|kept)\./);
        expect(m, tip).not.toBeNull();
        const backs = [m![1], m![2]].filter((b): b is string => !!b).map((b) => readBack(x.skin, b));
        for (const b of backs) {
          const c = cardCase(faces[id], b);
          expect(ruleOk(c.p, c.q), tip).toBe(m![3] === 'kept');
        }
        // The first sentence (the title when it is the first tip) names the card's gap, by the part its face shows.
        const gap = tip.match(/^Your answer (?:leaves out|turns over) the card that shows “.+?,” but (.+?)\./)![1];
        const face = faces[id];
        const happened = (part: 'IF' | 'THEN', v: boolean) => `the ${part} part ${v ? 'happened' : 'did not happen'}`;
        // A card to turn: the case that breaks the rule says what its back shows. A card to skip: what its face says.
        const breaking = CASES.find((c) => value(face, c.p, c.q) && !ruleOk(c.p, c.q));
        const want = breaking
          ? `its back could show ${aboutP(face) ? happened('THEN', breaking.q) : happened('IF', breaking.p)}`
          : `${aboutP(face) ? happened('IF', value(face, true, true)) : happened('THEN', value(face, true, true)).replace('happened', 'already happened')} there`;
        expect(gap, tip).toBe(want);
        expect(backs.length).toBe(bruteTurn(faces[id]) ? 1 : 2);
        expect(bruteTurn(faces[id])).toBe(id in it.missTips!);
      }
    }
  });

  it('T-fresh: a miss gets the same skill in a new story, then its boundary partner', () => {
    const items: Item[] = [];
    for (let seed = 1; seed <= 12; seed++) for (const l of stop6.lessons) items.push(...l.practice(createRng(seed)));
    const partner: Record<string, string> = {
      's6.forward': 's6.backward',
      's6.backward': 's6.forward',
      's6.move-if': 's6.trap-then',
      's6.trap-then': 's6.move-if',
      's6.move-not-then': 's6.trap-not-if',
      's6.trap-not-if': 's6.move-not-then',
      's6.did-break': 's6.did-break',
      's6.same-yesno': 's6.same-yesno',
      's6.checker-card': 's6.checker-card',
    };
    const seen = new Set<string>();
    items.forEach((item, k) => {
      const set = freshCheckSet(stop6, item, 100 + k, [], 1);
      seen.add(item.skill);
      expect(set.length, item.skill).toBe(partner[item.skill] ? 2 : 1);
      expect(set[0].skill).toBe(item.skill);
      for (const x of set) expect(x.lesson).toBe(item.lesson);
      expect(new Set([item, ...set].map(looks)).size).toBe(set.length + 1);
      // Another story: other people and other objects. In the same story, a P and Q case list or a set of word cards
      // would come back as the same labels in a new order, so the labels as a set must differ too.
      for (const x of set) expect(skinOfScene(x), item.skill).not.toBe(skinOfScene(item));
      const labels = (it: Item) => (it.kind === 'choose' || it.kind === 'multi' ? it.choices.map((c) => c.label).sort().join('|') : '');
      if (['s6.who-broke', 's6.same-pick', 's6.checker'].includes(item.skill)) expect(labels(set[0]), item.skill).not.toBe(labels(item));
      if (!partner[item.skill]) return;
      expect(set[1].skill).toBe(partner[item.skill]);
      const [a, b] = set as ChooseItem[];
      const was = item as ChooseItem;
      if (item.skill === 's6.did-break') {
        // Read the case from the question (letters show their own symbols, so read those by kind).
        const read = (it: ChooseItem): Row => {
          const s = SKINS[skinOfScene(it)];
          const first = it.prompt.split(/(?<=\.) /)[0];
          if (skinOfScene(it) !== 'letters') return readCase(s, first, { vowel: 'E', consonant: 'K', even: '4', odd: '7' }, true);
          return { p: /has a vowel/.test(first), q: /an even number/.test(first) };
        };
        const r0 = read(was), r1 = read(a), r2 = read(b);
        expect(r1).toEqual(r0);
        // A kept case pairs with the one case that breaks the rule; the break pairs with no IF part and no THEN part.
        expect(keyOf(r2.p, r2.q)).toBe(ruleOk(r0.p, r0.q) ? 'TF' : 'FF');
      }
      if (item.skill === 's6.did-break' || item.skill === 's6.same-yesno' || item.skill === 's6.checker-card') {
        expect(a.answer).toBe(was.answer);
        expect(b.answer).not.toBe(a.answer);
      }
      if (item.skill === 's6.checker-card') {
        const face = (it: ChooseItem) => readFace(skinOfScene(it), it.prompt.match(/One card shows “(.+)\.”/)![1]);
        expect(face(a)).toBe(face(was));
        expect(aboutP(face(b))).toBe(aboutP(face(a)));
      }
      if (item.skill === 's6.forward' || item.skill === 's6.backward') {
        // The same sentence about the other part: the THEN part or NOT the THEN part, the IF part or NOT the IF part.
        const asked = (it: ChooseItem) => {
          const s = SKINS[skinOfScene(it)];
          const [, , t] = it.prompt.match(/^(.+?\.) Is this sentence true for sure, false for sure, or can’t you tell\? “(.+)”$/)!;
          return readFact(s, t).lit;
        };
        expect(asked(a)).toBe(asked(was));
        expect(a.answer).toBe(was.answer);
      }
      if (item.skill === 's6.same-yesno') {
        // The same rewrite again (flip and NOT, flip only or NOT only), then the boundary partner.
        const asked = (it: ChooseItem) => readCond(skinOfScene(it), it.prompt.match(/“(.+)”$/)![1]);
        expect(asked(a)).toEqual(asked(was));
        expect(bruteSame(asked(b), RULE)).toBe(!bruteSame(asked(a), RULE));
      }
    });
    expect([...seen].sort()).toEqual([...Object.keys(partner), 's6.who-broke', 's6.same-pick', 's6.checker'].sort());
  });

  it('T-read: each item’s full text reads at grade 7 or lower, with quotes and words as the content guide asks', () => {
    // Every generator, skin and variant, on 8 seeds (the words vary only by name and symbol after that).
    for (const x of allMade().filter((y) => y.seed <= 8)) {
      const it = x.m.item as Item;
      const all = texts(it);
      checkLines(all);
      expect(fkGrade(all.join('\n')), `${x.gen} ${x.skin}`).toBeLessThanOrEqual(7);
      const teach = [...teachStrings(it), ...(it.kind === 'multi' ? [...Object.values(it.pickTips ?? {}), ...Object.values(it.missTips ?? {})] : [])].join('\n');
      expect(teach).not.toMatch(/that row|the opposite|\bWrong\b|Try again|Can't|Cant tell/i);
      // "both" always says what it refers to.
      for (const m of teach.matchAll(/[^.\n]*\bboth\b[^.\n]*/g)) expect(m[0], m[0]).toMatch(/both parts|the IF part and the THEN part both|P and Q are both/i);
    }
  });
});

// ---------- review fixes (regressions) ----------
//
// R-words  a headline never leans on a word the explanation does not define ("uses the rule backward" in lesson 3,
//          where "backward" is never taught; "differ" where the lesson defines "mean the same"), an idiom ("rules
//          out") or a vague verb ("decides the THEN part").
// R-terms  every term reads as a definition: "X means Y", never "X means when …".
// R-card   one card: skipping the IF card and skipping the NOT THEN card name the part the card's back could show.
// R-simple the rule checker's simpler example walks the card most people miss and the trap, each back worked out again.
// R-quote  "Which sentence means the same?" quotes the flip and NOT sentence its cases test.
// R-short  rule-checker tips stay short, so the joined paragraph grade() makes still fits the panel.

describe('stop 6 review fixes', () => {
  /** Every headline and detail line a wrong answer can show, for every item. */
  function feedbackLines(it: CondMade['item']): string[] {
    if (it.kind === 'choose') return Object.values(it.feedback ?? {}).flatMap((fb) => [fb.headline, ...fb.detail]);
    return [...Object.values(it.missTips ?? {}), ...Object.values(it.pickTips ?? {})];
  }
  const LOOK = /^(?:Now l|L)ook at the card that shows “(.+)\.”$/;

  it('R-words: no undefined “backward”, no idiom, no vague verb in what a wrong answer shows', () => {
    for (const x of allMade()) {
      for (const line of feedbackLines(x.m.item)) {
        expect(line, `${x.gen} ${x.skin}`).not.toMatch(/\brules? out\b|\bdecides?\b|describes a case|\buses the rule\b|\bdiffer\b/i);
        // "Backward" is spelled out where it is used: from the THEN part to the IF part.
        for (const s of sentences(line)) if (/backward/i.test(s)) expect(s).toContain('from the THEN part to the IF part');
      }
    }
  });

  it('R-terms: every term reads as a definition, never “means when”', () => {
    for (const x of allMade()) for (const t of x.m.item.teach!.terms ?? []) expect(t.meaning, t.word).not.toMatch(/^(when|if)\b/i);
  });

  it('R-card: skipping a card to turn names the part its face shows and the part its back could show', () => {
    for (const x of allMade().filter((y) => y.gen === 'card')) {
      const it = x.m.item as ChooseItem;
      const face = readFace(x.skin, it.prompt.match(/One card shows “(.+)\.”/)![1]);
      if (!bruteTurn(face)) continue;
      const breaking = CASES.find((c) => value(face, c.p, c.q) && !ruleOk(c.p, c.q))!;
      const said = (part: 'IF' | 'THEN', v: boolean) => `the ${part} part ${v ? 'happened' : 'did not happen'}`;
      // The face is about one part, the back about the other, and the case that breaks the rule fixes both.
      const front = aboutP(face) ? said('IF', breaking.p) : said('THEN', breaking.q);
      const back = aboutP(face) ? said('THEN', breaking.q) : said('IF', breaking.p);
      expect(it.feedback!.no.headline).toBe(`Your answer skips a card where ${front}, but its back could show ${back}.`);
    }
  });

  it('R-simple: the rule checker’s simpler example walks the NOT THEN card and the THEN card, back by back', () => {
    for (const x of allMade().filter((y) => y.gen === 'checker')) {
      const steps = x.m.item.teach!.simpler!;
      const faces = steps.map((s) => s.match(LOOK)?.[1]).filter((s): s is string => !!s).map((l) => readFace(x.skin, l));
      expect(faces).toEqual(['notQ', 'Q']);
      let face: Lit | null = null;
      for (const s of steps) {
        const l = s.match(LOOK);
        if (l) {
          face = readFace(x.skin, l[1]);
          continue;
        }
        const b = s.match(/^If its back shows (.+?),”? the rule is (kept|broken)\.$/);
        if (b) {
          const c = cardCase(face!, readBack(x.skin, b[1].startsWith('“') ? `${b[1]}”` : b[1]));
          expect(ruleOk(c.p, c.q), s).toBe(b[2] === 'kept');
          continue;
        }
        expect(s).toBe(bruteTurn(face!) ? 'One back breaks the rule. So you must turn this card over.' : 'No back breaks the rule. So you do not need to turn this card over.');
      }
    }
  });

  it('R-quote: the same-pick teaching quotes the flip and NOT sentence it tests', () => {
    for (const x of allMade().filter((y) => y.gen === 'pick')) {
      const q = x.m.item.teach!.meaning!.match(/The flip and NOT sentence is “(.+)\.”$/);
      expect(q, x.m.item.teach!.meaning).not.toBeNull();
      expect(readCond(x.skin, `${q![1]}.`)).toEqual(FLIP_AND_NOT);
      expect(bruteSame(FLIP_AND_NOT, RULE)).toBe(true);
    }
  });

  it('R-short: each rule-checker tip is short, and the classic miss (the IF card and the THEN card) stays short', () => {
    for (const x of allMade().filter((y) => y.gen === 'checker')) {
      const it = x.m.item as MultiItem;
      for (const tip of [...Object.values(it.missTips!), ...Object.values(it.pickTips!)]) expect(words(tip).length, tip).toBeLessThanOrEqual(40);
      const faces = Object.fromEntries(it.choices.map((c) => [readFace(x.skin, c.label), c.id])) as Record<Lit, string>;
      const g = grade(it as Item, { kind: 'multi', ids: [faces.P, faces.Q] });
      expect(g.correct).toBe(false);
      expect(words(g.feedback).length, g.feedback).toBeLessThanOrEqual(80);
    }
  });
});

// ---------- See -> Do -> Quiz (the skill-drill handoff, 2 Oct 2026) ----------
//
// D-boards  each lesson's boards are the ones listed, phone-sized, and only right marks pass: tapping Next, or one
//           option everywhere, does not. No board asks the quiz's final question.
// D-see     each board is a key-idea card's board (the same scene), or the red card and hat twin, which says what
//           changed; each lesson has a card that marks a case on that board.
// D-l1..l5  every mark is worked out again from the words on the board (row and column names, case sentences, card
//           faces and backs, the quoted sentences), by the brute force at the top of this file. The handoff's samples
//           are checked as written.
// D-why     every wrong tap gets its own words, about that box, case, sentence or card, that say the right mark.
// D-quiz    practice, the check, the Arcade and new examples use only the rule families the lessons teach.
// D-hint    every practice hint shows one case already marked, never the answer's case, with its truths worked out again.

describe('stop 6: See -> Do -> Quiz (skill-drill handoff)', () => {
  const BOARDS: Record<string, DrillStep[]> = {
    's6.l1': [L1_DRILL, L1_TWIN],
    's6.l2': [L2_BOXES, L2_BACK, L2_FWD],
    's6.l3': [L3_HAPPENED, L3_NOT],
    's6.l4': [L4_SAME, L4_TRAPS],
    's6.l5': [L5_CARDS, L5_LETTERS],
  };
  const ALL_BOARDS = Object.values(BOARDS).flat();
  /** The four-box boards: lesson 1's two, and lesson 2's pet rule (marked by hand before it is turned around). */
  const FOUR_BOXES = [L1_DRILL, L1_TWIN, L2_BOXES];
  const asGrid = (s: Scene | undefined): Extract<Scene, { kind: 'grid' }> => {
    if (s?.kind !== 'grid') throw new Error('grid');
    return s;
  };
  const right = (st: DrillStep) => Object.fromEntries(marksToTap(st).map((m) => [m.id, m.answer]));
  const unquote = (s: string) => s.replace(/^“/, '').replace(/”$/, '');
  /** A fact read from the board's words, or null when the sentence is not a fact about a pet. */
  const tryFact = (text: string) => {
    try {
      return readFact(SKINS.pets, text);
    } catch {
      return null;
    }
  };
  /** A case sentence about a named pet: "Rex is not a dog and has four legs." */
  function readPetCase(text: string): { name: string; row: Row } {
    const s = SKINS.pets;
    const hits = s.names.flatMap((name) => ROWS.filter((r) => `${s.says(name, r)}.` === text).map((row) => ({ name, row })));
    if (hits.length !== 1) throw new Error(`cannot read case: ${text}`);
    return hits[0];
  }
  /** The fact each pet's cases fit, read from the board's first paragraph. */
  function factsOf(st: DrillStep): Record<string, Lit> {
    const out: Record<string, Lit> = {};
    for (const s of sentences(st.body[0])) {
      const f = tryFact(s);
      if (f) out[f.name] = f.lit;
    }
    return out;
  }
  /** The other part's sentence that must follow from a fact, by the brute force; null when nothing follows. */
  const bruteFollows = (fact: Lit) => LITS.find((t) => aboutP(t) !== aboutP(fact) && bruteStatus(fact, t) === 'must') ?? null;

  it('D-boards: each lesson’s boards, phone-sized; only right marks pass; no board asks the quiz’s final question', () => {
    for (const l of stop6.lessons) {
      expect(l.drill, l.id).toEqual(BOARDS[l.id]);
      l.drill!.forEach((st, k) => expect(st, `${l.id} board ${k + 1}`).toBe(BOARDS[l.id][k]));
      // The default pass rule: the boards, then 3 right on the first try with no hint.
      expect(l.pass, l.id).toBeUndefined();
    }
    for (const st of ALL_BOARDS) {
      const tap = marksToTap(st);
      expect(tap.length, st.id).toBeGreaterThan(0);
      expect(tap.length, `${st.id}: about 12 taps or fewer`).toBeLessThanOrEqual(12);
      // Tapping Next alone does not pass: nothing is marked yet.
      expect(checkDrill(st, {}).done, st.id).toBe(false);
      expect(checkDrill(st, right(st)).done, st.id).toBe(true);
      // One option everywhere does not pass either (the first option, then the last).
      for (const pick of [(m: (typeof tap)[number]) => m.options[0].id, (m: (typeof tap)[number]) => m.options[m.options.length - 1].id]) {
        expect(checkDrill(st, Object.fromEntries(tap.map((m) => [m.id, pick(m)]))).done, `${st.id}: one option everywhere`).toBe(false);
      }
      // Marks only: true or false, yes or no (✓ or ✗), kept or broken. No "who broke it?", no status or "what follows?".
      for (const m of st.rows.flatMap((r) => r.marks)) for (const o of m.options) expect(['true', 'false', 'yes', 'no', 'holds', 'crashes'], `${st.id} ${m.id}`).toContain(o.id);
      expect([st.title, ...st.body].join(' '), st.id).not.toMatch(/\bWhich\b|broke the rule\?|follows for sure\?|true for sure, false for sure/);
      if (st.columns) for (const r of st.rows) expect(r.marks.length, `${st.id} ${r.id}`).toBe(st.columns.length);
    }
  });

  it('D-see: each board is a key-idea card’s board, or the hat twin that says so; each lesson’s card marks a case', () => {
    for (const l of stop6.lessons) {
      const scenes = l.ideas.filter((c) => c.scene).map((c) => JSON.stringify(c.scene));
      for (const st of l.drill!) {
        if (st === L1_TWIN) {
          expect(scenes).not.toContain(JSON.stringify(st.scene));
          expect(st.twin).toBe('The same four boxes, with a new rule: a red card and a hat.');
          continue;
        }
        expect(scenes, `${st.id}: the same board as a key-idea card`).toContain(JSON.stringify(st.scene));
        expect(st.twin, st.id).toBeUndefined();
      }
    }
    const [l1, l2, l3, l4, l5] = stop6.lessons;
    // Lesson 1: four boxes, three ✓ and one ✗, the ✗ named "the break" on the grid and in the words.
    expect(l1.ideas[1].scene).toBe(L1_SEE);
    const see = asGrid(L1_SEE);
    const seeMarks = see.rows.flatMap((r) => see.cols.map((c) => see.marks[r.id][c.id]));
    expect(seeMarks.filter((m) => m === 'yes').length).toBe(3);
    expect(see.marks.P.notQ).toBe('no');
    expect(see.caption).toBe('✓ means the rule is kept. The one ✗ is the break: “Dessert” with “Left some veggies.”');
    expect(l1.ideas[1].body.join(' ')).toContain('The one ✗ is the break');
    // The Do grid is the See grid emptied: the same row and column names, the same right marks, nothing given.
    expect(L1_DRILL.rows.map((r) => r.label)).toEqual(see.rows.map((r) => r.label));
    expect(L1_DRILL.columns).toEqual(see.cols.map((c) => c.label));
    expect(L1_DRILL.rows.flatMap((r) => r.marks.map((m) => m.answer))).toEqual(seeMarks);
    expect(L1_DRILL.rows.flatMap((r) => r.marks).some((m) => m.given)).toBe(false);
    // Lesson 2: Rex as a cat, marked in words on the pet board (always true here); it is the board's shown case.
    expect(l2.ideas[2].scene).toBe(PETS_KEPT);
    expect(PETS_KEPT).toEqual(ruleScene('pets', true));
    expect(l2.ideas[2].body.join(' ')).toMatch(/Rex could be a cat with four legs\. That case keeps the rule, so it can happen\. In it, “Rex is a dog” is false\./);
    const shownRex = L2_BACK.rows.find((r) => r.marks.every((m) => m.given))!;
    expect(readPetCase(shownRex.label).row).toEqual({ p: false, q: true });
    // Lesson 3: Rex as a dog, both cases marked in words on the same board.
    expect(l3.ideas[1].scene).toBe(PETS_KEPT);
    expect(l3.ideas[1].body.join(' ')).toMatch(/so that case can happen\..*so it can’t happen\./);
    // Lesson 4: the four cases, every sentence marked: the See grid's marks are the Do boards' right marks.
    const g = asGrid(l4.ideas[1].scene);
    for (const st of [L4_SAME, L4_TRAPS]) {
      for (const r of st.rows) {
        r.marks.forEach((m, k) => {
          const col = g.cols.find((c) => c.label === st.columns![k])!;
          expect(m.answer, `${st.id} ${r.id} ${col.label}`).toBe(g.marks[r.id][col.id]);
        });
      }
    }
    // Lesson 5: the “Dessert” card marked back by back on the lunchroom board, then the turn.
    expect(l5.ideas[1].scene).toEqual(ruleScene('dessert'));
    expect(l5.ideas[1].body.join(' ')).toMatch(/With “Ate all veggies,” the rule is kept\. With “Left some veggies,” that kid broke the rule\..*must turn this card over/);
  });

  it('D-l1: the four boxes, worked out again from the board’s names; the handoff’s red card and hat sample: ✓ ✗ ✓ ✓', () => {
    for (const st of FOUR_BOXES) {
      if (st.scene?.kind !== 'text') throw new Error('rule card');
      const m = st.scene.lines[1].match(/^If (.+), then (.+)\.$/);
      expect(m, st.scene.lines[1]).not.toBeNull();
      const [, ifPart, thenPart] = m!;
      const setting = st.scene.lines[0].toLowerCase();
      /**
       * Which part a row or column name is about, and whether that part happened. The lunchroom names are read as card
       * faces. The hat rule's names are read from its words: a name the IF part or the THEN part says happened; "No hat"
       * did not; and the other card the first line names ("a red card or a blue card") is NOT the IF part.
       */
      const read = (name: string): { part: 'p' | 'q'; v: boolean } => {
        if (st === L1_DRILL) {
          const l = readFace('dessert', name);
          return { part: aboutP(l) ? 'p' : 'q', v: l === 'P' || l === 'Q' };
        }
        const n = name.toLowerCase();
        // A name that says a part did not happen ("Not a dog", "Not four legs", "No hat"), read first.
        if (/^not /.test(n) && ifPart.includes(n.slice(4))) return { part: 'p', v: false };
        if (/^not /.test(n) && thenPart.includes(n.slice(4))) return { part: 'q', v: false };
        if (/^no /.test(n) && thenPart.includes(n.slice(3))) return { part: 'q', v: false };
        if (ifPart.includes(n)) return { part: 'p', v: true };
        if (thenPart.includes(n)) return { part: 'q', v: true };
        if (/ card$/.test(n) && setting.includes(n)) return { part: 'p', v: false };
        throw new Error(`cannot read the name ${name}`);
      };
      const breaks: string[] = [];
      for (const r of st.rows) {
        const row = read(r.label);
        expect(row.part, `${st.id}: rows are the IF part`).toBe('p');
        r.marks.forEach((mk, k) => {
          const col = st.columns![k];
          expect(mk.label).toBe(col);
          const c = read(col);
          expect(c.part, `${st.id}: columns are the THEN part`).toBe('q');
          expect(mk.answer, `${st.id} ${r.label} – ${col}`).toBe(ruleOk(row.v, c.v) ? 'yes' : 'no');
          if (mk.answer === 'no') {
            breaks.push(`${r.label} – ${col}`);
            expect([row.v, c.v], `${st.id}: the break is IF yes, THEN no`).toEqual([true, false]);
          }
        });
      }
      expect(breaks.length, `${st.id}: the only ✗ is the break`).toBe(1);
    }
    // The handoff's sample, as written: red card and hat ✓, red card and no hat ✗ (the only break), blue card and
    // hat ✓, blue card and no hat ✓.
    expect(L1_TWIN.scene).toEqual({ kind: 'text', lines: ['Each kid in the game holds a red card or a blue card.', 'If a kid is holding a red card, then they are wearing a hat.'] });
    expect(L1_TWIN.rows.map((r) => [r.label, ...r.marks.map((mk) => `${mk.label} ${mk.answer === 'yes' ? '✓' : '✗'}`)])).toEqual([
      ['Red card', 'Hat ✓', 'No hat ✗'],
      ['Blue card', 'Hat ✓', 'No hat ✓'],
    ]);
    expect(L1_DRILL.rows.map((r) => [r.label, ...r.marks.map((mk) => `${mk.label} ${mk.answer === 'yes' ? '✓' : '✗'}`)])).toEqual([
      ['Dessert', 'Ate all veggies ✓', 'Left some veggies ✗'],
      ['No dessert', 'Ate all veggies ✓', 'Left some veggies ✓'],
    ]);
  });

  it('D-l2 and D-l3: every case read back from its sentence; can it happen, and each sentence, worked out again', () => {
    for (const st of [L2_BACK, L2_FWD, L3_HAPPENED, L3_NOT]) {
      expect(st.scene).toEqual(ruleScene('pets', true));
      const facts = factsOf(st);
      expect(Object.keys(facts).length, st.id).toBeGreaterThan(0);
      const byName: Record<string, { row: Row; given: boolean }[]> = {};
      for (const r of st.rows) {
        const { name, row } = readPetCase(r.label);
        const fact = facts[name];
        expect(fact, `${st.id}: a fact about ${name}`).toBeDefined();
        expect(value(fact, row.p, row.q), `${r.label} fits “${name}”’s fact`).toBe(true);
        const given = r.marks.every((m) => m.given);
        expect(given || r.marks.every((m) => !m.given), `${st.id} ${r.id}: a row is all shown or all to tap`).toBe(true);
        (byName[name] ??= []).push({ row, given });
        for (const m of r.marks) {
          if (m.label === 'Can this case happen?') {
            expect(m.answer, `${r.label} can happen`).toBe(ruleOk(row.p, row.q) ? 'yes' : 'no');
            continue;
          }
          const said = readFact(SKINS.pets, unquote(m.label));
          expect(said.name).toBe(name);
          expect(aboutP(said.lit), `${m.label} is about the other part`).not.toBe(aboutP(fact));
          expect(m.answer, `${r.label}: ${m.label}`).toBe(value(said.lit, row.p, row.q) ? 'true' : 'false');
        }
      }
      // Each pet: the two cases that fit its fact, one shown and one to mark.
      for (const [name, rows] of Object.entries(byName)) {
        const want = CASES.filter((c) => value(facts[name], c.p, c.q)).map((c) => keyOf(c.p, c.q)).sort();
        expect(rows.map((x) => keyOf(x.row.p, x.row.q)).sort(), `${st.id} ${name}`).toEqual(want);
        expect(rows.filter((x) => x.given).length).toBe(1);
      }
      // The last words say what the marks settle, worked out by the brute force.
      for (const [name, fact] of Object.entries(facts)) {
        if (st === L2_BACK || st === L2_FWD) {
          for (const r of st.rows.filter((x) => readPetCase(x.label).name === name).slice(0, 1)) {
            for (const m of r.marks.filter((x) => x.label !== 'Can this case happen?')) {
              const t = readFact(SKINS.pets, unquote(m.label)).lit;
              const q = `“${SKINS.pets.fact(t, name)}”`;
              const s = bruteStatus(fact, t);
              expect(st.done).toContain(s === 'must' ? `${q} is true in it, so it is true for sure.` : s === 'never' ? `${q} is false in it, so it is false for sure.` : `${q} is true in one and false in the other, so you can’t tell.`);
            }
          }
        } else {
          const got = bruteFollows(fact);
          expect(st.done).toContain(got ? `For ${name}, only one case can happen, so “${SKINS.pets.fact(got, name)}” follows for sure.` : `For ${name}, two cases can happen, so nothing follows for sure.`);
        }
      }
    }
    // Lesson 2 marks going backward (Rex has four legs) and forward (Max is a dog), every sentence the quiz can ask.
    expect(factsOf(L2_BACK)).toEqual({ Rex: 'Q' });
    expect(factsOf(L2_FWD)).toEqual({ Max: 'P' });
    const said = (st: DrillStep) => [...new Set(st.rows.flatMap((r) => r.marks.filter((m) => m.label !== 'Can this case happen?').map((m) => readFact(SKINS.pets, unquote(m.label)).lit)))].sort();
    expect(said(L2_BACK)).toEqual(['P', 'notP']);
    expect(said(L2_FWD)).toEqual(['Q', 'notQ']);
    // Lesson 3 marks all four moves: one fact of each kind.
    expect(Object.values({ ...factsOf(L3_HAPPENED), ...factsOf(L3_NOT) }).sort()).toEqual([...LITS].sort());
    // In each lesson the learner marks a case that can't happen and one that can: tapping "Yes" everywhere fails.
    for (const pair of [[L2_BACK, L2_FWD], [L3_HAPPENED, L3_NOT]]) {
      const can = pair.flatMap((st) => marksToTap(st).filter((m) => m.label === 'Can this case happen?').map((m) => m.answer));
      expect(new Set(can)).toEqual(new Set(['yes', 'no']));
    }
  });

  it('D-l4: each box worked out again from the sentence the board quotes, and the rule’s boxes are the shown case', () => {
    const NAMES: Record<string, Cond> = { 'The rule': RULE };
    for (const st of [L4_SAME, L4_TRAPS]) {
      expect(st.scene).toEqual(stop6.lessons[3].ideas[0].scene);
      // Read each column's sentence from the board's words ("Flip only: “If it has four legs, then it is a dog.”").
      for (const line of st.body) {
        const m = line.match(/^(Flip and NOT|Flip only|NOT only): “(.+?)”/);
        if (m) NAMES[m[1]] = readCond('pets', m[2]);
      }
      for (const col of st.columns!) expect(NAMES[col], `${st.id}: the board quotes “${col}”`).toBeDefined();
      for (const r of st.rows) {
        const row = readKase(SKINS.pets, `${r.label}.`);
        r.marks.forEach((m, k) => {
          const col = st.columns![k];
          expect(m.label).toBe(col);
          expect(!!m.given, `${st.id} ${r.id} ${col}: only the rule’s box is shown`).toBe(col === 'The rule');
          expect(m.answer, `${r.label} – ${col}`).toBe(condOk(NAMES[col], row.p, row.q) ? 'yes' : 'no');
        });
      }
    }
    // What each name means, checked by its parts: flip swaps the parts, NOT goes in both parts.
    expect(NAMES['Flip and NOT']).toEqual(FLIP_AND_NOT);
    expect(NAMES['Flip only']).toEqual({ a: 'Q', b: 'P' });
    expect(NAMES['NOT only']).toEqual({ a: 'notP', b: 'notQ' });
    // The last words: the same case breaks the rule and flip and NOT; a cat with four legs tells the other two apart.
    expect(bruteSame(NAMES['Flip and NOT'], RULE)).toBe(true);
    expect(L4_SAME.done).toContain('So the flip and NOT sentence means the same as the rule.');
    expect(bruteSame(NAMES['Flip only'], RULE) || bruteSame(NAMES['NOT only'], RULE)).toBe(false);
    expect(L4_TRAPS.done).toContain('A cat with four legs keeps the rule but breaks the flip only sentence and the NOT only sentence. So neither one means the same as the rule.');
  });

  it('D-l5: each back worked out again from the card and back words; a card is turned when a back could break the rule', () => {
    for (const [st, skin] of [[L5_CARDS, 'dessert'], [L5_LETTERS, 'letters']] as const) {
      expect(skinOfScene({ scene: st.scene } as Item)).toBe(skin);
      const turned: Lit[] = [];
      const faceOf = (label: string) => label.match(/^The card that shows “(.+)\.”$/)![1];
      for (const r of st.rows) {
        const face = readFace(skin, faceOf(r.label));
        if (r.marks.some((m) => m.label === 'Turn it over?' && m.answer === 'yes')) expect(st.done).toContain(`the “${faceOf(r.label)}” card`);
        const backs: Lit[] = [];
        for (const m of r.marks) {
          if (m.label === 'Turn it over?') {
            expect(m.answer, `${r.label} turn`).toBe(bruteTurn(face) ? 'yes' : 'no');
            if (m.answer === 'yes') turned.push(face);
            continue;
          }
          const text = m.label.replace(/ on the back$/, '');
          const back = readBack(skin, skin === 'letters' ? text.charAt(0).toLowerCase() + text.slice(1) : text);
          expect(aboutP(back), `${r.label}: a back is about the other part`).not.toBe(aboutP(face));
          backs.push(back);
          const c = cardCase(face, back);
          expect(m.answer, `${r.label} with ${text}`).toBe(ruleOk(c.p, c.q) ? 'holds' : 'crashes');
        }
        expect(backs.length, `${r.label}: both backs`).toBe(2);
        expect(new Set(backs).size).toBe(2);
      }
      // The IF card is the shown case; the NOT THEN card (the one most people miss) and the THEN card (the trap) are marked.
      const shown = st.rows.filter((r) => r.marks.every((m) => m.given)).map((r) => readFace(skin, faceOf(r.label)));
      expect(shown).toEqual(['P']);
      const marked = st.rows.filter((r) => r.marks.every((m) => !m.given)).map((r) => readFace(skin, faceOf(r.label)));
      expect(marked).toEqual(expect.arrayContaining(['notQ', 'Q']));
      expect(turned.sort()).toEqual(['P', 'notQ'].sort());
    }
  });

  it('D-why: every wrong tap gets its own words, about that box, case, sentence or card, saying the right mark', () => {
    for (const st of ALL_BOARDS) {
      for (const r of st.rows) {
        for (const m of r.marks.filter((x) => !x.given)) {
          for (const o of m.options.filter((x) => x.id !== m.answer)) {
            const why = m.why[o.id];
            expect(why, `${st.id} ${m.id}: words for a wrong “${o.label}”`).toBeTruthy();
            // It names what it is about: the case or card on this row, or the sentence on this mark.
            if (FOUR_BOXES.includes(st)) expect(why).toMatch(/^This box is for /);
            else if (st.columns) expect(why.startsWith(`${r.label}:`), why).toBe(true);
            else if (m.label === 'Can this case happen?') expect(why.startsWith(r.label), why).toBe(true);
            else if (m.label === 'Turn it over?') expect(why).toMatch(/on the back, the rule is (broken|kept)\./);
            else if (/on the back$/.test(m.label)) expect(why.startsWith(`With ${m.label.charAt(0) === '“' ? m.label.replace(/ on the back$/, '') : m.label.charAt(0).toLowerCase() + m.label.slice(1).replace(/ on the back$/, '')} on the back`), why).toBe(true);
            else expect(why).toContain(unquote(m.label).replace(/\.$/, ''));
            // And it says the right mark, not the one tapped.
            const says: Record<string, RegExp> = {
              yes: m.label === 'Can this case happen?' ? /so this case can happen|This case can happen/ : m.label === 'Turn it over?' ? /you must turn this card over/ : /gets a ✓, not a ✗/,
              no: m.label === 'Can this case happen?' ? /can’t happen/ : m.label === 'Turn it over?' ? /you do not need to turn this card over/ : /gets (a|the) ✗, not a ✓/,
              true: /is true here, not false/,
              false: /is false here, not true/,
              holds: /That keeps the rule\./,
              crashes: /That breaks the rule\./,
            };
            expect(why, `${st.id} ${m.id}`).toMatch(says[m.answer]);
          }
        }
      }
      const text = [st.title, ...st.body, st.done, st.twin ?? '', st.caption ?? '', ...st.rows.flatMap((r) => [r.label, r.note ?? '', ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why)])])].filter(Boolean);
      checkLines(text);
      expect(fkGrade(text.join('\n')), st.id).toBeLessThanOrEqual(READING.maxGrade);
      const long = longestSentence(text.join('\n'));
      expect(long.words, `${st.id}: ${long.sentence}`).toBeLessThanOrEqual(READING.maxSentenceWords);
      expect(text.join(' '), st.id).not.toMatch(/\bWrong\b|that row|the opposite/);
      for (const b of text.join('\n').matchAll(/[^.\n]*\bboth\b[^.\n]*/g)) expect(b[0], b[0]).toMatch(/the IF part and the THEN part both/i);
    }
  });

  it('D-quiz: practice, the check, the Arcade and new examples use only the rule families the lessons teach', () => {
    const TAUGHT: Record<string, string[]> = {
      's6.l1': ['s6.who-broke', 's6.did-break'],
      's6.l2': ['s6.forward', 's6.backward'],
      's6.l3': ['s6.move-if', 's6.move-not-then', 's6.trap-then', 's6.trap-not-if'],
      's6.l4': ['s6.same-pick', 's6.same-yesno'],
      's6.l5': ['s6.checker', 's6.checker-card'],
    };
    /** A "which sentence means the same?" item offers only the three sentences lesson 4 marks. */
    const onlyMarked = (it: Item) => {
      if (it.skill !== 's6.same-pick' || it.kind !== 'choose') return;
      const conds = it.choices.map((c) => readCond(skinOfScene(it), c.label));
      expect(conds.length, it.prompt).toBe(3);
      for (const c of conds) expect([FLIP_AND_NOT, { a: 'Q', b: 'P' }, { a: 'notP', b: 'notQ' }]).toContainEqual(c);
    };
    /** Lesson 1 never turns a rule around: no item says its rule with the parts swapped. */
    const noTurnAround = (it: Item) => {
      if (it.lesson !== 's6.l1') return;
      const s = skinOfScene(it);
      const all = texts(it).join('\n');
      expect(all, it.prompt).not.toContain(condText(s, { a: 'Q', b: 'P' }).replace(/\.$/, ''));
      expect(all).not.toMatch(/turn(ed)? (it|the rule) around|flip/i);
    };
    const check = (it: Item) => {
      expect(TAUGHT[it.lesson], `${it.id} ${it.lesson}`).toContain(it.skill);
      onlyMarked(it);
      noTurnAround(it);
    };
    const used = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      for (const l of stop6.lessons) {
        const items = l.practice(createRng(seed));
        for (const it of items) {
          check(it);
          used.add(it.skill);
          if (seed <= 12) for (const x of freshCheckSet(stop6, it, 500 + seed, [], 1)) check(x);
        }
        // Lesson 1's pack: "who broke it?" and "did this break it?" on the four boxes, with the no-IF, no-THEN box.
        if (l.id === 's6.l1') expect(items.some((it) => it.kind === 'choose' && it.answer === 'no' && it.conflict), `seed ${seed}`).toBe(true);
      }
      stop6.check!(createRng(seed)).forEach(check);
    }
    for (let seed = 1; seed <= 300; seed++) check(stop6.practice!(createRng(seed)));
    expect([...used].sort()).toEqual(Object.values(TAUGHT).flat().sort());
    // Lesson 2 asks only the sentences its boards mark: the IF part or NOT the IF part when the THEN part is known,
    // and the THEN part or NOT the THEN part when the IF part is known.
    for (let seed = 1; seed <= 60; seed++) {
      for (const it of stop6.lessons[1].practice(createRng(seed))) {
        const s = SKINS[skinOfScene(it)];
        const [, f, t] = it.prompt.match(/^(.+?\.) Is this sentence true for sure, false for sure, or can’t you tell\? “(.+)”$/)!;
        const fact = readFact(s, f).lit;
        expect(['P', 'Q']).toContain(fact);
        expect(aboutP(readFact(s, t).lit)).toBe(!aboutP(fact));
      }
    }
  });

  it('D-hint: every practice hint shows one case already marked, never the answer’s case, its truths worked out again', () => {
    const SYM = { vowel: 'E', consonant: 'K', even: '4', odd: '7' };
    /** A lesson 1 case, read from its sentence (letter cards by what kind of symbol they show). */
    const l1Case = (it: Item, text: string): Row => {
      const s = skinOfScene(it);
      if (s === 'letters') return { p: /has a vowel/.test(text), q: /an even number/.test(text) };
      return readCase(SKINS[s], text, SYM, true);
    };
    const truth = (c: TeachCase, who: string) => c.truths!.find((t) => t.who === who)?.value;
    for (let seed = 1; seed <= 30; seed++) {
      for (const l of stop6.lessons) {
        for (const it of l.practice(createRng(seed))) {
          const c = it.hintCase!;
          expect(it.hint, it.id).toBeTruthy();
          expect(c, `${it.id}: the hint shows a marked case`).toBeDefined();
          expect(c.label.trim() && c.note?.trim() && c.truths?.length, it.id).toBeTruthy();
          checkLines([it.hint!, c.label, c.note!, ...c.truths!.map((t) => t.who)]);
          checkText(it);
          expect(it.hint).not.toMatch(/^(For each|First ask|Which part|Is the fact|Think of|Try a case|What could)/);
          const s = skinOfScene(it);
          const skin = SKINS[s];
          const kind = it.skill.replace('s6.', '');
          if (kind === 'who-broke' || kind === 'did-break') {
            const r = l1Case(it, c.label);
            expect([truth(c, 'The IF part'), truth(c, 'The THEN part'), truth(c, 'The rule')]).toEqual([r.p, r.q, ruleOk(r.p, r.q)]);
            if (kind === 'who-broke') expect(ruleOk(r.p, r.q), `${it.id}: not the answer (the break)`).toBe(true);
            else {
              const asked = l1Case(it, it.prompt.split(/(?<=\.) /)[0]);
              expect(keyOf(r.p, r.q), `${it.id}: another case, not the asked one`).not.toBe(keyOf(asked.p, asked.q));
              expect(r.p).toBe(asked.p);
              expect(c.label).not.toBe(it.prompt.split(/(?<=\.) /)[0]);
            }
          } else if (kind === 'forward' || kind === 'backward') {
            const [, f, t] = it.prompt.match(/^(.+?\.) Is this sentence true for sure, false for sure, or can’t you tell\? “(.+)”$/)!;
            const fact = readFact(skin, f).lit;
            const target = readFact(skin, t).lit;
            const r = readSays(skin, c.label);
            expect(value(fact, r.p, r.q), `${it.id}: the case fits the fact`).toBe(true);
            expect([truth(c, 'The IF part'), truth(c, 'The THEN part'), truth(c, 'The rule'), truth(c, 'The sentence')]).toEqual([r.p, r.q, ruleOk(r.p, r.q), value(target, r.p, r.q)]);
            expect(c.note).toMatch(ruleOk(r.p, r.q) ? /can happen\.$/ : /can’t happen here\.$/);
          } else if (['move-if', 'move-not-then', 'trap-then', 'trap-not-if'].includes(kind)) {
            const fact = readFact(skin, it.prompt.replace(/ What follows for sure\?$/, '')).lit;
            const r = readSays(skin, c.label);
            expect(value(fact, r.p, r.q)).toBe(true);
            expect([truth(c, 'The IF part'), truth(c, 'The THEN part'), truth(c, 'The rule')]).toEqual([r.p, r.q, ruleOk(r.p, r.q)]);
            // When something follows, the hint is the case that can't happen, never the case the answer stands on.
            const got = bruteFollows(fact);
            if (got) expect(ruleOk(r.p, r.q), `${it.id}: not the answer’s case`).toBe(false);
            else expect(ruleOk(r.p, r.q)).toBe(true);
          } else if (kind === 'same-pick') {
            const said = readCond(s, it.hint!.match(/“(.+)”/)![1]);
            expect(it.kind === 'choose' && it.choices.some((ch) => ch.label === condText(s, said))).toBe(true);
            expect(bruteSame(said, RULE), `${it.id}: the hint checks a wrong choice`).toBe(false);
            const r = readKase(skin, c.label);
            expect([truth(c, 'The rule'), truth(c, 'This sentence')]).toEqual([ruleOk(r.p, r.q), condOk(said, r.p, r.q)]);
            expect(truth(c, 'The rule')).not.toBe(truth(c, 'This sentence'));
          } else if (kind === 'same-yesno') {
            const asked = readCond(s, it.prompt.match(/“(.+)”$/)![1]);
            const r = readKase(skin, c.label);
            expect([truth(c, 'The rule'), truth(c, 'This sentence')]).toEqual([ruleOk(r.p, r.q), condOk(asked, r.p, r.q)]);
            // A case that keeps both, so the hint shows how to mark without giving the answer.
            expect(truth(c, 'The rule')).toBe(truth(c, 'This sentence'));
          } else {
            const face = readFace(s, c.label.match(/^The card that shows “(.+)\.”$/)![1]);
            for (const t of c.truths!) {
              const m = t.who.match(/^The rule with (.+) on the back$/);
              if (!m) {
                expect(t).toEqual({ who: 'You must turn it over', value: bruteTurn(face) });
                continue;
              }
              const k = cardCase(face, readBack(s, m[1]));
              expect(t.value, t.who).toBe(ruleOk(k.p, k.q));
            }
            if (kind === 'checker' && it.kind === 'multi') {
              expect(it.answer, `${it.id}: a card that is not in the answer`).not.toContain(it.choices.find((ch) => readFace(s, ch.label) === face)!.id);
            } else {
              const asked = readFace(s, it.prompt.match(/One card shows “(.+)\.”/)![1]);
              expect(face, `${it.id}: another card`).not.toBe(asked);
            }
          }
        }
      }
    }
  });
});

// ---------- review of the skill-drill build ----------
//
// R-order  the handoff puts any rule turned around (the converse trap, lesson 2) only after the four boxes are marked
//          by hand. Lessons can be opened in any order, so lesson 2 marks its own rule's four boxes, all by hand,
//          before its quiz. The board is its first card's rule card, and that card marks the cat's box in words.

describe('stop 6 review: the skill-drill build', () => {
  it('R-order: lesson 2 marks its rule’s four boxes by hand before any rule is turned around', () => {
    const l2 = stop6.lessons[1];
    const [first, ...rest] = l2.drill!;
    expect(first).toBe(L2_BOXES);
    expect(rest.length).toBeGreaterThan(0);
    // The four boxes: two rows by two columns, every box the learner's, one ✗.
    expect(first.columns?.length).toBe(2);
    expect(first.rows.length).toBe(2);
    const marks = first.rows.flatMap((r) => r.marks);
    expect(marks.length).toBe(4);
    expect(marks.every((m) => !m.given)).toBe(true);
    expect(marks.filter((m) => m.answer === 'no').length).toBe(1);
    // As written: Dog with Four legs ✓, Dog with Not four legs ✗ (the break), Not a dog with either ✓.
    expect(first.rows.map((r) => [r.label, ...r.marks.map((mk) => `${mk.label} ${mk.answer === 'yes' ? '✓' : '✗'}`)])).toEqual([
      ['Dog', 'Four legs ✓', 'Not four legs ✗'],
      ['Not a dog', 'Four legs ✓', 'Not four legs ✓'],
    ]);
    // Only right marks pass. Nothing marked, or a ✓ everywhere, does not.
    expect(checkDrill(first, {}).done).toBe(false);
    expect(checkDrill(first, Object.fromEntries(marks.map((m) => [m.id, 'yes']))).done).toBe(false);
    expect(checkDrill(first, Object.fromEntries(marks.map((m) => [m.id, m.answer]))).done).toBe(true);
    // The same board as the first card (“One way only”), whose words mark the cat's box against the rule and against
    // the rule turned around.
    const card = l2.ideas[0];
    expect(JSON.stringify(first.scene)).toBe(JSON.stringify(card.scene));
    expect(first.twin).toBeUndefined();
    const words = card.body.join(' ');
    expect(words).toContain(`“${condText('pets', { a: 'Q', b: 'P' })}”`);
    expect(words).toContain('The cat keeps the rule.');
    expect(words).toContain('But the cat breaks the turned-around sentence.');
    // The cat's box: kept by the rule, broken by the rule turned around (worked out by the brute force).
    expect([ruleOk(false, true), condOk({ a: 'Q', b: 'P' }, false, true)]).toEqual([true, false]);
    // And lesson 2's quiz does turn a rule around (a backward item) in every pack, so the boxes really come first.
    for (let seed = 1; seed <= 40; seed++) expect(l2.practice(createRng(seed)).some((it) => it.skill === 's6.backward'), `seed ${seed}`).toBe(true);
  });
});
