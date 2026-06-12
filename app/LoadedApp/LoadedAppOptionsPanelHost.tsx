import React, { useContext, useEffect, useMemo, useState } from 'react';

import { OptionsPanelHost } from '../../components/OptionsPanel';
import type {
  OptionsPanelAction,
  OptionsPanelSocial,
} from '../../components/OptionsPanel';
import { closeOptionsPanel, useOptionsPanel } from '../context/optionsPanel';
import { ContextAppLoaded } from '../context';
import { MenuItemEnum, ModeEnum, SelectServerEnum } from '../AppState';
import simpleBiometrics from '../simpleBiometrics';
import { sendEmail } from '../sendEmail';
import { walletBackupExists } from '../walletBackend';
import { getZingoLogo, getZingoName } from '../utils/ZingoAppData';
import { advancedTheme, basicTheme } from '../../App';

import AddressBookIcon from '../../assets/img/options/address-book.svg';
import AddressBookBasicIcon from '../../assets/img/options/address-book-basic.svg';
import WalletSeedIcon from '../../assets/img/options/wallet-seed.svg';
import WalletSeedBasicIcon from '../../assets/img/options/wallet-seed-basic.svg';
import SyncRescanReportIcon from '../../assets/img/options/sync-rescan-report.svg';
import FundsPoolsIcon from '../../assets/img/options/funds-pools.svg';
import FinancialInsightIcon from '../../assets/img/options/financial-insight.svg';
import FinancialInsightBasicIcon from '../../assets/img/options/financial-insight-basic.svg';
import RestoreBackupIcon from '../../assets/img/options/restore-backup.svg';
import SwitchWalletIcon from '../../assets/img/options/switch-wallet.svg';
import LoadWalletFromSeedBasicIcon from '../../assets/img/options/switch-wallet-basic.svg';
import TipZingoLabsIcon from '../../assets/img/options/tip-zingolabs.svg';
import TipZingoLabsBasicIcon from '../../assets/img/options/tip-zingolabs-basic.svg';

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
  [MenuItemEnum.SyncReport]: 'menu.syncreport',
  [MenuItemEnum.FundPools]: 'menu.fundpools',
  [MenuItemEnum.Insight]: 'menu.insight',
  [MenuItemEnum.ChangeWallet]: 'menu.changewallet',
  [MenuItemEnum.LoadWalletFromSeed]: 'menu.loadwalletfromseed',
  [MenuItemEnum.RestoreWalletBackup]: 'menu.restorebackupwallet',
  [MenuItemEnum.TipZingoLabs]: 'menu.tipzingolabs',
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
    security,
    addLastSnackbar,
    readOnly,
    selectServer,
    netInfo,
    valueTransfersTotal,
    totalBalance,
    somePending,
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

  // Runs biometrics for protected items, then forwards to the LoadedApp
  // class-level dispatcher that knows which screen to navigate to. The
  // panel is only closed after biometrics succeeds (or upfront for items
  // that don't need it) — closing before would strand the user on the
  // previous screen if they cancel the OS auth prompt.
  const dispatch = useMemo(
    () => async (item: MenuItemEnum) => {
      const needsBio =
        (item === MenuItemEnum.WalletSeedUfvk && security.seedUfvkScreen) ||
        (item === MenuItemEnum.Rescan && security.rescanScreen) ||
        (item === MenuItemEnum.ChangeWallet && security.changeWalletScreen) ||
        (item === MenuItemEnum.RestoreWalletBackup &&
          security.restoreWalletBackupScreen);
      if (needsBio) {
        const ok = await simpleBiometrics({ translate });
        if (ok === false) {
          addLastSnackbar(translate('biometrics-error') as string);
          return;
        }
      }
      closeOptionsPanel();
      onMenuItemSelected(item);
    },
    [security, translate, addLastSnackbar, onMenuItemSelected],
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
    const showSyncReport = !isBasic && !isOffline;
    const showFundPools = !isBasic;
    const showInsight = !isEmptyBasic;
    const showRestoreBackup = !isBasic && hasBackupWallet;
    const showChangeWallet = !isBasic && netInfo.isConnected && !isOffline;
    // basic-only entries replicated from the legacy Menu.tsx.
    const showLoadWalletFromSeed =
      isBasic &&
      valueTransfersTotal !== null &&
      valueTransfersTotal === 0 &&
      netInfo.isConnected &&
      !isOffline;
    // Tip ZingoLabs is available in both basic and advanced modes — it
    // only requires an actual Send to be possible (online, not read-only,
    // confirmed funds or pending-incoming funds).
    const canTipZingoLabs =
      !readOnly &&
      !isOffline &&
      ((!!totalBalance &&
        totalBalance.confirmedOrchardBalance +
          totalBalance.confirmedSaplingBalance >
          0) ||
        (!!totalBalance &&
          ((totalBalance.totalOrchardBalance > 0 &&
            totalBalance.confirmedOrchardBalance === 0) ||
            (totalBalance.totalSaplingBalance > 0 &&
              totalBalance.confirmedSaplingBalance === 0)) &&
          somePending));

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

    if (canTipZingoLabs) {
      list.push({
        id: MenuItemEnum.TipZingoLabs,
        testID: MENU_TEST_IDS[MenuItemEnum.TipZingoLabs],
        label: translate('loadedapp.tipzingolabs-basic') as string,
        icon: isBasic ? (
          <TipZingoLabsBasicIcon width={30} height={30} />
        ) : (
          <TipZingoLabsIcon width={30} height={30} />
        ),
        onPress: () => dispatch(MenuItemEnum.TipZingoLabs),
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
    totalBalance,
    somePending,
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
      targetModeColor: isBasic
        ? advancedTheme.colors.primary
        : basicTheme.colors.primary,
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
