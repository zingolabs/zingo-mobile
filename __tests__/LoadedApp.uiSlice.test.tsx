/**
 * The fg/bg and modal UI slice, and the whole-tree re-render proof. Three claims
 * over the committing mount:
 *
 *  - the fg/bg blast-radius pin: a foreground/background status transition writes
 *    appStateStatusAtom and does not re-render the container.
 *  - the modal slice: launchAddTagModal writes addTagModalAtom, so opening the
 *    shared modal writes only the atom, not container state.
 *  - the whole-tree proof: against the real committed container, a sync tick, a
 *    price tick, and a fg/bg edge each leave the container asleep; a field still
 *    held in container state (shieldingAmount) wakes it. This proves the atom
 *    shape against the real tree.
 */

jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('../app/walletBackend/utils/walletUtils', () => ({
  ...jest.requireActual('../app/walletBackend/utils/walletUtils'),
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

jest.mock('../app/simpleBiometrics', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('../components/History', () => ({
  __esModule: true,
  default: 'MockHistoryScreen',
}));
jest.mock('../components/Send', () => ({
  __esModule: true,
  default: 'MockSendScreen',
}));
jest.mock('../components/Receive', () => ({
  __esModule: true,
  default: 'MockReceiveScreen',
}));

import React from 'react';
import NetInfo from '@react-native-community/netinfo/src/index';
import { act, render } from '@testing-library/react-native';
import { createStore } from 'jotai';

const { AppState, Linking } =
  jest.requireActual<typeof import('react-native')>('react-native');

import { LoadedApp, LoadedAppClass } from '../app/LoadedApp';
import simpleBiometrics from '../app/simpleBiometrics';
import {
  AppStateStatusEnum,
  ChainNameEnum,
  LaunchingModeEnum,
  RouteEnum,
} from '../app/AppState';
import {
  appStateStatusAtom,
  addTagModalAtom,
} from '../app/AppState/uiAtoms';
import { syncStatusAtom } from '../app/AppState/syncAtoms';
import { priceAtom } from '../app/AppState/priceAtoms';
import { RPCSyncStatusType } from '../app/walletBackend/types/RPCSyncStatusType';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const simpleBiometricsMock = simpleBiometrics as jest.Mock;
const netInfoUnsubscribe = jest.fn();

const syncing = (percent: number): RPCSyncStatusType => ({
  scan_ranges: [{} as never],
  percentage_total_outputs_scanned: percent,
});

function controllerStoreOf(instance: LoadedAppClass): ReturnType<
  typeof createStore
> {
  return (instance as unknown as { controllerStore: ReturnType<typeof createStore> })
    .controllerStore;
}

function captureAppStateHandler(): (s: string) => Promise<void> {
  const spy = AppState.addEventListener as unknown as jest.Mock;
  const call = spy.mock.calls.find(c => c[0] === 'change');
  return call![1];
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
  const utils = render(
    <LoadedApp {...makeDrawerProps()} toggleTheme={jest.fn()} />,
  );
  await act(async () => {
    await flushMicrotasks();
  });
  const instance = utils.UNSAFE_root.findByType(LoadedAppClass)
    .instance as LoadedAppClass;
  return { utils, instance };
}

describe('fg/bg + residual UI slice', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    simpleBiometricsMock.mockResolvedValue(true);
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

  it('the fg/bg blast-radius pin: a status transition writes the atom without re-rendering the container', async () => {
    const { instance } = await mountCommitted();
    const store = controllerStoreOf(instance);
    // background → inactive is a bare status track on either platform: no
    // suspend or resume work, just the status write.
    store.set(appStateStatusAtom, AppStateStatusEnum.background);
    const handler = captureAppStateHandler();
    const renderSpy = jest.spyOn(instance, 'render');

    await act(async () => {
      await handler(AppStateStatusEnum.inactive);
      await flushMicrotasks();
    });

    expect(store.get(appStateStatusAtom)).toBe(AppStateStatusEnum.inactive);
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('the modal slice: launching the add-tag modal writes the atom without re-rendering the container', async () => {
    const { instance } = await mountCommitted();
    const store = controllerStoreOf(instance);
    const renderSpy = jest.spyOn(instance, 'render');

    act(() => {
      instance.launchAddTagModal('zs1recipient');
    });

    expect(store.get(addTagModalAtom)).toMatchObject({
      kind: 'shown',
      address: 'zs1recipient',
      own: false,
    });
    expect(renderSpy).not.toHaveBeenCalled();
  });
});

describe('whole-tree re-render proof', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    simpleBiometricsMock.mockResolvedValue(true);
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

  it('sliced changes leave the container asleep; a field still in container state wakes it', async () => {
    const { instance } = await mountCommitted();
    const store = controllerStoreOf(instance);
    const renderSpy = jest.spyOn(instance, 'render');

    // A sync tick — the detailed snapshot atom moves.
    act(() => {
      store.set(syncStatusAtom, syncing(40));
    });
    // A price tick — the value atom moves.
    act(() => {
      store.set(priceAtom, { kind: 'priced', usd: 42, at: 0 });
    });
    // A fg/bg edge — the lifecycle atom moves.
    store.set(appStateStatusAtom, AppStateStatusEnum.background);
    const handler = captureAppStateHandler();
    await act(async () => {
      await handler(AppStateStatusEnum.inactive);
      await flushMicrotasks();
    });

    // None of the three woke the container: the sliced fields are isolated,
    // proven against the real tree.
    expect(renderSpy).not.toHaveBeenCalled();

    // Positive control: a field still read off the context object re-renders the
    // container, so the harness does detect a real wake.
    act(() => {
      instance.setShieldingAmount(999);
    });
    expect(renderSpy).toHaveBeenCalled();
  });
});
