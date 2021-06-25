/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView, SafeAreaView, Image, Text} from 'react-native';
import {SecondaryButton, RegText, FadeText} from './Components';
import {useTheme} from '@react-navigation/native';
import {Info} from '../app/AppState';

type DetailLineProps = {
  label: string;
  value?: string | number;
};
const DetailLine: React.FunctionComponent<DetailLineProps> = ({label, value}) => {
  return (
    <View style={{display: 'flex', marginTop: 20}}>
      <FadeText>{label}</FadeText>
      <RegText>{value}</RegText>
    </View>
  );
};

type InfoModalProps = {
  info: Info | null;
  closeModal: () => void;
};

const InfoModal: React.FunctionComponent<InfoModalProps> = ({info, closeModal}) => {
  const {colors} = useTheme();
  const height = info?.latestBlock;
  const price = info?.zecPrice ? `$ ${info?.zecPrice?.toFixed(2)}` : '-';

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
        <View>
          <View style={{alignItems: 'center', backgroundColor: colors.card, paddingBottom: 25}}>
            <Text style={{marginTop: 5, padding: 5, color: colors.text, fontSize: 28}}>Server Info</Text>
          </View>
          <View style={{display: 'flex', alignItems: 'center', marginTop: -25}}>
            <Image
              source={require('../assets/img/logobig.png')}
              style={{width: 50, height: 50, resizeMode: 'contain'}}
            />
          </View>
        </View>

        <View style={{display: 'flex', margin: 10}}>
          <DetailLine label="Wallet Version" value="Zecwallet Lite v1.6.3" />
          <DetailLine label="Server Version" value={info?.version} />
          <DetailLine label="Lightwallet Server URL" value={info?.serverUri} />
          <DetailLine label="Network" value={info?.testnet ? 'Testnet' : 'Mainnet'} />
          <DetailLine label="Server Block Height" value={height} />
          {/* <DetailLine label="Wallet Block Height" value={walletHeight} /> */}
          <DetailLine label="ZEC Price" value={price} />
        </View>
      </ScrollView>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <SecondaryButton title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default InfoModal;
