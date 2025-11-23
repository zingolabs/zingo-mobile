/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastProvider } from 'react-native-toastier';

import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';

import { AppDrawerParamList, ThemeType } from '../../app/types';
import RegText from '../Components/RegText';
import FadeText from '../Components/FadeText';
import { RouteEnum } from '../../app/AppState';

type StakingProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Staking>;

type StakingTabParamList = {
  Home: undefined;
  Staking: undefined;
};

const Tab = createNativeBottomTabNavigator<StakingTabParamList>();

const StakingScreen: React.FC<StakingProps> = () => {
  const { colors } = useTheme() as ThemeType;

  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexGrow: 1,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          <RegText
            color={colors.text}
            style={{ fontSize: 30, alignSelf: 'center' }}
          >
            Staking
          </RegText>
        </View>
      </ScrollView>
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
          }}
        />
        <Tab.Screen
          name="Staking"
          options={{
            title: 'Staking',
          }}
        >
          {() => <StakingScreen {...props} />}
        </Tab.Screen>
      </Tab.Navigator>
    </ToastProvider>
  );
};

export default StakingTabs;
