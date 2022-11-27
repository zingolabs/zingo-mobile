/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View, Dimensions, Image, Modal } from 'react-native';
import { TabView, TabBar } from 'react-native-tab-view';
import Toast from 'react-native-simple-toast';
import { useTheme } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faEllipsisV, faInfo } from '@fortawesome/free-solid-svg-icons';
import OptionsMenu from 'react-native-option-menu';
import { TranslateOptions } from 'i18n-js';

import FadeText from '../Components/FadeText';
import ZecAmount from '../Components/ZecAmount';
import UsdAmount from '../Components/UsdAmount';
import RegText from '../Components/RegText';
import { InfoType, Address, TotalBalance, SyncStatus } from '../../app/AppState';
import Utils from '../../app/utils';
import RPC from '../../app/rpc';
import PrivKey from '../PrivKey';
import ImportKey from '../ImportKey';
import SingleAddress from './components/SingleAddress';
import { ThemeType } from '../../app/types';

type ReceiveProps = {
  info: InfoType | null;
  addresses: Address[];
  toggleMenuDrawer: () => void;
  fetchTotalBalance: () => Promise<void>;
  startRescan: () => void;
  totalBalance: TotalBalance;
  syncingStatus: SyncStatus | null;
  syncingStatusMoreInfoOnClick: () => void;
  translate: (key: string, config?: TranslateOptions) => any;
  uaAddress: string | null;
  setUaAddress: (uaAddress: string) => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  info,
  addresses,
  toggleMenuDrawer,
  fetchTotalBalance,
  startRescan,
  totalBalance,
  syncingStatus,
  syncingStatusMoreInfoOnClick,
  translate,
  uaAddress,
  setUaAddress,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([{ key: 'uaddr', title: translate('receive.u-title') }]);

  const [displayAddress, setDisplayAddress] = useState('');
  const [oindex, setOIndex] = useState(0);

  const zecPrice = info ? info.zecPrice : null;
  const currencyName = info ? info.currencyName : undefined;

  const uaddrs = addresses.filter(a => a.uaAddress === uaAddress && a.addressKind === 'u') || [];

  if (displayAddress) {
    const displayAddressIndex = uaddrs?.findIndex(a => a.address === displayAddress);

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
    }
  };

  const next = (type: string) => {
    setDisplayAddress('');
    if (type === 'u') {
      if (uaddrs.length === 0) {
        return;
      }
      const newIndex = (oindex + 1) % uaddrs?.length;
      setOIndex(newIndex);
    }
  };

  const renderScene: (routes: any) => JSX.Element | undefined = ({ route }) => {
    switch (route.key) {
      case 'uaddr': {
        let uaddr = translate('receive.noaddress');
        let uaddrKind = '';
        if (uaddrs.length > 0) {
          uaddr = uaddrs[oindex].address;
          uaddrKind = uaddrs[oindex].addressKind;
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
            translate={translate}
          />
        );
      }
    }
  };

  const addO = async () => {
    //console.log('New O');
    const newAddress = await RPC.rpc_createNewAddress('u');
    if (newAddress && !newAddress.startsWith('Error')) {
      await fetchTotalBalance();
      setIndex(2);
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
    if (uaddrs.length === 0) {
      Toast.show(translate('receive.unoviewkey'), Toast.LONG);
      return;
    }

    const address = uaddrs[oindex].address;
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

  const renderTabBar: (props: any) => JSX.Element = props => {
    let address = '';

    if (uaddrs.length > 0) {
      address = uaddrs[oindex].address;
    }

    const syncStatusDisplayLine = syncingStatus?.inProgress ? `(${syncingStatus?.blocks})` : '';

    return (
      <View
        accessible={true}
        accessibilityLabel={'UAs Screen'}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
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
            totalBalance={totalBalance}
            currencyName={currencyName}
            translate={translate}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={importKeyModalVisible}
          onRequestClose={() => setImportKeyModalVisible(false)}>
          <ImportKey
            doImport={doImport}
            closeModal={() => setImportKeyModalVisible(false)}
            totalBalance={totalBalance}
            currencyName={currencyName}
            translate={translate}
          />
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
            <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{ opacity: 0.5 }} />
            <UsdAmount
              style={{ marginTop: 0, marginBottom: 5, opacity: 0.5 }}
              price={zecPrice}
              amtZec={totalBalance.total}
            />

            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginVertical: 5,
              }}>
              <RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
                {syncStatusDisplayLine ? translate('receive.title-syncing') : translate('receive.title')}
              </RegText>
              <FadeText style={{ margin: 0, padding: 0 }}>
                {syncStatusDisplayLine ? syncStatusDisplayLine : ''}
              </FadeText>
              {!!syncStatusDisplayLine && (
                <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      margin: 0,
                      padding: 0,
                      marginLeft: 5,
                    }}>
                    <FadeText style={{ color: colors.primary }}>{translate('receive.more')}</FadeText>
                    <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
          <TouchableOpacity accessible={true} accessibilityLabel={'Open Menu Drawer'} onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={48} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute', right: 0 }}>
          <OptionsMenu
            customButton={
              <View accessible={true} accessibilityLabel={'Open Menu'}>
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
            ]}
            actions={[addO, viewPrivKey, viewViewingKey, importKey]}
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

  //console.log('render receive');

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={setIndex}
      initialLayout={{ width: Dimensions.get('window').width }}
    />
  );
};

export default Receive;
