/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';

import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import SingleAddress from '../Components/SingleAddress';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import RegText from '../Components/RegText';
import { ButtonTypeEnum, ChainNameEnum, ModeEnum, UfvkActionEnum } from '../../app/AppState';
import { useMagicModal } from 'react-native-magic-modal';
import Snackbars from '../Components/Snackbars';
import { ToastProvider } from 'react-native-toastier';

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
  setPrivacyOption: (value: boolean) => Promise<void>;
};
const ShowUfvk: React.FunctionComponent<ShowUfvkProps> = ({ onClickOK, onClickCancel, action, setPrivacyOption }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, wallet, server, mode, addLastSnackbar, language, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  const { top, bottom, right, left } = useSafeAreaInsets();
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
        (server.chainName !== ChainNameEnum.mainChainName &&
        (action === UfvkActionEnum.change || action === UfvkActionEnum.server)
          ? '\n' + (translate('ufvk.mainnet-warning') as string)
          : ''),
      [
        {
          text: translate('confirm') as string,
          onPress: () => onClickOKHide(),
        },
        { text: translate('cancel') as string, onPress: () => onClickCancelHide(), style: 'cancel' },
      ],
      { cancelable: false },
    );
  };

  const onClickCancelHide = () => {
    onClickCancel();
    hide();
  };

  const onClickOKHide = () => {
    onClickOK();
    hide();
  };

  return (
    <ToastProvider>
      <View
        style={{
          marginTop: top,
          marginBottom: bottom,
          marginRight: right,
          marginLeft: left,
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={removeFirstSnackbar}
          translate={translate}
        />

        <Header
          title={translate('ufvk.viewkey') + ' (' + translate(`seed.${action}`) + ')'}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
          closeScreen={onClickCancelHide}
        />
        <ScrollView
          style={{ height: '80%', maxHeight: '80%' }}
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
              if (times === 0) {
                onClickOKHide();
              } else if (times === 1) {
                onPressOK();
              }
            }}
          />
        </View>
      </View>
    </ToastProvider>
  );
};

export default ShowUfvk;
