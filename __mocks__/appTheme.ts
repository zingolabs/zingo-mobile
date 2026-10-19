// Stands in for app/theme in tests, replacing the `useTheme` export that
// __mocks__/@react-navigation/native.js used to carry. Wired by the
// moduleNameMapper entry in jest.config.js.
import { mockTheme } from './dataMocks/mockTheme';

export const useTheme = () => mockTheme;
export const ThemeProvider = ({ children }: { children: React.ReactNode }) =>
  children;
export const navigationTheme = () => mockTheme;
export const themeTokens = mockTheme.colors;

// Not themed, so re-export the real tokens instead of stand-ins: the mock
// shadows the whole `app/theme` barrel, and a missing export here would
// silently render every sheet radius as `undefined`.
export * from '@app/theme/radii';
export * from '@app/theme/spacing';
export * from '@app/theme/sizes';
