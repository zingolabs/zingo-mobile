import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { makeMutable, ReduceMotion, withTiming } from 'react-native-reanimated';
import { duration, ease } from '@app/theme/motion';

/** Scrolling down past this, the tab bar shrinks. */
const SHRINK_AFTER = 12;
/** What counts as a move, so a finger resting on the list changes nothing. */
const STEP = 4;

/** 0 the full tab bar, 1 the shrunk one; read by the bar on the UI thread. */
export const tabBarCompact = makeMutable(0);

let target = 0;
let lastY = 0;

const settle = (next: number) => {
  if (next === target) {
    return;
  }
  target = next;
  tabBarCompact.value = withTiming(next, {
    duration: duration.tabBar,
    easing: ease.emphasized,
    reduceMotion: ReduceMotion.System,
  });
};

/**
 * The `onScroll` of a tab's list: scrolling down past 12 pt shrinks the tab
 * bar, scrolling up brings it back.
 */
export function onTabScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
  onTabScrollY(e.nativeEvent.contentOffset.y);
}

/** The same, for a list that reports only its offset. */
export function onTabScrollY(y: number) {
  const dy = y - lastY;
  lastY = y;
  if (y > SHRINK_AFTER && dy > STEP) {
    settle(1);
  } else if (dy < -STEP || y <= SHRINK_AFTER) {
    settle(0);
  }
}

/** Brings the full tab bar back, as changing tab does. */
export function expandTabBar() {
  lastY = 0;
  settle(0);
}
