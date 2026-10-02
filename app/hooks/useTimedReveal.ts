import { useEffect, useRef, useState } from 'react';
import { REVEAL_MS, Reveal, visible } from '@app/utils/reveal';

const HIDDEN: Reveal = { kind: 'hidden' };

/** Whether a text is revealed, whether a text that hides only in the timed mode shows, and the action that reveals it. */
export type TimedReveal = {
  revealed: boolean;
  visible: boolean;
  reveal: () => void;
};

/** A reveal that one timer hides again after the reveal time when it is timed, and that a change of mode forgets. */
export function useTimedReveal(timed: boolean): TimedReveal {
  const [state, setState] = useState<Reveal>(HIDDEN);
  const [mode, setMode] = useState<boolean>(timed);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (mode !== timed) {
    setMode(timed);
    setState(HIDDEN);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const reveal = (): void => {
    clearTimeout(timer.current);
    setState({ kind: 'shown' });
    if (timed) {
      timer.current = setTimeout(() => setState(HIDDEN), REVEAL_MS);
    }
  };

  const current: Reveal = mode === timed ? state : HIDDEN;
  return {
    revealed: current.kind === 'shown',
    visible: visible(current, timed),
    reveal,
  };
}
