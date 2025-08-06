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
import { LanguageEnum, ModeEnum, SelectServerEnum, CurrencyEnum, LaunchingModeEnum } from '../app/AppState';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockLoadedAppNavigation } from '../__mocks__/dataMocks/mockLoadedAppNavigation';
import { mockLoadedAppRoute } from '../__mocks__/dataMocks/mockLoadedAppRoute';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockBackground } from '../__mocks__/dataMocks/mockBackground';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { RPCPerformanceLevelEnum } from '../app/rpc/enums/RPCPerformanceLevelEnum';

// test suite
describe('Component LoadedApp - test', () => {
  //snapshot test
  test('LoadedApp - snapshot', () => {
    const language = LanguageEnum.en;
    const currency = CurrencyEnum.noCurrency;
    const sendAll = false;
    const rescanMenu = false;
    const recoveryWalletInfoOnDevice = true;
    const performanceLevel = RPCPerformanceLevelEnum.Medium;
    const donation = false;
    const privacy = false;
    const mode = ModeEnum.basic;
    const readOnly = false;
    const orchardPool = true;
    const saplingPool = true;
    const transparentPool = true;
    const toggleTheme = jest.fn();
    const selectServer = SelectServerEnum.auto;
    const zenniesDonationAddress = 'xxxxxxxxxxxxxxxxx';
    const firstLaunchingMessage = LaunchingModeEnum.opening;
    const loadedapp = render(
      <LoadedAppClass
        navigationApp={mockLoadedAppNavigation}
        route={mockLoadedAppRoute}
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
        orchardPool={orchardPool}
        saplingPool={saplingPool}
        transparentPool={transparentPool}
        addressBook={mockAddressBook}
        security={mockSecurity}
        selectServer={selectServer}
        rescanMenu={rescanMenu}
        recoveryWalletInfoOnDevice={recoveryWalletInfoOnDevice}
        zenniesDonationAddress={zenniesDonationAddress}
        firstLaunchingMessage={firstLaunchingMessage}
        performanceLevel={performanceLevel}
      />,
    );
    expect(loadedapp.toJSON()).toMatchSnapshot();
  });
});
