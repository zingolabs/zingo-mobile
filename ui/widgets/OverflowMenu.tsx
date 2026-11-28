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

type Box = { x: number; y: number; w: number; h: number };

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
  const owner = useRef({}).current;
  const [open, setOpen] = useState(false);
  const [button, setButton] = useState<Box | null>(null);
  const [menuH, setMenuH] = useState(0);

  const toggle = () => {
    if (!open) {
      setButton(null);
      setMenuH(0);
      const node = buttonRef.current;
      if (host?.hostRef.current && node) {
        node.measureLayout(host.hostRef.current, (x, y, w, h) =>
          setButton({ x, y, w, h }),
        );
      }
    }
    setOpen(!open);
  };

  const choose = (action: OverflowAction) => {
    host?.hide(owner);
    setOpen(false);
    action.onPress();
  };

  const under =
    !!host && !!button && menuH > 0
      ? opensBelow({
          iconY: button.y,
          iconH: button.h,
          bubbleH: menuH,
          areaH: host.hostHeight,
          below: true,
        })
      : true;

  const body = (
    <View
      style={{
        width: MENU_W,
        backgroundColor: colors.bgSurface,
        borderColor: colors.bottomSheetBorder,
        borderWidth: 1,
        borderRadius: radiusMd,
        overflow: 'hidden',
      }}
    >
      {actions.map((action, index) => (
        <Pressable
          key={action.testID}
          kind="row"
          testID={action.testID}
          accessibilityRole="menuitem"
          onPress={() => choose(action)}
          style={{
            minHeight: rowMinHeight,
            justifyContent: 'center',
            paddingHorizontal: space16,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.borderSubtle,
          }}
        >
          <Text
            variant="body"
            color={action.danger ? colors.fgDanger : colors.fgDefault}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  /** Measured unseen first, then mounted once in place with its entrance. */
  const menu =
    button && menuH > 0 ? (
      <Animated.View
        key="menu"
        entering={menuEnter(under ? -4 : 4)}
        style={{
          position: 'absolute',
          left: Math.max(space16, button.x + button.w - MENU_W),
          top: under ? button.y + button.h + GAP : button.y - GAP - menuH,
        }}
      >
        {body}
      </Animated.View>
    ) : (
      <View
        key="measure"
        pointerEvents="none"
        onLayout={e => setMenuH(e.nativeEvent.layout.height)}
        style={{ position: 'absolute', left: 0, top: 0, opacity: 0 }}
      >
        {body}
      </View>
    );

  useEffect(() => {
    if (!host) {
      return;
    }
    if (open) {
      host.show({ owner, node: menu, onClose: () => setOpen(false) });
    } else {
      host.hide(owner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, open, button, menuH, under]);
  useEffect(() => () => host?.hide(owner), [host, owner]);

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
      style={{
        width: BUTTON,
        height: BUTTON,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EllipsisIcon size={iconSize} color={colors.fgMuted} />
    </Pressable>
  );
}
