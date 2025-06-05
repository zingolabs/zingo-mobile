import React from 'react';
import { TextStyle, Alert } from 'react-native';
import { Address } from './Address';
import { Copyable } from '../Primitives/Copyable';

interface CopyableAddressProps {
  address: string;
  style?: TextStyle;
  onCopy?: () => void;
}

export function CopyableAddress({ address, style, onCopy }: CopyableAddressProps) {
  return (
    <Copyable value={address} onCopy={onCopy}>
      <Address address={address} style={style} />
    </Copyable>
  );
}
