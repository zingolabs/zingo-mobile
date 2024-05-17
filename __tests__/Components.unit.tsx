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
import { CurrencyEnum, CurrencyNameEnum } from '../app/AppState';

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
  //unit test
  test('CurrencyAmount - High Privacy - price=2.9826 and amtZec=1.00098 result $ -.-- USD', () => {
    const text: any = render(
      <CurrencyAmount price={2.9826} amtZec={1.00098} style={{}} currency={CurrencyEnum.USDCurrency} privacy={true} />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[0].children[0]).toBe('$');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' -.--');
  });
  test('CurrencyAmount - price undefined result $ -- USD', () => {
    const text: any = render(<CurrencyAmount amtZec={1} style={{}} currency={CurrencyEnum.USDCurrency} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[0].children[0]).toBe('$');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' -.--');
  });

  test('CurrencyAmount - price 0 result $ -- USD', () => {
    const text: any = render(
      <CurrencyAmount price={0} amtZec={1} style={{}} currency={CurrencyEnum.USDCurrency} />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[0].children[0]).toBe('$');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' -.--');
  });

  test('CurrencyAmount - amtZec undefined result $ -- USD', () => {
    const text: any = render(<CurrencyAmount price={1} style={{}} currency={CurrencyEnum.USDCurrency} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[0].children[0]).toBe('$');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' -.--');
  });

  test('CurrencyAmount - price * amtZec really tiny result $ < 0.01 USD', () => {
    const text: any = render(
      <CurrencyAmount price={0.001} amtZec={1} style={{}} currency={CurrencyEnum.USDCurrency} />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[0].children[0]).toBe('$');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' < 0.01');
  });

  test('CurrencyAmount - price=2.9826 and amtZec=1.00098 result $ 2.99 USD', () => {
    const text: any = render(
      <CurrencyAmount price={2.9826} amtZec={1.00098} style={{}} currency={CurrencyEnum.USDCurrency} />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[0].children[0]).toBe('$');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' 2.99');
  });

  test("CurrencyAmount - style={backgroundColor: 'red'} result same", () => {
    const text: any = render(
      <CurrencyAmount
        price={2.9826}
        amtZec={1.00098}
        style={{ backgroundColor: 'red' }}
        currency={CurrencyEnum.USDCurrency}
      />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[0].props.style.backgroundColor).toBe('red');
    expect(text.children[0].children[0].children[1].props.style.backgroundColor).toBe('red');
  });

  test('ZecAmount - High Privacy - amtZec -1.123456789 rounded up result -.---- ZEC', () => {
    const text: any = render(
      <ZecAmount amtZec={-1.123456789} currencyName={CurrencyNameEnum.ZEC} privacy={true} />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' -.----');
  });

  test('ZecAmount - All props missing result -- ZEC', () => {
    const text: any = render(<ZecAmount currencyName={CurrencyNameEnum.ZEC} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' --');
  });

  test('ZecAmount - amtZec 0 result 0.00000000 ZEC', () => {
    const text: any = render(<ZecAmount amtZec={0} currencyName={CurrencyNameEnum.ZEC} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' 0.0000');
  });

  test('ZecAmount - amtZec -1.123456789 rounded up result -1.12345679 ZEC', () => {
    const text: any = render(<ZecAmount amtZec={-1.123456789} currencyName={CurrencyNameEnum.ZEC} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' -1.1234');
    expect(text.children[0].children[0].children[2].type).toBe('Text');
    expect(text.children[0].children[0].children[2].children[0]).toBe('5679');
  });

  test('ZecAmount - amtZec 1.123456781 rounded down result 1.12345678 ZEC', () => {
    const text: any = render(<ZecAmount amtZec={1.123456781} currencyName={CurrencyNameEnum.ZEC} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' 1.1234');
    expect(text.children[0].children[0].children[2].type).toBe('Text');
    expect(text.children[0].children[0].children[2].children[0]).toBe('5678');
  });

  test("ZecAmount - color 'red' result same", () => {
    const text: any = render(<ZecAmount color={'red'} currencyName={CurrencyNameEnum.ZEC} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' --');
    expect(text.children[0].children[0].children[1].props.style.color).toBe('red');
    expect(text.children[0].children[0].children[2].type).toBe('Text');
    expect(text.children[0].children[0].children[2].children).toBe(null);
    expect(text.children[0].children[0].children[2].props.style.color).toBe('red');
  });

  test('ZecAmount - size 11 result same and same * 0.7', () => {
    const text: any = render(<ZecAmount size={11} currencyName={CurrencyNameEnum.ZEC} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' --');
    expect(text.children[0].children[0].children[1].props.style.fontSize).toBe(11);
    expect(text.children[0].children[0].children[2].type).toBe('Text');
    expect(text.children[0].children[0].children[2].children).toBe(null);
    expect(text.children[0].children[0].children[2].props.style.fontSize).toBe(11 * 0.7);
  });

  test("ZecAmount - View style backgroundColor 'red' result same", () => {
    const text: any = render(
      <ZecAmount style={{ backgroundColor: 'red' }} currencyName={CurrencyNameEnum.ZEC} />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.props.style.backgroundColor).toBe('red');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' --');
    expect(text.children[0].children[0].children[2].type).toBe('Text');
    expect(text.children[0].children[0].children[2].children).toBe(null);
  });

  test("ZecAmount - zecSymbol undefined result '---", () => {
    const text: any = render(<ZecAmount />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0].children[1].type).toBe('Text');
    expect(text.children[0].children[0].children[1].children[0]).toBe(' --');
    expect(text.children[0].children[0].children[2].type).toBe('Text');
    expect(text.children[0].children[0].children[2].children).toBe(null);
  });

  test("BoldText - children 'bold text' result same", () => {
    const text: any = render(<BoldText children={'bold text'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('bold text');
  });

  test("BoldText - View style backgroundColor 'red' result same", () => {
    const text: any = render(<BoldText style={{ backgroundColor: 'red' }}>Bold Text</BoldText>).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("FadeText - children 'fade text' result same", () => {
    const text: any = render(<FadeText>Fade text</FadeText>).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('Fade text');
  });

  test("FadeText - View style backgroundColor 'red' result same", () => {
    const text: any = render(<FadeText style={{ backgroundColor: 'red' }}>Fade Text</FadeText>).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("ErrorText - children 'error text' result same", () => {
    const text: any = render(<ErrorText children={'error text'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('error text');
  });

  test("ErrorText - View style backgroundColor 'red' result same", () => {
    const text: any = render(<ErrorText style={{ backgroundColor: 'red' }}>Error Text</ErrorText>).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("RegText - children 'reg text' result same", () => {
    const text: any = render(<RegText children={'reg text'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('reg text');
  });

  test("RegText - View style backgroundColor 'red' result same", () => {
    const text: any = render(<RegText style={{ backgroundColor: 'red' }}>Reg Text</RegText>).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("RegText - View style color 'red' result same", () => {
    const text: any = render(<RegText color={'red'}>Reg Text</RegText>).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.color).toBe('red');
  });
});
