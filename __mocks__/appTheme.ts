// Stands in for app/theme in tests, replacing the `useTheme` export that
// __mocks__/@react-navigation/native.js used to carry. Wired by the
// moduleNameMapper entry in jest.config.js.
import { mockTheme } from './dataMocks/mockTheme';

export const useTheme = () => mockTheme;
export const ThemeProvider = ({ children }: { children: React.ReactNode }) =>
  children;
export const navigationTheme = () => mockTheme;
export const advancedTokens = mockTheme.colors;
export const basicTokens = mockTheme.colors;
