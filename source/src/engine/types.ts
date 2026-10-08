/**
 * The item model every part of the game shares. Engines generate Items, the UI draws them,
 * grade() marks an Answer against them. Items are plain data (no functions) so a check can be
 * regenerated from its seed and compared in tests.
 */
import type { Rng } from './rng';
import type { ObservatoryScene } from './scenes';
export type { Rng };
export type { ObservatoryScene, SceneStep, ChainToken, MatrixCell } from './scenes';

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
  /**
   * Speech bubbles. rule: 'Knights always tell the truth…'. fact: what is true on this board ('The well is full.'),
   * drawn as a banner. test: the case being tried ('Ava is a knave'), drawn as a test-world banner beside the fact,
   * so a guess is never mistaken for a fact.
   */
  | { kind: 'speakers'; speakers: Speaker[]; rule?: string; fact?: string; test?: string }
  /**
   * A logic grid drawn as a picture (not playable): rows × cols with some ✓ / ✗ marks. For worked examples.
   * labels: a short word drawn inside a box ('the break'), by row id and column id.
   */
  | { kind: 'grid'; rows: Choice[]; cols: Choice[]; marks: Record<string, Record<string, 'yes' | 'no'>>; caption?: string; labels?: Record<string, Record<string, string>> }
  /**
   * A case board drawn as a picture (sign puzzles): the boxes as cards, each with its sign. One case can be picked
   * (pretend the treasure is in box `pretend`): then each sign carries a True or False stamp for that case. Each box
   * can show its count of true signs and its verdict: Keep (a ring) or Reject (a cross). `steps`: a worked example
   * shown one stamp at a time (each sign, then the count and the verdict), one line each. `changed`: the sign a twin
   * changed, tagged on the picture.
   */
  | { kind: 'cases'; rule: string; boxes: SignBox[]; pretend?: number; stamps?: boolean[]; counts?: (number | null)[]; verdicts?: (CaseVerdict | null)[]; steps?: CaseStep[]; changed?: number }
  /**
   * Two cases side by side that differ in one thing, to teach a distinction (see LessonDef.distinctions): the same
   * test world with a different statement, or the same statement in a different world. Each panel shows the world,
   * the statement, and the comparison that gives its truth. `ask`: the question under them ("Did the treasure move?")
   * and its answer.
   */
  | { kind: 'contrast'; pairs: [ContrastPanel, ContrastPanel]; ask?: { q: string; a: string }; words?: ContrastWords }
  /** The Pattern Observatory's pictures (src/engine/scenes): a chain, a staircase, a machine, a clock, a mirror, a matrix, a bridge, a lantern. */
  | ObservatoryScene;

/** The labels a contrast picture uses, so a card puzzle never says "sign" or "test world". All optional. */
export interface ContrastWords {
  /** The tag over each panel's world line. Default "Test world". */
  worldTag?: string;
  /** The word after `who` ("says:" by default; "rule:" for a machine rule). */
  saysWord?: string;
  /** The verdict words. Default "True" / "False". For a deck: "Fits" / "Not"; for a case: "Can happen" / "Can’t happen". */
  truth?: string;
  untruth?: string;
}

/** One panel of a contrast picture. */
export interface ContrastPanel {
  /** "Test: the treasure is in the Bronze chest." */
  world: string;
  /** Whose statement it is: "Bronze chest sign". */
  who: string;
  /** The statement's words. */
  says: string;
  /** How it comes out in that world. */
  truth: boolean;
  /** The comparison, in words: "It says Bronze. The test says Bronze. They match." */
  because: string;
  /** An optional picture: the shape cards this panel is about. */
  things?: Thing[];
  /** An optional last line: the need or the verdict that follows ("A knave with true words: this case crashes."). */
  then?: string;
}

/** A box's verdict on a case board: Keep (drawn as a ring) or Reject (drawn as a cross). */
export type CaseVerdict = 'keep' | 'reject';

/** One step of a worked case on a case board: the button that shows it ("Check the Gold chest sign") and its line. */
/**
 * How a statement's truth was worked out in a test world, in three parts: what the statement says, what the test
 * world says, and whether they match. The screen shows them as rows, never as symbols.
 */
