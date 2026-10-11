/**
 * Journey mastery rules (the WORDRAIDERS model):
 *  - key ideas and lessons first; the stop check opens only when every lesson is done;
 *  - a check passes only with every answer right; a miss is "not yet": the missed lessons must be
 *    redone before a retry, and the retry draws new questions (the seed includes the attempt);
 *  - two not-yets in one Journey day rest the stop until tomorrow;
 *  - a pass is locked in by a second check on a later day, then a week-later check makes it mastered;
 *  - the next stop opens as soon as this one is passed.
 * Journey days roll over at 3 am local time.
 */
import type { StopDef } from '../types';

export type CheckKind = 'pass' | 'lockin' | 'week';

export interface NotYet {
  kind: CheckKind;
  day: string;
  /** Lesson ids with at least one missed item, in lesson order. */
  missed: string[];
  /** Missed lessons redone since this not-yet. The retry opens when this covers `missed`. */
  redone: string[];
}

export interface StopProgress {
  lessonsDone: string[];
  /** Check attempts so far (all kinds). Part of the check seed, so every retry is new. */
  attempts: number;
  passDay?: string;
  lockDay?: string;
  weekDay?: string;
  notYet?: NotYet;
  /** Not-yets per Journey day. */
  notYetsByDay?: Record<string, number>;
  /**
   * A check in progress, saved after every answer. If the app is reloaded or closed before the check ends,
   * the next load settles it like pressing Leave (see settleOpenCheck), so a reload cannot redraw questions.
   */
  openCheck?: { kind: CheckKind; day: string; answered: { lesson: string; correct: boolean }[] };
  /** The stop page's warm-up item (StopDef.bridge) was answered right, so the page shows it as one line. */
  warm?: true;
}

export type StopStatus =
  | 'soon' // not built yet
  | 'locked' // previous stop not passed
  | 'learning' // lessons to do
  | 'ready' // all lessons done, check open
  | 'notYet' // missed a check; redo lessons, then retry
  | 'resting' // two not-yets today
  | 'passed' // waiting for the lock-in check
  | 'lockedIn' // waiting for the week-later check
  | 'mastered';

export interface StopView {
  status: StopStatus;
  /** A check that can be taken right now, if any. */
  due: CheckKind | null;
  /** The lesson to open next (first undone, or first missed lesson not yet redone). */
  nextLesson: string | null;
  /** Short tag for the Journey list. */
  label: string;
}

export const ROLLOVER_HOURS = 3;
export const WEEK_DAYS = 7;
export const MAX_NOT_YETS_PER_DAY = 2;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Local Journey day for a timestamp, as YYYY-MM-DD. Before 3 am local time it is still the previous day.
 * Uses local clock fields (not "subtract 3 hours") so the rollover stays at 3 am on daylight-saving days.
 */
export function journeyDay(t: number): string {
  const d = new Date(t);
  if (d.getHours() < ROLLOVER_HOURS) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Shift a YYYY-MM-DD day by n calendar days. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const t = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400_000);
}

export function emptyProgress(): StopProgress {
  return { lessonsDone: [], attempts: 0 };
}

/** When the week-later check opens. */
export function weekDue(p: StopProgress): string | null {
  if (!p.passDay || !p.lockDay) return null;
  const a = addDays(p.passDay, WEEK_DAYS), b = addDays(p.lockDay, 1);
  return a > b ? a : b;
}

export function viewStop(stop: StopDef, prog: StopProgress | undefined, prevPassed: boolean, today: string, opensAfter?: string): StopView {
  if (!stop.ready) return { status: 'soon', due: null, nextLesson: null, label: 'Coming soon' };
  if (!prevPassed) return { status: 'locked', due: null, nextLesson: null, label: `Opens after ${opensAfter ?? 'the stop before it'}` };
  const p = prog ?? emptyProgress();
  const lessonIds = stop.lessons.map((l) => l.id);
  const firstUndone = lessonIds.find((id) => !p.lessonsDone.includes(id)) ?? null;

  if (p.weekDay) return { status: 'mastered', due: null, nextLesson: null, label: 'Mastered' };

  if (p.notYet) {
    // Lesson ids that no longer exist (renamed in an update, or an edited import) never block the retry.
    const toRedo = p.notYet.missed.find((id) => lessonIds.includes(id) && !p.notYet!.redone.includes(id)) ?? null;
    if ((p.notYetsByDay?.[today] ?? 0) >= MAX_NOT_YETS_PER_DAY) {
      return { status: 'resting', due: null, nextLesson: toRedo, label: 'Rest today, try again tomorrow' };
    }
    if (toRedo) return { status: 'notYet', due: null, nextLesson: toRedo, label: 'Not yet: learn it again' };
    return { status: 'notYet', due: p.notYet.kind, nextLesson: null, label: 'Ready to try again' };
  }

  if (p.lockDay) {
    const due = weekDue(p)!;
    if (today >= due) return { status: 'lockedIn', due: 'week', nextLesson: null, label: 'Week check today' };
    const n = daysBetween(today, due);
    return { status: 'lockedIn', due: null, nextLesson: null, label: `Locked in · week check in ${n} day${n === 1 ? '' : 's'}` };
  }

  if (p.passDay) {
    if (today > p.passDay) return { status: 'passed', due: 'lockin', nextLesson: null, label: 'Lock-in check today' };
    return { status: 'passed', due: null, nextLesson: null, label: 'Passed · lock-in check tomorrow' };
  }

  if (firstUndone) {
    const k = lessonIds.indexOf(firstUndone) + 1;
    return { status: 'learning', due: null, nextLesson: firstUndone, label: `Lesson ${k} of ${lessonIds.length}` };
  }
  return { status: 'ready', due: 'pass', nextLesson: null, label: 'Ready for the stop check' };
}

