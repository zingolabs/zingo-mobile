import 'react-native';
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { useCodeScanner } from 'react-native-vision-camera';

import Scanner from '@screens/Scanner';
import { ChainNameEnum, Route } from '@app/AppState';
import { ScanAccepts } from '@app/types';
import { useResult } from '@app/navigation/results';
import Utils from '@app/utils';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const texts = {
  title: 'title',
  hint: 'hint',
  miss: 'miss',
  found: 'found',
  back: 'back',
  torch: 'torch',
};

// A caller waiting for the code, as Send does.
const Asker: React.FC<{ onCode: (value: string) => void }> = ({ onCode }) => {
  useResult('send.address', onCode);
  return null;
};

const mount = (accepts: ScanAccepts, onCode = jest.fn()) =>
  render(
    <>
      <Asker onCode={onCode} />
      <Scanner
        navigation={mockNavigation}
        route={{
          key: 'k',
          name: Route.Scanner,
          params: { request: 'send.address', accepts, texts },
        }}
      />
    </>,
  );

// The camera reports one code, as vision-camera's scanner would.
const scan = async (value: string) => {
  const { onCodeScanned } = (useCodeScanner as jest.Mock).mock.calls.at(-1)[0];
  await act(async () => {
    await onCodeScanned([{ value }]);
  });
};

afterEach(() => jest.clearAllMocks());

test('Tests that a code the scan kind refuses says so, keeps the camera looking, and delivers nothing', async () => {
  const isValid = jest
    .spyOn(Utils, 'isValidAddress')
    .mockResolvedValue({ isValid: false, shieldedOnlyUA: '' });
  const onCode = jest.fn();
  mount({ kind: 'zcash', chain: ChainNameEnum.mainChainName }, onCode);
  expect(screen.getByText('hint')).toBeTruthy();

  await scan('not-an-address');

  expect(isValid).toHaveBeenCalledWith(
    'not-an-address',
    ChainNameEnum.mainChainName,
  );
  expect(screen.getByText('miss')).toBeTruthy();
  expect(screen.queryByText('found')).toBeNull();
  expect(onCode).not.toHaveBeenCalled();
});

// The code itself is delivered once the reveal has closed, which only the
// device drives.
test('Tests that a code the scan kind accepts shows the found pill', async () => {
  mount({ kind: 'any' });

  await scan('zcash:u1abc');

  expect(screen.getByText('found')).toBeTruthy();
});
