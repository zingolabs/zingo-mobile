import React, { useContext } from 'react';
import { ContextAppLoading } from '../../../app/context';
import { BarCodeReadEvent } from 'react-native-camera';
import Scanner from '../../Components/Scanner';

type ScannerKeyProps = {
  setPrivKeyText: (k: string) => void;
  closeModal: () => void;
};
const ScannerKey: React.FunctionComponent<ScannerKeyProps> = ({ setPrivKeyText, closeModal }) => {
  const context = useContext(ContextAppLoading);
  const { translate } = context;

  const onRead = async (e: BarCodeReadEvent) => {
    const scandata = e.data.trim();

    setPrivKeyText(scandata);
    closeModal();
  };

  const doCancel = () => {
    closeModal();
  };

  return (
    <Scanner
      onRead={onRead}
      doCancel={doCancel}
      title={translate('scanner.text') as string}
      button={translate('cancel') as string}
    />
  );
};

export default ScannerKey;
