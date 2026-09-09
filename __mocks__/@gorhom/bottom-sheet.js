import React from 'react';

const BottomSheet = ({ children }) => <>{children}</>;
const BottomSheetModal = ({ children }) => <>{children}</>;
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
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModalProvider,
  useBottomSheetModal,
};
