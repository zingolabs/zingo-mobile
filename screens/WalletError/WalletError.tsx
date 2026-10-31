/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  iconSize,
  iconSizeMd,
  iconSizeSm,
  radiusPill,
  radiusSm,
  slopFor,
  space4,
  space8,
  space12,
  space16,
  space20,
  touchTarget,
  useTheme,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import Pressable from '@ui/primitives/Pressable';
import { ContextAppLoading } from '@app/context';
import Text from '@ui/primitives/Text';
import Button from '@ui/primitives/Button';
import Tag from '@ui/widgets/Tag';
import { WalletErrorKind } from '@app/AppState/types/WalletErrorInfo';
import { ChainNameEnum } from '@app/AppState';
import { showConfirm } from '@app/services/showConfirm';
import { useBottomActionPad } from '@app/hooks/useBottomActionPad';
import { DatabaseIcon } from '@ui/primitives/Icons/DatabaseIcon';
import { ChevronDown } from '@ui/primitives/Icons/Chevron';
import { WalletIcon } from '@ui/primitives/Icons/WalletIcon';
import { useScrollEdges } from '@ui/widgets/ScrollEdges';

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
/** From the Create link's bottom to the button's, and the button's to the top link's. */
const LINK_TO_BUTTON = 46;
const BUTTON_TO_LINK = 60;
const SERVER_DOT = 8;
const SUB_MAX = 310;

