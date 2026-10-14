/**
 * A guided board: the Do beat of See -> Do -> Quiz. The worked example's board stays up, one case is shown
 * already marked, and the learner marks a new case by taps (true or false, fits or not, a check or a cross, a
 * count, keep or reject). "Check my marks" names the first mismatch in plain words. A wrong mark stays as the
 * learner set it until they change it: nothing is filled in for them. Only a fully right board moves on.
 *
 * Kid mode (Grades 1 to 3) with the board's kid line (LessonDef.kid.board): the line is the title, and the body,
 * the steps, the notes, the needs and the compare rows stay hidden. A board of rows is marked one mark per page, row
 * by row and mark by mark, each page with the row's kid label and picture and the mark's own kid label or picture;
 * yes-like / no-like options (true/false, yes/no, fit/not, keep/reject) are a check tile and a cross tile, and word
 * options with a kid picture (KidBoard.options) are picture tiles. A grid or case board keeps its own board. A kid-only
 * replacement step (KidBoard.alt) is drawn and checked in place of the step, in kid mode only.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { checkDrill, drillSpeech, rowDone, type DrillCheck } from '../../engine/drill';
import { CaseBoard, firstPicked } from './CaseBoard';
import { BecauseRows, CompareRows, ConfusedPanel, MethodSteps } from './Distinction';
import type { DrillMark, DrillOption, DrillRow, DrillStep, KidBoard } from '../../engine/types';
import { asSentence, sceneSpeech, stopSpeaking } from '../speech';
import { useKidMode } from '../kidMode';
import { autoSay, kidBoardSpeech, yesNoOf } from '../kidPlay';
import { Tiles, yesNoTiles } from './KidPlay';
import { Pictogram } from './Pictogram';
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
  /** "I’m confused" was opened: it counts as help, like a hint. */
  onHelp?(): void;
  /** The board's kid layer (one line, and kid labels for its rows), drawn in kid mode. */
  kid?: KidBoard;
  /** Kid mode, a board of rows: the row to mark first, by its place among the rows to mark (0-based). */
  startRow?: number;
  /** Kid mode, a board of rows: the mark of that row to mark first, by its place among its marks to tap (0-based). */
  startMark?: number;
}

const isTruthy = (id: string) => id === 'true' || id === 'yes' || id === 'fit' || id === 'holds' || id === 'keep';
const isFalsy = (id: string) => id === 'false' || id === 'no' || id === 'not' || id === 'crashes' || id === 'reject';

/** A sentence answer (long options): a shown mark also lists the other options, crossed out. */
const isSentenceMark = (m: DrillMark) => m.options.some((o) => o.label.length > 16);

function GivenMark({ m, under }: { m: DrillMark; under?: ReactNode }) {
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
      {under}
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
  /** Under the options: the two facts to compare (CompareRows), on a full scaffold or after a wrong check. */
  under?: ReactNode;
}

function TapMark({ m, rowLabel, pick, wrong, locked, onPick, under }: TapMarkProps) {
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
      {under}
    </div>
  );
}

const cellWord = (v: string | undefined) => (v === 'yes' ? 'check' : v === 'no' ? 'cross' : 'blank');
/** A grid box's next mark: blank, then ✗, then ✓, then blank again (the same order as the logic grids). */
const nextCell = (v: string | undefined) => (v === undefined ? 'no' : v === 'no' ? 'yes' : undefined);

interface DrillGridProps {
  /** Kid mode: no help line (the board's kid line says what to do). */
  kid?: boolean;
  step: DrillStep;
  picks: Record<string, string>;
  wrong: readonly string[];
  locked: boolean;
  onPick(markId: string, option: string | undefined): void;
}

