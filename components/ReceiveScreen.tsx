/* eslint-disable react-native/no-inline-styles */
import React, {useState} from 'react';
import {View, Dimensions, Clipboard, Platform, Image, Text, Modal} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {TabView, TabBar} from 'react-native-tab-view';
import Toast from 'react-native-simple-toast';
import {ClickableText, FadeText, SecondaryButton} from '../components/Components';
import {Info} from '../app/AppState';
import Utils from '../app/utils';
import {useTheme} from '@react-navigation/native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faBars, faEllipsisV} from '@fortawesome/free-solid-svg-icons';
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

const SingleAddressDisplay: React.FunctionComponent<SingleAddress> = ({address, index, total, prev, next}) => {
  // console.log(`Addresses ${addresses}: ${multipleAddresses}`);
  const {colors} = useTheme();

  const multi = total > 1;

  const chunks = Utils.splitStringIntoChunks(address, Utils.isSapling(address) ? 4 : 2);
  const fixedWidthFont = Platform.OS === 'android' ? 'monospace' : 'Courier';

  const doCopy = () => {
    if (address) {
      Clipboard.setString(address);
      Toast.show('Copied Address to Clipboard', Toast.LONG);
    }
  };

  // let addressIndex = '';
  // if (Utils.isSapling(address)) {
  //   addressIndex = `m/32'/133'/${currentAddressIndex}`;
  // } else {
  //   addressIndex = `m/44'/133'/0'/0/${currentAddressIndex}`;
  // }

  return (
    <View style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {multi && (
        <FadeText style={{marginTop: 10}}>
          Address: {index + 1} of {total}
        </FadeText>
      )}
      <View style={{marginTop: 10, padding: 10, backgroundColor: 'rgb(255, 255, 255)'}}>
        <QRCode value={address} size={225} ecl="L" />
      </View>
      <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, justifyContent: 'center'}}>
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
      <ClickableText style={{marginTop: 10}} onPress={doCopy}>
        Tap To Copy
      </ClickableText>

      {multi && (
        <View style={{display: 'flex', flexDirection: 'row', marginTop: 10, alignItems: 'center'}}>
          <SecondaryButton title={'Prev'} style={{width: '25%', margin: 10}} onPress={prev} />
          <SecondaryButton title={'Next'} style={{width: '25%', margin: 10}} onPress={next} />
        </View>
      )}
    </View>
  );
};

type ReceiveScreenProps = {
  info: Info | null;
  addresses: string[];
  toggleMenuDrawer: () => void;
  fetchTotalBalance: () => Promise<void>;
  startRescan: () => void;
};

