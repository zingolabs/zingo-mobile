import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { TranslateType } from '@app/AppState';
import NameWallet from '@screens/NameWallet';

const en = require('../app/translations/en.json');
const translate = (key: string): TranslateType =>
  key.split('.').reduce((o, k) => o?.[k], en) ?? key;

const mount = (from: 'create' | 'seed' | 'key', onGo = jest.fn()) => {
  render(
    <NameWallet
      from={from}
      translate={translate}
      placeholder="Wallet 1"
      busy={false}
      onBack={jest.fn()}
      onGo={onGo}
    />,
  );
  return onGo;
};

test('Tests that an empty name goes on as the placeholder when the wallet is created', () => {
  const onGo = mount('create');

  expect(screen.getByText(en.onboarding['create-go'])).toBeTruthy();
  fireEvent.press(screen.getByTestId('namewallet.go'));

  expect(onGo).toHaveBeenCalledWith('Wallet 1');
});

test('Tests that a typed name goes on trimmed when a viewing key is imported', () => {
  const onGo = mount('key');

  expect(screen.getByText(en.onboarding['name-key'])).toBeTruthy();
  expect(screen.getByText(en.onboarding['import-go'])).toBeTruthy();
  fireEvent.changeText(screen.getByTestId('addwallet.name'), '  Cold watch ');
  fireEvent.press(screen.getByTestId('namewallet.go'));

  expect(onGo).toHaveBeenCalledWith('Cold watch');
});
