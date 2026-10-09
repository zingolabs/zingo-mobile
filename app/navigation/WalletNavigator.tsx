import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import { RouteEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { AppDrawerParamList, HomeTabParamList } from '@app/types';
import CustomTabBar from './CustomTabBar';

import { AddressBook } from '@screens/AddressBook';
import History from '@screens/History';
import Send from '@screens/Send';
import Receive from '@screens/Receive';
import Settings from '@screens/Settings';
import WalletServer from '@screens/Server/WalletServer';
import { MessageList } from '@screens/Messages';
import { AddressList } from '@screens/AddressList';
import ValueTransferDetail from '@screens/ValueTransferDetail';
import Confirm from '@screens/Confirm';

const About = React.lazy(() => import('@screens/About'));
const MixnetDoctor = React.lazy(() => import('@screens/MixnetDoctor'));
const Seed = React.lazy(() => import('@screens/Seed'));
const SyncReport = React.lazy(() => import('@screens/SyncReport'));
const Rescan = React.lazy(() => import('@screens/Rescan'));
const Pools = React.lazy(() => import('@screens/Pools'));
const MeetIronwood = React.lazy(() => import('@screens/MeetIronwood'));
const SeedBackup = React.lazy(() => import('@screens/SeedBackup'));
const WalletSeed = React.lazy(() => import('@screens/WalletSeed'));
const MigrationStrategy = React.lazy(
  () => import('@screens/MigrationStrategy'),
);
const MigrationTransactions = React.lazy(
  () => import('@screens/MigrationTransactions'),
);
const MigrationSending = React.lazy(() => import('@screens/MigrationSending'));
const MigrationSplitPlan = React.lazy(
  () => import('@screens/MigrationSplitPlan'),
);
const MigrationSplitting = React.lazy(
  () => import('@screens/MigrationSplitting'),
);
const MigrationCadence = React.lazy(() => import('@screens/MigrationCadence'));
const MigrationSchedule = React.lazy(
  () => import('@screens/MigrationSchedule'),
);
const MigrationStatus = React.lazy(() => import('@screens/MigrationStatus'));
const MigrationBatchSending = React.lazy(
  () => import('@screens/MigrationBatchSending'),
);
const Insight = React.lazy(() => import('@screens/Insight'));
const ShowUfvk = React.lazy(() => import('@screens/Ufvk/ShowUfvk'));
const ComputingTxContent = React.lazy(() => import('@screens/Computing'));

const Stack = createNativeStackNavigator<AppDrawerParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

// The home tabs. Send needs a wallet that can spend and a server to send
// through; without either the tab is absent.
function HomeTabs() {
  const { readOnly, server } = useContext(ContextAppLoaded);
  return (
    <Tab.Navigator
      detachInactiveScreens={true}
      initialRouteName={RouteEnum.History}
      backBehavior="initialRoute"
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name={RouteEnum.History} component={History} />
      {!readOnly && server.kind === 'remote' && (
        <Tab.Screen name={RouteEnum.Send} component={Send} />
      )}
      <Tab.Screen name={RouteEnum.Receive} component={Receive} />
    </Tab.Navigator>
  );
}

// The wallet section: the home tabs, the screens pushed over them, the
// one-way flows, and the overlays. The options panel sits around it at the
// LoadedApp level.
export function WalletNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={RouteEnum.HomeStack}
      screenOptions={{
        headerShown: false,
        // Each screen extends edge-to-edge (BottomSheets handle their own
        // safe areas); no extra padding in the scene wrapper.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name={RouteEnum.HomeStack} component={HomeTabs} />
      <Stack.Group>
        <Stack.Screen name={RouteEnum.Settings} component={Settings} />
        <Stack.Screen name={RouteEnum.Server} component={WalletServer} />
        <Stack.Screen name={RouteEnum.About} component={About} />
        <Stack.Screen name={RouteEnum.MixnetDoctor} component={MixnetDoctor} />
        <Stack.Screen name={RouteEnum.Rescan} component={Rescan} />
        <Stack.Screen name={RouteEnum.Insight} component={Insight} />
        <Stack.Screen name={RouteEnum.Ufvk} component={ShowUfvk} />
        <Stack.Screen name={RouteEnum.Seed} component={Seed} />
        <Stack.Screen name={RouteEnum.SyncReport} component={SyncReport} />
        <Stack.Screen name={RouteEnum.Pools} component={Pools} />
        <Stack.Screen
          name={RouteEnum.WalletSeed}
          component={WalletSeed}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name={RouteEnum.AddressBook} component={AddressBook} />
        <Stack.Screen
          name={RouteEnum.ValueTransferDetail}
          component={ValueTransferDetail}
        />
        <Stack.Screen name={RouteEnum.AddressList} component={AddressList} />
        <Stack.Screen name={RouteEnum.Messages} component={MessageList} />
        <Stack.Screen name={RouteEnum.Confirm} component={Confirm} />
        <Stack.Screen
          name={RouteEnum.Computing}
          component={ComputingTxContent}
        />
      </Stack.Group>
      {/* One-way flows: no swipe back; each screen closes itself, and the
        ones that broadcast block hardware back while they run. */}
      <Stack.Group screenOptions={{ gestureEnabled: false }}>
        <Stack.Screen name={RouteEnum.MeetIronwood} component={MeetIronwood} />
        <Stack.Screen
          name={RouteEnum.MigrationStrategy}
          component={MigrationStrategy}
        />
        <Stack.Screen
          name={RouteEnum.MigrationTransactions}
          component={MigrationTransactions}
        />
        <Stack.Screen
          name={RouteEnum.MigrationSending}
          component={MigrationSending}
        />
        <Stack.Screen
          name={RouteEnum.MigrationSplitPlan}
          component={MigrationSplitPlan}
        />
        <Stack.Screen
          name={RouteEnum.MigrationSplitting}
          component={MigrationSplitting}
        />
        <Stack.Screen
          name={RouteEnum.MigrationCadence}
          component={MigrationCadence}
        />
        <Stack.Screen
          name={RouteEnum.MigrationSchedule}
          component={MigrationSchedule}
        />
        <Stack.Screen
          name={RouteEnum.MigrationStatus}
          component={MigrationStatus}
        />
        <Stack.Screen
          name={RouteEnum.MigrationBatchSending}
          component={MigrationBatchSending}
        />
      </Stack.Group>
      {/* Overlays draw their own container transform over the screen
        behind them. */}
      <Stack.Group
        screenOptions={{
          presentation: 'transparentModal',
          animation: 'none',
          gestureEnabled: false,
        }}
      >
        <Stack.Screen name={RouteEnum.SeedBackup} component={SeedBackup} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
