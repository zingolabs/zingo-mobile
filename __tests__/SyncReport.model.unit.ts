import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { RPCSyncScanRangePriorityStatusEnum as Priority } from '@app/walletBackend/enums/RPCSyncScanRangePriorityStatusEnum';
import {
  heights,
  MAP_CELLS,
  mapCells,
  phase,
  scaleMax,
} from '@screens/SyncReport/syncModel';

const status = (ranges: [Priority, number, number][]): RPCSyncStatusType => ({
  scan_ranges: ranges.map(([priority, start_block, end_block]) => ({
    priority,
    start_block,
    end_block,
  })),
});

const BIRTHDAY = 1000;
const TIP = 1180;

test('Tests that the wallet height counts scanned and refetching blocks when a sync is still running.', () => {
  const h = heights(
    status([
      [Priority.Scanned, 1000, 1060],
      [Priority.RefetchingNullifiers, 1060, 1090],
      [Priority.Historic, 1090, 1170],
      [Priority.ChainTip, 1170, 1180],
    ]),
    BIRTHDAY,
    TIP,
    false,
  );
  expect(h).toEqual({ server: 1180, wallet: 1090, behind: 90, scanned: 90 });
});

test('Tests that the wallet sits at the tip when the wallet is synced.', () => {
  expect(heights(status([]), BIRTHDAY, TIP, true)).toEqual({
    server: 1180,
    wallet: 1180,
    behind: 0,
    scanned: 180,
  });
});

test('Tests that the phase follows the most urgent range waiting when ranges of several priorities remain.', () => {
  expect(
    phase(
      status([
        [Priority.Historic, 0, 1],
        [Priority.ChainTip, 1, 2],
      ]),
      false,
    ),
  ).toBe('tip');
  expect(
    phase(
      status([
        [Priority.Historic, 0, 1],
        [Priority.FoundNote, 1, 2],
      ]),
      false,
    ),
  ).toBe('notes');
  expect(phase(status([[Priority.Historic, 0, 1]]), false)).toBe('historic');
  expect(phase(status([[Priority.Verify, 0, 1]]), true)).toBe('done');
});

test('Tests that each map cell takes the state of the range under its middle block when ranges split the span.', () => {
  const cells = mapCells(
    status([
      [Priority.Scanned, 1000, 1090],
      [Priority.Scanning, 1090, 1120],
      [Priority.Historic, 1120, 1180],
    ]),
    BIRTHDAY,
    TIP,
    false,
  );
  expect(cells).toHaveLength(MAP_CELLS);
  expect(cells[0]).toBe('scanned');
  expect(cells[89]).toBe('scanned');
  expect(cells[90]).toBe('scanning');
  expect(cells[MAP_CELLS - 1]).toBe('low');
});

test('Tests that the timeline ends a little past the tip on a 100k boundary when the tip is mid-range.', () => {
  expect(scaleMax(3_514_598)).toBe(3_600_000);
});
