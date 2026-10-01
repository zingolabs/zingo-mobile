/**
 * The shield flow's own mixnet send gate. The button's disabled state is one
 * guard; the confirm dialog outlives the render that opened it, so the hook
 * checks the gate again when the user confirms.
 */
jest.mock('@app/walletBackend', () => ({
  shieldPropose: jest.fn(),
  shieldConfirm: jest.fn(),
}));

jest.mock('@app/services/showConfirm', () => ({
  showConfirm: jest.fn(),
}));

import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ChainNameEnum, remoteServer } from '@app/AppState';
import type { TranslateType } from '@app/AppState';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import { showConfirm } from '@app/services/showConfirm';
import { shieldConfirm, shieldPropose } from '@app/walletBackend';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import {
  mixnetLost,
  mixnetOff,
  mixnetReady,
  mockInfo,
} from '../.storybook/storyMocks';

const confirmMock = shieldConfirm as jest.Mock;
const proposeMock = shieldPropose as jest.Mock;
const showConfirmMock = showConfirm as jest.Mock;
const translate = (key: string): TranslateType => key;

type HookInput = Parameters<typeof useShieldFunds>[0];

const hookInput = (
  mixnetView: MixnetView | null,
  addLastSnackbar: jest.Mock,
): HookInput => ({
  readOnly: false,
  setShieldingAmount: jest.fn(),
  server: remoteServer(mockInfo.serverUri, ChainNameEnum.mainChainName),
  somePending: false,
  shieldingAmount: 0.5,
  translate,
  netInfo: {
    isConnected: true,
    type: NetInfoStateType.wifi,
    isConnectionExpensive: false,
  },
  addLastSnackbar,
  setBackgroundError: jest.fn(),
  setScrollToTop: jest.fn(),
  setScrollToBottom: jest.fn(),
  mixnetView,
});

// Presses the shield button and returns the confirm dialog's Confirm handler.
const openConfirmDialog = (onPressShieldFunds: () => void) => {
  act(() => {
    onPressShieldFunds();
  });
  const [{ buttons }] = showConfirmMock.mock.calls[0];
  return buttons[0].onPress as () => Promise<void>;
};

beforeEach(() => {
  jest.clearAllMocks();
  (useNavigation as jest.Mock).mockReturnValue({ navigate: jest.fn() });
  proposeMock.mockResolvedValue({ ok: true, value: '{}' });
  confirmMock.mockResolvedValue({ ok: true, value: '{"txids":["txid"]}' });
});

describe('useShieldFunds mixnet send gate', () => {
  test('Tests that confirming does not shield when the transport dies while the confirm dialog is open. The dialog opened on a ready view.', async () => {
    const addLastSnackbar = jest.fn();
    const { result, rerender } = renderHook(
      ({ view }: { view: MixnetView | null }) =>
        useShieldFunds(hookInput(view, addLastSnackbar)),
      { initialProps: { view: mixnetReady } },
    );
    const confirm = openConfirmDialog(result.current.onPressShieldFunds);

    rerender({ view: mixnetLost });
    await act(async () => {
      await confirm();
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('send.nym-blocked');
  });

  test('Tests that confirming does not shield when the mixnet view blocks sends from the start.', async () => {
    const addLastSnackbar = jest.fn();
    const { result } = renderHook(() =>
      useShieldFunds(hookInput(mixnetOff, addLastSnackbar)),
    );
    const confirm = openConfirmDialog(result.current.onPressShieldFunds);

    await act(async () => {
      await confirm();
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('send.nym-blocked');
  });

  test('Tests that confirming shields when the mixnet view is ready.', async () => {
    const addLastSnackbar = jest.fn();
    const { result } = renderHook(() =>
      useShieldFunds(hookInput(mixnetReady, addLastSnackbar)),
    );
    const confirm = openConfirmDialog(result.current.onPressShieldFunds);

    await act(async () => {
      await confirm();
    });

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(addLastSnackbar).not.toHaveBeenCalled();
  });
});
