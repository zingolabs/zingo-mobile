/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  View,
  FlatList,
  Pressable,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastProvider, useToast } from 'react-native-toastier';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { NetInfoStateType } from '@react-native-community/netinfo/src/index';

import { ThemeType } from '../../types';
import { ChainNameEnum, ScreenEnum } from '../../AppState';
import { ContextAppLoading } from '../../context';
import Snackbars from '../../../components/Components/Snackbars';
import RegText from '../../../components/Components/RegText';
import FadeText from '../../../components/Components/FadeText';
import ComputerBlue from '../../../assets/icons/computer-blue.svg';
import ComputerWhite from '../../../assets/icons/computer-white.svg';
import { HeaderTitle } from '../../../components/Header';
import { IndexerList } from '../../utils/Utils';

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
  indexerList: IndexerList;
};

type ServerOption = {
  id: string;
  name: string;
  uri: string;
  chainName: ChainNameEnum;
};

type SelectNetworkStackParamList = {
  SelectNetworkHome: undefined;
  ServerList: undefined;
};

const IOS_LIST_SEPARATOR = 'rgba(60,60,67,0.36)';
const IOS_GROUP_BG = '#1C1C1E';
const IOS_ROW_BG = '#2C2C2E';

type SharedSelectionState = {
  selectedUri: string;
  setSelectedUri: React.Dispatch<React.SetStateAction<string>>;
  selectedChainName: ChainNameEnum;
  setSelectedChainName: React.Dispatch<React.SetStateAction<ChainNameEnum>>;
  connected: boolean | null;
  setConnected: React.Dispatch<React.SetStateAction<boolean | null>>;
  borderColor: string;
  setBorderColor: React.Dispatch<React.SetStateAction<string>>;
  serverOptions: ServerOption[];
};

type HomeScreenProps = NativeStackScreenProps<
  SelectNetworkStackParamList,
  'SelectNetworkHome'
> & {
  parentProps: SelectNetworkProps;
};

type ServerListScreenProps = NativeStackScreenProps<
  SelectNetworkStackParamList,
  'ServerList'
> & {
  shared: SharedSelectionState;
};

export const ServerListScreen: React.FC<ServerListScreenProps> = ({
  navigation,
  shared,
}) => {
  const { colors } = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: 8,
      }}
    >
      <View
        style={{
          marginHorizontal: 16,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: IOS_GROUP_BG,
        }}
      >
        <FlatList
          data={shared.serverOptions}
          keyExtractor={item => item.id}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: IOS_LIST_SEPARATOR,
                marginLeft: 16,
              }}
            />
          )}
          renderItem={({ item }) => {
            const selected = shared.selectedUri === item.uri;

            return (
              <Pressable
                onPress={() => {
                  shared.setSelectedUri(item.uri);
                  shared.setSelectedChainName(item.chainName);
                  shared.setConnected(null);
                  shared.setBorderColor('transparent');
                  navigation.goBack();
                }}
                style={{
                  minHeight: 56,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: IOS_ROW_BG,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <RegText
                    color={colors.text}
                    style={{
                      fontSize: 17,
                      fontWeight: 400,
                    }}
                  >
                    {item.name}
                  </RegText>

                  <FadeText
                    style={{
                      marginTop: 2,
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    {item.uri}
                  </FadeText>
                </View>

                {selected ? (
                  <FontAwesomeIcon
                    icon={faCheck}
                    size={18}
                    color={colors.primary}
                  />
                ) : null}
              </Pressable>
            );
          }}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 8,
          }}
        />
      </View>
    </View>
  );
};

export const SelectNetworkHomeScreen: React.FC<HomeScreenProps> = ({
  navigation,
  parentProps,
}) => {
  const { actionButtonsDisabled, closeServers, fromSettings } = parentProps;

  const context = useContext(ContextAppLoading);
  const { netInfo, snackbars, removeFirstSnackbar } = context;

  const { colors } = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();
  const { clear } = useToast();
  const screenName = ScreenEnum.Servers;

  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    const s1 = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const s2 = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

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
            onPress={() => navigation.navigate('ServerList')}
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
                    Select server
                  </RegText>

                  <FadeText
                    style={{
                      marginTop: 4,
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: 22,
                    }}
                  >
                    Choose from available servers
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

          <View
            style={{
              justifyContent: 'center',
              marginTop: 10,
            }}
          >
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
              // TODO: Go to testnet config
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
                  localhost
                </FadeText>
              </View>
            </View>
          </TouchableOpacity>

          {!fromSettings && (
            <>
              <View
                style={{
                  justifyContent: 'center',
                  marginTop: 10,
                }}
              >
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

              <View>
                <TouchableOpacity
                  style={{
                    justifyContent: 'center',
                    marginTop: 10,
                    backgroundColor: '#28282A',
                    borderColor: 'transparent',
                    borderWidth: 1,
                    borderRadius: 1000,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    marginBottom: 21,
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={actionButtonsDisabled}
                  onPress={() => {
                    // TODO: Go to regtest config
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
              </View>
            </>
          )}

          {(!netInfo.isConnected ||
            netInfo.type === NetInfoStateType.cellular ||
            netInfo.isConnectionExpensive) &&
            false && <View />}

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
              marginLeft: 0,
              marginTop: 8,
            }}
          >
            {actionButtonsDisabled && (
              <ActivityIndicator size="small" color={colors.text} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ToastProvider>
  );
};
