//
//  RPCModule.swift
//  Zingo
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import CryptoKit
import Foundation
import React

/// The formats a wallet file on disk can hold, told apart by its first
/// bytes: raw zingolib bytes start with a small u64 LE version, the legacy
/// text format is base64 of those bytes and starts with ASCII.
enum WalletFileFormat {
  case plainWallet
  case base64Text
  case unknown
  case unreadable
}

/// Owns the plain wallet-file path discipline: the temp-then-rename write
/// under one writer lock, the header routing, the resting protection
/// attributes, and the one-time decode of the legacy text format. The
/// wallet bytes never pass through here as a whole: whatever fills the
/// temp file streams them, Rust for a save and a chunked decode or a file
/// copy for a migration.
enum PlainWalletFile {
  private static let writeLock = NSRecursiveLock()
  private static let decodeChunk = 64 * 1024
  private static var tempSerial: UInt64 = 0

  /// The temps a writer of this process is filling right now, kept out of
  /// every sweep.
  private static var liveTemps = Set<String>()

  static let tempSuffix = ".plain.tmp"

  static func tempPath(_ path: String) -> String { path + tempSuffix }

  /// A temp beside the final path, unique per write so two fills never
  /// share a file, and registered as live until its writer is done.
  static func newTemp(_ path: String) -> String {
    writeLock.lock()
    defer { writeLock.unlock() }
    tempSerial += 1
    let temp = "\(tempPath(path)).\(getpid()).\(tempSerial)"
    liveTemps.insert(temp)
    return temp
  }

  private static func release(_ temp: String) {
    writeLock.lock()
    liveTemps.remove(temp)
    writeLock.unlock()
    try? FileManager.default.removeItem(atPath: temp)
  }

