import React, { useContext } from 'react';

import { LaunchingModeEnum, RouteEnum } from '@app/AppState';
import { ContextAppLoading } from '@app/context';
import { useSession } from './session';
import { LoadingStack, Onboarding } from './loadingStack';
import {
  ImportChooserScreen,
  ImportWalletScreen,
  OpenErrorScreen,
  ProgressScreen,
  ServerListScreen,
  ServerScreen,
  WelcomeScreen,
} from './onboardingScreens';
import Launching from '@screens/Launching';

// The start gate runs behind this screen, then the wallet opens.
function BootScreen() {
  const { translate, updating } = useContext(ContextAppLoading);
  return (
    <Launching
      translate={translate}
      firstLaunchingMessage={
        updating ? LaunchingModeEnum.updating : LaunchingModeEnum.opening
      }
      biometricGate={{ kind: 'passed' }}
    />
  );
}

// The declined gate, with its reason and a retry.
function LockScreen() {
  const { translate, biometricGate, retryGate } = useContext(ContextAppLoading);
  return (
    <Launching
      translate={translate}
      firstLaunchingMessage={LaunchingModeEnum.opening}
      biometricGate={biometricGate}
      tryAgain={retryGate}
    />
  );
}

// The onboarding stage opens on the welcome, or on the error of a wallet
// that did not open.
function OnboardingSection() {
  const { session } = useSession();
  const start = session.kind === 'onboarding' ? session.start : undefined;
  return (
    <Onboarding.Navigator initialRouteName={start}>
      <Onboarding.Screen name={RouteEnum.Welcome} component={WelcomeScreen} />
      <Onboarding.Screen name={RouteEnum.Progress} component={ProgressScreen} />
      <Onboarding.Screen
        name={RouteEnum.ImportChooser}
        component={ImportChooserScreen}
      />
      <Onboarding.Screen
        name={RouteEnum.OpenError}
        component={OpenErrorScreen}
      />
      <Onboarding.Screen name={RouteEnum.Server} component={ServerScreen} />
      <Onboarding.Screen
        name={RouteEnum.ServerList}
        component={ServerListScreen}
      />
      <Onboarding.Screen
        name={RouteEnum.ImportWallet}
        component={ImportWalletScreen}
      />
    </Onboarding.Navigator>
  );
}

// The loading section: one of the boot, the lock and the onboarding stage,
// chosen by the session. LoadingApp provides their context around it.
export function LoadingNavigator() {
  const { session } = useSession();
  return (
    <LoadingStack.Navigator
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      {session.kind === 'locked' ? (
        <LoadingStack.Screen name={RouteEnum.Lock} component={LockScreen} />
      ) : session.kind === 'boot' ? (
        <LoadingStack.Screen name={RouteEnum.Boot} component={BootScreen} />
      ) : (
        <LoadingStack.Screen
          name={RouteEnum.Onboarding}
          component={OnboardingSection}
        />
      )}
    </LoadingStack.Navigator>
  );
}
