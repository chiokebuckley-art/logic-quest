/**
 * Shared pieces of the Pattern Observatory scenes (src/engine/scenes/*). Every Observatory scene can be shown one
 * step at a time (`steps`): the key-idea card's button then reveals the next step, and `revealed` tells the
 * renderer how many steps are showing. Each step has a button label and the line the guide says. With Reduce motion
 * on, every frame is still; nothing in these scenes depends on animation.
 */
export interface SceneStep {
  /** The button that shows this step: "Try a block of two". */
  label: string;
  /** What the guide says at this step, read aloud too. */
  say: string;
}

/** One token of a repeating chain: a shape card, a letter, or a captioned sound or movement. */
export interface ChainToken {
  /** The caption, always present and read aloud: "triangle", "clap", "A", "red". */
  label: string;
  shape?: 'circle' | 'square' | 'triangle';
  color?: 'red' | 'blue' | 'yellow';
  letter?: string;
  sound?: 'clap' | 'tap' | 'stomp' | 'high' | 'low' | 'snap';
}

/** One tile of a matrix puzzle: a count of a shape in a colour. */
export interface MatrixCell {
  count: number;
  shape: 'circle' | 'square' | 'triangle';
  color: 'red' | 'blue' | 'yellow';
}
