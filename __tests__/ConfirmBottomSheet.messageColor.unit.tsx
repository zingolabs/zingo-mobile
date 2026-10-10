import 'react-native';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

import ConfirmBottomSheet from '@ui/widgets/ConfirmBottomSheet';
import { showConfirm } from '@app/services/showConfirm';

const messageColor = () =>
  screen.getByTestId('confirm.message').props.style.color;

const confirm = (messageTone?: 'danger') =>
  act(() => {
    showConfirm({
      title: 'Are you certain?',
      message: 'message',
      messageTone,
      buttons: [{ text: 'Confirm' }, { text: 'Cancel', style: 'cancel' }],
    });
  });

test('Tests that the message keeps the theme text color when no tone is given', () => {
  render(<ConfirmBottomSheet />);
  confirm();
  expect(messageColor()).toEqual(expect.any(String));
});

test('Tests that the danger tone paints the message in another color', () => {
  render(<ConfirmBottomSheet />);
  confirm();
  const plain = messageColor();
  confirm('danger');
  expect(messageColor()).toEqual(expect.any(String));
  expect(messageColor()).not.toBe(plain);
});
