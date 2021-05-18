/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, Dimensions, Clipboard, Platform, Image, Text} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {TabView, TabBar} from 'react-native-tab-view';
import Toast from 'react-native-simple-toast';
import {ClickableText, FadeText} from '../components/Components';
import {Info} from '../app/AppState';
import Utils from '../app/utils';
import {useTheme} from '@react-navigation/native';
import {TouchableOpacity} from 'react-native-gesture-handler';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import {faBars} from '@fortawesome/free-solid-svg-icons';

type SingleAddress = {
  address: string | null;
};

const SingleAddressDisplay: React.FunctionComponent<SingleAddress> = ({address}) => {
  if (!address) {
    address = 'No Address';
  }

  const {colors} = useTheme();

  const chunks = Utils.splitAddressIntoChunks(address, Utils.isSapling(address) ? 4 : 2);
  const fixedWidthFont = Platform.OS === 'android' ? 'monospace' : 'Courier';

  const doCopy = () => {
    if (address) {
      Clipboard.setString(address);
      Toast.show('Copied Address to Clipboard', Toast.LONG);
    }
  };

  return (
    <View style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <View style={{padding: 10, backgroundColor: 'rgb(255, 255, 255)', marginTop: 20}}>
        <QRCode value={address} size={250} ecl="M" />
      </View>
      <TouchableOpacity onPress={doCopy}>
        <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginTop: 10}}>
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
      </TouchableOpacity>
      <ClickableText style={{marginTop: 10}} onPress={doCopy}>
        Tap To Copy
      </ClickableText>
    </View>
  );
};

type ReceiveScreenProps = {
  info: Info | null;
  addresses: string[];
  toggleMenuDrawer: () => void;
};

const ReceiveScreen: React.FunctionComponent<ReceiveScreenProps> = ({addresses, toggleMenuDrawer}) => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    {key: 'zaddr', title: 'Z Address'},
    {key: 'taddr', title: 'T Address'},
  ]);
  const {colors} = useTheme();

  const zaddr = addresses.find(a => Utils.isSapling(a)) || null;
  const taddr = addresses.find(a => Utils.isTransparent(a)) || null;

  const renderScene: (routes: any) => JSX.Element | undefined = ({route}) => {
    switch (route.key) {
      case 'zaddr':
        return <SingleAddressDisplay address={zaddr} />;
      case 'taddr':
        return <SingleAddressDisplay address={taddr} />;
    }
  };

  const renderTabBar: (props: any) => JSX.Element = props => (
    <View>
      <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25, zIndex: -1}}>
        <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>Wallet Address</Text>
      </View>

      <View style={{backgroundColor: '#353535', padding: 10, position: 'absolute'}}>
        <TouchableOpacity onPress={toggleMenuDrawer}>
          <FontAwesomeIcon icon={faBars} size={20} color={'#ffffff'} />
        </TouchableOpacity>
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
