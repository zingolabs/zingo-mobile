/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../theme';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import Scanner from '@ui/widgets/Scanner';
import { RouteEnum } from '../../AppState';
import { AppStackParamList } from '../../types';

type ScannerUfvkProps = NativeStackScreenProps<
  AppStackParamList,
  RouteEnum.ScannerUfvk
>;

const ScannerUfvk: React.FunctionComponent<ScannerUfvkProps> = ({
  navigation,
  route,
}) => {
  const setUfvkText =
    !!route.params && route.params.setUfvkText !== undefined
      ? route.params.setUfvkText
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

  const onRead = async (scandata: string) => {
    if (!scandata) {
      return;
    }
    setUfvkText(scandata);
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

export default ScannerUfvk;
