/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import FadeText from './FadeText';
import { ContextLoaded } from '../../app/context';
import moment from 'moment';
import RPC from '../../app/rpc';
import RegText from './RegText';

type PriceFetcherProps = {
  setZecPrice: (p: number, d: number) => void;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({ setZecPrice }) => {
  const context = useContext(ContextLoaded);
  const { translate, zecPrice } = context;
  const [refreshSure, setRefreshSure] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(0);
  const [count, setCount] = useState(5);
  const { colors } = useTheme();

  useEffect(() => {
    const fn = () => {
      if (zecPrice.date > 0) {
        const date1 = moment();
        const date2 = moment(zecPrice.date);
        setRefreshMinutes(date1.diff(date2, 'minutes'));
      }
    };

    fn();
    const inter = setInterval(fn, 1000);

    return () => clearInterval(inter);
  }, [zecPrice.date]);

  useEffect(() => {
    let inter: number = 0;
    const fn = () => {
      if (count > 0) {
        setCount(count - 1);
      }
      if (count <= 0) {
        clearInterval(inter);
        setRefreshSure(false);
        setCount(5);
      }
    };

    if (refreshSure) {
      inter = setInterval(fn, 1000);
    } else {
      clearInterval(inter);
    }

    return () => clearInterval(inter);
  }, [count, refreshSure]);

  const formatMinutes = (min: number) => {
    if (min < 60) {
      return min.toString();
    } else {
      return (min / 60).toFixed(0).toString() + ':' + (min % 60).toFixed(0).toString();
    }
  };

  return (
    <>
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
                {formatMinutes(refreshMinutes) + translate('transactions.minago')}
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
            setCount(5);
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
            <RegText color={colors.card} style={{ fontSize: 15 }}>
              {count.toString()}
            </RegText>
          </View>
        </TouchableOpacity>
      )}
    </>
  );
};

export default PriceFetcher;
