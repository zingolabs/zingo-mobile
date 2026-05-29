/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import Scanner from '../../Scanner';
import { GlobalConst, RouteEnum } from '../../../app/AppState';
import { AppDrawerParamList, ThemeType } from '../../../app/types';
import { DrawerScreenProps } from '@react-navigation/drawer';

type ScannerAddressProps = DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.ScannerAddress
>;

const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({
  navigation,
  route,
}) => {
  const setAddress =
    !!route.params && route.params.setAddress !== undefined
      ? route.params.setAddress
      : () => {};
  const { colors } = useTheme() as ThemeType;

  const [active, setActive] = useState<boolean>(
    !!route.params && route.params.active !== undefined
      ? route.params.active
      : false,
  );

  useEffect(() => {
    const _active =
      !!route.params && route.params.active !== undefined
        ? route.params.active
        : false;
    setActive(_active);
  }, [route, route.params, route.params?.active]);

  const validateAddress = (scannedAddress: string) => {
    if (scannedAddress.toLowerCase().startsWith(GlobalConst.zcash)) {
      setAddress(scannedAddress);
    } else if (scannedAddress.toLowerCase().includes(':')) {
      setAddress(scannedAddress);
    } else {
      setAddress(GlobalConst.zcash + scannedAddress);
    }
  };

  const onRead = async (scandata: string) => {
    if (!scandata) {
      return;
    }
    validateAddress(scandata);
  };

  const onCloseScreen = () => {
    setActive(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <Scanner active={active} onRead={onRead} onClose={onCloseScreen} />
      <Pressable
        onPress={onCloseScreen}
        hitSlop={12}
        style={{
          position: 'absolute',
          top: 32,
          right: 32,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel="Close scanner"
        accessibilityRole="button"
      >
        <FontAwesomeIcon icon={faXmark} size={22} color={'#FFFFFF'} />
      </Pressable>
    </View>
  );
};

export default ScannerAddress;
