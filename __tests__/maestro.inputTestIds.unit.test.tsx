/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import Send from '@screens/Send';
import Settings from '@screens/Settings';
import ImportUfvk from '@screens/ImportUfvk';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import {
  BlockExplorerEnum,
  LanguageEnum,
  RouteEnum,
  SelectServerEnum,
} from '@app/AppState';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
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

/**
 * The `accessible` prop of the bottom sheet modal that holds an element.
 * The modal is one accessibility element unless the prop is false, and on
 * iOS it then swallows the test IDs of the whole sheet.
 */
function sheetAccessible(element: ReactTestInstance): unknown {
  let ancestor = element.parent;
  while (ancestor) {
    if ('enablePanDownToClose' in ancestor.props) {
      return ancestor.props.accessible;
    }
    ancestor = ancestor.parent;
  }
  throw new Error('the element is in no bottom sheet modal');
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
        <Send
          {...drawerProps(RouteEnum.Send)}
          sendTransaction={onFunction}
          clearToAddr={onFunction}
          toggleMenuDrawer={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          setScrollToBottom={onFunction}
          setServerOption={onFunction}
        />
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

  test('the custom server field and the server options', () => {
    const state = loadedState();
    state.server = mockServer;
    state.selectServer = SelectServerEnum.custom;
    state.language = LanguageEnum.en;
    state.blockExplorer = BlockExplorerEnum.Zcashexplorer;
    const settings = render(
      <ContextAppLoadedProvider value={state}>
        <Settings
          {...drawerProps(RouteEnum.Settings)}
          setServerOption={onFunction}
          setLanguageOption={onFunction}
          setBiometricsOption={onFunction}
          setSelectServerOption={onFunction}
          setPerformanceLevelOption={onFunction}
          setBlockExplorerOption={onFunction}
          toggleMenuDrawer={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(
      accessibleAncestor(settings.getByTestId('settings.custom-server-field')),
    ).toBeUndefined();
    for (const id of [
      'settings.list-server',
      'settings.custom-server',
      'settings.custom-server-clear',
    ]) {
      const option = settings.getByTestId(id);
      expect([id, accessibleAncestor(option)]).toEqual([id, undefined]);
      expect([id, sheetAccessible(option)]).toEqual([id, false]);
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
});
