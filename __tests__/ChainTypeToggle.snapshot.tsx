/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import ChainTypeToggle from '../components/Components/ChainTypeToggle';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));

// test suite
describe('Component ChainTypeToggle - test', () => {
  //snapshot test
  test('ChainTypeToggle - snapshot', () => {
    const onPress = jest.fn();
    const translate = () => 'text translated';
    const about = render(<ChainTypeToggle customServerChainName="main" onPress={onPress} translate={translate} />);
    expect(about.toJSON()).toMatchSnapshot();
  });
});
