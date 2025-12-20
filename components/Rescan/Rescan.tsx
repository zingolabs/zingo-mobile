/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';

import RegText from '../Components/RegText';
import Button from '../Components/Button';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum, ScreenEnum, SelectServerEnum, SnackbarDurationEnum } from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderTitle } from '../Header';

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
    selectIndexerServer, 
    snackbars, 
    removeFirstSnackbar,
  } = context;
  const { clear } = useToast();
  const screenName = ScreenEnum.Rescan;

  const insets = useSafeAreaInsets();

  const doRescanAndClose = async () => {
    if (!netInfo.isConnected || selectIndexerServer === SelectServerEnum.offline) {
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

      <HeaderTitle title='Rescan wallet' goBack={() => {
        clear();
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
      }}>
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
        }}>
          <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
            <RegText>{(translate('rescan.text-1') as string) + wallet.birthday + translate('rescan.text-2')}</RegText>
          </View>
        </View>
      </ScrollView>
      <View
        style={{
          marginTop: 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 20,
        }}>
        <Button type={ButtonTypeEnum.Primary} title={translate('rescan.button') as string} onPress={doRescanAndClose} />
      </View>
    </ToastProvider>
  );
};

export default Rescan;
