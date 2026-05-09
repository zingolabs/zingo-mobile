/* eslint-disable react-native/no-inline-styles */
import React from 'react';

import {
  Camera,
  Code,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { Text } from 'react-native-svg';
import { useTheme } from '@react-navigation/native';
import { View } from 'react-native';

type ScannerProps = {
  active: boolean;
  onRead: (value: string) => void;
  onClose: () => void;
};

const Scanner: React.FunctionComponent<ScannerProps> = ({
  active,
  onRead,
  onClose,
}) => {
  const { colors } = useTheme();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  if (!hasPermission) {
    requestPermission();
  }

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes: Code[]) => {
      onRead(codes && codes[0] && codes[0].value ? codes[0].value.trim() : '');
      onClose();
    },
  });

  console.log('active', active);
  console.log('permission', hasPermission);
  //console.log('device', device);

  return (
    <View
      style={{
        backgroundColor: colors.background,
      }}
    >
      {!hasPermission || device == null ? (
        <View style={{ marginTop: 50 }}>
          <Text>No permission</Text>
        </View>
      ) : (
        <Camera
          style={{ width: '100%', height: '100%' }}
          device={device}
          isActive={active}
          codeScanner={codeScanner}
        />
      )}
    </View>
  );
};

export default Scanner;