/** A grid board: rows by columns of boxes. Given boxes are drawn marked; the learner taps the others. */
function DrillGrid({ step, picks, wrong, locked, onPick, kid = false }: DrillGridProps) {
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
      {!kid && <p className="play-help">
        Tap a box once for <strong className="play-no-word"><span aria-hidden="true">✗ </span>no</strong>, twice for{' '}
        <strong className="play-yes-word"><span aria-hidden="true">✓ </span>yes</strong>, and a third time to clear it.
      </p>}
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

/** The step a board draws in kid mode: its kid-only replacement (KidBoard.alt) when it has one, else the step. */
export const kidBoardStep = (step: DrillStep, kid: KidBoard | undefined): DrillStep => kid?.alt ?? step;

/** Does a board draw one mark per page in kid mode? A board of rows (no grid, no case board) with marks to tap. */
export const kidPaged = (step: DrillStep): boolean =>
  !step.columns && step.layout !== 'cases' && step.rows.some((r) => r.marks.some((m) => !m.given));

/** One page of a kid board of rows: a row (its index in the step's rows) and one mark to tap (its index in the row). */
export interface KidBoardPage {
  row: number;
  mark: number;
}

/** A kid board's pages in order: row by row, then mark by mark, one page per mark to tap (shown marks have none). */
export function kidBoardPages(step: DrillStep): KidBoardPage[] {
  return step.rows.flatMap((r, row) => r.marks.flatMap((m, mark) => (m.given ? [] : [{ row, mark }])));
}

/**
 * The words a kid page shows over its tiles: the row's label (its kid label, else its own; '' shows none) and the
 * mark's label (its kid label; else nothing when it has a kid picture; else its own label when the row has several
 * marks to tap, as the board's line asks a row's only mark).
 */
export function kidPageWords(step: DrillStep, kid: KidBoard, page: KidBoardPage): { row?: string; mark?: string } {
  const r = step.rows[page.row];
  const m = r?.marks[page.mark];
  if (!r || !m) return {};
  const kr = kid.rows?.[page.row];
  const km = kr?.marks?.[page.mark];
  const several = r.marks.filter((x) => !x.given).length > 1;
  const row = kr?.label ?? r.label;
  const mark = km?.label ?? (km?.art ? undefined : several ? m.label : undefined);
  return { row: row || undefined, mark: mark || undefined };
}

/** A kid page as read aloud: the board's line, the row's label, then the mark's label. */
export function kidPageSpeech(kid: KidBoard, step: DrillStep, page: KidBoardPage | undefined): string[] {
  if (!page) return kidBoardSpeech(kid);
  const words = kidPageWords(step, kid, page);
  return [...kidBoardSpeech(kid, words.row), ...(words.mark ? [asSentence(words.mark)] : [])];
}

export function DrillBoard(props: DrillBoardProps) {
  const kidMode = useKidMode();
  const { kid, embedded, scratch } = props;
  const kidOn = !!kidMode && !!kid && !embedded && !scratch;
  // Kid mode: a kid-only replacement step is drawn and checked in place of the step. Classic play never sees it.
  const step = kidOn ? kidBoardStep(props.step, kid) : props.step;
  // A board of rows in kid mode is marked one mark per page.
  if (kidOn && kid && kidPaged(step)) return <KidRowBoard {...props} step={step} kid={kid} />;
  return <ClassicBoard {...props} step={step} kid={kidOn ? kid : undefined} />;
}

interface OptionTilesProps {
  options: readonly DrillOption[];
  /** The kid pictures, by option id (KidBoard.options). An option without one prints its own label. */
  art: NonNullable<KidBoard['options']>;
  pick: string | undefined;
  locked: boolean;
  /** After a check: the picked option when it is not yet right. */
  miss?: string;
  labelledBy?: string;
  label?: string;
  onPick(option: string): void;
}

/**
 * Word options as big picture tiles in a radio group: the kid picture with at most one word under it, or the
 * option's own label when it has no picture. Each tile is announced by its option's own label. Arrow keys move.
 */
function OptionTiles({ options, art, pick, locked, miss, labelledBy, label, onPick }: OptionTilesProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIdx = Math.max(0, options.findIndex((o) => o.id === pick));
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = options.length;
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n : -1;
    if (to < 0) return;
    e.preventDefault();
    refs.current[to]?.focus();
    if (!locked) onPick(options[to].id);
  };
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label} className={`kid-tiles kid-option-tiles${options.length > 2 ? ' kid-tiles--many' : ''}`}>
      {options.map((o, i) => {
        const pic = art[o.id];
        const word = pic ? pic.word : o.label;
        const on = pick === o.id;
        const cls = ['kid-tile', on ? 'is-picked' : '', miss === o.id ? 'is-miss' : ''].filter(Boolean).join(' ');
        return (
          <button
            key={o.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={miss === o.id ? `${o.label}, not yet` : o.label}
            aria-disabled={locked || undefined}
            tabIndex={i === focusIdx ? 0 : -1}
            className={cls}
            data-tile={o.id}
            onClick={() => { if (!locked) onPick(o.id); }}
            onKeyDown={(e) => onKey(e, i)}
          >
            {pic && <Pictogram name={pic.art} size={56} decorative />}
            {word && <span className="kid-tile-word">{word}</span>}
          </button>
        );
      })}
    </div>
  );
}

