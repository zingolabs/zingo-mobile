/**
 * Builds a mocked wallet handle for the walletBackend suites: every method
 * is a lazily created jest.fn, and `events()` yields a stream stub whose
 * `next` ends the stream unless the suite queues events on it.
 */
import type { WalletInterface } from 'zingo-ffi';

export type MockEventStream = {
  next: jest.Mock;
  cancel: jest.Mock;
};

export type MockWallet = Record<string, jest.Mock> & {
  events: jest.Mock<MockEventStream, []>;
};

export function mockEventStream(): MockEventStream {
  return {
    next: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn(),
  };
}

export function mockWallet(stream: MockEventStream = mockEventStream()) {
  const methods: Record<PropertyKey, jest.Mock> = {
    events: jest.fn(() => stream),
    runningJobKind: jest.fn(() => undefined),
  };
  const wallet = new Proxy(methods, {
    get: (target, prop) =>
      prop === 'then' ? undefined : (target[prop] ??= jest.fn()),
  });
  return {
    wallet: wallet as unknown as MockWallet,
    handle: wallet as unknown as WalletInterface,
    stream,
  };
}

export function installMockWallet(stream?: MockEventStream) {
  const built = mockWallet(stream);
  const { currentWallet } = require('zingo-ffi') as {
    currentWallet: jest.Mock;
  };
  currentWallet.mockReturnValue(built.handle);
  return built;
}
