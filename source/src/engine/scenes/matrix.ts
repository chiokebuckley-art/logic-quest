/**
 * Ring 3 (Deep Sky): a 2×2 or 3×3 matrix with a row rule and a column rule. Tiles are shape tiles (`cells`: a count of
 * a shape in a color, the color always written under the tile) or words (`tiles`, a timetable: days down the side,
 * subjects across the top). Every frame is a still; a stepped scene shows `frames[i]` once step i is revealed.
 */
import type { MatrixCell, SceneStep } from './common';

/** A tile tried in the gap, with what each rule says about it. */
export interface MatrixTry {
  /** A shape tile, or a word tile for a timetable. */
  cell?: MatrixCell;
  text?: string;
  row: 'fits' | 'breaks';
  col: 'fits' | 'breaks';
}

/** What the picture shows once a step is revealed. */
export interface MatrixFrame {
  glow?: 'rows' | 'cols' | 'none';
  /** A tile tried in the gap. */
  trial?: MatrixTry;
  /** The gap filled in (the answer, once worked out). */
  filled?: MatrixCell;
  filledText?: string;
}

export interface MatrixScene {
  kind: 'matrix';
  size: 2 | 3;
  /** cells[row][col]; null is the missing tile. Empty for a word grid (see `tiles`). */
  cells: (MatrixCell | null)[][];
  /** A word grid instead of shapes: tiles[row][col], null is the missing tile. */
  tiles?: (string | null)[][];
  /** Row and column headings of a word grid: ["Monday", …] and ["Math", …]. */
  heads?: { rows: string[]; cols: string[] };
  /** The rules in words: "Each row has its own color." */
  rowRule?: string;
  colRule?: string;
  /** What every tile shares: "Every tile has 2 shapes." */
  allRule?: string;
  /** The tile to find. */
  missing?: [number, number];
  /** Light the rows or the columns, to show one rule at a time. */
  glow?: 'rows' | 'cols';
  /** One frame per step (same length as `steps`). */
  frames?: MatrixFrame[];
  steps?: SceneStep[];
}
