/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@app/theme';
import Button from '@ui/primitives/Button';

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
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderRadius: 8,
          backgroundColor: colors.bgSurface,
        }}
      >
        <View style={{ alignItems: 'flex-start' }}>
          <Text
            style={{ color: colors.fgDefault, fontSize: 16, marginBottom: 20 }}
          >
            {address}
          </Text>
          <Button
            variant="text"
            title={button ?? ''}
            onPress={() => {
              onCopy && onCopy();
              closeSheet();
            }}
          />
        </View>
      </View>
    </View>
  );
};

export default ExpandedAddress;
