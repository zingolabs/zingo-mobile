import 'react-native';
import React from 'react';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
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
  AppContextLoaded,
  AddressBookFileClass,
  AddressKindEnum,
  ChainNameEnum,
  RouteEnum,
  ScreenEnum,
  offlineServer,
  remoteServer,
} from '@app/AppState';
import RPCModule from '@app/RPCModule';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';
import AddressBookFileImpl from '@app/services/AddressBookFileImpl';
import NewAddress from '@screens/Receive/components/NewAddress';
import AddressBook from '@screens/AddressBook/AddressBook';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

let mockDirectory = '';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('react-native-fs', () => {
  const fs =
    jest.requireActual<typeof import('node:fs/promises')>('node:fs/promises');
  return {
    get DocumentDirectoryPath() {
      return mockDirectory;
    },
    exists: async (filename: string) => {
      try {
        await fs.access(filename);
        return true;
      } catch (error) {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          return false;
        }
        throw error;
      }
    },
    readFile: (filename: string) => fs.readFile(filename, 'utf8'),
    writeFile: (filename: string, contents: string) =>
      fs.writeFile(filename, contents, 'utf8'),
  };
});

const networks = [
  {
    chain: ChainNameEnum.mainChainName,
    generated:
      'u1gsqvqxx6lmmqg05uvx57gjdg5j3a54nxw09z4vq4z0yp7dfdcjrqk5wq64quwzrufmujd5e8xu5jn7cyewjaptxc8lsqwa2lk559u4cd',
    existing: 't1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F',
    transparent: 't1dUDJ62ANtmebE8drFg7g2MWYwXHQ6Xu3F',
  },
  {
    chain: ChainNameEnum.testChainName,
    generated:
      'utest1f7hprvzygjeq6gtyh2splf0qq3ug70krvq44z40d7lg590u2dwg59l8we9v2mdpk72llg5wd9cat68ur0pdrmyx8fs54x6asy5z86elr',
    existing: 'tmBsTi2xWTjUdEXnuTceL7fecEQKeWaPDJd',
    transparent: 'tmBsTi2xWTjUdEXnuTceL7fecEQKeWaPDJd',
  },
  {
    chain: ChainNameEnum.regtestChainName,
    generated:
      'uregtest1az7w9w3tdegf0srnsgqyqfhyfrpx2h6u4pkc2yq3ja552vzhwkjqgy4fu6a6kcu9280ppajamj2gcq9lx9x0zxdrsns94ml3e443a7t2dm50382mhtkleydrq74q5xlh6sel5u0qlrvflf20qgljzszd2ht9jmerwwahct9rtuc3nqdk',
    existing:
      'uregtest1ue949txhf9t2z6ldg8wc6s5t439t2hu55yh9l58gc23cmxthths836nxtpyvhpkrftsp2jnnp9eadtqy2nefxn04eyxeu8l0x5kk8ct9',
    transparent: 'tmFLszfkjgim4zoUMAXpuohnFBAKy99rr2i',
  },
];

beforeEach(async () => {
  mockDirectory = await mkdtemp(join(tmpdir(), 'zingo-network-tags-'));
  jest.clearAllMocks();
});

afterEach(async () => {
  cleanup();
  await rm(mockDirectory, { recursive: true, force: true });
});

function walletContext(
  chain: ChainNameEnum,
  addressBook: AddressBookFileClass[] = [],
): AppContextLoaded {
  return {
    ...defaultAppContextLoaded,
    translate: (key: string) => key,
    walletChainName: chain,
    server: remoteServer('https://native-fixture.invalid', chain),
    info: { ...mockInfo, chainName: chain },
    totalBalance: mockTotalBalance,
    addressBook,
  };
}

