/**
 * Anonymize developer- or user-specific filesystem paths in error messages
 * and stack traces so user-submitted bug reports (Report button, Settings
 * "view last error", Alert dialogs) don't leak personally identifying info.
 *
 * Hermes resolves JS stack frames against the absolute path the bundle was
 * compiled with, so a release IPA built by a developer named "alice" will
 * surface `/Users/alice/Library/Developer/Xcode/DerivedData/...` in every
 * crash. Similarly, on-device paths can include the user's profile folder.
 *
 * Conservative: only the username segment of the path is replaced with
 * `<user>`. The rest of the path is preserved so the project layout
 * (DerivedData hash, app sandbox structure) remains useful when triaging
 * the report.
 */
export function sanitizePaths(text: string): string {
  if (!text) return text;
  return text
    .replace(/\/Users\/[^/]+\//g, '/Users/<user>/')
    .replace(/\/home\/[^/]+\//g, '/home/<user>/')
    .replace(/([A-Z]:\\Users\\)[^\\]+\\/gi, '$1<user>\\');
}
