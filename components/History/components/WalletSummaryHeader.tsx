/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Animated, TouchableOpacity } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { isEqual } from 'lodash';

import { ContextAppLoaded } from '../../../app/context';
import { ThemeType } from '../../../app/types';
import { RouteEnum, SelectServerEnum } from '../../../app/AppState';
import { RPCSyncStatusType } from '../../../app/rpc/types/RPCSyncStatusType';
import ZecAmount from '../../Components/ZecAmount';
import FadeText from '../../Components/FadeText';

const WalletSummaryHeader: React.FC = () => {
  const navigation: any = useNavigation();
  const { colors } = useTheme() as ThemeType;

  const {
    totalBalance,
    info,
    syncingStatus,
    netInfo,
    translate,
    selectIndexerServer,
    privacy,
  } = useContext(ContextAppLoaded);

  const [percentageOutputsScanned, setPercentageOutputsScanned] =
    useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);

  const opacityValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Compute sync percentage
  useEffect(() => {
    if (
      !syncingStatus ||
      isEqual(syncingStatus, {} as RPCSyncStatusType) ||
      (!!syncingStatus.scan_ranges && syncingStatus.scan_ranges.length === 0) ||
      syncingStatus.percentage_total_outputs_scanned === 0
    ) {
      setPercentageOutputsScanned(0);
      setSyncInProgress(true);
    } else {
      const raw = syncingStatus.percentage_total_outputs_scanned ?? 0;
      const clamped =
        raw < 0.01
          ? 0.01
          : raw > 99.99
            ? 99.99
            : Number(raw.toFixed(2).replace(/\.?0+$/, ''));

      setPercentageOutputsScanned(clamped);
      setSyncInProgress(
        !!syncingStatus.scan_ranges &&
          syncingStatus.scan_ranges.length > 0 &&
          raw < 100,
      );
    }
  }, [syncingStatus]);

  // Blinking animation when syncing
  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(opacityValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      );
    }

    if (syncInProgress) {
      animationRef.current?.start();
    } else {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    }

    return () => {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    };
  }, [syncInProgress, opacityValue]);

  const showSyncReport = () => {
    navigation.navigate(RouteEnum.SyncReport);
  };

  const balanceTotal =
    (totalBalance?.totalOrchardBalance ?? 0) +
    (totalBalance?.totalSaplingBalance ?? 0) +
    (totalBalance?.totalTransparentBalance ?? 0);

  return (
    <View
      style={{
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: colors.card,
      }}
    >
      {/* Balance */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <ZecAmount
          currencyName={info.currencyName}
          color={colors.text}
          size={36}
          amtZec={balanceTotal}
          privacy={privacy}
          smallPrefix
        />
      </View>

      {/* Sync bar */}
      <View
        style={{
          width: '30%',
          height: 5,
          marginTop: 10,
          borderRadius: 3,
          alignSelf: 'center',
        }}
      >
        {netInfo.isConnected && percentageOutputsScanned > 0 ? (
          <>
            <View
              style={{
                height: 5,
                width: '100%',
                borderRadius: 3,
                backgroundColor: colors.secondary,
              }}
            />
            <View
              style={{
                height: 5,
                width: `${percentageOutputsScanned}%`,
                borderRadius: 3,
                backgroundColor: 'green',
                marginTop: -5,
              }}
            />
          </>
        ) : netInfo.isConnected ? (
          <View
            style={{
              height: 5,
              width: '100%',
              borderRadius: 3,
              backgroundColor: colors.syncing,
            }}
          />
        ) : null}
      </View>

      {/* Sync status chip */}
      <View
        style={{
          marginTop: 8,
          minHeight: 29,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selectIndexerServer === SelectServerEnum.offline ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 2.5,
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderColor: colors.zingo,
              borderWidth: 1,
              borderRadius: 10,
              minWidth: 25,
              minHeight: 25,
            }}
          >
            <FadeText style={{ fontSize: 10 }}>
              {translate('settings.server-offline') as string}
            </FadeText>
          </View>
        ) : netInfo.isConnected && percentageOutputsScanned > 0 ? (
          <>
            {syncInProgress ? (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 2.5,
                  padding: 1,
                  minWidth: 25,
                  minHeight: 25,
                }}
              >
                <Animated.View
                  style={{
                    opacity: opacityValue,
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 3,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                      {translate('syncing') as string}
                    </FadeText>
                    {percentageOutputsScanned > 0 && (
                      <>
                        <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                          {' - '}
                        </FadeText>
                        <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                          {` ${percentageOutputsScanned}%`}
                        </FadeText>
                      </>
                    )}
                  </View>
                </Animated.View>
              </View>
            ) : (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginHorizontal: 2.5,
                  padding: 1,
                  minWidth: 25,
                  minHeight: 25,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 3,
                  }}
                >
                  <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                    {translate('synced') as string}
                  </FadeText>
                </View>
              </View>
            )}
          </>
        ) : netInfo.isConnected ? (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 2.5,
              padding: 1,
              minWidth: 25,
              minHeight: 25,
            }}
          >
            <TouchableOpacity onPress={showSyncReport}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 3,
                }}
              >
                <FadeText style={{ fontSize: 10, marginLeft: 2 }}>
                  {translate('connecting') as string}
                </FadeText>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default WalletSummaryHeader;