const badgeEnter = () =>
  new Keyframe({
    0: { transform: [{ scale: 0 }] },
    100: { transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(duration.emphasized)
    .delay(duration.base)
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
  resolved = false,
}) => {
  const { translate, netInfo, server } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const { edges, fades } = useScrollEdges();
  const bottomPad = useBottomActionPad();
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
    : !netInfo.isConnected || kind === 'server'
      ? colors.fgDanger
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

  const netChip = (net: ChainNameEnum, label: string, testID: string) => (
    <View testID={testID} style={{ alignItems: 'center', gap: space4 }}>
      <Tag tone={net === ChainNameEnum.mainChainName ? 'accent' : 'warning'}>
        {netName(net)}
      </Tag>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );

  /**
   * The column scrolls above the footer's top, so open details or a large
   * font never run under its buttons.
   */
  const [rootH, setRootH] = useState<number>(0);
  const [footerTop, setFooterTop] = useState<number>(0);
  const columnBottom =
    rootH > 0 && footerTop > 0 ? rootH - footerTop + space16 : undefined;

  /**
   * The lowest action ends at the one bottom distance; the others keep
   * their gaps above it.
   */
  const buttonBottom = chain ? bottomPad : bottomPad + LINK_TO_BUTTON;
  const topLinkBottom = buttonBottom + BUTTON_TO_LINK;

  const link = (
    label: string,
    onPress: () => void,
    bottom: number,
    testID: string,
    top = false,
  ) => (
    <View
      onLayout={top ? e => setFooterTop(e.nativeEvent.layout.y) : undefined}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        alignItems: 'center',
      }}
    >
      <Button
        testID={testID}
        variant="text"
        inline
        disabled={busy}
        title={label}
        onPress={onPress}
      />
    </View>
  );

  return (
    <View
      style={{ flex: 1 }}
      onLayout={e => setRootH(e.nativeEvent.layout.height)}
    >
      <Pressable
        kind="icon"
        testID="walleterror.server"
        onPress={onServer}
        disabled={busy}
        hitSlop={slopFor(touchTarget)}
        accessibilityRole="button"
        style={{
          position: 'absolute',
          right: space12,
          top: 0,
          width: touchTarget,
          height: touchTarget,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DatabaseIcon color={colors.fgMuted} size={iconSizeMd} />
        <View
          style={{
            position: 'absolute',
            right: space8,
            bottom: space8,
            width: SERVER_DOT,
            height: SERVER_DOT,
            borderRadius: radiusPill,
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
            borderRadius: radiusPill,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            alignItems: 'center',
            justifyContent: 'center',
          },
          iconStyle,
        ]}
      >
        {kind === 'server' ? (
          <DatabaseIcon color={colors.fgDefault} size={iconSize} />
        ) : (
          <WalletIcon color={colors.fgDefault} size={iconSize} />
        )}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
            badgeStyle,
          ]}
        >
          {chain ? (
            <Animated.View
              testID="walleterror.netbadge"
              entering={badgeEnter()}
              style={{
                position: 'absolute',
                left: ICON - space20,
                top: 0,
              }}
            >
              <Tag tone="warning">{netName(chain)}</Tag>
            </Animated.View>
          ) : (
            <Animated.View
              entering={badgeEnter()}
              style={{
                position: 'absolute',
                left: ICON - space20,
                top: 0,
                width: BADGE,
                height: BADGE,
                borderRadius: radiusPill,
                backgroundColor: colors.bgDanger,
                borderWidth: 2,
                borderColor: colors.bgCanvas,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                variant="caption"
                color={colors.fgOnAccent}
                style={{ fontWeight: '700' }}
              >
                !
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>

      <ScrollView
        {...edges}
        style={{
          position: 'absolute',
          left: space20,
          right: space20,
          top: `${COLUMN_TOP * 100}%`,
          bottom: columnBottom,
        }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        <Text variant="subtitle" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        <Text
          variant="bodySmall"
          tone="muted"
          style={{ marginTop: space8, maxWidth: SUB_MAX, textAlign: 'center' }}
        >
          {sub}
        </Text>
        {chain && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space12,
              marginTop: space16,
            }}
          >
            {netChip(
              chain,
              translate('walleterror.chip-wallet') as string,
              'walleterror.chip.wallet',
            )}
            <Text
              variant="bodyStrong"
              tone="muted"
              style={{ marginBottom: space16 }}
            >
              ≠
            </Text>
            {netChip(
              server.chainName,
              translate('walleterror.chip-server') as string,
              'walleterror.chip.server',
            )}
          </View>
        )}
        <Pressable
          kind="link"
          testID="walleterror.details"
          onPress={() => setOpen(o => !o)}
          hitSlop={slopFor(iconSizeSm)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={{
            marginTop: space12,
            paddingHorizontal: space8,
            paddingVertical: space4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space4,
          }}
        >
          <Text variant="caption" tone="muted">
            {translate('walleterror.details') as string}
          </Text>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={iconSizeSm} color={colors.fgMuted} />
          </Animated.View>
        </Pressable>
        <View style={{ alignSelf: 'stretch' }}>
          <DetailsBox open={open}>
            <View
              style={{
                marginTop: space8,
                padding: space12,
                borderRadius: radiusSm,
                backgroundColor: colors.bgSurface,
                borderWidth: 1,
                borderColor: colors.bottomSheetBorder,
              }}
            >
              <Text selectable variant="address">
                {details}
              </Text>
            </View>
          </DetailsBox>
        </View>
      </ScrollView>
      {fades}

      {chain
        ? link(
            translate('walleterror.more') as string,
            moreOptions,
            topLinkBottom,
            'walleterror.more',
            true,
          )
        : link(
            translate('walleterror.import') as string,
            onImport,
            topLinkBottom,
            'walleterror.import',
            true,
          )}
      <View
        style={{
          position: 'absolute',
          bottom: buttonBottom,
          left: space20,
          right: space20,
        }}
      >
        <Button
          testID={chain ? 'walleterror.chain' : 'walleterror.open'}
          variant="primary"
          busy={busy}
          title={primaryLabel}
          onPress={chain ? () => onSwitchChain(chain) : onRetry}
        />
      </View>
      {!chain &&
        link(
          translate('walleterror.create') as string,
          onCreate,
          bottomPad,
          'walleterror.create',
        )}
    </View>
  );
};

export default WalletError;
