/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeType } from '../../types';
import { ChainNameEnum, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';
import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import ComputerBlue from '../../../assets/icons/computer-blue.svg';
import ComputerWhite from '../../../assets/icons/computer-white.svg';
import { HeaderTitle } from '../../../components/Header';
import { serverUris } from '../../uris';

type SelectNetworkProps = {
  actionButtonsDisabled: boolean;
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  checkIndexerServer: (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
  ) => Promise<{ result: boolean; indexerServerUriParsed: string }>;
  closeServers: () => void;
  fromSettings: boolean;
  goConnectIndexer: () => void;
  goAvailableServers: () => void;
};

const SelectNetwork: React.FunctionComponent<SelectNetworkProps> = ({
  actionButtonsDisabled,
  closeServers,
  fromSettings,
  goConnectIndexer,
  goAvailableServers,
  setIndexerServer,
}) => {
  const context = useContext(ContextAppLoading);
  const {
    snackbars,
    removeFirstSnackbar,
    indexerServer: indexerServerContext,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Servers;

  const [kbOpen, setKbOpen] = useState(false);
  const [indexerServerUriLocal] = useState<string>(
    indexerServerContext.uri ? indexerServerContext.uri : serverUris()[0].uri,
  );

  const [, setIndexerServerChainNameLocal] = useState<ChainNameEnum>(
    indexerServerContext.uri
      ? indexerServerContext.chainName
      : serverUris()[0].chainName,
  );

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  console.log('Render Select Network', indexerServerContext);

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.top : kbOpen ? insets.top : 0
        }
      >
        {fromSettings && (
          <HeaderTitle
            title="Select network"
            goBack={() => {
              clear();
              closeServers();
            }}
          />
        )}

        <View
          style={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 30,
          }}
        >
          {!fromSettings && (
            <RegText
              color={colors.text}
              style={{
                marginTop: 42,
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              Select network
            </RegText>
          )}

          <FadeText
            style={{
              marginTop: 14,
              fontSize: 14,
              textAlign: 'center',
              fontWeight: 500,
              marginBottom: 24,
            }}
          >
            Choose the network this wallet will be operating on
          </FadeText>

          <TouchableOpacity
            style={{ width: '100%' }}
            disabled={actionButtonsDisabled}
            onPress={() => {
              goAvailableServers();
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderColor: '#494444',
                borderWidth: 1,
                borderRadius: 15,
                marginBottom: 18,
                backgroundColor: '#151414',
                width: '100%',
                alignItems: 'center',
                paddingRight: 16,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#032139',
                    borderRadius: 68,
                    height: 46,
                    width: 46,
                    marginTop: 19,
                    marginLeft: 16,
                    marginBottom: 18,
                    marginRight: 13,
                  }}
                >
                  <ComputerBlue width={24} height={24} />
                </View>

                <View
                  style={{
                    justifyContent: 'center',
                    marginTop: 10,
                    flex: 1,
                  }}
                >
                  <RegText
                    color={colors.text}
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: 22,
                    }}
                  >
                    Available servers
                  </RegText>

                  <FadeText
                    style={{
                      marginTop: 4,
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: 22,
                    }}
                  >
                    Choose from available indexers
                  </FadeText>
                </View>
              </View>

              <FontAwesomeIcon
                icon={faChevronRight}
                size={16}
                color="#8E8E93"
              />
            </View>
          </TouchableOpacity>

          <View style={{ justifyContent: 'center', marginTop: 10 }}>
            <FadeText
              style={{
                marginBottom: 10,
                fontSize: 14,
                fontWeight: 400,
                lineHeight: 22,
              }}
            >
              OR
            </FadeText>
          </View>

          <TouchableOpacity
            style={{ width: '100%' }}
            disabled={actionButtonsDisabled}
            onPress={() => {
              setIndexerServerChainNameLocal(ChainNameEnum.testChainName);
              setIndexerServer(
                indexerServerUriLocal,
                ChainNameEnum.testChainName,
              );
              goConnectIndexer();
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: '#494444',
                borderWidth: 1,
                borderRadius: 15,
                marginBottom: 10,
                backgroundColor: '#151414',
                width: '100%',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#2E2E2E',
                  borderRadius: 68,
                  height: 46,
                  width: 46,
                  marginTop: 19,
                  marginLeft: 16,
                  marginBottom: 18,
                  marginRight: 13,
                }}
              >
                <ComputerWhite width={24} height={24} />
              </View>

              <View
                style={{
                  justifyContent: 'center',
                  marginTop: 10,
                }}
              >
                <RegText
                  color={colors.text}
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 22,
                  }}
                >
                  Custom
                </RegText>

                <FadeText
                  style={{
                    marginTop: 4,
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 22,
                  }}
                >
                  Connect to your own testnet indexer
                </FadeText>
              </View>
            </View>
          </TouchableOpacity>

          {!fromSettings && (
            <>
              <View style={{ justifyContent: 'center', marginTop: 10 }}>
                <FadeText
                  style={{
                    marginBottom: 10,
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 22,
                  }}
                >
                  OR
                </FadeText>
              </View>

              <TouchableOpacity
                style={{
                  justifyContent: 'center',
                  marginTop: 10,
                  backgroundColor: '#28282A',
                  borderRadius: 1000,
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  marginBottom: 21,
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={actionButtonsDisabled}
                onPress={() => {
                  setIndexerServerChainNameLocal(
                    ChainNameEnum.regtestChainName,
                  );
                  setIndexerServer(
                    indexerServerUriLocal,
                    ChainNameEnum.regtestChainName,
                  );
                  goConnectIndexer();
                }}
              >
                <FadeText
                  style={{
                    fontSize: 15,
                    fontWeight: 400,
                    lineHeight: 20,
                    letterSpacing: -0.23,
                  }}
                >
                  Use regtest
                </FadeText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default SelectNetwork;
