/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import {
  fieldMinHeight,
  fontScaleBody,
  iconSize,
  radiusMd,
  space12,
  space4,
  space8,
  textVariants,
  touchTarget,
  useTheme,
} from '@app/theme';
import { useInsetFill } from './Surface';
import Text from './Text';
import { fieldBorder, FieldValidity } from './fieldBorder';
import { Icon } from './Icons/Icon';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Muted text under the box. An `error` replaces it. */
  helper?: string;
  /** What to fix; turns the edge red. */
  error?: string;
  /** Green edge once the value is known to be good. */
  valid?: boolean;
  disabled?: boolean;
  /** Addresses and keys: monospace, and the value wraps. */
  mono?: boolean;
  multiline?: boolean;
  /** An action inside the box, such as scanning a QR code. */
  trailingIcon?: React.ComponentType<React.ComponentProps<typeof Icon>>;
  trailingLabel?: string;
  onTrailingPress?: () => void;
  testID?: string;
};

const monoFamily = Platform.select({ ios: 'Menlo', default: 'monospace' });

/** A labeled text input with an optional trailing action, helper text and error. */
const TextField: React.FunctionComponent<TextFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  helper,
  error,
  valid = false,
  disabled = false,
  mono = false,
  multiline = false,
  trailingIcon: TrailingIcon,
  trailingLabel,
  onTrailingPress,
  testID,
}) => {
  const { colors } = useTheme();
  const inset = useInsetFill();
  const [focused, setFocused] = useState(false);
  const validity: FieldValidity =
    error !== undefined ? 'invalid' : valid ? 'valid' : 'unknown';
  const valueStyle = mono ? textVariants.address : textVariants.bodyStrong;

  return (
    <View style={{ gap: space8, opacity: disabled ? 0.5 : 1 }}>
      <Text variant="bodySmall" tone="muted" style={{ fontWeight: '600' }}>
        {label}
      </Text>
      <View
        style={{
          minHeight: fieldMinHeight,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: inset,
          borderRadius: radiusMd,
          borderWidth: 1,
          borderColor: fieldBorder(colors, focused, validity),
          paddingLeft: space12,
        }}
      >
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.fgMuted}
          editable={!disabled}
          multiline={multiline || mono}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxFontSizeMultiplier={fontScaleBody}
          style={{
            flex: 1,
            paddingVertical: space8,
            paddingRight: TrailingIcon ? 0 : space12,
            color: colors.fgDefault,
            fontSize: valueStyle.fontSize,
            fontWeight: valueStyle.fontWeight,
            ...(mono ? { fontFamily: monoFamily } : {}),
          }}
        />
        {TrailingIcon && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trailingLabel}
            onPress={onTrailingPress}
            disabled={disabled}
            style={{
              width: touchTarget,
              height: touchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TrailingIcon size={iconSize} color={colors.fgMuted} />
          </Pressable>
        )}
      </View>
      {error !== undefined ? (
        <Text variant="bodySmall" tone="danger" style={{ marginTop: -space4 }}>
          {error}
        </Text>
      ) : helper !== undefined ? (
        <Text variant="bodySmall" tone="muted" style={{ marginTop: -space4 }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
};

export default TextField;
