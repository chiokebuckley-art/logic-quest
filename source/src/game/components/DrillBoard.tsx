/**
 * A guided board: the Do beat of See -> Do -> Quiz. The worked example's board stays up, one case is shown
 * already marked, and the learner marks a new case by taps (true or false, fits or not, a check or a cross, a
 * count, keep or reject). "Check my marks" names the first mismatch in plain words. A wrong mark stays as the
 * learner set it until they change it: nothing is filled in for them. Only a fully right board moves on.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { checkDrill, drillSpeech, rowDone, type DrillCheck } from '../../engine/drill';
import { CaseBoard, firstPicked } from './CaseBoard';
import type { DrillMark, DrillRow, DrillStep } from '../../engine/types';
import { sceneSpeech, stopSpeaking } from '../speech';
import { ReadAloudButton } from './ReadAloud';
import { SceneView } from './SceneView';
import { PlayIcon, ThingCard } from './ThingCard';

export interface DrillBoardProps {
  step: DrillStep;
  readAloud: boolean;
  /** Small label above the title. Default "Do it". */
  kicker?: string;
  /** The button once every mark is right. Default "Next". */
  doneLabel?: string;
  /** Inside a question: the question already shows the board (scene), and the card frame is dropped. */
  embedded?: boolean;
  /** Move the focus to the title when the board opens. Default true. */
  autoFocus?: boolean;
  /** Every mark is right. firstTry: right at the first "Check my marks". */
  onDone(result: { firstTry: boolean; checks: number }): void;
  /** A check found a wrong mark (not only empty ones). */
  onWrong?(): void;
  /** The board is done and its button was used: it stays up, marked and locked, with no button. */
  settled?: boolean;
  /** A thinking board: marks are free, nothing is checked, and there is no button. */
  scratch?: boolean;
}

const isTruthy = (id: string) => id === 'true' || id === 'yes' || id === 'fit' || id === 'holds' || id === 'keep';
const isFalsy = (id: string) => id === 'false' || id === 'no' || id === 'not' || id === 'crashes' || id === 'reject';

/** A sentence answer (long options): a shown mark also lists the other options, crossed out. */
const isSentenceMark = (m: DrillMark) => m.options.some((o) => o.label.length > 16);

