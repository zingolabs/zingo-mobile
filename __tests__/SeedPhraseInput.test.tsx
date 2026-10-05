import 'react-native';
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SeedPhraseInput from '@ui/widgets/SeedPhraseInput';

const translate = (key: string) => key;

const Host: React.FunctionComponent<{ initial?: string }> = ({
  initial = '',
}) => {
  const [value, setValue] = useState(initial);
  return (
    <SeedPhraseInput
      value={value}
      onChangeValue={setValue}
      translate={translate}
      testID="seed"
    />
  );
};

test('a typed word followed by a space becomes a chip and the first suggestion completes a prefix', () => {
  render(<Host />);
  fireEvent.changeText(screen.getByTestId('seed'), 'abandon ');
  expect(screen.getByText('abandon')).toBeOnTheScreen();
  expect(screen.getByText('1 / 24')).toBeOnTheScreen();

  fireEvent.changeText(screen.getByTestId('seed'), 'acti');
  expect(screen.getByRole('button', { name: 'action' })).toBeOnTheScreen();
  fireEvent(screen.getByTestId('seed'), 'submitEditing');
  expect(screen.getByText('2 / 24')).toBeOnTheScreen();
  expect(screen.getByTestId('seed').props.value).toBe('');
});

test('confirming text outside the list keeps the text and shows the error line', () => {
  render(<Host />);
  fireEvent.changeText(screen.getByTestId('seed'), 'zzz');
  fireEvent(screen.getByTestId('seed'), 'submitEditing');
  expect(screen.getByText('import.word-invalid')).toBeOnTheScreen();
  expect(screen.getByTestId('seed').props.value).toBe('zzz');
  expect(screen.getByText('0 / 24')).toBeOnTheScreen();
});

test('a pasted phrase becomes one chip per word at once, and a pasted viewing key becomes one block', () => {
  render(<Host />);
  fireEvent.changeText(
    screen.getByTestId('seed'),
    'abandon, ability\nable arte',
  );
  expect(screen.getByText('4 / 24')).toBeOnTheScreen();
  expect(screen.getByText('arte')).toBeOnTheScreen();

  fireEvent.press(screen.getByText('arte'));
  expect(screen.getByText('3 / 24')).toBeOnTheScreen();

  fireEvent.changeText(screen.getByTestId('seed'), 'uview1abc');
  expect(screen.getByText('import.viewing-key')).toBeOnTheScreen();
  expect(screen.getByText('uview1abc')).toBeOnTheScreen();
});

test('backspace in an empty field removes the last chip', () => {
  render(<Host initial="abandon ability" />);
  fireEvent(screen.getByTestId('seed'), 'keyPress', {
    nativeEvent: { key: 'Backspace' },
  });
  expect(screen.queryByText('ability')).toBeNull();
  expect(screen.getByText('1 / 24')).toBeOnTheScreen();
});
