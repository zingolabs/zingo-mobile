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
import { RouteEnum, ScreenEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockServer } from '../__mocks__/dataMocks/mockServer';

describe('TextInputAddress - scan', () => {
  test('Tests that the scan button opens the scanner with its words when pressed', () => {
    const navigate = jest.fn();
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
          screenName={ScreenEnum.Receive}
          navigation={{ navigate } as never}
        />
      </ContextAppLoadedProvider>,
    );
    fireEvent.press(screen.getByTestId('send.scan-button'));
    expect(navigate).toHaveBeenCalledWith(
      RouteEnum.ScannerAddress,
      expect.objectContaining({
        accepts: expect.any(Function),
        texts: expect.objectContaining({ back: expect.any(String) }),
      }),
    );
  });
});
