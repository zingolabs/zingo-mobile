/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import RegText from '../../Components/RegText';

type ExpandedAddressProps = {
  address: string;
  closeSheet: () => void;
  onCopy?: () => void;
  title?: string;
  button?: string;
  setHeightLayout: (h: number) => void;
};

const ExpandedAddress: React.FunctionComponent<ExpandedAddressProps> = ({
  address,
  closeSheet,
  onCopy,
  title,
  button,
  setHeightLayout,
}) => {
  const { colors } = useTheme() as ThemeType;

  return (
    <View
      onLayout={e => {
        const { height } = e.nativeEvent.layout;
        //console.log('LAYOUTTT', height);
        setHeightLayout(height + 70);
      }}
      style={{
        backgroundColor: colors.background,
      }}
    >
      <TouchableOpacity
        onPress={() => {
          closeSheet();
        }}
      >
        <FontAwesomeIcon
          size={24}
          icon={faXmark}
          color={colors.text}
          style={{ marginTop: 10, marginRight: 20, alignSelf: 'flex-end' }}
        />
      </TouchableOpacity>
      <RegText
        style={{ marginTop: 0, paddingHorizontal: 10, alignSelf: 'center' }}
      >
        {title ? title : ''}
      </RegText>
      <View
        style={{
          width: '90%',
          padding: 16,
          borderRadius: 8,
          backgroundColor: colors.background,
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
