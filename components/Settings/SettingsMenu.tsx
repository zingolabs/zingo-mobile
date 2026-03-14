/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';

import { useTheme } from '@react-navigation/native';

import { AppDrawerParamList, LoadingAppNavigationState } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Snackbars from '../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { ButtonTypeEnum, RouteEnum, ScreenEnum } from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronRight,
  faInfo,
  faSeedling,
  faServer,
  faChevronLeft,
} from '@fortawesome/free-solid-svg-icons';
import RegText from '../Components/RegText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../Components/Button';
import { HeaderTitle } from '../Header';
import { ColorsType } from '../../app/types/ColorsType';

type SettingsMenuProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.SettingsMenu
> & {
  onClickOKChangeWallet: (state: LoadingAppNavigationState) => Promise<void>;
};

const SettingsMenu: React.FunctionComponent<SettingsMenuProps> = ({
  onClickOKChangeWallet,
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar, translate } = context;
  const { colors } = useTheme() as unknown as { colors: ColorsType };
  const { clear } = useToast();
  const screenName = ScreenEnum.SettingsMenu;

  const insets = useSafeAreaInsets();

  const restoreWallet = () => {
    Alert.alert(
      'Switch to different wallet',
      'Please confirm that you want to switch to a different/another wallet and you will lose access to your current wallet.',
      [
        {
          text: translate('confirm') as string,
          onPress: () =>
            onClickOKChangeWallet({ screen: 3, startingApp: false }),
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Settings"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <View
        style={{
          flexGrow: 1,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  borderRadius: 25,
                  borderColor: colors.text,
                  borderWidth: 1,
                  padding: 10,
                  margin: 10,
                  backgroundColor: colors.background,
                  alignSelf: 'flex-start',
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    clear();
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    }
                  }}
                >
                  <FontAwesomeIcon
                    size={30}
                    icon={faChevronLeft}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                borderRadius: 26,
                backgroundColor: colors.secondary,
                width: '100%',
                marginTop: 20,
                paddingVertical: 5,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginVertical: 18,
                  marginHorizontal: 40,
                  width: '80%',
                }}
              >
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                  onPress={() => navigation?.navigate(RouteEnum.Seed)}
                >
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <FontAwesomeIcon
                      size={20}
                      icon={faSeedling}
                      color={colors.text}
                    />
                    <RegText>Seed Phrase</RegText>
                  </View>
                  <FontAwesomeIcon
                    size={20}
                    icon={faChevronRight}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginVertical: 18,
                  marginHorizontal: 40,
                  width: '80%',
                }}
              >
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                  onPress={() =>
                    navigation?.navigate(RouteEnum.SettingsServers)
                  }
                >
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <FontAwesomeIcon
                      size={20}
                      icon={faServer}
                      color={colors.text}
                    />
                    <RegText>Server</RegText>
                  </View>
                  <FontAwesomeIcon
                    size={20}
                    icon={faChevronRight}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ height: 1, backgroundColor: colors.border }} />
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginVertical: 18,
                  marginHorizontal: 40,
                  width: '80%',
                }}
              >
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                  onPress={() => navigation?.navigate(RouteEnum.DebugInfo)}
                >
                  <View style={{ flexDirection: 'row', gap: 15 }}>
                    <FontAwesomeIcon
                      size={20}
                      icon={faInfo}
                      color={colors.text}
                    />
                    <RegText>Debug Information</RegText>
                  </View>
                  <FontAwesomeIcon
                    size={20}
                    icon={faChevronRight}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          marginTop: 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 20,
        }}
      >
        <Button
          type={ButtonTypeEnum.Tertiary}
          title={'Switch to different wallet'}
          onPress={restoreWallet}
        />
      </View>
    </ToastProvider>
  );
};

export default SettingsMenu;
