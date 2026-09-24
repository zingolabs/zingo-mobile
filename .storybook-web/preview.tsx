/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import type { Preview } from '@storybook/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme, advancedTokens } from '@app/theme';

// On web, Storybook's story container sizes to content, so a `flex: 1`
// View collapses and the white iframe body shows through. Paint the page
// and stretch the root so the theme canvas fills the viewport.
const css = `
  html, body, #storybook-root {
    height: 100%;
    margin: 0;
    background: ${advancedTokens.bgCanvas};
  }
`;
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

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
      <SafeAreaProvider>
        <ThemeProvider>
          <Canvas>
            <Story />
          </Canvas>
        </ThemeProvider>
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/ },
    },
  },
};

export default preview;
