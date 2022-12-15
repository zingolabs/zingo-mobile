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
  //unit test
  test('UsdAmount - price null result $ -- USD', () => {
    const text: any = create(<UsdAmount price={null} amtZec={1} style={{}} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - price 0 result $ -- USD', () => {
    const text: any = create(<UsdAmount price={0} amtZec={1} style={{}} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - amtZec undefined result $ -- USD', () => {
    const text: any = create(<UsdAmount price={1} amtZec={undefined} style={{}} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - price * amtZec really tiny result starts $ < 0.01 USD', () => {
    const text: any = create(<UsdAmount price={0.001} amtZec={1} style={{}} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' < 0.01');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test('UsdAmount - price=2.9826 and amtZec=1.00098 result $ 2.99 USD', () => {
    const text: any = create(<UsdAmount price={2.9826} amtZec={1.00098} style={{}} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('$');
    expect(text.children[1].children[0]).toBe(' 2.99');
    expect(text.children[2].children[0]).toBe(' USD');
  });

  test("UsdAmount - style={backgroundColor: 'red'} result same", () => {
    const text: any = create(<UsdAmount price={2.9826} amtZec={1.00098} style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].props.style.backgroundColor).toBe('red');
    expect(text.children[1].props.style.backgroundColor).toBe('red');
    expect(text.children[2].props.style.backgroundColor).toBe('red');
  });

  test("ZecPrice - number 0 result ''", () => {
    const text: any = create(<ZecPrice price={0} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children).toBe(null);
  });

  test("ZecPrice - number -1 result ''", () => {
    const text: any = create(<ZecPrice price={-1} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children).toBe(null);
  });

  test('ZecPrice - number 1.02999 rounded up result $ 1.03 per ZEC', () => {
    const text: any = create(<ZecPrice price={1.02999} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('$ 1.03 per ZEC');
  });

  test("ZecPrice - number 1.02333 rounded down result '$ 1.02 per ZEC", () => {
    const text: any = create(<ZecPrice price={1.02333} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('$ 1.02 per ZEC');
  });

  test('ZecAmount - All props missing result ZEC --', () => {
    const text: any = create(<ZecAmount currencyName={'ZEC'} />).toJSON();
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

  test('ZecAmount - amtZec 0 result ZEC 0.0000 0000', () => {
    const text: any = create(<ZecAmount amtZec={0} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' 0.0000');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children[0]).toBe('0000');
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
  });

  test('ZecAmount - amtZec -1.123456789 rounded up result ZEC -1.1234 5679', () => {
    const text: any = create(<ZecAmount amtZec={-1.123456789} currencyName={'ZEC'} />).toJSON();
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

  test('ZecAmount - amtZec 1.123456781 rounded down result ZEC 1.1234 5678', () => {
    const text: any = create(<ZecAmount amtZec={1.123456781} currencyName={'ZEC'} />).toJSON();
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
    const text: any = create(<ZecAmount color={'red'} currencyName={'ZEC'} />).toJSON();
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

  test('ZecAmount - size 11 result same and same / 2', () => {
    const text: any = create(<ZecAmount size={11} currencyName={'ZEC'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[0].props.style.fontSize).toBe(11);
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[1].props.style.fontSize).toBe(11);
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children).toBe(null);
    expect(text.children[2].props.style.fontSize).toBe(11 / 2);
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZEC');
    expect(text.children[3].props.style.fontSize).toBe(11);
  });

  test("ZecAmount - View style backgroundColor 'red' result same", () => {
    const text: any = create(<ZecAmount style={{ backgroundColor: 'red' }} currencyName={'ZEC'} />).toJSON();
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
    const text: any = create(<ZecAmount currencyName={'ZzZ'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].children[0]).toBe('\u1647');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe(' --');
    expect(text.children[2].type).toBe('Text');
    expect(text.children[2].children).toBe(null);
    expect(text.children[3].type).toBe('Text');
    expect(text.children[3].children[0]).toBe(' ZzZ');
  });

  test("BoldText - children 'children' result same", () => {
    const text: any = create(<BoldText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("BoldText - View style backgroundColor 'red' result same", () => {
    const text: any = create(<BoldText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("FadeText - children 'children' result same", () => {
    const text: any = create(<FadeText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("FadeText - View style backgroundColor 'red' result same", () => {
    const text: any = create(<FadeText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("ErrorText - children 'children' result same", () => {
    const text: any = create(<ErrorText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("ErrorText - View style backgroundColor 'red' result same", () => {
    const text: any = create(<ErrorText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("RegText - children 'children' result same", () => {
    const text: any = create(<RegText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("RegText - View style backgroundColor 'red' result same", () => {
    const text: any = create(<RegText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style[0].backgroundColor).toBe('red');
  });

  test("RegText - View style color 'red' result same", () => {
    const text: any = create(<RegText color={'red'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style[0].color).toBe('red');
  });
});
