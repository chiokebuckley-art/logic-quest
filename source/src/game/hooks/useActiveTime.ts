import { useEffect, useRef } from 'react';

export const TICK_SECONDS = 15;
export const IDLE_AFTER_MS = 90_000;

const INPUT_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

/**
 * Counts active play time. Every 15 s, if the page is visible and there was pointer or key input
 * in the last 90 s, calls onActive(15). Nothing is counted while `enabled` is false.
 */
export function useActiveTime(enabled: boolean, onActive: (seconds: number) => void): void {
  const lastInput = useRef(Date.now());
  const cb = useRef(onActive);
  cb.current = onActive;

  useEffect(() => {
    if (!enabled) return;
    lastInput.current = Date.now();
    const mark = () => { lastInput.current = Date.now(); };
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    for (const e of INPUT_EVENTS) window.addEventListener(e, mark, opts);
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastInput.current > IDLE_AFTER_MS) return;
      cb.current(TICK_SECONDS);
    }, TICK_SECONDS * 1000);
    return () => {
      window.clearInterval(t);
      for (const e of INPUT_EVENTS) window.removeEventListener(e, mark, opts);
    };
  }, [enabled]);
}
