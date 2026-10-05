import 'react-native';
import ZecAmount from '@ui/widgets/ZecAmount';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import Insight from '@screens/Insight';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { RouteEnum } from '@app/AppState';
import {
  getTotalValueToAddress,
  getTotalSpendsToAddress,
  getTotalMemobytesToAddress,
} from '@app/walletBackend';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('@app/walletBackend', () => ({
  getTotalValueToAddress: jest.fn(),
  getTotalSpendsToAddress: jest.fn(),
  getTotalMemobytesToAddress: jest.fn(),
}));

/* Public receiver fixture: https://github.com/zcash/zcash-test-vectors/blob/master/test-vectors/json/sapling_key_components.json */
const address =
  'zs17xwek7t788enw3zc88d5e54s4tz006uv5yclzet8c3z6j423ymfu98c5u0thd6zp4e6p2jumnna';
const metric = (
  amount: number,
): Awaited<ReturnType<typeof getTotalValueToAddress>> => ({
  ok: true,
  value: JSON.stringify({ [address]: amount, fee: 100000000 }),
});

function deferred<T>() {
  let release: (answer: T) => void = () => {};
  const promise = new Promise<T>(resolve => {
    release = resolve;
  });
  return { promise, release };
}

function setup() {
  const sent = deferred<ReturnType<typeof metric>>();
  jest.mocked(getTotalValueToAddress).mockReturnValueOnce(sent.promise);
  jest.mocked(getTotalSpendsToAddress).mockResolvedValue(metric(7));
  jest.mocked(getTotalMemobytesToAddress).mockResolvedValue(metric(17));
  const view = render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        info: mockInfo,
        totalBalance: mockTotalBalance,
        translate: key => key,
      }}
    >
      <Insight
        navigation={mockNavigation}
        route={{ key: 'fixture', name: RouteEnum.Insight, params: undefined }}
      />
    </ContextAppLoadedProvider>,
  );
  return { view, sent };
}

test('Tests that the loading indicator remains when an older response completes before the selected metric.', async () => {
  const { view, sent } = setup();
  const sends = deferred<ReturnType<typeof metric>>();
  jest.mocked(getTotalSpendsToAddress).mockReturnValueOnce(sends.promise);
  await act(async () => {
    fireEvent.press(view.getByText('insight.sends'));
  });
  expect(view.UNSAFE_queryAllByProps({ size: 'large' })).not.toHaveLength(0);
  await act(async () => {
    sent.release(metric(500000000));
  });
  expect(view.UNSAFE_queryAllByProps({ size: 'large' })).not.toHaveLength(0);
  await act(async () => {
    sends.release(metric(7));
  });
  expect(view.UNSAFE_queryAllByProps({ size: 'large' })).toHaveLength(0);
  expect(view.getByText('# 7insight.sends-unit')).toBeTruthy();
});

test('Tests that Sent includes fees in ZEC when its current response completes.', async () => {
  const { view, sent } = setup();
  await act(async () => {
    sent.release(metric(500000000));
  });
  expect(view.getByText('fee')).toBeTruthy();
  expect(
    view.UNSAFE_getAllByType(ZecAmount).map(amount => amount.props.amtZec),
  ).toEqual([1, 5]);
});

test.each<[string, number]>([
  ['sends', 7],
  ['memobytes', 17],
])(
  'Tests that the selected %s metric remains when a previous Sent response arrives later.',
  async (tab, count) => {
    const { view, sent } = setup();
    await act(async () => {
      fireEvent.press(view.getByText(`insight.${tab}`));
    });
    expect(view.getByText(`# ${count}insight.${tab}-unit`)).toBeTruthy();
    expect(view.queryByText('fee')).toBeNull();
    await act(async () => {
      sent.release(metric(500000000));
    });
    expect(view.getByText(`# ${count}insight.${tab}-unit`)).toBeTruthy();
    expect(view.queryByText('fee')).toBeNull();
  },
);

test.each<[string, number]>([
  ['sends', 7],
  ['memobytes', 17],
])(
  'Tests that the selected %s metric appears when the previous Sent response completed first.',
  async (tab, count) => {
    const { view, sent } = setup();
    await act(async () => {
      sent.release(metric(500000000));
    });
    await act(async () => {
      fireEvent.press(view.getByText(`insight.${tab}`));
    });
    expect(view.getByText(`# ${count}insight.${tab}-unit`)).toBeTruthy();
    expect(view.queryByText('fee')).toBeNull();
  },
);
