/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';

import { useTheme } from '@react-navigation/native';

import {
  AppDrawerParamList,
  LoadingAppNavigationState,
  ThemeType,
} from '../../../app/types';
import { ContextAppLoaded } from '../../../app/context';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { ChainNameEnum, RouteEnum, ScreenEnum } from '../../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faServer } from '@fortawesome/free-solid-svg-icons';
import RegText from '../../Components/RegText';
import FadeText from '../../Components/FadeText';
import { HeaderTitle } from '../../Header';
import LiquidPrimaryButton from '../../Components/LiquidButton/LiquidPrimaryButton';

type SettingsServersProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.SettingsServers
> & {
  navigateToLoadingApp: (state: LoadingAppNavigationState) => Promise<void>;
};

const SettingsServers: React.FunctionComponent<SettingsServersProps> = ({
  navigateToLoadingApp,
  navigation,
}) => {
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar, info, indexerServer } = context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.SettingsServers;

  const changeServerTesnet = () => {
    navigateToLoadingApp({ screen: 0.5, startingApp: false });
  };

  const changeServerRegtest = () => {
    navigateToLoadingApp({ screen: 0.55, startingApp: false });
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <HeaderTitle
        title="Server"
        goBack={() => {
          clear();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />

      <View
        style={{
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
          }}
        >
          <View
            style={{
              borderRadius: 26,
              backgroundColor: colors.secondary,
              width: '100%',
              marginTop: 40,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 10,
                marginHorizontal: 40,
                width: '80%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 15,
                    alignItems: 'center',
                  }}
                >
                  <FontAwesomeIcon
                    size={25}
                    icon={faServer}
                    color={!info.latestBlock ? '#ff383c' : '#0E9634'}
                  />
                  <View>
                    <RegText>{indexerServer.uri}</RegText>
                    <RegText
                      style={{
                        color: !info.latestBlock ? '#ff383c' : '#0E9634',
                      }}
                    >
                      {info.latestBlock
                        ? 'Connected'
                        : 'Could not connect to indexer'}
                    </RegText>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View
            style={{
              borderRadius: 26,
              backgroundColor: colors.secondary,
              width: '100%',
              marginTop: 20,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 20,
                marginHorizontal: 30,
                width: '85%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <FadeText>Server version</FadeText>
                <RegText style={{ fontSize: 13 }}>{info.version}</RegText>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.zingo }} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 20,
                marginHorizontal: 30,
                width: '85%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <FadeText>Network</FadeText>
                <RegText style={{ fontSize: 13 }}>
                  {!info.chainName
                    ? '-'
                    : info.chainName === ChainNameEnum.mainChainName
                      ? 'Mainnet'
                      : info.chainName === ChainNameEnum.testChainName
                        ? 'Testnet'
                        : info.chainName === ChainNameEnum.regtestChainName
                          ? 'Regtest'
                          : 'Unknown (' + info.chainName + ')'}
                </RegText>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: colors.zingo }} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginVertical: 20,
                marginHorizontal: 30,
                width: '85%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <FadeText>Server block height</FadeText>
                <RegText style={{ fontSize: 13 }}>
                  {info.latestBlock ? info.latestBlock.toString() : ''}
                </RegText>
              </View>
            </View>
          </View>
        </View>
      </View>
      <View
        style={{
          marginTop: 31,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <LiquidPrimaryButton
          title={'Switch to different server'}
          onPress={
            indexerServer.chainName === ChainNameEnum.testChainName
              ? changeServerTesnet
              : changeServerRegtest
          }
          style={{
            alignSelf: 'stretch',
          }}
        />
      </View>
    </ToastProvider>
  );
};

export default SettingsServers;
