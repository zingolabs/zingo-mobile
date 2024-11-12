/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import ValueTransferDetail from '../components/History/components/ValueTransferDetail';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('moment', () => {
  // Here we are able to mock chain builder pattern
  const mMoment = {
    format: (p: string) => {
      if (p === 'MMM YYYY') {
        return 'Dec 2022';
      } else if (p === 'YYYY MMM D h:mm a') {
        return '2022 Dec 13 8:00 am';
      } else if (p === 'MMM D, h:mm a') {
        return 'Dec 13, 8:00 am';
      }
    },
  };
  // Here we are able to mock the constructor and to modify instance methods
  const fn = () => {
    return mMoment;
  };
  // Here we are able to mock moment methods that depend on moment not on a moment instance
  fn.locale = jest.fn();
  return fn;
});
jest.mock('moment/locale/es', () => () => ({
  defineLocale: jest.fn(),
}));
jest.mock('moment/locale/pt', () => () => ({
  defineLocale: jest.fn(),
}));

jest.mock('moment/locale/ru', () => () => ({
  defineLocale: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    TouchableOpacity: View,
  };
});
jest.mock('@react-native-community/netinfo', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RNCNetInfo = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});

// test suite
describe('Component History ValueTransferDetail - test', () => {
  //unit test
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.valueTransfers = mockValueTransfers;
  const onClose = jest.fn();
  const onSetOption = jest.fn();
  const onMove = jest.fn();

  test('History ValueTransferDetail - sent ValueTransfer with 2 addresses', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={0}
          length={mockValueTransfers.length}
          totalLength={mockValueTransfers.length}
          vt={mockValueTransfers[0]}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
          moveValueTransferDetail={onMove}
        />
      </ContextAppLoadedProvider>,
    ).toJSON();
    const num = screen.getAllByText('0.1234');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
    screen.getByText('hola & hello');
    const txt = screen.queryByText('hola & hello\nhello & hola');
    expect(txt).toBe(null);
  });

  test('History ValueTransferDetail - memo self sent ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={1}
          length={mockValueTransfers.length}
          totalLength={mockValueTransfers.length}
          vt={mockValueTransfers[1]}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
          moveValueTransferDetail={onMove}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0000');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
    screen.getByText('orchard memo\nsapling memo');
  });

  test('History ValueTransferDetail - self sent ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={2}
          length={mockValueTransfers.length}
          totalLength={mockValueTransfers.length}
          vt={mockValueTransfers[2]}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
          moveValueTransferDetail={onMove}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0000');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
  });

  test('History ValueTransferDetail - received ValueTransfer with 2 pools', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={3}
          length={mockValueTransfers.length}
          totalLength={mockValueTransfers.length}
          vt={mockValueTransfers[3]}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
          moveValueTransferDetail={onMove}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.7765');
    expect(num.length).toBe(2);
    screen.getByText('hola & hello');
    const txt = screen.queryByText('hola & hello\nhello & hola');
    expect(txt).toBe(null);
  });

  test('History ValueTransferDetail - shield ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={4}
          length={mockValueTransfers.length}
          totalLength={mockValueTransfers.length}
          vt={mockValueTransfers[4]}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
          moveValueTransferDetail={onMove}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0009');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
  });

  test('History ValueTransferDetail - Rejection ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={4}
          length={mockValueTransfers.length}
          totalLength={mockValueTransfers.length}
          vt={mockValueTransfers[5]}
          closeModal={onClose}
          openModal={onClose}
          setPrivacyOption={onSetOption}
          setSendPageState={onClose}
          moveValueTransferDetail={onMove}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0009');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
  });
});
