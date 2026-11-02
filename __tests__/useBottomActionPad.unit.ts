import { renderHook } from '@testing-library/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import { useKeyboardHeight } from '@app/hooks/useKeyboardHeight';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));
jest.mock('@app/hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: jest.fn(),
}));

const pad = (bottom: number, keyboard: number) => {
  (useSafeAreaInsets as jest.Mock).mockReturnValue({
    top: 0,
    bottom,
    left: 0,
    right: 0,
  });
  (useKeyboardHeight as jest.Mock).mockReturnValue(keyboard);
  return renderHook(() => useBottomActionPad()).result.current;
};

describe('useBottomActionPad', () => {
  test('Tests that the pad is 16 above the home indicator when the device has one', () => {
    expect(pad(34, 0)).toBe(50);
  });

  test('Tests that the pad is 24 when the device reports no inset', () => {
    expect(pad(0, 0)).toBe(24);
  });

  test('Tests that the pad is 16 above the keyboard when it is open', () => {
    expect(pad(34, 300)).toBe(316);
  });
});
