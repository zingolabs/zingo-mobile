import React, { useContext } from 'react';

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
  const { translate, netInfo, server, addLastSnackbar } = context;
  const validateAddress = async (scannedAddress: string) => {
    if (!netInfo.isConnected) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
      return;
    }
    const result: string = await RPCModule.execute('parse_address', scannedAddress);
    if (result) {
      if (result.toLowerCase().startsWith('error') || result.toLowerCase() === 'null') {
        addLastSnackbar({ message: translate('scanner.nozcash-error') as string, type: 'Primary' });
        return;
      }
    } else {
      addLastSnackbar({ message: translate('scanner.nozcash-error') as string, type: 'Primary' });
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
          addLastSnackbar({ message: `${translate('scanner.uri-error')} ${target}`, type: 'Primary' });
          return;
        }
      } else {
        addLastSnackbar({ message: translate('scanner.nozcash-error') as string, type: 'Primary' });
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
