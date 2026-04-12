import React, { useContext, useMemo, useState } from 'react';
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
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { ContextAppLoaded } from '../../context';
import { Indexer, IndexerList } from '../../utils/Utils';

const IOS_LIST_SEPARATOR = 'rgba(60,60,67,0.36)';
const IOS_GROUP_BG = '#1C1C1E';
const IOS_ROW_BG = '#2C2C2E';

export type ServerOption = {
  id: string;
  name: string;
  uri: string;
  chainName: ChainNameEnum;
};

export type ServerListScreenProps = {
  serverOptions: ServerOption[];
  initialSelectedUri?: string;
  initialSelectedChainName?: ChainNameEnum;
  actionButtonsDisabled: boolean;
  setIndexerServer: (u: string, c: ChainNameEnum) => Promise<void>;
  checkIndexerServer: (
    indexerServerUri: string,
    indexerServerChainName: ChainNameEnum,
  ) => Promise<{ result: boolean; indexerServerUriParsed: string }>;
  goConnectIndexer: () => void;
  indexerList: IndexerList;
};

export const ServerListScreen: React.FC<ServerListScreenProps> = ({
  serverOptions,
  actionButtonsDisabled,
  checkIndexerServer,
  setIndexerServer,
  goConnectIndexer,
  indexerList,
}) => {
  const { colors } = useTheme() as ThemeType;
  const insets = useSafeAreaInsets();

  const [selectedServer, setSelectedServer] = useState<Indexer | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [borderColor, setBorderColor] = useState<string>('transparent');

  console.log('selectedServer', selectedServer);

  const onSelectServer = (item: Indexer) => {
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

    const { result, indexerServerUriParsed } = await checkIndexerServer(
      'https://' + selectedServer.url,
      ChainNameEnum.testChainName,
    );

    console.log('RESULT =', result, indexerServerUriParsed);

    const matchedParsedServer = serverOptions.find(
      s => s.uri === indexerServerUriParsed,
    ) ?? {
      ...selectedServer,
      uri: indexerServerUriParsed,
    };

    setSelectedServer(matchedParsedServer);
    setConnected(result);
    setBorderColor(result ? '#0E9634' : '#ff383c');

    Keyboard.dismiss();
  };

  const onContinue = async () => {
    if (!selectedServer) {
      return;
    }

    await setIndexerServer(selectedServer.url, selectedServer.chainName);
    Keyboard.dismiss();
    goConnectIndexer();
  };

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
          paddingHorizontal: 16,
          paddingTop: 8,
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
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: IOS_GROUP_BG,
        }}
      >
        <FlatList
          style={{
            height: '50%',
          }}
          data={indexerList}
          keyExtractor={item => item.url}
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
            const selected = selectedServer?.url === item.url;

            return (
              <Pressable
                onPress={() => onSelectServer(item)}
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
        {actionButtonsDisabled && (
          <ActivityIndicator size="small" color={colors.text} />
        )}

        {connected === true && (
          <FontAwesomeIcon size={18} icon={faCheck} color={borderColor} />
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
            disabled={actionButtonsDisabled || !selectedServer}
            onPress={onTestConnection}
            style={{ alignSelf: 'stretch' }}
          />
        )}
      </View>
    </View>
  );
};
