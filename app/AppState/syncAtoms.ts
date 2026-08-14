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

import { RPCSyncStatusType } from '../walletBackend/types/RPCSyncStatusType';
import {
  type Epoch,
  type Observation,
  type SyncMachine,
  initialMachine,
  reconcile,
} from '../walletBackend/controller/syncController';

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

// Maps a scan snapshot to the poll observation the machine reconciles. A blank
// snapshot reads as `notLaunched` (idle); otherwise the scan percent drives the
// coarse sync state. saveRequired is carried forward — the poll payload that
// sets it is applied in the callback-boundary layer, so this preserves the
// machine's current value.
export const snapshotObservation = (
  epoch: Epoch,
  saveRequired: boolean,
  ss: RPCSyncStatusType,
): Observation => {
  if (!ss.scan_ranges || ss.scan_ranges.length === 0) {
    return { kind: 'poll', issuedEpoch: epoch, result: { kind: 'notLaunched' } };
  }
  const percent =
    ss.percentage_total_outputs_scanned ??
    ss.percentage_total_blocks_scanned ??
    0;
  return {
    kind: 'poll',
    issuedEpoch: epoch,
    result: { kind: 'complete', percent, saveRequired },
  };
};
