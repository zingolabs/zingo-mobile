/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { iconSizeMd, radiusPill, space4, space8, useTheme } from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import { DatabaseIcon } from '@ui/primitives/Icons/DatabaseIcon';
import Tag from '@ui/widgets/Tag';

/** The status dot's side, ringed in the canvas as ServerIcon's. */
const DOT = 8;
const RING = 2;

type ServerActionProps = {
  /** The network's name when it is not Mainnet, in the warning tag beside the icon. */
  network: string;
  /** green: a server is set · grey: Offline · amber: a server is still to be set. */
  dot: 'set' | 'offline' | 'missing';
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
};

/** A bar's server action: the database at 20 with ServerIcon's status dot, and the network when it is not Mainnet. */
export default function ServerAction({
  network,
  dot,
  accessibilityLabel,
  onPress,
  testID,
}: ServerActionProps) {
  const { colors } = useTheme();
  const dotColor =
    dot === 'missing'
      ? colors.fgWarning
      : dot === 'offline'
        ? colors.fgMuted
        : colors.fgAccent;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space4 }}>
      {!!network && (
        <View>
          <Tag tone="warning">{network}</Tag>
        </View>
      )}
      <Pressable
        kind="icon"
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={space8}
        onPress={onPress}
        style={{ paddingHorizontal: 14, paddingVertical: space4 }}
      >
        <View>
          <DatabaseIcon size={iconSizeMd} color={colors.fgMuted} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -3,
              bottom: -2,
              width: DOT,
              height: DOT,
              borderRadius: radiusPill,
              borderWidth: RING,
              borderColor: colors.bgCanvas,
              backgroundColor: dotColor,
              boxSizing: 'content-box',
            }}
          />
        </View>
      </Pressable>
    </View>
  );
}
