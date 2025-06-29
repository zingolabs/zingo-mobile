/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Snackbars from '../components/Components/Snackbars';
import { mockSnackbars } from '../__mocks__/dataMocks/mockSnackbars';
import { ScreenEnum } from '../app/AppState';

// test suite
describe('Component Snackbars - test', () => {
  //snapshot test
  test('Snackbars - snapshot', () => {
    const removeFirstSnackbar = jest.fn();
    const snack = render(
      <Snackbars
        snackbars={mockSnackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={ScreenEnum.About}
      />,
    );
    expect(snack.toJSON()).toMatchSnapshot();
  });
});
