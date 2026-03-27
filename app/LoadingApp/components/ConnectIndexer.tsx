/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  TextInput,
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
import XIcon from '../../../assets/icons/x.svg';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { HeaderTitle } from '../../../components/Header';

function parseUri(uri?: string) {
  if (!uri) return { base: '', port: '' };

  try {
    const url = new URL(uri);

    return {
      base: `${url.protocol}//${url.hostname}`,
      port: url.port,
    };
  } catch {
    return { base: '', port: '' };
  }
}

type ConnectIndexerProps = {
  actionButtonsDisabled: boolean;
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  checkIndexerServer: (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
  ) => Promise<{ result: boolean; indexerServerUriParsed: string }>;
  closeServers: () => void;
  fromSettings: boolean;
  goSelectNetwork: () => void;
};

const ConnectIndexer: React.FunctionComponent<ConnectIndexerProps> = ({
  actionButtonsDisabled,
  setIndexerServer,
  checkIndexerServer,
  closeServers,
  fromSettings,
  goSelectNetwork,
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
  
  const custom: boolean = serverUris().filter(s => s.uri === indexerServerContext.uri).length === 0;
  const { base, port } = parseUri(indexerServerContext.uri);

  const [indexerServerUriLocal, setIndexerServerUriLocal] = useState<string>(custom ? base : '');
  const [indexerServerPortLocal, setIndexerServerPortLocal] = useState<string>(custom ? port : '');  
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

  const getChainName = (chain: ChainNameEnum) => {
    return !chain
            ? '-'
            : chain === ChainNameEnum.mainChainName
            ? 'mainnet'
            : chain === ChainNameEnum.testChainName
            ? 'testnet'
            : chain === ChainNameEnum.regtestChainName
            ? 'regtest'
            : (translate('info.unknown') as string) + ' (' + chain + ')'
  }

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
        <HeaderTitle title='Connect to indexer' goBack={() => {
          clear();
          if (fromSettings && indexerServerChainNameLocal === ChainNameEnum.regtestChainName) {
            closeServers();
          } else {
            goSelectNetwork();
          }
        }} />

        <View
          style={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 27,
          }}
        >
          <FadeText style={{ marginTop: 14, fontSize: 17, fontStyle: 'normal', fontWeight: 600, letterSpacing: -0.43, marginBottom: 58 }}>
            {`Enter your ${getChainName(indexerServerChainNameLocal)} indexer's details`}
          </FadeText>

          <View
            style={{
              justifyContent: 'flex-start',
              borderColor: '#494444',
              borderWidth: 1,
              borderRadius: 15,
              backgroundColor: '#151414',
              width: '100%',
              minWidth: '50%',
              alignItems: 'center',
              paddingHorizontal: 30,
              paddingVertical: 25,
            }}
          >

            <FadeText style={{ marginLeft: 4, fontSize: 14, fontStyle: 'normal', fontWeight: 600, lineHeight: 22, marginBottom: 7, alignSelf: 'flex-start' }}>
              Indexer address
            </FadeText>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: '#494444',
                borderWidth: 1,
                borderRadius: 12,
                marginBottom: 10,
                backgroundColor: '#181717',
                width: '100%',
                minWidth: '50%',
                height: 44,
                alignItems: 'center',
                paddingHorizontal: 16,
              }}
            >
              <TextInput
                placeholder={'127.0.0.1 or localhost'}
                placeholderTextColor={colors.placeholder}
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  color: colors.text,
                  fontWeight: '400',
                  fontSize: 17,
                  paddingVertical: 0,
                  marginLeft: 4,
                  backgroundColor: 'transparent',
                }}
                value={indexerServerUriLocal}
                onChangeText={text => {
                  setConnected(null);
                  setBorderColor(colors.primary);
                  setIndexerServerUriLocal(text);
                  if (serverUris().filter(s => s.uri === text).length > 0) {
                    setIndexerServerChainNameLocal(serverUris().filter(s => s.uri === text)[0].chainName)
                  }
                }}
                editable={!actionButtonsDisabled}
                maxLength={100}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onFocus={() => {
                  if (connected === null) {
                    setBorderColor(colors.primary);
                  }
                }}
                onBlur={() => {
                  if (connected === null) {
                    setBorderColor('transparent');
                  }
                }}
              />

              {!!indexerServerUriLocal && (
                <TouchableOpacity
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIndexerServerUriLocal('');
                    setBorderColor('transparent');
                    setConnected(null);
                  }}
                >
                  <View
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.zingo,
                      borderRadius: 11,
                      height: 22,
                      width: 22,
                      padding: 0,
                    }}
                  >
                    <XIcon color={colors.background} width={20} height={20} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <FadeText style={{ marginLeft: 4, fontSize: 14, fontStyle: 'normal', fontWeight: 600, lineHeight: 22, marginBottom: 7, alignSelf: 'flex-start' }}>
              Port
            </FadeText>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                borderColor: '#494444',
                borderWidth: 1,
                borderRadius: 12,
                marginBottom: 10,
                backgroundColor: '#181717',
                width: '100%',
                minWidth: '50%',
                height: 44,
                alignItems: 'center',
                paddingHorizontal: 16,
              }}
            >
              <TextInput
                placeholder={'e.g. 18232'}
                placeholderTextColor={colors.placeholder}
                style={{
                  flexGrow: 1,
                  flexShrink: 1,
                  color: colors.text,
                  fontWeight: '400',
                  fontSize: 17,
                  paddingVertical: 0,
                  marginLeft: 4,
                  backgroundColor: 'transparent',
                }}
                value={indexerServerPortLocal}
                onChangeText={text => {
                  setConnected(null);
                  setBorderColor(colors.primary);
                  setIndexerServerPortLocal(text);
                  if (serverUris().filter(s => s.uri === text).length > 0) {
                    setIndexerServerChainNameLocal(serverUris().filter(s => s.uri === text)[0].chainName)
                  }
                }}
                editable={!actionButtonsDisabled}
                maxLength={100}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onFocus={() => {
                  if (connected === null) {
                    setBorderColor(colors.primary);
                  }
                }}
                onBlur={() => {
                  if (connected === null) {
                    setBorderColor('transparent');
                  }
                }}
              />

              {!!indexerServerPortLocal && (
                <TouchableOpacity
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    Keyboard.dismiss();
                    setIndexerServerPortLocal('');
                    setBorderColor('transparent');
                    setConnected(null);
                  }}
                >
                  <View
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: colors.zingo,
                      borderRadius: 11,
                      height: 22,
                      width: 22,
                      padding: 0,
                    }}
                  >
                    <XIcon color={colors.background} width={20} height={20} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

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
                let newIndexerServerChainNameLocal: ChainNameEnum = indexerServerChainNameLocal;
                if (
                  serverUris().filter(s => s.uri === `${indexerServerUriLocal}:${indexerServerPortLocal}`)
                    .length > 0
                ) {
                  newIndexerServerChainNameLocal = serverUris().filter(
                    s => s.uri === `${indexerServerUriLocal}:${indexerServerPortLocal}`,
                  )[0].chainName;
                }
                setIndexerServer(`${indexerServerUriLocal}:${indexerServerPortLocal}`, newIndexerServerChainNameLocal);
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
              disabled={actionButtonsDisabled || !indexerServerUriLocal || !indexerServerPortLocal || !indexerServerChainNameLocal || indexerServerUriLocal.replace('://', '').includes(':')}
              onPress={async () => {
                setConnected(null);
                setBorderColor('transparent');
                const {
                  result: _connected,
                  indexerServerUriParsed: _indexerServerUri,
                } = await checkIndexerServer(`${indexerServerUriLocal}:${indexerServerPortLocal}`, indexerServerChainNameLocal);
                setConnected(_connected);
                // using local state
                const { base: basee, port: portt } = parseUri(_indexerServerUri);
                setIndexerServerUriLocal(basee);
                setIndexerServerPortLocal(portt);
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

export default ConnectIndexer;
