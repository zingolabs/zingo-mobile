import { Easing } from 'react-native-reanimated';

// Durations in ms and easing curves from the onboarding motion prototype.
export const duration = {
  fast: 140,
  base: 200,
  medium: 260,
  axis: 300,
  axisOut: 180,
  emphasized: 320,
  screen: 420,
  sheet: 420,
  sheetClose: 260,
  leavesPart: 640,
  leavesReturn: 720,
  hero: 1100,
  hold: 1500,
} as const;

export const ease = {
  emphasized: Easing.bezier(0.2, 0, 0, 1),
  out: Easing.bezier(0.22, 1, 0.36, 1),
  settle: Easing.bezier(0.3, 1.25, 0.4, 1),
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  in: Easing.bezier(0.4, 0, 1, 1),
} as const;
