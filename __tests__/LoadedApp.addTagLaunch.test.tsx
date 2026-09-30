/**
 * The add-tag sheet's launch, under the mount gate of the installed
 * @gorhom/bottom-sheet v5. The shared mock renders a modal's children at all
 * times; the installed BottomSheetModal renders nothing until present() sets
 * `mount` inside a requestAnimationFrame, and it unmounts the content when the
 * close animation ends. The mock here carries both, and the form mock records
 * each mount.
 *
 * Two pins: the form mounts with the launched address a frame after
 * present(), and a relaunch during the close animation mounts a fresh form,
 * because the host keys the form on the launch number (#1457).
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

// The form records each mount, like the real NewAddressTag's label state,
// which lives for the mount's lifetime.
jest.mock('@ui/widgets/NewAddressTag', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const mountedWith = jest.fn();
  const MockNewAddressTag = ({ address }: { address: string }) => {
    ReactActual.useEffect(() => {
      mountedWith(address);
    }, []);
    return null;
  };
  return { __esModule: true, default: MockNewAddressTag, mountedWith };
});

// The shared mock, with a BottomSheetModal that carries the real v5 mount
// gate: children render only after present() lands its requestAnimationFrame.
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const CLOSE_ANIMATION_MS = 250;
  const BottomSheetModal = ReactActual.forwardRef(function GatedModal(
    { children }: { children?: unknown },
    ref,
  ) {
    const [mounted, setMounted] = ReactActual.useState(false);
    const closing = ReactActual.useRef<
      ReturnType<typeof setTimeout> | undefined
    >(undefined);
    ReactActual.useImperativeHandle(ref, () => ({
      // A present during the close animation keeps the content mounted.
      present: () => {
        globalThis.clearTimeout(closing.current);
        closing.current = undefined;
        globalThis.requestAnimationFrame(() => setMounted(true));
      },
      // v5 unmounts the content when the close animation ends.
      dismiss: () => {
        closing.current = globalThis.setTimeout(
          () => setMounted(false),
          CLOSE_ANIMATION_MS,
        );
      },
    }));
    return mounted
      ? ReactActual.createElement(ReactActual.Fragment, null, children as never)
      : null;
  });
  return {
    ...jest.requireActual('../__mocks__/@gorhom/bottom-sheet'),
    BottomSheetModal,
    CLOSE_ANIMATION_MS,
  };
});

import { act } from '@testing-library/react-native';

import {
  flushMicrotasks,
  mountCommitted,
  spyOnLifecycleListeners,
} from './helpers/loadedAppHarness';

const { mountedWith } = jest.requireMock<{ mountedWith: jest.Mock }>(
  '@ui/widgets/NewAddressTag',
);

const { CLOSE_ANIMATION_MS } = jest.requireMock<{
  CLOSE_ANIMATION_MS: number;
}>('@gorhom/bottom-sheet');

const FRAME_MS = 16;
const MID_CLOSE_MS = CLOSE_ANIMATION_MS / 2;

const mountedAddresses = (): string[] =>
  mountedWith.mock.calls.map(([address]) => address);

describe('the add-tag sheet under the real mount gate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    spyOnLifecycleListeners();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('Tests that the form mounts with the launched address, a frame after present.', async () => {
    const { instance } = await mountCommitted();

    await act(async () => {
      instance.launchAddTagModal('zs1recipient');
      await flushMicrotasks();
    });
    expect(mountedAddresses()).toEqual([]);
    await act(async () => {
      jest.advanceTimersByTime(FRAME_MS);
      await flushMicrotasks();
    });

    expect(mountedAddresses()).toEqual(['zs1recipient']);
  });

  it('Tests that a relaunch for the same address during the close animation mounts a fresh form.', async () => {
    const { instance } = await mountCommitted();

    const launch = async (address: string) => {
      await act(async () => {
        instance.launchAddTagModal(address);
        await flushMicrotasks();
      });
      await act(async () => {
        jest.advanceTimersByTime(FRAME_MS);
        await flushMicrotasks();
      });
    };

    await launch('zs1recipient');
    expect(mountedAddresses()).toEqual(['zs1recipient']);

    await act(async () => {
      instance.addTagModalRef.current?.dismiss();
      jest.advanceTimersByTime(MID_CLOSE_MS);
    });
    await launch('zs1recipient');

    // A launch is a new form. The typed label of the closing form must not
    // carry over into the one the user just opened.
    expect(mountedAddresses()).toEqual(['zs1recipient', 'zs1recipient']);
  });
});
