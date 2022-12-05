/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { View, Platform } from 'react-native';
import { TranslateOptions } from 'i18n-js';
import Toast from 'react-native-simple-toast';

import RegText from '../../Components/RegText';
import Button from '../../Button';
import { useTheme } from '@react-navigation/native';
import { parseZcashURI } from '../../../app/uris';
import RPCModule from '../../RPCModule';

type ScannerProps = {
  updateToField: (address: string | null, amount: string | null, amountUSD: string | null, memo: string | null) => void;
  closeModal: () => void;
  translate: (key: string, config?: TranslateOptions) => any;
  width: number;
  height: number;
};

const Scanner: React.FunctionComponent<ScannerProps> = ({ updateToField, closeModal, translate, width, height }) => {
  const validateAddress = async (scannedAddress: string) => {
    const result = await RPCModule.execute('parse', scannedAddress);
    const resultJSON = await JSON.parse(result);

    //console.log('parse-1', scannedAddress, resultJSON);

    const valid = resultJSON?.status === 'success';

    if (valid) {
      updateToField(scannedAddress, null, null, null);
      closeModal();
    } else {
      // Try to parse as a URI
      if (scannedAddress.startsWith('zcash:')) {
        const target = await parseZcashURI(scannedAddress);

        if (typeof target !== 'string') {
          updateToField(scannedAddress, null, null, null);
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
    <View style={{ width: '100%', height: '100%' }}>
      <QRCodeScanner
        onRead={onRead}
        reactivate={true}
        containerStyle={{ backgroundColor: colors.background }}
        cameraContainerStyle={{
          borderColor: Platform.OS === 'ios' ? colors.primary : colors.background,
          borderWidth: Platform.OS === 'ios' ? 1 : 0,
          padding: 10,
          margin: 10,
        }}
        cameraStyle={{ width: width, height: Platform.OS === 'ios' ? height : height * 1.1 }}
        topContent={
          <View
            style={{
              width: '100%',
              padding: 20,
            }}>
            <View style={{ width: width, alignItems: 'center' }}>
              <RegText>{translate('scanner.scanaddress')}</RegText>
            </View>
          </View>
        }
        bottomContent={
          <View
            style={{
              width: '100%',
              padding: 20,
            }}>
            <View style={{ width: width, alignItems: 'center' }}>
              <Button type="Secondary" title={translate('cancel')} onPress={doCancel} />
            </View>
          </View>
        }
      />
    </View>
  );
};

export default Scanner;
