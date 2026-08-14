/**
 * Mounted behavior pins for the LoadedApp container, the container analog of the
 * engine pins in __tests__/walletBackend.syncCoordinator.fence.test.ts. They fix
 * the CURRENT behavior of the mounted container so a later change can prove it
 * flipped exactly one named assertion and left the rest green.
 *
 * The committing native-stack/bottom-tabs mocks render the focused route's body
 * and emit a `nav-route-<name>` marker per registered route, so the four render
 * outcomes are assertable by route presence. (The default string-host nav mocks
 * skip the render-prop bodies, so LoadedApp never commits under them.) The
 * mounted LoadedAppClass instance is driven directly for the lifecycle
 * invariants.
 *
 * Assertion labels B.1–B.6 track the seam-B invariant list in the fence spec.
 */

jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

// doSave is re-exported by the ../walletBackend barrel that LoadedApp imports
// from. Mock it at its source module (like the engine fence) so the barrel's
// live binding resolves to the mock without spreading the circular barrel.
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

// The committed container renders <Toast/>; the shared mock only exposes the
// static show/hide, so give it a renderable component that keeps those statics.
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(() => null, { show: jest.fn(), hide: jest.fn() }),
}));

jest.mock('../app/simpleBiometrics', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

// The three home tabs are leaf screens with their own fences. The container
// fence pins the navigator structure, not their internals, so they render as
// inert host markers.
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo/src/index';
import { act, render } from '@testing-library/react-native';
import { createStore } from 'jotai';

// The manual react-native mock exposes only a partial shim through the ESM
// named-import interop; the source module reaches AppState/Linking via the same
// requireActual instance, so the fence spies on that one (precedent:
// MeetIronwood.seenFlag.unit.tsx).
const { AppState, Linking } =
  jest.requireActual<typeof import('react-native')>('react-native');

import { LoadedApp, LoadedAppClass } from '../app/LoadedApp';
import { doSave } from '../app/walletBackend/utils/walletUtils';
import simpleBiometrics from '../app/simpleBiometrics';
import {
  AppStateStatusEnum,
  ChainNameEnum,
  LaunchingModeEnum,
  ModeEnum,
  RouteEnum,
  SelectServerEnum,
} from '../app/AppState';
import { appStateStatusAtom } from '../app/AppState/uiAtoms';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const doSaveMock = doSave as jest.Mock;
const simpleBiometricsMock = simpleBiometrics as jest.Mock;
const asyncStorageGetItem = AsyncStorage.getItem as jest.Mock;
const netInfoUnsubscribe = jest.fn();

// appStateStatus moved off container state to the UI atom; the fg/bg handler
// reads its `prior` from here, so the test seeds the atom, not setState.
function controllerStoreOf(instance: LoadedAppClass): ReturnType<
  typeof createStore
> {
  return (instance as unknown as { controllerStore: ReturnType<typeof createStore> })
    .controllerStore;
}

// LoadedApp captures the home screen's navigation (from the committing
// native-stack mock) as `drawerNav`, so the Seed-routing invariant lands on that
// object's `navigate`, not the App-level nav prop.
function drawerNavOf(instance: LoadedAppClass): { navigate: jest.Mock } {
  return (instance as unknown as { drawerNav: { navigate: jest.Mock } })
    .drawerNav;
}

type DrawerProps = StackScreenProps<AppStackParamList, RouteEnum.LoadedApp>;

function makeDrawerProps(
  params: Partial<AppStackParamList[RouteEnum.LoadedApp]> = {},
): DrawerProps {
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
        ...params,
      },
    },
  } as DrawerProps;
}

async function flushMicrotasks(times = 100): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

// Render, then drive the wrapper's async boot effect (setLoading(false)) and the
// class componentDidMount to completion so the container commits.
async function mountCommitted(
  params?: Partial<AppStackParamList[RouteEnum.LoadedApp]>,
) {
  const utils = render(
    <LoadedApp {...makeDrawerProps(params)} toggleTheme={jest.fn()} />,
  );
  await act(async () => {
    await flushMicrotasks();
  });
  const instance = utils.UNSAFE_root.findByType(LoadedAppClass)
    .instance as LoadedAppClass;
  return { utils, instance };
}

// Route presence, read off the react-test-renderer tree rather than RNTL's
// testID matcher (which trips over the custom marker host under the shimmed
// react-native). The committing nav mock emits one MockNavRoute per registered
// route.
function routePresent(
  utils: Awaited<ReturnType<typeof mountCommitted>>['utils'],
  name: RouteEnum,
): boolean {
  return (
    utils.UNSAFE_root.findAll(
      n => (n.type as unknown as string) === 'MockNavRoute' && n.props.name === name,
    ).length > 0
  );
}

