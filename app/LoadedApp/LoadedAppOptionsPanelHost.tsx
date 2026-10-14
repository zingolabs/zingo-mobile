import React, { useContext, useEffect, useMemo, useState } from 'react';
import type { NavigatorScreenParams } from '@react-navigation/native';

import { OptionsPanelHost } from '@screens/OptionsPanel';
import type {
  OptionsPanelAction,
  OptionsPanelSocial,
} from '@screens/OptionsPanel';
import { closeOptionsPanel, useOptionsPanel } from '@app/context/optionsPanel';
import { navigateWallet } from '@app/navigation/navigate';
import { probeUri } from '@app/services/serverPicking';
import { ContextAppLoaded } from '@app/context';
import { MenuItemEnum, Route } from '@app/AppState';
import { AppDrawerParamList } from '@app/types';
import { sendEmail } from '@app/services/sendEmail';
import ServerIcon from '@ui/widgets/ServerIcon';

import AddressBookIcon from '../../assets/img/options/address-book.svg';
import WalletSeedIcon from '../../assets/img/options/wallet-seed.svg';
import RescanIcon from '../../assets/img/options/rescan.svg';
import SyncRescanReportIcon from '../../assets/img/options/sync-rescan-report.svg';
import FundsPoolsIcon from '../../assets/img/options/funds-pools.svg';
import FinancialInsightIcon from '../../assets/img/options/financial-insight.svg';
import SwitchWalletIcon from '../../assets/img/options/switch-wallet.svg';

const SOCIAL_X_URL = 'https://x.com/ZingoLabs';
const SOCIAL_GITHUB_URL = 'https://github.com/zingolabs/zingo-mobile';

// Legacy `menu.*` testID slugs, kept stable across the drawer→OptionsPanel
// migration. The Maestro flows (.maestro/*.yaml) select by these slugs.
// Add a new entry here when a new MenuItemEnum surfaces in the grid.
const MENU_TEST_IDS: Partial<Record<MenuItemEnum, string>> = {
  [MenuItemEnum.AddressBook]: 'menu.addressbook',
  [MenuItemEnum.WalletSeedUfvk]: 'menu.walletseedufvk',
  [MenuItemEnum.Rescan]: 'menu.rescan',
  [MenuItemEnum.SyncReport]: 'menu.syncreport',
  [MenuItemEnum.FundPools]: 'menu.fundpools',
  [MenuItemEnum.Insight]: 'menu.insight',
  [MenuItemEnum.ChangeWallet]: 'menu.changewallet',
  [MenuItemEnum.Server]: 'menu.server',
};

type PanelItem =
  | MenuItemEnum.AddressBook
  | MenuItemEnum.WalletSeedUfvk
  | MenuItemEnum.Rescan
  | MenuItemEnum.SyncReport
  | MenuItemEnum.FundPools
  | MenuItemEnum.Insight
  | MenuItemEnum.ChangeWallet
  | MenuItemEnum.Server
  | MenuItemEnum.Settings;

/** The wallet screen a panel item opens. */
const walletScreen = (
  item: PanelItem,
  readOnly: boolean,
): NavigatorScreenParams<AppDrawerParamList> => {
  switch (item) {
    case MenuItemEnum.AddressBook:
      return { screen: Route.AddressBook };
    case MenuItemEnum.WalletSeedUfvk:
      return readOnly
        ? { screen: Route.ViewingKey, params: { entry: { kind: 'push' } } }
        : { screen: Route.WalletSeed };
    case MenuItemEnum.Rescan:
      return { screen: Route.Rescan };
    case MenuItemEnum.SyncReport:
      return { screen: Route.SyncReport };
    case MenuItemEnum.FundPools:
      return { screen: Route.Pools };
    case MenuItemEnum.Insight:
      return { screen: Route.Insight };
    case MenuItemEnum.ChangeWallet:
      return { screen: Route.WalletSeed, params: { action: 'change' } };
    case MenuItemEnum.Server:
      return { screen: Route.Server };
    case MenuItemEnum.Settings:
      return { screen: Route.Settings };
  }
};

type LoadedAppOptionsPanelHostProps = {
  children: React.ReactNode;
};

/**
 * Wires the global OptionsPanel content for the LoadedApp tree: builds the
 * actions grid from MenuItemEnum, the 3 socials (X / GitHub copy-URL, mail
 * launches the device composer). An item sinks the panel under the screen
 * it pushes, so the panel is there again when that screen pops.
 */
