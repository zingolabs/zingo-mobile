import React, { useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  Modal,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { BIOMETRIC_BLANKING_EVENT } from './simpleBiometrics';

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'black' },
});

const BiometricBlankingOverlay: React.FunctionComponent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const sub = DeviceEventEmitter.addListener(
      BIOMETRIC_BLANKING_EVENT,
      (show: boolean) => setVisible(show),
    );
    return () => sub.remove();
  }, []);

  if (!visible) {
    return null;
  }
  return (
    <Modal
      visible
      transparent={false}
      animationType="none"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={() => {}}
    >
      <View style={styles.overlay} />
    </Modal>
  );
};

export default BiometricBlankingOverlay;
