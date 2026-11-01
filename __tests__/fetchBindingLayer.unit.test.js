import { join } from 'node:path';
import { STORES, fetchArgv } from '../scripts/fetch_binding_layer.mjs';

describe('fetch argv', () => {
  // Tests that the fetch runs under the permission model with writes limited to the bundle stores when any platform is requested.
  test('writes are limited to the bundle stores', () => {
    const argv = fetchArgv('/r', ['--platform', 'ios']);
    expect(argv[0]).toBe('--permission');
    const writes = argv.filter(arg => arg.startsWith('--allow-fs-write='));
    expect(writes).toEqual(
      STORES.map(store => `--allow-fs-write=${join('/r', store)}`),
    );
    const reads = argv.filter(arg => arg.startsWith('--allow-fs-read='));
    expect(reads).toContain(
      `--allow-fs-read=${join('/r', 'binding-layer.json')}`,
    );
    expect(reads).toContain(
      `--allow-fs-read=${join('/r', 'node_modules', 'zingolib-bundle-pin')}`,
    );
    expect(argv.slice(-5)).toEqual([
      join(
        '/r',
        'node_modules',
        'zingolib-bundle-pin',
        'bin',
        'fetch_binding_layer.mjs',
      ),
      '--root',
      '/r',
      '--platform',
      'ios',
    ]);
  });
});
