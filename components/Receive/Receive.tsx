/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, ReactNode } from 'react';
import { View } from 'react-native';
//import { Modal } from 'react-native';
import { TabView, TabBar, SceneRendererProps, Route, NavigationState } from 'react-native-tab-view';
//import Toast from 'react-native-simple-toast';
import { useTheme } from '@react-navigation/native';
//import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
//import OptionsMenu from 'react-native-option-menu';

//import Utils from '../../app/utils';
//import RPC from '../../app/rpc';
//import PrivKey from '../PrivKey';
//import ImportKey from '../ImportKey';
import SingleAddress from '../Components/SingleAddress';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import RegText from '../Components/RegText';
import { Scene } from 'react-native-tab-view/lib/typescript/src/types';

type ReceiveProps = {
  setUaAddress: (uaAddress: string) => void;
  toggleMenuDrawer: () => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({ setUaAddress, toggleMenuDrawer }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, dimensions, addresses, uaAddress } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'uaddr', title: translate('receive.u-title') as string },
    { key: 'zaddr', title: translate('receive.z-title') as string },
    { key: 'taddr', title: translate('receive.t-title') as string },
  ]);

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
  /*
  const addO = async () => {
    //console.log('New O');
    //const newAddress = await RPC.rpc_createNewAddress('tzo');
    //if (newAddress && !newAddress.toLowerCase().startsWith('error')) {
    await fetchTotalBalance();
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

  const [privKeyModalVisible, setPrivKeyModalVisible] = useState(false);
  const [keyType, setKeyType] = useState(0);
  const [privKey, setPrivKey] = useState('');

  const viewPrivKey = async () => {
    if (uaddrs.length === 0) {
      Toast.show(translate('receive.unoprivkey'), Toast.LONG);
      return;
    }

    const address = uaddrs[oindex].address;
    const k = await RPC.rpc_getPrivKeyAsString(address);

    if (k && !k.toLowerCase().startsWith('error')) {
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
    if (uaddrs.length === 0) {
      Toast.show(translate('receive.unoviewkey'), Toast.LONG);
      return;
    }

    const address = uaddrs[oindex].address;
    const k = await RPC.rpc_getViewKeyAsString(address);

    if (k && !k.toLowerCase().startsWith('error')) {
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

  const importKey = async () => {
    Toast.show('Error: ' + translate('workingonit'), Toast.LONG);
    //setImportKeyModalVisible(true);
  };

  const doImport = async (key: string, birthday: string) => {
    if (isNaN(parseInt(birthday, 10))) {
      setTimeout(() => {
        Toast.show(`${translate('rpc.parsebirthday-error')} ${birthday}`, Toast.LONG);
      }, 1000);
      return;
    }
    const addressList = await RPC.rpc_doImportPrivKey(key, birthday);
    //console.log(addressList);

    if (typeof addressList === 'string' && addressList.toLowerCase().startsWith('error')) {
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

  if (uaddrs.length > 0) {
    address = uaddrs[oindex].address;
  }
  */

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
        let taddr = translate('receive.noaddress') as string;
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

  const renderLabelCustom: (
    scene: Scene<Route> & {
      focused: boolean;
      color: string;
    },
  ) => ReactNode = ({ route, focused, color }) => (
    <View style={{ width: (dimensions.width - 20) / 3, alignItems: 'center' }}>
      <RegText
        style={{
          fontWeight: focused ? 'bold' : 'normal',
          fontSize: focused ? 15 : 14,
          color: color,
        }}>
        {route.title ? route.title : ''}
      </RegText>
      {route.key === 'uaddr' && (
        <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. zingo, trezor)</RegText>
      )}
      {route.key === 'zaddr' && (
        <RegText style={{ fontSize: 11, color: focused ? colors.primary : color }}>(e.g. old wallets)</RegText>
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

        {/*<Modal
          animationType="slide"
          transparent={false}
          visible={importKeyModalVisible}
          onRequestClose={() => setImportKeyModalVisible(false)}>
          <ImportKey doImport={doImport} closeModal={() => setImportKeyModalVisible(false)} />
        </Modal>*/}

        <Header
          toggleMenuDrawer={toggleMenuDrawer}
          title={translate('receive.title') as string}
          noBalance={true}
          noSyncingStatus={true}
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
            actions={[addO, viewPrivKey, viewViewingKey, importKey]}
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

  //console.log('render receive', index, routes);

  return returnPage;
};

export default Receive;
