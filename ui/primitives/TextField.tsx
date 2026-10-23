/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import {
  fieldMinHeight,
  fontScaleBody,
  iconSize,
  iconSizeMd,
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
import { XIcon } from './Icons/XIcon';

type TextFieldProps = {
  /** Above the box; '' for a field whose label sits elsewhere. */
  label: string;
  /** Beside the label, on the right: a byte counter, "Optional". */
  labelRight?: React.ReactNode;
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
  /** An X that empties the field while it holds something. */
  clearable?: boolean;
  clearLabel?: string;
  /** Several actions inside the box (paste, book, scan), each a 44 pt target. */
  trailing?: React.ReactNode;
  /** Shown in the box instead of the input: a picked contact's token. */
  replacement?: React.ReactNode;
  /** A line of its own under the box (a kind, a warning); `error` and `helper` replace it. */
  footer?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  onEndEditing?: React.ComponentProps<typeof TextInput>['onEndEditing'];
  onContentSizeChange?: React.ComponentProps<
    typeof TextInput
  >['onContentSizeChange'];
  maxLength?: number;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  autoCorrect?: boolean;
  accessibilityLabel?: string;
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
  trailing,
  clearable = false,
  clearLabel,
  replacement,
  footer,
  onFocus,
  onBlur,
  onEndEditing,
  onContentSizeChange,
  maxLength,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  accessibilityLabel,
  labelRight,
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
      {(!!label || !!labelRight) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="bodySmall" tone="muted" style={{ fontWeight: '600' }}>
            {label}
          </Text>
          {labelRight}
        </View>
      )}
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
        {replacement ?? (
          <TextInput
            testID={testID}
            accessibilityLabel={accessibilityLabel}
            maxLength={maxLength}
            onEndEditing={onEndEditing}
            onContentSizeChange={onContentSizeChange}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            spellCheck={autoCorrect}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.fgMuted}
            editable={!disabled}
            multiline={multiline || mono}
            onFocus={() => {
              setFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            maxFontSizeMultiplier={fontScaleBody}
            style={{
              flex: 1,
              paddingVertical: space8,
              paddingRight: TrailingIcon || trailing || clearable ? 0 : space12,
              color: colors.fgDefault,
              fontSize: valueStyle.fontSize,
              fontWeight: valueStyle.fontWeight,
              ...(mono ? { fontFamily: monoFamily } : {}),
            }}
          />
        )}
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
        {clearable && !!value && !disabled && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clearLabel}
            onPress={() => onChangeText('')}
            style={{
              width: touchTarget,
              height: touchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XIcon size={iconSizeMd} color={colors.fgMuted} />
          </Pressable>
        )}
        {trailing}
      </View>
      {error !== undefined ? (
        <Text
          testID={testID ? `${testID}.error` : undefined}
          variant="bodySmall"
          tone="danger"
          style={{ marginTop: -space4 }}
        >
          {error}
        </Text>
      ) : helper !== undefined ? (
        <Text variant="bodySmall" tone="muted" style={{ marginTop: -space4 }}>
          {helper}
        </Text>
      ) : (
        (footer ?? null)
      )}
    </View>
  );
};

export default TextField;
