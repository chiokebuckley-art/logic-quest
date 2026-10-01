/**
 * Acceptance tests from "Logic Quest — Wrong-answer explanations, developer handoff v1.0" (30 September 2026),
 * starting with its reference case: Stop 1, Lesson 3 (The NOT flip), "There are more red dragons than yellow
 * dragons." Each test names the handoff's row it covers.
 */
import { describe, expect, it } from 'vitest';
import { stop1 } from '../../content/stop1';
import { stop3 } from '../../content/stop3';
import { STOPS } from '../../content/stops';
import { freshCheckSet, looks } from '../../engine/fresh';
import { FRAMES, NOT_KEYS, holds, isExactOpposite, notItem, oppositeTestRows, stmtId, type Card, type Made, type Stmt } from '../../engine/puzzles/statements';
import { claimTrue, clueHolds, grade } from '../../engine/grade';
import { READING, fkGrade, longestSentence } from '../../engine/readability';
import { createRng } from '../../engine/rng';
import type { Answer, ChooseItem, Item } from '../../engine/types';
import { NEUTRAL_TITLE, explanationFor, explanationSpeech } from '../explanation';

const red: Card = { color: 'red', shape: 'circle', size: 'big' };
const yellow: Card = { color: 'yellow', shape: 'circle', size: 'big' };
const counts = (r: number, y: number): Card[] => [...Array.from({ length: r }, () => red), ...Array.from({ length: y }, () => yellow)];
const RED_MORE: Stmt = { t: 'more', a: { color: 'red' }, b: { color: 'yellow' } };
const YELLOW_MORE: Stmt = { t: 'more', a: { color: 'yellow' }, b: { color: 'red' } };
const RED_ASMANY: Stmt = { t: 'asMany', a: { color: 'red' }, b: { color: 'yellow' } };
const YELLOW_ASMANY: Stmt = { t: 'asMany', a: { color: 'yellow' }, b: { color: 'red' } };

const asItem = (m: Made, id = 'x'): ChooseItem => ({ ...m.item, id, stop: 1, lesson: 's1.l3', skill: `s1.${m.tag}` });

/** The dragon item from the handoff's screenshot: the dragon says red > yellow, with both wrong choices offered. */
function dragonItem(): ChooseItem {
  for (let seed = 1; seed < 5000; seed++) {
    const m = notItem(createRng(seed), { frame: 'fantasy', key: 'moreColor' });
    const s = m.flip!.s;
    const ids = m.item.choices.map((c) => c.id);
    if (s.t === 'more' && s.a.color === 'red' && s.b.color === 'yellow' && m.flip!.noun.many === 'dragons' && ids.includes(stmtId(YELLOW_MORE)) && ids.includes(stmtId(RED_ASMANY))) {
      return asItem(m);
    }
  }
  throw new Error('no dragon item');
}

describe('the dragon example (handoff pages 2-3, 7)', () => {
  const it0 = dragonItem();

  it('asks for NOT, defined as true whenever the statement is false, not “the exact opposite”', () => {
    expect(it0.prompt).toMatch(/says NOT to the \w+’s statement\. Which sentence is true whenever the \w+’s statement is false, and false whenever it is true\?/);
    expect(it0.prompt).not.toMatch(/opposite/);
    expect(it0.teach!.rule).toBe('NOT means the original statement is false.');
    const terms = it0.teach!.terms!.map((t) => `${t.word} means ${t.meaning}`);
    expect(terms).toContain('A tie means the two groups have the same number.');
    expect(terms).toContain('“At least as many” means the same number or more.');
  });

  it('selected “yellow > red”: names the missing tie and shows 3 red / 3 yellow: original false, selected false, correct true', () => {
    const fb = it0.feedback![stmtId(YELLOW_MORE)];
    expect(fb.headline).toBe('Your answer leaves out one possibility: a tie.');
    expect(fb.example!.label).toBe('3 red dragons and 3 yellow dragons.');
    expect(fb.example!.groups).toEqual([
      { label: 'Red dragons', n: 3, color: 'red' },
      { label: 'Yellow dragons', n: 3, color: 'yellow' },
    ]);
    expect(fb.example!.truths!.map((t) => t.value)).toEqual([false, false, true]);
    expect(fb.example!.note).toBe('The counts are equal. This is a tie.');
    expect(fb.detail.join(' ')).toContain('2 red dragons and 3 yellow dragons');
    expect(fb.simpler!.join(' ')).toContain('Imagine 1 red dragon and 1 yellow dragon.');
  });

  it('selected “red ≥ yellow”: shows 3 red / 2 yellow, original true and selected true, and does not reuse the tie explanation', () => {
    const fb = it0.feedback![stmtId(RED_ASMANY)];
    expect(fb.headline).toBe('Your answer still allows red to have more.');
    expect(fb.example!.label).toBe('3 red dragons and 2 yellow dragons.');
    expect(fb.example!.truths!.map((t) => t.value)).toEqual([true, true, false]);
    expect([fb.headline, ...fb.detail].join(' ')).not.toMatch(/tie/i);
  });

  it('three comparison cases 3/2, 2/3, 3/3: original true/false/false, the NOT false/true/true', () => {
    const cases = it0.teach!.cases!;
    expect(cases.map((c) => c.label)).toEqual(['3 red dragons and 2 yellow dragons.', '2 red dragons and 3 yellow dragons.', '3 red dragons and 3 yellow dragons.']);
    expect(cases.map((c) => c.truths![0].value)).toEqual([true, false, false]);
    expect(cases.map((c) => c.truths![1].value)).toEqual([false, true, true]);
    expect(cases.map((c) => c.note)).toEqual(['Red has more.', 'Red has fewer.', 'The counts are equal. This is a tie.']);
  });

  it('the correct answer explains why it covers every case, and Remember gives the rule and the question to ask', () => {
    expect(it0.explain).toContain('“At least as many” means the same number or more.');
    expect(it0.explain).toContain('including a tie');
    expect(it0.teach!.remember).toEqual(['NOT “more than” means the same number or fewer.', 'Ask: “Have I covered every way the statement could be false?”']);
  });
});

