/**
 * Draws a Scene: a row of shape cards, three boxes with signs and a rule, a numbered clue list,
 * a quote card, islanders with speech bubbles, or a small logic grid drawn as a picture.
 * Clue lists can show a state per clue (holds / broken) while a line is built or after a grid is checked.
 */
import type { ReactNode } from 'react';
import type { Scene } from '../../engine/types';
import { PlayIcon, ThingCard } from './ThingCard';

export type ClueState = 'ok' | 'broken' | null;

export interface SceneViewProps {
  scene: Scene;
  /** Clue scenes only: one state per clue, same order. null = not decided yet. */
  clueState?: readonly ClueState[];
  /** Optional id for the scene's label, so a question can point at it. */
  labelId?: string;
}

/** Avatar colors for speakers, by place in the list (dark text reads on all of them). */
const AVATAR = ['#a78bfa', '#22d3ee', '#f5d77a', '#5eead4', '#f9a8d4'];

/** The rule over a scene ("Rule: Exactly one sign is true."). */
export function RuleBanner({ rule }: { rule: string }) {
  return (
    <div className="play-rule">
      <span className="play-rule-tag">Rule</span>
      <strong>{rule}</strong>
    </div>
  );
}

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

/** Tint the little box marker by metal or color words in the name; brass otherwise. */
function boxTint(name: string): string {
  const n = name.toLowerCase();
  if (/gold/.test(n)) return '#c9a227';
  if (/silver/.test(n)) return '#cbd5e1';
  if (/lead|iron|stone|gray|grey/.test(n)) return '#64748b';
  if (/copper|bronze|wood/.test(n)) return '#c2703d';
  if (/red/.test(n)) return '#ef4444';
  if (/blue/.test(n)) return '#3b82f6';
  if (/green/.test(n)) return '#4ade80';
  return '#c9a227';
}

export function SceneView({ scene, clueState, labelId }: SceneViewProps) {
  switch (scene.kind) {
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
              const st = clueState?.[i] ?? null;
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
          <ul className="play-speaker-list" aria-label="Who says what">
            {scene.speakers.map((sp, i) => (
              <SpeakerCard key={sp.id} name={sp.name} says={sp.says} index={i} />
            ))}
          </ul>
        </div>
      );
    case 'grid':
      return <GridPicture scene={scene} labelId={labelId} />;
  }
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
                return (
                  <td key={c.id}>
                    <span className={`play-cell play-cell--pic${m ? ` play-cell--${m}` : ''}`}>
                      {m === 'yes' && <PlayIcon name="check" size={20} />}
                      {m === 'no' && <PlayIcon name="cross" size={18} />}
                      <span className="play-sr">{m === 'yes' ? 'yes' : m === 'no' ? 'no' : 'blank'}</span>
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

