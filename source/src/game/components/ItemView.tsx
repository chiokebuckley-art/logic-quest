/**
 * Draws one item and runs it. 'learn' mode: Check, then feedback (right / not yet), a hint, Try again,
 * and "Show me" after two misses. 'check' mode: no feedback and no hint, one answer, an optional calm
 * timer that pauses while the page is hidden. Grading always goes through grade() from the engine.
 * Every record carries the player's last answer (not on a timeout), for "You said" on the check result.
 *
 * The bodies of assign items (logic grids, knights and knaves) live in AssignView and of multi items
 * (text cards) in MultiView. This file also exports the small shared pieces the runners use: the
 * read-aloud button, the play header and step dots, and the pure line-building helpers for order items
 * (tested without a DOM).
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, Ref } from 'react';
import { clueHolds, grade } from '../../engine/grade';
import type { Answer, Graded, Item, LineClue, OrderItem } from '../../engine/types';
import { canSpeak, itemSpeech, speak, stopSpeaking } from '../speech';
import { AssignGrid, AssignToggles, assignReady, assignValues, solvedMarks, type Marks } from './AssignView';
import type { AnswerRecord, ItemViewProps } from './contracts';
import { MultiView } from './MultiView';
import { SceneView, type ClueState } from './SceneView';
import { PlayIcon, ThingCard } from './ThingCard';

// ---------- pure helpers ----------

/** An order item's line while it is built: one entry per spot, first to last; null = empty. */
export type Slots = (string | null)[];

/** Put a name in the first empty spot. Nothing changes if it is already placed or the line is full. */
export function placeName(slots: readonly (string | null)[], id: string): Slots {
  const next = [...slots];
  if (next.includes(id)) return next;
  const i = next.indexOf(null);
  if (i >= 0) next[i] = id;
  return next;
}

/** Take the name in spot i back out of the line. */
export function removeAt(slots: readonly (string | null)[], i: number): Slots {
  const next = [...slots];
  if (i >= 0 && i < next.length) next[i] = null;
  return next;
}

/** Take a name out of the line, wherever it is. */
export function removeName(slots: readonly (string | null)[], id: string): Slots {
  return slots.map((s) => (s === id ? null : s));
}

/** Everyone a line-up clue talks about. */
export function clueNames(c: LineClue): string[] {
  switch (c.t) {
    case 'between': return [c.a, c.b, c.c];
    case 'before':
    case 'rightBefore':
    case 'nextTo':
    case 'notNextTo': return [c.a, c.b];
    case 'first':
    case 'last':
    case 'notFirst':
    case 'notLast':
    case 'place': return [c.a];
  }
}

/**
 * Live state of each clue for a line being built. A clue is judged once everyone it names is placed:
 * 'ok' if it holds with people in their spots, 'broken' if not. Otherwise null (not decided yet).
 * Empty spots keep their place, so "last" and "right before" are judged by real spot numbers.
 */
export function liveClueStates(item: OrderItem, slots: readonly (string | null)[]): ClueState[] {
  const order = slots.map((s, i) => s ?? `\u0000empty-${i}`);
  return item.clues.map((c) => {
    if (!clueNames(c).every((id) => slots.includes(id))) return null;
    return clueHolds(c, order) ? 'ok' : 'broken';
  });
}

/**
 * The Answer for the current controls, or null when nothing can be graded yet (no choice picked).
 * `chosen` holds tapped cards (tapall, multi); `marks` holds grid boxes and knight / knave picks (assign).
 */
export function answerFor(
  item: Item,
  pick: string | null,
  chosen: readonly string[],
  slots: readonly (string | null)[],
  marks: Marks = {},
): Answer | null {
  switch (item.kind) {
    case 'choose': return pick ? { kind: 'choose', id: pick } : null;
    case 'tapall': return { kind: 'tapall', ids: [...chosen] };
    case 'order': return { kind: 'order', ids: slots.filter((s): s is string => s !== null) };
    case 'assign': return { kind: 'assign', values: assignValues(item, marks) };
    case 'multi': return { kind: 'multi', ids: item.choices.filter((c) => chosen.includes(c.id)).map((c) => c.id) };
  }
}

