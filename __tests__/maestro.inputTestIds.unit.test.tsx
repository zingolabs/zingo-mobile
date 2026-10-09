/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import Send from '@screens/Send';
import ImportUfvk from '@screens/ImportUfvk';
import Server from '@screens/Server';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { ChainNameEnum, RouteEnum, SelectServerEnum } from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockSendPageState from '../__mocks__/dataMocks/mockSendPageState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';

/**
 * The accessibility label of the nearest host ancestor that is an
 * accessibility element, which on iOS swallows the test IDs of everything
 * beneath it. Composite instances carry their host's props and are skipped.
 */
function accessibleAncestor(element: ReactTestInstance): string | undefined {
  let ancestor = element.parent;
  while (ancestor) {
    if (
      typeof ancestor.type === 'string' &&
      ancestor.props.accessible === true
    ) {
      return String(ancestor.props.accessibilityLabel ?? ancestor.type);
    }
    ancestor = ancestor.parent;
  }
  return undefined;
}

function drawerProps<R extends RouteEnum.Send | RouteEnum.Settings>(
  name: R,
): NativeStackScreenProps<AppDrawerParamList, R> {
  return {
    navigation: mockNavigation,
    route: { key: 'Key-1', name, params: undefined },
  } as unknown as NativeStackScreenProps<AppDrawerParamList, R>;
}

function loadedState() {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  return state;
}

/**
 * Tests that every text field a Maestro flow types into is its own
 * accessibility element when the screen renders. XCUITest exposes a test
 * ID only on an accessibility element, and a `TextInput` under a
 * `<View accessible>` is invisible to the iOS driver.
 */
describe('Maestro reaches each typed field on iOS', () => {
  const onFunction = jest.fn();

  test('the Send address and memo fields', () => {
    const state = loadedState();
    state.valueTransfers = mockValueTransfers;
    state.addresses = mockAddresses;
    state.zecPrice = mockZecPrice;
    state.sendPageState = mockSendPageState;
    const send = render(
      <ContextAppLoadedProvider value={state}>
        <Send {...drawerProps(RouteEnum.Send)} />
      </ContextAppLoadedProvider>,
    );
    for (const id of [
      'send.addressplaceholder',
      'send.address.clear',
      'send.memo-field',
    ]) {
      expect(accessibleAncestor(send.getByTestId(id))).toBeUndefined();
    }
  });

  test('the restore seed and birthday fields', () => {
    const importUfvk = render(
      <ContextAppLoadedProvider value={loadedState()}>
        <ImportUfvk
          busy={false}
          onClickCancel={onFunction}
          onClickOK={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    for (const id of ['import.seedufvkinput', 'import.birthdayinput']) {
      expect(accessibleAncestor(importUfvk.getByTestId(id))).toBeUndefined();
    }
  });

  test('the custom server host, port and buttons', () => {
    const server = render(
      <Server
        translate={mockTranslate}
        server={remoteServer(
          'https://node.myhome.net:9067',
          ChainNameEnum.mainChainName,
        )}
        selectServer={SelectServerEnum.custom}
        status="ok"
        blockHeight="1"
        busy={false}
        online={true}
        recommended={[]}
        latencies={{}}
        onAuto={onFunction}
        onPick={onFunction}
        onSaveCustom={async () => true}
        onOffline={onFunction}
        onOther={onFunction}
        onProbe={onFunction}
        onUnreachable={onFunction}
        onBack={onFunction}
      />,
    );
    for (const id of [
      'server.custom.host',
      'server.custom.port',
      'server.custom.test',
      'server.custom.save',
      'server.custom.log.final.ok',
      'server.other',
      'server.custom',
    ]) {
      expect(accessibleAncestor(server.getByTestId(id))).toBeUndefined();
    }
  });
});
