import { createStore } from 'jotai';
import type { PrimitiveAtom } from 'jotai';

export type Store = ReturnType<typeof createStore>;

export type Seed = (store: Store) => void;

// A seed that sets one atom to one value in whichever store it runs against.
export const seed =
  <V>(atom: PrimitiveAtom<V>, value: V): Seed =>
  store =>
    store.set(atom, value);

// A fresh store with every seed applied in order.
export const storeWith = (...seeds: Seed[]): Store => {
  const store = createStore();
  seeds.forEach(apply => apply(store));
  return store;
};
