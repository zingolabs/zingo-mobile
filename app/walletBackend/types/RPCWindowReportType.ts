// One row of the window calendar returned by zingolib's `window_timeline`
// (native `windowTimelineProcess`), for a schedule screen's grid. Heights are
// in blocks, values in zatoshis. The whole call returns null (RPCWindowTimeline
// below) before the wallet has ever synced.
export type RPCWindowReportType = {
  bucket_index: number;
  // The window's opening boundary (inclusive), also the parts' anchor height.
  boundary: number;
  // The window's closing height (exclusive): the next boundary.
  close: number;
  // Whether the chain tip is inside this window ("you are here").
  is_current: boolean;
  // Parts assigned to this window.
  parts_total: number;
  // Parts of this window confirmed into Ironwood.
  parts_confirmed: number;
  // Total value assigned to this window.
  value_total: number;
  // Value confirmed into Ironwood from this window.
  value_migrated: number;
};

// The full timeline, earliest first, or null when the wallet has never synced.
// Exists with or without a migration: the window the tip sits in is always
// present (zero tallies when nothing is scheduled there).
export type RPCWindowTimelineType = RPCWindowReportType[] | null;
