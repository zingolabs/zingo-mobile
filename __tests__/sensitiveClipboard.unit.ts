import 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { copySensitive } from '@app/utils/sensitiveClipboard';

const { NativeModules } = jest.requireActual('react-native');

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  delete NativeModules.PrivacyGuard;
});

test('Tests that the clipboard empties a minute after a sensitive copy. The cleared callback fires once.', async () => {
  const onCleared = jest.fn();
  await copySensitive('ridge autumn', onCleared);
  expect(Clipboard.setString).toHaveBeenLastCalledWith('ridge autumn');
  jest.advanceTimersByTime(60 * 1000);
  expect(Clipboard.setString).toHaveBeenLastCalledWith('');
  expect(onCleared).toHaveBeenCalledTimes(1);
});

test('Tests that the native module copies the text when the platform provides it.', async () => {
  NativeModules.PrivacyGuard = { copySensitive: jest.fn(async () => true) };
  await copySensitive('ridge autumn', jest.fn());
  expect(NativeModules.PrivacyGuard.copySensitive).toHaveBeenCalledWith(
    'ridge autumn',
    60,
  );
});
