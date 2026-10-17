/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Keyframe,
  ReduceMotion,
  runOnJS,
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
import { WalletErrorInfo } from '@app/AppState/types/WalletErrorInfo';
import { ChainNameEnum } from '@app/AppState';
import { showConfirm } from '@app/services/showConfirm';
import {
  ErrorAction,
  Link,
  LinkAction,
  Slot,
  Text,
  errorScreen,
} from './walletErrorModel';

type WalletErrorProps = {
  error: WalletErrorInfo;
  busy: boolean;
  // Changes on every failed retry; the icon shakes once per change.
  shake: number;
  onAction: (action: ErrorAction) => void;
  // A retry worked: the badge shrinks away and the server dot turns green.
  resolved?: boolean;
};

const ICON_TOP = 226 / 874;
const COLUMN_TOP = 328 / 874;
const ICON = 75;
const BADGE = 17;
const SHAKE_STEP_MS = 64;
const BADGE_OUT_MS = 200;
const DETAILS_OPEN_MS = 240;
const DETAILS_CLOSE_MS = 180;
const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
// The network pill on the wallet icon and the chips: amber for a network
// other than Mainnet, green for Mainnet.
const NET_AMBER = { bg: '#1C170A', border: '#8A6D1E', ink: '#E6C46A' };
const NET_GREEN = { bg: '#0A2412', border: '#1E6B2A', ink: '#8FDC80' };
const CHIP_LABEL = '#8DA0B8';

