/**
 * Stop 3's kid forms (docs/KID-JOURNEY.md, "Round 2 fields"), re-derived here from the classic items and boards they
 * sit beside: the clue pictures (KidItem.scene: one row per clue, each name under the picture of who it is, the
 * relation between them), the picture tiles of the answers, the kid-only line-up of lesson 4 (KidItem.alt: the same
 * names, clues and answer, with its ends in one word each), and the kid words of every board mark, whose answers are
 * worked out again here from the kid words alone and must match the classic mark's answer.
 */
import { describe, expect, it } from 'vitest';
import type { ChooseItem, DrillRow, DrillStep, Item, KidBoard, KidPicto, LineClue, OrderItem } from '../types';
import { L1_DO, L1_DRILL, L1_KID, L2_DRILL, L2_EXAMPLE, L2_KID, L2_RIGHT, L3_BETWEEN, L3_DRILL, L3_EXAMPLE, L3_KID, L3_NEXT, L4_DRILL, L4_EXAMPLE, L4_KID, L4_NOSPOT_TWIN, L4_TWIN, stop3 } from '../../content/stop3';
import { gradeById } from '../../content/grades';
import { kidItemOf } from '../../game/kidPlay';
import { practiceFor } from '../drill';
import { clueHolds } from '../grade';
import { KID_ENDS, SKINS, fits, statusOf, whoCanBeAt, type LineBoard, type SkinId } from '../puzzles/lineup';
import { fkGrade, longestSentence, words } from '../readability';
import { createRng } from '../rng';

const SEEDS = Array.from({ length: 40 }, (_, k) => k + 1);
const G2 = { grade: 'g2' as const, budget: gradeById('g2').budget, autoRead: false };
const lesson = (id: string) => stop3.lessons.find((l) => l.id === id)!;
const packs = (id: string): Item[] => SEEDS.flatMap((seed) => practiceFor(lesson(id), createRng(seed)));
const KID_LESSONS = ['s3.l1', 's3.l2', 's3.l3', 's3.l4'];
const lessonItems = KID_LESSONS.flatMap(packs);
/** The stop check's items of lessons 1 to 4 (its closing why item has no kid block: see the last test). */
const checks = SEEDS.flatMap((seed) => stop3.check!(createRng(seed))).filter((it) => KID_LESSONS.includes(it.lesson ?? '') && !it.tags?.includes('why'));
const arcade = SEEDS.map((seed) => stop3.practice!(createRng(seed))).filter((it) => KID_LESSONS.includes(it.lesson ?? ''));
const fresh = lessonItems.slice(0, 80).flatMap((it, k) => stop3.fresh!(it, createRng(k + 1)));
const all = [...lessonItems, ...checks, ...arcade, ...fresh];
const n = (s: string) => words(s).length;

/** The skin a name belongs to (the people's pool is shared by race, heights and the lunch line: they draw the same kid). */
const POOLS = (Object.keys(SKINS) as SkinId[]).map((id) => [id, SKINS[id].pool] as const);
const NAMES = new Set(POOLS.flatMap(([, pool]) => pool));
const WHO: Record<SkinId, string> = { race: 'line-who-kid', height: 'line-who-kid', line: 'line-who-kid', brooms: 'line-who-wizard', dragons: 'line-who-dragon', robots: 'line-who-robot', letters: 'line-who-letter' };
const whoOf = (name: string) => WHO[POOLS.find(([, pool]) => pool.includes(name))![0]];

