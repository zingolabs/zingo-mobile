/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';

import { ContextAppLoaded } from '../../../app/context';
import Scanner from '../../Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { GlobalConst, ScreenEnum } from '../../../app/AppState';
import Utils from '../../../app/utils';
import Header from '../../Header';
import { useTheme } from '@react-navigation/native';
import { ThemeType } from '../../../app/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const screenName = ScreenEnum.ScannerAddress;

  const validateAddress = async (scannedAddress: string) => {
    if (scannedAddress.toLowerCase().startsWith(GlobalConst.zcash)) {
      //console.log('valid QR URI');
      setAddress(scannedAddress);
    } else {
      //console.log('not valid QR URI, adding prefix zcash:');
      setAddress(GlobalConst.zcash + scannedAddress);
    }
  };

  const onRead = async (scandata: string) => {
    if (!scandata) {
      return;
    }
    await validateAddress(scandata);
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View
        style={{
          marginTop: top,
          marginBottom: bottom,
          marginRight: right,
          marginLeft: left,
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Header
          title={translate('scanner.scanaddress') as string}
          screenName={screenName}
          noBalance={true}
          noSyncingStatus={true}
          noDrawMenu={true}
          noPrivacy={true}
          noUfvkIcon={true}
          closeScreen={() => {
            clear();
            hide();
          }}
        />
        <Scanner onRead={onRead} onClose={() => hide()} />
      </View>
    </ToastProvider>
  );
};

export default ScannerAddress;
