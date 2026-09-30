/**
 * The two bodies of an assign item.
 *  - layout 'grid': one small logic grid per category (people are rows, choices are columns). Each box is a
 *    button that cycles blank -> ✗ -> ✓ -> blank. A ✓ does not fill in any ✗ by itself: spreading a tick is a
 *    skill stop 4 teaches.
 *  - layout 'toggles': each islander from the speakers scene, with a Knight / Knave radiogroup under them.
 * Both keep their state as Marks (one mark per box), so the answer is built the same pure way for both.
 */
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { AssignItem } from '../../engine/types';
import { RuleBanner, SpeakerCard } from './SceneView';
import { PlayIcon, type IconName } from './ThingCard';

// ---------- pure helpers ----------

/** A box's mark: 'yes' = ✓ (tick), 'no' = ✗ (cross). No entry = blank. */
export type Mark = 'yes' | 'no';
/** cellKey(person, category, value) -> mark. */
export type Marks = Readonly<Record<string, Mark>>;

export const cellKey = (person: string, category: string, value: string) => `${person}\u001f${category}\u001f${value}`;

/** blank -> ✗ -> ✓ -> blank */
export function nextMark(m: Mark | undefined): Mark | undefined {
  return m === undefined ? 'no' : m === 'no' ? 'yes' : undefined;
}

/** Tap one grid box: move it to its next mark. Nothing else changes. */
export function cycleCell(marks: Marks, person: string, category: string, value: string): Marks {
  const k = cellKey(person, category, value);
  const next: Record<string, Mark> = { ...marks };
  const m = nextMark(marks[k]);
  if (m) next[k] = m;
  else delete next[k];
  return next;
}

/** Toggles: choose one value for a person in a category (a radio). It gets the tick; the others are cleared. */
export function pickValue(item: AssignItem, marks: Marks, person: string, category: string, value: string): Marks {
  const next: Record<string, Mark> = { ...marks };
  for (const v of item.categories.find((c) => c.id === category)?.values ?? []) delete next[cellKey(person, category, v.id)];
  next[cellKey(person, category, value)] = 'yes';
  return next;
}

/** The values with a tick in one person's row of one category. */
export function ticksIn(item: AssignItem, marks: Marks, person: string, category: string): string[] {
  const cat = item.categories.find((c) => c.id === category);
  return (cat?.values ?? []).filter((v) => marks[cellKey(person, category, v.id)] === 'yes').map((v) => v.id);
}

/** person -> category -> value, from each row that has exactly one tick. Rows with none or several are left out. */
export function assignValues(item: AssignItem, marks: Marks): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const p of item.people) {
    out[p.id] = {};
    for (const c of item.categories) {
      const t = ticksIn(item, marks, p.id, c.id);
      if (t.length === 1) out[p.id][c.id] = t[0];
    }
  }
  return out;
}

/** Ready to check: every person has exactly one tick in every category. */
export function assignReady(item: AssignItem, marks: Marks): boolean {
  return item.people.every((p) => item.categories.every((c) => ticksIn(item, marks, p.id, c.id).length === 1));
}

/** The solved state ("Show me"): a tick on each answer; in a grid, a cross in every other box. */
export function solvedMarks(item: AssignItem): Marks {
  const out: Record<string, Mark> = {};
  for (const p of item.people) {
    for (const c of item.categories) {
      for (const v of c.values) {
        const yes = item.answer[p.id]?.[c.id] === v.id;
        if (yes) out[cellKey(p.id, c.id, v.id)] = 'yes';
        else if (item.layout === 'grid') out[cellKey(p.id, c.id, v.id)] = 'no';
      }
    }
  }
  return out;
}

/** What a box's mark is called, for its label: "Mia – cat: yes". The same words as the help line and the read-aloud. */
export const markWord = (m: Mark | undefined) => (m === 'yes' ? 'yes' : m === 'no' ? 'no' : 'blank');

// ---------- the grid ----------

export interface AssignBodyProps {
  item: AssignItem;
  marks: Marks;
  /** Feedback is showing (learn) or the answer is in (check): boxes stay focusable but do not change. */
  locked: boolean;
  onChange(next: Marks): void;
  /** Toggles, after a wrong Check: indexes of the speakers whose words do not fit the answer. */
  flagged?: readonly number[] | null;
}

