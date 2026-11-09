/**
 * @format
 */

import 'react-native';

import * as Keychain from 'react-native-keychain';
import Toast from 'react-native-toast-message';
import { LoadingAppClass } from '@app/LoadingApp';
import {
  ChainNameEnum,
  GlobalConst,
  LanguageEnum,
  LaunchingModeEnum,
  Route,
  SelectServerEnum,
} from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import { errorKeyed } from '@app/AppState/types/Result';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';
import { RPCWalletKindEnum } from '@app/walletBackend/enums/RPCWalletKindEnum';
import { WALLET_FILE_NAME } from '@app/walletBackend/utils/walletFileRepair';
import { resolveTriggerGate } from '@app/services/gateController';
import { defaultServer } from '@app/services/serverPicking';
import RPCModule from '@app/RPCModule';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  resolveTriggerGate: jest.fn(async () => ({ kind: 'passed' })),
}));

const SERVER_URI = 'https://example.test:443';
const SAVED_SEED = 'abandon '.repeat(23) + 'art';
const SAVED_BIRTHDAY = 2_500_000;
const WALLET_SEED = 'zoo '.repeat(23) + 'wrong';
const WALLET_BIRTHDAY = 2_600_000;
const translate = (key: string) => key;

const bridge = RPCModule as unknown as Record<string, jest.Mock>;
const keychain = Keychain as unknown as Record<string, jest.Mock>;
const toast = Toast as unknown as Record<string, jest.Mock>;
const triggerGate = resolveTriggerGate as jest.Mock;

// One entry under the app's service, written and read as the real service
// does. Entries under the retired sentinel services are never held.
const keystore: { entry?: string } = {};

const keystoreHoldsOneEntry = () => {
  delete keystore.entry;
  keychain.hasGenericPassword.mockImplementation(
    async () => keystore.entry !== undefined,
  );
  keychain.getGenericPassword.mockImplementation(async () =>
    keystore.entry === undefined
      ? false
      : {
          username: GlobalConst.keyKeyChain,
          service: GlobalConst.serviceKeyChain,
          password: keystore.entry,
        },
  );
  keychain.setGenericPassword.mockImplementation(
    async (_username: string, password: string) => {
      keystore.entry = password;
      return true;
    },
  );
  keychain.resetGenericPassword.mockImplementation(
    async (options?: { service?: string }) => {
      if (options?.service === GlobalConst.serviceKeyChain) {
        delete keystore.entry;
      }
      return true;
    },
  );
};

// The OEM Keystore loss: every call into the Keystore throws.
const keystoreThrows = () => {
  const lost = async () => {
    throw new Error('KeyStoreException: key not found');
  };
  keychain.hasGenericPassword.mockImplementation(lost);
  keychain.getGenericPassword.mockImplementation(lost);
  keychain.setGenericPassword.mockImplementation(lost);
  keychain.resetGenericPassword.mockImplementation(lost);
};

// A seeded mainnet wallet on disk whose file loads, a server that answers,
// and a well-formed recovery entry saved from an earlier wallet.
const everyCapabilityPresent = () => {
  keystoreHoldsOneEntry();
  keystore.entry = JSON.stringify({
    seed: SAVED_SEED,
    birthday: SAVED_BIRTHDAY,
  });
  bridge.walletExists.mockResolvedValue('true');
  bridge.getVersionInfo.mockResolvedValue('zl_test-zm_test');
  bridge.walletChainInfo.mockResolvedValue('main');
  bridge.setBroadcastCandidates.mockResolvedValue('');
  bridge.loadExistingWallet.mockResolvedValue(
    JSON.stringify({
      seed: WALLET_SEED,
      birthday: WALLET_BIRTHDAY,
      chain_name: 'main',
    }),
  );
  bridge.walletKindInfo.mockResolvedValue(
    JSON.stringify({
      kind: RPCWalletKindEnum.LoadedFromSeedPhrase,
      orchard: true,
      sapling: true,
      transparent: true,
    }),
  );
  bridge.getSeedInfo.mockResolvedValue(
    JSON.stringify({ seed_phrase: WALLET_SEED, birthday: WALLET_BIRTHDAY }),
  );
};

// The 2.0.21 double wrap: the file on disk is a Tink envelope around a Tink
// envelope, zingolib reads the inner header as the wallet version, and the
// native repair cannot peel it.
const walletFileEncryptedTwice = () => {
  bridge.loadExistingWallet.mockRejectedValue(
    new Error('Failed to read wallet version 11506714174589491496'),
  );
  bridge.walletFileDiagnosisInfo.mockResolvedValue(
    JSON.stringify({
      files: [
        {
          name: WALLET_FILE_NAME,
          state: 'doubleWrapped',
          size: 4096,
          mtime: 0,
          depth: 1,
          repairable: true,
          head: '28',
          unwrapErrors: [],
        },
      ],
    }),
  );
  bridge.repairDoubleWrappedWalletProcess.mockResolvedValue(
    JSON.stringify({ [WALLET_FILE_NAME]: 'failed' }),
  );
};

