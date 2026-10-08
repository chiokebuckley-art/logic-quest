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
import { createRng, type Rng } from './rng';
import type { DrillMark, DrillRow, DrillStep, Item, LessonDef, LessonPass, Misconception, StopDef } from './types';

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
  /** The row of the first wrong mark, or else of the first empty one (a case board shows that case). */
  row?: string;
  /**
   * The pattern of wrong marks matched one of the board's misconceptions (DrillStep.misconceptions): its id. Then
   * `message` is that misconception's words, which teach the distinction, instead of the first wrong mark's.
   */
  diagnosis?: string;
}

const optionLabel = (m: DrillMark, id: string) => m.options.find((o) => o.id === id)?.label ?? id;

/**
 * Check the learner's marks. The first wrong mark, in reading order, is the one named, unless the pattern of wrong
 * marks matches one of the board's misconceptions: then its words come first, because they name the belief behind
 * the marks, not only the mark.
 */
export function checkDrill(step: DrillStep, picks: DrillPicks): DrillCheck {
  const marks = marksToTap(step);
  const missing = marks.filter((m) => !picks[m.id]).map((m) => m.id);
  const wrong = marks.filter((m) => picks[m.id] && picks[m.id] !== m.answer).map((m) => m.id);
  const rowOf = (markId: string) => step.rows.find((r) => r.marks.some((m) => m.id === markId));
  if (wrong.length) {
    const m = marks.find((x) => x.id === wrong[0])!;
    const pick = picks[m.id];
    const row = rowOf(m.id);
    const message = m.why[pick] ?? `${m.label}: not “${optionLabel(m, pick)}.” Look at the board again.`;
    const found = row ? diagnose(step, row, picks) : undefined;
    // A matched misconception names the belief first; the mark's own words follow as the concrete case.
    if (found) return { done: false, missing, wrong, message: `${found.text} ${message}`, row: row?.id, diagnosis: found.id };
    return { done: false, missing, wrong, message, row: row?.id };
  }
  if (missing.length) {
    const row = rowOf(missing[0]);
    if (step.layout === 'cases' && row?.case) return { done: false, missing, wrong, message: caseMissing(row, picks), row: row.id };
    const n = missing.length;
    return { done: false, missing, wrong, message: `Not yet: ${n === 1 ? 'one mark is' : `${n} marks are`} still empty. Mark ${n === 1 ? 'it' : 'each one'}, then check.`, row: row?.id };
  }
  return { done: true, missing, wrong, message: '' };
}

// ---------- misconceptions: a pattern of wrong marks that points to a belief ----------

/**
 * Which of the board's misconceptions the marks in one case show, if any (see Misconception.when). Only a case board
 * has these patterns today. The first match in the board's own order wins, so a board lists the belief it most wants
 * to catch first.
 */
