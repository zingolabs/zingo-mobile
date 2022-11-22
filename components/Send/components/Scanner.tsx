/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { View } from 'react-native';
import { TranslateOptions } from 'i18n-js';
import Toast from 'react-native-simple-toast';

import RegText from '../../Components/RegText';
import Button from '../../Button';
import { useTheme } from '@react-navigation/native';
import { parseZcashURI } from '../../../app/uris';
import RPCModule from '../../RPCModule';

type ScannerProps = {
  idx: number;
  updateToField: (
    idx: number,
    address: string | null,
    amount: string | null,
    amountUSD: string | null,
    memo: string | null,
  ) => void;
  closeModal: () => void;
  translate: (key: string, config?: TranslateOptions) => any;
};

const Scanner: React.FunctionComponent<ScannerProps> = ({ idx, updateToField, closeModal, translate }) => {
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
        const targets = await parseZcashURI(scannedAddress);

        if (Array.isArray(targets)) {
          updateToField(idx, scannedAddress, null, null, null);
          closeModal();
        } else {
          Toast.show(`${translate('scanner.uri-error')} ${targets}`, Toast.LONG);
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
    <QRCodeScanner
      onRead={onRead}
      reactivate={true}
      containerStyle={{ backgroundColor: colors.background }}
      topContent={
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '100%',
            marginTop: 15,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-evenly' }}>
            <RegText>{translate('scanner.scanaddress')}</RegText>
          </View>
        </View>
      }
      bottomContent={
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            width: '100%',
            marginBottom: 10,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-evenly' }}>
            <Button type="Secondary" title={translate('cancel')} onPress={doCancel} />
          </View>
        </View>
      }
    />
  );
};

export default Scanner;
