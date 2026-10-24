/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { iconSize, iconSizeMd, radiusPill, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import { WalletIcon } from '@ui/primitives/Icons/WalletIcon';
import { ChainLogo } from './ChainSelect';

/** Stored with the contact and kept for its whole life. */
export type AvatarCategory = 1 | 2 | 3 | 4 | 5;

/**
 * The category of a contact that does not store one yet: the same seed (its
 * colour, or a Zcash Name) always gives the same category.
 */
export function avatarCategoryOf(seed: string): AvatarCategory {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  }
  const categories: AvatarCategory[] = [1, 2, 3, 4, 5];
  return categories[hash % categories.length];
}

type AvatarProps =
  | {
      kind: 'contact';
      /** Its first letter is the mark. */
      name: string;
      category: AvatarCategory;
      /** The ticker of the contact's chain (ZEC, BTC…), drawn as a badge. */
      chain?: string;
      size?: 'md' | 'lg';
    }
  | { kind: 'wallet'; size?: 'md' | 'lg' }
  /** No contact to show: what the transaction does, as an icon. */
  | {
      kind: 'icon';
      icon: React.ComponentType<{ size?: number; color?: string }>;
      /** A transaction that failed. */
      danger?: boolean;
      size?: 'md' | 'lg';
    };

const SIDE = { md: 36, lg: 48 };
const RING = 2;

/** A round mark for a contact or the own wallet, the same on every screen. */
const Avatar: React.FunctionComponent<AvatarProps> = props => {
  const { colors } = useTheme();
  const side = SIDE[props.size ?? 'md'];
  const badge = Math.round(side * 0.42);

  if (props.kind === 'icon') {
    const Mark = props.icon;
    return (
      <View
        style={{
          width: side,
          height: side,
          borderRadius: radiusPill,
          backgroundColor: props.danger
            ? colors.bgDangerSubtle
            : colors.bgMutedSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Mark
          size={props.size === 'lg' ? iconSize : iconSizeMd}
          color={colors.fgDefault}
        />
      </View>
    );
  }

  if (props.kind === 'wallet') {
    return (
      <View
        style={{
          width: side,
          height: side,
          borderRadius: radiusPill,
          backgroundColor: colors.bgMutedSubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <WalletIcon
          size={props.size === 'lg' ? iconSize : iconSizeMd}
          color={colors.fgViewOnly}
        />
      </View>
    );
  }

  const fg = {
    1: colors.fgCategory1,
    2: colors.fgCategory2,
    3: colors.fgCategory3,
    4: colors.fgCategory4,
    5: colors.fgCategory5,
  }[props.category];
  const bg = {
    1: colors.bgCategory1,
    2: colors.bgCategory2,
    3: colors.bgCategory3,
    4: colors.bgCategory4,
    5: colors.bgCategory5,
  }[props.category];

  return (
    <View style={{ width: side, height: side }}>
      <View
        style={{
          width: side,
          height: side,
          borderRadius: radiusPill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          variant={props.size === 'lg' ? 'subtitle' : 'bodyStrong'}
          color={fg}
          style={{ fontWeight: '700' }}
        >
          {(props.name.trim()[0] ?? '?').toUpperCase()}
        </Text>
      </View>
      {props.chain !== undefined && (
        <View
          style={{
            position: 'absolute',
            right: -RING,
            bottom: -RING,
            borderRadius: radiusPill,
            borderWidth: RING,
            borderColor: colors.bgSurface,
          }}
        >
          <ChainLogo chain={props.chain} size={badge} />
        </View>
      )}
    </View>
  );
};

export default Avatar;
