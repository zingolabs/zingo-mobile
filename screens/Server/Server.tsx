/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import {
  ChainNameEnum,
  SelectServerEnum,
  ServerType,
  ServerUrisType,
  TranslateType,
} from '@app/AppState';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import { ServerStatus } from '@app/AppState/types/ServerStatus';
import ServerRow, {
  DoneButton,
  Latency,
  ROW_DIVIDER,
  RowCard,
  ScreenHeader,
} from './ServerRow';
import CustomServerBox from './CustomServerBox';
import SaveSheet from './SaveSheet';
import { LogLine } from './ServerLog';
import { hostOf, useCustomServer } from './useCustomServer';

export type ServerProps = {
  translate: (key: string) => TranslateType;
  // The network the screen opens on; the server's own by default.
  initialChain?: ChainNameEnum;
  server: ServerType;
  selectServer: SelectServerEnum;
  status: ServerStatus;
  blockHeight: string;
  // True while the host applies a choice.
  busy: boolean;
  online: boolean;
  // The recommended (Zaino) servers of every network.
  recommended: ServerUrisType[];
  latencies: Record<string, number | null>;
  onAuto: (chain: ChainNameEnum) => void;
  onPick: (server: ServerUrisType) => void;
  // Uses a custom server that passed a test; true once Zingo uses it.
  onSaveCustom: (chain: ChainNameEnum, uri: string) => Promise<boolean>;
  onOffline: (on: boolean, chain: ChainNameEnum) => void;
  onOther: (chain: ChainNameEnum) => void;
  onProbe: (chain: ChainNameEnum) => void;
  onUnreachable: () => void;
  onBack: () => void;
  // Set to a guard the host calls on a system back; true when the screen
  // handled it (an unsaved custom server asks first).
  backGuard?: React.MutableRefObject<(() => boolean) | null>;
};

const CARD_TOP = 98.5 / 874;
const SEGMENT_TOP = 175.5 / 874;
const BODY_TOP = 229.5 / 874;
const BODY_BOTTOM = 110;
const CHAINS: ChainNameEnum[] = [
  ChainNameEnum.mainChainName,
  ChainNameEnum.testChainName,
  ChainNameEnum.regtestChainName,
];
const THUMB_BG = '#0A2A1A';
const THUMB_BORDER = '#1E6B2A';
const WAIT = '#E6B43C';
const LEAVE_AFTER_SAVE_MS = 1500;

const fadeIn = () =>
  FadeIn.duration(duration.base).reduceMotion(ReduceMotion.System);
const fadeOut = () =>
  FadeOut.duration(duration.fast).reduceMotion(ReduceMotion.System);
const layout = () =>
  LinearTransition.duration(240)
    .easing(ease.emphasized)
    .reduceMotion(ReduceMotion.System);

const fill = (text: string, values: Record<string, string>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), text);

type StatusDotProps = { status: ServerStatus; offline: boolean };

const StatusDot: React.FC<StatusDotProps> = ({ status, offline }) => {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value =
      status === 'wait' && !offline
        ? withRepeat(
            withSequence(
              withTiming(1.15, { duration: 450, easing: ease.standard }),
              withTiming(0.7, { duration: 450, easing: ease.standard }),
            ),
            -1,
            true,
          )
        : withTiming(1, { duration: duration.base });
  }, [status, offline, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.5 + (pulse.value - 0.7) / 0.9,
  }));
  const inner = offline
    ? colors.fgMuted
    : status === 'wait'
      ? WAIT
      : status === 'bad'
        ? colors.fgDangerEmphasis
        : colors.fgAccent;
  return (
    <View
      style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: `${inner}38`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          { width: 8, height: 8, borderRadius: 4, backgroundColor: inner },
          pulseStyle,
        ]}
      />
    </View>
  );
};

type ToggleProps = { on: boolean; disabled: boolean; onToggle: () => void };

const KNOB_MS = 220;
// Offline fades the network switch and the lists to 40%.
const LOCK_MS = 200;
const LOCKED_OPACITY = 0.4;

const Toggle: React.FC<ToggleProps> = ({ on, disabled, onToggle }) => {
  const { colors } = useTheme();
  const knob = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    knob.value = withTiming(on ? 1 : 0, {
      duration: KNOB_MS,
      easing: ease.emphasized,
    });
  }, [on, knob]);
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knob.value * 18 }],
  }));
  return (
    <Pressable
      testID="server.offline"
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      hitSlop={8}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 2,
        backgroundColor: on ? colors.bgAccent : ROW_DIVIDER,
      }}
    >
      <Animated.View
        style={[
          {
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: on ? colors.bgCanvas : colors.fgMuted,
          },
          knobStyle,
        ]}
      />
    </Pressable>
  );
};

