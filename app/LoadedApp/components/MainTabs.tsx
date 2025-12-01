import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { RouteEnum } from '../../AppState';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../types/ThemeType';
import StakingScreen from '../../../components/Staking/Staking';
import History from '../../../components/History';
import { Platform } from 'react-native';

type MainTabParamList = {
  [RouteEnum.History]: undefined;
  [RouteEnum.StakingHome]: undefined;
};

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

type MainTabsProps = {
  scrollToTop: boolean;
  setScrollToTop: (value: boolean) => void;
  setScrollToBottom: (value: boolean) => void;
  setShieldingAmount: (value: number) => void;
};

export const MainTabs: React.FC<MainTabsProps> = ({
  scrollToTop,
  setScrollToTop,
  setScrollToBottom,
  setShieldingAmount,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.zingo,
      }}
      tabBarStyle={{ 
        backgroundColor: colors.background 
      }}
    >
      <Tab.Screen
        name={RouteEnum.History}
        options={{
          title: 'Home',
          tabBarIcon: () =>
            Platform.select({
              ios: { sfSymbol: 'house' },
              android: require('../../../assets/icons/house.png'),
          }),
          tabBarActiveTintColor: colors.primary,
        }}
      >
        {props => (
          <History
            {...props}
            toggleMenuDrawer={() => {}}
            setShieldingAmount={setShieldingAmount}
            setScrollToTop={setScrollToTop}
            scrollToTop={scrollToTop}
            setScrollToBottom={setScrollToBottom}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name={RouteEnum.StakingHome}
        component={StakingScreen}
        options={{
          title: 'Staking',
          tabBarIcon: () =>
            Platform.select({
              ios: { sfSymbol: 'square.stack.3d.up.fill' },
              android: require('../../../assets/icons/layers.png'),
          }),
          tabBarActiveTintColor: colors.primary,
        }}
      />
    </Tab.Navigator>
  );
};
