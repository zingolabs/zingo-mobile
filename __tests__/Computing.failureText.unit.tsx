import 'react-native';
import React from 'react';

import { fireEvent, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import ComputingTxContent from '@screens/Computing/ComputingTxContent';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { RouteEnum } from '@app/AppState';
import type { TranslateType } from '@app/AppState';
import { errorKeyed } from '@app/AppState/types/Result';
import { AppDrawerParamList } from '@app/types';
import { SendFailureText } from '@app/walletBackend/transforms/sendFailureTransform';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const translate = (key: string): TranslateType => `translated ${key}`;

function makeProps(
  failure: SendFailureText,
): NativeStackScreenProps<AppDrawerParamList, RouteEnum.Computing> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Computing,
      params: { phase: 'failed', failure },
    },
  };
}

// Renders the failed phase and opens its details.
const failedDetails = (failure: SendFailureText) => {
  const state = { ...defaultAppContextLoaded, translate };
  const view = render(
    <ContextAppLoadedProvider value={state}>
      <ComputingTxContent {...makeProps(failure)} />
    </ContextAppLoadedProvider>,
  );
  fireEvent.press(
    view.getByText('translated loadedapp.transactionfailed-details'),
  );
  return view;
};

beforeEach(() => {
  (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
});

describe('Computing failure text', () => {
  test('Tests that the failed phase shows the translation of the key when the failure carries an error key.', () => {
    const view = failedDetails(errorKeyed('send.nym-blocked'));

    expect(view.getByText('translated send.nym-blocked')).toBeTruthy();
  });

  test('Tests that the failed phase shows the text unchanged when the failure carries verbatim text.', () => {
    const view = failedDetails({
      kind: 'verbatim',
      text: 'Error: server unreachable',
    });

    expect(view.getByText('Error: server unreachable')).toBeTruthy();
  });
});
