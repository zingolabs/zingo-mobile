/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import CurrencyAmount from '../components/Components/CurrencyAmount';
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
  //unit test
  test('UsdAmount - price undefined result $ -- USD', () => {
    const text: any = render(<CurrencyAmount amtZec={1} style={{}} currency={'USD'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - price 0 result $ -- USD', () => {
    const text: any = render(<CurrencyAmount price={0} amtZec={1} style={{}} currency={'USD'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - amtZec undefined result $ -- USD', () => {
    const text: any = render(<CurrencyAmount price={1} style={{}} currency={'USD'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - price * amtZec really tiny result $ < 0.01 USD', () => {
    const text: any = render(<CurrencyAmount price={0.001} amtZec={1} style={{}} currency={'USD'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' < 0.01');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - price=2.9826 and amtZec=1.00098 result $ 2.99 USD', () => {
    const text: any = render(<CurrencyAmount price={2.9826} amtZec={1.00098} style={{}} currency={'USD'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' 2.99');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test("UsdAmount - style={backgroundColor: 'red'} result same", () => {
    const text: any = render(
      <CurrencyAmount price={2.9826} amtZec={1.00098} style={{ backgroundColor: 'red' }} currency={'USD'} />,
    ).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].props.style.backgroundColor).toBe('red');
    expect(text.children[1].props.style.backgroundColor).toBe('red');
    expect(text.children[2].props.style.backgroundColor).toBe('red');
  });

  test('ZecPrice - price 0 result null', () => {
    const text: any = render(<ZecPrice price={0} currencyName={'ZEC'} currency={'USD'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children).toBe(null);
  });

  test('ZecPrice - price -1 result null', () => {
    const text: any = render(<ZecPrice price={-1} currencyName={'ZEC'} currency={'USD'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children).toBe(null);
  });

  test('ZecPrice - price 1.02999 rounded up result $ 1.03 per ZEC', () => {
    const text: any = render(<ZecPrice price={1.02999} currencyName={'ZEC'} currency={'USD'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('$ 1.03 USD per ZEC');
  });

  test("ZecPrice - price 1.02333 rounded down result '$ 1.02 per ZEC", () => {
    const text: any = render(<ZecPrice price={1.02333} currencyName={'ZEC'} currency={'USD'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('$ 1.02 USD per ZEC');
  });

  test('ZecAmount - All props missing result -- ZEC', () => {
    const text: any = render(<ZecAmount currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children).toBe(null);
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
  });

  test('ZecAmount - amtZec 0 result 0.00000000 ZEC', () => {
    const text: any = render(<ZecAmount amtZec={0} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' 0.0000');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children[0]).toBe(' ZEC');
  });

  test('ZecAmount - amtZec -1.123456789 rounded up result -1.12345679 ZEC', () => {
    const text: any = render(<ZecAmount amtZec={-1.123456789} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' -1.1234');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children[0]).toBe('5679');
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
  });

  test('ZecAmount - amtZec 1.123456781 rounded down result 1.12345678 ZEC', () => {
    const text: any = render(<ZecAmount amtZec={1.123456781} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' 1.1234');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children[0]).toBe('5678');
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
  });

  test("ZecAmount - color 'red' result same", () => {
    const text: any = render(<ZecAmount color={'red'} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[0].props.style.color).toBe('red');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[1].props.style.color).toBe('red');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children).toBe(null);
    expect(text.children[2].props.style.color).toBe('red');
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
    expect(text.children[3].props.style.color).toBe('red');
  });

  test('ZecAmount - size 11 result same and same * 0.7', () => {
    const text: any = render(<ZecAmount size={11} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[0].props.style.fontSize).toBe(11);
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[1].props.style.fontSize).toBe(11);
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children).toBe(null);
    expect(text.children[2].props.style.fontSize).toBe(11 * 0.7);
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
    expect(text.children[3].props.style.fontSize).toBe(11);
  });

  test("ZecAmount - View style backgroundColor 'red' result same", () => {
    const text: any = render(<ZecAmount style={{ backgroundColor: 'red' }} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.props.style.backgroundColor).toBe('red');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children).toBe(null);
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
  });

  test("ZecAmount - zecSymbol 'ZzZ' result same", () => {
    const text: any = render(<ZecAmount currencyName={'ZzZ'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children).toBe(null);
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZzZ');
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
