/**
 * Pattern Observatory, Ring 3: Deep Sky (Track 3, Relations and space). Places:
 *
 *  l1 Mirror Pool    (L1–L2, needs nothing)              a fold keeps every dot's partner (same line, same step); a
 *                                                         turn swaps the ends of the line; finish a half; letters,
 *                                                         arrows and house fronts in a mirror or a pool
 *  l2 Matrix Gate    (L2–L3, needs s2.l1 or its primer)   a missing tile must fit the row rule and the column rule; a
 *                                                         one-rule grid first, then two rules; a camp timetable
 *  l3 Analogy Bridge (L1–L3, needs nothing)               keep the link, not the look: a change on cards, opposites
 *                                                         across kinds of things, links in words; new domains
 *
 * Every place runs See (stepped pictures) → Explain → Do (a faded item, then the same task with no frame) → Transfer
 * → Review. Every answer, verdict and picture comes from ../engine/puzzles/observatory/{mirror,matrix,analogy}.ts.
 */
import {
  cardLinkItem, holds, linkById, linkTransferItem, linkWhyItem, oppositeItem, sentence, wordLinkItem, type Card,
} from '../engine/puzzles/observatory/analogy';
import {
  SHAPE_DIMS, answerOf, breaksOf, gridOneItem, gridScene, gridTwoItem, gridWhyItem, lineHas, optionsOf, oddOneItem, sharedFeatureItem,
  sortGroupItem, tileAt, tileName, tileWords, timetableItem, toCell, type Grid, type Option,
} from '../engine/puzzles/observatory/matrix';
import {
  L1, L2, L3, STOP, askLetters, cap, cellOf, distinctSet, finishHalfItem, foldOrTurnItem, foldTransferItem, foldWhyItem, gridIs,
  hasDot, indexOf, lineOf, matchHalfItem, moveDot, moved, picture, sameDots, sortDots, spotOf, type Dot, type Half, type Move,
} from '../engine/puzzles/observatory/mirror';
import { createRng } from '../engine/rng';
import type { BridgeScene } from '../engine/scenes/bridge';
import type { MatrixScene } from '../engine/scenes/matrix';
import type { MirrorScene } from '../engine/scenes/mirror';
import type { DrillMark, DrillStep, IdeaCard, Item, LessonDef, Rng, StopDef } from '../engine/types';

const ids = (items: Item[], prefix: string): Item[] => items.map((it, i) => ({ ...it, id: `${prefix}${i + 1}` }));
const asPhase = (it: Item, phase: 'review'): Item => ({ ...it, phase, ...(it.meta ? { meta: { ...it.meta, phase } } : {}) });
const YES_NO_OPTS = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }];
const FITS_OPTS = [{ id: 'fits', label: 'Fits' }, { id: 'breaks', label: 'Breaks' }];

/** A worked example must hold the invariant every generated half holds: its three moves are three different pictures. */
function half(fold: 'v' | 'h', D: number, dots: Dot[]): Half {
  const h: Half = { fold, D, S: 3, dots: sortDots(dots) };
  const [r, t, s] = (['reflect', 'turn', 'slide'] as Move[]).map((m) => moved(h, m));
  if (sameDots(r, t) || sameDots(r, s) || sameDots(t, s)) throw new Error('a worked half whose moves coincide');
  return h;
}
const pairsOf = (h: Half, dots: readonly Dot[], m: Move): [number, number][] => dots.map((d) => [indexOf(h, d, 0), indexOf(h, moveDot(h, d, m), 1)]);

// =====================================================================================================================
// Mirror Pool (s16.l1)
// =====================================================================================================================

/** Card 1 and 2: one half, folded and then turned. */
const W1 = half('v', 3, [{ k: 1, j: 1 }, { k: 3, j: 2 }, { k: 2, j: 3 }]);
const lineCap = (h: Half, d: Dot) => cap(spotOf(h.fold, d).replace(/^the /, ''));

function foldScene(): MirrorScene {
  const h = W1;
  const full = picture(h, { dots: moved(h, 'reflect') });
  const meets = h.dots.map((d) => `${lineCap(h, d)} meets ${spotOf(h.fold, d)}.`).join(' ');
  return {
    kind: 'mirror',
    cells: picture(h, { hidden: true }),
    fold: 'v',
    ruler: true,
    steps: [
      { label: 'See the left half', say: `The left half has ${h.dots.length} dots. Count each one’s steps from the fold line. Step 1 is right next to it.` },
      { label: 'Fold it over', say: 'Fold the page along the line. Each dot lands on the right, in the same row, at the same step.' },
      { label: 'Check every dot', say: `${meets} Every dot has its partner.` },
    ],
    frames: [{}, { cells: full, pairs: pairsOf(h, h.dots, 'reflect') }, { cells: full, pairs: pairsOf(h, h.dots, 'reflect') }],
  };
}

function turnScene(): MirrorScene {
  const h = W1;
  const turned = moved(h, 'turn');
  const full = picture(h, { dots: turned });
  const d = h.dots.find((x) => x.j !== 2 && !hasDot(turned, x))!;
  const t = moveDot(h, d, 'turn');
  return {
    kind: 'mirror',
    cells: picture(h, { hidden: true }),
    fold: 'v',
    ruler: true,
    steps: [
      { label: 'Turn it instead', say: 'Spin the left half halfway around the middle of the line. It lands on the right.' },
      { label: 'Follow one dot', say: `The dot in ${spotOf(h.fold, d)} lands in ${spotOf(h.fold, t)}. Top and bottom swapped.` },
      { label: 'Decide', say: `On the right, ${spotOf(h.fold, d)} is empty. That dot lost its partner, so this is a turn.` },
    ],
    frames: [{ cells: full, turned: true }, { cells: full, turned: true, pairs: [[indexOf(h, d, 0), indexOf(h, t, 1)]] }, { cells: full, turned: true, pairs: [[indexOf(h, d, 0), indexOf(h, t, 1)]] }],
  };
}

