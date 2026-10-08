/**
 * Ring 4 (Proof Lantern): a circle with points joined by chords, or a claim card, and a claim about the pattern.
 *
 * Two pictures share this kind:
 *  - the circle (points 1-6): every pair of points joined by a chord, the region count under it. The count shown is
 *    always the drawing's own count (regionsOf), and a 31 label is refused whenever three chords meet (acceptance
 *    check 9; see puzzles/observatory/lantern.ts);
 *  - the claim card (points 0): no circle, only what is stated, rows of numbers or findings, claims with their
 *    verdicts, or the steps of a reason.
 *
 * A stepped lantern changes its picture at each step (`frames`): frame i is merged over the scene and the frames
 * before it once step i shows. Every frame is a still picture; nothing depends on animation.
 */
import type { SceneStep } from './common';

/** A claim's verdict: proved (a reason covers every case), a good guess (only examples), or false (a case breaks it). */
export type LanternStatus = 'proved' | 'tentative' | 'false';

/** One row of a claim card: a sequence, an input and its outputs, a finding, or a list of terms. */
export interface LanternRow {
  /** The row's name, short: "Input 3", "Terms", "Seen". */
  label: string;
  /** The entries, as short words or numbers: "1", "odd", "add 2 gives 5". */
  cells: string[];
  /** A verdict at the end of the row: "fits", "breaks it", "says nothing". */
  tag?: string;
  /** Glow the row: the counterexample, or the test that tells two rules apart. */
  lit?: boolean;
}

/** One claim on a claim card, with its verdict once it is shown. */
export interface LanternClaim {
  text: string;
  status?: LanternStatus;
}

/** One step of a reason chain: lit once it has been checked. An unlit step shows only its number. */
export interface LanternLink {
  text: string;
  lit?: boolean;
}

/** What one step of a stepped lantern changes. Arrays replace the scene's arrays whole. */
export interface LanternFrame {
  points?: number;
  chords?: boolean;
  regular?: boolean;
  regions?: number;
  hideCount?: boolean;
  sequence?: number[];
  claim?: string;
  status?: LanternStatus;
  rows?: LanternRow[];
  claims?: LanternClaim[];
  chain?: LanternLink[];
}

export interface LanternScene {
  kind: 'lantern';
  /** Points on the circle (1-6). 0: no circle, a claim card only. */
  points: number;
  /** Draw every chord between the points. */
  chords: boolean;
  /** Place the points as a regular polygon (three long chords meet at the centre for 6 points). */
  regular?: boolean;
  /** The region count shown, if any. A renderer must refuse a 31 label when three chords meet (see validator). */
  regions?: number;
  /** Hide the region count: the question asks about it. */
  hideCount?: boolean;
  /** The construction or the observation, in words: "Start at 1 and add 3 each time." */
  stated?: string;
  /** The kind of pattern: constructed (it comes with its rule) or observed (only what was seen). */
  pattern?: 'constructed' | 'observed';
  /** The sequence so far: [1, 2, 4, 8, 16]. */
  sequence?: number[];
  /** The claim under the lantern: "The next one is 32." */
  claim?: string;
  status?: LanternStatus;
  /** Rows of a claim card (sequences, inputs, findings, terms). */
  rows?: LanternRow[];
  /** Several claims, each with its verdict once shown. */
  claims?: LanternClaim[];
  /** The steps of a reason, lit one at a time. */
  chain?: LanternLink[];
  steps?: SceneStep[];
  /** frames[i]: what changes once steps[i] shows (merged in order over the scene). */
  frames?: LanternFrame[];
}
