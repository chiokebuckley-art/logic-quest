/**
 * Stop 7, Lesson 2 · The best explanation. Every answer is worked out again here from the model data (which ideas
 * fit which clues, and how many extra things each idea needs), without calling the code that set it.
 */
import { describe, expect, it } from 'vitest';
import { arcadeItem, checkItems, freshItems, lesson } from '../../content/stop7/explanations';
import {
  FITS_CLOSING,
  FITS_VS_EXPLAINS,
  L2_CARDS,
  MAKERS,
  STORIES,
  WHOLE_STORY,
  WORKED,
  WORKED_BOARD,
  WORKED_NEW,
  WORKED_SHOWN,
  EXPLAIN_SECONDS,
  fitsQuestion,
  wholeStoryQuestion,
  type Clue,
  type ExplainKind,
  type ExplainMade,
  type ExplainSkin,
  type Idea,
} from '../puzzles/explanations';
import { checkDrill, marksToTap } from '../drill';
import { looks } from '../fresh';
import { READING, fkGrade, longestSentence } from '../readability';
import { createRng } from '../rng';
import { teachStrings } from '../teach';
import type { ChooseItem, ConfusedQuestion, DrillStep, Item, Scene } from '../types';

const SEEDS = 240;
const SKINS: ExplainSkin[] = ['everyday', 'fantasy', 'abstract'];
const KINDS: ExplainKind[] = ['best', 'test', 'new-clue', 'revise'];
const TAGS: Record<ExplainKind, string> = { best: 'explain-best', test: 'explain-test', 'new-clue': 'explain-new-clue', revise: 'explain-revise' };

/** The best explanation, worked out here: fits every clue, then the fewest extra things; null for none or a tie. */
function best(ideas: readonly Idea[], clues: readonly Clue[]): Idea | null {
  const fit = ideas.filter((i) => clues.every((c) => c.fits[i.id] === true));
  if (!fit.length) return null;
  const n = Math.min(...fit.map((i) => i.extras.length));
  const top = fit.filter((i) => i.extras.length === n);
  return top.length === 1 ? top[0] : null;
}
const fitsEvery = (i: Idea, clues: readonly Clue[]) => clues.every((c) => c.fits[i.id] === true);
const choose = (m: ExplainMade) => m.item as ChooseItem;

function made(kind: ExplainKind, skin: ExplainSkin, seed: number): ExplainMade {
  return MAKERS[kind](createRng(seed), { skin });
}

