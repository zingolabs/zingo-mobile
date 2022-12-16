/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import UsdAmount from '../components/Components/UsdAmount';
import ZecPrice from '../components/Components/ZecPrice';
import ZecAmount from '../components/Components/ZecAmount';
import BoldText from '../components/Components/BoldText';
import FadeText from '../components/Components/FadeText';
import ErrorText from '../components/Components/ErrorText';
import RegText from '../components/Components/RegText';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));

// test suite
describe('Component Components - test', () => {
  //snapshot test
  test('UsdAmount - snapshot', () => {
    const usdAmount = render(<UsdAmount price={null} amtZec={0} style={{}} />);
    expect(usdAmount.toJSON()).toMatchSnapshot();
  });

  test('ZecPrice - snapshot', () => {
    const zecPrice = render(<ZecPrice price={0} currencyName={'ZEC'} />);
    expect(zecPrice.toJSON()).toMatchSnapshot();
  });

  test('ZecAmount - snapshot', () => {
    const zecAmount = render(<ZecAmount color={''} size={0} amtZec={0} style={{}} currencyName={'ZEC'} />);
    expect(zecAmount.toJSON()).toMatchSnapshot();
  });

  test('BoldText - snapshot', () => {
    const boldText = render(<BoldText style={{}} children={''} />);
    expect(boldText.toJSON()).toMatchSnapshot();
  });

  test('FadeText - snapshot', () => {
    const fadeText = render(<FadeText style={{}} children={''} />);
    expect(fadeText.toJSON()).toMatchSnapshot();
  });

  test('ErrorText - snapshot', () => {
    const errorText = render(<ErrorText style={{}} children={''} />);
    expect(errorText.toJSON()).toMatchSnapshot();
  });

  test('RegText - snapshot', () => {
    const regText = render(<RegText style={{}} color={''} onPress={() => {}} children={''} />);
    expect(regText.toJSON()).toMatchSnapshot();
  });
});
