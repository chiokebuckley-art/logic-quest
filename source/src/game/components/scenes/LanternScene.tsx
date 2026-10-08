/**
 * Ring 4 (Proof Lantern): a circle with points and chords, or a claim card, and a claim. Owned by the Ring 4 builder.
 *
 * A stepped lantern shows the frames of the steps that are showing (lanternAt). The region count is always the
 * drawing's own count, and a 31 label is refused whenever three chords meet (shownRegions; acceptance check 9).
 * Every frame is a still picture. Labels are short and wrap, so the picture reads at 320 px.
 */
import type { LanternScene, LanternStatus } from '../../../engine/scenes/lantern';
import { lanternAt, lanternPoints, shownRegions, threeChordsMeet } from '../../../engine/puzzles/observatory/lantern';

/** The verdict words, the same on every lantern picture. */
export const LANTERN_STATUS: Record<LanternStatus, string> = { proved: 'Proved', tentative: 'A good guess', false: 'False' };

export function LanternView({ scene, shown }: { scene: LanternScene; shown: number }) {
  const steps = scene.steps?.length ?? 0;
  const framed = (scene.frames?.length ?? 0) > 0;
  const v = lanternAt(scene, shown);
  // A stepped lantern with no frames keeps its counts and verdict for the last step; frames carry their own reveal.
  const revealAll = framed || steps === 0 || shown >= steps;
  const circle = v.points > 0;
  const pts = circle ? lanternPoints(v.points, !!v.regular) : [];
  const concurrent = circle && v.chords && threeChordsMeet(pts);
  const regions = revealAll ? shownRegions(v) : undefined;
  const chords: [number, number][] = [];
  if (circle && v.chords) for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) chords.push([i, j]);
  const at = (p: { x: number; y: number }) => ({ x: 60 + 50 * p.x, y: 60 + 50 * p.y });
  const status = v.status && revealAll ? v.status : undefined;
  return (
    <div className={`play-ob-lantern${circle ? '' : ' is-card'}`}>
      {v.stated && (
        <p className="play-ob-stated">
          <span className="play-drill-tag">{v.pattern === 'observed' ? 'Seen' : 'Stated'}</span> {v.stated}
        </p>
      )}
      {v.pattern && (
        <p className={`play-ob-lkind is-${v.pattern}`}>
          {v.pattern === 'constructed' ? 'Constructed: it comes with its rule.' : 'Observed: only what was seen.'}
        </p>
      )}
      {circle && (
        <svg
          className="play-ob-lantern-face"
          viewBox="0 0 120 120"
          role="img"
          aria-label={`A circle with ${v.points} point${v.points === 1 ? '' : 's'}${v.chords && v.points > 1 ? ', every pair joined' : ''}${v.regular ? ', placed evenly' : ''}${concurrent ? ', three chords meet in the middle' : ''}${regions !== undefined ? `, ${regions} regions` : ''}`}
        >
          <circle cx="60" cy="60" r="50" className="play-ob-ring" />
          {chords.map(([i, j]) => {
            const a = at(pts[i]), b = at(pts[j]);
            return <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="play-ob-chord" />;
          })}
          {pts.map((p, i) => {
            const c = at(p);
            return <circle key={i} cx={c.x} cy={c.y} r="4" className="play-ob-point" />;
          })}
          {concurrent && <circle cx="60" cy="60" r="7" className="play-ob-meet" />}
        </svg>
      )}
      {v.sequence && v.sequence.length > 0 && (
        <p className="play-ob-note play-ob-lseq">
          <span className="play-drill-tag">So far</span> {v.sequence.join(', ')}
        </p>
      )}
      {circle && regions !== undefined && (
        <p className="play-ob-note play-ob-lcount">
          <strong>{regions}</strong>
          {`${regions === 1 ? ' region' : ' regions'}${concurrent ? ': three chords meet in the middle.' : '.'}`}
        </p>
      )}
      {circle && v.hideCount && <p className="play-ob-note play-ob-lcount is-hidden">Regions: the count is hidden.</p>}
      {(v.rows?.length ?? 0) > 0 && (
        <ul className="play-ob-lrows">
          {v.rows!.map((r, i) => (
            <li key={i} className={`play-ob-lrow${r.lit ? ' is-lit' : ''}`}>
              <span className="play-ob-lrow-label">{r.label}</span>
              <span className="play-ob-lrow-cells">
                {r.cells.map((c, k) => (
                  <span key={k} className={`play-ob-lcell${/^\d+$/.test(c) ? ' is-num' : ''}${c === '?' ? ' is-blank' : ''}`}>{c}</span>
                ))}
              </span>
              {r.tag && <span className="play-ob-ltag">{r.tag}</span>}
            </li>
          ))}
        </ul>
      )}
      {(v.claims?.length ?? 0) > 0 && (
        <ol className="play-ob-lclaims">
          {v.claims!.map((c, i) => (
            <li key={i} className={`play-ob-lclaim${c.status ? ` is-${c.status}` : ''}`}>
              <span className="play-ob-lclaim-text">{c.text}</span>
              {c.status && <span className="play-ob-lverdict">{LANTERN_STATUS[c.status]}</span>}
            </li>
          ))}
        </ol>
      )}
      {(v.chain?.length ?? 0) > 0 && (
        <ol className="play-ob-lchain" aria-label="The reason, step by step">
          {v.chain!.map((l, i) => (
            <li key={i} className={`play-ob-llink${l.lit ? ' is-lit' : ''}`}>
              <span className="play-ob-llink-n" aria-hidden="true">{i + 1}</span>
              <span className="play-ob-llink-text">{l.lit ? l.text : 'Not lit yet.'}</span>
            </li>
          ))}
        </ol>
      )}
      {v.claim && (
        <p className={`play-ob-claim${status ? ` is-${status}` : ''}`}>
          <span className="play-drill-tag">Claim</span> {v.claim}
          {status && <span className="play-ob-lverdict"> {LANTERN_STATUS[status]}</span>}
        </p>
      )}
    </div>
  );
}
