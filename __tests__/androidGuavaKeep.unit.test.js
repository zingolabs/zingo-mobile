import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANDROID = join(__dirname, '..', 'android', 'app');
const gradle = readFileSync(join(ANDROID, 'build.gradle.kts'), 'utf8');
const proguard = readFileSync(join(ANDROID, 'proguard-rules.pro'), 'utf8');

describe('Guava in the release APK', () => {
  // Tests that the ProGuard rules keep no Guava package when the app declares no Guava dependency.
  test('no keep rule names com.google.common', () => {
    expect(/^-keep class com\.google\.common\./m.test(proguard)).toBe(false);
  });

  // Tests that WorkManager's futures resolve from the standalone jar when the app consumes them without Guava.
  test('listenablefuture is declared in place of Guava', () => {
    expect(/implementation\("com\.google\.guava:guava:/.test(gradle)).toBe(
      false,
    );
    expect(
      /implementation\("com\.google\.guava:listenablefuture:1\.0"\)/.test(
        gradle,
      ),
    ).toBe(true);
  });
});
