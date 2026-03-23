import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RouteEnum } from '../../app/AppState';
import { SettingsMenu } from '.';
import SettingsServers from './components/SettingsServers';
import DebugInfo from './components/DebugInfo';
import Seed from '../Seed';
import { LoadingAppNavigationState } from '../../app/types';
import { Notes } from './components/Notes';

export type SettingsStackParamList = {
  [RouteEnum.SettingsMenu]: undefined;
  [RouteEnum.Seed]: undefined;
  [RouteEnum.SettingsServers]: undefined;
  [RouteEnum.DebugInfo]: undefined;
  [RouteEnum.Notes]: undefined;
};

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

type SettingsNavigatorProps = {
  onClickOKChangeWallet: (state: LoadingAppNavigationState) => Promise<void>;
  navigateToLoadingApp: (state: LoadingAppNavigationState) => Promise<void>;
};

export default function SettingsNavigator({
  onClickOKChangeWallet,
  navigateToLoadingApp,
}: SettingsNavigatorProps) {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'simple_push',
      }}
      initialRouteName={RouteEnum.SettingsMenu}
    >
      <SettingsStack.Screen name={RouteEnum.SettingsMenu}>
        {props => (
          <SettingsMenu
            {...props}
            onClickOKChangeWallet={onClickOKChangeWallet}
          />
        )}
      </SettingsStack.Screen>

      <SettingsStack.Screen name={RouteEnum.Seed}>
        {props => <Seed {...props} />}
      </SettingsStack.Screen>

      <SettingsStack.Screen name={RouteEnum.SettingsServers}>
        {props => (
          <SettingsServers
            {...props}
            navigateToLoadingApp={navigateToLoadingApp}
          />
        )}
      </SettingsStack.Screen>

      <SettingsStack.Screen name={RouteEnum.DebugInfo}>
        {props => <DebugInfo {...props} />}
      </SettingsStack.Screen>

      <SettingsStack.Screen name={RouteEnum.Notes}>
        {() => <Notes />}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
}
