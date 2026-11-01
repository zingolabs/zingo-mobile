import { StackActions } from '@react-navigation/native';
import { Route } from '@app/AppState';
import { leaveFlow } from '@app/navigation/navigate';

test('Tests that leaving a flow pops back to the home the stack holds when the flow ends', () => {
  const dispatch = jest.fn();
  const reset = jest.fn();

  leaveFlow({ dispatch, reset } as never);

  expect(dispatch).toHaveBeenCalledWith(StackActions.popTo(Route.Home));
  expect(reset).not.toHaveBeenCalled();
});
