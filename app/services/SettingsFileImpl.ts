import { readAppFile, writeAppFile } from '@app/services/appFiles';
import {
  ChainNameEnum,
  SelectServerEnum,
  ServerType,
  ServerUrisType,
  SettingsFileClass,
  SettingsNameEnum,
  BlockExplorerEnum,
  nativeUri,
  offlineServer,
  remoteServer,
} from '@app/AppState';
import { serverUris } from '@app/uris';
import { defaultTo, isEmpty, isEqual, omit, pick } from 'lodash';
import {
  activeWalletEntry,
  updateWalletMeta,
  WalletMeta,
  WalletMetaPatch,
} from '@app/walletBackend/utils/walletStore';

type ServerWire = { uri: string; chainName: ChainNameEnum };
type SelectServerWire = SelectServerEnum | 'offline';
type SettingsWire = Omit<SettingsFileClass, 'server' | 'selectServer'> & {
  server: ServerWire;
  selectServer: SelectServerWire;
};
type ServerSettings = Pick<SettingsFileClass, 'server' | 'selectServer'>;

/** Settings each wallet keeps in its meta, which a wallet without them reads as these defaults. */
const WALLET_FLAGS = [
  'seedBackedUp',
  'seedBackedUpAt',
  'viewOnlyNoticeDismissed',
] as const;
const WALLET_FIELDS = ['server', 'selectServer', ...WALLET_FLAGS] as const;
const DEFAULT_FLAGS = {
  seedBackedUp: false,
  seedBackedUpAt: 0,
  viewOnlyNoticeDismissed: false,
};

const defaultWire = (): ServerWire => ({
  uri: serverUris(() => {})[0].uri,
  chainName: serverUris(() => {})[0].chainName,
});

const listed = (wire: ServerWire, filter: (s: ServerUrisType) => boolean) =>
  serverUris(() => {})
    .filter(filter)
    .some((s: ServerUrisType) =>
      isEqual({ uri: s.uri, chainName: s.chainName }, wire),
    );

/** Encodes a server choice as the empty-uri form the native background sync reads. */
const encodeServer = (
  server: ServerType,
  selectServer: SelectServerEnum,
): Pick<SettingsWire, 'server' | 'selectServer'> => ({
  server: { uri: nativeUri(server), chainName: server.chainName },
  selectServer: server.kind === 'offline' ? 'offline' : selectServer,
});

/** Decodes the stored server and selection into one server choice and its remote mode. */
const decodeServer = (
  server: ServerWire,
  selectServer: SelectServerWire,
): ServerSettings => {
  if (selectServer === 'offline') {
    return {
      server: offlineServer(server.chainName),
      selectServer: SelectServerEnum.auto,
    };
  }
  const remote = server.uri ? server : defaultWire();
  return {
    server: remoteServer(remote.uri, remote.chainName),
    selectServer: Object.values(SelectServerEnum).includes(selectServer)
      ? selectServer
      : SelectServerEnum.auto,
  };
};

/** The listed default server of a network, the first listed one when it has none. */
const defaultWireFor = (chain: ChainNameEnum | undefined): ServerWire => {
  const found = serverUris(() => {}).find(
    s => s.chainName === chain && s.default && !s.obsolete,
  );
  return found ? { uri: found.uri, chainName: found.chainName } : defaultWire();
};

/** Whether a migration gave the wallet a listed server of another network, its chain unrecorded beside the uri. */
const misplaced = (meta: WalletMetaPatch): boolean => {
  const chains = serverUris(() => {})
    .filter(s => s.uri === meta.server?.uri)
    .map(s => s.chainName);
  return (
    !meta.server?.chainName &&
    !!meta.chain &&
    chains.length > 0 &&
    !chains.includes(meta.chain)
  );
};

/** The wallet's own server, its network's default in Automatic when it has none, and that default too when the list marks its server obsolete and the user did not set it as custom. */
const walletServer = (stored: WalletMetaPatch): ServerSettings => {
  const meta: WalletMetaPatch = misplaced(stored)
    ? omit(stored, ['server', 'selectServer'])
    : stored;
  const fallback = defaultWireFor(meta.chain);
  const server: ServerWire = meta.server
    ? {
        uri: meta.server.uri,
        chainName: meta.server.chainName || meta.chain || fallback.chainName,
      }
    : fallback;
  const mode = (
    meta.server
      ? defaultTo(meta.selectServer, SelectServerEnum.auto)
      : SelectServerEnum.auto
  ) as SelectServerWire;
  const replacement = serverUris(() => {}).find(
    s => s.default && !s.obsolete && s.chainName === server.chainName,
  );
  if (
    mode !== SelectServerEnum.custom &&
    mode !== 'offline' &&
    replacement &&
    listed(server, s => s.obsolete)
  ) {
    return decodeServer(
      { uri: replacement.uri, chainName: replacement.chainName },
      SelectServerEnum.auto,
    );
  }
  return decodeServer(server, mode);
};

