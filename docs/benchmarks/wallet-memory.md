# Wallet file memory benchmark

Peak memory while the app loads and saves a synced wallet file, measured
on a device by `scripts/bench_wallet_memory.mts`. The script pushes a
wallet file, runs the `WalletMemoryBenchmark` class on each platform,
and inserts a row above the platform marker, at the end of its table. Every number is the peak
growth over the level at the start of the operation, sampled every
millisecond. zingolib clears its save flag on every read, so the
benchmark dirties the wallet with one new address between the load and
the save, and asserts the file changed.

The default fixture is zingolib's synced testnet example
`testnet/glory_goddess/latest/zingo-wallet.dat`, read from the cargo
checkout that `rust/Cargo.lock` pins. Pass `--fixture` for another file.

```
yarn bench:wallet-memory                 # both platforms
yarn bench:wallet-memory --platform ios  # one platform
```

Android needs a connected device or a booted emulator. iOS needs a
booted simulator, or `--simulator <udid>`.

## Android

Native heap is `Debug.getNativeHeapAllocatedSize`, where Rust allocates.
Java heap is the runtime's used memory, where Kotlin buffers would live.
RSS is the resident set from `/proc/self/statm`.

| Date | Commit | Device | Fixture | Load native | Load Java | Load RSS | Save native | Save Java | Save RSS |
|---|---|---|---|---|---|---|---|---|---|
| 2026-09-03 | 9bfe4488c | sdk_gphone64_arm64 | glory_goddess 9.2 MiB | 30.4 MiB | 1.0 MiB | 29.6 MiB | 0.7 MiB | 1.0 MiB | 2.4 MiB |
<!-- android rows -->

## iOS

Malloc is `malloc_zone_statistics` bytes in use across all zones.
Footprint is `task_vm_info.phys_footprint`, the number the Xcode memory
gauge shows.

| Date | Commit | Device | Fixture | Load malloc | Load footprint | Save malloc | Save footprint |
|---|---|---|---|---|---|---|---|
| 2026-09-03 | 9bfe4488c | iPhone 17 Pro (simulator) | glory_goddess 9.2 MiB | 30.0 MiB | 23.7 MiB | 0.7 MiB | 0.1 MiB |
<!-- ios rows -->

## Before the streaming rework

The buffer-based paths of every release before the streaming rework were not
measured with this harness. By their construction a load held the file
bytes, their base64 text, the UTF-8 copy crossing the bridge, the Rust
decode, and one clone per chain attempt, about 5.7 times the file, and a
save held the export buffer plus its read-back, twice the file, all on
top of the wallet object itself.
