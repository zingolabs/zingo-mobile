import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

// The installed v5 BottomSheetModal's lifecycle: present() mounts the content
// inside a requestAnimationFrame, a present() during the close animation is
// dropped, the content unmounts when the close animation ends, and
// onAnimate reports the open (-1 to 0) and the close (0 to -1) as they start,
// and onChange reports the index the sheet settles at. snapToIndex(0) during
// a close models a caught sheet: the close stops and the sheet settles open.
// The provider's sheet queue follows the library too: present() enqueues the
// sheet inside its frame, and only a sheet whose content mounted leaves the
// queue when it unmounts.
const CLOSE_ANIMATION_MS = 250;

// The provider's queue of presented sheets, by instance key.
const sheetsQueue = [];
// The live handles, by instance key, for tests that drive a sheet directly.
const sheetHandles = new Map();
let nextSheetKey = 0;

const BottomSheet = ({ children }) => <>{children}</>;
const BottomSheetModal = forwardRef(function BottomSheetModal(
  { children, onDismiss, onAnimate, onChange },
  ref,
) {
  const [mounted, setMounted] = useState(false);
  const closing = useRef(undefined);
  const key = useRef(undefined);
  if (key.current === undefined) {
    nextSheetKey += 1;
    key.current = nextSheetKey;
  }
  const everMounted = useRef(false);
  everMounted.current = everMounted.current || mounted;
  useEffect(
    () => () => {
      clearTimeout(closing.current);
      sheetHandles.delete(key.current);
      if (everMounted.current) {
        const at = sheetsQueue.indexOf(key.current);
        if (at !== -1) {
          sheetsQueue.splice(at, 1);
        }
      }
    },
    [],
  );
  const handle = {
    snapToIndex: index => {
      if (index < 0 || closing.current === undefined) {
        return;
      }
      clearTimeout(closing.current);
      closing.current = undefined;
      onAnimate?.(-1, index);
      onChange?.(index);
    },
    present: () => {
      if (closing.current !== undefined) {
        return;
      }
      requestAnimationFrame(() => {
        if (!sheetsQueue.includes(key.current)) {
          sheetsQueue.push(key.current);
        }
        setMounted(true);
        onAnimate?.(-1, 0);
        onChange?.(0);
      });
    },
    dismiss: () => {
      if (!mounted || closing.current !== undefined) {
        return;
      }
      onAnimate?.(0, -1);
      closing.current = setTimeout(() => {
        closing.current = undefined;
        const at = sheetsQueue.indexOf(key.current);
        if (at !== -1) {
          sheetsQueue.splice(at, 1);
        }
        setMounted(false);
        onChange?.(-1);
        onDismiss?.();
      }, CLOSE_ANIMATION_MS);
    },
  };
  sheetHandles.set(key.current, handle);
  useImperativeHandle(ref, () => handle);
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
  sheetsQueue,
  sheetHandles,
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModalProvider,
  useBottomSheetModal,
};
