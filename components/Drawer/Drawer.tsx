import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';

export const SideBar = createDrawerNavigator();

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
 *   <Drawer>
 *     <Drawer.Screen name="Settings" component={Settings} />
 *     <Drawer.Screen name="Info" component={Info} />
 *     <Drawer.Screen name="About" component={About} />
 *   </Drawer>
 * }
 */
function Drawer({ children }: { children: any }) {
  return (
    <SideBar.Navigator
      initialRouteName="Home"
      screenOptions={{
        drawerType: 'slide',
      }}>
      {children}
    </SideBar.Navigator>
  );
}

Drawer.Screen = SideBar.Screen;

export { Drawer };
