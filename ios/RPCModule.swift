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
  
  func readFile(_ fileName: String) throws -> Data {
    return try Data(contentsOf: URL(fileURLWithPath: getFileName(fileName)))
  }
  
  func writeFile(_ fileName: String, fileData: Data) throws {
    try fileData.write(to: URL(fileURLWithPath: getFileName(fileName)), options: .atomic)
  }
  
  func deleteFile(_ fileName: String) throws {
    try FileManager.default.removeItem(atPath: getFileName(fileName))
  }
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      resolve(try fileExists(Constants.WalletFileName.rawValue))
    } catch {
      NSLog("wallet exists error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      resolve(try fileExists(Constants.WalletBackupFileName.rawValue))
    } catch {
      NSLog("wallet backup exists error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  func saveWalletFile(_ base64DecodedData: Data) throws {
    NSLog("save wallet file name \(fileName)")
    do {
      try writeFile(Constants.WalletFileName.rawValue, fileData: base64DecodedData)
    } catch {
      throw FileError.writeFileError("Error writting wallet file error: \(error.localizedDescription)")
    }
  }
  
  func saveWalletBackupFile(_ base64DecodedData: Data) throws {
    do {
      try writeFile(Constants.WalletBackupFileName.rawValue, fileData: base64DecodedData)
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

  func readWallet() throws -> Data {
    do {
      return try readFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error reading wallet format error: \(error.localizedDescription)")
    }
  }

  func readWalletBackup() throws -> Data {
    do {
      return try readFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.readWalletError("Error reading wallet backup format error: \(error.localizedDescription)")
    }
  }

  func deleteExistingWallet() throws {
    do {
      try deleteFile(Constants.WalletFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.deleteExistingWallet()
      resolve("true")
    } catch {
      NSLog("\(error.localizedDescription)")
      resolve("false")
    }
  }
  
  func deleteExistingWalletBackup() throws {
    do {
      try deleteFile(Constants.WalletBackupFileName.rawValue)
    } catch {
      throw FileError.deleteFileError("Error deleting wallet backup error: \(error.localizedDescription)")
    }
  }

  @objc(deleteExistingWalletBackup:reject:)
  func deleteExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.deleteExistingWalletBackup()
      resolve("true")
    } catch {
      NSLog("\(error.localizedDescription)")
      resolve("false")
    }
  }

  func saveWalletInternal() throws {
    let walletEncodedString = saveToB64()
    if !walletEncodedString.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      let walletDecodedData = Data(base64Encoded: walletEncodedString)!
      try self.saveWalletFile(walletDecodedData)
    } else {
      throw FileError.saveFileError("Error saving wallet error: \(walletEncodedString)")
    }
  }

  func saveWalletBackupInternal() throws {
    let walletData = try readWallet()
    try self.saveWalletBackupFile(walletData)
  }

  func createNewWallet(server: String, chainhint: String) throws -> String {
    let seed = initNew(serveruri: server, datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(createNewWallet:chainhint:resolve:reject:)
  func createNewWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.createNewWallet(server: server, chainhint: chainhint)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Creating a new wallet. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }
  
  func restoreWalletFromSeed(server: String, chainhint: String, restoreSeed: String, birthday: String) throws -> String {
    let seed = initFromSeed(serveruri: server, seed: restoreSeed, birthday: UInt64(birthday) ?? 0, datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    if !seedStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return seedStr
  }

  @objc(restoreWalletFromSeed:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromSeed(_ restoreSeed: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.restoreWalletFromSeed(server: server, chainhint: chainhint, restoreSeed: restoreSeed, birthday: birthday)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Restoring a wallet with seed. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }
  
  func restoreWalletFromUfvk(server: String, chainhint: String, restoreUfvk: String, birthday: String) throws -> String {
    let ufvk = initFromUfvk(serveruri: server, ufvk: restoreUfvk, birthday: UInt64(birthday) ?? 0, datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let ufvkStr = String(ufvk)
    if !ufvkStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
      try self.saveWalletInternal()
    }
    return ufvkStr
  }

  @objc(restoreWalletFromUfvk:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromUfvk(_ restoreUfvk: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let ufvkStr = try self.restoreWalletFromUfvk(server: server, chainhint: chainhint, restoreUfvk: restoreUfvk, birthday: birthday)
      resolve(ufvkStr)
    } catch {
      let err = "Error: [Native] Restoring a wallet with ufvk. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }

  func loadExistingWallet(server: String, chainhint: String) throws -> String {
    let walletDecoded = try self.readWallet()
    let walletEncoded = walletDecoded.base64EncodedString()
    let seed = initFromB64(serveruri: server, datab64: walletEncoded, datadir: try getDocumentsDirectory(), chainhint: chainhint, monitorMempool: true)
    let seedStr = String(seed)
    return seedStr
  }

  @objc(loadExistingWallet:chainhint:resolve:reject:)
  func loadExistingWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let seedStr = try self.loadExistingWallet(server: server, chainhint: chainhint)
      resolve(seedStr)
    } catch {
      let err = "Error: [Native] Loading existing wallet. \(error.localizedDescription)"
      NSLog(err)
      resolve(err)
    }
  }

  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      let backupData = try self.readWalletBackup()
      let walletData = try self.readWallet()
      try self.saveWalletFile(backupData)
      try self.saveWalletBackupFile(walletData)
      resolve("true")
    } catch {
      NSLog("Restoring existing wallet backup error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.saveWalletInternal()
      resolve("true")
    } catch {
      NSLog("Saving wallet error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  @objc(doSaveBackup:reject:)
  func doSaveBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    do {
      try self.saveWalletBackupInternal()
      resolve("true")
    } catch {
      NSLog("Saving wallet backup error: \(error.localizedDescription)")
      resolve("false")
    }
  }

  func doExecuteOnThread(_ dict: [String: Any]) {
    if let method = dict["method"] as? String,
       let args = dict["args"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = executeCommand(cmd: method, args: args)
      let respStr = String(resp)
      if method == "sync" && !respStr.lowercased().hasPrefix(Constants.ErrorPrefix.rawValue) {
        // Also save the wallet after sync
        do {
          try self.saveWalletInternal()
        } catch {
          let err = "Error: [Native] Executing command. \(error.localizedDescription)"
          NSLog(err)
          resolve(err)
        }
      }
      resolve(respStr)
    } else {
      let err = "Error: [Native] Executing command. Command argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
        resolve(err)
      }
    }
  }

  @objc(execute:args:resolve:reject:)
  func execute(_ method: String, args: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["method": method, "args": args, "resolve": resolve]
      DispatchQueue.global().async { [weak self] in
          if let self = self {
              self.doExecuteOnThread(dict)
          }
      }
  }

  func getLatestBlockAsync(_ dict: [AnyHashable: Any]) {
    if let server = dict["server"] as? String,
       let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
      let resp = getLatestBlockServer(serveruri: server)
      let respStr = String(resp)
      resolve(respStr)
    } else {
      let err = "Error: [Native] Getting server latest block. Argument problem."
      NSLog(err)
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          resolve(err)
      }
    }
  }
  
  @objc(getLatestBlock:resolve:reject:)
  func getLatestBlock(_ server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
      self.getLatestBlockAsync(dict)
  }

  func getDonationAddressAsync(_ dict: [AnyHashable: Any]) {
      if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getDeveloperDonationAddress()
          let respStr = String(resp)
          resolve(respStr)
      } else {
          let err = "Error: [Native] Getting developer donation address. Command arguments problem."
          NSLog(err)
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve(err)
          }
      }
  }

  @objc(getDonationAddress:reject:)
  func getDonationAddress(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["resolve": resolve]
      self.getDonationAddressAsync(dict)
  }
  
  @objc(updatingNewVersion:resolve:reject:)
  func updatingNewVersion(_ newVersion: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    let newVersionArray = newVersion.split(separator: ".")
    let firstNumberArray = newVersionArray[0].split(separator: "-")
    let firstNumber = firstNumberArray[1]
    let secondNumber = newVersionArray[1]
    let thirdNumberArray = newVersionArray[2].split(separator: " ")
    let thirdNumber = thirdNumberArray[0]
    NSLog("New version: \(firstNumber).\(secondNumber).\(thirdNumber)")
    // zingo-1.3.10 (XXX)
    if Int(firstNumber) ?? 0 > 1 || 
      (Int(firstNumber) ?? 0 == 1 && Int(secondNumber) ?? 0 > 3) || 
      (Int(firstNumber) ?? 0 == 1 && Int(secondNumber) ?? 0 == 3 && Int(thirdNumber) ?? 0 >= 10) {
      // in the installation/update to 1.3.10 the wallet file name change
      NSLog("Updating version: \(newVersion)")
      do {
        if try fileExists(Constants.OldWalletFileName.rawValue) == "true" && fileExists(Constants.WalletFileName.rawValue) == "false" {
          // copy the wallet file content to the new file name.
          let contentEncodedUftString = try String(contentsOfFile: getFileName(Constants.OldWalletFileName.rawValue), encoding: .utf8)
          let contentDecodedData = Data(base64Encoded: contentEncodedUftString)!
          // new file
          do {
            try writeFile(Constants.WalletFileName.rawValue, fileData: contentDecodedData)
            NSLog("New wallet file created")
          } catch {
            NSLog("Couldn't copy the old wallet file to the new file")
            resolve("false")
          }
          // backup of old wallet
          do {
            try contentEncodedUftString.write(toFile: getFileName(Constants.OldWalletDeletedFileName.rawValue), atomically: true, encoding: .utf8)
            NSLog("New wallet file backup created")
          } catch {
            NSLog("Couldn't copy the old wallet file to the new backup file")
            resolve("false")
          }
          //old wallet
          do {
            try deleteFile(Constants.OldWalletFileName.rawValue)
            NSLog("Old wallet deleted")
          } catch {
            NSLog("Couldn't delete the old wallet file")
            resolve("false")
          }
        }
        if try fileExists(Constants.OldWalletBackupFileName.rawValue) == "true" && fileExists(Constants.WalletBackupFileName.rawValue) == "false" {
          // copy the wallet backup file content to the new file name.
          let contentEncodedUftString = try String(contentsOfFile: getFileName(Constants.OldWalletBackupFileName.rawValue), encoding: .utf8)
          let contentDecodedData = Data(base64Encoded: contentEncodedUftString)!
          // new file
          do {
            try writeFile(Constants.WalletBackupFileName.rawValue, fileData: contentDecodedData)
            NSLog("New wallet backup file created")
          } catch {
            NSLog("Couldn't copy the old wallet backup file to the new backup file")
            resolve("false")
          }
          // backup of old backup wallet
          do {
            try contentEncodedUftString.write(toFile: getFileName(Constants.OldWalletDeletedBackupFileName.rawValue), atomically: true, encoding: .utf8)
            NSLog("New wallet file backup created")
          } catch {
            NSLog("Couldn't copy the old wallet backup file to the new backup file")
            resolve("false")
          }
          //old wallet
          do {
            try deleteFile(Constants.OldWalletBackupFileName.rawValue)
            NSLog("Old wallet deleted")
          } catch {
            NSLog("Couldn't delete the old wallet file")
            resolve("false")
          }
        }
      } catch {
        NSLog("Error in file exists error: \(error.localizedDescription)")
        resolve("false")
      }
    }
    resolve("true")
  }

}
