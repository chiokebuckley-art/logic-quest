/**
 * Stop 1's kid forms (docs/KID-JOURNEY.md, "Round 2 fields"): the kid-only alternates of its quiz items (KidItem.alt)
 * and of its boards (KidBoard.alt), the picture tiles of lesson 2, re-derived here from the classic item or board they
 * replace. An alternate keeps the item's id, tags, lesson and skill, asks about the same case, and its answer is the
 * one the case gives (worked out again here, from the classic item's own words), never a typed one.
 */
import { describe, expect, it } from 'vitest';
import type { ChooseItem, Item, KidItem } from '../types';
import { KID_SHOW, KID_TWIN, L1_SHOWN, L2_KID, L3_DRILL, L3_KEYS, L3_KID, L4_DRILL, L4_KID, SENTENCES, TEACH_SENTENCES, isStatement, stop1 } from '../../content/stop1';
import { gradeById } from '../../content/grades';
import { kidItemOf } from '../../game/kidPlay';
import { practiceFor } from '../drill';
import { FRAMES, KINDS, holds, kidNotLine, notItem, say, type Card, type Stmt } from '../puzzles/statements';
import { fkGrade, longestSentence, sentences, words } from '../readability';
import { createRng } from '../rng';

const SEEDS = Array.from({ length: 40 }, (_, k) => k + 1);
const G1 = { grade: 'g1' as const, budget: gradeById('g1').budget, autoRead: false };
const lesson = (id: string) => stop1.lessons.find((l) => l.id === id)!;
const packs = (id: string): Item[] => SEEDS.flatMap((seed) => practiceFor(lesson(id), createRng(seed)));
const checks: Item[] = SEEDS.flatMap((seed) => stop1.check!(createRng(seed)));
const arcade: Item[] = SEEDS.map((seed) => stop1.practice!(createRng(seed)));
const all = [...packs('s1.l1'), ...packs('s1.l2'), ...packs('s1.l3'), ...packs('s1.l4'), ...checks, ...arcade];
const altOf = (it: Item) => it.kid?.alt as ChooseItem | undefined;
const kindOf = (text: string) => SENTENCES.find((s) => s.text === text)?.kind ?? Object.values(KID_TWIN).find((s) => s.text === text)?.kind;
const n = (x: string) => words(x).length;

