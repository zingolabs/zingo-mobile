import {
  quoteAddressPair,
  quoteBindsAddress,
} from '@app/swap/quoteAddressBinding';

const EPHEMERAL = 't1ephemeralrefundaddress';

describe('quoteAddressPair', () => {
  // Outbound sells ZEC, so the wallet's own address is where a refund returns
  // and the user's is where the bought asset lands.
  it('puts the wallet address on the source side when selling ZEC', () => {
    expect(
      quoteAddressPair({
        isOutbound: true,
        ephemeralAddress: EPHEMERAL,
        boundAddress: 'zingolabs.near',
      }),
    ).toEqual({
      sourceAddress: EPHEMERAL,
      destinationAddress: 'zingolabs.near',
    });
  });

  it('mirrors the pair when buying ZEC', () => {
    expect(
      quoteAddressPair({
        isOutbound: false,
        ephemeralAddress: EPHEMERAL,
        boundAddress: 'zingolabs.near',
      }),
    ).toEqual({
      sourceAddress: 'zingolabs.near',
      destinationAddress: EPHEMERAL,
    });
  });

  // The counterparty address is blank until the user has typed a valid one,
  // which is what lets a quote happen while they are still typing it.
  it('leaves the counterparty side blank when there is no address yet', () => {
    expect(
      quoteAddressPair({
        isOutbound: true,
        ephemeralAddress: EPHEMERAL,
        boundAddress: '',
      }),
    ).toEqual({
      sourceAddress: EPHEMERAL,
      destinationAddress: '',
    });
  });
});

describe('quoteBindsAddress', () => {
  const quoted = {
    sourceAddress: EPHEMERAL,
    destinationAddress: 'zingolabs.near',
  };

  it('accepts a quote taken for the address on screen', () => {
    expect(
      quoteBindsAddress({
        quoted,
        isOutbound: true,
        boundAddress: 'zingolabs.near',
      }),
    ).toBe(true);
  });

  // The state right after the user edits the address: the routes still on
  // screen were built for the previous one, and committing one of them asks
  // the provider to honour a route it built to pay somewhere else.
  it('rejects a quote taken for a different address', () => {
    expect(
      quoteBindsAddress({
        quoted,
        isOutbound: true,
        boundAddress: 'someone-else.near',
      }),
    ).toBe(false);
  });

  // A route quoted blank is the one that cannot be committed at all: the
  // provider refuses the route id rather than the swap call, so filling the
  // address in later does not rescue it.
  it('rejects a quote taken with no address at all', () => {
    expect(
      quoteBindsAddress({
        quoted: { sourceAddress: EPHEMERAL, destinationAddress: '' },
        isOutbound: true,
        boundAddress: 'zingolabs.near',
      }),
    ).toBe(false);
  });

  it('rejects every quote while there is no address to bind', () => {
    expect(
      quoteBindsAddress({ quoted, isOutbound: true, boundAddress: '' }),
    ).toBe(false);
  });

  it('has no quote to judge before the first one lands', () => {
    expect(
      quoteBindsAddress({
        quoted: null,
        isOutbound: true,
        boundAddress: 'zingolabs.near',
      }),
    ).toBe(false);
  });

  // Inbound reads the other side of the pair: the user's address is where a
  // refund goes, not where the swap lands.
  it('reads the source side when buying ZEC', () => {
    const inbound = {
      sourceAddress: 'zingolabs.near',
      destinationAddress: EPHEMERAL,
    };
    expect(
      quoteBindsAddress({
        quoted: inbound,
        isOutbound: false,
        boundAddress: 'zingolabs.near',
      }),
    ).toBe(true);
    expect(
      quoteBindsAddress({
        quoted: inbound,
        isOutbound: true,
        boundAddress: 'zingolabs.near',
      }),
    ).toBe(false);
  });
});
