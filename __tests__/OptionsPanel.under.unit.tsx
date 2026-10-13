import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  OptionsPanelProvider,
  useOptionsPanel,
} from '@app/context/optionsPanel';
import { OptionsPanelHost } from '@screens/OptionsPanel';

// The shared react-native shim leaves named imports empty in __tests__.
const { Pressable, Text } =
  jest.requireActual<typeof import('react-native')>('react-native');

// Drives the panel the way the header and the grid do.
const Probe = () => {
  const { kind, open, sink, close } = useOptionsPanel();
  return (
    <>
      <Text testID="probe.kind">{kind}</Text>
      <Pressable testID="probe.open" onPress={open} />
      <Pressable testID="probe.sink" onPress={sink} />
      <Pressable testID="probe.close" onPress={close} />
    </>
  );
};

const renderHost = () =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <OptionsPanelProvider>
        <Probe />
        <OptionsPanelHost title="Options" actions={[]} onClose={() => {}}>
          <Text>home</Text>
        </OptionsPanelHost>
      </OptionsPanelProvider>
    </ContextAppLoadedProvider>,
  );

const kind = () => screen.getByTestId('probe.kind').props.children;

beforeEach(() => {
  jest.mocked(useIsFocused).mockReturnValue(true);
});

test('Tests that the panel goes under when a grid item is dispatched and is in front again when the home regains the focus.', () => {
  const host = renderHost();
  fireEvent.press(screen.getByTestId('probe.open'));
  expect(kind()).toBe('open');

  fireEvent.press(screen.getByTestId('probe.sink'));
  expect(kind()).toBe('under');
  expect(screen.getByTestId('optionspanel.under').props.pointerEvents).toBe(
    'none',
  );

  jest.mocked(useIsFocused).mockReturnValue(false);
  act(() => host.rerender(renderTree()));
  expect(kind()).toBe('under');

  jest.mocked(useIsFocused).mockReturnValue(true);
  act(() => host.rerender(renderTree()));
  expect(kind()).toBe('open');
  expect(screen.getByTestId('optionspanel.open').props.pointerEvents).toBe(
    'auto',
  );
});

test('Tests that sinking does nothing when the panel is closed.', () => {
  renderHost();
  fireEvent.press(screen.getByTestId('probe.sink'));
  expect(kind()).toBe('closed');
});

test('Tests that a sunk panel closes for good when something closes it.', () => {
  const host = renderHost();
  fireEvent.press(screen.getByTestId('probe.open'));
  fireEvent.press(screen.getByTestId('probe.sink'));
  fireEvent.press(screen.getByTestId('probe.close'));
  jest.mocked(useIsFocused).mockReturnValue(false);
  act(() => host.rerender(renderTree()));
  jest.mocked(useIsFocused).mockReturnValue(true);
  act(() => host.rerender(renderTree()));
  expect(kind()).toBe('closed');
});

const renderTree = () => (
  <ContextAppLoadedProvider
    value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
  >
    <OptionsPanelProvider>
      <Probe />
      <OptionsPanelHost title="Options" actions={[]} onClose={() => {}}>
        <Text>home</Text>
      </OptionsPanelHost>
    </OptionsPanelProvider>
  </ContextAppLoadedProvider>
);