export default class SettingsFileImpl {
  // Writes run one at a time. Every write is a read-modify-write of the
  // same file, so two of them in flight both rebuild it from the contents
  // they read before either landed, and whichever finishes last drops the
  // other one's key. On a first launch that is how a setting could be lost
  // to the `firstInstall` write that follows it, leaving the next launch
  // reading a file that never recorded it.
  private static writeQueue: Promise<void> = Promise.resolve();

  static async writeSettings(
    name: Exclude<
      SettingsNameEnum,
      SettingsNameEnum.server | SettingsNameEnum.selectServer
    >,
    value: string | boolean | number,
  ): Promise<void> {
    return this.writePatch({ [name]: value });
  }

  /** Persists the server choice and its remote mode in one write. */
  static async writeServer(
    server: ServerType,
    selectServer: SelectServerEnum,
  ): Promise<void> {
    return this.writePatch(encodeServer(server, selectServer));
  }

  /**
   * The server and the wallet flags go to the active wallet's meta. With no
   * wallet active the server is not kept, and the flags go to the file for
   * the next read to move them.
   */
  private static async writePatch(patch: Partial<SettingsWire>): Promise<void> {
    const walletPart = pick(patch, WALLET_FIELDS);
    if (!isEmpty(walletPart)) {
      const entry = await activeWalletEntry();
      const written =
        entry.kind === 'wallet'
          ? await updateWalletMeta(entry.wallet.id, walletPart)
          : undefined;
      if (written?.ok) {
        patch = omit(patch, WALLET_FIELDS);
      } else {
        if (written) {
          console.log('settings write meta:', written.error.message);
        }
        patch = omit(patch, ['server', 'selectServer']);
      }
    }
    if (isEmpty(patch)) {
      return;
    }
    return this.rewrite(settings => ({ ...settings, ...patch }));
  }

  private static async rewrite(
    change: (settings: SettingsWire) => SettingsWire,
  ): Promise<void> {
    const write = this.writeQueue.then(async () => {
      const newSettings = change(await this.readWire());

      try {
        await writeAppFile('settings.json', JSON.stringify(newSettings));
      } catch (err) {
        // A settings write that cannot land must not break the caller, and
        // must not wedge the queue for every write after it either.
        console.log('settings write file:', (err as Error).message);
      }
    });
    this.writeQueue = write;
    return write;
  }

  /** The file's settings with the active wallet's own on top, defaulted when the wallet has none. */
  static async readSettings(): Promise<SettingsFileClass> {
    const file = await this.readWire();
    const entry = await activeWalletEntry();
    const meta =
      entry.kind === 'wallet'
        ? await this.adoptFileSettings(entry.wallet.id, entry.wallet.meta, file)
        : {};
    const flags = {
      ...DEFAULT_FLAGS,
      ...(entry.kind === 'wallet' ? {} : pick(file, WALLET_FLAGS)),
      ...pick(meta, WALLET_FLAGS),
    };
    const rest = { ...omit(file, ['server', 'selectServer']), ...flags };
    if (entry.kind !== 'wallet') {
      return rest as SettingsFileClass;
    }
    return { ...rest, ...walletServer(meta) } as SettingsFileClass;
  }

  /** Keeps a server choice in a wallet's meta, for a wallet that is not the open one. */
  static async writeWalletServer(
    walletId: string,
    server: ServerType,
    selectServer: SelectServerEnum,
  ): Promise<boolean> {
    const written = await updateWalletMeta(
      walletId,
      encodeServer(server, selectServer),
    );
    return written.ok;
  }

  /** A wallet's server and its remote mode, read from its meta before it opens. */
  static async serverOf(meta: WalletMetaPatch): Promise<ServerSettings> {
    return walletServer(meta);
  }

  /** Moves the server and flags a single-wallet file still holds into the wallet's meta, once, then drops them from the file. */
  private static async adoptFileSettings(
    walletId: string,
    meta: WalletMeta,
    file: SettingsWire,
  ): Promise<WalletMetaPatch> {
    const inFile = pick(file, WALLET_FIELDS);
    if (isEmpty(inFile)) {
      return meta;
    }
    const missing = omit(inFile, Object.keys(pick(meta, WALLET_FIELDS)));
    const written = isEmpty(missing)
      ? ({ ok: true, value: meta } as const)
      : await updateWalletMeta(walletId, missing);
    if (!written.ok) {
      console.log('settings move flags:', written.error.message);
      return { ...meta, ...missing } as WalletMetaPatch;
    }
    await this.rewrite(
      settings => omit(settings, WALLET_FIELDS) as SettingsWire,
    );
    return written.value;
  }

