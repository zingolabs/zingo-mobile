/* geometry-gap: not yet on the system */
/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import {
  useTheme,
  iconSizeSm,
  radiusMd,
  radiusSm,
  slopFor,
  space4,
  space8,
  space12,
} from '@app/theme';
import { ChainNameEnum } from '@app/AppState';
import Text from '@ui/primitives/Text';
import { duration } from '@app/theme/motion';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { XIcon } from '@ui/primitives/Icons/XIcon';
import { ChevronRight } from '@ui/primitives/Icons/Chevron';

export type LogTone = 'ok' | 'bad' | 'warn' | 'mut' | '';

// One line of the custom server's message box. A step line carries an icon;
// a final line says what happened, or what to fix.
export type LogLine = {
  final: boolean;
  tone: LogTone;
  text: string;
  // A chain mismatch offers to move the address to the server's network.
  switchTo?: { chain: ChainNameEnum; label: string };
  // The raw answer, folded under Details.
  details?: string;
};

const STEP_MS = duration.fast;

const lineIn = (index: number) =>
  FadeIn.duration(STEP_MS)
    .delay(index * STEP_MS)
    .withInitialValues({ opacity: 0, transform: [{ translateY: -3 }] })
    .reduceMotion(ReduceMotion.System);

type ServerLogProps = {
  lines: LogLine[];
  // Lines before this index were on screen already and do not animate again.
  shownBefore: number;
  detailsLabel: string;
  onSwitch: (chain: ChainNameEnum) => void;
};

const ServerLog: React.FC<ServerLogProps> = ({
  lines,
  shownBefore,
  detailsLabel,
  onSwitch,
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState<Record<number, boolean>>({});
  if (lines.length === 0) {
    return null;
  }
  const finalColor = (tone: LogTone) =>
    tone === 'ok'
      ? colors.fgAccent
      : tone === 'warn'
        ? colors.fgWarning
        : tone === 'bad'
          ? colors.fgDanger
          : tone === 'mut'
            ? colors.fgMuted
            : colors.fgDefault;

  return (
    <View
      testID="server.custom.log"
      accessibilityLiveRegion="polite"
      style={{
        marginTop: space8,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        borderRadius: radiusMd,
        backgroundColor: colors.bgCanvas,
        paddingVertical: space8,
        paddingHorizontal: space12,
      }}
    >
      {lines.map((line, i) => (
        <Animated.View
          key={`${i}|${line.text}`}
          entering={i >= shownBefore ? lineIn(i - shownBefore) : undefined}
          style={
            line.final
              ? {
                  marginTop: i === 0 ? 0 : space8,
                  paddingTop: i === 0 ? 0 : space8,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.borderSubtle,
                }
              : { marginTop: i === 0 ? 0 : 2 }
          }
        >
          {line.final ? (
            <Text
              testID={`server.custom.log.final.${line.tone || 'plain'}`}
              variant="caption"
              color={finalColor(line.tone)}
              style={{ fontWeight: '600' }}
            >
              {line.text}
              {line.switchTo && ' '}
              {line.switchTo && (
                <Text
                  testID="server.custom.switch"
                  variant="caption"
                  tone="accent"
                  accessibilityRole="link"
                  onPress={() => onSwitch(line.switchTo!.chain)}
                  style={{ fontWeight: '700' }}
                >
                  {line.switchTo.label}
                </Text>
              )}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: space8 }}>
              <View
                style={{
                  width: iconSizeSm,
                  height: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {line.tone === 'ok' ? (
                  <CheckIcon size={iconSizeSm} color={colors.fgAccent} />
                ) : line.tone === 'bad' ? (
                  <XIcon size={iconSizeSm} color={colors.fgDanger} />
                ) : (
                  <Text variant="address" tone="muted">
                    ·
                  </Text>
                )}
              </View>
              <Text
                selectable
                variant="address"
                tone={line.tone === 'bad' ? 'danger' : 'muted'}
                style={{ flex: 1 }}
              >
                {line.text}
              </Text>
            </View>
          )}
          {!!line.details && (
            <View style={{ marginTop: space8 }}>
              <Pressable
                testID="server.custom.details"
                onPress={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded: !!open[i] }}
                hitSlop={slopFor(iconSizeSm)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space4,
                }}
              >
                <View
                  style={{
                    transform: [{ rotate: open[i] ? '90deg' : '0deg' }],
                  }}
                >
                  <ChevronRight size={iconSizeSm} color={colors.fgAccent} />
                </View>
                <Text
                  variant="caption"
                  tone="accent"
                  style={{ fontWeight: '700' }}
                >
                  {detailsLabel}
                </Text>
              </Pressable>
              {!!open[i] && (
                <Text
                  selectable
                  variant="address"
                  tone="muted"
                  style={{
                    marginTop: space4,
                    paddingVertical: space8,
                    paddingHorizontal: space12,
                    borderRadius: radiusSm,
                    borderWidth: 1,
                    borderColor: colors.bottomSheetBorder,
                    backgroundColor: colors.bgSurface,
                  }}
                >
                  {line.details}
                </Text>
              )}
            </View>
          )}
        </Animated.View>
      ))}
    </View>
  );
};

export default ServerLog;
