/**
 * The item model every part of the game shares. Engines generate Items, the UI draws them,
 * grade() marks an Answer against them. Items are plain data (no functions) so a check can be
 * regenerated from its seed and compared in tests.
 */
import type { Rng } from './rng';
export type { Rng };

// ---------- things the UI knows how to draw ----------

export type Shape = 'circle' | 'square' | 'triangle';
export type Color = 'red' | 'blue' | 'yellow';
export type Size = 'big' | 'small';

/** A shape card. `hidden` means it is face down: the player cannot see its shape, colour or size. */
export interface Thing {
  id: string;
  shape: Shape;
  color: Color;
  size: Size;
  hidden?: boolean;
  /** Drawn as a badge: 'yes' = let through / fits, 'no' = stopped / does not fit. Used by "guess my rule". */
  mark?: 'yes' | 'no';
}

/** A treasure box with a sign on it (Smullyan-style sign puzzles). */
export interface SignBox {
  id: string;
  name: string; // 'Gold box'
  sign: string; // 'The treasure is in this box.'
}

/** Someone on Riddle Island and what they say (stop 5). */
export interface Speaker {
  id: string;
  name: string;
  says: string;
}

export type Scene =
  | { kind: 'things'; things: Thing[] } // a row of shape cards, some may be face down
  | { kind: 'boxes'; boxes: SignBox[]; rule: string } // rule: 'Exactly one sign is true.'
  | { kind: 'clues'; clues: string[] } // pinned clue list, always visible while solving
  | { kind: 'text'; lines: string[] } // a sentence, rule or quote card
  | { kind: 'speakers'; speakers: Speaker[]; rule?: string } // speech bubbles; rule: 'Knights always tell the truth…'
  /** A logic grid drawn as a picture (not playable): rows × cols with some ✓ / ✗ marks. For worked examples. */
  | { kind: 'grid'; rows: Choice[]; cols: Choice[]; marks: Record<string, Record<string, 'yes' | 'no'>>; caption?: string };

export interface Choice {
  id: string;
  label: string;
}

// ---------- line-up clues (stop 3) ----------

/** Positions run first -> last. "before" means earlier in the line (finished sooner, or taller when the line is tallest-first). */
export type LineClue =
  | { t: 'before'; a: string; b: string } // a is somewhere before b
  | { t: 'rightBefore'; a: string; b: string } // a is directly before b
  | { t: 'nextTo'; a: string; b: string } // a and b stand side by side
  | { t: 'notNextTo'; a: string; b: string }
  | { t: 'between'; a: string; b: string; c: string } // a is somewhere between b and c (either order)
  | { t: 'first'; a: string }
  | { t: 'last'; a: string }
  | { t: 'notFirst'; a: string }
  | { t: 'notLast'; a: string }
  | { t: 'place'; a: string; k: number }; // a is k-th, 1-based

// ---------- grid clues (stop 4) ----------

/**
 * A clue in a logic grid. People are rows; each category (pet, snack, …) gives every person one value, and in a
 * grid puzzle each value goes to exactly one person. p = person id, c = category id, v = value id.
 */
export type GridClue =
  | { t: 'is'; p: string; c: string; v: string } // Mia has the cat
  | { t: 'isnt'; p: string; c: string; v: string } // Mia does not have the dog
  | { t: 'either'; p: string; c: string; v1: string; v2: string } // Leo has the cat or the fish
  | { t: 'link'; c1: string; v1: string; c2: string; v2: string } // the dog owner eats popcorn
  | { t: 'notLink'; c1: string; v1: string; c2: string; v2: string }; // the dog owner does not eat popcorn

// ---------- knights and knaves (stop 5) ----------

/** What an islander claims. 'knight' / 'knave' are the two kinds. The engine checks a claim against an assignment. */
export type Claim =
  | { t: 'is'; who: string; kind: 'knight' | 'knave' } // "Ben is a knave."
  | { t: 'same'; a: string; b: string } // "Ava and I are the same kind."
  | { t: 'diff'; a: string; b: string } // "Ava and I are different kinds."
  | { t: 'count'; op: 'atLeast' | 'exactly' | 'atMost'; k: number; kind: 'knight' | 'knave' } // "Exactly one of us is a knight."
  | { t: 'not'; c: Claim }
  | { t: 'and'; cs: Claim[] }
  | { t: 'or'; cs: Claim[] }
  | { t: 'if'; a: Claim; b: Claim }; // "If I am a knight, then Cal is a knave."

// ---------- items ----------

