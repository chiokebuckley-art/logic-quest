/** The speaker button: reads the given lines aloud, and stops when pressed again or when it leaves the screen. */
import { useEffect, useRef, useState } from 'react';
import { canSpeak, speak, stopSpeaking } from '../speech';
import { PlayIcon } from './ThingCard';

/** Speaker button. Reads `text()` aloud; press again to stop. */
export function ReadAloudButton({ text, label = 'Read aloud' }: { text: () => readonly string[]; label?: string }) {
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
      aria-label={label}
      aria-pressed={on}
      disabled={!available}
      title={available ? (on ? 'Stop reading' : label) : 'This browser cannot read aloud'}
      onClick={click}
    >
      <PlayIcon name={on ? 'stop' : 'speaker'} />
    </button>
  );
}
