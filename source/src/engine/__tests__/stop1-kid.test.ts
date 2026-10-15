/**
 * Stop 1's kid forms (docs/KID-JOURNEY.md, "Round 2 fields"): the kid-only alternates of its quiz items (KidItem.alt)
 * and of its boards (KidBoard.alt), the picture tiles of lesson 2, re-derived here from the classic item or board they
 * replace. An alternate keeps the item's id, tags, lesson and skill, asks about the same case, and its answer is the
 * one the case gives (worked out again here, from the classic item's own words), never a typed one.
 */
import { describe, expect, it } from 'vitest';
import type { ChooseItem, Item, KidItem, Thing } from '../types';
import { KID_SHOW, KID_TWIN, L1_SHOWN, L2_KID, L3_DRILL, L3_KEYS, L3_KID, L4_DRILL, L4_KID, SENTENCES, TEACH_SENTENCES, isStatement, stop1 } from '../../content/stop1';
import { gradeById } from '../../content/grades';
import { kidItemOf } from '../../game/kidPlay';
import { practiceFor } from '../drill';
import { FRAMES, KINDS, holds, notItem, type Card } from '../puzzles/statements';
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

/**
 * The second method for lesson 3: the kid NOT question read back from its own words, apart from the engine. “NOT all
 * red?” is about the cards being all red; its trap reading (the classic mistake a young reader makes) is “none are
 * red”. Each reading is a plain test on face-up cards.
 */
const NUMS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
function wordTest(w: string): (c: Card) => boolean {
  if (w === 'red' || w === 'blue' || w === 'yellow') return (c) => c.color === w;
  if (w === 'big' || w === 'small') return (c) => c.size === w;
  const shape = w.replace(/s$/, '');
  if (shape === 'circle' || shape === 'square' || shape === 'triangle') return (c) => c.shape === shape;
  throw new Error(`no card word “${w}”`);
}
const count = (cards: readonly Card[], w: string) => cards.filter(wordTest(w)).length;
/** The sentence after “NOT”, its trap reading, and the cards that show it (the ones “Show me” rings). */
function readKid(prompt: string): { said: (cs: readonly Card[]) => boolean; trap: (cs: readonly Card[]) => boolean; ring: (cs: readonly Card[]) => number[]; kind: string } {
  const at = (cs: readonly Card[], t: (c: Card) => boolean) => cs.flatMap((c, i) => (t(c) ? [i] : []));
  let m: RegExpExecArray | null;
  if ((m = /^NOT all (\w+)\?$/.exec(prompt))) {
    const x = wordTest(m[1]);
    return { kind: 'all', said: (cs) => cs.every(x), trap: (cs) => !cs.some(x), ring: (cs) => at(cs, (c) => !x(c)) };
  }
  if ((m = /^NOT some (\w+)\?$/.exec(prompt))) {
    const x = wordTest(m[1]);
    return { kind: 'some', said: (cs) => cs.some(x), trap: (cs) => cs.some((c) => !x(c)), ring: (cs) => at(cs, x) };
  }
  if ((m = /^NOT more (\w+) than (\w+)\?$/.exec(prompt))) {
    const [a, b] = [m[1], m[2]];
    return { kind: 'more', said: (cs) => count(cs, a) > count(cs, b), trap: (cs) => count(cs, b) > count(cs, a), ring: () => [] };
  }
  if ((m = /^NOT (\w+) or more (\w+)\?$/.exec(prompt))) {
    const [k, w] = [NUMS[m[1]], m[2]];
    return { kind: 'or more', said: (cs) => count(cs, w) >= k, trap: (cs) => count(cs, w) <= k, ring: (cs) => at(cs, wordTest(w)) };
  }
  if ((m = /^NOT exactly (\w+) (\w+)\?$/.exec(prompt))) {
    const [k, w] = [NUMS[m[1]], m[2]];
    return { kind: 'exactly', said: (cs) => count(cs, w) === k, trap: (cs) => cs.length - count(cs, w) === k, ring: (cs) => at(cs, wordTest(w)) };
  }
  throw new Error(`no reading for “${prompt}”`);
}
const plain = (things: readonly Thing[]): Card[] => things.map((t) => ({ shape: t.shape, color: t.color, size: t.size }));

/** Rows of face-up cards to check that the kid words say the classic statement: every row of one to three cards, and some of four. */
const ROWS: Card[][] = (() => {
  const rows: Card[][] = [];
  for (const x of KINDS) {
    rows.push([x]);
    for (const y of KINDS) {
      rows.push([x, y]);
      for (const z of KINDS) rows.push([x, y, z]);
    }
  }
  for (const x of KINDS) for (const y of KINDS) rows.push([x, x, x, y], [x, x, y, y]);
  return rows;
})();

