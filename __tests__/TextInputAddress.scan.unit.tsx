/**
 * @format
 */

import 'react-native';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import TextInputAddress from '@ui/widgets/TextInputAddress';
import { openScanner } from '@app/navigation/navigate';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockServer } from '../__mocks__/dataMocks/mockServer';

jest.mock('@app/navigation/navigate', () => ({ openScanner: jest.fn() }));

describe('TextInputAddress - scan', () => {
  test('Tests that the scan button opens the scanner with its words when pressed', () => {
    const screen = render(
      <ContextAppLoadedProvider
        value={{
          ...defaultAppContextLoaded,
          translate: mockTranslate,
          server: mockServer,
        }}
      >
        <TextInputAddress
          address=""
          setAddress={() => {}}
          setError={() => {}}
          disabled={false}
          showLabel
          scanRequest="receive.address"
        />
      </ContextAppLoadedProvider>,
    );
    fireEvent.press(screen.getByTestId('send.scan-button'));
    expect(openScanner).toHaveBeenCalledWith(
      expect.objectContaining({
        request: 'receive.address',
        accepts: { kind: 'zcash', chain: mockServer.chainName },
        texts: expect.objectContaining({ back: expect.any(String) }),
      }),
    );
  });
});
