import 'react-native';
import React from 'react';

export const mockQRCode = jest.fn();
const mock = jest.fn().mockImplementation(() => {
  return <mockQRCode />;
});

export default mock;
