import RPCModule from '@app/RPCModule';

/** The only files the native side lets the app read and write. */
export type AppFileName =
  'settings.json' | 'addressbook.json' | 'background.json';

export type AppFileRead = { kind: 'missing' } | { kind: 'text'; text: string };

/**
 * Reads one of the app's JSON files from its private folder. A file nothing
 * wrote yet is `missing`; a file that cannot be read rejects.
 */
export async function readAppFile(name: AppFileName): Promise<AppFileRead> {
  if (!(await RPCModule.appFileExists(name))) {
    return { kind: 'missing' };
  }
  return { kind: 'text', text: await RPCModule.readAppFile(name) };
}

/**
 * Replaces one of the app's JSON files in a single step: a reader, the
 * background sync included, sees the old text or the new, never part of it.
 */
export async function writeAppFile(
  name: AppFileName,
  text: string,
): Promise<void> {
  await RPCModule.writeAppFile(name, text);
}
