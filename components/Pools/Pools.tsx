/* eslint-disable react-native/no-inline-styles */
import React, { useCallback, useContext, useRef, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';

import { useTheme } from '../../app/theme';

import ZecAmount from '../Components/ZecAmount';
import BoldText from '../Components/BoldText';
import AppSheet from '../Components/AppSheet';
import DetailLine from '../Components/DetailLine';
import { AppDrawerParamList } from '../../app/types';
import { ContextAppLoaded } from '../../app/context';
import Header from '../Header';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import FadeText from '../Components/FadeText';
import { faChevronLeft, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { RouteEnum, ScreenEnum } from '../../app/AppState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useFullSheetSnapPoints } from '../../app/hooks/useFullSheetSnapPoints';

type PoolsProps = NativeStackScreenProps<AppDrawerParamList, RouteEnum.Pools>;

const Pools: React.FunctionComponent<PoolsProps> = ({ navigation }) => {
  const context = useContext(ContextAppLoaded);
  const {
    totalBalance,
    info,
    translate,
    privacy,
    addLastSnackbar,
    somePending,
    shieldingAmount,
    orchardPool,
    saplingPool,
    transparentPool,
    setPrivacyOption,
  } = context;
  const { colors } = useTheme();
  const screenName = ScreenEnum.Pools;

  const [containerH, setContainerH] = useState<number>(0);
  const [headerH, setHeaderH] = useState<number>(0);
  const poolsSheetRef = useRef<BottomSheet>(null);

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const poolsSnapPoints = useFullSheetSnapPoints(containerH, headerH);

  const poolsHeader = (
    <View
      style={{
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 16,
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
            color={colors.fgAccent}
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
          {translate('pools.title') as string}
        </BoldText>
        <View style={{ width: 28 }} />
      </View>
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgCanvas,
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
          noUfvkIcon={true}
          setPrivacyOption={setPrivacyOption}
          addLastSnackbar={addLastSnackbar}
        />
      </View>
      <AppSheet
        ref={poolsSheetRef}
        snapPoints={poolsSnapPoints}
        header={poolsHeader}
      >
        <BottomSheetScrollView
          bounces={false}
          alwaysBounceVertical={false}
          style={{
            flex: 1,
          }}
          contentContainerStyle={{
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
          }}
        >
          <View style={{ display: 'flex', margin: 20, marginBottom: 30 }}>
            {totalBalance && (
              <>
                {!orchardPool && !saplingPool && !transparentPool && (
                  <ActivityIndicator
                    size="large"
                    color={colors.fgAccent}
                    style={{ marginVertical: 20 }}
                  />
                )}
                {/* Ironwood (NU6.3) — the new shielded pool, shown at the top
                    as the migration destination. */}
                <>
                  <BoldText>
                    {translate('pools.ironwood-title') as string}
                  </BoldText>

                  <View style={{ display: 'flex', marginLeft: 25 }}>
                    <DetailLine
                      label={translate('pools.ironwood-balance') as string}
                    >
                      <ZecAmount
                        testID="ironwood-total-balance"
                        amtZec={totalBalance.totalIronwoodBalance}
                        size={14}
                        currencyName={info.currencyName}
                        style={{
                          opacity:
                            totalBalance.confirmedIronwoodBalance > 0 &&
                            totalBalance.confirmedIronwoodBalance ===
                              totalBalance.totalIronwoodBalance
                              ? 1
                              : 0.5,
                        }}
                        privacy={privacy}
                      />
                    </DetailLine>
                    <DetailLine
                      label={
                        translate('pools.ironwood-confirmed-balance') as string
                      }
                    >
                      <ZecAmount
                        testID="ironwood-confirmed-balance"
                        amtZec={totalBalance.confirmedIronwoodBalance}
                        size={14}
                        currencyName={info.currencyName}
                        color={
                          totalBalance.confirmedIronwoodBalance > 0 &&
                          totalBalance.confirmedIronwoodBalance ===
                            totalBalance.totalIronwoodBalance
                            ? colors.fgAccent
                            : 'red'
                        }
                        privacy={privacy}
                      />
                    </DetailLine>
                  </View>

                  <View
                    style={{
                      height: 1,
                      width: '100%',
                      backgroundColor: 'white',
                      marginTop: 15,
                      marginBottom: 10,
                    }}
                  />
                </>

                {orchardPool && (
                  <>
                    <BoldText>
                      {translate('pools.orchard-title') as string}
                    </BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine
                        label={translate('pools.orchard-balance') as string}
                      >
                        <ZecAmount
                          testID="orchard-total-balance"
                          amtZec={totalBalance.totalOrchardBalance}
                          size={14}
                          currencyName={info.currencyName}
                          style={{
                            opacity:
                              totalBalance.confirmedOrchardBalance > 0 &&
                              totalBalance.confirmedOrchardBalance ===
                                totalBalance.totalOrchardBalance
                                ? 1
                                : 0.5,
                          }}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine
                        label={
                          translate('pools.orchard-confirmed-balance') as string
                        }
                      >
                        <ZecAmount
                          testID="orchard-confirmed-balance"
                          amtZec={totalBalance.confirmedOrchardBalance}
                          size={14}
                          currencyName={info.currencyName}
                          color={
                            totalBalance.confirmedOrchardBalance > 0 &&
                            totalBalance.confirmedOrchardBalance ===
                              totalBalance.totalOrchardBalance
                              ? colors.fgAccent
                              : 'red'
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={{
                        height: 1,
                        width: '100%',
                        backgroundColor: 'white',
                        marginTop: 15,
                        marginBottom: 10,
                      }}
                    />
                  </>
                )}

                {saplingPool && (
                  <>
                    <BoldText>
                      {translate('pools.sapling-title') as string}
                    </BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine
                        label={translate('pools.sapling-balance') as string}
                      >
                        <ZecAmount
                          testID="sapling-total-balance"
                          amtZec={totalBalance.totalSaplingBalance}
                          size={14}
                          currencyName={info.currencyName}
                          style={{
                            opacity:
                              totalBalance.confirmedSaplingBalance > 0 &&
                              totalBalance.confirmedSaplingBalance ===
                                totalBalance.totalSaplingBalance
                                ? 1
                                : 0.5,
                          }}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine
                        label={
                          translate('pools.sapling-confirmed-balance') as string
                        }
                      >
                        <ZecAmount
                          testID="sapling-confirmed-balance"
                          amtZec={totalBalance.confirmedSaplingBalance}
                          size={14}
                          currencyName={info.currencyName}
                          color={
                            totalBalance.confirmedSaplingBalance > 0 &&
                            totalBalance.confirmedSaplingBalance ===
                              totalBalance.totalSaplingBalance
                              ? colors.fgSyncing
                              : 'red'
                          }
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>

                    <View
                      style={{
                        height: 1,
                        width: '100%',
                        backgroundColor: 'white',
                        marginTop: 15,
                        marginBottom: 10,
                      }}
                    />
                  </>
                )}

                {transparentPool && (
                  <>
                    <BoldText>
                      {translate('pools.transparent-title') as string}
                    </BoldText>

                    <View style={{ display: 'flex', marginLeft: 25 }}>
                      <DetailLine
                        label={translate('pools.transparent-balance') as string}
                      >
                        <ZecAmount
                          testID="transparent-balance"
                          amtZec={totalBalance.totalTransparentBalance}
                          size={14}
                          currencyName={info.currencyName}
                          color={'red'}
                          privacy={privacy}
                        />
                      </DetailLine>
                      <DetailLine
                        label={
                          translate(
                            'pools.transparent-confirmed-balance',
                          ) as string
                        }
                      >
                        <ZecAmount
                          testID="transparent-confirmed-balance"
                          amtZec={totalBalance.confirmedTransparentBalance}
                          size={14}
                          currencyName={info.currencyName}
                          color={'red'}
                          privacy={privacy}
                        />
                      </DetailLine>
                    </View>
                  </>
                )}

                {transparentPool &&
                  totalBalance.confirmedTransparentBalance > 0 &&
                  shieldingAmount === 0 &&
                  !somePending && (
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        marginTop: 5,
                        backgroundColor: colors.bgSurface,
                        padding: 5,
                        borderRadius: 10,
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        size={16}
                        color={colors.fgAccent}
                        style={{ marginRight: 5 }}
                      />
                      <FadeText>{translate('pools.dust') as string}</FadeText>
                    </View>
                  )}

                {somePending && (
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      marginTop: 5,
                      backgroundColor: colors.bgSurface,
                      padding: 5,
                      borderRadius: 10,
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      size={16}
                      color={colors.fgAccent}
                      style={{ marginRight: 5 }}
                    />
                    <FadeText>{translate('send.somefunds') as string}</FadeText>
                  </View>
                )}
              </>
            )}
          </View>
        </BottomSheetScrollView>
      </AppSheet>
    </View>
  );
};

export default Pools;
