/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types/ThemeType';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

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
  title,
  button,
}) => {
  const { colors } = useTheme() as unknown as ThemeType;

  return (
    <View style={{ backgroundColor: colors.background  }}>
      <TouchableOpacity
        onPress={() => {
          closeSheet();
        }}>
        <FontAwesomeIcon
            size={30}
            icon={faXmark}
            color={colors.text}
            style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }}
        />
      </TouchableOpacity>
      <View
        style={{
          width: '90%',
          padding: 16,
          borderRadius: 8,
          backgroundColor: '#1e293b',
          alignSelf: 'center',
          marginTop: 15,
        }}>
        <View
          style={{
            height: 2,
            width: '100%',
            marginBottom: 6,
          }}
        />

        <View style={{ alignItems: 'flex-start' }}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
            {title}
          </Text>
          <Text style={{ color: '#cbd5e1', fontSize: 16, marginBottom: 12 }}>{address}</Text>
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
            }}>
            <Text style={{ color: '#ccc', fontSize: 16 }}>{button}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ExpandedAddress;
