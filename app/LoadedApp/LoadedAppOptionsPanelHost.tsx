import React, { useContext, useEffect, useMemo, useState } from 'react';

import { OptionsPanelHost } from '../../components/OptionsPanel';
import type {
  OptionsPanelAction,
  OptionsPanelSocial,
} from '../../components/OptionsPanel';
import { closeOptionsPanel, useOptionsPanel } from '../context/optionsPanel';
import { ContextAppLoaded } from '../context';
import { MenuItemEnum, ModeEnum, SelectServerEnum } from '../AppState';
import { sendEmail } from '../sendEmail';
import { walletBackupExists } from '../walletBackend';
import { getZingoLogo, getZingoName } from '../utils/ZingoAppData';
import { advancedTokens, basicTokens } from '../theme';

import AddressBookIcon from '../../assets/img/options/address-book.svg';
import AddressBookBasicIcon from '../../assets/img/options/address-book-basic.svg';
import WalletSeedIcon from '../../assets/img/options/wallet-seed.svg';
import WalletSeedBasicIcon from '../../assets/img/options/wallet-seed-basic.svg';
import RescanIcon from '../../assets/img/options/rescan.svg';
import SyncRescanReportIcon from '../../assets/img/options/sync-rescan-report.svg';
import FundsPoolsIcon from '../../assets/img/options/funds-pools.svg';
import FinancialInsightIcon from '../../assets/img/options/financial-insight.svg';
import FinancialInsightBasicIcon from '../../assets/img/options/financial-insight-basic.svg';
import RestoreBackupIcon from '../../assets/img/options/restore-backup.svg';
import SwitchWalletIcon from '../../assets/img/options/switch-wallet.svg';
import LoadWalletFromSeedBasicIcon from '../../assets/img/options/switch-wallet-basic.svg';

const SOCIAL_X_URL = 'https://x.com/ZingoLabs';
const SOCIAL_GITHUB_URL = 'https://github.com/zingolabs/zingo-mobile';

// Legacy `menu.*` testID slugs, kept stable across the drawer→OptionsPanel
// migration so existing Maestro flows (.maestro/*.yaml) and the detox
// helper (e2e/e2e-utils/loadTestWallet.js) continue to resolve their
// selectors. Add a new entry here when a new MenuItemEnum surfaces in
// the grid.
const MENU_TEST_IDS: Partial<Record<MenuItemEnum, string>> = {
  [MenuItemEnum.AddressBook]: 'menu.addressbook',
  [MenuItemEnum.WalletSeedUfvk]: 'menu.walletseedufvk',
  [MenuItemEnum.Rescan]: 'menu.rescan',
  [MenuItemEnum.SyncReport]: 'menu.syncreport',
  [MenuItemEnum.FundPools]: 'menu.fundpools',
  [MenuItemEnum.Insight]: 'menu.insight',
  [MenuItemEnum.ChangeWallet]: 'menu.changewallet',
  [MenuItemEnum.LoadWalletFromSeed]: 'menu.loadwalletfromseed',
  [MenuItemEnum.RestoreWalletBackup]: 'menu.restorebackupwallet',
};

type LoadedAppOptionsPanelHostProps = {
  onMenuItemSelected: (item: MenuItemEnum) => void;
  setModeOption: (mode: ModeEnum) => Promise<void>;
  zingolibVersion: string;
  children: React.ReactNode;
};

/**
 * Wires the global OptionsPanel content for the LoadedApp tree: builds the
 * actions grid from MenuItemEnum, the 3 socials (X / GitHub copy-URL, mail
 * launches the device composer) and the mode-toggle pill at the bottom.
 * Stays in a functional component so it can consume ContextAppLoaded and the
 * OptionsPanel context naturally (LoadedApp itself is a class).
 */