export function diagnose(step: DrillStep, row: DrillRow, picks: DrillPicks): Misconception | undefined {
  if (!step.misconceptions?.length) return undefined;
  const cases = step.layout === 'cases' && !!row.case;
  // The row's statements and its verdict: the stamps and Keep/Reject on a case board; otherwise every mark but the
  // last, and the last (a row with one mark has no verdict).
  const { stamps, verdict } = cases
    ? caseMarks(row)
    : { stamps: row.marks.length > 1 ? row.marks.slice(0, -1) : row.marks, verdict: row.marks.length > 1 ? row.marks[row.marks.length - 1] : undefined };
  const value = (m: DrillMark) => valueOf(m, picks);
  const set = stamps.filter((m) => value(m) !== undefined);
  const wrongStamps = stamps.filter((m) => value(m) !== undefined && value(m) !== m.answer);
  const verdictWrong = !!verdict && value(verdict) !== undefined && value(verdict) !== verdict.answer;
  const own = cases ? stamps.find((m) => m.on === row.case!.box) : undefined;
  const allSet = set.length === stamps.length;
  const rowValues = (r: DrillRow) => (cases ? caseMarks(r).stamps : r.marks.length > 1 ? r.marks.slice(0, -1) : r.marks).map((m) => m.answer);
  const matches = (mc: Misconception): boolean => {
    if (mc.row !== undefined && mc.row !== row.id) return false;
    switch (mc.when) {
      case 'fit-rule':
        // The stamps were bent to fit the rule: wrong stamps, a True count that is just what the rule needs, and Keep.
        return (
          cases && allSet && wrongStamps.length > 0 && row.needTrue !== undefined && set.filter((m) => value(m) === 'true').length === row.needTrue && !!verdict && value(verdict) === 'keep' &&
          // The owner's rule: the one True stamp has to be the picked box's own sign, or the stamps were not bent to the rule.
          (row.needOn === undefined || stamps.some((m) => m.on === row.needOn && value(m) === 'true'))
        );
      case 'verdict-only':
        return wrongStamps.length === 0 && allSet && verdictWrong;
      case 'all-one':
        // Every statement mark the same, where the answers differ. One slip that happens to level three stamps is not
        // this pattern: on a row of three or more, at least two marks are wrong.
        return allSet && stamps.length > 1 && wrongStamps.length >= Math.min(2, stamps.length - 1) && new Set(set.map(value)).size === 1 && new Set(stamps.map((m) => m.answer)).size > 1;
      case 'own-true':
        return !!own && value(own) === 'true' && own.answer === 'false';
      case 'own-false':
        return !!own && value(own) === 'false' && own.answer === 'true';
      case 'copied':
        return allSet && wrongStamps.length > 0 && step.rows.some((o) => o !== row && JSON.stringify(rowValues(o)) === JSON.stringify(stamps.map(value)));
      case 'picks': {
        const want = Object.entries(mc.picks ?? {});
        if (!want.length) return false;
        const all = step.rows.flatMap((r) => r.marks);
        return want.every(([id, opt]) => picks[id] === opt) && want.some(([id, opt]) => all.find((m) => m.id === id)?.answer !== opt);
      }
    }
  };
  return step.misconceptions.find(matches);
}

// ---------- case boards (DrillStep.layout 'cases') ----------

/** A mark's value on the board: shown, or what the learner picked. */
const valueOf = (m: DrillMark, picks: DrillPicks): string | undefined => (m.given ? m.answer : picks[m.id]);

/** The stamps of a case (one per sign, in box order) and its verdict mark. */
export function caseMarks(row: DrillRow): { stamps: DrillMark[]; verdict: DrillMark | undefined } {
  return { stamps: row.marks.filter((m) => m.on !== undefined), verdict: row.marks.find((m) => m.on === undefined) };
}

/** How many signs are stamped True in a case, counted from the stamps; null until every sign is stamped. */
export function caseCount(row: DrillRow, picks: DrillPicks): number | null {
  const values = caseMarks(row).stamps.map((m) => valueOf(m, picks));
  return values.some((v) => v === undefined) ? null : values.filter((v) => v === 'true').length;
}

/** A case's verdict as marked: 'keep', 'reject', or undefined. */
export function caseVerdict(row: DrillRow, picks: DrillPicks): string | undefined {
  const v = caseMarks(row).verdict;
  return v ? valueOf(v, picks) : undefined;
}

/** The next stamp after a tap: an empty sign becomes True, then each tap flips True and False. */
export const nextStamp = (v: string | undefined): string => (v === 'true' ? 'false' : 'true');

