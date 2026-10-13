/**
 * A count picture as a still frame (Clues & Chances, id s13): a whole group of 100 split two ways. On top, the group
 * as dots, ten to a line, so "out of 100" can be seen at a glance: a filled dot for each one in the first row, a pale
 * dot for each one in the second, and a ring around each one the clue says yes for. Under it, the same counts as a
 * real table: the two rows, the two columns, each box a count, and each row and column in all. The table carries
 * every number in words, so the dots are only a picture (hidden from screen readers) and color never carries the
 * meaning alone: each box shows its own dot as a key. A picked row or column (the group a question counts out of) is
 * outlined and named; a row and a column picked together share one box. A picture to fill shows its counts in all
 * (`rowTotals`, `colTotals`) beside blank boxes, and draws no dots until every box is known. Words are 12 px or more,
 * and it fits a 320 px phone. The same picture is read in words by countsSpeech.
 */
import type { Scene } from '../../engine/types';
import '../../styles/counts.css';

type CountsData = Extract<Scene, { kind: 'counts' }>;

const sum = (x: number | null, y: number | null) => (x === null || y === null ? null : x + y);

/** One dot: filled for the first row, pale for the second, with a ring when the clue says yes (the first column). */
function Dot({ row, col, cx, cy, r }: { row: number; col: number; cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} className={row === 0 ? 'play-counts-dot is-a' : 'play-counts-dot is-b'} />
      {col === 0 && <circle cx={cx} cy={cy} r={r + 2.2} className="play-counts-ring" />}
    </g>
  );
}

/** The key dot drawn in a box, so each box shows which dots it counts. */
function KeyDot({ row, col }: { row: number; col: number }) {
  return (
    <svg className="play-counts-key" viewBox="0 0 20 20" width={16} height={16} aria-hidden="true" focusable="false">
      <Dot row={row} col={col} cx={10} cy={10} r={5.5} />
    </svg>
  );
}

/** The group as dots, ten to a line, in box order: row 1 with the clue, row 1 without, row 2 with, row 2 without. */
function Dots({ cells, total }: { cells: [[number, number], [number, number]]; total: number }) {
  const per = 10;
  const step = 22;
  const r = 6.5;
  const order: [number, number][] = [];
  cells.forEach((row, i) => row.forEach((n, j) => { for (let k = 0; k < n; k++) order.push([i, j]); }));
  const lines = Math.ceil(Math.max(order.length, total) / per);
  return (
    <svg className="play-counts-dots" viewBox={`0 0 ${per * step} ${lines * step}`} aria-hidden="true" focusable="false">
      {order.map(([i, j], k) => (
        <Dot key={k} row={i} col={j} cx={(k % per) * step + step / 2} cy={Math.floor(k / per) * step + step / 2} r={r} />
      ))}
    </svg>
  );
}

export function CountsPicture({ scene, labelId }: { scene: CountsData; labelId?: string }) {
  const [[a, b], [c, d]] = scene.cells;
  // A count in all is the sum of its boxes, or the one the picture gives when its boxes are blank.
  const rowT = [scene.rowTotals?.[0] ?? sum(a, b), scene.rowTotals?.[1] ?? sum(c, d)];
  const colT = [scene.colTotals?.[0] ?? sum(a, c), scene.colTotals?.[1] ?? sum(b, d)];
  const known = a !== null && b !== null && c !== null && d !== null;
  const pickRow = scene.pick?.row;
  const pickCol = scene.pick?.col;
  const n = (v: number | null) =>
    v === null ? (
      <span className="play-counts-blank">
        <span className="play-sr">blank</span>
      </span>
    ) : (
      v
    );
  return (
    <figure className="play-scene play-counts" id={labelId}>
      <p className="play-counts-title">{scene.title}</p>
      {known && <Dots cells={[[a, b], [c, d]]} total={scene.total} />}
      <table className="play-counts-table">
        <caption className={scene.caption ? 'play-counts-cap' : 'play-sr'}>{scene.caption ?? `A count picture of ${scene.title}`}</caption>
        <thead>
          <tr>
            <td className="play-counts-corner" />
            {scene.cols.map((label, j) => (
              <th key={j} scope="col" className={pickCol === j ? 'is-picked' : undefined}>
                {label}
              </th>
            ))}
            <th scope="col" className="is-total">In all</th>
          </tr>
        </thead>
        <tbody>
          {scene.rows.map((label, i) => (
            <tr key={i} className={pickRow === i ? 'is-picked' : undefined}>
              <th scope="row">{label}</th>
              {scene.cells[i].map((v, j) => (
                <td key={j} className={pickCol === j ? 'is-picked' : undefined}>
                  <span className="play-counts-box">
                    <KeyDot row={i} col={j} />
                    <span className="play-counts-n">{n(v)}</span>
                  </span>
                </td>
              ))}
              <td className="is-total">{n(rowT[i])}</td>
            </tr>
          ))}
          <tr className="is-total">
            <th scope="row">In all</th>
            {colT.map((v, j) => (
              <td key={j} className={pickCol === j ? 'is-picked' : undefined}>
                {n(v)}
              </td>
            ))}
            <td>{scene.total}</td>
          </tr>
        </tbody>
      </table>
      {scene.pickLabel && (scene.pick?.row !== undefined || scene.pick?.col !== undefined) && <p className="play-counts-pick">{scene.pickLabel}</p>}
    </figure>
  );
}
