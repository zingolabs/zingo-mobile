/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme, radiusMd } from '@app/theme';
import Text from '@ui/primitives/Text';
import NymOn from '../../../assets/img/nym-on.svg';

/** The Nym-edged note that says which leg goes through the mixnet. */
export default function NymNote({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        columnGap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: colors.bgNym,
        backgroundColor: colors.bgNymSubtle,
      }}
    >
      <View style={{ marginTop: 4 }}>
        <NymOn width={18} height={18} />
      </View>
      <Text variant="caption" tone="muted" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}
