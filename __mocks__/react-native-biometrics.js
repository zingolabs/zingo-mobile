class MockReactNativeBiometrics {
  constructor(options) {
    this.allowDeviceCredentials = options.allowDeviceCredentials;
  }

  isSensorAvailable() {
    return Promise.resolve({ available: true, biometryType: 'TouchID' });
  }

  simplePrompt() {
    return Promise.resolve({ success: true });
  }

  createKeys() {
    return Promise.resolve({ publicKey: 'mockPublicKey' });
  }

  deleteKeys() {
    return Promise.resolve({ keysDeleted: true });
  }

  createSignature() {
    return Promise.resolve({ success: true, signature: 'mockSignature' });
  }
}

export default MockReactNativeBiometrics;
