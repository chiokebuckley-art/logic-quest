/**
 * Rings around shape cards (All, Some, None): one ring, two that overlap, or three that overlap, each named by its
 * feature, with every card drawn as a small shape in its part. A still frame in SVG, 320 units wide. Every label is 16
 * units (the legend 14), so it stays at 12 px or more when the picture is drawn at phone width. The picture is also
 * read in words (ringsSpeech).
 *
 * Places for the cards (the engine never puts more in a part, see RING_CAP and RING3_CAP in engine/puzzles):
 *  two rings: 4 only in the first ring, 3 in the overlap, 4 only in the second ring, 7 outside (a row under the rings);
 *  three rings: 2 only in each ring, 1 in each overlap of two, 1 in all three, 7 outside (a row under the rings);
 *  one ring: 5 inside and 6 outside (a block to its right). Cards not placed yet sit in a row of their own, under it all.
 *
 * Crossed parts (a given rules them out) are drawn gray with stripes; starred parts (a card must be there) get a star.
 * A links picture draws two groups as rings side by side, with a line between each pair (kids and their friends).
 */
import { useId } from 'react';
import type { Color, RingLinks, RingPart, Scene, Thing } from '../../engine/types';
import { ringsSpeech } from '../speech';
import '../../styles/rings.css';

type RingsData = Extract<Scene, { kind: 'rings' }>;

const FILL: Record<Color, string> = { red: '#ff4d6d', blue: '#3b82f6', yellow: '#facc15' };
const RING_A = '#22e6ff';
const RING_B = '#ffc93c';
const RING_C = '#c084fc';
const LABEL = 16;
const SMALL = 14;
const ROW_STEP = 32;

type Spot = readonly [number, number];

