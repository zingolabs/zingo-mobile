import React, { useContext, useEffect } from 'react';
import { Easing } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import { Route } from '@app/AppState';
import { ContextAppLoaded, useSwapService } from '@app/context';
import { AppDrawerParamList, HomeTabParamList } from '@app/types';
import CustomTabBar from './CustomTabBar';
import { skipExitingWithScreen, walletScreenLayout } from './screenLayout';
import { lazyScreen, preloadScreens } from './lazyScreen';
import { duration } from '@app/theme/motion';
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

const About = lazyScreen(() => import('@screens/About'));
const MixnetDoctor = lazyScreen(() => import('@screens/MixnetDoctor'));
const SyncReport = lazyScreen(() => import('@screens/SyncReport'));
const Pools = lazyScreen(() => import('@screens/Pools'));
const MeetIronwood = lazyScreen(() => import('@screens/MeetIronwood'));
const SeedBackup = lazyScreen(() => import('@screens/SeedBackup'));
const WalletSeed = lazyScreen(() => import('@screens/WalletSeed'));
const ViewingKey = lazyScreen(() => import('@screens/ViewingKey'));
const MigrationStrategy = lazyScreen(
  () => import('@screens/MigrationStrategy'),
);
const MigrationTransactions = lazyScreen(
  () => import('@screens/MigrationTransactions'),
);
const MigrationSending = lazyScreen(() => import('@screens/MigrationSending'));
const Insight = lazyScreen(() => import('@screens/Insight'));
const ComputingTxContent = lazyScreen(() => import('@screens/Computing'));
const SwapReview = lazyScreen(() => import('@screens/SwapReview'));
const SwapDeposit = lazyScreen(() => import('@screens/SwapDeposit'));
const SwapTracking = lazyScreen(() => import('@screens/SwapTracking'));
const SwapResult = lazyScreen(() => import('@screens/SwapResult'));
const SwapDetail = lazyScreen(() => import('@screens/SwapDetail'));
const SwapTransaction = lazyScreen(() => import('@screens/SwapTransaction'));

/**
 * Every lazy screen, loaded one by one once the wallet is up, so no press
 * opens one on an empty frame. The swap screens first, then the menu ones.
 */
const PRELOAD = [
  SwapReview,
  SwapDeposit,
  SwapTracking,
  SwapResult,
  SwapDetail,
  SwapTransaction,
  ComputingTxContent,
  About,
  MixnetDoctor,
  SyncReport,
  Pools,
  WalletSeed,
  Insight,
  SeedBackup,
  ViewingKey,
  MeetIronwood,
  MigrationStrategy,
  MigrationTransactions,
  MigrationSending,
];

const Stack = createNativeStackNavigator<AppDrawerParamList>();

/**
 * Switching home tabs cross-fades the content. The tab navigator animates
 * with React Native's Animated, so the curve is its Easing.
 */
const TAB_FADE = {
  animation: 'fade',
  transitionSpec: {
    animation: 'timing',
    config: {
      duration: duration.tabFade,
      easing: Easing.bezier(0.2, 0, 0, 1),
    },
  },
} as const;

/**
 * A screen opened in depth (a transaction, a review, your addresses) is a
 * full panel over the screen it was opened from, which stays behind it: a
 * transparent modal the stack does not move. FullPanel rises, fades its
 * content in and lowers on its own, at the design's pace (560 / 460 ms,
 * (.32,.72,0,1)), so exactly one thing moves.
 */
const PANEL = {
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

/** A step inside a full panel (sending, sent): the panel is up already. */
const STEP = PANEL;

/** A screen the options panel opens, and Settings: it slides in from the right and back. */
const MENU = { animation: 'slide_from_right' } as const;
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
      screenLayout={skipExitingWithScreen}
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false, ...TAB_FADE }}
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
  useEffect(() => preloadScreens(PRELOAD), []);
  return (
    <Stack.Navigator
      initialRouteName={Route.Home}
      screenLayout={walletScreenLayout}
      screenOptions={{
        headerShown: false,
        // Each screen extends edge-to-edge (BottomSheets handle their own
        // safe areas); no extra padding in the scene wrapper.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name={Route.Home} component={Home} />
      <Stack.Group>
        <Stack.Screen
          name={Route.Settings}
          component={Settings}
          options={MENU}
        />
        <Stack.Screen
          name={Route.Server}
          component={WalletServer}
          options={MENU}
        />
        <Stack.Screen name={Route.About} component={About} options={MENU} />
        <Stack.Screen
          name={Route.MixnetDoctor}
          component={MixnetDoctor}
          options={MENU}
        />
        <Stack.Screen name={Route.Insight} component={Insight} options={MENU} />
        <Stack.Screen
          name={Route.SyncReport}
          component={SyncReport}
          options={MENU}
        />
        <Stack.Screen name={Route.Pools} component={Pools} options={MENU} />
        <Stack.Screen
          name={Route.WalletSeed}
          component={WalletSeed}
          options={MENU}
        />
        <Stack.Screen
          name={Route.AddressBook}
          component={AddressBook}
          options={MENU}
        />
        <Stack.Screen
          name={Route.ValueTransferDetail}
          component={ValueTransferDetail}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.AddressList}
          component={AddressList}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.Messages}
          component={MessageList}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.Confirm}
          component={Confirm}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.Computing}
          component={ComputingTxContent}
          options={STEP}
        />
        <Stack.Screen
          name={Route.SwapDetail}
          component={SwapDetail}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.SwapTransaction}
          component={SwapTransaction}
          options={PANEL}
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
          name={Route.SwapReview}
          component={SwapReview}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.SwapDeposit}
          component={SwapDeposit}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.SwapTracking}
          component={SwapTracking}
          options={PANEL}
        />
        <Stack.Screen
          name={Route.SwapResult}
          component={SwapResult}
          options={PANEL}
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
        <Stack.Screen name={Route.SeedBackup} component={SeedBackup} />
        <Stack.Screen name={Route.ViewingKey} component={ViewingKey} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
