/**
 * The confirm dialog holds the confirm handler of the render that opened it.
 * These tests change the app state after that render and then confirm.
 */
jest.mock('@app/walletBackend', () => ({
  shieldPreview: jest.fn(() => Promise.resolve({ ok: true, value: '{}' })),
  shieldPropose: jest.fn(),
  shieldConfirm: jest.fn(),
}));

jest.mock('@app/navigation/navigate', () => ({
  ...jest.requireActual('@app/navigation/navigate'),
  isOnTop: () => true,
}));

jest.mock('@app/services/showConfirm', () => ({
  showConfirm: jest.fn(),
}));

import { act, renderHook } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';

import type { TranslateType } from '@app/AppState';
import { useShieldFunds } from '@app/hooks/useShieldFunds';
import { showConfirm } from '@app/services/showConfirm';
import {
  shieldConfirm,
  shieldPreview,
  shieldPropose,
} from '@app/walletBackend';
import { TotalBalanceClass } from '@app/wallet/classes';
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
    totalBalance: null,
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

describe('useShieldFunds propose and preview', () => {
  test('Tests that confirming does not transmit when the shield proposal fails. The proposal error is what the send screen shows.', async () => {
    const navigate = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({ navigate });
    proposeMock.mockResolvedValue({
      ok: false,
      error: { code: 'Send', message: 'insufficient funds to cover the fee' },
    });
    const { result } = renderHook(() =>
      useShieldFunds(hookInput(online, jest.fn())),
    );
    const confirm = openConfirmDialog(result.current.onPressShieldFunds);
    await act(async () => {
      await confirm();
    });

    expect(confirmMock).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenLastCalledWith(
      'Computing',
      expect.objectContaining({
        phase: 'failed',
        failure: {
          kind: 'verbatim',
          text: 'insufficient funds to cover the fee',
        },
      }),
    );
  });

  test('Tests that the shieldable amount is the latest balance one when an older preview answers last', async () => {
    const previewMock = shieldPreview as jest.Mock;
    const answers: Array<(value: string) => void> = [];
    previewMock.mockImplementation(
      () =>
        new Promise(resolve => {
          answers.push(value => resolve({ ok: true, value }));
        }),
    );
    const setShieldingAmount = jest.fn();
    const balance = (transparent: number) =>
      ({ confirmedTransparentBalance: transparent }) as TotalBalanceClass;
    const { rerender } = renderHook(
      ({ totalBalance }: { totalBalance: TotalBalanceClass }) =>
        useShieldFunds({
          ...hookInput(online, jest.fn()),
          setShieldingAmount,
          totalBalance,
        }),
      { initialProps: { totalBalance: balance(0.1) } },
    );
    rerender({ totalBalance: balance(0.2) });

    await act(async () => {
      answers[1](JSON.stringify({ value_to_shield: 0.2 * 10 ** 8, fee: 1 }));
    });
    await act(async () => {
      answers[0](JSON.stringify({ value_to_shield: 0.1 * 10 ** 8, fee: 1 }));
    });

    expect(answers).toHaveLength(2);
    expect(setShieldingAmount).toHaveBeenCalledTimes(1);
    expect(setShieldingAmount).toHaveBeenLastCalledWith(0.2);
  });
});
