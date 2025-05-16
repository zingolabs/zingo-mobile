import React from 'react';
import { View } from 'react-native';

const Tooltip = ({ children }) => {
  return <View>{children}</View>; // Ignora el tooltip, pero muestra los hijos
};

export default Tooltip;
