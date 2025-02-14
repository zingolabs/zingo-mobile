/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';

import { ContextAppLoaded } from '../../../app/context';
import Scanner from '../../Components/Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import { GlobalConst } from '../../../app/AppState';
import Utils from '../../../app/utils';
import Header from '../../Header';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Code } from 'react-native-vision-camera';

type ScannerAddressProps = {
  setAddress: (address: string) => void;
  closeModal: () => void;
};

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({ setAddress, closeModal }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, language } = context;
  const { colors } = useTheme() as unknown as ThemeType;
  moment.locale(language);

  const validateAddress = async (scannedAddress: string) => {
    if (scannedAddress.toLowerCase().startsWith(GlobalConst.zcash)) {
      setAddress(scannedAddress);
      closeModal();
      return;
    }

    const validAddress: { isValid: boolean; onlyOrchardUA: string } = await Utils.isValidAddress(
      scannedAddress,
      server.chainName,
    );

    if (validAddress.isValid) {
      setAddress(scannedAddress);
      closeModal();
    }
  };

  const onRead = (codes: Code[]) => {
    const scandata = codes[0].value?.trim();

    if (!scandata) {
      return;
    }

    validateAddress(scandata);
  };

  const doCancel = () => {
    closeModal();
  };

  return (
    <SafeAreaView
      style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        height: '100%',
        backgroundColor: colors.background,
      }}>
      <Header
        title={translate('scanner.scanaddress') as string}
        noBalance={true}
        noSyncingStatus={true}
        noDrawMenu={true}
        noPrivacy={true}
        closeScreen={doCancel}
      />
      <Scanner onRead={onRead} />
    </SafeAreaView>
  );
};

export default ScannerAddress;
