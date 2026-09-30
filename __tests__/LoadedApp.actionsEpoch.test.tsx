/**
 * Actions and the callback-boundary epoch. Two pins over the committing mount:
 *
 *  - the callback-boundary epoch: a backend callback that resolves after the
 *    container is torn down drops its write; it cannot setState a dead instance.
 *  - the poll-driven navigation: the poll callback writes the model only and
 *    never navigates.
 *
 * Both drive the committed container, so they reuse the mount harness.
 */

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/walletBackend/utils/walletUtils', () => ({
  ...jest.requireActual('@app/walletBackend/utils/walletUtils'),
  doSave: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: jest.fn().mockImplementation(supportedLocales => ({
    languageTag: supportedLocales?.[0] || 'en',
    isRTL: false,
  })),
}));

jest.mock('i18n-js');

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(() => null, { show: jest.fn(), hide: jest.fn() }),
}));

jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  resolveTriggerGate: jest.fn().mockResolvedValue({ kind: 'passed' }),
}));

// dev's PriceTrafficDriver attaches the price store's own AppState listener.
// The price surface has its own tests, so the container fences render the
// driver inert and see only the container's listener.
jest.mock('@ui/widgets/PriceFetcher', () => ({
  ...jest.requireActual('@ui/widgets/PriceFetcher'),
  PriceTrafficDriver: () => null,
}));

jest.mock('@screens/History', () => ({
  __esModule: true,
  default: 'MockHistoryScreen',
}));
jest.mock('@screens/Send', () => ({
  __esModule: true,
  default: 'MockSendScreen',
}));
jest.mock('@screens/Receive', () => ({
  __esModule: true,
  default: 'MockReceiveScreen',
}));

import React from 'react';
import NetInfo from '@react-native-community/netinfo/src/index';
import { act, render } from '@testing-library/react-native';

const { AppState, Linking } =
  jest.requireActual<typeof import('react-native')>('react-native');

import { LoadedApp, LoadedAppClass } from '@app/LoadedApp';
import { resolveTriggerGate } from '@app/services/gateController';
import {
  AddressKindEnum,
  ChainNameEnum,
  LaunchingModeEnum,
  RouteEnum,
  TransparentAddressClass,
} from '@app/AppState';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '@app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import { polledMockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { balanceAtom } from '@app/AppState/balance';
import type { Store } from '../.storybook/storeWith';

const resolveTriggerGateMock = resolveTriggerGate as jest.Mock;
const netInfoUnsubscribe = jest.fn();

function controllerStoreOf(instance: LoadedAppClass): Store {
  return (instance as unknown as { controllerStore: Store }).controllerStore;
}

function drawerNavOf(instance: LoadedAppClass): { navigate: jest.Mock } {
  return (instance as unknown as { drawerNav: { navigate: jest.Mock } })
    .drawerNav;
}

type DrawerProps = StackScreenProps<AppStackParamList, RouteEnum.LoadedApp>;

function makeDrawerProps(): DrawerProps {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.LoadedApp,
      params: {
        readOnly: false,
        orchardPool: true,
        saplingPool: true,
        transparentPool: true,
        newWallet: false,
        firstLaunchingMessage: LaunchingModeEnum.opening,
        walletChainName: ChainNameEnum.mainChainName,
      },
    },
  } as DrawerProps;
}

async function flushMicrotasks(times = 100): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

async function mountCommitted() {
  const utils = render(<LoadedApp {...makeDrawerProps()} />);
  await act(async () => {
    await flushMicrotasks();
  });
  const instance = utils.UNSAFE_root.findByType(LoadedAppClass)
    .instance as LoadedAppClass;
  return { utils, instance };
}

describe('callback-boundary epoch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resolveTriggerGateMock.mockResolvedValue({ kind: 'passed' });
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(netInfoUnsubscribe);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
    jest
      .spyOn(Linking, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('drops a backend write that resolves after teardown', async () => {
    const { utils, instance } = await mountCommitted();
    // The wired backend callback, captured before teardown.
    const onBalanceChanged = instance.setBalance;

    await act(async () => {
      utils.unmount();
      await flushMicrotasks();
    });

    onBalanceChanged(polledMockTotalBalance);

    // The write carried the mount epoch; teardown bumped past it, so the
    // dispatch dropped it — the dead instance's balance stays awaiting.
    expect(controllerStoreOf(instance).get(balanceAtom)).toEqual({
      kind: 'awaiting',
    });
  });

  it('lands a backend write while the instance is mounted', async () => {
    const { instance } = await mountCommitted();

    act(() => {
      instance.setBalance(polledMockTotalBalance);
    });

    // The positive control: the guard passes while mounted, so the same write
    // that dropped above lands here.
    expect(controllerStoreOf(instance).get(balanceAtom)).toEqual(
      polledMockTotalBalance,
    );
  });

  it('Tests that the default unified address clears when the address list holds only transparent addresses.', async () => {
    const { instance } = await mountCommitted();
    const transparent = new TransparentAddressClass(
      0,
      't1transparent',
      AddressKindEnum.t,
      RPCAddressScopeEnum.external,
    );

    act(() => {
      instance.setAllAddresses([transparent]);
    });

    expect(instance.state.addresses).toEqual([transparent]);
    expect(instance.state.defaultUnifiedAddress).toBe('');
  });
});

describe('poll-driven navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resolveTriggerGateMock.mockResolvedValue({ kind: 'passed' });
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(netInfoUnsubscribe);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
    jest
      .spyOn(Linking, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never);
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('writes the model and never navigates from the callback', async () => {
    const { instance } = await mountCommitted();
    act(() => {
      instance.setState({
        valueTransfers: null,
        valueTransfersTotal: null,
      });
    });
    const drawerNav = drawerNavOf(instance);
    drawerNav.navigate.mockClear();

    // The poll callback runs to completion and the staggered commit lands the
    // model. The app has one mode, so no sync transition routes to Seed.
    await act(async () => {
      await instance.setValueTransfersList(
        [{ status: 'confirmed', confirmations: 5 } as never],
        1,
      );
      jest.advanceTimersByTime(250);
      await flushMicrotasks();
    });
    expect(instance.state.valueTransfersTotal).toBe(1);
    expect(drawerNav.navigate).not.toHaveBeenCalled();
  });
});