/** The relation picture a classic clue's own words call for (worked out from the sentence, not from the clue's kind). */
function relOf(text: string): string {
  const spot = /(second|third|fourth)(?: tallest| longest wings| in line| in the parade| from the left)?\.$/.exec(text);
  if (spot && !/ not /.test(text)) return `line-spot-${['second', 'third', 'fourth'].indexOf(spot[1]) + 2}`;
  const ends: [RegExp, string][] = [
    [/ (finished first|is the tallest|has the longest wings|is first in line|is at the front of the parade|is at the left end)\.$/, 'line-rel-first'],
    [/ (finished last|is the shortest|has the shortest wings|is last in line|is at the back of the parade|is at the right end)\.$/, 'line-rel-last'],
    [/ (did not finish first|is not the tallest|does not have the longest wings|is not first in line|is not at the front of the parade|is not at the left end)\.$/, 'line-rel-not-first'],
    [/ (did not finish last|is not the shortest|does not have the shortest wings|is not last in line|is not at the back of the parade|is not at the right end)\.$/, 'line-rel-not-last'],
    [/ is taller than /, 'line-rel-taller'],
    [/ has longer wings than /, 'line-rel-longer'],
    [/ is directly to the left of /, 'line-rel-just-left'],
    [/ is somewhere to the left of /, 'line-rel-left'],
    [/ (finished right before|is right in front of) /, 'line-rel-right-before'],
    [/ (finished before|is somewhere in front of) /, 'line-rel-before'],
    [/^No one finished between | are next to each other\.$/, 'line-rel-next'],
    [/^At least one \w+ finished between | are not next to each other\.$/, 'line-rel-not-next'],
    [/ somewhere between /, 'line-rel-between'],
  ];
  const hit = ends.find(([re]) => re.test(text));
  if (!hit) throw new Error(`no relation for the clue ${text}`);
  return hit[1];
}

/** A clue's names in the order its sentence says them (“Cal finished somewhere between Ava and Ben”: Cal, Ava, Ben). */
const namesIn = (text: string) => text.replace(/\.$/, '').split(/\s+/).filter((w) => NAMES.has(w));

/** The classic clue sentences of an item: a choose item's clue scene, a line-up's clue scene. */
const cluesOf = (it: Item): string[] => (it.scene?.kind === 'clues' ? it.scene.clues : []);

/** The names a text says, in its order, with quotes and stops set aside (“Tik is right before Nano.”: Tik, Nano). */
const namesSaid = (text: string) => namesIn(text.replace(/[“”.,?:]/g, ' '));
/** A must / might / can’t item (lesson 2's question), whose answer can turn on someone no clue names. */
const isStatus = (it: Item) => it.kind === 'choose' && it.choices.some((c) => c.id === 'must');
/** Everyone in a classic item's line: the names of its setting, the prompt's first sentence (“Fay, Gus and Jin wait …”). */
const castOf = (it: Item) => namesSaid(it.prompt.split(/(?<=\.) /)[0]);

describe('the clue pictures: one row per clue, each name under the picture of who it is, the relation between them', () => {
  it('every kid item of lessons 1 to 4 (lessons, stop check, Arcade, new examples) draws its clues as pictures', () => {
    expect(all.length).toBeGreaterThan(400);
    for (const given of all) {
      const it = kidItemOf(given, G2);
      const scene = it.kid?.scene;
      if (scene?.kind !== 'pictos') throw new Error(`${it.id}: a clue picture`);
      const texts = cluesOf(it);
      expect(texts.length, it.id).toBeGreaterThan(0);
      // A must / might / can’t item adds one last row when someone in the line is named by neither its clues nor its
      // sentence (checked in the next test); every other item draws its clues and nothing else.
      const extra = isStatus(it) && scene.rows.length === texts.length + 1 ? 1 : 0;
      expect(scene.rows.length, it.id).toBe(texts.length + extra);
      scene.rows.slice(0, texts.length).forEach((row: KidPicto[], i) => {
        const names = namesIn(texts[i]);
        const shown = row.filter((p) => p.word).map((p) => p.word);
        expect(shown, texts[i]).toEqual(names);
        for (const p of row) if (p.word) expect(p.art, texts[i]).toBe(whoOf(p.word));
        const rels = row.filter((p) => !p.word);
        expect(rels.map((p) => p.art), texts[i]).toEqual([relOf(texts[i])]);
        // The relation sits right after the first name: “Ava, taller than, Ben”, “Cal, between, Ava, Ben”, “Mo, first”.
        expect(row[1].word, texts[i]).toBeUndefined();
      });
    }
  });

  it('a must / might / can’t item shows everyone in its line: whom neither its clues nor its sentence name is a last row of their own', () => {
    const status = all.filter(isStatus);
    expect(status.length).toBeGreaterThan(100);
    let rowsAdded = 0;
    for (const it of status) {
      const rows = (it.kid!.scene as { rows: KidPicto[][] }).rows;
      const texts = cluesOf(it);
      const named = new Set([...texts.flatMap(namesIn), ...namesSaid(it.kid!.prompt)]);
      const unnamed = castOf(it).filter((x) => !named.has(x));
      expect(castOf(it).length, it.prompt).toBeGreaterThanOrEqual(3);
      if (!unnamed.length) {
        expect(rows.length, it.id).toBe(texts.length);
        continue;
      }
      rowsAdded++;
      const last = rows[texts.length];
      expect(last.map((p) => p.word), it.prompt).toEqual(unnamed);
      for (const p of last) expect(p.art, it.id).toBe(whoOf(p.word!));
    }
    // The “before” traps turn on someone who could stand in between, often a name no clue says.
    expect(rowsAdded).toBeGreaterThan(20);
  });

  it('a line-up’s pictures are its own clues, row by row, in the clues’ own order', () => {
    for (const it of all.filter((x): x is OrderItem => x.kind === 'order')) {
      const rows = (it.kid!.scene as { rows: KidPicto[][] }).rows;
      it.clues.forEach((c: LineClue, i) => {
        const ids = [c.a, ...('b' in c ? [c.b] : []), ...('c' in c ? [c.c] : [])];
        expect(rows[i].filter((p) => p.word).map((p) => p.word), it.id).toEqual(ids.map((id) => it.names.find((x) => x.id === id)!.label));
      });
    }
  });
});

