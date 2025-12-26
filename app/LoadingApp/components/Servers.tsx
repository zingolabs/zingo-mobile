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
import { ChainNameEnum, GlobalConst, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import BoldText from '../../../components/Components/BoldText';
import { ToastProvider, useToast } from 'react-native-toastier';
import Snackbars from '../../../components/Components/Snackbars';
import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { serverUris } from '../../uris';
import RNPickerSelect from 'react-native-picker-select';
import {
  faCheck,
  faWarning,
} from '@fortawesome/free-solid-svg-icons';
import ChevronDown from '../../../assets/icons/chevron-down.svg';
import XIcon from '../../../assets/icons/x.svg';
import LiquidPrimaryButton from '../../../components/Staking/LiquidPrimaryButton';
import { HeaderTitle } from '../../../components/Header';

type ServersProps = {
  actionButtonsDisabled: boolean;
  setIndexerServerUri: (v: string) => Promise<void>;
  checkIndexerServer: (
    indexerServerUri: string,
  ) => Promise<{ result: boolean; indexerServerUriParsed: string }>;
  closeServers: () => void;
  fromSettings: boolean;
};

const Servers: React.FunctionComponent<ServersProps> = ({
  actionButtonsDisabled,
  setIndexerServerUri,
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

  const insets = useSafeAreaInsets();

  const maxW = 520; //tablets -> landscape.

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
            ? 'Mainnet'
            : chain === ChainNameEnum.testChainName
            ? 'Testnet'
            : chain === ChainNameEnum.regtestChainName
            ? 'Regtest'
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
        {fromSettings && (
          <HeaderTitle title='' goBack={() => {
            clear();
            closeServers();
          }} />
        )}

        <View
          style={{
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 8,
            paddingHorizontal: 16,
          }}
        >
          <RegText color={colors.text} style={{ fontSize: 25 }}>
            Indexer Server
          </RegText>

          <FadeText style={{ marginBottom: 20, marginTop: 5 }}>
            Server URL
          </FadeText>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-start',
              borderColor: colors.zingo,
              borderWidth: 1,
              borderRadius: 12,
              marginBottom: 10,
              backgroundColor: colors.secondary,
              width: '100%',
              maxWidth: maxW,
              minWidth: '50%',
              height: 44,
              alignItems: 'center',
              paddingHorizontal: 16,
            }}
          >
            <TextInput
              placeholder={GlobalConst.serverPlaceHolder}
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

            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <RNPickerSelect
                darkTheme
                style={{
                  modalViewBottom: {
                    minHeight: 300,
                  },
                }}
                pickerProps={{
                  mode: 'dialog',
                  itemStyle: {
                    color: colors.zingo,
                  },
                }}
                fixAndroidTouchableBug={true}
                value={indexerServerUriLocal}
                items={[
                  { label: `${serverUris()[0].uri}  [${getChainName(serverUris()[0].chainName)}]`, value: serverUris()[0].uri },
                  { label: `${serverUris()[1].uri}  [${getChainName(serverUris()[1].chainName)}]`, value: serverUris()[1].uri },
                  { label: `${serverUris()[2].uri}  [${getChainName(serverUris()[2].chainName)}]`, value: serverUris()[2].uri },
                ]}
                placeholder={{
                  label: translate('settings.select-placeholder') as string,
                  value: null,
                  color: colors.primary,
                }}
                disabled={actionButtonsDisabled}
                useNativeAndroidPickerStyle={false}
                onValueChange={(itemValue: string) => {
                  if (itemValue) {
                    Keyboard.dismiss();
                    setConnected(null);
                    setBorderColor(colors.primary);
                    setIndexerServerUriLocal(itemValue);
                  }
                }}
              >
                <ChevronDown
                  width={30}
                  height={30}
                  style={{ marginHorizontal: 15 }}
                  color={colors.text}
                />
              </RNPickerSelect>
            </View>

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
                setIndexerServerUri(indexerServerUriLocal);
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
              disabled={actionButtonsDisabled || !indexerServerUriLocal}
              onPress={async () => {
                setConnected(null);
                setBorderColor('transparent');
                const {
                  result: _connected,
                  indexerServerUriParsed: _indexerServerUri,
                } = await checkIndexerServer(indexerServerUriLocal);
                setConnected(_connected);
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

export default Servers;
