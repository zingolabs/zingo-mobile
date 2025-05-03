//
//  RPCModule.swift
//  ZingoMobile
//
//  Created by Juan Carlos Carmona Calvo on 4/2/24.
//

import Foundation
import React

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
      throw FileError.documentsDirectoryNotFoundError("Documents directory could not be located.")
    }
    return pathsFirst
  }
  
  func getFileName(_ file: String) throws -> String {
    let documentsDirectory = try getDocumentsDirectory()
    let fileName = "\(documentsDirectory)/\(file)"
    //NSLog("get file name \(fileName)")
    return fileName
  }
  
  func fileExists(_ fileName: String) throws -> String {
    let fileExists = try FileManager.default.fileExists(atPath: getFileName(fileName))
    if fileExists {
      NSLog("File exists \(fileName)")
      return "true"
    } else {
      NSLog("File DOES not exists \(fileName)")
      return "false"
    }
  }
  
  func readFile(_ fileName: String) throws -> String {
    return try String(contentsOfFile: getFileName(fileName), encoding: .utf8)
  }

  func writeFile(_ fileName: String, fileBase64EncodedString: String) throws {
    try fileBase64EncodedString.write(toFile: getFileName(fileName), atomically: true, encoding: .utf8)
  }

  func deleteFile(_ fileName: String) throws {
    try FileManager.default.removeItem(atPath: getFileName(fileName))
  }
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let result = try fileExists(Constants.WalletFileName.rawValue)
      DispatchQueue.main.async {
        resolve(result)
      }
    } catch {
      NSLog("wallet exists error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let result = try fileExists(Constants.WalletBackupFileName.rawValue)
      DispatchQueue.main.async {
        resolve(result)
      }
    } catch {
      NSLog("wallet backup exists error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  func saveWalletFile(_ base64EncodedString: String) throws {
    do {
      try writeFile(Constants.WalletFileName.rawValue, fileBase64EncodedString: base64EncodedString)
    } catch {
      throw FileError.writeFileError("Error writting wallet file error: \(error.localizedDescription)")
    }
  }
  
  func saveWalletBackupFile(_ base64EncodedString: String) throws {
    do {
      try writeFile(Constants.WalletBackupFileName.rawValue, fileBase64EncodedString: base64EncodedString)
    } catch {
      throw FileError.writeFileError("Error writting wallet backup file error: \(error.localizedDescription)")
    }
  }

  func saveBackgroundFile(_ jsonString: String) throws {
    do {
      // the content of this JSON can be represented safely in utf8.
      try jsonString.write(toFile: getFileName(Constants.BackgroundFileName.rawValue), atomically: true, encoding: .utf8)
    } catch {
      throw FileError.writeFileError("Error writting background file error: \(error.localizedDescription)")
    }
  }

  func readWalletUtf8String() throws -> String {
    do {
      return try readFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error reading wallet format error: \(error.localizedDescription)")
    }
  }

  func readWalletBackup() throws -> String {
    do {
      return try readFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error reading wallet backup format error: \(error.localizedDescription)")
    }
  }

  func fnDeleteExistingWallet() throws {
    do {
      try deleteFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet error: \(error.localizedDescription)")
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
      NSLog("\(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }
  
  func fnDeleteExistingWalletBackup() throws {
    do {
      try deleteFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet backup error: \(error.localizedDescription)")
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
      NSLog("\(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  func saveWalletInternal() throws {
    let walletEncodedString = saveToB64()
    if !walletEncodedString.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletFile(walletEncodedString)
    } else {
      throw FileError.saveFileError("Error saving wallet error: \(walletEncodedString)")
    }
  }

  func saveWalletBackupInternal() throws {
    let walletString = try readWalletUtf8String()
    try self.saveWalletBackupFile(walletString)
  }

  func fnCreateNewWallet(server: String, chainhint: String) throws -> String {
    let seed = initNew(serveruri: server, datadir: try getDocumentsDirectory(), chainhint: chainhint)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(createNewWallet:chainhint:resolve:reject:)
  func createNewWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.fnCreateNewWallet(server: server, chainhint: chainhint)
      DispatchQueue.main.async {
        resolve(seedStr)
      }
    } catch {
      let err = "Error: [Native] Creating a new wallet. \(error.localizedDescription)"
      NSLog(err)
      DispatchQueue.main.async {
        resolve(err)
      }
    }
  }
  
  func fnRestoreWalletFromSeed(server: String, chainhint: String, restoreSeed: String, birthday: String) throws -> String {
    let seed = initFromSeed(serveruri: server, seed: restoreSeed, birthday: UInt64(birthday) ?? 0, datadir: try getDocumentsDirectory(), chainhint: chainhint)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(restoreWalletFromSeed:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromSeed(_ restoreSeed: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.fnRestoreWalletFromSeed(server: server, chainhint: chainhint, restoreSeed: restoreSeed, birthday: birthday)
      DispatchQueue.main.async {
        resolve(seedStr)
      }
    } catch {
      let err = "Error: [Native] Restoring a wallet with seed. \(error.localizedDescription)"
      NSLog(err)
      DispatchQueue.main.async {
        resolve(err)
      }
    }
  }
  
  func fnRestoreWalletFromUfvk(server: String, chainhint: String, restoreUfvk: String, birthday: String) throws -> String {
    let ufvk = initFromUfvk(serveruri: server, ufvk: restoreUfvk, birthday: UInt64(birthday) ?? 0, datadir: try getDocumentsDirectory(), chainhint: chainhint)
    let ufvkStr = String(ufvk)
    if !ufvkStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return ufvkStr
  }

  @objc(restoreWalletFromUfvk:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromUfvk(_ restoreUfvk: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let ufvkStr = try self.fnRestoreWalletFromUfvk(server: server, chainhint: chainhint, restoreUfvk: restoreUfvk, birthday: birthday)
      DispatchQueue.main.async {
        resolve(ufvkStr)
      }
    } catch {
      let err = "Error: [Native] Restoring a wallet with ufvk. \(error.localizedDescription)"
      NSLog(err)
      DispatchQueue.main.async {
        resolve(err)
      }
    }
  }

  func fnLoadExistingWallet(server: String, chainhint: String) throws -> String {
    let seed = initFromB64(serveruri: server, datab64: try self.readWalletUtf8String(), datadir: try getDocumentsDirectory(), chainhint: chainhint)
    let seedStr = String(seed)
    return seedStr
  }

  @objc(loadExistingWallet:chainhint:resolve:reject:)
  func loadExistingWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.fnLoadExistingWallet(server: server, chainhint: chainhint)
      DispatchQueue.main.async {
        resolve(seedStr)
      }
    } catch {
      let err = "Error: [Native] Loading existing wallet. \(error.localizedDescription)"
      NSLog(err)
      DispatchQueue.main.async {
        resolve(err)
      }
    }
  }

  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let backupData = try self.readWalletBackup()
      let walletData = try self.readWalletUtf8String()
      try self.saveWalletFile(backupData)
      try self.saveWalletBackupFile(walletData)
      DispatchQueue.main.async {
        resolve("true")
      }
    } catch {
      NSLog("Restoring existing wallet backup error: \(error.localizedDescription)")
      DispatchQueue.main.async {
        resolve("false")
      }
    }
  }

  func fnDoSave(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        try self.saveWalletInternal()
        DispatchQueue.main.async {
          resolve("true")
        }
      } catch {
        NSLog("Saving wallet error: \(error.localizedDescription)")
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } else {
      let err = "Error: [Native] Save wallet. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }

  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let dict: [String: Any] = ["resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnDoSave(dict)
          }
      }
  }

  func fndoSaveBackup(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      do {
        try self.saveWalletBackupInternal()
        DispatchQueue.main.async {
          resolve("true")
        }
      } catch {
        NSLog("Saving wallet backup error: \(error.localizedDescription)")
        DispatchQueue.main.async {
          resolve("false")
        }
      }
    } else {
      let err = "Error: [Native] Save wallet backup. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }

  @objc(doSaveBackup:reject:)
  func doSaveBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let dict: [String: Any] = ["resolve": resolve]
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fndoSaveBackup(dict)
          }
      }    
  }

  func doExecuteOnThread(_ dict: [String: Any]) {
    if let method = dict["method"] as? String,
       let args = dict["args"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = executeCommand(cmd: method, args: args)
      let respStr = String(resp)
      DispatchQueue.main.async {
        resolve(respStr)
      }
    } else {
      let err = "Error: [Native] Executing command. Command argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        DispatchQueue.main.async {
          resolve(err)
        }
      }
    }
  }

  @objc(execute:args:resolve:reject:)
  func execute(_ method: String, args: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["method": method, "args": args, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.doExecuteOnThread(dict)
          }
      }
  }

  func fnGetLatestBlockServerInfo(_ dict: [AnyHashable: Any]) {
    if let server = dict["server"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = getLatestBlockServer(serveruri: server)
      let respStr = String(resp)
      DispatchQueue.main.async {
        resolve(respStr)
      }
    } else {
      let err = "Error: [Native] Getting server latest block. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }
  
  @objc(getLatestBlockServerInfo:resolve:reject:)
  func getLatestBlockServerInfo(_ server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetLatestBlockServerInfo(dict)
          }
      }
  }

  func fnGetLatestBlockWalletInfo(_ dict: [AnyHashable: Any]) {
    if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = getLatestBlockWallet()
      let respStr = String(resp)
      DispatchQueue.main.async {
        resolve(respStr)
      }
    } else {
      let err = "Error: [Native] Getting wallet latest block. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          DispatchQueue.main.async {
            resolve(err)
          }
      }
    }
  }
  
  @objc(getLatestBlockWalletInfo:reject:)
  func getLatestBlockWalletInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetLatestBlockWalletInfo(dict)
          }
      }
  }

  func fnGetDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getDeveloperDonationAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
        let err = "Error: [Native] Getting developer donation address. Command arguments problem."
        NSLog(err)
        if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              DispatchQueue.main.async {
                resolve(err)
              }
          }
      }
  }
  
  @objc(getDonationAddress:reject:)
  func getDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetDonationAddress(dict)
          }
      }
  }

  func fnGetZenniesDonationAddress(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getZenniesForZingoDonationAddress()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
        let err = "Error: [Native] Getting zennies donation address. Command arguments problem."
        NSLog(err)
        if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }
  
  @objc(getZenniesDonationAddress:reject:)
  func getZenniesDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetZenniesDonationAddress(dict)
          }
      }
  }

  func fnGetValueTransfersList(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getValueTransfers()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Getting value transfers. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getValueTransfersList:reject:)
  func getValueTransfersList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetValueTransfersList(dict)
          }
      }
  }

  func fnGetTransactionSummariesList(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getTransactionSummaries()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Getting transaction summaries list. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getTransactionSummariesList:reject:)
  func getTransactionSummariesList(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
          if let self = self {
              self.fnGetTransactionSummariesList(dict)
          }
      }
  }

  func fnSetCryptoDefaultProvider(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = setCryptoDefaultProviderToRing()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Setting the crypto provider to ring by default. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(setCryptoDefaultProvider:reject:)
  func setCryptoDefaultProvider(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnSetCryptoDefaultProvider(dict)
        }
      }
  }

  func fnPollSyncInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = pollSync()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Sync poll info. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(pollSyncInfo:reject:)
  func pollSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnPollSyncInfo(dict)
        }
      }
  }

  func fnRunSyncProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = runSync()
          let respStr = String(resp)
          if !respStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
            // Also save the wallet after sync
            do {
              try self.saveWalletInternal()
            } catch {
              let err = "Error: [Native] Executing command. Saving wallet. \(error.localizedDescription)"
              NSLog(err)
            }
          }
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Sync run process. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(runSyncProcess:reject:)
  func runSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnRunSyncProcess(dict)
        }
      }
  }

  func fnPauseSyncProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = pauseSync()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Sync pause process. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(pauseSyncProcess:reject:)
  func pauseSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnPauseSyncProcess(dict)
        }
      }
  }

  func fnStopSyncProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = stopSync()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Sync stop process. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(stopSyncProcess:reject:)
  func stopSyncProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnStopSyncProcess(dict)
        }
      }
  }

  func fnStatusSyncInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = statusSync()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Sync poll info. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(statusSyncInfo:reject:)
  func statusSyncInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnStatusSyncInfo(dict)
        }
      }
  }

  func fnRunRescanProcess(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = runRescan()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] Rescan run process. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(runRescanProcess:reject:)
  func runRescanProcess(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnRunRescanProcess(dict)
        }
      }
  }

  func fnInfoServerInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = infoServer()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] info server. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(infoServerInfo:reject:)
  func infoServerInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnInfoServerInfo(dict)
        }
      }
  }

  func fnGetSeedInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getSeed()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] seed. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getSeedInfo:reject:)
  func getSeedInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetSeedInfo(dict)
        }
      }
  }

  func fnGetUfvkInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getUfvk()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] ufvk. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getUfvkInfo:reject:)
  func getUfvkInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetUfvkInfo(dict)
        }
      }
  }

  func fnChangeServerProcess(_ dict: [AnyHashable: Any]) {
      if let server = dict["server"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = changeServer(serveruri: server)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] change server. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(changeServerProcess:resolve:reject:)
  func changeServerProcess(_ server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnChangeServerProcess(dict)
        }
      }
  }

  func fnWalletKindInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = walletKind()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] wallet kind. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(walletKindInfo:reject:)
  func walletKindInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnWalletKindInfo(dict)
        }
      }
  }

  func fnParseAddressInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = parseAddress(address: address)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] parse address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(parseAddressInfo:resolve:reject:)
  func parseAddressInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnParseAddressInfo(dict)
        }
      }
  }

  func fnParseUfvkInfo(_ dict: [AnyHashable: Any]) {
      if let ufvk = dict["ufvk"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = parseUfvk(ufvk: ufvk)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] parse ufvk. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(parseUfvkInfo:resolve:reject:)
  func parseUfvkInfo(_ ufvk: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["ufvk": ufvk, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnParseUfvkInfo(dict)
        }
      }
  }

  func fnGetVersionInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getVersion()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] version. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getVersionInfo:reject:)
  func getVersionInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetVersionInfo(dict)
        }
      }
  }

  func fnGetMessagesInfo(_ dict: [AnyHashable: Any]) {
      if let address = dict["address"] as? String,
          let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getMessages(address: address)
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] messages. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getMessagesInfo:resolve:reject:)
  func getMessagesInfo(_ address: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["address": address, "resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetMessagesInfo(dict)
        }
      }
  }

func fnGetBalanceInfo(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getBalance()
          let respStr = String(resp)
          DispatchQueue.main.async {
            resolve(respStr)
          }
      } else {
          let err = "Error: [Native] balance. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
            DispatchQueue.main.async {
              resolve(err)
            }
          }
      }
  }

  @objc(getBalanceInfo:reject:)
  func getBalanceInfo(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        if let self = self {
          self.fnGetBalanceInfo(dict)
        }
      }
  }

}
