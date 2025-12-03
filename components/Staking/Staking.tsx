/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { DrawerScreenProps } from '@react-navigation/drawer';

import { RouteEnum, ScreenEnum, ValueTransferType } from '../../app/AppState';
import { AppDrawerParamList } from '../../app/types';
import { ThemeType } from '../../app/types/ThemeType';
import WalletSummaryHeader from '../History/components/WalletSummaryHeader';
import SettingsButton from '../History/components/SettingsButton';
import StakingActions from './StakingActions';
import { ContextAppLoaded } from '../../app/context';

const formatMovementDate = (unixSeconds: number) => {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: 'short', // "Oct"
    day: 'numeric', // "10"
    hour: 'numeric',
    minute: '2-digit',
  }); // "Oct 10, 4:30 PM"
};

const formatHeaderMonth = (unixSeconds: number) => {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString(undefined, {
    month: 'long', // "October"
    year: 'numeric', // "2025"
  }); // "October 2025"
};

function Separator() {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border,
        opacity: 0.4,
      }}
    />
  );
}

type StakingProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.StakingHome
>;

const Staking: React.FC<StakingProps> = () => {
  const context = useContext(ContextAppLoaded);
  const { valueTransfers } = context;

  const screenName = ScreenEnum.StakingHome;

  const [loading] = useState(false);
  const movements: ValueTransferType[] = useMemo(
    () =>
      !valueTransfers
        ? []
        : valueTransfers.filter(
            (vt: ValueTransferType) => vt.stakingAction != null,
          ),
    [valueTransfers],
  );

  const { colors } = useTheme() as unknown as ThemeType;

  const hasMovements = !loading && movements.length > 0;

  const monthHeader = hasMovements
    ? formatHeaderMonth(movements[0].time)
    : undefined;

  console.log('movements', movements);

  return (
    <View
      accessible={true}
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {/* Header + quick actions */}
      <View
        style={{
          backgroundColor: colors.card,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <WalletSummaryHeader show_staked={true} />

        <View
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
          }}
        >
          <SettingsButton screenName={screenName} />
        </View>

        <StakingActions />
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 24,
            backgroundColor: colors.card,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: hasMovements ? 8 : 0,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontWeight: '600',
                fontSize: 16,
              }}
            >
              Movements
            </Text>

            {hasMovements && monthHeader && (
              <Text
                style={{
                  color: colors.placeholder,
                  fontSize: 12,
                }}
              >
                {monthHeader}
              </Text>
            )}
          </View>

          {loading && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          )}

          {!loading && !hasMovements && (
            <View style={styles.centerContent}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: colors.placeholder,
                  marginBottom: 16,
                }}
              />
              <Text
                style={{
                  color: colors.placeholder,
                  fontSize: 14,
                }}
              >
                There are no movements yet.
              </Text>
            </View>
          )}

          {!loading && hasMovements && (
            <FlatList
              data={movements}
              keyExtractor={item => item.txid}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 4 }}
              ItemSeparatorComponent={Separator}
              renderItem={({ item }) => {
                // negative amount => unstaked (tokens left wallet)
                // positive amount => staked (tokens came back)
                const isStake = item.amount > 0;
                const label = isStake ? 'Staked' : 'Unstaked';
                const amountLabel = `${
                  item.amount > 0 ? '+' : ''
                }${item.amount.toFixed(3)} cTAZ`;

                return (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 10,
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: '500',
                          fontSize: 14,
                          marginBottom: 2,
                        }}
                      >
                        {label}
                      </Text>
                      <Text
                        style={{
                          color: colors.placeholder,
                          fontSize: 12,
                        }}
                      >
                        {formatMovementDate(item.time)}
                      </Text>
                    </View>

                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      {amountLabel}
                    </Text>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Staking;
