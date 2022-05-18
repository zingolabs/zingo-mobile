/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import SendScreen from '../components/SendScreen';

jest.mock('react-native-reanimated');
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: ''
}));
jest.useFakeTimers()

// test suite
describe("Component SendScreen - test", () => {
  //snapshot test
  beforeAll(() => {
    jest.mock("react-native-reanimated", () =>
    	jest.requireActual("../node_modules/react-native-reanimated/mock"),
    );
  })
  test("SendScreen - snapshot", () => {
    const sendScreen = create(
      <SendScreen
        info={null}
        totalBalance={0}
        sendPageState={{}}
        setSendPageState={() => {}}
        sendTransaction={() => {}}
        clearToAddrs={() => {}}
        navigation={null}
        toggleMenuDrawer={() => {}}
        setComputingModalVisible={() => {}}
        setTxBuildProgress={() => {}}
      />);
    expect(sendScreen.toJSON()).toMatchSnapshot();
  });

});
