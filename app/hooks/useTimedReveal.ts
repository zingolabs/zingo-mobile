import { useEffect, useRef, useState } from 'react';
import { REVEAL_MS, Reveal, shown, visible } from '@app/utils/reveal';

/** Whether a text is revealed, whether a text that hides only in the timed mode shows, and the action that reveals it. */
export type TimedReveal = {
  revealed: boolean;
  visible: boolean;
  reveal: () => void;
};

/** A reveal that one timer hides again after the reveal time when it is timed. */
export function useTimedReveal(timed: boolean): TimedReveal {
  const [state, setState] = useState<Reveal>({ kind: 'hidden' });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const reveal = (): void => {
    clearTimeout(timer.current);
    setState({ kind: 'shown', timed });
    if (timed) {
      timer.current = setTimeout(() => setState({ kind: 'hidden' }), REVEAL_MS);
    }
  };

  return {
    revealed: shown(state, timed),
    visible: visible(state, timed),
    reveal,
  };
}
