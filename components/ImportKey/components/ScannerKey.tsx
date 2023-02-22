/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import QRCodeScanner from 'react-native-qrcode-scanner';

import RegText from '../../Components/RegText';
import Button from '../../Components/Button';
import { useContext } from 'react';
import { ContextAppLoaded } from '../../../app/context';
import { BarCodeReadEvent } from 'react-native-camera';

type ScannerKeyProps = {
  setPrivKeyText: (k: string) => void;
  closeModal: () => void;
};
const ScannerKey: React.FunctionComponent<ScannerKeyProps> = ({ setPrivKeyText, closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const validateKey = (scannedKey: string) => {
    setPrivKeyText(scannedKey);
    closeModal();
  };

  const onRead = (e: BarCodeReadEvent) => {
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
      topContent={<RegText>{translate('scanner.text')}</RegText>}
      bottomContent={
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            width: '100%',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-evenly' }}>
            <Button type="Secondary" title={translate('cancel')} onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
};

export default ScannerKey;
