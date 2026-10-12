/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, Text, View } from 'react-native';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { KeyIcon } from '@ui/primitives/Icons/KeyIcon';
import { PencilIcon } from '@ui/primitives/Icons/PencilIcon';
import { EyeOffIcon } from '@ui/primitives/Icons/EyeOffIcon';
import { ShieldCheckIcon } from '@ui/primitives/Icons/ShieldCheckIcon';
import { SIDE, StepTitle } from './StepParts';

const TILE_BG = '#052520';
const NOTE_TILE_BG = '#0A1B33';
const NOTE_INK = '#8FB4E6';

type InfoStepProps = {
  keychainNote: boolean;
};

const Tile: React.FunctionComponent<{
  bg: string;
  children: React.ReactNode;
}> = ({ bg, children }) => (
  <View
    style={{
      width: 34,
      height: 34,
      borderRadius: 9,
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
  const text = {
    color: colors.fgDefault,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  };
  return (
    <View>
      <StepTitle
        title={translate('seedbackup.info-title') as string}
        sub={translate('seedbackup.info-sub') as string}
      />
      <View
        style={{
          marginHorizontal: SIDE,
          borderRadius: 16,
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
              gap: 12,
              paddingHorizontal: 18,
              paddingVertical: 15,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: colors.bottomSheetBorder,
            }}
          >
            <Tile bg={TILE_BG}>
              <Icon size={18} color={colors.fgAccent} strokeWidth={1.9} />
            </Tile>
            <Text style={text}>
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
            gap: 12,
            marginHorizontal: SIDE,
            marginTop: 12,
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.bottomSheetBorder,
          }}
        >
          <Tile bg={NOTE_TILE_BG}>
            <ShieldCheckIcon size={17} color={NOTE_INK} strokeWidth={1.9} />
          </Tile>
          <Text style={text}>
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
