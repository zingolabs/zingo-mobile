/**
 * @format
 */

import {
  TARGET_BLOCK_SPACING_SECONDS,
  awaitingWalletTip,
  estimatedTimestampMs,
  foldBlockSpacing,
  windowTargetHeight,
  reminderTimestampMs,
} from '@app/AppState';
import { reminderHeight } from '@app/AppState/const/BlockTime';
import { RPCBroadcastWindowType } from '@app/walletBackend/types/RPCMigrationStatusType';

describe('foldBlockSpacing', () => {
  test('first accepted sample becomes the estimate', () => {
    expect(foldBlockSpacing(null, 10)).toBe(10);
  });

  test('later samples fold in without replacing the estimate', () => {
    const folded = foldBlockSpacing(75, 10) as number;
    expect(folded).toBeLessThan(75);
    expect(folded).toBeGreaterThan(10);
  });

  test('a staged height jump reads as sub-second spacing and is rejected', () => {
    // 400 blocks landing in one 5s poll gap.
    expect(foldBlockSpacing(75, 5 / 400)).toBe(75);
    expect(foldBlockSpacing(null, 5 / 400)).toBeNull();
  });

  test('a paused miner reads as a stall and is rejected', () => {
    expect(foldBlockSpacing(10, 3600)).toBe(10);
  });

  test('converges onto a fast test rig within a few blocks', () => {
    let estimate: number | null = 75;
    for (let i = 0; i < 12; i++) {
      estimate = foldBlockSpacing(estimate, 10);
    }
    expect(estimate as number).toBeLessThan(11);
  });
});

describe('windowTargetHeight', () => {
  const wake = (
    boundary: number,
    opensUnix: number,
    targetUnix: number,
  ): RPCBroadcastWindowType => ({
    bucket_index: Math.floor(boundary / 144),
    boundary,
    part_ids: [],
    denominations: [],
    window_opens_unix_time: opensUnix,
    latest_target_unix_time: targetUnix,
  });

  test('recovers the target offset the payload encoded at mainnet spacing', () => {
    // zingolib put the target 100 blocks past the boundary.
    const opens = 1_700_000_000;
    const target = opens + 100 * TARGET_BLOCK_SPACING_SECONDS;
    expect(windowTargetHeight(wake(3_428_352, opens, target))).toBe(
      3_428_352 + 100,
    );
  });

  test('a target at the boundary recovers as the boundary', () => {
    const opens = 1_700_000_000;
    expect(windowTargetHeight(wake(3_428_352, opens, opens))).toBe(3_428_352);
  });
});

describe('estimatedTimestampMs', () => {
  const NOW = 1_700_000_000_000;

  test('scales block distance by the observed spacing', () => {
    expect(estimatedTimestampMs(1_100, 1_000, 10, NOW)).toBe(
      NOW + 100 * 10 * 1000,
    );
  });

  test('past heights estimate as now', () => {
    expect(estimatedTimestampMs(900, 1_000, 10, NOW)).toBe(NOW);
  });
});

describe('awaitingWalletTip', () => {
  test('server tip at or past the boundary with nothing due is awaiting sync', () => {
    expect(awaitingWalletTip(1_000, 1_000, false)).toBe(true);
    expect(awaitingWalletTip(1_000, 1_003, false)).toBe(true);
  });

  test('a batch already due is not awaiting sync', () => {
    expect(awaitingWalletTip(1_000, 1_000, true)).toBe(false);
  });

  test('before the boundary the countdown still stands', () => {
    expect(awaitingWalletTip(1_000, 999, false)).toBe(false);
  });

  test('no upcoming window or no server tip yet is not awaiting sync', () => {
    expect(awaitingWalletTip(undefined, 1_000, false)).toBe(false);
    expect(awaitingWalletTip(1_000, 0, false)).toBe(false);
  });
});

describe('reminder timing', () => {
  const BOUNDARY = 3_428_352;
  const OPENS = 1_700_000_000;
  const NOW = 1_700_000_000_000;
  // A window whose advisory target sits `offset` blocks past its boundary, as
  // zingolib encodes it (both unix fields at mainnet spacing).
  const wakeAt = (offset: number): RPCBroadcastWindowType => ({
    bucket_index: Math.floor(BOUNDARY / 144),
    boundary: BOUNDARY,
    part_ids: [],
    denominations: [],
    window_opens_unix_time: OPENS,
    latest_target_unix_time: OPENS + offset * TARGET_BLOCK_SPACING_SECONDS,
  });

  test('a target inside the window is left as is', () => {
    expect(reminderHeight(wakeAt(66), 144)).toBe(BOUNDARY + 66);
  });

  test('a target past the window pulls back before it closes', () => {
    // An exponential draw capped at 576 blocks often lands after the window.
    expect(reminderHeight(wakeAt(300), 144)).toBe(BOUNDARY + 144 - 24);
    expect(reminderHeight(wakeAt(130), 144)).toBe(BOUNDARY + 144 - 24);
  });

  test('a target at the boundary waits for the wallet to sync to it', () => {
    expect(reminderHeight(wakeAt(0), 144)).toBe(BOUNDARY + 2);
  });

  test('a window shorter than the margins still fires after it opens', () => {
    expect(reminderHeight(wakeAt(50), 10)).toBe(BOUNDARY + 2);
  });

  test('mainnet times by target spacing, ignoring a noisy observed average', () => {
    const tip = BOUNDARY - 100;
    expect(
      reminderTimestampMs(
        wakeAt(66),
        144,
        { latestBlock: tip, secondsPerBlock: 40, mainnet: true },
        NOW,
      ),
    ).toBe(NOW + 166 * TARGET_BLOCK_SPACING_SECONDS * 1000);
  });

  test('a test chain keeps the observed spacing', () => {
    const tip = BOUNDARY - 100;
    expect(
      reminderTimestampMs(
        wakeAt(66),
        144,
        { latestBlock: tip, secondsPerBlock: 10, mainnet: false },
        NOW,
      ),
    ).toBe(NOW + 166 * 10 * 1000);
  });

  test('without a chain tip the payload estimate stands, clamped', () => {
    expect(reminderTimestampMs(wakeAt(300), 144, { mainnet: true }, NOW)).toBe(
      (OPENS + 120 * TARGET_BLOCK_SPACING_SECONDS) * 1000,
    );
  });
});
