/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Preview } from '@storybook/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from '@app/theme';

const Canvas: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.bgCanvas }}>
      {children}
    </View>
  );
};

const preview: Preview = {
  decorators: [
    Story => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            <Canvas>
              <Story />
            </Canvas>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    ),
  ],
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
