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

import ScannerAddress from '../components/Send/components/ScannerAddress';
import { RouteEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeProps(
  active: boolean,
): DrawerScreenProps<AppDrawerParamList, RouteEnum.ScannerAddress> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.ScannerAddress,
      params: {
        setAddress: jest.fn(),
        active,
      },
    },
  };
}

describe('ScannerAddress - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;

  test('ScannerAddress inactive', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ScannerAddress {...makeProps(false)} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('ScannerAddress active', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ScannerAddress {...makeProps(true)} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
