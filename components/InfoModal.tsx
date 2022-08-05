/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView, SafeAreaView, Image, Text} from 'react-native';
import {RegText, FadeText, ZecAmount, UsdAmount, zecPrice} from './Components';
import Button from './Button';
import {useTheme} from '@react-navigation/native';
import {Info} from '../app/AppState';
import Utils from '../app/utils';
import RPC from '../app/rpc'

type DetailLineProps = {
  label: string;
  value?: string | number;
};
const DetailLine: React.FunctionComponent<DetailLineProps> = ({label, value}) => {
  return (
    <View style={{display: 'flex', marginTop: 20}}>
      <FadeText>{label}</FadeText>
      <RegText color="#777777">{value}</RegText>
    </View>
  );
};

type InfoModalProps = {
  info: Info | null;
  closeModal: () => void;
};

const InfoModal: React.FunctionComponent<InfoModalProps> = ({info, closeModal, totalBalance}) => {
  const {colors} = useTheme();
  const [infoState, setInfoState] = React.useState({});

  React.useEffect(() => {
    (async () => {
      const infoNew = await RPC.getInfoObject();

      //console.log('info', infoNew);

      if (infoNew) {
        setInfoState(infoNew);
      }
    })();
  }, [info])

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View
          style={{display: 'flex', alignItems: 'center', paddingBottom: 25, backgroundColor: colors.card, zIndex: -1}}>
          <RegText color={'#ffffff'} style={{marginTop: 5, padding: 5}}>Server Info</RegText>
          <ZecAmount size={36} amtZec={totalBalance.total} style={{opacity: 0.2}} />
        </View>
        <View>
          <View style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -30}}>
            <Image source={require('../assets/img/logobig-zingo.png')} style={{width: 50, height: 50, resizeMode: 'contain'}} />
            <Text style={{ color: '#777777', fontSize: 40, fontWeight: 'bold' }}> ZingoZcash</Text>
          </View>
        </View>

        <View style={{display: 'flex', margin: 20}}>
          <DetailLine label="Version" value="ZingoZcash v0.0.1" />
          <DetailLine label="Server Version" value={infoState.version ? infoState.version : '...loading...'} />
          <DetailLine label="Lightwallet Server URL" value={infoState.serverUri ? infoState.serverUri : '...loading...'} />
          <DetailLine label="Network" value={infoState.testnet === undefined ? '...loading...' : infoState.testnet ? 'Testnet' : 'Mainnet'} />
          <DetailLine label="Server Block Height" value={info?.latestBlock} />
          {/* <DetailLine label="Wallet Block Height" value={walletHeight} /> */}
          <DetailLine label="ZEC Price" value={info?.zecPrice ? `$ ${Utils.toLocaleFloat(info?.zecPrice?.toFixed(2))}` : '-'} />
        </View>
      </ScrollView>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <Button type="Secondary" title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default InfoModal;
