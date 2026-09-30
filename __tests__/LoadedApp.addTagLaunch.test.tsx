/**
 * The add-tag sheet's launch, under the mount gate of the installed
 * @gorhom/bottom-sheet v5. The shared mock renders a modal's children at all
 * times; the installed BottomSheetModal renders nothing until present() sets
 * `mount` inside a requestAnimationFrame, and it unmounts the content when the
 * close animation ends. The mock here carries both, and the form mock records
 * each mount.
 *
 * Three pins: the form mounts with the launched address whether the sheet
 * presents from the slice's effect or right after the atom write; and a
 * relaunch during the close animation mounts a fresh form, because the host
 * keys the form on the launch number (#1457).
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
  const MockNewAddressTag = ({ address }: { address: string }) => {
    ReactActual.useEffect(() => {
      (globalThis as { mountedAddresses?: string[] }).mountedAddresses?.push(
        address,
      );
    }, []);
    return null;
  };
  return { __esModule: true, default: MockNewAddressTag };
});

// A BottomSheetModal with the real v5 mount gate: children render only after
// present() lands its requestAnimationFrame.
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const passthrough = ({ children }: { children?: unknown }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children as never);
  const BottomSheetModal = ReactActual.forwardRef(function GatedModal(
    { children }: { children?: unknown },
    ref,
  ) {
    const [mounted, setMounted] = ReactActual.useState(false);
    ReactActual.useImperativeHandle(ref, () => ({
      present: () => {
        globalThis.requestAnimationFrame(() => setMounted(true));
      },
      // v5 unmounts the content when the close animation ends.
      dismiss: () => {
        globalThis.setTimeout(() => setMounted(false), 250);
      },
    }));
    return mounted
      ? ReactActual.createElement(ReactActual.Fragment, null, children as never)
      : null;
  });
  return {
    __esModule: true,
    default: passthrough,
    BottomSheetModal,
    BottomSheetView: passthrough,
    BottomSheetScrollView: passthrough,
    BottomSheetBackdrop: passthrough,
    BottomSheetFooter: passthrough,
    BottomSheetModalProvider: passthrough,
    useBottomSheetModal: () => ({ dismiss: () => false, dismissAll: () => {} }),
  };
});

import React from 'react';
import NetInfo from '@react-native-community/netinfo/src/index';
import { act, render } from '@testing-library/react-native';
import { createStore } from 'jotai';

const { AppState, Linking } =
  jest.requireActual<typeof import('react-native')>('react-native');

import { LoadedApp, LoadedAppClass } from '@app/LoadedApp';
import { ChainNameEnum, LaunchingModeEnum, RouteEnum } from '@app/AppState';
import { addTagModalAtom } from '@app/AppState/uiAtoms';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '@app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

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

// The store is private to the container; the fences reach it the same way.
function controllerStoreOf(
  instance: LoadedAppClass,
): ReturnType<typeof createStore> {
  return (
    instance as unknown as { controllerStore: ReturnType<typeof createStore> }
  ).controllerStore;
}

const mountedAddresses = (): string[] =>
  (globalThis as { mountedAddresses?: string[] }).mountedAddresses ?? [];

describe('the add-tag sheet under the real mount gate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (globalThis as { mountedAddresses?: string[] }).mountedAddresses = [];
    (NetInfo.addEventListener as jest.Mock).mockReturnValue(jest.fn());
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

  it("Tests that the PR's order mounts the form with the launched address.", async () => {
    const { instance } = await mountCommitted();

    await act(async () => {
      instance.launchAddTagModal('zs1recipient');
      await flushMicrotasks();
    });
    expect(mountedAddresses()).toEqual([]); // nothing mounts before the frame
    await act(async () => {
      jest.advanceTimersByTime(16); // the requestAnimationFrame lands
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
        jest.advanceTimersByTime(16); // the requestAnimationFrame lands
        await flushMicrotasks();
      });
    };

    await launch('zs1recipient');
    expect(mountedAddresses()).toEqual(['zs1recipient']);

    await act(async () => {
      instance.addTagModalRef.current?.dismiss();
      jest.advanceTimersByTime(100); // the close animation is still running
    });
    await launch('zs1recipient');

    // A launch is a new form. The typed label of the closing form must not
    // carry over into the one the user just opened.
    expect(mountedAddresses()).toEqual(['zs1recipient', 'zs1recipient']);
  });

  it("Tests that #1280's order mounts the form with the launched address too.", async () => {
    const { instance } = await mountCommitted();

    await act(async () => {
      // #1280 wrote the atom and presented in the same tick, before the slice
      // re-rendered with the new target.
      controllerStoreOf(instance).set(addTagModalAtom, {
        kind: 'shown',
        launch: 1,
        address: 'zs1recipient',
        own: false,
        swapChain: 'ZEC',
      });
      instance.addTagModalRef.current?.present();
      await flushMicrotasks();
    });
    expect(mountedAddresses()).toEqual([]);
    await act(async () => {
      jest.advanceTimersByTime(16);
      await flushMicrotasks();
    });

    expect(mountedAddresses()).toEqual(['zs1recipient']);
  });
});
