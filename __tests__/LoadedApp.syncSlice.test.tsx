/**
 * The sync live-wiring slice. Two claims over the mount and engine pins:
 *
 *  - the sync blast-radius pin: a sync tick (a new scan snapshot) wakes only the
 *    sync consumers reading `syncStatusAtom`, not an unrelated slice. Proven at
 *    the atom boundary.
 *  - the live-wiring pin: the container routes each snapshot through the pure
 *    `reconcile`, so the held `syncMachineAtom` tracks the live scan.
 *
 * The live-wiring pin drives the committed container, so it reuses the mount
 * harness.
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
import { Provider, createStore, useAtomValue } from 'jotai';

const { AppState, Linking } =
  jest.requireActual<typeof import('react-native')>('react-native');

import { LoadedApp, LoadedAppClass } from '../app/LoadedApp';
import simpleBiometrics from '../app/simpleBiometrics';
import {
  ChainNameEnum,
  LaunchingModeEnum,
  ModeEnum,
  RouteEnum,
} from '../app/AppState';
import {
  walletViewSourceAtom,
  walletViewAtom,
} from '../app/AppState/walletViewAtoms';
import { syncStatusAtom, syncMachineAtom } from '../app/AppState/syncAtoms';
import type { SyncMachine } from '../app/walletBackend/controller/syncController';
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

describe('sync blast-radius — a sync tick wakes only sync consumers', () => {
  let syncRenders = 0;
  let viewRenders = 0;
  const SyncConsumer = (): null => {
    syncRenders += 1;
    useAtomValue(syncStatusAtom);
    return null;
  };
  const ViewConsumer = (): null => {
    viewRenders += 1;
    useAtomValue(walletViewAtom);
    return null;
  };

  it('a scan snapshot wakes the sync consumer and leaves the view consumer asleep', () => {
    const store = createStore();
    store.set(walletViewSourceAtom, prev => ({ ...prev, mode: ModeEnum.advanced }));
    syncRenders = 0;
    viewRenders = 0;
    render(
      <Provider store={store}>
        <SyncConsumer />
        <ViewConsumer />
      </Provider>,
    );
    const baseSync = syncRenders;
    const baseView = viewRenders;

    // A sync tick: the scan percent moves.
    act(() => {
      store.set(syncStatusAtom, syncing(40));
    });
    expect(syncRenders).toBeGreaterThan(baseSync); // the sync consumer woke
    expect(viewRenders).toBe(baseView); // the view consumer stayed asleep
  });

  it('a view-field change leaves the sync consumer asleep', () => {
    const store = createStore();
    syncRenders = 0;
    viewRenders = 0;
    render(
      <Provider store={store}>
        <SyncConsumer />
        <ViewConsumer />
      </Provider>,
    );
    const baseSync = syncRenders;

    act(() => {
      store.set(walletViewSourceAtom, prev => ({
        ...prev,
        mode: ModeEnum.advanced,
      }));
    });
    expect(syncRenders).toBe(baseSync); // sync untouched by a view change
  });
});

describe('live-wiring — the container routes snapshots through reconcile', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    simpleBiometricsMock.mockResolvedValue(true);
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(netInfoUnsubscribe);
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as never);
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as never);
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a syncing snapshot moves the held machine to syncing, a tip snapshot to idle', async () => {
    const { instance } = await mountCommitted();
    const store = controllerStoreOf(instance);

    await act(async () => {
      instance.setSyncingStatus(syncing(42));
      await flushMicrotasks();
    });
    expect(store.get(syncMachineAtom).sync).toEqual({
      kind: 'syncing',
      percent: 42,
    });

    await act(async () => {
      instance.setSyncingStatus(syncing(100));
      await flushMicrotasks();
    });
    expect(store.get(syncMachineAtom).sync.kind).toBe('idle');
  });

  it('the held machine is seeded to idle at mount', async () => {
    const { instance } = await mountCommitted();
    const machine: SyncMachine = controllerStoreOf(instance).get(syncMachineAtom);
    expect(machine.sync).toEqual({ kind: 'idle' });
  });
});
