/**
 * The case board (sign puzzles). The boxes are drawn as cards, each with its sign. A case is one place the treasure
 * could be: pick a box (pretend the treasure is there), and a True or False stamp sits on each sign for that case.
 * The board counts the True stamps. Then the box is kept (a ring) or crossed out (a cross), and that verdict stays on
 * the box while other cases are checked.
 *
 * CaseScene draws the board as a picture (a worked example, one stamp at a time). CaseBoard is the board the learner
 * marks (inside DrillBoard): tap a box, tap each sign, then Keep or Reject. The count is always worked out from the
 * stamps, never typed.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { caseCount, caseMarks, caseVerdict, nextStamp, type DrillPicks } from '../../engine/drill';
import type { DrillRow, DrillStep, Scene, SignBox } from '../../engine/types';
import { boxTint, RuleBanner } from './boxes';
import { BecauseRows, CompareRows, MethodSteps, wordsOf } from './Distinction';
import { PlayIcon } from './ThingCard';

/** The method, step by step, shown while it is new (DrillStep.scaffold 'full'). */
export const CASE_STEPS = ['Pretend the treasure is in one box', 'Stamp each sign: do its words fit the test?', 'Count the True stamps', 'Compare the count with the rule', 'Keep or reject the box'] as const;

/** The test-world line over a case board: the one assumption every stamp is checked against, kept on screen. */
function TestWorld({ label, given, item, tag = 'Test world', note }: { label: string; given?: boolean; item: string; tag?: string; note?: string }) {
  return (
    <p className={`play-case-now play-case-world${given ? ' is-given' : ''}`}>
      <span className={`play-drill-tag${given ? '' : ' play-drill-tag--you'}`}>{given ? 'Shown' : tag}</span>
      <PlayIcon name="gem" size={16} />
      <strong>{label}</strong>
      <span className="play-case-world-note">{note ?? `For this test only. Where the ${item} is does not say if a sign is true.`}</span>
    </p>
  );
}

type CasesScene = Extract<Scene, { kind: 'cases' }>;

const trueSigns = (n: number) => `${n} true sign${n === 1 ? '' : 's'}`;
const verdictWord = (v: string) => (v === 'keep' ? 'Kept' : 'Crossed out');

/**
 * A stamp on a sign: True (a check and the word) or False (the word alone). The cross is kept for Reject, so one mark
 * never means two things on the same card.
 */
function StampFace({ value }: { value: string }) {
  return (
    <>
      {value === 'true' && <PlayIcon name="check" size={16} />}
      <span>{value === 'true' ? 'True' : 'False'}</span>
    </>
  );
}

/** A box's count of true signs. On the picked box it is the case being checked; on another box, its own case. */
const countWords = (n: number, picked: boolean) => (picked ? trueSigns(n) : `If here: ${n} true`);

/** The ring of a kept box, drawn around its marker. */
const Ring = () => <span className="play-case-ring" aria-hidden="true" />;

interface CaseCardProps {
  box: SignBox;
  i: number;
  /** This box is the picked case: pretend the treasure is here. */
  picked: boolean;
  count: number | null;
  verdict: string | undefined;
  /** The sign a twin changed. */
  changed: boolean;
  /** This case has a wrong mark after a check. */
  flagged?: boolean;
  /** The stamp on this box's sign, for the picked case. */
  stamp: ReactNode;
  /** Under the sign: the comparison behind the stamp, or the two facts to compare (Distinction.tsx). */
  under?: ReactNode;
  /** Interactive: tap the box to pick its case. */
  onPick?(): void;
  /** Interactive: the box has no case on this board. */
  off?: boolean;
}

