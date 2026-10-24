import { act, renderHook } from '@testing-library/react-native';
import type { ValueTransferType } from '@app/AppState';
import { FRESH_MS, useFreshRows } from '@screens/History/useFreshRows';

const vt = (txid: string) => ({ txid }) as ValueTransferType;

describe('useFreshRows', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('Tests that only a transaction arriving after the first load is lit, and only for a moment', () => {
    const { result, rerender } = renderHook(
      ({ list }: { list: ValueTransferType[] }) => useFreshRows(list),
      { initialProps: { list: [vt('a'), vt('b')] } },
    );
    expect(result.current.size).toBe(0);
    rerender({ list: [vt('c'), vt('a'), vt('b')] });
    expect([...result.current]).toEqual(['c']);
    act(() => {
      jest.advanceTimersByTime(FRESH_MS + 300);
    });
    expect(result.current.size).toBe(0);
  });
});