describe('the answer tiles', () => {
  const chooses = all.filter((x): x is ChooseItem => x.kind === 'choose');

  it('names are picture tiles of who they are, with the name under them; Can’t tell is the question tile', () => {
    const named = chooses.filter((it) => it.choices.some((c) => c.id !== 'cant' && NAMES.has(c.label)));
    expect(named.length).toBeGreaterThan(100);
    for (const it of named) {
      for (const c of it.choices) {
        if (c.id === 'cant') {
          expect(c.art, it.id).toBe('verdict-cant');
          // Lesson 1 is Grade 2: the question tile prints no words there (it is still read aloud as “Can’t tell”).
          expect(c.word, it.id).toBe(it.lesson === 's3.l1' ? '' : undefined);
        } else {
          expect(c.art, it.id).toBe(whoOf(c.label));
          expect(c.word, it.id).toBeUndefined();
        }
      }
    }
  });

  it('must, might and can’t are their pictures with one word each; spots are their badges', () => {
    for (const it of chooses.filter((x) => x.lesson === 's3.l2')) {
      expect(it.choices.map((c) => [c.id, c.art, c.word])).toEqual([['must', 'line-must', 'Must'], ['might', 'line-might', 'Might'], ['cant', 'line-cant', 'Can’t']]);
    }
    for (const it of chooses.filter((x) => x.choices.some((c) => c.id === 'p1'))) {
      it.choices.forEach((c, i) => expect(c.art, it.id).toBe(c.id === 'cant' ? 'verdict-cant' : `line-spot-${i + 1}`));
    }
  });
});

describe('lesson 4: the kid line-up (KidItem.alt) is the same line-up with one word at each end', () => {
  const builds = all.filter((x): x is OrderItem => x.kind === 'order');

  it('same id, tags, lesson, skill, names, clues and answer; the answer is the one order the clues allow', () => {
    expect(builds.length).toBeGreaterThan(100);
    for (const it of builds) {
      const alt = it.kid!.alt as OrderItem;
      const drawn = kidItemOf(it, G2) as OrderItem;
      expect(drawn.id).toBe(it.id);
      expect(drawn.tags).toEqual(it.tags);
      expect(kidItemOf(it, null)).toBe(it);
      expect(alt.kind).toBe('order');
      expect([alt.lesson, alt.skill, alt.stop]).toEqual([it.lesson, it.skill, it.stop]);
      expect(alt.names).toEqual(it.names);
      expect(alt.clues).toEqual(it.clues);
      const only = fits(it.names.map((x) => x.id), it.clues);
      expect(only).toHaveLength(1);
      expect(alt.answer).toEqual(only[0]);
      expect(alt.kid!.alt).toBeUndefined();
      expect({ ...it.kid, alt: undefined }).toEqual({ ...alt.kid, alt: undefined });
    }
  });

  it('its ends are one word each, the classic end in short (“Front of the line” is “Front”)', () => {
    const ends = new Set(Object.values(KID_ENDS).flat());
    for (const it of builds) {
      const alt = it.kid!.alt as OrderItem;
      expect(ends.has(alt.firstLabel) && ends.has(alt.lastLabel), it.id).toBe(true);
      expect(n(alt.firstLabel) + n(alt.lastLabel)).toBe(2);
      expect(it.firstLabel.toLowerCase(), it.id).toContain(alt.firstLabel.toLowerCase());
      expect(it.lastLabel.toLowerCase(), it.id).toContain(alt.lastLabel.toLowerCase());
    }
  });
});

