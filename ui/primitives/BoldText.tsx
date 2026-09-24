import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@app/theme';

type BoldTextProps = {
  style?: TextStyle;
  // Nodes, not just strings: an icon that belongs beside the last word has to
  // flow with the text, which only works inside the same Text.
  children: React.ReactNode;
  testID?: string;
  selectable?: boolean;
  numberOfLines?: number;
};

const BoldText: React.FunctionComponent<BoldTextProps> = ({
  style,
  children,
  testID,
  selectable,
  numberOfLines,
}) => {
  const { colors } = useTheme();
  const totalStyle: TextStyle = {
    color: colors.fgDefault,
    fontSize: 16,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style,
  };

  return (
    <Text
      testID={testID}
      style={totalStyle}
      selectable={selectable}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

export default BoldText;
