import { RPCBroadcastWindowType } from '@app/walletBackend/types/RPCMigrationStatusType';

/**
 * Mainnet's target block spacing, which is also what zingolib assumes when it
 * extrapolates `window_opens_unix_time` and `latest_target_unix_time`. On a
 * test rig ticking faster than mainnet those extrapolations read many times
 * too long, so the app re-derives wall-clock estimates from block distances
 * (which are exact) and the spacing it actually observes.
 */
export const TARGET_BLOCK_SPACING_SECONDS = 75;

// One observation folds into the running estimate with this weight: heavy
// enough to converge within a handful of blocks after a rig change, light
// enough that a single odd gap doesn't swing the estimate.
const EMA_WEIGHT = 0.3;

// Observations outside this range are measurement artifacts, not blocks: a
// staged height jump lands hundreds of blocks in one poll gap (seconds per
// block near zero), and a paused miner stretches one block over minutes.
const MIN_SPACING_SECONDS = 1;
const MAX_SPACING_SECONDS = 1200;

/**
 * Folds one observed seconds-per-block sample into the running estimate.
 * `null` means no estimate yet. Artifact samples leave the estimate as it was.
 */
export const foldBlockSpacing = (
  estimate: number | null,
  sample: number,
): number | null => {
  if (sample < MIN_SPACING_SECONDS || sample > MAX_SPACING_SECONDS) {
    return estimate;
  }
  if (estimate === null) {
    return sample;
  }
  return estimate + (sample - estimate) * EMA_WEIGHT;
};

/**
 * The window's advisory target as a block height. The payload carries it only
 * as a unix estimate, but both unix fields come from the same fixed-spacing
 * extrapolation, so their gap divided by that spacing recovers the target's
 * offset from the boundary exactly.
 */
export const windowTargetHeight = (wake: RPCBroadcastWindowType): number =>
  wake.boundary +
  Math.round(
    (wake.latest_target_unix_time - wake.window_opens_unix_time) /
      TARGET_BLOCK_SPACING_SECONDS,
  );

/**
 * Whether the server tip has reached the next window's boundary while the
 * backend still reports no batch due. The countdown measures from the server
 * tip (`info.latestBlock`), but zingolib decides `due_now` and
 * `upcoming_windows` from the wallet's own last known chain height, which
 * trails the server until sync picks the new block up. In that gap the
 * countdown reads zero blocks with nothing to send, so callers show "syncing"
 * instead and re-read as the sync advances.
 */
export const awaitingWalletTip = (
  nextBoundary: number | undefined,
  serverHeight: number,
  batchDue: boolean,
): boolean =>
  !batchDue &&
  nextBoundary !== undefined &&
  serverHeight > 0 &&
  nextBoundary <= serverHeight;

/**
 * When `targetHeight` is expected to be mined, in ms since epoch, extrapolated
 * from the chain tip at the observed spacing. Past heights estimate as now,
 * mirroring zingolib's `estimated_unix_at`.
 */
export const estimatedTimestampMs = (
  targetHeight: number,
  currentHeight: number,
  secondsPerBlock: number,
  nowMs: number,
): number =>
  nowMs + Math.max(0, targetHeight - currentHeight) * secondsPerBlock * 1000;

// A reminder never fires in the window's first blocks, so the wallet has
// synced to the boundary and "Send" is on screen when the user opens the app.
export const REMINDER_START_MARGIN_BLOCKS = 2;
// Nor in its last ~30 minutes, so there is time to send (and retry) before the
// window closes and its batch slides.
export const REMINDER_END_MARGIN_BLOCKS = 24;

/**
 * The height a window's reminder fires at: its advisory target, kept inside
 * the window. zingolib draws each part's target as the boundary plus an
 * exponential delay capped far beyond the window (576 blocks against a
 * 144-block window) and the window's target is the latest of its parts', so
 * unclamped it often lands after the window has closed, when its batch can no
 * longer be sent. Targets already inside the margins are left untouched.
 */
export const reminderHeight = (
  wake: RPCBroadcastWindowType,
  bucketModulus: number,
): number => {
  const earliest = wake.boundary + REMINDER_START_MARGIN_BLOCKS;
  const latest = Math.max(
    earliest,
    wake.boundary + bucketModulus - REMINDER_END_MARGIN_BLOCKS,
  );
  return Math.min(Math.max(windowTargetHeight(wake), earliest), latest);
};

/**
 * When a window's reminder fires, in ms since epoch. On mainnet the block
 * distance is scaled by the protocol's target spacing: the observed spacing is
 * an average over a handful of recent blocks, noisy enough (tens of seconds
 * either way) to fire hours early or late across hundreds of blocks, while the
 * chain holds the target on average. Test chains, which may tick much faster,
 * keep the observed spacing. Without a chain tip the payload's own estimate
 * (target spacing from the window's opening) is used.
 */
export const reminderTimestampMs = (
  wake: RPCBroadcastWindowType,
  bucketModulus: number,
  chain: {
    latestBlock?: number;
    secondsPerBlock?: number;
    mainnet: boolean;
  },
  nowMs: number,
): number => {
  const height = reminderHeight(wake, bucketModulus);
  if (!chain.latestBlock) {
    return (
      (wake.window_opens_unix_time +
        (height - wake.boundary) * TARGET_BLOCK_SPACING_SECONDS) *
      1000
    );
  }
  const spacing = chain.mainnet
    ? TARGET_BLOCK_SPACING_SECONDS
    : (chain.secondsPerBlock ?? TARGET_BLOCK_SPACING_SECONDS);
  return estimatedTimestampMs(height, chain.latestBlock, spacing, nowMs);
};
