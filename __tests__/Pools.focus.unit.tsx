/**
 * @format
 */

import 'react-native';
import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';
import Pools from '@screens/Pools';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { Route } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const renderPools = () =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: mockTranslate,
        info: mockInfo,
        totalBalance: mockTotalBalance,
      }}
    >
      <Pools
        navigation={mockNavigation}
        route={{ key: 'Key-1', name: Route.Pools, params: undefined }}
      />
    </ContextAppLoadedProvider>,
  );

const picked = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState?.selected;

describe('Pools focus', () => {
  test('Tests that a pool card is picked when it is pressed, and let go when pressed again', () => {
    renderPools();
    fireEvent.press(screen.getByTestId('pools.ironwood'));
    expect(picked('pools.ironwood')).toBe(true);
    fireEvent.press(screen.getByTestId('pools.ironwood'));
    expect(picked('pools.ironwood')).toBe(false);
  });

  test('Tests that a pool card is picked when its segment of the bar is pressed', () => {
    renderPools();
    fireEvent(screen.getByTestId('pools.bar'), 'layout', {
      nativeEvent: { layout: { width: 300, height: 14 } },
    });
    fireEvent.press(screen.getByTestId('pools.bar.ironwood'));
    expect(picked('pools.ironwood')).toBe(true);
  });
});
