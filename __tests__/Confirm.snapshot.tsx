/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';

import Confirm from '../components/Send/components/Confirm';
import { CurrencyEnum, ModeEnum, RouteEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';
import mockSendPageState from '../__mocks__/dataMocks/mockSendPageState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import { RPCParseAddressStatusEnum } from '../app/walletBackend/types/rpcAddressTypes';
import { RPCAddressKindEnum } from '../app/walletBackend/types/rpcAddressTypes';
import { RPCReceiversEnum } from '../app/walletBackend/types/rpcAddressTypes';
import { ChainNameEnum } from '../app/AppState';

function makeProps(): DrawerScreenProps<AppDrawerParamList, RouteEnum.Confirm> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Confirm,
      params: {
        calculatedFee: 0.00001,
        parseAddressInfoJSON: {
          status: RPCParseAddressStatusEnum.successAddressParse,
          chain_name: ChainNameEnum.mainChainName,
          address_kind: RPCAddressKindEnum.unifiedAddressKind,
          receivers_available: [
            RPCReceiversEnum.orchardRPCReceiver,
            RPCReceiversEnum.saplingRPCReceiver,
          ],
        },
        donationAmount: 0,
        confirmSend: jest.fn(async () => {}),
        sendAllAmount: false,
        calculateFeeWithPropose: jest.fn(async () => {}),
        sendPageState: mockSendPageState,
        nym: false,
      },
    },
  };
}

describe('Confirm - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.zecPrice = mockZecPrice;
  state.server = mockServer;
  state.security = mockSecurity;
  state.currency = CurrencyEnum.noCurrency;
  state.mode = ModeEnum.advanced;
  state.defaultUnifiedAddress = 'u1abc123def456abc123def456abc123def456abc123';

  test('Confirm no currency, privacy off', () => {
    state.privacy = false;
    state.currency = CurrencyEnum.noCurrency;
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <Confirm {...makeProps()} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('Confirm USD currency, privacy on', () => {
    state.privacy = true;
    state.currency = CurrencyEnum.USDCurrency;
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <Confirm {...makeProps()} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
