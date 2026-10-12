import { useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

type PrivacyGuardEvents = {
  isCaptured(): Promise<boolean>;
  addListener(event: string): void;
  removeListeners(count: number): void;
};

/**
 * Calls `onScreenshot` after each screenshot and returns whether the screen
 * is being recorded or mirrored, while `enabled`. iOS only: Android blocks
 * the capture with FLAG_SECURE instead.
 */
export const useScreenCapture = (
  enabled: boolean,
  onScreenshot: () => void,
): boolean => {
  const [captured, setCaptured] = useState(false);
  const shot = useRef(onScreenshot);
  shot.current = onScreenshot;

  useEffect(() => {
    const guard = NativeModules.PrivacyGuard as PrivacyGuardEvents | undefined;
    if (!enabled || Platform.OS !== 'ios' || !guard) {
      setCaptured(false);
      return;
    }
    let live = true;
    const emitter = new NativeEventEmitter(guard);
    const subs = [
      emitter.addListener('screenshot', () => shot.current()),
      emitter.addListener('captured', (on: boolean) => setCaptured(on)),
    ];
    guard.isCaptured().then(on => {
      if (live) {
        setCaptured(on);
      }
    });
    return () => {
      live = false;
      subs.forEach(s => s.remove());
    };
  }, [enabled]);

  return captured;
};
