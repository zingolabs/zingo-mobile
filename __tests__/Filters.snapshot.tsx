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

import Filters from '../components/History/components/Filters';
import { FilterEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

describe('Filters - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  const onFn = jest.fn();

  test('Filters with no active filters', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <Filters
            closeSheet={onFn}
            setHeightLayout={onFn}
            filterKind={null}
            setFilterKind={onFn}
            filterFailed={false}
            setFilterFailed={onFn}
            filterMemos={false}
            setFilterMemos={onFn}
            filterWithFunds={false}
            setFilterWithFunds={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('Filters with active sent filter and memos', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <Filters
            closeSheet={onFn}
            setHeightLayout={onFn}
            filterKind={FilterEnum.sent}
            setFilterKind={onFn}
            filterFailed={true}
            setFilterFailed={onFn}
            filterMemos={true}
            setFilterMemos={onFn}
            filterWithFunds={true}
            setFilterWithFunds={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
