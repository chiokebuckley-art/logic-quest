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
  /**
   * A pinned clue list, always visible while solving. A worked example can also show one line of people (first to
   * last) and mark each clue as holding or broken for that line.
   */
  | { kind: 'clues'; clues: string[]; marks?: ('ok' | 'broken')[]; line?: { names: string[]; first: string; last: string } }
  | { kind: 'text'; lines: string[] } // a sentence, rule or quote card
  /** Speech bubbles. rule: 'Knights always tell the truth…'. fact: what is true on this board ('The well is full.'), drawn as a banner. */
  | { kind: 'speakers'; speakers: Speaker[]; rule?: string; fact?: string }
  /**
   * A logic grid drawn as a picture (not playable): rows × cols with some ✓ / ✗ marks. For worked examples.
   * labels: a short word drawn inside a box ('the break'), by row id and column id.
   */
  | { kind: 'grid'; rows: Choice[]; cols: Choice[]; marks: Record<string, Record<string, 'yes' | 'no'>>; caption?: string; labels?: Record<string, Record<string, string>> };

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

// ---------- teaching after a wrong answer ----------

/** A labelled group of things to count, drawn as that many dots beside its numeral: "Red dragons 3". */
export interface CountGroup {
  label: string;
  n: number;
  /** Dot colour. The label always names the group, so colour never carries the meaning alone. */
  color?: Color;
}

/** Whether one sentence is true in a case: { who: 'Your answer', value: false }. */
export interface Truth {
  who: string;
  value: boolean;
}

/**
 * One worked case, drawn as a card: its label in words (enough on its own if the picture cannot load),
 * an optional picture (counted groups or shape cards), whether each sentence is true there, and a note.
 */
export interface TeachCase {
  /** "3 red dragons and 3 yellow dragons." */
  label: string;
  groups?: CountGroup[];
  things?: Thing[];
  truths?: Truth[];
  /** "The counts are equal. This is a tie." */
  note?: string;
}

/**
 * What one wrong choice gets wrong. It describes the answer's gap, never the player's private reasoning.
 * Every wrong choice of a choose item has one, keyed by the choice id (see ChooseItem.feedback).
 */
export interface ChoiceFeedback {
  /** One sentence naming the gap: "Your answer leaves out one possibility: a tie." */
  headline: string;
  /** What the answer means and exactly where it fails. Short paragraphs, concrete, with labelled numbers. */
  detail: string[];
  /** The case that shows the failure (a counterexample). */
  example?: TeachCase;
  /** "Explain more simply" for this choice, when it needs its own smallest example (else Teach.simpler). */
  simpler?: string[];
}

/**
 * Item-level teaching, shown after any wrong answer (and the whole explanation when a choice has no
 * ChoiceFeedback). Grade-6 reading level, like every other player-facing text. See docs/CONTENT_GUIDE.md.
 */
export interface Teach {
  /** The plain-language rule: "NOT means the original statement is false." */
  rule: string;
  /** Words the explanation needs, defined in place: { word: 'A tie', meaning: 'the two groups have the same number.' }. */
  terms?: { word: string; meaning: string }[];
  /** What the original sentence or clue says, and when it is true. */
  meaning?: string;
  /** Cases that cover every way the question can go, e.g. red has more, red has fewer, a tie. */
  cases?: TeachCase[];
  /** Heading above the cases: "When is the dragon’s sentence false?" */
  casesTitle?: string;
  /** "Remember" lines: the rule in a few words, and a question to ask yourself. */
  remember?: string[];
  /** "Explain more simply": the smallest worked example, step by step. */
  simpler?: string[];
}

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
  /** Teaching shown after a wrong answer in lessons and practice (never in checks). */
  teach?: Teach;
  /**
   * A marked case the Hint shows with its words (lessons and practice only): one case with every truth already
   * marked, so the hint models the method instead of only restating it. Pick a case that is not the answer.
   */
  hintCase?: TeachCase;
  /**
   * A guided board the learner marks before the answer buttons appear (the first quiz of a new method). The
   * answer counts only after these marks are right. Never shown in checks.
   */
  workFirst?: DrillStep;
  /** Tags a lesson's pass rule can ask for (LessonPass.include), such as 'false-statement' or 'cant-tell'. */
  tags?: string[];
  /**
   * The same board every time (a first quiz on the worked example's cards, a frozen twin). It belongs in its
   * lesson's planned quiz only: never an extra quiz item, a notebook repair or a new example after a miss.
   */
  fixed?: boolean;
}

