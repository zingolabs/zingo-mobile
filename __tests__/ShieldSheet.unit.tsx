/**
 * @format
 */

import 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  ABSENT_MIXNET_VIEW,
  MixnetView,
} from '@app/walletBackend/transforms/mixnetView';
import ShieldSheet from '@screens/History/components/ShieldSheet';
import {
  mixnetConnecting,
  mixnetLost,
  mixnetOff,
  mixnetReady,
} from '../.storybook/storyMocks';

jest.mock('@gorhom/bottom-sheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    BottomSheetModal: ReactActual.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: unknown) => (
        <View>{children}</View>
      ),
    ),
    BottomSheetView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
    BottomSheetBackdrop: () => null,
  };
});

/** The raw key, so the assertions read which translation was picked. */
const keyTranslate = (key: string) => key;

function renderSheet(mixnetView: MixnetView, onShield = jest.fn()) {
  return render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: keyTranslate }}
    >
      <ShieldSheet
        amount={0.5}
        fee={0.0001}
        mixnetView={mixnetView}
        onShield={onShield}
      />
    </ContextAppLoadedProvider>,
  );
}

describe('ShieldSheet', () => {
  test.each([
    ['off', mixnetOff],
    ['connecting', mixnetConnecting],
    ['lost', mixnetLost],
  ])(
    'Tests that Shield waits and says why when the mixnet is %s',
    (_name, view) => {
      const onShield = jest.fn();
      const screen = renderSheet(view, onShield);
      expect(screen.getByTestId('shield.confirm')).toBeDisabled();
      fireEvent.press(screen.getByTestId('shield.confirm'));
      expect(onShield).not.toHaveBeenCalled();
      expect(screen.getByTestId('shield.blocked')).toHaveTextContent(
        /send\.nym-blocked/,
      );
    },
  );

  test('Tests that the blocked reason shows the reconnecting status when a lost transport is reconnecting', () => {
    expect(
      renderSheet(mixnetLost).getByTestId('shield.blocked'),
    ).toHaveTextContent(/mixnet\.reconnecting/);
  });

  test.each([
    ['ready', mixnetReady],
    ['absent', ABSENT_MIXNET_VIEW],
  ])(
    'Tests that Shield goes ahead without a reason when the mixnet is %s',
    (_name, view) => {
      const onShield = jest.fn(async () => {});
      const screen = renderSheet(view, onShield);
      expect(screen.queryByTestId('shield.blocked')).toBeNull();
      fireEvent.press(screen.getByTestId('shield.confirm'));
      expect(onShield).toHaveBeenCalledTimes(1);
    },
  );
});
