import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import SeedBackupNotice from '@screens/History/components/SeedBackupNotice';

const renderNotice = (backedUp: boolean) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <SeedBackupNotice
        backedUp={backedUp}
        covered={false}
        onBackUp={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );

test('Tests that the notice asks for a backup when the seed is not backed up.', () => {
  renderNotice(false);
  expect(screen.getByText('seednotice.pending')).toBeTruthy();
  expect(screen.getByText('seednotice.body-pending')).toBeTruthy();
});

test('Tests that the notice reads backed up when the flow has finished.', () => {
  renderNotice(true);
  expect(screen.getByText('seednotice.done')).toBeTruthy();
  expect(screen.getByText('seednotice.body-done')).toBeTruthy();
});
