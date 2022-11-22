/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, ScrollView, SafeAreaView, Image } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { TranslateOptions } from 'i18n-js';

import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import { InfoType, TotalBalance } from '../../app/AppState';
import Utils from '../../app/utils';
import RPC from '../../app/rpc';
import DetailLine from './components/DetailLine';
import { ThemeType } from '../../app/types';

type InfoProps = {
  info: InfoType | null;
  closeModal: () => void;
  totalBalance: TotalBalance;
  currencyName?: string;
  translate: (key: string, config?: TranslateOptions) => any;
};

const Info: React.FunctionComponent<InfoProps> = ({ info, closeModal, totalBalance, currencyName, translate }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  const [infoState, setInfoState] = React.useState({} as InfoType);

  React.useEffect(() => {
    (async () => {
      const infoNew = await RPC.rpc_getInfoObject();

      //console.log('info', infoNew);

      if (infoNew) {
        setInfoState(infoNew);
      }
    })();
  }, [info]);

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
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 10,
          backgroundColor: colors.card,
          zIndex: -1,
          paddingTop: 10,
        }}>
        <Image
          source={require('../../assets/img/logobig-zingo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain' }}
        />
        <ZecAmount currencyName={currencyName} size={36} amtZec={totalBalance.total} style={{ opacity: 0.4 }} />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          Server Info
        </RegText>
        <View style={{ width: '100%', height: 1, backgroundColor: colors.primary }} />
      </View>

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 20 }}>
          <DetailLine label={translate('info.version')} value={translate('zingo') + ' ' + translate('version')} />
          <DetailLine
            label={translate('info.serverversion')}
            value={infoState.version ? infoState.version : translate('loading')}
          />
          <DetailLine
            label={translate('info.lightwalletd')}
            value={infoState.serverUri ? infoState.serverUri : translate('loading')}
          />
          <DetailLine
            label={translate('info.network')}
            value={
              infoState.chain_name === undefined
                ? translate('loading')
                : infoState.chain_name.toLowerCase() === 'main' || infoState.chain_name.toLowerCase() === 'mainnet'
                ? 'Mainnet'
                : infoState.chain_name.toLowerCase() === 'test' || infoState.chain_name.toLowerCase() === 'testnet'
                ? 'Testnet'
                : infoState.chain_name.toLowerCase() === 'regtest'
                ? 'Regtest'
                : translate('info.unknown') + ' (' + infoState.chain_name + ')'
            }
          />
          <DetailLine label={translate('info.serverblock')} value={info?.latestBlock} />
          {/* <DetailLine label="Wallet Block Height" value={walletHeight} /> */}
          <DetailLine
            label={translate('info.zecprice')}
            value={info?.zecPrice ? `$ ${Utils.toLocaleFloat(info?.zecPrice?.toFixed(2))}` : '--'}
          />
        </View>
      </ScrollView>

      <View style={{ flexGrow: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <Button type="Secondary" title={translate('close')} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default Info;
