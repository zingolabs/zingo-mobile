/* eslint-disable react-native/no-inline-styles */
import React, { useState, useContext, ReactNode } from 'react';
import { View, Image, Modal, TouchableOpacity } from 'react-native';
import { TabView, TabBar, SceneRendererProps, NavigationState, Route } from 'react-native-tab-view';
import Toast from 'react-native-simple-toast';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import OptionsMenu from 'react-native-option-menu';

import ZecAmount from '../Components/ZecAmount';
import CurrencyAmount from '../Components/CurrencyAmount';
import RegText from '../Components/RegText';
import Utils from '../../app/utils';
import RPC from '../../app/rpc';
import PrivKey from '../PrivKey';
import ImportKey from '../ImportKey';
import SingleAddress from './components/SingleAddress';
import { ThemeType } from '../../app/types';
import { ContextLoaded } from '../../app/context';

type LegacyProps = {
  fetchTotalBalance: () => void;
  toggleMenuDrawer: () => void;
  startRescan: () => void;
};

const Legacy: React.FunctionComponent<LegacyProps> = ({ fetchTotalBalance, toggleMenuDrawer, startRescan }) => {
  const context = useContext(ContextLoaded);
  const { translate, dimensions, info, addresses, totalBalance, uaAddress, currency, zecPrice } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'zaddr', title: translate('legacy.z-title') },
    { key: 'taddr', title: translate('legacy.t-title') },
  ]);

  const [displayAddress, setDisplayAddress] = useState('');
  const [zindex, setZIndex] = useState(0);
  const [tindex, setTIndex] = useState(0);

  const zaddrs = addresses.filter(a => a.uaAddress === uaAddress && a.addressKind === 'z') || [];
  const taddrs = addresses.filter(a => a.uaAddress === uaAddress && a.addressKind === 't') || [];

  if (displayAddress) {
    let displayAddressIndex = zaddrs.findIndex(a => a.address === displayAddress);

    if (zindex !== displayAddressIndex && displayAddressIndex >= 0) {
      setZIndex(displayAddressIndex);
    }

    displayAddressIndex = taddrs.findIndex(a => a.address === displayAddress);

    if (tindex !== displayAddressIndex && displayAddressIndex >= 0) {
      setTIndex(displayAddressIndex);
    }
  }

  const prev = (type: string) => {
    setDisplayAddress('');

    if (type === 'z') {
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
    if (type === 'z') {
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

  const addZ = async () => {
    //console.log('New Z');
    //const newAddress = await RPC.rpc_createNewAddress('z');
    //if (newAddress && !newAddress.startsWith('Error')) {
    await fetchTotalBalance();
    //  setIndex(0);
    //  if (newAddress) {
    //    setDisplayAddress(newAddress);
    //  }
    //} else {
    //  if (newAddress) {
    Toast.show('Error: ' + translate('workingonit'), Toast.LONG);
    return;
    //  }
    //}
    //return;
  };
  /*
  const addT = async () => {
    //console.log('New T');
    const newAddress = await RPC.rpc_createNewAddress('t');
    if (newAddress && !newAddress.startsWith('Error')) {
      await fetchTotalBalance();
      setIndex(1);
      if (newAddress) {
        setDisplayAddress(newAddress);
      }
    } else {
      if (newAddress) {
        Toast.show(newAddress + translate('workingonit'), Toast.LONG);
        return;
      }
    }
    return;
  };
  */
  const [privKeyModalVisible, setPrivKeyModalVisible] = useState(false);
  const [keyType, setKeyType] = useState(0);
  const [privKey, setPrivKey] = useState('');

  const viewPrivKey = async () => {
    if (index === 0 && zaddrs.length === 0) {
      Toast.show(translate('legacy.znoprivkey-error'), Toast.LONG);
      return;
    }
    if (index === 1 && taddrs.length === 0) {
      Toast.show(translate('legacy.tnoprivkey-error'), Toast.LONG);
      return;
    }

    const address = index === 0 ? zaddrs[zindex].address : taddrs[tindex].address;
    const k = await RPC.rpc_getPrivKeyAsString(address);

    if (k && !k.startsWith('Error')) {
      setKeyType(0);
      setPrivKeyModalVisible(true);
      if (k) {
        setPrivKey(k);
      }
    } else {
      if (k) {
        Toast.show(k, Toast.LONG);
        return;
      }
    }
    return;
  };

  const viewViewingKey = async () => {
    if (index === 1) {
      // No viewing key for T address
      Toast.show(translate('legacy.tnohaveviewkey'), Toast.LONG);
      return;
    }
    if (index === 0 && zaddrs.length === 0) {
      Toast.show(translate('legacy.znoviewkey'), Toast.LONG);
      return;
    }

    const address = index === 0 ? zaddrs[zindex].address : taddrs[tindex].address;
    const k = await RPC.rpc_getViewKeyAsString(address);

    if (k && !k.startsWith('Error')) {
      setKeyType(1);
      setPrivKeyModalVisible(true);
      if (k) {
        setPrivKey(k);
      }
    } else {
      if (k) {
        Toast.show(k, Toast.LONG);
        return;
      }
    }
    return;
  };

  const [importKeyModalVisible, setImportKeyModalVisible] = useState(false);

  const doImport = async (key: string, birthday: string) => {
    if (isNaN(parseInt(birthday, 10))) {
      setTimeout(() => {
        Toast.show(`${translate('rpc.parsebirthday-error')} ${birthday}`, Toast.LONG);
      }, 1000);
      return;
    }
    const addressList = await RPC.rpc_doImportPrivKey(key, birthday);
    //console.log(addressList);

    if (typeof addressList === 'string' && addressList.startsWith('Error')) {
      // Show the toast in settimeout, because it sometimes gets lost.
      setTimeout(() => {
        Toast.show(addressList, Toast.LONG);
      }, 1000);
      return;
    }

    if (addressList && typeof addressList === 'string' && addressList.length > 0) {
      const address = JSON.parse(addressList)[0];
      // Show the toast in settimeout, because it sometimes gets lost.
      setTimeout(() => {
        Toast.show(`Importing ${Utils.trimToSmall(address)}`, Toast.LONG);
      }, 1000);
    }

    startRescan();
  };

  let address = '';

  if (index === 0 && zaddrs.length > 0) {
    address = zaddrs[zindex].address;
  } else if (index === 1 && taddrs.length > 0) {
    address = taddrs[tindex].address;
  }

  const renderScene: (
    props: SceneRendererProps & {
      route: Route;
    },
  ) => ReactNode = ({ route }) => {
    switch (route.key) {
      case 'zaddr': {
        let zaddr = translate('legacy.noaddress');
        let zaddrKind = '';
        if (zaddrs.length > 0) {
          zaddr = zaddrs[zindex].address;
          zaddrKind = zaddrs[zindex].addressKind;
        }

        return (
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
        );
      }
      case 'taddr': {
        let taddr = translate('legacy.noaddress');
        let taddrKind = '';
        if (taddrs.length > 0) {
          taddr = taddrs[tindex].address;
          taddrKind = taddrs[tindex].addressKind;
        }

        return (
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
        );
      }
    }
  };

  const renderTabBarPortrait: (
    props: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    },
  ) => ReactNode = props => {
    return (
      <View
        accessible={true}
        accessibilityLabel={translate('legacy.title-acc')}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
        }}>
        <Modal
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
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={importKeyModalVisible}
          onRequestClose={() => setImportKeyModalVisible(false)}>
          <ImportKey doImport={doImport} closeModal={() => setImportKeyModalVisible(false)} />
        </Modal>

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            backgroundColor: colors.card,
            padding: 10,
            paddingBottom: 0,
            margin: 0,
          }}>
          <View
            style={{
              display: 'flex',
              alignItems: 'center',
              paddingBottom: 0,
              backgroundColor: colors.card,
              zIndex: -1,
              paddingTop: 0,
            }}>
            <Image
              source={require('../../assets/img/logobig-zingo.png')}
              style={{ width: 80, height: 80, resizeMode: 'contain' }}
            />
            <ZecAmount
              currencyName={info.currencyName ? info.currencyName : ''}
              size={36}
              amtZec={totalBalance.total}
              style={{ opacity: 0.5 }}
            />
            <CurrencyAmount
              style={{ marginTop: 0, marginBottom: 5, opacity: 0.5 }}
              price={zecPrice.zecPrice}
              amtZec={totalBalance.total}
              currency={currency}
            />
            <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
              {translate('legacy.title')}
            </RegText>
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
          <TouchableOpacity
            accessible={true}
            accessibilityLabel={translate('menudrawer-acc')}
            onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={48} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute', right: 0 }}>
          <OptionsMenu
            customButton={
              <View accessible={true} accessibilityLabel={translate('menu-acc')}>
                <FontAwesomeIcon icon={faEllipsisV} color={colors.border} size={48} />
              </View>
            }
            buttonStyle={{ width: 32, height: 32, margin: 7.5, resizeMode: 'contain' }}
            destructiveIndex={4}
            options={[
              translate('legacy.newz-option'),
              //translate('legacy.newt-option'),
              translate('legacy.privkey-option'),
              translate('legacy.viewkey-option'),
              translate('cancel'),
            ]}
            //addT
            actions={[addZ, viewPrivKey, viewViewingKey]}
          />
        </View>

        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />

        <TabBar
          {...props}
          indicatorStyle={{ backgroundColor: colors.primary }}
          style={{ backgroundColor: colors.background }}
        />
      </View>
    );
  };

  const renderTabBarLandscape: (
    props: SceneRendererProps & {
      navigationState: NavigationState<Route>;
    },
  ) => ReactNode = props => {
    //console.log(props);
    return (
      <TabBar
        {...props}
        indicatorStyle={{ backgroundColor: colors.primary }}
        style={{ backgroundColor: 'transparent', width: dimensions.width / 2 - (dimensions.width * 60) / 812 }}
      />
    );
  };

  const returnPortrait = (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBarPortrait}
      onIndexChange={setIndex}
    />
  );

  const returnLandscape = (
    <View style={{ flexDirection: 'row', height: '100%' }}>
      <View
        accessible={true}
        accessibilityLabel={translate('receive.title-acc')}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '50%',
        }}>
        <Modal
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
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={importKeyModalVisible}
          onRequestClose={() => setImportKeyModalVisible(false)}>
          <ImportKey doImport={doImport} closeModal={() => setImportKeyModalVisible(false)} />
        </Modal>

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            backgroundColor: colors.card,
            padding: 0,
            margin: 0,
          }}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.card,
              zIndex: -1,
              padding: 10,
              width: '100%',
            }}>
            <Image
              source={require('../../assets/img/logobig-zingo.png')}
              style={{ width: 80, height: 80, resizeMode: 'contain' }}
            />
            <ZecAmount
              currencyName={info.currencyName ? info.currencyName : ''}
              size={36}
              amtZec={totalBalance.total}
              style={{ opacity: 0.5 }}
            />
            <CurrencyAmount
              style={{ marginTop: 0, marginBottom: 5, opacity: 0.5 }}
              price={zecPrice.zecPrice}
              amtZec={totalBalance.total}
              currency={currency}
            />
            <View style={{ width: '100%', height: 1, backgroundColor: colors.primary, marginTop: 5 }} />
            <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
              {translate('legacy.title')}
            </RegText>
            <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
          <TouchableOpacity
            accessible={true}
            accessibilityLabel={translate('menudrawer-acc')}
            onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={48} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute', right: 0 }}>
          <OptionsMenu
            customButton={
              <View accessible={true} accessibilityLabel={translate('menu-acc')}>
                <FontAwesomeIcon icon={faEllipsisV} color={colors.border} size={48} />
              </View>
            }
            buttonStyle={{ width: 32, height: 32, margin: 7.5, resizeMode: 'contain' }}
            destructiveIndex={4}
            options={[
              translate('legacy.newz-option'),
              //translate('legacy.newt-option'),
              translate('legacy.privkey-option'),
              translate('legacy.viewkey-option'),
              translate('cancel'),
            ]}
            //addT
            actions={[addZ, viewPrivKey, viewViewingKey]}
          />
        </View>
      </View>
      <View
        style={{
          borderLeftColor: colors.border,
          borderLeftWidth: 1,
          alignItems: 'center',
          padding: 10,
          height: '100%',
          width: '50%',
        }}>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBarLandscape}
          onIndexChange={setIndex}
        />
      </View>
    </View>
  );

  //console.log('render legacy', index, routes);

  if (dimensions.orientation === 'landscape') {
    return returnLandscape;
  } else {
    return returnPortrait;
  }
};

export default Legacy;
