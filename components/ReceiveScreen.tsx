/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View, Dimensions, Platform, Image, Modal, ScrollView } from 'react-native';
import Clipboard from '@react-native-community/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { TabView, TabBar } from 'react-native-tab-view';
import Toast from 'react-native-simple-toast';
import { ClickableText, FadeText, ZecAmount, UsdAmount, RegText } from '../components/Components';
import Button from './Button';
import { Info, Address } from '../app/AppState';
import Utils from '../app/utils';
import { useTheme } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faEllipsisV, faInfo } from '@fortawesome/free-solid-svg-icons';
// @ts-ignore
import OptionsMenu from 'react-native-option-menu';
import RPC from '../app/rpc';
import PrivKeyModal from './PrivKeyModal';
import ImportKeyModal from './ImportKey';

type SingleAddress = {
  address: string;
  index: number;
  total: number;
  prev: () => void;
  next: () => void;
};

const SingleAddressDisplay: React.FunctionComponent<SingleAddress> = ({ address, index, total, prev, next }) => {
  // console.log(`Addresses ${addresses}: ${multipleAddresses}`);
  const { colors } = useTheme();

  const multi = total > 1;

  // 30 characters per line
  const numLines = address.length / 30;
  const chunks = Utils.splitStringIntoChunks(address, numLines.toFixed(0));
  const fixedWidthFont = Platform.OS === 'android' ? 'monospace' : 'Courier';

  const doCopy = () => {
    if (address) {
      Clipboard.setString(address);
      Toast.show('Copied Unified Address to Clipboard', Toast.LONG);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        {
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
      ]}
      keyboardShouldPersistTaps="handled">
      <View style={{ marginTop: 20, padding: 10, backgroundColor: colors.border }}>
        <QRCode value={address} size={200} ecl="L" backgroundColor={colors.border} />
      </View>
      <ClickableText style={{ marginTop: 15 }} onPress={doCopy}>
        Tap To Copy
      </ClickableText>

      <View
        style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, justifyContent: 'center' }}>
        {chunks.map(c => (
          <FadeText
            key={c}
            style={{
              flexBasis: '100%',
              textAlign: 'center',
              fontFamily: fixedWidthFont,
              fontSize: 18,
              color: colors.text,
            }}>
            {c}
          </FadeText>
        ))}
      </View>

      {multi && (
        <View style={{ display: 'flex', flexDirection: 'row', marginTop: 10, alignItems: 'center', marginBottom: 100 }}>
          <Button type="Secondary" title={'Prev'} style={{ width: '25%', margin: 10 }} onPress={prev} />
          <FadeText>
            {index + 1} of {total}
          </FadeText>
          <Button type="Secondary" title={'Next'} style={{ width: '25%', margin: 10 }} onPress={next} />
        </View>
      )}
    </ScrollView>
  );
};

type ReceiveScreenProps = {
  info: Info | null;
  addresses: Address[];
  toggleMenuDrawer: () => void;
  fetchTotalBalance: () => Promise<void>;
  startRescan: () => void;
};

