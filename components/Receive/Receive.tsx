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

import { AddressClass, AddressKindEnum, ModeEnum, ReceiverEnum, SecurityType } from '../../app/AppState';
import { ShieldedEnum } from '../../app/AppState/enums/ShieldedEnum';

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
  const { translate, addresses, uOrchardAddress, mode, language } = context;
  const { colors } = useTheme()  as ThemeType;
  moment.locale(language);

  const [index, setIndex] = useState<number>(0);
  const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);

  const [uOrcharSaplingdAddr, setUOrcharSaplingdAddr] = useState<AddressClass>({} as AddressClass);
  const [uOrchardAddr, setUOrchardAddr] = useState<AddressClass>({} as AddressClass);
  const [zAddr, setZAddr] = useState<AddressClass>({} as AddressClass);
  const [tAddr, setTAddr] = useState<AddressClass>({} as AddressClass);
  const [shielded, setShielded] = useState<ShieldedEnum>(ShieldedEnum.uOrchard);

  const dimensions = {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  };

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      // we offering now three options for Shielded:
      // 1. orchard UA
      // 2. orchard+sapling UA
      // 3. z-sapling
      const uOrchardSaplingAdd =
        addresses.filter(
          a =>
            a.addressKind === AddressKindEnum.u &&
            a.receivers.length === 2 &&
            a.receivers.includes(ReceiverEnum.o) &&
            a.receivers.includes(ReceiverEnum.z),
        ) || [];
      const uOrchardAdd =
        addresses.filter(
          a => a.addressKind === AddressKindEnum.u && a.receivers.length === 1 && a.receivers === ReceiverEnum.o,
        ) || [];
      const zAdd = addresses.filter(a => a.addressKind === AddressKindEnum.z) || [];
      const tAdd = addresses.filter(a => a.addressKind === AddressKindEnum.t) || [];
      setUOrcharSaplingdAddr(uOrchardSaplingAdd[0]);
      setUOrchardAddr(uOrchardAdd[0]);
      setZAddr(zAdd[0]);
      setTAddr(tAdd[0]);
    }
  }, [addresses]);

  useEffect(() => {
    const basicModeRoutes = [{ key: 'uorchardaddr', title: translate('receive.u-title') as string }];
    const advancedModeRoutes = [
      { key: 'uorchardaddr', title: translate('receive.u-title') as string },
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
      case 'uorchardaddr': {
        let uOrchardSapling = translate('receive.noaddress') as string;
        if (uOrcharSaplingdAddr) {
          uOrchardSapling = uOrcharSaplingdAddr.address;
        }
        let uOrchard = translate('receive.noaddress') as string;
        if (uOrchardAddr) {
          uOrchard = uOrchardAddr.address;
        }
        let sapling = translate('receive.noaddress') as string;
        if (zAddr) {
          sapling = zAddr.address;
        }

        return (
          <>
            {!!addresses && !!uOrchardAddress && (
              <>
                {shielded === ShieldedEnum.uOrchardSapling && (
                  <SingleAddress setShielded={setShielded} shielded={shielded} address={uOrchardSapling} index={0} total={1} prev={() => {}} next={() => {}} setSecurityOption={setSecurityOption} />
                )}
                {shielded === ShieldedEnum.uOrchard && (
                  <SingleAddress setShielded={setShielded} shielded={shielded} address={uOrchard} index={0} total={1} prev={() => {}} next={() => {}} setSecurityOption={setSecurityOption} />
                )}
                {shielded === ShieldedEnum.sapling && (
                  <SingleAddress setShielded={setShielded} shielded={shielded} address={sapling} index={0} total={1} prev={() => {}} next={() => {}} setSecurityOption={setSecurityOption} />
                )}
              </>
            )}
          </>
        );
      }
      case 'taddr': {
        let taddr = translate('receive.noaddress') as string;
        if (tAddr) {
          taddr = tAddr.address;
        }

        return (
          !!addresses &&
          !!uOrchardAddress && <SingleAddress address={taddr} index={0} total={1} prev={() => {}} next={() => {}} setSecurityOption={setSecurityOption} />
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
