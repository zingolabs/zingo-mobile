import React from 'react';
import { View } from 'react-native';

const ViewShot = ({ children }) => <View>{children}</View>;

ViewShot.captureRef = jest.fn(() => Promise.resolve('mocked-uri'));

export default ViewShot;
export const captureRef = jest.fn(() => Promise.resolve('mocked-uri'));
