/**
 * The Kid Journey's pictograms (docs/KID-JOURNEY.md §2): small, flat pictures drawn in code, two or three colors
 * each, on a 64-unit square so they stay clear at 44 px. A young reader sees them on cards, answer tiles, boards
 * and buildings. Each one is an image with a name (PICTO_WORDS), and read-aloud says the same name.
 *
 * To add a picture: add its name to the Picto type (engine/types.ts), its spoken name to PICTO_WORDS and its drawing
 * to DRAW. Both maps are typed by Picto, so a name without a drawing or a word does not compile, and a test renders
 * every one.
 */
import type { ReactElement } from 'react';
import type { Picto } from '../../engine/types';

export type { Picto };

/** The palette, shared with the rest of the game's colors. */
const C = {
  gold: '#ffc93c',
  amber: '#ff7a1a',
  red: '#ff4d6d',
  blue: '#3b82f6',
  sky: '#22e6ff',
  teal: '#2dd4bf',
  green: '#3cc36b',
  pink: '#f472b6',
  purple: '#a78bfa',
  white: '#f1f3ff',
  gray: '#c9cff0',
  dark: '#0a0d2a',
  brown: '#b0703f',
  tan: '#e8b07a',
  yellow: '#facc15',
} as const;

/** What each picture is called, as read aloud and given to screen readers. */
export const PICTO_WORDS: Readonly<Record<Picto, string>> = {
  calendar: 'calendar',
  cat: 'cat',
  'cat-wings': 'cat with wings',
  'cloud-rain': 'rain cloud',
  pizza: 'pizza',
  sun: 'sun',
  moon: 'moon',
  star: 'star',
  apple: 'apple',
  dog: 'dog',
  fish: 'fish',
  bird: 'bird',
  tree: 'tree',
  house: 'house',
  car: 'car',
  ball: 'ball',
  cup: 'cup',
  book: 'book',
  hat: 'hat',
  lamp: 'lamp',
  telescope: 'telescope',
  key: 'key',
  flower: 'flower',
  umbrella: 'umbrella',
  check: 'yes',
  cross: 'no',
  question: 'question',
  chest: 'treasure chest',
  'cards-look': 'a red circle a small blue square and a red triangle',
  'cards-cant': 'a red circle a small blue square and a face down card',
  'cards-settled': 'a small red circle a face down card and a big blue square',
  'cards-twin': 'a small red circle and a face down card',
  'card-face-down': 'a face down card',
  'cards-every': 'a red circle a small red square and a blue triangle',
  'cards-tie': 'three red and three yellow',
  'not-flip': 'true and false swap',
  'verdict-true': 'true',
  'verdict-false': 'false',
  'verdict-cant': 'cannot tell',
  signpost: 'sign',
  door: 'door',
  cave: 'cave',
  box: 'box',
  // stop 2 (NOT, AND, OR): one shape card, named as the card is, and the rule pictures
  'card-big-red-circle': 'big red circle',
  'card-big-red-square': 'big red square',
  'card-big-red-triangle': 'big red triangle',
  'card-big-blue-circle': 'big blue circle',
  'card-big-blue-square': 'big blue square',
  'card-big-blue-triangle': 'big blue triangle',
  'card-big-yellow-circle': 'big yellow circle',
  'card-big-yellow-square': 'big yellow square',
  'card-big-yellow-triangle': 'big yellow triangle',
  'card-small-red-circle': 'small red circle',
  'card-small-red-square': 'small red square',
  'card-small-red-triangle': 'small red triangle',
  'card-small-blue-circle': 'small blue circle',
  'card-small-blue-square': 'small blue square',
  'card-small-blue-triangle': 'small blue triangle',
  'card-small-yellow-circle': 'small yellow circle',
  'card-small-yellow-square': 'small yellow square',
  'card-small-yellow-triangle': 'small yellow triangle',
  'rule-features': 'a big red circle a small blue square and a big yellow triangle',
  'rule-red-in': 'red cards in and a blue card out',
  'rule-not-red': 'blue and yellow cards in and a red card out',
  'rule-not-circle': 'a square and a triangle in and a circle out',
  'rule-and-join': 'red and a circle make a red circle',
  'rule-and-only': 'a red circle in and a red square and a blue circle out',
  'rule-and-smaller': 'two rings and the small part they share',
  'rule-two-checks': 'two checks',
  'rule-or-join': 'a yellow circle and a blue square both in',
  'rule-or-both': 'a blue circle with two checks',
  'rule-or-bigger': 'two rings joined into one big group',
  'rule-brackets': 'brackets around a card',
  'rule-inside': 'only the big red circle fits the inside',
  'rule-not-inside': 'every card in but the big red circle',
  'rule-not-red-not-big': 'a small yellow circle and a small blue triangle in',
  'rule-switch': 'two arrows that swap',
  'ten-frame-1': 'one dot',
  'ten-frame-2': 'two dots',
  'ten-frame-3': 'three dots',
  'ten-frame-4': 'four dots',
  'ten-frame-5': 'five dots',
  'ten-frame-6': 'six dots',
  'ten-frame-7': 'seven dots',
  'ten-frame-8': 'eight dots',
  'ten-frame-9': 'nine dots',
  'ten-frame-10': 'ten dots',
  // stop 3 (Line Up)
  'line-compare': 'a tall kid and a short kid',
  'line-chain': 'three kids in a chain',
  'line-proof': 'the first and the last linked',
  'line-cross-out': 'two crossed out and one left',
  'line-fork': 'two kids each taller than one',
  'line-look': 'a magnifying glass',
  'line-split': 'a chain and a split',
  'line-gap': 'someone in between',
  'line-pair': 'two side by side',
  'line-orders': 'three orders',
  'line-must': 'must be true',
  'line-might': 'might be true',
  'line-cant': 'cannot be true',
  'line-all-some-none': 'all some and none',
  'line-front': 'a line and its front',
  'line-middle': 'only the middle spot',
  'line-pin': 'try one spot',
  'line-next': 'two next to each other',
  'line-swap': 'one stays and two swap',
  'line-spot-1': 'first',
  'line-spot-2': 'second',
  'line-spot-3': 'third',
  'line-spot-4': 'fourth',
  'line-slots': 'spots to fill',
  'line-sure': 'a sure spot',
  'line-flag': 'a finish flag',
  'line-checks': 'a check list',
  'line-block': 'three side by side',
  'line-turn': 'turn the block around',
  'line-who-kid': 'a kid',
  'line-who-wizard': 'a wizard',
  'line-who-dragon': 'a dragon',
  'line-who-robot': 'a robot',
  'line-who-letter': 'a letter tile',
  'line-rel-taller': 'taller than',
  'line-rel-longer': 'longer wings than',
  'line-rel-before': 'before',
  'line-rel-left': 'left of',
  'line-rel-right-before': 'right before',
  'line-rel-just-left': 'just left of',
  'line-rel-next': 'next to',
  'line-rel-not-next': 'not next to',
  'line-rel-between': 'between',
  'line-rel-first': 'first',
  'line-rel-last': 'last',
  'line-rel-not-first': 'not first',
  'line-rel-not-last': 'not last',
  // stop 4 (Grid Detective): small grids with their marks, and the answer tiles (a box, a row or a column, lit)
  grid: 'a grid of boxes',
  'grid-marks': 'a check and a cross in a grid',
  'grid-clue': 'a clue that marks one box',
  'grid-one-each': 'one check in each row',
  'grid-or': 'two boxes named and one crossed out',
  'grid-row-left': 'two crosses and a check in a row',
  'grid-col-left': 'two crosses and a check in a column',
  'grid-two-left': 'two empty boxes in a row',
  'grid-cross-one': 'a cross in one box',
  'grid-col-look': 'the crosses in one column',
  'grid-count': 'empty boxes to count',
  'grid-spread-row': 'a check and the crosses across its row',
  'grid-spread': 'a check spread across its row and down its column',
  'grid-col-spread': 'a check and the crosses down its column',
  'grid-spread-again': 'a new check after a spread',
  'grid-solved': 'a grid with one check in each row and column',
  'grid-outside': 'boxes outside the row and the column',
  'grid-two-part': 'a grid in two parts',
  'grid-link': 'two boxes linked',
  'grid-link-not': 'a link that says not',
  'grid-carry': 'a check carried across',
  'grid-carry-back': 'a check carried back',
  'grid-both-ways': 'arrows both ways',
  'grid-loop': 'around the grid again',
  // the board rows' own grids (Mia, Leo and Ava top to bottom): the marks each row's label says, never its answer
  'grid-or-named': 'two boxes named in the top row',
  'grid-cross-apart': 'two crosses in two columns',
  'grid-cross-down': 'two crosses in the last column',
  'grid-cross-mid': 'one cross in the middle row',
  'grid-box-1-1': 'row one column one',
  'grid-box-1-2': 'row one column two',
  'grid-box-1-3': 'row one column three',
  'grid-box-2-1': 'row two column one',
  'grid-box-2-2': 'row two column two',
  'grid-box-2-3': 'row two column three',
  'grid-box-3-1': 'row three column one',
  'grid-box-3-2': 'row three column two',
  'grid-box-3-3': 'row three column three',
  'grid-row-3-1': 'row one',
  'grid-row-3-2': 'row two',
  'grid-row-3-3': 'row three',
  'grid-row-4-1': 'row one',
  'grid-row-4-2': 'row two',
  'grid-row-4-3': 'row three',
  'grid-row-4-4': 'row four',
  'grid-col-3-1': 'column one',
  'grid-col-3-2': 'column two',
  'grid-col-3-3': 'column three',
  'grid-col-4-1': 'column one',
  'grid-col-4-2': 'column two',
  'grid-col-4-3': 'column three',
  'grid-col-4-4': 'column four',
  // stop 4, kid forms: lesson 2's board marks (the row's grid, with the line to count or the box to mark ringed)
  'grid-ask-apart-count': 'the last column ringed to count',
  'grid-ask-apart-top': 'the top right box ringed',
  'grid-ask-apart-bottom': 'the bottom right box ringed',
  'grid-ask-down-count': 'the last column ringed to count with two crosses',
  'grid-ask-down-top': 'the top right box ringed with a cross in it',
  'grid-ask-down-bottom': 'the bottom right box ringed as the last one in its column',
  'grid-ask-row-box': 'the right box of the middle row ringed with a cross in it',
  'grid-ask-row-count': 'the middle row ringed to count with two crosses',
  'grid-ask-row-last': 'the middle box ringed as the last one in its row',
  'grid-ask-top-row': 'the top row ringed to count',
  'grid-ask-col-count': 'the first column ringed to count',
  'grid-ask-col-top': 'the top left box ringed',
  'grid-ask-col-bottom': 'the bottom left box ringed',
  'grid-ask-col-crossed': 'the bottom left box ringed with a cross in it',
  'grid-ask-col-count-one': 'the first column ringed to count with two crosses',
  'grid-ask-col-last': 'the top left box ringed as the last one in its column',
  'grid-ask-off-count': 'the first column ringed to count and a cross beside it',
  'grid-ask-off-top': 'the top left box ringed and a cross beside it',
  // and lesson 3's spread tiles: a row and a column lit together, or every box outside them
  ...spreadTileWords(),
  // stop 7 (Pattern guesses)
  'guess-must': 'must',
  'guess-likely': 'likely',
  'guess-unlikely': 'unlikely',
  'guess-cant': 'cannot',
  'guess-reds': 'four red marbles in a row',
  'guess-bag-six-one': 'a bag of six red marbles and one blue marble',
  'guess-break': 'six circles then a square',
  'guess-goes-back': 'a red marble goes back in the bag',
  'guess-bag-example': 'a bag of four red circles one blue circle and two red squares',
  'guess-bag-twin': 'a bag of four red circles and one blue circle',
  // and the quiz items' kid scenes: the bag (one you can see into, or one you cannot), then each thing in it or each
  // draw, by its kind (a dot of its color, a spell card, a letter tile)
  'guess-bag-see': 'a bag you can see into',
  'guess-bag-hidden': 'a bag you cannot see into',
  'guess-dot-red': 'red',
  'guess-dot-blue': 'blue',
  'guess-dot-yellow': 'yellow',
  'guess-dot-pink': 'pink',
  'guess-dot-gold': 'gold',
  'guess-fire': 'fire card',
  'guess-ice': 'ice card',
  'guess-star': 'star card',
  'guess-tile-a': 'letter a',
  'guess-tile-b': 'letter b',
  'guess-tile-c': 'letter c',
  // stop 8 (All, Some, None): the place answer tiles are named by the part they light
  'rings-overlap-card': 'a card where two rings overlap',
  'ring-part-a': 'only in the left ring',
  'ring-part-both': 'in both rings',
  'ring-part-b': 'only in the right ring',
  'ring-part-out': 'outside both rings',
  'ring-in-b': 'in the right ring',
  'quant-some-all': 'three circles and every one is red',
  'rings-triangles-blue': 'two rings and every triangle is blue',
  // stop 14 (First Lights)
  'chain-unit': 'a chain with its unit in a box',
  'chain-try': 'a part that breaks',
  'chain-far': 'count on past the end',
  'chain-seen': 'a chain we only see',
  'chain-break': 'a chain with one piece that breaks',
  'chain-end': 'a break at the very end',
  'chain-mess': 'a chain that does not repeat',
  'chain-star': 'triangle circle circle again and again',
  'chain-twin': 'red red blue blue again and again',
  'repair-part-ok': 'a part that matches the rule',
  'repair-part-break': 'a part that breaks the rule',
  'echo-same': 'the same pattern in colors and bells',
  'echo-match': 'red blue blue with the blues matched',
  'echo-other': 'two patterns with the same colors',
  'echo-colors': 'red blue blue again and again',
  'echo-dance': 'jump jump spin',
  'sound-clap': 'clap',
  'sound-tap': 'tap',
  'sound-stomp': 'stomp',
  'bell-high': 'high bell',
  'bell-low': 'low bell',
  'move-jump': 'jump',
  'move-spin': 'spin',
  'move-hop': 'hop',
  'class-art': 'art class',
  'class-gym': 'gym class',
  'class-music': 'music class',
  'kid-ava': 'ava',
  'kid-ben': 'ben',
  'kid-cal': 'cal',
  'kid-dee': 'dee',
  'kid-kai': 'kai',
  'kid-lia': 'lia',
  'kid-max': 'max',
  'kid-mia': 'mia',
  'kid-sam': 'sam',
  'kid-zoe': 'zoe',
  'chain-letter-k': 'letter k',
  'chain-letter-m': 'letter m',
  'chain-letter-p': 'letter p',
  'chain-letter-s': 'letter s',
  'chain-letter-t': 'letter t',
  'chain-letter-r': 'letter r',
  'chain-letter-d': 'letter d',
  'chain-letter-g': 'letter g',
  'chain-letter-n': 'letter n',
  'chain-letter-f': 'letter f',
  'chain-letter-h': 'letter h',
  'chain-letter-l': 'letter l',
  'repair-kmm-ok': 'the rule k m m over a part k m m',
  'repair-kmm-break': 'the rule k m m over a part k m k',
  // stop 15 (Rule Rise, Growing Staircase): the cards' pictures, and the Explain item's reasons on its answer tiles
  'stair-grow': 'a staircase that adds a pair each step',
  'stair-far': 'a far step built from its number',
  'stair-next': 'one hop reaches only the next step',
  'jump-list': 'a list with the same jump each time',
  'stair-told': 'a rule you are told',
  'stair-pairs-center': 'the center tile and the pairs',
  'stair-add-two': 'add two each time',
  'stair-pairs-only': 'the pairs with no center tile',
  'stair-times': 'step one again and again',
  circle: 'circle',
  square: 'square',
  triangle: 'triangle',
  tower: 'tower',
  bridge: 'bridge',
  castle: 'castle',
  lighthouse: 'lighthouse',
  tent: 'tent',
  mill: 'windmill',
};

