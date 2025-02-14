/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Camera, Code, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { Text } from 'react-native-svg';
// import { useTheme } from '@react-navigation/native';
// import { ThemeType } from '../../app/types/ThemeType';

type ScannerProps = {
  onRead: (codes: Code[]) => void;
};

const Scanner: React.FunctionComponent<ScannerProps> = ({ onRead }) => {
  // const { colors } = useTheme() as unknown as ThemeType;
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

  if (!hasPermission || device == null) {
    console.log('permission: ', hasPermission);
    console.log('device: ', device);
    return (
      <SafeAreaView
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}>
        <Text>No permission</Text>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView
      style={{
        width: '100%',
        height: '100%',
      }}>
      <Camera style={{ width: '100%', height: '100%' }} device={device} isActive={active} codeScanner={codeScanner} />
    </SafeAreaView>
  );
};

export default Scanner;