const ReceiveScreen: React.FunctionComponent<ReceiveScreenProps> = ({
  addresses,
  toggleMenuDrawer,
  fetchTotalBalance,
  startRescan,
  totalBalance,
  info,
  syncingStatus,
  syncingStatusMoreInfoOnClick,
}) => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([{ key: 'uaddr', title: 'UNIFIED ADRESSES' }]);

  const [displayAddress, setDisplayAddress] = useState('');
  const [oindex, setOIndex] = useState(0);

  const { colors } = useTheme();
  const zecPrice = info ? info.zecPrice : null;
  const currencyName = info ? info.currencyName : null;

  const uaddrs = addresses.filter(a => a.addressKind === 'u') || [];

  if (displayAddress) {
    displayAddressIndex = uaddrs?.findIndex(a => a.address === displayAddress);

    if (oindex !== displayAddressIndex && displayAddressIndex >= 0) {
      setOIndex(displayAddressIndex);
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
        let uaddr = 'No Unified Address';
        if (uaddrs.length > 0) {
          uaddr = uaddrs[oindex].address;
        }

        return (
          <SingleAddressDisplay
            address={uaddr}
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

  const addO = async () => {
    //console.log('New O');
    const newAddress = await RPC.rpc_createNewAddress('u');
    await fetchTotalBalance();
    setIndex(2);
    setDisplayAddress(newAddress);
  };

  const [privKeyModalVisible, setPrivKeyModalVisible] = useState(false);
  const [keyType, setKeyType] = useState(0);
  const [privKey, setPrivKey] = useState('');

  const viewPrivKey = async () => {
    if (uaddrs.length === 0) {
      Toast.show('No Unified address to import the Spending Key', Toast.LONG);
      return;
    }

    const address = uaddrs[oindex].address;
    const k = await RPC.rpc_getPrivKeyAsString(address);

    setKeyType(0);
    setPrivKeyModalVisible(true);
    setPrivKey(k);
  };

  const viewViewingKey = async () => {
    if (uaddrs.length === 0) {
      Toast.show('No Unified address to import the Full Viewing Key', Toast.LONG);
      return;
    }

    const address = uaddrs[oindex].address;
    const k = await RPC.rpc_getViewKeyAsString(address);

    setKeyType(1);
    setPrivKeyModalVisible(true);
    setPrivKey(k);
  };

  const [importKeyModalVisible, setImportKeyModalVisible] = useState(false);

  const importKey = async () => {
    setImportKeyModalVisible(true);
  };

  const doImport = async (key: string, birthday: string) => {
    const addressList = await RPC.rpc_fetchSeedoImportPrivKey(key, birthday);
    // console.log(addressList);

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
          <PrivKeyModal
            address={address}
            keyType={keyType}
            privKey={privKey}
            closeModal={() => setPrivKeyModalVisible(false)}
            totalBalance={totalBalance}
            currencyName={currencyName}
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={importKeyModalVisible}
          onRequestClose={() => setImportKeyModalVisible(false)}>
          <ImportKeyModal
            doImport={doImport}
            closeModal={() => setImportKeyModalVisible(false)}
            totalBalance={totalBalance}
            currencyName={currencyName}
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
              source={require('../assets/img/logobig-zingo.png')}
              style={{ width: 80, height: 80, resizeMode: 'contain' }}
            />
            <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{ opacity: 0.4 }} />
            <UsdAmount
              style={{ marginTop: 0, marginBottom: 5, opacity: 0.4 }}
              price={zecPrice}
              amtZec={totalBalance.total}
            />

            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
                {syncStatusDisplayLine ? 'Receive - Syncing' : 'Receive'}
              </RegText>
              <FadeText style={{ marginTop: 5, padding: 0 }}>
                {syncStatusDisplayLine ? syncStatusDisplayLine : ''}
              </FadeText>
              {!!syncStatusDisplayLine && (
                <TouchableOpacity onPress={() => syncingStatusMoreInfoOnClick()}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 5,
                      backgroundColor: colors.card,
                      padding: 5,
                      borderRadius: 10,
                    }}>
                    <FadeText style={{ color: colors.primary }}>more...</FadeText>
                    <FontAwesomeIcon icon={faInfo} size={14} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute' }}>
          <TouchableOpacity onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={20} color={colors.border} />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.card, padding: 10, position: 'absolute', right: 0 }}>
          <OptionsMenu
            customButton={<FontAwesomeIcon icon={faEllipsisV} color={colors.border} size={20} />}
            buttonStyle={{ width: 32, height: 32, margin: 7.5, resizeMode: 'contain' }}
            destructiveIndex={4}
            options={['New Address', 'Export Spending Key', 'Export Full Viewing Key', 'Import Key...', 'Cancel']}
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

export default ReceiveScreen;
