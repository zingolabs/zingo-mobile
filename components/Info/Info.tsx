/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@react-navigation/native';

import DetailLine from '../Components/DetailLine';
import { ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import Header from '../Header';
import CurrencyAmount from '../Components/CurrencyAmount';
import RegText from '../Components/RegText';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { ChainNameEnum, CurrencyEnum } from '../../app/AppState';
import { useMagicModal } from 'react-native-magic-modal';
import Snackbars from '../Components/Snackbars';

type InfoProps = {
};

const Info: React.FunctionComponent<InfoProps> = () => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, currency, zecPrice, privacy, language, setZecPrice, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);

  return (
    <View
      style={{
        marginTop: top,
        marginBottom: bottom,
        marginRight: right,
        marginLeft: left,
        flex: 1,
        backgroundColor: colors.background,
      }}>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        translate={translate}
      />

      <Header
        title={translate('info.title') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        closeScreen={hide}
      />
      <ScrollView
        style={{ maxHeight: '90%' }}
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
          <DetailLine label={translate('info.serverversion') as string} value={info.version ? info.version : '-'} />
          <DetailLine label={translate('info.lightwalletd') as string} value={info.serverUri ? info.serverUri : '-'} />
          <DetailLine
            label={translate('info.network') as string}
            value={
              !info.chainName
                ? '-'
                : info.chainName === ChainNameEnum.mainChainName
                ? 'Mainnet'
                : info.chainName === ChainNameEnum.testChainName
                ? 'Testnet'
                : info.chainName === ChainNameEnum.regtestChainName
                ? 'Regtest'
                : (translate('info.unknown') as string) + ' (' + info.chainName + ')'
            }
          />
          <DetailLine
            label={translate('info.serverblock') as string}
            value={info.latestBlock ? info.latestBlock.toString() : '-'}
          />
          {currency === CurrencyEnum.USDCurrency && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <DetailLine label={translate('info.zecprice') as string}>
                {zecPrice.zecPrice === -1 && (
                  <RegText color={colors.text}>{translate('info.errorgemini') as string}</RegText>
                )}
                {zecPrice.zecPrice === -2 && (
                  <RegText color={colors.text}>{translate('info.errorrpcmodule') as string}</RegText>
                )}
                <CurrencyAmount price={zecPrice.zecPrice} amtZec={1} currency={currency} privacy={privacy} />
              </DetailLine>
              <View style={{ marginLeft: 5 }}>
                <PriceFetcher setZecPrice={setZecPrice} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default Info;
