export const ACCESS_CONTROL = {
  BIOMETRY_CURRENT_SET: 'biometryCurrentSet',
};
export const ACCESSIBLE = {
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
};
export const AUTHENTICATION_TYPE = {
  BIOMETRICS: 'biometrics',
};
export const SECURITY_LEVEL = {
  SECURE_SOFTWARE: 'secureSoftware',
};
export const SECURITY_RULES = {
  NONE: 'none',
};
export const STORAGE_TYPE = {
  RSA: 'RSA',
  AES_GCM_NO_AUTH: 'AES_GCM_NO_AUTH',
};
export const setGenericPassword = jest.fn();
export const getGenericPassword = jest.fn();
export const resetGenericPassword = jest.fn();
export const getSupportedBiometryType = jest.fn();
export const hasGenericPassword = jest.fn();
export const canImplyAuthentication = jest.fn();
export const isPasscodeAuthAvailable = jest.fn();
