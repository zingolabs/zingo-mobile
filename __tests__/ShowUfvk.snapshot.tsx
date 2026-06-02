/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ShowUfvk } from '../components/Ufvk';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { RouteEnum, UfvkActionEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(
  a: UfvkActionEnum,
): NativeStackScreenProps<AppDrawerParamList, RouteEnum.Ufvk> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Ufvk,
      params: {
        action: a,
      },
    },
  };
}
// test suite
describe('Component ShowUfvk - test', () => {
  //snapshot test
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.birthday = mockWallet.birthday || 0;
  const onClose = jest.fn();
  const onOK = jest.fn();
  const props_view = makeDrawerProps(UfvkActionEnum.view);
  test('ShowUfvk View - snapshot', () => {
    const ufvk = render(
      <ContextAppLoadedProvider value={state}>
        <ShowUfvk {...props_view} onClickCancel={onClose} onClickOK={onOK} />
      </ContextAppLoadedProvider>,
    );
    expect(ufvk.toJSON()).toMatchSnapshot();
  });
  const props_change = makeDrawerProps(UfvkActionEnum.change);
  test('ShowUfvk Change - snapshot', () => {
    const ufvk = render(
      <ContextAppLoadedProvider value={state}>
        <ShowUfvk {...props_change} onClickCancel={onClose} onClickOK={onOK} />
      </ContextAppLoadedProvider>,
    );
    expect(ufvk.toJSON()).toMatchSnapshot();
  });
  const props_server = makeDrawerProps(UfvkActionEnum.server);
  test('ShowUfvk Server - snapshot', () => {
    const ufvk = render(
      <ContextAppLoadedProvider value={state}>
        <ShowUfvk {...props_server} onClickCancel={onClose} onClickOK={onOK} />
      </ContextAppLoadedProvider>,
    );
    expect(ufvk.toJSON()).toMatchSnapshot();
  });
  const props_backup = makeDrawerProps(UfvkActionEnum.backup);
  test('ShowUfvk Backup - snapshot', () => {
    const ufvk = render(
      <ContextAppLoadedProvider value={state}>
        <ShowUfvk {...props_backup} onClickCancel={onClose} onClickOK={onOK} />
      </ContextAppLoadedProvider>,
    );
    expect(ufvk.toJSON()).toMatchSnapshot();
  });
});
