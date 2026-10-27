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

import {
  fontScaleBody,
  space8,
  space12,
  textVariants,
  useTheme,
} from '@app/theme';
import { ease } from '@app/theme/motion';
import { ChainNameEnum } from '@app/AppState';
import Text from '@ui/primitives/Text';
import TextField from '@ui/primitives/TextField';
import ServerLog, { LogLine } from './ServerLog';
import { schemeFor } from './useCustomServer';
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

/** Five digits at the value's size. */
const PORT_WIDTH = 64;

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
  const [portFocused, setPortFocused] = useState(false);
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
  const blur = () => {
    hostInput.current?.blur();
    portInput.current?.blur();
  };

  const testOff = disabled || busy || empty;
  const saveOff = disabled || busy || empty || saved;

  return (
    <View>
      <Animated.View style={fieldStyle}>
        <TextField
          label=""
          inputRef={hostInput}
          testID="server.custom.host"
          accessibilityLabel={labels.host}
          prefix={schemeFor(chain)}
          value={host}
          onChangeText={text => {
            if (onHost(text)) {
              portInput.current?.focus();
            }
          }}
          valid={result === true}
          invalid={result === false}
          active={portFocused}
          disabled={disabled}
          readOnly={busy}
          placeholder={
            chain === ChainNameEnum.regtestChainName
              ? labels.hostRegtest
              : labels.host
          }
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="URL"
          returnKeyType="go"
          selectTextOnFocus
          onSubmitEditing={() => {
            blur();
            onTest();
          }}
          suffix={
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'stretch',
                paddingLeft: space8,
                borderLeftWidth: 1,
                borderLeftColor: colors.bottomSheetBorder,
              }}
            >
              <Text variant="body" tone="muted">
                :
              </Text>
              <TextInput
                ref={portInput}
                testID="server.custom.port"
                accessibilityLabel={labels.port}
                value={port}
                onChangeText={onPort}
                selectTextOnFocus
                onFocus={() => setPortFocused(true)}
                onBlur={() => setPortFocused(false)}
                onSubmitEditing={() => {
                  blur();
                  onTest();
                }}
                editable={!disabled && !busy}
                keyboardType="number-pad"
                maxLength={5}
                returnKeyType="go"
                maxFontSizeMultiplier={fontScaleBody}
                style={{
                  width: PORT_WIDTH,
                  paddingLeft: space8 / 2,
                  paddingRight: space12,
                  fontSize: textVariants.bodyStrong.fontSize,
                  fontWeight: textVariants.bodyStrong.fontWeight,
                  color: colors.fgDefault,
                  fontVariant: ['tabular-nums'],
                }}
              />
            </View>
          }
        />
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
