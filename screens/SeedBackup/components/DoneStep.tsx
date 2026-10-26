/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

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
          backgroundColor: colors.bgAccentSubtle,
          borderWidth: 1,
          borderColor: colors.borderAccent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <CheckIcon size={34} color={colors.fgAccent} />
      </View>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.fgDefault,
          fontSize: 22,
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
          fontSize: 15,
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
