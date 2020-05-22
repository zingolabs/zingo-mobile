/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, Dimensions} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {TabView, TabBar} from 'react-native-tab-view';

import {RegText} from '../components/Components';
import {Info} from '../app/AppState';
import Utils from '../app/utils';
import {useTheme} from '@react-navigation/native';

type SingleAddress = {
  address: string | null;
};

const SingleAddressDisplay: React.FunctionComponent<SingleAddress> = ({address}) => {
  if (!address) {
    address = 'No Address';
  }

  const {colors} = useTheme();

  const chunks = Utils.splitAddressIntoChunks(address, Utils.isSapling(address) ? 8 : 4);

  return (
    <View style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <View style={{padding: 10, backgroundColor: 'rgb(255, 255, 255)', marginTop: 20}}>
        <QRCode value={address} size={300} ecl="M" />
      </View>
      <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20}}>
        {chunks.map((c) => (
          <RegText
            key={c}
            style={{
              flexBasis: '40%',
              textAlign: 'center',
              fontFamily: 'Courier',
              fontSize: 20,
              color: colors.text,
              opacity: 0.55,
            }}>
            {c}
          </RegText>
        ))}
      </View>
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
    <TabBar
      {...props}
      indicatorStyle={{backgroundColor: colors.primary}}
      style={{backgroundColor: colors.background}}
    />
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
