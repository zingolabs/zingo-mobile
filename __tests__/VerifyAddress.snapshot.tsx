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

import VerifyAddress from '../components/Receive/components/VerifyAddress';
import { ScreenEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockServer } from '../__mocks__/dataMocks/mockServer';

describe('VerifyAddress - snapshot', () => {
  test('VerifyAddress initial (empty, no result)', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    state.server = mockServer;
    const onFn = jest.fn();

    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <VerifyAddress
            closeSheet={onFn}
            screenName={ScreenEnum.Receive}
            navigation={{ navigate: onFn } as never}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
