/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  IconDefinition,
  faChevronLeft,
  faChevronRight,
  faClockRotateLeft,
  faKeyboard,
} from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';
import { ContextAppLoading } from '@app/context';
import RegText from '@ui/primitives/RegText';
import BoldText from '@ui/primitives/BoldText';

type ImportChooserProps = {
  busy: boolean;
  onPrevious: () => void;
  onSeed: () => void;
  onBack: () => void;
};

// The system store that keeps the recovery phrase, by its platform name.
const SECURE_STORE = Platform.OS === 'ios' ? 'Keychain' : 'Keystore';
const SIDE = 22.5;
const FIRST_TOP = 150.5;

type OptionProps = {
  icon: IconDefinition;
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
  icon,
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
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 69,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: pressed ? colors.borderFocus : colors.bottomSheetBorder,
        backgroundColor: colors.bgSurface,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 15,
        paddingRight: 16,
        gap: 15,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          width: 39,
          height: 39,
          borderRadius: 20,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesomeIcon icon={icon} size={17} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <BoldText style={{ fontSize: 14, lineHeight: 19 }}>{title}</BoldText>
        <RegText
          style={{
            fontSize: 11.5,
            lineHeight: 17,
            marginTop: 1,
            color: subColor,
          }}
        >
          {sub}
        </RegText>
      </View>
      <FontAwesomeIcon icon={faChevronRight} size={12} color={colors.fgMuted} />
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
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <BoldText
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 50,
          fontSize: 16,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {translate('import.screen-title') as string}
      </BoldText>
      <RegText
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 95,
          fontSize: 12,
          lineHeight: 20,
          textAlign: 'center',
          color: colors.fgMuted,
        }}
      >
        {translate('import.chooser-sub') as string}
      </RegText>
      <View
        style={{
          position: 'absolute',
          left: SIDE,
          right: SIDE,
          top: FIRST_TOP,
        }}
      >
        <Option
          testID="import.chooser.previous"
          icon={faClockRotateLeft}
          iconBg="#0A2A1E"
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
        <RegText
          style={{
            textAlign: 'center',
            fontSize: 11,
            lineHeight: 18,
            marginVertical: 9,
            color: colors.fgMuted,
          }}
        >
          {translate('import.chooser-or') as string}
        </RegText>
        <Option
          testID="import.chooser.seed"
          icon={faKeyboard}
          iconBg="#2A1820"
          iconColor={colors.fgDanger}
          title={translate('import.chooser-seed') as string}
          sub={translate('import.chooser-seed-sub') as string}
          subColor={colors.fgDanger}
          disabled={busy}
          onPress={onSeed}
        />
      </View>
      <Pressable
        testID="import.chooser.back"
        onPress={onBack}
        disabled={busy}
        hitSlop={14}
        accessibilityRole="button"
        style={({ pressed }) => ({
          position: 'absolute',
          left: 17,
          top: 38,
          width: 44,
          height: 44,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.bgSurface : 'transparent',
        })}
      >
        <FontAwesomeIcon
          icon={faChevronLeft}
          size={18}
          color={colors.fgAccent}
        />
      </Pressable>
    </View>
  );
};

export default ImportChooser;