/** Card 3 and board 1: a turned picture where one dot keeps a partner (the middle row), so every dot must be checked. */
const W2 = half('v', 3, [{ k: 1, j: 1 }, { k: 2, j: 1 }, { k: 2, j: 2 }]);
const W2_CELLS = picture(W2, { dots: moved(W2, 'turn') });
const W2_FIRST = W2.dots.find((d) => d.j === 2)!;
function checkScene(): MirrorScene {
  const h = W2;
  const pair: [number, number][] = [[indexOf(h, W2_FIRST, 0), indexOf(h, W2_FIRST, 1)]];
  return {
    kind: 'mirror',
    cells: W2_CELLS,
    fold: 'v',
    ruler: true,
    steps: [
      { label: 'Check one dot', say: `${lineCap(h, W2_FIRST)}: the right half has a dot there too. That dot has its partner.` },
      { label: 'Keep checking', say: 'One partner does not decide it. A turn can leave a middle row dot in place. Check every dot.' },
    ],
    frames: [{ pairs: pair }, { pairs: pair }],
  };
}
const CHECK_SCENE = checkScene();

const partnerMark = (h: Half, cells: readonly string[], d: Dot, given = false, full = false): DrillMark => {
  const { r, c } = cellOf(h, d, 1);
  const there = cells[r][c] === '#';
  return {
    id: `p-${d.j}-${d.k}`,
    label: 'A partner across the line?',
    options: YES_NO_OPTS,
    answer: there ? 'yes' : 'no',
    why: there
      ? { no: `Not yet. Look on the right, in ${spotOf(h.fold, d)}. There is a dot there.` }
      : { yes: `Not yet. Look on the right, in ${spotOf(h.fold, d)}. That spot is empty.` },
    ...(given ? { given: true } : {}),
    ...(full ? { compare: { says: `Left: a dot in ${spotOf(h.fold, d)}.`, world: `Look right: ${spotOf(h.fold, d)}.` } } : {}),
  };
};

function checkBoard(): DrillStep {
  const h = W2;
  const rest = h.dots.filter((d) => d !== W2_FIRST);
  const verdict = gridIs(W2_CELLS, 'v', 'reflect') ? 'reflect' : gridIs(W2_CELLS, 'v', 'turn') ? 'turn' : 'slide';
  const right = moved(h, verdict);
  const kept = h.dots.filter((d) => hasDot(right, d));
  const lost = h.dots.filter((d) => !hasDot(right, d));
  const names = (ds: Dot[]) => ds.map((d) => spotOf(h.fold, d)).join(' and ');
  return {
    id: `${L1}-do`,
    title: 'Check every dot',
    body: ['This is the picture from the example. Check each dot on the left: is its partner on the right?', 'Then decide: a reflection or a turn?'],
    scene: CHECK_SCENE,
    afterCard: 2,
    scaffold: 'full',
    steps: ['Pick a dot on the left. Count its steps.', 'Look right, in the same row, at the same step.', 'Every dot has a partner: a reflection. Rows swapped: a turn.'],
    words: { says: 'Left', world: 'Look', so: 'So', ask: 'Is a partner there?' },
    rows: [
      { id: 'worked', label: `${lineCap(h, W2_FIRST)}, done for you`, marks: [partnerMark(h, W2_CELLS, W2_FIRST, true)], note: 'Yes: a dot sits there too.' },
      ...rest.map((d) => ({ id: `dot-${d.j}-${d.k}`, label: lineCap(h, d), marks: [partnerMark(h, W2_CELLS, d, false, true)] })),
      {
        id: 'fold',
        label: 'The picture',
        marks: [{
          id: 'fold',
          label: 'Fold: reflection or turn?',
          options: [{ id: 'reflect', label: 'Reflection' }, { id: 'turn', label: 'Turn' }],
          answer: verdict,
          why: verdict === 'turn'
            ? { reflect: `Not yet. The dots in ${names(lost)} have no partner in the same row. Top and bottom swapped, so it is a turn.` }
            : { turn: 'Not yet. Every dot has its partner in the same row, so it is a reflection.' },
        }],
      },
    ],
    done: verdict === 'turn'
      ? `Right. Only the dot in ${names(kept)} kept a partner in its row. Top and bottom swapped, so this picture is a turn.`
      : 'Right. Every dot has its partner, so this picture is a reflection.',
  };
}

/** Card 4: a pool, a fold across the picture. */
const W3 = half('h', 2, [{ k: 1, j: 1 }, { k: 2, j: 1 }, { k: 2, j: 2 }]);
function poolScene(): MirrorScene {
  const h = W3;
  const full = picture(h, { dots: moved(h, 'reflect') });
  const d = h.dots[0];
  return {
    kind: 'mirror',
    cells: picture(h, { hidden: true }),
    fold: 'h',
    ruler: true,
    steps: [
      { label: 'See the water line', say: 'The line is the edge of a still pool. The picture above it is the top half.' },
      { label: 'Reflect it', say: 'In the water, each dot lands in the same column, at the same step below the line.' },
      { label: 'Compare with a turn', say: `A turn would move the dot in ${spotOf('h', d)} to the ${lineOf('h', moveDot(h, d, 'turn').j)}. The water keeps it in its own column.` },
    ],
    frames: [{}, { cells: full, pairs: pairsOf(h, h.dots, 'reflect') }, { cells: full, pairs: pairsOf(h, h.dots, 'reflect') }],
  };
}

