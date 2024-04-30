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
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import RegText from '../Components/RegText';
import {
  ButtonTypeEnum,
  ChainNameEnum,
  GlobalConst,
  ModeEnum,
  SettingsNameEnum,
  UfvkActionEnum,
} from '../../app/AppState';

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
  action: UfvkActionEnum;
  set_privacy_option: (name: SettingsNameEnum.privacy, value: boolean) => Promise<void>;
};
const ShowUfvk: React.FunctionComponent<ShowUfvkProps> = ({ onClickOK, onClickCancel, action, set_privacy_option }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, wallet, server, netInfo, mode, addLastSnackbar, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [times, setTimes] = useState<number>(0);
  const [texts, setTexts] = useState<TextsType>({} as TextsType);

  useEffect(() => {
    const buttonTextsArray = translate('ufvk.buttontexts');
    let buttonTexts = {} as TextsType;
    if (typeof buttonTextsArray === 'object') {
      buttonTexts = buttonTextsArray as TextsType;
      setTexts(buttonTexts);
    }
    setTimes(
      action === UfvkActionEnum.change || action === UfvkActionEnum.backup || action === UfvkActionEnum.server ? 1 : 0,
    );
  }, [action, translate]);

  // because this screen is fired from more places than the menu.
  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch(GlobalConst.false))();
  }, []);

  const onPressOK = () => {
    Alert.alert(
      !!texts && !!texts[action] ? texts[action][3] : '',
      (action === UfvkActionEnum.change
        ? (translate('ufvk.change-warning') as string)
        : action === UfvkActionEnum.backup
        ? (translate('ufvk.backup-warning') as string)
        : action === UfvkActionEnum.server
        ? (translate('ufvk.server-warning') as string)
        : '') +
        (server.chain_name !== ChainNameEnum.mainChainName &&
        (action === UfvkActionEnum.change || action === UfvkActionEnum.server)
          ? '\n' + (translate('ufvk.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => onClickOK(),
        },
        { text: translate('cancel') as string, onPress: () => onClickCancel(), style: 'cancel' },
      ],
      { cancelable: false, userInterfaceStyle: 'light' },
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
        <RegText style={{ marginTop: 0, padding: 20, textAlign: 'center', fontWeight: '900' }}>
          {action === UfvkActionEnum.backup || action === UfvkActionEnum.change || action === UfvkActionEnum.server
            ? (translate(`ufvk.text-readonly-${action}`) as string)
            : (translate('ufvk.text-readonly') as string)}
        </RegText>

        <View style={{ display: 'flex', flexDirection: 'column', marginTop: 0, alignItems: 'center' }}>
          {!!wallet.ufvk && (
            <SingleAddress address={wallet.ufvk} ufvk={true} index={0} total={1} prev={() => null} next={() => null} />
          )}
          {!wallet.ufvk && <ActivityIndicator size="large" color={colors.primary} />}
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
          type={mode === ModeEnum.basic ? ButtonTypeEnum.Secondary : ButtonTypeEnum.Primary}
          style={{
            backgroundColor: mode === ModeEnum.basic ? colors.background : colors.primary,
          }}
          title={
            mode === ModeEnum.basic
              ? (translate('cancel') as string)
              : !!texts && !!texts[action]
              ? texts[action][times]
              : ''
          }
          onPress={() => {
            if (!wallet.ufvk) {
              return;
            }
            if (!netInfo.isConnected && times > 0) {
              addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
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
            type={ButtonTypeEnum.Secondary}
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
