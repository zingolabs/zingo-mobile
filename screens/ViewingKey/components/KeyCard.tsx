/* eslint-disable react-native/no-inline-styles */
import React, { useContext } from 'react';
import { View } from 'react-native';

import { radiusMd, space4, space12, space16, useTheme } from '@app/theme';
import Text from '@ui/primitives/Text';
import { ContextAppLoaded } from '@app/context';
import { SIDE } from '@screens/SeedBackup/components/StepParts';
import KeyQr from './KeyQr';

const HEAD = 12;
const TAIL = 8;

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
        paddingVertical: space16,
        borderRadius: radiusMd,
        borderWidth: 1,
        borderColor: colors.bottomSheetBorder,
        backgroundColor: colors.bgSurface,
      }}
    >
      {!!value && <KeyQr value={value} size={qrSize} hidden={hidden} />}
      <Text
        variant="bodySmall"
        tone="muted"
        style={{ fontWeight: '600', marginTop: space12 }}
      >
        {translate('viewingkey.label') as string}
      </Text>
      <Text
        testID={`${testID}.key`}
        selectable={false}
        variant="address"
        style={{ marginTop: space4 }}
      >
        {value ? (hidden ? masked(value) : truncated(value)) : ''}
      </Text>
    </View>
  );
};

export default KeyCard;
