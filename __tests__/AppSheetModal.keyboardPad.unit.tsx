import React from 'react';
import 'react-native';
import { render, screen } from '@testing-library/react-native';
import AppSheetModal from '@ui/primitives/AppSheetModal';
import RegText from '@ui/primitives/RegText';
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
const pads = () => {
  const { StyleSheet, View } = require('react-native');
  return screen.UNSAFE_root.findAll(
    node =>
      node.type === View &&
      StyleSheet.flatten(node.props.style)?.paddingBottom !== undefined,
  ).map(node => StyleSheet.flatten(node.props.style).paddingBottom);
};

/** Renders on iOS, the platform back as it was afterwards. */
const onIOS = (sheet: React.ReactElement) => {
  const { Platform } = require('react-native');
  const prior = Platform.OS;
  Platform.OS = 'ios';
  try {
    render(sheet);
    return pads();
  } finally {
    Platform.OS = prior;
  }
};

test('Tests that a fixed sheet keeps its list above the keyboard on iOS when the keyboard is open. Gorhom takes the keyboard out of the content already, and a second pad of its height left the list no room.', () => {
  const drawn = onIOS(
    <AppSheetModal snapPoints={['88%']}>
      <RegText>list</RegText>
    </AppSheetModal>,
  );

  expect(drawn[0]).toBe(space16);
});

test('Tests that a sheet sized by its content still pads the keyboard on iOS when the keyboard is open', () => {
  const drawn = onIOS(
    <AppSheetModal>
      <RegText>form</RegText>
    </AppSheetModal>,
  );

  expect(drawn[0]).toBe(mockKeyboard.height + space16);
});
