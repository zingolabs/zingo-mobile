/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import CurrencyAmount from '@ui/widgets/CurrencyAmount';
import ZecAmount from '@ui/widgets/ZecAmount';
import BoldText from '@ui/primitives/BoldText';
import FadeText from '@ui/primitives/FadeText';
import ErrorText from '@ui/primitives/ErrorText';
import RegText from '@ui/primitives/RegText';
import { CurrencyEnum, CurrencyNameEnum } from '@app/AppState';

// test suite
describe('Component Components - test', () => {
  //snapshot test
  test('CurrencyAmount High Privacy - snapshot', () => {
    const currencyAmount = render(
      <CurrencyAmount
        price={1.12345678}
        amtZec={39.99}
        style={{ backgroundColor: 'red' }}
        currency={CurrencyEnum.USDCurrency}
        privacy={true}
      />,
    );
    expect(currencyAmount).toMatchSnapshot();
  });

  test('ZecAmount High Privacy - snapshot', () => {
    const zecAmount = render(
      <ZecAmount
        color={'red'}
        size={20}
        amtZec={1.12345678}
        style={{ backgroundColor: 'red' }}
        currencyName={CurrencyNameEnum.ZEC}
        privacy={true}
      />,
    );
    expect(zecAmount).toMatchSnapshot();
  });

  test('ZecAmount Normal Privacy - snapshot', () => {
    const zecAmount = render(
      <ZecAmount
        color={'red'}
        size={20}
        amtZec={1.12345678}
        style={{ backgroundColor: 'red' }}
        currencyName={CurrencyNameEnum.ZEC}
      />,
    );
    expect(zecAmount).toMatchSnapshot();
  });

  test('BoldText - snapshot', () => {
    const boldText = render(
      <BoldText style={{ backgroundColor: 'red' }} children={'bold text'} />,
    );
    expect(boldText).toMatchSnapshot();
  });

  test('FadeText - snapshot', () => {
    const fadeText = render(
      <FadeText style={{ backgroundColor: 'red' }} children={'fade text'} />,
    );
    expect(fadeText).toMatchSnapshot();
  });

  test('ErrorText - snapshot', () => {
    const errorText = render(
      <ErrorText
        style={{ backgroundColor: 'white' }}
        children={'error text'}
      />,
    );
    expect(errorText).toMatchSnapshot();
  });

  test('RegText - snapshot', () => {
    const onPress = jest.fn();
    const regText = render(
      <RegText
        style={{ backgroundColor: 'white' }}
        color={'red'}
        onPress={onPress}
        children={'reg text'}
      />,
    );
    expect(regText).toMatchSnapshot();
  });
});
