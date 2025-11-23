/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { ToastProvider } from 'react-native-toastier';

import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';

import { AppDrawerParamList, ThemeType } from '../../app/types';
import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import { RouteEnum } from '../../app/AppState';
import LiquidPrimaryButton from './LiquidPrimaryButton';

type StakingProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Staking>;

type StakingTabParamList = {
  Home: undefined;
  Staking: undefined;
};

const Tab = createNativeBottomTabNavigator<StakingTabParamList>();

const StakingScreen: React.FC<StakingProps> = () => {
  const { colors } = useTheme() as ThemeType;

  return (
    <>
      <View
        style={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <RegText
          color={colors.text}
          style={{ fontSize: 30, alignSelf: 'center', marginBottom: 20 }}
        >
          Staking
        </RegText>
        <LiquidPrimaryButton
          title="Accept"
          tintColor={colors.primary}
          onPress={() => {
            console.log('hey');
          }}
        />
      </View>
    </>
  );
};

const StakingHomeTab: React.FC = () => {
  const { colors } = useTheme() as ThemeType;
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RegText color={colors.text} style={{ fontSize: 24 }}>
        Home placeholder
      </RegText>
      <FadeText style={{ color: colors.text, marginTop: 8 }}>
        Replace this with your real History/Send/Receive stack later.
      </FadeText>
    </View>
  );
};

const StakingTabs: React.FC<StakingProps> = props => {
  const { colors } = useTheme() as ThemeType;

  return (
    <ToastProvider>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.zingo,
        }}
      >
        <Tab.Screen
          name="Home"
          component={StakingHomeTab}
          options={{
            title: 'Home',
            tabBarIcon: () => ({ sfSymbol: 'house' }),
            tabBarActiveTintColor: colors.primary,
          }}
        />
        <Tab.Screen
          name="Staking"
          options={{
            title: 'Staking',
            tabBarIcon: () => ({ sfSymbol: 'square.stack.3d.up.fill' }),
            tabBarActiveTintColor: colors.primary,
          }}
        >
          {() => <StakingScreen {...props} />}
        </Tab.Screen>
      </Tab.Navigator>
    </ToastProvider>
  );
};

export default StakingTabs;