export interface Because {
  says: string;
  world: string;
  match: boolean;
}

export interface CaseStep {
  label: string;
  say: string;
  /** The comparison behind a stamp, shown as three rows under the board. Count-and-decide steps have none. */
  because?: Because;
}

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
  /** The comparison behind the value, shown as Says / In this case / So rows under it (hints and Teach cases). */
  because?: Because;
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
  /** The labels its because rows and truth rows use (BoardWords.truth / untruth for "Fits" / "Not"). */
  words?: BoardWords;
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
  /** Stop number, 1-13. */
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
  /**
   * A thinking board the learner may open while answering (lessons and practice, never checks): the question's own
   * board to mark by taps. It is never checked and never counts; it only helps.
   */
  scratch?: DrillStep;
  /** What the thinking board's toggle calls it: "the case board" (default), "the test board", "the grid". */
  scratchLabel?: string;
  /** "I’m confused" questions for this question (lessons and practice, never checks). Using them counts as help. */
  confused?: ConfusedQuestion[];
  /** The closing line of this question's "I’m confused" panel. Default: the board's words (workFirst or scratch), else a plain line. */
  confusedClosing?: string;
  // ---- Pattern Observatory (lessons with LessonDef.routine) ----
  /** Which phase of the five-phase lesson this item belongs to. The runner labels and orders tries by it. */
  phase?: Phase;
  /** The level this item is pitched at (L1 Starter … L4 Prover). Levels are never ages. */
  level?: 1 | 2 | 3 | 4;
  /**
   * A faded example: the sentence frame with `___` for the one blank. The screen shows the frame with the picked
   * answer in the blank, so the learner fills a frame before doing the same task with no frame.
   */
  frame?: string;
  /** What this item declares about itself (the handoff's §14 metadata). Every Observatory item has one. */
  meta?: ItemMeta;
  /** The explanation level an Explain item needs (0-3; see ItemMeta.rubric). A preschool item never needs 3. */
  rubric?: 0 | 1 | 2 | 3;
  /** The misconception each wrong answer reveals (choice id, or the wrong number as a string). */
  errorTags?: Record<string, ErrorTag>;
  /** The hint sequence (the first is also `hint`): count whole cycles · where does cycle 10 end? · a worked twin. */
  hints?: string[];
  /** The twin family: items that share it are matched twins (same structure, new numbers or materials). */
  twin?: string;
}

/** The five phases of an Observatory lesson (See is the key-idea cards; the rest are items). */
export type Phase = 'explain' | 'do' | 'transfer' | 'review';

/** Errors are recorded by meaning (the handoff's error tags). */
export type ErrorTag =
  | 'oversized-unit' // a longer block also repeats, but it is not the shortest
  | 'copy-last' // copying the last item instead of continuing the unit
  | 'not-repeating' // calling a random chain a repeating one
  | 'error-near-end' // missing a break near the end of the chain
  | 'same-objects-different-structure' // the same objects, but not the same structure (translation)
  | 'off-by-one' // n jumps instead of n − 1, or an index off by one
  | 'local-only' // "add 2" with no position rule
  | 'add-vs-multiply' // treating doubling like adding
  | 'first-rule' // the first rule that fits the first pair, never tested
  | 'undo-order' // reversing a machine in the wrong order
  | 'elapsed-vs-position' // item n of a cycle vs n steps after
  | 'zero-remainder' // a zero remainder read as the first item
  | 'reflection-vs-rotation'
  | 'row-only' // the row rule checked, the column rule not
  | 'appearance-match' // an analogy answer that looks alike instead of keeping the relation
  | 'examples-as-proof' // a run of examples taken as a proof
  | 'unwarranted-certainty'; // certain where the evidence only supports a guess

