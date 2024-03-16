/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@react-navigation/native';

import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import SingleAddress from '../Components/SingleAddress';
import RPC from '../../app/rpc';
import FadeText from '../Components/FadeText';
import RPCModule from '../../app/RPCModule';
import { WalletType } from '../../app/AppState';
import { RPCUfvkType } from '../../app/rpc/types/RPCUfvkType';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';

type TextsType = {
  new: string[];
  change: string[];
  server: string[];
  view: string[];
  restore: string[];
  backup: string[];
};

type ShowUfvkProps = {
  onClickOK: () => void;
  onClickCancel: () => void;
  action: 'change' | 'view' | 'backup' | 'server';
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
};
const ShowUfvk: React.FunctionComponent<ShowUfvkProps> = ({ onClickOK, onClickCancel, action, set_privacy_option }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, wallet, server, netInfo, mode, addLastSnackbar, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [ufvk, setUfvk] = useState<string>(wallet.ufvk ? wallet.ufvk : '');
  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);

  const getUfvk = async () => {
    try {
      const ufvkStr: string = await RPCModule.execute('exportufvk', '');
      if (ufvkStr) {
        if (ufvkStr.toLowerCase().startsWith('error')) {
          console.log(`Error ufvk ${ufvkStr}`);
          return {} as WalletType;
        }
      } else {
        console.log('Internal Error ufvk');
        return {} as WalletType;
      }
      const ufvkValue: WalletType = (await JSON.parse(ufvkStr)) as RPCUfvkType;

      return ufvkValue;
    } catch (error) {
      console.log(`Critical Error ufvk ${error}`);
      return {} as WalletType;
    }
  };

  useEffect(() => {
    if (!ufvk) {
      (async () => {
        const w: WalletType = await getUfvk();
        setUfvk(w.ufvk ? w.ufvk : '');
      })();
    }
  }, [ufvk]);

  useEffect(() => {
    const buttonTextsArray = translate('ufvk.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setTimes(action === 'change' || action === 'backup' || action === 'server' ? 1 : 0);
  }, [action, translate]);

  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
  }, []);

  const onPressOK = () => {
    Alert.alert(
      !!texts && !!texts[action] ? texts[action][3] : '',
      (action === 'change'
        ? (translate('ufvk.change-warning') as string)
        : action === 'backup'
        ? (translate('ufvk.backup-warning') as string)
        : action === 'server'
        ? (translate('ufvk.server-warning') as string)
        : '') +
        (server.chain_name !== 'main' && (action === 'change' || action === 'server')
          ? '\n' + (translate('ufvk.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => onClickOK(),
        },
        { text: translate('cancel') as string, onPress: () => onClickCancel(), style: 'cancel' },
      ],
      { cancelable: true, userInterfaceStyle: 'light' },
    );
  };

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('ufvk.viewkey') + ' (' + translate(`seed.${action}`) + ')'}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        set_privacy_option={set_privacy_option}
        addLastSnackbar={addLastSnackbar}
      />

      <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <FadeText style={{ marginTop: 0, padding: 20, textAlign: 'center' }}>
          {action === 'backup' || action === 'change' || action === 'server'
            ? (translate(`ufvk.text-readonly-${action}`) as string)
            : (translate('ufvk.text-readonly') as string)}
        </FadeText>

        <View style={{ display: 'flex', flexDirection: 'column', marginTop: 0, alignItems: 'center' }}>
          {!!ufvk && <SingleAddress address={ufvk} index={0} total={1} prev={() => null} next={() => null} />}
          {!ufvk && <ActivityIndicator size="large" color={colors.primary} />}
        </View>

        <View style={{ marginBottom: 30 }} />
      </ScrollView>
      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button
          type={mode === 'basic' ? 'Secondary' : 'Primary'}
          style={{
            backgroundColor: mode === 'basic' ? colors.background : colors.primary,
          }}
          title={
            mode === 'basic' ? (translate('cancel') as string) : !!texts && !!texts[action] ? texts[action][times] : ''
          }
          onPress={() => {
            if (!ufvk) {
              return;
            }
            if (!netInfo.isConnected && times > 0) {
              addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
              return;
            }
            if (times === 0) {
              onClickOK();
            } else if (times === 1) {
              onPressOK();
            }
          }}
        />
        {times > 0 && (
          <Button
            type="Secondary"
            title={translate('cancel') as string}
            style={{ marginLeft: 10 }}
            onPress={onClickCancel}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ShowUfvk;
