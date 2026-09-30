import 'react-native';
import React, { useState } from 'react';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  AddressBookFileClass,
  ChainNameEnum,
  RouteEnum,
  remoteServer,
} from '@app/AppState';
import RPCModule from '@app/RPCModule';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import AddressBook from '@screens/AddressBook/AddressBook';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

let mockDirectory = '';
let mockPauseRead: (() => Promise<void>) | undefined;
let mockRejectWrite = false;
const callbacks: AddressBookFileClass[][] = [];

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('@gorhom/bottom-sheet', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  const base = jest.requireActual('../__mocks__/@gorhom/bottom-sheet');
  return {
    __esModule: true,
    ...base,
    BottomSheetModal: react.forwardRef(
      (
        {
          children,
          onDismiss,
        }: { children: React.ReactNode; onDismiss?: () => void },
        ref,
      ) => {
        const [open, setOpen] = react.useState(false);
        react.useImperativeHandle(ref, () => ({
          present: () => setOpen(true),
          dismiss: () => {
            setOpen(false);
            onDismiss?.();
          },
        }));
        return react.createElement(
          react.Fragment,
          undefined,
          open ? children : undefined,
        );
      },
    ),
  };
});
jest.mock('react-native-fs', () => {
  const fs = jest.requireActual<typeof import('node:fs')>('node:fs');
  return {
    get DocumentDirectoryPath() {
      return mockDirectory;
    },
    exists: async (filename: string) => fs.existsSync(filename),
    readFile: async (filename: string) => {
      const contents = fs.readFileSync(filename, 'utf8');
      const pause = mockPauseRead;
      mockPauseRead = undefined;
      await pause?.();
      return contents;
    },
    writeFile: async (filename: string, contents: string) => {
      if (mockRejectWrite) {
        mockRejectWrite = false;
        throw new Error('File write failed');
      }
      fs.writeFileSync(filename, contents, 'utf8');
    },
  };
});

const alice: AddressBookFileClass = {
  label: 'Alice',
  address: 't1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F',
  color: '#ffffff',
  own: false,
  chain: ChainNameEnum.mainChainName,
  swapChain: 'ZEC',
};
const bob: AddressBookFileClass = {
  label: 'Bob',
  address:
    'u1gsqvqxx6lmmqg05uvx57gjdg5j3a54nxw09z4vq4z0yp7dfdcjrqk5wq64quwzrufmujd5e8xu5jn7cyewjaptxc8lsqwa2lk559u4cd',
  color: '#000000',
  own: false,
  chain: ChainNameEnum.mainChainName,
  swapChain: 'ZEC',
};
const regtest: AddressBookFileClass = {
  ...bob,
  address: 'tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i',
  chain: ChainNameEnum.regtestChainName,
};

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

function pauseRead() {
  const started = deferred();
  const release = deferred();
  mockPauseRead = () => {
    started.resolve();
    return release.promise;
  };
  return { started: started.promise, release: release.resolve };
}

function Harness({
  initial = [alice, bob],
}: {
  initial?: AddressBookFileClass[];
}) {
  const [book, setBook] = useState(initial);
  return (
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (key: string) => key,
        walletChainName: ChainNameEnum.mainChainName,
        server: remoteServer(
          'https://public-fixture.invalid',
          ChainNameEnum.mainChainName,
        ),
        info: mockInfo,
        totalBalance: mockTotalBalance,
        addressBook: book,
      }}
    >
      <AddressBook
        navigation={mockNavigation}
        route={{
          key: 'persistence',
          name: RouteEnum.AddressBook,
          params: undefined,
        }}
        setAddressBook={next => {
          callbacks.push(next);
          setBook(next);
        }}
      />
    </ContextAppLoadedProvider>
  );
}