interface KidMarkTilesProps {
  m: DrillMark;
  kid: KidBoard;
  pick: string | undefined;
  locked: boolean;
  /** After a check: the picked option when it is not yet right. */
  miss?: string;
  labelledBy?: string;
  onPick(option: string): void;
}

/** One mark's answers as kid tiles: a check and a cross for a yes/no pair, picture tiles, else the options' words. */
function KidMarkTiles({ m, kid, pick, locked, miss, labelledBy, onPick }: KidMarkTilesProps) {
  const pair = yesNoOf(m.options);
  if (pair) return <Tiles options={yesNoTiles(m.options, pair)} pick={pick} onPick={onPick} locked={locked} labelledBy={labelledBy} miss={miss} />;
  const art = kid.options;
  if (art && m.options.some((o) => art[o.id])) {
    return <OptionTiles options={m.options} art={art} pick={pick} locked={locked} miss={miss} labelledBy={labelledBy} label={m.label} onPick={onPick} />;
  }
  return (
    <div role="radiogroup" aria-label={m.label} className="play-drill-options">
      {m.options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={pick === o.id} aria-disabled={locked || undefined} className={`play-kind play-drill-option${pick === o.id ? ' is-on' : ''}${miss === o.id ? ' is-miss' : ''}`} onClick={() => { if (!locked) onPick(o.id); }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A board of rows in kid mode: one mark per page, row by row and mark by mark, under the board's one line. Each page
 * shows the row's kid label and picture, then the mark's kid label or picture and its tiles. Check moves to the next
 * page once this mark is right; a wrong mark stays until it is changed, and each check that finds it wrong counts
 * one miss. After the last page: "Yes!" and the button.
 */
function KidRowBoard({ step, kid, readAloud, doneLabel = 'Next', autoFocus = true, onDone, onWrong, startRow = 0, startMark = 0 }: DrillBoardProps & { kid: KidBoard }) {
  const kidMode = useKidMode();
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  /** The pages: one per mark to tap (shown rows and marks are the worked case on the cards). */
  const pages = kidBoardPages(step);
  const [at, setAt] = useState(() => {
    const rows = [...new Set(pages.map((p) => p.row))];
    const row = rows[Math.max(0, Math.min(rows.length - 1, startRow))];
    const mine = pages.flatMap((p, i) => (p.row === row ? [i] : []));
    return mine[Math.max(0, Math.min(mine.length - 1, startMark))] ?? 0;
  });
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(false);
  const misses = useRef(0);
  const checks = useRef(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const page = pages[at];
  const row = page ? step.rows[page.row] : undefined;
  const mark = page && row ? row.marks[page.mark] : undefined;
  const kidRow = page ? kid.rows?.[page.row] : undefined;
  const kidMark = page ? kidRow?.marks?.[page.mark] : undefined;
  const words = page ? kidPageWords(step, kid, page) : {};

  useEffect(() => {
    if (autoFocus) titleRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const pick = (markId: string, option: string) => {
    stopSpeaking();
    setPicks((p) => ({ ...p, [markId]: option }));
    setWrong(false);
  };
  const check = () => {
    if (!mark) return;
    checks.current += 1;
    const picked = picks[mark.id];
    if (picked !== mark.answer) {
      setWrong(true);
      // A blank mark is not a miss; a wrong one is, once for each check that finds it.
      if (picked !== undefined) {
        misses.current += 1;
        onWrong?.();
      }
      return;
    }
    if (at + 1 < pages.length) {
      setAt(at + 1);
      autoSay(kidMode, kidPageSpeech(kid, step, pages[at + 1]));
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }
    // The last mark is right: the whole board is (each mark was checked before moving on).
    if (checkDrill(step, picks).done) {
      setDone(true);
      autoSay(kidMode, ['Yes!']);
    }
  };

  const rowId = `${uid}-row`;
  const markId = `${uid}-mark`;
  const miss = wrong && mark && picks[mark.id] !== undefined && picks[mark.id] !== mark.answer ? picks[mark.id] : undefined;
  return (
    <section className="play-card play-drill kid-board" aria-roledescription="guided board">
      <div className="play-item-top">
        <span />
        {readAloud && <ReadAloudButton key={at} label="Read the board aloud" text={() => (done ? ['Yes!'] : kidPageSpeech(kid, step, page))} />}
      </div>
      <h2 className="play-idea-title kid-line" ref={titleRef} tabIndex={-1}>
        {kid.line}
      </h2>
      {kid.scene === 'scene' && step.scene && (
        <div className="kid-board-scene">
          <SceneView scene={step.scene} />
        </div>
      )}
      {!done && row && mark && (
        <div className="kid-board-row">
          {kidRow?.art && <Pictogram name={kidRow.art} size={64} decorative />}
          {words.row && <p className="kid-row-label" id={rowId}>{words.row}</p>}
          {row.things && row.things.length > 0 && (
            <ul className="play-things play-drill-things" aria-label="The cards">
              {row.things.map((t) => (
                <li key={t.id} className="play-things-slot">
                  <ThingCard thing={t} locked />
                </li>
              ))}
            </ul>
          )}
          <div className="kid-board-marks">
            <div key={mark.id} className="kid-board-mark">
              {(kidMark?.art || mark.thing) && (
                <div className="kid-mark-pic">
                  {/* A mark drawn only as a picture is named by its picture. */}
                  {kidMark?.art && <Pictogram name={kidMark.art} size={56} decorative={!!words.mark} />}
                  {mark.thing && <ThingCard thing={mark.thing} />}
                </div>
              )}
              {words.mark && <span className="play-drill-mark-label kid-mark-label" id={markId}>{words.mark}</span>}
              {/* No words on the page (a picture-only mark under no row label): the tiles are named by the mark's own label. */}
              {!words.mark && !words.row && <span className="play-sr" id={markId}>{mark.label}</span>}
              <KidMarkTiles
                m={mark}
                kid={kid}
                pick={picks[mark.id]}
                locked={done}
                miss={miss}
                labelledBy={words.mark || !words.row ? markId : rowId}
                onPick={(o) => pick(mark.id, o)}
              />
            </div>
          </div>
        </div>
      )}
      {done && (
        <div className="kid-board-done">
          <Pictogram name="check" size={64} decorative />
          <p className="kid-yes">Yes!</p>
        </div>
      )}
      <p role="status" className="kid-board-status">
        {wrong && !done && (
          <>
            <Pictogram name="question" size={36} decorative />
            <span className="play-sr">Not yet. Look again.</span>
          </>
        )}
      </p>
      <div className="play-actions">
        {!done ? (
          <button type="button" className="play-btn play-btn--primary play-btn--grow kid-big-btn" onClick={check}>
            Check
          </button>
        ) : (
          <button
            ref={doneRef}
            type="button"
            className="play-btn play-btn--primary play-btn--grow kid-big-btn"
            onClick={() => {
              stopSpeaking();
              onDone({ firstTry: misses.current === 0, checks: checks.current });
            }}
          >
            {doneLabel}
          </button>
        )}
      </div>
    </section>
  );
}

function ClassicBoard({ step, readAloud, kicker = 'Do it', doneLabel = 'Next', embedded = false, autoFocus = true, onDone, onWrong, settled = false, scratch = false, onHelp, kid }: DrillBoardProps) {
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [confused, setConfused] = useState(false);
  const confusedBtn = useRef<HTMLButtonElement>(null);
  const cases = step.layout === 'cases';
  /** A case board: the box whose case is shown. */
  const [picked, setPicked] = useState<number | null>(() => (cases ? firstPicked(step) : null));
  /** The latest check, kept until a mark changes (then the message stays, but a changed mark is no longer flagged). */
  const [result, setResult] = useState<DrillCheck | null>(null);
  const [checks, setChecks] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const done = !!result?.done;
  /** Full scaffold on a row board: the compare facts under every mark to tap, the comparison under every shown mark,
   *  the need over a row's marks, and the method's steps (DrillStep.steps). Light: the facts only after a wrong check. */
  const full = step.scaffold === 'full';
  const words = step.words;
  const needsLine = (needs: string) => (words?.needs === undefined ? `The rule needs ${needs}.` : words.needs ? `${words.needs} ${needs}` : needs);
  /** Where the learner is on a row board: the first mark to tap that is still blank, in board order. */
  const toTap = step.rows.flatMap((r) => r.marks.filter((m) => !m.given));
  const stepAt = done ? (step.steps?.length ?? 0) : Math.min(Math.max(0, toTap.findIndex((m) => picks[m.id] === undefined) < 0 ? toTap.length : toTap.findIndex((m) => picks[m.id] === undefined)), Math.max(0, (step.steps?.length ?? 1) - 1));

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
        {kid ? <span /> : <span className="play-kicker">{kicker}</span>}
        {readAloud && (
          <ReadAloudButton
            label="Read the board aloud"
            text={() => {
              if (kid) return kidBoardSpeech(kid);
              const lines = drillSpeech(step);
              // A case board draws its scene itself, so it reads it too.
              return [lines[0], ...(step.scene && (!embedded || cases) ? sceneSpeech(step.scene) : []), ...lines.slice(1)];
            }}
          />
        )}
      </div>
      <Title className={`play-idea-title${kid ? ' kid-line' : ''}`} ref={titleRef} tabIndex={-1}>
        {kid ? kid.line : step.title}
      </Title>
      {!embedded && !cases && step.scene && <SceneView scene={step.scene} />}
      {step.twin && !kid && <p className="play-drill-twin"><span className="play-drill-tag">What changed</span> {step.twin}</p>}
      {!kid && <div className="play-idea-body">
        {step.body.map((p, k) => (
          <p key={k} className="play-body">
            {p}
          </p>
        ))}
      </div>}
      {step.columns && (
        <>
          {full && !kid && step.steps && step.steps.length > 0 && <MethodSteps steps={step.steps} at={stepAt} label={step.stepsLabel} />}
          {!kid && step.rows.some((r) => r.needs) && (
            <ul className="play-list play-drill-needs-list" aria-label="What the rule needs">
              {step.rows.filter((r) => r.needs && (full || r.marks.every((m) => m.given) || (!!result && r.marks.some((m) => result.wrong.includes(m.id))))).map((r) => (
                <li key={r.id} className="play-drill-needs">{needsLine(r.needs!)}</li>
              ))}
            </ul>
          )}
          <DrillGrid kid={!!kid} step={step} picks={picks} wrong={result?.wrong ?? []} locked={done} onPick={pickOne} />
          {!kid && step.rows.some((r) => r.note && (r.marks.every((m) => m.given) || done)) && (
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
      {!step.columns && !cases && full && step.steps && step.steps.length > 0 && <MethodSteps steps={step.steps} at={stepAt} label={step.stepsLabel} />}
      {!step.columns && !cases && <div className="play-drill-rows">
        {step.rows.map((row) => {
          const given = row.marks.every((m) => m.given);
          // A row turns teal only once the whole board is right: no checking a row by watching it.
          const finished = given || (done && rowDone(step, row.id, picks));
          const rowFlagged = !!result && row.marks.some((m) => result.wrong.includes(m.id));
          return (
            <div key={row.id} className={`play-drill-row${given ? ' is-given' : ''}${!given && finished ? ' is-done' : ''}`}>
              <h4 className="play-drill-row-title">
                {given && <span className="play-drill-tag">Shown</span>}
                {!given && <span className="play-drill-tag play-drill-tag--you">Your turn</span>}
                {row.label}
              </h4>
              {row.needs && (full || given || rowFlagged) && (!row.needsAfter || given || row.marks.slice(0, -1).every((m) => m.given || picks[m.id] !== undefined)) && <p className="play-drill-needs">{needsLine(row.needs)}</p>}
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
                  <GivenMark key={m.id} m={m} under={m.compare && full ? <BecauseRows compact because={{ says: m.compare.says, world: m.compare.world, match: m.compare.match ?? isTruthy(m.answer) }} words={m.compare.so ? { ...words, fit: m.compare.so, unfit: m.compare.so } : words} /> : undefined} />
                ) : (
                  <TapMark
                    key={m.id}
                    m={m}
                    rowLabel={row.label}
                    pick={picks[m.id]}
                    wrong={!!result && result.wrong.includes(m.id)}
                    locked={done}
                    onPick={(o) => pickOne(m.id, o)}
                    under={m.compare && (full || rowFlagged) && !done ? <CompareRows says={m.compare.says} world={m.compare.world} words={words} /> : undefined}
                  />
                ),
              )}
              {row.note && (given || (done && finished)) && <p className="play-drill-note">{row.note}</p>}
            </div>
          );
        })}
      </div>}
      {!scratch && kid && (
        <p ref={statusRef} tabIndex={-1} role="status" className="kid-board-status">
          {done ? <span className="kid-yes">Yes!</span> : result?.message ? (
            <>
              <Pictogram name="question" size={36} decorative />
              <span className="play-sr">Not yet. {result.message}</span>
            </>
          ) : null}
        </p>
      )}
      {!scratch && !kid && (
        <p ref={statusRef} tabIndex={-1} role="status" className={`play-drill-status${done ? ' is-done' : result?.message ? (result.diagnosis ? ' is-wrong is-diagnosis' : ' is-wrong') : ''}`}>
          {!done && result?.diagnosis && <span className="play-drill-tag">A mix-up to untangle</span>}
          {done ? step.done : result ? result.message : ''}
        </p>
      )}
      {confused && step.confused && (
        <ConfusedPanel
          questions={step.confused}
          closing={words?.closing}
          onClose={() => {
            setConfused(false);
            requestAnimationFrame(() => confusedBtn.current?.focus());
          }}
        />
      )}
      {!scratch && !settled && <div className="play-actions">
        {!done && step.confused && !confused && !kid && (
          <button
            ref={confusedBtn}
            type="button"
            className="play-btn play-btn--ghost play-confused-btn"
            aria-expanded={confused}
            onClick={() => {
              setConfused(true);
              onHelp?.();
            }}
          >
            <PlayIcon name="help" size={18} /> I’m confused
          </button>
        )}
        {!done ? (
          <button type="button" className="play-btn play-btn--primary play-btn--grow" onClick={check}>
            {kid ? 'Check' : 'Check my marks'}
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
