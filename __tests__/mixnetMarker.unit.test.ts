import {
  markerState,
  mixnetDisplayPrefix,
  movedMessage,
  pinnedSourceUrl,
} from '../scripts/mixnet_marker';

const FFI_SOURCE = [
  'pub enum ZingolibError {',
  '    #[error("Error: indexer: {0}")]',
  '    Indexer(String),',
  '    #[error("Error: offline: no indexer configured")]',
  '    Offline,',
  '    #[error("Error: mixnet: {0}")]',
  '    Mixnet(String),',
  '    #[error("Error: wallet chain mismatch: {0}")]',
  '    WalletChainMismatch(String),',
  '}',
].join('\n');

describe('the mixnet display prefix of the pinned zingolib', () => {
  // Tests that the prefix is read from the error attribute of the Mixnet variant when the source holds one.
  test('the Mixnet variant yields its prefix', () => {
    expect(mixnetDisplayPrefix(FFI_SOURCE)).toEqual({
      kind: 'prefix',
      prefix: 'Error: mixnet:',
    });
  });

  // Tests that the outcome is absent when no Mixnet variant exists, whatever other variants the source holds.
  test('a source without the Mixnet variant is absent', () => {
    const without = FFI_SOURCE.replace(/.*mixnet.*\n.*Mixnet.*\n/, '');
    expect(mixnetDisplayPrefix(without)).toEqual({ kind: 'absent' });
  });

  // Tests that the prefix follows a reworded attribute, which is the case the check exists to catch.
  test('a reworded attribute yields the new prefix', () => {
    const reworded = FFI_SOURCE.replace(
      'Error: mixnet: {0}',
      'Error: Nym tunnel: {0}',
    );
    expect(mixnetDisplayPrefix(reworded)).toEqual({
      kind: 'prefix',
      prefix: 'Error: Nym tunnel:',
    });
  });
});

describe('the marker state against the pin', () => {
  // Tests that the marker is held when the pinned prefix equals the owned marker.
  test('an equal prefix is held', () => {
    expect(
      markerState(
        { kind: 'prefix', prefix: 'Error: mixnet:' },
        'Error: mixnet:',
      ),
    ).toEqual({ kind: 'held', prefix: 'Error: mixnet:' });
  });

  // Tests that the marker has moved when the pinned prefix differs from the owned marker.
  test('a different prefix has moved', () => {
    const pinned = { kind: 'prefix', prefix: 'Error: Nym tunnel:' } as const;
    expect(markerState(pinned, 'Error: mixnet:')).toEqual({
      kind: 'moved',
      pinned,
      owned: 'Error: mixnet:',
    });
  });

  // Tests that the marker has moved when the pinned source holds no Mixnet variant at all.
  test('an absent prefix has moved', () => {
    expect(markerState({ kind: 'absent' }, 'Error: mixnet:')).toEqual({
      kind: 'moved',
      pinned: { kind: 'absent' },
      owned: 'Error: mixnet:',
    });
  });

  // Tests that the moved message names both texts and the file that owns the marker.
  test('the moved message names both texts', () => {
    const message = movedMessage({
      kind: 'moved',
      pinned: { kind: 'prefix', prefix: 'Error: Nym tunnel:' },
      owned: 'Error: mixnet:',
    });
    expect(message).toContain('Error: Nym tunnel:');
    expect(message).toContain('Error: mixnet:');
    expect(message).toContain('sendFailureTransform.ts');
  });
});

describe('the pinned source url', () => {
  // Tests that the url names the pinned commit and the FFI crate's lib.rs.
  test('the url addresses lib.rs at the commit', () => {
    expect(pinnedSourceUrl('81d799775f11e882896e8710e8af12d6d4d29a41')).toBe(
      'https://raw.githubusercontent.com/zingolabs/zingolib/81d799775f11e882896e8710e8af12d6d4d29a41/zingo-ffi/lib/src/lib.rs',
    );
  });
});
