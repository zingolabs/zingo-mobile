/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
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
  const { translate, zecPrice, addLastSnackbar, mode } = context;
  const [refreshMinutes, setRefreshMinutes] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const formatMinutes = (min: number) => {
    if (min < 60) {
      return min.toString();
    } else {
      return (min / 60).toFixed(0).toString() + ':' + (min % 60).toFixed(0).toString();
    }
  };

  const onPressFetch = async () => {
    if (setZecPrice) {
      setLoading(true);
      const price = await RPC.rpc_getZecPrice();
      // values:
      // 0   - initial/default value
      // -1  - error in Gemini/zingolib.
      // -2  - error in RPCModule, likely.
      // > 0 - real value
      if (price === -1) {
        addLastSnackbar({ message: translate('info.errorgemini') as string, type: 'Primary' });
      }
      if (price === -2) {
        addLastSnackbar({ message: translate('info.errorrpcmodule') as string, type: 'Primary' });
      }
      if (price <= 0) {
        setZecPrice(price, 0);
      } else {
        setZecPrice(price, Date.now());
      }
      setRefreshMinutes(0);
      setLoading(false);
    }
  };

  const onPressFetchAlert = () => {
    Alert.alert(
      translate('send.fetchpricetitle') as string,
      translate('send.fetchpricebody') as string,
      [
        { text: translate('send.fetch-button') as string, onPress: () => onPressFetch() },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
      { cancelable: true, userInterfaceStyle: 'light' },
    );
  };

  return (
    <>
      {loading && (
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
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {!loading && (
        <TouchableOpacity disabled={loading} onPress={() => (mode === 'basic' ? onPressFetch() : onPressFetchAlert())}>
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
    </>
  );
};

export default PriceFetcher;
