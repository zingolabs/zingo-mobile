import { ChainNameEnum, ServerUrisType, remoteServer } from '@app/AppState';
import {
  otherServers,
  staticAlternatives,
  staticServers,
} from '@app/uris/serverChoice';

const entry = (
  uri: string,
  chainName: ChainNameEnum = ChainNameEnum.mainChainName,
  obsolete: boolean = false,
): ServerUrisType => ({
  uri,
  chainName,
  region: '',
  default: false,
  latency: null,
  obsolete,
});

const current = remoteServer('https://a:443', ChainNameEnum.mainChainName);
const a = entry('https://a:443');
const b = entry('https://b:443');
const retired = entry('https://old:443', ChainNameEnum.mainChainName, true);
const testnet = entry('https://t:443', ChainNameEnum.testChainName);

describe('server choice', () => {
  test('Tests that otherServers drops the current server when the list holds it.', () => {
    expect(otherServers([a, b], current)).toEqual([b]);
  });

  test('Tests that staticServers keeps the servers in service on the chain when the list holds a retired server and a server of another chain.', () => {
    expect(
      staticServers([a, b, retired, testnet], ChainNameEnum.mainChainName),
    ).toEqual([a, b]);
  });

  test('Tests that staticAlternatives keeps the other servers in service on the chain of the current server when the list holds every kind of entry.', () => {
    expect(staticAlternatives([a, b, retired, testnet], current)).toEqual([b]);
  });
});
