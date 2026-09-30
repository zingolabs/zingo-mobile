import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

// The installed v5 BottomSheetModal's lifecycle: present() mounts the content
// inside a requestAnimationFrame, a present() during the close animation is
// dropped, and the content unmounts when the close animation ends.
const CLOSE_ANIMATION_MS = 250;

const BottomSheet = ({ children }) => <>{children}</>;
const BottomSheetModal = forwardRef(function BottomSheetModal(
  { children, onDismiss },
  ref,
) {
  const [mounted, setMounted] = useState(false);
  const closing = useRef(undefined);
  useEffect(() => () => clearTimeout(closing.current), []);
  useImperativeHandle(ref, () => ({
    present: () => {
      if (closing.current !== undefined) {
        return;
      }
      requestAnimationFrame(() => setMounted(true));
    },
    dismiss: () => {
      if (!mounted || closing.current !== undefined) {
        return;
      }
      closing.current = setTimeout(() => {
        closing.current = undefined;
        setMounted(false);
        onDismiss?.();
      }, CLOSE_ANIMATION_MS);
    },
  }));
  return mounted ? <>{children}</> : null;
});
const BottomSheetView = ({ children }) => <>{children}</>;
const BottomSheetScrollView = ({ children }) => <>{children}</>;
const BottomSheetBackdrop = ({ children }) => <>{children}</>;
const BottomSheetFooter = ({ children }) => <>{children}</>;
const BottomSheetModalProvider = ({ children }) => <>{children}</>;

const useBottomSheetModal = () => ({
  dismiss: () => false,
  dismissAll: () => {},
});

export default BottomSheet;
export {
  CLOSE_ANIMATION_MS,
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModalProvider,
  useBottomSheetModal,
};
