/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { ActivityIndicator, Keyboard, Pressable, View } from 'react-native';
import { ChainNameEnum } from '../../AppState';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../types/ThemeType';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FadeText from '../../../components/Components/FadeText';
import { FlatList } from 'react-native-gesture-handler';
import RegText from '../../../components/Components/RegText';
import LiquidPrimaryButton from '../../../components/Components/LiquidButton/LiquidPrimaryButton';
import { faCheck, faX } from '@fortawesome/free-solid-svg-icons';
import { Indexer, IndexerList } from '../../utils/Utils';
import { HeaderTitle } from '../../../components/Header';
import { useToast } from 'react-native-toastier';

const IOS_LIST_SEPARATOR = '#3C3C3D';
const IOS_GROUP_BG = '#1C1C1E';
const IOS_ROW_BG = '#222223';

export type ServerOption = {
  id: string;
  name: string;
  uri: string;
  chainName: ChainNameEnum;
};

export type ServerListScreenProps = {
  // serverOptions: ServerOption[];
  initialSelectedUri?: string;
  initialSelectedChainName?: ChainNameEnum;
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  checkIndexerServer: (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
  ) => Promise<{ result: boolean; indexerServerUriParsed: string }>;
  indexerList: IndexerList;
  closeServers: () => void;
  goBack: () => void;
};

export const ServerListScreen: React.FC<ServerListScreenProps> = ({
  checkIndexerServer,
  setIndexerServer,
  indexerList,
  closeServers,
  goBack,
}) => {
  const { colors } = useTheme() as unknown as ThemeType; // TODO: FIX
  const insets = useSafeAreaInsets();
  const { clear } = useToast();

  const [selectedServer, setSelectedServer] = useState<Indexer | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [borderColor, setBorderColor] = useState<string>('transparent');
  const [isTestingSelected, setIsTestingSelected] = useState(false);

  const onSelectServer = (item: Indexer) => {
    if (isTestingSelected) {
      return;
    }

    const isSame = selectedServer?.url === item.url;

    if (isSame) {
      return;
    }

    setSelectedServer(item);
    setConnected(null);
    setBorderColor('transparent');
  };

  const onTestConnection = async () => {
    if (!selectedServer) {
      return;
    }

    setConnected(null);
    setBorderColor('transparent');
    setIsTestingSelected(true);

    try {
      const { result } = await checkIndexerServer(
        'http://' + selectedServer.url,
        ChainNameEnum.testChainName,
      );

      setConnected(result);
      setBorderColor(result ? '#0E9634' : '#ff383c');
    } finally {
      setIsTestingSelected(false);
      Keyboard.dismiss();
    }
  };

  const onContinue = async () => {
    if (!selectedServer) {
      return;
    }

    await setIndexerServer(selectedServer.url, ChainNameEnum.testChainName);
    Keyboard.dismiss();
    closeServers();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <HeaderTitle
        title="Connect to indexer"
        goBack={() => {
          clear();

          goBack();
        }}
      />
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
        }}
      >
        <FadeText
          style={{
            fontSize: 15,
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          Select from available servers
        </FadeText>
      </View>

      <View
        style={{
          marginHorizontal: 16,
          borderRadius: 26,
          overflow: 'hidden',
          backgroundColor: IOS_GROUP_BG,
        }}
      >
        <FlatList
          style={{
            height: '70%',
          }}
          data={indexerList}
          keyExtractor={item => item.url}
          ItemSeparatorComponent={Separator}
          renderItem={({ item }) => {
            const selected = selectedServer?.url === item.url;
            const showRowSpinner = selected && isTestingSelected;

            return (
              <Pressable
                onPress={() => onSelectServer(item)}
                disabled={isTestingSelected}
                style={{
                  minHeight: 64,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: IOS_ROW_BG,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 3,
                    borderColor: selected ? '#30D158' : '#636366',
                    marginRight: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected ? (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: '#30D158',
                      }}
                    />
                  ) : null}
                </View>

                <View style={{ flex: 1 }}>
                  <RegText
                    color={colors.text}
                    style={{
                      fontSize: 17,
                      fontWeight: 400,
                    }}
                  >
                    {item.url}
                  </RegText>
                </View>

                <View
                  style={{
                    minWidth: 24,
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  {showRowSpinner ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          contentContainerStyle={{
            paddingBottom: 0,
          }}
        />
      </View>

      <View
        style={{
          minHeight: 36,
          paddingHorizontal: 20,
          paddingTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {connected === true && (
          <FontAwesomeIcon size={18} icon={faCheck} color={borderColor} />
        )}
        {connected === false && (
          <FontAwesomeIcon size={18} icon={faX} color={borderColor} />
        )}

        <RegText color={borderColor}>
          {connected === null
            ? ''
            : connected
              ? 'Connected'
              : 'Could not connect to indexer'}
        </RegText>
      </View>

      <View
        style={{
          marginTop: 'auto',
          paddingHorizontal: 20,
          paddingTop: 0,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        {connected ? (
          <LiquidPrimaryButton
            title="Continue"
            onPress={onContinue}
            style={{ alignSelf: 'stretch' }}
          />
        ) : (
          <LiquidPrimaryButton
            title={connected === null ? 'Test connection' : 'Retry'}
            disabled={!selectedServer || isTestingSelected}
            onPress={onTestConnection}
            style={{ alignSelf: 'stretch' }}
          />
        )}
      </View>
    </View>
  );
};

const Separator = () => (
  <View
    style={{
      height: 1,
      backgroundColor: IOS_LIST_SEPARATOR,
    }}
  />
);
