import 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useScreenCapture } from '@app/hooks/useScreenCapture';

const { DeviceEventEmitter, NativeModules } =
  jest.requireActual('react-native');

beforeEach(() => {
  NativeModules.PrivacyGuard = {
    isCaptured: jest.fn(async () => false),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
});
afterEach(() => {
  delete NativeModules.PrivacyGuard;
});

test('Tests that a screenshot calls back when the words are on screen.', async () => {
  const onScreenshot = jest.fn();
  renderHook(() => useScreenCapture(true, onScreenshot));
  await act(async () => {});
  act(() => {
    DeviceEventEmitter.emit('screenshot');
  });
  expect(onScreenshot).toHaveBeenCalledTimes(1);
});

test('Tests that a screenshot is ignored when the hook is disabled.', async () => {
  const onScreenshot = jest.fn();
  renderHook(() => useScreenCapture(false, onScreenshot));
  await act(async () => {});
  act(() => {
    DeviceEventEmitter.emit('screenshot');
  });
  expect(onScreenshot).not.toHaveBeenCalled();
});

test('Tests that the hook reports a capture when recording starts.', async () => {
  const { result } = renderHook(() => useScreenCapture(true, jest.fn()));
  await act(async () => {});
  act(() => {
    DeviceEventEmitter.emit('captured', true);
  });
  expect(result.current).toBe(true);
});
