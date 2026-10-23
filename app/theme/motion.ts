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
  /** A full panel (a transaction, a review) rising over the tabs, and lowering. */
  panelIn: 560,
  panelOut: 460,
  /** Steps inside a full panel: review, sending, sent. */
  step: 150,
  /** Switching home tabs. */
  tabFade: 240,
  /** The tab bar: its capsule sliding, and the bar shrinking and growing back. */
  tabBar: 360,
  /** A tab's colours turning selected or idle. */
  tabColor: 220,
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
  /** The long, soft deceleration of a full panel rising. */
  panel: Easing.bezier(0.32, 0.72, 0, 1),
} as const;
