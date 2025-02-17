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
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo/src/index', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(() => Promise.resolve('mocked clipboard content')),
  setString: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useTheme: () => (mockTheme),
}));

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
  contextLoading.info = mockInfo;
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
