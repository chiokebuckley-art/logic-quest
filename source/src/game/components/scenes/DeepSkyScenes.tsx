/**
 * Ring 3 (Deep Sky): the mirror pool, the matrix gate and the analogy bridge. Every picture is a still frame: a stepped
 * scene shows its base picture, then `frames[i]` once step i is revealed (`shown` steps). Every color and every tile is
 * also written in words, so nothing depends on telling colors apart by sight.
 */
import type { MirrorCandidate, MirrorScene } from '../../../engine/scenes/mirror';
import type { MatrixScene } from '../../../engine/scenes/matrix';
import type { BridgeCard, BridgeScene } from '../../../engine/scenes/bridge';
import type { MatrixCell } from '../../../engine/scenes/common';
import { ThingCard } from '../ThingCard';

/** The frame on show: the frame of the last revealed step, if the scene has frames. */
function frameOf<F>(frames: F[] | undefined, shown: number): F | undefined {
  return shown > 0 ? frames?.[shown - 1] : undefined;
}

// ---------------------------------------------------------------------------------------------------------------------
// Mirror
// ---------------------------------------------------------------------------------------------------------------------

const CELL = 26;
const R = 9;

/** The letters of the '?' spots, in reading order of the base picture (a frame may fill some; the rest keep theirs). */
function askLetterMap(cells: readonly string[]): Map<number, string> {
  const w = cells[0]?.length ?? 0;
  const out = new Map<number, string>();
  let n = 0;
  cells.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '?') out.set(r * w + c, 'abcdefghij'[n++] ?? '?'); }));
  return out;
}

/** The step from the fold of a column (fold down the middle) or a row (fold across): 1 is next to the line. */
const stepOf = (i: number, half: number) => (i < half ? half - i : i - half + 1);

function MirrorCandidateView({ cand, fold }: { cand: MirrorCandidate; fold: 'v' | 'h' }) {
  const rows = cand.cells.length;
  const cols = cand.cells[0]?.length ?? 0;
  const c = 18;
  const r = 6;
  const pad = 5;
  const w = cols * c + pad * 2;
  const h = rows * c + pad * 2;
  return (
    <figure className="play-ob-cand">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" focusable="false">
        <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={6} className="play-ob-cand-box" />
        {fold === 'v' ? <line x1={1.5} y1={2} x2={1.5} y2={h - 2} className="play-ob-fold" /> : <line x1={2} y1={1.5} x2={w - 2} y2={1.5} className="play-ob-fold" />}
        {cand.cells.flatMap((row, i) => [...row].map((ch, k) => (
          <circle key={`${i}-${k}`} cx={pad + k * c + c / 2} cy={pad + i * c + c / 2} r={r} className={ch === '#' ? 'play-ob-dot-on' : 'play-ob-dot-off'} />
        )))}
      </svg>
      <figcaption>Half {cand.name}</figcaption>
    </figure>
  );
}

