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
  expect(screen.getByTestId('seed').props.value).toBe('uview1abc');
});

test('backspace in an empty field removes the last chip', () => {
  render(<Host initial="abandon ability" />);
  fireEvent(screen.getByTestId('seed'), 'keyPress', {
    nativeEvent: { key: 'Backspace' },
  });
  expect(screen.queryByText('ability')).toBeNull();
  expect(screen.getByText('1 / 24')).toBeOnTheScreen();
});

const ABANDON_23 = Array(23).fill('abandon').join(' ');

test('Tests that the field reports a broken checksum when the 24th word lands, and clears it when the last word is fixed', () => {
  render(<Host initial={ABANDON_23} />);
  fireEvent.changeText(screen.getByTestId('seed'), 'abandon ');
  expect(screen.getByText('24 / 24')).toBeOnTheScreen();
  expect(screen.getByTestId('seed.error').props.children).toBe(
    'import.seed-checksum',
  );

  fireEvent(screen.getByTestId('seed'), 'keyPress', {
    nativeEvent: { key: 'Backspace' },
  });
  fireEvent.changeText(screen.getByTestId('seed'), 'art ');
  expect(screen.getByText('24 / 24')).toBeOnTheScreen();
  expect(screen.queryByTestId('seed.error')).toBeNull();
});

test('Tests that a 25th word is refused with its message when the phrase already has 24', () => {
  render(<Host initial={ABANDON_23 + ' art'} />);
  fireEvent.changeText(screen.getByTestId('seed'), 'zoo ');
  expect(screen.getByText('24 / 24')).toBeOnTheScreen();
  expect(screen.queryByText('zoo')).toBeNull();
  expect(screen.getByTestId('seed.error').props.children).toBe(
    'import.seed-full',
  );
});

test('Tests that a pasted phrase longer than 24 words keeps the first 24 and says why', () => {
  render(<Host />);
  fireEvent.changeText(screen.getByTestId('seed'), ABANDON_23 + ' art zoo zoo');
  expect(screen.getByText('24 / 24')).toBeOnTheScreen();
  expect(screen.getByTestId('seed.error').props.children).toBe(
    'import.seed-full',
  );
});

test('Tests that 24 words with some outside the list report how many', () => {
  render(<Host initial={Array(22).fill('abandon').join(' ')} />);
  fireEvent.changeText(screen.getByTestId('seed'), 'abandon xyz ');
  expect(screen.getByText('24 / 24')).toBeOnTheScreen();
  expect(screen.getByTestId('seed.error').props.children).toBe(
    'import.seed-words-invalid',
  );
});

test('Tests that a pasted viewing key can be edited in place, and turns back into words when it stops being a key', () => {
  render(<Host />);
  fireEvent.changeText(screen.getByTestId('seed'), 'uview1abc');
  fireEvent.changeText(screen.getByTestId('seed'), 'uview1abcd');
  expect(screen.getByTestId('seed').props.value).toBe('uview1abcd');
  expect(screen.getByText('import.viewing-key')).toBeOnTheScreen();

  fireEvent.changeText(screen.getByTestId('seed'), 'abandon ');
  expect(screen.getByText('1 / 24')).toBeOnTheScreen();
});
