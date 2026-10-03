/**
 * Key-idea cards, one at a time: title, an optional worked example, short paragraphs, step dots,
 * Back / Next, and read-aloud. The last card's button says "Try it". Focus goes to the card's title
 * when the cards open and on every move, so a screen reader starts reading at the new card.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { asSentence, sceneSpeech, stopSpeaking } from '../speech';
import type { IdeaCardsProps } from './contracts';
import { Dots, ReadAloudButton } from './ItemView';
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
}

export function IdeaCards({ cards, readAloud, onDone, doneLabel = 'Try it', kicker = 'Key idea', after, doneNote, numberFrom = 1, numberOf }: IdeaCardsProps & IdeaCardsExtraProps) {
  const [i, setI] = useState(0);
  /** Worked cases shown one step at a time: steps showing, by card. A card seen before stays fully shown. */
  const [shownSteps, setShownSteps] = useState<Record<number, number>>({});
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const count = cards.length;
  const card = cards[Math.min(i, Math.max(0, count - 1))];
  const steps = card?.scene?.kind === 'cases' ? card.scene.steps ?? [] : [];
  const revealed = steps.length ? shownSteps[i] ?? 0 : 0;
  /** The card's worked case is not all showing yet: the main button shows its next step instead of moving on. */
  const nextStep = revealed < steps.length ? steps[revealed] : null;

  useEffect(() => {
    if (!moved.current) {
      // The lesson just opened: start at the first card's title.
      titleRef.current?.focus({ preventScroll: true });
      return;
    }
    stopSpeaking();
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
  const go = (to: number) => {
    moved.current = true;
    setI(Math.max(0, Math.min(count - 1, to)));
  };
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
    return [asSentence(card.title), ...(steps.length ? [...text, ...scene] : [...scene, ...text])];
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
      {/* A worked case says what to pretend first, then shows the board and its line for each step. */}
      {steps.length > 0 && body}
      {card.scene && <SceneView scene={card.scene} revealed={revealed} />}
      {steps.length === 0 && body}
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
