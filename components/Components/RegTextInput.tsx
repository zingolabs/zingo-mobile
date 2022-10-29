import React, { useState, useEffect } from 'react';
import { TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';

const RegTextInput: React.FunctionComponent<any> = props => {
  const { colors } = useTheme();

  // There's a real idiot bug in react native that prevents paste unless editable is set.
  // https://github.com/facebook/react-native/issues/20887#issuecomment-586405383
  const [editable, setEditable] = useState(false);

  useEffect(() => {
    setEditable(true);
  }, []);
  let arrayed = [];

  if (Array.isArray(props.style)) {
    arrayed = props.style.slice(0);
  } else if (props.style) {
    arrayed.push(props.style);
  }
  arrayed.push({ color: props.style.color || colors.text }, { fontWeight: '600' });

  return <TextInput {...props} style={arrayed} editable={editable} />;
};

export default RegTextInput;
