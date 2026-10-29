/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import Animated from 'react-native-reanimated';
import { View } from 'react-native';
import { radiusMd, radiusSm, iconSizeSm, useTheme } from '@app/theme';
import { useUnfold } from '@app/hooks/useUnfold';
import { formatInteger } from '@app/utils/formatAmount';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import { ChevronDown, ChevronUp } from '@ui/primitives/Icons/Chevron';

/**
 * A section of the swap detail that folds: its title with a count and a
 * chevron, and under it, once opened, a card of rows. The rows draw their
 * own hairlines.
 */
export default function FoldSection({
  testID,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  testID: string;
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View>
      <Pressable
        kind="row"
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            columnGap: 8,
          }}
        >
          <Text variant="bodySmall" tone={open ? 'default' : 'muted'}>
            {title}
          </Text>
          <View
            style={{
              minWidth: 20,
              paddingHorizontal: 8,
              borderRadius: radiusSm,
              backgroundColor: colors.bgMutedSubtle,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" tone="muted">
              {formatInteger(count)}
            </Text>
          </View>
        </View>
        <Chevron size={iconSizeSm} color={colors.fgMuted} />
      </Pressable>
      {open && <FoldCard>{children}</FoldCard>}
    </View>
  );
}

/** The section's rows, unfolding as it opens. */
function FoldCard({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const unfold = useUnfold();
  return (
    <Animated.View
      style={[
        {
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          borderRadius: radiusMd,
          backgroundColor: colors.bgCanvas,
          marginTop: 4,
        },
        unfold,
      ]}
    >
      {children}
    </Animated.View>
  );
}
