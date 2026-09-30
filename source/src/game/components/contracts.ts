/**
 * Props contracts between the play components (ItemView, LessonRunner, CheckRunner, PracticeRunner)
 * and the screens that host them. The play components never touch the store; screens pass data in
 * and get results back through these callbacks.
 */
import type { CheckKind } from '../../engine/journey/mastery';
import type { Answer, IdeaCard, Item, LessonDef, StopDef } from '../../engine/types';

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
}

export interface PracticeRunnerProps {
  stop: StopDef;
  seed: number;
  readAloud: boolean;
  onAnswer(record: AnswerRecord): void;
  onExit(): void;
}

