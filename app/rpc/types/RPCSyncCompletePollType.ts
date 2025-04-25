
export type RPCSyncCompletePollType = {
    sync_start_height: number,
    sync_end_height: number,
    scanned_blocks: number,
    scanned_sapling_outputs: number,
    scanned_orchard_outputs: number
};
