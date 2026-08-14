/**
 * The price slice. Two claims over the mount pins:
 *
 *  - the price blast-radius pin: a price tick (the value atom moves) wakes only
 *    the price consumers reading `priceViewAtom`, not an unrelated slice. Proven
 *    at the atom boundary.
 *  - the container-binding pin: the container owns a real PriceLane bound into
 *    its store, not the inert default, so the fetch lane lives and dies with the
 *    instance lifecycle.
 *
 * The lane's epoch-drop and tracked-handle leak pins are unit-driven in
 * price.unit.test.ts; this file pins the container binding.
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
import {
  PriceLane,
  priceAtom,
  priceLaneAtom,
  priceViewAtom,
} from '../app/AppState/priceAtoms';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const simpleBiometricsMock = simpleBiometrics as jest.Mock;
const netInfoUnsubscribe = jest.fn();

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

describe('price blast-radius — a price tick wakes only price consumers', () => {
  let priceRenders = 0;
  let viewRenders = 0;
  const PriceConsumer = (): null => {
    priceRenders += 1;
    useAtomValue(priceViewAtom);
    return null;
  };
  const ViewConsumer = (): null => {
    viewRenders += 1;
    useAtomValue(walletViewAtom);
    return null;
  };

  it('a price update wakes the price consumer and leaves the view consumer asleep', () => {
    const store = createStore();
    priceRenders = 0;
    viewRenders = 0;
    render(
      <Provider store={store}>
        <PriceConsumer />
        <ViewConsumer />
      </Provider>,
    );
    const basePrice = priceRenders;
    const baseView = viewRenders;

    act(() => {
      store.set(priceAtom, { kind: 'priced', usd: 33.33, at: 0 });
    });
    expect(priceRenders).toBeGreaterThan(basePrice); // the price consumer woke
    expect(viewRenders).toBe(baseView); // the view consumer stayed asleep
  });

  it('a view-field change leaves the price consumer asleep', () => {
    const store = createStore();
    priceRenders = 0;
    viewRenders = 0;
    render(
      <Provider store={store}>
        <PriceConsumer />
        <ViewConsumer />
      </Provider>,
    );
    const basePrice = priceRenders;

    act(() => {
      store.set(walletViewSourceAtom, prev => ({
        ...prev,
        mode: ModeEnum.advanced,
      }));
    });
    expect(priceRenders).toBe(basePrice); // price untouched by a view change
  });
});

describe('container binding — the container owns the lane', () => {
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

  it('binds a real PriceLane into the store and starts unpriced', async () => {
    const { instance } = await mountCommitted();
    const store = controllerStoreOf(instance);
    expect(store.get(priceLaneAtom)).toBeInstanceOf(PriceLane);
    expect(store.get(priceAtom)).toEqual({ kind: 'unpriced' });
  });
});
