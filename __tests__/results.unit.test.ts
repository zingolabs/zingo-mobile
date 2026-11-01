/**
 * @format
 */
import { renderHook } from '@testing-library/react-native';
import { deliver, useResult } from '@app/navigation/results';

describe('result channel', () => {
  test('Tests that an asker receives the answer delivered while it listens.', () => {
    const onValue = jest.fn();
    renderHook(() => useResult('send.address', onValue));

    deliver('send.address', 'u1first');

    expect(onValue).toHaveBeenCalledWith('u1first');
  });

  test('Tests that an answer delivered with nobody listening never reaches a later asker.', () => {
    const first = renderHook(() => useResult('send.address', jest.fn()));
    first.unmount();

    deliver('send.address', 'u1stale');
    const later = jest.fn();
    renderHook(() => useResult('send.address', later));

    expect(later).not.toHaveBeenCalled();
  });
});
