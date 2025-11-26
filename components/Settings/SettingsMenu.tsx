/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';

import { AppDrawerParamList, LoadingAppNavigationState, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { ButtonTypeEnum, RouteEnum, ScreenEnum, SeedActionEnum } from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import RegText from '../Components/RegText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../Components/Button';

type SettingsMenuProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.SettingsMenu> & {
  navigateToLoadingApp: (state: LoadingAppNavigationState) => Promise<void>;
  onClickOKChangeWallet: (state: LoadingAppNavigationState) => Promise<void>;
};

const SettingsMenu: React.FunctionComponent<SettingsMenuProps> = ({
  navigateToLoadingApp,
  onClickOKChangeWallet,
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.SettingsMenu;

  const insets = useSafeAreaInsets();

  const restoreWallet = () => {
    onClickOKChangeWallet({ screen: 3, startingApp: false });
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

          <RegText color={colors.text} style={{ fontSize: 30, alignSelf: 'center' }}>Settings</RegText>

          <View style={{ borderRadius: 50, backgroundColor: colors.secondary, width: '100%', marginTop: 20 }}>
            <View style={{ flexDirection: 'row', margin: 30 }}>
              <TouchableOpacity 
                onPress={() => navigation?.navigate(RouteEnum.Seed, { action: SeedActionEnum.view })}>
                <RegText>Seed Phrase</RegText>
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: colors.zingo }} />
            <View style={{ flexDirection: 'row', margin: 30 }}>
              <TouchableOpacity onPress={() => navigateToLoadingApp({ screen: 0.5, startingApp: false })}>
                <RegText>Server</RegText>
              </TouchableOpacity>
            </View>
            <View style={{ height: 1, backgroundColor: colors.zingo }} />
            <View style={{ flexDirection: 'row', margin: 30 }}>
              <RegText>Debug Information</RegText>
            </View>
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
        <Button type={ButtonTypeEnum.Primary} title={'Switch to different wallet'} onPress={restoreWallet} />
      </View>
    </ToastProvider>
  );
};

export default SettingsMenu;
