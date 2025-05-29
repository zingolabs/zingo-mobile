/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, ReactNode, useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import { TabView, TabBar, SceneRendererProps, Route, NavigationState, TabBarItem } from 'react-native-tab-view';
import { useTheme } from '@react-navigation/native';

import SingleAddress from '../Components/SingleAddress';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import RegText from '../Components/RegText';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { AddressKindEnum, ModeEnum, SecurityType, UnifiedAddressClass, TransparentAddressClass } from '../../app/AppState';
import { RPCAddressScopeEnum } from '../../app/rpc/enums/RPCAddressScopeEnum';

type ReceiveProps = {
  toggleMenuDrawer: () => void;
  alone: boolean;
  setSecurityOption: (s: SecurityType) => Promise<void>;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  // side menu
  toggleMenuDrawer,
  // balance
  // privacy
  // shielding
  // for receive
  alone,
  setSecurityOption,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addresses, defaultUnifiedAddress, mode, language } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  const [index, setIndex] = useState<number>(0);
  const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);

  const [uAddr, setUAddr] = useState<UnifiedAddressClass[]>([]);
  const [tAddr, setTAddr] = useState<TransparentAddressClass[]>([]);
  const [uAddrIndex, setUAddrIndex] = useState<number | null>(null);
  const [tAddrIndex, setTAddrIndex] = useState<number | null>(null);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      // we offering now two types:
      // 1. UA
      // 2. T
      const uAdd =
        addresses.filter((a: UnifiedAddressClass | TransparentAddressClass) => a.addressKind === AddressKindEnum.u) || [];
      const tAdd =
        addresses.filter((a: UnifiedAddressClass | TransparentAddressClass) => a.addressKind === AddressKindEnum.t) || [];
      setUAddr(uAdd as UnifiedAddressClass[]);
      setTAddr(tAdd as TransparentAddressClass[]);
      setUAddrIndex(uAdd.length - 1);
      setTAddrIndex(tAdd.length - 1);
    }
  }, [addresses]);

  useEffect(() => {
    const basicModeRoutes = [{ key: 'uaddr', title: translate('receive.u-title') as string }];
    const advancedModeRoutes = [
      { key: 'uaddr', title: translate('receive.u-title') as string },
      { key: 'taddr', title: translate('receive.t-title') as string },
    ];
    setRoutes(mode === ModeEnum.basic ? basicModeRoutes : advancedModeRoutes);
  }, [mode, translate]);

  const renderScene: (
    props: SceneRendererProps & {
      route: Route;
    },
  ) => ReactNode = ({ route }) => {
    switch (route.key) {
      case 'uaddr': {
        let uAddress = new UnifiedAddressClass(0, translate('receive.noaddress') as string, AddressKindEnum.u, false, false, false) as UnifiedAddressClass & TransparentAddressClass;
        if (uAddrIndex !== null) {
          uAddress = uAddr[uAddrIndex] as UnifiedAddressClass & TransparentAddressClass;
        }

        return (
          <>
            {!!addresses && !!defaultUnifiedAddress && (
              <>
                <SingleAddress
                  address={uAddress}
                  index={uAddrIndex ? uAddrIndex : 0}
                  total={uAddr.length}
                  prev={() => {
                    if (uAddrIndex !== null && uAddrIndex > 0) {
                      setUAddrIndex(uAddrIndex - 1);
                    }
                  }}
                  next={() => {
                    if (uAddrIndex !== null && uAddrIndex < uAddr.length - 1) {
                      setUAddrIndex(uAddrIndex + 1);
                    }
                  }}
                  setSecurityOption={setSecurityOption}
                />
              </>
            )}
          </>
        );
      }
      case 'taddr': {
        let tAddress = new TransparentAddressClass(0, translate('receive.noaddress') as string, AddressKindEnum.t, RPCAddressScopeEnum.external) as UnifiedAddressClass & TransparentAddressClass;
        if (tAddrIndex !== null) {
          tAddress = tAddr[tAddrIndex] as UnifiedAddressClass & TransparentAddressClass;
        }

        return (
          <>
            {!!addresses && !!defaultUnifiedAddress && (
              <>
                <SingleAddress
                  address={tAddress}
                  index={tAddrIndex ? tAddrIndex : 0}
                  total={tAddr.length}
                  prev={() => {
                    if (tAddrIndex !== null && tAddrIndex > 0) {
                      setTAddrIndex(tAddrIndex - 1);
                    }
                  }}
                  next={() => {
                    if (tAddrIndex !== null && tAddrIndex < tAddr.length - 1) {
                      setTAddrIndex(tAddrIndex + 1);
                    }
                  }}
                  setSecurityOption={setSecurityOption}
                />
              </>
            )}
          </>
        );
      }
    }
  };

  const renderLabelCustom: ({ route, focused, color }: {route: any, focused: any, color: any }) => ReactNode = ({ route, focused, color }) => {
    const w = (dimensions.width - 50) / (mode === ModeEnum.basic ? 1 : 2);
    //const w = route.key === 'uaddr' ? '40%' : '30%';
    return (
      <View
        style={{
          width: w,
          alignItems: 'center',
          justifyContent: 'center',
          height: 50,
        }}>
        <RegText
          style={{
            fontWeight: mode === ModeEnum.basic ? 'normal' : focused ? 'bold' : 'normal',
            fontSize: mode === ModeEnum.basic ? 14 : focused ? 15 : 14,
            color: color,
          }}>
          {route.title ? route.title : ''}
        </RegText>
        {route.key === 'uaddr' && mode === ModeEnum.basic && (
          <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. zingo)</RegText>
        )}
        {route.key === 'zaddr' && mode === ModeEnum.basic && (
          <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>
            (e.g. ledger, old wallets)
          </RegText>
        )}
        {route.key === 'taddr' && mode === ModeEnum.basic && (
          <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. coinbase, gemini)</RegText>
        )}
      </View>
    );
  };

  const renderTabBarPage: (
    props: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    },
  ) => ReactNode = props => {
    return (
      <View
        accessible={true}
        accessibilityLabel={translate('receive.title-acc') as string}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}>
        <Header
          title={
            alone
              ? (translate('receive.title-basic-alone') as string)
              : mode === ModeEnum.basic
              ? (translate('receive.title-basic') as string)
              : (translate('receive.title-advanced') as string)
          }
          toggleMenuDrawer={toggleMenuDrawer}
          noBalance={true}
          noPrivacy={true}
        />

        <TabBar
          {...props}
          indicatorStyle={{ backgroundColor: colors.primary }}
          style={{ backgroundColor: colors.background }}
          renderTabBarItem={p => <TabBarItem {...p} key={p.route.key} label={renderLabelCustom} />}
        />
      </View>
    );
  };

  const returnPage = (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBarPage}
      onIndexChange={setIndex}
    />
  );

  //console.log('render Receive - 4');

  return returnPage;
};

export default Receive;
