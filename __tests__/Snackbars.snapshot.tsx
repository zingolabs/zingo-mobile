/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Snackbars from '../components/Components/Snackbars';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockSnackbars } from '../__mocks__/dataMocks/mockSnackbars';

// test suite
describe('Component Snackbars - test', () => {
  //snapshot test
  test('Snackbars - snapshot', () => {
    const removeFirstSnackbar = jest.fn();
    const snack = render(
      <Snackbars snackbars={mockSnackbars} removeFirstSnackbar={removeFirstSnackbar} translate={mockTranslate} />,
    );
    expect(snack.toJSON()).toMatchSnapshot();
  });
});
