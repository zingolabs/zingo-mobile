/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  Text as SvgText,
} from 'react-native-svg';

import {
  fontScaleBody,
  radiusMd,
  radiusSm,
  space8,
  space12,
  textVariants,
  useTheme,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import { useInsetFill } from '@ui/primitives/Surface';
import { duration, ease } from '@app/theme/motion';
import Button from '@ui/primitives/Button';
import { ContextAppLoaded } from '@app/context';
import { CopyIcon } from '@ui/primitives/Icons/CopyIcon';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { EyeOffIcon } from '@ui/primitives/Icons/EyeOffIcon';
import InfoTooltip from '@ui/widgets/InfoTooltip';
import { SIDE } from './StepParts';

export const VEIL_MS = 220;
// The words blur by this much while hidden; the numbers stay sharp.
const BLUR_PT = 6;
const WORD_H = 28;
// Room left of the word for the blur to fade out round, not cut straight.
const BLUR_PAD = BLUR_PT * 2;
// react-native-svg reads stdDeviation differently per platform. Android
// blurs the bitmap in device pixels, doubled and capped at a 25 px radius
// (a deviation of about 10.6 px), so it gets pixels. iOS scales by the
// screen itself, so it gets points, matched to Android: 3.5 pt is 10.5 px
// at 3x. Scaling it again on iOS blurred the word away. Web runs in points.
const BLUR_DEVIATION = Platform.select({
  android: BLUR_PT * PixelRatio.get(),
  ios: 3.5,
  default: BLUR_PT,
});
const COLUMNS = 3;

// A word drawn through a gaussian blur, for the hidden state. Drawn once
// and kept mounted: the filter is the costly part, the veil only fades it.
const BlurredWord = React.memo<{ word: string; color: string }>(
  ({ word, color }) => (
    <Svg width="100%" height={WORD_H}>
      <Defs>
        <Filter
          id="wordblur"
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <FeGaussianBlur stdDeviation={BLUR_DEVIATION} />
        </Filter>
      </Defs>
      <SvgText
        x={BLUR_PAD}
        y={20.5}
        fill={color}
        fontSize={textVariants.bodySmall.fontSize}
        fontWeight="700"
        filter="url(#wordblur)"
      >
        {word}
      </SvgText>
    </Svg>
  ),
);

// The words in three columns, numbered; the words blur while veiled.
export const WordGrid: React.FunctionComponent<{
  words: string[];
  veiled: boolean;
  testID: string;
}> = ({ words, veiled, testID }) => {
  const { colors } = useTheme();
  const tile = useInsetFill();
  const veil = useSharedValue(veiled ? 1 : 0);
  useEffect(() => {
    veil.value = withTiming(veiled ? 1 : 0, {
      duration: VEIL_MS,
      easing: ease.standard,
      reduceMotion: ReduceMotion.Never,
    });
  }, [veiled, veil]);
  const wordInk = useAnimatedStyle(() => ({ opacity: 1 - veil.value }));
  const blurInk = useAnimatedStyle(() => ({ opacity: veil.value * 0.7 }));
  const rows = Math.ceil(words.length / COLUMNS);

  return (
    <View
      testID={testID}
      style={{
        marginHorizontal: SIDE,
        padding: space12,
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: colors.bgSurface,
        gap: space8,
      }}
    >
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: space8 }}>
          {words.slice(r * COLUMNS, r * COLUMNS + COLUMNS).map((w, c) => {
            const n = r * COLUMNS + c + 1;
            return (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: WORD_H,
                  borderRadius: radiusSm,
                  backgroundColor:
                    tile === colors.bgSurface ? colors.bgCanvas : tile,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text
                  variant="caption"
                  tone="muted"
                  style={{ width: 24, marginRight: space8, textAlign: 'right' }}
                >
                  {n}
                </Text>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Animated.Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={fontScaleBody}
                    style={[
                      {
                        color: colors.fgDefault,
                        fontSize: textVariants.bodySmall.fontSize,
                        lineHeight: textVariants.bodySmall.lineHeight,
                        fontWeight: '700',
                      },
                      wordInk,
                    ]}
                  >
                    {w}
                  </Animated.Text>
                  <Animated.View
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[
                      { position: 'absolute', left: -BLUR_PAD, right: 0 },
                      blurInk,
                    ]}
                  >
                    <BlurredWord word={w} color={colors.fgDefault} />
                  </Animated.View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// A slim row: a label with an info tooltip on the left, a value on the right.
export const InfoRow: React.FunctionComponent<{
  testID: string;
  label: string;
  tipTitle: string;
  tipBody: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  value: string;
  trailing?: React.ReactNode;
}> = ({
  testID,
  label,
  tipTitle,
  tipBody,
  open,
  onToggle,
  value,
  trailing,
}) => {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 36,
        marginHorizontal: SIDE,
        paddingHorizontal: space12,
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: colors.bgSurface,
        zIndex: open ? 3 : 1,
      }}
    >
      <InfoTooltip
        testID={`${testID}-info`}
        alignStart
        label={label}
        labelStyle={{
          fontSize: textVariants.caption.fontSize,
          fontWeight: '600',
          color: colors.fgMuted,
        }}
        title={tipTitle}
        text={tipBody}
        open={open}
        onToggle={onToggle}
      />
      <Text
        variant="bodySmall"
        numberOfLines={1}
        style={{
          marginLeft: 'auto',
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      {trailing}
    </View>
  );
};

// Copy and Show / Hide side by side, as secondary Buttons.
export const CopyShowButtons: React.FunctionComponent<{
  hidden: boolean;
  onToggleHide: () => void;
  onCopy: () => void;
  testID: string;
}> = ({ hidden, onToggleHide, onCopy, testID }) => {
  const { translate } = useContext(ContextAppLoaded);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = () => {
    onCopy();
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), duration.hold);
  };

  return (
    <View
      style={{ flexDirection: 'row', gap: space12, marginHorizontal: SIDE }}
    >
      <View style={{ flex: 1 }}>
        <Button
          testID={`${testID}.copy`}
          variant="secondary"
          icon={copied ? CheckIcon : CopyIcon}
          title={translate(copied ? 'seedbackup.copied' : 'copy') as string}
          onPress={copy}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Button
          testID={`${testID}.hide`}
          variant="secondary"
          icon={hidden ? EyeIcon : EyeOffIcon}
          title={
            translate(hidden ? 'seedbackup.show' : 'seedbackup.hide') as string
          }
          onPress={onToggleHide}
        />
      </View>
    </View>
  );
};
