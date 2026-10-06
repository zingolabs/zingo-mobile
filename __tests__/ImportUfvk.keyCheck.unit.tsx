import 'react-native';
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import ImportUfvk from '@screens/ImportUfvk';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import { ChainNameEnum, remoteServer } from '@app/AppState';

const mockedCheckUfvk = jest.fn();

jest.mock('@app/walletBackend/utils/walletUtils', () => ({
  ...jest.requireActual('@app/walletBackend/utils/walletUtils'),
  checkUfvk: (...args: unknown[]) => mockedCheckUfvk(...args),
  getLatestBlockServerInfo: jest
    .fn()
    .mockResolvedValue({ ok: true, value: '3000000' }),
}));

const mount = () =>
  render(
    <ContextAppLoadingProvider
      value={{
        ...defaultAppContextLoading,
        translate: (key: string) => key,
        server: remoteServer(
          'https://zec.rocks:443',
          ChainNameEnum.mainChainName,
        ),
      }}
    >
      <ImportUfvk
        busy={false}
        onClickCancel={jest.fn()}
        onClickOK={jest.fn()}
      />
    </ContextAppLoadingProvider>,
  );

const pasteKey = async (key: string) => {
  fireEvent.changeText(screen.getByTestId('import.seedufvkinput'), key);
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

test('Tests that a pasted key the decoder rejects is reported in the field', async () => {
  mockedCheckUfvk.mockResolvedValue({ kind: 'invalid' });
  mount();
  await pasteKey('uview1broken');
  await waitFor(() =>
    expect(
      screen.getByTestId('import.seedufvkinput.error').props.children,
    ).toBe('import.key-invalid'),
  );
  expect(mockedCheckUfvk).toHaveBeenCalledWith('uview1broken');
});

test('Tests that a key for another network names both networks', async () => {
  mockedCheckUfvk.mockResolvedValue({
    kind: 'ufvk',
    chainName: ChainNameEnum.testChainName,
  });
  mount();
  await pasteKey('uviewtest1abc');
  await waitFor(() =>
    expect(
      screen.getByTestId('import.seedufvkinput.error').props.children,
    ).toBe('import.key-wrong-chain'),
  );
});

test('Tests that a valid key for the selected network shows no error', async () => {
  mockedCheckUfvk.mockResolvedValue({
    kind: 'ufvk',
    chainName: ChainNameEnum.mainChainName,
  });
  mount();
  await pasteKey('uview1good');
  await waitFor(() => expect(mockedCheckUfvk).toHaveBeenCalled());
  expect(screen.queryByTestId('import.seedufvkinput.error')).toBeNull();
});