export function MirrorView({ scene, shown }: { scene: MirrorScene; shown: number }) {
  const steps = scene.steps?.length ?? 0;
  const f = frameOf(scene.frames, shown);
  const cells = f?.cells ?? scene.cells;
  const pairs = f ? f.pairs ?? [] : steps === 0 || shown >= steps ? scene.pairs ?? [] : [];
  const turned = f?.turned ?? scene.turned;
  const candidates = f?.candidates ?? scene.candidates;
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  const letters = askLetterMap(scene.cells);
  const ruler = !!scene.ruler && !!scene.fold;
  const left = ruler && scene.fold === 'h' ? 18 : 6;
  const top = 6;
  const bottom = ruler && scene.fold === 'v' ? 20 : 6;
  const width = left + cols * CELL + 6;
  const height = top + rows * CELL + bottom;
  const cx = (c: number) => left + c * CELL + CELL / 2;
  const cy = (r: number) => top + r * CELL + CELL / 2;
  const at = (i: number) => ({ r: Math.floor(i / cols), c: i % cols });
  const label = scene.caption ?? `A dot grid${scene.fold === 'v' ? ' with a fold line down the middle' : scene.fold === 'h' ? ' with a fold line across the middle' : ''}.`;
  return (
    <div className="play-ob-mirror">
      <svg className="play-ob-mirror-svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={label}>
        <rect x={left - 4} y={top - 4} width={cols * CELL + 8} height={rows * CELL + 8} rx={10} className="play-ob-mirror-bg" />
        {scene.fold === 'v' && <line x1={left + (cols / 2) * CELL} y1={top - 3} x2={left + (cols / 2) * CELL} y2={top + rows * CELL + 3} className="play-ob-fold" />}
        {scene.fold === 'h' && <line x1={left - 3} y1={top + (rows / 2) * CELL} x2={left + cols * CELL + 3} y2={top + (rows / 2) * CELL} className="play-ob-fold" />}
        {pairs.map(([a, b], i) => {
          const p = at(a);
          const q = at(b);
          return <line key={`l${i}`} x1={cx(p.c)} y1={cy(p.r)} x2={cx(q.c)} y2={cy(q.r)} className="play-ob-pair-line" />;
        })}
        {cells.flatMap((row, r) => [...row].map((ch, c) => {
          const i = r * cols + c;
          const key = `${r}-${c}`;
          if (ch === '-') return <circle key={key} cx={cx(c)} cy={cy(r)} r={2} className="play-ob-dot-hidden" />;
          if (ch === '?') {
            return (
              <g key={key}>
                <circle cx={cx(c)} cy={cy(r)} r={R} className="play-ob-dot-ask" />
                <text x={cx(c)} y={cy(r) + 4} textAnchor="middle" className="play-ob-dot-letter">{letters.get(i) ?? ''}</text>
              </g>
            );
          }
          return <circle key={key} cx={cx(c)} cy={cy(r)} r={R} className={ch === '#' ? 'play-ob-dot-on' : 'play-ob-dot-off'} />;
        }))}
        {pairs.flatMap(([a, b], i) => [a, b].map((x, k) => {
          const p = at(x);
          return <circle key={`p${i}-${k}`} cx={cx(p.c)} cy={cy(p.r)} r={R + 3} className="play-ob-pair-ring" />;
        }))}
        {ruler && scene.fold === 'v' && Array.from({ length: cols }, (_, c) => (
          <text key={`s${c}`} x={cx(c)} y={top + rows * CELL + 15} textAnchor="middle" className="play-ob-step">{stepOf(c, cols / 2)}</text>
        ))}
        {ruler && scene.fold === 'h' && Array.from({ length: rows }, (_, r) => (
          <text key={`s${r}`} x={8} y={cy(r) + 4} textAnchor="middle" className="play-ob-step">{stepOf(r, rows / 2)}</text>
        ))}
      </svg>
      {ruler && <p className="play-ob-caption-line">The numbers count steps from the fold line.</p>}
      {turned && <p className="play-ob-note">This one is turned, not folded.</p>}
      {candidates && candidates.length > 0 && scene.fold && (
        <div className="play-ob-cands" aria-hidden="true">
          {candidates.map((cand) => <MirrorCandidateView key={cand.name} cand={cand} fold={scene.fold!} />)}
        </div>
      )}
      {scene.caption && <p className="play-ob-caption-line">{scene.caption}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Matrix
// ---------------------------------------------------------------------------------------------------------------------

const cellWords = (c: MatrixCell) => `${c.count} ${c.color} ${c.shape}${c.count === 1 ? '' : 's'}`;

function ShapeTile({ cell, id }: { cell: MatrixCell; id: string }) {
  return (
    <>
      <span className="play-ob-cell-shapes" aria-hidden="true">
        {Array.from({ length: cell.count }, (_, i) => <ThingCard key={i} thing={{ id: `${id}${i}`, shape: cell.shape, color: cell.color, size: 'small' }} locked />)}
      </span>
      <span className="play-ob-caption">{cellWords(cell)}</span>
    </>
  );
}

export function MatrixView({ scene, shown }: { scene: MatrixScene; shown: number }) {
  const steps = scene.steps?.length ?? 0;
  const f = frameOf(scene.frames, shown);
  const glowRaw = f ? f.glow : steps === 0 || shown >= steps ? scene.glow : undefined;
  const glow = glowRaw === 'none' ? undefined : glowRaw;
  const trial = f?.trial;
  const filled = f?.filled;
  const filledText = f?.filledText;
  const words = !!scene.tiles;
  const n = scene.size;
  const gapAt = (r: number, c: number) => (words ? scene.tiles?.[r]?.[c] === null : scene.cells[r]?.[c] === null);
  const gapInner = (key: string) => {
    if (filled) return <ShapeTile cell={filled} id={key} />;
    if (filledText) return <span className="play-ob-word">{filledText}</span>;
    if (trial?.cell) return <ShapeTile cell={trial.cell} id={key} />;
    if (trial?.text) return <span className="play-ob-word">{trial.text}</span>;
    return <span className="play-ob-blank is-cell">?</span>;
  };
  const gapClass = `play-ob-cell is-missing${filled || filledText ? ' is-filled' : trial ? ' is-trial' : ''}`;
  return (
    <div className="play-ob-matrix">
      {scene.rowRule && <p className={`play-ob-stated${glow === 'rows' ? ' is-lit' : ''}`}><span className="play-drill-tag">Rows</span> {scene.rowRule}</p>}
      {scene.colRule && <p className={`play-ob-stated${glow === 'cols' ? ' is-lit' : ''}`}><span className="play-drill-tag">Columns</span> {scene.colRule}</p>}
      {scene.allRule && <p className="play-ob-stated"><span className="play-drill-tag">All</span> {scene.allRule}</p>}
      {words && scene.heads ? (
        <div className={`play-ob-grid play-ob-words size-${n}${glow ? ` glow-${glow}` : ''}`} role="img" aria-label="The timetable">
          <span className="play-ob-head is-corner" />
          {scene.heads.cols.map((h) => <span key={`h-${h}`} className="play-ob-head">{h}</span>)}
          {scene.tiles!.flatMap((row, r) => [
            <span key={`r-${r}`} className="play-ob-head is-row">{scene.heads!.rows[r]}</span>,
            ...row.map((t, c) => (gapAt(r, c)
              ? <span key={`${r}-${c}`} className={gapClass}>{gapInner(`${r}${c}`)}</span>
              : <span key={`${r}-${c}`} className="play-ob-cell"><span className="play-ob-word">{t}</span></span>)),
          ])}
        </div>
      ) : (
        <div className={`play-ob-grid size-${n}${glow ? ` glow-${glow}` : ''}`} role="img" aria-label="The grid">
          {scene.cells.flatMap((row, r) => row.map((c, k) => (c
            ? <span key={`${r}-${k}`} className="play-ob-cell"><ShapeTile cell={c} id={`${r}${k}`} /></span>
            : <span key={`${r}-${k}`} className={gapClass}>{gapInner(`${r}${k}`)}</span>)))}
        </div>
      )}
      {trial && (
        <p className="play-ob-trial">
          Trying {trial.cell ? cellWords(trial.cell) : trial.text}: <span className={trial.row === 'fits' ? 'is-ok' : 'is-off'}>row rule {trial.row}</span>, <span className={trial.col === 'fits' ? 'is-ok' : 'is-off'}>column rule {trial.col}</span>.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------------------------------------------------

function Pier({ words, card, ask, id }: { words?: string; card?: BridgeCard; ask?: boolean; id: string }) {
  if (ask) return <span className="play-ob-pier is-ask">?</span>;
  return (
    <span className={`play-ob-pier${card ? ' has-card' : ''}`}>
      {card && <ThingCard thing={{ id, shape: card.shape, color: card.color, size: card.size }} locked />}
      <span className="play-ob-pier-words">{words}</span>
    </span>
  );
}

export function BridgeView({ scene, shown }: { scene: BridgeScene; shown: number }) {
  const steps = scene.steps?.length ?? 0;
  const f = frameOf(scene.frames, shown);
  const all = steps === 0 || shown >= steps;
  const link = f?.link ?? !scene.hidden;
  const d = f ? f.d : all ? scene.d : undefined;
  const dCard = f ? f.dCard : all ? scene.cards?.d : undefined;
  const look = f?.look;
  const rel = link ? scene.relation : '?';
  // "Opposites" names the pair ("big and small are opposites"); any other link reads as a sentence ("key opens lock").
  const says = (x: string, y: string) => (!link ? `${x} is linked to ${y}` : scene.relation === 'opposites' ? `${x} and ${y} are opposites` : `${x} ${scene.relation} ${y}`);
  return (
    <div className="play-ob-bridge" role="img" aria-label={`${says(scene.a, scene.b)}. ${says(scene.c, d ?? 'what')}${d ? '.' : '?'}`}>
      <div className="play-ob-plank">
        <Pier words={scene.a} card={scene.cards?.a} id="ba" />
        <span className={`play-ob-span${link ? '' : ' is-ask'}`}>{rel}</span>
        <Pier words={scene.b} card={scene.cards?.b} id="bb" />
      </div>
      <div className="play-ob-plank">
        <Pier words={scene.c} card={scene.cards?.c} id="bc" />
        <span className={`play-ob-span${link ? '' : ' is-ask'}`}>{rel}</span>
        <Pier words={d} card={dCard} ask={!d} id="bd" />
      </div>
      {look && <p className="play-ob-note"><span className="play-ob-look">{look}</span> only looks alike: it breaks the link.</p>}
      {scene.options && scene.options.length > 0 && <p className="play-ob-note">Choices: {scene.options.join(', ')}.</p>}
    </div>
  );
}
