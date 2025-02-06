/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { SafeAreaView } from 'react-native';

import { useTheme } from '@react-navigation/native';
import { BarCodeReadEvent } from 'react-native-camera';
import { ThemeType } from '../../app/types/ThemeType';

type ScannerProps = {
  onRead: (e: BarCodeReadEvent) => void;
};

const Scanner: React.FunctionComponent<ScannerProps> = ({ onRead }) => {
  const { colors } = useTheme() as unknown as ThemeType;
  return (
    <SafeAreaView
      style={{
        width: '100%',
        height: '100%',
      }}>
      <QRCodeScanner
        showMarker={true}
        markerStyle={{
          borderColor: colors.primary,
        }}
        onRead={onRead}
        reactivate={true}
        containerStyle={{
          backgroundColor: colors.background,
        }}
        cameraContainerStyle={{
          overflow: 'hidden',
        }}
      />
    </SafeAreaView>
  );
};

export default Scanner;
