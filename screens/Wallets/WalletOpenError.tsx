/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Route } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { AppDrawerParamList } from '@app/types';
import { useTheme } from '@app/theme';
import { walletErrorKind } from '@app/LoadingApp/walletErrorKind';
import { showWallets } from '@app/services/showWallets';
import WalletError from '@screens/WalletError';

type WalletOpenErrorProps = NativeStackScreenProps<
  AppDrawerParamList,
  'WalletOpenError'
>;

/** A wallet that failed to open in place: retry it, or go back to the others. */
export default function WalletOpenError({
  navigation,
  route,
}: WalletOpenErrorProps) {
  const { translate, netInfo, server, wallets, switchWallet } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const wallet = wallets.find(w => w.id === route.params.walletId);
  const { details } = route.params;

  const retry = async () => {
    if (!wallet) {
      return;
    }
    setBusy(true);
    const outcome = await switchWallet(wallet);
    if (outcome.kind === 'failed') {
      setBusy(false);
      setShake(n => n + 1);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <WalletError
        translate={translate}
        online={!!netInfo.isConnected}
        server={server}
        failed={{
          kind: 'oneOfMany',
          name: wallet?.meta.name ?? '',
          onOpenOther: () => {
            navigation.goBack();
            showWallets();
          },
        }}
        kind={walletErrorKind(details)}
        details={details}
        busy={busy}
        shake={shake}
        onRetry={retry}
        onImport={() => navigation.navigate(Route.AddWallet)}
        onCreate={() => navigation.navigate(Route.NewWallet)}
        onServer={() =>
          navigation.navigate(Route.Server, {
            walletId: route.params.walletId,
          })
        }
        onSwitchChain={() => {}}
      />
    </View>
  );
}
