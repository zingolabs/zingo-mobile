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
import { ChainNameEnum } from '@app/AppState';
import { showConfirm } from '@app/services/showConfirm';

type WalletErrorProps = {
  kind: WalletErrorKind;
  details: string;
  // The wallet's network, for the 'chain' kind.
  walletChain?: ChainNameEnum;
  busy: boolean;
  // Changes on every failed retry; the icon shakes once per change.
  shake: number;
  onRetry: () => void;
  onImport: () => void;
  onCreate: () => void;
  onServer: () => void;
  // The 'chain' kind's fix: Automatic on the wallet's network, then open.
  onSwitchChain: (chain: ChainNameEnum) => void;
};

const ICON_TOP = 226 / 874;
const COLUMN_TOP = 328 / 874;
const ICON = 75;
const BADGE = 17;
const SHAKE_STEP_MS = 64;
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
  walletChain,
  busy,
  shake,
  onRetry,
  onImport,
  onCreate,
  onServer,
  onSwitchChain,
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
  const netName = (chain: ChainNameEnum) =>
    translate(
      chain === ChainNameEnum.testChainName
        ? 'settings.value-chainname-test'
        : chain === ChainNameEnum.regtestChainName
          ? 'settings.value-chainname-regtest'
          : 'settings.value-chainname-main',
    ) as string;
  // On the chain kind the retry cannot succeed, so the primary action is a
  // server on the wallet's network.
  const chain = kind === 'chain' && walletChain ? walletChain : null;
  const title = chain
    ? (translate('walleterror.chain-title') as string).replace(
        '{net}',
        netName(chain),
      )
    : (translate(
        kind === 'server'
          ? 'walleterror.server-title'
          : 'walleterror.open-title',
      ) as string);
  const sub = chain
    ? (translate('walleterror.chain-sub') as string)
        .replace('{server}', netName(server.chainName))
        .replace('{net}', netName(chain))
    : kind === 'server'
      ? (translate('walleterror.server-sub') as string).replace('{host}', host)
      : (translate('walleterror.open-sub') as string);
  const primaryLabel = chain
    ? (translate('walleterror.chain-action') as string).replace(
        '{net}',
        netName(chain),
      )
    : (translate('walleterror.open') as string);

  // Import and Create are not needed to fix a network mismatch; they wait in
  // a sheet that says they replace this wallet.
  const moreOptions = () =>
    chain &&
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
          onPress: onImport,
        },
        {
          text: translate('walleterror.more-create') as string,
          style: 'destructive',
          onPress: onCreate,
        },
        { text: translate('cancel') as string, style: 'cancel' },
      ],
    });

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
        {chain ? (
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
              {netName(chain)}
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
        {chain && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
            }}
          >
            {netChip(
              chain,
              translate('walleterror.chip-wallet') as string,
              'walleterror.chip.wallet',
            )}
            <BoldText
              style={{ fontSize: 14, color: '#5A6F8F', marginBottom: 16 }}
            >
              ≠
            </BoldText>
            {netChip(
              server.chainName,
              translate('walleterror.chip-server') as string,
              'walleterror.chip.server',
            )}
          </View>
        )}
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

      {chain
        ? link(
            translate('walleterror.more') as string,
            moreOptions,
            140,
            12.5,
            'walleterror.more',
          )
        : link(
            translate('walleterror.import') as string,
            onImport,
            140,
            14,
            'walleterror.import',
          )}
      <Pressable
        testID={chain ? 'walleterror.chain' : 'walleterror.open'}
        onPress={chain ? () => onSwitchChain(chain) : onRetry}
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
              {primaryLabel}
            </RegText>
          </Animated.View>
        )}
      </Pressable>
      {!chain &&
        link(
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
