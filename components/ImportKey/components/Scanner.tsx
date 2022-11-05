/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import QRCodeScanner from 'react-native-qrcode-scanner';

import RegText from '../../Components/RegText';
import Button from '../../Button';

type ScannerProps = {
  setPrivKeyText: (k: string) => void;
  closeModal: () => void;
};
const Scanner: React.FunctionComponent<ScannerProps> = ({ setPrivKeyText, closeModal }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<String | null>(null);

  const validateKey = (scannedKey: string) => {
    setPrivKeyText(scannedKey);
    closeModal();
  };

  const onRead = (e: any) => {
    const scandata = e.data.trim();

    validateKey(scandata);
  };

  const doCancel = () => {
    closeModal();
  };

  const { colors } = useTheme();
  return (
    <QRCodeScanner
      onRead={onRead}
      reactivate={true}
      containerStyle={{ backgroundColor: colors.background }}
      topContent={<RegText>Scan a Private/Spending or Full Viewing/Viewing Key</RegText>}
      bottomContent={
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
          }}>
          {error && <RegText style={{ textAlign: 'center' }}>{error}</RegText>}
          <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-evenly' }}>
            <Button type="Secondary" title="Cancel" onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
};

export default Scanner;
