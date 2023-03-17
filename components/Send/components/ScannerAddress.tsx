/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { View, } from 'react-native';
import Toast from 'react-native-simple-toast';

import RegText from '../../Components/RegText';
import Button from '../../Components/Button';
import { useTheme } from '@react-navigation/native';
import { parseZcashURI } from '../../../app/uris';
import RPCModule from '../../../app/RPCModule';
import { ContextAppLoaded } from '../../../app/context';
import { BarCodeReadEvent } from 'react-native-camera';

type ScannerAddressProps = {
  updateToField: (
    address: string | null,
    amount: string | null,
    CurrencyAmount: string | null,
    memo: string | null,
    includeUAMemo: boolean | null,
  ) => void;
  closeModal: () => void;
};

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({ updateToField, closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { translate } = context;
  const validateAddress = async (scannedAddress: string) => {
    const result = await RPCModule.execute('parse', scannedAddress);
    const resultJSON = await JSON.parse(result);

    //console.log('parse-1', scannedAddress, resultJSON);

    const valid = resultJSON?.status === 'success';

    if (valid) {
      updateToField(scannedAddress, null, null, null, null);
      closeModal();
    } else {
      // Try to parse as a URI
      if (scannedAddress.startsWith('zcash:')) {
        const target = await parseZcashURI(scannedAddress);

        if (typeof target !== 'string') {
          updateToField(scannedAddress, null, null, null, null);
          closeModal();
        } else {
          Toast.show(`${translate('scanner.uri-error')} ${target}`, Toast.LONG);
          return;
        }
      } else {
        Toast.show(`"${scannedAddress}" ${translate('scanner.nozcash-error')}`, Toast.LONG);
        return;
      }
    }
  };

  const onRead = (e: BarCodeReadEvent) => {
    const scandata = e.data.trim();
    let scannedAddress = scandata;

    validateAddress(scannedAddress);
  };

  const doCancel = () => {
    closeModal();
  };

  const { colors } = useTheme();
  return (
    <View style={{
      width: '100%',
      height: '100%',
      }}>
      <QRCodeScanner
        onRead={onRead}
        reactivate={true}
        containerStyle={{
          backgroundColor: colors.background
        }}
        cameraContainerStyle={{
        }}
        cameraStyle={{
        }}
        topContent={
          <View
            style={{
            }}>
            <View style={{
            }}>
              <RegText>{translate('scanner.scanaddress') as string}</RegText>
            </View>
          </View>
        }
        bottomContent={
          <View
            style={{
            }}>
            <View style={{ width: width, alignItems: 'center' }}>
              <Button
                testID="send.scan.cancel"
                type="Secondary"
                title={translate('cancel') as string} onPress={doCancel}
              />
          </View>
        }
      />
    </View>
  );
};

export default ScannerAddress;
