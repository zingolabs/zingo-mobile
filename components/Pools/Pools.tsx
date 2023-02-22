/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { useTheme } from '@react-navigation/native';

import ZecAmount from '../Components/ZecAmount';
import BoldText from '../Components/BoldText';
import Button from '../Components/Button';
import DetailLine from '../Components/DetailLine';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import RPC from '../../app/rpc';
import Header from '../Header';

type PoolsProps = {
  closeModal: () => void;
};

const Pools: React.FunctionComponent<PoolsProps> = ({ closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { totalBalance, info, translate } = context;
  const { colors } = useTheme() as unknown as ThemeType;

  useEffect(() => {
    (async () => await RPC.rpc_setInterruptSyncAfterBatch('false'))();
  }, []);

  //console.log(totalBalance);

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header title={translate('pools.title')} noBalance={true} noSyncingStatus={true} noDrawMenu={true} />

      <ScrollView
        style={{ maxHeight: '85%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}>
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <BoldText>{translate('pools.orchard-title')}</BoldText>

          <View style={{ display: 'flex', marginLeft: 25 }}>
            <DetailLine label={translate('pools.orchard-balance')}>
              <ZecAmount
                amtZec={totalBalance.orchardBal}
                size={18}
                currencyName={info.currencyName ? info.currencyName : ''}
                style={{
                  opacity:
                    totalBalance.spendableOrchard > 0 && totalBalance.spendableOrchard === totalBalance.orchardBal
                      ? 1
                      : 0.5,
                }}
              />
            </DetailLine>
            <DetailLine label={translate('pools.orchard-spendable-balance')}>
              <ZecAmount
                amtZec={totalBalance.spendableOrchard}
                size={18}
                currencyName={info.currencyName ? info.currencyName : ''}
                color={
                  totalBalance.spendableOrchard > 0 && totalBalance.spendableOrchard === totalBalance.orchardBal
                    ? colors.primary
                    : 'red'
                }
              />
            </DetailLine>
          </View>

          <View style={{ height: 1, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }} />

          <BoldText>{translate('pools.sapling-title')}</BoldText>

          <View style={{ display: 'flex', marginLeft: 25 }}>
            <DetailLine label={translate('pools.sapling-balance')}>
              <ZecAmount
                amtZec={totalBalance.privateBal}
                size={18}
                currencyName={info.currencyName ? info.currencyName : ''}
                style={{
                  opacity:
                    totalBalance.spendablePrivate > 0 && totalBalance.spendablePrivate === totalBalance.privateBal
                      ? 1
                      : 0.5,
                }}
              />
            </DetailLine>
            <DetailLine label={translate('pools.sapling-spendable-balance')}>
              <ZecAmount
                amtZec={totalBalance.spendablePrivate}
                size={18}
                currencyName={info.currencyName ? info.currencyName : ''}
                color={
                  totalBalance.spendablePrivate > 0 && totalBalance.spendablePrivate === totalBalance.privateBal
                    ? colors.primary
                    : 'red'
                }
              />
            </DetailLine>
          </View>

          <View style={{ height: 1, width: '100%', backgroundColor: 'white', marginTop: 15, marginBottom: 10 }} />

          <BoldText>{translate('pools.transparent-title')}</BoldText>

          <View style={{ display: 'flex', marginLeft: 25 }}>
            <DetailLine label={translate('pools.transparent-balance')}>
              <ZecAmount
                amtZec={totalBalance.transparentBal}
                size={18}
                currencyName={info.currencyName ? info.currencyName : ''}
              />
            </DetailLine>
          </View>
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

export default Pools;
