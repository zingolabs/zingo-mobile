import React from 'react';
import { TextStyle } from 'react-native';
import Text from './Text';

type RegTextProps = {
  style?: TextStyle;
  color?: string;
  onPress?: () => void;
  testID?: string;
  children: string | string[];
  selectable?: boolean;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
};

/** `Text` in its `body` style. */
const RegText: React.FunctionComponent<RegTextProps> = props => (
  <Text variant="body" {...props} />
);

export default RegText;
