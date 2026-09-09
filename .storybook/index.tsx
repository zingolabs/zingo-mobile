import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { view } from './storybook.requires';

// storybook/test wraps `screen` in a warn-on-access Proxy; Fast Refresh
// enumerating that module's exports trips it at registration. No story
// uses `screen`, so the warning is spurious.
LogBox.ignoreLogs(["You are using Testing Library's `screen` object"]);

const StorybookUIRoot = view.getStorybookUI({
  storage: AsyncStorage,
  shouldPersistSelection: true,
});

export default StorybookUIRoot;
