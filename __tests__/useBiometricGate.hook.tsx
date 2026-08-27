/**
 * The shared screen-level gate: one body for the mount and foreground
 * effects, asking the single gate controller of ADR 0007 and acting on
 * its three-way answer.
 */
jest.mock('../app/gateController', () => ({
  __esModule: true,
  ...jest.requireActual('../app/gateController'),
  askGate: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { askGate } from '../app/gateController';
import type { GateAnswer } from '../app/gateController';
import { useBiometricGate } from '../app/hooks/useBiometricGate';
import type { TranslateType } from '../app/AppState';

const gate = askGate as jest.MockedFunction<typeof askGate>;
const translate = (k: string): TranslateType => k;

type GateProps = Parameters<typeof useBiometricGate>[0];

const gateArgs = (over?: Partial<GateProps>): GateProps => ({
  needsAuth: true,
  translate,
  addLastSnackbar: jest.fn(),
  onCancel: jest.fn(),
  foregroundAppEnabled: true,
  foregroundEpoch: 0,
  ...over,
});

beforeEach(() => {
  gate.mockReset();
});

test('a decline is a named refused state that cancels the screen', async () => {
  gate.mockResolvedValue({
    kind: 'declined',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-declined',
      param: '10',
    },
  });
  const props = gateArgs();
  const { result } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: props,
  });

  await waitFor(() => expect(props.onCancel).toHaveBeenCalled());
  expect(result.current).toMatchObject({ kind: 'refused' });
  // The raw platform diagnostic is bug-report data; the decline path must
  // not paste it into user copy.
  expect(props.addLastSnackbar).toHaveBeenCalledWith('biometrics-error');
});

test('a fail-open passes the screen and says why the gate could not run', async () => {
  gate.mockResolvedValue({
    kind: 'failedOpen',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-stalled',
      param: 'authenticate',
    },
  });
  const props = gateArgs();
  const { result } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: props,
  });

  await waitFor(() => expect(result.current).toMatchObject({ kind: 'passed' }));
  expect(props.addLastSnackbar).toHaveBeenCalledWith(
    expect.stringContaining('authenticate'),
  );
  expect(props.onCancel).not.toHaveBeenCalled();
});

test('a pass reaches passed with no snackbar and no cancel', async () => {
  gate.mockResolvedValue({ kind: 'passed' });
  const props = gateArgs();
  const { result } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: props,
  });

  await waitFor(() => expect(result.current).toMatchObject({ kind: 'passed' }));
  expect(props.addLastSnackbar).not.toHaveBeenCalled();
  expect(props.onCancel).not.toHaveBeenCalled();
});

test('a screen that needs no auth passes without asking the gate', () => {
  const { result } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: gateArgs({ needsAuth: false }),
  });

  expect(result.current).toMatchObject({ kind: 'passed' });
  expect(gate).not.toHaveBeenCalled();
});

test('flipping needsAuth on re-gates a mounted screen', async () => {
  gate.mockResolvedValue({ kind: 'passed' });
  const { result, rerender } = renderHook(
    (p: GateProps) => useBiometricGate(p),
    { initialProps: gateArgs({ needsAuth: false }) },
  );

  expect(gate).not.toHaveBeenCalled();
  rerender(gateArgs({ needsAuth: true }));

  await waitFor(() => expect(gate).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(result.current).toMatchObject({ kind: 'passed' }));
});

test('a foreground return re-gates only when the app-level gate is off', async () => {
  gate.mockResolvedValue({ kind: 'passed' });
  const { rerender } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: gateArgs({ foregroundAppEnabled: false }),
  });
  await waitFor(() => expect(gate).toHaveBeenCalledTimes(1));

  rerender(gateArgs({ foregroundAppEnabled: false, foregroundEpoch: 1 }));
  await waitFor(() => expect(gate).toHaveBeenCalledTimes(2));

  rerender(gateArgs({ foregroundAppEnabled: true, foregroundEpoch: 2 }));
  expect(gate).toHaveBeenCalledTimes(2);
});

test('an unmounted screen never acts on a late answer', async () => {
  let handAnswer: (a: GateAnswer) => void = () => {};
  gate.mockReturnValueOnce(
    new Promise(resolve => {
      handAnswer = resolve;
    }),
  );
  const props = gateArgs();
  const { unmount } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: props,
  });
  await waitFor(() => expect(gate).toHaveBeenCalledTimes(1));

  unmount();
  handAnswer({
    kind: 'declined',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-declined',
      param: '10',
    },
  });
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(props.onCancel).not.toHaveBeenCalled();
  expect(props.addLastSnackbar).not.toHaveBeenCalled();
});
