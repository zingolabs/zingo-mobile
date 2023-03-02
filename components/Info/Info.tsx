/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import Button from '../Components/Button';
import Utils from '../../app/utils';
import DetailLine from '../Components/DetailLine';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import Header from '../Header';

type InfoProps = {
  closeModal: () => void;
  setZecPrice: (p: number, d: number) => void;
};

const Info: React.FunctionComponent<InfoProps> = ({ closeModal, setZecPrice }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, currency, zecPrice } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header title={translate('info.title') as string} noBalance={true} noSyncingStatus={true} noDrawMenu={true} />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <DetailLine
            label={translate('info.version') as string}
            value={translate('zingo') + ' ' + translate('version')}
          />
          <DetailLine
            label={translate('info.serverversion') as string}
            value={info.version ? info.version : (translate('loading') as string)}
          />
          <DetailLine
            label={translate('info.lightwalletd') as string}
            value={info.serverUri ? info.serverUri : (translate('loading') as string)}
          />
          <DetailLine
            label={translate('info.network') as string}
            value={
              !info.chain_name
                ? (translate('loading') as string)
                : info.chain_name.toLowerCase() === 'main' || info.chain_name.toLowerCase() === 'mainnet'
                ? 'Mainnet'
                : info.chain_name.toLowerCase() === 'test' || info.chain_name.toLowerCase() === 'testnet'
                ? 'Testnet'
                : info.chain_name.toLowerCase() === 'regtest'
                ? 'Regtest'
                : (translate('info.unknown') as string) + ' (' + info.chain_name + ')'
            }
          />
          <DetailLine
            label={translate('info.serverblock') as string}
            value={info.latestBlock ? info.latestBlock.toString() : (translate('loading') as string)}
          />
          {currency === 'USD' && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <DetailLine
                label={translate('info.zecprice') as string}
                value={
                  zecPrice.zecPrice > 0
                    ? `$ ${Utils.toLocaleFloat(zecPrice.zecPrice.toFixed(2))} ${currency} per ${
                        info.currencyName ? info.currencyName : '---'
                      }`
                    : `$ -- ${currency} per ${info.currencyName ? info.currencyName : '---'}`
                }
              />
              <View style={{ marginLeft: 5 }}>
                <PriceFetcher setZecPrice={setZecPrice} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={{
          flexGrow: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginVertical: 5,
        }}>
        <Button type="Secondary" title={translate('close') as string} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default Info;
