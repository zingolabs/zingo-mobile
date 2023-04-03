/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import Toast from 'react-native-simple-toast';
import FadeText from './FadeText';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import RPC from '../../app/rpc';
import RegText from './RegText';

type PriceFetcherProps = {
  setZecPrice?: (p: number, d: number) => void;
  textBefore?: string;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({ setZecPrice, textBefore }) => {
  const context = useContext(ContextAppLoaded);
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
    const inter: NodeJS.Timeout = setInterval(fn, 1000);

    return () => clearInterval(inter);
  }, [zecPrice.date]);

  useEffect(() => {
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

    let inter: NodeJS.Timeout;
    if (refreshSure) {
      inter = setInterval(fn, 1000);
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
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.card,
              borderRadius: 10,
              margin: 0,
              padding: 5,
              minWidth: 40,
              minHeight: 40,
            }}>
            {textBefore && <RegText style={{ marginRight: 10, color: colors.text }}>{textBefore}</RegText>}
            <FontAwesomeIcon icon={faRefresh} size={20} color={colors.primary} />
            {refreshMinutes > 0 && (
              <FadeText style={{ marginLeft: 5 }}>
                {formatMinutes(refreshMinutes) + translate('history.minago')}
              </FadeText>
            )}
          </View>
        </TouchableOpacity>
      )}
      {refreshSure && (
        <TouchableOpacity
          onPress={async () => {
            if (setZecPrice) {
              const price = await RPC.rpc_getZecPrice();
              // values:
              // 0   - initial/default value
              // -1  - error in Gemini/zingolib/RPCModule.
              // > 0 - real value
              if (price === -1) {
                Toast.show(translate('info.errorgemini') as string, Toast.LONG);
              }
              setZecPrice(price, Date.now());
              setRefreshSure(false);
              setRefreshMinutes(0);
              setCount(5);
            }
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'red',
              borderRadius: 10,
              margin: 0,
              padding: 5,
              minWidth: 40,
              minHeight: 40,
              borderColor: colors.primary,
              borderWidth: 1,
            }}>
            <View
              style={{
                position: 'relative',
                flexDirection: 'row',
                minWidth: 25,
                minHeight: 40,
              }}>
              <FontAwesomeIcon
                icon={faRefresh}
                size={20}
                color={colors.background}
                style={{ position: 'absolute', top: 11, left: 0 }}
              />
              <RegText
                color={colors.text}
                style={{
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? 13 : 10,
                  left: 6,
                  fontSize: 13,
                  fontWeight: 'bold',
                }}>
                {count.toString()}
              </RegText>
            </View>
            <RegText color={colors.background}>{translate('history.sure') as string}</RegText>
          </View>
        </TouchableOpacity>
      )}
    </>
  );
};

export default PriceFetcher;
