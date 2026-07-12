/* eslint-disable react-native/no-inline-styles */
import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { getNumberFormatSettings } from 'react-native-localize';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faExclamationTriangle,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

import { ThemeType } from '../../../app/types';
import { TranslateType } from '../../../app/AppState';
import { useKeyboardHeight } from '../../../app/hooks/useKeyboardHeight';
import BoldText from '../../Components/BoldText';
import FadeText from '../../Components/FadeText';
import RegText from '../../Components/RegText';

/**
 * Slippage tolerance editor.
 *
 * Layout:
 *   - Title bar with close (X).
 *   - Preset row: 0.5% / 1% / 2% / 3%. Tapping a preset applies and dismisses.
 *   - Custom input below the presets, always visible. Locale-aware decimal
 *     separator. The value is applied on blur and dismisses the sheet.
 *   - Warning banner when slippage > 50% (lets the user proceed but signals
 *     they are accepting a very loose constraint).
 *
 * The internal state mirrors `slippageBps` from the parent: if the user
 * dismisses without confirming, the parent's value is unchanged. We do not
 * leak intermediate edits.
 */

const PRESETS_BPS: ReadonlyArray<number> = [50, 100, 200, 300]; // 0.5%, 1%, 2%, 3%
const WARNING_THRESHOLD_BPS = 5000; // 50%
const MAX_BPS = 10000; // 100% hard ceiling — anything above is rejected.

type SlippageSheetProps = {
  /** Current slippage in basis points (1% = 100). */
  slippageBps: number;
  /** Called with the new value when the user confirms. */
  onChange: (bps: number) => void;
  translate: (key: string) => TranslateType;
};

