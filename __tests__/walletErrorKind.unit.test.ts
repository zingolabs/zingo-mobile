import { walletErrorKind } from '@app/LoadingApp/walletErrorKind';

test('Tests that an error naming the connection is the server variant', () => {
  expect(
    walletErrorKind(
      'grpc connect to https://lwd.example.com:9067 failed: transport error',
    ),
  ).toBe('server');
  expect(walletErrorKind('request timed out after 30 s')).toBe('server');
});

test('Tests that a wallet file error is the open variant', () => {
  expect(
    walletErrorKind(
      'failed to read wallet file (wallet.dat): unsupported serialization version 31',
    ),
  ).toBe('open');
});
