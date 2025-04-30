
export type RPCSyncCompletePollType = {
    sync_start_height: number,
    sync_end_height: number,
    blocks_scanned: number,
    sapling_outputs_scanned: number,
    orchard_outputs_scanned: number
};
