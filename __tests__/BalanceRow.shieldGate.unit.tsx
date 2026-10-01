/**
 * @format
 */

import 'react-native';
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';
import { Provider } from 'jotai';
import { balanceAtom } from '@app/AppState/balance';
import BalanceRow from '@ui/widgets/Header/components/BalanceRow';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import { MixnetView } from '@app/walletBackend/transforms/mixnetView';
import {
  mixnetConnecting,
  mixnetLost,
  mixnetOff,
  mixnetReady,
  mockInfo,
  mockZecPrice,
} from '../.storybook/storyMocks';
import { seed, storeWith } from '../.storybook/storeWith';
import { polledMockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

// Rendering the raw key keeps the assertions on which translation the row
// picked, not on catalog prose.
const keyTranslate = (key: string) => key;

function renderRow(
  mixnetView: MixnetView | null,
  onPressShieldFunds = jest.fn(),
) {
  return render(
    <Provider store={storeWith(seed(balanceAtom, polledMockTotalBalance))}>
      <ContextAppLoadedProvider value={defaultAppContextLoaded}>
        <BalanceRow
          noBalance={false}
          noPrivacy={true}
          setPrivacyOption={undefined}
          addLastSnackbar={undefined}
          privacy={false}
          translate={keyTranslate}
          info={mockInfo}
          zecPrice={mockZecPrice}
          server={remoteServer(mockInfo.serverUri, ChainNameEnum.mainChainName)}
          showShieldButton={true}
          shieldingFee={0.0001}
          valueTransfersTotal={12}
          calculateAmountToShield={() => '0.5'}
          calculatePoolsToShield={() => 'transparent'}
          calculateDisableButtonToShield={() => false}
          onPressShieldFunds={onPressShieldFunds}
          receivedLegend={false}
          mixnetView={mixnetView}
        />
      </ContextAppLoadedProvider>
    </Provider>,
  );
}

describe('BalanceRow shield button', () => {
  test('Tests that the shield button is disabled when the mixnet view blocks sends. The wallet holds a transparent balance.', () => {
    const { getByTestId } = renderRow(mixnetOff);
    expect(getByTestId('header.shield')).toBeDisabled();
  });

  test('Tests that the shield button is disabled when the mixnet view is connecting. The wallet holds a transparent balance.', () => {
    const { getByTestId } = renderRow(mixnetConnecting);
    expect(getByTestId('header.shield')).toBeDisabled();
  });

  test('Tests that the shield button is disabled when the mixnet transport is lost. The wallet holds a transparent balance.', () => {
    const { getByTestId } = renderRow(mixnetLost);
    expect(getByTestId('header.shield')).toBeDisabled();
  });

  test('Tests that the shield button is enabled when the mixnet view is ready. The wallet holds a transparent balance.', () => {
    const { getByTestId } = renderRow(mixnetReady);
    expect(getByTestId('header.shield')).toBeEnabled();
  });

  test('Tests that the shield button is enabled when the platform has no mixnet view. The wallet holds a transparent balance.', () => {
    const { getByTestId } = renderRow(null);
    expect(getByTestId('header.shield')).toBeEnabled();
  });

  test('Tests that a press does not reach the shield handler when the mixnet view blocks sends.', () => {
    const onPressShieldFunds = jest.fn();
    const { getByTestId } = renderRow(mixnetOff, onPressShieldFunds);
    fireEvent.press(getByTestId('header.shield'));
    expect(onPressShieldFunds).not.toHaveBeenCalled();
  });

  test('Tests that a press reaches the shield handler when the mixnet view is ready.', () => {
    const onPressShieldFunds = jest.fn();
    const { getByTestId } = renderRow(mixnetReady, onPressShieldFunds);
    fireEvent.press(getByTestId('header.shield'));
    expect(onPressShieldFunds).toHaveBeenCalledTimes(1);
  });

  test('Tests that the blocked reason replaces the shield legend when the mixnet view blocks sends. The mixnet is off.', () => {
    const { getByTestId, queryByText } = renderRow(mixnetOff);
    const reason = getByTestId('header.shield-blocked');
    expect(reason).toHaveTextContent(/send\.nym-blocked/);
    expect(reason).toHaveTextContent(new RegExp(mixnetOff.statusKey));
    expect(queryByText(/history\.shield-legend/)).toBeNull();
  });

  test('Tests that the blocked reason shows the reconnecting status when a lost transport is reconnecting.', () => {
    const { getByTestId } = renderRow(mixnetLost);
    expect(getByTestId('header.shield-blocked')).toHaveTextContent(
      /mixnet\.reconnecting/,
    );
  });

  test('Tests that the shield legend shows, without a blocked reason, when the mixnet view is ready.', () => {
    const { queryByTestId, getByText } = renderRow(mixnetReady);
    expect(queryByTestId('header.shield-blocked')).toBeNull();
    expect(getByText(/history\.shield-legend/)).toBeTruthy();
  });
});
