/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View, ScrollView } from 'react-native';

import { useTheme } from '@react-navigation/native';

import DetailLine from '../Components/DetailLine';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import Header from '../Header';
import CurrencyAmount from '../Components/CurrencyAmount';
import RegText from '../Components/RegText';
import {
  ChainNameEnum,
  CurrencyEnum,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { getZingoVersion } from '../../app/utils/zingoVersion';

type InfoProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.Info>;

const Info: React.FunctionComponent<InfoProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, currency, zecPrice, setZecPrice } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Info;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <Header
        title={translate('info.title') as string}
        screenName={screenName}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        noUfvkIcon={true}
        closeScreen={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />
      <ScrollView
        style={{ maxHeight: '90%' }}
        contentContainerStyle={{
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
        }}
      >
        <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
          <DetailLine
            label={translate('info.version') as string}
            value={translate('zingo') + ' ' + getZingoVersion()}
          />
          <DetailLine
            label={translate('info.serverversion') as string}
            value={info.version ? info.version : '-'}
          />
          <DetailLine
            label={translate('info.zainod') as string}
            value={info.serverUri ? info.serverUri : '-'}
          />
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
                      : (translate('info.unknown') as string) +
                        ' (' +
                        info.chainName +
                        ')'
            }
          />
          <DetailLine
            label={translate('info.serverblock') as string}
            value={info.latestBlock ? info.latestBlock.toString() : '-'}
          />
          {(currency === CurrencyEnum.USDCurrency ||
            currency === CurrencyEnum.USDTORCurrency) && (
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <DetailLine
                label={
                  (currency === CurrencyEnum.USDTORCurrency
                    ? translate('info.zecpricetor')
                    : translate('info.zecprice')) as string
                }
              >
                {zecPrice.zecPrice === -1 && (
                  <RegText color={colors.text}>
                    {translate('info.errorgemini') as string}
                  </RegText>
                )}
                {zecPrice.zecPrice === -2 && (
                  <RegText color={colors.text}>
                    {translate('info.errorrpcmodule') as string}
                  </RegText>
                )}
                <CurrencyAmount
                  price={zecPrice.zecPrice}
                  amtZec={1}
                  currency={currency}
                  privacy={false}
                />
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
