/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import MessagesAll from '../components/Messages/MessagesAll';
import { RouteEnum } from '../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.MessagesAll
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.MessagesAll,
      params: undefined,
    },
  };
}

describe('MessagesAll - snapshot', () => {
  test('MessagesAll renders (currently returns null)', () => {
    expect(render(<MessagesAll {...makeProps()} />).toJSON()).toMatchSnapshot();
  });
});
