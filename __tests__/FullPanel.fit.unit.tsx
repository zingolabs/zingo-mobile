import 'react-native';
import React from 'react';
import Text from '@ui/primitives/Text';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import FullPanel from '@ui/widgets/FullPanel';
import TitleBar from '@ui/widgets/TitleBar';

const mockSheet: { props: Record<string, unknown>; snapToIndex: jest.Mock } = {
  props: {},
  snapToIndex: jest.fn(),
};

jest.mock('@gorhom/bottom-sheet', () => {
  const R = require('react');
  const { View, ScrollView } = require('react-native');
  const BottomSheet = R.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      mockSheet.props = props;
      R.useImperativeHandle(ref, () => ({
        snapToIndex: mockSheet.snapToIndex,
        close: jest.fn(),
      }));
      const Handle = props.handleComponent as React.ComponentType;
      return (
        <View>
          <Handle />
          {props.children as React.ReactNode}
        </View>
      );
    },
  );
  return {
    ...jest.requireActual('../__mocks__/@gorhom/bottom-sheet'),
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView: (props: Record<string, unknown>) => (
      <ScrollView {...props} />
    ),
    BottomSheetFooter: View,
  };
});
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
}));

const snap = () => (mockSheet.props.snapPoints as number[])[0];
const open = (fit: boolean) =>
  render(
    <FullPanel title="Your addresses" fit={fit} testID="panel">
      <Text>rows</Text>
    </FullPanel>,
  );
const measure = (header: number, content: number) => {
  // The header's wrapper, the view around the title bar.
  const bar = screen.UNSAFE_getByType(TitleBar).parent!;
  fireEvent(bar, 'layout', { nativeEvent: { layout: { height: header } } });
  fireEvent(screen.getByTestId('panel'), 'contentSizeChange', 0, content);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation(cb => {
    cb(0);
    return 0;
  });
});

test('Tests that a fitting panel waits closed and then rises to its header and content when they are shorter than the screen', () => {
  open(true);
  expect(mockSheet.props.index).toBe(-1);
  act(() => measure(50, 100));
  expect(snap()).toBe(150);
  expect(mockSheet.snapToIndex).toHaveBeenCalledWith(0);
});

test('Tests that a fitting panel stops at the full height when its content is taller', () => {
  const full = (open(false), snap());
  open(true);
  act(() => measure(50, 5000));
  expect(snap()).toBe(full);
});

test('Tests that a panel not fitting opens at the full height at once', () => {
  open(false);
  expect(mockSheet.props.index).toBe(0);
  expect(mockSheet.snapToIndex).not.toHaveBeenCalled();
});
