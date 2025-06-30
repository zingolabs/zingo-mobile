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
import { SeedActionEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

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
  test('Seed View - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={SeedActionEnum.view} setPrivacyOption={jest.fn()} />
      </ContextAppLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Change - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={SeedActionEnum.change} setPrivacyOption={jest.fn()} />
      </ContextAppLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Server - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={SeedActionEnum.server} setPrivacyOption={jest.fn()} />
      </ContextAppLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Backup - snapshot', () => {
    const seed = render(
      <ContextAppLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={SeedActionEnum.backup} setPrivacyOption={jest.fn()} />
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
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={SeedActionEnum.new} setPrivacyOption={jest.fn()} />
      </ContextAppLoadingProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
});