beforeEach(async () => {
  mockDirectory = await mkdtemp(join(tmpdir(), 'zingo-address-book-'));
  mockPauseRead = undefined;
  mockRejectWrite = false;
  callbacks.length = 0;
  jest.clearAllMocks();
  jest.mocked(RPCModule.checkMyAddressInfo).mockImplementation(async address =>
    JSON.stringify({
      is_wallet_address: false,
      account_id: 0,
      address_type: address === alice.address ? 'transparent' : 'unified',
      encoded_address: address,
    }),
  );
  jest.mocked(RPCModule.parseAddressInfo).mockImplementation(async address =>
    JSON.stringify({
      status: 'success',
      chain_name: 'main',
      address_kind: address === alice.address ? 'transparent' : 'unified',
    }),
  );
  await writeFile(
    join(mockDirectory, 'addressbook.json'),
    JSON.stringify([alice, bob]),
  );
});

afterEach(async () => {
  cleanup();
  jest.restoreAllMocks();
  await rm(mockDirectory, { recursive: true, force: true });
});

async function rename(label: string, next: string) {
  fireEvent.press(screen.getByText(label));
  fireEvent.changeText(screen.getByDisplayValue(label), next);
  await waitFor(() =>
    expect(screen.getByTestId('addressbook.button.action')).toBeEnabled(),
  );
  await act(async () =>
    fireEvent.press(screen.getByTestId('addressbook.button.action')),
  );
}

function dismissEditor() {
  const close = screen
    .UNSAFE_getAllByProps({ hitSlop: 8 })
    .find(
      button =>
        button.props.style?.paddingHorizontal === 14 &&
        button.props.style?.paddingVertical === 4,
    );
  if (!close) throw new Error('The editor close control is missing');
  fireEvent.press(close);
}

async function reopened() {
  const book: AddressBookFileClass[] = JSON.parse(
    await readFile(join(mockDirectory, 'addressbook.json'), 'utf8'),
  );
  expect(await AddressBookFileImpl.readAddressBook()).toEqual(book);
  return book;
}

test('Tests that both saved labels persist when the UI completes edits sequentially.', async () => {
  render(<Harness />);
  await screen.findByText('Alice');
  await rename('Alice', 'Alice saved');
  await waitFor(() => expect(callbacks).toHaveLength(1));
  await rename('Bob', 'Bob saved');
  await waitFor(() => expect(callbacks).toHaveLength(2));
  expect(await reopened()).toEqual([
    { ...alice, label: 'Alice saved' },
    { ...bob, label: 'Bob saved' },
  ]);
});

test.each([
  ['Alice', 'Bob'],
  ['Bob', 'Alice'],
])(
  'Tests that both saved labels persist when %s is edited before %s while its save is pending.',
  async (first, second) => {
    render(<Harness />);
    await screen.findByText('Alice');
    const read = pauseRead();
    try {
      await rename(first, `${first} saved`);
      await read.started;
      dismissEditor();
      expect(screen.queryByDisplayValue(`${first} saved`)).toBeNull();
      await rename(second, `${second} saved`);
    } finally {
      await act(async () => read.release());
    }
    await waitFor(() => expect(callbacks).toHaveLength(2));
    const expected = [
      { ...alice, label: 'Alice saved' },
      { ...bob, label: 'Bob saved' },
    ];
    expect(callbacks[1]).toEqual(expected);
    expect(await reopened()).toEqual(expected);
    cleanup();
    render(<Harness initial={await reopened()} />);
    await screen.findByText('Alice saved');
    expect(screen.getByText('Bob saved')).toBeTruthy();
  },
);

function save(entry: AddressBookFileClass) {
  return AddressBookFileImpl.writeAddressBookItem(
    entry.label,
    entry.address,
    entry.color,
    entry.own,
    entry.chain,
    entry.swapChain,
  );
}

