/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

const CIRCLE_BG = '#081F10';
const CIRCLE_BORDER = '#0E5E0A';

// The phrase was confirmed.
const DoneStep: React.FunctionComponent = () => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 52 }}>
      <View
        style={{
          width: 75,
          height: 75,
          borderRadius: 38,
          backgroundColor: CIRCLE_BG,
          borderWidth: 1,
          borderColor: CIRCLE_BORDER,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <CheckIcon size={34} color={colors.fgAccent} strokeWidth={2.6} />
      </View>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.fgDefault,
          fontSize: 21,
          lineHeight: 27,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        {translate('seedbackup.done-title') as string}
      </Text>
      <Text
        style={{
          color: colors.fgMuted,
          fontSize: 14,
          lineHeight: 21,
          textAlign: 'center',
        }}
      >
        {translate('seedbackup.done-body') as string}
      </Text>
    </View>
  );
};

export default DoneStep;