/** Every kid string of an alternate, and the rules Grade 1 keeps (a Show me of 6 words, a nope of 4, a yes of 6, a hint of 8). */
function kidRules(k: KidItem, g1: boolean): string[] {
  const out = [k.prompt, k.nope, ...(k.yes ? [k.yes] : []), ...(k.hint ? [k.hint] : []), ...(k.show ? [k.show.label, ...(k.show.note ? [k.show.note] : [])] : [])];
  for (const s of out) {
    expect(s, s).not.toMatch(/['"]/);
    expect(s, s).not.toMatch(/[¬∧∨→↔✓✗<>=+*/\\#&%@|~^_]/);
    expect(s, s).not.toMatch(/\bwrong\b/i);
  }
  if (k.hint) expect(n(k.hint), k.hint).toBeLessThanOrEqual(8);
  if (g1) {
    expect(n(k.nope), k.nope).toBeLessThanOrEqual(4);
    if (k.yes) expect(n(k.yes), k.yes).toBeLessThanOrEqual(6);
    if (k.show) expect(n(`${k.show.label} ${k.show.note ?? ''}`), k.show.label).toBeLessThanOrEqual(6);
    for (const s of out) expect(longestSentence(s).words, s).toBeLessThanOrEqual(8);
  }
  return out;
}

describe('every kid alternate keeps the item it replaces: id, tags, lesson and skill', () => {
  it('kidItemOf swaps it in kid mode only, with the outer id and tags; the alternate has the same lesson and skill', () => {
    const withAlt = all.filter((it) => it.kid?.alt);
    expect(withAlt.length).toBeGreaterThan(100);
    for (const it of withAlt) {
      const alt = altOf(it)!;
      const drawn = kidItemOf(it, G1);
      expect(drawn.id).toBe(it.id);
      expect(drawn.tags).toEqual(it.tags);
      expect(drawn.kind).toBe('choose');
      expect(alt.lesson, it.id).toBe(it.lesson);
      expect(alt.skill, it.id).toBe(it.skill);
      expect(alt.stop).toBe(it.stop);
      expect(kidItemOf(it, null)).toBe(it);
      // A wrong answer of the alternate is taught: every wrong choice has its feedback.
      for (const c of alt.choices) if (c.id !== alt.answer) expect(alt.feedback?.[c.id], `${it.id} ${c.id}`).toBeTruthy();
    }
  });
});

describe('lesson 1: “Is it a statement?” about one sentence, a long one as its shorter twin', () => {
  it('each twin is the same kind, at most 6 words, and new: in no bank, card, board, Show me or teaching', () => {
    const long = SENTENCES.filter((s) => n(s.text) > 6).map((s) => s.text);
    expect(Object.keys(KID_TWIN).sort()).toEqual([...long].sort());
    const seen = new Set([...SENTENCES.map((s) => s.text), ...L1_SHOWN, ...Object.values(TEACH_SENTENCES).map((s) => s.text), ...Object.values(KID_SHOW).map((c) => c.label.replace(/[“”]/g, ''))]);
    for (const [text, twin] of Object.entries(KID_TWIN)) {
      expect(twin.kind, text).toBe(SENTENCES.find((s) => s.text === text)!.kind);
      expect(n(twin.text), twin.text).toBeLessThanOrEqual(6);
      expect(seen.has(twin.text), twin.text).toBe(false);
    }
  });

  it('“Is this a statement?” keeps a short sentence; a long one is asked as its twin, with the same answer', () => {
    const items = [...packs('s1.l1'), ...checks, ...arcade].filter((it): it is ChooseItem => it.kind === 'choose' && it.lesson === 's1.l1' && it.scene?.kind === 'text');
    expect(items.length).toBeGreaterThan(100);
    for (const it of items) {
      const text = (it.scene as { lines: string[] }).lines[0];
      const alt = altOf(it);
      if (n(text) <= 6) {
        expect(alt, text).toBeUndefined();
        continue;
      }
      const shown = (alt!.scene as { lines: string[] }).lines[0];
      expect(shown).toBe(KID_TWIN[text].text);
      expect(alt!.answer).toBe(it.answer);
      expect(alt!.answer).toBe(isStatement(kindOf(shown)!) ? 'yes' : 'no');
    }
  });

  it('“Which of these is (not) a statement?” asks about its answer sentence alone: a statement, yes or no', () => {
    const items = [...packs('s1.l1'), ...checks, ...arcade].filter((it): it is ChooseItem => it.kind === 'choose' && it.lesson === 's1.l1' && !it.scene);
    expect(items.length).toBeGreaterThan(20);
    for (const it of items) {
      const alt = altOf(it)!;
      const target = it.choices.find((c) => c.id === it.answer)!.label;
      const shown = (alt.scene as { lines: string[] }).lines[0];
      expect(shown).toBe(KID_TWIN[target]?.text ?? target);
      expect(kindOf(shown)).toBe(kindOf(target));
      expect(alt.answer).toBe(it.prompt === 'Which of these is a statement?' ? 'yes' : 'no');
      expect(alt.answer).toBe(isStatement(kindOf(target)!) ? 'yes' : 'no');
      expect(alt.choices.map((c) => c.id)).toEqual(['yes', 'no']);
      expect(n(`${alt.kid!.prompt} ${shown}`)).toBeLessThanOrEqual(7);
      kidRules(alt.kid!, true);
    }
  });
});

describe('lesson 2: the three answers are pictures with no words, the cards drawn plain', () => {
  it('every row item: a check, a cross and a question mark with no word under them, and plain cards', () => {
    for (const it of [...packs('s1.l2'), ...checks.filter((x) => x.lesson === 's1.l2' && !x.tags?.includes('why'))]) {
      if (it.kind !== 'choose') throw new Error('a row item is a choose item');
      expect(it.choices.map((c) => [c.id, c.art, c.word])).toEqual([['true', 'verdict-true', ''], ['false', 'verdict-false', ''], ['cant', 'verdict-cant', '']]);
      expect(it.kid?.scene).toEqual({ kind: 'things' });
    }
  });

  it('the boards draw the same three pictures with no words', () => {
    for (const b of L2_KID.board!) expect(b.options).toEqual({ true: { art: 'verdict-true' }, false: { art: 'verdict-false' }, cant: { art: 'verdict-cant' } });
  });

  it('the closing why item of the stop check has no kid block', () => {
    for (const it of checks.filter((x) => x.tags?.includes('why'))) expect(it.kid).toBeUndefined();
  });
});

/** Is b true exactly when a is false, on every row of up to three face-up cards? (Brute force, apart from the engine's test rows.) */
function flips(a: Stmt, b: Stmt): boolean {
  const rows: Card[][] = [];
  for (const x of KINDS) {
    rows.push([x]);
    for (const y of KINDS) {
      rows.push([x, y]);
      for (const z of KINDS) rows.push([x, y, z]);
    }
  }
  const four = (d: Card) => [d, d, d, d];
  for (const x of KINDS) for (const y of KINDS) rows.push([...four(x), y], [...four(x), ...four(y)]);
  return rows.every((r) => holds(a, r) !== holds(b, r));
}

describe('lesson 3: “NOT all red: none are red?” about one of its own answers, yes or no', () => {
  it('every NOT item of the lesson’s kinds has one; it asks the right NOT (yes) or the classic mistake (no)', () => {
    let yes = 0;
    let no = 0;
    for (const seed of SEEDS) {
      for (const key of L3_KEYS) {
        for (const frame of FRAMES) {
          const m = notItem(createRng(seed * 31 + key.length), { frame, key });
          const alt = m.item.kid!.alt as ChooseItem;
          expect(alt, key).toBeTruthy();
          const { s, right, wrongs } = m.flip!;
          const line = (x: Stmt) => {
            const k = kidNotLine(s, x);
            return k ? `${k.head}: ${k.tail}?` : null;
          };
          const asked = [right, ...wrongs].filter((x) => line(x) === alt.kid!.prompt);
          expect(asked.length, alt.kid!.prompt).toBe(1);
          expect(alt.answer).toBe(flips(s, asked[0]) ? 'yes' : 'no');
          expect(alt.answer === 'yes').toBe(asked[0] === right);
          // The answer it asks about is one of the item's own answers.
          expect(m.item.choices.map((c) => c.label)).toContain(say(asked[0], m.flip!.noun));
          expect(n(alt.kid!.prompt)).toBeLessThanOrEqual(7);
          expect(alt.kid!.scene).toEqual({ kind: 'none' });
          if (alt.answer === 'yes') yes++;
          else no++;
          kidRules(alt.kid!, true);
        }
      }
    }
    // Both answers come up.
    expect(yes).toBeGreaterThan(100);
    expect(no).toBeGreaterThan(100);
  });

  it('each board is asked one answer per page, yes for its NOT and no for the rest, with the board’s cards as the picture', () => {
    L3_DRILL.forEach((step, k) => {
      const kb = L3_KID.board![k];
      const alt = kb.alt!;
      expect(alt.id).toBe(step.id);
      const mine = step.rows.find((r) => r.marks.some((m) => !m.given))!;
      const not = mine.marks[0];
      expect(alt.rows.length).toBeGreaterThanOrEqual(2);
      expect(kb.rows).toHaveLength(alt.rows.length);
      for (const r of alt.rows) {
        const opt = not.options.find((o) => r.id === `${mine.id}-${o.id}`)!;
        expect(opt, r.id).toBeTruthy();
        expect(r.marks).toHaveLength(1);
        expect(r.marks[0].answer).toBe(opt.id === not.answer ? 'yes' : 'no');
        expect(n(`${kb.line} ${r.label}`)).toBeLessThanOrEqual(7);
      }
      expect(alt.rows.filter((r) => r.marks[0].answer === 'yes')).toHaveLength(1);
      expect(kb.rows!.every((r) => r.art === (k === 0 ? 'cards-every' : 'cards-tie'))).toBe(true);
    });
  });
});

/** A sign's meaning, from its classic words or its kid words: the box it names (or its own box), and whether "not". */
function signMeaning(text: string, own: number, names: string[]): { not: boolean; box: number } {
  const t = text.replace(/[“”.,]/g, '').trim();
  const not = /\bnot\b/i.test(t);
  if (/\bthis\b/.test(t) || /^(Not )?here$/i.test(t)) return { not, box: own };
  const box = names.findIndex((nm) => new RegExp(`\\b${nm}$`).test(t) || new RegExp(`\\b${nm} (chest|door|cave)$`).test(t) || new RegExp(`Box ${nm}$`).test(t));
  if (box < 0) throw new Error(`no box in “${text}”`);
  return { not, box };
}
/** The boxes that make exactly one sign true. */
const fits = (signs: { not: boolean; box: number }[]) => [0, 1, 2].filter((b) => signs.filter((s) => (s.box === b) !== s.not).length === 1);

describe('lesson 4: the same puzzle with its signs in kid words, and the case board one sign per page', () => {
  const signItems = all.filter((it): it is ChooseItem => it.kind === 'choose' && it.scene?.kind === 'boxes');

  it('every sign item has one: the same answers and answer, the signs on one line that mean the same, the rule under it', () => {
    expect(signItems.length).toBeGreaterThan(100);
    for (const it of signItems) {
      const scene = it.scene as { boxes: { name: string; sign: string }[]; rule: string };
      const alt = altOf(it)!;
      expect(alt.answer).toBe(it.answer);
      expect(alt.choices.map((c) => [c.id, c.label])).toEqual(it.choices.map((c) => [c.id, c.label]));
      const short = alt.choices.map((c) => c.word!);
      expect(alt.choices.every((c) => !!c.art && n(c.word!) === 1)).toBe(true);
      const [line, rule] = (alt.scene as { lines: string[] }).lines;
      expect(rule).toBe(`Rule: ${scene.rule}`);
      // The kid line means what the signs say: each part names the same box, with the same "not".
      const parts = [...line.matchAll(/(\w+): “([^”]+)”/g)];
      expect(parts.map((p) => p[1])).toEqual(short);
      parts.forEach((p, i) => expect(signMeaning(p[2], i, short)).toEqual(signMeaning(scene.boxes[i].sign, i, short)));
      // One sentence of at most 12 words.
      expect(sentences(line)).toHaveLength(1);
      expect(n(line)).toBeLessThanOrEqual(12);
      // Under "Exactly one sign is true", the kid line alone gives the answer.
      if (scene.rule === 'Exactly one sign is true.') {
        const kept = fits(parts.map((p, i) => signMeaning(p[2], i, short)));
        expect(kept).toHaveLength(1);
        expect(alt.choices[kept[0]].id).toBe(it.answer);
      }
      expect(alt.workFirst).toBeUndefined();
      kidRules(alt.kid!, false);
    }
  });

  it('the case board: the Gold case, each sign stamped from its own words, then the count against the rule', () => {
    const kb = L4_KID.board![2];
    const alt = kb.alt!;
    expect(alt.id).toBe(L4_DRILL.id);
    const gold = L4_DRILL.rows.find((r) => r.case?.box === 0 && r.marks.some((m) => !m.given))!;
    expect(kb.line).toBe(gold.label);
    const names = ['Gold', 'Silver', 'Bronze'];
    const stamps = alt.rows.slice(0, 3).map((r, i) => {
      const said = /“([^”]+)”/.exec(r.label)![1];
      const m = signMeaning(said, i, names);
      const value = (m.box === 0) !== m.not;
      expect(r.marks[0].answer, r.label).toBe(value ? 'true' : 'false');
      expect(r.marks[0].answer).toBe(gold.marks[i].answer);
      return value;
    });
    const decide = alt.rows[3];
    const count = stamps.filter(Boolean).length;
    expect(decide.marks[0].answer).toBe(count === 1 ? 'keep' : 'reject');
    expect(decide.marks[0].answer).toBe(gold.marks[3].answer);
    expect(decide.label).toMatch(new RegExp(`^${['No', 'One', 'Two', 'Three'][count]} true sign`));
    expect(kb.rows).toHaveLength(alt.rows.length);
  });
});

describe('the kid words of the alternates read at Grade 7 or lower', () => {
  it('lessons 1 and 3 (Grade 1) and lesson 4 (Grade 3)', () => {
    const g1 = [...packs('s1.l1'), ...packs('s1.l3')].flatMap((it) => (altOf(it)?.kid ? kidRules(altOf(it)!.kid!, true) : []));
    const g3 = packs('s1.l4').flatMap((it) => (altOf(it)?.kid ? [...kidRules(altOf(it)!.kid!, false), ...(altOf(it)!.scene as { lines: string[] }).lines] : []));
    expect(fkGrade(g1.join(' '))).toBeLessThanOrEqual(7);
    expect(fkGrade(g3.join(' '))).toBeLessThanOrEqual(7);
    const boards = [...L3_KID.board!, L4_KID.board![2]].flatMap((b) => [b.line, ...b.alt!.rows.map((r) => r.label)]);
    expect(fkGrade(boards.join(' '))).toBeLessThanOrEqual(7);
  });
});
