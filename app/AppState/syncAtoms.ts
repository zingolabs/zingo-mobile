// The Jotai holder for the sync slice. The container publishes each scan
// snapshot to `syncStatusAtom`, the read surface of the two sync consumers
// (Header, SyncReport), so a sync tick wakes only them. The controller machine
// below has no production reader yet, so nothing feeds it.

import { atom } from 'jotai';

import { RPCSyncStatusType } from '@app/walletBackend/types/RPCSyncStatusType';
import { scanProgress } from '@app/walletBackend/utils/syncProgress';
import {
  type Epoch,
  type Observation,
  type SyncMachine,
  initialMachine,
  reconcile,
} from '@app/walletBackend/controller/syncController';

// The detailed scan snapshot. Only the container writes it; Header and
// SyncReport read it. An empty object is the blank snapshot.
export const syncStatusAtom = atom<RPCSyncStatusType>({});

// The controller machine, held. Seeded per instance in the container.
export const syncMachineAtom = atom<SyncMachine>(initialMachine(''));

// The one writer of the machine. reconcile is total, so a stale-epoch
// observation drops unread.
export const observeAtom = atom(null, (get, set, obs: Observation) => {
  set(syncMachineAtom, reconcile(get(syncMachineAtom), obs));
});

// Maps a scan snapshot to the poll observation the machine reconciles, through the same projection the header reads.
export const snapshotObservation = (
  epoch: Epoch,
  saveRequired: boolean,
  ss: RPCSyncStatusType,
): Observation => {
  const progress = scanProgress(ss);
  return {
    kind: 'poll',
    issuedEpoch: epoch,
    result:
      progress.kind === 'scanning'
        ? { kind: 'complete', percent: progress.percent, saveRequired }
        : { kind: 'notLaunched' },
  };
};
