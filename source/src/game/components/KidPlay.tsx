/**
 * The kid rendering's shared pieces (docs/KID-JOURNEY.md §2, Grades 1 to 3): a card's picture, the three goal stars,
 * yes/no and picture answer tiles, the "Yes!" panel and the star screen at the end of a round. Big tap targets, few
 * words; every picture has a name for screen readers, and every tile names its answer.
 */
import { useEffect, useId, useRef, type KeyboardEvent, type Ref } from 'react';
import type { Choice, KidPicto, Picto, Scene, TeachCase, Thing } from '../../engine/types';
import { caseText } from '../../engine/teach';
import { CaseCard } from './ExplanationPanel';
import { Pictogram } from './Pictogram';
import { ReadAloudButton } from './ReadAloud';
import { SceneView } from './SceneView';
import { PlayIcon, ThingCard } from './ThingCard';

/** The play header's title in kid mode, and its only words: "Round 2 of 4" (no lesson title, no world). */
export const roundTitle = (k: number, n: number): string => `Round ${k} of ${n}`;

/** The words the kid hint reads aloud: its line, or the picture case's own words (never its note, which is not drawn). */
export const kidHintSpeech = (hint: string | undefined, show: TeachCase | undefined): string[] => (hint ? [hint] : show ? caseText({ ...show, note: undefined }) : []);

export interface KidHintProps {
  /** The kid hint line (ItemBase.kid.hint, at most 8 words). */
  hint?: string;
  /** Without a line: the item's show case, drawn as a picture only. */
  show?: TeachCase;
  readAloud: boolean;
  /** Back to the question. */
  onClose(): void;
  id?: string;
  closeRef?: Ref<HTMLButtonElement>;
}

/**
 * The opened hint in kid mode: its own small screen in place of the question (a bulb, the hint line or the picture,
 * and one icon button back to the question), so the hint screen fits the band's word budget by itself.
 */
export function KidHint({ hint, show, readAloud, onClose, id, closeRef }: KidHintProps) {
  return (
    <section id={id} className="play-hint kid-hint" aria-label="Hint">
      <div className="kid-feedback-top">
        <PlayIcon name="bulb" size={28} />
        {readAloud && <ReadAloudButton text={() => kidHintSpeech(hint, show)} />}
      </div>
      {hint ? (
        <p className="kid-line-small kid-hint-line">{hint}</p>
      ) : show ? (
        <div className="play-hint-case">
          <CaseCard c={show} picture />
        </div>
      ) : null}
      <button ref={closeRef} type="button" className="play-btn play-btn--teal play-btn--block kid-big-btn" aria-label="Back to the question" title="Back to the question" onClick={onClose}>
        <PlayIcon name="back" size={24} />
      </button>
    </section>
  );
}

/**
 * The end of a round that is not passed in kid mode (out of questions, or picked up after it ran out): "Not yet. Try
 * again?" and one big button. Never the classic recap.
 */
export function KidNotYet({ readAloud, onAgain }: { readAloud: boolean; onAgain(): void }) {
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="play-card kid-star-screen kid-not-yet" aria-labelledby="kid-notyet-title">
      <div className="kid-feedback-top">
        <Pictogram name="question" size={56} decorative />
        {readAloud && <ReadAloudButton text={() => ['Not yet.', 'Try again?']} />}
      </div>
      <h2 className="play-idea-title kid-star-title" id="kid-notyet-title" ref={headRef} tabIndex={-1}>
        Not yet.
      </h2>
      <p className="kid-line-small">Try again?</p>
      <button type="button" className="play-btn play-btn--primary play-btn--block kid-big-btn" onClick={onAgain}>
        Go
      </button>
    </section>
  );
}

/** A kid card's picture: its pictogram, or the card's own scene ('scene'), shown in full. */
export function KidPicture({ art, scene }: { art?: Picto | 'scene'; scene?: Scene }) {
  if (art === 'scene') return scene ? <SceneView scene={scene} /> : null;
  if (!art) return null;
  return (
    <div className="kid-pic">
      <Pictogram name={art} size={96} />
    </div>
  );
}

