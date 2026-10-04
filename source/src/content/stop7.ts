/**
 * Stop 7 · Ways to Think.
 * Some ways of thinking give a good guess, not a proof. Each lesson names one, shows where it helps, and shows how it
 * can fail, so the learner checks before they are sure.
 *
 *  l1 Pattern guesses           several same examples suggest a pattern; a new case can still break it (induction)
 *  l2 The best explanation      pick the simplest story that fits every clue, then test it (abduction)
 *  l3 Cause or just together?   a cause makes something happen; happening together is not enough (causes)
 *  l4 Fair choices              the fair choice keeps a promise or helps without hurting, for a reason from the story
 *  l5 Gut feelings              a gut feeling is a fast guess to check, not a proof (intuition)
 *
 * Each lesson is its own module in ./stop7/ (see LessonModule in ./stop7/common.ts), with its puzzles in
 * ../engine/puzzles/. Every lesson is See -> Do -> Quiz, and every quiz pack has one question on when its way of
 * thinking fails (tag `can-fail`, which the pass rule asks for).
 */
import type { Item, Rng, StopDef } from '../engine/types';
import * as causes from './stop7/causes';
import { distinctItems, finish, STOP, type LessonModule } from './stop7/common';
import * as explanations from './stop7/explanations';
import * as fairness from './stop7/fairness';
import * as gutfeel from './stop7/gutfeel';
import * as patterns from './stop7/patterns';

const MODULES: readonly LessonModule[] = [patterns, explanations, causes, fairness, gutfeel];
const lessons = MODULES.map((m) => m.lesson);

/** 10 items: two from each lesson, in lesson order. Each lesson's pair holds at least one conflict item. */
function check(rng: Rng): Item[] {
  const one = distinctItems();
  const plan = MODULES.flatMap((m) => m.checkItems(rng).map((made) => [m.lesson.id, made] as const));
  return plan.map(([lesson, made], i) => finish(one(() => made), `s${STOP}-c${i + 1}`, lesson));
}

/** One Arcade item from any lesson. */
function arcade(rng: Rng): Item {
  const m = rng.pick(MODULES);
  return finish(m.arcadeItem(rng), `s${STOP}-arcade`, m.lesson.id);
}

/** New examples after a miss: the lesson's own set, or [] for the default (one item with the same skill). */
function fresh(missed: Item, rng: Rng): Item[] {
  const m = MODULES.find((x) => x.lesson.id === missed.lesson);
  return m ? m.freshItems(missed, rng).map((made) => finish(made, 'new', missed.lesson)) : [];
}

export const stop7: StopDef = {
  n: STOP,
  id: 's7',
  title: 'Ways to Think',
  idea: 'A good guess is not a proof. Check it before you are sure.',
  ready: true,
  lessons,
  check,
  practice: arcade,
  fresh,
};
