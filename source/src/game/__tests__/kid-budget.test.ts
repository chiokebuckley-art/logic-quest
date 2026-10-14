/**
 * The word budget (docs/KID-JOURNEY.md §2 and §5.1, with the final budgets of "Decisions after the core review"): for
 * every round of Grades 1 to 3 with a kid layer, every screen a kid sees is rendered on the server in kid mode under
 * its play header ("Round k of n", 4 words): every card, every board page, every quiz item of the planned pack for
 * each seed, and for each item its compact miss feedback, its "Show me" picture, its opened hint and its "Yes!" panel;
 * then the star screen and the "Not yet. Try again?" screen. Each screen must fit its band: Grade 1 at most 12 words
 * (8 of content), 2 sentences, 8 words a sentence; Grade 2 20 words, 2 sentences, 10 words; Grade 3 30 words, 3
 * sentences, 12 words. Buttons and the header count as words; a button counts as a sentence only when it ends like
 * one (a choice that is a sentence). The kid lines keep the content guide's rules, and a kid hint is at most 8 words.
 *
 * Rounds of Grades 1 to 3 that have no kid layer yet are listed as todo until their content lands (B2). Grades 4 to 8
 * are reported, never failed: wordiestScreens() lists the ten wordiest screens for the trims pass (B3); set
 * KID_BUDGET_REPORT=1 to print them, and KID_BUDGET_ROUNDS=1 to print each Grade 1 to 3 round's worst screen.
 */
import { describe, expect, it } from 'vitest';
import type { Item, LessonDef, TeachCase } from '../../engine/types';
import { createRng } from '../../engine/rng';
import { practiceFor } from '../../engine/drill';
import { fkGrade, longestSentence, words } from '../../engine/readability';
import { gradeById } from '../../content/grades';
import { YOUNG, kidModeFor, printWordiest, roundScreens, roundsIn, wordiestScreens, type Screen } from './budget-screens';

const SEEDS = Array.from({ length: 24 }, (_, k) => k + 1);

/**
 * Every kid string a round shows: its cards, boards (row and mark labels), star line, and the kid blocks of its quiz
 * items, the kid-only alternates included (their kid block, scene words and tile words).
 */
function kidStrings(lesson: LessonDef): string[] {
  const k = lesson.kid!;
  const items: Item[] = SEEDS.flatMap((seed) => practiceFor(lesson, createRng(seed)));
  const show = (c: TeachCase | undefined) => (c ? [c.label, ...(c.note ? [c.note] : [])] : []);
  const ofItem = (it: Item): string[] => {
    const kid = it.kid;
    if (!kid) return [];
    const scene = kid.scene && kid.scene.kind === 'pictos' ? kid.scene.rows.flat().flatMap((p) => (p.word ? [p.word] : [])) : [];
    const words = it.kind === 'choose' || it.kind === 'multi' ? it.choices.flatMap((c) => (c.word ? [c.word] : [])) : [];
    return [kid.prompt, kid.nope, ...(kid.yes ? [kid.yes] : []), ...(kid.hint ? [kid.hint] : []), ...show(kid.show), ...scene, ...words, ...(kid.alt ? ofItem(kid.alt) : [])];
  };
  return [
    ...k.cards.map((c) => c.line),
    ...(k.board ?? []).flatMap((b) => [b.line, ...(b.rows ?? []).flatMap((r) => [...(r.label ? [r.label] : []), ...(r.marks ?? []).flatMap((m) => (m.label ? [m.label] : []))])]),
    ...(k.star ? [k.star] : []),
    ...items.flatMap(ofItem),
  ];
}

/** The worst screen of a round: most words first, then most sentences, then the longest sentence. */
const worst = (screens: readonly Screen[]): Screen => [...screens].sort((a, b) => b.words - a.words || b.sentences - a.sentences || b.longest - a.longest)[0];

const young = roundsIn(YOUNG);
const withLayer = young.filter(([, lesson]) => !!lesson.kid);
const without = young.filter(([, lesson]) => !lesson.kid).map(([band, lesson]) => `${lesson.id} (${gradeById(band).label})`);

/**
 * Screens of a round whose kid layer is in that still run over because they draw classic text no kid field replaces
 * yet (an item's scene or its answers, a board's word options, a case board). They are excused here with the reason
 * and listed as a todo; every other screen of the round is checked. A round leaves this list when the rendering can
 * draw those screens in kid words.
 */
const WAITING: Record<string, { screens: (s: Screen) => boolean; why: string }> = {
};

