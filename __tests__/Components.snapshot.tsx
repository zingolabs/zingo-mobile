/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import CurrencyAmount from '../components/Components/CurrencyAmount';
import ZecAmount from '../components/Components/ZecAmount';
import BoldText from '../components/Components/BoldText';
import FadeText from '../components/Components/FadeText';
import ErrorText from '../components/Components/ErrorText';
import RegText from '../components/Components/RegText';
import { CurrencyEnum } from '../app/AppState/enums/CurrencyEnum';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// test suite
describe('Component Components - test', () => {
  //snapshot test
  test('CurrencyAmount High Privacy - snapshot', () => {
    const currencyAmount = render(
      <CurrencyAmount
        price={1.12345678}
        amtZec={39.99}
        style={{ backgroundColor: 'red' }}
        currency={CurrencyEnum.USD}
        privacy={true}
      />,
    );
    expect(currencyAmount.toJSON()).toMatchSnapshot();
  });

  test('CurrencyAmount Normal Privacy - snapshot', () => {
    const currencyAmount = render(
      <CurrencyAmount
        price={1.12345678}
        amtZec={39.99}
        style={{ backgroundColor: 'red' }}
        currency={CurrencyEnum.USD}
      />,
    );
    expect(currencyAmount.toJSON()).toMatchSnapshot();
  });

  test('ZecAmount High Privacy - snapshot', () => {
    const zecAmount = render(
      <ZecAmount
        color={'red'}
        size={20}
        amtZec={1.12345678}
        style={{ backgroundColor: 'red' }}
        currencyName={'ZEC'}
        privacy={true}
      />,
    );
    expect(zecAmount.toJSON()).toMatchSnapshot();
  });

  test('ZecAmount Normal Privacy - snapshot', () => {
    const zecAmount = render(
      <ZecAmount color={'red'} size={20} amtZec={1.12345678} style={{ backgroundColor: 'red' }} currencyName={'ZEC'} />,
    );
    expect(zecAmount.toJSON()).toMatchSnapshot();
  });

  test('BoldText - snapshot', () => {
    const boldText = render(<BoldText style={{ backgroundColor: 'red' }} children={'bold text'} />);
    expect(boldText.toJSON()).toMatchSnapshot();
  });

  test('FadeText - snapshot', () => {
    const fadeText = render(<FadeText style={{ backgroundColor: 'red' }} children={'fade text'} />);
    expect(fadeText.toJSON()).toMatchSnapshot();
  });

  test('ErrorText - snapshot', () => {
    const errorText = render(<ErrorText style={{ backgroundColor: 'white' }} children={'error text'} />);
    expect(errorText.toJSON()).toMatchSnapshot();
  });

  test('RegText - snapshot', () => {
    const onPress = jest.fn();
    const regText = render(
      <RegText style={{ backgroundColor: 'white' }} color={'red'} onPress={onPress} children={'reg text'} />,
    );
    expect(regText.toJSON()).toMatchSnapshot();
  });
});