/** Card 5 and board 2: finish a half. One partner is drawn; five spots to decide, spot a worked. */
const W4 = half('v', 3, [{ k: 1, j: 2 }, { k: 2, j: 1 }, { k: 3, j: 1 }]);
const W4_GIVEN: Dot[] = [{ k: 2, j: 1 }];
const W4_WANT = moved(W4, 'reflect');
const W4_ASK: Dot[] = [...W4_WANT.filter((d) => !hasDot(W4_GIVEN, d)), ...moved(W4, 'turn').filter((d) => !hasDot(W4_WANT, d)), { k: 1, j: 1 }];
const W4_LETTERS = askLetters(W4, W4_ASK);
function finishScene(): MirrorScene {
  const h = W4;
  const base = picture(h, { dots: W4_GIVEN, ask: W4_ASK });
  const first = W4_LETTERS[0];
  const filled = hasDot(W4_WANT, first.dot);
  const after = picture(h, { dots: filled ? [...W4_GIVEN, first.dot] : W4_GIVEN, ask: W4_ASK.filter((d) => d !== first.dot) });
  return {
    kind: 'mirror',
    cells: base,
    fold: 'v',
    ruler: true,
    steps: [
      { label: `Check spot ${first.letter}`, say: `Spot ${first.letter} is ${spotOf('v', first.dot)}. On the left, that spot is ${hasDot(h.dots, first.dot) ? 'a dot' : 'empty'}. So spot ${first.letter} ${filled ? 'needs a dot' : 'stays empty'}.` },
      { label: 'Your turn', say: `Check spots ${W4_LETTERS[1].letter} to ${W4_LETTERS[W4_LETTERS.length - 1].letter} the same way, on the board.` },
    ],
    frames: [{ cells: after }, { cells: after }],
  };
}
const FINISH_SCENE = finishScene();

function finishBoard(): DrillStep {
  const h = W4;
  const spotMark = ({ dot, letter }: { dot: Dot; letter: string }, given = false): DrillMark => {
    const need = hasDot(W4_WANT, dot);
    const turn = hasDot(moved(h, 'turn'), dot);
    return {
      id: `spot-${letter}`,
      label: `Spot ${letter}`,
      options: [{ id: 'dot', label: 'Dot' }, { id: 'empty', label: 'Empty' }],
      answer: need ? 'dot' : 'empty',
      why: need
        ? { empty: `Not yet. The left half has a dot in ${spotOf('v', dot)}. Its partner goes in spot ${letter}.` }
        : { dot: `Not yet. The left half has no dot in ${spotOf('v', dot)}.${turn ? ' A turn puts a dot here, but a fold does not.' : ''} Spot ${letter} stays empty.` },
      ...(given ? { given: true } : {}),
    };
  };
  const [first, ...rest] = W4_LETTERS;
  return {
    id: `${L1}-do2`,
    title: 'Finish the half',
    body: ['This picture is made by a fold. Mark each spot: does it need a dot?', 'Check its partner spot on the left: same row, same step.'],
    scene: FINISH_SCENE,
    rows: [
      { id: 'worked', label: `Spot ${first.letter}, done for you`, marks: [spotMark(first, true)] },
      { id: 'spots', label: `Spots ${rest[0].letter} to ${rest[rest.length - 1].letter}`, marks: rest.map((x) => spotMark(x)) },
    ],
    done: `Right. Spots ${W4_LETTERS.filter((x) => hasDot(W4_WANT, x.dot)).map((x) => x.letter).join(' and ')} need dots. The spots a turn would use stay empty.`,
  };
}

const MIRROR_IDEAS: IdeaCard[] = [
  {
    title: 'A fold makes partners',
    scene: foldScene(),
    body: [
      'Fold a picture along a line. The new half is a reflection of the first half. The line is the fold line, or mirror line.',
      'Each dot has a partner across the line. The partner is in the same row, at the same step from the line.',
    ],
  },
  {
    title: 'A turn is different',
    scene: turnScene(),
    body: ['A turn spins a half around a point. Here the point is the middle of the fold line.', 'Each dot keeps its step from the line. But top and bottom swap, so a dot can lose its partner.'],
  },
  {
    title: 'Check every dot',
    scene: CHECK_SCENE,
    body: ['To tell a reflection from a turn, check each dot. Is its partner across the line, in the same row, at the same step?', 'Every dot has one: a reflection. Some rows swapped: a turn.'],
  },
  {
    title: 'A pool reflects too',
    scene: poolScene(),
    body: ['A still pool works like a fold across the picture. The water shows a reflection.', 'Now the steps go down from the line, and each dot keeps its column.'],
  },
  {
    title: 'Finish a half',
    scene: FINISH_SCENE,
    body: ['When a picture is made by a fold, you can finish its half. Each dot on the left needs its partner on the right.', 'A spot with no dot on the left stays empty, even if a turn would fill it.'],
  },
];

// =====================================================================================================================
// Matrix Gate (s16.l2)
// =====================================================================================================================

/** The worked grids (value indexes: count 1, 2, 3; shape circle, square, triangle; color red, blue, yellow). */
const M1: Grid = { kind: 'shapes', size: 2, dims: SHAPE_DIMS, col: { dim: 'color', vals: [0, 1] }, fixed: { count: 1, shape: 0 }, gap: [1, 1] };
const M2: Grid = { kind: 'shapes', size: 3, dims: SHAPE_DIMS, row: { dim: 'color', vals: [0, 1, 2] }, col: { dim: 'shape', vals: [0, 1, 2] }, fixed: { count: 1 }, gap: [2, 1] };
const M4: Grid = { kind: 'shapes', size: 3, dims: SHAPE_DIMS, row: { dim: 'count', vals: [2, 0, 1] }, col: { dim: 'color', vals: [1, 2, 0] }, fixed: { shape: 2 }, gap: [0, 2] };

const tile = (g: Grid, t: ReturnType<typeof answerOf>) => tileWords(g, t);
/** The options of a worked grid, made the same way as an item's (a fixed seed, so the cards never change). */
const optsOf = (g: Grid, seed: number): Option[] => optionsOf(g, createRng(seed));