/** Can Check (or Next, in a check) be pressed yet? Choose: a pick. Order: a full line. Assign: one tick per row. */
export function canSubmitFor(item: Item, pick: string | null, slots: readonly (string | null)[], marks: Marks = {}): boolean {
  switch (item.kind) {
    case 'choose': return pick !== null;
    case 'order': return slots.every((s) => s !== null);
    case 'assign': return assignReady(item, marks);
    case 'tapall':
    case 'multi': return true;
  }
}

/** The line under Check while it waits. Empty when Check can be pressed. */
export function waitNoteFor(item: Item, ready: boolean): string {
  if (ready) return '';
  switch (item.kind) {
    case 'order': return 'Place everyone to go on.';
    case 'assign': {
      if (item.layout === 'toggles') {
        const vals = item.categories[0]?.values.map((v) => v.label.toLowerCase()) ?? [];
        return vals.length === 2 ? `Choose ${vals[0]} or ${vals[1]} for everyone to go on.` : 'Make a choice for everyone to go on.';
      }
      return item.categories.length > 1 ? 'Give each row exactly one yes in each grid to go on.' : 'Give each row exactly one yes to go on.';
    }
    default: return 'Pick an answer to go on.';
  }
}

// ---------- shared pieces ----------

/** Speaker button. Reads `text()` aloud; press again to stop. */
export function ReadAloudButton({ text }: { text: () => readonly string[] }) {
  const [on, setOn] = useState(false);
  const [available, setAvailable] = useState(true);
  const mounted = useRef(true);
  const onRef = useRef(false);
  onRef.current = on;
  useEffect(() => {
    mounted.current = true;
    setAvailable(canSpeak());
    return () => {
      mounted.current = false;
      if (onRef.current) stopSpeaking();
    };
  }, []);
  const click = () => {
    if (on) {
      stopSpeaking();
      setOn(false);
      return;
    }
    const ok = speak(text(), { onEnd: () => { if (mounted.current) setOn(false); } });
    setOn(ok);
    if (!ok) setAvailable(false);
  };
  return (
    <button
      type="button"
      className="play-speak"
      aria-label="Read aloud"
      aria-pressed={on}
      disabled={!available}
      title={available ? (on ? 'Stop reading' : 'Read aloud') : 'This browser cannot read aloud'}
      onClick={click}
    >
      <PlayIcon name={on ? 'stop' : 'speaker'} />
    </button>
  );
}

export type DotState = 'done' | 'now' | 'todo';

/** Step dots: teal = done, brass = now, gray = still to come. */
export function Dots({ states, label }: { states: readonly DotState[]; label: string }) {
  return (
    <div className={`play-dots${states.length > 4 ? ' play-dots--many' : ''}`} role="img" aria-label={label}>
      {states.map((s, i) => (
        <span key={i} className={`play-dot play-dot--${s}`} />
      ))}
    </div>
  );
}

export interface PlayHeaderProps {
  /** Small line above the title, e.g. "Stop 2 · Lesson 1 of 5". */
  over: string;
  title: string;
  onBack?: () => void;
  backLabel?: string;
  dots?: readonly DotState[];
  dotsLabel?: string;
  /** Lets a runner put focus back on the back button. */
  backRef?: Ref<HTMLButtonElement>;
}

/** The bar at the top of a lesson, check or practice: back button, where you are, and step dots. */
/** The phone's or browser's Back button, while a lesson, check or practice is showing (sent by App). */
export const BACK_EVENT = 'lq-back';

export function PlayHeader({ over, title, onBack, backLabel = 'Back', dots, dotsLabel = '', backRef }: PlayHeaderProps) {
  // Back on the device does what this header's back button does (a check asks first).
  const backFn = useRef(onBack);
  backFn.current = onBack;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onDeviceBack = () => backFn.current?.();
    window.addEventListener(BACK_EVENT, onDeviceBack);
    return () => window.removeEventListener(BACK_EVENT, onDeviceBack);
  }, []);
  return (
    <header className="play-head">
      {onBack && (
        <button ref={backRef} type="button" className="play-back" aria-label={backLabel} title={backLabel} onClick={onBack}>
          <PlayIcon name="back" size={22} />
        </button>
      )}
      <div className="play-head-text">
        <div className="play-head-over">{over}</div>
        <h1 className="play-head-title">{title}</h1>
      </div>
      {dots && dots.length > 0 && <Dots states={dots} label={dotsLabel} />}
    </header>
  );
}