/** One box: its marker (with a ring or a cross), name, count and verdict, then its sign with the stamp on it. */
function CaseCard({ box, i, picked, count, verdict, changed, flagged, stamp, under, onPick, off }: CaseCardProps) {
  const head = (
    <>
      <span className={`play-case-chest${picked ? ' has-gem' : ''}`} style={{ background: boxTint(box.name) }} aria-hidden="true">
        {/* The treasure is drawn in the picked box: this test's world, not a fact about the box. */}
        {picked ? <span className="play-case-gem"><PlayIcon name="gem" size={22} /></span> : <span className="play-case-n">{i + 1}</span>}
        {verdict === 'keep' && <Ring />}
        {verdict === 'reject' && (
          <span className="play-case-x">
            <PlayIcon name="cross" size={34} />
          </span>
        )}
      </span>
      <span className="play-case-name">{box.name}</span>
      <span className="play-case-tags">
        {picked && <span className="play-case-here">Pretend it’s here</span>}
        {count !== null && <span className="play-case-count">{countWords(count, picked)}</span>}
        {verdict && <span className={`play-case-verdict is-${verdict}`}>{verdictWord(verdict)}</span>}
        {flagged && <span className="play-case-flag">Look again</span>}
      </span>
    </>
  );
  const state = [
    picked ? 'picked' : '',
    count !== null ? (picked ? trueSigns(count) : `if it is here, ${trueSigns(count)}`) : '',
    verdict ? verdictWord(verdict).toLowerCase() : '',
    flagged ? 'look again' : '',
  ].filter(Boolean).join(', ');
  return (
    <li className={`play-case${picked ? ' is-picked' : ''}${verdict ? ` is-${verdict}` : ''}${off ? ' is-off' : ''}`}>
      {onPick ? (
        <button
          type="button"
          className="play-case-head"
          aria-pressed={picked}
          aria-disabled={off || undefined}
          aria-label={`${box.name}${state ? `: ${state}` : ''}. ${off ? 'Not on this board.' : picked ? 'Picked.' : 'Tap to pretend it is here.'}`}
          onClick={() => { if (!off) onPick(); }}
        >
          {head}
        </button>
      ) : (
        <div className="play-case-head">{head}</div>
      )}
      <div className={`play-case-sign${changed ? ' is-changed' : ''}`}>
        <span className="play-case-sign-text">
          {changed && <span className="play-case-changed">Changed</span>}
          <span className="play-sr">{box.name}, sign: </span>
          {box.sign}
        </span>
        {stamp}
      </div>
      {under}
    </li>
  );
}

export interface CaseSceneProps {
  scene: CasesScene;
  /** Steps showing (default: all). */
  revealed?: number;
  labelId?: string;
}

/**
 * The case board as a picture. With steps (a worked case), the stamps appear one at a time, each with its line,
 * and the picked box's count and verdict come with the last step. Earlier verdicts stay on their boxes.
 */
export function CaseScene({ scene, revealed, labelId }: CaseSceneProps) {
  const steps = scene.steps ?? [];
  const shown = Math.min(revealed ?? steps.length, steps.length);
  const own = steps.length > 0 && shown < steps.length ? scene.pretend : undefined;
  const say = steps.length ? (shown > 0 ? steps[shown - 1].say : '') : '';
  const because = steps.length && shown > 0 ? steps[shown - 1].because : undefined;
  const item = /treasure|prize|egg/.exec(scene.boxes[0]?.sign ?? '')?.[0] ?? 'treasure';
  return (
    <div className="play-scene play-cases" id={labelId}>
      <RuleBanner rule={scene.rule} />
      {scene.pretend !== undefined && <TestWorld label={`Pretend the ${item === 'egg' ? 'dragon egg' : item} is in ${scene.boxes[scene.pretend].name.startsWith('Box') ? '' : 'the '}${scene.boxes[scene.pretend].name}.`} item={item === 'egg' ? 'egg' : item} />}
      <ol className="play-case-list" aria-label="Boxes and their signs">
        {scene.boxes.map((b, i) => {
          const value = scene.pretend !== undefined && scene.stamps && (!steps.length || i < shown) ? (scene.stamps[i] ? 'true' : 'false') : undefined;
          return (
            <CaseCard
              key={b.id}
              box={b}
              i={i}
              picked={scene.pretend === i}
              count={i === own ? null : scene.counts?.[i] ?? null}
              verdict={i === own ? undefined : scene.verdicts?.[i] ?? undefined}
              changed={scene.changed === i}
              stamp={
                value ? (
                  <span className={`play-stamp is-${value}${steps.length && i === shown - 1 ? ' is-new' : ''}`}>
                    <span className="play-sr">Stamp: </span>
                    <StampFace value={value} />
                  </span>
                ) : scene.pretend !== undefined ? (
                  <span className="play-stamp is-blank" aria-hidden="true" />
                ) : null
              }
            />
          );
        })}
      </ol>
      {steps.length > 0 && scene.pretend !== undefined && shown === steps.length && scene.counts?.[scene.pretend] != null && (
        <p className="play-case-total play-case-total--walk" aria-hidden="true">
          <span className="play-case-big">{scene.counts[scene.pretend]}</span> {scene.counts[scene.pretend] === 1 ? 'sign is' : 'signs are'} True.
        </p>
      )}
      {steps.length > 0 && (
        <p className="play-case-say" aria-hidden="true">
          {say}
        </p>
      )}
      {because && (
        <div aria-hidden="true">
          <BecauseRows because={because} />
        </div>
      )}
      {/* Always in the page, so each new line is announced (a region that appears with its text may be missed). */}
      {steps.length > 0 && (
        <p className="play-sr" role="status" aria-live="polite">
          {say}
        </p>
      )}
    </div>
  );
}