const Server: React.FunctionComponent<ServerProps> = ({
  translate,
  initialChain,
  server,
  selectServer,
  status,
  blockHeight,
  busy,
  online,
  recommended,
  latencies,
  onAuto,
  onPick,
  onSaveCustom,
  onOffline,
  onOther,
  onProbe,
  onUnreachable,
  onBack,
  backGuard,
}) => {
  const { colors } = useTheme();
  const t = (key: string, values: Record<string, string> = {}) =>
    fill(translate(`server.${key}`) as string, values);
  const offline = server.kind === 'offline';
  const [tab, setTab] = useState<ChainNameEnum>(
    initialChain ??
      (CHAINS.includes(server.chainName) ? server.chainName : CHAINS[0]),
  );
  // The network whose Custom row is open without being the saved choice.
  const [customOpen, setCustomOpen] = useState<ChainNameEnum | null>(null);
  const [asking, setAsking] = useState(false);
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const [segmentW, setSegmentW] = useState(0);
  const thumb = useSharedValue(CHAINS.indexOf(tab));

  const netName = (chain: ChainNameEnum) =>
    translate(
      chain === ChainNameEnum.testChainName
        ? 'settings.value-chainname-test'
        : chain === ChainNameEnum.regtestChainName
          ? 'settings.value-chainname-regtest'
          : 'settings.value-chainname-main',
    ) as string;

  const custom = useCustomServer({
    translate,
    online,
    savedUri: chain =>
      server.kind === 'remote' &&
      selectServer === SelectServerEnum.custom &&
      server.chainName === chain
        ? server.uri
        : null,
    netName,
    onSave: onSaveCustom,
  });

  useEffect(() => {
    onProbe(tab);
  }, [tab, onProbe]);

  useEffect(() => {
    thumb.value = withTiming(CHAINS.indexOf(tab), {
      duration: 260,
      easing: ease.emphasized,
    });
  }, [tab, thumb]);

  const segment = (segmentW - 4) / 3;
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumb.value * segment }],
  }));

  const regtest = tab === ChainNameEnum.regtestChainName;
  const onTab = !offline && server.chainName === tab;
  const customSelected =
    regtest ||
    customOpen === tab ||
    (onTab && customOpen === null && selectServer === SelectServerEnum.custom);
  const isAuto =
    onTab && customOpen !== tab && selectServer === SelectServerEnum.auto;
  const pickedUri =
    onTab &&
    customOpen !== tab &&
    server.kind === 'remote' &&
    selectServer === SelectServerEnum.list
      ? server.uri
      : null;
  const rows = recommended.filter(s => s.chainName === tab && !s.obsolete);
  const otherPicked = !!pickedUri && !rows.some(s => s.uri === pickedUri);
  const fastest = rows
    .filter(s => typeof latencies[s.uri] === 'number')
    .sort(
      (a, b) => (latencies[a.uri] as number) - (latencies[b.uri] as number),
    )[0];

  const draft = custom.draft(tab);
  const saved = custom.savedSame(tab);
  const dirty = !offline && !!draft.host.trim() && customSelected && !saved;
  const working = custom.working !== null;
  const locked = busy || offline || working;
  const lock = useSharedValue(offline ? LOCKED_OPACITY : 1);
  useEffect(() => {
    lock.value = withTiming(offline ? LOCKED_OPACITY : 1, {
      duration: LOCK_MS,
      easing: ease.standard,
    });
  }, [offline, lock]);
  const lockStyle = useAnimatedStyle(() => ({ opacity: lock.value }));

  const cardName = offline
    ? t('offline')
    : server.kind === 'remote'
      ? selectServer === SelectServerEnum.auto
        ? `${hostOf(server.uri)} ${t('automatic-suffix')}`
        : hostOf(server.uri)
      : '';
  const cardSub = offline
    ? t('offline-card')
    : !online && status !== 'wait'
      ? t('card-no-internet')
      : status === 'wait'
        ? t('connecting')
        : status === 'bad'
          ? t('card-bad', { net: netName(server.chainName) })
          : t('card-connected', {
              net: netName(server.chainName),
              height: blockHeight,
            });
  const cardStatus: ServerStatus =
    !offline && !online && status !== 'wait' ? 'bad' : status;

  // A saved custom server says how it is doing until it is tested again.
  const log: LogLine[] =
    draft.log.length === 0 && saved && status !== 'wait'
      ? [
          {
            final: true,
            tone: status === 'bad' ? 'bad' : 'ok',
            text: t(status === 'bad' ? 'saved-bad' : 'saved-ok'),
          },
        ]
      : draft.log;
  const result =
    draft.tested !== null
      ? true
      : log.some(l => l.final && l.tone === 'bad')
        ? false
        : undefined;

  const leave = () => {
    if (working || asking) {
      return;
    }
    if (dirty) {
      setAsking(true);
      return;
    }
    onBack();
  };
  if (backGuard) {
    backGuard.current = () => {
      if (working || asking || dirty) {
        leave();
        return true;
      }
      return false;
    };
  }

  const changeTab = (chain: ChainNameEnum) => {
    if (working || chain === tab) {
      return;
    }
    setCustomOpen(null);
    setTab(chain);
  };

  const switchTo = (chain: ChainNameEnum) => {
    custom.seed(chain, draft.host, draft.port);
    setCustomOpen(
      chain === ChainNameEnum.regtestChainName ||
        (server.chainName === chain && selectServer === SelectServerEnum.custom)
        ? null
        : chain,
    );
    setTab(chain);
    custom.test(chain);
  };

  const pickRecommended = (s: ServerUrisType) => {
    if (latencies[s.uri] === null) {
      setShakes(k => ({ ...k, [s.uri]: (k[s.uri] ?? 0) + 1 }));
      onUnreachable();
      return;
    }
    setCustomOpen(null);
    if (pickedUri !== s.uri) {
      onPick(s);
    }
  };

  const customBlock = (
    <CustomServerBox
      chain={tab}
      host={draft.host}
      port={draft.port}
      log={log}
      shown={draft.log.length === 0 ? log.length : draft.shown}
      result={result}
      saved={saved}
      working={custom.working}
      disabled={busy || offline}
      shake={custom.shake}
      pulse={custom.pulse}
      autoFocus={customOpen === tab}
      labels={{
        test: t('test'),
        save: t('save'),
        saved: t('saved'),
        details: t('details'),
        host: t('host-placeholder'),
        hostRegtest: t('host-placeholder-regtest'),
        port: t('port'),
      }}
      onHost={text => custom.setHost(tab, text)}
      onPort={text => custom.setPort(tab, text)}
      onTest={() => custom.test(tab)}
      onSave={() => custom.save(tab)}
      onSwitch={switchTo}
    />
  );

  const body = regtest ? (
    <>
      <BoldText
        style={{
          marginHorizontal: 21.5,
          marginTop: 8,
          marginBottom: 18,
          fontSize: 12.5,
        }}
      >
        {t('regtest-label')}
      </BoldText>
      <View style={{ marginHorizontal: 21.5 }}>{customBlock}</View>
    </>
  ) : (
    <>
      <RowCard>
        <ServerRow
          testID="server.auto"
          first
          title={t('automatic')}
          sub={
            fastest ? t('fastest', { host: hostOf(fastest.uri) }) : undefined
          }
          selected={isAuto}
          disabled={locked}
          onPress={() => {
            setCustomOpen(null);
            if (!isAuto) {
              onAuto(tab);
            }
          }}
        />
        {rows.map(s => (
          <ServerRow
            key={s.uri}
            testID={`server.pick.${hostOf(s.uri)}`}
            title={hostOf(s.uri)}
            sub={s.region}
            selected={pickedUri === s.uri}
            disabled={locked}
            shake={shakes[s.uri] ?? 0}
            right={
              <Latency
                ms={latencies[s.uri]}
                notResponding={t('not-responding')}
              />
            }
            onPress={() => pickRecommended(s)}
          />
        ))}
      </RowCard>
      <Animated.View layout={layout()} style={{ marginTop: 14 }}>
        <RowCard>
          <ServerRow
            testID="server.other"
            first
            title={t('other')}
            selected={otherPicked}
            disabled={locked}
            chevron
            onPress={() => onOther(tab)}
          />
          <ServerRow
            testID="server.custom"
            title={t('custom')}
            selected={customSelected}
            disabled={locked}
            onPress={() => {
              if (!customSelected) {
                setCustomOpen(tab);
              }
            }}
          />
          {customSelected && (
            <Animated.View
              entering={fadeIn()}
              exiting={fadeOut()}
              style={{ paddingHorizontal: 14.5, paddingBottom: 14 }}
            >
              {customBlock}
            </Animated.View>
          )}
        </RowCard>
      </Animated.View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View
        testID="server.card"
        accessible
        style={{
          position: 'absolute',
          left: 22.5,
          right: 22.5,
          top: `${CARD_TOP * 100}%`,
          height: 61,
          borderRadius: 14,
          backgroundColor: colors.bgSurface,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 13,
          paddingRight: 16,
          gap: 12,
        }}
      >
        <StatusDot status={cardStatus} offline={offline} />
        <Animated.View
          key={`${cardName}|${cardSub}`}
          entering={fadeIn()}
          exiting={fadeOut()}
          style={{ flex: 1, minWidth: 0 }}
        >
          <RegText
            numberOfLines={1}
            style={{ fontSize: 13.5, lineHeight: 19, fontWeight: '500' }}
          >
            {cardName}
          </RegText>
          <RegText
            testID="server.card.sub"
            numberOfLines={1}
            style={{
              fontSize: 11,
              lineHeight: 16,
              marginTop: 1,
              color: colors.fgMuted,
            }}
          >
            {cardSub}
          </RegText>
        </Animated.View>
      </View>

      <Animated.View
        testID="server.segments"
        onLayout={e => setSegmentW(e.nativeEvent.layout.width)}
        style={[
          {
            position: 'absolute',
            left: 22.5,
            right: 22.5,
            top: `${SEGMENT_TOP * 100}%`,
            height: 37,
            borderRadius: 999,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            flexDirection: 'row',
          },
          lockStyle,
        ]}
      >
        {segmentW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 1,
                bottom: 1,
                left: 1,
                width: segment,
                borderRadius: 999,
                backgroundColor: THUMB_BG,
                borderWidth: 1,
                borderColor: THUMB_BORDER,
              },
              thumbStyle,
            ]}
          />
        )}
        {CHAINS.map(chain => (
          <Pressable
            key={chain}
            testID={`server.net.${chain}`}
            onPress={() => changeTab(chain)}
            disabled={locked}
            accessibilityRole="tab"
            accessibilityState={{ selected: chain === tab }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <RegText
              style={{
                fontSize: 12.5,
                fontWeight: '500',
                color: chain === tab ? colors.fgDefault : colors.fgMuted,
              }}
            >
              {netName(chain)}
            </RegText>
          </Pressable>
        ))}
      </Animated.View>

      <ScrollView
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${BODY_TOP * 100}%`,
          bottom: BODY_BOTTOM,
        }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={tab}
          entering={FadeIn.duration(200)
            .delay(120)
            .reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
          style={lockStyle}
          pointerEvents={offline ? 'none' : 'auto'}
        >
          {body}
        </Animated.View>
        <Animated.View
          layout={layout()}
          style={{
            marginHorizontal: 21.5,
            marginTop: 17,
            minHeight: 66,
            borderRadius: 14,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingLeft: 16.5,
            paddingRight: 16,
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <BoldText style={{ fontSize: 13.5, lineHeight: 19 }}>
              {t('offline')}
            </BoldText>
            <RegText
              style={{ fontSize: 11, lineHeight: 17, color: colors.fgMuted }}
            >
              {t('offline-sub')}
            </RegText>
          </View>
          <Toggle
            on={offline}
            disabled={busy || working}
            onToggle={() => {
              setCustomOpen(null);
              if (offline && regtest) {
                setTab(ChainNameEnum.mainChainName);
              }
              onOffline(!offline, tab);
            }}
          />
        </Animated.View>
      </ScrollView>

      <DoneButton
        testID="server.done"
        title={t('done')}
        onPress={leave}
        disabled={busy || working}
      />
      <ScreenHeader
        testID="server.back"
        title={t('title')}
        onBack={leave}
        disabled={busy || working}
      />
      {asking && (
        <SaveSheet
          title={t('unsaved-title')}
          body={
            t(draft.tested !== null ? 'unsaved-tested' : 'unsaved-untested', {
              host: draft.host.trim(),
            }) +
            t('unsaved-keeps', {
              current: offline ? t('unsaved-offline') : cardName,
            })
          }
          saveLabel={t('save')}
          discardLabel={t('dont-save')}
          keepLabel={t('keep-editing')}
          onKeep={() => setAsking(false)}
          onDiscard={() => {
            setAsking(false);
            custom.forget(tab);
            setCustomOpen(null);
            onBack();
          }}
          onSave={async () => {
            setAsking(false);
            if (await custom.save(tab)) {
              setTimeout(onBack, LEAVE_AFTER_SAVE_MS);
            }
          }}
        />
      )}
    </View>
  );
};

export default Server;
