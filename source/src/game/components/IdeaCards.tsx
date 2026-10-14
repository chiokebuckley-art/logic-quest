/**
 * Key-idea cards, one at a time: title, an optional worked example, short paragraphs, step dots,
 * Back / Next, and read-aloud. The last card's button says "Try it". Focus goes to the card's title
 * when the cards open and on every move, so a screen reader starts reading at the new card.
 *
 * Kid mode (Grades 1 to 3) with the lesson's kid cards: the picture first (a pictogram, or the card's own scene),
 * then the one line in the title that keeps focus. No kicker count, no body, no "why it matters", no step dots; the
 * last card's button says "Go" and the others "Next". Next starts reading the new card by itself (g1 and g2).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { KidCard } from '../../engine/types';
import { asSentence, sceneSpeech, stopSpeaking } from '../speech';
import { useKidMode } from '../kidMode';
import { autoSay, kidCardSpeech } from '../kidPlay';
import type { IdeaCardsProps } from './contracts';
import { Dots, ReadAloudButton } from './ItemView';
import { KidPicture } from './KidPlay';
import { SceneView } from './SceneView';

export interface IdeaCardsExtraProps {
  /** Label for the last card's button. Default "Try it". */
  doneLabel?: string;
  /** Small label above the title. Default "Key idea". */
  kicker?: string;
  /** Shown between the card and its buttons (the lesson's thinking-routine chip). */
  after?: ReactNode;
  /** A short line under the last card's button ("Then the check opens"). */
  doneNote?: string;
  /** When these cards are a stretch of a lesson's cards: the first one's number, and how many the lesson has. */
  numberFrom?: number;
  numberOf?: number;
  /** "Why it matters" (content/world), shown on the lesson's first card only. */
  why?: string;
  /** The kid layer of these cards (LessonDef.kid.cards, the same stretch), drawn in kid mode. */
  kid?: readonly KidCard[];
  /** The card to open on (0-based). Default the first. */
  startAt?: number;
}

export function IdeaCards({ cards, readAloud, onDone, doneLabel = 'Try it', kicker = 'Key idea', after, doneNote, numberFrom = 1, numberOf, why, kid, startAt = 0 }: IdeaCardsProps & IdeaCardsExtraProps) {
  const kidMode = useKidMode();
  const [i, setI] = useState(() => Math.max(0, Math.min(cards.length - 1, startAt)));
  /** Worked cases shown one step at a time: steps showing, by card. A card seen before stays fully shown. */
  const [shownSteps, setShownSteps] = useState<Record<number, number>>({});
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  /** Read-aloud of the new card was started by the tap that opened it (kid mode). */
  const said = useRef(false);
  const count = cards.length;
  const card = cards[Math.min(i, Math.max(0, count - 1))];
  const steps = card?.scene && 'steps' in card.scene ? card.scene.steps ?? [] : [];
  const revealed = steps.length ? shownSteps[i] ?? 0 : 0;
  /** The card's worked case is not all showing yet: the main button shows its next step instead of moving on. */
  const nextStep = revealed < steps.length ? steps[revealed] : null;

  useEffect(() => {
    if (!moved.current) {
      // The lesson just opened: start at the first card's title.
      titleRef.current?.focus({ preventScroll: true });
      return;
    }
    // A move stops the reading, unless the move itself just started reading the new card.
    if (said.current) said.current = false;
    else stopSpeaking();
    titleRef.current?.focus();
  }, [i]);

  if (!card) {
    return (
      <div className="play-card">
        <p className="play-body">There are no key ideas here yet.</p>
        <button type="button" className="play-btn play-btn--primary play-btn--block" onClick={onDone}>
          {doneLabel}
        </button>
      </div>
    );
  }

  const last = i >= count - 1;
  const showWhy = !!why && i === 0 && numberFrom === 1;
  const go = (to: number) => {
    moved.current = true;
    const at = Math.max(0, Math.min(count - 1, to));
    setI(at);
    const k = kidMode ? kid?.[at] : undefined;
    if (k) said.current = autoSay(kidMode, kidCardSpeech(k));
  };
  /** This card's kid line and picture, in kid mode. */
  const kidCard = kidMode ? kid?.[i] : undefined;
  if (kidCard) {
    return (
      <article className="play-card play-idea kid-card" aria-roledescription="key idea card">
        <div className="play-item-top">
          <span />
          {readAloud && <ReadAloudButton key={i} text={() => kidCardSpeech(kidCard)} />}
        </div>
        <KidPicture art={kidCard.art} scene={card.scene} />
        <h2 className="play-idea-title kid-line" ref={titleRef} tabIndex={-1}>
          {kidCard.line}
        </h2>
        {after}
        <div className="play-actions">
          {i > 0 && (
            <button type="button" className="play-btn play-btn--ghost" onClick={() => go(i - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="play-btn play-btn--primary play-btn--grow kid-big-btn"
            onClick={() => {
              if (!last) return go(i + 1);
              stopSpeaking();
              onDone();
            }}
          >
            {last ? 'Go' : 'Next'}
          </button>
        </div>
      </article>
    );
  }
  const body = (
    <div className="play-idea-body">
      {card.body.map((p, k) => (
        <p key={k} className="play-body">
          {p}
        </p>
      ))}
    </div>
  );
  // Read in the order the card shows: a worked case's line to pretend first, otherwise the picture first.
  const speechText = () => {
    const scene = card.scene ? sceneSpeech(card.scene, revealed) : [];
    const text = card.body.map(asSentence);
    return [asSentence(card.title), ...(steps.length ? [...text, ...scene] : [...scene, ...text]), ...(showWhy ? ['Why it matters.', why!] : [])];
  };

  return (
    <article className="play-card play-idea" aria-roledescription="key idea card">
      <div className="play-item-top">
        <span className="play-kicker">
          {kicker} {(numberOf ?? count) > 1 && <span className="play-kicker-count">· {numberFrom + i} of {numberOf ?? count}</span>}
        </span>
        {readAloud && <ReadAloudButton key={i} text={speechText} />}
      </div>
      <h2 className="play-idea-title" ref={titleRef} tabIndex={-1}>
        {card.title}
      </h2>
      {/* A worked case says what to pretend first, then shows the board and its line for each step. A contrast card
          names the two ideas first, then shows them side by side. */}
      {(steps.length > 0 || card.scene?.kind === 'contrast') && body}
      {card.scene && <SceneView scene={card.scene} revealed={revealed} />}
      {steps.length === 0 && card.scene?.kind !== 'contrast' && body}
      {showWhy && (
        <p className="play-why">
          <span className="play-why-label">Why it matters</span> {why}
        </p>
      )}
      {count > 1 && <Dots states={cards.map((_, k) => (k < i ? 'done' : k === i ? 'now' : 'todo'))} label={`Card ${i + 1} of ${count}`} />}
      {after}
      <div className="play-actions">
        {i > 0 && (
          <button type="button" className="play-btn play-btn--ghost" onClick={() => go(i - 1)}>
            Back
          </button>
        )}
        <button
          type="button"
          className="play-btn play-btn--primary play-btn--grow"
          onClick={() => {
            if (nextStep) setShownSteps((m) => ({ ...m, [i]: revealed + 1 }));
            else if (last) {
              stopSpeaking();
              onDone();
            } else go(i + 1);
          }}
        >
          {nextStep ? nextStep.label : last ? doneLabel : 'Next'}
        </button>
      </div>
      {last && !nextStep && doneNote && <p className="play-done-note">{doneNote}</p>}
    </article>
  );
}
