/**
 * The add-tag sheet's launch, under the shared bottom-sheet mock, which
 * carries the installed library's lifecycle: present() mounts the content a
 * frame later, a present() during the close animation is dropped, and the
 * content unmounts when the close animation ends. The form mock records each
 * mount and unmount, and hands out the sheet dismiss it received.
 *
 * Four pins: the form mounts with the launched address a frame after the
 * launch; a relaunch during the close animation mounts only the second form,
 * a frame after the close ends (#1457); a second launch before the first
 * frame retargets the one pending instance; and a launch while the sheet is
 * open swaps the form without a dismissal.
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

// The form numbers each mount from the recorded mounts, records the mount and
// the unmount, and keeps the sheet dismiss it read from the enclosing sheet.
jest.mock('@ui/widgets/NewAddressTag', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { useSheetDismiss } = jest.requireActual<
    typeof import('@ui/primitives/AppSheetModal')
  >('@ui/primitives/AppSheetModal');
  const mounted = jest.fn();
  const unmounted = jest.fn();
  const dismissers: (() => void)[] = [];
  const MockNewAddressTag = ({ address }: { address: string }) => {
    const dismiss = useSheetDismiss();
    ReactActual.useEffect(() => {
      const mount = mounted.mock.calls.length + 1;
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
import * as bottomSheetMock from '@gorhom/bottom-sheet';

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

// The mock's extras, read through the same import the app code uses, so the
// queue observed here is the one the sheets write.
const { CLOSE_ANIMATION_MS, sheetsQueue, sheetHandles } =
  bottomSheetMock as unknown as {
    CLOSE_ANIMATION_MS: number;
    sheetsQueue: number[];
    sheetHandles: Map<number, { snapToIndex: (index: number) => void }>;
  };

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
    sheetsQueue.length = 0;
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

  it('Tests that a relaunch during the close animation mounts only the second form, a frame after the close ends.', async () => {
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
    // The waiting instance mounts when the dismissal lands and presents a
    // frame later.
    expect(mountedForms()).toEqual([]);
    await act(async () => {
      jest.advanceTimersByTime(FRAME_MS);
      await flushMicrotasks();
    });

    expect(mountedForms()).toEqual([2]);
  });

  it('Tests that a second launch before the first frame retargets the pending instance.', async () => {
    const { instance } = await mountCommitted();

    // Two taps, two events, both before the first frame lands.
    await act(async () => {
      instance.launchAddTagModal('zs1first');
      await flushMicrotasks();
    });
    await act(async () => {
      instance.launchAddTagModal('zs1second');
      await flushMicrotasks();
    });
    await act(async () => {
      jest.advanceTimersByTime(FRAME_MS);
      await flushMicrotasks();
    });

    // One instance presented once, and the only form ever mounted is the
    // second launch's.
    expect(mountedAddresses()).toEqual(['zs1second']);
    expect(mountedForms()).toEqual([1]);
    // One sheet in the provider's queue; a stale entry would hold the back
    // handler forever.
    expect(sheetsQueue).toHaveLength(1);
  });

  it('Tests that a launch while the sheet is open swaps the form without a dismissal.', async () => {
    const { instance } = await mountCommitted();

    await launch(instance, 'zs1first');
    await launch(instance, 'zs1second');

    expect(mountedAddresses()).toEqual(['zs1first', 'zs1second']);
    expect(mountedForms()).toEqual([2]);
    expect(dismissers).toHaveLength(2); // both forms received a dismiss; none ran
  });

  it('Tests that a launch parked during a caught close swaps into the sheet once it settles open.', async () => {
    const { instance } = await mountCommitted();

    await launch(instance, 'zs1first');
    await act(async () => {
      dismissers[0]();
      jest.advanceTimersByTime(MID_CLOSE_MS);
    });
    await launch(instance, 'zs1second');
    expect(mountedForms()).toEqual([1]);

    // The user catches the closing sheet and drags it open again, so the
    // dismissal never lands.
    await act(async () => {
      [...sheetHandles.values()].at(-1)?.snapToIndex(0);
      await flushMicrotasks();
    });
    await act(async () => {
      jest.advanceTimersByTime(CLOSE_ANIMATION_MS);
      await flushMicrotasks();
    });

    expect(mountedAddresses()).toEqual(['zs1first', 'zs1second']);
    expect(mountedForms()).toEqual([2]);
    expect(sheetsQueue).toHaveLength(1);
  });
});
