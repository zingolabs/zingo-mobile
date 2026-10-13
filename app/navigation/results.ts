import { useEffect, useRef } from 'react';

// What a screen can ask another screen for. The asker names the request in
// the route params; the answering screen delivers under the same name.
export type Request =
  | 'send.address'
  | 'send.propose'
  | 'send.confirm'
  | 'addressbook.address'
  | 'receive.address'
  | 'receive.addressIndex';

type Listener = (value: string) => void;

const listeners = new Map<Request, Set<Listener>>();
// An answer that arrived before its asker subscribed waits for it.
const waiting = new Map<Request, string>();

// Hands a value to whoever asked for it, now or when it subscribes.
export const deliver = (request: Request, value: string): void => {
  const subscribed = listeners.get(request);
  if (subscribed && subscribed.size > 0) {
    subscribed.forEach(listener => listener(value));
    return;
  }
  waiting.set(request, value);
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
    const early = waiting.get(request);
    if (early !== undefined) {
      waiting.delete(request);
      listener(early);
    }
    return () => {
      subscribed.delete(listener);
    };
  }, [request]);
};
