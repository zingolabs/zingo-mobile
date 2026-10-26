import React from 'react';
import { TextStyle } from 'react-native';
import Text from './Text';

type BoldTextProps = {
  style?: TextStyle;
  // Nodes, not just strings: an icon that belongs beside the last word has to
  // flow with the text, which only works inside the same Text.
  children: React.ReactNode;
  testID?: string;
  selectable?: boolean;
  numberOfLines?: number;
};

/** `Text` in its `bodyStrong` style. */
const BoldText: React.FunctionComponent<BoldTextProps> = props => (
  <Text variant="bodyStrong" {...props} />
);

export default BoldText;