/** Thin, calm time bar. No numbers, no ticking, no red. */
function TimerBar({ left, limit }: { left: number; limit: number }) {
  const secs = Math.max(0, Math.ceil(left * limit));
  return (
    <div className="play-timer">
      <PlayIcon name="clock" size={16} />
      <div
        className="play-timer-track"
        role="progressbar"
        aria-label="Time left for this question"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={secs}
        aria-valuetext={`About ${Math.ceil(secs / 10) * 10} seconds left`}
      >
        <div className="play-timer-fill" style={{ transform: `scaleX(${Math.max(0, Math.min(1, left))})` }} />
      </div>
    </div>
  );
}

// ---------- the item ----------

type Phase = 'answer' | 'right' | 'wrong' | 'shown';

export interface ItemViewExtraProps {
  /** Small label above the question. Default: "Your turn" (learn) or "Question" (check). */
  kicker?: string;
  /** Label for the button that moves on. Default "Next". */
  nextLabel?: string;
  /** Move focus to the question when it appears. Default true. */
  autoFocus?: boolean;
}

/** One item. Its state resets whenever the item changes. */
export function ItemView(props: ItemViewProps & ItemViewExtraProps) {
  return <ItemRun key={props.item.id} {...props} />;
}

function ItemRun({ item, mode, onDone, readAloud, timeLimit = null, kicker, nextLabel = 'Next', autoFocus = true }: ItemViewProps & ItemViewExtraProps) {
  const learn = mode === 'learn';
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const promptId = `${uid}-prompt`;
  const hintId = `${uid}-hint`;

  const [startedAt] = useState(() => Date.now());
  const [pick, setPick] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [slots, setSlots] = useState<Slots>(() => (item.kind === 'order' ? item.names.map(() => null) : []));
  const [marks, setMarks] = useState<Marks>({});
  /** Learn mode, after a wrong Check on an assign item: the broken clues (grid) or speakers (toggles). Cleared on the next change. */
  const [flagged, setFlagged] = useState<number[] | null>(null);
  const [phase, setPhase] = useState<Phase>('answer');
  const [misses, setMisses] = useState(0);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [left, setLeft] = useState(1);
  const [live, setLive] = useState('');

  const finished = useRef(false);
  const solvedMs = useRef<number | null>(null);
  /** The answer at the last Check (learn mode), for the record. "Show me" does not replace it. */
  const lastAnswer = useRef<Answer | null>(null);
  const elapsed = useRef(0);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const panelBtnRef = useRef<HTMLButtonElement>(null);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const poolRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusName = useRef<string | null>(null);

  const locked = learn ? phase !== 'answer' : submitted;
  const timed = !learn && typeof timeLimit === 'number' && timeLimit > 0;
  const answer = answerFor(item, pick, chosen, slots, marks);
  const canSubmit = canSubmitFor(item, pick, slots, marks);

  const record = (correct: boolean, firstTry: boolean, given: Answer | null, timedOut = false): AnswerRecord => ({
    itemId: item.id,
    stop: item.stop,
    lesson: item.lesson,
    skill: item.skill,
    correct,
    firstTry,
    ms: Math.max(0, solvedMs.current ?? Date.now() - startedAt),
    ...(timedOut ? { timedOut: true } : {}),
    ...(given && !timedOut ? { answer: given } : {}),
  });

  // ----- check mode -----
  const submitCheck = (timedOut: boolean) => {
    if (finished.current) return;
    finished.current = true;
    setSubmitted(true);
    const given = timedOut ? null : answer;
    const g = grade(item, given);
    onDone(record(g.correct, g.correct, given, timedOut));
  };
  const submitRef = useRef(submitCheck);
  submitRef.current = submitCheck;

  useEffect(() => {
    if (!timed || submitted) return;
    const limit = (timeLimit as number) * 1000;
    let last = Date.now();
    const hidden = () => document.visibilityState === 'hidden';
    const tick = () => {
      const now = Date.now();
      if (!hidden()) elapsed.current += Math.min(1000, Math.max(0, now - last));
      last = now;
      const f = Math.max(0, 1 - elapsed.current / limit);
      setLeft(f);
      if (f <= 0) submitRef.current(true);
    };
    // Becoming hidden: count up to now, then stop. Becoming visible: start counting from now.
    const onVisibility = () => {
      const now = Date.now();
      if (hidden()) elapsed.current += Math.min(1000, Math.max(0, now - last));
      last = now;
    };
    document.addEventListener('visibilitychange', onVisibility);
    const id = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [timed, timeLimit, submitted]);

  // ----- learn mode -----
  const check = () => {
    if (phase !== 'answer' || !canSubmit) return;
    const g = grade(item, answer);
    lastAnswer.current = answer;
    setGraded(g);
    setHintOpen(false);
    setFlagged(!g.correct && item.kind === 'assign' && g.broken?.length ? [...g.broken] : null);
    if (g.correct) {
      solvedMs.current = Date.now() - startedAt;
      setPhase('right');
      setLive(misses === 0 ? 'Right, first try.' : 'Right.');
    } else {
      setMisses((m) => m + 1);
      setPhase('wrong');
      setLive(`Not yet. ${g.feedback}`);
    }
  };
  const tryAgain = () => {
    setPhase('answer');
    setGraded(null);
    setLive('');
  };
  const showMe = () => {
    solvedMs.current = Date.now() - startedAt;
    if (item.kind === 'choose') setPick(item.answer);
    if (item.kind === 'tapall') setChosen([...item.answer]);
    if (item.kind === 'order') setSlots([...item.answer]);
    if (item.kind === 'assign') setMarks(solvedMarks(item));
    if (item.kind === 'multi') setChosen([...item.answer]);
    setFlagged(null);
    setPhase('shown');
    setLive('Here is the answer.');
  };
  const next = () => {
    if (finished.current) return;
    finished.current = true;
    onDone(record(phase === 'right', phase === 'right' && misses === 0, lastAnswer.current));
  };

  // ----- focus -----
  // Only when the item first appears.
  useEffect(() => {
    if (autoFocus) promptRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (phase !== 'answer') panelBtnRef.current?.focus();
    else if (misses > 0) promptRef.current?.focus();
  }, [phase]);
  useEffect(() => {
    if (focusName.current) {
      poolRefs.current[focusName.current]?.focus();
      focusName.current = null;
    }
  }, [slots]);

  // ----- controls -----
  const onRadioKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (item.kind !== 'choose') return;
    const n = item.choices.length;
    let j = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    radios.current[j]?.focus();
    if (!locked) setPick(item.choices[j].id);
  };

  const revealed = learn && (phase === 'right' || phase === 'shown');

  let controls: ReactElement;
  if (item.kind === 'choose') {
    const short = item.choices.every((c) => c.label.length <= 14);
    const focusIdx = Math.max(0, item.choices.findIndex((c) => c.id === pick));
    controls = (
      <div role="radiogroup" aria-labelledby={promptId} className={`play-choices${short ? ' play-choices--short' : ''}`}>
        {item.choices.map((c, i) => {
          const isRight = revealed && c.id === item.answer;
          const isMiss = learn && phase === 'wrong' && c.id === pick;
          const cls = ['play-choice', c.id === pick ? 'is-picked' : '', isRight ? 'is-right' : '', isMiss ? 'is-miss' : ''].filter(Boolean).join(' ');
          return (
            <button
              key={c.id}
              ref={(el) => { radios.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={c.id === pick}
              aria-disabled={locked || undefined}
              tabIndex={i === focusIdx ? 0 : -1}
              className={cls}
              onClick={() => { if (!locked) setPick(c.id); }}
              onKeyDown={(e) => onRadioKey(e, i)}
            >
              <span className="play-choice-label">{c.label}</span>
              {isRight && (
                <span className="play-choice-mark">
                  <PlayIcon name="check" size={18} />
                  <span className="play-sr"> (right answer)</span>
                </span>
              )}
              {isMiss && (
                <span className="play-choice-mark">
                  <PlayIcon name="cross" size={18} />
                  <span className="play-sr"> (not yet)</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  } else if (item.kind === 'tapall') {
    const toggle = (id: string) => setChosen((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    controls = (
      <div className="play-stack-sm">
        <p className="play-help">
          Tap every card that fits. Tap a card again to undo.
        </p>
        <ul className="play-things play-things--pick" aria-label="Cards to choose from">
          {item.things.map((t) => (
            <li key={t.id} className="play-things-slot">
              <ThingCard
                thing={t}
                pressed={chosen.includes(t.id)}
                locked={locked}
                fits={revealed && item.answer.includes(t.id)}
                onToggle={() => toggle(t.id)}
              />
            </li>
          ))}
        </ul>
        <p className="play-help play-help--count" aria-hidden="true">
          {chosen.length} chosen
        </p>
        {revealed && item.answer.length === 0 && <p className="play-help">No card fits this rule, so the right move is to choose none.</p>}
      </div>
    );
  } else if (item.kind === 'assign') {
    const change = (next: Marks) => {
      if (locked) return;
      setMarks(next);
      setFlagged(null);
    };
    const body = { item, marks, locked, onChange: change, flagged: learn ? flagged : null };
    controls = item.layout === 'toggles' ? <AssignToggles {...body} /> : <AssignGrid {...body} />;
  } else if (item.kind === 'multi') {
    const toggle = (id: string) => setChosen((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    controls = <MultiView item={item} chosen={chosen} locked={locked} revealed={revealed} onToggle={toggle} />;
  } else {
    const nameOf = (id: string) => item.names.find((n) => n.id === id)?.label ?? id;
    const n = slots.length;
    const toggleName = (id: string) => {
      if (locked) return;
      focusName.current = id;
      setSlots((cur) => (cur.includes(id) ? removeName(cur, id) : placeName(cur, id)));
    };
    const takeOut = (i: number) => {
      if (locked) return;
      const id = slots[i];
      if (id) focusName.current = id;
      setSlots((cur) => removeAt(cur, i));
    };
    controls = (
      <div className="play-order">
        <p className="play-help">Tap a name to put it in the next open spot. Tap it again to take it out.</p>
        <div className="play-pool" role="group" aria-label="People to place">
          {item.names.map((nm) => {
            const at = slots.indexOf(nm.id);
            return (
              <button
                key={nm.id}
                ref={(el) => { poolRefs.current[nm.id] = el; }}
                type="button"
                className={`play-chip${at >= 0 ? ' is-placed' : ''}`}
                aria-label={at >= 0 ? `${nm.label}, in spot ${at + 1}. Tap to take out.` : `${nm.label}. Tap to place.`}
                aria-disabled={locked || undefined}
                onClick={() => toggleName(nm.id)}
              >
                {nm.label}
                {at >= 0 && <span className="play-chip-spot" aria-hidden="true">{at + 1}</span>}
              </button>
            );
          })}
        </div>
        <ol className="play-slots" aria-label={`The line, from ${item.firstLabel.toLowerCase()} to ${item.lastLabel.toLowerCase()}`}>
          {slots.map((id, i) => (
            <li key={i} className={`play-slot${id ? ' is-filled' : ''}`}>
              <span className="play-slot-label">
                <span className="play-slot-n">{i + 1}</span>
                {i === 0 && <span className="play-slot-end">{item.firstLabel}</span>}
                {i === n - 1 && n > 1 && <span className="play-slot-end">{item.lastLabel}</span>}
              </span>
              {id ? (
                <button
                  type="button"
                  className="play-chip play-chip--slot"
                  aria-label={`${nameOf(id)}, in spot ${i + 1}. Tap to take out.`}
                  aria-disabled={locked || undefined}
                  onClick={() => takeOut(i)}
                >
                  {nameOf(id)}
                </button>
              ) : (
                <span className="play-slot-empty">Empty</span>
              )}
            </li>
          ))}
        </ol>
        {!locked && slots.some((s) => s !== null) && (
          <button type="button" className="play-btn play-btn--ghost play-btn--small" onClick={() => setSlots(slots.map(() => null))}>
            Clear the line
          </button>
        )}
      </div>
    );
  }

  // Line-ups judge each clue live. Grids mark the clues a wrong Check broke, until the grid changes.
  const clueState: ClueState[] | undefined = !learn
    ? undefined
    : item.kind === 'order'
      ? liveClueStates(item, slots)
      : item.kind === 'assign' && item.layout === 'grid' && flagged && item.scene?.kind === 'clues'
        ? item.scene.clues.map((_, i) => (flagged.includes(i) ? 'broken' : null))
        : undefined;
  // A knights puzzle draws its speakers itself, each with a Knight / Knave choice under their words.
  const sceneInControls = item.kind === 'assign' && item.layout === 'toggles' && item.scene?.kind === 'speakers';
  const waitNote = waitNoteFor(item, canSubmit);

  return (
    <section className="play-item" aria-labelledby={promptId}>
      <div className="play-item-top">
        <span className="play-kicker">{kicker ?? (learn ? 'Your turn' : 'Question')}</span>
        {readAloud && <ReadAloudButton text={() => itemSpeech(item)} />}
      </div>

      {timed && <TimerBar left={left} limit={timeLimit as number} />}

      <p className="play-prompt" id={promptId} ref={promptRef} tabIndex={-1}>
        {item.prompt}
      </p>

      {item.scene && !sceneInControls && <SceneView scene={item.scene} clueState={clueState} />}

      {controls}

      {learn && phase === 'answer' && (
        <>
          {hintOpen && item.hint && (
            <div id={hintId} className="play-hint">
              <PlayIcon name="bulb" size={18} />
              <span>{item.hint}</span>
            </div>
          )}
          <div className="play-actions">
            {item.hint && (
              <button type="button" className="play-btn play-btn--ghost" aria-expanded={hintOpen} aria-controls={hintId} onClick={() => setHintOpen((o) => !o)}>
                Hint
              </button>
            )}
            <button type="button" className="play-btn play-btn--primary play-btn--grow" disabled={!canSubmit} onClick={check}>
              Check
            </button>
          </div>
          {waitNote && <p className="play-help">{waitNote}</p>}
        </>
      )}

      {!learn && (
        <>
          <div className="play-actions">
            <button type="button" className="play-btn play-btn--primary play-btn--grow" disabled={!canSubmit || submitted} onClick={() => submitCheck(false)}>
              {nextLabel}
            </button>
          </div>
          {waitNote && <p className="play-help">{waitNote}</p>}
        </>
      )}

      {learn && phase === 'right' && (
        <div className="play-feedback play-feedback--right">
          <div className="play-feedback-title">
            <PlayIcon name="check" size={20} />
            <span>{misses === 0 ? 'Right, first try.' : 'Right.'}</span>
          </div>
          <p>{item.explain}</p>
          <button ref={panelBtnRef} type="button" className="play-btn play-btn--teal play-btn--block" onClick={next}>
            {nextLabel}
          </button>
        </div>
      )}

      {learn && phase === 'wrong' && graded && (
        <div className="play-feedback play-feedback--wrong">
          <div className="play-feedback-title">
            <span>Not yet</span>
          </div>
          <p>{graded.feedback}</p>
          {misses >= 2 && <p className="play-feedback-note">You can try again, or let me show you the answer.</p>}
          <div className="play-actions">
            <button ref={panelBtnRef} type="button" className="play-btn play-btn--retry play-btn--grow" onClick={tryAgain}>
              Try again
            </button>
            {misses >= 2 && (
              <button type="button" className="play-btn play-btn--ghost play-btn--grow" onClick={showMe}>
                Show me
              </button>
            )}
          </div>
        </div>
      )}

      {learn && phase === 'shown' && (
        <div className="play-feedback play-feedback--shown">
          <div className="play-feedback-title">
            <span>Here is the answer</span>
          </div>
          <p>{item.explain}</p>
          <button ref={panelBtnRef} type="button" className="play-btn play-btn--primary play-btn--block" onClick={next}>
            {nextLabel}
          </button>
        </div>
      )}

      <div className="play-sr" role="status" aria-live="polite">
        {live}
      </div>
    </section>
  );
}

