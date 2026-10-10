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

const fieldError = () =>
  screen.queryByTestId('import.seedufvkinput.error')?.props.children;

test('Tests that a key the decoder rejects reads as incomplete only once typing pauses', async () => {
  mockedCheckUfvk.mockResolvedValue({ kind: 'invalid' });
  mount();
  await pasteKey('uview1qqqq');
  expect(mockedCheckUfvk).toHaveBeenCalledWith('uview1qqqq');
  expect(fieldError()).toBeUndefined();
  await act(async () => {
    jest.advanceTimersByTime(900);
  });
  expect(fieldError()).toBe('import.key-incomplete');
});

test('Tests that a character a key cannot hold is named at once', async () => {
  mockedCheckUfvk.mockResolvedValue({ kind: 'invalid' });
  mount();
  fireEvent.changeText(screen.getByTestId('import.seedufvkinput'), 'uview1qb');
  expect(fieldError()).toBe('import.key-char');
});

test('Tests that a key with the wrong start says how a key starts', async () => {
  mockedCheckUfvk.mockResolvedValue({ kind: 'invalid' });
  mount();
  fireEvent.changeText(screen.getByTestId('import.seedufvkinput'), 'uview2q');
  expect(fieldError()).toBe('import.key-prefix');
});

test('Tests that spaces and capitals typed into a key are dropped', async () => {
  mockedCheckUfvk.mockResolvedValue({ kind: 'invalid' });
  mount();
  await pasteKey('UVIEW1 QQ\nQQ');
  expect(mockedCheckUfvk).toHaveBeenCalledWith('uview1qqqq');
});

test('Tests that a key for another network names both networks', async () => {
  mockedCheckUfvk.mockResolvedValue({
    kind: 'ufvk',
    chainName: ChainNameEnum.testChainName,
  });
  mount();
  await pasteKey('uviewtest1qqq');
  await waitFor(() => expect(fieldError()).toBe('import.key-wrong-chain'));
});

test('Tests that a valid key for the selected network reads as valid', async () => {
  mockedCheckUfvk.mockResolvedValue({
    kind: 'ufvk',
    chainName: ChainNameEnum.mainChainName,
  });
  mount();
  await pasteKey('uview1qqqq');
  await waitFor(() => expect(mockedCheckUfvk).toHaveBeenCalled());
  expect(fieldError()).toBeUndefined();
  expect(screen.getByText('import.key-valid')).toBeTruthy();
});

test('Tests that the start of a viewing key asks to keep typing', () => {
  mount();
  fireEvent.changeText(screen.getByTestId('import.seedufvkinput'), 'uv');
  expect(
    screen.getByTestId('import.seedufvkinput.hint').props.children,
  ).toBe('import.key-keep-typing');
});

test('Tests that a typo no recovery word starts with is pointed out', () => {
  mount();
  fireEvent.changeText(screen.getByTestId('import.seedufvkinput'), 'xq');
  expect(
    screen.getByTestId('import.seedufvkinput.hint').props.children,
  ).toBe('import.word-nomatch');
});
