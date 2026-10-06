import { renderHook } from '@testing-library/react-native';

import { useSyncStatus } from '@app/hooks/useSyncStatus';
import { snapshotObservation } from '@app/AppState/syncAtoms';
import {
  initialMachine,
  reconcile,
} from '@app/walletBackend/controller/syncController';
import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';

const header = (ss: RPCSyncStatusType) =>
  renderHook(() => useSyncStatus({ syncingStatus: ss, noSyncingStatus: false }))
    .result.current;

const machineSync = (ss: RPCSyncStatusType) =>
  reconcile(initialMachine(''), snapshotObservation(0, false, ss)).sync;

describe('sync status projections', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each<[string, RPCSyncStatusType]>([
    ['blank', {}],
    ['empty scan ranges', { scan_ranges: [] }],
    [
      'zero outputs scanned',
      {
        scan_ranges: [{} as never],
        percentage_total_outputs_scanned: 0,
        percentage_total_blocks_scanned: 12,
      },
    ],
    [
      'mid scan',
      { scan_ranges: [{} as never], percentage_total_outputs_scanned: 42 },
    ],
    [
      'at the tip',
      { scan_ranges: [{} as never], percentage_total_outputs_scanned: 100 },
    ],
  ])(
    'Tests that the header and the sync machine report one sync state when the snapshot is %s.',
    (_label, ss) => {
      const { syncInProgress, percentageOutputsScanned } = header(ss);

      expect(machineSync(ss)).toEqual(
        syncInProgress
          ? { kind: 'syncing', percent: percentageOutputsScanned }
          : { kind: 'idle' },
      );
    },
  );
});
