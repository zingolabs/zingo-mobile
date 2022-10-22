/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {View, ScrollView, SafeAreaView, Image, Text} from 'react-native';
import {RegText, FadeText, ZecAmount, UsdAmount} from './Components';
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
  const colors = useTheme();
  return (
    <View style={{display: 'flex', marginTop: 20}}>
      <FadeText>{label}</FadeText>
      <RegText color={colors.text}>{value}</RegText>
    </View>
  );
};

type InfoModalProps = {
  info: Info | null;
  closeModal: () => void;
  totalBalance: object;
  currencyName: string;
};

const InfoModal: React.FunctionComponent<InfoModalProps> = ({info, closeModal, totalBalance, currencyName}) => {
  const {colors} = useTheme();
  const [infoState, setInfoState] = React.useState({});

  React.useEffect(() => {
    (async () => {
      const infoNew = await RPC.rpc_getInfoObject();

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
      <View
        style={{display: 'flex', alignItems: 'center', paddingBottom: 10, backgroundColor: colors.card, zIndex: -1, paddingTop: 10}}>
        <Image source={require('../assets/img/logobig-zingo.png')} style={{width: 80, height: 80, resizeMode: 'contain'}} />
        <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{opacity: 0.4}} />
        <RegText color={colors.money} style={{marginTop: 5, padding: 5}}>Server Info</RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary}}></View>
      </View>

      <ScrollView
        style={{maxHeight: '85%'}}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{display: 'flex', margin: 20}}>
          <DetailLine label="Version" value="Zingo! v0.0.50" />
          <DetailLine label="Server Version" value={infoState.version ? infoState.version : '...loading...'} />
          <DetailLine label="Lightwalletd URL" value={infoState.serverUri ? infoState.serverUri : '...loading...'} />
          <DetailLine
            label="Network"
            value={
              infoState.chain_name === undefined
                ? '...loading...'
                : infoState.chain_name === 'main'
                  ? 'Mainnet'
                  : infoState.chain_name === 'test'
                    ? 'Testnet'
                    : infoState.chain_name}
          />
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
