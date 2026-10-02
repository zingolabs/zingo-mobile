/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoading } from '@app/context';
import {
  ChainNameEnum,
  SelectServerEnum,
  ServerType,
  ServerUrisType,
} from '@app/AppState';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import { LoadingDots } from '@ui/widgets/ProgressState';
import { ServerStatus } from '@app/AppState/types/ServerStatus';
import ServerRow, {
  DoneButton,
  Latency,
  ROW_DIVIDER,
  RowCard,
  ScreenHeader,
} from './ServerRow';

type ServerProps = {
  server: ServerType;
  selectServer: SelectServerEnum;
  status: ServerStatus;
  blockHeight: string;
  busy: boolean;
  servers: ServerUrisType[];
  latencies: Record<string, number | null>;
  onAuto: (chain: ChainNameEnum) => void;
  onPick: (server: ServerUrisType) => void;
  onTestCustom: (chain: ChainNameEnum, uri: string) => Promise<boolean>;
  onOffline: (on: boolean, chain: ChainNameEnum) => void;
  onChoose: () => void;
  onProbe: (chain: ChainNameEnum) => void;
  onBack: () => void;
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
const PLACEHOLDER = '#3F5677';
const OK_TEXT = '#6FD35C';

const hostOf = (uri: string) => uri.replace(/^https?:\/\//, '');

const fadeIn = () =>
  FadeIn.duration(duration.base).reduceMotion(ReduceMotion.System);
const fadeOut = () =>
  FadeOut.duration(duration.fast).reduceMotion(ReduceMotion.System);

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

const Toggle: React.FC<ToggleProps> = ({ on, disabled, onToggle }) => {
  const { colors } = useTheme();
  const knob = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    knob.value = withTiming(on ? 1 : 0, {
      duration: duration.base,
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
  server,
  selectServer,
  status,
  blockHeight,
  busy,
  servers,
  latencies,
  onAuto,
  onPick,
  onTestCustom,
  onOffline,
  onChoose,
  onProbe,
  onBack,
}) => {
  const { translate } = useContext(ContextAppLoading);
  const { colors } = useTheme();
  const offline = server.kind === 'offline';
  const [tab, setTab] = useState<ChainNameEnum>(
    CHAINS.includes(server.chainName) ? server.chainName : CHAINS[0],
  );
  const [customUri, setCustomUri] = useState<Record<string, string>>({
    [server.chainName]:
      server.kind === 'remote' && selectServer === SelectServerEnum.custom
        ? server.uri
        : '',
  });
  const [testResult, setTestResult] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [customOpen, setCustomOpen] = useState<Record<string, boolean>>({});
  const [focused, setFocused] = useState(false);
  const [segmentW, setSegmentW] = useState(0);
  const thumb = useSharedValue(CHAINS.indexOf(tab));
  const fieldX = useSharedValue(0);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    onProbe(tab);
  }, [tab, onProbe]);

  useEffect(() => {
    thumb.value = withTiming(CHAINS.indexOf(tab), {
      duration: duration.medium,
      easing: ease.emphasized,
    });
  }, [tab, thumb]);

  const segment = (segmentW - 4) / 3;
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumb.value * segment }],
  }));
  const fieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fieldX.value }],
  }));

  const netName = (chain: ChainNameEnum) =>
    translate(
      chain === ChainNameEnum.testChainName
        ? 'settings.value-chainname-test'
        : chain === ChainNameEnum.regtestChainName
          ? 'settings.value-chainname-regtest'
          : 'settings.value-chainname-main',
    ) as string;

  const onTab = tab;
  const isAuto =
    !offline &&
    server.chainName === onTab &&
    selectServer === SelectServerEnum.auto;
  const isCustom =
    !offline &&
    server.chainName === onTab &&
    selectServer === SelectServerEnum.custom;
  const pickedUri =
    !offline &&
    server.kind === 'remote' &&
    server.chainName === onTab &&
    selectServer === SelectServerEnum.list
      ? server.uri
      : null;
  const rows = servers.filter(s => s.chainName === onTab && !s.obsolete);
  const fastest = rows
    .filter(s => typeof latencies[s.uri] === 'number')
    .sort(
      (a, b) => (latencies[a.uri] as number) - (latencies[b.uri] as number),
    )[0];
  const picked = rows.find(s => s.uri === pickedUri);

  const cardName = offline
    ? (translate('server.offline') as string)
    : server.kind === 'remote'
      ? selectServer === SelectServerEnum.auto
        ? `${hostOf(server.uri)} ${translate('server.automatic-suffix')}`
        : hostOf(server.uri)
      : '';
  const cardSub = offline
    ? (translate('server.offline-card') as string)
    : status === 'wait'
      ? (translate('server.connecting') as string)
      : status === 'bad'
        ? (translate('server.card-bad') as string).replace(
            '{net}',
            netName(server.chainName),
          )
        : (translate('server.card-connected') as string)
            .replace('{net}', netName(server.chainName))
            .replace('{height}', blockHeight);

  const test = async () => {
    const uri = (customUri[onTab] ?? '').trim();
    if (testing || !uri) {
      return;
    }
    setTesting(true);
    input.current?.blur();
    const ok = await onTestCustom(onTab, uri);
    setTesting(false);
    setTestResult(r => ({ ...r, [onTab]: ok }));
    if (!ok) {
      const step = { duration: 56, easing: ease.standard };
      fieldX.value = withSequence(
        withTiming(-5, step),
        withTiming(5, step),
        withTiming(-3, step),
        withTiming(0, step),
      );
    }
  };

  const result = testResult[onTab];
  const fieldBorder =
    result === true
      ? colors.fgAccent
      : result === false
        ? colors.fgDangerEmphasis
        : focused
          ? colors.borderFocus
          : colors.bottomSheetBorder;

  const customBlock = (
    <View style={{ paddingHorizontal: 14.5, paddingBottom: 14 }}>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            height: 41,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: fieldBorder,
            backgroundColor: colors.bgSurface,
            overflow: 'hidden',
          },
          fieldStyle,
        ]}
      >
        <TextInput
          ref={input}
          testID="server.custom.uri"
          value={customUri[onTab] ?? ''}
          onChangeText={t => {
            setCustomUri(u => ({ ...u, [onTab]: t }));
            setTestResult(r => {
              const next = { ...r };
              delete next[onTab];
              return next;
            });
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={test}
          editable={!busy && !testing}
          placeholder={
            translate(
              onTab === ChainNameEnum.regtestChainName
                ? 'server.placeholder-regtest'
                : 'server.placeholder',
            ) as string
          }
          placeholderTextColor={PLACEHOLDER}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textContentType="URL"
          returnKeyType="go"
          style={{
            flex: 1,
            minWidth: 0,
            paddingHorizontal: 12,
            fontSize: 13,
            color: colors.fgDefault,
          }}
        />
        <Pressable
          testID="server.custom.test"
          onPress={test}
          disabled={busy || testing || !(customUri[onTab] ?? '').trim()}
          accessibilityRole="button"
          style={{
            width: 60,
            borderLeftWidth: 1,
            borderLeftColor: colors.bottomSheetBorder,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {testing ? (
            <LoadingDots size={5} gap={4} color={colors.fgAccent} />
          ) : (
            <BoldText style={{ fontSize: 12, color: colors.fgAccent }}>
              {translate('server.test') as string}
            </BoldText>
          )}
        </Pressable>
      </Animated.View>
      {result !== undefined && (
        <Animated.View
          key={result ? 'ok' : 'bad'}
          entering={fadeIn()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            marginTop: 10,
            minHeight: 16,
          }}
        >
          <FontAwesomeIcon
            icon={result ? faCheck : faXmark}
            size={11}
            color={result ? OK_TEXT : colors.fgDanger}
          />
          <RegText
            style={{
              fontSize: 11.5,
              color: result ? OK_TEXT : colors.fgDanger,
            }}
          >
            {
              translate(
                result ? 'server.connected' : 'server.unreachable',
              ) as string
            }
          </RegText>
        </Animated.View>
      )}
    </View>
  );

  const automaticRow = (
    <ServerRow
      testID="server.auto"
      first
      title={translate('server.automatic') as string}
      sub={
        fastest
          ? (translate('server.fastest') as string).replace(
              '{host}',
              hostOf(fastest.uri),
            )
          : undefined
      }
      selected={isAuto}
      disabled={busy || offline}
      onPress={() => !isAuto && onAuto(onTab)}
    />
  );
  const customRow = (
    <ServerRow
      testID="server.custom"
      title={translate('server.custom') as string}
      sub={
        isCustom || onTab === ChainNameEnum.testChainName
          ? (translate('server.custom-sub') as string)
          : undefined
      }
      selected={isCustom}
      disabled={busy || offline}
      onPress={() => {
        if (customOpen[onTab]) {
          return;
        }
        setCustomOpen(o => ({ ...o, [onTab]: true }));
        setTimeout(() => input.current?.focus(), duration.medium);
      }}
    />
  );
  const showCustom = isCustom || !!customOpen[onTab];

  let body: React.ReactNode;
  if (onTab === ChainNameEnum.regtestChainName) {
    body = (
      <>
        <BoldText
          style={{
            marginHorizontal: 21.5,
            marginTop: 8,
            marginBottom: 18,
            fontSize: 12.5,
          }}
        >
          {translate('server.regtest-label') as string}
        </BoldText>
        <View style={{ marginHorizontal: 7 }}>{customBlock}</View>
      </>
    );
  } else if (onTab === ChainNameEnum.testChainName) {
    body = (
      <RowCard>
        {automaticRow}
        {rows.map(s => (
          <ServerRow
            key={s.uri}
            testID={`server.pick.${hostOf(s.uri)}`}
            title={hostOf(s.uri)}
            sub={s.region}
            selected={pickedUri === s.uri}
            disabled={busy || offline}
            right={
              <Latency
                ms={latencies[s.uri]}
                notResponding={translate('server.not-responding') as string}
              />
            }
            onPress={() => pickedUri !== s.uri && onPick(s)}
          />
        ))}
        {customRow}
        {showCustom && (
          <Animated.View entering={fadeIn()} exiting={fadeOut()}>
            {customBlock}
          </Animated.View>
        )}
      </RowCard>
    );
  } else {
    body = (
      <RowCard>
        {automaticRow}
        <ServerRow
          testID="server.choose"
          title={translate('server.choose') as string}
          sub={
            picked
              ? typeof latencies[picked.uri] === 'number'
                ? `${hostOf(picked.uri)} · ${latencies[picked.uri]} ms`
                : hostOf(picked.uri)
              : undefined
          }
          selected={!!picked}
          disabled={busy || offline}
          chevron
          onPress={onChoose}
        />
        {customRow}
        {showCustom && (
          <Animated.View entering={fadeIn()} exiting={fadeOut()}>
            {customBlock}
          </Animated.View>
        )}
      </RowCard>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScreenHeader
        testID="server.back"
        title={translate('server.title') as string}
        onBack={onBack}
        disabled={busy}
      />

      <View
        testID="server.card"
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
        <StatusDot status={status} offline={offline} />
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

      <View
        testID="server.segments"
        onLayout={e => setSegmentW(e.nativeEvent.layout.width)}
        style={{
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
          opacity: offline ? 0.4 : 1,
        }}
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
            onPress={() => setTab(chain)}
            disabled={busy || offline}
            accessibilityRole="tab"
            accessibilityState={{ selected: chain === onTab }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <RegText
              style={{
                fontSize: 12.5,
                fontWeight: '500',
                color: chain === onTab ? colors.fgDefault : colors.fgMuted,
              }}
            >
              {netName(chain)}
            </RegText>
          </Pressable>
        ))}
      </View>

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
          key={onTab}
          entering={fadeIn()}
          exiting={fadeOut()}
          style={{ opacity: offline ? 0.4 : 1 }}
        >
          {body}
        </Animated.View>
        <View
          style={{
            marginHorizontal: 21.5,
            marginTop: 14,
            minHeight: 55,
            borderRadius: 14,
            backgroundColor: colors.bgSurface,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingLeft: 14.5,
            paddingRight: 16,
            gap: 13,
          }}
        >
          <View style={{ flex: 1 }}>
            <RegText
              style={{ fontSize: 13.5, lineHeight: 19, fontWeight: '500' }}
            >
              {translate('server.offline') as string}
            </RegText>
            <RegText
              style={{ fontSize: 11, lineHeight: 16, color: colors.fgMuted }}
            >
              {translate('server.offline-sub') as string}
            </RegText>
          </View>
          <Toggle
            on={offline}
            disabled={busy}
            onToggle={() => onOffline(!offline, onTab)}
          />
        </View>
      </ScrollView>

      <DoneButton
        testID="server.done"
        title={translate('server.done') as string}
        onPress={onBack}
        disabled={busy}
      />
    </View>
  );
};

export default Server;