function GivenMark({ m }: { m: DrillMark }) {
  const label = m.options.find((o) => o.id === m.answer)?.label ?? m.answer;
  const others = isSentenceMark(m) ? m.options.filter((o) => o.id !== m.answer) : [];
  return (
    <div className={`play-drill-mark is-given${m.thing ? ' has-thing' : ''}${others.length ? ' is-sentence' : ''}`}>
      <span className="play-drill-mark-label">
        {m.thing && <span className="play-drill-thing" aria-hidden="true"><ThingCard thing={m.thing} /></span>}
        {m.label}
      </span>
      <span className={`play-drill-value${isTruthy(m.answer) ? ' is-yes' : isFalsy(m.answer) ? ' is-no' : ''}`}>
        {(isTruthy(m.answer) || others.length > 0) && <PlayIcon name="check" size={14} />}
        {isFalsy(m.answer) && <PlayIcon name="cross" size={14} />}
        {label}
      </span>
      {others.length > 0 && (
        <ul className="play-drill-not" aria-label="Not these">
          {others.map((o) => (
            <li key={o.id}>
              <PlayIcon name="cross" size={12} />
              <s>{o.label}</s>
              <span className="play-sr"> (not this one)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface TapMarkProps {
  m: DrillMark;
  rowLabel: string;
  pick: string | undefined;
  /** After a check: this mark is set to a wrong option. It stays flagged until the learner changes it. */
  wrong: boolean;
  /** The board is done: lock every mark. */
  locked: boolean;
  onPick(option: string): void;
}

function TapMark({ m, rowLabel, pick, wrong, locked, onPick }: TapMarkProps) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIdx = Math.max(0, m.options.findIndex((o) => o.id === pick));
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = m.options.length;
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n : -1;
    if (to < 0) return;
    e.preventDefault();
    refs.current[to]?.focus();
    if (!locked) onPick(m.options[to].id);
  };
  return (
    <div className={`play-drill-mark${wrong ? ' is-wrong' : ''}${m.thing ? ' has-thing' : ''}`}>
      <span className="play-drill-mark-label" id={`${uid}-l`}>
        {m.thing && <span className="play-drill-thing" aria-hidden="true"><ThingCard thing={m.thing} /></span>}
        {m.label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${uid}-l`}
        aria-describedby={`${uid}-r`}
        className={`play-drill-options${m.options.length > 3 ? (m.options.every((o) => o.label.length <= 3) ? ' play-drill-options--tiny' : ' play-drill-options--many') : ''}`}
      >
        <span id={`${uid}-r`} className="play-sr">
          {rowLabel}
        </span>
        {m.options.map((o, i) => {
          const on = pick === o.id;
          const cls = ['play-kind', 'play-drill-option', on ? 'is-on' : '', on && wrong ? 'is-miss' : '', on && locked ? 'is-right' : ''].filter(Boolean).join(' ');
          return (
            <button
              key={o.id}
              ref={(el) => { refs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={locked || undefined}
              tabIndex={i === focusIdx ? 0 : -1}
              className={cls}
              onClick={() => { if (!locked) onPick(o.id); }}
              onKeyDown={(e) => onKey(e, i)}
            >
              {o.label}
              {on && wrong && <span className="play-sr"> (not yet)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const cellWord = (v: string | undefined) => (v === 'yes' ? 'check' : v === 'no' ? 'cross' : 'blank');
/** A grid box's next mark: blank, then ✗, then ✓, then blank again (the same order as the logic grids). */
const nextCell = (v: string | undefined) => (v === undefined ? 'no' : v === 'no' ? 'yes' : undefined);

interface DrillGridProps {
  step: DrillStep;
  picks: Record<string, string>;
  wrong: readonly string[];
  locked: boolean;
  onPick(markId: string, option: string | undefined): void;
}

/** A grid board: rows by columns of boxes. Given boxes are drawn marked; the learner taps the others. */
function DrillGrid({ step, picks, wrong, locked, onPick }: DrillGridProps) {
  const cols = step.columns ?? [];
  /** A row name with a long word ("Sprinkler"): a wider name column, so the word never breaks at 320px. */
  const longRows = step.rows.some((r) => r.label.split(/\s+/).some((w) => w.length >= 8));
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [said, setSaid] = useState('');
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const d = e.key === 'ArrowUp' ? [-1, 0] : e.key === 'ArrowDown' ? [1, 0] : e.key === 'ArrowLeft' ? [0, -1] : e.key === 'ArrowRight' ? [0, 1] : null;
    if (!d) return;
    e.preventDefault();
    // Move to the next box the learner can tap in that direction, past any shown boxes.
    for (let rr = r + d[0], cc = c + d[1]; step.rows[rr]?.marks[cc]; rr += d[0], cc += d[1]) {
      const m = step.rows[rr].marks[cc];
      if (!m.given) {
        refs.current[m.id]?.focus();
        return;
      }
    }
  };
  const cell = (row: DrillRow, m: DrillMark, r: number, c: number) => {
    const col = cols[c] ?? m.label;
    if (m.given) {
      return (
        <span className={`play-cell play-cell--pic play-cell--${m.answer}`} role="img" aria-label={`${row.label} – ${col}: ${cellWord(m.answer)}, shown`}>
          {m.answer === 'yes' && <PlayIcon name="check" size={22} />}
          {m.answer === 'no' && <PlayIcon name="cross" size={18} />}
        </span>
      );
    }
    const v = picks[m.id];
    return (
      <button
        ref={(el) => { refs.current[m.id] = el; }}
        type="button"
        className={`play-cell${v ? ` play-cell--${v}` : ''}${wrong.includes(m.id) ? ' is-miss' : ''}`}
        aria-label={`${row.label} – ${col}: ${cellWord(v)}${wrong.includes(m.id) ? ', not yet' : ''}`}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (locked) return;
          const next = nextCell(v);
          onPick(m.id, next);
          setSaid(`${row.label} – ${col}: ${cellWord(next)}`);
        }}
        onKeyDown={(e) => onKey(e, r, c)}
      >
        {v === 'yes' && <PlayIcon name="check" size={26} />}
        {v === 'no' && <PlayIcon name="cross" size={22} />}
      </button>
    );
  };
  return (
    <div className="play-assign">
      <p className="play-help">
        Tap a box once for <strong className="play-no-word"><span aria-hidden="true">✗ </span>no</strong>, twice for{' '}
        <strong className="play-yes-word"><span aria-hidden="true">✓ </span>yes</strong>, and a third time to clear it.
      </p>
      <table className={`play-grid play-drill-grid${cols.length >= 4 ? ' play-grid--many' : cols.length === 3 ? ' play-drill-grid--wide' : ''}${longRows ? ' play-drill-grid--longrows' : ''}`}>
        {step.caption && <caption className="play-grid-cap">{step.caption}</caption>}
        <thead>
          <tr>
            <td className="play-grid-corner" />
            {cols.map((c) => (
              <th key={c} scope="col">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {step.rows.map((row, r) => (
            <tr key={row.id}>
              <th scope="row">{row.label}</th>
              {row.marks.map((m, c) => (
                <td key={m.id}>{cell(row, m, r, c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="play-sr" role="status" aria-live="polite">
        {said}
      </div>
    </div>
  );
}

export function DrillBoard({ step, readAloud, kicker = 'Do it', doneLabel = 'Next', embedded = false, autoFocus = true, onDone, onWrong, settled = false, scratch = false }: DrillBoardProps) {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const cases = step.layout === 'cases';
  /** A case board: the box whose case is shown. */
  const [picked, setPicked] = useState<number | null>(() => (cases ? firstPicked(step) : null));
  /** The latest check, kept until a mark changes (then the message stays, but a changed mark is no longer flagged). */
  const [result, setResult] = useState<DrillCheck | null>(null);
  const [checks, setChecks] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const done = !!result?.done;

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus({ preventScroll: embedded });
  }, [autoFocus, embedded]);

  const pickOne = (markId: string, option: string | undefined) => {
    if (picks[markId] === option) return;
    setPicks((p) => {
      const next = { ...p };
      if (option === undefined) delete next[markId];
      else next[markId] = option;
      return next;
    });
    // A changed mark is no longer flagged; the others stay as they were. The message goes once the mark it names
    // changes (or, when it only counted empty marks, at any change), so it never contradicts the board.
    setResult((r) => {
      if (!r || r.done) return r;
      const named = r.wrong[0];
      const stale = named === markId || (!named && r.missing.length > 0);
      return { ...r, wrong: r.wrong.filter((w) => w !== markId), missing: r.missing.filter((w) => w !== markId), message: stale ? '' : r.message };
    });
  };

  /** Clear the learner's marks in one row (a case board's "Clear this case"). */
  const clearRow = (rowId: string) => {
    const ids = step.rows.find((r) => r.id === rowId)?.marks.filter((m) => !m.given).map((m) => m.id) ?? [];
    setPicks((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !ids.includes(k))));
    setResult((r) => {
      if (!r || r.done) return r;
      const stale = (r.wrong[0] && ids.includes(r.wrong[0])) || (!r.wrong[0] && r.missing.length > 0);
      return { ...r, wrong: r.wrong.filter((w) => !ids.includes(w)), message: stale ? '' : r.message };
    });
  };

  const check = () => {
    const r = checkDrill(step, picks);
    setResult(r);
    setChecks((n) => n + 1);
    if (r.wrong.length) onWrong?.();
    // A case board shows the case the message is about.
    if (cases && !r.done && r.row) {
      const box = step.rows.find((x) => x.id === r.row)?.case?.box;
      if (box !== undefined) setPicked(box);
    }
    requestAnimationFrame(() => statusRef.current?.focus({ preventScroll: false }));
  };

  const Title = embedded ? 'h3' : 'h2';
  return (
    <section className={embedded ? 'play-drill play-drill--embedded' : 'play-card play-drill'} aria-roledescription="guided board">
      <div className="play-item-top">
        <span className="play-kicker">{kicker}</span>
        {readAloud && (
          <ReadAloudButton
            label="Read the board aloud"
            text={() => {
              const lines = drillSpeech(step);
              // A case board draws its scene itself, so it reads it too.
              return [lines[0], ...(step.scene && (!embedded || cases) ? sceneSpeech(step.scene) : []), ...lines.slice(1)];
            }}
          />
        )}
      </div>
      <Title className="play-idea-title" ref={titleRef} tabIndex={-1}>
        {step.title}
      </Title>
      {!embedded && !cases && step.scene && <SceneView scene={step.scene} />}
      {step.twin && <p className="play-drill-twin"><span className="play-drill-tag">What changed</span> {step.twin}</p>}
      <div className="play-idea-body">
        {step.body.map((p, k) => (
          <p key={k} className="play-body">
            {p}
          </p>
        ))}
      </div>
      {step.columns && (
        <>
          <DrillGrid step={step} picks={picks} wrong={result?.wrong ?? []} locked={done} onPick={pickOne} />
          {step.rows.some((r) => r.note && (r.marks.every((m) => m.given) || done)) && (
            <ul className="play-list play-drill-notes">
              {step.rows.filter((r) => r.note && (r.marks.every((m) => m.given) || done)).map((r) => (
                <li key={r.id}>{r.note}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {cases && (
        <CaseBoard
          step={step}
          picks={picks}
          wrong={result?.wrong ?? []}
          locked={done || settled}
          picked={picked}
          onPickCase={setPicked}
          onPick={pickOne}
          onClear={clearRow}
        />
      )}
      {!step.columns && !cases && <div className="play-drill-rows">
        {step.rows.map((row) => {
          const given = row.marks.every((m) => m.given);
          // A row turns teal only once the whole board is right: no checking a row by watching it.
          const finished = given || (done && rowDone(step, row.id, picks));
          return (
            <div key={row.id} className={`play-drill-row${given ? ' is-given' : ''}${!given && finished ? ' is-done' : ''}`}>
              <h4 className="play-drill-row-title">
                {given && <span className="play-drill-tag">Shown</span>}
                {!given && <span className="play-drill-tag play-drill-tag--you">Your turn</span>}
                {row.label}
              </h4>
              {row.things && row.things.length > 0 && (
                <ul className="play-things play-drill-things" aria-label="The cards">
                  {row.things.map((t) => (
                    <li key={t.id} className="play-things-slot">
                      <ThingCard thing={t} locked />
                    </li>
                  ))}
                </ul>
              )}
              {row.marks.map((m) =>
                m.given ? (
                  <GivenMark key={m.id} m={m} />
                ) : (
                  <TapMark
                    key={m.id}
                    m={m}
                    rowLabel={row.label}
                    pick={picks[m.id]}
                    wrong={!!result && result.wrong.includes(m.id)}
                    locked={done}
                    onPick={(o) => pickOne(m.id, o)}
                  />
                ),
              )}
              {row.note && (given || (done && finished)) && <p className="play-drill-note">{row.note}</p>}
            </div>
          );
        })}
      </div>}
      {!scratch && (
        <p ref={statusRef} tabIndex={-1} role="status" className={`play-drill-status${done ? ' is-done' : result?.message ? ' is-wrong' : ''}`}>
          {done ? step.done : result ? result.message : ''}
        </p>
      )}
      {!scratch && !settled && <div className="play-actions">
        {!done ? (
          <button type="button" className="play-btn play-btn--primary play-btn--grow" onClick={check}>
            Check my marks
          </button>
        ) : (
          <button
            type="button"
            className="play-btn play-btn--primary play-btn--grow"
            onClick={() => {
              stopSpeaking();
              onDone({ firstTry: checks === 1, checks });
            }}
          >
            {doneLabel}
          </button>
        )}
      </div>}
    </section>
  );
}
