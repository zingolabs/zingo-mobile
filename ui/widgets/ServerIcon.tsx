/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faDatabase } from '@fortawesome/free-solid-svg-icons';

import { useTheme } from '@app/theme';

type ServerIconProps = {
  // No internet turns the dot red, Offline grey; otherwise it is green.
  noInternet: boolean;
  offline: boolean;
  size?: number;
  // The surface behind the icon, for the ring that cuts the dot out.
  background?: string;
};

// The server icon: a database cylinder with a status dot.
const ServerIcon: React.FC<ServerIconProps> = ({
  noInternet,
  offline,
  size = 22,
  background,
}) => {
  const { colors } = useTheme();
  const dot = noInternet
    ? colors.fgDangerEmphasis
    : offline
      ? colors.fgMuted
      : colors.fgAccent;
  return (
    <View
      style={{
        width: size + 10,
        height: size + 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FontAwesomeIcon icon={faDatabase} color={colors.fgMuted} size={size} />
      <View
        testID="server.icon.dot"
        style={{
          position: 'absolute',
          right: 2,
          bottom: 3,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dot,
          borderWidth: 2,
          borderColor: background ?? colors.bgCanvas,
        }}
      />
    </View>
  );
};

export default ServerIcon;
