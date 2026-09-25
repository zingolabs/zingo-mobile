// Exposes the token table under the name the 83 consuming files already use.
// A file that forgets to move its import gets React Navigation's useTheme
// instead, and every token read fails to compile.
import React, { createContext, useContext } from 'react';

import { themeTokens, ThemeColors } from './tokens';

export type AppTheme = {
  colors: ThemeColors;
};

const ThemeContext = createContext<AppTheme>({ colors: themeTokens });

const value: AppTheme = { colors: themeTokens };

export const ThemeProvider: React.FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
);

export const useTheme = () => useContext(ThemeContext);
