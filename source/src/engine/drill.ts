/**
 * The Do beat (guided boards) and the lesson pass rule. Pure and DOM-free.
 *
 * A guided board shows one case already marked (the worked example) and asks the learner to mark a new case on
 * the same board by taps. checkDrill() says whether every mark is right and, if not, names the first mismatch in
 * plain words. A wrong mark stays as the learner set it: nothing is filled in for them.
 *
 * A lesson is passed only when its boards are marked right and then enough quiz answers are right on the first
 * try with no hint (passState). Reading the key-idea cards never passes a lesson.
 */
import { looks } from './fresh';
import { createRng } from './rng';
import type { DrillMark, DrillStep, Item, LessonDef, LessonPass, StopDef } from './types';

/** The options of a grid box (DrillStep.columns): drawn as ✓ and ✗, read aloud as yes and no. */
export const YES_NO = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] as const;

/** Mark id -> the option id the learner picked. */
export type DrillPicks = Readonly<Record<string, string>>;

/** The marks the learner sets (every mark that is not given), in reading order. */
export function marksToTap(step: DrillStep): DrillMark[] {
  return step.rows.flatMap((r) => r.marks.filter((m) => !m.given));
}

export interface DrillCheck {
  /** Every mark to tap is set, and right. */
  done: boolean;
  /** Mark ids not set yet. */
  missing: string[];
  /** Mark ids set to a wrong option, in reading order. A wrong mark stays until the learner changes it. */
  wrong: string[];
  /** '' when done. Otherwise the first mismatch in plain words, or how many marks are still empty. */
  message: string;
}

const optionLabel = (m: DrillMark, id: string) => m.options.find((o) => o.id === id)?.label ?? id;

/** Check the learner's marks. The first wrong mark, in reading order, is the one named. */
export function checkDrill(step: DrillStep, picks: DrillPicks): DrillCheck {
  const marks = marksToTap(step);
  const missing = marks.filter((m) => !picks[m.id]).map((m) => m.id);
  const wrong = marks.filter((m) => picks[m.id] && picks[m.id] !== m.answer).map((m) => m.id);
  if (wrong.length) {
    const m = marks.find((x) => x.id === wrong[0])!;
    const pick = picks[m.id];
    const message = m.why[pick] ?? `${m.label}: not “${optionLabel(m, pick)}.” Look at the board again.`;
    return { done: false, missing, wrong, message };
  }
  if (missing.length) {
    const n = missing.length;
    return { done: false, missing, wrong, message: `Not yet: ${n === 1 ? 'one mark is' : `${n} marks are`} still empty. Mark ${n === 1 ? 'it' : 'each one'}, then check.` };
  }
  return { done: true, missing, wrong, message: '' };
}

/** A row is finished when it is given or every mark the learner sets in it is right. */
export function rowDone(step: DrillStep, rowId: string, picks: DrillPicks): boolean {
  const row = step.rows.find((r) => r.id === rowId);
  return !!row && row.marks.every((m) => m.given || picks[m.id] === m.answer);
}

