/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import CurrencyAmount from '../components/Components/CurrencyAmount';
import ZecAmount from '../components/Components/ZecAmount';
import BoldText from '../components/Components/BoldText';
import FadeText from '../components/Components/FadeText';
import ErrorText from '../components/Components/ErrorText';
import RegText from '../components/Components/RegText';
import { CurrencyEnum, CurrencyNameEnum } from '../app/AppState';

// test suite
describe('Component Components - test', () => {
  // CurrencyAmount tests
  test('CurrencyAmount - High Privacy - should display privacy placeholder', () => {
    render(
      <CurrencyAmount
        price={2.9826}
        amtZec={1.00098}
        style={{}}
        currency={CurrencyEnum.USDCurrency}
        privacy={true}
      />,
    );
    expect(screen.getByText('$ -.--')).toBeTruthy();
  });

  test('CurrencyAmount - price undefined should display placeholder', () => {
    render(
      <CurrencyAmount
        amtZec={1}
        style={{}}
        currency={CurrencyEnum.USDCurrency}
      />,
    );
    expect(screen.getByText('$ -.--')).toBeTruthy();
  });

  test('CurrencyAmount - price 0 should display placeholder', () => {
    render(
      <CurrencyAmount
        price={0}
        amtZec={1}
        style={{}}
        currency={CurrencyEnum.USDCurrency}
      />,
    );
    expect(screen.getByText('$ -.--')).toBeTruthy();
  });

  test('CurrencyAmount - amtZec undefined should display placeholder', () => {
    render(
      <CurrencyAmount
        price={1}
        style={{}}
        currency={CurrencyEnum.USDCurrency}
      />,
    );
    expect(screen.getByText('$ -.--')).toBeTruthy();
  });

  test('CurrencyAmount - very small amount should display < 0.01', () => {
    render(
      <CurrencyAmount
        price={0.001}
        amtZec={1}
        style={{}}
        currency={CurrencyEnum.USDCurrency}
      />,
    );
    expect(screen.getByText('$ < 0.01')).toBeTruthy();
  });

  test('CurrencyAmount - valid amount should display calculated value', () => {
    render(
      <CurrencyAmount
        price={2.9826}
        amtZec={1.00098}
        style={{}}
        currency={CurrencyEnum.USDCurrency}
      />,
    );
    expect(screen.getByText('$ 2.99')).toBeTruthy();
  });

  // ZecAmount tests
  test('ZecAmount - High Privacy should display privacy placeholder', () => {
    render(
      <ZecAmount
        amtZec={-1.123456789}
        currencyName={CurrencyNameEnum.ZEC}
        privacy={true}
      />,
    );
    expect(screen.getByText('-.-----')).toBeTruthy();
  });

  test('ZecAmount - no props should display placeholder', () => {
    render(<ZecAmount currencyName={CurrencyNameEnum.ZEC} />);
    expect(screen.getByText('--')).toBeTruthy();
  });

  test('ZecAmount - zero amount should display formatted zero', () => {
    render(<ZecAmount amtZec={0} currencyName={CurrencyNameEnum.ZEC} />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  test('ZecAmount - negative amount should display formatted value', () => {
    render(
      <ZecAmount amtZec={-1.123456789} currencyName={CurrencyNameEnum.ZEC} />,
    );
    expect(screen.getByText('-1.12346')).toBeTruthy();
  });

  test('ZecAmount - positive amount should display formatted value', () => {
    render(
      <ZecAmount amtZec={1.123456781} currencyName={CurrencyNameEnum.ZEC} />,
    );
    expect(screen.getByText('1.12346')).toBeTruthy();
  });

  test('ZecAmount - no currency symbol should display placeholder', () => {
    render(<ZecAmount />);
    expect(screen.getByText('--')).toBeTruthy();
  });

  // Text Component tests
  test('BoldText - should render children correctly', () => {
    render(<BoldText>bold text</BoldText>);
    expect(screen.getByText('bold text')).toBeTruthy();
  });

  test('FadeText - should render children correctly', () => {
    render(<FadeText>Fade text</FadeText>);
    expect(screen.getByText('Fade text')).toBeTruthy();
  });

  test('ErrorText - should render children correctly', () => {
    render(<ErrorText>error text</ErrorText>);
    expect(screen.getByText('error text')).toBeTruthy();
  });

  test('RegText - should render children correctly', () => {
    render(<RegText>reg text</RegText>);
    expect(screen.getByText('reg text')).toBeTruthy();
  });

  // Style prop tests
  test('BoldText - should accept style props', () => {
    const { getByText } = render(
      <BoldText style={{ backgroundColor: 'red' }}>Bold Text</BoldText>,
    );
    const element = getByText('Bold Text');
    expect(element).toBeTruthy();
    expect(element.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'red' }),
    );
  });

  test('FadeText - should accept style props', () => {
    const { getByText } = render(
      <FadeText style={{ backgroundColor: 'red' }}>Fade Text</FadeText>,
    );
    const element = getByText('Fade Text');
    expect(element).toBeTruthy();
    expect(element.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'red' }),
    );
  });

  test('ErrorText - should accept style props', () => {
    const { getByText } = render(
      <ErrorText style={{ backgroundColor: 'red' }}>Error Text</ErrorText>,
    );
    const element = getByText('Error Text');
    expect(element).toBeTruthy();
    expect(element.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'red' }),
    );
  });

  test('RegText - should accept style props', () => {
    const { getByText } = render(
      <RegText style={{ backgroundColor: 'red' }}>Reg Text</RegText>,
    );
    const element = getByText('Reg Text');
    expect(element).toBeTruthy();
    expect(element.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'red' }),
    );
  });

  test('RegText - should accept color prop', () => {
    const { getByText } = render(<RegText color={'red'}>Reg Text</RegText>);
    const element = getByText('Reg Text');
    expect(element).toBeTruthy();
    expect(element.props.style).toEqual(
      expect.objectContaining({ color: 'red' }),
    );
  });
});
