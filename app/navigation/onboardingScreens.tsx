import React, { useContext } from 'react';

import { RouteEnum, SelectServerEnum } from '@app/AppState';
import { ContextAppLoading } from '@app/context';
import { OnboardingParamList } from '@app/types';
import { serverUris } from '@app/uris';
import { goBack, navigateOnboarding } from '@app/navigation/navigate';
import type { OnboardingScreenProps } from './OnboardingNavigator';

import StartMenu from '@screens/StartMenu';
import ImportChooser from '@screens/ImportChooser';
import ImportUfvk from '@screens/ImportUfvk';
import WalletProgress from '@screens/WalletProgress';
import WalletError from '@screens/WalletError';
import Server from '@screens/Server';
import ServerList from '@screens/ServerList';

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
      importRecoveryWallet={() => importRecoveryWallet(RouteEnum.Welcome)}
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
}: OnboardingScreenProps<OnboardingParamList, RouteEnum.Progress>) {
  return <WalletProgress kind={route.params.kind} />;
}

export function ImportChooserScreen() {
  const { busy, importRecoveryWallet } = useContext(ContextAppLoading);
  return (
    <ImportChooser
      busy={busy}
      onPrevious={() => importRecoveryWallet(RouteEnum.ImportChooser)}
      onSeed={() => navigateOnboarding({ screen: RouteEnum.ImportWallet })}
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
}: OnboardingScreenProps<OnboardingParamList, RouteEnum.Server>) {
  const {
    translate,
    server,
    selectServer,
    serverStatus,
    serverBlockHeight,
    busy,
    netInfo,
    serverLatencies,
    chooseAutomatic,
    pickServer,
    saveCustomServer,
    setOffline,
    probeServers,
    serverUnreachable,
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
      recommended={serverUris(translate).filter(s => s.recommended)}
      latencies={serverLatencies}
      onAuto={chooseAutomatic}
      onPick={pickServer}
      onSaveCustom={saveCustomServer}
      onOffline={setOffline}
      onOther={chain =>
        navigateOnboarding({ screen: RouteEnum.ServerList, params: { chain } })
      }
      onProbe={probeServers}
      onUnreachable={serverUnreachable}
      onBack={closeServer}
      backGuard={serverBackGuard}
    />
  );
}

export function ServerListScreen({
  route,
}: OnboardingScreenProps<OnboardingParamList, RouteEnum.ServerList>) {
  const {
    translate,
    server,
    selectServer,
    serverLists,
    serverLatencies,
    busy,
    serversFor,
    pickServer,
    serverUnreachable,
  } = useContext(ContextAppLoading);
  const { chain } = route.params;
  return (
    <ServerList
      translate={translate}
      servers={serversFor(chain)}
      loading={!serverLists[chain]}
      latencies={serverLatencies}
      selectedUri={
        server.kind === 'remote' && selectServer === SelectServerEnum.list
          ? server.uri
          : null
      }
      busy={busy}
      onPick={pickServer}
      onUnreachable={serverUnreachable}
      onBack={goBack}
    />
  );
}

export function ImportWalletScreen() {
  const { busy, doRestore } = useContext(ContextAppLoading);
  return (
    <ImportUfvk busy={busy} onClickOK={doRestore} onClickCancel={goBack} />
  );
}
