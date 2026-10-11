/**
 * Draws a Scene: a row of shape cards, three boxes with signs and a rule, a numbered clue list,
 * a quote card, islanders with speech bubbles, or a small logic grid drawn as a picture.
 * Clue lists can show a state per clue (holds / broken) while a line is built or after a grid is checked.
 */
import type { ReactNode } from 'react';
import type { Scene } from '../../engine/types';
import { PlayIcon, ThingCard } from './ThingCard';
import { boxTint, RuleBanner } from './boxes';
import { CaseScene } from './CaseBoard';
import { ContrastView } from './Distinction';
import { ObservatoryScene } from './scenes/ObservatoryScene';
import { RingsPicture } from './RingsScene';
import { TruthTablePicture } from './TruthTable';
import { CountsPicture } from './CountsScene';
import { CircuitPicture } from './CircuitScene';

export { RuleBanner };

export type ClueState = 'ok' | 'broken' | null;

export interface SceneViewProps {
  scene: Scene;
  /** Clue scenes only: one state per clue, same order. null = not decided yet. */
  clueState?: readonly ClueState[];
  /** Optional id for the scene's label, so a question can point at it. */
  labelId?: string;
  /** A case board shown one step at a time (Scene 'cases' with steps): how many steps are showing. */
  revealed?: number;
}

/** Avatar colors for speakers, by place in the list (dark text reads on all of them). */
const AVATAR = ['#9d6bff', '#22e6ff', '#ffe08a', '#7dffbf', '#f9a8d4'];

export interface SpeakerCardProps {
  name: string;
  /** Their words. Empty or missing: they say nothing. */
  says?: string;
  /** Place in the list, for the avatar color. */
  index: number;
  /** After a wrong Check: these words do not fit the answer. */
  flagged?: boolean;
  /** Controls drawn under the bubble (the Knight / Knave choice). */
  children?: ReactNode;
}

