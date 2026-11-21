import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import { space16 } from '@app/theme';

const mockKeyboard = { height: 336 };
jest.mock('@app/hooks/useKeyboardHeight', () => ({
  useKeyboardHeight: () => mockKeyboard.height,
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    BottomSheetModal: ReactActual.forwardRef(
      ({ children }: { children: React.ReactNode }, _ref: unknown) => (
        <RNView>{children}</RNView>
      ),
    ),
    BottomSheetView: ({ children }: { children: React.ReactNode }) => (
      <RNView>{children}</RNView>
    ),
    BottomSheetScrollView: ({ children }: { children: React.ReactNode }) => (
      <RNView>{children}</RNView>
    ),
    BottomSheetFlatList: () => null,
    BottomSheetBackdrop: () => null,
    BottomSheetFooter: ({ children }: { children: React.ReactNode }) => (
      <RNView>{children}</RNView>
    ),
    useBottomSheetInternal: () => ({
      animatedLayoutState: { modify: () => {} },
    }),
  };
});

/** The bottom pads the sheet's body draws, outermost first. */
const pads = () =>
  screen.UNSAFE_root.findAll(
    node =>
      node.type === View &&
      StyleSheet.flatten(node.props.style)?.paddingBottom !== undefined,
  ).map(node => StyleSheet.flatten(node.props.style).paddingBottom);

describe('AppSheetModal keyboard pad', () => {
  const os = Platform.OS;
  afterEach(() => {
    Platform.OS = os;
  });

  test('Tests that a fixed sheet keeps its list above the keyboard on iOS when the keyboard is open. Gorhom takes the keyboard out of the content already, and a second pad of its height left the list no room.', () => {
    Platform.OS = 'ios';
    render(
      <AppSheetModal snapPoints={['88%']}>
        <Text>list</Text>
      </AppSheetModal>,
    );

    expect(pads()[0]).toBe(space16);
  });

  test('Tests that a sheet sized by its content still pads the keyboard on iOS when the keyboard is open', () => {
    Platform.OS = 'ios';
    render(
      <AppSheetModal>
        <Text>form</Text>
      </AppSheetModal>,
    );

    expect(pads()[0]).toBe(mockKeyboard.height + space16);
  });
});
