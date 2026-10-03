/**
 * Pure helpers for the HUD streak, the Journey minutes bar and the Progress screen.
 * No DOM and no clock: every function takes the Journey day it should treat as "today".
 */
import { addDays, daysBetween, type StopProgress, type StopStatus } from '../engine/journey/mastery';
import type { Tally } from '../engine/save/save';

/** Seconds of active play a day needs to count toward the streak. */
export const STREAK_MIN_SECONDS = 60;
/** The daily time goal shown on the Journey and Progress screens. */
export const DAILY_GOAL_MINUTES = 30;
/** Minimum answers before a skill can be called "needs practice" or "strong". */
export const MIN_ANSWERS = 5;
export const NEEDS_PRACTICE_BELOW = 0.7;
export const STRONG_FROM = 0.8;

/**
 * Consecutive Journey days with at least 60 s of active play, ending today.
 * If today has not reached 60 s yet, the streak still counts up to yesterday, so it does not
 * look broken in the morning.
 */
export function streakDays(active: Readonly<Record<string, number>>, today: string, minSeconds = STREAK_MIN_SECONDS): number {
  const ok = (day: string) => (active[day] ?? 0) >= minSeconds;
  let day = ok(today) ? today : addDays(today, -1);
  let n = 0;
  while (ok(day)) {
    n += 1;
    day = addDays(day, -1);
  }
  return n;
}

/** Whole minutes played on one day. */
export function minutesOn(active: Readonly<Record<string, number>>, day: string): number {
  return Math.floor((active[day] ?? 0) / 60);
}

/** 0-100: how much of the daily goal one day has filled. */
export function goalPercent(seconds: number, goalMinutes = DAILY_GOAL_MINUTES): number {
  if (goalMinutes <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((seconds / (goalMinutes * 60)) * 100)));
}

/** The last `days` Journey days ending today, oldest first. */
export function dayRange(today: string, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}

export interface DayMinutes {
  day: string;
  minutes: number;
}

/** Minutes per day for the last `days` days (oldest first), zero-filled. */
export function minutesByDay(active: Readonly<Record<string, number>>, today: string, days: number): DayMinutes[] {
  return dayRange(today, days).map((day) => ({ day, minutes: minutesOn(active, day) }));
}

/** Total whole minutes across the last `days` days (summed in seconds first, then floored). */
export function totalMinutes(active: Readonly<Record<string, number>>, today: string, days: number): number {
  const sec = dayRange(today, days).reduce((s, d) => s + (active[d] ?? 0), 0);
  return Math.floor(sec / 60);
}

export interface SkillRow {
  skill: string;
  answered: number;
  firstTry: number;
  /** firstTry / answered, 0 when nothing was answered. */
  rate: number;
}

/** Sum each skill's tallies over the last `days` days. Sorted by skill id. */
export function skillRows(stats: Readonly<Record<string, Record<string, Tally>>>, today: string, days: number): SkillRow[] {
  const sums = new Map<string, [number, number]>();
  for (const day of dayRange(today, days)) {
    const row = stats[day];
    if (!row) continue;
    for (const [skill, [a, f]] of Object.entries(row)) {
      const cur = sums.get(skill) ?? [0, 0];
      sums.set(skill, [cur[0] + a, cur[1] + f]);
    }
  }
  return [...sums.entries()]
    .map(([skill, [answered, firstTry]]) => ({ skill, answered, firstTry, rate: answered ? firstTry / answered : 0 }))
    .sort((a, b) => (a.skill < b.skill ? -1 : a.skill > b.skill ? 1 : 0));
}

/** At least 5 answers and under 70% right on the first try. Weakest first. */
export function needsPractice(rows: readonly SkillRow[]): SkillRow[] {
  return rows
    .filter((r) => r.answered >= MIN_ANSWERS && r.rate < NEEDS_PRACTICE_BELOW)
    .sort((a, b) => a.rate - b.rate || b.answered - a.answered);
}

/** At least 5 answers and 80% or more right on the first try. Strongest first. */
export function strongSkills(rows: readonly SkillRow[]): SkillRow[] {
  return rows
    .filter((r) => r.answered >= MIN_ANSWERS && r.rate >= STRONG_FROM)
    .sort((a, b) => b.rate - a.rate || b.answered - a.answered);
}

