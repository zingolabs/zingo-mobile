/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { Pressable, Text, TextStyle, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCheck,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { ChainNameEnum } from '@app/AppState';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';
import { ROW_DIVIDER } from './ServerRow';

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

const MONO: TextStyle = {
  fontFamily: 'monospace',
  fontSize: 10.5,
  lineHeight: 16,
};
const OK_TEXT = '#6FD35C';
const WARN_TEXT = '#E6C46A';
const PINK = '#F07A86';
const STEP_MS = 160;

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
      ? OK_TEXT
      : tone === 'warn'
        ? WARN_TEXT
        : tone === 'bad'
          ? PINK
          : tone === 'mut'
            ? colors.fgMuted
            : colors.fgDefault;

  return (
    <View
      testID="server.custom.log"
      accessibilityLiveRegion="polite"
      style={{
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        borderRadius: 10,
        backgroundColor: colors.bgCanvas,
        paddingVertical: 9,
        paddingHorizontal: 11,
      }}
    >
      {lines.map((line, i) => (
        <Animated.View
          key={`${i}|${line.text}`}
          entering={i >= shownBefore ? lineIn(i - shownBefore) : undefined}
          style={
            line.final
              ? {
                  marginTop: i === 0 ? 0 : 7,
                  paddingTop: i === 0 ? 0 : 7,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: ROW_DIVIDER,
                }
              : { marginTop: i === 0 ? 0 : 2 }
          }
        >
          {line.final ? (
            <Text
              testID={`server.custom.log.final.${line.tone || 'plain'}`}
              style={{
                fontSize: 11.5,
                lineHeight: 17,
                fontWeight: line.tone === 'mut' ? '500' : '600',
                color: finalColor(line.tone),
              }}
            >
              {line.text}
              {line.switchTo && ' '}
              {line.switchTo && (
                <Text
                  testID="server.custom.switch"
                  accessibilityRole="link"
                  onPress={() => onSwitch(line.switchTo!.chain)}
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: colors.fgAccent,
                  }}
                >
                  {line.switchTo.label}
                </Text>
              )}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', gap: 7 }}>
              <View
                style={{
                  width: 12,
                  height: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {line.tone === 'ok' ? (
                  <FontAwesomeIcon icon={faCheck} size={10} color={OK_TEXT} />
                ) : line.tone === 'bad' ? (
                  <FontAwesomeIcon icon={faXmark} size={10} color={PINK} />
                ) : (
                  <RegText style={{ ...MONO, color: colors.fgMuted }}>
                    ·
                  </RegText>
                )}
              </View>
              <RegText
                selectable
                style={{
                  ...MONO,
                  flex: 1,
                  color: line.tone === 'bad' ? PINK : colors.fgMuted,
                }}
              >
                {line.text}
              </RegText>
            </View>
          )}
          {!!line.details && (
            <View style={{ marginTop: 6 }}>
              <Pressable
                testID="server.custom.details"
                onPress={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
                accessibilityRole="button"
                accessibilityState={{ expanded: !!open[i] }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 28,
                }}
              >
                <View
                  style={{
                    transform: [{ rotate: open[i] ? '90deg' : '0deg' }],
                  }}
                >
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    size={9}
                    color={colors.fgAccent}
                  />
                </View>
                <BoldText style={{ fontSize: 11, color: colors.fgAccent }}>
                  {detailsLabel}
                </BoldText>
              </Pressable>
              {!!open[i] && (
                <RegText
                  selectable
                  style={{
                    ...MONO,
                    marginTop: 4,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.bottomSheetBorder,
                    backgroundColor: colors.bgSurface,
                    color: colors.fgMuted,
                  }}
                >
                  {line.details}
                </RegText>
              )}
            </View>
          )}
        </Animated.View>
      ))}
    </View>
  );
};

export default ServerLog;
