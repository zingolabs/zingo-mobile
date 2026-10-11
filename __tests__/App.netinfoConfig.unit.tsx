import 'react-native';
import NetInfo from '@react-native-community/netinfo';

import '@app/App';

test('Tests that the app turns off NetInfo’s own reachability requests', () => {
  expect(NetInfo.configure).toHaveBeenCalledWith(
    expect.objectContaining({ reachabilityShouldRun: expect.any(Function) }),
  );
  const { reachabilityShouldRun } = (NetInfo.configure as jest.Mock).mock
    .calls[0][0];
  expect(reachabilityShouldRun()).toBe(false);
});