const LoadedAppOptionsPanelHost: React.FC<LoadedAppOptionsPanelHostProps> = ({
  children,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    addLastSnackbar,
    readOnly,
    server,
    netInfo,
    seedBackedUp,
    zingolibVersion,
  } = context;
  const { isOpen, sink } = useOptionsPanel();

  // The Server tile's dot turns red when the server doesn't answer; it is
  // asked each time the panel opens.
  const [unreachable, setUnreachable] = useState(false);
  useEffect(() => {
    if (!isOpen || server.kind !== 'remote' || !netInfo.isConnected) {
      return;
    }
    let live = true;
    (async () => {
      const probe = await probeUri(server.uri);
      if (live) {
        setUnreachable(probe.latency === null);
      }
    })();
    return () => {
      live = false;
    };
  }, [isOpen, server, netInfo.isConnected]);

  // Audit Issue D — bio gates moved into the destination screens
  // themselves (WalletSeed.tsx, ViewingKey.tsx, Rescan.tsx, Settings.tsx) so
  // every navigation path is funnelled through the same check.
  const dispatch = useMemo(
    () => (item: PanelItem) => {
      sink();
      navigateWallet(walletScreen(item, readOnly));
    },
    [sink, readOnly],
  );

  // Visibility rules mirror the legacy Menu.tsx so the grid behaves the
  // same: the two items that talk to a server are the only ones the panel
  // ever hides.
  const actions = useMemo<OptionsPanelAction[]>(() => {
    const isOffline = server.kind === 'offline';

    const showRescan = !isOffline;
    const showSyncReport = !isOffline;
    const list: OptionsPanelAction[] = [];

    // AddressBook — always visible.
    list.push({
      id: MenuItemEnum.AddressBook,
      testID: MENU_TEST_IDS[MenuItemEnum.AddressBook],
      label: translate('loadedapp.addressbook') as string,
      icon: <AddressBookIcon width={28} height={28} />,
      onPress: () => dispatch(MenuItemEnum.AddressBook),
    });

    // Same label-rule as Menu.tsx: 'seed' vs 'ufvk' depending on readOnly.
    list.push({
      id: MenuItemEnum.WalletSeedUfvk,
      testID: MENU_TEST_IDS[MenuItemEnum.WalletSeedUfvk],
      label: readOnly
        ? (translate('loadedapp.walletufvk') as string)
        : (translate('loadedapp.walletseed') as string),
      icon: <WalletSeedIcon width={28} height={28} />,
      badge: !readOnly && !seedBackedUp,
      onPress: () => dispatch(MenuItemEnum.WalletSeedUfvk),
    });

    if (showRescan) {
      list.push({
        id: MenuItemEnum.Rescan,
        testID: MENU_TEST_IDS[MenuItemEnum.Rescan],
        label: translate('loadedapp.rescanwallet') as string,
        icon: <RescanIcon width={30} height={30} />,
        onPress: () => dispatch(MenuItemEnum.Rescan),
      });
    }

    if (showSyncReport) {
      list.push({
        id: MenuItemEnum.SyncReport,
        testID: MENU_TEST_IDS[MenuItemEnum.SyncReport],
        label: translate('loadedapp.report') as string,
        icon: <SyncRescanReportIcon width={30} height={30} />,
        onPress: () => dispatch(MenuItemEnum.SyncReport),
      });
    }

    list.push({
      id: MenuItemEnum.FundPools,
      testID: MENU_TEST_IDS[MenuItemEnum.FundPools],
      label: translate('loadedapp.fundpools') as string,
      icon: <FundsPoolsIcon width={30} height={30} />,
      onPress: () => dispatch(MenuItemEnum.FundPools),
    });

    list.push({
      id: MenuItemEnum.Insight,
      testID: MENU_TEST_IDS[MenuItemEnum.Insight],
      label: translate('loadedapp.insight') as string,
      icon: <FinancialInsightIcon width={30} height={30} />,
      onPress: () => dispatch(MenuItemEnum.Insight),
    });

    // Change wallet is a local operation (switch the loaded wallet, opened via
    // init_from_b64 which works Offline), so it needs neither connectivity nor
    // an online server.
    list.push({
      id: MenuItemEnum.ChangeWallet,
      testID: MENU_TEST_IDS[MenuItemEnum.ChangeWallet],
      label: translate('loadedapp.changewallet') as string,
      icon: <SwitchWalletIcon width={30} height={30} />,
      onPress: () => dispatch(MenuItemEnum.ChangeWallet),
    });

    // Server — always visible, always last; its dot says how Zingo connects.
    list.push({
      id: MenuItemEnum.Server,
      testID: MENU_TEST_IDS[MenuItemEnum.Server],
      label: translate('server.title') as string,
      icon: (
        <ServerIcon
          noInternet={!netInfo.isConnected}
          unreachable={unreachable}
          offline={isOffline}
          background="#111c2c"
        />
      ),
      onPress: () => dispatch(MenuItemEnum.Server),
    });

    return list;
  }, [
    translate,
    dispatch,
    readOnly,
    seedBackedUp,
    server,
    netInfo,
    unreachable,
  ]);

  const socials = useMemo<OptionsPanelSocial[]>(
    () => [
      { id: 'x', url: SOCIAL_X_URL },
      { id: 'github', url: SOCIAL_GITHUB_URL },
      {
        id: 'mail',
        onPress: () => {
          closeOptionsPanel();
          sendEmail(translate, zingolibVersion);
        },
      },
    ],
    [translate, zingolibVersion],
  );

  return (
    <OptionsPanelHost
      title={translate('loadedapp.options') as string}
      actions={actions}
      socials={socials}
      onLinkCopied={() => addLastSnackbar(translate('linkcopied') as string)}
      onClose={closeOptionsPanel}
      onSettings={() => dispatch(MenuItemEnum.Settings)}
    >
      {children}
    </OptionsPanelHost>
  );
};

export default LoadedAppOptionsPanelHost;