  /// Every temp of `path` beside it that no live writer of this process
  /// owns: the leftovers of a killed process.
  static func staleTemps(_ path: String) -> [String] {
    let dir = (path as NSString).deletingLastPathComponent
    let prefix = ((path as NSString).lastPathComponent) + tempSuffix
    let names = (try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? []
    writeLock.lock()
    defer { writeLock.unlock() }
    return names.filter { $0.hasPrefix(prefix) }.map { "\(dir)/\($0)" }.filter { !liveTemps.contains($0) }
  }

  static func deleteTemps(_ path: String) {
    for temp in staleTemps(path) { try? FileManager.default.removeItem(atPath: temp) }
  }

  /// Runs file work under the writer lock.
  static func locked<T>(_ block: () throws -> T) rethrows -> T {
    writeLock.lock()
    defer { writeLock.unlock() }
    return try block()
  }

  /// Fills a fresh temp through `fill` outside the lock, then under the
  /// lock asks `commit`, confirms the header, and renames the temp onto
  /// `path`, which keeps its old content until then. The temp exists with
  /// the resting protection before `fill` writes a byte: a truncating open
  /// keeps that inode, and a fill that replaces the file reapplies it.
  /// `fill` or `commit` answering false abandons the write. Returns
  /// whether `path` changed.
  static func write(_ path: String, commit: () -> Bool = { true }, fill: (String) throws -> Bool) throws -> Bool {
    let fm = FileManager.default
    let temp = newTemp(path)
    defer { release(temp) }
    guard fm.createFile(atPath: temp, contents: nil) else {
      throw ZingolibError.Save(message: "cannot create the wallet temp: \(String(cString: strerror(errno)))")
    }
    try applyProtection(temp)
    guard try fill(temp) else { return false }
    guard format(temp) == .plainWallet else {
      throw ZingolibError.Save(message: "refusing to install the temp as the wallet file, the file is not a plain wallet")
    }
    writeLock.lock()
    defer { writeLock.unlock() }
    guard commit() else { return false }
    guard rename(temp, path) == 0 else {
      throw ZingolibError.Save(message: "could not rename the temp onto the wallet file: \(String(cString: strerror(errno)))")
    }
    syncDirectory(of: path)
    deleteTemps(path)
    return true
  }

  /// The migration's write: under the lock, a file that already reads
  /// plain is left untouched.
  static func migrateIfStillLegacy(_ path: String, fill: (String) throws -> Bool) throws -> Bool {
    try locked {
      if format(path) == .plainWallet { return false }
      return try write(path, fill: fill)
    }
  }

  /// Makes a rename in the directory of `path` durable.
  static func syncDirectory(of path: String) {
    let dir = (path as NSString).deletingLastPathComponent
    let fd = open(dir, O_RDONLY)
    if fd >= 0 {
      fsync(fd)
      close(fd)
    }
  }

  /// Wallet files rest under OS protection alone: hardware encryption at
  /// rest (class C, key available after the first post-boot unlock, so
  /// background sync can save while the screen is locked), the app
  /// sandbox, and backup exclusion. Class `complete` locked the file
  /// seconds after screen lock and broke background saves. Backup
  /// exclusion is the guard against restoring a stale wallet over a
  /// newer one and must never regress.
  static func applyProtection(_ path: String) throws {
    var fileURL = URL(fileURLWithPath: path)
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try fileURL.setResourceValues(resourceValues)
    try FileManager.default.setAttributes(
      [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
      ofItemAtPath: path
    )
  }

  /// The first 16 bytes of the file, fewer when the file is shorter, empty
  /// when it is missing, absent when it exists but cannot be opened.
  static func header(_ path: String) -> Data? {
    guard let handle = FileHandle(forReadingAtPath: path) else {
      return FileManager.default.fileExists(atPath: path) ? nil : Data()
    }
    defer { try? handle.close() }
    return (try? handle.read(upToCount: 16)) ?? Data()
  }

  static func format(_ path: String) -> WalletFileFormat {
    guard let head = header(path) else { return .unreadable }
    if looksLikePlainWallet(head) { return .plainWallet }
    if looksLikeBase64Text(head) { return .base64Text }
    return .unknown
  }

  // zingolib currently writes 42; accept up to 1_000 to leave headroom for
  // future formats without misreading text or an envelope as a version.
  static func looksLikePlainWallet(_ bytes: Data) -> Bool {
    guard bytes.count >= 8 else { return false }
    var version: UInt64 = 0
    for (offset, byte) in bytes.prefix(8).enumerated() {
      version |= UInt64(byte) << (8 * UInt64(offset))
    }
    return version <= 1000
  }

  static func looksLikeBase64Text(_ bytes: Data) -> Bool {
    !bytes.isEmpty && bytes.allSatisfy(isBase64Byte)
  }

  private static func isBase64Byte(_ byte: UInt8) -> Bool {
    switch byte {
    case UInt8(ascii: "A")...UInt8(ascii: "Z"),
         UInt8(ascii: "a")...UInt8(ascii: "z"),
         UInt8(ascii: "0")...UInt8(ascii: "9"),
         UInt8(ascii: "+"), UInt8(ascii: "/"), UInt8(ascii: "="):
      return true
    default:
      return false
    }
  }

  /// Decodes the base64 text at `textPath` into `rawPath` in aligned
  /// chunks, so the buffer stays at the chunk size whatever the wallet
  /// size. A tail shorter than one quantum cannot finish and is dropped,
  /// which lets a truncated text file still yield its stable prefix.
  static func decodeBase64Text(from textPath: String, to rawPath: String) throws {
    let fm = FileManager.default
    guard let input = FileHandle(forReadingAtPath: textPath) else {
      throw ZingolibError.Read(message: "cannot open the wallet file text")
    }
    defer { try? input.close() }
    guard fm.createFile(atPath: rawPath, contents: nil) else {
      throw ZingolibError.Save(message: "cannot create the plain copy of the wallet")
    }
    try applyProtection(rawPath)
    guard let output = FileHandle(forWritingAtPath: rawPath) else {
      throw ZingolibError.Save(message: "cannot open the plain copy of the wallet")
    }
    defer { try? output.close() }
    var carry = Data()
    while let chunk = try input.read(upToCount: decodeChunk), !chunk.isEmpty {
      carry.append(chunk)
      let usable = carry.count - carry.count % 4
      if usable == 0 { continue }
      guard let decoded = Data(base64Encoded: Data(carry.prefix(usable))) else {
        throw ZingolibError.Read(message: "the wallet file text does not decode as base64")
      }
      try output.write(contentsOf: decoded)
      carry = Data(carry.suffix(from: usable))
    }
    try output.synchronize()
  }

  /// The SHA-256 of the file, streamed.
  static func digest(_ path: String) throws -> Data {
    guard let handle = FileHandle(forReadingAtPath: path) else {
      throw ZingolibError.Read(message: "cannot open the wallet file")
    }
    defer { try? handle.close() }
    var hasher = SHA256()
    while let chunk = try handle.read(upToCount: decodeChunk), !chunk.isEmpty {
      hasher.update(data: chunk)
    }
    return Data(hasher.finalize())
  }

  static func sameContent(_ a: String, _ b: String) throws -> Bool {
    let fm = FileManager.default
    let sizeA = try fm.attributesOfItem(atPath: a)[.size] as? UInt64
    let sizeB = try fm.attributesOfItem(atPath: b)[.size] as? UInt64
    guard sizeA == sizeB else { return false }
    return try digest(a) == digest(b)
  }
}

/// The outcome of an FFI call, classified by channel alone
/// (zingo-mobile#1151): the value a call returns is resolved verbatim —
/// never inspected for an error sentinel — and a thrown ZingolibError is
/// rejected under its variant's name, the stable rejection code shared by
/// every bridge (Kotlin, Swift, TS). Any other thrown error rejects as
/// "Unknown". Classification (`of`) is pure — no I/O, no logging, no
/// platform dependencies — so it runs under plain XCTest unit tests.
/// Settling touches only the promise blocks.
enum FfiOutcome {
  case resolved(String)
  case rejected(code: String, message: String, error: Error)

  /// The one variant→(code, message) mapping. Exhaustive on purpose —
  /// no default — so when the generated ZingolibError gains a variant
  /// this switch fails compilation instead of silently degrading the
  /// new variant to "Unknown".
  static func classify(_ error: ZingolibError) -> (code: String, message: String) {
    switch error {
    case .LightclientNotInitialized(let message): return ("LightclientNotInitialized", message)
    case .LightclientLockPoisoned(let message): return ("LightclientLockPoisoned", message)
    case .Panic(let message): return ("Panic", message)
    case .Save(let message): return ("Save", message)
    case .Init(let message): return ("Init", message)
    case .Sync(let message): return ("Sync", message)
    case .Rescan(let message): return ("Rescan", message)
    case .Read(let message): return ("Read", message)
    case .Send(let message): return ("Send", message)
    case .Shield(let message): return ("Shield", message)
    case .InvalidInput(let message): return ("InvalidInput", message)
    case .Wallet(let message): return ("Wallet", message)
    case .Indexer(let message): return ("Indexer", message)
    case .Offline(let message): return ("Offline", message)
    case .SideChannelPoisoned(let message): return ("SideChannelPoisoned", message)
    case .MigrationNotInProgress(let message): return ("MigrationNotInProgress", message)
    case .MigrationAlreadyInProgress(let message): return ("MigrationAlreadyInProgress", message)
    case .MigrationConsentStale(let message): return ("MigrationConsentStale", message)
    case .MigrationCadenceFixed(let message): return ("MigrationCadenceFixed", message)
    case .MigrationSplit(let message): return ("MigrationSplit", message)
    case .Migration(let message): return ("Migration", message)
    case .Mixnet(let message): return ("Mixnet", message)
    }
  }

  static func of(_ call: () throws -> String) -> FfiOutcome {
    do {
      return .resolved(try call())
    } catch let error as ZingolibError {
      let (code, message) = FfiOutcome.classify(error)
      return .rejected(code: code, message: message, error: error)
    } catch {
      return .rejected(code: "Unknown", message: String(describing: error), error: error)
    }
  }

  func settle(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    switch self {
    case .resolved(let value):
      DispatchQueue.main.async {
        resolve(value)
      }
    case .rejected(let code, let message, let error):
      NSLog("[Native] FFI rejected \(code). \(message)")
      DispatchQueue.main.async {
        reject(code, message, error)
      }
    }
  }
}

/// Pure parsers for the bridge's string-crossing numeric arguments. A
/// malformed or overflowing value throws the typed InvalidInput — the same
/// code and message shape the Android bridge rejects with — never a silent
/// default and never an unsettled promise. Pure — no I/O, no platform
/// dependencies — so the parsers run under plain XCTest unit tests.
enum FfiArgs {
  static func requiredU32(_ raw: String, name: String) throws -> UInt32 {
    guard let parsed = UInt32(raw) else {
      throw ZingolibError.InvalidInput(message: "\(name) must be a u32: \"\(raw)\"")
    }
    return parsed
  }

  /// Empty means absent — the module's "keep the default" convention.
  static func optionalU32(_ raw: String, name: String) throws -> UInt32? {
    raw.isEmpty ? nil : try requiredU32(raw, name: name)
  }

  static func requiredU64(_ raw: String, name: String) throws -> UInt64 {
    guard let parsed = UInt64(raw) else {
      throw ZingolibError.InvalidInput(message: "\(name) must be a u64: \"\(raw)\"")
    }
    return parsed
  }
}

@objc(RPCModule)
class RPCModule: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
      return true
  }
  
