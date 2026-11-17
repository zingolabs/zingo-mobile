jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { readAppFile, writeAppFile } from '@app/services/appFiles';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

afterEach(() => {
  jest.clearAllMocks();
});

test('Tests that a file nothing wrote yet reads as missing without reading it', async () => {
  bridge.appFileExists.mockResolvedValue(false);

  expect(await readAppFile('settings.json')).toEqual({ kind: 'missing' });
  expect(bridge.readAppFile).not.toHaveBeenCalled();
});

test('Tests that a stored file reads back its text when it exists', async () => {
  bridge.appFileExists.mockResolvedValue(true);
  bridge.readAppFile.mockResolvedValue('{"language":"es"}');

  expect(await readAppFile('settings.json')).toEqual({
    kind: 'text',
    text: '{"language":"es"}',
  });
  expect(bridge.readAppFile).toHaveBeenCalledWith('settings.json');
});

test('Tests that a read that fails rejects instead of reading as missing', async () => {
  bridge.appFileExists.mockResolvedValue(true);
  bridge.readAppFile.mockRejectedValue(new Error('locked'));

  await expect(readAppFile('addressbook.json')).rejects.toThrow('locked');
});

test('Tests that a write hands the name and the text to the native side', async () => {
  bridge.writeAppFile.mockResolvedValue(true);

  await writeAppFile('addressbook.json', '[]');

  expect(bridge.writeAppFile).toHaveBeenCalledWith('addressbook.json', '[]');
});
