import { Platform, ScrollViewProps } from 'react-native';

/** Dragging a scroll view closes the keyboard: iOS follows the finger, Android closes it at once. */
export const dismissOnDrag: ScrollViewProps['keyboardDismissMode'] =
  Platform.OS === 'ios' ? 'interactive' : 'on-drag';
