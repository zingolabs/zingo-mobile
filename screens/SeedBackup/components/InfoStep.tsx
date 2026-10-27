/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, View } from 'react-native';

import {
  iconSizeMd,
  iconSizeSm,
  radiusMd,
  radiusSm,
  space12,
  space16,
  useTheme,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import { ContextAppLoaded } from '@app/context';
import { KeyIcon } from '@ui/primitives/Icons/KeyIcon';
import { PencilIcon } from '@ui/primitives/Icons/PencilIcon';
import { EyeOffIcon } from '@ui/primitives/Icons/EyeOffIcon';
import { ShieldCheckIcon } from '@ui/primitives/Icons/ShieldCheckIcon';
import { SIDE, StepTitle } from './StepParts';

type InfoStepProps = {
  keychainNote: boolean;
};

const Tile: React.FunctionComponent<{
  bg: string;
  children: React.ReactNode;
}> = ({ bg, children }) => (
  <View
    style={{
      width: 36,
      height: 36,
      borderRadius: radiusSm,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </View>
);

// The three rules to read before the words appear.
const InfoStep: React.FunctionComponent<InfoStepProps> = ({ keychainNote }) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  const rows = [
    { key: 'access', Icon: KeyIcon },
    { key: 'paper', Icon: PencilIcon },
    { key: 'private', Icon: EyeOffIcon },
  ];
  return (
    <View>
      <StepTitle
        title={translate('seedbackup.info-title') as string}
        sub={translate('seedbackup.info-sub') as string}
      />
      <View
        style={{
          marginHorizontal: SIDE,
          borderRadius: radiusMd,
          borderWidth: 1,
          borderColor: colors.bottomSheetBorder,
          backgroundColor: colors.bgSurface,
        }}
      >
        {rows.map(({ key, Icon }, i) => (
          <View
            key={key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space12,
              paddingHorizontal: space16,
              paddingVertical: space12,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: colors.borderSubtle,
            }}
          >
            <Tile bg={colors.bgMutedSubtle}>
              <Icon size={iconSizeMd} color={colors.fgMuted} />
            </Tile>
            <Text variant="bodySmall" style={{ flex: 1 }}>
              {translate(`seedbackup.info-${key}`) as string}
            </Text>
          </View>
        ))}
      </View>
      {keychainNote && (
        <View
          testID="seedbackup.keychain"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space12,
            marginHorizontal: SIDE,
            marginTop: space12,
            padding: space12,
            borderRadius: radiusMd,
            backgroundColor: colors.bgMutedSubtle,
          }}
        >
          <ShieldCheckIcon size={iconSizeSm} color={colors.fgMuted} />
          <Text variant="caption" style={{ flex: 1 }}>
            {
              translate(
                Platform.OS === 'ios'
                  ? 'seedbackup.keychain-ios'
                  : 'seedbackup.keychain-android',
              ) as string
            }
          </Text>
        </View>
      )}
    </View>
  );
};

export default InfoStep;
