/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { TextStyle } from 'react-native';
import Button from '../Button';
import { ButtonTypeEnum } from '../../../app/AppState';

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
      type={ButtonTypeEnum.Ghost}
      onPress={onPress ? onPress : () => console.log('onPress')}
      title={shortAddress}
      testID={testID}
      textStyle={{
        ...style,
        fontSize: 16,
        fontFamily: 'monospace',
      }}
    />
  );
};

export default Address;
