/**
 * A truth table as a still picture (Truth Tables, id s9): a key line for each letter, then a real table with a Row
 * column, the parts (the inputs) and the sentences, each box the word True or False (a blank box to fill is drawn
 * empty). Rows picked out are highlighted and named. Words only, never symbols: the table reads at 12 px or more
 * and fits a 320 px phone (the headings wrap). The same picture is read in words by tableSpeech.
 */
import type { Scene } from '../../engine/types';
import '../../styles/truth-table.css';

type TableData = Extract<Scene, { kind: 'table' }>;

export function TruthTablePicture({ scene, labelId }: { scene: TableData; labelId?: string }) {
  const marked = new Set(scene.marked ?? []);
  return (
    <div className="play-scene play-tt" id={labelId}>
      {scene.key && scene.key.length > 0 && (
        <ul className="play-tt-key" aria-label="What the letters stand for">
          {scene.key.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      )}
      <table className={`play-tt-table${scene.heads.length >= 5 ? ' play-tt-table--many' : ''}`}>
        <caption className={scene.caption ? 'play-tt-cap' : 'play-sr'}>{scene.caption ?? 'A truth table'}</caption>
        <thead>
          <tr>
            <th scope="col" className="play-tt-rowhead">Row</th>
            {scene.heads.map((h, j) => (
              <th key={j} scope="col" className={j < scene.inputs ? 'is-part' : j === scene.inputs ? 'is-sentence is-first' : 'is-sentence'}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scene.cells.map((row, k) => (
            <tr key={k} className={marked.has(k) ? 'is-marked' : undefined}>
              <th scope="row" className="play-tt-rowhead">
                {k + 1}
                {marked.has(k) && scene.markLabel && <span className="play-tt-mark">{scene.markLabel}</span>}
              </th>
              {row.map((v, j) => (
                <td key={j} className={j < scene.inputs ? 'is-part' : j === scene.inputs ? 'is-sentence is-first' : 'is-sentence'}>
                  {v === null ? (
                    <span className="play-tt-blank">
                      <span className="play-sr">blank</span>
                    </span>
                  ) : (
                    <span className={`play-tt-v is-${v ? 'true' : 'false'}`}>{v ? 'True' : 'False'}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
