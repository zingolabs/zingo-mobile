import React, { useContext } from 'react';
import Toast from 'react-native-simple-toast';

import { parseZcashURI } from '../../../app/uris';
import RPCModule from '../../../app/RPCModule';
import { ContextAppLoaded } from '../../../app/context';
import { BarCodeReadEvent } from 'react-native-camera';
import { RPCParseAddressType } from '../../../app/rpc/types/RPCParseAddressType';
import Scanner from '../../Components/Scanner';

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
  const { translate, netInfo, server } = context;
  const validateAddress = async (scannedAddress: string) => {
    if (!netInfo.isConnected) {
      Toast.show(translate('loadedapp.connection-error') as string, Toast.LONG);
      return;
    }
    const result: string = await RPCModule.execute('parse_address', scannedAddress);
    if (result) {
      if (result.toLowerCase().startsWith('error') || result.toLowerCase() === 'null') {
        Toast.show(`"${scannedAddress}" ${translate('scanner.nozcash-error')}`, Toast.LONG);
        return;
      }
    } else {
      Toast.show(`"${scannedAddress}" ${translate('scanner.nozcash-error')}`, Toast.LONG);
      return;
    }
    // TODO verify that JSON don't fail.
    const resultJSON: RPCParseAddressType = await JSON.parse(result);

    //console.log('parse-1', scannedAddress, resultJSON);

    const valid = resultJSON.status === 'success' && server.chain_name === resultJSON.chain_name;

    if (valid) {
      updateToField(scannedAddress, null, null, null, null);
      closeModal();
    } else {
      // Try to parse as a URI
      if (scannedAddress.startsWith('zcash:')) {
        const target = await parseZcashURI(scannedAddress, translate, server);

        if (typeof target !== 'string') {
          updateToField(scannedAddress, null, null, null, null);
          closeModal();
        } else {
          Toast.show(`${translate('scanner.uri-error')} ${target}`, Toast.LONG);
          return;
        }
      } else {
        Toast.show(`${translate('scanner.nozcash-error')}`, Toast.LONG);
        return;
      }
    }
  };

  const onRead = (e: BarCodeReadEvent) => {
    const scandata = e.data.trim();

    validateAddress(scandata);
  };

  const doCancel = () => {
    closeModal();
  };

  return (
    <Scanner
      onRead={onRead}
      doCancel={doCancel}
      title={translate('scanner.scanaddress') as string}
      button={translate('cancel') as string}
    />
  );
};

export default ScannerAddress;
