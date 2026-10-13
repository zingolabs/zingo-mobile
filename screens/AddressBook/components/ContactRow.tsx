/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { AddressBookFileClass } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import Utils from '@app/utils';
import { ChainLogo } from '@ui/widgets/ChainSelect';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { PencilIcon } from '@ui/primitives/Icons/PencilIcon';
import { PlaneIcon } from '@ui/primitives/Icons/PlaneIcon';
import { TrashCan, TrashLid } from '@ui/primitives/Icons/TrashIcon';
import { isPublicAddress } from '@screens/AddressBook/zcashAddressKind';

export const ROW_LINE = '#0A1F3D';
const INK_SOFT = '#8DA0B8';
const INK_CODE = '#B9C6D6';
const ACT_BG = '#020B18';
const ACT_PRESSED = '#0A1F3D';
const RED = '#F2878A';
const PUBLIC_INK = '#E6C46A';
const PUBLIC_BG = 'rgba(230,196,106,0.12)';
const SWIPE_BG = '#0E5A18';
const SWIPE_INK = '#D7F5D2';
const FLASH = 'rgba(20,157,5,0.16)';
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const UNFOLD_MS = 260;
const BUTTONS_MS = 200;
const BUTTONS_AT = 60;
const FOLD_MS = 120;
const FLASH_HOLD_MS = 490;
const FLASH_FADE_MS = 910;
const COLLAPSE_MS = 260;
const RETURN_MS = 280;
const LEAVE_MS = 280;
const SEND_AT = 72;
const FLICK = 800;
const COPY_SQUEEZE_MS = 110;
const COPY_SPRING_MS = 150;
const COPY_HOLD_MS = 1400;
const EDIT_MS = 420;
const EDIT_AT = 470;
const DELETE_MS = 360;
const DELETE_AT = 380;
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
            fontSize: 11,
            lineHeight: 15,
            fontWeight: '500',
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
  const rowW = useSharedValue(0);
  const dx = useSharedValue(0);
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

  const pan = Gesture.Pan()
    .enabled(sendable)
    .activeOffsetX(-12)
    .failOffsetX(12)
    .failOffsetY([-10, 10])
    .onStart(() => {
      runOnJS(onSwipe)();
    })
    .onUpdate(e => {
      dx.value = Math.min(0, e.translationX);
    })
    .onEnd(e => {
      if (-dx.value > SEND_AT || e.velocityX < -FLICK) {
        dx.value = withTiming(
          -rowW.value,
          { duration: LEAVE_MS, easing: ease.in },
          finished => {
            if (finished) {
              runOnJS(onSend)();
              dx.value = withDelay(
                SEND_RESET_AT,
                withTiming(0, { duration: 0 }),
              );
            }
          },
        );
        return;
      }
      dx.value = withTiming(0, {
        duration: RETURN_MS,
        easing: ease.emphasized,
        reduceMotion: ReduceMotion.System,
      });
    });

  const rowStyle = useAnimatedStyle(() => ({
    opacity: 1 - gone.value,
    height: gone.value === 0 ? 'auto' : rowH.value * (1 - gone.value),
  }));
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }],
  }));
  const planeBehindStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(-dx.value > SEND_AT ? 1.3 : 1, {
          duration: 180,
          easing: ease.standard,
        }),
      },
    ],
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
        fly.value = withTiming(1, { ...motion(SEND_MS), easing: ease.in });
        later(SEND_MS + 30, onSend);
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
        later(EDIT_AT, onEdit);
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
        later(DELETE_AT, onDelete);
        later(SEND_RESET_AT, () => {
          lid.value = 0;
          busy.current = false;
        });
    }
  };

  const ticker = contact.swapChain.toUpperCase();
  const isPublic = editable && isPublicAddress(contact.address);
  const initial = contact.label.slice(0, 1).toUpperCase();

  return (
    <Animated.View
      testID={`addressbook.row.${contact.address}`}
      onLayout={e => {
        rowH.value = e.nativeEvent.layout.height;
        rowW.value = e.nativeEvent.layout.width;
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
      {sendable && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: SWIPE_BG,
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingRight: 31,
            },
          ]}
        >
          <Animated.View style={planeBehindStyle}>
            <PlaneIcon size={26} color={SWIPE_INK} strokeWidth={1.9} />
          </Animated.View>
        </View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[{ backgroundColor: colors.bgSurface }, slideStyle]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: FLASH },
              glowStyle,
            ]}
          />
          <Pressable
            testID={`addressbook.row.${contact.address}.head`}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={onToggle}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 62,
              paddingVertical: 8,
              paddingHorizontal: 13,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: `${contact.color}29`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: contact.color,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                {initial}
              </Text>
              <View
                style={{
                  position: 'absolute',
                  right: -5,
                  bottom: -5,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: colors.bgSurface,
                  backgroundColor: colors.bgSurface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChainLogo chain={ticker} size={18} />
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  numberOfLines={1}
                  style={{
                    flexShrink: 1,
                    color: colors.fgDefault,
                    fontSize: 13.5,
                    lineHeight: 18,
                    fontWeight: '600',
                  }}
                >
                  {contact.label}
                </Text>
                <Text
                  style={{
                    marginLeft: 8,
                    color: INK_SOFT,
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                  }}
                >
                  {ticker}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  marginTop: 2,
                }}
              >
                <Text
                  style={{
                    color: INK_CODE,
                    fontFamily: MONO,
                    fontSize: 11.5,
                    fontWeight: '500',
                  }}
                >
                  {Utils.trimToSmall(contact.address, 7)}
                </Text>
                {isPublic && (
                  <Text
                    testID={`addressbook.row.${contact.address}.public`}
                    style={{
                      color: PUBLIC_INK,
                      backgroundColor: PUBLIC_BG,
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 0.4,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 5,
                      overflow: 'hidden',
                    }}
                  >
                    {(translate('addressbook.public') as string).toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
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
                    <PlaneIcon
                      size={22}
                      color={colors.fgAccent}
                      strokeWidth={1.9}
                    />
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
                    <CheckIcon
                      size={20}
                      color={colors.fgAccent}
                      strokeWidth={2.6}
                    />
                  ) : (
                    <CopyIcon size={20} color={INK_CODE} strokeWidth={1.9} />
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
                    <PencilIcon size={20} color={INK_CODE} strokeWidth={1.9} />
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
                    strokeWidth={1.9}
                    style={StyleSheet.absoluteFill}
                  />
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      { transformOrigin: '13% 25%' },
                      lidStyle,
                    ]}
                  >
                    <TrashLid size={20} color={RED} strokeWidth={1.9} />
                  </Animated.View>
                </View>
              </Action>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

export default React.memo(ContactRow);
