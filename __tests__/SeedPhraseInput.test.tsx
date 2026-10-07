import 'react-native';
import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

// The value the field last handed up.
let handedUp = '';

const ValueHost: React.FunctionComponent = () => {
  const [value, setValue] = useState('');
  return (
    <SeedPhraseInput
      value={value}
      onChangeValue={next => {
        handedUp = next;
        setValue(next);
      }}
      translate={translate}
      testID="seed"
    />
  );
};

// Several keys reaching the same handler before the field renders, each with
// the native text as it then stands. fireEvent renders after every call,
// which is why the tests above never met this.
const typeWithoutRendering = (texts: string[]) => {
  const input = screen.getByTestId('seed');
  act(() => {
    texts.forEach(text => input.props.onChangeText(text));
  });
};

// A keyboard faster than the field renders: the native text grows one key at
// a time, and the field renders every `keysPerRender` keys. Whether the native
// text then takes the rendered value back is up to the platform: a TextInput
// keeps its own text while newer keys are pending, so on a device it may not.
// `takeBackEvery` takes it back every that many renders, never when 0.
const typeFast = (
  text: string,
  keysPerRender: number,
  takeBackEvery: number,
) => {
  let native: string = screen.getByTestId('seed').props.value;
  for (let i = 0, burst = 1; i < text.length; i += keysPerRender, burst++) {
    const typed: string[] = [];
    for (const key of text.slice(i, i + keysPerRender)) {
      native += key;
      typed.push(native);
    }
    typeWithoutRendering(typed);
    if (takeBackEvery > 0 && burst % takeBackEvery === 0) {
      native = screen.getByTestId('seed').props.value;
    }
  }
};

const keystrokes = (text: string) =>
  Array.from({ length: text.length }, (_, i) => text.slice(0, i + 1));

const PHRASE =
  'lottery multiply patient simple ivory leisure swift square west despair beauty match crowd margin reject box always title photo remind word diet ecology badge';

test('Tests that a key landing before the cleared field renders does not read the accepted word twice', () => {
  handedUp = '';
  render(<ValueHost />);
  typeWithoutRendering(['west ', 'west d']);
  expect(handedUp).toBe('west');
  expect(screen.getByTestId('seed').props.value).toBe('d');
});

test.each([
  [2, 1],
  [3, 1],
  [5, 1],
  [2, 0],
  [3, 0],
  [3, 2],
  [5, 3],
])(
  'Tests that a whole phrase typed %i keys per render, the field taking its text back every %i renders, comes out word for word',
  (keysPerRender, takeBackEvery) => {
    handedUp = '';
    render(<ValueHost />);
    typeFast(PHRASE + ' ', keysPerRender, takeBackEvery);
    expect(handedUp).toBe(PHRASE);
    expect(screen.getByText('24 / 24')).toBeOnTheScreen();
  },
);

test('Tests that a key landing right after a suggestion is taken starts the next word', () => {
  handedUp = '';
  render(<ValueHost />);
  fireEvent.changeText(screen.getByTestId('seed'), 'acti');
  const input = screen.getByTestId('seed');
  act(() => {
    fireEvent.press(screen.getByRole('button', { name: 'action' }));
    input.props.onChangeText('actia');
  });
  expect(handedUp).toBe('action');
  expect(screen.getByTestId('seed').props.value).toBe('a');
});

test('Tests that the same word typed twice in a row is kept twice', () => {
  render(<Host />);
  fireEvent.changeText(screen.getByTestId('seed'), 'abandon ');
  keystrokes('abandon ').forEach(text =>
    fireEvent.changeText(screen.getByTestId('seed'), text),
  );
  expect(screen.getByText('2 / 24')).toBeOnTheScreen();
});

test('Tests that deleting the start of the next word does not bring back the last one', () => {
  handedUp = '';
  render(<ValueHost />);
  typeWithoutRendering(['west ', 'west d', 'west ']);
  expect(handedUp).toBe('west');
  expect(screen.getByTestId('seed').props.value).toBe('');
});
