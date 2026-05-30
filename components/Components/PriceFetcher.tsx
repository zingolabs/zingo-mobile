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
import { getZecPrice } from '../../app/walletBackend';
import RegText from './RegText';
import { ThemeType } from '../../app/types';
import { CurrencyEnum, ModeEnum } from '../../app/AppState';
import Utils from '../../app/utils';

type PriceFetcherProps = {
  setZecPrice: (p: number, d: number) => void;
  textBefore?: string;
  backgroundColor?: string;
};

const PriceFetcher: React.FunctionComponent<PriceFetcherProps> = ({
  setZecPrice,
  textBefore,
  backgroundColor,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, zecPrice, addLastSnackbar, mode, currency } = context;
  const { colors } = useTheme() as ThemeType;
  const bg = backgroundColor ?? colors.card;

  const [refreshMinutes, setRefreshMinutes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fn = () => {
      if (zecPrice.date > 0) {
        setRefreshMinutes(
          Utils.diffInMinutes(new Date(), new Date(zecPrice.date)),
        );
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
    ({ price, error } = await getZecPrice(withTor));
    //console.log('first price fetching', price, error);
    // values:
    // 0   - initial/default value
    // -1  - error in Gemini/zingolib.
    // -2  - error in RPCModule, likely.
    // > 0 - real value
    if (price <= 0) {
      // second attempt
      ({ price, error } = await getZecPrice(withTor));
      //console.log('second price fetching', price, error);
    }

    if (price === -1) {
      addLastSnackbar(`${translate('info.errorgemini')} - ${error}`);
      setLoading(false);
      return;
    }
    if (price === -2) {
      addLastSnackbar(`${translate('info.errorrpcmodule')} - ${error}`);
      setLoading(false);
      return;
    }
    if (price <= 0) {
      addLastSnackbar(`${translate('info.errorgemini')} - ${error}`);
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
            backgroundColor: bg,
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
          onPress={() =>
            mode === ModeEnum.basic ? onPressFetch(false) : onPressFetchAlert()
          }
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bg,
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
              size={16}
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