function oneRuleScene(): MatrixScene {
  const g = M1;
  const ans = answerOf(g);
  return {
    ...gridScene(g),
    steps: [
      { label: 'Read the rule', say: 'The rule: each column has its own color. So look down each column.' },
      { label: 'Find the gap’s column', say: `The gap is in column 2. ${lineHas(g, 'col', 1)}` },
      { label: 'Fill the gap', say: `Every tile has ${toCell(ans).count} ${toCell(ans).shape}s. So the gap takes ${tile(g, ans)}, not the ${tile(g, tileAt(g, 1, 0))} beside it.` },
    ],
    frames: [{ glow: 'cols' }, { glow: 'cols' }, { glow: 'cols', filled: toCell(ans) }],
  };
}

function twoRuleScene(): MatrixScene {
  const g = M2;
  return {
    ...gridScene(g),
    steps: [
      { label: 'Light the rows', say: `Rule 1: each row has its own color. ${[0, 1, 2].map((r) => lineHas(g, 'row', r)).join(' ')}` },
      { label: 'Light the columns', say: `Rule 2: each column has its own shape. ${[0, 1, 2].map((c) => lineHas(g, 'col', c)).join(' ')}` },
      { label: 'Find the gap', say: `The gap sits in row ${g.gap[0] + 1} and column ${g.gap[1] + 1}. Work out what each rule needs, on the board.` },
    ],
    frames: [{ glow: 'rows' }, { glow: 'cols' }, { glow: 'none' }],
  };
}
const TWO_SCENE = twoRuleScene();

const featureMark = (id: string, label: string, g: Grid, dim: string, want: number, why: (v: string) => string, compare?: { says: string; world: string }): DrillMark => {
  const d = g.dims.find((x) => x.id === dim)!;
  const options = d.values.map((v) => ({ id: v, label: dim === 'shape' ? `${v}s` : v }));
  return { id, label, options, answer: d.values[want], why: Object.fromEntries(d.values.filter((_, i) => i !== want).map((v) => [v, why(v)])), ...(compare ? { compare } : {}) };
};

function twoRuleBoard(): DrillStep {
  const g = M2;
  const [r, c] = g.gap;
  const ans = answerOf(g);
  const opts = optsOf(g, 16);
  return {
    id: `${L2}-do`,
    title: 'Pass both rules',
    body: ['This is the grid from the example. Mark what each rule needs for the gap.', 'Then mark the tile that passes both rules.'],
    scene: TWO_SCENE,
    afterCard: 1,
    scaffold: 'full',
    steps: ['Read the row rule, and look along the gap’s row.', 'Read the column rule, and look down the gap’s column.', 'Pick the tile that passes both.'],
    words: { says: 'Rule', world: 'Look', so: 'So', ask: 'What does it need?' },
    rows: [
      { id: 'row', label: `Row ${r + 1}`, marks: [featureMark('row-color', 'Which color?', g, 'color', ans.color, (v) => `Not yet. ${lineHas(g, 'row', r)} Not ${v}.`, { says: 'Each row has its own color.', world: `Look along row ${r + 1}.` })] },
      { id: 'col', label: `Column ${c + 1}`, marks: [featureMark('col-shape', 'Which shape?', g, 'shape', ans.shape, (v) => `Not yet. ${lineHas(g, 'col', c)} Not ${v}s.`, { says: 'Each column has its own shape.', world: `Look down column ${c + 1}.` })] },
      { id: 'count', label: 'Every tile', marks: [featureMark('count', 'How many shapes?', g, 'count', ans.count, (v) => `Not yet. Count the shapes in any tile: ${toCell(ans).count}, not ${v}.`)] },
      {
        id: 'gap',
        label: 'The gap',
        marks: [{
          id: 'gap',
          label: 'Which tile?',
          options: opts.map((o) => ({ id: o.id, label: cap(tile(g, o.tile)) })),
          answer: 'answer',
          why: Object.fromEntries(opts.filter((o) => o.id !== 'answer').map((o) => [o.id, `Not yet. ${cap(tileName(g, o.tile))} ${o.verdict === 'both' ? 'breaks both rules' : `breaks the ${o.verdict === 'row' ? 'row' : 'column'} rule`}. The gap takes ${tile(g, ans)}.`])),
        }],
      },
    ],
    done: `Right. Row ${r + 1} needs ${toCell(ans).color}, and column ${c + 1} needs ${toCell(ans).shape}s: ${tile(g, ans)}.`,
  };
}

function bothScene(): MatrixScene {
  const g = M2;
  const ans = answerOf(g);
  const opts = optsOf(g, 16);
  const tryOf = (o: Option) => ({ cell: toCell(o.tile), row: breaksOf(g, o.tile).row ? ('breaks' as const) : ('fits' as const), col: breaksOf(g, o.tile).col ? ('breaks' as const) : ('fits' as const) });
  const beside = opts.find((o) => o.id === 'beside')!;
  const above = opts.find((o) => o.id === 'above')!;
  const say = (o: Option) => {
    const b = breaksOf(g, o.tile);
    return `${cap(tile(g, o.tile))}: ${b.row ? 'it breaks the row rule' : 'it fits the row rule'}, and ${b.col ? 'it breaks the column rule' : 'it fits the column rule'}.`;
  };
  return {
    ...gridScene(g),
    steps: [
      { label: `Try ${tile(g, beside.tile)}`, say: `${say(beside)} Checking only the row would let it slip in.` },
      { label: `Try ${tile(g, above.tile)}`, say: say(above) },
      { label: 'Pass both', say: `Only ${tileName(g, ans)} passes both rules.` },
    ],
    frames: [{ trial: tryOf(beside) }, { trial: tryOf(above) }, { filled: toCell(ans) }],
  };
}

