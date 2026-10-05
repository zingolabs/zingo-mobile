/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Keyframe,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronDown,
  faDatabase,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoading } from '@app/context';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import { LoadingDots } from '@ui/widgets/ProgressState';
import { WalletErrorKind } from '@app/AppState/types/WalletErrorInfo';

type WalletErrorProps = {
  kind: WalletErrorKind;
  details: string;
  busy: boolean;
  // Changes on every failed retry; the icon shakes once per change.
  shake: number;
  onRetry: () => void;
  onImport: () => void;
  onCreate: () => void;
  onServer: () => void;
};

const ICON_TOP = 226 / 874;
const COLUMN_TOP = 328 / 874;
const ICON = 75;
const BADGE = 17;
const SHAKE_STEP_MS = 64;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

const badgeEnter = () =>
  new Keyframe({
    0: { transform: [{ scale: 0 }] },
    100: { transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(300)
    .delay(200)
    .reduceMotion(ReduceMotion.System);
const boxEnter = () =>
  FadeIn.duration(240)
    .easing(ease.emphasized)
    .reduceMotion(ReduceMotion.System);
const boxExit = () =>
  FadeOut.duration(180).easing(ease.standard).reduceMotion(ReduceMotion.System);
const labelEnter = () =>
  FadeIn.duration(duration.fast).reduceMotion(ReduceMotion.System);
const labelExit = () =>
  FadeOut.duration(duration.fast).reduceMotion(ReduceMotion.System);

const WalletError: React.FunctionComponent<WalletErrorProps> = ({
  kind,
  details,
  busy,
  shake,
  onRetry,
  onImport,
  onCreate,
  onServer,
}) => {
  const { translate, netInfo, server } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const shakeX = useSharedValue(0);
  const chevron = useSharedValue(0);
  const firstShake = useRef(true);

  useEffect(() => {
    if (firstShake.current) {
      firstShake.current = false;
      return;
    }
    const step = { duration: SHAKE_STEP_MS, easing: ease.standard };
    shakeX.value = withSequence(
      withTiming(-6, step),
      withTiming(6, step),
      withTiming(-6, step),
      withTiming(6, step),
      withTiming(0, step),
    );
  }, [shake, shakeX]);

  useEffect(() => {
    chevron.value = withTiming(open ? 180 : 0, {
      duration: 240,
      easing: ease.emphasized,
    });
  }, [open, chevron]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value}deg` }],
  }));

  const offline = server.kind === 'offline';
  const dotColor =
    !netInfo.isConnected || kind === 'server'
      ? colors.fgDangerEmphasis
      : offline
        ? colors.fgMuted
        : colors.fgAccent;
  const host =
    server.kind === 'remote' ? server.uri.replace(/^https?:\/\//, '') : '';
  const title = translate(
    kind === 'server' ? 'walleterror.server-title' : 'walleterror.open-title',
  ) as string;
  const sub =
    kind === 'server'
      ? (translate('walleterror.server-sub') as string).replace('{host}', host)
      : (translate('walleterror.open-sub') as string);

  const link = (
    label: string,
    onPress: () => void,
    bottom: number,
    size: number,
    testID: string,
  ) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={busy}
      hitSlop={8}
      accessibilityRole="button"
      style={({ pressed }) => ({
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <RegText style={{ fontSize: size, color: colors.fgMuted }}>
        {label}
      </RegText>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Pressable
        testID="walleterror.server"
        onPress={onServer}
        disabled={busy}
        hitSlop={8}
        accessibilityRole="button"
        style={{
          position: 'absolute',
          right: 19,
          top: 37,
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesomeIcon icon={faDatabase} color={colors.fgMuted} size={22} />
        <View
          style={{
            position: 'absolute',
            right: 2,
            bottom: 3,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
            borderWidth: 2,
            borderColor: colors.bgCanvas,
          }}
        />
      </Pressable>

      <Animated.View
        testID="walleterror.icon"
        style={[
          {
            position: 'absolute',
            top: `${ICON_TOP * 100}%`,
            alignSelf: 'center',
            width: ICON,
            height: ICON,
            borderRadius: ICON / 2,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            alignItems: 'center',
            justifyContent: 'center',
          },
          iconStyle,
        ]}
      >
        <FontAwesomeIcon
          icon={kind === 'server' ? faDatabase : faWallet}
          color={colors.fgDefault}
          size={28}
        />
        <Animated.View
          entering={badgeEnter()}
          style={{
            position: 'absolute',
            left: 57,
            top: 0,
            width: BADGE,
            height: BADGE,
            borderRadius: BADGE / 2,
            backgroundColor: colors.fgDangerEmphasis,
            borderWidth: 2,
            borderColor: colors.bgCanvas,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BoldText style={{ fontSize: 10, lineHeight: 12, color: '#FFFFFF' }}>
            !
          </BoldText>
        </Animated.View>
      </Animated.View>

      <View
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          top: `${COLUMN_TOP * 100}%`,
          alignItems: 'center',
        }}
      >
        <BoldText
          style={{ fontSize: 15.5, lineHeight: 22, textAlign: 'center' }}
        >
          {title}
        </BoldText>
        <RegText
          style={{
            marginTop: 6,
            maxWidth: 310,
            fontSize: 11.5,
            lineHeight: 19,
            textAlign: 'center',
            color: colors.fgMuted,
          }}
        >
          {sub}
        </RegText>
        <Pressable
          testID="walleterror.details"
          onPress={() => setOpen(o => !o)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={{
            marginTop: 14,
            paddingHorizontal: 8,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RegText style={{ fontSize: 10.5, color: colors.fgMuted }}>
            {translate('walleterror.details') as string}
          </RegText>
          <Animated.View style={chevronStyle}>
            <FontAwesomeIcon
              icon={faChevronDown}
              size={10}
              color={colors.fgMuted}
            />
          </Animated.View>
        </Pressable>
        {open && (
          <Animated.View
            testID="walleterror.details.box"
            entering={boxEnter()}
            exiting={boxExit()}
            style={{
              alignSelf: 'stretch',
              marginTop: 6,
              padding: 10,
              borderRadius: 8,
              backgroundColor: colors.bgSurface,
              borderWidth: 1,
              borderColor: colors.bottomSheetBorder,
            }}
          >
            <RegText
              selectable
              style={{ fontFamily: MONO, fontSize: 10.5, lineHeight: 16 }}
            >
              {details}
            </RegText>
          </Animated.View>
        )}
      </View>

      {link(
        translate('walleterror.import') as string,
        onImport,
        140,
        14,
        'walleterror.import',
      )}
      <Pressable
        testID="walleterror.open"
        onPress={onRetry}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 80,
          alignSelf: 'center',
          width: 270,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.bgAccent,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed && !busy ? 0.97 : 1 }],
        })}
      >
        {busy ? (
          <Animated.View
            key="dots"
            entering={labelEnter()}
            exiting={labelExit()}
          >
            <LoadingDots
              size={6}
              gap={5}
              color={colors.bgCanvas}
              testID="walleterror.open.dots"
            />
          </Animated.View>
        ) : (
          <Animated.View
            key="label"
            entering={labelEnter()}
            exiting={labelExit()}
          >
            <RegText style={{ fontSize: 16, color: colors.bgCanvas }}>
              {translate('walleterror.open') as string}
            </RegText>
          </Animated.View>
        )}
      </Pressable>
      {link(
        translate('walleterror.create') as string,
        onCreate,
        34,
        13.5,
        'walleterror.create',
      )}
    </View>
  );
};

export default WalletError;