/** Mark a lesson done. During a not-yet it also counts as a redo of that lesson. */
export function completeLesson(prog: StopProgress | undefined, lessonId: string): StopProgress {
  const p = { ...(prog ?? emptyProgress()) };
  if (!p.lessonsDone.includes(lessonId)) p.lessonsDone = [...p.lessonsDone, lessonId];
  if (p.notYet && p.notYet.missed.includes(lessonId) && !p.notYet.redone.includes(lessonId)) {
    p.notYet = { ...p.notYet, redone: [...p.notYet.redone, lessonId] };
  }
  return p;
}

export interface CheckOutcome {
  progress: StopProgress;
  passed: boolean;
  /** Missed lesson ids, in the stop's lesson order. */
  missed: string[];
}

/** Record a finished check. `results` holds one entry per item (a timed-out item counts as wrong). */
export function recordCheck(
  stop: StopDef,
  prog: StopProgress | undefined,
  kind: CheckKind,
  results: readonly { lesson: string; correct: boolean }[],
  today: string,
): CheckOutcome {
  const p: StopProgress = { ...(prog ?? emptyProgress()) };
  p.attempts += 1;
  const passed = results.length > 0 && results.every((r) => r.correct);
  if (passed) {
    if (kind === 'pass') p.passDay = today;
    if (kind === 'lockin') p.lockDay = today;
    if (kind === 'week') p.weekDay = today;
    delete p.notYet;
    return { progress: p, passed, missed: [] };
  }
  const wrong = new Set(results.filter((r) => !r.correct).map((r) => r.lesson));
  const missed = stop.lessons.map((l) => l.id).filter((id) => wrong.has(id));
  p.notYet = { kind, day: today, missed, redone: [] };
  p.notYetsByDay = { ...(p.notYetsByDay ?? {}), [today]: (p.notYetsByDay?.[today] ?? 0) + 1 };
  return { progress: p, passed, missed };
}

/**
 * The player left a check after answering at least one question. It counts as a try and a not-yet, so leaving
 * cannot be used to preview questions and draw new ones without limit: lessons with a wrong answer must be redone,
 * and it counts toward the two-not-yets rest. With no wrong answers yet, the retry is open straight away.
 */
export function recordLeft(
  stop: StopDef,
  prog: StopProgress | undefined,
  kind: CheckKind,
  answered: readonly { lesson: string; correct: boolean }[],
  today: string,
): StopProgress {
  const p: StopProgress = { ...(prog ?? emptyProgress()) };
  if (!answered.length) return p;
  p.attempts += 1;
  const wrong = new Set(answered.filter((r) => !r.correct).map((r) => r.lesson));
  p.notYet = { kind, day: today, missed: stop.lessons.map((l) => l.id).filter((id) => wrong.has(id)), redone: [] };
  p.notYetsByDay = { ...(p.notYetsByDay ?? {}), [today]: (p.notYetsByDay?.[today] ?? 0) + 1 };
  return p;
}

/** Turn a check left open by a reload or a closed app into a finished leave. Other progress is untouched. */
export function settleOpenCheck(stop: StopDef, prog: StopProgress, today: string): StopProgress {
  if (!prog.openCheck) return prog;
  const { kind, answered } = prog.openCheck;
  const rest = { ...prog };
  delete rest.openCheck;
  return recordLeft(stop, rest, kind, answered, today);
}