function checkTilesScene(): MatrixScene {
  const g = M4;
  const opts = optsOf(g, 7);
  const first = opts.find((o) => o.id === 'beside')!;
  const b = breaksOf(g, first.tile);
  return {
    ...gridScene(g),
    steps: [
      { label: `Check ${tile(g, first.tile)}`, say: `${lineHas(g, 'row', g.gap[0])} It ${b.row ? 'breaks' : 'fits'} the row rule. ${lineHas(g, 'col', g.gap[1])} It ${b.col ? 'breaks' : 'fits'} the column rule.` },
      { label: 'Your turn', say: 'A wrong tile can break one rule or both. Check the other tiles on the board.' },
    ],
    frames: [{ trial: { cell: toCell(first.tile), row: b.row ? 'breaks' : 'fits', col: b.col ? 'breaks' : 'fits' } }, {}],
  };
}
const CHECK_TILES_SCENE = checkTilesScene();

function checkTilesBoard(): DrillStep {
  const g = M4;
  const opts = optsOf(g, 7).filter((o) => o.id !== 'beside');
  const mark = (o: Option, which: 'row' | 'col'): DrillMark => {
    const b = breaksOf(g, o.tile)[which];
    const fact = lineHas(g, which, which === 'row' ? g.gap[0] : g.gap[1]);
    return {
      id: `${o.id}-${which}`,
      label: which === 'row' ? 'Row rule' : 'Column rule',
      options: FITS_OPTS,
      answer: b ? 'breaks' : 'fits',
      why: b ? { fits: `Not yet. ${fact} This tile does not match that.` } : { breaks: `Not yet. ${fact} This tile matches that.` },
    };
  };
  return {
    id: `${L2}-do2`,
    title: 'Which rule does it break?',
    body: ['Check each tile against both rules. Mark Fits or Breaks for each rule.'],
    scene: CHECK_TILES_SCENE,
    rows: opts.map((o) => ({ id: o.id, label: cap(tile(g, o.tile)), marks: [mark(o, 'row'), mark(o, 'col')] })),
    done: 'Right. Each wrong tile breaks at least one rule. Only the tile that passes both fills the gap.',
  };
}

const MATRIX_IDEAS: IdeaCard[] = [
  {
    title: 'One rule at a time',
    scene: oneRuleScene(),
    body: ['This grid was built from a stated rule, so the missing tile can be worked out for sure.', 'Each color is written under its tile. The rule says which way to look: along a row, or down a column.'],
  },
  {
    title: 'Two rules at once',
    scene: TWO_SCENE,
    body: ['A bigger grid can use two rules: one for the rows and one for the columns.', 'Both rules are written above the grid. The rows light up for one, and the columns for the other.'],
  },
  {
    title: 'A tile must pass both rules',
    scene: bothScene(),
    body: ['A tile can fit one rule and still not belong in the gap. The missing tile must pass both rules.', 'Checking only the row is a common slip. Always check the column too.'],
  },
  {
    title: 'Check every choice',
    scene: CHECK_TILES_SCENE,
    body: ['For each choice, ask two questions. Does it fit the row rule? Does it fit the column rule?', 'A wrong tile can break one rule or both. Say which one it breaks.'],
  },
];

// =====================================================================================================================
// Analogy Bridge (s16.l3)
// =====================================================================================================================

const OPENS = linkById('opens');
const PART = linkById('part');
function keyScene(): BridgeScene {
  return {
    kind: 'bridge',
    a: 'key',
    b: 'lock',
    relation: OPENS.link,
    hidden: true,
    c: 'password',
    steps: [
      { label: 'Name the link', say: `${sentence(OPENS, 'key', 'a lock')} The link is “${OPENS.link}.”` },
      { label: 'Carry it across', say: 'What does a password open? It opens an account.' },
      { label: 'Check it', say: `${sentence(OPENS, 'password', 'an account')} The same sentence is true for both pairs.` },
    ],
    frames: [{ link: true }, { link: true, d: 'account' }, { link: true, d: 'account' }],
  };
}

const BC_A: Card = { size: 'big', color: 'red', shape: 'circle' };
const BC_B: Card = { size: 'small', color: 'red', shape: 'circle' };
const BC_C: Card = { size: 'big', color: 'blue', shape: 'square' };
const BC_D: Card = { size: 'small', color: 'blue', shape: 'square' };
const cw = (c: Card) => `${c.size} ${c.color} ${c.shape}`;
function cardScene(): BridgeScene {
  return {
    kind: 'bridge',
    a: cw(BC_A),
    b: cw(BC_B),
    relation: 'turns small',
    hidden: true,
    c: cw(BC_C),
    cards: { a: BC_A, b: BC_B, c: BC_C },
    steps: [
      { label: 'What changed?', say: 'Only the size changed: big became small. The color and the shape stayed the same.' },
      { label: 'Your turn', say: `Make the same change to the ${cw(BC_C)}, on the board.` },
    ],
    frames: [{ link: true }, { link: true }],
  };
}
const CARD_SCENE = cardScene();