  enum FileError: Error {
    case documentsDirectoryNotFoundError(String)
    case readWalletError(String)
    case saveFileError(String)
    case writeFileError(String)
    case deleteFileError(String)
  }
  
  func getDocumentsDirectory() throws -> String {
    let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
    guard let pathsFirst = paths.first else {
      throw FileError.documentsDirectoryNotFoundError("Error: [Native] Documents directory could not be located.")
    }
    return pathsFirst
  }
  
  // Set by delete and restore, cleared by the next successful wallet
  // init: a stray save of the in-memory wallet must not resurrect a file
  // the user replaced.
  static var walletFileClosed = false
  static let walletFileHold = NSLock()

  // The flag is written under the writer lock, which orders it with every
  // save's commit, and under its own hold for the readers that take none.
  static func setWalletFileClosed(_ closed: Bool) {
    PlainWalletFile.locked {
      walletFileHold.lock()
      walletFileClosed = closed
      walletFileHold.unlock()
    }
  }

  func reopenWalletFile() {
    RPCModule.setWalletFileClosed(false)
  }

  func getFileName(_ file: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let fileName = "\(documentsDirectory)/\(file)"
    return fileName
  }
  
  func fileExists(_ fileName: String) throws -> String {
    let fileExists = try FileManager.default.fileExists(atPath: getFileName(fileName))
    if fileExists {
      NSLog("[Native] File exists \(fileName)")
      return "true"
    } else {
      NSLog("[Native] File DOES not exists \(fileName)")
      return "false"
    }
  }
  
  func deleteFile(_ fileName: String) throws {
    try FileManager.default.removeItem(atPath: getFileName(fileName))
  }

  // Moves existing wallet files to the resting protection this build
  // writes: class C plus backup exclusion. Old builds wrote class A, and
  // a synced wallet can open without a save.
  func applyWalletFileProtection() {
    let fm = FileManager.default
    for name in [Constants.WalletFileName.rawValue, Constants.WalletBackupFileName.rawValue] {
      guard let path = try? getFileName(name), fm.fileExists(atPath: path) else { continue }
      try? PlainWalletFile.applyProtection(path)
    }
  }

  // The plain-format path of a wallet file. Raw zingolib bytes answer
  // directly. The legacy base64 text format every build before this one
  // wrote migrates in the same call: the text decodes in chunks into the
  // plain temp, the temp runs the full parse, and the rename is the only
  // step that touches the text path, so a failure anywhere leaves the
  // text file as it was for the next launch.
  func resolveWalletFile(_ name: String) throws -> String {
    let path = try getFileName(name)
    switch PlainWalletFile.format(path) {
    case .plainWallet:
      return path
    case .base64Text:
      let migrated = try PlainWalletFile.migrateIfStillLegacy(path) { temp in
        try PlainWalletFile.decodeBase64Text(from: path, to: temp)
        try validateWalletFile(path: temp)
        return true
      }
      if migrated {
        NSLog("[Native] \(name) migrated from base64 text to plain wallet bytes")
      }
      return path
    case .unreadable:
      throw ZingolibError.Read(message: "the wallet file \(name) exists but cannot be opened")
    case .unknown:
      guard FileManager.default.fileExists(atPath: path) else {
        throw ZingolibError.Read(message: "the wallet file \(name) does not exist")
      }
      throw ZingolibError.Read(message: "the wallet file \(name) is neither plain wallet bytes nor base64 text")
    }
  }

  // Installs a validated plain copy of `source` under `name`. The copy is
  // compared with its source by digest before the rename, all under the
  // writer lock so no install replaces the source meanwhile.
  func writePlainCopy(of source: String, to name: String) throws {
    let path = try getFileName(name)
    try PlainWalletFile.locked {
      try validateWalletFile(path: source)
      _ = try PlainWalletFile.write(path) { temp in
        try FileManager.default.removeItem(atPath: temp)
        try FileManager.default.copyItem(atPath: source, toPath: temp)
        try PlainWalletFile.applyProtection(temp)
        guard try PlainWalletFile.sameContent(source, temp) else {
          throw ZingolibError.Save(message: "the copy for \(name) differs from its source")
        }
        return true
      }
    }
  }

  // Test seam: runs inside the save's fill, before Rust writes the temp.
  var beforeSaveFill: () -> Void = {}

