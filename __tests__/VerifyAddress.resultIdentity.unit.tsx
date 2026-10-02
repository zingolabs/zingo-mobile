import 'react-native';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { ChainNameEnum, ScreenEnum, remoteServer } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import VerifyAddress from '@screens/Receive/components/VerifyAddress';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

const owned =
  'zs17xwek7t788enw3zc88d5e54s4tz006uv5yclzet8c3z6j423ymfu98c5u0thd6zp4e6p2jumnna';
const other =
  'zs14mccpahrfc65hzy0sxntz04rxmwm0fnmkzdqu68f608m8ysssv028g5khgy6jgsxplfckyxhys5';
const valid = JSON.stringify({
  status: 'success',
  chain_name: 'main',
  address_kind: 'sapling',
});
const ownership = (address: string, isOwned: boolean) =>
  JSON.stringify({
    is_wallet_address: isOwned,
    account_id: 0,
    address_type: 'sapling',
    encoded_address: address,
  });

function deferred() {
  let release: (answer: string) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<string>((resolve, rejectPromise) => {
    release = resolve;
    reject = rejectPromise;
  });
  return { promise, release, reject };
}

function setup() {
  const snack = jest.fn();
  const initial = {
    ...defaultAppContextLoaded,
    translate: (key: string) => key,
    addLastSnackbar: snack,
    server: remoteServer(
      'https://fixture.invalid',
      ChainNameEnum.mainChainName,
    ),
  };
  const screen = (context = initial) => (
    <ContextAppLoadedProvider value={context}>
      <VerifyAddress
        closeSheet={jest.fn()}
        screenName={ScreenEnum.Receive}
        navigation={mockNavigation}
      />
    </ContextAppLoadedProvider>
  );
  const view = render(screen());
  return {
    ...view,
    initial,
    screen,
    snack,
    field: () => view.getByTestId('send.addressplaceholder'),
    async enter(address: string) {
      await act(async () => {
        fireEvent.changeText(
          view.getByTestId('send.addressplaceholder'),
          address,
        );
      });
    },
    async verify() {
      await waitFor(() => expect(view.getByText('verify')).toBeEnabled());
      await act(async () => {
        fireEvent.press(view.getByText('verify'));
      });
    },
    async finish(request: ReturnType<typeof deferred>, response: string) {
      await act(async () => request.release(response));
    },
  };
}

function mockNativeAnswers() {
  jest.resetAllMocks();
  jest.mocked(RPCModule.parseAddressInfo).mockResolvedValue(valid);
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockImplementation(async address => ownership(address, address === owned));
}

// Loads React Native's lazily required components before the timed tests.
beforeAll(async () => {
  mockNativeAnswers();
  const warm = setup();
  await warm.enter(owned);
  warm.unmount();
}, 30000);

beforeEach(() => {
  mockNativeAnswers();
});

test('Tests that current ownership is displayed when verification succeeds.', async () => {
  const h = setup();
  await h.enter(owned);
  await h.verify();
  expect(h.getByText('receive.verification-success')).toBeTruthy();
  expect(RPCModule.checkMyAddressInfo).toHaveBeenCalledWith(owned);
});

test('Tests that current external ownership is displayed when verification succeeds.', async () => {
  const h = setup();
  await h.enter(other);
  await h.verify();
  expect(h.getByText('receive.verification-failure')).toBeTruthy();
  expect(h.queryByText('receive.verification-success')).toBeNull();
});

test.each([other, ''])(
  'Tests that ownership success clears when the address changes to %s.',
  async address => {
    const h = setup();
    await h.enter(owned);
    await h.verify();
    await h.enter(address);
    expect(h.field().props.value).toBe(address);
    expect(h.queryByText('receive.verification-success')).toBeNull();
  },
);

test('Tests that ownership failure clears when the address is replaced.', async () => {
  const h = setup();
  await h.enter(other);
  await h.verify();
  await h.enter(owned);
  expect(h.queryByText('receive.verification-failure')).toBeNull();
  await h.verify();
  expect(h.getByText('receive.verification-success')).toBeTruthy();
});

test('Tests that an old ownership result is ignored when a newer address has been verified.', async () => {
  const pending = deferred();
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockReturnValueOnce(pending.promise);
  const h = setup();
  await h.enter(owned);
  await h.verify();
  await h.enter(other);
  await h.verify();
  await h.finish(pending, ownership(owned, true));
  expect(h.field().props.value).toBe(other);
  expect(h.queryByText('receive.verification-success')).toBeNull();
  expect(h.getByText('receive.verification-failure')).toBeTruthy();
});

test('Tests that an old ownership error is ignored when the input has changed.', async () => {
  const pending = deferred();
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockReturnValueOnce(pending.promise);
  const h = setup();
  await h.enter(owned);
  await h.verify();
  await h.enter(other);
  await act(async () => pending.reject(new Error('old ownership failure')));
  expect(h.snack).not.toHaveBeenCalled();
  expect(h.getByText('verify')).toBeEnabled();
});

test('Tests that current ownership errors remain visible when verification fails.', async () => {
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockRejectedValueOnce(new Error('current ownership failure'));
  const h = setup();
  await h.enter(owned);
  await h.verify();
  expect(h.snack).toHaveBeenCalledWith(
    expect.stringContaining('current ownership failure'),
    expect.anything(),
  );
  expect(h.getByText(/current ownership failure/)).toBeTruthy();
  expect(h.queryByText('receive.verification-success')).toBeNull();
});

test('Tests that URI input is verified using its address when parsing succeeds.', async () => {
  const h = setup();
  await h.enter(`zcash:${owned}?amount=1&memo=aGk`);
  expect(h.field().props.value).toBe(owned);
  await h.verify();
  expect(RPCModule.checkMyAddressInfo).toHaveBeenCalledWith(owned);
  expect(h.getByText('receive.verification-success')).toBeTruthy();
});