describe('the word budget: every screen of a Grade 1 to 3 round with a kid layer', () => {
  it('has rounds to check (s1.l1 first)', () => {
    expect(withLayer.map(([, l]) => l.id)).toContain('s1.l1');
  });

  for (const [band, lesson, stop] of withLayer) {
    const budget = gradeById(band).budget;

    it(`${lesson.id} (${gradeById(band).label}): every screen fits ${budget.words} words, ${budget.sentences} sentences, ${budget.sentence} words a sentence`, () => {
      const screens = roundScreens(lesson, stop, kidModeFor(band), SEEDS);
      const of = (what: string) => screens.filter((s) => s.what.startsWith(what));
      expect(of('card').length).toBe(lesson.ideas.length);
      expect(of('board').length).toBeGreaterThanOrEqual((lesson.drill ?? []).length);
      // Every planned quiz item (distinct ones once) has its screen, its miss feedback, its Show me and its Yes! panel.
      const items = of('quiz item').length;
      expect(items).toBeGreaterThan(0);
      expect(of('miss feedback').length).toBe(items);
      expect(of('Show me').length).toBe(items);
      expect(of('right answer').length).toBe(items);
      expect(of('star screen').length).toBe(1);
      expect(of('not yet screen').length).toBe(1);
      // The header is on every screen.
      for (const s of screens) expect(s.text, s.what).toMatch(/^Round \d of \d\b/);
      const waiting = WAITING[lesson.id]?.screens ?? (() => false);
      const over = screens
        .filter((s) => !waiting(s))
        .filter((s) => s.words > budget.words || s.sentences > (budget.sentences ?? Infinity) || s.longest > budget.sentence)
        .map((s) => `${s.what}: ${s.words} words, ${s.sentences} sentences, longest ${s.longest}: ${s.text}`);
      if (process.env.KID_BUDGET_ROUNDS) {
        const w = worst(screens);
        const kinds = ['card', 'board', 'quiz item', 'miss feedback', 'Show me', 'hint', 'right answer', 'star screen', 'not yet screen'];
        const per = kinds.map((k) => {
          const mine = of(k);
          if (!mine.length) return `${k} none`;
          return `${k} ${Math.max(...mine.map((x) => x.words))}w/${Math.max(...mine.map((x) => x.sentences))}s/${Math.max(...mine.map((x) => x.longest))}l`;
        });
        console.info(`${lesson.id} (${band}): ${screens.length} screens; worst ${w.what}: ${w.words} words, ${w.sentences} sentences, longest ${w.longest}\n  max per kind: ${per.join('; ')}`);
      }
      expect(over).toEqual([]);
    });

    if (WAITING[lesson.id]) it.todo(`${lesson.id}: screens waiting on the kid rendering: ${WAITING[lesson.id].why}`);

    it(`${lesson.id}: one kid card per card and one kid board per board; every quiz item has its kid block`, () => {
      expect(lesson.kid!.cards.length).toBe(lesson.ideas.length);
      expect((lesson.kid!.board ?? []).length).toBe((lesson.drill ?? []).length);
      for (const seed of SEEDS) for (const it of practiceFor(lesson, createRng(seed))) expect(it.kid, it.id).toBeTruthy();
    });

    it(`${lesson.id}: a kid hint is one line of at most 8 words`, () => {
      for (const seed of SEEDS) {
        for (const it of practiceFor(lesson, createRng(seed))) {
          if (it.kid?.hint) expect(words(it.kid.hint).length, it.kid.hint).toBeLessThanOrEqual(8);
        }
      }
    });

    it(`${lesson.id}: kid lines keep ${budget.sentence} words a sentence, grade 7 reading, curly quotes, no symbols, “Not yet” never “Wrong”`, () => {
      const all = kidStrings(lesson);
      // Reading level over the round's kid text as one block (a two-word line has no meaningful grade of its own).
      expect(fkGrade(all.join(' '))).toBeLessThanOrEqual(7);
      for (const s of all) {
        expect(longestSentence(s).words, s).toBeLessThanOrEqual(budget.sentence);
        expect(s, s).not.toMatch(/['"]/);
        expect(s, s).not.toMatch(/[¬∧∨→↔✓✗<>=+*/\\#&%@|~^_]/);
        expect(s, s).not.toMatch(/\bwrong\b/i);
      }
    });
  }

  // Content for these rounds lands in B2; until then each one waits here as a todo, so the suite stays green.
  if (without.length) it.todo(`kid layer still to write (B2): ${without.join(', ')}`);
  else it('every round of Grades 1 to 3 has its kid layer', () => expect(without).toEqual([]));
});

describe('the trims report: Grades 4 to 8 (reported, never failed)', () => {
  it('wordiestScreens() lists the ten wordiest screens of Grades 4 to 8, wordiest first', () => {
    const rows = wordiestScreens(10);
    expect(rows).toHaveLength(10);
    for (let k = 1; k < rows.length; k++) expect(rows[k - 1].words).toBeGreaterThanOrEqual(rows[k].words);
    expect(rows.every((r) => ['g4', 'g5', 'g6', 'g7', 'g8'].includes(r.band))).toBe(true);
    if (process.env.KID_BUDGET_REPORT) printWordiest(rows);
  });
});