function cardBoard(): DrillStep {
  const opts = [
    { id: 'keep', c: BC_D, why: '' },
    { id: 'look', c: BC_B, why: `Not yet. The ${cw(BC_B)} looks like the first answer, but it did not come from the ${cw(BC_C)}. Keep its color and its shape.` },
    { id: 'same', c: BC_C, why: `Not yet. The ${cw(BC_C)} has not changed. The link changes its size.` },
  ];
  return {
    id: `${L3}-do`,
    title: 'Keep the link',
    body: ['This is the bridge from the example. Mark what changed in the first pair.', 'Then mark what the new card turns into.'],
    scene: CARD_SCENE,
    afterCard: 1,
    scaffold: 'full',
    steps: ['Find what changed in the first pair.', 'Make only that change to the new card.', 'Skip a card that only looks like the first answer.'],
    words: { says: 'First pair', world: 'New card', so: 'So', ask: 'What carries across?' },
    rows: [
      {
        id: 'first',
        label: 'The first pair',
        marks: [{ id: 'changed', label: 'What changed?', options: [{ id: 'size', label: 'Size' }, { id: 'color', label: 'Color' }, { id: 'shape', label: 'Shape' }], answer: 'size', given: true, why: {} }],
        note: 'Big became small. The color and the shape stayed.',
      },
      {
        id: 'kept',
        label: 'What stays the same',
        marks: [{
          id: 'kept', label: 'The link keeps…', options: [{ id: 'both', label: 'Color and shape' }, { id: 'color', label: 'Only the color' }, { id: 'none', label: 'Nothing' }], answer: 'both',
          why: { color: 'Not yet. The shape stayed too: a circle became a circle.', none: 'Not yet. Only the size changed. The color and the shape stayed the same.' },
          compare: { says: `First pair: ${cw(BC_A)}, then ${cw(BC_B)}.`, world: 'Which features did not change?' },
        }],
      },
      {
        id: 'new',
        label: `The ${cw(BC_C)}`,
        marks: [{
          id: 'turns', label: 'It turns into…', options: opts.map((o) => ({ id: o.id, label: `a ${cw(o.c)}` })), answer: 'keep',
          why: Object.fromEntries(opts.filter((o) => o.id !== 'keep').map((o) => [o.id, o.why])),
          compare: { says: 'The link: the size turns small.', world: `New card: ${cw(BC_C)}.` },
        }],
      },
    ],
    done: `Right. The ${cw(BC_C)} turns into a ${cw(BC_D)}. The link carried across, not the look.`,
  };
}

function acrossScene(): BridgeScene {
  return {
    kind: 'bridge',
    a: 'big',
    b: 'small',
    relation: 'opposites',
    hidden: true,
    c: 'loud',
    steps: [
      { label: 'Name the link', say: 'Big and small are opposites in size.' },
      { label: 'Carry it across', say: 'Loud is about sound. Its opposite in sound is quiet.' },
      { label: 'Skip the look-alike', say: 'Little means the same as small, but it is about size, not sound. Loud and little are not opposites.' },
    ],
    frames: [{ link: true }, { link: true, d: 'quiet' }, { link: true, d: 'quiet', look: 'little' }],
  };
}

function partScene(): BridgeScene {
  return {
    kind: 'bridge',
    a: 'page',
    b: 'book',
    relation: PART.link,
    hidden: true,
    c: 'petal',
    steps: [
      { label: 'Name the link', say: `${sentence(PART, 'page', 'a book')} The link is “${PART.link}.”` },
      { label: 'Your turn', say: 'Test each answer in the same sentence, on the board.' },
    ],
    frames: [{ link: true }, { link: true }],
  };
}
const PART_SCENE = partScene();

function partBoard(): DrillStep {
  const tests = [
    { id: 'flower', ay: 'a flower', why: '' },
    { id: 'book', ay: 'a book', why: 'Not yet. A petal is not part of a book. That copies the first pair’s answer.' },
    { id: 'bee', ay: 'a bee', why: 'Not yet. A bee visits a petal, but a petal is not part of a bee.' },
    { id: 'spoon', ay: 'a spoon', why: 'Not yet. A petal is not part of a spoon.' },
  ];
  return {
    id: `${L3}-do2`,
    title: 'Test each answer',
    body: ['Put each answer into the link sentence: “A petal is part of …” Is it true?'],
    scene: PART_SCENE,
    rows: tests.map((t) => {
      const keeps = holds(PART, 'petal', t.id);
      const why: Record<string, string> = keeps ? { no: 'Not yet. A petal is part of a flower. That keeps the link.' } : { yes: t.why };
      return {
        id: t.id,
        label: `A petal is part of ${t.ay}?`,
        marks: [{ id: `keeps-${t.id}`, label: 'Keeps the link?', options: YES_NO_OPTS, answer: keeps ? 'yes' : 'no', why }],
      };
    }),
    done: 'Right. Only a flower keeps the link: a petal is part of a flower.',
  };
}

const BRIDGE_IDEAS: IdeaCard[] = [
  {
    title: 'Carry the link across',
    scene: keyScene(),
    body: ['An analogy says: A is to B as C is to D. A link joins the first pair.', 'Say the link as a sentence. The same sentence must be true for the new pair.'],
  },
  {
    title: 'Keep the link, not the look',
    scene: CARD_SCENE,
    body: ['Cards can be linked by a change. Find what changed, and what stayed the same.', 'An answer that only looks like the first pair’s answer is a look-alike.'],
  },
  {
    title: 'Same link, new kind of thing',
    scene: acrossScene(),
    body: ['A link can jump to a new kind of thing. Big and small are about size. Loud and quiet are about sound.', 'The link “opposites” carries across, even though the words change.'],
  },
  {
    title: 'Words carry links too',
    scene: PART_SCENE,
    body: ['Name the link in a short sentence before you choose.', 'Then test each choice in that sentence. Only one makes it true.'],
  },
];

// =====================================================================================================================
// Packs, reviews and independent checks
// =====================================================================================================================

/** Mirror Pool: explain, faded match, match (the turn trap), finish a half (L2), transfer. */
const mirrorPack = (rng: Rng, level: 1 | 2 | 3 = 2): Item[] =>
  distinctSet([
    () => foldWhyItem(rng),
    () => matchHalfItem(rng, { framed: true }),
    () => matchHalfItem(rng),
    ...(level >= 2 ? [() => finishHalfItem(rng)] : [() => foldOrTurnItem(rng)]),
    () => foldTransferItem(rng),
  ]);
const mirrorReview = (rng: Rng, stage: 1 | 2 | 3): Item[] =>
  distinctSet([() => foldWhyItem(rng, { phase: 'review' }), () => matchHalfItem(rng, { phase: 'review' }), () => (stage > 1 ? finishHalfItem(rng, { phase: 'review' }) : foldOrTurnItem(rng, { phase: 'review' })), () => foldTransferItem(rng, { phase: 'review' })]);