  // Audit Issue P (b) — wallet ↔ backup swap recovery.
  //
  // `restoreExistingWalletBackup` does its swap as three atomic renames:
  //   (1) main → temp
  //   (2) backup → main
  //   (3) temp → backup
  // A crash between (1)–(2) or (2)–(3) leaves the temp file on disk.
  // Calling this helper at startup detects that and finishes the swap.
  //
  // Possible interrupted states (temp exists, by construction):
  //   between (1)–(2): main does NOT exist → complete (2) then (3)
  //   between (2)–(3): main exists, backup does NOT → complete (3)
  //   all three present: a save landed between the renames. The temp is
  //   the pre-swap main, and content comparison picks the window, as on
  //   Android.
  // Every branch ends at the intended final state. Idempotent — when no
  // temp file is present this is a near-zero-cost no-op.
  func completePendingSwap() {
    let fm = FileManager.default
    guard let tempPath = try? getFileName(Constants.WalletTempSwapFileName.rawValue),
          fm.fileExists(atPath: tempPath) else { return }
    guard let mainPath = try? getFileName(Constants.WalletFileName.rawValue),
          let backupPath = try? getFileName(Constants.WalletBackupFileName.rawValue) else {
      NSLog("Error: [Native] completePendingSwap: could not resolve wallet paths")
      return
    }
    PlainWalletFile.locked {
      completePendingSwapLocked(mainPath: mainPath, backupPath: backupPath, tempPath: tempPath)
    }
  }

