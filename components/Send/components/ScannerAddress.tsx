/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';

import { ContextAppLoaded } from '../../../app/context';
import Scanner from '../../Scanner';
import moment from 'moment';
import 'moment/locale/es';
import 'moment/locale/pt';
import 'moment/locale/ru';
import 'moment/locale/tr';
import { GlobalConst, RouteEnum, ScreenEnum } from '../../../app/AppState';
import Header from '../../Header';
import { useTheme } from '@react-navigation/native';
import { AppDrawerParamList, ThemeType } from '../../../app/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from 'react-native';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';

type ScannerAddressProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.ScannerAddress>;

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({ 
  navigation,
  route,
 }) => {
  const setAddress = !!route.params && route.params.setAddress !== undefined ? route.params.setAddress : () => {};
  const context = useContext(ContextAppLoaded);
  const { translate, language, snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
  const { top, bottom, right, left } = useSafeAreaInsets();
  moment.locale(language);
  const { clear } = useToast();
  const screenName = ScreenEnum.ScannerAddress;

  const [active, setActive] = useState<boolean>(
    !!route.params && route.params.active !== undefined ? route.params.active : false
  );

  useEffect(() => {
    const _active = 
      !!route.params && route.params.active !== undefined ? route.params.active : false;
    setActive(_active);
  }, [
    route, 
    route.params, 
    route.params?.active
  ]);

  const validateAddress = (scannedAddress: string) => {
    if (scannedAddress.toLowerCase().startsWith(GlobalConst.zcash)) {
      //console.log('valid QR URI');
      setAddress(scannedAddress);
    } else {
      //console.log('not valid QR URI, adding prefix zcash:');
      if (scannedAddress.toLowerCase().includes(':')) {
        setAddress(scannedAddress);
      } else {
        setAddress(GlobalConst.zcash + scannedAddress);
      }
    }
  };

  const onRead = async (scandata: string) => {
    if (!scandata) {
      return;
    }
    validateAddress(scandata);
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
            setActive(false);
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />
        <Scanner 
          active={active}
          onRead={onRead} 
          onClose={() => {
            clear();
            setActive(false);
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
        />
      </View>
    </ToastProvider>
  );
};

export default ScannerAddress;
