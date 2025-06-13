import React from 'react';
import { TextStyle } from 'react-native';
import Address from './Address';
import Copyable from '../Primitives/Copyable';

type CopyableAddressProps = {
  address: string;
  style?: TextStyle;
  onCopy?: () => void;
}

const CopyableAddress: React.FunctionComponent<CopyableAddressProps> = ({
  address,
  style,
  onCopy,
}) => {
  return (
    <Copyable value={address} onCopy={onCopy}>
      <Address address={address} style={style} />
    </Copyable>
  );
};

export default CopyableAddress;