test('Tests that malformed URI input retains the displayed address when parsing fails.', async () => {
  const h = setup();
  await h.enter(other);
  await h.enter(`zcash:${owned}?amount=-1`);
  expect(h.field().props.value).toBe(other);
  expect(h.snack).toHaveBeenCalledWith(expect.stringContaining('uris.amount'));
});

test('Tests that verification is invalidated immediately when URI parsing starts.', async () => {
  const h = setup();
  await h.enter(owned);
  await h.verify();
  const pending = deferred();
  jest.mocked(RPCModule.parseAddressInfo).mockReturnValueOnce(pending.promise);
  await h.enter(`zcash:${other}`);
  expect(h.queryByText('receive.verification-success')).toBeNull();
  expect(h.getByText('verify')).toBeDisabled();
  await h.finish(pending, valid);
  expect(h.field().props.value).toBe(other);
  await h.verify();
  expect(h.getByText('receive.verification-failure')).toBeTruthy();
});

test('Tests that pending ownership cannot certify the retained address when a malformed URI is entered.', async () => {
  const pending = deferred();
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockReturnValueOnce(pending.promise);
  const h = setup();
  await h.enter(owned);
  await h.verify();
  await h.enter(`zcash:${other}?amount=-1`);
  await h.finish(pending, ownership(owned, true));
  expect(h.field().props.value).toBe(owned);
  expect(h.queryByText('receive.verification-success')).toBeNull();
  await h.verify();
  expect(h.getByText('receive.verification-success')).toBeTruthy();
});

test.each([other, ''])(
  'Tests that stale URI parsing cannot replace the field when input changes to %s.',
  async address => {
    const h = setup();
    const pending = deferred();
    jest
      .mocked(RPCModule.parseAddressInfo)
      .mockReturnValueOnce(pending.promise);
    await h.enter(`zcash:${owned}`);
    await h.enter(address);
    await h.finish(pending, valid);
    expect(h.field().props.value).toBe(address);
  },
);

test('Tests that a stale URI error stays silent when a newer URI has succeeded.', async () => {
  const h = setup();
  const pending = deferred();
  jest.mocked(RPCModule.parseAddressInfo).mockReturnValueOnce(pending.promise);
  await h.enter(`zcash:${owned}?amount=-1`);
  await h.enter(`zcash:${other}`);
  await h.finish(pending, valid);
  expect(h.field().props.value).toBe(other);
  expect(h.snack).not.toHaveBeenCalled();
});

test('Tests that pending ownership is ignored when the network changes.', async () => {
  const pending = deferred();
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockReturnValueOnce(pending.promise);
  const h = setup();
  await h.enter(owned);
  await h.verify();
  h.rerender(
    h.screen({
      ...h.initial,
      server: remoteServer(
        'https://test.fixture.invalid',
        ChainNameEnum.testChainName,
      ),
    }),
  );
  await h.finish(pending, ownership(owned, true));
  expect(h.queryByText('receive.verification-success')).toBeNull();
});

test('Tests that pending errors stay silent when verification has unmounted.', async () => {
  const pending = deferred();
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockReturnValueOnce(pending.promise);
  const h = setup();
  await h.enter(owned);
  await h.verify();
  h.unmount();
  await act(async () => pending.reject(new Error('closed verification')));
  expect(h.snack).not.toHaveBeenCalled();
});

test('Tests that completed ownership clears when the network changes.', async () => {
  const h = setup();
  await h.enter(owned);
  await h.verify();
  h.rerender(
    h.screen({
      ...h.initial,
      server: remoteServer(
        'https://test.fixture.invalid',
        ChainNameEnum.testChainName,
      ),
    }),
  );
  expect(h.queryByText('receive.verification-success')).toBeNull();
});

test('Tests that a pending URI cannot replace the field when the network changes.', async () => {
  const h = setup();
  await h.enter(other);
  const pending = deferred();
  jest.mocked(RPCModule.parseAddressInfo).mockReturnValueOnce(pending.promise);
  await h.enter(`zcash:${owned}`);
  h.rerender(
    h.screen({
      ...h.initial,
      server: remoteServer(
        'https://test.fixture.invalid',
        ChainNameEnum.testChainName,
      ),
    }),
  );
  await h.finish(pending, valid);
  expect(h.field().props.value).toBe(other);
});

test('Tests that a pending URI error stays silent when the sheet has unmounted.', async () => {
  const h = setup();
  const pending = deferred();
  jest.mocked(RPCModule.parseAddressInfo).mockReturnValueOnce(pending.promise);
  await h.enter(`zcash:${owned}?amount=-1`);
  h.unmount();
  await h.finish(pending, valid);
  expect(h.snack).not.toHaveBeenCalled();
});

test('Tests that pending ownership cannot restore success when the sheet is cancelled.', async () => {
  const pending = deferred();
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockReturnValueOnce(pending.promise);
  const h = setup();
  await h.enter(owned);
  await h.verify();
  fireEvent.press(h.getByText('cancel'));
  await h.finish(pending, ownership(owned, true));
  expect(h.field().props.value).toBe('');
  expect(h.queryByText('receive.verification-success')).toBeNull();
});

test('Tests that malformed ownership responses clear previous assurance when verification is retried.', async () => {
  const h = setup();
  await h.enter(owned);
  await h.verify();
  jest
    .mocked(RPCModule.checkMyAddressInfo)
    .mockResolvedValueOnce('invalid json');
  await h.verify();
  expect(h.queryByText('receive.verification-success')).toBeNull();
  expect(h.snack).toHaveBeenCalled();
});
