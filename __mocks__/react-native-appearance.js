import 'react-native';
import React from 'react';

export const mockAppearanceProvider = jest.fn();
const mock = jest.fn().mockImplementation(() => {
  return <mockAppearanceProvider />;
});

export default mock;
