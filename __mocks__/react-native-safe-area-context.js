export const SafeAreaProvider = ({ children }) => children;
export const SafeAreaView = ({ children }) => children;
export const useSafeAreaInsets = () => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});
export const useSafeAreaFrame = () => ({ x: 0, y: 0, width: 0, height: 0 });
