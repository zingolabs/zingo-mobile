/**
 * @format
 */

import 'react-native';

import { LoadingAppClass } from '@app/LoadingApp';
import {
  ChainNameEnum,
  LanguageEnum,
  LaunchingModeEnum,
  Route,
  SelectServerEnum,
} from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import { navigateOnboarding, returnTo } from '@app/navigation/navigate';
import { createAlert } from '@app/services/createAlert';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('@app/navigation/navigate', () => ({
  ...jest.requireActual('@app/navigation/navigate'),
  navigateOnboarding: jest.fn(),
  returnTo: jest.fn(),
}));
jest.mock('@app/services/createAlert', () => ({ createAlert: jest.fn() }));

const onboardingApp = () => {
  const app = new LoadingAppClass({
    session: { kind: 'onboarding', start: 'Welcome' },
    openWallet: jest.fn(),
    openOnboarding: jest.fn(),
    openBoot: jest.fn(),
    translate: (key: string) => key,
    language: LanguageEnum.en,
    server: remoteServer('https://zec.global:443', ChainNameEnum.mainChainName),
    privacy: false,
    backgroundSyncInfo: { batches: 0, message: '', date: 0, dateEnd: 0 },
    firstLaunchingMessage: LaunchingModeEnum.installing,
    biometrics: false,
    selectServer: SelectServerEnum.auto,
  } as never);
  const setState = jest.spyOn(app, 'setState').mockImplementation(update => {
    const patch =
      typeof update === 'function'
        ? (update as (s: typeof app.state) => object)(app.state)
        : update;
    app.state = { ...app.state, ...patch };
  });
  return { app, setState };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

test('Tests that a create the server failed lands on the server error screen, which says no wallet was created', () => {
  const { app } = onboardingApp();

  app.createFailed('transport error: connection timed out', 'Savings', false);
  jest.runAllTimers();

  expect(app.state.walletError).toEqual(
    expect.objectContaining({
      kind: 'server',
      stage: { kind: 'create', name: 'Savings' },
      retried: false,
    }),
  );
  expect(returnTo).toHaveBeenCalledWith(Route.Welcome);
  expect(navigateOnboarding).toHaveBeenCalledWith({ screen: Route.OpenError });
  expect(createAlert).not.toHaveBeenCalled();
});

test('Tests that a create failed for another reason keeps the alert on the welcome', () => {
  const { app } = onboardingApp();

  app.createFailed('invalid seed', 'Savings', false);
  jest.runAllTimers();

  expect(createAlert).toHaveBeenCalledTimes(1);
  expect(navigateOnboarding).not.toHaveBeenCalled();
  expect(app.state.walletError).toBeNull();
});

test('Tests that a retry from the error screen that fails again stays on it, shakes and says it still cannot connect', () => {
  const { app } = onboardingApp();
  const shake = app.state.errorShake;

  app.createFailed('connection refused', 'Savings', true);
  jest.runAllTimers();

  expect(app.state.walletError).toEqual(
    expect.objectContaining({ kind: 'server', retried: true }),
  );
  expect(app.state.errorShake).toBe(shake + 1);
  expect(navigateOnboarding).not.toHaveBeenCalled();
  expect(returnTo).not.toHaveBeenCalled();
});
