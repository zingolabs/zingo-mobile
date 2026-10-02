jest.mock('@ui/widgets/priceFetcherStore', () => ({
  __esModule: true,
  PRICE_REFRESH_MAX_MS: 75_000,
  PRICE_STALE_MS: 75_000 + 30_000,
  priceFetcherStore: {
    setDeps: jest.fn(),
    attach: jest.fn(() => () => {}),
    subscribe: jest.fn(() => () => {}),
    snapshot: jest.fn(() => ({
      loading: false,
      nextFetchAt: 0,
      nextFetchDelayMs: 0,
      surfaceActive: false,
    })),
    foregroundReturned: jest.fn(),
    fetch: jest.fn(),
  },
  usePriceFetcherStore: jest.fn(() => ({
    loading: false,
    nextFetchAt: 0,
    nextFetchDelayMs: 0,
    surfaceActive: false,
  })),
  usePriceHealth: jest.fn(() => 'live'),
}));

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/uris', () => ({
  ...jest.requireActual('@app/uris'),
  fetchServerList: jest.fn(),
}));

jest.mock('@app/services/selectingServer', () => ({
  __esModule: true,
  default: jest.fn(),
}));

/**
 * The Confirm screen holds the confirm handler of the render that opened it.
 * These tests change the app state after that render and then confirm.
 */

import 'react-native';
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import Send from '@screens/Send';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  ChainNameEnum,
  RouteEnum,
  SendPageStateClass,
  ToAddrClass,
  offlineServer,
} from '@app/AppState';
import type { TranslateType } from '@app/AppState';
import { errorKeyed } from '@app/AppState/types/Result';
import { AppDrawerParamList } from '@app/types';
import { fetchServerList } from '@app/uris';
import Utils from '@app/utils';
import RPCModule from '@app/RPCModule';
import {
  SendPermitInputs,
  sendPermit,
} from '@app/walletBackend/transforms/sendPermit';
import { ABSENT_MIXNET_VIEW } from '@app/walletBackend/transforms/mixnetView';
import { mixnetLost, mixnetReady } from '../.storybook/storyMocks';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';

const FEE_ZATOSHIS = 10_000;
const SPENDABLE_ZATOSHIS = 100_000_000;
const proposeMock = RPCModule.sendProcess as jest.Mock;
const spendableMock = RPCModule.getSpendableBalanceWithAddressInfo as jest.Mock;
const navigate = mockNavigation.navigate as jest.Mock;

const sendPageState = new SendPageStateClass(new ToAddrClass(0));
sendPageState.toaddr.to = 'UA-12345678901234567890';
sendPageState.toaddr.amount = '0.1';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Send
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Send,
      params: undefined,
    },
  };
}

const translate = (key: string): TranslateType => key;

const online: SendPermitInputs = {
  netInfo: {
    isConnected: true,
    type: NetInfoStateType.wifi,
    isConnectionExpensive: false,
  },
  server: mockServer,
  mixnetView: mixnetReady,
};

// The state that LoadedApp holds. `sendPermitNow` reads it at call time.
let appState = online;

const sendUi = (
  inputs: SendPermitInputs,
  sendTransaction: jest.Mock,
  addLastSnackbar: jest.Mock,
) => {
  appState = inputs;
  const state = { ...defaultAppContextLoaded };
  state.valueTransfers = mockValueTransfers;
  state.addresses = mockAddresses;
  state.translate = translate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.sendPageState = sendPageState;
  state.addLastSnackbar = addLastSnackbar;
  state.server = inputs.server;
  state.netInfo = inputs.netInfo;
  state.mixnetView = inputs.mixnetView;
  state.sendPermitNow = () => sendPermit(appState);
  return (
    <ContextAppLoadedProvider value={state}>
      <Send
        {...makeDrawerProps()}
        sendTransaction={sendTransaction}
        clearToAddr={jest.fn()}
        toggleMenuDrawer={jest.fn()}
        setShieldingAmount={jest.fn()}
        setScrollToTop={jest.fn()}
        setScrollToBottom={jest.fn()}
        setServerOption={jest.fn()}
      />
    </ContextAppLoadedProvider>
  );
};

// Presses Send on a valid form and returns the handler that the Confirm
// screen received.
const openConfirmScreen = async (view: ReturnType<typeof render>) => {
  const sendButton = await waitFor(() => view.getByTestId('send.button'));
  fireEvent.press(sendButton);
  const confirmCall = await waitFor(() => {
    const call = navigate.mock.calls.find(
      ([route]) => route === RouteEnum.Confirm,
    );
    expect(call).toBeDefined();
    return call;
  });
  return confirmCall[1].confirmSend as (
    state: SendPageStateClass,
  ) => Promise<void>;
};

