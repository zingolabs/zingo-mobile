/**
 * Mounted behavior pins for the LoadedApp container, the container analog of the
 * engine pins in __tests__/walletBackend.syncCoordinator.fence.test.ts. They fix
 * the CURRENT behavior of the mounted container so a later change can prove it
 * flipped exactly one named assertion and left the rest green.
 *
 * The committing native-stack/bottom-tabs mocks render the focused route's body
 * and emit a `nav-route-<name>` marker per registered route, so the two render
 * outcomes are assertable by route presence. (The default string-host nav mocks
 * skip the render-prop bodies, so LoadedApp never commits under them.) The
 * mounted LoadedAppClass instance is driven directly for the lifecycle
 * invariants.
 *
 * Assertion labels B.1–B.6 track the seam-B invariant list in the fence spec.
 */

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

// doSave is re-exported by the ../walletBackend barrel that LoadedApp imports
// from. Mock it at its source module (like the engine fence) so the barrel's
// live binding resolves to the mock without spreading the circular barrel.
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

// The committed container renders <Toast/>; the shared mock only exposes the
// static show/hide, so give it a renderable component that keeps those statics.
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

// The three home tabs are leaf screens with their own fences. The container
// fence pins the navigator structure, not their internals, so they render as
// inert host markers.
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

import NetInfo from '@react-native-community/netinfo/src/index';
import { act } from '@testing-library/react-native';

// The manual react-native mock exposes only a partial shim through the ESM
// named-import interop; the source module reaches AppState/Linking via the same
// requireActual instance, so the fence spies on that one (precedent:
// MeetIronwood.seenFlag.unit.tsx).
const { AppState, Linking } =
  jest.requireActual<typeof import('react-native')>('react-native');

import { LoadedAppClass } from '@app/LoadedApp';
import { doSave } from '@app/walletBackend/utils/walletUtils';
import { resolveTriggerGate } from '@app/services/gateController';
import {
  AppStateStatusEnum,
  ChainNameEnum,
  RouteEnum,
  SelectServerEnum,
  errorKeyed,
} from '@app/AppState';
import { appStateStatusAtom } from '@app/AppState/uiAtoms';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import {
  ListenerSubscription,
  controllerStoreOf,
  flushMicrotasks,
  mountCommitted,
  spyOnLifecycleListeners,
} from './helpers/loadedAppHarness';
import { mockOfflineServer } from '../__mocks__/dataMocks/mockServer';

const doSaveMock = doSave as jest.Mock;
const resolveTriggerGateMock = resolveTriggerGate as jest.Mock;
const netInfoUnsubscribe = jest.fn();

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
      n =>
        (n.type as unknown as string) === 'MockNavRoute' &&
        n.props.name === name,
    ).length > 0
  );
}

function captureAppStateHandler(): (s: string) => Promise<void> {
  const spy = AppState.addEventListener as unknown as jest.Mock;
  const call = spy.mock.calls.find(c => c[0] === 'change');
  return call![1];
}

describe('LoadedApp seam-B mount fence — current container behavior', () => {
  let appStateSubscription: ListenerSubscription;
  let linkingSubscription: ListenerSubscription;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    resolveTriggerGateMock.mockResolvedValue({ kind: 'passed' });
    ({ appStateSubscription, linkingSubscription } =
      spyOnLifecycleListeners(netInfoUnsubscribe));
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

  describe('B.2: the two render outcomes over the render selector inputs', () => {
    it('full view with the Send tab — spendable and online', async () => {
      const { utils, instance } = await mountCommitted();

      act(() => {
        instance.setState({
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
        instance.setState({ readOnly: true });
      });

      expect(routePresent(utils, RouteEnum.History)).toBe(true);
      expect(routePresent(utils, RouteEnum.Send)).toBe(false);
      expect(routePresent(utils, RouteEnum.Receive)).toBe(true);
    });

    it('full view without the Send tab — offline hides Send', async () => {
      const { utils, instance } = await mountCommitted();

      act(() => {
        instance.setState({ server: mockOfflineServer });
      });

      expect(routePresent(utils, RouteEnum.History)).toBe(true);
      expect(routePresent(utils, RouteEnum.Send)).toBe(false);
      expect(routePresent(utils, RouteEnum.Receive)).toBe(true);
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

    it('resume (background → active) passes the gate and reconfigures', async () => {
      const { instance } = await mountCommitted();
      controllerStoreOf(instance).set(
        appStateStatusAtom,
        AppStateStatusEnum.background,
      );
      const clearTimers = jest.spyOn(instance.rpc, 'clearTimers');
      const configure = jest.spyOn(instance.rpc, 'configure');

      const handler = captureAppStateHandler();
      await act(async () => {
        await handler(AppStateStatusEnum.active);
        await flushMicrotasks();
      });

      expect(clearTimers).toHaveBeenCalled();
      expect(configure).toHaveBeenCalled();
    });

    it('a declined foreground gate routes back to LoadingApp', async () => {
      const { instance } = await mountCommitted();
      controllerStoreOf(instance).set(
        appStateStatusAtom,
        AppStateStatusEnum.background,
      );
      resolveTriggerGateMock.mockResolvedValueOnce({
        kind: 'declined',
        failure: errorKeyed('biometrics-failure-declined'),
      });

      const handler = captureAppStateHandler();
      await act(async () => {
        await handler(AppStateStatusEnum.active);
        await flushMicrotasks();
      });

      expect(mockNavigation.reset).toHaveBeenCalledWith(
        expect.objectContaining({
          routes: [expect.objectContaining({ name: RouteEnum.LoadingApp })],
        }),
      );
    });
  });

  describe('B.5: somePending on setValueTransfersList', () => {
    it('somePending is committed on a staggered timeout when nothing is pending', async () => {
      const { instance } = await mountCommitted();
      act(() => {
        instance.setState({
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
        server: mockOfflineServer,
        info: {} as never,
      });
    });

    act(() => {
      instance.setInfo({ chainName: '', currencyName: '' } as never);
    });

    expect(instance.state.info.chainName).toBe(ChainNameEnum.mainChainName);
  });
});
