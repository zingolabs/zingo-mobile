/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ChainNameEnum } from '@app/AppState';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import { LoadingDots } from '@ui/widgets/ProgressState';
import ServerLog, { LogLine } from './ServerLog';
import { schemeFor } from './useCustomServer';

const PLACEHOLDER = '#3F5677';
const SAVE_OFF_BG = '#0F3A12';
const SAVE_OFF_TEXT = '#5E8A5E';
const OK_TEXT = '#6FD35C';

type CustomServerBoxProps = {
  chain: ChainNameEnum;
  host: string;
  port: string;
  log: LogLine[];
  shown: number;
  // The last test passed (green border) or failed (red border).
  result: boolean | undefined;
  saved: boolean;
  working: 'test' | 'save' | null;
  disabled: boolean;
  shake: number;
  pulse: number;
  autoFocus: boolean;
  labels: {
    test: string;
    save: string;
    saved: string;
    details: string;
    host: string;
    hostRegtest: string;
    port: string;
  };
  onHost: (text: string) => void;
  onPort: (text: string) => void;
  onTest: () => void;
  onSave: () => void;
  onSwitch: (chain: ChainNameEnum) => void;
};

const CustomServerBox: React.FC<CustomServerBoxProps> = ({
  chain,
  host,
  port,
  log,
  shown,
  result,
  saved,
  working,
  disabled,
  shake,
  pulse,
  autoFocus,
  labels,
  onHost,
  onPort,
  onTest,
  onSave,
  onSwitch,
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const hostInput = useRef<TextInput>(null);
  const portInput = useRef<TextInput>(null);
  const fieldX = useSharedValue(0);
  const saveScale = useSharedValue(1);

  useEffect(() => {
    if (shake === 0) {
      return;
    }
    const s = { duration: 56, easing: ease.standard };
    fieldX.value = withSequence(
      withTiming(-5, s),
      withTiming(5, s),
      withTiming(-3, s),
      withTiming(0, s),
    );
  }, [shake, fieldX]);

  useEffect(() => {
    if (pulse === 0) {
      return;
    }
    saveScale.value = withDelay(
      120,
      withSequence(
        withTiming(1.05, { duration: 180, easing: ease.spring }),
        withTiming(1, { duration: 180, easing: ease.spring }),
      ),
    );
  }, [pulse, saveScale]);

  useEffect(() => {
    if (!autoFocus || host) {
      return;
    }
    const timer = setTimeout(() => hostInput.current?.focus(), 260);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  const fieldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fieldX.value }],
  }));
  const saveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));

  const empty = !host.trim();
  const busy = working !== null;
  const border =
    result === true
      ? colors.fgAccent
      : result === false
        ? colors.fgDangerEmphasis
        : focused
          ? colors.borderFocus
          : colors.bottomSheetBorder;
  const blur = () => {
    hostInput.current?.blur();
    portInput.current?.blur();
  };

  const testOff = disabled || busy || empty;
  const saveOff = disabled || busy || empty || saved;

  return (
    <View>
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            height: 41,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: colors.bgSurface,
            overflow: 'hidden',
          },
          fieldStyle,
        ]}
      >
        <View style={{ justifyContent: 'center', paddingLeft: 12 }}>
          <RegText style={{ fontSize: 13, color: colors.fgMuted }}>
            {schemeFor(chain)}
          </RegText>
        </View>
        <TextInput
          ref={hostInput}
          testID="server.custom.host"
          accessibilityLabel={labels.host}
          value={host}
          onChangeText={onHost}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => {
            blur();
            onTest();
          }}
          editable={!disabled && !busy}
          placeholder={
            chain === ChainNameEnum.regtestChainName
              ? labels.hostRegtest
              : labels.host
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
            paddingLeft: 1,
            paddingRight: 12,
            fontSize: 13,
            color: colors.fgDefault,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderLeftWidth: 1,
            borderLeftColor: colors.bottomSheetBorder,
          }}
        >
          <RegText style={{ fontSize: 13, color: '#5A6F8F', paddingLeft: 9 }}>
            :
          </RegText>
          <TextInput
            ref={portInput}
            testID="server.custom.port"
            accessibilityLabel={labels.port}
            value={port}
            onChangeText={onPort}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => {
              blur();
              onTest();
            }}
            editable={!disabled && !busy}
            placeholder="9067"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            maxLength={5}
            returnKeyType="go"
            style={{
              width: 52,
              paddingLeft: 3,
              paddingRight: 10,
              fontSize: 13,
              color: colors.fgDefault,
              fontVariant: ['tabular-nums'],
            }}
          />
        </View>
      </Animated.View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Pressable
          testID="server.custom.test"
          onPress={() => {
            blur();
            onTest();
          }}
          disabled={testOff}
          accessibilityRole="button"
          accessibilityState={{ disabled: testOff, busy: working === 'test' }}
          style={{
            flex: 1,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
            backgroundColor: colors.bgCanvas,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {working === 'test' ? (
            <LoadingDots size={6} gap={5} color={colors.fgDefault} />
          ) : (
            <BoldText
              style={{
                fontSize: 12.5,
                color: testOff ? PLACEHOLDER : colors.fgDefault,
              }}
            >
              {labels.test}
            </BoldText>
          )}
        </Pressable>
        <Animated.View style={[{ flex: 1 }, saveStyle]}>
          <Pressable
            testID="server.custom.save"
            onPress={() => {
              blur();
              onSave();
            }}
            disabled={saveOff}
            accessibilityRole="button"
            accessibilityState={{ disabled: saveOff, busy: working === 'save' }}
            style={{
              height: 38,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              backgroundColor:
                saved && !busy
                  ? 'rgba(20,157,5,0.12)'
                  : saveOff
                    ? SAVE_OFF_BG
                    : colors.bgAccent,
              borderWidth: saved && !busy ? 1 : 0,
              borderColor: 'rgba(20,157,5,0.45)',
            }}
          >
            {working === 'save' ? (
              <LoadingDots size={6} gap={5} color={colors.bgCanvas} />
            ) : saved ? (
              <>
                <FontAwesomeIcon icon={faCheck} size={11} color={OK_TEXT} />
                <BoldText style={{ fontSize: 12.5, color: OK_TEXT }}>
                  {labels.saved}
                </BoldText>
              </>
            ) : (
              <BoldText
                style={{
                  fontSize: 12.5,
                  color: saveOff ? SAVE_OFF_TEXT : colors.bgCanvas,
                }}
              >
                {labels.save}
              </BoldText>
            )}
          </Pressable>
        </Animated.View>
      </View>

      <ServerLog
        lines={log}
        shownBefore={shown}
        detailsLabel={labels.details}
        onSwitch={onSwitch}
      />
    </View>
  );
};

export default CustomServerBox;
