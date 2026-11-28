import { AppState, NativeEventEmitter, NativeModules } from 'react-native';

type FlipDetectorAPI = {
  isAvailable(): Promise<boolean>;
  start(): void;
  stop(): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
};

type FaceDownSample = {
  down: boolean;
};

const HIDE_MS = 400;
const SHOW_MS = 150;

const detector = (): FlipDetectorAPI | undefined =>
  NativeModules?.FlipDetector as FlipDetectorAPI | undefined;

export const faceDownAvailable = async (): Promise<boolean> => {
  const flip = detector();
  return flip ? flip.isAvailable() : false;
};

export function watchFaceDown(onChange: (down: boolean) => void): () => void {
  const flip = detector();
  if (!flip) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(flip);
  let sampled = false;
  let shown = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const apply = (down: boolean): void => {
    if (down === shown) {
      return;
    }
    shown = down;
    onChange(down);
  };

  const subscription = emitter.addListener(
    'faceDown',
    ({ down }: FaceDownSample) => {
      if (down === sampled) {
        return;
      }
      sampled = down;
      clearTimeout(timer);
      timer = setTimeout(() => apply(down), down ? HIDE_MS : SHOW_MS);
    },
  );

  const appState = AppState.addEventListener('change', status => {
    if (status === 'active') {
      flip.start();
    } else {
      flip.stop();
    }
  });

  flip.start();

  return () => {
    clearTimeout(timer);
    subscription.remove();
    appState.remove();
    flip.stop();
  };
}
