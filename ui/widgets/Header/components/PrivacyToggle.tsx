/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Pressable } from 'react-native';
import { slopFor, useTheme, radiusSm, iconSizeMd } from '@app/theme';
import { TranslateType } from '@app/AppState';
import { EyeIcon } from '@ui/primitives/Icons/EyeIcon';
import { EyeOffIcon } from '@ui/primitives/Icons/EyeOffIcon';

type PrivacyToggleProps = {
  privacy: boolean;
  setPrivacyOption: (value: boolean) => Promise<void>;
  translate: (key: string) => TranslateType;
};

/**
 * The eye beside "Total balance": it masks every amount in the app with
 * "•••••" until it is tapped again. A 44 pt target around an 18 pt icon.
 */
const PrivacyToggle: React.FC<PrivacyToggleProps> = React.memo(
  ({ privacy, setPrivacyOption, translate }) => {
    const { colors } = useTheme();
    const Icon = privacy ? EyeOffIcon : EyeIcon;
    return (
      <Pressable
        testID="header.privacy"
        accessibilityRole="button"
        accessibilityLabel={
          translate(
            privacy ? 'header.show-amounts' : 'header.hide-amounts',
          ) as string
        }
        hitSlop={slopFor(30)}
        onPress={() => setPrivacyOption(!privacy)}
        style={{
          width: 30,
          height: 30,
          marginVertical: -4,
          marginLeft: -2,
          marginRight: -6,
          borderRadius: radiusSm,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={iconSizeMd} color={colors.fgMuted} />
      </Pressable>
    );
  },
);

export default PrivacyToggle;
