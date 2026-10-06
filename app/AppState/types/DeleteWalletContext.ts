// What a hold-to-delete confirms: removing the wallet file before an import
// or a create, or overwriting the phrase a previous install left in the
// Keychain.
export type DeleteWalletContext = 'import' | 'create' | 'replace';
