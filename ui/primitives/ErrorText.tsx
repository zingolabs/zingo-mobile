import React from 'react';
import { TextStyle } from 'react-native';
import Text from './Text';

type ErrorTextProps = {
  style?: TextStyle;
  children: string;
  testID?: string;
  selectable?: boolean;
};

/** `Text` in the `danger` tone, for the message under what failed. */
const ErrorText: React.FunctionComponent<ErrorTextProps> = props => (
  <Text variant="bodySmall" tone="danger" {...props} />
);

export default ErrorText;
