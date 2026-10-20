import { act } from '@testing-library/react-native';

/** Advances the fake timers by a time inside act. */
export const advance = (ms: number): void => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};
