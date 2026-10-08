/**
 * The Pattern Observatory's sky map: ten places in four rings, drawn as stars. A lit star is a done place, a ringed
 * star is open, a dim one waits on a skill. Until the constellation art exists this is a small SVG; it is tappable
 * and every star has a name for screen readers.
 */
import type { LessonDef, StopDef } from '../../engine/types';

export interface MapPlace {
  stop: StopDef;
  lesson: LessonDef;
  state: 'done' | 'open' | 'locked' | 'mastered';
  title: string;
}

/** Positions of the ten places (ring by ring, left to right), on a 200 × 130 canvas. */
const SPOTS: [number, number][] = [
  [28, 108], [60, 96], [92, 112], // Ring 1
  [52, 68], [96, 78], [136, 86], // Ring 2
  [86, 40], [128, 48], [166, 62], // Ring 3
  [170, 22], // Ring 4
];
const RINGS: { cx: number; cy: number; r: number; label: string; x: number; y: number }[] = [
  { cx: 60, cy: 104, r: 36, label: 'Ring 1', x: 8, y: 126 },
  { cx: 95, cy: 78, r: 48, label: 'Ring 2', x: 8, y: 70 },
  { cx: 127, cy: 48, r: 46, label: 'Ring 3', x: 60, y: 14 },
  { cx: 170, cy: 22, r: 16, label: 'Ring 4', x: 150, y: 8 },
];
const STARS: [number, number][] = [[12, 20], [40, 12], [120, 8], [190, 40], [18, 60], [182, 104], [140, 120], [70, 26], [110, 124], [196, 76]];

export function ObservatoryMap({ places, onPick }: { places: MapPlace[]; onPick(stopId: string, lessonId: string): void }) {
  return (
    <svg className="play-ob-map" viewBox="0 0 200 130" role="group" aria-label="The Pattern Observatory map: ten places in four rings">
      {STARS.map(([x, y], i) => <circle key={i} className="star" cx={x} cy={y} r={i % 3 === 0 ? 1.1 : 0.7} />)}
      {RINGS.map((r) => (
        <g key={r.label}>
          <circle className="ring" cx={r.cx} cy={r.cy} r={r.r} />
          <text x={r.x} y={r.y}>{r.label}</text>
        </g>
      ))}
      {places.slice(0, SPOTS.length).map((p, i) => {
        const [x, y] = SPOTS[i];
        return (
          <g key={p.lesson.id} className="play-ob-map-place" role="button" tabIndex={0} aria-label={`${p.title}: ${p.state === 'locked' ? 'waits on a skill' : p.state}`} onClick={() => onPick(p.stop.id, p.lesson.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p.stop.id, p.lesson.id); } }} style={{ cursor: 'pointer' }}>
            <circle className={`node is-${p.state}`} cx={x} cy={y} r="7" />
            <text x={x} y={y + 1.8} textAnchor="middle" style={{ fontSize: 5, fill: p.state === 'done' || p.state === 'mastered' ? '#0a0d2a' : undefined }}>{i + 1}</text>
            <text x={x} y={y + 13} textAnchor="middle">{p.title.length > 14 ? `${p.title.slice(0, 13)}…` : p.title}</text>
          </g>
        );
      })}
    </svg>
  );
}
