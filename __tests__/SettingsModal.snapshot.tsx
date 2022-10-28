/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import SettingsModal from '../components/SettingsModal';

jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.useFakeTimers();

// test suite
describe('Component SettingsModal - test', () => {
  //snapshot test
  test('SettingsModal - snapshot', () => {
    const settingsModal = create(
      <SettingsModal
        closeModal={() => {}}
        wallet_settings={{ download_memos: 'wallet' }}
        set_wallet_option={() => {}}
      />,
    );
    expect(settingsModal.toJSON()).toMatchSnapshot();
  });
});
