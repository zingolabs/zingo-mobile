/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useState, ReactNode } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
//import { Modal } from 'react-native';
import { TabView, TabBar, SceneRendererProps, Route, NavigationState } from 'react-native-tab-view';
//import Toast from 'react-native-simple-toast';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faCheck, faPlay, faStop, faInfo } from '@fortawesome/free-solid-svg-icons';
//import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
//import OptionsMenu from 'react-native-option-menu';

import ZecAmount from '../Components/ZecAmount';
import CurrencyAmount from '../Components/CurrencyAmount';
import RegText from '../Components/RegText';
//import Utils from '../../app/utils';
//import RPC from '../../app/rpc';
//import PrivKey from '../PrivKey';
//import ImportKey from '../ImportKey';
import SingleAddress from './components/SingleAddress';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import ZingoHeader from '../ZingoHeader';

type ReceiveProps = {
  fetchTotalBalance: () => void;
  setUaAddress: (uaAddress: string) => void;
  toggleMenuDrawer: () => void;
  startRescan: () => void;
  syncingStatusMoreInfoOnClick: () => void;
  poolsMoreInfoOnClick: () => void;
  setZecPrice: (p: number, d: number) => void;
};

const Receive: React.FunctionComponent<ReceiveProps> = ({
  setUaAddress,
  toggleMenuDrawer,
  syncingStatusMoreInfoOnClick,
  poolsMoreInfoOnClick,
  setZecPrice,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, dimensions, info, addresses, totalBalance, syncingStatus, uaAddress, currency, zecPrice } =
    context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [index, setIndex] = useState(0);
  const [routes] = useState([{ key: 'uaddr', title: translate('receive.u-title') }]);

  const [displayAddress, setDisplayAddress] = useState(uaAddress);
  const [oindex, setOIndex] = useState(0);

  const uaddrs = addresses.filter(a => a.addressKind === 'u') || [];

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
    }
  };
  /*
  const addO = async () => {
    //console.log('New O');
    //const newAddress = await RPC.rpc_createNewAddress('tzo');
    //if (newAddress && !newAddress.startsWith('Error')) {
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

  let address = '';

  if (uaddrs.length > 0) {
    address = uaddrs[oindex].address;
  }
  */
  const syncStatusDisplayLine = syncingStatus.inProgress ? `(${syncingStatus.blocks})` : '';

  const renderScene: (
    props: SceneRendererProps & {
      route: Route;
    },
  ) => ReactNode = ({ route }) => {
    switch (route.key) {
      case 'uaddr': {
        let uaddr = translate('receive.noaddress');
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
        accessibilityLabel={translate('receive.title-acc')}
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          width: '100%',
        }}>

        <ZingoHeader>
          <View style={{ flexDirection: 'row' }}>
            <ZecAmount
              currencyName={info.currencyName ? info.currencyName : ''}
              size={36}
              amtZec={totalBalance.total}
              style={{ opacity: 0.5 }}
            />
            {totalBalance.total > 0 && (totalBalance.privateBal > 0 || totalBalance.transparentBal > 0) && (
              <TouchableOpacity onPress={() => poolsMoreInfoOnClick()}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.card,
                    borderRadius: 10,
                    margin: 0,
                    padding: 0,
                    marginLeft: 5,
                    minWidth: 48,
                    minHeight: 48,
                  }}>
                  <RegText color={colors.primary}>{translate('transactions.pools')}</RegText>
                  <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {currency === 'USD' && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CurrencyAmount
                style={{ marginTop: 0, marginBottom: 5, opacity: 0.5 }}
                price={zecPrice.zecPrice}
                amtZec={totalBalance.total}
                currency={currency}
              />
              <View style={{ marginLeft: 5 }}>
                <PriceFetcher setZecPrice={setZecPrice} />
              </View>
            </View>
          )}

          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginVertical: 5,
            }}>
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
                padding: 1,
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 10,
                minWidth: 20,
                minHeight: 20,
              }}>
              {!syncStatusDisplayLine && syncingStatus.synced && (
                <View style={{ margin: 0, padding: 0 }}>
                  <FontAwesomeIcon icon={faCheck} color={colors.primary} />
                </View>
              )}
              {!syncStatusDisplayLine && !syncingStatus.synced && (
                <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                  <FontAwesomeIcon icon={faStop} color={colors.zingo} size={12} />
                </TouchableOpacity>
              )}
              {syncStatusDisplayLine && (
                <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                  <FontAwesomeIcon icon={faPlay} color={colors.primary} size={10} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ZingoHeader>
        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
          <TouchableOpacity
            accessible={true}
            accessibilityLabel={translate('menudrawer-acc')}
            onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={48} color={colors.border} />
          </TouchableOpacity>
        </View>

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

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            backgroundColor: colors.card,
            padding: 0,
            margin: 0,
          }}>
          <ZingoHeader>
            <View style={{ flexDirection: 'column', alignItems: 'center' }}>
              {totalBalance.total > 0 && (totalBalance.privateBal > 0 || totalBalance.transparentBal > 0) && (
                <TouchableOpacity onPress={() => poolsMoreInfoOnClick()}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      margin: 0,
                      padding: 0,
                      minWidth: 48,
                      minHeight: 48,
                    }}>
                    <RegText color={colors.primary}>{translate('transactions.pools')}</RegText>
                    <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} style={{ marginBottom: 5 }} />
                  </View>
                </TouchableOpacity>
              )}
              <ZecAmount
                currencyName={info.currencyName ? info.currencyName : ''}
                size={36}
                amtZec={totalBalance.total}
                style={{ opacity: 0.5 }}
              />
              {currency === 'USD' && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CurrencyAmount
                    style={{ marginTop: 0, marginBottom: 5 }}
                    price={zecPrice.zecPrice}
                    amtZec={totalBalance.total}
                    currency={currency}
                  />
                  <View style={{ marginLeft: 5 }}>
                    <PriceFetcher setZecPrice={setZecPrice} />
                  </View>
                </View>
              )}
            </View>

            <View style={{ width: '100%', height: 1, backgroundColor: colors.primary, marginTop: 5 }} />

            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginVertical: 5,
              }}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}>
                <RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
                  {translate('receive.title')}
                </RegText>
                {/*<RegText color={colors.money} style={{ paddingHorizontal: 5 }}>
                  {syncStatusDisplayLine ? translate('receive.title-syncing') : translate('receive.title')}
                </RegText>
                {!!syncStatusDisplayLine && (
                  <FadeText style={{ margin: 0, padding: 0 }}>{syncStatusDisplayLine}</FadeText>
                )}*/}
              </View>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: 0,
                  padding: 1,
                  borderColor: colors.primary,
                  borderWidth: 1,
                  borderRadius: 10,
                  minWidth: 20,
                  minHeight: 20,
                }}>
                {!syncStatusDisplayLine && syncingStatus.synced && (
                  <View style={{ margin: 0, padding: 0 }}>
                    <FontAwesomeIcon icon={faCheck} color={colors.primary} />
                  </View>
                )}
                {!syncStatusDisplayLine && !syncingStatus.synced && (
                  <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                    <FontAwesomeIcon icon={faStop} color={colors.zingo} size={12} />
                  </TouchableOpacity>
                )}
                {syncStatusDisplayLine && (
                  <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                    <FontAwesomeIcon icon={faPlay} color={colors.primary} size={10} />
                  </TouchableOpacity>
                )}
              </View>
              {/*!!syncStatusDisplayLine && (
                <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      margin: 0,
                      padding: 0,
                      marginLeft: 5,
                      minWidth: 48,
                      minHeight: 48,
                    }}>
                    <RegText color={colors.primary}>{translate('receive.more')}</RegText>
                    <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
                )*/}
            </View>
          </ZingoHeader>
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
            ]}
            actions={[addO, viewPrivKey, viewViewingKey, importKey]}
          />*/}
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

  //console.log('render receive', index, routes);

  if (dimensions.orientation === 'landscape') {
    return returnLandscape;
  } else {
    return returnPortrait;
  }
};

export default Receive;
