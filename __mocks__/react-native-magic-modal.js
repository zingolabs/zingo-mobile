import { View } from 'react-native';
import React from 'react';

export const useMagicModal = jest.fn(() => ({
  hide: jest.fn(),
}));

export const magicModal = {
  show: jest.fn(),
  hide: jest.fn(),
  hideAll: jest.fn(),
  enableFullWindowOverlay: jest.fn(),
  disableFullWindowOverlay: jest.fn(),
};

export const MagicModalPortal = () => <View />;
