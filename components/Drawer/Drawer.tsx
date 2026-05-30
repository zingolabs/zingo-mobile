import {
  createDrawerNavigator,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import React from 'react';
import Menu from './components/Menu';
import { MenuItemEnum, ScreenEnum } from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';

type DrawerProps = {
  onMenuItemSelected: (i: MenuItemEnum) => void;
  screenName: ScreenEnum;
  initialRouteName: string;
  children: React.ReactNode;
};

const SideBar = createDrawerNavigator<AppDrawerParamList>();

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
function Drawer({
  onMenuItemSelected,
  screenName,
  initialRouteName,
  children,
}: DrawerProps) {
  const menu = (props: DrawerContentComponentProps) => (
    <Menu
      onItemSelected={onMenuItemSelected}
      screenName={screenName}
      toggleMenuDrawer={() => props.navigation.toggleDrawer()}
    />
  );

  return (
    <SideBar.Navigator
      drawerContent={menu}
      initialRouteName={initialRouteName as keyof AppDrawerParamList}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        // Each screen extends its content (BottomSheet) edge-to-edge of the
        // device. Any padding here would create a dark strip around the
        // sheet — top inset is already applied once by the root SafeAreaView
        // in App.tsx, and the sheet handles its own bottom safe area inset.
        sceneStyle: { paddingTop: 0, paddingBottom: 0 },
      }}
    >
      {children}
    </SideBar.Navigator>
  );
}

Drawer.Screen = SideBar.Screen;

export default Drawer;
