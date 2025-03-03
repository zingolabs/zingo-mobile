/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Button from '../components/Components/Button';
import { ButtonTypeEnum } from '../app/AppState';

// test suite
describe('Component Button - test', () => {
  //snapshot test
  const onPress = jest.fn();
  test('Button Primary - snapshot', () => {
    const button = render(
      <Button type={ButtonTypeEnum.Primary} title={'Primary button'} disabled={false} onPress={onPress} style={{}} />,
    );
    expect(button.toJSON()).toMatchSnapshot();
  });

  test('Button Secondary - snapshot', () => {
    const button = render(
      <Button
        type={ButtonTypeEnum.Secondary}
        title={'Secondary button'}
        disabled={false}
        onPress={onPress}
        style={{}}
      />,
    );
    expect(button.toJSON()).toMatchSnapshot();
  });
});
