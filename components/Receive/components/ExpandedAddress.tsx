/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../app/theme';

type ExpandedAddressProps = {
  address: string;
  closeSheet: () => void;
  onCopy?: () => void;
  title?: string;
  button?: string;
};

const ExpandedAddress: React.FunctionComponent<ExpandedAddressProps> = ({
  address,
  closeSheet,
  onCopy,
  title: _title,
  button,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.bgSurface,
      }}
    >
      <View
        style={{
          width: '90%',
          padding: 16,
          borderRadius: 8,
          backgroundColor: colors.bgSurface,
          alignSelf: 'center',
        }}
      >
        <View style={{ alignItems: 'flex-start' }}>
          <Text style={{ color: '#cbd5e1', fontSize: 16, marginBottom: 20 }}>
            {address}
          </Text>
          <TouchableOpacity
            onPress={() => {
              onCopy && onCopy();
              closeSheet();
            }}
            style={{
              borderColor: '#3B4B5F',
              backgroundColor: '#2A394D',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 5,
              borderWidth: 1,
              alignSelf: 'center',
            }}
          >
            <Text style={{ color: '#ccc', fontSize: 16 }}>{button}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ExpandedAddress;
