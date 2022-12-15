/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
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
jest.useFakeTimers();

// test suite
describe('Component Components - test', () => {
  //snapshot test
  test('UsdAmount - snapshot', () => {
    const usdAmount = create(<UsdAmount price={null} amtZec={0} style={{}} />);
    expect(usdAmount.toJSON()).toMatchSnapshot();
  });

  test('ZecPrice - snapshot', () => {
    const zecPrice = create(<ZecPrice price={0} currencyName={'ZEC'} />);
    expect(zecPrice.toJSON()).toMatchSnapshot();
  });

  test('ZecAmount - snapshot', () => {
    const zecAmount = create(<ZecAmount color={''} size={0} amtZec={0} style={{}} currencyName={'ZEC'} />);
    expect(zecAmount.toJSON()).toMatchSnapshot();
  });

  test('BoldText - snapshot', () => {
    const boldText = create(<BoldText style={{}} children={''} />);
    expect(boldText.toJSON()).toMatchSnapshot();
  });

  test('FadeText - snapshot', () => {
    const fadeText = create(<FadeText style={{}} children={''} />);
    expect(fadeText.toJSON()).toMatchSnapshot();
  });

  test('ErrorText - snapshot', () => {
    const errorText = create(<ErrorText style={{}} children={''} />);
    expect(errorText.toJSON()).toMatchSnapshot();
  });

  test('RegText - snapshot', () => {
    const regText = create(<RegText style={{}} color={''} onPress={() => {}} children={''} />);
    expect(regText.toJSON()).toMatchSnapshot();
  });
});
