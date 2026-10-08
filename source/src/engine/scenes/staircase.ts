/** Ring 2 (Rule Rise): a growing pattern built from a stated construction, or a sequence under a stated rule. */
import type { SceneStep } from './common';

/** One tile of a step: the center tile (gold), a fixed end tile, a kept tile, or a tile this step added (it glows). */
export type StairCell = 'centre' | 'end' | 'old' | 'new';

export interface StaircaseScene {
  kind: 'staircase';
  /** The construction or rule, stated: "Each step keeps the center tile and adds one pair." Always shown. */
  construction: string;
  /** The tag before the construction: "Construction" (default) or "Rule". */
  tag?: string;
  /** Steps in order. Each cell is drawn as a tile: centre (gold), end (fixed end tile), old (kept), new (glows). */
  rows: { step: number; cells: StairCell[] }[];
  /** The step / count table beside the picture. null = a blank the learner fills. */
  table?: { step: number; count: number | null }[];
  /** The table's two headings: ["Step", "Tiles"] by default, ["Term", "Value"] for a sequence. */
  head?: [string, string];
  /** A row's name, one and many: ["link", "links"] draws "2 links" instead of "Step 2". */
  rowName?: [string, string];
  /** The jump between terms, said in words beside the table: "add 3". */
  jump?: string;
  /** How the tiles are drawn: square tiles (default), round beads, or seats around tables. */
  skin?: 'tiles' | 'beads' | 'seats';
  /**
   * What each reveal shows, by the number of steps showing (index 0 = before any step): the rows and table entries
   * drawn so far. Absent: everything shows at once.
   */
  reveal?: { rows: number; table: number }[];
  steps?: SceneStep[];
}