describe('logic invariants (handoff page 7)', () => {
  it('for red and yellow counts 0 to 10, (yellow ≥ red) is NOT (red > yellow), and each wrong option has a counterexample', () => {
    let yellowMoreBad = 0;
    let redAsManyBad = 0;
    for (let r = 0; r <= 10; r++) {
      for (let y = 0; y <= 10; y++) {
        const row = counts(r, y);
        expect(holds(YELLOW_ASMANY, row)).toBe(!holds(RED_MORE, row));
        if (holds(YELLOW_MORE, row) === holds(RED_MORE, row)) yellowMoreBad++;
        if (holds(RED_ASMANY, row) === holds(RED_MORE, row)) redAsManyBad++;
      }
    }
    expect(yellowMoreBad).toBeGreaterThan(0);
    expect(redAsManyBad).toBeGreaterThan(0);
  });

  it('question validity: exactly one option is the NOT on the whole test domain, for every case', () => {
    for (let seed = 1; seed <= 25; seed++) {
      for (const key of NOT_KEYS) {
        const m = notItem(createRng(seed), { frame: FRAMES[seed % 3], key });
        const opts = [m.flip!.right, ...m.flip!.wrongs];
        expect(opts.filter((o) => isExactOpposite(m.flip!.s, o)).length, key).toBe(1);
        expect(oppositeTestRows().length).toBeGreaterThan(5000);
      }
    }
  });
});

describe('choosing the explanation (handoff pages 3, 5, 6)', () => {
  it('uses the selected choice’s stable id, so shuffling the choices never changes which explanation shows', () => {
    const base = dragonItem();
    const shuffled: ChooseItem = { ...base, choices: [...base.choices].reverse() };
    for (const c of base.choices) {
      if (c.id === base.answer) continue;
      const a = explanationFor(base, { kind: 'choose', id: c.id });
      const b = explanationFor(shuffled, { kind: 'choose', id: c.id });
      expect(b).toEqual(a);
      expect(a.title).toBe(base.feedback![c.id].headline);
      expect(a.said).toBe(c.label);
      // The read-aloud is built from the same words.
      const spoken = explanationSpeech(a, false);
      expect(spoken[0]).toBe(a.title);
      for (const d of a.detail) expect(spoken).toContain(d);
    }
  });

  it('a choice with no explanation of its own gets the neutral title, the item-level teaching, and a recorded gap', () => {
    const base = dragonItem();
    const wrong = base.choices.find((c) => c.id !== base.answer)!;
    const bare: ChooseItem = { ...base, feedback: {}, whyWrong: {} };
    const m = explanationFor(bare, { kind: 'choose', id: wrong.id });
    expect(m.title).toBe(NEUTRAL_TITLE);
    expect(m.specific).toBe(false);
    expect(m.gap).toBe(`${base.skill}:${wrong.id}`);
    expect(m.detail).toEqual([]);
    expect(m.cases.length).toBe(3);
    expect(m.right).toBe(base.choices.find((c) => c.id === base.answer)!.label);
  });

  it('other kinds take their title from what grade() found, never a made-up reason', () => {
    const item = stop3.lessons[0].practice(createRng(3)).find((x) => x.kind === 'order') ?? stop3.check!(createRng(3)).find((x) => x.kind === 'order')!;
    if (item.kind !== 'order') throw new Error('no order item');
    const wrong = [...item.answer].reverse();
    const m = explanationFor(item, { kind: 'order', ids: wrong });
    expect(m.title).toMatch(/^This line breaks clues? /);
    expect(m.specific).toBe(true);
  });
});

