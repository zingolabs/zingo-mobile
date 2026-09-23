// Exposes the palette under the name the 83 consuming files already use. A
// file that forgets to move its import gets React Navigation's useTheme
// instead, and every token read fails to compile.
//
// There is one palette now, so the provider holds no state: it is here to keep
// every consumer reading its colors from the same place, and to stay the seam
// where a second theme would arrive.
import React, { createContext, useContext } from 'react';

import { themeTokens, ThemeColors } from './tokens';

export type AppTheme = {
  colors: ThemeColors;
};

const ThemeContext = createContext<AppTheme>({ colors: themeTokens });

const value: AppTheme = { colors: themeTokens };

export const ThemeProvider: React.FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
