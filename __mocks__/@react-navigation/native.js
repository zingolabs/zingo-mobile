import { mockTheme } from '../dataMocks/mockTheme';

export const useTheme = () => (mockTheme);
export const useScrollToTop = jest.fn();
export const useIsFocused = jest.fn();

export const NavigationContainer = ({ children }) => children;
