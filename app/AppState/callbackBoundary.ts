// The callback-boundary epoch, the container half of the ADR 0005 epoch
// invariant. A backend callback that resolves after its container is gone used
// to setState a dead instance; here every such write is stamped with the epoch
// it was issued under and dropped when that epoch is stale — the same shape
// reconcile uses to drop a stale poll.
//
// This is a separate counter from SyncCoordinator.controllerEpoch. That one
// bumps on foreground resume and changeServer while the container stays mounted;
// this one has one transition, the container's teardown, so a write issued under
// the mount epoch is current for the instance's whole life and stale only once
// it is torn down.

import { atom } from 'jotai';

import type { Epoch } from '../walletBackend/controller/syncController';

// The boundary epoch. Only the container writes it: it bumps once, at teardown.
export const callbackEpochAtom = atom<Epoch>(0);

export type BoundaryWrite = { issuedEpoch: Epoch; write: () => void };

// Write-only. The single guarded seam the container's backend-callback setters
// dispatch through: it runs the write only while the epoch it was issued under
// is still current, so the drop rule lives in one place, not scattered across
// the setters.
export const boundaryDispatchAtom = atom(
  null,
  (get, _set, action: BoundaryWrite) => {
    if (action.issuedEpoch === get(callbackEpochAtom)) {
      action.write();
    }
  },
);
