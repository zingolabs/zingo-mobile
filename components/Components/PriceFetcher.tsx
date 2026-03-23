/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  AlertButton,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faRefresh } from '@fortawesome/free-solid-svg-icons';
import FadeText from './FadeText';
import { ContextAppLoaded } from '../../app/context';
import moment from 'moment';
import WalletSession from '../../app/rpc';
import RegText from './RegText';
import { ThemeType } from '../../app/types';
import { CurrencyEnum, ScreenEnum } from '../../app/AppState';
import Utils from '../../app/utils';

type PriceFetcherProps = {
  setZecPrice: (p: number, d: number) => void;
  screenName: ScreenEnum;
  textBefore?: string;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({
  setZecPrice,
  screenName,
  textBefore,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, zecPrice, addLastSnackbar, language, currency } = context;
  const { colors } = useTheme() as ThemeType;

  const [refreshMinutes, setRefreshMinutes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    Utils.setMomentLocale(language);
  }, [language]);

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
      return (
        (min / 60).toFixed(0).toString() +
        ':' +
        (min % 60).toFixed(0).toString().padStart(2, '0')
      );
    }
  };

  const onPressFetch = async (withTor: boolean) => {
    setLoading(true);
    let price: number;
    let error: string;
    // first attempt
    ({ price, error } = await WalletSession.rpcGetZecPrice(withTor));
    //console.log('first price fetching', price, error);
    // values:
    // 0   - initial/default value
    // -1  - error in Gemini/zingolib.
    // -2  - error in RPCModule, likely.
    // > 0 - real value
    if (price <= 0) {
      // second attempt
      ({ price, error } = await WalletSession.rpcGetZecPrice(withTor));
      //console.log('second price fetching', price, error);
    }

    if (price === -1) {
      addLastSnackbar({
        message: `${translate('info.errorgemini')} - ${error}`,
        screenName: [screenName],
      });
      setLoading(false);
      return;
    }
    if (price === -2) {
      addLastSnackbar({
        message: `${translate('info.errorrpcmodule')} - ${error}`,
        screenName: [screenName],
      });
      setLoading(false);
      return;
    }
    if (price <= 0) {
      addLastSnackbar({
        message: `${translate('info.errorgemini')} - ${error}`,
        screenName: [screenName],
      });
      setZecPrice(price, 0);
    } else {
      setZecPrice(price, Date.now());
    }
    setRefreshMinutes(0);
    // the app needs time to recover the price from the context.
    setTimeout(() => {
      setLoading(false);
    }, 1 * 1000);
  };

  const onPressFetchAlert = () => {
    const buttons: AlertButton[] = [
      ...[
        currency === CurrencyEnum.USDCurrency
          ? {
              text: translate('send.fetch-button') as string,
              onPress: () => onPressFetch(false),
            }
          : {},
      ],
      ...[
        currency === CurrencyEnum.USDCurrency ||
        currency === CurrencyEnum.USDTORCurrency
          ? {
              text: translate('send.fetchwithtor-button') as string,
              onPress: () => onPressFetch(true),
            }
          : {},
      ],
      { text: translate('cancel') as string, style: 'cancel' },
    ];
    Alert.alert(
      translate('send.fetchpricetitle') as string,
      translate('send.fetchpricebody') as string,
      buttons.filter((b: AlertButton) => !!b.text),
      { cancelable: false },
    );
  };

  return (
    <>
      {loading && (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.background,
            margin: 0,
            marginTop: 10,
            padding: 5,
            minWidth: 40,
            minHeight: 40,
            rowGap: 5,
            columnGap: 10,
          }}
        >
          {textBefore && (
            <RegText style={{ color: colors.text }}>{textBefore}</RegText>
          )}
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {!loading && (
        <TouchableOpacity
          disabled={loading}
          onPress={() => onPressFetchAlert()}
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.background,
              margin: 0,
              marginTop: 10,
              padding: 5,
              minWidth: 40,
              minHeight: 40,
              rowGap: 5,
              columnGap: 10,
            }}
          >
            {textBefore && (
              <RegText style={{ color: colors.text }}>{textBefore}</RegText>
            )}
            <FontAwesomeIcon
              icon={faRefresh}
              size={20}
              color={colors.primary}
            />
            {refreshMinutes > 0 && (
              <FadeText>
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
