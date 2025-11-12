/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';

import { useTheme } from '@react-navigation/native';

import RegText from '../Components/RegText';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import { ButtonTypeEnum, RouteEnum, ScreenEnum, SelectServerEnum, SnackbarDurationEnum } from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';

type RescanProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Rescan> & {
  doRescan: () => Promise<void>;
};

const Rescan: React.FunctionComponent<RescanProps> = ({ 
  navigation,
  doRescan 
}) => {
  const context = useContext(ContextAppLoaded);
  const { 
    wallet, 
    translate, 
    netInfo, 
    addLastSnackbar, 
    selectLightWalletServer, 
    snackbars, 
    removeFirstSnackbar,
  } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Rescan;

  const doRescanAndClose = async () => {
    if (!netInfo.isConnected || selectLightWalletServer === SelectServerEnum.offline) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, screenName: [screenName] });
      return;
    }
    // was removed the `await` here because launching the rescan can
    // take a lot of time and it's better the App responsive.
    doRescan();
    clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
    setTimeout(() => {
      // because this message is between screens.
      addLastSnackbar({
        message: translate('loadedapp.syncing') as string,
        duration: SnackbarDurationEnum.longer,
        screenName: [screenName, ScreenEnum.LoadedApp],
      });
    }, 3 * 1000);
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('rescan.title') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            clear();
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
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
      </View>
    </ToastProvider>
  );
};

export default Rescan;