const LoadedAppOptionsPanelHost: React.FC<LoadedAppOptionsPanelHostProps> = ({
  onMenuItemSelected,
  setModeOption,
  zingolibVersion,
  children,
}) => {
  const context = useContext(ContextAppLoaded);
  const {
    translate,
    mode,
    addLastSnackbar,
    readOnly,
    selectServer,
    netInfo,
    valueTransfersTotal,
    rescanMenu,
  } = context;
  const { isOpen } = useOptionsPanel();

  // Re-check the backup file each time the panel opens — same trigger as the
  // legacy drawer's `useDrawerStatus` effect.
  const [hasBackupWallet, setHasBackupWallet] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setHasBackupWallet(await walletBackupExists());
    })();
  }, [isOpen]);

  // Audit Issue D — bio gates moved into the destination screens
  // themselves (Seed.tsx, ShowUfvk.tsx, Rescan.tsx, Settings.tsx) so
  // every navigation path is funnelled through the same check. Dispatch
  // just closes the panel and forwards the menu selection.
  const dispatch = useMemo(
    () => (item: MenuItemEnum) => {
      closeOptionsPanel();
      onMenuItemSelected(item);
    },
    [onMenuItemSelected],
  );

  // Visibility rules mirror the legacy Menu.tsx so the grid behaves the
  // same: most "wallet-changing" items only make sense online + advanced,
  // and basic-mode with an empty wallet hides the seed/insight cells.
  const actions = useMemo<OptionsPanelAction[]>(() => {
    const isBasic = mode === ModeEnum.basic;
    const isOffline = selectServer === SelectServerEnum.offline;
    const isEmptyBasic =
      isBasic && valueTransfersTotal !== null && valueTransfersTotal === 0;

    const showSeedUfvk = !isEmptyBasic;
    // Legacy Menu.tsx parity: advanced + online + context-flag.
    const showRescan = !isBasic && !isOffline && rescanMenu;
    const showSyncReport = !isBasic && !isOffline;
    const showFundPools = !isBasic;
    const showInsight = !isEmptyBasic;
    const showRestoreBackup = !isBasic && hasBackupWallet;
    // Change wallet is a local operation (switch the loaded wallet, opened via
    // load_wallet_file which works Offline), so it needs neither connectivity nor
    // an online server.
    const showChangeWallet = !isBasic;
    // basic-only entries replicated from the legacy Menu.tsx.
    const showLoadWalletFromSeed =
      isBasic &&
      valueTransfersTotal !== null &&
      valueTransfersTotal === 0 &&
      netInfo.isConnected &&
      !isOffline;
    const list: OptionsPanelAction[] = [];

    // AddressBook — always visible.
    list.push({
      id: MenuItemEnum.AddressBook,
      testID: MENU_TEST_IDS[MenuItemEnum.AddressBook],
      label: translate('loadedapp.addressbook') as string,
      icon: isBasic ? (
        <AddressBookBasicIcon width={28} height={28} />
      ) : (
        <AddressBookIcon width={28} height={28} />
      ),
      onPress: () => dispatch(MenuItemEnum.AddressBook),
    });

    if (showSeedUfvk) {
      // Same label-rules as Menu.tsx: 'seed' vs 'ufvk' depending on
      // readOnly, and 'basic' suffix when the user is in basic mode.
      const label = readOnly
        ? isBasic
          ? (translate('loadedapp.walletufvk-basic') as string)
          : (translate('loadedapp.walletufvk') as string)
        : isBasic
          ? (translate('loadedapp.walletseed-basic') as string)
          : (translate('loadedapp.walletseed') as string);
      list.push({
        id: MenuItemEnum.WalletSeedUfvk,
        testID: MENU_TEST_IDS[MenuItemEnum.WalletSeedUfvk],
        label,
        icon: isBasic ? (
          <WalletSeedBasicIcon width={28} height={28} />
        ) : (
          <WalletSeedIcon width={28} height={28} />
        ),
        onPress: () => dispatch(MenuItemEnum.WalletSeedUfvk),
      });
    }

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

    if (showFundPools) {
      list.push({
        id: MenuItemEnum.FundPools,
        testID: MENU_TEST_IDS[MenuItemEnum.FundPools],
        label: translate('loadedapp.fundpools') as string,
        icon: <FundsPoolsIcon width={30} height={30} />,
        onPress: () => dispatch(MenuItemEnum.FundPools),
      });
    }

    if (showInsight) {
      list.push({
        id: MenuItemEnum.Insight,
        testID: MENU_TEST_IDS[MenuItemEnum.Insight],
        label: translate('loadedapp.insight') as string,
        icon: isBasic ? (
          <FinancialInsightBasicIcon width={30} height={30} />
        ) : (
          <FinancialInsightIcon width={30} height={30} />
        ),
        onPress: () => dispatch(MenuItemEnum.Insight),
      });
    }

    if (showChangeWallet) {
      list.push({
        id: MenuItemEnum.ChangeWallet,
        testID: MENU_TEST_IDS[MenuItemEnum.ChangeWallet],
        label: translate('loadedapp.changewallet') as string,
        icon: <SwitchWalletIcon width={30} height={30} />,
        onPress: () => dispatch(MenuItemEnum.ChangeWallet),
      });
    }

    if (showLoadWalletFromSeed) {
      list.push({
        id: MenuItemEnum.LoadWalletFromSeed,
        testID: MENU_TEST_IDS[MenuItemEnum.LoadWalletFromSeed],
        label: translate('loadedapp.loadwalletfromseed-basic') as string,
        icon: <LoadWalletFromSeedBasicIcon width={30} height={30} />,
        onPress: () => dispatch(MenuItemEnum.LoadWalletFromSeed),
      });
    }

    if (showRestoreBackup) {
      list.push({
        id: MenuItemEnum.RestoreWalletBackup,
        testID: MENU_TEST_IDS[MenuItemEnum.RestoreWalletBackup],
        label: translate('loadedapp.restorebackupwallet') as string,
        icon: <RestoreBackupIcon width={28} height={28} />,
        onPress: () => dispatch(MenuItemEnum.RestoreWalletBackup),
      });
    }

    return list;
  }, [
    translate,
    dispatch,
    mode,
    readOnly,
    selectServer,
    netInfo.isConnected,
    valueTransfersTotal,
    hasBackupWallet,
    rescanMenu,
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

  const modePill = useMemo(() => {
    const isBasic = mode === ModeEnum.basic;
    const target = isBasic ? ModeEnum.advanced : ModeEnum.basic;
    return {
      walletName: getZingoName(),
      targetModeLabel: translate(`settings.value-mode-${target}`) as string,
      targetModeColor: isBasic ? advancedTokens.fgAccent : basicTokens.fgAccent,
      logoSource: getZingoLogo(),
      // Intentionally NOT closing the panel — staying open lets the user
      // see the action grid change as it re-filters by the new mode.
      onToggle: () => setModeOption(target),
    };
  }, [mode, translate, setModeOption]);

  return (
    <OptionsPanelHost
      title={translate('loadedapp.options') as string}
      actions={actions}
      socials={socials}
      onLinkCopied={() => addLastSnackbar(translate('linkcopied') as string)}
      mode={modePill}
      onClose={closeOptionsPanel}
    >
      {children}
    </OptionsPanelHost>
  );
};

export default LoadedAppOptionsPanelHost;
