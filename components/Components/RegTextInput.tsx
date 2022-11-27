import React, { useState, useEffect } from 'react';
import { TextInput, View } from 'react-native';
import { useTheme } from '@react-navigation/native';

const RegTextInput: React.FunctionComponent<any> = ({ style, ...props }) => {
  const { colors } = useTheme();

  // There's a real idiot bug in react native that prevents paste unless editable is set.
  // https://github.com/facebook/react-native/issues/20887#issuecomment-586405383
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    setEditable(true);
  }, []);
  let arrayed = [];

  if (Array.isArray(style)) {
    arrayed = style.slice(0);
  } else if (style) {
    arrayed.push(style);
  }
  arrayed.push({ color: style.color || colors.text }, { fontWeight: '600' });

  return (
    <View accessible={true} accessibilityLabel={'Introduce a value!'} style={arrayed}>
      <TextInput {...props} editable={editable} />
    </View>
  );
};

export default RegTextInput;
