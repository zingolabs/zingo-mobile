// Owns the mode, memoizes on it, and exposes the hook under the name the 83
// consuming files already use. A file that forgets to move its import gets
// React Navigation's useTheme instead, and every token read fails to compile.
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { ModeEnum } from '../AppState';
import { advancedTokens, basicTokens, ThemeColors } from './tokens';

export type AppTheme = {
  colors: ThemeColors;
  mode: ModeEnum;
  toggleTheme: (mode: ModeEnum) => void;
};

const ThemeContext = createContext<AppTheme>({
  colors: advancedTokens,
  mode: ModeEnum.advanced,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [mode, setMode] = useState<ModeEnum>(ModeEnum.advanced);
  const toggleTheme = useCallback((next: ModeEnum) => setMode(next), []);

  // advancedTokens and basicTokens are module constants, so `colors` changes
  // identity only when the mode flips.
  const value = useMemo(
    () => ({
      colors: mode === ModeEnum.advanced ? advancedTokens : basicTokens,
      mode,
      toggleTheme,
    }),
    [mode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