  // Every move into a wallet slot runs the full parse on its source first,
  // so a truncated or foreign temp never becomes a wallet file. The temp
  // and the slots resolve their format on the way, which migrates a
  // legacy text file in place.
  private func completePendingSwapLocked(mainPath: String, backupPath: String, tempPath: String) {
    let fm = FileManager.default
    do {
      let temp = try resolveWalletFile(Constants.WalletTempSwapFileName.rawValue)
      try validateWalletFile(path: temp)
      if !fm.fileExists(atPath: mainPath) {
        if fm.fileExists(atPath: backupPath) {
          let backup = try resolveWalletFile(Constants.WalletBackupFileName.rawValue)
          try validateWalletFile(path: backup)
          try fm.moveItem(atPath: backup, toPath: mainPath)
        }
        try fm.moveItem(atPath: temp, toPath: backupPath)
      } else if !fm.fileExists(atPath: backupPath) {
        try fm.moveItem(atPath: temp, toPath: backupPath)
      } else {
        let main = try resolveWalletFile(Constants.WalletFileName.rawValue)
        let backup = try resolveWalletFile(Constants.WalletBackupFileName.rawValue)
        if try PlainWalletFile.sameContent(main, temp) {
          try validateWalletFile(path: backup)
          try fm.removeItem(atPath: main)
          try fm.moveItem(atPath: backup, toPath: mainPath)
          try fm.moveItem(atPath: temp, toPath: backupPath)
        } else if try PlainWalletFile.sameContent(backup, temp) {
          try fm.removeItem(atPath: temp)
        } else if try PlainWalletFile.sameContent(main, backup) {
          // (2)–(3) window: main already holds the backup, the retained
          // slot still waits for the original main.
          try fm.removeItem(atPath: backup)
          try fm.moveItem(atPath: temp, toPath: backupPath)
        } else {
          // Three distinct contents: no window matches, and any pick could
          // destroy a wallet. The temp becomes an orphan evidence copy that
          // no path installs, and both slots hold their place.
          let orphan = "\(tempPath).orphan.\(Int(Date().timeIntervalSince1970 * 1000))"
          try fm.moveItem(atPath: temp, toPath: orphan)
          NSLog("[Native] completePendingSwap: three distinct wallet files, swap temp kept as an orphan")
          return
        }
      }
      NSLog("[Native] completePendingSwap: interrupted swap recovered")
    } catch {
      NSLog("Error: [Native] completePendingSwap failed: \(error.localizedDescription)")
    }
  }
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    completePendingSwap()
    applyWalletFileProtection()
    do {
      let result = try fileExists(Constants.WalletFileName.rawValue)
      DispatchQueue.main.async {
        resolve(result)
      }
    } catch {
      NSLog("Error: [Native] wallet exists error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    completePendingSwap()
    applyWalletFileProtection()
    do {
      let result = try fileExists(Constants.WalletBackupFileName.rawValue)
      DispatchQueue.main.async {
        resolve(result)
      }
    } catch {
      NSLog("Error: [Native] wallet backup exists error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  // The background sync state is written from BGAppRefreshTask paths in
  // AppDelegate while the device may be locked. It stays at the iOS
  // default protection class (`completeUntilFirstUserAuthentication`
  // since iOS 7) and outside the wallet path discipline because the
  // sync metadata stored here is not wallet-recovery material and needs
  // no backup exclusion.
  func saveBackgroundFile(_ jsonString: String) throws {
    do {
      // the content of this JSON can be represented safely in utf8.
      try jsonString.write(toFile: getFileName(Constants.BackgroundFileName.rawValue), atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error: [Native] writting background file error: \(error.localizedDescription)")
    }
  }

  // Whether the swap temp, resolved to its plain format, holds a copy of
  // `slot`. A temp that cannot be read answers false.
  func swapHoldsCopy(of slot: String) -> Bool {
    guard let swap = try? resolveWalletFile(Constants.WalletTempSwapFileName.rawValue),
          FileManager.default.fileExists(atPath: slot) else { return false }
    return (try? PlainWalletFile.sameContent(swap, slot)) ?? false
  }

  // Under the writer lock, so a save in flight cannot install its temp
  // after the unlink: its commit sees the closed flag. Every plain copy
  // beside the wallet goes with it. A swap temp that is a copy of the
  // deleted wallet goes with it, one the swap recovery cannot place
  // becomes an orphan evidence copy, and one that cannot be read stays.
  func fnDeleteExistingWallet() throws {
    let main = try getFileName(Constants.WalletFileName.rawValue)
    let swap = try getFileName(Constants.WalletTempSwapFileName.rawValue)
    try PlainWalletFile.locked {
      if swapHoldsCopy(of: main) {
        try? FileManager.default.removeItem(atPath: swap)
      } else {
        completePendingSwap()
      }
      do {
        try FileManager.default.removeItem(atPath: main)
      } catch {
        throw FileError.deleteFileError("Error: [Native] deleting wallet error: \(error.localizedDescription)")
      }
      RPCModule.setWalletFileClosed(true)
      for suffix in [".broken", ".salvage.tmp"] {
        try? FileManager.default.removeItem(atPath: main + suffix)
      }
      PlainWalletFile.deleteTemps(main)
      PlainWalletFile.deleteTemps(swap)
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      if try fileExists(Constants.WalletFileName.rawValue) == "true" {
        try self.fnDeleteExistingWallet()
        DispatchQueue.main.async {
          resolve("true")
        }
      } else {
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } catch {
      NSLog("Error: [Native] deleting wallet \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }
  
  func fnDeleteExistingWalletBackup() throws {
    let backup = try getFileName(Constants.WalletBackupFileName.rawValue)
    let swap = try getFileName(Constants.WalletTempSwapFileName.rawValue)
    try PlainWalletFile.locked {
      if swapHoldsCopy(of: backup) {
        try? FileManager.default.removeItem(atPath: swap)
      } else {
        completePendingSwap()
      }
      do {
        try FileManager.default.removeItem(atPath: backup)
      } catch {
        throw FileError.deleteFileError("Error: [Native] deleting wallet backup error: \(error.localizedDescription)")
      }
      PlainWalletFile.deleteTemps(backup)
    }
  }

  @objc(deleteExistingWalletBackup:reject:)
  func deleteExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      if try fileExists(Constants.WalletBackupFileName.rawValue) == "true" {
        try self.fnDeleteExistingWalletBackup()
        DispatchQueue.main.async {
          resolve("true")
        }
      } else {
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } catch {
      NSLog("Error: [Native] deleting wallet backup\(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  // The FFI contract is structural (zingo-mobile#1151; audit Issue Q):
  // Rust streams the wallet into the temp path it is handed, verifies the
  // file by digest, and answers whether a save was needed; failure
  // throws. The rename is the only step that touches the final path, so
  // the file is byte-identical to a desktop zingolib wallet.
  func saveWalletInternal() throws {
    if RPCModule.walletFileClosed {
      NSLog("[Native] wallet file closed, save refused")
      return
    }
    let path = try getFileName(Constants.WalletFileName.rawValue)
    var refused = false
    let written: Bool
    do {
      written = try PlainWalletFile.write(
        path,
        commit: {
          refused = RPCModule.walletFileClosed
          return !refused
        }
      ) { temp in
        beforeSaveFill()
        return try saveWalletFile(tempPath: temp)
      }
    } catch {
      if RPCModule.walletFileClosed {
        NSLog("[Native] wallet file closed during the save, save abandoned: \(String(describing: error))")
        return
      }
      // Logged here, rethrown unwrapped: the FFI's typed error must reach
      // the bridge intact so it rejects under its own variant name, not
      // wrapped into a FileError that would reject as "Unknown".
      NSLog("Error: [Native] Couldn't save the wallet. \(String(describing: error))")
      throw error
    }
    if refused {
      NSLog("[Native] wallet file closed during the save, install refused")
    } else if written {
      let size = (try? FileManager.default.attributesOfItem(atPath: path)[.size] as? UInt64) ?? 0
      NSLog("[Native] file size: \(size) bytes")
    } else {
      NSLog("[Native] No need to save the wallet.")
    }
  }

  func saveWalletBackupInternal() throws {
    try PlainWalletFile.locked {
      if RPCModule.walletFileClosed {
        NSLog("[Native] wallet file closed, backup save refused")
        return
      }
      let main = try resolveWalletFile(Constants.WalletFileName.rawValue)
      try writePlainCopy(of: main, to: Constants.WalletBackupFileName.rawValue)
    }
  }

  func fnCreateNewWallet(
    serveruri: String,
    birthday: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String
  ) throws -> String {
    // initNew throws on failure, so reaching the save implies the wallet
    // exists. Offline (empty serveruri) uses `birthday` in place of the
    // chain tip; online it is ignored (pass "0").
    let seed = try initNew(serveruri: serveruri, birthday: UInt32(birthday) ?? 0, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    reopenWalletFile()
    let seedStr = String(seed)
    try self.saveWalletInternal()
    return seedStr
  }

  @objc(createNewWallet:birthday:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func createNewWallet(
    _ serveruri: String,
    birthday: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of {
      try self.fnCreateNewWallet(serveruri: serveruri, birthday: birthday, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }
  
  func fnRestoreWalletFromSeed(
    restoreSeed: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    // initFromSeed throws on failure, so reaching the save implies the wallet exists.
    let seed = try initFromSeed(seed: restoreSeed, birthday: UInt32(birthday) ?? 0, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    let seedStr = String(seed)
    reopenWalletFile()
    try self.saveWalletInternal()
    return seedStr
  }

  @objc(restoreWalletFromSeed:birthday:serveruri:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func restoreWalletFromSeed(
    _ restoreSeed: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of {
      try self.fnRestoreWalletFromSeed(restoreSeed: restoreSeed, birthday: birthday, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }
  
  func fnRestoreWalletFromUfvk(
    restoreUfvk: String, 
    birthday: String,
    serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    // initFromUfvk throws on failure, so reaching the save implies the wallet exists.
    let ufvk = try initFromUfvk(ufvk: restoreUfvk, birthday: UInt32(birthday) ?? 0, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    let ufvkStr = String(ufvk)
    reopenWalletFile()
    try self.saveWalletInternal()
    return ufvkStr
  }

  @objc(restoreWalletFromUfvk:birthday:serveruri:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func restoreWalletFromUfvk(
    _ restoreUfvk: String, 
    birthday: String, 
    serveruri: String, 
    chainhint: String, 
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of {
      try self.fnRestoreWalletFromUfvk(restoreUfvk: restoreUfvk, birthday: birthday, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }

  func fnLoadExistingWallet(
    serveruri: String, 
    chainhint: String,
    performancelevel: String, 
    minconfirmations: String
  ) throws -> String {
    let path = try resolveWalletFile(Constants.WalletFileName.rawValue)
    let seed = try loadWalletFile(path: path, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
    reopenWalletFile()
    let seedStr = String(seed)
    return seedStr
  }

  @objc(loadExistingWallet:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func loadExistingWallet(
    _ serveruri: String, 
    chainhint: String, 
    performancelevel: String, 
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock, 
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of {
      try self.fnLoadExistingWallet(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations)
    }.settle(resolve: resolve, reject: reject)
  }

  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      // Recover any orphan temp from a prior crash before reading the
      // slots: it can move either of them, and the wallet this restore
      // validates must be the one it installs.
      self.completePendingSwap()
      let backupPath = try self.resolveWalletFile(Constants.WalletBackupFileName.rawValue)
      // The full parse guards the swap: only a wallet zingolib opens is
      // restorable.
      do {
        try validateWalletFile(path: backupPath)
      } catch {
        NSLog("Error: [Native] Couldn't restore the wallet backup. The content failed validation: \(String(describing: error))")
        DispatchQueue.main.async {
          resolve("false")
        }
        return
      }
      // Closed across the swap; the reload after the restore clears it. A
      // failure before the main slot changed reopens it.
      let wasClosed = RPCModule.walletFileClosed
      RPCModule.setWalletFileClosed(true)
      var mainChanged = false
      defer {
        if !mainChanged { RPCModule.setWalletFileClosed(wasClosed) }
      }
      if try fileExists(Constants.WalletFileName.rawValue) == "true" {
        // Audit Issue P (b) — atomic swap via three renames. APFS
        // rename is atomic AND preserves the file's protection class
        // and isExcludedFromBackup attribute, so this is strictly
        // safer than the previous read-into-memory + two writes
        // pattern, which lost the original main wallet on a crash
        // between writes. `completePendingSwap` (called early on
        // walletExists/walletBackupExists) finishes the swap if a
        // crash interrupts these three steps.
        let fm = FileManager.default
        let mainPath = try getFileName(Constants.WalletFileName.rawValue)
        let tempPath = try getFileName(Constants.WalletTempSwapFileName.rawValue)
        try PlainWalletFile.locked {
          try fm.moveItem(atPath: mainPath, toPath: tempPath)   // (1) main → temp
          do {
            try fm.moveItem(atPath: backupPath, toPath: mainPath)   // (2) backup → main
          } catch {
            // Main is back where it was, so the startup recovery has no
            // swap to finish for a restore that never began.
            try? fm.moveItem(atPath: tempPath, toPath: mainPath)
            throw error
          }
          mainChanged = true
          do {
            try fm.moveItem(atPath: tempPath, toPath: backupPath) // (3) temp → backup
          } catch {
            // Main already holds the backup: the restore happened. The
            // temp lets the startup recovery finish (3).
            NSLog("[Native] backup restore: retained copy pending, the startup recovery completes it: \(error.localizedDescription)")
          }
        }
      } else {
        // No wallet exists: restore backup as wallet, but KEEP the backup
        // file. Deleting it here left the user with no backup right after a
        // restore, so if they then created/restored a different wallet the
        // just-restored one was gone. Keeping a duplicate copy as backup is
        // far safer than none.
        try self.writePlainCopy(of: backupPath, to: Constants.WalletFileName.rawValue)
        mainChanged = true
      }
      DispatchQueue.main.async {
        resolve("true")
      }
    } catch {
      NSLog("Error: [Native] Restoring existing wallet backup error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  // Salvages seed and birthday from the stable prefix of the closed wallet
  // file and keeps the damaged file aside as ".broken". A legacy text
  // file decodes into a scratch copy first, its unfinishable tail
  // dropped, so a text file cut mid-quantum still yields its prefix.
  @objc(walletFileRecoveryInfo:reject:)
  func walletFileRecoveryInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        let fm = FileManager.default
        let mainPath = try self.getFileName(Constants.WalletFileName.rawValue)
        let scratch = "\(mainPath).salvage.tmp"
        defer { try? fm.removeItem(atPath: scratch) }
        let source: String
        switch PlainWalletFile.format(mainPath) {
        case .plainWallet:
          source = mainPath
        case .base64Text:
          source = scratch
          try PlainWalletFile.decodeBase64Text(from: mainPath, to: scratch)
        case .unreadable:
          throw ZingolibError.Read(message: "the wallet file exists but cannot be opened")
        case .unknown:
          throw ZingolibError.Read(message: "the wallet file is neither plain wallet bytes nor base64 text")
        }
        let salvaged = try readWalletRecoveryInfoFile(path: source)
        let brokenPath = "\(mainPath).broken"
        try? fm.removeItem(atPath: brokenPath)
        try? fm.copyItem(atPath: mainPath, toPath: brokenPath)
        return salvaged
      }.settle(resolve: resolve, reject: reject)
    }
  }

  // "plainWallet" when the file's first bytes, decoded first for the
  // legacy text format, carry a plausible zingolib version header,
  // truncated files included.
  func walletFileState(_ path: String) -> String {
    switch PlainWalletFile.format(path) {
    case .plainWallet:
      return "plainWallet"
    case .base64Text:
      let head = PlainWalletFile.header(path) ?? Data()
      let usable = head.count - head.count % 4
      guard let bytes = Data(base64Encoded: Data(head.prefix(usable))),
            PlainWalletFile.looksLikePlainWallet(bytes) else {
        return "unknown"
      }
      return "plainWallet"
    case .unknown, .unreadable:
      return "unknown"
    }
  }

  // The per-file diagnosis for the recovery dialog, in the Android report
  // format.
  func walletFileDiagnosis() -> [[String: Any]] {
    let fm = FileManager.default
    var files: [[String: Any]] = []
    for name in [Constants.WalletFileName.rawValue,
                 Constants.WalletBackupFileName.rawValue,
                 Constants.WalletTempSwapFileName.rawValue] {
      var entry: [String: Any] = [
        "name": name,
        "size": 0,
        "mtime": 0,
        "depth": 0,
        "repairable": false,
        "unwrapErrors": [String](),
      ]
      guard let path = try? getFileName(name), fm.fileExists(atPath: path) else {
        entry["state"] = "missing"
        files.append(entry)
        continue
      }
      if let attrs = try? fm.attributesOfItem(atPath: path) {
        entry["size"] = (attrs[.size] as? NSNumber)?.intValue ?? 0
        if let modified = attrs[.modificationDate] as? Date {
          entry["mtime"] = Int(modified.timeIntervalSince1970 * 1000)
        }
      }
      entry["state"] = walletFileState(path)
      files.append(entry)
    }
    return files
  }

  @objc(walletFileDiagnosisInfo:reject:)
  func walletFileDiagnosisInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        let json = try JSONSerialization.data(withJSONObject: ["files": self.walletFileDiagnosis()])
        guard let text = String(data: json, encoding: .utf8) else {
          throw ZingolibError.Read(message: "the wallet diagnosis does not encode as JSON text")
        }
        return text
      }.settle(resolve: resolve, reject: reject)
    }
  }

  // The save internals throw on failure, so success is the only value the
  // data channel carries ("true", kept for the JS seam's shape matrix);
  // failure rejects with the thrown error — never as prose or a sentinel
  // "false" in the success channel (zingo-mobile#1151 ask 4).
  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        try self.saveWalletInternal()
        return "true"
      }.settle(resolve: resolve, reject: reject)
    }
  }

  @objc(doSaveBackup:reject:)
  func doSaveBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        try self.saveWalletBackupInternal()
        return "true"
      }.settle(resolve: resolve, reject: reject)
    }
  }

  @objc(getLatestBlockServerInfo:resolve:reject:)
  func getLatestBlockServerInfo(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getLatestBlockServer(serveruri: serveruri)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getLatestBlockWalletInfo:reject:)
  func getLatestBlockWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getLatestBlockWallet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getDonationAddress:reject:)
  func getDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getDeveloperDonationAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getZenniesDonationAddress:reject:)
  func getZenniesDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getZenniesForZingoDonationAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getValueTransfersList:reject:)
  func getValueTransfersList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getValueTransfers()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(setCryptoDefaultProvider:reject:)
  func setCryptoDefaultProvider(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setCryptoDefaultProviderToRing()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // The app-supplied migration broadcast candidate pool (its indexer
  // registry); zingolib embeds no default set.
  @objc(setBroadcastCandidates:resolve:reject:)
  func setBroadcastCandidatesProcess(_ candidatesJson: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setBroadcastCandidates(candidatesJson: candidatesJson)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Mixnet Mode (send-over-nym). The wallet-side FFI seam, bridged on both
  // platforms; the local proxy is hosted separately by NymTransportModule.
  @objc(attachMixnet:exitNode:resolve:reject:)
  func attachMixnetProcess(_ socks5Addr: String, exitNode: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try attachMixnet(socks5Addr: socks5Addr, exitNode: exitNode)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(enableMixnet:resolve:reject:)
  func enableMixnetProcess(_ proxyPath: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try enableMixnet(proxyPath: proxyPath)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(disableMixnet:reject:)
  func disableMixnetProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try disableMixnet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(mixnetIndicatorInfo:reject:)
  func mixnetIndicatorInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try mixnetIndicator()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(mixnetBootstrapDetailInfo:reject:)
  func mixnetBootstrapDetailInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try mixnetBootstrapDetail()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(pollSyncInfo:reject:)
  func pollSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try pollSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(runSyncProcess:reject:)
  func runSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        // Persistence is owned by JS (SyncCoordinator → doSave when
        // getWalletSaveRequired returns true). Auto-saving here was
        // racing against that doSave on the same wallet.dat — two
        // background queues writing in parallel. Single source of truth
        // for save decisions = JS, matching the Android side.
        FfiOutcome.of {
          try runSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(pauseSyncProcess:reject:)
  func pauseSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try pauseSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(statusSyncInfo:reject:)
  func statusSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try statusSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(runRescanProcess:reject:)
  func runRescanProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try runRescan()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(infoServerInfo:reject:)
  func infoServerInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try infoServer()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getSeedInfo:reject:)
  func getSeedInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getSeed()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getUfvkInfo:reject:)
  func getUfvkInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getUfvk()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(changeServerProcess:resolve:reject:)
  func changeServerProcess(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try changeServer(serveruri: serveruri)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(walletKindInfo:reject:)
  func walletKindInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try walletKind()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(parseAddressInfo:resolve:reject:)
  func parseAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try parseAddress(address: address)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(parseUfvkInfo:resolve:reject:)
  func parseUfvkInfo(_ ufvk: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try parseUfvk(ufvk: ufvk)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getVersionInfo:reject:)
  func getVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getVersion()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getMessagesInfo:resolve:reject:)
  func getMessagesInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getMessages(address: address)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getBalanceInfo:reject:)
  func getBalanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getBalance()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTotalMemobytesToAddressInfo:reject:)
  func getTotalMemobytesToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTotalMemobytesToAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTotalValueToAddressInfo:reject:)
  func getTotalValueToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTotalValueToAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTotalSpendsToAddressInfo:reject:)
  func getTotalSpendsToAddressInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTotalSpendsToAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(zecPriceInfo:reject:)
  func zecPriceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try zecPrice()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(removeTransactionProcess:resolve:reject:)
  func removeTransactionProcess(_ txid: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try removeTransaction(txid: txid)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getSpendableBalanceWithAddressInfo:zennies:resolve:reject:)
  func getSpendableBalanceWithAddressInfo(_ address: String, zennies: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getSpendableBalanceWithAddress(address: address, zennies: zennies)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getSpendableBalanceTotalInfo:reject:)
  func getSpendableBalanceTotalInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getSpendableBalanceTotal()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getOptionWalletInfo:reject:)
  func getOptionWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getOptionWallet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(setOptionWalletProcess:reject:)
  func setOptionWalletProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setOptionWallet()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getUnifiedAddressesInfo:reject:)
  func getUnifiedAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getUnifiedAddresses()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getTransparentAddressesInfo:reject:)
  func getTransparentAddressesInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getTransparentAddresses()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(createNewUnifiedAddressProcess:resolve:reject:)
  func createNewUnifiedAddressProcess(_ receivers: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try createNewUnifiedAddress(receivers: receivers)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(createNewTransparentAddressProcess:reject:)
  func createNewTransparentAddressProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try createNewTransparentAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(checkMyAddressInfo:resolve:reject:)
  func checkMyAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try checkMyAddress(address: address)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getWalletSaveRequiredInfo:reject:)
  func getWalletSaveRequiredInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getWalletSaveRequired()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(setConfigWalletToProdProcess:minconfirmations:resolve:reject:)
  func setConfigWalletToProdProcess(_ performancelevel: String, minconfirmations: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try setConfigWalletToProd(performancelevel: performancelevel, minconfirmations: UInt32(minconfirmations) ?? 0)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getConfigWalletPerformanceInfo:reject:)
  func getConfigWalletPerformanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getConfigWalletPerformance()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(getWalletVersionInfo:reject:)
  func getWalletVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getWalletVersion()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(sendProcess:resolve:reject:)
  func sendProcess(_ send_json: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try send(sendJson: send_json)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(shieldProcess:reject:)
  func shieldProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try shield()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(confirmProcess:reject:)
  func confirmProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try confirm()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(planOrchardDrainProcess:reject:)
  func planOrchardDrainProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try planOrchardDrain()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(drainOrchardProcess:reject:)
  func drainOrchardProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try drainOrchardToIronwood()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Polled concurrently while `drainOrchardProcess` runs. Dispatched on the
  // global concurrent queue so it does not queue behind the in-flight drain;
  // the native `drainStatus()` reads a side channel, never the lightclient lock
  // the drain holds, so the poll returns immediately.
  @objc(drainStatusProcess:reject:)
  func drainStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try drainStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(planIronwoodMigrationProcess:reject:)
  func planIronwoodMigrationProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try planIronwoodMigration()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(startIronwoodMigrationProcess:perBucket:resolve:reject:)
  func startIronwoodMigrationProcess(_ plan_hash_hex: String, perBucket per_bucket: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          // Empty string means "keep zingolib's default cadence" (the
          // module's numeric-arg-as-string convention); anything else must
          // parse as a u32 — a malformed value rejects as InvalidInput
          // instead of silently keeping the default.
          try startIronwoodMigration(
            planHashHex: plan_hash_hex,
            perBucket: FfiArgs.optionalU32(per_bucket, name: "per_bucket"))
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Proves and broadcasts one splitting round, so like the drain it runs
  // long; the global concurrent queue keeps it off the main thread.
  @objc(continueNoteSplittingProcess:reject:)
  func continueNoteSplittingProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try continueNoteSplitting()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Proves and broadcasts one Phase 1 splitting round (ADR 0016), so like the
  // drain it runs long; the global concurrent queue keeps it off the main
  // thread.
  @objc(quickSplitProcess:reject:)
  func quickSplitProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try quickSplit()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Polled concurrently while `quickSplitProcess` runs; the native
  // `splitStatus()` reads a side channel, never the lightclient lock the round
  // holds, so the poll returns immediately.
  @objc(splitStatusProcess:reject:)
  func splitStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try splitStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(reschedulePartsProcess:resolve:reject:)
  func reschedulePartsProcess(_ per_bucket: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          // `per_bucket` crosses as a string (numeric-arg convention); a
          // malformed value rejects as InvalidInput — never an unsettled
          // promise.
          try rescheduleParts(perBucket: FfiArgs.requiredU32(per_bucket, name: "per_bucket"))
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(migrationStatusProcess:reject:)
  func migrationStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try migrationStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(windowTimelineProcess:reject:)
  func windowTimelineProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try windowTimeline()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(reconcileMigrationProcess:reject:)
  func reconcileMigrationProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try reconcileMigration()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Phase-2 execute tap: proves and broadcasts the scheduled migration's due
  // batch, so like the drain it runs long; the global concurrent queue keeps it
  // off the main thread. `spacing_ms` crosses as a string (numeric-arg
  // convention) — the delay sequenced between the batch's sends.
  @objc(executeDuePartsProcess:resolve:reject:)
  func executeDuePartsProcess(_ spacing_ms: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          // A malformed spacing rejects as InvalidInput — never an
          // unsettled promise.
          try executeDueParts(spacingMs: FfiArgs.requiredU64(spacing_ms, name: "spacing_ms"))
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // Polled concurrently while `executeDuePartsProcess` runs; the native
  // `executeDuePartsStatus()` reads a side channel, never the lightclient lock
  // the batch holds, so the poll returns immediately.
  @objc(executeDuePartsStatusProcess:reject:)
  func executeDuePartsStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try executeDuePartsStatus()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(cancelIronwoodMigrationProcess:reject:)
  func cancelIronwoodMigrationProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try cancelIronwoodMigration()
        }.settle(resolve: resolve, reject: reject)
      }
  }

}
