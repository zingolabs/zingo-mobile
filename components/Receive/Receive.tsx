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
import { Scene } from 'react-native-tab-view/lib/typescript/src/types';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';

import { AddressClass, AddressKindEnum, ModeEnum } from '../../app/AppState';

type ReceiveProps = {
  setUaAddress: (uaAddress: string) => void;
  toggleMenuDrawer: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  setPrivacyOption: (value: boolean) => Promise<void>;
  setUfvkViewModalVisible?: (v: boolean) => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  setUaAddress,
  toggleMenuDrawer,
  syncingStatusMoreInfoOnClick,
  setPrivacyOption,
  setUfvkViewModalVisible,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addresses, uaAddress, mode, addLastSnackbar, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const [index, setIndex] = useState<number>(0);
  const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);

  const [uindex, setUIndex] = useState<number>(0);
  const [zindex, setZIndex] = useState<number>(0);
  const [tindex, setTIndex] = useState<number>(0);
  const [uaddrs, setUaddrs] = useState<AddressClass[]>([]);
  const [zaddrs, setZaddrs] = useState<AddressClass[]>([]);
  const [taddrs, setTaddrs] = useState<AddressClass[]>([]);

  const dimensions = {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  };

  useEffect(() => {
    if (addresses && addresses.length > 0 && uaAddress) {
      const uadd = addresses.filter(a => a.addressKind === AddressKindEnum.u) || [];
      const zadd = addresses.filter(a => a.uaAddress === uaAddress && a.addressKind === AddressKindEnum.z) || [];
      const tadd = addresses.filter(a => a.uaAddress === uaAddress && a.addressKind === AddressKindEnum.t) || [];
      setUaddrs(uadd);
      setZaddrs(zadd);
      setTaddrs(tadd);

      const uaAddressIndex = uadd.findIndex(a => a.address === uaAddress);
      setUIndex(uaAddressIndex);
    } else if (addresses && addresses.length > 0) {
      const uadd = addresses.filter(a => a.addressKind === AddressKindEnum.u) || [];
      setUaddrs(uadd);

      setUIndex(0);
    }
  }, [addresses, uaAddress]);

  const prev = (type: AddressKindEnum) => {
    if (type === AddressKindEnum.u) {
      if (uaddrs.length === 0) {
        return;
      }
      let newIndex = uindex - 1;
      if (newIndex < 0) {
        newIndex = uaddrs.length - 1;
      }
      setUIndex(newIndex);
      setUaAddress(uaddrs[newIndex].address);
    } else if (type === AddressKindEnum.z) {
      if (zaddrs.length === 0) {
        return;
      }
      let newIndex = zindex - 1;
      if (newIndex < 0) {
        newIndex = zaddrs.length - 1;
      }
      setZIndex(newIndex);
    } else if (type === AddressKindEnum.t) {
      if (taddrs.length === 0) {
        return;
      }
      let newIndex = tindex - 1;
      if (newIndex < 0) {
        newIndex = taddrs.length - 1;
      }
      setTIndex(newIndex);
    }
  };

  const next = (type: AddressKindEnum) => {
    if (type === AddressKindEnum.u) {
      if (uaddrs.length === 0) {
        return;
      }
      const newIndex = (uindex + 1) % uaddrs.length;
      setUIndex(newIndex);
      setUaAddress(uaddrs[newIndex].address);
    } else if (type === AddressKindEnum.z) {
      if (zaddrs.length === 0) {
        return;
      }
      const newIndex = (zindex + 1) % zaddrs.length;
      setZIndex(newIndex);
    } else if (type === AddressKindEnum.t) {
      if (taddrs.length === 0) {
        return;
      }
      const newIndex = (tindex + 1) % taddrs.length;
      setTIndex(newIndex);
    }
  };

  useEffect(() => {
    const basicModeRoutes = [{ key: 'uaddr', title: translate('receive.u-title') as string }];
    const advancedModeRoutes = [
      { key: 'uaddr', title: translate('receive.u-title') as string },
      { key: 'zaddr', title: translate('receive.z-title') as string },
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
        let uaddr = translate('receive.noaddress') as string;
        if (uaddrs.length > 0) {
          uaddr = uaddrs[uindex].address;
        }

        return (
          !!addresses &&
          !!uaAddress && (
            <SingleAddress
              address={uaddr}
              index={uindex}
              total={uaddrs.length}
              prev={() => {
                prev(AddressKindEnum.u);
              }}
              next={() => {
                next(AddressKindEnum.u);
              }}
            />
          )
        );
      }
      case 'zaddr': {
        let zaddr = translate('receive.noaddress') as string;
        if (zaddrs.length > 0) {
          zaddr = zaddrs[zindex].address;
        }

        return (
          !!addresses &&
          !!uaAddress && (
            <SingleAddress
              address={zaddr}
              index={zindex}
              total={zaddrs.length}
              prev={() => {
                prev(AddressKindEnum.z);
              }}
              next={() => {
                next(AddressKindEnum.z);
              }}
            />
          )
        );
      }
      case 'taddr': {
        let taddr = translate('receive.noaddress') as string;
        if (taddrs.length > 0) {
          taddr = taddrs[tindex].address;
        }

        return (
          !!addresses &&
          !!uaAddress && (
            <SingleAddress
              address={taddr}
              index={tindex}
              total={taddrs.length}
              prev={() => {
                prev(AddressKindEnum.t);
              }}
              next={() => {
                next(AddressKindEnum.t);
              }}
            />
          )
        );
      }
    }
  };

  const renderLabelCustom: (
    scene: Scene<Route> & {
      focused: boolean;
      color: string;
    },
  ) => ReactNode = ({ route, focused, color }) => {
    const w = (dimensions.width - 50) / (mode === ModeEnum.basic ? 1 : 3);
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
          toggleMenuDrawer={toggleMenuDrawer}
          syncingStatusMoreInfoOnClick={syncingStatusMoreInfoOnClick}
          title={translate('receive.title') as string}
          noBalance={true}
          setPrivacyOption={setPrivacyOption}
          setUfvkViewModalVisible={setUfvkViewModalVisible}
          addLastSnackbar={addLastSnackbar}
        />

        <TabBar
          {...props}
          indicatorStyle={{ backgroundColor: colors.primary }}
          style={{ backgroundColor: colors.background }}
          renderLabel={renderLabelCustom}
          renderTabBarItem={p => <TabBarItem {...p} key={p.route.key} />}
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
