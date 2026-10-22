/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { AddressBookFileClass } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import AddressRowHead from './AddressRowHead';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { PencilIcon } from '@ui/primitives/Icons/PencilIcon';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';
import { TrashCan, TrashLid } from '@ui/primitives/Icons/TrashIcon';
import { themeTokens } from '@app/theme';

export const ROW_LINE = themeTokens.borderSubtle;
const INK_CODE = themeTokens.fgDefault;
const ACT_BG = themeTokens.bgCanvas;
const ACT_PRESSED = themeTokens.bgMutedSubtle;
const RED = themeTokens.fgDanger;
const SWIPE_BG = themeTokens.bgAccent;
const SWIPE_INK = themeTokens.fgOnAccent;
const FLASH = themeTokens.bgAccentSubtle;

const UNFOLD_MS = 260;
const BUTTONS_MS = 200;
const BUTTONS_AT = 60;
const FOLD_MS = 120;
const FLASH_HOLD_MS = 490;
const FLASH_FADE_MS = 910;
const COLLAPSE_MS = 260;
const SEND_AT = 72;
const COPY_SQUEEZE_MS = 110;
const COPY_SPRING_MS = 150;
const COPY_HOLD_MS = 1400;
const EDIT_MS = 420;
const DELETE_MS = 360;
const SEND_MS = 420;
const SEND_RESET_AT = 900;
const ACTIONS_H = 92;
const CIRCLE = 52;

type Button = 'send' | 'copy' | 'edit' | 'delete';

type ContactRowProps = {
  contact: AddressBookFileClass;
  first: boolean;
  open: boolean;
  /** The wallet can pay this contact: a Zcash address, spending keys and a server. */
  sendable: boolean;
  /** Only Zcash contacts take an edit; the chain is fixed to Zcash. */
  editable: boolean;
  flash: boolean;
  leaving: boolean;
  onToggle: () => void;
  onSwipe: () => void;
  onSend: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLeft: () => void;
};

type ActionProps = {
  label: string;
  red?: boolean;
  onPress: () => void;
  testID: string;
  children: React.ReactNode;
};

