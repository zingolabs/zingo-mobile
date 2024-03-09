/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, ReactNode, useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import { TabView, TabBar, SceneRendererProps, Route, NavigationState } from 'react-native-tab-view';
import { useTheme } from '@react-navigation/native';

import SingleAddress from '../Components/SingleAddress';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import RegText from '../Components/RegText';
import { Scene } from 'react-native-tab-view/lib/typescript/src/types';

type ReceiveProps = {
  setUaAddress: (uaAddress: string) => void;
  toggleMenuDrawer: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
  setUfvkViewModalVisible?: (v: boolean) => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  setUaAddress,
  toggleMenuDrawer,
  syncingStatusMoreInfoOnClick,
  set_privacy_option,
  setUfvkViewModalVisible,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, addresses, uaAddress, mode, addLastSnackbar } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [index, setIndex] = useState(0);
  const [routes, setRoutes] = useState<{ key: string; title: string }[]>([]);

  const [displayAddress, setDisplayAddress] = useState(uaAddress);
  const [oindex, setOIndex] = useState(0);
  const [zindex, setZIndex] = useState(0);
  const [tindex, setTIndex] = useState(0);

  const uaddrs = addresses.filter(a => a.addressKind === 'u') || [];
  const zaddrs = addresses.filter(a => a.uaAddress === uaAddress && a.addressKind === 'z') || [];
  const taddrs = addresses.filter(a => a.uaAddress === uaAddress && a.addressKind === 't') || [];

  const dimensions = {
    width: Dimensions.get('screen').width,
    height: Dimensions.get('screen').height,
  };

  if (displayAddress) {
    const displayAddressIndex = uaddrs.findIndex(a => a.address === displayAddress);

    if (oindex !== displayAddressIndex && displayAddressIndex >= 0) {
      setOIndex(displayAddressIndex);
      setUaAddress(displayAddress);
    }
  }

  const prev = (type: string) => {
    setDisplayAddress('');
    if (type === 'u') {
      if (uaddrs.length === 0) {
        return;
      }
      let newIndex = oindex - 1;
      if (newIndex < 0) {
        newIndex = uaddrs.length - 1;
      }
      setOIndex(newIndex);
      setUaAddress(uaddrs[newIndex].address);
    } else if (type === 'z') {
      if (zaddrs.length === 0) {
        return;
      }
      let newIndex = zindex - 1;
      if (newIndex < 0) {
        newIndex = zaddrs.length - 1;
      }
      setZIndex(newIndex);
    } else if (type === 't') {
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

  const next = (type: string) => {
    setDisplayAddress('');
    if (type === 'u') {
      if (uaddrs.length === 0) {
        return;
      }
      const newIndex = (oindex + 1) % uaddrs.length;
      setOIndex(newIndex);
      setUaAddress(uaddrs[newIndex].address);
    } else if (type === 'z') {
      if (zaddrs.length === 0) {
        return;
      }
      const newIndex = (zindex + 1) % zaddrs.length;
      setZIndex(newIndex);
    } else if (type === 't') {
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
    setRoutes(mode === 'basic' ? basicModeRoutes : advancedModeRoutes);
  }, [mode, translate]);

  const renderScene: (
    props: SceneRendererProps & {
      route: Route;
    },
  ) => ReactNode = ({ route }) => {
    switch (route.key) {
      case 'uaddr': {
        let uaddr = translate('receive.noaddress') as string;
        let uaddrKind = '';
        //let receivers = '';
        if (uaddrs.length > 0) {
          uaddr = uaddrs[oindex].address;
          uaddrKind = uaddrs[oindex].addressKind;
          //receivers = uaddrs[oindex].receivers;
        }

        return (
          !!addresses &&
          !!uaAddress && (
            <SingleAddress
              address={uaddr}
              addressKind={uaddrKind}
              index={oindex}
              total={uaddrs.length}
              prev={() => {
                prev('u');
              }}
              next={() => {
                next('u');
              }}
            />
          )
        );
      }
      case 'zaddr': {
        let zaddr = translate('receive.noaddress') as string;
        let zaddrKind = '';
        if (zaddrs.length > 0) {
          zaddr = zaddrs[zindex].address;
          zaddrKind = zaddrs[zindex].addressKind;
        }

        return (
          !!addresses &&
          !!uaAddress && (
            <SingleAddress
              address={zaddr}
              addressKind={zaddrKind}
              index={zindex}
              total={zaddrs.length}
              prev={() => {
                prev('z');
              }}
              next={() => {
                next('z');
              }}
            />
          )
        );
      }
      case 'taddr': {
        let taddr = translate('receive.noaddress') as string;
        let taddrKind = '';
        if (taddrs.length > 0) {
          taddr = taddrs[tindex].address;
          taddrKind = taddrs[tindex].addressKind;
        }

        return (
          !!addresses &&
          !!uaAddress && (
            <SingleAddress
              address={taddr}
              addressKind={taddrKind}
              index={tindex}
              total={taddrs.length}
              prev={() => {
                prev('t');
              }}
              next={() => {
                next('t');
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
  ) => ReactNode = ({ route, focused, color }) => (
    <View style={{ width: (dimensions.width - 20) / (mode === 'basic' ? 1 : 3), alignItems: 'center' }}>
      <RegText
        style={{
          fontWeight: mode === 'basic' ? 'normal' : focused ? 'bold' : 'normal',
          fontSize: mode === 'basic' ? 14 : focused ? 15 : 14,
          color: color,
        }}>
        {route.title ? route.title : ''}
      </RegText>
      {route.key === 'uaddr' && (
        <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. zingo)</RegText>
      )}
      {route.key === 'zaddr' && (
        <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. ledger, old wallets)</RegText>
      )}
      {route.key === 'taddr' && (
        <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. coinbase, gemini)</RegText>
      )}
    </View>
  );

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
          set_privacy_option={set_privacy_option}
          setUfvkViewModalVisible={setUfvkViewModalVisible}
          addLastSnackbar={addLastSnackbar}
        />

        <TabBar
          {...props}
          indicatorStyle={{ backgroundColor: colors.primary }}
          style={{ backgroundColor: colors.background }}
          renderLabel={renderLabelCustom}
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
