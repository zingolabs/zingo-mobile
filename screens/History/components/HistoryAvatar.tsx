import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@app/theme';
import type { SwapAssetType } from '@app/swap';
import TokenLogo from '@screens/Swap/components/TokenLogo';
import { tokenEntryOf } from '@screens/Swap/swapAssets';

export const AVATAR_SIZE = 36;
const BADGE_SIZE = 18;

/**
 * The round icon a History row leads with. A swap's carries the other
 * coin as a badge in the corner, ringed in the panel's colour.
 */
export default function HistoryAvatar({
  icon,
  badge,
}: {
  icon: React.ReactNode;
  badge?: SwapAssetType;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: colors.bgMutedSubtle,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
      {!!badge && (
        <View
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: BADGE_SIZE + 4,
            height: BADGE_SIZE + 4,
            borderRadius: (BADGE_SIZE + 4) / 2,
            backgroundColor: colors.bgSurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TokenLogo
            token={tokenEntryOf(badge)}
            size={BADGE_SIZE}
            surfaceColor={colors.bgSurface}
          />
        </View>
      )}
    </View>
  );
}
