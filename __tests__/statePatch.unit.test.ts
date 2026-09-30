import {
  AddressKindEnum,
  TransparentAddressClass,
  UnifiedAddressClass,
} from '@app/AppState';
import { changes, lastUnified } from '@app/AppState/statePatch';
import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';

const unified = (index: number, address: string) =>
  new UnifiedAddressClass(index, address, AddressKindEnum.u, true, true, true);

const transparent = (index: number, address: string) =>
  new TransparentAddressClass(
    index,
    address,
    AddressKindEnum.t,
    RPCAddressScopeEnum.external,
  );

describe('changes', () => {
  it('Tests that a patch reads as unchanged when every field is deep-equal to the state.', () => {
    const state = { balance: { orchard: 1 }, version: 'v1' };

    expect(changes(state, { balance: { orchard: 1 } })).toBe(false);
  });

  it('Tests that a patch reads as changed when one field differs from the state.', () => {
    const state = { balance: { orchard: 1 }, version: 'v1' };

    expect(changes(state, { balance: { orchard: 1 }, version: 'v2' })).toBe(
      true,
    );
  });
});

describe('lastUnified', () => {
  it('Tests that the most recent unified address wins when the list mixes kinds.', () => {
    const list = [
      unified(0, 'u1first'),
      transparent(0, 't1'),
      unified(1, 'u1last'),
    ];

    expect(lastUnified(list)).toBe('u1last');
  });

  it('Tests that the result is the empty string when the list holds no unified address.', () => {
    expect(lastUnified([transparent(0, 't1')])).toBe('');
    expect(lastUnified([])).toBe('');
  });
});
