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
import { useTheme } from '../../../app/theme';
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
        flex: 1,
        backgroundColor: colors.bgCanvas,
      }}
    >
      {!hasPermission || device == null ? (
        <View style={{ marginTop: 50 }}>
          <Text>No permission</Text>
        </View>
      ) : (
        <Camera
          style={{ flex: 1 }}
          device={device}
          isActive={active}
          codeScanner={codeScanner}
          // Force Android to use TextureView instead of the default
          // SurfaceView. SurfaceView renders in its own hardware compositor
          // layer that ignores React Native's view hierarchy/z-order, which
          // makes the preview cover surrounding views (like the Header).
          // TextureView renders inside the regular RN view tree and respects
          // the parent flex bounds.
          androidPreviewViewType="texture-view"
        />
      )}
    </View>
  );
};

export default Scanner;
