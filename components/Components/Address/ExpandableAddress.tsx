import React from 'react';
import { TextStyle } from 'react-native';
import { Expandable } from '../Primitives/Expandable';
import { Address } from './Address';

interface ExpandableAddressProps {
  address: string;
  style?: TextStyle;
  onExpand?: () => void;
}

export function ExpandableAddress({ address, style, onExpand }: ExpandableAddressProps) {
  return (
    <Expandable
      short={<Address address={address} style={style} />}
      full={<Address address={address} startLength={address.length} endLength={0} style={style} />}
    />
  );
}
