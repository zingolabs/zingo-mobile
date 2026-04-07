import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { lifehashDataUrlFromStringSync } from '../../../app/utils/lifehash';

type FinalizerCardProps = {
  lifehash: string;
  finalizerId: string;
  userStake: number;
  totalStake: number;

  containerStyle?: StyleProp<ViewStyle>;
  headerRowStyle?: StyleProp<ViewStyle>;
  avatarStyle?: StyleProp<ImageStyle>;
  titleStyle?: StyleProp<TextStyle>;
  statsRowStyle?: StyleProp<ViewStyle>;
  statCardStyle?: StyleProp<ViewStyle>;
  statTitleStyle?: StyleProp<TextStyle>;
  statValueRowStyle?: StyleProp<ViewStyle>;
  statIconStyle?: StyleProp<TextStyle>;
  statValueStyle?: StyleProp<TextStyle>;
};

function formatStake(value: number) {
  return `${value.toLocaleString()} cTAZ`;
}

export function FinalizerCard({
  lifehash,
  finalizerId,
  userStake,
  totalStake,
  containerStyle,
  headerRowStyle,
  avatarStyle,
  titleStyle,
  statsRowStyle,
  statCardStyle,
  statTitleStyle,
  statValueRowStyle,
  statIconStyle,
  statValueStyle,
}: FinalizerCardProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.headerRow, headerRowStyle]}>
        <Image
          source={{ uri: lifehashDataUrlFromStringSync(lifehash) }}
          style={[styles.avatar, avatarStyle]}
          resizeMode="cover"
        />

        <Text numberOfLines={1} style={[styles.title, titleStyle]}>
          {finalizerId}
        </Text>
      </View>

      <View style={[styles.statsRow, statsRowStyle]}>
        <View style={[styles.statCard, statCardStyle]}>
          <Text style={[styles.statTitle, statTitleStyle]}>Your stake</Text>

          <View style={[styles.statValueRow, statValueRowStyle]}>
            <Text style={[styles.statIcon, statIconStyle]}>⛁</Text>
            <Text style={[styles.statValue, statValueStyle]}>
              {formatStake(userStake)}
            </Text>
          </View>
        </View>

        <View style={[styles.statCard, statCardStyle]}>
          <Text style={[styles.statTitle, statTitleStyle]}>Total staked</Text>

          <View style={[styles.statValueRow, statValueRowStyle]}>
            <Text style={[styles.statIcon, statIconStyle]}>₴</Text>
            <Text style={[styles.statValue, statValueStyle]}>
              {formatStake(totalStake)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222223',
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 20,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 48,
    marginRight: 22,
    backgroundColor: '#2E2E32',
  },

  title: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -0.8,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 32,
    fontWeight: '600',
    marginBottom: 4,
  },

  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statIcon: {
    color: '#8B8C96',
    fontSize: 20,
    marginRight: 4,
    width: 30,
    textAlign: 'center',
  },

  statValue: {
    color: '#8B8C96',
    fontSize: 18,
    lineHeight: 32,
    fontWeight: '400',
  },
});
