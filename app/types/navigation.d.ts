import '@react-navigation/native';
import { ThemeType } from './ThemeType';

declare module '@react-navigation/native' {
  export function useTheme(): ThemeType;
}