export interface CaseBoardProps {
  step: DrillStep;
  picks: DrillPicks;
  /** Mark ids flagged wrong by the last check. */
  wrong: readonly string[];
  /** The board is done: every mark stays as it is. */
  locked: boolean;
  /** The picked box (its case is shown), or null. */
  picked: number | null;
  onPickCase(box: number): void;
  onPick(markId: string, option: string | undefined): void;
  /** Clear the learner's marks in one case. */
  onClear(rowId: string): void;
}

/** The board the learner marks: pick a box, stamp each sign, then Keep or Reject. */
export function CaseBoard({ step, picks, wrong, locked, picked, onPickCase, onPick, onClear }: CaseBoardProps) {
  const scene = step.scene?.kind === 'boxes' || step.scene?.kind === 'cases' ? step.scene : null;
  const [said, setSaid] = useState('');
  const verdictRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  if (!scene) return null;
  const rowFor = (b: number): DrillRow | undefined => step.rows.find((r) => r.case?.box === b);
  const row = picked === null ? undefined : rowFor(picked);
  const given = !!row && row.marks.every((m) => m.given);
  const { stamps, verdict } = row ? caseMarks(row) : { stamps: [], verdict: undefined };
  const count = row ? caseCount(row, picks) : null;
  const flagged = (b: number) => !!rowFor(b)?.marks.some((m) => wrong.includes(m.id));
  /** Full scaffold: the compare facts under every sign, the rule's need by the count, the method's steps. */
  const full = step.scaffold === 'full';
  const item = /treasure|prize|egg/.exec(scene.boxes[0]?.sign ?? '')?.[0] ?? 'treasure';
  const words = step.words;
  const w = wordsOf(words);
  const steps = step.steps ?? CASE_STEPS;
  /** What sits under sign i for the picked case: the worked comparison (a shown case) or the two facts to compare. */
  const underFor = (i: number): ReactNode => {
    if (!row) return null;
    const m = stamps.find((s) => s.on === i);
    if (!m?.compare) return null;
    if (m.given) return full ? <BecauseRows compact because={{ ...m.compare, match: m.answer === 'true' }} words={words} /> : null;
    return full || flagged(picked!) ? <CompareRows says={m.compare.says} world={m.compare.world} words={words} /> : null;
  };

  const pickCase = (b: number) => {
    onPickCase(b);
    const r = rowFor(b);
    if (r) setSaid(`${r.label}${r.marks.every((m) => m.given) ? ' This case is shown, already marked.' : ''}`);
  };

  const stampFor = (i: number): ReactNode => {
    if (!row) return null;
    const m = stamps.find((s) => s.on === i);
    if (!m) return null;
    const value = m.given ? m.answer : picks[m.id];
    if (m.given) {
      return (
        <span className={`play-stamp is-${value} is-given`}>
          <span className="play-sr">{m.label}, shown: </span>
          <StampFace value={value} />
        </span>
      );
    }
    const miss = wrong.includes(m.id);
    return (
      <button
        type="button"
        className={`play-stamp${value ? ` is-${value}` : ' is-blank'}${miss ? ' is-miss' : ''}`}
        aria-label={`${m.label}: ${value ? (value === 'true' ? 'True' : 'False') : 'not stamped'}${miss ? ', not yet' : ''}. ${locked ? '' : 'Tap to change.'}`.trim()}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (locked) return;
          const next = nextStamp(value);
          onPick(m.id, next);
          const after = caseCount(row, { ...picks, [m.id]: next });
          setSaid(`${m.label}: ${next === 'true' ? 'True' : 'False'}.${after !== null ? ` ${trueSigns(after)}.` : ''}`);
        }}
      >
        {value ? <StampFace value={value} /> : <span className="play-stamp-tap">Stamp</span>}
      </button>
    );
  };

  const onVerdictKey = (e: KeyboardEvent<HTMLButtonElement>, k: number) => {
    if (!verdict) return;
    const n = verdict.options.length;
    const to = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (k + 1) % n : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (k - 1 + n) % n : -1;
    if (to < 0) return;
    e.preventDefault();
    verdictRefs.current[to]?.focus();
    if (!locked && !given) choose(verdict.options[to].id);
  };
  const choose = (id: string) => {
    if (!verdict || !row) return;
    onPick(verdict.id, id);
    setSaid(`${row.case?.name ?? 'This box'}: ${id === 'keep' ? 'kept' : 'crossed out'}.`);
  };

  const v = row ? caseVerdict(row, picks) : undefined;
  const verdictMiss = !!verdict && wrong.includes(verdict.id);
  const focusAt = Math.max(0, verdict?.options.findIndex((o) => o.id === v) ?? 0);
  /** Where the learner is in the method, for the steps strip. */
  const at = !row ? 0 : count === null ? 1 : v === undefined ? 3 : locked ? 5 : 4;

  return (
    <div className="play-scene play-cases play-cases--board" ref={rootRef}>
      {/* While the stamps are blank the rule is tagged as the last step: it is checked after the stamps, never used to set them. */}
      <RuleBanner rule={scene.rule} note={row && !given && !locked && count === null ? 'Check this after the stamps' : undefined} />
      {full && <MethodSteps steps={steps} at={at} label={step.stepsLabel} />}
      {!row ? (
        <p className="play-case-now">Nothing picked yet. Tap one below to start.</p>
      ) : (
        <TestWorld label={row.label} given={given} item={item === 'egg' ? 'egg' : item} tag={words?.worldTag} note={words?.worldNote} />
      )}
      <ol className="play-case-list" aria-label="Boxes and their signs">
        {scene.boxes.map((b, i) => {
          const r = rowFor(i);
          return (
            <CaseCard
              key={b.id}
              box={b}
              i={i}
              picked={picked === i}
              count={r ? caseCount(r, picks) : null}
              verdict={r ? caseVerdict(r, picks) : undefined}
              changed={step.changed === i}
              flagged={flagged(i)}
              stamp={stampFor(i)}
              under={picked === null ? null : underFor(i)}
              off={!r}
              onPick={() => pickCase(i)}
            />
          );
        })}
      </ol>
      {row && (
        <div className={`play-case-panel${given ? ' is-given' : ''}`}>
          <>
            <p className="play-case-total">
              {count === null ? (
                'Stamp every sign. The board counts the True stamps.'
              ) : (
                <>
                  <span className="play-case-big">{count}</span> {count === 1 ? 'sign is' : 'signs are'} True.
                  {row.needs && <span className="play-case-needs">{w.needs === undefined ? `The rule needs ${row.needs}.` : w.needs ? `${w.needs} ${row.needs}` : row.needs}</span>}
                </>
              )}
            </p>
            {verdict && <p className="play-case-ask" id={`${row.id}-ask`}>{verdict.label}</p>}
            {verdict && (
              <div role="radiogroup" aria-labelledby={`${row.id}-ask`} className="play-case-verdicts">
                {verdict.options.map((o, k) => {
                  const on = v === o.id;
                  return (
                    <button
                      key={o.id}
                      ref={(el) => { verdictRefs.current[k] = el; }}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-disabled={locked || given || undefined}
                      tabIndex={k === focusAt ? 0 : -1}
                      className={`play-kind play-case-vbtn is-${o.id}${on ? ' is-on' : ''}${on && verdictMiss ? ' is-miss' : ''}`}
                      onClick={() => { if (!locked && !given) choose(o.id); }}
                      onKeyDown={(e) => onVerdictKey(e, k)}
                    >
                      {o.id === 'keep' ? <span className="play-case-ring-icon" aria-hidden="true" /> : <PlayIcon name="cross" size={18} />}
                      {o.label}
                      {on && verdictMiss && <span className="play-case-vmiss"> (not yet)</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {given && row.note && <p className="play-drill-note">{row.note}</p>}
            {!given && !locked && row.marks.some((m) => !m.given && picks[m.id]) && (
              <button
                type="button"
                className="play-btn play-btn--ghost play-btn--small"
                onClick={() => {
                  onClear(row.id);
                  setSaid(`${row.case?.name ?? 'This case'} is cleared.`);
                  // The button goes away with the marks: keep the focus on the picked box.
                  requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.play-case.is-picked .play-case-head')?.focus());
                }}
              >
                Clear this case
              </button>
            )}
          </>
        </div>
      )}
      <div className="play-sr" role="status" aria-live="polite">
        {said}
      </div>
    </div>
  );
}

/** The box a case board shows first: the first shown case (the worked one), or none. */
export function firstPicked(step: DrillStep): number | null {
  const shown = step.rows.find((r) => r.case && r.marks.every((m) => m.given));
  return shown?.case?.box ?? null;
}
