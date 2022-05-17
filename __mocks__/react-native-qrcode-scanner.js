import 'react-native';
import React from 'react';

export const mockQRCodeScanner = jest.fn();
const mock = jest.fn().mockImplementation(() => {
  return <mockQRCodeScanner />;
});

export default mock;
