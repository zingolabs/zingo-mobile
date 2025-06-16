/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { LoadingAppClass } from '../app/LoadingApp';

// Importa el módulo I18n
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { I18n } from 'i18n-js';
import { LanguageEnum, ModeEnum, SelectServerEnum, CurrencyEnum } from '../app/AppState';
import { mockLoadingAppNavigation } from '../__mocks__/dataMocks/mockLoadingAppNavigation';
import { mockLoadingAppRoute } from '../__mocks__/dataMocks/mockLoadingAppRoute';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockBackground } from '../__mocks__/dataMocks/mockBackground';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';

// test suite
describe('Component LoadingApp - test', () => {
  //snapshot test
  test('LoadingApp - snapshot', () => {
    const language = LanguageEnum.en;
    const currency = CurrencyEnum.noCurrency;
    const sendAll = false;
    const rescanMenu = false;
    const recoveryWalletInfoOnDevice = true;
    const donation = false;
    const privacy = false;
    const mode = ModeEnum.basic;
    const firstLaunchingMessage = false;
    const toggleTheme = jest.fn();
    const selectServer = SelectServerEnum.auto;
    const donationAlert = false;
    const loadingapp = render(
      <LoadingAppClass
        navigationApp={mockLoadingAppNavigation}
        route={mockLoadingAppRoute}
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
        firstLaunchingMessage={firstLaunchingMessage}
        security={mockSecurity}
        selectServer={selectServer}
        donationAlert={donationAlert}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
      />,
    );
    expect(loadingapp.toJSON()).toMatchSnapshot();
  });
});
