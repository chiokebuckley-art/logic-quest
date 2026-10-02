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
}

export function IdeaCards({ cards, readAloud, onDone, doneLabel = 'Try it', kicker = 'Key idea', after, doneNote }: IdeaCardsProps & IdeaCardsExtraProps) {
  const [i, setI] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const count = cards.length;
  const card = cards[Math.min(i, Math.max(0, count - 1))];

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
  const speechText = () => [asSentence(card.title), ...(card.scene ? sceneSpeech(card.scene) : []), ...card.body.map(asSentence)];

  return (
    <article className="play-card play-idea" aria-roledescription="key idea card">
      <div className="play-item-top">
        <span className="play-kicker">
          {kicker} {count > 1 && <span className="play-kicker-count">· {i + 1} of {count}</span>}
        </span>
        {readAloud && <ReadAloudButton key={i} text={speechText} />}
      </div>
      <h2 className="play-idea-title" ref={titleRef} tabIndex={-1}>
        {card.title}
      </h2>
      {card.scene && <SceneView scene={card.scene} />}
      <div className="play-idea-body">
        {card.body.map((p, k) => (
          <p key={k} className="play-body">
            {p}
          </p>
        ))}
      </div>
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
            if (last) {
              stopSpeaking();
              onDone();
            } else go(i + 1);
          }}
        >
          {last ? doneLabel : 'Next'}
        </button>
      </div>
      {last && doneNote && <p className="play-done-note">{doneNote}</p>}
    </article>
  );
}
