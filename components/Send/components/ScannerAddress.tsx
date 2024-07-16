import React, { useContext } from 'react';

import RPCModule from '../../../app/RPCModule';
import { ContextAppLoaded } from '../../../app/context';
import { BarCodeReadEvent } from 'react-native-camera';
import { RPCParseAddressType } from '../../../app/rpc/types/RPCParseAddressType';
import Scanner from '../../Components/Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { CommandEnum, GlobalConst } from '../../../app/AppState';
import { RPCParseStatusEnum } from '../../../app/rpc/enums/RPCParseStatusEnum';

type ScannerAddressProps = {
  setAddress: (address: string) => void;
  closeModal: () => void;
};

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({ setAddress, closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, netInfo, server, addLastSnackbar, language } = context;
  moment.locale(language);

  const validateAddress = async (scannedAddress: string) => {
    if (!netInfo.isConnected) {
      addLastSnackbar({ message: translate('loadedapp.connection-error') as string });
      return;
    }
    if (scannedAddress.toLowerCase().startsWith(GlobalConst.zcash)) {
      setAddress(scannedAddress);
      closeModal();
      return;
    }

    const result: string = await RPCModule.execute(CommandEnum.parseAddress, scannedAddress);
    if (result) {
      if (result.toLowerCase().startsWith(GlobalConst.error) || result.toLowerCase() === 'null') {
        addLastSnackbar({ message: translate('scanner.nozcash-error') as string });
        return;
      }
    } else {
      addLastSnackbar({ message: translate('scanner.nozcash-error') as string });
      return;
    }
    let resultJSON = {} as RPCParseAddressType;
    try {
      resultJSON = await JSON.parse(result);
    } catch (e) {
      addLastSnackbar({ message: translate('scanner.nozcash-error') as string });
      return;
    }

    //console.log('parse-1', scannedAddress, resultJSON);

    const valid = resultJSON.status === RPCParseStatusEnum.successParse && server.chainName === resultJSON.chain_name;

    if (valid) {
      setAddress(scannedAddress);
      closeModal();
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
