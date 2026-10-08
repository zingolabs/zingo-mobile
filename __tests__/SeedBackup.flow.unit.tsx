import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { RouteEnum } from '@app/AppState';

import SeedBackup from '@screens/SeedBackup';
import { pickPositions } from '@screens/SeedBackup/components/ConfirmStep';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const WORDS = Array.from({ length: 24 }, (_, i) =>
  'abcdefghijklmnopqrstuvwx'[i].repeat(3 + (i % 6)),
);

jest.mock('@app/services/recoveryWalletInfo', () => ({
  getRecoveryWalletInfo: jest.fn(async () => ({
    seed: Array.from({ length: 24 }, (_, i) =>
      'abcdefghijklmnopqrstuvwx'[i].repeat(3 + (i % 6)),
    ).join(' '),
    birthday: 1,
  })),
  hasRecoveryWalletInfo: jest.fn(async () => true),
}));

const renderFlow = (setSeedBackedUp = jest.fn(async () => {})) =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (k: string) => (k === 'seedbackup.word-n' ? '#{n}' : k),
        biometrics: false,
        setSeedBackedUp,
      }}
    >
      <SeedBackup
        navigation={mockNavigation}
        route={{
          key: 'k',
          name: RouteEnum.SeedBackup,
          params: { from: { x: 20, y: 200, width: 360, height: 80 } },
        }}
      />
    </ContextAppLoadedProvider>,
  );

const typeShown = (word: (n: number) => string) => {
  const label = screen.getByTestId('seedbackup.word').props
    .accessibilityLabel as string;
  const n = Number(label.replace(/\D/g, ''));
  fireEvent.changeText(screen.getByTestId('seedbackup.word'), word(n));
  fireEvent.press(screen.getByTestId('seedbackup.confirm.primary'));
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('Tests that pickPositions returns distinct ascending positions inside the phrase when asked for three of 24.', () => {
  const rolls = [0.5, 0.5, 0.01, 0.99];
  const picked = pickPositions(24, 3, () => rolls.shift() ?? 0);
  expect(picked).toEqual([1, 13, 24]);
});

test('Tests that the flow marks the seed as backed up when the three asked words are typed back.', async () => {
  const setSeedBackedUp = jest.fn(async () => {});
  renderFlow(setSeedBackedUp);
  await act(async () => {
    fireEvent.press(screen.getByTestId('seedbackup.info.primary'));
  });
  expect(screen.getByText(WORDS[0])).toBeTruthy();
  fireEvent.press(screen.getByTestId('seedbackup.check'));
  fireEvent.press(screen.getByTestId('seedbackup.words.primary'));
  for (let i = 0; i < 3; i++) {
    typeShown(n => WORDS[n - 1]);
    act(() => {
      jest.advanceTimersByTime(700);
    });
  }
  expect(setSeedBackedUp).toHaveBeenCalledWith(true);
  expect(screen.getByText('seedbackup.done-title')).toBeTruthy();
});

test('Tests that a wrong word shows the error line and leaves the seed unconfirmed.', async () => {
  const setSeedBackedUp = jest.fn(async () => {});
  renderFlow(setSeedBackedUp);
  await act(async () => {
    fireEvent.press(screen.getByTestId('seedbackup.info.primary'));
  });
  fireEvent.press(screen.getByTestId('seedbackup.check'));
  fireEvent.press(screen.getByTestId('seedbackup.words.primary'));
  typeShown(() => 'zcash');
  expect(screen.getByText('seedbackup.word-wrong')).toBeTruthy();
  act(() => {
    jest.advanceTimersByTime(2000);
  });
  expect(setSeedBackedUp).not.toHaveBeenCalled();
});

test('Tests that I saved it stays on the words when the paper box is unchecked.', async () => {
  renderFlow();
  await act(async () => {
    fireEvent.press(screen.getByTestId('seedbackup.info.primary'));
  });
  fireEvent.press(screen.getByTestId('seedbackup.words.primary'));
  expect(screen.queryByTestId('seedbackup.word')).toBeNull();
  expect(screen.getByText(WORDS[0])).toBeTruthy();
});

test('Tests that the screenshot warning covers the words when a screenshot is taken on iOS.', async () => {
  const { DeviceEventEmitter, NativeModules } =
    jest.requireActual('react-native');
  NativeModules.PrivacyGuard = {
    isCaptured: jest.fn(async () => false),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  renderFlow();
  await act(async () => {
    fireEvent.press(screen.getByTestId('seedbackup.info.primary'));
  });
  await act(async () => {});
  act(() => {
    DeviceEventEmitter.emit('screenshot');
  });
  expect(screen.getByText('seedbackup.shot-title')).toBeTruthy();
  delete NativeModules.PrivacyGuard;
});

test('Tests that the placeholder shows one dash per letter of the asked word.', async () => {
  renderFlow();
  await act(async () => {
    fireEvent.press(screen.getByTestId('seedbackup.info.primary'));
  });
  fireEvent.press(screen.getByTestId('seedbackup.check'));
  fireEvent.press(screen.getByTestId('seedbackup.words.primary'));
  const label = screen.getByTestId('seedbackup.word').props
    .accessibilityLabel as string;
  const n = Number(label.replace(/\D/g, ''));
  expect(screen.getAllByTestId('seedbackup.dash')).toHaveLength(
    WORDS[n - 1].length,
  );
});
