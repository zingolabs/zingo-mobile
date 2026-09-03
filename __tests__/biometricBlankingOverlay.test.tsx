/**
 * The Android blanking overlay: raised and dropped by the gate
 * controller's events, and dismissible by the person when a wedged
 * ceremony strands it with no prompt behind it.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { DeviceEventEmitter, Modal, Platform } from 'react-native';
import BiometricBlankingOverlay from '@app/BiometricBlankingOverlay';
import { BIOMETRIC_BLANKING_EVENT } from '@app/services/gateController';

test('hardware back dismisses a stranded blanking overlay', () => {
  const priorOS = Platform.OS;
  Platform.OS = 'android';
  try {
    const { UNSAFE_getByType, UNSAFE_queryByType } = render(
      <BiometricBlankingOverlay />,
    );
    act(() => {
      DeviceEventEmitter.emit(BIOMETRIC_BLANKING_EVENT, true);
    });
    const overlay = UNSAFE_getByType(Modal);

    act(() => {
      overlay.props.onRequestClose();
    });

    expect(UNSAFE_queryByType(Modal)).toBeNull();
  } finally {
    Platform.OS = priorOS;
  }
});
