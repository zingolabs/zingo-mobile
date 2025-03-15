/* eslint-disable react-native/no-inline-styles */
import React from 'react';

import { Camera, Code, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { Text } from 'react-native-svg';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import { View } from 'react-native';

type ScannerProps = {
  onRead: (codes: Code[]) => void;
};

const Scanner: React.FunctionComponent<ScannerProps> = ({ onRead }) => {
  const { colors } = useTheme()  as ThemeType;
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [active, setActive] = React.useState(true);

  if (!hasPermission) {
    requestPermission();
  }

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: codes => {
      setActive(false);
      onRead(codes);
    },
  });

  console.log('permission', hasPermission);
  console.log('device', device);

  return (
    <View
      style={{
        backgroundColor: colors.background,
      }}>
      {!hasPermission || device == null ? (
        <View style={{ marginTop: 50 }}>
          <Text>No permission</Text>
        </View>
      ) : (
        <Camera style={{ width: '100%', height: '100%' }} device={device} isActive={active} codeScanner={codeScanner} />
      )}
    </View>
  );
};

export default Scanner;
