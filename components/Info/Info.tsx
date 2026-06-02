/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';

import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import DetailLine from '../Components/DetailLine';
import { AppDrawerParamList, ThemeType } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import PriceFetcher from '../Components/PriceFetcher';
import Header from '../Header';
import CurrencyAmount from '../Components/CurrencyAmount';
import RegText from '../Components/RegText';
import BoldText from '../Components/BoldText';
import {
  ChainNameEnum,
  CurrencyEnum,
  RouteEnum,
  ScreenEnum,
} from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getZingoName, getZingoVersion } from '../../app/utils/ZingoAppData';
import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type InfoProps = NativeStackScreenProps<AppDrawerParamList, RouteEnum.Info>;

const Info: React.FunctionComponent<InfoProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const { info, translate, currency, zecPrice, setZecPrice } = context;
  const { colors } = useTheme() as ThemeType;
  const screenName = ScreenEnum.Info;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const infoSheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const infoSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const renderInfoHandle = useCallback(
    () => (
      <View
        style={{
          paddingTop: 12,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          borderTopWidth: 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderTopColor: colors.bottomSheetBorder,
          borderLeftColor: colors.bottomSheetBorder,
          borderRightColor: colors.bottomSheetBorder,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            onPress={closeScreen}
            hitSlop={8}
            style={{ paddingHorizontal: 4, paddingVertical: 4 }}
          >
            <FontAwesomeIcon
              icon={faChevronLeft}
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
          <BoldText
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 28,
              textAlign: 'center',
            }}
          >
            {translate('info.title') as string}
          </BoldText>
          <View style={{ width: 28 }} />
        </View>
      </View>
    ),
    [colors, closeScreen, translate],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
      onLayout={e => setContainerH(e.nativeEvent.layout.height)}
    >
      <View onLayout={e => setHeaderH(e.nativeEvent.layout.height)}>
        <Header
          title={''}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
        />
      </View>
      <BottomSheet
        ref={infoSheetRef}
        snapPoints={infoSnapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        handleComponent={renderInfoHandle}
      >
        <BottomSheetScrollView
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
            backgroundColor: colors.bottomSheetBackground,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
            <DetailLine
              label={translate('info.version') as string}
              value={getZingoName() + ' ' + getZingoVersion()}
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
                  <PriceFetcher
                    setZecPrice={setZecPrice}
                    backgroundColor={colors.bottomSheetBackground}
                  />
                </View>
              </View>
            )}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default Info;
