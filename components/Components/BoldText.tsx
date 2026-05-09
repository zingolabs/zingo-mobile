import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@react-navigation/native';

type BoldTextProps = {
  style?: TextStyle;
  children: string | string[];
  testID?: string;
  selectable?: boolean;
};

const BoldText: React.FunctionComponent<BoldTextProps> = ({
  style,
  children,
  testID,
  selectable,
}) => {
  const { colors } = useTheme();
  const totalStyle: TextStyle = {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    opacity: 0.87,
    ...style,
  };

  return (
    <Text testID={testID} style={totalStyle} selectable={selectable}>
      {children}
    </Text>
  );
};

export default BoldText;
