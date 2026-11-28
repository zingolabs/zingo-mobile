/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, { Keyframe, ReduceMotion } from 'react-native-reanimated';

import {
  iconSize,
  radiusMd,
  rowMinHeight,
  space4,
  space16,
  useTheme,
} from '@app/theme';
import Pressable from '@ui/primitives/Pressable';
import Text from '@ui/primitives/Text';
import { EllipsisIcon } from '@ui/primitives/Icons/EllipsisIcon';
import { TooltipHostContext } from './TooltipHost';
import { opensBelow } from './InfoTooltip';

/** One choice in an overflow menu. */
export type OverflowAction = {
  label: string;
  onPress: () => void;
  danger?: boolean;
  testID: string;
};

const BUTTON = 36;
const MENU_W = 180;
const GAP = space4;

const menuEnter = (rise: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: rise }] },
    100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
  })
    .duration(160)
    .reduceMotion(ReduceMotion.System);

/**
 * A "⋯" button whose menu opens in the TooltipHost of its panel or sheet,
 * under the button, or over it when there is no room below.
 */
export default function OverflowMenu({
  label,
  actions,
  testID,
}: {
  /** Names the button for accessibility. */
  label: string;
  actions: ReadonlyArray<OverflowAction>;
  testID: string;
}) {
  const { colors } = useTheme();
  const host = useContext(TooltipHostContext);
  const buttonRef = useRef<View>(null);
  const [owner] = useState(() => ({}));
  const [open, setOpen] = useState(false);

  useEffect(() => () => host?.hide(owner), [host, owner]);

  /** Every row is one line high, between borders. */
  const menuH = actions.length * rowMinHeight + actions.length + 1;

  const choose = (action: OverflowAction) => {
    host?.hide(owner);
    setOpen(false);
    action.onPress();
  };

  const show = (x: number, y: number, w: number, h: number) => {
    if (!host) {
      return;
    }
    const under = opensBelow({
      iconY: y,
      iconH: h,
      bubbleH: menuH,
      areaH: host.hostHeight,
      below: true,
    });
    host.show({
      owner,
      onClose: () => setOpen(false),
      node: (
        <Animated.View
          entering={menuEnter(under ? -4 : 4)}
          style={[
            styles.menu,
            {
              left: Math.max(space16, x + w - MENU_W),
              top: under ? y + h + GAP : y - GAP - menuH,
              backgroundColor: colors.bgSurface,
              borderColor: colors.bottomSheetBorder,
            },
          ]}
        >
          {actions.map((action, index) => (
            <Pressable
              key={action.testID}
              kind="row"
              testID={action.testID}
              accessibilityRole="menuitem"
              onPress={() => choose(action)}
              style={[
                styles.row,
                {
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.borderSubtle,
                },
              ]}
            >
              <Text
                variant="body"
                numberOfLines={1}
                color={action.danger ? colors.fgDanger : colors.fgDefault}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      ),
    });
    setOpen(true);
  };

  const toggle = () => {
    const node = buttonRef.current;
    if (host?.hostRef.current && node) {
      node.measureLayout(host.hostRef.current, show);
    }
  };

  return (
    <Pressable
      kind="icon"
      ref={buttonRef}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      hitSlop={space4}
      onPress={toggle}
      style={styles.button}
    >
      <EllipsisIcon size={iconSize} color={colors.fgMuted} />
    </Pressable>
  );
}

const styles = {
  button: {
    width: BUTTON,
    height: BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    width: MENU_W,
    borderWidth: 1,
    borderRadius: radiusMd,
    overflow: 'hidden',
  },
  row: {
    minHeight: rowMinHeight,
    justifyContent: 'center',
    paddingHorizontal: space16,
  },
} as const;