describe('new examples after a miss (handoff page 4)', () => {
  const missed = (key: 'moreColor' | 'moreCount' | 'atLeastShape' | 'exactColor' | 'everyColor') => asItem(notItem(createRng(11), { frame: 'fantasy', key }), 's1-l3');

  it('a missed comparison gets two new examples: one whose NOT keeps the boundary (a tie or exactly k), one that does not', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const key of ['moreColor', 'moreCount', 'atLeastShape', 'exactColor'] as const) {
        const item = missed(key);
        const set = freshCheckSet(stop1, item, seed, [], 1);
        expect(set.length).toBe(2);
        const skills = set.map((x) => x.skill);
        expect(skills[0]).toBe(item.skill);
        expect(skills).toContain(item.skill === 's1.not-more' ? 's1.not-at-least' : 's1.not-more');
        // Different objects or counts: none looks like the missed item, and the two differ.
        expect(new Set([item, ...set].map(looks)).size).toBe(3);
        expect(new Set(set.map((x) => x.id)).size).toBe(2);
        for (const x of set) expect(x.id).not.toBe(item.id);
      }
    }
  });

  it('“more than k”: its NOT keeps exactly k, and “fewer than k” is explained as missing exactly k', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const m = notItem(createRng(seed), { frame: FRAMES[seed % 3], key: 'moreCount' });
      const s = m.flip!.s;
      if (s.t !== 'count') throw new Error('not a count');
      const exactly = m.item.teach!.cases!.find((c) => c.note?.startsWith(`Exactly ${s.k}`))!;
      expect(exactly.truths!.map((t) => t.value)).toEqual([false, true]);
      const lt = m.item.feedback![stmtId({ t: 'count', d: s.d, op: 'lt', k: s.k })];
      expect(lt.headline).toBe(`Your answer leaves out one possibility: exactly ${['', 'one', 'two', 'three'][s.k]}.`);
    }
  });

  it('other misses get one new example on the same skill from the same lesson, never the same question', () => {
    const one = freshCheckSet(stop1, missed('everyColor'), 5, [], 1);
    expect(one.length).toBe(1);
    expect(one[0].skill).toBe('s1.not-every');
    for (const lesson of stop3.lessons.slice(3)) {
      const item: Item = lesson.practice(createRng(9))[0];
      const set = freshCheckSet(stop3, item, 9, [], 1);
      expect(set.length).toBe(1);
      expect(set[0].lesson).toBe(item.lesson);
      expect(looks(set[0])).not.toBe(looks(item));
    }
  });

  it('a missed “Can’t tell”, “must” or “might” in Stop 3 gets a pair: the same kind of answer, and the other kind', () => {
    const answer = (x: Item) => (x.kind === 'choose' ? x.answer : '');
    for (let seed = 1; seed <= 12; seed++) {
      for (const lesson of stop3.lessons.slice(0, 3)) {
        for (const item of lesson.practice(createRng(seed))) {
          if (item.kind !== 'choose') continue;
          const set = freshCheckSet(stop3, item, seed, [], 1);
          expect(set.length, item.id).toBe(2);
          for (const x of set) {
            expect(x.lesson).toBe(item.lesson);
            expect(looks(x)).not.toBe(looks(item));
          }
          if (item.lesson === 's3.l2') {
            // must / might / can’t: one new example has the missed status, the other a different one.
            expect(set.map(answer), item.id).toContain(item.answer);
          } else {
            // Exactly one new example is “Can’t tell”: the other is decided by its clues.
            expect(set.filter((x) => answer(x) === 'cant').length, item.id).toBe(1);
          }
          expect(answer(set[0]), item.id).not.toBe(answer(set[1]));
          expect(set.some((x) => x.skill === item.skill)).toBe(true);
        }
      }
    }
  });

  it('a second round avoids every example already shown', () => {
    const item = missed('moreColor');
    const first = freshCheckSet(stop1, item, 21, [], 1);
    const second = freshCheckSet(stop1, item, 22, first, 2);
    expect(new Set([item, ...first, ...second].map(looks)).size).toBe(5);
    expect(second.every((x) => x.id.includes('-new2-'))).toBe(true);
  });
});

