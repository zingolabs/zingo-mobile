/**
 * The shared screen-level gate: one body for the mount and foreground
 * effects, reactive to needsAuth, and a faithful reporter of what the
 * platform said instead of a fixed blame-the-user sentence.
 */
jest.mock('../app/simpleBiometrics', () => ({
  __esModule: true,
  default: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import simpleBiometrics from '../app/simpleBiometrics';
import type { GateVerdict } from '../app/simpleBiometrics';
import { useBiometricGate } from '../app/hooks/useBiometricGate';
import type { TranslateType } from '../app/AppState';

const gate = simpleBiometrics as jest.MockedFunction<typeof simpleBiometrics>;
const translate = (k: string): TranslateType => k;

type GateProps = Parameters<typeof useBiometricGate>[0];

const gateArgs = (over?: { needsAuth?: boolean }) => ({
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

test('a decline surfaces the failure, not only the generic sentence', async () => {
  gate.mockResolvedValue({
    kind: 'declined',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-stalled',
      param: 'getGenericPassword',
    },
  });
  const props = gateArgs();
  renderHook((p: GateProps) => useBiometricGate(p), { initialProps: props });

  await waitFor(() => expect(props.onCancel).toHaveBeenCalled());
  expect(props.addLastSnackbar).toHaveBeenCalledWith(
    expect.stringContaining('getGenericPassword'),
  );
});

test('flipping needsAuth on re-gates a mounted screen', async () => {
  gate.mockResolvedValue({ kind: 'authenticated' });
  const { result, rerender } = renderHook(
    (p: GateProps) => useBiometricGate(p),
    {
      initialProps: gateArgs({ needsAuth: false }),
    },
  );
  expect(result.current).toBe(true);
  expect(gate).not.toHaveBeenCalled();

  rerender(gateArgs({ needsAuth: true }));
  await waitFor(() => expect(gate).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(result.current).toBe(true));
});

test('an unanswered shared verdict re-asks while the screen lives', async () => {
  gate
    .mockResolvedValueOnce({ kind: 'unanswered' })
    .mockResolvedValue({ kind: 'authenticated' });
  const { result } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: gateArgs(),
  });

  await waitFor(() => expect(result.current).toBe(true));
  expect(gate).toHaveBeenCalledTimes(2);
});

test('an unmounted screen never re-asks on an unanswered verdict', async () => {
  let handVerdict: (v: GateVerdict) => void = () => {};
  gate.mockReturnValueOnce(
    new Promise(resolve => {
      handVerdict = resolve;
    }),
  );
  const { unmount } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: gateArgs(),
  });
  await waitFor(() => expect(gate).toHaveBeenCalledTimes(1));

  unmount();
  handVerdict({ kind: 'unanswered' });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(gate).toHaveBeenCalledTimes(1); // no stray prompt from a dead screen
});

test('a stalled fail-open tells the user the check did not respond', async () => {
  gate.mockResolvedValue({
    kind: 'unavailable',
    failure: {
      kind: 'error',
      errorKey: 'biometrics-failure-stalled',
      param: 'canImplyAuthentication',
    },
  });
  const props = gateArgs();
  const { result } = renderHook((p: GateProps) => useBiometricGate(p), {
    initialProps: props,
  });

  await waitFor(() => expect(result.current).toBe(true));
  expect(props.addLastSnackbar).toHaveBeenCalledWith(
    expect.stringContaining('biometrics-failure-stalled'),
  );
});
