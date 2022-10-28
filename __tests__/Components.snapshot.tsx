/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import {
  UsdAmount,
  ZecPrice,
  ZecAmount,
  BoldText,
  FadeText,
  ClickableText,
  ErrorText,
  RegText,
  RegTextInput,
} from '../components/Components';

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
    const zecPrice = create(<ZecPrice price={null} />);
    expect(zecPrice.toJSON()).toMatchSnapshot();
  });

  test('ZecAmount - snapshot', () => {
    const zecAmount = create(<ZecAmount color={''} size={0} amtZec={0} style={{}} zecSymbol={''} />);
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

  test('ClickableText - snapshot', () => {
    const clickableText = create(<ClickableText style={{}} children={''} />);
    expect(clickableText.toJSON()).toMatchSnapshot();
  });

  test('ErrorText - snapshot', () => {
    const errorText = create(<ErrorText style={{}} children={''} />);
    expect(errorText.toJSON()).toMatchSnapshot();
  });

  test('RegText - snapshot', () => {
    const regText = create(<RegText style={{}} color={''} onPress={() => {}} children={''} />);
    expect(regText.toJSON()).toMatchSnapshot();
  });

  test('RegTextInput - snapshot', () => {
    const regTextInput = create(<RegTextInput style={{}} />);
    expect(regTextInput.toJSON()).toMatchSnapshot();
  });
});
