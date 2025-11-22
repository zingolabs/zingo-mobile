/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';

import RegText from '../Components/RegText';
import Button from '../Components/Button';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import { ButtonTypeEnum, RouteEnum, ScreenEnum, SelectServerEnum, SnackbarDurationEnum } from '../../app/AppState';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

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
  const { colors } = useTheme()  as ThemeType;
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

      <View style={{
        position: 'absolute',
        width: 75,
        top: 10,
        left: 10,
        zIndex: 999,
      }}>
        <View
          style={{
            borderRadius: 25,
            borderColor: colors.text,
            borderWidth: 1,
            padding: 10,
            margin: 10,
            backgroundColor: colors.background,
          }}>
            <TouchableOpacity onPress={() => {
              clear();
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}>
              <FontAwesomeIcon
                size={30}
                icon={faChevronLeft}
                color={colors.text}
              />
            </TouchableOpacity>
        </View>
      </View>

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

          <RegText color={colors.text} style={{ fontSize: 30, alignSelf: 'center' }}>Rescan Wallet</RegText>

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
