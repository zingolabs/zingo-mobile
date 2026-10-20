import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import ImportChooser from '@screens/ImportChooser';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

test('each option calls its own handler and the back arrow leaves, while a busy chooser ignores the options', () => {
  const onPrevious = jest.fn();
  const onSeed = jest.fn();
  const onBack = jest.fn();
  const state = { ...defaultAppContextLoading, translate: mockTranslate };
  render(
    <ContextAppLoadingProvider value={state}>
      <ImportChooser
        busy={false}
        onPrevious={onPrevious}
        onSeed={onSeed}
        onBack={onBack}
      />
    </ContextAppLoadingProvider>,
  );
  fireEvent.press(screen.getByTestId('import.chooser.previous'));
  fireEvent.press(screen.getByTestId('import.chooser.seed'));
  fireEvent.press(screen.getByTestId('import.chooser.back'));
  expect(onPrevious).toHaveBeenCalledTimes(1);
  expect(onSeed).toHaveBeenCalledTimes(1);
  expect(onBack).toHaveBeenCalledTimes(1);

  screen.rerender(
    <ContextAppLoadingProvider value={state}>
      <ImportChooser
        busy={true}
        onPrevious={onPrevious}
        onSeed={onSeed}
        onBack={onBack}
      />
    </ContextAppLoadingProvider>,
  );
  fireEvent.press(screen.getByTestId('import.chooser.seed'));
  expect(onSeed).toHaveBeenCalledTimes(1);
});
