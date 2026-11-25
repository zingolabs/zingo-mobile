import React, { useContext, useEffect, useState } from 'react';

import { Route, SelectServerEnum, SnackbarDurationEnum } from '@app/AppState';
import { sendEmail } from '@app/services/sendEmail';
import { ContextAppLoading } from '@app/context';
import { OnboardingParamList } from '@app/types';
import { serverUris } from '@app/uris';
import { goBack, navigateOnboarding } from '@app/navigation/navigate';
import type { OnboardingScreenProps } from './OnboardingNavigator';

import StartMenu from '@screens/StartMenu';
import ImportChooser from '@screens/ImportChooser';
import FoundWallets from '@screens/FoundWallets';
import ImportUfvk from '@screens/ImportUfvk';
import WalletProgress from '@screens/WalletProgress';
import WalletError from '@screens/WalletError';
import Server from '@screens/Server';
import ServerList from '@screens/ServerList';
import NameWallet from '@screens/NameWallet';
import { defaultWalletName } from '@screens/AddWallet/draftParts';
import { walletsOnDevice } from '@app/walletBackend/utils/walletStore';

// The onboarding routes: each one dresses its screen from the loading
// context and the route's params.

export function WelcomeScreen() {
  const {
    busy,
    recoveryEntries,
    foundDismissed,
    dismissFound,
    walletExists,
    openServer,
    openCurrentWallet,
    createNewWallet,
    getwalletToRestore,
  } = useContext(ContextAppLoading);
  return (
    <StartMenu
      actionButtonsDisabled={busy}
      found={recoveryEntries.length > 0 && !foundDismissed}
      reviewFound={() => navigateOnboarding({ screen: Route.FoundWallets })}
      dismissFound={dismissFound}
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
  const { busy } = useContext(ContextAppLoading);
  return (
    <ImportChooser
      busy={busy}
      onPrevious={() => navigateOnboarding({ screen: Route.FoundWallets })}
      onSeed={() => navigateOnboarding({ screen: Route.ImportWallet })}
      onBack={goBack}
    />
  );
}

export function FoundWalletsScreen() {
  const { translate, busy, recoveryEntries, importAllRecovery } =
    useContext(ContextAppLoading);
  return (
    <FoundWallets
      translate={translate}
      entries={recoveryEntries}
      busy={busy}
      onImport={importAllRecovery}
      onBack={goBack}
    />
  );
}

export function OpenErrorScreen() {
  const {
    translate,
    netInfo,
    server,
    walletError,
    openOtherWallet,
    errorResolved,
    retrying,
    errorShake,
    retryOpenWallet,
    retryCreateWallet,
    getwalletToRestore,
    createNewWallet,
    openServer,
    switchToWalletChain,
    zingolibVersion,
    addLastSnackbar,
  } = useContext(ContextAppLoading);
  if (!walletError) {
    return null;
  }
  const { stage } = walletError;
  return (
    <WalletError
      translate={translate}
      online={!!netInfo.isConnected}
      server={server}
      failed={
        walletError.others
          ? {
              kind: 'oneOfMany',
              name: walletError.name,
              onOpenOther: openOtherWallet,
            }
          : { kind: 'only' }
      }
      kind={walletError.kind}
      details={walletError.details}
      walletChain={walletError.walletChain}
      resolved={errorResolved}
      busy={retrying}
      shake={errorShake}
      stage={stage}
      retried={walletError.retried}
      onRetry={
        stage.kind === 'create'
          ? () => retryCreateWallet(stage.name)
          : retryOpenWallet
      }
      onReport={() =>
        sendEmail(
          translate,
          zingolibVersion,
          translate('walleterror.server-title') as string,
          walletError.details,
        )
      }
      onCopied={() =>
        addLastSnackbar(
          translate('txtcopied') as string,
          SnackbarDurationEnum.short,
        )
      }
      onImport={getwalletToRestore}
      onCreate={createNewWallet}
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
        navigateOnboarding({ screen: Route.ServerList, params: { chain } })
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
}: OnboardingScreenProps<OnboardingParamList, 'ServerList'>) {
  const {
    translate,
    server,
    selectServer,
    serverLists,
    serverLatencies,
    serverHeights,
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
      heights={serverHeights}
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

export function NameWalletScreen({
  route,
}: OnboardingScreenProps<OnboardingParamList, 'NameWallet'>) {
  const { translate, busy, nameNewWallet } = useContext(ContextAppLoading);
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    walletsOnDevice().then(listed =>
      setNames(listed.ok ? listed.value.wallets.map(w => w.meta.name) : []),
    );
  }, []);
  const { from } = route.params;
  return (
    <NameWallet
      from={from}
      translate={translate}
      placeholder={defaultWalletName(translate, names)}
      busy={busy}
      onBack={goBack}
      onGo={name => nameNewWallet(from, name)}
    />
  );
}
