/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';

import {
  iconSize,
  radiusPill,
  space8,
  space20,
  space32,
  useTheme,
} from '@app/theme';
import Text from '@ui/primitives/Text';
import { ContextAppLoaded } from '@app/context';
import { CheckIcon } from '@ui/primitives/Icons/CheckIcon';

// The phrase was confirmed.
const DoneStep: React.FunctionComponent = () => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: space32 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radiusPill,
          backgroundColor: colors.bgAccentSubtle,
          borderWidth: 1,
          borderColor: colors.borderAccent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space20,
        }}
      >
        <CheckIcon size={iconSize} color={colors.fgAccent} />
      </View>
      <Text
        accessibilityRole="header"
        variant="subtitle"
        style={{ textAlign: 'center', marginBottom: space8 }}
      >
        {translate('seedbackup.done-title') as string}
      </Text>
      <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
        {translate('seedbackup.done-body') as string}
      </Text>
    </View>
  );
};

export default DoneStep;
