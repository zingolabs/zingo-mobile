/**
 * @format
 */

import 'react-native';
import React from 'react';
import { shallow, configure } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';

import SettingsModal from '../components/SettingsModal';

configure({ adapter: new Adapter() });

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.useFakeTimers();

// test suite
describe('Component SettingsModal - test', () => {
  //unit test
  test('SettingsModal - Toggle onPress is working', () => {
    const onPress = jest.fn();
    const settingsModal = shallow(
      <SettingsModal closeModal={() => {}} wallet_settings={{}} set_wallet_option={onPress} />,
    );

    settingsModal.find('ForwardRef').forEach(ref => {
      ref.props().onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(3);
  });
});
