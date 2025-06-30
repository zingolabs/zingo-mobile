import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import React from 'react';
import Menu from './components/Menu';
import { MenuItemEnum, ScreenEnum } from '../../app/AppState';
import { HideReturn } from 'react-native-magic-modal';

type DrawerProps = {
  onMenuItemSelected: (i: MenuItemEnum) => Promise<HideReturn<unknown> | undefined>;
  screenName: ScreenEnum;
  initialRouteName: string;
  children: React.ReactNode;
};

const SideBar = createDrawerNavigator();

/**
 * A drawer component.
 *
 * If using a nested navigator, this should be used as the root navigator.
 * @param children A set of child views
 * @returns Drawer
 *
 * @example
 * // Example usage:
 * function App() {
 *   <Drawer initialRouteName="About">
 *     <Drawer.Screen name="Settings" component={Settings} />
 *     <Drawer.Screen name="Info" component={Info} />
 *     <Drawer.Screen name="About" component={About} />
 *   </Drawer>
 * }
 */
function Drawer({ onMenuItemSelected, screenName, initialRouteName, children }: DrawerProps) {
  const menu = (props: DrawerContentComponentProps) => <Menu onItemSelected={onMenuItemSelected} screenName={screenName} {...props} />;

  return (
    <SideBar.Navigator
      drawerContent={menu}
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
      }}>
      {children}
    </SideBar.Navigator>
  );
}

Drawer.Screen = SideBar.Screen;

export default Drawer;