// The saved server's domain is gone, the registry is unreachable, and every
// listed server fails the same way.
const noServerDomainResolves = () => {
  bridge.getLatestBlockServerInfo.mockRejectedValue(
    new Error('dns error: failed to lookup address information'),
  );
  global.fetch = jest.fn(async () => {
    throw new TypeError('Network request failed');
  }) as unknown as typeof fetch;
};

// The error screen's apply runs on a zero timeout.
const flushTimers = () => new Promise(resolve => setTimeout(resolve, 0));

// The boot logic is under test, so the class is built and its mount handler
// called without rendering. React drops setState on an instance it never
// mounted, so the instance merges state itself and the probes read it back.
// A custom server keeps the boot off the picker.
const bootApp = (overrides: Record<string, unknown> = {}) => {
  const app = new LoadingAppClass({
    session: { kind: 'boot', startingApp: true, newWallet: false },
    openWallet: jest.fn(),
    openOnboarding: jest.fn(),
    openBoot: jest.fn(),
    openLock: jest.fn(),
    translate,
    language: LanguageEnum.en,
    server: remoteServer(SERVER_URI, ChainNameEnum.mainChainName),
    privacy: false,
    backgroundSyncInfo: { batches: 0, message: '', date: 0, dateEnd: 0 },
    firstLaunchingMessage: LaunchingModeEnum.opening,
    biometrics: true,
    selectServer: SelectServerEnum.custom,
    performanceLevel: RPCPerformanceLevelEnum.Medium,
    ...overrides,
  } as never);
  jest.spyOn(app, 'setState').mockImplementation((partial, callback) => {
    const next =
      typeof partial === 'function' ? partial(app.state, app.props) : partial;
    app.state = { ...app.state, ...next };
    callback?.();
  });
  return app;
};

describe('Capability canaries with every capability present', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    everyCapabilityPresent();
  });

  test('Tests that the wallet opens when the file loads, the gate passes, the server answers and the Keystore entry is well-formed.', async () => {
    const app = bootApp();

    await app.componentDidMount();

    expect(app.props.openWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        readOnly: false,
        walletChainName: ChainNameEnum.mainChainName,
      }),
    );
    expect(app.props.openLock).not.toHaveBeenCalled();
    expect(app.props.openOnboarding).not.toHaveBeenCalled();
  });

  test('Tests that the gate runs once and the open proceeds when the gate passes.', async () => {
    const app = bootApp();

    await app.componentDidMount();

    expect(resolveTriggerGate).toHaveBeenCalledTimes(1);
    expect(bridge.loadExistingWallet).toHaveBeenCalledTimes(1);
  });

  test('Tests that the saved server reaches the native open when the server answers.', async () => {
    const app = bootApp();

    await app.componentDidMount();

    expect(bridge.loadExistingWallet).toHaveBeenCalledWith(
      SERVER_URI,
      ChainNameEnum.mainChainName,
      expect.any(String),
      expect.any(String),
    );
  });

  test('Tests that the saved entry is offered as the recovery wallet when the Keystore entry is well-formed.', async () => {
    const app = bootApp();

    await app.componentDidMount();

    expect(app.state.recoveryWallet).toEqual({
      seed: SAVED_SEED,
      birthday: SAVED_BIRTHDAY,
    });
  });

  test('Tests that the Keystore entry is rewritten from the opened wallet when the open succeeds.', async () => {
    const app = bootApp();

    await app.componentDidMount();

    expect(JSON.parse(keystore.entry ?? '{}')).toEqual({
      seed: WALLET_SEED,
      birthday: WALLET_BIRTHDAY,
    });
  });

  test('Tests that the Welcome opens with the saved entry and no gate when there is no wallet file.', async () => {
    bridge.walletExists.mockResolvedValue('false');
    const app = bootApp();

    await app.componentDidMount();

    expect(app.props.openOnboarding).toHaveBeenCalledWith(Route.Welcome);
    expect(resolveTriggerGate).not.toHaveBeenCalled();
    expect(app.state.recoveryWallet).toEqual({
      seed: SAVED_SEED,
      birthday: SAVED_BIRTHDAY,
    });
  });
});

