import { OrchardNoteType } from './OrchardNoteType';
import { SaplingNoteType } from './SaplingNoteType';
import { UtxoNoteType } from './UtxoNoteType';

export type NotesType = {
  unspent_sapling_notes: SaplingNoteType[];
  pending_sapling_notes: SaplingNoteType[];

  unspent_orchard_notes: OrchardNoteType[];
  pending_orchard_notes: OrchardNoteType[];

  utxos: UtxoNoteType[];
  pending_utxos: UtxoNoteType[];
};