/** Wrap words in curly quotes unless they already have them. */
export const quoted = (text: string) => (/^[“"]/.test(text.trim()) ? text.trim() : `“${text.trim()}”`);

/** One islander: avatar, name and speech bubble, and any controls under them. */
export function SpeakerCard({ name, says, index, flagged = false, children }: SpeakerCardProps) {
  const words = says?.trim() ?? '';
  return (
    <li className={`play-speaker${flagged ? ' play-speaker--flagged' : ''}`}>
      <div className="play-speaker-row">
        <span className="play-avatar" style={{ background: AVATAR[index % AVATAR.length] }} aria-hidden="true">
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="play-speaker-text">
          {words ? (
            <>
              <span className="play-speaker-name">{name} says:</span>
              <span className="play-bubble">{quoted(words)}</span>
            </>
          ) : (
            <span className="play-speaker-name">{name} says nothing.</span>
          )}
        </div>
      </div>
      {flagged && (
        <p className="play-speaker-flag">
          <PlayIcon name="cross" size={16} />
          <span>These words don’t fit your answer.</span>
        </p>
      )}
      {children}
    </li>
  );
}

export function SceneView({ scene, clueState, labelId, revealed }: SceneViewProps) {
  switch (scene.kind) {
    case 'cases':
      return <CaseScene scene={scene} revealed={revealed} labelId={labelId} />;
    case 'contrast':
      return <ContrastView scene={scene} labelId={labelId} />;
    case 'things':
      return (
        <ul className="play-things play-scene" aria-label="Cards, from first to last" id={labelId}>
          {scene.things.map((t, i) => (
            <li key={t.id} className="play-things-slot">
              <ThingCard thing={t} />
              <span className="play-things-pos" aria-hidden="true">{i + 1}</span>
            </li>
          ))}
        </ul>
      );
    case 'boxes':
      return (
        <div className="play-scene play-boxes" id={labelId}>
          <RuleBanner rule={scene.rule} />
          <ol className="play-box-list" aria-label="Boxes and their signs">
            {scene.boxes.map((b, i) => (
              <li key={b.id} className="play-box">
                <div className="play-box-head">
                  <span className="play-box-mark" style={{ background: boxTint(b.name) }} aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="play-box-name">{b.name}</span>
                </div>
                <div className="play-box-sign">
                  <span className="play-sr">Sign {i + 1} says: </span>
                  {b.sign}
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'clues':
      return (
        <div className="play-scene play-clues" id={labelId}>
          <div className="play-clues-title" aria-hidden="true">Clues</div>
          <ol className="play-clue-list" aria-label="Clues">
            {scene.clues.map((c, i) => {
              const st = clueState?.[i] ?? scene.marks?.[i] ?? null;
              return (
                <li key={i} className={`play-clue${st ? ` play-clue--${st}` : ''}`}>
                  <span className="play-clue-n">
                    <span className="play-sr">Clue </span>
                    {i + 1}
                    <span className="play-sr">: </span>
                  </span>
                  <span className="play-clue-text">{c}</span>
                  {st && (
                    <span className="play-clue-state">
                      <PlayIcon name={st === 'ok' ? 'check' : 'cross'} size={16} />
                      <span className="play-sr">{st === 'ok' ? ' (this clue holds)' : ' (this clue is broken)'}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          {scene.line && (
            <div className="play-line">
              <span className="play-line-end">{scene.line.first}</span>
              <ol className="play-line-names" aria-label={`The line, from ${scene.line.first.toLowerCase()} to ${scene.line.last.toLowerCase()}`}>
                {scene.line.names.map((n, k) => (
                  <li key={k} className="play-line-name">{n}</li>
                ))}
              </ol>
              <span className="play-line-end">{scene.line.last}</span>
            </div>
          )}
        </div>
      );
    case 'text':
      return (
        <blockquote className="play-scene play-quote" id={labelId}>
          {scene.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </blockquote>
      );
    case 'speakers':
      return (
        <div className="play-scene play-speakers" id={labelId}>
          {scene.rule && <RuleBanner rule={scene.rule} />}
          {scene.fact && (
            <p className="play-fact">
              <span className="play-fact-tag">What is true</span> {scene.fact}
            </p>
          )}
          {scene.test && (
            <p className="play-fact play-fact--test">
              <span className="play-fact-tag">Test world</span> {scene.test}
            </p>
          )}
          <ul className="play-speaker-list" aria-label="Who says what">
            {scene.speakers.map((sp, i) => (
              <SpeakerCard key={sp.id} name={sp.name} says={sp.says} index={i} />
            ))}
          </ul>
        </div>
      );
    case 'grid':
      return <GridPicture scene={scene} labelId={labelId} />;
    case 'argument':
      return <ArgumentPicture scene={scene} labelId={labelId} />;
    case 'rings':
      return <RingsPicture scene={scene} labelId={labelId} />;
    case 'table':
      return <TruthTablePicture scene={scene} labelId={labelId} />;
    case 'counts':
      return <CountsPicture scene={scene} labelId={labelId} />;
    case 'circuit':
      return <CircuitPicture scene={scene} labelId={labelId} />;
    case 'chain':
    case 'staircase':
    case 'machine':
    case 'clock':
    case 'mirror':
    case 'matrix':
    case 'bridge':
    case 'lantern':
      return <ObservatoryScene scene={scene} revealed={revealed} labelId={labelId} />;
  }
}

type ArgumentScene = Extract<Scene, { kind: 'argument' }>;

/**
 * An argument as a still picture (Stop 2, Arguments): the givens, numbered, then the claim, each with a True or False
 * tag when the picture says what is really true. Then every case as a box: its facts, and either a cross with the
 * given it breaks or, for a case left, whether the claim is true there. Two boxes a row, so it fits a phone.
 */
function ArgumentPicture({ scene, labelId }: { scene: ArgumentScene; labelId?: string }) {
  const tag = (v: boolean | null | undefined) =>
    v === true || v === false ? <span className={`play-arg-real is-${v ? 'true' : 'false'}`}>{v ? 'True' : 'False'}</span> : null;
  return (
    <div className="play-scene play-arg" id={labelId}>
      <ol className="play-arg-givens" aria-label="The givens">
        {scene.givens.map((g, i) => (
          <li key={i} className="play-arg-line">
            <span className="play-arg-tag">Given {i + 1}</span>
            <span className="play-arg-text">{g}</span>
            {tag(scene.real?.[i])}
          </li>
        ))}
      </ol>
      <p className="play-arg-line play-arg-line--claim">
        <span className="play-arg-tag play-arg-tag--claim">Claim</span>
        <span className="play-arg-text">{scene.claim}</span>
        {tag(scene.realClaim)}
      </p>
      {scene.cases && scene.cases.length > 0 && (
        <ol className="play-arg-cases" aria-label="Every case">
          {scene.cases.map((c) => {
            const state = c.out ? 'out' : c.claim === true ? 'yes' : c.claim === false ? 'no' : 'open';
            return (
              <li key={c.name} className={`play-arg-case is-${state}`}>
                <span className="play-arg-case-name">{c.name}</span>
                {c.facts.map((f, k) => (
                  <span key={k} className="play-arg-fact">{f}</span>
                ))}
                {c.out ? (
                  <span className="play-arg-verdict is-out">
                    <PlayIcon name="cross" size={14} /> Crossed out: breaks given {c.out}
                  </span>
                ) : c.claim !== undefined ? (
                  <span className={`play-arg-verdict is-${c.claim ? 'true' : 'false'}`}>
                    Left: the claim is {c.claim ? 'true' : 'false'}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {scene.caption && <p className="play-arg-caption">{scene.caption}</p>}
    </div>
  );
}

type GridScene = Extract<Scene, { kind: 'grid' }>;

/** A logic grid as a picture: a real table, people down the side, choices across the top, ✓ and ✗ in the boxes. */
function GridPicture({ scene, labelId }: { scene: GridScene; labelId?: string }) {
  return (
    <div className="play-scene play-gridpic" id={labelId}>
      <table className={`play-grid play-grid--pic${scene.cols.length >= 4 ? ' play-grid--many' : ''}`}>
        <caption className={scene.caption ? 'play-gridpic-cap' : 'play-sr'}>{scene.caption ?? 'A logic grid'}</caption>
        <thead>
          <tr>
            <td className="play-grid-corner" />
            {scene.cols.map((c) => (
              <th key={c.id} scope="col">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scene.rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">{r.label}</th>
              {scene.cols.map((c) => {
                const m = scene.marks[r.id]?.[c.id];
                const label = scene.labels?.[r.id]?.[c.id];
                return (
                  <td key={c.id}>
                    <span className={`play-cell play-cell--pic${m ? ` play-cell--${m}` : ''}${label ? ' has-label' : ''}`}>
                      {m === 'yes' && <PlayIcon name="check" size={20} />}
                      {m === 'no' && <PlayIcon name="cross" size={18} />}
                      <span className="play-sr">{m === 'yes' ? 'yes' : m === 'no' ? 'no' : 'blank'}</span>
                      {label && <span className="play-cell-label">{label}</span>}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
