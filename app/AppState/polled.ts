// A value learned from the native runtime's poll, awaiting until the first result lands.
export type Polled<T> = { kind: 'awaiting' } | { kind: 'polled'; latest: T };
