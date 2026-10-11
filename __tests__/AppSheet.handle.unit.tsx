import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import AppSheet from '@ui/primitives/AppSheet';
import RegText from '@ui/primitives/RegText';

// Draws the handle as the real sheet does, and records each component type
// it was handed: a new type per render remounts the handle and its rim.
const mockHandles: unknown[] = [];
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ handleComponent: Handle, children }: any) => {
      mockHandles.push(Handle);
      return ReactActual.createElement(
        ReactActual.Fragment,
        null,
        ReactActual.createElement(Handle),
        children,
      );
    },
  };
});

const mount = (title: string) => (
  <AppSheet snapPoints={[100]} header={<RegText>{title}</RegText>}>
    <RegText>content</RegText>
  </AppSheet>
);

test('Tests that a new header updates the handle without handing the sheet a new handle', () => {
  const { rerender } = render(mount('first'));
  rerender(mount('second'));

  expect(screen.getByText('second')).toBeTruthy();
  expect(new Set(mockHandles).size).toBe(1);
});
