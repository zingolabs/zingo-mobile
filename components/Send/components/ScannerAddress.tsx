/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../../app/theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

import Scanner from '../../Scanner';
import { GlobalConst, RouteEnum } from '../../../app/AppState';
import { AppStackParamList } from '../../../app/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type ScannerAddressProps = NativeStackScreenProps<
  AppStackParamList,
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
  const { colors } = useTheme();

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

  const raw =
    !!route.params && route.params.raw !== undefined ? route.params.raw : false;

  const validateAddress = (scannedAddress: string) => {
    if (raw) {
      // Non-Zcash scan (address book): hand back the string verbatim;
      // the caller validates it for its chain. No `zcash:` prefixing.
      setAddress(scannedAddress);
      return;
    }
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
        backgroundColor: colors.bgCanvas,
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
