/**
 * @format
 */

import {
  TARGET_BLOCK_SPACING_SECONDS,
  estimatedTimestampMs,
  foldBlockSpacing,
  windowTargetHeight,
} from '../app/AppState';
import { RPCBroadcastWindowType } from '../app/walletBackend/types/RPCMigrationStatusType';

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
