/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadedAppClass } from '../app/LoadedApp';

// Importa el módulo I18n
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { I18n } from 'i18n-js';
import { LanguageEnum, ModeEnum, SelectServerEnum, CurrencyEnum } from '../app/AppState';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockNavigation } from '../__mocks__/dataMocks/mockNavigation';
import { mockRoute } from '../__mocks__/dataMocks/mockRoute';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockBackground } from '../__mocks__/dataMocks/mockBackground';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
    getLatestBlock: jest.fn(() => '{}'),
    walletExists: jest.fn(() => 'false'),
    getValueTransfersList: jest.fn(() => '{ "value_transfers": [], "total": 0 }'),
    setCryptoDefaultProvider: jest.fn(() => 'true'),
    createNewWallet: jest.fn(() => '{ "seed": "seed phrase test", "birthday": 0 }'),
    doSave: jest.fn(),
  };

  return RN;
});

// test suite
describe('Component LoadedApp - test', () => {
  //snapshot test
  test('LoadedApp - snapshot', () => {
    const language = LanguageEnum.en;
    const currency = CurrencyEnum.noCurrency;
    const sendAll = false;
    const rescanMenu = false;
    const recoveryWalletInfoOnDevice = true;
    const donation = false;
    const privacy = false;
    const mode = ModeEnum.basic;
    const readOnly = false;
    const toggleTheme = jest.fn();
    const selectServer = SelectServerEnum.auto;
    const zenniesDonationAddress = 'xxxxxxxxxxxxxxxxx';
    const loadedapp = render(
      <LoadedAppClass
        navigation={mockNavigation}
        route={mockRoute}
        toggleTheme={toggleTheme}
        translate={mockTranslate}
        theme={mockTheme}
        language={language}
        currency={currency}
        server={mockServer}
        sendAll={sendAll}
        donation={donation}
        privacy={privacy}
        mode={mode}
        background={mockBackground}
        readOnly={readOnly}
        addressBook={mockAddressBook}
        security={mockSecurity}
        selectServer={selectServer}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        zenniesDonationAddress={zenniesDonationAddress}
      />,
    );
    expect(loadedapp.toJSON()).toMatchSnapshot();
  });
});