  private static async readWire(): Promise<SettingsWire> {
    try {
      const file = await readAppFile('settings.json');
      if (file.kind === 'missing') {
        console.log('settings read file: The file does not exists');
        const settings: SettingsWire = {
          firstInstall: true,
          version: null,
        } as SettingsWire;
        return settings;
      }

      const settings: SettingsWire = JSON.parse(file.text);
      // If server as string is found, I need to convert to: ServerWire
      // if not, I'm losing the value
      if (!settings.hasOwnProperty(SettingsNameEnum.server)) {
        settings.server = defaultWire();
      } else {
        if (typeof settings.server === 'string') {
          const ss: ServerWire = {
            uri: settings.server,
            chainName: ChainNameEnum.mainChainName,
          };
          // here probably the user have a cumtom server, but we don't know
          // what is the chainName -> we assign the default server.
          settings.server = listed(ss, () => true) ? ss : defaultWire();
        } else {
          if (settings.server.uri && !settings.server.chainName) {
            // Only repair a REAL server (non-empty uri) that is missing its
            // chain. A chainless offline server is LoadingApp's to settle.
            settings.server = {
              uri: settings.server.uri,
              chainName: ChainNameEnum.mainChainName,
            };
          }
        }
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.version)) {
        // here we know the user is updating the App, for sure.
        // from some version before.
        settings.version = '';
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.biometrics)) {
        // The per-screen options collapse into one switch: it stays on if
        // any of them was on.
        const legacy = (settings as unknown as Record<string, unknown>)
          .security;
        settings.biometrics =
          legacy && typeof legacy === 'object'
            ? Object.values(legacy).some(Boolean)
            : true;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.selectServer)) {
        // First launch with server selection. Inference is chain-aware: every
        // match below compares BOTH uri and chainName (isEqual on ServerType),
        // so a testnet server is evaluated against the testnet entries exactly
        // like a mainnet one is against the mainnet entries. Cases:
        // - server empty -> offline
        // - obsolete server (any chain) -> auto
        // - default server (mainnet or testnet) -> auto
        // - non-default listed server (any chain) -> list
        // - server not in the list (any chain) -> custom
        if (!settings.server.uri) {
          settings.selectServer = 'offline';
        } else if (listed(settings.server, s => s.obsolete)) {
          // obsolete servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        } else if (listed(settings.server, s => s.default)) {
          // default servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        } else if (listed(settings.server, () => true)) {
          // new servers (not default & not obsolete) -> in the list - the user changed the default server in some point
          settings.selectServer = SelectServerEnum.list;
        } else {
          // not in the list (any chain) -> the user set some other server → custom.
          settings.selectServer = SelectServerEnum.custom;
        }
      } else {
        // this is not the first time, but I have to change the obsolete servers to `auto`.
        // do nothing if the user select a obsolte one as a custom server, this is user's choice.
        if (
          listed(settings.server, s => s.obsolete) &&
          settings.selectServer !== SelectServerEnum.custom
        ) {
          // obsolete servers -> auto - to make easier and faster UX to the user
          settings.selectServer = SelectServerEnum.auto;
        }
      }
      // Settings the App no longer asks about are dropped from the file the
      // first time an older settings.json loads: the donation flags of the
      // old tip feature, the two switches that used to hide the MAX button
      // and the Rescan menu entry, both always there now, the currency
      // choice, now always USD, the Nym switch: every transmission travels
      // the mixnet, so there is nothing left to choose, the mode, along
      // with the first-view-seed flag only the basic mode ever wrote, and
      // the per-screen security options, now the one biometrics switch, and
      // the switch that kept the recovery info off the device: it is always
      // stored now, and the first start after the update writes it, and the
      // performance level: every wallet syncs at the default one.
      const obsolete = settings as unknown as Record<string, unknown>;
      delete obsolete.donation;
      delete obsolete.firstUpdateWithDonation;
      delete obsolete.sendAll;
      delete obsolete.rescanMenu;
      delete obsolete.currency;
      delete obsolete.nym;
      delete obsolete.mode;
      delete obsolete.basicFirstViewSeed;
      delete obsolete.security;
      delete obsolete.recoveryWalletInfoOnDevice;
      delete obsolete.performanceLevel;
      if (!settings.hasOwnProperty(SettingsNameEnum.blockExplorer)) {
        // by default Zcashexplorer
        settings.blockExplorer = BlockExplorerEnum.Zcashexplorer;
      } else if ((settings.blockExplorer as string) === 'Cipherscan') {
        // Cipherscan was renamed ZecBlock (zecblock.com); keep the user's choice.
        settings.blockExplorer = BlockExplorerEnum.ZecBlock;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.ironwoodOnboardSeen)) {
        // the wallet hasn't shown the "Meet Ironwood" onboarding yet; it
        // launches once, the first time spendable Orchard funds are detected.
        settings.ironwoodOnboardSeen = false;
      }
      return settings;
    } catch (err) {
      // The File doesn't exist, so return nothing
      // Here I know 100% it is a fresh install or the user cleaned the device staorage
      console.log('settings read file:', err);
      const settings: SettingsWire = {
        firstInstall: true,
        version: null,
      } as SettingsWire;
      return settings;
    }
  }
}