/** A number seed from any parts (FNV-1a). The same parts always give the same seed. */
export function seedFor(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join('␟')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface NextStep {
  stopId: string;
  action: 'lesson' | 'check' | 'rest' | 'done';
  lessonId?: string;
  kind?: CheckKind;
  label: string;
}

/**
 * What the Journey's "Next up" card offers: a due lock-in or week check on an earlier stop first,
 * then the frontier stop (its next lesson, redo, or check), else rest or done.
 */
export function nextStep(stops: readonly StopDef[], progress: Readonly<Record<string, StopProgress>>, today: string): NextStep {
  const views = viewAll(stops, progress, today);
  const name = (stop: StopDef) => shownLabel(stops, stop);
  for (const { stop, view } of views) {
    if (view.due === 'lockin' || view.due === 'week') {
      if (view.status === 'passed' || view.status === 'lockedIn') {
        return { stopId: stop.id, action: 'check', kind: view.due, label: `${name(stop)} · ${view.due === 'lockin' ? 'lock-in check' : 'week check'}` };
      }
    }
  }
  let rest: NextStep | null = null;
  for (const { stop, view } of views) {
    if (view.status === 'learning' || view.status === 'notYet' || view.status === 'ready') {
      if (view.nextLesson) {
        const idx = stop.lessons.findIndex((l) => l.id === view.nextLesson);
        return { stopId: stop.id, action: 'lesson', lessonId: view.nextLesson, label: `${name(stop)} · ${stop.lessons[idx]?.title ?? 'lesson'}` };
      }
      if (view.due) return { stopId: stop.id, action: 'check', kind: view.due, label: `${name(stop)} · ${view.due === 'pass' ? 'stop check' : 'try again'}` };
    }
    // A resting stop only wins when nothing else is open (a later stop may still have lessons to do).
    if (view.status === 'resting') rest ??= { stopId: stop.id, action: 'rest', label: `${name(stop)} · rest today` };
  }
  if (rest) return rest;
  const last = views[views.length - 1];
  return { stopId: last?.stop.id ?? '', action: 'done', label: 'Every open stop is done for today' };
}

/**
 * The stops that must be passed before `stop` opens: its `requires` list, or the stop before it in the list (the
 * main path's rule). An empty list means it is open from the start (the Pattern Observatory).
 */
export function requiredStops(stops: readonly StopDef[], stop: StopDef): StopDef[] {
  if (stop.requires) return stop.requires.map((id) => stops.find((s) => s.id === id)).filter((s): s is StopDef => !!s);
  const i = stops.indexOf(stop);
  return i > 0 ? [stops[i - 1]] : [];
}

/**
 * How the learner sees a stop's place in this list: "Stop N", where N is its position among the stops that are not
 * Observatory rings (the same rule as stopNumber in content/stops.ts), or "Ring k" for a ring. Worked out from the
 * list passed in, so a test can use its own list.
 */
export function shownLabel(stops: readonly StopDef[], stop: StopDef): string {
  if (stop.observatory) return `Ring ${stop.observatory.ring}`;
  const i = stops.filter((s) => !s.observatory).indexOf(stop);
  return `Stop ${i >= 0 ? i + 1 : stop.n}`;
}

/**
 * Whether the stop is open (every stop it needs is passed, or the learner already started it), and the words for the
 * lock label. One required stop that sits right before this one in the list reads "Stop 3" (or "Ring 1"); so does
 * the one stop a ring needs. Anything else names each stop with its title: "Stop 11 (Circuit Lab) and Ring 4
 * (Proof Lantern)", or for three, "Stop 6 (Knights & Knaves), Stop 8 (Ways to Think) and Ring 2 (Rule Rise)".
 */
export function stopOpening(stops: readonly StopDef[], progress: Readonly<Record<string, StopProgress>>, stop: StopDef): { open: boolean; after: string } {
  const need = requiredStops(stops, stop);
  // A stop the learner already worked on stays open, so a save from before a stop was put ahead of it (Arguments
  // before NOT, AND, OR) keeps every stop it had open.
  const mine = progress[stop.id];
  const started = !!mine && (!!mine.passDay || mine.lessonsDone.length > 0 || mine.attempts > 0);
  const open = started || need.every((s) => !!progress[s.id]?.passDay);
  const short = need.length === 1 && (stops[stops.indexOf(stop) - 1] === need[0] || !!stop.observatory);
  const named = need.map((s) => `${shownLabel(stops, s)} (${s.title})`);
  const after = short ? shownLabel(stops, need[0]) : named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}` : named.join('');
  return { open, after };
}

/** Every stop with its view, in order. A stop opens once every stop it requires has a passDay (see stopOpening). */
export function viewAll(stops: readonly StopDef[], progress: Readonly<Record<string, StopProgress>>, today: string) {
  return stops.map((stop) => {
    const { open, after } = stopOpening(stops, progress, stop);
    return { stop, view: viewStop(stop, progress[stop.id], open, today, after) };
  });
}
