import 'react-native';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { useCodeScanner } from 'react-native-vision-camera';

import ScannerAddress from '@screens/ScannerAddress';
import { RouteEnum } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const texts = {
  title: 'title',
  hint: 'hint',
  miss: 'miss',
  found: 'found',
  back: 'back',
  torch: 'torch',
};

const mount = (accepts: (v: string) => boolean | Promise<boolean>) =>
  render(
    <ScannerAddress
      navigation={mockNavigation}
      route={{
        key: 'k',
        name: RouteEnum.ScannerAddress,
        params: { setAddress: jest.fn(), accepts, texts },
      }}
    />,
  );

// The camera reports one code, as vision-camera's scanner would.
const scan = async (value: string) => {
  const { onCodeScanned } = (useCodeScanner as jest.Mock).mock.calls.at(-1)[0];
  await act(async () => {
    await onCodeScanned([{ value }]);
  });
};

afterEach(() => jest.clearAllMocks());

test('Tests that a code the caller refuses says so and keeps the camera looking', async () => {
  const accepts = jest.fn(() => false);
  mount(accepts);
  expect(screen.getByText('hint')).toBeTruthy();

  await scan('not-an-address');

  expect(accepts).toHaveBeenCalledWith('not-an-address');
  expect(screen.getByText('miss')).toBeTruthy();
  expect(screen.queryByText('found')).toBeNull();
});

test('Tests that a code the caller accepts shows the generic found pill', async () => {
  const accepts = jest.fn(async () => true);
  mount(accepts);

  await scan('zcash:u1abc');

  expect(accepts).toHaveBeenCalledWith('zcash:u1abc');
  expect(screen.getByText('found')).toBeTruthy();
});