// Each failure below is one switch on the scenario above and names the
// field report it guards against. The capabilities named must remain
// reachable under that failure, and under all four at once. The stack on
// issue #1723 turns each remaining entry into a test.
describe('Capabilities that survive a failure', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    everyCapabilityPresent();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  // zecwallet-lite #13 and zingo-mobile PR #1301: a wallet encrypted twice
  // must never hide the ways back to the funds.
  test('Tests that the error screen keeps its actions and the saved entry when the wallet file is encrypted twice. The lock never shows, and the error names the file state.', async () => {
    walletFileEncryptedTwice();
    const app = bootApp();

    await app.componentDidMount();
    await flushTimers();

    expect(bridge.repairDoubleWrappedWalletProcess).toHaveBeenCalledTimes(1);
    expect(app.props.openOnboarding).toHaveBeenCalledWith(Route.OpenError);
    expect(app.props.openLock).not.toHaveBeenCalled();
    expect(app.props.openWallet).not.toHaveBeenCalled();
    expect(app.state.walletError).toEqual({
      kind: 'open',
      details: expect.stringContaining(
        'loadingapp.walletfile-state-doubleWrapped',
      ),
    });
    expect(app.state.actionButtonsDisabled).toBe(false);
    expect(app.state.recoveryWallet).toEqual({
      seed: SAVED_SEED,
      birthday: SAVED_BIRTHDAY,
    });
  });

  // zecwallet-lite #240 and zingo-mobile #337: the saved server vanishing
  // must never keep the wallet from opening.
  test('Tests that the wallet opens on the default server when no server domain resolves in Automatic mode. The registry and every probe fail, and no error screen shows.', async () => {
    // Every probe fails at once, and its 15-second bound is left unarmed.
    jest.useFakeTimers();
    noServerDomainResolves();
    const fallback = defaultServer(translate, ChainNameEnum.mainChainName);
    const app = bootApp({ selectServer: SelectServerEnum.auto });

    await app.componentDidMount();
    jest.useRealTimers();

    expect(bridge.loadExistingWallet).toHaveBeenCalledWith(
      fallback?.uri,
      ChainNameEnum.mainChainName,
      expect.any(String),
      expect.any(String),
    );
    expect(app.props.openWallet).toHaveBeenCalledWith(
      expect.objectContaining({ walletChainName: ChainNameEnum.mainChainName }),
    );
    expect(app.props.openOnboarding).not.toHaveBeenCalled();
    expect(app.props.openLock).not.toHaveBeenCalled();
  });

  // zingo-mobile #618, #1136 and #1266: only a decline locks. A gate that
  // cannot run fails open with one notice.
  test('Tests that the wallet opens with one notice when the gate cannot run. An unsatisfiable entry or a wedged prompt is not a decline.', async () => {
    triggerGate.mockResolvedValueOnce({
      kind: 'failedOpen',
      failure: errorKeyed('biometrics-failure-notserved', '-25293'),
    });
    const app = bootApp();

    await app.componentDidMount();

    expect(triggerGate).toHaveBeenCalledTimes(1);
    expect(toast.show).toHaveBeenCalledTimes(1);
    expect(toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'appInfo' }),
    );
    expect(app.props.openLock).not.toHaveBeenCalled();
    expect(app.props.openWallet).toHaveBeenCalledWith(
      expect.objectContaining({ walletChainName: ChainNameEnum.mainChainName }),
    );
  });

  // zingo-mobile #1718, the OEM Keystore loss: the entry belongs to a
  // feature the user may never use, and its failure stays its own.
  test('Tests that the wallet opens and the entry is rewritten when the Keystore entry does not parse. A Keystore that throws on every call opens the wallet the same way.', async () => {
    keystore.entry = '(\u0001tink-envelope-not-json';
    const unparseable = bootApp();

    await unparseable.componentDidMount();

    expect(unparseable.state.recoveryWallet).toBeNull();
    expect(unparseable.props.openLock).not.toHaveBeenCalled();
    expect(unparseable.props.openWallet).toHaveBeenCalledWith(
      expect.objectContaining({ walletChainName: ChainNameEnum.mainChainName }),
    );
    expect(JSON.parse(keystore.entry ?? '{}')).toEqual({
      seed: WALLET_SEED,
      birthday: WALLET_BIRTHDAY,
    });

    keystoreThrows();
    const lost = bootApp();

    await lost.componentDidMount();

    expect(lost.state.recoveryWallet).toBeNull();
    expect(lost.props.openLock).not.toHaveBeenCalled();
    expect(lost.props.openOnboarding).not.toHaveBeenCalled();
    expect(lost.props.openWallet).toHaveBeenCalledWith(
      expect.objectContaining({ walletChainName: ChainNameEnum.mainChainName }),
    );
  });

  test.todo(
    'Tests that the saved entry is still offered when the wallet file is encrypted twice.',
  );
  test.todo(
    'Tests that the sync status bar reports the server and offers a retry when the server domain does not resolve.',
  );
  test.todo(
    'Tests that the lock keeps retry and report when the gate is declined.',
  );
  test.todo(
    'Tests that the Welcome offers create and restore with one line when the Keystore entry holds a field that does not parse.',
  );
  test.todo(
    'Tests that the lock keeps retry and report when all four failures are hit and the gate is declined.',
  );
  test.todo(
    'Tests that the error screen keeps retry, the Server screen, import, create and report when all four failures are hit and the gate cannot run.',
  );
});