const mirrorIndependent = (rng: Rng): Item[] =>
  distinctSet([() => foldWhyItem(rng), () => matchHalfItem(rng, { fold: 'v' }), () => matchHalfItem(rng, { fold: 'h' }), () => finishHalfItem(rng), () => foldOrTurnItem(rng, { move: 'turn' }), () => foldTransferItem(rng)]);

/** Matrix Gate: explain, faded one-rule grid, one-rule grid, two-rule grid (the row-only trap), timetable transfer. */
const matrixPack = (rng: Rng, level: 1 | 2 | 3 = 3): Item[] =>
  distinctSet([
    () => gridWhyItem(rng),
    () => gridOneItem(rng, { framed: true }),
    () => gridOneItem(rng, { ruleOn: 'col' }),
    () => (level >= 3 ? gridTwoItem(rng) : gridOneItem(rng, { size: 3, ruleOn: 'col' })),
    () => timetableItem(rng),
  ]);
const matrixReview = (rng: Rng, stage: 1 | 2 | 3): Item[] =>
  distinctSet([() => gridWhyItem(rng, { phase: 'review' }), () => gridOneItem(rng, { phase: 'review', ruleOn: 'col', size: stage > 1 ? 3 : 2 }), () => gridTwoItem(rng, { phase: 'review' }), () => timetableItem(rng, { phase: 'review' })]);
const matrixIndependent = (rng: Rng): Item[] =>
  distinctSet([() => gridWhyItem(rng), () => gridOneItem(rng, { ruleOn: 'col' }), () => gridTwoItem(rng), () => gridTwoItem(rng), () => gridWhyItem(rng, { timetable: true }), () => timetableItem(rng)]);

/** Analogy Bridge: explain, faded card change, card change, opposites across kinds (L2) or words (L3), transfer. */
const bridgePack = (rng: Rng, level: 1 | 2 | 3 = 2): Item[] =>
  distinctSet([
    () => linkWhyItem(rng),
    () => (level >= 3 ? wordLinkItem(rng, { framed: true }) : cardLinkItem(rng, { framed: true })),
    () => (level >= 3 ? wordLinkItem(rng) : cardLinkItem(rng)),
    ...(level >= 2 ? [() => oppositeItem(rng)] : []),
    () => linkTransferItem(rng),
  ]);
const bridgeReview = (rng: Rng, stage: 1 | 2 | 3): Item[] =>
  distinctSet([() => linkWhyItem(rng, { phase: 'review' }), () => (stage > 1 ? wordLinkItem(rng, { phase: 'review' }) : cardLinkItem(rng, { phase: 'review' })), () => oppositeItem(rng, { phase: 'review' }), () => linkTransferItem(rng, { phase: 'review' })]);
const bridgeIndependent = (rng: Rng): Item[] =>
  distinctSet([() => linkWhyItem(rng), () => cardLinkItem(rng), () => oppositeItem(rng), () => wordLinkItem(rng), () => linkTransferItem(rng), () => linkTransferItem(rng)]);

const reviewOf = (make: (rng: Rng, stage: 1 | 2 | 3) => Item[], lesson: string) => (rng: Rng, stage: 1 | 2 | 3): Item[] =>
  ids(make(rng, stage).map((it) => asPhase(it, 'review')), `${lesson}-r${stage}-`);

/** The 3-item primer for Matrix Gate (instead of Stop 2, Lesson 1): sort by one feature. */
const sortPrimer = (rng: Rng): Item[] => ids(distinctSet([() => sharedFeatureItem(rng), () => sortGroupItem(rng), () => oddOneItem(rng)]), `${L2}-pr`);

// =====================================================================================================================
// The places
// =====================================================================================================================

const mirrorPool: LessonDef = {
  id: L1,
  title: 'Mirror Pool',
  plain: 'Spatial rules: reflections',
  routine: true,
  track: 3,
  levels: [1, 2],
  requires: [],
  ideas: MIRROR_IDEAS,
  drill: [checkBoard(), finishBoard()],
  practice: (rng) => ids(mirrorPack(rng), `${L1}-p`),
  practiceAt: (rng, level) => ids(mirrorPack(rng, level >= 2 ? 2 : 1), `${L1}-p`),
  pass: { firstTry: 3, include: [{ tag: 'reflection-vs-rotation', label: 'a turn that looks like a reflection' }] },
  review: reviewOf(mirrorReview, L1),
  independent: (rng) => ids(mirrorIndependent(rng), `${L1}-i`),
};

const matrixGate: LessonDef = {
  id: L2,
  title: 'Matrix Gate',
  plain: 'Spatial rules: row and column rules',
  routine: true,
  track: 3,
  levels: [2, 3],
  requires: ['s2.l1'],
  primer: sortPrimer,
  ideas: MATRIX_IDEAS,
  drill: [twoRuleBoard(), checkTilesBoard()],
  practice: (rng) => ids(matrixPack(rng), `${L2}-p`),
  practiceAt: (rng, level) => ids(matrixPack(rng, level >= 3 ? 3 : 2), `${L2}-p`),
  pass: { firstTry: 3, include: [{ tag: 'row-only', label: 'a tile that fits the row but not the column' }] },
  review: reviewOf(matrixReview, L2),
  independent: (rng) => ids(matrixIndependent(rng), `${L2}-i`),
};

