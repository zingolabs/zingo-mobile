import React, { useContext } from 'react';

import { ContextAppLoaded } from '../../../app/context';
import { BarCodeReadEvent } from 'react-native-camera';
import Scanner from '../../Components/Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { GlobalConst } from '../../../app/AppState';
import Utils from '../../../app/utils';

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

    const validAddress: boolean = await Utils.isValidAddress(scannedAddress, server.chainName);

    if (validAddress) {
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
