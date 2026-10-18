import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { GlobalConst } from '@app/AppState';
import { RootParamList, ScanAccepts } from '@app/types';
import { deliver } from '@app/navigation/results';
import { validateAddressForChain } from '@app/swap';
import Utils from '@app/utils';
import ScanOverlay from '@ui/widgets/ScanOverlay';

type ScannerProps = NativeStackScreenProps<RootParamList, 'Scanner'>;

const acceptsFor = (
  accepts: ScanAccepts,
): ((value: string) => boolean | Promise<boolean>) => {
  switch (accepts.kind) {
    case 'any':
      return () => true;
    case 'zcash':
      return async (value: string) => {
        const code = value.trim();
        return (
          code.toLowerCase().startsWith(GlobalConst.zcash) ||
          (await Utils.isValidAddress(code, accepts.chain)).isValid
        );
      };
    case 'chain':
      return (value: string) =>
        validateAddressForChain(accepts.chain, value, accepts.network);
  }
};

// The shared scanner over the whole app: it opens as a circle from the scan
// button that called it and delivers the accepted code to that caller.
const Scanner: React.FunctionComponent<ScannerProps> = ({
  navigation,
  route,
}) => {
  const { width, height } = useWindowDimensions();
  const params = route.params;
  // Nothing to read for: leave rather than sit on screen empty.
  useEffect(() => {
    if (!params && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [params, navigation]);
  if (!params) {
    return null;
  }
  return (
    <ScanOverlay
      testID="scanner"
      origin={params.origin ?? { x: width / 2, y: height / 2 }}
      texts={params.texts}
      accepts={acceptsFor(params.accepts)}
      onRead={value => deliver(params.request, value.trim())}
      onClosed={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
    />
  );
};

export default Scanner;
