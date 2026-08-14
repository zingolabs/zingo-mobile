/**
 * The view slice. Two pins over the mount pins:
 *
 *  - the view blast-radius pin: a container field that does not change the
 *    WalletView outcome wakes no view consumer, and a field that does wakes it.
 *    Proven at the atom boundary, against the real
 *    walletViewSourceAtom/walletViewAtom.
 *  - the navigation-effect pin: the HomeStack setNavigationHome effect keys on
 *    the navigation, so it runs once on mount, not on every later view commit.
 *
 * The navigation-effect pin drives the committed container, so it reuses the
 * mount harness.
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
  initialWalletViewSource,
} from '../app/AppState/walletViewAtoms';
import TotalBalanceClass from '../app/AppState/classes/TotalBalanceClass';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const simpleBiometricsMock = simpleBiometrics as jest.Mock;
const netInfoUnsubscribe = jest.fn();

function drawerNavRef(instance: LoadedAppClass): { drawerNav: unknown } {
  return instance as unknown as { drawerNav: unknown };
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

describe('view slice — the view wakes only on a view change', () => {
  let viewRenders = 0;
  const ViewConsumer = (): null => {
    viewRenders += 1;
    useAtomValue(walletViewAtom);
    return null;
  };

  it('a container field that leaves the WalletView unchanged wakes no view consumer', () => {
    const store = createStore();
    // advanced mode → the view is fullWithSend regardless of balance or history
    store.set(walletViewSourceAtom, {
      ...initialWalletViewSource,
      mode: ModeEnum.advanced,
    });
    viewRenders = 0;
    render(
      <Provider store={store}>
        <ViewConsumer />
      </Provider>,
    );
    const base = viewRenders;

    // A balance poll lands: totalBalance changes, but the outcome does not.
    act(() => {
      store.set(walletViewSourceAtom, prev => ({
        ...prev,
        totalBalance: Object.assign(new TotalBalanceClass(), {
          confirmedOrchardBalance: 42,
        }),
        valueTransfersTotal: 7,
      }));
    });
    expect(viewRenders).toBe(base); // the view did not re-render

    // A real view change: basic, empty, addresses unknown → spinner.
    act(() => {
      store.set(walletViewSourceAtom, prev => ({
        ...prev,
        mode: ModeEnum.basic,
        totalBalance: null,
        valueTransfersTotal: null,
        addresses: null,
      }));
    });
    expect(viewRenders).toBeGreaterThan(base); // the view woke
  });
});

describe('setNavigationHome runs once, not on every commit', () => {
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

  it('captures the home navigation once on mount', async () => {
    const { instance } = await mountCommitted();
    const captured = drawerNavRef(instance).drawerNav as { navigate?: unknown };
    expect(captured).toBeTruthy();
    expect(typeof captured.navigate).toBe('function');
  });

  it('does not re-run the home effect when the view re-renders', async () => {
    const { instance } = await mountCommitted();
    // Clear the captured nav; only a re-run of the effect would set it again.
    drawerNavRef(instance).drawerNav = null;

    // A view-field commit flips the WalletView and re-renders HomeStackBody. The
    // effect keys on `navigation` (stable), so it must not fire again.
    await act(async () => {
      instance.setState({
        mode: ModeEnum.basic,
        totalBalance: null,
        valueTransfersTotal: null,
        addresses: null,
      });
      await flushMicrotasks();
    });

    expect(drawerNavRef(instance).drawerNav).toBeNull();
  });
});
