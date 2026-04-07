import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { WalletBondsStatusEnum } from '../../../app/AppState/enums/WalletBondsStatusEnum';

export default interface WalletBondsType {
  txid: string;
  pubKey: string;
  amount: number;
  status: WalletBondsStatusEnum;
  finalizer: string;
}

type WalletBondCardProps = {
  bond: WalletBondsType;
  dateLabel?: string;
  onPressRedelegate: (bond: WalletBondsType) => void;
  onPressUnstake: (bond: WalletBondsType) => void;
  onPresWithdraw: (bond: WalletBondsType) => void;

  containerStyle?: StyleProp<ViewStyle>;
  statusTextStyle?: StyleProp<TextStyle>;
  dateTextStyle?: StyleProp<TextStyle>;
  pubKeyTextStyle?: StyleProp<TextStyle>;
  innerCardStyle?: StyleProp<ViewStyle>;
  amountTextStyle?: StyleProp<TextStyle>;
  actionButtonStyle?: StyleProp<ViewStyle>;
  actionButtonTextStyle?: StyleProp<TextStyle>;
  primaryButtonStyle?: StyleProp<ViewStyle>;
  secondaryButtonStyle?: StyleProp<ViewStyle>;
};

function formatAmount(value: number) {
  return `${value.toFixed(2)} cTAZ`;
}

function truncateMiddle(value: string, start = 10, end = 8) {
  if (!value) return '';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function getStatusColor(status: WalletBondsStatusEnum) {
  switch (status) {
    case WalletBondsStatusEnum.Active:
      return '#30D158';
    default:
      return '#8E8E93';
  }
}

export function FinalizerPosition({
  bond,
  dateLabel = '',
  onPressRedelegate,
  onPressUnstake,
  onPresWithdraw,
  containerStyle,
  statusTextStyle,
  dateTextStyle,
  pubKeyTextStyle,
  innerCardStyle,
  amountTextStyle,
  actionButtonStyle,
  actionButtonTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
}: WalletBondCardProps) {
  const isActive = bond.status === WalletBondsStatusEnum.Active;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.topRow}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(bond.status) },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              statusTextStyle,
              {
                color: getStatusColor(bond.status),
              },
            ]}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>

        <Text style={[styles.dateText, dateTextStyle]}>{dateLabel}</Text>
      </View>

      <Text style={[styles.pubKeyText, pubKeyTextStyle]}>
        {truncateMiddle(bond.pubKey)}
      </Text>

      <View style={[styles.innerCard, innerCardStyle]}>
        <Text style={[styles.amountText, amountTextStyle]}>
          {formatAmount(bond.amount)}
        </Text>

        <View style={styles.actionsRow}>
          {isActive && (
            <>
              <Pressable
                onPress={() => onPressRedelegate?.(bond)}
                disabled={!isActive}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  secondaryButtonStyle,
                  actionButtonStyle,
                  !isActive && styles.disabledButton,
                  pressed && !!isActive && styles.pressed,
                ]}
              >
                <Text style={[styles.actionButtonText, actionButtonTextStyle]}>
                  Redelegate
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onPressUnstake?.(bond)}
                disabled={!isActive}
                style={({ pressed }) => [
                  styles.actionButton,

                  styles.primaryButton,
                  primaryButtonStyle,
                  actionButtonStyle,
                  !isActive && styles.disabledButton,
                  pressed && !!isActive && styles.pressed,
                ]}
              >
                <Text style={[styles.actionButtonText, actionButtonTextStyle]}>
                  Unstake
                </Text>
              </Pressable>
            </>
          )}

          {!isActive && (
            <Pressable
              onPress={() => onPresWithdraw?.(bond)}
              disabled={!isActive}
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryButton,
                primaryButtonStyle,
                actionButtonStyle,
                pressed && !!isActive && styles.pressed,
              ]}
            >
              <Text style={[styles.actionButtonText, actionButtonTextStyle]}>
                Withdraw
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222223',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },

  statusText: {
    color: '#30D158',
    fontSize: 16,
    fontWeight: '700',
  },

  dateText: {
    color: '#9A9AA3',
    fontSize: 15,
    fontWeight: '400',
  },

  pubKeyText: {
    color: '#B1B1B8',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 18,
  },

  innerCard: {
    borderWidth: 1,
    borderColor: '#3A3A3D',
    backgroundColor: '#1C1C1E',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  amountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },

  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButton: {
    backgroundColor: '#1F6FBE',
  },

  secondaryButton: {
    backgroundColor: '#2F313A',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.45,
  },

  pressed: {
    opacity: 0.8,
  },
});
