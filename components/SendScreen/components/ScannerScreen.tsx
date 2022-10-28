/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { View } from 'react-native';
import { RegText } from '../../Components';
import Button from '../../Button';
import { useTheme } from '@react-navigation/native';
import { parseZcashURI } from '../../../app/uris';
import RPCModule from '../../RPCModule';

type ScannerScreenProps = {
  idx: number;
  updateToField: (
    idx: number,
    address: string | null,
    amount: string | null,
    amountUSD: string | null,
    memo: string | null,
  ) => void;
  closeModal: () => void;
};

function ScannerScreen({ idx, updateToField, closeModal }: ScannerScreenProps) {
  const [error, setError] = useState<String | null>(null);

  const validateAddress = async (scannedAddress: string) => {
    const result = await RPCModule.execute('parse', scannedAddress);
    const resultJSON = await JSON.parse(result);

    //console.log('parse-1', scannedAddress, resultJSON);

    const valid = resultJSON?.status === 'success';

    if (valid) {
      updateToField(idx, scannedAddress, null, null, null);
      closeModal();
    } else {
      // Try to parse as a URI
      if (scannedAddress.startsWith('zcash:')) {
        const targets = parseZcashURI(scannedAddress);

        if (Array.isArray(targets)) {
          updateToField(idx, scannedAddress, null, null, null);
          closeModal();
        } else {
          setError(`URI Error: ${targets}`);
        }
      } else {
        setError(`"${scannedAddress}" is not a valid Zcash Address`);
      }
    }
  };

  const onRead = (e: any) => {
    const scandata = e.data.trim();
    let scannedAddress = scandata;

    validateAddress(scannedAddress);
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
      topContent={<RegText>Scan a Zcash Address</RegText>}
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
}

export default ScannerScreen;
