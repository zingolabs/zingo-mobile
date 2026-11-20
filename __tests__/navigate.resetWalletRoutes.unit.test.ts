import { CommonActions } from '@react-navigation/native';
import { Route } from '@app/AppState';
import { navigationRef, resetWalletRoutes } from '@app/navigation/navigate';

test('Tests that the wallet section starts on Home when another wallet opens', () => {
  jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
  const dispatch = jest
    .spyOn(navigationRef, 'dispatch')
    .mockImplementation(() => {});

  resetWalletRoutes();

  expect(dispatch).toHaveBeenCalledWith(
    CommonActions.reset({ index: 0, routes: [{ name: Route.Wallet }] }),
  );
});
