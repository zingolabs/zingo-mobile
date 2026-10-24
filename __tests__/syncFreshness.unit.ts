import {
  BEHIND_MS,
  getFreshness,
  isFallingBehind,
  noteHeights,
  resetFreshness,
} from '@app/walletBackend/utils/syncFreshness';

const NOW = 1_000_000_000;

beforeEach(() => resetFreshness());

describe('syncFreshness', () => {
  test('Tests that the moment moves when the wallet reaches the tip', () => {
    noteHeights(100, 100, NOW);
    expect(getFreshness().caughtUpAtMs).toBe(NOW);
    noteHeights(101, 101, NOW + 75_000);
    expect(getFreshness().caughtUpAtMs).toBe(NOW + 75_000);
  });

  test('Tests that the moment stays when the wallet trails the tip', () => {
    noteHeights(100, 100, NOW);
    noteHeights(100, 103, NOW + 60_000);
    expect(getFreshness().caughtUpAtMs).toBe(NOW);
  });

  test('Tests that a missing server height keeps the last moment when the server cannot be read', () => {
    noteHeights(100, 100, NOW);
    noteHeights(100, 0, NOW + 60_000);
    expect(getFreshness().caughtUpAtMs).toBe(NOW);
    expect(isFallingBehind(getFreshness(), NOW + BEHIND_MS * 2)).toBe(false);
  });

  test('Tests that falling behind needs both the gap and the time when the sync stalls', () => {
    noteHeights(100, 100, NOW);
    noteHeights(100, 103, NOW + 60_000);
    expect(isFallingBehind(getFreshness(), NOW + 60_000)).toBe(false);
    expect(isFallingBehind(getFreshness(), NOW + BEHIND_MS)).toBe(true);
  });

  test('Tests that a wallet never seen at the tip is not falling behind when its first sync runs', () => {
    noteHeights(50, 100, NOW);
    expect(isFallingBehind(getFreshness(), NOW + BEHIND_MS * 2)).toBe(false);
  });
});
