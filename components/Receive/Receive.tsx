/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, ReactNode, useEffect } from 'react';
import { View } from 'react-native';
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
  set_privacy_option: (name: 'privacy', value: boolean) => Promise<void>;
  setUfvkViewModalVisible?: (v: boolean) => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  setUaAddress,
  toggleMenuDrawer,
  set_privacy_option,
  setUfvkViewModalVisible,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, dimensions, addresses, uaAddress, mode } = context;
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
    const expertModeRoutes = [
      { key: 'uaddr', title: translate('receive.u-title') as string },
      { key: 'zaddr', title: translate('receive.z-title') as string },
      { key: 'taddr', title: translate('receive.t-title') as string },
    ];
    setRoutes(mode === 'basic' ? basicModeRoutes : expertModeRoutes);
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
          mode &&
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
          mode &&
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
          mode &&
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
    <View style={{ width: (dimensions.width - 20) / 3, alignItems: 'center' }}>
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
        {/*<Modal
          animationType="slide"
          transparent={false}
          visible={privKeyModalVisible}
          onRequestClose={() => setPrivKeyModalVisible(false)}>
          <PrivKey
            address={address}
            keyType={keyType}
            privKey={privKey}
            closeModal={() => setPrivKeyModalVisible(false)}
          />
        </Modal>*/}

        <Header
          toggleMenuDrawer={toggleMenuDrawer}
          title={translate('receive.title') as string}
          noBalance={true}
          noSyncingStatus={true}
          set_privacy_option={set_privacy_option}
          setUfvkViewModalVisible={setUfvkViewModalVisible}
        />

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute', right: 0 }}>
          {/*<OptionsMenu
            customButton={
              <View accessible={true} accessibilityLabel={translate('menu-acc')}>
                <FontAwesomeIcon icon={faEllipsisV} color={colors.border} size={48} />
              </View>
            }
            buttonStyle={{ width: 32, height: 32, margin: 7.5, resizeMode: 'contain' }}
            destructiveIndex={4}
            options={[
              translate('receive.newu-option'),
              translate('receive.privkey-option'),
              translate('receive.viewkey-option'),
              translate('receive.import-option'),
              translate('cancel'),
            ]},
            actions={[addO, viewPrivKey, viewViewingKey]}
          />*/}
        </View>

        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

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
