/* eslint-disable react-native/no-inline-styles */
import React, { useContext, useEffect, useState } from 'react';

import { ContextAppLoaded } from '../../../app/context';
import Scanner from '../../Scanner';
import { GlobalConst, RouteEnum, ScreenEnum } from '../../../app/AppState';
import { useTheme } from '@react-navigation/native';
import { AppDrawerParamList, ThemeType } from '../../../app/types';

import { TouchableOpacity, View } from 'react-native';
import Snackbars from '../../Components/Snackbars';
import { ToastProvider, useToast } from 'react-native-toastier';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

type ScannerAddressProps = DrawerScreenProps<AppDrawerParamList, RouteEnum.ScannerAddress>;

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({ 
  navigation,
  route,
 }) => {
  const setAddress = !!route.params && route.params.setAddress !== undefined ? route.params.setAddress : () => {};
  const context = useContext(ContextAppLoaded);
  const { snackbars, removeFirstSnackbar } = context;
  const { colors } = useTheme()  as ThemeType;
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

  const onCloseScreen = () => {
    clear();
    setActive(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <ToastProvider>
      <Snackbars
        snackbars={snackbars}
        removeFirstSnackbar={removeFirstSnackbar}
        screenName={screenName}
      />

      <View style={{
        position: 'absolute',
        width: 75,
        top: 10,
        left: 10,
        zIndex: 999,
      }}>
        <View
          style={{
            borderRadius: 25,
            borderColor: colors.text,
            borderWidth: 1,
            padding: 10,
            margin: 10,
            backgroundColor: colors.background,
          }}>
            <TouchableOpacity onPress={() => {
              clear();
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}>
              <FontAwesomeIcon
                size={30}
                icon={faChevronLeft}
                color={colors.text}
              />
            </TouchableOpacity>
        </View>
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}>
        <Scanner 
          active={active}
          onRead={onRead} 
          onClose={() => onCloseScreen()}
        />
      </View>
    </ToastProvider>
  );
};

export default ScannerAddress;
