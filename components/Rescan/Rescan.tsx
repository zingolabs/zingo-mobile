/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';

import RegText from '../Components/RegText';
import Button from '../Components/Button';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { ButtonTypeEnum, SelectServerEnum, SnackbarDurationEnum } from '../../app/AppState';
import { useMagicModal } from 'react-native-magic-modal';

type RescanProps = {
  doRescan: () => void;
};

const Rescan: React.FunctionComponent<RescanProps> = ({ doRescan }) => {
  const context = useContext(ContextAppLoaded);
  const { wallet, translate, netInfo, addLastSnackbar, language, selectServer } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  moment.locale(language);

  const doRescanAndClose = () => {
    if (!netInfo.isConnected || selectServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return;
    }
    doRescan();
    hide();
    addLastSnackbar({
      message: translate('loadedapp.syncing') as string,
      duration: SnackbarDurationEnum.longer,
    });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          height: '100%',
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('rescan.title') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          closeScreen={hide}
        />
        <ScrollView
          style={{ height: '80%', maxHeight: '80%' }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}>
          <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
            <RegText>{(translate('rescan.text-1') as string) + wallet.birthday + translate('rescan.text-2')}</RegText>
          </View>
        </ScrollView>
        <View
          style={{
            flexGrow: 1,
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 5,
          }}>
          <Button type={ButtonTypeEnum.Primary} title={translate('rescan.button') as string} onPress={doRescanAndClose} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default Rescan;
