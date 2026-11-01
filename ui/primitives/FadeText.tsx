import React from 'react';
import { TextStyle } from 'react-native';
import Text from './Text';

type FadeTextProps = {
  style?: TextStyle;
  children: string | string[];
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  selectable?: boolean;
  testID?: string;
};

/** `Text` in the `muted` tone. Opacity would give a different gray on each ground. */
const FadeText: React.FunctionComponent<FadeTextProps> = props => (
  <Text variant="body" tone="muted" {...props} />
);

export default FadeText;