test('Tests that a new unsaved edit remains open when an earlier save completes.', async () => {
  render(<Harness />);
  await screen.findByText('Alice');
  const read = pauseRead();
  try {
    await rename('Alice', 'Zelda');
    await read.started;
    dismissEditor();
    fireEvent.press(screen.getByText('Bob'));
    fireEvent.changeText(screen.getByDisplayValue('Bob'), 'Bob draft');
  } finally {
    await act(async () => read.release());
  }
  await waitFor(() => expect(callbacks).toHaveLength(1));
  expect(screen.getByDisplayValue('Bob draft')).toBeTruthy();
  await act(async () =>
    fireEvent.press(screen.getByTestId('addressbook.button.action')),
  );
  await waitFor(() => expect(callbacks).toHaveLength(2));
  expect(await reopened()).toEqual([
    { ...bob, label: 'Bob draft' },
    { ...alice, label: 'Zelda' },
  ]);
});

async function overlap(
  first: () => Promise<AddressBookFileClass[]>,
  second: () => Promise<AddressBookFileClass[]>,
) {
  const read = pauseRead();
  const pending = first();
  try {
    await read.started;
    const following = second();
    await Promise.resolve();
    await Promise.resolve();
    read.release();
    return await Promise.all([pending, following]);
  } finally {
    read.release();
  }
}

test.each([false, true])(
  'Tests that an added entry and a renamed entry persist when their saves overlap (rename first: %s).',
  async renameFirst => {
    await writeFile(
      join(mockDirectory, 'addressbook.json'),
      JSON.stringify([alice]),
    );
    const add = () => save(bob);
    const edit = () => save({ ...alice, label: 'Alice saved' });
    await overlap(renameFirst ? edit : add, renameFirst ? add : edit);
    expect(await reopened()).toEqual([{ ...alice, label: 'Alice saved' }, bob]);
  },
);

test.each([false, true])(
  'Tests that an ownership refresh preserves network metadata and a deletion when they overlap (delete first: %s).',
  async deleteFirst => {
    await writeFile(
      join(mockDirectory, 'addressbook.json'),
      JSON.stringify([alice, regtest]),
    );
    const remove = () =>
      AddressBookFileImpl.removeAddressBookItem(alice.label, alice.address);
    const refresh = () =>
      AddressBookFileImpl.updateColorAndOwnItem(
        regtest.label,
        regtest.address,
        '#abcdef',
        true,
      );
    await overlap(
      deleteFirst ? remove : refresh,
      deleteFirst ? refresh : remove,
    );
    expect(await reopened()).toEqual([
      { ...regtest, color: '#abcdef', own: true },
    ]);
  },
);

test('Tests that an existing entry keeps its network metadata when its save overlaps another edit.', async () => {
  await writeFile(
    join(mockDirectory, 'addressbook.json'),
    JSON.stringify([alice, regtest]),
  );
  await overlap(
    () =>
      save({
        ...regtest,
        own: true,
        color: '#abcdef',
        chain: ChainNameEnum.mainChainName,
      }),
    () => save({ ...alice, label: 'Alice saved' }),
  );
  expect(await reopened()).toEqual([
    { ...alice, label: 'Alice saved' },
    { ...regtest, own: true, color: '#abcdef' },
  ]);
});

test('Tests that a whole-book replacement takes effect when it follows a pending edit.', async () => {
  await overlap(
    () => save({ ...alice, label: 'Alice saved' }),
    () => AddressBookFileImpl.writeAddressBook([bob]),
  );
  expect(await reopened()).toEqual([bob]);
});

test('Tests that a later edit persists when a file write rejects.', async () => {
  mockRejectWrite = true;
  const failed = save({ ...alice, label: 'Alice saved' });
  const following = save({ ...bob, label: 'Bob saved' });
  expect(await failed).toEqual([]);
  await following;
  expect(await reopened()).toEqual([alice, { ...bob, label: 'Bob saved' }]);
});

test('Tests that a queued edit persists when the preceding operation rejects.', async () => {
  jest
    .spyOn(AddressBookFileImpl, 'readAddressBook')
    .mockRejectedValueOnce(new Error('Read interrupted'));
  const failed = save({ ...alice, label: 'Alice saved' });
  const following = save({ ...bob, label: 'Bob saved' });
  await expect(failed).rejects.toThrow('Read interrupted');
  await following;
  expect(await reopened()).toEqual([alice, { ...bob, label: 'Bob saved' }]);
});
