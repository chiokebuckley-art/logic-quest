/**
 * Ring 3 (Deep Sky): an analogy drawn as a plank between two pairs. A is to B as C is to D. The link word sits on the
 * plank and must carry across to the second pair. Every frame is a still; a stepped scene shows `frames[i]` once step
 * i is revealed.
 */
import type { SceneStep } from './common';

/** A shape card on a pier, drawn above its words. */
export interface BridgeCard {
  shape: 'circle' | 'square' | 'triangle';
  color: 'red' | 'blue' | 'yellow';
  size: 'big' | 'small';
}

/** What the picture shows once a step is revealed. */
export interface BridgeFrame {
  /** Show the link on the plank (false: a "?" on the plank). */
  link?: boolean;
  /** The fourth term, shown on its pier. */
  d?: string;
  dCard?: BridgeCard;
  /** A look-alike drawn beside the bridge, crossed out, with its words. */
  look?: string;
}

export interface BridgeScene {
  kind: 'bridge';
  a: string;
  b: string;
  /** The link written on the plank: "opens". */
  relation: string;
  /** The link is not shown yet: the plank carries a "?" (name the link before choosing). */
  hidden?: boolean;
  c: string;
  /** The fourth term, once revealed. */
  d?: string;
  /** Shape cards drawn on the piers (a card analogy). */
  cards?: { a: BridgeCard; b: BridgeCard; c: BridgeCard; d?: BridgeCard };
  /** Candidate fourth terms shown under the bridge. */
  options?: string[];
  /** One frame per step (same length as `steps`). */
  frames?: BridgeFrame[];
  steps?: SceneStep[];
}