export function AssignGrid({ item, marks, locked, onChange }: AssignBodyProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [said, setSaid] = useState('');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const any = Object.keys(marks).length > 0;
  const two = item.categories.length > 1;

  const tap = (p: AssignItem['people'][number], c: AssignItem['categories'][number], v: AssignItem['categories'][number]['values'][number]) => {
    if (locked) return;
    setConfirmClear(false);
    const next = cycleCell(marks, p.id, c.id, v.id);
    onChange(next);
    setSaid(`${p.label} – ${v.label}: ${markWord(next[cellKey(p.id, c.id, v.id)])}`);
  };

  // Arrow keys move between boxes of one grid.
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, ci: number, pi: number, vi: number) => {
    const cat = item.categories[ci];
    let r = pi, k = vi;
    if (e.key === 'ArrowUp') r -= 1;
    else if (e.key === 'ArrowDown') r += 1;
    else if (e.key === 'ArrowLeft') k -= 1;
    else if (e.key === 'ArrowRight') k += 1;
    else return;
    if (r < 0 || r >= item.people.length || k < 0 || k >= cat.values.length) return;
    e.preventDefault();
    refs.current[cellKey(item.people[r].id, cat.id, cat.values[k].id)]?.focus();
  };

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setSaid('Tap again to clear the whole grid.');
      return;
    }
    setConfirmClear(false);
    onChange({});
    setSaid('The grid is clear.');
  };

  return (
    <div className="play-assign">
      <p className="play-help">
        Tap a box once for <strong className="play-no-word"><span aria-hidden="true">✗ </span>no</strong>, twice for{' '}
        <strong className="play-yes-word"><span aria-hidden="true">✓ </span>yes</strong>, and a third time to clear it.
        {two ? ' Each row gets one yes in each grid.' : ' Each row gets one yes.'}
      </p>
      <div className="play-grids">
        {item.categories.map((cat, ci) => (
          <table key={cat.id} className={`play-grid${cat.values.length >= 4 ? ' play-grid--many' : ''}`}>
            <caption className="play-grid-cap">{cat.label}</caption>
            <thead>
              <tr>
                <td className="play-grid-corner" />
                {cat.values.map((v) => (
                  <th key={v.id} scope="col">{v.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.people.map((p, pi) => (
                <tr key={p.id}>
                  <th scope="row">{p.label}</th>
                  {cat.values.map((v, vi) => {
                    const k = cellKey(p.id, cat.id, v.id);
                    const m = marks[k];
                    return (
                      <td key={v.id}>
                        <button
                          ref={(el) => { refs.current[k] = el; }}
                          type="button"
                          className={`play-cell${m ? ` play-cell--${m}` : ''}`}
                          aria-label={`${p.label} – ${v.label}: ${markWord(m)}`}
                          aria-disabled={locked || undefined}
                          onClick={() => tap(p, cat, v)}
                          onKeyDown={(e) => onKey(e, ci, pi, vi)}
                        >
                          {m === 'yes' && <PlayIcon name="check" size={26} />}
                          {m === 'no' && <PlayIcon name="cross" size={22} />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      {!locked && any && (
        <button type="button" className="play-btn play-btn--ghost play-btn--small" onClick={clear} onBlur={() => setConfirmClear(false)}>
          {confirmClear ? 'Tap again to clear' : two ? 'Clear the grids' : 'Clear the grid'}
        </button>
      )}
      <div className="play-sr" role="status" aria-live="polite">
        {said}
      </div>
    </div>
  );
}

// ---------- knights and knaves ----------

const KIND_ICON: Record<string, IconName> = { knight: 'shield', knave: 'mask' };

function KindChoice({ item, marks, locked, onChange, person, name }: AssignBodyProps & { person: string; name: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  return (
    <>
      {item.categories.map((cat) => {
        const picked = cat.values.findIndex((v) => marks[cellKey(person, cat.id, v.id)] === 'yes');
        const choose = (i: number) => { if (!locked) onChange(pickValue(item, marks, person, cat.id, cat.values[i].id)); };
        const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
          const n = cat.values.length;
          let j = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
          else if (e.key === 'Home') j = 0;
          else if (e.key === 'End') j = n - 1;
          if (j < 0) return;
          e.preventDefault();
          refs.current[`${cat.id}:${j}`]?.focus();
          choose(j);
        };
        return (
          <div
            key={cat.id}
            role="radiogroup"
            aria-label={item.categories.length === 1 ? `What is ${name}?` : `${name}: ${cat.label}`}
            className="play-kinds"
          >
            {cat.values.map((v, i) => {
              const on = i === picked;
              const icon = KIND_ICON[v.id];
              return (
                <button
                  key={v.id}
                  ref={(el) => { refs.current[`${cat.id}:${i}`] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={locked || undefined}
                  tabIndex={i === Math.max(0, picked) ? 0 : -1}
                  className={`play-kind play-kind--${v.id}${on ? ' is-on' : ''}`}
                  onClick={() => choose(i)}
                  onKeyDown={(e) => onKey(e, i)}
                >
                  {icon && <PlayIcon name={icon} size={18} />}
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/** Each speaker from the scene, with a Knight / Knave choice under their words. */
export function AssignToggles(props: AssignBodyProps) {
  const { item, flagged } = props;
  const scene = item.scene?.kind === 'speakers' ? item.scene : null;
  return (
    <div className="play-speakers">
      {scene?.rule && <RuleBanner rule={scene.rule} />}
      <ul className="play-speaker-list" aria-label="Who says what">
        {item.people.map((p, i) => {
          const sp = scene?.speakers.find((s) => s.id === p.id);
          return (
            <SpeakerCard key={p.id} name={sp?.name ?? p.label} says={sp?.says} index={i} flagged={!!flagged?.includes(i)}>
              <KindChoice {...props} person={p.id} name={p.label} />
            </SpeakerCard>
          );
        })}
      </ul>
    </div>
  );
}

