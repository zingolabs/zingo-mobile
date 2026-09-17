/**
 * The shared event pump: the first subscriber opens the stream, every
 * event fans out to all listeners, the last unsubscribe cancels the stream,
 * and a closed wallet leaves subscribers idle.
 */
import { currentWallet, WalletEvent } from 'zingo-ffi';
import { subscribeWalletEvents } from '@app/walletBackend/events';
import { installMockWallet, mockEventStream } from '../__mocks__/mockWallet';

const mockedCurrentWallet = currentWallet as jest.Mock;

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

const lagged = (missed: bigint) => new WalletEvent.Lagged({ missed });

afterEach(() => {
  jest.clearAllMocks();
  mockedCurrentWallet.mockReset();
});

describe('subscribeWalletEvents', () => {
  test('Tests that every listener receives each event when the stream yields', async () => {
    const stream = mockEventStream();
    stream.next
      .mockResolvedValueOnce(lagged(1n))
      .mockResolvedValueOnce(lagged(2n))
      .mockResolvedValue(undefined);
    const { wallet } = installMockWallet(stream);
    const first = jest.fn();
    const second = jest.fn();

    const unsubscribeFirst = subscribeWalletEvents(first);
    const unsubscribeSecond = subscribeWalletEvents(second);
    await flushPromises();

    expect(wallet.events).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    expect(first.mock.calls[1][0].inner.missed).toBe(2n);
    unsubscribeFirst();
    unsubscribeSecond();
  });

  test('Tests that the stream is cancelled when the last subscriber leaves', async () => {
    const stream = mockEventStream();
    stream.next.mockReturnValue(new Promise(() => {}));
    installMockWallet(stream);

    const unsubscribeFirst = subscribeWalletEvents(jest.fn());
    const unsubscribeSecond = subscribeWalletEvents(jest.fn());
    unsubscribeFirst();
    expect(stream.cancel).not.toHaveBeenCalled();
    unsubscribeSecond();
    expect(stream.cancel).toHaveBeenCalledTimes(1);
  });

  test('Tests that a listener added later still receives events when the pump is running', async () => {
    const stream = mockEventStream();
    let release!: (event: WalletEvent | undefined) => void;
    stream.next
      .mockImplementationOnce(
        () =>
          new Promise<WalletEvent | undefined>(resolve => {
            release = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    installMockWallet(stream);

    const unsubscribeFirst = subscribeWalletEvents(jest.fn());
    const late = jest.fn();
    const unsubscribeLate = subscribeWalletEvents(late);
    release(lagged(3n));
    await flushPromises();

    expect(late).toHaveBeenCalledTimes(1);
    unsubscribeFirst();
    unsubscribeLate();
  });

  test('Tests that a rejected next ends the pump quietly when the stream breaks', async () => {
    const stream = mockEventStream();
    stream.next.mockRejectedValue(new Error('stream closed'));
    installMockWallet(stream);
    const listener = jest.fn();

    const unsubscribe = subscribeWalletEvents(listener);
    await flushPromises();

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('Tests that subscribing opens no stream when no wallet is open', () => {
    mockedCurrentWallet.mockReturnValue(undefined);
    const unsubscribe = subscribeWalletEvents(jest.fn());
    expect(mockedCurrentWallet).toHaveBeenCalled();
    unsubscribe();
  });

  test('Tests that the pump rebinds to the new wallet when a subscriber arrives after a wallet change', async () => {
    const firstStream = mockEventStream();
    firstStream.next.mockReturnValue(new Promise(() => {}));
    installMockWallet(firstStream);
    const unsubscribeFirst = subscribeWalletEvents(jest.fn());

    const secondStream = mockEventStream();
    secondStream.next.mockReturnValue(new Promise(() => {}));
    const { wallet: secondWallet } = installMockWallet(secondStream);
    const unsubscribeSecond = subscribeWalletEvents(jest.fn());

    expect(firstStream.cancel).toHaveBeenCalledTimes(1);
    expect(secondWallet.events).toHaveBeenCalledTimes(1);
    unsubscribeFirst();
    unsubscribeSecond();
  });
});
