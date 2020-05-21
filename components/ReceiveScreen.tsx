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

  const chunks = Utils.splitAddressIntoChunks(address, 8);

  return (
    <View style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <View style={[{padding: 10, backgroundColor: 'rgb(255, 255, 255)'}]}>
        <QRCode value={address} size={300} ecl="M" />
      </View>
      <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center'}}>
        {chunks.map((c) => (
          <RegText style={{flexBasis: '40%', textAlign: 'center'}}>{c}</RegText>
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
  const taddr = addresses.find((a) => Utils.isSapling(a)) || null;

  const renderScene: (routes: any) => JSX.Element | undefined = ({route}) => {
    switch (route.key) {
      case 'zaddr':
        return <SingleAddressDisplay address={zaddr} />;
      case 'taddr':
        return <SingleAddressDisplay address={taddr} />;
    }
  };

  const renderTabBar: (props: any) => JSX.Element = (props) => (
    <TabBar {...props} indicatorStyle={{backgroundColor: 'white'}} style={{backgroundColor: colors.background}} />
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
