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

import { ChainNameEnum } from '../app/AppState';
import AlSummaryLine from '../components/AddressList/components/AlSummaryLine';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';

describe('AlSummaryLine - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.addressBook = mockAddressBook;

  const onFn = jest.fn();

  test('AlSummaryLine unified address', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <AlSummaryLine
            index={0}
            setIndex={onFn}
            item={mockAddresses[0]}
            closeScreen={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('AlSummaryLine transparent address', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <AlSummaryLine
            index={1}
            setIndex={onFn}
            item={mockAddresses[3]}
            closeScreen={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('AlSummaryLine address with contact label', () => {
    const stateWithContact = { ...state };
    stateWithContact.addressBook = [
      {
        label: 'pepe',
        address: mockAddresses[0].address,
        color: '#000',
        own: false,
        chain: ChainNameEnum.mainChainName,
        swapChain: 'ZEC',
      },
    ];
    expect(
      render(
        <ContextAppLoadedProvider value={stateWithContact}>
          <AlSummaryLine
            index={0}
            setIndex={onFn}
            item={mockAddresses[0]}
            closeScreen={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
