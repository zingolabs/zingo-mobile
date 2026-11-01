import React from 'react';
import { textVariants } from '@app/theme';
import { Platform, TextStyle } from 'react-native';
import Button from '@ui/primitives/Button';

type AddressProps = {
  address: string;
  startLength?: number;
  endLength?: number;
  onPress?: () => void;
  style?: TextStyle;
  testID?: string;
};

const Address: React.FunctionComponent<AddressProps> = ({
  address,
  startLength = 10,
  endLength = 10,
  onPress,
  style,
  testID,
}) => {
  if (!address) {
    return null;
  }

  const shortAddress = `${address.slice(0, startLength)}...${address.slice(-endLength)}`;

  return (
    <Button
      inline
      variant="text"
      onPress={onPress ? onPress : () => console.log('onPress')}
      title={shortAddress}
      testID={testID}
      textStyle={{
        fontSize: textVariants.address.fontSize,
        lineHeight: textVariants.address.lineHeight,
        fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
        ...style,
      }}
    />
  );
};

export default Address;