function captureAppStateHandler(): (s: string) => Promise<void> {
  const spy = AppState.addEventListener as unknown as jest.Mock;
  const call = spy.mock.calls.find(c => c[0] === 'change');
  return call![1];
}

describe('LoadedApp seam-B mount fence — current container behavior', () => {
  let appStateSubscription: { remove: jest.Mock };
  let linkingSubscription: { remove: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    simpleBiometricsMock.mockResolvedValue(true);
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(netInfoUnsubscribe);

    appStateSubscription = { remove: jest.fn() };
    linkingSubscription = { remove: jest.fn() };
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue(appStateSubscription as never);
    jest
      .spyOn(Linking, 'addEventListener')
      .mockReturnValue(linkingSubscription as never);
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('B.1: the mount commits — LoadedAppClass instance and the home stack are live', async () => {
    const { utils, instance } = await mountCommitted();

    expect(instance).toBeInstanceOf(LoadedAppClass);
    // The RootNavigator's focused HomeStack screen rendered its render-prop body.
    expect(routePresent(utils, RouteEnum.HomeStack)).toBe(true);
    // A sibling RootNavigator screen is registered but not mounted.
    expect(routePresent(utils, RouteEnum.Seed)).toBe(true);
  });

  describe('B.2: the four render outcomes over the render selector inputs', () => {
    it('full view with the Send tab — advanced, spendable', async () => {
      const { utils, instance } = await mountCommitted();

      act(() => {
        instance.setState({
          mode: ModeEnum.advanced,
          readOnly: false,
          selectServer: SelectServerEnum.auto,
        });
      });

      expect(routePresent(utils, RouteEnum.History)).toBe(true);
      expect(routePresent(utils, RouteEnum.Send)).toBe(true);
      expect(routePresent(utils, RouteEnum.Receive)).toBe(true);
    });

    it('full view without the Send tab — read-only hides Send', async () => {
      const { utils, instance } = await mountCommitted();

      act(() => {
        instance.setState({ mode: ModeEnum.advanced, readOnly: true });
      });

      expect(routePresent(utils, RouteEnum.History)).toBe(true);
      expect(routePresent(utils, RouteEnum.Send)).toBe(false);
      expect(routePresent(utils, RouteEnum.Receive)).toBe(true);
    });

    it('minimal receive-only view — basic, empty, addresses known', async () => {
      const { utils, instance } = await mountCommitted();

      act(() => {
        instance.setState({
          mode: ModeEnum.basic,
          readOnly: false,
          valueTransfersTotal: null,
          totalBalance: null,
          addresses: [],
        });
      });

      expect(routePresent(utils, RouteEnum.History)).toBe(false);
      expect(routePresent(utils, RouteEnum.Send)).toBe(false);
      expect(routePresent(utils, RouteEnum.Receive)).toBe(true);
    });

    it('minimal spinner view — basic, empty, addresses still null', async () => {
      const { utils, instance } = await mountCommitted();

      act(() => {
        instance.setState({
          mode: ModeEnum.basic,
          readOnly: false,
          valueTransfersTotal: null,
          totalBalance: null,
          addresses: null,
        });
      });

      // No tab navigator at all in the spinner branch — the home stack committed
      // (its marker is present) but rendered no tab route.
      expect(routePresent(utils, RouteEnum.HomeStack)).toBe(true);
      expect(routePresent(utils, RouteEnum.History)).toBe(false);
      expect(routePresent(utils, RouteEnum.Send)).toBe(false);
      expect(routePresent(utils, RouteEnum.Receive)).toBe(false);
    });
  });

  it('B.3: listeners are added on mount and removed on unmount, symmetrically', async () => {
    const { utils } = await mountCommitted();

    expect(AppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(Linking.addEventListener).toHaveBeenCalledWith(
      'url',
      expect.any(Function),
    );
    expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);

    await act(async () => {
      utils.unmount();
      await flushMicrotasks();
    });

    expect(appStateSubscription.remove).toHaveBeenCalledTimes(1);
    expect(linkingSubscription.remove).toHaveBeenCalledTimes(1);
    expect(netInfoUnsubscribe).toHaveBeenCalledTimes(1);
  });

  describe('B.4: the foreground/background handler', () => {
    it('suspend (active → background) clears timers, blanks sync status, and saves', async () => {
      const { instance } = await mountCommitted();
      controllerStoreOf(instance).set(
        appStateStatusAtom,
        AppStateStatusEnum.active,
      );
      const clearTimers = jest.spyOn(instance.rpc, 'clearTimers');
      const setSyncingStatus = jest.spyOn(instance, 'setSyncingStatus');
      doSaveMock.mockClear();

      const handler = captureAppStateHandler();
      await act(async () => {
        await handler(AppStateStatusEnum.background);
        await flushMicrotasks();
      });

      expect(clearTimers).toHaveBeenCalled();
      expect(setSyncingStatus).toHaveBeenCalledWith({});
      expect(doSaveMock).toHaveBeenCalledTimes(1);
    });

    it('resume (background → active) bumps the foreground epoch and reconfigures', async () => {
      const { instance } = await mountCommitted();
      controllerStoreOf(instance).set(
        appStateStatusAtom,
        AppStateStatusEnum.background,
      );
      const epochBefore = instance.state.foregroundEpoch;
      const clearTimers = jest.spyOn(instance.rpc, 'clearTimers');
      const configure = jest.spyOn(instance.rpc, 'configure');

      const handler = captureAppStateHandler();
      await act(async () => {
        await handler(AppStateStatusEnum.active);
        await flushMicrotasks();
      });

      expect(instance.state.foregroundEpoch).toBe(epochBefore + 1);
      expect(clearTimers).toHaveBeenCalled();
      expect(configure).toHaveBeenCalled();
    });

    it('a failed foreground biometric resume routes back to LoadingApp', async () => {
      const { instance } = await mountCommitted();
      controllerStoreOf(instance).set(
        appStateStatusAtom,
        AppStateStatusEnum.background,
      );
      simpleBiometricsMock.mockResolvedValueOnce(false);

      const handler = captureAppStateHandler();
      await act(async () => {
        await handler(AppStateStatusEnum.active);
        await flushMicrotasks();
      });

      expect(mockNavigation.reset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: [
            expect.objectContaining({ name: RouteEnum.LoadingApp }),
          ],
        }),
      );
    });
  });

  describe('B.5: Seed routing and somePending on setValueTransfersList', () => {
    it('basic mode routes to Seed on the first non-empty sync', async () => {
      const { instance } = await mountCommitted();
      act(() => {
        instance.setState({
          mode: ModeEnum.basic,
          valueTransfers: null,
          valueTransfersTotal: null,
        });
      });
      // the gate: app in foreground and the seed not yet shown this session
      // (seedModalOpenAtom defaults false, so the modal reads closed)
      asyncStorageGetItem.mockResolvedValue('no');
      const drawerNav = drawerNavOf(instance);
      drawerNav.navigate.mockClear();

      // The poll writes the model; the Seed route is now a derived effect keyed
      // on the first-non-empty-sync transition, so it fires once the staggered
      // commit lands, not from the callback.
      await act(async () => {
        await instance.setValueTransfersList(
          [{ status: 'confirmed', confirmations: 5 } as never],
          1,
        );
        jest.advanceTimersByTime(250);
        await flushMicrotasks();
      });

      expect(drawerNav.navigate).toHaveBeenCalledWith(
        RouteEnum.Seed,
        expect.anything(),
      );
    });

    it('somePending is committed on a staggered timeout when nothing is pending', async () => {
      const { instance } = await mountCommitted();
      act(() => {
        instance.setState({
          mode: ModeEnum.advanced,
          somePending: false,
          valueTransfers: null,
          valueTransfersTotal: null,
        });
      });

      await act(async () => {
        // one confirmed transfer → pending count 0 → the 250ms staggered commit
        await instance.setValueTransfersList(
          [{ status: 'confirmed', confirmations: 10 } as never],
          1,
        );
        await flushMicrotasks();
        jest.advanceTimersByTime(250);
        await flushMicrotasks();
      });

      expect(instance.state.valueTransfersTotal).toBe(1);
      expect(instance.state.somePending).toBe(false);
    });
  });

  it('B.6: setInfo falls back to the wallet chain when the server chain is empty', async () => {
    const { instance } = await mountCommitted();
    act(() => {
      instance.setState({
        walletChainName: ChainNameEnum.mainChainName,
        server: { uri: '', chainName: ChainNameEnum.noneChainName },
        info: {} as never,
      });
    });

    act(() => {
      instance.setInfo({ chainName: '', currencyName: '' } as never);
    });

    expect(instance.state.info.chainName).toBe(ChainNameEnum.mainChainName);
  });
});
