/**
 * The confirm dialog holds the confirm handler of the render that opened it.
 * These tests change the app state after that render and then confirm.
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

import type { TranslateType } from '@app/AppState';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import { showConfirm } from '@app/services/showConfirm';
import { shieldConfirm, shieldPropose } from '@app/walletBackend';
import {
  SendPermitInputs,
  sendPermit,
} from '@app/walletBackend/transforms/sendPermit';
import { mixnetLost, mixnetOff } from '../.storybook/storyMocks';
import { mockOnline } from '../__mocks__/dataMocks/mockOnline';

const confirmMock = shieldConfirm as jest.Mock;
const proposeMock = shieldPropose as jest.Mock;
const showConfirmMock = showConfirm as jest.Mock;
const translate = (key: string): TranslateType => key;

type HookInput = Parameters<typeof useShieldFunds>[0];

const online = mockOnline;

// The state that LoadedApp holds. `sendPermitNow` reads it at call time.
let appState = online;

const hookInput = (
  inputs: SendPermitInputs,
  addLastSnackbar: jest.Mock,
): HookInput => {
  appState = inputs;
  return {
    readOnly: false,
    setShieldingAmount: jest.fn(),
    server: inputs.server,
    somePending: false,
    shieldingAmount: 0.5,
    translate,
    addLastSnackbar,
    setBackgroundError: jest.fn(),
    setScrollToTop: jest.fn(),
    setScrollToBottom: jest.fn(),
    sendPermitNow: () => sendPermit(appState),
  };
};

// Presses the shield button and returns the confirm dialog's Confirm handler.
const openConfirmDialog = (onPressShieldFunds: () => void) => {
  act(() => {
    onPressShieldFunds();
  });
  const [{ buttons }] = showConfirmMock.mock.calls[0];
  return buttons[0].onPress as () => Promise<void>;
};

// Opens the dialog on `opened`, moves the app state to `confirmed`, and confirms.
const confirmAfter = async (
  opened: SendPermitInputs,
  confirmed: SendPermitInputs,
  addLastSnackbar: jest.Mock,
) => {
  const { result, rerender } = renderHook(
    ({ inputs }: { inputs: SendPermitInputs }) =>
      useShieldFunds(hookInput(inputs, addLastSnackbar)),
    { initialProps: { inputs: opened } },
  );
  const confirm = openConfirmDialog(result.current.onPressShieldFunds);
  rerender({ inputs: confirmed });
  await act(async () => {
    await confirm();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  (useNavigation as jest.Mock).mockReturnValue({ navigate: jest.fn() });
  proposeMock.mockResolvedValue({ ok: true, value: '{}' });
  confirmMock.mockResolvedValue({ ok: true, value: '{"txids":["txid"]}' });
});

describe('useShieldFunds send permit', () => {
  test('Tests that confirming does not shield when the transport dies while the confirm dialog is open. The dialog opened on a ready view.', async () => {
    const addLastSnackbar = jest.fn();

    await confirmAfter(
      online,
      { ...online, mixnetView: mixnetLost },
      addLastSnackbar,
    );

    expect(confirmMock).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('send.nym-blocked');
  });

  test('Tests that confirming does not shield when the device disconnects while the confirm dialog is open. The dialog opened on a connected device.', async () => {
    const addLastSnackbar = jest.fn();

    await confirmAfter(
      online,
      { ...online, netInfo: { ...online.netInfo, isConnected: false } },
      addLastSnackbar,
    );

    expect(confirmMock).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('loadedapp.connection-error');
  });

  test('Tests that confirming does not shield when the mixnet view blocks sends from the start.', async () => {
    const addLastSnackbar = jest.fn();
    const blocked = { ...online, mixnetView: mixnetOff };

    await confirmAfter(blocked, blocked, addLastSnackbar);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(addLastSnackbar).toHaveBeenCalledWith('send.nym-blocked');
  });

  test('Tests that confirming shields when the permit is granted.', async () => {
    const addLastSnackbar = jest.fn();

    await confirmAfter(online, online, addLastSnackbar);

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(addLastSnackbar).not.toHaveBeenCalled();
  });
});
