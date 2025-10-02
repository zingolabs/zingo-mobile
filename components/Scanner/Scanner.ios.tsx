/* eslint-disable react-native/no-inline-styles */
import React from 'react';

import { Camera, Code, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { Text } from 'react-native-svg';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../app/types';
import { View } from 'react-native';

type ScannerProps = {
  onRead: (value: string) => Promise<void>;
  onClose: () => void;
};

const Scanner: React.FunctionComponent<ScannerProps> = ({ onRead, onClose }) => {
  const { colors } = useTheme()  as ThemeType;
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [active, setActive] = React.useState(true);

  if (!hasPermission) {
    requestPermission();
  }

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes: Code[]) => {
      // since this screen is not a modal
      // have to be a ctive all the time
      setActive(true);
      //console.log(codes[0].value);
      onRead(codes && codes[0] && codes[0].value ? codes[0].value.trim() : '');
      onClose();
    },
  });

  console.log('permission', hasPermission);
  console.log('device', device);
  console.log('active', active);

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
