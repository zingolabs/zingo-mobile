//
//  RPCModule.swift
//  Zingo
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React
import CryptoKit
import ZingoBindings

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
    case .SendAfterDeshield(let message): return ("SendAfterDeshield", message)
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
    case .WalletChainMismatch(let message): return ("WalletChainMismatch", message)
    }
  }

  static func of(_ call: () throws -> String) -> FfiOutcome {
    do {
      return .resolved(try call())
    } catch let error as ZingolibError {
      let (code, message) = FfiOutcome.classify(error)
      return .rejected(code: code, message: message, error: error)
    } catch StorageError.diskFull(let message) {
      return .rejected(code: "DiskFull", message: message, error: StorageError.diskFull(message))
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

/// The plain wallet format on disk: raw zingolib bytes whose first field
/// is a little-endian u64 version.
enum WalletFileFormat {
  static func looksLikePlainWallet(_ bytes: Data) -> Bool {
    guard bytes.count >= 8 else { return false }
    var version: UInt64 = 0
    for (offset, byte) in bytes.prefix(8).enumerated() {
      version |= UInt64(byte) << (8 * UInt64(offset))
    }
    return version <= 1000
  }

  /// The bytes of a legacy base64 text file, trimmed to the last whole
  /// quantum so a truncated file still decodes.
  static func decodeLegacyText(_ bytes: Data) -> Data? {
    guard let text = String(data: bytes, encoding: .utf8) else { return nil }
    let trimmed = String(text.prefix(text.count - text.count % 4))
    return Data(base64Encoded: trimmed)
  }
}

/// A write refused because the storage is full, rejected to JS under its own code.
enum StorageError: Error {
  case diskFull(String)
}

/// The wallets on disk, one folder per wallet under `wallets/`, where the meta is the commit point.
enum WalletStore {
  static let walletName = "wallet.dat"
  static let metaName = "meta.json"
  private static let rootName = "wallets"
  private static let activeName = "active.json"
  private static let deleting = ".deleting"
  private static let version = 1
  /// Meta fields only the store writes.
  private static let ownFields: Set<String> = ["v", "id", "createdAt", "migratedFrom"]

  struct Wallet {
    let id: String
    let meta: [String: Any]
    let hasFile: Bool
  }

  static func root(_ base: String) -> String { "\(base)/\(rootName)" }

  static func dir(_ base: String, _ id: String) -> String { "\(root(base))/\(id)" }

  static func walletPath(_ base: String, _ id: String) -> String { "\(dir(base, id))/\(walletName)" }

  private static func readJSON(_ path: String) -> [String: Any]? {
    guard let data = FileManager.default.contents(atPath: path) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
  }

  private static func isCommitted(_ base: String, _ name: String) -> Bool {
    var isDirectory: ObjCBool = false
    let fm = FileManager.default
    return fm.fileExists(atPath: dir(base, name), isDirectory: &isDirectory) && isDirectory.boolValue
      && fm.fileExists(atPath: "\(dir(base, name))/\(metaName)")
  }

  static func order(_ meta: [String: Any]) -> Int { (meta["order"] as? NSNumber)?.intValue ?? 0 }

  /// The committed wallets, in the order they were added.
  static func list(_ base: String) -> [Wallet] {
    let fm = FileManager.default
    let names = (try? fm.contentsOfDirectory(atPath: root(base))) ?? []
    return names
      .filter { !$0.hasPrefix(".") && !$0.hasSuffix(deleting) && isCommitted(base, $0) }
      .map { name in
        Wallet(
          id: name,
          meta: readJSON("\(dir(base, name))/\(metaName)") ?? [:],
          hasFile: fm.fileExists(atPath: walletPath(base, name)))
      }
      .sorted { order($0.meta) < order($1.meta) }
  }

  /// The wallets folder, excluded from backups with everything in it.
  static func ensureRoot(_ base: String) throws {
    try FileManager.default.createDirectory(atPath: root(base), withIntermediateDirectories: true)
    var url = URL(fileURLWithPath: root(base))
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try? url.setResourceValues(values)
  }

  static func writeMeta(_ base: String, _ id: String, _ meta: [String: Any]) throws {
    let data = try JSONSerialization.data(withJSONObject: meta)
    try data.write(to: URL(fileURLWithPath: "\(dir(base, id))/\(metaName)"), options: .atomic)
  }

  private static func pointer(_ base: String) -> String {
    readJSON("\(root(base))/\(activeName)")?["id"] as? String ?? ""
  }

  /// The wallet the app opens, when its folder is committed.
  static func active(_ base: String) -> String? {
    let id = pointer(base)
    return !id.isEmpty && isCommitted(base, id) ? id : nil
  }

  static func setActive(_ base: String, _ id: String?) throws {
    let path = "\(root(base))/\(activeName)"
    guard let id else {
      try? FileManager.default.removeItem(atPath: path)
      return
    }
    try ensureRoot(base)
    let data = try JSONSerialization.data(withJSONObject: ["id": id])
    try data.write(to: URL(fileURLWithPath: path), options: .atomic)
  }

  /// An empty folder for a new wallet, committed once its meta is written.
  static func allocate(_ base: String) throws -> String {
    try ensureRoot(base)
    let id = UUID().uuidString.lowercased()
    try FileManager.default.createDirectory(atPath: dir(base, id), withIntermediateDirectories: false)
    return id
  }

  /// The meta of a new wallet, ordered after every wallet on disk.
  static func newMeta(
    _ base: String, _ id: String, name: String, chain: String?, serverUri: String?, kind: String? = nil
  ) -> [String: Any] {
    var meta: [String: Any] = [
      "v": version,
      "id": id,
      "order": (list(base).map { order($0.meta) }.max() ?? 0) + 1,
      "createdAt": Int(Date().timeIntervalSince1970 * 1000),
      "name": name,
    ]
    if let chain, !chain.isEmpty { meta["chain"] = chain }
    if let serverUri { meta["server"] = ["uri": serverUri] }
    if let kind { meta["kind"] = kind }
    return meta
  }

  /// The meta with the patch's fields set, a null field removed, and the store's own fields untouched.
  static func patchMeta(_ meta: [String: Any], _ patch: [String: Any]) -> [String: Any] {
    var patched = meta
    for (key, value) in patch where !ownFields.contains(key) {
      if value is NSNull { patched.removeValue(forKey: key) } else { patched[key] = value }
    }
    return patched
  }

  /// The wallets and the active one, as the bridge reports them.
  static func info(_ base: String) -> [String: Any] {
    [
      "active": active(base) ?? NSNull(),
      "wallets": list(base).map { ["id": $0.id, "hasFile": $0.hasFile, "meta": $0.meta] as [String: Any] },
    ]
  }

  /// The size of the largest wallet file, the yardstick of the free-space check.
  static func largestWallet(_ base: String) -> Int64 {
    list(base)
      .compactMap { (try? FileManager.default.attributesOfItem(atPath: walletPath(base, $0.id)))?[.size] as? NSNumber }
      .map { $0.int64Value }
      .max() ?? 0
  }

  /// Whether a failure, or the error beneath it, is the storage running out of space.
  static func isDiskFull(_ error: Error) -> Bool {
    var current: NSError? = error as NSError
    for _ in 0..<8 {
      guard let nsError = current else { return false }
      if nsError.domain == NSCocoaErrorDomain && nsError.code == NSFileWriteOutOfSpaceError { return true }
      if nsError.domain == NSPOSIXErrorDomain && nsError.code == Int(ENOSPC) { return true }
      current = nsError.userInfo[NSUnderlyingErrorKey] as? NSError
    }
    return false
  }

  /// "Wallet n" with the lowest n no wallet uses.
  static func defaultName(_ base: String) -> String {
    let names = Set(list(base).compactMap { $0.meta["name"] as? String })
    var n = 1
    while names.contains("Wallet \(n)") { n += 1 }
    return "Wallet \(n)"
  }

  /// Ends the deletes and drops the creates a crash interrupted, except the folder `keep`.
  static func sweep(_ base: String, keep: String?) {
    let fm = FileManager.default
    for name in (try? fm.contentsOfDirectory(atPath: root(base))) ?? [] where !name.hasPrefix(".") {
      var isDirectory: ObjCBool = false
      guard fm.fileExists(atPath: dir(base, name), isDirectory: &isDirectory), isDirectory.boolValue else { continue }
      if name.hasSuffix(deleting) || (name != keep && !isCommitted(base, name)) {
        try? fm.removeItem(atPath: dir(base, name))
      }
    }
  }

  /// Deletes a wallet's folder, renamed first so a crash midway ends at the next sweep.
  static func delete(_ base: String, _ id: String) throws -> Bool {
    let fm = FileManager.default
    guard fm.fileExists(atPath: dir(base, id)) else { return false }
    let doomed = dir(base, "\(id)\(deleting)")
    try? fm.removeItem(atPath: doomed)
    try fm.moveItem(atPath: dir(base, id), toPath: doomed)
    if pointer(base) == id { try setActive(base, nil) }
    try? fm.removeItem(atPath: doomed)
    return true
  }

  static func digest(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }

  /// Moves a legacy wallet file into its own folder, resumable after a crash because the meta records the file's digest first.
  static func adoptLegacy(
    _ base: String,
    legacy: String,
    name: String,
    active: Bool,
    chain: String?,
    serverUri: String?
  ) throws -> String? {
    let fm = FileManager.default
    let legacyPath = "\(base)/\(legacy)"
    guard let stored = fm.contents(atPath: legacyPath) else { return nil }
    let sum = digest(stored)
    let id: String
    if let resumed = list(base).first(where: { !$0.hasFile && $0.meta["migratedFrom"] as? String == sum }) {
      id = resumed.id
    } else {
      id = try allocate(base)
      var meta = newMeta(base, id, name: name, chain: chain, serverUri: serverUri)
      meta["migratedFrom"] = sum
      try writeMeta(base, id, meta)
    }
    if active && self.active(base) == nil { try setActive(base, id) }
    let broken = "\(legacyPath).broken"
    if fm.fileExists(atPath: broken) {
      try? fm.moveItem(atPath: broken, toPath: "\(dir(base, id))/\(legacy).broken")
    }
    try fm.moveItem(atPath: legacyPath, toPath: walletPath(base, id))
    return id
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
  
  /// The wallet whose folder saves land in, nil while no wallet file is open.
  static var openWalletId: String?
  /// The meta a new wallet commits with on its first save.
  static var pendingMeta: [String: Any]?
  static let walletFileHold = NSLock()

  func closeWalletFile() {
    RPCModule.walletFileHold.lock()
    RPCModule.openWalletId = nil
    RPCModule.pendingMeta = nil
    RPCModule.walletFileHold.unlock()
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

  func readFile(_ fileName: String) throws -> String {
    return try String(contentsOfFile: getFileName(fileName), encoding: .utf8)
  }

  // Wallet files rest under OS protection alone: hardware encryption at
  // rest (class C, key available after the first post-boot unlock, so
  // background sync can save while the screen is locked), the app
  // sandbox, and backup exclusion. Class `complete` locked the file
  // seconds after screen lock and broke background saves. Backup
  // exclusion is the guard against restoring a stale wallet over a
  // newer one and must never regress.
  func writeWalletFile(atPath filePath: String, walletBytes: Data) throws {
    try walletBytes.write(to: URL(fileURLWithPath: filePath), options: .atomic)
    var fileURL = URL(fileURLWithPath: filePath)
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try? fileURL.setResourceValues(resourceValues)
    try? FileManager.default.setAttributes(
      [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
      ofItemAtPath: filePath
    )
  }

  func writeFile(_ fileName: String, walletBytes: Data) throws {
    try writeWalletFile(atPath: getFileName(fileName), walletBytes: walletBytes)
  }

  func deleteFile(_ fileName: String) throws {
    try FileManager.default.removeItem(atPath: getFileName(fileName))
  }

  // Moves the existing wallet file to the resting protection this build
  // writes: class C plus backup exclusion. Old builds wrote class A, and
  // a synced wallet can open without a save.
  // The swap records live in AsyncStorage, in Application Support. iCloud
  // backs that folder up unless told otherwise, and the wallet file it
  // belongs with is excluded, so the folder is created ahead of the first
  // write and excluded the same way.
  func excludeSwapStoreFromBackup() {
    let fm = FileManager.default
    guard let support = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first,
          let bundleId = Bundle.main.bundleIdentifier else { return }
    var storage = support.appendingPathComponent(bundleId).appendingPathComponent("RCTAsyncLocalStorage_V1")
    try? fm.createDirectory(at: storage, withIntermediateDirectories: true)
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try? storage.setResourceValues(resourceValues)
  }

  func applyWalletFileProtection() {
    let fm = FileManager.default
    guard let path = try? getFileName(Constants.WalletFileName.rawValue), fm.fileExists(atPath: path) else { return }
    var fileURL = URL(fileURLWithPath: path)
    var resourceValues = URLResourceValues()
    resourceValues.isExcludedFromBackup = true
    try? fileURL.setResourceValues(resourceValues)
    try? fm.setAttributes(
      [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
      ofItemAtPath: path
    )
  }

  // Audit Issue P (b) — the legacy wallet ↔ backup swap of older builds,
  // finished before the root files move into folders.
  //
  // `restoreExistingWalletBackup` did its swap as three atomic renames:
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
    do {
      if !fm.fileExists(atPath: mainPath) {
        if fm.fileExists(atPath: backupPath) {
          try fm.moveItem(atPath: backupPath, toPath: mainPath)
        }
        try fm.moveItem(atPath: tempPath, toPath: backupPath)
      } else if !fm.fileExists(atPath: backupPath) {
        try fm.moveItem(atPath: tempPath, toPath: backupPath)
      } else {
        let tempData = try Data(contentsOf: URL(fileURLWithPath: tempPath))
        let mainData = try Data(contentsOf: URL(fileURLWithPath: mainPath))
        if mainData == tempData {
          try fm.removeItem(atPath: mainPath)
          try fm.moveItem(atPath: backupPath, toPath: mainPath)
          try fm.moveItem(atPath: tempPath, toPath: backupPath)
        } else if try Data(contentsOf: URL(fileURLWithPath: backupPath)) == tempData {
          try fm.removeItem(atPath: tempPath)
        } else {
          // Three distinct contents: no window matches, and any pick could
          // destroy a wallet. Everything holds its place for diagnosis.
          NSLog("[Native] completePendingSwap: three distinct wallet files, left untouched")
          return
        }
      }
      NSLog("[Native] completePendingSwap: interrupted swap recovered")
    } catch {
      NSLog("Error: [Native] completePendingSwap failed: \(error.localizedDescription)")
    }
  }

  private func legacyServer() -> [String: Any]? {
    guard let path = try? getFileName("settings.json"),
          let data = FileManager.default.contents(atPath: path),
          let settings = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }
    return settings["server"] as? [String: Any]
  }

  /// Moves a root wallet file into its folder, as legacy base64 text when it does not read, since the folder's own read converts it.
  private func adoptLegacy(_ fileName: String, name: String, active: Bool) throws {
    let documents = try getDocumentsDirectory()
    guard FileManager.default.fileExists(atPath: "\(documents)/\(fileName)") else { return }
    let server = legacyServer()
    let chain: String?
    do {
      chain = try readWalletChain(walletBytes: try readWalletFileBytes(atPath: "\(documents)/\(fileName)"))
    } catch {
      NSLog("[Native] \(fileName) moves unread: \(error.localizedDescription)")
      chain = server?["chainName"] as? String
    }
    _ = try WalletStore.adoptLegacy(
      documents, legacy: fileName, name: name, active: active, chain: chain, serverUri: server?["uri"] as? String)
  }

  /// Brings the documents dir to the folder layout and ends what a crash interrupted.
  func prepareWallets() throws {
    completePendingSwap()
    applyWalletFileProtection()
    excludeSwapStoreFromBackup()
    RPCModule.walletFileHold.lock()
    defer { RPCModule.walletFileHold.unlock() }
    let documents = try getDocumentsDirectory()
    WalletStore.sweep(documents, keep: RPCModule.openWalletId)
    try adoptLegacy(Constants.WalletFileName.rawValue, name: "Wallet 1", active: true)
    try adoptLegacy(Constants.WalletBackupFileName.rawValue, name: "Wallet Backup", active: false)
  }

  func activeWalletId() throws -> String? {
    WalletStore.active(try getDocumentsDirectory())
  }

  /// The active wallet's file, or the legacy root path when no wallet is active.
  func activeWalletPath() throws -> String {
    let documents = try getDocumentsDirectory()
    guard let id = WalletStore.active(documents) else {
      return try getFileName(Constants.WalletFileName.rawValue)
    }
    return WalletStore.walletPath(documents, id)
  }

  private func otherWallet() throws -> String? {
    let documents = try getDocumentsDirectory()
    let active = WalletStore.active(documents)
    return WalletStore.list(documents).first { $0.id != active }?.id
  }

  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    FfiOutcome.of {
      try self.prepareWallets()
      return try self.activeWalletId() == nil ? "false" : "true"
    }.settle(resolve: resolve, reject: reject)
  }

  /// Whether a wallet besides the active one is on disk, which takes the legacy backup's place.
  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    FfiOutcome.of {
      try self.prepareWallets()
      return try self.otherWallet() == nil ? "false" : "true"
    }.settle(resolve: resolve, reject: reject)
  }

  // The background sync state is written from BGAppRefreshTask paths in
  // AppDelegate while the device may be locked. It stays at the iOS
  // default protection class (`completeUntilFirstUserAuthentication`
  // since iOS 7) and outside the wallet `writeFile` helper because the
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

  // Raw wallet bytes, migrating a legacy base64 text file in place. The
  // text stays until the validated raw copy replaces it.
  func readWalletFileBytes(atPath path: String) throws -> Data {
    let name = (path as NSString).lastPathComponent
    let stored: Data
    do {
      stored = try Data(contentsOf: URL(fileURLWithPath: path))
    } catch {
      throw FileError.readWalletError("Error: [Native] reading \(name) error: \(error.localizedDescription)")
    }
    if WalletFileFormat.looksLikePlainWallet(stored) {
      return stored
    }
    guard let decoded = WalletFileFormat.decodeLegacyText(stored),
          (try? validateWalletBytes(walletBytes: decoded)) != nil else {
      throw FileError.readWalletError("Error: [Native] \(name) is not a wallet this build can read")
    }
    do {
      try writeWalletFile(atPath: path, walletBytes: decoded)
      NSLog("[Native] \(name) migrated to raw wallet bytes")
    } catch {
      NSLog("Error: [Native] \(name) migration to raw bytes skipped: \(error.localizedDescription)")
    }
    return decoded
  }

  func readWalletBytes() throws -> Data {
    try readWalletFileBytes(atPath: activeWalletPath())
  }

  func fnDeleteExistingWallet() throws -> Bool {
    RPCModule.walletFileHold.lock()
    defer { RPCModule.walletFileHold.unlock() }
    RPCModule.openWalletId = nil
    RPCModule.pendingMeta = nil
    let documents = try getDocumentsDirectory()
    guard let id = WalletStore.active(documents) else { return false }
    do {
      return try WalletStore.delete(documents, id)
    } catch {
      throw FileError.deleteFileError("Error: [Native] deleting wallet error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let deleted = try self.fnDeleteExistingWallet()
      DispatchQueue.main.async {
        resolve(deleted ? "true" : "false")
      }
    } catch {
      NSLog("Error: [Native] deleting wallet \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  // The FFI contract is structural (zingo-mobile#1151; audit Issue Q):
  // nil means no save was needed, bytes are the wallet export, and failure
  // throws. The export runs under the hold, so a wallet opened meanwhile
  // waits for the write to land in the folder it was taken for.
  func saveWalletInternal() throws {
    RPCModule.walletFileHold.lock()
    defer { RPCModule.walletFileHold.unlock() }
    guard let id = RPCModule.openWalletId else {
      NSLog("[Native] no wallet file open, save refused")
      return
    }
    // Each failure is logged and wrapped exactly once. FileError does not
    // conform to LocalizedError, so re-catching our own throw would replace
    // the message with the generic localizedDescription.
    func saveFailure(_ detail: String) -> FileError {
      let err = "Error: [Native] Couldn't save the wallet. \(detail)"
      NSLog(err)
      return FileError.saveFileError(err)
    }

    let walletBytes: Data?
    do {
      walletBytes = try saveWalletBytes()
    } catch {
      // Logged here, rethrown unwrapped: the FFI's typed error must reach
      // the bridge intact so it rejects under its own variant name, not
      // wrapped into a FileError that would reject as "Unknown".
      NSLog("Error: [Native] Couldn't save the wallet. \(String(describing: error))")
      throw error
    }

    guard let walletBytes = walletBytes else {
      NSLog("[Native] No need to save the wallet.")
      return
    }

    NSLog("[Native] file size: \(walletBytes.count) bytes")
    do {
      let documents = try getDocumentsDirectory()
      try writeWalletFile(atPath: WalletStore.walletPath(documents, id), walletBytes: walletBytes)
      if let meta = RPCModule.pendingMeta {
        try WalletStore.writeMeta(documents, id, meta)
        try WalletStore.setActive(documents, id)
        RPCModule.pendingMeta = nil
      }
    } catch {
      if WalletStore.isDiskFull(error) {
        let err = "Error: [Native] Couldn't save the wallet. The storage is full."
        NSLog(err)
        throw StorageError.diskFull(err)
      }
      throw saveFailure(error.localizedDescription)
    }
  }

  private func syncSettings(performancelevel: String, minconfirmations: String) -> SyncSettings {
    SyncSettings(performanceLevel: performancelevel, minConfirmations: UInt32(minconfirmations) ?? 0)
  }

  private func indexerChoice(_ serveruri: String) -> IndexerChoice {
    serveruri.isEmpty ? .offline : .named(uri: serveruri)
  }

  private func connection(
    serveruri: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String
  ) -> IndexerConnection {
    IndexerConnection(
      indexer: indexerChoice(serveruri),
      chainHint: chainhint,
      sync: syncSettings(performancelevel: performancelevel, minconfirmations: minconfirmations))
  }

  /// Opens a folder for the wallet just initialized, committed by its first save as the active wallet.
  private func openNewWallet(serveruri: String, chainhint: String, kind: String) throws {
    let documents = try getDocumentsDirectory()
    let id = try WalletStore.allocate(documents)
    RPCModule.walletFileHold.lock()
    RPCModule.pendingMeta = WalletStore.newMeta(
      documents, id, name: WalletStore.defaultName(documents), chain: chainhint, serverUri: serveruri, kind: kind)
    RPCModule.openWalletId = id
    RPCModule.walletFileHold.unlock()
    do {
      try saveWalletInternal()
    } catch let error as StorageError {
      closeWalletFile()
      try? FileManager.default.removeItem(atPath: WalletStore.dir(documents, id))
      throw error
    }
  }

  func fnCreateNewWallet(
    serveruri: String,
    birthday: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String
  ) throws -> String {
    closeWalletFile()
    // initNew throws on failure, so reaching the save implies the wallet
    // exists. Offline (empty serveruri) uses `birthday` in place of the
    // chain tip; online it is ignored (pass "0").
    let seed = try initNew(connection: connection(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations), birthday: UInt32(birthday) ?? 0)
    let seedStr = String(seed)
    try openNewWallet(serveruri: serveruri, chainhint: chainhint, kind: "seed")
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
    closeWalletFile()
    // initFromSeed throws on failure, so reaching the save implies the wallet exists.
    let seed = try initFromSeed(seed: restoreSeed, birthday: UInt32(birthday) ?? 0, connection: connection(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations))
    let seedStr = String(seed)
    try openNewWallet(serveruri: serveruri, chainhint: chainhint, kind: "seed")
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
    closeWalletFile()
    // initFromUfvk throws on failure, so reaching the save implies the wallet exists.
    let ufvk = try initFromUfvk(ufvk: restoreUfvk, birthday: UInt32(birthday) ?? 0, connection: connection(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations))
    let ufvkStr = String(ufvk)
    try openNewWallet(serveruri: serveruri, chainhint: chainhint, kind: "ufvk")
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
    try prepareWallets()
    guard let id = try activeWalletId() else {
      throw FileError.readWalletError("Error: [Native] no wallet is active")
    }
    return try fnLoadWallet(
      walletId: id, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel,
      minconfirmations: minconfirmations)
  }

  /// Opens the wallet `walletId` and makes it the active one; a failure leaves the active wallet as it was.
  func fnLoadWallet(
    walletId id: String,
    serveruri: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String
  ) throws -> String {
    try prepareWallets()
    let documents = try getDocumentsDirectory()
    guard WalletStore.list(documents).contains(where: { $0.id == id }) else {
      throw FileError.readWalletError("Error: [Native] no wallet \(id)")
    }
    closeWalletFile()
    let walletBytes = try readWalletFileBytes(atPath: WalletStore.walletPath(documents, id))
    let seed = try initFromBytes(walletBytes: walletBytes, connection: connection(serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel, minconfirmations: minconfirmations))
    RPCModule.walletFileHold.lock()
    defer { RPCModule.walletFileHold.unlock() }
    RPCModule.openWalletId = id
    if WalletStore.active(documents) != id { try WalletStore.setActive(documents, id) }
    return String(seed)
  }

  @objc(loadWalletProcess:serveruri:chainhint:performancelevel:minconfirmations:resolve:reject:)
  func loadWalletProcess(
    _ walletId: String,
    serveruri: String,
    chainhint: String,
    performancelevel: String,
    minconfirmations: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        try self.fnLoadWallet(
          walletId: walletId, serveruri: serveruri, chainhint: chainhint, performancelevel: performancelevel,
          minconfirmations: minconfirmations)
      }.settle(resolve: resolve, reject: reject)
    }
  }

  static func jsonText(_ object: Any) throws -> String {
    let data = try JSONSerialization.data(withJSONObject: object)
    guard let text = String(data: data, encoding: .utf8) else {
      throw FileError.readWalletError("Error: [Native] the wallets do not encode as JSON text")
    }
    return text
  }

  /// The wallets on disk with their metas, and the active one.
  @objc(walletsInfo:reject:)
  func walletsInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    FfiOutcome.of {
      try self.prepareWallets()
      return try RPCModule.jsonText(WalletStore.info(try self.getDocumentsDirectory()))
    }.settle(resolve: resolve, reject: reject)
  }

  func fnUpdateWalletMeta(walletId id: String, patch: String) throws -> String {
    guard let fields = (try JSONSerialization.jsonObject(with: Data(patch.utf8))) as? [String: Any] else {
      throw FileError.writeFileError("Error: [Native] the meta patch is not a JSON object")
    }
    let documents = try getDocumentsDirectory()
    RPCModule.walletFileHold.lock()
    defer { RPCModule.walletFileHold.unlock() }
    if RPCModule.openWalletId == id, let pending = RPCModule.pendingMeta {
      let patched = WalletStore.patchMeta(pending, fields)
      RPCModule.pendingMeta = patched
      return try RPCModule.jsonText(patched)
    }
    guard let wallet = WalletStore.list(documents).first(where: { $0.id == id }) else {
      throw FileError.readWalletError("Error: [Native] no wallet \(id)")
    }
    let patched = WalletStore.patchMeta(wallet.meta, fields)
    try WalletStore.writeMeta(documents, id, patched)
    return try RPCModule.jsonText(patched)
  }

  /// Sets the patch's fields on a wallet's meta, a null field removed, and resolves the meta written.
  @objc(updateWalletMetaProcess:patch:resolve:reject:)
  func updateWalletMetaProcess(
    _ walletId: String,
    patch: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of {
      try self.fnUpdateWalletMeta(walletId: walletId, patch: patch)
    }.settle(resolve: resolve, reject: reject)
  }

  func fnDeleteWallet(walletId id: String) throws -> Bool {
    RPCModule.walletFileHold.lock()
    defer { RPCModule.walletFileHold.unlock() }
    if RPCModule.openWalletId == id {
      RPCModule.openWalletId = nil
      RPCModule.pendingMeta = nil
    }
    return try WalletStore.delete(try getDocumentsDirectory(), id)
  }

  /// Deletes the wallet `walletId`, closing it first when it is the open one.
  @objc(deleteWalletProcess:resolve:reject:)
  func deleteWalletProcess(
    _ walletId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    FfiOutcome.of {
      try self.fnDeleteWallet(walletId: walletId) ? "true" : "false"
    }.settle(resolve: resolve, reject: reject)
  }

  /// The free bytes of the wallets' storage and the size of the largest wallet, for the free-space check.
  @objc(diskSpaceInfo:reject:)
  func diskSpaceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    FfiOutcome.of {
      let documents = try self.getDocumentsDirectory()
      let values = try URL(fileURLWithPath: documents).resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
      return try RPCModule.jsonText([
        "free": values.volumeAvailableCapacityForImportantUsage ?? 0,
        "largest": WalletStore.largestWallet(documents),
      ])
    }.settle(resolve: resolve, reject: reject)
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

  /// Makes the other wallet the active one, the legacy backup restore on the folder layout.
  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    FfiOutcome.of {
      try self.prepareWallets()
      guard let other = try self.otherWallet() else { return "false" }
      self.closeWalletFile()
      try WalletStore.setActive(try self.getDocumentsDirectory(), other)
      return "true"
    }.settle(resolve: resolve, reject: reject)
  }

  /// Makes the other wallet the active one and deletes the active one, the legacy backup replace on the folder layout.
  @objc(replaceWalletWithBackup:reject:)
  func replaceWalletWithBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    FfiOutcome.of {
      try self.prepareWallets()
      guard let other = try self.otherWallet() else { return "false" }
      let documents = try self.getDocumentsDirectory()
      let replaced = WalletStore.active(documents)
      self.closeWalletFile()
      try WalletStore.setActive(documents, other)
      if let replaced { _ = try WalletStore.delete(documents, replaced) }
      return "true"
    }.settle(resolve: resolve, reject: reject)
  }

  // The chain the wallet file was written for: main, test or regtest.
  @objc(walletChainInfo:reject:)
  func walletChainInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        try readWalletChain(walletBytes: try self.readWalletBytes())
      }.settle(resolve: resolve, reject: reject)
    }
  }

  // Salvages seed and birthday from the closed wallet file and keeps the
  // damaged file aside as ".broken".
  @objc(walletFileRecoveryInfo:reject:)
  func walletFileRecoveryInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      FfiOutcome.of {
        let mainPath = try self.activeWalletPath()
        let stored = try Data(contentsOf: URL(fileURLWithPath: mainPath))
        let walletBytes = WalletFileFormat.looksLikePlainWallet(stored)
          ? stored
          : WalletFileFormat.decodeLegacyText(stored)
        guard let walletBytes else {
          throw ZingolibError.Read(message: "the wallet file is not a wallet this build can read")
        }
        let salvaged = try readWalletRecoveryInfo(walletBytes: walletBytes)
        let fm = FileManager.default
        let brokenPath = "\(mainPath).broken"
        try? fm.removeItem(atPath: brokenPath)
        try? fm.copyItem(atPath: mainPath, toPath: brokenPath)
        return salvaged
      }.settle(resolve: resolve, reject: reject)
    }
  }

  // "plainWallet" when the file carries a plausible zingolib version
  // header, raw or as legacy base64 text, truncated files included.
  func walletFileState(_ path: String) -> String {
    guard let stored = try? Data(contentsOf: URL(fileURLWithPath: path)) else {
      return "unknown"
    }
    if WalletFileFormat.looksLikePlainWallet(stored) {
      return "plainWallet"
    }
    guard let decoded = WalletFileFormat.decodeLegacyText(stored) else {
      return "unknown"
    }
    return WalletFileFormat.looksLikePlainWallet(decoded) ? "plainWallet" : "unknown"
  }

  // The diagnosis of the active wallet's file for the recovery dialog, in
  // the Android report format.
  func walletFileDiagnosis() -> [[String: Any]] {
    let fm = FileManager.default
    var entry: [String: Any] = [
      "name": WalletStore.walletName,
      "size": 0,
      "mtime": 0,
      "depth": 0,
      "repairable": false,
      "unwrapErrors": [String](),
    ]
    guard let path = try? activeWalletPath(), fm.fileExists(atPath: path) else {
      entry["state"] = "missing"
      return [entry]
    }
    if let attrs = try? fm.attributesOfItem(atPath: path) {
      entry["size"] = (attrs[.size] as? NSNumber)?.intValue ?? 0
      if let modified = attrs[.modificationDate] as? Date {
        entry["mtime"] = Int(modified.timeIntervalSince1970 * 1000)
      }
    }
    entry["state"] = walletFileState(path)
    return [entry]
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

  @objc(getLatestBlockServerInfo:resolve:reject:)
  func getLatestBlockServerInfo(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getLatestBlockServer(serveruri: serveruri)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(probeServerInfo:resolve:reject:)
  func probeServerInfo(_ serveruri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try probeServer(serverUri: serveruri)
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

  @objc(stopSyncProcess:reject:)
  func stopSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try stopSync()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(syncCaughtUpInfo:reject:)
  func syncCaughtUpInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try syncCaughtUp()
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
          try changeServer(choice: self.indexerChoice(serveruri))
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
          "\(try getVersion())-\(RPCModule.zmDescriptor)"
        }.settle(resolve: resolve, reject: reject)
      }
  }

  // The zingo-mobile part of the build descriptor, which the app build writes
  // into Info.plist; zm_unknown in a bundle the build did not describe.
  static var zmDescriptor: String {
    let value = Bundle.main.object(forInfoDictionaryKey: "ZingoMobileDescriptor") as? String ?? ""
    return value.isEmpty ? "zm_unknown" : value
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

  @objc(getSpendableBalanceWithAddressInfo:resolve:reject:)
  func getSpendableBalanceWithAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try getSpendableBalanceWithAddress(address: address)
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
          try setConfigWalletToProd(settings: self.syncSettings(performancelevel: performancelevel, minconfirmations: minconfirmations))
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

  @objc(sendAllProcess:memo:resolve:reject:)
  func sendAllProcess(_ address: String, memo: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try sendAll(address: address, memo: memo)
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

  /// `sendProcess`'s answer without storing a proposal or pausing sync: a fee read.
  @objc(previewSendProcess:resolve:reject:)
  func previewSendProcess(_ send_json: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try previewSend(sendJson: send_json)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  /// `sendAllProcess`'s answer without storing a proposal or pausing sync.
  @objc(previewSendAllProcess:memo:resolve:reject:)
  func previewSendAllProcess(_ address: String, memo: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try previewSendAll(address: address, memo: memo)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  /// `shieldProcess`'s answer without storing a proposal or pausing sync.
  @objc(previewShieldProcess:reject:)
  func previewShieldProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try previewShield()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  /// Drops the stored proposal without sending it, and lets sync resume.
  @objc(declineProcess:reject:)
  func declineProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try decline()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(sendSwapDepositProcess:amount:memo_hex:resolve:reject:)
  func sendSwapDepositProcess(_ vault_address: String, amount: String, memo_hex: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try sendSwapDeposit(
            vaultAddress: vault_address,
            amount: FfiArgs.requiredU64(amount, name: "amount"),
            memoHex: memo_hex)
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(reserveRefundAddressProcess:reject:)
  func reserveRefundAddressProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try reserveRefundAddress()
        }.settle(resolve: resolve, reject: reject)
      }
  }

  @objc(deriveRefundAddressProcess:reject:)
  func deriveRefundAddressProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try deriveRefundAddress()
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

  // An old private migration (ZIP 318), left by builds that offered it:
  // launch reads it, records what confirmed and cancels the rest.
  @objc(migrationStatusProcess:reject:)
  func migrationStatusProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try migrationStatus()
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

  @objc(cancelIronwoodMigrationProcess:reject:)
  func cancelIronwoodMigrationProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      DispatchQueue.global(qos: .userInitiated).async {
        FfiOutcome.of {
          try cancelIronwoodMigration()
        }.settle(resolve: resolve, reject: reject)
      }
  }

}
