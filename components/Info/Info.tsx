/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';

import RPC from '../../app/rpc';
import RegText from '../Components/RegText';
import ZecAmount from '../Components/ZecAmount';
import Button from '../Button';
import Utils from '../../app/utils';
import DetailLine from './components/DetailLine';
import { ThemeType } from '../../app/types';
import { ContextLoaded } from '../../app/context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import FadeText from '../Components/FadeText';

type InfoProps = {
  closeModal: () => void;
  setZecPrice: (p: number, d: number) => void;
};

const Info: React.FunctionComponent<InfoProps> = ({ closeModal, setZecPrice }) => {
  const context = useContext(ContextLoaded);
  const { info, totalBalance, translate, currency, zecPrice } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  const [refreshSure, setRefreshSure] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(0);

  useEffect(() => {
    const fn = () => {
      if (zecPrice.date > 0) {
        const date1 = moment();
        const date2 = moment(zecPrice.date);
        setRefreshMinutes(date1.diff(date2, 'minutes'));
      }
    };

    fn();
    const inter = setInterval(fn, 5000);

    return () => clearInterval(inter);
  }, [zecPrice.date]);

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
        <ZecAmount
          currencyName={info.currencyName ? info.currencyName : ''}
          size={36}
          amtZec={totalBalance.total}
          style={{ opacity: 0.5 }}
        />
        <RegText color={colors.money} style={{ marginTop: 5, padding: 5 }}>
          {translate('info.title')}
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
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <DetailLine label={translate('info.version')} value={translate('zingo') + ' ' + translate('version')} />
          <DetailLine
            label={translate('info.serverversion')}
            value={info.version ? info.version : translate('loading')}
          />
          <DetailLine
            label={translate('info.lightwalletd')}
            value={info.serverUri ? info.serverUri : translate('loading')}
          />
          <DetailLine
            label={translate('info.network')}
            value={
              !info.chain_name
                ? translate('loading')
                : info.chain_name.toLowerCase() === 'main' || info.chain_name.toLowerCase() === 'mainnet'
                ? 'Mainnet'
                : info.chain_name.toLowerCase() === 'test' || info.chain_name.toLowerCase() === 'testnet'
                ? 'Testnet'
                : info.chain_name.toLowerCase() === 'regtest'
                ? 'Regtest'
                : translate('info.unknown') + ' (' + info.chain_name + ')'
            }
          />
          <DetailLine
            label={translate('info.serverblock')}
            value={info.latestBlock ? info.latestBlock.toString() : translate('loading')}
          />
          {currency === 'USD' && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <DetailLine
                label={translate('info.zecprice')}
                value={
                  zecPrice.zecPrice > 0
                    ? `$ ${Utils.toLocaleFloat(zecPrice.zecPrice.toFixed(2))} ${currency} per ${
                        info.currencyName ? info.currencyName : '---'
                      }`
                    : `$ -- ${currency} per ${info.currencyName ? info.currencyName : '---'}`
                }
              />
              {!refreshSure && (
                <TouchableOpacity onPress={() => setRefreshSure(true)}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      margin: 0,
                      padding: 5,
                      marginLeft: 0,
                      minWidth: 48,
                      minHeight: 48,
                    }}>
                    <FontAwesomeIcon icon={faRefresh} size={20} color={colors.primary} />
                    {refreshMinutes > 0 && (
                      <FadeText style={{ paddingLeft: 5 }}>
                        {refreshMinutes.toString() + translate('transactions.minago')}
                      </FadeText>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              {refreshSure && (
                <TouchableOpacity
                  onPress={async () => {
                    setZecPrice(await RPC.rpc_getZecPrice(), Date.now());
                    setRefreshSure(false);
                    setRefreshMinutes(0);
                  }}>
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'red',
                      borderRadius: 10,
                      margin: 0,
                      padding: 5,
                      marginLeft: 5,
                      minWidth: 48,
                      minHeight: 48,
                      borderColor: colors.primary,
                      borderWidth: 1,
                    }}>
                    <FontAwesomeIcon icon={faRefresh} size={20} color={colors.primary} style={{ marginRight: 5 }} />
                    <RegText color={colors.primary}>{translate('transactions.sure')}</RegText>
                  </View>
                </TouchableOpacity>
              )}
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
        <Button type="Secondary" title={translate('close')} onPress={closeModal} />
      </View>
    </SafeAreaView>
  );
};

export default Info;
