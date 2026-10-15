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

import AddTagModalHost from '@app/LoadedApp/components/AddTagModalHost';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

const host = (own: boolean) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: mockTranslate }}
    >
      <AddTagModalHost
        ref={React.createRef()}
        target={{ address: 'u1someone', own, swapChain: 'ZEC' }}
        setAddressBook={() => {}}
        translate={mockTranslate}
      />
    </ContextAppLoadedProvider>,
  );

describe('AddTagModalHost', () => {
  test('Tests that the host opens the own tag sheet when the address is the wallet’s own', () => {
    const screen = host(true);
    expect(screen.getByTestId('addresstag.sheet')).toBeTruthy();
    expect(screen.queryByTestId('addressbook.name-field')).toBeNull();
  });

  test('Tests that the host opens the New contact sheet when the address is someone else’s', () => {
    const screen = host(false);
    expect(screen.getByTestId('addressbook.name-field')).toBeTruthy();
    expect(screen.queryByTestId('addresstag.sheet')).toBeNull();
  });
});