const SlippageSheet = forwardRef<BottomSheetModal, SlippageSheetProps>(
  ({ slippageBps, onChange, translate }, ref) => {
    const { colors } = useTheme() as ThemeType;
    const { decimalSeparator } = getNumberFormatSettings();
    const keyboardHeight = useKeyboardHeight();

    const t = useCallback(
      (key: string, fallback: string): string =>
        (translate(key) as string) || fallback,
      [translate],
    );

    // Internal mirror of the parent's slippage. Seeded once at mount; kept
    // in sync with the parent via two paths:
    //   - `useEffect` on the `slippageBps` prop — covers external updates
    //     while the sheet is mounted (e.g. parent reverts the value).
    //   - `onSheetChange` below — re-seeds on every open so a stale custom
    //     edit from a previous open (where the user dismissed without
    //     committing a valid value) does not linger in the input.
    const [draftBps, setDraftBps] = useState<number>(slippageBps);
    const [customStr, setCustomStr] = useState<string>(
      formatSlippagePercent(slippageBps, decimalSeparator),
    );

    useEffect(() => {
      setDraftBps(slippageBps);
      setCustomStr(formatSlippagePercent(slippageBps, decimalSeparator));
    }, [slippageBps, decimalSeparator]);

    const onSheetChange = useCallback(
      (index: number) => {
        // `index >= 0` means the sheet just opened (or moved between snap
        // points). Resetting on every non-negative index is harmless and
        // keeps things idempotent.
        if (index >= 0) {
          setDraftBps(slippageBps);
          setCustomStr(formatSlippagePercent(slippageBps, decimalSeparator));
        }
      },
      [slippageBps, decimalSeparator],
    );

    const dismiss = useCallback(() => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    }, [ref]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    const renderHandle = useCallback(
      () => (
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 6,
            paddingHorizontal: 16,
            backgroundColor: colors.bottomSheetBackground,
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            borderTopWidth: 1,
            borderLeftWidth: 0.5,
            borderRightWidth: 0.5,
            borderTopColor: colors.bottomSheetBorder,
            borderLeftColor: colors.bottomSheetBorder,
            borderRightColor: colors.bottomSheetBorder,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 48 }} />
            <BoldText
              numberOfLines={1}
              style={{ flex: 1, textAlign: 'center', color: colors.text }}
            >
              {t('swap.slippage-title', 'Slippage tolerance')}
            </BoldText>
            <Pressable
              onPress={dismiss}
              accessibilityRole="button"
              hitSlop={8}
              style={{ padding: 14 }}
            >
              <FontAwesomeIcon icon={faXmark} size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      ),
      [colors, dismiss, t],
    );

    const applyPreset = useCallback(
      (bps: number) => {
        onChange(bps);
        // Sync customStr to the preset so the dismiss-time commit (below)
        // sees the input as already-applied and does not overwrite it.
        setCustomStr(formatSlippagePercent(bps, decimalSeparator));
        dismiss();
      },
      [onChange, dismiss, decimalSeparator],
    );

    // Single source of truth for committing the custom input. Reused by:
    //   - `onBlur` (user finished typing and tapped outside the input)
    //   - `onDismiss` (user closed the sheet — via X, backdrop, or swipe —
    //     without first blurring the input).
    // Silently no-ops on invalid / out-of-range / unchanged values.
    const commitCustom = useCallback(() => {
      const parsed = parseSlippagePercent(customStr, decimalSeparator);
      if (parsed === null) return;
      const bps = Math.round(parsed * 100);
      if (bps <= 0 || bps > MAX_BPS) return;
      if (bps !== slippageBps) onChange(bps);
    }, [customStr, decimalSeparator, onChange, slippageBps]);

    const onCustomBlur = useCallback(() => {
      commitCustom();
      dismiss();
    }, [commitCustom, dismiss]);

    const onCustomChange = useCallback(
      (text: string) => {
        // Filter to digits + the locale separator (one occurrence).
        let filtered = '';
        let seenSep = false;
        for (const ch of text) {
          if (ch >= '0' && ch <= '9') filtered += ch;
          else if (ch === decimalSeparator && !seenSep) {
            filtered += ch;
            seenSep = true;
          }
        }
        setCustomStr(filtered);
        const parsed = parseSlippagePercent(filtered, decimalSeparator);
        if (parsed !== null) {
          setDraftBps(Math.round(parsed * 100));
        }
      },
      [decimalSeparator],
    );

    const showWarning = draftBps > WARNING_THRESHOLD_BPS;

    return (
      <BottomSheetModal
        ref={ref}
        accessible={false}
        enableDynamicSizing={true}
        enablePanDownToClose
        stackBehavior="push"
        keyboardBehavior={'interactive'}
        keyboardBlurBehavior={'restore'}
        android_keyboardInputMode={'adjustResize'}
        onAnimate={(from, to) => {
          // Opening (from === -1) dismisses a keyboard left open by the
          // underlying screen so the sheet never renders behind it. Guard
          // avoids fighting the slippage field's own keyboard.
          if (from === -1 && to >= 0) {
            Keyboard.dismiss();
          }
        }}
        onChange={onSheetChange}
        onDismiss={commitCustom}
        handleComponent={renderHandle}
        backgroundStyle={{
          backgroundColor: colors.bottomSheetBackground,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
        }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={{
            backgroundColor: colors.bottomSheetBackground,
            paddingHorizontal: 20,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 24,
            paddingTop: 8,
            rowGap: 16,
          }}
        >
          <FadeText style={styles.sectionLabel}>
            {t('swap.slippage-presets', 'Presets')}
          </FadeText>
          <View style={styles.presetRow}>
            {PRESETS_BPS.map(bps => {
              const selected = bps === draftBps;
              return (
                <Pressable
                  key={bps}
                  onPress={() => applyPreset(bps)}
                  style={({ pressed }) => [
                    styles.presetBtn,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.background,
                      borderColor: selected ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <BoldText
                    style={{
                      color: selected ? colors.background : colors.text,
                    }}
                  >
                    {formatSlippagePercent(bps, decimalSeparator)}%
                  </BoldText>
                </Pressable>
              );
            })}
          </View>

          <FadeText style={styles.sectionLabel}>
            {t('swap.slippage-custom', 'Custom')}
          </FadeText>
          <View
            style={[
              styles.customRow,
              {
                backgroundColor: colors.background,
                borderColor: showWarning
                  ? colors.warning.border
                  : colors.border,
              },
            ]}
          >
            <TextInput
              value={customStr}
              onChangeText={onCustomChange}
              onBlur={onCustomBlur}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              style={[styles.customInput, { color: colors.text }]}
              testID="swap.slippage.custom"
            />
            {customStr ? (
              <Pressable
                onPress={() => onCustomChange('')}
                hitSlop={8}
                style={{ marginRight: 6 }}
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  size={16}
                  color={colors.primaryDisabled}
                />
              </Pressable>
            ) : null}
            <RegText style={{ color: colors.text }}>%</RegText>
          </View>
          {showWarning && (
            <View
              style={[
                styles.warningRow,
                {
                  backgroundColor: colors.warning.background,
                  borderColor: colors.warning.border,
                },
              ]}
            >
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                size={14}
                color={colors.warning.primary}
              />
              <RegText
                style={{
                  color: colors.warning.text,
                  flex: 1,
                  marginLeft: 8,
                  fontSize: 13,
                }}
              >
                {t(
                  'swap.slippage-warning',
                  'High slippage tolerance — you may receive significantly less than the quote suggests.',
                )}
              </RegText>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

/**
 * Format a basis-points value as a percent string for display.
 * 200 → "2", 50 → "0.5" (with locale separator).
 */
export function formatSlippagePercent(
  bps: number,
  decimalSeparator: string,
): string {
  const pct = bps / 100;
  // Drop trailing zeros (toFixed(2) gives "2.00"; we want "2" or "0.5").
  let str = pct.toString();
  if (decimalSeparator !== '.') {
    str = str.replace('.', decimalSeparator);
  }
  return str;
}

/**
 * Parse a user-typed percent string (e.g. "1,5" or "1.5") into a number,
 * or `null` if not parseable. Does not enforce range — caller decides.
 */
function parseSlippagePercent(
  text: string,
  decimalSeparator: string,
): number | null {
  if (text.length === 0) return null;
  const normalized = decimalSeparator === ',' ? text.replace(',', '.') : text;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    columnGap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});

export default React.memo(SlippageSheet);
