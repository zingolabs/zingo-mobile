// The Jotai holder for the sync slice. The live poll path routes through the
// pure controller: the container feeds each scan snapshot to `observeAtom`,
// which reconciles it into `syncMachineAtom`. The detailed snapshot rides its
// own `syncStatusAtom`, the read surface the two sync consumers (Header,
// SyncReport) subscribe to, so a sync tick wakes only them.
//
// Command issuance (issueCommand) and the epoch unification with
// SyncCoordinator.controllerEpoch live in the callback-boundary layer. This
// module holds the machine and drives its observe path.

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
