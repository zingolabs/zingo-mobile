import Clipboard from '@react-native-clipboard/clipboard';
import React from 'react';
import { Pressable } from 'react-native';

type CopyableProps = {
  value: string;
  onCopy?: () => void;
  children: React.ReactNode;
}

const Copyable: React.FunctionComponent<CopyableProps> = ({
  value,
  onCopy,
  children,
}) => {
  const doCopy = () => {
    Clipboard.setString(value);
    if (onCopy) {
      onCopy();
    }
  };

  return <Pressable onPress={doCopy}>{children}</Pressable>;
};

export default Copyable;
