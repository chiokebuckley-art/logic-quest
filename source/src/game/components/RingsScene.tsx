/**
 * Rings around shape cards (All, Some, None): one ring, or two that overlap, each named by its feature, with every card
 * drawn as a small shape in its part. A still frame in SVG, 320 units wide. Every label is 16 units, so it stays at
 * 12 px or more when the picture is drawn at phone width. The picture is also read in words (ringsSpeech).
 *
 * Places for the cards (the engine never puts more in a part, see RING_CAP in engine/puzzles/quantifiers.ts):
 *  two rings: 4 only in the first ring, 3 in the overlap, 4 only in the second ring, 7 outside (a row under the rings);
 *  one ring: 5 inside and 6 outside (a block to its right). Cards not placed yet sit in a row of their own, under it all.
 */
import type { Color, Scene, Thing } from '../../engine/types';
import { ringsSpeech } from '../speech';
import '../../styles/rings.css';

type RingsData = Extract<Scene, { kind: 'rings' }>;

const FILL: Record<Color, string> = { red: '#ff4d6d', blue: '#3b82f6', yellow: '#facc15' };
const RING_A = '#22e6ff';
const RING_B = '#ffc93c';
const LABEL = 16;
const ROW_STEP = 32;

type Spot = readonly [number, number];

/** Two rings: centers at x 116 and 204, y 112, radius 84. The overlap runs from x 120 to x 200. */
const TWO = {
  a: [[62, 92], [62, 134], [94, 70], [94, 154]] as Spot[],
  both: [[160, 112], [160, 74], [160, 150]] as Spot[],
  b: [[258, 92], [258, 134], [226, 70], [226, 154]] as Spot[],
};
/** One ring: center x 130, y 112, radius 84; the outside block sits to its right. */
const ONE = {
  a: [[130, 112], [100, 84], [160, 84], [100, 140], [160, 140]] as Spot[],
  out: [[252, 74], [288, 74], [252, 112], [288, 112], [252, 150], [288, 150]] as Spot[],
};

/** One card as a small shape: big shapes are larger than small ones, as on the cards. */
function Mini({ t, at }: { t: Thing; at: Spot }) {
  const [x, y] = at;
  const r = t.size === 'big' ? 13 : 8;
  const common = { fill: FILL[t.color], stroke: 'rgba(11, 16, 32, 0.6)', strokeWidth: 1.5 };
  switch (t.shape) {
    case 'circle':
      return <circle cx={x} cy={y} r={r} {...common} />;
    case 'square':
      return <rect x={x - r * 0.9} y={y - r * 0.9} width={r * 1.8} height={r * 1.8} rx={2} {...common} />;
    case 'triangle':
      return <polygon points={`${x},${y - r} ${x + r},${y + r * 0.85} ${x - r},${y + r * 0.85}`} strokeLinejoin="round" {...common} />;
  }
}

/** Cards on their spots; a card past the last spot shares the last one (the engine keeps parts within their spots). */
function Cards({ things, spots, marked }: { things: readonly Thing[]; spots: readonly Spot[]; marked: readonly string[] }) {
  return (
    <>
      {things.map((t, i) => {
        const at = spots[Math.min(i, spots.length - 1)];
        return (
          <g key={t.id}>
            <Mini t={t} at={at} />
            {marked.includes(t.id) && <circle cx={at[0]} cy={at[1]} r={20} fill="none" stroke="#ffc93c" strokeWidth={2.5} strokeDasharray="4 3" />}
          </g>
        );
      })}
    </>
  );
}

/** A labelled row of cards under the picture: the cards outside both rings, or the cards still to place. */
function Row({ label, things, y, marked }: { label: string; things: readonly Thing[]; y: number; marked: readonly string[] }) {
  const spots: Spot[] = things.map((_, i) => [100 + i * ROW_STEP, y]);
  return (
    <g>
      <text x={8} y={y + 5} fontSize={LABEL} fontWeight={700} fill="currentColor" className="play-rings-row">{label}</text>
      <Cards things={things} spots={spots} marked={marked} />
    </g>
  );
}

export function RingsPicture({ scene, labelId }: { scene: RingsData; labelId?: string }) {
  const [nameA, nameB] = scene.rings;
  const marked = scene.marked ?? [];
  const loose = scene.loose ?? [];
  const two = nameB !== undefined;
  // Rows under the rings: the cards outside (two rings only; one ring keeps them to its right), then the cards to place.
  // The rings end at y 196; each row is 42 high, its cards centered on it.
  let next = 222;
  const outRow = two && scene.out.length ? next : null;
  if (outRow !== null) next += 42;
  const looseRow = loose.length ? next : null;
  if (looseRow !== null) next += 42;
  const height = next === 222 ? 204 : next - 20;
  const words = ringsSpeech(scene).filter((l) => l !== scene.caption);
  return (
    <figure className="play-scene play-rings" id={labelId}>
      <svg className="play-rings-svg" viewBox={`0 0 320 ${height}`} role="img" aria-label={words.join(' ')}>
        {two ? (
          <>
            <circle cx={116} cy={112} r={84} fill="rgba(34, 230, 255, 0.08)" stroke={RING_A} strokeWidth={3} />
            <circle cx={204} cy={112} r={84} fill="rgba(255, 201, 60, 0.08)" stroke={RING_B} strokeWidth={3} />
            <text x={24} y={20} fontSize={LABEL} fontWeight={800} fill={RING_A}>{nameA}</text>
            <text x={296} y={20} fontSize={LABEL} fontWeight={800} fill={RING_B} textAnchor="end">{nameB}</text>
            <Cards things={scene.a} spots={TWO.a} marked={marked} />
            <Cards things={scene.both} spots={TWO.both} marked={marked} />
            <Cards things={scene.b} spots={TWO.b} marked={marked} />
          </>
        ) : (
          <>
            <circle cx={130} cy={112} r={84} fill="rgba(34, 230, 255, 0.08)" stroke={RING_A} strokeWidth={3} />
            <text x={46} y={20} fontSize={LABEL} fontWeight={800} fill={RING_A}>{nameA}</text>
            <text x={270} y={44} fontSize={LABEL} fontWeight={700} fill="currentColor" textAnchor="middle" className="play-rings-row">Outside</text>
            <Cards things={scene.a} spots={ONE.a} marked={marked} />
            <Cards things={scene.out} spots={ONE.out} marked={marked} />
          </>
        )}
        {outRow !== null && <Row label="Outside" things={scene.out} y={outRow} marked={marked} />}
        {looseRow !== null && <Row label="To place" things={loose} y={looseRow} marked={marked} />}
      </svg>
      {scene.caption && <figcaption className="play-rings-cap">{scene.caption}</figcaption>}
    </figure>
  );
}
