/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';

import Menu from '../components/Drawer/components/Menu';
import { MenuItemEnum, ModeEnum, ScreenEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';

describe('Menu - snapshots', () => {
  const onFn = jest.fn();

  test('Menu advanced mode, online', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    state.mode = ModeEnum.advanced;
    state.netInfo = mockNetInfo;
    state.security = mockSecurity;
    state.rescanMenu = true;
    state.valueTransfersTotal = 5;

    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <Menu
            onItemSelected={(item: MenuItemEnum) => onFn(item)}
            screenName={ScreenEnum.LoadedApp}
            toggleMenuDrawer={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('Menu basic mode, no value transfers', () => {
    const state = { ...defaultAppContextLoaded };
    state.translate = mockTranslate;
    state.mode = ModeEnum.basic;
    state.netInfo = mockNetInfo;
    state.security = mockSecurity;
    state.valueTransfersTotal = 0;
    state.readOnly = false;

    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <Menu
            onItemSelected={(item: MenuItemEnum) => onFn(item)}
            screenName={ScreenEnum.LoadedApp}
            toggleMenuDrawer={onFn}
          />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
