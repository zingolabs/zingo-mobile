jest.mock('../app/createAlert', () => ({ createAlert: jest.fn() }));
jest.mock('../app/sendEmail', () => ({ sendEmail: jest.fn() }));
jest.mock('../app/RPCModule', () => ({}));

import { createAlert } from '../app/createAlert';
import { COVERED_SURFACE_REFUSAL } from '../app/walletBackend/utils/mixnetGate';
import { surfacePriceFailure } from '../components/Components/priceFetcherStore';

const freshDeps = () => ({
  translate: (key: string) => `t:${key}`,
  addLastSnackbar: jest.fn(),
  setBackgroundError: jest.fn(),
  zingolibVersion: 'zingolib-test-version',
});

describe('surfacePriceFailure', () => {
  beforeEach(() => {
    (createAlert as jest.Mock).mockClear();
  });

  it('does nothing for a successful fetch', async () => {
    const deps = freshDeps();
    await surfacePriceFailure(
      {
        kind: 'price',
        usd: 42.5,
        route: { kind: 'attested', viaSocks5: '127.0.0.1:1080' },
        elapsedMs: 1200,
      },
      true,
      deps,
    );
    expect(createAlert).not.toHaveBeenCalled();
    expect(deps.addLastSnackbar).not.toHaveBeenCalled();
  });

  it('routes a user-initiated failure through the alert with the full report and the support email', async () => {
    const deps = freshDeps();
    await surfacePriceFailure(
      { kind: 'gateRefusal', error: COVERED_SURFACE_REFUSAL },
      true,
      deps,
    );
    expect(createAlert).toHaveBeenCalledTimes(1);
    const [
      setBackgroundError,
      addLastSnackbar,
      title,
      report,
      toast,
      ,
      emailFn,
      zingolibVersion,
    ] = (createAlert as jest.Mock).mock.calls[0];
    expect(setBackgroundError).toBe(deps.setBackgroundError);
    expect(addLastSnackbar).toBe(deps.addLastSnackbar);
    expect(title).toBe('t:info.errorgemini');
    expect(report).toContain(COVERED_SURFACE_REFUSAL);
    expect(toast).toBe(false);
    expect(emailFn).toBeDefined();
    expect(zingolibVersion).toBe('zingolib-test-version');
  });

  it('keeps the auto-refresh to a snackbar carrying the failure detail', async () => {
    const deps = freshDeps();
    await surfacePriceFailure(
      { kind: 'gateRefusal', error: COVERED_SURFACE_REFUSAL },
      false,
      deps,
    );
    expect(createAlert).not.toHaveBeenCalled();
    expect(deps.addLastSnackbar).toHaveBeenCalledTimes(1);
    const message = deps.addLastSnackbar.mock.calls[0][0];
    expect(message).toContain('t:info.errorgemini');
    expect(message).toContain(COVERED_SURFACE_REFUSAL);
  });

  it('titles a malformed payload with the rpc-module key, matching the old rendering', async () => {
    const deps = freshDeps();
    await surfacePriceFailure(
      {
        kind: 'malformedPayload',
        payload: '{"current_price": "x"}',
        detail: 'non-numeric price x',
        elapsedMs: 5,
      },
      true,
      deps,
    );
    const [, , title, report] = (createAlert as jest.Mock).mock.calls[0];
    expect(title).toBe('t:info.errorrpcmodule');
    expect(report).toContain('non-numeric price x');
    expect(report).toContain('{"current_price": "x"}');
  });
});
