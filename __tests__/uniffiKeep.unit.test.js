import { Buffer } from 'node:buffer';
import {
  aarPath,
  missingClasses,
  presentClasses,
  topLevelClasses,
} from '../scripts/uniffi_keep.mjs';

describe('uniffi keep', () => {
  // Tests that the declared classes are the outer uniffi classes of the jar, by package, when inner classes and other entries are present.
  test('the jar listing yields the outer classes by package', () => {
    expect(
      topLevelClasses([
        'META-INF/MANIFEST.MF',
        'uniffi/zingo/',
        'uniffi/zingo/Foo.class',
        'uniffi/zingo/Foo$Companion.class',
        'uniffi/zingo_nym_proxy_ffi/Bar.class',
      ]),
    ).toEqual(
      new Map([
        ['zingo', ['Foo']],
        ['zingo_nym_proxy_ffi', ['Bar']],
      ]),
    );
  });

  // Tests that the present classes are the outer names of the package's descriptors when the dex holds inner and foreign descriptors.
  test('the dex yields the outer names of one package', () => {
    const dex = Buffer.from(
      '..Luniffi/zingo/Foo;..Luniffi/zingo/Foo$Companion;..Luniffi/other/Baz;',
      'latin1',
    );
    expect(presentClasses(dex, 'zingo')).toEqual(new Set(['Foo']));
  });

  // Tests that a declared class is missing when the dex lacks it.
  test('a stripped class is missing', () => {
    expect(missingClasses(['Bar', 'Foo'], new Set(['Foo']))).toEqual(['Bar']);
  });

  // Tests that the AAR path follows the Maven layout of the coordinate.
  test('the coordinate names the AAR path', () => {
    expect(aarPath('/r', 'org.zingolabs:zingo-binding-layer:7.0.0-abc')).toBe(
      '/r/org/zingolabs/zingo-binding-layer/7.0.0-abc/zingo-binding-layer-7.0.0-abc.aar',
    );
  });
});
