/**
 * Stop 6 if–then engine and the stop 6 content. The logic is checked against a separate brute force over
 * the four cases (p, q), and every item is re-solved from the words the player sees: the facts in the prompt,
 * the choice labels and the card faces are read back into cases, and the answer is worked out again here.
 */
import { describe, expect, it } from 'vitest';
import { stop6 } from '../../content/stop6';
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
import { sentences, words } from '../readability';
import { createRng } from '../rng';
import type { ChooseItem, Item, MultiItem } from '../types';

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
  const out = [it.prompt, it.explain, it.hint ?? ''];
  if (it.kind === 'choose') out.push(...Object.values(it.whyWrong ?? {}), ...it.choices.map((c) => c.label));
  if (it.kind === 'multi') out.push(...Object.values(it.pickTips ?? {}), ...Object.values(it.missTips ?? {}), ...it.choices.map((c) => c.label));
  if (it.scene?.kind === 'text') out.push(...it.scene.lines);
  return out.filter(Boolean);
}

function checkLines(lines: string[]) {
  for (const t of lines) {
    expect(t, 'straight quotes or apostrophes').not.toMatch(/['"]/);
    expect(t, 'punctuation after a closing quote').not.toMatch(/”[.,]/);
    expect(t, 'doubled space').not.toMatch(/ {2}/);
    expect(t, 'unfilled text').not.toMatch(/undefined|\$\{|\bnull\b/);
    expect((t.match(/“/g) ?? []).length, `unbalanced quotes: ${t}`).toBe((t.match(/”/g) ?? []).length);
    for (const s of sentences(t)) expect(words(s).length, s).toBeLessThanOrEqual(25);
  }
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
      const [, f, t] = it.prompt.match(/^(.+?\.) Look at this sentence: “(.+)” Is it true\?$/)!;
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

