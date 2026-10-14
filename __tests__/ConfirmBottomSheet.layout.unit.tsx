import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import { showConfirm } from '@app/services/showConfirm';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

const fill = (testID: string) =>
  screen.getByTestId(testID).props.style.backgroundColor;

test('Tests that a destructive action is a red pill and a plain one green when both kinds are confirmed.', () => {
  render(<ConfirmBottomSheet />);
  act(() =>
    showConfirm({
      title: 'Delete?',
      buttons: [{ text: 'Delete', style: 'destructive' }],
    }),
  );
  expect(fill('confirm.action.0')).toBe(mockTheme.colors.bgDanger);
  act(() => showConfirm({ title: 'Rescan?', buttons: [{ text: 'Rescan' }] }));
  expect(fill('confirm.action.0')).toBe(mockTheme.colors.bgAccent);
});

test('Tests that Cancel sits apart from the actions and runs its handler when tapped.', () => {
  const onCancel = jest.fn();
  jest.useFakeTimers();
  render(<ConfirmBottomSheet />);
  act(() =>
    showConfirm({
      title: 'Delete?',
      buttons: [
        { text: 'Delete', style: 'destructive' },
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
      ],
    }),
  );
  expect(screen.queryByTestId('confirm.action.1')).toBeNull();
  fireEvent.press(screen.getByTestId('confirm.cancel'));
  act(() => jest.runAllTimers());
  expect(onCancel).toHaveBeenCalled();
  jest.useRealTimers();
});
