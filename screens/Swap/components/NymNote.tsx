/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@app/theme';
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
        columnGap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.bgNym,
        backgroundColor: colors.bgNymSubtle,
      }}
    >
      <View style={{ marginTop: 1 }}>
        <NymOn width={18} height={18} />
      </View>
      <Text variant="caption" tone="muted" style={{ flex: 1, lineHeight: 17 }}>
        {text}
      </Text>
    </View>
  );
}
