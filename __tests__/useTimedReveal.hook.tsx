/**
 * The one timer of a timed reveal.
 */
import { act, renderHook } from '@testing-library/react-native';
import { useTimedReveal } from '@app/hooks/useTimedReveal';
import { REVEAL_MS } from '@app/utils/reveal';
import { advance } from '../__mocks__/advanceTimers';

const SECOND_TAP_MS = 4500;

const timedHook = (timed: boolean) =>
  renderHook((mode: boolean) => useTimedReveal(mode), {
    initialProps: timed,
  });

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('Tests that a timed reveal hides again when the reveal time ends.', () => {
  const { result } = timedHook(true);

  act(() => result.current.reveal());
  expect(result.current.revealed).toBe(true);

  advance(REVEAL_MS);
  expect(result.current.revealed).toBe(false);
});

test('Tests that an untimed reveal stays when the reveal time ends, and starts no timer.', () => {
  const { result } = timedHook(false);

  act(() => result.current.reveal());
  expect(jest.getTimerCount()).toBe(0);

  advance(REVEAL_MS);
  expect(result.current.revealed).toBe(true);
});

test('Tests that the reveal lasts the whole reveal time when it starts again before it ends. One timer exists at a time.', () => {
  const { result } = timedHook(true);

  act(() => result.current.reveal());
  advance(SECOND_TAP_MS);
  act(() => result.current.reveal());
  expect(jest.getTimerCount()).toBe(1);

  advance(REVEAL_MS - SECOND_TAP_MS);
  expect(result.current.revealed).toBe(true);

  advance(SECOND_TAP_MS);
  expect(result.current.revealed).toBe(false);
});

test('Tests that no timer remains when the hook unmounts during a reveal.', () => {
  const { result, unmount } = timedHook(true);

  act(() => result.current.reveal());
  unmount();

  expect(jest.getTimerCount()).toBe(0);
});

test('Tests that an untimed reveal hides in the same render when the mode becomes timed.', () => {
  const { result, rerender } = timedHook(false);

  act(() => result.current.reveal());
  rerender(true);

  expect(result.current.revealed).toBe(false);
  expect(result.current.visible).toBe(false);
});

test('Tests that a text that hides only in the timed mode shows when the mode is untimed, and hides when the mode is timed and nothing revealed it.', () => {
  const { result, rerender } = timedHook(false);
  expect(result.current.visible).toBe(true);

  rerender(true);
  expect(result.current.visible).toBe(false);

  act(() => result.current.reveal());
  expect(result.current.visible).toBe(true);
});