interface ItemBase {
  /** Unique within one generated set. */
  id: string;
  /** Stop number, 1-12. */
  stop: number;
  /** Lesson where this item's idea is taught, e.g. 's1.l2'. "Learn this again" sends the player there. */
  lesson: string;
  /** Finer tag for statistics and "needs practice", e.g. 's2.or-both'. */
  skill: string;
  /** The question. Grade-6 reading level. */
  prompt: string;
  scene?: Scene;
  /** Why the right answer is right. Shown after answering (lessons, practice) or on the result screen (checks). */
  explain: string;
  /** Optional nudge for lessons and practice. Never shown in checks. */
  hint?: string;
  /** True when intuition points the wrong way (belief-bias style). Every check includes at least one when the stop has them. */
  conflict?: boolean;
  /**
   * Seconds this item gets in a check when the timer is on (default 90). Logic grids and three-islander puzzles
   * take longer: use 150-180 for those.
   */
  seconds?: number;
}

export interface ChooseItem extends ItemBase {
  kind: 'choose';
  choices: Choice[];
  /** Id of the one right choice. */
  answer: string;
  /** Choice id -> what that pick gets wrong. Missing keys fall back to `explain`. */
  whyWrong?: Record<string, string>;
}

export interface TapAllItem extends ItemBase {
  kind: 'tapall';
  /** Shown face up; the player taps every one that fits. */
  things: Thing[];
  /** Ids of every thing that fits. May be empty (then the right move is to tap nothing and check). */
  answer: string[];
  /** Exact wrong sets that reveal a known misreading, e.g. OR read as "one but not both". */
  diagnose?: { ids: string[]; message: string }[];
}

export interface OrderItem extends ItemBase {
  kind: 'order';
  /** The people to place. */
  names: Choice[];
  /** Structured clues. The scene shows their text in the same order. */
  clues: LineClue[];
  /** Ids first -> last. The clues force exactly this order. */
  answer: string[];
  firstLabel: string; // 'Finished first' | 'Tallest'
  lastLabel: string; // 'Finished last' | 'Shortest'
}

/**
 * Give every person a value in every category: a logic grid (stop 4, layout 'grid') or knight/knave labels on
 * islanders (stop 5, layout 'toggles'). Exactly one full assignment fits (the contract test brute-forces this).
 */
export interface AssignItem extends ItemBase {
  kind: 'assign';
  layout: 'grid' | 'toggles';
  /** Rows. For knights these are the speakers, in the same order as the scene. */
  people: Choice[];
  /** Columns. oneEach: every value in this category goes to exactly one person (grid puzzles). */
  categories: { id: string; label: string; values: Choice[]; oneEach: boolean }[];
  /** personId -> categoryId -> valueId */
  answer: Record<string, Record<string, string>>;
  /** Grid puzzles: structured clues, one per line of the 'clues' scene, same order. */
  gridClues?: GridClue[];
  /** Knights puzzles: what each person claims (category id 'kind', values 'knight' / 'knave'). */
  claims?: Record<string, Claim>;
}

/**
 * Pick every card that must be turned over (or every one that fits): text cards, not shape cards (stop 6's rule
 * checker). Any subset may be right, including none.
 */
export interface MultiItem extends ItemBase {
  kind: 'multi';
  choices: Choice[];
  answer: string[];
  /** Choice id -> why picking it is a mistake. */
  pickTips?: Record<string, string>;
  /** Choice id -> why leaving it out is a mistake. */
  missTips?: Record<string, string>;
}

export type Item = ChooseItem | TapAllItem | OrderItem | AssignItem | MultiItem;

export type Answer =
  | { kind: 'choose'; id: string }
  | { kind: 'tapall'; ids: string[] }
  | { kind: 'order'; ids: string[] }
  | { kind: 'assign'; values: Record<string, Record<string, string>> }
  | { kind: 'multi'; ids: string[] };

export interface Graded {
  correct: boolean;
  /** What the miss gets wrong ('' when correct). */
  feedback: string;
  /** Order and grid items: indexes into the clue list that the answer breaks. */
  broken?: number[];
}

// ---------- lessons and stops ----------

/** One key-idea screen, read before any question. 3-6 per lesson. */
export interface IdeaCard {
  title: string;
  /** Short paragraphs. Grade-6 reading level; read aloud on request. */
  body: string[];
  /** Optional worked example drawn above the text. */
  scene?: Scene;
}

export interface LessonDef {
  /** 's1.l1' */
  id: string;
  title: string;
  ideas: IdeaCard[];
  /** 3-5 guided tries in different skins (everyday, fantasy, abstract). Same rng -> same items. */
  practice(rng: Rng): Item[];
}

export interface StopDef {
  n: number;
  /** 's1' */
  id: string;
  title: string;
  /** One-line key idea for the Journey list. */
  idea: string;
  /** false: shown on the Journey as "coming soon". */
  ready: boolean;
  lessons: LessonDef[];
  /** The stop check: 8-10 items, every lesson at least once, at least one conflict item where the stop has them. */
  check?(rng: Rng): Item[];
  /** One Arcade practice item drawn from anywhere in the stop. */
  practice?(rng: Rng): Item;
}