/** One goal star: filled once earned. */
function StarShape({ on, size }: { on: boolean; size: number }) {
  return (
    <svg className={`kid-goal-star${on ? ' is-on' : ''}`} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" />
    </svg>
  );
}

/** The lesson's goal as stars (three for "3 right on the first try"), filled as clean first tries come in. */
export function GoalStars({ have, need }: { have: number; need: number }) {
  const n = Math.max(1, need);
  const got = Math.max(0, Math.min(have, n));
  return (
    <div className="kid-goal" role="img" aria-label={`${got} of ${n} stars`}>
      {Array.from({ length: n }, (_, k) => <StarShape key={k} on={k < got} size={30} />)}
    </div>
  );
}

export interface TileOption {
  id: string;
  /** What a screen reader hears and read-aloud says ("A statement", "Not a statement"), always. */
  label: string;
  /** The picture on the tile. */
  art: Picto;
  /** A word under the picture, for the eye only (the tile is named by its label). None on a yes/no tile. */
  word?: string;
}

export interface TilesProps {
  options: readonly TileOption[];
  pick: string | undefined | null;
  onPick(id: string): void;
  locked?: boolean;
  /** The question the tiles answer (its id). */
  labelledBy?: string;
  /** After an answer: the right tile, and the picked tile when it is not yet right. */
  right?: string;
  miss?: string;
}

