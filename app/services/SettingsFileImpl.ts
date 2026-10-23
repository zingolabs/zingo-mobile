import * as RNFS from 'react-native-fs';

import {
  ChainNameEnum,
  GlobalConst,
  SelectServerEnum,
  ServerType,
  SettingsFileClass,
  SettingsNameEnum,
  BlockExplorerEnum,
  nativeUri,
  offlineServer,
  remoteServer,
} from '@app/AppState';
import { defaultIndexer, loadDefaultIndexer } from '@app/uris/defaultIndexer';
import { RPCPerformanceLevelEnum } from '@app/walletBackend/enums/RPCPerformanceLevelEnum';

type ServerWire = { uri: string; chainName: ChainNameEnum };
// 'list' is the retired mode of a server picked from the list this app no
// longer offers.
type SelectServerWire = SelectServerEnum | 'offline' | 'list';
type SettingsWire = Omit<SettingsFileClass, 'server' | 'selectServer'> & {
  server: ServerWire;
  selectServer: SelectServerWire;
};
type ServerSettings = Pick<SettingsFileClass, 'server' | 'selectServer'>;

// Mainnet's Default Indexer as the Binding Layer answered it; null until
// `loadDefaultIndexer` has run, which `readSettings` does first.
const defaultWire = (): ServerWire | null => {
  const uri = defaultIndexer(ChainNameEnum.mainChainName);
  return uri ? { uri, chainName: ChainNameEnum.mainChainName } : null;
};

const isDefault = (wire: ServerWire) =>
  !!wire.uri && wire.uri === defaultIndexer(wire.chainName);

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
  if (!remote) {
    return {
      server: offlineServer(server.chainName),
      selectServer: SelectServerEnum.auto,
    };
  }
  const mode: SelectServerEnum =
    selectServer === 'list'
      ? isDefault(remote)
        ? SelectServerEnum.auto
        : SelectServerEnum.custom
      : Object.values(SelectServerEnum).includes(selectServer)
        ? selectServer
        : SelectServerEnum.auto;
  return {
    server: remoteServer(remote.uri, remote.chainName),
    selectServer: mode,
  };
};

export default class SettingsFileImpl {
  static async getFileName() {
    return RNFS.DocumentDirectoryPath + '/settings.json';
  }

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

  private static async writePatch(patch: Partial<SettingsWire>): Promise<void> {
    const write = this.writeQueue.then(async () => {
      const fileName = await this.getFileName();
      const settings = await this.readWire();
      const newSettings: SettingsWire = { ...settings, ...patch };

      try {
        await RNFS.writeFile(
          fileName,
          JSON.stringify(newSettings),
          GlobalConst.utf8,
        );
      } catch (err) {
        // A settings write that cannot land must not break the caller, and
        // must not wedge the queue for every write after it either.
        console.log('settings write file:', (err as Error).message);
      }
    });
    this.writeQueue = write;
    return write;
  }

  static async readSettings(): Promise<SettingsFileClass> {
    await loadDefaultIndexer(ChainNameEnum.mainChainName);
    const { server, selectServer, ...rest } = await this.readWire();
    return server
      ? { ...rest, ...decodeServer(server, selectServer) }
      : (rest as SettingsFileClass);
  }

  private static async readWire(): Promise<SettingsWire> {
    try {
      const fileName = await this.getFileName();
      const fileExits: boolean = await RNFS.exists(fileName);
      if (!fileExits) {
        console.log('settings read file: The file does not exists');
        const settings: SettingsWire = {
          firstInstall: true,
          version: null,
        } as SettingsWire;
        return settings;
      }

      const settings: SettingsWire = await JSON.parse(
        (await RNFS.readFile(fileName, GlobalConst.utf8)).toString(),
      );
      // If server as string is found, I need to convert to: ServerWire
      // if not, I'm losing the value
      if (!settings.hasOwnProperty(SettingsNameEnum.server)) {
        settings.server = defaultWire() ?? {
          uri: '',
          chainName: ChainNameEnum.mainChainName,
        };
      } else {
        if (typeof settings.server === 'string') {
          const ss: ServerWire = {
            uri: settings.server,
            chainName: ChainNameEnum.mainChainName,
          };
          // A server stored as a bare string predates chains; it was mainnet.
          settings.server = ss;
        } else {
          if (settings.server.uri && !settings.server.chainName) {
            // Only repair a REAL server (non-empty uri) that is missing its
            // chain. An offline server (uri '') legitimately has an empty
            // chainName — Offline has no chain; the real one is derived from
            // the wallet at open time. Forcing mainnet here broke testnet
            // wallets going Offline.
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
        // First launch with server selection: no server is offline, the
        // Default Indexer is Automatic, and any other server is the user's
        // custom one.
        settings.selectServer = !settings.server.uri
          ? 'offline'
          : isDefault(settings.server)
            ? SelectServerEnum.auto
            : SelectServerEnum.custom;
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
      // stored now, and the first start after the update writes it.
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
      if (!settings.hasOwnProperty(SettingsNameEnum.performanceLevel)) {
        // by default medium
        settings.performanceLevel = RPCPerformanceLevelEnum.Medium;
      }
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
      if (!settings.hasOwnProperty(SettingsNameEnum.seedBackedUp)) {
        settings.seedBackedUp = false;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.seedBackedUpAt)) {
        settings.seedBackedUpAt = 0;
      }
      if (!settings.hasOwnProperty(SettingsNameEnum.viewOnlyNoticeDismissed)) {
        settings.viewOnlyNoticeDismissed = false;
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
