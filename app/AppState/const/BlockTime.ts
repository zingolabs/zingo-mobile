import { RPCBroadcastWindowType } from '../../walletBackend/types/RPCMigrationStatusType';

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
