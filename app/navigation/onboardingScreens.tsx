import React, { useContext } from 'react';

import { Route } from '@app/AppState';
import { ContextAppLoading } from '@app/context';
import { OnboardingParamList } from '@app/types';
import { goBack, navigateOnboarding } from '@app/navigation/navigate';
import type { OnboardingScreenProps } from './OnboardingNavigator';

import StartMenu from '@screens/StartMenu';
import ImportChooser from '@screens/ImportChooser';
import ImportUfvk from '@screens/ImportUfvk';
import WalletProgress from '@screens/WalletProgress';
import WalletError from '@screens/WalletError';
import Server from '@screens/Server';

// The onboarding routes: each one dresses its screen from the loading
// context and the route's params.

export function WelcomeScreen() {
  const {
    busy,
    recoveryWallet,
    freshInstall,
    walletExists,
    importRecoveryWallet,
    viewRecoveryWallet,
    openServer,
    openCurrentWallet,
    createNewWallet,
    getwalletToRestore,
  } = useContext(ContextAppLoading);
  return (
    <StartMenu
      actionButtonsDisabled={busy}
      recoveryWallet={recoveryWallet}
      freshInstall={freshInstall}
      importRecoveryWallet={() => importRecoveryWallet(Route.Welcome)}
      viewRecoveryWallet={viewRecoveryWallet}
      customServer={() => openServer()}
      walletExists={walletExists}
      openCurrentWallet={openCurrentWallet}
      createNewWallet={createNewWallet}
      getwalletToRestore={getwalletToRestore}
    />
  );
}

export function ProgressScreen({
  route,
}: OnboardingScreenProps<OnboardingParamList, 'Progress'>) {
  return <WalletProgress kind={route.params.kind} />;
}

export function ImportChooserScreen() {
  const { busy, importRecoveryWallet } = useContext(ContextAppLoading);
  return (
    <ImportChooser
      busy={busy}
      onPrevious={() => importRecoveryWallet(Route.ImportChooser)}
      onSeed={() => navigateOnboarding({ screen: Route.ImportWallet })}
      onBack={goBack}
    />
  );
}

export function OpenErrorScreen() {
  const {
    walletError,
    errorResolved,
    retrying,
    errorShake,
    retryOpenWallet,
    deleteThenImport,
    deleteThenCreate,
    openServer,
    switchToWalletChain,
  } = useContext(ContextAppLoading);
  if (!walletError) {
    return null;
  }
  return (
    <WalletError
      kind={walletError.kind}
      details={walletError.details}
      walletChain={walletError.walletChain}
      resolved={errorResolved}
      busy={retrying}
      shake={errorShake}
      onRetry={retryOpenWallet}
      onImport={deleteThenImport}
      onCreate={deleteThenCreate}
      onServer={() => openServer(walletError.walletChain)}
      onSwitchChain={switchToWalletChain}
    />
  );
}

export function ServerScreen({
  route,
}: OnboardingScreenProps<OnboardingParamList, 'Server'>) {
  const {
    translate,
    server,
    selectServer,
    serverStatus,
    serverBlockHeight,
    busy,
    netInfo,
    serverLatencies,
    serverDefaults,
    chooseAutomatic,
    saveCustomServer,
    setOffline,
    probeServers,
    closeServer,
    serverBackGuard,
  } = useContext(ContextAppLoading);
  return (
    <Server
      translate={translate}
      initialChain={route.params?.chain}
      server={server}
      selectServer={selectServer}
      status={serverStatus}
      blockHeight={serverBlockHeight}
      busy={busy}
      online={!!netInfo.isConnected}
      defaults={serverDefaults}
      latencies={serverLatencies}
      onAuto={chooseAutomatic}
      onSaveCustom={saveCustomServer}
      onOffline={setOffline}
      onProbe={probeServers}
      onBack={closeServer}
      backGuard={serverBackGuard}
    />
  );
}

export function ImportWalletScreen() {
  const { busy, doRestore } = useContext(ContextAppLoading);
  return (
    <ImportUfvk busy={busy} onClickOK={doRestore} onClickCancel={goBack} />
  );
}
