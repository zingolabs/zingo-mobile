/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Seed from '../components/Seed';
import {
  defaultAppStateLoaded,
  ContextLoadedProvider,
  defaultAppStateLoading,
  ContextLoadingProvider,
} from '../app/context';

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

// test suite
describe('Component Seed - test', () => {
  //snapshot test
  const stateLoaded = defaultAppStateLoaded;
  stateLoaded.translate = (p: string) => {
    if (p === 'seed.buttontexts') {
      return {
        new: [''],
        change: [''],
        server: [''],
        view: [''],
        restore: [''],
        backup: [''],
      };
    } else {
      return 'text translated';
    }
  };
  stateLoaded.walletSeed = {
    seed: 'pepe lolo titi',
    birthday: 1500100,
  };
  stateLoaded.info.currencyName = 'ZEC';
  stateLoaded.totalBalance.total = 1.12345678;
  const onOk = jest.fn();
  const onCancel = jest.fn();
  test('Seed View - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'view'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Change - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'change'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Server - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'server'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Backup - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'backup'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  const stateLoading = defaultAppStateLoading;
  stateLoading.translate = (p: string) => {
    if (p === 'seed.buttontexts') {
      return {
        new: [''],
        change: [''],
        server: [''],
        view: [''],
        restore: [''],
        backup: [''],
      };
    } else {
      return 'text translated';
    }
  };
  stateLoading.walletSeed = {
    seed: 'pepe lolo titi',
    birthday: 1500100,
  };
  stateLoading.totalBalance.total = 1.12345678;
  test('Seed New - snapshot', () => {
    const seed = render(
      <ContextLoadingProvider value={stateLoading}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'new'} />
      </ContextLoadingProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Restore - snapshot', () => {
    const seed = render(
      <ContextLoadingProvider value={stateLoading}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'restore'} />
      </ContextLoadingProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
});
