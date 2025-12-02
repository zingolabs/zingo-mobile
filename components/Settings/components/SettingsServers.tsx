/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';

import { AppDrawerParamList, LoadingAppNavigationState, ThemeType } from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { ButtonTypeEnum, ChainNameEnum, RouteEnum, ScreenEnum } from '../../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faServer } from '@fortawesome/free-solid-svg-icons';
import RegText from '../../Components/RegText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../Components/Button';
import FadeText from '../../Components/FadeText';

type SettingsServersProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.SettingsServers> & {
  navigateToLoadingApp: (state: LoadingAppNavigationState) => Promise<void>;
};

const SettingsServers: React.FunctionComponent<SettingsServersProps> = ({
  navigateToLoadingApp,
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar, info, indexerServer } = context;
  const { colors } = useTheme()  as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.SettingsServers;

  const insets = useSafeAreaInsets();

  const changeServer = () => {
    navigateToLoadingApp({ screen: 0.5, startingApp: false });
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

          <RegText color={colors.text} style={{ fontSize: 30, alignSelf: 'center' }}>Server</RegText>

          <View style={{ borderRadius: 26, backgroundColor: colors.secondary, width: '100%', marginTop: 20, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10, marginHorizontal: 40, width: '80%' }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                  <FontAwesomeIcon
                    size={25}
                    icon={faServer}
                    color={!info.latestBlock ? '#ff383c' : '#0E9634'}
                  />
                  <View>
                  <RegText>{indexerServer.uri}</RegText>
                  <RegText style={{ color: !info.latestBlock ? '#ff383c' : '#0E9634' }}>{info.latestBlock ? 'Connected' : 'Could not connect to indexer'}</RegText>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ borderRadius: 26, backgroundColor: colors.secondary, width: '100%', marginTop: 20, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 20, marginHorizontal: 30, width: '85%' }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <FadeText>Server version</FadeText>
                <RegText style={{ fontSize: 13 }}>{info.version}</RegText>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.zingo }} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 20, marginHorizontal: 30, width: '85%' }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <FadeText>Network</FadeText>
                <RegText style={{ fontSize: 13 }}>{
                  !info.chainName
                    ? '-'
                    : info.chainName === ChainNameEnum.mainChainName
                    ? 'Mainnet'
                    : info.chainName === ChainNameEnum.testChainName
                    ? 'Testnet'
                    : info.chainName === ChainNameEnum.regtestChainName
                    ? 'Regtest'
                    : 'Unknown (' + info.chainName + ')'
                }</RegText>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.zingo }} />
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 20, marginHorizontal: 30, width: '85%' }}>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <FadeText>Server block height</FadeText>
                <RegText style={{ fontSize: 13 }}>{info.latestBlock ? info.latestBlock.toString(): ''}</RegText>
              </View>
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
        <Button type={ButtonTypeEnum.Primary} title={'Switch to different server'} onPress={changeServer} />
      </View>
    </ToastProvider>
  );
};

export default SettingsServers;
