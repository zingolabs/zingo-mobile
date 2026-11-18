/**
 * Cipherscan was renamed ZecBlock. A settings file written before the rename
 * still says 'Cipherscan'; reading it has to hand back the renamed explorer
 * instead of a value the enum no longer has (which the loaders would treat
 * as unknown and reset to the default).
 */

let mockFile: string | null = null;

jest.mock('@app/services/appFiles', () => ({
  readAppFile: jest.fn(async () =>
    mockFile === null ? { kind: 'missing' } : { kind: 'text', text: mockFile },
  ),
  writeAppFile: jest.fn(async (_name: string, contents: string) => {
    mockFile = contents;
  }),
}));

jest.mock('@app/uris', () => ({
  serverUris: () => [
    { uri: 'https://mainnet.example:9067', chainName: 'main' },
  ],
}));

import SettingsFileImpl from '@app/services/SettingsFileImpl';
import { BlockExplorerEnum } from '@app/AppState';

describe('SettingsFileImpl.readSettings blockExplorer', () => {
  beforeEach(() => {
    mockFile = null;
  });

  it('maps the legacy Cipherscan value to ZecBlock', async () => {
    mockFile = JSON.stringify({ blockExplorer: 'Cipherscan' });
    const settings = await SettingsFileImpl.readSettings();
    expect(settings.blockExplorer).toBe(BlockExplorerEnum.ZecBlock);
  });

  it('keeps a current value as is', async () => {
    mockFile = JSON.stringify({ blockExplorer: BlockExplorerEnum.Zexplorer });
    const settings = await SettingsFileImpl.readSettings();
    expect(settings.blockExplorer).toBe(BlockExplorerEnum.Zexplorer);
  });

  it('defaults to Zcashexplorer when the key is missing', async () => {
    mockFile = JSON.stringify({});
    const settings = await SettingsFileImpl.readSettings();
    expect(settings.blockExplorer).toBe(BlockExplorerEnum.Zcashexplorer);
  });
});
