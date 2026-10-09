export const useScrollToTop = jest.fn();
export const useIsFocused = jest.fn();
export const useNavigation = jest.fn();
export const useFocusEffect = jest.fn();
export const useNavigationBuilder = jest.fn();
export const StackRouter = jest.fn();
export const StackActions = {
  popTo: jest.fn(name => ({ type: 'POP_TO', payload: { name } })),
  popToTop: jest.fn(() => ({ type: 'POP_TO_TOP' })),
};

export const NavigationContainer = ({ children }) => children;

// A custom navigator renders as a string, like the native-stack mock.
export const createNavigatorFactory = jest.fn(() => () => ({
  Navigator: 'MockedNavigator',
  Screen: 'MockedScreen',
  Group: 'MockedGroup',
}));

export const createNavigationContainerRef = jest.fn(() => {
  const listeners = new Map();

  const refImpl = {
    // API commonly used desde helpers externos
    isReady: jest.fn(() => true),
    getRootState: jest.fn(),
    getCurrentRoute: jest.fn(),
    canGoBack: jest.fn(),
    navigate: jest.fn(),
    resetRoot: jest.fn(),
    dispatch: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),

    addListener: jest.fn((type, cb) => {
      listeners.set(cb, { type, cb });
      return () => listeners.delete(cb);
    }),
    removeListener: jest.fn((type, cb) => {
      listeners.delete(cb);
    }),

    // compatibilidad con uso: navigationRef.current?.XYZ
    current: null,
  };

  refImpl.current = refImpl;
  return refImpl;
});
