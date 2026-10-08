/** Ring 2 (Rule Rise): a function machine with inputs and outputs. */
import type { SceneStep } from './common';

export interface MachineRow {
  /** null = the input is the blank (running the machine backwards). */
  input: number | null;
  /** null = not fed yet (a blank). */
  output: number | null;
  /** The row shows once this many steps are showing (default 0). */
  at?: number;
  /** The output shows once this many steps are showing (before that, a blank). Default: with the row. */
  outAt?: number;
  /** The input shows once this many steps are showing (a backwards run). Default: with the row. */
  inAt?: number;
}

export interface MachineScene {
  kind: 'machine';
  /** Rows of the in/out table. */
  rows: MachineRow[];
  /** Candidate rules, in words: ["add 2", "double"]. Drawn as lit labels on the machine. */
  candidates?: string[];
  /** A candidate crossed out once this many steps are showing: { rule: "add 2", at: 2 }. */
  ruledOut?: { rule: string; at: number }[];
  /** A test worked in the head: the input and each candidate's output, in candidate order, shown from step `at`. */
  tries?: { input: number; outs: number[]; at?: number }[];
  /** What the prompt states: "This machine uses one of these two rules." */
  stated?: string;
  /** The rule as words on the machine once known: "times 2, then add 1". */
  rule?: string;
  steps?: SceneStep[];
}