const Action: React.FunctionComponent<ActionProps> = ({
  label,
  red,
  onPress,
  testID,
  children,
}) => (
  <Pressable
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={{ alignItems: 'center', gap: 7, width: 68 }}
  >
    {({ pressed }) => (
      <>
        <View
          style={{
            width: CIRCLE,
            height: CIRCLE,
            borderRadius: CIRCLE / 2,
            backgroundColor: pressed ? ACT_PRESSED : ACT_BG,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
        <Text
          style={{
            color: red ? RED : INK_CODE,
            fontSize: 12,
            lineHeight: 15,
            fontWeight: '400',
          }}
        >
          {label}
        </Text>
      </>
    )}
  </Pressable>
);

// One contact: tap unfolds its actions under the row, a left swipe sends.
const ContactRow: React.FunctionComponent<ContactRowProps> = ({
  contact,
  first,
  open,
  sendable,
  editable,
  flash,
  leaving,
  onToggle,
  onSwipe,
  onSend,
  onCopy,
  onEdit,
  onDelete,
  onLeft,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const left = useRef(onLeft);
  left.current = onLeft;

  const unfold = useSharedValue(open ? 1 : 0);
  const shown = useSharedValue(open ? 1 : 0);
  const glow = useSharedValue(0);
  const gone = useSharedValue(0);
  const rowH = useSharedValue(0);
  const [rowW, setRowW] = useState(0);
  const swipeable = useRef<Swipeable | null>(null);
  const copyScale = useSharedValue(1);
  const pen = useSharedValue(0);
  const lid = useSharedValue(0);
  const fly = useSharedValue(0);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    unfold.value = withTiming(open ? 1 : 0, {
      duration: UNFOLD_MS,
      easing: ease.emphasized,
      reduceMotion: ReduceMotion.System,
    });
    shown.value = open
      ? withDelay(
          BUTTONS_AT,
          withTiming(1, {
            duration: BUTTONS_MS,
            easing: ease.standard,
            reduceMotion: ReduceMotion.System,
          }),
        )
      : withTiming(0, { duration: FOLD_MS, easing: ease.standard });
  }, [open, unfold, shown]);

  useEffect(() => {
    if (!flash) {
      return;
    }
    glow.value = withSequence(
      withTiming(1, { duration: 0 }),
      withDelay(
        FLASH_HOLD_MS,
        withTiming(0, { duration: FLASH_FADE_MS, easing: ease.standard }),
      ),
    );
  }, [flash, glow]);

  useEffect(() => {
    if (!leaving) {
      return;
    }
    const done = () => left.current();
    gone.value = withTiming(
      1,
      { duration: COLLAPSE_MS, easing: ease.in },
      finished => {
        if (finished) {
          runOnJS(done)();
        }
      },
    );
  }, [leaving, gone]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: 1 - gone.value,
    height: gone.value === 0 ? 'auto' : rowH.value * (1 - gone.value),
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const unfoldStyle = useAnimatedStyle(() => ({
    height: ACTIONS_H * unfold.value,
  }));
  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: -6 * (1 - shown.value) }],
  }));
  const copyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: copyScale.value }],
  }));
  const penStyle = useAnimatedStyle(() => {
    const tilt = pen.value < 0.15 ? pen.value / 0.15 : (1 - pen.value) / 0.85;
    return {
      transform: [
        { translateX: 10 * pen.value },
        { rotate: `${-6 * tilt}deg` },
      ],
    };
  });
  const penLineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: pen.value }],
  }));
  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -1 * lid.value },
      { translateY: -2.5 * lid.value },
      { rotate: `${-24 * lid.value}deg` },
    ],
  }));
  const flyStyle = useAnimatedStyle(() => ({
    opacity: 1 - fly.value,
    transform: [
      { translateX: 30 * fly.value },
      { translateY: -22 * fly.value },
      { scale: 1 + 0.15 * fly.value },
    ],
  }));

  const renderSend = (
    _progress: RNAnimated.AnimatedInterpolation<number>,
    drag: RNAnimated.AnimatedInterpolation<number>,
  ) => (
    <View
      style={{
        width: rowW,
        backgroundColor: SWIPE_BG,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: 31,
      }}
    >
      <RNAnimated.View
        style={{
          transform: [
            {
              scale: drag.interpolate({
                inputRange: [-SEND_AT - 1, -SEND_AT, 0],
                outputRange: [1.3, 1, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}
      >
        <PlaneIcon size={24} color={SWIPE_INK} />
      </RNAnimated.View>
    </View>
  );

  const press = (button: Button) => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    const motion = (ms: number) => ({
      duration: ms,
      easing: ease.standard,
      reduceMotion: ReduceMotion.System,
    });
    switch (button) {
      case 'send':
        fly.value = withTiming(1, { ...motion(SEND_MS), easing: ease.out });
        onSend();
        later(SEND_RESET_AT, () => {
          fly.value = 0;
          busy.current = false;
        });
        return;
      case 'copy':
        onCopy();
        copyScale.value = withSequence(
          withTiming(0.82, motion(COPY_SQUEEZE_MS)),
          withTiming(1.12, { ...motion(COPY_SPRING_MS), easing: ease.spring }),
          withTiming(1, { ...motion(COPY_SPRING_MS), easing: ease.spring }),
        );
        later(COPY_SQUEEZE_MS, () => setCopied(true));
        later(COPY_SQUEEZE_MS + COPY_HOLD_MS, () => {
          setCopied(false);
          busy.current = false;
        });
        return;
      case 'edit':
        pen.value = withTiming(1, motion(EDIT_MS));
        onEdit();
        later(SEND_RESET_AT, () => {
          pen.value = 0;
          busy.current = false;
        });
        return;
      case 'delete':
        lid.value = withTiming(1, {
          ...motion(DELETE_MS),
          easing: ease.spring,
        });
        onDelete();
        later(SEND_RESET_AT, () => {
          lid.value = 0;
          busy.current = false;
        });
    }
  };

  const ticker = contact.swapChain.toUpperCase();
  const isPublic = editable && /^t/i.test(contact.address);

  return (
    <Animated.View
      testID={`addressbook.row.${contact.address}`}
      onLayout={e => {
        rowH.value = e.nativeEvent.layout.height;
        setRowW(e.nativeEvent.layout.width);
      }}
      style={[
        {
          overflow: 'hidden',
          borderTopWidth: first ? 0 : 1,
          borderTopColor: ROW_LINE,
        },
        rowStyle,
      ]}
    >
      <Swipeable
        ref={swipeable}
        enabled={sendable}
        friction={1}
        rightThreshold={SEND_AT}
        overshootRight={false}
        renderRightActions={renderSend}
        onSwipeableOpenStartDrag={onSwipe}
        onSwipeableWillOpen={() => {
          onSend();
          later(SEND_RESET_AT, () => swipeable.current?.close());
        }}
      >
        <View style={{ backgroundColor: colors.bgSurface }}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: FLASH },
              glowStyle,
            ]}
          />
          <AddressRowHead
            testID={`addressbook.row.${contact.address}`}
            name={contact.label}
            ticker={ticker}
            address={contact.address}
            avatar={{ kind: 'initial', color: contact.color, ticker }}
            tag={isPublic ? 'public' : 'none'}
            expanded={open ? 'open' : 'closed'}
            onPress={onToggle}
          />
          <Animated.View style={[{ overflow: 'hidden' }, unfoldStyle]}>
            <Animated.View
              style={[
                {
                  height: ACTIONS_H,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  paddingHorizontal: 8,
                  paddingTop: 2,
                },
                buttonsStyle,
              ]}
            >
              {sendable && (
                <Action
                  testID={`addressbook.row.${contact.address}.send`}
                  label={translate('addressbook.send') as string}
                  onPress={() => press('send')}
                >
                  <Animated.View style={flyStyle}>
                    <PlaneIcon size={24} color={colors.fgAccent} />
                  </Animated.View>
                </Action>
              )}
              <Action
                testID={`addressbook.row.${contact.address}.copy`}
                label={
                  translate(copied ? 'addressbook.copied' : 'copy') as string
                }
                onPress={() => press('copy')}
              >
                <Animated.View style={copyStyle}>
                  {copied ? (
                    <CheckIcon size={20} color={colors.fgAccent} />
                  ) : (
                    <CopyIcon size={20} color={INK_CODE} />
                  )}
                </Animated.View>
              </Action>
              {editable && (
                <Action
                  testID={`addressbook.row.${contact.address}.edit`}
                  label={translate('addressbook.edit') as string}
                  onPress={() => press('edit')}
                >
                  <Animated.View style={penStyle}>
                    <PencilIcon size={20} color={INK_CODE} />
                  </Animated.View>
                  <Animated.View
                    style={[
                      {
                        position: 'absolute',
                        left: 15,
                        bottom: 15,
                        width: 10,
                        height: 2,
                        borderRadius: 1,
                        backgroundColor: INK_CODE,
                        transformOrigin: 'left',
                      },
                      penLineStyle,
                    ]}
                  />
                </Action>
              )}
              <Action
                testID={`addressbook.row.${contact.address}.delete`}
                label={translate('addressbook.delete') as string}
                red
                onPress={() => press('delete')}
              >
                <View style={{ width: 20, height: 20 }}>
                  <TrashCan
                    size={20}
                    color={RED}
                    style={StyleSheet.absoluteFill}
                  />
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      { transformOrigin: '13% 25%' },
                      lidStyle,
                    ]}
                  >
                    <TrashLid size={20} color={RED} />
                  </Animated.View>
                </View>
              </Action>
            </Animated.View>
          </Animated.View>
        </View>
      </Swipeable>
    </Animated.View>
  );
};

export default React.memo(ContactRow);