/** Answers and first-try wins over the last `days` days. */
export function totals(stats: Readonly<Record<string, Record<string, Tally>>>, today: string, days: number): { answered: number; firstTry: number } {
  return skillRows(stats, today, days).reduce((t, r) => ({ answered: t.answered + r.answered, firstTry: t.firstTry + r.firstTry }), { answered: 0, firstTry: 0 });
}

/** First-try wins in the last 7 days (today and the six before). */
export function firstTryWinsThisWeek(stats: Readonly<Record<string, Record<string, Tally>>>, today: string): number {
  return totals(stats, today, 7).firstTry;
}

/** What happened after misses in the last `days` days: explanations shown, right retries with help, new examples
 * tried, new-example sets passed on their own, and "Explain more simply" used. */
export function helpTotals(
  help: Readonly<Record<string, Record<string, readonly number[]>>> | undefined,
  today: string,
  days: number,
): { explained: number; retried: number; fresh: number; freshPassed: number; simpler: number } {
  const t = { explained: 0, retried: 0, fresh: 0, freshPassed: 0, simpler: 0 };
  for (const day of dayRange(today, days)) {
    for (const h of Object.values(help?.[day] ?? {})) {
      t.explained += h[0] ?? 0;
      t.retried += h[1] ?? 0;
      t.fresh += h[2] ?? 0;
      t.freshPassed += h[3] ?? 0;
      t.simpler += h[4] ?? 0;
    }
  }
  return t;
}

/** Whole-number percent, or null when there is nothing to divide. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

/** Plain names for the skill tags the stops use, for the Grown-ups view and the CSV reader. */
export const SKILL_NAMES: Readonly<Record<string, string>> = {
  's1.statement': 'Seeing that a sentence is a statement',
  's1.not-statement': 'Seeing that a sentence is not a statement',
  's1.false-is-statement': 'A false sentence is still a statement',
  's1.opinion': 'An opinion is not a statement',
  's1.which-statement': 'Spot a statement',
  's1.which-not-statement': 'Spot what is not a statement',
  's1.check-cards': 'True or false from the cards',
  's1.cant-tell': 'Can’t tell yet',
  's1.not-every': 'The NOT of “every”',
  's1.not-some': 'The NOT of “there is”',
  's1.not-none': 'The NOT of “no”',
  's1.not-exactly': 'The NOT of “exactly”',
  's1.not-at-least': 'The NOT of “at least”',
  's1.not-first': 'The NOT of “the first card”',
  's1.not-more': 'The NOT of “more than” (a tie)',
  's1.signs-count': 'Treasure signs: count the true signs',
  's1.signs-owner': 'Treasure signs: the treasure box’s sign',
  's2.not': 'NOT',
  's2.not-count': 'NOT: counting',
  's2.not-means': 'NOT: what it leaves',
  's2.not-both': 'NOT ( … AND … )',
  's2.not-either': 'NOT ( … OR … )',
  's2.and': 'AND',
  's2.and-count': 'AND: counting',
  's2.and-not': 'AND with NOT',
  's2.and-pick': 'AND: pick a card',
  's2.or-both': 'OR includes both',
  's2.or-count': 'OR: counting',
  's2.or-pick': 'OR: pick a card',
  's2.or-yesno': 'OR: does it fit?',
  's2.bracket-yesno': 'Brackets: does it fit?',
  's2.brackets-first': 'Brackets: which part comes first',
  's2.same-meaning': 'Rules that mean the same',
  's2.guess-rule': 'Guess the rule',
  's3.chain': 'Chains',
  's3.chain-cant-tell': 'Chains: can’t tell',
  's3.before': 'Before',
  's3.right-before': 'Right before',
  's3.between': 'Between',
  's3.next-to': 'Next to',
  's3.not-first-last': 'Not first, not last',
  's3.build': 'Build the line',
  's3.not-needed': 'Which clue wasn’t needed',
  's4.grid-marks': 'Turning a clue into a ✓ or ✗',
  's4.grid-one': 'Solving a one-part logic grid',
  's4.only-one-left': 'Only one box left',
  's4.not-decided': 'Seeing when you can’t tell yet',
  's4.spread-tick': 'Spreading a ✓ along its row and column',
  's4.spread-column': 'Remembering the column when spreading a ✓',
  's4.link': 'Using linking clues',
  's4.not-link': 'Using “not” linking clues',
  's4.grid-two': 'Solving a two-part logic grid',
  's4.proof-clue': 'Finding the clue that proves a mark',
  's4.enough-clues': 'Telling whether the clues are enough yet',
  's5.words': 'What a knight’s or a knave’s words tell you',
  's5.cant-say': 'Who could say it',
  's5.suppose': 'Make a guess and crash-test it',
  's5.two': 'Two islanders',
  's5.three': 'Three islanders',
  's5.and-or': 'A knave’s “and” and “or”',
  's6.who-broke': 'Who broke the rule',
  's6.did-break': 'Did this break the rule',
  's6.forward': 'Using a rule forward',
  's6.backward': 'Running a rule backward',
  's6.move-if': 'The IF part happened',
  's6.move-not-then': 'The THEN part did not happen',
  's6.trap-then': 'The THEN part happened: nothing follows',
  's6.trap-not-if': 'The IF part did not happen: nothing follows',
  's6.same-pick': 'Pick the same meaning',
  's6.same-yesno': 'Does it mean the same as the rule?',
  's6.checker': 'Rule checker cards',
  's6.checker-card': 'Rule checker: one card',
};

