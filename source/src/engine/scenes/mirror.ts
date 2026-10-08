/**
 * Ring 3 (Deep Sky): a picture on a dot grid, folded or turned. The fold line runs down the middle (`fold: 'v'`, the
 * left half is the first half) or across it (`fold: 'h'`, a pool: the top half is the first half, the water below).
 * Every frame is a still; a stepped scene (`steps`) starts from the bare picture and shows `frames[i]` once step i is
 * revealed.
 */
import type { SceneStep } from './common';

/** One candidate half, drawn small and lettered under the picture: the cells of the second half alone. */
export interface MirrorCandidate {
  /** "A", "B", "C": the letter the choice labels use. */
  name: string;
  /**
   * The second half's cells, step 1 (next to the fold) first: for a fold down the middle, rows of steps (left to right
   * = step 1 to step D); for a fold across, rows by step (top row = step 1).
   */
  cells: string[];
}

/** What the picture shows once a step is revealed. */
export interface MirrorFrame {
  cells?: string[];
  pairs?: [number, number][];
  turned?: boolean;
  candidates?: MirrorCandidate[];
}

export interface MirrorScene {
  kind: 'mirror';
  /**
   * Rows of cells, all the same length: '.' empty, '#' a dot, '?' a spot to decide (lettered a, b, c… in reading
   * order), '-' a spot not drawn yet.
   */
  cells: string[];
  /** The fold line: vertical (between the two halves) or horizontal. */
  fold?: 'v' | 'h';
  /** The picture on the right (or below) is a turn of the left, not a reflection. Only a worked example says so. */
  turned?: boolean;
  /** Pairs of cell indexes (row * width + col) drawn as partners across the fold. */
  pairs?: [number, number][];
  /** Number the steps from the fold line (1 = next to it) along the grid's edge. */
  ruler?: boolean;
  /** Candidate second halves, drawn small and lettered under the picture. */
  candidates?: MirrorCandidate[];
  /** A caption under the picture. */
  caption?: string;
  /** One frame per step (same length as `steps`). */
  frames?: MirrorFrame[];
  steps?: SceneStep[];
}
