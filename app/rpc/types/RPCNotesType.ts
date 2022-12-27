import { RPCOrchardNoteType } from './RPCOrchardNoteType';
import { RPCSaplingNoteType } from './RPCSaplingNoteType';
import { RPCUtxoNoteType } from './RPCUtxoNoteType';

export type RPCNotesType = {
  unspent_sapling_notes: RPCSaplingNoteType[];
  pending_sapling_notes: RPCSaplingNoteType[];

  unspent_orchard_notes: RPCOrchardNoteType[];
  pending_orchard_notes: RPCOrchardNoteType[];

  utxos: RPCUtxoNoteType[];
  pending_utxos: RPCUtxoNoteType[];
};