/** 's2.or-both' -> 'OR includes both' (no stop number). Unknown tags fall back to their words. */
export function skillName(skill: string): string {
  const m = /^s(\d{1,2})\.(.+)$/.exec(skill);
  if (!m) return skill;
  return SKILL_NAMES[skill] ?? (m[2].replace(/^l\d+\./, '').replace(/[-_.]+/g, ' ').trim() || 'mixed');
}

/** 's2.or-both' -> 'Stop 2 · OR includes both'. Unknown tags fall back to their words. */
export function skillLabel(skill: string): string {
  const m = /^s(\d{1,2})\./.exec(skill);
  return m ? `Stop ${Number(m[1])} · ${skillName(skill)}` : skill;
}

/** When a Wrong-Answer Notebook card can be fixed: "Ready now", "Ready tomorrow" or "Ready in 3 days". */
export function readyLabel(due: string, today: string): string {
  const n = daysBetween(today, due);
  if (n <= 0) return 'Ready now';
  return n === 1 ? 'Ready tomorrow' : `Ready in ${n} days`;
}

/** How many stops are passed, locked in and mastered (each count includes the later ones). */
export function stopCounts(progress: Readonly<Record<string, StopProgress>>): { passed: number; lockedIn: number; mastered: number } {
  let passed = 0, lockedIn = 0, mastered = 0;
  for (const p of Object.values(progress)) {
    if (p.passDay) passed += 1;
    if (p.lockDay) lockedIn += 1;
    if (p.weekDay) mastered += 1;
  }
  return { passed, lockedIn, mastered };
}

export type PathDot = 'gold' | 'passed' | 'current' | 'locked' | 'soon';

/** One dot per stop for the Progress path strip. */
export function pathDot(status: StopStatus): PathDot {
  switch (status) {
    case 'mastered':
    case 'lockedIn':
      return 'gold';
    case 'passed':
      return 'passed';
    case 'learning':
    case 'ready':
    case 'notYet':
    case 'resting':
      return 'current';
    case 'soon':
      return 'soon';
    case 'locked':
      return 'locked';
  }
}

/**
 * The stop a player is on, for the "Stop n" line on player cards: one past the run of passed stops
 * from stop 1, at most `total`.
 */
export function frontierStop(stopIds: readonly string[], progress: Readonly<Record<string, StopProgress>>): number {
  let n = 0;
  while (n < stopIds.length && progress[stopIds[n]]?.passDay) n += 1;
  return Math.min(stopIds.length, n + 1);
}

/** Short day label for charts: '2026-09-30' -> 'Sep 30'. */
export function shortDay(day: string): string {
  const [, m, d] = day.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(m - 1) % 12] ?? ''} ${d}`;
}

/** A safe file-name part from a player name. */
export function fileSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'player';
}
