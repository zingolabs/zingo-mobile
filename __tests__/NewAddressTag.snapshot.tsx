/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import NewAddressTag from '@ui/widgets/NewAddressTag';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

describe('NewAddressTag - snapshot', () => {
  test('NewAddressTag renders correctly', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    const onFn = jest.fn();

    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <NewAddressTag
            address="u1abc123def456abc123def456abc123def456abc123"
            own={true}
            closeSheet={onFn}
            setAddressBook={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  // A contact saved from a resolved "pepe.zcash" starts with that name in the
  // label field, so the user confirms rather than retypes it.
  test('the label field starts from initialLabel', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    const onFn = jest.fn();

    render(
      <ContextAppLoadedProvider value={state}>
        <NewAddressTag
          address="u1abc123def456abc123def456abc123def456abc123"
          own={false}
          initialLabel="pepe.zcash"
          closeSheet={onFn}
          setAddressBook={onFn}
        />
      </ContextAppLoadedProvider>,
    );

    expect(screen.getByDisplayValue('pepe.zcash')).toBeTruthy();
  });
});
