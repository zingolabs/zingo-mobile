import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import React from 'react';

type DrawerProps = {
  initialRouteName: string;
  children: any;
  drawerContent?: (props: DrawerContentComponentProps) => React.ReactNode;
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
function Drawer({ initialRouteName, drawerContent, children }: DrawerProps) {
  return (
    <SideBar.Navigator
      drawerContent={drawerContent}
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
