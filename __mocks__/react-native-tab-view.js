import React from 'react';
import { View } from 'react-native';

const Passthrough = ({ children, ...props }) => (
  <View {...props}>{children}</View>
);

export const TabView = Passthrough;
export const TabBar = Passthrough;
export const SceneMap = () => () => null;
