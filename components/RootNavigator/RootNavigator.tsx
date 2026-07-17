import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../../app/types';

const Stack = createNativeStackNavigator<AppDrawerParamList>();

type RootNavigatorProps = {
  initialRouteName: string;
  children: React.ReactNode;
};

/**
 * Stack-based replacement for the legacy left-slide Drawer. Each menu item
 * pushes a screen on top of the home tabs; the new Options panel (vertical
 * slide-down overlay) is wired separately at LoadedApp level via the
 * OptionsPanelProvider — this navigator only handles the screen graph.
 *
 * Mirrors the old `<Drawer>` prop shape (children = list of `Screen`s,
 * initialRouteName) so call sites only swap the wrapper component name.
 */
function RootNavigator({ initialRouteName, children }: RootNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName as keyof AppDrawerParamList}
      screenOptions={{
        headerShown: false,
        // Each screen extends edge-to-edge (BottomSheets handle their own
        // safe areas); no extra padding in the scene wrapper.
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {children}
    </Stack.Navigator>
  );
}

RootNavigator.Screen = Stack.Screen;

export default RootNavigator;
