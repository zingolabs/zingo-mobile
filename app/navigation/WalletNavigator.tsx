import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import { Route } from '@app/AppState';
import { ContextAppLoaded, useSwapService } from '@app/context';
import { AppDrawerParamList, HomeTabParamList } from '@app/types';
import CustomTabBar from './CustomTabBar';
import LoadedAppOptionsPanelHost from '@app/LoadedApp/LoadedAppOptionsPanelHost';

import { AddressBook } from '@screens/AddressBook';
import History from '@screens/History';
import Send from '@screens/Send';
import Receive from '@screens/Receive';
import Swap from '@screens/Swap';
import Settings from '@screens/Settings';
import WalletServer from '@screens/Server/WalletServer';
import { MessageList } from '@screens/Messages';
import { AddressList } from '@screens/AddressList';
import ValueTransferDetail from '@screens/ValueTransferDetail';
import Confirm from '@screens/Confirm';

const About = React.lazy(() => import('@screens/About'));
const MixnetDoctor = React.lazy(() => import('@screens/MixnetDoctor'));
const SyncReport = React.lazy(() => import('@screens/SyncReport'));
const Pools = React.lazy(() => import('@screens/Pools'));
const MeetIronwood = React.lazy(() => import('@screens/MeetIronwood'));
const SeedBackup = React.lazy(() => import('@screens/SeedBackup'));
const WalletSeed = React.lazy(() => import('@screens/WalletSeed'));
const ViewingKey = React.lazy(() => import('@screens/ViewingKey'));
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
const ComputingTxContent = React.lazy(() => import('@screens/Computing'));
const SwapReview = React.lazy(() => import('@screens/SwapReview'));
const SwapDeposit = React.lazy(() => import('@screens/SwapDeposit'));
const SwapTracking = React.lazy(() => import('@screens/SwapTracking'));
const SwapResult = React.lazy(() => import('@screens/SwapResult'));
const SwapDetail = React.lazy(() => import('@screens/SwapDetail'));
const SwapTransaction = React.lazy(() => import('@screens/SwapTransaction'));

const Stack = createNativeStackNavigator<AppDrawerParamList>();
const Tab = createBottomTabNavigator<HomeTabParamList>();

const renderTabBar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

// The home tabs. Send needs a wallet that can spend and a server to send
// through; without either the tab is absent. Swap needs the same plus the
// swap service, which exists on mainnet alone.
function HomeTabs() {
  const { readOnly, server } = useContext(ContextAppLoaded);
  const swapService = useSwapService();
  return (
    <Tab.Navigator
      detachInactiveScreens={true}
      initialRouteName={Route.History}
      backBehavior="initialRoute"
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name={Route.History} component={History} />
      {!readOnly && server.kind === 'remote' && (
        <Tab.Screen name={Route.Send} component={Send} />
      )}
      <Tab.Screen name={Route.Receive} component={Receive} />
      {!readOnly && server.kind === 'remote' && !!swapService && (
        <Tab.Screen name={Route.Swap} component={Swap} />
      )}
    </Tab.Navigator>
  );
}

// The home tabs under the options panel: a screen the panel opens is pushed
// over both, and the panel is still open when that screen pops.
function Home() {
  return (
    <LoadedAppOptionsPanelHost>
      <HomeTabs />
    </LoadedAppOptionsPanelHost>
  );
}

// The wallet section: the home with its options panel, the screens pushed
// over them, the one-way flows, and the overlays.
export function WalletNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={Route.Home}
      screenOptions={{
        headerShown: false,
        // Each screen extends edge-to-edge (BottomSheets handle their own
        // safe areas); no extra padding in the scene wrapper.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name={Route.Home} component={Home} />
      <Stack.Group>
        <Stack.Screen name={Route.Settings} component={Settings} />
        <Stack.Screen
          name={Route.Server}
          component={WalletServer}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name={Route.About} component={About} />
        <Stack.Screen name={Route.MixnetDoctor} component={MixnetDoctor} />
        <Stack.Screen name={Route.Insight} component={Insight} />
        <Stack.Screen name={Route.SyncReport} component={SyncReport} />
        <Stack.Screen name={Route.Pools} component={Pools} />
        <Stack.Screen
          name={Route.WalletSeed}
          component={WalletSeed}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name={Route.AddressBook} component={AddressBook} />
        <Stack.Screen
          name={Route.ValueTransferDetail}
          component={ValueTransferDetail}
        />
        <Stack.Screen name={Route.AddressList} component={AddressList} />
        <Stack.Screen name={Route.Messages} component={MessageList} />
        <Stack.Screen name={Route.Confirm} component={Confirm} />
        <Stack.Screen name={Route.Computing} component={ComputingTxContent} />
        <Stack.Screen name={Route.SwapDetail} component={SwapDetail} />
        <Stack.Screen
          name={Route.SwapTransaction}
          component={SwapTransaction}
        />
      </Stack.Group>
      {/* One-way flows: no swipe back; each screen closes itself, and the
        ones that broadcast block hardware back while they run. */}
      <Stack.Group screenOptions={{ gestureEnabled: false }}>
        <Stack.Screen name={Route.MeetIronwood} component={MeetIronwood} />
        <Stack.Screen
          name={Route.MigrationStrategy}
          component={MigrationStrategy}
        />
        <Stack.Screen
          name={Route.MigrationTransactions}
          component={MigrationTransactions}
        />
        <Stack.Screen
          name={Route.MigrationSending}
          component={MigrationSending}
        />
        <Stack.Screen
          name={Route.MigrationSplitPlan}
          component={MigrationSplitPlan}
        />
        <Stack.Screen
          name={Route.MigrationSplitting}
          component={MigrationSplitting}
        />
        <Stack.Screen
          name={Route.MigrationCadence}
          component={MigrationCadence}
        />
        <Stack.Screen
          name={Route.MigrationSchedule}
          component={MigrationSchedule}
        />
        <Stack.Screen
          name={Route.MigrationStatus}
          component={MigrationStatus}
        />
        <Stack.Screen
          name={Route.MigrationBatchSending}
          component={MigrationBatchSending}
        />
        <Stack.Screen name={Route.SwapReview} component={SwapReview} />
        <Stack.Screen name={Route.SwapDeposit} component={SwapDeposit} />
        <Stack.Screen name={Route.SwapTracking} component={SwapTracking} />
        <Stack.Screen name={Route.SwapResult} component={SwapResult} />
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
        <Stack.Screen name={Route.SeedBackup} component={SeedBackup} />
        <Stack.Screen name={Route.ViewingKey} component={ViewingKey} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
