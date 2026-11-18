/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ContextAppLoaded } from '@app/context';
import { AppDrawerParamList, LoadedAppNavigationState } from '@app/types';
import {
  iconSize,
  radiusPill,
  space8,
  space16,
  space20,
  useTheme,
} from '@app/theme';
import { readAddWalletDraft } from '@app/services/addWalletDraft';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import Button from '@ui/primitives/Button';
import Text from '@ui/primitives/Text';
import { ChevronLeft } from '@ui/primitives/Icons/Chevron';
import { WalletIcon } from '@ui/primitives/Icons/WalletIcon';
import TitleBar from '@ui/widgets/TitleBar';
import { ProgressScreen } from '@screens/WalletProgress/WalletProgress';
import { DraftServerAction, NameField, defaultWalletName } from './draftParts';

type NewWalletProps = NativeStackScreenProps<AppDrawerParamList, 'NewWallet'>;

const DISC = 56;

type Phase =
  | { kind: 'form' }
  | { kind: 'working' }
  | { kind: 'ready'; name: string; params: LoadedAppNavigationState };

/** A wallet made on this device: its name, then its seed phrase to back up. */
const NewWallet: React.FC<NewWalletProps> = ({ navigation }) => {
  const { translate, wallets, addWallet, enterAdded, addLastSnackbar } =
    useContext(ContextAppLoaded);
  const t = (key: string) => translate(key) as string;
  const { colors } = useTheme();
  const bottomPad = useBottomActionPad();
  const [name, setName] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const placeholder = defaultWalletName(
    translate,
    wallets.map(w => w.meta.name),
  );

  const create = async () => {
    setPhase({ kind: 'working' });
    const result = await addWallet(
      { kind: 'create' },
      name.trim() || placeholder,
      readAddWalletDraft(),
    );
    if (result.kind === 'failed') {
      setPhase({ kind: 'form' });
      addLastSnackbar(t('add.error').replace('{error}', result.message));
      return;
    }
    setPhase({ kind: 'ready', name: result.name, params: result.params });
  };

  if (phase.kind === 'working') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <ProgressScreen state="working" title={t('add.creating')} />
      </View>
    );
  }
  if (phase.kind === 'ready') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
        <ProgressScreen
          state="done"
          title={t('add.ready').replace('{name}', phase.name)}
          body={t('add.ready-body')}
          footer={
            <View style={{ gap: 4 }}>
              <Button
                testID="addwallet.backup"
                variant="primary"
                title={t('add.backup')}
                onPress={() => enterAdded(phase.params, 'backup', '')}
              />
              <Button
                testID="addwallet.later"
                variant="quiet"
                title={t('add.later')}
                onPress={() =>
                  enterAdded(phase.params, 'home', t('add.later-toast'))
                }
              />
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      <TitleBar
        title={t('add.new-title')}
        left={{
          icon: ChevronLeft,
          accent: true,
          accessibilityLabel: t('add.title'),
          onPress: () => navigation.goBack(),
          testID: 'newwallet.back',
        }}
        right={<DraftServerAction />}
      />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: space20,
          paddingTop: space16,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: space20 }}>
          <View
            style={{
              width: DISC,
              height: DISC,
              borderRadius: radiusPill,
              backgroundColor: colors.bgAccentSubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WalletIcon size={iconSize} color={colors.fgAccent} />
          </View>
          <Text
            variant="bodySmall"
            tone="muted"
            style={{
              textAlign: 'center',
              marginTop: space8,
              marginHorizontal: space16,
            }}
          >
            {t('add.new-lead')}
          </Text>
        </View>
        <NameField value={name} onChange={setName} placeholder={placeholder} />
      </ScrollView>
      <View style={{ paddingHorizontal: space20, paddingBottom: bottomPad }}>
        <Button
          testID="newwallet.go"
          variant="primary"
          title={t('add.create-go')}
          onPress={create}
        />
      </View>
    </View>
  );
};

export default NewWallet;
