/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import ChainTypeToggle from '../components/Components/ChainTypeToggle';
import { ChainNameEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTheme } from '../__mocks__/dataMocks/mockTheme';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useTheme: () => (mockTheme),
}));

// test suite
describe('Component ChainTypeToggle - test', () => {
  //snapshot test
  test('ChainTypeToggle - snapshot', () => {
    const onPress = jest.fn();
    const translate = mockTranslate;
    const chain = render(
      <ChainTypeToggle customServerChainName={ChainNameEnum.mainChainName} onPress={onPress} translate={translate} />,
    );
    expect(chain.toJSON()).toMatchSnapshot();
  });
});
