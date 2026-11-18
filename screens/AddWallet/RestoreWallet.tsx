/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useState } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ContextAppLoaded } from '@app/context';
import { AppDrawerParamList } from '@app/types';
import { useTheme } from '@app/theme';
import {
  readAddWalletDraft,
  setAddWalletDraft,
  useAddWalletDraft,
} from '@app/services/addWalletDraft';
import ImportUfvk, { KeyNetwork } from '@screens/ImportUfvk/ImportUfvk';
import { ProgressScreen } from '@screens/WalletProgress/WalletProgress';
import { DraftServerAction, NameField, defaultWalletName } from './draftParts';

type RestoreWalletProps = NativeStackScreenProps<
  AppDrawerParamList,
  'RestoreWallet'
>;

/**
 * A wallet restored from a seed phrase or a viewing key, with its birthday
 * and an optional name. A viewing key carries its network, which the bar
 * then shows and the Server screen keeps.
 */
const RestoreWallet: React.FC<RestoreWalletProps> = ({ navigation }) => {
  const {
    translate,
    netInfo,
    wallets,
    addWallet,
    enterAdded,
    addLastSnackbar,
  } = useContext(ContextAppLoaded);
  const t = (key: string) => translate(key) as string;
  const { colors } = useTheme();
  const draft = useAddWalletDraft();
  const [name, setName] = useState('');
  const [working, setWorking] = useState(false);
  const placeholder = defaultWalletName(
    translate,
    wallets.map(w => w.meta.name),
  );

  const onKeyNetwork = useCallback((network: KeyNetwork) => {
    setAddWalletDraft({ keyChain: network });
  }, []);

  const restore = async (text: string, birthday: number) => {
    setWorking(true);
    const chosen = name.trim() || placeholder;
    const result = await addWallet(
      { kind: 'restore', text, birthday },
      chosen,
      readAddWalletDraft(),
    );
    if (result.kind === 'failed') {
      setWorking(false);
      addLastSnackbar(t('add.error').replace('{error}', result.message));
      return;
    }
    enterAdded(
      result.params,
      'home',
      t('wallets.restored').replace('{name}', result.name),
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgCanvas }}>
      {working ? (
        <ProgressScreen state="working" title={t('add.restoring')} />
      ) : (
        <ImportUfvk
          busy={false}
          env={{
            translate,
            netInfo,
            server: draft.server,
            addLastSnackbar,
          }}
          title={t('add.restore-title')}
          goLabel={t('add.restore-go')}
          right={<DraftServerAction />}
          onKeyNetwork={onKeyNetwork}
          extra={
            <NameField
              value={name}
              onChange={setName}
              placeholder={placeholder}
              translate={translate}
            />
          }
          onClickCancel={() => navigation.goBack()}
          onClickOK={restore}
        />
      )}
    </View>
  );
};

export default RestoreWallet;