function renderBook(
  context: ReturnType<typeof walletContext>,
  addressBook: AddressBookFileClass[],
) {
  return render(
    <ContextAppLoadedProvider value={{ ...context, addressBook }}>
      <AddressBook
        navigation={mockNavigation}
        route={{
          key: 'network-tags',
          name: RouteEnum.AddressBook,
          params: undefined,
        }}
        setAddressBook={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );
}

async function saveTag(
  network: (typeof networks)[number],
  kind: AddressKindEnum,
  context = walletContext(network.chain),
) {
  const { chain } = network;
  const generated =
    kind === AddressKindEnum.u ? network.generated : network.transparent;
  const existing =
    kind === AddressKindEnum.u ? network.existing : network.generated;
  const previous = [
    {
      label: 'Wallet tag',
      address: existing,
      color: 'green',
      own: true,
      chain,
      swapChain: 'ZEC',
    },
  ];
  await AddressBookFileImpl.writeAddressBook(previous);
  if (kind === AddressKindEnum.u) {
    jest.mocked(RPCModule.createNewUnifiedAddressProcess).mockResolvedValue(
      JSON.stringify({
        account: 0,
        address_index: 1,
        has_orchard: true,
        has_sapling: false,
        has_transparent: false,
        encoded_address: generated,
      }),
    );
  } else {
    jest.mocked(RPCModule.createNewTransparentAddressProcess).mockResolvedValue(
      JSON.stringify({
        account: 0,
        address_index: 1,
        scope: RPCAddressScopeEnum.external,
        encoded_address: generated,
      }),
    );
  }
  const setAddressBook = jest.fn();
  const closeSheet = jest.fn();
  const form = render(
    <ContextAppLoadedProvider value={context}>
      <NewAddress
        addressKind={kind}
        closeSheet={closeSheet}
        setAddressBook={setAddressBook}
        screenName={ScreenEnum.Receive}
      />
    </ContextAppLoadedProvider>,
  );
  fireEvent.changeText(
    screen.getByPlaceholderText('addressbook.label-placeholder'),
    'New tag',
  );
  fireEvent.press(screen.getByText('save'));
  await waitFor(() => expect(closeSheet).toHaveBeenCalled());
  form.unmount();

  const reopened = await AddressBookFileImpl.readAddressBook();
  const persisted: AddressBookFileClass[] = JSON.parse(
    await readFile(join(mockDirectory, 'addressbook.json'), 'utf8'),
  );
  expect(reopened).toEqual(persisted);
  expect(setAddressBook).toHaveBeenCalledWith(persisted);
  expect(reopened.find(entry => entry.label === 'New tag')).toMatchObject({
    address: generated,
    own: true,
    swapChain: 'ZEC',
  });
  renderBook(context, reopened);
  await screen.findByText('Wallet tag');
  expect(screen.queryByText('New tag')).toBeTruthy();
  expect(reopened.find(entry => entry.label === 'New tag')?.chain).toBe(chain);
}

const generationCases = networks.flatMap(network =>
  [AddressKindEnum.u, AddressKindEnum.t].map(kind => ({ ...network, kind })),
);

test.each(generationCases)(
  'Tests that the generated $kind tag remains visible when the $chain address book reopens.',
  async network => saveTag(network, network.kind),
);

test.each([AddressKindEnum.u, AddressKindEnum.t])(
  'Tests that the generated %s tag remains visible when the testnet wallet opens offline.',
  async kind => {
    const context = walletContext(ChainNameEnum.testChainName);
    context.server = offlineServer(ChainNameEnum.noneChainName);
    await saveTag(networks[1], kind, context);
  },
);

test.each(generationCases)(
  'Tests that the generated $kind tag uses the $chain server network when the wallet network is empty.',
  async network => {
    const context = walletContext(network.chain);
    context.walletChainName = ChainNameEnum.noneChainName;
    await saveTag(network, network.kind, context);
  },
);

test('Tests that an existing tag remains visible when the wallet opens offline.', async () => {
  const context = walletContext(ChainNameEnum.testChainName);
  context.server = offlineServer(ChainNameEnum.noneChainName);
  const book = [
    {
      label: 'Offline tag',
      address: networks[1].existing,
      color: 'green',
      own: true,
      chain: ChainNameEnum.testChainName,
      swapChain: 'ZEC',
    },
  ];
  await AddressBookFileImpl.writeAddressBook(book);
  renderBook(context, await AddressBookFileImpl.readAddressBook());
  expect(await screen.findByText('Offline tag')).toBeTruthy();
  expect(await AddressBookFileImpl.readAddressBook()).toEqual(book);
});