/** "True or False", "0, 1, 2 or 3". */
const orList = (xs: readonly string[]) => (xs.length <= 2 ? xs.join(' or ') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/** The board as lines to read aloud. Given marks are read with their value; marks to tap are named. */
export function drillSpeech(step: DrillStep): string[] {
  const bare = (s: string) => s.trim().replace(/[.!?]+$/, '');
  const lines = [step.title, ...(step.twin ? [step.twin] : []), ...step.body];
  for (const r of step.rows) {
    lines.push(r.label);
    for (const m of r.marks) lines.push(m.given ? `${m.label}: ${bare(optionLabel(m, m.answer))}.` : `${m.label}: ${orList(m.options.map((o) => bare(o.label)))}?`);
    if (r.marks.every((m) => m.given) && r.note) lines.push(r.note);
  }
  return lines;
}

// ---------- the pass rule ----------

export const DEFAULT_PASS: LessonPass = { firstTry: 3 };

/** One answered quiz item, as the pass rule sees it. */
export interface QuizResult {
  /** Right on the first try, with no hint. */
  clean: boolean;
  tags: string[];
}

export interface PassState {
  met: boolean;
  /** First-try answers so far (in a row, when the rule asks for that). */
  have: number;
  need: number;
  /** Include groups still missing a first-try answer. */
  missing: { tag: string; label: string }[];
}

/**
 * Where the pass rule stands. In a row: some run of first-try answers (anywhere in the lesson) is long enough and
 * holds every include group itself; until one does, the progress shown is the run at the end (a miss starts it, and
 * its groups, again). Otherwise any first-try answers count.
 */
export function passState(pass: LessonPass | undefined, results: readonly QuizResult[]): PassState {
  const rule = pass ?? DEFAULT_PASS;
  const groups = rule.include ?? [];
  const judge = (counted: readonly QuizResult[]) => {
    const tags = new Set(counted.flatMap((r) => r.tags));
    const missing = groups.filter((g) => !tags.has(g.tag));
    return { met: counted.length >= rule.firstTry && missing.length === 0, have: Math.min(counted.length, rule.firstTry), need: rule.firstTry, missing };
  };
  if (!rule.inARow) return judge(results.filter((r) => r.clean));
  // Every run of first-try answers; the last one is the run being built now.
  const runs: QuizResult[][] = [[]];
  for (const r of results) {
    if (r.clean) runs[runs.length - 1].push(r);
    else if (runs[runs.length - 1].length) runs.push([]);
  }
  // After a miss the last run is empty: the count starts again.
  return runs.map(judge).find((s) => s.met) ?? judge(runs[runs.length - 1]);
}

/** "3 right on the first try" / "3 right on the first try in a row", plus any groups still needed. */
export function passGoal(pass: LessonPass | undefined): string {
  const rule = pass ?? DEFAULT_PASS;
  return `${rule.firstTry} right on the first try${rule.inARow ? ' in a row' : ''}`;
}

/**
 * One more quiz item when the pass rule is not met yet: from the lesson's own practice (so the same rule family),
 * never one already shown, preferring an item that carries a tag the rule still needs. Never a scaffolded or fixed
 * item (workFirst, fixed): those are for the planned quiz only. Each draw starts at a different place in the pack,
 * so extra items vary.
 */
export function extraQuizItem(lesson: LessonDef, seed: number, shown: readonly Item[], want: readonly string[], k: number): Item | null {
  const seen = new Set(shown.map(looks));
  let fallback: Item | null = null;
  for (let i = 0; i < 60; i++) {
    const pack = lesson.practice(createRng(seed + 9973 * (k + 1) + i * 104729));
    const turn = (k + i) % Math.max(1, pack.length);
    for (const x of [...pack.slice(turn), ...pack.slice(0, turn)]) {
      if (x.workFirst || x.fixed || seen.has(looks(x))) continue;
      if (!want.length || x.tags?.some((t) => want.includes(t))) return { ...x, id: `${lesson.id}-x${k}` };
      fallback ??= x;
    }
  }
  return fallback ? { ...fallback, id: `${lesson.id}-x${k}` } : null;
}

// ---------- lesson order ----------

/**
 * Lessons open in teaching order: a lesson opens once the lesson before it is done or its guided boards are marked.
 * So a later lesson's quiz (a converse trap, a mixed line-up, a words-only rule) never comes before the boards that
 * teach what it needs. Returns the lesson to do first, or null when this one is open.
 */
export function lessonWaitsFor(stop: StopDef, lessonId: string, lessonsDone: readonly string[], drilled: readonly string[]): LessonDef | null {
  const k = stop.lessons.findIndex((l) => l.id === lessonId);
  if (k <= 0) return null;
  const prev = stop.lessons[k - 1];
  if (lessonsDone.includes(lessonId) || lessonsDone.includes(prev.id) || drilled.includes(prev.id)) return null;
  return prev;
}
