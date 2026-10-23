import { useEffect, useRef } from 'react';

// What a screen can ask another screen for. The asker names the request in
// the route params; the answering screen delivers under the same name.
export type Request =
  | 'send.address'
  | 'send.propose'
  | 'send.confirm'
  | 'send.contact'
  | 'addressbook.address'
  | 'receive.address'
  | 'receive.addressIndex'
  | 'swap.address';

type Listener = (value: string) => void;

const listeners = new Map<Request, Set<Listener>>();

// Hands a value to whoever is asking for it now. An answer nobody listens
// for any more (its asker unmounted, the session changed) is dropped, so it
// can never reach a later asker.
export const deliver = (request: Request, value: string): void => {
  listeners.get(request)?.forEach(listener => listener(value));
};

// Receives the answers to a request while the component is mounted. The
// latest `onValue` runs, so it may close over fresh state.
export const useResult = (
  request: Request,
  onValue: (value: string) => void,
): void => {
  const latest = useRef(onValue);
  latest.current = onValue;
  useEffect(() => {
    const listener: Listener = value => latest.current(value);
    let subscribed = listeners.get(request);
    if (!subscribed) {
      subscribed = new Set();
      listeners.set(request, subscribed);
    }
    subscribed.add(listener);
    return () => {
      subscribed.delete(listener);
    };
  }, [request]);
};
