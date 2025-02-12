// Simple mock for Camera
export const Camera = () => null;

// Mock that returns a mocked camera object
export const useCameraDevice = jest.fn(() => ({
  id: 'mocked-camera',
  name: 'Mock Camera',
  position: 'back',
}));

// Mock that returns permission status and a request function
export const useCameraPermission = jest.fn(() => ({
  hasPermission: true,
  requestPermission: jest.fn(),
}));

// Mock that provides a mocked scanner function
export const useCodeScanner = jest.fn(() => ({
  codeTypes: ['qr', 'ean-13'],
  onCodeScanned: jest.fn(),
}));
