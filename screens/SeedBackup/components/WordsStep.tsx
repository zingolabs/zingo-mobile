/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Keyframe,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@app/theme';
import { ease } from '@app/theme/motion';
import { ContextAppLoaded } from '@app/context';
import { SIDE, StepTitle } from './StepParts';
import { CopyShowButtons, InfoRow, VEIL_MS, WordGrid } from './SeedParts';

const BOX_BORDER = '#1E4A80';
// Length of the tick path below, in viewBox units.
const TICK_LENGTH = 21.3;

const boxPop = () =>
  new Keyframe({
    0: { transform: [{ scale: 0.8 }] },
    100: { transform: [{ scale: 1 }], easing: ease.spring },
  })
    .duration(VEIL_MS)
    .reduceMotion(ReduceMotion.System);

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The checkbox tick, drawn in as the box fills.
const DrawnTick: React.FunctionComponent<{ color: string }> = ({ color }) => {
  const drawn = useSharedValue(0);
  useEffect(() => {
    drawn.value = withDelay(
      40,
      withTiming(1, {
        duration: 200,
        easing: ease.out,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [drawn]);
  const stroke = useAnimatedProps(() => ({
    strokeDashoffset: TICK_LENGTH * (1 - drawn.value),
  }));
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <AnimatedPath
        d="M5 12.5 10 17.5 19.5 7"
        stroke={color}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={TICK_LENGTH}
        animatedProps={stroke}
      />
    </Svg>
  );
};

type WordsStepProps = {
  words: string[];
  // Block height the wallet was created at, written down with the words.
  birthday: number;
  hidden: boolean;
  // Words veil while hidden, and while the screenshot warning is up.
  veiled: boolean;
  onToggleHide: () => void;
  onCopy: () => void;
  checked: boolean;
  onCheck: () => void;
  // Bumps on a press of the disabled "I saved it", to point at the box.
  nudge: number;
};

// The 24 words in order, with the birthday, Copy, Show and the paper checkbox.
const WordsStep: React.FunctionComponent<WordsStepProps> = ({
  words,
  birthday,
  hidden,
  veiled,
  onToggleHide,
  onCopy,
  checked,
  onCheck,
  nudge,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const [tipOpen, setTipOpen] = useState(false);

  const flash = useSharedValue(0);
  useEffect(() => {
    if (nudge > 0) {
      flash.value = 1;
      flash.value = withTiming(0, {
        duration: 420,
        easing: ease.out,
        reduceMotion: ReduceMotion.System,
      });
    }
  }, [nudge, flash]);
  const boxNudge = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + flash.value * 0.25 }],
    borderColor: flash.value > 0.05 ? colors.fgAccent : BOX_BORDER,
  }));

  return (
    <View onTouchStart={() => tipOpen && setTipOpen(false)}>
      <StepTitle
        title={translate('seedbackup.words-title') as string}
        sub={translate('seedbackup.words-sub') as string}
      />
      <WordGrid testID="seedbackup.words" words={words} veiled={veiled} />
      <View style={{ marginTop: 12, zIndex: 2 }}>
        <InfoRow
          testID="seedbackup.birthday"
          label={translate('seedbackup.birthday') as string}
          tipTitle={translate('seedbackup.birthday-tip-title') as string}
          tipBody={translate('seedbackup.birthday-tip-body') as string}
          open={tipOpen}
          onToggle={setTipOpen}
          value={birthday.toLocaleString()}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        <CopyShowButtons
          testID="seedbackup"
          hidden={hidden}
          onToggleHide={onToggleHide}
          onCopy={onCopy}
        />
      </View>
      <Pressable
        testID="seedbackup.check"
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onCheck}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginHorizontal: SIDE,
          marginTop: 22,
          paddingVertical: 4,
        }}
      >
        <View style={{ width: 17, height: 17 }}>
          <Animated.View
            key={checked ? 'on' : 'off'}
            entering={checked ? boxPop() : undefined}
          >
            <Animated.View
              style={[
                {
                  width: 17,
                  height: 17,
                  borderRadius: 4,
                  borderWidth: 1.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: checked ? colors.bgAccent : colors.bgSurface,
                },
                checked ? { borderColor: colors.bgAccent } : boxNudge,
              ]}
            >
              {checked && <DrawnTick color={colors.bgCanvas} />}
            </Animated.View>
          </Animated.View>
        </View>
        <Text
          style={{
            flex: 1,
            color: colors.fgMuted,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {translate('seedbackup.paper') as string}
        </Text>
      </Pressable>
    </View>
  );
};

export default WordsStep;
