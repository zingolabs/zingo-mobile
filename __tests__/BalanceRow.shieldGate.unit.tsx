/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import BalanceRow from '@ui/widgets/Header/components/BalanceRow';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import {
  mixnetOff,
  mixnetReady,
  mockInfo,
  mockZecPrice,
} from '../.storybook/storyMocks';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

function renderRow(mixnetView: MixnetView) {
  return render(
    <ContextAppLoadedProvider value={defaultAppContextLoaded}>
      <BalanceRow
        noBalance={false}
        noPrivacy={true}
        setPrivacyOption={undefined}
        addLastSnackbar={undefined}
        privacy={false}
        translate={mockTranslate}
        totalBalance={mockTotalBalance}
        info={mockInfo}
        zecPrice={mockZecPrice}
        server={remoteServer(mockInfo.serverUri, ChainNameEnum.mainChainName)}
        showShieldButton={true}
        shieldingFee={0.0001}
        valueTransfersTotal={12}
        calculateAmountToShield={() => '0.5'}
        calculatePoolsToShield={() => 'transparent'}
        calculateDisableButtonToShield={() => false}
        onPressShieldFunds={jest.fn()}
        receivedLegend={false}
        mixnetView={mixnetView}
      />
    </ContextAppLoadedProvider>,
  );
}

describe('BalanceRow shield button', () => {
  test('Tests that the shield button is disabled when the mixnet view blocks sends. The wallet holds a transparent balance.', () => {
    const { getByTestId } = renderRow(mixnetOff);
    expect(getByTestId('header.shield')).toBeDisabled();
  });

  test('Tests that the shield button is enabled when the mixnet view is ready. The wallet holds a transparent balance.', () => {
    const { getByTestId } = renderRow(mixnetReady);
    expect(getByTestId('header.shield')).toBeEnabled();
  });
});
