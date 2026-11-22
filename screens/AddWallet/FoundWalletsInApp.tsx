/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ContextAppLoaded } from '@app/context';
import { AppDrawerParamList } from '@app/types';
import { useTheme } from '@app/theme';
import { useAuthorize } from '@app/hooks/useAuthorize';
import { askDiskRetry } from '@app/services/diskFull';
import {
  RecoveryEntry,
  recoveryEntriesOnDevice,
} from '@app/services/recoveryWalletInfo';
import FoundWallets from '@screens/FoundWallets';
import { ProgressScreen } from '@screens/WalletProgress/WalletProgress';

type FoundWalletsInAppProps = NativeStackScreenProps<
  AppDrawerParamList,
  'FoundWallets'
>;

type Phase =
  | { kind: 'reading' }
  | { kind: 'list'; entries: RecoveryEntry[] }
  | { kind: 'working' };

/** Found wallets reached from Add wallet: they join the wallets already here. */
export default function FoundWalletsInApp({
  navigation,
}: FoundWalletsInAppProps) {
  const { translate, importFound, addLastSnackbar } =
    useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const authorize = useAuthorize();
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' });

  useEffect(() => {
    recoveryEntriesOnDevice().then(entries =>
      setPhase({ kind: 'list', entries }),
    );
  }, []);

  const run = async (chosen: RecoveryEntry[]) => {
    if (!(await authorize())) {
      return;
    }
    setPhase({ kind: 'working' });
    const result = await importFound(chosen);
    if (result.kind === 'diskFull') {
      setPhase({ kind: 'list', entries: await recoveryEntriesOnDevice() });
      askDiskRetry(translate, () => run(chosen));
      return;
    }
    if (result.kind === 'failed') {
      addLastSnackbar(
        (translate('add.error') as string).replace('{error}', result.message),
      );
      setPhase({ kind: 'list', entries: await recoveryEntriesOnDevice() });
    }
  };

  if (phase.kind === 'list') {
    return (
      <FoundWallets
        translate={translate}
        entries={phase.entries}
        busy={false}
        onImport={run}
        onBack={() => navigation.goBack()}
      />
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      {phase.kind === 'working' && (
        <ProgressScreen
          state="working"
          title={translate('found.importing') as string}
        />
      )}
    </View>
  );
}
