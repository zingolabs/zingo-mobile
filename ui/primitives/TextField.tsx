/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import Pressable from '@ui/primitives/Pressable';
import { Platform, TextInput, View } from 'react-native';
import {
  fieldMinHeight,
  fontScaleBody,
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

/** An action inside a field: 36 on screen, its tap area grown to 44. */
const ACTION = 36;
const ACTION_SLOP = (touchTarget - ACTION) / 2;

/**
 * An icon action inside a field (clear, paste, book, scan): the icon at 20
 * in fgMuted, 36 wide with its tap area grown to 44. Fields line them up 4
 * apart, 4 from the edge.
 */
export const FieldAction = React.forwardRef<
  View,
  {
    icon: React.ComponentType<{ size?: number; color?: string }>;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    testID?: string;
  }
>(function FieldActionButton(
  { icon: ActionIcon, label, onPress, disabled, testID },
  ref,
) {
  const { colors } = useTheme();
  return (
    <Pressable
      kind="icon"
      ref={ref}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={ACTION_SLOP}
      style={{
        width: ACTION,
        height: ACTION,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActionIcon
        size={iconSizeMd}
        color={disabled ? colors.fgAccentDisabled : colors.fgMuted}
      />
    </Pressable>
  );
});

/** The row of a field's actions: 4 apart and 4 from its right edge. */
export function FieldActions({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space4,
        paddingRight: space4,
      }}
    >
      {children}
    </View>
  );
}

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
  /** The invalid edge alone, for a field whose caller shows the error itself. */
  invalid?: boolean;
  /** Green edge once the value is known to be good. */
  valid?: boolean;
  disabled?: boolean;
  /** Addresses and keys: monospace, and the value wraps. */
  mono?: boolean;
  multiline?: boolean;
  /** A multiline field grows to this many lines, then scrolls inside. */
  maxLines?: number;
  /** The input, to focus it from outside (a shortened address tapped). */
  inputRef?: React.Ref<TextInput>;
  autoFocus?: boolean;
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
  /** Fixed text before the value, in fgMuted ("https://"). */
  prefix?: string;
  /** After the value, inside the box: a ":" and a port input. */
  suffix?: React.ReactNode;
  /** Not editable for a moment (a test running), without the disabled look. */
  readOnly?: boolean;
  /** Focus held by an input in the suffix, so the edge lights for it too. */
  active?: boolean;
  selectTextOnFocus?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
  textContentType?: React.ComponentProps<typeof TextInput>['textContentType'];
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
  invalid = false,
  valid = false,
  disabled = false,
  mono = false,
  multiline = false,
  maxLines,
  inputRef,
  autoFocus,
  trailingIcon: TrailingIcon,
  trailingLabel,
  onTrailingPress,
  trailing,
  clearable = false,
  clearLabel,
  replacement,
  prefix,
  suffix,
  active = false,
  readOnly = false,
  selectTextOnFocus,
  onSubmitEditing,
  returnKeyType,
  textContentType,
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
    error !== undefined || invalid ? 'invalid' : valid ? 'valid' : 'unknown';
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
          borderColor: fieldBorder(colors, focused || active, validity),
          paddingLeft: space12,
        }}
      >
        {!!prefix && !replacement && (
          <Text variant="body" tone="muted">
            {prefix}
          </Text>
        )}
        {replacement ?? (
          <TextInput
            ref={inputRef}
            autoFocus={autoFocus}
            testID={testID}
            accessibilityLabel={accessibilityLabel}
            maxLength={maxLength}
            onEndEditing={onEndEditing}
            onContentSizeChange={onContentSizeChange}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            spellCheck={autoCorrect}
            selectTextOnFocus={selectTextOnFocus}
            onSubmitEditing={onSubmitEditing}
            returnKeyType={returnKeyType}
            textContentType={textContentType}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.fgMuted}
            editable={!disabled && !readOnly}
            multiline={multiline}
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
              ...(multiline && maxLines
                ? { maxHeight: valueStyle.lineHeight * maxLines + space8 * 2 }
                : {}),
              minWidth: 0,
              paddingRight:
                TrailingIcon || trailing || clearable || suffix ? 0 : space12,
              color: colors.fgDefault,
              fontSize: valueStyle.fontSize,
              fontWeight: valueStyle.fontWeight,
              ...(mono ? { fontFamily: monoFamily } : {}),
            }}
          />
        )}
        {suffix}
        {(!!TrailingIcon ||
          (clearable && !!value && !disabled) ||
          !!trailing) && (
          <FieldActions>
            {clearable && !!value && !disabled && (
              <FieldAction
                icon={XIcon}
                label={clearLabel ?? ''}
                onPress={() => onChangeText('')}
              />
            )}
            {trailing}
            {!!TrailingIcon && (
              <FieldAction
                icon={TrailingIcon}
                label={trailingLabel ?? ''}
                onPress={onTrailingPress ?? (() => {})}
                disabled={disabled}
              />
            )}
          </FieldActions>
        )}
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
