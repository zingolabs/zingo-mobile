import 'react-native';
import { watchFaceDown } from '@app/services/faceDown';

const { DeviceEventEmitter, NativeModules } = jest.requireActual('react-native');

beforeEach(() => {
  NativeModules.FlipDetector = {
    isAvailable: jest.fn(async () => true),
    start: jest.fn(),
    stop: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  jest.useFakeTimers();
});

afterEach(() => {
  delete NativeModules.FlipDetector;
  jest.useRealTimers();
});

test('Tests that a face-down phone hides the amounts after the hold time.', () => {
  const onChange = jest.fn();
  const stop = watchFaceDown(onChange);

  DeviceEventEmitter.emit('faceDown', { down: true });
  expect(onChange).not.toHaveBeenCalled();

  jest.advanceTimersByTime(399);
  expect(onChange).not.toHaveBeenCalled();

  jest.advanceTimersByTime(1);
  expect(onChange).toHaveBeenCalledWith(true);

  stop();
});

test('Tests that a face-up phone shows the amounts after the shorter hold time.', () => {
  const onChange = jest.fn();
  const stop = watchFaceDown(onChange);

  DeviceEventEmitter.emit('faceDown', { down: true });
  jest.advanceTimersByTime(400);

  DeviceEventEmitter.emit('faceDown', { down: false });
  jest.advanceTimersByTime(149);
  expect(onChange).toHaveBeenCalledTimes(1);

  jest.advanceTimersByTime(1);
  expect(onChange).toHaveBeenLastCalledWith(false);

  stop();
});

test('Tests that a phone that turns face up during the hold stays shown.', () => {
  const onChange = jest.fn();
  const stop = watchFaceDown(onChange);

  DeviceEventEmitter.emit('faceDown', { down: true });
  jest.advanceTimersByTime(200);
  DeviceEventEmitter.emit('faceDown', { down: false });
  jest.advanceTimersByTime(1000);

  expect(onChange).not.toHaveBeenCalled();

  stop();
});

test('Tests that the sensor stops and the listener leaves when the watch ends.', () => {
  const onChange = jest.fn();
  const stop = watchFaceDown(onChange);

  stop();
  DeviceEventEmitter.emit('faceDown', { down: true });
  jest.advanceTimersByTime(1000);

  expect(NativeModules.FlipDetector.stop).toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});
