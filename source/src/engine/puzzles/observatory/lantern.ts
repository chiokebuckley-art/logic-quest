/**
 * The circle-regions picture and its safeguard (handoff §3 C and acceptance check 9): joining every pair of n points
 * on a circle gives at most 1, 2, 4, 8, 16, 31 regions, and the maximum needs no three chords through one inside
 * point. A regular hexagon has three long diagonals through the centre and gives 30, so it is never labelled 31.
 * Owned by the Ring 4 builder; the core only needs the geometry for the scene.
 */
import type { LanternFrame, LanternScene } from '../../scenes/lantern';

export interface Pt { x: number; y: number }

/** Points on the unit circle: evenly spaced (regular), or nudged so no three chords meet (general position). */
export function lanternPoints(n: number, regular: boolean): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    // The nudge grows with i, so no two chords share a crossing point for n ≤ 6.
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (regular ? 0 : 0.17 * Math.sin(i * 2.3 + 0.7));
    out.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return out;
}

function cross(o: Pt, a: Pt, b: Pt): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}
function intersection(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den;
  const u = -((a.x - b.x) * (a.y - c.y) - (a.y - b.y) * (a.x - c.x)) / den;
  if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

/** Every chord between the points, as index pairs. */
export function allChords(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
}

/** The inside crossing points of all chords, merged when they coincide. Each with how many chords pass through it. */
export function crossings(pts: Pt[]): { p: Pt; chords: number }[] {
  const ch = allChords(pts.length);
  const found: { p: Pt; set: Set<string> }[] = [];
  for (let i = 0; i < ch.length; i++) {
    for (let j = i + 1; j < ch.length; j++) {
      const [a, b] = ch[i], [c, d] = ch[j];
      if (a === c || a === d || b === c || b === d) continue;
      const x = intersection(pts[a], pts[b], pts[c], pts[d]);
      if (!x) continue;
      const near = found.find((f) => Math.hypot(f.p.x - x.x, f.p.y - x.y) < 1e-6);
      if (near) { near.set.add(`${a}-${b}`); near.set.add(`${c}-${d}`); } else found.push({ p: x, set: new Set([`${a}-${b}`, `${c}-${d}`]) });
    }
  }
  return found.map((f) => ({ p: f.p, chords: f.set.size }));
}

/** True when some inside point has three or more chords through it (then the region count is below the maximum). */
export function threeChordsMeet(pts: Pt[]): boolean {
  return crossings(pts).some((c) => c.chords >= 3);
}

/**
 * The number of regions the chords cut the disc into, by Euler's formula on the planar graph: V − E + F = 2, with
 * F − 1 inside regions. V = points + crossing points; E = arcs + chord pieces (a chord with m crossings is m + 1 pieces).
 */
export function regionsOf(pts: Pt[]): number {
  const n = pts.length;
  if (n <= 1) return 1;
  const xs = crossings(pts);
  const V = n + xs.length;
  // Each crossing point with c chords through it splits each of those chords once more.
  let chordPieces = 0;
  for (const [a, b] of allChords(n)) {
    const through = xs.filter((x) => Math.abs(cross(pts[a], pts[b], x.p)) < 1e-6 && Math.min(pts[a].x, pts[b].x) - 1e-6 <= x.p.x && x.p.x <= Math.max(pts[a].x, pts[b].x) + 1e-6 && Math.min(pts[a].y, pts[b].y) - 1e-6 <= x.p.y && x.p.y <= Math.max(pts[a].y, pts[b].y) + 1e-6).length;
    chordPieces += through + 1;
  }
  const E = n + chordPieces;
  const F = 2 - V + E;
  return F - 1;
}

/** The maximum for n points in general position: C(n,4) + C(n,2) + 1. */
export function maxRegions(n: number): number {
  const c = (k: number) => (n < k ? 0 : [1, n, (n * (n - 1)) / 2, (n * (n - 1) * (n - 2)) / 6, (n * (n - 1) * (n - 2) * (n - 3)) / 24][k]);
  return c(4) + c(2) + 1;
}

/** Acceptance check 9: a 31-region label is allowed only when no three chords meet. */
export function mayLabel31(pts: Pt[]): boolean {
  return pts.length === 6 && !threeChordsMeet(pts) && regionsOf(pts) === 31;
}

// ---------- the lantern scene: what shows at a step, and the safeguard on every frame ----------


/** The picture a lantern scene shows once `shown` steps are showing: the scene with frames[0..shown) merged in order. */
export type LanternView = Omit<LanternScene, 'steps' | 'frames'>;

export function lanternAt(scene: LanternScene, shown: number): LanternView {
  const { steps: _steps, frames, ...base } = scene;
  let view: LanternView = { ...base };
  for (const f of (frames ?? []).slice(0, Math.max(0, shown))) view = { ...view, ...(f as LanternFrame) };
  return view;
}

/**
 * The count a circle picture may show: the drawing's own count (computed from the chords), never a 31 when three
 * chords meet. No circle (a claim card) or a hidden count: undefined.
 */
export function shownRegions(view: LanternView): number | undefined {
  if (view.points <= 0 || view.hideCount) return undefined;
  const pts = lanternPoints(view.points, !!view.regular);
  if (!view.chords) return 1;
  const n = regionsOf(pts);
  // regionsOf already gives 30 for the regular hexagon; this guard keeps a 31 off any drawing where three chords meet.
  return n === 31 && !mayLabel31(pts) ? undefined : n;
}

/**
 * Every problem with a lantern scene, at every step: a stated count that is not the drawing's own count, and a 31
 * on a drawing where three chords meet (acceptance check 9). Content must pass with no problems.
 */
export function lanternProblems(scene: LanternScene): string[] {
  const out: string[] = [];
  const frames = scene.frames ?? [];
  if (frames.length > (scene.steps?.length ?? 0)) out.push('more frames than steps');
  for (let shown = 0; shown <= frames.length; shown++) {
    const v = lanternAt(scene, shown);
    const at = `step ${shown}`;
    if (!Number.isInteger(v.points) || v.points < 0 || v.points > 6) out.push(`${at}: ${v.points} points`);
    if (v.points === 0) {
      if (v.regions !== undefined) out.push(`${at}: a count on a claim card`);
      continue;
    }
    const pts = lanternPoints(v.points, !!v.regular);
    const meet = v.chords && threeChordsMeet(pts);
    if (v.regions !== undefined) {
      const real = v.chords ? regionsOf(pts) : 1;
      if (v.regions !== real) out.push(`${at}: says ${v.regions} regions, the drawing has ${real}`);
      if (v.regions === 31 && (meet || v.regular || !mayLabel31(pts))) out.push(`${at}: a 31 label where three chords meet`);
    }
    if (v.sequence?.length && v.chords && !v.hideCount) {
      // The sequence so far ends with this drawing's count (the counts for 1, 2, … points).
      const last = v.sequence[v.sequence.length - 1];
      const real = regionsOf(pts);
      if (v.sequence.length === v.points && last !== real) out.push(`${at}: the sequence ends with ${last}, the drawing has ${real}`);
    }
  }
  return out;
}
