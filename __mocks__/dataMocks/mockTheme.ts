import { DefaultTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';

export const mockTheme: ThemeType = {
  ...DefaultTheme,
  dark: true,
  colors: {
    background: '#011401', //'#010101',
    card: '#011401', //'#401717',
    border: '#ffffff',
    primary: '#18bd18', //'#df4100',
    primaryDisabled: '#5a8c5a', //'rgba(90, 140, 90, 1)',
    secondaryDisabled: '#233623',
    text: '#c3c3c3',
    zingo: '#888888',
    placeholder: '#888888',
    money: '#ffffff',
    syncing: '#ebff5a',
    notification: '',
    sideMenuBackground: '#040C17',
    bottomSheetBackground: '#031124',
    bottomSheetBorder: '#05234C',
    warning: {
      background: '#262527',
      border: '#65491C',
      primary: '#F99D00',
      primaryDark: '#DD7500',
      title: '#E1AA1B',
      text: '#FEE587',
    },
    danger: {
      primary: '#dc2626',
      background: '#240E0C',
      border: '#572317',
      text: '#FFB972',
    },
    modal: '#1e293b',
  },
};
