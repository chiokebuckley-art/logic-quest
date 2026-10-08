/**
 * Ring 2 (Rule Rise): the staircase, the machine and the clock. Still frames only: a stepped scene shows what its
 * `reveal` (staircase) or `at` fields (machine) allow for the steps showing, and nothing depends on animation. Every
 * label is short and wraps, so the pictures fit a 320 px screen.
 */
import type { ReactElement } from 'react';
import type { StaircaseScene } from '../../../engine/scenes/staircase';
import type { MachineScene } from '../../../engine/scenes/machine';
import type { ClockFace, ClockScene } from '../../../engine/scenes/clock';

const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

export function StaircaseView({ scene, shown }: { scene: StaircaseScene; shown: number }) {
  const at = scene.reveal ? scene.reveal[Math.max(0, Math.min(shown, scene.reveal.length - 1))] : undefined;
  const rows = at ? scene.rows.slice(0, at.rows) : scene.rows;
  const table = scene.table ? (at ? scene.table.slice(0, at.table) : scene.table) : [];
  const [hs, hc] = scene.head ?? ['Step', 'Tiles'];
  const rowLabel = (n: number) => (scene.rowName ? plural(n, scene.rowName) : `Step ${n}`);
  const skin = scene.skin ?? 'tiles';
  return (
    <div className={`play-ob-stairs is-${skin}`}>
      <p className="play-ob-stated"><span className="play-drill-tag">{scene.tag ?? 'Construction'}</span> {scene.construction}</p>
      {rows.length > 0 && (
        <ol className="play-ob-stair-rows" aria-label="The steps">
          {rows.map((r) => {
            const added = r.cells.filter((c) => c === 'new').length;
            return (
              <li key={r.step} className="play-ob-stair-row">
                <span className="play-ob-stair-label">{rowLabel(r.step)}</span>
                <span className="play-ob-tiles" role="img" aria-label={`${rowLabel(r.step)}: ${r.cells.length} ${hc.toLowerCase()}${added ? `, ${added} new` : ''}`}>
                  {r.cells.map((c, k) => <span key={k} className={`play-ob-tile is-${c}`} />)}
                </span>
                <span className="play-ob-stair-count">{r.cells.length}</span>
              </li>
            );
          })}
        </ol>
      )}
      {table.length > 0 && (
        <div className="play-ob-seq">
          {scene.jump && <p className="play-ob-seq-jump">Each jump: {scene.jump}</p>}
          <ul className="play-ob-seq-list" aria-label={`The table of ${hs.toLowerCase()} and ${hc.toLowerCase()}`}>
            {table.flatMap((t, i) => {
              const gap = i > 0 && t.step - table[i - 1].step > 1;
              const cell = (
                <li key={t.step} className={`play-ob-seq-cell${t.count === null ? ' is-ask' : ''}`}>
                  <span className="play-ob-seq-head">{hs} {t.step}</span>
                  <b className="play-ob-seq-val">{t.count === null ? '?' : t.count}</b>
                  <span className="play-sr">{t.count === null ? ': a blank to find' : ` ${hc.toLowerCase()}`}</span>
                </li>
              );
              return gap ? [<li key={`gap${t.step}`} className="play-ob-seq-gap" aria-hidden="true">…</li>, cell] : [cell];
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function MachineView({ scene, shown }: { scene: MachineScene; shown: number }) {
  const steps = scene.steps?.length ?? 0;
  const vis = (at?: number) => steps === 0 || (at ?? 0) <= shown;
  const out = new Set((scene.ruledOut ?? []).filter((o) => vis(o.at)).map((o) => o.rule));
  const candidates = scene.candidates ?? [];
  const tries = (scene.tries ?? []).filter((t) => vis(t.at));
  const rows = scene.rows.filter((r) => vis(r.at));
  const blank = <span className="play-ob-blank is-cell" aria-label="blank">?</span>;
  return (
    <div className="play-ob-machine">
      {scene.stated && <p className="play-ob-stated"><span className="play-drill-tag">Stated</span> {scene.stated}</p>}
      <div className="play-ob-machine-box" role="img" aria-label={scene.rule ? `The machine’s rule: ${scene.rule}` : 'The machine: its rule is hidden'}>
        <span className="play-ob-machine-in">in</span>
        <span className="play-ob-machine-body">{scene.rule ?? '?'}</span>
        <span className="play-ob-machine-out">out</span>
      </div>
      {candidates.length > 0 && (
        <ul className="play-ob-candidates" aria-label="Rules to test">
          {candidates.map((c) => (
            <li key={c} className={out.has(c) ? 'is-out' : 'is-lit'}>
              {c}
              {out.has(c) && <span className="play-sr"> (ruled out)</span>}
            </li>
          ))}
        </ul>
      )}
      {tries.map((t) => (
        <p key={t.input} className="play-ob-try">
          <span className="play-drill-tag">Try {t.input}</span>{' '}
          {candidates.map((c, i) => `${c} gives ${t.outs[i]}`).join(', ')}
        </p>
      ))}
      {rows.length > 0 && (
        <table className="play-ob-table play-ob-io">
          <thead><tr><th scope="col">In</th><th scope="col">Out</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.input !== null && vis(r.inAt ?? r.at) ? r.input : blank}</td>
                <td>{r.output !== null && vis(r.outAt ?? r.at) ? r.output : blank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const SHAPE_GLYPH: Record<string, (x: number, y: number) => ReactElement> = {
  circle: (x, y) => <circle cx={x} cy={y} r="5.5" className="play-ob-glyph" />,
  square: (x, y) => <rect x={x - 5} y={y - 5} width="10" height="10" className="play-ob-glyph" />,
  triangle: (x, y) => <polygon points={`${x},${y - 6} ${x + 6},${y + 5} ${x - 6},${y + 5}`} className="play-ob-glyph" />,
};
const COLOR_FILL: Record<string, string> = { red: '#ff5470', blue: '#3b82f6', yellow: '#ffc93c', green: '#3cff9d' };
const short = (s: string) => (s.length <= 3 ? s : s.slice(0, 3).replace(/^./, (c) => c.toUpperCase()));
const one = (unit: string) => unit.replace(/s$/, '');

function Face({ face, lit }: { face: ClockFace; lit: boolean }) {
  const k = face.cycle.length;
  const unit = face.unit ?? 'steps';
  const R = 44;
  const startAt = face.counting === 'elapsed' && face.start ? face.cycle.findIndex((c) => c.toLowerCase() === face.start!.toLowerCase()) : -1;
  const question = face.n === undefined
    ? null
    : face.counting === 'position'
      ? `${unit === 'slots' ? 'Slot' : 'Position'} ${face.n}?`
      : `${face.n} ${face.n === 1 ? one(unit) : unit} after ${face.start ?? 'the start'}?`;
  return (
    <figure className="play-ob-face">
      <p className="play-ob-stated">
        <span className="play-drill-tag">{face.counting === 'position' ? 'Item positions' : `Elapsed ${unit}`}</span>{' '}
        {face.counting === 'position' ? 'The first item is position 1.' : `${face.start ? `${face.start} is` : 'The start is'} ${one(unit)} 0.`}
      </p>
      <svg className="play-ob-clock-face" viewBox="0 0 120 120" role="img" aria-label={`A cycle of ${k}: ${face.cycle.join(', ')}`}>
        <circle cx="60" cy="60" r={R} className="play-ob-ring" />
        {face.cycle.map((item, i) => {
          const a = (i / k) * Math.PI * 2 - Math.PI / 2;
          const x = 60 + R * Math.cos(a), y = 60 + R * Math.sin(a);
          const glyph = SHAPE_GLYPH[item.toLowerCase()];
          const fill = COLOR_FILL[item.toLowerCase()];
          return (
            <g key={i} className={`play-ob-bead${lit && face.highlight === i ? ' is-lit' : ''}${i === startAt ? ' is-start' : ''}`}>
              <circle cx={x} cy={y} r="12.5" style={fill ? { fill } : undefined} />
              {glyph ? glyph(x, y) : <text x={x} y={y + 3.5} textAnchor="middle" className={fill ? 'is-on-color' : undefined}>{short(item)}</text>}
            </g>
          );
        })}
        {startAt >= 0 && <text x="60" y="64" textAnchor="middle" className="play-ob-clock-mid">{one(unit)} 0</text>}
      </svg>
      <figcaption className="play-ob-cycle-line">The cycle: {face.cycle.join(', ')}, then again.</figcaption>
      {face.captions && face.captions.length > 0 && (
        <ul className="play-ob-captions">{face.captions.map((c) => <li key={c}>{c}</li>)}</ul>
      )}
      {question && <p className="play-ob-note play-ob-ask">{question}</p>}
    </figure>
  );
}

export function ClockView({ scene, shown }: { scene: ClockScene; shown: number }) {
  const steps = scene.steps?.length ?? 0;
  const lit = (litAt?: number) => steps === 0 || shown >= (litAt ?? steps);
  return (
    <div className={`play-ob-clock${scene.pair ? ' is-pair' : ''}`}>
      <Face face={scene} lit={lit(scene.litAt)} />
      {scene.pair && <Face face={scene.pair} lit={lit(scene.pair.litAt)} />}
    </div>
  );
}