export interface ChooseItem extends ItemBase {
  kind: 'choose';
  choices: Choice[];
  /** Id of the one right choice. */
  answer: string;
  /** Choice id -> what that pick gets wrong, as one string. Kept in step with `feedback` (see withFeedback). */
  whyWrong?: Record<string, string>;
  /** Choice id -> the structured explanation for that wrong choice. Choice ids stay fixed when choices are shuffled. */
  feedback?: Record<string, ChoiceFeedback>;
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

// ---------- the Do step: guided boards ----------
//
// Every new method is taught See -> Do -> Quiz. See: a key-idea card with one case already marked. Do: the learner
// marks a case on that same board by taps (true or false, fits or not, a check or a cross, a count, keep or
// reject). Quiz: a twin of the same rule family, only after the marks are right. Reading the cards never passes a
// lesson: the learner has to perform the marks.

/** One choice on a guided board: "True", "False", "2", "Keep". */
export interface DrillOption {
  id: string;
  label: string;
}

/**
 * One mark on a guided board. A given mark is shown already set (the worked case); the learner sets every other
 * mark by tapping one option. A wrong option stays wrong until the learner changes it; nothing is filled in.
 */
export interface DrillMark {
  id: string;
  /** What is being marked, in words: "Gold sign", "True signs", "Big red circle", "Leo and the apple". */
  label: string;
  options: DrillOption[];
  /** The id of the right option, computed by the engine. */
  answer: string;
  /** Shown already marked, not tappable. */
  given?: boolean;
  /** The shape card this mark is about, drawn beside its label ("Fits or Not" on each card of a deck). */
  thing?: Thing;
  /**
   * The first mismatch in plain words, keyed by the wrong option's id: "Silver’s sign is true if the treasure is
   * in Gold. The treasure is not in Silver." Every wrong option of every mark to tap has one.
   */
  why: Record<string, string>;
}

/** One row of a guided board: one case, card, box or person, with its marks. */
export interface DrillRow {
  id: string;
  /** "Pretend the treasure is in the Silver chest." Enough on its own if a picture cannot load. */
  label: string;
  marks: DrillMark[];
  /** Shown under a given row, and under the learner's row once its marks are right: "1 true sign. Keep." */
  note?: string;
  /** A picture for this row: the shape cards it is about. */
  things?: Thing[];
}

/** A guided board: the Do beat. Same board as the worked example, or a twin that changes one piece. */
export interface DrillStep {
  id: string;
  /** "Mark a case" */
  title: string;
  /** What to do, in a few short sentences. */
  body: string[];
  /** The board: the same scene as the worked example. */
  scene?: Scene;
  /**
   * When the board is a twin of the worked example rather than the same board: what changed, in words ("Card 2
   * is gone."). A twin changes one piece.
   */
  twin?: string;
  /** Given rows first (the shown case), then the rows the learner marks. */
  rows: DrillRow[];
  /**
   * A grid board (a logic grid, or the four boxes of an IF-THEN rule): one column per entry, and each row's marks
   * fill its columns in order. Grid marks use the options 'yes' (✓) and 'no' (✗); a tap cycles a box blank, ✗, ✓.
   * Row labels are short ("Mia"). Without columns, each row is a card of labelled choices.
   */
  columns?: string[];
  /** A grid board's caption ("Snacks"). */
  caption?: string;
  /**
   * Open this board right after key-idea card number afterCard (0-based) instead of after the last card, so the Do
   * sits next to its See. Boards keep their order; later cards follow the board.
   */
  afterCard?: number;
  /** Said once every mark is right. */
  done: string;
}

/**
 * When a lesson is passed: the Do boards are marked right, then this many quiz answers are right on the first try
 * with no hint. More quiz items come until the rule is met. Default: 3 first-try answers.
 */
export interface LessonPass {
  firstTry: number;
  /** The first-try answers must come in a row. */
  inARow?: boolean;
  /** Each group needs at least one first-try answer on an item carrying its tag (ItemBase.tags). */
  include?: { tag: string; label: string }[];
}

export interface LessonDef {
  /** 's1.l1' */
  id: string;
  title: string;
  /** See: the key ideas, ending on a worked example with one case already marked. */
  ideas: IdeaCard[];
  /** Do: the guided boards, marked by taps after the cards and before any quiz. Required on every lesson. */
  drill?: DrillStep[];
  /** 3-5 quiz tries in different skins (everyday, fantasy, abstract), all in the rule family the lesson taught. */
  practice(rng: Rng): Item[];
  /** Default { firstTry: 3 }. */
  pass?: LessonPass;
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
  /**
   * New examples after a miss in a lesson or practice (see engine/fresh.ts). Return [] to use the default: one
   * item with the same skill from the same lesson. Used when one skill needs a set, e.g. a tie and no tie.
   */
  fresh?(missed: Item, rng: Rng): Item[];
}
