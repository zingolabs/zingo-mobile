import { ChainNameEnum } from '@app/AppState';
import { MeasuredServer, healthyCandidate } from '@app/services/serverPicking';

jest.mock('@app/walletBackend', () => ({
  getLatestBlockServerInfo: jest.fn(),
}));

const main = ChainNameEnum.mainChainName;
const ZEC_GLOBAL = 'https://zec.global:443';
const at = (
  uri: string,
  latency: number | null,
  height: number,
): MeasuredServer => ({ uri, chainName: main, latency, height });

test('Tests that the default is offered when it answers up to date, even when another is faster', () => {
  const pick = healthyCandidate(
    [at(ZEC_GLOBAL, 300, 1000), at('https://a:443', 50, 1000)],
    'https://current:443',
    ZEC_GLOBAL,
    0,
  );
  expect(pick?.uri).toBe(ZEC_GLOBAL);
});

test('Tests that the fastest up-to-date server is offered when the default is the one failing', () => {
  const pick = healthyCandidate(
    [
      at(ZEC_GLOBAL, null, 0),
      at('https://slow:443', 400, 1000),
      at('https://fast:443', 80, 1000),
    ],
    ZEC_GLOBAL,
    ZEC_GLOBAL,
    0,
  );
  expect(pick?.uri).toBe('https://fast:443');
});

test('Tests that a server more than five blocks behind the highest seen is never offered', () => {
  const pick = healthyCandidate(
    [at('https://behind:443', 20, 990), at('https://tip:443', 200, 1000)],
    ZEC_GLOBAL,
    ZEC_GLOBAL,
    0,
  );
  expect(pick?.uri).toBe('https://tip:443');
});

test('Tests that nothing is offered when no other server answers up to date', () => {
  expect(
    healthyCandidate(
      [at(ZEC_GLOBAL, 100, 1000), at('https://b:443', null, 0)],
      ZEC_GLOBAL,
      ZEC_GLOBAL,
      1000,
    ),
  ).toBeNull();
});
