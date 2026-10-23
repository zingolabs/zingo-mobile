/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { View } from 'react-native';
import { space12 } from '@app/theme';

type ButtonStackProps = {
  /** The secondary actions first, the primary last: it shows on top. */
  children: React.ReactNode;
};

/**
 * Two actions, one above the other at the form's width, primary on top.
 * Always stacked, so no label length or text size changes the layout.
 */
const ButtonStack: React.FunctionComponent<ButtonStackProps> = ({
  children,
}) => (
  <View
    style={{
      flexDirection: 'column-reverse',
      gap: space12,
      alignSelf: 'stretch',
      flexGrow: 1,
    }}
  >
    {children}
  </View>
);

export default ButtonStack;
