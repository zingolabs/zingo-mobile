/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ThemeType } from '../../types';
import { ChainNameEnum, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';
import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { serverUris } from '../../uris';
import {
  faCheck,
  faWarning,
} from '@fortawesome/free-solid-svg-icons';
import ComputerBlue from '../../../assets/icons/computer-blue.svg';
import ComputerWhite from '../../../assets/icons/computer-white.svg';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { HeaderTitle } from '../../../components/Header';

type SelectNetworkProps = {
  actionButtonsDisabled: boolean;
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  checkIndexerServer: (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
  ) => Promise<{ result: boolean; indexerServerUriParsed: string }>;
  closeServers: () => void;
  fromSettings: boolean;
};

const SelectNetwork: React.FunctionComponent<SelectNetworkProps> = ({
  actionButtonsDisabled,
  setIndexerServer,
  checkIndexerServer,
  closeServers,
  fromSettings,
}) => {
  const context = useContext(ContextAppLoading);
  const {
    netInfo,
    translate,
    snackbars,
    removeFirstSnackbar,
    indexerServer: indexerServerContext,
  } = context;
  const { colors } = useTheme() as ThemeType;
  const { clear } = useToast();
  const screenName = ScreenEnum.Servers;

  const [connected, setConnected] = useState<boolean | null>(null);
  const [borderColor, setBorderColor] = useState<string>('transparent');
  const [kbOpen, setKbOpen] = useState(false);
  const [indexerServerUriLocal, setIndexerServerUriLocal] = useState<string>(
    indexerServerContext.uri,
  );
  const [indexerServerChainNameLocal, setIndexerServerChainNameLocal] = useState<ChainNameEnum>(
    indexerServerContext.chainName,
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

  //console.log('Render Servers', insets);

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
          <HeaderTitle title='Select network' goBack={() => {
            clear();
            closeServers();
          }} />
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
            <RegText color={colors.text} style={{ marginTop: 42, fontSize: 32, fontStyle: 'normal', fontWeight: 700 }}>
              Select network
            </RegText>
          )}

          <FadeText style={{ marginTop: 14, fontSize: 14, fontStyle: 'normal', fontWeight: 600, marginBottom: 39 }}>
            Choose the network this wallet will be operating on
          </FadeText>

          <TouchableOpacity
            style={{
              width: '100%',
            }}
            disabled={actionButtonsDisabled}
            onPress={() => {
              setIndexerServerUriLocal(serverUris()[0].uri);
              setIndexerServerChainNameLocal(ChainNameEnum.testChainName);
              setBorderColor('transparent');
              setConnected(null);
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: indexerServerUriLocal === serverUris()[0].uri ? colors.primary : '#494444',
                borderWidth: 1,
                borderRadius: 15,
                marginBottom: 21,
                backgroundColor: '#151414',
                width: '100%',
                alignItems: 'center',
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
                }}
              >
                <RegText color={colors.text} style={{ fontSize: 20, fontStyle: 'normal', fontWeight: 700, lineHeight: 22 }}>
                  Server A
                </RegText>
                <FadeText style={{ marginTop: 4, fontSize: 14, fontStyle: 'normal', fontWeight: 400, lineHeight: 22 }}>
                  {serverUris()[0].uri}
                </FadeText>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              width: '100%',
            }}
            disabled={actionButtonsDisabled}
            onPress={() => {
              setIndexerServerUriLocal(serverUris()[1].uri);
              setIndexerServerChainNameLocal(ChainNameEnum.testChainName);
              setBorderColor('transparent');
              setConnected(null);
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: indexerServerUriLocal === serverUris()[1].uri ? colors.primary : '#494444',
                borderWidth: 1,
                borderRadius: 15,
                marginBottom: 21,
                backgroundColor: '#151414',
                width: '100%',
                alignItems: 'center',
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
                }}
              >
                <RegText color={colors.text} style={{ fontSize: 20, fontStyle: 'normal', fontWeight: 700, lineHeight: 22 }}>
                  Server B
                </RegText>
                <FadeText style={{ marginTop: 4, fontSize: 14, fontStyle: 'normal', fontWeight: 400, lineHeight: 22 }}>
                  {serverUris()[1].uri}
                </FadeText>
              </View>
            </View>
          </TouchableOpacity>

          <View
            style={{
              justifyContent: 'center',
              marginTop: 10,
            }}
          >
            <FadeText style={{ marginBottom: 21, fontSize: 14, fontStyle: 'normal', fontWeight: 400, lineHeight: 22 }}>
              OR
            </FadeText>
          </View>

          <TouchableOpacity
            style={{
              width: '100%',
            }}
            disabled={actionButtonsDisabled}
            onPress={() => {
              setIndexerServerUriLocal('');
              setIndexerServerChainNameLocal(ChainNameEnum.testChainName);
              setBorderColor('transparent');
              setConnected(null);
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: indexerServerUriLocal !== serverUris()[0].uri && indexerServerUriLocal !== serverUris()[1].uri ? colors.primary : '#494444',
                borderWidth: 1,
                borderRadius: 15,
                marginBottom: 21,
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
                <RegText color={colors.text} style={{ fontSize: 20, fontStyle: 'normal', fontWeight: 700, lineHeight: 22 }}>
                  Custom
                </RegText>
                <FadeText style={{ marginTop: 4, fontSize: 14, fontStyle: 'normal', fontWeight: 400, lineHeight: 22 }}>
                  {indexerServerUriLocal !== serverUris()[0].uri && indexerServerUriLocal !== serverUris()[1].uri ? indexerServerUriLocal : ''}
                </FadeText>
              </View>
            </View>
          </TouchableOpacity>

          <View
            style={{
              justifyContent: 'center',
              marginTop: 10,
            }}
          >
            <FadeText style={{ marginBottom: 21, fontSize: 14, fontStyle: 'normal', fontWeight: 400, lineHeight: 22 }}>
              OR
            </FadeText>
          </View>

          <View
            style={{
              justifyContent: 'center',
              marginTop: 10,
              backgroundColor: '#28282A',
              borderRadius: 1000,
              paddingVertical: 4,
              paddingHorizontal: 10,
              marginBottom: 21,
            }}
          >
            <TouchableOpacity
              style={{
              }}
              disabled={actionButtonsDisabled}
              onPress={() => {
                setIndexerServerUriLocal('');
                setIndexerServerChainNameLocal(ChainNameEnum.regtestChainName);
                setBorderColor('transparent');
                setConnected(null);
              }}
            >
              <FadeText style={{ fontSize: 15, fontStyle: 'normal', fontWeight: 400, lineHeight: 20, letterSpacing: -0.23 }}>
                Use regtest
              </FadeText>
            </TouchableOpacity>
          </View>

          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              margin: 0,
              marginBottom: 4,
              minWidth: 48,
              minHeight: 48,
              gap: 10,
              marginLeft: 20,
            }}
          >
            {actionButtonsDisabled && (
              <ActivityIndicator size="small" color={colors.text} />
            )}
            {connected !== null && connected && (
              <FontAwesomeIcon size={20} icon={faCheck} color={borderColor} />
            )}
            {connected !== null && !connected && (
              <FontAwesomeIcon size={20} icon={faWarning} color={borderColor} />
            )}
            <RegText color={actionButtonsDisabled ? colors.text : borderColor}>
              {actionButtonsDisabled
                ? 'Connecting...'
                : connected === null
                  ? ''
                  : connected
                    ? 'Connected'
                    : 'Could not connect to indexer'}
            </RegText>
          </View>

          {(!netInfo.isConnected ||
            netInfo.type === NetInfoStateType.cellular ||
            netInfo.isConnectionExpensive) &&
            false && (
              <>
                <BoldText style={{ fontSize: 15, marginBottom: 3 }}>
                  {translate('report.networkstatus') as string}
                </BoldText>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    marginHorizontal: 20,
                  }}
                >
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      marginBottom: 10,
                    }}
                  >
                    {!netInfo.isConnected && (
                      <BoldText style={{ fontSize: 15, color: 'red' }}>
                        {' '}
                        {translate('report.nointernet') as string}{' '}
                      </BoldText>
                    )}
                    {netInfo.type === NetInfoStateType.cellular && (
                      <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                        {' '}
                        {translate('report.cellulardata') as string}{' '}
                      </BoldText>
                    )}
                    {netInfo.isConnectionExpensive && (
                      <BoldText style={{ fontSize: 15, color: 'yellow' }}>
                        {' '}
                        {translate('report.connectionexpensive') as string}{' '}
                      </BoldText>
                    )}
                  </View>
                </View>
              </>
            )}
        </View>

        <View
          style={{
            marginTop: 'auto',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 10,
            paddingBottom: 20,
            paddingHorizontal: 20,
          }}
        >
          {connected ? (
            <LiquidPrimaryButton
              title="Continue"
              onPress={() => {
                // using params
                setIndexerServer(indexerServerUriLocal, indexerServerChainNameLocal);
                Keyboard.dismiss();
                clear();
                // the App needs some time to store data.
                setTimeout(() => {
                  closeServers();
                }, 100);
              }}
              style={{
                alignSelf: 'stretch',
              }}
            />
          ) : (
            <LiquidPrimaryButton
              title={connected === null ? 'Test Connection' : 'Retry'}
              disabled={actionButtonsDisabled || !indexerServerUriLocal || !indexerServerChainNameLocal}
              onPress={async () => {
                setConnected(null);
                setBorderColor('transparent');
                const {
                  result: _connected,
                  indexerServerUriParsed: _indexerServerUri,
                } = await checkIndexerServer(indexerServerUriLocal, indexerServerChainNameLocal);
                setConnected(_connected);
                // using local state
                setIndexerServerUriLocal(_indexerServerUri);
                if (_connected) {
                  setBorderColor('#0E9634');
                } else {
                  setBorderColor('#ff383c');
                }
                Keyboard.dismiss();
              }}
              style={{
                alignSelf: 'stretch',
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};

export default SelectNetwork;
