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
  //unit test
  test('UsdAmount - price null result $ --', () => {
    const text = create(<UsdAmount price={null} amtZec={1} style={{}} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0]).toBe('$ ');
    expect(text.children[1]).toBe('--');
  });

  test('UsdAmount - price 0 result $ --', () => {
    const text = create(<UsdAmount price={0} amtZec={1} style={{}} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0]).toBe('$ ');
    expect(text.children[1]).toBe('--');
  });

  test('UsdAmount - amtZec undefined result $ --', () => {
    const text = create(<UsdAmount price={1} amtZec={undefined} style={{}} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0]).toBe('$ ');
    expect(text.children[1]).toBe('--');
  });

  test('UsdAmount - price * amtZec really tiny result starts $ < 0.01 ', () => {
    const text = create(<UsdAmount price={0.001} amtZec={1} style={{}} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0]).toBe('$ ');
    expect(text.children[1]).toBe('< 0.01');
  });

  test('UsdAmount - price=2.9826 and amtZec=1.00098 result $ 2.99', () => {
    const text = create(<UsdAmount price={2.9826} amtZec={1.00098} style={{}} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0]).toBe('$ ');
    expect(text.children[1]).toBe('2.99');
  });

  test("UsdAmount - style={backgroundColor: 'red'} result same", () => {
    const text = create(<UsdAmount price={2.9826} amtZec={1.00098} style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("ZecPrice - number null result ''", () => {
    const text = create(<ZecPrice price={null} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('');
  });

  test("ZecPrice - number 0 result ''", () => {
    const text = create(<ZecPrice price={0} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('');
  });

  test("ZecPrice - number -1 result ''", () => {
    const text = create(<ZecPrice price={-1} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('');
  });

  test('ZecPrice - number 1.02999 rounded up result $ 1.03 per ZEC', () => {
    const text = create(<ZecPrice price={1.02999} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('$ 1.03 per ZEC');
  });

  test("ZecPrice - number 1.02333 rounded down result '$ 1.02 per ZEC", () => {
    const text = create(<ZecPrice price={1.02333} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('$ 1.02 per ZEC');
  });

  test('ZecAmount - All props missing result ZEC --', () => {
    const text = create(<ZecAmount />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].props.style.fontSize).toBe(24);
    expect(text.children[0].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0].children[0]).toBe('ZEC');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('--');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].props.style.fontSize).toBe(24 / 2);
    expect(text.children[1].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[1].children[0]).toBe('');
  });

  test('ZecAmount - amtZec 0 result ZEC 0.0000 0000', () => {
    const text = create(<ZecAmount amtZec={0} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].props.style.fontSize).toBe(24);
    expect(text.children[0].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0].children[0]).toBe('ZEC');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('0.0000');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].props.style.fontSize).toBe(24 / 2);
    expect(text.children[1].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[1].children[0]).toBe('0000');
  });

  test('ZecAmount - amtZec -1.123456789 rounded up result ZEC -1.1234 5679', () => {
    const text = create(<ZecAmount amtZec={-1.123456789} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].props.style.fontSize).toBe(24);
    expect(text.children[0].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0].children[0]).toBe('ZEC');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('-1.1234');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].props.style.fontSize).toBe(24 / 2);
    expect(text.children[1].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[1].children[0]).toBe('5679');
  });

  test('ZecAmount - amtZec 1.123456781 rounded down result ZEC 1.1234 5678', () => {
    const text = create(<ZecAmount amtZec={1.123456781} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].props.style.fontSize).toBe(24);
    expect(text.children[0].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[0].children[0]).toBe('ZEC');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('1.1234');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].props.style.fontSize).toBe(24 / 2);
    expect(text.children[1].props.style.color).toBe('rgb(28, 28, 30)');
    expect(text.children[1].children[0]).toBe('5678');
  });

  test("ZecAmount - color 'red' result same", () => {
    const text = create(<ZecAmount color={'red'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].props.style.color).toBe('red');
    expect(text.children[0].children[0]).toBe('ZEC');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('--');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].props.style.color).toBe('red');
    expect(text.children[1].children[0]).toBe('');
  });

  test('ZecAmount - size 11 result same and same / 2', () => {
    const text = create(<ZecAmount size={11} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].props.style.fontSize).toBe(11);
    expect(text.children[0].children[0]).toBe('ZEC');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('--');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].props.style.fontSize).toBe(11 / 2);
    expect(text.children[1].children[0]).toBe('');
  });

  test("ZecAmount - View style backgroundColor 'red' result same", () => {
    const text = create(<ZecAmount style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.props.style.backgroundColor).toBe('red');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('ZEC');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('--');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe('');
  });

  test("ZecAmount - zecSymbol 'ZzZ' result same", () => {
    const text = create(<ZecAmount zecSymbol={'ZzZ'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('ZzZ');
    expect(text.children[0].children[1]).toBe(' ');
    expect(text.children[0].children[2]).toBe('--');
    expect(text.children[1].type).toBe('Text');
    expect(text.children[1].children[0]).toBe('');
  });

  test("BoldText - children 'children' result same", () => {
    const text = create(<BoldText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("BoldText - View style backgroundColor 'red' result same", () => {
    const text = create(<BoldText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style[0].backgroundColor).toBe('red');
  });

  test("FadeText - children 'children' result same", () => {
    const text = create(<FadeText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("FadeText - View style backgroundColor 'red' result same", () => {
    const text = create(<FadeText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("ClickableText - children 'children' result same", () => {
    const text = create(<ClickableText children={'children'} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].children[0]).toBe('children');
  });

  test("ClickableText - View style backgroundColor 'red' result same", () => {
    const text = create(<ClickableText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('View');
    expect(text.children[0].type).toBe('Text');
    expect(text.children[0].props.style.backgroundColor).toBe('red');
  });

  test("ErrorText - children 'children' result same", () => {
    const text = create(<ErrorText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("ErrorText - View style backgroundColor 'red' result same", () => {
    const text = create(<ErrorText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style.backgroundColor).toBe('red');
  });

  test("RegText - children 'children' result same", () => {
    const text = create(<RegText children={'children'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.children[0]).toBe('children');
  });

  test("RegText - View style backgroundColor 'red' result same", () => {
    const text = create(<RegText style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style[0].backgroundColor).toBe('red');
  });

  test("RegText - View style color 'red' result same", () => {
    const text = create(<RegText color={'red'} />).toJSON();
    expect(text.type).toBe('Text');
    expect(text.props.style[0].color).toBe('red');
  });

  test("RegTextInput - value 'value' result same", () => {
    const text = create(<RegTextInput value={'value'} />).toJSON();
    expect(text.type).toBe('TextInput');
    expect(text.props.value).toBe('value');
  });

  test("RegTextInput - View style backgroundColor 'red' result same", () => {
    const text = create(<RegTextInput style={{ backgroundColor: 'red' }} />).toJSON();
    expect(text.type).toBe('TextInput');
    expect(text.props.style[0].backgroundColor).toBe('red');
  });
});
