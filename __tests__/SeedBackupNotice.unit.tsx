import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import SeedBackupNotice from '@screens/History/components/SeedBackupNotice';

const renderNotice = () =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <SeedBackupNotice covered={false} onBackUp={jest.fn()} />
    </ContextAppLoadedProvider>,
  );

test('Tests that the notice asks for a backup when the seed is not backed up.', () => {
  renderNotice();
  expect(screen.getByText('seednotice.pending')).toBeTruthy();
  expect(screen.getByText('seednotice.body-pending')).toBeTruthy();
});