/** One wrong answer for an item that is not multiple choice, made from its right answer. */
function wrongFor(item: Item): Answer | null {
  switch (item.kind) {
    case 'tapall': {
      const out = item.things.find((x) => !item.answer.includes(x.id));
      return { kind: 'tapall', ids: [...item.answer.slice(1), ...(out ? [out.id] : [])] };
    }
    case 'order':
      return { kind: 'order', ids: [...item.answer.slice(1), item.answer[0]] };
    case 'multi': {
      const out = item.choices.find((c) => !item.answer.includes(c.id));
      return { kind: 'multi', ids: [...item.answer.slice(1), ...(out ? [out.id] : [])] };
    }
    case 'assign': {
      const values = JSON.parse(JSON.stringify(item.answer)) as typeof item.answer;
      const [a, b] = item.people;
      if (item.layout === 'toggles') values[a.id] = { kind: values[a.id].kind === 'knight' ? 'knave' : 'knight' };
      else {
        const c = item.categories[0].id;
        [values[a.id][c], values[b.id][c]] = [values[b.id][c], values[a.id][c]];
      }
      return { kind: 'assign', values };
    }
    default:
      return null;
  }
}

describe('where other kinds fail (handoff page 2: show exactly where the answer fails)', () => {
  const items: Item[] = [];
  for (let seed = 1; seed <= 6; seed++) {
    for (const stop of STOPS.filter((x) => x.ready)) {
      for (const l of stop.lessons) items.push(...l.practice(createRng(seed)));
      items.push(...stop.check!(createRng(seed)));
    }
  }
  const other = items.filter((x) => x.kind !== 'choose');

  it('every wrong answer gets a title that names its gap, and one line for each place it fails, at the reading level', () => {
    expect(new Set(other.map((x) => x.kind))).toEqual(new Set(['tapall', 'order', 'assign', 'multi']));
    for (const item of other) {
      const wrong = wrongFor(item)!;
      const g = grade(item, wrong);
      if (g.correct) continue;
      const m = explanationFor(item, wrong);
      expect(m.specific, item.id).toBe(true);
      expect(m.title).not.toBe(NEUTRAL_TITLE);
      expect(m.title).not.toMatch(/^You (left out|tapped|picked) \d+ cards?/);
      const text = [m.title, ...m.detail, ...(m.example ? [m.example.label, m.example.note ?? ''] : [])].join('\n');
      expect(longestSentence(text).words, longestSentence(text).sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
      expect(fkGrade(text), text).toBeLessThanOrEqual(READING.maxGrade);
      // A broken clue is quoted and placed: one detail line per broken clue, in clue order.
      if (g.broken?.length && (item.kind === 'order' || (item.kind === 'assign' && item.gridClues))) {
        const lines = m.detail.filter((d) => /^Clue \d+/.test(d));
        expect(lines.map((d) => Number(/^Clue (\d+)/.exec(d)![1]) - 1), text).toEqual(g.broken);
        if (item.scene?.kind === 'clues') for (const d of lines) expect(d, text).toMatch(/^Clue \d+ says “.+” (In your line|Your grid|In your grid)/);
      }
    }
  });

  it('a line-up shows the player’s line as a card, with each clue true or false for it', () => {
    let shown = 0;
    for (const item of other) {
      if (item.kind !== 'order') continue;
      const ids = [...item.answer].reverse();
      const m = explanationFor(item, { kind: 'order', ids });
      if (!m.example) continue;
      shown++;
      expect(m.example.truths!.map((t) => t.value)).toEqual(item.clues.map((c) => clueHolds(c, ids)));
      expect(m.example.note).toMatch(/false for this line\./);
    }
    expect(shown).toBeGreaterThan(0);
  });

  it('a knights answer shows each speaker’s words as true or false, and who breaks the rule', () => {
    let shown = 0;
    for (const item of other) {
      if (item.kind !== 'assign' || !item.claims) continue;
      const wrong = wrongFor(item)!;
      if (wrong.kind !== 'assign') continue;
      const m = explanationFor(item, wrong);
      if (!m.example) continue;
      shown++;
      const kinds = Object.fromEntries(item.people.map((p) => [p.id, wrong.values[p.id].kind === 'knight' ? 'knight' : 'knave'])) as Record<string, 'knight' | 'knave'>;
      const talkers = item.people.filter((p) => item.claims![p.id]);
      expect(m.example.truths!.map((t) => t.value)).toEqual(talkers.map((p) => claimTrue(item.claims![p.id], kinds)));
      for (const p of talkers) {
        const fits = (kinds[p.id] === 'knight') === claimTrue(item.claims![p.id], kinds);
        expect(m.example.note!.includes(`${p.label} is a`), m.example.note).toBe(!fits);
      }
    }
    expect(shown).toBeGreaterThan(0);
  });

  it('read-aloud reads a long answer one sentence at a time', () => {
    for (const item of other) {
      const wrong = wrongFor(item)!;
      if (grade(item, wrong).correct) continue;
      const lines = explanationSpeech(explanationFor(item, wrong), true);
      for (const l of lines) expect(longestSentence(l).words, l).toBeLessThanOrEqual(40);
    }
  });
});