const analogyBridge: LessonDef = {
  id: L3,
  title: 'Analogy Bridge',
  plain: 'Spatial rules: analogies',
  routine: true,
  track: 3,
  levels: [1, 3],
  requires: [],
  ideas: BRIDGE_IDEAS,
  drill: [cardBoard(), partBoard()],
  practice: (rng) => ids(bridgePack(rng), `${L3}-p`),
  practiceAt: (rng, level) => ids(bridgePack(rng, level <= 1 ? 1 : level === 2 ? 2 : 3), `${L3}-p`),
  pass: { firstTry: 3, include: [{ tag: 'appearance-match', label: 'a look-alike that does not keep the link' }] },
  review: reviewOf(bridgeReview, L3),
  independent: (rng) => ids(bridgeIndependent(rng), `${L3}-i`),
};

// =====================================================================================================================
// The Ring Check, the Arcade, new examples, the diagnostic
// =====================================================================================================================

/** Every maker by skill, for the Arcade and for new examples after a miss. */
const BY_SKILL: Record<string, (rng: Rng) => Item> = {
  's16.fold-why': (rng) => foldWhyItem(rng),
  's16.fold-or-turn': (rng) => foldOrTurnItem(rng),
  's16.fold-match': (rng) => matchHalfItem(rng),
  's16.fold-finish': (rng) => finishHalfItem(rng),
  's16.fold-transfer': (rng) => foldTransferItem(rng),
  's16.grid-why': (rng) => gridWhyItem(rng),
  's16.grid-one': (rng) => gridOneItem(rng, { ruleOn: 'col' }),
  's16.grid-two': (rng) => gridTwoItem(rng),
  's16.grid-transfer': (rng) => timetableItem(rng),
  's16.link-why': (rng) => linkWhyItem(rng),
  's16.link-same': (rng) => cardLinkItem(rng),
  's16.link-across': (rng) => oppositeItem(rng),
  's16.link-words': (rng) => wordLinkItem(rng),
  's16.link-transfer': (rng) => linkTransferItem(rng),
};

/** The Ring Check: 9 fresh items, three per place; the trap items are conflict items. */
function check(rng: Rng): Item[] {
  return ids(
    distinctSet([
      () => matchHalfItem(rng),
      () => (rng.chance(0.5) ? foldOrTurnItem(rng) : finishHalfItem(rng)),
      () => foldTransferItem(rng),
      () => gridTwoItem(rng),
      () => (rng.chance(0.5) ? gridWhyItem(rng) : gridOneItem(rng, { ruleOn: 'col' })),
      () => timetableItem(rng),
      () => cardLinkItem(rng),
      () => oppositeItem(rng),
      () => (rng.chance(0.5) ? wordLinkItem(rng) : linkTransferItem(rng)),
    ]),
    's16-c',
  );
}

function arcade(rng: Rng): Item {
  const skill = rng.pick(Object.keys(BY_SKILL));
  return { ...BY_SKILL[skill](rng), id: 's16-arcade' };
}

/** The primer's three tasks (sort by one feature), by meta.task: a primer miss gets a twin of the same task. */
const PRIMER_BY_TASK: Record<string, (rng: Rng) => Item> = {
  'name the shared feature': sharedFeatureItem,
  'sort by one feature': sortGroupItem,
  'find the card that breaks a sort': oddOneItem,
};

/** New examples after a miss: a matched twin of the same skill (new picture, grid or pair). */
function fresh(missed: Item, rng: Rng): Item[] {
  const make = BY_SKILL[missed.skill] ?? (missed.skill === 's16.sort' ? PRIMER_BY_TASK[missed.meta?.task ?? ''] : undefined);
  return make ? [{ ...make(rng), id: 'new' }] : [];
}

/**
 * Track 3 diagnostic items: L1 which half is the reflection (with a turn among the halves); L2 a relational analogy
 * with a look-alike option; L3 a one-rule 3 by 3 grid (which tile completes it). Null for any other track or level.
 */
function diagnostic(rng: Rng, track: 1 | 2 | 3 | 4, level: 1 | 2 | 3 | 4): Item | null {
  if (track !== 3) return null;
  let it: Item | null = null;
  if (level === 1) it = matchHalfItem(rng, { fold: 'v', level: 1 });
  else if (level === 2) it = oppositeItem(rng, { level: 2 });
  else if (level === 3) it = gridOneItem(rng, { size: 3, ruleOn: 'col', level: 3 });
  return it ? { ...it, id: 's16-diag' } : null;
}

export const stop16: StopDef = {
  n: STOP,
  id: 's16',
  title: 'Deep Sky',
  idea: 'A fold keeps every point’s partner. A matrix tile must fit the row rule and the column rule. An analogy keeps the link, not the look.',
  ready: true,
  lessons: [mirrorPool, matrixGate, analogyBridge],
  check,
  practice: arcade,
  fresh,
  requires: [],
  lessonOrder: 'free',
  observatory: { ring: 3, track: 3, plain: 'Spatial rules', diagnostic },
  skillNames: {
    's16.fold-why': 'Deep Sky: say why a picture is a reflection or a turn',
    's16.fold-or-turn': 'Deep Sky: tell a reflection from a turn or a slide',
    's16.fold-match': 'Deep Sky: find the half a fold makes',
    's16.fold-finish': 'Deep Sky: finish a reflected half',
    's16.fold-transfer': 'Deep Sky: reflections of letters, arrows and houses',
    's16.grid-why': 'Deep Sky: name the rule a wrong tile breaks',
    's16.grid-one': 'Deep Sky: complete a one-rule grid',
    's16.grid-two': 'Deep Sky: complete a grid with a row rule and a column rule',
    's16.grid-transfer': 'Deep Sky: complete a timetable grid',
    's16.sort': 'Deep Sky: sort cards by one feature (primer)',
    's16.link-why': 'Deep Sky: name the link before choosing',
    's16.link-same': 'Deep Sky: carry a change from one card to another',
    's16.link-across': 'Deep Sky: carry opposites to a new kind of thing',
    's16.link-words': 'Deep Sky: carry a link in words',
    's16.link-transfer': 'Deep Sky: analogies about tools, animals and jobs',
  },
};