/** What a case still needs, in a gentle sentence: its stamps, or its verdict. */
function caseMissing(row: DrillRow, picks: DrillPicks): string {
  const name = row.case!.name;
  const left = caseMarks(row).stamps.filter((m) => !m.given && !picks[m.id]).length;
  if (left) return `Not yet: ${name} still needs ${left === 1 ? 'a stamp' : `${left} stamps`}. Tap ${name}, then tap each sign.`;
  return `Almost: now tap Keep or Reject for ${name}.`;
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
    for (const m of r.marks) lines.push(m.given ? `${bare(m.label)}: ${bare(optionLabel(m, m.answer))}.` : `${bare(m.label)}: ${orList(m.options.map((o) => bare(o.label)))}?`);
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

type Level4 = 1 | 2 | 3 | 4;

/**
 * The lesson's planned quiz: a lesson that grades its items (an Observatory place, `practiceAt`) picks them by the
 * learner's level on its track when one is known; every other lesson has one pack.
 */
export function practiceFor(lesson: LessonDef, rng: Rng, level?: Level4): Item[] {
  return lesson.practiceAt && level ? lesson.practiceAt(rng, level) : lesson.practice(rng);
}

/**
 * One more quiz item when the pass rule is not met yet: from the lesson's own practice (so the same rule family),
 * never one already shown, preferring an item that carries a tag the rule still needs. Never a scaffolded or fixed
 * item (workFirst, fixed): those are for the planned quiz only. Each draw starts at a different place in the pack,
 * so extra items vary.
 */
export function extraQuizItem(lesson: LessonDef, seed: number, shown: readonly Item[], want: readonly string[], k: number, level?: Level4): Item | null {
  const seen = new Set(shown.map(looks));
  let fallback: Item | null = null;
  for (let i = 0; i < 60; i++) {
    const pack = practiceFor(lesson, createRng(seed + 9973 * (k + 1) + i * 104729), level);
    const turn = (k + i) % Math.max(1, pack.length);
    for (const x of [...pack.slice(turn), ...pack.slice(0, turn)]) {
      if (x.workFirst || x.fixed || seen.has(looks(x))) continue;
      if (!want.length || x.tags?.some((t) => want.includes(t))) return { ...x, id: `${lesson.id}-x${k}` };
      fallback ??= x;
    }
  }
  return fallback ? { ...fallback, id: `${lesson.id}-x${k}` } : null;
}

/**
 * A short fingerprint of a lesson's planned quiz for a seed. A saved run keeps it, so a run saved before the lesson
 * changed (a new first quiz, new items) starts the lesson again instead of picking up at a try that now holds a
 * different question.
 */
export function planKey(lesson: LessonDef, seed: number, level?: Level4): string {
  const text = practiceFor(lesson, createRng(seed), level).map((it) => JSON.stringify([it.id, it.prompt, it.scene ?? null, it.workFirst?.id ?? null])).join('|');
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ---------- lesson order ----------

/**
 * Lessons open in teaching order: a lesson opens once the lesson before it is done or its guided boards are marked.
 * So a later lesson's quiz (a converse trap, a mixed line-up, a words-only rule) never comes before the boards that
 * teach what it needs. Returns the lesson to do first, or null when this one is open.
 */
export function lessonWaitsFor(stop: StopDef, lessonId: string, lessonsDone: readonly string[], drilled: readonly string[]): LessonDef | null {
  // A free-order stop (the Pattern Observatory) opens its places on skills, not on the lesson before: see placeWaitsFor.
  if (stop.lessonOrder === 'free') return null;
  const k = stop.lessons.findIndex((l) => l.id === lessonId);
  if (k <= 0) return null;
  const prev = stop.lessons[k - 1];
  if (lessonsDone.includes(lessonId) || lessonsDone.includes(prev.id) || drilled.includes(prev.id)) return null;
  return prev;
}

/** What a free-order place needs before it opens: lessons done anywhere, the diagnostic's credit, or a passed primer. */
export interface PlaceCredit {
  /** Lesson ids done, in any stop. */
  done: readonly string[];
  /** Lesson ids whose skill the diagnostic showed. */
  shown: readonly string[];
  /** Lesson ids whose primer was passed. */
  primers: readonly string[];
}

/**
 * The required lessons a place still waits for (LessonDef.requires), or [] when it is open. A place opens when every
 * required lesson is done, or the diagnostic showed its skill, or the learner passed the place's primer.
 */
export function placeWaitsFor(lesson: LessonDef, credit: PlaceCredit): string[] {
  const need = lesson.requires ?? [];
  if (!need.length || credit.primers.includes(lesson.id) || credit.shown.includes(lesson.id)) return [];
  return need.filter((id) => !credit.done.includes(id) && !credit.shown.includes(id));
}
