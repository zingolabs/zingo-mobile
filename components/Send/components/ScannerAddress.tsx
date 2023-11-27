import React, { useContext } from 'react';

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
  closeModalOK: () => void;
  closeModalCancel: () => void;
};

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({
  updateToField,
  closeModalOK,
  closeModalCancel,
}) => {
  const context = useContext(ContextAppLoaded);
  const { translate, netInfo, server, addLastSnackbar } = context;
  const validateAddress = async (scannedAddress: string) => {
    if (!netInfo.isConnected) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string, type: 'Primary' });
      return;
    }
    if (scannedAddress.startsWith('zcash:')) {
      updateToField(scannedAddress, null, null, null, null);
      closeModalOK();
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
    let resultJSON = {} as RPCParseAddressType;
    try {
      resultJSON = await JSON.parse(result);
    } catch (e) {
      addLastSnackbar({ message: translate('scanner.nozcash-error') as string, type: 'Primary' });
      return;
    }

    //console.log('parse-1', scannedAddress, resultJSON);

    const valid = resultJSON.status === 'success' && server.chain_name === resultJSON.chain_name;

    if (valid) {
      updateToField(scannedAddress, null, null, null, null);
      closeModalOK();
    }
  };

  const onRead = (e: BarCodeReadEvent) => {
    const scandata = e.data.trim();

    validateAddress(scandata);
  };

  const doCancel = () => {
    closeModalCancel();
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
