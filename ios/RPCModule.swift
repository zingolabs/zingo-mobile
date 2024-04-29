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
  
  @objc(walletExists:reject:)
  func walletExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        let fileExists = FileManager.default.fileExists(atPath: fileName)
        if fileExists {
            resolve("true")
        } else {
            resolve("false")
        }
      } else {
        resolve("false")
      }
  }

  @objc(walletBackupExists:reject:)
  func walletBackupExists(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
        let fileExists = FileManager.default.fileExists(atPath: fileName)
        if fileExists {
            resolve("true")
        } else {
            resolve("false")
        }
      } else {
        resolve("false")
      }
  }

  func saveWalletFile(_ base64EncodedString: String) {
      // need to decode the content first.
      // save the decoded binary data
      if let base64DecodedData = Data(base64Encoded: base64EncodedString) {
        let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        if let documentsDirectory = paths.first {
            let fileName = "\(documentsDirectory)/wallet.dat.txt"
            do {
              //NSLog("decoded data \(base64DecodedData)")
              try base64DecodedData.write(to: URL(fileURLWithPath: fileName))
            } catch {
                NSLog("Error save wallet \(error.localizedDescription)")
            }
        } else {
            NSLog("Error save wallet directory")
        }
      } else {
        NSLog("could not decode b64 content to save wallet.")
      }
  }
  
  func saveWalletBackupFile(_ base64EncodedString: String) {
      // we need to decode the content first.
      // save the decoded binary data
      if let base64DecodedData = Data(base64Encoded: base64EncodedString) {
        let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        if let documentsDirectory = paths.first {
            let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
            do {
              //NSLog("decoded data \(base64DecodedData)")
              try base64DecodedData.write(to: URL(fileURLWithPath: fileName))
            } catch {
              NSLog("Error save backup wallet \(error.localizedDescription)")
            }
        } else {
          NSLog("Error save backup wallet directory")
        }
      } else {
        NSLog("could not decode b64 content to save backup wallet.")
      }
  }

  func saveBackgroundFile(_ data: String) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/background.json"
        do {
            try data.write(toFile: fileName, atomically: true, encoding: .utf8)
        } catch {
            NSLog("Error save background file \(error.localizedDescription)")
        }
      } else {
        NSLog("Error save background file")
      }
  }

  // old way to read the wallet file -> Encoded Utf8 String
  func readWalletUtf8String() -> String? {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        do {
            let content = try String(contentsOfFile: fileName, encoding: .utf8)
            //NSLog("load encoded utf8 string wallet \(content)")
            return content
        } catch {
            NSLog("Error reading wallet \(error.localizedDescription)")
            return nil
        }
      } else {
        NSLog("Error reading wallet")
        return nil
      }
  }

  // new way to read the wallet file -> Decoded Data
  func readWallet() -> Data? {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        do {
            let content = try Data(contentsOf: URL(fileURLWithPath: fileName))
            //NSLog("load decoded data wallet \(content)")
            return content
        } catch {
            NSLog("Error reading wallet \(error.localizedDescription)")
            return nil
        }
      } else {
        NSLog("Error reading wallet")
        return nil
      }
  }

  func readWalletBackup() -> Data? {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
        do {
            let content = try Data(contentsOf: URL(fileURLWithPath: fileName))
            //NSLog("load decoded data backup wallet \(content)")
            return content
        } catch {
            NSLog("Error reading backup wallet \(error.localizedDescription)")
            return nil
        }
      } else {
        NSLog("Error reading backup wallet")
        return nil
      }
  }

  func deleteExistingWallet() -> Bool {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.dat.txt"
        do {
            try FileManager.default.removeItem(atPath: fileName)
            return true
        } catch {
            NSLog("Error deleting wallet \(error.localizedDescription)")
            return false
        }
      } else {
        NSLog("Error deleting wallet")
        return false
      }
  }

  @objc(deleteExistingWallet:reject:)
  func deleteExistingWallet(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      if deleteExistingWallet() {
          resolve("true")
      } else {
          resolve("false")
      }
  }

  @objc(deleteExistingWalletBackup:reject:)
  func deleteExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
        let fileName = "\(documentsDirectory)/wallet.backup.dat.txt"
        do {
            try FileManager.default.removeItem(atPath: fileName)
            resolve("true")
        } catch {
            NSLog("Error deleting backup wallet \(error.localizedDescription)")
            resolve("false")
        }
      } else {
        NSLog("Error deleting backup wallet")
        resolve("false")
      }
  }

  func saveWalletInternal() {
      let walletEncodedString = saveToB64()
      self.saveWalletFile(walletEncodedString)
  }

  func saveWalletBackupInternal() {
      if let walletData = readWallet() {
        self.saveWalletBackupFile(walletData.base64EncodedString())
      } else {
          NSLog("Error: Unable to read wallet for backup")
      }
  }

  func createNewWallet(server: String, chainhint: String) -> String {
        let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        if let documentsDirectory = paths.first {
            let seed = initNew(serveruri: server, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
            let seedStr = String(seed)
            if !seedStr.lowercased().hasPrefix("error") {
                self.saveWalletInternal()
            }
            return seedStr
        } else {
            NSLog("Error creating new wallet")
            return "Error: [Native] Creating a new wallet. Document directory problem."
        }
  }

  @objc(createNewWallet:chainhint:resolve:reject:)
  func createNewWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let seedStr = self.createNewWallet(server: server, chainhint: chainhint)
      resolve(seedStr)
  }

  @objc(restoreWalletFromSeed:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromSeed(_ restoreSeed: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
          let seed = initFromSeed(serveruri: server, seed: restoreSeed, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
          let seedStr = String(seed)
          if !seedStr.lowercased().hasPrefix("error") {
              self.saveWalletInternal()
          }
          resolve(seedStr)
      } else {
          NSLog("Error restoring wallet from seed")
          resolve("Error: [Native] Restoring a wallet with seed. Document directory problem.")
      }
  }

  @objc(restoreWalletFromUfvk:birthday:server:chainhint:resolve:reject:)
  func restoreWalletFromUfvk(_ restoreUfvk: String, birthday: String, server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
          let ufvk = initFromUfvk(serveruri: server, ufvk: restoreUfvk, birthday: UInt64(birthday) ?? 0, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
          let ufvkStr = String(ufvk)
          if !ufvkStr.lowercased().hasPrefix("error") {
              self.saveWalletInternal()
          }
          resolve(ufvkStr)
      } else {
          NSLog("Error restoring wallet from ufvk")
          resolve("Error: [Native] Restoring a wallet with ufvk. Document directory problem.")
      }
  }

  func loadExistingWallet(server: String, chainhint: String) -> String {
      let paths = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
      if let documentsDirectory = paths.first {
            if let walletData = self.readWallet() {
                // first attemp with the new format -> decoded data
                // I need to encode first
                let walletEncodedString = walletData.base64EncodedString()
                var seed = initFromB64(serveruri: server, datab64: walletEncodedString, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
                var seedStr = String(seed)
                if seedStr.lowercased().hasPrefix("error") {
                  NSLog("First attemp: \(seedStr)")
                  // second attemp with the old format -> Utf8 encoded
                  if let walletEncodedUtf8String = self.readWalletUtf8String() {
                    seed = initFromB64(serveruri: server, datab64: walletEncodedUtf8String, datadir: documentsDirectory, chainhint: chainhint, monitorMempool: true)
                    seedStr = String(seed)
                    NSLog("Second attemp: \(seedStr)")
                    return seedStr
                  } else {
                    NSLog("Error loading existing wallet")
                    return "Error: [Native] Loading a wallet. Reading wallet problem."
                  }
                } else {
                  return seedStr
                }
            } else {
                NSLog("Error loading existing wallet")
                return "Error: [Native] Loading a wallet. Reading wallet problem."
            }
      } else {
            NSLog("Error loading existing wallet")
            return "Error: [Native] Loading a wallet. Document directory problem."
      }
  }

  @objc(loadExistingWallet:chainhint:resolve:reject:)
  func loadExistingWallet(_ server: String, chainhint: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let seedStr = self.loadExistingWallet(server: server, chainhint: chainhint)
      resolve(seedStr)
  }

  @objc(restoreExistingWalletBackup:reject:)
  func restoreExistingWalletBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      if let backupData = self.readWalletBackup(),
         let walletData = self.readWallet() {
        self.saveWalletFile(backupData.base64EncodedString())
        self.saveWalletBackupFile(walletData.base64EncodedString())
        resolve("true")
      } else {
        NSLog("Error restoring existing wallet backup")
        resolve("false")
      }
  }

  @objc(doSave:reject:)
  func doSave(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.saveWalletInternal()
      resolve("true")
  }

  @objc(doSaveBackup:reject:)
  func doSaveBackup(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      self.saveWalletBackupInternal()
      resolve("true")
  }

  func doExecuteOnThread(_ dict: [String: Any]) {
      if let method = dict["method"] as? String,
         let args = dict["args"] as? String,
         let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = executeCommand(cmd: method, args: args)
          let respStr = String(resp)
          if method == "sync" && !respStr.lowercased().hasPrefix("error") {
              // Also save the wallet after sync
              self.saveWalletInternal()
          }
          resolve(respStr)
      } else {
          NSLog("Error executing a command")
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve("Error: [Native] Executing command. Command arguments problem.")
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

  @objc(getLatestBlock:resolve:reject:)
  func getLatestBlock(_ server: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
      let dict: [String: Any] = ["server": server, "resolve": resolve]
      self.getLatestBlockAsync(dict)
  }

  func getLatestBlockAsync(_ dict: [AnyHashable: Any]) {
      if let server = dict["server"] as? String,
         let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
          let resp = getLatestBlockServer(serveruri: server)
          let respStr = String(resp)
          resolve(respStr)
      } else {
          NSLog("Error getting latest block server")
          if let resolve = dict["resolve"] as? RCTPromiseResolveBlock {
              resolve("Error: [Native] Getting server latest block. Command arguments problem.")
          }
      }
  }

}