const ReceiveScreen: React.FunctionComponent<ReceiveScreenProps> = ({
  addresses,
  toggleMenuDrawer,
  fetchTotalBalance,
  startRescan,
}) => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    {key: 'zaddr', title: 'Z Address'},
    {key: 'taddr', title: 'T Address'},
  ]);

  const [displayAddress, setDisplayAddress] = useState('');
  const [zindex, setZIndex] = useState(0);
  const [tindex, setTIndex] = useState(0);

  const {colors} = useTheme();

  const zaddrs = addresses.filter(a => Utils.isSapling(a)) || [];
  const taddrs = addresses.filter(a => Utils.isTransparent(a)) || [];

  if (displayAddress) {
    let displayAddressIndex = zaddrs?.findIndex(a => a === displayAddress);

    if (zindex !== displayAddressIndex && displayAddressIndex >= 0) {
      setZIndex(displayAddressIndex);
    }

    displayAddressIndex = taddrs?.findIndex(a => a === displayAddress);

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
    } else {
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
      const newIndex = (zindex + 1) % zaddrs?.length;
      setZIndex(newIndex);
    } else {
      if (taddrs.length === 0) {
        return;
      }
      const newIndex = (tindex + 1) % taddrs?.length;
      setTIndex(newIndex);
    }
  };

  const renderScene: (routes: any) => JSX.Element | undefined = ({route}) => {
    switch (route.key) {
      case 'zaddr': {
        let zaddr = 'No Address';
        if (zaddrs.length > 0) {
          zaddr = zaddrs[zindex];
        }
        return (
          <SingleAddressDisplay
            address={zaddr}
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
        let taddr = 'No Address';
        if (taddrs.length > 0) {
          taddr = taddrs[tindex];
        }

        return (
          <SingleAddressDisplay
            address={taddr}
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

  const addZ = async () => {
    console.log('New Z');
    const newAddress = await RPC.createNewAddress(true);
    await fetchTotalBalance();
    setIndex(0);
    setDisplayAddress(newAddress);
  };

  const addT = async () => {
    console.log('New T');
    const newAddress = await RPC.createNewAddress(false);
    await fetchTotalBalance();
    setIndex(1);
    setDisplayAddress(newAddress);
  };

  const [privKeyModalVisible, setPrivKeyModalVisible] = useState(false);
  const [keyType, setKeyType] = useState(0);
  const [privKey, setPrivKey] = useState('');

  const viewPrivKey = async () => {
    if (zaddrs.length === 0 || taddrs.length === 0) {
      return;
    }

    const address = index === 0 ? zaddrs[zindex] : taddrs[tindex];
    const k = await RPC.getPrivKeyAsString(address);

    setKeyType(0);
    setPrivKeyModalVisible(true);
    setPrivKey(k);
  };

  const viewViewingKey = async () => {
    if (index === 1) {
      // No viewing key for T address
      Toast.show('T addresses do not have viewing keys', Toast.LONG);
      return;
    }

    if (zaddrs.length === 0 || taddrs.length === 0) {
      return;
    }

    const address = index === 0 ? zaddrs[zindex] : taddrs[tindex];
    const k = await RPC.getViewKeyAsString(address);

    setKeyType(1);
    setPrivKeyModalVisible(true);
    setPrivKey(k);
  };

  const [importKeyModalVisible, setImportKeyModalVisible] = useState(false);
  const importKey = async () => {
    setImportKeyModalVisible(true);
  };

  const doImport = async (key: string, birthday: string) => {
    const addressList = await RPC.doImportPrivKey(key, birthday);
    console.log(addressList);

    if (typeof addressList === 'string' && addressList.startsWith('Error')) {
      // Show the toast in settimeout, because it sometimes gets lost.
      setTimeout(() => {
        Toast.show(addressList, Toast.LONG);
      }, 1000);
      return;
    }

    let address = '';
    if (addressList && addressList.length > 0) {
      address = addressList[0];
    }

    // Show the toast in settimeout, because it sometimes gets lost.
    setTimeout(() => {
      Toast.show(`Importing ${Utils.trimToSmall(address)}`, Toast.LONG);
    }, 1000);
    startRescan();
  };

  const renderTabBar: (props: any) => JSX.Element = props => {
    let address = '';

    if (index === 0 && zaddrs.length > 0) {
      address = zaddrs[zindex];
    } else if (index === 1 && taddrs.length > 0) {
      address = taddrs[tindex];
    }

    return (
      <View>
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
          />
        </Modal>

        <Modal
          animationType="slide"
          transparent={false}
          visible={importKeyModalVisible}
          onRequestClose={() => setImportKeyModalVisible(false)}>
          <ImportKeyModal doImport={doImport} closeModal={() => setImportKeyModalVisible(false)} />
        </Modal>

        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            backgroundColor: colors.card,
            padding: 15,
          }}>
          <TouchableOpacity onPress={toggleMenuDrawer}>
            <FontAwesomeIcon icon={faBars} size={20} color={'#ffffff'} />
          </TouchableOpacity>
          <Text style={{paddingBottom: 25, color: colors.text, fontSize: 28}}>Wallet Address</Text>
          <OptionsMenu
            customButton={<FontAwesomeIcon icon={faEllipsisV} color={'#ffffff'} size={20} />}
            buttonStyle={{width: 32, height: 32, margin: 7.5, resizeMode: 'contain'}}
            destructiveIndex={5}
            options={[
              'New Z Address',
              'New T Address',
              'Export Private Key',
              'Export Viewing Key',
              'Import...',
              'Cancel',
            ]}
            actions={[addZ, addT, viewPrivKey, viewViewingKey, importKey]}
          />
        </View>

        <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
          <Image source={require('../assets/img/logobig.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
        </View>
        <TabBar
          {...props}
          indicatorStyle={{backgroundColor: colors.primary}}
          style={{backgroundColor: colors.background}}
        />
      </View>
    );
  };

  return (
    <TabView
      navigationState={{index, routes}}
      renderScene={renderScene}
      renderTabBar={renderTabBar}
      onIndexChange={setIndex}
      initialLayout={{width: Dimensions.get('window').width}}
    />
  );
};

export default ReceiveScreen;
