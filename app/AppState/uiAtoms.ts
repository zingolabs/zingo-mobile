// The app's lifecycle and modal UI state, held as named atoms. Toggling a modal
// or crossing a foreground/background edge writes one atom and wakes only its
// subscribers, without committing container state. The container is the only
// writer.

import { atom } from 'jotai';

import { AppStateStatusEnum } from './enums/AppStateStatusEnum';

// The foreground/background status the AppState listener reads as `prior` and
// writes on each transition. The container never reads it, so a fg/bg edge wakes
// only this atom's subscribers. This is the fg/bg blast radius. Seeded per
// instance in the container constructor.
export const appStateStatusAtom = atom<AppStateStatusEnum>(
  AppStateStatusEnum.unknown,
);

// Whether the Seed screen's modal is open. The Seed screen clears it on close;
// opening the modal writes only this atom, not container state.
export const seedModalOpenAtom = atom<boolean>(false);

export type AddTagTarget = {
  // Counts launches. Each launch is a new form, whatever its address: the
  // host keys the form on this number.
  launch: number;
  address: string;
  swapChain: string;
  initialLabel?: string;
};

// The shared "Add contact" BottomSheet's target, as a discriminated union so
// the hidden case names itself rather than riding a null. launchAddTagModal
// writes `shown`, and the modal host reads it.
export type AddTagModalState =
  { kind: 'hidden'; launch: number } | ({ kind: 'shown' } & AddTagTarget);

export const addTagModalAtom = atom<AddTagModalState>({
  kind: 'hidden',
  launch: 0,
});
