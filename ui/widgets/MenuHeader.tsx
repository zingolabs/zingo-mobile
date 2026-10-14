/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';

import { RouteEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { getZingoLogo } from '@app/utils/ZingoAppData';
import { viewPhase } from '@app/walletBackend/transforms/mixnetView';
import MixnetIcon from '@ui/primitives/Icons/MixnetIcon';

const HEIGHT = 34;

// The app header of a screen opened from the Options menu: the mixnet badge
// in the middle and the Zingo logo on the right, above the back row.
const MenuHeader: React.FunctionComponent = () => {
  const { translate, mixnetView } = useContext(ContextAppLoaded);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const phase = viewPhase(mixnetView);
  return (
    <View
      testID="menuheader"
      style={{ height: HEIGHT, alignItems: 'center', justifyContent: 'center' }}
    >
      {phase !== 'absent' && (
        <TouchableOpacity
          testID="menuheader.mixnet-status"
          accessibilityLabel={translate('settings.nym-diagnostics') as string}
          onPress={() => navigation.navigate(RouteEnum.MixnetDoctor)}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 5,
            minWidth: 25,
            minHeight: 25,
          }}
        >
          <MixnetIcon phase={phase} />
        </TouchableOpacity>
      )}
      <Image
        source={getZingoLogo()}
        style={{
          position: 'absolute',
          right: 16,
          top: 2,
          width: 30,
          height: 30,
          resizeMode: 'contain',
          borderRadius: 6,
        }}
      />
    </View>
  );
};

export default MenuHeader;