/** Two rings: centers at x 116 and 204, y 112, radius 84. The overlap runs from x 120 to x 200. */
const TWO = {
  a: [[62, 92], [62, 134], [94, 70], [94, 154]] as Spot[],
  both: [[160, 112], [160, 74], [160, 150]] as Spot[],
  b: [[258, 92], [258, 134], [226, 70], [226, 154]] as Spot[],
};
const TWO_RINGS = [{ cx: 116, cy: 112, r: 84 }, { cx: 204, cy: 112, r: 84 }];
/** Three rings: centers (124, 104), (196, 104) and (160, 166), radius 70. Each spot sits well inside its part. */
const THREE: Record<Exclude<RingPart, 'out'>, Spot[]> = {
  a: [[84, 86], [92, 112]],
  both: [[160, 70]],
  b: [[236, 86], [228, 112]],
  ac: [[116, 152]],
  abc: [[160, 126]],
  bc: [[204, 152]],
  c: [[140, 214], [180, 214]],
};
const THREE_RINGS = [{ cx: 124, cy: 104, r: 70 }, { cx: 196, cy: 104, r: 70 }, { cx: 160, cy: 166, r: 70 }];
/** Which rings each part is inside (ring 1, ring 2, ring 3). */
const INSIDE: Record<RingPart, [boolean, boolean, boolean]> = {
  a: [true, false, false],
  both: [true, true, false],
  b: [false, true, false],
  c: [false, false, true],
  ac: [true, false, true],
  bc: [false, true, true],
  abc: [true, true, true],
  out: [false, false, false],
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

/** A labelled row of cards under the picture: the cards outside every ring, or the cards still to place. */
function Row({ label, things, y, marked }: { label: string; things: readonly Thing[]; y: number; marked: readonly string[] }) {
  const spots: Spot[] = things.map((_, i) => [100 + i * ROW_STEP, y]);
  return (
    <g>
      <text x={8} y={y + 5} fontSize={LABEL} fontWeight={700} fill="currentColor" className="play-rings-row">{label}</text>
      <Cards things={things} spots={spots} marked={marked} />
    </g>
  );
}

/** A five-point star: a part where a given puts at least one card. */
function Star({ at }: { at: Spot }) {
  const [x, y] = at;
  const pts = Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 ? 5 : 12;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return <polygon points={pts} fill="#ffc93c" stroke="rgba(11, 16, 32, 0.7)" strokeWidth={1.2} strokeLinejoin="round" />;
}

type Ring = { cx: number; cy: number; r: number };

/**
 * The crossed parts, drawn gray with stripes: each part is the rings it is inside (clipped one by one), minus the rings
 * it is outside (masked out). `uid` keeps the ids apart when two pictures share a page.
 */
function CrossedParts({ uid, rings, parts, width, height }: { uid: string; rings: Ring[]; parts: readonly RingPart[]; width: number; height: number }) {
  if (!parts.length) return null;
  return (
    <>
      <defs>
        <pattern id={`${uid}-stripe`} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={8} height={8} fill="rgba(148, 160, 190, 0.35)" />
          <line x1={0} y1={0} x2={0} y2={8} stroke="rgba(148, 160, 190, 0.85)" strokeWidth={3} />
        </pattern>
        {rings.map((g, i) => (
          <clipPath key={i} id={`${uid}-clip${i}`}>
            <circle cx={g.cx} cy={g.cy} r={g.r} />
          </clipPath>
        ))}
        {parts.map((p) => (
          <mask key={p} id={`${uid}-mask-${p}`}>
            <rect width={width} height={height} fill="white" />
            {rings.map((g, i) => (!INSIDE[p][i] ? <circle key={i} cx={g.cx} cy={g.cy} r={g.r} fill="black" /> : null))}
          </mask>
        ))}
      </defs>
      {parts.map((p) => {
        let shape = <rect width={width} height={height} fill={`url(#${uid}-stripe)`} mask={`url(#${uid}-mask-${p})`} />;
        rings.forEach((_, i) => {
          if (INSIDE[p][i]) shape = <g clipPath={`url(#${uid}-clip${i})`}>{shape}</g>;
        });
        return <g key={p}>{shape}</g>;
      })}
    </>
  );
}

/** The key under a picture with crossed or starred parts. */
function Legend({ y, uid, crossed, starred }: { y: number; uid: string; crossed: boolean; starred: boolean }) {
  return (
    <g fontSize={SMALL} fill="currentColor" className="play-rings-row">
      {crossed && (
        <>
          <rect x={10} y={y - 12} width={16} height={16} fill={`url(#${uid}-stripe)`} stroke="rgba(148, 160, 190, 0.85)" />
          <text x={34} y={y + 1}>Gray: no card can be here.</text>
        </>
      )}
      {starred && (
        <>
          <Star at={[18, crossed ? y + 26 : y - 4]} />
          <text x={34} y={(crossed ? y + 26 : y - 4) + 5}>Star: a card must be here.</text>
        </>
      )}
    </g>
  );
}

/** A links picture: per frame, two rings side by side with the names in them and a line between each pair. */
function LinksPicture({ scene, labelId }: { scene: RingsData; labelId?: string }) {
  const frames = scene.links ?? [];
  const [nameL, nameR] = scene.rings;
  const STEP = 30;
  const LX = 80, RX = 240, PILL = 92;
  let y = 8;
  const drawn = frames.map((f: RingLinks, k) => {
    const top = y;
    const head = f.name ? 22 : 0;
    const n = Math.max(f.left.length, f.right.length);
    const rowsTop = top + head + 26;
    const rowY = (i: number, len: number) => rowsTop + (n - len) * (STEP / 2) + i * STEP + 14;
    const bottom = rowsTop + n * STEP + 6;
    y = bottom + 14;
    return (
      <g key={k}>
        {f.name && <text x={8} y={top + 16} fontSize={LABEL} fontWeight={800} fill="currentColor">{f.name}</text>}
        <text x={LX} y={top + head + 16} fontSize={LABEL} fontWeight={800} fill={RING_A} textAnchor="middle">{nameL}</text>
        <text x={RX} y={top + head + 16} fontSize={LABEL} fontWeight={800} fill={RING_B} textAnchor="middle">{nameR ?? ''}</text>
        <rect x={LX - PILL / 2 - 10} y={rowsTop - 6} width={PILL + 20} height={bottom - rowsTop + 6} rx={26} fill="rgba(34, 230, 255, 0.08)" stroke={RING_A} strokeWidth={2.5} />
        <rect x={RX - PILL / 2 - 10} y={rowsTop - 6} width={PILL + 20} height={bottom - rowsTop + 6} rx={26} fill="rgba(255, 201, 60, 0.08)" stroke={RING_B} strokeWidth={2.5} />
        {f.lines.map(([l, r], i) => (
          <line key={`l${i}`} x1={LX + PILL / 2} y1={rowY(l, f.left.length)} x2={RX - PILL / 2} y2={rowY(r, f.right.length)} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        ))}
        {f.left.map((nm, i) => (
          <g key={`a${i}`}>
            <rect x={LX - PILL / 2} y={rowY(i, f.left.length) - 12} width={PILL} height={24} rx={12} fill="rgba(11, 16, 32, 0.55)" stroke={RING_A} strokeWidth={1.5} />
            <text x={LX} y={rowY(i, f.left.length) + 5} fontSize={LABEL} fontWeight={700} fill="currentColor" textAnchor="middle">{nm}</text>
          </g>
        ))}
        {f.right.map((nm, i) => (
          <g key={`b${i}`}>
            <rect x={RX - PILL / 2} y={rowY(i, f.right.length) - 12} width={PILL} height={24} rx={12} fill="rgba(11, 16, 32, 0.55)" stroke={RING_B} strokeWidth={1.5} />
            <text x={RX} y={rowY(i, f.right.length) + 5} fontSize={LABEL} fontWeight={700} fill="currentColor" textAnchor="middle">{nm}</text>
          </g>
        ))}
      </g>
    );
  });
  const height = Math.max(y - 6, 60);
  const words = ringsSpeech(scene).filter((l) => l !== scene.caption);
  return (
    <figure className="play-scene play-rings" id={labelId}>
      <svg className="play-rings-svg" viewBox={`0 0 320 ${height}`} role="img" aria-label={words.join(' ')}>
        {drawn}
      </svg>
      {scene.caption && <figcaption className="play-rings-cap">{scene.caption}</figcaption>}
    </figure>
  );
}

export function RingsPicture({ scene, labelId }: { scene: RingsData; labelId?: string }) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  if (scene.links) return <LinksPicture scene={scene} labelId={labelId} />;
  const [nameA, nameB, nameC] = scene.rings;
  const marked = scene.marked ?? [];
  const loose = scene.loose ?? [];
  const crossed = scene.crossed ?? [];
  const starred = scene.starred ?? [];
  const three = nameC !== undefined;
  const two = nameB !== undefined && !three;
  // Rows under the rings: the cards outside (two or three rings; one ring keeps them to its right), then the cards to
  // place, then the key. Two rings end at y 196, three at y 244 (with the third ring's name); each row is 42 high.
  const ringsEnd = three ? 270 : 222;
  let next = ringsEnd;
  const outRow = (two || three) && scene.out.length ? next : null;
  if (outRow !== null) next += 42;
  const looseRow = loose.length ? next : null;
  if (looseRow !== null) next += 42;
  const legendRow = crossed.length || starred.length ? next : null;
  if (legendRow !== null) next += crossed.length && starred.length ? 56 : 30;
  const height = next === ringsEnd ? ringsEnd - 18 : next - 20;
  const rings: Ring[] = three ? THREE_RINGS : two ? TWO_RINGS : [{ cx: 130, cy: 112, r: 84 }];
  const spotOf = (p: RingPart): Spot | undefined =>
    p === 'out' ? undefined : three ? THREE[p][0] : two && (p === 'a' || p === 'both' || p === 'b') ? TWO[p][0] : !two && p === 'a' ? ONE.a[0] : undefined;
  const words = ringsSpeech(scene).filter((l) => l !== scene.caption);
  return (
    <figure className="play-scene play-rings" id={labelId}>
      <svg className="play-rings-svg" viewBox={`0 0 320 ${height}`} role="img" aria-label={words.join(' ')}>
        <CrossedParts uid={uid} rings={rings} parts={crossed} width={320} height={height} />
        {three ? (
          <>
            <circle cx={124} cy={104} r={70} fill="rgba(34, 230, 255, 0.06)" stroke={RING_A} strokeWidth={3} />
            <circle cx={196} cy={104} r={70} fill="rgba(255, 201, 60, 0.06)" stroke={RING_B} strokeWidth={3} />
            <circle cx={160} cy={166} r={70} fill="rgba(192, 132, 252, 0.06)" stroke={RING_C} strokeWidth={3} />
            <text x={14} y={22} fontSize={LABEL} fontWeight={800} fill={RING_A}>{nameA}</text>
            <text x={306} y={22} fontSize={LABEL} fontWeight={800} fill={RING_B} textAnchor="end">{nameB}</text>
            <text x={306} y={248} fontSize={LABEL} fontWeight={800} fill={RING_C} textAnchor="end">{nameC}</text>
            {(['a', 'both', 'b', 'ac', 'abc', 'bc', 'c'] as const).map((p) => (
              <Cards key={p} things={(p === 'a' || p === 'both' || p === 'b' ? scene[p] : scene[p] ?? [])} spots={THREE[p]} marked={marked} />
            ))}
          </>
        ) : two ? (
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
        {starred.map((p) => {
          const at = spotOf(p);
          return at ? <Star key={p} at={at} /> : null;
        })}
        {outRow !== null && <Row label="Outside" things={scene.out} y={outRow} marked={marked} />}
        {looseRow !== null && <Row label="To place" things={loose} y={looseRow} marked={marked} />}
        {legendRow !== null && <Legend y={legendRow} uid={uid} crossed={crossed.length > 0} starred={starred.length > 0} />}
      </svg>
      {scene.caption && <figcaption className="play-rings-cap">{scene.caption}</figcaption>}
    </figure>
  );
}