describe('the stories', () => {
  it('each story: three ideas needing 0, 1 and 2 extra things, one main clue they all fit, and one clue that rules out each idea', () => {
    for (const s of STORIES) {
      expect(s.ideas.map((i) => i.extras.length).sort(), s.id).toEqual([0, 1, 2]);
      const [main, ...rest] = s.clues;
      expect(s.ideas.every((i) => main.fits[i.id]), `${s.id} main clue`).toBe(true);
      expect(rest.length, s.id).toBe(3);
      const outs = rest.map((c) => s.ideas.filter((i) => !c.fits[i.id]).map((i) => i.id));
      for (const o of outs) expect(o.length, s.id).toBe(1);
      expect(new Set(outs.flat()).size, `${s.id}: each idea is ruled out by one clue`).toBe(3);
      for (const c of rest) for (const i of s.ideas) if (!c.fits[i.id]) expect(c.why[i.id]?.trim(), `${s.id} ${c.id} why`).toBeTruthy();
      // The neutral clue: every idea fits it, it is never a shown clue, and its check is not another clue's check.
      expect(s.neutral, s.id).toBeDefined();
      expect(s.ideas.every((i) => s.neutral!.fits[i.id]), `${s.id} neutral`).toBe(true);
      expect(s.clues).not.toContain(s.neutral);
      expect(s.clues.map((c) => c.check)).not.toContain(s.neutral!.check);
      // An idea's extra things are not just the idea said again.
      for (const i of s.ideas) for (const x of i.extras) expect(i.text.toLowerCase(), `${s.id} ${i.id}`).not.toContain(x.toLowerCase());
    }
  });

  it('the mud story: the clue that rules out the pond idea says nothing about the weather, and the paint feedback says why rain still fits', () => {
    const mud = STORIES.find((s) => s.id === 'mud')!;
    const pondOut = mud.clues.find((c) => c.fits.pond === false)!;
    expect(pondOut.text).not.toMatch(/dry|rain|wet|mud|weather/i);
    expect(pondOut.check).not.toMatch(/dry|rain/i);
    expect(pondOut.fits.rain).toBe(true);
    expect(pondOut.why.rain).toBeTruthy();
    // In a "which is best" item with that clue, picking paint over rain is told why rain still fits it.
    let seen = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made('best', 'everyday', seed);
      if (m.case.story.id !== 'mud' || !m.case.shown.includes(pondOut)) continue;
      const it = choose(m);
      const paint = m.case.ideas.find((i) => i.id === 'paint')!;
      if (it.answer !== 'rain' || !fitsEvery(paint, m.case.shown)) continue;
      seen++;
      expect(it.feedback!.paint.detail.join(' ')).toContain(pondOut.why.rain);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('the worked example is never a quiz story', () => {
    expect(STORIES.some((s) => s.id === WORKED.id || s.setting === WORKED.setting)).toBe(false);
  });
});

describe('every kind, every skin: the answer is the only choice the model makes right', () => {
  it('which explanation is best', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made('best', skin, seed);
      const it = choose(m);
      const b = best(m.case.ideas, m.case.shown);
      expect(b, `${skin} ${seed}: one best`).not.toBeNull();
      expect(it.answer).toBe(b!.id);
      expect(m.case.shown.length).toBeGreaterThanOrEqual(2);
      expect(m.case.shown.length).toBeLessThanOrEqual(3);
      expect(it.choices.map((c) => c.id).sort()).toEqual(m.case.ideas.map((i) => i.id).sort());
      for (const i of m.case.ideas) {
        if (i.id === b!.id) continue;
        const fb = it.feedback![i.id];
        const miss = m.case.shown.findIndex((c) => !c.fits[i.id]);
        if (miss >= 0) {
          expect(fb.headline, `${skin} ${seed}`).toContain('does not fit clue');
          expect(fb.headline).toContain(m.case.story.letters ? `clue ${'ABCD'[miss]}` : `clue ${miss + 1}`);
        } else {
          expect(i.extras.length).toBeGreaterThan(b!.extras.length);
          expect(fb.headline).toContain('fewer extra things');
        }
      }
    }
  });

  it('a new clue: the old best is out and the new best is worked out again', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made('new-clue', skin, seed);
      const it = choose(m);
      const { ideas, shown, added } = m.case;
      expect(added).toBeDefined();
      expect(shown).not.toContain(added);
      const before = best(ideas, shown)!;
      const now = best(ideas, [...shown, added!]);
      expect(before).not.toBeNull();
      expect(now).not.toBeNull();
      expect(added!.fits[before.id]).toBe(false);
      expect(now!.id).not.toBe(before.id);
      expect(it.answer).toBe(now!.id);
      expect(it.conflict).toBe(true);
      expect(it.feedback![before.id].headline).toContain('new clue');
      for (const c of it.choices) if (c.id !== it.answer) expect(it.feedback![c.id], `${skin} ${seed} ${c.id}`).toBeDefined();
    }
  });

  it('which check could rule one of two ideas out', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made('test', skin, seed);
      const it = choose(m);
      const { story, ideas, shown } = m.case;
      const pair = ideas.filter((i) => fitsEvery(i, shown));
      expect(pair.length, `${skin} ${seed}: two ideas fit`).toBe(2);
      const ruleOne = (c: Clue) => pair.filter((i) => c.fits[i.id]).length === 1;
      const byCheck = (label: string) => [...story.clues, ...(story.neutral ? [story.neutral] : [])].find((c) => c.check === label);
      // Every skin has a check both ideas fit, so the answer is not just "the only new check".
      expect(it.choices.map((c) => c.id), `${skin} ${seed}`).toContain('same');
      for (const ch of it.choices) {
        const again = /^Look at clue (\w) again\.$/.exec(ch.label);
        let useful: boolean;
        if (again) {
          const k = story.letters ? 'ABCD'.indexOf(again[1]) : Number(again[1]) - 1;
          expect(shown[k], ch.label).toBeDefined();
          useful = ruleOne(shown[k]);
        } else if (ch.label.startsWith('No check')) useful = false;
        else {
          const c = byCheck(ch.label);
          expect(c, ch.label).toBeDefined();
          expect(shown).not.toContain(c);
          useful = ruleOne(c!);
        }
        expect(useful, `${skin} ${seed}: ${ch.label}`).toBe(ch.id === it.answer);
        if (ch.id !== it.answer) expect(it.feedback![ch.id].headline.trim().length).toBeGreaterThan(0);
      }
      expect(it.feedback!.none.headline).toContain('not a proof');
      expect(it.feedback!.again.headline).toContain('can’t rule either one out');
    }
  });

  it('can it fail: the first best guess fit, then a new clue ruled it out, so it was not a proof', () => {
    for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made('revise', skin, seed);
      const it = choose(m);
      const { ideas, shown, added } = m.case;
      const first = best(ideas, shown)!;
      const now = best(ideas, [...shown, added!]);
      expect(fitsEvery(first, shown)).toBe(true);
      expect(added!.fits[first.id]).toBe(false);
      expect(now && now.id !== first.id).toBe(true);
      expect(it.answer).toBe('guess');
      expect(it.choices.find((c) => c.id === 'guess')!.label.startsWith('No.')).toBe(true);
      expect(it.tags).toEqual(['can-fail']);
      expect(it.prompt).toContain(m.case.story.letters ? first.name : first.text);
      // "It never fit" and "it fit, so it is proved" are both false here: it fit every first clue, and it was ruled out.
      expect(it.feedback!.fit.detail.join(' ')).toContain('did fit');
      expect(it.feedback!.simple.headline).toContain('simplest');
      // A name in the middle of a sentence is not capitalised (“the cook”).
      for (const fb of Object.values(it.feedback!)) expect(fb.headline.slice(1), `${skin} ${seed}`).not.toMatch(/ The /);
    }
  });

  it('a story scene names every idea with its extra things, so every idea the hint or teaching names has been seen', () => {
    for (const kind of KINDS) for (const skin of ['everyday', 'fantasy'] as ExplainSkin[]) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made(kind, skin, seed);
      const it = choose(m);
      expect(it.scene?.kind).toBe('text');
      const lines = (it.scene as { lines: string[] }).lines;
      for (const i of m.case.ideas) expect(lines.some((l) => l.startsWith(`“${i.text}” needs`)), `${kind} ${skin} ${seed}: ${i.text}`).toBe(true);
      if (kind === 'revise') {
        // Clues, then every idea, then the first best guess, the new clue and the best guess now.
        const at = (p: string) => lines.findIndex((l) => l.startsWith(p));
        const lastNeeds = Math.max(...m.case.ideas.map((i) => at(`“${i.text}” needs`)));
        expect(at('Clue 2:')).toBeLessThan(lastNeeds);
        expect(lastNeeds).toBeLessThan(at('Best guess:'));
        expect(at('Best guess:')).toBeLessThan(at('New clue'));
        expect(at('New clue')).toBeLessThan(at('Best guess now:'));
      }
    }
  });

  it('the answer is not always in the same place', () => {
    for (const kind of KINDS) for (const skin of SKINS) {
      const at = new Set<number>();
      for (let seed = 1; seed <= SEEDS; seed++) {
        const it = choose(made(kind, skin, seed));
        at.add(it.choices.findIndex((c) => c.id === it.answer));
      }
      expect(at.size, `${kind} ${skin}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('a hint case never gives the answer away', () => {
    for (const kind of KINDS) for (const skin of SKINS) for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made(kind, skin, seed);
      const it = choose(m);
      const hc = it.hintCase!;
      const text = [hc.label, hc.note ?? '', ...(hc.truths ?? []).map((t) => t.who)].join(' ').toLowerCase();
      const ans = it.choices.find((c) => c.id === it.answer)!;
      expect(text, `${kind} ${skin} ${seed}`).not.toContain(ans.label.toLowerCase());
      const idea = m.case.ideas.find((i) => i.id === it.answer);
      if (idea) {
        expect(text, `${kind} ${skin} ${seed}`).not.toContain(idea.text.toLowerCase());
        expect(text, `${kind} ${skin} ${seed}`).not.toContain(idea.name.toLowerCase());
      }
    }
  });

  it('every item: 2-5 distinct choices, feedback for every wrong choice and none for the right one, a hint case and teaching', () => {
    for (const kind of KINDS) for (const skin of SKINS) for (let seed = 1; seed <= 60; seed++) {
      const m = made(kind, skin, seed);
      const it = choose(m);
      expect(m.tag).toBe(TAGS[kind]);
      expect(it.choices.length).toBeGreaterThanOrEqual(2);
      expect(it.choices.length).toBeLessThanOrEqual(5);
      expect(new Set(it.choices.map((c) => c.label)).size).toBe(it.choices.length);
      for (const c of it.choices) {
        if (c.id === it.answer) expect(it.feedback![c.id]).toBeUndefined();
        else {
          expect(it.feedback![c.id]?.headline.trim(), `${kind} ${skin} ${seed} ${c.id}`).toBeTruthy();
          expect(it.whyWrong![c.id]).toContain(it.feedback![c.id].headline);
        }
      }
      expect(it.hintCase).toBeDefined();
      expect(it.teach?.cases?.length).toBeGreaterThanOrEqual(2);
      expect(it.explain.trim().length).toBeGreaterThan(0);
    }
  });

  it('the same seed gives the same item', () => {
    for (const kind of KINDS) for (const skin of SKINS) for (let seed = 1; seed <= 20; seed++) expect(made(kind, skin, seed).item).toEqual(made(kind, skin, seed).item);
  });
});

describe('the lesson', () => {
  const pack = (seed: number) => lesson.practice(createRng(seed)) as ChooseItem[];

  it('every pack: best, check, new clue (conflict), can-fail, in at least two skins, the same for the same seed', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const items = pack(seed);
      expect(items.map((i) => i.skill)).toEqual(['s7.explain-best', 's7.explain-test', 's7.explain-new-clue', 's7.explain-revise']);
      expect(items.filter((i) => i.tags?.includes('can-fail')).length).toBe(1);
      expect(items[2].conflict).toBe(true);
      const skins = new Set(items.map((i) => (i.scene?.kind === 'grid' ? 'abstract' : STORIES.find((s) => i.prompt.startsWith(s.setting))!.skin)));
      expect(skins.size, `seed ${seed}: skins vary`).toBeGreaterThanOrEqual(2);
      // A story is used once per pack.
      const stories = items.filter((i) => i.scene?.kind === 'text').map((i) => STORIES.find((s) => i.prompt.startsWith(s.setting))!.id);
      expect(new Set(stories).size).toBe(stories.length);
      expect(new Set(items.map(looks)).size).toBe(4);
      expect(pack(seed)).toEqual(items);
      expect(lesson.pass).toEqual({ firstTry: 3, include: [{ tag: 'can-fail', label: expect.any(String) }] });
    }
  });

  it('each skill has many different-looking items, so a new example after a miss looks new', () => {
    const seen: Record<string, Set<string>> = {};
    for (let seed = 1; seed <= SEEDS; seed++) for (const it of pack(seed)) (seen[it.skill] ??= new Set()).add(looks(it));
    for (const [skill, s] of Object.entries(seen)) expect(s.size, skill).toBeGreaterThanOrEqual(30);
  });

  it('the boards: the worked example’s grid, every mark computed from the model, words for every wrong mark', () => {
    // Board 1 is the fits-vs-explains board (tested below); boards 2 and 3 are on the worked example's grid.
    const [, b1, b2] = lesson.drill!;
    type Grid = Extract<NonNullable<typeof b1.scene>, { kind: 'grid' }>;
    // Board 2 is the worked example's grid with no best guess named (so no board mark can be copied from a caption).
    const worked = lesson.ideas[L2_CARDS.example].scene as Grid;
    const g1 = b1.scene as Grid;
    expect(b1.twin?.trim()).toBeTruthy();
    expect({ ...g1, caption: '' }).toEqual({ ...worked, caption: '' });
    expect(worked.caption).toMatch(/best/i);
    expect(g1.caption ?? '').not.toMatch(/best/i);
    const clues = [...WORKED_SHOWN, WORKED_BOARD];
    // Board 2 is a twin of the worked grid: the board's clue added, no best named, and a note saying what changed.
    expect(b2.twin?.trim()).toBeTruthy();
    expect(b2.scene?.kind).toBe('grid');
    const g2 = b2.scene as Extract<NonNullable<typeof b2.scene>, { kind: 'grid' }>;
    expect(g2.cols.map((c) => c.id)).toEqual(clues.map((c) => c.id));
    expect(g2.caption ?? '').not.toMatch(/best/i);
    // Board 1's new column is not a copy of a given column, so it can't be marked by copying.
    for (const g of WORKED_SHOWN) expect(WORKED.ideas.every((i) => !!g.fits[i.id] === !!WORKED_BOARD.fits[i.id]), g.id).toBe(false);
    for (const r of b1.rows) {
      const idea = WORKED.ideas.find((i) => i.id === r.id)!;
      r.marks.forEach((m, k) => {
        expect(m.answer).toBe(clues[k].fits[idea.id] ? 'yes' : 'no');
        expect(!!m.given).toBe(clues[k] !== WORKED_BOARD);
      });
    }
    const right = best(WORKED.ideas, clues)!;
    for (const r of b2.rows) {
      if (r.id === 'best') expect(r.marks[0].answer).toBe(right.id);
      else if (r.id === 'first') expect(r.marks[0].answer).toBe(best(WORKED.ideas, WORKED_SHOWN)!.id);
      else if (r.id === 'check') continue; // checked in its own test below
      else expect(r.marks[0].answer).toBe(fitsEvery(WORKED.ideas.find((i) => i.id === r.id)!, clues) ? 'yes' : 'no');
    }
    for (const b of [b1, b2]) for (const m of b.rows.flatMap((r) => r.marks)) if (!m.given) for (const o of m.options) if (o.id !== m.answer) expect(m.why[o.id]?.trim()).toBeTruthy();
    const taps = [b1, b2].flatMap((b) => b.rows.flatMap((r) => r.marks.filter((m) => !m.given))).length;
    expect(taps).toBeLessThanOrEqual(12);
    // The worked example: rain is the best guess; after the weather report, the truck idea is.
    expect(best(WORKED.ideas, WORKED_SHOWN)!.id).toBe('rain');
    expect(best(WORKED.ideas, [...WORKED_SHOWN, WORKED_NEW])!.id).toBe('truck');
  });

  it('the Do has the learner break a tie by extra things: board 2 first picks the best guess from the first two clues', () => {
    const b2 = lesson.drill![2];
    const row = b2.rows[0];
    expect(row.id).toBe('first');
    const pair = WORKED.ideas.filter((i) => fitsEvery(i, WORKED_SHOWN));
    // Two ideas fit both clues, with different extra things, and one idea misses a clue: both halves of the rule.
    expect(pair.length).toBe(2);
    expect(pair[0].extras.length).not.toBe(pair[1].extras.length);
    expect(WORKED.ideas.some((i) => !fitsEvery(i, WORKED_SHOWN))).toBe(true);
    const m = row.marks[0];
    const first = best(WORKED.ideas, WORKED_SHOWN)!;
    expect(m.given).toBeFalsy();
    expect(m.answer).toBe(first.id);
    expect(m.options.map((o) => o.id).sort()).toEqual(WORKED.ideas.map((i) => i.id).sort());
    const tie = pair.find((i) => i.id !== first.id)!;
    expect(m.why[tie.id]).toContain(`${tie.extras.length} extra things`);
    // It comes before the roof clue is used: the best guess now is a later row, and it is a different idea.
    const k = b2.rows.findIndex((r) => r.id === 'best');
    expect(k).toBeGreaterThan(0);
    expect(b2.rows[k].marks[0].answer).not.toBe(first.id);
  });

  it('a check is taught before the quiz: card 5 works one, board 1 says why the roof is a good check, board 2 has the learner pick one', () => {
    const pair = WORKED.ideas.filter((i) => fitsEvery(i, WORKED_SHOWN));
    const splits = (c: Clue) => pair.filter((i) => c.fits[i.id]).length === 1;
    // Card 5: the rule, a check both ideas fit (can't tell them apart), and one they disagree on, drawn as a "?" column.
    const card = lesson.ideas[L2_CARDS.example + 1];
    const body = card.body.join(' ');
    expect(body).toContain('look for a clue that one idea fits and the other does not');
    const same = WORKED_SHOWN.find((c) => !splits(c))!;
    expect(body).toContain(`Both ideas fit “${same.short},”`);
    expect(body).toContain('can’t tell them apart');
    expect(splits(WORKED_NEW)).toBe(true);
    expect(body).toContain('could rule one idea out');
    const g = card.scene as Extract<NonNullable<typeof card.scene>, { kind: 'grid' }>;
    expect(g.cols.map((c) => c.label)).toContain(`${WORKED_NEW.short}?`);
    for (const i of WORKED.ideas) expect(g.marks[i.id][WORKED_NEW.id]).toBe(WORKED_NEW.fits[i.id] ? 'yes' : 'no');
    // Board 1's done line: the roof splits the two ideas, so it is a good check.
    expect(splits(WORKED_BOARD)).toBe(true);
    expect(lesson.drill![1].done).toContain('good check');
    // Board 2: a check mark whose answer is the clue the two ideas disagree on; every wrong option says why.
    const m = lesson.drill![2].rows.find((r) => r.id === 'check')!.marks[0];
    const byId = (id: string) => [...WORKED_SHOWN, WORKED_BOARD, WORKED_NEW].find((c) => c.id === id);
    for (const o of m.options) {
      const c = byId(o.id);
      const useful = c ? splits(c) : false;
      expect(useful, o.label).toBe(o.id === m.answer);
      if (o.id !== m.answer) expect(m.why[o.id]?.trim()).toBeTruthy();
    }
    expect(m.options.some((o) => o.id === 'none')).toBe(true);
    // The check board comes before the quiz, and the quiz's check item is item 2.
    expect(lesson.drill![2].afterCard).toBeLessThan(lesson.ideas.length);
  });

  it('every explanation item gets 120 seconds in a check (they read long), and the “Was it a proof?” story 150', () => {
    expect(EXPLAIN_SECONDS).toBe(120);
    for (const kind of KINDS) for (const skin of SKINS) for (let seed = 1; seed <= 30; seed++) expect(choose(made(kind, skin, seed)).seconds, `${kind} ${skin} ${seed}`).toBe(kind === 'revise' ? 150 : 120);
    for (let seed = 1; seed <= 60; seed++) {
      for (const m of checkItems(createRng(seed))) expect(m.item.seconds).toBe(m.tag === 'explain-revise' ? 150 : 120);
      const a = arcadeItem(createRng(seed));
      expect(a.item.seconds).toBe(a.tag === 'explain-revise' ? 150 : 120);
    }
  });

  it('no quiz, check or Arcade item repeats the worked example', () => {
    const cards = new Set(lesson.ideas.flatMap((c) => (c.scene ? [JSON.stringify(c.scene)] : [])));
    const all: Item[] = [];
    for (let seed = 1; seed <= 120; seed++) {
      all.push(...pack(seed));
      all.push(...checkItems(createRng(seed)).map((m) => m.item as Item));
      all.push(arcadeItem(createRng(seed)).item as Item);
    }
    for (const it of all) {
      expect(cards.has(JSON.stringify(it.scene))).toBe(false);
      expect(it.prompt).not.toContain(WORKED.setting);
      expect(JSON.stringify(it.scene)).not.toContain('sprinkler');
    }
  });

  it('check share: exactly two different items, at least one conflict, and many looks per slot', () => {
    const slots = [new Set<string>(), new Set<string>()];
    for (let seed = 1; seed <= 300; seed++) {
      const ms = checkItems(createRng(seed));
      expect(ms.length).toBe(2);
      const items = ms.map((m) => ({ id: 'x', stop: 7, lesson: 's7.l2', skill: `s7.${m.tag}`, ...m.item }) as Item);
      expect(new Set(items.map(looks)).size).toBe(2);
      expect(items.some((i) => i.conflict)).toBe(true);
      items.forEach((it, k) => slots[k].add(looks(it)));
      expect(checkItems(createRng(seed))).toEqual(ms);
    }
    for (const s of slots) expect(s.size).toBeGreaterThanOrEqual(10);
  });

  it('Arcade gives a valid item; a new example after a miss is the same kind about a different story', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const it = arcadeItem(createRng(seed)).item as ChooseItem;
      expect(it.choices.some((c) => c.id === it.answer)).toBe(true);
    }
    const storyOf = (it: { prompt: string }) => STORIES.find((s) => it.prompt.startsWith(s.setting));
    for (let seed = 1; seed <= SEEDS; seed++) for (const missed of pack(seed)) {
      const out = freshItems(missed, createRng(seed + 1000));
      expect(out.length).toBe(1);
      const fresh = out[0].item as ChooseItem;
      expect(`s7.${out[0].tag}`).toBe(missed.skill);
      const was = storyOf(missed);
      const now = storyOf(fresh);
      expect(now, `seed ${seed}: a story`).toBeDefined();
      if (was) {
        expect(now!.id, `seed ${seed} ${missed.skill}`).not.toBe(was.id);
        expect(now!.skin).toBe(was.skin);
      }
      expect(fresh.prompt).not.toContain(WORKED.setting);
    }
  });

  it('every generated string reads at grade 7 or lower, with no sentence over 25 words', () => {
    const text: string[] = [];
    for (const kind of KINDS) for (const skin of SKINS) for (let seed = 1; seed <= 40; seed++) {
      const it = choose(made(kind, skin, seed));
      text.push(it.prompt, it.explain, ...teachStrings(it), ...it.choices.map((c) => c.label));
      if (it.scene?.kind === 'text') text.push(...it.scene.lines);
    }
    const all = text.join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(all).not.toMatch(/["']/);
  });
});

// ---------- the whole story, and fits vs explains (docs/CONTENT_GUIDE.md, “Distinctions”) ----------

/** The words of a check or clue that name what it looks at: everything but small words and the story’s own names. */
const STOP_WORDS = new Set(['a', 'an', 'the', 'at', 'in', 'on', 'for', 'of', 'to', 'if', 'is', 'was', 'are', 'be', 'when', 'what', 'where', 'who', 'how', 'look', 'ask', 'see', 'find', 'out', 'go', 'and', 'with', 'from', 'by', 'it', 'its', 'still', 'this', 'that', 'has', 'have', 'had', 'his', 'her', 'any', 'all', 'today', 'not', 'no', 'does', 'did', 'got']);
const topics = (text: string, names: readonly string[]) =>
  text
    .toLowerCase()
    .replace(/’s\b/g, '')
    .split(/[^a-z]+/)
    .filter((w) => w && !STOP_WORDS.has(w) && !names.includes(w));

describe('a check that can’t tell two ideas apart (s7-rev-1)', () => {
  it('in every story, the “same” check looks at something no ruling-out clue is about, so it can never rule an idea out', () => {
    for (const s of STORIES) {
      const names = [s.who.toLowerCase()];
      const check = topics(s.neutral!.check, names);
      expect(check.length, s.id).toBeGreaterThan(0);
      for (const c of s.clues.slice(1)) {
        const about = new Set([...topics(c.text, names), ...topics(c.check, names)]);
        for (const w of check) expect(about.has(w), `${s.id}: “${s.neutral!.check}” could find “${c.text}” (${w})`).toBe(false);
      }
      // Every idea fits what it could find, and none explains it.
      expect(s.ideas.every((i) => s.neutral!.fits[i.id] && !s.neutral!.explains?.includes(i.id)), s.id).toBe(true);
    }
    // The old mud check would fail this: looking in Rex’s bed shows whether Rex is wet.
    const mud = STORIES.find((s) => s.id === 'mud')!;
    const wet = mud.clues.find((c) => c.text === 'Rex is soaking wet.')!;
    expect(topics('Look in Rex’s bed.', ['omar']).some((w) => topics(wet.text, ['omar']).includes(w))).toBe(true);
    expect(mud.neutral!.check).toBe('Ask when Omar got home.');
    expect(mud.neutral!.text).toBe('Omar got home at four.');
  });

  it('a mud “which check” item never offers a check that could rule an idea out as the wrong “same” choice', () => {
    let seen = 0;
    for (let seed = 1; seed <= SEEDS; seed++) {
      const m = made('test', 'everyday', seed);
      if (m.case.story.id !== 'mud') continue;
      const it = choose(m);
      const same = it.choices.find((c) => c.id === 'same')!;
      expect(same.label).toBe('Ask when Omar got home.');
      expect(it.feedback!.same.detail.join(' ')).toContain('Whatever it shows, both ideas stay in.');
      seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('fits is not explains: each idea is the whole story (s7-l2-fits-vs-explains, s7-rev-2)', () => {
  type Contrast = Extract<Scene, { kind: 'contrast' }>;
  const plant = STORIES.find((s) => s.id === 'plant')!;
  const cold = plant.ideas.find((i) => i.id === 'cold')!;
  const soil = plant.clues.find((c) => c.text === 'The soil in the pot is still wet.')!;
  const sprinkler = WORKED.ideas.find((i) => i.id === 'sprinkler')!;
  const street = WORKED.clues.find((c) => c.short === 'Street wet')!;

  it('card 2 states the whole-story rule and the Stop 6 bridge; the terms say it too', () => {
    const card = lesson.ideas.find((c) => c.title === 'Fit every clue')!.body.join(' ');
    expect(card).toContain('Picture the idea as the whole story of what happened. It fits a clue if the clue could still be true in that story. It misses a clue if the story would make the clue different.');
    expect(card).toContain('In Stop 6, you asked: could it happen another way? Here, each idea is the whole story.');
    expect(card).toContain('If it was all that happened, the street would be dry.');
    expect(card).not.toContain('makes sense if the idea is true');
    const it = choose(made('best', 'everyday', 1));
    const terms = Object.fromEntries((it.teach!.terms ?? []).map((t) => [t.word, t.meaning]));
    expect(terms['Fits a clue']).toBe('the clue could still be true in the idea’s whole story. The idea does not have to explain it.');
    expect(terms['Misses a clue']).toBe('the idea’s story would make the clue different.');
    expect(terms['The whole story']).toBeTruthy();
    expect(lesson.ideas.length).toBeLessThanOrEqual(7);
  });

  it('the contrast card: the sprinkler and “Street wet” misses; the cold room and “Soil still wet” fits without explaining it', () => {
    expect(lesson.distinctions).toEqual([FITS_VS_EXPLAINS]);
    const k = lesson.ideas.findIndex((c) => c.distinction === FITS_VS_EXPLAINS.id);
    expect(k).toBe(L2_CARDS.contrast);
    expect(k).toBeLessThan(L2_CARDS.example);
    const s = lesson.ideas[k].scene as Contrast;
    expect(s.kind).toBe('contrast');
    const [a, b] = s.pairs;
    expect([a.world, a.says]).toEqual([`${sprinkler.text}.`, street.text]);
    expect([b.world, b.says]).toEqual([`${cold.text}.`, soil.text]);
    // The truths, from the model data here.
    expect(a.truth).toBe(street.fits.sprinkler);
    expect(a.truth).toBe(false);
    expect(b.truth).toBe(soil.fits.cold);
    expect(b.truth).toBe(true);
    expect(soil.explains ?? []).not.toContain('cold');
    expect(s.words).toMatchObject({ worldTag: 'Whole story', truth: 'Fits', untruth: 'Misses' });
    expect(s.ask?.q).toBe('Does an idea have to explain a clue to fit it?');
    expect(s.ask?.a.startsWith('No.')).toBe(true);
  });

  it('its board sits right after it: each case’s marks come from the model, and the right marks pass', () => {
    const b = lesson.drill![0];
    expect(b.distinction).toBe(FITS_VS_EXPLAINS.id);
    expect(b.afterCard).toBe(L2_CARDS.contrast);
    expect(b.scene).toEqual(lesson.ideas[L2_CARDS.contrast].scene);
    expect(b.scaffold).toBe('full');
    const all = [...STORIES, WORKED];
    for (const r of b.rows) {
      const [, ideaText, clueText] = /^Whole story: (.+)\. Clue: (.+)$/.exec(r.label)!;
      const st = all.find((x) => x.ideas.some((i) => i.text === ideaText))!;
      const idea = st.ideas.find((i) => i.text === ideaText)!;
      const clue = st.clues.find((c) => c.text === clueText)!;
      const [exp, fit] = r.marks;
      expect(exp.answer).toBe(clue.explains?.includes(idea.id) ? 'yes' : 'no');
      expect(fit.answer).toBe(clue.fits[idea.id] ? 'fit' : 'miss');
      // An idea that explains a clue always fits it.
      if (exp.answer === 'yes') expect(fit.answer).toBe('fit');
      expect(fit.compare).toEqual({ says: clue.text, world: `${idea.text}.` });
    }
    // The cases hold every kind: a miss, a fit it does not explain, and a fit it does explain.
    const kinds = b.rows.map((r) => r.marks.map((m) => m.answer).join('/'));
    expect(kinds).toContain('no/miss');
    expect(kinds).toContain('no/fit');
    expect(kinds).toContain('yes/fit');
    expect(checkDrill(b, Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer]))).done).toBe(true);
  });

  it('the mix-ups: a fit marked a miss because the idea does not explain it; a miss kept by adding another way', () => {
    const b = lesson.drill![0];
    const right = Object.fromEntries(marksToTap(b).map((m) => [m.id, m.answer]));
    const diag = (wrong: Record<string, string>) => checkDrill(b, { ...right, ...wrong }).diagnosis;
    const caseOf = (pred: (exp: string, fit: string) => boolean) => b.rows.find((r) => pred(r.marks[0].answer, r.marks[1].answer))!.id;
    const fitNoExplain = caseOf((e, f) => e === 'no' && f === 'fit');
    const miss = caseOf((e, f) => e === 'no' && f === 'miss');
    const explained = caseOf((e) => e === 'yes');
    expect(diag({ [`${fitNoExplain}-fit`]: 'miss' })).toBe('fits-as-explains');
    expect(diag({ [`${miss}-fit`]: 'fit' })).toBe('not-whole-story');
    expect(diag({ [`${explained}-fit`]: 'miss' })).toBeUndefined();
    expect(diag({ [`${fitNoExplain}-explain`]: 'yes' })).toBeUndefined();
    expect(diag({})).toBeUndefined();
    const msg = checkDrill(b, { ...right, [`${fitNoExplain}-fit`]: 'miss' }).message;
    expect(msg.startsWith('You may be treating “fits” and “explains” as the same thing. They are two different things.')).toBe(true);
    for (const m of b.misconceptions!) {
      expect(m.when).toBe('picks');
      expect(m.text.startsWith('You may be treating')).toBe(true);
    }
  });

  it('the grid board names fits-as-explains: a ✗ on the dry roof for an idea whose story leaves it possible; the rain box is a plain slip', () => {
    const g = lesson.drill!.find((d) => d.id === 's7.l2-do1')!;
    const right = Object.fromEntries(marksToTap(g).map((m) => [m.id, m.answer]));
    const diag = (wrong: Record<string, string>) => checkDrill(g, { ...right, ...wrong }).diagnosis;
    // Worked out here from the model: the ideas that fit the roof clue without explaining it.
    const quiet = WORKED.ideas.filter((i) => WORKED_BOARD.fits[i.id] && !(WORKED_BOARD.explains ?? []).includes(i.id));
    expect(quiet.map((i) => i.id).sort()).toEqual(['sprinkler', 'truck']);
    for (const i of quiet) expect(diag({ [`${i.id}-${WORKED_BOARD.id}`]: 'no' }), i.id).toBe('fits-as-explains');
    const missed = WORKED.ideas.find((i) => !WORKED_BOARD.fits[i.id])!;
    expect(diag({ [`${missed.id}-${WORKED_BOARD.id}`]: 'yes' })).toBeUndefined();
    expect(diag({})).toBeUndefined();
    expect(g.confused?.length).toBe(2);
    expect(g.words?.closing).toBe(FITS_CLOSING);
  });

  it('story questions say the rule, carry “I’m confused” and the clue board; grids and “was it a proof?” items do not', () => {
    const wellFormed = (qs: readonly ConfusedQuestion[], where: string) => {
      expect(qs.length, where).toBeGreaterThanOrEqual(1);
      expect(qs.length, where).toBeLessThanOrEqual(3);
      for (const q of qs) {
        expect(q.options.filter((o) => o.right).length, `${where} ${q.q}`).toBe(1);
        expect(q.options.some((o) => o.label === 'Not sure'), `${where} ${q.q}`).toBe(true);
      }
    };
    wellFormed(lesson.drill![0].confused!, 'board');
    expect(lesson.drill![0].words?.closing).toBe(FITS_CLOSING);
    for (const kind of KINDS) for (const skin of SKINS) for (let seed = 1; seed <= 40; seed++) {
      const m = made(kind, skin, seed);
      const it = choose(m);
      const story = !m.case.story.letters;
      if (!story || kind === 'revise') {
        expect(it.confused, `${kind} ${skin}`).toBeUndefined();
        expect(it.scratch, `${kind} ${skin}`).toBeUndefined();
        if (story) expect(it.prompt).not.toContain(WHOLE_STORY);
        continue;
      }
      expect(it.prompt.startsWith(`${m.case.story.setting} ${WHOLE_STORY}`), it.prompt).toBe(true);
      wellFormed(it.confused!, `${kind} ${seed}`);
      expect(it.confused).toEqual([fitsQuestion(m.case.story.id), wholeStoryQuestion()]);
      // The fits question is about another story, so it never gives this item’s answer.
      const said = it.confused!.flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]).join(' ');
      for (const i of m.case.ideas) expect(said, `${kind} ${seed}`).not.toContain(i.text);
      // The clue board: every idea by every clue, marked from the model; its closing line speaks of clues, not signs.
      expect(it.scratchLabel).toBe('the clue board');
      const s = it.scratch as DrillStep;
      const clues = [...m.case.shown, ...(m.case.added ? [m.case.added] : [])];
      expect(s.rows.map((r) => r.id)).toEqual(m.case.ideas.map((i) => i.id));
      for (const r of s.rows) {
        expect(r.label).toContain(m.case.ideas.find((i) => i.id === r.id)!.text);
        expect(r.marks.map((mk) => mk.answer)).toEqual(clues.map((c) => (c.fits[r.id] ? 'fit' : 'miss')));
        r.marks.forEach((mk, k) => expect(mk.label.endsWith(clues[k].text)).toBe(true));
      }
      expect(s.words?.closing).toBe(FITS_CLOSING);
    }
  });

  it('the fits question uses a fit that does not explain, from another story; the whole-story question names the truck idea', () => {
    for (const s of STORIES) {
      const q = fitsQuestion(s.id);
      const [, ideaText, clueText] = /^Say “(.+)” is the whole story\. Could “(.+)” still be true\?$/.exec(q.q)!;
      const st = STORIES.find((x) => x.ideas.some((i) => i.text === ideaText))!;
      expect(st.id).not.toBe(s.id);
      const idea = st.ideas.find((i) => i.text === ideaText)!;
      const clue = st.clues.find((c) => c.text === `${clueText}.`)!;
      expect(clue.fits[idea.id]).toBe(true);
      expect(clue.explains ?? []).not.toContain(idea.id);
    }
    expect(fitsQuestion('mud').q).toBe('Say “Nobody watered it” is the whole story. Could “The plant sits in the sunny window” still be true?');
    const truck = WORKED.ideas.find((i) => i.id === 'truck')!;
    expect(wholeStoryQuestion().teach).toContain(truck.text);
    expect(truck.extras.length).toBeGreaterThan(sprinkler.extras.length);
  });

  it('a fit is never worded as a bare “fits it”: the idea explains it, or its whole story leaves the clue possible', () => {
    for (const kind of KINDS) for (const skin of ['everyday', 'fantasy'] as ExplainSkin[]) for (let seed = 1; seed <= 60; seed++) {
      const it = choose(made(kind, skin, seed));
      const text = [it.explain, ...teachStrings(it), ...Object.values(it.whyWrong ?? {})].join(' ');
      expect(text, `${kind} ${skin} ${seed}`).not.toMatch(/(^|\. )(The [a-z ]+ idea|Idea [XYZ]) fits it\./);
      // The old test (“would it make sense if the idea were true?”) reads fits as explains; the whole-story test replaces it.
      expect(text, `${kind} ${skin} ${seed}`).not.toMatch(/make sense if the idea/);
    }
    // The paint idea misses “Rex is soaking wet” because its whole story leaves Rex dry.
    const mud = STORIES.find((s) => s.id === 'mud')!;
    expect(mud.clues.find((c) => c.text === 'Rex is soaking wet.')!.why.paint).toBe('If the paint joke is the whole story, nothing made Rex wet.');
  });

  it('the board scenes say “Each idea is the whole story” in their captions', () => {
    for (const d of lesson.drill!.slice(1)) {
      const g = d.scene as Extract<Scene, { kind: 'grid' }>;
      expect(g.caption!.startsWith(WHOLE_STORY), d.id).toBe(true);
      if (d.caption) expect(d.caption.startsWith(WHOLE_STORY)).toBe(true);
    }
    expect((lesson.ideas[L2_CARDS.example].scene as Extract<Scene, { kind: 'grid' }>).caption!.startsWith(WHOLE_STORY)).toBe(true);
  });

  it('the new cards, board, mix-ups, questions and clue boards read at grade 7 or lower, with curly quotes only', () => {
    const text: string[] = [];
    for (const c of lesson.ideas) {
      text.push(...c.body);
      if (c.scene?.kind === 'contrast') text.push(...c.scene.pairs.flatMap((p) => [p.world, p.says, p.because, p.then ?? '']), c.scene.ask!.q, c.scene.ask!.a);
    }
    const boardText = (d: DrillStep) => [
      d.title,
      ...d.body,
      d.done,
      ...d.rows.flatMap((r) => [r.label, ...r.marks.flatMap((m) => [m.label, ...Object.values(m.why), m.compare?.says ?? '', m.compare?.world ?? ''])]),
      ...(d.misconceptions ?? []).map((m) => m.text),
      ...(d.confused ?? []).flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]),
      ...Object.values(d.words ?? {}),
    ];
    text.push(...boardText(lesson.drill![0]));
    for (const kind of ['best', 'test', 'new-clue'] as ExplainKind[]) for (let seed = 1; seed <= 20; seed++) {
      const it = choose(made(kind, 'everyday', seed));
      text.push(...boardText(it.scratch!), ...it.confused!.flatMap((q) => [q.q, q.teach, ...q.options.map((o) => o.label)]));
    }
    const all = text.filter(Boolean).join('\n');
    expect(fkGrade(all)).toBeLessThanOrEqual(READING.maxGrade);
    const long = longestSentence(all);
    expect(long.words, long.sentence).toBeLessThanOrEqual(READING.maxSentenceWords);
    expect(all).not.toMatch(/['"]/);
    expect(all).not.toMatch(/[=≠→&]/);
  });
});