/** The rows of a board with a mark to tap, with their kid rows. */
const tapped = (step: DrillStep, kb: KidBoard) => step.rows.map((r, k) => ({ r, kr: kb.rows?.[k] })).filter(({ r }) => r.marks.some((m) => !m.given));
/** “Ava, Ben, Cal” as ids. */
const ids = (line: string) => line.split(', ').map((x) => x.toLowerCase());

describe('the boards in kid words: every mark has its words, and they ask what the classic mark asks', () => {
  const boards: [string, DrillStep, KidBoard, 'g2' | 'g3'][] = [
    ['s3.l1', L1_DRILL, L1_KID.board![0], 'g2'],
    ...L2_DRILL.map((s, j) => ['s3.l2', s, L2_KID.board![j], 'g2'] as [string, DrillStep, KidBoard, 'g2']),
    ...L3_DRILL.map((s, j) => ['s3.l3', s, L3_KID.board![j], 'g3'] as [string, DrillStep, KidBoard, 'g3']),
    ...L4_DRILL.map((s, j) => ['s3.l4', s, L4_KID.board![j], 'g3'] as [string, DrillStep, KidBoard, 'g3']),
  ];

  it('a row with several marks has one kid mark per mark, at most 8 words, in kid words; a Grade 2 row leaves its label to them', () => {
    for (const [id, step, kb, band] of boards) {
      expect(kb.alt, id).toBeUndefined();
      for (const { r, kr } of tapped(step, kb)) {
        if (r.marks.length < 2) continue;
        expect(kr?.marks?.length, `${id} ${r.id}`).toBe(r.marks.length);
        // Grade 2 shows two sentences a page: the line and the mark (the row's label is '').
        if (band === 'g2') expect(kr?.label, `${id} ${r.id}`).toBe('');
        for (const m of kr!.marks!) {
          expect(m.label, `${id} ${r.id}`).toBeTruthy();
          expect(n(m.label!), m.label).toBeLessThanOrEqual(8);
          expect(longestSentence(m.label!).words).toBeLessThanOrEqual(gradeById(band).budget.sentence);
          expect(m.label, m.label).not.toMatch(/['"]|\bwrong\b|[¬∧∨→↔✓✗<>=+*/\\#&%@|~^_]/i);
        }
      }
      // Every option tile names an option of the board, with one word at most under it.
      const opts = new Set(step.rows.flatMap((r) => r.marks.flatMap((m) => m.options.map((o) => o.id))));
      for (const [o, t] of Object.entries(kb.options ?? {})) {
        expect(opts.has(o), `${id} ${o}`).toBe(true);
        if (t.word) expect(n(t.word), t.word).toBe(1);
      }
    }
    const text = boards.flatMap(([, , kb]) => [kb.line, ...(kb.rows ?? []).flatMap((r) => [r.label ?? '', ...(r.marks ?? []).map((m) => m.label ?? '')])]).filter(Boolean).join(' ');
    expect(fkGrade(text)).toBeLessThanOrEqual(7);
  });

  it('lesson 1: the line and each mark’s words give the clues; the answer worked out from them is the mark’s', () => {
    const kb = L1_KID.board![0];
    const line = /^(\w+) is taller than (\w+)\.$/.exec(kb.line)!;
    const one: LineClue = { t: 'before', a: line[1].toLowerCase(), b: line[2].toLowerCase() };
    for (const { r, kr } of tapped(L1_DRILL, kb)) {
      r.marks.forEach((m, j) => {
        const said = /^(?:And (\w+) than (\w+)|Just this clue): who is (tallest|second|shortest|taller)\?$/.exec(kr!.marks![j].label!)!;
        expect(said, kr!.marks![j].label).toBeTruthy();
        const clues: LineClue[] = said[1] ? [one, { t: 'before', a: said[1].toLowerCase(), b: said[2].toLowerCase() }] : [one];
        const fit = fits(L1_DO.ids, clues);
        let answer: string;
        if (said[3] === 'taller') {
          const [x, y] = m.options.filter((o) => o.id !== 'cant').map((o) => o.id);
          const xFirst = fit.some((p) => p.indexOf(x) < p.indexOf(y));
          const yFirst = fit.some((p) => p.indexOf(y) < p.indexOf(x));
          answer = xFirst && yFirst ? 'cant' : xFirst ? x : y;
        } else {
          const at = whoCanBeAt(fit, { tallest: 1, second: 2, shortest: 3 }[said[3]]!);
          answer = at.length === 1 ? at[0] : 'cant';
        }
        expect(answer, `${r.id} ${kr!.marks![j].label}`).toBe(m.answer);
      });
    }
  });

  it('lesson 2: each order’s question and each quoted sentence, worked out again, give the mark’s answer', () => {
    /** “Ava is right before Ben” or “Ava right before Ben” (the question's words) as a sentence. */
    const say = (s: string): LineClue => {
      const m = /^(\w+) (?:is )?(right before|before) (\w+)$/.exec(s)!;
      return { t: m[2] === 'before' ? 'before' : 'rightBefore', a: m[1].toLowerCase(), b: m[3].toLowerCase() } as LineClue;
    };
    [L2_EXAMPLE, L2_RIGHT].forEach((b, j) => {
      const kb = L2_KID.board![j];
      expect(kb.line).toBe(`Clue: ${SKINS.race.rightBefore && b.clues[0].t === 'rightBefore' ? 'Ava finished right before Ben.' : 'Ava finished before Ben.'}`);
      for (const { r, kr } of tapped(L2_DRILL[j], kb)) {
        r.marks.forEach((m, k) => {
          const label = kr!.marks![k].label!;
          const asked = /^(\w+, \w+, \w+): (?:is (.+)\?|does this order fit\?)$/.exec(label);
          const quoted = /^“(.+)\.”$/.exec(label);
          let answer: string;
          if (asked && asked[2]) answer = clueHolds(say(asked[2]), ids(asked[1])) ? 'true' : 'false';
          else if (asked) answer = b.clues.every((c) => clueHolds(c, ids(asked[1]))) ? 'fit' : 'not';
          else answer = statusOf(fits(b.ids, b.clues), say(quoted![1]));
          expect(answer, label).toBe(m.answer);
        });
      }
    });
  });

  it('lesson 3: each try’s line and clue, worked out again, give the mark’s answer; the move asks for the try itself', () => {
    const lines = (r: DrillRow) => ids(/, as in (.+)\.$/.exec(r.label)![1]);
    const boards3: LineBoard[] = [L3_EXAMPLE, L3_NEXT, L3_BETWEEN];
    boards3.forEach((b, j) => {
      for (const { r, kr } of tapped(L3_DRILL[j], L3_KID.board![j])) {
        if (!kr?.marks) continue;
        r.marks.forEach((m, k) => {
          const label = kr.marks![k].label!;
          if (/^Is (?:“not (first|last)”|the clue) true (?:here|in this line)\?$/.test(label)) {
            const named = /“not (first|last)”/.exec(label)?.[1];
            const clue = named ? b.clues.find((c) => c.t === (named === 'first' ? 'notFirst' : 'notLast'))! : b.clues[0];
            expect(clueHolds(clue, lines(r)) ? 'true' : 'false', `${r.id} ${label}`).toBe(m.answer);
          } else if (label === 'Keep this try?') {
            expect(m.id).toBe(`${r.id}-keep`);
          } else {
            const who = /^Which line keeps (\w+) first\?$/.exec(label)![1].toLowerCase();
            const good = fits(b.ids, b.clues).filter((p) => p[0] === who && p.join() !== lines(r).join());
            expect(good.length ? `o-${good[0].join('-')}` : 'none', label).toBe(m.answer);
          }
        });
      }
    });
  });

  it('lesson 4: each line’s questions and each spot’s question, worked out again, give the mark’s answer', () => {
    const kb1 = L4_KID.board![0];
    expect(kb1.line).toBe('Cal finished last, and Ava before Ben.');
    for (const { r, kr } of tapped(L4_DRILL[0], kb1)) {
      const line = ids(/^Test (.+)\.$/.exec(kr!.label!)![1]);
      r.marks.forEach((m, k) => {
        const label = kr!.marks![k].label!;
        const spot = /^Is (\w+) (first|last) here\?$/.exec(label);
        const ahead = /^Is (\w+) before (\w+) here\?$/.exec(label);
        const answer = spot
          ? (line[spot[2] === 'first' ? 0 : line.length - 1] === spot[1].toLowerCase() ? 'true' : 'false')
          : ahead
            ? (clueHolds({ t: 'before', a: ahead[1].toLowerCase(), b: ahead[2].toLowerCase() }, line) ? 'true' : 'false')
            : (L4_EXAMPLE.clues.every((c) => clueHolds(c, line)) ? 'fit' : 'not');
        expect(answer, label).toBe(m.answer);
      });
    }
    [[L4_TWIN, L4_DRILL[1], L4_KID.board![1]], [L4_NOSPOT_TWIN, L4_DRILL[2], L4_KID.board![2]]].forEach(([b, step, kb]) => {
      const only = fits((b as LineBoard).ids, (b as LineBoard).clues);
      expect(only).toHaveLength(1);
      const place = (step as DrillStep).rows.findIndex((r) => r.marks.length > 1);
      const marks = (kb as KidBoard).rows![place].marks!;
      (step as DrillStep).rows[place].marks.forEach((m, k) => {
        const which = /^Who finished (first|second|third|last)\?$/.exec(marks[k].label!)![1];
        const at = which === 'last' ? only[0].length - 1 : ['first', 'second', 'third'].indexOf(which);
        expect(only[0][at], marks[k].label).toBe(m.answer);
      });
    });
    // The no-spot board's first row: “Ben is next to Ava and to Dee.” and “Where is Ben?”. Next to two different people
    // in a line means between them, so the answer worked out from those words is the middle.
    const mid = L4_DRILL[2].rows[0];
    const kmid = L4_KID.board![2].rows![0];
    const said = /^(\w+) is next to (\w+) and to (\w+)\.$/.exec(kmid.label!)!;
    expect(said, kmid.label).toBeTruthy();
    expect(kmid.marks!.map((m) => m.label)).toEqual([`Where is ${said[1]}?`]);
    const [x, a, c] = said.slice(1).map((w) => w.toLowerCase());
    const next = (p: readonly string[], u: string, v: string) => Math.abs(p.indexOf(u) - p.indexOf(v)) === 1;
    const between = fits(L4_NOSPOT_TWIN.ids, []).filter((p) => next(p, x, a) && next(p, x, c)).every((p) => clueHolds({ t: 'between', a: x, b: a, c }, p));
    expect(mid.marks).toHaveLength(1);
    expect(between ? 'mid' : 'end').toBe(mid.marks[0].answer);
  });
});

describe('lesson 2’s fourth card is a plain card, and the stop check’s why item has no kid block', () => {
  it('the round’s one word card is “right before”', () => {
    const wordCards = L2_KID.cards.filter((c) => /^[A-Z“][^:.]*: /.test(c.line));
    expect(wordCards.map((c) => c.line)).toEqual(['Right before: just one place sooner, with no one between.']);
  });

  it('the closing why item of the stop check has no kid block', () => {
    const why = SEEDS.flatMap((seed) => stop3.check!(createRng(seed))).filter((x) => x.tags?.includes('why'));
    expect(why.length).toBe(SEEDS.length);
    for (const it of why) expect(it.kid).toBeUndefined();
  });
});