/** Every pictogram name, in the order of PICTO_WORDS. */
export const PICTO_NAMES = Object.keys(PICTO_WORDS) as Picto[];

export const isPicto = (name: string): name is Picto => Object.prototype.hasOwnProperty.call(PICTO_WORDS, name);

/** A five-point star centered at (cx, cy): outer radius r, inner radius r * 0.43. */
function starPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r * 0.43 : r;
    return `${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** The sun's eight rays, from radius 19 to 28. */
const RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (d: number) => `${(32 + d * Math.cos(a)).toFixed(1)} ${(32 + d * Math.sin(a)).toFixed(1)}`;
  return `M${p(19)}L${p(28)}`;
}).join('');

/** The cat's face. `accent` colors the inner ears and the nose (pink, or white beside the wings). */
function catFace(accent: string) {
  return (
    <>
      <path d="M12 30 16 7 31 19Z" fill={C.amber} />
      <path d="M52 30 48 7 33 19Z" fill={C.amber} />
      <circle cx="32" cy="36" r="21" fill={C.amber} />
      <path d="M17.5 23 19 13 25.5 19Z" fill={accent} />
      <path d="M46.5 23 45 13 38.5 19Z" fill={accent} />
      <ellipse cx="24" cy="34" rx="3" ry="4.5" fill={C.dark} />
      <ellipse cx="40" cy="34" rx="3" ry="4.5" fill={C.dark} />
      <path d="M28.5 42h7L32 46Z" fill={accent} />
      <path d="M9 41h12M9 47.5l12-3M55 41H43M55 47.5l-12-3" stroke={C.dark} strokeWidth="1.8" strokeLinecap="round" />
    </>
  );
}

/**
 * A face-down card (stop 1): a purple card back with a diamond cut out of it. One color, so it can sit beside two
 * shape colors in a picture of a row of cards.
 */
function cardBack(x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const d = Math.round(Math.min(w, h) * 0.28);
  return (
    <path
      d={`M${x + 3} ${y}h${w - 6}a3 3 0 0 1 3 3v${h - 6}a3 3 0 0 1-3 3h${6 - w}a3 3 0 0 1-3-3v${6 - h}a3 3 0 0 1 3-3ZM${cx} ${cy - d}l${d} ${d}-${d} ${d}-${d}-${d}Z`}
      fill={C.purple}
      fillRule="evenodd"
    />
  );
}

/** A shape card's colors (stop 2), the same as ThingCard's. */
const CARD_FILL = { red: C.red, blue: C.blue, yellow: C.yellow } as const;
type CardShape = 'circle' | 'square' | 'triangle';

/**
 * One shape (stop 2) centered at (cx, cy), r from its center to its side; a card a rule leaves out is drawn faded, in
 * its own color, so a picture of a rule keeps to the cards' two or three colors.
 */
function shapeAt(shape: CardShape, fill: string, cx: number, cy: number, r: number, out = false) {
  const faded = out ? { fillOpacity: 0.28 } : {};
  const n = (v: number) => Math.round(v * 10) / 10;
  if (shape === 'circle') return <circle cx={cx} cy={cy} r={r} fill={fill} {...faded} />;
  if (shape === 'square') return <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx={n(r * 0.15)} fill={fill} {...faded} />;
  return <path d={`M${cx} ${cy - r}L${n(cx + r * 1.1)} ${n(cy + r * 0.9)}H${n(cx - r * 1.1)}Z`} fill={fill} strokeLinejoin="round" {...faded} />;
}

/** One shape card on its own, big or small (stop 2's picture answer tiles). */
const oneCard = (size: 'big' | 'small', color: keyof typeof CARD_FILL, shape: CardShape) =>
  shapeAt(shape, CARD_FILL[color], 32, 32, size === 'big' ? 24 : 12);

/**
 * A ten frame (stop 2's count answer tiles): two rows of five boxes, filled with gold dots from the top left, row by
 * row, one dot for each card counted. A number a young reader counts, with no digit to read.
 */
function tenFrame(n: number) {
  const cell = 10.4;
  const gap = 2;
  const x0 = 2;
  const y0 = 20.6;
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const x = Math.round((x0 + (i % 5) * (cell + gap)) * 100) / 100;
        const y = Math.round((y0 + Math.floor(i / 5) * (cell + gap)) * 100) / 100;
        return (
          <g key={i}>
            <rect x={x} y={y} width={cell} height={cell} rx="2" fill="none" stroke={C.gray} strokeWidth="1.6" />
            {i < n && <circle cx={Math.round((x + cell / 2) * 100) / 100} cy={Math.round((y + cell / 2) * 100) / 100} r="3.7" fill={C.gold} />}
          </g>
        );
      })}
    </>
  );
}

/** A green tick over a card that fits (stop 2): one color, so a picture of two card colors stays at three. */
const tick = (x: number, y: number) => (
  <path d={`M${x - 6} ${y}l4.5 4.5 8-9`} stroke={C.green} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
);

/** The lens two overlapping rings share: rings at (24, 32) and (40, 32), radius 16. */
const LENS = 'M32 18.1A16 16 0 0 1 32 45.9A16 16 0 0 1 32 18.1Z';

/**
 * One person (stop 3, Line Up): a round head over a rounded body, `h` tall and `w` wide, standing on y = `ground` at x.
 * Heights tell taller from shorter at a glance.
 */
function person(x: number, h: number, fill: string, w = 12, ground = 58) {
  const r = Math.round(w * 4.2) / 10;
  const top = ground - h;
  const body = top + 2 * r + 1.5;
  return (
    <g key={`p${x}`}>
      <circle cx={x} cy={top + r} r={r} fill={fill} />
      <rect x={x - w / 2} y={body} width={w} height={ground - body} rx={w * 0.4} fill={fill} />
    </g>
  );
}

/** A check or a cross in a circle (stop 3's must / might / can’t tiles): green with a white tick, or red with a cross. */
function yesNoDot(x: number, yes: boolean) {
  return (
    <g key={`m${x}`}>
      <circle cx={x} cy="32" r="9" fill={yes ? C.green : C.red} />
      <path d={yes ? `M${x - 4.5} 32l3 3.5 6-7` : `M${x - 4} 28l8 8M${x + 4} 28l-8 8`} stroke={C.white} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** A spot to fill in a line (stop 3): a dashed rounded square on the ground. */
const lineSlot = (x: number) => <rect key={`s${x}`} x={x} y="40" width="16" height="18" rx="3" fill="none" stroke={C.gray} strokeWidth="2.5" strokeDasharray="4 3" />;

/** The dots on a spot badge (stop 3's "where" answer tiles): one dot for first, up to four for fourth. */
const SPOT_DOTS: Readonly<Record<1 | 2 | 3 | 4, readonly (readonly [number, number])[]>> = {
  1: [[32, 38]],
  2: [[25, 38], [39, 38]],
  3: [[22, 38], [32, 38], [42, 38]],
  4: [[26, 32], [38, 32], [26, 44], [38, 44]],
};

/**
 * Three spots of a line, first to last (stop 3's kid clue scenes): the spot `lit` gold, the spot `crossed` crossed out in
 * red, the others gray. First, last, not first and not last.
 */
function endSlots(lit?: 0 | 2, crossed?: 0 | 2) {
  const xs = [4, 24, 44];
  return (
    <>
      <path d="M8 14h44M52 14l-6-5M52 14l-6 5" stroke={C.gray} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => <rect key={x} x={x} y="26" width="16" height="22" rx="3" fill={i === lit ? C.gold : C.gray} />)}
      {crossed !== undefined && <path d={`M${xs[crossed] + 2} 28l12 18M${xs[crossed] + 14} 28l-12 18`} stroke={C.red} strokeWidth="4" strokeLinecap="round" />}
    </>
  );
}

/** A spot badge: a gold medal on a red ribbon, with one to four dots. */
function spotBadge(k: 1 | 2 | 3 | 4) {
  return (
    <>
      <path d="M20 4h9l7 16h-9ZM44 4h-9l-7 16h9Z" fill={C.red} />
      <circle cx="32" cy="38" r="20" fill={C.gold} />
      {SPOT_DOTS[k].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill={C.dark} />)}
    </>
  );
}

/**
 * A bag (stop 7, Pattern guesses), drawn as a tan outline with its neck tied, so what is inside shows on a dark tile.
 * The inside runs about x 11 to 53 at y 31 and x 9 to 55 at y 43. `w`: the line width (thicker when drawn smaller).
 */
const BAG_D = 'M25 19C11 24 6 37 7 47c1 10 11 14 25 14s24-4 25-14c1-10-4-23-18-28ZM24 7h16l-4 12h-8Z';
const bagOutline = (w = 3) => <path d={BAG_D} fill="none" stroke={C.tan} strokeWidth={w} strokeLinejoin="round" />;
/** One thing from a bag in a quiz item's kid scene (stop 7): a big dot of its color with a shine. */
const bagDot = (fill: string) => (
  <>
    <circle cx="32" cy="32" r="19" fill={fill} />
    <circle cx="25" cy="25" r="5" fill={C.white} />
  </>
);
/** A spell card (stop 7, the wizard’s hat): a tall card with its mark. */
const spellCard = (card: string, mark: ReactElement) => (
  <>
    <rect x="14" y="5" width="36" height="54" rx="6" fill={card} />
    {mark}
  </>
);
/** A letter tile (stop 7, the tile bag): the letter drawn in strokes on a tan tile. */
const letterTile = (d: string) => (
  <>
    <rect x="9" y="9" width="46" height="46" rx="8" fill={C.tan} />
    <path d={d} fill="none" stroke={C.dark} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </>
);
/** Stop 14's letter pieces, drawn in strokes for a letter tile (no text): K, M, P, S, T, R, D, G, N, F, H, L. */
const CHAIN_LETTER: Readonly<Record<string, string>> = {
  k: 'M24 18v28M40 18 24 33M29 28l11 18',
  m: 'M21 46V18l11 15 11-15v28',
  p: 'M25 46V18h8a7 7 0 0 1 0 14h-8',
  s: 'M40 22c-2-3-5-4-8-4-5 0-8 3-8 7 0 8 16 6 16 14 0 4-3 7-8 7-3 0-6-1-8-4',
  t: 'M21 18h22M32 18v28',
  r: 'M25 46V18h8a7 7 0 0 1 0 14h-8M32 32l9 14',
  d: 'M25 18v28h5c8 0 12-6 12-14s-4-14-12-14Z',
  g: 'M41 22a13 13 0 1 0 0 20v-8h-7',
  n: 'M23 46V18l18 28V18',
  f: 'M39 18H25v28M25 31h11',
  h: 'M23 18v28M41 18v28M23 32h18',
  l: 'M25 18v28h15',
};
/** A small letter tile centered at (cx, cy), scaled by `k` (a tile is 46 units at k = 1); a rule's tile is faded. */
const letterChip = (key: string, letter: string, cx: number, cy: number, k: number, faded = false) => (
  <g key={key} transform={`translate(${cx - 32 * k} ${cy - 32 * k}) scale(${k})`} opacity={faded ? 0.6 : 1}>
    {letterTile(CHAIN_LETTER[letter])}
  </g>
);
/** Repair Bench's letter board part: the rule's letters faded on top, the part's letters under them. */
const letterPart = (rule: string, part: string) => (
  <>
    {[...rule].map((c, i) => letterChip(`r${i}`, c, 14 + i * 18, 17, 0.36, true))}
    {[...part].map((c, i) => letterChip(`p${i}`, c, 14 + i * 18, 46, 0.4))}
  </>
);
/** A marble, or a circle card, in a bag picture. */
const marble = (x: number, y: number, fill: string, r = 5) => <circle key={`m${x}-${y}`} cx={x} cy={y} r={r} fill={fill} />;
/** A square card in a bag picture. */
const squareAt = (x: number, y: number, fill: string) => <rect key={`q${x}-${y}`} x={x - 4.5} y={y - 4.5} width="9" height="9" rx="1.5" fill={fill} />;
/** Seven spots in a bag: three on top, four under them. */
const BAG_SPOTS: readonly (readonly [number, number])[] = [[23, 31], [33, 31], [43, 31], [17, 43], [27, 43], [37, 43], [47, 43]];

/** The four words as tiles: five dots in a bag, filled gold when they fit, a gray ring when they do not. */
const FIVE_SPOTS: readonly (readonly [number, number])[] = [[22, 33], [32, 33], [42, 33], [27, 45], [37, 45]];
function fitBag(fits: number) {
  return (
    <>
      {bagOutline()}
      {FIVE_SPOTS.map(([x, y], i) =>
        i < fits ? <circle key={i} cx={x} cy={y} r="5" fill={C.gold} /> : <circle key={i} cx={x} cy={y} r="4" fill="none" stroke={C.gray} strokeWidth="2.5" />,
      )}
    </>
  );
}

// ---------- stop 4 (Grid Detective): small grids ----------

/**
 * A small grid (stop 4), one string per row and one letter per box: '.' an empty box, 'v' a check, 'x' a cross, 'o' an
 * empty box ringed in gold (the one to look at), 'X' a cross ringed in gold, 'g' a gold box (lit), 'b' a blue box (a
 * row's name), ' ' no box. Boxes are gray, a check is green and a cross red: each picture keeps to three of these colors.
 * `at`: the grid's left, top and width (the rows are as tall as the boxes are wide).
 */
function miniGrid(rows: readonly string[], at: { x: number; y: number; w: number } = { x: 5, y: 5, w: 54 }): ReactElement {
  const n = Math.max(...rows.map((r) => r.length));
  const gap = at.w * 0.07;
  const s = (at.w - gap * (n - 1)) / n;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const out: ReactElement[] = [];
  rows.forEach((row, i) => {
    [...row].forEach((ch, j) => {
      if (ch === ' ') return;
      const x = at.x + j * (s + gap);
      const y = at.y + i * (s + gap);
      const k = `${i}-${j}`;
      const box = { x: r1(x), y: r1(y), width: r1(s), height: r1(s), rx: r1(s * 0.18) };
      const at01 = (a: number, b: number) => `${r1(x + a * s)} ${r1(y + b * s)}`;
      if (ch === 'g') out.push(<rect key={k} {...box} fill={C.gold} />);
      else if (ch === 'b') out.push(<rect key={k} {...box} fill={C.blue} />);
      else out.push(<rect key={k} {...box} fill={C.gray} fillOpacity={0.3} stroke={C.gray} strokeWidth="1.5" />);
      if (ch === 'o' || ch === 'X') out.push(<rect key={`${k}o`} {...box} fill="none" stroke={C.gold} strokeWidth={r1(Math.max(2, s * 0.14))} />);
      if (ch === 'v') {
        out.push(<path key={`${k}v`} d={`M${at01(0.22, 0.52)}L${at01(0.42, 0.72)}L${at01(0.78, 0.3)}`} stroke={C.green} strokeWidth={r1(Math.max(2, s * 0.16))} fill="none" strokeLinecap="round" strokeLinejoin="round" />);
      }
      if (ch === 'x' || ch === 'X') {
        out.push(<path key={`${k}x`} d={`M${at01(0.28, 0.28)}L${at01(0.72, 0.72)}M${at01(0.72, 0.28)}L${at01(0.28, 0.72)}`} stroke={C.red} strokeWidth={r1(Math.max(2, s * 0.15))} fill="none" strokeLinecap="round" />);
      }
    });
  });
  return <>{out}</>;
}

/** An answer tile (stop 4): an n by n grid with the boxes lit(r, c) (from 0) in gold. */
const litGrid = (n: number, lit: (r: number, c: number) => boolean) =>
  miniGrid(Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (lit(r, c) ? 'g' : '.')).join('')));

/** Stop 4's board-mark pictures (lesson 2's kid boards). */
type GridAsk = Extract<Picto, `grid-ask-${string}`>;
/**
 * Lesson 2's board marks in kid mode (stop 4): the grid of the board row, Mia, Leo and Ava top to bottom, with the
 * crosses its words give (x), and the line to count or the box to mark ringed (o, or X for a ringed box with a cross).
 * Exported so the stop's kid test can work each picture out again from the board row it stands for.
 */
export const GRID_ASK: Readonly<Record<GridAsk, readonly string[]>> = {
  // the grapes column: Mia's cross under apples (apart) or under grapes (down), and Leo's cross under grapes
  'grid-ask-apart-count': ['x.o', '..X', '..o'],
  'grid-ask-apart-top': ['x.o', '..x', '...'],
  'grid-ask-apart-bottom': ['x..', '..x', '..o'],
  'grid-ask-down-count': ['..X', '..X', '..o'],
  'grid-ask-down-top': ['..X', '..x', '...'],
  'grid-ask-down-bottom': ['..x', '..x', '..o'],
  // Leo's cross under the cat, and one more cross a row adds: under Leo's fish, Ava's cat or Mia's dog
  'grid-ask-row-box': ['...', 'x.X', '...'],
  'grid-ask-row-count': ['...', 'XoX', '...'],
  'grid-ask-row-last': ['...', 'xox', '...'],
  'grid-ask-top-row': ['ooo', 'x..', '...'],
  'grid-ask-col-count': ['o..', 'X..', 'o..'],
  'grid-ask-col-top': ['o..', 'x..', '...'],
  'grid-ask-col-bottom': ['...', 'x..', 'o..'],
  'grid-ask-col-crossed': ['...', 'x..', 'X..'],
  'grid-ask-col-count-one': ['o..', 'X..', 'X..'],
  'grid-ask-col-last': ['o..', 'x..', 'x..'],
  'grid-ask-off-count': ['ox.', 'X..', 'o..'],
  'grid-ask-off-top': ['ox.', 'x..', '...'],
};

/** Stop 4's spread tiles (lesson 3's kid answers): row r and column c of an n by n grid lit together, or every box outside them. */
type SpreadTile = Extract<Picto, `grid-plus-${string}` | `grid-out-${string}`>;
/** Every spread tile as [name, n, row, column, plus], rows and columns from 1. */
function spreadTiles(): [SpreadTile, number, number, number, boolean][] {
  const out: [SpreadTile, number, number, number, boolean][] = [];
  for (const n of [3, 4]) {
    for (let r = 1; r <= n; r++) {
      for (let c = 1; c <= n; c++) {
        out.push([`grid-plus-${n}-${r}-${c}` as SpreadTile, n, r, c, true], [`grid-out-${n}-${r}-${c}` as SpreadTile, n, r, c, false]);
      }
    }
  }
  return out;
}
/** The spread tiles' spoken names: “row one and column two”, “the boxes outside row one and column two”. */
function spreadTileWords(): Record<SpreadTile, string> {
  const say = ['one', 'two', 'three', 'four'];
  return Object.fromEntries(spreadTiles().map(([name, , r, c, plus]) => [name, `${plus ? '' : 'the boxes outside '}row ${say[r - 1]} and column ${say[c - 1]}`])) as Record<SpreadTile, string>;
}
/** The spread tiles' drawings: the boxes of row r and column c lit, or every other box lit. */
function spreadTileDraw(): Record<SpreadTile, () => ReactElement> {
  return Object.fromEntries(spreadTiles().map(([name, n, r, c, plus]) => [name, () => litGrid(n, (i, j) => (i === r - 1 || j === c - 1) === plus)])) as Record<SpreadTile, () => ReactElement>;
}
/** The board-mark pictures' drawings, from their patterns. */
function gridAskDraw(): Record<GridAsk, () => ReactElement> {
  return Object.fromEntries((Object.keys(GRID_ASK) as GridAsk[]).map((name) => [name, () => miniGrid(GRID_ASK[name])])) as Record<GridAsk, () => ReactElement>;
}

/** A gold link between two boxes (stop 4's linking clues): two rings, side by side. */
const goldLink = (
  <>
    <rect x="21" y="26" width="13" height="10" rx="5" fill="none" stroke={C.gold} strokeWidth="3" />
    <rect x="30" y="26" width="13" height="10" rx="5" fill="none" stroke={C.gold} strokeWidth="3" />
  </>
);

/** A gold arrow from x0 to x1 at height y (stop 4's carry pictures), its head at x1. */
function goldArrow(x0: number, x1: number, y: number) {
  const d = x1 > x0 ? 1 : -1;
  return (
    <>
      <path d={`M${x0} ${y}H${x1 - d * 4}`} stroke={C.gold} strokeWidth="3.5" strokeLinecap="round" />
      <path d={`M${x1} ${y}l${-d * 7} -5.5v11Z`} fill={C.gold} />
    </>
  );
}

// ---------- stop 8 (All, Some, None): two rings that overlap ----------

/**
 * Two rings that overlap (stop 8), on the LENS geometry: the left ring sky and the right ring gold, as the rings
 * picture draws its first and second ring, so an answer tile lines up with the picture over it.
 */
const twoRings = (
  <>
    <circle cx="24" cy="32" r="16" stroke={C.sky} strokeWidth="3" fill="none" />
    <circle cx="40" cy="32" r="16" stroke={C.gold} strokeWidth="3" fill="none" />
  </>
);
/** The part of two rings a place answer names, lit green: only in the left ring, the overlap, only in the right ring. */
const RING_PARTS = {
  a: 'M32 18.1A16 16 0 1 0 32 45.9A16 16 0 0 1 32 18.1Z',
  both: LENS,
  b: 'M32 18.1A16 16 0 1 1 32 45.9A16 16 0 0 0 32 18.1Z',
  /** Outside both rings: the tile with the two rings cut out of it. */
  out: 'M2 4h60v56H2ZM32 18.1A16 16 0 1 0 32 45.9A16 16 0 1 0 32 18.1Z',
} as const;
const ringPart = (p: keyof typeof RING_PARTS) => (
  <>
    <path d={RING_PARTS[p]} fill={C.green} fillRule="evenodd" />
    {twoRings}
  </>
);

// ---------- stop 14 (First Lights): chains of pieces, sounds, bells, moves and classes ----------

/**
 * A piece of a chain picture (stop 14): 't' the shapes' yellow triangle, 'c' a blue circle, 's' the shapes' red square,
 * 'r' a red circle. `outline`: drawn as an outline (the rule a part is checked against), not filled.
 */
function chainPiece(p: string, cx: number, cy: number, r: number, outline = false) {
  const fill = p === 't' ? C.yellow : p === 'c' ? C.blue : C.red;
  const shape: CardShape = p === 't' ? 'triangle' : p === 's' ? 'square' : 'circle';
  const k = `${p}${cx}-${cy}`;
  if (!outline) return <g key={k}>{shapeAt(shape, fill, cx, cy, r)}</g>;
  const line = { fill: 'none', stroke: fill, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  if (shape === 'circle') return <circle key={k} cx={cx} cy={cy} r={r - 1} {...line} />;
  if (shape === 'square') return <rect key={k} x={cx - r + 1} y={cy - r + 1} width={2 * r - 2} height={2 * r - 2} rx="1.5" {...line} />;
  return <path key={k} d={`M${cx} ${cy - r + 1}L${cx + r} ${cy + r * 0.8}H${cx - r}Z`} {...line} />;
}

/** A row of chain pieces (one letter each, see chainPiece), evenly spaced from x0 to x1 at height y. */
function chainRow(pieces: string, y: number, r: number, x0: number, x1: number, outline = false) {
  const step = pieces.length > 1 ? (x1 - x0) / (pieces.length - 1) : 0;
  return <>{[...pieces].map((p, i) => chainPiece(p, Math.round((x0 + i * step) * 10) / 10, y, r, outline))}</>;
}

/** A bell (stop 14), its middle at (cx, cy), half as wide as `w`: a gold dome on a flared rim, its clapper under it. */
function bellAt(cx: number, cy: number, w: number) {
  const h = w * 1.7;
  const n = (v: number) => Math.round(v * 10) / 10;
  return (
    <g key={`b${cx}-${cy}`}>
      <path d={`M${n(cx - w * 1.3)} ${n(cy + h / 2)}L${n(cx - w)} ${n(cy + h / 2 - 2)}C${n(cx - w)} ${n(cy - h / 2)} ${n(cx + w)} ${n(cy - h / 2)} ${n(cx + w)} ${n(cy + h / 2 - 2)}L${n(cx + w * 1.3)} ${n(cy + h / 2)}Z`} fill={C.gold} />
      <circle cx={cx} cy={n(cy + h / 2 + w * 0.3)} r={n(w * 0.3)} fill={C.gold} />
    </g>
  );
}

/** A sky arrow up or down at x, from y0 to y1 (stop 14's high and low bells). */
function skyArrow(x: number, y0: number, y1: number) {
  const d = y1 > y0 ? 1 : -1;
  return (
    <>
      <path d={`M${x} ${y0}V${y1 - d * 5}`} stroke={C.sky} strokeWidth="3.5" strokeLinecap="round" />
      <path d={`M${x} ${y1}l-6 ${-d * 7}h12Z`} fill={C.sky} />
    </>
  );
}

/**
 * A dancer (stop 14), drawn in sky lines: 'jump' (arms up, knees bent, off the ground), 'spin' (arms out) or 'hop'
 * (on one leg), its head at (x, y) and `s` its scale (1 is 44 units tall).
 */
function dancer(pose: 'jump' | 'spin' | 'hop', x: number, y: number, s = 1) {
  const n = (v: number) => Math.round(v * 10) / 10;
  const X = (dx: number) => n(x + dx * s);
  const Y = (dy: number) => n(y + dy * s);
  const arms = pose === 'jump' ? `M${X(-9)} ${Y(-2)}L${X(0)} ${Y(10)}L${X(9)} ${Y(-2)}` : pose === 'spin' ? `M${X(-11)} ${Y(12)}H${X(11)}` : `M${X(-9)} ${Y(16)}L${X(0)} ${Y(10)}L${X(9)} ${Y(4)}`;
  const legs =
    pose === 'jump' ? `M${X(-7)} ${Y(30)}L${X(-3)} ${Y(23)}L${X(0)} ${Y(20)}L${X(3)} ${Y(23)}L${X(7)} ${Y(30)}`
      : pose === 'spin' ? `M${X(-6)} ${Y(34)}L${X(0)} ${Y(20)}L${X(6)} ${Y(34)}`
        : `M${X(0)} ${Y(34)}V${Y(20)}M${X(0)} ${Y(22)}L${X(8)} ${Y(26)}L${X(6)} ${Y(30)}`;
  return (
    <g key={`d${x}-${y}`} fill="none" stroke={C.sky} strokeWidth={n(3 * Math.max(0.8, s))} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={x} cy={y} r={n(4.5 * s)} fill={C.sky} stroke="none" />
      <path d={`M${X(0)} ${Y(5)}V${Y(20)}`} />
      <path d={arms} />
      <path d={legs} />
    </g>
  );
}

/**
 * A kid of a rota (stop 14), by name: a face over shoulders, told apart by hair color and style and shirt color (three
 * colors: the face, the hair, the shirt). The name goes on the answer tile; the chain shows the faces.
 */
function kidFace(hair: string, style: 'short' | 'long' | 'bun' | 'curly', shirt: string) {
  return (
    <>
      {style === 'long' && <path d="M14 30c0-12 8-20 18-20s18 8 18 20v16H14Z" fill={hair} />}
      <path d="M10 62c0-12 10-18 22-18s22 6 22 18Z" fill={shirt} />
      <circle cx="32" cy="28" r="14" fill={C.tan} />
      {style === 'bun' && <circle cx="32" cy="10" r="6" fill={hair} />}
      {style === 'curly' ? (
        <path d="M17 27a5 5 0 0 1 4-10 6 6 0 0 1 11-4 6 6 0 0 1 11 4 5 5 0 0 1 4 10c-4-3-9-5-15-5s-11 2-15 5Z" fill={hair} />
      ) : (
        <path d="M18 26c0-8 6-13 14-13s14 5 14 13c-4-3-9-4-14-4s-10 1-14 4Z" fill={hair} />
      )}
    </>
  );
}

/**
 * A row of square tiles centered on the picture (stop 15, Growing Staircase): c the gold center tile, o a kept blue
 * tile, n a new amber tile, _ an empty slot (a dashed outline). `s` is a tile's side and `gap` the space between.
 */
function stairRow(cells: string, y: number, s: number, gap: number) {
  const x0 = 32 - (cells.length * s + (cells.length - 1) * gap) / 2;
  const at = (i: number) => Math.round((x0 + i * (s + gap)) * 10) / 10;
  return (
    <g key={`s${cells}-${y}`}>
      {[...cells].map((ch, i) =>
        ch === '_' ? (
          <rect key={i} x={at(i)} y={y} width={s} height={s} rx="1.5" fill="none" stroke={C.gray} strokeWidth="1.5" strokeDasharray="2.5 2" />
        ) : (
          <rect key={i} x={at(i)} y={y} width={s} height={s} rx="1.5" fill={ch === 'c' ? C.gold : ch === 'n' ? C.amber : C.blue} />
        ),
      )}
    </g>
  );
}

const DRAW: Readonly<Record<Picto, () => ReactElement>> = {
  calendar: () => (
    <>
      <rect x="8" y="12" width="48" height="44" rx="6" fill={C.white} />
      <path d="M8 18a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v8H8Z" fill={C.red} />
      <rect x="18" y="6" width="5" height="12" rx="2.5" fill={C.dark} />
      <rect x="41" y="6" width="5" height="12" rx="2.5" fill={C.dark} />
      <rect x="15" y="31" width="8" height="8" rx="1.5" fill={C.dark} />
      <rect x="28" y="31" width="8" height="8" rx="1.5" fill={C.dark} />
      <rect x="41" y="31" width="8" height="8" rx="1.5" fill={C.red} />
      <rect x="15" y="43" width="8" height="8" rx="1.5" fill={C.dark} />
      <rect x="28" y="43" width="8" height="8" rx="1.5" fill={C.dark} />
      <rect x="41" y="43" width="8" height="8" rx="1.5" fill={C.dark} />
    </>
  ),
  cat: () => catFace(C.pink),
  'cat-wings': () => (
    <>
      <path d="M17 33C5 31 1 18 3 7c5 9 11 14 18 16Z" fill={C.white} />
      <path d="M47 33c12-2 16-15 14-26-5 9-11 14-18 16Z" fill={C.white} />
      <g transform="translate(13 16) scale(0.6)">{catFace(C.white)}</g>
    </>
  ),
  'cloud-rain': () => (
    <>
      <circle cx="22" cy="28" r="10" fill={C.gray} />
      <circle cx="35" cy="22" r="13" fill={C.gray} />
      <circle cx="46" cy="30" r="9" fill={C.gray} />
      <rect x="12" y="28" width="44" height="12" rx="6" fill={C.gray} />
      <path d="M21 46l-3 9M33 46l-3 9M45 46l-3 9" stroke={C.blue} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  pizza: () => (
    <>
      <path d="M9 15h46L32 59Z" fill={C.gold} />
      <rect x="6" y="8" width="52" height="10" rx="5" fill={C.amber} />
      <circle cx="24" cy="27" r="4.5" fill={C.red} />
      <circle cx="40" cy="27" r="4.5" fill={C.red} />
      <circle cx="32" cy="41" r="4" fill={C.red} />
    </>
  ),
  sun: () => (
    <>
      <path d={RAYS} stroke={C.amber} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="14" fill={C.gold} />
    </>
  ),
  moon: () => (
    <>
      <path d="M44 8A24 24 0 1 0 44 56A30 30 0 0 1 44 8Z" fill={C.gold} />
      <circle cx="26" cy="22" r="2.5" fill={C.amber} />
      <circle cx="24" cy="40" r="3.5" fill={C.amber} />
    </>
  ),
  star: () => <polygon points={starPoints(32, 34, 27)} fill={C.gold} stroke={C.amber} strokeWidth="2" strokeLinejoin="round" />,
  apple: () => (
    <>
      <path d="M32 21c-8-6-22-3-22 13 0 14 10 25 17 25 3 0 3-1.5 5-1.5s2 1.5 5 1.5c7 0 17-11 17-25 0-16-14-19-22-13Z" fill={C.red} />
      <path d="M32 22c0-6 1-10 4-13" stroke={C.brown} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M35 15c4-7 12-8 16-6-3 6-10 9-16 6Z" fill={C.green} />
    </>
  ),
  dog: () => (
    <>
      <ellipse cx="13" cy="30" rx="8" ry="16" fill={C.brown} />
      <ellipse cx="51" cy="30" rx="8" ry="16" fill={C.brown} />
      <circle cx="32" cy="33" r="19" fill={C.tan} />
      <circle cx="25" cy="29" r="3" fill={C.dark} />
      <circle cx="39" cy="29" r="3" fill={C.dark} />
      <ellipse cx="32" cy="39" rx="5" ry="3.5" fill={C.dark} />
      <path d="M32 42v4M27 47q5 3 10 0" stroke={C.dark} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  fish: () => (
    <>
      <path d="M26 21q6-9 13 0Z" fill={C.blue} />
      <path d="M44 32 59 19v26Z" fill={C.blue} />
      <ellipse cx="28" cy="32" rx="20" ry="13" fill={C.sky} />
      <circle cx="17" cy="29" r="3" fill={C.dark} />
      <path d="M33 25q-4 7 0 14" stroke={C.blue} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  bird: () => (
    <>
      <path d="M26 50v8M34 50v8" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="37" r="16" fill={C.blue} />
      <circle cx="42" cy="22" r="10" fill={C.blue} />
      <path d="M51 19l9 3.5-9 3.5Z" fill={C.gold} />
      <circle cx="44" cy="20" r="2.4" fill={C.dark} />
      <path d="M17 35q10-3 19 6-11 5-19-6Z" fill="none" stroke={C.dark} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
  tree: () => (
    <>
      <rect x="28" y="38" width="8" height="20" rx="2" fill={C.brown} />
      <circle cx="32" cy="23" r="16" fill={C.green} />
      <circle cx="20" cy="33" r="11" fill={C.green} />
      <circle cx="44" cy="33" r="11" fill={C.green} />
    </>
  ),
  house: () => (
    <>
      <rect x="12" y="29" width="40" height="27" fill={C.gold} />
      <path d="M5 31 32 8l27 23Z" fill={C.amber} />
      <rect x="27" y="40" width="10" height="16" fill={C.dark} />
      <rect x="16" y="35" width="8" height="8" fill={C.dark} />
      <rect x="40" y="35" width="8" height="8" fill={C.dark} />
    </>
  ),
  car: () => (
    <>
      <path d="M6 42v-6a4 4 0 0 1 4-4h6l7-11h18l9 11h4a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4Z" fill={C.red} />
      <path d="M25 25h6v7H20Z" fill={C.white} />
      <path d="M35 25h4.5l5.5 7H35Z" fill={C.white} />
      <circle cx="18" cy="46" r="6.5" fill={C.dark} />
      <circle cx="46" cy="46" r="6.5" fill={C.dark} />
    </>
  ),
  ball: () => (
    <>
      <circle cx="32" cy="32" r="25" fill={C.pink} />
      <path d="M9 24q23 11 46 0" stroke={C.white} strokeWidth="6" fill="none" />
      <path d="M10 42q22-9 44 0" stroke={C.gold} strokeWidth="6" fill="none" />
    </>
  ),
  cup: () => (
    <>
      <path d="M22 15q-3-4 0-8M32 15q-3-4 0-8" stroke={C.white} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 27h4a7.5 7.5 0 0 1 0 15h-4" stroke={C.teal} strokeWidth="5" fill="none" />
      <rect x="12" y="20" width="32" height="36" rx="6" fill={C.teal} />
    </>
  ),
  book: () => (
    <>
      <path d="M4 17v36c10-2 20-1 28 4 8-5 18-6 28-4V17" stroke={C.purple} strokeWidth="4" fill="none" strokeLinejoin="round" />
      <path d="M32 19C24 13 15 13 7 15v34c8-2 17-2 25 4Z" fill={C.white} />
      <path d="M32 19c8-6 17-6 25-4v34c-8-2-17-2-25 4Z" fill={C.white} />
      <path d="M13 25q7-1.5 13 1M13 33q7-1.5 13 1M38 26q6-2.5 13-1M38 34q6-2.5 13-1" stroke={C.purple} strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  ),
  hat: () => (
    <>
      <path d="M32 5 47 47H17Z" fill={C.blue} />
      <ellipse cx="32" cy="49" rx="25" ry="7" fill={C.purple} />
      <polygon points={starPoints(31, 27, 6)} fill={C.gold} />
      <polygon points={starPoints(37, 39, 4)} fill={C.gold} />
    </>
  ),
  lamp: () => (
    <>
      <rect x="30" y="29" width="4" height="22" fill={C.gray} />
      <rect x="19" y="50" width="26" height="7" rx="3.5" fill={C.gray} />
      <path d="M21 8h22l9 22H12Z" fill={C.gold} />
    </>
  ),
  telescope: () => (
    <>
      <path d="M32 35 20 59M32 35l12 24M32 35v24" stroke={C.gray} strokeWidth="3.5" strokeLinecap="round" />
      <g transform="rotate(-25 32 28)">
        <rect x="10" y="22" width="38" height="12" rx="3" fill={C.purple} />
        <rect x="46" y="19" width="9" height="18" rx="2" fill={C.purple} />
        <rect x="5" y="24.5" width="6" height="7" rx="1.5" fill={C.gold} />
        <rect x="28" y="22" width="4" height="12" fill={C.gold} />
      </g>
    </>
  ),
  key: () => (
    <>
      <circle cx="18" cy="32" r="12" fill={C.gold} />
      <circle cx="18" cy="32" r="5" fill={C.dark} />
      <rect x="28" y="29" width="30" height="6" rx="2" fill={C.gold} />
      <rect x="45" y="34" width="5" height="9" rx="1" fill={C.gold} />
      <rect x="53" y="34" width="5" height="12" rx="1" fill={C.gold} />
    </>
  ),
  flower: () => (
    <>
      <path d="M32 33v26" stroke={C.green} strokeWidth="4" strokeLinecap="round" />
      <path d="M32 52c-9 0-13-6-13-11 7 0 13 4 13 11Z" fill={C.green} />
      {[0, 1, 2, 3, 4].map((k) => {
        const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
        return <circle key={k} cx={(32 + 10 * Math.cos(a)).toFixed(1)} cy={(24 + 10 * Math.sin(a)).toFixed(1)} r="7.5" fill={C.pink} />;
      })}
      <circle cx="32" cy="24" r="6" fill={C.gold} />
    </>
  ),
  umbrella: () => (
    <>
      <path d="M32 30v20a5 5 0 0 1-10 0" stroke={C.gray} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M6 31a26 26 0 0 1 52 0c-4-4-9-4-13 0-4-4-9-4-13 0-4-4-9-4-13 0-4-4-9-4-13 0Z" fill={C.sky} />
      <path d="M32 5v-1" stroke={C.gray} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  check: () => (
    <>
      <circle cx="32" cy="32" r="26" fill={C.green} />
      <path d="M19 33l9 9 17-19" stroke={C.white} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  cross: () => (
    <>
      <circle cx="32" cy="32" r="26" fill={C.red} />
      <path d="M22 22l20 20M42 22 22 42" stroke={C.white} strokeWidth="7" fill="none" strokeLinecap="round" />
    </>
  ),
  question: () => (
    <>
      <circle cx="32" cy="32" r="26" fill={C.purple} />
      <path d="M24 25a8 8 0 1 1 12 7c-3 2-4 3.5-4 7" stroke={C.white} strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="47.5" r="3.5" fill={C.white} />
    </>
  ),
  chest: () => (
    <>
      <path d="M8 30v-7a12 12 0 0 1 12-12h24a12 12 0 0 1 12 12v7Z" fill={C.brown} />
      <rect x="8" y="30" width="48" height="25" rx="3" fill={C.brown} />
      <rect x="8" y="27" width="48" height="5" fill={C.gold} />
      <rect x="15" y="11" width="5" height="44" fill={C.gold} />
      <rect x="44" y="11" width="5" height="44" fill={C.gold} />
      <rect x="27" y="29" width="10" height="12" rx="2" fill={C.gold} />
      <circle cx="32" cy="34" r="2" fill={C.dark} />
    </>
  ),
  // stop 1 (True or False?): its rows of cards with no numbers, so a board row shows the cards it asks about
  'cards-look': () => (
    <>
      <circle cx="11" cy="32" r="9" fill={C.red} />
      <rect x="27" y="27" width="10" height="10" rx="1.5" fill={C.blue} />
      <path d="M53 22 62 41H44Z" fill={C.red} />
    </>
  ),
  'cards-cant': () => (
    <>
      <circle cx="11" cy="32" r="9" fill={C.red} />
      <rect x="27" y="27" width="10" height="10" rx="1.5" fill={C.blue} />
      {cardBack(44, 19, 18, 26)}
    </>
  ),
  'cards-settled': () => (
    <>
      <circle cx="11" cy="32" r="5" fill={C.red} />
      {cardBack(23, 19, 18, 26)}
      <rect x="44" y="23" width="18" height="18" rx="2" fill={C.blue} />
    </>
  ),
  'cards-twin': () => (
    <>
      <circle cx="20" cy="32" r="5" fill={C.red} />
      {cardBack(35, 19, 18, 26)}
    </>
  ),
  'card-face-down': () => cardBack(14, 6, 36, 52),
  'cards-every': () => (
    <>
      <circle cx="11" cy="32" r="9" fill={C.red} />
      <rect x="27" y="27" width="10" height="10" rx="1.5" fill={C.red} />
      <path d="M53 22 62 41H44Z" fill={C.blue} />
    </>
  ),
  'cards-tie': () => (
    <>
      {[14, 32, 50].map((x) => <circle key={`r${x}`} cx={x} cy="20" r="8" fill={C.red} />)}
      {[14, 32, 50].map((x) => <circle key={`y${x}`} cx={x} cy="44" r="8" fill={C.yellow} />)}
    </>
  ),
  'not-flip': () => (
    <>
      <circle cx="14" cy="32" r="12" fill={C.green} />
      <path d="M8 32l4 4 7-8" stroke={C.white} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="32" r="12" fill={C.red} />
      <path d="M45 27l10 10M55 27 45 37" stroke={C.white} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M20 15q12-10 24 0M44 49q-12 10-24 0" stroke={C.white} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M47 18 45 10 40 15ZM17 46 19 54 24 49Z" fill={C.white} />
    </>
  ),
  // the answer tiles of "True, false or can’t tell": a check, a cross and a question mark, named by their answers
  'verdict-true': () => DRAW.check(),
  'verdict-false': () => DRAW.cross(),
  'verdict-cant': () => DRAW.question(),
  signpost: () => (
    <>
      <rect x="29" y="26" width="6" height="34" rx="1.5" fill={C.brown} />
      <rect x="8" y="8" width="48" height="22" rx="3" fill={C.tan} />
      <path d="M15 16h34M15 23h24" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // the boxes of the other sign puzzles, as answer tiles: a door, a cave and a gift box
  door: () => (
    <>
      <rect x="8" y="55" width="48" height="5" rx="1.5" fill={C.gray} />
      <path d="M14 55V26a18 18 0 0 1 36 0v29Z" fill={C.brown} />
      <rect x="14" y="24" width="8" height="3" fill={C.gold} />
      <rect x="14" y="44" width="8" height="3" fill={C.gold} />
      <circle cx="41" cy="38" r="3.5" fill={C.gold} />
    </>
  ),
  cave: () => (
    <>
      <path d="M4 58C6 30 18 10 33 10s26 22 27 48Z" fill={C.gray} />
      <path d="M20 58V45a12 12 0 0 1 24 0v13Z" fill={C.dark} />
      <path d="M8 58h48" stroke={C.green} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  box: () => (
    <>
      <rect x="10" y="28" width="44" height="28" rx="3" fill={C.amber} />
      <rect x="6" y="18" width="52" height="12" rx="2.5" fill={C.gold} />
      <rect x="29" y="18" width="6" height="38" fill={C.red} />
      <path d="M32 18c-6-10-16-8-12-2 2 3 8 2 12 2Zm0 0c6-10 16-8 12-2-2 3-8 2-12 2Z" fill={C.red} />
    </>
  ),
  // stop 2 (NOT, AND, OR): one shape card, and the pictures of its rules (a faded card is left out, a tick fits)
  'card-big-red-circle': () => oneCard('big', 'red', 'circle'),
  'card-big-red-square': () => oneCard('big', 'red', 'square'),
  'card-big-red-triangle': () => oneCard('big', 'red', 'triangle'),
  'card-big-blue-circle': () => oneCard('big', 'blue', 'circle'),
  'card-big-blue-square': () => oneCard('big', 'blue', 'square'),
  'card-big-blue-triangle': () => oneCard('big', 'blue', 'triangle'),
  'card-big-yellow-circle': () => oneCard('big', 'yellow', 'circle'),
  'card-big-yellow-square': () => oneCard('big', 'yellow', 'square'),
  'card-big-yellow-triangle': () => oneCard('big', 'yellow', 'triangle'),
  'card-small-red-circle': () => oneCard('small', 'red', 'circle'),
  'card-small-red-square': () => oneCard('small', 'red', 'square'),
  'card-small-red-triangle': () => oneCard('small', 'red', 'triangle'),
  'card-small-blue-circle': () => oneCard('small', 'blue', 'circle'),
  'card-small-blue-square': () => oneCard('small', 'blue', 'square'),
  'card-small-blue-triangle': () => oneCard('small', 'blue', 'triangle'),
  'card-small-yellow-circle': () => oneCard('small', 'yellow', 'circle'),
  'card-small-yellow-square': () => oneCard('small', 'yellow', 'square'),
  'card-small-yellow-triangle': () => oneCard('small', 'yellow', 'triangle'),
  'rule-features': () => (
    <>
      {shapeAt('circle', C.red, 11, 32, 10)}
      {shapeAt('square', C.blue, 32, 32, 5)}
      {shapeAt('triangle', C.yellow, 52, 33, 10)}
    </>
  ),
  'rule-red-in': () => (
    <>
      {shapeAt('circle', C.red, 11, 38, 9)}
      {tick(11, 15)}
      {shapeAt('square', C.blue, 32, 38, 8, true)}
      {shapeAt('triangle', C.red, 53, 39, 9)}
      {tick(53, 15)}
    </>
  ),
  'rule-not-red': () => (
    <>
      {shapeAt('circle', C.red, 11, 32, 10, true)}
      {shapeAt('square', C.blue, 32, 32, 9)}
      {shapeAt('triangle', C.yellow, 52, 33, 10)}
    </>
  ),
  'rule-not-circle': () => (
    <>
      {shapeAt('circle', C.blue, 11, 38, 9, true)}
      {shapeAt('square', C.blue, 32, 38, 8)}
      {tick(32, 15)}
      {shapeAt('triangle', C.blue, 53, 39, 9)}
      {tick(53, 15)}
    </>
  ),
  'rule-and-join': () => (
    <>
      <path d="M9.5 21C9.5 21 2 30.5 2 35a7.5 7.5 0 0 0 15 0c0-4.5-7.5-14-7.5-14Z" fill={C.red} />
      <circle cx="28" cy="32" r="7" stroke={C.gray} strokeWidth="3.5" fill="none" />
      <path d="M37 32h7M41 28l4 4-4 4" stroke={C.gray} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="55" cy="32" r="8" fill={C.red} />
    </>
  ),
  'rule-and-only': () => (
    <>
      {shapeAt('circle', C.red, 11, 38, 9)}
      {tick(11, 15)}
      {shapeAt('square', C.red, 32, 38, 8, true)}
      {shapeAt('circle', C.blue, 53, 38, 9, true)}
    </>
  ),
  'rule-and-smaller': () => (
    <>
      <path d={LENS} fill={C.gold} />
      <circle cx="24" cy="32" r="16" stroke={C.red} strokeWidth="3.5" fill="none" />
      <circle cx="40" cy="32" r="16" stroke={C.blue} strokeWidth="3.5" fill="none" />
    </>
  ),
  'rule-two-checks': () => (
    <>
      <circle cx="17" cy="32" r="14" fill={C.green} />
      <circle cx="47" cy="32" r="14" fill={C.green} />
      <path d="M10 32l5 5 9-10M40 32l5 5 9-10" stroke={C.white} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'rule-or-join': () => (
    <>
      {shapeAt('circle', C.yellow, 18, 40, 12)}
      {tick(18, 14)}
      {shapeAt('square', C.blue, 46, 40, 11)}
      {tick(46, 14)}
    </>
  ),
  'rule-or-both': () => (
    <>
      {shapeAt('circle', C.blue, 32, 42, 18)}
      {tick(22, 12)}
      {tick(42, 12)}
    </>
  ),
  'rule-or-bigger': () => (
    <>
      <circle cx="24" cy="32" r="16" fill={C.gold} />
      <circle cx="40" cy="32" r="16" fill={C.gold} />
      <circle cx="24" cy="32" r="16" stroke={C.red} strokeWidth="3.5" fill="none" />
      <circle cx="40" cy="32" r="16" stroke={C.blue} strokeWidth="3.5" fill="none" />
    </>
  ),
  'rule-brackets': () => (
    <>
      <path d="M19 7Q4 32 19 57M45 7Q60 32 45 57" stroke={C.gold} strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="32" r="10" fill={C.red} />
    </>
  ),
  'rule-inside': () => (
    <>
      {shapeAt('circle', C.red, 11, 38, 9)}
      {tick(11, 15)}
      {shapeAt('square', C.red, 32, 38, 5, true)}
      {shapeAt('triangle', C.blue, 53, 39, 9, true)}
    </>
  ),
  'rule-not-inside': () => (
    <>
      {shapeAt('circle', C.red, 16, 17, 11, true)}
      {shapeAt('square', C.red, 48, 17, 5)}
      {shapeAt('triangle', C.blue, 16, 47, 11)}
      {shapeAt('circle', C.yellow, 48, 47, 5)}
    </>
  ),
  'rule-not-red-not-big': () => (
    <>
      {shapeAt('circle', C.yellow, 16, 17, 6)}
      {shapeAt('triangle', C.blue, 48, 17, 6)}
      {shapeAt('square', C.red, 16, 47, 5, true)}
      {shapeAt('square', C.blue, 48, 47, 11, true)}
    </>
  ),
  'rule-switch': () => (
    <>
      <path d="M12 27q20-18 38 0" stroke={C.gold} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M55 32 52.5 22.5 45.5 29.5Z" fill={C.gold} />
      <path d="M52 37q-20 18-38 0" stroke={C.sky} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M9 32 18.5 34.5 11.5 41.5Z" fill={C.sky} />
    </>
  ),
  // stop 2's count answer tiles: a ten frame with one to ten dots
  'ten-frame-1': () => tenFrame(1),
  'ten-frame-2': () => tenFrame(2),
  'ten-frame-3': () => tenFrame(3),
  'ten-frame-4': () => tenFrame(4),
  'ten-frame-5': () => tenFrame(5),
  'ten-frame-6': () => tenFrame(6),
  'ten-frame-7': () => tenFrame(7),
  'ten-frame-8': () => tenFrame(8),
  'ten-frame-9': () => tenFrame(9),
  'ten-frame-10': () => tenFrame(10),
  // stop 3 (Line Up): a tall kid and a short one; a chain tallest first; its two ends linked; crossing out
  'line-compare': () => (
    <>
      {person(22, 52, C.blue, 16)}
      {person(44, 34, C.amber, 16)}
    </>
  ),
  'line-chain': () => (
    <>
      {person(12, 52, C.blue)}
      {person(32, 42, C.blue)}
      {person(52, 32, C.blue)}
      <ellipse cx="22" cy="44" rx="5.5" ry="3" fill="none" stroke={C.gold} strokeWidth="2.5" />
      <ellipse cx="42" cy="48" rx="5.5" ry="3" fill="none" stroke={C.gold} strokeWidth="2.5" />
    </>
  ),
  'line-proof': () => (
    <>
      {person(12, 52, C.blue)}
      {person(32, 42, C.gray)}
      {person(52, 32, C.blue)}
      <path d="M15 4Q40 0 50 19" stroke={C.gold} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M45 16h10l-4 8Z" fill={C.gold} />
    </>
  ),
  'line-cross-out': () => (
    <>
      {person(12, 52, C.gold)}
      {person(32, 42, C.gray)}
      {person(52, 32, C.gray)}
      <path d="M24 26l16 20M40 26 24 46M44 34l16 18M60 34 44 52" stroke={C.red} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  // two kids each taller than the same kid; a magnifying glass; a chain beside a split
  'line-fork': () => (
    <>
      {person(10, 52, C.blue)}
      {person(54, 52, C.blue)}
      {person(32, 30, C.amber)}
      <path d="M17 24 27 32M47 24 37 32" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'line-look': () => (
    <>
      <circle cx="26" cy="26" r="15" fill={C.sky} stroke={C.gray} strokeWidth="6" />
      <path d="M37.5 37.5 55 55" stroke={C.brown} strokeWidth="8" strokeLinecap="round" />
    </>
  ),
  'line-split': () => (
    <>
      <path d="M10 10 18 32 26 54" stroke={C.green} strokeWidth="3" fill="none" />
      {[[10, 10], [18, 32], [26, 54]].map(([x, y]) => <circle key={`c${x}`} cx={x} cy={y} r="5" fill={C.green} />)}
      <path d="M38 10 47 54 56 10" stroke={C.red} strokeWidth="3" fill="none" strokeLinejoin="round" />
      {[[38, 10], [56, 10], [47, 54]].map(([x, y]) => <circle key={`f${x}`} cx={x} cy={y} r="5" fill={C.red} />)}
    </>
  ),
  // before and right before: someone in between, two side by side, the three orders of one clue
  'line-gap': () => (
    <>
      {person(12, 44, C.blue)}
      {person(32, 44, C.amber)}
      {person(52, 44, C.blue)}
    </>
  ),
  'line-pair': () => (
    <>
      {person(14, 46, C.blue)}
      {person(28, 46, C.blue)}
      {person(52, 46, C.gray)}
    </>
  ),
  'line-orders': () => (
    <>
      {[[C.blue, C.amber, C.green], [C.blue, C.green, C.amber], [C.green, C.blue, C.amber]].flatMap((row, i) =>
        row.map((fill, j) => <circle key={`${i}-${j}`} cx={14 + 18 * j} cy={14 + 18 * i} r="7" fill={fill} />),
      )}
    </>
  ),
  // must, might and can’t: true in every order, in some, in none (answer tiles), and the three side by side
  'line-must': () => <>{[12, 32, 52].map((x) => yesNoDot(x, true))}</>,
  'line-might': () => <>{[12, 32, 52].map((x) => yesNoDot(x, x !== 32))}</>,
  'line-cant': () => <>{[12, 32, 52].map((x) => yesNoDot(x, false))}</>,
  'line-all-some-none': () => (
    <>
      {[[true, true, true], [true, false, true], [false, false, false]].flatMap((col, j) =>
        col.map((yes, i) => <circle key={`${i}-${j}`} cx={14 + 18 * j} cy={14 + 18 * i} r="7" fill={yes ? C.green : C.red} />),
      )}
    </>
  ),
  'line-front': () => (
    <>
      {person(22, 40, C.blue)}
      {person(38, 40, C.blue)}
      {person(54, 40, C.blue)}
      <path d="M8 10h44M8 10l7-6M8 10l7 6" stroke={C.gold} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // spots: only the middle one left, trying one spot, two next to each other either way, one stays while two swap
  'line-middle': () => (
    <>
      <rect x="4" y="22" width="16" height="20" rx="3" fill={C.gray} />
      <rect x="24" y="22" width="16" height="20" rx="3" fill={C.green} />
      <rect x="44" y="22" width="16" height="20" rx="3" fill={C.gray} />
      <path d="M6 24l12 16M18 24 6 40M46 24l12 16M58 24 46 40" stroke={C.red} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  'line-pin': () => (
    <>
      {[4, 24, 44].map((x) => <rect key={x} x={x} y="44" width="16" height="14" rx="3" fill={C.gray} />)}
      <path d="M32 40C25 31 21 26 21 19a11 11 0 0 1 22 0c0 7-4 12-11 21Z" fill={C.red} />
      <circle cx="32" cy="19" r="4.5" fill={C.white} />
    </>
  ),
  'line-next': () => (
    <>
      {person(24, 40, C.blue, 14, 46)}
      {person(40, 40, C.blue, 14, 46)}
      <path d="M10 55h44M10 55l6-5M10 55l6 5M54 55l-6-5M54 55l-6 5" stroke={C.gold} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'line-swap': () => (
    <>
      {person(10, 40, C.gold)}
      {person(32, 40, C.blue)}
      {person(52, 40, C.blue)}
      <path d="M30 13q12-10 24 0M30 13l1-6.5M30 13l6.5 1M54 13l-1-6.5M54 13l-6.5 1" stroke={C.gold} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'line-spot-1': () => spotBadge(1),
  'line-spot-2': () => spotBadge(2),
  'line-spot-3': () => spotBadge(3),
  'line-spot-4': () => spotBadge(4),
  // building a line: spots to fill, a sure spot, the finish flag, checking each clue, a block, turning it around
  'line-slots': () => (
    <>
      {lineSlot(4)}
      {lineSlot(24)}
      {lineSlot(44)}
      {person(12, 50, C.blue)}
    </>
  ),
  'line-sure': () => (
    <>
      {lineSlot(4)}
      {lineSlot(24)}
      {lineSlot(44)}
      <path d="M52 56V8" stroke={C.dark} strokeWidth="3" strokeLinecap="round" />
      <path d="M51 8 37 14l14 6Z" fill={C.red} />
    </>
  ),
  'line-flag': () => (
    <>
      <path d="M14 6v54" stroke={C.brown} strokeWidth="4" strokeLinecap="round" />
      <rect x="16" y="8" width="40" height="30" fill={C.white} />
      {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].filter((c) => (r + c) % 2 === 0).map((c) => <rect key={`${r}-${c}`} x={16 + 10 * c} y={8 + 10 * r} width="10" height="10" fill={C.dark} />))}
    </>
  ),
  'line-checks': () => (
    <>
      <rect x="10" y="6" width="44" height="54" rx="5" fill={C.tan} />
      <path d="M18 18l4 4 8-8M36 18h12M18 32l4 4 8-8M36 32h12" stroke={C.green} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 41l9 9M28 41l-9 9M36 46h12" stroke={C.red} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
  ),
  'line-block': () => (
    <>
      <rect x="5" y="4" width="54" height="56" rx="8" fill="none" stroke={C.gold} strokeWidth="3" />
      {person(18, 48, C.blue, 13)}
      {person(32, 48, C.blue, 13)}
      {person(46, 48, C.blue, 13)}
    </>
  ),
  'line-turn': () => (
    <>
      {person(18, 34, C.blue)}
      {person(32, 34, C.blue)}
      {person(46, 34, C.blue)}
      <path d="M12 18a20 12 0 0 1 40 0" stroke={C.gold} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M47 15h10l-5 7Z" fill={C.gold} />
    </>
  ),
  // a kid clue scene: who each name is (a kid, a wizard in a pointed hat, a dragon, a robot, a blank letter tile)
  'line-who-kid': () => person(32, 50, C.blue, 18),
  'line-who-wizard': () => (
    <>
      {person(32, 44, C.purple, 18)}
      <path d="M21 16 32 1l11 15Z" fill={C.gold} />
      <rect x="17" y="14" width="30" height="4" rx="2" fill={C.gold} />
    </>
  ),
  'line-who-dragon': () => (
    <>
      <path d="M12 46 2 36l14 3Z" fill={C.green} />
      <ellipse cx="28" cy="45" rx="18" ry="11" fill={C.green} />
      <path d="M37 40 46 25l7 4-9 13Z" fill={C.green} />
      <circle cx="50" cy="23" r="8" fill={C.green} />
      <circle cx="53" cy="21" r="2" fill={C.dark} />
      <path d="M19 40 29 11l11 29Z" fill={C.teal} />
    </>
  ),
  'line-who-robot': () => (
    <>
      <path d="M32 6v7" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="5" r="3.5" fill={C.red} />
      <rect x="18" y="12" width="28" height="20" rx="4" fill={C.gray} />
      <circle cx="26" cy="22" r="3" fill={C.dark} />
      <circle cx="38" cy="22" r="3" fill={C.dark} />
      <rect x="14" y="35" width="36" height="23" rx="4" fill={C.gray} />
      <rect x="24" y="41" width="16" height="6" rx="2" fill={C.red} />
    </>
  ),
  'line-who-letter': () => (
    <>
      <rect x="10" y="10" width="44" height="44" rx="8" fill={C.tan} />
      <rect x="17" y="17" width="30" height="30" rx="5" fill="none" stroke={C.brown} strokeWidth="3" />
    </>
  ),
  // the relation a clue puts between its names: a tall bar then a short one; a long wing then a short one; a dotted
  // arrow (before: someone may be in between); a gold tile, a gap, a gray tile (left of); a solid arrow (right
  // before); two tiles touching (just left of); two side by side, either way (next to); someone between two (not next
  // to); one inside two brackets (between); a row of three spots with the first or the last lit, or crossed out
  'line-rel-taller': () => (
    <>
      <rect x="12" y="8" width="16" height="50" rx="4" fill={C.gold} />
      <rect x="36" y="32" width="16" height="26" rx="4" fill={C.gray} />
    </>
  ),
  'line-rel-longer': () => (
    <>
      <path d="M4 18h34L4 46Z" fill={C.gold} />
      <path d="M43 25h17L43 39Z" fill={C.gray} />
    </>
  ),
  'line-rel-before': () => (
    <>
      <path d="M7 32h33" stroke={C.gold} strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 9" />
      <path d="M41 19 58 32 41 45Z" fill={C.gold} />
    </>
  ),
  'line-rel-left': () => (
    <>
      <rect x="4" y="22" width="18" height="20" rx="4" fill={C.gold} />
      <path d="M28 32h9" stroke={C.gray} strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 7" />
      <rect x="42" y="22" width="18" height="20" rx="4" fill={C.gray} />
    </>
  ),
  'line-rel-right-before': () => (
    <>
      <path d="M8 32h28" stroke={C.gold} strokeWidth="8" strokeLinecap="round" />
      <path d="M35 17 57 32 35 47Z" fill={C.gold} />
    </>
  ),
  'line-rel-just-left': () => (
    <>
      <rect x="11" y="22" width="20" height="20" rx="4" fill={C.gold} />
      <rect x="33" y="22" width="20" height="20" rx="4" fill={C.gray} />
    </>
  ),
  'line-rel-next': () => (
    <>
      <rect x="12" y="10" width="18" height="24" rx="4" fill={C.blue} />
      <rect x="34" y="10" width="18" height="24" rx="4" fill={C.blue} />
      <path d="M10 48h44M10 48l7-6M10 48l7 6M54 48l-7-6M54 48l-7 6" stroke={C.gold} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'line-rel-not-next': () => (
    <>
      <rect x="4" y="20" width="16" height="24" rx="4" fill={C.blue} />
      <rect x="24" y="20" width="16" height="24" rx="4" fill={C.gray} />
      <rect x="44" y="20" width="16" height="24" rx="4" fill={C.blue} />
    </>
  ),
  'line-rel-between': () => (
    <>
      <path d="M15 12H7v40h8M49 12h8v40h-8" stroke={C.gray} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="20" width="20" height="24" rx="4" fill={C.gold} />
    </>
  ),
  'line-rel-first': () => endSlots(0),
  'line-rel-last': () => endSlots(2),
  'line-rel-not-first': () => endSlots(undefined, 0),
  'line-rel-not-last': () => endSlots(undefined, 2),
  // stop 7 (Pattern guesses): the four word tiles (every dot fits, most, one, none), then the cards' and boards' bags
  'guess-must': () => fitBag(5),
  'guess-likely': () => fitBag(4),
  'guess-unlikely': () => fitBag(1),
  'guess-cant': () => fitBag(0),
  // four red marbles drawn in a row from a bag nobody can see into
  'guess-reds': () => (
    <>
      <g transform="translate(16 1) scale(0.5)">{bagOutline(5)}</g>
      {[11, 25, 39, 53].map((x) => marble(x, 50, C.red, 6))}
    </>
  ),
  'guess-bag-six-one': () => (
    <>
      {bagOutline()}
      {BAG_SPOTS.map(([x, y], i) => marble(x, y, i === 6 ? C.blue : C.red))}
    </>
  ),
  // six circles in a row, then a square bursts out
  'guess-break': () => (
    <>
      {[[8, 24], [19, 24], [30, 24], [8, 40], [19, 40], [30, 40]].map(([x, y]) => marble(x, y, C.red))}
      <polygon points={starPoints(50, 32, 13)} fill={C.gold} />
      <rect x="44" y="26" width="12" height="12" rx="2" fill={C.blue} />
    </>
  ),
  // a red marble on its way back into the bag (still six red and one blue)
  'guess-goes-back': () => (
    <>
      <g transform="translate(4 14) scale(0.78)">
        {bagOutline(3.6)}
        {BAG_SPOTS.slice(0, 6).map(([x, y]) => marble(x, y, C.red))}
        {marble(47, 43, C.blue)}
      </g>
      {marble(54, 10, C.red)}
      <path d="M48 10Q39 6 34 12" fill="none" stroke={C.tan} strokeWidth="3" strokeLinecap="round" />
      <path d="M31.4 16.5 37.1 14.2 31.1 10.4Z" fill={C.tan} />
    </>
  ),
  // 4 red circles, 1 blue circle and 2 red squares (the worked example's bag)
  'guess-bag-example': () => (
    <>
      {bagOutline()}
      {marble(23, 31, C.red)}
      {marble(33, 31, C.red)}
      {squareAt(43, 31, C.red)}
      {marble(17, 43, C.red)}
      {marble(27, 43, C.blue)}
      {marble(37, 43, C.red)}
      {squareAt(47, 43, C.red)}
    </>
  ),
  // the twin: the 2 red squares are gone
  'guess-bag-twin': () => (
    <>
      {bagOutline()}
      {marble(23, 31, C.red)}
      {marble(33, 31, C.red)}
      {marble(43, 31, C.red)}
      {marble(27, 43, C.red)}
      {marble(37, 43, C.blue)}
    </>
  ),
  // a quiz item's kid scene: a bag you can see into (an eye on it; the things in it are drawn next to it), and a bag
  // nobody can see into (filled, with a question mark; its draws are drawn next to it)
  'guess-bag-see': () => (
    <>
      {bagOutline()}
      <path d="M17 41Q32 28 47 41Q32 54 17 41Z" fill={C.white} />
      <circle cx="32" cy="41" r="5.5" fill={C.blue} />
    </>
  ),
  'guess-bag-hidden': () => (
    <>
      <path d={BAG_D} fill={C.brown} stroke={C.tan} strokeWidth="3" strokeLinejoin="round" />
      <path d="M26.5 33a5.5 5.5 0 1 1 8.2 4.8c-2 1.2-2.7 2.4-2.7 4.7" fill="none" stroke={C.white} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="32" cy="50" r="2.4" fill={C.white} />
    </>
  ),
  // one thing of each kind: a dot of its color (marbles, socks, beads, eggs, gems), a spell card (fire, ice, star) or
  // a letter tile (A, B, C); a shape is its own card (card-big-…)
  'guess-dot-red': () => bagDot(C.red),
  'guess-dot-blue': () => bagDot(C.blue),
  'guess-dot-yellow': () => bagDot(C.yellow),
  'guess-dot-pink': () => bagDot(C.pink),
  'guess-dot-gold': () => bagDot(C.gold),
  'guess-fire': () =>
    spellCard(
      C.red,
      <>
        <path d="M32 14C38 24 44 30 44 39A12 12 0 0 1 20 39C20 30 26 24 32 14Z" fill={C.gold} />
        <path d="M32 31C35 35 37 38 37 42A5 5 0 0 1 27 42C27 38 29 35 32 31Z" fill={C.amber} />
      </>,
    ),
  'guess-ice': () => spellCard(C.blue, <path d="M32 17v30M19 24.5l26 15M19 39.5l26-15" stroke={C.white} strokeWidth="4" strokeLinecap="round" />),
  'guess-star': () => spellCard(C.purple, <polygon points={starPoints(32, 33, 14)} fill={C.gold} />),
  'guess-tile-a': () => letterTile('M22 46 32 18l10 28M26 36h12'),
  'guess-tile-b': () => letterTile('M25 18v28M25 18h7a7 7 0 0 1 0 14h-7M25 32h9a7 7 0 0 1 0 14h-9'),
  'guess-tile-c': () => letterTile('M41 22a13 13 0 1 0 0 20'),
  // stop 4 (Grid Detective)
  grid: () => miniGrid([' ggg', 'b...', 'b...', 'b...']),
  'grid-marks': () => miniGrid(['v..', '.x.', '...']),
  'grid-clue': () => (
    <>
      <rect x="4" y="5" width="24" height="18" rx="3" fill={C.gold} />
      <path d="M9 11h14M9 17h9" stroke={C.gray} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 14Q45 12 49 20" stroke={C.gold} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 26l-5.5-7h10Z" fill={C.gold} />
      {miniGrid(['.v', '..'], { x: 22, y: 28, w: 38 })}
    </>
  ),
  'grid-one-each': () => miniGrid(['v..', '.v.', '..v']),
  'grid-or': () => miniGrid(['oox'], { x: 5, y: 24, w: 54 }),
  'grid-row-left': () => miniGrid(['xxv', '...', '...']),
  'grid-col-left': () => miniGrid(['..x', '..v', '..x']),
  'grid-two-left': () => miniGrid(['xoo', '...', '...']),
  'grid-cross-one': () => miniGrid(['...', '.X.', '...']),
  'grid-col-look': () => miniGrid(['x.o', '..o', '..X']),
  'grid-count': () => miniGrid(['.o.', '.x.', '.o.']),
  'grid-spread-row': () => miniGrid(['vxx', '...', '...']),
  'grid-spread': () => miniGrid(['vxx', 'x..', 'x..']),
  'grid-col-spread': () => miniGrid(['v..', 'x..', 'x..']),
  'grid-spread-again': () => miniGrid(['vxx', 'xxv', 'x.x']),
  'grid-solved': () => miniGrid(['vxx', 'xvx', 'xxv']),
  'grid-outside': () => miniGrid(['v..', '.o.', '..o']),
  'grid-two-part': () => (
    <>
      {miniGrid(['v..', '...', '...'], { x: 3, y: 18, w: 27 })}
      {miniGrid(['...', 'v..', '...'], { x: 34, y: 18, w: 27 })}
    </>
  ),
  'grid-link': () => (
    <>
      {miniGrid(['v'], { x: 3, y: 20, w: 22 })}
      {miniGrid(['v'], { x: 39, y: 20, w: 22 })}
      {goldLink}
    </>
  ),
  'grid-link-not': () => (
    <>
      {miniGrid(['.'], { x: 3, y: 20, w: 22 })}
      {miniGrid(['x'], { x: 39, y: 20, w: 22 })}
      {goldLink}
    </>
  ),
  'grid-carry': () => (
    <>
      {miniGrid(['v.', '..'], { x: 3, y: 20, w: 22 })}
      {goldArrow(27, 37, 31)}
      {miniGrid(['v.', '..'], { x: 39, y: 20, w: 22 })}
    </>
  ),
  'grid-carry-back': () => (
    <>
      {miniGrid(['.v', '..'], { x: 3, y: 20, w: 22 })}
      {goldArrow(37, 27, 31)}
      {miniGrid(['.v', '..'], { x: 39, y: 20, w: 22 })}
    </>
  ),
  'grid-both-ways': () => (
    <>
      {miniGrid(['v'], { x: 3, y: 21, w: 20 })}
      {miniGrid(['v'], { x: 41, y: 21, w: 20 })}
      {goldArrow(25, 39, 26)}
      {goldArrow(39, 25, 38)}
    </>
  ),
  'grid-loop': () => (
    <>
      {miniGrid(['v.', '..'], { x: 19, y: 19, w: 26 })}
      <path d="M32 6a26 26 0 1 1-23.5 15" stroke={C.gold} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M10.6 16.4 12.2 24.9 3.1 20.7Z" fill={C.gold} />
    </>
  ),
  'grid-or-named': () => miniGrid(['o.o', '...', '...']),
  'grid-cross-apart': () => miniGrid(['x..', '..x', '...']),
  'grid-cross-down': () => miniGrid(['..x', '..x', '...']),
  'grid-cross-mid': () => miniGrid(['...', 'x..', '...']),
  'grid-box-1-1': () => litGrid(3, (r, c) => r === 0 && c === 0),
  'grid-box-1-2': () => litGrid(3, (r, c) => r === 0 && c === 1),
  'grid-box-1-3': () => litGrid(3, (r, c) => r === 0 && c === 2),
  'grid-box-2-1': () => litGrid(3, (r, c) => r === 1 && c === 0),
  'grid-box-2-2': () => litGrid(3, (r, c) => r === 1 && c === 1),
  'grid-box-2-3': () => litGrid(3, (r, c) => r === 1 && c === 2),
  'grid-box-3-1': () => litGrid(3, (r, c) => r === 2 && c === 0),
  'grid-box-3-2': () => litGrid(3, (r, c) => r === 2 && c === 1),
  'grid-box-3-3': () => litGrid(3, (r, c) => r === 2 && c === 2),
  'grid-row-3-1': () => litGrid(3, (r) => r === 0),
  'grid-row-3-2': () => litGrid(3, (r) => r === 1),
  'grid-row-3-3': () => litGrid(3, (r) => r === 2),
  'grid-row-4-1': () => litGrid(4, (r) => r === 0),
  'grid-row-4-2': () => litGrid(4, (r) => r === 1),
  'grid-row-4-3': () => litGrid(4, (r) => r === 2),
  'grid-row-4-4': () => litGrid(4, (r) => r === 3),
  'grid-col-3-1': () => litGrid(3, (_, c) => c === 0),
  'grid-col-3-2': () => litGrid(3, (_, c) => c === 1),
  'grid-col-3-3': () => litGrid(3, (_, c) => c === 2),
  'grid-col-4-1': () => litGrid(4, (_, c) => c === 0),
  'grid-col-4-2': () => litGrid(4, (_, c) => c === 1),
  'grid-col-4-3': () => litGrid(4, (_, c) => c === 2),
  'grid-col-4-4': () => litGrid(4, (_, c) => c === 3),
  // stop 4, kid forms: lesson 2's board marks and lesson 3's spread tiles
  ...gridAskDraw(),
  ...spreadTileDraw(),
  // stop 8 (All, Some, None)
  'rings-overlap-card': () => (
    <>
      {twoRings}
      <circle cx="32" cy="32" r="6.5" fill={C.red} />
    </>
  ),
  'ring-part-a': () => ringPart('a'),
  'ring-part-both': () => ringPart('both'),
  'ring-part-b': () => ringPart('b'),
  'ring-part-out': () => ringPart('out'),
  // The whole right ring lit, the overlap too: “in the right ring” (ring-part-b is “only in it”).
  'ring-in-b': () => (
    <>
      <circle cx="40" cy="32" r="16" fill={C.green} />
      {twoRings}
    </>
  ),
  'quant-some-all': () => (
    <>
      <ellipse cx="32" cy="27" rx="28" ry="17" stroke={C.sky} strokeWidth="3" fill="none" />
      <circle cx="17" cy="27" r="7.5" fill={C.red} />
      <circle cx="32" cy="27" r="7.5" fill={C.red} />
      <circle cx="47" cy="27" r="7.5" fill={C.red} />
      <path d="M24 53l5 5 11-11" stroke={C.green} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'rings-triangles-blue': () => (
    <>
      {twoRings}
      <path d="M32 20 36.5 28.5H27.5ZM32 31.5 36.5 40H27.5Z" fill={C.blue} strokeLinejoin="round" />
      <rect x="44" y="27.5" width="9" height="9" rx="1.5" fill={C.blue} />
    </>
  ),
  // stop 14 (First Lights): the cards' and boards' chains, and the pieces a kid chain draws as pictures
  'chain-unit': () => (
    <>
      <rect x="3" y="23" width="30" height="22" rx="4" fill="none" stroke={C.gold} strokeWidth="2.5" />
      {chainRow('tctc', 34, 6, 11, 53)}
    </>
  ),
  'chain-try': () => (
    <>
      <rect x="3" y="23" width="30" height="22" rx="4" fill="none" stroke={C.red} strokeWidth="2.5" strokeDasharray="4 3" />
      {chainRow('tcct', 34, 6, 11, 53)}
      <path d="M34 8l10 10M44 8L34 18" stroke={C.red} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  'chain-far': () => (
    <>
      {chainRow('tctc', 20, 6, 11, 53)}
      <circle cx="10" cy="46" r="2.5" fill={C.gray} />
      <circle cx="18" cy="46" r="2.5" fill={C.gray} />
      <circle cx="26" cy="46" r="2.5" fill={C.gray} />
      <path d="M31 46H41" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      <path d="M46 46l-7-5v10Z" fill={C.gray} />
      <rect x="49" y="37" width="12" height="18" rx="3" fill="none" stroke={C.gray} strokeWidth="2.5" strokeDasharray="4 3" />
    </>
  ),
  'chain-seen': () => (
    <>
      <path d="M14 18Q32 2 50 18Q32 34 14 18Z" fill="none" stroke={C.gray} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="18" r="5" fill={C.blue} />
      {chainRow('tct', 46, 6, 10, 38)}
      <rect x="47" y="37" width="12" height="18" rx="3" fill="none" stroke={C.gray} strokeWidth="2.5" strokeDasharray="4 3" />
    </>
  ),
  'chain-break': () => (
    <>
      {chainRow('tcttt', 34, 5, 8, 56)}
      <circle cx="44" cy="34" r="9" fill="none" stroke={C.red} strokeWidth="2.5" />
    </>
  ),
  'chain-end': () => (
    <>
      {chainRow('tctctt', 30, 4.2, 7, 55)}
      <circle cx="55" cy="30" r="7.5" fill="none" stroke={C.red} strokeWidth="2.5" />
      <path d="M7 46H46" stroke={C.red} strokeWidth="3" strokeLinecap="round" />
      <path d="M54 46l-8-5.5v11Z" fill={C.red} />
    </>
  ),
  'chain-mess': () => (
    <>
      <path d="M26 8l12 12M38 8L26 20" stroke={C.red} strokeWidth="3.5" strokeLinecap="round" />
      {chainRow('tcttcc', 42, 4.2, 7, 57)}
    </>
  ),
  'chain-star': () => (
    <>
      <rect x="2" y="25" width="32" height="18" rx="3" fill="none" stroke={C.gold} strokeWidth="2.5" />
      {chainRow('tcctcc', 34, 4, 8, 56)}
    </>
  ),
  'chain-twin': () => (
    <>
      {chainRow('rrcc', 21, 6, 11, 53)}
      {chainRow('rrcc', 43, 6, 11, 53)}
    </>
  ),
  'repair-part-ok': () => (
    <>
      {chainRow('tcs', 18, 7, 16, 48, true)}
      {chainRow('tcs', 46, 8, 16, 48)}
    </>
  ),
  'repair-part-break': () => (
    <>
      {chainRow('tcs', 18, 7, 16, 48, true)}
      {chainRow('tss', 46, 8, 16, 48)}
    </>
  ),
  'echo-same': () => (
    <>
      {chainRow('rcc', 16, 7, 14, 50)}
      {bellAt(14, 40, 6)}
      {bellAt(32, 46, 6.8)}
      {bellAt(50, 46, 6.8)}
    </>
  ),
  'echo-match': () => (
    <>
      <path d="M32 29Q41 12 50 29" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      {chainRow('rcc', 40, 8, 14, 50)}
    </>
  ),
  'echo-other': () => (
    <>
      <path d="M32 13Q41 2 50 13" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      {chainRow('rcc', 22, 6.5, 14, 50)}
      {chainRow('rcr', 44, 6.5, 14, 50)}
      <path d="M14 53Q32 66 50 53" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'echo-colors': () => chainRow('rccrcc', 32, 4.5, 8, 56),
  'echo-dance': () => (
    <>
      <path d="M4 60H60" stroke={C.gray} strokeWidth="2.5" strokeLinecap="round" />
      {dancer('jump', 12, 14, 0.85)}
      {dancer('jump', 32, 14, 0.85)}
      {dancer('spin', 52, 26, 0.85)}
      <path d="M8 50h8M28 50h8" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M43 31a10 4 0 1 0 18 0" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  'sound-clap': () => (
    <>
      <path d="M32 4v8M19 9l4 6M45 9l-4 6" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      <g transform="rotate(16 22 38)">
        <rect x="15" y="22" width="14" height="32" rx="7" fill={C.tan} />
        <path d="M22 29v10" stroke={C.brown} strokeWidth="2" strokeLinecap="round" />
      </g>
      <g transform="rotate(-16 42 38)">
        <rect x="35" y="22" width="14" height="32" rx="7" fill={C.tan} />
        <path d="M42 29v10" stroke={C.brown} strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  ),
  'sound-tap': () => (
    <>
      <rect x="27" y="3" width="17" height="14" rx="5" fill={C.tan} />
      <rect x="27" y="10" width="7" height="24" rx="3.5" fill={C.tan} />
      <path d="M18 34l5 4M43 34l-5 4" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      <rect x="12" y="44" width="40" height="14" rx="3" fill={C.blue} />
      <ellipse cx="32" cy="44" rx="20" ry="5" fill={C.gold} />
    </>
  ),
  'sound-stomp': () => (
    <>
      <path d="M22 8h14v28h12a7 7 0 0 1 7 7v7H22Z" fill={C.brown} />
      <path d="M6 56H58" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      <path d="M14 48l-6-4M15 41l-8-1M58 46l-3 4" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'bell-high': () => (
    <>
      {bellAt(26, 16, 9)}
      {skyArrow(52, 46, 10)}
    </>
  ),
  'bell-low': () => (
    <>
      {bellAt(26, 38, 14)}
      {skyArrow(54, 12, 54)}
    </>
  ),
  'move-jump': () => (
    <>
      <path d="M8 60H56" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      {dancer('jump', 32, 8, 1.2)}
      <path d="M22 52h20" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'move-spin': () => (
    <>
      <path d="M8 60H56" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      {dancer('spin', 32, 13, 1.3)}
      <path d="M12 34a20 7 0 1 0 40 0" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      <path d="M52 27l3 9-9-1Z" fill={C.gold} />
    </>
  ),
  'move-hop': () => (
    <>
      <path d="M8 60H56" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      {dancer('hop', 32, 10, 1.2)}
      <path d="M14 30q4-12 10-14" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'class-art': () => (
    <>
      <path d="M32 8C15 8 5 19 5 32c0 14 11 24 26 24 6 0 8-3 7-7-1-5 2-8 7-8h5c8 0 14-5 14-13C64 16 50 8 32 8ZM47 26a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z" fill={C.tan} fillRule="evenodd" />
      <circle cx="17" cy="28" r="5" fill={C.red} />
      <circle cx="27" cy="17" r="5" fill={C.blue} />
      <circle cx="41" cy="16" r="5" fill={C.red} />
      <circle cx="20" cy="42" r="5" fill={C.blue} />
    </>
  ),
  'class-gym': () => (
    <>
      <circle cx="32" cy="32" r="24" fill={C.amber} />
      <path d="M8 32h48M32 8v48M15 15c8 8 8 26 0 34M49 15c-8 8-8 26 0 34" fill="none" stroke={C.dark} strokeWidth="2.5" />
    </>
  ),
  'kid-ava': () => kidFace(C.gold, 'long', C.red),
  'kid-ben': () => kidFace(C.brown, 'short', C.blue),
  'kid-cal': () => kidFace(C.amber, 'short', C.green),
  'kid-dee': () => kidFace(C.brown, 'bun', C.purple),
  'kid-kai': () => kidFace(C.brown, 'curly', C.teal),
  'kid-lia': () => kidFace(C.amber, 'long', C.pink),
  'kid-max': () => kidFace(C.gold, 'curly', C.sky),
  'kid-mia': () => kidFace(C.red, 'bun', C.blue),
  'kid-sam': () => kidFace(C.red, 'short', C.purple),
  'kid-zoe': () => kidFace(C.gold, 'bun', C.green),
  'class-music': () => (
    <>
      <path d="M24 14l26-6v8l-26 6Z" fill={C.purple} />
      <rect x="21" y="16" width="4" height="32" fill={C.purple} />
      <rect x="46" y="10" width="4" height="32" fill={C.purple} />
      <ellipse cx="17" cy="48" rx="8" ry="6" fill={C.purple} />
      <ellipse cx="42" cy="42" rx="8" ry="6" fill={C.purple} />
    </>
  ),
  'chain-letter-k': () => letterTile(CHAIN_LETTER.k),
  'chain-letter-m': () => letterTile(CHAIN_LETTER.m),
  'chain-letter-p': () => letterTile(CHAIN_LETTER.p),
  'chain-letter-s': () => letterTile(CHAIN_LETTER.s),
  'chain-letter-t': () => letterTile(CHAIN_LETTER.t),
  'chain-letter-r': () => letterTile(CHAIN_LETTER.r),
  'chain-letter-d': () => letterTile(CHAIN_LETTER.d),
  'chain-letter-g': () => letterTile(CHAIN_LETTER.g),
  'chain-letter-n': () => letterTile(CHAIN_LETTER.n),
  'chain-letter-f': () => letterTile(CHAIN_LETTER.f),
  'chain-letter-h': () => letterTile(CHAIN_LETTER.h),
  'chain-letter-l': () => letterTile(CHAIN_LETTER.l),
  'repair-kmm-ok': () => letterPart('kmm', 'kmm'),
  'repair-kmm-break': () => letterPart('kmm', 'kmk'),
  // stop 15 (Rule Rise, Growing Staircase)
  'stair-grow': () => (
    <>
      {stairRow('ncn', 12, 7.5, 1)}
      {stairRow('nocon', 28, 7.5, 1)}
      {stairRow('noocoon', 44, 7.5, 1)}
    </>
  ),
  'stair-far': () => (
    <>
      {stairRow('oco', 6, 7.5, 1)}
      <circle cx="32" cy="22" r="2.5" fill={C.gray} />
      <circle cx="32" cy="30" r="2.5" fill={C.gray} />
      <circle cx="32" cy="38" r="2.5" fill={C.gray} />
      {/* Step 10 in full: 10 pairs and the center tile, 21 tiles (narrow, so the row fits). */}
      {Array.from({ length: 21 }, (_, i) => (
        <rect key={i} x={Math.round((0.7 + i * 3) * 10) / 10} y="44" width="2.6" height="8" rx="0.8" fill={i === 10 ? C.gold : C.blue} />
      ))}
    </>
  ),
  'stair-next': () => (
    <>
      <rect x="3" y="34" width="12" height="12" rx="2.5" fill={C.blue} />
      <rect x="21" y="34" width="12" height="12" rx="2.5" fill={C.blue} />
      <path d="M9 30Q18 16 27 30" fill="none" stroke={C.amber} strokeWidth="3" strokeLinecap="round" />
      <path d="M27.8 31.3L22.1 27.9L27.1 24.7Z" fill={C.amber} />
      <circle cx="39" cy="40" r="1.8" fill={C.gray} />
      <circle cx="44" cy="40" r="1.8" fill={C.gray} />
      <rect x="49" y="34" width="12" height="12" rx="2.5" fill="none" stroke={C.gray} strokeWidth="2" strokeDasharray="3 2.5" />
    </>
  ),
  'jump-list': () => (
    <>
      <rect x="4" y="34" width="11" height="14" rx="2.5" fill={C.blue} />
      <rect x="19" y="34" width="11" height="14" rx="2.5" fill={C.blue} />
      <rect x="34" y="34" width="11" height="14" rx="2.5" fill={C.blue} />
      <rect x="49" y="34" width="11" height="14" rx="2.5" fill={C.blue} />
      <path d="M9.5 30Q17 18 24.5 30M24.5 30Q32 18 39.5 30M39.5 30Q47 18 54.5 30" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  'stair-told': () => (
    <>
      <rect x="8" y="6" width="38" height="48" rx="4" fill={C.white} />
      <path d="M15 17h24M15 26h24M15 35h16" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      <circle cx="46" cy="46" r="12" fill={C.green} />
      <path d="M40 46l4.5 4.5L52.5 41" fill="none" stroke={C.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'stair-pairs-center': () => (
    <>
      {stairRow('oocoo', 22, 10, 2)}
      <path d="M20 35Q32 44 44 35M8 35Q32 56 56 35" fill="none" stroke={C.gray} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  'stair-add-two': () => (
    <>
      {stairRow('ooo', 8, 9, 2)}
      <path d="M32 22V34" stroke={C.gray} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 39l-5-6h10Z" fill={C.gray} />
      {stairRow('nooon', 44, 9, 2)}
    </>
  ),
  'stair-pairs-only': () => (
    <>
      {stairRow('oo_oo', 22, 10, 2)}
      <path d="M29.5 24.5l5 5M34.5 24.5l-5 5" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
      <path d="M20 35Q32 44 44 35M8 35Q32 56 56 35" fill="none" stroke={C.gray} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  'stair-times': () => (
    <>
      {stairRow('oco', 8, 9, 2)}
      {stairRow('oco', 27, 9, 2)}
      {stairRow('oco', 46, 9, 2)}
    </>
  ),
  circle: () => <circle cx="32" cy="32" r="24" fill={C.red} />,
  square: () => <rect x="10" y="10" width="44" height="44" rx="3" fill={C.blue} />,
  triangle: () => <path d="M32 8 58 54H6Z" fill={C.yellow} strokeLinejoin="round" />,
  tower: () => (
    <>
      <path d="M33 14V3l9 3-9 3" fill={C.red} stroke={C.red} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 14h6v6h5v-6h6v6h5v-6h6v45H18Z" fill={C.gray} />
      <path d="M27 59V49a5 5 0 0 1 10 0v10Z" fill={C.dark} />
      <rect x="29" y="29" width="6" height="9" rx="3" fill={C.dark} />
    </>
  ),
  bridge: () => (
    <>
      <path d="M6 24V14M20 24V14M34 24V14M48 24V14M58 24V14M6 15h52" stroke={C.gold} strokeWidth="3" strokeLinecap="round" />
      <path d="M4 24h56v32h-7a21 21 0 0 0-42 0H4Z" fill={C.amber} />
      <path d="M14 56q4-3 8 0t8 0 8 0 8 0 8 0" stroke={C.blue} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  castle: () => (
    <>
      <path d="M13 12V4l7 2.5-7 2.5M51 12V4l7 2.5-7 2.5" fill={C.gold} stroke={C.gold} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 12h4v4h3v-4h4v4h3v-4h4v18h16V12h4v4h3v-4h4v4h3v-4h4v46H6Z" fill={C.purple} />
      <path d="M25 58V46a7 7 0 0 1 14 0v12Z" fill={C.dark} />
      <rect x="11" y="26" width="5" height="8" rx="2.5" fill={C.dark} />
      <rect x="48" y="26" width="5" height="8" rx="2.5" fill={C.dark} />
    </>
  ),
  lighthouse: () => (
    <>
      <path d="M23 18 8 13v10ZM41 18l15-5v10Z" fill={C.gold} />
      <path d="M24 58 28 22h8l4 36Z" fill={C.white} />
      <path d="M26.7 34h10.6l.9 9H25.8Z" fill={C.red} />
      <path d="M25.3 47h13.4l.9 9H24.4Z" fill={C.red} />
      <rect x="27" y="14" width="10" height="8" fill={C.gold} />
      <path d="M24 14 32 6l8 8Z" fill={C.red} />
    </>
  ),
  tent: () => (
    <>
      <path d="M32 8V3" stroke={C.teal} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 8 58 56H6Z" fill={C.teal} strokeLinejoin="round" />
      <path d="M32 26 42 56H22Z" fill={C.dark} />
    </>
  ),
  mill: () => (
    <>
      <path d="M23 58 27 26h10l4 32Z" fill={C.amber} />
      <path d="M28 58v-8a4 4 0 0 1 8 0v8Z" fill={C.dark} />
      <path d="M32 24 13 5M32 24 51 5M32 24 13 43M32 24 51 43" stroke={C.white} strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="32" cy="24" r="4" fill={C.dark} />
    </>
  ),
};

export interface PictogramProps {
  name: Picto;
  /** Width and height in px. Default 64; 44 is the smallest a tile uses. */
  size?: number;
  /** The name a screen reader hears. Default: the picture's spoken name. */
  label?: string;
  /** Inside a control or next to words that already name it: hidden from screen readers. */
  decorative?: boolean;
  className?: string;
}

/** One pictogram: an image named by its words, or a decorative picture inside a labelled control. */
export function Pictogram({ name, size = 64, label, decorative = false, className }: PictogramProps) {
  const draw = DRAW[name];
  return (
    <svg
      className={`kid-picto${className ? ` ${className}` : ''}`}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      {...(decorative ? { 'aria-hidden': true, focusable: false } : { role: 'img', 'aria-label': label ?? PICTO_WORDS[name] })}
      data-picto={name}
    >
      {draw ? draw() : null}
    </svg>
  );
}
