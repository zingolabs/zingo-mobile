/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ImportUfvk } from '../components/Ufvk';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

// test suite
describe('Component ImportUfvk - test', () => {
  //snapshot test
  test('ImportUfvk - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onCancel = jest.fn();
    const onOK = jest.fn();
    const importUfvk = render(
      <ContextAppLoadedProvider value={state}>
        <ImportUfvk onClickCancel={onCancel} onClickOK={onOK} />
      </ContextAppLoadedProvider>,
    );
    expect(importUfvk.toJSON()).toMatchSnapshot();
  });
});
