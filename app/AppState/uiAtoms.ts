// The app's lifecycle and modal UI state, held as named atoms. Toggling a modal
// or crossing a foreground/background edge writes one atom and wakes only its
// subscribers, without committing container state. The container is the only
// writer.

import type { ComponentProps } from 'react';
import { atom } from 'jotai';

import type NewAddressTag from '@ui/widgets/NewAddressTag';
import { AppStateStatusEnum } from './enums/AppStateStatusEnum';

// The foreground/background status the AppState listener reads as `prior` and
// writes on each transition. The container never reads it, so a fg/bg edge wakes
// only this atom's subscribers. This is the fg/bg blast radius. Seeded per
// instance in the container constructor.
export const appStateStatusAtom = atom<AppStateStatusEnum>(
  AppStateStatusEnum.unknown,
);

// What a launch of the "Add contact" sheet hands the form.
export type AddTagTarget = Pick<
  ComponentProps<typeof NewAddressTag>,
  'address' | 'swapChain' | 'initialLabel'
>;

// The "Add contact" sheet's launches. `launch` counts launches so far, on both
// arms. The host mounts one sheet instance per launch, keyed on that count,
// and the sheet's own dismissal ends it, so no arm names visibility.
export type AddTagModalState = { launch: number } & (
  { kind: 'none' } | ({ kind: 'launched' } & AddTagTarget)
);

export const addTagModalAtom = atom<AddTagModalState>({
  kind: 'none',
  launch: 0,
});

// The only transition: a launch for a target, numbered after the prior ones.
export const launchAddTagAtom = atom(null, (get, set, target: AddTagTarget) => {
  const prior = get(addTagModalAtom);
  set(addTagModalAtom, {
    kind: 'launched',
    launch: prior.launch + 1,
    ...target,
  });
});
