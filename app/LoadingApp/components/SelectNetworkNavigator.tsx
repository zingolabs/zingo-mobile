/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChainNameEnum } from '../../AppState';
import { IndexerList } from '../../utils/Utils';
import { ServerListScreen } from './ServerListScreen';
import { SelectNetworkHomeScreen } from './SelectNetworkHomeScreen';
import ConnectIndexer from './ConnectIndexer';

export type SelectNetworkProps = {
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

export type SelectNetworkStackParamList = {
  SelectNetworkHome: undefined;
  ServerList: undefined;
  ConnectIndexer: {
    chainName: ChainNameEnum;
  };
};

const Stack = createNativeStackNavigator<SelectNetworkStackParamList>();

const SelectNetworkNavigator: React.FC<SelectNetworkProps> = props => {
  return (
    <Stack.Navigator
      initialRouteName="SelectNetworkHome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SelectNetworkHome">
        {screenProps => (
          <SelectNetworkHomeScreen {...screenProps} parentProps={props} />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ServerList"
        options={{
          headerShown: true,
          title: 'Servers',
          headerBackTitle: 'Back',
        }}
      >
        {screenProps => (
          <ServerListScreen
            {...screenProps}
            indexerList={props.indexerList}
            setIndexerServer={props.setIndexerServer}
            checkIndexerServer={props.checkIndexerServer}
            closeServers={props.closeServers}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ConnectIndexer"
        options={{
          headerShown: false,
        }}
      >
        {screenProps => (
          <ConnectIndexer
            {...screenProps}
            actionButtonsDisabled={props.actionButtonsDisabled}
            setIndexerServer={props.setIndexerServer}
            checkIndexerServer={props.checkIndexerServer}
            closeServers={props.closeServers}
            fromSettings={props.fromSettings}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default SelectNetworkNavigator;
