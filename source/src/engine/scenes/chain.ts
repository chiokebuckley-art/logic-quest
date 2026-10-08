/** Ring 1 (First Lights): a chain made by repeating a block. */
import type { ChainToken, SceneStep } from './common';

/**
 * What a chain picture shows at one step of a worked example. A stepped chain (`steps`) starts from the bare chain;
 * each revealed step shows its own frame (`frames[i]` for step i), so a glow box can try a long block, then a short
 * one, then box the unit, or walk block by block to a break. Everything is plain data; every frame is a still.
 */
export interface ChainFrame {
  /** The chain in other pieces at this step (Echo Bells: the same chain played on bells, then claps, then letters). */
  tokens?: ChainToken[];
  /** The unit box (start index, length); its later copies are tinted so the repeats show. */
  unit?: { start: number; len: number };
  /** A block being tried, drawn as a dashed box: ok = it fits every piece. */
  tryUnit?: { start: number; len: number; ok: boolean };
  /** How many pieces (from the start) have been checked and fit, drawn with a teal bar under each. */
  checked?: number;
  /** The index where a tried block or the stated rule fails, drawn with a "Breaks" flag. */
  miss?: number;
  /** The index that breaks the stated rule (Repair Bench), flagged "Look again". */
  broken?: number;
}

export interface ChainScene {
  kind: 'chain';
  /** The chain, left to right. A blank position (`blanks`) is drawn as a "?" slot. */
  tokens: ChainToken[];
  /** What the prompt states about the chain: "This chain is made by repeating a block." Always shown. */
  stated: string;
  /** The box drawn around the repeating unit (start index, length). */
  unit?: { start: number; len: number };
  /** A block being tried against the chain, drawn as a dashed box: ok = it repeats all the way. */
  tryUnit?: { start: number; len: number; ok: boolean };
  /** Positions drawn as empty slots to fill. */
  blanks?: number[];
  /** The position that breaks the stated rule (Repair Bench), drawn flagged. */
  broken?: number;
  /** Spare tokens the learner can tap into a slot. */
  tray?: ChainToken[];
  /** Show position numbers under the tokens (1-based). Default true. */
  numbered?: boolean;
  /** Pieces checked from the start (see ChainFrame.checked). */
  checked?: number;
  /** Where a tried block fails (see ChainFrame.miss). */
  miss?: number;
  /** One frame per step (same length as `steps`): what the picture shows once that step is revealed. */
  frames?: ChainFrame[];
  steps?: SceneStep[];
}
