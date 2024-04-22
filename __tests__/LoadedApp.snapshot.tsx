/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadedAppClass } from '../app/LoadedApp';
import { ThemeType } from '../app/types';

// Importa el módulo I18n
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { I18n } from 'i18n-js';
import { StackScreenProps } from '@react-navigation/stack';
import { BackgroundType, AddressBookFileClass, ServerType, LanguageEnum } from '../app/AppState';
import { CurrencyEnum } from '../app/AppState/enums/CurrencyEnum';

// Crea un mock para el constructor de I18n
jest.mock('i18n-js', () => ({
  __esModule: true,
  I18n: jest.fn().mockImplementation(() => ({
    t: jest.fn(),
    // Agrega otros métodos y propiedades según sea necesario para tus pruebas
  })),
}));

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native-tab-view', () => ({
  TabView: '',
  TabBar: '',
}));
jest.mock('react-native-option-menu', () => '');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo', () => {
  return {
    addEventListener: jest.fn(),
    fetch: jest.fn().mockImplementation(() =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
      }),
    ),
  };
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});

// test suite
describe('Component LoadedApp - test', () => {
  //snapshot test
  test('LoadedApp - snapshot', () => {
    const navigationMock: StackScreenProps<any>['navigation'] = {
      // Propiedades y métodos necesarios para la navegación
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
      reset: jest.fn(),
      isFocused: jest.fn(),
      canGoBack: jest.fn(),
      getParent: jest.fn(),
      getId: jest.fn(),
      getState: jest.fn(),
      setParams: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
      pop: jest.fn(),
      popToTop: jest.fn(),
      // Agrega cualquier otra propiedad o método necesario para tu caso
    };
    // Declara un objeto mock para la ruta
    const routeMock: StackScreenProps<any>['route'] = {
      // Propiedades necesarias para la ruta
      key: '',
      name: '',
    };
    const theme: ThemeType = {
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
      },
    };
    const translate = () => 'text traslated';
    const language = LanguageEnum.en;
    const currency = CurrencyEnum.noCurrency;
    const server: ServerType = {
      uri: 'https://mainnet.lightwalletd.com:9067',
      chain_name: 'main',
    };
    const sendAll = false;
    const donation = false;
    const privacy = false;
    const mode = 'basic';
    const background: BackgroundType = {
      batches: 0,
      message: '',
      date: 0,
      dateEnd: 0,
    };
    const readOnly = false;
    const toggleTheme = jest.fn();
    const addressBook = [] as AddressBookFileClass[];
    const security = {
      startApp: true,
      foregroundApp: true,
      sendConfirm: true,
      seedScreen: true,
      ufvkScreen: true,
      rescanScreen: true,
      settingsScreen: true,
      changeWalletScreen: true,
      restoreWalletBackupScreen: true,
    };
    const selectServer = 'auto';
    const receive = render(
      <LoadedAppClass
        navigation={navigationMock}
        route={routeMock}
        translate={translate}
        theme={theme}
        language={language}
        currency={currency}
        server={server}
        sendAll={sendAll}
        donation={donation}
        privacy={privacy}
        mode={mode}
        background={background}
        readOnly={readOnly}
        toggleTheme={toggleTheme}
        addressBook={addressBook}
        security={security}
        selectServer={selectServer}
      />,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
