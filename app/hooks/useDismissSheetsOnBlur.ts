import { useCallback } from 'react';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { useBottomSheetModal } from '@gorhom/bottom-sheet';
import { RouteEnum } from '@app/AppState';

const scannerRoutes: string[] = [
  RouteEnum.ScannerAddress,
  RouteEnum.ScannerUfvk,
];

const rootRouteName = (navigation: NavigationProp<ParamListBase>) => {
  let root = navigation;
  for (let parent = root.getParent(); parent; parent = root.getParent()) {
    root = parent;
  }
  const state = root.getState();
  return state.routes[state.index].name;
};

/**
 * Dismisses every open BottomSheetModal when the calling screen loses focus
 * (hardware back, iOS edge-swipe, tab switch, drawer open). BottomSheetModal
 * content is portaled under the global BottomSheetModalProvider, so it does
 * not unmount with the screen — without this hook a modal stays visible on
 * top of the next screen. The scanner routes are exempt: they open over the
 * sheet that asked for the scan, and that sheet takes the scanned value back.
 */
export function useDismissSheetsOnBlur() {
  const { dismissAll } = useBottomSheetModal();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (scannerRoutes.includes(rootRouteName(navigation))) {
          return;
        }
        dismissAll();
      };
    }, [dismissAll, navigation]),
  );
}
