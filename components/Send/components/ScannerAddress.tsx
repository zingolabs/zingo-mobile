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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Code } from 'react-native-vision-camera';
import { useMagicModal } from 'react-native-magic-modal';
import { View } from 'react-native';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';

type ScannerAddressProps = {
  setAddress: (address: string) => void;
};

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({ setAddress }) => {
  const context = useContext(ContextAppLoaded);
  const { translate, server, language, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { hide } = useMagicModal();
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);
  const { clear } = useToast();

  const validateAddress = async (scannedAddress: string) => {
    if (scannedAddress.toLowerCase().startsWith(GlobalConst.zcash)) {
      setAddress(scannedAddress);
      hide();
      return;
    }

    const validAddress: { isValid: boolean; onlyOrchardUA: string } = await Utils.isValidAddress(
      scannedAddress,
      server.chainName,
    );

    if (validAddress.isValid) {
      setAddress(scannedAddress);
      hide();
    }
  };

  const onRead = (codes: Code[]) => {
    const scandata = codes[0].value?.trim();

    if (!scandata) {
      return;
    }

    validateAddress(scandata);
  };

  return (
    <ToastProvider>
      <View
        style={{
          marginTop: top,
          marginBottom: bottom,
          marginRight: right,
          marginLeft: left,
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Snackbars
          snackbars={snackbars}
          removeFirstSnackbar={removeFirstSnackbar}
          translate={translate}
        />

        <Header
          title={translate('scanner.scanaddress') as string}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          closeScreen={() => {
            clear();
            hide();
          }}
        />
        <Scanner onRead={onRead} />
      </View>
    </ToastProvider>
  );
};

export default ScannerAddress;
