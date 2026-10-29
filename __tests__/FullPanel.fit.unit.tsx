import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import FullPanel from '@ui/widgets/FullPanel';
import TitleBar from '@ui/widgets/TitleBar';
import Text from '@ui/primitives/Text';

jest.mock('react-native-keyboard-controller', () => {
  const { ScrollView } = require('react-native');
  return {
    ...jest.requireActual('../__mocks__/react-native-keyboard-controller'),
    KeyboardAwareScrollView: ScrollView,
  };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
  useRoute: () => ({ key: 'panel-1', name: 'Panel' }),
}));

const open = (fit: boolean) =>
  render(
    <FullPanel title="Your addresses" fit={fit} testID="panel">
      <Text>rows</Text>
    </FullPanel>,
  );
/** The header's wrapper, the view around the title bar. */
const bar = () => screen.UNSAFE_getByType(TitleBar).parent!;
/** The panel's height: the nearest view above the header that sets one. */
const panelHeight = () => {
  const heightOf = (style: unknown) =>
    ([style].flat(Infinity) as { height?: number }[]).reduce<
      number | undefined
    >((h, st) => (st && st.height !== undefined ? st.height : h), undefined);
  let node = bar().parent;
  while (node && heightOf(node.props.style) === undefined) {
    node = node.parent;
  }
  return node ? heightOf(node.props.style) : undefined;
};
const measure = (header: number, content: number) => {
  fireEvent(bar(), 'layout', { nativeEvent: { layout: { height: header } } });
  fireEvent(screen.getByTestId('panel'), 'contentSizeChange', 0, content);
};

test('Tests that a fitting panel takes its header and content height when they are shorter than the screen', () => {
  open(true);
  act(() => measure(50, 100));
  expect(panelHeight()).toBe(150);
});

test('Tests that a fitting panel stops at the full height when its content is taller', () => {
  open(false);
  const full = panelHeight();
  expect(full).toBeGreaterThan(0);
  open(true);
  act(() => measure(50, 5000));
  expect(panelHeight()).toBe(full);
});

test('Tests that a panel draws no bottom sheet when it opens', () => {
  open(false);
  expect(
    screen.UNSAFE_queryAllByProps({ snapPoints: expect.anything() }),
  ).toEqual([]);
});

test('Tests that a tap outside a fitting panel goes back when the panel can', () => {
  const onBack = jest.fn();
  render(
    <FullPanel title="Your addresses" fit onBack={onBack} testID="panel">
      <Text>rows</Text>
    </FullPanel>,
  );
  fireEvent.press(screen.getByTestId('panel.outside'));
  expect(onBack).toHaveBeenCalledTimes(1);
});
