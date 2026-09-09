import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// The OS "reduce motion" switch, for the plain Animated API. Reanimated reads
// it natively through ReduceMotion.System; Animated has no equivalent, so the
// segmented bar and the trickle driver poll it here.
const useReduceMotion = (): boolean => {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled: boolean) => {
      if (!cancelled) {
        setReduce(enabled);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduce,
    );
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return reduce;
};

export default useReduceMotion;
