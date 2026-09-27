/**
 * Offline reaches the Settings screen too (zingo-mobile#1427).
 *
 * The server picker is filled from the live registry (hosh), and that is a
 * plain clearnet request to a third party — outside the mixnet, carrying the
 * user's IP and the fact that they run this wallet. An Offline session must
 * not make it just because the screen opened. The static list is the same
 * fallback an unreachable registry already gets.
 *
 * @format
 */

import 'react-native';
import React from 'react';

import { render, waitFor } from '@testing-library/react-native';
import Settings from '@screens/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { RouteEnum, SelectServerEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const mockedFetchServerList = jest.fn().mockResolvedValue([]);

jest.mock('@app/uris/fetchServerList', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockedFetchServerList(...args),
}));

function renderSettings(selectServer: SelectServerEnum) {
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.Settings, params: undefined },
  };
  return render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: mockTranslate,
        info: mockInfo,
        totalBalance: mockTotalBalance,
        server: mockServer,
        selectServer,
      }}
    >
      <Settings
        {...props}
        setServerOption={jest.fn()}
        setSelectServerOption={jest.fn()}
        setCurrencyOption={jest.fn()}
        setLanguageOption={jest.fn()}
        setSendAllOption={jest.fn()}
        setDonationOption={jest.fn()}
        setPrivacyOption={jest.fn()}
        setModeOption={jest.fn()}
        setSecurityOption={jest.fn()}
        setSelectServerOptionCustom={jest.fn()}
        closeScreen={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('the Settings screen follows the session connectivity', () => {
  it('never asks the live registry while the session is Offline', async () => {
    renderSettings(SelectServerEnum.offline);

    // The effect is synchronous up to its first await, so a flush is enough
    // to catch a request that was going to be made.
    await waitFor(() => expect(mockedFetchServerList).not.toHaveBeenCalled());
  });

  // The control: a connected session still fills the picker from the registry.
  it('asks it for a connected session', async () => {
    renderSettings(SelectServerEnum.auto);

    await waitFor(() => expect(mockedFetchServerList).toHaveBeenCalled());
  });
});
