import React from 'react';
import { useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RouteEnum } from '@app/AppState';
import { AppStackParamList } from '@app/types';
import ScanOverlay from '@ui/widgets/ScanOverlay';

type ScannerAddressProps = NativeStackScreenProps<
  AppStackParamList,
  RouteEnum.ScannerAddress
>;

// The shared scanner over the whole app: it opens as a circle from the scan
// button that called it and hands the accepted code back to that caller.
const ScannerAddress: React.FunctionComponent<ScannerAddressProps> = ({
  navigation,
  route,
}) => {
  const { width, height } = useWindowDimensions();
  const params = route.params;
  if (!params) {
    return null;
  }
  return (
    <ScanOverlay
      testID="scanner"
      origin={params.origin ?? { x: width / 2, y: height / 2 }}
      texts={params.texts}
      accepts={params.accepts}
      onRead={params.setAddress}
      onClosed={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
    />
  );
};

export default ScannerAddress;