describe('lesson 3: the NOT asked on cards the kid can see, yes or no', () => {
  it('every NOT item of the lesson’s kinds has one: 3 or 4 plain cards, its statement in kid words, the answer read back from the words', () => {
    const tally: Record<string, { items: number; breaks: number; yes: number }> = {};
    for (const seed of SEEDS) {
      for (const key of L3_KEYS) {
        for (const frame of FRAMES) {
          const m = notItem(createRng(seed * 31 + key.length), { frame, key });
          const alt = m.item.kid!.alt as ChooseItem;
          expect(alt, key).toBeTruthy();
          const k = alt.kid!;
          const read = readKid(k.prompt);
          // The kid words say the classic statement: on every row they hold exactly when it does.
          for (const row of ROWS) if (read.said(row) !== holds(m.flip!.s, row)) throw new Error(`“${k.prompt}” is not “${m.item.scene?.kind === 'text' ? m.item.scene.lines[0] : ''}” on ${JSON.stringify(row)}`);
          // The cards: 3 or 4, drawn plain, the same in the scene and in Show me.
          expect(alt.scene?.kind).toBe('things');
          const things = (alt.scene as { things: Thing[] }).things;
          const cards = plain(things);
          expect(cards.length).toBeGreaterThanOrEqual(3);
          expect(cards.length).toBeLessThanOrEqual(4);
          expect(things.every((t) => !t.hidden && !t.mark && !t.ring)).toBe(true);
          expect(k.scene).toEqual({ kind: 'things' });
          // The answer: is the NOT true on these cards? Read back from the words, not from the engine.
          const yes = !read.said(cards);
          expect(alt.answer, `${k.prompt} ${JSON.stringify(cards)}`).toBe(yes ? 'yes' : 'no');
          expect(alt.choices.map((c) => c.id)).toEqual(['yes', 'no']);
          // Show me: the same cards, the ones that show it ringed.
          expect(plain(k.show!.things!)).toEqual(cards);
          expect(k.show!.things!.flatMap((t, i) => (t.ring ? [i] : []))).toEqual(read.ring(cards));
          expect(k.show!.label).toMatch(/^Look: /);
          expect(n(k.prompt)).toBeLessThanOrEqual(7);
          kidRules(k, true);
          // The trap reading gives the other answer on a card set that breaks it.
          const breaks = read.trap(cards) !== yes;
          // For “all”, a set that breaks the trap has one odd card: two red and one blue.
          if (breaks && read.kind === 'all') expect(read.ring(cards), k.prompt).toHaveLength(1);
          const t = (tally[key] ??= { items: 0, breaks: 0, yes: 0 });
          t.items++;
          if (breaks) t.breaks++;
          if (yes) t.yes++;
        }
      }
    }
    for (const [key, t] of Object.entries(tally)) {
      // At least half of the items break the trap, kind by kind, and both answers come up.
      expect(t.breaks / t.items, key).toBeGreaterThanOrEqual(0.5);
      expect(t.yes, key).toBeGreaterThan(t.items / 8);
      expect(t.items - t.yes, key).toBeGreaterThan(t.items / 8);
    }
    // “NOT all red” on two red and one blue: true, where “none are red” says false.
    const every = SEEDS.map((seed) => notItem(createRng(seed), { frame: 'abstract', key: 'everyColor' }).item.kid!.alt as ChooseItem);
    expect(every.some((a) => a.answer === 'yes' && plain((a.scene as { things: Thing[] }).things).length === 3)).toBe(true);
  });

  it('each board asks its statement on one card set per page: the first set breaks the trap, the second gives the other answer', () => {
    L3_DRILL.forEach((step, k) => {
      const kb = L3_KID.board![k];
      const alt = kb.alt!;
      expect(alt.id).toBe(step.id);
      const mine = step.rows.find((r) => r.marks.some((m) => !m.given))!;
      const read = readKid(kb.line);
      // The line says the board's own statement: the classic row's sentence is the one each page asks about.
      for (const r of alt.rows) expect(r.marks[0].label).toContain(mine.label.replace(/\.”$/, '”'));
      expect(alt.rows).toHaveLength(2);
      expect(kb.rows).toEqual(alt.rows.map(() => ({ label: '' })));
      const answers = alt.rows.map((r) => {
        const cards = plain(r.things!);
        expect(cards.length).toBeGreaterThanOrEqual(3);
        expect(cards.length).toBeLessThanOrEqual(4);
        expect(r.marks).toHaveLength(1);
        expect(r.marks[0].options.map((o) => o.id)).toEqual(['yes', 'no']);
        const yes = !read.said(cards);
        expect(r.marks[0].answer).toBe(yes ? 'yes' : 'no');
        return { yes, breaks: read.trap(cards) !== yes };
      });
      expect(answers[0].breaks).toBe(true);
      expect(answers[0].yes).not.toBe(answers[1].yes);
      expect(n(kb.line)).toBeLessThanOrEqual(7);
    });
    expect(L3_KID.board!.map((b) => b.line)).toEqual(['NOT all big?', 'NOT three or more red?']);
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
    const boards = [...L3_KID.board!, L4_KID.board![2]].flatMap((b) => [b.line, ...b.alt!.rows.map((r, i) => b.rows?.[i]?.label ?? r.label).filter((x) => x)]);
    expect(fkGrade(boards.join(' '))).toBeLessThanOrEqual(7);
  });
});
