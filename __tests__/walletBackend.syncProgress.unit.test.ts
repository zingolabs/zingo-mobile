import { ScanPriority, SyncStatus } from 'zingo-ffi';
import {
  IDLE_SYNC_STATUS,
  clampPercentage,
  hasSyncStatus,
  scanInProgress,
} from '@app/walletBackend/utils/syncProgress';

const scanning = (percentage: number): SyncStatus => ({
  ...IDLE_SYNC_STATUS,
  scanRanges: [
    { priority: ScanPriority.Scanning, startBlock: 1, endBlock: 100 },
  ],
  percentageTotalOutputsScanned: percentage,
});

describe('scanInProgress', () => {
  test('Tests that the idle status reads as not scanning when no ranges exist', () => {
    expect(hasSyncStatus(IDLE_SYNC_STATUS)).toBe(false);
    expect(scanInProgress(IDLE_SYNC_STATUS)).toBe(false);
  });

  test('Tests that a scan short of the tip reads as in progress when a range is open', () => {
    expect(scanInProgress(scanning(40))).toBe(true);
    expect(scanInProgress(scanning(0))).toBe(true);
  });

  test('Tests that a scan reads as done when the outputs reach the tip', () => {
    expect(scanInProgress(scanning(100))).toBe(false);
  });
});

describe('clampPercentage', () => {
  test('Tests that a percentage stays inside the visible band when it is nearly done or barely started', () => {
    expect(clampPercentage(0.001)).toBe(0.01);
    expect(clampPercentage(99.999)).toBe(99.99);
    expect(clampPercentage(100)).toBe(100);
    expect(clampPercentage(0)).toBe(0);
    expect(clampPercentage(42.4242)).toBe(42.42);
  });
});
