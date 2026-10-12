/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { Platform, Text, View } from 'react-native';

import { useTheme } from '@app/theme';
import { ContextAppLoaded } from '@app/context';
import { SIDE } from '@screens/SeedBackup/components/StepParts';
import KeyQr from './KeyQr';

const HEAD = 12;
const TAIL = 8;

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const masked = (key: string) => `${key.slice(0, 6)}••••••…••••••••`;
const truncated = (key: string) =>
  key.length > HEAD + TAIL ? `${key.slice(0, HEAD)}…${key.slice(-TAIL)}` : key;

type KeyCardProps = {
  testID: string;
  value: string;
  hidden: boolean;
  qrSize: number;
};

// The viewing key as a QR and its two ends, both veiled while hidden.
const KeyCard: React.FunctionComponent<KeyCardProps> = ({
  testID,
  value,
  hidden,
  qrSize,
}) => {
  const { translate } = useContext(ContextAppLoaded);
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        marginHorizontal: SIDE,
        paddingVertical: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: colors.bgSurface,
      }}
    >
      {!!value && <KeyQr value={value} size={qrSize} hidden={hidden} />}
      <Text
        style={{
          color: colors.fgMuted,
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0.6,
          marginTop: 14,
        }}
      >
        {translate('viewingkey.label') as string}
      </Text>
      <Text
        testID={`${testID}.key`}
        selectable={false}
        style={{
          color: colors.fgDefault,
          fontFamily: MONO,
          fontSize: 14,
          fontWeight: '500',
          marginTop: 4,
        }}
      >
        {value ? (hidden ? masked(value) : truncated(value)) : ''}
      </Text>
    </View>
  );
};

export default KeyCard;
