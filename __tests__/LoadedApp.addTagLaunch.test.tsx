/**
 * The add-tag sheet's launch, under the shared bottom-sheet mock, which
 * carries the installed library's lifecycle: present() mounts the content a
 * frame later, a present() during the close animation is dropped, and the
 * content unmounts when the close animation ends. The form mock records each
 * mount and unmount, and hands out the sheet dismiss it received.
 *
 * Two pins: the form mounts with the launched address a frame after the
 * launch, and a relaunch during the close animation leaves only the second
 * form mounted once the close animation has elapsed (#1457).
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

// The form numbers each mount, records the mount and the unmount, and keeps
// the sheet dismiss it read from the enclosing sheet.
jest.mock('@ui/widgets/NewAddressTag', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { useSheetDismiss } = jest.requireActual<
    typeof import('@ui/primitives/AppSheetModal')
  >('@ui/primitives/AppSheetModal');
  const mounted = jest.fn();
  const unmounted = jest.fn();
  const dismissers: (() => void)[] = [];
  let mounts = 0;
  const MockNewAddressTag = ({ address }: { address: string }) => {
    const dismiss = useSheetDismiss();
    ReactActual.useEffect(() => {
      mounts += 1;
      const mount = mounts;
      dismissers.push(dismiss);
      mounted(mount, address);
      return () => {
        unmounted(mount);
      };
    }, []);
    return null;
  };
  return {
    __esModule: true,
    default: MockNewAddressTag,
    mounted,
    unmounted,
    dismissers,
  };
});

import { act } from '@testing-library/react-native';

import { addTagModalAtom } from '@app/AppState/uiAtoms';
import {
  controllerStoreOf,
  flushMicrotasks,
  mountCommitted,
  spyOnLifecycleListeners,
} from './helpers/loadedAppHarness';

const { mounted, unmounted, dismissers } = jest.requireMock<{
  mounted: jest.Mock;
  unmounted: jest.Mock;
  dismissers: (() => void)[];
}>('@ui/widgets/NewAddressTag');

const { CLOSE_ANIMATION_MS } = jest.requireMock<{
  CLOSE_ANIMATION_MS: number;
}>('@gorhom/bottom-sheet');

const FRAME_MS = 16;
const MID_CLOSE_MS = CLOSE_ANIMATION_MS / 2;

const mountedForms = (): number[] =>
  mounted.mock.calls
    .map(([mount]) => mount as number)
    .filter(
      mount =>
        !unmounted.mock.calls.some(([gone]) => (gone as number) === mount),
    );

const mountedAddresses = (): string[] =>
  mounted.mock.calls.map(([, address]) => address as string);

describe('the add-tag sheet under the shared mount gate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    dismissers.length = 0;
    spyOnLifecycleListeners();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const launch = async (
    instance: Awaited<ReturnType<typeof mountCommitted>>['instance'],
    address: string,
  ) => {
    await act(async () => {
      instance.launchAddTagModal(address);
      await flushMicrotasks();
    });
    await act(async () => {
      jest.advanceTimersByTime(FRAME_MS);
      await flushMicrotasks();
    });
  };

  it('Tests that the form mounts with the launched address, a frame after the launch.', async () => {
    const { instance } = await mountCommitted();

    await act(async () => {
      instance.launchAddTagModal('zs1recipient');
      await flushMicrotasks();
    });
    expect(controllerStoreOf(instance).get(addTagModalAtom)).toMatchObject({
      kind: 'launched',
      launch: 1,
      address: 'zs1recipient',
    });
    expect(mountedAddresses()).toEqual([]);
    await act(async () => {
      jest.advanceTimersByTime(FRAME_MS);
      await flushMicrotasks();
    });

    expect(mountedAddresses()).toEqual(['zs1recipient']);
  });

  it('Tests that a relaunch during the close animation leaves only the second form mounted after the close.', async () => {
    const { instance } = await mountCommitted();

    await launch(instance, 'zs1recipient');
    expect(mountedForms()).toEqual([1]);

    await act(async () => {
      dismissers[0]();
      jest.advanceTimersByTime(MID_CLOSE_MS);
    });
    await launch(instance, 'zs1recipient');
    expect(controllerStoreOf(instance).get(addTagModalAtom)).toMatchObject({
      launch: 2,
    });
    await act(async () => {
      jest.advanceTimersByTime(CLOSE_ANIMATION_MS);
      await flushMicrotasks();
    });

    expect(mountedForms()).toEqual([2]);
  });
});