/** What every Observatory item declares (the handoff's §14 "Every item declares"). Plain strings, for the log and the tests. */
export interface ItemMeta {
  /** The track and skill in words: "Track 1 · distant position". */
  skill: string;
  /** The generating rule or assumptions, stated: "repeat ABCD; the first item is position 1". */
  rule: string;
  /** The task type: "predict an item", "box the shortest unit", "choose a separating input". */
  task: string;
  /** The representation: "letters", "shape cards", "sounds", "weekdays", "a dot grid". */
  representation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  answerType: 'categorical' | 'number' | 'order' | 'set';
  /** Reasoning items: the alternative rules that are also accepted (each precisely stated). */
  alternatives?: string[];
  /** The explanation rubric for this item, in words: "2 = uses whole cycles correctly". */
  rubric?: string;
  tags: ErrorTag[];
  twin: string;
  phase: Phase;
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

/**
 * A whole-number answer typed on the in-app number pad (the Pattern Observatory: a far term, a step count, an
 * input to feed a machine). Never a native text field, so a tablet's keyboard never opens.
 */
export interface NumberItem extends ItemBase {
  kind: 'number';
  answer: number;
  /** The pad accepts up to this many digits (default 3). */
  digits?: 1 | 2 | 3 | 4;
  /** A unit word after the number: "tiles", "days". */
  unit?: string;
  /** The wrong number (as a string) -> what that answer gets wrong. Other wrong numbers get a plain line and the teaching. */
  feedback?: Record<string, ChoiceFeedback>;
  /** Kept in step with `feedback` (see syncWhyWrong). */
  whyWrong?: Record<string, string>;
}

export type Item = ChooseItem | TapAllItem | OrderItem | AssignItem | MultiItem | NumberItem;

export type Answer =
  | { kind: 'choose'; id: string }
  | { kind: 'tapall'; ids: string[] }
  | { kind: 'order'; ids: string[] }
  | { kind: 'assign'; values: Record<string, Record<string, string>> }
  | { kind: 'multi'; ids: string[] }
  | { kind: 'number'; value: number };

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
  /** The distinction this card teaches (LessonDef.distinctions), usually with a contrast scene. */
  distinction?: string;
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
  /** A case board's stamp (DrillStep.layout 'cases'): the box whose sign it sits on, by index. */
  on?: number;
  /**
   * The first mismatch in plain words, keyed by the wrong option's id: "Silver’s sign is true if the treasure is
   * in Gold. The treasure is not in Silver." Every wrong option of every mark to tap has one.
   */
  why: Record<string, string>;
  /**
   * The two facts to compare before marking, with no verdict: what the statement says and what the test world says
   * ("Says: the treasure is in the Gold chest." / "Test: it is in the Silver chest."). A full-scaffold board shows
   * them under the sign; a light one shows them only after a wrong check. They keep the test world in view so the
   * learner compares instead of remembering. Under a shown mark the rows end in a verdict: `match` (default: the
   * answer is a yes-like option) and `so` (its own verdict line, over the board's fit / unfit words).
   */
  compare?: { says: string; world: string; match?: boolean; so?: string };
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
  /**
   * A case board's row (DrillStep.layout 'cases'): the box this case pretends the treasure is in, by index, and its
   * name in a sentence ("the Gold chest", "Box A").
   */
  case?: { box: number; name: string };
  /**
   * What the rule needs, next to the count on a case board ("exactly 1 true sign"), or on its own line over a row's
   * marks ("Ben is a knave: his words must be false"), so the need and the marks sit side by side.
   */
  needs?: string;
  /** A case board: how many True stamps the rule needs in this case (the `fit-rule` pattern compares the count to it). */
  needTrue?: number;
  /** A case board under the owner's rule: the box whose sign must be the one True stamp (`fit-rule` needs it True). */
  needOn?: number;
  /** Show `needs` only once the row's statement marks are set (a stamps-first board), not over blank marks. */
  needsAfter?: boolean;
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
   * 'cases': a case board (sign puzzles). The scene's boxes are drawn as cards. Tap a box to pretend the treasure is
   * there (a row with that `case`), tap each sign to stamp True or False (the marks with `on`), and the board counts
   * the True stamps. Then Keep (a ring) or Reject (a cross) the box (the row's mark without `on`).
   */
  layout?: 'cases';
  /** A case board that is a twin: the sign it changed, by index, tagged "Changed" on the board. */
  changed?: number;
  /**
   * Open this board right after key-idea card number afterCard (0-based) instead of after the last card, so the Do
   * sits next to its See. Boards keep their order; later cards follow the board.
   */
  afterCard?: number;
  /** Said once every mark is right. */
  done: string;
  /**
   * How much of the reasoning is kept on screen. 'full' (the Do board, the first quiz): the compare facts under
   * every sign, the rule's need next to the count, and the steps of the method. 'light' (later quizzes, thinking
   * boards): the compare facts appear only for a case that had a wrong mark. Default 'light'.
   */
  scaffold?: 'full' | 'light';
  /**
   * Patterns of wrong marks that point to a belief, not a slip, each with the words that teach the distinction.
   * checkDrill looks for them before naming the first wrong mark. See Misconception.
   */
  misconceptions?: Misconception[];
  /** The "I’m confused" questions for this board: one or two, each locating one distinction. See ConfusedQuestion. */
  confused?: ConfusedQuestion[];
  /** The distinction this board exercises (LessonDef.distinctions), when it teaches one on its own. */
  distinction?: string;
  /**
   * The labels this board's compare and because rows, test-world line and "I’m confused" panel use, so a card, line-up,
   * grid, knight or cause board never speaks of signs and tests. All optional; the defaults are the sign words.
   */
  words?: BoardWords;
  /** The method's steps for the strip (DrillStep.scaffold 'full'). A case board has its own default list. */
  steps?: string[];
  /** The strip's title. Default "The steps". */
  stepsLabel?: string;
  /** The small label over an item's board before the answer buttons (Item.workFirst). Default by layout: "First, mark the cases" / "First, mark the board". */
  kicker?: string;
}

/** Labels for the pieces that keep a distinction visible (Distinction.tsx). Every field is optional. */
export interface BoardWords {
  /** The three row labels. Default "Says", "Test", "So". */
  says?: string;
  world?: string;
  so?: string;
  /** The verdict line of a because row. Default "The words fit the test: True." / "The words do not fit the test: False." */
  fit?: string;
  unfit?: string;
  /** The question of a compare row. Default "Do the words fit the test?" */
  ask?: string;
  /** The tag and the note on the test-world line. Defaults: "Test world" and the sign note. */
  worldTag?: string;
  worldNote?: string;
  /** The closing line of the "I’m confused" panel. */
  closing?: string;
  /** The words before DrillRow.needs ("The rule needs"). An empty string shows the need on its own. */
  needs?: string;
  /** The verdict words on a case card's truth rows (TeachCase.words). Default "true" / "false". */
  truth?: string;
  untruth?: string;
}

/**
 * A mix-up that a pattern of wrong marks reveals, with the words that teach the distinction instead of only naming
 * the first wrong mark. The `when` kinds are checked by the engine (drill.ts, diagnose), in the row of the first wrong
 * mark:
 *  - 'fit-rule' (case boards): the stamps are bent to fit the rule: at least one is wrong, the True count equals what
 *    the rule needs (DrillRow.needTrue) and the box is kept, as if the rule were a stamping instruction;
 *  - 'own-true' (case boards): the picked box's own sign is stamped True though its words are false, as if "the treasure
 *    is here" made them true;
 *  - 'own-false' (case boards): the picked box's own sign is stamped False though its words are true;
 *  - 'copied': a row's marks copy another row's right marks, as if a truth carried over from one case to the next;
 *  - 'all-one': every mark of the row is the same value, as if the marks were about the case, not each statement;
 *  - 'verdict-only': every mark but the row's verdict (its last mark; Keep or Reject on a case board) is right: the
 *    result was not compared with the rule;
 *  - 'picks': the listed marks are set to the listed options (`picks`), and at least one is wrong: a pattern the
 *    board's author names, such as every words mark set to what the speaker's kind demands.
 */
export interface Misconception {
  id: string;
  when: 'fit-rule' | 'own-true' | 'own-false' | 'copied' | 'all-one' | 'verdict-only' | 'picks';
  /** For 'picks': mark id -> the option that, together, shows the mix-up. */
  picks?: Record<string, string>;
  /** Only in this row: the pattern is checked only when the first wrong mark is in the row with this id. */
  row?: string;
  /** "You may be treating … as the same thing." Then the distinction, in the lesson's words, with a tiny example. */
  text: string;
}

/**
 * One "I’m confused" question. It is short and has one right option; a wrong (or "Not sure") answer shows `teach`,
 * the distinction in a few sentences, before the learner goes on. Using it counts as help, like a hint.
 */
export interface ConfusedQuestion {
  q: string;
  options: { label: string; right?: boolean }[];
  teach: string;
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
  /**
   * The distinctions this lesson's reasoning depends on: two ideas a learner can merge into one ("where the treasure
   * is" vs "whether a sign's words are true"). Each must be taught before the quiz by a card that names both sides
   * with a contrast picture, and exercised by a board (the contract test checks). See docs/CONTENT_GUIDE.md.
   */
  distinctions?: Distinction[];
  // ---- Pattern Observatory places (see docs/OBSERVATORY.md) ----
  /** A five-phase lesson (See → Explain → Do → Transfer → Review) with the routine strip. */
  routine?: true;
  /** The capability track this place belongs to: 1 Repetition, 2 Change, 3 Relations and space, 4 Evidence. */
  track?: 1 | 2 | 3 | 4;
  /** The levels this place offers, L1 Starter to L4 Prover. */
  levels?: [1 | 2 | 3 | 4, 1 | 2 | 3 | 4];
  /** The plain label for grown-ups: "Repeating units". */
  plain?: string;
  /**
   * Skills, never stop numbers: lesson ids (anywhere in the game) that must be done before this place opens. A
   * place also opens when the diagnostic showed its skill or its primer was passed (StopDef.lessonOrder 'free').
   */
  requires?: string[];
  /** The 3-item primer a learner can take instead of a required lesson (a quick showing of the skill). */
  primer?(rng: Rng): Item[];
  /** The planned pack for a level, when it differs from `practice` (the L1 pack and the contract pack). */
  practiceAt?(rng: Rng, level: 1 | 2 | 3 | 4): Item[];
  /** Four fresh items for a delayed review (stage 1 about 2 days on, 2 a week on, 3 three to four weeks on). */
  review?(rng: Rng, stage: 1 | 2 | 3): Item[];
  /** Six fresh items for the independent check, with a misconception item and an explain item. */
  independent?(rng: Rng): Item[];
}

/** Two ideas that are easy to merge, named apart. */
export interface Distinction {
  id: string;
  /** The first idea, in a few words: "Where the treasure is." */
  a: string;
  /** The second: "Whether a sign’s words are true." */
  b: string;
  /** Taught (card with a contrast picture, and a board) in an earlier lesson of the same stop; this lesson reminds. */
  taughtIn?: string;
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
  /**
   * The stops that must be passed before this one opens, by id. [] opens it from the start. Undefined (every main
   * stop): the stop before it in the list, as before.
   */
  requires?: string[];
  /** 'sequence' (default): a lesson opens after the one before it. 'free': each place opens on its own `requires`. */
  lessonOrder?: 'sequence' | 'free';
  /** Plain names for this stop's skill tags (merged into the Grown-ups view and the CSV reader). */
  skillNames?: Record<string, string>;
  /** A Pattern Observatory ring. */
  observatory?: ObservatoryStop;
}

/** The Pattern Observatory: a ring of places on one track, with the diagnostic items it contributes. */
export interface ObservatoryStop {
  ring: 1 | 2 | 3 | 4;
  track: 1 | 2 | 3 | 4;
  /** The plain label for grown-ups: "Repeating units". */
  plain: string;
  /**
   * One diagnostic item for a track at a level, or null when this ring has none for that track and level (every ring
   * is asked; Clock Tower in Ring 2 serves Track 1 at L3). The diagnostic (8 to 10 items, no timer) starts each
   * track at L1, moves up after two right in a row, and ends the track at the first miss. The item's `lesson` is
   * the place whose skill it shows.
   */
  diagnostic?(rng: Rng, track: 1 | 2 | 3 | 4, level: 1 | 2 | 3 | 4): Item | null;
}
