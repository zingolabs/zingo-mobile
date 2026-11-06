import { saplingReceiverOf } from '@app/swap/saplingReceiver';

/** A real Maya payout: the unified address in the memo, the `zs1…` Midgard indexed it under. */
const UA_ORCHARD_SAPLING =
  'u1al9gxy2marwsn6l33ml8gjgjdfj90lxa02eekw8cajnpjhgra5l08v739f9j9w0tfvzzw3tykq4patssk8apgyhply9n5zdu9ek9e7y8djl3gcaww2fvv96vrf3dq6kasxh00q8sgg0a8mw8zszsj3l5629y4h0nxu6vd5ls9ced0gux';
const ITS_SAPLING =
  'zs1k6xpp9f62jfqdmg6dwl2u7rsj8k87m97phtzmea5l4hfplpt5y5dn9qe8umplqhvvfmp52eh3n4';
const UA_ORCHARD_ONLY =
  'u1xv5zpekg5zuteger320pcdjwmxy5nhk6ereavvdnks4sulf8c76m0hr7s46gl6asq0y7lz4ff3zxqpx5srdwv0u3l6et2cyqnyeer4dq';

describe('saplingReceiverOf', () => {
  it('Tests that it finds the receiver Midgard indexes a Maya payout under when the address has one', () => {
    expect(saplingReceiverOf(UA_ORCHARD_SAPLING)).toBe(ITS_SAPLING);
  });

  it('Tests that it reads an address written in capitals when the address has a Sapling receiver', () => {
    expect(saplingReceiverOf(UA_ORCHARD_SAPLING.toUpperCase())).toBe(
      ITS_SAPLING,
    );
  });

  it('Tests that it finds nothing when the unified address has only an Orchard receiver', () => {
    expect(saplingReceiverOf(UA_ORCHARD_ONLY)).toBeUndefined();
  });

  it('Tests that it finds nothing when one character of the address is wrong', () => {
    const wrong = `${UA_ORCHARD_SAPLING.slice(0, -1)}q`;

    expect(saplingReceiverOf(wrong)).toBeUndefined();
  });

  it('Tests that it finds nothing when the address is not a unified one', () => {
    expect(
      saplingReceiverOf('t1e4VsppjrCtyyGjJgqVHmwFygT8KVD7UW7'),
    ).toBeUndefined();
    expect(saplingReceiverOf(ITS_SAPLING)).toBeUndefined();
    expect(saplingReceiverOf('')).toBeUndefined();
  });
});
