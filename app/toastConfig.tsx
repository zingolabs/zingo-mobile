/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from './theme';
import { ToastConfigParams } from 'react-native-toast-message';

const AppInfoToast: React.FC<ToastConfigParams<undefined>> = ({ text1 }) => {
  const { colors } = useTheme();
  return (
    <View style={{ width: '100%', paddingHorizontal: 10 }}>
      <View
        style={{
          backgroundColor: colors.bgSecondaryDisabled,
          paddingLeft: 20,
          paddingRight: 15,
          paddingVertical: 10,
          borderWidth: 0.5,
          borderColor: colors.borderMuted,
          borderRadius: 6,
        }}
      >
        <Text style={{ color: colors.fgDefault, fontSize: 15 }}>{text1}</Text>
      </View>
    </View>
  );
};

export const toastConfig = {
  appInfo: (props: ToastConfigParams<undefined>) => <AppInfoToast {...props} />,
};