beforeEach(() => {
  jest.clearAllMocks();
  (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  jest
    .spyOn(Utils, 'isValidAddress')
    .mockResolvedValue({ isValid: true, shieldedOnlyUA: '' });
  proposeMock.mockResolvedValue(JSON.stringify({ fee: FEE_ZATOSHIS }));
  spendableMock.mockResolvedValue(
    JSON.stringify({ spendable_balance: SPENDABLE_ZATOSHIS }),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

const sent = { kind: 'sent', receipt: 'txid' };

describe('Send confirm send permit', () => {
  test('Tests that confirming does not send when the transport dies while the Confirm screen is open. The screen opened on a ready view.', async () => {
    const sendTransaction = jest.fn().mockResolvedValue(sent);
    const addLastSnackbar = jest.fn();
    const view = render(sendUi(online, sendTransaction, addLastSnackbar));
    const confirmSend = await openConfirmScreen(view);

    view.rerender(
      sendUi(
        { ...online, mixnetView: mixnetLost },
        sendTransaction,
        addLastSnackbar,
      ),
    );
    await confirmSend(sendPageState);

    expect(sendTransaction).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('send.nym-blocked');
  });

  test('Tests that confirming does not send when the device disconnects while the Confirm screen is open. The screen opened on a connected device.', async () => {
    const sendTransaction = jest.fn().mockResolvedValue(sent);
    const addLastSnackbar = jest.fn();
    const view = render(sendUi(online, sendTransaction, addLastSnackbar));
    const confirmSend = await openConfirmScreen(view);

    view.rerender(
      sendUi(
        { ...online, netInfo: { ...online.netInfo, isConnected: false } },
        sendTransaction,
        addLastSnackbar,
      ),
    );
    await confirmSend(sendPageState);

    expect(sendTransaction).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('loadedapp.connection-error');
  });

  test('Tests that confirming does not send when the server goes offline while the Confirm screen is open. The screen opened on a remote server.', async () => {
    const sendTransaction = jest.fn().mockResolvedValue(sent);
    const addLastSnackbar = jest.fn();
    const view = render(sendUi(online, sendTransaction, addLastSnackbar));
    const confirmSend = await openConfirmScreen(view);

    view.rerender(
      sendUi(
        { ...online, server: offlineServer(ChainNameEnum.mainChainName) },
        sendTransaction,
        addLastSnackbar,
      ),
    );
    await confirmSend(sendPageState);

    expect(sendTransaction).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('loadedapp.connection-error');
  });

  test('Tests that the Computing screen reports the refusal when the retry on another server is refused. The first attempt fails with a server error.', async () => {
    (fetchServerList as jest.Mock).mockResolvedValue([]);
    const sendTransaction = jest
      .fn()
      .mockRejectedValueOnce('Error: server unreachable')
      .mockResolvedValueOnce(errorKeyed('send.nym-blocked'));
    const view = render(sendUi(online, sendTransaction, jest.fn()));
    const confirmSend = await openConfirmScreen(view);

    await confirmSend(sendPageState);

    expect(sendTransaction).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenLastCalledWith(RouteEnum.Computing, {
      phase: 'failed',
      errorMessage: 'send.nym-blocked',
    });
  });

  test('Tests that confirming sends when the permit is granted.', async () => {
    const sendTransaction = jest.fn().mockResolvedValue(sent);
    const view = render(sendUi(online, sendTransaction, jest.fn()));
    const confirmSend = await openConfirmScreen(view);

    await confirmSend(sendPageState);

    expect(sendTransaction).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenLastCalledWith(RouteEnum.Computing, {
      phase: 'created',
    });
  });

  test('Tests that confirming sends when the platform has no mixnet transport. The Send screen shows no blocked reason.', async () => {
    const sendTransaction = jest.fn().mockResolvedValue(sent);
    const absent = { ...online, mixnetView: ABSENT_MIXNET_VIEW };
    const view = render(sendUi(absent, sendTransaction, jest.fn()));
    const confirmSend = await openConfirmScreen(view);

    expect(view.queryByTestId('send.mixnet-blocked')).toBeNull();
    await confirmSend(sendPageState);

    expect(sendTransaction).toHaveBeenCalledTimes(1);
  });
});
