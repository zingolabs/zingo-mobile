import React from 'react';

const BottomSheet = ({ children }) => <>{children}</>;
/** A modal's methods, one spy each, shared by every mounted modal. */
export const sheetMethods = {
  present: jest.fn(),
  dismiss: jest.fn(),
  close: jest.fn(),
  forceClose: jest.fn(),
  expand: jest.fn(),
  collapse: jest.fn(),
  snapToIndex: jest.fn(),
  snapToPosition: jest.fn(),
};
const BottomSheetModal = React.forwardRef(({ children }, ref) => {
  React.useImperativeHandle(ref, () => sheetMethods);
  return <>{children}</>;
});
const BottomSheetView = ({ children }) => <>{children}</>;
const BottomSheetScrollView = ({ children }) => <>{children}</>;
const BottomSheetBackdrop = ({ children }) => <>{children}</>;
const BottomSheetFooter = ({ children }) => <>{children}</>;
const BottomSheetModalProvider = ({ children }) => <>{children}</>;

/** SheetScrollView reports its height through the sheet's layout state. */
const useBottomSheetInternal = () => ({
  animatedLayoutState: { modify: () => {} },
});

const useBottomSheetModal = () => ({
  dismiss: () => false,
  dismissAll: () => {},
});

export default BottomSheet;
export {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModalProvider,
  useBottomSheetModal,
  useBottomSheetInternal,
};
