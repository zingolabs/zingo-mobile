/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Snackbars from '../components/Components/Snackbars';
import SnackbarType from '../app/AppState/types/SnackbarType';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-snackbar', () => {
  return {
    LENGTH_LONG: 3500,
    show: jest.fn(),
  };
});

// test suite
describe('Component Snackbars - test', () => {
  //snapshot test
  test('Snackbars - snapshot', () => {
    const removeFirstSnackbar = jest.fn();
    const translate = () => 'text translated';
    const snackbars: SnackbarType[] = [{ message: 'snackbar' }];
    const snack = render(
      <Snackbars snackbars={snackbars} removeFirstSnackbar={removeFirstSnackbar} translate={translate} />,
    );
    expect(snack.toJSON()).toMatchSnapshot();
  });
});