const badgeEnter = () =>
  new Keyframe({
    0: { transform: [{ scale: 0 }] },
    100: { transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(300)
    .delay(200)
    .reduceMotion(ReduceMotion.System);
// The details grow from 0 to their height while fading in, and fold back.
// The text is measured in a free copy: inside the clipped box it would never
// lay out while the box is at height 0.
const DetailsBox: React.FunctionComponent<{
  open: boolean;
  children: React.ReactNode;
}> = ({ open, children }) => {
  const [shown, setShown] = useState(open);
  const [height, setHeight] = useState(0);
  const progress = useSharedValue(0);
  useEffect(() => {
    if (open) {
      setShown(true);
    }
  }, [open]);
  useEffect(() => {
    if (!shown || !height) {
      return;
    }
    progress.value = withTiming(
      open ? 1 : 0,
      {
        duration: open ? DETAILS_OPEN_MS : DETAILS_CLOSE_MS,
        easing: ease.emphasized,
        reduceMotion: ReduceMotion.System,
      },
      finished => {
        if (finished && !open) {
          runOnJS(setShown)(false);
        }
      },
    );
  }, [open, shown, height, progress]);
  const style = useAnimatedStyle(() => ({
    height: progress.value * height,
    opacity: progress.value,
  }));
  if (!shown) {
    return null;
  }
  return (
    <>
      <View
        pointerEvents="none"
        onLayout={e => setHeight(e.nativeEvent.layout.height)}
        style={{ position: 'absolute', left: 0, right: 0, opacity: 0 }}
      >
        {children}
      </View>
      <Animated.View
        testID="walleterror.details.box"
        style={[{ alignSelf: 'stretch', overflow: 'hidden' }, style]}
      >
        {children}
      </Animated.View>
    </>
  );
};
const labelEnter = () =>
  FadeIn.duration(duration.fast).reduceMotion(ReduceMotion.System);
const labelExit = () =>
  FadeOut.duration(duration.fast).reduceMotion(ReduceMotion.System);

const WalletError: React.FunctionComponent<WalletErrorProps> = ({
  error,
  busy,
  shake,
  onAction,
  resolved = false,
}) => {
  const { translate, netInfo, server } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const shakeX = useSharedValue(0);
  const chevron = useSharedValue(0);
  const firstShake = useRef(true);
  const model = errorScreen(error, server);

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
      duration: open ? DETAILS_OPEN_MS : DETAILS_CLOSE_MS,
      easing: ease.emphasized,
    });
  }, [open, chevron]);

  const badgeScale = useSharedValue(1);
  useEffect(() => {
    if (resolved) {
      badgeScale.value = withTiming(0, {
        duration: BADGE_OUT_MS,
        easing: ease.in,
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [resolved, badgeScale]);
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value}deg` }],
  }));

  const offline = server.kind === 'offline';
  const dotColor = resolved
    ? colors.fgAccent
    : !netInfo.isConnected || model.icon === 'server'
      ? colors.fgDangerEmphasis
      : offline
        ? colors.fgMuted
        : colors.fgAccent;
  const netName = (chain: ChainNameEnum) =>
    translate(
      chain === ChainNameEnum.testChainName
        ? 'settings.value-chainname-test'
        : chain === ChainNameEnum.regtestChainName
          ? 'settings.value-chainname-regtest'
          : 'settings.value-chainname-main',
    ) as string;
  const text = (t: Text): string => {
    switch (t.kind) {
      case 'plain':
        return translate(t.key) as string;
      case 'host':
        return (translate(t.key) as string).replace('{host}', t.host);
      case 'nets':
        return (translate(t.key) as string)
          .replace('{net}', netName(t.net))
          .replace('{server}', netName(t.server));
    }
  };
  const title = text(model.title);

  // Import and Create are not needed to fix a network mismatch; they wait in
  // a sheet that says they replace this wallet.
  const moreOptions = (chain: ChainNameEnum) =>
    showConfirm({
      title: translate('walleterror.more') as string,
      message: (translate('walleterror.more-warn') as string).replace(
        '{net}',
        netName(chain),
      ),
      messageTone: 'danger',
      buttons: [
        {
          text: translate('walleterror.more-import') as string,
          style: 'destructive',
          onPress: () => onAction({ kind: 'import' }),
        },
        {
          text: translate('walleterror.more-create') as string,
          style: 'destructive',
          onPress: () => onAction({ kind: 'create' }),
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });
  const act = (action: LinkAction) => {
    switch (action.kind) {
      case 'more':
        moreOptions(action.chain);
        return;
      default:
        onAction(action);
    }
  };

  const netChip = (net: ChainNameEnum, label: string, testID: string) => {
    const tone = net === ChainNameEnum.mainChainName ? NET_GREEN : NET_AMBER;
    return (
      <View testID={testID} style={{ alignItems: 'center', gap: 5 }}>
        <View
          style={{
            height: 24,
            paddingHorizontal: 11,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: tone.border,
            backgroundColor: tone.bg,
            justifyContent: 'center',
          }}
        >
          <BoldText style={{ fontSize: 11.5, color: tone.ink }}>
            {netName(net)}
          </BoldText>
        </View>
        <RegText style={{ fontSize: 10.5, color: CHIP_LABEL }}>{label}</RegText>
      </View>
    );
  };

  const link = ({ label, action, testID, size }: Link, bottom: number) => (
    <Pressable
      testID={testID}
      onPress={() => act(action)}
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
        {text(label)}
      </RegText>
    </Pressable>
  );
  const slot = (s: Slot, bottom: number) => {
    switch (s.kind) {
      case 'none':
        return null;
      case 'link':
        return link(s.link, bottom);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Pressable
        testID="walleterror.server"
        onPress={() => onAction({ kind: 'server' })}
        disabled={busy}
        hitSlop={8}
        accessibilityRole="button"
        style={{
          position: 'absolute',
          right: 19,
          top: 1,
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
          icon={model.icon === 'server' ? faDatabase : faWallet}
          color={colors.fgDefault}
          size={28}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
            badgeStyle,
          ]}
        >
          {model.badge.kind === 'net' ? (
            <Animated.View
              testID="walleterror.netbadge"
              entering={badgeEnter()}
              style={{
                position: 'absolute',
                left: 55,
                top: -2,
                height: 20,
                paddingHorizontal: 7,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: NET_AMBER.border,
                backgroundColor: NET_AMBER.bg,
                justifyContent: 'center',
              }}
            >
              <BoldText
                numberOfLines={1}
                style={{ fontSize: 9.5, lineHeight: 12, color: NET_AMBER.ink }}
              >
                {netName(model.badge.chain)}
              </BoldText>
            </Animated.View>
          ) : (
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
              <BoldText
                style={{ fontSize: 10, lineHeight: 12, color: '#FFFFFF' }}
              >
                !
              </BoldText>
            </Animated.View>
          )}
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
          {text(model.sub)}
        </RegText>
        {model.chips.kind === 'nets' && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
            }}
          >
            {netChip(
              model.chips.wallet,
              translate('walleterror.chip-wallet') as string,
              'walleterror.chip.wallet',
            )}
            <BoldText
              style={{ fontSize: 14, color: '#5A6F8F', marginBottom: 16 }}
            >
              ≠
            </BoldText>
            {netChip(
              model.chips.server,
              translate('walleterror.chip-server') as string,
              'walleterror.chip.server',
            )}
          </View>
        )}
        <View
          style={{
            marginTop: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <Pressable
            testID="walleterror.details"
            onPress={() => setOpen(o => !o)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            style={{
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
          <Pressable
            testID="walleterror.report"
            onPress={() => onAction({ kind: 'report', subject: title })}
            disabled={busy}
            hitSlop={6}
            accessibilityRole="button"
            style={({ pressed }) => ({
              paddingHorizontal: 8,
              paddingVertical: 4,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <RegText style={{ fontSize: 10.5, color: colors.fgMuted }}>
              {translate('walleterror.report') as string}
            </RegText>
          </Pressable>
        </View>
        <View style={{ alignSelf: 'stretch' }}>
          <DetailsBox open={open}>
            <View
              style={{
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
                {error.details}
              </RegText>
            </View>
          </DetailsBox>
        </View>
      </View>

      {slot(model.top, 140)}
      <Pressable
        testID={model.primary.testID}
        onPress={() => act(model.primary.action)}
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
            <RegText
              style={{
                fontSize: 16,
                color: colors.bgCanvas,
                fontWeight: '700',
              }}
            >
              {text(model.primary.label)}
            </RegText>
          </Animated.View>
        )}
      </Pressable>
      {slot(model.bottom, 34)}
    </View>
  );
};

export default WalletError;
