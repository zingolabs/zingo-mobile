/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, space8 } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ChainNameEnum } from '@app/AppState';
import RegText from '@ui/primitives/RegText';
import ServerLog, { LogLine } from './ServerLog';
import { DEFAULT_PORT, schemeFor } from './useCustomServer';
import { fieldBorder } from '@ui/primitives/fieldBorder';
import Button from '@ui/primitives/Button';

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
  // True when the text carried a port, which moved to its own box.
  onHost: (text: string) => boolean;
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
  const border = fieldBorder(
    colors,
    focused,
    result === true ? 'valid' : result === false ? 'invalid' : 'unknown',
  );
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
          onChangeText={text => {
            if (onHost(text)) {
              portInput.current?.focus();
            }
          }}
          selectTextOnFocus
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
          placeholderTextColor={colors.fgMuted}
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
          <RegText
            style={{ fontSize: 13, color: colors.fgMuted, paddingLeft: 9 }}
          >
            :
          </RegText>
          <TextInput
            ref={portInput}
            testID="server.custom.port"
            accessibilityLabel={labels.port}
            value={port}
            onChangeText={onPort}
            selectTextOnFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => {
              blur();
              onTest();
            }}
            editable={!disabled && !busy}
            placeholder={DEFAULT_PORT}
            placeholderTextColor={colors.fgMuted}
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

      {/** Test and Save sit side by side: they act on the server field, they
          are not the form's actions, so they do not stack. */}
      <View style={{ marginTop: space8, flexDirection: 'row', gap: space8 }}>
        <View style={{ flex: 1 }}>
          <Button
            testID="server.custom.test"
            variant="text"
            title={labels.test}
            busy={working === 'test'}
            disabled={testOff}
            onPress={() => {
              blur();
              onTest();
            }}
          />
        </View>
        <Animated.View style={[{ flex: 1 }, saveStyle]}>
          <Button
            testID="server.custom.save"
            variant={saved && !busy ? 'text' : 'primary'}
            title={saved && !busy ? labels.saved : labels.save}
            busy={working === 'save'}
            disabled={saveOff}
            onPress={() => {
              blur();
              onSave();
            }}
          />
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
