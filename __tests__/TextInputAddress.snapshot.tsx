/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import TextInputAddress from '@ui/widgets/TextInputAddress';
import { RouteEnum, ScreenEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockServer } from '../__mocks__/dataMocks/mockServer';

describe('TextInputAddress - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.server = mockServer;

  const onFn = jest.fn();

  test('TextInputAddress empty, enabled, with label', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <TextInputAddress
            address=""
            setAddress={onFn}
            setError={onFn}
            disabled={false}
            showLabel
            screenName={ScreenEnum.Send}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('TextInputAddress disabled without label', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <TextInputAddress
            address=""
            setAddress={onFn}
            setError={onFn}
            disabled
            showLabel={false}
            screenName={ScreenEnum.Send}
            routeStack={RouteEnum.ScannerAddress}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