/** Big answer tiles in a radio group: a picture each, arrow keys move between them. */
export function Tiles({ options, pick, onPick, locked = false, labelledBy, right, miss }: TilesProps) {
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
    <div role="radiogroup" aria-labelledby={labelledBy} className={`kid-tiles${options.length > 2 ? ' kid-tiles--many' : ''}`}>
      {options.map((o, i) => {
        const on = pick === o.id;
        const cls = ['kid-tile', on ? 'is-picked' : '', right === o.id ? 'is-right' : '', miss === o.id ? 'is-miss' : ''].filter(Boolean).join(' ');
        return (
          <button
            key={o.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            aria-disabled={locked || undefined}
            tabIndex={i === focusIdx ? 0 : -1}
            className={cls}
            data-tile={o.id}
            onClick={() => { if (!locked) onPick(o.id); }}
            onKeyDown={(e) => onKey(e, i)}
          >
            <Pictogram name={o.art} size={56} decorative />
            {o.word && <span className="kid-tile-word" aria-hidden="true">{o.word}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Yes/no tiles for a pair of options: a check tile and a cross tile, each named by its option's own words. */
export function yesNoTiles(options: readonly { id: string; label: string }[], pair: { yes: string; no: string }): TileOption[] {
  const label = (id: string) => options.find((o) => o.id === id)?.label ?? id;
  return [
    { id: pair.yes, label: label(pair.yes), art: 'check' },
    { id: pair.no, label: label(pair.no), art: 'cross' },
  ];
}

/**
 * Picture tiles for choices that all have a picture: the picture with its kid word under it (Choice.word; '' prints
 * nothing), else its label. Each tile is named by its label.
 */
export const pictureTiles = (choices: readonly Choice[]): TileOption[] =>
  choices.map((c) => ({ id: c.id, label: c.label, art: c.art!, word: c.word ?? c.label }));

/**
 * A kid scene of pictograms (KidItem.scene, kind 'pictos'): rows of pictures, each with at most one short word under
 * it. Each picture is named for screen readers by its word, else by its own name; the word is for the eye.
 */
export function KidPictos({ rows }: { rows: readonly (readonly KidPicto[])[] }) {
  return (
    <div className="kid-pictos play-scene">
      {rows.map((row, r) => (
        <ul key={r} className="kid-pictos-row">
          {row.map((p, k) => (
            <li key={k} className="kid-pictos-cell">
              <Pictogram name={p.art} size={56} label={p.word || undefined} />
              {p.word && <span className="kid-pictos-word" aria-hidden="true" data-label="">{p.word}</span>}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/** Cards drawn plain in kid mode: the card faces only, with no position numbers and no names to read. */
export function KidThings({ things }: { things: readonly Thing[] }) {
  if (!things.length) return null;
  return (
    <ul className="play-things play-scene kid-things" aria-label="Cards">
      {things.map((t) => (
        <li key={t.id} className="play-things-slot">
          <ThingCard thing={t} />
        </li>
      ))}
    </ul>
  );
}

export interface KidRightProps {
  /** The one line under "Yes!". */
  line?: string;
  buttonLabel: string;
  onNext(): void;
  readAloud: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}

/** After a right answer in kid mode: a big check, "Yes!", one line and one button. */
export function KidRight({ line, buttonLabel, onNext, readAloud, buttonRef }: KidRightProps) {
  const id = useId().replace(/[^A-Za-z0-9_-]/g, '');
  return (
    <section className="play-feedback play-feedback--right kid-right" aria-labelledby={`${id}-yes`}>
      <div className="kid-feedback-top">
        <Pictogram name="check" size={56} decorative />
        {readAloud && <ReadAloudButton text={() => ['Yes!', ...(line ? [line] : [])]} />}
      </div>
      <h3 className="kid-yes" id={`${id}-yes`}>Yes!</h3>
      {line && <p className="kid-line-small">{line}</p>}
      <button ref={buttonRef} type="button" className="play-btn play-btn--teal play-btn--block kid-big-btn" onClick={onNext}>
        {buttonLabel}
      </button>
    </section>
  );
}

export interface KidStarProps {
  /** 'clean': every try first time with no hint; 'mended': finished after a repair. */
  kind: 'clean' | 'mended';
  /** The round's own one line (LessonDef.kid.star). */
  line?: string;
  /** Stars in the band with this one, and the band's rounds: "3 of 7" toward the grade badge. */
  got?: number;
  of?: number;
  readAloud: boolean;
  onDone(): void;
}

/**
 * "k of n" toward the grade badge as a row of small stars, k of them lit: a picture with no words to read (screen
 * readers and read-aloud get "3 of 7 stars").
 */
export function StarTally({ got, of }: { got: number; of: number }) {
  const n = Math.max(1, of);
  const k = Math.max(0, Math.min(got, n));
  return (
    <div className="kid-goal kid-star-count" role="img" aria-label={`${k} of ${n} stars toward the grade badge`}>
      {Array.from({ length: n }, (_, i) => <StarShape key={i} on={i < k} size={n > 8 ? 16 : 20} />)}
    </div>
  );
}

/** The star screen at the end of a round in kid mode: "You did it!", the star, the stars toward the badge, one button. */
export function KidStarScreen({ kind, line, got, of, readAloud, onDone }: KidStarProps) {
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headRef.current?.focus({ preventScroll: true });
  }, []);
  return (
    <section className="play-card kid-star-screen" aria-labelledby="kid-star-title">
      <div className="kid-feedback-top">
        <span />
        {readAloud && <ReadAloudButton text={() => ['You did it!', ...(line ? [line] : []), ...(of ? [`${got} of ${of} stars.`] : [])]} />}
      </div>
      <h2 className="play-idea-title kid-star-title" id="kid-star-title" ref={headRef} tabIndex={-1}>
        You did it!
      </h2>
      <svg className={`kid-big-star is-${kind}`} viewBox="0 0 24 24" width="120" height="120" role="img" aria-label={kind === 'clean' ? 'A gold star' : 'A silver star'}>
        <path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z" />
      </svg>
      {line && <p className="kid-line-small">{line}</p>}
      {!!of && <StarTally got={got ?? 0} of={of} />}
      <button type="button" className="play-btn play-btn--primary play-btn--block kid-big-btn" onClick={onDone}>
        Go
      </button>
    </section>
  );
}
