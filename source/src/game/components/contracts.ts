/**
 * Props contracts between the play components (ItemView, LessonRunner, CheckRunner, PracticeRunner)
 * and the screens that host them. The play components never touch the store; screens pass data in
 * and get results back through these callbacks.
 */
import type { CheckKind } from '../../engine/journey/mastery';
import type { Answer, IdeaCard, Item, LessonDef, StopDef } from '../../engine/types';

/**
 * How a learn-mode item went after a miss (lessons, practice, the notebook). Kept apart from the first try:
 * help and a revealed answer never count as learning on their own.
 */
export interface HelpUse {
  /** There was a wrong answer, so the explanation was shown. */
  explained: boolean;
  /** "Explain more simply" was opened. */
  simpler: boolean;
  /** The hint was opened. */
  hint: boolean;
  /** Right on the retry after the explanation (practice with help). */
  retried: boolean;
  /** New examples tried after the miss. */
  fresh: number;
  /** The last set of new examples was all right, with no hint. */
  freshPassed: boolean;
  /** The player chose "Move on for now". */
  moveOn?: boolean;
  /** A choice that had no explanation of its own ("skill:choiceId"), for repair. */
  gap?: string;
}

/** One answered item. `firstTry` is true when the first attempt was right. */
export interface AnswerRecord {
  itemId: string;
  stop: number;
  lesson: string;
  skill: string;
  correct: boolean;
  firstTry: boolean;
  ms: number;
  timedOut?: boolean;
  /** The player's (last) answer, for "You said" on the check result. Missing on a timeout. */
  answer?: Answer;
  /** Learn mode only. */
  help?: HelpUse;
}

/** 'learn': instant feedback, hint button, retry until right. 'check': no feedback, no hint, answer once. */
export type ItemMode = 'learn' | 'check';

export interface ItemViewProps {
  item: Item;
  mode: ItemMode;
  /** learn: called once the item is finished (right, or given up after seeing the answer). check: called on submit. */
  onDone(record: AnswerRecord): void;
  readAloud: boolean;
  /** Check mode only: seconds allowed (90), or null for no timer. On timeout the item counts as wrong. */
  timeLimit?: number | null;
}

export interface IdeaCardsProps {
  cards: IdeaCard[];
  readAloud: boolean;
  onDone(): void;
}

export interface LessonRunnerProps {
  stop: StopDef;
  lesson: LessonDef;
  /** Seed for lesson.practice(rng). */
  seed: number;
  readAloud: boolean;
  onAnswer(record: AnswerRecord): void;
  /** All key-idea cards read and every practice item finished. */
  onComplete(): void;
  onExit(): void;
  /** Pick up a lesson left partway: the next try (0-based) and the first-try wins so far. Skips the key ideas. */
  start?: { next: number; firstTry: number };
  /** After each try: the next try (0-based) and the first-try wins so far, so the host can save the place. */
  onProgress?(next: number, firstTry: number): void;
}

export interface CheckRunnerProps {
  stop: StopDef;
  kind: CheckKind;
  items: Item[];
  /** Seconds per question, or null when grown-ups switched the timer off. */
  timeLimit: number | null;
  readAloud: boolean;
  /** One record per item, in order. */
  onFinish(records: AnswerRecord[]): void;
  /** The player left early. `answered` holds the records so far (empty when no question was answered). */
  onExit(answered: AnswerRecord[]): void;
  /** After each answer except the last: every record so far, so the host can save a check in progress. */
  onProgress?(answered: AnswerRecord[]): void;
}

export interface CheckResultProps {
  stop: StopDef;
  kind: CheckKind;
  items: Item[];
  records: AnswerRecord[];
  passed: boolean;
  /** Missed lesson ids, in lesson order. */
  missed: string[];
  onLearnAgain(lessonId: string): void;
  onDone(): void;
  /** Show the read-aloud button on each explanation. */
  readAloud?: boolean;
}

export interface PracticeRunnerProps {
  stop: StopDef;
  seed: number;
  readAloud: boolean;
  onAnswer(record: AnswerRecord): void;
  onExit(): void;
}
