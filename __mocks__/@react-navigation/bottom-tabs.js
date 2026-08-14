// @react-navigation/bottom-tabs — committing mock (state-machine-hardening CS0).
// LoadedApp builds one bottom-tab navigator (History/Send/Receive). Its focused
// tab renders; the others emit inert `nav-route-<name>` markers, so the Send-tab
// predicate is assertable by route presence.

const { makeNavigator } = require('./committingNavigator');

const instance = makeNavigator();

export const createBottomTabNavigator = jest.fn(() => instance);
export const __navigation = instance.navigation;
