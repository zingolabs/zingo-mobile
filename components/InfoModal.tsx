/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView, SafeAreaView, Image} from 'react-native';
import {PrimaryButton, RegText} from './Components';
import {useTheme} from '@react-navigation/native';
import {Info} from 'app/AppState';

type DetailLineProps = {
  label: string;
  value?: string | number;
};
const DetailLine: React.FunctionComponent<DetailLineProps> = ({label, value}) => {
  const {colors} = useTheme();

  return (
    <View style={{display: 'flex', marginTop: 20}}>
      <RegText>{label}</RegText>
      <RegText color={colors.primary}>{value}</RegText>
    </View>
  );
};

type InfoModalProps = {
  info: Info | null;
  closeModal: () => void;
};

const InfoModal: React.FunctionComponent<InfoModalProps> = ({info, closeModal}) => {
  const {colors} = useTheme();
  const url = 'https://lightwalletd.zecwallet.co:1443';
  const height = info?.latestBlock;

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
          margin: 10,
        }}>
        <View style={{display: 'flex', alignItems: 'center'}}>
          <Image
            source={require('../assets/img/logobig.png')}
            style={{width: 100, height: 100, resizeMode: 'contain'}}
          />
        </View>

        <DetailLine label="Wallet Version" value="Zecwallet Lite v0.1" />
        <DetailLine label="Server Version" value={info?.version} />
        <DetailLine label="Lightwallet Server URL" value={url} />
        <DetailLine label="Network" value={info?.testnet ? 'Testnet' : 'Mainnet'} />
        <DetailLine label="Server Block Height" value={height} />
      </ScrollView>

      <View style={{flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
        <PrimaryButton title="Close" onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default InfoModal;
