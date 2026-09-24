/**
 * The blur rule for portaled sheets: every sheet closes when its screen
 * loses focus, except when the loss comes from a scanner opening over it.
 */
const mockDismissAll = jest.fn();

jest.mock('@gorhom/bottom-sheet', () => ({
  useBottomSheetModal: () => ({ dismissAll: mockDismissAll }),
}));

import { renderHook } from '@testing-library/react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDismissSheetsOnBlur } from '@app/hooks/useDismissSheetsOnBlur';
import { RouteEnum } from '@app/AppState';

const blurTo = (route: RouteEnum) => {
  jest.mocked(useNavigation).mockReturnValue({
    getParent: () => undefined,
    getState: () => ({ index: 0, routes: [{ name: route }] }),
  } as unknown as ReturnType<typeof useNavigation>);

  let onBlur = () => {};
  jest.mocked(useFocusEffect).mockImplementation(effect => {
    const cleanup = effect();
    if (cleanup) {
      onBlur = cleanup;
    }
  });

  renderHook(() => useDismissSheetsOnBlur());
  onBlur();
};

beforeEach(() => {
  mockDismissAll.mockReset();
});

test('Tests that the open sheets survive the blur when the scanner opens over them. The scanner hands the scanned value back to the sheet that asked for it.', () => {
  blurTo(RouteEnum.ScannerAddress);

  expect(mockDismissAll).not.toHaveBeenCalled();
});

test('Tests that the open sheets close when the blur comes from any other route.', () => {
  blurTo(RouteEnum.Send);

  expect(mockDismissAll).toHaveBeenCalled();
});
