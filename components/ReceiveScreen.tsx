/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, Dimensions, Clipboard, Platform, Image, Text} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {TabView, TabBar} from 'react-native-tab-view';
import Toast from 'react-native-simple-toast';
import {RegText} from '../components/Components';
import {Info} from '../app/AppState';
import Utils from '../app/utils';
import {useTheme} from '@react-navigation/native';
import {TouchableOpacity} from 'react-native-gesture-handler';

type SingleAddress = {
  address: string | null;
};

const SingleAddressDisplay: React.FunctionComponent<SingleAddress> = ({address}) => {
  if (!address) {
    address = 'No Address';
  }

  const {colors} = useTheme();

  const chunks = Utils.splitAddressIntoChunks(address, Utils.isSapling(address) ? 8 : 4);
  const fixedWidthFont = Platform.OS === 'android' ? 'monospace' : 'Courier';

  return (
    <View style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <View style={{padding: 10, backgroundColor: 'rgb(255, 255, 255)', marginTop: 20}}>
        <QRCode value={address} size={250} ecl="M" />
      </View>
      <TouchableOpacity
        onPress={() => {
          if (address) {
            Clipboard.setString(address);
            Toast.show('Copied Address to Clipboard', Toast.LONG);
          }
        }}>
        <View
          style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20}}>
          {chunks.map((c) => (
            <RegText
              key={c}
              style={{
                flexBasis: '40%',
                textAlign: 'center',
                fontFamily: fixedWidthFont,
                fontSize: 20,
                color: colors.text,
                opacity: 0.55,
              }}>
              {c}
            </RegText>
          ))}
        </View>
      </TouchableOpacity>
    </View>
  );
};

type ReceiveScreenProps = {
  info: Info | null;
  addresses: string[];
};

const ReceiveScreen: React.FunctionComponent<ReceiveScreenProps> = ({addresses}) => {
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    {key: 'zaddr', title: 'Z Address'},
    {key: 'taddr', title: 'T Address'},
  ]);
  const {colors} = useTheme();

  const zaddr = addresses.find((a) => Utils.isSapling(a)) || null;
  const taddr = addresses.find((a) => Utils.isTransparent(a)) || null;

  const renderScene: (routes: any) => JSX.Element | undefined = ({route}) => {
    switch (route.key) {
      case 'zaddr':
        return <SingleAddressDisplay address={zaddr} />;
      case 'taddr':
        return <SingleAddressDisplay address={taddr} />;
    }
  };

  const renderTabBar: (props: any) => JSX.Element = (props) => (
    <View>
      <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25}}>
        <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>Wallet Address</Text>
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
