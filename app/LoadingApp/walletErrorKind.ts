import { WalletErrorKind } from '@app/AppState/types/WalletErrorInfo';

const SERVER_HINTS =
  /\b(connect|connection|transport|timed? ?out|unreachable|dns|grpc|network)\b/i;

// The native layer opens Indexerless when only the server dial fails, so a
// wallet that will not open is normally a local problem; the server variant
// is reserved for errors that name the connection itself.
export const walletErrorKind = (details: string): WalletErrorKind =>
  SERVER_HINTS.test(details) ? 'server' : 'open';
