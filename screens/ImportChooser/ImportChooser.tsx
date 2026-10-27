/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  iconSizeSm,
  radiusMd,
  radiusPill,
  rowMinHeight,
  space8,
  space12,
  space16,
  space20,
  space24,
  useTheme,
} from '@app/theme';
import { duration, ease } from '@app/theme/motion';
import { ContextAppLoading } from '@app/context';
import Text from '@ui/primitives/Text';
import TitleBar from '@ui/widgets/TitleBar';
import { ChevronLeft, ChevronRight } from '@ui/primitives/Icons/Chevron';
import { HistoryIcon } from '@ui/primitives/Icons/HistoryIcon';
import { Icon } from '@ui/primitives/Icons/Icon';
import { KeyboardIcon } from '@ui/primitives/Icons/KeyboardIcon';

type ImportChooserProps = {
  busy: boolean;
  onPrevious: () => void;
  onSeed: () => void;
  onBack: () => void;
};

// The system store that keeps the recovery phrase, by its platform name.
const SECURE_STORE = Platform.OS === 'ios' ? 'Keychain' : 'Keystore';
const ICON_DISC = 40;
// On touch the card shrinks a little and its border brightens.
const PRESS_MS = duration.fast;
const PRESS_SCALE = 0.985;

type OptionProps = {
  icon: React.ComponentType<React.ComponentProps<typeof Icon>>;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  subColor: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
};

const Option: React.FC<OptionProps> = ({
  icon: OptionIcon,
  iconBg,
  iconColor,
  title,
  sub,
  subColor,
  disabled,
  onPress,
  testID,
}) => {
  const { colors } = useTheme();
  const press = useSharedValue(0);
  const to = (v: number) => {
    press.value = withTiming(v, { duration: PRESS_MS, easing: ease.out });
  };
  const pressStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      press.value,
      [0, 1],
      [colors.bottomSheetBorder, colors.borderFocus],
    ),
    transform: [{ scale: 1 - (1 - PRESS_SCALE) * press.value }],
  }));
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          {
            minHeight: rowMinHeight,
            borderRadius: radiusMd,
            borderWidth: 1,
            backgroundColor: colors.bgSurface,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space16,
            paddingVertical: space12,
            gap: space12,
          },
          pressStyle,
        ]}
      >
        <View
          style={{
            width: ICON_DISC,
            height: ICON_DISC,
            borderRadius: radiusPill,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <OptionIcon size={iconSizeSm} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{title}</Text>
          <Text variant="caption" color={subColor}>
            {sub}
          </Text>
        </View>
        <ChevronRight size={iconSizeSm} color={colors.fgMuted} />
      </Animated.View>
    </Pressable>
  );
};

const ImportChooser: React.FunctionComponent<ImportChooserProps> = ({
  busy,
  onPrevious,
  onSeed,
  onBack,
}) => {
  const { translate } = useContext(ContextAppLoading);
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <TitleBar
        title={translate('import.screen-title') as string}
        left={{
          icon: ChevronLeft,
          onPress: onBack,
          accessibilityLabel: translate('import.back-acc') as string,
          testID: 'import.chooser.back',
          accent: true,
          disabled: busy,
        }}
      />
      <Text
        variant="caption"
        tone="muted"
        style={{
          marginTop: space24,
          marginHorizontal: space20,
          textAlign: 'center',
        }}
      >
        {translate('import.chooser-sub') as string}
      </Text>
      <View style={{ marginTop: space16, marginHorizontal: space20 }}>
        <Option
          testID="import.chooser.previous"
          icon={HistoryIcon}
          iconBg={colors.bgAccentSubtle}
          iconColor={colors.fgAccent}
          title={translate('import.chooser-previous') as string}
          sub={(translate('import.chooser-previous-sub') as string).replace(
            '{store}',
            SECURE_STORE,
          )}
          subColor={colors.fgMuted}
          disabled={busy}
          onPress={onPrevious}
        />
        <Text
          variant="caption"
          tone="muted"
          style={{ textAlign: 'center', marginVertical: space8 }}
        >
          {translate('import.chooser-or') as string}
        </Text>
        <Option
          testID="import.chooser.seed"
          icon={KeyboardIcon}
          iconBg={colors.bgAccentSubtle}
          iconColor={colors.fgAccent}
          title={translate('import.chooser-seed') as string}
          sub={translate('import.chooser-seed-sub') as string}
          subColor={colors.fgWarning}
          disabled={busy}
          onPress={onSeed}
        />
      </View>
    </View>
  );
};

export default ImportChooser;
