import 'react-native';
import React from 'react';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { Base64 } from 'js-base64';
import Send from '@screens/Send';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import {
  ChainNameEnum,
  RouteEnum,
  SendPageStateClass,
  ToAddrClass,
  remoteServer,
} from '@app/AppState';
import Utils from '@app/utils';
import * as ZnsResolver from '@app/uris/resolveZnsName';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

function deferred<T>() {
  let release: (answer: T) => void = () => {};
  const promise = new Promise<T>(resolve => {
    release = resolve;
  });
  return { promise, release };
}

const valid = { isValid: true, shieldedOnlyUA: '' };
const invalid = { isValid: false, shieldedOnlyUA: '' };
/* Public default_d/default_pk_d fixtures: https://github.com/zcash/zcash-test-vectors/blob/master/test-vectors/json/sapling_key_components.json */
const olderAddress =
  'zs17xwek7t788enw3zc88d5e54s4tz006uv5yclzet8c3z6j423ymfu98c5u0thd6zp4e6p2jumnna';
const newerAddress =
  'zs14mccpahrfc65hzy0sxntz04rxmwm0fnmkzdqu68f608m8ysssv028g5khgy6jgsxplfckyxhys5';
const editedAddress =
  'zs1rwqkznca4h4qlrg2tqj7k40ueampl3jwskjc3mlxattcxta37rm6svt939dal72zjf04csxqxxj';
const uri = (address: string, amount?: string, memo?: string) =>
  `zcash:${address}?${[
    ...(amount ? [`amount=${amount}`] : []),
    ...(memo ? [`memo=${Base64.encodeURI(memo)}`] : []),
  ].join('&')}`;

function setup() {
  const older = deferred<typeof valid>();
  const newer = deferred<typeof valid>();
  const pending = new Map([
    [olderAddress, older],
    [newerAddress, newer],
  ]);
  jest.spyOn(Utils, 'isValidAddress').mockImplementation(async address => {
    const request = pending.get(address);
    pending.delete(address);
    return request ? request.promise : valid;
  });
  jest.spyOn(Utils, 'isValidOrchardOrSaplingAddress').mockResolvedValue(true);
  const sendPageState = new SendPageStateClass(new ToAddrClass(0));
  sendPageState.toaddr.to =
    'zs1wkvlp0um2lxjms5ekenpg9ee299j3uzaa79p3mhwtmk563xxyfwrcewc3hveqacgqyh45a46tq8';
  const snack = jest.fn();
  const initial = {
    ...defaultAppContextLoaded,
    info: mockInfo,
    totalBalance: mockTotalBalance,
    server: mockServer,
    translate: mockTranslate,
    sendPageState,
    addLastSnackbar: snack,
  };
  const unused = jest.fn();
  const screen = (context = initial) => (
    <ContextAppLoadedProvider value={context}>
      <Send
        navigation={mockNavigation}
        route={{ key: 'fixture', name: RouteEnum.Send, params: undefined }}
        sendTransaction={async () => {
          throw new Error('Unexpected send');
        }}
        clearToAddr={unused}
        toggleMenuDrawer={unused}
        setShieldingAmount={unused}
        setScrollToTop={unused}
        setScrollToBottom={unused}
        setServerOption={async () => ({ kind: 'ok' })}
      />
    </ContextAppLoadedProvider>
  );
  const view = render(screen());
  const field = () => view.getByTestId('send.addressplaceholder');
  const edit = async (recipient: string) => {
    await act(async () => {
      fireEvent.changeText(field(), recipient);
    });
  };
  const finish = async (request: typeof older, answer = valid) => {
    await act(async () => {
      request.release(answer);
    });
  };
  const memo = () =>
    within(view.getByTestId('send.scroll-view')).getByTestId('send.memo-field');
  return {
    view,
    initial,
    screen,
    older,
    newer,
    field,
    edit,
    finish,
    snack,
    memo,
  };
}

afterEach(() => jest.restoreAllMocks());

test.each([true, false])(
  'Tests that a newer URI wins when an older name lookup has started: %s.',
  async started => {
    const name = deferred<ZnsResolver.ZnsResolution>();
    const resolveName = jest
      .spyOn(ZnsResolver, 'resolveZnsName')
      .mockReturnValue(name.promise);
    const h = setup();
    const debounce = async () => {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 550));
      });
    };
    await h.edit('alice.zec');
    if (started) {
      await debounce();
    }
    expect(resolveName).toHaveBeenCalledTimes(started ? 1 : 0);
    await h.edit(uri(olderAddress, '2', 'Latest URI memo'));
    if (!started) {
      await debounce();
    }
    expect(resolveName).toHaveBeenCalledTimes(1);
    await act(async () => {
      name.release({ ok: true, address: editedAddress });
    });
    await h.finish(h.older);
    expect(h.field().props.value).toBe(olderAddress);
    expect(h.view.getByTestId('send.amount').props.value).toBe('2.00000000');
    expect(h.memo().props.value).toBe('Latest URI memo');
  },
);

test('Tests that a name resolves into the recipient when its lookup remains current.', async () => {
  const name = deferred<ZnsResolver.ZnsResolution>();
  const resolveName = jest
    .spyOn(ZnsResolver, 'resolveZnsName')
    .mockReturnValue(name.promise);
  const h = setup();
  await h.edit('alice.zec');
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 550));
  });
  expect(resolveName).toHaveBeenCalledWith('alice.zec', mockServer.chainName);
  await act(async () => {
    name.release({ ok: true, address: editedAddress });
  });
  expect(h.field().props.value).toBe(editedAddress);
  expect(h.view.getByText('ZNS: alice.zec')).toBeTruthy();
});

