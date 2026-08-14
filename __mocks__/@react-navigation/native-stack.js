// @react-navigation/native-stack — committing mock (state-machine-hardening CS0).
// RootNavigator builds one native-stack navigator; LoadedApp captures its home
// screen's navigation as `drawerNav`, so `__navigation.navigate` is where the
// Seed-routing invariant is observed.

const { makeNavigator } = require('./committingNavigator');

const instance = makeNavigator();

export const createNativeStackNavigator = jest.fn(() => instance);
export const __navigation = instance.navigation;
