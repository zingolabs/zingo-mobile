/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import DetailLine from '../components/Components/DetailLine';
import RegText from '../components/Components/RegText';
import { ScreenEnum } from '../app/AppState';

// test suite
describe('Component DetailLine - test', () => {
  //snapshot test
  test('DetailLine value - snapshot', () => {
    const detail = render(
      <DetailLine label="label" value="value" screenName={ScreenEnum.About} />,
    );
    expect(detail.toJSON()).toMatchSnapshot();
  });
  test('DetailLine children - snapshot', () => {
    const children = <RegText>{'Hello'}</RegText>;
    const detail = render(
      <DetailLine
        label="label"
        children={children}
        screenName={ScreenEnum.About}
      />,
    );
    expect(detail.toJSON()).toMatchSnapshot();
  });
});