test('Tests that the current alias resolves when a whitespace edit preserves its normalized recipient.', async () => {
  const name = deferred<ZnsResolver.ZnsResolution>();
  const resolveName = jest
    .spyOn(ZnsResolver, 'resolveZnsName')
    .mockReturnValue(name.promise);
  const h = setup();
  await h.edit('alice.zec');
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 550));
  });
  expect(resolveName).toHaveBeenCalledTimes(1);
  await h.edit('alice.zec ');
  expect(h.field().props.value).toBe('alice.zec');
  await act(async () => {
    name.release({ ok: true, address: editedAddress });
  });
  expect(h.field().props.value).toBe(editedAddress);
  expect(h.view.getByText('ZNS: alice.zec')).toBeTruthy();
});

test.each([editedAddress, ''])(
  'Tests that the latest recipient remains when an older URI completes after editing to %s.',
  async recipient => {
    const h = setup();
    await h.edit(uri(olderAddress));
    await h.edit(recipient);
    expect(h.field().props.value).toBe(recipient);
    await h.finish(h.older);
    expect(h.field().props.value).toBe(recipient);
  },
);

test('Tests that the recipient remains empty when the clear button precedes an older URI completion.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress));
  const clear = h.view.UNSAFE_getAllByProps({ icon: faXmark })[0];
  await act(async () => {
    fireEvent.press(clear);
  });
  expect(h.field().props.value).toBe('');
  await h.finish(h.older);
  expect(h.field().props.value).toBe('');
});

test('Tests that the latest URI fields remain when an older URI completes afterward.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress, '2', 'Older memo'));
  await h.edit(uri(newerAddress, '3', 'Newer memo'));
  await h.finish(h.newer);
  expect(h.field().props.value).toBe(newerAddress);
  expect(h.view.getByTestId('send.amount').props.value).toBe('3.00000000');
  expect(h.memo().props.value).toBe('Newer memo');
  await h.finish(h.older);
  expect(h.field().props.value).toBe(newerAddress);
  expect(h.view.getByTestId('send.amount').props.value).toBe('3.00000000');
  expect(h.memo().props.value).toBe('Newer memo');
});

test('Tests that the latest draft remains quiet when superseded URI validation fails.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress));
  await h.edit(editedAddress);
  await h.finish(h.older, invalid);
  expect(h.field().props.value).toBe(editedAddress);
  expect(h.snack).not.toHaveBeenCalled();
});

test('Tests that the replacement draft remains when parent state resets during URI validation.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress, '2', 'Older memo'));
  const replacement = new SendPageStateClass(new ToAddrClass(0));
  await act(async () => {
    h.view.rerender(h.screen({ ...h.initial, sendPageState: replacement }));
  });
  expect(h.field().props.value).toBe('');
  await h.finish(h.older);
  expect(h.field().props.value).toBe('');
  expect(h.view.getByTestId('send.amount').props.value).toBe('');
});

test('Tests that the existing recipient remains when the validation chain changes.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress));
  await act(async () => {
    h.view.rerender(
      h.screen({
        ...h.initial,
        server: remoteServer(
          'https://fixture.test',
          ChainNameEnum.testChainName,
        ),
      }),
    );
  });
  await h.finish(h.older);
  expect(h.field().props.value).toBe(
    'zs1wkvlp0um2lxjms5ekenpg9ee299j3uzaa79p3mhwtmk563xxyfwrcewc3hveqacgqyh45a46tq8',
  );
});

test('Tests that validation completes quietly when the Send screen unmounts.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress));
  h.view.unmount();
  await h.finish(h.older, invalid);
  expect(h.snack).not.toHaveBeenCalled();
});

test('Tests that URI fields fill the form when the current validation succeeds.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress, '2', 'Current memo'));
  await h.finish(h.older);
  expect(h.field().props.value).toBe(olderAddress);
  expect(h.view.getByTestId('send.amount').props.value).toBe('2.00000000');
  expect(h.memo().props.value).toBe('Current memo');
});

test('Tests that a validation error reaches the user when its URI is current.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress));
  await h.finish(h.older, invalid);
  expect(h.snack).toHaveBeenCalledTimes(1);
  expect(h.field().props.value).toBe(
    'zs1wkvlp0um2lxjms5ekenpg9ee299j3uzaa79p3mhwtmk563xxyfwrcewc3hveqacgqyh45a46tq8',
  );
});

test('Tests that the latest recipient remains when a previous URI completed before the edit.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress));
  await h.finish(h.older);
  expect(h.field().props.value).toBe(olderAddress);
  await h.edit(editedAddress);
  expect(h.field().props.value).toBe(editedAddress);
});

test('Tests that independent amount and memo edits remain when the pending URI carries only a recipient.', async () => {
  const h = setup();
  await h.edit(uri(olderAddress));
  await act(async () => {
    fireEvent.changeText(h.view.getByTestId('send.amount'), '4');
  });
  await act(async () => {
    fireEvent.changeText(h.memo(), 'Edited memo');
  });
  await h.finish(h.older);
  expect(h.field().props.value).toBe(olderAddress);
  expect(h.view.getByTestId('send.amount').props.value).toBe('4');
  expect(h.memo().props.value).toBe('Edited memo');
});
