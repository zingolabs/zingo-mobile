/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Seed from '../components/Seed';
import {
  ContextAppLoadedProvider,
  ContextAppLoadingProvider,
  defaultAppContextLoaded,
  defaultAppContextLoading,
} from '../app/context';
import { RouteEnum, SeedActionEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import NewSeed from '../app/LoadingApp/components/NewSeed';

function makeDrawerProps(
  a: SeedActionEnum,
): DrawerScreenProps<AppDrawerParamList, RouteEnum.Seed> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Seed,
      params: {
        action: a,
      },
    },
  };
}
// test suite
describe('Component Seed - test', () => {
  //snapshot test
  const stateLoaded = defaultAppContextLoaded;
  stateLoaded.translate = mockTranslate;
  stateLoaded.wallet = mockWallet;
  stateLoaded.info = mockInfo;
  stateLoaded.totalBalance = mockTotalBalance;
  const onOk = jest.fn();
  const onCancel = jest.fn();
  let props = makeDrawerProps(SeedActionEnum.view);
  test('Seed View - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed {...props} onClickOK={onOk} onClickCancel={onCancel} />
      </ContextAppLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  props = makeDrawerProps(SeedActionEnum.change);
  test('Seed Change - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed {...props} onClickOK={onOk} onClickCancel={onCancel} />
      </ContextAppLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  props = makeDrawerProps(SeedActionEnum.server);
  test('Seed Server - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed {...props} onClickOK={onOk} onClickCancel={onCancel} />
      </ContextAppLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  props = makeDrawerProps(SeedActionEnum.backup);
  test('Seed Backup - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed {...props} onClickOK={onOk} onClickCancel={onCancel} />
      </ContextAppLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  const contextLoading = defaultAppContextLoading;
  contextLoading.translate = mockTranslate;
  contextLoading.wallet = mockWallet;
  //contextLoading.totalBalance = mockTotalBalance;
  test('Seed New - snapshot', () => {
    const seed = render(
      <ContextAppLoadingProvider value={contextLoading}>
        <NewSeed onClickOK={onOk} />
      </ContextAppLoadingProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
});
